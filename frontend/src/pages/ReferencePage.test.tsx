import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReferencePage from './ReferencePage';

jest.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({ 
        t: (key: string) => key, 
        language: 'hu' 
    }),
}));

describe('ReferencePage Komponens', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn();
        localStorage.clear();
        jest.clearAllMocks();
        if (!navigator.clipboard) {
            Object.defineProperty(navigator, 'clipboard', {
                value: {},
                configurable: true,
            });
        }
        navigator.clipboard.writeText = jest.fn();
    });

    it('alapértelmezetten üres állapotot mutat', () => {
        render(<ReferencePage />);
        expect(screen.getByText(/ref\.empty/i)).toBeInTheDocument();
    });

    it('lekezeli az űrlap mezőinek kitöltését', async () => {
        render(<ReferencePage />);
        const user = userEvent.setup();

        const authorInput = screen.getByPlaceholderText('pl. John Doe');
        const titleInput = screen.getByPlaceholderText('ref.titlePlaceholder');
        const yearInput = screen.getByPlaceholderText('pl. 2024');
        const publisherInput = screen.getByPlaceholderText('ref.publisherPlaceholder');
        const styleSelect = screen.getByRole('combobox');

        await user.type(authorInput, 'Gipsz Jakab');
        await user.type(titleInput, 'A nagy tesztkönyv');
        await user.type(yearInput, '2024');
        await user.type(publisherInput, 'Teszt Kiadó');
        await user.selectOptions(styleSelect, 'MLA');

        expect(authorInput).toHaveValue('Gipsz Jakab');
        expect(titleInput).toHaveValue('A nagy tesztkönyv');
        expect(yearInput).toHaveValue('2024');
        expect(publisherInput).toHaveValue('Teszt Kiadó');
        expect(styleSelect).toHaveValue('MLA');
    });

    it('sikeres hívás után megjeleníti a generált hivatkozást', async () => {
        localStorage.setItem('token', 'test-token');
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ reference: 'Gipsz, J. (2024). A nagy tesztkönyv. Teszt Kiadó.' })
        });

        render(<ReferencePage />);
        const user = userEvent.setup();

        await user.type(screen.getByPlaceholderText('ref.titlePlaceholder'), 'A nagy tesztkönyv');
        await user.click(screen.getByRole('button', { name: /ref.generate/i }));

        expect(globalThis.fetch).toHaveBeenCalledWith(
            '/api/tools/reference/generate',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token'
                },
                body: JSON.stringify({
                    author: '',
                    title: 'A nagy tesztkönyv',
                    year: '',
                    publisher: '',
                    style: 'APA'
                })
            })
        );

        const generatedText = await screen.findByText('Gipsz, J. (2024). A nagy tesztkönyv. Teszt Kiadó.');
        expect(generatedText).toBeInTheDocument();
    });

    it('hiba esetén lekezeli a hálózati / szerver oldali problémát', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        render(<ReferencePage />);
        const user = userEvent.setup();

        await user.type(screen.getByPlaceholderText('ref.titlePlaceholder'), 'Hiba könyv');
        await user.click(screen.getByRole('button', { name: /ref.generate/i }));

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Hálózati hiba:', expect.any(Error));
        });
        
        expect(screen.getByText(/ref\.empty/i)).toBeInTheDocument();
        
        consoleSpy.mockRestore();
    });

    it('vágólapra másolás után 2 másodperccel visszaáll a másolás gomb állapota', async () => {
        jest.useFakeTimers({ advanceTimers: true });
        
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ reference: 'Másolandó hivatkozás' })
        });

        render(<ReferencePage />);
        
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

        await user.type(screen.getByPlaceholderText('ref.titlePlaceholder'), 'Másolás teszt');
        await user.click(screen.getByRole('button', { name: /ref.generate/i }));

        const generatedText = await screen.findByText('Másolandó hivatkozás');
        expect(generatedText).toBeInTheDocument();

        const copyButton = screen.getByRole('button', { name: /ref.copy/i });
        await user.click(copyButton);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Másolandó hivatkozás');
        expect(screen.getByText(/ref.copied/i)).toBeInTheDocument();

        act(() => {
            jest.advanceTimersByTime(2000);
        });

        expect(screen.queryByText(/ref.copied/i)).not.toBeInTheDocument();
        expect(screen.getByText(/ref.copy/i)).toBeInTheDocument();

        jest.useRealTimers();
    });
});