import { test, expect } from '@playwright/test';

test.describe('Egyetemkapu E2E - Fókusz Szoba', () => {
  test('induláskor 25:00-tól indul a fókusz időzítő', async ({ page }) => {
    await page.goto('/fokusz');

    await expect(page.locator('.lucide-brain-circuit').first()).toBeVisible();
    await expect(page.locator('.tabular-nums')).toHaveText('25:00');
    await expect(page.locator('.lucide-play')).toBeVisible();
  });

  test('a szünet módra váltás 5:00-ra állítja az időzítőt, a fókusz mód vissza 25:00-ra', async ({ page }) => {
    await page.goto('/fokusz');

    const modeToggle = page.locator('div.rounded-full button');
    await expect(modeToggle).toHaveCount(2);

    await modeToggle.nth(1).click();
    await expect(page.locator('.tabular-nums')).toHaveText('05:00');

    await modeToggle.nth(0).click();
    await expect(page.locator('.tabular-nums')).toHaveText('25:00');
  });

  test('indítás gombra kattintva elindul a visszaszámlálás, majd a reset visszaállítja', async ({ page }) => {
    await page.goto('/fokusz');

    const timeDisplay = page.locator('.tabular-nums');
    const startPauseButton = page.locator('.lucide-play, .lucide-pause').locator('..');

    await startPauseButton.click();
    await expect(page.locator('.lucide-pause')).toBeVisible();

    await expect(async () => {
      const text = await timeDisplay.textContent();
      expect(text).not.toBe('25:00');
    }).toPass({ timeout: 5000 });

    await page.locator('.lucide-rotate-ccw').locator('..').click();
    await expect(timeDisplay).toHaveText('25:00');
    await expect(page.locator('.lucide-play')).toBeVisible();
  });

  test('a gyorsjegyzet mezőbe és az új feladat mezőbe be lehet gépelni', async ({ page }) => {
    await page.goto('/fokusz');

    const noteTextarea = page.locator('textarea');
    await noteTextarea.fill('Teszt jegyzet tartalma');
    await expect(noteTextarea).toHaveValue('Teszt jegyzet tartalma');

    const taskInput = page.locator('form input[type="text"]');
    await taskInput.fill('Teszt feladat');
    await expect(taskInput).toHaveValue('Teszt feladat');
  });
});
