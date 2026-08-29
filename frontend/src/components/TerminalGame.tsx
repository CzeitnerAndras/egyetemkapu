import { useState, useMemo, useEffect, useRef } from 'react';

const SYMBOLS = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
const WORDS = [
    "LINKS", "FRONT", "IDEAS", "REACT", "ADMIN", "TOKEN",
    "GAMES", "DEBUG", "ERROR", "PANEL", "CLICK", "ENTER",
    "BOARD", "LOGIC", "VIEWS", "PAGES", "ABOUT", "KAPUK"
];

interface TerminalHackProps {
    onSuccess: () => void;
}

export default function TerminalHack({ onSuccess }: TerminalHackProps) {
    const [attempts, setAttempts] = useState(4);
    const [history, setHistory] = useState<string[]>([]);
    const [locked, setLocked] = useState(false);
    const [granted, setGranted] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [bootStep, setBootStep] = useState(0);
    const [bootStart, setBootStart] = useState(false);

    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `nav { display: none !important; }`;
        document.head.appendChild(style);

        const t = setTimeout(() => {
            setBootStart(true);
        }, 3200);

        return () => {
            style.remove();
            clearTimeout(t);
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

    const header1 = "BANDI INDUSTRIES (TM) TERMLINK PROTOCOL";
    const header2 = "ENTER PASSWORD NOW";
    const attemptsText = `${attempts} ATTEMPT(S) LEFT: ${Array(attempts).fill('█').join(' ')}`;

    const totalHeaderChars = useMemo(() => {
        const initAttempts = `4 ATTEMPT(S) LEFT: █ █ █ █`;
        return header1.length + header2.length + initAttempts.length;
    }, [header1.length, header2.length]);

    const totalSteps = totalHeaderChars + 32;
    const bootStartTimeRef = useRef<number | null>(null);
    const STEP_MS = 15;

    useEffect(() => {
        if (!bootStart || bootStep >= totalSteps) return;

        if (bootStartTimeRef.current === null) {
            bootStartTimeRef.current = performance.now();
        }
        const startTime = bootStartTimeRef.current;

        const t = setTimeout(() => {
            const elapsed = performance.now() - startTime;
            const targetStep = Math.min(totalSteps, Math.floor(elapsed / STEP_MS));
            setBootStep(s => Math.max(s + 1, targetStep));
        }, STEP_MS);

        return () => clearTimeout(t);
    }, [bootStart, bootStep, totalSteps]);

    const handleWordClick = (word: string) => {
        if (locked || granted || bootStep < totalSteps) return;

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
                    window.dispatchEvent(new Event('triggerFatalError'));
                }, 1500);
            }
        }
    };

    let currentHeaderCount = 0;
    const renderHeaderText = (text: string) => {
        const startIdx = currentHeaderCount;
        currentHeaderCount += text.length;

        if (bootStep <= startIdx) return <span className="invisible">{text}</span>;
        if (bootStep >= startIdx + text.length) return text;

        const revealed = bootStep - startIdx;
        return (
            <>
                {text.substring(0, revealed)}
                <span className="animate-pulse">█</span>
                <span className="invisible">{text.substring(revealed + 1)}</span>
            </>
        );
    };

    const linesVisible = Math.max(0, bootStep - totalHeaderChars);

    const renderLine = (line: { hex: string, content: any[] }, index: number) => {
        if (index >= linesVisible) {
            return (
                <div key={line.hex} className="flex space-x-4 mb-0.5 whitespace-pre invisible">
                    <span className="opacity-60">{line.hex}</span>
                    <span className="flex tracking-[0.25em]">
                        {line.content.map(token => <span key={token.id}>{token.value}</span>)}
                    </span>
                </div>
            );
        }

        return (
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
    };

    return (
        <main className="min-h-screen bg-transparent text-[#1cf85d] font-mono p-4 md:p-12 relative flex flex-col items-center justify-center selection:bg-[#1cf85d] selection:text-black uppercase z-20">
            <div className="absolute inset-0 pointer-events-none crt-overlay opacity-50 z-0"></div>

            <div className="w-full max-w-5xl h-full flex flex-col justify-center [text-shadow:0_0_5px_rgba(28,248,93,0.8)] relative z-10">

                <div className="mb-8 flex flex-col items-start w-full">
                    <p className="text-xl md:text-2xl font-bold mb-2 w-full">{renderHeaderText(header1)}</p>
                    <p className="text-lg md:text-xl mb-4 w-full">{renderHeaderText(header2)}</p>

                    <p className="text-lg md:text-xl flex items-center w-full">
                        {renderHeaderText(attemptsText)}
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
                    {/* --- Bal --- */}
                    <div className="flex flex-col text-sm md:text-lg">
                        {lines.slice(0, 16).map((line, i) => renderLine(line, i))}
                    </div>

                    {/* --- Jobb --- */}
                    <div className="flex flex-col text-sm md:text-lg">
                        {lines.slice(16, 32).map((line, i) => renderLine(line, i + 16))}
                    </div>

                    {/* --- Előzmények és Terminál kimenet --- */}
                    <div className="flex flex-col flex-1 mt-4 lg:mt-0 self-end h-full justify-end text-sm md:text-lg min-h-[150px]">
                        {history.map((h, i) => (
                            <p key={i} className="mb-1">{h}</p>
                        ))}
                        {hoveredItem && !locked && !granted && bootStep >= totalSteps && (
                            <p className="animate-pulse">&gt; {hoveredItem}█</p>
                        )}
                        {!hoveredItem && !locked && !granted && bootStep >= totalSteps && (
                            <p className="animate-pulse">&gt; █</p>
                        )}
                    </div>
                </div>

            </div>
        </main>
    );
}