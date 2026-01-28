"""
Notification Signals
====================
Django signals for automatic notification-related actions.
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings

logger = logging.getLogger(__name__)


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_notification_preferences(sender, instance, created, **kwargs):
    """
    Automatically create notification preferences when a new user is created.
    """
    if created:
        from .models import UserNotificationPreference
        
        UserNotificationPreference.objects.get_or_create(
            user=instance,
            defaults={
                'preferred_language': getattr(instance, 'language', 'en') or 'en'
            }
        )
        logger.debug(f"Created notification preferences for user {instance.id}")


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def send_welcome_notification(sender, instance, created, **kwargs):
    """
    Send welcome notification to new users.
    """
    if created:
        from .services import get_notification_service
        from .constants import NotificationType
        
        # Delay import to avoid circular dependency
        try:
            service = get_notification_service()
            
            # Get user's language
            language = getattr(instance, 'language', 'en') or 'en'
            
            # Welcome messages in different languages
            welcome_messages = {
                'en': {
                    'title': 'Welcome to MediConnect!',
                    'body': 'Your health assistant is ready to help. Ask me anything about your health!'
                },
                'te': {
                    'title': 'MediConnect కు స్వాగతం!',
                    'body': 'మీ ఆరోగ్య సహాయకుడు సిద్ధంగా ఉన్నాడు. మీ ఆరోగ్యం గురించి ఏదైనా అడగండి!'
                },
                'hi': {
                    'title': 'MediConnect में आपका स्वागत है!',
                    'body': 'आपका स्वास्थ्य सहायक मदद के लिए तैयार है। अपने स्वास्थ्य के बारे में कुछ भी पूछें!'
                }
            }
            
            msg = welcome_messages.get(language, welcome_messages['en'])
            
            service.send_notification(
                user=instance,
                notification_type=NotificationType.WELCOME,
                title=msg['title'],
                body=msg['body'],
                skip_preferences_check=True,  # Always send welcome notification
            )
            
            logger.info(f"Sent welcome notification to user {instance.id}")
            
        except Exception as e:
            # Don't fail user creation if notification fails
            logger.error(f"Failed to send welcome notification: {e}")