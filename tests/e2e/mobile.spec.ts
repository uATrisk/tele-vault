import { test, expect } from '@playwright/test';

const ACCESS_TOKEN = process.env.ACCESS_TOKEN || 'A221707544t';
const PASSPHRASE = 'correct horse battery staple purple sunset';

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true
});

test.describe('Mobile Viewport & Touch Ergonomics E2E', () => {
  test('Mobile navigation, bottom sheet, touch folder navigation', async ({ page }) => {
    // 1. Visit App on mobile viewport
    await page.goto('/');

    // 2. Login
    await expect(page.locator('h1')).toContainText('TeleVault');
    await page.fill('input[placeholder*="access password"]', ACCESS_TOKEN);
    await page.click('button[type="submit"]');

    // 3. Unlock with passphrase
    await expect(page.locator('h1')).toContainText('Unlock TeleVault');
    await page.fill('input[placeholder="Enter your passphrase"]', PASSPHRASE);
    await page.click('button[type="submit"]');

    // 4. Verify Mobile Bottom Navigation Bar is visible
    const bottomNav = page.locator('nav[aria-label="Mobile navigation"]');
    await expect(bottomNav).toBeVisible();

    // Verify nav items
    await expect(bottomNav.locator('text=Files')).toBeVisible();
    await expect(bottomNav.locator('text=Photos')).toBeVisible();
    await expect(bottomNav.locator('text=Recent')).toBeVisible();
    await expect(bottomNav.locator('text=Starred')).toBeVisible();
    await expect(bottomNav.locator('text=Trash')).toBeVisible();

    // 5. Tap "Starred" in bottom nav
    await bottomNav.locator('text=Starred').click();
    await expect(page.locator('h2')).toContainText('starred');
    await expect(page.locator('main span[title*="vacation-photo"]').first()).toBeVisible();

    // Tap "Trash" in bottom nav (empty trash state)
    await bottomNav.locator('text=Trash').click();
    await expect(page.locator('text=Nothing in trash')).toBeVisible();

    // 6. Tap "Files" to return to Drive
    await bottomNav.locator('text=Files').click();
    await expect(page.locator('main').getByText('My Drive')).toBeVisible();

    // 7. Verify Mobile Floating Action Button (FAB)
    const mobileFab = page.locator('button[aria-label="Create or upload"]');
    await expect(mobileFab).toBeVisible();

    // 8. Tap Mobile FAB -> Material 3 Bottom Sheet slides up
    await mobileFab.click();
    await expect(page.locator('text=Create new')).toBeVisible();
    await expect(page.locator('text=Upload files')).toBeVisible();
    await expect(page.locator('text=Photos & Videos')).toBeVisible();
    await expect(page.locator('text=New folder')).toBeVisible();
    await expect(page.locator('text=Folder upload')).toBeVisible();

    // 9. Tap "New folder" in Bottom Sheet
    await page.locator('button:has-text("New folder")').click();
    await expect(page.locator('text=New Folder')).toBeVisible();

    // Create a new folder
    const folderInput = page.locator('input[placeholder="Folder name"]');
    await folderInput.fill('Mobile Test Vault');
    await page.click('button:has-text("Create")');

    // 10. Verify folder appeared in file list
    const folderCard = page.locator('main').getByRole('button', { name: /Mobile Test Vault/i });
    await expect(folderCard).toBeVisible();

    // 11. Single-tap folder on mobile to open
    await folderCard.click();
    await expect(page.locator('text=This folder is empty')).toBeVisible();
    // Verify direct upload button in empty folder
    await expect(page.locator('button:has-text("Upload files")')).toBeVisible();
  });
});
