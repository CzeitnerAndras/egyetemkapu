import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import TerminalHack from '../components/TerminalGame';

export default function SecretPage() {
    const [username, setUsername] = useState('UNKNOWN');
    const [isHacked, setIsHacked] = useState(localStorage.getItem('terminalHacked') === 'true');
    const [charCount, setCharCount] = useState(0);
    const [bootStart, setBootStart] = useState(false);

    const [showNotes, setShowNotes] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [noteId, setNoteId] = useState<number | null>(null);
    const [isLoadingNote, setIsLoadingNote] = useState(false);
    const [isSavingNote, setIsSavingNote] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetch('/api/users/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data && data.username) {
                        setUsername(data.username);
                    }
                })
                .catch(err => console.error("Hiba a név lekérésekor:", err));
        }
    }, []);

    const handleLogoff = () => {
        window.dispatchEvent(new Event('triggerLogoffEffect'));
    };

    const openNotes = async () => {
        setShowNotes(true);
        setIsLoadingNote(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/notes', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    setNoteId(data[0].id);
                    setNoteContent(data[0].content);
                }
            }
        } catch (error) {
            console.error("Hiba a jegyzet betöltésekor:", error);
        } finally {
            setIsLoadingNote(false);
        }
    };

    const closeNotes = () => setShowNotes(false);

    const saveNote = async () => {
        setIsSavingNote(true);
        const token = localStorage.getItem('token');
        try {
            if (noteId) {
                await fetch(`/api/notes/${noteId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content: noteContent })
                });
            } else {
                const res = await fetch('/api/notes', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content: noteContent })
                });
                if (res.ok) {
                    const data = await res.json();
                    setNoteId(data.id);
                }
            }
        } catch (error) {
            console.error("Hiba a jegyzet mentésekor:", error);
        } finally {
            setIsSavingNote(false);
        }
    };

    const text1 = "BANDI INDUSTRIES UNIFIED OPERATING SYSTEM";
    const text2 = "COPYRIGHT 2075-2077 BANDI INDUSTRIES";
    const text3 = "-Server 76-";
    const text4 = "-BANDI Industries Management System-";
    const text5 = "=========================================";
    const text6 = "=========================================";
    const text7 = "| User Log:";
    const text8 = `| >> Administrator: ${username.toUpperCase()}`;
    const text9 = "| >> Frontdesk";
    const text10 = "|========";
    const text11 = "run:// details";
    const text12 = "run:// error";
    const text13 = "<< Logoff";

    const allTexts = [text1, text2, text3, text4, text5, text6, text7, text8, text9, text10, text11, text12, text13];
    const totalChars = allTexts.reduce((acc, t) => acc + t.length, 0);

    useEffect(() => {
        if (isHacked && !bootStart) {
            const t = setTimeout(() => setBootStart(true), 300);
            return () => clearTimeout(t);
        }
    }, [isHacked, bootStart]);

    useEffect(() => {
        if (bootStart && charCount < totalChars) {
            const t = setTimeout(() => setCharCount(c => c + 1), 10);
            return () => clearTimeout(t);
        }
    }, [charCount, totalChars, bootStart]);

    if (!isHacked) {
        return (
            <TerminalHack onSuccess={() => {
                localStorage.setItem('terminalHacked', 'true');
                setIsHacked(true);
            }} />
        );
    }

    let currentCount = 0;
    const renderText = (text: string) => {
        const startIdx = currentCount;
        currentCount += text.length;

        if (charCount <= startIdx) return <span className="invisible">{text}</span>;
        if (charCount >= startIdx + text.length) return text;

        const revealed = charCount - startIdx;
        return (
            <>
                {text.substring(0, revealed)}
                <span className="animate-pulse">█</span>
                <span className="invisible">{text.substring(revealed + 1)}</span>
            </>
        );
    };

    return (
        <main className="min-h-[calc(100vh-80px)] bg-transparent text-[#1cf85d] font-mono p-8 relative flex flex-col items-center justify-center selection:bg-[#1cf85d] selection:text-black z-20">

            {/* --- Terminál tartalom --- */}
            <div className="w-full max-w-4xl z-20 relative text-lg md:text-xl leading-relaxed [text-shadow:0_0_6px_rgba(28,248,93,0.5)]">

                {/* --- Fejléc --- */}
                <div className="text-center mb-8">
                    <p className="w-full">{renderText(text1)}</p>
                    <p className="w-full">{renderText(text2)}</p>
                    <p className="w-full">{renderText(text3)}</p>
                </div>

                {/* --- Alfejléc --- */}
                <div className="mb-6">
                    <p className="w-full">{renderText(text4)}</p>
                    <p className="w-full">{renderText(text5)}</p>
                    <p className="invisible">Ures sor</p>
                    <p className="w-full">{renderText(text6)}</p>
                </div>

                {/* --- Log adatok --- */}
                <div className="mb-6 space-y-1">
                    <p className="w-full">{renderText(text7)}</p>
                    <p className="w-full">{renderText(text8)}</p>
                    <p className="w-full">{renderText(text9)}</p>
                    <p className="w-full">{renderText(text10)}</p>
                </div>

                {/* --- Interaktív rész --- */}
                <div className="mt-8 space-y-2">
                    <div className="pt-6 flex flex-col space-y-2">
                        <button
                            onClick={openNotes}
                            className="text-left w-fit px-2 py-1 hover:bg-[#1cf85d] hover:text-black transition-none cursor-pointer uppercase border-none bg-transparent font-mono text-[#1cf85d] text-lg md:text-xl [text-shadow:0_0_6px_rgba(28,248,93,0.5)]">
                            {renderText(text11)}
                        </button>
                        <button
                            onClick={() => window.dispatchEvent(new Event('triggerFatalError'))}
                            className="text-left w-fit px-2 py-1 hover:bg-[#1cf85d] hover:text-black transition-none cursor-pointer uppercase border-none bg-transparent font-mono text-[#1cf85d] text-lg md:text-xl [text-shadow:0_0_6px_rgba(28,248,93,0.5)]">
                            {renderText(text12)}
                        </button>
                    </div>
                </div>

                <div className="mt-16">
                    <button
                        onClick={handleLogoff}
                        className="text-left w-fit px-2 py-1 hover:bg-[#1cf85d] hover:text-black transition-none cursor-pointer uppercase block border-none bg-transparent font-mono text-[#1cf85d] text-lg md:text-xl [text-shadow:0_0_6px_rgba(28,248,93,0.5)]"
                    >
                        {renderText(text13)}
                    </button>
                </div>
            </div>

            {/* --- Jegyzet Modal --- */}
            {showNotes && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={closeNotes}
                >
                    <div
                        className="w-full max-w-2xl bg-black border-4 border-[#1cf85d] shadow-[0_0_30px_rgba(28,248,93,0.4)] font-mono text-[#1cf85d] p-6 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4 border-b-2 border-[#1cf85d]/50 pb-2">
                            <h2 className="text-xl uppercase tracking-wider [text-shadow:0_0_6px_rgba(28,248,93,0.5)]">
                                &gt; notes.log
                            </h2>
                            <button
                                onClick={closeNotes}
                                className="hover:bg-[#1cf85d] hover:text-black transition-none p-1 cursor-pointer"
                                title="close"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {isLoadingNote ? (
                            <p className="text-center py-8 uppercase animate-pulse tracking-widest">loading...</p>
                        ) : (
                            <>
                                <textarea
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    placeholder="> type your notes here..."
                                    rows={8}
                                    className="w-full resize-none outline-none bg-black border-2 border-[#1cf85d]/50 focus:border-[#1cf85d] p-3 text-[#1cf85d] placeholder-[#1cf85d]/30 mb-4 transition-colors"
                                />
                                <button
                                    onClick={saveNote}
                                    disabled={isSavingNote}
                                    className="flex items-center justify-center w-full py-2 border-2 border-[#1cf85d] uppercase hover:bg-[#1cf85d] hover:text-black transition-none cursor-pointer disabled:opacity-50"
                                >
                                    <Save className="w-5 h-5 mr-2" />
                                    {isSavingNote ? 'saving...' : 'save'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}