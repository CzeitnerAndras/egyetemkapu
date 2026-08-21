import { useState, useEffect } from 'react';
import { X, Megaphone, Zap, Calendar} from 'lucide-react';
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

export default function HomePage() {
  const { t, locale, language } = useLanguage();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNews, setSelectedNews] = useState<EventItem | null>(null);

  useEffect(() => {
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

  {/* --- Napi vicc kiválasztása --- */ }
  const dayOfYear = Math.floor(Date.now() / 86400000);
  const dailyJoke = language === 'en' ? jokes[dayOfYear % jokes.length].en : jokes[dayOfYear % jokes.length].hu;

  return (
    <main className="w-full px-6 lg:px-16 mx-auto mt-8 pb-12 relative z-20">

      {/* --- Üdvözlő Szekció --- */}
      <div className="w-full bg-gradient-to-r from-[#800000] via-[#a51a1a] to-[#800000] dark:from-[#2e1065] dark:via-[#3b0764] dark:to-[#2e1065] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-8 md:p-12 mb-12 shadow-[0_20px_50px_rgba(128,0,0,0.3)] dark:shadow-[0_0_40px_rgba(168,85,247,0.3)] secret:shadow-[0_0_30px_rgba(28,248,93,0.3)] relative overflow-hidden group">

        <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-20 dark:opacity-30 secret:opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
          <Zap className="w-64 h-64 text-white secret:text-[#1cf85d]" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="mb-4">
            <h1 className="text-4xl md:text-6xl font-black text-white secret:text-[#1cf85d] drop-shadow-lg secret:drop-shadow-[0_0_10px_rgba(28,248,93,0.8)] secret:font-mono uppercase tracking-tight">
              {t('home.welcomeTitle')}
            </h1>
          </div>
          <p className="text-lg md:text-xl text-red-100 dark:text-purple-200 secret:text-[#1cf85d]/80 font-medium leading-relaxed secret:font-mono drop-shadow-md">
            {t('home.welcomeSubtitle')}
          </p>
        </div>
      </div>

      {/* --- Napi Vicc Szekció --- */}
      <div className="w-full bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] p-6 mb-12 shadow-[0_10px_30px_rgba(128,0,0,0.1)] dark:shadow-[0_0_30px_rgba(168,85,247,0.2)] secret:shadow-[0_0_20px_rgba(28,248,93,0.2)] flex items-center group transition-all duration-300 secret:rounded-none">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-2 secret:font-mono uppercase flex items-center">
            {t('home.jokeTitle')}
          </h2>
          <p className="text-gray-800 dark:text-gray-200 secret:text-[#1cf85d]/90 font-medium text-lg italic secret:font-mono">
            "{dailyJoke}"
          </p>
        </div>
      </div>

      {/* --- Hírek Szekció Cím --- */}
      <div className="flex items-center space-x-3 mb-8 border-b-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] pb-4">
        <Megaphone className="w-8 h-8 text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] drop-shadow-sm secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
        <h2 className="text-3xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
          {t('home.latestNews')}
        </h2>
      </div>

      {/* --- Hírek Grid--- */}
      <div className="w-full">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="text-2xl font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] animate-pulse secret:font-mono uppercase">
              {t('home.loadingNews')}
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center text-gray-600 dark:text-gray-400 secret:text-[#1cf85d]/70 p-12 border-4 border-dashed border-[#800000]/50 dark:border-[#a855f7]/50 secret:border-[#1cf85d]/50 font-bold text-xl secret:font-mono uppercase">
            &gt; {t('home.noNews')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {events.map((item) => (
              <div
                key={item.id}
                className="relative flex flex-col border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] overflow-hidden h-[400px] group cursor-pointer shadow-md hover:shadow-[0_20px_40px_rgba(128,0,0,0.3)] dark:hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] secret:hover:shadow-[0_0_20px_rgba(28,248,93,0.4)] transition-all duration-300"
                onClick={() => setSelectedNews(item)}
              >
                <div className="absolute inset-0 bg-[#06261b] dark:bg-black/80">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <span className="text-white/30 font-bold tracking-widest text-3xl secret:font-mono uppercase">{t('home.image')}</span>
                    </div>
                  )}
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col justify-end z-10">

                  <h3 className="text-2xl font-bold text-white secret:text-[#1cf85d] leading-tight secret:font-mono uppercase drop-shadow-md">
                    {item.title}
                  </h3>

                  <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-500 ease-in-out">
                    <div className="overflow-hidden">
                      <div className="pt-4 mt-4 border-t-2 border-white/20 secret:border-[#1cf85d]/30">
                        <p className="text-gray-300 secret:text-[#1cf85d]/80 text-sm line-clamp-3 mb-4 secret:font-mono">
                          {item.description}
                        </p>
                        <div className="flex items-center text-xs text-gray-400 secret:text-[#1cf85d]/60 font-bold uppercase secret:font-mono">
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
          <div className="bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] w-full max-w-5xl p-0 relative shadow-[0_20px_50px_rgba(128,0,0,0.4)] dark:shadow-[0_0_50px_rgba(168,85,247,0.5)] secret:shadow-[0_0_30px_rgba(28,248,93,0.4)] flex flex-col md:flex-row max-h-full md:max-h-[85vh] overflow-hidden transition-colors">

            <button
              onClick={() => setSelectedNews(null)}
              className="absolute top-4 right-4 z-20 cursor-pointer p-2 rounded-full border-2 transition-all bg-white dark:bg-[#121212] border-[#800000] dark:border-[#a855f7] text-[#800000] dark:text-[#a855f7] secret:bg-black secret:border-[#1cf85d] secret:text-[#1cf85d] hover:bg-gray-100 dark:hover:bg-gray-800 shadow-md"
            >
              <X className="w-6 h-6" />
            </button>

            {selectedNews.imageUrl && (
              <div className="w-full md:w-2/5 h-64 md:h-auto border-b-4 md:border-b-0 md:border-r-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] relative shrink-0 bg-[#06261b] dark:bg-black/80 flex items-center justify-center overflow-hidden">
                <img src={selectedNews.imageUrl} alt={selectedNews.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] pointer-events-none"></div>
              </div>
            )}

            {/* --- Modal Tartalom --- */}
            <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar flex-1 relative">
              <h1 className="text-3xl md:text-5xl font-black text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-4 secret:font-mono uppercase leading-tight pr-10">
                {selectedNews.title}
              </h1>

              <div className="flex items-center text-md font-bold text-gray-500 dark:text-gray-400 secret:text-[#1cf85d]/70 mb-8 border-b-2 border-gray-300 dark:border-gray-600 secret:border-[#1cf85d]/50 pb-4 secret:font-mono uppercase">
                <Calendar className="w-5 h-5 mr-2" />
                {t('home.dateLabel', { date: selectedNews.eventDate ? new Date(selectedNews.eventDate).toLocaleDateString(locale) : t('home.noDateShort') })}
              </div>

              <p className="text-gray-800 dark:text-gray-200 secret:text-[#1cf85d]/90 text-lg md:text-xl leading-relaxed text-justify whitespace-pre-wrap secret:font-mono">
                {selectedNews.description}
              </p>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}