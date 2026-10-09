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
        globalThis.fetch = jest.fn().mockResolvedValue({ status: 401, ok: false, json: async () => ({}) });
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

    const openGroup = async (user: ReturnType<typeof setup>, name: RegExp) => {
        await user.click(screen.getByRole('button', { name }));
    };

    it('a csoportokat mutatja legördülő nélkül, amíg meg nem nyitják', () => {
        const { container } = renderWithRouter();

        expect(screen.getByRole('button', { name: /nav\.study/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /nav\.tools/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /nav\.daily/ })).toBeInTheDocument();
        expect(container.querySelector('.nav-scroll')).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /nav\.focus/ })).not.toBeInTheDocument();
        expect(screen.queryByText('nav.adminSection')).not.toBeInTheDocument();
    });

    it('a Tanulás menü a tanulószobát, a kártyákat és a tudástárat nyitja', async () => {
        renderWithRouter();
        const user = setup();

        await openGroup(user, /nav\.study/);

        expect(screen.getByRole('link', { name: /nav\.focus/ })).toHaveAttribute('href', '/tanuloszoba');
        expect(screen.getByRole('link', { name: /nav\.cards/ })).toHaveAttribute('href', '/kartyak');
        expect(screen.getByRole('link', { name: /nav\.knowledge/ })).toHaveAttribute('href', '/tudastar');
    });

    it('az Eszközök menü a kalkulátort, a hivatkozást és az AI-t nyitja', async () => {
        renderWithRouter();
        const user = setup();

        await openGroup(user, /nav\.tools/);

        expect(screen.getByRole('link', { name: /nav\.calculators/ })).toHaveAttribute('href', '/kalkulator');
        expect(screen.getByRole('link', { name: /nav\.reference/ })).toHaveAttribute('href', '/hivatkozas');
        expect(screen.getByRole('link', { name: /nav\.ai/ })).toHaveAttribute('href', '/ai');
    });

    it('a Mindennapok menü a naptárt, a linktárat és az akciós újságot nyitja', async () => {
        renderWithRouter();
        const user = setup();

        await openGroup(user, /nav\.daily/);

        expect(screen.getByRole('link', { name: /nav\.calendar/ })).toHaveAttribute('href', '/naptar');
        expect(screen.getByRole('link', { name: /nav\.links/ })).toHaveAttribute('href', '/linktar');
        expect(screen.getByRole('link', { name: /nav\.sales/ })).toHaveAttribute('href', '/akcios-ujsag');
    });

    it('a hasznossági ikonokat jobbra igazítja', () => {
        const { container } = renderWithRouter();
        const icons = container.querySelector('.ml-auto') as HTMLElement;

        expect(icons).toBeInTheDocument();
        expect(icons.querySelector('.lucide-flag')).toBeInTheDocument();
        expect(icons.querySelector('.lucide-mail')).toBeInTheDocument();
        expect(icons.querySelector('.lucide-user')).toBeInTheDocument();
        expect(icons.querySelector('.lucide-menu')).toBeInTheDocument();
    });

    it('a csoport linkjére kattintva megnyitja az oldalt, és bezárja a menüt', async () => {
        renderWithRouter();
        const user = setup();

        await openGroup(user, /nav\.daily/);
        await user.click(screen.getByRole('link', { name: /nav\.calendar/ }));

        expect(window.location.pathname).toBe('/naptar');
        expect(screen.queryByRole('link', { name: /nav\.links/ })).not.toBeInTheDocument();
    });

    it('egyszerre csak egy csoportmenü van nyitva', async () => {
        renderWithRouter();
        const user = setup();

        await openGroup(user, /nav\.study/);
        await openGroup(user, /nav\.tools/);

        expect(screen.queryByRole('link', { name: /nav\.focus/ })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /nav\.calculators/ })).toBeInTheDocument();
    });

    it('a sávon kívülre kattintva bezárja a csoportmenüt', async () => {
        renderWithRouter();
        const user = setup();

        await openGroup(user, /nav\.study/);
        expect(screen.getByRole('link', { name: /nav\.focus/ })).toBeInTheDocument();

        fireEvent.mouseDown(document.body);

        expect(screen.queryByRole('link', { name: /nav\.focus/ })).not.toBeInTheDocument();
    });

    it('tokennel lekéri a felhasználót, és admin szerepkör esetén megjeleníti az admin panel linket', async () => {
        localStorage.setItem('token', 'test-token');
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ username: 'admin_user', role: 'ROLE_ADMIN' }),
        });

        const { container } = renderWithRouter();

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledTimes(1);
        });

        const [requestedUrl, requestInit] = (globalThis.fetch as jest.Mock).mock.calls[0];
        expect(requestedUrl).toBe('/api/users/me');
        expect(requestInit.credentials).toBe('include');
        expect((requestInit.headers as Headers).get('Authorization')).toBeNull();

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
        jest.useRealTimers();
        localStorage.setItem('token', 'test-token');
        (globalThis.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ username: 'teszt_elek' }),
        });

        const { container } = renderWithRouter();
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
        await act(async () => {
            await Promise.resolve();
        });

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

    it('bejelentkezés után oldalújratöltés nélkül is megnyitja a profil menüt', async () => {
        const { container } = renderWithRouter();
        const user = setup();

        (globalThis.fetch as jest.Mock).mockResolvedValue({
            status: 200,
            ok: true,
            json: async () => ({ username: 'friss_elek' }),
        });

        await act(async () => {
            window.dispatchEvent(new Event('authChanged'));
        });

        await user.click(container.querySelector('.lucide-user')!);

        expect(mockNavigate).not.toHaveBeenCalledWith('/login');
        expect(await screen.findByText(/friss_elek/)).toBeInTheDocument();
    });

    it('átmeneti szerverhiba (500) esetén nem hívja a logout végpontot', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ status: 500, ok: false });

        renderWithRouter();
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

        expect(globalThis.fetch).not.toHaveBeenCalledWith(
            '/api/auth/logout',
            expect.anything()
        );
    });

    it('kijelentkezéskor törli a tokeneket, meghívja a logout végpontot, és a kezdőlapra navigál', async () => {
        jest.useRealTimers();
        localStorage.setItem('token', 'test-token');
        localStorage.setItem('refreshToken', 'test-refresh-token');
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ username: 'teszt_elek' }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        const { container } = renderWithRouter();
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
        await act(async () => {
            await Promise.resolve();
        });

        const user = setup();
        await user.click(container.querySelector('.lucide-user')!);
        await user.click(await screen.findByText('nav.logout'));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/auth/logout',
                expect.objectContaining({
                    method: 'POST',
                    credentials: 'include',
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
        expect(screen.getByText('nav.menu')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /nav\.focus/ })).toHaveAttribute('href', '/tanuloszoba');
        expect(screen.getByRole('link', { name: /nav\.sales/ })).toHaveAttribute('href', '/akcios-ujsag');
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

    it('mentett téma nélkül világos módban indul, a rendszer sötét preferenciájától függetlenül', () => {
        document.documentElement.classList.add('dark');
        renderWithRouter();

        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(localStorage.getItem('theme')).toBeNull();
    });

    it('elmentett sötét témával sötét módban indul', () => {
        localStorage.setItem('theme', 'dark');
        renderWithRouter();

        expect(document.documentElement.classList.contains('dark')).toBe(true);
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
        expect(localStorage.getItem('secretMode')).toBeNull();
        expect(document.documentElement.classList.contains('secret')).toBe(true);
    });

    it('titkos módban a témaváltóra való 10 gyors kattintás fatal error képernyőt vált ki', async () => {
        window.history.pushState({}, '', '/S3CR3T');
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
        window.history.pushState({}, '', '/S3CR3T');
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

    it('korábban mentett titkos módot nem állítja vissza újratöltéskor', () => {
        localStorage.setItem('secretMode', 'true');
        localStorage.setItem('theme', 'light');
        renderWithRouter();

        expect(document.documentElement.classList.contains('secret')).toBe(false);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(localStorage.getItem('secretMode')).toBeNull();
    });

    it('a /S3CR3T oldalon induláskor bekapcsolja a titkos módot', () => {
        window.history.pushState({}, '', '/S3CR3T');
        renderWithRouter();

        expect(document.documentElement.classList.contains('secret')).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('titkos módban a témaváltó kattintható, de a titkos téma megmarad', async () => {
        window.history.pushState({}, '', '/S3CR3T');
        const { container } = renderWithRouter();
        const user = setup();

        await openMenu(user, container);
        const toggle = getThemeToggle(container);
        const knob = toggle.querySelector('div');
        expect(knob?.className).toContain('translate-x-5');

        await user.click(toggle);

        expect(document.documentElement.classList.contains('secret')).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(toggle.querySelector('div')?.className).toContain('translate-x-1');
        expect(localStorage.getItem('theme')).toBeNull();
    });

    it('a zászló ikonra kattintva meghívja a nyelvváltás funkciót', async () => {
        const { container } = renderWithRouter();
        const user = setup();

        await user.click(container.querySelector('.lucide-flag')!);

        expect(mockToggleLanguage).toHaveBeenCalledTimes(1);
    });
});