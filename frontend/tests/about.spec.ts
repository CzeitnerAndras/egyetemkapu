import { test, expect } from '@playwright/test';

test.describe('Egyetemkapu E2E - About', () => {
  test('megjeleníti a fejlesztő és a tech stack adatait', async ({ page }) => {
    await page.goto('/about');

    await expect(page.locator('.lucide-info').first()).toBeVisible();

    await expect(page.getByText('Czeitner András')).toBeVisible();

    await expect(page.getByText('Tech Stack')).toBeVisible();

    const frontendTech = ['React', 'TypeScript', 'TailwindCSS', 'React Router', 'Lucide Icons'];
    for (const tech of frontendTech) {
      await expect(page.getByText(tech, { exact: true })).toBeVisible();
    }

    const backendTech = ['Java', 'Spring Boot', 'REST API', 'PostgreSQL', 'JWT Auth'];
    for (const tech of backendTech) {
      await expect(page.getByText(tech, { exact: true })).toBeVisible();
    }
  });

  test('a négy fő szekció (mit/fejlesztő/funkciók/tech stack) mind megjelenik', async ({ page }) => {
    await page.goto('/about');

    await expect(page.locator('main section')).toHaveCount(4);

    await expect(page.locator('main section').nth(2).locator('li')).toHaveCount(8);
  });
});
