// src/store/voiceStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Safe browser environment check
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Check voice support safely
 */
const checkVoiceSupport = () => {
  if (!isBrowser) return false;
  return 'speechSynthesis' in window || 'webkitSpeechRecognition' in window;
};

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
 * Store reference for voice change handler cleanup
 */
let voicesChangedHandler = null;

const useVoiceStore = create(
  persist(
    (set, get) => ({
      // Settings State
      voiceEnabled: false,
      voiceCommandsEnabled: false,
      textToSpeechEnabled: false,
      speechRate: 1,
      speechPitch: 1,
      speechVolume: 1,
      preferredVoice: null,

      // Runtime State (not persisted)
      isListening: false,
      isSpeaking: false,
      transcript: '',
      interimTranscript: '',
      error: null,
      availableVoices: [],
      isSupported: checkVoiceSupport(),

      // Settings Actions
      setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),

      setVoiceCommandsEnabled: (enabled) => set({ voiceCommandsEnabled: enabled }),

      setTextToSpeechEnabled: (enabled) => set({ textToSpeechEnabled: enabled }),

      setSpeechRate: (rate) => set({ speechRate: Math.max(0.5, Math.min(2, rate)) }),

      setSpeechPitch: (pitch) => set({ speechPitch: Math.max(0.5, Math.min(2, pitch)) }),

      setSpeechVolume: (volume) => set({ speechVolume: Math.max(0, Math.min(1, volume)) }),

      setPreferredVoice: (voiceUri) => set({ preferredVoice: voiceUri }),

      // Runtime Actions
      setIsListening: (isListening) => set({ isListening }),

      setIsSpeaking: (isSpeaking) => set({ isSpeaking }),

      setTranscript: (transcript) => set({ transcript }),

      setInterimTranscript: (interimTranscript) => set({ interimTranscript }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      clearTranscript: () => set({ transcript: '', interimTranscript: '' }),

      setAvailableVoices: (voices) => set({ availableVoices: voices }),

      // Get voice for current language
      getVoiceForLanguage: (langCode) => {
        const { availableVoices, preferredVoice } = get();

        // Language code mapping for speech synthesis
        const langMap = {
          'en': ['en-US', 'en-GB', 'en-IN', 'en'],
          'hi': ['hi-IN', 'hi'],
          'te': ['te-IN', 'te']
        };

        const langCodes = langMap[langCode] || langMap['en'];

        // Try preferred voice first
        if (preferredVoice) {
          const preferred = availableVoices.find(v => v.voiceURI === preferredVoice);
          if (preferred) return preferred;
        }

        // Find voice matching language
        for (const code of langCodes) {
          const voice = availableVoices.find(v =>
            v.lang.toLowerCase().startsWith(code.toLowerCase())
          );
          if (voice) return voice;
        }

        // Fallback to first available voice
        return availableVoices[0] || null;
      },

      // Toggle voice assistance
      toggleVoiceAssistance: () => {
        const { voiceEnabled } = get();
        const newState = !voiceEnabled;

        set({
          voiceEnabled: newState,
          voiceCommandsEnabled: newState,
          textToSpeechEnabled: newState
        });

        return newState;
      },

      // Reset to defaults
      resetVoiceSettings: () => {
        set({
          voiceEnabled: false,
          voiceCommandsEnabled: false,
          textToSpeechEnabled: false,
          speechRate: 1,
          speechPitch: 1,
          speechVolume: 1,
          preferredVoice: null
        });
      },

      // Initialize available voices
      initializeVoices: () => {
        if (!isBrowser || !window.speechSynthesis) {
          return;
        }

        const synthesis = window.speechSynthesis;

        const loadVoices = () => {
          try {
            const voices = synthesis.getVoices();
            if (voices && voices.length > 0) {
              set({ availableVoices: voices });
            }
          } catch {
            // Voice loading failed silently
          }
        };

        // Load voices immediately
        loadVoices();

        // Chrome loads voices asynchronously
        if (synthesis.onvoiceschanged !== undefined) {
          // Clean up previous handler if exists to prevent memory leak
          if (voicesChangedHandler) {
            try {
              synthesis.removeEventListener('voiceschanged', voicesChangedHandler);
            } catch {
              // Cleanup failed silently
            }
          }

          // Store reference and add new handler
          voicesChangedHandler = loadVoices;
          try {
            synthesis.addEventListener('voiceschanged', voicesChangedHandler);
          } catch {
            // Fallback to direct assignment for older browsers
            synthesis.onvoiceschanged = voicesChangedHandler;
          }
        }
      }
    }),
    {
      name: 'voice-storage',
      storage: createJSONStorage(createSafeStorage),
      partialize: (state) => ({
        voiceEnabled: state.voiceEnabled,
        voiceCommandsEnabled: state.voiceCommandsEnabled,
        textToSpeechEnabled: state.textToSpeechEnabled,
        speechRate: state.speechRate,
        speechPitch: state.speechPitch,
        speechVolume: state.speechVolume,
        preferredVoice: state.preferredVoice
      })
    }
  )
);

export default useVoiceStore;