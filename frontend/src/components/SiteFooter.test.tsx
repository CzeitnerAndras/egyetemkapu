import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SiteFooter from './SiteFooter';
import { isFlyerHost } from '../utils/flyerSite';

jest.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
        language: 'hu',
    }),
}));

jest.mock('../utils/flyerSite', () => ({
    isFlyerHost: jest.fn(() => false),
}));

describe('SiteFooter', () => {
    it('a hallgatói oldalon belső linkeket ad', () => {
        jest.mocked(isFlyerHost).mockReturnValue(false);
        render(
            <MemoryRouter>
                <SiteFooter />
            </MemoryRouter>,
        );

        expect(screen.getByRole('link', { name: 'footer.privacy' })).toHaveAttribute('href', '/adatvedelem');
        expect(screen.getByRole('link', { name: 'footer.imprint' })).toHaveAttribute('href', '/impresszum');
        expect(screen.getByRole('link', { name: 'footer.terms' })).toHaveAttribute('href', '/felhasznalasi-feltetelek');
    });

    it('az akciós hoston a főoldal jogi lapjaira mutat', () => {
        jest.mocked(isFlyerHost).mockReturnValue(true);
        render(
            <MemoryRouter>
                <SiteFooter />
            </MemoryRouter>,
        );

        expect(screen.getByRole('link', { name: 'footer.privacy' })).toHaveAttribute('href', 'https://egyetemkapu.hu/adatvedelem');
    });
});
