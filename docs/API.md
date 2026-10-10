# TeleVault API Specification

The TeleVault backend is implemented as a Cloudflare Worker using Hono. It provides authentication, routes encrypted chunks to Telegram storage, and maintains the encrypted metadata index in Cloudflare D1.

---

## 1. Security & Authentication

All API endpoints except `GET /api/health` and `POST /api/auth/login` require authentication.

- **Authentication Mechanism:**
  - `POST /api/auth/login` checks the provided `token` against the server's `ACCESS_TOKEN` secret using a constant-time comparison.
  - On success, sets a signed `tv_session` cookie:
    - Flags: `HttpOnly; Secure (in prod); SameSite=Strict; Path=/; Max-Age=2592000` (30 days).
    - Signature: HMAC-SHA256 with server `SESSION_SECRET`.
  - Rate limiting: Maximum 5 failed login attempts per IP per 15 minutes.
- **Security Headers:**
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Cache-Control: no-store` on all API responses (except immutable chunk streams)
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';`

---

## 2. API Endpoints

### 2.1 Public & Authentication Endpoints

#### `GET /api/health`
- **Auth:** Public
- **Response:** `200 OK`
  ```json
  { "ok": true }
  ```

#### `POST /api/auth/login`
- **Auth:** Public (Rate-limited)
- **Request Body:**
  ```json
  { "token": "string" }
  ```
- **Response:**
  - `200 OK` `{ "ok": true }` (Sets `tv_session` cookie)
  - `400 Bad Request` `{ "ok": false, "error": "Token is required" }`
  - `401 Unauthorized` `{ "ok": false, "error": "Invalid access token" }`
  - `429 Too Many Requests` `{ "ok": false, "error": "Too many login attempts..." }`

#### `POST /api/auth/logout`
- **Auth:** Public / Authenticated
- **Response:** `200 OK` `{ "ok": true }` (Clears `tv_session` cookie)

---

### 2.2 Vault Header Endpoints

#### `GET /api/vault`
- **Auth:** Required
- **Response:**
  - `200 OK`
    ```json
    {
      "ok": true,
      "header": {
        "v": 1,
        "kdf": { "name": "PBKDF2-HMAC-SHA256", "salt": "...", "iterations": 600000 },
        "iv": "...",
        "wrappedMK": "...",
        "rkIv": "...",
        "wrappedMK_rk": "...",
        "rev": 1,
        "createdAt": 1728560000000
      },
      "rev": 1,
      "createdAt": 1728560000000
    }
    ```
  - `404 Not Found` `{ "ok": false, "error": "Vault not initialized" }`

#### `PUT /api/vault`
- **Auth:** Required
- **Purpose:** Initializes the vault header for the first time.
- **Request Body:** `{ "header": { ... } }`
- **Response:**
  - `200 OK` `{ "ok": true, "rev": 1 }`
  - `409 Conflict` `{ "ok": false, "error": "Vault already exists" }`

#### `POST /api/vault/rewrap`
- **Auth:** Required
- **Purpose:** Replaces the vault header with a new wrapper after a passphrase change.
- **Request Body:**
  ```json
  {
    "header": { ... },
    "expectedRev": 1
  }
  ```
- **Response:**
  - `200 OK` `{ "ok": true, "rev": 2 }`
  - `409 Conflict` `{ "ok": false, "error": "Conflict: vault revision mismatch" }`

---

### 2.3 Chunk Endpoints

#### `POST /api/chunks`
- **Auth:** Required
- **Headers:**
  - `X-Upload-Id: string` (client upload session ID)
  - `X-Chunk-Index: number` (0-indexed integer)
- **Request Body:** Raw binary ciphertext chunk (`IV || Ciphertext || Tag`). Maximum 17 MiB.
- **Behavior:** Streams the chunk directly to Telegram `sendDocument` as a randomly-named `.bin` file without caption. Records pending chunk in D1.
- **Response:**
  ```json
  {
    "ok": true,
    "messageId": 1234,
    "fileId": "BAACAg...",
    "size": 16777244
  }
  ```

#### `GET /api/chunks/:fileId`
- **Auth:** Required
- **Purpose:** Retrieves the encrypted chunk from Telegram.
- **Response Headers:**
  - `Content-Type: application/octet-stream`
  - `Cache-Control: private, max-age=31536000, immutable`
- **Response:** Binary stream of the encrypted chunk.

---

### 2.4 Items (Library Index) Endpoints

#### `GET /api/items`
- **Auth:** Required
- **Query Parameters:**
  - `since` (optional, default 0): Return changes after sequence number.
  - `limit` (optional, default 100, max 500): Page size.
- **Response:**
  ```json
  {
    "ok": true,
    "items": [
      {
        "id": "16-byte-hex",
        "seq": 1,
        "rev": 1,
        "manifest": "hex-encoded-encrypted-manifest",
        "sizeBytes": 4194304,
        "chunkCount": 1,
        "createdAt": 1728560000000
      }
    ],
    "tombstones": [
      { "seq": 2, "id": "16-byte-hex" }
    ],
    "nextSeq": 2
  }
  ```

#### `POST /api/items`
- **Auth:** Required
- **Purpose:** Commits an uploaded item once all chunks have succeeded, or commits a folder item (zero chunks).
- **Request Body:**
  ```json
  {
    "id": "16-byte-hex",
    "manifest": "hex-encoded-ciphertext",
    "thumb": "hex-encoded-ciphertext (optional for folders or non-visual files)",
    "chunks": [
      { "idx": 0, "messageId": 1234, "fileId": "BAACAg...", "size": 16777244 }
    ],
    "sizeBytes": 16777216,
    "chunkCount": 1,
    "uploadId": "upload-session-id (optional)"
  }
  ```
  *Note:* For folders, `chunks` is empty `[]`, `thumb` is omitted, and `sizeBytes` / `chunkCount` are 0.
- **Response:** `200 OK` `{ "ok": true, "seq": 3 }`

#### `PUT /api/items/:id`
- **Auth:** Required
- **Purpose:** Updates an existing item manifest (e.g. favorited, renamed, tagged, trashed).
- **Request Body:**
  ```json
  {
    "manifest": "hex-encoded-ciphertext",
    "expectedRev": 1
  }
  ```
- **Response:**
  - `200 OK` `{ "ok": true, "rev": 2, "seq": 4 }`
  - `409 Conflict` `{ "ok": false, "error": "Conflict: revision mismatch" }`

#### `DELETE /api/items/:id`
- **Auth:** Required
- **Purpose:** Hard deletion. Deletes all associated Telegram messages for the item chunks, removes rows from D1, and emits a tombstone.
- **Response:** `200 OK` `{ "ok": true, "tombstoneSeq": 5 }`

---

### 2.5 Batch Thumbnails Endpoint

#### `GET /api/thumbs?ids=id1,id2,id3`
- **Auth:** Required
- **Query Parameters:** `ids`: Comma-separated list of item IDs (maximum 64 per call).
- **Response:**
  ```json
  {
    "ok": true,
    "thumbs": {
      "id1": "hex-encoded-encrypted-thumbnail",
      "id2": "hex-encoded-encrypted-thumbnail"
    }
  }
  ```

---

### 2.6 Diagnostics & Maintenance Endpoints

#### `GET /api/stats`
- **Auth:** Required
- **Response:**
  ```json
  {
    "ok": true,
    "stats": {
      "itemCount": 42,
      "totalBytes": 104857600,
      "totalChunks": 7,
      "tombstonesCount": 2
    }
  }
  ```

#### `GET /api/doctor`
- **Auth:** Required
- **Purpose:** Runs live diagnostics on Telegram bot connection and channel settings.
- **Response:**
  ```json
  {
    "ok": true,
    "report": {
      "ok": true,
      "checks": [
        { "name": "bot_token_valid", "status": "pass", "detail": "Connected as @my_bot" },
        { "name": "chat_type_channel", "status": "pass", "detail": "Chat is a channel" },
        { "name": "channel_privacy_no_username", "status": "pass", "detail": "Channel is strictly private" },
        { "name": "channel_member_count", "status": "pass", "detail": "Member count verified (2 members)" },
        { "name": "bot_permissions", "status": "pass", "detail": "Bot possesses all required permissions" }
      ]
    }
  }
  ```

#### `POST /api/snapshot`
- **Auth:** Required
- **Purpose:** Manually triggers a disaster recovery backup. Packs all current item manifests into a snapshot part, uploads to Telegram, and pins the snapshot head document in the channel.
- **Response:**
  ```json
  {
    "ok": true,
    "headMessageId": 5678,
    "partFileId": "BAACAg..."
  }
  ```
