import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TerminalHack from '../components/TerminalGame';

export default function SecretPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('UNKNOWN');
    const [isHacked, setIsHacked] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetch('http://localhost:8080/api/users/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data && data.username) {
                        setUsername(data.username);
                    }
                })
                .catch(err => console.error("Hiba a név lekérésekor:", err));
        }
    }, []);

    const handleLogoff = () => {
        document.documentElement.classList.remove('secret');
        localStorage.removeItem('secretMode');
        window.dispatchEvent(new Event('secretLogoff'));
        navigate('/');
    };

    if (!isHacked) {
        return (
            <TerminalHack onSuccess={() => setIsHacked(true)} />
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-transparent text-[#1cf85d] font-mono p-8 relative flex flex-col items-center justify-center selection:bg-[#1cf85d] selection:text-black z-20">

            {/* --- Terminál tartalom --- */}
            <div className="w-full max-w-4xl z-20 relative text-lg md:text-xl leading-relaxed [text-shadow:0_0_6px_rgba(28,248,93,0.5)]">

                {/* --- Fejléc --- */}
                <div className="text-center mb-8">
                    <p>BANDI INDUSTRIES UNIFIED OPERATING SYSTEM</p>
                    <p>COPYRIGHT 2075-2077 BANDI INDUSTRIES</p>
                    <p>-Server 76-</p>
                </div>

                {/* --- Alfejléc --- */}
                <div className="mb-6">
                    <p>-BANDI Trespasser Management System-</p>
                    <p>=========================================</p>
                    <p className="invisible">Ures sor</p>
                    <p>=========================================</p>
                </div>

                {/* --- Log adatok --- */}
                <div className="mb-6 space-y-1">
                    <p>| User Log:</p>
                    <p>| &gt;&gt; Administrator: {username.toUpperCase()}</p>
                    <p>| &gt;&gt; Helpdesk</p>
                    <p>|========</p>
                </div>

                {/* --- Interaktív rész --- */}
                <div className="mt-8 space-y-2">
                    <div className="pt-6 flex flex-col space-y-2">
                        <button className="text-left w-fit px-2 py-1 hover:bg-[#1cf85d] hover:text-black transition-none cursor-pointer uppercase border-none bg-transparent font-mono text-[#1cf85d] text-lg md:text-xl [text-shadow:0_0_6px_rgba(28,248,93,0.5)]">
                            run:// search valami
                        </button>
                        <button className="text-left w-fit px-2 py-1 hover:bg-[#1cf85d] hover:text-black transition-none cursor-pointer uppercase border-none bg-transparent font-mono text-[#1cf85d] text-lg md:text-xl [text-shadow:0_0_6px_rgba(28,248,93,0.5)]">
                            run:// search valami más
                        </button>
                    </div>
                </div>

                <div className="mt-16">
                    <button 
                        onClick={handleLogoff}
                        className="text-left w-fit px-2 py-1 hover:bg-[#1cf85d] hover:text-black transition-none cursor-pointer uppercase block border-none bg-transparent font-mono text-[#1cf85d] text-lg md:text-xl [text-shadow:0_0_6px_rgba(28,248,93,0.5)]"
                    >
                        &lt;&lt; Logoff
                    </button>
                </div>
            </div>
        </main>
    );
}