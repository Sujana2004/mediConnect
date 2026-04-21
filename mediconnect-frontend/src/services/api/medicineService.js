/**
 * Medicine API Service
 * Handles all medicine-related API calls including prescriptions and reminders
 */

import api from '../../config/api';

/**
 * API endpoint constants
 * @readonly
 */
const MEDICINE_ENDPOINTS = Object.freeze({
  MEDICINES: '/medicine/medicines/',
  PRESCRIPTIONS: '/medicine/prescriptions/',
  REMINDERS: '/medicine/reminders/',
  REMINDER_LOGS: '/medicine/reminder-logs/',
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

// ========== Medicines ==========

/**
 * Get list of medicines
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.category] - Medicine category
 * @param {string} [filters.search] - Search query
 * @param {number} [filters.page] - Page number
 * @param {number} [filters.page_size] - Items per page
 * @returns {Promise<Object>} Paginated list of medicines
 */
export const getMedicines = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${MEDICINE_ENDPOINTS.MEDICINES}${queryString}`);
  return response.data;
};

/**
 * Get medicine by ID
 * @param {string|number} medicineId - Medicine ID
 * @returns {Promise<Object>} Medicine details
 */
export const getMedicineById = async (medicineId) => {
  const endpoint = buildEndpoint(MEDICINE_ENDPOINTS.MEDICINES, medicineId);
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Search medicines
 * @param {string} query - Search query
 * @param {string} [language] - Language code
 * @returns {Promise<Array>} Matching medicines
 */
export const searchMedicines = async (query, language = 'en') => {
  const endpoint = buildEndpoint(MEDICINE_ENDPOINTS.MEDICINES, null, 'search');
  const response = await api.post(endpoint, { query, language });
  return response.data;
};

/**
 * Get generic alternatives for a medicine
 * @param {string|number} medicineId - Medicine ID
 * @returns {Promise<Array>} List of alternatives
 */
export const getMedicineAlternatives = async (medicineId) => {
  const endpoint = buildEndpoint(MEDICINE_ENDPOINTS.MEDICINES, medicineId, 'alternatives');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Get drug interactions for a medicine
 * @param {string|number} medicineId - Medicine ID
 * @returns {Promise<Array>} List of interactions
 */
export const getMedicineInteractions = async (medicineId) => {
  const endpoint = buildEndpoint(MEDICINE_ENDPOINTS.MEDICINES, medicineId, 'interactions');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Check interactions between multiple medicines
 * @param {Array<string|number>} medicineIds - Array of medicine IDs
 * @returns {Promise<Array>} List of interactions
 */
export const checkMedicineInteractions = async (medicineIds) => {
  const endpoint = buildEndpoint(MEDICINE_ENDPOINTS.MEDICINES, null, 'check-interactions');
  const response = await api.post(endpoint, { medicine_ids: medicineIds });
  return response.data;
};

// ========== Prescriptions ==========

/**
 * Get user prescriptions
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.status] - Status filter (active/completed/cancelled)
 * @param {number} [filters.page] - Page number
 * @param {number} [filters.page_size] - Items per page
 * @returns {Promise<Object>} Paginated prescriptions list
 */
export const getPrescriptions = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${MEDICINE_ENDPOINTS.PRESCRIPTIONS}${queryString}`);
  return response.data;
};

/**
 * Get prescription by ID
 * @param {string|number} prescriptionId - Prescription ID
 * @returns {Promise<Object>} Prescription details
 */
export const getPrescriptionById = async (prescriptionId) => {
  const endpoint = buildEndpoint(MEDICINE_ENDPOINTS.PRESCRIPTIONS, prescriptionId);
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Create a prescription (doctor only)
 * @param {Object} prescriptionData - Prescription data
 * @param {string|number} prescriptionData.patient_id - Patient ID
 * @param {string|number} [prescriptionData.consultation_id] - Consultation ID
 * @param {string} [prescriptionData.diagnosis] - Diagnosis
 * @param {Array<Object>} prescriptionData.medicines - Array of medicine objects
 * @param {string} [prescriptionData.instructions] - General instructions
 * @param {string} [prescriptionData.valid_until] - Validity date
 * @returns {Promise<Object>} Created prescription
 */
export const createPrescription = async (prescriptionData) => {
  const response = await api.post(MEDICINE_ENDPOINTS.PRESCRIPTIONS, prescriptionData);
  return response.data;
};

/**
 * Get active prescriptions
 * @returns {Promise<Array>} List of active prescriptions
 */
export const getActivePrescriptions = async () => {
  const endpoint = buildEndpoint(MEDICINE_ENDPOINTS.PRESCRIPTIONS, null, 'active');
  const response = await api.get(endpoint);
  return response.data;
};

// ========== Medicine Reminders ==========

/**
 * Get medicine reminders
 * @param {Object} [filters] - Filter options
 * @param {boolean} [filters.active] - Filter active only
 * @param {number} [filters.page] - Page number
 * @param {number} [filters.page_size] - Items per page
 * @returns {Promise<Array>} List of reminders
 */
export const getReminders = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${MEDICINE_ENDPOINTS.REMINDERS}${queryString}`);
  return response.data;
};

/**
 * Create a medicine reminder
 * @param {Object} reminderData - Reminder data
 * @param {string} reminderData.medicine_name - Medicine name
 * @param {string} reminderData.dosage - Dosage (e.g., "1 tablet")
 * @param {Array<string>} reminderData.times - Array of times (["08:00", "20:00"])
 * @param {string} reminderData.frequency - Frequency (daily/weekly/custom)
 * @param {string} [reminderData.start_date] - Start date
 * @param {string} [reminderData.end_date] - End date
 * @param {string} [reminderData.instructions] - Instructions (before_food/after_food/with_food)
 * @param {string} [reminderData.notes] - Additional notes
 * @returns {Promise<Object>} Created reminder
 */
export const createReminder = async (reminderData) => {
  const response = await api.post(MEDICINE_ENDPOINTS.REMINDERS, reminderData);
  return response.data;
};

/**
 * Update a reminder
 * @param {string|number} reminderId - Reminder ID
 * @param {Object} reminderData - Updated data
 * @returns {Promise<Object>} Updated reminder
 */
export const updateReminder = async (reminderId, reminderData) => {
  const endpoint = buildEndpoint(MEDICINE_ENDPOINTS.REMINDERS, reminderId);
  const response = await api.put(endpoint, reminderData);
  return response.data;
};

/**
 * Delete a reminder
 * @param {string|number} reminderId - Reminder ID
 * @returns {Promise<void>}
 */
export const deleteReminder = async (reminderId) => {
  const endpoint = buildEndpoint(MEDICINE_ENDPOINTS.REMINDERS, reminderId);
  const response = await api.delete(endpoint);
  return response.data;
};

/**
 * Get today's reminders
 * @returns {Promise<Array>} Today's reminders
 */
export const getTodayReminders = async () => {
  const endpoint = buildEndpoint(MEDICINE_ENDPOINTS.REMINDERS, null, 'today');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Get adherence statistics
 * @param {number} [days] - Number of days for adherence window
 * @returns {Promise<Object>} Adherence stats
 */
export const getAdherenceStats = async (days = 7) => {
  const endpoint = buildEndpoint(MEDICINE_ENDPOINTS.REMINDERS, null, 'adherence');
  const queryString = buildQueryString({ days });
  const response = await api.get(`${endpoint}${queryString}`);
  return response.data;
};

// ========== Reminder Logs ==========

/**
 * Get reminder logs
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.date] - Filter by date
 * @param {string|number} [filters.reminder_id] - Filter by reminder
 * @param {number} [filters.page] - Page number
 * @param {number} [filters.page_size] - Items per page
 * @returns {Promise<Array>} List of logs
 */
export const getReminderLogs = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${MEDICINE_ENDPOINTS.REMINDER_LOGS}${queryString}`);
  return response.data;
};

/**
 * Respond to a reminder (taken/skipped/snoozed)
 * @param {string|number} logId - Reminder log ID
 * @param {Object} responseData - Response data
 * @param {string} responseData.action - Action (taken/skipped/snoozed)
 * @param {number} [responseData.snooze_minutes] - Snooze duration if snoozed
 * @param {string} [responseData.notes] - Notes
 * @returns {Promise<Object>} Updated log
 */
export const respondToReminder = async (logId, responseData) => {
  const endpoint = buildEndpoint(MEDICINE_ENDPOINTS.REMINDER_LOGS, logId, 'respond');
  const response = await api.post(endpoint, responseData);
  return response.data;
};

/**
 * Medicine service default export
 * Groups all medicine-related API methods
 */
export default {
  // Medicines
  getMedicines,
  getMedicineById,
  searchMedicines,
  getMedicineAlternatives,
  getMedicineInteractions,
  checkMedicineInteractions,
  // Prescriptions
  getPrescriptions,
  getPrescriptionById,
  createPrescription,
  getActivePrescriptions,
  // Reminders
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  getTodayReminders,
  getAdherenceStats,
  // Reminder Logs
  getReminderLogs,
  respondToReminder,
};