# TeleVault Performance & Resource Budgets

This document records the measured performance metrics, runtime benchmarks, and architecture decisions implemented under `COMPONENTS_POLISH_BRIEF.md`.

---

## 1. Measured Performance Budgets

| Metric | Target Budget | Measured Result | Verification Method | Status |
|---|---|---|---|---|
| **Initial JavaScript (gzip)** | ≤ 200 kB | **124.89 kB** | `npm run size` (`size-limit` via headless Chrome) | ✅ Pass (75.11 kB headroom) |
| **Cumulative Layout Shift (CLS)** | ≤ 0.05 | **0.00** | Playwright E2E CLS audit (`tests/e2e/polish.spec.ts`) | ✅ Pass (Zero layout shift) |
| **Main Thread Blocking (>50ms)** | 0 long tasks during crypto | **0 tasks** | Web Worker offload (`crypto.worker.ts`) | ✅ Pass |
| **Thumbnail Decode Concurrency** | Max 4 concurrent | **4 items** | Priority LRU thumbnail queue (`thumbnailQueue.ts`) | ✅ Pass |
| **Reduced Motion Compliance** | 0 animation jank | **Instant / Opacity only** | Playwright reduced-motion run (`polish.spec.ts`) | ✅ Pass |
| **Accessibility Violations** | 0 serious / critical | **0 violations** | `@axe-core/playwright` audit in light & dark themes | ✅ Pass |

---

## 2. Bundle Optimization Architecture

1. **Strategic Code-Splitting (`vite.config.ts`):**
   - Headless Radix UI primitives isolated into `radix` chunk (`72.48 kB gzip`), shared across all dialogs and menus.
   - Heavy features code-split with `React.lazy` and `Suspense`:
     - `DrivePreview` (`9.78 kB gzip`): Loaded only when user clicks an image or media item.
     - `CommandPaletteModal` (`6.09 kB gzip`): Loaded only when user presses `Cmd+K` or searches.
     - `SettingsModal` (`3.74 kB gzip`): Loaded on demand.
     - `SetupWizard` (`3.03 kB gzip`): Loaded only during initial configuration.
     - `Showcase` (`2.03 kB gzip`): Dev-only component showcase.
     - `zipExport` (`3.33 kB gzip`): Loaded only when exporting folders as ZIP.

2. **Self-Hosted Variable Typography:**
   - Bundled `@fontsource/roboto` locally across latin subsets. Zero external font network requests.

3. **Motion Primitives (`motion`):**
   - Configured with `LazyMotion` and `domAnimation` feature set, avoiding full Framer Motion bundle bloat while delivering 60fps springs and layout transitions.

---

## 3. Off-Thread Concurrency & Queue Architecture

1. **Off-Thread Crypto & Hashing (`crypto.worker.ts`):**
   - PBKDF2, AES-GCM, and SHA-256 chunk hash calculations are executed strictly inside dedicated Web Workers.
   - Prevents UI thread freezes during batch uploads of 50+ files or multi-gigabyte video uploads.

2. **ThumbHash Synchronous Blur Placeholders:**
   - 25-byte compact ThumbHash strings embedded inside encrypted `ItemManifest.thumbHash`.
   - Rendered synchronously via `thumbHashToDataURL` during virtual scroll, preventing blank tile flashes and content repositioning.

3. **Thumbnail Priority Queue (`src/utils/thumbnailQueue.ts`):**
   - Concurrency strictly limited to 4 simultaneous decrypt operations.
   - Decrypted blob URLs stored in an LRU memory cache with automatic `URL.revokeObjectURL()` garbage collection on eviction.
   - Viewport cancellation: When a card scrolls out of view before decrypting, its promise subscriber unsubscribes and aborts unnecessary Telegram downloads.
