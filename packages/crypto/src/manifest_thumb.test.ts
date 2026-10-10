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
    kind: 'file',
    parentId: null,
    favorite: false,
    starred: false,
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

  it('correctly loads and normalizes legacy v1 manifests', async () => {
    const key = await generateTestKey();
    const rev = 1;
    // Old v1 raw JSON without kind, parentId, or starred
    const legacyV1Json = {
      v: 1,
      id: 'aabbccddeeff00112233445566778899',
      name: 'legacy_photo.jpg',
      mime: 'image/jpeg',
      size: 1024,
      sha256: 'abc123',
      chunkSize: 16777216,
      chunks: [],
      takenAt: null,
      uploadedAt: '2026-10-10T12:00:00Z',
      width: null,
      height: null,
      durationMs: null,
      favorite: true,
      trashed: false,
      albumIds: []
    };

    // Encrypt raw legacy JSON
    const jsonStr = JSON.stringify(legacyV1Json);
    const plaintext = new TextEncoder().encode(jsonStr);
    const iv = randomBytes(12);
    const { buildManifestAAD } = await import('./manifest');
    const aad = buildManifestAAD(dummyItemId, rev);
    const ciphertextBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad as BufferSource },
      key,
      plaintext
    );
    const blob = new Uint8Array(12 + ciphertextBuf.byteLength);
    blob.set(iv, 0);
    blob.set(new Uint8Array(ciphertextBuf), 12);

    const decrypted = await decryptManifest(key, dummyItemId, rev, blob);
    expect(decrypted.kind).toBe('file');
    expect(decrypted.parentId).toBeNull();
    expect(decrypted.starred).toBe(true);
    expect(decrypted.favorite).toBe(true);
  });

  it('encrypts and decrypts v2 folder manifests with 0 chunks', async () => {
    const key = await generateTestKey();
    const rev = 1;
    const folderManifest: ItemManifest = {
      v: 2,
      id: 'aabbccddeeff00112233445566778899',
      kind: 'folder',
      parentId: null,
      name: 'Trip 2026',
      mime: 'application/x-directory',
      size: 0,
      sha256: '',
      chunkSize: 0,
      chunks: [],
      takenAt: null,
      uploadedAt: new Date().toISOString(),
      width: null,
      height: null,
      durationMs: null,
      starred: false,
      favorite: false,
      trashed: false,
      albumIds: []
    };

    const blob = await encryptManifest(key, dummyItemId, rev, folderManifest);
    const decrypted = await decryptManifest(key, dummyItemId, rev, blob);
    expect(decrypted.kind).toBe('folder');
    expect(decrypted.name).toBe('Trip 2026');
    expect(decrypted.chunks).toHaveLength(0);
    expect(decrypted.parentId).toBeNull();
  });
});
