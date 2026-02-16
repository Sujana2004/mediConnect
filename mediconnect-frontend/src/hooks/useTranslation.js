// src/hooks/useTranslation.js
import { useTranslation as useI18nTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import { 
  translateText, 
  detectLanguage 
} from '../services/translation/translationService';

/**
 * Enhanced translation hook
 * - Uses i18n for static UI translations
 * - Uses free API for dynamic content translation
 */
export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();
  const [isTranslating, setIsTranslating] = useState(false);

  // Get current language
  const currentLanguage = i18n.language || 'en';

  // Change language (static translations)
  const changeLanguage = useCallback(async (lang) => {
    await i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    document.body.setAttribute('data-lang', lang);
    
    // Update backend preference
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await fetch('/api/v1/auth/settings/language/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ language: lang })
        });
      }
    } catch (error) {
      console.error('Failed to update language preference:', error);
    }
  }, [i18n]);

  // Translate dynamic content (chatbot responses, user content)
  const translateDynamic = useCallback(async (text, targetLang = null) => {
    const target = targetLang || currentLanguage;
    
    if (!text || target === 'en') {
      return text;
    }

    setIsTranslating(true);
    try {
      const detected = await detectLanguage(text);
      const sourceLang = detected.success ? detected.language : 'en';
      
      if (sourceLang === target) {
        setIsTranslating(false);
        return text;
      }

      const result = await translateText(text, sourceLang, target);
      setIsTranslating(false);
      return result.success ? result.translatedText : text;
    } catch (error) {
      console.error('Dynamic translation error:', error);
      setIsTranslating(false);
      return text;
    }
  }, [currentLanguage]);

  // Translate array of texts
  const translateDynamicBatch = useCallback(async (texts, targetLang = null) => {
    const target = targetLang || currentLanguage;
    
    if (!texts?.length || target === 'en') {
      return texts;
    }

    setIsTranslating(true);
    try {
      const results = await Promise.all(
        texts.map(text => translateText(text, 'en', target))
      );
      setIsTranslating(false);
      return results.map((r, i) => r.success ? r.translatedText : texts[i]);
    } catch (error) {
      console.error('Batch translation error:', error);
      setIsTranslating(false);
      return texts;
    }
  }, [currentLanguage]);

  return {
    // i18n static translation
    t,
    i18n,
    currentLanguage,
    changeLanguage,
    
    // Dynamic translation
    translateDynamic,
    translateDynamicBatch,
    isTranslating,
    
    // Language info
    isEnglish: currentLanguage === 'en',
    isHindi: currentLanguage === 'hi',
    isTelugu: currentLanguage === 'te'
  };
};

export default useTranslation;