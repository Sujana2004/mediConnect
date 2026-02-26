"""
Development settings for MediConnect project.
"""

from .base import *
import dj_database_url

# Debug mode
DEBUG = True

# Allow all hosts in development
ALLOWED_HOSTS = ['*']


# ============================================
# DATABASE - Supabase PostgreSQL
# ============================================

# Option 1: Using DATABASE_URL (recommended)
DATABASE_URL = config('DATABASE_URL', default='')

if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # Fallback to local PostgreSQL if no Supabase URL
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='mediconnect'),
            'USER': config('DB_USER', default='postgres'),
            'PASSWORD': config('DB_PASSWORD', default='0000'),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
        }
    }

# ============================================
# STORAGE SETTINGS FOR DEVELOPMENT
# ============================================

# You can still use Supabase storage in development
# or fallback to local storage by setting USE_SUPABASE_STORAGE=False

if not USE_SUPABASE_STORAGE:
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
    MEDIA_URL = '/media/'
    MEDIA_ROOT = BASE_DIR / 'media'

# ============================================
# OTHER DEVELOPMENT SETTINGS
# ============================================

# Disable password validators in development
AUTH_PASSWORD_VALIDATORS = []

# Email backend - Console for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# CORS - Allow all origins in development
CORS_ALLOW_ALL_ORIGINS = True

# Logging - More verbose in development
LOGGING['root']['level'] = 'DEBUG'
LOGGING['loggers']['apps']['level'] = 'DEBUG'

# Cache - Use local memory cache
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Django Debug Toolbar (optional)
# INSTALLED_APPS += ['debug_toolbar']
# MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')
# INTERNAL_IPS = ['127.0.0.1']

print("🔧 Using DEVELOPMENT settings")
print(f"📦 Database: {'Supabase' if DATABASE_URL else 'Local PostgreSQL'}")
print(f"🗄️ Storage: {'Supabase S3' if USE_SUPABASE_STORAGE else 'Local Filesystem'}")