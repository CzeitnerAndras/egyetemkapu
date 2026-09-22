import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { AuthCard, AuthHeader, PageShell } from '../components/PageLayout';

export function readEmailVerifyToken(hash: string): string {
    const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
    return new URLSearchParams(fragment).get('token') ?? '';
}

const verifyRequests = new Map<string, Promise<{ ok: boolean; error?: string }>>();

function verifyEmailRequest(token: string): Promise<{ ok: boolean; error?: string }> {
    const cached = verifyRequests.get(token);
    if (cached) {
        return cached;
    }
    const pending = fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
    })
        .then(async response => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                return { ok: false, error: typeof data.error === 'string' ? data.error : undefined };
            }
            return { ok: true };
        })
        .catch(error => {
            verifyRequests.delete(token);
            throw error;
        });
    verifyRequests.set(token, pending);
    return pending;
}

export default function VerifyEmailPage() {
    const { t } = useLanguage();
    const token = readEmailVerifyToken(window.location.hash);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [working, setWorking] = useState(!!token);
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            return;
        }
        let cancelled = false;
        verifyEmailRequest(token)
            .then(result => {
                if (cancelled) {
                    return;
                }
                if (!result.ok) {
                    setError(result.error || t('verify.invalid'));
                    return;
                }
                setSuccess(t('verify.success'));
                setTimeout(() => navigate('/login'), 2000);
            })
            .catch(() => {
                if (!cancelled) {
                    setError(t('verify.serverError'));
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setWorking(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [navigate, t, token]);

    return (
        <PageShell variant="auth">
        <AuthCard accent="cyan">
            <AuthHeader tone="fuchsia">
                {t('verify.title')}
            </AuthHeader>

            <div className="p-6 sm:p-8">
                {working && (
                    <div className="bg-cyan-200 dark:bg-purple-900/40 secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] p-3 mb-6 font-bold text-sm transition-colors shadow-[4px_4px_0px_#000] dark:shadow-sm secret:shadow-none secret:font-mono uppercase">
                        &gt; {t('verify.working')}
                    </div>
                )}

                {error && (
                    <div className="bg-red-400 dark:bg-red-900/40 secret:bg-black border-4 border-black dark:border-red-500 secret:border-[#1cf85d] text-black dark:text-red-300 secret:text-[#1cf85d] p-3 mb-6 font-bold text-sm transition-colors shadow-[4px_4px_0px_#000] dark:shadow-sm secret:shadow-none secret:font-mono uppercase">
                        &gt; {t('verify.errorPrefix')}: {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-400 dark:bg-green-900/40 secret:bg-black border-4 border-black dark:border-green-500 secret:border-[#1cf85d] text-black dark:text-green-300 secret:text-[#1cf85d] p-3 mb-6 font-bold text-sm transition-colors shadow-[4px_4px_0px_#000] dark:shadow-sm secret:shadow-none secret:font-mono uppercase">
                        &gt; {t('verify.systemPrefix')}: {success}
                    </div>
                )}

                {!token && (
                    <p className="text-black dark:text-gray-300 secret:text-[#1cf85d]/80 font-bold text-sm mb-6 secret:font-mono">
                        {t('verify.missingToken')}
                    </p>
                )}

                <div className="text-center">
                    <Link to="/login" className="text-fuchsia-600 dark:text-[#c084fc] secret:text-[#1cf85d] font-black hover:underline hover:text-black dark:hover:text-[#e879f9] secret:hover:text-white transition-colors secret:font-mono uppercase">
                        {t('verify.backToLogin')}
                    </Link>
                </div>
            </div>
        </AuthCard>
        </PageShell>
    );
}
