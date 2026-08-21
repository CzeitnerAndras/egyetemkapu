import { Info, Code, Database, Layout, User, CheckCircle, GraduationCap } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function AboutPage() {
    const { t } = useLanguage();

    return (
        <main className="w-full max-w-5xl mx-auto mt-6 pb-12 px-4 relative z-20">

            {/* --- Fejléc --- */}
            <div className="flex items-center space-x-3 mb-8 bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-md secret:shadow-[0_0_15px_rgba(28,248,93,0.3)] secret:rounded-none">
                <Info className="w-8 h-8 text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                <h1 className="text-3xl font-bold text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                    {t('about.title')}
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* --- BAL FELSŐ--- */}
                <section className="lg:col-span-2 flex flex-col bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-md secret:rounded-none transition-all">
                    <div className="flex items-center mb-4 border-b-2 border-gray-300 dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                        <GraduationCap className="w-6 h-6 mr-2 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />
                        <h2 className="text-2xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">{t('about.what')}</h2>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 secret:text-[#1cf85d]/80 text-lg leading-relaxed secret:font-mono flex-1">
                        {t('about.whatText')}
                    </p>
                </section>

                {/* --- JOBB FELSŐ --- */}
                <section className="lg:col-span-1 flex flex-col bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-md secret:rounded-none transition-all">
                    <div className="flex items-center mb-4 border-b-2 border-gray-300 dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                        <User className="w-6 h-6 mr-2 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />
                        <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">{t('about.dev')}</h2>
                    </div>
                    <div className="text-center flex flex-col flex-1 justify-center">
                        <p className="text-xl font-black text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 secret:font-mono uppercase">Czeitner András</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 secret:text-[#1cf85d]/70 secret:font-mono uppercase">{t('about.devRole')}</p>
                        <p className="mt-4 text-sm text-gray-700 dark:text-gray-300 secret:text-[#1cf85d]/80 secret:font-mono font-medium">
                            {t('about.devText')}
                        </p>
                    </div>
                </section>

                {/* --- BAL ALSÓ --- */}
                <section className="lg:col-span-2 flex flex-col bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-md secret:rounded-none transition-all">
                    <div className="flex items-center mb-4 border-b-2 border-gray-300 dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                        <CheckCircle className="w-6 h-6 mr-2 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />
                        <h2 className="text-2xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">{t('about.features')}</h2>
                    </div>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-300 secret:text-[#1cf85d]/80 font-medium secret:font-mono flex-1">
                        <li className="flex items-start">
                            <span className="text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mr-2 font-bold">&gt;</span> {t('about.f1')}
                        </li>
                        <li className="flex items-start">
                            <span className="text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mr-2 font-bold">&gt;</span> {t('about.f2')}
                        </li>
                        <li className="flex items-start">
                            <span className="text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mr-2 font-bold">&gt;</span> {t('about.f3')}
                        </li>
                        <li className="flex items-start">
                            <span className="text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mr-2 font-bold">&gt;</span> {t('about.f4')}
                        </li>
                        <li className="flex items-start">
                            <span className="text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mr-2 font-bold">&gt;</span> {t('about.f5')}
                        </li>
                        <li className="flex items-start">
                            <span className="text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mr-2 font-bold">&gt;</span> {t('about.f6')}
                        </li>
                        <li className="flex items-start">
                            <span className="text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mr-2 font-bold">&gt;</span> {t('about.f7')}
                        </li>
                        <li className="flex items-start">
                            <span className="text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mr-2 font-bold">&gt;</span> {t('about.f8')}
                        </li>
                    </ul>
                </section>

                {/* --- JOBB ALSÓ --- */}
                <section className="lg:col-span-1 flex flex-col bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-md secret:rounded-none transition-all">
                    <div className="flex items-center mb-4 border-b-2 border-gray-300 dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                        <Code className="w-6 h-6 mr-2 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />
                        <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">Tech Stack</h2>
                    </div>

                    <div className="space-y-4 flex-1 flex flex-col justify-center">
                        <div>
                            <h3 className="flex items-center text-sm font-bold text-gray-500 dark:text-gray-400 secret:text-[#1cf85d]/60 mb-2 secret:font-mono uppercase">
                                <Layout className="w-4 h-4 mr-1" /> Frontend
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {['React', 'TypeScript', 'TailwindCSS', 'React Router', 'Lucide Icons'].map(tech => (
                                    <span key={tech} className="bg-white dark:bg-[#121212] secret:bg-transparent border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] text-xs font-bold px-2 py-1 secret:font-mono shadow-sm">
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2">
                            <h3 className="flex items-center text-sm font-bold text-gray-500 dark:text-gray-400 secret:text-[#1cf85d]/60 mb-2 secret:font-mono uppercase">
                                <Database className="w-4 h-4 mr-1" /> {t('about.backendDb')}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {['Java', 'Spring Boot', 'REST API', 'PostgreSQL', 'JWT Auth'].map(tech => (
                                    <span key={tech} className="bg-white dark:bg-[#121212] secret:bg-transparent border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] text-xs font-bold px-2 py-1 secret:font-mono shadow-sm">
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </main>
    );
}