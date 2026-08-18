import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';

interface Message {
    id: number;
    role: 'user' | 'ai';
    text: string;
}

export default function AIAssistantPage() {
    const isCurrentlySecret = document.documentElement.classList.contains('secret');
    const [isSecretMode, setIsSecretMode] = useState(isCurrentlySecret);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            role: 'ai',
            text: isCurrentlySecret
                ? 'Üdvözöllek! Én a BandiAI vagyok. Miben segíthetek ma?'
                : 'Üdvözöllek! Én vagyok az Egyetemkapu AI Asszisztense. Miben segíthetek ma?'
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        const handleSecretLogoff = () => {
            setIsSecretMode(false);

            setMessages(prev => {
                const newMsgs = [...prev];
                if (newMsgs.length > 0 && newMsgs[0].id === 1) {
                    newMsgs[0].text = 'Üdvözöllek! Én vagyok az Egyetemkapu AI Asszisztense. Miben segíthetek ma?';
                }
                return newMsgs;
            });
        };

        window.addEventListener('secretLogoff', handleSecretLogoff);
        return () => {
            window.removeEventListener('secretLogoff', handleSecretLogoff);
        };
    }, []);

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputValue.trim()) return;

        const userText = inputValue;

        const newUserMessage: Message = {
            id: Date.now(),
            role: 'user',
            text: userText
        };

        setMessages((prev) => [...prev, newUserMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8080/api/ai/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userText })
            });

            const data = await response.json();

            if (response.ok) {
                const newAiMessage: Message = {
                    id: Date.now() + 1,
                    role: 'ai',
                    text: data.answer
                };
                setMessages((prev) => [...prev, newAiMessage]);
            } else {
                throw new Error('Hiba a válasz feldolgozásakor');
            }
        } catch (err) {
            const errorAiMessage: Message = {
                id: Date.now() + 1,
                role: 'ai',
                text: 'Sajnos nem tudtam kapcsolódni a szerverhez. Kérlek, próbáld újra később!'
            };
            setMessages((prev) => [...prev, errorAiMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="w-full max-w-5xl mx-auto mt-8 px-4 h-[calc(100vh-120px)] flex flex-col relative z-20">

            {/* --- Fő Konténer: 3D Árnyék és Gradiens --- */}
            <div className="flex-1 flex flex-col border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-transparent shadow-[0_20px_50px_rgba(128,0,0,0.15)] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] secret:shadow-[0_0_20px_rgba(28,248,93,0.2)] transition-all duration-300 overflow-hidden relative rounded-sm secret:rounded-none">

                {/* --- Fejléc: Egyezik a Navbar stílusával --- */}
                <div className="bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black p-4 flex items-center space-x-3 border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] transition-colors shadow-md z-10">
                    <Bot className="w-8 h-8 text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                    <h1 className="text-2xl font-bold text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                        {isSecretMode ? 'Bandi Industries AI Asszisztens' : 'AI Asszisztens'}
                    </h1>
                </div>

                {/* --- Chat Ablak --- */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-[#fdfbf7] to-[#f4ebe1] dark:from-[#121212] dark:to-[#1a1a1a] secret:bg-none secret:bg-transparent transition-colors custom-scrollbar">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>

                            {/* --- Ikon az AI üzenetek mellett --- */}
                            {msg.role === 'ai' && (
                                <div className="w-10 h-10 rounded-full secret:rounded-none bg-gradient-to-br from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-[#1cf85d] flex items-center justify-center mr-3 shrink-0 border-2 border-black dark:border-transparent secret:border-[#1cf85d] transition-transform group-hover:scale-110 shadow-sm">
                                    <Bot className="w-6 h-6 text-white secret:text-black" />
                                </div>
                            )}

                            {/* --- Üzenet buborék --- */}
                            <div className={`max-w-[75%] p-4 border-2 shadow-md text-lg leading-relaxed transition-all duration-300 hover:shadow-lg secret:font-mono ${msg.role === 'user'
                                ? 'bg-gradient-to-br from-[#fefce8] to-[#fef3c7] dark:from-[#2d2d2d] dark:to-[#3d3d3d] secret:bg-none secret:bg-transparent border-black dark:border-gray-600 secret:border-[#1cf85d] secret:border-dashed text-black dark:text-gray-100 secret:text-[#1cf85d] rounded-tl-xl rounded-tr-xl rounded-bl-xl secret:rounded-none'
                                : 'bg-gradient-to-br from-[#ffffff] to-[#fdfbf7] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] text-gray-800 dark:text-gray-200 secret:text-[#1cf85d] rounded-tr-xl rounded-bl-xl rounded-br-xl secret:rounded-none'
                                }`}>
                                {msg.role === 'user' ? `> ${msg.text}` : msg.text}
                            </div>

                            {/* --- Ikon a User üzenetek mellett --- */}
                            {msg.role === 'user' && (
                                <div className="w-10 h-10 rounded-full secret:rounded-none bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 secret:bg-none secret:bg-transparent flex items-center justify-center ml-3 shrink-0 border-2 border-black dark:border-transparent secret:border-[#1cf85d] secret:border-dashed transition-transform group-hover:scale-110 shadow-sm">
                                    <User className="w-6 h-6 text-gray-700 dark:text-gray-200 secret:text-[#1cf85d]" />
                                </div>
                            )}

                        </div>
                    ))}

                    {/* --- Gondolkodás (Typing indicator) --- */}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="w-10 h-10 rounded-full secret:rounded-none bg-gradient-to-br from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-[#1cf85d] flex items-center justify-center mr-3 shrink-0 border-2 border-black dark:border-transparent secret:border-[#1cf85d] shadow-sm">
                                <Bot className="w-6 h-6 text-white secret:text-black" />
                            </div>
                            <div className="max-w-[75%] p-4 border-2 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] bg-white dark:bg-[#1e1e1e] secret:bg-black flex space-x-2 items-center rounded-tr-xl rounded-bl-xl rounded-br-xl secret:rounded-none shadow-md">
                                <div className="w-2.5 h-2.5 bg-[#800000] dark:bg-[#a855f7] secret:bg-[#1cf85d] rounded-full secret:rounded-none animate-bounce"></div>
                                <div className="w-2.5 h-2.5 bg-[#800000] dark:bg-[#a855f7] secret:bg-[#1cf85d] rounded-full secret:rounded-none animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2.5 h-2.5 bg-[#800000] dark:bg-[#a855f7] secret:bg-[#1cf85d] rounded-full secret:rounded-none animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* --- Bemeneti (Input) Szekció --- */}
                <div className="p-4 bg-gradient-to-r from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2e1065] secret:bg-none secret:bg-transparent border-t-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] transition-colors z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] dark:shadow-none">
                    <form onSubmit={handleSendMessage} className="flex space-x-4">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Írd ide a kérdésed..."
                            className="flex-1 border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-3 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 secret:focus:ring-[#1cf85d]/30 text-lg bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] placeholder:secret:text-[#1cf85d]/50 secret:font-mono transition-all shadow-inner"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-white secret:text-[#1cf85d] px-6 font-bold border-2 border-black dark:border-transparent secret:border-[#1cf85d] transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(128,0,0,0.3)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black flex items-center cursor-pointer secret:font-mono secret:uppercase"
                        >
                            <Send className="w-6 h-6 mr-2" />
                            Küldés
                        </button>
                    </form>
                </div>

            </div>
        </main>
    );
}