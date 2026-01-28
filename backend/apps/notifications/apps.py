"""
Notifications App Configuration
===============================
Firebase Cloud Messaging (FCM) based push notifications.
Supports in-app notifications with multi-language templates.
"""

from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.notifications'
    verbose_name = 'Notifications'

    def ready(self):
        """
        Initialize notification services when app is ready.
        Import signals to connect notification triggers.
        """
        try:
            from . import signals  # noqa: F401
        except ImportError:
            pass