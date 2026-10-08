import { useState } from 'react';
import {
    Link as LinkIcon, ExternalLink, GraduationCap, Monitor, BookOpen,
    Cpu, Globe, Briefcase, Landmark, Stethoscope, Heart, Smile,
    Users, FlaskConical, Leaf, Wrench, Music
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { PageHeader, PageShell } from '../components/PageLayout';

interface LinkItem {
    title: string;
    url: string;
}

interface LinkCategory {
    category: string;
    icon: React.ReactNode;
    links: LinkItem[];
}

function universityCode(name: string, id: string) {
    const match = name.match(/\(([^)]+)\)\s*$/);
    return match ? match[1] : id;
}

export default function LinksPage() {
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState('DE');
    const [faculty, setFaculty] = useState('');
    const isEn = language === 'en';
    const l = (hu: string, en: string) => isEn ? en : hu;
    const ic = (Icon: React.ComponentType<{ className?: string }>) => (
        <Icon className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />
    );

    {/* --- Data --- */}
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
        { id: 'ATE', name: l('Állatorvostudományi Egyetem (ÁTE)', 'University of Veterinary Medicine (ÁTE)') },
        { id: 'AUB', name: l('Andrássy Egyetem (AUB)', 'Andrássy University (AUB)') },
        { id: 'BGE', name: l('Budapesti Gazdaságtudományi Egyetem (BGE)', 'Budapest Business University (BGE)') },
        { id: 'METU', name: l('Budapesti Metropolitan Egyetem (METU)', 'Budapest Metropolitan University (METU)') },
        { id: 'CEU', name: l('Közép-európai Egyetem (CEU)', 'Central European University (CEU)') },
        { id: 'DRHE', name: l('Debreceni Református Hittudományi Egyetem (DRHE)', 'Debrecen Reformed Theological University (DRHE)') },
        { id: 'DUE', name: l('Dunaújvárosi Egyetem (DUE)', 'University of Dunaújváros (DUE)') },
        { id: 'EDUTUS', name: l('Edutus Egyetem (EDUTUS)', 'Edutus University (EDUTUS)') },
        { id: 'EKKE', name: l('Eszterházy Károly Katolikus Egyetem (EKKE)', 'Eszterházy Károly Catholic University (EKKE)') },
        { id: 'EHE', name: l('Evangélikus Hittudományi Egyetem (EHE)', 'Evangelical-Lutheran Theological University (EHE)') },
        { id: 'GDE', name: l('Gábor Dénes Egyetem (GDE)', 'Dennis Gábor University (GDE)') },
        { id: 'GFE', name: l('Gál Ferenc Egyetem (GFE)', 'Gál Ferenc University (GFE)') },
        { id: 'KRE', name: l('Károli Gáspár Református Egyetem (KRE)', 'Károli Gáspár University (KRE)') },
        { id: 'KJE', name: l('Kodolányi János Egyetem (KJE)', 'Kodolányi János University (KJE)') },
        { id: 'LFZE', name: l('Liszt Ferenc Zeneművészeti Egyetem (LFZE)', 'Liszt Ferenc Academy of Music (LFZE)') },
        { id: 'MATE', name: l('Magyar Agrár- és Élettudományi Egyetem (MATE)', 'Hungarian University of Agriculture and Life Sciences (MATE)') },
        { id: 'MKE', name: l('Magyar Képzőművészeti Egyetem (MKE)', 'Hungarian University of Fine Arts (MKE)') },
        { id: 'MTE', name: l('Magyar Táncművészeti Egyetem (MTE)', 'Hungarian Dance University (MTE)') },
        { id: 'TF', name: l('Magyar Testnevelési és Sporttudományi Egyetem (TF)', 'Hungarian University of Sports Science (TF)') },
        { id: 'MILTON', name: l('Milton Friedman Egyetem (MILTON)', 'Milton Friedman University (MILTON)') },
        { id: 'MOME', name: l('Moholy-Nagy Művészeti Egyetem (MOME)', 'Moholy-Nagy University of Art and Design (MOME)') },
        { id: 'NKE', name: l('Nemzeti Közszolgálati Egyetem (NKE)', 'University of Public Service (NKE)') },
        { id: 'ORZSE', name: l('Országos Rabbiképző – Zsidó Egyetem (OR-ZSE)', 'Jewish Theological Seminary – University of Jewish Studies (OR-ZSE)') },
        { id: 'PE', name: l('Pannon Egyetem (PE)', 'University of Pannonia (PE)') },
        { id: 'PPKE', name: l('Pázmány Péter Katolikus Egyetem (PPKE)', 'Pázmány Péter Catholic University (PPKE)') },
        { id: 'SRHE', name: l('Sárospataki Református Hittudományi Egyetem (SRHE)', 'Sárospatak Reformed Theological University (SRHE)') },
        { id: 'SE', name: l('Semmelweis Egyetem (SE)', 'Semmelweis University (SE)') },
        { id: 'SOE', name: l('Soproni Egyetem (SOE)', 'University of Sopron (SOE)') },
        { id: 'SZFE', name: l('Színház- és Filmművészeti Egyetem (SZFE)', 'University of Theatre and Film Arts (SZFE)') },
        { id: 'THE', name: l('Tokaj-Hegyalja Egyetem (THE)', 'University of Tokaj (THE)') },
        { id: 'WSNE', name: l('Wekerle Sándor Nemzetközi Egyetem (WSNE)', 'Wekerle Sándor International University (WSNE)') },
    ];

    const linkDatabase: Record<string, LinkCategory[]> = {
        'DE': [
            {
                category: l("Alapvető linkek", "Core Links"),
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
                    { title: l("Képzések / Tantervi Háló", "Programs / Curricula"), url: "https://inf.unideb.hu/2026-szeptembertol-meghirdetett-kepzesek" },
                    { title: l("Syllabus", "Syllabus"), url: "https://www.ik.unideb.hu/syllabi/" },
                    { title: l("Órarend", "Timetable"), url: "https://levelezo.inf.unideb.hu/orarend/#/?order=date,program,instructor,subject,room&program=PTI-MSC-26-1" },
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
                category: l("Alapvető linkek", "Core Links"),
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
            },
            {
                category: l("Építőmérnöki Kar (ÉMK)", "Faculty of Civil Engineering (ÉMK)"),
                icon: ic(Wrench),
                links: [
                    { title: l("ÉMK Főoldal", "Faculty Main Page"), url: "https://epito.bme.hu/" },
                ]
            },
            {
                category: l("Gépészmérnöki Kar (GPK)", "Faculty of Mechanical Engineering (GPK)"),
                icon: ic(Cpu),
                links: [
                    { title: l("GPK Főoldal", "Faculty Main Page"), url: "https://gpk.bme.hu/" },
                ]
            },
            {
                category: l("Vegyészmérnöki és Biomérnöki Kar (VBK)", "Faculty of Chemical Technology and Biotechnology (VBK)"),
                icon: ic(FlaskConical),
                links: [
                    { title: l("VBK Főoldal", "Faculty Main Page"), url: "https://www.ch.bme.hu/" },
                ]
            },
            {
                category: l("Közlekedésmérnöki és Járműmérnöki Kar (KJK)", "Faculty of Transportation and Vehicle Engineering (KJK)"),
                icon: ic(Wrench),
                links: [
                    { title: l("KJK Főoldal", "Faculty Main Page"), url: "https://kozlekedes.bme.hu/" },
                ]
            },
            {
                category: l("Természettudományi Kar (TTK)", "Faculty of Natural Sciences (TTK)"),
                icon: ic(Globe),
                links: [
                    { title: l("TTK Főoldal", "Faculty Main Page"), url: "https://www.ttk.bme.hu/" },
                ]
            },
            {
                category: l("Gazdaság- és Társadalomtudományi Kar (GTK)", "Faculty of Economic and Social Sciences (GTK)"),
                icon: ic(Briefcase),
                links: [
                    { title: l("GTK Főoldal", "Faculty Main Page"), url: "https://www.gtk.bme.hu/" },
                ]
            }
        ],
        'ELTE': [
            {
                category: l("Alapvető linkek", "Core Links"),
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
            },
            {
                category: l("Állam- és Jogtudományi Kar (ÁJK)", "Faculty of Law (ÁJK)"),
                icon: ic(Landmark),
                links: [
                    { title: l("ÁJK Főoldal", "Faculty Main Page"), url: "https://www.ajk.elte.hu/" },
                ]
            },
            {
                category: l("Bárczi Gusztáv Gyógypedagógiai Kar (BGGYK)", "Bárczi Gusztáv Faculty of Special Needs Education (BGGYK)"),
                icon: ic(Heart),
                links: [
                    { title: l("BGGYK Főoldal", "Faculty Main Page"), url: "https://www.barczi.elte.hu/" },
                ]
            },
            {
                category: l("Gazdaságtudományi Kar (GTK)", "Faculty of Economics (GTK)"),
                icon: ic(Briefcase),
                links: [
                    { title: l("GTK Főoldal", "Faculty Main Page"), url: "https://gtk.elte.hu/" },
                ]
            },
            {
                category: l("Pedagógiai és Pszichológiai Kar (PPK)", "Faculty of Education and Psychology (PPK)"),
                icon: ic(Users),
                links: [
                    { title: l("PPK Főoldal", "Faculty Main Page"), url: "https://www.ppk.elte.hu/" },
                ]
            },
            {
                category: l("Társadalomtudományi Kar (TáTK)", "Faculty of Social Sciences (TáTK)"),
                icon: ic(Users),
                links: [
                    { title: l("TáTK Főoldal", "Faculty Main Page"), url: "https://tatk.elte.hu/" },
                ]
            },
            {
                category: l("Természettudományi Kar (TTK)", "Faculty of Science (TTK)"),
                icon: ic(Globe),
                links: [
                    { title: l("TTK Főoldal", "Faculty Main Page"), url: "https://ttk.elte.hu/" },
                ]
            },
            {
                category: l("Tanító- és Óvóképző Kar (TÓK)", "Faculty of Primary and Pre-School Education (TÓK)"),
                icon: ic(BookOpen),
                links: [
                    { title: l("TÓK Főoldal", "Faculty Main Page"), url: "https://www.tok.elte.hu/" },
                ]
            }
        ],
        'SZTE': [
            {
                category: l("Alapvető linkek", "Core Links"),
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
            },
            {
                category: l("Állam- és Jogtudományi Kar (ÁJTK)", "Faculty of Law and Political Sciences (ÁJTK)"),
                icon: ic(Landmark),
                links: [
                    { title: l("ÁJTK Főoldal", "Faculty Main Page"), url: "https://www.juris.u-szeged.hu/" },
                ]
            },
            {
                category: l("Bölcsészet- és Társadalomtudományi Kar (BTK)", "Faculty of Humanities and Social Sciences (BTK)"),
                icon: ic(BookOpen),
                links: [
                    { title: l("BTK Főoldal", "Faculty Main Page"), url: "https://arts.u-szeged.hu/" },
                ]
            },
            {
                category: l("Egészségtudományi és Szociális Képzési Kar (ETSZK)", "Faculty of Health Sciences and Social Studies (ETSZK)"),
                icon: ic(Heart),
                links: [
                    { title: l("ETSZK Főoldal", "Faculty Main Page"), url: "https://www.etszk.u-szeged.hu/" },
                ]
            },
            {
                category: l("Fogorvostudományi Kar (FOK)", "Faculty of Dentistry (FOK)"),
                icon: ic(Smile),
                links: [
                    { title: l("FOK Főoldal", "Faculty Main Page"), url: "https://www.stoma.u-szeged.hu/" },
                ]
            },
            {
                category: l("Gazdaságtudományi Kar (GTK)", "Faculty of Economics (GTK)"),
                icon: ic(Briefcase),
                links: [
                    { title: l("GTK Főoldal", "Faculty Main Page"), url: "https://www.eco.u-szeged.hu/" },
                ]
            },
            {
                category: l("Gyógyszerésztudományi Kar (GYTK)", "Faculty of Pharmacy (GYTK)"),
                icon: ic(FlaskConical),
                links: [
                    { title: l("GYTK Főoldal", "Faculty Main Page"), url: "https://www.pharm.u-szeged.hu/" },
                ]
            },
            {
                category: l("Juhász Gyula Pedagógusképző Kar (JGYPK)", "Juhász Gyula Faculty of Education (JGYPK)"),
                icon: ic(Users),
                links: [
                    { title: l("JGYPK Főoldal", "Faculty Main Page"), url: "https://www.jgypk.u-szeged.hu/" },
                ]
            },
            {
                category: l("Mérnöki Kar (MK)", "Faculty of Engineering (MK)"),
                icon: ic(Wrench),
                links: [
                    { title: l("MK Főoldal", "Faculty Main Page"), url: "https://www.mk.u-szeged.hu/" },
                ]
            },
            {
                category: l("Mezőgazdasági Kar (MGK)", "Faculty of Agriculture (MGK)"),
                icon: ic(Leaf),
                links: [
                    { title: l("MGK Főoldal", "Faculty Main Page"), url: "https://mgk.u-szeged.hu/" },
                ]
            },
            {
                category: l("Bartók Béla Művészeti Kar", "Bartók Béla Faculty of Arts"),
                icon: ic(Music),
                links: [
                    { title: l("Bartók Béla Művészeti Kar", "Bartók Béla Faculty of Arts"), url: "https://music.u-szeged.hu/" },
                ]
            }
        ],
        'PTE': [
            {
                category: l("Alapvető linkek", "Core Links"),
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
            },
            {
                category: l("Általános Orvostudományi Kar (ÁOK)", "Faculty of Medicine (ÁOK)"),
                icon: ic(Stethoscope),
                links: [
                    { title: l("ÁOK Főoldal", "Faculty Main Page"), url: "https://aok.pte.hu/" },
                ]
            },
            {
                category: l("Állam- és Jogtudományi Kar (ÁJK)", "Faculty of Law (ÁJK)"),
                icon: ic(Landmark),
                links: [
                    { title: l("ÁJK Főoldal", "Faculty Main Page"), url: "https://ajk.pte.hu/" },
                ]
            },
            {
                category: l("Bölcsészet- és Társadalomtudományi Kar (BTK)", "Faculty of Humanities and Social Sciences (BTK)"),
                icon: ic(BookOpen),
                links: [
                    { title: l("BTK Főoldal", "Faculty Main Page"), url: "https://btk.pte.hu/" },
                ]
            },
            {
                category: l("Egészségtudományi Kar (ETK)", "Faculty of Health Sciences (ETK)"),
                icon: ic(Heart),
                links: [
                    { title: l("ETK Főoldal", "Faculty Main Page"), url: "https://etk.pte.hu/" },
                ]
            },
            {
                category: l("Gyógyszerésztudományi Kar (GYTK)", "Faculty of Pharmacy (GYTK)"),
                icon: ic(FlaskConical),
                links: [
                    { title: l("GYTK Főoldal", "Faculty Main Page"), url: "https://gytk.pte.hu/" },
                ]
            },
            {
                category: l("Kultúratudományi, Pedagógusképző és Vidékfejlesztési Kar (KPVK)", "Faculty of Cultural Sciences, Education and Regional Development (KPVK)"),
                icon: ic(Users),
                links: [
                    { title: l("KPVK Főoldal", "Faculty Main Page"), url: "https://kpvk.pte.hu/" },
                ]
            },
            {
                category: l("Művészeti Kar", "Faculty of Music and Visual Arts"),
                icon: ic(Music),
                links: [
                    { title: l("Művészeti Kar", "Faculty of Music and Visual Arts"), url: "https://art.pte.hu/" },
                ]
            },
            {
                category: l("Természettudományi Kar (TTK)", "Faculty of Sciences (TTK)"),
                icon: ic(Globe),
                links: [
                    { title: l("TTK Főoldal", "Faculty Main Page"), url: "https://ttk.pte.hu/" },
                ]
            }
        ],
        'NJE': [
            {
                category: l("Alapvető linkek", "Core Links"),
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
            },
            {
                category: l("Kertészeti és Vidékfejlesztési Kar (KVK)", "Faculty of Horticulture and Rural Development (KVK)"),
                icon: ic(Leaf),
                links: [
                    { title: l("KVK Főoldal", "Faculty Main Page"), url: "https://kvk.nje.hu/" },
                ]
            }
        ],
        'NYE': [
            {
                category: l("Alapvető linkek", "Core Links"),
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
                category: l("Alapvető linkek", "Core Links"),
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
            },
            {
                category: l("Bánki Donát Gépész és Biztonságtechnikai Kar (BGK)", "Bánki Donát Faculty of Mechanical and Safety Engineering (BGK)"),
                icon: ic(Cpu),
                links: [
                    { title: l("BGK Főoldal", "Faculty Main Page"), url: "https://bgk.uni-obuda.hu/" },
                ]
            },
            {
                category: l("Keleti Károly Gazdasági Kar (KGK)", "Keleti Károly Faculty of Business and Management (KGK)"),
                icon: ic(Briefcase),
                links: [
                    { title: l("KGK Főoldal", "Faculty Main Page"), url: "https://kgk.uni-obuda.hu/" },
                ]
            },
            {
                category: l("Rejtő Sándor Könnyűipari és Környezetmérnöki Kar (RKK)", "Rejtő Sándor Faculty of Light Industry and Environmental Engineering (RKK)"),
                icon: ic(Leaf),
                links: [
                    { title: l("RKK Főoldal", "Faculty Main Page"), url: "https://rkk.uni-obuda.hu/" },
                ]
            },
            {
                category: l("Alba Regia Műszaki Kar (AMK)", "Alba Regia Technical Faculty (AMK)"),
                icon: ic(Wrench),
                links: [
                    { title: l("AMK Főoldal", "Faculty Main Page"), url: "https://amk.uni-obuda.hu/" },
                ]
            },
            {
                category: l("Ybl Miklós Építéstudományi Kar", "Ybl Miklós Faculty of Architecture and Civil Engineering"),
                icon: ic(Landmark),
                links: [
                    { title: l("Ybl Kar Főoldal", "Faculty Main Page"), url: "https://ybl.uni-obuda.hu/" },
                ]
            }
        ],
        'BCE': [
            {
                category: l("Alapvető linkek", "Core Links"),
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
                category: l("Alapvető linkek", "Core Links"),
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
            },
            {
                category: l("Gazdaságtudományi Kar (GTK)", "Faculty of Economics (GTK)"),
                icon: ic(Briefcase),
                links: [
                    { title: l("GTK Főoldal", "Faculty Main Page"), url: "https://gtk.uni-miskolc.hu/" },
                ]
            },
            {
                category: l("Műszaki Föld- és Környezettudományi Kar (MFK)", "Faculty of Earth and Environmental Sciences and Engineering (MFK)"),
                icon: ic(Leaf),
                links: [
                    { title: l("MFK Főoldal", "Faculty Main Page"), url: "https://mfk.uni-miskolc.hu/" },
                ]
            },
            {
                category: l("Bölcsészet- és Társadalomtudományi Kar (BTK)", "Faculty of Humanities and Social Sciences (BTK)"),
                icon: ic(BookOpen),
                links: [
                    { title: l("BTK Főoldal", "Faculty Main Page"), url: "https://bolcsesz.uni-miskolc.hu/" },
                ]
            }
        ],
        'SZE': [
            {
                category: l("Alapvető linkek", "Core Links"),
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
            },
            {
                category: l("Audi Hungaria Járműmérnöki Kar (AHJK)", "Audi Hungaria Faculty of Automotive Engineering (AHJK)"),
                icon: ic(Cpu),
                links: [
                    { title: l("AHJK Főoldal", "Faculty Main Page"), url: "https://ahjk.sze.hu/" },
                ]
            },
            {
                category: l("Apáczai Csere János Kar (AK)", "Apáczai Csere János Faculty (AK)"),
                icon: ic(BookOpen),
                links: [
                    { title: l("AK Főoldal", "Faculty Main Page"), url: "https://ak.sze.hu/" },
                ]
            },
            {
                category: l("Deák Ferenc Állam- és Jogtudományi Kar (DFK)", "Deák Ferenc Faculty of Law (DFK)"),
                icon: ic(Landmark),
                links: [
                    { title: l("DFK Főoldal", "Faculty Main Page"), url: "https://dfk.sze.hu/" },
                ]
            },
            {
                category: l("Építész-, Építő- és Közlekedésmérnöki Kar (ÉÉKK)", "Faculty of Architecture, Civil and Transport Engineering (ÉÉKK)"),
                icon: ic(Wrench),
                links: [
                    { title: l("ÉÉKK Főoldal", "Faculty Main Page"), url: "https://eekk.sze.hu/" },
                ]
            }
        ],
        'ATE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(GraduationCap),
                links: [
                    { title: l("ÁTE Főoldal", "University Main Page"), url: "http://www.univet.hu" },
                ]
            }
        ],
        'AUB': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(Landmark),
                links: [
                    { title: l("Andrássy Egyetem Főoldal", "University Main Page"), url: "https://aub.eu/" },
                ]
            }
        ],
        'BGE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(Briefcase),
                links: [
                    { title: l("BGE Főoldal", "University Main Page"), url: "https://www.uni-bge.hu/" },
                ]
            },
            {
                category: l("Pénzügyi és Számviteli Kar (PSZK)", "Faculty of Finance and Accountancy (PSZK)"),
                icon: ic(Briefcase),
                links: [
                    { title: l("PSZK Főoldal", "Faculty Main Page"), url: "https://uni-bge.hu/pszk" },
                ]
            },
            {
                category: l("Kereskedelmi, Vendéglátóipari és Idegenforgalmi Kar (KVIK)", "Faculty of Commerce, Hospitality and Tourism (KVIK)"),
                icon: ic(Briefcase),
                links: [
                    { title: l("KVIK Főoldal", "Faculty Main Page"), url: "https://uni-bge.hu/kvik" },
                ]
            },
            {
                category: l("Külkereskedelmi Kar (KKK)", "Faculty of International Management and Business (KKK)"),
                icon: ic(Globe),
                links: [
                    { title: l("KKK Főoldal", "Faculty Main Page"), url: "https://uni-bge.hu/kkk" },
                ]
            }
        ],
        'METU': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(GraduationCap),
                links: [
                    { title: l("METU Főoldal", "University Main Page"), url: "https://www.metropolitan.hu/" },
                ]
            }
        ],
        'CEU': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(Globe),
                links: [
                    { title: l("CEU Főoldal", "University Main Page"), url: "https://www.ceu.hu/" },
                ]
            }
        ],
        'DRHE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(BookOpen),
                links: [
                    { title: l("DRHE Főoldal", "University Main Page"), url: "http://www.drhe.hu" },
                ]
            }
        ],
        'DUE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(GraduationCap),
                links: [
                    { title: l("DUE Főoldal", "University Main Page"), url: "https://www.uniduna.hu/" },
                ]
            }
        ],
        'EDUTUS': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(GraduationCap),
                links: [
                    { title: l("Edutus Főoldal", "University Main Page"), url: "http://www.edutus.hu" },
                ]
            }
        ],
        'EKKE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(GraduationCap),
                links: [
                    { title: l("EKKE Főoldal", "University Main Page"), url: "https://uni-eszterhazy.hu/" },
                ]
            },
            {
                category: l("Bölcsészettudományi Kar (BTK)", "Faculty of Humanities (BTK)"),
                icon: ic(BookOpen),
                links: [
                    { title: l("BTK Főoldal", "Faculty Main Page"), url: "https://uni-eszterhazy.hu/btk" },
                ]
            }
        ],
        'EHE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(BookOpen),
                links: [
                    { title: l("EHE Főoldal", "University Main Page"), url: "http://uni.lutheran.hu" },
                ]
            }
        ],
        'GDE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(Monitor),
                links: [
                    { title: l("GDE Főoldal", "University Main Page"), url: "https://www.gde.hu" },
                ]
            }
        ],
        'GFE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(BookOpen),
                links: [
                    { title: l("GFE Főoldal", "University Main Page"), url: "http://www.gfe.hu" },
                ]
            }
        ],
        'KRE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(Landmark),
                links: [
                    { title: l("KRE Főoldal", "University Main Page"), url: "http://www.kre.hu" },
                ]
            },
            {
                category: l("Állam- és Jogtudományi Kar (ÁJK)", "Faculty of Law (ÁJK)"),
                icon: ic(Landmark),
                links: [
                    { title: l("ÁJK Főoldal", "Faculty Main Page"), url: "https://ajk.kre.hu/" },
                ]
            },
            {
                category: l("Bölcsészet- és Társadalomtudományi Kar (BTK)", "Faculty of Humanities and Social Sciences (BTK)"),
                icon: ic(BookOpen),
                links: [
                    { title: l("BTK Főoldal", "Faculty Main Page"), url: "https://btk.kre.hu/" },
                ]
            },
            {
                category: l("Hittudományi Kar (HTK)", "Faculty of Theology (HTK)"),
                icon: ic(BookOpen),
                links: [
                    { title: l("HTK Főoldal", "Faculty Main Page"), url: "https://htk.kre.hu/" },
                ]
            }
        ],
        'KJE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(GraduationCap),
                links: [
                    { title: l("KJE Főoldal", "University Main Page"), url: "http://www.kodolanyi.hu" },
                ]
            }
        ],
        'LFZE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(Music),
                links: [
                    { title: l("LFZE Főoldal", "University Main Page"), url: "https://www.lfze.hu" },
                ]
            }
        ],
        'MATE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(Leaf),
                links: [
                    { title: l("MATE Főoldal", "University Main Page"), url: "https://uni-mate.hu/" },
                ]
            }
        ],
        'MKE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(Landmark),
                links: [
                    { title: l("MKE Főoldal", "University Main Page"), url: "http://www.mke.hu/" },
                ]
            }
        ],
        'MTE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(Users),
                links: [
                    { title: l("MTE Főoldal", "University Main Page"), url: "http://www.mte.eu/" },
                ]
            }
        ],
        'TF': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(Heart),
                links: [
                    { title: l("TF Főoldal", "University Main Page"), url: "http://www.tf.hu" },
                ]
            }
        ],
        'MILTON': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(Briefcase),
                links: [
                    { title: l("Milton Friedman Egyetem Főoldal", "University Main Page"), url: "http://www.uni-milton.hu" },
                ]
            }
        ],
        'MOME': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(Landmark),
                links: [
                    { title: l("MOME Főoldal", "University Main Page"), url: "http://www.mome.hu/" },
                ]
            }
        ],
        'NKE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(Landmark),
                links: [
                    { title: l("NKE Főoldal", "University Main Page"), url: "https://www.uni-nke.hu/" },
                ]
            },
            {
                category: l("Államtudományi és Nemzetközi Tanulmányok Kar (ÁNTK)", "Faculty of Public Governance and International Studies (ÁNTK)"),
                icon: ic(Landmark),
                links: [
                    { title: l("ÁNTK Főoldal", "Faculty Main Page"), url: "https://antk.uni-nke.hu/" },
                ]
            },
            {
                category: l("Hadtudományi és Honvédtisztképző Kar (HHK)", "Faculty of Military Science and Officer Training (HHK)"),
                icon: ic(Landmark),
                links: [
                    { title: l("HHK Főoldal", "Faculty Main Page"), url: "https://hhk.uni-nke.hu/" },
                ]
            },
            {
                category: l("Rendészettudományi Kar (RTK)", "Faculty of Law Enforcement (RTK)"),
                icon: ic(Landmark),
                links: [
                    { title: l("RTK Főoldal", "Faculty Main Page"), url: "https://rtk.uni-nke.hu/" },
                ]
            },
            {
                category: l("Víztudományi Kar (VTK)", "Faculty of Water Sciences (VTK)"),
                icon: ic(Globe),
                links: [
                    { title: l("VTK Főoldal", "Faculty Main Page"), url: "https://vtk.uni-nke.hu/" },
                ]
            }
        ],
        'ORZSE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(BookOpen),
                links: [
                    { title: l("OR-ZSE Főoldal", "University Main Page"), url: "http://www.or-zse.hu" },
                ]
            }
        ],
        'PE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(GraduationCap),
                links: [
                    { title: l("Pannon Egyetem Főoldal", "University Main Page"), url: "https://www.uni-pannon.hu/" },
                ]
            },
            {
                category: l("Mérnöki Kar (MK)", "Faculty of Engineering (MK)"),
                icon: ic(Wrench),
                links: [
                    { title: l("MK Főoldal", "Faculty Main Page"), url: "https://mk.uni-pannon.hu/" },
                ]
            },
            {
                category: l("Gazdaságtudományi Kar (GTK)", "Faculty of Business and Economics (GTK)"),
                icon: ic(Briefcase),
                links: [
                    { title: l("GTK Főoldal", "Faculty Main Page"), url: "https://gtk.uni-pannon.hu/" },
                ]
            }
        ],
        'PPKE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(Landmark),
                links: [
                    { title: l("PPKE Főoldal", "University Main Page"), url: "http://www.ppke.hu" },
                ]
            },
            {
                category: l("Bölcsészet- és Társadalomtudományi Kar (BTK)", "Faculty of Humanities and Social Sciences (BTK)"),
                icon: ic(BookOpen),
                links: [
                    { title: l("BTK Főoldal", "Faculty Main Page"), url: "https://btk.ppke.hu/" },
                ]
            },
            {
                category: l("Információs Technológiai és Bionikai Kar (ITK)", "Faculty of Information Technology and Bionics (ITK)"),
                icon: ic(Monitor),
                links: [
                    { title: l("ITK Főoldal", "Faculty Main Page"), url: "https://itk.ppke.hu/" },
                ]
            },
            {
                category: l("Jog- és Államtudományi Kar (JÁK)", "Faculty of Law and Political Sciences (JÁK)"),
                icon: ic(Landmark),
                links: [
                    { title: l("JÁK Főoldal", "Faculty Main Page"), url: "https://jak.ppke.hu/" },
                ]
            },
            {
                category: l("Hittudományi Kar (HTK)", "Faculty of Theology (HTK)"),
                icon: ic(BookOpen),
                links: [
                    { title: l("HTK Főoldal", "Faculty Main Page"), url: "https://htk.ppke.hu/" },
                ]
            }
        ],
        'SRHE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(BookOpen),
                links: [
                    { title: l("SRHE Főoldal", "University Main Page"), url: "http://www.srhe.hu/" },
                ]
            }
        ],
        'SE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(Stethoscope),
                links: [
                    { title: l("Semmelweis Egyetem Főoldal", "University Main Page"), url: "https://semmelweis.hu/" },
                ]
            },
            {
                category: l("Általános Orvostudományi Kar (ÁOK)", "Faculty of Medicine (ÁOK)"),
                icon: ic(Stethoscope),
                links: [
                    { title: l("ÁOK Főoldal", "Faculty Main Page"), url: "https://semmelweis.hu/aok/" },
                ]
            },
            {
                category: l("Fogorvostudományi Kar (FOK)", "Faculty of Dentistry (FOK)"),
                icon: ic(Smile),
                links: [
                    { title: l("FOK Főoldal", "Faculty Main Page"), url: "https://semmelweis.hu/fok/" },
                ]
            },
            {
                category: l("Gyógyszerésztudományi Kar (GYTK)", "Faculty of Pharmacy (GYTK)"),
                icon: ic(FlaskConical),
                links: [
                    { title: l("GYTK Főoldal", "Faculty Main Page"), url: "https://semmelweis.hu/gytk/" },
                ]
            },
            {
                category: l("Egészségtudományi Kar (ETK)", "Faculty of Health Sciences (ETK)"),
                icon: ic(Heart),
                links: [
                    { title: l("ETK Főoldal", "Faculty Main Page"), url: "https://semmelweis.hu/etk/" },
                ]
            },
            {
                category: l("Egészségügyi Közszolgálati Kar (EKK)", "Faculty of Health and Public Administration (EKK)"),
                icon: ic(Landmark),
                links: [
                    { title: l("EKK Főoldal", "Faculty Main Page"), url: "https://semmelweis.hu/ekk/" },
                ]
            },
            {
                category: l("Pető András Kar (PAK)", "András Pető Faculty (PAK)"),
                icon: ic(Users),
                links: [
                    { title: l("PAK Főoldal", "Faculty Main Page"), url: "https://semmelweis.hu/pak/" },
                ]
            }
        ],
        'SOE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(Leaf),
                links: [
                    { title: l("Soproni Egyetem Főoldal", "University Main Page"), url: "https://www.uni-sopron.hu/" },
                ]
            },
            {
                category: l("Erdőmérnöki Kar (EMK)", "Faculty of Forestry (EMK)"),
                icon: ic(Leaf),
                links: [
                    { title: l("EMK Főoldal", "Faculty Main Page"), url: "https://emk.uni-sopron.hu/" },
                ]
            },
            {
                category: l("Faipari Mérnöki és Kreatívipari Kar (FMK)", "Faculty of Wood Engineering and Creative Industries (FMK)"),
                icon: ic(Wrench),
                links: [
                    { title: l("FMK Főoldal", "Faculty Main Page"), url: "https://fmk.uni-sopron.hu/" },
                ]
            },
            {
                category: l("Lámfalussy Sándor Közgazdaságtudományi Kar (LKK)", "Lámfalussy Sándor Faculty of Economics (LKK)"),
                icon: ic(Briefcase),
                links: [
                    { title: l("LKK Főoldal", "Faculty Main Page"), url: "https://lkk.uni-sopron.hu/" },
                ]
            },
            {
                category: l("Benedek Elek Pedagógiai Kar (BPK)", "Benedek Elek Faculty of Pedagogy (BPK)"),
                icon: ic(Users),
                links: [
                    { title: l("BPK Főoldal", "Faculty Main Page"), url: "https://bpk.uni-sopron.hu/" },
                ]
            }
        ],
        'SZFE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(Users),
                links: [
                    { title: l("SZFE Főoldal", "University Main Page"), url: "http://www.szfe.hu" },
                ]
            }
        ],
        'THE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(GraduationCap),
                links: [
                    { title: l("Tokaj-Hegyalja Egyetem Főoldal", "University Main Page"), url: "https://www.unithe.hu" },
                ]
            }
        ],
        'WSNE': [
            {
                category: l("Alapvető linkek", "Core Links"),
                icon: ic(GraduationCap),
                links: [
                    { title: l("WSNE Főoldal", "University Main Page"), url: "https://www.wsne.hu" },
                ]
            }
        ]
    };

    const activeLinks = linkDatabase[activeTab] || [];
    const faculties = activeLinks.slice(1);
    const visibleLinks = faculty
        ? activeLinks.filter(section => section.category === faculty)
        : activeLinks;

    const selectUniversity = (id: string) => {
        setActiveTab(id);
        setFaculty('');
    };

    const selectClass = 'h-8 w-full bg-slate-100 dark:bg-[#121212] secret:bg-black border-4 border-black dark:border-transparent secret:border-[#1cf85d] px-2 text-sm text-black dark:text-white secret:text-[#1cf85d] font-bold secret:font-mono cursor-pointer';

    return (
        <PageShell>
            <PageHeader
                icon={LinkIcon}
                extra={
                    <div className="flex w-full flex-col gap-2 sm:flex-row">
                        <label className="sr-only" htmlFor="links-university">{t('links.university')}</label>
                        <select
                            id="links-university"
                            value={activeTab}
                            onChange={(event) => selectUniversity(event.target.value)}
                            className={`${selectClass} sm:w-28`}
                        >
                            {universities.map(uni => (
                                <option key={uni.id} value={uni.id}>{universityCode(uni.name, uni.id)}</option>
                            ))}
                        </select>
                        <label className="sr-only" htmlFor="links-faculty">{t('links.faculty')}</label>
                        <select
                            id="links-faculty"
                            value={faculty}
                            onChange={(event) => setFaculty(event.target.value)}
                            className={`${selectClass} sm:w-64`}
                        >
                            <option value="">{t('links.allFaculties')}</option>
                            {faculties.map(section => (
                                <option key={section.category} value={section.category}>{section.category}</option>
                            ))}
                        </select>
                    </div>
                }
            >
                {t('links.title')}
            </PageHeader>

            <div className="flex flex-col lg:flex-row gap-8">

                {/* --- University tabs --- */}
                <div className="w-full lg:w-1/4 flex flex-col space-y-2">
                    {universities.map(uni => (
                        <button
                            key={uni.id}
                            onClick={() => selectUniversity(uni.id)}
                            className={`p-4 font-bold text-left border-4 transition-all duration-300 shadow-[4px_4px_0px_#000] dark:shadow-sm secret:font-mono uppercase cursor-pointer shrink-0
                                ${activeTab === uni.id
                                    ? 'bg-blue-500 dark:bg-[#a855f7] secret:bg-[#1cf85d] text-black dark:text-white secret:text-black border-black dark:border-transparent secret:border-[#1cf85d] translate-x-2 shadow-[6px_6px_0px_#000] dark:shadow-md'
                                    : 'bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-gray-300 secret:text-[#1cf85d] border-black dark:border-[#a855f7] secret:border-[#1cf85d] hover:bg-blue-900 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] dark:hover:bg-gray-800 secret:hover:bg-[#1cf85d] secret:hover:text-black hover:text-white'
                                }`}
                        >
                            {uni.name}
                        </button>
                    ))}
                </div>

                {/* --- Links by category --- */}
                <div className="w-full lg:w-3/4 flex flex-col space-y-6">
                    {visibleLinks.map((section) => (
                        <div key={section.category} className="bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[8px_8px_0px_#000] dark:shadow-md secret:rounded-none">
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
                                        className="flex items-center p-3 bg-white dark:bg-[#121212] secret:bg-transparent border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] hover:border-black hover:bg-blue-500 hover:-translate-y-1 hover:shadow-[4px_4px_0px_#000] dark:hover:border-[#a855f7] secret:hover:border-[#1cf85d] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all group shadow-[2px_2px_0px_#000] dark:shadow-sm secret:font-mono font-bold"
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
        </PageShell>
    );
}