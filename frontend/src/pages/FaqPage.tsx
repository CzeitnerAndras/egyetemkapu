import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, MessageCircleQuestion } from 'lucide-react';

interface FaqItem {
    id: number;
    question: string;
    answer: React.ReactNode;
}

export default function FaqPage() {
    const [openId, setOpenId] = useState<number | null>(1);

    const toggleFaq = (id: number) => {
        setOpenId(openId === id ? null : id);
    };

    const faqData: FaqItem[] = [
        {
            id: 1,
            question: "Hogyan működik a Komplex API Számológép?",
            answer: (
                <div className="space-y-2">
                    <p>A számológép egy külső matematikai API-t használ, amely képes bonyolultabb egyenletek megoldására is. A kifejezéseket normál matematikai formátumban kell megadni.</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>Hatványozás:</strong> Használd a <code>^</code> jelet (pl. <code>x^2</code>).</li>
                        <li><strong>Szorzás:</strong> Elég egymás mellé írni (pl. <code>2x</code>) vagy használj <code>*</code> jelet.</li>
                        <li><strong>Támogatott műveletek:</strong> Egyszerűsítés (Simplify), Deriválás (Derive), Integrálás (Integrate), Zérushelyek (Zeroes), stb.</li>
                    </ul>
                </div>
            )
        },
        {
            id: 2,
            question: "Hogyan kaphatok Discord értesítést a vizsgáimról?",
            answer: (
                <p>
                    A Naptár oldalon minden feladatnál vagy vizsgánál beállíthatod, hogy kérsz-e értesítést a vizsga előtti napon, vagy aznap reggel. 
                    Ahhoz, hogy ez működjön, a <strong>Beállítások &gt; Discord Értesítések</strong> menüpontban meg kell adnod egy érvényes Discord Webhook URL-t, ami a saját szerveredre mutat.
                </p>
            )
        },
        {
            id: 3,
            question: "Bárki tölthet fel anyagot a Tudástárba?",
            answer: (
                <p>
                    Igen! A közösségi Tudástár lényege, hogy segítsük egymást. Viszont a minőségbiztosítás érdekében a feltöltött dokumentumok (PDF, Word, stb.) először egy várakozó listára kerülnek, és csak az <strong>Adminisztrátorok jóváhagyása után</strong> válnak mindenki számára elérhetővé.
                </p>
            )
        },
        {
            id: 4,
            question: "Mi célt szolgál a Fókusz Szoba?",
            answer: (
                <p>
                    A Fókusz Szoba egy produktivitást segítő felület, amely a <strong>Pomodoro-technikán</strong> alapul (alapértelmezetten 25 perc fókuszált munka, 5 perc szünet). 
                    Emellett egy beépített Lo-Fi rádió is segít a koncentrálásban, és egy gyorsjegyzetet is vezethetsz az asztalod elhagyása nélkül.
                </p>
            )
        },
        {
            id: 5,
            question: "A profil törlése valóban végleges?",
            answer: (
                <p className="text-red-700 dark:text-red-400 secret:text-[#1cf85d]">
                    <strong>Igen.</strong> A profil törlésekor a fiókodhoz tartozó összes naptárbejegyzés, gyorsjegyzet és beállítás azonnal és visszavonhatatlanul törlődik az adatbázisból. Kérjük, óvatosan használd ezt a funkciót!
                </p>
            )
        }
    ];

    return (
        <main className="w-full max-w-4xl mx-auto mt-6 pb-12 px-4 relative z-20">

            {/* --- Fejléc --- */}
            <div className="flex items-center space-x-3 mb-8 bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-md secret:shadow-[0_0_15px_rgba(28,248,93,0.3)] secret:rounded-none">
                <HelpCircle className="w-8 h-8 text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                <h1 className="text-3xl font-bold text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                    Súgó / GyIK
                </h1>
            </div>

            {/* --- Tartalom --- */}
            <div className="bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-md secret:rounded-none">
                
                <div className="flex items-center mb-6 border-b-2 border-gray-300 dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                    <MessageCircleQuestion className="w-6 h-6 mr-2 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />
                    <h2 className="text-2xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                        Gyakran Ismételt Kérdések
                    </h2>
                </div>

                <div className="space-y-4">
                    {faqData.map((item) => (
                        <div 
                            key={item.id} 
                            className="border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-transparent overflow-hidden transition-all duration-300 shadow-sm secret:rounded-none"
                        >
                            {/* --- Kérdés gomb --- */}
                            <button 
                                onClick={() => toggleFaq(item.id)}
                                className="w-full text-left p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 secret:hover:bg-[#1cf85d]/10 transition-colors cursor-pointer"
                            >
                                <span className={`font-bold text-lg pr-4 secret:font-mono ${openId === item.id ? 'text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]' : 'text-black dark:text-white secret:text-[#1cf85d]'}`}>
                                    {item.question}
                                </span>
                                {openId === item.id ? (
                                    <ChevronUp className="w-6 h-6 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] shrink-0" />
                                ) : (
                                    <ChevronDown className="w-6 h-6 text-gray-500 dark:text-gray-400 secret:text-[#1cf85d] shrink-0" />
                                )}
                            </button>

                            {/* --- Válasz panel --- */}
                            <div 
                                className={`transition-all duration-300 ease-in-out ${openId === item.id ? 'max-h-96 opacity-100 border-t-2 border-dashed border-gray-200 dark:border-gray-700 secret:border-[#1cf85d]' : 'max-h-0 opacity-0'}`}
                            >
                                <div className="p-4 text-gray-700 dark:text-gray-300 secret:text-[#1cf85d]/80 text-base leading-relaxed secret:font-mono">
                                    {item.answer}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </main>
    );
}