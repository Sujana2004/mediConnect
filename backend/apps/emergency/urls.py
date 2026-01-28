"""
Emergency App URL Configuration.

All endpoints are prefixed with /api/v1/emergency/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EmergencyContactViewSet,
    EmergencyServiceViewSet,
    SOSAlertViewSet,
    FirstAidGuideViewSet,
    EmergencyHelplineViewSet,
    LocationView,
    QuickSOSDataView,
    EmergencyHealthCheckView,
)

app_name = 'emergency'

# Create router for viewsets
router = DefaultRouter()
router.register(r'contacts', EmergencyContactViewSet, basename='contacts')
router.register(r'services', EmergencyServiceViewSet, basename='services')
router.register(r'sos', SOSAlertViewSet, basename='sos')
router.register(r'first-aid', FirstAidGuideViewSet, basename='first-aid')
router.register(r'helplines', EmergencyHelplineViewSet, basename='helplines')

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # Location endpoints
    path('location/', LocationView.as_view(), name='location'),
    path('location/update/', LocationView.as_view(), name='location-update'),
    
    # Quick SOS data (all data in one call)
    path('quick-sos-data/', QuickSOSDataView.as_view(), name='quick-sos-data'),
    
    # Health check
    path('health/', EmergencyHealthCheckView.as_view(), name='health-check'),
]


# =============================================================================
# API ENDPOINT DOCUMENTATION
# =============================================================================
"""
EMERGENCY CONTACTS:
-------------------
GET    /api/v1/emergency/contacts/                    - List user's contacts
POST   /api/v1/emergency/contacts/                    - Add new contact
GET    /api/v1/emergency/contacts/{id}/               - Get contact details
PUT    /api/v1/emergency/contacts/{id}/               - Update contact
PATCH  /api/v1/emergency/contacts/{id}/               - Partial update
DELETE /api/v1/emergency/contacts/{id}/               - Delete contact
POST   /api/v1/emergency/contacts/reorder/            - Reorder priorities

EMERGENCY SERVICES:
-------------------
GET    /api/v1/emergency/services/                    - List all services
GET    /api/v1/emergency/services/{id}/               - Get service details
POST   /api/v1/emergency/services/nearby/             - Find nearby services
GET    /api/v1/emergency/services/by-district/        - Get by district

SOS ALERTS:
-----------
GET    /api/v1/emergency/sos/                         - List user's SOS alerts
GET    /api/v1/emergency/sos/{id}/                    - Get SOS details
POST   /api/v1/emergency/sos/trigger/                 - Trigger new SOS
POST   /api/v1/emergency/sos/quick-trigger/           - Quick one-tap SOS
GET    /api/v1/emergency/sos/active/                  - Get active SOS
POST   /api/v1/emergency/sos/{id}/cancel/             - Cancel SOS
POST   /api/v1/emergency/sos/{id}/update-status/      - Update status
GET    /api/v1/emergency/sos/history/                 - Get SOS history
GET    /api/v1/emergency/sos/types/                   - Get emergency types
GET    /api/v1/emergency/sos/statistics/              - Get SOS statistics

FIRST AID GUIDES:
-----------------
GET    /api/v1/emergency/first-aid/                   - List all guides
GET    /api/v1/emergency/first-aid/{id}/              - Get guide details
GET    /api/v1/emergency/first-aid/critical/          - Get critical guides
GET    /api/v1/emergency/first-aid/by-category/{cat}/ - Get by category

EMERGENCY HELPLINES:
--------------------
GET    /api/v1/emergency/helplines/                   - List all helplines
GET    /api/v1/emergency/helplines/{id}/              - Get helpline details
GET    /api/v1/emergency/helplines/by-type/{type}/    - Get by type
GET    /api/v1/emergency/helplines/important/         - Get important helplines

LOCATION:
---------
GET    /api/v1/emergency/location/                    - Get cached location
POST   /api/v1/emergency/location/update/             - Update location

UTILITY:
--------
GET    /api/v1/emergency/quick-sos-data/              - All SOS screen data
GET    /api/v1/emergency/health/                      - Health check
"""