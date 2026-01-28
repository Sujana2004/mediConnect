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


import logging
import atexit
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from django.conf import settings

logger = logging.getLogger(__name__)

# Global scheduler instance
_scheduler = None


def send_notifications_job():
    """Job: Send reminder notifications."""
    try:
        from django.db import connection
        from apps.medicine.services.reminder_service import ReminderService
        
        reminder_service = ReminderService()
        sent = reminder_service.send_reminder_notifications()
        
        if sent > 0:
            logger.info(f"[SCHEDULER] Sent {sent} reminder notifications")
        
        # Close DB connection to prevent stale connections
        connection.close()
        
    except Exception as e:
        logger.error(f"[SCHEDULER] Error sending notifications: {e}")


def mark_missed_job():
    """Job: Mark missed reminders."""
    try:
        from django.db import connection
        from apps.medicine.services.reminder_service import ReminderService
        
        reminder_service = ReminderService()
        missed = reminder_service.mark_missed_reminders()
        
        if missed > 0:
            logger.info(f"[SCHEDULER] Marked {missed} reminders as missed")
        
        connection.close()
        
    except Exception as e:
        logger.error(f"[SCHEDULER] Error marking missed: {e}")


def generate_daily_logs_job():
    """Job: Generate daily reminder logs."""
    try:
        from django.db import connection
        from django.utils import timezone
        from apps.medicine.services.reminder_service import ReminderService
        
        reminder_service = ReminderService()
        count = reminder_service.generate_daily_logs(timezone.now().date())
        
        if count > 0:
            logger.info(f"[SCHEDULER] Generated {count} daily logs")
        
        connection.close()
        
    except Exception as e:
        logger.error(f"[SCHEDULER] Error generating daily logs: {e}")


def expire_prescriptions_job():
    """Job: Expire old prescriptions."""
    try:
        from django.db import connection
        from apps.medicine.services.prescription_service import PrescriptionService
        
        prescription_service = PrescriptionService()
        expired = prescription_service.check_and_expire_prescriptions()
        
        if expired > 0:
            logger.info(f"[SCHEDULER] Expired {expired} prescriptions")
        
        connection.close()
        
    except Exception as e:
        logger.error(f"[SCHEDULER] Error expiring prescriptions: {e}")


def start_scheduler():
    """
    Start the APScheduler with all medicine jobs.
    
    Jobs:
    - Every 5 minutes: Send notifications, mark missed
    - Daily at midnight: Generate logs, expire prescriptions
    """
    global _scheduler
    
    if _scheduler is not None and _scheduler.running:
        logger.debug("[SCHEDULER] Already running")
        return _scheduler
    
    _scheduler = BackgroundScheduler(
        timezone=settings.TIME_ZONE if hasattr(settings, 'TIME_ZONE') else 'UTC',
        job_defaults={
            'coalesce': True,  # Combine missed runs into one
            'max_instances': 1,  # Only one instance of each job at a time
            'misfire_grace_time': 60,  # Allow 60 seconds late
        }
    )
    
    # Add jobs
    
    # Every 5 minutes: Send notifications
    _scheduler.add_job(
        send_notifications_job,
        trigger=IntervalTrigger(minutes=5),
        id='send_notifications',
        name='Send Reminder Notifications',
        replace_existing=True,
    )
    
    # Every 5 minutes: Mark missed reminders
    _scheduler.add_job(
        mark_missed_job,
        trigger=IntervalTrigger(minutes=5),
        id='mark_missed',
        name='Mark Missed Reminders',
        replace_existing=True,
    )
    
    # Daily at 00:05: Generate logs for new day
    _scheduler.add_job(
        generate_daily_logs_job,
        trigger=CronTrigger(hour=0, minute=5),
        id='generate_daily_logs',
        name='Generate Daily Reminder Logs',
        replace_existing=True,
    )
    
    # Daily at 00:10: Expire old prescriptions
    _scheduler.add_job(
        expire_prescriptions_job,
        trigger=CronTrigger(hour=0, minute=10),
        id='expire_prescriptions',
        name='Expire Old Prescriptions',
        replace_existing=True,
    )
    
    # Start the scheduler
    _scheduler.start()
    logger.info("[SCHEDULER] Medicine scheduler started with 4 jobs")
    
    # Register shutdown handler
    atexit.register(stop_scheduler)
    
    # Run initial jobs
    try:
        generate_daily_logs_job()
    except Exception as e:
        logger.warning(f"[SCHEDULER] Initial daily logs generation failed: {e}")
    
    return _scheduler


def stop_scheduler():
    """Stop the scheduler gracefully."""
    global _scheduler
    
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=True)
        logger.info("[SCHEDULER] Medicine scheduler stopped")
        _scheduler = None


def get_scheduler_status():
    """Get scheduler status and job information."""
    global _scheduler
    
    if _scheduler is None:
        return {
            'running': False,
            'jobs': [],
        }
    
    jobs = []
    for job in _scheduler.get_jobs():
        jobs.append({
            'id': job.id,
            'name': job.name,
            'next_run': job.next_run_time.isoformat() if job.next_run_time else None,
            'trigger': str(job.trigger),
        })
    
    return {
        'running': _scheduler.running,
        'jobs': jobs,
    }


def run_job_now(job_id: str) -> dict:
    """
    Manually trigger a job to run immediately.
    
    Args:
        job_id: One of 'send_notifications', 'mark_missed', 
                'generate_daily_logs', 'expire_prescriptions'
    
    Returns:
        Result dictionary
    """
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