/**
 * Speech Recognition Service
 * Uses Web Speech API for voice input
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
 * Error messages for speech recognition errors
 * @readonly
 */
const ERROR_MESSAGES = Object.freeze({
  'no-speech': 'No speech detected. Please try again.',
  'audio-capture': 'No microphone found. Please check your microphone.',
  'not-allowed': 'Microphone permission denied. Please allow microphone access.',
  'network': 'Network error occurred. Please check your connection.',
  'aborted': 'Speech recognition was aborted.',
  'language-not-supported': 'Language not supported.',
  'service-not-allowed': 'Speech recognition service not allowed.',
});

/**
 * Get SpeechRecognition constructor (browser-compatible)
 * @returns {SpeechRecognition|null}
 */
const getSpeechRecognitionConstructor = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

/**
 * Check if speech recognition is available
 * @returns {boolean} Whether speech recognition is supported
 */
export const isSupported = () => {
  return getSpeechRecognitionConstructor() !== null;
};

/**
 * Create a speech recognition instance
 * @param {Object} options - Configuration options
 * @param {string} [options.language='en'] - Language code (en/hi/te)
 * @param {boolean} [options.continuous=false] - Continuous recognition
 * @param {boolean} [options.interimResults=true] - Show interim results
 * @returns {SpeechRecognition|null} Speech recognition instance
 */
export const createRecognition = (options = {}) => {
  const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();

  if (!SpeechRecognitionConstructor) {
    console.error('Speech recognition is not supported in this browser');
    return null;
  }

  const {
    language = 'en',
    continuous = false,
    interimResults = true,
  } = options;

  const recognition = new SpeechRecognitionConstructor();

  // Configure recognition
  recognition.lang = LANGUAGE_CODES[language] || LANGUAGE_CODES.en;
  recognition.continuous = continuous;
  recognition.interimResults = interimResults;
  recognition.maxAlternatives = 3;

  return recognition;
};

/**
 * Speech recognition controller class
 * Provides a cleaner interface for managing speech recognition
 */
class SpeechRecognitionController {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.language = 'en';
    this.onResult = null;
    this.onInterim = null;
    this.onError = null;
    this.onStart = null;
    this.onEnd = null;
    this.onNoMatch = null;
  }

  /**
   * Initialize recognition with options
   * @param {Object} options - Configuration options
   */
  init(options = {}) {
    const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();

    if (!SpeechRecognitionConstructor) {
      throw new Error('Speech recognition is not supported in this browser');
    }

    const {
      language = 'en',
      continuous = false,
      interimResults = true,
      onResult,
      onInterim,
      onError,
      onStart,
      onEnd,
      onNoMatch,
    } = options;

    this.language = language;
    this.onResult = onResult;
    this.onInterim = onInterim;
    this.onError = onError;
    this.onStart = onStart;
    this.onEnd = onEnd;
    this.onNoMatch = onNoMatch;

    this.recognition = new SpeechRecognitionConstructor();
    this.recognition.lang = LANGUAGE_CODES[language] || LANGUAGE_CODES.en;
    this.recognition.continuous = continuous;
    this.recognition.interimResults = interimResults;
    this.recognition.maxAlternatives = 3;

    this._setupEventListeners();
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStart) this.onStart();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEnd) this.onEnd();
    };

    this.recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          if (this.onResult) {
            this.onResult({
              transcript: transcript.trim(),
              confidence,
              isFinal: true,
              alternatives: Array.from(event.results[i]).map((alt) => ({
                transcript: alt.transcript,
                confidence: alt.confidence,
              })),
            });
          }
        } else {
          if (this.onInterim) {
            this.onInterim({
              transcript: transcript.trim(),
              confidence,
              isFinal: false,
            });
          }
        }
      }
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;

      const errorMessage =
        ERROR_MESSAGES[event.error] || `Speech recognition error: ${event.error}`;

      if (this.onError) {
        this.onError({
          error: event.error,
          message: errorMessage,
        });
      }
    };

    this.recognition.onnomatch = () => {
      if (this.onNoMatch) {
        this.onNoMatch();
      }
    };
  }

  /**
   * Start listening
   * @returns {boolean} Whether listening started successfully
   */
  start() {
    if (!this.recognition) {
      console.error('Recognition not initialized. Call init() first.');
      return false;
    }

    if (this.isListening) {
      console.warn('Already listening');
      return true;
    }

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Error starting recognition:', error);
      return false;
    }
  }

  /**
   * Stop listening
   */
  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Abort listening
   */
  abort() {
    if (this.recognition) {
      this.recognition.abort();
      this.isListening = false;
    }
  }

  /**
   * Change language
   * @param {string} language - Language code (en/hi/te)
   */
  setLanguage(language) {
    this.language = language;
    if (this.recognition) {
      this.recognition.lang = LANGUAGE_CODES[language] || LANGUAGE_CODES.en;
    }
  }

  /**
   * Get current listening state
   * @returns {boolean} Whether currently listening
   */
  getIsListening() {
    return this.isListening;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.abort();
    this.recognition = null;
    this.onResult = null;
    this.onInterim = null;
    this.onError = null;
    this.onStart = null;
    this.onEnd = null;
    this.onNoMatch = null;
  }
}

// Singleton instance
let recognitionController = null;

/**
 * Get or create recognition controller singleton
 * @returns {SpeechRecognitionController} Recognition controller instance
 */
export const getRecognitionController = () => {
  if (!recognitionController) {
    recognitionController = new SpeechRecognitionController();
  }
  return recognitionController;
};

/**
 * Simple one-shot speech recognition
 * @param {Object} options - Options
 * @param {string} [options.language='en'] - Language code
 * @param {number} [options.timeout=10000] - Timeout in ms
 * @returns {Promise<Object>} Recognition result
 */
export const recognizeSpeech = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isSupported()) {
      reject(new Error('Speech recognition is not supported'));
      return;
    }

    const { language = 'en', timeout = 10000 } = options;

    const recognition = createRecognition({
      language,
      continuous: false,
      interimResults: false,
    });

    if (!recognition) {
      reject(new Error('Failed to create recognition instance'));
      return;
    }

    let timeoutId = null;
    let hasResult = false;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    recognition.onresult = (event) => {
      hasResult = true;
      cleanup();

      const result = event.results[0][0];
      resolve({
        transcript: result.transcript.trim(),
        confidence: result.confidence,
        alternatives: Array.from(event.results[0]).map((alt) => ({
          transcript: alt.transcript,
          confidence: alt.confidence,
        })),
      });
    };

    recognition.onerror = (event) => {
      cleanup();
      reject(new Error(event.error));
    };

    recognition.onend = () => {
      cleanup();
      if (!hasResult) {
        reject(new Error('No speech detected'));
      }
    };

    // Set timeout
    timeoutId = setTimeout(() => {
      recognition.stop();
      if (!hasResult) {
        reject(new Error('Speech recognition timeout'));
      }
    }, timeout);

    try {
      recognition.start();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
};

/**
 * Request microphone permission
 * @returns {Promise<boolean>} Whether permission was granted
 */
export const requestMicrophonePermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop all tracks after getting permission
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone permission denied:', error);
    return false;
  }
};

/**
 * Check microphone permission status
 * @returns {Promise<string>} Permission state ('granted', 'denied', 'prompt')
 */
export const checkMicrophonePermission = async () => {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' });
    return result.state;
  } catch {
    // Permissions API not supported, try to request
    console.warn('Permissions API not supported');
    return 'prompt';
  }
};

export default {
  isSupported,
  createRecognition,
  getRecognitionController,
  recognizeSpeech,
  requestMicrophonePermission,
  checkMicrophonePermission,
  SpeechRecognitionController,
  LANGUAGE_CODES,
};