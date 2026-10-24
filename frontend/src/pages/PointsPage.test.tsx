import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PointsPage from './PointsPage';

jest.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
        locale: 'hu-HU',
        language: 'hu',
    }),
}));

const plan = {
    maxTotal: 100,
    earnedSoFar: 38,
    remainingMax: 50,
    currentPercent: 38,
    currentGrade: 1,
    openPartNames: ['Vizsga'],
    targets: [
        { grade: 2, minPercent: 50, pointsRequired: 50, pointsNeeded: 12, status: 'reachable' },
        { grade: 3, minPercent: 65, pointsRequired: 65, pointsNeeded: 27, status: 'reachable' },
        { grade: 4, minPercent: 75, pointsRequired: 75, pointsNeeded: 37, status: 'reachable' },
        { grade: 5, minPercent: 85, pointsRequired: 85, pointsNeeded: 47, status: 'reachable' },
    ],
};

describe('PointsPage', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn();
    });

    it('a mintával megkérdezi a Python szolgáltatást, és kiírja a vizsgapontot', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => plan,
        });

        const user = userEvent.setup();
        render(<PointsPage />);

        await user.click(screen.getByRole('button', { name: 'points.calculate' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/points/plan',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        parts: [
                            { name: 'ZH', maxPoints: 30, earned: 22 },
                            { name: 'Beadandó', maxPoints: 20, earned: 16 },
                            { name: 'Vizsga', maxPoints: 50, earned: null },
                        ],
                        thresholds: [
                            { grade: 2, minPercent: 50 },
                            { grade: 3, minPercent: 65 },
                            { grade: 4, minPercent: 75 },
                            { grade: 5, minPercent: 85 },
                        ],
                    }),
                })
            );
            expect(screen.getByText('38%')).toBeInTheDocument();
            expect(screen.getByText(/points\.fail/)).toBeInTheDocument();
            expect(screen.getAllByText(/points\.status\.reachableOn/).length).toBeGreaterThan(0);
        });
    });

    it('nem hívja a szolgáltatást, ha a megszerzett pont nagyobb a maximumnál', async () => {
        const user = userEvent.setup();
        render(<PointsPage />);

        const earned = screen.getAllByLabelText('points.earned')[0];
        await user.clear(earned);
        await user.type(earned, '40');
        await user.click(screen.getByRole('button', { name: 'points.calculate' }));

        expect(screen.getByText(/points\.err\.earnedAboveMax/)).toBeInTheDocument();
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('új részt lehet hozzáadni, és az utolsót nem engedi törölni egyedül', async () => {
        const user = userEvent.setup();
        render(<PointsPage />);

        expect(screen.getAllByTitle('points.delete')).toHaveLength(3);
        await user.click(screen.getByRole('button', { name: 'points.addPart' }));
        expect(screen.getAllByTitle('points.delete')).toHaveLength(4);
    });

    it('szól, ha a szolgáltatás nem elérhető', async () => {
        (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error('offline'));

        const user = userEvent.setup();
        render(<PointsPage />);
        await user.click(screen.getByRole('button', { name: 'points.calculate' }));

        await waitFor(() => {
            expect(screen.getByText(/points\.error/)).toBeInTheDocument();
        });
    });
});
