import { useState, useRef, useEffect } from 'react';
import { Mail, User, Menu, Moon, Sun, Info, HelpCircle, Settings, ShieldAlert, Flag, Calendar, Bot, Calculator, BookOpen, BookMarked, BrainCircuit, Link as LinkIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

export default function Navbar() {
  const { language, toggleLanguage, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSecretMode, setIsSecretMode] = useState(false);
  const [isFatalError, setIsFatalError] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [crtClass, setCrtClass] = useState('');
  const clickCountRef = useRef<number | null>(0);
  const timeoutRef = useRef<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    const isSecretPath = window.location.pathname === '/B4nd1';
    const isSecretSaved = localStorage.getItem('secretMode') === 'true';

    if (isSecretPath || isSecretSaved) {
      document.documentElement.classList.add('secret', 'dark');
      setIsSecretMode(true);
      setIsDarkMode(true);
      localStorage.setItem('secretMode', 'true');
      localStorage.setItem('theme', 'dark');
    } else if (document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    const handleSecretLogoff = () => {
      setIsSecretMode(false);
      localStorage.removeItem('secretMode');
    };
    window.addEventListener('secretLogoff', handleSecretLogoff);

    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:8080/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.username) {
            setUsername(data.username);
            const userRole = data.role || (data.roles && data.roles[0]) || '';
            if (userRole.includes('ADMIN') || data.isAdmin) {
              setIsAdmin(true);
            }
          }
        })
        .catch(err => console.error("Hiba a név lekérésekor:", err));
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('secretLogoff', handleSecretLogoff);
    };
  }, []);

  const handleThemeToggle = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);

    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    clickCountRef.current = (clickCountRef.current || 0) + 1;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      clickCountRef.current = 0;
    }, 500);

    if (clickCountRef.current >= 10 && !isAnimating && !isFatalError) {
      if (isSecretMode) {
        triggerFatalErrorEffect();
      } else {
        triggerSecretEffect();
      }
    }
  };

  const triggerSecretEffect = () => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
    setIsAnimating(true);
    clickCountRef.current = 0;

    setCrtClass('crt-off');
    setTimeout(() => {
      document.documentElement.classList.add('secret');
      document.documentElement.classList.add('dark');
      localStorage.setItem('secretMode', 'true');
      setIsDarkMode(true);
      setIsSecretMode(true);
      navigate('/B4nd1');
      setTimeout(() => {
        setCrtClass('crt-on');
        setTimeout(() => {
          setIsAnimating(false);
          setCrtClass('');
        }, 600);
      }, 3000);
    }, 600);
  };

  const triggerFatalErrorEffect = () => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
    setIsAnimating(true);
    clickCountRef.current = 0;

    setCrtClass('crt-off');

    setTimeout(() => {
      setIsFatalError(true);
      setTimeout(() => {
        setCrtClass('crt-on');
        setTimeout(() => {
          setIsAnimating(false);
          setCrtClass('');
        }, 600);
      }, 3000);
    }, 600);
  };

  const handleProfileClick = () => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsProfileMenuOpen(!isProfileMenuOpen);
      setIsMenuOpen(false);
    } else {
      navigate('/login');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsProfileMenuOpen(false);
    navigate('/');
    window.location.reload();
  };

  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen);
    setIsProfileMenuOpen(false);
  };

  return (
    <>
      <nav ref={navRef} className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 dark:from-[#1e1e1e] dark:to-[#3b0764] text-black dark:text-white flex items-center justify-between px-6 py-4 border-b-4 border-black dark:border-[#a855f7] shadow-[4px_4px_0px_#000] dark:shadow-[0_4px_20px_rgba(168,85,247,0.4)] relative z-40 transition-all duration-300">

        {/* --- Bal oldal: Ikonok és Menüpontok --- */}
        <div className="flex items-center space-x-10">
          <Link to={isSecretMode ? "/B4nd1" : "/"} className="cursor-pointer group">
            <span className="inline-flex items-center justify-center text-2xl font-bold border-4 border-black dark:border-slate-100 w-12 h-10 leading-none group-hover:bg-black group-hover:text-cyan-400 dark:group-hover:bg-slate-100 dark:group-hover:text-[#a855f7] transition-all duration-300 shadow-[2px_2px_0px_#000] dark:shadow-sm">
              ƎK
            </span>
          </Link>

          <div className="hidden md:flex space-x-6 text-lg font-bold uppercase tracking-wide">
            <Link to="/naptar" className="hover:text-white hover:drop-shadow-[2px_2px_0px_#000] dark:hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">{t('nav.calendar')}</Link>
            <Link to="/ai" className="hover:text-white hover:drop-shadow-[2px_2px_0px_#000] dark:hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">{t('nav.ai')}</Link>
            <Link to="/kalkulator" className="hover:text-white hover:drop-shadow-[2px_2px_0px_#000] dark:hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">{t('nav.calculators')}</Link>
            <Link to="/tudastar" className="hover:text-white hover:drop-shadow-[2px_2px_0px_#000] dark:hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">{t('nav.knowledge')}</Link>
            <Link to="/hivatkozas" className="hover:text-white hover:drop-shadow-[2px_2px_0px_#000] dark:hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">{t('nav.reference')}</Link>
            <Link to="/fokusz" className="hover:text-white hover:drop-shadow-[2px_2px_0px_#000] dark:hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">{t('nav.focus')}</Link>
            <Link to="/links" className="hover:text-white hover:drop-shadow-[2px_2px_0px_#000] dark:hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">{t('nav.links')}</Link>
          </div>
        </div>

        {/* --- Jobb oldal: Ikonok --- */}
        <div className="flex items-center space-x-4">

          <button
            type="button"
            onClick={toggleLanguage}
            aria-label={language === 'hu' ? t('nav.switchToEn') : t('nav.switchToHu')}
            className="cursor-pointer hover:scale-110 hover:text-white dark:hover:text-gray-200 transition-all flex items-center space-x-1"
          >
            <Flag className="w-6 h-6" />
            <span className="text-xs font-bold uppercase">{language}</span>
          </button>

          <Link to="/ideabox" onClick={() => { setIsMenuOpen(false); setIsProfileMenuOpen(false); }}>
            <Mail className="w-6 h-6 cursor-pointer hover:text-white dark:hover:text-gray-200 hover:scale-110 transition-transform" />
          </Link>

          <User
            onClick={handleProfileClick}
            className="w-6 h-6 cursor-pointer hover:text-white dark:hover:text-gray-200 hover:scale-110 transition-transform"
          />

          <Menu
            onClick={handleMenuClick}
            className="w-7 h-7 cursor-pointer hover:text-white dark:hover:text-gray-200 hover:scale-110 transition-transform"
          />
        </div>

        {/* --- Fő Dropdown Menü --- */}
        {isMenuOpen && (
          /* Árnyék balra tolva (-8px), hogy ne lógjon le a képernyő jobb széléről! */
          <div className="absolute top-full right-0 mt-[4px] bg-slate-100 dark:bg-[#3b0764] secret:bg-black w-72 shadow-[-8px_8px_0px_#d946ef] dark:shadow-[-8px_8px_30px_rgba(168,85,247,0.3)] secret:shadow-none flex flex-col z-50 border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] transition-colors duration-300">

            {/* Felső sáv élénk ciánnal a halvány helyett */}
            <div className="flex items-center justify-between p-4 border-b-4 border-black dark:border-[#a855f7]/30 secret:border-[#1cf85d]/50 bg-cyan-400 dark:bg-transparent">
              <div className="flex items-center space-x-2">
                {isDarkMode ? (
                  <Moon className="w-5 h-5 text-indigo-300 drop-shadow-[0_0_5px_rgba(165,180,252,0.8)] secret:text-[#1cf85d] secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                ) : (
                  <Sun className="w-5 h-5 text-fuchsia-600 drop-shadow-[1px_1px_0px_#000]" />
                )}
                <span className="font-bold text-sm text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                  {isDarkMode ? t('nav.dark') : t('nav.light')}
                </span>
              </div>

              <button
                onClick={handleThemeToggle}
                className={`w-11 h-6 rounded-full relative transition-colors duration-300 cursor-pointer shadow-inner border-2 border-black dark:border-transparent ${isDarkMode ? 'bg-[#a855f7] secret:bg-[#1cf85d] shadow-[0_0_10px_rgba(168,85,247,0.6)] secret:shadow-[0_0_10px_rgba(28,248,93,0.6)]' : 'bg-fuchsia-500 shadow-[2px_2px_0px_#000]'
                  }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 border-black dark:border-transparent absolute top-0.5 transition-transform duration-300 shadow-md ${isDarkMode ? 'bg-slate-100 secret:bg-black translate-x-5' : 'bg-slate-100 translate-x-1'
                  }`}></div>
              </button>
            </div>

            {/* --- Fő navigáció csak mobilon (ikonokkal) --- */}
            <div className="flex md:hidden flex-col py-2 border-b-4 border-black dark:border-[#a855f7]/30 secret:border-[#1cf85d]/30">
              <span className="px-4 py-2 text-xs font-black text-black dark:text-white/70 secret:text-[#1cf85d]/70 uppercase tracking-wider secret:font-mono">{t('nav.menu')}</span>

              <Link to="/naptar" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 border-l-4 border-transparent hover:border-black hover:bg-cyan-400 dark:hover:border-[#a855f7] secret:hover:border-[#1cf85d] dark:hover:bg-white/10 secret:hover:bg-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] secret:hover:text-black font-bold flex items-center transition-all secret:font-mono uppercase text-sm">
                <Calendar className="w-4 h-4 mr-3 text-black dark:text-white" /> {t('nav.calendar')}
              </Link>
              <Link to="/ai" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 border-l-4 border-transparent hover:border-black hover:bg-cyan-400 dark:hover:border-[#a855f7] secret:hover:border-[#1cf85d] dark:hover:bg-white/10 secret:hover:bg-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] secret:hover:text-black font-bold flex items-center transition-all secret:font-mono uppercase text-sm">
                <Bot className="w-4 h-4 mr-3 text-black dark:text-white" /> {t('nav.ai')}
              </Link>
              <Link to="/kalkulator" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 border-l-4 border-transparent hover:border-black hover:bg-cyan-400 dark:hover:border-[#a855f7] secret:hover:border-[#1cf85d] dark:hover:bg-white/10 secret:hover:bg-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] secret:hover:text-black font-bold flex items-center transition-all secret:font-mono uppercase text-sm">
                <Calculator className="w-4 h-4 mr-3 text-black dark:text-white" /> {t('nav.calculators')}
              </Link>
              <Link to="/tudastar" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 border-l-4 border-transparent hover:border-black hover:bg-cyan-400 dark:hover:border-[#a855f7] secret:hover:border-[#1cf85d] dark:hover:bg-white/10 secret:hover:bg-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] secret:hover:text-black font-bold flex items-center transition-all secret:font-mono uppercase text-sm">
                <BookOpen className="w-4 h-4 mr-3 text-black dark:text-white" /> {t('nav.knowledge')}
              </Link>
              <Link to="/hivatkozas" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 border-l-4 border-transparent hover:border-black hover:bg-cyan-400 dark:hover:border-[#a855f7] secret:hover:border-[#1cf85d] dark:hover:bg-white/10 secret:hover:bg-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] secret:hover:text-black font-bold flex items-center transition-all secret:font-mono uppercase text-sm">
                <BookMarked className="w-4 h-4 mr-3 text-black dark:text-white" /> {t('nav.reference')}
              </Link>
              <Link to="/fokusz" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 border-l-4 border-transparent hover:border-black hover:bg-cyan-400 dark:hover:border-[#a855f7] secret:hover:border-[#1cf85d] dark:hover:bg-white/10 secret:hover:bg-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] secret:hover:text-black font-bold flex items-center transition-all secret:font-mono uppercase text-sm">
                <BrainCircuit className="w-4 h-4 mr-3 text-black dark:text-white" /> {t('nav.focus')}
              </Link>
              <Link to="/links" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 border-l-4 border-transparent hover:border-black hover:bg-cyan-400 dark:hover:border-[#a855f7] secret:hover:border-[#1cf85d] dark:hover:bg-white/10 secret:hover:bg-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] secret:hover:text-black font-bold flex items-center transition-all secret:font-mono uppercase text-sm">
                <LinkIcon className="w-4 h-4 mr-3 text-black dark:text-white" /> {t('nav.links')}
              </Link>
            </div>

            <div className="flex flex-col py-2">
              <span className="px-4 py-2 text-xs font-black text-black dark:text-white/70 secret:text-[#1cf85d]/70 uppercase tracking-wider secret:font-mono">{t('nav.system')}</span>
              {/* Halvány világoskék helyett erős neon fukszia hover hatás fekete ikonokkal */}
              <Link to="/about" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 border-l-4 border-transparent hover:border-black hover:bg-fuchsia-400 dark:hover:border-[#a855f7] secret:hover:border-[#1cf85d] dark:hover:bg-white/10 secret:hover:bg-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] secret:hover:text-black font-bold flex items-center transition-all secret:font-mono uppercase text-sm">
                <Info className="w-4 h-4 mr-3 text-black dark:text-white" /> {t('nav.about')}
              </Link>
              <Link to="/faq" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 border-l-4 border-transparent hover:border-black hover:bg-fuchsia-400 dark:hover:border-[#a855f7] secret:hover:border-[#1cf85d] dark:hover:bg-white/10 secret:hover:bg-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] secret:hover:text-black font-bold flex items-center transition-all secret:font-mono uppercase text-sm">
                <HelpCircle className="w-4 h-4 mr-3 text-black dark:text-white" /> {t('nav.faq')}
              </Link>

              <Link to="/settings" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 border-l-4 border-transparent hover:border-black hover:bg-fuchsia-400 dark:hover:border-[#a855f7] secret:hover:border-[#1cf85d] dark:hover:bg-white/10 secret:hover:bg-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] secret:hover:text-black font-bold flex items-center transition-all secret:font-mono uppercase text-sm">
                <Settings className="w-4 h-4 mr-3 text-black dark:text-white" /> {t('nav.settings')}
              </Link>

              {isAdmin && (
                <>
                  <div className="border-t-4 border-black dark:border-[#a855f7]/30 secret:border-[#1cf85d]/30 my-1 mx-2"></div>
                  <span className="px-4 py-2 text-xs font-black text-black dark:text-red-400 secret:text-[#1cf85d] uppercase tracking-wider secret:font-mono">{t('nav.adminSection')}</span>
                  <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="px-4 py-3 border-l-4 border-transparent hover:border-black hover:bg-red-400 dark:hover:border-red-500 secret:hover:border-[#1cf85d] dark:hover:bg-red-500/20 secret:hover:bg-[#1cf85d] text-red-600 hover:text-black dark:text-red-300 dark:hover:text-white secret:text-[#1cf85d] secret:hover:text-black font-bold flex items-center transition-all secret:font-mono uppercase text-sm">
                    <ShieldAlert className="w-4 h-4 mr-3 text-red-600 group-hover:text-black" /> {t('nav.adminPanel')}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        {/* --- Profil Dropdown Menü --- */}
        {isProfileMenuOpen && (
          /* Ugyanúgy befelé (balra) néző árnyék */
          <div className="absolute top-full right-0 mt-[4px] bg-slate-100 dark:bg-[#3b0764] secret:bg-black w-56 shadow-[-8px_8px_0px_#06b6d4] dark:shadow-[0_10px_30px_rgba(168,85,247,0.3)] secret:shadow-none flex flex-col z-50 border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] transition-colors duration-300">

            {/* Élénkebb felső sáv és garantáltan sötét szöveg */}
            <div className="px-4 py-3 border-b-4 border-black dark:border-[#a855f7]/30 secret:border-[#1cf85d] bg-fuchsia-400 dark:bg-black/20 secret:bg-transparent cursor-default">
              <span className="block text-xs text-black dark:text-white/70 secret:text-[#1cf85d]/70 font-bold uppercase tracking-wider mb-0.5 secret:font-mono">{t('nav.loggedInAs')}</span>
              <span className="font-bold text-xl text-black dark:text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-none truncate block secret:font-mono">{username || t('nav.userFallback')}</span>
            </div>

            <Link
              to="/profile"
              onClick={() => setIsProfileMenuOpen(false)}
              className="px-4 py-3 border-b-4 border-black dark:border-[#a855f7]/20 secret:border-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] font-bold hover:bg-cyan-400 hover:text-black dark:hover:bg-white/10 secret:hover:bg-[#1cf85d] secret:hover:text-black transition-colors flex items-center secret:font-mono uppercase border-l-4 border-transparent hover:border-l-black"
            >
              <User className="w-4 h-4 mr-2 text-black dark:text-white" /> {t('nav.myProfile')}
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-3 text-left text-red-600 dark:text-red-300 secret:text-[#1cf85d] hover:text-black hover:bg-red-400 dark:hover:bg-white/10 secret:hover:bg-[#1cf85d] font-bold transition-colors cursor-pointer flex items-center secret:font-mono uppercase border-l-4 border-transparent hover:border-l-black"
            >
              {t('nav.logout')}
            </button>
          </div>
        )}

      </nav>

      {/* --- Teljes képernyős TV effekt --- */}
      {isAnimating && (
        <div className={`crt-overlay ${crtClass}`}></div>
      )}

      {/* --- Végleges Fatal Error Képernyő --- */}
      {isFatalError && (
        <div className="fixed inset-0 bg-black z-[99990] flex flex-col items-center justify-center text-[#1cf85d] font-mono p-6 text-center selection:bg-[#1cf85d] selection:text-black">
          <p className="text-3xl md:text-5xl font-bold mb-4 [text-shadow:0_0_10px_rgba(28,248,93,0.8)] animate-pulse">
            FATAL ERROR: SYSTEM CORRUPT
          </p>
          <p className="text-lg md:text-xl mb-2 opacity-80 uppercase">
            Bandi_OS.sys has encountered an unrecoverable fault.
          </p>
          <p className="text-lg md:text-xl mb-12 opacity-80 uppercase">
            Stop Code: 0x000000F4 MEMORY_MANAGEMENT
          </p>
          <button
            onClick={() => {
              document.documentElement.classList.remove('secret');
              localStorage.removeItem('secretMode');
              window.location.href = '/';
            }}
            className="border-4 border-[#1cf85d] px-6 py-2 hover:bg-[#1cf85d] hover:text-black transition-none uppercase cursor-pointer text-xl font-bold [text-shadow:0_0_5px_rgba(28,248,93,0.8)]"
          >
            [ RESET ]
          </button>
        </div>
      )}
    </>
  );
}