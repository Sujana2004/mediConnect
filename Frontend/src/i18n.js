import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English translations
import enTranslations from './locales/en.json';

// Hindi translations
import hiTranslations from './locales/hi.json';
// Telugu translations
import teTranslations from './locales/te.json';

i18n
  // detect user language
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  .init({
    debug: import.meta.env.DEV,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    resources: {
      en: {
        translation: enTranslations
      },
      hi: {
        translation: hiTranslations
      },
      te: {
        translation: teTranslations
      }
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;