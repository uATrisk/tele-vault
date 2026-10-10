// Key derivation functions (PBKDF2 and HKDF) using WebCrypto

import { toBufferSource } from './utils';

const HKDF_SALT = new TextEncoder().encode('tv1');

/**
 * Normalises a passphrase string with Unicode NFKC normalization and encodes as UTF-8.
 */
export function normalizePassphrase(passphrase: string): Uint8Array {
  const normalized = passphrase.normalize('NFKC');
  return new TextEncoder().encode(normalized);
}

/**
 * Derives a 256-bit AES-GCM Key Encryption Key (KEK) from a passphrase using PBKDF2-HMAC-SHA256.
 */
export async function deriveKEK(
  passphrase: string,
  salt: Uint8Array,
  iterations = 600_000
): Promise<CryptoKey> {
  const passphraseBytes = normalizePassphrase(passphrase);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    toBufferSource(passphraseBytes),
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toBufferSource(salt),
      iterations,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

/**
 * Derives a 256-bit AES-GCM key from a 32-byte Recovery Key using HKDF-SHA256.
 */
export async function deriveRecoveryKEK(recoveryKeyBytes: Uint8Array): Promise<CryptoKey> {
  const hkdfBaseKey = await crypto.subtle.importKey(
    'raw',
    toBufferSource(recoveryKeyBytes),
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: toBufferSource(HKDF_SALT),
      info: toBufferSource(new TextEncoder().encode('tv1/recovery'))
    },
    hkdfBaseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Imports 32 raw bytes as a Master Key (MK) for HKDF key derivation.
 */
export async function importMasterKey(
  rawMK: Uint8Array,
  extractable = false
): Promise<CryptoKey> {
  if (rawMK.length !== 32) {
    throw new Error(`Master key must be exactly 32 bytes, got ${rawMK.length}`);
  }
  return crypto.subtle.importKey(
    'raw',
    toBufferSource(rawMK),
    { name: 'HKDF' },
    extractable,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Derives a subkey from the Master Key (HKDF-SHA256, salt="tv1", info=info).
 * info values: "manifest", "thumb", "snapshot", or "file/" + hex(fileId).
 */
export async function deriveSubkey(
  masterKey: CryptoKey,
  info: string
): Promise<CryptoKey> {
  const infoBytes = new TextEncoder().encode(info);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: toBufferSource(HKDF_SALT),
      info: toBufferSource(infoBytes)
    },
    masterKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
