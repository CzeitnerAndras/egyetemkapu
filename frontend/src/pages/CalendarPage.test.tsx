import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarPage from './CalendarPage';

jest.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
        locale: 'hu-HU',
    }),
}));

const today = new Date();
const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

const formatDateForApi = (date: Date, timeStr: string) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}T${timeStr}:00`;
};

describe('CalendarPage Komponens', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn();
        localStorage.clear();
        jest.clearAllMocks();
    });

    it('a jelenlegi hónap összes napját megjeleníti', () => {
        render(<CalendarPage />);

        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText(String(daysInCurrentMonth))).toBeInTheDocument();
    });

    it('lapozáskor a fejléc a következő hónapra vált', () => {
        const { container } = render(<CalendarPage />);

        const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const nextBtn = container.querySelector('.lucide-chevron-right')!.closest('button')!;

        fireEvent.click(nextBtn);

        expect(
            screen.getByText(
                new RegExp(`${nextMonthDate.getFullYear()}\\..*cal\\.month\\.${nextMonthDate.getMonth()}`)
            )
        ).toBeInTheDocument();
    });

    it('lapozáskor a fejléc az előző hónapra vált', () => {
        const { container } = render(<CalendarPage />);

        const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevBtn = container.querySelector('.lucide-chevron-left')!.closest('button')!;

        fireEvent.click(prevBtn);

        expect(
            screen.getByText(
                new RegExp(`${prevMonthDate.getFullYear()}\\..*cal\\.month\\.${prevMonthDate.getMonth()}`)
            )
        ).toBeInTheDocument();
    });

    it('bejelentkezés nélkül nem tölt be feladatokat, és üres listát mutat', async () => {
        render(<CalendarPage />);

        await waitFor(() => {
            expect(screen.getByText('cal.noTasks')).toBeInTheDocument();
        });
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('bejelentkezve lekéri és a kiválasztott naphoz megjeleníti a feladatokat', async () => {
        localStorage.setItem('token', 'test-token');

        const task = {
            id: 1,
            title: 'Teszt feladat',
            taskType: 'ZH',
            deadline: formatDateForApi(today, '09:00'),
            completed: false,
            pingDayBefore: false,
            pingOnDay: false,
        };

        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => [task],
        });

        render(<CalendarPage />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/tasks',
                expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
            );
            expect(screen.getByText(/Teszt feladat/)).toBeInTheDocument();
        });
    });

    it('bejelentkezés nélkül a mentés blokkolva van, és nem hív fetch-et', async () => {
        const { container } = render(<CalendarPage />);

        const titleInput = container.querySelectorAll('input[type="text"]')[0] as HTMLInputElement;
        const typeInput = container.querySelectorAll('input[type="text"]')[1] as HTMLInputElement;

        const user = userEvent.setup();
        await user.type(titleInput, 'Új feladat');
        await user.type(typeInput, 'Projekt');
        await user.click(screen.getByRole('button', { name: 'cal.save' }));

        await waitFor(() => {
            expect(screen.getByText('cal.needLogin')).toBeInTheDocument();
        });
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('bejelentkezve elmenti az új feladatot, és megjeleníti a listában', async () => {
        localStorage.setItem('token', 'test-token');

        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce({ ok: true, json: async () => [] })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 2,
                    title: 'Új feladat',
                    taskType: 'Projekt',
                    deadline: formatDateForApi(today, '08:00'),
                    completed: false,
                    pingDayBefore: false,
                    pingOnDay: false,
                }),
            });

        const { container } = render(<CalendarPage />);

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

        const titleInput = container.querySelectorAll('input[type="text"]')[0] as HTMLInputElement;
        const typeInput = container.querySelectorAll('input[type="text"]')[1] as HTMLInputElement;

        const user = userEvent.setup();
        await user.type(titleInput, 'Új feladat');
        await user.type(typeInput, 'Projekt');
        await user.click(screen.getByRole('button', { name: 'cal.save' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/tasks',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer test-token',
                    },
                    body: JSON.stringify({
                        title: 'Új feladat',
                        taskType: 'Projekt',
                        deadline: formatDateForApi(today, '08:00'),
                        completed: false,
                        pingDayBefore: false,
                        pingOnDay: false,
                        pingTelegramDayBefore: false,
                        pingTelegramOnDay: false,
                    }),
                })
            );
            expect(screen.getByText('Sikeresen mentve!')).toBeInTheDocument();
            expect(screen.getByText(/Új feladat/)).toBeInTheDocument();
        });
    });

    it('törli a kiválasztott napi feladatot', async () => {
        localStorage.setItem('token', 'test-token');

        const task = {
            id: 5,
            title: 'Törlendő feladat',
            taskType: 'Egyéb',
            deadline: formatDateForApi(today, '10:00'),
            completed: false,
            pingDayBefore: false,
            pingOnDay: false,
        };

        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce({ ok: true, json: async () => [task] })
            .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        const { container } = render(<CalendarPage />);

        await waitFor(() => {
            expect(screen.getByText(/Törlendő feladat/)).toBeInTheDocument();
        });

        const deleteBtn = container.querySelector('.lucide-trash-2')!.closest('button')!;
        fireEvent.click(deleteBtn);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/tasks/5',
                expect.objectContaining({
                    method: 'DELETE',
                    headers: { Authorization: 'Bearer test-token' },
                })
            );
            expect(screen.getByText('Sikeresen törölve!')).toBeInTheDocument();
            expect(screen.queryByText(/Törlendő feladat/)).not.toBeInTheDocument();
        });
    });
});