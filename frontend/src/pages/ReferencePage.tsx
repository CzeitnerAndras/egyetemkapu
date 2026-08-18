import { useState } from 'react';
import { BookMarked, Copy, Check, PenTool, Sparkles } from 'lucide-react';

export default function ReferencePage() {
    const [author, setAuthor] = useState('');
    const [title, setTitle] = useState('');
    const [year, setYear] = useState('');
    const [publisher, setPublisher] = useState('');
    const [style, setStyle] = useState('APA');

    const [generatedRef, setGeneratedRef] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setIsCopied(false);

        const requestBody = { author, title, year, publisher, style };

        try {
            const res = await fetch('http://localhost:8080/api/tools/reference/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (res.ok) {
                const data = await res.json();
                setGeneratedRef(data.reference);
            } else {
                console.error("Hiba a generálás során");
            }
        } catch (error) {
            console.error("Hálózati hiba:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (generatedRef) {
            navigator.clipboard.writeText(generatedRef);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    return (
        <main className="w-full max-w-4xl mx-auto mt-6 pb-12 px-4 relative z-20">

            {/* --- Fejléc --- */}
            <div className="flex items-center space-x-3 mb-8 bg-white dark:bg-[#1e1e1e] secret:bg-black border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-md secret:shadow-[0_0_15px_rgba(28,248,93,0.3)] secret:rounded-none">
                <BookMarked className="w-8 h-8 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />
                <h1 className="text-3xl font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono uppercase">Hivatkozás Generátor</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* --- Űrlap --- */}
                <div className="bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-md secret:rounded-none">
                    <div className="flex items-center mb-6 border-b-2 border-gray-300 dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                        <PenTool className="w-5 h-5 mr-2 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />
                        <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">Forrás Adatai</h2>
                    </div>

                    <form onSubmit={handleGenerate} className="space-y-4">
                        <div className="flex flex-col">
                            <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 secret:font-mono uppercase">Szerző</label>
                            <input type="text" placeholder="pl. John Doe" value={author} onChange={e => setAuthor(e.target.value)} className="border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-2 outline-none bg-white/50 dark:bg-black/20 secret:bg-transparent dark:text-white secret:text-[#1cf85d] secret:font-mono placeholder-gray-400 dark:placeholder-gray-500 secret:placeholder-[#1cf85d]/30" />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 secret:font-mono uppercase">Cím</label>
                            <input required type="text" placeholder="pl. A programozás alapjai" value={title} onChange={e => setTitle(e.target.value)} className="border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-2 outline-none bg-white/50 dark:bg-black/20 secret:bg-transparent dark:text-white secret:text-[#1cf85d] secret:font-mono placeholder-gray-400 dark:placeholder-gray-500 secret:placeholder-[#1cf85d]/30" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 secret:font-mono uppercase">Év</label>
                                <input type="text" placeholder="pl. 2024" value={year} onChange={e => setYear(e.target.value)} className="border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-2 outline-none bg-white/50 dark:bg-black/20 secret:bg-transparent dark:text-white secret:text-[#1cf85d] secret:font-mono placeholder-gray-400 dark:placeholder-gray-500 secret:placeholder-[#1cf85d]/30" />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 secret:font-mono uppercase">Stílus</label>
                                <select value={style} onChange={e => setStyle(e.target.value)} className="border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-2 outline-none bg-white dark:bg-[#121212] secret:bg-black text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase cursor-pointer">
                                    <option value="APA">APA</option>
                                    <option value="MLA">MLA</option>
                                    <option value="HARVARD">Harvard</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 secret:font-mono uppercase">Kiadó / Weboldal</label>
                            <input type="text" placeholder="pl. Akadémiai Kiadó" value={publisher} onChange={e => setPublisher(e.target.value)} className="border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-2 outline-none bg-white/50 dark:bg-black/20 secret:bg-transparent dark:text-white secret:text-[#1cf85d] secret:font-mono placeholder-gray-400 dark:placeholder-gray-500 secret:placeholder-[#1cf85d]/30" />
                        </div>

                        <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-white secret:text-[#1cf85d] font-bold py-3 mt-4 border-2 border-black dark:border-transparent secret:border-[#1cf85d] hover:-translate-y-1 hover:shadow-lg secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all cursor-pointer flex items-center justify-center secret:font-mono uppercase disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                            {isLoading ? 'Generálás...' : 'Hivatkozás Generálása'}
                        </button>
                    </form>
                </div>

                {/* --- Eredmény --- */}
                <div className="bg-white dark:bg-[#1e1e1e] secret:bg-black border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-md flex flex-col secret:rounded-none h-fit">
                    <div className="flex items-center justify-between mb-4 border-b-2 border-gray-300 dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                        <div className="flex items-center">
                            <Sparkles className="w-5 h-5 mr-2 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />
                            <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">Eredmény</h2>
                        </div>
                        {generatedRef && (
                            <span className="text-xs font-bold bg-gray-200 dark:bg-gray-700 secret:bg-[#1cf85d]/20 text-gray-800 dark:text-gray-200 secret:text-[#1cf85d] px-2 py-1 rounded-sm secret:rounded-none uppercase tracking-wider">
                                {style}
                            </span>
                        )}
                    </div>

                    {generatedRef ? (
                        <div className="flex flex-col h-full justify-between">
                            <div className="bg-gray-100 dark:bg-black/40 secret:bg-black border-2 border-dashed border-gray-400 dark:border-gray-600 secret:border-[#1cf85d]/50 p-4 mb-4 min-h-[120px] flex items-center justify-center text-center">
                                <p className="text-lg text-black dark:text-white secret:text-[#1cf85d] font-medium secret:font-mono [text-shadow:0_0_5px_rgba(28,248,93,0.3)]">
                                    {generatedRef}
                                </p>
                            </div>

                            <button
                                onClick={handleCopy}
                                className={`w-full font-bold py-3 border-2 transition-all flex items-center justify-center cursor-pointer secret:font-mono uppercase
                                    ${isCopied
                                        ? 'bg-green-600 dark:bg-green-600 border-black dark:border-transparent text-white secret:bg-[#1cf85d] secret:text-black secret:border-[#1cf85d]'
                                        : 'bg-white dark:bg-[#121212] secret:bg-transparent text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] hover:bg-[#800000] dark:hover:bg-[#a855f7] secret:hover:bg-[#1cf85d] hover:text-white secret:hover:text-black'
                                    }`}
                            >
                                {isCopied ? (
                                    <><Check className="w-5 h-5 mr-2" /> Másolva!</>
                                ) : (
                                    <><Copy className="w-5 h-5 mr-2" /> Vágólapra másolás</>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 secret:text-[#1cf85d]/40 min-h-[200px]">
                            <BookMarked className="w-12 h-12 mb-2 opacity-50" />
                            <p className="text-center text-sm secret:font-mono uppercase">&gt; Töltsd ki az adatokat és nyomj a generálásra.</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}