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

        expect(screen.getByText('login.email')).toBeInTheDocument();
        expect(screen.getByText('login.password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'login.submit' })).toBeInTheDocument();
    });

    it('sikeres bejelentkezés esetén elmenti a tokeneket és átirányít a főoldalra', async () => {
        const user = userEvent.setup();
        
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: 'valos_jwt_token', refreshToken: 'valos_refresh_token' }),
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
                body: JSON.stringify({ email: 'teszt_elek@egyetemkapu.hu', password: 'Titkos123!' })
            }));
            
            expect(localStorage.setItem).toHaveBeenCalledWith('token', 'valos_jwt_token');
            expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'valos_refresh_token');
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
});