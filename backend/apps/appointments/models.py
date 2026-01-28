"""
Appointments App Models for MediConnect.

Models:
1. DoctorSchedule - Doctor's weekly availability schedule
2. ScheduleException - Exceptions to regular schedule (leaves, holidays)
3. TimeSlot - Generated time slots for booking
4. Appointment - Patient appointments with doctors
5. AppointmentQueue - Queue management for walk-ins and check-ins
6. AppointmentReminder - Track sent reminders
"""

import uuid
from datetime import datetime, timedelta, time
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.core.exceptions import ValidationError


class DoctorSchedule(models.Model):
    """
    Doctor's weekly availability schedule.
    Defines regular working hours for each day of the week.
    """
    
    DAY_CHOICES = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='schedules'
    )
    
    # Day of week (0=Monday, 6=Sunday)
    day_of_week = models.PositiveSmallIntegerField(
        choices=DAY_CHOICES,
        validators=[MinValueValidator(0), MaxValueValidator(6)]
    )
    
    # Working hours
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    # Break time (optional)
    break_start = models.TimeField(null=True, blank=True)
    break_end = models.TimeField(null=True, blank=True)
    
    # Slot configuration
    slot_duration_minutes = models.PositiveSmallIntegerField(
        default=30,
        validators=[MinValueValidator(5), MaxValueValidator(120)],
        help_text='Duration of each appointment slot in minutes'
    )
    max_patients_per_slot = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text='Maximum patients per time slot'
    )
    
    # Consultation fee (optional)
    consultation_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Consultation fee in INR'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'doctor_schedules'
        unique_together = ['doctor', 'day_of_week']
        ordering = ['day_of_week', 'start_time']
        indexes = [
            models.Index(fields=['doctor', 'is_active']),
            models.Index(fields=['day_of_week', 'is_active']),
        ]
    
    def __str__(self):
        day_name = dict(self.DAY_CHOICES).get(self.day_of_week, 'Unknown')
        return f"Dr. {self.doctor.get_full_name()} - {day_name} ({self.start_time}-{self.end_time})"
    
    def clean(self):
        """Validate schedule times."""
        if self.start_time and self.end_time:
            if self.start_time >= self.end_time:
                raise ValidationError('Start time must be before end time.')
        
        if self.break_start and self.break_end:
            if self.break_start >= self.break_end:
                raise ValidationError('Break start must be before break end.')
            if self.break_start < self.start_time or self.break_end > self.end_time:
                raise ValidationError('Break time must be within working hours.')
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def get_day_name(self):
        """Get day name from day_of_week."""
        return dict(self.DAY_CHOICES).get(self.day_of_week, 'Unknown')


class ScheduleException(models.Model):
    """
    Exceptions to regular schedule.
    Used for leaves, holidays, special hours, etc.
    """
    
    EXCEPTION_TYPES = [
        ('leave', 'Leave/Holiday'),
        ('modified', 'Modified Hours'),
        ('extra', 'Extra Working Day'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='schedule_exceptions'
    )
    
    # Exception date
    exception_date = models.DateField()
    exception_type = models.CharField(max_length=20, choices=EXCEPTION_TYPES)
    
    # For modified/extra hours
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    
    # Reason
    reason = models.CharField(max_length=255, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'schedule_exceptions'
        unique_together = ['doctor', 'exception_date']
        ordering = ['-exception_date']
        indexes = [
            models.Index(fields=['doctor', 'exception_date']),
            models.Index(fields=['exception_date', 'exception_type']),
        ]
    
    def __str__(self):
        return f"Dr. {self.doctor.get_full_name()} - {self.exception_date} ({self.exception_type})"
    
    def clean(self):
        """Validate exception data."""
        if self.exception_type in ['modified', 'extra']:
            if not self.start_time or not self.end_time:
                raise ValidationError(
                    'Start and end time required for modified/extra hours.'
                )
            if self.start_time >= self.end_time:
                raise ValidationError('Start time must be before end time.')
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class TimeSlot(models.Model):
    """
    Pre-generated time slots for appointments.
    Generated daily for upcoming days.
    """
    
    SLOT_STATUS = [
        ('available', 'Available'),
        ('booked', 'Booked'),
        ('blocked', 'Blocked'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='time_slots'
    )
    
    # Slot date and time
    slot_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=SLOT_STATUS,
        default='available'
    )
    
    # Capacity
    max_bookings = models.PositiveSmallIntegerField(default=1)
    current_bookings = models.PositiveSmallIntegerField(default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'time_slots'
        unique_together = ['doctor', 'slot_date', 'start_time']
        ordering = ['slot_date', 'start_time']
        indexes = [
            models.Index(fields=['doctor', 'slot_date', 'status']),
            models.Index(fields=['slot_date', 'status']),
            models.Index(fields=['doctor', 'status']),
        ]
    
    def __str__(self):
        return f"Dr. {self.doctor.get_full_name()} - {self.slot_date} {self.start_time} ({self.status})"
    
    @property
    def is_available(self):
        """Check if slot is available for booking."""
        if self.status != 'available':
            return False
        if self.current_bookings >= self.max_bookings:
            return False
        # Check if slot is in the past
        slot_datetime = timezone.make_aware(
            datetime.combine(self.slot_date, self.start_time)
        )
        if slot_datetime <= timezone.now():
            return False
        return True
    
    @property
    def remaining_capacity(self):
        """Get remaining booking capacity."""
        return max(0, self.max_bookings - self.current_bookings)
    
    def book(self):
        """Book one slot."""
        if not self.is_available:
            raise ValidationError('Slot is not available for booking.')
        self.current_bookings += 1
        if self.current_bookings >= self.max_bookings:
            self.status = 'booked'
        self.save()
    
    def cancel_booking(self):
        """Cancel one booking from slot."""
        if self.current_bookings > 0:
            self.current_bookings -= 1
            if self.status == 'booked' and self.current_bookings < self.max_bookings:
                self.status = 'available'
            self.save()


class Appointment(models.Model):
    """
    Patient appointments with doctors.
    Core model for appointment booking.
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending Confirmation'),
        ('confirmed', 'Confirmed'),
        ('checked_in', 'Checked In'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
        ('rescheduled', 'Rescheduled'),
    ]
    
    BOOKING_TYPE = [
        ('online', 'Online Booking'),
        ('walk_in', 'Walk-in'),
        ('phone', 'Phone Booking'),
        ('follow_up', 'Follow-up'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Patient and Doctor
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patient_appointments'
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='doctor_appointments'
    )
    
    # Time slot reference (optional - for slot-based booking)
    time_slot = models.ForeignKey(
        TimeSlot,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='appointments'
    )
    
    # Appointment date and time
    appointment_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Booking details
    booking_type = models.CharField(
        max_length=20,
        choices=BOOKING_TYPE,
        default='online'
    )
    
    # Reason for visit
    reason = models.TextField(
        blank=True,
        help_text='Reason for appointment / Chief complaint'
    )
    symptoms = models.TextField(
        blank=True,
        help_text='Symptoms described by patient'
    )
    
    # Notes
    patient_notes = models.TextField(
        blank=True,
        help_text='Notes from patient'
    )
    doctor_notes = models.TextField(
        blank=True,
        help_text='Notes from doctor (after consultation)'
    )
    
    # Cancellation/Rescheduling
    cancellation_reason = models.TextField(blank=True)
    cancelled_by = models.CharField(max_length=20, blank=True)  # 'patient' or 'doctor'
    rescheduled_from = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rescheduled_to'
    )
    
    # Timestamps for tracking
    confirmed_at = models.DateTimeField(null=True, blank=True)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    # Consultation details (filled after completion)
    consultation_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    prescription_id = models.UUIDField(
        null=True,
        blank=True,
        help_text='Reference to prescription if created'
    )
    
    # Reminders
    reminder_24h_sent = models.BooleanField(default=False)
    reminder_1h_sent = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'appointments'
        ordering = ['-appointment_date', 'start_time']
        indexes = [
            models.Index(fields=['patient', 'status']),
            models.Index(fields=['doctor', 'status']),
            models.Index(fields=['doctor', 'appointment_date']),
            models.Index(fields=['patient', 'appointment_date']),
            models.Index(fields=['status', 'appointment_date']),
            models.Index(fields=['appointment_date', 'start_time']),
        ]
    
    def __str__(self):
        return f"{self.patient.get_full_name()} → Dr. {self.doctor.get_full_name()} | {self.appointment_date} {self.start_time}"
    
    def clean(self):
        """Validate appointment data."""
        # Check if appointment is in the past
        if self.appointment_date and self.start_time:
            appointment_datetime = timezone.make_aware(
                datetime.combine(self.appointment_date, self.start_time)
            )
            if appointment_datetime < timezone.now() and not self.pk:
                raise ValidationError('Cannot book appointment in the past.')
        
        # Check patient != doctor
        if self.patient_id and self.doctor_id and self.patient_id == self.doctor_id:
            raise ValidationError('Patient and doctor cannot be the same person.')
    
    def save(self, *args, **kwargs):
        # Set end_time if not provided (assume 30 min duration)
        if self.start_time and not self.end_time:
            start_dt = datetime.combine(datetime.today(), self.start_time)
            end_dt = start_dt + timedelta(minutes=30)
            self.end_time = end_dt.time()
        
        super().save(*args, **kwargs)
    
    @property
    def is_upcoming(self):
        """Check if appointment is upcoming."""
        if self.status in ['cancelled', 'completed', 'no_show']:
            return False
        appointment_datetime = timezone.make_aware(
            datetime.combine(self.appointment_date, self.start_time)
        )
        return appointment_datetime > timezone.now()
    
    @property
    def is_past(self):
        """Check if appointment is in the past."""
        appointment_datetime = timezone.make_aware(
            datetime.combine(self.appointment_date, self.start_time)
        )
        return appointment_datetime < timezone.now()
    
    @property
    def can_cancel(self):
        """Check if appointment can be cancelled."""
        if self.status in ['cancelled', 'completed', 'no_show', 'in_progress']:
            return False
        return self.is_upcoming
    
    @property
    def can_reschedule(self):
        """Check if appointment can be rescheduled."""
        if self.status in ['cancelled', 'completed', 'no_show', 'in_progress', 'checked_in']:
            return False
        return self.is_upcoming
    
    def confirm(self):
        """Confirm the appointment."""
        if self.status not in ['pending']:
            raise ValidationError('Only pending appointments can be confirmed.')
        self.status = 'confirmed'
        self.confirmed_at = timezone.now()
        self.save()
    
    def check_in(self):
        """Check in patient for appointment."""
        if self.status not in ['confirmed']:
            raise ValidationError('Only confirmed appointments can be checked in.')
        self.status = 'checked_in'
        self.checked_in_at = timezone.now()
        self.save()
    
    def start_consultation(self):
        """Start the consultation."""
        if self.status not in ['checked_in']:
            raise ValidationError('Patient must be checked in to start consultation.')
        self.status = 'in_progress'
        self.started_at = timezone.now()
        self.save()
    
    def complete(self, doctor_notes='', fee=None):
        """Complete the consultation."""
        if self.status not in ['in_progress']:
            raise ValidationError('Consultation must be in progress to complete.')
        self.status = 'completed'
        self.completed_at = timezone.now()
        if doctor_notes:
            self.doctor_notes = doctor_notes
        if fee is not None:
            self.consultation_fee = fee
        self.save()
    
    def cancel(self, reason='', cancelled_by='patient'):
        """Cancel the appointment."""
        if not self.can_cancel:
            raise ValidationError('This appointment cannot be cancelled.')
        self.status = 'cancelled'
        self.cancellation_reason = reason
        self.cancelled_by = cancelled_by
        self.cancelled_at = timezone.now()
        self.save()
        
        # Release the time slot
        if self.time_slot:
            self.time_slot.cancel_booking()
    
    def mark_no_show(self):
        """Mark patient as no-show."""
        if self.status not in ['confirmed', 'pending']:
            raise ValidationError('Only pending/confirmed appointments can be marked as no-show.')
        self.status = 'no_show'
        self.save()


class AppointmentQueue(models.Model):
    """
    Queue management for appointments.
    Tracks check-in order and waiting status.
    """
    
    QUEUE_STATUS = [
        ('waiting', 'Waiting'),
        ('called', 'Called'),
        ('in_consultation', 'In Consultation'),
        ('completed', 'Completed'),
        ('skipped', 'Skipped'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.CASCADE,
        related_name='queue_entry'
    )
    
    # Queue position
    queue_number = models.PositiveIntegerField()
    queue_date = models.DateField()
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=QUEUE_STATUS,
        default='waiting'
    )
    
    # Timestamps
    checked_in_at = models.DateTimeField(auto_now_add=True)
    called_at = models.DateTimeField(null=True, blank=True)
    consultation_started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Estimated wait time (in minutes)
    estimated_wait_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Estimated wait time in minutes'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'appointment_queue'
        ordering = ['queue_date', 'queue_number']
        unique_together = ['appointment']
        indexes = [
            models.Index(fields=['queue_date', 'status']),
            models.Index(fields=['appointment', 'status']),
            models.Index(fields=['queue_date', 'queue_number']),
        ]
    
    def __str__(self):
        return f"Queue #{self.queue_number} - {self.appointment.patient.get_full_name()} ({self.status})"
    
    def call_patient(self):
        """Call the patient from waiting."""
        if self.status != 'waiting':
            raise ValidationError('Only waiting patients can be called.')
        self.status = 'called'
        self.called_at = timezone.now()
        self.save()
    
    def start_consultation(self):
        """Mark consultation as started."""
        if self.status not in ['called']:
            raise ValidationError('Patient must be called first.')
        self.status = 'in_consultation'
        self.consultation_started_at = timezone.now()
        self.appointment.start_consultation()
        self.save()
    
    def complete_consultation(self):
        """Mark consultation as completed."""
        if self.status not in ['in_consultation']:
            raise ValidationError('Consultation must be in progress.')
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()
    
    def skip(self):
        """Skip this patient in queue."""
        if self.status not in ['waiting', 'called']:
            raise ValidationError('Only waiting/called patients can be skipped.')
        self.status = 'skipped'
        self.save()
    
    @property
    def wait_time_minutes(self):
        """Calculate actual wait time in minutes."""
        if self.called_at and self.checked_in_at:
            delta = self.called_at - self.checked_in_at
            return int(delta.total_seconds() / 60)
        elif self.checked_in_at:
            delta = timezone.now() - self.checked_in_at
            return int(delta.total_seconds() / 60)
        return 0


class AppointmentReminder(models.Model):
    """
    Track appointment reminders sent to patients.
    """
    
    REMINDER_TYPES = [
        ('24h', '24 Hours Before'),
        ('1h', '1 Hour Before'),
        ('custom', 'Custom Reminder'),
    ]
    
    REMINDER_STATUS = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name='reminders'
    )
    
    reminder_type = models.CharField(max_length=20, choices=REMINDER_TYPES)
    scheduled_time = models.DateTimeField()
    
    status = models.CharField(
        max_length=20,
        choices=REMINDER_STATUS,
        default='pending'
    )
    
    # Sent details
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'appointment_reminders'
        ordering = ['scheduled_time']
        indexes = [
            models.Index(fields=['status', 'scheduled_time']),
            models.Index(fields=['appointment', 'reminder_type']),
        ]
    
    def __str__(self):
        return f"Reminder ({self.reminder_type}) for {self.appointment}"
    
    def mark_sent(self):
        """Mark reminder as sent."""
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save()
        
        # Update appointment reminder flags
        if self.reminder_type == '24h':
            self.appointment.reminder_24h_sent = True
        elif self.reminder_type == '1h':
            self.appointment.reminder_1h_sent = True
        self.appointment.save()
    
    def mark_failed(self, error_message=''):
        """Mark reminder as failed."""
        self.status = 'failed'
        self.error_message = error_message
        self.save()