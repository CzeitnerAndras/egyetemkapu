import { useState, useRef, useEffect, useCallback } from 'react';
import { Mail, User, Menu, Moon, Sun, Info, HelpCircle, Settings, ShieldAlert, Flag, Calendar, Bot, Calculator, BookOpen, BookMarked, BrainCircuit, Link as LinkIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { fetchWithAuth, clearSession } from '../utils/authApi';

export default function Navbar() {
  const { language, toggleLanguage, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('token'));
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSecretMode, setIsSecretMode] = useState(false);
  const [isFatalError, setIsFatalError] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [crtClass, setCrtClass] = useState('');
  const clickCountRef = useRef<number | null>(0);
  const timeoutRef = useRef<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const navDragRef = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });
  const [navOverflow, setNavOverflow] = useState({ left: false, right: false });
  const navigate = useNavigate();

  const updateNavOverflow = useCallback(() => {
    const el = navScrollRef.current;
    if (!el) {
      setNavOverflow({ left: false, right: false });
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    const next = {
      left: el.scrollLeft > 4,
      right: maxScroll - el.scrollLeft > 4,
    };
    setNavOverflow((prev) => (
      prev.left === next.left && prev.right === next.right ? prev : next
    ));
  }, []);

  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;

    updateNavOverflow();
    el.addEventListener('scroll', updateNavOverflow, { passive: true });
    window.addEventListener('resize', updateNavOverflow);

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    const onNativeDragStart = (event: DragEvent) => {
      event.preventDefault();
    };
    el.addEventListener('dragstart', onNativeDragStart, true);

    return () => {
      el.removeEventListener('scroll', updateNavOverflow);
      window.removeEventListener('resize', updateNavOverflow);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('dragstart', onNativeDragStart, true);
    };
  }, [updateNavOverflow, language]);

  const loadCurrentUser = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setIsLoggedIn(false);
      setUsername('');
      setIsAdmin(false);
      return;
    }

    setIsLoggedIn(true);

    try {
      const res = await fetchWithAuth('/api/users/me', {}, { redirectOnAuthFailure: false });

      if (res.status === 401 || res.status === 403) {
        clearSession();
        setIsLoggedIn(false);
        setUsername('');
        setIsAdmin(false);
        return;
      }

      if (!res.ok) return;

      const data = await res.json();
      if (data && data.username) {
        setUsername(data.username);
        const userRole = data.role || (data.roles && data.roles[0]) || '';
        setIsAdmin(userRole.includes('ADMIN') || !!data.isAdmin);
      }
    } catch (err) {
      console.error("Hiba a név lekérésekor:", err);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    const isSecretPath = window.location.pathname === '/S3CR3T';
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
      localStorage.removeItem('terminalHacked');
    };
    window.addEventListener('secretLogoff', handleSecretLogoff);

    loadCurrentUser();

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('secretLogoff', handleSecretLogoff);
    };
  }, [loadCurrentUser]);

  useEffect(() => {
    window.addEventListener('authChanged', loadCurrentUser);
    return () => window.removeEventListener('authChanged', loadCurrentUser);
  }, [loadCurrentUser]);

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
      navigate('/S3CR3T');
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

  const triggerLogoffEffect = () => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
    setIsAnimating(true);
    clickCountRef.current = 0;

    setCrtClass('crt-off');

    setTimeout(() => {
      document.documentElement.classList.remove('secret');
      localStorage.removeItem('secretMode');
      localStorage.removeItem('terminalHacked');
      setIsSecretMode(false);
      navigate('/');
      setTimeout(() => {
        setCrtClass('crt-on');
        setTimeout(() => {
          setIsAnimating(false);
          setCrtClass('');
        }, 600);
      }, 600);
    }, 600);
  };

  useEffect(() => {
    window.addEventListener('triggerFatalError', triggerFatalErrorEffect);
    return () => window.removeEventListener('triggerFatalError', triggerFatalErrorEffect);
  }, []);

  useEffect(() => {
    window.addEventListener('triggerLogoffEffect', triggerLogoffEffect);
    return () => window.removeEventListener('triggerLogoffEffect', triggerLogoffEffect);
  }, []);

  const handleProfileClick = () => {
    if (isLoggedIn) {
      setIsProfileMenuOpen(!isProfileMenuOpen);
      setIsMenuOpen(false);
    } else {
      navigate('/login');
    }
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
      } catch (error) {
        console.error('Hiba a kijelentkezéskor', error);
      }
    }
    clearSession();
    setIsLoggedIn(false);
    setIsProfileMenuOpen(false);
    navigate('/');
    window.location.reload();
  };

  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen);
    setIsProfileMenuOpen(false);
  };

  const handleNavPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = navScrollRef.current;
    if (!el || event.button > 0) return;
    navDragRef.current = {
      active: true,
      startX: event.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
    el.classList.add('is-dragging');
    el.setPointerCapture?.(event.pointerId);
  };

  const handleNavDragStart = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
  };

  const handleNavPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = navScrollRef.current;
    if (!el || !navDragRef.current.active) return;
    const delta = event.clientX - navDragRef.current.startX;
    if (Math.abs(delta) > 6) {
      navDragRef.current.moved = true;
      event.preventDefault();
    }
    el.scrollLeft = navDragRef.current.scrollLeft - delta;
  };

  const endNavDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = navScrollRef.current;
    navDragRef.current.active = false;
    el?.classList.remove('is-dragging');
    if (el?.hasPointerCapture?.(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
  };

  const handleNavClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (navDragRef.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      navDragRef.current.moved = false;
    }
  };

  const pageLinks = [
    { to: '/naptar', label: t('nav.calendar'), icon: Calendar },
    { to: '/ai', label: t('nav.ai'), icon: Bot },
    { to: '/kalkulator', label: t('nav.calculators'), icon: Calculator },
    { to: '/tudastar', label: t('nav.knowledge'), icon: BookOpen },
    { to: '/hivatkozas', label: t('nav.reference'), icon: BookMarked },
    { to: '/tanuloszoba', label: t('nav.focus'), icon: BrainCircuit },
    { to: '/linktar', label: t('nav.links'), icon: LinkIcon },
  ];

  return (
    <>
      <nav ref={navRef} className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black text-black dark:text-white secret:text-[#1cf85d] flex items-center justify-between gap-3 sm:gap-4 flex-nowrap px-4 sm:px-6 py-3 sm:py-4 border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-[0_4px_20px_rgba(168,85,247,0.4)] secret:shadow-[0_0_20px_rgba(28,248,93,0.3)] relative z-40 transition-all duration-300">

        <Link to={isSecretMode ? "/S3CR3T" : "/"} className="cursor-pointer group shrink-0">
          <span className="inline-flex items-center justify-center text-2xl font-bold border-4 border-black dark:border-slate-100 secret:border-[#1cf85d] w-12 h-10 leading-none group-hover:bg-black group-hover:text-cyan-400 dark:group-hover:bg-slate-100 dark:group-hover:text-[#a855f7] secret:group-hover:bg-[#1cf85d] secret:group-hover:text-black transition-all duration-300 shadow-[2px_2px_0px_#000] dark:shadow-sm secret:shadow-[0_0_10px_rgba(28,248,93,0.5)]">
            ƎK
          </span>
        </Link>

        <div className="hidden md:block relative min-w-0 flex-1 md:ml-6 lg:ml-10">
          {navOverflow.left && (
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-cyan-400 to-transparent dark:from-[#1e1e1e] secret:from-black"></div>
          )}
          {navOverflow.right && (
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-fuchsia-400 to-transparent dark:from-[#3b0764] secret:from-black"></div>
          )}
          <div
            ref={navScrollRef}
            onPointerDown={handleNavPointerDown}
            onPointerMove={handleNavPointerMove}
            onPointerUp={endNavDrag}
            onPointerCancel={endNavDrag}
            onDragStart={handleNavDragStart}
            onClickCapture={handleNavClickCapture}
            className="nav-scroll flex flex-nowrap items-center gap-5 lg:gap-6 text-sm lg:text-lg font-bold uppercase tracking-wide whitespace-nowrap"
          >
            {pageLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                draggable={false}
                onDragStart={handleNavDragStart}
                className="shrink-0 hover:text-white hover:drop-shadow-[2px_2px_0px_#000] dark:hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] secret:hover:drop-shadow-[0_0_8px_rgba(28,248,93,0.8)] transition-all"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* --- Jobb oldal: Ikonok --- */}
        <div className="flex items-center space-x-2 sm:space-x-4 shrink-0 ml-auto">

          <button
            type="button"
            onClick={toggleLanguage}
            aria-label={language === 'hu' ? t('nav.switchToEn') : t('nav.switchToHu')}
            className="cursor-pointer hover:scale-110 hover:text-white dark:hover:text-gray-200 secret:hover:text-white transition-all flex items-center space-x-1"
          >
            <Flag className="w-6 h-6" />
            <span className="text-xs font-bold uppercase">{language}</span>
          </button>

          <Link to="/otletlada" onClick={() => { setIsMenuOpen(false); setIsProfileMenuOpen(false); }}>
            <Mail className="w-6 h-6 cursor-pointer hover:text-white dark:hover:text-gray-200 secret:hover:text-white hover:scale-110 transition-transform" />
          </Link>

          <User
            onClick={handleProfileClick}
            className="w-6 h-6 cursor-pointer hover:text-white dark:hover:text-gray-200 secret:hover:text-white hover:scale-110 transition-transform"
          />

          <Menu
            onClick={handleMenuClick}
            className="w-7 h-7 cursor-pointer hover:text-white dark:hover:text-gray-200 secret:hover:text-white hover:scale-110 transition-transform"
          />
        </div>

        {/* --- Fő Dropdown Menü --- */}
        {isMenuOpen && (
          <div className="absolute top-full right-0 mt-[4px] bg-slate-100 dark:bg-[#3b0764] secret:bg-black w-72 max-w-[calc(100vw-0.75rem)] shadow-[-8px_8px_0px_#d946ef] dark:shadow-[-8px_8px_30px_rgba(168,85,247,0.3)] secret:shadow-none flex flex-col z-50 border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] transition-colors duration-300">

            <div className="flex items-center justify-between p-4 border-b-4 border-black dark:border-[#a855f7]/30 secret:border-[#1cf85d]/50 bg-cyan-400 dark:bg-transparent secret:bg-transparent">
              <div className="flex items-center space-x-2">
                {isDarkMode ? (
                  <Moon className="w-5 h-5 text-indigo-300 drop-shadow-[0_0_5px_rgba(165,180,252,0.8)] secret:text-[#1cf85d] secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                ) : (
                  <Sun className="w-5 h-5 text-fuchsia-600 drop-shadow-[1px_1px_0px_#000] secret:text-[#1cf85d] secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                )}
                <span className="font-bold text-sm text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                  {isDarkMode ? t('nav.dark') : t('nav.light')}
                </span>
              </div>

              <button
                onClick={handleThemeToggle}
                className={`w-11 h-6 rounded-full relative transition-colors duration-300 cursor-pointer shadow-inner border-2 border-black dark:border-transparent secret:border-[#1cf85d] ${isDarkMode ? 'bg-[#a855f7] secret:bg-[#1cf85d] shadow-[0_0_10px_rgba(168,85,247,0.6)] secret:shadow-[0_0_10px_rgba(28,248,93,0.6)]' : 'bg-fuchsia-500 shadow-[2px_2px_0px_#000] secret:bg-transparent secret:shadow-none'
                  }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 border-black dark:border-transparent secret:border-transparent absolute top-0.5 transition-transform duration-300 shadow-md ${isDarkMode ? 'bg-slate-100 secret:bg-black translate-x-5' : 'bg-slate-100 secret:bg-[#1cf85d] translate-x-1'
                  }`}></div>
              </button>
            </div>

            <div className="flex md:hidden flex-col py-2 border-b-4 border-black dark:border-[#a855f7]/30 secret:border-[#1cf85d]/30">
              <span className="px-4 py-2 text-xs font-black text-black dark:text-white/70 secret:text-[#1cf85d]/70 uppercase tracking-wider secret:font-mono">{t('nav.menu')}</span>
              {pageLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMenuOpen(false)}
                    className="px-4 py-3 border-l-4 border-transparent hover:border-black hover:bg-cyan-400 dark:hover:border-[#a855f7] secret:hover:border-[#1cf85d] dark:hover:bg-white/10 secret:hover:bg-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] secret:hover:text-black font-bold flex items-center transition-all secret:font-mono uppercase text-sm"
                  >
                    <Icon className="w-4 h-4 mr-3 text-black dark:text-white" /> {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-col py-2">
              <span className="px-4 py-2 text-xs font-black text-black dark:text-white/70 secret:text-[#1cf85d]/70 uppercase tracking-wider secret:font-mono">{t('nav.system')}</span>
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
          <div className="absolute top-full right-0 mt-[4px] bg-slate-100 dark:bg-[#3b0764] secret:bg-black w-56 max-w-[calc(100vw-0.75rem)] shadow-[-8px_8px_0px_#06b6d4] dark:shadow-[0_10px_30px_rgba(168,85,247,0.3)] secret:shadow-none flex flex-col z-50 border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] transition-colors duration-300">

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
        <div className="fixed inset-0 bg-[#0a1a0f] z-[99990] flex flex-col items-center justify-center text-[#1cf85d] font-mono p-6 text-center selection:bg-[#1cf85d] selection:text-black">

          <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 4px)' }}></div>
          <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(circle, transparent 50%, rgba(0,0,0,0.9) 120%)' }}></div>

          <div className="relative z-10 flex flex-col items-center justify-center">
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
                localStorage.removeItem('terminalHacked');
                window.location.href = '/';
              }}
              className="border-4 border-[#1cf85d] bg-[#0a1a0f] px-6 py-2 hover:bg-[#1cf85d] hover:text-black transition-none uppercase cursor-pointer text-xl font-bold [text-shadow:0_0_5px_rgba(28,248,93,0.8)] hover:[text-shadow:none]"
            >
              [ RESET ]
            </button>
          </div>
        </div>
      )}
    </>
  );
}