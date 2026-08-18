import { useState, useRef, useEffect } from 'react';
import { Mail, User, Menu, Moon, Sun } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [username, setUsername] = useState('Felhasználó');
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

    const isSecretPath = window.location.pathname === '/secret';
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
      navigate('/secret');
      setTimeout(() => {
        setCrtClass('crt-on');
        setTimeout(() => {
          setIsAnimating(false);
          setCrtClass('');
        }, 600);
      }, 1500);
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
      }, 1500);
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
      <nav ref={navRef} className="bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#1e1e1e] dark:to-[#3b0764] text-white flex items-center justify-between px-6 py-4 border-b-4 border-black dark:border-[#a855f7] shadow-[0_4px_15px_rgba(128,0,0,0.3)] dark:shadow-[0_4px_20px_rgba(168,85,247,0.4)] relative z-40 transition-all duration-300">

        {/* --- Bal oldal: Ikonok és Menüpontok --- */}
        <div className="flex items-center space-x-10">
          <Link to={isSecretMode ? "/secret" : "/"} className="cursor-pointer group">
            <span className="inline-flex items-center justify-center text-2xl font-bold border-2 border-white w-12 h-10 leading-none group-hover:bg-white group-hover:text-[#800000] dark:group-hover:text-[#a855f7] transition-all duration-300 shadow-sm">
              ƎK
            </span>
          </Link>

          <div className="hidden md:flex space-x-6 text-lg font-medium">
            <Link to="/naptar" className="hover:text-gray-200 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">Naptár</Link>
            <Link to="/ai" className="hover:text-gray-200 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">AI Asszisztens</Link>
            <Link to="/kalkulator" className="hover:text-gray-200 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">Kalkulátorok</Link>
            <Link to="/tudastar" className="hover:text-gray-200 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">Tudástár</Link>
            <Link to="/hivatkozas" className="hover:text-gray-200 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">Hivatkozás Generátor</Link>
          </div>
        </div>

        {/* --- Jobb oldal: Ikonok --- */}
        <div className="flex items-center space-x-4">
          <Mail className="w-6 h-6 cursor-pointer hover:text-gray-200 hover:scale-110 transition-transform" />

          <User
            onClick={handleProfileClick}
            className="w-6 h-6 cursor-pointer hover:text-gray-200 hover:scale-110 transition-transform"
          />

          <Menu
            onClick={handleMenuClick}
            className="w-7 h-7 cursor-pointer hover:text-gray-200 hover:scale-110 transition-transform"
          />
        </div>

        {/* --- Fő Dropdown Menü --- */}
        {isMenuOpen && (
          <div className="absolute top-full right-0 mt-[4px] bg-[#b91c1c] dark:bg-[#3b0764] w-56 shadow-[0_10px_25px_rgba(128,0,0,0.4)] dark:shadow-[0_10px_30px_rgba(168,85,247,0.3)] flex flex-col z-50 border-l-4 border-b-4 border-black dark:border-[#a855f7] transition-colors duration-300">
            <div className="flex items-center justify-between p-4 border-b-2 border-black/20 dark:border-[#a855f7]/30">
              <div className="flex items-center space-x-2">
                {isDarkMode ? (
                  <Moon className="w-5 h-5 text-indigo-300 drop-shadow-[0_0_5px_rgba(165,180,252,0.8)]" />
                ) : (
                  <Sun className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]" />
                )}
                <span className="font-bold text-sm text-white">
                  {isDarkMode ? 'Sötét' : 'Világos'}
                </span>
              </div>

              <button
                onClick={handleThemeToggle}
                className={`w-11 h-6 rounded-full relative transition-colors duration-300 cursor-pointer shadow-inner ${isDarkMode ? 'bg-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.6)]' : 'bg-black/30'
                  }`}
              >
                <div className={`w-4 h-4 rounded-full absolute top-1 transition-transform duration-300 shadow-md ${isDarkMode ? 'bg-white translate-x-6' : 'bg-white translate-x-1'
                  }`}></div>
              </button>
            </div>
          </div>
        )}

        {/* --- Profil Dropdown Menü --- */}
        {isProfileMenuOpen && (
          <div className="absolute top-full right-[72px] mt-[4px] bg-[#b91c1c] dark:bg-[#3b0764] secret:bg-black w-56 shadow-[0_10px_25px_rgba(128,0,0,0.4)] dark:shadow-[0_10px_30px_rgba(168,85,247,0.3)] secret:shadow-none flex flex-col z-50 border-x-4 border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] transition-colors duration-300">

            <div className="px-4 py-3 border-b-4 border-black/20 dark:border-[#a855f7]/30 secret:border-[#1cf85d] bg-black/10 dark:bg-black/20 secret:bg-transparent cursor-default">
              <span className="block text-xs text-white/70 secret:text-[#1cf85d]/70 font-medium uppercase tracking-wider mb-0.5 secret:font-mono">Bejelentkezve mint:</span>
              <span className="font-bold text-xl text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-none truncate block secret:font-mono">{username}</span>
            </div>

            <Link
              to="/profile"
              onClick={() => setIsProfileMenuOpen(false)}
              className="px-4 py-3 border-b-2 border-black/10 dark:border-[#a855f7]/20 secret:border-[#1cf85d] text-white secret:text-[#1cf85d] font-bold hover:bg-black/10 dark:hover:bg-white/10 secret:hover:bg-[#1cf85d] secret:hover:text-black transition-colors flex items-center secret:font-mono uppercase"
            >
              <User className="w-4 h-4 mr-2" /> Profilom
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-3 text-left text-red-200 dark:text-red-300 secret:text-[#1cf85d] hover:text-white secret:hover:text-black font-bold hover:bg-black/10 dark:hover:bg-white/10 secret:hover:bg-[#1cf85d] transition-colors cursor-pointer flex items-center secret:font-mono uppercase"
            >
              Kijelentkezés
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
          <p className="text-md mb-8 animate-bounce">
            Press [ RESET ] to restart the system.
          </p>
          <button
            onClick={() => {
              document.documentElement.classList.remove('secret');
              localStorage.removeItem('secretMode');
              window.location.href = '/';
            }}
            className="border-2 border-[#1cf85d] px-6 py-2 hover:bg-[#1cf85d] hover:text-black transition-none uppercase cursor-pointer text-xl [text-shadow:0_0_5px_rgba(28,248,93,0.8)]"
          >
            [ RESET ]
          </button>
        </div>
      )}
    </>
  );
}