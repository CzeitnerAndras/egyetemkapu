import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegistrationPage from './RegistrationPage';

jest.mock('../i18n/LanguageContext', () => {
    const translate = (key: string) => key;
    return {
        useLanguage: () => ({ t: translate }),
    };
});

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

const VALID_PASSWORD = 'Password1!';

const fillForm = async (
    user: ReturnType<typeof userEvent.setup>,
    container: HTMLElement,
    {
        username = 'teszt.elek',
        email = 'teszt.elek@example.com',
        password = VALID_PASSWORD,
        confirmPassword = VALID_PASSWORD,
    } = {}
) => {
    const usernameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInputs = container.querySelectorAll('input[type="password"]');
    const passwordInput = passwordInputs[0] as HTMLInputElement;
    const confirmPasswordInput = passwordInputs[1] as HTMLInputElement;

    await user.type(usernameInput, username);
    await user.type(emailInput, email);
    await user.type(passwordInput, password);
    await user.type(confirmPasswordInput, confirmPassword);
};

describe('RegistrationPage Komponens', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn();
        mockNavigate.mockClear();
        jest.clearAllMocks();
    });

    it('megjeleníti a regisztrációs űrlapot és a beküldés gombot', () => {
        render(<RegistrationPage />);

        expect(screen.getByRole('button', { name: 'Regisztráció' })).toBeInTheDocument();
    });

    it('hibát jelenít meg, ha a jelszavak nem egyeznek, és nem hív fetch-et', async () => {
        const user = userEvent.setup();
        const { container } = render(<RegistrationPage />);

        await fillForm(user, container, { confirmPassword: 'MasPassword1!' });
        await user.click(screen.getByRole('button', { name: 'Regisztráció' }));

        expect(screen.getByText(/register\.mismatch/)).toBeInTheDocument();
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('hibát jelenít meg gyenge jelszó esetén, és nem hív fetch-et', async () => {
        const user = userEvent.setup();
        const { container } = render(<RegistrationPage />);

        await fillForm(user, container, { password: 'gyengejelszo', confirmPassword: 'gyengejelszo' });
        await user.click(screen.getByRole('button', { name: 'Regisztráció' }));

        expect(screen.getByText(/register\.weakPassword/)).toBeInTheDocument();
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('sikeres regisztráció esetén elküldi a megfelelő adatokat, és sikerüzenetet jelenít meg', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        const user = userEvent.setup();
        const { container } = render(<RegistrationPage />);

        await fillForm(user, container);
        await user.click(screen.getByRole('button', { name: 'Regisztráció' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/auth/register',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: 'teszt.elek',
                        email: 'teszt.elek@example.com',
                        password: VALID_PASSWORD,
                    }),
                })
            );
            expect(screen.getByText(/register\.success/)).toBeInTheDocument();
        });
    });

    it('sikeres regisztráció után 2 másodperccel átirányít a bejelentkezés oldalra', async () => {
        jest.useFakeTimers();
        try {
            (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            const { container } = render(<RegistrationPage />);

            await fillForm(user, container);
            await user.click(screen.getByRole('button', { name: 'Regisztráció' }));

            await waitFor(() => {
                expect(screen.getByText(/register\.success/)).toBeInTheDocument();
            });

            expect(mockNavigate).not.toHaveBeenCalled();

            act(() => {
                jest.advanceTimersByTime(2000);
            });

            expect(mockNavigate).toHaveBeenCalledWith('/login');
        } finally {
            jest.useRealTimers();
        }
    });

    it('a szerver által küldött egyedi hibaüzenetet jeleníti meg elutasított regisztráció esetén', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Foglalt felhasználónév.' }),
        });

        const user = userEvent.setup();
        const { container } = render(<RegistrationPage />);

        await fillForm(user, container);
        await user.click(screen.getByRole('button', { name: 'Regisztráció' }));

        await waitFor(() => {
            expect(screen.getByText(/Foglalt felhasználónév\./)).toBeInTheDocument();
        });
    });

    it('alapértelmezett hibaüzenetet jelenít meg, ha a szerver nem küld egyedi hibát', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({}) });

        const user = userEvent.setup();
        const { container } = render(<RegistrationPage />);

        await fillForm(user, container);
        await user.click(screen.getByRole('button', { name: 'Regisztráció' }));

        await waitFor(() => {
            expect(screen.getByText(/register\.failed/)).toBeInTheDocument();
        });
    });

    it('hibaüzenetet jelenít meg kapcsolódási hiba esetén', async () => {
        (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));

        const user = userEvent.setup();
        const { container } = render(<RegistrationPage />);

        await fillForm(user, container);
        await user.click(screen.getByRole('button', { name: 'Regisztráció' }));

        await waitFor(() => {
            expect(screen.getByText(/register\.serverError/)).toBeInTheDocument();
        });
    });

    it('új beküldéskor törli az előző hibaüzenetet', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Első hiba.' }),
        });

        const user = userEvent.setup();
        const { container } = render(<RegistrationPage />);

        await fillForm(user, container);
        await user.click(screen.getByRole('button', { name: 'Regisztráció' }));

        await waitFor(() => {
            expect(screen.getByText(/Első hiba\./)).toBeInTheDocument();
        });

        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        await user.click(screen.getByRole('button', { name: 'Regisztráció' }));

        await waitFor(() => {
            expect(screen.queryByText(/Első hiba\./)).not.toBeInTheDocument();
        });
    });
});