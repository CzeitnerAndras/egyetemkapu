type AuthFetchOptions = {
    redirectOnAuthFailure?: boolean;
};

export const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
};

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = (): Promise<string | null> => {
    if (refreshPromise) return refreshPromise;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return Promise.resolve(null);

    const pending = fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
    })
        .then(async response => {
            if (!response.ok) return null;

            const data = await response.json();
            if (!data || !data.token) return null;

            localStorage.setItem('token', data.token);
            if (data.refreshToken) {
                localStorage.setItem('refreshToken', data.refreshToken);
            }
            return data.token as string;
        })
        .catch(err => {
            console.error("Hiba a token frissítésekor", err);
            return null;
        })
        .finally(() => {
            refreshPromise = null;
        });

    refreshPromise = pending;
    return pending;
};

export const fetchWithAuth = async (
    url: string,
    options: RequestInit = {},
    { redirectOnAuthFailure = true }: AuthFetchOptions = {}
): Promise<Response> => {
    const send = (accessToken: string | null) => {
        const headers = new Headers(options.headers || {});
        if (accessToken) {
            headers.set('Authorization', `Bearer ${accessToken}`);
        }
        return fetch(url, { ...options, headers });
    };

    const response = await send(localStorage.getItem('token'));
    if (response.status !== 401) return response;

    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
        return send(newAccessToken);
    }

    clearSession();
    if (redirectOnAuthFailure) {
        window.location.href = '/login';
    }
    return response;
};
