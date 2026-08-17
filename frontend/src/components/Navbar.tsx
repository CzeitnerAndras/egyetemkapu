import { useState, useRef, useEffect } from 'react';
import { Mail, User, Menu, Moon, Sun } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [crtClass, setCrtClass] = useState('');
  const clickCountRef = useRef<number | null>(0);
  const timeoutRef = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setIsDarkMode(true);
    }
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
    setIsAnimating(true);
    clickCountRef.current = 0;

    setCrtClass('crt-off');
    setTimeout(() => {
      document.documentElement.classList.add('secret');
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
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

  return (
    <>
      <nav className="bg-[#800000] dark:bg-[#2e1065] text-white flex items-center justify-between px-6 py-4 border-b-4 border-black dark:border-[#a855f7] relative z-40 transition-colors duration-300">
        {/* --- Bal oldal: Ikonok és Menüpontok --- */}
        <div className="flex items-center space-x-10">
          <Link to="/" className="cursor-pointer">
            <span className="inline-flex items-center justify-center text-2xl font-bold border-2 border-white w-12 h-10 leading-none">
              ƎK
            </span>
          </Link>

          <div className="hidden md:flex space-x-6 text-lg font-medium">
            <Link to="/naptar" className="hover:text-gray-300 transition-colors">Naptár</Link>
            <Link to="/ai" className="hover:text-gray-300 transition-colors">AI Asszisztens</Link>
            <Link to="/kalkulator" className="hover:text-gray-300 transition-colors">Kalkulátorok</Link>
            <Link to="/ertekelo" className="hover:text-gray-300 transition-colors">Tárgyértékelés</Link>
            <Link to="/hivatkozas" className="hover:text-gray-300 transition-colors">Hivatkozás Generátor</Link>
          </div>
        </div>

        {/* --- Jobb oldal: Ikonok --- */}
        <div className="flex items-center space-x-4">
          <Mail className="w-6 h-6 cursor-pointer hover:text-gray-300" />
          <Link to="/login">
            <User className="w-6 h-6 cursor-pointer hover:text-gray-300 transition-colors" />
          </Link>
          <Menu
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-7 h-7 cursor-pointer hover:text-gray-300"
          />
        </div>

        {/* --- Dropdown Menü --- */}
        {isMenuOpen && (
          <div className="absolute top-full right-0 mt-[4px] bg-[#800000] dark:bg-[#2e1065] w-56 shadow-2xl flex flex-col z-50 border-l-4 border-b-4 border-black dark:border-[#a855f7] transition-colors duration-300">

            {/* --- Sötét / Világos mód kapcsoló --- */}
            <div className="flex items-center justify-between p-4 border-b-2 border-black/20 dark:border-black/50">
              <div className="flex items-center space-x-2">
                {isDarkMode ? (
                  <Moon className="w-5 h-5 text-indigo-300" />
                ) : (
                  <Sun className="w-5 h-5 text-yellow-400" />
                )}
                <span className="font-bold text-sm text-white">
                  {isDarkMode ? 'Sötét' : 'Világos'}
                </span>
              </div>

              {/* --- A Toggle --- */}
              <button
                onClick={handleThemeToggle}
                className={`w-11 h-6 rounded-full relative transition-colors duration-300 cursor-pointer ${isDarkMode ? 'bg-[#a855f7]' : 'bg-white'
                  }`}
              >
                <div className={`w-4 h-4 rounded-full absolute top-1 transition-transform duration-300 ${isDarkMode ? 'bg-white translate-x-6' : 'bg-gray-400 translate-x-1'
                  }`}></div>
              </button>
            </div>

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