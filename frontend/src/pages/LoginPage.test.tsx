import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

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

describe('LoginPage Komponens', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn();
        Storage.prototype.setItem = jest.fn();
        jest.clearAllMocks();
    });

    const renderWithRouter = () => {
        render(
            <BrowserRouter>
                <LoginPage />
            </BrowserRouter>
        );
    };

    it('helyesen rendereli a beviteli mezőket és a gombot', () => {
        renderWithRouter();

        expect(screen.getByRole('main')).toHaveClass('justify-center');
        expect(screen.getByRole('heading', { level: 1, name: 'login.title' })).toBeInTheDocument();
        expect(screen.getByText('login.email')).toBeInTheDocument();
        expect(screen.getByText('login.password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'login.submit' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'login.register' })).toHaveAttribute('href', '/register');
        expect(screen.getByRole('link', { name: 'login.forgotPassword' })).toHaveAttribute('href', '/elfelejtett-jelszo');
    });

    it('sikeres bejelentkezés esetén cookie-s munkamenetet indít és átirányít a főoldalra', async () => {
        const user = userEvent.setup();
        
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ ok: true }),
        });

        renderWithRouter();

        const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
        const emailInputByAttr = document.querySelector('input[type="email"]') as HTMLInputElement;

        await user.type(emailInputByAttr, 'teszt_elek@egyetemkapu.hu');
        await user.type(passwordInput, 'Titkos123!');
        await user.click(screen.getByRole('button', { name: 'login.submit' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({ email: 'teszt_elek@egyetemkapu.hu', password: 'Titkos123!' })
            }));
            
            expect(localStorage.setItem).not.toHaveBeenCalledWith('token', expect.anything());
            expect(localStorage.setItem).not.toHaveBeenCalledWith('refreshToken', expect.anything());
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    it('hibás adatok esetén megjeleníti a hibaüzenetet', async () => {
        const user = userEvent.setup();
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Hibás email vagy jelszó' }),
        });

        renderWithRouter();

        const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
        const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;

        await user.type(emailInput, 'rossz@email.hu');
        await user.type(passwordInput, 'RosszJelszo');
        await user.click(screen.getByRole('button', { name: 'login.submit' }));

        await waitFor(() => {
            expect(screen.getByText(/> login\.errorPrefix: Hibás email vagy jelszó/i)).toBeInTheDocument();
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    it('megerősítetlen e-mail esetén a szerver üzenetét mutatja, és nem navigál', async () => {
        const user = userEvent.setup();
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 403,
            json: async () => ({ error: 'Erősítsd meg az e-mail címed a belépéshez.' }),
        });

        renderWithRouter();

        await user.type(document.querySelector('input[type="email"]') as HTMLInputElement, 'uj@egyetemkapu.hu');
        await user.type(document.querySelector('input[type="password"]') as HTMLInputElement, 'Jelszo1!');
        await user.click(screen.getByRole('button', { name: 'login.submit' }));

        await waitFor(() => {
            expect(screen.getByText(/> login\.errorPrefix: Erősítsd meg az e-mail címed a belépéshez\./i)).toBeInTheDocument();
            expect(mockNavigate).not.toHaveBeenCalled();
            expect(localStorage.setItem).not.toHaveBeenCalled();
        });
    });
});