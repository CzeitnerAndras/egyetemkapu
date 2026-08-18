import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Key, Trash2, AlertTriangle, Save } from 'lucide-react';

export default function ProfilePage() {
    const [currentUsername, setCurrentUsername] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        fetch('http://localhost:8080/api/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem('token');
                    navigate('/login');
                    throw new Error('Lejárt vagy érvénytelen token');
                }
                if (!res.ok) {
                    throw new Error(`Szerver hiba (Státusz: ${res.status})`);
                }
                return res.json();
            })
            .then(data => {
                if (data && data.username) {
                    setCurrentUsername(data.username);
                }
            })
            .catch(err => {
                console.error("Hiba a profil betöltésekor:", err.message);
            });
    }, [navigate]);

    const showMessage = (msg: string, type: 'success' | 'error') => {
        setError('');
        setSuccess('');
        if (type === 'error') setError(msg);
        else setSuccess(msg);

        setTimeout(() => {
            setError('');
            setSuccess('');
        }, 5000);
    };

    const handleUsernameUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!newUsername.trim()) return;

        try {
            const response = await fetch('http://localhost:8080/api/users/username', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newUsername })
            });

            if (response.ok) {
                const data = await response.json();

                if (data.token) {
                    localStorage.setItem('token', data.token);
                }

                showMessage('Felhasználónév sikeresen frissítve!', 'success');
                setCurrentUsername(newUsername);
                setNewUsername('');
            } else {
                const data = await response.json();
                showMessage(data.error || 'Hiba történt a név módosításakor.', 'error');
            }
        } catch (err) {
            showMessage('Szerverhiba történt. Ellenőrizd a kapcsolatot!', 'error');
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        if (newPassword !== confirmNewPassword) {
            showMessage('Az új jelszavak nem egyeznek!', 'error');
            return;
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[?,\-+!@#$%^&*]).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            showMessage('A jelszónak legalább 8 karakternek kell lennie, tartalmaznia kell egy nagybetűt, egy számot és egy szimbólumot!', 'error');
            return;
        }

        try {
            const response = await fetch('http://localhost:8080/api/users/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            if (response.ok) {
                showMessage('Jelszó sikeresen frissítve!', 'success');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
            } else {
                const data = await response.json();
                showMessage(data.error || 'Hiba a jelszó cseréjekor.', 'error');
            }
        } catch (err) {
            showMessage('Szerverhiba történt. Ellenőrizd a kapcsolatot!', 'error');
        }
    };

    const handleDeleteAccount = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch('http://localhost:8080/api/users/me', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                localStorage.removeItem('token');
                setIsDeleteModalOpen(false);
                navigate('/');
                window.location.reload();
            } else {
                showMessage('Nem sikerült törölni a fiókot.', 'error');
                setIsDeleteModalOpen(false);
            }
        } catch (err) {
            showMessage('Szerverhiba történt.', 'error');
            setIsDeleteModalOpen(false);
        }
    };

    return (
        <main className="max-w-3xl mx-auto mt-10 p-4 space-y-8 relative z-20">

            <div className="flex items-center space-x-4 border-b-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] pb-4">
                <div className="w-14 h-14 rounded-full secret:rounded-none bg-gradient-to-br from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-[#1cf85d] flex items-center justify-center shadow-md">
                    <User className="w-8 h-8 text-white secret:text-black" />
                </div>
                <h1 className="text-4xl font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono uppercase">
                    Profil Beállítások
                </h1>
            </div>

            {error && (
                <div className="bg-red-100 dark:bg-red-900/40 secret:bg-black border-l-4 border-red-600 dark:border-red-500 secret:border-[#1cf85d] text-red-700 dark:text-red-300 secret:text-[#1cf85d] p-4 font-medium text-sm transition-colors shadow-sm animate-pulse secret:font-mono uppercase">
                    Hiba: {error}
                </div>
            )}
            {success && (
                <div className="bg-green-100 dark:bg-green-900/40 secret:bg-black border-l-4 border-green-600 dark:border-green-500 secret:border-[#1cf85d] text-green-700 dark:text-green-300 secret:text-[#1cf85d] p-4 font-medium text-sm transition-colors shadow-sm secret:font-mono uppercase">
                    Rendszerüzenet: {success}
                </div>
            )}

            <section className="p-6 border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent shadow-[0_10px_30px_rgba(128,0,0,0.1)] dark:shadow-[0_0_30px_rgba(168,85,247,0.2)] secret:shadow-[0_0_20px_rgba(28,248,93,0.1)] rounded-sm secret:rounded-none transition-all duration-300">
                <h2 className="text-2xl font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-4 flex items-center secret:font-mono uppercase">
                    <User className="w-6 h-6 mr-2" />
                    Felhasználónév Módosítása
                </h2>
                <form onSubmit={handleUsernameUpdate} className="space-y-4">
                    {currentUsername && (
                        <p className="text-gray-600 dark:text-gray-300 secret:text-[#1cf85d]/70 font-medium secret:font-mono uppercase">Jelenlegi név: <span className="font-bold text-black dark:text-white secret:text-[#1cf85d]">{currentUsername}</span></p>
                    )}
                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-red-700 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">Új Felhasználónév</label>
                        <input type="text" required value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                            className="border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-3 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent transition-all bg-white dark:bg-[#121212] secret:bg-transparent dark:text-white secret:text-[#1cf85d] shadow-inner secret:shadow-none max-w-md secret:font-mono"
                        />
                    </div>
                    <button type="submit" className="bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-white secret:text-[#1cf85d] font-bold py-2 px-6 hover:-translate-y-1 hover:shadow-lg secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all duration-300 border-2 border-black dark:border-transparent secret:border-[#1cf85d] flex items-center cursor-pointer secret:font-mono uppercase">
                        <Save className="w-5 h-5 mr-2" /> Mentés
                    </button>
                </form>
            </section>

            <section className="p-6 border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent shadow-[0_10px_30px_rgba(128,0,0,0.1)] dark:shadow-[0_0_30px_rgba(168,85,247,0.2)] secret:shadow-[0_0_20px_rgba(28,248,93,0.1)] rounded-sm secret:rounded-none transition-all duration-300">
                <h2 className="text-2xl font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-4 flex items-center secret:font-mono uppercase">
                    <Key className="w-6 h-6 mr-2" />
                    Jelszó Módosítása
                </h2>
                <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-red-700 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">Jelenlegi Jelszó</label>
                        <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                            className="border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-3 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent transition-all bg-white dark:bg-[#121212] secret:bg-transparent dark:text-white secret:text-[#1cf85d] shadow-inner secret:shadow-none secret:font-mono"
                        />
                    </div>
                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-red-700 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">Új Jelszó</label>
                        <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                            className="border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-3 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent transition-all bg-white dark:bg-[#121212] secret:bg-transparent dark:text-white secret:text-[#1cf85d] shadow-inner secret:shadow-none secret:font-mono"
                        />
                    </div>
                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-red-700 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">Új Jelszó Megerősítése</label>
                        <input type="password" required value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className="border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-3 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent transition-all bg-white dark:bg-[#121212] secret:bg-transparent dark:text-white secret:text-[#1cf85d] shadow-inner secret:shadow-none secret:font-mono"
                        />
                    </div>
                    <button type="submit" className="bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-white secret:text-[#1cf85d] font-bold py-2 px-6 hover:-translate-y-1 hover:shadow-lg secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all duration-300 border-2 border-black dark:border-transparent secret:border-[#1cf85d] flex items-center cursor-pointer secret:font-mono uppercase">
                        <Save className="w-5 h-5 mr-2" /> Jelszó Mentése
                    </button>
                </form>
            </section>

            <section className="p-6 border-4 border-red-600 dark:border-red-500 secret:border-[#1cf85d] bg-red-50 dark:bg-red-950/20 secret:bg-transparent shadow-md secret:shadow-none rounded-sm secret:rounded-none">
                <h2 className="text-2xl font-bold text-red-700 dark:text-red-400 secret:text-[#1cf85d] mb-2 flex items-center secret:font-mono uppercase">
                    <AlertTriangle className="w-6 h-6 mr-2" />
                    Veszélyes Zóna
                </h2>
                <p className="text-red-800 dark:text-red-300 secret:text-[#1cf85d]/80 font-medium mb-4 secret:font-mono uppercase">&gt; A fiók törlése végleges és visszavonhatatlan. Minden adatod, naptárbejegyzésed és jegyzeted elveszik!</p>
                <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="bg-red-600 dark:bg-red-700 secret:bg-transparent text-white secret:text-[#1cf85d] font-bold py-3 px-6 hover:bg-red-800 dark:hover:bg-red-600 secret:hover:bg-[#1cf85d] secret:hover:text-black transition-colors border-2 border-black dark:border-transparent secret:border-[#1cf85d] flex items-center cursor-pointer shadow-md secret:shadow-none secret:font-mono uppercase"
                >
                    <Trash2 className="w-5 h-5 mr-2" /> Fiók Végleges Törlése
                </button>
            </section>

            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1e1e1e] secret:bg-black border-4 border-red-600 secret:border-[#1cf85d] w-full max-w-md p-8 relative shadow-[0_0_50px_rgba(220,38,38,0.5)] secret:shadow-[0_0_30px_rgba(28,248,93,0.3)] flex flex-col items-center text-center rounded-sm secret:rounded-none">
                        <AlertTriangle className="w-16 h-16 text-red-600 secret:text-[#1cf85d] mb-4 animate-bounce" />
                        <h2 className="text-3xl font-bold text-black dark:text-white secret:text-[#1cf85d] mb-2 secret:font-mono uppercase">Biztos vagy benne?</h2>
                        <p className="text-gray-600 dark:text-gray-300 secret:text-[#1cf85d]/80 mb-8 font-medium secret:font-mono uppercase">&gt; Ezt a lépést nem lehet visszavonni. Tényleg törölni szeretnéd a teljes fiókodat?</p>

                        <div className="flex space-x-4 w-full">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 bg-gray-200 dark:bg-gray-700 secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] font-bold py-3 border-2 border-black secret:border-[#1cf85d] transition-colors hover:bg-gray-300 dark:hover:bg-gray-600 secret:hover:bg-[#1cf85d] secret:hover:text-black cursor-pointer secret:font-mono uppercase"
                            >
                                Mégse
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                className="flex-1 bg-red-600 secret:bg-transparent text-white secret:text-[#1cf85d] font-bold py-3 border-2 border-black dark:border-transparent secret:border-[#1cf85d] transition-colors hover:bg-red-800 secret:hover:bg-[#1cf85d] secret:hover:text-black shadow-[0_0_15px_rgba(220,38,38,0.6)] secret:shadow-none cursor-pointer secret:font-mono uppercase"
                            >
                                Igen, Törlöm!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}