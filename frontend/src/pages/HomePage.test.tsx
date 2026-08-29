import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from './HomePage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

jest.mock('../i18n/LanguageContext', () => {
    const translate = (key: string) => key;
    return {
        useLanguage: () => ({ t: translate, locale: 'hu-HU', language: 'hu' }),
    };
});

class IntersectionObserverMock implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = '';
    readonly scrollMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
    takeRecords = jest.fn(() => []);
}

const mockFetchByUrl = (responses: Record<string, unknown>) => {
    (globalThis.fetch as jest.Mock).mockImplementation((url: string) => {
        const key = Object.keys(responses).find((k) => url.includes(k));
        if (key) {
            return Promise.resolve(responses[key]);
        }
        return Promise.resolve({ ok: true, json: async () => [] });
    });
};

describe('HomePage Komponens', () => {
    beforeAll(() => {
        window.IntersectionObserver = IntersectionObserverMock;
    });

    beforeEach(() => {
        globalThis.fetch = jest.fn();
        localStorage.clear();
        jest.clearAllMocks();
    });

    it('betöltés közben a hírek töltés szövegét jeleníti meg', () => {
        mockFetchByUrl({ '/api/events': new Promise(() => { }) });
        render(<HomePage />);

        expect(screen.getByText('home.loadingNews')).toBeInTheDocument();
    });

    it('lekéri a híreket a megfelelő végpontról, token nélkül nem hívja az admin ellenőrzést', async () => {
        mockFetchByUrl({ '/api/events': { ok: true, json: async () => [] } });

        render(<HomePage />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith('/api/events');
        });
        expect(globalThis.fetch).not.toHaveBeenCalledWith(
            expect.stringContaining('/api/users/me'),
            expect.anything()
        );
    });

    it('bejelentkezett felhasználó esetén lekéri a felhasználói adatokat is', async () => {
        localStorage.setItem('token', 'test-token');
        mockFetchByUrl({
            '/api/events': { ok: true, json: async () => [] },
            '/api/users/me': { ok: true, json: async () => ({ role: 'USER' }) },
        });

        render(<HomePage />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/users/me',
                expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
            );
        });
    });

    it('üres hírlista esetén a noNews placeholdert jeleníti meg', async () => {
        mockFetchByUrl({ '/api/events': { ok: true, json: async () => [] } });

        render(<HomePage />);

        await waitFor(() => {
            expect(screen.getByText(/home\.noNews/)).toBeInTheDocument();
        });
    });

    it('megjeleníti a lekért híreket', async () => {
        mockFetchByUrl({
            '/api/events': {
                ok: true,
                json: async () => [
                    { id: 1, title: 'Félévnyitó rendezvény', description: 'Részletek a hírben.', eventDate: '2026-09-01T10:00:00' },
                ],
            },
        });

        render(<HomePage />);

        await waitFor(() => {
            expect(screen.getByText('Félévnyitó rendezvény')).toBeInTheDocument();
        });
    });

    it('hiba esetén a hírek lekérésekor üres listát jelenít meg, nem omlik össze', async () => {
        (globalThis.fetch as jest.Mock).mockImplementation((url: string) => {
            if (url.includes('/api/events')) {
                return Promise.reject(new Error('network down'));
            }
            return Promise.resolve({ ok: true, json: async () => [] });
        });

        render(<HomePage />);

        await waitFor(() => {
            expect(screen.getByText(/home\.noNews/)).toBeInTheDocument();
        });
    });

    it('lekéri a statisztikai adatokat (regisztrált felhasználók, dokumentumok, megoldott egyenletek) hitelesítés nélkül', async () => {
        mockFetchByUrl({
            '/api/events': { ok: true, json: async () => [] },
            '/api/users/count': { ok: true, json: async () => ({ count: 42 }) },
            '/api/documents': { ok: true, json: async () => [{ id: 1 }, { id: 2 }] },
            '/api/tools/calculator/count': { ok: true, json: async () => ({ count: 153 }) },
        });

        render(<HomePage />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith('/api/users/count');
            expect(globalThis.fetch).toHaveBeenCalledWith('/api/documents');
            expect(globalThis.fetch).toHaveBeenCalledWith('/api/tools/calculator/count');
        });
    });

    it('a statisztikai végpontok hibája esetén sem omlik össze az oldal', async () => {
        (globalThis.fetch as jest.Mock).mockImplementation((url: string) => {
            if (url.includes('/api/events')) {
                return Promise.resolve({ ok: true, json: async () => [] });
            }
            return Promise.reject(new Error('stats service down'));
        });

        render(<HomePage />);

        await waitFor(() => {
            expect(screen.getByText(/home\.noNews/)).toBeInTheDocument();
        });
    });

    it('kattintásra megnyitja a hír részleteit tartalmazó modalt, majd bezárja', async () => {
        mockFetchByUrl({
            '/api/events': {
                ok: true,
                json: async () => [
                    { id: 1, title: 'Nyílt nap', description: 'Bővebb leírás a nyílt napról.', eventDate: '2026-10-05T10:00:00' },
                ],
            },
        });

        render(<HomePage />);
        await waitFor(() => expect(screen.getByText('Nyílt nap')).toBeInTheDocument());

        const user = userEvent.setup();
        await user.click(screen.getByText('Nyílt nap'));

        await waitFor(() => {
            expect(screen.getByRole('heading', { level: 1, name: 'Nyílt nap' })).toBeInTheDocument();
        });
        expect(screen.getAllByText('Bővebb leírás a nyílt napról.')).toHaveLength(2);

        const closeButtons = screen.getAllByRole('button');
        const closeButton = closeButtons.find((btn) => btn.querySelector('svg.lucide-x'));
        expect(closeButton).toBeDefined();
        await user.click(closeButton as HTMLElement);

        await waitFor(() => {
            expect(screen.queryByRole('heading', { level: 1, name: 'Nyílt nap' })).not.toBeInTheDocument();
        });
        expect(screen.getAllByText('Bővebb leírás a nyílt napról.')).toHaveLength(1);
    });

    it('admin jogosultság esetén megjeleníti a hír törlés gombot, sima felhasználónál nem', async () => {
        localStorage.setItem('token', 'test-token');
        mockFetchByUrl({
            '/api/events': {
                ok: true,
                json: async () => [{ id: 1, title: 'Admin hír', description: 'Leírás.', eventDate: '2026-10-05T10:00:00' }],
            },
            '/api/users/me': { ok: true, json: async () => ({ role: 'ADMIN' }) },
        });

        render(<HomePage />);

        await waitFor(() => {
            expect(screen.getByTitle('Hír törlése')).toBeInTheDocument();
        });
    });

    it('nem admin felhasználónál nem jelenik meg a hír törlés gomb', async () => {
        localStorage.setItem('token', 'test-token');
        mockFetchByUrl({
            '/api/events': {
                ok: true,
                json: async () => [{ id: 1, title: 'Felhasználói hír', description: 'Leírás.', eventDate: '2026-10-05T10:00:00' }],
            },
            '/api/users/me': { ok: true, json: async () => ({ role: 'USER' }) },
        });

        render(<HomePage />);

        await waitFor(() => expect(screen.getByText('Felhasználói hír')).toBeInTheDocument());
        expect(screen.queryByTitle('Hír törlése')).not.toBeInTheDocument();
    });

    it('admin megerősítés után törli a hírt a listából', async () => {
        localStorage.setItem('token', 'test-token');
        mockFetchByUrl({
            '/api/events': {
                ok: true,
                json: async () => [{ id: 1, title: 'Törlendő hír', description: 'Leírás.', eventDate: '2026-10-05T10:00:00' }],
            },
            '/api/users/me': { ok: true, json: async () => ({ role: 'ADMIN' }) },
        });
        jest.spyOn(window, 'confirm').mockReturnValue(true);

        render(<HomePage />);
        await waitFor(() => expect(screen.getByTitle('Hír törlése')).toBeInTheDocument());

        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        const user = userEvent.setup();
        await user.click(screen.getByTitle('Hír törlése'));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/events/1',
                expect.objectContaining({ method: 'DELETE', headers: { Authorization: 'Bearer test-token' } })
            );
            expect(screen.queryByText('Törlendő hír')).not.toBeInTheDocument();
        });
    });

    it('megerősítés elutasítása esetén nem törli a hírt', async () => {
        localStorage.setItem('token', 'test-token');
        mockFetchByUrl({
            '/api/events': {
                ok: true,
                json: async () => [{ id: 1, title: 'Megmaradó hír', description: 'Leírás.', eventDate: '2026-10-05T10:00:00' }],
            },
            '/api/users/me': { ok: true, json: async () => ({ role: 'ADMIN' }) },
        });
        jest.spyOn(window, 'confirm').mockReturnValue(false);

        render(<HomePage />);
        await waitFor(() => expect(screen.getByTitle('Hír törlése')).toBeInTheDocument());

        const user = userEvent.setup();
        await user.click(screen.getByTitle('Hír törlése'));

        expect(screen.getByText('Megmaradó hír')).toBeInTheDocument();
        expect(globalThis.fetch).not.toHaveBeenCalledWith(
            expect.stringContaining('/api/events/1'),
            expect.objectContaining({ method: 'DELETE' })
        );
    });

    it('AI kereső beküldésekor elmenti a promptot és a /ai oldalra navigál', async () => {
        mockFetchByUrl({ '/api/events': { ok: true, json: async () => [] } });

        render(<HomePage />);
        await waitFor(() => expect(screen.getByText(/home\.noNews/)).toBeInTheDocument());

        const input = screen.getByPlaceholderText('home.aiPlaceholder');
        const user = userEvent.setup();
        await user.type(input, 'Mikor van a vizsgaidőszak?');
        await user.type(input, '{Enter}');

        expect(localStorage.getItem('pendingAiPrompt')).toBe('Mikor van a vizsgaidőszak?');
        expect(mockNavigate).toHaveBeenCalledWith('/ai');
    });

    it('üres AI kereső beküldésekor nem navigál sehova', async () => {
        mockFetchByUrl({ '/api/events': { ok: true, json: async () => [] } });

        render(<HomePage />);
        await waitFor(() => expect(screen.getByText(/home\.noNews/)).toBeInTheDocument());

        const input = screen.getByPlaceholderText('home.aiPlaceholder');
        const user = userEvent.setup();
        await user.type(input, '   ');
        await user.type(input, '{Enter}');

        expect(mockNavigate).not.toHaveBeenCalled();
        expect(localStorage.getItem('pendingAiPrompt')).toBeNull();
    });
});