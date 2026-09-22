import { downloadAuthenticatedFile } from './downloadFile';

describe('downloadAuthenticatedFile', () => {
    beforeAll(() => {
        window.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
        window.URL.revokeObjectURL = jest.fn();
    });

    beforeEach(() => {
        globalThis.fetch = jest.fn();
        localStorage.clear();
        jest.clearAllMocks();
        document.body.innerHTML = '';
    });

    it('letölti a fájlt, ha a válasz sikeres és nem üres', async () => {
        localStorage.setItem('token', 'test-token');
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            blob: async () => new Blob(['pdf-content']),
        });

        const click = jest.fn();
        const originalCreate = document.createElement.bind(document);
        const createSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            const el = originalCreate(tagName);
            if (tagName === 'a') {
                el.click = click;
            }
            return el;
        });

        try {
            await expect(downloadAuthenticatedFile('/api/documents/admin/3/download', 'anyag.pdf')).resolves.toBe(true);

            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/documents/admin/3/download',
                expect.objectContaining({ credentials: 'include' })
            );
            expect(window.URL.createObjectURL).toHaveBeenCalled();
            expect(click).toHaveBeenCalled();
            expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
        } finally {
            createSpy.mockRestore();
        }
    });

    it('nem hoz létre fájlt, ha a szerver hibával válaszol', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            blob: async () => new Blob([]),
        });

        await expect(downloadAuthenticatedFile('/api/documents/download/1', 'x.pdf')).resolves.toBe(false);
        expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('nem hoz létre fájlt, ha a válasz 0 bájtos', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            blob: async () => new Blob([]),
        });

        await expect(downloadAuthenticatedFile('/api/documents/download/1', 'x.pdf')).resolves.toBe(false);
        expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    });
});
