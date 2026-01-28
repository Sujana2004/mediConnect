"""
Medicine App Signals.

Handles:
- Auto-expire prescriptions
- Auto-mark missed reminders
- Logging important events
- Cleanup on deletion
"""

import logging
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.conf import settings
from django.utils import timezone

from .models import (
    UserPrescription,
    PrescriptionMedicine,
    MedicineReminder,
    ReminderLog,
)

logger = logging.getLogger(__name__)


# =============================================================================
# PRESCRIPTION SIGNALS
# =============================================================================

@receiver(post_save, sender=UserPrescription)
def prescription_post_save(sender, instance, created, **kwargs):
    """
    Post-save signal for prescriptions.
    Log prescription creation.
    """
    if created:
        logger.info(
            f"Prescription created: {instance.id} - '{instance.title}' "
            f"for user {instance.user.phone_number}"
        )


@receiver(pre_save, sender=UserPrescription)
def prescription_pre_save(sender, instance, **kwargs):
    """
    Pre-save signal for prescriptions.
    Auto-expire if past valid_until date.
    """
    if instance.pk:
        # Check if should be expired
        if (instance.status == 'active' and 
            instance.valid_until and 
            instance.valid_until < timezone.now().date()):
            instance.status = 'expired'
            logger.info(f"Prescription auto-expired: {instance.id}")


# =============================================================================
# PRESCRIPTION MEDICINE SIGNALS
# =============================================================================

@receiver(post_save, sender=PrescriptionMedicine)
def prescription_medicine_post_save(sender, instance, created, **kwargs):
    """
    Post-save signal for prescription medicines.
    Log medicine additions.
    """
    if created:
        logger.info(
            f"Medicine added to prescription: {instance.medicine_name} "
            f"in prescription {instance.prescription.id}"
        )


@receiver(post_delete, sender=PrescriptionMedicine)
def prescription_medicine_post_delete(sender, instance, **kwargs):
    """
    Post-delete signal for prescription medicines.
    Clean up related reminders.
    """
    # Deactivate related reminders
    MedicineReminder.objects.filter(
        prescription_medicine=instance
    ).update(status='cancelled')
    
    logger.info(
        f"Medicine removed from prescription: {instance.medicine_name} "
        f"from prescription {instance.prescription.id}"
    )


# =============================================================================
# REMINDER SIGNALS
# =============================================================================

@receiver(post_save, sender=MedicineReminder)
def reminder_post_save(sender, instance, created, **kwargs):
    """
    Post-save signal for reminders.
    Generate initial reminder logs.
    """
    if created:
        logger.info(
            f"Reminder created: {instance.id} - '{instance.medicine_name}' "
            f"for user {instance.user.phone_number}"
        )
        
        # Generate logs for today if applicable
        from .services.reminder_service import ReminderService
        service = ReminderService()
        service._generate_logs_for_date(instance, timezone.now().date())


@receiver(pre_save, sender=MedicineReminder)
def reminder_pre_save(sender, instance, **kwargs):
    """
    Pre-save signal for reminders.
    Track status changes.
    """
    if instance.pk:
        try:
            old_instance = MedicineReminder.objects.get(pk=instance.pk)
            if old_instance.status != instance.status:
                logger.info(
                    f"Reminder status changed: {instance.id} "
                    f"{old_instance.status} -> {instance.status}"
                )
        except MedicineReminder.DoesNotExist:
            pass


# =============================================================================
# REMINDER LOG SIGNALS
# =============================================================================

@receiver(pre_save, sender=ReminderLog)
def reminder_log_pre_save(sender, instance, **kwargs):
    """
    Pre-save signal for reminder logs.
    Track response changes.
    """
    if instance.pk:
        try:
            old_instance = ReminderLog.objects.get(pk=instance.pk)
            if old_instance.response != instance.response:
                logger.debug(
                    f"Reminder log response changed: {instance.id} "
                    f"{old_instance.response} -> {instance.response}"
                )
        except ReminderLog.DoesNotExist:
            pass


@receiver(post_save, sender=ReminderLog)
def reminder_log_post_save(sender, instance, created, **kwargs):
    """
    Post-save signal for reminder logs.
    Track adherence and send notifications.
    """
    if not created and instance.response == 'taken':
        # Could trigger adherence update or streak calculation
        pass


# =============================================================================
# USER DELETION CLEANUP
# =============================================================================

@receiver(post_delete, sender=settings.AUTH_USER_MODEL)
def cleanup_user_medicine_data(sender, instance, **kwargs):
    """
    Cleanup medicine data when user is deleted.
    Note: This is handled by CASCADE, but log for monitoring.
    """
    logger.info(
        f"User deleted: {instance.phone_number}. "
        f"Associated medicine data will be cleaned up."
    )