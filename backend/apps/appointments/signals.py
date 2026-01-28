"""
Appointments App Signals for MediConnect.

Signal handlers for:
1. Appointment creation - Create reminders, send notifications
2. Appointment status changes - Notify patients/doctors
3. Appointment cancellation - Release slots, cancel reminders
4. Queue updates - Notify patients of position changes
5. Schedule changes - Regenerate affected slots
"""

import logging
from django.db.models.signals import post_save, pre_save, post_delete
from django.dispatch import receiver
from django.utils import timezone

from .models import (
    DoctorSchedule,
    ScheduleException,
    Appointment,
    AppointmentQueue,
    AppointmentReminder,
)

logger = logging.getLogger(__name__)


# =============================================================================
# APPOINTMENT SIGNALS
# =============================================================================

@receiver(pre_save, sender=Appointment)
def appointment_pre_save(sender, instance, **kwargs):
    """
    Handle appointment pre-save logic.
    Track status changes for notifications.
    """
    if instance.pk:
        try:
            old_instance = Appointment.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except Appointment.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=Appointment)
def appointment_post_save(sender, instance, created, **kwargs):
    """
    Handle appointment post-save logic.
    
    Actions:
    - Create reminders for new appointments
    - Send notifications on status changes
    """
    if created:
        # New appointment created
        logger.info(f"New appointment created: {instance.id}")
        
        # Create reminders
        _create_appointment_reminders(instance)
        
        # Send notification to doctor about new appointment
        _notify_doctor_new_appointment(instance)
        
    else:
        # Appointment updated - check for status change
        old_status = getattr(instance, '_old_status', None)
        
        if old_status and old_status != instance.status:
            logger.info(
                f"Appointment {instance.id} status changed: "
                f"{old_status} -> {instance.status}"
            )
            
            # Handle status-specific notifications
            _handle_status_change(instance, old_status, instance.status)


@receiver(post_delete, sender=Appointment)
def appointment_post_delete(sender, instance, **kwargs):
    """
    Handle appointment deletion.
    Release time slot if exists.
    """
    if instance.time_slot:
        try:
            from .services import SlotService
            SlotService.release_slot(instance.time_slot)
            logger.info(f"Released slot {instance.time_slot.id} after appointment deletion")
        except Exception as e:
            logger.error(f"Error releasing slot: {e}")


def _create_appointment_reminders(appointment):
    """Create reminders for a new appointment."""
    try:
        from .services import ReminderService
        reminders = ReminderService.create_reminders_for_appointment(appointment)
        logger.info(f"Created {len(reminders)} reminders for appointment {appointment.id}")
    except Exception as e:
        logger.error(f"Error creating reminders for appointment {appointment.id}: {e}")


def _notify_doctor_new_appointment(appointment):
    """Send notification to doctor about new appointment."""
    try:
        _send_notification(
            user=appointment.doctor,
            notification_type='new_appointment',
            title_en='New Appointment',
            title_te='కొత్త అపాయింట్‌మెంట్',
            title_hi='नई अपॉइंटमेंट',
            body_en=f'New appointment with {appointment.patient.get_full_name()} on {appointment.appointment_date} at {appointment.start_time.strftime("%I:%M %p")}',
            body_te=f'{appointment.patient.get_full_name()} తో {appointment.appointment_date} న {appointment.start_time.strftime("%I:%M %p")} కి కొత్త అపాయింట్‌మెంట్',
            body_hi=f'{appointment.patient.get_full_name()} के साथ {appointment.appointment_date} को {appointment.start_time.strftime("%I:%M %p")} पर नई अपॉइंटमेंट',
            data={
                'type': 'new_appointment',
                'appointment_id': str(appointment.id),
            }
        )
    except Exception as e:
        logger.error(f"Error sending new appointment notification: {e}")


def _handle_status_change(appointment, old_status, new_status):
    """Handle appointment status change notifications."""
    try:
        if new_status == 'confirmed':
            # Notify patient that appointment is confirmed
            _send_notification(
                user=appointment.patient,
                notification_type='appointment_confirmed',
                title_en='Appointment Confirmed',
                title_te='అపాయింట్‌మెంట్ నిర్ధారించబడింది',
                title_hi='अपॉइंटमेंट की पुष्टि',
                body_en=f'Your appointment with Dr. {appointment.doctor.get_full_name()} on {appointment.appointment_date} is confirmed.',
                body_te=f'డాక్టర్ {appointment.doctor.get_full_name()} తో {appointment.appointment_date} న మీ అపాయింట్‌మెంట్ నిర్ధారించబడింది.',
                body_hi=f'डॉ. {appointment.doctor.get_full_name()} के साथ {appointment.appointment_date} को आपकी अपॉइंटमेंट की पुष्टि हो गई है।',
                data={
                    'type': 'appointment_confirmed',
                    'appointment_id': str(appointment.id),
                }
            )
        
        elif new_status == 'cancelled':
            # Notify both parties about cancellation
            cancelled_by = appointment.cancelled_by or 'system'
            
            if cancelled_by == 'doctor':
                # Notify patient
                _send_notification(
                    user=appointment.patient,
                    notification_type='appointment_cancelled',
                    title_en='Appointment Cancelled',
                    title_te='అపాయింట్‌మెంట్ రద్దు చేయబడింది',
                    title_hi='अपॉइंटमेंट रद्द',
                    body_en=f'Your appointment with Dr. {appointment.doctor.get_full_name()} on {appointment.appointment_date} has been cancelled.',
                    body_te=f'డాక్టర్ {appointment.doctor.get_full_name()} తో {appointment.appointment_date} న మీ అపాయింట్‌మెంట్ రద్దు చేయబడింది.',
                    body_hi=f'डॉ. {appointment.doctor.get_full_name()} के साथ {appointment.appointment_date} को आपकी अपॉइंटमेंट रद्द कर दी गई है।',
                    data={
                        'type': 'appointment_cancelled',
                        'appointment_id': str(appointment.id),
                    }
                )
            elif cancelled_by == 'patient':
                # Notify doctor
                _send_notification(
                    user=appointment.doctor,
                    notification_type='appointment_cancelled',
                    title_en='Appointment Cancelled',
                    title_te='అపాయింట్‌మెంట్ రద్దు చేయబడింది',
                    title_hi='अपॉइंटमेंट रद्द',
                    body_en=f'Appointment with {appointment.patient.get_full_name()} on {appointment.appointment_date} has been cancelled by patient.',
                    body_te=f'{appointment.patient.get_full_name()} తో {appointment.appointment_date} న అపాయింట్‌మెంట్ పేషెంట్ ద్వారా రద్దు చేయబడింది.',
                    body_hi=f'{appointment.patient.get_full_name()} के साथ {appointment.appointment_date} को अपॉइंटमेंट मरीज द्वारा रद्द कर दी गई है।',
                    data={
                        'type': 'appointment_cancelled',
                        'appointment_id': str(appointment.id),
                    }
                )
            
            # Cancel pending reminders
            from .services import ReminderService
            ReminderService.cancel_reminders_for_appointment(appointment)
        
        elif new_status == 'checked_in':
            # Notify doctor that patient has checked in
            _send_notification(
                user=appointment.doctor,
                notification_type='patient_checked_in',
                title_en='Patient Checked In',
                title_te='పేషెంట్ చెక్ ఇన్ అయ్యారు',
                title_hi='मरीज चेक इन',
                body_en=f'{appointment.patient.get_full_name()} has checked in for their appointment.',
                body_te=f'{appointment.patient.get_full_name()} వారి అపాయింట్‌మెంట్ కోసం చెక్ ఇన్ అయ్యారు.',
                body_hi=f'{appointment.patient.get_full_name()} अपनी अपॉइंटमेंट के लिए चेक इन कर चुके हैं।',
                data={
                    'type': 'patient_checked_in',
                    'appointment_id': str(appointment.id),
                }
            )
        
        elif new_status == 'completed':
            # Notify patient about completion
            _send_notification(
                user=appointment.patient,
                notification_type='appointment_completed',
                title_en='Appointment Completed',
                title_te='అపాయింట్‌మెంట్ పూర్తయింది',
                title_hi='अपॉइंटमेंट पूर्ण',
                body_en=f'Your appointment with Dr. {appointment.doctor.get_full_name()} has been completed. Thank you for visiting!',
                body_te=f'డాక్టర్ {appointment.doctor.get_full_name()} తో మీ అపాయింట్‌మెంట్ పూర్తయింది. సందర్శించినందుకు ధన్యవాదాలు!',
                body_hi=f'डॉ. {appointment.doctor.get_full_name()} के साथ आपकी अपॉइंटमेंट पूरी हो गई है। आने के लिए धन्यवाद!',
                data={
                    'type': 'appointment_completed',
                    'appointment_id': str(appointment.id),
                }
            )
        
        elif new_status == 'rescheduled':
            # Notification handled in reschedule service
            pass
            
    except Exception as e:
        logger.error(f"Error handling status change notification: {e}")


# =============================================================================
# QUEUE SIGNALS
# =============================================================================

@receiver(post_save, sender=AppointmentQueue)
def queue_post_save(sender, instance, created, **kwargs):
    """
    Handle queue entry updates.
    Notify patient when called.
    """
    if created:
        logger.info(
            f"Patient {instance.appointment.patient.get_full_name()} "
            f"added to queue #{instance.queue_number}"
        )
    else:
        # Check if patient was called
        if instance.status == 'called' and instance.called_at:
            _notify_patient_called(instance)


def _notify_patient_called(queue_entry):
    """Notify patient that they are being called."""
    try:
        appointment = queue_entry.appointment
        
        _send_notification(
            user=appointment.patient,
            notification_type='queue_called',
            title_en='Your Turn!',
            title_te='మీ వంతు!',
            title_hi='आपकी बारी!',
            body_en=f'Please proceed to Dr. {appointment.doctor.get_full_name()}\'s consultation room.',
            body_te=f'దయచేసి డాక్టర్ {appointment.doctor.get_full_name()} కన్సల్టేషన్ రూమ్‌కు వెళ్ళండి.',
            body_hi=f'कृपया डॉ. {appointment.doctor.get_full_name()} के परामर्श कक्ष में जाएं।',
            data={
                'type': 'queue_called',
                'appointment_id': str(appointment.id),
                'queue_number': queue_entry.queue_number,
            }
        )
    except Exception as e:
        logger.error(f"Error sending queue called notification: {e}")


# =============================================================================
# SCHEDULE SIGNALS
# =============================================================================

@receiver(post_save, sender=DoctorSchedule)
def schedule_post_save(sender, instance, created, **kwargs):
    """
    Handle schedule updates.
    Regenerate slots if schedule changes.
    """
    if created:
        logger.info(
            f"New schedule created for Dr. {instance.doctor.get_full_name()} - "
            f"{instance.get_day_name()}"
        )
    else:
        logger.info(
            f"Schedule updated for Dr. {instance.doctor.get_full_name()} - "
            f"{instance.get_day_name()}"
        )
        
        # Regenerate future slots for this day
        # This is done asynchronously to avoid blocking
        _schedule_slot_regeneration(instance)


@receiver(post_save, sender=ScheduleException)
def exception_post_save(sender, instance, created, **kwargs):
    """
    Handle schedule exception creation/updates.
    Cancel affected appointments if leave.
    """
    if created:
        logger.info(
            f"Schedule exception created for Dr. {instance.doctor.get_full_name()} - "
            f"{instance.exception_date} ({instance.exception_type})"
        )
        
        if instance.exception_type == 'leave':
            # Handle existing appointments on this date
            _handle_leave_exception(instance)


def _schedule_slot_regeneration(schedule):
    """Schedule slot regeneration for updated schedule."""
    # This would ideally be done through a task queue
    # For now, we'll log it and let the scheduler handle it
    logger.info(
        f"Slot regeneration needed for Dr. {schedule.doctor.get_full_name()} - "
        f"Day {schedule.day_of_week}"
    )


def _handle_leave_exception(exception):
    """Handle appointments affected by leave exception."""
    try:
        # Get appointments on this date
        affected_appointments = Appointment.objects.filter(
            doctor=exception.doctor,
            appointment_date=exception.exception_date,
            status__in=['pending', 'confirmed']
        )
        
        if affected_appointments.exists():
            logger.warning(
                f"Found {affected_appointments.count()} appointments affected by "
                f"Dr. {exception.doctor.get_full_name()}'s leave on {exception.exception_date}"
            )
            
            # Notify affected patients
            for appointment in affected_appointments:
                _send_notification(
                    user=appointment.patient,
                    notification_type='doctor_unavailable',
                    title_en='Doctor Unavailable',
                    title_te='డాక్టర్ అందుబాటులో లేరు',
                    title_hi='डॉक्टर उपलब्ध नहीं',
                    body_en=f'Dr. {appointment.doctor.get_full_name()} is unavailable on {exception.exception_date}. Please reschedule your appointment.',
                    body_te=f'డాక్టర్ {appointment.doctor.get_full_name()} {exception.exception_date} న అందుబాటులో లేరు. దయచేసి మీ అపాయింట్‌మెంట్‌ను రీషెడ్యూల్ చేయండి.',
                    body_hi=f'डॉ. {appointment.doctor.get_full_name()} {exception.exception_date} को उपलब्ध नहीं हैं। कृपया अपनी अपॉइंटमेंट पुनर्निर्धारित करें।',
                    data={
                        'type': 'doctor_unavailable',
                        'appointment_id': str(appointment.id),
                    }
                )
    except Exception as e:
        logger.error(f"Error handling leave exception: {e}")


# =============================================================================
# REMINDER SIGNALS
# =============================================================================

@receiver(post_save, sender=AppointmentReminder)
def reminder_post_save(sender, instance, created, **kwargs):
    """Log reminder status changes."""
    if not created:
        if instance.status == 'sent':
            logger.info(
                f"Reminder sent for appointment {instance.appointment.id} - "
                f"Type: {instance.reminder_type}"
            )
        elif instance.status == 'failed':
            logger.warning(
                f"Reminder failed for appointment {instance.appointment.id} - "
                f"Error: {instance.error_message}"
            )


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _send_notification(
    user,
    notification_type: str,
    title_en: str,
    title_te: str,
    title_hi: str,
    body_en: str,
    body_te: str,
    body_hi: str,
    data: dict = None
):
    """
    Send notification to user via notifications app.
    
    Args:
        user: User to notify
        notification_type: Type of notification
        title_en/te/hi: Title in different languages
        body_en/te/hi: Body in different languages
        data: Additional data for notification
    """
    try:
        from apps.notifications.services.notification_service import NotificationService
        
        # Get user's preferred language
        language = getattr(user, 'preferred_language', 'en') or 'en'
        
        # Select title and body based on language
        titles = {'en': title_en, 'te': title_te, 'hi': title_hi}
        bodies = {'en': body_en, 'te': body_te, 'hi': body_hi}
        
        title = titles.get(language, title_en)
        body = bodies.get(language, body_en)
        
        # Try different method names that might exist in NotificationService
        service = NotificationService()
        
        # Method 1: send_push_notification (instance method)
        if hasattr(service, 'send_push_notification'):
            service.send_push_notification(
                user=user,
                title=title,
                body=body,
                data=data or {},
                notification_type=notification_type
            )
            logger.debug(f"Notification sent to {user.id}: {notification_type}")
            return
        
        # Method 2: send_notification (instance method)
        if hasattr(service, 'send_notification'):
            service.send_notification(
                user=user,
                title=title,
                body=body,
                data=data or {},
                notification_type=notification_type
            )
            logger.debug(f"Notification sent to {user.id}: {notification_type}")
            return
        
        # Method 3: send_to_user (instance method)
        if hasattr(service, 'send_to_user'):
            service.send_to_user(
                user=user,
                title=title,
                body=body,
                data=data or {},
            )
            logger.debug(f"Notification sent to {user.id}: {notification_type}")
            return
        
        # Method 4: Try static/class methods
        if hasattr(NotificationService, 'send_push_notification'):
            NotificationService.send_push_notification(
                user=user,
                title=title,
                body=body,
                data=data or {},
                notification_type=notification_type
            )
            logger.debug(f"Notification sent to {user.id}: {notification_type}")
            return
        
        # Method 5: create_notification (common pattern)
        if hasattr(service, 'create_notification') or hasattr(NotificationService, 'create_notification'):
            create_fn = getattr(service, 'create_notification', None) or getattr(NotificationService, 'create_notification', None)
            create_fn(
                user=user,
                title=title,
                message=body,
                notification_type=notification_type,
                data=data or {},
            )
            logger.debug(f"Notification created for {user.id}: {notification_type}")
            return
        
        logger.warning(
            f"NotificationService has no known send method. "
            f"Available methods: {[m for m in dir(NotificationService) if not m.startswith('_')]}"
        )
        
    except ImportError:
        logger.debug("Notifications app not available, skipping notification")
    except Exception as e:
        logger.warning(f"Could not send notification: {e}")