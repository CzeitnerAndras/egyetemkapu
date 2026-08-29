import { test, expect } from '@playwright/test';

test.describe('Egyetemkapu E2E - Kalkulátor', () => {
  test('Tantárgyak hozzáadása, törlése és súlyozott átlag számítása', async ({ page }) => {
    await page.route('**/api/calculator/weighted-average', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ average: 4 })
      });
    });

    await page.goto('/');
    await page.getByText('KALKULÁTOROK').click();

    const averageForm = page.locator('form').nth(0);
    
    const addSubjectButton = averageForm.locator('button.border-dashed');
    await addSubjectButton.waitFor({ state: 'visible' });
    await addSubjectButton.click();
    
    const textInputs = averageForm.locator('input[type="text"]');
    await expect(textInputs).toHaveCount(3);

    const deleteButtons = averageForm.locator('button').filter({ has: page.locator('.lucide-trash-2') });
    await expect(deleteButtons).toHaveCount(3);
    await deleteButtons.nth(0).click();
    
    await expect(textInputs).toHaveCount(2);

    await textInputs.nth(0).fill('Programozás 1');
    const creditInputs = averageForm.locator('input[type="number"]');
    await creditInputs.nth(0).fill('5');
    const gradeSelects = averageForm.locator('select');
    await gradeSelects.nth(0).selectOption('5');

    await textInputs.nth(1).fill('Analízis 1');
    await creditInputs.nth(1).fill('5');
    await gradeSelects.nth(1).selectOption('3');

    await averageForm.locator('button[type="submit"]').click();

    const resultValue = page.locator('.text-5xl');
    await expect(resultValue).toBeVisible();
    await expect(resultValue).toHaveText('4');
  });
});