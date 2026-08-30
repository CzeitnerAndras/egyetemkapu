import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FocusRoomPage from './FocusRoomPage';

function headerValue(headers: HeadersInit | undefined, name: string): string | null {
    return new Headers(headers).get(name);
}

jest.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
    }),
}));

describe('FocusRoomPage Komponens', () => {
    beforeEach(() => {
        localStorage.setItem('token', 'test-token');
        globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
        window.alert = jest.fn();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('alapértelmezetten 25:00-ról indul fókusz módban', async () => {
        render(<FocusRoomPage />);

        expect(screen.getByText('25:00')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'focus.start' })).toBeInTheDocument();

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
    });

    it('indításkor visszaszámol, és a gomb feliratot vált', async () => {
        jest.useFakeTimers();
        render(<FocusRoomPage />);

        fireEvent.click(screen.getByRole('button', { name: 'focus.start' }));
        expect(screen.getByRole('button', { name: 'focus.pause' })).toBeInTheDocument();

        act(() => {
            jest.advanceTimersByTime(3000);
        });

        expect(screen.getByText('24:57')).toBeInTheDocument();
    });

    it('a visszaállítás gomb az aktuális módnak megfelelő időre állítja vissza az órát', async () => {
        jest.useFakeTimers();
        render(<FocusRoomPage />);

        fireEvent.click(screen.getByRole('button', { name: 'focus.start' }));
        act(() => {
            jest.advanceTimersByTime(5000);
        });
        expect(screen.getByText('24:55')).toBeInTheDocument();

        fireEvent.click(screen.getByTitle('focus.reset'));
        expect(screen.getByText('25:00')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'focus.start' })).toBeInTheDocument();
    });

    it('a szünet lejártakor riaszt, és visszavált fókusz módba', async () => {
        jest.useFakeTimers();
        render(<FocusRoomPage />);

        fireEvent.click(screen.getByRole('button', { name: 'focus.break' }));
        expect(screen.getByText('05:00')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'focus.start' }));

        act(() => {
            jest.advanceTimersByTime(5 * 60 * 1000);
        });

        expect(window.alert).toHaveBeenCalledWith('focus.breakEnded');
        expect(screen.getByText('25:00')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'focus.start' })).toBeInTheDocument();
    });

    it('betöltés után üres listát mutat, ha nincs aktív feladat', async () => {
        render(<FocusRoomPage />);

        await waitFor(() => {
            expect(screen.getByText('focus.noTasks')).toBeInTheDocument();
        });
    });

    it('megjeleníti a lekért feladatokat, kattintásra pedig késznek jelöli és eltávolítja a listából', async () => {
        const task = {
            id: 9,
            title: 'Fontos feladat',
            taskType: 'ZH',
            deadline: '2026-08-28T10:00:00',
            completed: false,
            pingDayBefore: false,
            pingOnDay: false,
        };

        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce({ ok: true, json: async () => [task] })
            .mockResolvedValueOnce({ ok: true, json: async () => [] })
            .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        render(<FocusRoomPage />);

        await waitFor(() => {
            expect(screen.getByText('Fontos feladat')).toBeInTheDocument();
            expect(screen.getByText('ZH')).toBeInTheDocument();
            expect(screen.queryByText('cal.type.ZH')).not.toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Fontos feladat'));

        await waitFor(() => {
            const putCall = (globalThis.fetch as jest.Mock).mock.calls.find(
                ([url, options]) => url === '/api/tasks/9' && options?.method === 'PUT'
            );
            expect(putCall).toBeDefined();
            expect(headerValue(putCall[1].headers, 'Authorization')).toBe('Bearer test-token');
            expect(JSON.parse(putCall[1].body)).toEqual({
                id: 9,
                title: 'Fontos feladat',
                taskType: 'ZH',
                deadline: '2026-08-28T10:00:00',
                completed: true,
                pingDayBefore: false,
                pingOnDay: false,
            });
            expect(screen.queryByText('Fontos feladat')).not.toBeInTheDocument();
        });
    });

    it('új feladat hozzáadása elküldi a kérést, és kiüríti a mezőt', async () => {
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce({ ok: true, json: async () => [] })
            .mockResolvedValueOnce({ ok: true, json: async () => [] })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 42,
                    title: 'Új fókusz feladat',
                    taskType: 'Fókusz',
                    deadline: '2026-08-28T23:59:59',
                    completed: false,
                    pingDayBefore: false,
                    pingOnDay: false,
                }),
            });

        const { container } = render(<FocusRoomPage />);
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));

        const user = userEvent.setup();
        const input = screen.getByPlaceholderText('focus.addTask');
        await user.type(input, 'Új fókusz feladat');

        const addBtn = container.querySelector('.lucide-plus')!.closest('button')!;
        await user.click(addBtn);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledTimes(3);
        });

        const postCall = (globalThis.fetch as jest.Mock).mock.calls.find(
            ([url, options]) => url === '/api/tasks' && options?.method === 'POST'
        );
        expect(postCall).toBeDefined();
        expect(headerValue(postCall[1].headers, 'Authorization')).toBe('Bearer test-token');
        expect(JSON.parse(postCall[1].body)).toEqual(
            expect.objectContaining({
                title: 'Új fókusz feladat',
                taskType: 'Fókusz',
                completed: false,
                pingDayBefore: false,
                pingOnDay: false,
            })
        );
        expect(input).toHaveValue('');
        expect(screen.getByText('Új fókusz feladat')).toBeInTheDocument();
    });

    it('egyedi feladat típust jelenít meg a fordítási kulcs helyett', async () => {
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    id: 3,
                    title: 'Beiratkozás',
                    taskType: 'Egyetem',
                    deadline: '2026-08-30T10:00:00',
                    completed: false,
                    pingDayBefore: false,
                    pingOnDay: false,
                }],
            })
            .mockResolvedValueOnce({ ok: true, json: async () => [] });

        render(<FocusRoomPage />);

        await waitFor(() => {
            expect(screen.getByText('Beiratkozás')).toBeInTheDocument();
            expect(screen.getByText('Egyetem')).toBeInTheDocument();
            expect(screen.queryByText('cal.type.Egyetem')).not.toBeInTheDocument();
        });
    });

    it('új jegyzet mentése POST kérést küld a tartalommal', async () => {
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce({ ok: true, json: async () => [] })
            .mockResolvedValueOnce({ ok: true, json: async () => [] })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 77 }) });

        render(<FocusRoomPage />);
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));

        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText('focus.notePlaceholder'), 'Gyors jegyzet');
        await user.click(screen.getByTitle('focus.save'));

        await waitFor(() => {
            const postCall = (globalThis.fetch as jest.Mock).mock.calls.find(
                ([url, options]) => url === '/api/notes' && options?.method === 'POST'
            );
            expect(postCall).toBeDefined();
            expect(headerValue(postCall[1].headers, 'Authorization')).toBe('Bearer test-token');
            expect(JSON.parse(postCall[1].body)).toEqual({ content: 'Gyors jegyzet' });
        });
    });

    it('meglévő jegyzet mentése PUT kérést küld a jegyzet azonosítójával', async () => {
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce({ ok: true, json: async () => [] })
            .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 7, content: 'Régi jegyzet' }] })
            .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        render(<FocusRoomPage />);
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));

        const user = userEvent.setup();
        const textarea = await screen.findByDisplayValue('Régi jegyzet');
        await user.clear(textarea);
        await user.type(textarea, 'Régi jegyzet - frissítve');
        await user.click(screen.getByTitle('focus.save'));

        await waitFor(() => {
            const putCall = (globalThis.fetch as jest.Mock).mock.calls.find(
                ([url, options]) => url === '/api/notes/7' && options?.method === 'PUT'
            );
            expect(putCall).toBeDefined();
            expect(headerValue(putCall[1].headers, 'Authorization')).toBe('Bearer test-token');
            expect(JSON.parse(putCall[1].body)).toEqual({ content: 'Régi jegyzet - frissítve' });
        });
    });
});