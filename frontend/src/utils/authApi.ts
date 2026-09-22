type AuthFetchOptions = {
    redirectOnAuthFailure?: boolean;
    retryOn401?: boolean;
};

export const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
};

clearSession();

let refreshPromise: Promise<boolean> | null = null;

const refreshAccessToken = (): Promise<boolean> => {
    if (refreshPromise) return refreshPromise;

    const pending = Promise.resolve(fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
    }))
        .then(response => !!response && response.ok)
        .catch(err => {
            console.error("Hiba a token frissítésekor", err);
            return false;
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
    { redirectOnAuthFailure = true, retryOn401 = true }: AuthFetchOptions = {}
): Promise<Response> => {
    const send = () => {
        const headers = new Headers(options.headers || {});
        return fetch(url, { ...options, headers, credentials: 'include' });
    };

    const response = await send();
    if (!response) {
        throw new Error('Üres válasz a szervertől');
    }
    if (response.status !== 401) return response;
    if (!retryOn401) return response;

    const refreshed = await refreshAccessToken();
    if (refreshed) {
        return send();
    }

    clearSession();
    if (redirectOnAuthFailure) {
        window.location.href = '/login';
    }
    return response;
};
