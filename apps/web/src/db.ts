// IndexedDB Storage for remembered session key, thumbnail cache, and upload resume state

const DB_NAME = 'televault_client_db';
const DB_VERSION = 1;

export interface UploadJobRecord {
  id: string; // uploadId
  itemId: string;
  fileIdHex: string;
  name: string;
  size: number;
  mime: string;
  sha256: string;
  chunkSize: number;
  totalChunks: number;
  confirmedChunks: Array<{ idx: number; messageId: number; fileId: string; size: number }>;
  status: 'queued' | 'uploading' | 'paused' | 'error' | 'done';
  error?: string;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('thumbCache')) {
        db.createObjectStore('thumbCache', { keyPath: 'itemId' });
      }
      if (!db.objectStoreNames.contains('uploadJobs')) {
        db.createObjectStore('uploadJobs', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const idb = {
  async saveRememberedKey(masterKey: CryptoKey, expiryDays = 7): Promise<void> {
    const db = await openDB();
    const expiry = Date.now() + expiryDays * 24 * 60 * 60 * 1000;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('session', 'readwrite');
      tx.objectStore('session').put({ key: 'masterKey', cryptoKey: masterKey, expiry });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getRememberedKey(): Promise<CryptoKey | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('session', 'readwrite');
      const store = tx.objectStore('session');
      const req = store.get('masterKey');
      req.onsuccess = () => {
        const data = req.result;
        if (!data) return resolve(null);
        if (Date.now() > data.expiry) {
          store.delete('masterKey');
          return resolve(null);
        }
        resolve(data.cryptoKey);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async clearRememberedKey(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('session', 'readwrite');
      tx.objectStore('session').delete('masterKey');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getCachedThumb(itemId: string): Promise<Uint8Array | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('thumbCache', 'readonly');
      const req = tx.objectStore('thumbCache').get(itemId);
      req.onsuccess = () => resolve(req.result ? req.result.bytes : null);
      req.onerror = () => reject(req.error);
    });
  },

  async setCachedThumb(itemId: string, bytes: Uint8Array): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('thumbCache', 'readwrite');
      tx.objectStore('thumbCache').put({ itemId, bytes });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async clearThumbCache(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('thumbCache', 'readwrite');
      tx.objectStore('thumbCache').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async saveUploadJob(job: UploadJobRecord): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('uploadJobs', 'readwrite');
      tx.objectStore('uploadJobs').put(job);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getUploadJobs(): Promise<UploadJobRecord[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('uploadJobs', 'readonly');
      const req = tx.objectStore('uploadJobs').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteUploadJob(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('uploadJobs', 'readwrite');
      tx.objectStore('uploadJobs').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
};
