// Disaster-recovery snapshot binary container format

import { VaultHeader, SnapshotItemRecord } from './types';
import { u32be, readU32be, concatBytes } from './utils';

const SNAPSHOT_MAGIC = new Uint8Array([0x54, 0x56, 0x31, 0x53, 0x4e, 0x41, 0x50, 0x00]); // "TV1SNAP\0"
const SNAPSHOT_VERSION = 1;

/**
 * Packs a vault header and a list of encrypted item records into a binary snapshot part container.
 */
export function packSnapshotPart(
  vaultHeader: VaultHeader,
  items: SnapshotItemRecord[]
): Uint8Array {
  const headerJson = JSON.stringify(vaultHeader);
  const headerBytes = new TextEncoder().encode(headerJson);

  const parts: Uint8Array[] = [
    SNAPSHOT_MAGIC,
    u32be(SNAPSHOT_VERSION),
    u32be(headerBytes.length),
    headerBytes,
    u32be(items.length)
  ];

  for (const item of items) {
    const idBytes = new TextEncoder().encode(item.id);
    parts.push(
      u32be(idBytes.length),
      idBytes,
      u32be(item.seq),
      u32be(item.rev),
      u32be(item.manifestBlob.length),
      item.manifestBlob
    );
  }

  return concatBytes(...parts);
}

/**
 * Unpacks a binary snapshot part container.
 */
export function unpackSnapshotPart(data: Uint8Array): {
  vaultHeader: VaultHeader;
  items: SnapshotItemRecord[];
} {
  if (data.length < 8 + 4 + 4 + 4) {
    throw new Error('Snapshot container too small');
  }

  // 1. Verify Magic
  for (let i = 0; i < 8; i++) {
    if (data[i] !== SNAPSHOT_MAGIC[i]) {
      throw new Error('Invalid snapshot magic header');
    }
  }

  let offset = 8;
  const version = readU32be(data, offset);
  offset += 4;
  if (version !== SNAPSHOT_VERSION) {
    throw new Error(`Unsupported snapshot version: ${version}`);
  }

  // 2. Vault Header
  const headerLen = readU32be(data, offset);
  offset += 4;
  if (data.length < offset + headerLen) {
    throw new Error('Corrupted snapshot: unexpected EOF reading vault header');
  }
  const headerBytes = data.subarray(offset, offset + headerLen);
  offset += headerLen;
  const headerJson = new TextDecoder().decode(headerBytes);
  const vaultHeader = JSON.parse(headerJson) as VaultHeader;

  // 3. Items
  const itemCount = readU32be(data, offset);
  offset += 4;

  const items: SnapshotItemRecord[] = [];
  for (let i = 0; i < itemCount; i++) {
    if (data.length < offset + 4) {
      throw new Error('Corrupted snapshot: unexpected EOF reading item id length');
    }
    const idLen = readU32be(data, offset);
    offset += 4;
    const idBytes = data.subarray(offset, offset + idLen);
    offset += idLen;
    const id = new TextDecoder().decode(idBytes);

    const seq = readU32be(data, offset);
    offset += 4;
    const rev = readU32be(data, offset);
    offset += 4;

    const blobLen = readU32be(data, offset);
    offset += 4;
    const manifestBlob = data.subarray(offset, offset + blobLen);
    offset += blobLen;

    items.push({
      id,
      seq,
      rev,
      manifestBlob
    });
  }

  return { vaultHeader, items };
}
