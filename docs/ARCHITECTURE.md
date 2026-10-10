# TeleVault Architecture & System Design

TeleVault is designed around a strict zero-knowledge model where the storage provider (Telegram) and the compute/database edge (Cloudflare) have no access to decrypted user media or metadata.

---

## 1. Monorepo Organization

```
tele-vault/
├── packages/
│   └── crypto/             # Pure WebCrypto encryption & key derivation engine
├── apps/
│   ├── web/                # React 18 + Vite + Tailwind CSS SPA
│   └── worker/             # Cloudflare Worker API + D1 SQLite migration engine
├── tools/
│   └── mock-telegram/      # In-memory mock Telegram Bot API server for CI/E2E
├── scripts/
│   ├── setup.ts            # CLI setup wizard & token generation
│   ├── doctor.ts           # Pre-flight Telegram diagnostic suite
│   ├── live-smoke.ts       # Roundtrip encrypt/upload/decrypt test against real Telegram
│   ├── restore.ts          # Off-grid disaster recovery tool
│   └── deploy.ts           # Cloudflare deployment CLI
└── tests/
    └── e2e/                # Playwright end-to-end browser test suite
```

---

## 2. Data Flow

### Upload Flow
1. **User Selection:** User drops a photo or video into the Web SPA.
2. **Client Thumbnail Generation:** Canvas draws a downsampled thumbnail (max 400px).
3. **Client-Side Chunking:** If file > 20 MB, it is sliced into deterministic 20 MB chunks.
4. **Encryption (AES-256-GCM):**
   - Each chunk is encrypted using a unique 12-byte random IV.
   - The thumbnail is encrypted separately.
   - An encrypted manifest is generated containing file size, MIME type, hashes, and chunk metadata.
5. **Worker Proxying:** Worker receives ciphertext blobs with `Content-Type: application/octet-stream`.
6. **Telegram Dispatch:** Worker sends each chunk as a `.bin` document to the private Telegram channel using `sendDocument`.
7. **D1 Recording:** D1 stores the mapping of encrypted file ID -> chunk Telegram message IDs. Telegram metadata contains only anonymous UUIDs.

### Playback & Lightbox Flow
1. **Timeline Grid:** Fetches encrypted thumbnails from `/api/files/:id/thumbnail`. Decrypted in memory using thumbnail subkey.
2. **Media Playback:** When clicked, the Web SPA downloads chunks in parallel or streaming sequence via `/api/files/:id/chunks/:index`.
3. **Decryption & Blob URL:** Browser decrypts chunks with WebCrypto AES-256-GCM, concatenates into a `Blob`, and creates an object URL (`blob:http...`) for the `<video>` or `<img>` element.

---

## 3. Storage Hierarchy

- **Local IndexedDB / Memory:** Master Key, active session token, salt, and ephemeral cached decrypts.
- **Cloudflare D1:** Encrypted file headers, chunk maps, upload state machines, and snapshot history.
- **Telegram Channel:** Unbounded blob storage. All messages are non-captioned binary files named `<uuid>.bin`.
