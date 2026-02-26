/**
 * Notification API Service
 * Handles all notification-related API calls
 */

import api from '../../config/api';

/**
 * API endpoint constants
 * @readonly
 */
const NOTIFICATION_ENDPOINTS = Object.freeze({
  NOTIFICATIONS: '/notifications/',
  PREFERENCES: '/notifications/preferences/',
  DEVICE: '/notifications/device/',
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

// ========== Notifications ==========

/**
 * Get notifications (paginated)
 * Backend returns: { count, next, previous, results: [...] }
 * @param {Object} [filters] - Filter options
 * @param {boolean} [filters.unread_only] - Filter unread only
 * @param {string} [filters.type] - Notification type
 * @param {number} [filters.page] - Page number
 * @param {number} [filters.page_size] - Items per page
 * @returns {Promise<Object>} Paginated notifications list
 */
export const getNotifications = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${NOTIFICATION_ENDPOINTS.NOTIFICATIONS}${queryString}`);
  return response.data;
};

/**
 * Get ALL notifications (handles pagination internally)
 * Fetches first page and returns normalized results
 * @param {Object} [filters] - Filter options
 * @returns {Promise<Object>} { results: [...], count, next, previous }
 */
export const getAllNotifications = async (filters = {}) => {
  const queryString = buildQueryString({ page_size: 50, ...filters });
  const response = await api.get(`${NOTIFICATION_ENDPOINTS.NOTIFICATIONS}${queryString}`);
  return response.data;
};

/**
 * Get notification by ID
 * Backend returns: { success, notification: {...} }
 * @param {string|number} notificationId - Notification ID
 * @returns {Promise<Object>} Notification details
 */
export const getNotificationById = async (notificationId) => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.NOTIFICATIONS, notificationId);
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Mark notifications as read
 * Backend endpoint: POST /notifications/mark-read/
 * Backend expects: { notification_ids: [...] } or empty for mark all
 * @param {Array<string>} [notificationIds] - Specific notification IDs (empty = mark all)
 * @returns {Promise<Object>} Confirmation
 */
export const markAsRead = async (notificationIds = []) => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.NOTIFICATIONS, null, 'mark-read');
  const payload = notificationIds.length > 0
    ? { notification_ids: notificationIds }
    : {};
  const response = await api.post(endpoint, payload);
  return response.data;
};

/**
 * Mark single notification as read
 * Backend endpoint: POST /notifications/<id>/read/
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} Updated notification
 */
export const markOneAsRead = async (notificationId) => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.NOTIFICATIONS, notificationId, 'read');
  const response = await api.post(endpoint);
  return response.data;
};

/**
 * Mark all notifications as read
 * Backend endpoint: POST /notifications/mark-read/ with empty body
 * @returns {Promise<Object>} Confirmation
 */
export const markAllAsRead = async () => {
  return markAsRead([]);
};

/**
 * Get unread notifications count
 * Backend returns: { success, unread_count: number }
 * @returns {Promise<Object>} Count object
 */
export const getUnreadCount = async () => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.NOTIFICATIONS, null, 'unread-count');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Delete notification
 * Backend endpoint: DELETE /notifications/<id>/delete/
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>}
 */
export const deleteNotification = async (notificationId) => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.NOTIFICATIONS, notificationId, 'delete');
  const response = await api.delete(endpoint);
  return response.data;
};

/**
 * Clear all notifications
 * Backend endpoint: DELETE /notifications/clear/
 * @param {boolean} [readOnly=false] - Only clear read notifications
 * @returns {Promise<Object>} Confirmation
 */
export const clearAllNotifications = async (readOnly = false) => {
  const queryString = readOnly ? '?read_only=true' : '';
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.NOTIFICATIONS, null, 'clear');
  const response = await api.delete(`${endpoint}${queryString}`);
  return response.data;
};

/**
 * Get notification stats
 * Backend returns: { success, stats: {...} }
 * @returns {Promise<Object>} Notification statistics
 */
export const getNotificationStats = async () => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.NOTIFICATIONS, null, 'stats');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Send test notification
 * Backend endpoint: POST /notifications/test/
 * @returns {Promise<Object>} Test notification result
 */
export const sendTestNotification = async () => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.NOTIFICATIONS, null, 'test');
  const response = await api.post(endpoint);
  return response.data;
};

// ========== Notification Preferences ==========

/**
 * Get notification preferences
 * Backend returns: { success, preferences: {...}, notification_types: [...] }
 * @returns {Promise<Object>} Notification preferences
 */
export const getPreferences = async () => {
  const response = await api.get(NOTIFICATION_ENDPOINTS.PREFERENCES);
  return response.data;
};

/**
 * Update notification preferences
 * Backend endpoint: PUT/PATCH /notifications/preferences/update/
 * @param {Object} preferencesData - Preferences to update
 * @returns {Promise<Object>} Updated preferences
 */
export const updatePreferences = async (preferencesData) => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.PREFERENCES, null, 'update');
  const response = await api.patch(endpoint, preferencesData);
  return response.data;
};

/**
 * Update specific notification type preference
 * Backend endpoint: POST /notifications/preferences/type/
 * Backend expects: { notification_type: string, enabled: boolean }
 * @param {string} notificationType - Type to toggle
 * @param {boolean} enabled - Enable or disable
 * @returns {Promise<Object>} Updated preferences
 */
export const toggleNotificationType = async (notificationType, enabled) => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.PREFERENCES, null, 'type');
  const response = await api.post(endpoint, {
    notification_type: notificationType,
    enabled,
  });
  return response.data;
};

/**
 * Update quiet hours
 * Backend endpoint: POST /notifications/preferences/quiet-hours/
 * @param {Object} quietHoursData - { enabled, start_time, end_time }
 * @returns {Promise<Object>} Updated quiet hours
 */
export const updateQuietHours = async (quietHoursData) => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.PREFERENCES, null, 'quiet-hours');
  const response = await api.post(endpoint, quietHoursData);
  return response.data;
};

// ========== Device Registration ==========

/**
 * Register device for push notifications
 * Backend endpoint: POST /notifications/device/register/
 * Backend expects: { token, device_type, device_name, device_id }
 * @param {Object} deviceData - Device data
 * @param {string} deviceData.token - Firebase Cloud Messaging token
 * @param {string} [deviceData.device_type] - Device type (android/ios/web)
 * @param {string} [deviceData.device_name] - Device name
 * @param {string} [deviceData.device_id] - Device ID
 * @returns {Promise<Object>} Registration confirmation
 */
export const registerDevice = async (deviceData) => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.DEVICE, null, 'register');
  const response = await api.post(endpoint, deviceData);
  return response.data;
};

/**
 * Unregister device
 * Backend endpoint: POST /notifications/device/unregister/
 * Backend expects: { token: string }
 * @param {string} token - FCM token to unregister
 * @returns {Promise<Object>} Confirmation
 */
export const unregisterDevice = async (token) => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.DEVICE, null, 'unregister');
  const response = await api.post(endpoint, { token });
  return response.data;
};

/**
 * List registered devices
 * Backend endpoint: GET /notifications/devices/
 * @returns {Promise<Object>} Device list
 */
export const listDevices = async () => {
  const response = await api.get('/notifications/devices/');
  return response.data;
};

/**
 * Notification service default export
 * Groups all notification-related API methods
 */
export default {
  // Notifications
  getNotifications,
  getAllNotifications,
  getNotificationById,
  markAsRead,
  markOneAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  clearAllNotifications,
  getNotificationStats,
  sendTestNotification,
  // Preferences
  getPreferences,
  updatePreferences,
  toggleNotificationType,
  updateQuietHours,
  // Device
  registerDevice,
  unregisterDevice,
  listDevices,
};
