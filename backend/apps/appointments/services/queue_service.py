"""
Queue Service for MediConnect Appointments.

Handles patient queue management for appointments.
"""

import logging
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Tuple
from django.db import transaction
from django.db.models import Q, Max, Avg, Count
from django.utils import timezone

from apps.appointments.models import Appointment, AppointmentQueue

logger = logging.getLogger(__name__)


class QueueService:
    """Service for managing appointment queues."""
    
    @staticmethod
    def get_next_queue_number(doctor, queue_date: date) -> int:
        """
        Get next queue number for a doctor on a specific date.
        
        Args:
            doctor: Doctor user instance
            queue_date: Date for queue
            
        Returns:
            Next queue number
        """
        max_number = AppointmentQueue.objects.filter(
            appointment__doctor=doctor,
            queue_date=queue_date
        ).aggregate(max_num=Max('queue_number'))['max_num']
        
        return (max_number or 0) + 1
    
    @staticmethod
    @transaction.atomic
    def check_in_patient(appointment: Appointment) -> Tuple[Optional[AppointmentQueue], Optional[str]]:
        """
        Check in patient and add to queue.
        
        Args:
            appointment: Appointment to check in
            
        Returns:
            Tuple of (AppointmentQueue, error_message)
        """
        # Validate appointment status
        if appointment.status != 'confirmed':
            return None, f'Cannot check in appointment with status: {appointment.status}'
        
        # Validate date
        today = timezone.now().date()
        if appointment.appointment_date != today:
            if appointment.appointment_date < today:
                return None, 'Cannot check in for a past appointment.'
            else:
                return None, 'Cannot check in before the appointment date.'
        
        # Check if already in queue
        if hasattr(appointment, 'queue_entry'):
            return None, 'Patient is already checked in.'
        
        # Update appointment status
        appointment.status = 'checked_in'
        appointment.checked_in_at = timezone.now()
        appointment.save()
        
        # Get next queue number
        queue_number = QueueService.get_next_queue_number(
            appointment.doctor,
            today
        )
        
        # Calculate estimated wait time
        estimated_wait = QueueService.calculate_estimated_wait(
            appointment.doctor,
            today
        )
        
        # Create queue entry
        queue_entry = AppointmentQueue.objects.create(
            appointment=appointment,
            queue_number=queue_number,
            queue_date=today,
            status='waiting',
            estimated_wait_minutes=estimated_wait
        )
        
        logger.info(
            f"Checked in patient {appointment.patient.get_full_name()} - "
            f"Queue #{queue_number} for Dr. {appointment.doctor.get_full_name()}"
        )
        
        return queue_entry, None
    
    @staticmethod
    def calculate_estimated_wait(doctor, queue_date: date) -> int:
        """
        Calculate estimated wait time in minutes.
        
        Args:
            doctor: Doctor user instance
            queue_date: Date for queue
            
        Returns:
            Estimated wait time in minutes
        """
        # Get average consultation time from completed appointments today
        avg_time = AppointmentQueue.objects.filter(
            appointment__doctor=doctor,
            queue_date=queue_date,
            status='completed',
            consultation_started_at__isnull=False,
            completed_at__isnull=False
        ).annotate(
            duration=models.F('completed_at') - models.F('consultation_started_at')
        ).aggregate(avg_duration=Avg('duration'))['avg_duration']
        
        if avg_time:
            avg_minutes = avg_time.total_seconds() / 60
        else:
            # Default average consultation time
            avg_minutes = 15
        
        # Count patients waiting ahead
        waiting_count = AppointmentQueue.objects.filter(
            appointment__doctor=doctor,
            queue_date=queue_date,
            status__in=['waiting', 'called']
        ).count()
        
        # Estimate: waiting patients * average time
        estimated_wait = int(waiting_count * avg_minutes)
        
        return estimated_wait
    
    @staticmethod
    def get_doctor_queue(
        doctor,
        queue_date: date = None,
        status: str = None
    ) -> List[AppointmentQueue]:
        """
        Get queue for a doctor.
        
        Args:
            doctor: Doctor user instance
            queue_date: Date for queue (default: today)
            status: Filter by status
            
        Returns:
            List of AppointmentQueue objects
        """
        if queue_date is None:
            queue_date = timezone.now().date()
        
        queryset = AppointmentQueue.objects.filter(
            appointment__doctor=doctor,
            queue_date=queue_date
        ).select_related(
            'appointment',
            'appointment__patient',
            'appointment__doctor'
        ).order_by('queue_number')
        
        if status:
            queryset = queryset.filter(status=status)
        
        return list(queryset)
    
    @staticmethod
    def get_waiting_queue(doctor, queue_date: date = None) -> List[AppointmentQueue]:
        """
        Get waiting patients in queue.
        
        Args:
            doctor: Doctor user instance
            queue_date: Date for queue (default: today)
            
        Returns:
            List of waiting AppointmentQueue objects
        """
        return QueueService.get_doctor_queue(
            doctor,
            queue_date,
            status='waiting'
        )
    
    @staticmethod
    def get_queue_position(queue_entry: AppointmentQueue) -> int:
        """
        Get current position in queue (among waiting patients).
        
        Args:
            queue_entry: AppointmentQueue entry
            
        Returns:
            Position in queue (1-based)
        """
        if queue_entry.status != 'waiting':
            return 0
        
        position = AppointmentQueue.objects.filter(
            appointment__doctor=queue_entry.appointment.doctor,
            queue_date=queue_entry.queue_date,
            status='waiting',
            queue_number__lt=queue_entry.queue_number
        ).count()
        
        return position + 1
    
    @staticmethod
    @transaction.atomic
    def call_next_patient(doctor, queue_date: date = None) -> Tuple[Optional[AppointmentQueue], Optional[str]]:
        """
        Call next patient in queue.
        
        Args:
            doctor: Doctor user instance
            queue_date: Date for queue (default: today)
            
        Returns:
            Tuple of (AppointmentQueue, error_message)
        """
        if queue_date is None:
            queue_date = timezone.now().date()
        
        # Get next waiting patient
        next_patient = AppointmentQueue.objects.filter(
            appointment__doctor=doctor,
            queue_date=queue_date,
            status='waiting'
        ).order_by('queue_number').first()
        
        if not next_patient:
            return None, 'No patients waiting in queue.'
        
        # Update status
        next_patient.status = 'called'
        next_patient.called_at = timezone.now()
        next_patient.save()
        
        logger.info(
            f"Called patient {next_patient.appointment.patient.get_full_name()} - "
            f"Queue #{next_patient.queue_number}"
        )
        
        return next_patient, None
    
    @staticmethod
    @transaction.atomic
    def call_specific_patient(queue_entry: AppointmentQueue) -> Tuple[bool, Optional[str]]:
        """
        Call a specific patient in queue.
        
        Args:
            queue_entry: AppointmentQueue entry to call
            
        Returns:
            Tuple of (success, error_message)
        """
        if queue_entry.status != 'waiting':
            return False, f'Cannot call patient with status: {queue_entry.status}'
        
        queue_entry.status = 'called'
        queue_entry.called_at = timezone.now()
        queue_entry.save()
        
        logger.info(
            f"Called patient {queue_entry.appointment.patient.get_full_name()} - "
            f"Queue #{queue_entry.queue_number}"
        )
        
        return True, None
    
    @staticmethod
    @transaction.atomic
    def start_consultation(queue_entry: AppointmentQueue) -> Tuple[bool, Optional[str]]:
        """
        Start consultation for a patient in queue.
        
        Args:
            queue_entry: AppointmentQueue entry
            
        Returns:
            Tuple of (success, error_message)
        """
        if queue_entry.status not in ['called', 'waiting']:
            return False, f'Cannot start consultation with queue status: {queue_entry.status}'
        
        # Update queue entry
        queue_entry.status = 'in_consultation'
        queue_entry.consultation_started_at = timezone.now()
        if not queue_entry.called_at:
            queue_entry.called_at = timezone.now()
        queue_entry.save()
        
        # Update appointment
        appointment = queue_entry.appointment
        appointment.status = 'in_progress'
        appointment.started_at = timezone.now()
        appointment.save()
        
        logger.info(
            f"Started consultation for {appointment.patient.get_full_name()} - "
            f"Queue #{queue_entry.queue_number}"
        )
        
        return True, None
    
    @staticmethod
    @transaction.atomic
    def complete_consultation(
        queue_entry: AppointmentQueue,
        doctor_notes: str = '',
        fee: float = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Complete consultation for a patient in queue.
        
        Args:
            queue_entry: AppointmentQueue entry
            doctor_notes: Notes from doctor
            fee: Consultation fee
            
        Returns:
            Tuple of (success, error_message)
        """
        if queue_entry.status != 'in_consultation':
            return False, f'Cannot complete consultation with queue status: {queue_entry.status}'
        
        # Update queue entry
        queue_entry.status = 'completed'
        queue_entry.completed_at = timezone.now()
        queue_entry.save()
        
        # Update appointment
        appointment = queue_entry.appointment
        appointment.status = 'completed'
        appointment.completed_at = timezone.now()
        if doctor_notes:
            appointment.doctor_notes = doctor_notes
        if fee is not None:
            appointment.consultation_fee = fee
        appointment.save()
        
        # Update estimated wait times for remaining patients
        QueueService.update_wait_times(
            appointment.doctor,
            queue_entry.queue_date
        )
        
        logger.info(
            f"Completed consultation for {appointment.patient.get_full_name()} - "
            f"Queue #{queue_entry.queue_number}"
        )
        
        return True, None
    
    @staticmethod
    @transaction.atomic
    def skip_patient(queue_entry: AppointmentQueue, reason: str = '') -> Tuple[bool, Optional[str]]:
        """
        Skip a patient in queue.
        
        Args:
            queue_entry: AppointmentQueue entry to skip
            reason: Reason for skipping
            
        Returns:
            Tuple of (success, error_message)
        """
        if queue_entry.status not in ['waiting', 'called']:
            return False, f'Cannot skip patient with status: {queue_entry.status}'
        
        queue_entry.status = 'skipped'
        queue_entry.save()
        
        logger.info(
            f"Skipped patient {queue_entry.appointment.patient.get_full_name()} - "
            f"Queue #{queue_entry.queue_number}. Reason: {reason}"
        )
        
        return True, None
    
    @staticmethod
    @transaction.atomic
    def requeue_patient(queue_entry: AppointmentQueue) -> Tuple[Optional[AppointmentQueue], Optional[str]]:
        """
        Re-add a skipped patient to the end of queue.
        
        Args:
            queue_entry: AppointmentQueue entry to requeue
            
        Returns:
            Tuple of (new_queue_entry, error_message)
        """
        if queue_entry.status != 'skipped':
            return None, 'Only skipped patients can be requeued.'
        
        # Get new queue number
        new_queue_number = QueueService.get_next_queue_number(
            queue_entry.appointment.doctor,
            queue_entry.queue_date
        )
        
        # Update queue entry
        queue_entry.queue_number = new_queue_number
        queue_entry.status = 'waiting'
        queue_entry.called_at = None
        queue_entry.estimated_wait_minutes = QueueService.calculate_estimated_wait(
            queue_entry.appointment.doctor,
            queue_entry.queue_date
        )
        queue_entry.save()
        
        logger.info(
            f"Requeued patient {queue_entry.appointment.patient.get_full_name()} - "
            f"New Queue #{new_queue_number}"
        )
        
        return queue_entry, None
    
    @staticmethod
    def update_wait_times(doctor, queue_date: date):
        """
        Update estimated wait times for all waiting patients.
        
        Args:
            doctor: Doctor user instance
            queue_date: Date for queue
        """
        waiting_entries = AppointmentQueue.objects.filter(
            appointment__doctor=doctor,
            queue_date=queue_date,
            status='waiting'
        ).order_by('queue_number')
        
        # Get average consultation time
        avg_time = QueueService._get_average_consultation_time(doctor, queue_date)
        
        for i, entry in enumerate(waiting_entries):
            entry.estimated_wait_minutes = int((i + 1) * avg_time)
            entry.save(update_fields=['estimated_wait_minutes'])
    
    @staticmethod
    def _get_average_consultation_time(doctor, queue_date: date) -> float:
        """
        Get average consultation time in minutes.
        
        Args:
            doctor: Doctor user instance
            queue_date: Date for queue
            
        Returns:
            Average time in minutes
        """
        completed = AppointmentQueue.objects.filter(
            appointment__doctor=doctor,
            queue_date=queue_date,
            status='completed',
            consultation_started_at__isnull=False,
            completed_at__isnull=False
        )
        
        if not completed.exists():
            return 15.0  # Default 15 minutes
        
        total_time = 0
        count = 0
        
        for entry in completed:
            if entry.consultation_started_at and entry.completed_at:
                duration = (entry.completed_at - entry.consultation_started_at).total_seconds() / 60
                total_time += duration
                count += 1
        
        if count == 0:
            return 15.0
        
        return total_time / count
    
    @staticmethod
    def get_queue_stats(doctor, queue_date: date = None) -> Dict:
        """
        Get queue statistics for a doctor.
        
        Args:
            doctor: Doctor user instance
            queue_date: Date for queue (default: today)
            
        Returns:
            Dict with queue statistics
        """
        if queue_date is None:
            queue_date = timezone.now().date()
        
        queue_entries = AppointmentQueue.objects.filter(
            appointment__doctor=doctor,
            queue_date=queue_date
        )
        
        stats = queue_entries.values('status').annotate(count=Count('status'))
        
        result = {
            'date': queue_date,
            'total': 0,
            'waiting': 0,
            'called': 0,
            'in_consultation': 0,
            'completed': 0,
            'skipped': 0,
            'average_wait_time': 0,
            'average_consultation_time': 0,
        }
        
        for item in stats:
            result[item['status']] = item['count']
            result['total'] += item['count']
        
        # Calculate average wait time (for completed patients)
        completed_with_wait = queue_entries.filter(
            status='completed',
            called_at__isnull=False
        )
        
        if completed_with_wait.exists():
            total_wait = 0
            count = 0
            for entry in completed_with_wait:
                if entry.called_at and entry.checked_in_at:
                    wait_time = (entry.called_at - entry.checked_in_at).total_seconds() / 60
                    total_wait += wait_time
                    count += 1
            
            if count > 0:
                result['average_wait_time'] = round(total_wait / count, 1)
        
        # Calculate average consultation time
        result['average_consultation_time'] = round(
            QueueService._get_average_consultation_time(doctor, queue_date),
            1
        )
        
        return result
    
    @staticmethod
    def get_patient_queue_status(patient, queue_date: date = None) -> Optional[Dict]:
        """
        Get queue status for a patient.
        
        Args:
            patient: Patient user instance
            queue_date: Date for queue (default: today)
            
        Returns:
            Dict with queue status or None
        """
        if queue_date is None:
            queue_date = timezone.now().date()
        
        queue_entry = AppointmentQueue.objects.filter(
            appointment__patient=patient,
            queue_date=queue_date,
            status__in=['waiting', 'called', 'in_consultation']
        ).select_related(
            'appointment',
            'appointment__doctor'
        ).first()
        
        if not queue_entry:
            return None
        
        position = QueueService.get_queue_position(queue_entry)
        
        return {
            'queue_id': str(queue_entry.id),
            'queue_number': queue_entry.queue_number,
            'position': position,
            'status': queue_entry.status,
            'status_display': queue_entry.get_status_display(),
            'doctor_name': queue_entry.appointment.doctor.get_full_name(),
            'checked_in_at': queue_entry.checked_in_at,
            'called_at': queue_entry.called_at,
            'estimated_wait_minutes': queue_entry.estimated_wait_minutes,
            'actual_wait_minutes': queue_entry.wait_time_minutes,
        }


# Import models at module level to avoid circular imports
from django.db import models