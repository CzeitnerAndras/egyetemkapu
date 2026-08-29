import { test, expect } from '@playwright/test';

test.describe('Egyetemkapu E2E - Tudástár', () => {
  test('Dokumentumok listázása és kategória szűrése', async ({ page }) => {
    await page.route('**/api/documents*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, title: 'Matek Jegyzet 2026', category: 'Matematika', uploader: { username: 'e2e_tester' } },
          { id: 2, title: 'Szoftverfejlesztés 1', category: 'Informatika', uploader: { username: 'e2e_tester' } }
        ])
      });
    });

    await page.goto('/');
    await page.getByRole('link', { name: /Tudástár/i }).first().click();

    await expect(page.getByText('Matek Jegyzet 2026')).toBeVisible();
    await expect(page.getByText('Szoftverfejlesztés 1')).toBeVisible();

    await page.getByText('MINDEN KATEGÓRIA').click();
    await page.getByRole('button', { name: 'Matematika', exact: true }).click();
    
    await expect(page.getByText('Matek Jegyzet 2026')).toBeVisible();
  });
});