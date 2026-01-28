# """
# Consultation Constants
# ======================
# All constants used in the consultation app.
# """

# # =============================================================================
# # CONSULTATION STATUS
# # =============================================================================

# class ConsultationStatus:
#     """Status of a consultation."""
    
#     # Before call
#     REQUESTED = 'requested'           # Patient requested consultation
#     SCHEDULED = 'scheduled'           # Confirmed with date/time
#     WAITING = 'waiting'               # Patient in waiting room
    
#     # During call
#     IN_PROGRESS = 'in_progress'       # Call is active
#     ON_HOLD = 'on_hold'               # Call temporarily on hold
    
#     # After call
#     COMPLETED = 'completed'           # Call ended normally
#     CANCELLED = 'cancelled'           # Cancelled before call
#     NO_SHOW = 'no_show'               # Patient/Doctor didn't join
#     FAILED = 'failed'                 # Technical failure
    
#     CHOICES = [
#         (REQUESTED, 'Requested'),
#         (SCHEDULED, 'Scheduled'),
#         (WAITING, 'Waiting'),
#         (IN_PROGRESS, 'In Progress'),
#         (ON_HOLD, 'On Hold'),
#         (COMPLETED, 'Completed'),
#         (CANCELLED, 'Cancelled'),
#         (NO_SHOW, 'No Show'),
#         (FAILED, 'Failed'),
#     ]
    
#     # Statuses that allow joining the call
#     JOINABLE = [SCHEDULED, WAITING, IN_PROGRESS, ON_HOLD]
    
#     # Statuses that are considered "ended"
#     ENDED = [COMPLETED, CANCELLED, NO_SHOW, FAILED]
    
#     # Statuses that are considered "active"
#     ACTIVE = [WAITING, IN_PROGRESS, ON_HOLD]


# # =============================================================================
# # CONSULTATION TYPE
# # =============================================================================

# class ConsultationType:
#     """Type of consultation."""
    
#     VIDEO = 'video'
#     AUDIO = 'audio'
#     CHAT = 'chat'
    
#     CHOICES = [
#         (VIDEO, 'Video Call'),
#         (AUDIO, 'Audio Call'),
#         (CHAT, 'Chat Only'),
#     ]


# # =============================================================================
# # PARTICIPANT ROLE
# # =============================================================================

# class ParticipantRole:
#     """Role of a participant in consultation."""
    
#     PATIENT = 'patient'
#     DOCTOR = 'doctor'
#     FAMILY_HELPER = 'family_helper'
#     TRANSLATOR = 'translator'
    
#     CHOICES = [
#         (PATIENT, 'Patient'),
#         (DOCTOR, 'Doctor'),
#         (FAMILY_HELPER, 'Family Helper'),
#         (TRANSLATOR, 'Translator'),
#     ]


# # =============================================================================
# # PARTICIPANT STATUS
# # =============================================================================

# class ParticipantStatus:
#     """Status of a participant."""
    
#     INVITED = 'invited'
#     WAITING = 'waiting'
#     JOINED = 'joined'
#     LEFT = 'left'
#     DISCONNECTED = 'disconnected'
#     REJECTED = 'rejected'
    
#     CHOICES = [
#         (INVITED, 'Invited'),
#         (WAITING, 'Waiting'),
#         (JOINED, 'Joined'),
#         (LEFT, 'Left'),
#         (DISCONNECTED, 'Disconnected'),
#         (REJECTED, 'Rejected'),
#     ]


# # =============================================================================
# # MESSAGE TYPE (In-call chat)
# # =============================================================================

# class MessageType:
#     """Type of in-call message."""
    
#     TEXT = 'text'
#     SYSTEM = 'system'           # System messages (joined, left, etc.)
#     PRESCRIPTION = 'prescription'
#     FILE = 'file'
#     IMAGE = 'image'
    
#     CHOICES = [
#         (TEXT, 'Text'),
#         (SYSTEM, 'System'),
#         (PRESCRIPTION, 'Prescription'),
#         (FILE, 'File'),
#         (IMAGE, 'Image'),
#     ]


# # =============================================================================
# # PRESCRIPTION STATUS
# # =============================================================================

# class PrescriptionStatus:
#     """Status of a prescription."""
    
#     DRAFT = 'draft'
#     SENT = 'sent'
#     VIEWED = 'viewed'
#     DOWNLOADED = 'downloaded'
    
#     CHOICES = [
#         (DRAFT, 'Draft'),
#         (SENT, 'Sent'),
#         (VIEWED, 'Viewed'),
#         (DOWNLOADED, 'Downloaded'),
#     ]


# # =============================================================================
# # CALL QUALITY
# # =============================================================================

# class CallQuality:
#     """Call quality indicators."""
    
#     EXCELLENT = 'excellent'
#     GOOD = 'good'
#     FAIR = 'fair'
#     POOR = 'poor'
    
#     CHOICES = [
#         (EXCELLENT, 'Excellent'),
#         (GOOD, 'Good'),
#         (FAIR, 'Fair'),
#         (POOR, 'Poor'),
#     ]


# # =============================================================================
# # CANCELLATION REASONS
# # =============================================================================

# CANCELLATION_REASONS = [
#     ('patient_request', 'Patient requested cancellation'),
#     ('doctor_unavailable', 'Doctor became unavailable'),
#     ('emergency', 'Emergency situation'),
#     ('technical_issue', 'Technical issues'),
#     ('rescheduled', 'Rescheduled to another time'),
#     ('duplicate', 'Duplicate booking'),
#     ('other', 'Other reason'),
# ]


# # =============================================================================
# # CONSULTATION SETTINGS
# # =============================================================================

# # Maximum consultation duration in minutes
# MAX_CONSULTATION_DURATION = 60

# # Waiting room timeout in minutes
# WAITING_ROOM_TIMEOUT = 15

# # Time before scheduled call when patient can join (minutes)
# EARLY_JOIN_WINDOW = 10

# # Time after scheduled call to mark as no-show (minutes)
# NO_SHOW_TIMEOUT = 15

# # Maximum participants in a consultation
# MAX_PARTICIPANTS = 4

# # Call recording settings
# ALLOW_RECORDING = True
# REQUIRE_CONSENT = True