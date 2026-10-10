let workerInstance: Worker | null = null;
let messageId = 0;
const pendingCallbacks = new Map<
  number,
  { resolve: (val: any) => void; reject: (err: any) => void }
>();

function getWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }
  if (!workerInstance) {
    try {
      workerInstance = new Worker(
        new URL('./crypto.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerInstance.onmessage = (e: MessageEvent) => {
        const { id, success, result, error } = e.data;
        const cb = pendingCallbacks.get(id);
        if (cb) {
          pendingCallbacks.delete(id);
          if (success) cb.resolve(result);
          else cb.reject(new Error(error));
        }
      };
      workerInstance.onerror = (err) => {
        console.warn('Crypto worker error:', err);
      };
    } catch {
      workerInstance = null;
    }
  }
  return workerInstance;
}

/**
 * Off-thread SHA-256 hash calculation, with main-thread fallback
 */
export async function workerSha256(buffer: ArrayBuffer): Promise<string> {
  const worker = getWorker();
  if (worker) {
    return new Promise((resolve, reject) => {
      const id = ++messageId;
      pendingCallbacks.set(id, { resolve, reject });
      worker.postMessage({ id, type: 'hash', payload: { buffer } }, [buffer]);
    });
  }

  // Fallback to SubtleCrypto directly on main thread
  const hashBuf = await crypto.subtle.digest('SHA-256', buffer);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
}
