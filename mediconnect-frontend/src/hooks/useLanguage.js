// src/hooks/useLanguage.js
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useLanguageStore from '../store/languageStore';
import useAuthStore from '../store/authStore';
import { 
  translateText, 
  translateMultiple, 
  detectLanguage 
} from '../services/translation/translationService';

/**
 * Custom hook for language and translation
 * Combines i18n static translations with dynamic API translations
 */
const useLanguage = () => {
  const { t, i18n } = useTranslation();
  
  const {
    currentLanguage,
    supportedLanguages,
    isChanging,
    changeLanguage: storeChangeLanguage,
    syncLanguageWithBackend,
    getCurrentLanguageDetails,
    isRTL
  } = useLanguageStore();

  const { isAuthenticated } = useAuthStore();

  // Change language with backend sync
  const changeLanguage = useCallback(async (langCode) => {
    const result = await storeChangeLanguage(langCode);
    
    if (result.success && isAuthenticated) {
      // Sync with backend if user is logged in
      await syncLanguageWithBackend(langCode);
    }
    
    return result;
  }, [storeChangeLanguage, syncLanguageWithBackend, isAuthenticated]);

  // Get current language info
  const currentLanguageInfo = useMemo(() => {
    return getCurrentLanguageDetails();
  }, [currentLanguage, getCurrentLanguageDetails]);

  // Translate dynamic content (API responses, user content)
  const translateDynamic = useCallback(async (text, sourceLang = 'en') => {
    if (!text || currentLanguage === sourceLang) {
      return text;
    }

    try {
      const result = await translateText(text, sourceLang, currentLanguage);
      return result.success ? result.translatedText : text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }, [currentLanguage]);

  // Translate multiple texts at once
  const translateDynamicBatch = useCallback(async (texts, sourceLang = 'en') => {
    if (!texts?.length || currentLanguage === sourceLang) {
      return texts;
    }

    try {
      const results = await translateMultiple(texts, sourceLang, currentLanguage);
      return results.map(r => r.translated);
    } catch (error) {
      console.error('Batch translation error:', error);
      return texts;
    }
  }, [currentLanguage]);

  // Detect language of text
  const detectTextLanguage = useCallback(async (text) => {
    if (!text) return 'en';
    
    try {
      const result = await detectLanguage(text);
      return result.success ? result.language : 'en';
    } catch (error) {
      return 'en';
    }
  }, []);

  // Format date based on locale
  const formatDate = useCallback((date, options = {}) => {
    if (!date) return '';
    
    const localeMap = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'te': 'te-IN'
    };
    
    const locale = localeMap[currentLanguage] || 'en-IN';
    
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    };
    
    try {
      return new Date(date).toLocaleDateString(locale, defaultOptions);
    } catch (error) {
      return new Date(date).toLocaleDateString('en-IN', defaultOptions);
    }
  }, [currentLanguage]);

  // Format time based on locale
  const formatTime = useCallback((time, options = {}) => {
    if (!time) return '';
    
    const localeMap = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'te': 'te-IN'
    };
    
    const locale = localeMap[currentLanguage] || 'en-IN';
    
    const defaultOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      ...options
    };
    
    try {
      const dateObj = typeof time === 'string' ? new Date(`1970-01-01T${time}`) : time;
      return dateObj.toLocaleTimeString(locale, defaultOptions);
    } catch (error) {
      return time;
    }
  }, [currentLanguage]);

  // Format number based on locale
  const formatNumber = useCallback((number, options = {}) => {
    if (number === null || number === undefined) return '';
    
    const localeMap = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'te': 'te-IN'
    };
    
    const locale = localeMap[currentLanguage] || 'en-IN';
    
    try {
      return new Intl.NumberFormat(locale, options).format(number);
    } catch (error) {
      return number.toString();
    }
  }, [currentLanguage]);

  // Format currency (INR)
  const formatCurrency = useCallback((amount) => {
    return formatNumber(amount, {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }, [formatNumber]);

  // Get relative time (e.g., "2 hours ago")
  const getRelativeTime = useCallback((date) => {
    if (!date) return '';
    
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
      return t('time.justNow', 'Just now');
    } else if (diffMins < 60) {
      return t('time.minutesAgo', '{{count}} minutes ago', { count: diffMins });
    } else if (diffHours < 24) {
      return t('time.hoursAgo', '{{count}} hours ago', { count: diffHours });
    } else if (diffDays < 7) {
      return t('time.daysAgo', '{{count}} days ago', { count: diffDays });
    } else if (diffDays < 30) {
      return t('time.weeksAgo', '{{count}} weeks ago', { count: Math.floor(diffDays / 7) });
    } else {
      return t('time.monthsAgo', '{{count}} months ago', { count: Math.floor(diffDays / 30) });
    }
  }, [t]);

  return {
    // i18n
    t,
    i18n,
    
    // Current language
    currentLanguage,
    currentLanguageInfo,
    supportedLanguages,
    isChanging,
    isRTL: isRTL(),
    
    // Language checks
    isEnglish: currentLanguage === 'en',
    isHindi: currentLanguage === 'hi',
    isTelugu: currentLanguage === 'te',
    
    // Actions
    changeLanguage,
    
    // Dynamic translation
    translateDynamic,
    translateDynamicBatch,
    detectTextLanguage,
    
    // Formatting
    formatDate,
    formatTime,
    formatNumber,
    formatCurrency,
    getRelativeTime
  };
};

export default useLanguage;
export { useLanguage };