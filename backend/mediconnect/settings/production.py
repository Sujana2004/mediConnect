"""
Production settings for MediConnect
Used when deploying to Render.com
"""

import os
import dj_database_url
from .base import *

print("🚀 Using PRODUCTION settings")

# =============================================================================
# SECURITY SETTINGS
# =============================================================================

DEBUG = False

SECRET_KEY = config('SECRET_KEY')

# Allowed hosts - Add your Render URL
ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='localhost,127.0.0.1,.onrender.com',
    cast=Csv()
)

# HTTPS Settings
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# HSTS Settings
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True


# =============================================================================
# DATABASE (Supabase PostgreSQL)
# =============================================================================

DATABASE_URL = config('DATABASE_URL', default='')

if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=True,
        )
    }
    print("📦 Database: Supabase PostgreSQL")
else:
    raise Exception("DATABASE_URL environment variable is required in production!")


# =============================================================================
# STATIC FILES (WhiteNoise)
# =============================================================================

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# WhiteNoise is already in base.py MIDDLEWARE, no need to insert again


# =============================================================================
# MEDIA FILES (Supabase Storage)
# =============================================================================

USE_SUPABASE_STORAGE = True

if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    DEFAULT_FILE_STORAGE = 'mediconnect.storage_backends.SupabaseStorage'
    MEDIA_URL = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_STORAGE_BUCKET}/"
    print("🗄️ Storage: Supabase")
else:
    print("⚠️ Storage: Local fallback (Supabase not configured)")


# =============================================================================
# CORS SETTINGS
# =============================================================================

CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://localhost:5173',
    cast=Csv()
)

CORS_ALLOW_CREDENTIALS = True


# =============================================================================
# FIREBASE CREDENTIALS (Base64 encoded for production)
# =============================================================================

import base64
import json
import tempfile

FIREBASE_CREDENTIALS_BASE64 = config('FIREBASE_CREDENTIALS_BASE64', default='')

if FIREBASE_CREDENTIALS_BASE64:
    try:
        # Decode base64 and write to temp file
        credentials_json = base64.b64decode(FIREBASE_CREDENTIALS_BASE64).decode('utf-8')
        credentials_dict = json.loads(credentials_json)
        
        # Create temp file for Firebase credentials
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        json.dump(credentials_dict, temp_file)
        temp_file.close()
        
        FIREBASE_CREDENTIALS_PATH = temp_file.name
        print("🔥 Firebase: Credentials loaded")
    except Exception as e:
        print(f"⚠️ Firebase: Failed to load - {str(e)}")
        FIREBASE_CREDENTIALS_PATH = None
else:
    print("⚠️ Firebase: No credentials provided")
    FIREBASE_CREDENTIALS_PATH = None


# =============================================================================
# UPSTASH REDIS (Cache & Sync)
# =============================================================================

UPSTASH_REDIS_URL = config('UPSTASH_REDIS_REST_URL', default='')
UPSTASH_REDIS_TOKEN = config('UPSTASH_REDIS_REST_TOKEN', default='')

if UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN:
    print("📦 Cache: Upstash Redis")
else:
    print("📦 Cache: In-memory fallback")


# =============================================================================
# LOGGING (Production - less verbose)
# =============================================================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}


# =============================================================================
# REST FRAMEWORK (Production overrides)
# =============================================================================

REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [
    'rest_framework.renderers.JSONRenderer',
]

# Stricter throttling for production
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '50/hour',
    'user': '500/hour'
}


# =============================================================================
# DISABLE SCHEDULERS IN PRODUCTION (Optional)
# Set to True if you want to disable background tasks
# =============================================================================

DISABLE_MEDICINE_SCHEDULER = config('DISABLE_MEDICINE_SCHEDULER', default=False, cast=bool)
DISABLE_APPOINTMENT_SCHEDULER = config('DISABLE_APPOINTMENT_SCHEDULER', default=False, cast=bool)
DISABLE_CONSULTATION_SCHEDULER = config('DISABLE_CONSULTATION_SCHEDULER', default=False, cast=bool)