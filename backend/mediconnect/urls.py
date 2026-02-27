"""
Main URL Configuration for MediConnect.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


def health_check(request):
    """Root health check endpoint."""
    return JsonResponse({
        'status': 'healthy',
        'service': 'mediconnect-api',
        'version': '1.0.0'
    })


# Core URL patterns
urlpatterns = [
    # Health check at root
    path('', health_check, name='health'),
    
    # Admin
    path('admin/', admin.site.urls),
    
    # API v1
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/diagnosis/', include('apps.diagnosis.urls')),
    path('api/v1/chatbot/', include('apps.chatbot.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/emergency/', include('apps.emergency.urls')),
    path('api/v1/medicine/', include('apps.medicine.urls')),
    path('api/v1/appointments/', include('apps.appointments.urls')),
    path('api/v1/consultation/', include('apps.consultation.urls')),
    path('api/v1/health-records/', include('apps.health_records.urls')),
    path('api/v1/sync/', include('apps.sync.urls')),
    
    # Cron job endpoints (external scheduler)
    path('api/v1/cron/', include('apps.cron.urls')),
]


# =============================================================================
# SWAGGER - Only in DEBUG mode (Development)
# =============================================================================

if settings.DEBUG:
    # Import drf_yasg ONLY in development
    try:
        from drf_yasg.views import get_schema_view
        from drf_yasg import openapi
        from rest_framework import permissions

        schema_view = get_schema_view(
            openapi.Info(
                title="MediConnect API",
                default_version='v1',
                description="Rural Healthcare Platform API Documentation",
                terms_of_service="https://www.mediconnect.com/terms/",
                contact=openapi.Contact(email="support@mediconnect.com"),
                license=openapi.License(name="MIT License"),
            ),
            public=True,
            permission_classes=[permissions.AllowAny],
        )

        urlpatterns += [
            path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='swagger'),
            path('swagger.<format>/', schema_view.without_ui(cache_timeout=0), name='schema-json'),
            path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='redoc'),
        ]
        
        print("📚 Swagger: ENABLED (Development)")
        
    except ImportError:
        print("📚 Swagger: drf_yasg not installed")

else:
    # Production - Simple JSON response instead of Swagger (saves ~50MB RAM)
    def swagger_disabled(request):
        return JsonResponse({
            'success': True,
            'message': 'API is running',
            'documentation': 'Swagger is disabled in production to save memory',
            'tip': 'Run locally with DEBUG=True to see Swagger docs'
        })

    urlpatterns += [
        path('swagger/', swagger_disabled, name='swagger'),
        path('redoc/', swagger_disabled, name='redoc'),
    ]
    
    print("📚 Swagger: DISABLED (Production - saves memory)")


# =============================================================================
# STATIC & MEDIA FILES (Development only)
# =============================================================================

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)


# =============================================================================
# ADMIN CUSTOMIZATION
# =============================================================================

admin.site.site_header = "MediConnect Admin"
admin.site.site_title = "MediConnect"
admin.site.index_title = "Welcome to MediConnect Administration"