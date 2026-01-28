"""
Appointment Service for MediConnect.

Handles appointment booking, management, and status updates.
"""

import logging
from datetime import datetime, timedelta, date, time
from typing import List, Dict, Optional, Tuple
from django.db import transaction
from django.db.models import Q, Count
from django.utils import timezone

from apps.appointments.models import (
    Appointment,
    TimeSlot,
    AppointmentReminder,
)
from apps.appointments.services.slot_service import SlotService
from apps.appointments.services.schedule_service import ScheduleService

logger = logging.getLogger(__name__)


class AppointmentService:
    """Service for managing appointments."""
    
    @staticmethod
    @transaction.atomic
    def create_appointment(
        patient,
        doctor,
        appointment_date: date,
        start_time: time,
        time_slot: TimeSlot = None,
        reason: str = '',
        symptoms: str = '',
        patient_notes: str = '',
        booking_type: str = 'online'
    ) -> Tuple[Appointment, Optional[str]]:
        """
        Create a new appointment.
        
        Args:
            patient: Patient user instance
            doctor: Doctor user instance
            appointment_date: Date of appointment
            start_time: Start time
            time_slot: TimeSlot instance (optional)
            reason: Reason for visit
            symptoms: Patient symptoms
            patient_notes: Notes from patient
            booking_type: Type of booking
            
        Returns:
            Tuple of (Appointment, error_message)
        """
        # Validate doctor availability
        is_available, reason_msg = ScheduleService.is_doctor_available_on_date(
            doctor, appointment_date
        )
        
        if not is_available:
            return None, reason_msg
        
        # Check for existing appointment at same time
        existing = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=appointment_date,
            start_time=start_time,
            status__in=['pending', 'confirmed', 'checked_in', 'in_progress']
        ).exists()
        
        if existing:
            return None, 'This time slot is already booked.'
        
        # Check if patient already has appointment with this doctor on this date
        patient_existing = Appointment.objects.filter(
            patient=patient,
            doctor=doctor,
            appointment_date=appointment_date,
            status__in=['pending', 'confirmed', 'checked_in', 'in_progress']
        ).exists()
        
        if patient_existing:
            return None, 'You already have an appointment with this doctor on this date.'
        
        # Get end time from schedule
        working_hours = ScheduleService.get_working_hours(doctor, appointment_date)
        if working_hours:
            duration = working_hours['slot_duration_minutes']
            start_dt = datetime.combine(datetime.today(), start_time)
            end_time = (start_dt + timedelta(minutes=duration)).time()
        else:
            end_time = (datetime.combine(datetime.today(), start_time) + timedelta(minutes=30)).time()
        
        # Create appointment
        appointment = Appointment.objects.create(
            patient=patient,
            doctor=doctor,
            appointment_date=appointment_date,
            start_time=start_time,
            end_time=end_time,
            time_slot=time_slot,
            reason=reason,
            symptoms=symptoms,
            patient_notes=patient_notes,
            booking_type=booking_type,
            status='pending',
        )
        
        # Book the slot if provided
        if time_slot:
            SlotService.book_slot(time_slot)
        
        # Create reminders
        AppointmentService._create_reminders(appointment)
        
        logger.info(
            f"Created appointment {appointment.id}: "
            f"{patient.get_full_name()} with Dr. {doctor.get_full_name()} "
            f"on {appointment_date} at {start_time}"
        )
        
        return appointment, None
    
    @staticmethod
    def _create_reminders(appointment: Appointment):
        """Create reminder entries for appointment."""
        appointment_datetime = timezone.make_aware(
            datetime.combine(appointment.appointment_date, appointment.start_time)
        )
        
        # 24 hour reminder
        reminder_24h_time = appointment_datetime - timedelta(hours=24)
        if reminder_24h_time > timezone.now():
            AppointmentReminder.objects.create(
                appointment=appointment,
                reminder_type='24h',
                scheduled_time=reminder_24h_time,
                status='pending'
            )
        
        # 1 hour reminder
        reminder_1h_time = appointment_datetime - timedelta(hours=1)
        if reminder_1h_time > timezone.now():
            AppointmentReminder.objects.create(
                appointment=appointment,
                reminder_type='1h',
                scheduled_time=reminder_1h_time,
                status='pending'
            )
    
    @staticmethod
    @transaction.atomic
    def confirm_appointment(appointment: Appointment) -> Tuple[bool, Optional[str]]:
        """
        Confirm a pending appointment.
        
        Args:
            appointment: Appointment to confirm
            
        Returns:
            Tuple of (success, error_message)
        """
        if appointment.status != 'pending':
            return False, f'Cannot confirm appointment with status: {appointment.status}'
        
        appointment.status = 'confirmed'
        appointment.confirmed_at = timezone.now()
        appointment.save()
        
        logger.info(f"Confirmed appointment {appointment.id}")
        
        return True, None
    
    @staticmethod
    @transaction.atomic
    def cancel_appointment(
        appointment: Appointment,
        reason: str = '',
        cancelled_by: str = 'patient'
    ) -> Tuple[bool, Optional[str]]:
        """
        Cancel an appointment.
        
        Args:
            appointment: Appointment to cancel
            reason: Cancellation reason
            cancelled_by: 'patient' or 'doctor'
            
        Returns:
            Tuple of (success, error_message)
        """
        if not appointment.can_cancel:
            return False, 'This appointment cannot be cancelled.'
        
        appointment.status = 'cancelled'
        appointment.cancellation_reason = reason
        appointment.cancelled_by = cancelled_by
        appointment.cancelled_at = timezone.now()
        appointment.save()
        
        # Release time slot
        if appointment.time_slot:
            SlotService.release_slot(appointment.time_slot)
        
        # Cancel pending reminders
        AppointmentReminder.objects.filter(
            appointment=appointment,
            status='pending'
        ).update(status='failed', error_message='Appointment cancelled')
        
        logger.info(f"Cancelled appointment {appointment.id} by {cancelled_by}")
        
        return True, None
    
    @staticmethod
    @transaction.atomic
    def reschedule_appointment(
        appointment: Appointment,
        new_date: date,
        new_time: time,
        new_slot: TimeSlot = None,
        reason: str = ''
    ) -> Tuple[Optional[Appointment], Optional[str]]:
        """
        Reschedule an appointment.
        
        Args:
            appointment: Appointment to reschedule
            new_date: New date
            new_time: New time
            new_slot: New time slot (optional)
            reason: Reason for rescheduling
            
        Returns:
            Tuple of (new_appointment, error_message)
        """
        if not appointment.can_reschedule:
            return None, 'This appointment cannot be rescheduled.'
        
        # Create new appointment
        new_appointment, error = AppointmentService.create_appointment(
            patient=appointment.patient,
            doctor=appointment.doctor,
            appointment_date=new_date,
            start_time=new_time,
            time_slot=new_slot,
            reason=appointment.reason,
            symptoms=appointment.symptoms,
            patient_notes=appointment.patient_notes,
            booking_type=appointment.booking_type,
        )
        
        if error:
            return None, error
        
        # Link to original
        new_appointment.rescheduled_from = appointment
        new_appointment.save()
        
        # Mark original as rescheduled
        appointment.status = 'rescheduled'
        appointment.cancellation_reason = reason or 'Rescheduled'
        appointment.save()
        
        # Release old slot
        if appointment.time_slot:
            SlotService.release_slot(appointment.time_slot)
        
        logger.info(
            f"Rescheduled appointment {appointment.id} to {new_appointment.id} "
            f"({new_date} {new_time})"
        )
        
        return new_appointment, None
    
    @staticmethod
    @transaction.atomic
    def check_in(appointment: Appointment) -> Tuple[bool, Optional[str]]:
        """
        Check in patient for appointment.
        
        Args:
            appointment: Appointment to check in
            
        Returns:
            Tuple of (success, error_message)
        """
        if appointment.status != 'confirmed':
            return False, f'Cannot check in appointment with status: {appointment.status}'
        
        if appointment.appointment_date != timezone.now().date():
            return False, 'Can only check in on the appointment date.'
        
        appointment.status = 'checked_in'
        appointment.checked_in_at = timezone.now()
        appointment.save()
        
        logger.info(f"Checked in appointment {appointment.id}")
        
        return True, None
    
    @staticmethod
    @transaction.atomic
    def start_consultation(appointment: Appointment) -> Tuple[bool, Optional[str]]:
        """
        Start consultation for appointment.
        
        Args:
            appointment: Appointment to start
            
        Returns:
            Tuple of (success, error_message)
        """
        if appointment.status != 'checked_in':
            return False, f'Cannot start consultation with status: {appointment.status}'
        
        appointment.status = 'in_progress'
        appointment.started_at = timezone.now()
        appointment.save()
        
        logger.info(f"Started consultation for appointment {appointment.id}")
        
        return True, None
    
    @staticmethod
    @transaction.atomic
    def complete_consultation(
        appointment: Appointment,
        doctor_notes: str = '',
        fee: float = None,
        prescription_id: str = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Complete consultation for appointment.
        
        Args:
            appointment: Appointment to complete
            doctor_notes: Notes from doctor
            fee: Consultation fee
            prescription_id: Reference to prescription if created
            
        Returns:
            Tuple of (success, error_message)
        """
        if appointment.status != 'in_progress':
            return False, f'Cannot complete consultation with status: {appointment.status}'
        
        appointment.status = 'completed'
        appointment.completed_at = timezone.now()
        
        if doctor_notes:
            appointment.doctor_notes = doctor_notes
        if fee is not None:
            appointment.consultation_fee = fee
        if prescription_id:
            appointment.prescription_id = prescription_id
        
        appointment.save()
        
        logger.info(f"Completed consultation for appointment {appointment.id}")
        
        return True, None
    
    @staticmethod
    @transaction.atomic
    def mark_no_show(appointment: Appointment) -> Tuple[bool, Optional[str]]:
        """
        Mark patient as no-show.
        
        Args:
            appointment: Appointment to mark
            
        Returns:
            Tuple of (success, error_message)
        """
        if appointment.status not in ['pending', 'confirmed']:
            return False, f'Cannot mark no-show for appointment with status: {appointment.status}'
        
        appointment.status = 'no_show'
        appointment.save()
        
        logger.info(f"Marked appointment {appointment.id} as no-show")
        
        return True, None
    
    @staticmethod
    def get_patient_appointments(
        patient,
        status: str = None,
        upcoming_only: bool = False,
        limit: int = None
    ) -> List[Appointment]:
        """
        Get appointments for a patient.
        
        Args:
            patient: Patient user instance
            status: Filter by status
            upcoming_only: Only return upcoming appointments
            limit: Limit number of results
            
        Returns:
            List of Appointment objects
        """
        queryset = Appointment.objects.filter(patient=patient)
        
        if status:
            queryset = queryset.filter(status=status)
        
        if upcoming_only:
            today = timezone.now().date()
            current_time = timezone.now().time()
            queryset = queryset.filter(
                Q(appointment_date__gt=today) |
                Q(appointment_date=today, start_time__gt=current_time)
            ).exclude(
                status__in=['cancelled', 'completed', 'no_show']
            )
        
        queryset = queryset.select_related('doctor', 'patient').order_by(
            '-appointment_date', 'start_time'
        )
        
        if limit:
            queryset = queryset[:limit]
        
        return list(queryset)
    
    @staticmethod
    def get_doctor_appointments(
        doctor,
        appointment_date: date = None,
        status: str = None
    ) -> List[Appointment]:
        """
        Get appointments for a doctor.
        
        Args:
            doctor: Doctor user instance
            appointment_date: Filter by date
            status: Filter by status
            
        Returns:
            List of Appointment objects
        """
        queryset = Appointment.objects.filter(doctor=doctor)
        
        if appointment_date:
            queryset = queryset.filter(appointment_date=appointment_date)
        
        if status:
            queryset = queryset.filter(status=status)
        
        return list(queryset.select_related('patient', 'doctor').order_by(
            'appointment_date', 'start_time'
        ))
    
    @staticmethod
    def get_today_summary(doctor) -> Dict:
        """
        Get today's appointment summary for doctor.
        
        Args:
            doctor: Doctor user instance
            
        Returns:
            Dict with counts by status
        """
        today = timezone.now().date()
        
        appointments = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=today
        )
        
        summary = appointments.values('status').annotate(count=Count('status'))
        
        result = {
            'total': 0,
            'pending': 0,
            'confirmed': 0,
            'checked_in': 0,
            'in_progress': 0,
            'completed': 0,
            'cancelled': 0,
            'no_show': 0,
        }
        
        for item in summary:
            result[item['status']] = item['count']
            result['total'] += item['count']
        
        return result
    
    @staticmethod
    def auto_confirm_pending(hours_before: int = 24):
        """
        Auto-confirm pending appointments.
        
        Args:
            hours_before: Hours before appointment to auto-confirm
        """
        cutoff_time = timezone.now() + timedelta(hours=hours_before)
        cutoff_date = cutoff_time.date()
        
        pending = Appointment.objects.filter(
            status='pending',
            appointment_date__lte=cutoff_date
        )
        
        count = 0
        for appointment in pending:
            appointment_datetime = timezone.make_aware(
                datetime.combine(appointment.appointment_date, appointment.start_time)
            )
            if appointment_datetime <= cutoff_time:
                success, _ = AppointmentService.confirm_appointment(appointment)
                if success:
                    count += 1
        
        logger.info(f"Auto-confirmed {count} pending appointments")
        
        return count
    
    @staticmethod
    def mark_past_no_shows():
        """Mark past pending/confirmed appointments as no-show."""
        now = timezone.now()
        today = now.date()
        current_time = now.time()
        
        # Get appointments from today that have passed
        past_today = Appointment.objects.filter(
            appointment_date=today,
            start_time__lt=current_time,
            status__in=['pending', 'confirmed']
        )
        
        # Get appointments from before today
        past_days = Appointment.objects.filter(
            appointment_date__lt=today,
            status__in=['pending', 'confirmed']
        )
        
        count = 0
        for appointment in list(past_today) + list(past_days):
            # Add a 30 minute grace period
            appointment_datetime = timezone.make_aware(
                datetime.combine(appointment.appointment_date, appointment.start_time)
            )
            grace_time = appointment_datetime + timedelta(minutes=30)
            
            if now > grace_time:
                appointment.status = 'no_show'
                appointment.save()
                count += 1
        
        logger.info(f"Marked {count} appointments as no-show")
        
        return count