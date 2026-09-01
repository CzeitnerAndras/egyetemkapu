import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translate, type Lang } from './translations';
import { fetchWithAuth } from '../utils/authApi';

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

function persistLanguageToServer(language: Lang) {
  if (!localStorage.getItem('token')) return;
  fetchWithAuth('/api/users/me/language', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language }),
  }, { redirectOnAuthFailure: false }).catch(() => {});
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Lang>(readStoredLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    persistLanguageToServer(language);
    const onAuthChanged = () => persistLanguageToServer(language);
    window.addEventListener('authChanged', onAuthChanged);
    return () => window.removeEventListener('authChanged', onAuthChanged);
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
