import { useState } from 'react';
import { Link as LinkIcon, ExternalLink, GraduationCap, Monitor, BookOpen, Cpu, Globe } from 'lucide-react';

interface LinkItem {
    title: string;
    url: string;
}

interface LinkCategory {
    category: string;
    icon: React.ReactNode;
    links: LinkItem[];
}

export default function LinksPage() {
    const [activeTab, setActiveTab] = useState('DE');

    const universities = [
        { id: 'DE', name: 'Debreceni Egyetem (DE)' },
        { id: 'BME', name: 'Műegyetem (BME)' },
        { id: 'ELTE', name: 'Eötvös Loránd (ELTE)' },
        { id: 'SZTE', name: 'Szegedi Tudományegyetem (SZTE)' },
        { id: 'PTE', name: 'Pécsi Tudományegyetem (PTE)' },
        { id: 'NJE', name: 'Neumann János Egyetem (NJE)' },
        { id: 'NYE', name: 'Nyíregyházi Egyetem (NYE)' },
    ];

    const linkDatabase: Record<string, LinkCategory[]> = {
        'DE': [
            {
                category: "Alapvető Rendszerek",
                icon: <GraduationCap className="w-5 h-5 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: "Neptun Hallgatói Web", url: "https://neptun.unideb.hu/" },
                    { title: "E-learning (Moodle)", url: "https://elearning.unideb.hu/" },
                    { title: "DEENK - Egyetemi Könyvtár", url: "https://lib.unideb.hu/" },
                    { title: "Debreceni Egyetem Főoldal", url: "https://unideb.hu/" },
                ]
            },
            {
                category: "Informatikai Kar (IK)",
                icon: <Monitor className="w-5 h-5 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: "Informatikai Kar Főoldal", url: "https://inf.unideb.hu/" },
                    { title: "IK Órarendek", url: "https://inf.unideb.hu/hu/orarendek" },
                    { title: "IK Hallgatói Önkormányzat", url: "https://dehok.unideb.hu/ik/" },
                    { title: "Tantervi Hálók", url: "https://inf.unideb.hu/hu/tantervi-halok" },
                ]
            }
        ],
        'BME': [
            {
                category: "Alapvető Rendszerek",
                icon: <Globe className="w-5 h-5 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: "Neptun Hallgatói Web", url: "https://neptun.bme.hu/" },
                    { title: "BME Címtár", url: "https://login.bme.hu/" },
                    { title: "OMIKK Könyvtár", url: "https://www.omikk.bme.hu/" },
                    { title: "Központi Tanulmányi Hivatal (KTH)", url: "https://kth.bme.hu/" },
                ]
            },
            {
                category: "Villamosmérnöki és Info. Kar (VIK)",
                icon: <Cpu className="w-5 h-5 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: "VIK Főoldal", url: "https://vik.bme.hu/" },
                    { title: "VIK Wiki (Hallgatói)", url: "https://wiki.sch.bme.hu/" },
                    { title: "Schönherz Kollégium", url: "https://sch.bme.hu/" },
                    { title: "Moodle (VIK)", url: "https://edu.vik.bme.hu/" },
                ]
            }
        ],
        'ELTE': [
            {
                category: "Alapvető Rendszerek",
                icon: <BookOpen className="w-5 h-5 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: "Neptun Hallgatói Web", url: "https://neptun.elte.hu/" },
                    { title: "Canvas E-learning", url: "https://canvas.elte.hu/" },
                    { title: "ELTE Egyetemi Könyvtár", url: "https://konyvtar.elte.hu/" },
                    { title: "Questura Ügyfélszolgálat", url: "https://qter.elte.hu/" },
                ]
            },
            {
                category: "Informatikai Kar (IK)",
                icon: <Monitor className="w-5 h-5 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: "ELTE IK Főoldal", url: "https://www.inf.elte.hu/" },
                    { title: "IK Tanrendek", url: "https://www.inf.elte.hu/tanrendek" },
                    { title: "IK Hallgatói Önkormányzat", url: "https://elteikhok.hu/" },
                    { title: "IIG (Informatikai Igazgatóság)", url: "https://iig.elte.hu/" },
                ]
            }
        ],
        'SZTE': [
            {
                category: "Alapvető Rendszerek",
                icon: <GraduationCap className="w-5 h-5 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: "Neptun Hallgatói Web", url: "https://neptun.szte.hu/" },
                    { title: "CooSpace (E-learning)", url: "https://coospace.szte.hu/" },
                    { title: "Klebelsberg Könyvtár (TIK)", url: "http://www.ek.szte.hu/" },
                    { title: "SZTE Főoldal", url: "https://u-szeged.hu/" },
                ]
            },
            {
                category: "Természettudományi és Info. Kar",
                icon: <Cpu className="w-5 h-5 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: "TTIK Főoldal", url: "https://sci.u-szeged.hu/" },
                    { title: "Informatikai Intézet", url: "https://www.inf.u-szeged.hu/" },
                    { title: "Tanulmányi Osztály (TO)", url: "https://sci.u-szeged.hu/hallgatoknak/tanulmanyi-ugyek" },
                ]
            }
        ],
        'PTE': [
            {
                category: "Alapvető Rendszerek",
                icon: <Globe className="w-5 h-5 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: "Neptun Hallgatói Web", url: "https://neptun.pte.hu/" },
                    { title: "PTE Moodle / Teams", url: "https://pte.hu/hu/e-learning" },
                    { title: "PTE Egyetemi Könyvtár", url: "https://lib.pte.hu/" },
                    { title: "PTE Főoldal", url: "https://pte.hu/" },
                ]
            },
            {
                category: "Műszaki és Informatikai Kar (MIK)",
                icon: <Monitor className="w-5 h-5 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: "MIK Főoldal", url: "https://mik.pte.hu/" },
                    { title: "MIK Hallgatói Önkormányzat", url: "https://mik.pte.hu/hallgatoi-onkormanyzat" },
                    { title: "Tanulmányi Osztály", url: "https://mik.pte.hu/tanulmanyi-osztaly" },
                ]
            }
        ],
        'NJE': [
            {
                category: "Alapvető Rendszerek",
                icon: <Globe className="w-5 h-5 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: "Neptun Hallgatói Web", url: "https://neptun.nje.hu/" },
                    { title: "NJE E-learning (Moodle)", url: "https://elearning.nje.hu/" },
                    { title: "NJE Könyvtár és Tudásközpont", url: "https://konyvtar.nje.hu/" },
                    { title: "NJE Főoldal", url: "https://nje.hu/" },
                ]
            },
            {
                category: "GAMF Műszaki és Info. Kar",
                icon: <Monitor className="w-5 h-5 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: "GAMF Főoldal", url: "https://gamf.nje.hu/" },
                    { title: "Hallgatói Önkormányzat", url: "https://hok.nje.hu/" },
                    { title: "Tanulmányi Osztály", url: "https://gamf.nje.hu/tanulmanyi-osztaly" },
                ]
            }
        ],
        'NYE': [
            {
                category: "Alapvető Rendszerek",
                icon: <GraduationCap className="w-5 h-5 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: "Neptun Hallgatói Web", url: "https://neptun.nye.hu/" },
                    { title: "NYE E-learning (Moodle)", url: "https://elearning.nye.hu/" },
                    { title: "Központi Könyvtár", url: "https://konyvtar.nye.hu/" },
                    { title: "NYE Főoldal", url: "https://nye.hu/" },
                ]
            },
            {
                category: "Informatika és Matematika",
                icon: <Cpu className="w-5 h-5 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: "Intézeti Főoldal", url: "https://nye.hu/matematika_informatika" },
                    { title: "Órarendek", url: "https://nye.hu/orarendek" },
                    { title: "Hallgatói Önkormányzat", url: "https://hok.nye.hu/" },
                ]
            }
        ]
    };

    const activeLinks = linkDatabase[activeTab] || [];

    return (
        <main className="w-full max-w-6xl mx-auto mt-6 pb-12 px-4 relative z-20">

            {/* --- Fejléc --- */}
            <div className="flex items-center space-x-3 mb-8 bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-md secret:shadow-[0_0_15px_rgba(28,248,93,0.3)] secret:rounded-none">
                <LinkIcon className="w-8 h-8 text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                <h1 className="text-3xl font-bold text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                    Egyetemi Linkek
                </h1>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">

                {/* --- Bal Oldal: Egyetemek Tabs --- */}
                <div className="w-full lg:w-1/4 flex flex-col space-y-2">
                    {universities.map(uni => (
                        <button
                            key={uni.id}
                            onClick={() => setActiveTab(uni.id)}
                            className={`p-4 font-bold text-left border-2 transition-all duration-300 shadow-sm secret:font-mono uppercase cursor-pointer
                                ${activeTab === uni.id
                                    ? 'bg-[#800000] dark:bg-[#a855f7] secret:bg-[#1cf85d] text-white secret:text-black border-black dark:border-transparent secret:border-[#1cf85d] translate-x-2'
                                    : 'bg-white dark:bg-[#121212] secret:bg-transparent text-gray-700 dark:text-gray-300 secret:text-[#1cf85d] border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] hover:bg-gray-50 dark:hover:bg-gray-800 secret:hover:bg-[#1cf85d]/10'
                                }`}
                        >
                            {uni.name}
                        </button>
                    ))}
                </div>

                {/* --- Jobb Oldal: Linkek Kategóriánként --- */}
                <div className="w-full lg:w-3/4 flex flex-col space-y-6">
                    {activeLinks.map((section, idx) => (
                        <div key={idx} className="bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-md secret:rounded-none">
                            <div className="flex items-center mb-4 border-b-2 border-gray-300 dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                                {section.icon}
                                <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase ml-2">
                                    {section.category}
                                </h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {section.links.map((link, linkIdx) => (
                                    <a
                                        key={linkIdx}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center p-3 bg-white dark:bg-[#121212] secret:bg-transparent border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] hover:border-[#800000] dark:hover:border-[#a855f7] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-colors group shadow-sm secret:font-mono font-medium"
                                    >
                                        <ExternalLink className="w-4 h-4 mr-3 text-gray-400 group-hover:text-[#800000] dark:group-hover:text-[#a855f7] secret:group-hover:text-black transition-colors shrink-0" />
                                        <span className="truncate">{link.title}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </main>
    );
}