"""
Appointments App Serializers for MediConnect.

Serializers for:
1. DoctorSchedule - Weekly availability management
2. ScheduleException - Leaves and modified hours
3. TimeSlot - Available time slots
4. Appointment - Appointment booking and management
5. AppointmentQueue - Queue management
6. AppointmentReminder - Reminder tracking
"""

from datetime import datetime, timedelta, time
from rest_framework import serializers
from django.utils import timezone
from django.db import transaction

from .models import (
    DoctorSchedule,
    ScheduleException,
    TimeSlot,
    Appointment,
    AppointmentQueue,
    AppointmentReminder,
)


# =============================================================================
# DOCTOR SCHEDULE SERIALIZERS
# =============================================================================

class DoctorScheduleSerializer(serializers.ModelSerializer):
    """Full serializer for doctor schedule."""
    
    doctor_id = serializers.UUIDField(source='doctor.id', read_only=True)
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)
    doctor_phone = serializers.CharField(source='doctor.phone_number', read_only=True)
    day_name = serializers.CharField(source='get_day_name', read_only=True)
    
    class Meta:
        model = DoctorSchedule
        fields = [
            'id',
            'doctor_id',
            'doctor_name',
            'doctor_phone',
            'day_of_week',
            'day_name',
            'start_time',
            'end_time',
            'break_start',
            'break_end',
            'slot_duration_minutes',
            'max_patients_per_slot',
            'consultation_fee',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'doctor_id', 'doctor_name', 'doctor_phone', 'created_at', 'updated_at']


class DoctorScheduleCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating doctor schedule."""
    
    class Meta:
        model = DoctorSchedule
        fields = [
            'day_of_week',
            'start_time',
            'end_time',
            'break_start',
            'break_end',
            'slot_duration_minutes',
            'max_patients_per_slot',
            'consultation_fee',
            'is_active',
        ]
    
    def validate(self, attrs):
        """Validate schedule times."""
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')
        break_start = attrs.get('break_start')
        break_end = attrs.get('break_end')
        
        if start_time and end_time:
            if start_time >= end_time:
                raise serializers.ValidationError({
                    'end_time': 'End time must be after start time.'
                })
        
        if break_start and break_end:
            if break_start >= break_end:
                raise serializers.ValidationError({
                    'break_end': 'Break end must be after break start.'
                })
            if start_time and break_start < start_time:
                raise serializers.ValidationError({
                    'break_start': 'Break start must be within working hours.'
                })
            if end_time and break_end > end_time:
                raise serializers.ValidationError({
                    'break_end': 'Break end must be within working hours.'
                })
        
        return attrs
    
    def create(self, validated_data):
        """Create schedule with current user as doctor."""
        validated_data['doctor'] = self.context['request'].user
        return super().create(validated_data)


class DoctorScheduleListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing schedules."""
    
    day_name = serializers.CharField(source='get_day_name', read_only=True)
    
    class Meta:
        model = DoctorSchedule
        fields = [
            'id',
            'day_of_week',
            'day_name',
            'start_time',
            'end_time',
            'slot_duration_minutes',
            'consultation_fee',
            'is_active',
        ]


class WeeklyScheduleSerializer(serializers.Serializer):
    """Serializer for complete weekly schedule."""
    
    doctor_id = serializers.UUIDField()
    doctor_name = serializers.CharField()
    schedules = DoctorScheduleListSerializer(many=True)
    exceptions = serializers.ListField(child=serializers.DictField(), required=False)


# =============================================================================
# SCHEDULE EXCEPTION SERIALIZERS
# =============================================================================

class ScheduleExceptionSerializer(serializers.ModelSerializer):
    """Full serializer for schedule exceptions."""
    
    doctor_id = serializers.UUIDField(source='doctor.id', read_only=True)
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)
    exception_type_display = serializers.CharField(
        source='get_exception_type_display',
        read_only=True
    )
    
    class Meta:
        model = ScheduleException
        fields = [
            'id',
            'doctor_id',
            'doctor_name',
            'exception_date',
            'exception_type',
            'exception_type_display',
            'start_time',
            'end_time',
            'reason',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'doctor_id', 'doctor_name', 'created_at', 'updated_at']


class ScheduleExceptionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating schedule exceptions."""
    
    class Meta:
        model = ScheduleException
        fields = [
            'exception_date',
            'exception_type',
            'start_time',
            'end_time',
            'reason',
        ]
    
    def validate_exception_date(self, value):
        """Validate exception date is not in the past."""
        if value < timezone.now().date():
            raise serializers.ValidationError(
                'Exception date cannot be in the past.'
            )
        return value
    
    def validate(self, attrs):
        """Validate exception data."""
        exception_type = attrs.get('exception_type')
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')
        
        if exception_type in ['modified', 'extra']:
            if not start_time or not end_time:
                raise serializers.ValidationError({
                    'start_time': 'Start and end time required for modified/extra hours.'
                })
            if start_time >= end_time:
                raise serializers.ValidationError({
                    'end_time': 'End time must be after start time.'
                })
        
        return attrs
    
    def create(self, validated_data):
        """Create exception with current user as doctor."""
        validated_data['doctor'] = self.context['request'].user
        return super().create(validated_data)


# =============================================================================
# TIME SLOT SERIALIZERS
# =============================================================================

class TimeSlotSerializer(serializers.ModelSerializer):
    """Full serializer for time slots."""
    
    doctor_id = serializers.UUIDField(source='doctor.id', read_only=True)
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    remaining_capacity = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = TimeSlot
        fields = [
            'id',
            'doctor_id',
            'doctor_name',
            'slot_date',
            'start_time',
            'end_time',
            'status',
            'status_display',
            'max_bookings',
            'current_bookings',
            'is_available',
            'remaining_capacity',
        ]


class TimeSlotListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing available slots."""
    
    is_available = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = TimeSlot
        fields = [
            'id',
            'slot_date',
            'start_time',
            'end_time',
            'is_available',
        ]


class AvailableSlotsRequestSerializer(serializers.Serializer):
    """Serializer for available slots request."""
    
    doctor_id = serializers.UUIDField(required=True)
    date = serializers.DateField(required=True)
    
    def validate_date(self, value):
        """Validate date is not in the past."""
        if value < timezone.now().date():
            raise serializers.ValidationError('Date cannot be in the past.')
        return value


class AvailableSlotsResponseSerializer(serializers.Serializer):
    """Serializer for available slots response."""
    
    doctor_id = serializers.UUIDField()
    doctor_name = serializers.CharField()
    date = serializers.DateField()
    slots = TimeSlotListSerializer(many=True)
    total_slots = serializers.IntegerField()
    available_slots = serializers.IntegerField()


# =============================================================================
# APPOINTMENT SERIALIZERS
# =============================================================================

class AppointmentSerializer(serializers.ModelSerializer):
    """Full serializer for appointments."""
    
    # Patient details
    patient_id = serializers.UUIDField(source='patient.id', read_only=True)
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_phone = serializers.CharField(source='patient.phone_number', read_only=True)
    
    # Doctor details
    doctor_id = serializers.UUIDField(source='doctor.id', read_only=True)
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)
    doctor_phone = serializers.CharField(source='doctor.phone_number', read_only=True)
    
    # Display fields
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    booking_type_display = serializers.CharField(source='get_booking_type_display', read_only=True)
    
    # Computed fields
    is_upcoming = serializers.BooleanField(read_only=True)
    is_past = serializers.BooleanField(read_only=True)
    can_cancel = serializers.BooleanField(read_only=True)
    can_reschedule = serializers.BooleanField(read_only=True)
    
    # Queue info if exists
    queue_number = serializers.SerializerMethodField()
    queue_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = [
            'id',
            'patient_id',
            'patient_name',
            'patient_phone',
            'doctor_id',
            'doctor_name',
            'doctor_phone',
            'time_slot',
            'appointment_date',
            'start_time',
            'end_time',
            'status',
            'status_display',
            'booking_type',
            'booking_type_display',
            'reason',
            'symptoms',
            'patient_notes',
            'doctor_notes',
            'cancellation_reason',
            'cancelled_by',
            'rescheduled_from',
            'confirmed_at',
            'checked_in_at',
            'started_at',
            'completed_at',
            'cancelled_at',
            'consultation_fee',
            'prescription_id',
            'reminder_24h_sent',
            'reminder_1h_sent',
            'is_upcoming',
            'is_past',
            'can_cancel',
            'can_reschedule',
            'queue_number',
            'queue_status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'patient_id', 'patient_name', 'patient_phone',
            'doctor_id', 'doctor_name', 'doctor_phone',
            'status', 'confirmed_at', 'checked_in_at', 'started_at',
            'completed_at', 'cancelled_at', 'reminder_24h_sent',
            'reminder_1h_sent', 'created_at', 'updated_at',
        ]
    
    def get_queue_number(self, obj):
        """Get queue number if checked in."""
        if hasattr(obj, 'queue_entry'):
            return obj.queue_entry.queue_number
        return None
    
    def get_queue_status(self, obj):
        """Get queue status if checked in."""
        if hasattr(obj, 'queue_entry'):
            return obj.queue_entry.status
        return None


class AppointmentListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing appointments."""
    
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Appointment
        fields = [
            'id',
            'patient_name',
            'doctor_name',
            'appointment_date',
            'start_time',
            'end_time',
            'status',
            'status_display',
            'booking_type',
            'reason',
            'is_upcoming',
            'created_at',
        ]


class AppointmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating appointments."""
    
    doctor_id = serializers.UUIDField(write_only=True)
    time_slot_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Appointment
        fields = [
            'doctor_id',
            'time_slot_id',
            'appointment_date',
            'start_time',
            'reason',
            'symptoms',
            'patient_notes',
            'booking_type',
        ]
    
    def validate_doctor_id(self, value):
        """Validate doctor exists and is a doctor."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            doctor = User.objects.get(id=value)
            # Check if user is a doctor (has doctor profile)
            if not hasattr(doctor, 'doctor_profile'):
                raise serializers.ValidationError('User is not a registered doctor.')
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError('Doctor not found.')
    
    def validate_appointment_date(self, value):
        """Validate appointment date."""
        if value < timezone.now().date():
            raise serializers.ValidationError('Appointment date cannot be in the past.')
        
        # Check if date is too far in future (e.g., 90 days)
        max_date = timezone.now().date() + timedelta(days=90)
        if value > max_date:
            raise serializers.ValidationError(
                'Appointments can only be booked up to 90 days in advance.'
            )
        
        return value
    
    def validate_start_time(self, value):
        """Validate start time."""
        # Basic validation - more detailed validation in validate()
        return value
    
    def validate(self, attrs):
        """Validate appointment booking."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        doctor_id = attrs.get('doctor_id')
        appointment_date = attrs.get('appointment_date')
        start_time = attrs.get('start_time')
        time_slot_id = attrs.get('time_slot_id')
        
        doctor = User.objects.get(id=doctor_id)
        patient = self.context['request'].user
        
        # Check patient is not the doctor
        if doctor.id == patient.id:
            raise serializers.ValidationError({
                'doctor_id': 'You cannot book an appointment with yourself.'
            })
        
        # If time_slot_id provided, validate and use it
        if time_slot_id:
            try:
                time_slot = TimeSlot.objects.get(id=time_slot_id, doctor=doctor)
                if not time_slot.is_available:
                    raise serializers.ValidationError({
                        'time_slot_id': 'Selected time slot is not available.'
                    })
                # Override date and time from slot
                attrs['appointment_date'] = time_slot.slot_date
                attrs['start_time'] = time_slot.start_time
                attrs['end_time'] = time_slot.end_time
                attrs['time_slot'] = time_slot
            except TimeSlot.DoesNotExist:
                raise serializers.ValidationError({
                    'time_slot_id': 'Time slot not found.'
                })
        else:
            # Validate against doctor's schedule
            day_of_week = appointment_date.weekday()
            
            try:
                schedule = DoctorSchedule.objects.get(
                    doctor=doctor,
                    day_of_week=day_of_week,
                    is_active=True
                )
            except DoctorSchedule.DoesNotExist:
                raise serializers.ValidationError({
                    'appointment_date': f'Doctor is not available on {appointment_date.strftime("%A")}.'
                })
            
            # Check if time is within schedule
            if start_time < schedule.start_time or start_time >= schedule.end_time:
                raise serializers.ValidationError({
                    'start_time': f'Time must be between {schedule.start_time} and {schedule.end_time}.'
                })
            
            # Check if time is during break
            if schedule.break_start and schedule.break_end:
                if schedule.break_start <= start_time < schedule.break_end:
                    raise serializers.ValidationError({
                        'start_time': f'Doctor is on break from {schedule.break_start} to {schedule.break_end}.'
                    })
            
            # Check for schedule exceptions
            exception = ScheduleException.objects.filter(
                doctor=doctor,
                exception_date=appointment_date
            ).first()
            
            if exception:
                if exception.exception_type == 'leave':
                    raise serializers.ValidationError({
                        'appointment_date': f'Doctor is on leave on {appointment_date}.'
                    })
                elif exception.exception_type == 'modified':
                    if start_time < exception.start_time or start_time >= exception.end_time:
                        raise serializers.ValidationError({
                            'start_time': f'Modified hours on {appointment_date}: {exception.start_time} to {exception.end_time}.'
                        })
        
        # Check for existing appointment at same time
        existing = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=appointment_date,
            start_time=start_time,
            status__in=['pending', 'confirmed', 'checked_in', 'in_progress']
        )
        
        if existing.exists():
            raise serializers.ValidationError({
                'start_time': 'This time slot is already booked.'
            })
        
        # Check if patient already has appointment with same doctor on same day
        patient_existing = Appointment.objects.filter(
            patient=patient,
            doctor=doctor,
            appointment_date=appointment_date,
            status__in=['pending', 'confirmed', 'checked_in', 'in_progress']
        )
        
        if patient_existing.exists():
            raise serializers.ValidationError({
                'appointment_date': 'You already have an appointment with this doctor on this date.'
            })
        
        attrs['doctor'] = doctor
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        """Create appointment."""
        doctor_id = validated_data.pop('doctor_id', None)
        time_slot_id = validated_data.pop('time_slot_id', None)
        time_slot = validated_data.pop('time_slot', None)
        doctor = validated_data.pop('doctor')
        
        validated_data['patient'] = self.context['request'].user
        validated_data['doctor'] = doctor
        validated_data['status'] = 'pending'
        
        if time_slot:
            validated_data['time_slot'] = time_slot
            time_slot.book()
        
        appointment = Appointment.objects.create(**validated_data)
        
        return appointment


class AppointmentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating appointments."""
    
    class Meta:
        model = Appointment
        fields = [
            'reason',
            'symptoms',
            'patient_notes',
        ]


class AppointmentRescheduleSerializer(serializers.Serializer):
    """Serializer for rescheduling appointments."""
    
    new_date = serializers.DateField(required=True)
    new_time = serializers.TimeField(required=True)
    time_slot_id = serializers.UUIDField(required=False, allow_null=True)
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)
    
    def validate_new_date(self, value):
        """Validate new date."""
        if value < timezone.now().date():
            raise serializers.ValidationError('New date cannot be in the past.')
        return value
    
    def validate(self, attrs):
        """Validate rescheduling."""
        appointment = self.context.get('appointment')
        
        if not appointment:
            raise serializers.ValidationError('Appointment not found.')
        
        if not appointment.can_reschedule:
            raise serializers.ValidationError('This appointment cannot be rescheduled.')
        
        return attrs


class AppointmentCancelSerializer(serializers.Serializer):
    """Serializer for cancelling appointments."""
    
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)
    
    def validate(self, attrs):
        """Validate cancellation."""
        appointment = self.context.get('appointment')
        
        if not appointment:
            raise serializers.ValidationError('Appointment not found.')
        
        if not appointment.can_cancel:
            raise serializers.ValidationError('This appointment cannot be cancelled.')
        
        return attrs


class AppointmentStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating appointment status."""
    
    action = serializers.ChoiceField(
        choices=[
            'confirm',
            'check_in',
            'start',
            'complete',
            'no_show',
        ],
        required=True
    )
    notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    fee = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )


# =============================================================================
# APPOINTMENT QUEUE SERIALIZERS
# =============================================================================

class AppointmentQueueSerializer(serializers.ModelSerializer):
    """Full serializer for appointment queue."""
    
    appointment_id = serializers.UUIDField(source='appointment.id', read_only=True)
    patient_name = serializers.CharField(
        source='appointment.patient.get_full_name',
        read_only=True
    )
    patient_phone = serializers.CharField(
        source='appointment.patient.phone_number',
        read_only=True
    )
    appointment_time = serializers.TimeField(
        source='appointment.start_time',
        read_only=True
    )
    reason = serializers.CharField(source='appointment.reason', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    wait_time_minutes = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = AppointmentQueue
        fields = [
            'id',
            'appointment_id',
            'patient_name',
            'patient_phone',
            'appointment_time',
            'reason',
            'queue_number',
            'queue_date',
            'status',
            'status_display',
            'checked_in_at',
            'called_at',
            'consultation_started_at',
            'completed_at',
            'estimated_wait_minutes',
            'wait_time_minutes',
            'created_at',
        ]
        read_only_fields = [
            'id', 'queue_number', 'queue_date', 'checked_in_at',
            'called_at', 'consultation_started_at', 'completed_at', 'created_at'
        ]


class AppointmentQueueListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing queue."""
    
    patient_name = serializers.CharField(
        source='appointment.patient.get_full_name',
        read_only=True
    )
    appointment_time = serializers.TimeField(
        source='appointment.start_time',
        read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    wait_time_minutes = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = AppointmentQueue
        fields = [
            'id',
            'queue_number',
            'patient_name',
            'appointment_time',
            'status',
            'status_display',
            'wait_time_minutes',
            'estimated_wait_minutes',
        ]


class QueueActionSerializer(serializers.Serializer):
    """Serializer for queue actions."""
    
    action = serializers.ChoiceField(
        choices=[
            'call',
            'start_consultation',
            'complete',
            'skip',
        ],
        required=True
    )
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)


class CheckInSerializer(serializers.Serializer):
    """Serializer for patient check-in."""
    
    appointment_id = serializers.UUIDField(required=True)
    
    def validate_appointment_id(self, value):
        """Validate appointment for check-in."""
        try:
            appointment = Appointment.objects.get(id=value)
        except Appointment.DoesNotExist:
            raise serializers.ValidationError('Appointment not found.')
        
        if appointment.status != 'confirmed':
            raise serializers.ValidationError(
                f'Only confirmed appointments can be checked in. Current status: {appointment.status}'
            )
        
        if appointment.appointment_date != timezone.now().date():
            raise serializers.ValidationError('Can only check in on the appointment date.')
        
        if hasattr(appointment, 'queue_entry'):
            raise serializers.ValidationError('Already checked in.')
        
        return value


# =============================================================================
# APPOINTMENT REMINDER SERIALIZERS
# =============================================================================

class AppointmentReminderSerializer(serializers.ModelSerializer):
    """Full serializer for appointment reminders."""
    
    appointment_id = serializers.UUIDField(source='appointment.id', read_only=True)
    patient_name = serializers.CharField(
        source='appointment.patient.get_full_name',
        read_only=True
    )
    appointment_date = serializers.DateField(
        source='appointment.appointment_date',
        read_only=True
    )
    appointment_time = serializers.TimeField(
        source='appointment.start_time',
        read_only=True
    )
    reminder_type_display = serializers.CharField(
        source='get_reminder_type_display',
        read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = AppointmentReminder
        fields = [
            'id',
            'appointment_id',
            'patient_name',
            'appointment_date',
            'appointment_time',
            'reminder_type',
            'reminder_type_display',
            'scheduled_time',
            'status',
            'status_display',
            'sent_at',
            'error_message',
            'created_at',
        ]


# =============================================================================
# QUICK DATA SERIALIZERS
# =============================================================================

class DoctorAvailabilitySerializer(serializers.Serializer):
    """Serializer for doctor availability summary."""
    
    doctor_id = serializers.UUIDField()
    doctor_name = serializers.CharField()
    specialization = serializers.CharField(required=False, allow_null=True)
    consultation_fee = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    available_today = serializers.BooleanField()
    next_available_date = serializers.DateField(required=False, allow_null=True)
    next_available_slot = serializers.TimeField(required=False, allow_null=True)


class TodayAppointmentsSummarySerializer(serializers.Serializer):
    """Serializer for today's appointments summary."""
    
    total = serializers.IntegerField()
    pending = serializers.IntegerField()
    confirmed = serializers.IntegerField()
    checked_in = serializers.IntegerField()
    in_progress = serializers.IntegerField()
    completed = serializers.IntegerField()
    cancelled = serializers.IntegerField()
    no_show = serializers.IntegerField()


class QuickAppointmentDataSerializer(serializers.Serializer):
    """Serializer for quick appointment screen data."""
    
    upcoming_appointments = AppointmentListSerializer(many=True)
    today_summary = TodayAppointmentsSummarySerializer()
    recent_appointments = AppointmentListSerializer(many=True)