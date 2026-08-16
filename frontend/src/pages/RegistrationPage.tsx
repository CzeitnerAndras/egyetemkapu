import { useState } from 'react';

export default function RegistrationPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Jelszavak egyezésének ellenőrzése
    if (password !== confirmPassword) {
      setError('A két jelszó nem egyezik meg!');
      return;
    }

    // 2. Jelszó erősségének ellenőrzése Regex segítségével
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[?,\-+!@#$%^&*]).{8,}$/;
    
    if (!passwordRegex.test(password)) {
      setError('A jelszónak legalább 8 karakternek kell lennie, tartalmaznia kell egy nagybetűt, egy számot és egy szimbólumot (pl. ? , - +)!');
      return;
    }

    // Ha minden sikeres, küldés a backendnek (később)
    console.log('Sikeres validáció, regisztráció indul...', { username, email, password });
  };

  return (
    <main className="max-w-md mx-auto mt-6 p-6 border-4 border-[#800000] bg-[#fdfbf7] shadow-xl relative">
      
      <h1 className="text-3xl font-bold text-[#800000] text-center mb-6 border-b-2 border-[#800000] pb-4">
        Regisztráció
      </h1>

      {/* Hibaüzenet megjelenítése */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-600 text-red-700 p-3 mb-6 font-medium text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        {/* Felhasználónév */}
        <div className="flex flex-col">
          <label className="text-[#800000] font-bold mb-1">Felhasználónév</label>
          <input 
            type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
            className="border-2 border-black p-2 outline-none focus:border-[#800000] bg-white"
            placeholder="username"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col">
          <label className="text-[#800000] font-bold mb-1">E-mail cím</label>
          <input 
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="border-2 border-black p-2 outline-none focus:border-[#800000] bg-white"
            placeholder="something@gmail.com"
          />
        </div>

        {/* Jelszó */}
        <div className="flex flex-col">
          <label className="text-[#800000] font-bold mb-1">Jelszó</label>
          <input 
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="border-2 border-black p-2 outline-none focus:border-[#800000] bg-white"
            placeholder="password"
          />
        </div>

        {/* Jelszó újra */}
        <div className="flex flex-col">
          <label className="text-[#800000] font-bold mb-1">Jelszó megint</label>
          <input 
            type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            className="border-2 border-black p-2 outline-none focus:border-[#800000] bg-white"
            placeholder="password"
          />
        </div>

        <button type="submit" className="w-full bg-[#800000] text-white font-bold py-3 mt-2 hover:bg-red-800 transition-colors border-2 border-black shadow-sm">
          Regisztráció
        </button>
      </form>
    </main>
  );
}