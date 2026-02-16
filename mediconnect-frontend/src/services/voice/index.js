// src/services/voice/index.js
/**
 * Voice Services Index
 * Central export for all voice-related services
 */

// Import from individual service files
import speechRecognitionService, {
  isSupported as isSpeechRecognitionSupported,
  createRecognition,
  getRecognitionController,
  recognizeSpeech,
  requestMicrophonePermission,
  checkMicrophonePermission,
} from './speechRecognition';

import textToSpeechService, {
  isSupported as isTTSSupported,
  getVoices,
  getVoicesForLanguage,
  getBestVoice,
  getTTSController,
  speak,
  stopSpeaking,
  isSpeaking,
  getSupportedLanguages as getTTSSupportedLanguages,
} from './textToSpeech';

import voiceCommandsService, {
  getVoiceCommandsController,
  getRouteForCommand,
  COMMAND_PATTERNS,
  RESPONSE_MESSAGES,
} from './voiceCommands';

// ==================== Speech Recognition Exports ====================
export {
  isSpeechRecognitionSupported,
  createRecognition,
  getRecognitionController,
  recognizeSpeech,
  requestMicrophonePermission,
  checkMicrophonePermission,
};

// ==================== Text-to-Speech Exports ====================
export {
  isTTSSupported,
  getVoices,
  getVoicesForLanguage,
  getBestVoice,
  getTTSController,
  speak,
  stopSpeaking,
  isSpeaking,
  getTTSSupportedLanguages,
};

// ==================== Voice Commands Exports ====================
export {
  getVoiceCommandsController,
  getRouteForCommand,
  COMMAND_PATTERNS,
  RESPONSE_MESSAGES,
};

// ==================== Service Object Exports ====================
export {
  speechRecognitionService as speechRecognition,
  textToSpeechService as textToSpeech,
  voiceCommandsService as voiceCommands,
};

// ==================== Utility Functions ====================

/**
 * Check if all voice features are supported
 */
export const checkVoiceSupport = () => {
  if (typeof window === 'undefined') {
    return {
      speechRecognition: false,
      textToSpeech: false,
      microphone: false,
      fullSupport: false,
    };
  }

  const speechRecognitionSupported =
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  const speechSynthesisSupported = 'speechSynthesis' in window;

  const mediaDevicesSupported =
    'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;

  return {
    speechRecognition: speechRecognitionSupported,
    textToSpeech: speechSynthesisSupported,
    microphone: mediaDevicesSupported,
    fullSupport: speechRecognitionSupported && speechSynthesisSupported && mediaDevicesSupported,
  };
};

/**
 * Initialize all voice services
 */
export const initializeVoiceServices = (options = {}) => {
  const {
    language = 'en',
    continuous = false,
    interimResults = true,
    speakResponses = true,
    onSpeechResult,
    onSpeechInterim,
    onSpeechError,
    onSpeechStart,
    onSpeechEnd,
    onTTSStart,
    onTTSEnd,
    onTTSError,
    onCommand,
    onNavigate,
    onAction,
    onNotUnderstood,
  } = options;

  const support = checkVoiceSupport();
  const controllers = {};

  // Initialize speech recognition
  if (support.speechRecognition) {
    controllers.recognition = getRecognitionController();
    controllers.recognition.init({
      language,
      continuous,
      interimResults,
      onResult: onSpeechResult,
      onInterim: onSpeechInterim,
      onError: onSpeechError,
      onStart: onSpeechStart,
      onEnd: onSpeechEnd,
    });
  }

  // Initialize TTS
  if (support.textToSpeech) {
    controllers.tts = getTTSController();
    controllers.tts.init({
      language,
      onStart: onTTSStart,
      onEnd: onTTSEnd,
      onError: onTTSError,
    });
  }

  // Initialize voice commands
  if (support.speechRecognition) {
    controllers.commands = getVoiceCommandsController();
    controllers.commands.init({
      language,
      speakResponses,
      onCommand,
      onNavigate,
      onAction,
      onNotUnderstood,
    });
  }

  return {
    support,
    controllers,
  };
};

// ==================== Default Export ====================
const voiceServices = {
  speechRecognition: speechRecognitionService,
  textToSpeech: textToSpeechService,
  voiceCommands: voiceCommandsService,
  checkVoiceSupport,
  initializeVoiceServices,
};

export default voiceServices;