from django.apps import AppConfig


class ConsultationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.consultation'
    verbose_name = 'Consultation Management'

    def ready(self):
        # Import signals
        try:
            import apps.consultation.signals  # noqa
        except ImportError:
            pass

        # Start scheduler in production
        from django.conf import settings
        if not settings.DEBUG or getattr(settings, 'FORCE_SCHEDULER', False):
            try:
                from apps.consultation.scheduler import start_scheduler
                start_scheduler()
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Could not start consultation scheduler: {e}")