// Type definitions for TeleVault cryptography and container schemas

export interface VaultKdfParams {
  name: 'PBKDF2-HMAC-SHA256';
  salt: string; // hex
  iterations: number;
}

export interface VaultHeader {
  v: 1;
  kdf: VaultKdfParams;
  iv: string; // hex (12 bytes)
  wrappedMK: string; // hex (32 bytes ciphertext + 16 bytes tag = 48 bytes)
  rkIv: string; // hex (12 bytes)
  wrappedMK_rk: string; // hex (48 bytes)
  rev: number;
  createdAt: number;
}

export interface ChunkInfo {
  messageId: number;
  fileId: string; // hex (16 bytes)
  size: number; // ciphertext size
}

export type ItemKind = 'file' | 'folder';

export interface ItemManifest {
  v: 1 | 2;
  id: string; // hex (16 bytes)
  kind?: ItemKind; // default 'file'
  parentId?: string | null; // null or missing = root
  name: string;
  mime: string;
  size: number; // plaintext total size (0 for folders)
  sha256: string; // hex plaintext SHA-256 ("" for folders)
  chunkSize: number; // typically 16777216 (16 MiB)
  chunks: ChunkInfo[]; // empty [] for folders
  takenAt: string | null; // ISO 8601
  uploadedAt: string; // ISO 8601
  width: number | null;
  height: number | null;
  durationMs: number | null;
  favorite?: boolean;
  starred?: boolean;
  trashed: boolean;
  albumIds: string[];
}

export interface SnapshotHeadPart {
  fileId: string;
  size: number;
  itemCount: number;
}

export interface SnapshotHead {
  v: 1;
  createdAt: number;
  seq: number;
  totalItems: number;
  parts: SnapshotHeadPart[];
}

export interface SnapshotItemRecord {
  id: string;
  seq: number;
  rev: number;
  manifestBlob: Uint8Array; // encrypted manifest blob
}
