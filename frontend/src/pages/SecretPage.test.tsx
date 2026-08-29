import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SecretPage from './SecretPage';

jest.mock('../components/TerminalGame', () => ({
    __esModule: true,
    default: ({ onSuccess }: { onSuccess: () => void }) => (
        <button onClick={onSuccess}>mock-terminal-success</button>
    ),
}));

const hackTerminal = () => {
    localStorage.setItem('terminalHacked', 'true');
};

const setup = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

describe('SecretPage Komponens', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn();
        localStorage.clear();
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('nem feltört terminál esetén a TerminalHack komponenst jeleníti meg', () => {
        render(<SecretPage />);

        expect(screen.getByText('mock-terminal-success')).toBeInTheDocument();
    });

    it('sikeres feltörés után elmenti a localStorage-ba, és megjeleníti a terminált', async () => {
        const user = setup();
        render(<SecretPage />);

        await user.click(screen.getByText('mock-terminal-success'));

        expect(localStorage.getItem('terminalHacked')).toBe('true');
        expect(screen.getByText('<< Logoff')).toBeInTheDocument();
    });

    it('feltört állapotban, tokennel lekéri a felhasználónevet', async () => {
        localStorage.setItem('token', 'test-token');
        hackTerminal();
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ username: 'teszt_elek' }),
        });

        render(<SecretPage />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/users/me',
                expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
            );
        });

        expect(await screen.findByText(/TESZT_ELEK/)).toBeInTheDocument();
    });

    it('token nélkül nem hívja meg a felhasználó lekérő végpontot', () => {
        hackTerminal();
        render(<SecretPage />);

        expect(globalThis.fetch).not.toHaveBeenCalled();
        expect(screen.getByText(/UNKNOWN/)).toBeInTheDocument();
    });

    it('a "run:// details" gombra kattintva megnyitja a jegyzet modált, és lekéri a jegyzeteket', async () => {
        hackTerminal();
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => [{ id: 7, content: 'Régi jegyzet' }],
        });

        const user = setup();
        render(<SecretPage />);

        await user.click(screen.getByText('run:// details'));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/notes',
                expect.objectContaining({ headers: { Authorization: 'Bearer null' } })
            );
            expect(screen.getByDisplayValue('Régi jegyzet')).toBeInTheDocument();
        });
    });

    it('betöltés közben a "loading..." szöveget jeleníti meg, majd eltűnik', async () => {
        hackTerminal();
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => [] });

        const user = setup();
        render(<SecretPage />);

        await user.click(screen.getByText('run:// details'));

        expect(screen.getByText('loading...')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.queryByText('loading...')).not.toBeInTheDocument();
        });
    });

    it('meglévő jegyzet esetén PUT kéréssel menti el a módosítást', async () => {
        localStorage.setItem('token', 'test-token');
        hackTerminal();
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'teszt_elek' }) })
            .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 3, content: 'Eredeti szöveg' }] })
            .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        const user = setup();
        render(<SecretPage />);

        await user.click(screen.getByText('run:// details'));
        const textarea = await screen.findByDisplayValue('Eredeti szöveg');

        await user.clear(textarea);
        await user.type(textarea, 'Frissített szöveg');
        await user.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/notes/3',
                expect.objectContaining({
                    method: 'PUT',
                    headers: {
                        Authorization: 'Bearer test-token',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ content: 'Frissített szöveg' }),
                })
            );
        });
    });

    it('új jegyzet esetén POST kéréssel hozza létre, és eltárolja a kapott azonosítót', async () => {
        localStorage.setItem('token', 'test-token');
        hackTerminal();
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'teszt_elek' }) })
            .mockResolvedValueOnce({ ok: true, json: async () => [] })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 11 }) });

        const user = setup();
        render(<SecretPage />);

        await user.click(screen.getByText('run:// details'));
        const textarea = await screen.findByPlaceholderText('> type your notes here...');

        await user.type(textarea, 'Új jegyzet');
        await user.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/notes',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer test-token',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ content: 'Új jegyzet' }),
                })
            );
        });
    });

    it('a modál hátterére kattintva bezárja a jegyzeteket, de a panelen belüli kattintás nem', async () => {
        hackTerminal();
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => [] });

        const user = setup();
        render(<SecretPage />);

        await user.click(screen.getByText('run:// details'));
        await screen.findByText('> notes.log');

        fireEvent.click(screen.getByText('> notes.log'));
        expect(screen.getByText('> notes.log')).toBeInTheDocument();

        fireEvent.click(screen.getByText('> notes.log').closest('.fixed')!);
        expect(screen.queryByText('> notes.log')).not.toBeInTheDocument();
    });

    it('az X gombra kattintva is bezárja a jegyzet modált', async () => {
        hackTerminal();
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => [] });

        const user = setup();
        render(<SecretPage />);

        await user.click(screen.getByText('run:// details'));
        await screen.findByText('> notes.log');

        await user.click(screen.getByTitle('close'));

        expect(screen.queryByText('> notes.log')).not.toBeInTheDocument();
    });

    it('a Logoff gomb triggerLogoffEffect eseményt küld', async () => {
        hackTerminal();
        const handler = jest.fn();
        window.addEventListener('triggerLogoffEffect', handler);

        const user = setup();
        render(<SecretPage />);

        await user.click(screen.getByText('<< Logoff'));

        expect(handler).toHaveBeenCalledTimes(1);
        window.removeEventListener('triggerLogoffEffect', handler);
    });

    it('a "run:// error" gomb triggerFatalError eseményt küld', async () => {
        hackTerminal();
        const handler = jest.fn();
        window.addEventListener('triggerFatalError', handler);

        const user = setup();
        render(<SecretPage />);

        await user.click(screen.getByText('run:// error'));

        expect(handler).toHaveBeenCalledTimes(1);
        window.removeEventListener('triggerFatalError', handler);
    });
});