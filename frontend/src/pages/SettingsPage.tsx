import { useState, useEffect } from 'react';
import { Settings, BellRing, MessageSquare, Send, Save, Check } from 'lucide-react';

export default function SettingsPage() {
    const [discordWebhook, setDiscordWebhook] = useState('');
    const [telegramChatId, setTelegramChatId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const res = await fetch('http://localhost:8080/api/settings', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.discordWebhook) setDiscordWebhook(data.discordWebhook);
                    if (data.telegramChatId) setTelegramChatId(data.telegramChatId);
                }
            } catch (error) {
                console.error("Hiba a beállítások betöltésekor:", error);
            }
        };

        fetchSettings();
    }, []);

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        const token = localStorage.getItem('token');
        if (!token) {
            setMessage({ text: 'A mentéshez be kell jelentkezned!', type: 'error' });
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('http://localhost:8080/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ discordWebhook, telegramChatId })
            });

            if (res.ok) {
                setMessage({ text: 'Beállítások sikeresen mentve!', type: 'success' });
            } else {
                setMessage({ text: 'Hiba történt a mentés során.', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Nem sikerült csatlakozni a szerverhez.', type: 'error' });
        } finally {
            setIsLoading(false);
            setTimeout(() => setMessage(null), 4000);
        }
    };

    return (
        <main className="w-full max-w-4xl mx-auto mt-6 pb-12 px-4 relative z-20">
            
            {/* --- Fő Fejléc --- */}
            <div className="flex items-center space-x-3 mb-8 bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-md secret:shadow-[0_0_15px_rgba(28,248,93,0.3)] secret:rounded-none">
                <Settings className="w-8 h-8 text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                <h1 className="text-3xl font-bold text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                    Beállítások
                </h1>
            </div>

            {/* --- Értesítési Beállítások Szekció --- */}
            <div className="bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[0_10px_30px_rgba(128,0,0,0.1)] dark:shadow-[0_0_30px_rgba(168,85,247,0.2)] secret:shadow-[0_0_20px_rgba(28,248,93,0.2)] secret:rounded-none flex flex-col">
                
                <div className="flex items-center mb-6 border-b-2 border-gray-300 dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                    <BellRing className="w-6 h-6 mr-2 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />
                    <h2 className="text-2xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">Értesítési Csatornák</h2>
                </div>

                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 secret:text-[#1cf85d]/80 mb-6 secret:font-mono uppercase">
                    &gt; Itt állíthatod be, hogy a naptárba rögzített vizsgáidról és feladataidról hová küldjön értesítést a rendszer.
                </p>

                {message && (
                    <div className={`p-4 mb-6 font-bold text-sm border-l-4 shadow-sm secret:font-mono uppercase ${
                        message.type === 'success' 
                            ? 'bg-green-100 dark:bg-green-900/40 border-green-600 text-green-700 dark:text-green-300 secret:bg-black secret:border-[#1cf85d] secret:text-[#1cf85d]' 
                            : 'bg-red-100 dark:bg-red-900/40 border-red-600 text-red-700 dark:text-red-300 secret:bg-black secret:border-[#1cf85d] secret:text-[#1cf85d]'
                    }`}>
                        {message.type === 'success' ? <Check className="inline w-5 h-5 mr-2" /> : null}
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSaveSettings} className="space-y-8">
                    
                    {/* --- Discord Webhook --- */}
                    <div className="bg-white dark:bg-[#121212] secret:bg-transparent p-5 border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] secret:border-dashed">
                        <div className="flex flex-col group">
                            <label className="flex items-center text-base font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-2 group-focus-within:text-red-700 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                                <MessageSquare className="w-5 h-5 mr-2" /> Discord Webhook URL
                            </label>
                            <input
                                type="url"
                                value={discordWebhook}
                                onChange={(e) => setDiscordWebhook(e.target.value)}
                                placeholder="https://discord.com/api/webhooks/..."
                                className="border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-3 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent bg-gray-50 dark:bg-[#1a1a1a] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-inner secret:shadow-none text-base secret:font-mono placeholder:secret:text-[#1cf85d]/30"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 secret:text-[#1cf85d]/60 mt-2 secret:font-mono uppercase">
                                Hozz létre egy webhookot a saját Discord szervereden és másold be ide a linket.
                            </p>
                        </div>
                    </div>

                    {/* --- Telegram Chat ID --- */}
                    <div className="bg-white dark:bg-[#121212] secret:bg-transparent p-5 border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] secret:border-dashed">
                        <div className="flex flex-col group">
                            <label className="flex items-center text-base font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-2 group-focus-within:text-red-700 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                                <Send className="w-5 h-5 mr-2" /> Telegram Chat ID
                            </label>
                            <input
                                type="text"
                                value={telegramChatId}
                                onChange={(e) => setTelegramChatId(e.target.value)}
                                placeholder="pl. 123456789"
                                className="border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-3 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent bg-gray-50 dark:bg-[#1a1a1a] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-inner secret:shadow-none text-base secret:font-mono placeholder:secret:text-[#1cf85d]/30"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 secret:text-[#1cf85d]/60 mt-2 secret:font-mono uppercase">
                                Indítsd el a botunkat Telegramon, hogy megkapd a Chat ID-dat.
                            </p>
                        </div>
                    </div>

                    {/* --- Mentés Gomb --- */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-white secret:text-[#1cf85d] font-bold py-3 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(128,0,0,0.3)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all duration-300 border-2 border-black dark:border-transparent secret:border-[#1cf85d] flex items-center justify-center cursor-pointer secret:font-mono uppercase disabled:opacity-50"
                        >
                            <Save className="w-6 h-6 mr-2" />
                            {isLoading ? 'Mentés folyamatban...' : 'Beállítások Mentése'}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}