import { test, expect, type Page } from '@playwright/test';

const triggerSecretPage = async (page: Page) => {
    await page.goto('/');
    await page.locator('.lucide-menu').first().click();

    const themeButton = page.locator('button.rounded-full');
    await expect(themeButton).toBeVisible();

    await themeButton.evaluate((el) => {
        for (let i = 0; i < 10; i++) {
            el.dispatchEvent(new CloseEvent('click', { bubbles: true, cancelable: true }));
        }
    });

    await expect(page).toHaveURL(/.*S3CR3T/i, { timeout: 10000 });
};

const forceDeterministicRandom = async (page: Page) => {
    await page.addInitScript(() => {
        (globalThis as any).Math.random = () => 0.5;
    });
};

const presetHackedState = async (page: Page) => {
    await page.addInitScript(() => {
        (globalThis as any).localStorage.setItem('terminalHacked', 'true');
    });
};

const waitForTerminalBoot = async (page: Page) => {
    await page.waitForTimeout(7000);
};

test.describe('Egyetemkapu E2E - Easter Egg', () => {
    test('Sötét/Világos mód 10x kattintása aktiválja a Fallout CRT effektet', async ({ page }) => {
        await triggerSecretPage(page);
    });

    test('a terminál feltörő játék megjeleníti a fejlécet, és a boot animáció után 12 szó jelenik meg', async ({ page }) => {
        await triggerSecretPage(page);

        await expect(page.getByText('BANDI INDUSTRIES (TM) TERMLINK PROTOCOL')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('ENTER PASSWORD NOW')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/4 ATTEMPT\(S\) LEFT/)).toBeVisible({ timeout: 10000 });

        await expect(page.locator('span.cursor-pointer')).toHaveCount(12, { timeout: 15000 });
    });

    test('helytelen jelszó próbálkozás esetén csökken a hátralévő próbálkozások száma', async ({ page }) => {
        await forceDeterministicRandom(page);
        await triggerSecretPage(page);
        await waitForTerminalBoot(page);

        await page.getByText('LINKS', { exact: true }).click();

        await expect(page.getByText('> LINKS', { exact: true })).toBeVisible();
        await expect(page.getByText('> Entry denied.')).toBeVisible();
        await expect(page.getByText(/Likeness=/)).toBeVisible();
        await expect(page.getByText(/3 ATTEMPT\(S\) LEFT/)).toBeVisible();
    });

    test('négy egymást követő helytelen próbálkozás után lezárja a terminált', async ({ page }) => {
        await forceDeterministicRandom(page);
        await triggerSecretPage(page);
        await waitForTerminalBoot(page);

        for (const word of ['LINKS', 'FRONT', 'IDEAS', 'REACT']) {
            await page.getByText(word, { exact: true }).click();
            await expect(page.getByText(`> ${word}`, { exact: true })).toBeVisible();
        }

        await expect(page.getByText('> TERMINAL LOCKED')).toBeVisible();
        await expect(page.getByText('> PLEASE CONTACT ADMINISTRATOR')).toBeVisible();
    });

    test('helyes jelszó megadása feloldja a Secret oldalt, és eltárolja a hackelt állapotot', async ({ page }) => {
        await forceDeterministicRandom(page);
        await triggerSecretPage(page);
        await waitForTerminalBoot(page);

        await page.getByText('GAMES', { exact: true }).click();

        await expect(page.getByText('> GAMES', { exact: true })).toBeVisible();
        await expect(page.getByText('> Exact match!')).toBeVisible();
        await expect(page.getByText('> Access granted.')).toBeVisible();

        await expect(async () => {
            const hacked = await page.evaluate(() => (globalThis as any).localStorage.getItem('terminalHacked'));
            expect(hacked).toBe('true');
        }).toPass({ timeout: 5000 });

        await expect(page.getByRole('button', { name: 'run:// details' })).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('button', { name: 'run:// error' })).toBeVisible();
        await expect(page.getByRole('button', { name: '<< Logoff' })).toBeVisible();
    });

    test('a feloldott oldalon a jegyzet modal betöltődik, szerkeszthető és menthető', async ({ page }) => {
        await presetHackedState(page);

        await page.route('**/api/notes', async route => {
            if (route.request().method() === 'GET') {
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            } else {
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 1 }) });
            }
        });

        await triggerSecretPage(page);

        const notesButton = page.getByRole('button', { name: 'run:// details' });
        await expect(notesButton).toBeVisible({ timeout: 15000 });
        await notesButton.click();

        await expect(page.getByText('notes.log')).toBeVisible();

        const noteTextarea = page.locator('textarea');
        await noteTextarea.waitFor({ state: 'visible' });
        await noteTextarea.fill('Playwright E2E jegyzet.');
        await expect(noteTextarea).toHaveValue('Playwright E2E jegyzet.');

        await page.getByRole('button', { name: /sav/i }).click();
        await expect(page.getByRole('button', { name: /sav/i })).toBeEnabled();

        await page.getByTitle('close').click();
        await expect(page.getByText('notes.log')).not.toBeVisible();
    });
});