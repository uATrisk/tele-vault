# TeleVault Third-Party Dependencies & Licences

All frontend assets, fonts, icons, scripts, and libraries in TeleVault are bundled locally and served strictly same-origin. No third-party network requests (CDNs, external font providers, or external telemetry) are permitted under Security Rule S5.

---

## 1. Frontend Bundled Assets

| Dependency | Purpose | Licence | Verification |
| :--- | :--- | :--- | :--- |
| **`@fontsource/roboto`** | Self-hosted Roboto typography matching Google UI layout | Apache-2.0 | Bundled locally in `@televault/web`; zero CDN requests |
| **Material Design Symbols (SVG)** | Material Design icon system for folders, file types, menus, dialogs | Apache-2.0 | Embedded SVG vectors in `apps/web/src/components/ui/Icon.tsx` |
| **`react` & `react-dom`** | Core UI framework | MIT | Bundled via Vite |
| **`@tanstack/react-virtual`** | Headless virtualization engine for 20,000+ items | MIT | Bundled via Vite |
| **`client-zip`** | Pure in-browser streaming ZIP generator | MIT | Bundled via Vite |
| **`tailwindcss`** | Utility CSS engine & design tokens | MIT | Build-time compilation only |
| **`lucide-react`** | Auxiliary system icons | ISC | Bundled via Vite |

---

## 2. Security & Origin Verification
- All web font files (`.woff2`) are packaged directly by `@fontsource/roboto` into `dist/assets/`.
- Content-Security-Policy (CSP) headers strictly forbid `font-src` or `style-src` from external domains.
- Zero network requests are made outside the application origin.
