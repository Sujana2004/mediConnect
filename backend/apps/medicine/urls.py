"""
Medicine App URL Configuration.

All endpoints are prefixed with /api/v1/medicine/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    MedicineViewSet,
    PrescriptionViewSet,
    PrescriptionMedicineViewSet,
    MedicineReminderViewSet,
    ReminderLogViewSet,
    QuickMedicineDataView,
    MedicineHealthCheckView,
     TaskStatusView,
)

app_name = 'medicine'

# Create router for viewsets
router = DefaultRouter()
router.register(r'medicines', MedicineViewSet, basename='medicines')
router.register(r'prescriptions', PrescriptionViewSet, basename='prescriptions')
router.register(r'prescription-medicines', PrescriptionMedicineViewSet, basename='prescription-medicines')
router.register(r'reminders', MedicineReminderViewSet, basename='reminders')
router.register(r'reminder-logs', ReminderLogViewSet, basename='reminder-logs')

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # Quick data (all data in one call)
    path('quick-data/', QuickMedicineDataView.as_view(), name='quick-data'),
    
    # Health check
    path('health/', MedicineHealthCheckView.as_view(), name='health-check'),

    # Background task status and manual trigger
    path('tasks/status/', TaskStatusView.as_view(), name='task-status'),
    path('tasks/trigger/', TaskStatusView.as_view(), name='task-trigger'),
]


# =============================================================================
# API ENDPOINT DOCUMENTATION
# =============================================================================
"""
MEDICINES (Search & Info):
--------------------------
GET    /api/v1/medicine/medicines/                      - List medicines
GET    /api/v1/medicine/medicines/{id}/                 - Get medicine details
POST   /api/v1/medicine/medicines/search/               - Search medicines
GET    /api/v1/medicine/medicines/{id}/alternatives/    - Get alternatives
GET    /api/v1/medicine/medicines/{id}/interactions/    - Get interactions
POST   /api/v1/medicine/medicines/check-interactions/   - Check interactions
GET    /api/v1/medicine/medicines/categories/           - Get categories
GET    /api/v1/medicine/medicines/types/                - Get medicine types
GET    /api/v1/medicine/medicines/popular/              - Get popular medicines
GET    /api/v1/medicine/medicines/search-history/       - Get search history
DELETE /api/v1/medicine/medicines/search-history/clear/ - Clear search history

PRESCRIPTIONS:
--------------
GET    /api/v1/medicine/prescriptions/                  - List prescriptions
POST   /api/v1/medicine/prescriptions/                  - Create prescription
GET    /api/v1/medicine/prescriptions/{id}/             - Get prescription details
PUT    /api/v1/medicine/prescriptions/{id}/             - Update prescription
PATCH  /api/v1/medicine/prescriptions/{id}/             - Partial update
DELETE /api/v1/medicine/prescriptions/{id}/             - Delete prescription
POST   /api/v1/medicine/prescriptions/{id}/add-medicine/ - Add medicine
POST   /api/v1/medicine/prescriptions/{id}/complete/    - Mark complete
POST   /api/v1/medicine/prescriptions/{id}/discontinue/ - Discontinue
GET    /api/v1/medicine/prescriptions/active/           - Get active prescriptions
GET    /api/v1/medicine/prescriptions/current-medicines/ - Current medicines
GET    /api/v1/medicine/prescriptions/stats/            - Prescription stats
POST   /api/v1/medicine/prescriptions/check-interactions/ - Check interactions

PRESCRIPTION MEDICINES:
-----------------------
GET    /api/v1/medicine/prescription-medicines/         - List all
GET    /api/v1/medicine/prescription-medicines/{id}/    - Get details
PUT    /api/v1/medicine/prescription-medicines/{id}/    - Update
DELETE /api/v1/medicine/prescription-medicines/{id}/    - Delete
POST   /api/v1/medicine/prescription-medicines/{id}/create-reminder/ - Create reminder

REMINDERS:
----------
GET    /api/v1/medicine/reminders/                      - List reminders
POST   /api/v1/medicine/reminders/                      - Create reminder
GET    /api/v1/medicine/reminders/{id}/                 - Get reminder details
PUT    /api/v1/medicine/reminders/{id}/                 - Update reminder
DELETE /api/v1/medicine/reminders/{id}/                 - Delete reminder
POST   /api/v1/medicine/reminders/{id}/pause/           - Pause reminder
POST   /api/v1/medicine/reminders/{id}/resume/          - Resume reminder
POST   /api/v1/medicine/reminders/{id}/cancel/          - Cancel reminder
GET    /api/v1/medicine/reminders/today/                - Today's reminders
GET    /api/v1/medicine/reminders/upcoming/             - Upcoming reminders
GET    /api/v1/medicine/reminders/adherence/            - Adherence stats

REMINDER LOGS:
--------------
GET    /api/v1/medicine/reminder-logs/                  - List logs
GET    /api/v1/medicine/reminder-logs/{id}/             - Get log details
POST   /api/v1/medicine/reminder-logs/{id}/respond/     - Respond to reminder
POST   /api/v1/medicine/reminder-logs/{id}/taken/       - Mark as taken
POST   /api/v1/medicine/reminder-logs/{id}/skipped/     - Mark as skipped
POST   /api/v1/medicine/reminder-logs/{id}/snooze/      - Snooze reminder

UTILITY:
--------
GET    /api/v1/medicine/quick-data/                     - All medicine screen data
GET    /api/v1/medicine/health/                         - Health check
"""