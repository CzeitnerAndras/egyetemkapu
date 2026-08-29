import { test, expect } from '@playwright/test';

test.describe('Egyetemkapu E2E - Hivatkozás Generátor', () => {
  test('megjeleníti az űrlapot és az üres eredmény állapotot', async ({ page }) => {
    await page.goto('/hivatkozas');

    await expect(page.locator('.lucide-book-marked').first()).toBeVisible();
    await expect(page.locator('.lucide-pen-tool')).toBeVisible();
    await expect(page.locator('.lucide-sparkles')).toBeVisible();

    const form = page.locator('main form');
    await expect(form.locator('input[type="text"]')).toHaveCount(4);
    await expect(form.locator('select')).toHaveCount(1);

    await expect(page.locator('main .lucide-book-marked').nth(1)).toBeVisible();
    await expect(page.locator('.lucide-copy')).toHaveCount(0);
    await expect(page.locator('.lucide-check')).toHaveCount(0);
  });

  test('a stílus választó APA, MLA és Harvard opciókat tartalmaz, alapértelmezetten APA', async ({ page }) => {
    await page.goto('/hivatkozas');

    const styleSelect = page.locator('main form select');
    await expect(styleSelect).toHaveValue('APA');

    const options = styleSelect.locator('option');
    await expect(options).toHaveCount(3);
    await expect(options.nth(0)).toHaveText('APA');
    await expect(options.nth(1)).toHaveText('MLA');
    await expect(options.nth(2)).toHaveText('Harvard');

    await styleSelect.selectOption('HARVARD');
    await expect(styleSelect).toHaveValue('HARVARD');
  });

  test('a cím mező kötelező - üresen a böngésző natív validációja megakadályozza a beküldést', async ({ page }) => {
    await page.goto('/hivatkozas');

    const titleInput = page.locator('main form input[required]');
    const submitButton = page.locator('main form button[type="submit"]');

    await submitButton.click();

    const isInvalid = await titleInput.evaluate((el) => !(el as any).checkValidity());
    expect(isInvalid).toBe(true);

    await expect(page.locator('.lucide-copy')).toHaveCount(0);
  });

  test('kitöltött űrlap beküldése után (bejelentkezés nélkül) a gomb visszaáll, és nincs generált hivatkozás', async ({ page }) => {
    await page.goto('/hivatkozas');

    await page.locator('main form input[required]').fill('A tesztelés alapjai');
    await page.locator('main form input[type="text"]').first().fill('Teszt Szerző');

    const submitButton = page.locator('main form button[type="submit"]');
    await submitButton.click();

    await expect(submitButton).toBeEnabled({ timeout: 10000 });
    await expect(page.locator('.lucide-copy')).toHaveCount(0);
  });
});