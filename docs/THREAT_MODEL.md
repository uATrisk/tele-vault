# Threat Model & Security Analysis

## 1. Adversary Assumptions & Trust Boundaries

| Component | Trust Level | Mitigations |
| :--- | :--- | :--- |
| **User Browser** | **Trusted** | Crypto operations execute here. Session keys cleared on lock/idle. |
| **Cloudflare Workers** | **Semi-Trusted** | Handles rate limiting & proxying. Never sees plaintext media or Master Key. |
| **Cloudflare D1** | **Semi-Trusted** | Stores only encrypted metadata and IDs. Even if dumped, media cannot be decrypted. |
| **Telegram Network** | **Untrusted** | Stores opaque binary chunks. Never sees original filenames, sizes, MIME types, or tags. |
| **Network Transit** | **Untrusted** | All transit secured via TLS 1.3 + payload-level AES-256-GCM. |

---

## 2. Leakage Protection

- **No Filename Leaks:** Files uploaded to Telegram are given a freshly generated UUID v4 with a `.bin` extension.
- **No EXIF / Metadata Leaks:** EXIF headers (GPS, camera model, date) are encapsulated inside the encrypted blob before transit.
- **No Telegram Captions:** Zero message text is sent with the document uploads.
- **Side-Channel Padding:** Chunks are fixed at 20 MB (except final chunk) to prevent file-size fingerprinting.
