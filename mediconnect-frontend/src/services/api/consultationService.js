/**
 * Consultation API Service
 * Handles all consultation-related API calls including video/audio calls
 */

import api from '../../config/api';

/**
 * API endpoint constants
 * @readonly
 */
const CONSULTATION_ENDPOINTS = Object.freeze({
  CONSULTATIONS: '/consultation/consultations/',
  JITSI_CONFIG: '/consultation/jitsi/config/',
});

/**
 * Builds query string from filters object
 * @param {Object} filters - Filter key-value pairs
 * @returns {string} Query string (with leading ? if not empty)
 */
const buildQueryString = (filters) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Constructs endpoint URL with optional ID and action
 * @param {string} baseEndpoint - Base endpoint path
 * @param {string|number|null} [id] - Optional resource ID
 * @param {string|null} [action] - Optional action suffix
 * @returns {string} Complete endpoint URL
 */
const buildEndpoint = (baseEndpoint, id = null, action = null) => {
  let endpoint = baseEndpoint;

  if (id !== null) {
    endpoint += `${id}/`;
  }

  if (action) {
    endpoint += `${action}/`;
  }

  return endpoint;
};

// ========== Consultations ==========

/**
 * Get list of consultations
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.status] - Filter by status
 * @param {number} [filters.page] - Page number
 * @param {number} [filters.page_size] - Items per page
 * @returns {Promise<Object>} Paginated list of consultations
 */
export const getConsultations = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${CONSULTATION_ENDPOINTS.CONSULTATIONS}${queryString}`);
  return response.data;
};

/**
 * Get consultation by ID
 * @param {string|number} consultationId - Consultation ID
 * @returns {Promise<Object>} Consultation details
 */
export const getConsultationById = async (consultationId) => {
  const endpoint = buildEndpoint(CONSULTATION_ENDPOINTS.CONSULTATIONS, consultationId);
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Create a new consultation
 * @param {Object} consultationData - Consultation data
 * @param {string|number} consultationData.patient_id - Patient's ID
 * @param {string} consultationData.consultation_type - Type (video/audio/chat)
 * @param {string} [consultationData.chief_complaint] - Chief complaint
 * @returns {Promise<Object>} Created consultation data
 */
export const createConsultation = async (consultationData) => {
  const response = await api.post(CONSULTATION_ENDPOINTS.CONSULTATIONS, consultationData);
  return response.data;
};

/**
 * Create consultation from an appointment
 * @param {Object} data - Appointment data
 * @param {string|number} data.appointment_id - Appointment ID
 * @returns {Promise<Object>} Created consultation data
 */
export const createConsultationFromAppointment = async (data) => {
  const endpoint = buildEndpoint(CONSULTATION_ENDPOINTS.CONSULTATIONS, null, 'from-appointment');
  const response = await api.post(endpoint, data);
  return response.data;
};

/**
 * Start a consultation (doctor)
 * @param {string|number} consultationId - Consultation ID
 * @returns {Promise<Object>} Started consultation data with Jitsi info
 */
export const startConsultation = async (consultationId) => {
  const endpoint = buildEndpoint(CONSULTATION_ENDPOINTS.CONSULTATIONS, consultationId, 'start');
  const response = await api.post(endpoint);
  return response.data;
};

/**
 * End a consultation (doctor)
 * @param {string|number} consultationId - Consultation ID
 * @param {Object} [endData] - End consultation data
 * @param {string} [endData.summary] - Consultation summary
 * @param {string} [endData.diagnosis] - Diagnosis
 * @param {string} [endData.follow_up_date] - Follow-up date
 * @returns {Promise<Object>} Ended consultation data
 */
export const endConsultation = async (consultationId, endData = {}) => {
  const endpoint = buildEndpoint(CONSULTATION_ENDPOINTS.CONSULTATIONS, consultationId, 'end');
  const response = await api.post(endpoint, endData);
  return response.data;
};

/**
 * Join consultation (get Jitsi room info)
 * @param {string|number} consultationId - Consultation ID
 * @returns {Promise<Object>} Join info with Jitsi room details
 */
export const joinConsultation = async (consultationId) => {
  const endpoint = buildEndpoint(CONSULTATION_ENDPOINTS.CONSULTATIONS, consultationId, 'join');
  const response = await api.post(endpoint);
  return response.data;
};

/**
 * Patient joins waiting room
 * @param {string|number} consultationId - Consultation ID
 * @returns {Promise<Object>} Waiting room status
 */
export const joinWaitingRoom = async (consultationId) => {
  const endpoint = buildEndpoint(CONSULTATION_ENDPOINTS.CONSULTATIONS, consultationId, 'join-waiting-room');
  const response = await api.post(endpoint);
  return response.data;
};

// ========== Consultation Notes ==========

/**
 * Get consultation notes
 * @param {string|number} consultationId - Consultation ID
 * @returns {Promise<Array>} List of notes
 */
export const getConsultationNotes = async (consultationId) => {
  const endpoint = buildEndpoint(CONSULTATION_ENDPOINTS.CONSULTATIONS, consultationId, 'notes');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Add note to consultation
 * @param {string|number} consultationId - Consultation ID
 * @param {Object} noteData - Note data
 * @param {string} noteData.content - Note content
 * @param {string} [noteData.note_type] - Note type (general/symptoms/examination/diagnosis/treatment)
 * @returns {Promise<Object>} Created note data
 */
export const addConsultationNote = async (consultationId, noteData) => {
  const endpoint = buildEndpoint(CONSULTATION_ENDPOINTS.CONSULTATIONS, consultationId, 'notes');
  const response = await api.post(endpoint, noteData);
  return response.data;
};

// ========== Prescriptions ==========

/**
 * Get prescriptions for a consultation
 * @param {string|number} consultationId - Consultation ID
 * @returns {Promise<Array>} List of prescriptions
 */
export const getConsultationPrescriptions = async (consultationId) => {
  const endpoint = buildEndpoint(CONSULTATION_ENDPOINTS.CONSULTATIONS, consultationId, 'prescriptions');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Add prescription to consultation
 * @param {string|number} consultationId - Consultation ID
 * @param {Object} prescriptionData - Prescription data
 * @param {Array<Object>} prescriptionData.medicines - Array of medicine objects
 * @param {string} [prescriptionData.instructions] - General instructions
 * @param {string} [prescriptionData.diagnosis] - Diagnosis
 * @returns {Promise<Object>} Created prescription data
 */
export const addConsultationPrescription = async (consultationId, prescriptionData) => {
  const endpoint = buildEndpoint(CONSULTATION_ENDPOINTS.CONSULTATIONS, consultationId, 'prescriptions');
  const response = await api.post(endpoint, prescriptionData);
  return response.data;
};

// ========== Feedback ==========

/**
 * Submit feedback for consultation
 * @param {string|number} consultationId - Consultation ID
 * @param {Object} feedbackData - Feedback data
 * @param {number} feedbackData.rating - Rating (1-5)
 * @param {string} [feedbackData.comment] - Feedback comment
 * @param {boolean} [feedbackData.would_recommend] - Would recommend doctor
 * @returns {Promise<Object>} Submitted feedback data
 */
export const submitFeedback = async (consultationId, feedbackData) => {
  const endpoint = buildEndpoint(CONSULTATION_ENDPOINTS.CONSULTATIONS, consultationId, 'feedback');
  const response = await api.post(endpoint, feedbackData);
  return response.data;
};

// ========== Jitsi Configuration ==========

/**
 * Get Jitsi configuration
 * @returns {Promise<Object>} Jitsi configuration
 */
export const getJitsiConfig = async () => {
  const response = await api.get(CONSULTATION_ENDPOINTS.JITSI_CONFIG);
  return response.data;
};

/**
 * Consultation service default export
 * Groups all consultation-related API methods
 */
export default {
  // Consultations
  getConsultations,
  getConsultationById,
  createConsultation,
  createConsultationFromAppointment,
  startConsultation,
  endConsultation,
  joinConsultation,
  joinWaitingRoom,
  // Notes
  getConsultationNotes,
  addConsultationNote,
  // Prescriptions
  getConsultationPrescriptions,
  addConsultationPrescription,
  // Feedback
  submitFeedback,
  // Jitsi
  getJitsiConfig,
};