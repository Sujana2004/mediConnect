/**
 * Emergency API Service
 * Handles all emergency-related API calls
 * 
 * Endpoints aligned with backend:
 * - SOSAlertViewSet (trigger, quick-trigger, active, cancel, update-status, history, types, statistics)
 * - EmergencyContactViewSet (CRUD + reorder)
 * - EmergencyServiceViewSet (list, detail, nearby[POST], by-district)
 * - FirstAidGuideViewSet (list, detail, critical, by-category)
 * - EmergencyHelplineViewSet (list, detail, by-type, important)
 * - LocationView (GET, POST)
 * - QuickSOSDataView (GET)
 */

import api from '../../config/api';

// ============================================================================
// ENDPOINT CONSTANTS — match backend urls.py exactly
// ============================================================================

const ENDPOINTS = Object.freeze({
  SOS: '/emergency/sos/',
  CONTACTS: '/emergency/contacts/',
  SERVICES: '/emergency/services/',
  HELPLINES: '/emergency/helplines/',
  FIRST_AID: '/emergency/first-aid/',
  LOCATION: '/emergency/location/',
  QUICK_SOS_DATA: '/emergency/quick-sos-data/',
  HEALTH: '/emergency/health/',
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Sanitizes GPS coordinates to match backend DecimalField constraints.
 * latitude:  max_digits=10, decimal_places=8 (2 integer + 8 decimal)
 * longitude: max_digits=11, decimal_places=8 (3 integer + 8 decimal)
 *
 * @param {Object} data - Object that may contain latitude/longitude
 * @returns {Object} Same object with coordinates rounded to 8 decimal places
 */
const sanitizeCoordinates = (data) => {
  if (!data) return data;
  const sanitized = { ...data };

  if (sanitized.latitude !== null && sanitized.latitude !== undefined) {
    sanitized.latitude = parseFloat(Number(sanitized.latitude).toFixed(8));
  }
  if (sanitized.longitude !== null && sanitized.longitude !== undefined) {
    sanitized.longitude = parseFloat(Number(sanitized.longitude).toFixed(8));
  }

  return sanitized;
};

/**
 * Builds query string from filters object
 * @param {Object} filters - Filter key-value pairs
 * @returns {string} Query string (with leading ? if non-empty)
 */
const buildQueryString = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

/**
 * Constructs endpoint URL with optional ID and action
 * @param {string} base - Base endpoint path
 * @param {string|null} [id] - Optional resource ID
 * @param {string|null} [action] - Optional action suffix
 * @returns {string} Complete endpoint URL
 */
const buildEndpoint = (base, id = null, action = null) => {
  let endpoint = base;
  if (id) endpoint += `${id}/`;
  if (action) endpoint += `${action}/`;
  return endpoint;
};

// ============================================================================
// SOS ALERTS
// Backend: SOSAlertViewSet
// ============================================================================

/**
 * Trigger SOS alert
 * POST /emergency/sos/trigger/
 *
 * @param {Object} sosData
 * @param {string} sosData.emergency_type - medical|accident|heart|breathing|unconscious|bleeding|burn|poison|snake_bite|pregnancy|child|other
 * @param {number} [sosData.latitude]
 * @param {number} [sosData.longitude]
 * @param {number} [sosData.location_accuracy]
 * @param {string} [sosData.description]
 * @returns {Promise<Object>} { success, is_new, message, sos, contacts_notified, nearby_hospitals }
 */
export const triggerSOS = async (sosData) => {
  const endpoint = buildEndpoint(ENDPOINTS.SOS, null, 'trigger');
  const response = await api.post(endpoint, sanitizeCoordinates(sosData));
  return response.data;
};

/**
 * Quick SOS trigger (one-tap, minimal data)
 * POST /emergency/sos/quick-trigger/
 *
 * @param {Object} [data]
 * @param {string} [data.emergency_type] - defaults to 'medical'
 * @param {number} [data.latitude]
 * @param {number} [data.longitude]
 * @param {boolean} [data.use_cached_location] - defaults to true
 * @returns {Promise<Object>} { success, is_new, message, sos_id, status, contacts_notified }
 */
export const quickTriggerSOS = async (data = {}) => {
  const endpoint = buildEndpoint(ENDPOINTS.SOS, null, 'quick-trigger');
  const response = await api.post(endpoint, sanitizeCoordinates(data));
  return response.data;
};

/**
 * Get active SOS alert
 * GET /emergency/sos/active/
 *
 * @returns {Promise<Object>} { success, has_active, sos: {...}|null }
 */
export const getActiveSOS = async () => {
  const endpoint = buildEndpoint(ENDPOINTS.SOS, null, 'active');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Cancel SOS alert
 * POST /emergency/sos/{id}/cancel/
 *
 * @param {string} sosId - SOS alert UUID
 * @param {Object} cancelData
 * @param {string} cancelData.reason - mistake|resolved|help_arrived|other (REQUIRED)
 * @param {string} [cancelData.notes]
 * @returns {Promise<Object>} { success, message, sos }
 */
export const cancelSOS = async (sosId, cancelData) => {
  const endpoint = buildEndpoint(ENDPOINTS.SOS, sosId, 'cancel');
  const response = await api.post(endpoint, cancelData);
  return response.data;
};

/**
 * Update SOS alert status
 * POST /emergency/sos/{id}/update-status/
 *
 * @param {string} sosId - SOS alert UUID
 * @param {Object} statusData
 * @param {string} statusData.status - acknowledged|responding|resolved|false_alarm
 * @param {string} [statusData.acknowledged_by]
 * @param {number} [statusData.responder_eta] - minutes
 * @param {string} [statusData.resolution_notes]
 * @returns {Promise<Object>} { success, message, sos }
 */
export const updateSOSStatus = async (sosId, statusData) => {
  const endpoint = buildEndpoint(ENDPOINTS.SOS, sosId, 'update-status');
  const response = await api.post(endpoint, statusData);
  return response.data;
};

/**
 * Get SOS history
 * GET /emergency/sos/history/
 *
 * @param {Object} [filters]
 * @param {number} [filters.limit] - default 20
 * @param {boolean} [filters.include_active] - default true
 * @returns {Promise<Object>} { success, count, alerts }
 */
export const getSOSHistory = async (filters = {}) => {
  const endpoint = buildEndpoint(ENDPOINTS.SOS, null, 'history');
  const qs = buildQueryString(filters);
  const response = await api.get(`${endpoint}${qs}`);
  return response.data;
};

/**
 * Get emergency types with translations
 * GET /emergency/sos/types/?lang=en
 *
 * @param {string} [lang] - en|te|hi
 * @returns {Promise<Object>} { success, language, types: [{code, name, icon}] }
 */
export const getEmergencyTypes = async (lang = 'en') => {
  const endpoint = buildEndpoint(ENDPOINTS.SOS, null, 'types');
  const qs = buildQueryString({ lang });
  const response = await api.get(`${endpoint}${qs}`);
  return response.data;
};

/**
 * Get SOS statistics
 * GET /emergency/sos/statistics/
 *
 * @returns {Promise<Object>} { success, statistics: { total_sos, resolved, cancelled, ... } }
 */
export const getSOSStatistics = async () => {
  const endpoint = buildEndpoint(ENDPOINTS.SOS, null, 'statistics');
  const response = await api.get(endpoint);
  return response.data;
};

// ============================================================================
// EMERGENCY CONTACTS
// Backend: EmergencyContactViewSet
// ============================================================================

/**
 * Get user's emergency contacts
 * GET /emergency/contacts/
 *
 * @param {Object} [filters]
 * @param {boolean} [filters.is_active]
 * @returns {Promise<Object>} { success, count, contacts }
 */
export const getEmergencyContacts = async (filters = {}) => {
  const qs = buildQueryString(filters);
  const response = await api.get(`${ENDPOINTS.CONTACTS}${qs}`);
  return response.data;
};

/**
 * Add emergency contact
 * POST /emergency/contacts/
 *
 * @param {Object} contactData
 * @param {string} contactData.name
 * @param {string} contactData.phone_number - 10-digit Indian mobile (6-9 start)
 * @param {string} contactData.relationship - spouse|parent|child|sibling|relative|friend|neighbor|doctor|other
 * @param {number} [contactData.priority] - 1 (highest) to 10 (lowest)
 * @param {boolean} [contactData.notify_on_sos]
 * @param {boolean} [contactData.share_location]
 * @returns {Promise<Object>} { success, message, contact }
 */
export const addEmergencyContact = async (contactData) => {
  const response = await api.post(ENDPOINTS.CONTACTS, contactData);
  return response.data;
};

/**
 * Update emergency contact
 * PUT /emergency/contacts/{id}/
 *
 * @param {string} contactId - UUID
 * @param {Object} contactData
 * @returns {Promise<Object>} { success, message, contact }
 */
export const updateEmergencyContact = async (contactId, contactData) => {
  const endpoint = buildEndpoint(ENDPOINTS.CONTACTS, contactId);
  const response = await api.put(endpoint, contactData);
  return response.data;
};

/**
 * Partially update emergency contact
 * PATCH /emergency/contacts/{id}/
 *
 * @param {string} contactId - UUID
 * @param {Object} partialData
 * @returns {Promise<Object>} { success, message, contact }
 */
export const patchEmergencyContact = async (contactId, partialData) => {
  const endpoint = buildEndpoint(ENDPOINTS.CONTACTS, contactId);
  const response = await api.patch(endpoint, partialData);
  return response.data;
};

/**
 * Delete emergency contact
 * DELETE /emergency/contacts/{id}/
 *
 * @param {string} contactId - UUID
 * @returns {Promise<Object>} { success, message }
 */
export const deleteEmergencyContact = async (contactId) => {
  const endpoint = buildEndpoint(ENDPOINTS.CONTACTS, contactId);
  const response = await api.delete(endpoint);
  return response.data;
};

/**
 * Reorder contact priorities
 * POST /emergency/contacts/reorder/
 *
 * @param {Array<{id: string, priority: number}>} contacts
 * @returns {Promise<Object>} { success, message }
 */
export const reorderContacts = async (contacts) => {
  const endpoint = buildEndpoint(ENDPOINTS.CONTACTS, null, 'reorder');
  const response = await api.post(endpoint, { contacts });
  return response.data;
};

// ============================================================================
// EMERGENCY SERVICES (hospitals, ambulances, etc.)
// Backend: EmergencyServiceViewSet (ReadOnly)
// ============================================================================

/**
 * List emergency services
 * GET /emergency/services/?type=hospital&district=...&is_24x7=true&lat=...&lng=...
 *
 * @param {Object} [filters]
 * @param {string} [filters.type]
 * @param {string} [filters.district]
 * @param {boolean} [filters.is_24x7]
 * @param {boolean} [filters.is_government]
 * @param {number} [filters.lat] - for distance calc
 * @param {number} [filters.lng] - for distance calc
 * @returns {Promise<Object>} { success, count, services }
 */
export const listEmergencyServices = async (filters = {}) => {
  const qs = buildQueryString(filters);
  const response = await api.get(`${ENDPOINTS.SERVICES}${qs}`);
  return response.data;
};

/**
 * Get emergency service detail
 * GET /emergency/services/{id}/
 *
 * @param {string} serviceId
 * @returns {Promise<Object>} Service detail
 */
export const getEmergencyService = async (serviceId) => {
  const endpoint = buildEndpoint(ENDPOINTS.SERVICES, serviceId);
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Find nearby emergency services
 * POST /emergency/services/nearby/ (backend uses POST)
 *
 * @param {Object} locationData
 * @param {number} locationData.latitude - REQUIRED
 * @param {number} locationData.longitude - REQUIRED
 * @param {number} [locationData.radius_km] - 1-100, default 10
 * @param {string} [locationData.service_type]
 * @param {boolean} [locationData.only_24x7]
 * @param {boolean} [locationData.only_government]
 * @returns {Promise<Object>} { success, count, search_radius_km, services }
 */
export const getNearbyServices = async (locationData) => {
  const endpoint = buildEndpoint(ENDPOINTS.SERVICES, null, 'nearby');
  const response = await api.post(endpoint, sanitizeCoordinates(locationData));
  return response.data;
};

/**
 * Get services by district
 * GET /emergency/services/by-district/?district=Hyderabad&type=hospital
 *
 * @param {string} district - REQUIRED
 * @param {string} [serviceType]
 * @returns {Promise<Object>} { success, district, count, services }
 */
export const getServicesByDistrict = async (district, serviceType = null) => {
  const endpoint = buildEndpoint(ENDPOINTS.SERVICES, null, 'by-district');
  const qs = buildQueryString({ district, type: serviceType });
  const response = await api.get(`${endpoint}${qs}`);
  return response.data;
};

/**
 * Convenience: Get nearby hospitals
 */
export const getNearbyHospitals = (latitude, longitude, radiusKm = 10) =>
  getNearbyServices({ latitude, longitude, radius_km: radiusKm, service_type: 'hospital' });

/**
 * Convenience: Get nearby ambulances
 */
export const getNearbyAmbulances = (latitude, longitude, radiusKm = 20) =>
  getNearbyServices({ latitude, longitude, radius_km: radiusKm, service_type: 'ambulance' });

/**
 * Convenience: Get nearby pharmacies
 */
export const getNearbyPharmacies = (latitude, longitude, radiusKm = 10) =>
  getNearbyServices({ latitude, longitude, radius_km: radiusKm, service_type: 'pharmacy' });

// ============================================================================
// FIRST AID GUIDES
// Backend: FirstAidGuideViewSet (ReadOnly)
// ============================================================================

/**
 * List first aid guides
 * GET /emergency/first-aid/?category=burns&lang=en
 *
 * @param {Object} [filters]
 * @param {string} [filters.category]
 * @param {string} [filters.lang] - en|te|hi
 * @returns {Promise<Object>} { success, count, categories, guides }
 */
export const getFirstAidGuides = async (filters = {}) => {
  const qs = buildQueryString(filters);
  const response = await api.get(`${ENDPOINTS.FIRST_AID}${qs}`);
  return response.data;
};

/**
 * Get first aid guide detail
 * GET /emergency/first-aid/{id}/?lang=en
 *
 * @param {string} guideId
 * @param {string} [lang]
 * @returns {Promise<Object>} Full guide with steps, donts, etc.
 */
export const getFirstAidGuide = async (guideId, lang = 'en') => {
  const endpoint = buildEndpoint(ENDPOINTS.FIRST_AID, guideId);
  const qs = buildQueryString({ lang });
  const response = await api.get(`${endpoint}${qs}`);
  return response.data;
};

/**
 * Get critical/life-threatening first aid guides
 * GET /emergency/first-aid/critical/?lang=en
 *
 * @param {string} [lang]
 * @returns {Promise<Object>} { success, count, guides }
 */
export const getCriticalFirstAidGuides = async (lang = 'en') => {
  const endpoint = buildEndpoint(ENDPOINTS.FIRST_AID, null, 'critical');
  const qs = buildQueryString({ lang });
  const response = await api.get(`${endpoint}${qs}`);
  return response.data;
};

/**
 * Get first aid guides by category
 * GET /emergency/first-aid/by-category/{category}/?lang=en
 *
 * @param {string} category
 * @param {string} [lang]
 * @returns {Promise<Object>} { success, category, count, guides }
 */
export const getFirstAidByCategory = async (category, lang = 'en') => {
  const endpoint = `${ENDPOINTS.FIRST_AID}by-category/${category}/`;
  const qs = buildQueryString({ lang });
  const response = await api.get(`${endpoint}${qs}`);
  return response.data;
};

// ============================================================================
// EMERGENCY HELPLINES
// Backend: EmergencyHelplineViewSet (ReadOnly)
// ============================================================================

/**
 * List emergency helplines
 * GET /emergency/helplines/?type=ambulance&state=Andhra Pradesh&national_only=true&lang=en
 *
 * @param {Object} [filters]
 * @param {string} [filters.type]
 * @param {string} [filters.state]
 * @param {boolean} [filters.national_only]
 * @param {string} [filters.lang] - en|te|hi
 * @returns {Promise<Object>} { success, count, types, helplines }
 */
export const getHelplines = async (filters = {}) => {
  const qs = buildQueryString(filters);
  const response = await api.get(`${ENDPOINTS.HELPLINES}${qs}`);
  return response.data;
};

/**
 * Get helplines by type
 * GET /emergency/helplines/by-type/{type}/?lang=en
 *
 * @param {string} helplineType
 * @param {string} [lang]
 * @returns {Promise<Object>} { success, type, count, helplines }
 */
export const getHelplinesByType = async (helplineType, lang = 'en') => {
  const endpoint = `${ENDPOINTS.HELPLINES}by-type/${helplineType}/`;
  const qs = buildQueryString({ lang });
  const response = await api.get(`${endpoint}${qs}`);
  return response.data;
};

/**
 * Get important helplines (ambulance, police, fire — national)
 * GET /emergency/helplines/important/?lang=en
 *
 * @param {string} [lang]
 * @returns {Promise<Object>} { success, helplines }
 */
export const getImportantHelplines = async (lang = 'en') => {
  const endpoint = buildEndpoint(ENDPOINTS.HELPLINES, null, 'important');
  const qs = buildQueryString({ lang });
  const response = await api.get(`${endpoint}${qs}`);
  return response.data;
};

// ============================================================================
// LOCATION
// Backend: LocationView
// ============================================================================

/**
 * Get cached user location
 * GET /emergency/location/
 *
 * @returns {Promise<Object>} { success, has_location, location: {...}|null }
 */
export const getCachedLocation = async () => {
  const response = await api.get(ENDPOINTS.LOCATION);
  return response.data;
};

/**
 * Update user location
 * POST /emergency/location/update/
 *
 * @param {Object} locationData
 * @param {number} locationData.latitude
 * @param {number} locationData.longitude
 * @param {number} [locationData.accuracy] - GPS accuracy in meters
 * @param {string} [locationData.address] - reverse geocoded address
 * @returns {Promise<Object>} { success, message, location }
 */
export const updateLocation = async (locationData) => {
  const response = await api.post(
    `${ENDPOINTS.LOCATION}update/`,
    sanitizeCoordinates(locationData)
  );
  return response.data;
};

// ============================================================================
// QUICK SOS DATA (all data in one call)
// Backend: QuickSOSDataView
// ============================================================================

/**
 * Get all SOS screen data in one call
 * GET /emergency/quick-sos-data/?lang=en
 *
 * @param {string} [lang] - en|te|hi
 * @returns {Promise<Object>} { success, language, data }
 */
export const getQuickSOSData = async (lang = 'en') => {
  const qs = buildQueryString({ lang });
  const response = await api.get(`${ENDPOINTS.QUICK_SOS_DATA}${qs}`);
  return response.data;
};

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Health check
 * GET /emergency/health/
 *
 * @returns {Promise<Object>} { status, app, database, data }
 */
export const healthCheck = async () => {
  const response = await api.get(ENDPOINTS.HEALTH);
  return response.data;
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // SOS
  triggerSOS,
  quickTriggerSOS,
  getActiveSOS,
  cancelSOS,
  updateSOSStatus,
  getSOSHistory,
  getEmergencyTypes,
  getSOSStatistics,

  // Contacts
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  patchEmergencyContact,
  deleteEmergencyContact,
  reorderContacts,

  // Emergency Services
  listEmergencyServices,
  getEmergencyService,
  getNearbyServices,
  getServicesByDistrict,
  getNearbyHospitals,
  getNearbyAmbulances,
  getNearbyPharmacies,

  // First Aid
  getFirstAidGuides,
  getFirstAidGuide,
  getCriticalFirstAidGuides,
  getFirstAidByCategory,

  // Helplines
  getHelplines,
  getHelplinesByType,
  getImportantHelplines,

  // Location
  getCachedLocation,
  updateLocation,

  // Quick Data
  getQuickSOSData,

  // Health
  healthCheck,
};