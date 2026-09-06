import { useState, useEffect } from 'react';
import { Settings, BellRing, MessageSquare, Send, Save, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { PageHeader, PageShell } from '../components/PageLayout';

export default function SettingsPage() {
    const { t } = useLanguage();
    const [discordWebhook, setDiscordWebhook] = useState('');
    const [telegramChatId, setTelegramChatId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const res = await fetch('/api/settings', {
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
            setMessage({ text: t('settings.needLogin'), type: 'error' });
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ discordWebhook, telegramChatId })
            });

            if (res.ok) {
                setMessage({ text: t('settings.saved'), type: 'success' });
            } else {
                setMessage({ text: t('settings.saveError'), type: 'error' });
            }
        } catch (error) {
            setMessage({ text: t('settings.serverError'), type: 'error' });
        } finally {
            setIsLoading(false);
            setTimeout(() => setMessage(null), 4000);
        }
    };

    return (
        <PageShell>
            <PageHeader icon={Settings}>{t('settings.title')}</PageHeader>

            {/* --- Értesítési Beállítások Szekció --- */}
            <div className="bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[8px_8px_0px_#06b6d4] dark:shadow-[0_0_30px_rgba(168,85,247,0.2)] secret:shadow-[0_0_20px_rgba(28,248,93,0.2)] secret:rounded-none flex flex-col">

                <div className="flex items-center mb-6 border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                    <BellRing className="w-6 h-6 mr-2 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />
                    <h2 className="text-2xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">{t('settings.channels')}</h2>
                </div>

                <p className="text-sm font-bold text-gray-800 dark:text-gray-300 secret:text-[#1cf85d]/80 mb-6 secret:font-mono uppercase">
                    &gt; {t('settings.intro')}
                </p>

                {message && (
                    <div className={`p-4 mb-6 font-bold text-sm border-4 shadow-[4px_4px_0px_#000] dark:shadow-sm secret:shadow-none secret:font-mono uppercase ${message.type === 'success'
                        ? 'bg-green-400 dark:bg-green-900/40 border-black dark:border-green-600 text-black dark:text-green-300 secret:bg-black secret:border-[#1cf85d] secret:text-[#1cf85d]'
                        : 'bg-red-400 dark:bg-red-900/40 border-black dark:border-red-600 text-black dark:text-red-300 secret:bg-black secret:border-[#1cf85d] secret:text-[#1cf85d]'
                        }`}>
                        {message.type === 'success' ? <Check className="inline w-5 h-5 mr-2 font-bold" /> : null}
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSaveSettings} className="space-y-8">

                    {/* --- Discord Webhook --- */}
                    <div className="bg-white dark:bg-[#121212] secret:bg-transparent p-5 border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] secret:border-dashed shadow-[4px_4px_0px_#000] dark:shadow-none">
                        <div className="flex flex-col group">
                            <label className="flex items-center text-base font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] mb-2 group-focus-within:text-fuchsia-600 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                                <MessageSquare className="w-5 h-5 mr-2" /> Discord Webhook URL
                            </label>
                            <input
                                type="url"
                                value={discordWebhook}
                                onChange={(e) => setDiscordWebhook(e.target.value)}
                                placeholder="https://discord.com/api/webhooks/..."
                                className="border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-3 outline-none focus:border-fuchsia-500 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent bg-white dark:bg-[#1a1a1a] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none text-base font-bold secret:font-mono placeholder:secret:text-[#1cf85d]/30 transition-colors"
                            />
                            <p className="text-xs font-bold text-black dark:text-gray-400 secret:text-[#1cf85d]/60 mt-2 secret:font-mono uppercase">
                                {t('settings.discordHint')}
                            </p>
                        </div>
                    </div>

                    {/* --- Telegram Chat ID --- */}
                    <div className="bg-white dark:bg-[#121212] secret:bg-transparent p-5 border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] secret:border-dashed shadow-[4px_4px_0px_#000] dark:shadow-none">
                        <div className="flex flex-col group">
                            <label className="flex items-center text-base font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] mb-2 group-focus-within:text-cyan-600 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                                <Send className="w-5 h-5 mr-2" /> Telegram Chat ID
                            </label>
                            <input
                                type="text"
                                value={telegramChatId}
                                onChange={(e) => setTelegramChatId(e.target.value)}
                                placeholder={t('settings.telegramPlaceholder')}
                                className="border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-3 outline-none focus:border-cyan-400 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent bg-white dark:bg-[#1a1a1a] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none text-base font-bold secret:font-mono placeholder:secret:text-[#1cf85d]/30 transition-colors"
                            />
                            <p className="text-xs font-bold text-black dark:text-gray-400 secret:text-[#1cf85d]/60 mt-2 secret:font-mono uppercase">
                                {t('settings.telegramHint')}
                            </p>
                        </div>
                    </div>

                    {/* --- Mentés Gomb --- */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-cyan-400 dark:bg-gradient-to-r dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] font-bold py-3 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] shadow-[4px_4px_0px_#000] dark:shadow-[0_0_20px_rgba(168,85,247,0.6)] secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all duration-300 border-4 border-black dark:border-transparent secret:border-[#1cf85d] flex items-center justify-center cursor-pointer secret:font-mono uppercase disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_#000]"
                        >
                            <Save className="w-6 h-6 mr-2 font-bold" />
                            {isLoading ? t('settings.saving') : t('settings.save')}
                        </button>
                    </div>
                </form>
            </div>
        </PageShell>
    );
}