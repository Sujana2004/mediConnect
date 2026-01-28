"""
Notifications Configuration
===========================
Firebase and notification settings.
"""

import os
from pathlib import Path

# =============================================================================
# FIREBASE CONFIGURATION
# =============================================================================

# Path to Firebase service account JSON file
FIREBASE_CREDENTIALS_PATH = os.environ.get(
    'FIREBASE_CREDENTIALS_PATH',
    './firebase-service-account.json'
)

# Firebase project settings
FIREBASE_CONFIG = {
    'credentials_path': FIREBASE_CREDENTIALS_PATH,
    'project_id': os.environ.get('FIREBASE_PROJECT_ID', ''),
    'database_url': os.environ.get('FIREBASE_DATABASE_URL', ''),
}

# =============================================================================
# FCM (Firebase Cloud Messaging) SETTINGS
# =============================================================================

FCM_CONFIG = {
    # Default TTL (Time To Live) for messages in seconds
    'default_ttl': 86400,  # 24 hours
    
    # TTL for different priority levels
    'ttl_by_priority': {
        'low': 86400 * 7,     # 7 days
        'normal': 86400,       # 24 hours
        'high': 3600,          # 1 hour
        'urgent': 300,         # 5 minutes
    },
    
    # Android specific settings
    'android': {
        'priority': 'high',
        'notification_channel_id': 'mediconnect_default',
    },
    
    # iOS specific settings (APNS)
    'apns': {
        'headers': {
            'apns-priority': '10',
        },
    },
    
    # Web push settings
    'webpush': {
        'headers': {
            'Urgency': 'high',
        },
    },
}

# =============================================================================
# NOTIFICATION SETTINGS
# =============================================================================

NOTIFICATION_SETTINGS = {
    # Maximum notifications to keep per user
    'max_notifications_per_user': 500,
    
    # Days to keep read notifications
    'read_notification_retention_days': 30,
    
    # Days to keep unread notifications
    'unread_notification_retention_days': 90,
    
    # Batch size for sending bulk notifications
    'batch_size': 500,
    
    # Rate limiting (notifications per user per hour)
    'rate_limit_per_hour': 50,
    
    # Quiet hours (don't send non-urgent notifications)
    'quiet_hours': {
        'enabled': True,
        'start': '22:00',  # 10 PM
        'end': '07:00',    # 7 AM
    },
}

# =============================================================================
# TEMPLATE SETTINGS
# =============================================================================

TEMPLATE_SETTINGS = {
    # Supported languages
    'languages': ['en', 'te', 'hi'],
    
    # Default language
    'default_language': 'en',
    
    # Max title length
    'max_title_length': 100,
    
    # Max body length
    'max_body_length': 500,
}

# =============================================================================
# RETRY SETTINGS
# =============================================================================

RETRY_SETTINGS = {
    # Number of retries for failed notifications
    'max_retries': 3,
    
    # Delay between retries (in seconds)
    'retry_delays': [60, 300, 900],  # 1 min, 5 min, 15 min
    
    # Whether to retry on specific errors
    'retry_on_errors': [
        'UNAVAILABLE',
        'INTERNAL',
        'UNKNOWN',
    ],
}