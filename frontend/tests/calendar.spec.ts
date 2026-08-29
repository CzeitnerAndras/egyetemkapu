import { test, expect } from '@playwright/test';

test.describe('Egyetemkapu E2E - Naptár Életút', () => {
  const uniqueId = Date.now();
  const testEmail = `student_${uniqueId}@egyetemkapu.hu`;

  test('Új hallgató regisztrál és felvesz egy vizsgát a naptárba', async ({ page }) => {
    await page.goto('/register');
    
    await page.locator('input[type="text"]').fill(`Student_${uniqueId}`);
    await page.locator('input[type="email"]').fill(testEmail);
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('Vizsga123!');
    await passwordInputs.nth(1).fill('Vizsga123!');
    await page.locator('button[type="submit"]').click();
    
    await expect(page).toHaveURL(/.*login/);

    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill('Vizsga123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('http://localhost:5173/');

    await page.getByRole('link', { name: 'Naptár', exact: true }).first().click();

    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).waitFor({ state: 'visible' });
    await textInputs.nth(0).fill('Playwright E2E Vizsga');
    await textInputs.nth(1).fill('ZH');

    await page.locator('button[type="submit"]').click();

    const successMessage = page.getByText(/Sikeresen/i).first();
    await expect(successMessage).toBeVisible();

    const taskItem = page.getByText('Playwright E2E Vizsga').first();
    await expect(taskItem).toBeVisible();
  });
});