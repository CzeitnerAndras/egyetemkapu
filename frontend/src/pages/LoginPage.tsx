import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                navigate('/');
            } else {
                setError(data.error || 'Hibás e-mail cím vagy jelszó!');
            }
        } catch (err) {
            setError('Nem sikerült csatlakozni a szerverhez.');
        }
    };

    return (
        <main className="max-w-md mx-auto mt-20 p-8 border-4 border-[#800000] dark:border-[#a855f7] bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] shadow-[0_20px_50px_rgba(128,0,0,0.15)] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] relative transition-all duration-300 rounded-sm hover:shadow-[0_25px_60px_rgba(128,0,0,0.2)] dark:hover:shadow-[0_0_50px_rgba(168,85,247,0.4)]">

            <h1 className="text-3xl font-bold text-[#800000] dark:text-[#c084fc] text-center mb-8 border-b-2 border-[#800000] dark:border-[#a855f7] pb-4 transition-colors">
                Bejelentkezés
            </h1>

            {error && (
                <div className="bg-red-100 dark:bg-red-900/40 border-l-4 border-red-600 dark:border-red-500 text-red-700 dark:text-red-300 p-3 mb-6 font-medium text-sm transition-colors shadow-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
                {/* --- Email --- */}
                <div className="flex flex-col group">
                    <label className="text-[#800000] dark:text-[#c084fc] font-bold mb-1 transition-colors group-focus-within:text-red-700 dark:group-focus-within:text-white">E-mail cím</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border-2 border-black dark:border-[#a855f7] p-2 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 transition-all bg-white dark:bg-[#121212] dark:text-white shadow-inner"
                        placeholder="minta@gmail.com"
                    />
                </div>

                {/* --- Jelszó --- */}
                <div className="flex flex-col group">
                    <label className="text-[#800000] dark:text-[#c084fc] font-bold mb-1 transition-colors group-focus-within:text-red-700 dark:group-focus-within:text-white">Jelszó</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border-2 border-black dark:border-[#a855f7] p-2 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 transition-all bg-white dark:bg-[#121212] dark:text-white shadow-inner"
                        placeholder="••••••••"
                    />
                </div>

                {/* --- Bejelentkezés gomb --- */}
                <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] text-white font-bold py-3 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(128,0,0,0.3)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] transition-all duration-300 border-2 border-black dark:border-transparent cursor-pointer"
                >
                    Bejelentkezés
                </button>
            </form>

            {/* --- Átirányítás a regisztrációra --- */}
            <div className="mt-6 text-center">
                <span className="text-gray-600 dark:text-gray-400 font-medium transition-colors">Nincs még fiókod? </span>
                <Link to="/register" className="text-[#800000] dark:text-[#c084fc] font-bold hover:underline hover:text-red-600 dark:hover:text-[#e879f9] transition-colors">
                    Regisztráció
                </Link>
            </div>
        </main>
    );
}