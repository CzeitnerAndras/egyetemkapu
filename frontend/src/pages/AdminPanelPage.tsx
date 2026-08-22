import { useState, useEffect } from 'react';
import { ShieldAlert, Check, X, Download, Lightbulb, Trash2, FileText, Megaphone, Plus } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface PendingDocument {
    id: number;
    title: string;
    category: string;
    fileName: string;
    uploader: { username: string };
}

interface Suggestion {
    id: number;
    title: string;
    description: string;
    user: { username: string };
    createdAt: string;
}

export default function AdminPanelPage() {
    const { t, locale } = useLanguage();
    const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [loadingSuggestions, setLoadingSuggestions] = useState(true);
    const [newsTitle, setNewsTitle] = useState('');
    const [newsDescription, setNewsDescription] = useState('');
    const [newsDate, setNewsDate] = useState('');
    const [newsImage, setNewsImage] = useState('');
    const [isUploadingNews, setIsUploadingNews] = useState(false);
    const [newsMsg, setNewsMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        fetchPending();
        fetchSuggestions();
    }, []);

    const fetchPending = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('http://localhost:8080/api/documents/admin/pending', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setPendingDocs(await res.json());
        } catch (error) {
            console.error("Hiba:", error);
        } finally {
            setLoadingDocs(false);
        }
    };

    const fetchSuggestions = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('http://localhost:8080/api/suggestions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setSuggestions(await res.json());
        } catch (error) {
            console.error("Hiba az ötletek lekérésekor:", error);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const handleAction = async (id: number, action: 'approve' | 'reject') => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`http://localhost:8080/api/documents/admin/${id}/${action}`, {
                method: action === 'approve' ? 'PUT' : 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setPendingDocs(pendingDocs.filter(doc => doc.id !== id));
            }
        } catch (error) {
            console.error("Hiba az akció során:", error);
        }
    };

    const handleDownload = (id: number, fileName: string) => {
        const token = localStorage.getItem('token');
        fetch(`http://localhost:8080/api/documents/download/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
            });
    };

    const handleDeleteSuggestion = async (id: number) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`http://localhost:8080/api/suggestions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setSuggestions(suggestions.filter(sug => sug.id !== id));
            }
        } catch (error) {
            console.error("Hiba az ötlet törlésekor:", error);
        }
    };

    const handleNewsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploadingNews(true);
        setNewsMsg(null);

        const token = localStorage.getItem('token');
        if (!token) return;

        const payload = {
            title: newsTitle,
            description: newsDescription,
            eventDate: newsDate ? new Date(newsDate).toISOString() : null,
            imageUrl: newsImage || null
        };

        try {
            const res = await fetch('http://localhost:8080/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setNewsMsg({ text: t('admin.newsSuccess'), type: 'success' });
                setNewsTitle('');
                setNewsDescription('');
                setNewsDate('');
                setNewsImage('');
            } else {
                setNewsMsg({ text: t('admin.newsError'), type: 'error' });
            }
        } catch (error) {
            setNewsMsg({ text: t('admin.newsError'), type: 'error' });
        } finally {
            setIsUploadingNews(false);
            setTimeout(() => setNewsMsg(null), 4000);
        }
    };

    return (
        <main className="w-full max-w-5xl mx-auto mt-6 pb-12 px-4 relative z-20">

            <div className="flex items-center space-x-3 mb-8 bg-red-400 dark:bg-gradient-to-r dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-[4px_4px_0px_#000] dark:shadow-md secret:shadow-[0_0_15px_rgba(28,248,93,0.3)] secret:rounded-none">
                <ShieldAlert className="w-8 h-8 text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                <h1 className="text-3xl font-bold text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                    {t('admin.title')}
                </h1>
            </div>

            {/* --- ÚJ HÍR FELTÖLTÉSE --- */}
            <div className="bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent shadow-[8px_8px_0px_#d946ef] dark:shadow-[0_0_30px_rgba(168,85,247,0.15)] border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 mb-8 secret:rounded-none">
                <div className="flex items-center mb-6 border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                    <Megaphone className="w-6 h-6 mr-2 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />
                    <h2 className="text-2xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                        {t('admin.uploadNews')}
                    </h2>
                </div>

                {newsMsg && (
                    <div className={`p-4 mb-6 font-bold text-sm border-4 shadow-[4px_4px_0px_#000] dark:shadow-sm secret:shadow-none secret:font-mono uppercase ${newsMsg.type === 'success'
                        ? 'bg-green-400 dark:bg-green-900/40 border-black dark:border-green-600 text-black dark:text-green-300 secret:bg-black secret:border-[#1cf85d] secret:text-[#1cf85d]'
                        : 'bg-red-400 dark:bg-red-900/40 border-black dark:border-red-600 text-black dark:text-red-300 secret:bg-black secret:border-[#1cf85d] secret:text-[#1cf85d]'
                        }`}>
                        {newsMsg.type === 'success' ? <Check className="inline w-6 h-6 mr-2 font-bold" /> : <X className="inline w-6 h-6 mr-2 font-bold" />}
                        {newsMsg.text}
                    </div>
                )}

                <form onSubmit={handleNewsSubmit} className="space-y-4">
                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-fuchsia-600 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                            {t('admin.newsTitle')}
                        </label>
                        <input
                            type="text" required value={newsTitle} onChange={(e) => setNewsTitle(e.target.value)}
                            className="border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 outline-none focus:border-fuchsia-500 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none text-lg font-bold secret:font-mono transition-colors"
                        />
                    </div>

                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-fuchsia-600 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                            {t('admin.newsDesc')}
                        </label>
                        <textarea
                            required rows={4} value={newsDescription} onChange={(e) => setNewsDescription(e.target.value)}
                            className="border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 outline-none focus:border-fuchsia-500 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none resize-none text-base font-bold secret:font-mono transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col group">
                            <label className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-fuchsia-600 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                                {t('admin.newsDate')}
                            </label>
                            <input
                                type="date" value={newsDate} onChange={(e) => setNewsDate(e.target.value)}
                                className="border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 outline-none focus:border-fuchsia-500 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none font-bold secret:font-mono cursor-pointer transition-colors"
                            />
                        </div>
                        <div className="flex flex-col group">
                            <label className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-fuchsia-600 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                                {t('admin.newsImage')}
                            </label>
                            <input
                                type="url" placeholder="https://..." value={newsImage} onChange={(e) => setNewsImage(e.target.value)}
                                className="border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 outline-none focus:border-fuchsia-500 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none font-bold secret:font-mono placeholder:secret:text-[#1cf85d]/30 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit" disabled={isUploadingNews}
                            className="w-full bg-fuchsia-400 dark:bg-gradient-to-r dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] font-bold py-3 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] shadow-[4px_4px_0px_#000] dark:shadow-[0_0_20px_rgba(168,85,247,0.6)] secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all duration-300 border-4 border-black dark:border-transparent secret:border-[#1cf85d] flex items-center justify-center cursor-pointer secret:font-mono uppercase disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_#000]"
                        >
                            <Plus className="w-6 h-6 mr-2 font-bold" />
                            {isUploadingNews ? t('admin.loading') : t('admin.newsSubmit')}
                        </button>
                    </div>
                </form>
            </div>

            {/* --- VÁRAKOZÓ DOKUMENTUMOK --- */}
            <div className="bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent shadow-[8px_8px_0px_#06b6d4] dark:shadow-[0_0_30px_rgba(168,85,247,0.15)] border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 mb-8 secret:rounded-none">
                <h2 className="flex items-center text-2xl font-bold text-black dark:text-white secret:text-[#1cf85d] border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2 mb-6 secret:font-mono uppercase">
                    <FileText className="w-6 h-6 mr-2" />
                    {t('admin.pending')}
                </h2>

                {loadingDocs ? (
                    <p className="text-center font-bold text-gray-500 secret:text-[#1cf85d] secret:font-mono uppercase">{t('admin.loading')}</p>
                ) : pendingDocs.length === 0 ? (
                    <p className="text-center font-bold text-gray-500 secret:text-[#1cf85d]/70 secret:font-mono uppercase">&gt; {t('admin.noPending')}</p>
                ) : (
                    <div className="space-y-4">
                        {pendingDocs.map(doc => (
                            <div key={doc.id} className="bg-white dark:bg-[#121212] secret:bg-black border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-4 flex flex-col md:flex-row justify-between items-center shadow-[4px_4px_0px_#000] dark:shadow-sm secret:shadow-none secret:rounded-none transition-all hover:shadow-[6px_6px_0px_#000] dark:hover:shadow-md hover:-translate-y-1 dark:hover:translate-y-0">
                                <div className="mb-4 md:mb-0 w-full md:w-2/3">
                                    <h3 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono">{doc.title}</h3>
                                    <p className="text-sm font-bold text-black dark:text-gray-400 secret:text-[#1cf85d]/70 secret:font-mono uppercase mt-1">
                                        {t('admin.submitter')} <span className="font-black text-cyan-600 dark:text-white">{doc.uploader.username}</span> | {t('admin.category')} {doc.category}
                                    </p>
                                </div>

                                <div className="flex space-x-3 w-full md:w-auto">
                                    <button onClick={() => handleDownload(doc.id, doc.fileName)} className="p-2 bg-white dark:bg-gray-700 secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] border-4 border-black secret:border-[#1cf85d] hover:bg-cyan-400 secret:hover:bg-[#1cf85d] secret:hover:text-black transition-colors cursor-pointer shadow-[2px_2px_0px_#000] dark:shadow-none hover:shadow-[4px_4px_0px_#000] dark:hover:shadow-none hover:-translate-y-1 dark:hover:translate-y-0" title={t('admin.downloadCheck')}>
                                        <Download className="w-5 h-5 font-bold" />
                                    </button>
                                    <button onClick={() => handleAction(doc.id, 'approve')} className="flex-1 md:flex-none p-2 bg-green-400 secret:bg-transparent text-black secret:text-[#1cf85d] border-4 border-black dark:border-transparent secret:border-[#1cf85d] hover:bg-green-500 secret:hover:bg-[#1cf85d] secret:hover:text-black transition-colors cursor-pointer flex items-center justify-center font-bold secret:font-mono uppercase shadow-[2px_2px_0px_#000] dark:shadow-none hover:shadow-[4px_4px_0px_#000] dark:hover:shadow-none hover:-translate-y-1 dark:hover:translate-y-0">
                                        <Check className="w-5 h-5 mr-1 font-bold" /> {t('admin.approve')}
                                    </button>
                                    <button onClick={() => handleAction(doc.id, 'reject')} className="flex-1 md:flex-none p-2 bg-red-400 secret:bg-transparent text-black secret:text-[#1cf85d] border-4 border-black dark:border-transparent secret:border-[#1cf85d] hover:bg-red-500 secret:hover:bg-[#1cf85d] secret:hover:text-black transition-colors cursor-pointer flex items-center justify-center font-bold secret:font-mono uppercase shadow-[2px_2px_0px_#000] dark:shadow-none hover:shadow-[4px_4px_0px_#000] dark:hover:shadow-none hover:-translate-y-1 dark:hover:translate-y-0">
                                        <X className="w-5 h-5 mr-1 font-bold" /> {t('admin.reject')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- BEÉRKEZETT ÖTLETEK --- */}
            <div className="bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent shadow-[8px_8px_0px_#000] dark:shadow-[0_0_30px_rgba(168,85,247,0.15)] border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 secret:rounded-none">
                <div className="flex items-center mb-6 border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                    <Lightbulb className="w-6 h-6 mr-2 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />
                    <h2 className="text-2xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                        {t('admin.ideas')}
                    </h2>
                </div>

                {loadingSuggestions ? (
                    <p className="text-center font-bold text-gray-500 secret:text-[#1cf85d] secret:font-mono uppercase">{t('admin.loading')}</p>
                ) : suggestions.length === 0 ? (
                    <p className="text-center font-bold text-gray-500 secret:text-[#1cf85d]/70 secret:font-mono uppercase">&gt; {t('admin.emptyIdeas')}</p>
                ) : (
                    <div className="space-y-4">
                        {suggestions.map(suggestion => (
                            <div key={suggestion.id} className="bg-white dark:bg-[#121212] secret:bg-black border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-5 shadow-[4px_4px_0px_#000] dark:shadow-sm secret:shadow-none secret:rounded-none relative group transition-all hover:shadow-[6px_6px_0px_#000] hover:-translate-y-1 dark:hover:shadow-md dark:hover:translate-y-0">
                                <div className="pr-12">
                                    <h3 className="text-lg font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono mb-2">
                                        &gt; {suggestion.title}
                                    </h3>
                                    <p className="text-black dark:text-gray-300 font-medium secret:text-[#1cf85d]/80 secret:font-mono mb-4">
                                        {suggestion.description}
                                    </p>
                                    <div className="flex justify-between items-center text-xs font-bold text-black dark:text-gray-400 secret:text-[#1cf85d]/60 uppercase secret:font-mono">
                                        <span>{t('admin.submitter')} <span className="font-black text-fuchsia-600 dark:text-white">{suggestion.user?.username || t('admin.unknown')}</span></span>
                                        <span>{new Date(suggestion.createdAt).toLocaleDateString(locale)}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDeleteSuggestion(suggestion.id)}
                                    className="absolute top-4 right-4 p-2 bg-white dark:bg-transparent text-black dark:text-gray-400 border-4 border-transparent hover:border-black dark:hover:border-transparent hover:bg-red-400 dark:hover:bg-transparent hover:text-black dark:hover:text-red-500 secret:text-[#1cf85d]/50 secret:hover:text-[#1cf85d] transition-all cursor-pointer rounded-full secret:rounded-none shadow-none hover:shadow-[4px_4px_0px_#000] dark:hover:shadow-none hover:-translate-y-1 dark:hover:translate-y-0"
                                    title={t('admin.deleteProcessed')}
                                >
                                    <Trash2 className="w-5 h-5 font-bold" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}