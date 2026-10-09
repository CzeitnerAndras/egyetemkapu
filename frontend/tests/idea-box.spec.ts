import { test, expect } from '@playwright/test';

test.describe('Egyetemkapu E2E - Ötletláda', () => {
  test('Új ötlet beküldése sikeresen', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { grecaptcha: unknown }).grecaptcha = {
        ready: (callback: () => void) => callback(),
        render: () => 1,
        getResponse: () => 'test-token',
        reset: () => {},
      };
    });
    await page.route('**/api/suggestions/captcha', async route => {
      await route.fulfill({ status: 200, json: { siteKey: 'test-site-key' } });
    });
    await page.route('**/api/suggestions', async route => {
      if (route.request().url().includes('/captcha')) {
        await route.fallback();
        return;
      }
      await route.fulfill({ status: 200, json: {} });
    });

    await page.goto('/otletlada');

    const titleInput = page.locator('input[type="text"]');
    await titleInput.waitFor({ state: 'visible' });
    await titleInput.fill('Több 3D-s projekt');

    await page.locator('textarea').fill('Zakartom stílusú procedurális dungeon generátor beépítése a tananyagba.');
    
    await page.locator('button[type="submit"]').click();

    const successMessage = page.locator('text=/thanks|köszönjük|sikeres/i');
    await expect(successMessage).toBeVisible();
  });
});