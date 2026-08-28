import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminPanelPage from './AdminPanelPage';

jest.mock('../i18n/LanguageContext', () => {
    const translate = (key: string) => key;
    return {
        useLanguage: () => ({ t: translate, locale: 'hu-HU' }),
    };
});

const mockInitialFetches = (pending: unknown[] = [], suggestions: unknown[] = []) => {
    (globalThis.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => pending })
        .mockResolvedValueOnce({ ok: true, json: async () => suggestions });
};

const waitForListsToLoad = async () => {
    await waitFor(() => {
        expect(screen.queryAllByText('admin.loading')).toHaveLength(0);
    });
};

describe('AdminPanelPage Komponens', () => {
    beforeAll(() => {
        window.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
        window.URL.revokeObjectURL = jest.fn();
    });

    beforeEach(() => {
        globalThis.fetch = jest.fn();
        localStorage.clear();
        jest.clearAllMocks();
    });

    it('betöltés közben mindkét listánál a töltés szöveget jeleníti meg', () => {
        mockInitialFetches();
        render(<AdminPanelPage />);

        expect(screen.getAllByText('admin.loading')).toHaveLength(2);
    });

    it('lekéri a várakozó dokumentumokat és az ötleteket a megfelelő végpontokról', async () => {
        localStorage.setItem('token', 'test-token');
        mockInitialFetches();

        render(<AdminPanelPage />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/documents/admin/pending',
                expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
            );
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/suggestions',
                expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
            );
        });
    });

    it('üres listák esetén a megfelelő placeholder üzeneteket jeleníti meg', async () => {
        mockInitialFetches([], []);
        render(<AdminPanelPage />);

        await waitFor(() => {
            expect(screen.getByText(/admin\.noPending/)).toBeInTheDocument();
            expect(screen.getByText(/admin\.emptyIdeas/)).toBeInTheDocument();
        });
    });

    it('megjeleníti a várakozó dokumentumot és a beérkezett ötletet', async () => {
        mockInitialFetches(
            [{ id: 1, title: 'Tanterv 2026', category: 'Tanterv', fileName: 'tanterv.pdf', uploader: { username: 'kovacs.anna' } }],
            [{ id: 9, title: 'Több konnektor a teremben', description: 'Legyen több töltő az előadókban.', user: { username: 'nagy.peter' }, createdAt: '2026-03-01T10:00:00' }]
        );

        render(<AdminPanelPage />);

        await waitFor(() => {
            expect(screen.getByText('Tanterv 2026')).toBeInTheDocument();
            expect(screen.getByText(/kovacs\.anna/)).toBeInTheDocument();
            expect(screen.getByText(/Több konnektor a teremben/)).toBeInTheDocument();
            expect(screen.getByText(/Legyen több töltő az előadókban\./)).toBeInTheDocument();
            expect(screen.getByText(/nagy\.peter/)).toBeInTheDocument();
        });
    });

    it('ismeretlen beküldő esetén az admin.unknown feliratot jeleníti meg az ötletnél', async () => {
        mockInitialFetches(
            [],
            [{ id: 10, title: 'Anonim ötlet', description: 'Leírás.', user: undefined, createdAt: '2026-03-01T10:00:00' }]
        );

        render(<AdminPanelPage />);

        await waitFor(() => {
            expect(screen.getByText(/admin\.unknown/)).toBeInTheDocument();
        });
    });

    it('jóváhagyja a dokumentumot, és eltávolítja a várakozó listából', async () => {
        localStorage.setItem('token', 'test-token');
        mockInitialFetches(
            [{ id: 1, title: 'Tanterv 2026', category: 'Tanterv', fileName: 'tanterv.pdf', uploader: { username: 'kovacs.anna' } }],
            []
        );
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        render(<AdminPanelPage />);
        await waitFor(() => expect(screen.getByText('Tanterv 2026')).toBeInTheDocument());

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'admin.approve' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/documents/admin/1/approve',
                expect.objectContaining({ method: 'PUT', headers: { Authorization: 'Bearer test-token' } })
            );
            expect(screen.queryByText('Tanterv 2026')).not.toBeInTheDocument();
        });
    });

    it('elutasítja a dokumentumot, és eltávolítja a várakozó listából', async () => {
        localStorage.setItem('token', 'test-token');
        mockInitialFetches(
            [{ id: 2, title: 'Rossz dokumentum', category: 'Egyéb', fileName: 'x.pdf', uploader: { username: 'teszt.elek' } }],
            []
        );
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        render(<AdminPanelPage />);
        await waitFor(() => expect(screen.getByText('Rossz dokumentum')).toBeInTheDocument());

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'admin.reject' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/documents/admin/2/reject',
                expect.objectContaining({ method: 'DELETE', headers: { Authorization: 'Bearer test-token' } })
            );
            expect(screen.queryByText('Rossz dokumentum')).not.toBeInTheDocument();
        });
    });

    it('letölti a dokumentumot a megfelelő végponttal', async () => {
        localStorage.setItem('token', 'test-token');
        mockInitialFetches(
            [{ id: 3, title: 'Letölthető anyag', category: 'Egyéb', fileName: 'anyag.pdf', uploader: { username: 'teszt.elek' } }],
            []
        );
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            blob: async () => new Blob(['fake content']),
        });

        render(<AdminPanelPage />);
        await waitFor(() => expect(screen.getByText('Letölthető anyag')).toBeInTheDocument());

        const user = userEvent.setup();
        await user.click(screen.getByTitle('admin.downloadCheck'));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/documents/download/3',
                expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
            );
        });
    });

    it('törli a kiválasztott ötletet', async () => {
        localStorage.setItem('token', 'test-token');
        mockInitialFetches(
            [],
            [{ id: 9, title: 'Törlendő ötlet', description: 'Leírás.', user: { username: 'teszt.elek' }, createdAt: '2026-03-01T10:00:00' }]
        );
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        render(<AdminPanelPage />);
        await waitFor(() => expect(screen.getByText(/Törlendő ötlet/)).toBeInTheDocument());

        const user = userEvent.setup();
        await user.click(screen.getByTitle('admin.deleteProcessed'));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/suggestions/9',
                expect.objectContaining({ method: 'DELETE', headers: { Authorization: 'Bearer test-token' } })
            );
            expect(screen.queryByText(/Törlendő ötlet/)).not.toBeInTheDocument();
        });
    });

    it('elmenti az új hírt, sikeres üzenetet jelenít meg, és üríti az űrlapot', async () => {
        localStorage.setItem('token', 'test-token');
        mockInitialFetches();
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        const { container } = render(<AdminPanelPage />);
        await waitForListsToLoad();

        const titleInput = container.querySelector('input[type="text"]') as HTMLInputElement;
        const descInput = container.querySelector('textarea') as HTMLTextAreaElement;

        const user = userEvent.setup();
        await user.type(titleInput, 'Új esemény');
        await user.type(descInput, 'Esemény leírása');
        await user.click(screen.getByRole('button', { name: 'admin.newsSubmit' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/events',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer test-token',
                    },
                    body: JSON.stringify({
                        title: 'Új esemény',
                        description: 'Esemény leírása',
                        eventDate: null,
                        imageUrl: null,
                    }),
                })
            );
            expect(screen.getByText('admin.newsSuccess')).toBeInTheDocument();
        });

        expect(titleInput).toHaveValue('');
        expect(descInput).toHaveValue('');
    });

    it('hibaüzenetet jelenít meg, ha a szerver elutasítja a hír mentését', async () => {
        localStorage.setItem('token', 'test-token');
        mockInitialFetches();
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({}) });

        const { container } = render(<AdminPanelPage />);
        await waitForListsToLoad();

        const titleInput = container.querySelector('input[type="text"]') as HTMLInputElement;
        const descInput = container.querySelector('textarea') as HTMLTextAreaElement;

        const user = userEvent.setup();
        await user.type(titleInput, 'Cím');
        await user.type(descInput, 'Leírás');
        await user.click(screen.getByRole('button', { name: 'admin.newsSubmit' }));

        await waitFor(() => {
            expect(screen.getByText('admin.newsError')).toBeInTheDocument();
        });
    });

    it('hibaüzenetet jelenít meg, ha a hír mentése kapcsolódási hiba miatt elbukik', async () => {
        localStorage.setItem('token', 'test-token');
        mockInitialFetches();
        (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));

        const { container } = render(<AdminPanelPage />);
        await waitForListsToLoad();

        const titleInput = container.querySelector('input[type="text"]') as HTMLInputElement;
        const descInput = container.querySelector('textarea') as HTMLTextAreaElement;

        const user = userEvent.setup();
        await user.type(titleInput, 'Cím');
        await user.type(descInput, 'Leírás');
        await user.click(screen.getByRole('button', { name: 'admin.newsSubmit' }));

        await waitFor(() => {
            expect(screen.getByText('admin.newsError')).toBeInTheDocument();
        });
    });

    it('bejelentkezés nélkül a hír mentése nem hív fetch-et, és a gomb töltés állapotban ragad', async () => {
        mockInitialFetches();

        const { container } = render(<AdminPanelPage />);
        await waitForListsToLoad();

        const titleInput = container.querySelector('input[type="text"]') as HTMLInputElement;
        const descInput = container.querySelector('textarea') as HTMLTextAreaElement;

        const user = userEvent.setup();
        await user.type(titleInput, 'Cím');
        await user.type(descInput, 'Leírás');
        await user.click(screen.getByRole('button', { name: 'admin.newsSubmit' }));

        expect(globalThis.fetch).toHaveBeenCalledTimes(2);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'admin.loading' })).toBeDisabled();
        });
        expect(screen.queryByText('admin.newsError')).not.toBeInTheDocument();
    });
});