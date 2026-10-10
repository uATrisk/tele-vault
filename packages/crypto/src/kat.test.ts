import { describe, it, expect } from 'vitest';
import { hexToBytes, bytesToHex, toBufferSource } from './utils';

describe('Cryptographic Known-Answer Tests (KAT)', () => {
  it('HKDF-SHA256 matches RFC 5869 Test Case 1', async () => {
    // RFC 5869 Test Case 1
    const ikm = hexToBytes('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b');
    const salt = hexToBytes('000102030405060708090a0b0c');
    const info = hexToBytes('f0f1f2f3f4f5f6f7f8f9');
    const expectedOkm = '3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865';

    const baseKey = await crypto.subtle.importKey(
      'raw',
      toBufferSource(ikm),
      { name: 'HKDF' },
      false,
      ['deriveBits']
    );

    const okmBuf = await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: toBufferSource(salt),
        info: toBufferSource(info)
      },
      baseKey,
      42 * 8 // 42 bytes (336 bits)
    );

    const actualOkmHex = bytesToHex(new Uint8Array(okmBuf));
    expect(actualOkmHex).toBe(expectedOkm);
  });

  it('AES-256-GCM matches NIST SP 800-38D Test Vector (Case 13)', async () => {
    // NIST SP 800-38D Case 13 (256-bit key, 96-bit IV, 0-byte PT)
    const keyBytes = hexToBytes('0000000000000000000000000000000000000000000000000000000000000000');
    const ivBytes = hexToBytes('000000000000000000000000');
    const expectedTag = '530f8afbc74536b9a963b4f1c4cb738b';

    const key = await crypto.subtle.importKey(
      'raw',
      toBufferSource(keyBytes),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );

    const ciphertextWithTagBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: toBufferSource(ivBytes) },
      key,
      new Uint8Array(0)
    );

    const actualTag = bytesToHex(new Uint8Array(ciphertextWithTagBuf));
    expect(actualTag).toBe(expectedTag);
  });
});
