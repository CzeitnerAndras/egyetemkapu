import { waitFor } from '@testing-library/react';
import { clearSession, fetchWithAuth } from './authApi';

describe('authApi', () => {
    beforeEach(() => {
        localStorage.clear();
        globalThis.fetch = jest.fn();
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('törli a session tokeneket', () => {
        localStorage.setItem('token', 'access');
        localStorage.setItem('refreshToken', 'refresh');

        clearSession();

        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it('cookie-val küldi a kérést, és 200-nál nem frissít', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ status: 200 });

        const response = await fetchWithAuth('/api/notes');

        expect(response.status).toBe(200);
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
        const init = (globalThis.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
        expect(init.credentials).toBe('include');
        expect((init.headers as Headers).get('Authorization')).toBeNull();
    });

    it('401 után cookie-val frissít, és ugyanazzal az URL-lel újrapróbálja', async () => {
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce({ status: 401 })
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({ status: 200 });

        const response = await fetchWithAuth('/api/notes');

        expect(response.status).toBe(200);
        expect(globalThis.fetch).toHaveBeenNthCalledWith(
            2,
            '/api/auth/refresh',
            expect.objectContaining({
                method: 'POST',
                credentials: 'include',
            })
        );
        const retried = (globalThis.fetch as jest.Mock).mock.calls[2][1] as RequestInit;
        expect(retried.credentials).toBe('include');
        expect((retried.headers as Headers).get('Authorization')).toBeNull();
    });

    it('sikertelen frissítés után törli a sessiont, és /login-ra visz', async () => {
        localStorage.setItem('token', 'old');
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce({ status: 401 })
            .mockResolvedValueOnce({ ok: false });

        const response = await fetchWithAuth('/api/notes');

        expect(response.status).toBe(401);
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it('redirectOnAuthFailure: false esetén is törli a sessiont, és visszaadja a 401-et', async () => {
        (globalThis.fetch as jest.Mock)
            .mockResolvedValueOnce({ status: 401 })
            .mockResolvedValueOnce({ ok: false });

        const response = await fetchWithAuth('/api/users/me', {}, { redirectOnAuthFailure: false });

        expect(response.status).toBe(401);
        expect(console.error).not.toHaveBeenCalled();
    });

    it('párhuzamos 401-ek csak egyszer hívják a refresh végpontot', async () => {
        let resolveRefresh: (value: unknown) => void = () => { };
        const refreshResponse = new Promise((resolve) => {
            resolveRefresh = resolve;
        });

        (globalThis.fetch as jest.Mock).mockImplementation((url: string) => {
            if (url === '/api/auth/refresh') {
                return refreshResponse;
            }
            return Promise.resolve({ status: 401 });
        });

        const first = fetchWithAuth('/api/a');
        const second = fetchWithAuth('/api/b');

        await waitFor(() => {
            expect(
                (globalThis.fetch as jest.Mock).mock.calls.filter(([url]: [string]) => url === '/api/auth/refresh')
            ).toHaveLength(1);
        });

        resolveRefresh({ ok: true });

        await Promise.all([first, second]);
        expect(
            (globalThis.fetch as jest.Mock).mock.calls.filter(([url]: [string]) => url === '/api/auth/refresh')
        ).toHaveLength(1);
    });
});
