# Disaster Recovery & Off-Grid Restoration

Even in the catastrophic scenario where the Cloudflare D1 database is deleted or Cloudflare is completely inaccessible, your media is never lost.

---

## 1. Pinned Snapshot Architecture

Every 24 hours (or upon manual export), TeleVault creates an encrypted library snapshot manifest:
1. Manifest lists all files, their chunk orders, hashes, and encrypted metadata.
2. Manifest is encrypted with the Manifest Subkey (MEK).
3. Manifest is posted to your private Telegram channel with tag `#televault_snapshot_v1`.
4. Telegram automatically pins or retains the message in the channel history.

---

## 2. Recovery Procedure (Zero-Cloudflare Restore)

To restore your entire library directly from Telegram:

1. Clone the repository onto any machine:
   ```bash
   git clone git@github.com:uATrisk/tele-vault.git
   cd tele-vault
   npm install
   ```

2. Run the offline recovery CLI:
   ```bash
   npm run restore
   ```

3. Provide:
   - Your Telegram Bot Token
   - Your Private Telegram Channel ID
   - Your Master Passphrase (or Emergency Kit Key)
   - Output directory (e.g. `./recovered-media`)

4. The script:
   - Queries the Telegram channel history for chunk messages and pinned snapshots.
   - Downloads all `.bin` files via Telegram Bot API.
   - Verifies GCM authentication tags.
   - Decrypts files client-side and writes them with original filenames and timestamps.
