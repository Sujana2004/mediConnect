"""
Consultation App Signals
========================
Django signals for consultation events.
"""

import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.consultation.models import (
    Consultation,
    ConsultationRoom,
    ConsultationFeedback,
)

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Consultation)
def consultation_pre_save(sender, instance, **kwargs):
    """
    Handle pre-save logic for consultations.
    """
    # Check if this is an update
    if instance.pk:
        try:
            old_instance = Consultation.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except Consultation.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=Consultation)
def consultation_post_save(sender, instance, created, **kwargs):
    """
    Handle post-save logic for consultations.
    """
    if created:
        logger.info(f"New consultation created: {instance.id}")
        return
    
    # Check for status change
    old_status = getattr(instance, '_old_status', None)
    new_status = instance.status
    
    if old_status and old_status != new_status:
        logger.info(
            f"Consultation {instance.id} status changed: {old_status} -> {new_status}"
        )
        
        # Handle status transitions
        if new_status == 'completed':
            _handle_consultation_completed(instance)
        elif new_status == 'cancelled':
            _handle_consultation_cancelled(instance)
        elif new_status == 'no_show':
            _handle_consultation_no_show(instance)


def _handle_consultation_completed(consultation):
    """
    Handle consultation completion.
    """
    logger.info(f"Consultation {consultation.id} completed")
    
    # Create medicine reminders from prescriptions if medicine app available
    try:
        from apps.medicine.models import UserPrescription, PrescriptionMedicine
        from apps.medicine.services.reminder_service import ReminderService
        
        prescriptions = consultation.prescriptions.filter(is_active=True)
        
        if prescriptions.exists():
            # Create a UserPrescription
            user_prescription = UserPrescription.objects.create(
                user=consultation.patient,
                doctor_name=f"Dr. {consultation.doctor.first_name} {consultation.doctor.last_name}",
                diagnosis=consultation.diagnosis or consultation.reason,
                notes=f"From consultation on {consultation.scheduled_start.strftime('%d %b %Y')}"
            )
            
            # Add medicines
            for rx in prescriptions:
                PrescriptionMedicine.objects.create(
                    prescription=user_prescription,
                    medicine=rx.medicine,
                    medicine_name=rx.medicine_name,
                    dosage=rx.dosage,
                    frequency=rx.frequency,
                    duration=rx.duration,
                    timing=rx.timing,
                    instructions=rx.instructions
                )
            
            logger.info(
                f"Created prescription {user_prescription.id} from consultation {consultation.id}"
            )
            
    except ImportError:
        logger.debug("Medicine app not available")
    except Exception as e:
        logger.error(f"Error creating prescription from consultation: {e}")


def _handle_consultation_cancelled(consultation):
    """
    Handle consultation cancellation.
    """
    logger.info(f"Consultation {consultation.id} cancelled")
    
    # Update linked appointment if exists
    if consultation.appointment:
        try:
            consultation.appointment.status = 'cancelled'
            consultation.appointment.save(update_fields=['status', 'updated_at'])
            logger.info(f"Updated appointment {consultation.appointment.id} to cancelled")
        except Exception as e:
            logger.error(f"Error updating appointment: {e}")


def _handle_consultation_no_show(consultation):
    """
    Handle no-show.
    """
    logger.info(f"Consultation {consultation.id} marked as no-show")
    
    # Update linked appointment if exists
    if consultation.appointment:
        try:
            consultation.appointment.status = 'no_show'
            consultation.appointment.save(update_fields=['status', 'updated_at'])
            logger.info(f"Updated appointment {consultation.appointment.id} to no_show")
        except Exception as e:
            logger.error(f"Error updating appointment: {e}")


@receiver(post_save, sender=ConsultationRoom)
def room_post_save(sender, instance, created, **kwargs):
    """
    Handle room events.
    """
    if created:
        logger.info(f"New consultation room created: {instance.room_name}")


@receiver(post_save, sender=ConsultationFeedback)
def feedback_post_save(sender, instance, created, **kwargs):
    """
    Handle feedback creation.
    """
    if created:
        logger.info(
            f"Feedback received for consultation {instance.consultation.id}: "
            f"{instance.overall_rating}/5"
        )
        
        # Could trigger analytics or doctor notification here
        if instance.had_technical_issues:
            logger.warning(
                f"Technical issues reported for consultation {instance.consultation.id}: "
                f"{instance.technical_issue_description}"
            )