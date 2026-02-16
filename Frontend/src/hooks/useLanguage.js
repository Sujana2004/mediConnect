import { useState, useCallback, useContext, createContext } from 'react';
import { getLanguage, setLanguage as saveLanguage } from '../hooks/storage';

// Simple hook until full i18n is implemented
export const useLanguage = () => {
  const [language, setLang] = useState(getLanguage());

  const setLanguage = useCallback((lang) => {
    saveLanguage(lang);
    setLang(lang);
    // Trigger re-render across app
    window.dispatchEvent(new CustomEvent('languageChange', { detail: lang }));
  }, []);

  const t = useCallback(
    (key, fallback = '') => {
      // Placeholder - will be replaced with full i18n
      // For now, just return the fallback
      return fallback || key;
    },
    [language]
  );

  return { language, setLanguage, t };
};

export default useLanguage;