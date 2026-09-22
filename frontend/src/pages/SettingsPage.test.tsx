import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from './SettingsPage';

jest.mock('../i18n/LanguageContext', () => {
    const translate = (key: string) => key;
    return {
        useLanguage: () => ({ t: translate, locale: 'hu-HU' }),
    };
});

describe('SettingsPage Komponens', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
        localStorage.clear();
        jest.clearAllMocks();
    });

    it('cookie nélkül is megpróbálja lekérni a beállításokat', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401 });
        render(<SettingsPage />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/settings',
                expect.objectContaining({ credentials: 'include' })
            );
        });
    });

    it('bejelentkezett felhasználónál lekéri és megjeleníti a mentett beállításokat', async () => {
        localStorage.setItem('token', 'test-token');
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ discordWebhook: 'https://discord.com/api/webhooks/123', telegramChatId: '998877' }),
        });

        render(<SettingsPage />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/settings',
                expect.objectContaining({ credentials: 'include' })
            );
        });

        expect(await screen.findByDisplayValue('https://discord.com/api/webhooks/123')).toBeInTheDocument();
        expect(await screen.findByDisplayValue('998877')).toBeInTheDocument();
    });

    it('sikertelen betöltés esetén üresen hagyja a mezőket, nem omlik össze', async () => {
        localStorage.setItem('token', 'test-token');
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({}) });

        render(<SettingsPage />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalled();
        });
        expect(screen.getByPlaceholderText('https://discord.com/api/webhooks/...')).toHaveValue('');
    });

    it('gépeléskor frissíti a Discord webhook és Telegram chat ID mezőket', async () => {
        render(<SettingsPage />);

        const discordInput = screen.getByPlaceholderText('https://discord.com/api/webhooks/...');
        const telegramInput = screen.getByPlaceholderText('settings.telegramPlaceholder');

        const user = userEvent.setup();
        await user.type(discordInput, 'https://discord.com/api/webhooks/abc');
        await user.type(telegramInput, '123456');

        expect(discordInput).toHaveValue('https://discord.com/api/webhooks/abc');
        expect(telegramInput).toHaveValue('123456');
    });

    it('bejelentkezés nélküli mentéskor a needLogin üzenetet jeleníti meg', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });
        render(<SettingsPage />);

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: /settings\.save/ }));

        await waitFor(() => {
            expect(screen.getByText('settings.needLogin')).toBeInTheDocument();
        });
    });

    it('sikeres mentéskor a saved üzenetet jeleníti meg', async () => {
        localStorage.setItem('token', 'test-token');
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        render(<SettingsPage />);
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        const discordInput = screen.getByPlaceholderText('https://discord.com/api/webhooks/...');
        const user = userEvent.setup();
        await user.type(discordInput, 'https://discord.com/api/webhooks/xyz');
        await user.click(screen.getByRole('button', { name: /settings\.save/ }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/settings',
                expect.objectContaining({
                    method: 'PUT',
                    credentials: 'include',
                    body: JSON.stringify({ discordWebhook: 'https://discord.com/api/webhooks/xyz', telegramChatId: '' }),
                })
            );
            expect(screen.getByText('settings.saved')).toBeInTheDocument();
        });
    });

    it('elutasított mentéskor a saveError üzenetet jeleníti meg', async () => {
        localStorage.setItem('token', 'test-token');
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        render(<SettingsPage />);
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({}) });

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: /settings\.save/ }));

        await waitFor(() => {
            expect(screen.getByText('settings.saveError')).toBeInTheDocument();
        });
    });

    it('hálózati hiba esetén a serverError üzenetet jeleníti meg', async () => {
        localStorage.setItem('token', 'test-token');
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        render(<SettingsPage />);
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

        (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: /settings\.save/ }));

        await waitFor(() => {
            expect(screen.getByText('settings.serverError')).toBeInTheDocument();
        });
    });

    it('mentés közben letiltja a gombot, és a saving feliratot jeleníti meg', async () => {
        localStorage.setItem('token', 'test-token');
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        render(<SettingsPage />);
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

        let resolveSave: (value: unknown) => void = () => { };
        (globalThis.fetch as jest.Mock).mockImplementationOnce(
            () => new Promise((resolve) => { resolveSave = resolve; })
        );

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: /settings\.save/ }));

        expect(screen.getByRole('button', { name: 'settings.saving' })).toBeDisabled();

        resolveSave({ ok: true, json: async () => ({}) });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /settings\.save/ })).not.toBeDisabled();
        });
    });

    it('a mentés visszaigazoló üzenet néhány másodperc után eltűnik', async () => {
        jest.useFakeTimers({ advanceTimers: true });
        localStorage.setItem('token', 'test-token');
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        render(<SettingsPage />);
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: /settings\.save/ }));

        await waitFor(() => {
            expect(screen.getByText('settings.saved')).toBeInTheDocument();
        });

        act(() => {
            jest.advanceTimersByTime(4000);
        });

        await waitFor(() => {
            expect(screen.queryByText('settings.saved')).not.toBeInTheDocument();
        });

        jest.useRealTimers();
    });
});