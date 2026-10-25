import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordInput from './PasswordInput';

describe('PasswordInput', () => {
    it('starts hidden and toggles the value into view', async () => {
        const user = userEvent.setup();
        render(<PasswordInput aria-label="Jelszó" />);

        const input = screen.getByLabelText('Jelszó');
        expect(input).toHaveAttribute('type', 'password');

        await user.click(screen.getByRole('button', { name: 'Jelszó megjelenítése' }));

        expect(input).toHaveAttribute('type', 'text');
        expect(screen.getByRole('button', { name: 'Jelszó elrejtése' })).toHaveAttribute('aria-pressed', 'true');

        await user.click(screen.getByRole('button', { name: 'Jelszó elrejtése' }));

        expect(input).toHaveAttribute('type', 'password');
    });

    it('uses the labels it is given', () => {
        render(<PasswordInput aria-label="Jelszó" showLabel="Mutat" hideLabel="Rejt" />);

        expect(screen.getByRole('button', { name: 'Mutat' })).toBeInTheDocument();
    });
});
