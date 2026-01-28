"""
Health Records URL Configuration
================================
All URL patterns for health records endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    HealthProfileViewSet,
    MedicalConditionViewSet,
    MedicalDocumentViewSet,
    LabReportViewSet,
    VaccinationRecordViewSet,
    AllergyViewSet,
    FamilyMedicalHistoryViewSet,
    HospitalizationViewSet,
    VitalSignViewSet,
    SharedRecordViewSet,
    HealthAnalyticsView,
    HealthCheckView,
)

app_name = 'health_records'

# Create router
router = DefaultRouter()

# Register ViewSets
router.register(r'profile', HealthProfileViewSet, basename='health-profile')
router.register(r'conditions', MedicalConditionViewSet, basename='medical-condition')
router.register(r'documents', MedicalDocumentViewSet, basename='medical-document')
router.register(r'lab-reports', LabReportViewSet, basename='lab-report')
router.register(r'vaccinations', VaccinationRecordViewSet, basename='vaccination')
router.register(r'allergies', AllergyViewSet, basename='allergy')
router.register(r'family-history', FamilyMedicalHistoryViewSet, basename='family-history')
router.register(r'hospitalizations', HospitalizationViewSet, basename='hospitalization')
router.register(r'vitals', VitalSignViewSet, basename='vital-sign')
router.register(r'sharing', SharedRecordViewSet, basename='shared-record')

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # Analytics endpoints
    path('analytics/timeline/', HealthAnalyticsView.as_view(), {'action': 'timeline'}, name='analytics-timeline'),
    path('analytics/score/', HealthAnalyticsView.as_view(), {'action': 'score'}, name='analytics-score'),
    path('analytics/summary/', HealthAnalyticsView.as_view(), {'action': 'summary'}, name='analytics-summary'),
    path('analytics/quick-data/', HealthAnalyticsView.as_view(), {'action': 'quick-data'}, name='analytics-quick-data'),
    
    # Health check
    path('health/', HealthCheckView.as_view(), name='health-check'),
]

"""
=============================================================================
COMPLETE API ENDPOINTS REFERENCE
=============================================================================

HEALTH PROFILE:
---------------
GET    /api/v1/health-records/profile/                    - Get health profile
POST   /api/v1/health-records/profile/                    - Create/update profile
PUT    /api/v1/health-records/profile/{id}/               - Update profile
PATCH  /api/v1/health-records/profile/{id}/               - Partial update
GET    /api/v1/health-records/profile/summary/            - Get profile summary
GET    /api/v1/health-records/profile/critical-info/      - Get critical health info
POST   /api/v1/health-records/profile/sync-allergies/     - Sync allergies from records
POST   /api/v1/health-records/profile/sync-conditions/    - Sync conditions from records
POST   /api/v1/health-records/profile/update-emergency-contact/ - Update emergency contact

MEDICAL CONDITIONS:
-------------------
GET    /api/v1/health-records/conditions/                 - List all conditions
POST   /api/v1/health-records/conditions/                 - Create condition
GET    /api/v1/health-records/conditions/{id}/            - Get condition detail
PUT    /api/v1/health-records/conditions/{id}/            - Update condition
PATCH  /api/v1/health-records/conditions/{id}/            - Partial update
DELETE /api/v1/health-records/conditions/{id}/            - Delete condition
GET    /api/v1/health-records/conditions/active/          - Get active conditions
GET    /api/v1/health-records/conditions/chronic/         - Get chronic conditions
POST   /api/v1/health-records/conditions/{id}/resolve/    - Mark as resolved

MEDICAL DOCUMENTS:
------------------
GET    /api/v1/health-records/documents/                  - List all documents
POST   /api/v1/health-records/documents/                  - Upload document
GET    /api/v1/health-records/documents/{id}/             - Get document detail
PUT    /api/v1/health-records/documents/{id}/             - Update document
PATCH  /api/v1/health-records/documents/{id}/             - Partial update
DELETE /api/v1/health-records/documents/{id}/             - Delete document
GET    /api/v1/health-records/documents/recent/           - Get recent documents
GET    /api/v1/health-records/documents/by-type/{type}/   - Get by document type
POST   /api/v1/health-records/documents/search/           - Search documents
POST   /api/v1/health-records/documents/{id}/toggle-sharing/ - Toggle sharing status
GET    /api/v1/health-records/documents/storage-usage/    - Get storage usage stats

LAB REPORTS:
------------
GET    /api/v1/health-records/lab-reports/                - List all lab reports
POST   /api/v1/health-records/lab-reports/                - Create lab report
GET    /api/v1/health-records/lab-reports/{id}/           - Get lab report detail
PUT    /api/v1/health-records/lab-reports/{id}/           - Update lab report
PATCH  /api/v1/health-records/lab-reports/{id}/           - Partial update
DELETE /api/v1/health-records/lab-reports/{id}/           - Delete lab report
GET    /api/v1/health-records/lab-reports/recent/         - Get recent reports
GET    /api/v1/health-records/lab-reports/abnormal/       - Get abnormal reports
GET    /api/v1/health-records/lab-reports/trends/         - Get test trends

VACCINATIONS:
-------------
GET    /api/v1/health-records/vaccinations/               - List all vaccinations
POST   /api/v1/health-records/vaccinations/               - Create vaccination record
GET    /api/v1/health-records/vaccinations/{id}/          - Get vaccination detail
PUT    /api/v1/health-records/vaccinations/{id}/          - Update vaccination
PATCH  /api/v1/health-records/vaccinations/{id}/          - Partial update
DELETE /api/v1/health-records/vaccinations/{id}/          - Delete vaccination
GET    /api/v1/health-records/vaccinations/pending/       - Get pending vaccinations
GET    /api/v1/health-records/vaccinations/schedule/      - Get vaccination schedule
POST   /api/v1/health-records/vaccinations/{id}/verify/   - Verify (doctor only)

ALLERGIES:
----------
GET    /api/v1/health-records/allergies/                  - List all allergies
POST   /api/v1/health-records/allergies/                  - Create allergy record
GET    /api/v1/health-records/allergies/{id}/             - Get allergy detail
PUT    /api/v1/health-records/allergies/{id}/             - Update allergy
PATCH  /api/v1/health-records/allergies/{id}/             - Partial update
DELETE /api/v1/health-records/allergies/{id}/             - Delete allergy
GET    /api/v1/health-records/allergies/active/           - Get active allergies
GET    /api/v1/health-records/allergies/critical/         - Get critical allergies
GET    /api/v1/health-records/allergies/drug/             - Get drug allergies

FAMILY HISTORY:
---------------
GET    /api/v1/health-records/family-history/             - List all family history
POST   /api/v1/health-records/family-history/             - Create family history
GET    /api/v1/health-records/family-history/{id}/        - Get record detail
PUT    /api/v1/health-records/family-history/{id}/        - Update record
PATCH  /api/v1/health-records/family-history/{id}/        - Partial update
DELETE /api/v1/health-records/family-history/{id}/        - Delete record
GET    /api/v1/health-records/family-history/summary/     - Get summary by condition
GET    /api/v1/health-records/family-history/risk-conditions/ - Get hereditary risks

HOSPITALIZATIONS:
-----------------
GET    /api/v1/health-records/hospitalizations/           - List all hospitalizations
POST   /api/v1/health-records/hospitalizations/           - Create hospitalization
GET    /api/v1/health-records/hospitalizations/{id}/      - Get hospitalization detail
PUT    /api/v1/health-records/hospitalizations/{id}/      - Update hospitalization
PATCH  /api/v1/health-records/hospitalizations/{id}/      - Partial update
DELETE /api/v1/health-records/hospitalizations/{id}/      - Delete hospitalization
GET    /api/v1/health-records/hospitalizations/pending-followups/ - Get pending follow-ups

VITAL SIGNS:
------------
GET    /api/v1/health-records/vitals/                     - List all vital signs
POST   /api/v1/health-records/vitals/                     - Record vital signs
GET    /api/v1/health-records/vitals/{id}/                - Get vital sign detail
PUT    /api/v1/health-records/vitals/{id}/                - Update vital sign
PATCH  /api/v1/health-records/vitals/{id}/                - Partial update
DELETE /api/v1/health-records/vitals/{id}/                - Delete vital sign
GET    /api/v1/health-records/vitals/latest/              - Get latest vitals
GET    /api/v1/health-records/vitals/trends/              - Get vital trends
GET    /api/v1/health-records/vitals/statistics/          - Get vital statistics

SHARING:
--------
GET    /api/v1/health-records/sharing/                    - List shared records
POST   /api/v1/health-records/sharing/                    - Create share
DELETE /api/v1/health-records/sharing/{id}/               - Revoke share
GET    /api/v1/health-records/sharing/my-shares/          - Get my shared records
GET    /api/v1/health-records/sharing/accessible-patients/ - Get accessible patients (doctor)
GET    /api/v1/health-records/sharing/patient/{id}/records/ - Get patient records (doctor)

ANALYTICS:
----------
GET    /api/v1/health-records/analytics/timeline/         - Get health timeline
GET    /api/v1/health-records/analytics/score/            - Get health score
GET    /api/v1/health-records/analytics/summary/          - Get comprehensive summary
GET    /api/v1/health-records/analytics/quick-data/       - Get quick dashboard data

HEALTH CHECK:
-------------
GET    /api/v1/health-records/health/                     - Service health check

=============================================================================
TOTAL ENDPOINTS: 75+
=============================================================================
"""