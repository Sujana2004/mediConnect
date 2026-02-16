// src/services/index.js
/**
 * Services Index
 * Central export for all services
 */

// ==================== API Services ====================
export {
  authService,
  appointmentService,
  consultationService,
  diagnosisService,
  healthRecordsService,
  medicineService,
  chatbotService,
  emergencyService,
  notificationService,
  login,
  logout,
  registerPatient,
  registerDoctor,
  refreshToken,
  getProfile,
  updateProfile,
  getDoctors,
  getDoctorById,
  getAppointments,
  createAppointment,
  cancelAppointment,
  getAvailableSlots,
  getTodayAppointments,
  getUpcomingAppointments,
  getConsultations,
  startConsultation,
  endConsultation,
  joinConsultation,
  getHealthProfile,
  getMedicines,
  triggerSOS,
  getNotifications
} from './api';

export { default as apiServices } from './api';

// ==================== Translation Services ====================
export {
  translateText,
  translateMultiple,
  detectLanguage,
  getSupportedLanguages,
  clearTranslationCache,
  getCacheStats
} from './translation/translationService';

export { default as translationService } from './translation/translationService';

// ==================== Voice Services ====================
export {
  speechRecognition,
  textToSpeech,
  voiceCommands,
  isSpeechRecognitionSupported,
  createRecognition,
  getRecognitionController,
  recognizeSpeech,
  requestMicrophonePermission,
  checkMicrophonePermission,
  isTTSSupported,
  getVoices,
  getTTSController,
  speak,
  stopSpeaking,
  isSpeaking,
  getVoiceCommandsController,
  getRouteForCommand,
  COMMAND_PATTERNS,
  checkVoiceSupport,
  initializeVoiceServices
} from './voice';

// ==================== FCM Services ====================
export {
  isFCMSupported,
  initializeMessaging,
  requestNotificationPermission,
  getFCMToken,
  onForegroundMessage,
  showLocalNotification,
  deleteFCMToken
} from './fcm';

export { default as voiceServices } from './voice';

// ==================== Combined Default Export ====================
import apiServices from './api';
import translationService from './translation/translationService';
import voiceServices from './voice';
import { fcmService } from './fcm';

const services = {
  api: apiServices,
  translation: translationService,
  voice: voiceServices,
  fcm: fcmService,
};

export default services;