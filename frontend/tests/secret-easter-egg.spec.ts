import { test, expect } from '@playwright/test';

test.describe('Egyetemkapu E2E - Easter Egg', () => {
  test('Sötét/Világos mód 10x kattintása aktiválja a Fallout CRT effektet', async ({ page }) => {
    await page.goto('/');

    await page.locator('.lucide-menu').first().click();

    const themeButton = page.locator('button.rounded-full');
    await expect(themeButton).toBeVisible();


    await themeButton.evaluate((el) => {
      for (let i = 0; i < 10; i++) {
        el.dispatchEvent(new CloseEvent('click', { bubbles: true, cancelable: true }));
      }
    });

    await expect(page).toHaveURL(/.*S3CR3T/i, { timeout: 10000 });
  });
});