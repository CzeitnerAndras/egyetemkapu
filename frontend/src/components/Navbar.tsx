import { useState, useRef, useEffect } from 'react';
import { Mail, User, Menu, Moon, Sun } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [username, setUsername] = useState('Felhasználó');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSecretMode, setIsSecretMode] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [crtClass, setCrtClass] = useState('');
  const clickCountRef = useRef<number | null>(0);
  const timeoutRef = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setIsDarkMode(true);
    }

    if (document.documentElement.classList.contains('secret')) {
      setIsSecretMode(true);
    }

    const handleSecretLogoff = () => {
      setIsSecretMode(false);
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

    if (clickCountRef.current >= 10 && !isAnimating) {
      triggerSecretEffect();
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
      <nav className="bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#1e1e1e] dark:to-[#3b0764] text-white flex items-center justify-between px-6 py-4 border-b-4 border-black dark:border-[#a855f7] shadow-[0_4px_15px_rgba(128,0,0,0.3)] dark:shadow-[0_4px_20px_rgba(168,85,247,0.4)] relative z-40 transition-all duration-300">

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
            <Link to="/ertekelo" className="hover:text-gray-200 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all">Tárgyértékelés</Link>
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
          <div className="absolute top-full right-[72px] mt-[4px] bg-[#b91c1c] dark:bg-[#3b0764] w-56 shadow-[0_10px_25px_rgba(128,0,0,0.4)] dark:shadow-[0_10px_30px_rgba(168,85,247,0.3)] flex flex-col z-50 border-x-4 border-b-4 border-black dark:border-[#a855f7] transition-colors duration-300">

            <div className="px-4 py-3 border-b-4 border-black/20 dark:border-[#a855f7]/30 bg-black/10 dark:bg-black/20 cursor-default">
              <span className="block text-xs text-white/70 font-medium uppercase tracking-wider mb-0.5">Bejelentkezve mint:</span>
              <span className="font-bold text-xl text-white drop-shadow-md truncate block">{username}</span>
            </div>

            <Link
              to="/profile"
              onClick={() => setIsProfileMenuOpen(false)}
              className="px-4 py-3 border-b-2 border-black/10 dark:border-[#a855f7]/20 text-white font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center"
            >
              <User className="w-4 h-4 mr-2" /> Profilom
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-3 text-left text-red-200 hover:text-white font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer flex items-center"
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
    </>
  );
}