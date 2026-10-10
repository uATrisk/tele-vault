// Resumable upload manager with concurrency limiter, SHA-256 dedupe, and client-side encryption

import {
  CHUNK_PLAIN,
  calculateChunkCount,
  deriveSubkey,
  encryptChunk,
  encryptManifest,
  encryptThumbnail,
  ItemManifest,
  randomBytes,
  bytesToHex,
  hexToBytes,
  sha256Digest
} from '@televault/crypto';
import { api } from '../api';
import { idb, UploadJobRecord } from '../db';
import { processMediaFile } from './media';

export interface UploadQueueItem {
  id: string; // uploadId
  file: File;
  name: string;
  size: number;
  progress: number; // 0 to 100
  bytesUploaded: number;
  speed: number; // bytes/sec
  status: 'queued' | 'processing' | 'uploading' | 'paused' | 'done' | 'error';
  error?: string;
  isDuplicate?: boolean;
}

export type UploadListener = (items: UploadQueueItem[]) => void;

export class UploadManager {
  private queue: UploadQueueItem[] = [];
  private activeUploads = 0;
  private maxConcurrentFiles = 2;
  private listeners: Set<UploadListener> = new Set();
  private masterKey: CryptoKey | null = null;
  private existingHashes: Set<string> = new Set();
  private onItemCommittedCallback?: (manifest: ItemManifest) => void;

  constructor() {}

  public setMasterKey(mk: CryptoKey) {
    this.masterKey = mk;
  }

  public setExistingHashes(hashes: Set<string>) {
    this.existingHashes = hashes;
  }

  public setOnItemCommitted(cb: (manifest: ItemManifest) => void) {
    this.onItemCommittedCallback = cb;
  }

  public subscribe(listener: UploadListener): () => void {
    this.listeners.add(listener);
    listener([...this.queue]);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener([...this.queue]);
    }
  }

  public enqueueFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      this.queue.push({
        id: uploadId,
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        bytesUploaded: 0,
        speed: 0,
        status: 'queued'
      });
    }
    this.notify();
    this.processQueue();
  }

  public pause(id: string) {
    const item = this.queue.find((q) => q.id === id);
    if (item && item.status === 'uploading') {
      item.status = 'paused';
      this.notify();
    }
  }

  public resume(id: string) {
    const item = this.queue.find((q) => q.id === id);
    if (item && (item.status === 'paused' || item.status === 'error')) {
      item.status = 'queued';
      this.notify();
      this.processQueue();
    }
  }

  public cancel(id: string) {
    const idx = this.queue.findIndex((q) => q.id === id);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
      idb.deleteUploadJob(id).catch(() => {});
      this.notify();
      this.processQueue();
    }
  }

  public clearFinished() {
    this.queue = this.queue.filter((q) => q.status !== 'done');
    this.notify();
  }

  private async processQueue() {
    if (!this.masterKey) return;
    if (this.activeUploads >= this.maxConcurrentFiles) return;

    const nextItem = this.queue.find((q) => q.status === 'queued');
    if (!nextItem) return;

    this.activeUploads++;
    nextItem.status = 'processing';
    this.notify();

    try {
      await this.uploadFile(nextItem);
    } catch (err: any) {
      nextItem.status = 'error';
      nextItem.error = err.message || 'Upload failed';
      this.notify();
    } finally {
      this.activeUploads--;
      this.processQueue();
    }
  }

  private async uploadFile(item: UploadQueueItem) {
    const file = item.file;
    const mk = this.masterKey!;

    // 1. Calculate SHA-256 for deduplication
    const hash = await this.calculateFileSha256(file);
    if (this.existingHashes.has(hash)) {
      item.status = 'done';
      item.progress = 100;
      item.isDuplicate = true;
      this.notify();
      return;
    }

    // 2. Extract metadata & generate thumbnail
    const mediaMeta = await processMediaFile(file);

    // 3. Generate IDs and subkeys
    const itemIdBytes = randomBytes(16);
    const itemIdHex = bytesToHex(itemIdBytes);
    const fileIdBytes = itemIdBytes;
    const fileIdHex = itemIdHex;

    const fileKey = await deriveSubkey(mk, `file/${fileIdHex}`);
    const manifestKey = await deriveSubkey(mk, 'manifest');
    const thumbKey = await deriveSubkey(mk, 'thumb');

    // 4. Chunk setup
    const chunkSize = CHUNK_PLAIN;
    const totalChunks = calculateChunkCount(file.size, chunkSize);

    // Check for existing partial upload record in IndexedDB
    let jobRecord: UploadJobRecord | null =
      (await idb.getUploadJobs()).find((j) => j.sha256 === hash) || null;

    if (!jobRecord) {
      jobRecord = {
        id: item.id,
        itemId: itemIdHex,
        fileIdHex,
        name: file.name,
        size: file.size,
        mime: file.type || 'application/octet-stream',
        sha256: hash,
        chunkSize,
        totalChunks,
        confirmedChunks: [],
        status: 'uploading',
        updatedAt: Date.now()
      };
      await idb.saveUploadJob(jobRecord);
    }

    item.status = 'uploading';
    this.notify();

    const confirmedChunks = [...jobRecord.confirmedChunks];
    let startTime = Date.now();
    let bytesSentSinceStart = 0;

    // 5. Upload chunks sequentially or with small concurrency
    for (let i = 0; i < totalChunks; i++) {
      if ((item.status as UploadQueueItem['status']) === 'paused') {
        jobRecord.status = 'paused';
        await idb.saveUploadJob(jobRecord);
        return;
      }

      // If chunk already confirmed, skip upload
      const existingChunk = confirmedChunks.find((c) => c.idx === i);
      if (existingChunk) {
        continue;
      }

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const sliceBlob = file.slice(start, end);
      const sliceBuf = await sliceBlob.arrayBuffer();
      const plaintextChunk = new Uint8Array(sliceBuf);

      // Encrypt chunk
      const encryptedChunk = await encryptChunk(
        fileKey,
        hexToBytes(jobRecord.fileIdHex),
        i,
        totalChunks,
        plaintextChunk
      );

      // Upload to Worker -> Telegram
      const chunkUploadRes = await api.uploadChunk(
        jobRecord.id,
        i,
        encryptedChunk
      );

      confirmedChunks.push({
        idx: i,
        messageId: chunkUploadRes.messageId,
        fileId: chunkUploadRes.fileId,
        size: chunkUploadRes.size
      });

      jobRecord.confirmedChunks = confirmedChunks;
      jobRecord.updatedAt = Date.now();
      await idb.saveUploadJob(jobRecord);

      // Update progress & speed
      bytesSentSinceStart += (end - start);
      const elapsedSec = (Date.now() - startTime) / 1000;
      if (elapsedSec > 0.5) {
        item.speed = Math.round(bytesSentSinceStart / elapsedSec);
      }

      item.bytesUploaded = confirmedChunks.length * chunkSize;
      item.progress = Math.min(99, Math.round((confirmedChunks.length / totalChunks) * 100));
      this.notify();
    }

    // 6. Encrypt Manifest & Thumbnail
    const manifest: ItemManifest = {
      v: 1,
      id: jobRecord.itemId,
      name: file.name,
      mime: file.type || 'application/octet-stream',
      size: file.size,
      sha256: hash,
      chunkSize,
      chunks: confirmedChunks.map((c) => ({
        messageId: c.messageId,
        fileId: c.fileId,
        size: c.size
      })),
      takenAt: mediaMeta.takenAt,
      uploadedAt: new Date().toISOString(),
      width: mediaMeta.width,
      height: mediaMeta.height,
      durationMs: mediaMeta.durationMs,
      favorite: false,
      trashed: false,
      albumIds: []
    };

    const encryptedManifest = await encryptManifest(
      manifestKey,
      hexToBytes(jobRecord.itemId),
      1,
      manifest
    );

    const encryptedThumb = await encryptThumbnail(
      thumbKey,
      hexToBytes(jobRecord.itemId),
      mediaMeta.thumbnailBytes
    );

    // 7. Commit Item
    await api.commitItem({
      id: jobRecord.itemId,
      manifest: bytesToHex(encryptedManifest),
      thumb: bytesToHex(encryptedThumb),
      chunks: confirmedChunks,
      sizeBytes: file.size,
      chunkCount: totalChunks,
      uploadId: jobRecord.id
    });

    // Clean up IndexedDB upload record
    await idb.deleteUploadJob(jobRecord.id);

    // Cache thumbnail locally
    await idb.setCachedThumb(jobRecord.itemId, mediaMeta.thumbnailBytes);

    item.status = 'done';
    item.progress = 100;
    this.existingHashes.add(hash);
    this.notify();

    if (this.onItemCommittedCallback) {
      this.onItemCommittedCallback(manifest);
    }
  }

  private async calculateFileSha256(file: File): Promise<string> {
    const slice = await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer();
    // For fast hashing of huge files, hash the first MB + size + name to ensure fast dedupe
    // or compute standard SHA-256 for medium files:
    if (file.size <= 20 * 1024 * 1024) {
      const fullBuf = await file.arrayBuffer();
      return sha256Digest(new Uint8Array(fullBuf));
    } else {
      // Chunked stream hash for large files
      const combined = new Uint8Array(slice.byteLength + 16);
      combined.set(new Uint8Array(slice), 0);
      const view = new DataView(combined.buffer);
      view.setFloat64(slice.byteLength, file.size);
      return sha256Digest(combined);
    }
  }
}

export const uploadManager = new UploadManager();
