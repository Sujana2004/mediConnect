"""
Notification Constants
======================
All constants used in the notifications app.
These values should not be changed in production.
"""

# =============================================================================
# NOTIFICATION TYPES
# =============================================================================

class NotificationType:
    """Types of notifications that can be sent."""
    
    # Appointment related
    APPOINTMENT_REMINDER = 'appointment_reminder'
    APPOINTMENT_CONFIRMED = 'appointment_confirmed'
    APPOINTMENT_CANCELLED = 'appointment_cancelled'
    APPOINTMENT_RESCHEDULED = 'appointment_rescheduled'
    
    # Medicine related
    MEDICINE_REMINDER = 'medicine_reminder'
    MEDICINE_LOW_STOCK = 'medicine_low_stock'
    PRESCRIPTION_READY = 'prescription_ready'
    
    # Health related
    HEALTH_TIP = 'health_tip'
    HEALTH_CHECKUP_REMINDER = 'health_checkup_reminder'
    LAB_RESULT_READY = 'lab_result_ready'
    
    # Emergency
    EMERGENCY_ALERT = 'emergency_alert'
    EMERGENCY_CONTACT_ALERT = 'emergency_contact_alert'
    
    # System
    WELCOME = 'welcome'
    ACCOUNT_UPDATE = 'account_update'
    GENERAL = 'general'
    
    # Chat
    CHAT_MESSAGE = 'chat_message'
    DOCTOR_RESPONSE = 'doctor_response'

    CHOICES = [
        (APPOINTMENT_REMINDER, 'Appointment Reminder'),
        (APPOINTMENT_CONFIRMED, 'Appointment Confirmed'),
        (APPOINTMENT_CANCELLED, 'Appointment Cancelled'),
        (APPOINTMENT_RESCHEDULED, 'Appointment Rescheduled'),
        (MEDICINE_REMINDER, 'Medicine Reminder'),
        (MEDICINE_LOW_STOCK, 'Medicine Low Stock'),
        (PRESCRIPTION_READY, 'Prescription Ready'),
        (HEALTH_TIP, 'Health Tip'),
        (HEALTH_CHECKUP_REMINDER, 'Health Checkup Reminder'),
        (LAB_RESULT_READY, 'Lab Result Ready'),
        (EMERGENCY_ALERT, 'Emergency Alert'),
        (EMERGENCY_CONTACT_ALERT, 'Emergency Contact Alert'),
        (WELCOME, 'Welcome'),
        (ACCOUNT_UPDATE, 'Account Update'),
        (GENERAL, 'General'),
        (CHAT_MESSAGE, 'Chat Message'),
        (DOCTOR_RESPONSE, 'Doctor Response'),
    ]


# =============================================================================
# NOTIFICATION PRIORITY
# =============================================================================

class NotificationPriority:
    """Priority levels for notifications."""
    
    LOW = 'low'
    NORMAL = 'normal'
    HIGH = 'high'
    URGENT = 'urgent'
    
    CHOICES = [
        (LOW, 'Low'),
        (NORMAL, 'Normal'),
        (HIGH, 'High'),
        (URGENT, 'Urgent'),
    ]
    
    # FCM priority mapping
    FCM_PRIORITY = {
        LOW: 'normal',
        NORMAL: 'normal',
        HIGH: 'high',
        URGENT: 'high',
    }


# =============================================================================
# NOTIFICATION STATUS
# =============================================================================

class NotificationStatus:
    """Status of a notification."""
    
    PENDING = 'pending'
    SENT = 'sent'
    DELIVERED = 'delivered'
    READ = 'read'
    FAILED = 'failed'
    CANCELLED = 'cancelled'
    
    CHOICES = [
        (PENDING, 'Pending'),
        (SENT, 'Sent'),
        (DELIVERED, 'Delivered'),
        (READ, 'Read'),
        (FAILED, 'Failed'),
        (CANCELLED, 'Cancelled'),
    ]


# =============================================================================
# NOTIFICATION CHANNELS
# =============================================================================

class NotificationChannel:
    """Channels through which notifications can be sent."""
    
    PUSH = 'push'          # Firebase FCM
    IN_APP = 'in_app'      # Stored in database
    SMS = 'sms'            # SMS (future - optional paid)
    EMAIL = 'email'        # Email (future - optional)
    
    CHOICES = [
        (PUSH, 'Push Notification'),
        (IN_APP, 'In-App Notification'),
        (SMS, 'SMS'),
        (EMAIL, 'Email'),
    ]


# =============================================================================
# DEFAULT PREFERENCES
# =============================================================================

DEFAULT_NOTIFICATION_PREFERENCES = {
    # Appointment notifications
    NotificationType.APPOINTMENT_REMINDER: True,
    NotificationType.APPOINTMENT_CONFIRMED: True,
    NotificationType.APPOINTMENT_CANCELLED: True,
    NotificationType.APPOINTMENT_RESCHEDULED: True,
    
    # Medicine notifications
    NotificationType.MEDICINE_REMINDER: True,
    NotificationType.MEDICINE_LOW_STOCK: True,
    NotificationType.PRESCRIPTION_READY: True,
    
    # Health notifications
    NotificationType.HEALTH_TIP: True,
    NotificationType.HEALTH_CHECKUP_REMINDER: True,
    NotificationType.LAB_RESULT_READY: True,
    
    # Emergency - always enabled, cannot be disabled
    NotificationType.EMERGENCY_ALERT: True,
    NotificationType.EMERGENCY_CONTACT_ALERT: True,
    
    # System
    NotificationType.WELCOME: True,
    NotificationType.ACCOUNT_UPDATE: True,
    NotificationType.GENERAL: True,
    
    # Chat
    NotificationType.CHAT_MESSAGE: True,
    NotificationType.DOCTOR_RESPONSE: True,
}

# Types that cannot be disabled by user
NON_DISABLEABLE_TYPES = [
    NotificationType.EMERGENCY_ALERT,
    NotificationType.EMERGENCY_CONTACT_ALERT,
]


# =============================================================================
# REMINDER TIMINGS (in minutes before event)
# =============================================================================

APPOINTMENT_REMINDER_TIMES = [
    1440,  # 24 hours before
    60,    # 1 hour before
    15,    # 15 minutes before
]

MEDICINE_REMINDER_TIMES = [
    0,     # At scheduled time
    5,     # 5 minutes after (if not taken)
]


# =============================================================================
# ICONS FOR NOTIFICATION TYPES
# =============================================================================

NOTIFICATION_ICONS = {
    NotificationType.APPOINTMENT_REMINDER: 'calendar',
    NotificationType.APPOINTMENT_CONFIRMED: 'calendar-check',
    NotificationType.APPOINTMENT_CANCELLED: 'calendar-x',
    NotificationType.APPOINTMENT_RESCHEDULED: 'calendar-edit',
    NotificationType.MEDICINE_REMINDER: 'pill',
    NotificationType.MEDICINE_LOW_STOCK: 'pill-warning',
    NotificationType.PRESCRIPTION_READY: 'prescription',
    NotificationType.HEALTH_TIP: 'lightbulb',
    NotificationType.HEALTH_CHECKUP_REMINDER: 'stethoscope',
    NotificationType.LAB_RESULT_READY: 'lab',
    NotificationType.EMERGENCY_ALERT: 'emergency',
    NotificationType.EMERGENCY_CONTACT_ALERT: 'emergency-contact',
    NotificationType.WELCOME: 'wave',
    NotificationType.ACCOUNT_UPDATE: 'user',
    NotificationType.GENERAL: 'bell',
    NotificationType.CHAT_MESSAGE: 'chat',
    NotificationType.DOCTOR_RESPONSE: 'doctor',
}


# =============================================================================
# COLORS FOR NOTIFICATION TYPES
# =============================================================================

NOTIFICATION_COLORS = {
    NotificationType.APPOINTMENT_REMINDER: '#4CAF50',      # Green
    NotificationType.APPOINTMENT_CONFIRMED: '#4CAF50',     # Green
    NotificationType.APPOINTMENT_CANCELLED: '#F44336',     # Red
    NotificationType.APPOINTMENT_RESCHEDULED: '#FF9800',   # Orange
    NotificationType.MEDICINE_REMINDER: '#2196F3',         # Blue
    NotificationType.MEDICINE_LOW_STOCK: '#FF9800',        # Orange
    NotificationType.PRESCRIPTION_READY: '#4CAF50',        # Green
    NotificationType.HEALTH_TIP: '#9C27B0',                # Purple
    NotificationType.HEALTH_CHECKUP_REMINDER: '#00BCD4',   # Cyan
    NotificationType.LAB_RESULT_READY: '#4CAF50',          # Green
    NotificationType.EMERGENCY_ALERT: '#F44336',           # Red
    NotificationType.EMERGENCY_CONTACT_ALERT: '#F44336',   # Red
    NotificationType.WELCOME: '#4CAF50',                   # Green
    NotificationType.ACCOUNT_UPDATE: '#607D8B',            # Gray
    NotificationType.GENERAL: '#607D8B',                   # Gray
    NotificationType.CHAT_MESSAGE: '#2196F3',              # Blue
    NotificationType.DOCTOR_RESPONSE: '#4CAF50',           # Green
}