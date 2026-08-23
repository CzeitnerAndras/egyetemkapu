import { useState, useEffect } from 'react';
import { BookOpen, Upload, Download, FileText, X, ChevronDown } from 'lucide-react';
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
    const { t, locale, language } = useLanguage();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Informatika');
    const [uploadMsg, setUploadMsg] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isUploadCatOpen, setIsUploadCatOpen] = useState(false);

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

    const filterOptions = [
        { val: '', label: t('kb.allCats') },
        { val: 'Informatika', label: t('kb.cat.it') },
        { val: 'Gazdaság', label: t('kb.cat.econ') },
        { val: 'Matematika', label: t('kb.cat.math') },
        { val: 'Egyéb', label: t('kb.cat.other') }
    ];

    const uploadOptions = [
        { val: 'Informatika', label: t('kb.cat.it') },
        { val: 'Gazdaság', label: t('kb.cat.econ') },
        { val: 'Matematika', label: t('kb.cat.math') },
        { val: 'Egyéb', label: t('kb.cat.other') }
    ];

    return (
        <>
            <main className="w-full max-w-7xl mx-auto mt-6 pb-12 px-4 relative z-20">

                {/* --- Fejléc és Szűrők --- */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-gradient-to-r from-cyan-400 to-fuchsia-500 dark:bg-gradient-to-r dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-[4px_4px_0px_#000] dark:shadow-md secret:shadow-[0_0_15px_rgba(28,248,93,0.3)] secret:rounded-none">
                    <div className="flex items-center space-x-3 mb-4 md:mb-0">
                        <BookOpen className="w-8 h-8 text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                        <h1 className="text-3xl font-bold text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">{t('kb.title')}</h1>
                    </div>

                    <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4 w-full md:w-auto">

                        {/* --- Filter Dropdown --- */}
                        <div className="relative w-full md:w-auto">
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className="flex items-center justify-between w-full md:min-w-[220px] bg-white dark:bg-[#121212] secret:bg-black border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-2 text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase font-bold cursor-pointer shadow-[4px_4px_0px_#000] dark:shadow-none hover:-translate-y-1 hover:bg-cyan-400 dark:hover:bg-[#1a1a1a] secret:hover:bg-[#1cf85d]/10 hover:shadow-[6px_6px_0px_#000] dark:hover:shadow-none dark:hover:translate-y-0 transition-all"
                            >
                                <span className="truncate pr-4">{categoryFilter === '' ? t('kb.allCats') : translateCategory(categoryFilter)}</span>
                                <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isFilterOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)}></div>
                                    <div className="absolute top-full mt-2 right-0 w-full md:min-w-[220px] bg-white dark:bg-[#121212] secret:bg-black border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] shadow-[6px_6px_0px_#000] dark:shadow-lg z-50 flex flex-col">
                                        {filterOptions.map((opt, i, arr) => (
                                            <button
                                                key={opt.val}
                                                onClick={() => { setCategoryFilter(opt.val); setIsFilterOpen(false); }}
                                                className={`p-3 text-left font-bold text-black dark:text-white secret:text-[#1cf85d] hover:bg-cyan-400 dark:hover:bg-gray-800 secret:hover:bg-[#1cf85d] secret:hover:text-black transition-colors uppercase text-sm cursor-pointer ${i !== arr.length - 1 ? 'border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d]/30' : ''}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="bg-white dark:bg-gradient-to-r dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] font-bold py-2 px-4 border-4 border-black dark:border-transparent secret:border-[#1cf85d] hover:-translate-y-1 hover:bg-fuchsia-400 shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] dark:shadow-none dark:hover:shadow-lg secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all cursor-pointer flex items-center justify-center secret:font-mono uppercase"
                        >
                            <Upload className="w-5 h-5 mr-2 font-bold" /> {t('kb.submit')}
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
                            <div key={doc.id} className="border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-white dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black p-5 flex flex-col shadow-[6px_6px_0px_#000] hover:shadow-[10px_10px_0px_#d946ef] dark:shadow-md dark:hover:shadow-lg transition-shadow secret:rounded-none group">
                                <div className="flex justify-between items-start border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-3 mb-3">
                                    <div>
                                        <span className="text-xs font-bold bg-cyan-400 dark:bg-[#c084fc] secret:bg-[#1cf85d] text-black dark:text-white secret:text-black px-2 py-1 border-2 border-black dark:border-transparent rounded-sm secret:rounded-none uppercase tracking-wider">{translateCategory(doc.category)}</span>
                                        <h3 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] mt-3 secret:font-mono line-clamp-1" title={doc.title}>{doc.title}</h3>
                                    </div>
                                    <FileText className="w-8 h-8 text-black dark:text-gray-500 secret:text-[#1cf85d]/50" />
                                </div>

                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 secret:text-[#1cf85d]/80 flex-1 mb-4 secret:font-mono line-clamp-3">
                                    {doc.description}
                                </p>

                                <div className="flex justify-between items-center text-xs font-bold text-black dark:text-gray-400 secret:text-[#1cf85d]/60 mb-4 secret:font-mono">
                                    <span>{t('kb.uploadedBy')} <span className="font-black text-fuchsia-600 dark:text-white">{doc.uploader.username}</span></span>
                                    <span>{new Date(doc.createdAt).toLocaleDateString(locale)}</span>
                                </div>

                                <button
                                    onClick={() => handleDownload(doc.id, doc.fileName)}
                                    className="w-full bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-[#c084fc] secret:text-[#1cf85d] font-bold py-2 border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] hover:bg-cyan-400 dark:hover:bg-[#a855f7] secret:hover:bg-[#1cf85d] hover:text-black dark:hover:text-white secret:hover:text-black transition-all flex items-center justify-center cursor-pointer secret:font-mono uppercase shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:-translate-y-1 dark:shadow-none dark:hover:shadow-none dark:hover:translate-y-0"
                                >
                                    <Download className="w-5 h-5 mr-2 font-bold" /> {t('kb.download')}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* --- Feltöltés Modal --- */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-slate-100 dark:bg-[#1e1e1e] secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] w-full max-w-lg p-6 relative shadow-[10px_10px_0px_#000] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] secret:shadow-[0_0_30px_rgba(28,248,93,0.3)] secret:rounded-none">
                        <button onClick={() => setIsUploadModalOpen(false)} className="absolute top-4 right-4 p-1 text-black hover:text-white dark:text-gray-500 dark:hover:text-red-500 secret:text-[#1cf85d]/50 secret:hover:text-[#1cf85d] cursor-pointer hover:bg-red-500 border-4 border-transparent hover:border-black rounded-full dark:border-transparent dark:hover:border-transparent transition-colors">
                            <X className="w-6 h-6" />
                        </button>

                        <h2 className="text-2xl font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] mb-4 border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] pb-2 secret:font-mono uppercase">{t('kb.uploadTitle')}</h2>

                        {uploadMsg && <p className="mb-4 font-bold text-center text-fuchsia-600 dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono uppercase">&gt; {uploadMsg}</p>}

                        <form onSubmit={handleUpload} className="space-y-5">
                            <div className="flex flex-col">
                                <label className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 secret:font-mono uppercase">{t('kb.fieldTitle')}</label>
                                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 outline-none bg-white dark:bg-transparent dark:text-white secret:text-[#1cf85d] secret:font-mono font-bold shadow-[4px_4px_0px_#000] dark:shadow-none focus:border-fuchsia-500 transition-colors" />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 secret:font-mono uppercase">{t('kb.fieldDesc')}</label>
                                <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={3} className="border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 outline-none bg-white dark:bg-transparent dark:text-white secret:text-[#1cf85d] secret:font-mono font-bold resize-none shadow-[4px_4px_0px_#000] dark:shadow-none focus:border-fuchsia-500 transition-colors"></textarea>
                            </div>

                            {/* --- Category Dropdown --- */}
                            <div className={`flex flex-col relative ${isUploadCatOpen ? 'z-50' : 'z-10'}`}>
                                <label className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 secret:font-mono uppercase">{t('kb.fieldCat')}</label>
                                <button
                                    type="button"
                                    onClick={() => setIsUploadCatOpen(!isUploadCatOpen)}
                                    className="flex items-center justify-between w-full border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 outline-none bg-white dark:bg-[#121212] secret:bg-black text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase font-bold shadow-[4px_4px_0px_#000] dark:shadow-none cursor-pointer hover:bg-cyan-400 dark:hover:bg-[#1a1a1a] secret:hover:bg-[#1cf85d]/10 focus:border-fuchsia-500 transition-colors"
                                >
                                    <span>{translateCategory(category)}</span>
                                    <ChevronDown className={`w-5 h-5 ml-2 transition-transform ${isUploadCatOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isUploadCatOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsUploadCatOpen(false)}></div>
                                        <div className="absolute top-[72px] left-0 w-full bg-white dark:bg-[#121212] secret:bg-black border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] shadow-[6px_6px_0px_#000] dark:shadow-lg z-50 flex flex-col">
                                            {uploadOptions.map((opt, i, arr) => (
                                                <button
                                                    type="button"
                                                    key={opt.val}
                                                    onClick={() => { setCategory(opt.val); setIsUploadCatOpen(false); }}
                                                    className={`p-3 text-left font-bold text-black dark:text-white secret:text-[#1cf85d] hover:bg-fuchsia-400 dark:hover:bg-gray-800 secret:hover:bg-[#1cf85d] secret:hover:text-black transition-colors uppercase text-sm cursor-pointer ${i !== arr.length - 1 ? 'border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d]/30' : ''}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* --- Fájl Gomb --- */}
                            <div className="flex flex-col z-10 relative pt-1">
                                <label className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 secret:font-mono uppercase">{t('kb.fieldFile')}</label>
                                <div className="relative border-4 border-dashed border-black dark:border-gray-600 secret:border-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-transparent p-4 flex items-center justify-between shadow-[4px_4px_0px_#000] dark:shadow-none group transition-colors focus-within:border-fuchsia-500">
                                    <span className="truncate text-black dark:text-gray-300 secret:text-[#1cf85d] font-bold mr-4 text-sm secret:font-mono">
                                        {file ? file.name : (language === 'en' ? 'No file selected' : 'Nincs fájl kiválasztva...')}
                                    </span>

                                    <label className="shrink-0 bg-cyan-400 dark:bg-[#a855f7] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] border-4 border-black dark:border-transparent secret:border-[#1cf85d] py-2 px-4 font-bold uppercase cursor-pointer hover:-translate-y-1 hover:bg-fuchsia-400 dark:hover:bg-[#c084fc] secret:hover:bg-[#1cf85d] secret:hover:text-black hover:shadow-[4px_4px_0px_#000] dark:hover:shadow-none transition-all shadow-[2px_2px_0px_#000] dark:shadow-none text-sm secret:font-mono">
                                        {language === 'en' ? 'Browse' : 'Tallózás'}
                                        <input
                                            required
                                            type="file"
                                            onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-fuchsia-400 dark:bg-[#a855f7] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] font-bold py-3 mt-4 border-4 border-black dark:border-transparent secret:border-[#1cf85d] hover:bg-cyan-400 dark:hover:bg-[#b91c1c] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all cursor-pointer secret:font-mono uppercase shadow-[4px_4px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] dark:shadow-none dark:hover:shadow-none dark:hover:translate-y-0">
                                {t('kb.uploadBtn')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}