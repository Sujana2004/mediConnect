"""
Emergency App Signals.

Handles:
- Post-save actions for SOS alerts
- Cleanup on user deletion
- Location cache updates
"""

import logging
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.conf import settings

from .models import (
    EmergencyContact,
    SOSAlert,
    UserLocationCache,
)

logger = logging.getLogger(__name__)


# =============================================================================
# SOS ALERT SIGNALS
# =============================================================================

@receiver(pre_save, sender=SOSAlert)
def sos_alert_pre_save(sender, instance, **kwargs):
    """
    Pre-save signal for SOS alerts.
    Track status changes.
    """
    if instance.pk:
        try:
            old_instance = SOSAlert.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except SOSAlert.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=SOSAlert)
def sos_alert_post_save(sender, instance, created, **kwargs):
    """
    Post-save signal for SOS alerts.
    Log SOS events for monitoring.
    """
    if created:
        logger.info(
            f"SOS ALERT CREATED: ID={instance.id}, "
            f"User={instance.user.phone_number}, "
            f"Type={instance.emergency_type}, "
            f"Location={instance.location_address or 'Unknown'}"
        )
    else:
        old_status = getattr(instance, '_old_status', None)
        if old_status and old_status != instance.status:
            logger.info(
                f"SOS ALERT STATUS CHANGED: ID={instance.id}, "
                f"User={instance.user.phone_number}, "
                f"Status={old_status} -> {instance.status}"
            )


# =============================================================================
# EMERGENCY CONTACT SIGNALS
# =============================================================================

@receiver(post_save, sender=EmergencyContact)
def emergency_contact_post_save(sender, instance, created, **kwargs):
    """
    Post-save signal for emergency contacts.
    Log new contact additions.
    """
    if created:
        logger.info(
            f"Emergency contact added: {instance.name} "
            f"for user {instance.user.phone_number}"
        )


@receiver(post_delete, sender=EmergencyContact)
def emergency_contact_post_delete(sender, instance, **kwargs):
    """
    Post-delete signal for emergency contacts.
    Log contact deletions.
    """
    logger.info(
        f"Emergency contact deleted: {instance.name} "
        f"for user {instance.user.phone_number}"
    )


# =============================================================================
# USER LOCATION CACHE SIGNALS
# =============================================================================

@receiver(post_save, sender=UserLocationCache)
def location_cache_post_save(sender, instance, created, **kwargs):
    """
    Post-save signal for location cache.
    Log significant location updates.
    """
    if created:
        logger.debug(
            f"Location cache created for user {instance.user.phone_number}"
        )


# =============================================================================
# USER DELETION CLEANUP
# =============================================================================

@receiver(post_delete, sender=settings.AUTH_USER_MODEL)
def cleanup_user_emergency_data(sender, instance, **kwargs):
    """
    Cleanup emergency data when user is deleted.
    Note: This is handled by CASCADE, but log for monitoring.
    """
    logger.info(
        f"User deleted: {instance.phone_number}. "
        f"Associated emergency data will be cleaned up."
    )