# COMPONENTS & POLISH BRIEF: make TeleVault feel best-in-class

The app works and has (or is getting) a Google-Drive-style layout (`UI_REDESIGN_BRIEF.md`) and email accounts (`ACCOUNTS_BRIEF.md`). This brief is about **craft**: replace hand-rolled, plain UI with **proven, polished, accessible components and motion**, so the whole app feels fast, smooth and deliberately designed, **not like AI-generated output**.

**This brief changes how things look and feel, not what the product does.** Do not change features, crypto, API or data. Everything from the earlier briefs still applies, especially the **security rules (no third-party requests, strict CSP, no secrets in logs)** and the **testing discipline (evidence over claims)**.

---

## 0. For the human

1. Save this file in the project root as `COMPONENTS_POLISH_BRIEF.md`.
2. Optional but very effective: put screenshots or screen recordings of apps whose *feel* you love into `reference/feel/` (Google Drive, Google Photos, iCloud Photos, Dropbox, Linear, Vercel dashboard, Raycast, anything). The agent will study them.
3. Send Gemini in Antigravity:

   > Read `COMPONENTS_POLISH_BRIEF.md` completely, then execute it end to end and autonomously. Use your browser tool to study the component sites listed in it, and copy or install the best components. Keep a log in `PROGRESS.md`. Never claim something works unless you ran it and saw the result. Stop only at the HUMAN GATE in section 10.

---

## 1. The standard we are aiming for

When someone uses the app, it should feel like a product built by a small, obsessive design team:

- **Instant:** every action responds in under 100 ms (optimistic UI). Nothing freezes, even while uploading 50 photos or scrolling 20,000 items.
- **Smooth:** 60 fps motion. Things move *from* where they were *to* where they go (no teleporting). Lists reflow gracefully when items are added or removed.
- **Calm:** motion has a purpose (orientation, feedback, continuity). No decoration for its own sake.
- **Considered:** consistent spacing, type, colour, states, and copy. Every detail (hover, focus, pressed, disabled, loading, empty, error) is designed.
- **Accessible:** keyboard, screen reader, reduced motion, high contrast. Polished and accessible are the same goal.

---

## 2. Hard constraints (non-negotiable)

1. **No third-party requests at runtime.** Every component, font, icon and image is **installed from npm and bundled, or copied into the repo**. No CDN links, no hot-linked demos, no remote images. The "same-origin only" Playwright test must keep passing.
2. **CSP stays strict for scripts** (no `unsafe-inline` scripts, no `unsafe-eval`). Test every library under the real CSP. Some libraries inject `<style>` tags (toast libraries often do). If one needs it, first look for a config or nonce option or an alternative. Only if there is none, you may allow `style-src 'unsafe-inline'` (never for scripts), record the decision and reason in `docs/DECISIONS.md`, and keep the CSP test.
3. **Licences:** only MIT, Apache-2.0, ISC, BSD (and OFL for fonts). **Do not use** anything with "Commons Clause", "free for personal use", "attribution required in UI", or any paid/Pro component. If a component's licence is unclear, do not use it. Keep each file's licence header. Record every third-party component in `docs/COMPONENT_SOURCES.md` (name, source URL, author, licence, date, what you changed).
4. **Security-sensitive code is off limits** (`packages/crypto`, auth, Worker). UI changes must not log or expose secrets, passphrases or keys.
5. **All existing tests stay green** (update selectors where needed, never delete or skip tests).
6. **No regressions in accessibility.** axe-core stays at zero serious/critical violations.

---

## 3. Where to find components ("different sites")

Use your **browser tool** to open these, look at the live demos, read the source, and judge quality yourself. Verify each site still exists and each component's licence before using it. Prefer components that you can **copy into the repo** (so you own and can tune them) or small, well-maintained npm packages.

| Site | Use it for |
|---|---|
| **ui.shadcn.com** (shadcn/ui, built on Radix UI) | The base layer: Button, Dialog, AlertDialog, DropdownMenu, ContextMenu, Tooltip, Tabs, Popover, Command, Sheet, Skeleton, Progress, Checkbox, Select, Switch, Slider, ScrollArea, Breadcrumb, Sidebar, Table |
| **21st.dev** | Community-built polished variations of the above (inputs, upload dropzones, stepper, empty states, file lists). Check each author's licence |
| **magicui.design** | Selected subtle effects: number ticker, blur-fade, animated circular progress, animated list, file-tree style lists |
| **motion-primitives.com** | Small, tasteful motion building blocks (transitions, morphing, text effects, disclosure) |
| **originui.com** (or its successor) | Refined form inputs, OTP input, passwords, buttons |
| **animata.design**, **reactbits.dev**, **ui.aceternity.com** | Inspiration and **occasional** pieces only. **Check licences carefully** (some are Commons Clause or Pro). Most of their effects are showy and make an app look "template-made": use sparingly or not at all |
| **npm packages (below)** | The behaviour-heavy parts (toasts, sheets, command palette, gestures, OTP, number animation) |

If you cannot reach a site, install the equivalent npm packages and build from their docs.

### Core stack to adopt (verify current versions, pin exact versions)

| Need | Package | Notes |
|---|---|---|
| Styling system | **Tailwind CSS v4** with CSS variables mapped to the tokens already defined in `UI_REDESIGN_BRIEF.md` | Keep the Drive look; tokens remain the single source of truth for light/dark |
| Component base | **shadcn/ui** (copied into `src/components/ui`) over **Radix UI** (or Base UI) | Accessible primitives. **Do not leave shadcn defaults untouched** (see section 4) |
| Motion | **`motion`** (successor to Framer Motion). Use `LazyMotion` with the small `domAnimation` feature set and `m` components to keep the bundle light | Layout animations, shared-element transitions, exit animations, springs, gestures |
| Toasts | **Sonner** | Undo actions, promise toasts, stacking. Test under the CSP |
| Sheets/drawers (mobile) | **Vaul** | Bottom sheets with drag-to-dismiss |
| Command palette | **cmdk** (via shadcn Command) | `Ctrl/Cmd+K`: search files, jump to folders, run actions (Upload, New folder, Toggle theme, Lock) |
| OTP input | **input-otp** | Paste support, auto-advance, a11y (for the email code) |
| Number animation | **`@number-flow/react`** | Storage meter, upload percentages and counts animate digit by digit |
| Gestures | **`@use-gesture/react`** | Pinch/drag in the preview, swipe to dismiss |
| Image placeholders | **`thumbhash`** | Tiny blur placeholder (about 25 bytes) stored **inside the encrypted manifest** (zero-knowledge preserved), shown instantly before the real thumbnail decrypts. Add a field to the manifest (reader tolerates its absence) |
| Virtual lists | **`@tanstack/react-virtual`** (already used) | Keep |
| File drop | **`react-dropzone`** or `file-selector` | Folder drops need correct traversal; style it yourself |
| QR code | a small bundled generator (e.g. `qrcode`) | For the Telegram connect screen |
| Utilities | `clsx`, `tailwind-merge`, `class-variance-authority` | shadcn conventions |
| Icons | **One** icon set only (the Material-style set from the UI brief). Do not mix with Lucide etc. | Consistent stroke, size, optical alignment |
| Hotkeys | `react-hotkeys-hook` (optional) | Only if simpler than the existing handler |

Each package must pass the vetting rules in section 7 before being added.

---

## 4. Not looking AI-generated (design craft rules)

Default component libraries and AI output share a recognisable "look". Avoid it on purpose.

**Do not:**
- use purple-to-blue gradients, glowing orbs, aurora backgrounds, particles, sparkles, spotlight/border-beam effects on every card, marquees, bento grids, or glassmorphism everywhere;
- use emoji as icons or decoration ("Welcome back 👋");
- put everything in oversized `rounded-2xl` cards with the same soft shadow;
- leave shadcn defaults (the recognisable grey/black theme, radius, shadows) unchanged;
- centre everything on a gradient card; use lorem ipsum, "Acme", generic stock phrasing, or fake testimonials;
- animate for show (bouncing logos, pulsing buttons, constant shimmer).

**Do:**
- Build a **tight, consistent system**: 4px spacing grid, a defined type scale (use tabular numerals for sizes, dates, counts), 2 to 3 radii only, borders and subtle tint changes instead of heavy shadows, one accent colour used sparingly.
- Keep the **Google-Drive-style structure** from the UI brief (that is the intended identity) and raise the finish: pixel-aligned icons and text, proper truncation (**middle-ellipsis for long file names so the extension stays visible**), correct line heights, hover/pressed/focus/disabled states on every control, visible focus rings, custom scrollbars, selection colour, `cursor` states.
- Offer **density** (Comfortable / Compact) in Settings.
- Write **real microcopy**: short, human, specific ("3 files uploaded to Trip 2026", "Moved to trash · Undo"), consistent tone, no exclamation spam.
- Use **locale-aware formatting** (`Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, `Intl.NumberFormat`) for dates and file sizes.
- Design **empty, loading, error and success states** for every screen with custom, restrained illustrations you draw yourself (inline SVG).
- Small details that signal quality: tab title and favicon reflect upload progress ("Uploading 3 · TeleVault"), the keyboard shortcut shows in tooltips as a styled `kbd`, drag previews show a count badge, buttons show a spinner **inside** the same width (no layout jump), copy buttons morph icon to a check, `prefers-color-scheme` and `prefers-reduced-motion` are respected.
- Optionally upgrade the bundled font to a high-quality **variable** font with a matching bold/medium weight range (bundled locally, OFL/Apache) rather than the default stack. Do not use Inter just because it is the default.

Run an **"AI-ness review"** at the end (section 8): look at every screen and remove anything that feels templated.

---

## 5. Motion system (define once, use everywhere)

Create `src/lib/motion.ts` (and CSS variables) as the only source of motion values:

- **Durations:** instant 80 ms, fast 120 ms, base 200 ms, slow 320 ms. Nothing user-triggered takes over 400 ms.
- **Easing:** standard `cubic-bezier(0.2, 0, 0, 1)`; exit `cubic-bezier(0.4, 0, 1, 1)`.
- **Springs** (for layout and gesture): snappy `{ stiffness: 500, damping: 36 }`, soft `{ stiffness: 300, damping: 30 }`.
- **Stagger:** 20 to 30 ms, capped to the first 8 visible items.
- **Reduced motion:** a single wrapper (`MotionConfig reducedMotion="user"` plus CSS) turns springs and slides into instant or opacity-only changes. Test it.

**Rules**
- Animate only `transform` and `opacity` (and `filter` sparingly). Never animate `width/height/top/left` of large areas.
- Use **layout animations** only on small sets (the upload tray, toolbars, dialogs, breadcrumbs). **Not on every virtualised grid row**; handle grid insert/remove with targeted enter/exit on visible items only.
- Respect scroll: no animations on items that are scrolling in or out of view.
- No continuous looping animations except actual progress/loading indicators.
- Exit animations must finish before the element is removed, and must never block the next interaction.

---

## 6. Interaction catalogue (use a component for each; no plain unstyled behaviour left)

Go through **every** row. If an interaction is not listed but exists in the app, treat it the same way.

### 6.1 Uploading
| Moment | Component and behaviour |
|---|---|
| Drag files over the window | Animated drop overlay (fade and scale in, dashed border, "Drop to upload to **Folder name**"); folder targets under the cursor highlight with a spring |
| Files accepted | Items appear **immediately** in the grid/list as **optimistic placeholder tiles**: local thumbnail (or ThumbHash) with a progress ring overlay; they slide into their sorted position (layout animation on the visible set) |
| Progress | Upload tray (bottom-right, as in the UI brief) built with Motion layout animation: each row has file thumbnail, middle-ellipsis name, circular progress with **NumberFlow** percentage, speed and time left, pause/resume/cancel buttons with press feedback. Collapse/expand animates smoothly |
| Success | Ring turns into a check with a short stroke-draw animation; the tile's overlay fades out; one grouped Sonner toast "12 files uploaded" with a **View** action, not 12 toasts |
| Error | Subtle shake on the row, red state, **Retry** button; the tile shows an error badge |
| Large file or many files | Overall progress in the header (thin top progress bar) and in the tab title, so users can switch tabs |

### 6.2 Loading, refreshing, syncing
| Moment | Component and behaviour |
|---|---|
| First load, folder change, search | **Skeletons shaped exactly like the content** (grid tiles with the real aspect ratio, list rows with name/date/size placeholders) with a gentle single-direction shimmer; zero layout shift when real content replaces them |
| Thumbnails | ThumbHash blur placeholder shows instantly, then crossfades to the decrypted thumbnail (about 150 ms); decoding is async and off-screen items are cancelled |
| Refresh / sync | Small sync indicator in the header (icon rotates while syncing, then shows "Synced just now" updating with `Intl.RelativeTimeFormat`); new items from another device fade in; on mobile a custom **pull-to-refresh** with rubber-band physics |
| Stale session / offline | Non-blocking banner that slides in; actions queue and retry |
| Route/view changes | Short crossfade/slide (View Transitions API as progressive enhancement, Motion `AnimatePresence` fallback), under 200 ms |
| Theme switch | Smooth colour transition without a flash; optional circular-reveal via View Transitions on capable browsers; disabled under reduced motion |

### 6.3 Deleting, trashing, restoring
| Moment | Component and behaviour |
|---|---|
| Move to trash | **Optimistic**: item exits (scale to 0.96 plus fade, 150 ms), neighbours reflow smoothly; Sonner toast "Moved to trash" with **Undo** and a thin countdown; Undo springs the item back into place |
| Bulk delete | Selection toolbar count uses NumberFlow; items exit with a short stagger (first 8 only); one toast "14 items moved to trash · Undo" |
| Delete forever / Empty trash | Radix **AlertDialog** (destructive styling, explicit wording that data is removed from Telegram when possible, focus on the safe button); progress dialog for large deletions with a determinate bar and a cancel option |
| Restore | Item animates out of Trash with a "Restored · Show in folder" toast action |
| Failure | Rolls back with a spring and shows an error toast with **Retry** |

### 6.4 Everything else (non-exhaustive, do all)
- **Sidebar:** the active pill **slides between items** (shared `layoutId`); hover/press states; collapsible with animation; storage meter with NumberFlow.
- **List/Grid toggle, filters chips, sort:** segmented control with sliding indicator; chips animate in/out; menus are Radix `DropdownMenu`.
- **Selection:** circular checkbox scales with a spring; selection toolbar slides in/out; rubber-band selection rectangle with soft fill; shift/ctrl selection feedback.
- **Context menus:** Radix `ContextMenu` with submenus, icons, shortcut hints, full keyboard control.
- **Dialogs** (rename, move, new folder, confirm): Radix `Dialog` with scale-fade and backdrop blur kept subtle; rename can also be **inline** with a smooth morph from text to input.
- **Move to:** folder picker with animated breadcrumb, drag-and-drop move shows a ghost with count badge and highlights valid targets; invalid targets show a gentle "not allowed" cue.
- **Star:** icon pop with a spring and a fill transition.
- **Details panel:** slides in with a spring; the grid reflows without jank.
- **Preview/lightbox:** **shared-element transition** from the tile to the large view (thumbnail morphs to full-size, then crossfades to the decrypted original); drag down to dismiss with velocity; swipe left/right; pinch and double-tap zoom with inertia (`@use-gesture`); next/prev with a slide; keyboard arrows; video controls styled to match; progress ring while decrypting large files. If the source tile is not in the viewport, fall back to a clean fade/scale.
- **Search:** header search with animated focus expansion; results list with highlight of matches; **command palette** (`Ctrl/Cmd+K`) for everything.
- **Mobile:** Vaul **bottom sheets** instead of dropdowns/dialogs; large touch targets; haptic nudge (`navigator.vibrate`, where supported) on long-press select; safe-area aware.
- **Login/Register (from the accounts brief):** step transitions with `AnimatePresence` (slide and fade) and a slim progress indicator; **input-otp** for the email code; animated password strength meter; show/hide toggle; recovery key block with copy-button morph and "I saved it" confirmation; Telegram connect screen with a stepper whose states animate (waiting → bot created → connected), QR code, and calm success animation.
- **Settings:** switches, sliders (density), segmented theme control, sections that expand smoothly.
- **Tooltips:** Radix tooltip with a shared delay group and `kbd`-styled shortcuts.
- **Buttons:** press scale (0.98), focus ring, loading state inside the same width, disabled state that is clearly different.
- **Errors and empty states:** custom inline-SVG illustrations, gentle entrance, helpful copy and a primary action.
- **Copy to clipboard, "saved" confirmations:** icon morphs (copy → check), never a bare alert.

---

## 7. Component vetting rules (apply before adding anything)

A component or package is accepted only if **all** are true:

1. **Licence** allowed (section 2.3), recorded in `docs/COMPONENT_SOURCES.md`.
2. **Accessible:** built on a11y-correct primitives (Radix/Base UI/ARIA patterns), keyboard operable, focus managed, respects reduced motion. You verify this with axe plus a manual keyboard pass.
3. **Maintained:** recent releases or commits (within roughly the last 12 months) and no known critical security advisories (`npm audit`).
4. **Light:** each addition's effect on the bundle is measured; no single dependency adds more than about 15 kB gzip unless lazy-loaded; heavy parts (lightbox, command palette, QR code, ZIP, HEIC decoder, charts) are **code-split** and loaded on demand.
5. **Works under our CSP** and makes **no network requests**.
6. **No `eval`/dynamic code.**
7. **Fits the identity:** after theming it must look like TeleVault, not like the library's demo.

Reject and replace anything that fails. Prefer fewer, better components.

---

## 8. Performance (part of "smooth")

Performance work is not optional. Lag is the number one thing that makes a UI feel cheap.

**Engineering rules**
- **Crypto, hashing, thumbnail generation and ZIP streaming run in Web Workers**, never on the main thread. Use `OffscreenCanvas` where available and transfer buffers, do not copy. The UI thread should only coordinate.
- Thumbnails: decrypt and decode through a **priority queue** (visible items first, cancel when scrolled away, concurrency limit), `decoding="async"`, `content-visibility: auto` for long sections, reserve aspect-ratio boxes to avoid layout shift.
- Keep lists **virtualised**; memoise rows; avoid re-rendering the whole grid on selection or progress ticks (progress updates are throttled to about 10 per second and isolated to the affected row).
- Use `startTransition`/`useDeferredValue` for search, filtering and sorting so typing never stutters.
- Revoke Blob/object URLs, free decrypted buffers, cap in-memory thumbnail cache.
- Code-split by route and by heavy feature. Preload the likely next chunk on hover/idle.
- Avoid layout thrash; no `getBoundingClientRect` in scroll handlers without batching.
- Use `LazyMotion` and avoid animating many elements at once.

**Budgets (measure and record in `docs/PERFORMANCE.md`)**
| Metric | Target |
|---|---|
| Initial JavaScript (gzip) on the main route | ≤ 200 kB (lazy-load everything else) |
| LCP on the drive page (mobile emulation, throttled) | ≤ 2.5 s |
| CLS | ≤ 0.05 |
| INP | ≤ 200 ms |
| Long tasks (> 50 ms) on the main thread while uploading 20 files | none attributable to our code (crypto stays in workers) |
| Scrolling a 20,000-item library with 4× CPU throttle | no sustained frame drops (report p95 frame time) |
| Opening the preview and navigating next/prev | next image visible in ≤ 150 ms when cached |

Enforce the bundle budget in the build (e.g. `size-limit`) so regressions fail `npm run test:all`.

---

## 9. Testing and verification (required)

Add to the existing suite (never remove tests):

**Automated**
- **Playwright interaction tests** for each row in section 6: the end state is correct (item gone, toast with Undo present, Undo restores, progress ring reaches 100%, placeholder tile replaced by the real tile, etc.). Run with animations **enabled** at least once per flow and with them **disabled** for stable assertions.
- **Reduced-motion run** of the main flows (`prefers-reduced-motion: reduce`): nothing slides or bounces; everything still works.
- **Layout-shift test:** measure CLS across load, folder navigation, upload, delete; must meet the budget.
- **Performance tests** using CDP: 4× CPU throttle, long-task observer, frame-time sampling during scripted scroll and during a 20-file upload; assert against the budgets above (with sensible tolerance) and write the numbers to `docs/PERFORMANCE.md`.
- **Bundle size check** (`size-limit`) and a **no-network-from-components** check (same-origin test remains).
- **Accessibility:** axe on all main screens, in both themes, **with menus, dialogs and sheets open**; keyboard-only run-throughs (Tab order, Esc closes, focus returns, no traps); focus rings visible.
- **Touch emulation** run for sheets, long-press selection and pull-to-refresh on a phone viewport (Chromium and WebKit).
- **Visual regression** screenshots (animations disabled) for key screens in light/dark, desktop/phone, and every state: empty, loading skeleton, loaded, selection, upload in progress, error, dialog open, preview.
- A **dev-only design showcase route** (e.g. `#/_design`) listing every component with all its states (default, hover, focus, pressed, disabled, loading, error). It must be **excluded from the production build** (add a test).

**Manual-style verification (do it yourself with your browser tool)**
- Record short screen recordings or frame sequences of: upload, delete + undo, folder navigation, preview open/close, theme switch, mobile sheet. Check for jank, flicker, layout jumps, wrong easing.
- **AI-ness review:** go screen by screen against section 4 and the references in `reference/feel/`. Write `docs/DESIGN_REVIEW.md` listing what looked templated, what you changed, and what remains. Save before/after screenshots in `docs/screenshots/polish/`.

---

## 10. Phases, gate and definition of done

**P0 Audit:** list every screen and interaction in the current app and map each to a component (fill a table in `docs/DESIGN_SYSTEM.md`). Study `reference/feel/` and the component sites. Decide the stack (section 3). Record decisions.
**P1 Foundation:** Tailwind v4 with the existing tokens, shadcn/ui base components themed to the identity (not defaults), motion system, icon set, typography, density, showcase route, bundle budget in the build. Tests still green.
**P2 Workers and performance plumbing:** move crypto/hash/thumbnail/ZIP off the main thread, priority thumbnail queue, ThumbHash, throttled progress.
**P3 Core interactions:** sections 6.1 to 6.3 (upload, loading/refreshing, deleting), then lists, selection, menus, dialogs.
**P4 The rest:** 6.4 (preview, command palette, sheets, accounts flow screens, settings, empty states).
**P5 Verification:** section 9 in full; fix everything it reveals; AI-ness review; screenshots; update `docs/TESTING_REPORT.md`.

**⛔ HUMAN GATE.** Stop after P5. Tell the owner: "Polish complete locally; tests green; screenshots and recordings in `docs/`." Wait for approval before deploying. After approval, `npm run deploy` as usual, then run the post-deploy header/CSP check and the existing live checks. Update `docs/MANUAL_TEST_CHECKLIST.md` with a short "feel check" (upload, delete and undo, navigate, preview, theme switch, phone).

**Definition of done**
- [ ] Every interaction in section 6 uses a proper component with considered motion and states; no plain unstyled leftovers.
- [ ] No third-party runtime requests; CSP tests pass; licences recorded in `COMPONENT_SOURCES.md`.
- [ ] Performance budgets met and recorded; crypto and heavy work off the main thread.
- [ ] Reduced-motion, keyboard, screen-reader and touch behaviours verified; axe clean in both themes.
- [ ] Visual regression, interaction, layout-shift and performance tests all green on Chromium and WebKit.
- [ ] `docs/DESIGN_SYSTEM.md`, `COMPONENT_SOURCES.md`, `PERFORMANCE.md`, `DESIGN_REVIEW.md` written; screenshots saved.
- [ ] Final message lists what changed, measured numbers, what was **not** tested, and any deviations.
