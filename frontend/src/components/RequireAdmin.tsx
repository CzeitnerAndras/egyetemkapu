import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchWithAuth } from '../utils/authApi';
import { isAdminRole } from '../utils/roles';

type Gate = 'loading' | 'allow' | 'deny' | 'login';

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
    const [gate, setGate] = useState<Gate>('loading');

    useEffect(() => {
        let cancelled = false;

        fetchWithAuth('/api/users/me', {}, { redirectOnAuthFailure: false })
            .then(async (res) => {
                if (cancelled) return;
                if (res.status === 401) {
                    setGate('login');
                    return;
                }
                if (!res.ok) {
                    setGate('deny');
                    return;
                }
                const data = await res.json();
                const role = data?.role || (Array.isArray(data?.roles) ? data.roles[0] : '');
                setGate(isAdminRole(role) ? 'allow' : 'deny');
            })
            .catch(() => {
                if (!cancelled) setGate('deny');
            });

        return () => {
            cancelled = true;
        };
    }, []);

    if (gate === 'loading') return null;
    if (gate === 'login') return <Navigate to="/login" replace />;
    if (gate === 'deny') return <Navigate to="/" replace />;
    return children;
}
