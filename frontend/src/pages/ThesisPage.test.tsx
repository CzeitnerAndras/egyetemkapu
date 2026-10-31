import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThesisPage from './ThesisPage';

jest.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
        locale: 'hu-HU',
        language: 'hu',
    }),
}));

const report = {
    words: 12,
    characters: 80,
    charactersNoSpaces: 68,
    sentences: 2,
    paragraphs: 1,
    longestSentenceWords: 8,
    longestSentence: 'Ez a hosszabb mondat.',
    readingSeconds: 4,
    readingWpm: 200,
    wordLimit: 250,
    wordsOver: 0,
    wordStatus: 'within',
    characterLimit: null,
    charactersOver: 0,
    characterStatus: 'unset',
};

describe('ThesisPage', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn();
        (globalThis.fetch as jest.Mock).mockImplementation(async (url: RequestInfo | URL) => {
            if (String(url).includes('/health')) {
                return { ok: true, status: 200, json: async () => ({ status: 'ok' }) };
            }
            return { ok: false, status: 500, json: async () => null };
        });
    });

    it('a mintát elküldi a Python szolgáltatásnak, és kiírja a szószámot', async () => {
        (globalThis.fetch as jest.Mock).mockImplementation(async (url: RequestInfo | URL) => {
            if (String(url).includes('/health')) {
                return { ok: true, status: 200, json: async () => ({ status: 'ok' }) };
            }
            return { ok: true, status: 200, json: async () => report };
        });

        const user = userEvent.setup();
        render(<ThesisPage />);

        await user.click(screen.getByRole('button', { name: 'thesis.sample' }));
        await user.click(screen.getByRole('button', { name: 'thesis.check' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/thesis/check',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('összegzése'),
                })
            );
            const call = (globalThis.fetch as jest.Mock).mock.calls.find((item) => item[0] === '/api/thesis/check');
            const body = JSON.parse(call[1].body as string);
            expect(body.wordLimit).toBe(250);
            expect(body.characterLimit).toBeNull();
            expect(screen.getByText('12')).toBeInTheDocument();
            expect(screen.getByText('Ez a hosszabb mondat.')).toBeInTheDocument();
            expect(screen.getByText('thesis.status.within')).toBeInTheDocument();
        });
    });

    it('üres szövegnél nem hívja a szolgáltatást', async () => {
        const user = userEvent.setup();
        render(<ThesisPage />);

        await user.click(screen.getByRole('button', { name: 'thesis.check' }));

        expect(screen.getByText(/thesis\.err\.empty/)).toBeInTheDocument();
        expect(globalThis.fetch).not.toHaveBeenCalledWith('/api/thesis/check', expect.anything());
    });

    it('szól, ha a szolgáltatás nem elérhető', async () => {
        (globalThis.fetch as jest.Mock).mockImplementation(async (url: RequestInfo | URL) => {
            if (String(url).includes('/health')) {
                return { ok: true, status: 200, json: async () => ({ status: 'ok' }) };
            }
            throw new Error('offline');
        });

        const user = userEvent.setup();
        render(<ThesisPage />);
        await user.click(screen.getByRole('button', { name: 'thesis.sample' }));
        await user.click(screen.getByRole('button', { name: 'thesis.check' }));

        await waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('thesis.down');
        });
    });

    it('ha a health nem válaszol, a számolás leáll', async () => {
        (globalThis.fetch as jest.Mock).mockRejectedValue(new Error('offline'));

        render(<ThesisPage />);

        expect(await screen.findByRole('alert')).toHaveTextContent('thesis.down');
        expect(screen.getByRole('button', { name: 'thesis.check' })).toBeDisabled();
    });
});