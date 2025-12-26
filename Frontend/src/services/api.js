import axios from 'axios';
import { getToken, clearStorage } from '../hooks/storage';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add language header for translations
    const language = localStorage.getItem('mediconnect_language') || 'en';
    config.headers['Accept-Language'] = language;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // You can modify response data here
    return response;
  },
  (error) => {
    const { response, config } = error;

    // If there is no response (network error / timeout), retry once for transient issues
    if (!response && config && !config.__isRetry) {
      config.__isRetry = true;
      console.warn('Network error detected, retrying request once...', config.url);
      // small delay before retrying
      return new Promise((resolve) => setTimeout(resolve, 1000)).then(() => api(config));
    }

    if (response) {
      // Handle different HTTP status codes
      switch (response.status) {
        case 401:
          // Unauthorized - clear storage and redirect to login
          clearStorage();
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;
          
        case 403:
          // Forbidden - user doesn't have permission
          console.error('Access forbidden:', response.data?.message);
          break;
          
        case 404:
          // Resource not found
          console.error('Resource not found:', response.config.url);
          break;
          
        case 500:
          // Server error
          console.error('Server error:', response.data?.message);
          break;
          
        default:
          console.error('API Error:', response.data?.message);
      }
      
      // Return a structured error object
      return Promise.reject({
        status: response.status,
        message: response.data?.message || 'An error occurred',
        data: response.data,
      });
    } else {
      // Network error or no response after retry
      console.error('Network Error (no response):', error);
      return Promise.reject({
        status: 0,
        // include axios message/code to help debugging in UI
        message: error?.message || 'Network error. Please check your connection.',
        code: error?.code || null,
        originalError: error
      });
    }
  }
);

// Auth endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  verifyToken: () => api.get('/auth/verify'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// User endpoints
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  changePassword: (data) => api.put('/user/change-password', data),
  deleteAccount: () => api.delete('/user/account'),
  getNotifications: () => api.get('/user/notifications'),
  markNotificationRead: (notificationId) => api.put(`/user/notifications/${notificationId}/read`),
};

// Doctor endpoints
export const doctorAPI = {
  getAllDoctors: (params) => api.get('/doctors', { params }),
  getDoctorById: (id) => api.get(`/doctors/${id}`),
  getDoctorProfile: () => api.get('/doctors/profile'),
  updateDoctorProfile: (data) => api.put('/doctors/profile', data),
  getAvailableSlots: (doctorId, date) => 
    api.get(`/doctors/${doctorId}/slots`, { params: { date } }),
  updateAvailability: (data) => api.put('/doctors/availability', data),
  bookAppointment: (data) => api.post('/appointments/book', data),
  getDoctorAppointments: (params) => api.get('/appointments/doctor', { params }),
  updateAppointmentStatus: (appointmentId, status) => 
    api.put(`/appointments/${appointmentId}/status`, { status }),
};

// Patient endpoints
export const patientAPI = {
  getPatientAppointments: () => api.get('/appointments/patient'),
  getUpcomingAppointments: () => api.get('/appointments/upcoming'),
  getAppointmentHistory: () => api.get('/appointments/history'),
  cancelAppointment: (id) => api.delete(`/appointments/${id}`),
  rescheduleAppointment: (appointmentId, newSlot) => 
    api.put(`/appointments/${appointmentId}/reschedule`, { newSlot }),
  getPatientProfile: () => api.get('/patient/profile'),
  updatePatientProfile: (data) => api.put('/patient/profile', data),
};

// Health Records endpoints
export const healthRecordsAPI = {
  uploadRecord: (formData) => api.post('/health-records/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getRecords: (params) => api.get('/health-records', { params }),
  getRecordById: (id) => api.get(`/health-records/${id}`),
  updateRecord: (id, data) => api.put(`/health-records/${id}`, data),
  deleteRecord: (id) => api.delete(`/health-records/${id}`),
  shareRecord: (recordId, doctorId) => 
    api.post(`/health-records/${recordId}/share`, { doctorId }),
  revokeAccess: (recordId, doctorId) => 
    api.delete(`/health-records/${recordId}/share/${doctorId}`),
  getSharedWith: (recordId) => api.get(`/health-records/${recordId}/shared-with`),
};

// Medicine endpoints
export const medicineAPI = {
  searchMedicines: (query, params) => api.get(`/medicines/search`, { 
    params: { q: query, ...params } 
  }),
  getMedicineDetails: (id) => api.get(`/medicines/${id}`),
  getAlternativeMedicines: (id) => api.get(`/medicines/${id}/alternatives`),
  checkAvailability: (medicineId, pincode) => 
    api.get(`/medicines/${medicineId}/availability`, { params: { pincode } }),
  getCategories: () => api.get('/medicines/categories'),
  getByCategory: (category) => api.get(`/medicines/category/${category}`),
  addToCart: (data) => api.post('/cart/add', data),
  getCart: () => api.get('/cart'),
  updateCartItem: (itemId, quantity) => api.put(`/cart/${itemId}`, { quantity }),
  removeCartItem: (itemId) => api.delete(`/cart/${itemId}`),
  checkout: (data) => api.post('/checkout', data),
  getOrders: () => api.get('/orders'),
  getOrderById: (id) => api.get(`/orders/${id}`),
  cancelOrder: (id) => api.delete(`/orders/${id}`),
};

// Symptom Checker endpoints
export const symptomCheckerAPI = {
  analyzeSymptoms: (symptoms) => api.post('/symptom-checker', symptoms),
  getPossibleConditions: (symptomIds) => 
    api.post('/symptom-checker/conditions', { symptomIds }),
  getRecommendations: (conditionId) => 
    api.get(`/symptom-checker/recommendations/${conditionId}`),
  getSymptomsList: () => api.get('/symptom-checker/symptoms'),
  getSymptomCategories: () => api.get('/symptom-checker/categories'),
  getChatHistory: () => api.get('/symptom-checker/history'),
  saveAnalysis: (data) => api.post('/symptom-checker/save', data),
};

// Emergency endpoints
export const emergencyAPI = {
  sendSOS: (locationData) => api.post('/emergency/sos', locationData),
  getNearbyHospitals: (lat, lng, radius = 10) => 
    api.get('/emergency/hospitals', { params: { lat, lng, radius } }),
  getAmbulanceStatus: () => api.get('/emergency/ambulance'),
  requestAmbulance: (data) => api.post('/emergency/ambulance/request', data),
  getEmergencyContacts: () => api.get('/emergency/contacts'),
  updateEmergencyContact: (contactId, data) => api.put(`/emergency/contacts/${contactId}`, data),
  addEmergencyContact: (data) => api.post('/emergency/contacts', data),
  deleteEmergencyContact: (contactId) => api.delete(`/emergency/contacts/${contactId}`),
};

// Chatbot endpoints
export const chatbotAPI = {
  sendMessage: (message) => api.post('/chatbot', { message }),
  getChatHistory: () => api.get('/chatbot/history'),
  clearHistory: () => api.delete('/chatbot/history'),
  rateResponse: (messageId, rating) => api.post(`/chatbot/rate/${messageId}`, { rating }),
  getQuickReplies: () => api.get('/chatbot/quick-replies'),
};

// Consultation endpoints
export const consultationAPI = {
  createRoom: (data) => api.post('/consultation/create-room', data),
  joinRoom: (roomId) => api.get(`/consultation/join-room/${roomId}`),
  endConsultation: (roomId) => api.post(`/consultation/${roomId}/end`),
  getPrescription: (consultationId) => 
    api.get(`/consultation/${consultationId}/prescription`),
  generatePrescription: (consultationId, data) => 
    api.post(`/consultation/${consultationId}/prescription`, data),
  updatePrescription: (prescriptionId, data) => 
    api.put(`/prescription/${prescriptionId}`, data),
  getConsultationHistory: () => api.get('/consultation/history'),
  getConsultationById: (id) => api.get(`/consultation/${id}`),
};

// Utility endpoints
export const utilityAPI = {
  uploadFile: (formData) => api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getPresignedUrl: (fileName) => api.post('/upload/presigned-url', { fileName }),
  sendFeedback: (data) => api.post('/feedback', data),
  reportIssue: (data) => api.post('/report-issue', data),
  getStatistics: () => api.get('/statistics'),
  checkServiceStatus: () => api.get('/status'),
};

// Export default instance for custom requests
export default api;

// Example usage:
/*
import api, { authAPI, userAPI } from './services/api';

// Custom request
api.get('/custom-endpoint')
  .then(response => console.log(response.data))
  .catch(error => console.error(error));

// Using specific API groups
authAPI.login({ email, password, role })
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
*/