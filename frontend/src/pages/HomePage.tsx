import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Megaphone, Zap, Calendar, Bot, Send, Users, Calculator, FileText, Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface EventItem {
  id: number;
  title: string;
  description: string;
  eventDate?: string;
  createdAt?: string;
  imageUrl?: string;
}

const jokes = [
  { hu: "Miért keveri a programozó a Halloweent a Karácsonnyal? Mert Oct 31 == Dec 25.", en: "Why do programmers confuse Halloween and Christmas? Because Oct 31 == Dec 25." },
  { hu: "Hány programozó kell egy villanykörte kicseréléséhez? Egy sem, ez hardveres probléma.", en: "How many programmers does it take to change a light bulb? None, that's a hardware problem." },
  { hu: "A kódolás az a folyamat, amikor egy hibát kicserélsz két újra.", en: "Coding is the process of replacing one bug with two new ones." },
  { hu: "Egyetemista: - Tanár úr, kaphatok egy haladékot a beadandóhoz? Tanár: - Persze, a Neptun pont úgyis összeomlott.", en: "Student: - Professor, can I get an extension on my assignment? Professor: - Sure, Neptun just crashed anyway." },
  { hu: "A hallgatók 90%-a az utolsó napon írja meg a beadandót. A maradék 10% a határidő után.", en: "90% of students write their assignment on the last day. The remaining 10% write it after the deadline." },
  { hu: "Mit csinál a matematikus, ha fázik? Beáll a sarokba, mert ott 90 fok van.", en: "What does a mathematician do when they are cold? They stand in the corner, because it's 90 degrees there." },
  { hu: "Hogy hívják a kutyát, amelyik tud bűvészkedni? Labrakadabrador.", en: "What do you call a dog that can do magic tricks? A Labracadabrador." },
  { hu: "Két paradicsom sétál az úton. Az egyiket elüti egy autó. Mire a másik: Gyere, Ketchup!", en: "Two tomatoes are walking down the road. One gets hit by a car. The other says: Come on, Ketchup!" },
  { hu: "Miért vitt a diák létrát az egyetemre? Mert a felsőoktatásba jelentkezett.", en: "Why did the student bring a ladder to the university? Because he wanted to go to higher education." },
  { hu: "Mit mond a hóember a kocsmában? Kérek egy italt, teljesen le vagyok fagyva!", en: "What does the snowman say at the bar? I need a drink, I'm freezing!" },
  { hu: "Pincér, van békacomb? - Nincs uram. - Akkor ugorjon egy sörért!", en: "Waiter, do you have frog legs? - No, sir. - Then hop to it and get me a beer!" },
  { hu: "Miért nem játszanak bújócskát a dinoszauruszok? Mert senki sem akarja megtalálni őket.", en: "Why don't dinosaurs play hide and seek? Because nobody wants to find them." }
];

const tips = [
  { hu: "A Pomodoro módszerrel 25 perc fókusz után 5 perc szünet javasolt az optimális teljesítményhez.", en: "With the Pomodoro technique, a 5-minute break is recommended after 25 minutes of focus for optimal performance." },
  { hu: "A DEENK-ben (Egyetemi Könyvtár) ingyenesen foglalhatsz tanulószobát csoportos munkához.", en: "You can book study rooms for free at the DEENK (University Library) for group work." },
  { hu: "A hivatkozás generátort használva pillanatok alatt elkészítheted a szakdolgozatod irodalomjegyzékét.", en: "Using the citation generator, you can create your thesis bibliography in seconds." },
  { hu: "A 'Titkos mód' bekapcsolásához kattints 10-szer a sötét/világos mód váltó gombra a menüben!", en: "Click the dark/light mode toggle in the menu 10 times to activate 'Secret Mode'!" },
  { hu: "Ha a Naptárban beállítod a Discord értesítést, a rendszer vizsga előtt emlékeztetőt küld a szerveredre.", en: "If you set up Discord notifications in the Calendar, the system will send a reminder to your server before exams." }
];

{/* --- Számláló animáció Hook --- */ }
function useCountUp(endValue: number, startAnim: boolean, duration: number = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!startAnim) return;

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = currentTime - startTime;
      const percentage = Math.min(progress / duration, 1);

      const easeOut = 1 - Math.pow(1 - percentage, 3);

      setCount(Math.floor(endValue * easeOut));

      if (progress < duration) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(endValue);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [endValue, duration, startAnim]);

  return count;
}

export default function HomePage() {
  const { t, locale, language } = useLanguage();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNews, setSelectedNews] = useState<EventItem | null>(null);
  const [aiInput, setAiInput] = useState('');
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    {/* --- Admin jog ellenőrzése --- */ }
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:8080/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            const userRole = data.role || (data.roles && data.roles[0]) || '';
            if (userRole.includes('ADMIN') || data.isAdmin) {
              setIsAdmin(true);
            }
          }
        })
        .catch(err => console.error("Hiba a felhasználó lekérésekor:", err));
    }

    {/* --- Hírek lekérése (GET) --- */ }
    fetch('http://localhost:8080/api/events')
      .then((res) => {
        if (!res.ok) throw new Error('Hiba a hírek lekérésekor');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setEvents(data);
        } else {
          setEvents([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Hiba az események lekérésekor:', err);
        setEvents([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedNews) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedNews]);

  {/* --- Intersection Observer a statisztikához --- */ }
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aiInput.trim()) {
      localStorage.setItem('pendingAiPrompt', aiInput);
      navigate('/ai');
    }
  };

  const handleDeleteNews = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Biztosan törölni szeretnéd ezt a hírt? / Are you sure you want to delete this news?")) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:8080/api/events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setEvents(prevEvents => prevEvents.filter(event => event.id !== id));
      } else {
        console.error('Hiba a hír törlésekor');
      }
    } catch (error) {
      console.error('Hálózati hiba a hír törlésekor:', error);
    }
  };

  {/* --- Napi vicc és tipp kiválasztása --- */ }
  const dayOfYear = Math.floor(Date.now() / 86400000);
  const dailyJoke = language === 'en' ? jokes[dayOfYear % jokes.length].en : jokes[dayOfYear % jokes.length].hu;
  const dailyTip = language === 'en' ? tips[dayOfYear % tips.length].en : tips[dayOfYear % tips.length].hu;

  {/* --- Animált Statisztika Adatok --- */ }
  const animatedUsers = useCountUp(42, statsVisible);
  const animatedMath = useCountUp(153, statsVisible);
  const animatedDocs = useCountUp(28, statsVisible);

  return (
    <main className="w-full px-6 lg:px-16 mx-auto mt-8 pb-12 relative z-20">

      {/* --- Üdvözlő Szekció & Mini AI --- */}
      <div className="w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 dark:from-[#2e1065] dark:via-[#3b0764] dark:to-[#2e1065] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-8 md:p-12 mb-8 shadow-[8px_8px_0px_#d946ef] dark:shadow-[0_0_40px_rgba(168,85,247,0.3)] secret:shadow-[0_0_30px_rgba(28,248,93,0.3)] relative overflow-hidden group">

        <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-30 dark:opacity-30 secret:opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
          <Zap className="w-64 h-64 text-white secret:text-[#1cf85d]" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="mb-4">
            <h1 className="text-4xl md:text-6xl font-bold text-white secret:text-[#1cf85d] drop-shadow-[2px_2px_0px_#000] dark:drop-shadow-none secret:drop-shadow-[0_0_10px_rgba(28,248,93,0.8)] secret:font-mono uppercase tracking-tight">
              {t('home.welcomeTitle')}
            </h1>
          </div>
          <p className="text-lg md:text-xl text-white dark:text-purple-200 secret:text-[#1cf85d]/80 font-bold leading-relaxed secret:font-mono drop-shadow-[2px_2px_0px_#000] dark:drop-shadow-none mb-8">
            {t('home.welcomeSubtitle')}
          </p>

          <form onSubmit={handleAiSubmit} className="flex max-w-xl relative group shadow-[4px_4px_0px_#000] dark:shadow-none">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Bot className="w-6 h-6 text-black dark:text-gray-300 secret:text-[#1cf85d]" />
            </div>
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder={t('home.aiPlaceholder')}
              className="w-full bg-slate-100 dark:bg-[#121212] secret:bg-black border-4 border-black dark:border-transparent secret:border-[#1cf85d] py-4 pl-14 pr-16 text-black dark:text-white secret:text-[#1cf85d] placeholder-gray-500 secret:placeholder-[#1cf85d]/50 focus:outline-none focus:border-cyan-400 dark:focus:border-[#a855f7] secret:font-mono text-lg font-bold transition-colors"
            />
            <button type="submit" className="absolute inset-y-0 right-0 pr-4 flex items-center text-fuchsia-500 dark:text-[#a855f7] secret:text-[#1cf85d] hover:text-cyan-500 dark:hover:text-white transition-colors cursor-pointer group-hover:scale-110">
              <Send className="w-6 h-6" />
            </button>
          </form>

        </div>
      </div>

      {/* --- Napi Vicc és Tipp Szekció --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

        <div className="w-full bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[6px_6px_0px_#06b6d4] dark:shadow-[0_0_30px_rgba(168,85,247,0.2)] secret:shadow-[0_0_20px_rgba(28,248,93,0.2)] flex items-center group transition-all duration-300 secret:rounded-none hover:-translate-y-1 hover:shadow-[10px_10px_0px_#06b6d4] dark:hover:shadow-[0_0_40px_rgba(168,85,247,0.3)]">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-fuchsia-600 dark:text-[#c084fc] secret:text-[#1cf85d] mb-2 secret:font-mono uppercase flex items-center">
              {t('home.jokeTitle')}
            </h2>
            <p className="text-black dark:text-gray-200 secret:text-[#1cf85d]/90 font-medium text-lg italic secret:font-mono">
              "{dailyJoke}"
            </p>
          </div>
        </div>

        <div className="w-full bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[6px_6px_0px_#d946ef] dark:shadow-[0_0_30px_rgba(168,85,247,0.2)] secret:shadow-[0_0_20px_rgba(28,248,93,0.2)] flex items-center group transition-all duration-300 secret:rounded-none hover:-translate-y-1 hover:shadow-[10px_10px_0px_#d946ef] dark:hover:shadow-[0_0_40px_rgba(168,85,247,0.3)]">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-cyan-600 dark:text-[#c084fc] secret:text-[#1cf85d] mb-2 secret:font-mono uppercase flex items-center">
              {t('home.tipTitle')}
            </h2>
            <p className="text-black dark:text-gray-200 secret:text-[#1cf85d]/90 font-medium text-lg secret:font-mono">
              {dailyTip}
            </p>
          </div>
        </div>

      </div>

      {/* --- Rendszerstatisztika --- */}
      <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="flex items-center p-4 border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-slate-100 dark:bg-[#1e1e1e] secret:bg-transparent shadow-[4px_4px_0px_#06b6d4] dark:shadow-[4px_4px_0px_rgba(168,85,247,1)] secret:shadow-[4px_4px_0px_rgba(28,248,93,1)] secret:rounded-none transition-transform hover:-translate-y-1 cursor-default">
          <Users className="w-10 h-10 text-fuchsia-500 dark:text-[#a855f7] secret:text-[#1cf85d] mr-4" />
          <div>
            <div className="text-2xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono">{animatedUsers}</div>
            <div className="text-xs font-bold text-gray-500 secret:text-[#1cf85d]/70 uppercase secret:font-mono leading-tight">{t('home.statsUsers')}</div>
          </div>
        </div>
        <div className="flex items-center p-4 border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-slate-100 dark:bg-[#1e1e1e] secret:bg-transparent shadow-[4px_4px_0px_#d946ef] dark:shadow-[4px_4px_0px_rgba(168,85,247,1)] secret:shadow-[4px_4px_0px_rgba(28,248,93,1)] secret:rounded-none transition-transform hover:-translate-y-1 cursor-default">
          <Calculator className="w-10 h-10 text-cyan-500 dark:text-[#a855f7] secret:text-[#1cf85d] mr-4" />
          <div>
            <div className="text-2xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono">{animatedMath}+</div>
            <div className="text-xs font-bold text-gray-500 secret:text-[#1cf85d]/70 uppercase secret:font-mono leading-tight">{t('home.statsMath')}</div>
          </div>
        </div>
        <div className="flex items-center p-4 border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-slate-100 dark:bg-[#1e1e1e] secret:bg-transparent shadow-[4px_4px_0px_#8b5cf6] dark:shadow-[4px_4px_0px_rgba(168,85,247,1)] secret:shadow-[4px_4px_0px_rgba(28,248,93,1)] secret:rounded-none transition-transform hover:-translate-y-1 cursor-default">
          <FileText className="w-10 h-10 text-blue-500 dark:text-[#a855f7] secret:text-[#1cf85d] mr-4" />
          <div>
            <div className="text-2xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono">{animatedDocs}</div>
            <div className="text-xs font-bold text-gray-500 secret:text-[#1cf85d]/70 uppercase secret:font-mono leading-tight">{t('home.statsDocs')}</div>
          </div>
        </div>
      </div>

      {/* --- Hírek Szekció Cím --- */}
      <div className="flex items-center space-x-3 mb-8 border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] pb-4">
        <Megaphone className="w-8 h-8 text-cyan-500 dark:text-[#c084fc] secret:text-[#1cf85d] drop-shadow-[2px_2px_0px_#000] dark:drop-shadow-none secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
        <h2 className="text-3xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase tracking-wide">
          {t('home.latestNews')}
        </h2>
      </div>

      {/* --- Hírek Grid--- */}
      <div className="w-full">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="text-2xl font-bold text-fuchsia-600 dark:text-[#c084fc] secret:text-[#1cf85d] animate-pulse secret:font-mono uppercase">
              {t('home.loadingNews')}
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 secret:text-[#1cf85d]/70 p-12 border-4 border-dashed border-black/50 dark:border-[#a855f7]/50 secret:border-[#1cf85d]/50 font-bold text-xl secret:font-mono uppercase">
            &gt; {t('home.noNews')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {events.map((item) => (
              <div
                key={item.id}
                className="relative flex flex-col border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] overflow-hidden h-[400px] group cursor-pointer shadow-[6px_6px_0px_#000] hover:shadow-[10px_10px_0px_#d946ef] dark:shadow-md dark:hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] secret:hover:shadow-[0_0_20px_rgba(28,248,93,0.4)] transition-all duration-300"
                onClick={() => setSelectedNews(item)}
              >
                {isAdmin && (
                  <button
                    onClick={(e) => handleDeleteNews(item.id, e)}
                    className="absolute top-4 right-4 z-20 p-2 bg-slate-100 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-colors border-4 border-black dark:border-transparent secret:border-[#1cf85d] secret:bg-black secret:text-[#1cf85d] secret:hover:bg-[#1cf85d] secret:hover:text-black shadow-[2px_2px_0px_#000] dark:shadow-none"
                    title="Hír törlése"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}

                <div className="absolute inset-0 bg-[#06261b] dark:bg-black/80">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <span className="text-slate-100/30 font-bold tracking-widest text-3xl secret:font-mono uppercase">{t('home.image')}</span>
                    </div>
                  )}
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col justify-end z-10">

                  <h3 className="text-2xl font-bold text-cyan-300 secret:text-[#1cf85d] leading-tight secret:font-mono uppercase drop-shadow-[2px_2px_0px_#000]">
                    {item.title}
                  </h3>

                  <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-500 ease-in-out">
                    <div className="overflow-hidden">
                      <div className="pt-4 mt-4 border-t-4 border-fuchsia-500 secret:border-[#1cf85d]/30">
                        <p className="text-gray-100 secret:text-[#1cf85d]/80 text-sm line-clamp-3 mb-4 font-bold secret:font-mono">
                          {item.description}
                        </p>
                        <div className="flex items-center text-xs text-cyan-300 secret:text-[#1cf85d]/60 font-bold uppercase secret:font-mono">
                          <Calendar className="w-4 h-4 mr-2 shrink-0" />
                          {item.eventDate ? new Date(item.eventDate).toLocaleDateString(locale) : t('home.noDate')}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Felugró Modal --- */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4 md:p-10 backdrop-blur-sm">
          <div className="bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] w-full max-w-5xl p-0 relative shadow-[10px_10px_0px_#d946ef] dark:shadow-[0_0_50px_rgba(168,85,247,0.5)] secret:shadow-[0_0_30px_rgba(28,248,93,0.4)] flex flex-col md:flex-row max-h-full md:max-h-[85vh] overflow-hidden transition-colors">

            <button
              onClick={() => setSelectedNews(null)}
              className="absolute top-4 right-4 z-20 cursor-pointer p-2 rounded-full border-4 transition-all bg-slate-100 dark:bg-[#121212] border-black dark:border-[#a855f7] text-black dark:text-[#a855f7] secret:bg-black secret:border-[#1cf85d] secret:text-[#1cf85d] hover:bg-cyan-400 hover:text-black dark:hover:bg-gray-800 shadow-[4px_4px_0px_#d946ef] dark:shadow-md"
            >
              <X className="w-6 h-6" />
            </button>

            {selectedNews.imageUrl && (
              <div className="w-full md:w-2/5 h-64 md:h-auto border-b-4 md:border-b-0 md:border-r-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] relative shrink-0 bg-black flex items-center justify-center overflow-hidden">
                <img src={selectedNews.imageUrl} alt={selectedNews.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] pointer-events-none"></div>
              </div>
            )}

            {/* --- Modal Tartalom --- */}
            <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar flex-1 relative">
              <h1 className="text-3xl md:text-5xl font-bold text-fuchsia-600 dark:text-[#c084fc] secret:text-[#1cf85d] mb-4 secret:font-mono uppercase leading-tight pr-10">
                {selectedNews.title}
              </h1>

              <div className="flex items-center text-md font-bold text-cyan-600 dark:text-gray-400 secret:text-[#1cf85d]/70 mb-8 border-b-4 border-black dark:border-gray-600 secret:border-[#1cf85d]/50 pb-4 secret:font-mono uppercase">
                <Calendar className="w-5 h-5 mr-2" />
                {t('home.dateLabel', { date: selectedNews.eventDate ? new Date(selectedNews.eventDate).toLocaleDateString(locale) : t('home.noDateShort') })}
              </div>

              <p className="text-black dark:text-slate-100 secret:text-[#1cf85d]/90 text-lg md:text-xl font-bold leading-relaxed text-justify whitespace-pre-wrap secret:font-mono">
                {selectedNews.description}
              </p>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}