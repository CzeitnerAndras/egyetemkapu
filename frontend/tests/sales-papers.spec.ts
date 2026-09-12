import { test, expect } from '@playwright/test';

function isoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const flyers = [
  { id: 1, store: 'aldi', title: 'ALDI heti újság', officialUrl: 'https://szorolap.aldi.hu/x/', pageCount: 12, productCount: 8, validFrom: isoDate(0), validTo: isoDate(6) },
  { id: 2, store: 'spar', title: 'SPAR szórólap', officialUrl: 'https://www.spar.hu/ajanlatok', pageCount: 20, productCount: 0 },
  { id: 3, store: 'penny', title: 'PENNY ajánlatok', officialUrl: 'https://www.penny.hu/ajanlatok', pageCount: 1, productCount: 4 },
  { id: 4, store: 'tesco', title: 'Tesco Hipermarket', officialUrl: 'https://www.tesco.hu/akciok/katalogusok/hipermarket/tesco-ujsag-2026-09-10/1', pageCount: 34, productCount: 0, validFrom: isoDate(0), validTo: isoDate(6) },
];

test.describe('Egyetemkapu E2E - Akciós újság', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/flyers', async (route) => {
      if (route.request().url().includes('/search') || route.request().url().includes('/pages/')) {
        await route.fallback();
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(flyers) });
    });
    await page.route('**/api/flyers/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { flyerId: 1, store: 'aldi', title: 'ALDI heti újság', pageNumber: 2, productName: 'Kakaóscsiga', snippet: 'Kakaóscsiga', kind: 'product' },
        ]),
      });
    });
    await page.route('**/api/flyers/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          store: 'aldi',
          title: 'ALDI heti újság',
          officialUrl: 'https://szorolap.aldi.hu/x/',
          pages: [{ pageNumber: 1, hasImage: true }, { pageNumber: 2, hasImage: true }],
        }),
      });
    });
    await page.route('**/api/flyers/1/pages/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('89504e470d0a1a0a', 'hex') });
    });
  });

  test('a /flyers cím átirányít /akcios-ujsag-ra', async ({ page }) => {
    await page.goto('/flyers');
    await expect(page).toHaveURL(/\/akcios-ujsag$/);
  });

  test('négy bolt tab jelenik meg, alapértelmezetten a SPAR aktív, és újságok listázódnak', async ({ page }) => {
    await page.goto('/akcios-ujsag');
    await page.getByRole('button', { name: /Értem|Got it/i }).click();

    await expect(page.locator('.lucide-newspaper').first()).toBeVisible();
    await expect(page.locator('[data-store]')).toHaveCount(4);
    await expect(page.locator('[data-store="spar"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('SPAR szórólap')).toBeVisible();
  });

  test('másik boltra kattintva lecserélődik az újságlista', async ({ page }) => {
    await page.goto('/akcios-ujsag');
    await page.getByRole('button', { name: /Értem|Got it/i }).click();
    await expect(page.getByText('SPAR szórólap')).toBeVisible();

    await page.locator('[data-store="penny"]').click();

    await expect(page.locator('[data-store="penny"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('PENNY ajánlatok')).toBeVisible();
    await expect(page.getByText('SPAR szórólap')).toHaveCount(0);
  });

  test('keresés találatot ad, és megnyitja a lapozót', async ({ page }) => {
    await page.goto('/akcios-ujsag');
    await page.getByRole('button', { name: /Értem|Got it/i }).click();
    await page.getByLabel(/Keresés az újságokban|Search the flyers/i).fill('kakaóscsiga');
    await page.getByRole('button', { name: /Keresés|Search/i }).click();

    await expect(page.getByText('Kakaóscsiga')).toBeVisible();
    await page.getByText('Kakaóscsiga').click();
    await expect(page.getByRole('link', { name: /Hivatalos|Official/i })).toHaveAttribute('href', 'https://szorolap.aldi.hu/x/');
  });
});
