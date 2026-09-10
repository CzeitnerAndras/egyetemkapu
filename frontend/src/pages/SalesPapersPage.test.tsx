import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalesPapersPage from './SalesPapersPage';

jest.mock('../i18n/LanguageContext', () => {
    const translate = (key: string) => key;
    return {
        useLanguage: () => ({ t: translate, locale: 'hu-HU', language: 'hu' }),
    };
});

const flyers = [
    { id: 1, store: 'aldi', title: 'ALDI heti újság', officialUrl: 'https://szorolap.aldi.hu/x/', pageCount: 12, productCount: 8, validFrom: '2026-09-03', validTo: '2026-09-09' },
    { id: 2, store: 'spar', title: 'SPAR szórólap', officialUrl: 'https://www.spar.hu/ajanlatok', pageCount: 20, productCount: 0, validFrom: '2026-09-03', validTo: '2026-09-09' },
    { id: 3, store: 'penny', title: 'PENNY ajánlatok', officialUrl: 'https://www.penny.hu/ajanlatok', pageCount: 1, productCount: 15 },
];

describe('SalesPapersPage Komponens', () => {
    beforeEach(() => {
        sessionStorage.clear();
        document.documentElement.classList.remove('flyer-open');
        globalThis.fetch = jest.fn().mockImplementation((url: string) => {
            if (url === '/api/flyers') {
                return Promise.resolve({ ok: true, json: async () => flyers });
            }
            if (url.startsWith('/api/flyers/search')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ([
                        { flyerId: 1, store: 'aldi', title: 'ALDI heti újság', pageNumber: 2, productName: 'Kakaóscsiga', priceText: '249 Ft', snippet: 'Kakaóscsiga 249 Ft', kind: 'product' },
                    ]),
                });
            }
            if (url === '/api/flyers/1') {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        id: 1,
                        store: 'aldi',
                        title: 'ALDI heti újság',
                        officialUrl: 'https://szorolap.aldi.hu/x/',
                        pages: [{ pageNumber: 1, hasImage: true }, { pageNumber: 2, hasImage: true }],
                    }),
                });
            }
            return Promise.resolve({ ok: true, json: async () => [] });
        });
    });

    it('betölti az ALDI újságokat és vált SPAR-ra', async () => {
        render(<SalesPapersPage />);
        await userEvent.click(screen.getByRole('button', { name: 'notice.gotIt' }));

        expect(await screen.findByText('ALDI heti újság')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /ALDI heti újság/ }).className).toContain('dark:hover:bg-[#3b0764]');
        expect(screen.getByRole('button', { name: /sales\.tagline\.aldi/ })).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /sales\.tagline\.spar/ }));
        expect(screen.getByText('SPAR szórólap')).toBeInTheDocument();
        expect(screen.queryByText('ALDI heti újság')).not.toBeInTheDocument();
    });

    it('keresésre megjeleníti a termék találatot, majd megnyitja a lapozót', async () => {
        render(<SalesPapersPage />);
        await userEvent.click(screen.getByRole('button', { name: 'notice.gotIt' }));
        await screen.findByText('ALDI heti újság');

        await userEvent.type(screen.getByLabelText('sales.searchLabel'), 'kakaóscsiga');
        await userEvent.click(screen.getByRole('button', { name: 'sales.searchSubmit' }));

        expect(await screen.findByText('Kakaóscsiga')).toBeInTheDocument();
        expect(screen.getByText('249 Ft')).toBeInTheDocument();

        await userEvent.click(screen.getByText('Kakaóscsiga'));
        await waitFor(() => {
            expect(screen.getByRole('img')).toHaveAttribute('src', '/api/flyers/1/pages/2?full=1');
        expect(screen.getByRole('img').className).toContain('w-full');
        });
        expect(screen.getByRole('link', { name: /sales.openOfficial/ })).toHaveAttribute('href', 'https://szorolap.aldi.hu/x/');
        expect(document.documentElement.classList.contains('flyer-open')).toBe(true);
    });
});
