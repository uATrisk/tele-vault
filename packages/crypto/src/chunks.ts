// Chunk encryption and decryption with authenticated chunk-binding AAD

import { u32be, concatBytes, randomBytes, toBufferSource } from './utils';

export const CHUNK_PLAIN = 16 * 1024 * 1024; // 16 MiB (16,777,216 bytes)
const CHUNK_AAD_PREFIX = new TextEncoder().encode('tv1/chunk');

/**
 * Builds the Authenticated Additional Data (AAD) for a chunk.
 * AAD = "tv1/chunk" || fileId(16 bytes) || u32be(chunkIndex) || u32be(chunkCount)
 */
export function buildChunkAAD(
  fileIdBytes: Uint8Array,
  chunkIndex: number,
  chunkCount: number
): Uint8Array {
  if (fileIdBytes.length !== 16) {
    throw new Error(`fileId must be exactly 16 bytes, got ${fileIdBytes.length}`);
  }
  return concatBytes(
    CHUNK_AAD_PREFIX,
    fileIdBytes,
    u32be(chunkIndex),
    u32be(chunkCount)
  );
}

/**
 * Encrypts a plaintext chunk.
 * Blob format: IV(12 bytes) || Ciphertext || Tag(16 bytes)
 */
export async function encryptChunk(
  fileKey: CryptoKey,
  fileIdBytes: Uint8Array,
  chunkIndex: number,
  chunkCount: number,
  plaintextChunk: Uint8Array
): Promise<Uint8Array> {
  const iv = randomBytes(12);
  const aad = buildChunkAAD(fileIdBytes, chunkIndex, chunkCount);

  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBufferSource(iv), additionalData: toBufferSource(aad) },
    fileKey,
    toBufferSource(plaintextChunk)
  );

  return concatBytes(iv, new Uint8Array(ciphertextBuf));
}

/**
 * Decrypts a chunk blob.
 * Rejects if IV, ciphertext, tag, chunkIndex, chunkCount, or fileId are tampered with.
 */
export async function decryptChunk(
  fileKey: CryptoKey,
  fileIdBytes: Uint8Array,
  chunkIndex: number,
  chunkCount: number,
  chunkBlob: Uint8Array
): Promise<Uint8Array> {
  if (chunkBlob.length < 12 + 16) {
    throw new Error(
      `Invalid chunk blob: length ${chunkBlob.length} is less than minimum 28 bytes (12 IV + 16 Tag)`
    );
  }

  const iv = chunkBlob.subarray(0, 12);
  const ciphertextWithTag = chunkBlob.subarray(12);
  const aad = buildChunkAAD(fileIdBytes, chunkIndex, chunkCount);

  try {
    const plaintextBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toBufferSource(iv), additionalData: toBufferSource(aad) },
      fileKey,
      toBufferSource(ciphertextWithTag)
    );
    return new Uint8Array(plaintextBuf);
  } catch (err) {
    throw new Error(
      `Decryption failed for chunk ${chunkIndex}/${chunkCount}: data corrupted, wrong key, or AAD binding mismatch`
    );
  }
}

/**
 * Calculates the total chunk count for a given total file size and chunk size.
 * Note: An empty file (size 0) has 1 chunk containing 0 bytes.
 */
export function calculateChunkCount(fileSize: number, chunkSize = CHUNK_PLAIN): number {
  if (fileSize <= 0) {
    return 1;
  }
  return Math.ceil(fileSize / chunkSize);
}
