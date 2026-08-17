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
        <main className="max-w-3xl mx-auto mt-10 p-4 space-y-8 relative">

            <div className="flex items-center space-x-4 border-b-4 border-[#800000] dark:border-[#a855f7] pb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] flex items-center justify-center shadow-md">
                    <User className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-[#800000] dark:text-[#c084fc]">
                    Profil Beállítások
                </h1>
            </div>

            {error && (
                <div className="bg-red-100 dark:bg-red-900/40 border-l-4 border-red-600 dark:border-red-500 text-red-700 dark:text-red-300 p-4 font-medium text-sm transition-colors shadow-sm animate-pulse">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-100 dark:bg-green-900/40 border-l-4 border-green-600 dark:border-green-500 text-green-700 dark:text-green-300 p-4 font-medium text-sm transition-colors shadow-sm">
                    {success}
                </div>
            )}

            <section className="p-6 border-4 border-[#800000] dark:border-[#a855f7] bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] shadow-[0_10px_30px_rgba(128,0,0,0.1)] dark:shadow-[0_0_30px_rgba(168,85,247,0.2)] rounded-sm transition-all duration-300">
                <h2 className="text-2xl font-bold text-[#800000] dark:text-[#c084fc] mb-4 flex items-center">
                    <User className="w-6 h-6 mr-2" />
                    Felhasználónév Módosítása
                </h2>
                <form onSubmit={handleUsernameUpdate} className="space-y-4">
                    {currentUsername && (
                        <p className="text-gray-600 dark:text-gray-300 font-medium">Jelenlegi név: <span className="font-bold text-black dark:text-white">{currentUsername}</span></p>
                    )}
                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] mb-1 group-focus-within:text-red-700 dark:group-focus-within:text-white transition-colors">Új Felhasználónév</label>
                        <input type="text" required value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                            className="border-2 border-black dark:border-[#a855f7] p-3 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 transition-all bg-white dark:bg-[#121212] dark:text-white shadow-inner max-w-md"
                        />
                    </div>
                    <button type="submit" className="bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] text-white font-bold py-2 px-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-2 border-black dark:border-transparent flex items-center cursor-pointer">
                        <Save className="w-5 h-5 mr-2" /> Mentés
                    </button>
                </form>
            </section>

            <section className="p-6 border-4 border-[#800000] dark:border-[#a855f7] bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] shadow-[0_10px_30px_rgba(128,0,0,0.1)] dark:shadow-[0_0_30px_rgba(168,85,247,0.2)] rounded-sm transition-all duration-300">
                <h2 className="text-2xl font-bold text-[#800000] dark:text-[#c084fc] mb-4 flex items-center">
                    <Key className="w-6 h-6 mr-2" />
                    Jelszó Módosítása
                </h2>
                <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] mb-1 group-focus-within:text-red-700 dark:group-focus-within:text-white transition-colors">Jelenlegi Jelszó</label>
                        <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                            className="border-2 border-black dark:border-[#a855f7] p-3 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 transition-all bg-white dark:bg-[#121212] dark:text-white shadow-inner"
                        />
                    </div>
                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] mb-1 group-focus-within:text-red-700 dark:group-focus-within:text-white transition-colors">Új Jelszó</label>
                        <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                            className="border-2 border-black dark:border-[#a855f7] p-3 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 transition-all bg-white dark:bg-[#121212] dark:text-white shadow-inner"
                        />
                    </div>
                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] mb-1 group-focus-within:text-red-700 dark:group-focus-within:text-white transition-colors">Új Jelszó Megerősítése</label>
                        <input type="password" required value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className="border-2 border-black dark:border-[#a855f7] p-3 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 transition-all bg-white dark:bg-[#121212] dark:text-white shadow-inner"
                        />
                    </div>
                    <button type="submit" className="bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] text-white font-bold py-2 px-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-2 border-black dark:border-transparent flex items-center cursor-pointer">
                        <Save className="w-5 h-5 mr-2" /> Jelszó Mentése
                    </button>
                </form>
            </section>

            <section className="p-6 border-4 border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-950/20 shadow-md rounded-sm">
                <h2 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-2 flex items-center">
                    <AlertTriangle className="w-6 h-6 mr-2" />
                    Veszélyes Zóna
                </h2>
                <p className="text-red-800 dark:text-red-300 font-medium mb-4">A fiók törlése végleges és visszavonhatatlan. Minden adatod, naptárbejegyzésed és jegyzeted elveszik!</p>
                <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="bg-red-600 dark:bg-red-700 text-white font-bold py-3 px-6 hover:bg-red-800 dark:hover:bg-red-600 transition-colors border-2 border-black dark:border-transparent flex items-center cursor-pointer shadow-md"
                >
                    <Trash2 className="w-5 h-5 mr-2" /> Fiók Végleges Törlése
                </button>
            </section>

            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1e1e1e] border-4 border-red-600 w-full max-w-md p-8 relative shadow-[0_0_50px_rgba(220,38,38,0.5)] flex flex-col items-center text-center rounded-sm">
                        <AlertTriangle className="w-16 h-16 text-red-600 mb-4 animate-bounce" />
                        <h2 className="text-3xl font-bold text-black dark:text-white mb-2">Biztos vagy benne?</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-8 font-medium">Ezt a lépést nem lehet visszavonni. Tényleg törölni szeretnéd a teljes fiókodat?</p>

                        <div className="flex space-x-4 w-full">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 bg-gray-200 dark:bg-gray-700 text-black dark:text-white font-bold py-3 border-2 border-black transition-colors hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer"
                            >
                                Mégse
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                className="flex-1 bg-red-600 text-white font-bold py-3 border-2 border-black dark:border-transparent transition-colors hover:bg-red-800 shadow-[0_0_15px_rgba(220,38,38,0.6)] cursor-pointer"
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