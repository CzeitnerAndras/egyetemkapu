import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIAssistantPage from './AIAssistantPage';

jest.mock('../i18n/LanguageContext', () => {
    const translate = (key: string) => key;
    return {
        useLanguage: () => ({ t: translate }),
    };
});

describe('AIAssistantPage Komponens', () => {
    beforeAll(() => {
        window.HTMLElement.prototype.scrollIntoView = jest.fn();
    });

    beforeEach(() => {
        globalThis.fetch = jest.fn();
        localStorage.clear();
        jest.clearAllMocks();
        document.documentElement.classList.remove('secret');
    });

    it('kezdéskor megjeleníti az üdvözlő üzenetet és a címet', () => {
        render(<AIAssistantPage />);

        expect(screen.getByText('ai.title')).toBeInTheDocument();
        expect(screen.getByText('ai.welcome')).toBeInTheDocument();
    });

    it('üres üzenetet nem küld el', async () => {
        const user = userEvent.setup();
        render(<AIAssistantPage />);

        await user.click(screen.getByRole('button', { name: 'ai.send' }));

        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('elküldi az üzenetet, és megjeleníti az AI válaszát', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ answer: 'Szia! Ez egy válasz.' }),
        });

        const user = userEvent.setup();
        render(<AIAssistantPage />);

        await user.type(screen.getByPlaceholderText('ai.placeholder'), 'Mi a helyzet?');
        await user.click(screen.getByRole('button', { name: 'ai.send' }));

        expect(screen.getByText('> Mi a helyzet?')).toBeInTheDocument();

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/ai/ask',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer null',
                    },
                    body: JSON.stringify({ prompt: 'Mi a helyzet?' }),
                })
            );
            expect(screen.getByText('Szia! Ez egy válasz.')).toBeInTheDocument();
        });
    });

    it('bejelentkezett tokennel az Authorization fejlécben küldi el a kérést', async () => {
        localStorage.setItem('token', 'test-token');

        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ answer: 'Válasz' }),
        });

        const user = userEvent.setup();
        render(<AIAssistantPage />);

        await user.type(screen.getByPlaceholderText('ai.placeholder'), 'Kérdés');
        await user.click(screen.getByRole('button', { name: 'ai.send' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/ai/ask',
                expect.objectContaining({
                    headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
                })
            );
        });
    });

    it('bejelentkezési hibát jelez, ha a szerver 401-et ad vissza', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: async () => ({}),
        });

        const user = userEvent.setup();
        render(<AIAssistantPage />);

        await user.type(screen.getByPlaceholderText('ai.placeholder'), 'Kérdés');
        await user.click(screen.getByRole('button', { name: 'ai.send' }));

        await waitFor(() => {
            expect(
                screen.getByText('Kérlek, jelentkezz be a funkció használatához!')
            ).toBeInTheDocument();
        });
    });

    it('általános hibaüzenetet jelez, ha a kérés elbukik', async () => {
        (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));

        const user = userEvent.setup();
        render(<AIAssistantPage />);

        await user.type(screen.getByPlaceholderText('ai.placeholder'), 'Kérdés');
        await user.click(screen.getByRole('button', { name: 'ai.send' }));

        await waitFor(() => {
            expect(screen.getByText('ai.error')).toBeInTheDocument();
        });
    });

    it('letiltja a beviteli mezőt és a küldés gombot, amíg a válasz megérkezik', async () => {
        let resolveFetch: (value: unknown) => void = () => { };
        (globalThis.fetch as jest.Mock).mockReturnValueOnce(
            new Promise((resolve) => {
                resolveFetch = resolve;
            })
        );

        const user = userEvent.setup();
        render(<AIAssistantPage />);

        const input = screen.getByPlaceholderText('ai.placeholder');
        await user.type(input, 'Kérdés');
        await user.click(screen.getByRole('button', { name: 'ai.send' }));

        expect(input).toBeDisabled();
        expect(screen.getByRole('button', { name: 'ai.send' })).toBeDisabled();

        resolveFetch({
            ok: true,
            status: 200,
            json: async () => ({ answer: 'Kész válasz' }),
        });

        await waitFor(() => {
            expect(input).not.toBeDisabled();
            expect(screen.getByText('Kész válasz')).toBeInTheDocument();
        });
    });

    it('betöltéskor automatikusan elküldi a localStorage-ban várakozó promptot, majd törli azt', async () => {
        localStorage.setItem('pendingAiPrompt', 'Automatikus kérdés');

        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ answer: 'Automatikus válasz' }),
        });

        render(<AIAssistantPage />);

        await waitFor(() => {
            expect(screen.getByText('> Automatikus kérdés')).toBeInTheDocument();
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/ai/ask',
                expect.objectContaining({
                    body: JSON.stringify({ prompt: 'Automatikus kérdés' }),
                })
            );
            expect(screen.getByText('Automatikus válasz')).toBeInTheDocument();
        });

        expect(localStorage.getItem('pendingAiPrompt')).toBeNull();
    });
});