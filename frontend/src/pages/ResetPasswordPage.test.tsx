import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage';

jest.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
    }),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

const VALID_PASSWORD = 'Password1!';

function renderReset(path: string) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/uj-jelszo" element={<ResetPasswordPage />} />
            </Routes>
        </MemoryRouter>
    );
}

describe('ResetPasswordPage Komponens', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn();
        mockNavigate.mockClear();
        jest.clearAllMocks();
    });

    it('token nélkül a hiányzó link üzenetet mutatja, űrlap nélkül', () => {
        renderReset('/uj-jelszo');

        expect(screen.getByText('reset.missingToken')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'reset.submit' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'reset.requestNew' })).toHaveAttribute('href', '/elfelejtett-jelszo');
    });

    it('nem egyező jelszavaknál nem hív fetch-et', async () => {
        const user = userEvent.setup();
        const { container } = renderReset('/uj-jelszo?token=abc');

        const passwords = container.querySelectorAll('input[type="password"]');
        await user.type(passwords[0] as HTMLInputElement, VALID_PASSWORD);
        await user.type(passwords[1] as HTMLInputElement, 'MasPassword1!');
        await user.click(screen.getByRole('button', { name: 'reset.submit' }));

        expect(screen.getByText(/register\.mismatch/)).toBeInTheDocument();
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('gyenge jelszónál nem hív fetch-et', async () => {
        const user = userEvent.setup();
        const { container } = renderReset('/uj-jelszo?token=abc');

        const passwords = container.querySelectorAll('input[type="password"]');
        await user.type(passwords[0] as HTMLInputElement, 'gyenge');
        await user.type(passwords[1] as HTMLInputElement, 'gyenge');
        await user.click(screen.getByRole('button', { name: 'reset.submit' }));

        expect(screen.getByText(/register\.weakPassword/)).toBeInTheDocument();
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('sikeres mentés után elküldi a tokent és átirányít', async () => {
        jest.useFakeTimers();
        try {
            (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'ok' }),
            });

            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            const { container } = renderReset('/uj-jelszo?token=abc');

            const passwords = container.querySelectorAll('input[type="password"]');
            await user.type(passwords[0] as HTMLInputElement, VALID_PASSWORD);
            await user.type(passwords[1] as HTMLInputElement, VALID_PASSWORD);
            await user.click(screen.getByRole('button', { name: 'reset.submit' }));

            await waitFor(() => {
                expect(globalThis.fetch).toHaveBeenCalledWith(
                    '/api/auth/reset-password',
                    expect.objectContaining({
                        method: 'POST',
                        body: JSON.stringify({ token: 'abc', newPassword: VALID_PASSWORD }),
                    })
                );
                expect(screen.getByText(/reset\.success/)).toBeInTheDocument();
            });

            act(() => {
                jest.advanceTimersByTime(2000);
            });
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        } finally {
            jest.useRealTimers();
        }
    });

    it('érvénytelen token esetén a szerver hibáját mutatja', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Érvénytelen vagy lejárt visszaállító link.' }),
        });

        const user = userEvent.setup();
        const { container } = renderReset('/uj-jelszo?token=abc');

        const passwords = container.querySelectorAll('input[type="password"]');
        await user.type(passwords[0] as HTMLInputElement, VALID_PASSWORD);
        await user.type(passwords[1] as HTMLInputElement, VALID_PASSWORD);
        await user.click(screen.getByRole('button', { name: 'reset.submit' }));

        await waitFor(() => {
            expect(screen.getByText(/Érvénytelen vagy lejárt visszaállító link\./)).toBeInTheDocument();
        });
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
