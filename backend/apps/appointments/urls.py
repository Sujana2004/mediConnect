"""
Appointments App URL Configuration for MediConnect.

URL Patterns:
1. /schedules/ - Doctor schedule management
2. /exceptions/ - Schedule exceptions (leaves, holidays)
3. /slots/ - Time slot viewing
4. /appointments/ - Appointment booking and management
5. /queue/ - Queue management
6. /availability/ - Doctor availability checking
7. /quick-data/ - Dashboard quick data
8. /health/ - Health check
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    # ViewSets
    DoctorScheduleViewSet,
    ScheduleExceptionViewSet,
    TimeSlotViewSet,
    AppointmentViewSet,
    QueueViewSet,
    # API Views
    AvailableSlotsView,
    GenerateSlotsView,
    CheckInView,
    DoctorAvailabilityView,
    QuickAppointmentDataView,
    HealthCheckView,
)

app_name = 'appointments'

# Create router and register viewsets
router = DefaultRouter()
router.register(r'schedules', DoctorScheduleViewSet, basename='schedule')
router.register(r'exceptions', ScheduleExceptionViewSet, basename='exception')
router.register(r'slots', TimeSlotViewSet, basename='slot')
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'queue', QueueViewSet, basename='queue')

urlpatterns = [
    # ==========================================================================
    # ROUTER URLS (ViewSets)
    # ==========================================================================
    path('', include(router.urls)),
    
    # ==========================================================================
    # SLOT MANAGEMENT
    # ==========================================================================
    
    # Get available slots for a doctor on a specific date
    # GET /api/v1/appointments/available-slots/<doctor_id>/?date=2025-01-15
    path(
        'available-slots/<uuid:doctor_id>/',
        AvailableSlotsView.as_view(),
        name='available-slots'
    ),
    
    # Generate time slots for upcoming days (doctors only)
    # POST /api/v1/appointments/generate-slots/
    path(
        'generate-slots/',
        GenerateSlotsView.as_view(),
        name='generate-slots'
    ),
    
    # ==========================================================================
    # CHECK-IN
    # ==========================================================================
    
    # Patient check-in for appointment
    # POST /api/v1/appointments/check-in/
    path(
        'check-in/',
        CheckInView.as_view(),
        name='check-in'
    ),
    
    # ==========================================================================
    # DOCTOR AVAILABILITY
    # ==========================================================================
    
    # Get doctor availability for date range
    # GET /api/v1/appointments/availability/<doctor_id>/?start_date=2025-01-15&days=30
    path(
        'availability/<uuid:doctor_id>/',
        DoctorAvailabilityView.as_view(),
        name='doctor-availability'
    ),
    
    # ==========================================================================
    # QUICK DATA (Dashboard)
    # ==========================================================================
    
    # Get quick appointment data for dashboard
    # GET /api/v1/appointments/quick-data/
    path(
        'quick-data/',
        QuickAppointmentDataView.as_view(),
        name='quick-data'
    ),
    
    # ==========================================================================
    # HEALTH CHECK
    # ==========================================================================
    
    # Health check endpoint
    # GET /api/v1/appointments/health/
    path(
        'health/',
        HealthCheckView.as_view(),
        name='health-check'
    ),
]


# =============================================================================
# URL PATTERNS SUMMARY
# =============================================================================
"""
SCHEDULES (Doctor Schedule Management):
---------------------------------------
GET     /api/v1/appointments/schedules/                     - List doctor's schedules
POST    /api/v1/appointments/schedules/                     - Create schedule entry
GET     /api/v1/appointments/schedules/<id>/                - Get schedule details
PUT     /api/v1/appointments/schedules/<id>/                - Update schedule
PATCH   /api/v1/appointments/schedules/<id>/                - Partial update schedule
DELETE  /api/v1/appointments/schedules/<id>/                - Delete schedule
GET     /api/v1/appointments/schedules/weekly/              - Get complete weekly schedule
POST    /api/v1/appointments/schedules/bulk_update/         - Bulk create/update schedules

EXCEPTIONS (Leaves, Holidays, Modified Hours):
----------------------------------------------
GET     /api/v1/appointments/exceptions/                    - List exceptions
POST    /api/v1/appointments/exceptions/                    - Create exception
GET     /api/v1/appointments/exceptions/<id>/               - Get exception details
PUT     /api/v1/appointments/exceptions/<id>/               - Update exception
PATCH   /api/v1/appointments/exceptions/<id>/               - Partial update exception
DELETE  /api/v1/appointments/exceptions/<id>/               - Delete exception
POST    /api/v1/appointments/exceptions/add_leave/          - Quick add leave
GET     /api/v1/appointments/exceptions/upcoming/           - Get upcoming exceptions

SLOTS (Time Slot Management):
-----------------------------
GET     /api/v1/appointments/slots/                         - List time slots
GET     /api/v1/appointments/slots/<id>/                    - Get slot details
GET     /api/v1/appointments/available-slots/<doctor_id>/   - Get available slots for date
POST    /api/v1/appointments/generate-slots/                - Generate slots (doctors only)

APPOINTMENTS (Booking & Management):
------------------------------------
GET     /api/v1/appointments/appointments/                  - List appointments
POST    /api/v1/appointments/appointments/                  - Create appointment
GET     /api/v1/appointments/appointments/<id>/             - Get appointment details
PUT     /api/v1/appointments/appointments/<id>/             - Update appointment
PATCH   /api/v1/appointments/appointments/<id>/             - Partial update appointment
DELETE  /api/v1/appointments/appointments/<id>/             - Delete appointment
POST    /api/v1/appointments/appointments/<id>/confirm/     - Confirm appointment (doctor)
POST    /api/v1/appointments/appointments/<id>/cancel/      - Cancel appointment
POST    /api/v1/appointments/appointments/<id>/reschedule/  - Reschedule appointment
POST    /api/v1/appointments/appointments/<id>/check_in/    - Check in for appointment
POST    /api/v1/appointments/appointments/<id>/start/       - Start consultation (doctor)
POST    /api/v1/appointments/appointments/<id>/complete/    - Complete consultation (doctor)
POST    /api/v1/appointments/appointments/<id>/no_show/     - Mark no-show (doctor)
GET     /api/v1/appointments/appointments/today/            - Get today's appointments
GET     /api/v1/appointments/appointments/upcoming/         - Get upcoming appointments
GET     /api/v1/appointments/appointments/today_summary/    - Get today's summary (doctor)

QUEUE (Queue Management):
-------------------------
GET     /api/v1/appointments/queue/                         - List queue entries
GET     /api/v1/appointments/queue/<id>/                    - Get queue entry details
GET     /api/v1/appointments/queue/waiting/                 - Get waiting queue (doctor)
POST    /api/v1/appointments/queue/call_next/               - Call next patient (doctor)
POST    /api/v1/appointments/queue/<id>/perform-action/             - Perform queue action (doctor)
POST    /api/v1/appointments/queue/<id>/requeue/            - Requeue skipped patient (doctor)
GET     /api/v1/appointments/queue/stats/                   - Get queue statistics (doctor)
GET     /api/v1/appointments/queue/my_status/               - Get patient's queue status

CHECK-IN:
---------
POST    /api/v1/appointments/check-in/                      - Patient check-in

AVAILABILITY:
-------------
GET     /api/v1/appointments/availability/<doctor_id>/      - Get doctor availability

QUICK DATA:
-----------
GET     /api/v1/appointments/quick-data/                    - Dashboard quick data

HEALTH:
-------
GET     /api/v1/appointments/health/                        - Health check
"""