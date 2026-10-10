import { downloadZip } from 'client-zip';
import { ItemManifest, deriveSubkey, decryptChunk, hexToBytes } from '@televault/crypto';
import { api } from '../api';
import { getBreadcrumbs, getDescendantIds } from './folderTree';

export interface ZipExportProgress {
  current: number;
  total: number;
  currentName: string;
  stage: 'downloading' | 'compressing' | 'done';
}

/**
 * Downloads and exports a set of items (files and folders) as a structured ZIP archive.
 * Folder subtrees are preserved hierarchically.
 */
export async function exportItemsAsZip({
  targets,
  allItems,
  masterKey,
  onProgress
}: {
  targets: ItemManifest[];
  allItems: ItemManifest[];
  masterKey: CryptoKey;
  onProgress?: (progress: ZipExportProgress) => void;
}): Promise<Blob> {
  // 1. Gather all files to include, computing relative paths
  const filesToExport: Array<{ item: ItemManifest; relativePath: string }> = [];

  for (const target of targets) {
    if (target.kind === 'folder') {
      const descendantIds = getDescendantIds(allItems, target.id);
      const descendantFiles = allItems.filter(
        (i) => descendantIds.has(i.id) && i.kind !== 'folder' && !i.trashed
      );

      for (const file of descendantFiles) {
        // Path from target folder down to this file
        const trail = getBreadcrumbs(allItems, file.parentId ?? null);
        const targetIndex = trail.findIndex((c) => c.id === target.id);
        const subPath =
          targetIndex !== -1
            ? trail.slice(targetIndex).map((c) => c.name).join('/')
            : target.name;
        filesToExport.push({
          item: file,
          relativePath: `${subPath}/${file.name}`
        });
      }
    } else {
      filesToExport.push({
        item: target,
        relativePath: target.name
      });
    }
  }

  const zipFiles: Array<{ name: string; input: Uint8Array; lastModified: Date }> = [];
  const total = filesToExport.length;

  // 2. Download and decrypt each file
  for (let i = 0; i < total; i++) {
    const { item, relativePath } = filesToExport[i];
    onProgress?.({
      current: i + 1,
      total,
      currentName: item.name,
      stage: 'downloading'
    });

    const fileKey = await deriveSubkey(masterKey, `file/${item.id}`);
    const fileIdBytes = hexToBytes(item.id);
    const totalChunks = item.chunks.length;
    const decryptedChunks: Uint8Array[] = [];
    let totalBytes = 0;

    for (let idx = 0; idx < totalChunks; idx++) {
      const c = item.chunks[idx];
      const cipherBytes = await api.downloadChunk(c.fileId);
      const plainBytes = await decryptChunk(fileKey, fileIdBytes, idx, totalChunks, cipherBytes);
      decryptedChunks.push(plainBytes);
      totalBytes += plainBytes.byteLength;
    }

    const fullBuffer = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of decryptedChunks) {
      fullBuffer.set(chunk, offset);
      offset += chunk.byteLength;
    }

    zipFiles.push({
      name: relativePath,
      input: fullBuffer,
      lastModified: new Date(item.takenAt || item.uploadedAt)
    });
  }

  onProgress?.({
    current: total,
    total,
    currentName: 'Creating ZIP archive...',
    stage: 'compressing'
  });

  const zipResponse = downloadZip(zipFiles);
  const zipBlob = await zipResponse.blob();

  onProgress?.({
    current: total,
    total,
    currentName: 'Complete',
    stage: 'done'
  });

  return zipBlob;
}
