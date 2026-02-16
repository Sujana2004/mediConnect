// Frontend/src/hooks/useTextToSpeech.js
import { useState, useEffect, useCallback, useRef } from 'react';

export const useTextToSpeech = (options = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [error, setError] = useState(null);
  const utteranceRef = useRef(null);

  const {
    rate = 1,
    pitch = 1,
    volume = 1,
    language = 'en-US',
    onStart = null,
    onEnd = null,
    onError = null,
    onPause = null,
    onResume = null,
  } = options;

  useEffect(() => {
    if ('speechSynthesis' in window) {
      setIsSupported(true);

      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        
        // Set default voice
        const defaultVoice = availableVoices.find(voice => voice.lang.startsWith(language)) 
          || availableVoices[0];
        setSelectedVoice(defaultVoice);
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.cancel();
      };
    } else {
      setIsSupported(false);
      setError('Text-to-speech is not supported in this browser');
    }
  }, [language]);

  const speak = useCallback((text) => {
    if (!isSupported || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      if (onStart) onStart();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      if (onEnd) onEnd();
    };

    utterance.onerror = (event) => {
      setError(event.error);
      setIsSpeaking(false);
      setIsPaused(false);
      if (onError) onError(event.error);
    };

    utterance.onpause = () => {
      setIsPaused(true);
      if (onPause) onPause();
    };

    utterance.onresume = () => {
      setIsPaused(false);
      if (onResume) onResume();
    };

    window.speechSynthesis.speak(utterance);
  }, [isSupported, selectedVoice, rate, pitch, volume, onStart, onEnd, onError, onPause, onResume]);

  const pause = useCallback(() => {
    if (isSupported && isSpeaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSupported, isSpeaking]);

  const resume = useCallback(() => {
    if (isSupported && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isSupported, isPaused]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [isSupported]);

  const changeVoice = useCallback((voice) => {
    setSelectedVoice(voice);
  }, []);

  return {
    speak,
    pause,
    resume,
    stop,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    selectedVoice,
    changeVoice,
    error,
  };
};

export default useTextToSpeech;