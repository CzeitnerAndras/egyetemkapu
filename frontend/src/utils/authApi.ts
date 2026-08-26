export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let token = localStorage.getItem('token');
    
    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (refreshToken) {
            try {
                const refreshResponse = await fetch('http://localhost:8080/api/auth/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken })
                });

                if (refreshResponse.ok) {
                    const data = await refreshResponse.json();
                    localStorage.setItem('token', data.token);
                    headers.set('Authorization', `Bearer ${data.token}`);
                    response = await fetch(url, { ...options, headers });
                } else {
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/login';
                }
            } catch (error) {
                console.error("Hiba a token frissítésekor", error);
            }
        } else {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
    }

    return response;
};