import { test, expect } from '@playwright/test';

test.describe('Egyetemkapu E2E - Ötletláda', () => {
  test('Új ötlet beküldése sikeresen', async ({ page }) => {
    await page.route('**/api/suggestions', async route => {
      await route.fulfill({ status: 200, json: {} });
    });

    await page.goto('/otletlada');

    await page.evaluate(() => {
      localStorage.setItem('token', 'e2e-mock-token');
    });
    await page.reload();

    const titleInput = page.locator('input[type="text"]');
    await titleInput.waitFor({ state: 'visible' });
    await titleInput.fill('Több 3D-s projekt');

    await page.locator('textarea').fill('Zakartom stílusú procedurális dungeon generátor beépítése a tananyagba.');
    
    await page.locator('button[type="submit"]').click();

    const successMessage = page.locator('text=/thanks|köszönjük|sikeres/i');
    await expect(successMessage).toBeVisible();
  });
});