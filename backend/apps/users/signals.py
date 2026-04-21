"""
Signals for users app.
Automatically create profiles when users are created.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, PatientProfile, DoctorProfile, AdminProfile


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Create appropriate profile when a user is created.
    Also creates HealthProfile for patients.
    """
    if created:
        if instance.role == User.Role.PATIENT:
            PatientProfile.objects.create(user=instance)
            try:
                from apps.health_records.models import HealthProfile
                HealthProfile.objects.create(user=instance)
            except ImportError:
                pass
        elif instance.role == User.Role.DOCTOR:
            pass
        elif instance.role == User.Role.ADMIN:
            AdminProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """
    Save the associated profile when user is saved.
    """
    if instance.role == User.Role.PATIENT:
        if hasattr(instance, 'patient_profile'):
            instance.patient_profile.save()
    elif instance.role == User.Role.ADMIN:
        if hasattr(instance, 'admin_profile'):
            instance.admin_profile.save()
