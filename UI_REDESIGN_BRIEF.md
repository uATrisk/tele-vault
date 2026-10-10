# UI REDESIGN BRIEF: Google-Drive-style interface for TeleVault

The app already works (upload, encryption, grid, viewer, download, trash, favorites, deploy). **Do not rebuild it.** Replace the current UI with an interface that looks and behaves like **Google Drive on the web**, add the few features that interface implies (folders, rename, move, details panel), and keep every existing security property and test green.

---

## 0. For the human

1. Save this file in the project root as `UI_REDESIGN_BRIEF.md`.
2. **Strongly recommended:** make a folder `reference/` in the project root and drop in 5 to 8 screenshots of **your own Google Drive** (light mode, plus dark if you use it): My Drive in grid view, in list view, a right-click menu, the New button menu, a file selected, the upload progress card, the file preview, the details panel, and the Trash page. The agent treats these as the visual source of truth.
3. Send the agent:

   > Read `UI_REDESIGN_BRIEF.md` completely, then execute it end to end and autonomously. Keep a log in `PROGRESS.md`. Do not claim anything works unless you ran it and saw the result. Stop only at the HUMAN GATE in section 11.

---

## 1. Goal and ground rules

**Goal:** someone who knows Google Drive should feel at home in 5 seconds. Same layout, proportions, colours, iconography style, interaction patterns, menus, and micro-interactions.

**Hard rules**

1. **Everything from `PROJECT_BRIEF.md` still applies**, especially S1 to S10. In particular: **no third-party requests** (fonts, icons, scripts, images all bundled and served same-origin), strict CSP still holds, no inline scripts, no secrets in logs.
2. **Do not copy Google's branding or proprietary assets.** Do not use the Google or Drive logos or name, the "Google Sans" font, or Google's proprietary icons or illustrations. Replicate the **layout, spacing, colours and behaviour**, but keep the **TeleVault name and the existing shield logo**.
3. **Fonts and icons:** use a bundled, permissively licensed font that looks close to Google's UI (Roboto via `@fontsource/roboto`, or similar) and a bundled Material-style icon set (for example `@material-symbols/svg-400` or `material-design-icons`, Apache-2.0). Verify each licence and add it to `docs/DEPENDENCIES.md`. Self-host; no CDN.
4. **Do not lose or break existing data.** The owner already has real encrypted items in production. Old manifests have no folder information; they must keep loading and appear in the root folder. Add a test with fixture manifests in the **old format**.
5. **Never run anything that resets production D1 or deletes messages in the real Telegram channel.** Test only against local D1 + mock Telegram, or the ephemeral-vault live smoke test.
6. **Reference screenshots beat this document.** If `reference/` exists, study it first and match it. Where this document and a screenshot disagree, follow the screenshot and note it in `docs/DECISIONS.md`. Colour and size values below are good defaults, not gospel.
7. No placeholder UI. Every button and menu item visible must work, or be removed.

---

## 2. Design tokens (CSS variables; support light and dark)

Light is the **default**. Follow `prefers-color-scheme` on first visit, with a Theme setting (Light / Dark / System).

| Token | Light | Dark |
|---|---|---|
| `--bg-page` (behind panels) | `#F8FAFD` | `#131314` |
| `--bg-surface` (main panel, dialogs) | `#FFFFFF` | `#1E1F20` |
| `--bg-search` | `#E9EEF6` | `#282A2C` |
| `--bg-card` (folder/file cards) | `#F0F4F9` | `#282A2C` |
| `--bg-selected` | `#C2E7FF` | `#004A77` |
| `--bg-hover` | `rgba(31,31,31,.06)` | `rgba(227,227,227,.08)` |
| `--text-primary` | `#1F1F1F` | `#E3E3E3` |
| `--text-secondary` | `#444746` | `#C4C7C5` |
| `--text-on-selected` | `#001D35` | `#C2E7FF` |
| `--divider` | `#E1E3E1` | `#444746` |
| `--accent` | `#0B57D0` | `#A8C7FA` |
| `--danger` | `#B3261E` | `#F2B8B5` |

Typography: body 14px/20px, weight 400. File names 14px weight 500. Page title 22px/28px. Section labels ("Folders", "Files") 14px weight 500. Sidebar items 14px weight 500.
Shape: main panel radius 16px; cards radius 12px; buttons and chips fully rounded or 8px as in Drive; dialogs radius 28px.
Motion: 150 to 200 ms ease for hover, selection, menu open; subtle ripple on buttons; respect `prefers-reduced-motion`.
Elevation: menus and dialogs use soft shadows; no heavy borders.

File-type icon colours (small icon on cards and list rows): folder grey `#5F6368`, images red `#D93025`, video red, PDF red, audio and others grey, archives grey, generic file grey-blue.

---

## 3. Layout (desktop ≥ 1024 px)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ▣ TeleVault   [ 🔍 Search in My Drive              ⚙︎ filters ]      ⚙  🔒  (A) │  header 64px, --bg-page
├────────────┬────────────────────────────────────────────────────────────────┤
│ [+ New]    │ ┌────────────────────────────────────────────────────────────┐ │
│            │ │ My Drive ▾                              ☰/▦ toggle   ⓘ     │ │
│ ▸ My Drive │ │ [Type ▾] [Modified ▾]                                      │ │
│ ▸ Photos   │ │                                                            │ │
│ ▸ Recent   │ │ Folders                                                    │ │
│ ▸ Starred  │ │ [📁 Trip] [📁 Documents] …                                  │ │
│ ▸ Trash    │ │ Files                                                      │ │
│            │ │ [card][card][card][card]…                                  │ │
│ ━━ storage │ └────────────────────────────────────────────────────────────┘ │
└────────────┴────────────────────────────────────────────────────────────────┘
  sidebar 256px, --bg-page          main panel: --bg-surface, radius 16, 16px margin right/bottom
```

### 3.1 Header (64 px, background `--bg-page`)

- Left: shield logo + "TeleVault" wordmark (22px, weight 500).
- Search pill: 720px max width, **48px tall, fully rounded**, `--bg-search`, search icon left, placeholder "Search in My Drive", a filters/tune icon on the right inside the pill. On focus: background becomes `--bg-surface` with elevation. Typing searches **file and folder names** across the whole drive and shows a results page ("Search results"). `/` focuses the search box.
- Right side: Settings (gear) icon button, Lock button, and a circular avatar with the letter "T" that opens an account-style menu (Settings, Theme, Lock, Log out).
- Icon buttons are 40px circles with hover and ripple.

### 3.2 Sidebar (256 px, background `--bg-page`)

- **New** button at top: about 56px tall, rounded 16px, elevated, plus icon, label "New". Opens the New menu (see 5.4).
- Nav items, 40px tall, pill-shaped (radius 20px), icon 20px at left, label to the right: **My Drive** (folder tree view of files), **Photos** (timeline), **Recent**, **Starred**, **Trash**. Selected item uses `--bg-selected` and `--text-on-selected`. Hover uses `--bg-hover`.
- Separator, then **Storage** block: cloud icon, "Storage" label, thin progress bar, text "X GB used". Since Telegram storage is effectively unlimited, show used bytes only, with a small note "Stored in your private Telegram channel". No upgrade buttons. Source: `GET /api/stats`.

### 3.3 Main panel

- Rounded white (`--bg-surface`) container filling the remaining space, scrolls internally. Header row inside it is sticky.
- **Title row:** breadcrumb. At the root it shows "My Drive ▾". Inside folders: `My Drive > Trip > 2026` with each segment clickable and the last one in bold with a dropdown arrow (menu: New folder, Upload file, Upload folder, Download, Rename, Move to trash, Details). Right side: **List / Grid segmented toggle** (the active one shows a check mark) and a **Details (ⓘ)** toggle.
- **Filter chips row:** `Type ▾` (Photos & images, Videos, PDFs, Documents, Audio, Archives, Folders), `Modified ▾` (Today, Last 7 days, Last 30 days, This year, Last year). Active chip is filled with `--bg-selected` and shows a ✕ to clear. Chips combine with the current folder or search.
- **Selection mode:** when 1+ items are selected, the title row is replaced by a pill-shaped toolbar with light-blue background: ✕ (clear), "N selected", then icon buttons: Download, Move to, Add to starred, Move to trash, and a ⋮ overflow (Rename if exactly one, Details). Press Esc to clear.

---

## 4. Views

### 4.1 My Drive (default, folder view)

- **Grid view** (default): section "Folders" (compact cards, 48px tall, 12px radius, `--bg-card`, folder icon + name + ⋮ on hover; minimum width about 240px, responsive columns) then section "Files" (cards).
- **File card:** minimum width about 200px, responsive grid with 16px gaps. Top: thumbnail area (about 4:3, `object-fit: cover`, rounded 8px inside the card, with a centered large type icon when no thumbnail). Bottom: footer 48px with small type icon, file name (ellipsis, weight 500), ⋮ button on hover. A checkbox appears top-left on hover; checked state fills `--bg-selected`. Videos show a small duration badge and play icon on the thumbnail.
- **List view:** table with sticky header: checkbox, **Name** (type icon + name), **Last modified**, **File size**, ⋮. Header cells are sortable (click toggles ascending and descending with arrow). Rows 48px, 1px `--divider`, hover `--bg-hover`, selected `--bg-selected`. Row hover reveals quick actions (Download, Rename, Star, Trash).
- **Sort menu** in grid view too (a small "Name ↑" control near the toggle). Folders always listed before files.
- The view mode, sort and theme persist (localStorage; these are non-sensitive preferences).

### 4.2 Photos

The existing month-grouped timeline, restyled to match: sticky month headings, square tiles with 4px gaps, hover shows a circular checkbox top-left, click opens the preview, multi-select behaves as in 5.1. Shows **all photos and videos regardless of folder**, newest first by EXIF or modified date. Virtualised.

### 4.3 Recent

Files sorted by `uploadedAt` descending (last 30 days or last 200 files), grouped "Today / Yesterday / Earlier this week / Earlier this month / Older". List or grid as chosen.

### 4.4 Starred

Everything starred (reuse the existing favourite flag, rename the UI wording to "Starred", star icon).

### 4.5 Trash

- Banner at top: "Items in trash will be deleted forever after 30 days." with an **Empty trash** button (confirmation dialog).
- Items listed in list or grid; context menu: Restore, Delete forever. Toolbar on selection: Restore, Delete forever.
- Empty state with simple original illustration: "Nothing in trash".

### 4.6 Search results

Header "Search results for 'xyz'", list view by default with an added "Location" column (folder path). Chips apply.

---

## 5. Interactions

### 5.1 Selection

- Click selects one. **Ctrl/Cmd+click** toggles. **Shift+click** selects a range. Click on the checkbox toggles without clearing others. **Ctrl/Cmd+A** selects all in view. Click on empty space clears. **Double-click** or Enter opens (folder → navigate, file → preview). Space also opens the preview.
- Grid view supports **drag-to-select (rubber band)** on empty space. Mark this as lower priority; do it after everything else works.
- Mobile: long-press enters selection mode.

### 5.2 Context menu (right-click, and the ⋮ button)

Items with icons, dividers as in Drive. For a file: **Preview, Download, Rename, Move to, Add to starred / Remove from starred, Details, Move to trash**. For a folder: **Open, Download (as ZIP), Rename, Move to, Add to starred, Details, Move to trash**. For empty space: **New folder, File upload, Folder upload**. In Trash: **Restore, Delete forever**. Keyboard accessible (arrow keys, Esc closes, focus returns).

### 5.3 Dialogs (rounded 28px, same style as Drive)

- **Rename:** single text field prefilled with the name (select name without the extension), OK / Cancel, Enter submits.
- **Move to:** a folder picker dialog with a breadcrumb and a folder list, "New folder" button inside, "Move" button. Prevent moving a folder into itself or its own descendants.
- **New folder:** text field "Untitled folder", Create.
- **Confirm delete forever / empty trash:** clear wording that it also deletes the data from Telegram.

### 5.4 New menu

New folder; separator; **File upload**; **Folder upload**. (Nothing else.)

### 5.5 Details panel (right, 360px, toggled by ⓘ, also via context menu)

Closed by default. When open, the main grid shrinks. With nothing selected it shows the current folder's details. With one item: large preview, name, then sections: Type, Size, Location, Modified, Uploaded, Dimensions or duration (media), and an **Encryption** line: "End-to-end encrypted. Stored as N encrypted parts in Telegram." With several items: "N items selected" and combined size.

### 5.6 Preview (full-screen, like Drive's viewer)

Dark translucent overlay. Top bar: ← back (closes), type icon + file name, and on the right Download, Details, Star, Move to trash, ⋮. Centre: image (fit, wheel/pinch zoom, double-click to zoom, drag to pan) or video (own controls). Large left/right arrows at the edges to move through the current list (keyboard ← →). Bottom-centre zoom controls and a counter "3 of 42". **Esc** closes. For non-previewable files: large icon, name, size, and a **Download** button. Show a decrypting progress indicator for large files.

### 5.7 Drag and drop upload

Dragging files or folders over the window shows a full-panel overlay: dashed blue border, "Drop files to upload to **<current folder name>**". Drop uploads into the current folder. Dragging cards **onto folder cards or breadcrumb segments moves them** (drag-and-drop move), with a ghost preview showing the count.

### 5.8 Upload progress card

Bottom-right, fixed, 360px wide, rounded 8px top corners, elevated.
- Header (dark): "Uploading 3 items" / "Uploading 1 item" with minimise (chevron) and close (✕, confirms if still uploading). When finished: "3 uploads complete" with a check.
- Body (collapsible): one row per file with type icon, name (ellipsis), and on the right a circular progress ring that turns into a green check when done, or a red error icon with a **Retry** action. A **Cancel** link appears while uploading. Under the header, a thin overall progress line.
- Keep all existing behaviour: queue, pause/resume, resumable after reload, dedupe notice (a "Skipped: already in your drive" state), concurrency limits.

### 5.9 Snackbar

Bottom-left dark snackbar for actions: "Moved to trash" with **Undo**, "Moved to 'Trip'", "1 item restored", "Link copied" (not needed), errors. Auto-dismiss after 5 s.

### 5.10 Keyboard shortcuts

`/` search · `Esc` clear selection or close · `Enter` or `Space` open or preview · `Delete` or `Backspace` move to trash · `Ctrl/Cmd+A` select all · `Shift+arrows` extend selection · arrow keys move focus across items · `F2` rename · `?` shows a shortcuts dialog. Do not hijack browser shortcuts.

### 5.11 Empty states and errors

Friendly, simple original illustrations (inline SVG you draw yourself) and short text for: empty My Drive ("Drop files here or use the New button"), empty folder, empty Starred, no search results, empty Recent, offline, session expired, wrong passphrase (unlock screen keeps its current logic but restyled as a Drive-like centred card), Telegram down, 409 conflict ("This item changed on another device. Reloaded.").

---

## 6. Setup, login and unlock screens

Restyle to match: centred card on `--bg-page`, 28px radius, logo on top, clear headings, primary filled blue button, tonal secondary. Keep all existing logic: access-token login, setup wizard (doctor results, passphrase strength meter, recovery key with forced confirmation), unlock, lock.

---

## 7. Responsive behaviour

| Width | Behaviour |
|---|---|
| ≥ 1024 px | Full layout as above. Details panel docks on the right. |
| 600–1023 px | Sidebar collapses to a 72px icon rail with labels hidden (tooltips on hover); the New button becomes an icon-only rounded button. Details panel opens as an overlay. |
| < 600 px | Hamburger opens a sidebar drawer. Header is the search pill alone, with hamburger and avatar. Default to list view. A circular **"+" floating action button** (bottom-right) opens the New menu. Bottom sheet instead of dropdown menus. Larger touch targets (min 44px). The upload card docks full-width at the bottom. |

Must work on iPhone Safari and Android Chrome without horizontal scroll. Respect safe-area insets.

---

## 8. Data-model and backend changes (keep them minimal)

Folders, rename, move, and details panel need small changes. **Do not weaken zero-knowledge:** all new fields live inside the **encrypted manifest**.

1. Manifest version bumps to `v: 2` (reader must still accept `v: 1`):
   - `kind`: `"file"` (default if missing) or `"folder"`
   - `parentId`: folder item ID or `null` for root (missing means root)
   - A folder has `name`, `parentId`, `uploadedAt`, `starred`, `trashed`, and **zero chunks**.
   - Rename `favorite` to `starred` in the UI wording only; keep reading the old `favorite` field.
2. The Worker must accept **items with zero chunks** (folders) on commit, with no thumbnail. Keep validation strict otherwise. Update `docs/API.md`.
3. **Rename and move** = `PUT /api/items/:id` with the new encrypted manifest and `rev` (optimistic concurrency already exists).
4. **Trashing a folder** trashes the folder and everything inside it (descendants inherit; show them inside the trashed folder in Trash and restore together). **Deleting a folder forever** deletes all descendants (and their Telegram messages) through the existing delete endpoint. Compute the subtree on the client from the decrypted index and send deletes in a safe order with progress and the ability to resume.
5. **Folder download** = ZIP of the subtree preserving structure, streamed client-side.
6. **Folder upload** (`webkitdirectory`, and dropped folders) recreates the directory structure as folder items under the current folder, then uploads files into them.
7. Routing: hash routes such as `#/drive`, `#/drive/<folderId>`, `#/photos`, `#/recent`, `#/starred`, `#/trash`, `#/search?q=`. Browser back/forward works. IDs are random hex; never put names in URLs.
8. Duplicate names are allowed within a folder (Drive does this), but when uploading a name that already exists in the target folder, append "(1)", "(2)" to the **new** item's name.
9. The storage meter uses `/api/stats`. Extend it only if needed.

---

## 9. Testing and visual verification (required)

Update existing tests for the new UI, then add:

**Playwright (Chromium + WebKit + phone viewport)**
- Navigation between My Drive, Photos, Recent, Starred, Trash, with URLs and back/forward.
- Create folder, rename, move (dialog and drag-and-drop), star, trash, restore, delete forever, **including nested folders and subtree trash/restore/delete**.
- Folder upload recreates the structure. Dropped-folder upload works. Duplicate-name suffixing works.
- Grid/list toggle, sort (name, modified, size), type and modified chips, search (inside the whole drive), all persist or reset as designed.
- Selection: click, ctrl-click, shift-click, select-all, Esc, selection toolbar actions.
- Context menu for file, folder, empty space, trash. Keyboard operation of the menu.
- Preview: open, next/previous, zoom, Esc, video playback, non-previewable fallback, download from preview verifies the hash.
- Details panel content for file, folder, multi-select.
- Drag-and-drop overlay appears, upload goes to the current folder.
- Upload card states: uploading, complete, error plus retry, minimise, cancel, skipped duplicate. Resume after reload still works.
- Undo snackbar for trash and move.
- Light and dark theme switch, theme persists.
- Backward compatibility: load **v1 manifests** (fixtures), they appear in My Drive root, can be moved, renamed, trashed.
- Keyboard shortcuts.
- **Regression:** the existing "Telegram sees nothing" test, the "same-origin only" test (now also proving fonts and icons are bundled), CSP test, and axe-core (zero serious or critical violations on every main screen, in both themes) must all still pass.
- Performance: 20,000 fake items, both grid and list stay smooth (virtualised), folder navigation under 150 ms after the index is in memory.

**Worker/unit**
- Zero-chunk item commit, folder subtree helpers (cycle prevention when moving, descendants, trash inheritance, restore), manifest v1 to v2 reading, name-suffix logic, sorting.

**Visual verification (do this yourself with your browser tool)**
- Screenshot every screen and state at **1440×900, 1024×768 and 390×844**, in light and dark, and compare against `reference/` (or against section 3 to 5 if no screenshots). List differences, fix them, repeat until close. Save the final set to `docs/screenshots/ui-v2/` and write a short `docs/UI_REVIEW.md` listing what was compared and any known deviations.

Update `docs/TESTING_REPORT.md` with real results. Mark anything not tested as **NOT TESTED**.

---

## 10. Phases

1. **P0 Recon:** read the current frontend, list all screens and components, read `reference/`, write the plan and any decisions in `docs/DECISIONS.md`. Add a **design-system layer first** (tokens, typography, icon component, Button, IconButton, Chip, Menu, Dialog, Snackbar, Tooltip, Checkbox) with a simple internal showcase page for visual checking.
2. **P1 Shell:** header, sidebar, main panel, routing, theme, responsive behaviour, all with the existing data.
3. **P2 Views:** My Drive grid and list, Photos, Recent, Starred, Trash, search, chips, sort.
4. **P3 Interactions:** selection, context menu, dialogs, details panel, preview, drag and drop, upload card, snackbar, shortcuts.
5. **P4 Folders and data model:** section 8, with the v1 compatibility fixtures first.
6. **P5 Polish:** empty states, mobile, rubber-band selection, motion, accessibility.
7. **P6 Verification:** section 9 in full; all tests green on Chromium and WebKit; screenshots saved.
8. **HUMAN GATE (below), then deploy.**

Each phase must leave `npm run test:all` and `npm run test:e2e` green before the next begins (update tests alongside code, never skip them).

---

## 11. Human gate, deployment and handover

**⛔ Stop after P6** and tell the owner: "UI redesign complete locally; tests green; screenshots in `docs/screenshots/ui-v2/`." Wait for approval to deploy.

After approval:
1. Run `npm run deploy` (a normal update, **no data reset**; the owner's existing items must still appear).
2. Run the post-deploy health check and verify the security headers on the deployed URL.
3. Run `npm run live-smoke` again (ephemeral vault, cleans up after itself).
4. Update `docs/MANUAL_TEST_CHECKLIST.md` for the new UI (about 10 minutes): open the site, confirm the existing photo still shows, create a folder, upload 3 photos into it by drag and drop, switch grid and list, rename, move, star, trash and undo, open the preview and the details panel, download one, lock and unlock, check on the phone.

**Definition of done**

- [ ] UI visually matches Google Drive's layout and behaviour (screenshots and `UI_REVIEW.md` as proof).
- [ ] All items in sections 3 to 8 implemented, with no dead buttons.
- [ ] All tests green on Chromium and WebKit; axe clean in both themes; same-origin and CSP tests pass.
- [ ] Old (v1) items still load and work; no data lost in production after deploy.
- [ ] No third-party requests; fonts and icons bundled; licences recorded.
- [ ] Docs updated: `ARCHITECTURE.md`, `CRYPTO.md` (manifest v2), `API.md`, `TESTING_REPORT.md`, `MANUAL_TEST_CHECKLIST.md`.
- [ ] Final message lists what changed, what was tested, what was **not** tested, and known deviations from Google Drive.
