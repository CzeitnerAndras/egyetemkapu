import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IdeaBoxPage from './IdeaBoxPage';

jest.mock('../i18n/LanguageContext', () => {
    const translate = (key: string) => key;
    return {
        useLanguage: () => ({ t: translate }),
    };
});

describe('IdeaBoxPage Komponens', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn();
        localStorage.clear();
        jest.clearAllMocks();
    });

    it('megjeleníti a címet és a bevezető szöveget', () => {
        render(<IdeaBoxPage />);

        expect(screen.getByText('idea.title')).toBeInTheDocument();
        expect(screen.getByText(/idea\.intro/)).toBeInTheDocument();
    });

    it('bejelentkezés nélkül nem küldi el az ötletet, és hibaüzenetet jelez', async () => {
        const user = userEvent.setup();
        render(<IdeaBoxPage />);

        await user.type(screen.getByPlaceholderText('idea.titlePlaceholder'), 'Több zöld terület');
        await user.type(screen.getByPlaceholderText('idea.descPlaceholder'), 'Legyen park az egyetem mellett.');
        await user.click(screen.getByRole('button', { name: 'idea.submit' }));

        await waitFor(() => {
            expect(screen.getByText('idea.needLogin')).toBeInTheDocument();
        });
        expect(globalThis.fetch).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'idea.submit' })).not.toBeDisabled();
    });

    it('bejelentkezve elküldi az ötletet, sikeres üzenetet mutat, és üríti az űrlapot', async () => {
        localStorage.setItem('token', 'test-token');

        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        });

        const user = userEvent.setup();
        render(<IdeaBoxPage />);

        const titleInput = screen.getByPlaceholderText('idea.titlePlaceholder');
        const descInput = screen.getByPlaceholderText('idea.descPlaceholder');

        await user.type(titleInput, 'Több zöld terület');
        await user.type(descInput, 'Legyen park az egyetem mellett.');
        await user.click(screen.getByRole('button', { name: 'idea.submit' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/suggestions',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer test-token',
                    },
                    body: JSON.stringify({
                        title: 'Több zöld terület',
                        description: 'Legyen park az egyetem mellett.',
                    }),
                })
            );
            expect(screen.getByText('idea.thanks')).toBeInTheDocument();
        });

        expect(titleInput).toHaveValue('');
        expect(descInput).toHaveValue('');
    });

    it('hibaüzenetet jelez, ha a szerver elutasítja az ötletet', async () => {
        localStorage.setItem('token', 'test-token');

        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({}),
        });

        const user = userEvent.setup();
        render(<IdeaBoxPage />);

        await user.type(screen.getByPlaceholderText('idea.titlePlaceholder'), 'Cím');
        await user.type(screen.getByPlaceholderText('idea.descPlaceholder'), 'Leírás');
        await user.click(screen.getByRole('button', { name: 'idea.submit' }));

        await waitFor(() => {
            expect(screen.getByText('idea.sendError')).toBeInTheDocument();
        });
    });

    it('hibaüzenetet jelez, ha a kérés kapcsolódási hiba miatt elbukik', async () => {
        localStorage.setItem('token', 'test-token');

        (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));

        const user = userEvent.setup();
        render(<IdeaBoxPage />);

        await user.type(screen.getByPlaceholderText('idea.titlePlaceholder'), 'Cím');
        await user.type(screen.getByPlaceholderText('idea.descPlaceholder'), 'Leírás');
        await user.click(screen.getByRole('button', { name: 'idea.submit' }));

        await waitFor(() => {
            expect(screen.getByText('idea.serverError')).toBeInTheDocument();
        });
    });

    it('küldés közben letiltja a gombot, és a "sending" feliratot mutatja', async () => {
        localStorage.setItem('token', 'test-token');

        let resolveFetch: (value: unknown) => void = () => { };
        (globalThis.fetch as jest.Mock).mockReturnValueOnce(
            new Promise((resolve) => {
                resolveFetch = resolve;
            })
        );

        const user = userEvent.setup();
        render(<IdeaBoxPage />);

        await user.type(screen.getByPlaceholderText('idea.titlePlaceholder'), 'Cím');
        await user.type(screen.getByPlaceholderText('idea.descPlaceholder'), 'Leírás');
        await user.click(screen.getByRole('button', { name: 'idea.submit' }));

        const pendingButton = screen.getByRole('button', { name: 'idea.sending' });
        expect(pendingButton).toBeDisabled();

        resolveFetch({ ok: true, json: async () => ({}) });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'idea.submit' })).not.toBeDisabled();
        });
    });
});