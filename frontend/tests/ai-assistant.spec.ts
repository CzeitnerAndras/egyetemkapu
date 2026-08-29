import { test, expect } from '@playwright/test';

test.describe('Egyetemkapu E2E - AI Asszisztens', () => {
  test('Prompt küldése és AI válasz fogadása', async ({ page }) => {
    await page.route('**/api/ai/ask', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ answer: 'Ezt a választ a Playwright szimulálta, hogy ne fogyjon az API limited!' })
      });
    });

    await page.goto('/');
    await page.getByRole('link', { name: /AI Asszisztens/i }).first().click();

    const inputField = page.locator('input').first();
    await inputField.waitFor({ state: 'visible' });
    await inputField.fill('Ezt a kérést az automatizált teszt küldi.');

    await page.locator('button').last().click();

    const aiResponse = page.getByText('Ezt a választ a Playwright szimulálta, hogy ne fogyjon az API limited!');
    await expect(aiResponse).toBeVisible();
  });
});