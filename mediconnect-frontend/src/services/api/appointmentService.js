/**
 * Appointment API Service
 * Handles all appointment-related API calls
 */

import api from '../../config/api';

/**
 * API endpoint constants
 * @readonly
 */
const APPOINTMENT_ENDPOINTS = Object.freeze({
  APPOINTMENTS: '/appointments/appointments/',
  AVAILABLE_SLOTS: '/appointments/available-slots/',
  SCHEDULES: '/appointments/schedules/',
  QUEUE: '/appointments/queue/',
  EXCEPTIONS: '/appointments/exceptions/',
});

/**
 * Builds query string from filters object
 * @param {Object} filters - Filter key-value pairs
 * @returns {string} Query string (without leading ?)
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
 * Constructs endpoint URL with optional ID
 * @param {string} baseEndpoint - Base endpoint path
 * @param {string|number} [id] - Optional resource ID
 * @param {string} [action] - Optional action suffix
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
 * Get list of appointments
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.status] - Filter by status (scheduled/confirmed/completed/cancelled)
 * @param {string} [filters.date] - Filter by date (YYYY-MM-DD)
 * @param {string} [filters.start_date] - Start date range
 * @param {string} [filters.end_date] - End date range
 * @param {number} [filters.page] - Page number
 * @param {number} [filters.page_size] - Items per page
 * @returns {Promise<Object>} Paginated list of appointments
 */
export const getAppointments = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${APPOINTMENT_ENDPOINTS.APPOINTMENTS}${queryString}`);
  return response.data;
};

/**
 * Get appointment by ID
 * @param {string|number} appointmentId - Appointment ID
 * @returns {Promise<Object>} Appointment details
 */
export const getAppointmentById = async (appointmentId) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, appointmentId);
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Create a new appointment
 * @param {Object} appointmentData - Appointment data
 * @param {string|number} appointmentData.doctor_id - Doctor's ID
 * @param {string} appointmentData.date - Appointment date (YYYY-MM-DD)
 * @param {string} appointmentData.time_slot - Time slot (HH:MM)
 * @param {string} appointmentData.consultation_type - Type (video/audio/in_person)
 * @param {string} [appointmentData.reason] - Reason for appointment
 * @param {string} [appointmentData.symptoms] - Symptoms description
 * @returns {Promise<Object>} Created appointment data
 */
export const createAppointment = async (appointmentData) => {
  const response = await api.post(APPOINTMENT_ENDPOINTS.APPOINTMENTS, appointmentData);
  return response.data;
};

/**
 * Cancel an appointment
 * @param {string|number} appointmentId - Appointment ID
 * @param {string} [reason] - Cancellation reason
 * @returns {Promise<Object>} Cancelled appointment data
 */
export const cancelAppointment = async (appointmentId, reason = '') => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, appointmentId, 'cancel');
  const response = await api.post(endpoint, { reason });
  return response.data;
};

/**
 * Reschedule an appointment
 * @param {string|number} appointmentId - Appointment ID
 * @param {Object} rescheduleData - New schedule data
 * @param {string} rescheduleData.date - New date (YYYY-MM-DD)
 * @param {string} rescheduleData.time_slot - New time slot (HH:MM)
 * @returns {Promise<Object>} Rescheduled appointment data
 */
export const rescheduleAppointment = async (appointmentId, rescheduleData) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, appointmentId, 'reschedule');
  const response = await api.post(endpoint, rescheduleData);
  return response.data;
};

/**
 * Patient check-in for appointment
 * @param {string|number} appointmentId - Appointment ID
 * @returns {Promise<Object>} Updated appointment data
 */
export const checkInAppointment = async (appointmentId) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, appointmentId, 'check_in');
  const response = await api.post(endpoint);
  return response.data;
};

/**
 * Doctor confirms appointment
 * @param {string|number} appointmentId - Appointment ID
 * @returns {Promise<Object>} Confirmed appointment data
 */
export const confirmAppointment = async (appointmentId) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, appointmentId, 'confirm');
  const response = await api.post(endpoint);
  return response.data;
};

/**
 * Start consultation for appointment
 * @param {string|number} appointmentId - Appointment ID
 * @returns {Promise<Object>} Started appointment data
 */
export const startAppointment = async (appointmentId) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, appointmentId, 'start');
  const response = await api.post(endpoint);
  return response.data;
};

/**
 * Complete consultation for appointment
 * @param {string|number} appointmentId - Appointment ID
 * @param {Object} [completionData] - Completion data
 * @param {string} [completionData.notes] - Doctor's notes
 * @returns {Promise<Object>} Completed appointment data
 */
export const completeAppointment = async (appointmentId, completionData = {}) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, appointmentId, 'complete');
  const response = await api.post(endpoint, completionData);
  return response.data;
};

/**
 * Get today's appointments (for doctors)
 * @returns {Promise<Array>} List of today's appointments
 */
export const getTodayAppointments = async () => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, null, 'today');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Get today's summary stats (for doctors)
 * @returns {Promise<Object>} Summary statistics
 */
export const getTodaySummary = async () => {
  const response = await api.get(`${APPOINTMENT_ENDPOINTS.APPOINTMENTS}today_summary/`);
  return response.data;
};

/**
 * Get upcoming appointments
 * @returns {Promise<Array>} List of upcoming appointments
 */
export const getUpcomingAppointments = async () => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, null, 'upcoming');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Get available slots for a doctor on a specific date
 * @param {string|number} doctorId - Doctor's ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {Promise<Array>} List of available time slots
 */
export const getAvailableSlots = async (doctorId, date) => {
  const queryString = buildQueryString({ date });
  const response = await api.get(
    `${APPOINTMENT_ENDPOINTS.AVAILABLE_SLOTS}${doctorId}/${queryString}`
  );
  return response.data;
};

// ========== Schedule Management (Doctor) ==========

/**
 * Get doctor's schedules
 * @returns {Promise<Array>} List of schedules
 */
export const getSchedules = async () => {
  const response = await api.get(APPOINTMENT_ENDPOINTS.SCHEDULES);
  return response.data;
};

/**
 * Create a schedule
 * @param {Object} scheduleData - Schedule data
 * @param {number} scheduleData.day_of_week - Day of week (0-6, 0=Monday)
 * @param {string} scheduleData.start_time - Start time (HH:MM)
 * @param {string} scheduleData.end_time - End time (HH:MM)
 * @param {number} scheduleData.slot_duration - Slot duration in minutes
 * @param {number} [scheduleData.max_patients] - Max patients per slot
 * @param {boolean} [scheduleData.is_active] - Is schedule active
 * @returns {Promise<Object>} Created schedule data
 */
export const createSchedule = async (scheduleData) => {
  const response = await api.post(APPOINTMENT_ENDPOINTS.SCHEDULES, scheduleData);
  return response.data;
};

/**
 * Bulk update weekly schedule
 * @param {Array<Object>} schedules - Array of schedule objects
 * @returns {Promise<Object>} Updated schedules
 */
export const bulkUpdateSchedules = async (schedules) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.SCHEDULES, null, 'bulk_update');
  const response = await api.post(endpoint, { schedules });
  return response.data;
};

/**
 * Update a schedule
 * @param {string|number} scheduleId - Schedule ID
 * @param {Object} scheduleData - Updated schedule data
 * @returns {Promise<Object>} Updated schedule data
 */
export const updateSchedule = async (scheduleId, scheduleData) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.SCHEDULES, scheduleId);
  const response = await api.put(endpoint, scheduleData);
  return response.data;
};

/**
 * Delete a schedule
 * @param {string|number} scheduleId - Schedule ID
 * @returns {Promise<void>}
 */
export const deleteSchedule = async (scheduleId) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.SCHEDULES, scheduleId);
  const response = await api.delete(endpoint);
  return response.data;
};

// ========== Queue Management (Doctor) ==========

/**
 * Get queue list
 * @returns {Promise<Array>} Queue list
 */
export const getQueue = async () => {
  const response = await api.get(APPOINTMENT_ENDPOINTS.QUEUE);
  return response.data;
};

/**
 * Get waiting queue
 * @returns {Promise<Array>} Waiting queue list
 */
export const getWaitingQueue = async () => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.QUEUE, null, 'waiting');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Call next patient in queue
 * @returns {Promise<Object>} Next patient data
 */
export const callNextPatient = async () => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.QUEUE, null, 'call_next');
  const response = await api.post(endpoint);
  return response.data;
};

/**
 * Perform action on queue item
 * @param {string|number} queueId - Queue item ID
 * @param {string} action - Action (call/start/complete/skip)
 * @returns {Promise<Object>} Updated queue item
 */
export const performQueueAction = async (queueId, action) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.QUEUE, queueId, 'perform-action');
  const response = await api.post(endpoint, { action });
  return response.data;
};

// ========== Schedule Exceptions (Leaves) ==========

/**
 * Get schedule exceptions (leaves)
 * @returns {Promise<Array>} List of exceptions
 */
export const getExceptions = async () => {
  const response = await api.get(APPOINTMENT_ENDPOINTS.EXCEPTIONS);
  return response.data;
};

/**
 * Add leave/exception
 * @param {Object} leaveData - Leave data
 * @param {string} leaveData.start_date - Start date (YYYY-MM-DD)
 * @param {string} leaveData.end_date - End date (YYYY-MM-DD)
 * @param {string} [leaveData.reason] - Reason for leave
 * @param {boolean} [leaveData.is_full_day] - Is full day leave
 * @param {string} [leaveData.start_time] - Start time if partial day
 * @param {string} [leaveData.end_time] - End time if partial day
 * @returns {Promise<Object>} Created exception data
 */
export const addLeave = async (leaveData) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.EXCEPTIONS, null, 'add_leave');
  const response = await api.post(endpoint, leaveData);
  return response.data;
};

/**
 * Delete an exception
 * @param {string|number} exceptionId - Exception ID
 * @returns {Promise<void>}
 */
export const deleteException = async (exceptionId) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.EXCEPTIONS, exceptionId);
  const response = await api.delete(endpoint);
  return response.data;
};

/**
 * Appointment service default export
 * Groups all appointment-related API methods
 */
export default {
  // Appointments
  getAppointments,
  getAppointmentById,
  createAppointment,
  cancelAppointment,
  rescheduleAppointment,
  checkInAppointment,
  confirmAppointment,
  startAppointment,
  completeAppointment,
  getTodayAppointments,
  getTodaySummary,
  getUpcomingAppointments,
  getAvailableSlots,
  // Schedules
  getSchedules,
  createSchedule,
  bulkUpdateSchedules,
  updateSchedule,
  deleteSchedule,
  // Queue
  getQueue,
  getWaitingQueue,
  callNextPatient,
  performQueueAction,
  // Exceptions
  getExceptions,
  addLeave,
  deleteException,
};