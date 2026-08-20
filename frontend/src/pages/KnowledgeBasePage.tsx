import { useState, useEffect } from 'react';
import { BookOpen, Upload, Download, FileText, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface Document {
    id: number;
    title: string;
    description: string;
    category: string;
    fileName: string;
    uploader: { username: string };
    createdAt: string;
}

export default function KnowledgeBasePage() {
    const { t, locale } = useLanguage();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Informatika');
    const [uploadMsg, setUploadMsg] = useState('');

    useEffect(() => {
        fetchDocuments();
    }, [categoryFilter]);

    const fetchDocuments = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        let url = 'http://localhost:8080/api/documents';
        if (categoryFilter) url += `?category=${categoryFilter}`;

        try {
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error("Hiba a dokumentumok lekérésekor:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);

        try {
            const res = await fetch('http://localhost:8080/api/documents/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();
            if (res.ok) {
                setUploadMsg(data.message);
                setTimeout(() => {
                    setIsUploadModalOpen(false);
                    setUploadMsg('');
                    setTitle(''); setDescription(''); setFile(null);
                }, 3000);
            } else {
                setUploadMsg(data.error);
            }
        } catch (error) {
            setUploadMsg(t('kb.networkError'));
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

    const translateCategory = (cat: string) => {
        switch (cat) {
            case 'Informatika': return t('kb.cat.it');
            case 'Gazdaság': return t('kb.cat.econ');
            case 'Matematika': return t('kb.cat.math');
            case 'Egyéb': return t('kb.cat.other');
            default: return cat;
        }
    };

    return (
        <main className="w-full max-w-7xl mx-auto mt-6 pb-12 px-4 relative z-20">

            {/* --- Fejléc és Szűrők --- */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-md secret:shadow-[0_0_15px_rgba(28,248,93,0.3)] secret:rounded-none">
                <div className="flex items-center space-x-3 mb-4 md:mb-0">
                    <BookOpen className="w-8 h-8 text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                    <h1 className="text-3xl font-bold text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">{t('kb.title')}</h1>
                </div>

                <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4 w-full md:w-auto">
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-2 outline-none bg-white dark:bg-[#121212] secret:bg-black text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase cursor-pointer"
                    >
                        <option value="">{t('kb.allCats')}</option>
                        <option value="Informatika">{t('kb.cat.it')}</option>
                        <option value="Gazdaság">{t('kb.cat.econ')}</option>
                        <option value="Matematika">{t('kb.cat.math')}</option>
                        <option value="Egyéb">{t('kb.cat.other')}</option>
                    </select>

                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="bg-white dark:bg-gradient-to-r dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-[#800000] dark:text-white secret:text-[#1cf85d] font-bold py-2 px-4 border-2 border-black dark:border-transparent secret:border-[#1cf85d] hover:-translate-y-1 hover:bg-gray-100 hover:shadow-lg secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all cursor-pointer flex items-center justify-center secret:font-mono uppercase"
                    >
                        <Upload className="w-5 h-5 mr-2" /> {t('kb.submit')}
                    </button>
                </div>
            </div>

            {/* --- Dokumentumok Grid --- */}
            {loading ? (
                <p className="text-center text-gray-500 secret:text-[#1cf85d] secret:font-mono">{t('kb.loading')}</p>
            ) : documents.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 secret:text-[#1cf85d]/70 font-medium text-lg secret:font-mono uppercase">&gt; {t('kb.empty')}</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {documents.map(doc => (
                        <div key={doc.id} className="border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black p-5 flex flex-col shadow-md hover:shadow-lg transition-shadow secret:rounded-none group">
                            <div className="flex justify-between items-start border-b-2 border-gray-300 dark:border-gray-700 secret:border-[#1cf85d] pb-3 mb-3">
                                <div>
                                    <span className="text-xs font-bold bg-[#800000] dark:bg-[#c084fc] secret:bg-[#1cf85d] text-white secret:text-black px-2 py-1 rounded-sm secret:rounded-none uppercase tracking-wider">{translateCategory(doc.category)}</span>
                                    <h3 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] mt-2 secret:font-mono line-clamp-1" title={doc.title}>{doc.title}</h3>
                                </div>
                                <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500 secret:text-[#1cf85d]/50" />
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-300 secret:text-[#1cf85d]/80 flex-1 mb-4 secret:font-mono line-clamp-3">
                                {doc.description}
                            </p>

                            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 secret:text-[#1cf85d]/60 mb-4 secret:font-mono">
                                <span>{t('kb.uploadedBy')} <span className="font-bold">{doc.uploader.username}</span></span>
                                <span>{new Date(doc.createdAt).toLocaleDateString(locale)}</span>
                            </div>

                            <button
                                onClick={() => handleDownload(doc.id, doc.fileName)}
                                className="w-full bg-white dark:bg-[#121212] secret:bg-transparent text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] font-bold py-2 border-2 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] hover:bg-[#800000] dark:hover:bg-[#a855f7] secret:hover:bg-[#1cf85d] hover:text-white secret:hover:text-black transition-colors flex items-center justify-center cursor-pointer secret:font-mono uppercase"
                            >
                                <Download className="w-4 h-4 mr-2" /> {t('kb.download')}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* --- Feltöltés Modal --- */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1e1e1e] secret:bg-black border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] w-full max-w-lg p-6 relative shadow-[0_0_50px_rgba(0,0,0,0.5)] secret:shadow-[0_0_30px_rgba(28,248,93,0.3)] secret:rounded-none">
                        <button onClick={() => setIsUploadModalOpen(false)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 secret:text-[#1cf85d]/50 secret:hover:text-[#1cf85d] cursor-pointer">
                            <X className="w-6 h-6" />
                        </button>

                        <h2 className="text-2xl font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-4 border-b-2 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] pb-2 secret:font-mono uppercase">{t('kb.uploadTitle')}</h2>

                        {uploadMsg && <p className="mb-4 font-bold text-center text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono uppercase">&gt; {uploadMsg}</p>}

                        <form onSubmit={handleUpload} className="space-y-4">
                            <div className="flex flex-col">
                                <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 secret:font-mono uppercase">{t('kb.fieldTitle')}</label>
                                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-2 outline-none bg-transparent dark:text-white secret:text-[#1cf85d] secret:font-mono" />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 secret:font-mono uppercase">{t('kb.fieldDesc')}</label>
                                <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={3} className="border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-2 outline-none bg-transparent dark:text-white secret:text-[#1cf85d] secret:font-mono resize-none"></textarea>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 secret:font-mono uppercase">{t('kb.fieldCat')}</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} className="border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-2 outline-none bg-white dark:bg-[#121212] secret:bg-black text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                                    <option value="Informatika">{t('kb.cat.it')}</option>
                                    <option value="Gazdaság">{t('kb.cat.econ')}</option>
                                    <option value="Matematika">{t('kb.cat.math')}</option>
                                    <option value="Egyéb">{t('kb.cat.other')}</option>
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 secret:font-mono uppercase">{t('kb.fieldFile')}</label>
                                <input required type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="border-2 border-dashed border-black dark:border-gray-600 secret:border-[#1cf85d] p-2 outline-none bg-transparent dark:text-white secret:text-[#1cf85d] secret:font-mono cursor-pointer" />
                            </div>

                            <button type="submit" className="w-full bg-[#800000] dark:bg-[#a855f7] secret:bg-transparent text-white secret:text-[#1cf85d] font-bold py-3 mt-4 border-2 border-black dark:border-transparent secret:border-[#1cf85d] hover:bg-[#b91c1c] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-colors cursor-pointer secret:font-mono uppercase">
                                {t('kb.uploadBtn')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}