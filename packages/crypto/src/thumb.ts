// Thumbnail encryption and decryption

import { concatBytes, randomBytes, toBufferSource } from './utils';

const THUMB_AAD_PREFIX = new TextEncoder().encode('tv1/thumb');

export function buildThumbAAD(itemIdBytes: Uint8Array): Uint8Array {
  if (itemIdBytes.length !== 16) {
    throw new Error(`itemId must be exactly 16 bytes, got ${itemIdBytes.length}`);
  }
  return concatBytes(THUMB_AAD_PREFIX, itemIdBytes);
}

/**
 * Encrypts thumbnail image bytes (WebP or JPEG) with the thumb subkey.
 * Returns IV(12 bytes) || Ciphertext || Tag(16 bytes).
 */
export async function encryptThumbnail(
  thumbKey: CryptoKey,
  itemIdBytes: Uint8Array,
  thumbBytes: Uint8Array
): Promise<Uint8Array> {
  const iv = randomBytes(12);
  const aad = buildThumbAAD(itemIdBytes);

  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBufferSource(iv), additionalData: toBufferSource(aad) },
    thumbKey,
    toBufferSource(thumbBytes)
  );

  return concatBytes(iv, new Uint8Array(ciphertextBuf));
}

/**
 * Decrypts thumbnail ciphertext blob with the thumb subkey.
 */
export async function decryptThumbnail(
  thumbKey: CryptoKey,
  itemIdBytes: Uint8Array,
  blob: Uint8Array
): Promise<Uint8Array> {
  if (blob.length < 28) {
    throw new Error(`Thumbnail blob too short: ${blob.length} bytes`);
  }

  const iv = blob.subarray(0, 12);
  const ciphertextWithTag = blob.subarray(12);
  const aad = buildThumbAAD(itemIdBytes);

  try {
    const plaintextBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toBufferSource(iv), additionalData: toBufferSource(aad) },
      thumbKey,
      toBufferSource(ciphertextWithTag)
    );
    return new Uint8Array(plaintextBuf);
  } catch (err) {
    throw new Error('Failed to decrypt thumbnail: corrupted data or AAD mismatch');
  }
}
