// import axios from 'axios';
// import { getToken, clearStorage } from '../hooks/storage';

// // Create axios instance with base configuration
// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
//   headers: {
//     'Content-Type': 'application/json',
//   },
//   timeout: 30000, // 30 seconds timeout (increased for file uploads)
// });

// // Request interceptor to add auth token
// api.interceptors.request.use(
//   (config) => {
//     const token = getToken();
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
    
//     // Add language header for translations
//     const language = localStorage.getItem('mediconnect_language') || 'en';
//     config.headers['Accept-Language'] = language;
    
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// // Response interceptor for error handling
// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const { response, config } = error;

//     // Retry logic for network errors (only once)
//     if (!response && config && !config.__isRetry) {
//       config.__isRetry = true;
//       console.warn('Network error detected, retrying request once...', config.url);
//       await new Promise((resolve) => setTimeout(resolve, 1000));
//       return api(config);
//     }

//     if (response) {
//       const errorData = {
//         status: response.status,
//         message: response.data?.detail || response.data?.message || response.data?.error || 'An error occurred',
//         data: response.data,
//         errors: response.data?.errors || null, // Field-level errors
//       };

//       switch (response.status) {
//         case 401:
//           clearStorage();
//           if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
//             window.location.href = '/login';
//           }
//           break;
          
//         case 403:
//           console.error('Access forbidden:', errorData.message);
//           break;
          
//         case 404:
//           console.error('Resource not found:', response.config.url);
//           break;
          
//         case 422:
//           // Validation error
//           console.error('Validation error:', response.data);
//           break;
          
//         case 500:
//           console.error('Server error:', errorData.message);
//           break;
          
//         default:
//           console.error('API Error:', errorData.message);
//       }
      
//       return Promise.reject(errorData);
//     }

//     // Network error
//     return Promise.reject({
//       status: 0,
//       message: error?.message || 'Network error. Please check your connection.',
//       code: error?.code || null,
//       originalError: error
//     });
//   }
// );

// // ============================================
// // AUTH API - /auth/
// // ============================================
// export const authAPI = {
//   // Patient Registration
//   registerPatient: (data) => api.post('/auth/register/patient/', data),
  
//   // Doctor Registration
//   registerDoctor: (data) => api.post('/auth/register/doctor/', data),
  
//   // Login with Firebase token
//   login: (firebaseToken, fcmToken = null) => api.post('/auth/login/', { 
//     firebase_token: firebaseToken,
//     fcm_token: fcmToken 
//   }),
  
//   // Logout
//   logout: (refreshToken) => api.post('/auth/logout/', { refresh: refreshToken }),
  
//   // Token refresh
//   refreshToken: (refreshToken) => api.post('/auth/token/refresh/', { refresh: refreshToken }),
  
//   // Get/Update Profile
//   getProfile: () => api.get('/auth/profile/'),
//   updateProfile: (data) => api.put('/auth/profile/', data),
//   patchProfile: (data) => api.patch('/auth/profile/', data),
  
//   // Health check
//   healthCheck: () => api.get('/auth/health/'),
  
//   // Test Firebase (development)
//   testFirebase: () => api.get('/auth/test/firebase/'),
//   verifyFirebaseToken: (token) => api.post('/auth/test/firebase/', { token }),
// };

// // ============================================
// // DOCTORS API - /auth/doctors/
// // ============================================
// export const doctorsAPI = {
//   // List all verified doctors
//   list: (params) => api.get('/auth/doctors/', { params }),
  
//   // Get doctor by ID
//   getById: (id) => api.get(`/auth/doctors/${id}/`),
  
//   // Get specializations list
//   getSpecializations: () => api.get('/auth/doctors/specializations/'),
  
//   // Doctor availability management
//   getAvailability: () => api.get('/auth/doctor/availability/'),
//   addAvailability: (data) => api.post('/auth/doctor/availability/', data),
//   updateAvailability: (id, data) => api.post(`/auth/doctor/availability/${id}/`, data),
//   deleteAvailability: (id) => api.delete(`/auth/doctor/availability/${id}/`),
// };

// // ============================================
// // ADMIN API - /auth/admin/
// // ============================================
// export const adminAPI = {
//   // Doctor management
//   listDoctors: (params) => api.get('/auth/admin/doctors/', { params }),
//   verifyDoctor: (id, data) => api.post(`/auth/admin/doctors/${id}/verify/`, data),
  
//   // Patient management
//   listPatients: (params) => api.get('/auth/admin/patients/', { params }),
  
//   // Statistics
//   getStats: () => api.get('/auth/admin/stats/'),
// };

// // ============================================
// // FAMILY HELPER API - /auth/helpers/
// // ============================================
// export const familyHelperAPI = {
//   list: () => api.get('/auth/helpers/'),
//   add: (data) => api.post('/auth/helpers/', data),
//   update: (id, data) => api.put(`/auth/helpers/${id}/`, data),
//   delete: (id) => api.delete(`/auth/helpers/${id}/`),
// };

// // ============================================
// // SETTINGS API - /auth/settings/
// // ============================================
// export const settingsAPI = {
//   updateFCMToken: (fcmToken) => api.post('/auth/settings/fcm-token/', { fcm_token: fcmToken }),
//   changeLanguage: (language) => api.post('/auth/settings/language/', { language }),
// };

// // ============================================
// // APPOINTMENTS API - /appointments/
// // ============================================
// export const appointmentsAPI = {
//   // Appointments CRUD
//   list: (params) => api.get('/appointments/appointments/', { params }),
//   create: (data) => api.post('/appointments/appointments/', data),
//   getById: (id) => api.get(`/appointments/appointments/${id}/`),
//   update: (id, data) => api.put(`/appointments/appointments/${id}/`, data),
//   patch: (id, data) => api.patch(`/appointments/appointments/${id}/`, data),
//   delete: (id) => api.delete(`/appointments/appointments/${id}/`),
  
//   // Appointment actions
//   cancel: (id, reason = '') => api.post(`/appointments/appointments/${id}/cancel/`, { reason }),
//   confirm: (id) => api.post(`/appointments/appointments/${id}/confirm/`, {}),
//   checkIn: (id) => api.post(`/appointments/appointments/${id}/check_in/`, {}),
//   start: (id) => api.post(`/appointments/appointments/${id}/start/`, {}),
//   complete: (id, data) => api.post(`/appointments/appointments/${id}/complete/`, data),
//   noShow: (id) => api.post(`/appointments/appointments/${id}/no_show/`, {}),
//   reschedule: (id, data) => api.post(`/appointments/appointments/${id}/reschedule/`, data),
  
//   // Filtered lists
//   getToday: () => api.get('/appointments/appointments/today/'),
//   getTodaySummary: () => api.get('/appointments/appointments/today_summary/'),
//   getUpcoming: () => api.get('/appointments/appointments/upcoming/'),
  
//   // Quick data for dashboard
//   getQuickData: () => api.get('/appointments/quick-data/'),
  
//   // Available slots
//   getAvailableSlots: (doctorId, date) => api.get(`/appointments/available-slots/${doctorId}/`, { 
//     params: { date } 
//   }),
  
//   // Doctor availability for date range
//   getDoctorAvailability: (doctorId, params) => api.get(`/appointments/availability/${doctorId}/`, { params }),
  
//   // Check-in
//   checkInByAppointmentId: (appointmentId) => api.post('/appointments/check-in/', { 
//     appointment_id: appointmentId 
//   }),
  
//   // Generate slots
//   generateSlots: (data) => api.post('/appointments/generate-slots/', data),
  
//   // Health check
//   healthCheck: () => api.get('/appointments/health/'),
// };

// // ============================================
// // SCHEDULES API - /appointments/schedules/
// // ============================================
// export const schedulesAPI = {
//   list: () => api.get('/appointments/schedules/'),
//   create: (data) => api.post('/appointments/schedules/', data),
//   getById: (id) => api.get(`/appointments/schedules/${id}/`),
//   update: (id, data) => api.put(`/appointments/schedules/${id}/`, data),
//   patch: (id, data) => api.patch(`/appointments/schedules/${id}/`, data),
//   delete: (id) => api.delete(`/appointments/schedules/${id}/`),
  
//   // Weekly schedule
//   getWeekly: (doctorId = null) => api.get('/appointments/schedules/weekly/', { 
//     params: doctorId ? { doctor_id: doctorId } : {} 
//   }),
  
//   // Bulk update
//   bulkUpdate: (schedules) => api.post('/appointments/schedules/bulk_update/', { schedules }),
// };

// // ============================================
// // SCHEDULE EXCEPTIONS API - /appointments/exceptions/
// // ============================================
// export const scheduleExceptionsAPI = {
//   list: () => api.get('/appointments/exceptions/'),
//   create: (data) => api.post('/appointments/exceptions/', data),
//   getById: (id) => api.get(`/appointments/exceptions/${id}/`),
//   update: (id, data) => api.put(`/appointments/exceptions/${id}/`, data),
//   delete: (id) => api.delete(`/appointments/exceptions/${id}/`),
  
//   // Add leave
//   addLeave: (date, reason = '') => api.post('/appointments/exceptions/add_leave/', { date, reason }),
  
//   // Get upcoming exceptions
//   getUpcoming: (days = 30) => api.get('/appointments/exceptions/upcoming/', { params: { days } }),
// };

// // ============================================
// // QUEUE API - /appointments/queue/
// // ============================================
// export const queueAPI = {
//   list: () => api.get('/appointments/queue/'),
//   getById: (id) => api.get(`/appointments/queue/${id}/`),
  
//   // Queue actions
//   performAction: (id, action, notes = '') => api.post(`/appointments/queue/${id}/perform-action/`, { 
//     action, notes 
//   }),
//   requeue: (id) => api.post(`/appointments/queue/${id}/requeue/`, {}),
//   callNext: () => api.post('/appointments/queue/call_next/', {}),
  
//   // Queue info
//   getWaiting: () => api.get('/appointments/queue/waiting/'),
//   getMyStatus: () => api.get('/appointments/queue/my_status/'),
//   getStats: () => api.get('/appointments/queue/stats/'),
// };

// // ============================================
// // TIME SLOTS API - /appointments/slots/
// // ============================================
// export const timeSlotsAPI = {
//   list: (params) => api.get('/appointments/slots/', { params }),
//   getById: (id) => api.get(`/appointments/slots/${id}/`),
// };

// // ============================================
// // CONSULTATION API - /consultation/
// // ============================================
// export const consultationAPI = {
//   // Consultations CRUD
//   list: (params) => api.get('/consultation/consultations/', { params }),
//   create: (data) => api.post('/consultation/consultations/', data),
//   getById: (id) => api.get(`/consultation/consultations/${id}/`),
//   update: (id, data) => api.put(`/consultation/consultations/${id}/`, data),
//   patch: (id, data) => api.patch(`/consultation/consultations/${id}/`, data),
//   delete: (id) => api.delete(`/consultation/consultations/${id}/`),
  
//   // Create from appointment
//   createFromAppointment: (appointmentId, consultationType = 'video') => 
//     api.post('/consultation/consultations/from-appointment/', { 
//       appointment_id: appointmentId,
//       consultation_type: consultationType 
//     }),
  
//   // Consultation actions
//   joinWaitingRoom: (id) => api.post(`/consultation/consultations/${id}/join-waiting-room/`, {}),
//   join: (id) => api.post(`/consultation/consultations/${id}/join/`, {}),
//   start: (id) => api.post(`/consultation/consultations/${id}/start/`, {}),
//   end: (id, data = {}) => api.post(`/consultation/consultations/${id}/end/`, data),
//   cancel: (id, reason = '') => api.post(`/consultation/consultations/${id}/cancel/`, { reason }),
//   reschedule: (id, newScheduledStart, reason = '') => 
//     api.post(`/consultation/consultations/${id}/reschedule/`, { 
//       new_scheduled_start: newScheduledStart, 
//       reason 
//     }),
  
//   // Filtered lists
//   getToday: () => api.get('/consultation/consultations/today/'),
//   getUpcoming: () => api.get('/consultation/consultations/upcoming/'),
//   getHistory: () => api.get('/consultation/consultations/history/'),
//   getWaiting: () => api.get('/consultation/consultations/waiting/'),
  
//   // Stats and quick data
//   getStats: () => api.get('/consultation/consultations/stats/'),
//   getQuickData: () => api.get('/consultation/consultations/quick-data/'),
  
//   // Jitsi config
//   getJitsiConfig: () => api.get('/consultation/jitsi/config/'),
  
//   // Doctor feedback summary
//   getDoctorFeedbackSummary: (doctorId) => api.get(`/consultation/doctors/${doctorId}/feedback-summary/`),
  
//   // Health check
//   healthCheck: () => api.get('/consultation/health/'),
// };

// // ============================================
// // CONSULTATION NOTES API
// // ============================================
// export const consultationNotesAPI = {
//   list: (consultationId) => api.get(`/consultation/consultations/${consultationId}/notes/`),
//   create: (consultationId, data) => api.post(`/consultation/consultations/${consultationId}/notes/`, data),
//   getById: (consultationId, noteId) => api.get(`/consultation/consultations/${consultationId}/notes/${noteId}/`),
//   update: (consultationId, noteId, data) => api.put(`/consultation/consultations/${consultationId}/notes/${noteId}/`, data),
//   delete: (consultationId, noteId) => api.delete(`/consultation/consultations/${consultationId}/notes/${noteId}/`),
// };

// // ============================================
// // CONSULTATION PRESCRIPTIONS API
// // ============================================
// export const consultationPrescriptionsAPI = {
//   list: (consultationId) => api.get(`/consultation/consultations/${consultationId}/prescriptions/`),
//   create: (consultationId, data) => api.post(`/consultation/consultations/${consultationId}/prescriptions/`, data),
//   bulkCreate: (consultationId, prescriptions) => 
//     api.post(`/consultation/consultations/${consultationId}/prescriptions/bulk-create/`, { prescriptions }),
//   getById: (consultationId, prescriptionId) => 
//     api.get(`/consultation/consultations/${consultationId}/prescriptions/${prescriptionId}/`),
//   update: (consultationId, prescriptionId, data) => 
//     api.put(`/consultation/consultations/${consultationId}/prescriptions/${prescriptionId}/`, data),
//   delete: (consultationId, prescriptionId) => 
//     api.delete(`/consultation/consultations/${consultationId}/prescriptions/${prescriptionId}/`),
// };

// // ============================================
// // CONSULTATION ATTACHMENTS API
// // ============================================
// export const consultationAttachmentsAPI = {
//   list: (consultationId) => api.get(`/consultation/consultations/${consultationId}/attachments/`),
//   upload: (consultationId, data) => api.post(`/consultation/consultations/${consultationId}/attachments/`, data),
//   getById: (consultationId, attachmentId) => 
//     api.get(`/consultation/consultations/${consultationId}/attachments/${attachmentId}/`),
//   delete: (consultationId, attachmentId) => 
//     api.delete(`/consultation/consultations/${consultationId}/attachments/${attachmentId}/`),
// };

// // ============================================
// // CONSULTATION FEEDBACK API
// // ============================================
// export const consultationFeedbackAPI = {
//   get: (consultationId) => api.get(`/consultation/consultations/${consultationId}/feedback/`),
//   create: (consultationId, data) => api.post(`/consultation/consultations/${consultationId}/feedback/`, data),
// };

// // ============================================
// // HEALTH RECORDS API - /health-records/
// // ============================================
// export const healthRecordsAPI = {
//   // Health Profile
//   profile: {
//     get: () => api.get('/health-records/profile/'),
//     getById: (id) => api.get(`/health-records/profile/${id}/`),
//     create: (data) => api.post('/health-records/profile/', data),
//     update: (id, data) => api.put(`/health-records/profile/${id}/`, data),
//     getSummary: () => api.get('/health-records/profile/summary/'),
//     getCriticalInfo: () => api.get('/health-records/profile/critical-info/'),
//     syncAllergies: () => api.post('/health-records/profile/sync-allergies/', {}),
//     syncConditions: () => api.post('/health-records/profile/sync-conditions/', {}),
//     updateEmergencyContact: (data) => api.post('/health-records/profile/update-emergency-contact/', data),
//   },
  
//   // Medical Conditions
//   conditions: {
//     list: (params) => api.get('/health-records/conditions/', { params }),
//     create: (data) => api.post('/health-records/conditions/', data),
//     getById: (id) => api.get(`/health-records/conditions/${id}/`),
//     update: (id, data) => api.put(`/health-records/conditions/${id}/`, data),
//     delete: (id) => api.delete(`/health-records/conditions/${id}/`),
//     getActive: () => api.get('/health-records/conditions/active/'),
//     getChronic: () => api.get('/health-records/conditions/chronic/'),
//     resolve: (id) => api.post(`/health-records/conditions/${id}/resolve/`, {}),
//   },
  
//   // Medical Documents
//   documents: {
//     list: (params) => api.get('/health-records/documents/', { params }),
//     upload: (formData) => api.post('/health-records/documents/', formData, {
//       headers: { 'Content-Type': 'multipart/form-data' },
//       timeout: 60000, // 60 seconds for file uploads
//     }),
//     getById: (id) => api.get(`/health-records/documents/${id}/`),
//     update: (id, data) => api.put(`/health-records/documents/${id}/`, data),
//     delete: (id) => api.delete(`/health-records/documents/${id}/`),
//     getByType: (docType) => api.get(`/health-records/documents/by-type/${docType}/`),
//     getRecent: () => api.get('/health-records/documents/recent/'),
//     search: (data) => api.post('/health-records/documents/search/', data),
//     getDownloadUrl: (id) => api.get(`/health-records/documents/${id}/download-url/`),
//     toggleSharing: (id) => api.post(`/health-records/documents/${id}/toggle-sharing/`, {}),
//     getStorageStats: () => api.get('/health-records/documents/storage-stats/'),
//     getStorageInfo: () => api.get('/health-records/documents/storage-info/'),
//   },
  
//   // Lab Reports
//   labReports: {
//     list: (params) => api.get('/health-records/lab-reports/', { params }),
//     create: (data) => api.post('/health-records/lab-reports/', data),
//     getById: (id) => api.get(`/health-records/lab-reports/${id}/`),
//     update: (id, data) => api.put(`/health-records/lab-reports/${id}/`, data),
//     delete: (id) => api.delete(`/health-records/lab-reports/${id}/`),
//     getRecent: () => api.get('/health-records/lab-reports/recent/'),
//     getAbnormal: () => api.get('/health-records/lab-reports/abnormal/'),
//     getTrends: (params) => api.get('/health-records/lab-reports/trends/', { params }),
//   },
  
//   // Vaccinations
//   vaccinations: {
//     list: (params) => api.get('/health-records/vaccinations/', { params }),
//     create: (data) => api.post('/health-records/vaccinations/', data),
//     getById: (id) => api.get(`/health-records/vaccinations/${id}/`),
//     update: (id, data) => api.put(`/health-records/vaccinations/${id}/`, data),
//     delete: (id) => api.delete(`/health-records/vaccinations/${id}/`),
//     getPending: () => api.get('/health-records/vaccinations/pending/'),
//     getSchedule: () => api.get('/health-records/vaccinations/schedule/'),
//     verify: (id) => api.post(`/health-records/vaccinations/${id}/verify/`, {}),
//   },
  
//   // Allergies
//   allergies: {
//     list: (params) => api.get('/health-records/allergies/', { params }),
//     create: (data) => api.post('/health-records/allergies/', data),
//     getById: (id) => api.get(`/health-records/allergies/${id}/`),
//     update: (id, data) => api.put(`/health-records/allergies/${id}/`, data),
//     delete: (id) => api.delete(`/health-records/allergies/${id}/`),
//     getActive: () => api.get('/health-records/allergies/active/'),
//     getCritical: () => api.get('/health-records/allergies/critical/'),
//     getDrug: () => api.get('/health-records/allergies/drug/'),
//   },
  
//   // Family Medical History
//   familyHistory: {
//     list: (params) => api.get('/health-records/family-history/', { params }),
//     create: (data) => api.post('/health-records/family-history/', data),
//     getById: (id) => api.get(`/health-records/family-history/${id}/`),
//     update: (id, data) => api.put(`/health-records/family-history/${id}/`, data),
//     delete: (id) => api.delete(`/health-records/family-history/${id}/`),
//     getSummary: () => api.get('/health-records/family-history/summary/'),
//     getRiskConditions: () => api.get('/health-records/family-history/risk-conditions/'),
//   },
  
//   // Hospitalizations
//   hospitalizations: {
//     list: (params) => api.get('/health-records/hospitalizations/', { params }),
//     create: (data) => api.post('/health-records/hospitalizations/', data),
//     getById: (id) => api.get(`/health-records/hospitalizations/${id}/`),
//     update: (id, data) => api.put(`/health-records/hospitalizations/${id}/`, data),
//     delete: (id) => api.delete(`/health-records/hospitalizations/${id}/`),
//     getPendingFollowups: () => api.get('/health-records/hospitalizations/pending-followups/'),
//   },
  
//   // Vital Signs
//   vitals: {
//     list: (params) => api.get('/health-records/vitals/', { params }),
//     create: (data) => api.post('/health-records/vitals/', data),
//     getById: (id) => api.get(`/health-records/vitals/${id}/`),
//     update: (id, data) => api.put(`/health-records/vitals/${id}/`, data),
//     delete: (id) => api.delete(`/health-records/vitals/${id}/`),
//     getLatest: () => api.get('/health-records/vitals/latest/'),
//     getTrends: (params) => api.get('/health-records/vitals/trends/', { params }),
//     getStatistics: (params) => api.get('/health-records/vitals/statistics/', { params }),
//   },
  
//   // Shared Records
//   sharing: {
//     list: () => api.get('/health-records/sharing/'),
//     share: (data) => api.post('/health-records/sharing/', data),
//     getById: (id) => api.get(`/health-records/sharing/${id}/`),
//     update: (id, data) => api.put(`/health-records/sharing/${id}/`, data),
//     revoke: (id) => api.delete(`/health-records/sharing/${id}/`),
//     getMyShares: () => api.get('/health-records/sharing/my-shares/'),
//     getAccessiblePatients: () => api.get('/health-records/sharing/accessible-patients/'),
//     getPatientRecords: (patientId) => api.get(`/health-records/sharing/patient/${patientId}/records/`),
//   },
  
//   // Analytics
//   analytics: {
//     getSummary: () => api.get('/health-records/analytics/summary/'),
//     getScore: () => api.get('/health-records/analytics/score/'),
//     getTimeline: () => api.get('/health-records/analytics/timeline/'),
//     getQuickData: () => api.get('/health-records/analytics/quick-data/'),
//   },
  
//   // Health check
//   healthCheck: () => api.get('/health-records/health/'),
// };

// // ============================================
// // EMERGENCY API - /emergency/
// // ============================================
// export const emergencyAPI = {
//   // SOS Alerts
//   sos: {
//     list: (params) => api.get('/emergency/sos/', { params }),
//     trigger: (data) => api.post('/emergency/sos/trigger/', data),
//     quickTrigger: (data = {}) => api.post('/emergency/sos/quick-trigger/', data),
//     getById: (id) => api.get(`/emergency/sos/${id}/`),
//     update: (id, data) => api.put(`/emergency/sos/${id}/`, data),
//     cancel: (id, reason, notes = '') => api.post(`/emergency/sos/${id}/cancel/`, { reason, notes }),
//     updateStatus: (id, data) => api.post(`/emergency/sos/${id}/update-status/`, data),
//     getActive: () => api.get('/emergency/sos/active/'),
//     getHistory: () => api.get('/emergency/sos/history/'),
//     getStatistics: () => api.get('/emergency/sos/statistics/'),
//     getTypes: () => api.get('/emergency/sos/types/'),
//   },
  
//   // Emergency Contacts
//   contacts: {
//     list: () => api.get('/emergency/contacts/'),
//     create: (data) => api.post('/emergency/contacts/', data),
//     getById: (id) => api.get(`/emergency/contacts/${id}/`),
//     update: (id, data) => api.put(`/emergency/contacts/${id}/`, data),
//     delete: (id) => api.delete(`/emergency/contacts/${id}/`),
//     reorder: (contacts) => api.post('/emergency/contacts/reorder/', { contacts }),
//   },
  
//   // Emergency Services (hospitals, ambulances, etc.)
//   services: {
//     list: (params) => api.get('/emergency/services/', { params }),
//     getById: (id) => api.get(`/emergency/services/${id}/`),
//     getNearby: (data) => api.post('/emergency/services/nearby/', data),
//     getByDistrict: (params) => api.get('/emergency/services/by-district/', { params }),
//   },
  
//   // Emergency Helplines
//   helplines: {
//     list: () => api.get('/emergency/helplines/'),
//     getById: (id) => api.get(`/emergency/helplines/${id}/`),
//     getImportant: () => api.get('/emergency/helplines/important/'),
//     getByType: (helplineType) => api.get(`/emergency/helplines/by-type/${helplineType}/`),
//   },
  
//   // First Aid Guides
//   firstAid: {
//     list: (params) => api.get('/emergency/first-aid/', { params }),
//     getById: (id) => api.get(`/emergency/first-aid/${id}/`),
//     getByCategory: (category) => api.get(`/emergency/first-aid/by-category/${category}/`),
//     getCritical: () => api.get('/emergency/first-aid/critical/'),
//   },
  
//   // Location
//   location: {
//     get: () => api.get('/emergency/location/'),
//     update: (data) => api.post('/emergency/location/update/', data),
//   },
  
//   // Quick SOS data
//   getQuickSOSData: () => api.get('/emergency/quick-sos-data/'),
  
//   // Health check
//   healthCheck: () => api.get('/emergency/health/'),
// };

// // ============================================
// // MEDICINE API - /medicine/
// // ============================================
// export const medicineAPI = {
//   // Medicine Database
//   medicines: {
//     list: (params) => api.get('/medicine/medicines/', { params }),
//     getById: (id) => api.get(`/medicine/medicines/${id}/`),
//     search: (data) => api.post('/medicine/medicines/search/', data),
//     getCategories: () => api.get('/medicine/medicines/categories/'),
//     getTypes: () => api.get('/medicine/medicines/types/'),
//     getPopular: () => api.get('/medicine/medicines/popular/'),
//     getAlternatives: (id) => api.get(`/medicine/medicines/${id}/alternatives/`),
//     getInteractions: (id) => api.get(`/medicine/medicines/${id}/interactions/`),
//     checkInteractions: (medicineIds) => api.post('/medicine/medicines/check-interactions/', { 
//       medicine_ids: medicineIds 
//     }),
//     getSearchHistory: () => api.get('/medicine/medicines/search-history/'),
//     clearSearchHistory: () => api.delete('/medicine/medicines/search-history/clear/'),
//   },
  
//   // User Prescriptions
//   prescriptions: {
//     list: (params) => api.get('/medicine/prescriptions/', { params }),
//     create: (data) => api.post('/medicine/prescriptions/', data),
//     getById: (id) => api.get(`/medicine/prescriptions/${id}/`),
//     update: (id, data) => api.put(`/medicine/prescriptions/${id}/`, data),
//     delete: (id) => api.delete(`/medicine/prescriptions/${id}/`),
//     getActive: () => api.get('/medicine/prescriptions/active/'),
//     getCurrentMedicines: () => api.get('/medicine/prescriptions/current-medicines/'),
//     getStats: () => api.get('/medicine/prescriptions/stats/'),
//     checkInteractions: () => api.post('/medicine/prescriptions/check-interactions/', {}),
//     addMedicine: (prescriptionId, data) => api.post(`/medicine/prescriptions/${prescriptionId}/add-medicine/`, data),
//     complete: (id) => api.post(`/medicine/prescriptions/${id}/complete/`, {}),
//     discontinue: (id, reason = '') => api.post(`/medicine/prescriptions/${id}/discontinue/`, { reason }),
//   },
  
//   // Prescription Medicines
//   prescriptionMedicines: {
//     list: (params) => api.get('/medicine/prescription-medicines/', { params }),
//     create: (data) => api.post('/medicine/prescription-medicines/', data),
//     getById: (id) => api.get(`/medicine/prescription-medicines/${id}/`),
//     update: (id, data) => api.put(`/medicine/prescription-medicines/${id}/`, data),
//     delete: (id) => api.delete(`/medicine/prescription-medicines/${id}/`),
//     createReminder: (id) => api.post(`/medicine/prescription-medicines/${id}/create-reminder/`, {}),
//   },
  
//   // Medicine Reminders
//   reminders: {
//     list: (params) => api.get('/medicine/reminders/', { params }),
//     create: (data) => api.post('/medicine/reminders/', data),
//     getById: (id) => api.get(`/medicine/reminders/${id}/`),
//     update: (id, data) => api.put(`/medicine/reminders/${id}/`, data),
//     delete: (id) => api.delete(`/medicine/reminders/${id}/`),
//     getToday: () => api.get('/medicine/reminders/today/'),
//     getUpcoming: () => api.get('/medicine/reminders/upcoming/'),
//     getAdherence: () => api.get('/medicine/reminders/adherence/'),
//     pause: (id) => api.post(`/medicine/reminders/${id}/pause/`, {}),
//     resume: (id) => api.post(`/medicine/reminders/${id}/resume/`, {}),
//     cancel: (id) => api.post(`/medicine/reminders/${id}/cancel/`, {}),
//   },
  
//   // Reminder Logs
//   reminderLogs: {
//     list: (params) => api.get('/medicine/reminder-logs/', { params }),
//     getById: (id) => api.get(`/medicine/reminder-logs/${id}/`),
//     respond: (id, response, notes = '') => api.post(`/medicine/reminder-logs/${id}/respond/`, { 
//       response, notes 
//     }),
//     markTaken: (id) => api.post(`/medicine/reminder-logs/${id}/taken/`, {}),
//     markSkipped: (id) => api.post(`/medicine/reminder-logs/${id}/skipped/`, {}),
//     snooze: (id) => api.post(`/medicine/reminder-logs/${id}/snooze/`, {}),
//   },
  
//   // Quick data
//   getQuickData: () => api.get('/medicine/quick-data/'),
  
//   // Tasks/Scheduler
//   tasks: {
//     getStatus: () => api.get('/medicine/tasks/status/'),
//     trigger: (data) => api.post('/medicine/tasks/trigger/', data),
//   },
  
//   // Health check
//   healthCheck: () => api.get('/medicine/health/'),
// };

// // ============================================
// // DIAGNOSIS API - /diagnosis/
// // ============================================
// export const diagnosisAPI = {
//   // Diagnose from text
//   diagnose: (data) => api.post('/diagnosis/diagnose/', data),
  
//   // Diagnose from symptoms list
//   diagnoseSymptoms: (data) => api.post('/diagnosis/diagnose-symptoms/', data),
  
//   // Quick diagnosis (without saving)
//   quickDiagnose: (data) => api.post('/diagnosis/quick-diagnose/', data),
  
//   // Symptoms
//   symptoms: {
//     list: () => api.get('/diagnosis/symptoms/'),
//     getByCode: (code) => api.get(`/diagnosis/symptoms/${code}/`),
//     getByCategory: () => api.get('/diagnosis/symptoms/by-category/'),
//     search: (params) => api.get('/diagnosis/symptoms/search/', { params }),
//   },
  
//   // Diseases
//   diseases: {
//     list: () => api.get('/diagnosis/diseases/'),
//     getByCode: (code) => api.get(`/diagnosis/diseases/${code}/`),
//   },
  
//   // Session
//   getSession: (sessionId) => api.get(`/diagnosis/session/${sessionId}/`),
  
//   // History
//   getHistory: () => api.get('/diagnosis/history/'),
  
//   // Feedback
//   submitFeedback: (data) => api.post('/diagnosis/feedback/', data),
  
//   // Model status
//   getModelStatus: () => api.get('/diagnosis/model-status/'),
//   reloadModels: () => api.post('/diagnosis/reload-models/', {}),
  
//   // Health check
//   healthCheck: () => api.get('/diagnosis/health/'),
// };

// // ============================================
// // CHATBOT API - /chatbot/
// // ============================================
// export const chatbotAPI = {
//   // Messages
//   sendMessage: (data) => api.post('/chatbot/message/', data),
//   sendVoiceMessage: (formData) => api.post('/chatbot/message/voice/', formData, {
//     headers: { 'Content-Type': 'multipart/form-data' },
//   }),
  
//   // Sessions
//   startSession: (data = {}) => api.post('/chatbot/session/start/', data),
//   getSession: (sessionId) => api.get(`/chatbot/session/${sessionId}/`),
//   endSession: (sessionId) => api.post(`/chatbot/session/${sessionId}/end/`, {}),
//   deleteSession: (sessionId) => api.delete(`/chatbot/session/${sessionId}/delete/`),
//   getSessionMessages: (sessionId) => api.get(`/chatbot/session/${sessionId}/messages/`),
//   listSessions: () => api.get('/chatbot/sessions/'),
  
//   // FAQ
//   getFAQ: (params) => api.get('/chatbot/faq/', { params }),
//   getFAQCategories: () => api.get('/chatbot/faq/categories/'),
//   markFAQHelpful: (faqId) => api.post(`/chatbot/faq/${faqId}/helpful/`, {}),
  
//   // Health Tips
//   getHealthTips: (params) => api.get('/chatbot/health-tips/', { params }),
//   getDailyHealthTip: () => api.get('/chatbot/health-tips/daily/'),
//   likeHealthTip: (tipId) => api.post(`/chatbot/health-tips/${tipId}/like/`, {}),
  
//   // Feedback
//   submitMessageFeedback: (data) => api.post('/chatbot/feedback/message/', data),
//   submitConversationFeedback: (data) => api.post('/chatbot/feedback/conversation/', data),
  
//   // Suggestions
//   getSuggestions: (params) => api.get('/chatbot/suggestions/', { params }),
  
//   // Language & Translation
//   detectLanguage: (data) => api.post('/chatbot/detect-language/', data),
//   translate: (data) => api.post('/chatbot/translate/', data),
//   textToSpeech: (data) => api.post('/chatbot/text-to-speech/', data),
  
//   // Stats
//   getStats: () => api.get('/chatbot/stats/'),
  
//   // Health check
//   healthCheck: () => api.get('/chatbot/health/'),
// };

// // ============================================
// // NOTIFICATIONS API - /notifications/
// // ============================================
// export const notificationsAPI = {
//   // Notifications
//   list: (params) => api.get('/notifications/', { params }),
//   getById: (notificationId) => api.get(`/notifications/${notificationId}/`),
//   delete: (notificationId) => api.delete(`/notifications/${notificationId}/delete/`),
//   markRead: (notificationId) => api.post(`/notifications/${notificationId}/read/`, {}),
//   markAllRead: (notificationIds = null) => api.post('/notifications/mark-read/', { 
//     notification_ids: notificationIds 
//   }),
//   clear: (readOnly = false) => api.delete('/notifications/clear/', { params: { read_only: readOnly } }),
//   getUnreadCount: () => api.get('/notifications/unread-count/'),
//   getStats: () => api.get('/notifications/stats/'),
  
//   // Device registration
//   registerDevice: (data) => api.post('/notifications/device/register/', data),
//   unregisterDevice: (data) => api.post('/notifications/device/unregister/', data),
//   listDevices: () => api.get('/notifications/devices/'),
  
//   // Preferences
//   getPreferences: () => api.get('/notifications/preferences/'),
//   updatePreferences: (data) => api.put('/notifications/preferences/update/', data),
//   updateTypePreference: (data) => api.post('/notifications/preferences/type/', data),
//   updateQuietHours: (data) => api.post('/notifications/preferences/quiet-hours/', data),
  
//   // Scheduled notifications
//   listScheduled: () => api.get('/notifications/scheduled/'),
//   createScheduled: (data) => api.post('/notifications/scheduled/create/', data),
//   toggleScheduled: (scheduledId) => api.post(`/notifications/scheduled/${scheduledId}/toggle/`, {}),
//   deleteScheduled: (scheduledId) => api.delete(`/notifications/scheduled/${scheduledId}/delete/`),
  
//   // Templates
//   listTemplates: () => api.get('/notifications/templates/'),
  
//   // Admin
//   sendNotification: (data) => api.post('/notifications/admin/send/', data),
//   sendTemplateNotification: (data) => api.post('/notifications/admin/send-template/', data),
  
//   // Test
//   sendTest: (data = {}) => api.post('/notifications/test/', data),
  
//   // Health check
//   healthCheck: () => api.get('/notifications/health/'),
// };

// // ============================================
// // UTILITY FUNCTIONS
// // ============================================

// /**
//  * Upload file to backend
//  * @param {File} file - File to upload
//  * @param {string} endpoint - Upload endpoint
//  * @param {object} additionalData - Additional form data
//  * @param {function} onProgress - Progress callback
//  */
// export const uploadFile = async (file, endpoint, additionalData = {}, onProgress = null) => {
//   const formData = new FormData();
//   formData.append('file', file);
  
//   Object.entries(additionalData).forEach(([key, value]) => {
//     formData.append(key, value);
//   });
  
//   return api.post(endpoint, formData, {
//     headers: { 'Content-Type': 'multipart/form-data' },
//     timeout: 120000, // 2 minutes for file uploads
//     onUploadProgress: onProgress ? (progressEvent) => {
//       const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
//       onProgress(percentCompleted);
//     } : undefined,
//   });
// };

// /**
//  * Download file from URL
//  * @param {string} url - File URL
//  * @param {string} filename - Filename for download
//  */
// export const downloadFile = async (url, filename) => {
//   const response = await api.get(url, { responseType: 'blob' });
//   const blob = new Blob([response.data]);
//   const link = document.createElement('a');
//   link.href = window.URL.createObjectURL(blob);
//   link.download = filename;
//   link.click();
//   window.URL.revokeObjectURL(link.href);
// };

// /**
//  * Build query string from params object
//  * @param {object} params - Query parameters
//  */
// export const buildQueryString = (params) => {
//   const searchParams = new URLSearchParams();
//   Object.entries(params).forEach(([key, value]) => {
//     if (value !== null && value !== undefined && value !== '') {
//       if (Array.isArray(value)) {
//         value.forEach(v => searchParams.append(key, v));
//       } else {
//         searchParams.append(key, value);
//       }
//     }
//   });
//   return searchParams.toString();
// };

// // Export default instance for custom requests
// export default api;


// // ============================================
// // USAGE EXAMPLES
// // ============================================
// /*
// import api, { 
//   authAPI, 
//   appointmentsAPI, 
//   consultationAPI, 
//   healthRecordsAPI,
//   emergencyAPI,
//   medicineAPI,
//   diagnosisAPI,
//   chatbotAPI,
//   notificationsAPI 
// } from './services/api';

// // Authentication
// const login = async (firebaseToken) => {
//   try {
//     const response = await authAPI.login(firebaseToken);
//     console.log('Login successful:', response.data);
//   } catch (error) {
//     console.error('Login failed:', error.message);
//   }
// };

// // Get appointments
// const getAppointments = async () => {
//   try {
//     const response = await appointmentsAPI.list({ status: 'pending' });
//     console.log('Appointments:', response.data);
//   } catch (error) {
//     console.error('Failed to get appointments:', error.message);
//   }
// };

// // Book appointment
// const bookAppointment = async (doctorId, date, time, reason) => {
//   try {
//     const response = await appointmentsAPI.create({
//       doctor_id: doctorId,
//       appointment_date: date,
//       start_time: time,
//       reason: reason,
//       booking_type: 'online'
//     });
//     console.log('Appointment booked:', response.data);
//   } catch (error) {
//     console.error('Booking failed:', error.message);
//   }
// };

// // Trigger SOS
// const triggerSOS = async (latitude, longitude) => {
//   try {
//     const response = await emergencyAPI.sos.quickTrigger({
//       latitude,
//       longitude,
//       emergency_type: 'medical'
//     });
//     console.log('SOS triggered:', response.data);
//   } catch (error) {
//     console.error('SOS failed:', error.message);
//   }
// };

// // Upload medical document
// const uploadDocument = async (file, documentType, title) => {
//   try {
//     const formData = new FormData();
//     formData.append('file', file);
//     formData.append('document_type', documentType);
//     formData.append('title', title);
    
//     const response = await healthRecordsAPI.documents.upload(formData);
//     console.log('Document uploaded:', response.data);
//   } catch (error) {
//     console.error('Upload failed:', error.message);
//   }
// };

// // Start chatbot session
// const startChat = async () => {
//   try {
//     const sessionResponse = await chatbotAPI.startSession({ language: 'en' });
//     const sessionId = sessionResponse.data.session_id;
    
//     const messageResponse = await chatbotAPI.sendMessage({
//       session_id: sessionId,
//       message: 'I have a headache'
//     });
//     console.log('Bot response:', messageResponse.data);
//   } catch (error) {
//     console.error('Chat failed:', error.message);
//   }
// };

// // Get diagnosis from symptoms
// const getDiagnosis = async (symptoms) => {
//   try {
//     const response = await diagnosisAPI.diagnoseSymptoms({
//       symptoms: symptoms, // ['fever', 'headache', 'body_pain']
//       language: 'en',
//       patient_age: 30,
//       patient_gender: 'male'
//     });
//     console.log('Diagnosis:', response.data);
//   } catch (error) {
//     console.error('Diagnosis failed:', error.message);
//   }
// };
// */


import axios from 'axios';
import { getToken, getRefreshToken, saveToken,setRefreshToken, clearStorage } from '../hooks/storage';
import { updateLastActive } from '../hooks/storage';

// ============================================
// CONFIGURATION
// ============================================
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const DEFAULT_TIMEOUT = 30000;
const UPLOAD_TIMEOUT = 120000;
const LANGUAGE_STORAGE_KEY = 'mediconnect_language';

// ============================================
// AXIOS INSTANCE
// ============================================
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: DEFAULT_TIMEOUT,
});

// ============================================
// TOKEN REFRESH QUEUE (prevents race conditions)
// ============================================
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const handleLogout = () => {
  clearStorage();
  // Avoid redirect loops
  const currentPath = window.location.pathname;
  const publicPaths = ['/', '/login', '/register', '/register/doctor', '/register/patient'];
  if (!publicPaths.includes(currentPath)) {
    window.location.href = '/login';
  }
};

// ============================================
// REQUEST INTERCEPTOR
// ============================================
api.interceptors.request.use(
  (config) => {
    // Update last active timestamp on each request
    updateLastActive();
    // Add auth token
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add language header
    const language = localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en';
    config.headers['Accept-Language'] = language;

    // IMPORTANT: Don't override Content-Type for FormData (file uploads)
    // Axios needs to set the boundary automatically for multipart/form-data
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const response = error.response;

    // --- Network error with single retry ---
    if (!response && originalRequest && !originalRequest.__isRetry) {
      originalRequest.__isRetry = true;
      console.warn('Network error detected, retrying request once...', originalRequest.url);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return api(originalRequest);
    }

    // --- Handle HTTP errors ---
    if (response) {
      const status = response.status;

      // --- 401: Attempt token refresh before logging out ---
      if (status === 401 && !originalRequest.__isRetryAfterRefresh) {
        // If we're already trying to refresh, queue this request
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((newToken) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return api(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest.__isRetryAfterRefresh = true;
        isRefreshing = true;

        try {
          // Attempt to refresh the token
          // NOTE: If your backend doesn't support refresh tokens,
          // remove this block and just call handleLogout()
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            const refreshResponse = await axios.post(
              `${BASE_URL}/auth/token/refresh/`,
              { refresh: refreshToken },
              { headers: { 'Content-Type': 'application/json' } }
            );

            // const newAccessToken = refreshResponse.data?.access || refreshResponse.data?.token;
            // if (newAccessToken) {
            //   saveToken(newAccessToken);
            //   originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            //   processQueue(null, newAccessToken);
            //   return api(originalRequest);
            // }
            const newAccessToken = refreshResponse.data?.access;
            const newRefreshToken = refreshResponse.data?.refresh;

            if (newAccessToken) {
              saveToken(newAccessToken);
              if (newRefreshToken) {
                setRefreshToken(newRefreshToken);  // NOW THIS WILL WORK
              }
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              processQueue(null, newAccessToken);
              return api(originalRequest);
            }
          }

          // No refresh token or refresh failed
          processQueue(new Error('Token refresh failed'));
          handleLogout();
        } catch (refreshError) {
          processQueue(refreshError);
          handleLogout();
          return Promise.reject(buildErrorObject(response));
        } finally {
          isRefreshing = false;
        }
      }

      // --- Build standardized error object ---
      const errorData = buildErrorObject(response);

      switch (status) {
        case 403:
          console.error('Access forbidden:', errorData.message);
          break;
        case 404:
          console.error('Resource not found:', response.config?.url);
          break;
        case 422:
          console.error('Validation error:', response.data);
          break;
        case 429:
          console.error('Rate limited. Please try again later.');
          errorData.message = 'Too many requests. Please try again later.';
          break;
        case 500:
          console.error('Server error:', errorData.message);
          errorData.message = 'Server error. Please try again later.';
          break;
        case 502:
        case 503:
        case 504:
          console.error('Service unavailable:', errorData.message);
          errorData.message = 'Service temporarily unavailable. Please try again.';
          break;
        default:
          console.error('API Error:', errorData.message);
      }

      return Promise.reject(errorData);
    }

    // --- No response (network error after retry) ---
    return Promise.reject({
      status: 0,
      message: error?.message || 'Network error. Please check your connection.',
      code: error?.code || 'NETWORK_ERROR',
      isNetworkError: true,
    });
  }
);

// ============================================
// HELPER: Build standardized error object
// ============================================
function buildErrorObject(response) {
  return {
    status: response.status,
    message:
      response.data?.detail ||
      response.data?.message ||
      response.data?.error ||
      getDefaultErrorMessage(response.status),
    data: response.data,
    errors: response.data?.errors || null,
  };
}

function getDefaultErrorMessage(status) {
  const messages = {
    400: 'Bad request. Please check your input.',
    401: 'Session expired. Please login again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'Conflict. The resource already exists.',
    422: 'Validation error. Please check your input.',
    429: 'Too many requests. Please try again later.',
    500: 'Internal server error. Please try again later.',
    502: 'Service temporarily unavailable.',
    503: 'Service temporarily unavailable.',
    504: 'Request timeout. Please try again.',
  };
  return messages[status] || 'An unexpected error occurred.';
}

// ============================================
// AUTH API - /auth/
// ============================================
export const authAPI = {
  // Patient Registration
  registerPatient: (data) => api.post('/auth/register/patient/', data),

  // Doctor Registration
  registerDoctor: (data) => api.post('/auth/register/doctor/', data),

  // Login with Firebase token
  login: (firebaseToken, fcmToken = null) =>
    api.post('/auth/login/', {
      firebase_token: firebaseToken,
      fcm_token: fcmToken,
    }),

  // Logout
  logout: (refreshToken) => api.post('/auth/logout/', { refresh: refreshToken }),

  // Token refresh
  refreshToken: (refreshToken) =>
    api.post('/auth/token/refresh/', { refresh: refreshToken }),

  // Get/Update Profile
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.put('/auth/profile/', data),
  patchProfile: (data) => api.patch('/auth/profile/', data),

  // Upload profile photo
  uploadProfilePhoto: (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.patch('/auth/profile/', formData);
  },

  // Health check
  healthCheck: () => api.get('/auth/health/'),

  // Test Firebase (development only)
  testFirebase: () => api.get('/auth/test/firebase/'),
  verifyFirebaseToken: (token) => api.post('/auth/test/firebase/', { token }),
};

// // ============================================
// // DOCTORS API - /auth/doctors/
// // ============================================
// export const doctorsAPI = {
//   // List all verified doctors with filters
//   list: (params) => api.get('/auth/doctors/', { params }),

//   // Get doctor by ID
//   getById: (id) => api.get(`/auth/doctors/${id}/`),

//   // Get specializations list
//   getSpecializations: () => api.get('/auth/doctors/specializations/'),

//   // Doctor availability management (for doctors only)
//   getAvailability: () => api.get('/auth/doctor/availability/'),
//   addAvailability: (data) => api.post('/auth/doctor/availability/', data),
//   updateAvailability: (id, data) => api.put(`/auth/doctor/availability/${id}/`, data),
//   deleteAvailability: (id) => api.delete(`/auth/doctor/availability/${id}/`),

//   // Get doctor reviews/ratings (suggested feature)
//   getReviews: (doctorId, params) => api.get(`/auth/doctors/${doctorId}/reviews/`, { params }),
// };

// // ============================================
// // ADMIN API - /auth/admin/ admin is not used in frontend folder these are handled in backend Django Admin port, so no issues
// // ============================================
// export const adminAPI = {
//   // Doctor management
//   listDoctors: (params) => api.get('/auth/admin/doctors/', { params }),
//   verifyDoctor: (id, data) => api.post(`/auth/admin/doctors/${id}/verify/`, data),

//   // Patient management
//   listPatients: (params) => api.get('/auth/admin/patients/', { params }),

//   // Statistics
//   getStats: () => api.get('/auth/admin/stats/'),
// };

// ============================================
// PATIENT API - Convenience wrapper for patient-specific endpoints
// ============================================
export const patientAPI = {
  // Dashboard
  getDashboard: () => Promise.all([
    appointmentsAPI.getUpcoming(),
    appointmentsAPI.getQuickData(),
    healthRecordsAPI.analytics.getQuickData(),
    medicineAPI.getQuickData(),
  ]).then(([appointments, appointmentQuickData, healthQuickData, medicineQuickData]) => ({
    data: {
      upcoming_appointments: appointments.data,
      appointment_stats: appointmentQuickData.data,
      health_stats: healthQuickData.data,
      medicine_stats: medicineQuickData.data,
    }
  })),

  // Appointments
  getAppointments: (params) => appointmentsAPI.list(params),
  getUpcomingAppointments: () => appointmentsAPI.getUpcoming(),
  getTodayAppointments: () => appointmentsAPI.getToday(),
  bookAppointment: (data) => appointmentsAPI.create(data),
  cancelAppointment: (id, reason) => appointmentsAPI.cancel(id, reason),
  rescheduleAppointment: (id, data) => appointmentsAPI.reschedule(id, data),
  getAppointmentById: (id) => appointmentsAPI.getById(id),

  // Doctors
  searchDoctors: (params) => doctorsAPI.list(params),
  getDoctorById: (id) => doctorsAPI.getById(id),
  getSpecializations: () => doctorsAPI.getSpecializations(),
  getAvailableSlots: (doctorId, date) => appointmentsAPI.getAvailableSlots(doctorId, date),

  // Health Records
  getHealthProfile: () => healthRecordsAPI.profile.get(),
  updateHealthProfile: (id, data) => healthRecordsAPI.profile.update(id, data),
  getHealthSummary: () => healthRecordsAPI.profile.getSummary(),
  
  // Vitals
  getVitals: (params) => healthRecordsAPI.vitals.list(params),
  getLatestVitals: () => healthRecordsAPI.vitals.getLatest(),
  addVitals: (data) => healthRecordsAPI.vitals.create(data),
  
  // Conditions
  getConditions: (params) => healthRecordsAPI.conditions.list(params),
  getActiveConditions: () => healthRecordsAPI.conditions.getActive(),
  addCondition: (data) => healthRecordsAPI.conditions.create(data),
  
  // Allergies
  getAllergies: (params) => healthRecordsAPI.allergies.list(params),
  getActiveAllergies: () => healthRecordsAPI.allergies.getActive(),
  addAllergy: (data) => healthRecordsAPI.allergies.create(data),
  
  // Documents
  getDocuments: (params) => healthRecordsAPI.documents.list(params),
  uploadDocument: (formData) => healthRecordsAPI.documents.upload(formData),
  getRecentDocuments: () => healthRecordsAPI.documents.getRecent(),
  
  // Lab Reports
  getLabReports: (params) => healthRecordsAPI.labReports.list(params),
  getRecentLabReports: () => healthRecordsAPI.labReports.getRecent(),
  
  // Medications/Prescriptions
  getPrescriptions: (params) => medicineAPI.prescriptions.list(params),
  getActivePrescriptions: () => medicineAPI.prescriptions.getActive(),
  getCurrentMedicines: () => medicineAPI.prescriptions.getCurrentMedicines(),
  
  // Reminders
  getMedicineReminders: (params) => medicineAPI.reminders.list(params),
  getTodayReminders: () => medicineAPI.reminders.getToday(),
  markReminderTaken: (id) => medicineAPI.reminderLogs.markTaken(id),
  markReminderSkipped: (id) => medicineAPI.reminderLogs.markSkipped(id),
  
  // Consultations
  getConsultations: (params) => consultationAPI.list(params),
  getUpcomingConsultations: () => consultationAPI.getUpcoming(),
  getConsultationHistory: () => consultationAPI.getHistory(),
  joinConsultation: (id) => consultationAPI.join(id),
  
  // Emergency
  getEmergencyContacts: () => emergencyAPI.contacts.list(),
  addEmergencyContact: (data) => emergencyAPI.contacts.create(data),
  triggerSOS: (data) => emergencyAPI.sos.trigger(data),
  quickSOS: (data) => emergencyAPI.sos.quickTrigger(data),
  
  // AI Features
  sendChatMessage: (data) => chatbotAPI.sendMessage(data),
  getDiagnosis: (data) => diagnosisAPI.diagnose(data),
  getSymptoms: () => diagnosisAPI.symptoms.list(),
  
  // Profile
  getProfile: () => authAPI.getProfile(),
  updateProfile: (data) => authAPI.updateProfile(data),
  uploadProfilePhoto: (file) => authAPI.uploadProfilePhoto(file),
  
  // Notifications
  getNotifications: (params) => notificationsAPI.list(params),
  getUnreadCount: () => notificationsAPI.getUnreadCount(),
  markNotificationRead: (id) => notificationsAPI.markRead(id),
  markAllNotificationsRead: () => notificationsAPI.markAllRead(),
  
  // Family Helpers
  getFamilyHelpers: () => familyHelperAPI.list(),
  addFamilyHelper: (data) => familyHelperAPI.add(data),
  removeFamilyHelper: (id) => familyHelperAPI.delete(id),
};

// ============================================
// DOCTOR API - Convenience wrapper for doctor-specific endpoints
// ============================================
export const doctorAPI = {
  // Dashboard
  getDashboard: () => Promise.all([
    appointmentsAPI.getToday(),
    appointmentsAPI.getTodaySummary(),
    consultationAPI.getStats(),
    queueAPI.getStats(),
  ]).then(([todayAppointments, todaySummary, consultationStats, queueStats]) => ({
    data: {
      today_appointments: todayAppointments.data,
      today_summary: todaySummary.data,
      consultation_stats: consultationStats.data,
      queue_stats: queueStats.data,
    }
  })),

  // Appointments
  getAppointments: (params) => appointmentsAPI.list(params),
  getTodayAppointments: () => appointmentsAPI.getToday(),
  getTodaySummary: () => appointmentsAPI.getTodaySummary(),
  getUpcomingAppointments: () => appointmentsAPI.getUpcoming(),
  confirmAppointment: (id) => appointmentsAPI.confirm(id),
  startAppointment: (id) => appointmentsAPI.start(id),
  completeAppointment: (id, data) => appointmentsAPI.complete(id, data),
  cancelAppointment: (id, reason) => appointmentsAPI.cancel(id, reason),
  markNoShow: (id) => appointmentsAPI.noShow(id),
  
  // Queue Management
  getQueue: () => queueAPI.list(),
  getWaitingQueue: () => queueAPI.getWaiting(),
  callNextPatient: () => queueAPI.callNext(),
  getQueueStats: () => queueAPI.getStats(),
  performQueueAction: (id, action, notes) => queueAPI.performAction(id, action, notes),
  
  // Schedule Management
  getSchedules: () => schedulesAPI.list(),
  getWeeklySchedule: () => schedulesAPI.getWeekly(),
  createSchedule: (data) => schedulesAPI.create(data),
  updateSchedule: (id, data) => schedulesAPI.update(id, data),
  deleteSchedule: (id) => schedulesAPI.delete(id),
  bulkUpdateSchedules: (schedules) => schedulesAPI.bulkUpdate(schedules),
  
  // Schedule Exceptions (Leave, etc.)
  getExceptions: () => scheduleExceptionsAPI.list(),
  addException: (data) => scheduleExceptionsAPI.create(data),
  addLeave: (date, reason) => scheduleExceptionsAPI.addLeave(date, reason),
  deleteException: (id) => scheduleExceptionsAPI.delete(id),
  
  // Availability
  getAvailability: () => doctorsAPI.getAvailability(),
  addAvailability: (data) => doctorsAPI.addAvailability(data),
  updateAvailability: (id, data) => doctorsAPI.updateAvailability(id, data),
  deleteAvailability: (id) => doctorsAPI.deleteAvailability(id),
  
  // Consultations
  getConsultations: (params) => consultationAPI.list(params),
  getTodayConsultations: () => consultationAPI.getToday(),
  getUpcomingConsultations: () => consultationAPI.getUpcoming(),
  getWaitingConsultations: () => consultationAPI.getWaiting(),
  startConsultation: (id) => consultationAPI.start(id),
  endConsultation: (id, data) => consultationAPI.end(id, data),
  getConsultationStats: () => consultationAPI.getStats(),
  
  // Consultation Notes & Prescriptions
  addConsultationNote: (consultationId, data) => consultationNotesAPI.create(consultationId, data),
  addPrescription: (consultationId, data) => consultationPrescriptionsAPI.create(consultationId, data),
  bulkAddPrescriptions: (consultationId, prescriptions) => 
    consultationPrescriptionsAPI.bulkCreate(consultationId, prescriptions),
  
  // Patient Records (via sharing)
  getAccessiblePatients: () => healthRecordsAPI.sharing.getAccessiblePatients(),
  getPatientRecords: (patientId) => healthRecordsAPI.sharing.getPatientRecords(patientId),
  
  // Profile
  getProfile: () => authAPI.getProfile(),
  updateProfile: (data) => authAPI.updateProfile(data),
  uploadProfilePhoto: (file) => authAPI.uploadProfilePhoto(file),
  
  // Notifications
  getNotifications: (params) => notificationsAPI.list(params),
  getUnreadCount: () => notificationsAPI.getUnreadCount(),
  markNotificationRead: (id) => notificationsAPI.markRead(id),
  
  // Reviews
  getMyReviews: (params) => doctorsAPI.getReviews('me', params),
  getFeedbackSummary: () => consultationAPI.getDoctorFeedbackSummary('me'),
};

// ============================================
// FAMILY HELPER API - /auth/helpers/
// ============================================
export const familyHelperAPI = {
  list: () => api.get('/auth/helpers/'),
  add: (data) => api.post('/auth/helpers/', data),
  update: (id, data) => api.put(`/auth/helpers/${id}/`, data),
  delete: (id) => api.delete(`/auth/helpers/${id}/`),
};

// ============================================
// SETTINGS API - /auth/settings/
// ============================================
export const settingsAPI = {
  updateFCMToken: (fcmToken) =>
    api.post('/auth/settings/fcm-token/', { fcm_token: fcmToken }),
  changeLanguage: (language) => {
    // Update local storage immediately for instant UI feedback
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    return api.post('/auth/settings/language/', { language });
  },
  getLanguage: () => localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en',
};

// ============================================
// APPOINTMENTS API - /appointments/
// ============================================
export const appointmentsAPI = {
  // Appointments CRUD
  list: (params) => api.get('/appointments/appointments/', { params }),
  create: (data) => api.post('/appointments/appointments/', data),
  getById: (id) => api.get(`/appointments/appointments/${id}/`),
  update: (id, data) => api.put(`/appointments/appointments/${id}/`, data),
  patch: (id, data) => api.patch(`/appointments/appointments/${id}/`, data),
  delete: (id) => api.delete(`/appointments/appointments/${id}/`),

  // Appointment actions
  cancel: (id, reason = '') =>
    api.post(`/appointments/appointments/${id}/cancel/`, { reason }),
  confirm: (id) => api.post(`/appointments/appointments/${id}/confirm/`, {}),
  checkIn: (id) => api.post(`/appointments/appointments/${id}/check_in/`, {}),
  start: (id) => api.post(`/appointments/appointments/${id}/start/`, {}),
  complete: (id, data) =>
    api.post(`/appointments/appointments/${id}/complete/`, data),
  noShow: (id) => api.post(`/appointments/appointments/${id}/no_show/`, {}),
  reschedule: (id, data) =>
    api.post(`/appointments/appointments/${id}/reschedule/`, data),

  // Filtered lists
  getToday: () => api.get('/appointments/appointments/today/'),
  getTodaySummary: () => api.get('/appointments/appointments/today_summary/'),
  getUpcoming: () => api.get('/appointments/appointments/upcoming/'),

  // Quick data for dashboard
  getQuickData: () => api.get('/appointments/quick-data/'),

  // Available slots
  getAvailableSlots: (doctorId, date) =>
    api.get(`/appointments/available-slots/${doctorId}/`, {
      params: { date },
    }),

  // Doctor availability for date range
  getDoctorAvailability: (doctorId, params) =>
    api.get(`/appointments/availability/${doctorId}/`, { params }),

  // Check-in
  checkInByAppointmentId: (appointmentId) =>
    api.post('/appointments/check-in/', {
      appointment_id: appointmentId,
    }),

  // Generate slots
  generateSlots: (data) => api.post('/appointments/generate-slots/', data),

  // Health check
  healthCheck: () => api.get('/appointments/health/'),
};

// ============================================
// SCHEDULES API - /appointments/schedules/
// ============================================
export const schedulesAPI = {
  list: () => api.get('/appointments/schedules/'),
  create: (data) => api.post('/appointments/schedules/', data),
  getById: (id) => api.get(`/appointments/schedules/${id}/`),
  update: (id, data) => api.put(`/appointments/schedules/${id}/`, data),
  patch: (id, data) => api.patch(`/appointments/schedules/${id}/`, data),
  delete: (id) => api.delete(`/appointments/schedules/${id}/`),

  // Weekly schedule
  getWeekly: (doctorId = null) =>
    api.get('/appointments/schedules/weekly/', {
      params: doctorId ? { doctor_id: doctorId } : {},
    }),

  // Bulk update
  bulkUpdate: (schedules) =>
    api.post('/appointments/schedules/bulk_update/', { schedules }),
};

// ============================================
// SCHEDULE EXCEPTIONS API - /appointments/exceptions/
// ============================================
export const scheduleExceptionsAPI = {
  list: () => api.get('/appointments/exceptions/'),
  create: (data) => api.post('/appointments/exceptions/', data),
  getById: (id) => api.get(`/appointments/exceptions/${id}/`),
  update: (id, data) => api.put(`/appointments/exceptions/${id}/`, data),
  delete: (id) => api.delete(`/appointments/exceptions/${id}/`),

  // Add leave
  addLeave: (date, reason = '') =>
    api.post('/appointments/exceptions/add_leave/', { date, reason }),

  // Get upcoming exceptions
  getUpcoming: (days = 30) =>
    api.get('/appointments/exceptions/upcoming/', { params: { days } }),
};

// ============================================
// QUEUE API - /appointments/queue/
// ============================================
export const queueAPI = {
  list: () => api.get('/appointments/queue/'),
  getById: (id) => api.get(`/appointments/queue/${id}/`),

  // Queue actions
  performAction: (id, action, notes = '') =>
    api.post(`/appointments/queue/${id}/perform-action/`, {
      action,
      notes,
    }),
  requeue: (id) => api.post(`/appointments/queue/${id}/requeue/`, {}),
  callNext: () => api.post('/appointments/queue/call_next/', {}),

  // Queue info
  getWaiting: () => api.get('/appointments/queue/waiting/'),
  getMyStatus: () => api.get('/appointments/queue/my_status/'),
  getStats: () => api.get('/appointments/queue/stats/'),
};

// ============================================
// TIME SLOTS API - /appointments/slots/
// ============================================
export const timeSlotsAPI = {
  list: (params) => api.get('/appointments/slots/', { params }),
  getById: (id) => api.get(`/appointments/slots/${id}/`),
};

// ============================================
// CONSULTATION API - /consultation/
// ============================================
export const consultationAPI = {
  // Consultations CRUD
  list: (params) => api.get('/consultation/consultations/', { params }),
  create: (data) => api.post('/consultation/consultations/', data),
  getById: (id) => api.get(`/consultation/consultations/${id}/`),
  update: (id, data) => api.put(`/consultation/consultations/${id}/`, data),
  patch: (id, data) => api.patch(`/consultation/consultations/${id}/`, data),
  delete: (id) => api.delete(`/consultation/consultations/${id}/`),

  // Create from appointment
  createFromAppointment: (appointmentId, consultationType = 'video') =>
    api.post('/consultation/consultations/from-appointment/', {
      appointment_id: appointmentId,
      consultation_type: consultationType,
    }),

  // Consultation actions
  joinWaitingRoom: (id) =>
    api.post(`/consultation/consultations/${id}/join-waiting-room/`, {}),
  join: (id) => api.post(`/consultation/consultations/${id}/join/`, {}),
  start: (id) => api.post(`/consultation/consultations/${id}/start/`, {}),
  end: (id, data = {}) =>
    api.post(`/consultation/consultations/${id}/end/`, data),
  cancel: (id, reason = '') =>
    api.post(`/consultation/consultations/${id}/cancel/`, { reason }),
  reschedule: (id, newScheduledStart, reason = '') =>
    api.post(`/consultation/consultations/${id}/reschedule/`, {
      new_scheduled_start: newScheduledStart,
      reason,
    }),

  // Filtered lists
  getToday: () => api.get('/consultation/consultations/today/'),
  getUpcoming: () => api.get('/consultation/consultations/upcoming/'),
  getHistory: () => api.get('/consultation/consultations/history/'),
  getWaiting: () => api.get('/consultation/consultations/waiting/'),

  // Stats and quick data
  getStats: () => api.get('/consultation/consultations/stats/'),
  getQuickData: () => api.get('/consultation/consultations/quick-data/'),

  // Jitsi config
  getJitsiConfig: () => api.get('/consultation/jitsi/config/'),

  // Doctor feedback summary
  getDoctorFeedbackSummary: (doctorId) =>
    api.get(`/consultation/doctors/${doctorId}/feedback-summary/`),

  // Health check
  healthCheck: () => api.get('/consultation/health/'),
};

// ============================================
// CONSULTATION NOTES API
// ============================================
export const consultationNotesAPI = {
  list: (consultationId) =>
    api.get(`/consultation/consultations/${consultationId}/notes/`),
  create: (consultationId, data) =>
    api.post(`/consultation/consultations/${consultationId}/notes/`, data),
  getById: (consultationId, noteId) =>
    api.get(`/consultation/consultations/${consultationId}/notes/${noteId}/`),
  update: (consultationId, noteId, data) =>
    api.put(`/consultation/consultations/${consultationId}/notes/${noteId}/`, data),
  delete: (consultationId, noteId) =>
    api.delete(`/consultation/consultations/${consultationId}/notes/${noteId}/`),
};

// ============================================
// CONSULTATION PRESCRIPTIONS API
// ============================================
export const consultationPrescriptionsAPI = {
  list: (consultationId) =>
    api.get(`/consultation/consultations/${consultationId}/prescriptions/`),
  create: (consultationId, data) =>
    api.post(`/consultation/consultations/${consultationId}/prescriptions/`, data),
  bulkCreate: (consultationId, prescriptions) =>
    api.post(`/consultation/consultations/${consultationId}/prescriptions/bulk-create/`, {
      prescriptions,
    }),
  getById: (consultationId, prescriptionId) =>
    api.get(
      `/consultation/consultations/${consultationId}/prescriptions/${prescriptionId}/`
    ),
  update: (consultationId, prescriptionId, data) =>
    api.put(
      `/consultation/consultations/${consultationId}/prescriptions/${prescriptionId}/`,
      data
    ),
  delete: (consultationId, prescriptionId) =>
    api.delete(
      `/consultation/consultations/${consultationId}/prescriptions/${prescriptionId}/`
    ),
};

// ============================================
// CONSULTATION ATTACHMENTS API
// ============================================
export const consultationAttachmentsAPI = {
  list: (consultationId) =>
    api.get(`/consultation/consultations/${consultationId}/attachments/`),
  upload: (consultationId, formData) =>
    api.post(`/consultation/consultations/${consultationId}/attachments/`, formData, {
      timeout: UPLOAD_TIMEOUT,
    }),
  getById: (consultationId, attachmentId) =>
    api.get(
      `/consultation/consultations/${consultationId}/attachments/${attachmentId}/`
    ),
  delete: (consultationId, attachmentId) =>
    api.delete(
      `/consultation/consultations/${consultationId}/attachments/${attachmentId}/`
    ),
};

// ============================================
// CONSULTATION FEEDBACK API
// ============================================
export const consultationFeedbackAPI = {
  get: (consultationId) =>
    api.get(`/consultation/consultations/${consultationId}/feedback/`),
  create: (consultationId, data) =>
    api.post(`/consultation/consultations/${consultationId}/feedback/`, data),
};

// ============================================
// HEALTH RECORDS API - /health-records/
// ============================================
export const healthRecordsAPI = {
  // Health Profile
  profile: {
    get: () => api.get('/health-records/profile/'),
    getById: (id) => api.get(`/health-records/profile/${id}/`),
    create: (data) => api.post('/health-records/profile/', data),
    update: (id, data) => api.put(`/health-records/profile/${id}/`, data),
    getSummary: () => api.get('/health-records/profile/summary/'),
    getCriticalInfo: () => api.get('/health-records/profile/critical-info/'),
    syncAllergies: () => api.post('/health-records/profile/sync-allergies/', {}),
    syncConditions: () => api.post('/health-records/profile/sync-conditions/', {}),
    updateEmergencyContact: (data) =>
      api.post('/health-records/profile/update-emergency-contact/', data),
  },

  // Medical Conditions
  conditions: {
    list: (params) => api.get('/health-records/conditions/', { params }),
    create: (data) => api.post('/health-records/conditions/', data),
    getById: (id) => api.get(`/health-records/conditions/${id}/`),
    update: (id, data) => api.put(`/health-records/conditions/${id}/`, data),
    delete: (id) => api.delete(`/health-records/conditions/${id}/`),
    getActive: () => api.get('/health-records/conditions/active/'),
    getChronic: () => api.get('/health-records/conditions/chronic/'),
    resolve: (id) => api.post(`/health-records/conditions/${id}/resolve/`, {}),
  },

  // Medical Documents
  documents: {
    list: (params) => api.get('/health-records/documents/', { params }),
    upload: (formData) =>
      api.post('/health-records/documents/', formData, {
        timeout: 60000,
      }),
    getById: (id) => api.get(`/health-records/documents/${id}/`),
    update: (id, data) => api.put(`/health-records/documents/${id}/`, data),
    delete: (id) => api.delete(`/health-records/documents/${id}/`),
    getByType: (docType) =>
      api.get(`/health-records/documents/by-type/${docType}/`),
    getRecent: () => api.get('/health-records/documents/recent/'),
    search: (data) => api.post('/health-records/documents/search/', data),
    getDownloadUrl: (id) =>
      api.get(`/health-records/documents/${id}/download-url/`),
    toggleSharing: (id) =>
      api.post(`/health-records/documents/${id}/toggle-sharing/`, {}),
    getStorageStats: () => api.get('/health-records/documents/storage-stats/'),
    getStorageInfo: () => api.get('/health-records/documents/storage-info/'),
  },

  // Lab Reports
  labReports: {
    list: (params) => api.get('/health-records/lab-reports/', { params }),
    create: (data) => api.post('/health-records/lab-reports/', data),
    getById: (id) => api.get(`/health-records/lab-reports/${id}/`),
    update: (id, data) => api.put(`/health-records/lab-reports/${id}/`, data),
    delete: (id) => api.delete(`/health-records/lab-reports/${id}/`),
    getRecent: () => api.get('/health-records/lab-reports/recent/'),
    getAbnormal: () => api.get('/health-records/lab-reports/abnormal/'),
    getTrends: (params) =>
      api.get('/health-records/lab-reports/trends/', { params }),
  },

  // Vaccinations
  vaccinations: {
    list: (params) => api.get('/health-records/vaccinations/', { params }),
    create: (data) => api.post('/health-records/vaccinations/', data),
    getById: (id) => api.get(`/health-records/vaccinations/${id}/`),
    update: (id, data) => api.put(`/health-records/vaccinations/${id}/`, data),
    delete: (id) => api.delete(`/health-records/vaccinations/${id}/`),
    getPending: () => api.get('/health-records/vaccinations/pending/'),
    getSchedule: () => api.get('/health-records/vaccinations/schedule/'),
    verify: (id) => api.post(`/health-records/vaccinations/${id}/verify/`, {}),
  },

  // Allergies
  allergies: {
    list: (params) => api.get('/health-records/allergies/', { params }),
    create: (data) => api.post('/health-records/allergies/', data),
    getById: (id) => api.get(`/health-records/allergies/${id}/`),
    update: (id, data) => api.put(`/health-records/allergies/${id}/`, data),
    delete: (id) => api.delete(`/health-records/allergies/${id}/`),
    getActive: () => api.get('/health-records/allergies/active/'),
    getCritical: () => api.get('/health-records/allergies/critical/'),
    getDrug: () => api.get('/health-records/allergies/drug/'),
  },

  // Family Medical History
  familyHistory: {
    list: (params) => api.get('/health-records/family-history/', { params }),
    create: (data) => api.post('/health-records/family-history/', data),
    getById: (id) => api.get(`/health-records/family-history/${id}/`),
    update: (id, data) => api.put(`/health-records/family-history/${id}/`, data),
    delete: (id) => api.delete(`/health-records/family-history/${id}/`),
    getSummary: () => api.get('/health-records/family-history/summary/'),
    getRiskConditions: () =>
      api.get('/health-records/family-history/risk-conditions/'),
  },

  // Hospitalizations
  hospitalizations: {
    list: (params) => api.get('/health-records/hospitalizations/', { params }),
    create: (data) => api.post('/health-records/hospitalizations/', data),
    getById: (id) => api.get(`/health-records/hospitalizations/${id}/`),
    update: (id, data) =>
      api.put(`/health-records/hospitalizations/${id}/`, data),
    delete: (id) => api.delete(`/health-records/hospitalizations/${id}/`),
    getPendingFollowups: () =>
      api.get('/health-records/hospitalizations/pending-followups/'),
  },

  // Vital Signs
  vitals: {
    list: (params) => api.get('/health-records/vitals/', { params }),
    create: (data) => api.post('/health-records/vitals/', data),
    getById: (id) => api.get(`/health-records/vitals/${id}/`),
    update: (id, data) => api.put(`/health-records/vitals/${id}/`, data),
    delete: (id) => api.delete(`/health-records/vitals/${id}/`),
    getLatest: () => api.get('/health-records/vitals/latest/'),
    getTrends: (params) =>
      api.get('/health-records/vitals/trends/', { params }),
    getStatistics: (params) =>
      api.get('/health-records/vitals/statistics/', { params }),
  },

  // Shared Records
  sharing: {
    list: () => api.get('/health-records/sharing/'),
    share: (data) => api.post('/health-records/sharing/', data),
    getById: (id) => api.get(`/health-records/sharing/${id}/`),
    update: (id, data) => api.put(`/health-records/sharing/${id}/`, data),
    revoke: (id) => api.delete(`/health-records/sharing/${id}/`),
    getMyShares: () => api.get('/health-records/sharing/my-shares/'),
    getAccessiblePatients: () =>
      api.get('/health-records/sharing/accessible-patients/'),
    getPatientRecords: (patientId) =>
      api.get(`/health-records/sharing/patient/${patientId}/records/`),
  },

  // Analytics
  analytics: {
    getSummary: () => api.get('/health-records/analytics/summary/'),
    getScore: () => api.get('/health-records/analytics/score/'),
    getTimeline: () => api.get('/health-records/analytics/timeline/'),
    getQuickData: () => api.get('/health-records/analytics/quick-data/'),
  },

  // Health check
  healthCheck: () => api.get('/health-records/health/'),
};

// ============================================
// EMERGENCY API - /emergency/
// ============================================
export const emergencyAPI = {
  // SOS Alerts
  sos: {
    list: (params) => api.get('/emergency/sos/', { params }),
    trigger: (data) => api.post('/emergency/sos/trigger/', data),
    quickTrigger: (data = {}) => api.post('/emergency/sos/quick-trigger/', data),
    getById: (id) => api.get(`/emergency/sos/${id}/`),
    update: (id, data) => api.put(`/emergency/sos/${id}/`, data),
    cancel: (id, reason, notes = '') =>
      api.post(`/emergency/sos/${id}/cancel/`, { reason, notes }),
    updateStatus: (id, data) =>
      api.post(`/emergency/sos/${id}/update-status/`, data),
    getActive: () => api.get('/emergency/sos/active/'),
    getHistory: () => api.get('/emergency/sos/history/'),
    getStatistics: () => api.get('/emergency/sos/statistics/'),
    getTypes: () => api.get('/emergency/sos/types/'),
  },

  // Emergency Contacts
  contacts: {
    list: () => api.get('/emergency/contacts/'),
    create: (data) => api.post('/emergency/contacts/', data),
    getById: (id) => api.get(`/emergency/contacts/${id}/`),
    update: (id, data) => api.put(`/emergency/contacts/${id}/`, data),
    delete: (id) => api.delete(`/emergency/contacts/${id}/`),
    reorder: (contacts) =>
      api.post('/emergency/contacts/reorder/', { contacts }),
  },

  // Emergency Services (hospitals, ambulances, etc.)
  services: {
    list: (params) => api.get('/emergency/services/', { params }),
    getById: (id) => api.get(`/emergency/services/${id}/`),
    getNearby: (data) => api.post('/emergency/services/nearby/', data),
    getByDistrict: (params) =>
      api.get('/emergency/services/by-district/', { params }),
  },

  // Emergency Helplines
  helplines: {
    list: () => api.get('/emergency/helplines/'),
    getById: (id) => api.get(`/emergency/helplines/${id}/`),
    getImportant: () => api.get('/emergency/helplines/important/'),
    getByType: (helplineType) =>
      api.get(`/emergency/helplines/by-type/${helplineType}/`),
  },

  // First Aid Guides
  firstAid: {
    list: (params) => api.get('/emergency/first-aid/', { params }),
    getById: (id) => api.get(`/emergency/first-aid/${id}/`),
    getByCategory: (category) =>
      api.get(`/emergency/first-aid/by-category/${category}/`),
    getCritical: () => api.get('/emergency/first-aid/critical/'),
  },

  // Location
  location: {
    get: () => api.get('/emergency/location/'),
    update: (data) => api.post('/emergency/location/update/', data),
  },

  // Quick SOS data
  getQuickSOSData: () => api.get('/emergency/quick-sos-data/'),

  // Health check
  healthCheck: () => api.get('/emergency/health/'),
};

// ============================================
// MEDICINE API - /medicine/
// ============================================
export const medicineAPI = {
  // Medicine Database
  medicines: {
    list: (params) => api.get('/medicine/medicines/', { params }),
    getById: (id) => api.get(`/medicine/medicines/${id}/`),
    search: (data) => api.post('/medicine/medicines/search/', data),
    getCategories: () => api.get('/medicine/medicines/categories/'),
    getTypes: () => api.get('/medicine/medicines/types/'),
    getPopular: () => api.get('/medicine/medicines/popular/'),
    getAlternatives: (id) =>
      api.get(`/medicine/medicines/${id}/alternatives/`),
    getInteractions: (id) =>
      api.get(`/medicine/medicines/${id}/interactions/`),
    checkInteractions: (medicineIds) =>
      api.post('/medicine/medicines/check-interactions/', {
        medicine_ids: medicineIds,
      }),
    getSearchHistory: () => api.get('/medicine/medicines/search-history/'),
    clearSearchHistory: () =>
      api.delete('/medicine/medicines/search-history/clear/'),
  },

  // User Prescriptions
  prescriptions: {
    list: (params) => api.get('/medicine/prescriptions/', { params }),
    create: (data) => api.post('/medicine/prescriptions/', data),
    getById: (id) => api.get(`/medicine/prescriptions/${id}/`),
    update: (id, data) => api.put(`/medicine/prescriptions/${id}/`, data),
    delete: (id) => api.delete(`/medicine/prescriptions/${id}/`),
    getActive: () => api.get('/medicine/prescriptions/active/'),
    getCurrentMedicines: () =>
      api.get('/medicine/prescriptions/current-medicines/'),
    getStats: () => api.get('/medicine/prescriptions/stats/'),
    checkInteractions: () =>
      api.post('/medicine/prescriptions/check-interactions/', {}),
    addMedicine: (prescriptionId, data) =>
      api.post(`/medicine/prescriptions/${prescriptionId}/add-medicine/`, data),
    complete: (id) => api.post(`/medicine/prescriptions/${id}/complete/`, {}),
    discontinue: (id, reason = '') =>
      api.post(`/medicine/prescriptions/${id}/discontinue/`, { reason }),
  },

  // Prescription Medicines
  prescriptionMedicines: {
    list: (params) => api.get('/medicine/prescription-medicines/', { params }),
    create: (data) => api.post('/medicine/prescription-medicines/', data),
    getById: (id) => api.get(`/medicine/prescription-medicines/${id}/`),
    update: (id, data) =>
      api.put(`/medicine/prescription-medicines/${id}/`, data),
    delete: (id) => api.delete(`/medicine/prescription-medicines/${id}/`),
    createReminder: (id) =>
      api.post(`/medicine/prescription-medicines/${id}/create-reminder/`, {}),
  },

  // Medicine Reminders
  reminders: {
    list: (params) => api.get('/medicine/reminders/', { params }),
    create: (data) => api.post('/medicine/reminders/', data),
    getById: (id) => api.get(`/medicine/reminders/${id}/`),
    update: (id, data) => api.put(`/medicine/reminders/${id}/`, data),
    delete: (id) => api.delete(`/medicine/reminders/${id}/`),
    getToday: () => api.get('/medicine/reminders/today/'),
    getUpcoming: () => api.get('/medicine/reminders/upcoming/'),
    getAdherence: () => api.get('/medicine/reminders/adherence/'),
    pause: (id) => api.post(`/medicine/reminders/${id}/pause/`, {}),
    resume: (id) => api.post(`/medicine/reminders/${id}/resume/`, {}),
    cancel: (id) => api.post(`/medicine/reminders/${id}/cancel/`, {}),
  },

  // Reminder Logs
  reminderLogs: {
    list: (params) => api.get('/medicine/reminder-logs/', { params }),
    getById: (id) => api.get(`/medicine/reminder-logs/${id}/`),
    respond: (id, response, notes = '') =>
      api.post(`/medicine/reminder-logs/${id}/respond/`, {
        response,
        notes,
      }),
    markTaken: (id) => api.post(`/medicine/reminder-logs/${id}/taken/`, {}),
    markSkipped: (id) => api.post(`/medicine/reminder-logs/${id}/skipped/`, {}),
    snooze: (id) => api.post(`/medicine/reminder-logs/${id}/snooze/`, {}),
  },

  // Quick data
  getQuickData: () => api.get('/medicine/quick-data/'),

  // Tasks/Scheduler
  tasks: {
    getStatus: () => api.get('/medicine/tasks/status/'),
    trigger: (data) => api.post('/medicine/tasks/trigger/', data),
  },

  // Health check
  healthCheck: () => api.get('/medicine/health/'),
};

// ============================================
// DIAGNOSIS API - /diagnosis/
// ============================================
export const diagnosisAPI = {
  // Diagnose from text
  diagnose: (data) => api.post('/diagnosis/diagnose/', data),

  // Diagnose from symptoms list
  diagnoseSymptoms: (data) => api.post('/diagnosis/diagnose-symptoms/', data),

  // Quick diagnosis (without saving)
  quickDiagnose: (data) => api.post('/diagnosis/quick-diagnose/', data),

  // Symptoms
  symptoms: {
    list: () => api.get('/diagnosis/symptoms/'),
    getByCode: (code) => api.get(`/diagnosis/symptoms/${code}/`),
    getByCategory: () => api.get('/diagnosis/symptoms/by-category/'),
    search: (params) => api.get('/diagnosis/symptoms/search/', { params }),
  },

  // Diseases
  diseases: {
    list: () => api.get('/diagnosis/diseases/'),
    getByCode: (code) => api.get(`/diagnosis/diseases/${code}/`),
  },

  // Session
  getSession: (sessionId) => api.get(`/diagnosis/session/${sessionId}/`),

  // History
  getHistory: () => api.get('/diagnosis/history/'),

  // Feedback
  submitFeedback: (data) => api.post('/diagnosis/feedback/', data),

  // Model status
  getModelStatus: () => api.get('/diagnosis/model-status/'),
  reloadModels: () => api.post('/diagnosis/reload-models/', {}),

  // Health check
  healthCheck: () => api.get('/diagnosis/health/'),
};

// ============================================
// CHATBOT API - /chatbot/
// ============================================
export const chatbotAPI = {
  // Messages
  sendMessage: (data) => api.post('/chatbot/message/', data),
  sendVoiceMessage: (formData) =>
    api.post('/chatbot/message/voice/', formData, {
      timeout: UPLOAD_TIMEOUT,
    }),

  // Sessions
  startSession: (data = {}) => api.post('/chatbot/session/start/', data),
  getSession: (sessionId) => api.get(`/chatbot/session/${sessionId}/`),
  endSession: (sessionId) =>
    api.post(`/chatbot/session/${sessionId}/end/`, {}),
  deleteSession: (sessionId) =>
    api.delete(`/chatbot/session/${sessionId}/delete/`),
  getSessionMessages: (sessionId) =>
    api.get(`/chatbot/session/${sessionId}/messages/`),
  listSessions: () => api.get('/chatbot/sessions/'),

  // FAQ
  getFAQ: (params) => api.get('/chatbot/faq/', { params }),
  getFAQCategories: () => api.get('/chatbot/faq/categories/'),
  markFAQHelpful: (faqId) =>
    api.post(`/chatbot/faq/${faqId}/helpful/`, {}),

  // Health Tips
  getHealthTips: (params) => api.get('/chatbot/health-tips/', { params }),
  getDailyHealthTip: () => api.get('/chatbot/health-tips/daily/'),
  likeHealthTip: (tipId) =>
    api.post(`/chatbot/health-tips/${tipId}/like/`, {}),

  // Feedback
  submitMessageFeedback: (data) =>
    api.post('/chatbot/feedback/message/', data),
  submitConversationFeedback: (data) =>
    api.post('/chatbot/feedback/conversation/', data),

  // Suggestions
  getSuggestions: (params) => api.get('/chatbot/suggestions/', { params }),

  // Language & Translation
  detectLanguage: (data) => api.post('/chatbot/detect-language/', data),
  translate: (data) => api.post('/chatbot/translate/', data),
  textToSpeech: (data) =>
    api.post('/chatbot/text-to-speech/', data, {
      responseType: 'blob', // TTS returns audio blob
    }),

  // Stats
  getStats: () => api.get('/chatbot/stats/'),

  // Health check
  healthCheck: () => api.get('/chatbot/health/'),
};

// ============================================
// NOTIFICATIONS API - /notifications/
// ============================================
export const notificationsAPI = {
  // Notifications
  list: (params) => api.get('/notifications/', { params }),
  getById: (notificationId) =>
    api.get(`/notifications/${notificationId}/`),
  delete: (notificationId) =>
    api.delete(`/notifications/${notificationId}/delete/`),
  markRead: (notificationId) =>
    api.post(`/notifications/${notificationId}/read/`, {}),
  markAllRead: (notificationIds = null) =>
    api.post('/notifications/mark-read/', {
      notification_ids: notificationIds,
    }),
  clear: (readOnly = false) =>
    api.delete('/notifications/clear/', {
      params: { read_only: readOnly },
    }),
  getUnreadCount: () => api.get('/notifications/unread-count/'),
  getStats: () => api.get('/notifications/stats/'),

  // Device registration
  registerDevice: (data) =>
    api.post('/notifications/device/register/', data),
  unregisterDevice: (data) =>
    api.post('/notifications/device/unregister/', data),
  listDevices: () => api.get('/notifications/devices/'),

  // Preferences
  getPreferences: () => api.get('/notifications/preferences/'),
  updatePreferences: (data) =>
    api.put('/notifications/preferences/update/', data),
  updateTypePreference: (data) =>
    api.post('/notifications/preferences/type/', data),
  updateQuietHours: (data) =>
    api.post('/notifications/preferences/quiet-hours/', data),

  // Scheduled notifications
  listScheduled: () => api.get('/notifications/scheduled/'),
  createScheduled: (data) =>
    api.post('/notifications/scheduled/create/', data),
  toggleScheduled: (scheduledId) =>
    api.post(`/notifications/scheduled/${scheduledId}/toggle/`, {}),
  deleteScheduled: (scheduledId) =>
    api.delete(`/notifications/scheduled/${scheduledId}/delete/`),

  // Templates
  listTemplates: () => api.get('/notifications/templates/'),

  // Admin
  sendNotification: (data) =>
    api.post('/notifications/admin/send/', data),
  sendTemplateNotification: (data) =>
    api.post('/notifications/admin/send-template/', data),

  // Test
  sendTest: (data = {}) => api.post('/notifications/test/', data),

  // Health check
  healthCheck: () => api.get('/notifications/health/'),
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Upload file to backend with progress tracking
 * @param {File} file - File to upload
 * @param {string} endpoint - Upload endpoint
 * @param {object} additionalData - Additional form data
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise} - API response
 */
export const uploadFile = async (
  file,
  endpoint,
  additionalData = {},
  onProgress = null
) => {
  if (!file) {
    return Promise.reject({ message: 'No file provided', status: 0 });
  }

  const formData = new FormData();
  formData.append('file', file);

  Object.entries(additionalData).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  });

  return api.post(endpoint, formData, {
    timeout: UPLOAD_TIMEOUT,
    onUploadProgress: onProgress
      ? (progressEvent) => {
          const percentCompleted = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          onProgress(percentCompleted);
        }
      : undefined,
  });
};

/**
 * Download file from URL
 * @param {string} url - File URL
 * @param {string} filename - Filename for download
 */
export const downloadFile = async (url, filename) => {
  try {
    const response = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([response.data]);
    const link = document.createElement('a');
    const objectUrl = window.URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    // Clean up after a delay to ensure download starts
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    }, 100);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
};

/**
 * Build query string from params object
 * @param {object} params - Query parameters
 * @returns {string} - Query string
 */
export const buildQueryString = (params) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, v));
      } else {
        searchParams.append(key, value);
      }
    }
  });
  return searchParams.toString();
};

/**
 * Health check all services
 * @returns {Promise<object>} - Health status of all services
 */
export const checkAllServicesHealth = async () => {
  const services = {
    auth: authAPI.healthCheck,
    appointments: appointmentsAPI.healthCheck,
    consultation: consultationAPI.healthCheck,
    healthRecords: healthRecordsAPI.healthCheck,
    emergency: emergencyAPI.healthCheck,
    medicine: medicineAPI.healthCheck,
    diagnosis: diagnosisAPI.healthCheck,
    chatbot: chatbotAPI.healthCheck,
    notifications: notificationsAPI.healthCheck,
  };

  const results = {};
  await Promise.allSettled(
    Object.entries(services).map(async ([name, checkFn]) => {
      try {
        await checkFn();
        results[name] = 'healthy';
      } catch {
        results[name] = 'unhealthy';
      }
    })
  );
  return results;
};

// Export default instance for custom requests
export default api;