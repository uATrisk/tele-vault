import { describe, it, expect } from 'vitest';
import { packSnapshotPart, unpackSnapshotPart } from './snapshot';
import { VaultHeader, SnapshotItemRecord } from './types';
import { randomBytes } from './utils';

describe('Disaster Recovery Snapshot Container', () => {
  const dummyHeader: VaultHeader = {
    v: 1,
    kdf: {
      name: 'PBKDF2-HMAC-SHA256',
      salt: '0123456789abcdef0123456789abcdef',
      iterations: 600000
    },
    iv: '0123456789abcdef01234567',
    wrappedMK: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    rkIv: '0123456789abcdef01234567',
    wrappedMK_rk: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    rev: 1,
    createdAt: 1728560000000
  };

  it('packs and unpacks an empty snapshot part', () => {
    const packed = packSnapshotPart(dummyHeader, []);
    expect(packed.length).toBeGreaterThan(20);

    const unpacked = unpackSnapshotPart(packed);
    expect(unpacked.vaultHeader).toEqual(dummyHeader);
    expect(unpacked.items).toEqual([]);
  });

  it('packs and unpacks a snapshot part with multiple encrypted item records', () => {
    const items: SnapshotItemRecord[] = [
      {
        id: 'item-001',
        seq: 1,
        rev: 1,
        manifestBlob: randomBytes(256)
      },
      {
        id: 'item-002',
        seq: 2,
        rev: 3,
        manifestBlob: randomBytes(312)
      }
    ];

    const packed = packSnapshotPart(dummyHeader, items);
    const unpacked = unpackSnapshotPart(packed);

    expect(unpacked.vaultHeader).toEqual(dummyHeader);
    expect(unpacked.items.length).toBe(2);
    expect(unpacked.items[0].id).toBe('item-001');
    expect(unpacked.items[0].seq).toBe(1);
    expect(unpacked.items[0].rev).toBe(1);
    expect(unpacked.items[0].manifestBlob).toEqual(items[0].manifestBlob);

    expect(unpacked.items[1].id).toBe('item-002');
    expect(unpacked.items[1].seq).toBe(2);
    expect(unpacked.items[1].rev).toBe(3);
    expect(unpacked.items[1].manifestBlob).toEqual(items[1].manifestBlob);
  });

  it('rejects corrupted snapshot magic', () => {
    const packed = packSnapshotPart(dummyHeader, []);
    packed[0] = 0x00; // corrupt magic

    expect(() => unpackSnapshotPart(packed)).toThrow(/Invalid snapshot magic header/);
  });
});
