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
 * Get notifications
 * @param {Object} [filters] - Filter options
 * @param {boolean} [filters.unread] - Filter unread only
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
 * Get notification by ID
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
 * @param {Object} markData - Mark data
 * @param {Array<string|number>} [markData.notification_ids] - Specific notification IDs
 * @param {boolean} [markData.mark_all] - Mark all as read
 * @returns {Promise<Object>} Confirmation
 */
export const markAsRead = async (markData) => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.NOTIFICATIONS, null, 'mark-read');
  const response = await api.post(endpoint, markData);
  return response.data;
};

/**
 * Mark single notification as read
 * @param {string|number} notificationId - Notification ID
 * @returns {Promise<Object>} Updated notification
 */
export const markOneAsRead = async (notificationId) => {
  return markAsRead({ notification_ids: [notificationId] });
};

/**
 * Mark all notifications as read
 * @returns {Promise<Object>} Confirmation
 */
export const markAllAsRead = async () => {
  return markAsRead({ mark_all: true });
};

/**
 * Get unread notifications count
 * @returns {Promise<Object>} Count object { count: number }
 */
export const getUnreadCount = async () => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.NOTIFICATIONS, null, 'unread-count');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Delete notification
 * @param {string|number} notificationId - Notification ID
 * @returns {Promise<void>}
 */
export const deleteNotification = async (notificationId) => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.NOTIFICATIONS, notificationId);
  const response = await api.delete(endpoint);
  return response.data;
};

/**
 * Clear all notifications
 * @returns {Promise<Object>} Confirmation
 */
export const clearAllNotifications = async () => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.NOTIFICATIONS, null, 'clear-all');
  const response = await api.post(endpoint);
  return response.data;
};

// ========== Notification Preferences ==========

/**
 * Get notification preferences
 * @returns {Promise<Object>} Notification preferences
 */
export const getPreferences = async () => {
  const response = await api.get(NOTIFICATION_ENDPOINTS.PREFERENCES);
  return response.data;
};

/**
 * Update notification preferences
 * @param {Object} preferencesData - Preferences data
 * @param {boolean} [preferencesData.push_enabled] - Push notifications enabled
 * @param {boolean} [preferencesData.sms_enabled] - SMS notifications enabled
 * @param {boolean} [preferencesData.email_enabled] - Email notifications enabled
 * @param {boolean} [preferencesData.appointment_reminders] - Appointment reminders
 * @param {boolean} [preferencesData.medicine_reminders] - Medicine reminders
 * @param {boolean} [preferencesData.health_tips] - Health tips
 * @param {boolean} [preferencesData.promotional] - Promotional notifications
 * @param {string} [preferencesData.quiet_hours_start] - Quiet hours start (HH:MM)
 * @param {string} [preferencesData.quiet_hours_end] - Quiet hours end (HH:MM)
 * @returns {Promise<Object>} Updated preferences
 */
export const updatePreferences = async (preferencesData) => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.PREFERENCES, null, 'update');
  const response = await api.put(endpoint, preferencesData);
  return response.data;
};

/**
 * Toggle specific notification type
 * @param {string} notificationType - Type to toggle
 * @param {boolean} enabled - Enable or disable
 * @returns {Promise<Object>} Updated preferences
 */
export const toggleNotificationType = async (notificationType, enabled) => {
  return updatePreferences({ [notificationType]: enabled });
};

// ========== Device Registration ==========

/**
 * Register device for push notifications
 * @param {Object} deviceData - Device data
 * @param {string} deviceData.fcm_token - Firebase Cloud Messaging token
 * @param {string} [deviceData.device_type] - Device type (android/ios/web)
 * @param {string} [deviceData.device_name] - Device name
 * @returns {Promise<Object>} Registration confirmation
 */
export const registerDevice = async (deviceData) => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.DEVICE, null, 'register');
  const response = await api.post(endpoint, deviceData);
  return response.data;
};

/**
 * Unregister device
 * @param {string} fcmToken - FCM token to unregister
 * @returns {Promise<Object>} Confirmation
 */
export const unregisterDevice = async (fcmToken) => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.DEVICE, null, 'unregister');
  const response = await api.post(endpoint, { fcm_token: fcmToken });
  return response.data;
};

/**
 * Update device token
 * @param {string} oldToken - Old FCM token
 * @param {string} newToken - New FCM token
 * @returns {Promise<Object>} Confirmation
 */
export const updateDeviceToken = async (oldToken, newToken) => {
  const endpoint = buildEndpoint(NOTIFICATION_ENDPOINTS.DEVICE, null, 'update-token');
  const response = await api.post(endpoint, {
    old_token: oldToken,
    new_token: newToken,
  });
  return response.data;
};

/**
 * Notification service default export
 * Groups all notification-related API methods
 */
export default {
  // Notifications
  getNotifications,
  getNotificationById,
  markAsRead,
  markOneAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  clearAllNotifications,
  // Preferences
  getPreferences,
  updatePreferences,
  toggleNotificationType,
  // Device
  registerDevice,
  unregisterDevice,
  updateDeviceToken,
};