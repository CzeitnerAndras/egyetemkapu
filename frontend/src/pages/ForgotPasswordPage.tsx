import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

export default function ForgotPasswordPage() {
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSubmitting(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (response.status === 429) {
                setError(t('forgot.rateLimit'));
                return;
            }

            if (!response.ok) {
                try {
                    const data = await response.json();
                    setError(data.error || t('forgot.serverError'));
                } catch {
                    setError(`${t('forgot.serverError')} (${response.status})`);
                }
                return;
            }

            setSuccess(t('forgot.success'));
        } catch {
            setError(t('forgot.serverError'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="max-w-md mx-auto mt-20 border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent shadow-[8px_8px_0px_#06b6d4] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] secret:shadow-[0_0_20px_rgba(28,248,93,0.1)] relative z-20 transition-all duration-300 rounded-sm secret:rounded-none hover:-translate-y-1 hover:shadow-[12px_12px_0px_#06b6d4] dark:hover:shadow-[0_0_50px_rgba(168,85,247,0.4)] secret:hover:shadow-[0_0_30px_rgba(28,248,93,0.2)] flex flex-col overflow-hidden">

            <div className="bg-fuchsia-400 dark:bg-gradient-to-r dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black p-4 flex items-center justify-center border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-md z-10">
                <h1 className="text-3xl font-bold text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                    {t('forgot.title')}
                </h1>
            </div>

            <div className="p-8">
                {error && (
                    <div className="bg-red-400 dark:bg-red-900/40 secret:bg-black border-4 border-black dark:border-red-500 secret:border-[#1cf85d] text-black dark:text-red-300 secret:text-[#1cf85d] p-3 mb-6 font-bold text-sm transition-colors shadow-[4px_4px_0px_#000] dark:shadow-sm secret:shadow-none secret:font-mono uppercase">
                        &gt; {t('forgot.errorPrefix')}: {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-400 dark:bg-green-900/40 secret:bg-black border-4 border-black dark:border-green-500 secret:border-[#1cf85d] text-black dark:text-green-300 secret:text-[#1cf85d] p-3 mb-6 font-bold text-sm transition-colors shadow-[4px_4px_0px_#000] dark:shadow-sm secret:shadow-none secret:font-mono uppercase">
                        &gt; {t('forgot.systemPrefix')}: {success}
                    </div>
                )}

                <p className="text-black dark:text-gray-300 secret:text-[#1cf85d]/80 font-bold text-sm mb-6 secret:font-mono">
                    {t('forgot.intro')}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col group">
                        <label className="text-black dark:text-[#c084fc] secret:text-[#1cf85d] font-bold mb-1 transition-colors group-focus-within:text-cyan-600 dark:group-focus-within:text-white secret:group-focus-within:text-white secret:font-mono uppercase">{t('forgot.email')}</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-2 outline-none focus:border-cyan-400 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent transition-all bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none font-bold secret:font-mono"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-cyan-400 dark:bg-gradient-to-r dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] font-bold py-3 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] shadow-[4px_4px_0px_#000] dark:shadow-md secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all duration-300 border-4 border-black dark:border-transparent secret:border-[#1cf85d] cursor-pointer secret:font-mono uppercase disabled:opacity-60"
                    >
                        {t('forgot.submit')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link to="/login" className="text-fuchsia-600 dark:text-[#c084fc] secret:text-[#1cf85d] font-black hover:underline hover:text-black dark:hover:text-[#e879f9] secret:hover:text-white transition-colors secret:font-mono uppercase">
                        {t('forgot.backToLogin')}
                    </Link>
                </div>
            </div>
        </main>
    );
}
