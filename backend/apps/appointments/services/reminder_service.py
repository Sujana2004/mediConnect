"""
Reminder Service for MediConnect Appointments.

Handles appointment reminder scheduling and sending.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.appointments.models import Appointment, AppointmentReminder

logger = logging.getLogger(__name__)


class ReminderService:
    """Service for managing appointment reminders."""
    
    # Reminder templates for different languages
    REMINDER_TEMPLATES = {
        '24h': {
            'en': {
                'title': 'Appointment Reminder',
                'body': 'You have an appointment with Dr. {doctor_name} tomorrow at {time}.',
            },
            'te': {
                'title': 'అపాయింట్‌మెంట్ రిమైండర్',
                'body': 'మీకు రేపు {time} గంటలకు డాక్టర్ {doctor_name} తో అపాయింట్‌మెంట్ ఉంది.',
            },
            'hi': {
                'title': 'अपॉइंटमेंट रिमाइंडर',
                'body': 'कल {time} बजे डॉ. {doctor_name} के साथ आपकी अपॉइंटमेंट है।',
            },
        },
        '1h': {
            'en': {
                'title': 'Appointment in 1 Hour',
                'body': 'Your appointment with Dr. {doctor_name} is in 1 hour at {time}.',
            },
            'te': {
                'title': '1 గంటలో అపాయింట్‌మెంట్',
                'body': 'డాక్టర్ {doctor_name} తో మీ అపాయింట్‌మెంట్ 1 గంటలో {time} గంటలకు ఉంది.',
            },
            'hi': {
                'title': '1 घंटे में अपॉइंटमेंट',
                'body': 'डॉ. {doctor_name} के साथ आपकी अपॉइंटमेंट 1 घंटे में {time} बजे है।',
            },
        },
        'custom': {
            'en': {
                'title': 'Appointment Reminder',
                'body': 'Reminder: You have an appointment with Dr. {doctor_name} on {date} at {time}.',
            },
            'te': {
                'title': 'అపాయింట్‌మెంట్ రిమైండర్',
                'body': 'రిమైండర్: మీకు {date} న {time} గంటలకు డాక్టర్ {doctor_name} తో అపాయింట్‌మెంట్ ఉంది.',
            },
            'hi': {
                'title': 'अपॉइंटमेंट रिमाइंडर',
                'body': 'रिमाइंडर: {date} को {time} बजे डॉ. {doctor_name} के साथ आपकी अपॉइंटमेंट है।',
            },
        },
    }
    
    @staticmethod
    @transaction.atomic
    def create_reminders_for_appointment(appointment: Appointment) -> List[AppointmentReminder]:
        """
        Create reminders for an appointment.
        
        Args:
            appointment: Appointment to create reminders for
            
        Returns:
            List of created AppointmentReminder objects
        """
        reminders = []
        
        appointment_datetime = timezone.make_aware(
            datetime.combine(appointment.appointment_date, appointment.start_time)
        )
        
        # 24 hour reminder
        reminder_24h_time = appointment_datetime - timedelta(hours=24)
        if reminder_24h_time > timezone.now():
            reminder_24h = AppointmentReminder.objects.create(
                appointment=appointment,
                reminder_type='24h',
                scheduled_time=reminder_24h_time,
                status='pending'
            )
            reminders.append(reminder_24h)
            logger.info(f"Created 24h reminder for appointment {appointment.id}")
        
        # 1 hour reminder
        reminder_1h_time = appointment_datetime - timedelta(hours=1)
        if reminder_1h_time > timezone.now():
            reminder_1h = AppointmentReminder.objects.create(
                appointment=appointment,
                reminder_type='1h',
                scheduled_time=reminder_1h_time,
                status='pending'
            )
            reminders.append(reminder_1h)
            logger.info(f"Created 1h reminder for appointment {appointment.id}")
        
        return reminders
    
    @staticmethod
    def get_pending_reminders(limit: int = 100) -> List[AppointmentReminder]:
        """
        Get pending reminders that are due to be sent.
        
        Args:
            limit: Maximum number of reminders to return
            
        Returns:
            List of AppointmentReminder objects
        """
        now = timezone.now()
        
        return list(AppointmentReminder.objects.filter(
            status='pending',
            scheduled_time__lte=now,
            appointment__status__in=['pending', 'confirmed']
        ).select_related(
            'appointment',
            'appointment__patient',
            'appointment__doctor'
        ).order_by('scheduled_time')[:limit])
    
    @staticmethod
    def get_reminder_content(
        reminder: AppointmentReminder,
        language: str = 'en'
    ) -> Dict[str, str]:
        """
        Get reminder content in specified language.
        
        Args:
            reminder: AppointmentReminder object
            language: Language code ('en', 'te', 'hi')
            
        Returns:
            Dict with 'title' and 'body'
        """
        if language not in ['en', 'te', 'hi']:
            language = 'en'
        
        templates = ReminderService.REMINDER_TEMPLATES.get(
            reminder.reminder_type,
            ReminderService.REMINDER_TEMPLATES['custom']
        )
        
        template = templates.get(language, templates['en'])
        
        appointment = reminder.appointment
        
        # Format time
        time_str = appointment.start_time.strftime('%I:%M %p')
        
        # Format date
        date_str = appointment.appointment_date.strftime('%d %B %Y')
        
        return {
            'title': template['title'],
            'body': template['body'].format(
                doctor_name=appointment.doctor.get_full_name(),
                time=time_str,
                date=date_str,
            ),
        }
    
    @staticmethod
    @transaction.atomic
    def send_reminder(reminder: AppointmentReminder) -> Tuple[bool, Optional[str]]:
        """
        Send a reminder notification.
        
        Args:
            reminder: AppointmentReminder to send
            
        Returns:
            Tuple of (success, error_message)
        """
        try:
            appointment = reminder.appointment
            patient = appointment.patient
            
            # Check if appointment is still valid
            if appointment.status not in ['pending', 'confirmed']:
                reminder.status = 'failed'
                reminder.error_message = f'Appointment status is {appointment.status}'
                reminder.save()
                return False, reminder.error_message
            
            # Get patient's preferred language
            language = getattr(patient, 'preferred_language', 'en') or 'en'
            
            # Get reminder content
            content = ReminderService.get_reminder_content(reminder, language)
            
            # Try to send notification via FCM
            notification_sent = ReminderService._send_fcm_notification(
                patient=patient,
                title=content['title'],
                body=content['body'],
                data={
                    'type': 'appointment_reminder',
                    'appointment_id': str(appointment.id),
                    'reminder_type': reminder.reminder_type,
                }
            )
            
            if notification_sent:
                reminder.status = 'sent'
                reminder.sent_at = timezone.now()
                reminder.save()
                
                # Update appointment reminder flags
                if reminder.reminder_type == '24h':
                    appointment.reminder_24h_sent = True
                elif reminder.reminder_type == '1h':
                    appointment.reminder_1h_sent = True
                appointment.save()
                
                logger.info(f"Sent {reminder.reminder_type} reminder for appointment {appointment.id}")
                
                return True, None
            else:
                reminder.status = 'failed'
                reminder.error_message = 'FCM notification failed'
                reminder.save()
                return False, 'FCM notification failed'
                
        except Exception as e:
            error_msg = str(e)
            reminder.status = 'failed'
            reminder.error_message = error_msg
            reminder.save()
            
            logger.error(f"Error sending reminder {reminder.id}: {error_msg}")
            
            return False, error_msg
    
    @staticmethod
    def _send_fcm_notification(
        patient,
        title: str,
        body: str,
        data: Dict = None
    ) -> bool:
        """
        Send FCM push notification to patient.
        
        Args:
            patient: Patient user instance
            title: Notification title
            body: Notification body
            data: Additional data payload
            
        Returns:
            True if sent successfully
        """
        try:
            # Import notification service from notifications app
            from apps.notifications.services.notification_service import NotificationService
            
            # Send notification
            success = NotificationService.send_push_notification(
                user=patient,
                title=title,
                body=body,
                data=data or {},
                notification_type='appointment_reminder'
            )
            
            return success
            
        except ImportError:
            logger.warning("Notifications app not available, skipping FCM")
            # If notifications app not available, still mark as sent
            # (notification would be shown in-app)
            return True
        except Exception as e:
            logger.error(f"FCM notification error: {e}")
            return False
    
    @staticmethod
    def process_pending_reminders(batch_size: int = 50) -> Dict:
        """
        Process all pending reminders that are due.
        
        Args:
            batch_size: Number of reminders to process at once
            
        Returns:
            Dict with processing statistics
        """
        stats = {
            'processed': 0,
            'sent': 0,
            'failed': 0,
            'errors': [],
        }
        
        pending_reminders = ReminderService.get_pending_reminders(limit=batch_size)
        
        for reminder in pending_reminders:
            stats['processed'] += 1
            
            success, error = ReminderService.send_reminder(reminder)
            
            if success:
                stats['sent'] += 1
            else:
                stats['failed'] += 1
                if error:
                    stats['errors'].append({
                        'reminder_id': str(reminder.id),
                        'error': error,
                    })
        
        logger.info(
            f"Processed {stats['processed']} reminders: "
            f"{stats['sent']} sent, {stats['failed']} failed"
        )
        
        return stats
    
    @staticmethod
    @transaction.atomic
    def cancel_reminders_for_appointment(appointment: Appointment) -> int:
        """
        Cancel all pending reminders for an appointment.
        
        Args:
            appointment: Appointment to cancel reminders for
            
        Returns:
            Number of reminders cancelled
        """
        count = AppointmentReminder.objects.filter(
            appointment=appointment,
            status='pending'
        ).update(
            status='failed',
            error_message='Appointment cancelled'
        )
        
        logger.info(f"Cancelled {count} reminders for appointment {appointment.id}")
        
        return count
    
    @staticmethod
    @transaction.atomic
    def reschedule_reminders(
        old_appointment: Appointment,
        new_appointment: Appointment
    ) -> List[AppointmentReminder]:
        """
        Cancel old reminders and create new ones for rescheduled appointment.
        
        Args:
            old_appointment: Original appointment
            new_appointment: New rescheduled appointment
            
        Returns:
            List of new AppointmentReminder objects
        """
        # Cancel old reminders
        ReminderService.cancel_reminders_for_appointment(old_appointment)
        
        # Create new reminders
        new_reminders = ReminderService.create_reminders_for_appointment(new_appointment)
        
        logger.info(
            f"Rescheduled reminders: cancelled for {old_appointment.id}, "
            f"created {len(new_reminders)} for {new_appointment.id}"
        )
        
        return new_reminders
    
    @staticmethod
    def get_upcoming_reminders(hours: int = 24) -> List[AppointmentReminder]:
        """
        Get reminders scheduled for the next N hours.
        
        Args:
            hours: Number of hours to look ahead
            
        Returns:
            List of AppointmentReminder objects
        """
        now = timezone.now()
        end_time = now + timedelta(hours=hours)
        
        return list(AppointmentReminder.objects.filter(
            status='pending',
            scheduled_time__gte=now,
            scheduled_time__lte=end_time
        ).select_related(
            'appointment',
            'appointment__patient',
            'appointment__doctor'
        ).order_by('scheduled_time'))
    
    @staticmethod
    def get_reminder_stats(date_from=None, date_to=None) -> Dict:
        """
        Get reminder statistics.
        
        Args:
            date_from: Start date for stats
            date_to: End date for stats
            
        Returns:
            Dict with reminder statistics
        """
        queryset = AppointmentReminder.objects.all()
        
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        
        from django.db.models import Count
        
        stats = queryset.values('status').annotate(count=Count('status'))
        
        result = {
            'total': 0,
            'pending': 0,
            'sent': 0,
            'failed': 0,
        }
        
        for item in stats:
            result[item['status']] = item['count']
            result['total'] += item['count']
        
        # Calculate success rate
        if result['sent'] + result['failed'] > 0:
            result['success_rate'] = round(
                (result['sent'] / (result['sent'] + result['failed'])) * 100,
                2
            )
        else:
            result['success_rate'] = 0
        
        return result
    
    @staticmethod
    @transaction.atomic
    def create_custom_reminder(
        appointment: Appointment,
        scheduled_time: datetime,
        message: str = None
    ) -> AppointmentReminder:
        """
        Create a custom reminder for an appointment.
        
        Args:
            appointment: Appointment to remind about
            scheduled_time: When to send reminder
            message: Custom message (optional)
            
        Returns:
            AppointmentReminder object
        """
        reminder = AppointmentReminder.objects.create(
            appointment=appointment,
            reminder_type='custom',
            scheduled_time=scheduled_time,
            status='pending'
        )
        
        logger.info(
            f"Created custom reminder for appointment {appointment.id} "
            f"scheduled at {scheduled_time}"
        )
        
        return reminder
    
    @staticmethod
    def cleanup_old_reminders(days_old: int = 30) -> int:
        """
        Delete old completed/failed reminders.
        
        Args:
            days_old: Delete reminders older than this many days
            
        Returns:
            Number of reminders deleted
        """
        cutoff_date = timezone.now() - timedelta(days=days_old)
        
        deleted_count, _ = AppointmentReminder.objects.filter(
            status__in=['sent', 'failed'],
            created_at__lt=cutoff_date
        ).delete()
        
        logger.info(f"Cleaned up {deleted_count} old reminders")
        
        return deleted_count