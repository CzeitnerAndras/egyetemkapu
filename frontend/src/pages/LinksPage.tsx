import { useState } from 'react';
import {
    Link as LinkIcon, ExternalLink, GraduationCap, Monitor, BookOpen,
    Cpu, Globe, Briefcase, Landmark, Stethoscope, Heart, Smile,
    Users, FlaskConical, Leaf, Wrench, Music
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

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
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState('DE');
    const isEn = language === 'en';
    const l = (hu: string, en: string) => isEn ? en : hu;

    const universities = [
        { id: 'DE', name: l('Debreceni Egyetem (DE)', 'University of Debrecen (DE)') },
        { id: 'BME', name: l('Műegyetem (BME)', 'Budapest Univ. of Technology (BME)') },
        { id: 'ELTE', name: l('Eötvös Loránd (ELTE)', 'Eötvös Loránd University (ELTE)') },
        { id: 'SZTE', name: l('Szegedi Tudományegyetem (SZTE)', 'University of Szeged (SZTE)') },
        { id: 'PTE', name: l('Pécsi Tudományegyetem (PTE)', 'University of Pécs (PTE)') },
        { id: 'NJE', name: l('Neumann János Egyetem (NJE)', 'John von Neumann University (NJE)') },
        { id: 'NYE', name: l('Nyíregyházi Egyetem (NYE)', 'University of Nyíregyháza (NYE)') },
        { id: 'OE', name: l('Óbudai Egyetem (ÓE)', 'Óbuda University (ÓE)') },
        { id: 'BCE', name: l('Budapesti Corvinus (BCE)', 'Corvinus University (BCE)') },
        { id: 'ME', name: l('Miskolci Egyetem (ME)', 'University of Miskolc (ME)') },
        { id: 'SZE', name: l('Széchenyi István Egyetem (SZE)', 'Széchenyi István University (SZE)') },
    ];

    const linkDatabase: Record<string, LinkCategory[]> = {
        'DE': [
            {
                category: l("Alapvető Rendszerek", "Core Systems"),
                icon: <GraduationCap className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("Neptun Hallgatói Web", "Neptun Student Web"), url: "https://neptun.unideb.hu/" },
                    { title: l("E-learning (Moodle)", "E-learning (Moodle)"), url: "https://elearning.unideb.hu/" },
                    { title: l("DEENK - Egyetemi Könyvtár", "DEENK - University Library"), url: "https://lib.unideb.hu/" },
                    { title: l("Debreceni Egyetem Főoldal", "University Main Page"), url: "https://unideb.hu/" },
                    { title: l("DEHÖK (Hallgatói Önkormányzat)", "DEHÖK (Student Union)"), url: "https://dehok.unideb.hu/" },
                ]
            },
            {
                category: l("Informatikai Kar (IK)", "Faculty of Informatics (IK)"),
                icon: <Monitor className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("Informatikai Kar Főoldal", "Faculty Main Page"), url: "https://inf.unideb.hu/" },
                    { title: l("Záróvizsga", "Final Examination"), url: "https://inf.unideb.hu/informaciok-zarovizsgazoknak" },
                    { title: l("Képzések / Tantervi Háló", "Programs / Curricula"), url: "https://inf.unideb.hu/2025-szeptembertol-meghirdetett-kepzeseink" },
                    { title: l("Syllabus", "Syllabus"), url: "https://www.ik.unideb.hu/syllabi/" },
                ]
            },
            {
                category: l("Állam- és Jogtudományi Kar (ÁJK)", "Faculty of Law (ÁJK)"),
                icon: <Landmark className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("ÁJK Főoldal", "Faculty Main Page"), url: "https://jog.unideb.hu/" },
                    { title: l("Tanulmányi Osztály", "Registrar's Office"), url: "https://jog.unideb.hu/tanulmanyi-osztaly" },
                ]
            },
            {
                category: l("Általános Orvostudományi Kar (ÁOK)", "Faculty of Medicine (ÁOK)"),
                icon: <Stethoscope className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("ÁOK Főoldal", "Faculty Main Page"), url: "https://aok.unideb.hu/" },
                    { title: l("Tanulmányi Osztály", "Registrar's Office"), url: "https://aok.unideb.hu/hu/tanulmanyi-osztaly" },
                ]
            },
            {
                category: l("Bölcsészettudományi Kar (BTK)", "Faculty of Humanities (BTK)"),
                icon: <BookOpen className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("BTK Főoldal", "Faculty Main Page"), url: "https://btk.unideb.hu/" },
                    { title: l("Tanulmányi Osztály", "Registrar's Office"), url: "https://btk.unideb.hu/tanulmanyi-osztaly" },
                ]
            },
            {
                category: l("Egészségtudományi Kar (ETK)", "Faculty of Health Sciences (ETK)"),
                icon: <Heart className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("ETK Főoldal", "Faculty Main Page"), url: "https://etk.unideb.hu/" },
                    { title: l("Tanulmányi Osztály", "Registrar's Office"), url: "https://etk.unideb.hu/tanulmanyi-osztaly" },
                ]
            },
            {
                category: l("Fogorvostudományi Kar (FOK)", "Faculty of Dentistry (FOK)"),
                icon: <Smile className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("FOK Főoldal", "Faculty Main Page"), url: "https://dental.unideb.hu/" },
                    { title: l("Tanulmányi Osztály", "Registrar's Office"), url: "https://dental.unideb.hu/tanulmanyi-osztaly" },
                ]
            },
            {
                category: l("Gazdaságtudományi Kar (GTK)", "Faculty of Economics (GTK)"),
                icon: <Briefcase className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("GTK Főoldal", "Faculty Main Page"), url: "https://econ.unideb.hu/" },
                    { title: l("Tanulmányi és Oktatási Oszt.", "Dept. of Studies and Education"), url: "https://econ.unideb.hu/tanulmanyi-es-oktatasi-osztaly" },
                ]
            },
            {
                category: l("Gyermeknevelési és Gyógypedagógiai Kar", "Faculty of Child and Adult Education"),
                icon: <Users className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("GYGYK Főoldal", "Faculty Main Page"), url: "https://gygyk.unideb.hu/" },
                    { title: l("Tanulmányi Osztály", "Registrar's Office"), url: "https://gygyk.unideb.hu/tanulmanyi-osztaly" },
                ]
            },
            {
                category: l("Gyógyszerésztudományi Kar (GYTK)", "Faculty of Pharmacy (GYTK)"),
                icon: <FlaskConical className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("GYTK Főoldal", "Faculty Main Page"), url: "https://pharm.unideb.hu/" },
                    { title: l("Tanulmányi Osztály", "Registrar's Office"), url: "https://pharm.unideb.hu/tanulmanyi-osztaly" },
                ]
            },
            {
                category: l("Mezőgazdaság-, Élelmiszertudományi Kar", "Faculty of Agricultural and Food Sciences"),
                icon: <Leaf className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("MÉK Főoldal", "Faculty Main Page"), url: "https://mek.unideb.hu/" },
                    { title: l("Tanulmányi Osztály", "Registrar's Office"), url: "https://mek.unideb.hu/tanulmanyi-osztaly" },
                ]
            },
            {
                category: l("Műszaki Kar (MK)", "Faculty of Engineering (MK)"),
                icon: <Wrench className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("MK Főoldal", "Faculty Main Page"), url: "https://eng.unideb.hu/" },
                    { title: l("Tanulmányi Osztály", "Registrar's Office"), url: "https://eng.unideb.hu/tanulmanyi-osztaly" },
                ]
            },
            {
                category: l("Természettudományi és Technológiai Kar", "Faculty of Science and Technology"),
                icon: <Globe className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("TTK Főoldal", "Faculty Main Page"), url: "https://ttk.unideb.hu/" },
                    { title: l("Tanulmányi Osztály", "Registrar's Office"), url: "https://ttk.unideb.hu/tanulmanyi-osztaly" },
                ]
            },
            {
                category: l("Zeneművészeti Kar (ZK)", "Faculty of Music (ZK)"),
                icon: <Music className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("ZK Főoldal", "Faculty Main Page"), url: "https://music.unideb.hu/" },
                    { title: l("Tanulmányi Osztály", "Registrar's Office"), url: "https://music.unideb.hu/tanulmanyi-osztaly" },
                ]
            }
        ],
        'BME': [
            {
                category: l("Alapvető Rendszerek", "Core Systems"),
                icon: <Globe className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("Neptun Hallgatói Web", "Neptun Student Web"), url: "https://neptun.bme.hu/" },
                    { title: l("BME Címtár", "BME Directory"), url: "https://login.bme.hu/" },
                    { title: l("OMIKK Könyvtár", "OMIKK Library"), url: "https://www.omikk.bme.hu/" },
                    { title: l("Központi Tanulmányi Hivatal (KTH)", "Central Registrar's Office (KTH)"), url: "https://kth.bme.hu/" },
                ]
            },
            {
                category: l("Villamosmérnöki és Info. Kar (VIK)", "Faculty of Electrical Eng. and Informatics (VIK)"),
                icon: <Cpu className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("VIK Főoldal", "Faculty Main Page"), url: "https://vik.bme.hu/" },
                    { title: l("VIK Wiki (Hallgatói)", "VIK Wiki (Student)"), url: "https://wiki.sch.bme.hu/" },
                    { title: l("Schönherz Kollégium", "Schönherz Dormitory"), url: "https://sch.bme.hu/" },
                    { title: l("Moodle (VIK)", "Moodle (VIK)"), url: "https://edu.vik.bme.hu/" },
                ]
            },
            {
                category: l("Építészmérnöki Kar (ÉPK)", "Faculty of Architecture (ÉPK)"),
                icon: <Landmark className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("ÉPK Főoldal", "Faculty Main Page"), url: "https://epitesz.bme.hu/" },
                    { title: l("Építész HÖK", "Architecture Student Union"), url: "https://epiteszhk.bme.hu/" },
                    { title: l("Kari Szabályzatok", "Faculty Regulations"), url: "https://epitesz.bme.hu/szabalyzatok" },
                ]
            }
        ],
        'ELTE': [
            {
                category: l("Alapvető Rendszerek", "Core Systems"),
                icon: <BookOpen className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("Neptun Hallgatói Web", "Neptun Student Web"), url: "https://neptun.elte.hu/" },
                    { title: l("Canvas E-learning", "Canvas E-learning"), url: "https://canvas.elte.hu/" },
                    { title: l("ELTE Egyetemi Könyvtár", "ELTE University Library"), url: "https://konyvtar.elte.hu/" },
                    { title: l("Questura Ügyfélszolgálat", "Questura Customer Service"), url: "https://qter.elte.hu/" },
                ]
            },
            {
                category: l("Informatikai Kar (IK)", "Faculty of Informatics (IK)"),
                icon: <Monitor className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("ELTE IK Főoldal", "Faculty Main Page"), url: "https://www.inf.elte.hu/" },
                    { title: l("IK Tanrendek", "IK Curricula"), url: "https://www.inf.elte.hu/tanrendek" },
                    { title: l("IIG (Informatikai Igazgatóság)", "IIG (Directorate of Informatics)"), url: "https://iig.elte.hu/" },
                ]
            },
            {
                category: l("Bölcsészettudományi Kar (BTK)", "Faculty of Humanities (BTK)"),
                icon: <BookOpen className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("ELTE BTK Főoldal", "Faculty Main Page"), url: "https://www.btk.elte.hu/" },
                    { title: l("BTK Tanulmányi Hivatal", "BTK Office of Educational Affairs"), url: "https://www.btk.elte.hu/tanulmanyi-hivatal" },
                    { title: l("BTK HÖK", "BTK Student Union"), url: "https://btkhok.elte.hu/" },
                ]
            }
        ],
        'SZTE': [
            {
                category: l("Alapvető Rendszerek", "Core Systems"),
                icon: <GraduationCap className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("Neptun Hallgatói Web", "Neptun Student Web"), url: "https://neptun.szte.hu/" },
                    { title: l("CooSpace (E-learning)", "CooSpace (E-learning)"), url: "https://coospace.u-szeged.hu/" },
                    { title: l("Klebelsberg Könyvtár (TIK)", "Klebelsberg Library (TIK)"), url: "http://www.ek.szte.hu/" },
                    { title: l("SZTE Főoldal", "University Main Page"), url: "https://u-szeged.hu/" },
                ]
            },
            {
                category: l("Természettudományi és Info. Kar", "Faculty of Science and Informatics"),
                icon: <Cpu className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("TTIK Főoldal", "Faculty Main Page"), url: "https://sci.u-szeged.hu/" },
                    { title: l("Informatikai Intézet", "Institute of Informatics"), url: "https://www.inf.u-szeged.hu/" },
                    { title: l("Tanulmányi Osztály (TO)", "Registrar's Office (TO)"), url: "https://sci.u-szeged.hu/hallgatoknak/tanulmanyi-ugyek" },
                ]
            },
            {
                category: l("Általános Orvostudományi Kar (ÁOK)", "Faculty of Medicine (ÁOK)"),
                icon: <Stethoscope className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("SZTE ÁOK Főoldal", "Faculty Main Page"), url: "https://med.u-szeged.hu/" },
                    { title: l("ÁOK Tanulmányi Osztály", "Registrar's Office"), url: "https://med.u-szeged.hu/hallgatoknak" },
                    { title: l("Szegedi Orvostanhallgatók Egyesülete", "Szeged Medical Students' Assoc."), url: "https://szoe.hu/" },
                ]
            }
        ],
        'PTE': [
            {
                category: l("Alapvető Rendszerek", "Core Systems"),
                icon: <Globe className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("Neptun Hallgatói Web", "Neptun Student Web"), url: "https://neptun.pte.hu/" },
                    { title: l("PTE Moodle / Teams", "PTE Moodle / Teams"), url: "https://elearning.pte.hu/" },
                    { title: l("PTE Egyetemi Könyvtár", "PTE University Library"), url: "https://lib.pte.hu/" },
                    { title: l("PTE Főoldal", "University Main Page"), url: "https://pte.hu/" },
                ]
            },
            {
                category: l("Műszaki és Informatikai Kar (MIK)", "Faculty of Engineering and IT (MIK)"),
                icon: <Monitor className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("MIK Főoldal", "Faculty Main Page"), url: "https://mik.pte.hu/" },
                    { title: l("MIK HÖK", "MIK Student Union"), url: "https://mik.pte.hu/hallgatoknak" },
                    { title: l("Tanulmányi Osztály", "Registrar's Office"), url: "https://mik.pte.hu/oktatas" },
                ]
            },
            {
                category: l("Közgazdaságtudományi Kar (KTK)", "Faculty of Business and Economics (KTK)"),
                icon: <Briefcase className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("KTK Főoldal", "Faculty Main Page"), url: "https://ktk.pte.hu/" },
                    { title: l("KTK Tanulmányi Információk", "KTK Study Information"), url: "https://ktk.pte.hu/hu/hallgatoknak" },
                    { title: l("PTE KTK HÖK", "PTE KTK Student Union"), url: "https://ktk.pte.hu/hu/hallgatoi-elet" },
                ]
            }
        ],
        'NJE': [
            {
                category: l("Alapvető Rendszerek", "Core Systems"),
                icon: <Globe className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("Neptun Hallgatói Web", "Neptun Student Web"), url: "https://neptun.nje.hu/" },
                    { title: l("NJE E-learning (Moodle)", "NJE E-learning (Moodle)"), url: "https://elearning.nje.hu/" },
                    { title: l("NJE Könyvtár", "NJE Library"), url: "https://konyvtar.nje.hu/" },
                    { title: l("NJE Főoldal", "University Main Page"), url: "https://nje.hu/" },
                ]
            },
            {
                category: l("GAMF Műszaki és Info. Kar", "GAMF Faculty of Engineering and IT"),
                icon: <Monitor className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("GAMF Főoldal", "Faculty Main Page"), url: "https://gamf.nje.hu/" },
                    { title: l("Tanulmányi Osztály", "Registrar's Office"), url: "https://gamf.nje.hu/tanulmanyi-osztaly" },
                ]
            },
            {
                category: l("Gazdaságtudományi Kar (GTK)", "Faculty of Economics (GTK)"),
                icon: <Briefcase className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("GTK Főoldal", "Faculty Main Page"), url: "https://gtk.nje.hu/" },
                    { title: l("Hallgatói Információk", "Student Information"), url: "https://gtk.nje.hu/hallgatoknak" },
                ]
            }
        ],
        'NYE': [
            {
                category: l("Alapvető Rendszerek", "Core Systems"),
                icon: <GraduationCap className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("Neptun Hallgatói Web", "Neptun Student Web"), url: "https://neptun.nye.hu/" },
                    { title: l("NYE E-learning", "NYE E-learning"), url: "https://elearning.nye.hu/" },
                    { title: l("Központi Könyvtár", "Central Library"), url: "https://konyvtar.nye.hu/" },
                ]
            },
            {
                category: l("Informatika és Matematika", "Institute of Math and Informatics"),
                icon: <Cpu className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("Intézeti Főoldal", "Institute Main Page"), url: "https://nye.hu/matematika_informatika" },
                    { title: l("Órarendek", "Timetables"), url: "https://nye.hu/orarendek" },
                ]
            },
            {
                category: l("Gazdálkodástudományi Intézet", "Institute of Business Administration"),
                icon: <Briefcase className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("Intézeti Főoldal", "Institute Main Page"), url: "https://nye.hu/gazdalkodastudomany" },
                    { title: l("Oktatói Elérhetőségek", "Instructors' Contacts"), url: "https://nye.hu/gazdalkodastudomany/oktatok" },
                ]
            }
        ],
        'OE': [
            {
                category: l("Alapvető Rendszerek", "Core Systems"),
                icon: <Globe className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("Neptun Hallgatói Web", "Neptun Student Web"), url: "https://neptun.uni-obuda.hu/" },
                    { title: l("E-learning (Moodle)", "E-learning (Moodle)"), url: "https://elearning.uni-obuda.hu/" },
                    { title: l("Óbudai Egyetem Főoldal", "University Main Page"), url: "https://uni-obuda.hu/" },
                ]
            },
            {
                category: l("Neumann János Info. Kar (NIK)", "John von Neumann Faculty of Informatics (NIK)"),
                icon: <Monitor className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("NIK Főoldal", "Faculty Main Page"), url: "https://nik.uni-obuda.hu/" },
                    { title: l("NIK Tanulmányi Osztály", "NIK Registrar's Office"), url: "https://nik.uni-obuda.hu/tanulmanyi-osztaly/" },
                    { title: l("ÓE NIK HÖK", "ÓE NIK Student Union"), url: "https://nikhok.hu/" },
                ]
            },
            {
                category: l("Kandó Kálmán Villamosmérnöki (KVK)", "Kandó Kálmán Faculty of Electrical Engineering (KVK)"),
                icon: <Cpu className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("KVK Főoldal", "Faculty Main Page"), url: "https://kvk.uni-obuda.hu/" },
                    { title: l("KVK HÖK", "KVK Student Union"), url: "https://kvkhok.hu/" },
                ]
            }
        ],
        'BCE': [
            {
                category: l("Alapvető Rendszerek", "Core Systems"),
                icon: <Landmark className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("Neptun Hallgatói Web", "Neptun Student Web"), url: "https://neptun.uni-corvinus.hu/" },
                    { title: l("Moodle (E-learning)", "Moodle (E-learning)"), url: "https://moodle.uni-corvinus.hu/" },
                    { title: l("Egyetemi Könyvtár", "University Library"), url: "https://www.lib.uni-corvinus.hu/" },
                    { title: l("Corvinus Főoldal", "University Main Page"), url: "https://www.uni-corvinus.hu/" },
                ]
            },
            {
                category: l("Hallgatói Szolgáltatások", "Student Services"),
                icon: <Briefcase className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("Hallgatói Támogatás (Hub)", "Student Support (Hub)"), url: "https://www.uni-corvinus.hu/fooldal/hallgatoknak/hallgatoi-ugyek/" },
                    { title: l("Corvinus HÖK", "Corvinus Student Union"), url: "https://corvinushok.hu/" },
                    { title: l("Karrier Iroda", "Career Office"), url: "https://www.uni-corvinus.hu/fooldal/hallgatoknak/karrier/" },
                ]
            }
        ],
        'ME': [
            {
                category: l("Alapvető Rendszerek", "Core Systems"),
                icon: <GraduationCap className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("Neptun Hallgatói Web", "Neptun Student Web"), url: "https://neptun.uni-miskolc.hu/" },
                    { title: l("E-learning (Moodle)", "E-learning (Moodle)"), url: "https://elearning.uni-miskolc.hu/" },
                    { title: l("Miskolci Egyetem Főoldal", "University Main Page"), url: "https://www.uni-miskolc.hu/" },
                ]
            },
            {
                category: l("Gépészmérnöki és Info. Kar (GÉIK)", "Faculty of Mechanical Eng. and Informatics (GÉIK)"),
                icon: <Cpu className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("GÉIK Főoldal", "Faculty Main Page"), url: "https://geik.uni-miskolc.hu/" },
                    { title: l("GÉIK Tanulmányi Hivatal", "GÉIK Office of Educational Affairs"), url: "https://geik.uni-miskolc.hu/tanulmanyi" },
                ]
            },
            {
                category: l("Állam- és Jogtudományi Kar (ÁJK)", "Faculty of Law (ÁJK)"),
                icon: <BookOpen className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("ÁJK Főoldal", "Faculty Main Page"), url: "https://jogikari.uni-miskolc.hu/" },
                    { title: l("Hallgatói Szabályzatok", "Student Regulations"), url: "https://jogikari.uni-miskolc.hu/szabalyzatok" },
                ]
            }
        ],
        'SZE': [
            {
                category: l("Alapvető Rendszerek", "Core Systems"),
                icon: <Globe className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("Neptun Hallgatói Web", "Neptun Student Web"), url: "https://neptun.sze.hu/" },
                    { title: l("SZE-learning (Moodle)", "SZE-learning (Moodle)"), url: "https://elearning.sze.hu/" },
                    { title: l("Egyetemi Könyvtár (EKL)", "University Library (EKL)"), url: "https://ekl.sze.hu/" },
                    { title: l("SZE Főoldal", "University Main Page"), url: "https://www.uni.sze.hu/" },
                ]
            },
            {
                category: l("Gépészmérnöki, Info. és Villamos. (GIVK)", "Faculty of Mechanical, IT and Electrical Eng. (GIVK)"),
                icon: <Monitor className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("GIVK Főoldal", "Faculty Main Page"), url: "https://givk.sze.hu/" },
                    { title: l("GIVK HÖK", "GIVK Student Union"), url: "https://ehok.sze.hu/" },
                    { title: l("Tantervek és Tárgyak", "Curricula and Subjects"), url: "https://givk.sze.hu/oktatas" },
                ]
            },
            {
                category: l("Kautz Gyula Gazdaságtudományi Kar", "Kautz Gyula Faculty of Economics"),
                icon: <Briefcase className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />,
                links: [
                    { title: l("KGK Főoldal", "Faculty Main Page"), url: "https://kgk.sze.hu/" },
                    { title: l("Tanulmányi Tájékoztatók", "Study Guides"), url: "https://kgk.sze.hu/oktatas" },
                ]
            }
        ]
    };

    const activeLinks = linkDatabase[activeTab] || [];

    return (
        <main className="w-full max-w-7xl mx-auto mt-6 pb-12 px-4 relative z-20">

            {/* --- Fejléc --- */}
            <div className="flex items-center space-x-3 mb-8 bg-gradient-to-r from-cyan-400 to-fuchsia-500 dark:bg-gradient-to-r dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-[4px_4px_0px_#000] dark:shadow-md secret:shadow-[0_0_15px_rgba(28,248,93,0.3)] secret:rounded-none">
                <LinkIcon className="w-8 h-8 text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                <h1 className="text-3xl font-bold text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                    {t('links.title')}
                </h1>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">

                {/* --- Bal Oldal: Egyetemek Tabs --- */}
                <div className="w-full lg:w-1/4 flex flex-col space-y-2">
                    {universities.map(uni => (
                        <button
                            key={uni.id}
                            onClick={() => setActiveTab(uni.id)}
                            className={`p-4 font-bold text-left border-4 transition-all duration-300 shadow-[4px_4px_0px_#000] dark:shadow-sm secret:font-mono uppercase cursor-pointer shrink-0
                                ${activeTab === uni.id
                                    ? 'bg-cyan-400 dark:bg-[#a855f7] secret:bg-[#1cf85d] text-black dark:text-white secret:text-black border-black dark:border-transparent secret:border-[#1cf85d] translate-x-2 shadow-[6px_6px_0px_#000] dark:shadow-md'
                                    : 'bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-gray-300 secret:text-[#1cf85d] border-black dark:border-[#a855f7] secret:border-[#1cf85d] hover:bg-fuchsia-400 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] dark:hover:bg-gray-800 secret:hover:bg-[#1cf85d]/10'
                                }`}
                        >
                            {uni.name}
                        </button>
                    ))}
                </div>

                {/* --- Jobb Oldal: Linkek Kategóriánként --- */}
                <div className="w-full lg:w-3/4 flex flex-col space-y-6">
                    {activeLinks.map((section, idx) => (
                        <div key={idx} className="bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[8px_8px_0px_#000] dark:shadow-md secret:rounded-none">
                            <div className="flex items-center mb-4 border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                                {section.icon}
                                <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase ml-2">
                                    {section.category}
                                </h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {section.links.map((link, linkIdx) => (
                                    <a
                                        key={linkIdx}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center p-3 bg-white dark:bg-[#121212] secret:bg-transparent border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] hover:border-black hover:bg-cyan-400 hover:-translate-y-1 hover:shadow-[4px_4px_0px_#000] dark:hover:border-[#a855f7] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all group shadow-[2px_2px_0px_#000] dark:shadow-sm secret:font-mono font-bold"
                                    >
                                        <ExternalLink className="w-5 h-5 mr-3 text-black dark:text-gray-400 group-hover:text-black dark:group-hover:text-[#a855f7] secret:group-hover:text-black transition-colors shrink-0" />
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