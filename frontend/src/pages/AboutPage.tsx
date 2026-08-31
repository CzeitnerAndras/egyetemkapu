import { Info, Code, Database, Layout, User, CheckCircle, GraduationCap } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const FEATURE_KEYS = [
    'about.f1', 'about.f2', 'about.f3', 'about.f4', 'about.f5',
    'about.f6', 'about.f7', 'about.f8', 'about.f9',
] as const;

const FRONTEND_TECH = ['React', 'TypeScript', 'Vite', 'Tailwind CSS'];
const BACKEND_TECH = ['Java', 'Spring Boot', 'PostgreSQL', 'JWT', 'Docker', 'Caddy'];

export default function AboutPage() {
    const { t } = useLanguage();

    return (
        <main className="w-full max-w-5xl mx-auto mt-6 pb-12 px-4 relative z-20">

            {/* --- Fejléc --- */}
            <div className="flex items-center space-x-3 mb-8 bg-gradient-to-r from-cyan-400 to-fuchsia-500 dark:bg-gradient-to-r dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-[4px_4px_0px_#000] dark:shadow-md secret:shadow-[0_0_15px_rgba(28,248,93,0.3)] secret:rounded-none">
                <Info className="w-8 h-8 text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                <h1 className="text-3xl font-bold text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                    {t('about.title')}
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* --- BAL FELSŐ--- */}
                <section className="lg:col-span-2 flex flex-col bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[8px_8px_0px_#d946ef] dark:shadow-md secret:rounded-none transition-all hover:-translate-y-1 hover:shadow-[10px_10px_0px_#d946ef] dark:hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                    <div className="flex items-center mb-4 border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                        <GraduationCap className="w-6 h-6 mr-2 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />
                        <h2 className="text-2xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">{t('about.what')}</h2>
                    </div>
                    <div className="text-black dark:text-gray-300 secret:text-[#1cf85d]/80 font-medium text-lg leading-relaxed secret:font-mono flex-1 space-y-4">
                        <p>{t('about.whatText')}</p>
                        <p>{t('about.whatText2')}</p>
                    </div>
                </section>

                {/* --- JOBB FELSŐ --- */}
                <section className="lg:col-span-1 flex flex-col bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[8px_8px_0px_#06b6d4] dark:shadow-md secret:rounded-none transition-all hover:-translate-y-1 hover:shadow-[10px_10px_0px_#06b6d4] dark:hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                    <div className="flex items-center mb-4 border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                        <User className="w-6 h-6 mr-2 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />
                        <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">{t('about.dev')}</h2>
                    </div>
                    <div className="text-center flex flex-col flex-1 justify-center">
                        <p className="text-xl font-black text-fuchsia-600 dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 secret:font-mono uppercase">Czeitner András</p>
                        <p className="text-sm font-bold text-black dark:text-gray-400 secret:text-[#1cf85d]/70 secret:font-mono uppercase">{t('about.devRole')}</p>
                        <p className="mt-4 text-sm font-medium text-black dark:text-gray-300 secret:text-[#1cf85d]/80 secret:font-mono leading-relaxed">
                            {t('about.devText')}
                        </p>
                    </div>
                </section>

                {/* --- BAL ALSÓ --- */}
                <section className="lg:col-span-2 flex flex-col bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[8px_8px_0px_#06b6d4] dark:shadow-md secret:rounded-none transition-all hover:-translate-y-1 hover:shadow-[10px_10px_0px_#06b6d4] dark:hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                    <div className="flex items-center mb-4 border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                        <CheckCircle className="w-6 h-6 mr-2 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />
                        <h2 className="text-2xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">{t('about.features')}</h2>
                    </div>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-black dark:text-gray-300 secret:text-[#1cf85d]/80 font-bold secret:font-mono flex-1">
                        {FEATURE_KEYS.map((key) => (
                            <li key={key} className="flex items-start">
                                <span className="text-cyan-600 dark:text-[#c084fc] secret:text-[#1cf85d] mr-2 font-black">&gt;</span> {t(key)}
                            </li>
                        ))}
                    </ul>
                </section>

                {/* --- JOBB ALSÓ --- */}
                <section className="lg:col-span-1 flex flex-col bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[8px_8px_0px_#d946ef] dark:shadow-md secret:rounded-none transition-all hover:-translate-y-1 hover:shadow-[10px_10px_0px_#d946ef] dark:hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                    <div className="flex items-center mb-4 border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                        <Code className="w-6 h-6 mr-2 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />
                        <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">{t('about.stack')}</h2>
                    </div>

                    <div className="space-y-4 flex-1 flex flex-col justify-center">
                        <div>
                            <h3 className="flex items-center text-sm font-bold text-black dark:text-gray-400 secret:text-[#1cf85d]/60 mb-2 secret:font-mono uppercase">
                                <Layout className="w-4 h-4 mr-1 font-bold" /> {t('about.frontend')}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {FRONTEND_TECH.map(tech => (
                                    <span key={tech} className="bg-cyan-400 dark:bg-[#121212] secret:bg-transparent border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] text-xs font-bold px-2 py-1 secret:font-mono shadow-[2px_2px_0px_#000] dark:shadow-sm">
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2">
                            <h3 className="flex items-center text-sm font-bold text-black dark:text-gray-400 secret:text-[#1cf85d]/60 mb-2 secret:font-mono uppercase">
                                <Database className="w-4 h-4 mr-1 font-bold" /> {t('about.backendDb')}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {BACKEND_TECH.map(tech => (
                                    <span key={tech} className="bg-fuchsia-400 dark:bg-[#121212] secret:bg-transparent border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] text-xs font-bold px-2 py-1 secret:font-mono shadow-[2px_2px_0px_#000] dark:shadow-sm">
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