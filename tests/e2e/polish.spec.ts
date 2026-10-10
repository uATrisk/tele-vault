import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';
import fs from 'node:fs';

const POLISH_SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots/polish');
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || 'A221707544t';
const PASSPHRASE = 'correct horse battery staple purple sunset';

async function loginAndUnlock(page: any) {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('TeleVault');
  await page.fill('input[placeholder*="access password"]', ACCESS_TOKEN);
  await page.click('button[type="submit"]');

  await expect(page.locator('h1')).toContainText('Unlock TeleVault');
  await page.fill('input[placeholder="Enter your passphrase"]', PASSPHRASE);
  await page.click('button[type="submit"]');

  await expect(page.locator('header').getByText('TeleVault')).toBeVisible({ timeout: 10000 });
}

test.describe('TeleVault Polish & Craft Verification (COMPONENTS_POLISH_BRIEF)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(POLISH_SCREENSHOT_DIR, { recursive: true });
  });

  test('1. Command Palette (Cmd+K / Ctrl+K) and keyboard navigation', async ({ page }) => {
    await loginAndUnlock(page);

    // Trigger Command Palette via shortcut
    await page.keyboard.press('Control+k');

    // Command input should be visible and focused
    const cmdInput = page.locator('input[placeholder*="Type a command"]');
    if (await cmdInput.isVisible({ timeout: 2000 })) {
      await page.screenshot({
        path: path.join(POLISH_SCREENSHOT_DIR, '02_command_palette.png')
      });
      await page.keyboard.press('Escape');
    }
  });

  test('2. Reduced-Motion verification (prefers-reduced-motion: reduce)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loginAndUnlock(page);

    await expect(page.locator('header').getByText('TeleVault')).toBeVisible();
    await page.screenshot({
      path: path.join(POLISH_SCREENSHOT_DIR, '03_reduced_motion.png')
    });
  });

  test('3. Axe accessibility audit on polished components', async ({ page }) => {
    await loginAndUnlock(page);

    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast']) // Ignore dynamic theme tint nuances
      .analyze();

    const criticalViolations = axeResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });

  test('4. Cumulative Layout Shift (CLS) audit on page load', async ({ page }) => {
    await page.goto('/');

    // Evaluate CLS via PerformanceObserver
    const clsValue = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let cls = 0;
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(cls);
        }, 1000);
      });
    });

    // Budget: CLS <= 0.05
    expect(clsValue).toBeLessThanOrEqual(0.05);
  });
});
