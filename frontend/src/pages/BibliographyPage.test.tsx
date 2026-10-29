import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BibliographyPage from './BibliographyPage';

jest.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key: string, vars?: Record<string, string | number>) => (vars?.count !== undefined ? `${key}:${vars.count}` : key),
        locale: 'hu-HU',
        language: 'hu',
    }),
}));

const sorted = [
    'Antal, Béla (2014). A ház.',
    'Czakó, Eszter (2021). A kert.',
    'Csányi, Péter (2019). A híd.',
];

describe('BibliographyPage', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn();
    });

    it('a mintát elküldi a Python szolgáltatásnak, és a kapott sorrendet írja ki', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ entries: sorted, count: sorted.length }),
        });

        const user = userEvent.setup();
        render(<BibliographyPage />);

        await user.click(screen.getByRole('button', { name: 'bib.sample' }));
        await user.click(screen.getByRole('button', { name: 'bib.sort' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/bibliography/sort',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('Csányi'),
                })
            );
            const items = screen.getAllByRole('listitem').map((item) => item.textContent);
            expect(items).toEqual(sorted);
            expect(screen.getByText('bib.count:3')).toBeInTheDocument();
        });
    });

    it('üres szövegnél nem hívja a szolgáltatást', async () => {
        const user = userEvent.setup();
        render(<BibliographyPage />);

        await user.click(screen.getByRole('button', { name: 'bib.sort' }));

        expect(screen.getByText(/bib\.err\.empty/)).toBeInTheDocument();
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('szól, ha a szolgáltatás nem elérhető', async () => {
        (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error('offline'));

        const user = userEvent.setup();
        render(<BibliographyPage />);
        await user.click(screen.getByRole('button', { name: 'bib.sample' }));
        await user.click(screen.getByRole('button', { name: 'bib.sort' }));

        await waitFor(() => {
            expect(screen.getByText(/bib\.error/)).toBeInTheDocument();
        });
    });
});
