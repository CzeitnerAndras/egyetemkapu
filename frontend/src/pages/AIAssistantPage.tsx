import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';

interface Message {
    id: number;
    role: 'user' | 'ai';
    text: string;
}

export default function AIAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, role: 'ai', text: 'Üdvözöllek! Én vagyok az Egyetemkapu AI Asszisztense. Miben segíthetek ma?' }
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
        <main className="w-full max-w-5xl mx-auto mt-8 px-4 h-[calc(100vh-120px)] flex flex-col">

            {/* --- Fő Konténer: 3D Árnyék és Gradiens --- */}
            <div className="flex-1 flex flex-col border-4 border-[#800000] dark:border-[#a855f7] bg-white dark:bg-[#121212] shadow-[0_20px_50px_rgba(128,0,0,0.15)] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] transition-all duration-300 overflow-hidden relative rounded-sm">

                {/* --- Fejléc: Egyezik a Navbar stílusával --- */}
                <div className="bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#1e1e1e] dark:to-[#3b0764] p-4 flex items-center space-x-3 border-b-4 border-black dark:border-[#a855f7] transition-colors shadow-md z-10">
                    <Bot className="w-8 h-8 text-white drop-shadow-md" />
                    <h1 className="text-2xl font-bold text-white drop-shadow-md">AI Asszisztens</h1>
                </div>

                {/* --- Chat Ablak --- */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-[#fdfbf7] to-[#f4ebe1] dark:from-[#121212] dark:to-[#1a1a1a] transition-colors custom-scrollbar">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>

                            {/* --- Ikon az AI üzenetek mellett --- */}
                            {msg.role === 'ai' && (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] flex items-center justify-center mr-3 shrink-0 border-2 border-black dark:border-transparent transition-transform group-hover:scale-110 shadow-sm">
                                    <Bot className="w-6 h-6 text-white" />
                                </div>
                            )}

                            {/* --- Üzenet buborék --- */}
                            <div className={`max-w-[75%] p-4 border-2 shadow-md text-lg leading-relaxed transition-all duration-300 hover:shadow-lg ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-[#fefce8] to-[#fef3c7] dark:from-[#2d2d2d] dark:to-[#3d3d3d] border-black dark:border-gray-600 text-black dark:text-gray-100 rounded-tl-xl rounded-tr-xl rounded-bl-xl'
                                    : 'bg-gradient-to-br from-[#ffffff] to-[#fdfbf7] dark:from-[#1e1e1e] dark:to-[#2b184a] border-[#800000] dark:border-[#a855f7] text-gray-800 dark:text-gray-200 rounded-tr-xl rounded-bl-xl rounded-br-xl'
                                }`}>
                                {msg.text}
                            </div>

                            {/* --- Ikon a User üzenetek mellett --- */}
                            {msg.role === 'user' && (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center ml-3 shrink-0 border-2 border-black dark:border-transparent transition-transform group-hover:scale-110 shadow-sm">
                                    <User className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                                </div>
                            )}

                        </div>
                    ))}

                    {/* --- Gondolkodás (Typing indicator) --- */}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] flex items-center justify-center mr-3 shrink-0 border-2 border-black dark:border-transparent shadow-sm">
                                <Bot className="w-6 h-6 text-white" />
                            </div>
                            <div className="max-w-[75%] p-4 border-2 border-[#800000] dark:border-[#a855f7] bg-white dark:bg-[#1e1e1e] flex space-x-2 items-center rounded-tr-xl rounded-bl-xl rounded-br-xl shadow-md">
                                <div className="w-2.5 h-2.5 bg-[#800000] dark:bg-[#a855f7] rounded-full animate-bounce"></div>
                                <div className="w-2.5 h-2.5 bg-[#800000] dark:bg-[#a855f7] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2.5 h-2.5 bg-[#800000] dark:bg-[#a855f7] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* --- Bemeneti (Input) Szekció --- */}
                <div className="p-4 bg-gradient-to-r from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2e1065] border-t-4 border-black dark:border-[#a855f7] transition-colors z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] dark:shadow-none">
                    <form onSubmit={handleSendMessage} className="flex space-x-4">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Írd ide a kérdésed..."
                            className="flex-1 border-2 border-black dark:border-[#a855f7] p-3 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 text-lg bg-white dark:bg-[#121212] text-black dark:text-white transition-all shadow-inner"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] text-white px-6 font-bold border-2 border-black dark:border-transparent transition-all duration-300 shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(128,0,0,0.3)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] flex items-center cursor-pointer"
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