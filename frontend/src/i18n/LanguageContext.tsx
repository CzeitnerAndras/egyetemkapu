import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translate, type Lang } from './translations';

interface LanguageContextValue {
  language: Lang;
  locale: string;
  setLanguage: (lang: Lang) => void;
  toggleLanguage: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage(): Lang {
  const saved = localStorage.getItem('language');
  return saved === 'en' ? 'en' : 'hu';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Lang>(readStoredLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Lang) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    locale: language === 'en' ? 'en-GB' : 'hu-HU',
    setLanguage,
    toggleLanguage: () => setLanguage(language === 'hu' ? 'en' : 'hu'),
    t: (key, vars) => translate(language, key, vars),
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
