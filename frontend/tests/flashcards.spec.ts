import { test, expect } from '@playwright/test';

type Deck = { id: number; name: string; cardCount: number; dueCount: number };
type Card = {
  id: number;
  deckId: number;
  deckName: string;
  front: string;
  back: string;
  intervalDays: number;
};

test.describe('Egyetemkapu E2E - Kártyák', () => {
  test('a /flashcards cím átirányít /kartyak-ra', async ({ page }) => {
    await page.route('**/api/flashcards/**', async (route) => {
      await route.fulfill({ status: 401, json: {} });
    });

    await page.goto('/flashcards');

    await expect(page).toHaveURL(/\/kartyak$/);
  });

  test('bejelentkezés nélkül belépést kér', async ({ page }) => {
    await page.route('**/api/flashcards/**', async (route) => {
      await route.fulfill({ status: 401, json: {} });
    });

    await page.goto('/kartyak');

    await expect(page.getByText('A kártyákhoz be kell jelentkezned.')).toBeVisible();
  });

  test('paklit és kártyát lehet felvenni, a kártya megfordul, és újra lehet kezdeni', async ({ page }) => {
    const decks: Deck[] = [];
    const cards: Card[] = [];

    await page.route('**/api/flashcards/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const method = request.method();

      if (method === 'GET' && path === '/api/flashcards/decks') {
        await route.fulfill({ json: decks });
        return;
      }
      if (method === 'POST' && path === '/api/flashcards/decks') {
        const body = request.postDataJSON() as { name: string };
        const deck = { id: 1, name: body.name, cardCount: cards.length, dueCount: cards.length };
        decks.splice(0, decks.length, deck);
        await route.fulfill({ json: deck });
        return;
      }
      if (method === 'GET' && path === '/api/flashcards/decks/1/cards') {
        await route.fulfill({ json: cards });
        return;
      }
      if (method === 'POST' && path === '/api/flashcards/decks/1/cards') {
        const body = request.postDataJSON() as { front: string; back: string };
        const card = {
          id: 5,
          deckId: 1,
          deckName: decks[0]?.name ?? 'Analízis',
          front: body.front,
          back: body.back,
          intervalDays: 0,
        };
        cards.push(card);
        if (decks[0]) {
          decks[0].cardCount = cards.length;
          decks[0].dueCount = cards.length;
        }
        await route.fulfill({ json: card });
        return;
      }
      if (method === 'GET' && path === '/api/flashcards/due') {
        await route.fulfill({ json: cards });
        return;
      }
      if (method === 'POST' && path === '/api/flashcards/cards/5/review') {
        await route.fulfill({ json: { ...cards[0], intervalDays: 1 } });
        return;
      }
      await route.fulfill({ status: 404, json: {} });
    });

    await page.goto('/kartyak');
    await expect(page.getByText('Még nincs paklid.')).toBeVisible();
    await page.getByLabel('Pakli neve').fill('Analízis');
    await page.getByRole('button', { name: 'Új pakli' }).click();
    await expect(page.getByText('Ebben a pakliban még nincs kártya.')).toBeVisible();

    await page.getByLabel('Kérdés').fill('Mi a derivált?');
    await page.getByLabel('Válasz').fill('2x');
    await page.getByRole('button', { name: 'Kártya hozzáadása' }).click();
    await expect(page.getByText('Mi a derivált?', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Ismétlés (1)' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Mi a derivált?' }).click();
    await expect(dialog.getByRole('button', { name: '2x' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Következő kérdés' }).click();
    await expect(dialog.getByRole('button', { name: 'Mi a derivált?' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Bezárás' }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: 'Ismétlés (1)' }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Mi a derivált?' })).toBeVisible();
  });
});
