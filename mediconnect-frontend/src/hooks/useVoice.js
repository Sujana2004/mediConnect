import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useVoiceStore from '../store/voiceStore';
import useLanguageStore from '../store/languageStore';

/**
 * Custom hook for voice features
 * - Speech Recognition (voice input)
 * - Speech Synthesis (text-to-speech)
 * - Voice Commands (navigation)
 */
const useVoice = () => {
  const navigate = useNavigate();
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

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
      'check symptoms': '/patient/symptoms',
      'symptoms': '/patient/symptoms',
      'symptom checker': '/patient/symptoms',
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
      'लक्षण': '/patient/symptoms',
      'लक्षण जांचें': '/patient/symptoms',
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
      'లక్షణాలు': '/patient/symptoms',
      'చాట్': '/patient/chatbot',
      'నోటిఫికేషన్లు': '/patient/notifications',
      'అత్యవసరం': '/patient/emergency',
      'సహాయం': '/patient/emergency',
      'వెనుకకు': 'BACK'
    }
  };

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // Set language
    const langMap = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'te': 'te-IN'
    };
    recognition.lang = langMap[currentLanguage] || 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
      clearError();
      clearTranscript();
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        setInterimTranscript('');
        
        // Process voice command if enabled
        if (voiceCommandsEnabled) {
          processVoiceCommand(finalTranscript.toLowerCase().trim());
        }
      } else {
        setInterimTranscript(interimTranscript);
      }
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
        default:
          errorMessage = `Error: ${event.error}`;
      }
      
      setError(errorMessage);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [currentLanguage, voiceCommandsEnabled, setIsListening, setTranscript, setInterimTranscript, setError, clearError, clearTranscript]);

  // Process voice command
  const processVoiceCommand = useCallback((command) => {
    const commands = voiceCommands[currentLanguage] || voiceCommands.en;
    
    // Find matching command
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

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice features are not supported in this browser');
      return;
    }

    if (!recognitionRef.current) {
      initializeSpeechRecognition();
    }

    // Update language before starting
    const langMap = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'te': 'te-IN'
    };
    
    if (recognitionRef.current) {
      recognitionRef.current.lang = langMap[currentLanguage] || 'en-IN';
      
      try {
        recognitionRef.current.start();
      } catch (error) {
        if (error.name === 'InvalidStateError') {
          // Already listening
          recognitionRef.current.stop();
          setTimeout(() => {
            recognitionRef.current?.start();
          }, 100);
        } else {
          setError('Failed to start speech recognition');
        }
      }
    }
  }, [isSupported, currentLanguage, initializeSpeechRecognition, setError]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
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

  // Speak text (text-to-speech)
  const speak = useCallback((text, options = {}) => {
    if (!isSupported || !text) return;

    // Stop any current speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Get appropriate voice
    const voice = getVoiceForLanguage(options.lang || currentLanguage);
    if (voice) {
      utterance.voice = voice;
    }

    // Set language
    const langMap = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'te': 'te-IN'
    };
    utterance.lang = langMap[options.lang || currentLanguage] || 'en-IN';

    // Set speech properties
    utterance.rate = options.rate || speechRate;
    utterance.pitch = options.pitch || speechPitch;
    utterance.volume = options.volume || speechVolume;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      setIsSpeaking(false);
      if (event.error !== 'canceled') {
        setError('Failed to speak text');
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [isSupported, currentLanguage, speechRate, speechPitch, speechVolume, getVoiceForLanguage, setIsSpeaking, setError]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis.speaking) {
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
        recognitionRef.current.stop();
      }
      if (window.speechSynthesis.speaking) {
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
    // State
    isSupported,
    isInitialized,
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    error,
    availableVoices,
    
    // Settings
    voiceEnabled,
    voiceCommandsEnabled,
    textToSpeechEnabled,
    speechRate,
    
    // Speech Recognition Actions
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
    
    // Text-to-Speech Actions
    speak,
    stopSpeaking,
    readPageContent,
    
    // Settings Actions
    setVoiceEnabled,
    setVoiceCommandsEnabled,
    setTextToSpeechEnabled,
    setSpeechRate,
    
    // Utilities
    clearError,
    processVoiceCommand
  };
};

export default useVoice;
export { useVoice };