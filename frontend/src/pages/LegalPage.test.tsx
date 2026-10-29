import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { translate } from '../i18n/translations';
import LegalPage from './LegalPage';

jest.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key: string) => translate('hu', key),
        language: 'hu',
    }),
}));

describe('LegalPage', () => {
    it('az adatvédelem kiírja a sütit és az ötletláda linket', () => {
        render(
            <MemoryRouter>
                <LegalPage kind="privacy" />
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Adatkezelési tájékoztató');
        expect(screen.getByText('Sütik')).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: 'ötletládán' })[0]).toHaveAttribute('href', '/otletlada');
    });

    it('az impresszum kimondja, hogy nem webshop', () => {
        render(
            <MemoryRouter>
                <LegalPage kind="imprint" />
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Impresszum');
        expect(screen.getByText(/nem webshop/)).toBeInTheDocument();
    });
});
