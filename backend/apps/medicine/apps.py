"""
Medicine App Configuration.
"""

import sys
import logging
from django.apps import AppConfig

logger = logging.getLogger(__name__)


class MedicineConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.medicine'
    verbose_name = 'Medicine Management'
    
    def ready(self):
        """Called when Django app is ready."""
        # Import signals
        try:
            import apps.medicine.signals  # noqa: F401
        except ImportError:
            pass
        
        # Check if scheduler is disabled via Django settings
        from django.conf import settings
        if getattr(settings, 'DISABLE_MEDICINE_SCHEDULER', False):
            logger.info("Medicine app: Scheduler DISABLED")
            return
        
        # Only start scheduler in development (when not disabled)
        self._start_scheduler()
    
    def _start_scheduler(self):
        """Start scheduler only in development."""
        # Skip for management commands
        skip_commands = ['migrate', 'makemigrations', 'collectstatic', 'test', 'check']
        if len(sys.argv) > 1 and sys.argv[1] in skip_commands:
            return
        
        try:
            from .scheduler import start_scheduler
            start_scheduler()
            logger.info("Medicine app: Scheduler started")
        except Exception as e:
            logger.warning(f"Medicine app: Could not start scheduler: {e}")