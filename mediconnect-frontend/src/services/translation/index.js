// src/services/translation/index.js
/**
 * Translation Services Index
 * Central export for translation-related services
 */

// Named exports from the service
export {
  translateText,
  translateMultiple,
  detectLanguage,
  getSupportedLanguages,
  clearTranslationCache,
  getCacheStats
} from './translationService';

// Default export
export { default } from './translationService';