import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  encryptChunk,
  decryptChunk,
  buildChunkAAD,
  calculateChunkCount,
  CHUNK_PLAIN
} from './chunks';
import { randomBytes, hexToBytes } from './utils';

describe('Chunk Encryption, Decryption, & Tamper Proofing', () => {
  const dummyFileId = hexToBytes('0123456789abcdef0123456789abcdef');

  async function generateTestKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  it('calculates chunk count accurately including empty files', () => {
    expect(calculateChunkCount(0, 1024)).toBe(1);
    expect(calculateChunkCount(1, 1024)).toBe(1);
    expect(calculateChunkCount(1024, 1024)).toBe(1);
    expect(calculateChunkCount(1025, 1024)).toBe(2);
    expect(calculateChunkCount(2048, 1024)).toBe(2);
    expect(calculateChunkCount(2049, 1024)).toBe(3);
  });

  const testSizes = [
    0,
    1,
    15,
    16,
    17,
    1024,
    64 * 1024,
    CHUNK_PLAIN - 1,
    CHUNK_PLAIN
  ];

  for (const size of testSizes) {
    it(`encrypts and decrypts round-trip for chunk size ${size} bytes`, async () => {
      const key = await generateTestKey();
      const plaintext = new Uint8Array(size);
      if (size > 0) {
        plaintext.fill(0x37);
      }

      const chunkBlob = await encryptChunk(key, dummyFileId, 0, 1, plaintext);
      expect(chunkBlob.length).toBe(12 + size + 16); // 12 IV + size + 16 Tag

      const decrypted = await decryptChunk(key, dummyFileId, 0, 1, chunkBlob);
      expect(decrypted.length).toBe(size);
      expect(Buffer.from(decrypted).equals(Buffer.from(plaintext))).toBe(true);
    });
  }

  it('handles multi-chunk splitting and round-trip for CHUNK + 1 and 3*CHUNK + 17', async () => {
    const key = await generateTestKey();
    // Test multi-chunk logic using a scaled chunk size (e.g. 64KB) for fast test execution
    const testChunkSize = 64 * 1024;
    const multiSizes = [
      testChunkSize + 1,
      3 * testChunkSize + 17
    ];

    for (const totalSize of multiSizes) {
      const totalChunks = calculateChunkCount(totalSize, testChunkSize);
      const plaintext = new Uint8Array(totalSize);
      plaintext.fill(0x5a);

      const encryptedChunks: Uint8Array[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const start = i * testChunkSize;
        const end = Math.min(start + testChunkSize, totalSize);
        const slice = plaintext.subarray(start, end);
        const enc = await encryptChunk(key, dummyFileId, i, totalChunks, slice);
        encryptedChunks.push(enc);
      }

      const decryptedSlices: Uint8Array[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const dec = await decryptChunk(key, dummyFileId, i, totalChunks, encryptedChunks[i]);
        decryptedSlices.push(dec);
      }

      const reassembled = Buffer.concat(decryptedSlices.map((s) => Buffer.from(s)));
      expect(reassembled.length).toBe(totalSize);
      expect(reassembled.equals(Buffer.from(plaintext))).toBe(true);
    }
  });

  it('detects IV tampering', async () => {
    const key = await generateTestKey();
    const plaintext = new TextEncoder().encode('Hello Secure World');
    const blob = await encryptChunk(key, dummyFileId, 0, 1, plaintext);

    // Flip a byte in the IV (first 12 bytes)
    blob[3] ^= 0x55;

    await expect(decryptChunk(key, dummyFileId, 0, 1, blob)).rejects.toThrow(
      /Decryption failed/
    );
  });

  it('detects ciphertext tampering', async () => {
    const key = await generateTestKey();
    const plaintext = new TextEncoder().encode('Hello Secure World');
    const blob = await encryptChunk(key, dummyFileId, 0, 1, plaintext);

    // Flip a byte in the ciphertext body
    blob[15] ^= 0xaa;

    await expect(decryptChunk(key, dummyFileId, 0, 1, blob)).rejects.toThrow(
      /Decryption failed/
    );
  });

  it('detects authentication tag tampering', async () => {
    const key = await generateTestKey();
    const plaintext = new TextEncoder().encode('Hello Secure World');
    const blob = await encryptChunk(key, dummyFileId, 0, 1, plaintext);

    // Flip a byte in the last 16 bytes (AES-GCM tag)
    blob[blob.length - 2] ^= 0x01;

    await expect(decryptChunk(key, dummyFileId, 0, 1, blob)).rejects.toThrow(
      /Decryption failed/
    );
  });

  it('rejects swapped chunks (index mismatch detection via AAD)', async () => {
    const key = await generateTestKey();
    const chunk0Plain = new TextEncoder().encode('Chunk zero data');
    const chunk1Plain = new TextEncoder().encode('Chunk one data');

    const chunk0Blob = await encryptChunk(key, dummyFileId, 0, 2, chunk0Plain);
    const chunk1Blob = await encryptChunk(key, dummyFileId, 1, 2, chunk1Plain);

    // Attempting to decrypt chunk 1 with chunkIndex = 0 must fail
    await expect(decryptChunk(key, dummyFileId, 0, 2, chunk1Blob)).rejects.toThrow(
      /Decryption failed/
    );

    // Attempting to decrypt chunk 0 with chunkIndex = 1 must fail
    await expect(decryptChunk(key, dummyFileId, 1, 2, chunk0Blob)).rejects.toThrow(
      /Decryption failed/
    );
  });

  it('rejects chunks bound to a different fileId (cross-file tampering detection)', async () => {
    const key = await generateTestKey();
    const otherFileId = hexToBytes('fedcba9876543210fedcba9876543210');
    const plaintext = new TextEncoder().encode('File chunk content');

    const blob = await encryptChunk(key, dummyFileId, 0, 1, plaintext);

    // Decrypting with wrong fileId
    await expect(decryptChunk(key, otherFileId, 0, 1, blob)).rejects.toThrow(
      /Decryption failed/
    );
  });

  it('rejects truncated chunks', async () => {
    const key = await generateTestKey();
    const plaintext = new TextEncoder().encode('Non-empty content');
    const blob = await encryptChunk(key, dummyFileId, 0, 1, plaintext);

    // Less than 28 bytes
    const severelyTruncated = blob.subarray(0, 20);
    await expect(decryptChunk(key, dummyFileId, 0, 1, severelyTruncated)).rejects.toThrow(
      /Invalid chunk blob/
    );

    // Truncated by 1 byte (tag cut short)
    const slightlyTruncated = blob.subarray(0, blob.length - 1);
    await expect(decryptChunk(key, dummyFileId, 0, 1, slightlyTruncated)).rejects.toThrow(
      /Decryption failed/
    );
  });

  it('property-based test: encrypt/decrypt arbitrary Uint8Array payloads', async () => {
    const key = await generateTestKey();

    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 0, maxLength: 8192 }),
        fc.nat({ max: 50 }),
        async (payload, chunkIdx) => {
          const totalChunks = chunkIdx + 1;
          const blob = await encryptChunk(key, dummyFileId, chunkIdx, totalChunks, payload);
          const decrypted = await decryptChunk(key, dummyFileId, chunkIdx, totalChunks, blob);
          expect(decrypted).toEqual(payload);
        }
      ),
      { numRuns: 25 }
    );
  });
});
