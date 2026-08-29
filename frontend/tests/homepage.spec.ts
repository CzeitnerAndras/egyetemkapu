import { test, expect } from '@playwright/test';

test.describe('Egyetemkapu E2E - Home', () => {
  test('megjeleníti az üdvözlő szekciót, a mini AI keresőt és a napi vicc/tipp kártyákat', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.lucide-zap').first()).toBeVisible();

    const aiInput = page.locator('main form input[type="text"]').first();
    await expect(aiInput).toBeVisible();

    const jokeTipSection = page.locator('main > div').nth(1);
    const paragraphs = jokeTipSection.locator('p');
    await expect(paragraphs).toHaveCount(2);
    await expect(paragraphs.nth(0)).not.toHaveText('');
    await expect(paragraphs.nth(1)).not.toHaveText('');
  });

  test('a mini AI keresőbe gépelt szöveg elküldve átirányít az AI oldalra és megjelenik a beszélgetésben', async ({ page }) => {
    await page.goto('/');

    const aiInput = page.locator('main form input[type="text"]').first();
    const prompt = 'Segíts megoldani egy másodfokú egyenletet';
    await aiInput.fill(prompt);
    await aiInput.press('Enter');

    await expect(page).toHaveURL(/\/ai$/);

    await expect(page.getByText(prompt)).toBeVisible();
  });

  test('üres AI kereséssel nem navigál el', async ({ page }) => {
    await page.goto('/');

    const aiInput = page.locator('main form input[type="text"]').first();
    await aiInput.press('Enter');

    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/$/);
  });

  test('megjeleníti a rendszerstatisztika ikonjait', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.lucide-users').first()).toBeVisible();
    await expect(page.locator('.lucide-calculator').first()).toBeVisible();
    await expect(page.locator('.lucide-file-text').first()).toBeVisible();
  });

  test('a hírek szekció betöltődik, és ha van hír, kártyára kattintva megnyílik/bezárható a modal', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.lucide-megaphone').first()).toBeVisible();

    await expect(page.locator('main div.h-40')).toHaveCount(0, { timeout: 15000 });

    const newsCards = page.locator('main .group.cursor-pointer');
    const count = await newsCards.count();

    test.skip(count === 0, 'Nincs elérhető hír a teszt környezetben - a modal teszt kihagyva.');

    await newsCards.first().click();

    const closeButton = page.locator('.lucide-x').last();
    await expect(closeButton).toBeVisible();

    await closeButton.click();
    await expect(page.locator('.lucide-x')).toHaveCount(0);
  });
});