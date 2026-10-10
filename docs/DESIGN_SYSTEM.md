# TeleVault Design System & Component Architecture

This document defines the visual, interactive, and motion system for TeleVault, built to feel like an obsessive, human-crafted desktop cloud storage suite (inspired by Google Drive, macOS Finder, and Linear), completely avoiding generic AI templates or bloated marketing effects.

---

## 1. System Foundations

### 1.1 Spacing & Grid
- **Base Grid:** Strict 4px incremental scale (`4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`, `40px`, `48px`, `64px`).
- **Touch / Click Targets:** Minimum 44px (`h-11`) for primary actions on mobile and compact menus; 40px (`h-10`) on desktop tables.
- **Margins & Gutters:** 16px page margins, 12px panel gaps, 8px item gap.

### 1.2 Radii & Elevation
- **Radii System:** Strictly 3 core radii:
  - Small (`rounded-lg` / 8px): Buttons, badges, filter chips, input fields.
  - Medium (`rounded-xl` / 12px): Menu items, cards, list rows, popover panels.
  - Large (`rounded-2xl` / 16px–24px): Dialogs, command palette, main view canvas container, mobile bottom sheets.
  - Pill (`rounded-full`): Search bar, floating action buttons, toggle switches, avatars.
- **Borders over Heavy Shadows:**
  - Standard container: 1px subtle border (`border-divider/30` or `border-divider/50`) with light tint changes.
  - Elevated surfaces: Controlled elevation (`shadow-menu`, `shadow-dialog`, `shadow-fab`). No harsh, giant black drop shadows or fuzzy blur gradients.

### 1.3 Typography & Numerals
- **Typeface Stack:** System Google Sans / Roboto / San Francisco (`font-sans`), bundled locally.
- **Tabular Numerals:** `font-mono` / `tabular-nums` applied to all file sizes, dates, timestamps, percentages, and counters to eliminate layout jitter during progress updates.
- **Middle-Ellipsis Truncation:** Long file names retain their file extensions (`vacation-in-switzerla...2026.png`).

### 1.4 Density Modes
- **Comfortable (Default):** 44px row heights, 200px grid tiles, generous 16px padding.
- **Compact:** 36px row heights, 160px grid tiles, 10px padding for power users browsing thousands of items.

---

## 2. Interaction & Component Mapping Catalogue

| Surface / Flow | Current Plain Implementation | Polished Component & Architecture | Motion & Behavior |
|---|---|---|---|
| **Global Header** | Plain flex container, static inputs | Google Drive pill search with animated focus expansion, Cmd+K trigger, integrated `ThemeSwitch`, clean account popover | Search expands from 480px to 680px with cubic bezier; ThemeSwitch knob glides with spring |
| **Command Palette** | None | `cmdk` (Radix Command) triggered by `Cmd+K` / `Ctrl+K` | Overlay fade-in (120ms), quick file search, jump to folder, vault locks/settings |
| **Theme Switching** | Static class toggle | `ThemeSwitch` with active sun/moon stations + CSS View Transitions / smooth crossfade | Circular or crossfade reveal, no color flash, respects `prefers-reduced-motion` |
| **Sidebar Navigation** | Static button list | Sliding active indicator pill using `motion` `layoutId="activeNav"` | Pill glides between My Drive, Photos, Recent, Starred, Trash; Storage meter animated with `NumberFlow` |
| **File Dropping** | Raw dragover listeners | Animated full-window Drop Overlay with dashed border and folder spring targets | Scale 0.98 to 1.0 on dragenter; spring bounce on folder hover target |
| **Uploading Tiles** | Deferred render on finish | **Optimistic Placeholder Tiles** in grid with ThumbHash blur + SVG circular progress ring | Real-time percent counter with `NumberFlow`, stroke-dashoffset transition, morphs to checkmark on success |
| **Upload Tray** | Hand-rolled fixed card | `motion` collapsible tray with layout animation, middle-ellipsis file names, speed & ETA | Smooth collapse/expand, pause/resume/cancel button press scale (0.98), grouped Sonner toast on completion |
| **Loading Skeletons** | Text "Loading..." | Content-shaped shimmer skeletons (exact grid tiles & list row aspect ratios) | Subtle single-direction shimmer gradient; zero layout shift on data arrival |
| **Thumbnails** | Raw Base64 string decode | Priority queue worker + 25-byte `ThumbHash` blur placeholder | Off-screen decodes cancelled; instant ThumbHash placeholder crossfades to decrypted thumbnail |
| **Deleting & Trash** | Instant removal, confirm alert | Optimistic exit animation (scale 0.96 + fade) + `Sonner` Undo toast | 5-second countdown with progress bar; clicking Undo springs item back into place |
| **Permanent Deletion** | Browser `confirm()` | Radix `AlertDialog` with destructive styling and explicit Telegram deletion warnings | Focus automatically trapped on safe "Cancel" action |
| **Selection Toolbar** | Fixed raw bar | Animated floating selection pill with `NumberFlow` selected item counter | Springs in from bottom; rubber-band selection box with soft accent fill |
| **Context Menus** | Custom div menu | Radix `ContextMenu` with keyboard navigation, submenus, shortcut hints | Micro scale-in (95% -> 100%, 80ms) with viewport collision detection |
| **Modals / Dialogs** | Custom absolute div | Radix `Dialog` / `AlertDialog` with subtle backdrop blur (`backdrop-blur-sm`) | Scale and opacity spring; escape and outside-click dismissal |
| **Inline Renaming** | Modal prompt | Inline smooth morph from label to input field with auto-select name without extension | Pressing Enter commits; Escape reverts without save |
| **Lightbox Preview** | Basic absolute overlay | Shared-element morph from thumbnail tile to full viewport, `@use-gesture` pinch/zoom/swipe | Swipe down to dismiss with velocity physics; left/right arrows with pre-caching |
| **Mobile Drawers** | Basic CSS translate sheet | `Vaul` bottom sheet with rubber-band gesture, pull-to-dismiss, and haptic feedback | Drag handle, dismiss on downward swipe, safe area padding |
| **Notifications** | Custom bottom banner | `Sonner` stacked toast system with action buttons and timer rings | Stacked 3-deep, non-blocking, dismissible, strict CSP safe |

---

## 3. Motion System Values (`src/lib/motion.ts`)

- **Durations:**
  - `instant`: 80ms
  - `fast`: 120ms
  - `base`: 200ms
  - `slow`: 320ms
- **Easings:**
  - `standard`: `[0.2, 0.0, 0.0, 1.0]` (Material 3 Emphasized Decelerate)
  - `exit`: `[0.4, 0.0, 1.0, 1.0]` (Emphasized Accelerate)
- **Springs:**
  - `snappy`: `{ stiffness: 500, damping: 36 }`
  - `soft`: `{ stiffness: 300, damping: 30 }`
  - `gentle`: `{ stiffness: 180, damping: 24 }`
- **Reduced Motion:** Automatic fallback to opacity-only fades or instantaneous state changes when `prefers-reduced-motion: reduce` is active.
