import { test, expect } from '@playwright/test';

test.describe('Egyetemkapu E2E - Autentikációs folyamat', () => {
  const uniqueId = Date.now();
  const testUsername = `e2e_user_${uniqueId}`;
  const testEmail = `${testUsername}@egyetemkapu.hu`;
  const testPassword = 'Titkos123!';

  test('Teljes folyamat: Regisztráció majd sikeres bejelentkezés', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('input[type="text"]', testUsername);
    await page.fill('input[type="email"]', testEmail);
    
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill(testPassword);
    await passwordInputs.nth(1).fill(testPassword);
    
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('http://localhost:5173/login');

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('http://localhost:5173/');

    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('Hibás bejelentkezés esetén valós hibaüzenet jelenik meg', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'nemletezo.user@email.hu');
    await page.fill('input[type="password"]', 'RosszJelszo!');
    
    await page.click('button[type="submit"]');

    const errorMessage = page.getByText(/hiba/i);
    await expect(errorMessage).toBeVisible();
    
    await expect(page).toHaveURL('http://localhost:5173/login');
  });
});