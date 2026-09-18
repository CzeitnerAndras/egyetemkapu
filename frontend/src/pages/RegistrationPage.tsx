import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { AuthCard, AuthHeader, PageShell } from '../components/PageLayout';

export default function RegistrationPage() {
    const { t } = useLanguage();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPasswordHint, setShowPasswordHint] = useState(false);

    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError(t('register.mismatch'));
            return;
        }

        {/* 
                    --- Regex cuccok --- 
            (?=.*[A-Z]) - Legalább egy nagybetű
            (?=.*\d) - Legalább egy szám
            (?=.*[?,\-+!@#$%^&*]) - Legalább egy szimbólum
            .{8,} - Legalább 8 karakter hosszú
        */}
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[?,\-+!@#$%^&*]).{8,}$/;

        if (!passwordRegex.test(password)) {
            setError(t('register.weakPassword'));
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(t('register.success'));
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(data.error || t('register.failed'));
            }
        } catch (err) {
            setError(t('register.serverError'));
        }
    };

    return (
        <PageShell variant="auth">
        <AuthCard accent="fuchsia">
            <AuthHeader tone="cyan">
                Regisztráció
            </AuthHeader>

            <div className="p-6 sm:p-8">
                {/* --- Hibaüzenet --- */}
                {error && (
                    <div className="bg-red-400 dark:bg-red-900/40 secret:bg-black border-4 border-black dark:border-red-500 secret:border-[#1cf85d] text-black dark:text-red-300 secret:text-[#1cf85d] p-3 mb-6 font-bold text-sm transition-colors shadow-[4px_4px_0px_#000] dark:shadow-sm secret:shadow-none secret:font-mono uppercase">
                        &gt; {t('register.errorPrefix')}: {error}
                    </div>
                )}

                {/* --- Sikeres regisztráció üzenet --- */}
                {success && (
                    <div className="bg-green-400 dark:bg-green-900/40 secret:bg-black border-4 border-black dark:border-green-500 secret:border-[#1cf85d] text-black dark:text-green-300 secret:text-[#1cf85d] p-3 mb-6 font-bold text-sm transition-colors shadow-[4px_4px_0px_#000] dark:shadow-sm secret:shadow-none secret:font-mono uppercase">
                        &gt; {t('register.systemPrefix')}: {success}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    {/* --- Felhasználónév --- */}
                    <div className="flex flex-col group">
                        <label className="text-black dark:text-[#c084fc] secret:text-[#1cf85d] font-bold mb-1 transition-colors group-focus-within:text-fuchsia-600 dark:group-focus-within:text-white secret:group-focus-within:text-white secret:font-mono uppercase">{t('register.username')}</label>
                        <input
                            type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                            className="border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-2 outline-none focus:border-fuchsia-500 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent transition-all bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none font-bold secret:font-mono"
                        />
                    </div>

                    {/* --- E-mail cím --- */}
                    <div className="flex flex-col group">
                        <label className="text-black dark:text-[#c084fc] secret:text-[#1cf85d] font-bold mb-1 transition-colors group-focus-within:text-fuchsia-600 dark:group-focus-within:text-white secret:group-focus-within:text-white secret:font-mono uppercase">E-mail cím</label>
                        <input
                            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                            className="border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-2 outline-none focus:border-fuchsia-500 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent transition-all bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none font-bold secret:font-mono"
                        />
                    </div>

                    {/* --- Jelszó --- */}
                    <div className="flex flex-col group">
                        <label className="text-black dark:text-[#c084fc] secret:text-[#1cf85d] font-bold mb-1 transition-colors group-focus-within:text-fuchsia-600 dark:group-focus-within:text-white secret:group-focus-within:text-white secret:font-mono uppercase flex items-center">
                            {t('register.password')}
                            <button
                                type="button"
                                className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full secret:rounded-none border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-black text-black dark:text-[#c084fc] secret:text-[#1cf85d] cursor-help"
                                aria-label={t('register.passwordInfo')}
                                aria-describedby="register-password-hint"
                                onMouseEnter={() => setShowPasswordHint(true)}
                                onMouseLeave={() => setShowPasswordHint(false)}
                                onFocus={() => setShowPasswordHint(true)}
                                onBlur={() => setShowPasswordHint(false)}
                            >
                                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                        </label>
                        {showPasswordHint && (
                            <p
                                id="register-password-hint"
                                role="tooltip"
                                className="mb-2 border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-black p-2 text-xs font-bold leading-snug text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-md secret:shadow-[0_0_10px_rgba(28,248,93,0.4)] secret:font-mono"
                            >
                                {t('register.passwordHint')}
                            </p>
                        )}
                        <input
                            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                            className="border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-2 outline-none focus:border-fuchsia-500 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent transition-all bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none font-bold secret:font-mono"
                        />
                    </div>

                    {/* --- Jelszó újra --- */}
                    <div className="flex flex-col group">
                        <label className="text-black dark:text-[#c084fc] secret:text-[#1cf85d] font-bold mb-1 transition-colors group-focus-within:text-fuchsia-600 dark:group-focus-within:text-white secret:group-focus-within:text-white secret:font-mono uppercase">Jelszó megint</label>
                        <input
                            type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                            className="border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-2 outline-none focus:border-fuchsia-500 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent transition-all bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none font-bold secret:font-mono"
                        />
                    </div>

                    <button type="submit" className="w-full bg-fuchsia-400 dark:bg-gradient-to-r dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] font-bold py-3 mt-4 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] shadow-[4px_4px_0px_#000] dark:shadow-md secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all duration-300 border-4 border-black dark:border-transparent secret:border-[#1cf85d] cursor-pointer secret:font-mono uppercase">
                        Regisztráció
                    </button>
                </form>
            </div>
        </AuthCard>
        </PageShell>
    );
}