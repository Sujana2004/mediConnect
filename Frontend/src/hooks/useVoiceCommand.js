import { useEffect, useRef, useCallback } from 'react';
import { isVoiceEnabled, getLanguage } from '../hooks/storage';

const LANGUAGE_RECOGNITION_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
};

export const useVoiceCommand = ({ onCommand, commands = [], enabled = true }) => {
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);

  const startListening = useCallback(() => {
    if (!enabled || !isVoiceEnabled()) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      const lang = getLanguage();

      recognition.lang = LANGUAGE_RECOGNITION_MAP[lang] || 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      recognition.onresult = (event) => {
        const results = event.results[0];
        for (let i = 0; i < results.length; i++) {
          const transcript = results[i].transcript;
          const handled = onCommand(transcript);
          if (handled) break;
        }
      };

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.error('Speech recognition error:', event.error);
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
      };

      recognitionRef.current = recognition;
    } catch (error) {
      console.error('Error initializing speech recognition:', error);
    }
  }, [enabled, onCommand]);

  const listen = useCallback(() => {
    if (recognitionRef.current && !isListeningRef.current) {
      try {
        recognitionRef.current.start();
        isListeningRef.current = true;
      } catch (error) {
        console.error('Error starting recognition:', error);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
        isListeningRef.current = false;
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  }, []);

  useEffect(() => {
    startListening();
    return () => {
      stopListening();
      recognitionRef.current = null;
    };
  }, [startListening, stopListening]);

  return { listen, stopListening, isListening: isListeningRef.current };
};

export default useVoiceCommand;