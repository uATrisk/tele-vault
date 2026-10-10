# Manual Test & Verification Checklist (Owner Gate B)

Use this checklist to perform manual end-to-end verification of your running TeleVault instance.

---

### Step 1: Pre-flight Verification
- [ ] Run `npm run doctor` and confirm all 5 checks pass (green checkmarks).
- [ ] Run `npm run live-smoke` and verify encrypted roundtrip through real Telegram channel.

### Step 2: Web App First Run (Setup Wizard)
- [ ] Start dev server with `npm run dev` and open `http://localhost:5173`.
- [ ] Enter Web Access Token from `.dev.vars`.
- [ ] Set a strong Master Passphrase in Setup Wizard.
- [ ] Verify Emergency Kit key is displayed and can be copied/downloaded.
- [ ] Confirm landing on empty Timeline Grid.

### Step 3: Media Upload & Encryption
- [ ] Drag & drop a small photo (< 5 MB).
- [ ] Verify progress bar appears in upload queue modal.
- [ ] Verify photo appears as a thumbnail in Timeline Grid within seconds.
- [ ] Open your private Telegram channel in the Telegram desktop/mobile app:
  - Confirm a new message arrived with an opaque `.bin` file name (e.g. `<uuid>.bin`).
  - Confirm NO photo preview, NO caption, and NO filename are visible in Telegram.

### Step 4: Multi-Chunk Video Upload
- [ ] Upload a video larger than 20 MB.
- [ ] Verify multiple chunk uploads occur sequentially in network tab.
- [ ] Verify each chunk arrives as a separate `.bin` message in Telegram.

### Step 5: Lightbox & Decryption
- [ ] Click on the photo thumbnail in Timeline Grid.
- [ ] Confirm full resolution photo renders without delay.
- [ ] Test pinch-to-zoom / zoom buttons.
- [ ] Click on the video thumbnail and confirm video streams/plays smoothly.

### Step 6: Locking & Security
- [ ] Click the "Lock Vault" button in the top navigation bar.
- [ ] Confirm return to Unlock Screen.
- [ ] Enter an incorrect passphrase: verify error message and refusal to unlock.
- [ ] Enter the correct passphrase: verify library unlocks and photos display immediately.
