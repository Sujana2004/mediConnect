// src/store/languageStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import i18n from '../i18n';
import api from '../config/api';

/**
 * Environment check for development logging
 */
const isDev = import.meta.env.DEV;

/**
 * Safe logger - only logs in development
 */
const logger = {
  log: (...args) => isDev && console.log(...args),
  error: (...args) => isDev && console.error(...args),
  warn: (...args) => isDev && console.warn(...args),
};

/**
 * Safe browser environment check
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Create safe storage wrapper
 */
const createSafeStorage = () => ({
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Storage unavailable (private browsing, quota exceeded)
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // Storage unavailable
    }
  },
});

/**
 * Supported languages configuration
 */
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', dir: 'ltr' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr' }
];

/**
 * Helper function to get font family based on language
 */
const getFontFamily = (langCode) => {
  switch (langCode) {
    case 'hi':
      return "'Noto Sans Devanagari', 'Inter', sans-serif";
    case 'te':
      return "'Noto Sans Telugu', 'Inter', sans-serif";
    default:
      return "'Inter', sans-serif";
  }
};

/**
 * Safely update document attributes
 */
const updateDocumentLanguage = (langCode) => {
  if (!isBrowser) return;

  try {
    if (document.documentElement) {
      document.documentElement.lang = langCode;
    }
    if (document.body) {
      document.body.setAttribute('data-lang', langCode);
      document.body.style.fontFamily = getFontFamily(langCode);
    }
  } catch (error) {
    logger.error('Failed to update document language:', error.message);
  }
};

const useLanguageStore = create(
  persist(
    (set, get) => ({
      // State
      currentLanguage: 'en',
      supportedLanguages: SUPPORTED_LANGUAGES,
      isChanging: false,

      // Get current language details
      getCurrentLanguageDetails: () => {
        const { currentLanguage, supportedLanguages } = get();
        return supportedLanguages.find(l => l.code === currentLanguage) || supportedLanguages[0];
      },

      // Change language
      changeLanguage: async (langCode) => {
        const { supportedLanguages, currentLanguage } = get();

        // Skip if same language
        if (langCode === currentLanguage) {
          return { success: true };
        }

        // Validate language code
        if (!supportedLanguages.find(l => l.code === langCode)) {
          logger.error(`Unsupported language: ${langCode}`);
          return { success: false, error: 'Unsupported language' };
        }

        set({ isChanging: true });

        try {
          // Change i18n language
          await i18n.changeLanguage(langCode);

          // Update document attributes safely
          updateDocumentLanguage(langCode);

          set({ currentLanguage: langCode, isChanging: false });

          return { success: true };
        } catch (error) {
          logger.error('Failed to change language:', error.message);
          set({ isChanging: false });
          return { success: false, error: error.message };
        }
      },

      // Sync language with backend
      syncLanguageWithBackend: async (langCode) => {
        try {
          // Use the configured axios instance which handles auth automatically
          await api.post('/auth/settings/language/', { language: langCode });
          logger.log('Language synced with backend:', langCode);
        } catch (error) {
          // Non-critical operation - don't throw, just log
          logger.warn('Failed to sync language with backend:', error.message);
        }
      },

      // Initialize language on app start
      initializeLanguage: () => {
        const { currentLanguage } = get();

        // Apply language to document safely
        updateDocumentLanguage(currentLanguage);

        // Sync with i18n
        if (i18n.language !== currentLanguage) {
          i18n.changeLanguage(currentLanguage).catch((error) => {
            logger.error('Failed to sync i18n language:', error.message);
          });
        }
      },

      // Check if current language is RTL
      isRTL: () => {
        const details = get().getCurrentLanguageDetails();
        return details?.dir === 'rtl';
      }
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(createSafeStorage),
      partialize: (state) => ({
        currentLanguage: state.currentLanguage
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Use queueMicrotask to ensure DOM is ready
          queueMicrotask(() => {
            state.initializeLanguage();
          });
        }
      }
    }
  )
);

export default useLanguageStore;