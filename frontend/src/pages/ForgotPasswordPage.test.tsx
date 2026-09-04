import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from './ForgotPasswordPage';

jest.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
    }),
}));

describe('ForgotPasswordPage Komponens', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn();
        jest.clearAllMocks();
    });

    const renderPage = () =>
        render(
            <MemoryRouter>
                <ForgotPasswordPage />
            </MemoryRouter>
        );

    it('megjeleníti az űrlapot és a bejelentkezés linket', () => {
        renderPage();

        expect(screen.getByText('forgot.title')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'forgot.submit' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'forgot.backToLogin' })).toHaveAttribute('href', '/login');
    });

    it('sikeres kérés esetén általános sikerüzenetet mutat', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ message: 'ok' }),
        });

        const user = userEvent.setup();
        renderPage();

        await user.type(document.querySelector('input[type="email"]') as HTMLInputElement, 'diak@egyetemkapu.hu');
        await user.click(screen.getByRole('button', { name: 'forgot.submit' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/auth/forgot-password',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ email: 'diak@egyetemkapu.hu' }),
                })
            );
            expect(screen.getByText(/forgot\.success/)).toBeInTheDocument();
        });
    });

    it('túl sok kérés esetén rate-limit hibát mutat', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 429,
            json: async () => ({ error: 'lassíts' }),
        });

        const user = userEvent.setup();
        renderPage();

        await user.type(document.querySelector('input[type="email"]') as HTMLInputElement, 'diak@egyetemkapu.hu');
        await user.click(screen.getByRole('button', { name: 'forgot.submit' }));

        await waitFor(() => {
            expect(screen.getByText(/forgot\.rateLimit/)).toBeInTheDocument();
        });
    });

    it('kapcsolódási hiba esetén hibaüzenetet mutat', async () => {
        (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error('offline'));

        const user = userEvent.setup();
        renderPage();

        await user.type(document.querySelector('input[type="email"]') as HTMLInputElement, 'diak@egyetemkapu.hu');
        await user.click(screen.getByRole('button', { name: 'forgot.submit' }));

        await waitFor(() => {
            expect(screen.getByText(/forgot\.serverError/)).toBeInTheDocument();
        });
    });
});
