/**
 * Emergency API Service
 * Handles all emergency-related API calls including SOS and first aid
 */

import api from '../../config/api';

/**
 * API endpoint constants
 * @readonly
 */
const EMERGENCY_ENDPOINTS = Object.freeze({
  SOS: '/emergency/sos/',
  CONTACTS: '/emergency/contacts/',
  SERVICES: '/emergency/services/',
  HELPLINES: '/emergency/helplines/',
  FIRST_AID: '/emergency/first-aid/',
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

// ========== SOS Alerts ==========

/**
 * Trigger SOS alert
 * @param {Object} sosData - SOS data
 * @param {string} sosData.emergency_type - Type (medical/accident/fire/other)
 * @param {number} [sosData.latitude] - GPS latitude
 * @param {number} [sosData.longitude] - GPS longitude
 * @param {string} [sosData.description] - Description of emergency
 * @param {string} [sosData.address] - Location address
 * @returns {Promise<Object>} SOS alert data
 */
export const triggerSOS = async (sosData) => {
  const endpoint = buildEndpoint(EMERGENCY_ENDPOINTS.SOS, null, 'trigger');
  const response = await api.post(endpoint, sosData);
  return response.data;
};

/**
 * Quick SOS trigger (minimal data)
 * @param {Object} [quickData] - Minimal SOS data
 * @param {number} [quickData.latitude] - GPS latitude
 * @param {number} [quickData.longitude] - GPS longitude
 * @returns {Promise<Object>} SOS alert data
 */
export const quickTriggerSOS = async (quickData = {}) => {
  const endpoint = buildEndpoint(EMERGENCY_ENDPOINTS.SOS, null, 'quick-trigger');
  const response = await api.post(endpoint, quickData);
  return response.data;
};

/**
 * Get active SOS alert
 * @returns {Promise<Object|null>} Active SOS alert or null
 */
export const getActiveSOS = async () => {
  const endpoint = buildEndpoint(EMERGENCY_ENDPOINTS.SOS, null, 'active');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Cancel SOS alert
 * @param {string|number} sosId - SOS alert ID
 * @param {Object} [cancelData] - Cancellation data
 * @param {string} [cancelData.reason] - Reason for cancellation
 * @returns {Promise<Object>} Cancelled SOS data
 */
export const cancelSOS = async (sosId, cancelData = {}) => {
  const endpoint = buildEndpoint(EMERGENCY_ENDPOINTS.SOS, sosId, 'cancel');
  const response = await api.post(endpoint, cancelData);
  return response.data;
};

/**
 * Get SOS history
 * @param {Object} [filters] - Filter options
 * @param {number} [filters.page] - Page number
 * @param {number} [filters.page_size] - Items per page
 * @returns {Promise<Object>} Paginated SOS history
 */
export const getSOSHistory = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${EMERGENCY_ENDPOINTS.SOS}${queryString}`);
  return response.data;
};

// ========== Emergency Contacts ==========

/**
 * Get emergency contacts
 * @returns {Promise<Array>} List of emergency contacts
 */
export const getEmergencyContacts = async () => {
  const response = await api.get(EMERGENCY_ENDPOINTS.CONTACTS);
  return response.data;
};

/**
 * Add emergency contact
 * @param {Object} contactData - Contact data
 * @param {string} contactData.name - Contact name
 * @param {string} contactData.phone - Phone number
 * @param {string} contactData.relationship - Relationship
 * @param {boolean} [contactData.is_primary] - Is primary contact
 * @param {boolean} [contactData.notify_on_sos] - Notify on SOS
 * @returns {Promise<Object>} Created contact
 */
export const addEmergencyContact = async (contactData) => {
  const response = await api.post(EMERGENCY_ENDPOINTS.CONTACTS, contactData);
  return response.data;
};

/**
 * Update emergency contact
 * @param {string|number} contactId - Contact ID
 * @param {Object} contactData - Updated data
 * @returns {Promise<Object>} Updated contact
 */
export const updateEmergencyContact = async (contactId, contactData) => {
  const endpoint = buildEndpoint(EMERGENCY_ENDPOINTS.CONTACTS, contactId);
  const response = await api.put(endpoint, contactData);
  return response.data;
};

/**
 * Delete emergency contact
 * @param {string|number} contactId - Contact ID
 * @returns {Promise<void>}
 */
export const deleteEmergencyContact = async (contactId) => {
  const endpoint = buildEndpoint(EMERGENCY_ENDPOINTS.CONTACTS, contactId);
  const response = await api.delete(endpoint);
  return response.data;
};

/**
 * Set primary emergency contact
 * @param {string|number} contactId - Contact ID
 * @returns {Promise<Object>} Updated contact
 */
export const setPrimaryContact = async (contactId) => {
  const endpoint = buildEndpoint(EMERGENCY_ENDPOINTS.CONTACTS, contactId, 'set-primary');
  const response = await api.post(endpoint);
  return response.data;
};

// ========== Nearby Services ==========

/**
 * Get nearby emergency services
 * @param {Object} locationData - Location data
 * @param {number} locationData.latitude - GPS latitude
 * @param {number} locationData.longitude - GPS longitude
 * @param {number} [locationData.radius_km] - Search radius in km (default: 10)
 * @param {string} [locationData.service_type] - Type (hospital/ambulance/pharmacy/blood_bank)
 * @returns {Promise<Array>} List of nearby services
 */
export const getNearbyServices = async (locationData) => {
  const queryString = buildQueryString(locationData);
  const endpoint = buildEndpoint(EMERGENCY_ENDPOINTS.SERVICES, null, 'nearby');
  const response = await api.get(`${endpoint}${queryString}`);
  return response.data;
};

/**
 * Get nearby hospitals
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @param {number} [radiusKm] - Search radius
 * @returns {Promise<Array>} List of nearby hospitals
 */
export const getNearbyHospitals = async (latitude, longitude, radiusKm = 10) => {
  return getNearbyServices({
    latitude,
    longitude,
    radius_km: radiusKm,
    service_type: 'hospital',
  });
};

/**
 * Get nearby ambulance services
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @param {number} [radiusKm] - Search radius
 * @returns {Promise<Array>} List of nearby ambulance services
 */
export const getNearbyAmbulances = async (latitude, longitude, radiusKm = 10) => {
  return getNearbyServices({
    latitude,
    longitude,
    radius_km: radiusKm,
    service_type: 'ambulance',
  });
};

/**
 * Get nearby pharmacies
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @param {number} [radiusKm] - Search radius
 * @returns {Promise<Array>} List of nearby pharmacies
 */
export const getNearbyPharmacies = async (latitude, longitude, radiusKm = 10) => {
  return getNearbyServices({
    latitude,
    longitude,
    radius_km: radiusKm,
    service_type: 'pharmacy',
  });
};

// ========== Emergency Helplines ==========

/**
 * Get emergency helplines
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.state] - Filter by state
 * @param {string} [filters.category] - Category (medical/police/fire/women/child)
 * @returns {Promise<Array>} List of helplines
 */
export const getHelplines = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${EMERGENCY_ENDPOINTS.HELPLINES}${queryString}`);
  return response.data;
};

/**
 * Get national helplines
 * @returns {Promise<Array>} List of national helplines
 */
export const getNationalHelplines = async () => {
  const endpoint = buildEndpoint(EMERGENCY_ENDPOINTS.HELPLINES, null, 'national');
  const response = await api.get(endpoint);
  return response.data;
};

// ========== First Aid Guides ==========

/**
 * Get first aid guides
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.category] - Category filter
 * @param {string} [filters.language] - Language code
 * @param {string} [filters.search] - Search query
 * @returns {Promise<Array>} List of first aid guides
 */
export const getFirstAidGuides = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${EMERGENCY_ENDPOINTS.FIRST_AID}${queryString}`);
  return response.data;
};

/**
 * Get first aid guide by ID
 * @param {string|number} guideId - Guide ID
 * @param {string} [language] - Language code
 * @returns {Promise<Object>} First aid guide details
 */
export const getFirstAidGuideById = async (guideId, language = 'en') => {
  const queryString = buildQueryString({ language });
  const endpoint = buildEndpoint(EMERGENCY_ENDPOINTS.FIRST_AID, guideId);
  const response = await api.get(`${endpoint}${queryString}`);
  return response.data;
};

/**
 * Get first aid categories
 * @returns {Promise<Array>} List of categories
 */
export const getFirstAidCategories = async () => {
  const endpoint = buildEndpoint(EMERGENCY_ENDPOINTS.FIRST_AID, null, 'categories');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Search first aid guides
 * @param {string} query - Search query
 * @param {string} [language] - Language code
 * @returns {Promise<Array>} Matching guides
 */
export const searchFirstAidGuides = async (query, language = 'en') => {
  const queryString = buildQueryString({ q: query, language });
  const endpoint = buildEndpoint(EMERGENCY_ENDPOINTS.FIRST_AID, null, 'search');
  const response = await api.get(`${endpoint}${queryString}`);
  return response.data;
};

/**
 * Emergency service default export
 * Groups all emergency-related API methods
 */
export default {
  // SOS
  triggerSOS,
  quickTriggerSOS,
  getActiveSOS,
  cancelSOS,
  getSOSHistory,
  // Contacts
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  setPrimaryContact,
  // Nearby Services
  getNearbyServices,
  getNearbyHospitals,
  getNearbyAmbulances,
  getNearbyPharmacies,
  // Helplines
  getHelplines,
  getNationalHelplines,
  // First Aid
  getFirstAidGuides,
  getFirstAidGuideById,
  getFirstAidCategories,
  searchFirstAidGuides,
};