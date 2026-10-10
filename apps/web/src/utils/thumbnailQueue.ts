import { decryptThumbnail, hexToBytes } from '@televault/crypto';
import { thumbHashToDataURL } from 'thumbhash';

type ThumbnailListener = (url: string) => void;

type ThumbnailFetcher = () => Promise<Uint8Array | null>;

interface QueueItem {
  id: string;
  bytesOrFetcher: Uint8Array | ThumbnailFetcher;
  thumbKey: CryptoKey;
  priority: number;
}

class ThumbnailQueue {
  private cache = new Map<string, string>(); // id -> objectURL
  private blurCache = new Map<string, string>(); // id -> dataURL (ThumbHash)
  private cacheKeys: string[] = []; // LRU tracking
  private maxCacheSize = 300;

  private queue: QueueItem[] = [];
  private activeCount = 0;
  private maxConcurrent = 4;
  private inProgress = new Set<string>();
  private listeners = new Map<string, Set<ThumbnailListener>>();

  /**
   * Get instant blur placeholder from ThumbHash if available (synchronous)
   */
  public getBlurPlaceholder(id: string, thumbHash?: string | null): string | null {
    if (this.blurCache.has(id)) {
      return this.blurCache.get(id)!;
    }
    if (!thumbHash) return null;

    try {
      const binary = atob(thumbHash);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const dataUrl = thumbHashToDataURL(bytes);
      this.blurCache.set(id, dataUrl);
      return dataUrl;
    } catch {
      return null;
    }
  }

  /**
   * Request full thumbnail decryption. Returns unsubscribe function.
   * If already cached, listener is called immediately.
   */
  public request(
    id: string,
    bytesOrFetcher: Uint8Array | ThumbnailFetcher,
    thumbKey: CryptoKey,
    onReady: ThumbnailListener,
    priority = 0
  ): () => void {
    if (this.cache.has(id)) {
      onReady(this.cache.get(id)!);
      return () => {};
    }

    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set());
    }
    this.listeners.get(id)!.add(onReady);

    if (this.inProgress.has(id)) {
      return () => this.cancel(id, onReady);
    }

    const existingIndex = this.queue.findIndex((q) => q.id === id);
    if (existingIndex !== -1) {
      this.queue[existingIndex].priority = priority;
      this.queue.sort((a, b) => b.priority - a.priority);
      return () => this.cancel(id, onReady);
    }

    this.queue.push({ id, bytesOrFetcher, thumbKey, priority });
    this.queue.sort((a, b) => b.priority - a.priority);
    this.processNext();
    return () => this.cancel(id, onReady);
  }

  /**
   * Cancel pending request if not yet started
   */
  public cancel(id: string, listener?: ThumbnailListener) {
    if (listener && this.listeners.has(id)) {
      this.listeners.get(id)!.delete(listener);
      if (this.listeners.get(id)!.size === 0) {
        this.listeners.delete(id);
      }
    }

    // If no more listeners, remove from queue
    if (!this.listeners.has(id)) {
      this.queue = this.queue.filter((q) => q.id !== id);
    }
  }

  private async processNext() {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeCount++;
    this.inProgress.add(item.id);

    try {
      let cipherBytes: Uint8Array | null = null;
      if (typeof item.bytesOrFetcher === 'function') {
        cipherBytes = await item.bytesOrFetcher();
      } else {
        cipherBytes = item.bytesOrFetcher;
      }

      if (!cipherBytes) {
        this.listeners.delete(item.id);
        return;
      }

      const decrypted = await decryptThumbnail(item.thumbKey, hexToBytes(item.id), cipherBytes);
      const blob = new Blob([new Uint8Array(decrypted)], { type: 'image/webp' });
      const url = URL.createObjectURL(blob);

      this.setCache(item.id, url);

      const itemListeners = this.listeners.get(item.id);
      if (itemListeners) {
        itemListeners.forEach((fn) => fn(url));
        this.listeners.delete(item.id);
      }
    } catch {
      // Failed decryption (e.g. corrupt thumb)
      this.listeners.delete(item.id);
    } finally {
      this.inProgress.delete(item.id);
      this.activeCount--;
      this.processNext();
    }
  }

  private setCache(id: string, url: string) {
    if (this.cache.has(id)) return;

    if (this.cacheKeys.length >= this.maxCacheSize) {
      const oldestId = this.cacheKeys.shift();
      if (oldestId && this.cache.has(oldestId)) {
        const oldUrl = this.cache.get(oldestId)!;
        URL.revokeObjectURL(oldUrl);
        this.cache.delete(oldestId);
        this.blurCache.delete(oldestId);
      }
    }

    this.cacheKeys.push(id);
    this.cache.set(id, url);
  }

  /**
   * Clear all cached object URLs on vault lock/logout
   */
  public clear() {
    for (const url of this.cache.values()) {
      URL.revokeObjectURL(url);
    }
    this.cache.clear();
    this.blurCache.clear();
    this.cacheKeys = [];
    this.queue = [];
    this.inProgress.clear();
    this.listeners.clear();
  }
}

export const thumbnailQueue = new ThumbnailQueue();
