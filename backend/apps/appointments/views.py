from django.shortcuts import render

"""
Appointments App Views for MediConnect.

API Views for:
1. Doctor Schedule Management
2. Schedule Exceptions (Leaves/Modified Hours)
3. Time Slot Management
4. Appointment Booking & Management
5. Queue Management
6. Reminders
"""

import logging
from datetime import datetime, timedelta, date
from django.db import transaction
from django.db.models import Q, Count
from django.utils import timezone
from django.shortcuts import get_object_or_404

from rest_framework import status, viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import (
    DoctorSchedule,
    ScheduleException,
    TimeSlot,
    Appointment,
    AppointmentQueue,
    AppointmentReminder,
)
from .serializers import (
    # Schedule serializers
    DoctorScheduleSerializer,
    DoctorScheduleCreateSerializer,
    DoctorScheduleListSerializer,
    WeeklyScheduleSerializer,
    # Exception serializers
    ScheduleExceptionSerializer,
    ScheduleExceptionCreateSerializer,
    # Slot serializers
    TimeSlotSerializer,
    TimeSlotListSerializer,
    AvailableSlotsRequestSerializer,
    AvailableSlotsResponseSerializer,
    # Appointment serializers
    AppointmentSerializer,
    AppointmentListSerializer,
    AppointmentCreateSerializer,
    AppointmentUpdateSerializer,
    AppointmentRescheduleSerializer,
    AppointmentCancelSerializer,
    AppointmentStatusUpdateSerializer,
    # Queue serializers
    AppointmentQueueSerializer,
    AppointmentQueueListSerializer,
    QueueActionSerializer,
    CheckInSerializer,
    # Reminder serializers
    AppointmentReminderSerializer,
    # Quick data serializers
    DoctorAvailabilitySerializer,
    TodayAppointmentsSummarySerializer,
    QuickAppointmentDataSerializer,
)
from .services import (
    ScheduleService,
    SlotService,
    AppointmentService,
    QueueService,
    ReminderService,
)

logger = logging.getLogger(__name__)


# =============================================================================
# PERMISSION CLASSES
# =============================================================================

class IsDoctor(permissions.BasePermission):
    """Permission class to check if user is a doctor."""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'doctor_profile')


class IsPatient(permissions.BasePermission):
    """Permission class to check if user is a patient."""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'patient_profile')


class IsDoctorOrReadOnly(permissions.BasePermission):
    """Permission: Doctors can write, others can read."""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return hasattr(request.user, 'doctor_profile')


class IsAppointmentParticipant(permissions.BasePermission):
    """Permission to check if user is patient or doctor of appointment."""
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        return obj.patient == request.user or obj.doctor == request.user


# =============================================================================
# DOCTOR SCHEDULE VIEWS
# =============================================================================

class DoctorScheduleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing doctor schedules.
    
    Doctors can manage their own schedules.
    Patients can view doctor schedules.
    """
    
    permission_classes = [permissions.IsAuthenticated, IsDoctorOrReadOnly]
    
    def get_queryset(self):
        """Get schedules based on user type."""
        user = self.request.user
        
        if hasattr(user, 'doctor_profile'):
            # Doctors see their own schedules
            return DoctorSchedule.objects.filter(doctor=user)
        else:
            # Patients see all active schedules
            return DoctorSchedule.objects.filter(is_active=True)
    
    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == 'create':
            return DoctorScheduleCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return DoctorScheduleCreateSerializer
        elif self.action == 'list':
            return DoctorScheduleListSerializer
        return DoctorScheduleSerializer
    
    @swagger_auto_schema(
        operation_description="List doctor's schedules",
        responses={200: DoctorScheduleListSerializer(many=True)}
    )
    def list(self, request, *args, **kwargs):
        """List schedules."""
        return super().list(request, *args, **kwargs)
    
    @swagger_auto_schema(
        operation_description="Create a new schedule entry",
        request_body=DoctorScheduleCreateSerializer,
        responses={201: DoctorScheduleSerializer}
    )
    def create(self, request, *args, **kwargs):
        """Create schedule (doctors only)."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        schedule = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Schedule created successfully.',
            'data': DoctorScheduleSerializer(schedule).data
        }, status=status.HTTP_201_CREATED)
    
    @swagger_auto_schema(
        operation_description="Get schedule details",
        responses={200: DoctorScheduleSerializer}
    )
    def retrieve(self, request, *args, **kwargs):
        """Get schedule details."""
        instance = self.get_object()
        serializer = DoctorScheduleSerializer(instance)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    @swagger_auto_schema(
        operation_description="Update schedule",
        request_body=DoctorScheduleCreateSerializer,
        responses={200: DoctorScheduleSerializer}
    )
    def update(self, request, *args, **kwargs):
        """Update schedule."""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        schedule = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Schedule updated successfully.',
            'data': DoctorScheduleSerializer(schedule).data
        })
    
    @swagger_auto_schema(
        operation_description="Delete schedule",
        responses={204: 'Schedule deleted'}
    )
    def destroy(self, request, *args, **kwargs):
        """Delete schedule."""
        instance = self.get_object()
        instance.delete()
        
        return Response({
            'success': True,
            'message': 'Schedule deleted successfully.'
        }, status=status.HTTP_204_NO_CONTENT)
    
    @swagger_auto_schema(
        method='get',
        operation_description="Get complete weekly schedule for a doctor",
        manual_parameters=[
            openapi.Parameter(
                'doctor_id',
                openapi.IN_QUERY,
                description="Doctor ID (optional, defaults to current user if doctor)",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_UUID
            ),
        ],
        responses={200: WeeklyScheduleSerializer}
    )
    @action(detail=False, methods=['get'])
    def weekly(self, request):
        """Get complete weekly schedule."""
        doctor_id = request.query_params.get('doctor_id')
        
        if doctor_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                doctor = User.objects.get(id=doctor_id)
            except User.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'Doctor not found.'
                }, status=status.HTTP_404_NOT_FOUND)
        elif hasattr(request.user, 'doctor_profile'):
            doctor = request.user
        else:
            return Response({
                'success': False,
                'message': 'Doctor ID is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        schedules = ScheduleService.get_weekly_schedule(doctor)
        exceptions = ScheduleService.get_upcoming_exceptions(doctor, days=30)
        
        data = {
            'doctor_id': str(doctor.id),
            'doctor_name': doctor.get_full_name(),
            'schedules': DoctorScheduleListSerializer(schedules, many=True).data,
            'exceptions': ScheduleExceptionSerializer(exceptions, many=True).data,
        }
        
        return Response({
            'success': True,
            'data': data
        })
    
    @swagger_auto_schema(
        method='post',
        operation_description="Bulk create/update weekly schedule",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'schedules': openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        properties={
                            'day_of_week': openapi.Schema(type=openapi.TYPE_INTEGER),
                            'start_time': openapi.Schema(type=openapi.TYPE_STRING),
                            'end_time': openapi.Schema(type=openapi.TYPE_STRING),
                            'break_start': openapi.Schema(type=openapi.TYPE_STRING),
                            'break_end': openapi.Schema(type=openapi.TYPE_STRING),
                            'slot_duration_minutes': openapi.Schema(type=openapi.TYPE_INTEGER),
                            'max_patients_per_slot': openapi.Schema(type=openapi.TYPE_INTEGER),
                            'consultation_fee': openapi.Schema(type=openapi.TYPE_NUMBER),
                            'is_active': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        }
                    )
                )
            }
        ),
        responses={200: DoctorScheduleListSerializer(many=True)}
    )
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsDoctor])
    def bulk_update(self, request):
        """Bulk create/update weekly schedule."""
        schedules_data = request.data.get('schedules', [])
        
        if not schedules_data:
            return Response({
                'success': False,
                'message': 'No schedules provided.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            schedules = ScheduleService.create_schedule(
                doctor=request.user,
                schedule_data=schedules_data
            )
            
            return Response({
                'success': True,
                'message': f'Created/updated {len(schedules)} schedule entries.',
                'data': DoctorScheduleListSerializer(schedules, many=True).data
            })
        except Exception as e:
            logger.error(f"Bulk schedule update error: {e}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# SCHEDULE EXCEPTION VIEWS
# =============================================================================

class ScheduleExceptionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing schedule exceptions (leaves, modified hours).
    
    Doctors can manage their own exceptions.
    """
    
    permission_classes = [permissions.IsAuthenticated, IsDoctor]
    
    def get_queryset(self):
        """Get exceptions for current doctor."""
        return ScheduleException.objects.filter(
            doctor=self.request.user
        ).order_by('-exception_date')
    
    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action in ['create', 'update', 'partial_update']:
            return ScheduleExceptionCreateSerializer
        return ScheduleExceptionSerializer
    
    @swagger_auto_schema(
        operation_description="List schedule exceptions",
        responses={200: ScheduleExceptionSerializer(many=True)}
    )
    def list(self, request, *args, **kwargs):
        """List exceptions."""
        queryset = self.get_queryset()
        
        # Filter by date range
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if date_from:
            queryset = queryset.filter(exception_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(exception_date__lte=date_to)
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    @swagger_auto_schema(
        operation_description="Create schedule exception",
        request_body=ScheduleExceptionCreateSerializer,
        responses={201: ScheduleExceptionSerializer}
    )
    def create(self, request, *args, **kwargs):
        """Create exception."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        exception = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Exception created successfully.',
            'data': ScheduleExceptionSerializer(exception).data
        }, status=status.HTTP_201_CREATED)
    
    @swagger_auto_schema(
        method='post',
        operation_description="Add leave/holiday for a date",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['date'],
            properties={
                'date': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE),
                'reason': openapi.Schema(type=openapi.TYPE_STRING),
            }
        ),
        responses={201: ScheduleExceptionSerializer}
    )
    @action(detail=False, methods=['post'])
    def add_leave(self, request):
        """Quick add leave for a date."""
        exception_date = request.data.get('date')
        reason = request.data.get('reason', 'Leave')
        
        if not exception_date:
            return Response({
                'success': False,
                'message': 'Date is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            exception = ScheduleService.create_exception(
                doctor=request.user,
                exception_date=datetime.strptime(exception_date, '%Y-%m-%d').date(),
                exception_type='leave',
                reason=reason
            )
            
            return Response({
                'success': True,
                'message': 'Leave added successfully.',
                'data': ScheduleExceptionSerializer(exception).data
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @swagger_auto_schema(
        method='get',
        operation_description="Get upcoming exceptions",
        manual_parameters=[
            openapi.Parameter(
                'days',
                openapi.IN_QUERY,
                description="Number of days to look ahead (default: 30)",
                type=openapi.TYPE_INTEGER
            ),
        ],
        responses={200: ScheduleExceptionSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming exceptions."""
        days = int(request.query_params.get('days', 30))
        
        exceptions = ScheduleService.get_upcoming_exceptions(
            doctor=request.user,
            days=days
        )
        
        return Response({
            'success': True,
            'data': ScheduleExceptionSerializer(exceptions, many=True).data
        })


# =============================================================================
# TIME SLOT VIEWS
# =============================================================================

class TimeSlotViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing time slots.
    
    Slots are generated automatically based on doctor schedules.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TimeSlotSerializer
    
    def get_queryset(self):
        """Get time slots."""
        queryset = TimeSlot.objects.all()
        
        # Filter by doctor
        doctor_id = self.request.query_params.get('doctor_id')
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)
        
        # Filter by date
        slot_date = self.request.query_params.get('date')
        if slot_date:
            queryset = queryset.filter(slot_date=slot_date)
        
        # Filter by status
        slot_status = self.request.query_params.get('status')
        if slot_status:
            queryset = queryset.filter(status=slot_status)
        
        return queryset.select_related('doctor').order_by('slot_date', 'start_time')
    
    @swagger_auto_schema(
        operation_description="List time slots",
        manual_parameters=[
            openapi.Parameter('doctor_id', openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter('date', openapi.IN_QUERY, type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE),
            openapi.Parameter('status', openapi.IN_QUERY, type=openapi.TYPE_STRING),
        ],
        responses={200: TimeSlotSerializer(many=True)}
    )
    def list(self, request, *args, **kwargs):
        """List time slots."""
        return super().list(request, *args, **kwargs)


class AvailableSlotsView(APIView):
    """
    View for getting available slots for a doctor on a specific date.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get available slots for a doctor on a date",
        manual_parameters=[
            openapi.Parameter(
                'doctor_id',
                openapi.IN_PATH,
                description="Doctor ID",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_UUID,
                required=True
            ),
            openapi.Parameter(
                'date',
                openapi.IN_QUERY,
                description="Date (YYYY-MM-DD)",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_DATE,
                required=True
            ),
        ],
        responses={200: AvailableSlotsResponseSerializer}
    )
    def get(self, request, doctor_id):
        """Get available slots."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Validate doctor
        try:
            doctor = User.objects.get(id=doctor_id)
            if not hasattr(doctor, 'doctor_profile'):
                return Response({
                    'success': False,
                    'message': 'User is not a doctor.'
                }, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Doctor not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Validate date
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({
                'success': False,
                'message': 'Date is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            slot_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({
                'success': False,
                'message': 'Invalid date format. Use YYYY-MM-DD.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if slot_date < timezone.now().date():
            return Response({
                'success': False,
                'message': 'Cannot get slots for past dates.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if doctor is available on this date
        is_available, reason = ScheduleService.is_doctor_available_on_date(doctor, slot_date)
        
        if not is_available:
            return Response({
                'success': True,
                'data': {
                    'doctor_id': str(doctor.id),
                    'doctor_name': doctor.get_full_name(),
                    'date': slot_date,
                    'is_available': False,
                    'reason': reason,
                    'slots': [],
                    'total_slots': 0,
                    'available_slots': 0,
                }
            })
        
        # Generate slots if needed
        existing_slots = TimeSlot.objects.filter(
            doctor=doctor,
            slot_date=slot_date
        ).exists()
        
        if not existing_slots:
            SlotService.generate_slots_for_date(doctor, slot_date)
        
        # Get available slots
        slots = SlotService.get_available_slots(doctor, slot_date)
        all_slots = TimeSlot.objects.filter(doctor=doctor, slot_date=slot_date)
        
        return Response({
            'success': True,
            'data': {
                'doctor_id': str(doctor.id),
                'doctor_name': doctor.get_full_name(),
                'date': slot_date,
                'is_available': True,
                'slots': TimeSlotListSerializer(slots, many=True).data,
                'total_slots': all_slots.count(),
                'available_slots': len(slots),
            }
        })


class GenerateSlotsView(APIView):
    """
    View for generating time slots (doctors only).
    """
    
    permission_classes = [permissions.IsAuthenticated, IsDoctor]
    
    @swagger_auto_schema(
        operation_description="Generate time slots for upcoming days",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'start_date': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format=openapi.FORMAT_DATE,
                    description="Start date (default: today)"
                ),
                'days': openapi.Schema(
                    type=openapi.TYPE_INTEGER,
                    description="Number of days to generate (default: 7)"
                ),
            }
        ),
        responses={200: openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                'message': openapi.Schema(type=openapi.TYPE_STRING),
                'slots_generated': openapi.Schema(type=openapi.TYPE_INTEGER),
            }
        )}
    )
    def post(self, request):
        """Generate time slots."""
        start_date_str = request.data.get('start_date')
        days = int(request.data.get('days', 7))
        
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({
                    'success': False,
                    'message': 'Invalid date format. Use YYYY-MM-DD.'
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            start_date = timezone.now().date()
        
        # Limit days to prevent abuse
        days = min(days, 90)
        
        try:
            slots_by_date = SlotService.generate_slots_for_range(
                doctor=request.user,
                start_date=start_date,
                days=days
            )
            
            total_slots = sum(len(slots) for slots in slots_by_date.values())
            
            return Response({
                'success': True,
                'message': f'Generated {total_slots} slots for {len(slots_by_date)} days.',
                'slots_generated': total_slots,
                'dates_covered': len(slots_by_date),
            })
        except Exception as e:
            logger.error(f"Slot generation error: {e}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# APPOINTMENT VIEWS
# =============================================================================

class AppointmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing appointments.
    
    Patients can create and manage their appointments.
    Doctors can view and update appointments with them.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get appointments based on user type."""
        user = self.request.user
        
        if hasattr(user, 'doctor_profile'):
            # Doctors see appointments with them
            queryset = Appointment.objects.filter(doctor=user)
        else:
            # Patients see their own appointments
            queryset = Appointment.objects.filter(patient=user)
        
        # Apply filters
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        date_filter = self.request.query_params.get('date')
        if date_filter:
            queryset = queryset.filter(appointment_date=date_filter)
        
        upcoming = self.request.query_params.get('upcoming')
        if upcoming and upcoming.lower() == 'true':
            today = timezone.now().date()
            queryset = queryset.filter(
                appointment_date__gte=today
            ).exclude(
                status__in=['cancelled', 'completed', 'no_show']
            )
        
        return queryset.select_related('patient', 'doctor').order_by(
            '-appointment_date', 'start_time'
        )
    
    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == 'create':
            return AppointmentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return AppointmentUpdateSerializer
        elif self.action == 'list':
            return AppointmentListSerializer
        return AppointmentSerializer
    
    @swagger_auto_schema(
        operation_description="List appointments",
        manual_parameters=[
            openapi.Parameter('status', openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter('date', openapi.IN_QUERY, type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE),
            openapi.Parameter('upcoming', openapi.IN_QUERY, type=openapi.TYPE_BOOLEAN),
        ],
        responses={200: AppointmentListSerializer(many=True)}
    )
    def list(self, request, *args, **kwargs):
        """List appointments."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'count': queryset.count(),
            'data': serializer.data
        })
    
    @swagger_auto_schema(
        operation_description="Create a new appointment",
        request_body=AppointmentCreateSerializer,
        responses={201: AppointmentSerializer}
    )
    def create(self, request, *args, **kwargs):
        """Create appointment."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Appointment booked successfully.',
            'data': AppointmentSerializer(appointment).data
        }, status=status.HTTP_201_CREATED)
    
    @swagger_auto_schema(
        operation_description="Get appointment details",
        responses={200: AppointmentSerializer}
    )
    def retrieve(self, request, *args, **kwargs):
        """Get appointment details."""
        instance = self.get_object()
        serializer = AppointmentSerializer(instance)
        
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    @swagger_auto_schema(
        operation_description="Update appointment",
        request_body=AppointmentUpdateSerializer,
        responses={200: AppointmentSerializer}
    )
    def update(self, request, *args, **kwargs):
        """Update appointment."""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Appointment updated successfully.',
            'data': AppointmentSerializer(appointment).data
        })
    
    @swagger_auto_schema(
        method='post',
        operation_description="Confirm an appointment (doctors only)",
        responses={200: AppointmentSerializer}
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsDoctor])
    def confirm(self, request, pk=None):
        """Confirm appointment."""
        appointment = self.get_object()
        
        success, error = AppointmentService.confirm_appointment(appointment)
        
        if not success:
            return Response({
                'success': False,
                'message': error
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'success': True,
            'message': 'Appointment confirmed.',
            'data': AppointmentSerializer(appointment).data
        })
    
    @swagger_auto_schema(
        method='post',
        operation_description="Cancel an appointment",
        request_body=AppointmentCancelSerializer,
        responses={200: AppointmentSerializer}
    )
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel appointment."""
        appointment = self.get_object()
        
        serializer = AppointmentCancelSerializer(
            data=request.data,
            context={'appointment': appointment}
        )
        serializer.is_valid(raise_exception=True)
        
        cancelled_by = 'doctor' if hasattr(request.user, 'doctor_profile') else 'patient'
        
        success, error = AppointmentService.cancel_appointment(
            appointment=appointment,
            reason=serializer.validated_data.get('reason', ''),
            cancelled_by=cancelled_by
        )
        
        if not success:
            return Response({
                'success': False,
                'message': error
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'success': True,
            'message': 'Appointment cancelled.',
            'data': AppointmentSerializer(appointment).data
        })
    
    @swagger_auto_schema(
        method='post',
        operation_description="Reschedule an appointment",
        request_body=AppointmentRescheduleSerializer,
        responses={200: AppointmentSerializer}
    )
    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        """Reschedule appointment."""
        appointment = self.get_object()
        
        serializer = AppointmentRescheduleSerializer(
            data=request.data,
            context={'appointment': appointment}
        )
        serializer.is_valid(raise_exception=True)
        
        new_date = serializer.validated_data['new_date']
        new_time = serializer.validated_data['new_time']
        time_slot_id = serializer.validated_data.get('time_slot_id')
        reason = serializer.validated_data.get('reason', '')
        
        # Get new time slot if provided
        new_slot = None
        if time_slot_id:
            try:
                new_slot = TimeSlot.objects.get(id=time_slot_id)
            except TimeSlot.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'Time slot not found.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        new_appointment, error = AppointmentService.reschedule_appointment(
            appointment=appointment,
            new_date=new_date,
            new_time=new_time,
            new_slot=new_slot,
            reason=reason
        )
        
        if error:
            return Response({
                'success': False,
                'message': error
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'success': True,
            'message': 'Appointment rescheduled.',
            'data': AppointmentSerializer(new_appointment).data
        })
    
    @swagger_auto_schema(
        method='post',
        operation_description="Check in for an appointment",
        responses={200: AppointmentQueueSerializer}
    )
    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        """Check in for appointment."""
        appointment = self.get_object()
        
        queue_entry, error = QueueService.check_in_patient(appointment)
        
        if error:
            return Response({
                'success': False,
                'message': error
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'success': True,
            'message': f'Checked in. Your queue number is {queue_entry.queue_number}.',
            'data': AppointmentQueueSerializer(queue_entry).data
        })
    
    @swagger_auto_schema(
        method='post',
        operation_description="Start consultation (doctors only)",
        responses={200: AppointmentSerializer}
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsDoctor])
    def start(self, request, pk=None):
        """Start consultation."""
        appointment = self.get_object()
        
        success, error = AppointmentService.start_consultation(appointment)
        
        if not success:
            return Response({
                'success': False,
                'message': error
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update queue if exists
        if hasattr(appointment, 'queue_entry'):
            appointment.queue_entry.status = 'in_consultation'
            appointment.queue_entry.consultation_started_at = timezone.now()
            appointment.queue_entry.save()
        
        return Response({
            'success': True,
            'message': 'Consultation started.',
            'data': AppointmentSerializer(appointment).data
        })
    
    @swagger_auto_schema(
        method='post',
        operation_description="Complete consultation (doctors only)",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'doctor_notes': openapi.Schema(type=openapi.TYPE_STRING),
                'fee': openapi.Schema(type=openapi.TYPE_NUMBER),
                'prescription_id': openapi.Schema(type=openapi.TYPE_STRING),
            }
        ),
        responses={200: AppointmentSerializer}
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsDoctor])
    def complete(self, request, pk=None):
        """Complete consultation."""
        appointment = self.get_object()
        
        doctor_notes = request.data.get('doctor_notes', '')
        fee = request.data.get('fee')
        prescription_id = request.data.get('prescription_id')
        
        success, error = AppointmentService.complete_consultation(
            appointment=appointment,
            doctor_notes=doctor_notes,
            fee=fee,
            prescription_id=prescription_id
        )
        
        if not success:
            return Response({
                'success': False,
                'message': error
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update queue if exists
        if hasattr(appointment, 'queue_entry'):
            appointment.queue_entry.status = 'completed'
            appointment.queue_entry.completed_at = timezone.now()
            appointment.queue_entry.save()
        
        return Response({
            'success': True,
            'message': 'Consultation completed.',
            'data': AppointmentSerializer(appointment).data
        })
    
    @swagger_auto_schema(
        method='post',
        operation_description="Mark patient as no-show (doctors only)",
        responses={200: AppointmentSerializer}
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsDoctor])
    def no_show(self, request, pk=None):
        """Mark as no-show."""
        appointment = self.get_object()
        
        success, error = AppointmentService.mark_no_show(appointment)
        
        if not success:
            return Response({
                'success': False,
                'message': error
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'success': True,
            'message': 'Marked as no-show.',
            'data': AppointmentSerializer(appointment).data
        })
    
    @swagger_auto_schema(
        method='get',
        operation_description="Get today's appointments (for doctors)",
        responses={200: AppointmentListSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's appointments."""
        today = timezone.now().date()
        
        if hasattr(request.user, 'doctor_profile'):
            appointments = Appointment.objects.filter(
                doctor=request.user,
                appointment_date=today
            )
        else:
            appointments = Appointment.objects.filter(
                patient=request.user,
                appointment_date=today
            )
        
        appointments = appointments.select_related('patient', 'doctor').order_by('start_time')
        
        return Response({
            'success': True,
            'date': today,
            'count': appointments.count(),
            'data': AppointmentListSerializer(appointments, many=True).data
        })
    
    @swagger_auto_schema(
        method='get',
        operation_description="Get upcoming appointments",
        responses={200: AppointmentListSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming appointments."""
        user = request.user
        
        if hasattr(user, 'doctor_profile'):
            appointments = AppointmentService.get_doctor_appointments(
                doctor=user,
                status=None
            )
        else:
            appointments = AppointmentService.get_patient_appointments(
                patient=user,
                upcoming_only=True,
                limit=10
            )
        
        # Filter to upcoming only
        today = timezone.now().date()
        current_time = timezone.now().time()
        
        upcoming_appointments = [
            apt for apt in appointments
            if apt.status not in ['cancelled', 'completed', 'no_show'] and (
                apt.appointment_date > today or
                (apt.appointment_date == today and apt.start_time > current_time)
            )
        ]
        
        return Response({
            'success': True,
            'count': len(upcoming_appointments),
            'data': AppointmentListSerializer(upcoming_appointments, many=True).data
        })
    
    @swagger_auto_schema(
        method='get',
        operation_description="Get today's summary (for doctors)",
        responses={200: TodayAppointmentsSummarySerializer}
    )
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated, IsDoctor])
    def today_summary(self, request):
        """Get today's appointment summary."""
        summary = AppointmentService.get_today_summary(request.user)
        
        return Response({
            'success': True,
            'data': summary
        })


# =============================================================================
# QUEUE VIEWS
# =============================================================================

class QueueViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing and managing appointment queues.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get queue entries."""
        user = self.request.user
        today = timezone.now().date()
        
        if hasattr(user, 'doctor_profile'):
            # Doctors see their queue
            queryset = AppointmentQueue.objects.filter(
                appointment__doctor=user,
                queue_date=today
            )
        else:
            # Patients see their own queue entries
            queryset = AppointmentQueue.objects.filter(
                appointment__patient=user
            )
        
        return queryset.select_related(
            'appointment',
            'appointment__patient',
            'appointment__doctor'
        ).order_by('queue_date', 'queue_number')
    
    def get_serializer_class(self):
        """Return appropriate serializer."""
        if self.action == 'list':
            return AppointmentQueueListSerializer
        return AppointmentQueueSerializer
    
    @swagger_auto_schema(
        operation_description="List queue entries",
        responses={200: AppointmentQueueListSerializer(many=True)}
    )
    def list(self, request, *args, **kwargs):
        """List queue."""
        queryset = self.get_queryset()
        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'count': queryset.count(),
            'data': serializer.data
        })
    
    @swagger_auto_schema(
        method='get',
        operation_description="Get current waiting queue",
        responses={200: AppointmentQueueListSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def waiting(self, request):
        """Get waiting queue."""
        if not hasattr(request.user, 'doctor_profile'):
            return Response({
                'success': False,
                'message': 'Only doctors can view waiting queue.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        today = timezone.now().date()
        waiting = QueueService.get_waiting_queue(request.user, today)
        
        return Response({
            'success': True,
            'count': len(waiting),
            'data': AppointmentQueueListSerializer(waiting, many=True).data
        })
    
    @swagger_auto_schema(
        method='post',
        operation_description="Call next patient in queue",
        responses={200: AppointmentQueueSerializer}
    )
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsDoctor])
    def call_next(self, request):
        """Call next patient."""
        today = timezone.now().date()
        
        queue_entry, error = QueueService.call_next_patient(request.user, today)
        
        if error:
            return Response({
                'success': False,
                'message': error
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'success': True,
            'message': f'Called patient: {queue_entry.appointment.patient.get_full_name()}',
            'data': AppointmentQueueSerializer(queue_entry).data
        })
    
    @swagger_auto_schema(
        method='post',
        operation_description="Perform action on queue entry",
        request_body=QueueActionSerializer,
        responses={200: AppointmentQueueSerializer}
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsDoctor], url_path='perform-action', url_name='perform-action')
    def perform_action(self, request, pk=None):
        """Perform queue action."""
        queue_entry = self.get_object()
        
        serializer = QueueActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action_type = serializer.validated_data['action']
        notes = serializer.validated_data.get('notes', '')
        
        if action_type == 'call':
            success, error = QueueService.call_specific_patient(queue_entry)
        elif action_type == 'start_consultation':
            success, error = QueueService.start_consultation(queue_entry)
        elif action_type == 'complete':
            success, error = QueueService.complete_consultation(queue_entry)
        elif action_type == 'skip':
            success, error = QueueService.skip_patient(queue_entry, notes)
        else:
            return Response({
                'success': False,
                'message': f'Unknown action: {action_type}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not success:
            return Response({
                'success': False,
                'message': error
            }, status=status.HTTP_400_BAD_REQUEST)
        
        queue_entry.refresh_from_db()
        
        return Response({
            'success': True,
            'message': f'Action "{action_type}" completed.',
            'data': AppointmentQueueSerializer(queue_entry).data
        })
    
    @swagger_auto_schema(
        method='post',
        operation_description="Requeue a skipped patient",
        responses={200: AppointmentQueueSerializer}
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsDoctor])
    def requeue(self, request, pk=None):
        """Requeue skipped patient."""
        queue_entry = self.get_object()
        
        new_entry, error = QueueService.requeue_patient(queue_entry)
        
        if error:
            return Response({
                'success': False,
                'message': error
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'success': True,
            'message': f'Patient requeued at position {new_entry.queue_number}.',
            'data': AppointmentQueueSerializer(new_entry).data
        })
    
    @swagger_auto_schema(
        method='get',
        operation_description="Get queue statistics",
        responses={200: openapi.Schema(type=openapi.TYPE_OBJECT)}
    )
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated, IsDoctor])
    def stats(self, request):
        """Get queue statistics."""
        today = timezone.now().date()
        queue_stats = QueueService.get_queue_stats(request.user, today)
        
        return Response({
            'success': True,
            'data': queue_stats
        })
    
    @swagger_auto_schema(
        method='get',
        operation_description="Get patient's queue status",
        responses={200: openapi.Schema(type=openapi.TYPE_OBJECT)}
    )
    @action(detail=False, methods=['get'])
    def my_status(self, request):
        """Get patient's queue status."""
        if hasattr(request.user, 'doctor_profile'):
            return Response({
                'success': False,
                'message': 'This endpoint is for patients only.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        today = timezone.now().date()
        status_data = QueueService.get_patient_queue_status(request.user, today)
        
        if not status_data:
            return Response({
                'success': True,
                'message': 'You are not in any queue today.',
                'data': None
            })
        
        return Response({
            'success': True,
            'data': status_data
        })


# =============================================================================
# CHECK-IN VIEW
# =============================================================================

class CheckInView(APIView):
    """
    View for patient check-in.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Check in for an appointment",
        request_body=CheckInSerializer,
        responses={200: AppointmentQueueSerializer}
    )
    def post(self, request):
        """Check in patient."""
        serializer = CheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        appointment_id = serializer.validated_data['appointment_id']
        
        try:
            appointment = Appointment.objects.get(id=appointment_id)
        except Appointment.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Appointment not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Verify ownership
        if appointment.patient != request.user:
            return Response({
                'success': False,
                'message': 'This is not your appointment.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        queue_entry, error = QueueService.check_in_patient(appointment)
        
        if error:
            return Response({
                'success': False,
                'message': error
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'success': True,
            'message': f'Checked in successfully. Your queue number is {queue_entry.queue_number}.',
            'data': AppointmentQueueSerializer(queue_entry).data
        })


# =============================================================================
# DOCTOR AVAILABILITY VIEW
# =============================================================================

class DoctorAvailabilityView(APIView):
    """
    View for checking doctor availability.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get doctor availability for a date range",
        manual_parameters=[
            openapi.Parameter(
                'doctor_id',
                openapi.IN_PATH,
                description="Doctor ID",
                type=openapi.TYPE_STRING,
                required=True
            ),
            openapi.Parameter(
                'start_date',
                openapi.IN_QUERY,
                description="Start date (default: today)",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_DATE
            ),
            openapi.Parameter(
                'days',
                openapi.IN_QUERY,
                description="Number of days (default: 30)",
                type=openapi.TYPE_INTEGER
            ),
        ],
        responses={200: openapi.Schema(type=openapi.TYPE_OBJECT)}
    )
    def get(self, request, doctor_id):
        """Get doctor availability."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Validate doctor
        try:
            doctor = User.objects.get(id=doctor_id)
            if not hasattr(doctor, 'doctor_profile'):
                return Response({
                    'success': False,
                    'message': 'User is not a doctor.'
                }, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Doctor not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Parse parameters
        start_date_str = request.query_params.get('start_date')
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            except ValueError:
                start_date = timezone.now().date()
        else:
            start_date = timezone.now().date()
        
        days = int(request.query_params.get('days', 30))
        days = min(days, 90)  # Limit to 90 days
        
        # Get available days
        available_days = ScheduleService.get_available_days(doctor, start_date, days)
        
        # Get next available slot
        next_slot = SlotService.get_next_available_slot(doctor, start_date)
        
        # Get doctor info
        doctor_profile = doctor.doctor_profile
        
        return Response({
            'success': True,
            'data': {
                'doctor_id': str(doctor.id),
                'doctor_name': doctor.get_full_name(),
                'specialization': getattr(doctor_profile, 'specialization', None),
                'consultation_fee': None,  # Can be added from schedule
                'available_days': available_days,
                'next_available': {
                    'date': next_slot.slot_date if next_slot else None,
                    'time': next_slot.start_time if next_slot else None,
                    'slot_id': str(next_slot.id) if next_slot else None,
                } if next_slot else None,
            }
        })


# =============================================================================
# QUICK DATA VIEW
# =============================================================================

class QuickAppointmentDataView(APIView):
    """
    View for getting quick appointment data for dashboard.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get quick appointment data for dashboard",
        responses={200: QuickAppointmentDataSerializer}
    )
    def get(self, request):
        """Get quick data."""
        user = request.user
        today = timezone.now().date()
        
        if hasattr(user, 'doctor_profile'):
            # Doctor dashboard data
            upcoming = AppointmentService.get_doctor_appointments(
                doctor=user,
                appointment_date=today
            )[:5]
            
            today_summary = AppointmentService.get_today_summary(user)
            
            recent = Appointment.objects.filter(
                doctor=user,
                status='completed'
            ).order_by('-completed_at')[:5]
            
            queue_stats = QueueService.get_queue_stats(user, today)
            
            return Response({
                'success': True,
                'data': {
                    'user_type': 'doctor',
                    'today_appointments': AppointmentListSerializer(upcoming, many=True).data,
                    'today_summary': today_summary,
                    'recent_completed': AppointmentListSerializer(recent, many=True).data,
                    'queue_stats': queue_stats,
                }
            })
        else:
            # Patient dashboard data
            upcoming = AppointmentService.get_patient_appointments(
                patient=user,
                upcoming_only=True,
                limit=5
            )
            
            recent = Appointment.objects.filter(
                patient=user,
                status='completed'
            ).order_by('-completed_at')[:5]
            
            queue_status = QueueService.get_patient_queue_status(user, today)
            
            return Response({
                'success': True,
                'data': {
                    'user_type': 'patient',
                    'upcoming_appointments': AppointmentListSerializer(upcoming, many=True).data,
                    'recent_appointments': AppointmentListSerializer(recent, many=True).data,
                    'queue_status': queue_status,
                }
            })


# =============================================================================
# HEALTH CHECK VIEW
# =============================================================================

class HealthCheckView(APIView):
    """
    Health check endpoint for the appointments app.
    """
    
    permission_classes = [permissions.AllowAny]
    
    @swagger_auto_schema(
        operation_description="Health check for appointments app",
        responses={200: openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                'app': openapi.Schema(type=openapi.TYPE_STRING),
                'status': openapi.Schema(type=openapi.TYPE_STRING),
            }
        )}
    )
    def get(self, request):
        """Health check."""
        try:
            # Test database connection
            appointment_count = Appointment.objects.count()
            schedule_count = DoctorSchedule.objects.count()
            
            return Response({
                'success': True,
                'app': 'appointments',
                'status': 'healthy',
                'stats': {
                    'total_appointments': appointment_count,
                    'total_schedules': schedule_count,
                }
            })
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return Response({
                'success': False,
                'app': 'appointments',
                'status': 'unhealthy',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
