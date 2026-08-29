import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Navbar from './Navbar';

jest.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
        language: 'hu',
        toggleLanguage: mockToggleLanguage,
    }),
}));

const mockToggleLanguage = jest.fn();
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

const renderWithRouter = () => render(<BrowserRouter><Navbar /></BrowserRouter>);

const setup = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

const openMenu = async (user: ReturnType<typeof setup>, container: HTMLElement) => {
    const menuIcon = container.querySelector('.lucide-menu')!;
    await user.click(menuIcon);
};

const getThemeToggle = (container: HTMLElement) =>
    container.querySelector('button.rounded-full') as HTMLButtonElement;

describe('Navbar Komponens', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn();
        localStorage.clear();
        document.documentElement.className = '';
        window.history.pushState({}, '', '/');
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        document.documentElement.className = '';
    });

    it('megjeleníti a fő navigációs linkeket, admin szekció nélkül bejelentkezés nélkül', () => {
        renderWithRouter();

        expect(screen.getByText('nav.calendar')).toBeInTheDocument();
        expect(screen.getByText('nav.ai')).toBeInTheDocument();
        expect(screen.getByText('nav.calculators')).toBeInTheDocument();
        expect(screen.queryByText('nav.adminSection')).not.toBeInTheDocument();
    });

    it('tokennel lekéri a felhasználót, és admin szerepkör esetén megjeleníti az admin panel linket', async () => {
        localStorage.setItem('token', 'test-token');
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ username: 'admin_user', role: 'ROLE_ADMIN' }),
        });

        const { container } = renderWithRouter();

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledTimes(1);
        });

        const [requestedUrl, requestInit] = (globalThis.fetch as jest.Mock).mock.calls[0];
        expect(requestedUrl).toBe('/api/users/me');
        expect((requestInit.headers as Headers).get('Authorization')).toBe('Bearer test-token');

        const user = setup();
        await openMenu(user, container);

        await waitFor(() => {
            expect(screen.getByText('nav.adminSection')).toBeInTheDocument();
            expect(screen.getByText('nav.adminPanel')).toBeInTheDocument();
        });
    });

    it('profil ikonra kattintva bejelentkezés nélkül a bejelentkezés oldalra navigál', async () => {
        const { container } = renderWithRouter();
        const user = setup();

        await user.click(container.querySelector('.lucide-user')!);

        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('profil ikonra kattintva bejelentkezve megnyitja a profil menüt, és megjeleníti a felhasználónevet', async () => {
        localStorage.setItem('token', 'test-token');
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ username: 'teszt_elek' }),
        });

        const { container } = renderWithRouter();
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

        const user = setup();
        await user.click(container.querySelector('.lucide-user')!);

        expect(await screen.findByText(/teszt_elek/)).toBeInTheDocument();
        expect(screen.getByText('nav.myProfile')).toBeInTheDocument();
        expect(screen.getByText('nav.logout')).toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalledWith('/login');
    });

    it('lejárt hozzáférési token esetén frissít, és a valódi felhasználónevet mutatja a tartalék név helyett', async () => {
        localStorage.setItem('token', 'expired-token');
        localStorage.setItem('refreshToken', 'test-refresh-token');
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce({ status: 401, ok: false })
            .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ token: 'new-token' }) })
            .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ username: 'teszt_elek' }) });

        const { container } = renderWithRouter();
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(3));

        expect((globalThis.fetch as jest.Mock).mock.calls[1][0]).toBe('/api/auth/refresh');
        expect(localStorage.getItem('token')).toBe('new-token');

        const user = setup();
        await user.click(container.querySelector('.lucide-user')!);

        expect(await screen.findByText(/teszt_elek/)).toBeInTheDocument();
        expect(screen.queryByText('nav.userFallback')).not.toBeInTheDocument();
    });

    it('sikertelen token frissítés esetén törli a munkamenetet, és a bejelentkezés oldalra irányít', async () => {
        localStorage.setItem('token', 'expired-token');
        localStorage.setItem('refreshToken', 'dead-refresh-token');
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce({ status: 401, ok: false })
            .mockResolvedValueOnce({ status: 401, ok: false, json: async () => ({}) });

        const { container } = renderWithRouter();

        await waitFor(() => expect(localStorage.getItem('token')).toBeNull());
        expect(localStorage.getItem('refreshToken')).toBeNull();

        const user = setup();
        await user.click(container.querySelector('.lucide-user')!);

        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('kijelentkezéskor törli a tokeneket, meghívja a logout végpontot, és a kezdőlapra navigál', async () => {
        localStorage.setItem('token', 'test-token');
        localStorage.setItem('refreshToken', 'test-refresh-token');
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'teszt_elek' }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        const { container } = renderWithRouter();
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

        const user = setup();
        await user.click(container.querySelector('.lucide-user')!);
        await user.click(screen.getByText('nav.logout'));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/auth/logout',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken: 'test-refresh-token' }),
                })
            );
        });

        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('a menü ikonra kattintva megnyitja a fő legördülő menüt a rendszer linkjeivel', async () => {
        const { container } = renderWithRouter();
        const user = setup();

        await openMenu(user, container);

        expect(screen.getByText('nav.system')).toBeInTheDocument();
        expect(screen.getByText('nav.about')).toBeInTheDocument();
        expect(screen.getByText('nav.faq')).toBeInTheDocument();
        expect(screen.getByText('nav.settings')).toBeInTheDocument();
    });

    it('a navigációs sávon kívülre kattintva bezárja a nyitott legördülő menüt', async () => {
        const { container } = renderWithRouter();
        const user = setup();

        await openMenu(user, container);
        expect(screen.getByText('nav.system')).toBeInTheDocument();

        fireEvent.mouseDown(document.body);

        expect(screen.queryByText('nav.system')).not.toBeInTheDocument();
    });

    it('a témaváltó kapcsolóra kattintva váltja a sötét módot, és menti a localStorage-ba', async () => {
        const { container } = renderWithRouter();
        const user = setup();

        await openMenu(user, container);
        await user.click(getThemeToggle(container));

        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(localStorage.getItem('theme')).toBe('dark');

        await user.click(getThemeToggle(container));

        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(localStorage.getItem('theme')).toBe('light');
    });

    it('a témaváltóra való 10 gyors kattintás titkos módot aktivál, és a /S3CR3T oldalra navigál', async () => {
        const { container } = renderWithRouter();
        const user = setup();

        await openMenu(user, container);
        const toggle = getThemeToggle(container);

        for (let i = 0; i < 10; i++) {
            await user.click(toggle);
        }

        await act(async () => {
            jest.advanceTimersByTime(4500);
        });

        expect(mockNavigate).toHaveBeenCalledWith('/S3CR3T');
        expect(localStorage.getItem('secretMode')).toBe('true');
        expect(document.documentElement.classList.contains('secret')).toBe(true);
    });

    it('titkos módban a témaváltóra való 10 gyors kattintás fatal error képernyőt vált ki', async () => {
        localStorage.setItem('secretMode', 'true');
        const { container } = renderWithRouter();
        const user = setup();

        await openMenu(user, container);
        const toggle = getThemeToggle(container);

        for (let i = 0; i < 10; i++) {
            await user.click(toggle);
        }

        await act(async () => {
            jest.advanceTimersByTime(5000);
        });

        expect(screen.getByText('FATAL ERROR: SYSTEM CORRUPT')).toBeInTheDocument();
    });

    it('a triggerLogoffEffect esemény törli a titkos módot, és a kezdőlapra navigál', async () => {
        localStorage.setItem('secretMode', 'true');
        localStorage.setItem('terminalHacked', 'true');
        renderWithRouter();

        act(() => {
            window.dispatchEvent(new Event('triggerLogoffEffect'));
        });

        await act(async () => {
            jest.advanceTimersByTime(2000);
        });

        expect(mockNavigate).toHaveBeenCalledWith('/');
        expect(localStorage.getItem('secretMode')).toBeNull();
        expect(localStorage.getItem('terminalHacked')).toBeNull();
        expect(document.documentElement.classList.contains('secret')).toBe(false);
    });

    it('elmentett titkos mód esetén induláskor beállítja a "secret" és "dark" osztályokat', () => {
        localStorage.setItem('secretMode', 'true');
        renderWithRouter();

        expect(document.documentElement.classList.contains('secret')).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('a zászló ikonra kattintva meghívja a nyelvváltás funkciót', async () => {
        const { container } = renderWithRouter();
        const user = setup();

        await user.click(container.querySelector('.lucide-flag')!);

        expect(mockToggleLanguage).toHaveBeenCalledTimes(1);
    });
});