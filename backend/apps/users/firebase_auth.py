"""
Firebase Authentication Service.
Handles phone number verification using Firebase.
"""

import firebase_admin
from firebase_admin import credentials, auth
from django.conf import settings
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
_firebase_app = None


# Mock tokens for development (when Firebase credentials not available)
MOCK_TOKENS = {
    'test_patient_token': {
        'phone_number': '+919999999901',
        'uid': 'mock_uid_patient_001'
    },
    'test_patient_token_2': {
        'phone_number': '+919999999902',
        'uid': 'mock_uid_patient_002'
    },
    'test_doctor_token': {
        'phone_number': '+919999999903',
        'uid': 'mock_uid_doctor_001'
    },
    'test_admin_token': {
        'phone_number': '+919999999904',
        'uid': 'mock_uid_admin_001'
    },
}


def is_mock_mode():
    """
    Check if we should use mock mode.
    Mock mode is enabled when:
    - DEBUG is True AND
    - Firebase credentials file doesn't exist
    """
    if not settings.DEBUG:
        return False
    
    cred_path = Path(settings.BASE_DIR) / settings.FIREBASE_CREDENTIALS_PATH
    return not cred_path.exists()


def get_firebase_app():
    """
    Get or initialize Firebase Admin app.
    Singleton pattern to avoid multiple initializations.
    """
    global _firebase_app

    # If mock mode, reture None
    if is_mock_mode():
        logger.info("Firebase running in MOCK mode (credentials not found)")
        return None
    
    if _firebase_app is not None:
        return _firebase_app
    
    try:
        # Check if already initialized
        _firebase_app = firebase_admin.get_app()
        return _firebase_app
    except ValueError:
        # Not initialized, initialize now
        pass
    
    cred_path = Path(settings.BASE_DIR) / settings.FIREBASE_CREDENTIALS_PATH
    
    if not cred_path.exists():
        logger.warning(
            f"Firebase credentials file not found at {cred_path}. "
            "Firebase authentication will not work."
        )
        return None
    
    try:
        cred = credentials.Certificate(str(cred_path))
        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized successfully")
        return _firebase_app
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {str(e)}")
        return None


def verify_firebase_token(id_token):
    """
    Verify Firebase ID token and return decoded token data.
    
    Args:
        id_token: Firebase ID token from client
        
    Returns:
        dict: Decoded token with user info, or None if invalid
    """

    # Check for mock tokens in development
    if is_mock_mode() or settings.DEBUG:
        if id_token in MOCK_TOKENS:
            logger.info(f"Using mock token: {id_token}")
            return MOCK_TOKENS[id_token]

    app = get_firebase_app()
    
    if app is None:
        #If no Firebase app and not a mock token, fail
        if id_token in MOCK_TOKENS:
            return MOCK_TOKENS[id_token]
        
        logger.error("Firebase app not initialized")
        return None
    
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except auth.ExpiredIdTokenError:
        logger.warning("Firebase token has expired")
        return None
    except auth.InvalidIdTokenError as e:
        logger.warning(f"Invalid Firebase token: {str(e)}")
        return None
    except auth.RevokedIdTokenError:
        logger.warning("Firebase token has been revoked")
        return None
    except Exception as e:
        logger.error(f"Error verifying Firebase token: {str(e)}")
        return None


def get_firebase_user(uid):
    """
    Get Firebase user by UID.
    
    Args:
        uid: Firebase user UID
        
    Returns:
        UserRecord or None
    """

    # Return None in mock mode
    if is_mock_mode():
        return None

    app = get_firebase_app()
    
    if app is None:
        return None
    
    try:
        return auth.get_user(uid)
    except auth.UserNotFoundError:
        return None
    except Exception as e:
        logger.error(f"Error getting Firebase user: {str(e)}")
        return None


def get_phone_from_token(id_token):
    """
    Extract phone number from Firebase ID token.
    
    Args:
        id_token: Firebase ID token
        
    Returns:
        str: Phone number (without country code) or None
    """
    decoded = verify_firebase_token(id_token)
    
    if decoded is None:
        return None
    
    phone = decoded.get('phone_number', '')
    
    # Remove country code (+91 for India)
    if phone.startswith('+91'):
        phone = phone[3:]
    elif phone.startswith('91') and len(phone) == 12:
        phone = phone[2:]
    
    return phone


def delete_firebase_user(uid):
    """
    Delete a Firebase user.
    
    Args:
        uid: Firebase user UID
        
    Returns:
        bool: True if deleted, False otherwise
    """
    # In mock mode, assume deletion is successful
    if is_mock_mode():
        return True

    app = get_firebase_app()
    
    if app is None:
        return False
    
    try:
        auth.delete_user(uid)
        return True
    except Exception as e:
        logger.error(f"Error deleting Firebase user: {str(e)}")
        return False


class FirebaseAuthenticationFailed(Exception):
    """Custom exception for Firebase authentication failures."""
    pass