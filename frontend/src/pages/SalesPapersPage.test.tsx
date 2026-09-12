import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalesPapersPage from './SalesPapersPage';

jest.mock('../i18n/LanguageContext', () => {
    const translate = (key: string) => key;
    return {
        useLanguage: () => ({ t: translate, locale: 'hu-HU', language: 'hu' }),
    };
});

function isoDate(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const flyers = [
    { id: 9, store: 'aldi', title: 'ALDI 20. hét', officialUrl: 'https://szorolap.aldi.hu/old/', pageCount: 63, productCount: 1, validFrom: isoDate(-120), validTo: isoDate(-114) },
    { id: 1, store: 'aldi', title: 'ALDI heti újság', officialUrl: 'https://szorolap.aldi.hu/x/', pageCount: 12, productCount: 8, validFrom: isoDate(0), validTo: isoDate(6) },
    { id: 11, store: 'aldi', title: 'ALDI Középső sor termékei', officialUrl: 'https://szorolap.aldi.hu/kozepso/', pageCount: 18, productCount: 45, validFrom: isoDate(0), validTo: isoDate(6) },
    { id: 12, store: 'aldi', title: 'ALDI Online akciós újság', officialUrl: 'https://szorolap.aldi.hu/online/', pageCount: 52, productCount: 211, validFrom: isoDate(0), validTo: isoDate(6) },
    { id: 2, store: 'spar', title: 'SPAR szórólap', officialUrl: 'https://www.spar.hu/ajanlatok/spar/260910-1-spar-szorolap', pageCount: 20, productCount: 0, validFrom: isoDate(0), validTo: isoDate(6) },
    { id: 21, store: 'spar', title: 'INTERSPAR szórólap', officialUrl: 'https://www.spar.hu/ajanlatok/interspar/260910-2-interspar-szorolap', pageCount: 22, productCount: 10, validFrom: isoDate(0), validTo: isoDate(6) },
    { id: 22, store: 'spar', title: 'SPAR Market', officialUrl: 'https://www.spar.hu/ajanlatok/spar-market/260910-3-spar-market-city-spar', pageCount: 12, productCount: 8, validFrom: isoDate(0), validTo: isoDate(6) },
    { id: 3, store: 'penny', title: 'PENNY ajánlatok', officialUrl: 'https://www.penny.hu/ajanlatok', pageCount: 1, productCount: 15 },
    { id: 31, store: 'tesco', title: 'Tesco Hipermarket', officialUrl: 'https://www.tesco.hu/akciok/katalogusok/hipermarket/tesco-ujsag-2026-09-10/1', pageCount: 34, productCount: 0, validFrom: isoDate(0), validTo: isoDate(6) },
    { id: 32, store: 'tesco', title: 'Tesco Szupermarket', officialUrl: 'https://www.tesco.hu/akciok/katalogusok/szupermarket/tesco-ujsag-2026-09-10/1', pageCount: 8, productCount: 0, validFrom: isoDate(0), validTo: isoDate(6) },
    { id: 33, store: 'tesco', title: 'Tesco Katalógus', officialUrl: 'https://www.tesco.hu/akciok/katalogusok/katalogus/tesco-ujsag-2026-08-05/1', pageCount: 20, productCount: 0, validFrom: isoDate(-5), validTo: isoDate(3) },
];

describe('SalesPapersPage Komponens', () => {
    beforeEach(() => {
        sessionStorage.clear();
        localStorage.clear();
        document.documentElement.classList.remove('flyer-open');
        globalThis.fetch = jest.fn().mockImplementation((url: string) => {
            if (url === '/api/flyers') {
                return Promise.resolve({ ok: true, json: async () => flyers });
            }
            if (url.startsWith('/api/flyers/search')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ([
        { flyerId: 1, store: 'aldi', title: 'ALDI heti újság', pageNumber: 2, productName: 'Kakaóscsiga', snippet: 'Kakaóscsiga', kind: 'product', productId: 11 },
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
                        products: [
                            { id: 11, pageNumber: 2, name: 'Kakaóscsiga' },
                            { id: 12, pageNumber: 1, name: 'Tej' },
                        ],
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
        expect(screen.queryByText('ALDI 20. hét')).not.toBeInTheDocument();
    });

    it('ALDI-nál az online újságot rakja a középső sor elé', async () => {
        render(<SalesPapersPage />);
        await userEvent.click(screen.getByRole('button', { name: 'notice.gotIt' }));
        await screen.findByText('ALDI Online akciós újság');
        const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
        expect(titles[0]).toBe('ALDI Online akciós újság');
        expect(titles[1]).toBe('ALDI Középső sor termékei');
    });

    it('SPAR-nál a heti SPAR, INTERSPAR és SPAR Market sorrendjét tartja', async () => {
        render(<SalesPapersPage />);
        await userEvent.click(screen.getByRole('button', { name: 'notice.gotIt' }));
        await userEvent.click(screen.getByRole('button', { name: /sales\.tagline\.spar/ }));
        const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
        expect(titles).toEqual(['SPAR szórólap', 'INTERSPAR szórólap', 'SPAR Market']);
    });

    it('TESCO-nál a hipermarket, szupermarket és katalógus sorrendjét tartja', async () => {
        render(<SalesPapersPage />);
        await userEvent.click(screen.getByRole('button', { name: 'notice.gotIt' }));
        await userEvent.click(screen.getByRole('button', { name: /sales\.tagline\.tesco/ }));
        const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
        expect(titles).toEqual(['Tesco Hipermarket', 'Tesco Szupermarket', 'Tesco Katalógus']);
    });

    it('elrejti a lejárt újságot', async () => {
        render(<SalesPapersPage />);
        await userEvent.click(screen.getByRole('button', { name: 'notice.gotIt' }));
        expect(await screen.findByText('ALDI heti újság')).toBeInTheDocument();
        expect(screen.queryByText('ALDI 20. hét')).not.toBeInTheDocument();
    });

    it('keresésre megjeleníti a termék találatot, majd megnyitja a lapozót', async () => {
        render(<SalesPapersPage />);
        await userEvent.click(screen.getByRole('button', { name: 'notice.gotIt' }));
        await screen.findByText('ALDI heti újság');

        await userEvent.type(screen.getByLabelText('sales.searchLabel'), 'kakaóscsiga');
        await userEvent.click(screen.getByRole('button', { name: 'sales.searchSubmit' }));

        expect(await screen.findByText('Kakaóscsiga')).toBeInTheDocument();

        await userEvent.click(screen.getByText('Kakaóscsiga'));
        await waitFor(() => {
            expect(screen.getByRole('img')).toHaveAttribute('src', '/api/flyers/1/pages/2?full=1');
        expect(screen.getByRole('img').className).toContain('w-full');
        });
        expect(screen.getByRole('link', { name: /sales.openOfficial/ })).toHaveAttribute('href', 'https://szorolap.aldi.hu/x/');
        expect(document.documentElement.classList.contains('flyer-open')).toBe(true);
        const pageProducts = screen.getByRole('complementary');
        expect(within(pageProducts).getByText('Kakaóscsiga')).toBeInTheDocument();
        expect(within(pageProducts).getByText('sales.listPageHint')).toBeInTheDocument();
        await userEvent.click(within(pageProducts).getByRole('button', { name: 'sales.listAdd' }));
        expect(within(pageProducts).getByRole('button', { name: 'sales.listAdded' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'sales.listTitle' })).toBeInTheDocument();
    });

    it('keresésből a listára teszi a terméket boltonként', async () => {
        render(<SalesPapersPage />);
        await userEvent.click(screen.getByRole('button', { name: 'notice.gotIt' }));
        await screen.findByText('ALDI heti újság');
        await userEvent.type(screen.getByLabelText('sales.searchLabel'), 'kakaóscsiga');
        await userEvent.click(screen.getByRole('button', { name: 'sales.searchSubmit' }));
        expect(await screen.findByText('Kakaóscsiga')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /sales\.listAdd/ }));
        expect(screen.getByRole('heading', { name: 'sales.listTitle' })).toBeInTheDocument();
        expect(screen.getAllByText('Kakaóscsiga').length).toBeGreaterThan(1);
        const shoppingList = screen.getByRole('heading', { name: 'sales.listTitle' }).closest('section');
        expect(shoppingList).not.toBeNull();
        expect(within(shoppingList as HTMLElement).getByText('ALDI')).toBeInTheDocument();
    });
});
