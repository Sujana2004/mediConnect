// src/services/api/consultationService.js
/**
 * Consultation API Service
 * Matches backend endpoints exactly
 */

import api from '../../config/api';

const ENDPOINTS = {
  CONSULTATIONS: '/consultation/consultations/',
  JITSI_CONFIG: '/consultation/jitsi/config/',
  HEALTH: '/consultation/health/',
};

// ========== Helper Functions ==========

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

const ensureId = (value, fieldName = 'consultationId') => {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }
  return value;
};

const normalizeCreatePayload = (data = {}) => ({
  patient_id: data.patient_id ?? data.patientId,
  doctor_id: data.doctor_id ?? data.doctorId,
  appointment_id: data.appointment_id ?? data.appointmentId,
  scheduled_start: data.scheduled_start ?? data.scheduledStart,
  consultation_type: data.consultation_type ?? data.consultationType,
  duration_minutes: data.duration_minutes ?? data.durationMinutes,
  reason: data.reason,
  symptoms: data.symptoms,
  language: data.language,
});

const normalizeEndPayload = (data = {}) => ({
  diagnosis: data.diagnosis,
  follow_up_required: data.follow_up_required ?? data.followUpRequired,
  follow_up_notes: data.follow_up_notes ?? data.followUpNotes,
  follow_up_date: data.follow_up_date ?? data.followUpDate,
});

const normalizeReschedulePayload = (data = {}) => ({
  new_scheduled_start: data.new_scheduled_start ?? data.newScheduledStart ?? data.scheduled_start ?? data.scheduledStart,
  reason: data.reason,
});

// ========== Consultations ==========

/**
 * Get list of consultations
 * GET /consultation/consultations/
 */
export const getConsultations = async (filters = {}) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`${ENDPOINTS.CONSULTATIONS}${queryString}`);
  return response.data;
};

/**
 * Get consultation by ID
 * GET /consultation/consultations/{id}/
 */
export const getById = async (consultationId) => {
  const id = ensureId(consultationId);
  const response = await api.get(`${ENDPOINTS.CONSULTATIONS}${id}/`);
  return response.data;
};

/**
 * Create a new consultation
 * POST /consultation/consultations/
 */
export const create = async (data) => {
  const payload = normalizeCreatePayload(data);
  const response = await api.post(ENDPOINTS.CONSULTATIONS, payload);
  return response.data;
};

/**
 * Create consultation from appointment
 * POST /consultation/consultations/from-appointment/
 */
export const createFromAppointment = async (appointmentId, consultationType = 'video') => {
  const id = ensureId(appointmentId, 'appointmentId');
  const response = await api.post(`${ENDPOINTS.CONSULTATIONS}from-appointment/`, {
    appointment_id: id,
    consultation_type: consultationType
  });
  return response.data;
};

/**
 * Get join info for consultation
 * POST /consultation/consultations/{id}/join/
 */
export const getJoinInfo = async (consultationId) => {
  const id = ensureId(consultationId);
  const response = await api.post(`${ENDPOINTS.CONSULTATIONS}${id}/join/`);
  return response.data;
};

/**
 * Patient joins waiting room
 * POST /consultation/consultations/{id}/join-waiting-room/
 */
export const joinWaitingRoom = async (consultationId) => {
  const id = ensureId(consultationId);
  const response = await api.post(`${ENDPOINTS.CONSULTATIONS}${id}/join-waiting-room/`);
  return response.data;
};

/**
 * Doctor starts consultation
 * POST /consultation/consultations/{id}/start/
 */
export const start = async (consultationId) => {
  const id = ensureId(consultationId);
  const response = await api.post(`${ENDPOINTS.CONSULTATIONS}${id}/start/`);
  return response.data;
};

/**
 * End consultation
 * POST /consultation/consultations/{id}/end/
 */
export const end = async (consultationId, data = {}) => {
  const id = ensureId(consultationId);
  const payload = normalizeEndPayload(data);
  const response = await api.post(`${ENDPOINTS.CONSULTATIONS}${id}/end/`, payload);
  return response.data;
};

/**
 * Cancel consultation
 * POST /consultation/consultations/{id}/cancel/
 */
export const cancel = async (consultationId, reason = '') => {
  const id = ensureId(consultationId);
  const response = await api.post(`${ENDPOINTS.CONSULTATIONS}${id}/cancel/`, { reason });
  return response.data;
};

/**
 * Reschedule consultation
 * POST /consultation/consultations/{id}/reschedule/
 */
export const reschedule = async (consultationId, data) => {
  const id = ensureId(consultationId);
  const payload = normalizeReschedulePayload(data);
  const response = await api.post(`${ENDPOINTS.CONSULTATIONS}${id}/reschedule/`, payload);
  return response.data;
};

// ========== Quick Data Endpoints ==========

/**
 * Get upcoming consultations
 * GET /consultation/consultations/upcoming/
 */
export const getUpcoming = async () => {
  const response = await api.get(`${ENDPOINTS.CONSULTATIONS}upcoming/`);
  return response.data;
};

/**
 * Get today's consultations (doctor)
 * GET /consultation/consultations/today/
 */
export const getToday = async () => {
  const response = await api.get(`${ENDPOINTS.CONSULTATIONS}today/`);
  return response.data;
};

/**
 * Get waiting patients (doctor)
 * GET /consultation/consultations/waiting/
 */
export const getWaiting = async () => {
  const response = await api.get(`${ENDPOINTS.CONSULTATIONS}waiting/`);
  return response.data;
};

/**
 * Get consultation history
 * GET /consultation/consultations/history/
 */
export const getHistory = async () => {
  const response = await api.get(`${ENDPOINTS.CONSULTATIONS}history/`);
  return response.data;
};

/**
 * Get consultation stats
 * GET /consultation/consultations/stats/
 */
export const getStats = async (days = 30) => {
  const response = await api.get(`${ENDPOINTS.CONSULTATIONS}stats/?days=${days}`);
  return response.data;
};

/**
 * Get quick data for dashboard
 * GET /consultation/consultations/quick-data/
 */
export const getQuickData = async () => {
  const response = await api.get(`${ENDPOINTS.CONSULTATIONS}quick-data/`);
  return response.data;
};

// ========== Notes ==========

/**
 * Get consultation notes
 * GET /consultation/consultations/{id}/notes/
 */
export const getNotes = async (consultationId) => {
  const id = ensureId(consultationId);
  const response = await api.get(`${ENDPOINTS.CONSULTATIONS}${id}/notes/`);
  return response.data;
};

/**
 * Add note to consultation
 * POST /consultation/consultations/{id}/notes/
 */
export const addNote = async (consultationId, noteData) => {
  const id = ensureId(consultationId);
  const response = await api.post(`${ENDPOINTS.CONSULTATIONS}${id}/notes/`, noteData);
  return response.data;
};

/**
 * Update note
 * PUT /consultation/consultations/{id}/notes/{noteId}/
 */
export const updateNote = async (consultationId, noteId, noteData) => {
  const id = ensureId(consultationId);
  const targetNoteId = ensureId(noteId, 'noteId');
  const response = await api.put(`${ENDPOINTS.CONSULTATIONS}${id}/notes/${targetNoteId}/`, noteData);
  return response.data;
};

/**
 * Delete note
 * DELETE /consultation/consultations/{id}/notes/{noteId}/
 */
export const deleteNote = async (consultationId, noteId) => {
  const id = ensureId(consultationId);
  const targetNoteId = ensureId(noteId, 'noteId');
  const response = await api.delete(`${ENDPOINTS.CONSULTATIONS}${id}/notes/${targetNoteId}/`);
  return response.data;
};

// ========== Prescriptions ==========

/**
 * Get consultation prescriptions
 * GET /consultation/consultations/{id}/prescriptions/
 */
export const getPrescriptions = async (consultationId) => {
  const id = ensureId(consultationId);
  const response = await api.get(`${ENDPOINTS.CONSULTATIONS}${id}/prescriptions/`);
  return response.data;
};

/**
 * Add prescription
 * POST /consultation/consultations/{id}/prescriptions/
 */
export const addPrescription = async (consultationId, prescriptionData) => {
  const id = ensureId(consultationId);
  const response = await api.post(`${ENDPOINTS.CONSULTATIONS}${id}/prescriptions/`, prescriptionData);
  return response.data;
};

/**
 * Bulk add prescriptions
 * POST /consultation/consultations/{id}/prescriptions/bulk-create/
 */
export const addPrescriptionsBulk = async (consultationId, prescriptions) => {
  const id = ensureId(consultationId);
  const response = await api.post(`${ENDPOINTS.CONSULTATIONS}${id}/prescriptions/bulk-create/`, {
    prescriptions
  });
  return response.data;
};

/**
 * Update prescription
 * PUT /consultation/consultations/{id}/prescriptions/{prescriptionId}/
 */
export const updatePrescription = async (consultationId, prescriptionId, data) => {
  const id = ensureId(consultationId);
  const targetPrescriptionId = ensureId(prescriptionId, 'prescriptionId');
  const response = await api.put(`${ENDPOINTS.CONSULTATIONS}${id}/prescriptions/${targetPrescriptionId}/`, data);
  return response.data;
};

/**
 * Delete prescription
 * DELETE /consultation/consultations/{id}/prescriptions/{prescriptionId}/
 */
export const deletePrescription = async (consultationId, prescriptionId) => {
  const id = ensureId(consultationId);
  const targetPrescriptionId = ensureId(prescriptionId, 'prescriptionId');
  const response = await api.delete(`${ENDPOINTS.CONSULTATIONS}${id}/prescriptions/${targetPrescriptionId}/`);
  return response.data;
};

// ========== Attachments ==========

/**
 * Get consultation attachments
 * GET /consultation/consultations/{id}/attachments/
 */
export const getAttachments = async (consultationId) => {
  const id = ensureId(consultationId);
  const response = await api.get(`${ENDPOINTS.CONSULTATIONS}${id}/attachments/`);
  return response.data;
};

/**
 * Add attachment
 * POST /consultation/consultations/{id}/attachments/
 */
export const addAttachment = async (consultationId, attachmentData) => {
  const id = ensureId(consultationId);
  const response = await api.post(`${ENDPOINTS.CONSULTATIONS}${id}/attachments/`, attachmentData);
  return response.data;
};

/**
 * Delete attachment
 * DELETE /consultation/consultations/{id}/attachments/{attachmentId}/
 */
export const deleteAttachment = async (consultationId, attachmentId) => {
  const id = ensureId(consultationId);
  const targetAttachmentId = ensureId(attachmentId, 'attachmentId');
  const response = await api.delete(`${ENDPOINTS.CONSULTATIONS}${id}/attachments/${targetAttachmentId}/`);
  return response.data;
};

// ========== Feedback ==========

/**
 * Get feedback for consultation
 * GET /consultation/consultations/{id}/feedback/
 */
export const getFeedback = async (consultationId) => {
  const id = ensureId(consultationId);
  const response = await api.get(`${ENDPOINTS.CONSULTATIONS}${id}/feedback/`);
  return response.data;
};

/**
 * Submit feedback
 * POST /consultation/consultations/{id}/feedback/
 */
export const submitFeedback = async (consultationId, feedbackData) => {
  const id = ensureId(consultationId);
  const response = await api.post(`${ENDPOINTS.CONSULTATIONS}${id}/feedback/`, feedbackData);
  return response.data;
};

// ========== Compatibility Aliases ==========

export const getConsultationById = getById;
export const createConsultation = create;
export const createConsultationFromAppointment = createFromAppointment;
export const joinConsultation = getJoinInfo;
export const startConsultation = start;
export const endConsultation = end;
export const getConsultationNotes = getNotes;
export const addConsultationNote = addNote;
export const getConsultationPrescriptions = getPrescriptions;
export const addConsultationPrescription = addPrescription;

// ========== Doctor Feedback Summary ==========

/**
 * Get doctor's feedback summary
 * GET /consultation/doctors/{doctorId}/feedback-summary/
 */
export const getDoctorFeedbackSummary = async (doctorId) => {
  const response = await api.get(`/consultation/doctors/${doctorId}/feedback-summary/`);
  return response.data;
};

// ========== Jitsi Config ==========

/**
 * Get Jitsi configuration
 * GET /consultation/jitsi/config/
 */
export const getJitsiConfig = async () => {
  const response = await api.get(ENDPOINTS.JITSI_CONFIG);
  return response.data;
};

// ========== Health Check ==========

/**
 * Health check
 * GET /consultation/health/
 */
export const healthCheck = async () => {
  const response = await api.get(ENDPOINTS.HEALTH);
  return response.data;
};

// ========== Default Export ==========

const consultationService = {
  // Consultations
  getConsultations,
  getConsultationById,
  getById,
  createConsultation,
  create,
  createConsultationFromAppointment,
  createFromAppointment,
  joinConsultation,
  getJoinInfo,
  joinWaitingRoom,
  startConsultation,
  start,
  endConsultation,
  end,
  cancel,
  reschedule,
  
  // Quick data
  getUpcoming,
  getToday,
  getWaiting,
  getHistory,
  getStats,
  getQuickData,
  
  // Notes
  getConsultationNotes,
  getNotes,
  addConsultationNote,
  addNote,
  updateNote,
  deleteNote,
  
  // Prescriptions
  getConsultationPrescriptions,
  getPrescriptions,
  addConsultationPrescription,
  addPrescription,
  addPrescriptionsBulk,
  updatePrescription,
  deletePrescription,
  
  // Attachments
  getAttachments,
  addAttachment,
  deleteAttachment,
  
  // Feedback
  getFeedback,
  submitFeedback,
  getDoctorFeedbackSummary,
  
  // Config
  getJitsiConfig,
  healthCheck,
};

export default consultationService;