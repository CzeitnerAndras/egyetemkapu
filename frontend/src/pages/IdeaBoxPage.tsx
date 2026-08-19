import { useState } from 'react';
import { Mail, Send, Lightbulb, Check } from 'lucide-react';

export default function IdeaBoxPage() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        const token = localStorage.getItem('token');
        if (!token) {
            setMessage({ text: 'Az ötletek beküldéséhez be kell jelentkezned!', type: 'error' });
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('http://localhost:8080/api/suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, description })
            });

            if (res.ok) {
                setMessage({ text: 'Köszönjük! Az ötleted sikeresen bekerült a ládába.', type: 'success' });
                setTitle('');
                setDescription('');
            } else {
                setMessage({ text: 'Hiba történt az ötlet elküldésekor.', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Nem sikerült csatlakozni a szerverhez.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="w-full max-w-4xl mx-auto mt-6 pb-12 px-4 relative z-20 lg:items-start">
            
            {/* --- Fejléc --- */}
            <div className="flex items-center space-x-3 mb-8 bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-md secret:shadow-[0_0_15px_rgba(28,248,93,0.3)] secret:rounded-none">
                <Mail className="w-8 h-8 text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                <h1 className="text-3xl font-bold text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                    Ötletláda
                </h1>
            </div>

            <div className="bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[0_20px_50px_rgba(128,0,0,0.15)] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] secret:shadow-[0_0_20px_rgba(28,248,93,0.2)] secret:rounded-none flex flex-col">
                <div className="flex items-center mb-6 border-b-2 border-gray-300 dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                    <Lightbulb className="w-5 h-5 mr-2 text-[#800000] dark:text-white secret:text-[#1cf85d]" />
                    <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">Oszd meg velünk a gondolataidat!</h2>
                </div>

                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 secret:text-[#1cf85d]/80 mb-6 secret:font-mono uppercase">
                    &gt; Van egy jó ötleted, hogy mivel tehetnénk még jobbá az Egyetemkaput? Hibát találtál? Írd meg nekünk!
                </p>

                {message && (
                    <div className={`p-4 mb-6 font-medium text-sm border-l-4 shadow-sm secret:font-mono uppercase ${
                        message.type === 'success' 
                            ? 'bg-green-100 dark:bg-green-900/40 border-green-600 text-green-700 dark:text-green-300 secret:bg-black secret:border-[#1cf85d] secret:text-[#1cf85d]' 
                            : 'bg-red-100 dark:bg-red-900/40 border-red-600 text-red-700 dark:text-red-300 secret:bg-black secret:border-[#1cf85d] secret:text-[#1cf85d]'
                    }`}>
                        {message.type === 'success' ? <Check className="inline w-4 h-4 mr-2" /> : null}
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-red-700 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                            Ötlet Címe
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Röviden miről van szó?"
                            className="border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-inner secret:shadow-none text-lg secret:font-mono placeholder:secret:text-[#1cf85d]/50"
                        />
                    </div>

                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-red-700 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                            Részletes Leírás
                        </label>
                        <textarea
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Fejtsd ki bővebben az ötleted vagy a problémát..."
                            rows={6}
                            className="border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-inner secret:shadow-none resize-none text-base secret:font-mono placeholder:secret:text-[#1cf85d]/50"
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-white secret:text-[#1cf85d] font-bold py-3 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(128,0,0,0.3)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all duration-300 border-2 border-black dark:border-transparent secret:border-[#1cf85d] flex items-center justify-center cursor-pointer secret:font-mono uppercase disabled:opacity-50"
                        >
                            <Send className="w-5 h-5 mr-2" />
                            {isLoading ? 'Küldés folyamatban...' : 'Ötlet Beküldése'}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}