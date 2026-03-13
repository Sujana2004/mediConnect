# MediConnect Frontend API Documentation

> **Base URL:** `http://localhost:8000/api/v1`
> **Authentication:** JWT Bearer Token (except login/register endpoints)
> **Content-Type:** `application/json`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Appointments](#2-appointments)
3. [Consultations](#3-consultations)
4. [Diagnosis / Symptom Checker](#4-diagnosis--symptom-checker)
5. [Health Records](#5-health-records)
6. [Medicine](#6-medicine)
7. [Chatbot](#7-chatbot)
8. [Emergency](#8-emergency)
9. [Notifications](#9-notifications)
10. [Enums & Constants](#10-enums--constants)
11. [Error Handling](#11-error-handling)
12. [Pagination](#12-pagination)

---

## Authentication Header

All authenticated endpoints require:
Authorization: Bearer <access_token>

text


---

## 1. Authentication

### 1.1 Login

Authenticate user with Firebase phone auth token.
POST /auth/login/

text


**Request Body:**
```json
{
  "firebase_token": "string (required) - Firebase ID token from phone authentication",
  "fcm_token": "string (optional) - Firebase Cloud Messaging token for push notifications"
}
Response (200):

JSON

{
  "success": true,
  "message": "Login successful",
  "data": {
    "access": "string - JWT access token",
    "refresh": "string - JWT refresh token",
    "user": {
      "id": "integer",
      "phone": "string",
      "email": "string | null",
      "first_name": "string",
      "last_name": "string",
      "full_name": "string",
      "date_of_birth": "date | null",
      "age": "string",
      "gender": "male | female | other",
      "profile_photo": "url | null",
      "preferred_language": "te | hi | en",
      "role": "patient | doctor",
      "address": "string",
      "village": "string",
      "district": "string",
      "state": "string",
      "pincode": "string",
      "is_phone_verified": "boolean",
      "is_profile_complete": "boolean"
    }
  }
}
Error Responses:

400 - Invalid credentials / validation error
401 - Authentication failed
404 - User not found (needs registration)
1.2 Register Patient
Register a new patient with Firebase phone auth.

text

POST /auth/register/patient/
Request Body:

JSON

{
  "firebase_token": "string (required) - Firebase ID token",
  "first_name": "string (optional)",
  "last_name": "string (optional)",
  "date_of_birth": "date (optional) - YYYY-MM-DD",
  "gender": "male | female | other (optional)",
  "preferred_language": "te | hi | en (default: te)",
  "village": "string (optional)",
  "district": "string (optional)",
  "blood_group": "A+ | A- | B+ | B- | O+ | O- | AB+ | AB- (optional)",
  "emergency_contact_name": "string (optional)",
  "emergency_contact_phone": "string (optional) - 10 digit",
  "is_literate": "boolean (default: true)",
  "needs_voice_assistance": "boolean (default: false)",
  "fcm_token": "string (optional)"
}
Response (201):

JSON

{
  "success": true,
  "message": "Registration successful",
  "data": {
    "access": "string",
    "refresh": "string",
    "user": { /* User object */ }
  }
}
1.3 Register Doctor
Register a new doctor with Firebase phone auth.

text

POST /auth/register/doctor/
Request Body:

JSON

{
  "firebase_token": "string (required)",
  "first_name": "string (required)",
  "last_name": "string (optional)",
  "email": "string (optional)",
  "date_of_birth": "date (optional)",
  "gender": "male | female | other (optional)",
  "preferred_language": "te | hi | en (default: te)",
  "registration_number": "string (required) - Medical Council Registration Number",
  "registration_council": "string (required) - e.g., Andhra Pradesh Medical Council",
  "specialization": "string (default: general) - See specialization enum",
  "qualification": "string (required) - e.g., MBBS, MD, MS",
  "experience_years": "integer (default: 0)",
  "hospital_name": "string (optional)",
  "hospital_address": "string (optional)",
  "consultation_fee": "decimal (default: 0.00)",
  "languages_spoken": ["telugu", "hindi", "english"],
  "bio": "string (optional)",
  "fcm_token": "string (optional)"
}
Response (201):

JSON

{
  "success": true,
  "message": "Registration successful. Pending verification.",
  "data": {
    "access": "string",
    "refresh": "string",
    "user": { /* User object */ },
    "doctor_profile": {
      "verification_status": "pending"
    }
  }
}
1.4 Logout
Blacklist refresh token.

text

POST /auth/logout/
Request Body:

JSON

{
  "refresh": "string (required) - Refresh token to blacklist"
}
Response (200):

JSON

{
  "success": true,
  "message": "Logout successful"
}
1.5 Refresh Token
Get new access token using refresh token.

text

POST /auth/token/refresh/
Request Body:

JSON

{
  "refresh": "string (required)"
}
Response (200):

JSON

{
  "access": "string - New access token",
  "refresh": "string - New refresh token (if rotated)"
}
1.6 Get Profile
Get current user's profile.

text

GET /auth/profile/
Response (200) - Patient:

JSON

{
  "id": "integer",
  "user": {
    "id": "integer",
    "phone": "string",
    "email": "string | null",
    "first_name": "string",
    "last_name": "string",
    "full_name": "string",
    "date_of_birth": "date | null",
    "age": "string",
    "gender": "male | female | other",
    "profile_photo": "url | null",
    "preferred_language": "te | hi | en",
    "role": "patient",
    "address": "string",
    "village": "string",
    "mandal": "string",
    "district": "string",
    "state": "string",
    "pincode": "string",
    "latitude": "decimal | null",
    "longitude": "decimal | null",
    "is_phone_verified": "boolean",
    "is_profile_complete": "boolean",
    "created_at": "datetime",
    "last_active": "datetime | null"
  },
  "blood_group": "A+ | A- | B+ | B- | O+ | O- | AB+ | AB- | null",
  "height_cm": "integer | null",
  "weight_kg": "decimal | null",
  "bmi": "number | null",
  "chronic_conditions": ["diabetes", "hypertension"],
  "allergies": ["penicillin", "peanuts"],
  "current_medications": ["list of medications"],
  "past_surgeries": ["list of surgeries"],
  "family_history": {},
  "emergency_contact_name": "string",
  "emergency_contact_phone": "string",
  "emergency_contact_relation": "string",
  "has_insurance": "boolean",
  "insurance_provider": "string",
  "insurance_id": "string",
  "is_literate": "boolean",
  "needs_voice_assistance": "boolean",
  "needs_large_text": "boolean",
  "total_appointments": "integer",
  "total_consultations": "integer",
  "created_at": "datetime",
  "updated_at": "datetime"
}
Response (200) - Doctor:

JSON

{
  "id": "integer",
  "user": { /* User object */ },
  "registration_number": "string",
  "registration_council": "string",
  "specialization": "string",
  "specialization_display": "string",
  "qualification": "string",
  "experience_years": "integer",
  "hospital_name": "string",
  "hospital_address": "string",
  "consultation_fee": "decimal",
  "consultation_duration": "integer",
  "languages_spoken": ["telugu", "hindi", "english"],
  "is_available_online": "boolean",
  "verification_status": "pending | verified | rejected",
  "verification_status_display": "string",
  "average_rating": "decimal",
  "total_reviews": "integer",
  "total_consultations": "integer",
  "bio": "string",
  "availabilities": [
    {
      "id": "integer",
      "day_of_week": "0-6",
      "day_name": "string",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "is_available": "boolean",
      "slot_duration": "integer",
      "max_appointments": "integer"
    }
  ],
  "created_at": "datetime",
  "updated_at": "datetime"
}
1.7 Update Profile
Update current user's profile.

text

PUT /auth/profile/
PATCH /auth/profile/
Request Body (Patient):

JSON

{
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "date_of_birth": "date",
  "gender": "male | female | other",
  "preferred_language": "te | hi | en",
  "address": "string",
  "village": "string",
  "district": "string",
  "state": "string",
  "pincode": "string",
  "blood_group": "string",
  "height_cm": "integer",
  "weight_kg": "decimal",
  "emergency_contact_name": "string",
  "emergency_contact_phone": "string",
  "emergency_contact_relation": "string",
  "is_literate": "boolean",
  "needs_voice_assistance": "boolean",
  "needs_large_text": "boolean"
}
Request Body (Doctor):

JSON

{
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "hospital_name": "string",
  "hospital_address": "string",
  "consultation_fee": "decimal",
  "consultation_duration": "integer",
  "languages_spoken": ["array"],
  "is_available_online": "boolean",
  "bio": "string"
}
1.8 List Doctors
Get list of verified doctors (for patients to browse).

text

GET /auth/doctors/
Query Parameters:

Parameter	Type	Description
page	integer	Page number
specialization	string	Filter by specialization
language	string	Filter by language spoken
search	string	Search by doctor name
Response (200):

JSON

{
  "count": "integer",
  "next": "url | null",
  "previous": "url | null",
  "results": [
    {
      "id": "integer",
      "name": "string",
      "profile_photo": "url | null",
      "specialization": "string",
      "specialization_display": "string",
      "qualification": "string",
      "experience_years": "integer",
      "hospital_name": "string",
      "consultation_fee": "decimal",
      "consultation_duration": "integer",
      "languages": ["telugu", "hindi"],
      "is_available_online": "boolean",
      "average_rating": "decimal",
      "total_reviews": "integer",
      "total_consultations": "integer",
      "bio": "string",
      "availabilities": [/* DoctorAvailability array */]
    }
  ]
}
1.9 Get Doctor Details
Get single doctor's public profile.

text

GET /auth/doctors/{id}/
Response (200): Same as single item in list above.

1.10 Get Specializations
Get list of available specializations.

text

GET /auth/doctors/specializations/
Response (200):

JSON

{
  "specializations": [
    {"value": "general", "label": "General Physician"},
    {"value": "pediatrics", "label": "Pediatrics"},
    // ... more
  ]
}
1.11 Family Helpers
List Helpers
text

GET /auth/helpers/
Response (200):

JSON

[
  {
    "id": "integer",
    "patient": "integer",
    "patient_name": "string",
    "helper_user": "integer | null",
    "helper_name": "string",
    "helper_phone": "string",
    "relationship": "spouse | son | daughter | father | mother | brother | sister | grandson | granddaughter | other",
    "relationship_display": "string",
    "can_book_appointments": "boolean",
    "can_view_records": "boolean",
    "can_chat_with_doctor": "boolean",
    "can_manage_medications": "boolean",
    "is_active": "boolean",
    "is_primary": "boolean",
    "is_verified": "boolean",
    "created_at": "datetime"
  }
]
Add Helper
text

POST /auth/helpers/
Request Body:

JSON

{
  "helper_name": "string (required)",
  "helper_phone": "string (required) - 10 digit Indian number",
  "relationship": "string (required) - See enum",
  "can_book_appointments": "boolean (default: true)",
  "can_view_records": "boolean (default: true)",
  "can_chat_with_doctor": "boolean (default: false)",
  "can_manage_medications": "boolean (default: true)",
  "is_primary": "boolean (default: false)"
}
Update Helper
text

PUT /auth/helpers/{id}/
Delete Helper
text

DELETE /auth/helpers/{id}/
1.12 Settings
Change Language
text

POST /auth/settings/language/
Request Body:

JSON

{
  "language": "te | hi | en (required)"
}
Update FCM Token
text

POST /auth/settings/fcm-token/
Request Body:

JSON

{
  "fcm_token": "string (required)"
}
1.13 Doctor Availability (Doctor Only)
Get Availability
text

GET /auth/doctor/availability/
Add/Update Availability
text

POST /auth/doctor/availability/
Request Body:

JSON

{
  "day_of_week": "0-6 (required) - 0=Monday",
  "start_time": "HH:MM (required)",
  "end_time": "HH:MM (required)",
  "is_available": "boolean (default: true)",
  "slot_duration": "integer (default: 15) - minutes",
  "max_appointments": "integer (default: 1)"
}
Delete Availability
text

DELETE /auth/doctor/availability/{id}/
2. Appointments
2.1 List Appointments
text

GET /appointments/appointments/
Query Parameters:

Parameter	Type	Description
page	integer	Page number
status	string	Filter: pending, confirmed, checked_in, in_progress, completed, cancelled, no_show, rescheduled
date	date	Filter by date (YYYY-MM-DD)
upcoming	boolean	Get only upcoming appointments
Response (200):

JSON

{
  "count": "integer",
  "next": "url | null",
  "previous": "url | null",
  "results": [
    {
      "id": "uuid",
      "patient_name": "string",
      "doctor_name": "string",
      "appointment_date": "date",
      "start_time": "HH:MM:SS",
      "end_time": "HH:MM:SS | null",
      "status": "string",
      "status_display": "string",
      "booking_type": "online | walk_in | phone | follow_up",
      "reason": "string",
      "is_upcoming": "boolean",
      "created_at": "datetime"
    }
  ]
}
2.2 Create Appointment
text

POST /appointments/appointments/
Request Body:

JSON

{
  "doctor_id": "uuid (required)",
  "time_slot_id": "uuid (optional) - if booking specific slot",
  "appointment_date": "date (required) - YYYY-MM-DD",
  "start_time": "HH:MM (required)",
  "reason": "string (optional) - Chief complaint",
  "symptoms": "string (optional)",
  "patient_notes": "string (optional)",
  "booking_type": "online | walk_in | phone | follow_up (default: online)"
}
Response (201):

JSON

{
  "id": "uuid",
  "patient_id": "uuid",
  "patient_name": "string",
  "patient_phone": "string",
  "doctor_id": "uuid",
  "doctor_name": "string",
  "doctor_phone": "string",
  "time_slot": "uuid | null",
  "appointment_date": "date",
  "start_time": "HH:MM:SS",
  "end_time": "HH:MM:SS | null",
  "status": "pending",
  "status_display": "Pending",
  "booking_type": "online",
  "booking_type_display": "Online",
  "reason": "string",
  "symptoms": "string",
  "patient_notes": "string",
  "doctor_notes": "string",
  "cancellation_reason": "string",
  "cancelled_by": "string",
  "rescheduled_from": "uuid | null",
  "confirmed_at": "datetime | null",
  "checked_in_at": "datetime | null",
  "started_at": "datetime | null",
  "completed_at": "datetime | null",
  "cancelled_at": "datetime | null",
  "consultation_fee": "decimal | null",
  "prescription_id": "uuid | null",
  "reminder_24h_sent": "boolean",
  "reminder_1h_sent": "boolean",
  "is_upcoming": "boolean",
  "is_past": "boolean",
  "can_cancel": "boolean",
  "can_reschedule": "boolean",
  "queue_number": "integer | null",
  "queue_status": "string | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
2.3 Get Appointment Details
text

GET /appointments/appointments/{id}/
Response (200): Full Appointment object (same as create response)

2.4 Update Appointment
text

PUT /appointments/appointments/{id}/
PATCH /appointments/appointments/{id}/
Request Body:

JSON

{
  "reason": "string",
  "symptoms": "string",
  "patient_notes": "string"
}
2.5 Cancel Appointment
text

POST /appointments/appointments/{id}/cancel/
Request Body:

JSON

{
  "reason": "string (optional) - max 500 chars"
}
2.6 Reschedule Appointment
text

POST /appointments/appointments/{id}/reschedule/
Request Body:

JSON

{
  "new_date": "date (required) - YYYY-MM-DD",
  "new_time": "HH:MM (required)",
  "time_slot_id": "uuid (optional)",
  "reason": "string (optional)"
}
2.7 Check In (Patient)
Check in for an appointment.

text

POST /appointments/appointments/{id}/check_in/
Response (200):

JSON

{
  "id": "uuid",
  "appointment_id": "uuid",
  "patient_name": "string",
  "patient_phone": "string",
  "appointment_time": "string",
  "reason": "string",
  "queue_number": "integer",
  "queue_date": "date",
  "status": "waiting",
  "status_display": "Waiting",
  "checked_in_at": "datetime",
  "called_at": "datetime | null",
  "consultation_started_at": "datetime | null",
  "completed_at": "datetime | null",
  "estimated_wait_minutes": "integer | null",
  "wait_time_minutes": "integer",
  "created_at": "datetime"
}
2.8 Confirm Appointment (Doctor Only)
text

POST /appointments/appointments/{id}/confirm/
2.9 Start Consultation (Doctor Only)
text

POST /appointments/appointments/{id}/start/
2.10 Complete Consultation (Doctor Only)
text

POST /appointments/appointments/{id}/complete/
Request Body:

JSON

{
  "doctor_notes": "string (optional)",
  "fee": "decimal (optional)",
  "prescription_id": "uuid (optional)"
}
2.11 Mark No Show (Doctor Only)
text

POST /appointments/appointments/{id}/no_show/
2.12 Today's Appointments (Doctor)
text

GET /appointments/appointments/today/
2.13 Today's Summary (Doctor)
text

GET /appointments/appointments/today_summary/
Response (200):

JSON

{
  "total": "integer",
  "pending": "integer",
  "confirmed": "integer",
  "checked_in": "integer",
  "in_progress": "integer",
  "completed": "integer",
  "cancelled": "integer",
  "no_show": "integer"
}
2.14 Upcoming Appointments
text

GET /appointments/appointments/upcoming/
2.15 Get Available Slots
Get available time slots for a doctor on a specific date.

text

GET /appointments/available-slots/{doctor_id}/
Query Parameters:

Parameter	Type	Description
date	date	Required - YYYY-MM-DD
Response (200):

JSON

{
  "doctor_id": "uuid",
  "doctor_name": "string",
  "date": "date",
  "slots": [
    {
      "id": "uuid",
      "slot_date": "date",
      "start_time": "HH:MM:SS",
      "end_time": "HH:MM:SS",
      "is_available": "boolean"
    }
  ],
  "total_slots": "integer",
  "available_slots": "integer"
}
2.16 Get Doctor Availability
Get doctor availability for date range.

text

GET /appointments/availability/{doctor_id}/
Query Parameters:

Parameter	Type	Description
start_date	date	Default: today
days	integer	Default: 30
2.17 Quick Data (Dashboard)
text

GET /appointments/quick-data/
Response (200):

JSON

{
  "upcoming_appointments": [/* AppointmentList array */],
  "today_summary": {/* TodayAppointmentsSummary */},
  "recent_appointments": [/* AppointmentList array */]
}
2.18 Doctor Schedules
List Schedules
text

GET /appointments/schedules/
Response (200):

JSON

[
  {
    "id": "uuid",
    "day_of_week": "0-6",
    "day_name": "Monday",
    "start_time": "HH:MM:SS",
    "end_time": "HH:MM:SS",
    "slot_duration_minutes": "integer",
    "consultation_fee": "decimal | null",
    "is_active": "boolean"
  }
]
Create Schedule
text

POST /appointments/schedules/
Request Body:

JSON

{
  "day_of_week": "0-6 (required)",
  "start_time": "HH:MM (required)",
  "end_time": "HH:MM (required)",
  "break_start": "HH:MM (optional)",
  "break_end": "HH:MM (optional)",
  "slot_duration_minutes": "integer (default: 15) - 5-120",
  "max_patients_per_slot": "integer (default: 1) - 1-10",
  "consultation_fee": "decimal (optional)",
  "is_active": "boolean (default: true)"
}
Get Weekly Schedule
text

GET /appointments/schedules/weekly/
Query Parameters:

Parameter	Type	Description
doctor_id	uuid	Optional - defaults to current doctor
Response (200):

JSON

{
  "doctor_id": "uuid",
  "doctor_name": "string",
  "schedules": [/* DoctorScheduleList array */],
  "exceptions": [/* upcoming exceptions */]
}
Bulk Update Schedules
text

POST /appointments/schedules/bulk_update/
Request Body:

JSON

{
  "schedules": [
    {
      "day_of_week": "integer",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "break_start": "HH:MM | null",
      "break_end": "HH:MM | null",
      "slot_duration_minutes": "integer",
      "max_patients_per_slot": "integer",
      "consultation_fee": "decimal",
      "is_active": "boolean"
    }
  ]
}
Update Schedule
text

PUT /appointments/schedules/{id}/
Delete Schedule
text

DELETE /appointments/schedules/{id}/
2.19 Schedule Exceptions (Leaves)
List Exceptions
text

GET /appointments/exceptions/
Response (200):

JSON

[
  {
    "id": "uuid",
    "doctor_id": "uuid",
    "doctor_name": "string",
    "exception_date": "date",
    "exception_type": "leave | modified | extra",
    "exception_type_display": "string",
    "start_time": "HH:MM:SS | null",
    "end_time": "HH:MM:SS | null",
    "reason": "string",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
]
Create Exception
text

POST /appointments/exceptions/
Request Body:

JSON

{
  "exception_date": "date (required)",
  "exception_type": "leave | modified | extra (required)",
  "start_time": "HH:MM (optional) - for modified/extra",
  "end_time": "HH:MM (optional)",
  "reason": "string (optional)"
}
Add Leave (Shorthand)
text

POST /appointments/exceptions/add_leave/
Request Body:

JSON

{
  "date": "date (required)",
  "reason": "string (optional)"
}
Get Upcoming Exceptions
text

GET /appointments/exceptions/upcoming/
Query Parameters:

Parameter	Type	Description
days	integer	Default: 30
2.20 Queue Management (Doctor)
List Queue
text

GET /appointments/queue/
Get Waiting Queue
text

GET /appointments/queue/waiting/
Response (200):

JSON

[
  {
    "id": "uuid",
    "queue_number": "integer",
    "patient_name": "string",
    "appointment_time": "string",
    "status": "waiting | called | in_consultation | completed | skipped",
    "status_display": "string",
    "wait_time_minutes": "integer",
    "estimated_wait_minutes": "integer | null"
  }
]
Call Next Patient
text

POST /appointments/queue/call_next/
Perform Queue Action
text

POST /appointments/queue/{id}/perform-action/
Request Body:

JSON

{
  "action": "call | start_consultation | complete | skip (required)",
  "notes": "string (optional)"
}
Get Queue Stats
text

GET /appointments/queue/stats/
Get My Queue Status (Patient)
text

GET /appointments/queue/my_status/
Requeue Skipped Patient
text

POST /appointments/queue/{id}/requeue/
2.21 Generate Slots (Doctor)
text

POST /appointments/generate-slots/
Request Body:

JSON

{
  "start_date": "date (optional) - default: today",
  "days": "integer (optional) - default: 7"
}
Response (200):

JSON

{
  "success": true,
  "message": "Slots generated successfully",
  "slots_generated": "integer"
}
3. Consultations
3.1 List Consultations
text

GET /consultation/consultations/
Response (200):

JSON

{
  "count": "integer",
  "next": "url | null",
  "previous": "url | null",
  "results": [
    {
      "id": "uuid",
      "doctor": "integer",
      "doctor_name": "string",
      "patient": "integer",
      "patient_name": "string",
      "consultation_type": "video | audio | chat",
      "status": "scheduled | waiting_room | in_progress | completed | cancelled | no_show | technical_issue",
      "scheduled_start": "datetime",
      "scheduled_end": "datetime",
      "can_join": "boolean",
      "language": "en | te | hi"
    }
  ]
}
3.2 Create Consultation
text

POST /consultation/consultations/
Request Body:

JSON

{
  "patient_id": "uuid (optional) - for doctors",
  "doctor_id": "uuid (optional) - for patients",
  "appointment_id": "uuid (optional) - link to appointment",
  "scheduled_start": "datetime (required)",
  "consultation_type": "video | audio | chat (default: video)",
  "duration_minutes": "integer (default: 15) - 5-60",
  "reason": "string",
  "symptoms": "string",
  "language": "en | te | hi (default: en)"
}
3.3 Create from Appointment
text

POST /consultation/consultations/from-appointment/
Request Body:

JSON

{
  "appointment_id": "uuid (required)",
  "consultation_type": "video | audio | chat (default: video)"
}
3.4 Get Consultation Details
text

GET /consultation/consultations/{id}/
Response (200):

JSON

{
  "id": "uuid",
  "doctor": "integer",
  "doctor_info": {
    "id": "integer",
    "first_name": "string",
    "last_name": "string",
    "full_name": "string",
    "phone": "string",
    "specialization": "string"
  },
  "patient": "integer",
  "patient_info": {
    "id": "integer",
    "first_name": "string",
    "last_name": "string",
    "full_name": "string",
    "phone": "string",
    "gender": "string",
    "age": "string"
  },
  "appointment": "uuid | null",
  "room": {
    "id": "uuid",
    "room_name": "string",
    "jitsi_domain": "meet.jit.si",
    "is_audio_only": "boolean",
    "is_lobby_enabled": "boolean",
    "max_participants": "integer",
    "status": "created | waiting | active | ended | expired",
    "full_room_url": "string",
    "is_active": "boolean",
    "is_expired": "boolean",
    "created_at": "datetime",
    "activated_at": "datetime | null",
    "ended_at": "datetime | null",
    "expires_at": "datetime",
    "doctor_joined_at": "datetime | null",
    "patient_joined_at": "datetime | null"
  },
  "consultation_type": "video | audio | chat",
  "status": "string",
  "scheduled_start": "datetime",
  "scheduled_end": "datetime",
  "actual_start": "datetime | null",
  "actual_end": "datetime | null",
  "estimated_duration": "integer",
  "actual_duration": "integer | null",
  "reason": "string",
  "symptoms": "string",
  "diagnosis": "string",
  "follow_up_required": "boolean",
  "follow_up_notes": "string",
  "follow_up_date": "date | null",
  "cancelled_at": "datetime | null",
  "cancelled_by": "integer | null",
  "cancellation_reason": "string",
  "language": "en | te | hi",
  "notes": [/* ConsultationNote array */],
  "prescriptions": [/* ConsultationPrescription array */],
  "attachments": [/* ConsultationAttachment array */],
  "feedback": {/* ConsultationFeedback or null */},
  "can_join": "boolean",
  "is_upcoming": "boolean",
  "created_at": "datetime",
  "updated_at": "datetime"
}
3.5 Join Consultation
Get join information for video call.

text

POST /consultation/consultations/{id}/join/
Response (200):

JSON

{
  "room_url": "string - Full Jitsi room URL",
  "room_name": "string",
  "jitsi_domain": "meet.jit.si",
  "display_name": "string - User's display name",
  "is_doctor": "boolean",
  "consultation_id": "uuid",
  "config": {
    "startWithAudioMuted": "boolean",
    "startWithVideoMuted": "boolean",
    "enableLobby": "boolean"
  }
}
3.6 Join Waiting Room (Patient)
text

POST /consultation/consultations/{id}/join-waiting-room/
3.7 Start Consultation (Doctor)
text

POST /consultation/consultations/{id}/start/
3.8 End Consultation
text

POST /consultation/consultations/{id}/end/
Request Body:

JSON

{
  "diagnosis": "string",
  "follow_up_required": "boolean (default: false)",
  "follow_up_notes": "string",
  "follow_up_date": "date | null"
}
3.9 Cancel Consultation
text

POST /consultation/consultations/{id}/cancel/
Request Body:

JSON

{
  "reason": "string"
}
3.10 Reschedule Consultation
text

POST /consultation/consultations/{id}/reschedule/
Request Body:

JSON

{
  "new_scheduled_start": "datetime (required)",
  "reason": "string"
}
3.11 Consultation Notes (Doctor)
List Notes
text

GET /consultation/consultations/{consultation_id}/notes/
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "note_type": "subjective | objective | assessment | plan | general",
      "title": "string",
      "is_private": "boolean",
      "created_at": "datetime"
    }
  ]
}
Create Note
text

POST /consultation/consultations/{consultation_id}/notes/
Request Body:

JSON

{
  "note_type": "subjective | objective | assessment | plan | general (default: general)",
  "title": "string (optional)",
  "content": "string (required)",
  "is_private": "boolean (default: false) - Private notes only visible to doctor"
}
Update Note
text

PUT /consultation/consultations/{consultation_id}/notes/{id}/
Delete Note
text

DELETE /consultation/consultations/{consultation_id}/notes/{id}/
3.12 Consultation Prescriptions (Doctor)
List Prescriptions
text

GET /consultation/consultations/{consultation_id}/prescriptions/
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "medicine_name": "string",
      "dosage": "string",
      "frequency": "string",
      "duration": "string",
      "timing": "before_food | after_food | with_food | empty_stomach | bedtime | any_time",
      "is_active": "boolean"
    }
  ]
}
Create Prescription
text

POST /consultation/consultations/{consultation_id}/prescriptions/
Request Body:

JSON

{
  "medicine_id": "uuid (optional) - Link to medicine in database",
  "medicine_name": "string (required)",
  "dosage": "string (required) - e.g., '500mg', '10ml'",
  "frequency": "string (required) - e.g., 'Twice daily'",
  "duration": "string (required) - e.g., '7 days'",
  "timing": "before_food | after_food | with_food | empty_stomach | bedtime | any_time",
  "instructions": "string (optional)",
  "quantity": "integer (optional)",
  "refills_allowed": "integer (default: 0)"
}
Bulk Create Prescriptions
text

POST /consultation/consultations/{consultation_id}/prescriptions/bulk-create/
Request Body:

JSON

{
  "prescriptions": [
    {/* prescription object */},
    {/* prescription object */}
  ]
}
3.13 Consultation Attachments
List Attachments
text

GET /consultation/consultations/{consultation_id}/attachments/
Upload Attachment
text

POST /consultation/consultations/{consultation_id}/attachments/
Request Body:

JSON

{
  "attachment_type": "report | prescription | lab_result | scan | photo | document",
  "file_name": "string (required)",
  "file_url": "url (required) - URL to file in Supabase Storage",
  "file_size": "integer (required) - bytes",
  "mime_type": "string (required)",
  "description": "string (optional)"
}
Delete Attachment
text

DELETE /consultation/consultations/{consultation_id}/attachments/{id}/
3.14 Consultation Feedback (Patient)
Get Feedback
text

GET /consultation/consultations/{consultation_id}/feedback/
Submit Feedback
text

POST /consultation/consultations/{consultation_id}/feedback/
Request Body:

JSON

{
  "overall_rating": "integer (required) - 1-5",
  "communication_rating": "integer (optional) - 1-5",
  "technical_quality_rating": "integer (optional) - 1-5",
  "comments": "string (optional)",
  "would_recommend": "boolean (optional)",
  "had_technical_issues": "boolean (default: false)",
  "technical_issue_description": "string (optional)",
  "is_anonymous": "boolean (default: false)"
}
3.15 Other Consultation Endpoints
Today's Consultations (Doctor)
text

GET /consultation/consultations/today/
Upcoming Consultations
text

GET /consultation/consultations/upcoming/
Waiting Room List (Doctor)
text

GET /consultation/consultations/waiting/
Consultation History
text

GET /consultation/consultations/history/
Quick Data (Dashboard)
text

GET /consultation/consultations/quick-data/
Stats
text

GET /consultation/consultations/stats/
Jitsi Config
text

GET /consultation/jitsi/config/
Response (200):

JSON

{
  "domain": "meet.jit.si",
  "options": {
    "roomPrefix": "mediconnect_",
    "defaultLanguage": "en",
    "enableLobby": true
  }
}
Doctor Feedback Summary
text

GET /consultation/doctors/{doctor_id}/feedback-summary/
4. Diagnosis / Symptom Checker
4.1 Diagnose from Text
AI-powered diagnosis from text description.

text

POST /diagnosis/diagnose/
Request Body:

JSON

{
  "text": "string (required) - e.g., 'I have fever, headache and body pain for 3 days'",
  "language": "en | te | hi (optional) - auto-detect if not provided",
  "patient_age": "integer (optional)",
  "patient_gender": "male | female | other (optional)",
  "symptom_duration_days": "integer (optional)"
}
Response (200):

JSON

{
  "session_id": "string - e.g., DIAG-ABC123XYZ",
  "symptoms_detected": [
    {
      "code": "fever",
      "name": "Fever",
      "name_local": "జ్వరం",
      "category": "general",
      "severity": "moderate"
    }
  ],
  "possible_conditions": [
    {
      "code": "viral_fever",
      "name": "Viral Fever",
      "name_local": "వైరల్ జ్వరం",
      "probability": 0.85,
      "severity": "mild | moderate | severe",
      "description": "string",
      "recommendations": ["Rest", "Stay hydrated"],
      "when_to_see_doctor": "If fever persists for more than 3 days"
    }
  ],
  "urgency_level": "low | medium | high | emergency",
  "general_advice": ["Rest well", "Stay hydrated"],
  "disclaimer": "This is not a medical diagnosis. Please consult a doctor.",
  "created_at": "datetime"
}
4.2 Diagnose from Symptoms
Diagnosis from selected symptom list.

text

POST /diagnosis/diagnose-symptoms/
Request Body:

JSON

{
  "symptoms": ["fever", "headache", "body_pain"],
  "language": "en | te | hi (optional)",
  "patient_age": "integer (optional)",
  "patient_gender": "male | female | other (optional)"
}
4.3 Quick Diagnose
Quick diagnosis without saving to history.

text

POST /diagnosis/quick-diagnose/
4.4 Get Symptoms List
text

GET /diagnosis/symptoms/
Response (200):

JSON

[
  {
    "code": "fever",
    "name": "Fever",
    "name_te": "జ్వరం",
    "name_hi": "बुखार",
    "category": "general | head | chest | abdomen | skin | etc.",
    "description": "string"
  }
]
4.5 Get Symptoms by Category
text

GET /diagnosis/symptoms/by-category/
Response (200):

JSON

{
  "general": [/* symptoms */],
  "head": [/* symptoms */],
  "chest": [/* symptoms */],
  "abdomen": [/* symptoms */]
}
4.6 Search Symptoms
text

GET /diagnosis/symptoms/search/
Query Parameters:

Parameter	Type	Description
q	string	Search query
language	string	en, te, hi
4.7 Get Symptom Details
text

GET /diagnosis/symptoms/{code}/
4.8 Get Diseases List
text

GET /diagnosis/diseases/
4.9 Get Disease Details
text

GET /diagnosis/diseases/{code}/
4.10 Diagnosis History
text

GET /diagnosis/history/
Response (200):

JSON

[
  {
    "session_id": "string",
    "symptoms_count": "integer",
    "top_condition": "string",
    "urgency_level": "string",
    "created_at": "datetime"
  }
]
4.11 Get Session Details
text

GET /diagnosis/session/{session_id}/
4.12 Submit Feedback
text

POST /diagnosis/feedback/
Request Body:

JSON

{
  "session_id": "string (required)",
  "feedback": "helpful | not_helpful | incorrect (required)",
  "comment": "string (optional)"
}
5. Health Records
5.1 Health Profile
Get Profile
text

GET /health-records/profile/
Response (200):

JSON

{
  "id": "uuid",
  "user": {/* UserMinimal */},
  "blood_group": "A+ | A- | B+ | B- | AB+ | AB- | O+ | O- | unknown",
  "height_cm": "decimal | null",
  "weight_kg": "decimal | null",
  "bmi": "number | null",
  "bmi_category": "underweight | normal | overweight | obese | null",
  "allergies": ["list"],
  "chronic_conditions": ["list"],
  "current_medications": ["list"],
  "family_history": {},
  "smoking_status": "never | former | current | unknown",
  "alcohol_consumption": "never | occasional | regular | former | unknown",
  "emergency_contact_name": "string",
  "emergency_contact_phone": "string",
  "emergency_contact_relation": "string",
  "notes": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
Create/Update Profile
text

POST /health-records/profile/
PUT /health-records/profile/{id}/
PATCH /health-records/profile/{id}/
Request Body:

JSON

{
  "blood_group": "string",
  "height_cm": "decimal",
  "weight_kg": "decimal",
  "allergies": ["array"],
  "chronic_conditions": ["array"],
  "current_medications": ["array"],
  "family_history": {},
  "smoking_status": "string",
  "alcohol_consumption": "string",
  "emergency_contact_name": "string",
  "emergency_contact_phone": "string",
  "emergency_contact_relation": "string",
  "notes": "string"
}
Get Profile Summary
text

GET /health-records/profile/summary/
Get Critical Info
text

GET /health-records/profile/critical-info/
5.2 Vital Signs
List Vitals
text

GET /health-records/vitals/
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "recorded_at": "datetime",
      "bp_display": "120/80 mmHg",
      "bp_status": "normal | elevated | high | low",
      "heart_rate": "integer | null",
      "temperature": "decimal | null",
      "oxygen_saturation": "integer | null",
      "blood_sugar": "integer | null",
      "source": "self | clinic | home_device | consultation"
    }
  ]
}
Add Vitals
text

POST /health-records/vitals/
Request Body:

JSON

{
  "recorded_at": "datetime (optional) - defaults to now",
  "systolic_bp": "integer (optional) - mmHg",
  "diastolic_bp": "integer (optional) - mmHg",
  "heart_rate": "integer (optional) - bpm",
  "temperature": "decimal (optional) - °F",
  "respiratory_rate": "integer (optional) - breaths/min",
  "oxygen_saturation": "integer (optional) - SpO2 %",
  "blood_sugar": "integer (optional) - mg/dL",
  "blood_sugar_type": "fasting | pp | random (optional)",
  "weight_kg": "decimal (optional)",
  "source": "self | clinic | home_device | consultation",
  "notes": "string (optional)",
  "consultation": "uuid (optional)"
}
Get Latest Vitals
text

GET /health-records/vitals/latest/
Get Vital Trends
text

GET /health-records/vitals/trends/
Query Parameters:

Parameter	Type	Description
days	integer	Number of days (default: 30)
vital_type	string	bp, heart_rate, blood_sugar, etc.
Get Vital Statistics
text

GET /health-records/vitals/statistics/
5.3 Medical Conditions
List Conditions
text

GET /health-records/conditions/
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "condition_name": "string",
      "condition_name_local": "string",
      "status": "active | resolved | managed | recurring",
      "severity": "mild | moderate | severe",
      "is_chronic": "boolean",
      "diagnosed_date": "date | null"
    }
  ]
}
Add Condition
text

POST /health-records/conditions/
Request Body:

JSON

{
  "condition_name": "string (required)",
  "condition_name_local": "string (optional)",
  "icd_code": "string (optional)",
  "status": "active | resolved | managed | recurring",
  "severity": "mild | moderate | severe",
  "diagnosed_date": "date (optional)",
  "resolved_date": "date (optional)",
  "diagnosed_by": "integer (optional) - doctor user id",
  "diagnosis_session": "uuid (optional)",
  "consultation": "uuid (optional)",
  "treatment_notes": "string (optional)",
  "is_chronic": "boolean (default: false)"
}
Get Active Conditions
text

GET /health-records/conditions/active/
Get Chronic Conditions
text

GET /health-records/conditions/chronic/
Resolve Condition
text

POST /health-records/conditions/{id}/resolve/
5.4 Allergies
List Allergies
text

GET /health-records/allergies/
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "allergen": "string",
      "allergy_type": "drug | food | environmental | insect | latex | animal | other",
      "severity": "mild | moderate | severe | life_threatening",
      "status": "active | inactive | suspected"
    }
  ]
}
Add Allergy
text

POST /health-records/allergies/
Request Body:

JSON

{
  "allergen": "string (required)",
  "allergen_local": "string (optional)",
  "allergy_type": "drug | food | environmental | insect | latex | animal | other",
  "severity": "mild | moderate | severe | life_threatening",
  "reaction": "string (required) - Description of reaction",
  "first_observed": "date (optional)",
  "status": "active | inactive | suspected",
  "diagnosed_by": "string (optional)",
  "notes": "string (optional)"
}
Get Active Allergies
text

GET /health-records/allergies/active/
Get Critical Allergies
text

GET /health-records/allergies/critical/
Get Drug Allergies
text

GET /health-records/allergies/drug/
5.5 Medical Documents
List Documents
text

GET /health-records/documents/
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "document_type": "prescription | lab_report | xray | mri | ct_scan | ultrasound | ecg | blood_report | urine_report | discharge_summary | medical_certificate | insurance | vaccination | other",
      "title": "string",
      "file_type": "string - e.g., pdf, jpg",
      "file_size_display": "string - e.g., 2.5 MB",
      "has_file": "boolean",
      "document_date": "date | null",
      "hospital_name": "string",
      "storage_type": "local | supabase",
      "created_at": "datetime"
    }
  ]
}
Upload Document
text

POST /health-records/documents/
Request Body (multipart/form-data):

JSON

{
  "file": "file (optional) - The document file",
  "document_type": "string (required) - See enum",
  "title": "string (required)",
  "description": "string (optional)",
  "document_date": "date (optional)",
  "hospital_name": "string (optional)",
  "doctor_name": "string (optional)",
  "consultation": "uuid (optional)",
  "medical_condition": "uuid (optional)",
  "is_shared_with_doctors": "boolean (default: true)",
  "tags": ["array of strings"]
}
Get Document Details
text

GET /health-records/documents/{id}/
Get Download URL
text

GET /health-records/documents/{id}/download-url/
Response (200):

JSON

{
  "download_url": "string - Signed URL valid for limited time",
  "expires_in": "integer - seconds"
}
Get Documents by Type
text

GET /health-records/documents/by-type/{doc_type}/
Get Recent Documents
text

GET /health-records/documents/recent/
Toggle Document Sharing
text

POST /health-records/documents/{id}/toggle-sharing/
Delete Document
text

DELETE /health-records/documents/{id}/
5.6 Lab Reports
List Lab Reports
text

GET /health-records/lab-reports/
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "report_name": "string",
      "lab_type": "blood | urine | stool | thyroid | lipid | liver | kidney | diabetes | vitamin | hormone | allergy | infection | other",
      "test_date": "date",
      "lab_name": "string",
      "overall_status": "normal | abnormal | critical | pending",
      "abnormal_count": "integer"
    }
  ]
}
Add Lab Report
text

POST /health-records/lab-reports/
Request Body:

JSON

{
  "report_name": "string (required)",
  "lab_type": "string",
  "test_date": "date (required)",
  "lab_name": "string (optional)",
  "doctor_name": "string (optional)",
  "results": [
    {
      "name": "string (required) - e.g., Hemoglobin",
      "value": "string (required) - e.g., 14.5",
      "unit": "string - e.g., g/dL",
      "normal_range": "string - e.g., 12-16",
      "status": "normal | low | high | abnormal | critical"
    }
  ],
  "overall_status": "normal | abnormal | critical | pending",
  "interpretation": "string (optional)",
  "recommendations": "string (optional)",
  "document": "uuid (optional) - Link to uploaded document",
  "consultation": "uuid (optional)"
}
Get Abnormal Reports
text

GET /health-records/lab-reports/abnormal/
Get Recent Reports
text

GET /health-records/lab-reports/recent/
Get Trends
text

GET /health-records/lab-reports/trends/
Query Parameters:

Parameter	Type	Description
test_name	string	Name of test to get trends for
5.7 Vaccinations
List Vaccinations
text

GET /health-records/vaccinations/
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "vaccine_name": "string",
      "vaccine_type": "covid | flu | hepatitis_a | hepatitis_b | typhoid | tetanus | rabies | polio | mmr | bcg | dpt | chickenpox | hpv | pneumonia | meningitis | yellow_fever | other",
      "dose_number": "integer",
      "total_doses": "integer",
      "is_complete": "boolean",
      "is_due": "boolean",
      "vaccination_date": "date",
      "next_due_date": "date | null",
      "is_verified": "boolean"
    }
  ]
}
Add Vaccination
text

POST /health-records/vaccinations/
Request Body:

JSON

{
  "vaccine_name": "string (required)",
  "vaccine_name_local": "string (optional)",
  "vaccine_type": "string",
  "dose_number": "integer (default: 1)",
  "total_doses": "integer (default: 1)",
  "vaccination_date": "date (required)",
  "next_due_date": "date (optional)",
  "administered_by": "string (optional)",
  "administered_at": "string (optional) - Hospital/Clinic name",
  "batch_number": "string (optional)",
  "manufacturer": "string (optional)",
  "side_effects": "string (optional)",
  "certificate": "uuid (optional) - Link to document"
}
Get Pending Vaccinations
text

GET /health-records/vaccinations/pending/
Get Vaccination Schedule
text

GET /health-records/vaccinations/schedule/
Verify Vaccination (Doctor)
text

POST /health-records/vaccinations/{id}/verify/
5.8 Family Medical History
List Family History
text

GET /health-records/family-history/
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "relation": "father | mother | brother | sister | grandfather_paternal | grandmother_paternal | grandfather_maternal | grandmother_maternal | uncle | aunt | child | spouse | other",
      "relation_display": "string",
      "condition": "string",
      "is_deceased": "boolean"
    }
  ]
}
Add Family History
text

POST /health-records/family-history/
Request Body:

JSON

{
  "relation": "string (required) - See enum",
  "relation_name": "string (optional) - Name of relative",
  "condition": "string (required)",
  "condition_local": "string (optional)",
  "age_at_diagnosis": "integer (optional)",
  "is_deceased": "boolean (default: false)",
  "age_at_death": "integer (optional)",
  "cause_of_death": "string (optional)",
  "notes": "string (optional)"
}
Get Risk Conditions
text

GET /health-records/family-history/risk-conditions/
Get Summary
text

GET /health-records/family-history/summary/
5.9 Hospitalizations
List Hospitalizations
text

GET /health-records/hospitalizations/
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "hospital_name": "string",
      "admission_date": "date",
      "discharge_date": "date | null",
      "duration_days": "integer | null",
      "admission_type": "emergency | planned | transfer",
      "reason": "string"
    }
  ]
}
Add Hospitalization
text

POST /health-records/hospitalizations/
Request Body:

JSON

{
  "hospital_name": "string (required)",
  "hospital_address": "string (optional)",
  "admission_date": "date (required)",
  "discharge_date": "date (optional)",
  "admission_type": "emergency | planned | transfer",
  "reason": "string (required)",
  "diagnosis": "string (optional)",
  "treating_doctor": "string (optional)",
  "department": "string (optional)",
  "procedures": ["array of procedures"],
  "discharge_summary": "string (optional)",
  "discharge_document": "uuid (optional)",
  "consultation": "uuid (optional)",
  "follow_up_date": "date (optional)",
  "follow_up_notes": "string (optional)"
}
Get Pending Follow-ups
text

GET /health-records/hospitalizations/pending-followups/
5.10 Record Sharing
List Shared Records
text

GET /health-records/sharing/
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "doctor": {/* DoctorMinimal */},
      "share_type": "all | profile | documents | conditions | lab_reports | vaccinations",
      "is_permanent": "boolean",
      "expires_at": "datetime | null",
      "is_active": "boolean",
      "is_expired": "boolean",
      "access_count": "integer",
      "created_at": "datetime"
    }
  ]
}
Share Records with Doctor
text

POST /health-records/sharing/
Request Body:

JSON

{
  "doctor_id": "uuid (required)",
  "share_type": "all | profile | documents | conditions | lab_reports | vaccinations (default: all)",
  "documents": ["array of document UUIDs"] ,
  "is_permanent": "boolean (default: false)",
  "expires_at": "datetime (optional)",
  "consultation": "uuid (optional)"
}
Get My Shares (Patient)
text

GET /health-records/sharing/my-shares/
Get Accessible Patients (Doctor)
text

GET /health-records/sharing/accessible-patients/
Get Patient Records (Doctor)
text

GET /health-records/sharing/patient/{patient_id}/records/
Revoke Sharing
text

DELETE /health-records/sharing/{id}/
5.11 Health Analytics
Get Summary
text

GET /health-records/analytics/summary/
Get Health Score
text

GET /health-records/analytics/score/
Get Timeline
text

GET /health-records/analytics/timeline/
Get Quick Data
text

GET /health-records/analytics/quick-data/
6. Medicine
6.1 Search Medicines
text

POST /medicine/medicines/search/
Request Body:

JSON

{
  "query": "string (required) - Search term",
  "category": "string (optional) - Filter by category",
  "medicine_type": "tablet | capsule | syrup | injection | drops | cream | gel | powder | inhaler | spray | patch | suppository | suspension | solution | other (optional)",
  "generic_only": "boolean (default: false)",
  "otc_only": "boolean (default: false) - Only OTC medicines",
  "limit": "integer (default: 20, max: 100)"
}
Response (200):

JSON

{
  "results": [
    {
      "id": "uuid",
      "name": "string",
      "name_generic": "string",
      "name_local": "string",
      "brand_name": "string",
      "manufacturer": "string",
      "medicine_type": "string",
      "medicine_type_display": "string",
      "strength": "string",
      "prescription_type": "otc | prescription | controlled",
      "prescription_type_display": "string",
      "mrp": "decimal | null",
      "category": "string",
      "is_generic": "boolean"
    }
  ],
  "total": "integer"
}
6.2 List Medicines
text

GET /medicine/medicines/
Query Parameters:

Parameter	Type	Description
page	integer	Page number
category	string	Filter by category
type	string	Filter by medicine type
6.3 Get Medicine Details
text

GET /medicine/medicines/{id}/
Response (200):

JSON

{
  "id": "uuid",
  "name": "string",
  "name_generic": "string",
  "name_local": "string",
  "localized_name": "string - Based on user's language",
  "brand_name": "string",
  "manufacturer": "string",
  "medicine_type": "string",
  "medicine_type_display": "string",
  "strength": "string",
  "pack_size": "string",
  "prescription_type": "string",
  "prescription_type_display": "string",
  "mrp": "decimal | null",
  "composition": "string",
  "uses": "string",
  "uses_local": "string",
  "localized_uses": "string",
  "dosage_info": "string",
  "dosage_info_local": "string",
  "localized_dosage": "string",
  "side_effects": "string",
  "side_effects_local": "string",
  "localized_side_effects": "string",
  "warnings": "string",
  "warnings_local": "string",
  "localized_warnings": "string",
  "contraindications": "string",
  "storage_info": "string",
  "category": "string",
  "subcategory": "string",
  "is_generic": "boolean",
  "is_habit_forming": "boolean",
  "requires_refrigeration": "boolean",
  "alternatives_count": "integer",
  "interactions_count": "integer",
  "is_verified": "boolean"
}
6.4 Get Alternatives
text

GET /medicine/medicines/{id}/alternatives/
Response (200):

JSON

{
  "medicine": {/* MedicineList */},
  "alternatives": [
    {
      "medicine": {/* MedicineList */},
      "price_difference": "decimal",
      "is_cheaper": "boolean"
    }
  ]
}
6.5 Get Interactions
text

GET /medicine/medicines/{id}/interactions/
Response (200):

JSON

{
  "medicine": {/* MedicineList */},
  "interactions": [
    {
      "interacting_medicine": {/* MedicineList */},
      "severity": "mild | moderate | severe",
      "description": "string",
      "recommendation": "string"
    }
  ]
}
6.6 Check Multiple Interactions
text

POST /medicine/medicines/check-interactions/
Request Body:

JSON

{
  "medicine_ids": ["uuid", "uuid"] 
}
Response (200):

JSON

{
  "medicines": [/* MedicineList array */],
  "interactions": [
    {
      "medicine_1": "uuid",
      "medicine_2": "uuid",
      "severity": "string",
      "description": "string"
    }
  ],
  "has_severe_interactions": "boolean"
}
6.7 Get Categories
text

GET /medicine/medicines/categories/
6.8 Get Types
text

GET /medicine/medicines/types/
6.9 Get Popular Medicines
text

GET /medicine/medicines/popular/
6.10 Search History
Get History
text

GET /medicine/medicines/search-history/
Clear History
text

DELETE /medicine/medicines/search-history/clear/
6.11 User Prescriptions
List Prescriptions
text

GET /medicine/prescriptions/
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "title": "string",
      "doctor_name": "string",
      "prescribed_date": "date",
      "valid_until": "date | null",
      "status": "active | completed | discontinued | expired",
      "status_display": "string",
      "medicines_count": "integer",
      "is_expired": "boolean"
    }
  ]
}
Create Prescription
text

POST /medicine/prescriptions/
Request Body:

JSON

{
  "title": "string (required) - e.g., 'For Fever'",
  "doctor_name": "string (optional)",
  "hospital_name": "string (optional)",
  "prescribed_date": "date (required)",
  "valid_until": "date (optional)",
  "diagnosis": "string (optional)",
  "notes": "string (optional)",
  "image_url": "url (optional) - Uploaded prescription image",
  "medicines": [
    {
      "medicine": "uuid (optional) - Link to medicine in database",
      "medicine_name": "string (required)",
      "dosage": "string (required) - e.g., '1 tablet'",
      "frequency": "once_daily | twice_daily | thrice_daily | four_times | every_4_hours | every_6_hours | every_8_hours | every_12_hours | weekly | as_needed | custom",
      "timing": "before_food | after_food | with_food | empty_stomach | bedtime | morning | any_time",
      "custom_times": ["08:00", "14:00", "20:00"],
      "duration_days": "integer (optional)",
      "start_date": "date (optional) - defaults to today",
      "end_date": "date (optional)",
      "special_instructions": "string (optional)",
      "quantity_prescribed": "integer (optional)"
    }
  ]
}
Get Prescription Details
text

GET /medicine/prescriptions/{id}/
Update Prescription
text

PUT /medicine/prescriptions/{id}/
PATCH /medicine/prescriptions/{id}/
Delete Prescription
text

DELETE /medicine/prescriptions/{id}/
Get Active Prescriptions
text

GET /medicine/prescriptions/active/
Get Current Medicines
text

GET /medicine/prescriptions/current-medicines/
Add Medicine to Prescription
text

POST /medicine/prescriptions/{id}/add-medicine/
Complete Prescription
text

POST /medicine/prescriptions/{id}/complete/
Discontinue Prescription
text

POST /medicine/prescriptions/{id}/discontinue/
Check Interactions
text

POST /medicine/prescriptions/check-interactions/
Get Stats
text

GET /medicine/prescriptions/stats/
6.12 Medicine Reminders
List Reminders
text

GET /medicine/reminders/
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "medicine_name": "string",
      "dosage": "string",
      "reminder_times": ["08:00", "20:00"],
      "times_display": "string - e.g., '8:00 AM, 8:00 PM'",
      "start_date": "date",
      "end_date": "date | null",
      "status": "active | paused | completed | cancelled",
      "status_display": "string",
      "is_active_today": "boolean"
    }
  ]
}
Create Reminder
text

POST /medicine/reminders/
Request Body:

JSON

{
  "prescription_medicine": "uuid (optional) - Link to prescription medicine",
  "medicine_name": "string (required)",
  "dosage": "string (required)",
  "reminder_times": ["08:00", "14:00", "20:00"],
  "days_of_week": [0, 1, 2, 3, 4, 5, 6],
  "start_date": "date (required)",
  "end_date": "date (optional)",
  "instructions": "string (optional) - e.g., 'Take after food'",
  "notify_before_minutes": "integer (default: 5)",
  "notify_family_helper": "boolean (default: false)",
  "allow_snooze": "boolean (default: true)",
  "snooze_minutes": "integer (default: 10)",
  "max_snoozes": "integer (default: 3)"
}
Get Reminder Details
text

GET /medicine/reminders/{id}/
Response (200):

JSON

{
  "id": "uuid",
  "prescription_medicine": "uuid | null",
  "prescription_medicine_details": {/* PrescriptionMedicine or null */},
  "medicine_name": "string",
  "dosage": "string",
  "reminder_times": ["array"],
  "days_of_week": [0, 1, 2, 3, 4, 5, 6],
  "start_date": "date",
  "end_date": "date | null",
  "instructions": "string",
  "instructions_local": "string",
  "status": "string",
  "status_display": "string",
  "notify_before_minutes": "integer",
  "notify_family_helper": "boolean",
  "allow_snooze": "boolean",
  "snooze_minutes": "integer",
  "max_snoozes": "integer",
  "is_active_today": "boolean",
  "next_reminder_time": "datetime | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
Update Reminder
text

PUT /medicine/reminders/{id}/
PATCH /medicine/reminders/{id}/
Delete Reminder
text

DELETE /medicine/reminders/{id}/
Get Today's Reminders
text

GET /medicine/reminders/today/
Get Upcoming Reminders
text

GET /medicine/reminders/upcoming/
Pause Reminder
text

POST /medicine/reminders/{id}/pause/
Resume Reminder
text

POST /medicine/reminders/{id}/resume/
Cancel Reminder
text

POST /medicine/reminders/{id}/cancel/
Get Adherence Stats
text

GET /medicine/reminders/adherence/
6.13 Reminder Logs
List Logs
text

GET /medicine/reminder-logs/
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "medicine_name": "string",
      "scheduled_date": "date",
      "scheduled_time": "HH:MM:SS",
      "response": "pending | taken | skipped | snoozed | missed",
      "response_display": "string",
      "responded_at": "datetime | null"
    }
  ]
}
Respond to Reminder
text

POST /medicine/reminder-logs/{id}/respond/
Request Body:

JSON

{
  "response": "taken | skipped | snoozed (required)",
  "notes": "string (optional) - e.g., 'Felt side effects'"
}
Quick: Mark as Taken
text

POST /medicine/reminder-logs/{id}/taken/
Quick: Mark as Skipped
text

POST /medicine/reminder-logs/{id}/skipped/

Snooze Reminder
text

POST /medicine/reminder-logs/{id}/snooze/
6.14 Quick Data (Dashboard)
text

GET /medicine/quick-data/
Response (200):

JSON

{
  "today_reminders": [/* MedicineReminderList array */],
  "active_prescriptions": [/* UserPrescriptionList array */],
  "upcoming_reminders": [/* ReminderLogList array */],
  "adherence_rate": "decimal - percentage",
  "pending_reminders_count": "integer"
}
7. Chatbot
7.1 Start Session
text

POST /chatbot/session/start/
Request Body:

JSON

{
  "language": "en | te | hi (optional)",
  "context": "string (optional) - Initial context"
}
Response (201):

JSON

{
  "session_id": "uuid",
  "welcome_message": "string",
  "suggestions": ["How can I help?", "Check symptoms", "Find a doctor"]
}
7.2 Send Message
text

POST /chatbot/message/
Request Body:

JSON

{
  "session_id": "uuid (required)",
  "message": "string (required)",
  "language": "en | te | hi (optional)"
}
Response (200):

JSON

{
  "message_id": "uuid",
  "response": "string - Bot response",
  "response_type": "text | action | suggestion",
  "suggestions": ["array of quick replies"],
  "actions": [
    {
      "type": "book_appointment | check_symptoms | view_doctors",
      "label": "string",
      "data": {}
    }
  ],
  "language": "string"
}
7.3 Send Voice Message
text

POST /chatbot/message/voice/
Request Body (multipart/form-data):

JSON

{
  "session_id": "uuid (required)",
  "audio": "file (required) - Audio file",
  "language": "en | te | hi (optional)"
}
7.4 Get Session Messages
text

GET /chatbot/session/{session_id}/messages/
Response (200):

JSON

{
  "session_id": "uuid",
  "messages": [
    {
      "id": "uuid",
      "sender": "user | bot",
      "message": "string",
      "timestamp": "datetime",
      "language": "string"
    }
  ]
}
7.5 End Session
text

POST /chatbot/session/{session_id}/end/
7.6 Get Session Details
text

GET /chatbot/session/{session_id}/
7.7 Delete Session
text

DELETE /chatbot/session/{session_id}/delete/
7.8 List Sessions
text

GET /chatbot/sessions/
7.9 Get FAQs
text

GET /chatbot/faq/
Query Parameters:

Parameter	Type	Description
category	string	Filter by category
language	string	en, te, hi
Response (200):

JSON

[
  {
    "id": "uuid",
    "question": "string",
    "answer": "string",
    "category": "string",
    "helpful_count": "integer"
  }
]
7.10 Get FAQ Categories
text

GET /chatbot/faq/categories/
7.11 Mark FAQ Helpful
text

POST /chatbot/faq/{faq_id}/helpful/
7.12 Get Health Tips
text

GET /chatbot/health-tips/
Response (200):

JSON

[
  {
    "id": "uuid",
    "title": "string",
    "content": "string",
    "category": "string",
    "image_url": "url | null",
    "likes_count": "integer"
  }
]
7.13 Get Daily Health Tip
text

GET /chatbot/health-tips/daily/
7.14 Like Health Tip
text

POST /chatbot/health-tips/{tip_id}/like/
7.15 Get Suggestions
text

GET /chatbot/suggestions/
Query Parameters:

Parameter	Type	Description
context	string	Current context for relevant suggestions
7.16 Translate Text
text

POST /chatbot/translate/
Request Body:

JSON

{
  "text": "string (required)",
  "source_language": "en | te | hi (optional) - auto-detect if not provided",
  "target_language": "en | te | hi (required)"
}
Response (200):

JSON

{
  "original_text": "string",
  "translated_text": "string",
  "source_language": "string",
  "target_language": "string"
}
7.17 Text to Speech
text

POST /chatbot/text-to-speech/
Request Body:

JSON

{
  "text": "string (required)",
  "language": "en | te | hi (required)"
}
Response (200):

JSON

{
  "audio_url": "url - URL to audio file",
  "duration_seconds": "number"
}
7.18 Detect Language
text

POST /chatbot/detect-language/
Request Body:

JSON

{
  "text": "string (required)"
}
Response (200):

JSON

{
  "detected_language": "en | te | hi",
  "confidence": "decimal"
}
7.19 Submit Feedback
Message Feedback
text

POST /chatbot/feedback/message/
Request Body:

JSON

{
  "message_id": "uuid (required)",
  "feedback": "helpful | not_helpful (required)",
  "comment": "string (optional)"
}
Conversation Feedback
text

POST /chatbot/feedback/conversation/
Request Body:

JSON

{
  "session_id": "uuid (required)",
  "rating": "integer (required) - 1-5",
  "comment": "string (optional)"
}
7.20 Get Stats
text

GET /chatbot/stats/
8. Emergency
8.1 Trigger SOS
text

POST /emergency/sos/trigger/
Request Body:

JSON

{
  "emergency_type": "medical | accident | heart | breathing | unconscious | bleeding | burn | poison | snake_bite | pregnancy | child | other (default: medical)",
  "latitude": "decimal (optional)",
  "longitude": "decimal (optional)",
  "location_accuracy": "number (optional) - GPS accuracy in meters",
  "description": "string (optional) - Details about emergency"
}
Response (201):

JSON

{
  "id": "uuid",
  "user_name": "string",
  "user_phone": "string",
  "emergency_type": "string",
  "emergency_type_display": "string",
  "status": "triggered",
  "status_display": "Triggered",
  "latitude": "decimal | null",
  "longitude": "decimal | null",
  "location_address": "string - Reverse geocoded",
  "contacts_notified": ["list of contact IDs"],
  "services_notified": ["list of service IDs"],
  "notification_sent_at": "datetime | null",
  "created_at": "datetime"
}
8.2 Quick SOS Trigger
Minimal data for fastest response.

text

POST /emergency/sos/quick-trigger/
Request Body:

JSON

{
  "emergency_type": "medical (default)",
  "latitude": "decimal (optional)",
  "longitude": "decimal (optional)",
  "use_cached_location": "boolean (default: true)"
}
8.3 Get Active SOS
text

GET /emergency/sos/active/
Response (200):

JSON

{
  "id": "uuid",
  "emergency_type": "string",
  "emergency_type_display": "string",
  "status": "string",
  "status_display": "string",
  "location_address": "string",
  "acknowledged_by": "string | null",
  "acknowledged_at": "datetime | null",
  "responder_eta": "integer | null - minutes",
  "time_elapsed": "string",
  "created_at": "datetime"
}
8.4 Cancel SOS
text

POST /emergency/sos/{id}/cancel/
Request Body:

JSON

{
  "reason": "mistake | resolved | help_arrived | other (required)",
  "notes": "string (optional)"
}
8.5 Update SOS Status
text

POST /emergency/sos/{id}/update-status/
Request Body:

JSON

{
  "status": "triggered | notifying | acknowledged | responding | resolved | cancelled | false_alarm",
  "acknowledged_by": "string (optional)",
  "responder_eta": "integer (optional) - minutes",
  "resolution_notes": "string (optional)"
}
8.6 SOS History
text

GET /emergency/sos/history/
8.7 Get SOS Types
text

GET /emergency/sos/types/
Response (200):

JSON

[
  {
    "value": "medical",
    "label": "Medical Emergency",
    "label_te": "వైద్య అత్యవసర పరిస్థితి",
    "label_hi": "चिकित्सा आपातकाल",
    "icon": "string"
  }
]
8.8 SOS Statistics
text

GET /emergency/sos/statistics/
8.9 Emergency Contacts
List Contacts
text

GET /emergency/contacts/
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "name": "string",
      "phone_number": "string",
      "relationship": "spouse | parent | child | sibling | relative | friend | neighbor | doctor | other",
      "relationship_display": "string",
      "priority": "integer - 1-10",
      "is_active": "boolean",
      "notify_on_sos": "boolean"
    }
  ]
}
Add Contact
text

POST /emergency/contacts/
Request Body:

JSON

{
  "name": "string (required)",
  "phone_number": "string (required) - 10 digit",
  "alternate_phone": "string (optional)",
  "relationship": "string (required) - See enum",
  "priority": "integer (default: 5) - 1=highest, 10=lowest",
  "is_active": "boolean (default: true)",
  "notify_on_sos": "boolean (default: true)",
  "share_location": "boolean (default: true)"
}
Update Contact
text

PUT /emergency/contacts/{id}/
PATCH /emergency/contacts/{id}/
Delete Contact
text

DELETE /emergency/contacts/{id}/
Reorder Contacts
text

POST /emergency/contacts/reorder/
Request Body:

JSON

{
  "contacts": [
    {"id": "uuid", "priority": 1},
    {"id": "uuid", "priority": 2}
  ]
}
8.10 Emergency Services
List Services
text

GET /emergency/services/
Query Parameters:

Parameter	Type	Description
type	string	hospital, clinic, phc, ambulance, pharmacy, etc.
district	string	Filter by district
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "name": "string",
      "name_local": "string",
      "service_type": "hospital | clinic | phc | ambulance | helpline | blood_bank | pharmacy | police | fire",
      "service_type_display": "string",
      "phone_primary": "string",
      "phone_emergency": "string | null",
      "address": "string",
      "landmark": "string",
      "district": "string",
      "latitude": "decimal | null",
      "longitude": "decimal | null",
      "distance_km": "decimal | null - If location provided",
      "is_24x7": "boolean",
      "has_emergency_ward": "boolean",
      "is_government": "boolean"
    }
  ]
}
Find Nearby Services
text

POST /emergency/services/nearby/
Request Body:

JSON

{
  "latitude": "decimal (required)",
  "longitude": "decimal (required)",
  "radius_km": "integer (default: 10)",
  "service_type": "string (optional)",
  "limit": "integer (default: 10)"
}
Get Services by District
text

GET /emergency/services/by-district/
Query Parameters:

Parameter	Type	Description
district	string	District name
type	string	Service type
8.11 Emergency Helplines
List Helplines
text

GET /emergency/helplines/
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "name": "string",
      "helpline_type": "ambulance | police | fire | women | child | disaster | poison | mental_health | covid | other",
      "helpline_type_display": "string",
      "number": "string",
      "is_24x7": "boolean",
      "is_toll_free": "boolean"
    }
  ]
}
Get Important Helplines
text

GET /emergency/helplines/important/
Get Helplines by Type
text

GET /emergency/helplines/by-type/{helpline_type}/
8.12 First Aid Guides
List Guides
text

GET /emergency/first-aid/
Response (200):

JSON

{
  "count": "integer",
  "results": [
    {
      "id": "uuid",
      "title": "string",
      "category": "bleeding | burns | choking | cpr | fracture | heart_attack | stroke | poisoning | snake_bite | dog_bite | drowning | electric_shock | fainting | seizure | heat_stroke | pregnancy | child | allergy",
      "category_display": "string",
      "is_critical": "boolean",
      "image_url": "url | null"
    }
  ]
}
Get Guide Details
text

GET /emergency/first-aid/{id}/
Response (200):

JSON

{
  "id": "uuid",
  "title": "string - Localized",
  "title_en": "string",
  "title_te": "string",
  "title_hi": "string",
  "category": "string",
  "category_display": "string",
  "symptoms": "string - Localized",
  "symptoms_en": "string",
  "symptoms_te": "string",
  "symptoms_hi": "string",
  "steps": ["array - Localized steps"],
  "steps_en": ["array"],
  "steps_te": ["array"],
  "steps_hi": ["array"],
  "donts": ["array - What NOT to do"],
  "donts_en": ["array"],
  "donts_te": ["array"],
  "donts_hi": ["array"],
  "call_help": "string - When to call help",
  "call_help_en": "string",
  "call_help_te": "string",
  "call_help_hi": "string",
  "image_url": "url | null",
  "video_url": "url | null",
  "is_critical": "boolean",
  "display_order": "integer"
}
Get Critical Guides
text

GET /emergency/first-aid/critical/
Get Guides by Category
text

GET /emergency/first-aid/by-category/{category}/
8.13 Location
Get Cached Location
text

GET /emergency/location/
Update Location
text

POST /emergency/location/update/
Request Body:

JSON

{
  "latitude": "decimal (required)",
  "longitude": "decimal (required)",
  "accuracy": "number (optional)"
}
8.14 Quick SOS Data
Get all data needed for SOS screen.

text

GET /emergency/quick-sos-data/
Response (200):

JSON

{
  "emergency_contacts": [/* EmergencyContactList array */],
  "important_helplines": [/* EmergencyHelplineList array */],
  "nearby_hospitals": [/* EmergencyServiceList array - if location available */],
  "emergency_types": [/* SOS types with translations */],
  "user_location": {
    "latitude": "decimal | null",
    "longitude": "decimal | null",
    "address": "string | null"
  }
}
9. Notifications
9.1 List Notifications
text

GET /notifications/
Query Parameters:

Parameter	Type	Description
unread_only	boolean	Only unread notifications
type	string	Filter by notification type
page	integer	Page number
page_size	integer	Items per page (max 100)
Response (200):

JSON

{
  "count": "integer",
  "next": "url | null",
  "previous": "url | null",
  "results": [
    {
      "id": "uuid",
      "type": "appointment | consultation | reminder | emergency | system | promotion",
      "title": "string",
      "message": "string",
      "data": {},
      "is_read": "boolean",
      "read_at": "datetime | null",
      "created_at": "datetime"
    }
  ]
}
9.2 Get Notification Details
text

GET /notifications/{notification_id}/
9.3 Mark as Read
Mark Single
text

POST /notifications/{notification_id}/read/
Mark Multiple
text

POST /notifications/mark-read/
Request Body:

JSON

{
  "notification_ids": ["uuid", "uuid"]
}
If notification_ids not provided, marks all as read.

9.4 Delete Notification
text

DELETE /notifications/{notification_id}/delete/
9.5 Clear All
text

DELETE /notifications/clear/
Query Parameters:

Parameter	Type	Description
read_only	boolean	Only delete read notifications
9.6 Get Unread Count
text

GET /notifications/unread-count/
Response (200):

JSON

{
  "unread_count": "integer"
}
9.7 Notification Preferences
Get Preferences
text

GET /notifications/preferences/
Response (200):

JSON

{
  "push_enabled": "boolean",
  "sms_enabled": "boolean",
  "email_enabled": "boolean",
  "appointment_reminders": "boolean",
  "medicine_reminders": "boolean",
  "consultation_updates": "boolean",
  "health_tips": "boolean",
  "promotional": "boolean",
  "quiet_hours_enabled": "boolean",
  "quiet_hours_start": "HH:MM",
  "quiet_hours_end": "HH:MM"
}
Update Preferences
text

PUT /notifications/preferences/update/
PATCH /notifications/preferences/update/
Request Body:

JSON

{
  "push_enabled": "boolean",
  "sms_enabled": "boolean",
  "appointment_reminders": "boolean",
  "medicine_reminders": "boolean",
  "consultation_updates": "boolean",
  "health_tips": "boolean",
  "promotional": "boolean"
}
Update Quiet Hours
text

POST /notifications/preferences/quiet-hours/
Request Body:

JSON

{
  "enabled": "boolean",
  "start_time": "HH:MM",
  "end_time": "HH:MM"
}
Update Type Preference
text

POST /notifications/preferences/type/
Request Body:

JSON

{
  "type": "appointment | consultation | reminder | etc.",
  "enabled": "boolean"
}
9.8 Device Registration
Register Device
text

POST /notifications/device/register/
Request Body:

JSON

{
  "fcm_token": "string (required)",
  "device_type": "android | ios | web (optional)",
  "device_name": "string (optional)"
}
Unregister Device
text

POST /notifications/device/unregister/
Request Body:

JSON

{
  "fcm_token": "string (required)"
}
List Devices
text

GET /notifications/devices/
9.9 Scheduled Notifications
List Scheduled
text

GET /notifications/scheduled/
Create Scheduled
text

POST /notifications/scheduled/create/
Request Body:

JSON

{
  "title": "string (required)",
  "message": "string (required)",
  "scheduled_time": "datetime (required)",
  "repeat": "none | daily | weekly | monthly (optional)"
}
Toggle Scheduled
text

POST /notifications/scheduled/{scheduled_id}/toggle/
Delete Scheduled
text

DELETE /notifications/scheduled/{scheduled_id}/delete/
9.10 Stats
text

GET /notifications/stats/
Response (200):

JSON

{
  "total_count": "integer",
  "unread_count": "integer",
  "by_type": {
    "appointment": "integer",
    "consultation": "integer",
    "reminder": "integer"
  }
}
9.11 Test Notification
text

POST /notifications/test/
Sends a test notification to verify FCM setup.

10. Enums & Constants
10.1 User Roles
text

patient | doctor
10.2 Languages
text

en (English) | te (Telugu) | hi (Hindi)
10.3 Gender
text

male | female | other
10.4 Blood Groups
text

A+ | A- | B+ | B- | AB+ | AB- | O+ | O-
10.5 Specializations
text

general | pediatrics | gynecology | orthopedics | dermatology | ent | ophthalmology | cardiology | neurology | psychiatry | dentistry | ayurveda | homeopathy | other
10.6 Appointment Status
text

pending | confirmed | checked_in | in_progress | completed | cancelled | no_show | rescheduled
10.7 Appointment Booking Type
text

online | walk_in | phone | follow_up
10.8 Queue Status
text

waiting | called | in_consultation | completed | skipped
10.9 Consultation Type
text

video | audio | chat
10.10 Consultation Status
text

scheduled | waiting_room | in_progress | completed | cancelled | no_show | technical_issue
10.11 Medicine Types
text

tablet | capsule | syrup | injection | drops | cream | gel | powder | inhaler | spray | patch | suppository | suspension | solution | other
10.12 Prescription Types
text

otc (Over-the-counter) | prescription | controlled
10.13 Medicine Frequency
text

once_daily | twice_daily | thrice_daily | four_times | every_4_hours | every_6_hours | every_8_hours | every_12_hours | weekly | as_needed | custom
10.14 Medicine Timing
text

before_food | after_food | with_food | empty_stomach | bedtime | morning | any_time
10.15 Reminder Response
text

pending | taken | skipped | snoozed | missed
10.16 Reminder Status
text

active | paused | completed | cancelled
10.17 Allergy Types
text

drug | food | environmental | insect | latex | animal | other
10.18 Allergy Severity
text

mild | moderate | severe | life_threatening
10.19 Condition Status
text

active | resolved | managed | recurring
10.20 Condition Severity
text

mild | moderate | severe
10.21 Document Types
text

prescription | lab_report | xray | mri | ct_scan | ultrasound | ecg | blood_report | urine_report | discharge_summary | medical_certificate | insurance | vaccination | other
10.22 Lab Report Types
text

blood | urine | stool | thyroid | lipid | liver | kidney | diabetes | vitamin | hormone | allergy | infection | other
10.23 Lab Result Status
text

normal | low | high | abnormal | critical
10.24 Vaccine Types
text

covid | flu | hepatitis_a | hepatitis_b | typhoid | tetanus | rabies | polio | mmr | bcg | dpt | chickenpox | hpv | pneumonia | meningitis | yellow_fever | other
10.25 Family Relations
text

father | mother | brother | sister | grandfather_paternal | grandmother_paternal | grandfather_maternal | grandmother_maternal | uncle | aunt | child | spouse | other
10.26 Share Types
text

all | profile | documents | conditions | lab_reports | vaccinations
10.27 Emergency Types
text

medical | accident | heart | breathing | unconscious | bleeding | burn | poison | snake_bite | pregnancy | child | other
10.28 SOS Status
text

triggered | notifying | acknowledged | responding | resolved | cancelled | false_alarm
10.29 Emergency Contact Relationships
text

spouse | parent | child | sibling | relative | friend | neighbor | doctor | other
10.30 Emergency Service Types
text

hospital | clinic | phc | ambulance | helpline | blood_bank | pharmacy | police | fire
10.31 Helpline Types
text

ambulance | police | fire | women | child | disaster | poison | mental_health | covid | other
10.32 First Aid Categories
text

bleeding | burns | choking | cpr | fracture | heart_attack | stroke | poisoning | snake_bite | dog_bite | drowning | electric_shock | fainting | seizure | heat_stroke | pregnancy | child | allergy
10.33 Day of Week
text

0 (Monday) | 1 (Tuesday) | 2 (Wednesday) | 3 (Thursday) | 4 (Friday) | 5 (Saturday) | 6 (Sunday)
10.34 Schedule Exception Types
text

leave | modified | extra
10.35 Verification Status (Doctor)
text

pending | verified | rejected
10.36 Helper Relationships
text

spouse | son | daughter | father | mother | brother | sister | grandson | granddaughter | other
11. Error Handling
Error Response Format
JSON

{
  "success": false,
  "error": {
    "code": "string - Error code",
    "message": "string - Human readable message",
    "details": {} 
  }
}
Common HTTP Status Codes
Code	Description
200	Success
201	Created
204	No Content (successful delete)
400	Bad Request - Validation error
401	Unauthorized - Missing/invalid token
403	Forbidden - No permission
404	Not Found
409	Conflict - Resource already exists
422	Unprocessable Entity
429	Too Many Requests - Rate limited
500	Internal Server Error
Validation Errors (400)
JSON

{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field_name": ["Error message 1", "Error message 2"],
      "another_field": ["Error message"]
    }
  }
}
Authentication Errors (401)
JSON

{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Access token has expired"
  }
}
Action: Use refresh token to get new access token.

Permission Errors (403)
JSON

{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You don't have permission to access this resource"
  }
}
12. Pagination
Request
All list endpoints support pagination:

text

GET /endpoint/?page=1&page_size=20
Parameter	Type	Default	Max
page	integer	1	-
page_size	integer	20	100
Response
JSON

{
  "count": 150,
  "next": "http://localhost:8000/api/v1/endpoint/?page=2",
  "previous": null,
  "results": [/* array of items */]
}
Field	Description
count	Total number of items
next	URL for next page (null if last page)
previous	URL for previous page (null if first page)
results	Array of items for current page
13. Rate Limiting
API endpoints may be rate limited. When rate limited:

Response (429):

JSON

{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 60
  }
}
Headers:

text

X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699876543
Retry-After: 60
14. File Uploads
Supported File Types
Category	Extensions	Max Size
Images	jpg, jpeg, png, gif, webp	10 MB
Documents	pdf, doc, docx	20 MB
Medical Images	jpg, png, dicom	50 MB
Upload Process
Direct Upload: Use multipart/form-data for small files
Supabase Storage: For larger files, get signed URL and upload directly
Multipart Request Example
text

POST /health-records/documents/
Content-Type: multipart/form-data

file: [binary data]
document_type: lab_report
title: Blood Test Report
15. Websocket Endpoints (Future)
Note: These are planned for real-time features

text

ws://localhost:8000/ws/notifications/
ws://localhost:8000/ws/consultation/{consultation_id}/
ws://localhost:8000/ws/queue/{doctor_id}/
16. Health Check
text

GET /auth/health/
GET /appointments/health/
GET /consultation/health/
GET /diagnosis/health/
GET /health-records/health/
GET /medicine/health/
GET /chatbot/health/
GET /emergency/health/
GET /notifications/health/
Response (200):

JSON

{
  "success": true,
  "app": "app_name",
  "status": "healthy"
}
Quick Reference - Most Used Endpoints
Patient App
Feature	Endpoint	Method
Login	/auth/login/	POST
Register	/auth/register/patient/	POST
Get Profile	/auth/profile/	GET
List Doctors	/auth/doctors/	GET
Book Appointment	/appointments/appointments/	POST
My Appointments	/appointments/appointments/?upcoming=true	GET
Check In	/appointments/appointments/{id}/check_in/	POST
Join Consultation	/consultation/consultations/{id}/join/	POST
Check Symptoms	/diagnosis/diagnose/	POST
My Health Records	/health-records/profile/	GET
Add Vitals	/health-records/vitals/	POST
Search Medicines	/medicine/medicines/search/	POST
Today's Reminders	/medicine/reminders/today/	GET
Trigger SOS	/emergency/sos/trigger/	POST
Chat with Bot	/chatbot/message/	POST
Notifications	/notifications/	GET
Doctor App
Feature	Endpoint	Method
Login	/auth/login/	POST
Register	/auth/register/doctor/	POST
Get Profile	/auth/profile/	GET
Today's Summary	/appointments/appointments/today_summary/	GET
Today's Appointments	/appointments/appointments/today/	GET
Waiting Queue	/appointments/queue/waiting/	GET
Call Next Patient	/appointments/queue/call_next/	POST
Start Consultation	/consultation/consultations/{id}/start/	POST
Add Notes	/consultation/consultations/{id}/notes/	POST
Add Prescription	/consultation/consultations/{id}/prescriptions/	POST
End Consultation	/consultation/consultations/{id}/end/	POST
My Schedule	/appointments/schedules/weekly/	GET
Update Schedule	/appointments/schedules/bulk_update/	POST
Add Leave	/appointments/exceptions/add_leave/	POST
Patient Records	/health-records/sharing/accessible-patients/	GET
Notifications	/notifications/	GET