import { useState, useEffect } from 'react';
import { ShieldAlert, Check, X, Download, Lightbulb, Trash2, FileText } from 'lucide-react';

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
    const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [loadingSuggestions, setLoadingSuggestions] = useState(true);

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

    return (
        <main className="w-full max-w-5xl mx-auto mt-6 pb-12 px-4 relative z-20">
            
            <div className="flex items-center space-x-3 mb-8 bg-gradient-to-r from-red-700 to-red-900 dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-md secret:shadow-[0_0_15px_rgba(28,248,93,0.3)] secret:rounded-none">
                <ShieldAlert className="w-8 h-8 text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                <h1 className="text-3xl font-bold text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                    Adminisztrátori Panel
                </h1>
            </div>

            {/* --- VÁRAKOZÓ DOKUMENTUMOK --- */}
            <div className="bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent shadow-lg dark:shadow-[0_0_30px_rgba(168,85,247,0.15)] border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] p-6 mb-8">
                <h2 className="flex items-center text-2xl font-bold text-[#800000] dark:text-white secret:text-[#1cf85d] border-b-2 border-gray-300 dark:border-gray-700 secret:border-[#1cf85d] pb-2 mb-6 secret:font-mono uppercase">
                    <FileText className="w-6 h-6 mr-2" />
                    Várakozó Fájlok
                </h2>

                {loadingDocs ? (
                    <p className="text-center font-bold text-gray-500 secret:text-[#1cf85d] secret:font-mono uppercase">Betöltés...</p>
                ) : pendingDocs.length === 0 ? (
                    <p className="text-center font-bold text-gray-500 secret:text-[#1cf85d]/70 secret:font-mono uppercase">&gt; Nincs jóváhagyásra váró dokumentum.</p>
                ) : (
                    <div className="space-y-4">
                        {pendingDocs.map(doc => (
                            <div key={doc.id} className="bg-white dark:bg-[#121212] secret:bg-black border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-4 flex flex-col md:flex-row justify-between items-center shadow-sm secret:rounded-none">
                                <div className="mb-4 md:mb-0 w-full md:w-2/3">
                                    <h3 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono">{doc.title}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 secret:text-[#1cf85d]/70 secret:font-mono uppercase mt-1">
                                        Beküldő: <span className="font-bold">{doc.uploader.username}</span> | Kategória: {doc.category}
                                    </p>
                                </div>

                                <div className="flex space-x-2 w-full md:w-auto">
                                    <button onClick={() => handleDownload(doc.id, doc.fileName)} className="p-2 bg-gray-200 dark:bg-gray-700 secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] border-2 border-black secret:border-[#1cf85d] hover:bg-gray-300 secret:hover:bg-[#1cf85d] secret:hover:text-black transition-colors cursor-pointer" title="Letöltés ellenőrzésre">
                                        <Download className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleAction(doc.id, 'approve')} className="flex-1 md:flex-none p-2 bg-green-500 secret:bg-transparent text-white secret:text-[#1cf85d] border-2 border-black dark:border-transparent secret:border-[#1cf85d] hover:bg-green-600 secret:hover:bg-[#1cf85d] secret:hover:text-black transition-colors cursor-pointer flex items-center justify-center font-bold secret:font-mono uppercase">
                                        <Check className="w-5 h-5 mr-1" /> Elfogad
                                    </button>
                                    <button onClick={() => handleAction(doc.id, 'reject')} className="flex-1 md:flex-none p-2 bg-red-600 secret:bg-transparent text-white secret:text-[#1cf85d] border-2 border-black dark:border-transparent secret:border-[#1cf85d] hover:bg-red-800 secret:hover:bg-[#1cf85d] secret:hover:text-black transition-colors cursor-pointer flex items-center justify-center font-bold secret:font-mono uppercase">
                                        <X className="w-5 h-5 mr-1" /> Elutasít
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- BEÉRKEZETT ÖTLETEK --- */}
            <div className="bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent shadow-lg dark:shadow-[0_0_30px_rgba(168,85,247,0.15)] border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] p-6">
                <div className="flex items-center mb-6 border-b-2 border-gray-300 dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                    <Lightbulb className="w-6 h-6 mr-2 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />
                    <h2 className="text-2xl font-bold text-[#800000] dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                        Ötletláda Beérkezett Üzenetek
                    </h2>
                </div>

                {loadingSuggestions ? (
                    <p className="text-center font-bold text-gray-500 secret:text-[#1cf85d] secret:font-mono uppercase">Betöltés...</p>
                ) : suggestions.length === 0 ? (
                    <p className="text-center font-bold text-gray-500 secret:text-[#1cf85d]/70 secret:font-mono uppercase">&gt; Az ötletláda jelenleg üres.</p>
                ) : (
                    <div className="space-y-4">
                        {suggestions.map(suggestion => (
                            <div key={suggestion.id} className="bg-white dark:bg-[#121212] secret:bg-black border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-5 shadow-sm secret:rounded-none relative group">
                                <div className="pr-10">
                                    <h3 className="text-lg font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono mb-2">
                                        &gt; {suggestion.title}
                                    </h3>
                                    <p className="text-black dark:text-gray-300 secret:text-[#1cf85d]/80 secret:font-mono mb-4">
                                        {suggestion.description}
                                    </p>
                                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 secret:text-[#1cf85d]/60 font-bold uppercase secret:font-mono">
                                        <span>Beküldő: {suggestion.user?.username || 'Ismeretlen'}</span>
                                        <span>{new Date(suggestion.createdAt).toLocaleDateString('hu-HU')}</span>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => handleDeleteSuggestion(suggestion.id)} 
                                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-500 secret:text-[#1cf85d]/50 secret:hover:text-[#1cf85d] transition-colors cursor-pointer" 
                                    title="Feldolgozva / Törlés"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}