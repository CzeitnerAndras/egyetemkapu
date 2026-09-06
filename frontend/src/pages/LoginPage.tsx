import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { AuthCard, AuthHeader, PageShell } from '../components/PageLayout';

export default function LoginPage() {
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                try {
                    const data = await response.json();
                    setError(data.error || t('login.badCredentials'));
                } catch {
                    setError(`${t('login.serverError')} (${response.status})`);
                }
                return;
            }

            const data = await response.json();
            localStorage.setItem('token', data.token);
            localStorage.setItem('refreshToken', data.refreshToken);
            window.dispatchEvent(new Event('authChanged'));
            navigate('/');
        } catch (err) {
            setError(t('login.serverError'));
        }
    };

    return (
        <PageShell variant="auth">
        <AuthCard accent="cyan">
            <AuthHeader tone="fuchsia">
                {t('login.title')}
            </AuthHeader>

            <div className="p-6 sm:p-8">
                {error && (
                    <div className="bg-red-400 dark:bg-red-900/40 secret:bg-black border-4 border-black dark:border-red-500 secret:border-[#1cf85d] text-black dark:text-red-300 secret:text-[#1cf85d] p-3 mb-6 font-bold text-sm transition-colors shadow-[4px_4px_0px_#000] dark:shadow-sm secret:shadow-none secret:font-mono uppercase">
                        &gt; {t('login.errorPrefix')}: {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    {/* --- Email --- */}
                    <div className="flex flex-col group">
                        <label className="text-black dark:text-[#c084fc] secret:text-[#1cf85d] font-bold mb-1 transition-colors group-focus-within:text-cyan-600 dark:group-focus-within:text-white secret:group-focus-within:text-white secret:font-mono uppercase">{t('login.email')}</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-2 outline-none focus:border-cyan-400 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent transition-all bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none font-bold secret:font-mono"
                        />
                    </div>

                    {/* --- Jelszó --- */}
                    <div className="flex flex-col group">
                        <label className="text-black dark:text-[#c084fc] secret:text-[#1cf85d] font-bold mb-1 transition-colors group-focus-within:text-cyan-600 dark:group-focus-within:text-white secret:group-focus-within:text-white secret:font-mono uppercase">{t('login.password')}</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-2 outline-none focus:border-cyan-400 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent transition-all bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none font-bold secret:font-mono"
                        />
                    </div>

                    {/* --- Bejelentkezés gomb --- */}
                    <button
                        type="submit"
                        className="w-full bg-cyan-400 dark:bg-gradient-to-r dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] font-bold py-3 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] shadow-[4px_4px_0px_#000] dark:shadow-md secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all duration-300 border-4 border-black dark:border-transparent secret:border-[#1cf85d] cursor-pointer secret:font-mono uppercase"
                    >
                        {t('login.submit')}
                    </button>
                </form>

                {/* --- Átirányítás a regisztrációra --- */}
                <div className="mt-6 text-center">
                    <span className="text-gray-800 dark:text-gray-400 secret:text-[#1cf85d]/70 font-bold transition-colors secret:font-mono uppercase">{t('login.noAccount')}</span>
                    <Link to="/register" className="text-fuchsia-600 dark:text-[#c084fc] secret:text-[#1cf85d] font-black hover:underline hover:text-black dark:hover:text-[#e879f9] secret:hover:text-white transition-colors secret:font-mono uppercase ml-2">
                        {t('login.register')}
                    </Link>
                </div>
                <div className="mt-3 text-center">
                    <Link to="/elfelejtett-jelszo" className="text-fuchsia-600 dark:text-[#c084fc] secret:text-[#1cf85d] font-black hover:underline hover:text-black dark:hover:text-[#e879f9] secret:hover:text-white transition-colors secret:font-mono uppercase">
                        {t('login.forgotPassword')}
                    </Link>
                </div>
            </div>
        </AuthCard>
        </PageShell>
    );
}