import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SYMBOLS = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
const WORDS = [
    "LINKS", "FRONT", "IDEAS", "REACT", "ADMIN", "TOKEN",
    "GAMES", "DEBUG", "ERROR", "PANEL", "CLICK", "ENTER",
    "BOARD", "LOGIC", "VIEWS", "PAGES", "EGYET", "KAPUK"
];

interface TerminalHackProps {
    onSuccess: () => void;
}

export default function TerminalHack({ onSuccess }: TerminalHackProps) {
    const navigate = useNavigate();
    const [attempts, setAttempts] = useState(4);
    const [history, setHistory] = useState<string[]>([]);
    const [locked, setLocked] = useState(false);
    const [granted, setGranted] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `nav { display: none !important; }`;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    const { lines, password } = useMemo(() => {
        const shuffledWords = [...WORDS].sort(() => 0.5 - Math.random()).slice(0, 12);
        const pass = shuffledWords[Math.floor(Math.random() * shuffledWords.length)];
        const lineAssignments = Array(32).fill(null);
        const availableLines = Array.from({ length: 32 }, (_, i) => i).sort(() => 0.5 - Math.random());
        for (let i = 0; i < 12; i++) {
            lineAssignments[availableLines[i]] = shuffledWords[i];
        }

        let currentHex = 0xF964;
        const generatedLines = lineAssignments.map((word, idx) => {
            const content = [];
            if (word) {
                const startIdx = Math.floor(Math.random() * (12 - word.length + 1));
                for (let i = 0; i < startIdx; i++) {
                    content.push({ type: 'char', value: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)], id: `${idx}-pre-${i}` });
                }
                content.push({ type: 'word', value: word, id: `${idx}-word` });
                for (let i = startIdx + word.length; i < 12; i++) {
                    content.push({ type: 'char', value: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)], id: `${idx}-post-${i}` });
                }
            } else {
                for (let i = 0; i < 12; i++) {
                    content.push({ type: 'char', value: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)], id: `${idx}-char-${i}` });
                }
            }
            const line = { hex: `0x${currentHex.toString(16).toUpperCase()}`, content };
            currentHex += 12;
            return line;
        });

        return { lines: generatedLines, password: pass };
    }, []);

    const handleWordClick = (word: string) => {
        if (locked || granted) return;

        if (word === password) {
            setHistory(prev => [...prev, `> ${word}`, `> Exact match!`, `> Access granted.`]);
            setGranted(true);
            setTimeout(() => {
                onSuccess();
            }, 1500);
        } else {
            let likeness = 0;
            for (let i = 0; i < password.length; i++) {
                if (word[i] === password[i]) likeness++;
            }

            setHistory(prev => [...prev, `> ${word}`, `> Entry denied.`, `> Likeness=${likeness}`]);
            setAttempts(a => a - 1);

            if (attempts - 1 === 0) {
                setLocked(true);
                setHistory(prev => [...prev, `> TERMINAL LOCKED`, `> PLEASE CONTACT ADMINISTRATOR`]);
                setTimeout(() => {
                    document.documentElement.classList.remove('secret');
                    localStorage.removeItem('secretMode');
                    navigate('/');
                }, 3000);
            }
        }
    };

    const renderLine = (line: { hex: string, content: any[] }) => (
        <div key={line.hex} className="flex space-x-4 mb-0.5 whitespace-pre">
            <span className="opacity-60">{line.hex}</span>
            <span className="flex tracking-[0.25em]">
                {line.content.map(token => {
                    if (token.type === 'word') {
                        return (
                            <span
                                key={token.id}
                                className="cursor-pointer hover:bg-[#1cf85d] hover:text-black transition-none font-bold"
                                onClick={() => handleWordClick(token.value)}
                                onMouseEnter={() => setHoveredItem(token.value)}
                                onMouseLeave={() => setHoveredItem(null)}
                            >
                                {token.value}
                            </span>
                        );
                    } else {
                        return (
                            <span
                                key={token.id}
                                className="cursor-default hover:bg-[#1cf85d] hover:text-black transition-none"
                                onMouseEnter={() => setHoveredItem(token.value)}
                                onMouseLeave={() => setHoveredItem(null)}
                            >
                                {token.value}
                            </span>
                        );
                    }
                })}
            </span>
        </div>
    );

    return (
        <main className="min-h-screen bg-transparent text-[#1cf85d] font-mono p-4 md:p-12 relative flex flex-col items-center justify-center selection:bg-[#1cf85d] selection:text-black uppercase z-20">
            <div className="absolute inset-0 pointer-events-none crt-overlay opacity-50 z-0"></div>

            <div className="w-full max-w-5xl h-full flex flex-col justify-center [text-shadow:0_0_5px_rgba(28,248,93,0.8)] relative z-10">

                <div className="mb-8">
                    <p className="text-xl md:text-2xl font-bold mb-2">ROBCO INDUSTRIES (TM) TERMLINK PROTOCOL</p>
                    <p className="text-lg md:text-xl mb-4">ENTER PASSWORD NOW</p>

                    <p className="text-lg md:text-xl flex items-center">
                        {attempts} ATTEMPT(S) LEFT: <span className="ml-2 tracking-widest">{Array(attempts).fill('█').join(' ')}</span>
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
                    {/* --- Bal --- */}
                    <div className="flex flex-col text-sm md:text-lg">
                        {lines.slice(0, 16).map(renderLine)}
                    </div>

                    {/* --- Jobb --- */}
                    <div className="flex flex-col text-sm md:text-lg">
                        {lines.slice(16, 32).map(renderLine)}
                    </div>

                    {/* --- Előzmények és Terminál kimenet --- */}
                    <div className="flex flex-col flex-1 mt-4 lg:mt-0 self-end h-full justify-end text-sm md:text-lg min-h-[150px]">
                        {history.map((h, i) => (
                            <p key={i} className="mb-1">{h}</p>
                        ))}
                        {hoveredItem && !locked && !granted && (
                            <p className="animate-pulse">&gt; {hoveredItem}█</p>
                        )}
                        {!hoveredItem && !locked && !granted && (
                            <p className="animate-pulse">&gt; █</p>
                        )}
                    </div>
                </div>

            </div>
        </main>
    );
}