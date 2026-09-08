import { render, screen } from '@testing-library/react';
import AboutPage from './AboutPage';

jest.mock('../i18n/LanguageContext', () => {
    const translate = (key: string) => key;
    return {
        useLanguage: () => ({ t: translate, locale: 'hu-HU', language: 'hu' }),
    };
});

describe('AboutPage Komponens', () => {
    it('megjeleníti a fejlécet és a fejlesztő nevét', () => {
        render(<AboutPage />);

        expect(screen.getByRole('main')).toHaveClass('px-4', 'sm:px-6', 'lg:px-16');
        expect(screen.getByRole('heading', { level: 1, name: 'about.title' })).toBeInTheDocument();
        expect(screen.getByText('Czeitner András')).toBeInTheDocument();
    });

    it('megjeleníti mind a tíz funkció listaelemet', () => {
        render(<AboutPage />);

        for (let i = 1; i <= 10; i++) {
            expect(screen.getByText(`about.f${i}`)).toBeInTheDocument();
        }
    });

    it('megjeleníti a frontend technológiákat', () => {
        render(<AboutPage />);

        ['React', 'TypeScript', 'Vite', 'Tailwind CSS'].forEach((tech) => {
            expect(screen.getByText(tech)).toBeInTheDocument();
        });
    });

    it('megjeleníti a backend/üzemeltetés technológiákat', () => {
        render(<AboutPage />);

        ['Java', 'Spring Boot', 'PostgreSQL', 'JWT', 'Docker', 'Caddy'].forEach((tech) => {
            expect(screen.getByText(tech)).toBeInTheDocument();
        });
    });
});