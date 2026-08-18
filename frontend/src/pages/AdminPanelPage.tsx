import { useState, useEffect } from 'react';
import { ShieldAlert, Check, X, Download } from 'lucide-react';

interface PendingDocument {
    id: number;
    title: string;
    category: string;
    fileName: string;
    uploader: { username: string };
}

export default function AdminPanelPage() {
    const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPending();
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
            setLoading(false);
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

    return (
        <main className="w-full max-w-5xl mx-auto mt-6 pb-12 px-4 relative z-20">
            <div className="bg-red-600 dark:bg-[#3b0764] secret:bg-[#1cf85d] p-4 flex items-center space-x-3 border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] shadow-md mb-8">
                <ShieldAlert className="w-8 h-8 text-white secret:text-black" />
                <h1 className="text-2xl font-bold text-white secret:text-black secret:font-mono uppercase">Adminisztrátori Panel - Várakozó Fájlok</h1>
            </div>

            {loading ? (
                <p className="text-center font-bold secret:text-[#1cf85d] secret:font-mono uppercase">Betöltés...</p>
            ) : pendingDocs.length === 0 ? (
                <p className="text-center text-xl font-bold text-gray-500 secret:text-[#1cf85d]/70 secret:font-mono uppercase">&gt; Nincs jóváhagyásra váró dokumentum.</p>
            ) : (
                <div className="space-y-4">
                    {pendingDocs.map(doc => (
                        <div key={doc.id} className="bg-white dark:bg-[#1e1e1e] secret:bg-black border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-4 flex flex-col md:flex-row justify-between items-center shadow-sm secret:rounded-none">
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
        </main>
    );
}