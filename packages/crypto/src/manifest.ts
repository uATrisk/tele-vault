// Item manifest encryption and decryption

import { ItemManifest } from './types';
import { u32be, concatBytes, randomBytes, toBufferSource } from './utils';

const MANIFEST_AAD_PREFIX = new TextEncoder().encode('tv1/manifest');

export function buildManifestAAD(itemIdBytes: Uint8Array, rev: number): Uint8Array {
  if (itemIdBytes.length !== 16) {
    throw new Error(`itemId must be exactly 16 bytes, got ${itemIdBytes.length}`);
  }
  return concatBytes(MANIFEST_AAD_PREFIX, itemIdBytes, u32be(rev));
}

/**
 * Encrypts an ItemManifest JSON object with the manifest subkey.
 * Returns IV(12 bytes) || Ciphertext || Tag(16 bytes).
 */
export async function encryptManifest(
  manifestKey: CryptoKey,
  itemIdBytes: Uint8Array,
  rev: number,
  manifest: ItemManifest
): Promise<Uint8Array> {
  const jsonStr = JSON.stringify(manifest);
  const plaintext = new TextEncoder().encode(jsonStr);
  const iv = randomBytes(12);
  const aad = buildManifestAAD(itemIdBytes, rev);

  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBufferSource(iv), additionalData: toBufferSource(aad) },
    manifestKey,
    toBufferSource(plaintext)
  );

  return concatBytes(iv, new Uint8Array(ciphertextBuf));
}

/**
 * Decrypts an ItemManifest blob.
 */
export async function decryptManifest(
  manifestKey: CryptoKey,
  itemIdBytes: Uint8Array,
  rev: number,
  blob: Uint8Array
): Promise<ItemManifest> {
  if (blob.length < 28) {
    throw new Error(`Manifest blob too short: ${blob.length} bytes`);
  }

  const iv = blob.subarray(0, 12);
  const ciphertextWithTag = blob.subarray(12);
  const aad = buildManifestAAD(itemIdBytes, rev);

  try {
    const plaintextBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toBufferSource(iv), additionalData: toBufferSource(aad) },
      manifestKey,
      toBufferSource(ciphertextWithTag)
    );
    const jsonStr = new TextDecoder().decode(plaintextBuf);
    const parsed = JSON.parse(jsonStr) as ItemManifest;
    if (!parsed.kind) parsed.kind = 'file';
    if (parsed.parentId === undefined) parsed.parentId = null;
    if (parsed.starred === undefined) parsed.starred = parsed.favorite ?? false;
    if (parsed.favorite === undefined) parsed.favorite = parsed.starred ?? false;
    return parsed;
  } catch (err) {
    throw new Error('Failed to decrypt manifest: data corrupted or AAD binding mismatch');
  }
}
