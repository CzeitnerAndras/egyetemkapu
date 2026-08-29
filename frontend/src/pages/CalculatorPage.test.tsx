import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalculatorPage from './CalculatorPage';

jest.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
    }),
}));

describe('CalculatorPage Komponens', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn();
        localStorage.clear();
        jest.clearAllMocks();
    });

    it('helyesen rendereli mindkét panelt és a két alapértelmezett tárgysort', () => {
        render(<CalculatorPage />);

        expect(screen.getByText('calc.averageTitle')).toBeInTheDocument();
        expect(screen.getByText('calc.mathTitle')).toBeInTheDocument();
        expect(screen.getAllByTitle('calc.delete')).toHaveLength(2);
    });

    it('új tárgy hozzáadása és eltávolítása módosítja a listát', async () => {
        const user = userEvent.setup();
        render(<CalculatorPage />);

        await user.click(screen.getByRole('button', { name: 'calc.addSubject' }));
        expect(screen.getAllByTitle('calc.delete')).toHaveLength(3);

        await user.click(screen.getAllByTitle('calc.delete')[0]);
        expect(screen.getAllByTitle('calc.delete')).toHaveLength(2);
    });

    it('kiszámolja a súlyozott átlagot és megjeleníti az eredményt', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ average: 4.75 }),
        });

        const user = userEvent.setup();
        render(<CalculatorPage />);

        await user.click(screen.getByRole('button', { name: 'calc.calculateAvg' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/calculator/weighted-average',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify([
                        { credit: 3, grade: 5 },
                        { credit: 3, grade: 5 },
                    ]),
                })
            );
            expect(screen.getByText('calc.avgResult')).toBeInTheDocument();
            expect(screen.getByText('4.75')).toBeInTheDocument();
        });
    });

    it('elvégzi a kiválasztott matematikai műveletet és megjeleníti az eredményt', async () => {
        localStorage.setItem('token', 'test-token');

        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ result: '2x' }),
        });

        const user = userEvent.setup();
        render(<CalculatorPage />);

        await user.click(screen.getByRole('button', { name: 'calc.op.derive' }));
        await user.click(screen.getByRole('button', { name: 'calc.op.integrate' }));

        await user.type(screen.getByPlaceholderText('x^2+2x'), 'x^2');
        await user.click(screen.getByRole('button', { name: 'calc.compute' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                `/api/tools/calculator/integrate/${encodeURIComponent('x^2')}`,
                expect.objectContaining({
                    headers: { Authorization: 'Bearer test-token' },
                })
            );
            expect(screen.getByText('calc.result')).toBeInTheDocument();
            expect(screen.getByText('2x')).toBeInTheDocument();
        });
    });

    it('bejelentkezési hibát jelez, ha a szerver 401-et ad vissza', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: async () => ({}),
        });

        const user = userEvent.setup();
        render(<CalculatorPage />);

        await user.type(screen.getByPlaceholderText('x^2+2x'), 'x^2');
        await user.click(screen.getByRole('button', { name: 'calc.compute' }));

        await waitFor(() => {
            expect(
                screen.getByText(/Kérlek, jelentkezz be a funkció használatához!/)
            ).toBeInTheDocument();
        });
    });

    it('kapcsolódási hibát jelez, ha a kérés elbukik', async () => {
        (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));

        const user = userEvent.setup();
        render(<CalculatorPage />);

        await user.type(screen.getByPlaceholderText('x^2+2x'), 'x^2');
        await user.click(screen.getByRole('button', { name: 'calc.compute' }));

        await waitFor(() => {
            expect(screen.getByText(/calc\.connError/)).toBeInTheDocument();
        });
    });
});