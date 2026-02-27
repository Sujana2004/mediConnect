"""
Medicine App Scheduler using APScheduler.

More robust than daemon threads:
- Proper job management
- Missed job handling
- Graceful shutdown
- Job persistence (optional)
"""
# # Crontab Jobs for Medicine APP In Windows Environment
# Windows doesn't have crontab. Use Task Scheduler instead:

# Open "Task Scheduler" from Start Menu
# Click "Create Basic Task"
# Set trigger (Daily for logs, Every 5 minutes for processing)
# Set action: Start a program
# Program: C:\path\to\venv\Scripts\python.exe
# Arguments: manage.py generate_reminder_logs
# Start in: C:\path\to\backend
#===========================================================================
"""
Medicine App Scheduler using APScheduler.

Optimized for production (Render free tier):
- Checks if disabled via settings
- Proper error handling
- Memory efficient
- Database connection management
"""

import logging
import atexit
from django.conf import settings

logger = logging.getLogger(__name__)

# Global scheduler instance
_scheduler = None


def is_scheduler_disabled():
    """Check if scheduler should be disabled."""
    return getattr(settings, 'DISABLE_MEDICINE_SCHEDULER', False)


def send_notifications_job():
    """Job: Send reminder notifications."""
    if is_scheduler_disabled():
        return
    
    try:
        from django.db import connection
        from apps.medicine.services.reminder_service import ReminderService
        
        # Check database connection first
        try:
            connection.ensure_connection()
        except Exception as db_error:
            logger.warning(f"[SCHEDULER] Database not available: {db_error}")
            return
        
        reminder_service = ReminderService()
        sent = reminder_service.send_reminder_notifications()
        
        if sent > 0:
            logger.info(f"[SCHEDULER] Sent {sent} reminder notifications")
        
    except Exception as e:
        logger.error(f"[SCHEDULER] Error sending notifications: {e}")
    finally:
        # Always close connection
        try:
            from django.db import connection
            connection.close()
        except:
            pass


def mark_missed_job():
    """Job: Mark missed reminders."""
    if is_scheduler_disabled():
        return
    
    try:
        from django.db import connection
        
        try:
            connection.ensure_connection()
        except Exception as db_error:
            logger.warning(f"[SCHEDULER] Database not available: {db_error}")
            return
        
        from apps.medicine.services.reminder_service import ReminderService
        
        reminder_service = ReminderService()
        missed = reminder_service.mark_missed_reminders()
        
        if missed > 0:
            logger.info(f"[SCHEDULER] Marked {missed} reminders as missed")
        
    except Exception as e:
        logger.error(f"[SCHEDULER] Error marking missed: {e}")
    finally:
        try:
            from django.db import connection
            connection.close()
        except:
            pass


def generate_daily_logs_job():
    """Job: Generate daily reminder logs."""
    if is_scheduler_disabled():
        return
    
    try:
        from django.db import connection
        
        try:
            connection.ensure_connection()
        except Exception as db_error:
            logger.warning(f"[SCHEDULER] Database not available: {db_error}")
            return
        
        from django.utils import timezone
        from apps.medicine.services.reminder_service import ReminderService
        
        reminder_service = ReminderService()
        count = reminder_service.generate_daily_logs(timezone.now().date())
        
        if count > 0:
            logger.info(f"[SCHEDULER] Generated {count} daily logs")
        
    except Exception as e:
        logger.error(f"[SCHEDULER] Error generating daily logs: {e}")
    finally:
        try:
            from django.db import connection
            connection.close()
        except:
            pass


def expire_prescriptions_job():
    """Job: Expire old prescriptions."""
    if is_scheduler_disabled():
        return
    
    try:
        from django.db import connection
        
        try:
            connection.ensure_connection()
        except Exception as db_error:
            logger.warning(f"[SCHEDULER] Database not available: {db_error}")
            return
        
        from apps.medicine.services.prescription_service import PrescriptionService
        
        prescription_service = PrescriptionService()
        expired = prescription_service.check_and_expire_prescriptions()
        
        if expired > 0:
            logger.info(f"[SCHEDULER] Expired {expired} prescriptions")
        
    except Exception as e:
        logger.error(f"[SCHEDULER] Error expiring prescriptions: {e}")
    finally:
        try:
            from django.db import connection
            connection.close()
        except:
            pass


def start_scheduler():
    """
    Start the APScheduler with all medicine jobs.
    
    Jobs:
    - Every 5 minutes: Send notifications, mark missed
    - Daily at midnight: Generate logs, expire prescriptions
    """
    global _scheduler
    
    # ✅ Check if scheduler is disabled
    if is_scheduler_disabled():
        logger.info("[SCHEDULER] Medicine scheduler DISABLED via settings")
        return None
    
    # ✅ Check if already running
    if _scheduler is not None and _scheduler.running:
        logger.debug("[SCHEDULER] Already running")
        return _scheduler
    
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.interval import IntervalTrigger
        from apscheduler.triggers.cron import CronTrigger
        
        _scheduler = BackgroundScheduler(
            timezone=getattr(settings, 'TIME_ZONE', 'UTC'),
            job_defaults={
                'coalesce': True,  # Combine missed runs into one
                'max_instances': 1,  # Only one instance of each job at a time
                'misfire_grace_time': 300,  # Allow 5 minutes late (increased)
            }
        )
        
        # ✅ Reduced frequency for free tier (every 10 minutes instead of 5)
        _scheduler.add_job(
            send_notifications_job,
            trigger=IntervalTrigger(minutes=10),
            id='send_notifications',
            name='Send Reminder Notifications',
            replace_existing=True,
        )
        
        _scheduler.add_job(
            mark_missed_job,
            trigger=IntervalTrigger(minutes=10),
            id='mark_missed',
            name='Mark Missed Reminders',
            replace_existing=True,
        )
        
        _scheduler.add_job(
            generate_daily_logs_job,
            trigger=CronTrigger(hour=0, minute=5),
            id='generate_daily_logs',
            name='Generate Daily Reminder Logs',
            replace_existing=True,
        )
        
        _scheduler.add_job(
            expire_prescriptions_job,
            trigger=CronTrigger(hour=0, minute=10),
            id='expire_prescriptions',
            name='Expire Old Prescriptions',
            replace_existing=True,
        )
        
        _scheduler.start()
        logger.info("[SCHEDULER] Medicine scheduler started with 4 jobs")
        
        atexit.register(stop_scheduler)
        
        # ✅ Don't run initial jobs - they cause memory spike
        # Let them run on schedule
        
        return _scheduler
        
    except Exception as e:
        logger.error(f"[SCHEDULER] Failed to start: {e}")
        return None


def stop_scheduler():
    """Stop the scheduler gracefully."""
    global _scheduler
    
    if _scheduler is not None:
        try:
            if _scheduler.running:
                _scheduler.shutdown(wait=False)  # Don't wait to prevent hanging
                logger.info("[SCHEDULER] Medicine scheduler stopped")
        except Exception as e:
            logger.warning(f"[SCHEDULER] Error stopping: {e}")
        finally:
            _scheduler = None


def get_scheduler_status():
    """Get scheduler status and job information."""
    global _scheduler
    
    if is_scheduler_disabled():
        return {
            'running': False,
            'disabled': True,
            'jobs': [],
        }
    
    if _scheduler is None:
        return {
            'running': False,
            'disabled': False,
            'jobs': [],
        }
    
    jobs = []
    try:
        for job in _scheduler.get_jobs():
            jobs.append({
                'id': job.id,
                'name': job.name,
                'next_run': job.next_run_time.isoformat() if job.next_run_time else None,
                'trigger': str(job.trigger),
            })
    except Exception:
        pass
    
    return {
        'running': _scheduler.running if _scheduler else False,
        'disabled': False,
        'jobs': jobs,
    }


def run_job_now(job_id: str) -> dict:
    """
    Manually trigger a job to run immediately.
    """
    if is_scheduler_disabled():
        return {
            'success': False,
            'error': 'Scheduler is disabled in production'
        }
    
    job_functions = {
        'send_notifications': send_notifications_job,
        'mark_missed': mark_missed_job,
        'generate_daily_logs': generate_daily_logs_job,
        'expire_prescriptions': expire_prescriptions_job,
    }
    
    if job_id not in job_functions:
        return {
            'success': False,
            'error': f'Unknown job: {job_id}. Valid jobs: {list(job_functions.keys())}'
        }
    
    try:
        job_functions[job_id]()
        return {
            'success': True,
            'job_id': job_id,
            'message': f'Job {job_id} executed successfully'
        }
    except Exception as e:
        return {
            'success': False,
            'job_id': job_id,
            'error': str(e)
        }