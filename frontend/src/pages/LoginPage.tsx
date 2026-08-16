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
        <main className="max-w-md mx-auto mt-20 p-8 border-4 border-[#800000] dark:border-[#a855f7] bg-[#fdfbf7] dark:bg-[#1e1e1e] shadow-xl relative transition-colors duration-300">

            <h1 className="text-3xl font-bold text-[#800000] dark:text-[#c084fc] text-center mb-8 border-b-2 border-[#800000] dark:border-[#a855f7] pb-4 transition-colors">
                Bejelentkezés
            </h1>

            {error && (
                <div className="bg-red-100 dark:bg-red-900/40 border-l-4 border-red-600 dark:border-red-500 text-red-700 dark:text-red-300 p-3 mb-6 font-medium text-sm transition-colors">
                    {error}
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
                {/* --- Email --- */}
                <div className="flex flex-col">
                    <label className="text-[#800000] dark:text-[#c084fc] font-bold mb-1 transition-colors">E-mail cím</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border-2 border-black dark:border-[#a855f7] p-2 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] transition-colors bg-white dark:bg-[#121212] dark:text-white"
                        placeholder="minta@gmail.com"
                    />
                </div>

                {/* --- Jelszó --- */}
                <div className="flex flex-col">
                    <label className="text-[#800000] dark:text-[#c084fc] font-bold mb-1 transition-colors">Jelszó</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border-2 border-black dark:border-[#a855f7] p-2 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] transition-colors bg-white dark:bg-[#121212] dark:text-white"
                        placeholder="••••••••"
                    />
                </div>

                {/* --- Bejelentkezés gomb --- */}
                <button
                    type="submit"
                    className="w-full bg-[#800000] dark:bg-[#a855f7] text-white font-bold py-3 hover:bg-red-800 dark:hover:bg-[#9333ea] transition-colors border-2 border-black dark:border-transparent shadow-sm"
                >
                    Bejelentkezés
                </button>
            </form>

            {/* --- Átirányítás a regisztrációra --- */}
            <div className="mt-6 text-center">
                <span className="text-gray-600 dark:text-gray-400 font-medium transition-colors">Nincs még fiókod? </span>
                <Link to="/register" className="text-[#800000] dark:text-[#c084fc] font-bold hover:underline transition-colors">
                    Regisztráció
                </Link>
            </div>
        </main>
    );
}