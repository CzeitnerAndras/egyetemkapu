import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RequireAdmin from './RequireAdmin';

jest.mock('../utils/authApi', () => ({
    fetchWithAuth: jest.fn(),
}));

import { fetchWithAuth } from '../utils/authApi';

const mockFetch = fetchWithAuth as jest.Mock;

function renderAtAdmin() {
    return render(
        <MemoryRouter initialEntries={['/admin']}>
            <Routes>
                <Route path="/" element={<div>home-page</div>} />
                <Route path="/login" element={<div>login-page</div>} />
                <Route
                    path="/admin"
                    element={(
                        <RequireAdmin>
                            <div>admin-page</div>
                        </RequireAdmin>
                    )}
                />
            </Routes>
        </MemoryRouter>
    );
}

describe('RequireAdmin', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it('shows the admin page when the account role is admin', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ role: 'ROLE_ADMIN' }),
        });

        renderAtAdmin();

        expect(await screen.findByText('admin-page')).toBeInTheDocument();
        expect(mockFetch).toHaveBeenCalledWith('/api/users/me', {}, { redirectOnAuthFailure: false });
    });

    it('sends a normal logged-in user back home', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ role: 'ROLE_USER' }),
        });

        renderAtAdmin();

        expect(await screen.findByText('home-page')).toBeInTheDocument();
        expect(screen.queryByText('admin-page')).not.toBeInTheDocument();
    });

    it('sends a logged-out visitor to login', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 401,
            json: async () => ({}),
        });

        renderAtAdmin();

        expect(await screen.findByText('login-page')).toBeInTheDocument();
        expect(screen.queryByText('admin-page')).not.toBeInTheDocument();
    });

    it('does not treat a role that merely contains the word admin as an admin', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ role: 'ROLE_USER', isAdmin: true }),
        });

        renderAtAdmin();

        expect(await screen.findByText('home-page')).toBeInTheDocument();
    });
});
