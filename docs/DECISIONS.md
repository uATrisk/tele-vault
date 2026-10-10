# TeleVault - Architecture & Platform Decisions

This document records platform verification results, architectural choices, alternatives considered, and trade-offs.

---

## 1. Platform Verification (Phase 0)

| Fact / Assumption | Status | Notes & Impact |
|---|---|---|
| **Bot API `sendDocument` limit: 50 MB** | **VERIFIED** | Telegram Bot API allows uploading documents up to 50 MB via `sendDocument`. |
| **Bot API `getFile` download limit: 20 MB** | **VERIFIED** | Telegram public Bot API servers strictly cap `getFile` file download to 20 MB. Any chunk must be strictly < 20 MB. |
| **Bots cannot read channel history** | **VERIFIED** | Standard Telegram Bot API cannot list or read messages in a channel. D1 database is required for index; pinned encrypted snapshot in channel provides disaster recovery. |
| **`getChat` returns `pinned_message` for a channel** | **VERIFIED** | Calling `getChat(chat_id)` returns a `Chat` object containing the latest `pinned_message`, allowing recovery tool to find the snapshot head. |
| **Channel pinning right is `can_edit_messages`** | **VERIFIED** | In channels, bots require `can_edit_messages` ("Edit messages of others") to pin messages. (`can_pin_messages` only applies to groups). |
| **Per-chat send limits: ~1 msg/s with 429 backoff** | **VERIFIED** | Telegram enforces rate limits per chat. On HTTP 429, response provides `parameters.retry_after`. Worker and client queue must respect `retry_after`. |
| **Workers Free tier: 100k req/day, 10ms CPU, 128 MB RAM** | **VERIFIED** | Strict 10ms CPU time limit per request on Free tier. Worker must stream request/response bodies without parsing or buffering chunks into memory. |
| **D1 Free tier: 5 GB total, 500 MB / DB, 5M reads/day, 100k writes/day** | **VERIFIED** | Fits thousands of media manifests and thumbnails comfortably. Thumbnails budgeted at ≤16 KB each. |
| **Cron Triggers on Free tier** | **VERIFIED** | Up to 3 Cron Triggers supported on Free plan for daily snapshot and garbage collection. |
| **Workers Static Assets (same origin)** | **VERIFIED** | Modern Cloudflare Workers supports Static Assets (`assets = { directory = "..." }`), serving Vite SPA and API from the exact same domain without CORS. |
| **WebCrypto & Browser Streams compatibility** | **VERIFIED** | AES-GCM, PBKDF2, HKDF, `File.slice`, and `CompressionStream` are standard across Safari, Chrome, Firefox, and Edge. |
| **`showSaveFilePicker` is Chromium-only** | **VERIFIED** | WebKit (Safari) and Gecko (Firefox) do not support File System Access API. A robust Blob / streaming fallback is required. |

---

## 2. Technical Decisions & Trade-Offs

### Decision 1: Chunk Size
- **Choice:** `CHUNK_PLAIN = 16 MiB` (16,777,216 bytes). Ciphertext + IV (12B) + Tag (16B) = 16,777,244 bytes (~16.00003 MB), well below Telegram's 20 MB download limit.
- **Alternatives Considered:**
  - 19 MB: Dangerously close to 20,000,000 bytes. Rounding or Telegram metadata could reject it.
  - 8 MB: Safe, but doubles chunk count and Telegram API requests for large files.
- **Fallback Plan:** If free-tier Workers CPU limit (10ms) is ever breached during streaming on real network, fallback gracefully to 8 MiB or 4 MiB as per Section 11.2.E.

### Decision 2: Monorepo & Workspaces
- **Choice:** npm workspaces with Node 20+ (Node 24 active), TypeScript `strict` mode throughout.
- **Alternatives Considered:** pnpm / yarn. npm is native to Node, universally available, zero setup friction.

### Decision 3: Backend Framework
- **Choice:** Hono on Cloudflare Workers.
- **Alternatives Considered:** Raw `fetch` handler, Itty-router.
- **Reason:** Hono is ultralight (<15KB), has zero overhead, first-class Cloudflare Workers / D1 bindings support, built-in streaming helpers, and strict TypeScript types.

### Decision 4: Frontend Framework & UI
- **Choice:** React 19 / 18 + Vite + Tailwind CSS.
- **Alternatives Considered:** Svelte, Vue, vanilla JS.
- **Reason:** React provides rich component ecosystem for virtualized timeline, gesture/lightbox handling, robust state management, and strict TypeScript integration. Everything bundled locally with zero external CDN dependencies (S5 compliance).

### Decision 5: Client-Side Streaming ZIP
- **Choice:** `client-zip` (MIT licensed).
- **Alternatives Considered:** JSZip (buffers entire archive in memory, crashes on large files).
- **Reason:** `client-zip` generates ZIP archives as a `ReadableStream`, consuming minimal memory even for gigabytes of downloads.

### Decision 6: Virtualization
- **Choice:** `@tanstack/react-virtual`.
- **Alternatives Considered:** `react-window`, custom virtual scroller.
- **Reason:** Headless, highly performant, handles 50,000+ items smoothly with dynamic item sizes.
