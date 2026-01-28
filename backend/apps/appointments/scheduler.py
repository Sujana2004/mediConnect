"""
Appointments App Scheduler for MediConnect.

Background tasks for:
1. Sending appointment reminders
2. Auto-confirming pending appointments
3. Marking no-shows
4. Generating time slots
5. Cleaning up old data
"""

import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)

# Flag to track if scheduler is initialized
_scheduler_initialized = False
_scheduler = None


def get_scheduler():
    """Get or create the APScheduler instance."""
    global _scheduler
    
    if _scheduler is None:
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            from apscheduler.executors.pool import ThreadPoolExecutor
            from apscheduler.jobstores.memory import MemoryJobStore
            
            jobstores = {
                'default': MemoryJobStore()
            }
            
            executors = {
                'default': ThreadPoolExecutor(max_workers=3)
            }
            
            job_defaults = {
                'coalesce': True,
                'max_instances': 1,
                'misfire_grace_time': 60 * 5  # 5 minutes
            }
            
            _scheduler = BackgroundScheduler(
                jobstores=jobstores,
                executors=executors,
                job_defaults=job_defaults,
                timezone=settings.TIME_ZONE
            )
            
            logger.info("APScheduler instance created for appointments")
            
        except ImportError:
            logger.warning("APScheduler not installed. Background tasks disabled.")
            return None
    
    return _scheduler


def start_scheduler():
    """Start the appointment scheduler with all jobs."""
    global _scheduler_initialized
    
    # Check if scheduler is disabled
    if getattr(settings, 'DISABLE_APPOINTMENT_SCHEDULER', False):
        logger.info("Appointment scheduler is disabled via settings")
        return
    
    if _scheduler_initialized:
        logger.debug("Appointment scheduler already initialized")
        return
    
    scheduler = get_scheduler()
    if scheduler is None:
        return
    
    try:
        # Add jobs
        _add_reminder_job(scheduler)
        _add_auto_confirm_job(scheduler)
        _add_no_show_job(scheduler)
        _add_slot_generation_job(scheduler)
        _add_cleanup_job(scheduler)
        
        # Start scheduler if not running
        if not scheduler.running:
            scheduler.start()
            logger.info("Appointment scheduler started successfully")
        
        _scheduler_initialized = True
        
    except Exception as e:
        logger.error(f"Error starting appointment scheduler: {e}")


def stop_scheduler():
    """Stop the appointment scheduler."""
    global _scheduler_initialized, _scheduler
    
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Appointment scheduler stopped")
    
    _scheduler_initialized = False


def _add_reminder_job(scheduler):
    """Add job to send appointment reminders."""
    scheduler.add_job(
        send_pending_reminders,
        trigger='interval',
        minutes=5,
        id='appointments_send_reminders',
        name='Send Appointment Reminders',
        replace_existing=True
    )
    logger.info("Added reminder job (every 5 minutes)")


def _add_auto_confirm_job(scheduler):
    """Add job to auto-confirm pending appointments."""
    scheduler.add_job(
        auto_confirm_appointments,
        trigger='interval',
        minutes=30,
        id='appointments_auto_confirm',
        name='Auto Confirm Appointments',
        replace_existing=True
    )
    logger.info("Added auto-confirm job (every 30 minutes)")


def _add_no_show_job(scheduler):
    """Add job to mark no-shows."""
    scheduler.add_job(
        mark_no_shows,
        trigger='interval',
        minutes=15,
        id='appointments_mark_no_shows',
        name='Mark No Shows',
        replace_existing=True
    )
    logger.info("Added no-show job (every 15 minutes)")


def _add_slot_generation_job(scheduler):
    """Add job to generate time slots daily."""
    scheduler.add_job(
        generate_daily_slots,
        trigger='cron',
        hour=0,
        minute=15,
        id='appointments_generate_slots',
        name='Generate Daily Slots',
        replace_existing=True
    )
    logger.info("Added slot generation job (daily at 00:15)")


def _add_cleanup_job(scheduler):
    """Add job to clean up old data."""
    scheduler.add_job(
        cleanup_old_data,
        trigger='cron',
        hour=2,
        minute=0,
        id='appointments_cleanup',
        name='Cleanup Old Data',
        replace_existing=True
    )
    logger.info("Added cleanup job (daily at 02:00)")


# =============================================================================
# JOB FUNCTIONS
# =============================================================================

def send_pending_reminders():
    """
    Send pending appointment reminders.
    Runs every 5 minutes.
    """
    try:
        from .services import ReminderService
        
        stats = ReminderService.process_pending_reminders(batch_size=50)
        
        if stats['processed'] > 0:
            logger.info(
                f"Processed {stats['processed']} reminders: "
                f"{stats['sent']} sent, {stats['failed']} failed"
            )
        
        return stats
        
    except Exception as e:
        logger.error(f"Error in send_pending_reminders: {e}")
        return {'error': str(e)}


def auto_confirm_appointments():
    """
    Auto-confirm pending appointments that are within 24 hours.
    Runs every 30 minutes.
    """
    try:
        from .services import AppointmentService
        
        count = AppointmentService.auto_confirm_pending(hours_before=24)
        
        if count > 0:
            logger.info(f"Auto-confirmed {count} appointments")
        
        return {'confirmed': count}
        
    except Exception as e:
        logger.error(f"Error in auto_confirm_appointments: {e}")
        return {'error': str(e)}


def mark_no_shows():
    """
    Mark past appointments as no-show.
    Runs every 15 minutes.
    """
    try:
        from .services import AppointmentService
        
        count = AppointmentService.mark_past_no_shows()
        
        if count > 0:
            logger.info(f"Marked {count} appointments as no-show")
        
        return {'no_shows': count}
        
    except Exception as e:
        logger.error(f"Error in mark_no_shows: {e}")
        return {'error': str(e)}


def generate_daily_slots():
    """
    Generate time slots for upcoming days.
    Runs daily at 00:15.
    """
    try:
        from .services import SlotService
        from .models import DoctorSchedule
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Get all doctors with active schedules
        doctors_with_schedules = DoctorSchedule.objects.filter(
            is_active=True
        ).values_list('doctor_id', flat=True).distinct()
        
        total_slots = 0
        doctors_processed = 0
        
        for doctor_id in doctors_with_schedules:
            try:
                doctor = User.objects.get(id=doctor_id)
                
                # Generate slots for next 7 days
                start_date = timezone.now().date() + timedelta(days=1)
                slots_by_date = SlotService.generate_slots_for_range(
                    doctor=doctor,
                    start_date=start_date,
                    days=7
                )
                
                slot_count = sum(len(slots) for slots in slots_by_date.values())
                total_slots += slot_count
                doctors_processed += 1
                
            except Exception as e:
                logger.error(f"Error generating slots for doctor {doctor_id}: {e}")
        
        logger.info(
            f"Generated {total_slots} slots for {doctors_processed} doctors"
        )
        
        return {
            'total_slots': total_slots,
            'doctors_processed': doctors_processed
        }
        
    except Exception as e:
        logger.error(f"Error in generate_daily_slots: {e}")
        return {'error': str(e)}


def cleanup_old_data():
    """
    Clean up old appointments, slots, and reminders.
    Runs daily at 02:00.
    """
    try:
        from .services import SlotService, ReminderService
        from .models import Appointment, AppointmentQueue
        
        days_to_keep = 90  # Keep data for 90 days
        
        # Clean up old slots
        slots_deleted = SlotService.cleanup_past_slots(days_old=days_to_keep)
        
        # Clean up old reminders
        reminders_deleted = ReminderService.cleanup_old_reminders(days_old=days_to_keep)
        
        # Clean up old queue entries (keep for 30 days)
        cutoff_date = timezone.now().date() - timedelta(days=30)
        queue_deleted, _ = AppointmentQueue.objects.filter(
            queue_date__lt=cutoff_date
        ).delete()
        
        logger.info(
            f"Cleanup completed: {slots_deleted} slots, "
            f"{reminders_deleted} reminders, {queue_deleted} queue entries deleted"
        )
        
        return {
            'slots_deleted': slots_deleted,
            'reminders_deleted': reminders_deleted,
            'queue_deleted': queue_deleted
        }
        
    except Exception as e:
        logger.error(f"Error in cleanup_old_data: {e}")
        return {'error': str(e)}


# =============================================================================
# MANUAL TRIGGER FUNCTIONS
# =============================================================================

def trigger_job(job_id: str):
    """
    Manually trigger a scheduled job.
    
    Args:
        job_id: ID of job to trigger
        
    Returns:
        Result of job execution
    """
    jobs = {
        'send_reminders': send_pending_reminders,
        'auto_confirm': auto_confirm_appointments,
        'mark_no_shows': mark_no_shows,
        'generate_slots': generate_daily_slots,
        'cleanup': cleanup_old_data,
        'all': None,
    }
    
    if job_id not in jobs:
        return {'error': f'Unknown job: {job_id}'}
    
    if job_id == 'all':
        results = {}
        for name, func in jobs.items():
            if func is not None:
                results[name] = func()
        return results
    
    return jobs[job_id]()


def get_scheduler_status():
    """
    Get status of scheduler and jobs.
    
    Returns:
        Dict with scheduler status
    """
    scheduler = get_scheduler()
    
    if scheduler is None:
        return {
            'status': 'unavailable',
            'message': 'APScheduler not installed'
        }
    
    if not scheduler.running:
        return {
            'status': 'stopped',
            'message': 'Scheduler is not running'
        }
    
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            'id': job.id,
            'name': job.name,
            'next_run': job.next_run_time.isoformat() if job.next_run_time else None,
            'trigger': str(job.trigger)
        })
    
    return {
        'status': 'running',
        'jobs': jobs,
        'job_count': len(jobs)
    }


# =============================================================================
# APP READY HOOK
# =============================================================================

def initialize_scheduler():
    """
    Initialize scheduler when app is ready.
    Called from apps.py.
    """
    import sys
    
    # Don't start scheduler during migrations or other management commands
    if 'migrate' in sys.argv or 'makemigrations' in sys.argv:
        logger.debug("Skipping scheduler initialization during migrations")
        return
    
    if 'collectstatic' in sys.argv:
        logger.debug("Skipping scheduler initialization during collectstatic")
        return
    
    if 'test' in sys.argv:
        logger.debug("Skipping scheduler initialization during tests")
        return
    
    # Start scheduler
    start_scheduler()