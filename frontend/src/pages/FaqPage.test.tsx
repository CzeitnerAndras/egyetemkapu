import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import FaqPage from './FaqPage';

jest.mock('../i18n/LanguageContext', () => {
    const translate = (key: string) => key;
    return {
        useLanguage: () => ({ t: translate, locale: 'hu-HU', language: 'hu' }),
    };
});

function renderFaq() {
    return render(
        <MemoryRouter>
            <FaqPage />
        </MemoryRouter>
    );
}

describe('FaqPage Komponens', () => {
    it('megjeleníti a fejlécet és mind a tíz kérdést', () => {
        renderFaq();

        expect(screen.getByText('faq.title')).toBeInTheDocument();
        for (let i = 1; i <= 10; i++) {
            expect(screen.getByText(`faq.q${i}`)).toBeInTheDocument();
        }
    });

    it('alapértelmezetten az első kérdés van nyitva', () => {
        renderFaq();

        expect(screen.getByText('faq.a1')).toBeVisible();
    });

    it('kattintásra kinyit egy másik kérdést, és bezárja az előzőt', async () => {
        renderFaq();
        const user = userEvent.setup();

        await user.click(screen.getByText('faq.q2'));

        expect(screen.getByText('faq.a2')).toBeVisible();

        const firstAnswerPanel = screen.getByText('faq.a1').closest('div.transition-all');
        expect(firstAnswerPanel).toHaveClass('max-h-0');
        expect(firstAnswerPanel).toHaveClass('opacity-0');
    });

    it('ismételt kattintásra bezárja a nyitott kérdést', async () => {
        renderFaq();
        const user = userEvent.setup();

        await user.click(screen.getByText('faq.q1'));

        const firstAnswerPanel = screen.getByText('faq.a1').closest('div.transition-all');
        expect(firstAnswerPanel).toHaveClass('max-h-0');
        expect(firstAnswerPanel).toHaveClass('opacity-0');
    });

    it('a profiltörlés válasz kiemelt (piros) színnel jelenik meg', async () => {
        renderFaq();
        const user = userEvent.setup();

        await user.click(screen.getByText('faq.q10'));

        expect(screen.getByText('faq.a10')).toHaveClass('text-red-700');
    });
});
