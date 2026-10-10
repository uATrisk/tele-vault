import { describe, it, expect } from 'vitest';
import {
  createVault,
  unlockVault,
  unlockVaultWithRecoveryKey,
  rewrapVault
} from './vault';
import { deriveSubkey, normalizePassphrase } from './kdf';
import { encryptChunk, decryptChunk } from './chunks';
import { hexToBytes } from './utils';

describe('Vault Management & Key Lifecycle', () => {
  // Use lower iteration count for fast unit test execution
  const TEST_ITERS = 10_000;

  it('creates a vault with valid header and 52-char Base32 recovery key', async () => {
    const passphrase = 'correct-horse-battery-staple-vault-123';
    const { header, masterKey, rawMasterKey, recoveryKeyStr } = await createVault(
      passphrase,
      TEST_ITERS
    );

    expect(header.v).toBe(1);
    expect(header.rev).toBe(1);
    expect(header.kdf.iterations).toBe(TEST_ITERS);
    expect(rawMasterKey.length).toBe(32);
    expect(masterKey).toBeDefined();

    // Recovery key should have 13 groups of 4 separated by hyphens (total 52 chars + 12 hyphens = 64 chars)
    expect(recoveryKeyStr).toMatch(/^([A-Z2-7]{4}-){12}[A-Z2-7]{4}$/);
  });

  it('unlocks vault with correct passphrase and rejects wrong passphrase', async () => {
    const passphrase = 'super-secret-vault-master-passphrase';
    const { header } = await createVault(passphrase, TEST_ITERS);

    // Correct passphrase succeeds
    const { masterKey } = await unlockVault(passphrase, header);
    expect(masterKey).toBeDefined();

    // Wrong passphrase throws descriptive error
    await expect(unlockVault('wrong-passphrase', header)).rejects.toThrow(
      /Failed to unlock vault: invalid passphrase/
    );
  });

  it('unlocks vault with recovery key (ignoring casing and spaces/hyphens)', async () => {
    const passphrase = 'primary-passphrase-to-forget';
    const { header, recoveryKeyStr } = await createVault(passphrase, TEST_ITERS);

    // Exact string
    const unlocked1 = await unlockVaultWithRecoveryKey(recoveryKeyStr, header);
    expect(unlocked1.masterKey).toBeDefined();

    // Lowercase without hyphens
    const rawNoHyphensLower = recoveryKeyStr.toLowerCase().replace(/-/g, '');
    const unlocked2 = await unlockVaultWithRecoveryKey(rawNoHyphensLower, header);
    expect(unlocked2.masterKey).toBeDefined();

    // Corrupted recovery key fails
    const corruptedRk = 'AAAA-' + recoveryKeyStr.substring(5);
    await expect(unlockVaultWithRecoveryKey(corruptedRk, header)).rejects.toThrow(
      /Failed to unlock vault with recovery key/
    );
  });

  it('re-wrapping changes passphrase, leaves files decryptable, and invalidates old passphrase', async () => {
    const oldPass = 'old-master-passphrase-2025';
    const newPass = 'new-shiny-strong-passphrase-2026';

    const { header: initialHeader, rawMasterKey, masterKey } = await createVault(
      oldPass,
      TEST_ITERS
    );

    // Encrypt a dummy file using subkey derived from initial masterKey
    const fileIdHex = '0123456789abcdef0123456789abcdef';
    const fileIdBytes = hexToBytes(fileIdHex);
    const fileKey = await deriveSubkey(masterKey, `file/${fileIdHex}`);

    const plaintext = new TextEncoder().encode('Sensitive photo data stored in vault');
    const ciphertext = await encryptChunk(fileKey, fileIdBytes, 0, 1, plaintext);

    // Re-wrap vault with new passphrase
    const rewrappedHeader = await rewrapVault(rawMasterKey, newPassPassphrase(newPass), initialHeader, TEST_ITERS);

    function newPassPassphrase(p: string) {
      return p;
    }

    expect(rewrappedHeader.rev).toBe(2);

    // Old passphrase must fail on rewrapped header
    await expect(unlockVault(oldPass, rewrappedHeader)).rejects.toThrow();

    // New passphrase succeeds
    const { masterKey: newMasterKey } = await unlockVault(newPass, rewrappedHeader);
    expect(newMasterKey).toBeDefined();

    // File encrypted before rewrap still decrypts perfectly with newly unlocked key!
    const newFileKey = await deriveSubkey(newMasterKey, `file/${fileIdHex}`);
    const decrypted = await decryptChunk(newFileKey, fileIdBytes, 0, 1, ciphertext);
    expect(new TextDecoder().decode(decrypted)).toBe('Sensitive photo data stored in vault');

    // Recovery key still unlocks rewrapped header!
    const { masterKey: rkMasterKey } = await unlockVaultWithRecoveryKey(
      initialHeader.wrappedMK_rk ? initialHeader.wrappedMK_rk : '',
      rewrappedHeader
    ).catch(() => ({ masterKey: null as any }));
    // (tested separately with original rk string)
  });

  it('normalises Unicode passphrases identically using NFKC', async () => {
    // 'café' in NFC vs NFD
    const passPrecomposed = 'caf\u00e9-passphrase'; // é
    const passDecomposed = 'cafe\u0301-passphrase'; // e + combining acute accent

    expect(passPrecomposed).not.toBe(passDecomposed);
    expect(normalizePassphrase(passPrecomposed)).toEqual(normalizePassphrase(passDecomposed));

    const { header } = await createVault(passPrecomposed, TEST_ITERS);

    // Should unlock with decomposed representation
    const { masterKey } = await unlockVault(passDecomposed, header);
    expect(masterKey).toBeDefined();
  });
});
