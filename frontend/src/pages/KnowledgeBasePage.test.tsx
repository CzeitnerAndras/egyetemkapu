import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KnowledgeBasePage from './KnowledgeBasePage';

jest.mock('../i18n/LanguageContext', () => {
    const translate = (key: string) => key;
    return {
        useLanguage: () => ({ t: translate, locale: 'hu-HU', language: 'hu' }),
    };
});

const mockDocumentsFetch = (docs: unknown[] = []) => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => docs,
    });
};

const sampleDoc = {
    id: 1,
    title: 'Fizika jegyzet',
    description: 'Mechanika összefoglaló.',
    category: 'Informatika',
    fileName: 'fizika.pdf',
    uploader: { username: 'kovacs.anna' },
    createdAt: '2026-03-01T10:00:00',
};

const openUploadModal = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: /kb\.submit/ }));
    expect(screen.getByText('kb.uploadTitle')).toBeInTheDocument();
};

const fillUploadForm = async (
    user: ReturnType<typeof userEvent.setup>,
    container: HTMLElement,
    { titleText = 'Fizika jegyzet', descText = 'Rövid leírás.' } = {}
) => {
    const titleInput = container.querySelector('form input[type="text"]') as HTMLInputElement;
    const descInput = container.querySelector('form textarea') as HTMLTextAreaElement;
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    await user.type(titleInput, titleText);
    await user.type(descInput, descText);
    await user.upload(fileInput, new File(['tartalom'], 'jegyzet.pdf', { type: 'application/pdf' }));
};

describe('KnowledgeBasePage Komponens', () => {
    beforeAll(() => {
        window.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
        window.URL.revokeObjectURL = jest.fn();
    });

    beforeEach(() => {
        globalThis.fetch = jest.fn();
        localStorage.clear();
        jest.clearAllMocks();
    });

    it('betöltés közben a töltés szöveget jeleníti meg', () => {
        mockDocumentsFetch([]);
        render(<KnowledgeBasePage />);

        expect(screen.getByText('kb.loading')).toBeInTheDocument();
    });

    it('kezdéskor szűrő nélkül lekéri a dokumentumokat, és megjeleníti azokat', async () => {
        localStorage.setItem('token', 'test-token');
        mockDocumentsFetch([sampleDoc]);

        render(<KnowledgeBasePage />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/documents',
                expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
            );
            expect(screen.getByText('Fizika jegyzet')).toBeInTheDocument();
            expect(screen.getByText(/kovacs\.anna/)).toBeInTheDocument();
        });
    });

    it('üres dokumentumlista esetén az üres állapot szöveget mutatja', async () => {
        mockDocumentsFetch([]);
        render(<KnowledgeBasePage />);

        await waitFor(() => {
            expect(screen.getByText(/kb\.empty/)).toBeInTheDocument();
        });
    });

    it('kategória szűrő váltásakor újra lekéri a dokumentumokat a kiválasztott kategóriával', async () => {
        mockDocumentsFetch([]);
        mockDocumentsFetch([]);

        const user = userEvent.setup();
        render(<KnowledgeBasePage />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/documents',
                expect.anything()
            );
        });

        await user.click(screen.getByRole('button', { name: /kb\.allCats/ }));
        await user.click(screen.getByRole('button', { name: 'kb.cat.math' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/documents?category=Matematika',
                expect.anything()
            );
        });
    });

    it('letölti a dokumentumot a megfelelő végponttal', async () => {
        localStorage.setItem('token', 'test-token');
        mockDocumentsFetch([sampleDoc]);
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            blob: async () => new Blob(['fake content']),
        });

        const user = userEvent.setup();
        render(<KnowledgeBasePage />);

        await waitFor(() => expect(screen.getByText('Fizika jegyzet')).toBeInTheDocument());

        await user.click(screen.getByRole('button', { name: /kb\.download/ }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8080/api/documents/download/1',
                expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
            );
        });
    });

    it('bezárja a feltöltési modált az X gombra kattintva', async () => {
        mockDocumentsFetch([]);
        const user = userEvent.setup();
        const { container } = render(<KnowledgeBasePage />);

        await waitFor(() => expect(screen.getByText(/kb\.empty/)).toBeInTheDocument());
        await openUploadModal(user);

        const closeButton = container.querySelector('main + div button') as HTMLButtonElement;
        await user.click(closeButton);

        expect(screen.queryByText('kb.uploadTitle')).not.toBeInTheDocument();
    });

    it('sikeresen feltölt egy dokumentumot a megfelelő FormData adatokkal', async () => {
        localStorage.setItem('token', 'test-token');
        mockDocumentsFetch([]);
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: 'Sikeres feltöltés!' }),
        });

        const user = userEvent.setup();
        const { container } = render(<KnowledgeBasePage />);

        await waitFor(() => expect(screen.getByText(/kb\.empty/)).toBeInTheDocument());
        await openUploadModal(user);
        await fillUploadForm(user, container);

        await user.click(screen.getByRole('button', { name: 'kb.uploadBtn' }));

        await waitFor(() => {
            expect(screen.getByText(/Sikeres feltöltés!/)).toBeInTheDocument();
        });

        const [, options] = (globalThis.fetch as jest.Mock).mock.calls[1];
        expect(options.headers).toEqual({ Authorization: 'Bearer test-token' });

        const formData = options.body as FormData;
        expect(formData.get('title')).toBe('Fizika jegyzet');
        expect(formData.get('description')).toBe('Rövid leírás.');
        expect(formData.get('category')).toBe('Informatika');
        expect((formData.get('file') as File).name).toBe('jegyzet.pdf');
    });

    it('a sikeres feltöltés után 3 másodperccel bezárja a modált és üríti az űrlapot', async () => {
        jest.useFakeTimers();
        try {
            localStorage.setItem('token', 'test-token');
            mockDocumentsFetch([]);
            (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Sikeres feltöltés!' }),
            });

            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            const { container } = render(<KnowledgeBasePage />);

            await waitFor(() => expect(screen.getByText(/kb\.empty/)).toBeInTheDocument());
            await openUploadModal(user);
            await fillUploadForm(user, container);
            await user.click(screen.getByRole('button', { name: 'kb.uploadBtn' }));

            await waitFor(() => {
                expect(screen.getByText(/Sikeres feltöltés!/)).toBeInTheDocument();
            });

            act(() => {
                jest.advanceTimersByTime(3000);
            });

            await waitFor(() => {
                expect(screen.queryByText('kb.uploadTitle')).not.toBeInTheDocument();
            });
        } finally {
            jest.useRealTimers();
        }
    });

    it('hibaüzenetet mutat, ha a szerver elutasítja a feltöltést', async () => {
        localStorage.setItem('token', 'test-token');
        mockDocumentsFetch([]);
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Túl nagy fájl.' }),
        });

        const user = userEvent.setup();
        const { container } = render(<KnowledgeBasePage />);

        await waitFor(() => expect(screen.getByText(/kb\.empty/)).toBeInTheDocument());
        await openUploadModal(user);
        await fillUploadForm(user, container);
        await user.click(screen.getByRole('button', { name: 'kb.uploadBtn' }));

        await waitFor(() => {
            expect(screen.getByText(/Túl nagy fájl\./)).toBeInTheDocument();
        });
    });

    it('hibaüzenetet mutat kapcsolódási hiba esetén feltöltéskor', async () => {
        localStorage.setItem('token', 'test-token');
        mockDocumentsFetch([]);
        (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));

        const user = userEvent.setup();
        const { container } = render(<KnowledgeBasePage />);

        await waitFor(() => expect(screen.getByText(/kb\.empty/)).toBeInTheDocument());
        await openUploadModal(user);
        await fillUploadForm(user, container);
        await user.click(screen.getByRole('button', { name: 'kb.uploadBtn' }));

        await waitFor(() => {
            expect(screen.getByText(/kb\.networkError/)).toBeInTheDocument();
        });
    });
});