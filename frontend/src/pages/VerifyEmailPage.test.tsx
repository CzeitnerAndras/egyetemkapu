import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerifyEmailPage, { readEmailVerifyToken } from './VerifyEmailPage';

jest.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
    }),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

function renderVerify(path: string, hash = '') {
    window.location.hash = hash;
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/email-megerosites" element={<VerifyEmailPage />} />
            </Routes>
        </MemoryRouter>
    );
}

describe('VerifyEmailPage Komponens', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn();
        mockNavigate.mockClear();
        jest.clearAllMocks();
        window.location.hash = '';
    });

    afterEach(() => {
        window.location.hash = '';
        jest.useRealTimers();
    });

    it('csak a hash fragmentből olvassa a tokent', () => {
        expect(readEmailVerifyToken('#token=hash')).toBe('hash');
        expect(readEmailVerifyToken('token=hash')).toBe('hash');
        expect(readEmailVerifyToken('')).toBe('');
    });

    it('token nélkül a hiányzó link üzenetet mutatja, és nem hív fetch-et', () => {
        renderVerify('/email-megerosites');

        expect(screen.getByText('verify.missingToken')).toBeInTheDocument();
        expect(globalThis.fetch).not.toHaveBeenCalled();
        expect(screen.getByRole('link', { name: 'verify.backToLogin' })).toHaveAttribute('href', '/login');
    });

    it('érvényes tokennel megerősít, és a bejelentkezéshez irányít', async () => {
        jest.useFakeTimers();
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: 'ok' }),
        });

        renderVerify('/email-megerosites', '#token=abc');

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/auth/verify-email',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ token: 'abc' }),
                })
            );
            expect(screen.getByText(/verify\.success/)).toBeInTheDocument();
        });

        act(() => {
            jest.advanceTimersByTime(2000);
        });
        expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('érvénytelen tokennel hibát mutat', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Érvénytelen vagy lejárt megerősítő link.' }),
        });

        renderVerify('/email-megerosites', '#token=rossz');

        expect(await screen.findByText(/Érvénytelen vagy lejárt megerősítő link\./)).toBeInTheDocument();
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
