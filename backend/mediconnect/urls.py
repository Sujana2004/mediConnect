"""
Main URL Configuration for MediConnect.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# API Documentation
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

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('swagger.json', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    
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
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Customize admin site
admin.site.site_header = "MediConnect Admin"
admin.site.site_title = "MediConnect"
admin.site.index_title = "Welcome to MediConnect Administration"