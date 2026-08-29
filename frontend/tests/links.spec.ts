import { test, expect } from '@playwright/test';

test.describe('Egyetemkapu E2E - Links', () => {
  test('11 egyetem tab jelenik meg, alapértelmezetten az első aktív, és linkek listázódnak', async ({ page }) => {
    await page.goto('/links');

    await expect(page.locator('.lucide-link').first()).toBeVisible();

    const uniButtons = page.locator('main div.space-y-2 > button');
    await expect(uniButtons).toHaveCount(11);

    await expect(uniButtons.first()).toHaveClass(/translate-x-2/);

    const externalLinks = page.locator('main a[target="_blank"]');
    await expect(externalLinks.first()).toBeVisible();
    expect(await externalLinks.count()).toBeGreaterThan(0);
  });

  test('másik egyetemre kattintva az adott tab lesz aktív, és lecserélődik a linklista', async ({ page }) => {
    await page.goto('/links');

    const uniButtons = page.locator('main div.space-y-2 > button');
    const externalLinks = page.locator('main a[target="_blank"]');

    const initialFirstHref = await externalLinks.first().getAttribute('href');

    await uniButtons.last().click();

    await expect(uniButtons.last()).toHaveClass(/translate-x-2/);
    await expect(uniButtons.first()).not.toHaveClass(/translate-x-2/);

    await expect(async () => {
      const href = await externalLinks.first().getAttribute('href');
      expect(href).not.toBe(initialFirstHref);
    }).toPass({ timeout: 5000 });
  });

  test('minden megjelenített link http(s) URL-re mutat, és új lapon nyílik meg', async ({ page }) => {
    await page.goto('/links');

    const externalLinks = page.locator('main a[target="_blank"]');
    const count = await externalLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const link = externalLinks.nth(i);
      await expect(link).toHaveAttribute('href', /^https?:\/\//);
      await expect(link).toHaveAttribute('rel', /noopener/);
    }
  });
});
