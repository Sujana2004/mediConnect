/**
 * Health Records API Service
 * Handles all health records related API calls
 */

import api from '../../config/api';

/**
 * API endpoint constants
 * @readonly
 */
const HEALTH_RECORDS_ENDPOINTS = Object.freeze({
  PROFILE: '/health-records/profile/',
  VITALS: '/health-records/vitals/',
  CONDITIONS: '/health-records/conditions/',
  ALLERGIES: '/health-records/allergies/',
  DOCUMENTS: '/health-records/documents/',
  LAB_REPORTS: '/health-records/lab-reports/',
  VACCINATIONS: '/health-records/vaccinations/',
  FAMILY_HISTORY: '/health-records/family-history/',
  HOSPITALIZATIONS: '/health-records/hospitalizations/',
  SHARING: '/health-records/sharing/',
  ANALYTICS: '/health-records/analytics/',
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

/**
 * Builds FormData from object, excluding null/undefined values
 * @param {Object} data - Data object
 * @param {Array<string>} requiredFields - Fields that must be included
 * @returns {FormData} Constructed FormData
 */
const buildFormData = (data, requiredFields = []) => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, value);
    } else if (requiredFields.includes(key)) {
      formData.append(key, value);
    }
  });

  return formData;
};

// ========== Health Profile ==========

/**
 * Get health profile
 * @returns {Promise<Object>} Health profile data
 */
export const getHealthProfile = async () => {
  const response = await api.get(HEALTH_RECORDS_ENDPOINTS.PROFILE);
  return response.data;
};

/**
 * Create or update health profile
 * @param {Object} profileData - Health profile data
 * @param {string} [profileData.blood_group] - Blood group
 * @param {number} [profileData.height_cm] - Height in cm
 * @param {number} [profileData.weight_kg] - Weight in kg
 * @param {string} [profileData.lifestyle] - Lifestyle (sedentary/moderate/active)
 * @param {boolean} [profileData.is_smoker] - Is smoker
 * @param {boolean} [profileData.is_alcoholic] - Is alcoholic
 * @param {string} [profileData.dietary_preference] - Dietary preference
 * @returns {Promise<Object>} Updated health profile
 */
export const updateHealthProfile = async (profileData) => {
  const response = await api.post(HEALTH_RECORDS_ENDPOINTS.PROFILE, profileData);
  return response.data;
};

// ========== Vital Signs ==========

/**
 * Get vital signs list
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.start_date] - Start date
 * @param {string} [filters.end_date] - End date
 * @param {number} [filters.page] - Page number
 * @param {number} [filters.page_size] - Items per page
 * @returns {Promise<Object>} Paginated vitals list
 */
export const getVitals = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${HEALTH_RECORDS_ENDPOINTS.VITALS}${queryString}`);
  return response.data;
};

/**
 * Add vital signs
 * @param {Object} vitalsData - Vitals data
 * @param {number} [vitalsData.blood_pressure_systolic] - Systolic BP
 * @param {number} [vitalsData.blood_pressure_diastolic] - Diastolic BP
 * @param {number} [vitalsData.heart_rate] - Heart rate (bpm)
 * @param {number} [vitalsData.temperature] - Temperature (°C)
 * @param {number} [vitalsData.oxygen_saturation] - SpO2 (%)
 * @param {number} [vitalsData.blood_sugar] - Blood sugar (mg/dL)
 * @param {number} [vitalsData.weight_kg] - Weight (kg)
 * @param {string} [vitalsData.notes] - Notes
 * @returns {Promise<Object>} Created vitals data
 */
export const addVitals = async (vitalsData) => {
  const response = await api.post(HEALTH_RECORDS_ENDPOINTS.VITALS, vitalsData);
  return response.data;
};

/**
 * Get latest vital signs
 * @returns {Promise<Object>} Latest vitals
 */
export const getLatestVitals = async () => {
  const endpoint = buildEndpoint(HEALTH_RECORDS_ENDPOINTS.VITALS, null, 'latest');
  const response = await api.get(endpoint);
  return response.data;
};

// ========== Medical Conditions ==========

/**
 * Get medical conditions
 * @returns {Promise<Array>} List of medical conditions
 */
export const getConditions = async () => {
  const response = await api.get(HEALTH_RECORDS_ENDPOINTS.CONDITIONS);
  return response.data;
};

/**
 * Add medical condition
 * @param {Object} conditionData - Condition data
 * @param {string} conditionData.name - Condition name
 * @param {string} [conditionData.diagnosed_date] - Diagnosis date
 * @param {string} [conditionData.status] - Status (active/resolved/managed)
 * @param {string} [conditionData.notes] - Notes
 * @param {boolean} [conditionData.is_chronic] - Is chronic condition
 * @returns {Promise<Object>} Created condition
 */
export const addCondition = async (conditionData) => {
  const response = await api.post(HEALTH_RECORDS_ENDPOINTS.CONDITIONS, conditionData);
  return response.data;
};

/**
 * Update medical condition
 * @param {string|number} conditionId - Condition ID
 * @param {Object} conditionData - Updated data
 * @returns {Promise<Object>} Updated condition
 */
export const updateCondition = async (conditionId, conditionData) => {
  const endpoint = buildEndpoint(HEALTH_RECORDS_ENDPOINTS.CONDITIONS, conditionId);
  const response = await api.put(endpoint, conditionData);
  return response.data;
};

/**
 * Delete medical condition
 * @param {string|number} conditionId - Condition ID
 * @returns {Promise<void>}
 */
export const deleteCondition = async (conditionId) => {
  const endpoint = buildEndpoint(HEALTH_RECORDS_ENDPOINTS.CONDITIONS, conditionId);
  const response = await api.delete(endpoint);
  return response.data;
};

// ========== Allergies ==========

/**
 * Get allergies
 * @returns {Promise<Array>} List of allergies
 */
export const getAllergies = async () => {
  const response = await api.get(HEALTH_RECORDS_ENDPOINTS.ALLERGIES);
  return response.data;
};

/**
 * Add allergy
 * @param {Object} allergyData - Allergy data
 * @param {string} allergyData.allergen - Allergen name
 * @param {string} allergyData.allergy_type - Type (food/drug/environmental/other)
 * @param {string} [allergyData.severity] - Severity (mild/moderate/severe)
 * @param {string} [allergyData.reaction] - Reaction description
 * @param {string} [allergyData.notes] - Notes
 * @returns {Promise<Object>} Created allergy
 */
export const addAllergy = async (allergyData) => {
  const response = await api.post(HEALTH_RECORDS_ENDPOINTS.ALLERGIES, allergyData);
  return response.data;
};

/**
 * Update allergy
 * @param {string|number} allergyId - Allergy ID
 * @param {Object} allergyData - Updated data
 * @returns {Promise<Object>} Updated allergy
 */
export const updateAllergy = async (allergyId, allergyData) => {
  const endpoint = buildEndpoint(HEALTH_RECORDS_ENDPOINTS.ALLERGIES, allergyId);
  const response = await api.put(endpoint, allergyData);
  return response.data;
};

/**
 * Delete allergy
 * @param {string|number} allergyId - Allergy ID
 * @returns {Promise<void>}
 */
export const deleteAllergy = async (allergyId) => {
  const endpoint = buildEndpoint(HEALTH_RECORDS_ENDPOINTS.ALLERGIES, allergyId);
  const response = await api.delete(endpoint);
  return response.data;
};

// ========== Medical Documents ==========

/**
 * Get medical documents
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.document_type] - Document type
 * @param {number} [filters.page] - Page number
 * @param {number} [filters.page_size] - Items per page
 * @returns {Promise<Object>} Paginated documents list
 */
export const getDocuments = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${HEALTH_RECORDS_ENDPOINTS.DOCUMENTS}${queryString}`);
  return response.data;
};

/**
 * Upload medical document
 * @param {Object} documentData - Document data
 * @param {File} documentData.file - File to upload
 * @param {string} documentData.title - Document title
 * @param {string} documentData.document_type - Type (prescription/lab_report/scan/discharge_summary/other)
 * @param {string} [documentData.description] - Description
 * @param {string} [documentData.document_date] - Document date
 * @returns {Promise<Object>} Uploaded document data
 */
export const uploadDocument = async (documentData) => {
  const formData = buildFormData(documentData, ['file', 'title', 'document_type']);

  const response = await api.post(HEALTH_RECORDS_ENDPOINTS.DOCUMENTS, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Delete document
 * @param {string|number} documentId - Document ID
 * @returns {Promise<void>}
 */
export const deleteDocument = async (documentId) => {
  const endpoint = buildEndpoint(HEALTH_RECORDS_ENDPOINTS.DOCUMENTS, documentId);
  const response = await api.delete(endpoint);
  return response.data;
};

// ========== Lab Reports ==========

/**
 * Get lab reports
 * @param {Object} [filters] - Filter options
 * @param {number} [filters.page] - Page number
 * @param {number} [filters.page_size] - Items per page
 * @returns {Promise<Array>} List of lab reports
 */
export const getLabReports = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${HEALTH_RECORDS_ENDPOINTS.LAB_REPORTS}${queryString}`);
  return response.data;
};

// ========== Vaccinations ==========

/**
 * Get vaccination records
 * @returns {Promise<Array>} List of vaccinations
 */
export const getVaccinations = async () => {
  const response = await api.get(HEALTH_RECORDS_ENDPOINTS.VACCINATIONS);
  return response.data;
};

/**
 * Add vaccination record
 * @param {Object} vaccinationData - Vaccination data
 * @param {string} vaccinationData.vaccine_name - Vaccine name
 * @param {string} vaccinationData.vaccination_date - Vaccination date
 * @param {string} [vaccinationData.administered_by] - Administered by
 * @param {string} [vaccinationData.batch_number] - Batch number
 * @param {string} [vaccinationData.next_dose_date] - Next dose date
 * @param {string} [vaccinationData.notes] - Notes
 * @returns {Promise<Object>} Created vaccination record
 */
export const addVaccination = async (vaccinationData) => {
  const response = await api.post(HEALTH_RECORDS_ENDPOINTS.VACCINATIONS, vaccinationData);
  return response.data;
};

// ========== Family History ==========

/**
 * Get family medical history
 * @returns {Promise<Array>} Family medical history
 */
export const getFamilyHistory = async () => {
  const response = await api.get(HEALTH_RECORDS_ENDPOINTS.FAMILY_HISTORY);
  return response.data;
};

/**
 * Add family medical history
 * @param {Object} historyData - History data
 * @param {string} historyData.relationship - Relationship (father/mother/sibling/etc)
 * @param {string} historyData.condition - Medical condition
 * @param {string} [historyData.age_of_onset] - Age of onset
 * @param {string} [historyData.notes] - Notes
 * @returns {Promise<Object>} Created history record
 */
export const addFamilyHistory = async (historyData) => {
  const response = await api.post(HEALTH_RECORDS_ENDPOINTS.FAMILY_HISTORY, historyData);
  return response.data;
};

/**
 * Delete family history record
 * @param {string|number} historyId - History record ID
 * @returns {Promise<void>}
 */
export const deleteFamilyHistory = async (historyId) => {
  const endpoint = buildEndpoint(HEALTH_RECORDS_ENDPOINTS.FAMILY_HISTORY, historyId);
  const response = await api.delete(endpoint);
  return response.data;
};

// ========== Hospitalizations ==========

/**
 * Get hospitalization records
 * @returns {Promise<Array>} List of hospitalizations
 */
export const getHospitalizations = async () => {
  const response = await api.get(HEALTH_RECORDS_ENDPOINTS.HOSPITALIZATIONS);
  return response.data;
};

/**
 * Add hospitalization record
 * @param {Object} hospitalizationData - Hospitalization data
 * @param {string} hospitalizationData.hospital_name - Hospital name
 * @param {string} hospitalizationData.admission_date - Admission date
 * @param {string} [hospitalizationData.discharge_date] - Discharge date
 * @param {string} hospitalizationData.reason - Reason for hospitalization
 * @param {string} [hospitalizationData.treatment] - Treatment received
 * @param {string} [hospitalizationData.notes] - Notes
 * @returns {Promise<Object>} Created hospitalization record
 */
export const addHospitalization = async (hospitalizationData) => {
  const response = await api.post(HEALTH_RECORDS_ENDPOINTS.HOSPITALIZATIONS, hospitalizationData);
  return response.data;
};

// ========== Record Sharing ==========

/**
 * Get shared records
 * @returns {Promise<Array>} List of shared records
 */
export const getSharedRecords = async () => {
  const response = await api.get(HEALTH_RECORDS_ENDPOINTS.SHARING);
  return response.data;
};

/**
 * Share records with doctor
 * @param {Object} shareData - Share data
 * @param {string|number} shareData.doctor_id - Doctor's ID
 * @param {Array<string>} [shareData.record_types] - Types to share (all if not specified)
 * @param {string} [shareData.expires_at] - Expiration date
 * @returns {Promise<Object>} Sharing confirmation
 */
export const shareRecordsWithDoctor = async (shareData) => {
  const response = await api.post(HEALTH_RECORDS_ENDPOINTS.SHARING, shareData);
  return response.data;
};

/**
 * Revoke record sharing
 * @param {string|number} sharingId - Sharing record ID
 * @returns {Promise<void>}
 */
export const revokeSharing = async (sharingId) => {
  const endpoint = buildEndpoint(HEALTH_RECORDS_ENDPOINTS.SHARING, sharingId);
  const response = await api.delete(endpoint);
  return response.data;
};

/**
 * Get accessible patients (for doctors)
 * @returns {Promise<Array>} List of patients who shared records
 */
export const getAccessiblePatients = async () => {
  const endpoint = buildEndpoint(HEALTH_RECORDS_ENDPOINTS.SHARING, null, 'accessible-patients');
  const response = await api.get(endpoint);
  return response.data;
};

// ========== Analytics ==========

/**
 * Get health analytics summary
 * @returns {Promise<Object>} Health analytics data
 */
export const getHealthAnalytics = async () => {
  const endpoint = buildEndpoint(HEALTH_RECORDS_ENDPOINTS.ANALYTICS, null, 'summary');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Health Records service default export
 * Groups all health records-related API methods
 */
export default {
  // Profile
  getHealthProfile,
  updateHealthProfile,
  // Vitals
  getVitals,
  addVitals,
  getLatestVitals,
  // Conditions
  getConditions,
  addCondition,
  updateCondition,
  deleteCondition,
  // Allergies
  getAllergies,
  addAllergy,
  updateAllergy,
  deleteAllergy,
  // Documents
  getDocuments,
  uploadDocument,
  deleteDocument,
  // Lab Reports
  getLabReports,
  // Vaccinations
  getVaccinations,
  addVaccination,
  // Family History
  getFamilyHistory,
  addFamilyHistory,
  deleteFamilyHistory,
  // Hospitalizations
  getHospitalizations,
  addHospitalization,
  // Sharing
  getSharedRecords,
  shareRecordsWithDoctor,
  revokeSharing,
  getAccessiblePatients,
  // Analytics
  getHealthAnalytics,
};