import { test, expect } from '@playwright/test';

test.describe('Egyetemkapu E2E - FAQ', () => {
  test('induláskor az első kérdés van nyitva, a többi zárva', async ({ page }) => {
    await page.goto('/faq');

    await expect(page.locator('main > div').first().locator('svg').first()).toBeVisible();

    const items = page.locator('main div.space-y-4 > div');
    await expect(items).toHaveCount(5);

    await expect(items.nth(0).locator('div.transition-all')).toHaveClass(/max-h-96/);
    await expect(items.nth(0).locator('.lucide-chevron-up')).toBeVisible();

    for (let i = 1; i < 5; i++) {
      await expect(items.nth(i).locator('div.transition-all')).toHaveClass(/max-h-0/);
      await expect(items.nth(i).locator('.lucide-chevron-down')).toBeVisible();
    }
  });

  test('egy kérdésre kattintva kinyitja azt, és becsukja az előzőt', async ({ page }) => {
    await page.goto('/faq');

    const items = page.locator('main div.space-y-4 > div');
    const secondPanel = items.nth(1).locator('div.transition-all');
    const firstPanel = items.nth(0).locator('div.transition-all');

    await items.nth(1).locator('button').click();

    await expect(secondPanel).toHaveClass(/max-h-96/);
    await expect(items.nth(1).locator('.lucide-chevron-up')).toBeVisible();

    await expect(firstPanel).toHaveClass(/max-h-0/);
    await expect(items.nth(0).locator('.lucide-chevron-down')).toBeVisible();
  });

  test('a nyitott kérdésre újra kattintva becsukja azt', async ({ page }) => {
    await page.goto('/faq');

    const items = page.locator('main div.space-y-4 > div');
    const firstPanel = items.nth(0).locator('div.transition-all');

    await items.nth(0).locator('button').click();

    await expect(firstPanel).toHaveClass(/max-h-0/);
    await expect(items.nth(0).locator('.lucide-chevron-down')).toBeVisible();
  });
});