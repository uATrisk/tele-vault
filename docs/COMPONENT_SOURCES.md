# Component Sources & License Register

This document records every third-party component, primitive, and utility integrated into TeleVault, strictly complying with the license requirements defined in `COMPONENTS_POLISH_BRIEF.md` (Section 2.3: Only MIT, Apache-2.0, ISC, BSD, OFL).

---

## 1. Registry Table

| Package / Component | Author / Organization | License | Source / Repository | Date Added | Modifications / Purpose |
|---|---|---|---|---|---|
| **Radix UI Primitives** (`@radix-ui/*`) | WorkOS / Radix UI Team | MIT | [github.com/radix-ui/primitives](https://github.com/radix-ui/primitives) | 2026-10-11 | Fully accessible headless primitives for Dialog, AlertDialog, DropdownMenu, ContextMenu, Tooltip, Popover, Tabs, Slot. Styled with TeleVault tokens. |
| **Motion** (`motion`) | Matt Perry / Framer | MIT | [github.com/motiondivision/motion](https://github.com/motiondivision/motion) | 2026-10-11 | Successor to Framer Motion. Using `LazyMotion` with `domAnimation` and `m` components for 60fps hardware-accelerated transforms, layout animations, and springs. |
| **Sonner** (`sonner`) | Emil Kowalski | MIT | [github.com/emilkowalski/sonner](https://github.com/emilkowalski/sonner) | 2026-10-11 | Accessible toast notifications with stacking, undo action timers, and zero external style injection. Integrated with strict CSP. |
| **Vaul** (`vaul`) | Emil Kowalski | MIT | [github.com/emilkowalski/vaul](https://github.com/emilkowalski/vaul) | 2026-10-11 | Accessible mobile bottom sheet drawer with rubber-band physics, velocity-based drag-to-dismiss, and safe-area insets. |
| **cmdk** (`cmdk`) | Paco Coursey | MIT | [github.com/pacocoursey/cmdk](https://github.com/pacocoursey/cmdk) | 2026-10-11 | Fast, unstyled command palette (`Cmd+K` / `Ctrl+K`) for global file search, folder navigation, and vault shortcuts. |
| **NumberFlow** (`@number-flow/react`) | Max Stoiber | MIT | [github.com/barvian/number-flow](https://github.com/barvian/number-flow) | 2026-10-11 | Digit-by-digit tabular numeral animation for storage counters, progress percentages, and file counts. |
| **@use-gesture/react** | David Bismut / Poimandres | MIT | [github.com/pmndrs/use-gesture](https://github.com/pmndrs/use-gesture) | 2026-10-11 | Pinch-to-zoom, drag, and swipe-to-dismiss gestures with inertia for lightbox preview. |
| **ThumbHash** (`thumbhash`) | Evan Wallace | MIT | [github.com/evanw/thumbhash](https://github.com/evanw/thumbhash) | 2026-10-11 | Ultra-compact 25-byte image placeholder hashes stored encrypted in manifests; instant blur before full decryption. |
| **clsx** | Luke Edwards | MIT | [github.com/lukeed/clsx](https://github.com/lukeed/clsx) | 2026-10-11 | Utility for constructing `className` strings conditionally. |
| **tailwind-merge** | Dany Castillo | MIT | [github.com/dcastil/tailwind-merge](https://github.com/dcastil/tailwind-merge) | 2026-10-11 | Utility to merge Tailwind CSS classes in JS without style conflicts. |
| **class-variance-authority** | Joe Bell | Apache-2.0 | [github.com/joe-bell/cva](https://github.com/joe-bell/cva) | 2026-10-11 | Type-safe component variant definitions for UI design system buttons, badges, and chips. |
| **@tanstack/react-virtual** | Tanner Linsley | MIT | [github.com/TanStack/virtual](https://github.com/TanStack/virtual) | 2026-10-10 | Virtualized windowing for large media libraries (20,000+ files) with zero layout shift. |
| **Roboto Font** (`@fontsource/roboto`) | Google / Fontsource | Apache-2.0 | [fontsource.org/fonts/roboto](https://fontsource.org/fonts/roboto) | 2026-10-10 | Self-hosted local font files bundled into dist; zero external CDN calls. |

---

## 2. Security & Licensing Guarantees

1. **Zero Runtime Network Calls:** Every package listed above is bundled during Vite build. No script tags, stylesheets, or assets are fetched from any third-party domain at runtime.
2. **Permissive Open Source Only:** All components use MIT or Apache-2.0 licenses. No copyleft (GPL/AGPL), no Commons Clause, no commercial restrictions.
3. **Strict CSP Compatibility:** Verified that none of the adopted packages require `unsafe-eval` or dynamic script generation.
