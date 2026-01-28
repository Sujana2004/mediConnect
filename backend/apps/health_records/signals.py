"""
Health Records Signals
======================
Signal handlers for health records events.
"""

import logging
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from .models import (
    HealthProfile,
    MedicalCondition,
    Allergy,
    VitalSign,
    VaccinationRecord,
    SharedRecord,
)

User = get_user_model()
logger = logging.getLogger(__name__)


# =============================================================================
# USER SIGNALS
# =============================================================================

@receiver(post_save, sender=User)
def create_health_profile_for_patient(sender, instance, created, **kwargs):
    """
    Create health profile when a new patient is registered.
    """
    if created and instance.role == 'patient':
        HealthProfile.objects.get_or_create(user=instance)
        logger.info(f"Created health profile for new patient: {instance.phone}")


# =============================================================================
# MEDICAL CONDITION SIGNALS
# =============================================================================

@receiver(post_save, sender=MedicalCondition)
def sync_chronic_conditions_on_save(sender, instance, created, **kwargs):
    """
    Sync chronic conditions to health profile when condition is saved.
    """
    if instance.is_chronic:
        try:
            profile = HealthProfile.objects.get(user=instance.user)
            conditions = MedicalCondition.objects.filter(
                user=instance.user,
                is_chronic=True,
                status__in=['active', 'managed']
            ).values_list('condition_name', flat=True)
            
            profile.chronic_conditions = list(conditions)
            profile.save(update_fields=['chronic_conditions', 'updated_at'])
            logger.debug(f"Synced chronic conditions for {instance.user.phone}")
        except HealthProfile.DoesNotExist:
            pass


@receiver(post_delete, sender=MedicalCondition)
def sync_chronic_conditions_on_delete(sender, instance, **kwargs):
    """
    Sync chronic conditions to health profile when condition is deleted.
    """
    if instance.is_chronic:
        try:
            profile = HealthProfile.objects.get(user=instance.user)
            conditions = MedicalCondition.objects.filter(
                user=instance.user,
                is_chronic=True,
                status__in=['active', 'managed']
            ).values_list('condition_name', flat=True)
            
            profile.chronic_conditions = list(conditions)
            profile.save(update_fields=['chronic_conditions', 'updated_at'])
            logger.debug(f"Synced chronic conditions after delete for {instance.user.phone}")
        except HealthProfile.DoesNotExist:
            pass


# =============================================================================
# ALLERGY SIGNALS
# =============================================================================

@receiver(post_save, sender=Allergy)
def sync_allergies_on_save(sender, instance, created, **kwargs):
    """
    Sync allergies to health profile when allergy is saved.
    """
    try:
        profile = HealthProfile.objects.get(user=instance.user)
        allergies = Allergy.objects.filter(
            user=instance.user,
            status='active'
        ).values_list('allergen', flat=True)
        
        profile.allergies = list(allergies)
        profile.save(update_fields=['allergies', 'updated_at'])
        logger.debug(f"Synced allergies for {instance.user.phone}")
    except HealthProfile.DoesNotExist:
        pass


@receiver(post_delete, sender=Allergy)
def sync_allergies_on_delete(sender, instance, **kwargs):
    """
    Sync allergies to health profile when allergy is deleted.
    """
    try:
        profile = HealthProfile.objects.get(user=instance.user)
        allergies = Allergy.objects.filter(
            user=instance.user,
            status='active'
        ).values_list('allergen', flat=True)
        
        profile.allergies = list(allergies)
        profile.save(update_fields=['allergies', 'updated_at'])
        logger.debug(f"Synced allergies after delete for {instance.user.phone}")
    except HealthProfile.DoesNotExist:
        pass


# =============================================================================
# VITAL SIGNS SIGNALS
# =============================================================================

@receiver(post_save, sender=VitalSign)
def update_weight_in_profile(sender, instance, created, **kwargs):
    """
    Update weight in health profile when vital with weight is recorded.
    """
    if instance.weight_kg:
        try:
            profile = HealthProfile.objects.get(user=instance.user)
            # Only update if this is the latest vital with weight
            latest_with_weight = VitalSign.objects.filter(
                user=instance.user,
                weight_kg__isnull=False
            ).order_by('-recorded_at').first()
            
            if latest_with_weight and latest_with_weight.id == instance.id:
                profile.weight_kg = instance.weight_kg
                profile.save(update_fields=['weight_kg', 'updated_at'])
                logger.debug(f"Updated weight in profile for {instance.user.phone}")
        except HealthProfile.DoesNotExist:
            pass


@receiver(post_save, sender=VitalSign)
def check_critical_vitals(sender, instance, created, **kwargs):
    """
    Check for critical vital signs and potentially notify.
    """
    if not created:
        return
    
    from .services import MedicalRecordsService
    
    alerts = MedicalRecordsService.check_vital_alerts(instance)
    
    critical_alerts = [a for a in alerts if a['type'] == 'critical']
    
    if critical_alerts:
        logger.warning(
            f"Critical vital signs recorded for {instance.user.phone}: "
            f"{[a['message'] for a in critical_alerts]}"
        )
        
        # TODO: Send notification to user/emergency contacts
        # This would integrate with the notifications app
        try:
            from apps.notifications.services import NotificationService
            
            for alert in critical_alerts:
                NotificationService.send_notification(
                    user=instance.user,
                    notification_type='health_alert',
                    title='Critical Health Alert',
                    message=alert['message'],
                    data={'vital_id': str(instance.id)}
                )
        except ImportError:
            # Notifications app not available
            pass
        except Exception as e:
            logger.error(f"Failed to send vital alert notification: {e}")


# =============================================================================
# VACCINATION SIGNALS
# =============================================================================

@receiver(post_save, sender=VaccinationRecord)
def notify_vaccination_due(sender, instance, created, **kwargs):
    """
    Schedule notification for next vaccination dose if applicable.
    """
    if instance.next_due_date and not instance.is_complete:
        logger.debug(
            f"Vaccination {instance.vaccine_name} dose {instance.dose_number + 1} "
            f"due on {instance.next_due_date} for {instance.user.phone}"
        )
        
        # TODO: Schedule reminder notification
        # This would integrate with the notifications app


# =============================================================================
# SHARED RECORD SIGNALS
# =============================================================================

@receiver(post_save, sender=SharedRecord)
def notify_doctor_on_share(sender, instance, created, **kwargs):
    """
    Notify doctor when patient shares records with them.
    """
    if created and instance.is_active:
        logger.info(
            f"Patient {instance.patient.phone} shared records "
            f"with Dr. {instance.doctor.first_name} {instance.doctor.last_name}"
        )
        
        # TODO: Send notification to doctor
        try:
            from apps.notifications.services import NotificationService
            
            patient_name = f"{instance.patient.first_name} {instance.patient.last_name}".strip()
            if not patient_name:
                patient_name = instance.patient.phone
            
            NotificationService.send_notification(
                user=instance.doctor,
                notification_type='record_shared',
                title='Health Records Shared',
                message=f"{patient_name} has shared their health records with you.",
                data={
                    'share_id': str(instance.id),
                    'patient_id': str(instance.patient.id),
                    'share_type': instance.share_type,
                }
            )
        except ImportError:
            pass
        except Exception as e:
            logger.error(f"Failed to send share notification: {e}")


@receiver(pre_save, sender=SharedRecord)
def notify_on_share_revoke(sender, instance, **kwargs):
    """
    Notify doctor when patient revokes sharing.
    """
    if instance.pk:
        try:
            old_instance = SharedRecord.objects.get(pk=instance.pk)
            
            # Check if share is being revoked
            if old_instance.is_active and not instance.is_active:
                logger.info(
                    f"Patient {instance.patient.phone} revoked share "
                    f"with Dr. {instance.doctor.first_name} {instance.doctor.last_name}"
                )
                
                # TODO: Optionally notify doctor about revocation
        except SharedRecord.DoesNotExist:
            pass


# =============================================================================
# CONSULTATION INTEGRATION SIGNALS
# =============================================================================

def share_records_for_consultation(consultation):
    """
    Automatically share records with doctor for a consultation.
    Called from consultation app.
    
    Args:
        consultation: Consultation instance
    """
    from .services import SharingService
    
    try:
        SharingService.share_for_consultation(
            patient=consultation.patient,
            doctor=consultation.doctor,
            consultation=consultation
        )
        logger.info(
            f"Auto-shared records for consultation {consultation.id} "
            f"from {consultation.patient.phone} to Dr. {consultation.doctor.first_name}"
        )
    except Exception as e:
        logger.error(f"Failed to auto-share records for consultation: {e}")


def record_vitals_from_consultation(consultation, vitals_data):
    """
    Record vital signs from a consultation.
    Called from consultation app.
    
    Args:
        consultation: Consultation instance
        vitals_data: Dictionary of vital sign data
    """
    from .services import MedicalRecordsService
    
    try:
        vital = MedicalRecordsService.record_vitals(
            user=consultation.patient,
            source='consultation',
            recorded_by=consultation.doctor,
            consultation=consultation,
            **vitals_data
        )
        logger.info(f"Recorded vitals from consultation {consultation.id}")
        return vital
    except Exception as e:
        logger.error(f"Failed to record vitals from consultation: {e}")
        return None


def create_condition_from_diagnosis(user, diagnosis_session):
    """
    Create medical condition from diagnosis session.
    Called from diagnosis app.
    
    Args:
        user: User instance
        diagnosis_session: DiagnosisSession instance
    """
    from .services import MedicalRecordsService
    from django.utils import timezone
    
    try:
        # Get primary diagnosis from session
        if hasattr(diagnosis_session, 'predicted_disease'):
            condition = MedicalRecordsService.create_condition(
                user=user,
                condition_name=diagnosis_session.predicted_disease,
                status='active',
                severity=getattr(diagnosis_session, 'severity', 'moderate'),
                diagnosed_date=timezone.now().date(),
                diagnosis_session=diagnosis_session,
            )
            logger.info(
                f"Created condition '{condition.condition_name}' "
                f"from diagnosis session for {user.phone}"
            )
            return condition
    except Exception as e:
        logger.error(f"Failed to create condition from diagnosis: {e}")
        return None