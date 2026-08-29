import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FaqPage from './FaqPage';

jest.mock('../i18n/LanguageContext', () => {
    const translate = (key: string) => key;
    return {
        useLanguage: () => ({ t: translate, locale: 'hu-HU', language: 'hu' }),
    };
});

describe('FaqPage Komponens', () => {
    it('megjeleníti a fejlécet és mind az öt kérdést', () => {
        render(<FaqPage />);

        expect(screen.getByText('faq.title')).toBeInTheDocument();
        for (let i = 1; i <= 5; i++) {
            expect(screen.getByText(`faq.q${i}`)).toBeInTheDocument();
        }
    });

    it('alapértelmezetten az első kérdés van nyitva', () => {
        render(<FaqPage />);

        expect(screen.getByText('faq.a1p')).toBeVisible();
    });

    it('kattintásra kinyit egy másik kérdést, és bezárja az előzőt', async () => {
        render(<FaqPage />);
        const user = userEvent.setup();

        await user.click(screen.getByText('faq.q2'));

        expect(screen.getByText('faq.a2')).toBeVisible();

        const firstAnswerPanel = screen.getByText('faq.a1p').closest('div.transition-all');
        expect(firstAnswerPanel).toHaveClass('max-h-0');
        expect(firstAnswerPanel).toHaveClass('opacity-0');
    });

    it('ismételt kattintásra bezárja a nyitott kérdést', async () => {
        render(<FaqPage />);
        const user = userEvent.setup();

        await user.click(screen.getByText('faq.q1'));

        const firstAnswerPanel = screen.getByText('faq.a1p').closest('div.transition-all');
        expect(firstAnswerPanel).toHaveClass('max-h-0');
        expect(firstAnswerPanel).toHaveClass('opacity-0');
    });

    it('az ötödik válasz kiemelt (piros) színnel jelenik meg', async () => {
        render(<FaqPage />);
        const user = userEvent.setup();

        await user.click(screen.getByText('faq.q5'));

        expect(screen.getByText('faq.a5')).toHaveClass('text-red-700');
    });
});