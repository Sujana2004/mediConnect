// src/hooks/useVoice.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useVoiceStore from '../store/voiceStore';
import useLanguageStore from '../store/languageStore';

const useVoice = () => {
  const navigate = useNavigate();
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // ── FIX: Track accumulated final transcript across
  //    multiple recognition result events ──
  const finalTranscriptRef = useRef('');

  const {
    voiceEnabled,
    voiceCommandsEnabled,
    textToSpeechEnabled,
    speechRate,
    speechPitch,
    speechVolume,
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    error,
    availableVoices,
    isSupported,
    setIsListening,
    setIsSpeaking,
    setTranscript,
    setInterimTranscript,
    setError,
    clearError,
    clearTranscript,
    getVoiceForLanguage,
    initializeVoices,
    setVoiceEnabled,
    setVoiceCommandsEnabled,
    setTextToSpeechEnabled,
    setSpeechRate
  } = useVoiceStore();

  const { currentLanguage } = useLanguageStore();

  // Voice command mappings
  const voiceCommands = {
    en: {
      'go to home': '/patient/home',
      'go home': '/patient/home',
      'home': '/patient/home',
      'find doctors': '/patient/doctors',
      'doctors': '/patient/doctors',
      'search doctors': '/patient/doctors',
      'my appointments': '/patient/appointments',
      'appointments': '/patient/appointments',
      'health records': '/patient/health-records',
      'records': '/patient/health-records',
      'medicines': '/patient/medicines',
      'medicine': '/patient/medicines',
      'settings': '/patient/settings',
      'profile': '/patient/settings',
      'check symptoms': '/patient/symptom-checker',
      'symptoms': '/patient/symptom-checker',
      'symptom checker': '/patient/symptom-checker',
      'chat': '/patient/chatbot',
      'chatbot': '/patient/chatbot',
      'notifications': '/patient/notifications',
      'emergency': '/patient/emergency',
      'help': '/patient/emergency',
      'go back': 'BACK',
      'back': 'BACK'
    },
    hi: {
      'होम': '/patient/home',
      'घर': '/patient/home',
      'डॉक्टर': '/patient/doctors',
      'डॉक्टर खोजें': '/patient/doctors',
      'अपॉइंटमेंट': '/patient/appointments',
      'स्वास्थ्य रिकॉर्ड': '/patient/health-records',
      'रिकॉर्ड': '/patient/health-records',
      'दवाइयां': '/patient/medicines',
      'दवा': '/patient/medicines',
      'सेटिंग्स': '/patient/settings',
      'लक्षण': '/patient/symptom-checker',
      'लक्षण जांचें': '/patient/symptom-checker',
      'चैट': '/patient/chatbot',
      'सूचनाएं': '/patient/notifications',
      'आपातकाल': '/patient/emergency',
      'मदद': '/patient/emergency',
      'वापस': 'BACK'
    },
    te: {
      'హోమ్': '/patient/home',
      'ఇల్లు': '/patient/home',
      'డాక్టర్లు': '/patient/doctors',
      'డాక్టర్ వెతకండి': '/patient/doctors',
      'అపాయింట్‌మెంట్లు': '/patient/appointments',
      'ఆరోగ్య రికార్డులు': '/patient/health-records',
      'రికార్డులు': '/patient/health-records',
      'మందులు': '/patient/medicines',
      'సెట్టింగ్‌లు': '/patient/settings',
      'లక్షణాలు': '/patient/symptom-checker',
      'చాట్': '/patient/chatbot',
      'నోటిఫికేషన్లు': '/patient/notifications',
      'అత్యవసరం': '/patient/emergency',
      'సహాయం': '/patient/emergency',
      'వెనుకకు': 'BACK'
    }
  };

  // Process voice command
  const processVoiceCommand = useCallback((command) => {
    const commands = voiceCommands[currentLanguage] || voiceCommands.en;
    for (const [phrase, action] of Object.entries(commands)) {
      if (command.includes(phrase)) {
        if (action === 'BACK') {
          navigate(-1);
        } else {
          navigate(action);
        }
        return true;
      }
    }
    return false;
  }, [currentLanguage, navigate]);

  // ═══════════════════════════════════════════════════════════
  // FIX: Initialize speech recognition with continuous = true
  // and proper transcript accumulation
  // ═══════════════════════════════════════════════════════════
  const initializeSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();

    // ── FIX #1: Enable continuous mode so it doesn't stop
    //    after the first pause in speech ──
    recognition.continuous = true;

    // ── FIX #2: Show interim results for real-time feedback ──
    recognition.interimResults = true;

    recognition.maxAlternatives = 1;

    // Set language
    const langMap = { 'en': 'en-IN', 'hi': 'hi-IN', 'te': 'te-IN' };
    recognition.lang = langMap[currentLanguage] || 'en-IN';

    recognition.onstart = () => {
      console.log('🎤 Recognition started');
      setIsListening(true);
      clearError();
      // ── FIX #3: Clear accumulated transcript on fresh start ──
      finalTranscriptRef.current = '';
      clearTranscript();
    };

    // ═══════════════════════════════════════════════════════
    // FIX #4: Properly accumulate results across multiple
    // onresult events. The old code only used the latest
    // event's transcript, losing all previous words.
    // ═══════════════════════════════════════════════════════
    recognition.onresult = (event) => {
      let sessionFinal = '';
      let sessionInterim = '';

      // Iterate through ALL results from the beginning,
      // not just from event.resultIndex
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          sessionFinal += text;
        } else {
          sessionInterim += text;
        }
      }

      // Store accumulated final transcript
      if (sessionFinal) {
        finalTranscriptRef.current = sessionFinal;
      }

      // Combine final + interim for display
      const displayText = (finalTranscriptRef.current + ' ' + sessionInterim).trim();

      // Update the store — this is what Chatbot.jsx reads
      setTranscript(displayText);
      setInterimTranscript(sessionInterim);

      console.log('🎤 Final:', finalTranscriptRef.current);
      console.log('🎤 Interim:', sessionInterim);
      console.log('🎤 Display:', displayText);
    };

    recognition.onerror = (event) => {
      let errorMessage = 'Speech recognition error';

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your microphone.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'aborted':
          // User stopped — not an error
          console.log('🎤 Recognition aborted by user');
          return;
        default:
          errorMessage = `Error: ${event.error}`;
      }

      setError(errorMessage);
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('🎤 Recognition ended');

      // ── FIX #5: Set final accumulated transcript on end
      //    so Chatbot.jsx has the complete sentence ──
      if (finalTranscriptRef.current.trim()) {
        setTranscript(finalTranscriptRef.current.trim());
      }
      setInterimTranscript('');
      setIsListening(false);

      // ── FIX #6: Process voice command only with
      //    the complete final transcript ──
      if (voiceCommandsEnabled && finalTranscriptRef.current.trim()) {
        processVoiceCommand(finalTranscriptRef.current.toLowerCase().trim());
      }
    };

    recognitionRef.current = recognition;
  }, [
    currentLanguage,
    voiceCommandsEnabled,
    setIsListening,
    setTranscript,
    setInterimTranscript,
    setError,
    clearError,
    clearTranscript,
    processVoiceCommand
  ]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice features are not supported in this browser');
      return;
    }

    // ── FIX: Always reinitialize to get fresh settings ──
    initializeSpeechRecognition();

    // Small delay to ensure initialization completes
    setTimeout(() => {
      if (recognitionRef.current) {
        // ── FIX: Clear previous accumulated transcript ──
        finalTranscriptRef.current = '';

        const langMap = { 'en': 'en-IN', 'hi': 'hi-IN', 'te': 'te-IN' };
        recognitionRef.current.lang = langMap[currentLanguage] || 'en-IN';

        try {
          recognitionRef.current.start();
          console.log('🎤 Started listening...');
        } catch (error) {
          if (error.name === 'InvalidStateError') {
            recognitionRef.current.stop();
            setTimeout(() => {
              try {
                finalTranscriptRef.current = '';
                recognitionRef.current?.start();
              } catch (e) {
                console.error('🎤 Failed to restart:', e);
                setError('Failed to start speech recognition');
              }
            }, 200);
          } else {
            console.error('🎤 Start error:', error);
            setError('Failed to start speech recognition');
          }
        }
      }
    }, 50);
  }, [isSupported, currentLanguage, initializeSpeechRecognition, setError]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('🎤 Stopped listening');
      } catch (e) {
        console.warn('🎤 Stop error (safe to ignore):', e);
      }
    }
    setIsListening(false);
  }, [setIsListening]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // ============================================
  // SPEAK FUNCTION (unchanged — already fixed)
  // ============================================
  const speak = useCallback((text, options = {}) => {
    if (!isSupported || !text) {
      console.warn('🔊 Speech not supported or empty text');
      return;
    }

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('🔊 Speech synthesis not available');
      return;
    }

    console.log('🔊 speak() called:', text.substring(0, 50) + '...');

    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .replace(/`/g, '')
      .replace(/_/g, '')
      .replace(/~~/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      console.warn('🔊 No text after cleaning');
      return;
    }

    if (window.speechSynthesis.speaking) {
      console.log('🔊 Canceling previous speech');
      window.speechSynthesis.cancel();
    }

    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);

        const langMap = { 'en': 'en-IN', 'hi': 'hi-IN', 'te': 'te-IN' };
        const targetLang = options.lang || currentLanguage;
        utterance.lang = langMap[targetLang] || 'en-IN';

        const voice = getVoiceForLanguage(targetLang);
        if (voice) {
          utterance.voice = voice;
          console.log('🔊 Using voice:', voice.name);
        }

        utterance.rate = options.rate || speechRate || 1;
        utterance.pitch = options.pitch || speechPitch || 1;
        utterance.volume = options.volume || speechVolume || 1;

        utterance.onstart = () => {
          console.log('🔊 Speech started');
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          console.log('🔊 Speech ended');
          setIsSpeaking(false);
        };

        utterance.onerror = (event) => {
          console.error('🔊 Speech error:', event.error);
          setIsSpeaking(false);
          if (event.error !== 'canceled') {
            setError('Failed to speak text');
          }
        };

        window.speechSynthesis.speak(utterance);
        console.log('🔊 Utterance queued');

      } catch (err) {
        console.error('🔊 Error in speak:', err);
        setError('Failed to speak text');
      }
    }, 150);

  }, [isSupported, currentLanguage, speechRate, speechPitch, speechVolume, getVoiceForLanguage, setIsSpeaking, setError]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, [setIsSpeaking]);

  // Read page content aloud
  const readPageContent = useCallback((selector = 'main') => {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.innerText || element.textContent;
      speak(text);
    }
  }, [speak]);

  // Initialize on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      initializeVoices();
      initializeSpeechRecognition();
      setIsInitialized(true);
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { /* safe */ }
      }
      if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Update recognition language when language changes
  useEffect(() => {
    if (recognitionRef.current && !isListening) {
      initializeSpeechRecognition();
    }
  }, [currentLanguage, isListening, initializeSpeechRecognition]);

  return {
    isSupported,
    isInitialized,
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    error,
    availableVoices,
    voiceEnabled,
    voiceCommandsEnabled,
    textToSpeechEnabled,
    speechRate,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    speak,
    stopSpeaking,
    readPageContent,
    setVoiceEnabled,
    setVoiceCommandsEnabled,
    setTextToSpeechEnabled,
    setSpeechRate,
    clearError,
    processVoiceCommand
  };
};

export default useVoice;
export { useVoice };