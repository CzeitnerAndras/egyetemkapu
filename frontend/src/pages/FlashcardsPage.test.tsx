import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FlashcardsPage from './FlashcardsPage';

jest.mock('../i18n/LanguageContext', () => {
    const t = (key: string, vars?: Record<string, string | number>) =>
        vars && vars.count !== undefined ? `${key}:${vars.count}` : key;
    return {
        useLanguage: () => ({ t }),
    };
});

const deck = { id: 1, name: 'Analízis', cardCount: 1, dueCount: 1 };
const card = {
    id: 5,
    deckId: 1,
    deckName: 'Analízis',
    front: 'Mi a derivált?',
    back: '2x',
    intervalDays: 0,
};

function json(body: unknown, ok = true, status = 200) {
    return { ok, status, json: async () => body };
}

describe('FlashcardsPage', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn();
        window.confirm = jest.fn(() => true);
    });

    it('bejelentkezés nélkül belépést kér', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValue(json({}, false, 401));

        render(<FlashcardsPage />);

        expect(await screen.findByText('cards.needLogin')).toBeInTheDocument();
    });

    it('új paklit lehet felvenni, és utána a kártyalista jelenik meg', async () => {
        const user = userEvent.setup();
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce(json([]))
            .mockResolvedValueOnce(json({ id: 1, name: 'Analízis', cardCount: 0, dueCount: 0 }))
            .mockResolvedValueOnce(json([{ id: 1, name: 'Analízis', cardCount: 0, dueCount: 0 }]))
            .mockResolvedValueOnce(json([]));

        render(<FlashcardsPage />);

        expect(await screen.findByText('cards.noDecks')).toBeInTheDocument();
        await user.type(screen.getByLabelText('cards.deckName'), 'Analízis');
        await user.click(screen.getByRole('button', { name: 'cards.addDeck' }));

        expect(await screen.findByRole('button', { name: /Analízis/ })).toBeInTheDocument();
        expect(await screen.findByText('cards.noCards')).toBeInTheDocument();

        const post = (globalThis.fetch as jest.Mock).mock.calls.find(
            ([url, options]) => url === '/api/flashcards/decks' && options?.method === 'POST'
        );
        expect(JSON.parse(post[1].body)).toEqual({ name: 'Analízis' });
    });

    it('a tudom gomb kiveszi a kártyát a sorból', async () => {
        const user = userEvent.setup();
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce(json([deck]))
            .mockResolvedValueOnce(json([card]))
            .mockResolvedValueOnce(json({ ...card, intervalDays: 1 }))
            .mockResolvedValueOnce(json([{ ...deck, dueCount: 0 }]));

        render(<FlashcardsPage />);

        await user.click(await screen.findByRole('button', { name: 'cards.reviewAll:1' }));
        expect(await screen.findByText('Mi a derivált?')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'cards.show' }));
        expect(screen.getByText('2x')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'cards.good' }));
        expect(await screen.findByText('cards.noneDue')).toBeInTheDocument();

        const review = (globalThis.fetch as jest.Mock).mock.calls.find(
            ([url]) => url === '/api/flashcards/cards/5/review'
        );
        expect(review[1].method).toBe('POST');
        expect(JSON.parse(review[1].body)).toEqual({ rating: 'good' });
        expect(review[1].credentials).toBe('include');
    });

    it('az újra a sor végére teszi a kártyát, és a következő jön', async () => {
        const second = { ...card, id: 6, front: 'Mi az integrál?', back: 'terület' };
        const user = userEvent.setup();
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce(json([{ ...deck, cardCount: 2, dueCount: 2 }]))
            .mockResolvedValueOnce(json([card, second]))
            .mockResolvedValueOnce(json({ ...card, intervalDays: 0 }))
            .mockResolvedValueOnce(json({ ...second, intervalDays: 1 }));

        render(<FlashcardsPage />);

        await user.click(await screen.findByRole('button', { name: 'cards.reviewAll:2' }));
        expect(await screen.findByText('Mi a derivált?')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'cards.show' }));
        await user.click(screen.getByRole('button', { name: 'cards.again' }));
        expect(await screen.findByText('Mi az integrál?')).toBeInTheDocument();
        expect(screen.queryByText('Mi a derivált?')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'cards.show' }));
        await user.click(screen.getByRole('button', { name: 'cards.good' }));
        expect(await screen.findByText('Mi a derivált?')).toBeInTheDocument();
        expect(screen.queryByText('2x')).not.toBeInTheDocument();
    });
});
