import { useCallback, useRef } from 'react';
import { isVoiceEnabled, getVoiceRate, getLanguage } from '../hooks/storage';

const LANGUAGE_VOICE_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
};

export const useVoiceOutput = () => {
  const utteranceRef = useRef(null);

  const speak = useCallback((text) => {
    if (!isVoiceEnabled() || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis?.cancel();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      const lang = getLanguage();

      utterance.lang = LANGUAGE_VOICE_MAP[lang] || 'en-IN';
      utterance.rate = getVoiceRate();
      utterance.pitch = 1;
      utterance.volume = 1;

      // Try to find a matching voice
      const voices = window.speechSynthesis?.getVoices() || [];
      const matchingVoice = voices.find((v) =>
        v.lang.startsWith(utterance.lang.split('-')[0])
      );
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utteranceRef.current = utterance;
      window.speechSynthesis?.speak(utterance);
    } catch (error) {
      console.error('Speech synthesis error:', error);
    }
  }, []);

  const stop = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
      utteranceRef.current = null;
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }, []);

  const isSpeaking = useCallback(() => {
    return window.speechSynthesis?.speaking || false;
  }, []);

  return { speak, stop, isSpeaking };
};

export default useVoiceOutput;