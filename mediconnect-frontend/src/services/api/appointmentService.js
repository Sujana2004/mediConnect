/**
 * Appointment API Service
 * Handles all appointment-related API calls
 * 
 * Compatible with MediConnect Django Backend
 * Backend: appointments app (models, views, serializers, urls)
 */

import api from '../../config/api';

/**
 * API endpoint constants matching backend urls.py
 * @readonly
 */
const APPOINTMENT_ENDPOINTS = Object.freeze({
  APPOINTMENTS: '/appointments/appointments/',
  AVAILABLE_SLOTS: '/appointments/available-slots/',
  GENERATE_SLOTS: '/appointments/generate-slots/',
  SCHEDULES: '/appointments/schedules/',
  QUEUE: '/appointments/queue/',
  EXCEPTIONS: '/appointments/exceptions/',
  CHECK_IN: '/appointments/check-in/',
  AVAILABILITY: '/appointments/availability/',
  QUICK_DATA: '/appointments/quick-data/',
  HEALTH: '/appointments/health/',
});

/**
 * Builds query string from filters object
 * @param {Object} filters - Filter key-value pairs
 * @returns {string} Query string (with leading ? if non-empty)
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
 * @param {string|null} [id] - Optional resource ID (UUID)
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

// =============================================================================
// APPOINTMENT CRUD & ACTIONS
// =============================================================================

/**
 * Get list of appointments with optional filters
 * 
 * Backend supported filters:
 * - status: pending|confirmed|checked_in|in_progress|completed|cancelled|no_show|rescheduled
 * - date: YYYY-MM-DD (specific date)
 * - upcoming: true (upcoming only, excludes cancelled/completed/no_show)
 * 
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.status] - Filter by appointment status
 * @param {string} [filters.date] - Filter by specific date (YYYY-MM-DD)
 * @param {boolean} [filters.upcoming] - Show upcoming only
 * @returns {Promise<Object>} { success, count, data: Appointment[] }
 */
export const getAppointments = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${APPOINTMENT_ENDPOINTS.APPOINTMENTS}${queryString}`);
  return response.data;
};

/**
 * Get appointment by ID
 * @param {string} appointmentId - Appointment UUID
 * @returns {Promise<Object>} { success, data: Appointment }
 */
export const getAppointmentById = async (appointmentId) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, appointmentId);
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Create a new appointment
 * 
 * Backend AppointmentCreateSerializer fields:
 * - doctor_id (UUID, required)
 * - appointment_date (YYYY-MM-DD, required)
 * - start_time (HH:MM:SS or HH:MM, required)
 * - time_slot_id (UUID, optional - if using slot-based booking)
 * - booking_type (online|walk_in|phone|follow_up, default: online)
 * - reason (string, optional)
 * - symptoms (string, optional)
 * - patient_notes (string, optional)
 * 
 * @param {Object} appointmentData - Appointment data
 * @param {string} appointmentData.doctor_id - Doctor's UUID
 * @param {string} appointmentData.appointment_date - Date (YYYY-MM-DD)
 * @param {string} appointmentData.start_time - Start time (HH:MM)
 * @param {string} [appointmentData.time_slot_id] - TimeSlot UUID (optional)
 * @param {string} [appointmentData.booking_type] - Booking type (default: online)
 * @param {string} [appointmentData.reason] - Reason for appointment
 * @param {string} [appointmentData.symptoms] - Symptoms description
 * @param {string} [appointmentData.patient_notes] - Patient notes
 * @returns {Promise<Object>} { success, message, data: Appointment }
 */
export const createAppointment = async (appointmentData) => {
  const payload = {
    doctor_id: appointmentData.doctor_id,
    appointment_date: appointmentData.appointment_date,
    start_time: appointmentData.start_time,
    ...(appointmentData.time_slot_id && { time_slot_id: appointmentData.time_slot_id }),
    ...(appointmentData.booking_type && { booking_type: appointmentData.booking_type }),
    ...(appointmentData.reason && { reason: appointmentData.reason }),
    ...(appointmentData.symptoms && { symptoms: appointmentData.symptoms }),
    ...(appointmentData.patient_notes && { patient_notes: appointmentData.patient_notes }),
  };

  const response = await api.post(APPOINTMENT_ENDPOINTS.APPOINTMENTS, payload);
  return response.data;
};

/**
 * Update appointment details (reason, symptoms, patient_notes only)
 * 
 * Backend AppointmentUpdateSerializer fields:
 * - reason
 * - symptoms
 * - patient_notes
 * 
 * @param {string} appointmentId - Appointment UUID
 * @param {Object} updateData - Fields to update
 * @param {string} [updateData.reason] - Updated reason
 * @param {string} [updateData.symptoms] - Updated symptoms
 * @param {string} [updateData.patient_notes] - Updated patient notes
 * @returns {Promise<Object>} { success, message, data: Appointment }
 */
export const updateAppointment = async (appointmentId, updateData) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, appointmentId);
  const response = await api.patch(endpoint, updateData);
  return response.data;
};

/**
 * Cancel an appointment
 * 
 * Backend AppointmentCancelSerializer:
 * - reason (string, optional)
 * Backend auto-determines cancelled_by from user role
 * 
 * @param {string} appointmentId - Appointment UUID
 * @param {string} [reason] - Cancellation reason
 * @returns {Promise<Object>} { success, message, data: Appointment }
 */
export const cancelAppointment = async (appointmentId, reason = '') => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, appointmentId, 'cancel');
  const response = await api.post(endpoint, { reason });
  return response.data;
};

/**
 * Reschedule an appointment
 * 
 * Backend AppointmentRescheduleSerializer:
 * - new_date (YYYY-MM-DD, required)
 * - new_time (HH:MM, required)
 * - time_slot_id (UUID, optional)
 * - reason (string, optional)
 * 
 * @param {string} appointmentId - Appointment UUID
 * @param {Object} rescheduleData - Reschedule details
 * @param {string} rescheduleData.new_date - New date (YYYY-MM-DD)
 * @param {string} rescheduleData.new_time - New time (HH:MM)
 * @param {string} [rescheduleData.time_slot_id] - New TimeSlot UUID
 * @param {string} [rescheduleData.reason] - Reason for rescheduling
 * @returns {Promise<Object>} { success, message, data: Appointment }
 */
export const rescheduleAppointment = async (appointmentId, rescheduleData) => {
  const payload = {
    new_date: rescheduleData.new_date,
    new_time: rescheduleData.new_time,
    ...(rescheduleData.time_slot_id && { time_slot_id: rescheduleData.time_slot_id }),
    ...(rescheduleData.reason && { reason: rescheduleData.reason }),
  };

  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, appointmentId, 'reschedule');
  const response = await api.post(endpoint, payload);
  return response.data;
};

/**
 * Patient check-in for appointment (via appointment action)
 * 
 * This uses the appointment's check_in action endpoint.
 * Backend creates a queue entry and returns it.
 * 
 * @param {string} appointmentId - Appointment UUID
 * @returns {Promise<Object>} { success, message, data: AppointmentQueue }
 */
export const checkInAppointment = async (appointmentId) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, appointmentId, 'check_in');
  const response = await api.post(endpoint);
  return response.data;
};

/**
 * Patient check-in via dedicated check-in endpoint
 * 
 * Backend CheckInSerializer:
 * - appointment_id (UUID, required)
 * 
 * @param {string} appointmentId - Appointment UUID
 * @returns {Promise<Object>} { success, message, data: AppointmentQueue }
 */
export const checkInViaEndpoint = async (appointmentId) => {
  const response = await api.post(APPOINTMENT_ENDPOINTS.CHECK_IN, {
    appointment_id: appointmentId,
  });
  return response.data;
};

/**
 * Doctor confirms appointment
 * @param {string} appointmentId - Appointment UUID
 * @returns {Promise<Object>} { success, message, data: Appointment }
 */
export const confirmAppointment = async (appointmentId) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, appointmentId, 'confirm');
  const response = await api.post(endpoint);
  return response.data;
};

/**
 * Start consultation for appointment (doctors only)
 * @param {string} appointmentId - Appointment UUID
 * @returns {Promise<Object>} { success, message, data: Appointment }
 */
export const startAppointment = async (appointmentId) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, appointmentId, 'start');
  const response = await api.post(endpoint);
  return response.data;
};

/**
 * Complete consultation for appointment (doctors only)
 * 
 * Backend expects:
 * - doctor_notes (string, optional)
 * - fee (number, optional)
 * - prescription_id (UUID string, optional)
 * 
 * @param {string} appointmentId - Appointment UUID
 * @param {Object} [completionData] - Completion details
 * @param {string} [completionData.doctor_notes] - Doctor's consultation notes
 * @param {number} [completionData.fee] - Consultation fee
 * @param {string} [completionData.prescription_id] - Prescription UUID reference
 * @returns {Promise<Object>} { success, message, data: Appointment }
 */
export const completeAppointment = async (appointmentId, completionData = {}) => {
  const payload = {
    ...(completionData.doctor_notes && { doctor_notes: completionData.doctor_notes }),
    ...(completionData.fee !== undefined && completionData.fee !== null && { fee: completionData.fee }),
    ...(completionData.prescription_id && { prescription_id: completionData.prescription_id }),
  };

  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, appointmentId, 'complete');
  const response = await api.post(endpoint, payload);
  return response.data;
};

/**
 * Mark patient as no-show (doctors only)
 * @param {string} appointmentId - Appointment UUID
 * @returns {Promise<Object>} { success, message, data: Appointment }
 */
export const markNoShow = async (appointmentId) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, appointmentId, 'no_show');
  const response = await api.post(endpoint);
  return response.data;
};

/**
 * Get today's appointments
 * @returns {Promise<Object>} { success, date, count, data: Appointment[] }
 */
export const getTodayAppointments = async () => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, null, 'today');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Get today's summary stats (doctors only)
 * 
 * Response data shape:
 * { total, pending, confirmed, checked_in, in_progress, completed, cancelled, no_show }
 * 
 * @returns {Promise<Object>} { success, data: TodaySummary }
 */
export const getTodaySummary = async () => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, null, 'today_summary');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Get upcoming appointments
 * @returns {Promise<Object>} { success, count, data: Appointment[] }
 */
export const getUpcomingAppointments = async () => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.APPOINTMENTS, null, 'upcoming');
  const response = await api.get(endpoint);
  return response.data;
};

// =============================================================================
// TIME SLOTS
// =============================================================================

/**
 * Get available slots for a doctor on a specific date
 * 
 * Backend response:
 * {
 *   success, data: {
 *     doctor_id, doctor_name, date, is_available, reason?,
 *     slots: [{ id, slot_date, start_time, end_time, is_available }],
 *     total_slots, available_slots
 *   }
 * }
 * 
 * @param {string} doctorId - Doctor's UUID
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {Promise<Object>} Available slots response
 */
export const getAvailableSlots = async (doctorId, date) => {
  const queryString = buildQueryString({ date });
  const response = await api.get(
    `${APPOINTMENT_ENDPOINTS.AVAILABLE_SLOTS}${doctorId}/${queryString}`
  );
  return response.data;
};

/**
 * Get time slots with filters (read-only listing)
 * 
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.doctor_id] - Doctor UUID
 * @param {string} [filters.date] - Date (YYYY-MM-DD)
 * @param {string} [filters.status] - Slot status (available|booked|blocked)
 * @returns {Promise<Object>} List of time slots
 */
export const getTimeSlots = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`/appointments/slots/${queryString}`);
  return response.data;
};

/**
 * Generate time slots for upcoming days (doctors only)
 * 
 * Backend expects:
 * - start_date (YYYY-MM-DD, optional, default: today)
 * - days (integer, optional, default: 7, max: 90)
 * 
 * @param {Object} [options] - Generation options
 * @param {string} [options.start_date] - Start date (YYYY-MM-DD)
 * @param {number} [options.days] - Number of days to generate (default: 7, max: 90)
 * @returns {Promise<Object>} { success, message, slots_generated, dates_covered }
 */
export const generateSlots = async (options = {}) => {
  const payload = {
    ...(options.start_date && { start_date: options.start_date }),
    ...(options.days && { days: options.days }),
  };

  const response = await api.post(APPOINTMENT_ENDPOINTS.GENERATE_SLOTS, payload);
  return response.data;
};

// =============================================================================
// DOCTOR AVAILABILITY
// =============================================================================

/**
 * Get doctor availability for a date range
 * 
 * Backend response includes:
 * - available_days: list of available dates
 * - next_available: { date, time, slot_id } or null
 * 
 * @param {string} doctorId - Doctor's UUID
 * @param {Object} [options] - Options
 * @param {string} [options.start_date] - Start date (YYYY-MM-DD, default: today)
 * @param {number} [options.days] - Number of days to check (default: 30, max: 90)
 * @returns {Promise<Object>} Doctor availability data
 */
export const getDoctorAvailability = async (doctorId, options = {}) => {
  const queryString = buildQueryString(options);
  const response = await api.get(
    `${APPOINTMENT_ENDPOINTS.AVAILABILITY}${doctorId}/${queryString}`
  );
  return response.data;
};

// =============================================================================
// SCHEDULE MANAGEMENT (Doctor)
// =============================================================================

/**
 * Get doctor's schedules
 * 
 * Returns DoctorScheduleListSerializer data:
 * [{ id, day_of_week, day_name, start_time, end_time,
 *    slot_duration_minutes, consultation_fee, is_active }]
 * 
 * @returns {Promise<Object>} List of schedules
 */
export const getSchedules = async () => {
  const response = await api.get(APPOINTMENT_ENDPOINTS.SCHEDULES);
  return response.data;
};

/**
 * Get complete weekly schedule (with exceptions)
 * 
 * @param {string} [doctorId] - Doctor UUID (optional, defaults to current user if doctor)
 * @returns {Promise<Object>} { success, data: { doctor_id, doctor_name, schedules, exceptions } }
 */
export const getWeeklySchedule = async (doctorId = null) => {
  const queryString = doctorId ? buildQueryString({ doctor_id: doctorId }) : '';
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.SCHEDULES, null, 'weekly');
  const response = await api.get(`${endpoint}${queryString}`);
  return response.data;
};

/**
 * Create a schedule entry
 * 
 * Backend DoctorScheduleCreateSerializer fields:
 * - day_of_week (0-6, 0=Monday, required)
 * - start_time (HH:MM, required)
 * - end_time (HH:MM, required)
 * - break_start (HH:MM, optional)
 * - break_end (HH:MM, optional)
 * - slot_duration_minutes (5-120, default: 30)
 * - max_patients_per_slot (1-10, default: 1)
 * - consultation_fee (decimal, optional)
 * - is_active (boolean, default: true)
 * 
 * @param {Object} scheduleData - Schedule data
 * @param {number} scheduleData.day_of_week - Day of week (0=Mon, 6=Sun)
 * @param {string} scheduleData.start_time - Start time (HH:MM)
 * @param {string} scheduleData.end_time - End time (HH:MM)
 * @param {string} [scheduleData.break_start] - Break start time
 * @param {string} [scheduleData.break_end] - Break end time
 * @param {number} [scheduleData.slot_duration_minutes] - Slot duration (default: 30)
 * @param {number} [scheduleData.max_patients_per_slot] - Max patients per slot (default: 1)
 * @param {number} [scheduleData.consultation_fee] - Fee in INR
 * @param {boolean} [scheduleData.is_active] - Active status
 * @returns {Promise<Object>} { success, message, data: DoctorSchedule }
 */
export const createSchedule = async (scheduleData) => {
  const response = await api.post(APPOINTMENT_ENDPOINTS.SCHEDULES, scheduleData);
  return response.data;
};

/**
 * Bulk create/update weekly schedule
 * 
 * Backend expects: { schedules: [{ day_of_week, start_time, end_time, ... }] }
 * 
 * @param {Array<Object>} schedules - Array of schedule objects
 * @returns {Promise<Object>} { success, message, data: DoctorSchedule[] }
 */
export const bulkUpdateSchedules = async (schedules) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.SCHEDULES, null, 'bulk_update');
  const response = await api.post(endpoint, { schedules });
  return response.data;
};

/**
 * Update a schedule entry
 * @param {string} scheduleId - Schedule UUID
 * @param {Object} scheduleData - Updated schedule data (same fields as create)
 * @returns {Promise<Object>} { success, message, data: DoctorSchedule }
 */
export const updateSchedule = async (scheduleId, scheduleData) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.SCHEDULES, scheduleId);
  const response = await api.put(endpoint, scheduleData);
  return response.data;
};

/**
 * Partially update a schedule entry
 * @param {string} scheduleId - Schedule UUID
 * @param {Object} scheduleData - Fields to update
 * @returns {Promise<Object>} { success, message, data: DoctorSchedule }
 */
export const patchSchedule = async (scheduleId, scheduleData) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.SCHEDULES, scheduleId);
  const response = await api.patch(endpoint, scheduleData);
  return response.data;
};

/**
 * Delete a schedule entry
 * @param {string} scheduleId - Schedule UUID
 * @returns {Promise<Object>} { success, message }
 */
export const deleteSchedule = async (scheduleId) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.SCHEDULES, scheduleId);
  const response = await api.delete(endpoint);
  return response.data;
};

// =============================================================================
// QUEUE MANAGEMENT (Doctor)
// =============================================================================

/**
 * Get queue list (today's queue for doctors, own entries for patients)
 * 
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.status] - Filter by status (waiting|called|in_consultation|completed|skipped)
 * @returns {Promise<Object>} { success, count, data: AppointmentQueue[] }
 */
export const getQueue = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${APPOINTMENT_ENDPOINTS.QUEUE}${queryString}`);
  return response.data;
};

/**
 * Get queue entry by ID
 * @param {string} queueId - Queue entry UUID
 * @returns {Promise<Object>} Queue entry data
 */
export const getQueueEntry = async (queueId) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.QUEUE, queueId);
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Get waiting queue (doctors only)
 * @returns {Promise<Object>} { success, count, data: AppointmentQueue[] }
 */
export const getWaitingQueue = async () => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.QUEUE, null, 'waiting');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Call next patient in queue (doctors only)
 * @returns {Promise<Object>} { success, message, data: AppointmentQueue }
 */
export const callNextPatient = async () => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.QUEUE, null, 'call_next');
  const response = await api.post(endpoint);
  return response.data;
};

/**
 * Perform action on queue entry (doctors only)
 * 
 * Backend QueueActionSerializer:
 * - action: call|start_consultation|complete|skip (required)
 * - notes: string (optional)
 * 
 * @param {string} queueId - Queue entry UUID
 * @param {string} action - Action to perform (call|start_consultation|complete|skip)
 * @param {string} [notes] - Optional notes
 * @returns {Promise<Object>} { success, message, data: AppointmentQueue }
 */
export const performQueueAction = async (queueId, action, notes = '') => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.QUEUE, queueId, 'perform-action');
  const payload = { action };
  if (notes) {
    payload.notes = notes;
  }
  const response = await api.post(endpoint, payload);
  return response.data;
};

/**
 * Requeue a skipped patient (doctors only)
 * @param {string} queueId - Queue entry UUID
 * @returns {Promise<Object>} { success, message, data: AppointmentQueue }
 */
export const requeuePatient = async (queueId) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.QUEUE, queueId, 'requeue');
  const response = await api.post(endpoint);
  return response.data;
};

/**
 * Get queue statistics (doctors only)
 * @returns {Promise<Object>} { success, data: QueueStats }
 */
export const getQueueStats = async () => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.QUEUE, null, 'stats');
  const response = await api.get(endpoint);
  return response.data;
};

/**
 * Get patient's queue status (patients only)
 * @returns {Promise<Object>} { success, data: QueueStatus | null, message? }
 */
export const getMyQueueStatus = async () => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.QUEUE, null, 'my_status');
  const response = await api.get(endpoint);
  return response.data;
};

// =============================================================================
// SCHEDULE EXCEPTIONS (Leaves, Holidays, Modified Hours)
// =============================================================================

/**
 * Get schedule exceptions
 * 
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.date_from] - Start date filter (YYYY-MM-DD)
 * @param {string} [filters.date_to] - End date filter (YYYY-MM-DD)
 * @returns {Promise<Object>} { success, data: ScheduleException[] }
 */
export const getExceptions = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${APPOINTMENT_ENDPOINTS.EXCEPTIONS}${queryString}`);
  return response.data;
};

/**
 * Get upcoming exceptions
 * 
 * @param {number} [days=30] - Number of days to look ahead
 * @returns {Promise<Object>} { success, data: ScheduleException[] }
 */
export const getUpcomingExceptions = async (days = 30) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.EXCEPTIONS, null, 'upcoming');
  const queryString = buildQueryString({ days });
  const response = await api.get(`${endpoint}${queryString}`);
  return response.data;
};

/**
 * Create a schedule exception
 * 
 * Backend ScheduleExceptionCreateSerializer:
 * - exception_date (YYYY-MM-DD, required, cannot be in past)
 * - exception_type (leave|modified|extra, required)
 * - start_time (HH:MM, required for modified/extra)
 * - end_time (HH:MM, required for modified/extra)
 * - reason (string, optional)
 * 
 * @param {Object} exceptionData - Exception data
 * @param {string} exceptionData.exception_date - Date (YYYY-MM-DD)
 * @param {string} exceptionData.exception_type - Type (leave|modified|extra)
 * @param {string} [exceptionData.start_time] - Start time (for modified/extra)
 * @param {string} [exceptionData.end_time] - End time (for modified/extra)
 * @param {string} [exceptionData.reason] - Reason
 * @returns {Promise<Object>} { success, message, data: ScheduleException }
 */
export const createException = async (exceptionData) => {
  const response = await api.post(APPOINTMENT_ENDPOINTS.EXCEPTIONS, exceptionData);
  return response.data;
};

/**
 * Quick add leave for a single date
 * 
 * Backend add_leave action expects:
 * - date (YYYY-MM-DD, required)
 * - reason (string, optional)
 * 
 * NOTE: Backend only supports single-date leave.
 * For multi-day leave, call this in a loop or use createException for each date.
 * 
 * @param {string} date - Leave date (YYYY-MM-DD)
 * @param {string} [reason] - Reason for leave
 * @returns {Promise<Object>} { success, message, data: ScheduleException }
 */
export const addLeave = async (date, reason = 'Leave') => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.EXCEPTIONS, null, 'add_leave');
  const response = await api.post(endpoint, { date, reason });
  return response.data;
};

/**
 * Add leave for multiple dates (convenience wrapper)
 * Calls addLeave for each date since backend only supports single-date leave.
 * 
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {string} [reason] - Reason for leave
 * @returns {Promise<Object[]>} Array of created exception results
 */
export const addMultiDayLeave = async (startDate, endDate, reason = 'Leave') => {
  const results = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];
    try {
      const result = await addLeave(dateStr, reason);
      results.push({ date: dateStr, success: true, data: result });
    } catch (error) {
      results.push({ date: dateStr, success: false, error: error.message });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return results;
};

/**
 * Update a schedule exception
 * @param {string} exceptionId - Exception UUID
 * @param {Object} exceptionData - Updated data
 * @returns {Promise<Object>} Updated exception
 */
export const updateException = async (exceptionId, exceptionData) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.EXCEPTIONS, exceptionId);
  const response = await api.put(endpoint, exceptionData);
  return response.data;
};

/**
 * Delete a schedule exception
 * @param {string} exceptionId - Exception UUID
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteException = async (exceptionId) => {
  const endpoint = buildEndpoint(APPOINTMENT_ENDPOINTS.EXCEPTIONS, exceptionId);
  const response = await api.delete(endpoint);
  return response.data;
};

// =============================================================================
// DASHBOARD / QUICK DATA
// =============================================================================

/**
 * Get quick appointment data for dashboard
 * 
 * For doctors returns:
 * { user_type, today_appointments, today_summary, recent_completed, queue_stats }
 * 
 * For patients returns:
 * { user_type, upcoming_appointments, recent_appointments, queue_status }
 * 
 * @returns {Promise<Object>} { success, data: QuickData }
 */
export const getQuickData = async () => {
  const response = await api.get(APPOINTMENT_ENDPOINTS.QUICK_DATA);
  return response.data;
};

// =============================================================================
// HEALTH CHECK
// =============================================================================

/**
 * Health check for appointments app
 * @returns {Promise<Object>} { success, app, status, stats }
 */
export const healthCheck = async () => {
  const response = await api.get(APPOINTMENT_ENDPOINTS.HEALTH);
  return response.data;
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Appointment service - groups all appointment-related API methods
 */
export default {
  // Appointments CRUD & Actions
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  rescheduleAppointment,
  checkInAppointment,
  checkInViaEndpoint,
  confirmAppointment,
  startAppointment,
  completeAppointment,
  markNoShow,
  getTodayAppointments,
  getTodaySummary,
  getUpcomingAppointments,

  // Time Slots
  getAvailableSlots,
  getTimeSlots,
  generateSlots,

  // Doctor Availability
  getDoctorAvailability,

  // Schedules
  getSchedules,
  getWeeklySchedule,
  createSchedule,
  bulkUpdateSchedules,
  updateSchedule,
  patchSchedule,
  deleteSchedule,

  // Queue
  getQueue,
  getQueueEntry,
  getWaitingQueue,
  callNextPatient,
  performQueueAction,
  requeuePatient,
  getQueueStats,
  getMyQueueStatus,

  // Exceptions (Leaves)
  getExceptions,
  getUpcomingExceptions,
  createException,
  addLeave,
  addMultiDayLeave,
  updateException,
  deleteException,

  // Dashboard
  getQuickData,

  // Health
  healthCheck,
};