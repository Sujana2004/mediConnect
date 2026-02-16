import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import en from './locales/en.json'
import hi from './locales/hi.json'
import te from './locales/te.json'

// Storage key (must match storage.js)
const LANGUAGE_STORAGE_KEY = 'mediconnect_language';

// Supported languages configuration
export const LANGUAGES = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    voiceCode: 'en-IN', // For speech synthesis
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    direction: 'ltr',
    voiceCode: 'hi-IN',
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    direction: 'ltr',
    voiceCode: 'te-IN',
  },
};

// Get saved language or default
const getSavedLanguage = () => {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en';
  } catch {
    return 'en';
  }
};

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: import.meta.env.DEV,
    fallbackLng: 'en',
    lng: getSavedLanguage(), // Use saved language on init
    supportedLngs: ['en', 'hi', 'te'],
    
    interpolation: {
      escapeValue: false,
    },
    
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      te: { translation: te },
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY, // Use our custom key
      caches: ['localStorage'],
    },
    
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p', 'span'],
    },
  });

/**
 * Change language and persist to storage
 * @param {string} langCode - Language code ('en', 'hi', 'te')
 * @returns {Promise<void>}
 */
export const changeLanguage = async (langCode) => {
  if (!LANGUAGES[langCode]) {
    console.error(`Unsupported language: ${langCode}`);
    return;
  }
  
  try {
    // Change i18n language
    await i18n.changeLanguage(langCode);
    
    // Persist to localStorage
    localStorage.setItem(LANGUAGE_STORAGE_KEY, langCode);
    
    // Update HTML lang attribute
    document.documentElement.lang = langCode;
    
    // Update direction (for future RTL support)
    document.documentElement.dir = LANGUAGES[langCode].direction;
    
    console.log(`Language changed to: ${LANGUAGES[langCode].name}`);
  } catch (error) {
    console.error('Failed to change language:', error);
  }
};

/**
 * Get current language info
 * @returns {object} Language configuration object
 */
export const getCurrentLanguage = () => {
  const currentLang = i18n.language || 'en';
  return LANGUAGES[currentLang] || LANGUAGES.en;
};

/**
 * Get voice code for speech synthesis
 * @returns {string} Voice code (e.g., 'en-IN', 'hi-IN')
 */
export const getVoiceCode = () => {
  return getCurrentLanguage().voiceCode;
};

/**
 * Speak text using Web Speech API
 * @param {string} text - Text to speak
 * @param {object} options - Speech options
 * @returns {Promise<void>}
 */
export const speakText = (text, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      reject(new Error('Speech synthesis not supported'));
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const langInfo = getCurrentLanguage();
    
    utterance.lang = langInfo.voiceCode;
    utterance.rate = options.rate || 0.9; // Slightly slower for clarity
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;
    
    // Find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(
      voice => voice.lang.startsWith(langInfo.code) || voice.lang === langInfo.voiceCode
    );
    
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
    
    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(event.error);
    
    window.speechSynthesis.speak(utterance);
  });
};

/**
 * Stop any ongoing speech
 */
export const stopSpeaking = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

/**
 * Check if speech synthesis is supported
 * @returns {boolean}
 */
export const isSpeechSupported = () => {
  return 'speechSynthesis' in window;
};

/**
 * Get available voices for current language
 * @returns {SpeechSynthesisVoice[]}
 */
export const getAvailableVoices = () => {
  if (!('speechSynthesis' in window)) return [];
  
  const langInfo = getCurrentLanguage();
  const voices = window.speechSynthesis.getVoices();
  
  return voices.filter(
    voice => voice.lang.startsWith(langInfo.code)
  );
};

export default i18n;