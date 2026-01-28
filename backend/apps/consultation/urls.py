"""
Consultation App URLs
=====================
URL routing for consultation endpoints.

Total Endpoints: 40+
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.consultation.views import (
    ConsultationViewSet,
    ConsultationNoteViewSet,
    ConsultationPrescriptionViewSet,
    ConsultationAttachmentViewSet,
    ConsultationFeedbackViewSet,
    DoctorFeedbackSummaryView,
    JitsiConfigView,
    HealthCheckView,
)

app_name = 'consultation'

# Main router for consultations
router = DefaultRouter()
router.register(r'consultations', ConsultationViewSet, basename='consultation')

# Nested routes will be handled separately
urlpatterns = [
    # Main consultation routes
    path('', include(router.urls)),
    
    # ==========================================================================
    # NESTED ROUTES: Notes
    # ==========================================================================
    path(
        'consultations/<uuid:consultation_id>/notes/',
        ConsultationNoteViewSet.as_view({
            'get': 'list',
            'post': 'create'
        }),
        name='consultation-notes-list'
    ),
    path(
        'consultations/<uuid:consultation_id>/notes/<uuid:pk>/',
        ConsultationNoteViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy'
        }),
        name='consultation-notes-detail'
    ),
    
    # ==========================================================================
    # NESTED ROUTES: Prescriptions
    # ==========================================================================
    path(
        'consultations/<uuid:consultation_id>/prescriptions/',
        ConsultationPrescriptionViewSet.as_view({
            'get': 'list',
            'post': 'create'
        }),
        name='consultation-prescriptions-list'
    ),
    path(
        'consultations/<uuid:consultation_id>/prescriptions/bulk-create/',
        ConsultationPrescriptionViewSet.as_view({
            'post': 'bulk_create'
        }),
        name='consultation-prescriptions-bulk-create'
    ),
    path(
        'consultations/<uuid:consultation_id>/prescriptions/<uuid:pk>/',
        ConsultationPrescriptionViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy'
        }),
        name='consultation-prescriptions-detail'
    ),
    
    # ==========================================================================
    # NESTED ROUTES: Attachments
    # ==========================================================================
    path(
        'consultations/<uuid:consultation_id>/attachments/',
        ConsultationAttachmentViewSet.as_view({
            'get': 'list',
            'post': 'create'
        }),
        name='consultation-attachments-list'
    ),
    path(
        'consultations/<uuid:consultation_id>/attachments/<uuid:pk>/',
        ConsultationAttachmentViewSet.as_view({
            'get': 'retrieve',
            'delete': 'destroy'
        }),
        name='consultation-attachments-detail'
    ),
    
    # ==========================================================================
    # NESTED ROUTES: Feedback
    # ==========================================================================
    path(
        'consultations/<uuid:consultation_id>/feedback/',
        ConsultationFeedbackViewSet.as_view({
            'get': 'list',
            'post': 'create'
        }),
        name='consultation-feedback'
    ),
    
    # ==========================================================================
    # DOCTOR ROUTES
    # ==========================================================================
    path(
        'doctors/<uuid:doctor_id>/feedback-summary/',
        DoctorFeedbackSummaryView.as_view(),
        name='doctor-feedback-summary'
    ),
    
    # ==========================================================================
    # JITSI CONFIG
    # ==========================================================================
    path(
        'jitsi/config/',
        JitsiConfigView.as_view(),
        name='jitsi-config'
    ),
    
    # ==========================================================================
    # HEALTH CHECK
    # ==========================================================================
    path(
        'health/',
        HealthCheckView.as_view(),
        name='health-check'
    ),
]


"""
=============================================================================
                        API ENDPOINTS SUMMARY
=============================================================================

CONSULTATIONS (Main):
---------------------
GET    /api/v1/consultation/consultations/                    - List consultations
POST   /api/v1/consultation/consultations/                    - Create consultation
GET    /api/v1/consultation/consultations/{id}/               - Get consultation
PUT    /api/v1/consultation/consultations/{id}/               - Update consultation
DELETE /api/v1/consultation/consultations/{id}/               - Delete consultation

CONSULTATION ACTIONS:
---------------------
POST   /api/v1/consultation/consultations/from-appointment/   - Create from appointment
POST   /api/v1/consultation/consultations/{id}/join/          - Get join info
POST   /api/v1/consultation/consultations/{id}/join-waiting-room/ - Patient joins waiting
POST   /api/v1/consultation/consultations/{id}/start/         - Doctor starts
POST   /api/v1/consultation/consultations/{id}/end/           - End consultation
POST   /api/v1/consultation/consultations/{id}/cancel/        - Cancel consultation
POST   /api/v1/consultation/consultations/{id}/reschedule/    - Reschedule

CONSULTATION QUERIES:
---------------------
GET    /api/v1/consultation/consultations/upcoming/           - Get upcoming
GET    /api/v1/consultation/consultations/today/              - Get today's (doctor)
GET    /api/v1/consultation/consultations/waiting/            - Get waiting patients
GET    /api/v1/consultation/consultations/history/            - Get history
GET    /api/v1/consultation/consultations/stats/              - Get statistics
GET    /api/v1/consultation/consultations/quick-data/         - Dashboard quick data

NOTES:
------
GET    /api/v1/consultation/consultations/{id}/notes/         - List notes
POST   /api/v1/consultation/consultations/{id}/notes/         - Create note
GET    /api/v1/consultation/consultations/{id}/notes/{nid}/   - Get note
PUT    /api/v1/consultation/consultations/{id}/notes/{nid}/   - Update note
DELETE /api/v1/consultation/consultations/{id}/notes/{nid}/   - Delete note

PRESCRIPTIONS:
--------------
GET    /api/v1/consultation/consultations/{id}/prescriptions/           - List
POST   /api/v1/consultation/consultations/{id}/prescriptions/           - Create
POST   /api/v1/consultation/consultations/{id}/prescriptions/bulk-create/ - Bulk create
GET    /api/v1/consultation/consultations/{id}/prescriptions/{pid}/     - Get
PUT    /api/v1/consultation/consultations/{id}/prescriptions/{pid}/     - Update
DELETE /api/v1/consultation/consultations/{id}/prescriptions/{pid}/     - Delete

ATTACHMENTS:
------------
GET    /api/v1/consultation/consultations/{id}/attachments/         - List
POST   /api/v1/consultation/consultations/{id}/attachments/         - Upload
GET    /api/v1/consultation/consultations/{id}/attachments/{aid}/   - Get
DELETE /api/v1/consultation/consultations/{id}/attachments/{aid}/   - Delete

FEEDBACK:
---------
GET    /api/v1/consultation/consultations/{id}/feedback/      - Get feedback
POST   /api/v1/consultation/consultations/{id}/feedback/      - Create feedback

DOCTOR:
-------
GET    /api/v1/consultation/doctors/{id}/feedback-summary/    - Feedback summary

OTHER:
------
GET    /api/v1/consultation/jitsi/config/                     - Jitsi config
GET    /api/v1/consultation/health/                           - Health check

=============================================================================
"""