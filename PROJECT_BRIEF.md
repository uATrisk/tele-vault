# PROJECT BRIEF: TeleVault

*(Working name. Rename freely.)*

A private, end-to-end encrypted photo and video library that uses **your own private Telegram channel as storage** and a **website hosted on Cloudflare** as the way to upload, browse, view and download.

---

## 0. For the human: how to use this file

1. Create an empty folder, save this file in it as `PROJECT_BRIEF.md`, and open the folder in Antigravity.
2. Send the agent this first message:

   > Read `PROJECT_BRIEF.md` completely before doing anything. Execute it end to end and autonomously. Stop only at the HUMAN GATES in section 12. Keep a running log in `PROGRESS.md`. Never claim something works unless you actually ran it and have the output.

3. In parallel, do the things in **section 12 → Human checklist** (Telegram bot, private channel, Cloudflare login). The agent will write click-by-click instructions for these in `docs/HUMAN_SETUP.md` early on.
4. When the agent says it is finished, follow `docs/MANUAL_TEST_CHECKLIST.md` (about 15 minutes) to confirm it works for you.

---

## 1. Mission

Build a complete, working, deployable web app, tested end to end, with these properties:

- **Storage:** encrypted file chunks are stored as documents in the owner's **private Telegram channel**, via a bot the owner created.
- **Encryption:** everything is encrypted **in the browser** with a key derived from the owner's passphrase. Telegram, Cloudflare and the Worker never see plaintext, file names or the passphrase.
- **Hosting:** one Cloudflare Worker (API plus static frontend assets) and one Cloudflare D1 database, all on **free tiers**.
- **Usage:** from any browser (Mac Safari/Chrome, phone browser) the owner can **upload** (picker, drag and drop, folders), **browse** (timeline grid with thumbnails), **view** (photo lightbox, video player), **download** originals (single and bulk ZIP), and **delete**.
- **Single user, self-hosted.** There are no accounts, no shared servers, no telemetry, no third-party requests.

The owner has no time to test by hand. **You** must build it, test it thoroughly, fix what breaks, and prove it with evidence. The owner then runs a short manual check.

---

## 2. Operating rules for the agent (read twice)

1. **Autonomy.** Make reasonable decisions yourself and record non-obvious ones in `docs/DECISIONS.md` (decision, alternatives, reason). Only stop and ask at the human gates.
2. **Evidence over claims.** Never write "works" or "passed" without running it. Paste real command output summaries into `docs/TESTING_REPORT.md`. If something cannot be tested (for example it needs real credentials), say **NOT TESTED** and why. Never fake, stub or silently skip tests.
3. **No weakening security to make tests pass.** If a test fails, fix the code, not the security property.
4. **Secrets.** Never print, log, commit, or put in chat the Telegram bot token, access token, passphrase or recovery key. Use `.dev.vars` (gitignored) locally and Cloudflare secrets in production. Add a secret-scan step (e.g. gitleaks) to the test suite.
5. **No placeholders in shipped features.** No `TODO`, mock data or "not implemented" paths reachable by the user, except items explicitly listed under Stretch (section 13).
6. **Verify assumptions.** Section 6 lists platform facts I believe to be true but that may be outdated. Check them against official docs in Phase 0 and adapt the design if they differ.
7. **Licences.** Do **not** copy code from DaemonClient (AGPL-3.0) or TeleDrive (Apache-2.0). You may read their READMEs for ideas. Write original code. Keep dependencies few, mainstream and permissively licensed. Record each dependency's licence in `docs/DEPENDENCIES.md`.
8. **Git hygiene.** `git init`, commit after each completed step with clear messages, keep `main` green.
9. **Quality bar.** TypeScript `strict`, no `any` without a comment explaining why, ESLint and Prettier clean, no unused dependencies.
10. **If blocked twice** on the same problem, write down what you tried in `PROGRESS.md`, choose the best documented fallback, and continue.
11. **Stay in the project folder.** Do not run destructive commands outside it. Do not deploy anywhere before the human gate in Phase 6.

---

## 3. Non-negotiable security and privacy requirements

These are acceptance criteria. Each needs an automated test where possible.

| # | Requirement |
|---|---|
| S1 | The passphrase and the master key **never leave the browser**. The Worker holds only opaque ciphertext. |
| S2 | The Telegram bot token exists **only** as a Worker secret (and in the owner's `.dev.vars` locally). It is never sent to the browser and never appears in any response, log or error message. |
| S3 | Telegram receives only: random-named binary files (`<random>.bin`), no captions, sizes and timestamps. No file names, no plaintext, no EXIF. |
| S4 | All API routes except `/api/health` and `/api/auth/login` require authentication. |
| S5 | No third-party requests from the frontend: no CDNs, no Google Fonts, no analytics. Bundle everything. A test must assert **all browser requests are same-origin**. |
| S6 | Strict CSP (no inline scripts, no `unsafe-eval`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `Cache-Control: no-store` on API responses, HSTS on production. |
| S7 | Authenticated encryption everywhere (AES-256-GCM) with **chunk binding** so chunks cannot be swapped, reordered, dropped or duplicated undetected. |
| S8 | Wrong passphrase, tampered data and missing chunks must produce a **clear error**, never garbage output or a crash. |
| S9 | The setup `doctor` check warns loudly if the Telegram channel is **public** (has a username) or has **more than 2 members** (owner plus bot). The owner had a bad experience with a tool that put a stranger in the channel. |
| S10 | Documented honest threat model (`docs/THREAT_MODEL.md`) including what is still leaked: file count, approximate sizes, upload times, access patterns, and that a malicious server could withhold or roll back data but not read or forge it. |

---

## 4. Prior art (so you know why we build this)

- **TeleDrive** (Mahmud0808/TeleDrive): uses the owner's own Telegram account via TDLib with their own API ID and hash. Passphrase-based AES-256-GCM, and recovery by re-entering the passphrase. It is an Android/desktop app, with no web viewer.
- **DaemonClient** (myrosama/DaemonClient): Cloudflare Worker, D1 database and a browser app on top of a Telegram bot and channel, with 19 MB chunking. Its **Photos** module encrypts on the Worker, so the Worker sees plaintext. Its hosted version has other parties involved.

**What we take:** TeleDrive's "your own credentials, passphrase encryption, recovery". DaemonClient's "Worker plus D1 plus web app, chunking under Telegram's download limit".
**What we do better:** **zero-knowledge Worker** (all crypto in the browser), a private channel only the owner and their bot belong to, and a web UI that works from any device.

---

## 5. Architecture

```
 Browser (Mac / phone)                       Cloudflare (free)                       Telegram
┌───────────────────────┐   HTTPS   ┌───────────────────────────────┐   Bot API  ┌──────────────────┐
│ React + Vite SPA      │──────────▶│ Worker (API + static assets)  │───────────▶│ Private channel  │
│ - passphrase → keys   │  cookie   │ - auth gate                   │            │ (owner + bot)    │
│ - chunk + encrypt     │           │ - Telegram proxy (token here) │◀───────────│ encrypted .bin   │
│ - thumbnails          │◀──────────│ - D1: opaque blobs + index    │            │ documents        │
│ - decrypt + render    │ ciphertext│ - cron: snapshot + GC         │            └──────────────────┘
└───────────────────────┘           └───────────────────────────────┘
```

**Upload:** the browser reads a file, hashes it, makes a thumbnail, splits into chunks, encrypts each chunk, and sends each ciphertext chunk to `POST /api/chunks`. The Worker streams it to Telegram `sendDocument` and returns the message ID and file ID. After all chunks succeed, the browser **commits** an encrypted manifest and encrypted thumbnail with `POST /api/items`. A file is invisible until committed.

**View:** the browser loads the encrypted index from D1 (via the Worker), decrypts manifests locally, and renders the grid. Thumbnails come from D1 in batches. Originals are fetched chunk by chunk (`GET /api/chunks/:fileId`), decrypted locally, and displayed or saved.

**Why D1 plus snapshots:** Telegram Bot API **cannot list or read channel history**, so the index cannot be rebuilt from the channel alone. D1 is the live index. A **pinned encrypted snapshot** of the index in the channel is the disaster-recovery path (see 8.4).

---

## 6. Platform facts to VERIFY in Phase 0

Check each against current official documentation (it is October 2026; limits change). Record results in `docs/DECISIONS.md`. Where cheaply testable, test empirically. Adapt the design if reality differs.

| Fact (my belief) | Why it matters |
|---|---|
| Bot API `sendDocument` accepts up to 50 MB | upper bound for upload chunks |
| Bot API `getFile` download is limited to **20 MB** | chunks must stay well below 20 MB |
| Bots cannot read channel history | forces D1 index plus pinned snapshot |
| `getChat` returns `pinned_message` for a channel | recovery path |
| In channels, pinning needs the admin right `can_edit_messages` (`can_pin_messages` is for groups) | doctor check and setup instructions |
| Per-chat send limits are about 1 message/second, with HTTP 429 and `retry_after` | upload queue, backoff |
| Workers Free: 100,000 requests/day, **10 ms CPU** per request, 50 subrequests, about 100 MB request body, 128 MB memory | chunk size, streaming, no heavy work in the Worker |
| D1 Free: about 5 GB total storage, about 500 MB per database, 5M rows read/day, 100k rows written/day | thumbnail budget, batching |
| Cron Triggers are available on Free | snapshot and garbage collection |
| Workers can serve static assets from the same Worker (same origin, no CORS) | single deploy |
| Safari, Chrome and Firefox support WebCrypto AES-GCM, PBKDF2, HKDF, `File.slice`, `CompressionStream` | compatibility |
| Large downloads: `showSaveFilePicker` is Chromium-only | download fallback strategy |

---

## 7. Cryptography specification

Implement in `packages/crypto` (pure TypeScript, WebCrypto only, runs in browser and Node 20+). Use **only** `crypto.subtle`. No hand-rolled primitives.

### 7.1 Keys

- **MK** (master key): 32 random bytes, generated once at vault creation.
- **KEK**: `PBKDF2-HMAC-SHA256(NFKC(passphrase) as UTF-8, salt16, iterations)`, 32 bytes. Iterations **≥ 600,000**, stored in the vault header so they can be raised later.
- **Vault header** stores: `v`, KDF name and params, `salt`, `wrappedMK = AES-256-GCM(KEK, iv12, MK, AAD="tv1/vault")`.
- **Recovery key (RK):** 32 random bytes shown **once** at setup as 52 base32 characters in groups of 4. Stored as a second wrapper `wrappedMK_rk = AES-256-GCM(HKDF(RK,"tv1/recovery"), iv12, MK, AAD="tv1/vault-rk")`. Setup must force the owner to confirm they saved it (for example by re-typing the last 8 characters).
- **Subkeys** (HKDF-SHA256, salt = `"tv1"`, IKM = MK): info = `"manifest"`, `"thumb"`, `"snapshot"`, and `"file/" + hex(fileId)` (a unique key per file).
- Changing the passphrase **re-wraps MK only**. It must not touch any stored files. Test this.
- In the browser, after unlock, import MK as a **non-extractable HKDF key** so scripts cannot export it. Offer a setting "Remember on this device for N days" that stores that non-extractable `CryptoKey` in IndexedDB with an expiry. Default is "unlock each visit". Provide a Lock button and an idle auto-lock timer.
- Passphrase policy: at least 14 characters or at least 5 random words, with a visible strength meter. Show a plain warning: **"If you lose both the passphrase and the recovery key, your files are unrecoverable by design."**

### 7.2 Chunks

- `CHUNK_PLAIN` = 16 MiB (16,777,216 bytes). Store `chunkSize` in each manifest so it can be changed later without breaking old items. Plaintext chunk size plus 28 bytes must stay below Telegram's download cap with margin.
- Blob format: `IV(12 random bytes) || AES-256-GCM(fileKey, IV, plaintextChunk, AAD) (ciphertext || 16-byte tag)`.
- `AAD = "tv1/chunk" || fileId(16 bytes) || u32be(chunkIndex) || u32be(chunkCount)`.
- A file always has at least one chunk (an empty file is one empty-plaintext chunk).
- Process files as a **stream of slices**. Never load an entire large file into memory.

### 7.3 Manifest and thumbnail

- `fileId` and `itemId`: 16 random bytes each (they may be equal), shown as hex.
- Manifest JSON, encrypted with the `manifest` subkey, `AAD = "tv1/manifest" || itemId || u32be(rev)`:
  ```json
  {
    "v": 1, "id": "…", "name": "IMG_1234.HEIC", "mime": "image/heic",
    "size": 4194304, "sha256": "…", "chunkSize": 16777216,
    "chunks": [{ "messageId": 123, "fileId": "…", "size": 4194332 }],
    "takenAt": "2025-06-01T10:00:00Z", "uploadedAt": "…",
    "width": 4032, "height": 3024, "durationMs": null,
    "favorite": false, "trashed": false, "albumIds": []
  }
  ```
- Thumbnail: WebP (JPEG fallback), long edge about 320 px, **budget ≤ 16 KB**, encrypted with the `thumb` subkey, `AAD = "tv1/thumb" || itemId`.
- Strip EXIF from thumbnails. Keep EXIF only inside the encrypted original and the encrypted manifest fields.

### 7.4 Snapshot format

Binary container: magic, version, vault header (plaintext, safe because wrapped), then the item manifest blobs (already encrypted), optionally split into parts if over 16 MiB. A small **head document** (plaintext JSON listing part file IDs and counts) is what gets pinned. The Worker can build snapshots **without any key**, because everything inside is already ciphertext.

---

## 8. Backend: Worker and D1

### 8.1 Tech

TypeScript Worker, Hono (or equivalent small router), Wrangler, D1 with SQL migrations in `apps/worker/migrations/`. Static frontend served via Workers static assets from the same Worker (same origin).

### 8.2 D1 schema (adjust as needed, document changes)

```sql
vault(id INTEGER PRIMARY KEY CHECK (id=1), header BLOB NOT NULL, rev INTEGER NOT NULL, created_at INTEGER NOT NULL);
items(id TEXT PRIMARY KEY, seq INTEGER NOT NULL UNIQUE, rev INTEGER NOT NULL,
      manifest BLOB NOT NULL, size_bytes INTEGER NOT NULL, chunk_count INTEGER NOT NULL, created_at INTEGER NOT NULL);
thumbs(item_id TEXT PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE, bytes BLOB NOT NULL);
chunks(item_id TEXT, idx INTEGER, message_id INTEGER NOT NULL, file_id TEXT NOT NULL, size INTEGER NOT NULL, PRIMARY KEY(item_id, idx));
pending_chunks(upload_id TEXT, idx INTEGER, message_id INTEGER NOT NULL, file_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(upload_id, idx));
meta(key TEXT PRIMARY KEY, value TEXT);   -- change counter, last snapshot info
```

`seq` comes from a monotonically increasing counter in `meta`, bumped on every item insert or update, so clients can sync with `?since=<seq>`. Deleted items are removed (hard delete), so keep a small `tombstones(seq, id)` table or deliver deletions another way so other devices learn about deletions.

### 8.3 API contract (document in `docs/API.md`, validate inputs, return JSON errors)

| Route | Purpose |
|---|---|
| `GET /api/health` | public, returns only `{ok:true}` |
| `POST /api/auth/login` | body `{token}`. Constant-time compare with secret `ACCESS_TOKEN`. Sets a signed (HMAC, secret `SESSION_SECRET`) `HttpOnly; Secure; SameSite=Strict` cookie, 30-day expiry. Rate-limit failures. |
| `POST /api/auth/logout` | clears cookie |
| `GET /api/vault` | vault header, or 404 if not initialised |
| `PUT /api/vault` | create vault header **only if none exists** |
| `POST /api/vault/rewrap` | replace header with new wrapper (passphrase change), guarded by `rev` |
| `POST /api/chunks` | binary body (ciphertext chunk), headers `X-Upload-Id`, `X-Chunk-Index`. Streams to Telegram `sendDocument` with a random file name. Records `pending_chunks`. Returns `{messageId, fileId}`. Enforce a max body size. |
| `GET /api/chunks/:fileId` | `getFile` then stream from Telegram to the client **without buffering**. `Cache-Control: private, max-age=31536000, immutable`. |
| `GET /api/items?since=&limit=` | paginated encrypted manifests plus tombstones |
| `POST /api/items` | commit: `{id, manifest, thumb, chunks[]}`. Moves rows from `pending_chunks` into `chunks`. Idempotent. |
| `PUT /api/items/:id` | update manifest, guarded by `rev` (optimistic concurrency, return 409 on conflict) |
| `DELETE /api/items/:id` | delete all Telegram messages for the item (using the `chunks` table, no key needed), then delete rows, add tombstone |
| `GET /api/thumbs?ids=a,b,c` | batch of encrypted thumbnails (max 64 per call) |
| `GET /api/stats` | counts, bytes stored, D1 usage estimate |
| `GET /api/doctor` | runs the Telegram checks in 8.5 |
| `POST /api/snapshot` | build and pin a snapshot now |

### 8.4 Scheduled jobs (Cron Trigger, daily)

1. **Snapshot:** if the change counter moved since the last snapshot, build the snapshot (7.4), upload it, **pin** the head document, then delete the previous snapshot messages.
2. **Garbage collection:** delete Telegram messages for `pending_chunks` older than 24 hours (abandoned uploads), then delete those rows.
3. **Restore tool** (`scripts/restore.ts`, runs locally): given bot token and channel ID, calls `getChat`, reads `pinned_message`, downloads the head and parts, and repopulates an **empty** D1. It needs no passphrase because all blobs are opaque. Thumbnails are not in snapshots: the web app offers **"Rebuild thumbnails"**, which regenerates them from originals.

### 8.5 Telegram client and doctor

- Wrap Telegram in one module with: `sendDocument`, `getFile` and download stream, `deleteMessage`, `pinChatMessage`, `getChat`, `getChatMember`, `getChatMemberCount`, `getMe`.
- Handle `429` (respect `retry_after`), transient `5xx` and network errors with capped exponential backoff and jitter. Never retry non-idempotent calls blindly: a retried `sendDocument` can duplicate a message, so track and clean up duplicates through `pending_chunks`.
- Telegram base URL comes from env `TELEGRAM_API_BASE`, defaulting to `https://api.telegram.org`. **Overriding it is honoured only when `ENVIRONMENT=dev`** (used by tests). In any other environment, ignore the override.
- **Doctor checks:** token valid (`getMe`). Chat type is `channel`. Channel has **no public username**. Member count is ≤ 2. Bot is administrator with the rights to post, edit (needed for pinning in channels) and delete. Returns a pass/warn/fail list. The frontend shows it in Settings and blocks first-time setup on a **fail**.

---

## 9. Frontend (React + TypeScript + Vite)

Clean, fast, Google-Photos-like, dark and light themes, responsive from phone to desktop, keyboard accessible, installable as a PWA (manifest and icons, cache the app shell only).

**Screens and features (all must work):**

1. **Login:** enter access token (once per device). **First-run setup wizard:** run doctor, choose passphrase with strength meter, generate and display the recovery key with forced confirmation, create vault.
2. **Unlock:** passphrase prompt. Wrong passphrase gives a clear error and no data. Rate-limit attempts client-side.
3. **Upload:**
   - File picker, **drag and drop**, **folder picker** (`webkitdirectory`), paste, "select photos" on mobile.
   - Queue panel with per-file and overall progress, speed, pause, resume, cancel, retry.
   - Concurrency: about 2 files and 3 chunks in flight. Obey Telegram 429s transparently.
   - Resumable: job state persisted in IndexedDB. After a reload or crash, resume from the last confirmed chunk.
   - Dedupe: compare SHA-256 against the decrypted index, skip duplicates and tell the user.
   - Extract EXIF date, dimensions, video duration. Generate thumbnails (images via canvas, videos via first frame). For HEIC that the browser cannot decode, attempt a bundled WASM decoder, otherwise show a generic placeholder tile and still store the file correctly.
   - Any file type is accepted. Non-media files appear as generic tiles with name and size.
4. **Timeline grid:** grouped by month and day (EXIF date, else file modified date), **virtualized** (must stay smooth with 50,000 items), lazy thumbnail loading in batches via `/api/thumbs`, with an IndexedDB cache for decrypted thumbnails (itself encrypted at rest with a key derived from MK, or wiped on lock).
5. **Viewer:** lightbox with next/previous (arrow keys and swipe), zoom, info panel (name, size, date, dimensions, EXIF), download, favorite, delete. Video player: fetch and decrypt chunks with a progress indicator, then play from a Blob URL. Show a clear message for very large videos on low-memory devices.
6. **Download:** single original (decrypt and save under the original name; use `showSaveFilePicker` streaming where available, Blob fallback otherwise, with a warning for huge files). **Bulk ZIP** of a selection, built client-side by streaming. Verify the SHA-256 after download and show a "verified" indicator.
7. **Selection and bulk actions:** multi-select (click, shift-click, long-press), favorite, trash, restore, delete forever, download ZIP.
8. **Trash:** soft delete is a flag in the encrypted manifest. "Delete forever" calls `DELETE /api/items/:id`. Auto-empty after 30 days (client-side on unlock).
9. **Favorites** filter, **search by file name** (client-side), filters by type (photo, video, other).
10. **Settings:** lock now, remember-device duration, auto-lock timer, change passphrase, show/regenerate nothing secret except via explicit re-entry of passphrase, run doctor, storage stats, "Back up index now" (snapshot), "Rebuild thumbnails", "Verify integrity" (sample or all chunks via re-download and tag check), log out, about and licence.
11. **Error handling and empty states** everywhere: offline, Telegram down, quota hit, wrong passphrase, session expired, conflict (409).

**Stretch (only after all gates pass):** albums, Mac folder-watcher CLI that auto-uploads a folder using the same crypto package, service-worker range streaming for huge videos, Argon2id option, offline thumbnail browsing.

---

## 10. Repo layout and stack

```
televault/
├─ apps/
│  ├─ web/            # Vite + React + TS
│  └─ worker/         # Cloudflare Worker + D1 migrations + wrangler.toml
├─ packages/
│  └─ crypto/         # shared crypto + container formats (browser and Node)
├─ tools/
│  └─ mock-telegram/  # local fake Telegram Bot API server for tests
├─ tests/
│  └─ e2e/            # Playwright
├─ scripts/           # setup, doctor, live-smoke, restore, find-channel-id, deploy
├─ docs/              # see section 13
├─ PROGRESS.md
└─ package.json       # npm workspaces
```

Stack: Node 20+, npm workspaces, TypeScript strict, Vite, React, a small virtual-list library, a small streaming-ZIP library, Vitest (+ `@cloudflare/vitest-pool-workers` for Worker tests), fast-check, Playwright (Chromium **and WebKit** because the owner is on a Mac), axe-core, ESLint, Prettier, gitleaks. Use the mainstream current stable version of everything; pin exact versions.

Single top-level commands the agent must provide:
`npm run dev` (local stack with mock Telegram), `npm run test` (unit + worker), `npm run test:e2e`, `npm run test:all`, `npm run setup`, `npm run doctor`, `npm run live-smoke`, `npm run deploy`.

---

## 11. Testing strategy (most important section)

You will be judged by how thoroughly you test. Build the test harness **early**, then use it constantly.

### 11.1 Mock Telegram (`tools/mock-telegram`)

A local HTTP server implementing the Bot API subset the Worker uses: `getMe`, `getChat`, `getChatMember`, `getChatMemberCount`, `sendDocument` (multipart), `getFile`, file download (enforcing a 20 MB cap), `deleteMessage`, `pinChatMessage`. It must also support **fault injection** (429 with `retry_after`, 500s, dropped connections, slow responses) and expose its stored bytes to tests so tests can inspect "what Telegram sees".

### 11.2 Layers

**A. Crypto unit tests (Vitest, property-based where useful)**
- Round trip for sizes: 0, 1, 15, 16, `CHUNK−1`, `CHUNK`, `CHUNK+1`, `3×CHUNK+17`, and random sizes.
- Tamper tests: flip a byte in IV, ciphertext and tag; swap two chunks; drop a chunk; duplicate a chunk; use the chunk under a different fileId; truncate. **All must fail with a clear error.**
- Wrong passphrase fails. Right passphrase after rewrap succeeds. Old passphrase fails after rewrap. Recovery key unlocks. Wrong recovery key fails. Existing files still decrypt after a passphrase change.
- Unicode passphrases normalise identically (NFKC).
- Known-answer tests for HKDF and AES-GCM usage so regressions are caught.

**B. Worker tests (against mock Telegram and local D1)**
- Every route rejects unauthenticated requests (except `health` and `login`). Cookie flags correct. Token comparison constant-time. Login rate limit works.
- Vault creation is possible once only. Rewrap needs the correct `rev`.
- Chunk upload: Telegram receives a random-named `.bin` and no caption. The pending row is created. Commit moves rows. Commit is idempotent.
- Fault injection: 429 respected, 5xx retried with backoff, connection drop mid-upload leaves no committed item and is later garbage-collected.
- Download streams (assert no full buffering) and 20 MB cap respected.
- Delete removes Telegram messages and rows and emits a tombstone. Optimistic concurrency returns 409 correctly.
- Snapshot build, pin, previous deletion. **Restore into empty D1** reproduces identical items.
- Doctor flags: public channel, 3+ members, missing rights, invalid token.
- Secrets: grep all responses, logs and error bodies in tests for the bot token and fail if found. `TELEGRAM_API_BASE` override is ignored outside `dev`.
- A 16 MiB chunk goes through without memory or timeout problems locally.

**C. End-to-end (Playwright, Chromium + WebKit + a phone viewport) against the local stack with mock Telegram**
- Full journey: login, setup wizard (recovery key confirmation), upload 20 mixed files (JPEG, PNG, HEIC, MP4, PDF, zero-byte, Unicode name), grid shows them, open viewer, play video, download and **byte-compare** with the original, bulk ZIP and compare, favorite, trash, restore, delete forever.
- Large file: upload and download a **300 MB** file, verify hash, and check browser memory stays bounded (chunk streaming).
- Resume: kill the page mid-upload, reload, upload resumes and completes without duplicates.
- Dedupe: uploading the same file twice stores one.
- Lock and unlock, wrong passphrase, idle auto-lock, change passphrase, recovery-key unlock.
- Second browser context (another device): login, unlock, sees the same library, deletion syncs.
- **"Telegram sees nothing" test:** upload files that contain a known sentinel string in their content and name. After the run, scan every byte stored in mock Telegram and every D1 value: the sentinel and file names must be absent, and stored chunks must look high-entropy.
- **"Same origin only" test:** record every network request in the browser and assert all are same-origin.
- Offline and Telegram-down behaviour shows friendly errors.
- Accessibility: axe-core with zero serious or critical violations on main screens.
- Visual review: capture screenshots of every screen at desktop and phone sizes. If you have a browser tool, look at them yourself, list visual defects, fix them, and re-capture. Save final screenshots to `docs/screenshots/`.

**D. Non-functional**
- Performance: seed the index with **20,000 fake items**. Scrolling stays smooth, initial render under 2 s on the dev machine, and memory is reasonable. Record numbers.
- Security hygiene: `npm audit` (no high or critical, or documented exceptions), gitleaks clean, CSP header test, dependency licence report.
- Lint, typecheck and format checks pass in `npm run test:all`.

**E. Live smoke test (gated, needs real credentials, see Phase 6)**
`npm run live-smoke` runs a **local Worker with an ephemeral test vault** against the **real** Telegram bot and channel. It runs `doctor`, uploads small and 15 MiB encrypted files, downloads and verifies them, runs snapshot, pin and restore, **deletes everything it created**, and prints a pass/fail summary. It must never touch the owner's real vault or production D1. If a 15 MiB chunk fails on the real free-tier Worker (for example CPU limit error 1102), reduce `CHUNK_PLAIN` (8 MiB, then 4 MiB), re-test, and record the decision.

### 11.3 Reporting

`docs/TESTING_REPORT.md` must contain: date, versions, every command run, pass/fail counts per layer, anything **NOT TESTED** with reasons, known issues, and links to screenshots. The final message to the owner must link to it.

---

## 12. Phases, gates and the human checklist

Complete phases in order. Do not start a phase until the previous phase's exit criteria pass.

**Phase 0: Recon and decisions.** Verify section 6 facts. Write `docs/DECISIONS.md` and a short plan in `PROGRESS.md`. *Exit:* every fact marked verified or corrected.

**Phase 1: Scaffold and human instructions.** Monorepo, tooling, scripts skeleton, CI-style `npm run test:all` that runs (even if empty). **Write `docs/HUMAN_SETUP.md` now** (see checklist below) so the owner can work in parallel. *Exit:* `npm run test:all` green on empty suites, lint and typecheck work.

**Phase 2: Crypto package.** Implement section 7 plus all layer A tests. *Exit:* layer A fully green.

**Phase 3: Mock Telegram and Worker.** Implement `tools/mock-telegram`, the Worker, D1 migrations, API, cron, doctor, restore script, with layer B tests. *Exit:* layer B fully green. `docs/API.md` written.

**Phase 4: Web app.** Build all features in section 9. *Exit:* app runs locally against the local Worker and mock Telegram. Manual smoke by you via browser tool if available.

**Phase 5: End-to-end and hardening.** Layers C and D. Fix everything they reveal. *Exit:* `npm run test:all` and `npm run test:e2e` fully green on Chromium and WebKit. Testing report drafted.

**⛔ HUMAN GATE A: credentials.** Stop and tell the owner clearly: "Local tests are green. I need the items in the Human checklist to run the live test and deploy." Wait for confirmation. Never ask for secrets in chat: instruct the owner to run `npm run setup`, which prompts securely and writes `.dev.vars` and Cloudflare secrets.

**Phase 6: Live smoke and deploy.** Run `npm run doctor`, then `npm run live-smoke`. Fix issues. Then `npm run deploy` (idempotent: creates D1 if missing, runs migrations, sets secrets, builds the frontend, deploys the Worker, prints the URL, runs a post-deploy health and doctor check). *Exit:* live smoke green, deployed URL answers, security headers verified on the deployed URL.

**Phase 7: Docs and handover.** Produce all documents in section 13 and `docs/MANUAL_TEST_CHECKLIST.md` (a short list of about 15 minutes of manual steps the owner can follow, including "upload 3 real photos and 1 video, view them from your Mac and from your phone, download one and open it, delete one, lock and unlock, and confirm the Telegram channel shows only unreadable `.bin` files").

**⛔ HUMAN GATE B: owner's manual test.** Stop. Wait for results. Fix reported issues, re-run all tests, update the report.

### Human checklist (things only the owner can do)

1. **Telegram bot:** open **@BotFather**, `/newbot`, copy the **bot token**.
2. **Private channel:** create a **private** channel (no public username). Add **only your bot** as an administrator with rights to **post, edit and delete messages** (editing is what allows pinning in channels). Add nobody else.
3. **Channel ID:** the agent provides `npm run find-channel-id`. Post any message in the channel and the script prints the ID (it starts with `-100`).
4. **Cloudflare:** create a free account, then run `npx wrangler login` (opens a browser for approval).
5. **Run `npm run setup`:** paste the bot token and channel ID when prompted (hidden input). It generates the `ACCESS_TOKEN` and `SESSION_SECRET` and shows the access token **once**. Save it in a password manager.
6. **Choose a strong passphrase** in the web setup, and store the **recovery key** offline (printed or in a password manager). Losing both means permanent data loss.
7. **Keep your original photos** on your Mac or an external drive until you have used the system for a while and trust it. Telegram is not a contractual backup service.

---

## 13. Deliverables and definition of done

**Documents** (concise, accurate, in `docs/`): `README.md` (root), `HUMAN_SETUP.md`, `MANUAL_TEST_CHECKLIST.md`, `ARCHITECTURE.md`, `CRYPTO.md` (the format spec as implemented), `API.md`, `THREAT_MODEL.md`, `RECOVERY.md` (lost D1, lost device, lost passphrase, using the recovery key, running the restore tool), `LIMITS.md` (Telegram, Cloudflare and browser limits, and what to do when hit), `DECISIONS.md`, `DEPENDENCIES.md`, `TESTING_REPORT.md`, and `screenshots/`.

**Done means all of these are true:**

- [ ] `npm run test:all` and `npm run test:e2e` pass; results recorded in `TESTING_REPORT.md`.
- [ ] Live smoke test passed against real Telegram, or clearly marked **NOT TESTED** with reason.
- [ ] App deployed on Cloudflare free tier; URL works; security headers verified.
- [ ] Every requirement S1 to S10 has a test or a documented verification.
- [ ] Round trip verified by hash for: tiny, empty, exact-chunk, multi-chunk and 300 MB files.
- [ ] Recovery verified: wipe local D1, restore from the pinned snapshot, library reappears and unlocks.
- [ ] No secrets in the repo or logs (gitleaks clean).
- [ ] All documents above exist and match the implemented behaviour.
- [ ] Final message to the owner: what was built, how to open it, what was tested and how, what was **not** tested, known limitations, and the 15-minute manual checklist.
