"""
Medicine App Configuration.

Starts APScheduler for reminder processing when the app is ready.
"""

import os
import sys
import logging
from django.apps import AppConfig

logger = logging.getLogger(__name__)


class MedicineConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.medicine'
    verbose_name = 'Medicine Management'
    
    def ready(self):
        """
        Called when Django app is ready.
        
        - Imports signals
        - Starts scheduler (in appropriate environments)
        """
        # Import signals
        try:
            import apps.medicine.signals  # noqa: F401
        except ImportError:
            pass
        
        # Determine if we should start scheduler
        if self._should_start_scheduler():
            self._start_scheduler()
    
    def _should_start_scheduler(self):
        """
        Determine if scheduler should be started.
        
        Returns:
            bool: True if scheduler should be started
        """
        # Disable via environment variable
        if os.environ.get('DISABLE_MEDICINE_SCHEDULER', '').lower() == 'true':
            return False
        
        # Skip for management commands that don't need scheduler
        skip_commands = [
            'migrate',
            'makemigrations',
            'shell',
            'dbshell',
            'createsuperuser',
            'collectstatic',
            'test',
            'check',
            'showmigrations',
            'flush',
            'loaddata',
            'dumpdata',
            'inspectdb',
            'load_medicine_data',
            'load_medicines',
            'load_drug_interactions',
            'generate_reminder_logs',
            'process_reminders',
            'load_emergency_data',
            'load_helplines',
            'load_first_aid',
            'load_emergency_services',
        ]
        
        if len(sys.argv) > 1 and sys.argv[1] in skip_commands:
            return False
        
        # For runserver with autoreload
        is_runserver = len(sys.argv) > 1 and sys.argv[1] == 'runserver'
        run_main = os.environ.get('RUN_MAIN')
        
        if is_runserver:
            # Only run in child process (RUN_MAIN=true) or with --noreload
            if run_main == 'true':
                return True
            elif '--noreload' in sys.argv:
                return True
            return False
        
        # Production servers (gunicorn, uwsgi)
        is_production = (
            'gunicorn' in sys.modules or 
            'uwsgi' in sys.modules or
            os.environ.get('DJANGO_SETTINGS_MODULE', '').endswith('production')
        )
        
        if is_production:
            return True
        
        return False
    
    def _start_scheduler(self):
        """Start the APScheduler with error handling."""
        try:
            from .scheduler import start_scheduler, get_scheduler_status
            
            # Check if already running
            status = get_scheduler_status()
            if status['running']:
                logger.debug("Scheduler already running")
                return
            
            start_scheduler()
            logger.info("Medicine app: Scheduler initialized")
            
        except ImportError as e:
            logger.warning(
                f"Medicine app: APScheduler not installed. "
                f"Install with: pip install apscheduler. Error: {e}"
            )
        except Exception as e:
            logger.warning(f"Medicine app: Could not start scheduler: {e}")