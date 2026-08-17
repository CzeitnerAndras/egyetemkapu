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

    const handleSendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputValue.trim()) return;

        const newUserMessage: Message = {
            id: Date.now(),
            role: 'user',
            text: inputValue
        };

        setMessages((prev) => [...prev, newUserMessage]);
        setInputValue('');
        setIsLoading(true);
        setTimeout(() => {
            const newAiMessage: Message = {
                id: Date.now() + 1,
                role: 'ai',
                text: 'Még nem éles a rendszer, de hamarosan válaszolni fogok a kérdésedre!'
            };
            setMessages((prev) => [...prev, newAiMessage]);
            setIsLoading(false);
        }, 1500);
    };

    return (
        <main className="w-full max-w-5xl mx-auto mt-8 px-4 h-[calc(100vh-120px)] flex flex-col">
            
            {/* --- Konténer --- */}
            <div className="flex-1 flex flex-col border-4 border-[#800000] dark:border-[#a855f7] bg-[#fdfbf7] dark:bg-[#1e1e1e] shadow-xl transition-colors duration-300 overflow-hidden relative">
                
                {/* --- Fejléc --- */}
                <div className="bg-[#800000] dark:bg-[#2e1065] p-4 flex items-center space-x-3 border-b-4 border-black dark:border-[#a855f7] transition-colors">
                    <Bot className="w-8 h-8 text-white" />
                    <h1 className="text-2xl font-bold text-white">AI Asszisztens</h1>
                </div>

                {/* --- Chat Ablak --- */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-[#121212] transition-colors">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            
                            {/* --- Ikon az AI üzenetek mellett --- */}
                            {msg.role === 'ai' && (
                                <div className="w-10 h-10 rounded-full bg-[#800000] dark:bg-[#a855f7] flex items-center justify-center mr-3 shrink-0 border-2 border-black dark:border-transparent transition-colors">
                                    <Bot className="w-6 h-6 text-white" />
                                </div>
                            )}

                            {/* --- Üzenet buborék (szögletes dizájn) --- */}
                            <div className={`max-w-[75%] p-4 border-2 shadow-sm text-lg leading-relaxed ${
                                msg.role === 'user' 
                                ? 'bg-[#fefce8] dark:bg-[#2d2d2d] border-black dark:border-gray-600 text-black dark:text-gray-100' 
                                : 'bg-white dark:bg-[#1e1e1e] border-[#800000] dark:border-[#a855f7] text-gray-800 dark:text-gray-200'
                            }`}>
                                {msg.text}
                            </div>

                            {/* --- Ikon a User üzenetek mellett --- */}
                            {msg.role === 'user' && (
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center ml-3 shrink-0 border-2 border-black dark:border-transparent transition-colors">
                                    <User className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                                </div>
                            )}

                        </div>
                    ))}

                    {/* --- Gondolkodás (Typing indicator) --- */}
                    {isLoading && (
                        <div className="flex justify-start">
                             <div className="w-10 h-10 rounded-full bg-[#800000] dark:bg-[#a855f7] flex items-center justify-center mr-3 shrink-0 border-2 border-black dark:border-transparent">
                                <Bot className="w-6 h-6 text-white" />
                            </div>
                            <div className="max-w-[75%] p-4 border-2 border-[#800000] dark:border-[#a855f7] bg-white dark:bg-[#1e1e1e] flex space-x-2 items-center">
                                <div className="w-2 h-2 bg-[#800000] dark:bg-[#a855f7] rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-[#800000] dark:bg-[#a855f7] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-[#800000] dark:bg-[#a855f7] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* --- Bemeneti (Input) Szekció --- */}
                <div className="p-4 bg-[#fdfbf7] dark:bg-[#1e1e1e] border-t-4 border-black dark:border-[#a855f7] transition-colors">
                    <form onSubmit={handleSendMessage} className="flex space-x-4">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Írd ide a kérdésed..."
                            className="flex-1 border-2 border-black dark:border-[#a855f7] p-3 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] text-lg bg-white dark:bg-[#121212] text-black dark:text-white transition-colors"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-[#800000] dark:bg-[#a855f7] text-white px-6 font-bold hover:bg-red-800 dark:hover:bg-[#9333ea] border-2 border-black dark:border-transparent transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center cursor-pointer"
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