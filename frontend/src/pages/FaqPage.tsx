import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ChevronDown, ChevronUp, MessageCircleQuestion } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const FAQ_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const CALC_ID = 3;
const DANGER_ID = 10;

export default function FaqPage() {
    const { t } = useLanguage();
    const [openId, setOpenId] = useState<number | null>(1);

    const toggleFaq = (id: number) => {
        setOpenId(openId === id ? null : id);
    };

    const renderAnswer = (id: number) => {
        if (id === CALC_ID) {
            return (
                <div className="space-y-2">
                    <p>{t('faq.a3p')}</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>{t('faq.a3pow')}</strong> {t('faq.a3powText')}</li>
                        <li><strong>{t('faq.a3mul')}</strong> {t('faq.a3mulText')}</li>
                        <li><strong>{t('faq.a3ops')}</strong> {t('faq.a3opsText')}</li>
                    </ul>
                </div>
            );
        }

        return (
            <p className={id === DANGER_ID ? 'text-red-700 dark:text-red-400 secret:text-[#1cf85d]' : undefined}>
                {t(`faq.a${id}`)}
            </p>
        );
    };

    return (
        <main className="w-full max-w-4xl mx-auto mt-6 pb-12 px-4 relative z-20">

            {/* --- Fejléc --- */}
            <div className="flex items-center space-x-3 mb-8 bg-gradient-to-r from-cyan-400 to-fuchsia-500 dark:bg-gradient-to-r dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-[4px_4px_0px_#000] dark:shadow-md secret:shadow-[0_0_15px_rgba(28,248,93,0.3)] secret:rounded-none">
                <HelpCircle className="w-8 h-8 text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                <h1 className="text-3xl font-bold text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                    {t('faq.title')}
                </h1>
            </div>

            {/* --- Tartalom --- */}
            <div className="bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[8px_8px_0px_#d946ef] dark:shadow-md secret:rounded-none">

                <div className="flex items-center mb-4 border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                    <MessageCircleQuestion className="w-6 h-6 mr-2 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />
                    <h2 className="text-2xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                        {t('faq.heading')}
                    </h2>
                </div>

                <p className="mb-6 text-black dark:text-gray-300 secret:text-[#1cf85d]/80 font-medium secret:font-mono">
                    {t('faq.intro')}{' '}
                    <Link to="/otletlada" className="font-black text-fuchsia-600 dark:text-[#c084fc] secret:text-[#1cf85d] underline hover:text-black dark:hover:text-white">
                        {t('faq.introLink')}
                    </Link>
                </p>

                <div className="space-y-4">
                    {FAQ_IDS.map((id) => (
                        <div
                            key={id}
                            className="border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-transparent overflow-hidden transition-all duration-300 shadow-[4px_4px_0px_#000] dark:shadow-sm secret:shadow-none secret:rounded-none"
                        >
                            <button
                                onClick={() => toggleFaq(id)}
                                className="w-full text-left p-4 flex justify-between items-center hover:bg-cyan-400 dark:hover:bg-gray-800/50 secret:hover:bg-[#1cf85d]/10 transition-colors cursor-pointer"
                            >
                                <span className={`font-bold text-lg pr-4 secret:font-mono ${openId === id ? 'text-fuchsia-600 dark:text-[#c084fc] secret:text-[#1cf85d]' : 'text-black dark:text-white secret:text-[#1cf85d]'}`}>
                                    {t(`faq.q${id}`)}
                                </span>
                                {openId === id ? (
                                    <ChevronUp className="w-6 h-6 font-bold text-fuchsia-600 dark:text-[#c084fc] secret:text-[#1cf85d] shrink-0" />
                                ) : (
                                    <ChevronDown className="w-6 h-6 font-bold text-black dark:text-gray-400 secret:text-[#1cf85d] shrink-0" />
                                )}
                            </button>

                            <div
                                className={`transition-all duration-300 ease-in-out overflow-hidden ${openId === id ? 'max-h-[40rem] opacity-100 border-t-4 border-dashed border-black dark:border-gray-700 secret:border-[#1cf85d]' : 'max-h-0 opacity-0'}`}
                            >
                                <div className="p-4 text-black dark:text-gray-300 secret:text-[#1cf85d]/80 font-medium text-base leading-relaxed secret:font-mono">
                                    {renderAnswer(id)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </main>
    );
}
