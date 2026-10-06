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

    it('kártyát lehet felvenni a kiválasztott pakliba', async () => {
        const user = userEvent.setup();
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce(json([deck]))
            .mockResolvedValueOnce(json([]))
            .mockResolvedValueOnce(json(card))
            .mockResolvedValueOnce(json([card]))
            .mockResolvedValueOnce(json([deck]));

        render(<FlashcardsPage />);

        await user.click(await screen.findByRole('button', { name: /Analízis/ }));
        expect(await screen.findByText('cards.noCards')).toBeInTheDocument();
        await user.type(screen.getByLabelText('cards.front'), 'Mi a derivált?');
        await user.type(screen.getByLabelText('cards.back'), '2x');
        await user.click(screen.getByRole('button', { name: 'cards.addCard' }));

        expect(await screen.findByText('Mi a derivált?')).toBeInTheDocument();
        expect(screen.getByText('2x')).toBeInTheDocument();
        const post = (globalThis.fetch as jest.Mock).mock.calls.find(
            ([url, options]) => url === '/api/flashcards/decks/1/cards' && options?.method === 'POST'
        );
        expect(JSON.parse(post[1].body)).toEqual({ front: 'Mi a derivált?', back: '2x' });
    });

    it('üres oldalra nem küld mentést', async () => {
        const user = userEvent.setup();
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce(json([deck]))
            .mockResolvedValueOnce(json([]));

        render(<FlashcardsPage />);

        await user.click(await screen.findByRole('button', { name: /Analízis/ }));
        await screen.findByText('cards.noCards');
        await user.type(screen.getByLabelText('cards.front'), 'Mi a derivált?');
        await user.type(screen.getByLabelText('cards.back'), '   ');
        await user.click(screen.getByRole('button', { name: 'cards.addCard' }));

        expect(await screen.findByText('cards.emptySide')).toBeInTheDocument();
        expect((globalThis.fetch as jest.Mock).mock.calls.some(
            ([url, options]) => String(url).includes('/cards') && options?.method === 'POST'
        )).toBe(false);
    });

    it('a szerkesztés a meglévő kártyát küldi el, a mégse kiüríti az űrlapot', async () => {
        const user = userEvent.setup();
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce(json([deck]))
            .mockResolvedValueOnce(json([card]))
            .mockResolvedValueOnce(json({ ...card, front: 'Új kérdés' }))
            .mockResolvedValueOnce(json([{ ...card, front: 'Új kérdés' }]))
            .mockResolvedValueOnce(json([deck]));

        render(<FlashcardsPage />);

        await user.click(await screen.findByRole('button', { name: /Analízis/ }));
        await user.click(await screen.findByRole('button', { name: 'cards.edit' }));
        expect(screen.getByLabelText('cards.front')).toHaveValue('Mi a derivált?');
        await user.clear(screen.getByLabelText('cards.front'));
        await user.type(screen.getByLabelText('cards.front'), 'Új kérdés');
        await user.click(screen.getByRole('button', { name: 'cards.save' }));

        expect(await screen.findByText('Új kérdés')).toBeInTheDocument();
        const put = (globalThis.fetch as jest.Mock).mock.calls.find(
            ([url, options]) => url === '/api/flashcards/cards/5' && options?.method === 'PUT'
        );
        expect(JSON.parse(put[1].body)).toEqual({ front: 'Új kérdés', back: '2x' });

        await user.click(screen.getByRole('button', { name: 'cards.edit' }));
        await user.click(screen.getByRole('button', { name: 'cards.cancel' }));
        expect(screen.getByLabelText('cards.front')).toHaveValue('');
        expect(screen.getByRole('button', { name: 'cards.addCard' })).toBeInTheDocument();
    });

    it('a kártya és a pakli törlése megerősítés után megy ki', async () => {
        const user = userEvent.setup();
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce(json([deck]))
            .mockResolvedValueOnce(json([card]))
            .mockResolvedValueOnce(json({}, true, 200))
            .mockResolvedValueOnce(json([]))
            .mockResolvedValueOnce(json([deck]))
            .mockResolvedValueOnce(json({}, true, 200))
            .mockResolvedValueOnce(json([]));

        render(<FlashcardsPage />);

        await user.click(await screen.findByRole('button', { name: /Analízis/ }));
        await user.click(await screen.findByRole('button', { name: 'cards.delete' }));
        expect(await screen.findByText('cards.noCards')).toBeInTheDocument();
        expect((globalThis.fetch as jest.Mock).mock.calls.some(
            ([url, options]) => url === '/api/flashcards/cards/5' && options?.method === 'DELETE'
        )).toBe(true);

        await user.click(screen.getByRole('button', { name: 'cards.deleteDeck' }));
        expect(await screen.findByText('cards.noDecks')).toBeInTheDocument();
        expect((globalThis.fetch as jest.Mock).mock.calls.some(
            ([url, options]) => url === '/api/flashcards/decks/1' && options?.method === 'DELETE'
        )).toBe(true);
    });

    it('a pakli ismétlése csak annak a paklinak az esedékes kártyáit kéri', async () => {
        const user = userEvent.setup();
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce(json([deck]))
            .mockResolvedValueOnce(json([card]))
            .mockResolvedValueOnce(json([card]));

        render(<FlashcardsPage />);

        await user.click(await screen.findByRole('button', { name: /Analízis/ }));
        await user.click(await screen.findByRole('button', { name: 'cards.reviewDue:1' }));

        expect(await screen.findByText('Mi a derivált?')).toBeInTheDocument();
        expect((globalThis.fetch as jest.Mock).mock.calls.some(
            ([url]) => url === '/api/flashcards/due?deckId=1'
        )).toBe(true);
    });

    it('a sikertelen értékelés a kártyán hagy, és hibát ír', async () => {
        const user = userEvent.setup();
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce(json([deck]))
            .mockResolvedValueOnce(json([card]))
            .mockResolvedValueOnce(json({}, false, 500));

        render(<FlashcardsPage />);

        await user.click(await screen.findByRole('button', { name: 'cards.reviewAll:1' }));
        await user.click(await screen.findByRole('button', { name: 'cards.show' }));
        await user.click(screen.getByRole('button', { name: 'cards.good' }));

        expect(await screen.findByText('cards.reviewError')).toBeInTheDocument();
        expect(screen.getByText('Mi a derivált?')).toBeInTheDocument();
    });

    it('a vissza gomb kilép az ismétlésből', async () => {
        const user = userEvent.setup();
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce(json([deck]))
            .mockResolvedValueOnce(json([card]))
            .mockResolvedValueOnce(json([deck]));

        render(<FlashcardsPage />);

        await user.click(await screen.findByRole('button', { name: 'cards.reviewAll:1' }));
        expect(await screen.findByText('Mi a derivált?')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'cards.backToList' }));

        expect(await screen.findByText('cards.pickDeck')).toBeInTheDocument();
        expect(screen.queryByText('Mi a derivált?')).not.toBeInTheDocument();
    });
});
