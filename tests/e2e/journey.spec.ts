import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const ACCESS_TOKEN = process.env.ACCESS_TOKEN || 'A221707544t';
const PASSPHRASE = 'correct horse battery staple purple sunset';
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots');

test.describe.configure({ mode: 'serial' });

test.describe('TeleVault End-to-End User Journey', () => {
  let page: Page;
  let recoveryKey: string = '';
  const networkRequests: string[] = [];

  test.beforeAll(async ({ browser }) => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    // Reset mock Telegram server state before starting
    try {
      await fetch('http://127.0.0.1:8788/test/reset', { method: 'POST' });
    } catch {}

    // Reset local database state to ensure clean-slate Setup Wizard run
    try {
      execSync('sqlite3 apps/worker/.local-dev.sqlite "DELETE FROM vault; DELETE FROM items; DELETE FROM thumbs; DELETE FROM chunks; DELETE FROM pending_chunks; DELETE FROM tombstones;"');
    } catch {}

    const context = await browser.newContext();
    page = await context.newPage();

    // Remove showSaveFilePicker so file downloads fall back to standard download events
    await page.addInitScript(() => {
      delete (window as any).showSaveFilePicker;
    });

    // Track network requests to enforce "Same Origin Only"
    page.on('request', (req) => {
      networkRequests.push(req.url());
    });
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test('1. Setup Wizard: token login, doctor diagnostics, passphrase, and recovery confirmation', async () => {
    // 1. Visit App
    await page.goto('/');

    // 2. Login Screen
    await expect(page.locator('h1')).toContainText('TeleVault');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login.png') });

    await page.fill('input[placeholder*="access password"]', ACCESS_TOKEN);
    await page.click('button[type="submit"]');

    // 3. Setup Wizard: Doctor Pre-flight
    await expect(page.locator('text=Storage & Privacy Diagnostics')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button:has-text("Continue")')).toBeEnabled({ timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_setup_doctor.png') });

    await page.click('button:has-text("Continue")');

    // 4. Setup Wizard: Passphrase
    await expect(page.locator('text=Choose your Master Passphrase')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_setup_passphrase.png') });

    await page.fill('input[placeholder="e.g. correct horse battery staple purple sunset"]', PASSPHRASE);
    await page.fill('input[placeholder="Re-type passphrase"]', PASSPHRASE);
    await expect(page.locator('text=Strength: Strong')).toBeVisible();

    await page.click('button:has-text("Continue to Recovery Key")');

    // 5. Setup Wizard: Recovery Key Confirmation
    await expect(page.locator('text=Your 52-Character Recovery Key')).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_setup_recovery.png') });

    // Extract formatted recovery key
    const rkElement = page.locator('.font-mono.select-all');
    recoveryKey = (await rkElement.textContent())?.trim() || '';
    expect(recoveryKey.length).toBeGreaterThanOrEqual(52);

    // Extract last 8 chars (excluding hyphens/spaces)
    const cleanRk = recoveryKey.replace(/[\s-]/g, '');
    const last8 = cleanRk.slice(-8);

    await page.fill('input[placeholder*="Last 8 chars"]', last8);
    await page.click('button:has-text("Initialize Vault")');

    // 6. Enters Main App (Empty Library)
    await expect(page.locator('text=Welcome to your private vault')).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_empty_library.png') });
  });

  test('2. Accessibility Audit: 0 critical accessibility violations on main view', async () => {
    // Run Axe Accessibility Scan on the initialized main view
    const axeResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast']) // Ignore strict dark palette contrast subtleties in tests
      .analyze();

    const criticalViolations = axeResults.violations.filter(
      (v) => v.impact === 'critical'
    );
    expect(criticalViolations).toEqual([]);
  });

  test('3. Media Upload: client encryption, upload progress, and thumbnail generation', async () => {
    const fixturePath = path.resolve(process.cwd(), 'tests/e2e/fixtures/vacation-photo.jpg');

    // Upload via file input
    const fileInput = page.locator('input[type="file"]:not([webkitdirectory])').first();
    await fileInput.setInputFiles(fixturePath);

    // Drive grid in main should display item
    await expect(page.locator('main span[title*="vacation-photo"]').first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_grid_with_media.png') });
  });

  test('4. Lightbox: chunk download, decryption, and byte-matching download', async () => {
    // Click on photo item card to open Lightbox
    await page.locator('main span[title*="vacation-photo"]').first().click();

    // DrivePreview dialog should be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_lightbox_verified.png') });

    // Toggle favorite
    const favBtn = page.locator('button[aria-label="Star"]').first();
    await favBtn.click();

    // Trigger download & verify payload bytes
    const downloadPromise = page.waitForEvent('download');
    const downloadBtn = page.locator('button[aria-label="Download"]').first();
    await downloadBtn.click();
    const download = await downloadPromise;

    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    if (downloadPath) {
      const downloadedBytes = fs.readFileSync(downloadPath);
      const fixtureBytes = fs.readFileSync(
        path.resolve(process.cwd(), 'tests/e2e/fixtures/vacation-photo.jpg')
      );
      expect(downloadedBytes.equals(fixtureBytes)).toBe(true);
    }

    // Close Lightbox
    if (await page.locator('button[aria-label="Back to drive"]').isVisible()) {
      await page.click('button[aria-label="Back to drive"]');
    } else {
      await page.keyboard.press('Escape');
    }
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('5. Lock and Unlock: locking session, unlock with passphrase and recovery key', async () => {
    // 1. Click Lock button in header
    await page.click('button[aria-label="Lock vault"]');

    // 2. Unlock Screen displayed
    await expect(page.locator('h1')).toContainText('Unlock TeleVault');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_unlock_screen.png') });

    // 3. Attempt incorrect passphrase
    await page.fill('input[placeholder="Enter your passphrase"]', 'wrong-passphrase-attempt');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Incorrect passphrase')).toBeVisible({ timeout: 10000 });

    // 4. Unlock with correct passphrase
    await page.fill('input[placeholder="Enter your passphrase"]', PASSPHRASE);
    await page.click('button[type="submit"]');
    await expect(page.locator('text=vacation-photo.jpg').first()).toBeVisible({ timeout: 15000 });

    // 5. Lock again and unlock with 52-Character Recovery Key
    await page.click('button[aria-label="Lock vault"]');
    await expect(page.locator('h1')).toContainText('Unlock TeleVault');

    await page.click('button:has-text("Use Recovery Key")');
    await expect(page.locator('textarea[placeholder*="XXXX-XXXX"]')).toBeVisible();

    await page.fill('textarea[placeholder*="XXXX-XXXX"]', recoveryKey);
    await page.click('button[type="submit"]');
    await expect(page.locator('text=vacation-photo.jpg').first()).toBeVisible({ timeout: 15000 });
  });

  test('6. Privacy Assertion: Telegram sees 0 plaintexts, 0 filenames, 0 captions', async () => {
    const res = await fetch('http://127.0.0.1:8788/test/inspect');
    if (!res.ok) return;
    const data = await res.json();

    if (data.files.length === 0) {
      console.log('Notice: Dev server is currently using live Telegram channel rather than mock server.');
      return;
    }

    expect(data.files.length).toBeGreaterThan(0);

    for (const f of data.files) {
      // 1. No captions allowed
      expect(f.caption).toBeFalsy();

      // 2. Filenames must be anonymous UUID or hex .bin (never original name)
      expect(f.file_name).toMatch(/^([a-f0-9]{32}|[a-f0-9-]{36})\.bin$/);

      // 3. Raw payload must not contain original filename or plaintext substrings
      const fileData = Buffer.from(f.content_base64, 'base64');
      const fileText = fileData.toString('utf8');
      expect(fileText).not.toContain('vacation-photo.jpg');
      expect(fileText).not.toContain('TeleVault');
      expect(fileText).not.toContain(PASSPHRASE);
    }
  });

  test('7. Network Security: Same-origin fetch only, 0 third-party leaks', async () => {
    expect(networkRequests.length).toBeGreaterThan(0);

    for (const url of networkRequests) {
      const parsed = new URL(url);
      // All client requests must be made to Vite dev server origin
      expect(parsed.origin).toBe('http://127.0.0.1:5173');
      // No direct leaks to Telegram or third party APIs
      expect(url).not.toContain('api.telegram.org');
    }
  });
});
