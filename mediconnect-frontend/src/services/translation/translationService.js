/**
 * Translation Service for MediConnect
 * Uses free translation APIs (MyMemory primary, Lingva fallback)
 * Includes caching to reduce API calls
 */

// ==================== Constants ====================

/**
 * Cache expiry duration in milliseconds (24 hours)
 * @readonly
 */
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

/**
 * API request timeout in milliseconds
 * @readonly
 */
const API_TIMEOUT_MS = 5000;

/**
 * Supported languages configuration
 * @readonly
 */
const SUPPORTED_LANGUAGES = Object.freeze({
  en: Object.freeze({ code: 'en', name: 'English', nativeName: 'English' }),
  hi: Object.freeze({ code: 'hi', name: 'Hindi', nativeName: 'हिंदी' }),
  te: Object.freeze({ code: 'te', name: 'Telugu', nativeName: 'తెలుగు' }),
});

/**
 * Lingva API instances (fallback translation service)
 * @readonly
 */
const LINGVA_INSTANCES = Object.freeze([
  'lingva.ml',
  'lingva.pussthecat.org',
  'translate.plausibility.cloud',
]);

// ==================== Cache Setup ====================

const translationCache = new Map();

// ==================== Cache Helpers ====================

const getCacheKey = (text, fromLang, toLang) => {
  return `${fromLang}:${toLang}:${text.substring(0, 100)}`;
};

const getCachedTranslation = (text, fromLang, toLang) => {
  const key = getCacheKey(text, fromLang, toLang);
  const cached = translationCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
    return cached.translation;
  }

  return null;
};

const setCachedTranslation = (text, fromLang, toLang, translation) => {
  const key = getCacheKey(text, fromLang, toLang);
  translationCache.set(key, {
    translation,
    timestamp: Date.now(),
  });
};

// ==================== Helper Functions ====================

/**
 * Create an AbortSignal with timeout (with fallback for older browsers)
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {AbortSignal} Abort signal
 */
const createTimeoutSignal = (timeoutMs) => {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs);
  }

  // Fallback for older browsers
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
};

// ==================== Translation APIs ====================

/**
 * Translate using MyMemory API (Primary - 5000 words/day free)
 */
const translateWithMyMemory = async (text, fromLang, toLang) => {
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.append('q', text);
  url.searchParams.append('langpair', `${fromLang}|${toLang}`);

  const response = await fetch(url.toString(), {
    signal: createTimeoutSignal(API_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error('MyMemory API failed');
  }

  const data = await response.json();

  if (data.responseStatus === 200 && data.responseData?.translatedText) {
    // Check for "INVALID" response which means translation failed
    if (data.responseData.translatedText.toUpperCase().includes('INVALID')) {
      throw new Error('Invalid translation response');
    }
    return data.responseData.translatedText;
  }

  throw new Error(data.responseDetails || 'Invalid response from MyMemory');
};

/**
 * Translate using Lingva API (Fallback - Google Translate proxy)
 */
const translateWithLingva = async (text, fromLang, toLang) => {
  const encodedText = encodeURIComponent(text);

  for (const instance of LINGVA_INSTANCES) {
    try {
      const url = `https://${instance}/api/v1/${fromLang}/${toLang}/${encodedText}`;
      const response = await fetch(url, {
        signal: createTimeoutSignal(API_TIMEOUT_MS),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.translation) {
          return data.translation;
        }
      }
    } catch {
      // Try next instance
      continue;
    }
  }

  throw new Error('All Lingva instances failed');
};

// ==================== Main Translation Functions ====================

/**
 * Translate text from one language to another
 * @param {string} text - Text to translate
 * @param {string} fromLang - Source language code (en, hi, te)
 * @param {string} toLang - Target language code (en, hi, te)
 * @returns {Promise<{success: boolean, translatedText?: string, error?: string}>}
 */
export const translateText = async (text, fromLang = 'en', toLang = 'hi') => {
  // Validation
  if (!text || typeof text !== 'string') {
    return { success: true, translatedText: text || '' };
  }

  const trimmedText = text.trim();
  if (!trimmedText) {
    return { success: true, translatedText: '' };
  }

  // Same language - return as is
  if (fromLang === toLang) {
    return { success: true, translatedText: trimmedText };
  }

  // Check cache first
  const cached = getCachedTranslation(trimmedText, fromLang, toLang);
  if (cached) {
    return { success: true, translatedText: cached };
  }

  try {
    // Try MyMemory first
    let translation;
    try {
      translation = await translateWithMyMemory(trimmedText, fromLang, toLang);
    } catch {
      // Fallback to Lingva
      translation = await translateWithLingva(trimmedText, fromLang, toLang);
    }

    // Cache successful translation
    setCachedTranslation(trimmedText, fromLang, toLang, translation);

    return { success: true, translatedText: translation };
  } catch (error) {
    console.error('Translation failed:', error);
    return {
      success: false,
      translatedText: trimmedText,
      error: error.message,
    };
  }
};

/**
 * Translate multiple texts at once
 * @param {string[]} texts - Array of texts to translate
 * @param {string} fromLang - Source language code
 * @param {string} toLang - Target language code
 * @returns {Promise<Array<{success: boolean, translated: string, original: string}>>}
 */
export const translateMultiple = async (texts, fromLang = 'en', toLang = 'hi') => {
  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  // Same language - return as is
  if (fromLang === toLang) {
    return texts.map((text) => ({
      success: true,
      translated: text,
      original: text,
    }));
  }

  const results = await Promise.all(
    texts.map(async (text) => {
      const result = await translateText(text, fromLang, toLang);
      return {
        success: result.success,
        translated: result.translatedText,
        original: text,
      };
    })
  );

  return results;
};

/**
 * Detect the language of text
 * @param {string} text - Text to detect language
 * @returns {Promise<{success: boolean, language: string, confidence?: number}>}
 */
export const detectLanguage = async (text) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { success: true, language: 'en', confidence: 0 };
  }

  const trimmedText = text.trim();

  // Use script detection for Indian languages (fast and reliable)
  const hindiPattern = /[\u0900-\u097F]/; // Devanagari script
  const teluguPattern = /[\u0C00-\u0C7F]/; // Telugu script

  if (hindiPattern.test(trimmedText)) {
    return { success: true, language: 'hi', confidence: 0.95 };
  }

  if (teluguPattern.test(trimmedText)) {
    return { success: true, language: 'te', confidence: 0.95 };
  }

  // For Latin script, try API detection
  try {
    const url = new URL('https://api.mymemory.translated.net/get');
    url.searchParams.append('q', trimmedText.substring(0, 100));
    url.searchParams.append('langpair', 'autodetect|en');

    const response = await fetch(url.toString(), {
      signal: createTimeoutSignal(API_TIMEOUT_MS),
    });
    const data = await response.json();

    if (data.responseData?.detectedLanguage) {
      const detected = data.responseData.detectedLanguage.toLowerCase();

      // Map to our supported languages
      if (detected.startsWith('hi')) {
        return { success: true, language: 'hi', confidence: 0.8 };
      }
      if (detected.startsWith('te')) {
        return { success: true, language: 'te', confidence: 0.8 };
      }

      return { success: true, language: 'en', confidence: 0.8 };
    }
  } catch (error) {
    console.error('Language detection API failed:', error);
  }

  // Default to English
  return { success: true, language: 'en', confidence: 0.5 };
};

/**
 * Get supported languages
 * @returns {Object} - Supported languages object
 */
export const getSupportedLanguages = () => {
  return { ...SUPPORTED_LANGUAGES };
};

/**
 * Clear translation cache
 */
export const clearTranslationCache = () => {
  translationCache.clear();
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    size: translationCache.size,
    keys: Array.from(translationCache.keys()),
  };
};

// ==================== Default Export ====================

const translationService = {
  translateText,
  translateMultiple,
  detectLanguage,
  getSupportedLanguages,
  clearTranslationCache,
  getCacheStats,
};

export default translationService;