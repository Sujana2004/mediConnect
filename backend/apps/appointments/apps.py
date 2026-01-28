from django.apps import AppConfig


class AppointmentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.appointments'
    verbose_name = 'Appointments Management'

    def ready(self):
        """Import signals when app is ready."""
        try:
            import apps.appointments.signals  # noqa: F401
        except ImportError:
            pass
    
     # Initialize scheduler (only in main process)
        import os
        if os.environ.get('RUN_MAIN', None) == 'true':
            try:
                from .scheduler import initialize_scheduler
                initialize_scheduler()
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Could not initialize appointment scheduler: {e}")