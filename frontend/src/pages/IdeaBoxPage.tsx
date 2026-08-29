import { useState } from 'react';
import { Mail, Send, Lightbulb, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function IdeaBoxPage() {
    const { t } = useLanguage();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        const token = localStorage.getItem('token');
        if (!token) {
            setMessage({ text: t('idea.needLogin'), type: 'error' });
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, description })
            });

            if (res.ok) {
                setMessage({ text: t('idea.thanks'), type: 'success' });
                setTitle('');
                setDescription('');
            } else {
                setMessage({ text: t('idea.sendError'), type: 'error' });
            }
        } catch (error) {
            setMessage({ text: t('idea.serverError'), type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="w-full max-w-4xl mx-auto mt-6 pb-12 px-4 relative z-20 lg:items-start">
            <div className="flex items-center space-x-3 mb-8 bg-gradient-to-r from-cyan-400 to-fuchsia-500 dark:bg-gradient-to-r dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-[4px_4px_0px_#000] dark:shadow-md secret:shadow-[0_0_15px_rgba(28,248,93,0.3)] secret:rounded-none">
                <Mail className="w-8 h-8 text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                <h1 className="text-3xl font-bold text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                    {t('idea.title')}
                </h1>
            </div>

            <div className="bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[8px_8px_0px_#d946ef] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] secret:shadow-[0_0_20px_rgba(28,248,93,0.2)] secret:rounded-none flex flex-col">
                <div className="flex items-center mb-6 border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                    <Lightbulb className="w-6 h-6 mr-2 text-black dark:text-white secret:text-[#1cf85d]" />
                    <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                        {t('idea.share')}
                    </h2>
                </div>

                <p className="text-sm font-bold text-gray-800 dark:text-gray-300 secret:text-[#1cf85d]/80 mb-6 secret:font-mono uppercase">
                    &gt; {t('idea.intro')}
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

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-fuchsia-600 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                            {t('idea.ideaTitle')}
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('idea.titlePlaceholder')}
                            className="border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 outline-none focus:border-fuchsia-500 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none text-lg font-bold secret:font-mono placeholder:secret:text-[#1cf85d]/50 transition-colors"
                        />
                    </div>

                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-fuchsia-600 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                            {t('idea.description')}
                        </label>
                        <textarea
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('idea.descPlaceholder')}
                            rows={6}
                            className="border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 outline-none focus:border-fuchsia-500 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none resize-none font-bold text-base secret:font-mono placeholder:secret:text-[#1cf85d]/50 transition-colors"
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-fuchsia-400 dark:bg-gradient-to-r dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] font-bold py-3 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] shadow-[4px_4px_0px_#000] dark:shadow-md secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all duration-300 border-4 border-black dark:border-transparent secret:border-[#1cf85d] flex items-center justify-center cursor-pointer secret:font-mono uppercase disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_#000]"
                        >
                            <Send className="w-6 h-6 mr-2 font-bold" />
                            {isLoading ? t('idea.sending') : t('idea.submit')}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}