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
        <main className="max-w-md mx-auto mt-20 p-8 border-4 border-[#800000] bg-[#fdfbf7] shadow-xl relative">

            <h1 className="text-3xl font-bold text-[#800000] text-center mb-8 border-b-2 border-[#800000] pb-4">
                Bejelentkezés
            </h1>

            {error && (
                <div className="bg-red-100 border-l-4 border-red-600 text-red-700 p-3 mb-6 font-medium text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
                {/* --- Email --- */}
                <div className="flex flex-col">
                    <label className="text-[#800000] font-bold mb-1">E-mail cím</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="border-2 border-black p-2 outline-none focus:border-[#800000] transition-colors bg-white"
                        placeholder="minta@gmail.com"
                    />
                </div>

                {/* --- Jelszó --- */}
                <div className="flex flex-col">
                    <label className="text-[#800000] font-bold mb-1">Jelszó</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="border-2 border-black p-2 outline-none focus:border-[#800000] transition-colors bg-white"
                        placeholder="••••••••"
                    />
                </div>

                {/* --- Bejelentkezés gomb --- */}
                <button
                    type="submit"
                    className="w-full bg-[#800000] text-white font-bold py-3 hover:bg-red-800 transition-colors border-2 border-black shadow-sm"
                >
                    Bejelentkezés
                </button>
            </form>

            {/* --- Átirányítás a regisztrációra --- */}
            <div className="mt-6 text-center">
                <span className="text-gray-600 font-medium">Nincs még fiókod? </span>
                <Link to="/register" className="text-[#800000] font-bold hover:underline">
                    Regisztráció
                </Link>
            </div>
        </main>
    );
}