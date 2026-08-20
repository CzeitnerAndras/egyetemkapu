import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

export default function RegistrationPage() {
    const { t } = useLanguage();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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
            const response = await fetch('http://localhost:8080/api/auth/register', {
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
        <main className="max-w-md mx-auto mt-6 border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent shadow-[0_20px_50px_rgba(128,0,0,0.15)] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] secret:shadow-[0_0_20px_rgba(28,248,93,0.1)] relative z-20 transition-all duration-300 rounded-sm secret:rounded-none hover:shadow-[0_25px_60px_rgba(128,0,0,0.2)] dark:hover:shadow-[0_0_50px_rgba(168,85,247,0.4)] secret:hover:shadow-[0_0_30px_rgba(28,248,93,0.2)] flex flex-col overflow-hidden">

            <div className="bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black p-4 flex items-center justify-center border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] shadow-md z-10">
                <h1 className="text-3xl font-bold text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                    Regisztráció
                </h1>
            </div>

            <div className="p-6">
                {/* --- Hibaüzenet megjelenítése --- */}
                {error && (
                    <div className="bg-red-100 dark:bg-red-900/40 secret:bg-black border-l-4 border-red-600 dark:border-red-500 secret:border-[#1cf85d] text-red-700 dark:text-red-300 secret:text-[#1cf85d] p-3 mb-6 font-medium text-sm transition-colors shadow-sm secret:font-mono uppercase">
                        &gt; {t('register.errorPrefix')}: {error}
                    </div>
                )}

                {/* --- Sikeres regisztráció üzenet --- */}
                {success && (
                    <div className="bg-green-100 dark:bg-green-900/40 secret:bg-black border-l-4 border-green-600 dark:border-green-500 secret:border-[#1cf85d] text-green-700 dark:text-green-300 secret:text-[#1cf85d] p-3 mb-6 font-medium text-sm transition-colors shadow-sm secret:font-mono uppercase">
                        &gt; {t('register.systemPrefix')}: {success}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    {/* --- Felhasználónév --- */}
                    <div className="flex flex-col group">
                        <label className="text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] font-bold mb-1 transition-colors group-focus-within:text-red-700 dark:group-focus-within:text-white secret:group-focus-within:text-white secret:font-mono uppercase">{t('register.username')}</label>
                        <input
                            type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                            className="border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-2 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent transition-all bg-white dark:bg-[#121212] secret:bg-transparent dark:text-white secret:text-[#1cf85d] shadow-inner secret:shadow-none secret:font-mono"
                        />
                    </div>

                    {/* --- E-mail cím --- */}
                    <div className="flex flex-col group">
                        <label className="text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] font-bold mb-1 transition-colors group-focus-within:text-red-700 dark:group-focus-within:text-white secret:group-focus-within:text-white secret:font-mono uppercase">E-mail cím</label>
                        <input
                            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                            className="border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-2 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent transition-all bg-white dark:bg-[#121212] secret:bg-transparent dark:text-white secret:text-[#1cf85d] shadow-inner secret:shadow-none secret:font-mono"
                        />
                    </div>

                    {/* --- Jelszó --- */}
                    <div className="flex flex-col group">
                        <label className="text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] font-bold mb-1 transition-colors group-focus-within:text-red-700 dark:group-focus-within:text-white secret:group-focus-within:text-white secret:font-mono uppercase">Jelszó</label>
                        <input
                            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                            className="border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-2 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent transition-all bg-white dark:bg-[#121212] secret:bg-transparent dark:text-white secret:text-[#1cf85d] shadow-inner secret:shadow-none secret:font-mono"
                        />
                    </div>

                    {/* --- Jelszó újra --- */}
                    <div className="flex flex-col group">
                        <label className="text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] font-bold mb-1 transition-colors group-focus-within:text-red-700 dark:group-focus-within:text-white secret:group-focus-within:text-white secret:font-mono uppercase">Jelszó megint</label>
                        <input
                            type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                            className="border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-2 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent transition-all bg-white dark:bg-[#121212] secret:bg-transparent dark:text-white secret:text-[#1cf85d] shadow-inner secret:shadow-none secret:font-mono"
                        />
                    </div>

                    <button type="submit" className="w-full bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-white secret:text-[#1cf85d] font-bold py-3 mt-4 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(128,0,0,0.3)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all duration-300 border-2 border-black dark:border-transparent secret:border-[#1cf85d] cursor-pointer secret:font-mono uppercase">
                        Regisztráció
                    </button>
                </form>
            </div>
        </main>
    );
}