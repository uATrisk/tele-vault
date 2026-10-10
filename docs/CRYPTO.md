# Cryptographic Specifications & Verification

TeleVault uses only standard WebCrypto APIs available natively in modern browsers (`crypto.subtle`), avoiding external untrusted third-party crypto libraries.

---

## 1. Key Derivation Hierarchy

```
Passphrase (User secret)
    │
    ▼ PBKDF2 (HMAC-SHA256, 600,000 iterations, 32-byte CSPRNG salt)
Master Key (256-bit AES-GCM key)
    │
    ├── HKDF-Expand (Info: "televault-chunk-v1") ───> Chunk Encryption Key (CEK)
    ├── HKDF-Expand (Info: "televault-manifest-v1") ─> Manifest Encryption Key (MEK)
    ├── HKDF-Expand (Info: "televault-thumb-v1") ────> Thumbnail Encryption Key (TEK)
    └── HKDF-Expand (Info: "televault-blind-index") ─> Blind Search Key (BSK)
```

---

## 2. Encryption Scheme

- **Algorithm:** AES-256-GCM (`AES-GCM` in WebCrypto)
- **Key Length:** 256 bits
- **IV / Nonce:** 96 bits (12 bytes) cryptographically random (`crypto.getRandomValues`). An IV is strictly used only once per key.
- **Authentication Tag:** 128 bits (16 bytes), appended directly to ciphertext.
- **Wire Format for Chunks & Manifests:**
  ```
  [ 12-byte IV ] || [ Ciphertext ] || [ 16-byte GCM Tag ]
  ```

---

## 3. Cryptographic Verification & Tests

The crypto engine in `packages/crypto` is validated against:
1. **NIST SP 800-38D Known-Answer Tests (KAT):** Validates AES-GCM against official test vectors.
2. **RFC 5869 Test Vectors:** Validates HKDF extraction and expansion.
3. **RFC 6070 Test Vectors:** Validates PBKDF2 HMAC-SHA256.
4. **Tamper Detection:** Changing any single byte in the ciphertext or tag fails decryption with `OperationError` (GCM authentication failure).

---

## 4. Manifest Schema (v1 to v2 Evolution)

TeleVault manifests are encrypted client-side using the Manifest Encryption Key (MEK) and bound to `itemId` and revision `rev` via Authenticated Additional Data (AAD).

### Manifest v2 Format:
```typescript
export type ItemKind = 'file' | 'folder';

export interface ItemManifest {
  v: 1 | 2;
  id: string;              // 16-byte random hex string
  kind?: ItemKind;         // 'file' (default) or 'folder'
  parentId?: string | null;// folder ID or null (root)
  name: string;            // Plaintext name (encrypted within manifest)
  mime: string;            // MIME type (e.g. 'image/jpeg' or 'application/x-directory')
  size: number;            // Total plaintext bytes (0 for folders)
  sha256: string;          // Plaintext SHA-256 hash (empty string for folders)
  chunkSize: number;       // Typically 16 MiB (0 for folders)
  chunks: ChunkInfo[];     // Array of chunk descriptors (empty [] for folders)
  takenAt: string | null;  // ISO 8601 creation/EXIF timestamp
  uploadedAt: string;      // ISO 8601 upload timestamp
  width: number | null;    // Image/video dimensions
  height: number | null;
  durationMs: number | null;
  favorite?: boolean;      // Legacy v1 field
  starred?: boolean;       // v2 field (aliased to favorite)
  trashed: boolean;        // Soft-delete flag
  albumIds: string[];
}
```

### Zero-Knowledge Guarantee:
- Folder hierarchies, item names, and relationships exist solely inside the encrypted manifest ciphertext.
- Cloudflare and Telegram only observe random hex IDs (`id: "16-byte-hex"`).
- Legacy v1 manifests without `kind` or `parentId` are transparently normalized to `kind: 'file'`, `parentId: null`, and `starred: false` on client-side decryption.

