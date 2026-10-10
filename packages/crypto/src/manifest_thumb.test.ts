import { describe, it, expect } from 'vitest';
import { encryptManifest, decryptManifest } from './manifest';
import { encryptThumbnail, decryptThumbnail } from './thumb';
import { ItemManifest } from './types';
import { hexToBytes, randomBytes } from './utils';

describe('Item Manifest & Thumbnail Crypto', () => {
  const dummyItemId = hexToBytes('aabbccddeeff00112233445566778899');
  const dummyOtherId = hexToBytes('00112233445566778899aabbccddeeff');

  async function generateTestKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  const sampleManifest: ItemManifest = {
    v: 1,
    id: 'aabbccddeeff00112233445566778899',
    name: 'IMG_20261010_130000.HEIC',
    mime: 'image/heic',
    size: 4194304,
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    chunkSize: 16777216,
    chunks: [{ messageId: 101, fileId: '1234567890abcdef1234567890abcdef', size: 4194332 }],
    takenAt: '2026-10-10T13:00:00Z',
    uploadedAt: '2026-10-10T13:05:00Z',
    width: 4032,
    height: 3024,
    durationMs: null,
    favorite: false,
    trashed: false,
    albumIds: []
  };

  it('encrypts and decrypts an ItemManifest round-trip', async () => {
    const key = await generateTestKey();
    const rev = 1;

    const blob = await encryptManifest(key, dummyItemId, rev, sampleManifest);
    expect(blob.length).toBeGreaterThan(28);

    const decrypted = await decryptManifest(key, dummyItemId, rev, blob);
    expect(decrypted).toEqual(sampleManifest);
  });

  it('rejects manifest decryption if revision or itemId does not match AAD', async () => {
    const key = await generateTestKey();
    const rev = 1;

    const blob = await encryptManifest(key, dummyItemId, rev, sampleManifest);

    // Wrong revision (e.g. rev = 2)
    await expect(decryptManifest(key, dummyItemId, 2, blob)).rejects.toThrow(
      /Failed to decrypt manifest/
    );

    // Wrong itemId
    await expect(decryptManifest(key, dummyOtherId, rev, blob)).rejects.toThrow(
      /Failed to decrypt manifest/
    );
  });

  it('encrypts and decrypts thumbnail round-trip and detects tampering', async () => {
    const key = await generateTestKey();
    const fakeWebp = randomBytes(4096); // 4 KB image bytes

    const blob = await encryptThumbnail(key, dummyItemId, fakeWebp);
    expect(blob.length).toBe(12 + fakeWebp.length + 16);

    const decrypted = await decryptThumbnail(key, dummyItemId, blob);
    expect(decrypted).toEqual(fakeWebp);

    // Tampering test: flip byte in ciphertext
    blob[20] ^= 0x42;
    await expect(decryptThumbnail(key, dummyItemId, blob)).rejects.toThrow(
      /Failed to decrypt thumbnail/
    );
  });
});
