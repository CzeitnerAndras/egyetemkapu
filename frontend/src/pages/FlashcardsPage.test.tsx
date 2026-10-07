import { render, screen, within } from '@testing-library/react';
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

    it('a kártya kattintásra megfordul, a nyíl pedig a következőre visz', async () => {
        const second = { ...card, id: 6, front: 'Mi az integrál?', back: 'terület' };
        const user = userEvent.setup();
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce(json([{ ...deck, cardCount: 2, dueCount: 0 }]))
            .mockResolvedValueOnce(json([card, second]));

        render(<FlashcardsPage />);

        await user.click(await screen.findByRole('button', { name: 'cards.reviewAll:2' }));
        const dialog = await screen.findByRole('dialog');
        await user.click(within(dialog).getByRole('button', { name: 'Mi a derivált?' }));
        expect(within(dialog).getByRole('button', { name: '2x' })).toBeInTheDocument();

        await user.click(within(dialog).getByRole('button', { name: 'cards.next' }));
        expect(within(dialog).getByRole('button', { name: 'Mi az integrál?' })).toBeInTheDocument();
        expect(within(dialog).queryByRole('button', { name: '2x' })).not.toBeInTheDocument();

        await user.click(within(dialog).getByRole('button', { name: 'Mi az integrál?' }));
        await user.click(within(dialog).getByRole('button', { name: 'cards.next' }));
        expect(within(dialog).getByRole('button', { name: 'Mi a derivált?' })).toBeInTheDocument();
        expect((globalThis.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes('/due'))).toBe(false);
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

    it('a pakli ismétlése minden kártyát megnyit, akkor is, ha semmi sem esedékes', async () => {
        const user = userEvent.setup();
        (globalThis.fetch as jest.Mock).mockImplementation((url: string) => {
            if (url === '/api/flashcards/decks') {
                return Promise.resolve(json([{ ...deck, dueCount: 0, cardCount: 1 }]));
            }
            if (url === '/api/flashcards/decks/1/cards') {
                return Promise.resolve(json([card]));
            }
            return Promise.resolve(json({}, false, 404));
        });

        render(<FlashcardsPage />);

        await user.click(await screen.findByRole('button', { name: /Analízis/ }));
        await user.click(await screen.findByRole('button', { name: 'cards.reviewDue:1' }));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByRole('button', { name: 'Mi a derivált?' })).toBeInTheDocument();
        expect((globalThis.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes('/due'))).toBe(false);

        await user.click(within(dialog).getByRole('button', { name: 'cards.close' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'cards.reviewDue:1' }));
        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mi a derivált?' })).toBeInTheDocument();
    });

    it('a sikertelen betöltés nem nyit kártyát', async () => {
        const user = userEvent.setup();
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce(json([deck]))
            .mockResolvedValueOnce(json({}, false, 500));

        render(<FlashcardsPage />);

        await user.click(await screen.findByRole('button', { name: 'cards.reviewAll:1' }));

        expect(await screen.findByText('cards.loadError')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('a bezárás kilép az ismétlésből', async () => {
        const user = userEvent.setup();
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce(json([deck]))
            .mockResolvedValueOnce(json([card]));

        render(<FlashcardsPage />);

        await user.click(await screen.findByRole('button', { name: 'cards.reviewAll:1' }));
        expect(await screen.findByRole('button', { name: 'Mi a derivált?' })).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'cards.close' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Mi a derivált?' })).not.toBeInTheDocument();
        expect(screen.getByText('cards.pickDeck')).toBeInTheDocument();
    });
});
