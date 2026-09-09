import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoticeModal } from './NoticeModal';

describe('NoticeModal', () => {
    it('nem jelenik meg, ha zárva van', () => {
        render(
            <NoticeModal open={false} onClose={() => {}} title="Figyelem" confirmLabel="Értem" closeLabel="Bezárás">
                Szöveg
            </NoticeModal>,
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('megjeleníti a címet és a gombra kattintva bezár', async () => {
        const onClose = jest.fn();
        render(
            <NoticeModal open onClose={onClose} title="Fejlesztés alatt" confirmLabel="Értem" closeLabel="Bezárás">
                Még készül.
            </NoticeModal>,
        );

        expect(screen.getByRole('dialog', { name: 'Fejlesztés alatt' })).toBeInTheDocument();
        expect(screen.getByText('Még készül.')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Értem' }));
        expect(onClose).toHaveBeenCalled();
    });
});
