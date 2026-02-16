/**
 * API Services Index
 * Central export for all API services
 */

// ==================== Import All Services ====================
import authServiceDefault from './authService';
import appointmentServiceDefault from './appointmentService';
import consultationServiceDefault from './consultationService';
import diagnosisServiceDefault from './diagnosisService';
import healthRecordsServiceDefault from './healthRecordsService';
import medicineServiceDefault from './medicineService';
import chatbotServiceDefault from './chatbotService';
import emergencyServiceDefault from './emergencyService';
import notificationServiceDefault from './notificationService';

// ==================== Named Service Exports ====================
export const authService = authServiceDefault;
export const appointmentService = appointmentServiceDefault;
export const consultationService = consultationServiceDefault;
export const diagnosisService = diagnosisServiceDefault;
export const healthRecordsService = healthRecordsServiceDefault;
export const medicineService = medicineServiceDefault;
export const chatbotService = chatbotServiceDefault;
export const emergencyService = emergencyServiceDefault;
export const notificationService = notificationServiceDefault;

// ==================== Auth Service Functions ====================
export {
  login,
  logout,
  registerPatient,
  registerDoctor,
  refreshToken,
  getProfile,
  updateProfile,
  updateProfilePicture,
  getDoctors,
  getDoctorById,
  getHelpers,
  addHelper,
  removeHelper,
  updateHelper,
  changeLanguage,
  updateFcmToken,
} from './authService';

// ==================== Appointment Service Functions ====================
export {
  getAppointments,
  getAppointmentById,
  createAppointment,
  cancelAppointment,
  rescheduleAppointment,
  checkInAppointment,
  confirmAppointment,
  startAppointment,
  completeAppointment,
  getTodayAppointments,
  getTodaySummary,
  getUpcomingAppointments,
  getAvailableSlots,
  getSchedules,
  createSchedule,
  bulkUpdateSchedules,
  updateSchedule,
  deleteSchedule,
  getQueue,
  getWaitingQueue,
  callNextPatient,
  performQueueAction,
  getExceptions,
  addLeave,
  deleteException,
} from './appointmentService';

// ==================== Consultation Service Functions ====================
export {
  getConsultations,
  getConsultationById,
  createConsultation,
  createConsultationFromAppointment,
  startConsultation,
  endConsultation,
  joinConsultation,
  joinWaitingRoom,
  getConsultationNotes,
  addConsultationNote,
  getConsultationPrescriptions,
  addConsultationPrescription,
  submitFeedback,
  getJitsiConfig,
} from './consultationService';

// ==================== Diagnosis Service Functions ====================
export {
  diagnoseFromText,
  diagnoseFromSymptoms,
  getSymptoms,
  getSymptomsByCategory,
  searchSymptoms,
  getDiseases,
  getDiagnosisHistory,
  getSessionDetails,
  submitDiagnosisFeedback,
} from './diagnosisService';

// ==================== Health Records Service Functions ====================
export {
  getHealthProfile,
  updateHealthProfile,
  getVitals,
  addVitals,
  getLatestVitals,
  getConditions,
  addCondition,
  updateCondition,
  deleteCondition,
  getAllergies,
  addAllergy,
  updateAllergy,
  deleteAllergy,
  getDocuments,
  uploadDocument,
  deleteDocument,
  getLabReports,
  getVaccinations,
  addVaccination,
  getFamilyHistory,
  addFamilyHistory,
  deleteFamilyHistory,
  getHospitalizations,
  addHospitalization,
  getSharedRecords,
  shareRecordsWithDoctor,
  revokeSharing,
  getAccessiblePatients,
  getHealthAnalytics,
} from './healthRecordsService';

// ==================== Medicine Service Functions ====================
export {
  getMedicines,
  getMedicineById,
  searchMedicines,
  getMedicineAlternatives,
  getMedicineInteractions,
  checkMedicineInteractions,
  getPrescriptions,
  getPrescriptionById,
  createPrescription,
  getActivePrescriptions,
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  getTodayReminders,
  getReminderLogs,
  respondToReminder,
} from './medicineService';

// ==================== Chatbot Service Functions ====================
// Note: Some functions renamed to avoid conflicts
export {
  startSession as startChatSession,
  getSessionMessages as getChatSessionMessages,
  endSession as endChatSession,
  getSessions as getChatSessions,
  sendMessage as sendChatMessage,
  sendVoiceMessage as sendChatVoiceMessage,
  getFAQs,
  getHealthTips,
  getDailyHealthTip,
  translateText as chatbotTranslateText,
  textToSpeech as chatbotTextToSpeech,
  detectLanguage as chatbotDetectLanguage,
} from './chatbotService';

// ==================== Emergency Service Functions ====================
export {
  triggerSOS,
  quickTriggerSOS,
  getActiveSOS,
  cancelSOS,
  getSOSHistory,
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  setPrimaryContact,
  getNearbyServices,
  getNearbyHospitals,
  getNearbyAmbulances,
  getNearbyPharmacies,
  getHelplines,
  getNationalHelplines,
  getFirstAidGuides,
  getFirstAidGuideById,
  getFirstAidCategories,
  searchFirstAidGuides,
} from './emergencyService';

// ==================== Notification Service Functions ====================
export {
  getNotifications,
  getNotificationById,
  markAsRead,
  markOneAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  clearAllNotifications,
  getPreferences as getNotificationPreferences,
  updatePreferences as updateNotificationPreferences,
  toggleNotificationType,
  registerDevice,
  unregisterDevice,
  updateDeviceToken,
} from './notificationService';

// ==================== Default Export ====================
const apiServices = {
  auth: authServiceDefault,
  appointment: appointmentServiceDefault,
  consultation: consultationServiceDefault,
  diagnosis: diagnosisServiceDefault,
  healthRecords: healthRecordsServiceDefault,
  medicine: medicineServiceDefault,
  chatbot: chatbotServiceDefault,
  emergency: emergencyServiceDefault,
  notification: notificationServiceDefault,
};

export default apiServices;