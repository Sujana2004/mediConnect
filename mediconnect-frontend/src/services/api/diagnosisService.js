/**
 * Diagnosis/Symptom Checker API Service
 * Handles all diagnosis and symptom checking API calls
 */

import api from '../../config/api';

/**
 * API endpoint constants
 * @readonly
 */
const DIAGNOSIS_ENDPOINTS = Object.freeze({
  DIAGNOSE: '/diagnosis/diagnose/',
  DIAGNOSE_SYMPTOMS: '/diagnosis/diagnose-symptoms/',
  SYMPTOMS: '/diagnosis/symptoms/',
  DISEASES: '/diagnosis/diseases/',
  HISTORY: '/diagnosis/history/',
  SESSION: '/diagnosis/session/',
  FEEDBACK: '/diagnosis/feedback/',
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

// ========== Diagnosis ==========

/**
 * Diagnose from text description
 * @param {string|Object} data - Text description or diagnosis request data
 * @param {string} data.text - Text description of symptoms (if object)
 * @param {string} [data.language] - Language code (en/hi/te)
 * @param {number} [data.patient_age] - Patient's age
 * @param {string} [data.patient_gender] - Patient's gender
 * @returns {Promise<Object>} Diagnosis results
 */
export const diagnoseFromText = async (data) => {
  // Convert string to proper API format
  const payload = typeof data === 'string' 
    ? { text: data }
    : { text: data?.text || data?.description, ...data };
  
  const response = await api.post(DIAGNOSIS_ENDPOINTS.DIAGNOSE, payload);
  return response.data;
};

/**
 * Diagnose from symptom list
 * @param {Object} data - Diagnosis request data
 * @param {Array<string|number>} data.symptom_ids - Array of symptom IDs
 * @param {number} [data.age] - Patient's age
 * @param {string} [data.gender] - Patient's gender
 * @param {number} [data.duration_days] - Duration of symptoms in days
 * @param {string} [data.severity] - Severity (mild/moderate/severe)
 * @returns {Promise<Object>} Diagnosis results
 */
export const diagnoseFromSymptoms = async (data) => {
  const response = await api.post(DIAGNOSIS_ENDPOINTS.DIAGNOSE_SYMPTOMS, data);
  return response.data;
};

// ========== Symptoms ==========

/**
 * Get all symptoms
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.category] - Filter by category
 * @param {number} [filters.page] - Page number
 * @param {number} [filters.page_size] - Items per page
 * @returns {Promise<Object>} List of symptoms
 */
export const getSymptoms = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${DIAGNOSIS_ENDPOINTS.SYMPTOMS}${queryString}`);
  return response.data;
};

/**
 * Get symptoms grouped by category
 * @returns {Promise<Object>} Symptoms grouped by category
 */
export const getSymptomsByCategory = async () => {
  const endpoint = buildEndpoint(DIAGNOSIS_ENDPOINTS.SYMPTOMS, null, 'by-category');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Search symptoms
 * @param {string} query - Search query
 * @param {string} [language] - Language code
 * @returns {Promise<Array>} Matching symptoms
 */
export const searchSymptoms = async (query, language = 'en') => {
  const queryString = buildQueryString({ q: query, language });
  const endpoint = buildEndpoint(DIAGNOSIS_ENDPOINTS.SYMPTOMS, null, 'search');
  const response = await api.get(`${endpoint}${queryString}`);
  return response.data;
};

// ========== Diseases ==========

/**
 * Get all diseases
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.category] - Filter by category
 * @param {number} [filters.page] - Page number
 * @param {number} [filters.page_size] - Items per page
 * @returns {Promise<Object>} List of diseases
 */
export const getDiseases = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${DIAGNOSIS_ENDPOINTS.DISEASES}${queryString}`);
  return response.data;
};

// ========== History & Sessions ==========

/**
 * Get user's diagnosis history
 * @param {Object} [filters] - Filter options
 * @param {number} [filters.page] - Page number
 * @param {number} [filters.page_size] - Items per page
 * @returns {Promise<Object>} Paginated diagnosis history
 */
export const getDiagnosisHistory = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${DIAGNOSIS_ENDPOINTS.HISTORY}${queryString}`);
  return response.data;
};

/**
 * Get diagnosis session details
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Session details
 */
export const getSessionDetails = async (sessionId) => {
  const endpoint = buildEndpoint(DIAGNOSIS_ENDPOINTS.SESSION, sessionId);
  const response = await api.get(endpoint);
  return response.data;
};

// ========== Feedback ==========

/**
 * Submit feedback on diagnosis
 * @param {Object} feedbackData - Feedback data
 * @param {string} feedbackData.session_id - Session ID
 * @param {boolean} feedbackData.was_helpful - Was diagnosis helpful
 * @param {boolean} [feedbackData.was_accurate] - Was diagnosis accurate
 * @param {string} [feedbackData.actual_diagnosis] - Actual diagnosis if different
 * @param {string} [feedbackData.comments] - Additional comments
 * @returns {Promise<Object>} Feedback confirmation
 */
export const submitDiagnosisFeedback = async (feedbackData) => {
  const response = await api.post(DIAGNOSIS_ENDPOINTS.FEEDBACK, feedbackData);
  return response.data;
};

export const getHistory = getDiagnosisHistory; // Alias for compatibility

/**
 * Diagnosis service default export
 * Groups all diagnosis-related API methods
 */
export default {
  // Diagnosis
  diagnoseFromText,
  diagnoseFromSymptoms,
  // Symptoms
  getSymptoms,
  getSymptomsByCategory,
  searchSymptoms,
  // Diseases
  getDiseases,
  // History & Sessions
  getDiagnosisHistory,
  getHistory,
  getSessionDetails,
  getSession: getSessionDetails, // Add alias
  // Feedback
  submitDiagnosisFeedback,
  submitFeedback: submitDiagnosisFeedback, // Add alias
};