import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TerminalHack from './TerminalGame';

jest.setTimeout(20000);

const waitForBootComplete = () =>
    waitFor(() => expect(screen.getByText('> █')).toBeInTheDocument(), { timeout: 10000 });

describe('TerminalHack Komponens', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    afterEach(() => {
        document.querySelectorAll('style').forEach((el) => el.remove());
    });

    it('megjeleníti a fejléc szövegeket, és a felcsatolás idejére elrejti a navigációs sávot', () => {
        const { unmount } = render(<TerminalHack onSuccess={jest.fn()} />);

        expect(screen.getByText('BANDI INDUSTRIES (TM) TERMLINK PROTOCOL')).toBeInTheDocument();
        expect(screen.getByText('ENTER PASSWORD NOW')).toBeInTheDocument();

        const style = document.head.querySelector('style');
        expect(style?.innerHTML).toContain('nav { display: none !important; }');

        unmount();
        expect(document.head.querySelector('style')).not.toBeInTheDocument();
    });

    it('a boot animáció befejezése előtt egyetlen szó sem kattintható', () => {
        const { container } = render(<TerminalHack onSuccess={jest.fn()} />);
        expect(container.querySelectorAll('.cursor-pointer.font-bold')).toHaveLength(0);
    });

    it('a helyes jelszóra kattintva hozzáférést biztosít, és meghívja az onSuccess callback-et', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const onSuccess = jest.fn();
        render(<TerminalHack onSuccess={onSuccess} />);

        await waitForBootComplete();

        await userEvent.click(screen.getByText('GAMES'));

        expect(screen.getByText('> GAMES')).toBeInTheDocument();
        expect(screen.getByText('> Exact match!')).toBeInTheDocument();
        expect(screen.getByText('> Access granted.')).toBeInTheDocument();

        await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1), { timeout: 5000 });
    });

    it('helytelen szóra kattintva csökkenti a hátralévő próbálkozások számát, és hasonlósági pontszámot ír ki', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<TerminalHack onSuccess={jest.fn()} />);

        await waitForBootComplete();

        await userEvent.click(screen.getByText('LINKS'));

        expect(screen.getByText('> LINKS')).toBeInTheDocument();
        expect(screen.getByText('> Entry denied.')).toBeInTheDocument();
        expect(screen.getByText(/Likeness=/)).toBeInTheDocument();
        expect(screen.getByText(/3 ATTEMPT\(S\) LEFT/)).toBeInTheDocument();
    });

    it('négy helytelen próbálkozás után lezárja a terminált, és triggerFatalError eseményt küld', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<TerminalHack onSuccess={jest.fn()} />);

        await waitForBootComplete();

        const handler = jest.fn();
        window.addEventListener('triggerFatalError', handler);

        for (const word of ['LINKS', 'FRONT', 'IDEAS', 'REACT']) {
            await userEvent.click(screen.getByText(word));
        }

        expect(screen.getByText('> TERMINAL LOCKED')).toBeInTheDocument();
        expect(screen.getByText('> PLEASE CONTACT ADMINISTRATOR')).toBeInTheDocument();

        await waitFor(() => expect(handler).toHaveBeenCalledTimes(1), { timeout: 5000 });
        window.removeEventListener('triggerFatalError', handler);
    });

    it('sikeres feltörés után a további kattintások nem hoznak létre új előzménybejegyzést', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        render(<TerminalHack onSuccess={jest.fn()} />);

        await waitForBootComplete();

        await userEvent.click(screen.getByText('GAMES'));
        await waitFor(() => expect(screen.getByText('> Access granted.')).toBeInTheDocument());

        await userEvent.click(screen.getByText('LINKS'));

        expect(screen.queryByText('> LINKS')).not.toBeInTheDocument();
    });
});