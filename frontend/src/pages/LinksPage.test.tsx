import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LinksPage from './LinksPage';

jest.mock('../i18n/LanguageContext', () => {
    const translate = (key: string) => key;
    return {
        useLanguage: () => ({ t: translate, locale: 'hu-HU', language: 'hu' }),
    };
});

describe('LinksPage Komponens', () => {
    it('megjeleníti a fejlécet és alapértelmezetten a Debreceni Egyetem (DE) linkjeit', () => {
        render(<LinksPage />);

        expect(screen.getByText('links.title')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'DEENK - Egyetemi Könyvtár' })
        ).toHaveAttribute('href', 'https://lib.unideb.hu/');
    });

    it('minden egyetem tab gombot megjelenít', () => {
        render(<LinksPage />);

        [
            'Debreceni Egyetem (DE)',
            'Műegyetem (BME)',
            'Eötvös Loránd (ELTE)',
            'Miskolci Egyetem (ME)',
            'Széchenyi István Egyetem (SZE)',
        ].forEach((name) => {
            expect(screen.getByText(name)).toBeInTheDocument();
        });
    });

    it('a linkek új lapon nyílnak meg, biztonságos rel attribútummal', () => {
        render(<LinksPage />);

        const link = screen.getByRole('link', { name: 'Neptun Hallgatói Web' });
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('egyetem váltásakor a megfelelő linkeket jeleníti meg', async () => {
        render(<LinksPage />);
        const user = userEvent.setup();

        await user.click(screen.getByText('Miskolci Egyetem (ME)'));

        expect(
            screen.getByRole('link', { name: 'Neptun Hallgatói Web' })
        ).toHaveAttribute('href', 'https://neptun.uni-miskolc.hu/');
        expect(screen.queryByRole('link', { name: 'DEENK - Egyetemi Könyvtár' })).not.toBeInTheDocument();
    });

    it('másik egyetemre váltva is a helyes kategóriák és linkek jelennek meg', async () => {
        render(<LinksPage />);
        const user = userEvent.setup();

        await user.click(screen.getByText('Széchenyi István Egyetem (SZE)'));

        expect(screen.getByText('Kautz Gyula Gazdaságtudományi Kar')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'GIVK Főoldal' })
        ).toHaveAttribute('href', 'https://givk.sze.hu/');
    });
});