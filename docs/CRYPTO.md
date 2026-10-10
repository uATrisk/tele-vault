# Cryptographic Specifications & Verification

TeleVault uses only standard WebCrypto APIs available natively in modern browsers (`crypto.subtle`), avoiding external untrusted third-party crypto libraries.

---

## 1. Key Derivation Hierarchy

```
Passphrase (User secret)
    │
    ▼ PBKDF2 (HMAC-SHA256, 600,000 iterations, 32-byte CSPRNG salt)
Master Key (256-bit AES-GCM key)
    │
    ├── HKDF-Expand (Info: "televault-chunk-v1") ───> Chunk Encryption Key (CEK)
    ├── HKDF-Expand (Info: "televault-manifest-v1") ─> Manifest Encryption Key (MEK)
    ├── HKDF-Expand (Info: "televault-thumb-v1") ────> Thumbnail Encryption Key (TEK)
    └── HKDF-Expand (Info: "televault-blind-index") ─> Blind Search Key (BSK)
```

---

## 2. Encryption Scheme

- **Algorithm:** AES-256-GCM (`AES-GCM` in WebCrypto)
- **Key Length:** 256 bits
- **IV / Nonce:** 96 bits (12 bytes) cryptographically random (`crypto.getRandomValues`). An IV is strictly used only once per key.
- **Authentication Tag:** 128 bits (16 bytes), appended directly to ciphertext.
- **Wire Format for Chunks & Manifests:**
  ```
  [ 12-byte IV ] || [ Ciphertext ] || [ 16-byte GCM Tag ]
  ```

---

## 3. Cryptographic Verification & Tests

The crypto engine in `packages/crypto` is validated against:
1. **NIST SP 800-38D Known-Answer Tests (KAT):** Validates AES-GCM against official test vectors.
2. **RFC 5869 Test Vectors:** Validates HKDF extraction and expansion.
3. **RFC 6070 Test Vectors:** Validates PBKDF2 HMAC-SHA256.
4. **Tamper Detection:** Changing any single byte in the ciphertext or tag fails decryption with `OperationError` (GCM authentication failure).
