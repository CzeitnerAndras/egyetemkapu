import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LinkifiedText from './LinkifiedText';

describe('LinkifiedText', () => {
    it('leaves text without a url unchanged', () => {
        render(<LinkifiedText text="nincs link" linkClassName="link" />);

        expect(screen.getByText('nincs link')).toBeInTheDocument();
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('renders an empty string as nothing', () => {
        const { container } = render(<LinkifiedText text="" linkClassName="link" />);

        expect(container).toBeEmptyDOMElement();
    });

    it('turns a url into a link and keeps trailing punctuation outside the href', () => {
        const { container } = render(
            <LinkifiedText text="Nézd: https://egyetemkapu.hu/faq." linkClassName="link" />
        );

        const link = screen.getByRole('link', { name: 'https://egyetemkapu.hu/faq' });
        expect(link).toHaveAttribute('href', 'https://egyetemkapu.hu/faq');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        expect(link).toHaveClass('link');
        expect(container).toHaveTextContent('Nézd: https://egyetemkapu.hu/faq.');
    });

    it('does not let a link click bubble to the surrounding text', async () => {
        const user = userEvent.setup();
        const onParentClick = jest.fn();

        render(
            <div onClick={onParentClick}>
                <LinkifiedText text="https://egyetemkapu.hu" linkClassName="link" />
            </div>
        );

        await user.click(screen.getByRole('link'));

        expect(onParentClick).not.toHaveBeenCalled();
    });
});
