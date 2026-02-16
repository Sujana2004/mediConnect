// src/contexts/VoiceContext.jsx
/**
 * Voice Context
 * Provides voice functionality throughout the app
 * Manages speech recognition, text-to-speech, and voice commands
 * Uses sessionStorage for caching - minimal direct DOM access
 */

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { useVoiceStore, useLanguageStore, useAuthStore } from '../store';
import toast from 'react-hot-toast';

// Create context
const VoiceContext = createContext(null);

// Session storage keys
const STORAGE_KEYS = {
  VOICE_SUPPORTED: 'voice_supported',
  MIC_PERMISSION: 'mic_permission'
};

/**
 * Safe sessionStorage getter
 */
const getFromSession = (key, defaultValue = null) => {
  try {
    const value = sessionStorage.getItem(key);
    return value !== null ? value : defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * Safe sessionStorage setter
 */
const setToSession = (key, value) => {
  try {
    if (value === null || value === undefined) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, String(value));
    }
  } catch {
    // Ignore storage errors
  }
};

/**
 * Language code mapping for speech APIs
 */
const LANGUAGE_CODES = {
  en: 'en-US',
  hi: 'hi-IN',
  te: 'te-IN'
};

/**
 * Voice Provider Component
 */
function VoiceProvider({ children }) {
  // Store hooks - using selectors for performance
  const isListening = useVoiceStore((state) => state.isListening);
  const isSpeaking = useVoiceStore((state) => state.isSpeaking);
  const isVoiceEnabled = useVoiceStore((state) => state.isVoiceEnabled);
  const voiceSpeed = useVoiceStore((state) => state.voiceSpeed);
  const voicePitch = useVoiceStore((state) => state.voicePitch);
  const voiceVolume = useVoiceStore((state) => state.voiceVolume);
  const setIsListening = useVoiceStore((state) => state.setIsListening);
  const setIsSpeaking = useVoiceStore((state) => state.setIsSpeaking);
  const setIsSupported = useVoiceStore((state) => state.setIsSupported);

  const currentLanguage = useLanguageStore((state) => state.currentLanguage);

  // Local state for support check
  const [isSupported, setLocalIsSupported] = useState(() => {
    return getFromSession(STORAGE_KEYS.VOICE_SUPPORTED) === 'true';
  });

  // Refs for Web Speech API instances
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const isInitializedRef = useRef(false);
  const utteranceQueueRef = useRef([]);

  /**
   * Get language code for speech APIs
   */
  const getLanguageCode = useCallback((lang) => {
    return LANGUAGE_CODES[lang] || 'en-US';
  }, []);

  /**
   * Check voice support
   */
  const checkVoiceSupport = useCallback(() => {
    // Check from session first
    const cached = getFromSession(STORAGE_KEYS.VOICE_SUPPORTED);
    if (cached !== null) {
      return {
        speechRecognition: cached === 'true',
        speechSynthesis: cached === 'true',
        fullSupport: cached === 'true'
      };
    }

    const hasSpeechRecognition = typeof window !== 'undefined' && 
      !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const hasSpeechSynthesis = typeof window !== 'undefined' && 
      'speechSynthesis' in window;
    const fullSupport = hasSpeechRecognition && hasSpeechSynthesis;

    // Cache result
    setToSession(STORAGE_KEYS.VOICE_SUPPORTED, String(fullSupport));

    return {
      speechRecognition: hasSpeechRecognition,
      speechSynthesis: hasSpeechSynthesis,
      fullSupport
    };
  }, []);

  /**
   * Request microphone permission
   */
  const requestMicrophonePermission = useCallback(async () => {
    // Check cached permission
    const cached = getFromSession(STORAGE_KEYS.MIC_PERMISSION);
    if (cached === 'granted') {
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop all tracks immediately
      stream.getTracks().forEach((track) => track.stop());
      setToSession(STORAGE_KEYS.MIC_PERMISSION, 'granted');
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error.message);
      setToSession(STORAGE_KEYS.MIC_PERMISSION, 'denied');
      return false;
    }
  }, []);

  /**
   * Initialize voice services
   */
  useEffect(() => {
    if (isInitializedRef.current) return;
    if (typeof window === 'undefined') return;

    const support = checkVoiceSupport();
    setLocalIsSupported(support.fullSupport);
    setIsSupported(support.fullSupport);

    // Initialize Speech Synthesis
    if (support.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }

    // Initialize Speech Recognition
    if (support.speechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      try {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = getLanguageCode(currentLanguage);

        recognitionRef.current.onstart = () => setIsListening(true);
        recognitionRef.current.onend = () => setIsListening(false);

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);

          const errorMessages = {
            'not-allowed': 'Microphone permission denied',
            'no-speech': 'No speech detected',
            'audio-capture': 'No microphone found',
            'network': 'Network error occurred'
          };

          const message = errorMessages[event.error];
          if (message) {
            toast.error(message);
          }
        };

        recognitionRef.current.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join('');
          console.log('Voice: Speech result:', transcript);
        };
      } catch (error) {
        console.error('Voice: Failed to initialize speech recognition:', error);
      }
    }

    isInitializedRef.current = true;

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      utteranceQueueRef.current = [];
    };
  }, [checkVoiceSupport, currentLanguage, getLanguageCode, setIsListening, setIsSupported]);

  /**
   * Update recognition language when it changes
   */
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = getLanguageCode(currentLanguage);
    }
  }, [currentLanguage, getLanguageCode]);

  /**
   * Start listening
   */
  const startListening = useCallback(async () => {
    if (!isVoiceEnabled) {
      toast.error('Voice features are disabled. Enable in settings.');
      return false;
    }

    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported');
      return false;
    }

    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      toast.error('Microphone permission required');
      return false;
    }

    try {
      recognitionRef.current.start();
      return true;
    } catch (error) {
      // Already started - ignore
      if (error.message?.includes('already started')) {
        return true;
      }
      console.error('Voice: Start listening error:', error);
      return false;
    }
  }, [isVoiceEnabled, requestMicrophonePermission]);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
  }, []);

  /**
   * Toggle listening
   */
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  /**
   * Speak text
   */
  const speak = useCallback(
    (text, options = {}) => {
      if (!synthRef.current || !isVoiceEnabled || !text) {
        return;
      }

      // Cancel any ongoing speech
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.language || getLanguageCode(currentLanguage);
      utterance.rate = options.rate ?? voiceSpeed ?? 1;
      utterance.pitch = options.pitch ?? voicePitch ?? 1;
      utterance.volume = options.volume ?? voiceVolume ?? 1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthRef.current.speak(utterance);
    },
    [isVoiceEnabled, currentLanguage, voiceSpeed, voicePitch, voiceVolume, getLanguageCode, setIsSpeaking]
  );

  /**
   * Speak long text (chunked)
   */
  const speakLongText = useCallback(
    (text, options = {}) => {
      if (!synthRef.current || !isVoiceEnabled || !text) return;

      // Cancel ongoing speech
      synthRef.current.cancel();
      utteranceQueueRef.current = [];

      // Split by sentences
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      let currentIndex = 0;

      const speakNext = () => {
        if (currentIndex >= sentences.length || !synthRef.current) {
          setIsSpeaking(false);
          return;
        }

        const sentence = sentences[currentIndex].trim();
        if (!sentence) {
          currentIndex++;
          speakNext();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(sentence);
        utterance.lang = options.language || getLanguageCode(currentLanguage);
        utterance.rate = options.rate ?? voiceSpeed ?? 1;
        utterance.pitch = options.pitch ?? voicePitch ?? 1;
        utterance.volume = options.volume ?? voiceVolume ?? 1;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          currentIndex++;
          speakNext();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
        };

        utteranceQueueRef.current.push(utterance);
        synthRef.current.speak(utterance);
      };

      speakNext();
    },
    [isVoiceEnabled, currentLanguage, voiceSpeed, voicePitch, voiceVolume, getLanguageCode, setIsSpeaking]
  );

  /**
   * Stop speaking
   */
  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      utteranceQueueRef.current = [];
      setIsSpeaking(false);
    }
  }, [setIsSpeaking]);

  /**
   * Pause speaking
   */
  const pauseSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.pause();
    }
  }, []);

  /**
   * Resume speaking
   */
  const resumeSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.resume();
    }
  }, []);

  /**
   * Read page content
   */
  const readPageContent = useCallback((elementRef = null) => {
    let content = '';

    if (elementRef?.current) {
      // Use provided ref
      content = elementRef.current.innerText || elementRef.current.textContent || '';
    } else {
      // Find main content area using data attribute first (preferred)
      const mainElement = 
        document.querySelector('[data-voice-content="true"]') ||
        document.querySelector('main') ||
        document.querySelector('[role="main"]');

      if (mainElement) {
        content = mainElement.innerText || mainElement.textContent || '';
      }
    }

    const trimmedContent = content.trim();
    if (trimmedContent) {
      speakLongText(trimmedContent);
    } else {
      toast.error('No content to read');
    }
  }, [speakLongText]);

  /**
   * Voice commands - start
   */
  const startVoiceCommands = useCallback(() => {
    return startListening();
  }, [startListening]);

  /**
   * Voice commands - stop
   */
  const stopVoiceCommands = useCallback(() => {
    stopListening();
  }, [stopListening]);

  /**
   * Voice commands - toggle
   */
  const toggleVoiceCommands = useCallback(() => {
    toggleListening();
  }, [toggleListening]);

  /**
   * Get available commands
   */
  const getAvailableCommands = useCallback(() => {
    return {
      navigation: ['go home', 'go back', 'appointments', 'profile', 'doctors'],
      actions: ['scroll up', 'scroll down', 'read page', 'stop reading']
    };
  }, []);

  /**
   * Clear voice data (for cleanup)
   */
  const clearVoiceData = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEYS.VOICE_SUPPORTED);
      sessionStorage.removeItem(STORAGE_KEYS.MIC_PERMISSION);
    } catch {
      // Ignore
    }

    if (synthRef.current) {
      synthRef.current.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
    }
    utteranceQueueRef.current = [];
  }, []);

  // Context value
  const contextValue = useMemo(
    () => ({
      // State
      isListening,
      isSpeaking,
      isVoiceEnabled,
      isSupported,
      currentLanguage,

      // Speech Recognition
      startListening,
      stopListening,
      toggleListening,

      // Text-to-Speech
      speak,
      speakLongText,
      stopSpeaking,
      pauseSpeaking,
      resumeSpeaking,
      readPageContent,

      // Voice Commands
      startVoiceCommands,
      stopVoiceCommands,
      toggleVoiceCommands,
      getAvailableCommands,

      // Utilities
      checkVoiceSupport,
      requestMicrophonePermission,
      clearVoiceData
    }),
    [
      isListening,
      isSpeaking,
      isVoiceEnabled,
      isSupported,
      currentLanguage,
      startListening,
      stopListening,
      toggleListening,
      speak,
      speakLongText,
      stopSpeaking,
      pauseSpeaking,
      resumeSpeaking,
      readPageContent,
      startVoiceCommands,
      stopVoiceCommands,
      toggleVoiceCommands,
      getAvailableCommands,
      checkVoiceSupport,
      requestMicrophonePermission,
      clearVoiceData
    ]
  );

  return (
    <VoiceContext.Provider value={contextValue}>
      {children}
    </VoiceContext.Provider>
  );
}

VoiceProvider.propTypes = {
  children: PropTypes.node.isRequired
};

/**
 * Hook to use voice context
 */
function useVoiceContext() {
  const context = useContext(VoiceContext);

  if (!context) {
    throw new Error('useVoiceContext must be used within a VoiceProvider');
  }

  return context;
}

// Named exports only
export { VoiceContext, VoiceProvider, useVoiceContext };