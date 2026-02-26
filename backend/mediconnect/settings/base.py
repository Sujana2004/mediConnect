"""
Base settings for MediConnect project.
Common settings for all environments.
"""

import os
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / '.env')

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-dev-key-change-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())


# ============================================
# APPLICATION DEFINITION
# ============================================

DJANGO_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'channels',
    'drf_yasg',
    'storages',  # Added for Supabase storage
]

LOCAL_APPS = [
    'apps.users',
    'apps.diagnosis',
    'apps.chatbot',
    'apps.appointments',
    'apps.consultation',
    'apps.health_records',
    'apps.medicine',
    'apps.emergency',
    'apps.notifications',
    'apps.analytics',
    'apps.sync',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS


# ============================================
# MIDDLEWARE
# ============================================

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Static files
    'corsheaders.middleware.CorsMiddleware',       # CORS - must be before CommonMiddleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# ============================================
# URL CONFIGURATION
# ============================================

ROOT_URLCONF = 'mediconnect.urls'


# ============================================
# TEMPLATES
# ============================================

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


# ============================================
# WSGI & ASGI
# ============================================

WSGI_APPLICATION = 'mediconnect.wsgi.application'
ASGI_APPLICATION = 'mediconnect.asgi.application'


# ============================================
# DATABASE
# ============================================
# Configured in environment-specific settings

# ===========================================
# SUPABASE CONFIGURATION
# ===========================================

SUPABASE_URL = config('SUPABASE_URL', default='')
SUPABASE_ANON_KEY = config('SUPABASE_ANON_KEY', default='')
SUPABASE_SERVICE_ROLE_KEY = config('SUPABASE_SERVICE_ROLE_KEY', default='')
SUPABASE_STORAGE_BUCKET = config('SUPABASE_STORAGE_BUCKET', default='health-records')

# Supabase S3-Compatible Storage Configuration
SUPABASE_S3_ENDPOINT = config('SUPABASE_S3_ENDPOINT', default='')
SUPABASE_S3_ACCESS_KEY = config('SUPABASE_S3_ACCESS_KEY', default='')
SUPABASE_S3_SECRET_KEY = config('SUPABASE_S3_SECRET_KEY', default='')
SUPABASE_S3_REGION = config('SUPABASE_S3_REGION', default='us-east-1')
SUPABASE_SIGNED_URL_EXPIRY = config('SUPABASE_SIGNED_URL_EXPIRY', default=3600, cast=int)

# Health Records Storage Settings
HEALTH_RECORDS_STORAGE = {
    'BUCKET_NAME': SUPABASE_STORAGE_BUCKET,
    'MAX_FILE_SIZE_MB': 10,
    'ALLOWED_EXTENSIONS': ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
    'SIGNED_URL_EXPIRY_SECONDS': 3600,
}


# ============================================
# AUTHENTICATION
# ============================================

AUTH_USER_MODEL = 'users.User'

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# ============================================
# INTERNATIONALIZATION
# ============================================

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# Supported languages
LANGUAGES = [
    ('en', 'English'),
    ('hi', 'Hindi'),
    ('te', 'Telugu'),
]


# ============================================
# STATIC FILES
# ============================================

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# ============================================
# MEDIA FILES - Supabase Storage
# ============================================

# ============================================
# SUPABASE STORAGE CONFIGURATION
# ============================================

# Use Supabase for media storage if configured
USE_SUPABASE_STORAGE = config('USE_SUPABASE_STORAGE', default=False, cast=bool)

if USE_SUPABASE_STORAGE and SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    # ✅ Use Supabase for file storage
    DEFAULT_FILE_STORAGE = 'mediconnect.storage_backends.SupabaseStorage'
    MEDIA_URL = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_STORAGE_BUCKET}/"
    print("📦 Storage: SUPABASE")
else:
    # 📁 Use local storage (fallback)
    MEDIA_URL = '/media/'
    MEDIA_ROOT = BASE_DIR / 'media'
    print("📁 Storage: LOCAL")


# ============================================
# DEFAULT PRIMARY KEY
# ============================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ============================================
# REST FRAMEWORK
# ============================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
    },
    'EXCEPTION_HANDLER': 'apps.users.utils.custom_exception_handler',
}


# ============================================
# JWT SETTINGS
# ============================================

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=config('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', default=60, cast=int)
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=config('JWT_REFRESH_TOKEN_LIFETIME_DAYS', default=7, cast=int)
    ),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    
    'TOKEN_TYPE_CLAIM': 'token_type',
}


# ============================================
# CORS SETTINGS
# ============================================

CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://localhost:5173,https://medi-connect-seven-woad.vercel.app',
    cast=Csv()
)

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-language',  # Custom header for language preference
]


# ============================================
# CHANNELS (WebSocket)
# ============================================

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
        "LOCATION": "unique-snowflake",
        # For production with Redis:
        # "BACKEND": "channels_redis.core.RedisChannelLayer",
        # "CONFIG": {
        #     "hosts": [config('REDIS_URL', default='redis://localhost:6379/0')],
        # },
    },
}


# ============================================
# CACHING
# ============================================

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
    # For production with Redis:
    # 'default': {
    #     'BACKEND': 'django_redis.cache.RedisCache',
    #     'LOCATION': config('REDIS_URL', default='redis://localhost:6379/1'),
    #     'OPTIONS': {
    #         'CLIENT_CLASS': 'django_redis.client.DefaultClient',
    #     }
    # }
}


# ============================================
# FILE UPLOAD SETTINGS
# ============================================

FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB

# Allowed file types for health records
ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
]

MAX_DOCUMENT_SIZE_MB = 10


# ============================================
# LOGGING
# ============================================
# Create logs directory if it doesn't exist
LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'mediconnect.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}


# ============================================
# APP-SPECIFIC SETTINGS
# ============================================

# ML Models paths
ML_MODELS_DIR = BASE_DIR / 'ml_models'
NLP_DATA_DIR = BASE_DIR / 'nlp_data'
DATA_DIR = BASE_DIR / 'data'

# Supported languages for the app
SUPPORTED_LANGUAGES = config(
    'SUPPORTED_LANGUAGES',
    default='te,hi,en',
    cast=Csv()
)
DEFAULT_LANGUAGE = config('DEFAULT_LANGUAGE', default='te')

# Firebase settings
FIREBASE_CREDENTIALS_PATH = config(
    'FIREBASE_CREDENTIALS_PATH',
    default='firebase-credentials.json'
)

# Azure settings
AZURE_TRANSLATOR_KEY = config('AZURE_TRANSLATOR_KEY', default='')
AZURE_TRANSLATOR_REGION = config('AZURE_TRANSLATOR_REGION', default='eastus')
AZURE_SPEECH_KEY = config('AZURE_SPEECH_KEY', default='')
AZURE_SPEECH_REGION = config('AZURE_SPEECH_REGION', default='eastus')

# =============================================================================
# CONSULTATION SETTINGS (Add to bottom of file)
# =============================================================================

# Jitsi Meet Configuration
JITSI_DOMAIN = config('JITSI_DOMAIN', default='meet.jit.si')
JITSI_ROOM_EXPIRY_HOURS = config('JITSI_ROOM_EXPIRY_HOURS', default=2, cast=int)

# Consultation Scheduler
DISABLE_CONSULTATION_SCHEDULER = config('DISABLE_CONSULTATION_SCHEDULER', default=False, cast=bool)

# =============================================================================
# UPSTASH REDIS SETTINGS (For Sync App)
# =============================================================================

# Upstash Redis REST API URL
# Format: https://your-redis-endpoint.upstash.io
UPSTASH_REDIS_URL = config('UPSTASH_REDIS_REST_URL', default='')

# Upstash Redis REST API Token
UPSTASH_REDIS_TOKEN = config('UPSTASH_REDIS_REST_TOKEN', default='')

# Sync App Settings
SYNC_SETTINGS = {
    # Maximum actions per push request
    'MAX_ACTIONS_PER_PUSH': 50,
    
    # Maximum items per pull response
    'MAX_ITEMS_PER_PULL': 100,
    
    # Rate limiting
    'RATE_LIMIT_MAX_REQUESTS': 10,  # Max requests per window
    'RATE_LIMIT_WINDOW': 60,  # Window in seconds
    
    # Lock timeout (seconds)
    'LOCK_TIMEOUT': 30,
    
    # Data retention (days)
    'LOG_RETENTION_DAYS': 30,
    'ACTION_RETENTION_DAYS': 90,
}