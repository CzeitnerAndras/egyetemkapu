import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RegistrationPage() {
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
            setError('A két jelszó nem egyezik meg!');
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
            setError('A jelszónak legalább 8 karakternek kell lennie, tartalmaznia kell egy nagybetűt, egy számot és egy szimbólumot (pl. ? , - +)!');
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
                setSuccess('Sikeres regisztráció! Átirányítás a bejelentkezéshez...');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(data.error || 'Hiba történt a regisztráció során.');
            }
        } catch (err) {
            setError('Nem sikerült csatlakozni a szerverhez.');
        }
    };

    return (
        <main className="max-w-md mx-auto mt-6 p-6 border-4 border-[#800000] dark:border-[#a855f7] bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] shadow-[0_20px_50px_rgba(128,0,0,0.15)] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] relative transition-all duration-300 rounded-sm hover:shadow-[0_25px_60px_rgba(128,0,0,0.2)] dark:hover:shadow-[0_0_50px_rgba(168,85,247,0.4)]">

            <h1 className="text-3xl font-bold text-[#800000] dark:text-[#c084fc] text-center mb-6 border-b-2 border-[#800000] dark:border-[#a855f7] pb-4 transition-colors">
                Regisztráció
            </h1>

            {/* --- Hibaüzenet megjelenítése --- */}
            {error && (
                <div className="bg-red-100 dark:bg-red-900/40 border-l-4 border-red-600 dark:border-red-500 text-red-700 dark:text-red-300 p-3 mb-6 font-medium text-sm transition-colors shadow-sm">
                    {error}
                </div>
            )}

            {/* --- Sikeres regisztráció üzenet --- */}
            {success && (
                <div className="bg-green-100 dark:bg-green-900/40 border-l-4 border-green-600 dark:border-green-500 text-green-700 dark:text-green-300 p-3 mb-6 font-medium text-sm transition-colors shadow-sm">
                    {success}
                </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
                {/* --- Felhasználónév --- */}
                <div className="flex flex-col group">
                    <label className="text-[#800000] dark:text-[#c084fc] font-bold mb-1 transition-colors group-focus-within:text-red-700 dark:group-focus-within:text-white">Felhasználónév</label>
                    <input
                        type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                        className="border-2 border-black dark:border-[#a855f7] p-2 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 transition-all bg-white dark:bg-[#121212] dark:text-white shadow-inner"
                    />
                </div>

                {/* --- E-mail cím --- */}
                <div className="flex flex-col group">
                    <label className="text-[#800000] dark:text-[#c084fc] font-bold mb-1 transition-colors group-focus-within:text-red-700 dark:group-focus-within:text-white">E-mail cím</label>
                    <input
                        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        className="border-2 border-black dark:border-[#a855f7] p-2 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 transition-all bg-white dark:bg-[#121212] dark:text-white shadow-inner"
                    />
                </div>

                {/* --- Jelszó --- */}
                <div className="flex flex-col group">
                    <label className="text-[#800000] dark:text-[#c084fc] font-bold mb-1 transition-colors group-focus-within:text-red-700 dark:group-focus-within:text-white">Jelszó</label>
                    <input
                        type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                        className="border-2 border-black dark:border-[#a855f7] p-2 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 transition-all bg-white dark:bg-[#121212] dark:text-white shadow-inner"
                    />
                </div>

                {/* --- Jelszó újra --- */}
                <div className="flex flex-col group">
                    <label className="text-[#800000] dark:text-[#c084fc] font-bold mb-1 transition-colors group-focus-within:text-red-700 dark:group-focus-within:text-white">Jelszó megint</label>
                    <input
                        type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className="border-2 border-black dark:border-[#a855f7] p-2 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 transition-all bg-white dark:bg-[#121212] dark:text-white shadow-inner"
                    />
                </div>

                <button type="submit" className="w-full bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] text-white font-bold py-3 mt-4 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(128,0,0,0.3)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] transition-all duration-300 border-2 border-black dark:border-transparent cursor-pointer">
                    Regisztráció
                </button>
            </form>
        </main>
    );
}