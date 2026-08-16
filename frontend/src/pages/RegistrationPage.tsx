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
        <main className="max-w-md mx-auto mt-6 p-6 border-4 border-[#800000] bg-[#fdfbf7] shadow-xl relative">

            <h1 className="text-3xl font-bold text-[#800000] text-center mb-6 border-b-2 border-[#800000] pb-4">
                Regisztráció
            </h1>

            {/* --- Hibaüzenet megjelenítése --- */}
            {error && (
                <div className="bg-red-100 border-l-4 border-red-600 text-red-700 p-3 mb-6 font-medium text-sm">
                    {error}
                </div>
            )}

            {/* --- Sikeres regisztráció üzenet --- */}
            {success && (
                <div className="bg-green-100 border-l-4 border-green-600 text-green-700 p-3 mb-6 font-medium text-sm">
                    {success}
                </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
                {/* --- Felhasználónév --- */}
                <div className="flex flex-col">
                    <label className="text-[#800000] font-bold mb-1">Felhasználónév</label>
                    <input
                        type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                        className="border-2 border-black p-2 outline-none focus:border-[#800000] bg-white"
                    />
                </div>

                {/* --- E-mail cím --- */}
                <div className="flex flex-col">
                    <label className="text-[#800000] font-bold mb-1">E-mail cím</label>
                    <input
                        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        className="border-2 border-black p-2 outline-none focus:border-[#800000] bg-white"
                    />
                </div>

                {/* --- Jelszó --- */}
                <div className="flex flex-col">
                    <label className="text-[#800000] font-bold mb-1">Jelszó</label>
                    <input
                        type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                        className="border-2 border-black p-2 outline-none focus:border-[#800000] bg-white"
                    />
                </div>

                {/* --- Jelszó újra --- */}
                <div className="flex flex-col">
                    <label className="text-[#800000] font-bold mb-1">Jelszó megint</label>
                    <input
                        type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className="border-2 border-black p-2 outline-none focus:border-[#800000] bg-white"
                    />
                </div>

                <button type="submit" className="w-full bg-[#800000] text-white font-bold py-3 mt-2 hover:bg-red-800 transition-colors border-2 border-black shadow-sm">
                    Regisztráció
                </button>
            </form>
        </main>
    );
}