// Vault creation, unlocking, and re-wrapping using WebCrypto

import { VaultHeader } from './types';
import {
  randomBytes,
  bytesToHex,
  hexToBytes,
  base32Encode,
  formatRecoveryKey,
  parseRecoveryKey,
  toBufferSource
} from './utils';
import {
  deriveKEK,
  deriveRecoveryKEK,
  importMasterKey
} from './kdf';

const VAULT_AAD = new TextEncoder().encode('tv1/vault');
const VAULT_RK_AAD = new TextEncoder().encode('tv1/vault-rk');

export interface CreateVaultResult {
  header: VaultHeader;
  masterKey: CryptoKey;
  rawMasterKey: Uint8Array;
  recoveryKeyStr: string;
}

/**
 * Creates a new encrypted vault header with a fresh 256-bit Master Key (MK),
 * passphrase wrapper, and 52-char Base32 recovery key wrapper.
 */
export async function createVault(
  passphrase: string,
  iterations = 600_000
): Promise<CreateVaultResult> {
  const rawMK = randomBytes(32);
  const salt = randomBytes(16);
  const iv = randomBytes(12);

  // 1. Passphrase wrapper
  const kek = await deriveKEK(passphrase, salt, iterations);
  const wrappedMKBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBufferSource(iv), additionalData: toBufferSource(VAULT_AAD) },
    kek,
    toBufferSource(rawMK)
  );
  const wrappedMK = new Uint8Array(wrappedMKBuffer);

  // 2. Recovery key wrapper
  const rawRK = randomBytes(32);
  const rkIv = randomBytes(12);
  const rkKek = await deriveRecoveryKEK(rawRK);
  const wrappedMKRkBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBufferSource(rkIv), additionalData: toBufferSource(VAULT_RK_AAD) },
    rkKek,
    toBufferSource(rawMK)
  );
  const wrappedMK_rk = new Uint8Array(wrappedMKRkBuffer);

  const recoveryKeyBase32 = base32Encode(rawRK);
  const recoveryKeyStr = formatRecoveryKey(recoveryKeyBase32);

  const header: VaultHeader = {
    v: 1,
    kdf: {
      name: 'PBKDF2-HMAC-SHA256',
      salt: bytesToHex(salt),
      iterations
    },
    iv: bytesToHex(iv),
    wrappedMK: bytesToHex(wrappedMK),
    rkIv: bytesToHex(rkIv),
    wrappedMK_rk: bytesToHex(wrappedMK_rk),
    rev: 1,
    createdAt: Date.now()
  };

  const masterKey = await importMasterKey(rawMK, false);

  return {
    header,
    masterKey,
    rawMasterKey: rawMK,
    recoveryKeyStr
  };
}

/**
 * Unlocks the vault using the owner's passphrase.
 * Returns the non-extractable master key CryptoKey.
 */
export async function unlockVault(
  passphrase: string,
  header: VaultHeader,
  extractable = false
): Promise<{ masterKey: CryptoKey; rawMasterKey?: Uint8Array }> {
  try {
    const salt = hexToBytes(header.kdf.salt);
    const iv = hexToBytes(header.iv);
    const wrappedMK = hexToBytes(header.wrappedMK);

    const kek = await deriveKEK(passphrase, salt, header.kdf.iterations);

    const rawMKBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toBufferSource(iv), additionalData: toBufferSource(VAULT_AAD) },
      kek,
      toBufferSource(wrappedMK)
    );
    const rawMK = new Uint8Array(rawMKBuffer);
    const masterKey = await importMasterKey(rawMK, extractable);

    return {
      masterKey,
      rawMasterKey: extractable ? rawMK : undefined
    };
  } catch (err) {
    throw new Error('Failed to unlock vault: invalid passphrase or tampered vault header');
  }
}

/**
 * Unlocks the vault using the recovery key.
 */
export async function unlockVaultWithRecoveryKey(
  recoveryKeyStr: string,
  header: VaultHeader,
  extractable = false
): Promise<{ masterKey: CryptoKey; rawMasterKey?: Uint8Array }> {
  try {
    const rawRK = parseRecoveryKey(recoveryKeyStr);
    const rkIv = hexToBytes(header.rkIv);
    const wrappedMK_rk = hexToBytes(header.wrappedMK_rk);

    const rkKek = await deriveRecoveryKEK(rawRK);

    const rawMKBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toBufferSource(rkIv), additionalData: toBufferSource(VAULT_RK_AAD) },
      rkKek,
      toBufferSource(wrappedMK_rk)
    );
    const rawMK = new Uint8Array(rawMKBuffer);
    const masterKey = await importMasterKey(rawMK, extractable);

    return {
      masterKey,
      rawMasterKey: extractable ? rawMK : undefined
    };
  } catch (err) {
    throw new Error('Failed to unlock vault with recovery key: invalid recovery key or tampered vault header');
  }
}

/**
 * Re-wraps the master key with a new passphrase.
 * Does NOT touch any stored files or the recovery key wrapper.
 */
export async function rewrapVault(
  rawMasterKey: Uint8Array,
  newPassphrase: string,
  currentHeader: VaultHeader,
  iterations = 600_000
): Promise<VaultHeader> {
  const newSalt = randomBytes(16);
  const newIv = randomBytes(12);

  const newKek = await deriveKEK(newPassphrase, newSalt, iterations);
  const newWrappedMKBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBufferSource(newIv), additionalData: toBufferSource(VAULT_AAD) },
    newKek,
    toBufferSource(rawMasterKey)
  );

  return {
    ...currentHeader,
    kdf: {
      name: 'PBKDF2-HMAC-SHA256',
      salt: bytesToHex(newSalt),
      iterations
    },
    iv: bytesToHex(newIv),
    wrappedMK: bytesToHex(new Uint8Array(newWrappedMKBuffer)),
    rev: currentHeader.rev + 1
  };
}
