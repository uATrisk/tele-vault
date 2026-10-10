// Web Worker for off-thread WebCrypto hashing and encryption

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;

  try {
    if (type === 'hash') {
      const { buffer } = payload;
      const hashBuffer = await self.crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      self.postMessage({ id, success: true, result: hashHex });
    } else if (type === 'encryptChunk') {
      const { rawKey, iv, plaintextBuffer, aadBuffer } = payload;
      const cryptoKey = await self.crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      const ciphertext = await self.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
          additionalData: aadBuffer,
          tagLength: 128
        },
        cryptoKey,
        plaintextBuffer
      );
      // Transfer ciphertext buffer back without copying
      (self as any).postMessage({ id, success: true, result: ciphertext }, [ciphertext]);
    } else {
      self.postMessage({ id, success: false, error: 'Unknown worker operation' });
    }
  } catch (err: any) {
    self.postMessage({ id, success: false, error: err.message || 'Worker error' });
  }
};
