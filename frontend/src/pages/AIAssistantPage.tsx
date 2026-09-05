import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { PageShell } from '../components/PageLayout';

interface Message {
    id: number;
    role: 'user' | 'ai';
    text: string;
}

export default function AIAssistantPage() {
    const { t } = useLanguage();
    const isCurrentlySecret = document.documentElement.classList.contains('secret');
    const [isSecretMode, setIsSecretMode] = useState(isCurrentlySecret);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            role: 'ai',
            text: isCurrentlySecret
                ? t('ai.welcomeSecret')
                : t('ai.welcome')
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const hasCheckedPending = useRef(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        setMessages(prev => {
            const newMsgs = [...prev];
            if (newMsgs.length > 0 && newMsgs[0].id === 1) {
                newMsgs[0].text = isSecretMode ? t('ai.welcomeSecret') : t('ai.welcome');
            }
            return newMsgs;
        });
    }, [t, isSecretMode]);

    useEffect(() => {
        const handleSecretLogoff = () => {
            setIsSecretMode(false);
        };

        window.addEventListener('secretLogoff', handleSecretLogoff);
        return () => {
            window.removeEventListener('secretLogoff', handleSecretLogoff);
        };
    }, []);

    const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
        if (e) e.preventDefault();

        const userText = overrideText || inputValue;
        if (!userText.trim()) return;

        const newUserMessage: Message = {
            id: Date.now(),
            role: 'user',
            text: userText
        };

        setMessages((prev) => [...prev, newUserMessage]);

        if (!overrideText) {
            setInputValue('');
        }

        setIsLoading(true);
        const token = localStorage.getItem('token');

        try {
            const response = await fetch('/api/ai/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ prompt: userText })
            });

            if (response.status === 401 || response.status === 403) {
                throw new Error('unauthorized');
            }

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
        } catch (err: any) {
            const errorAiMessage: Message = {
                id: Date.now() + 1,
                role: 'ai',
                text: err.message === 'unauthorized' ? "Kérlek, jelentkezz be a funkció használatához!" : t('ai.error')
            };
            setMessages((prev) => [...prev, errorAiMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!hasCheckedPending.current) {
            hasCheckedPending.current = true;
            const pendingPrompt = localStorage.getItem('pendingAiPrompt');
            if (pendingPrompt) {
                localStorage.removeItem('pendingAiPrompt');
                handleSendMessage(undefined, pendingPrompt);
            }
        }
    }, []);

    return (
        <PageShell variant="fill">

            {/* --- Fő Konténer --- */}
            <div className="flex-1 flex flex-col border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-slate-100 dark:bg-[#121212] secret:bg-transparent shadow-[8px_8px_0px_#d946ef] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] secret:shadow-[0_0_20px_rgba(28,248,93,0.2)] transition-all duration-300 overflow-hidden relative rounded-sm secret:rounded-none">

                {/* --- Fejléc --- */}
                <div className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black p-4 flex items-center space-x-3 border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] transition-colors shadow-[4px_4px_0px_#000] dark:shadow-md z-10">
                    <Bot className="w-8 h-8 text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                    <h1 className="text-2xl font-bold text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                        {isSecretMode ? t('ai.secretTitle') : t('ai.title')}
                    </h1>
                </div>

                {/* --- Chat Ablak --- */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-100 dark:bg-gradient-to-b dark:from-[#121212] dark:to-[#1a1a1a] secret:bg-none secret:bg-transparent transition-colors custom-scrollbar">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>

                            {msg.role === 'ai' && (
                                <div className="w-10 h-10 rounded-full secret:rounded-none bg-fuchsia-500 dark:bg-gradient-to-br dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-[#1cf85d] flex items-center justify-center mr-3 shrink-0 border-2 border-black dark:border-transparent secret:border-[#1cf85d] transition-transform group-hover:scale-110 shadow-[4px_4px_0px_#000] dark:shadow-sm">
                                    <Bot className="w-6 h-6 text-black dark:text-white secret:text-black" />
                                </div>
                            )}

                            <div className={`max-w-[85%] sm:max-w-[75%] p-3 sm:p-4 border-2 text-base sm:text-lg leading-relaxed transition-all duration-300 secret:font-mono ${msg.role === 'user'}
                                ? 'bg-cyan-400 dark:bg-gradient-to-br dark:from-[#2d2d2d] dark:to-[#3d3d3d] secret:bg-none secret:bg-transparent border-black dark:border-gray-600 secret:border-[#1cf85d] secret:border-dashed text-black dark:text-gray-100 secret:text-[#1cf85d] rounded-tl-xl rounded-tr-xl rounded-bl-xl secret:rounded-none shadow-[4px_4px_0px_#000] dark:shadow-md hover:shadow-[6px_6px_0px_#000] dark:hover:shadow-lg'
                                : 'bg-white dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-black dark:border-[#a855f7] secret:border-[#1cf85d] text-black dark:text-gray-200 secret:text-[#1cf85d] rounded-tr-xl rounded-bl-xl rounded-br-xl secret:rounded-none shadow-[4px_4px_0px_#000] dark:shadow-md hover:shadow-[6px_6px_0px_#000] dark:hover:shadow-lg'
                                }`}>
                                {msg.role === 'user' ? `> ${msg.text}` : msg.text}
                            </div>

                            {msg.role === 'user' && (
                                <div className="w-10 h-10 rounded-full secret:rounded-none bg-cyan-400 dark:bg-gradient-to-br dark:from-gray-700 dark:to-gray-800 secret:bg-none secret:bg-transparent flex items-center justify-center ml-3 shrink-0 border-2 border-black dark:border-transparent secret:border-[#1cf85d] secret:border-dashed transition-transform group-hover:scale-110 shadow-[4px_4px_0px_#000] dark:shadow-sm">
                                    <User className="w-6 h-6 text-black dark:text-gray-200 secret:text-[#1cf85d]" />
                                </div>
                            )}

                        </div>
                    ))}

                    {/* --- Typing indicator --- */}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="w-10 h-10 rounded-full secret:rounded-none bg-fuchsia-500 dark:bg-gradient-to-br dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-[#1cf85d] flex items-center justify-center mr-3 shrink-0 border-2 border-black dark:border-transparent secret:border-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-sm">
                                <Bot className="w-6 h-6 text-black dark:text-white secret:text-black" />
                            </div>
                            <div className="max-w-[75%] p-4 border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-white dark:bg-[#1e1e1e] secret:bg-black flex space-x-2 items-center rounded-tr-xl rounded-bl-xl rounded-br-xl secret:rounded-none shadow-[4px_4px_0px_#000] dark:shadow-md">
                                <div className="w-2.5 h-2.5 bg-black dark:bg-[#a855f7] secret:bg-[#1cf85d] rounded-full secret:rounded-none animate-bounce"></div>
                                <div className="w-2.5 h-2.5 bg-black dark:bg-[#a855f7] secret:bg-[#1cf85d] rounded-full secret:rounded-none animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2.5 h-2.5 bg-black dark:bg-[#a855f7] secret:bg-[#1cf85d] rounded-full secret:rounded-none animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* --- Input Szekció --- */}
                <div className="p-4 bg-slate-100 dark:bg-gradient-to-r dark:from-[#1e1e1e] dark:to-[#2e1065] secret:bg-none secret:bg-transparent border-t-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] transition-colors z-10 shadow-none dark:shadow-none">
                    <form onSubmit={handleSendMessage} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={t('ai.placeholder')}
                            className="flex-1 min-w-0 border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-3 outline-none focus:border-fuchsia-500 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-[#1cf85d]/30 text-base sm:text-lg bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] placeholder:secret:text-[#1cf85d]/50 secret:font-mono transition-all shadow-[4px_4px_0px_#000] dark:shadow-inner"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] px-6 py-3 sm:py-0 font-bold border-4 border-black dark:border-transparent secret:border-[#1cf85d] transition-all duration-300 shadow-[4px_4px_0px_#000] dark:shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black flex items-center justify-center cursor-pointer secret:font-mono secret:uppercase"
                        >
                            <Send className="w-6 h-6 mr-2 font-bold" />
                            {t('ai.send')}
                        </button>
                    </form>
                </div>

            </div>
        </PageShell>
    );
}