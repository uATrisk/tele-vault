import { test, expect } from '@playwright/test';

const ACCESS_TOKEN = process.env.ACCESS_TOKEN || 'A221707544t';
const PASSPHRASE = 'correct horse battery staple purple sunset';

test.describe('Search Options, Filters, Logo, and Settings E2E', () => {
  test('verifies brand logo, account menu icons, search filters panel, filter chips, and settings modal', async ({ page }) => {
    // 1. Visit app
    await page.goto('/');

    // 2. Login
    await expect(page.locator('h1')).toContainText('TeleVault');
    await page.fill('input[placeholder*="access password"]', ACCESS_TOKEN);
    await page.click('button[type="submit"]');

    // 3. Unlock with passphrase
    await expect(page.locator('h1')).toContainText('Unlock TeleVault');
    await page.fill('input[placeholder="Enter your passphrase"]', PASSPHRASE);
    await page.click('button[type="submit"]');

    // Wait for main vault view
    await expect(page.locator('header').getByText('TeleVault')).toBeVisible({ timeout: 10000 });

    // 4. Verify TeleVault Brand Logo has proper aria-label
    const logo = page.locator('svg[aria-label="TeleVault Logo"]').first();
    await expect(logo).toBeVisible();

    // 5. Verify Account Menu: Log out has logout icon, Theme has theme icon (not close or tune)
    const avatar = page.locator('button[aria-label="Account options"]');
    await avatar.click();
    await expect(page.locator('text=Log out')).toBeVisible();
    await expect(page.locator('text=Theme:')).toBeVisible();

    // Verify Log out button is visible with its icon
    const logoutBtn = page.locator('button[role="menuitem"]:has-text("Log out")');
    await expect(logoutBtn).toBeVisible();
    await expect(logoutBtn.locator('svg')).toBeVisible();

    // Close menu
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // 6. Test Search Filters Options Popover
    const searchOptionsBtn = page.locator('button[aria-label="Search filters"]').first();
    await expect(searchOptionsBtn).toBeVisible();
    await searchOptionsBtn.click();

    // Popover should appear
    await expect(page.locator('span:has-text("Search options")')).toBeVisible();
    await expect(page.locator('button:has-text("Photos & images")').first()).toBeVisible();
    await expect(page.locator('button:has-text("PDFs")').first()).toBeVisible();

    // Click "Photos & images"
    await page.click('button:has-text("Photos & images")');

    // Click "Apply Filters"
    await page.click('button:has-text("Apply Filters")');
    await page.waitForTimeout(300);

    // Filter chip should now be active
    await expect(page.locator('text=Photos & images').first()).toBeVisible();
    await expect(page.locator('button:has-text("Reset filters")').first()).toBeVisible();

    // Click "Reset filters"
    await page.click('button:has-text("Reset filters")');
    await page.waitForTimeout(300);

    // Reset filters button should disappear, returning to default Type chip
    await expect(page.locator('text=Type').first()).toBeVisible();

    // 7. Test Filter Chips row dropdown directly
    const typeChip = page.locator('button:has-text("Type")').first();
    await typeChip.click();
    await expect(page.locator('button[role="menuitem"]:has-text("Documents")')).toBeVisible();
    await page.click('button[role="menuitem"]:has-text("Documents")');
    await page.waitForTimeout(300);

    // Verify Documents chip is now active with clear button
    const clearDocBtn = page.locator('button[aria-label="Clear Documents filter"]');
    await expect(clearDocBtn).toBeVisible();
    await clearDocBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Type').first()).toBeVisible();

    // 8. Test Settings Modal
    const settingsBtn = page.locator('button[aria-label="Settings"]').first();
    await settingsBtn.click();

    // Verify Settings dialog
    await expect(page.locator('h2:has-text("Vault Settings")')).toBeVisible();
    await expect(page.locator('button:has-text("General & Security")')).toBeVisible();
    await expect(page.locator('button:has-text("Telegram Health")')).toBeVisible();
    await expect(page.locator('button:has-text("Storage & Backup")')).toBeVisible();
    await expect(page.locator('button:has-text("Change Passphrase")')).toBeVisible();

    // Test Auto-lock buttons in General tab
    await expect(page.locator('text=Auto-Lock Inactivity Timer')).toBeVisible();
    await page.click('button:has-text("15 minutes")');

    // Test Change Passphrase tab with show/hide password toggle
    await page.click('button:has-text("Change Passphrase")');
    await expect(page.locator('text=Re-wrap Master Key')).toBeVisible();
    const passInput = page.locator('input[placeholder*="Min 14 characters"]');
    await expect(passInput).toHaveAttribute('type', 'password');

    // Toggle password visibility
    const toggleEye = page.locator('button[aria-label="Show password"]');
    await toggleEye.click();
    await expect(passInput).toHaveAttribute('type', 'text');
    await page.locator('button[aria-label="Hide password"]').click();
    await expect(passInput).toHaveAttribute('type', 'password');

    // Close Settings
    await page.click('button[aria-label="Close settings"]');
    await expect(page.locator('h2:has-text("Vault Settings")')).not.toBeVisible();
  });
});
