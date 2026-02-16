/**
 * Text-to-Speech Service
 * Uses Web Speech API for voice output
 * Supports English, Hindi, and Telugu
 */

/**
 * Language codes for Web Speech API
 * @readonly
 */
const LANGUAGE_CODES = Object.freeze({
  en: 'en-IN', // English (India)
  hi: 'hi-IN', // Hindi (India)
  te: 'te-IN', // Telugu (India)
});

/**
 * Fallback language codes if Indian variants not available
 * @readonly
 */
const FALLBACK_LANGUAGE_CODES = Object.freeze({
  en: 'en-US',
  hi: 'hi-IN',
  te: 'te-IN',
});

/**
 * Voice loading timeout in milliseconds
 * @readonly
 */
const VOICE_LOAD_TIMEOUT_MS = 1000;

/**
 * Check if code is running in browser environment
 * @returns {boolean}
 */
const isBrowserEnvironment = () => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

/**
 * Get speechSynthesis instance safely
 * @returns {SpeechSynthesis|null}
 */
const getSpeechSynthesis = () => {
  if (!isBrowserEnvironment()) {
    return null;
  }
  return window.speechSynthesis;
};

/**
 * Check if speech synthesis is supported
 * @returns {boolean} Whether speech synthesis is supported
 */
export const isSupported = () => {
  return isBrowserEnvironment();
};

/**
 * Get available voices
 * @returns {Promise<SpeechSynthesisVoice[]>} Available voices
 */
export const getVoices = () => {
  return new Promise((resolve) => {
    const synth = getSpeechSynthesis();

    if (!synth) {
      resolve([]);
      return;
    }

    let voices = synth.getVoices();

    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Wait for voices to load
    const handleVoicesChanged = () => {
      voices = synth.getVoices();
      resolve(voices);
    };

    synth.onvoiceschanged = handleVoicesChanged;

    // Timeout fallback
    setTimeout(() => {
      voices = synth.getVoices();
      resolve(voices);
    }, VOICE_LOAD_TIMEOUT_MS);
  });
};

/**
 * Get voices for a specific language
 * @param {string} language - Language code (en/hi/te)
 * @returns {Promise<SpeechSynthesisVoice[]>} Voices for the language
 */
export const getVoicesForLanguage = async (language) => {
  const voices = await getVoices();
  const langCode = LANGUAGE_CODES[language] || LANGUAGE_CODES.en;
  const fallbackCode = FALLBACK_LANGUAGE_CODES[language] || FALLBACK_LANGUAGE_CODES.en;

  // Try to find voices for the language
  let matchingVoices = voices.filter((voice) =>
    voice.lang.startsWith(langCode.split('-')[0])
  );

  // If no voices found, try fallback
  if (matchingVoices.length === 0) {
    matchingVoices = voices.filter((voice) =>
      voice.lang.startsWith(fallbackCode.split('-')[0])
    );
  }

  return matchingVoices;
};

/**
 * Get the best voice for a language
 * @param {string} language - Language code (en/hi/te)
 * @param {string} [preferredGender] - Preferred gender ('male' or 'female')
 * @returns {Promise<SpeechSynthesisVoice|null>} Best matching voice
 */
export const getBestVoice = async (language, preferredGender = null) => {
  const voices = await getVoicesForLanguage(language);

  if (voices.length === 0) {
    return null;
  }

  // Try to find a voice matching the preferred gender
  if (preferredGender) {
    const genderKeywords = {
      male: ['male', 'man', 'boy'],
      female: ['female', 'woman', 'girl'],
    };

    const keywords = genderKeywords[preferredGender.toLowerCase()] || [];

    for (const voice of voices) {
      const voiceName = voice.name.toLowerCase();
      if (keywords.some((keyword) => voiceName.includes(keyword))) {
        return voice;
      }
    }
  }

  // Prefer local voices over remote ones
  const localVoice = voices.find((voice) => voice.localService);
  if (localVoice) {
    return localVoice;
  }

  // Return the first available voice
  return voices[0];
};

/**
 * Text-to-Speech Controller class
 */
class TextToSpeechController {
  constructor() {
    this.synth = getSpeechSynthesis();
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.isPaused = false;
    this.queue = [];
    this.defaultOptions = {
      language: 'en',
      rate: 1,
      pitch: 1,
      volume: 1,
    };
    this.onStart = null;
    this.onEnd = null;
    this.onPause = null;
    this.onResume = null;
    this.onError = null;
    this.onBoundary = null;
  }

  /**
   * Initialize with options
   * @param {Object} options - Configuration options
   */
  init(options = {}) {
    const {
      language = 'en',
      rate = 1,
      pitch = 1,
      volume = 1,
      onStart,
      onEnd,
      onPause,
      onResume,
      onError,
      onBoundary,
    } = options;

    this.defaultOptions = { language, rate, pitch, volume };
    this.onStart = onStart;
    this.onEnd = onEnd;
    this.onPause = onPause;
    this.onResume = onResume;
    this.onError = onError;
    this.onBoundary = onBoundary;
  }

  /**
   * Speak text
   * @param {string} text - Text to speak
   * @param {Object} [options] - Speech options
   * @returns {Promise<void>} Resolves when speech is complete
   */
  async speak(text, options = {}) {
    if (!isSupported()) {
      throw new Error('Speech synthesis is not supported');
    }

    if (!text || text.trim() === '') {
      return;
    }

    const {
      language = this.defaultOptions.language,
      rate = this.defaultOptions.rate,
      pitch = this.defaultOptions.pitch,
      volume = this.defaultOptions.volume,
      voice = null,
      priority = false,
    } = options;

    return new Promise(async (resolve, reject) => {
      // Cancel current speech if priority
      if (priority && this.isSpeaking) {
        this.stop();
      }

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);

      // Set voice
      if (voice) {
        utterance.voice = voice;
      } else {
        const bestVoice = await getBestVoice(language);
        if (bestVoice) {
          utterance.voice = bestVoice;
        }
      }

      // Set language
      utterance.lang = LANGUAGE_CODES[language] || LANGUAGE_CODES.en;

      // Set speech parameters
      utterance.rate = Math.max(0.1, Math.min(10, rate));
      utterance.pitch = Math.max(0, Math.min(2, pitch));
      utterance.volume = Math.max(0, Math.min(1, volume));

      // Setup event handlers
      utterance.onstart = () => {
        this.isSpeaking = true;
        this.isPaused = false;
        this.currentUtterance = utterance;
        if (this.onStart) this.onStart({ text, language });
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.isPaused = false;
        this.currentUtterance = null;
        if (this.onEnd) this.onEnd({ text, language });
        resolve();
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        this.isPaused = false;
        this.currentUtterance = null;

        const error = new Error(`Speech synthesis error: ${event.error}`);
        if (this.onError) this.onError({ error: event.error, text, language });
        reject(error);
      };

      utterance.onpause = () => {
        this.isPaused = true;
        if (this.onPause) this.onPause({ text, language });
      };

      utterance.onresume = () => {
        this.isPaused = false;
        if (this.onResume) this.onResume({ text, language });
      };

      utterance.onboundary = (event) => {
        if (this.onBoundary) {
          this.onBoundary({
            name: event.name,
            charIndex: event.charIndex,
            charLength: event.charLength,
            text,
          });
        }
      };

      // Speak
      this.synth.speak(utterance);
    });
  }

  /**
   * Speak text with chunking for long texts
   * @param {string} text - Text to speak
   * @param {Object} [options] - Speech options
   * @returns {Promise<void>}
   */
  async speakLongText(text, options = {}) {
    // Split text into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    for (const sentence of sentences) {
      if (sentence.trim()) {
        await this.speak(sentence.trim(), options);
      }
    }
  }

  /**
   * Stop speaking
   */
  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.isPaused = false;
      this.currentUtterance = null;
    }
  }

  /**
   * Pause speaking
   */
  pause() {
    if (this.synth && this.isSpeaking) {
      this.synth.pause();
      this.isPaused = true;
    }
  }

  /**
   * Resume speaking
   */
  resume() {
    if (this.synth && this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
    }
  }

  /**
   * Toggle pause/resume
   */
  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * Get speaking state
   * @returns {boolean} Whether currently speaking
   */
  getIsSpeaking() {
    return this.isSpeaking;
  }

  /**
   * Get paused state
   * @returns {boolean} Whether currently paused
   */
  getIsPaused() {
    return this.isPaused;
  }

  /**
   * Set language
   * @param {string} language - Language code (en/hi/te)
   */
  setLanguage(language) {
    this.defaultOptions.language = language;
  }

  /**
   * Set speech rate
   * @param {number} rate - Speech rate (0.1 to 10)
   */
  setRate(rate) {
    this.defaultOptions.rate = Math.max(0.1, Math.min(10, rate));
  }

  /**
   * Set pitch
   * @param {number} pitch - Pitch (0 to 2)
   */
  setPitch(pitch) {
    this.defaultOptions.pitch = Math.max(0, Math.min(2, pitch));
  }

  /**
   * Set volume
   * @param {number} volume - Volume (0 to 1)
   */
  setVolume(volume) {
    this.defaultOptions.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stop();
    this.onStart = null;
    this.onEnd = null;
    this.onPause = null;
    this.onResume = null;
    this.onError = null;
    this.onBoundary = null;
  }
}

// Singleton instance
let ttsController = null;

/**
 * Get or create TTS controller singleton
 * @returns {TextToSpeechController} TTS controller instance
 */
export const getTTSController = () => {
  if (!ttsController) {
    ttsController = new TextToSpeechController();
  }
  return ttsController;
};

/**
 * Simple speak function
 * @param {string} text - Text to speak
 * @param {Object} [options] - Speech options
 * @returns {Promise<void>}
 */
export const speak = async (text, options = {}) => {
  const controller = getTTSController();
  return controller.speak(text, options);
};

/**
 * Stop all speech
 */
export const stopSpeaking = () => {
  const controller = getTTSController();
  controller.stop();
};

/**
 * Check if currently speaking
 * @returns {boolean}
 */
export const isSpeaking = () => {
  const synth = getSpeechSynthesis();
  return synth?.speaking || false;
};

/**
 * Get supported languages
 * @returns {Promise<Array>} Supported languages
 */
export const getSupportedLanguages = async () => {
  const voices = await getVoices();
  const languages = new Set();

  voices.forEach((voice) => {
    const langCode = voice.lang.split('-')[0];
    languages.add(langCode);
  });

  return Array.from(languages).map((code) => ({
    code,
    supported: true,
    hasIndianVoice: voices.some(
      (v) => v.lang.includes('-IN') && v.lang.startsWith(code)
    ),
  }));
};

export default {
  isSupported,
  getVoices,
  getVoicesForLanguage,
  getBestVoice,
  getTTSController,
  speak,
  stopSpeaking,
  isSpeaking,
  getSupportedLanguages,
  TextToSpeechController,
  LANGUAGE_CODES,
};