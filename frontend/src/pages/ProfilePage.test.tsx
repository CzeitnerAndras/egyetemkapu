import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from './ProfilePage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

const mockProfileFetch = (overrides: { status?: number; ok?: boolean; username?: string } = {}) => {
    const { status = 200, ok = true, username = 'teszt.elek' } = overrides;
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok,
        status,
        json: async () => (ok ? { username } : {}),
    });
};

const fillUsernameForm = async (user: ReturnType<typeof userEvent.setup>, container: HTMLElement, value: string) => {
    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    await user.type(input, value);
};

const fillPasswordForm = async (
    user: ReturnType<typeof userEvent.setup>,
    container: HTMLElement,
    { current = 'RegiJelszo1!', next = 'UjJelszo1!', confirm = 'UjJelszo1!' } = {}
) => {
    const inputs = container.querySelectorAll('input[type="password"]');
    await user.type(inputs[0] as HTMLInputElement, current);
    await user.type(inputs[1] as HTMLInputElement, next);
    await user.type(inputs[2] as HTMLInputElement, confirm);
};

describe('ProfilePage Komponens', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn();
        mockNavigate.mockClear();
        localStorage.clear();
        jest.clearAllMocks();
    });

    it('bejelentkezés oldalra irányít, ha nincs token, és nem hív fetch-et', () => {
        render(<ProfilePage />);

        expect(mockNavigate).toHaveBeenCalledWith('/login');
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('érvényes token esetén lekéri és megjeleníti a felhasználónevet', async () => {
        localStorage.setItem('token', 'test-token');
        mockProfileFetch({ username: 'kovacs.anna' });

        render(<ProfilePage />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/users/me',
                expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
            );
            expect(screen.getByText(/kovacs\.anna/)).toBeInTheDocument();
        });
    });

    it('lejárt token (401) esetén eltávolítja a tokent, és a bejelentkezés oldalra irányít', async () => {
        localStorage.setItem('token', 'test-token');
        mockProfileFetch({ status: 401, ok: false });

        render(<ProfilePage />);

        await waitFor(() => {
            expect(localStorage.getItem('token')).toBeNull();
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });

    it('egyéb szerverhiba esetén nem jelenít meg felhasználónevet, és nem navigál el', async () => {
        localStorage.setItem('token', 'test-token');
        mockProfileFetch({ status: 500, ok: false });

        render(<ProfilePage />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalled();
        });

        expect(screen.queryByText(/Jelenlegi név:/)).not.toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('üres felhasználónév esetén nem hív fetch-et a névfrissítéshez', async () => {
        localStorage.setItem('token', 'test-token');
        mockProfileFetch();

        const user = userEvent.setup();
        render(<ProfilePage />);

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

        await user.click(screen.getByRole('button', { name: 'Mentés' }));

        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('sikeresen frissíti a felhasználónevet, és frissíti a tokent, ha a szerver újat küld', async () => {
        localStorage.setItem('token', 'test-token');
        mockProfileFetch({ username: 'regi.nev' });
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: 'new-token' }),
        });

        const user = userEvent.setup();
        const { container } = render(<ProfilePage />);

        await waitFor(() => expect(screen.getByText(/regi\.nev/)).toBeInTheDocument());

        await fillUsernameForm(user, container, 'uj.nev');
        await user.click(screen.getByRole('button', { name: 'Mentés' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/users/username',
                expect.objectContaining({
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
                    body: JSON.stringify({ newUsername: 'uj.nev' }),
                })
            );
            expect(screen.getByText(/Felhasználónév sikeresen frissítve!/)).toBeInTheDocument();
            expect(screen.getByText(/uj\.nev/)).toBeInTheDocument();
            expect(localStorage.getItem('token')).toBe('new-token');
        });

        const input = container.querySelector('input[type="text"]') as HTMLInputElement;
        expect(input).toHaveValue('');
    });

    it('hibaüzenetet jelenít meg, ha a felhasználónév módosítása elutasításra kerül', async () => {
        localStorage.setItem('token', 'test-token');
        mockProfileFetch();
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Foglalt felhasználónév.' }),
        });

        const user = userEvent.setup();
        const { container } = render(<ProfilePage />);

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
        await fillUsernameForm(user, container, 'foglalt.nev');
        await user.click(screen.getByRole('button', { name: 'Mentés' }));

        await waitFor(() => {
            expect(screen.getByText(/Foglalt felhasználónév\./)).toBeInTheDocument();
        });
    });

    it('hibaüzenetet jelenít meg kapcsolódási hiba esetén a névfrissítésnél', async () => {
        localStorage.setItem('token', 'test-token');
        mockProfileFetch();
        (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));

        const user = userEvent.setup();
        const { container } = render(<ProfilePage />);

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
        await fillUsernameForm(user, container, 'uj.nev');
        await user.click(screen.getByRole('button', { name: 'Mentés' }));

        await waitFor(() => {
            expect(screen.getByText(/Szerverhiba történt\. Ellenőrizd a kapcsolatot!/)).toBeInTheDocument();
        });
    });

    it('az üzenet 5 másodperc után automatikusan eltűnik', async () => {
        jest.useFakeTimers();
        try {
            localStorage.setItem('token', 'test-token');
            mockProfileFetch();
            (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Foglalt felhasználónév.' }),
            });

            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            const { container } = render(<ProfilePage />);

            await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
            await fillUsernameForm(user, container, 'foglalt.nev');
            await user.click(screen.getByRole('button', { name: 'Mentés' }));

            await waitFor(() => {
                expect(screen.getByText(/Foglalt felhasználónév\./)).toBeInTheDocument();
            });

            act(() => {
                jest.advanceTimersByTime(5000);
            });

            expect(screen.queryByText(/Foglalt felhasználónév\./)).not.toBeInTheDocument();
        } finally {
            jest.useRealTimers();
        }
    });

    it('hibát jelenít meg, ha az új jelszavak nem egyeznek, és nem hív fetch-et a jelszóvégpontra', async () => {
        localStorage.setItem('token', 'test-token');
        mockProfileFetch();

        const user = userEvent.setup();
        const { container } = render(<ProfilePage />);

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
        await fillPasswordForm(user, container, { confirm: 'MasikJelszo1!' });
        await user.click(screen.getByRole('button', { name: 'Jelszó Mentése' }));

        await waitFor(() => {
            expect(screen.getByText(/Az új jelszavak nem egyeznek!/)).toBeInTheDocument();
        });
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('hibát jelenít meg gyenge új jelszó esetén, és nem hív fetch-et a jelszóvégpontra', async () => {
        localStorage.setItem('token', 'test-token');
        mockProfileFetch();

        const user = userEvent.setup();
        const { container } = render(<ProfilePage />);

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
        await fillPasswordForm(user, container, { next: 'gyengejelszo', confirm: 'gyengejelszo' });
        await user.click(screen.getByRole('button', { name: 'Jelszó Mentése' }));

        await waitFor(() => {
            expect(screen.getByText(/nagybetűt, egy számot és egy szimbólumot/)).toBeInTheDocument();
        });
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('sikeresen módosítja a jelszót, és üríti az űrlapot', async () => {
        localStorage.setItem('token', 'test-token');
        mockProfileFetch();
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        const user = userEvent.setup();
        const { container } = render(<ProfilePage />);

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
        await fillPasswordForm(user, container);
        await user.click(screen.getByRole('button', { name: 'Jelszó Mentése' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/users/password',
                expect.objectContaining({
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
                    body: JSON.stringify({ currentPassword: 'RegiJelszo1!', newPassword: 'UjJelszo1!' }),
                })
            );
            expect(screen.getByText(/Jelszó sikeresen frissítve!/)).toBeInTheDocument();
        });

        const passwordInputs = container.querySelectorAll('input[type="password"]');
        passwordInputs.forEach((el) => expect(el).toHaveValue(''));
    });

    it('hibaüzenetet jelenít meg, ha a jelszó módosítása szerver oldalon elutasításra kerül', async () => {
        localStorage.setItem('token', 'test-token');
        mockProfileFetch();
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Hibás jelenlegi jelszó.' }),
        });

        const user = userEvent.setup();
        const { container } = render(<ProfilePage />);

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
        await fillPasswordForm(user, container);
        await user.click(screen.getByRole('button', { name: 'Jelszó Mentése' }));

        await waitFor(() => {
            expect(screen.getByText(/Hibás jelenlegi jelszó\./)).toBeInTheDocument();
        });
    });

    it('megnyitja, majd a Mégse gombbal bezárja a fiók törlését megerősítő modált, fetch hívása nélkül', async () => {
        localStorage.setItem('token', 'test-token');
        mockProfileFetch();

        const user = userEvent.setup();
        render(<ProfilePage />);

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
        await user.click(screen.getByRole('button', { name: 'Fiók Végleges Törlése' }));

        expect(screen.getByText('Biztos vagy benne?')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Mégse' }));

        expect(screen.queryByText('Biztos vagy benne?')).not.toBeInTheDocument();
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('sikeresen törli a fiókot, eltávolítja a tokent, és a főoldalra navigál', async () => {
        localStorage.setItem('token', 'test-token');
        mockProfileFetch();
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        const user = userEvent.setup();
        render(<ProfilePage />);

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
        await user.click(screen.getByRole('button', { name: 'Fiók Végleges Törlése' }));
        await user.click(screen.getByRole('button', { name: 'Igen, Törlöm!' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/users/me',
                expect.objectContaining({ method: 'DELETE', headers: { Authorization: 'Bearer test-token' } })
            );
            expect(localStorage.getItem('token')).toBeNull();
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
        expect(screen.queryByText('Biztos vagy benne?')).not.toBeInTheDocument();
    });

    it('hibaüzenetet jelenít meg, ha a fiók törlése sikertelen, és megtartja a tokent', async () => {
        localStorage.setItem('token', 'test-token');
        mockProfileFetch();
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({}) });

        const user = userEvent.setup();
        render(<ProfilePage />);

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
        await user.click(screen.getByRole('button', { name: 'Fiók Végleges Törlése' }));
        await user.click(screen.getByRole('button', { name: 'Igen, Törlöm!' }));

        await waitFor(() => {
            expect(screen.getByText(/Nem sikerült törölni a fiókot\./)).toBeInTheDocument();
        });
        expect(localStorage.getItem('token')).toBe('test-token');
        expect(screen.queryByText('Biztos vagy benne?')).not.toBeInTheDocument();
    });
});