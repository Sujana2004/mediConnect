"""
Consultation App Scheduler
==========================
Background tasks using APScheduler.

Optimized for production (Render free tier):
- Can be disabled via settings
- Database connection safety
- Memory efficient
- Reduced frequency

Jobs:
1. send_reminders - Send consultation reminders (every 10 min)
2. mark_no_shows - Mark no-show consultations (every 15 min)
3. expire_rooms - Expire old rooms (every 30 min)
4. cleanup_old_data - Clean old data (daily) 
"""

import logging
from datetime import timedelta
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)

# Scheduler instance
_scheduler = None


def is_scheduler_disabled():
    """Check if scheduler should be disabled."""
    return getattr(settings, 'DISABLE_CONSULTATION_SCHEDULER', False)


def safe_db_operation(func):
    """Decorator to safely handle database operations."""
    def wrapper(*args, **kwargs):
        if is_scheduler_disabled():
            return None
        
        try:
            from django.db import connection
            
            # Check database connection first
            try:
                connection.ensure_connection()
            except Exception as db_error:
                logger.warning(f"[SCHEDULER] Database not available: {db_error}")
                return None
            
            result = func(*args, **kwargs)
            return result
            
        except Exception as e:
            logger.error(f"[SCHEDULER] Error in {func.__name__}: {e}")
            return None
        finally:
            # Always close connection
            try:
                from django.db import connection
                connection.close()
            except:
                pass
    
    return wrapper


def get_scheduler():
    """Get or create the scheduler instance."""
    global _scheduler
    
    # Don't create scheduler if disabled
    if is_scheduler_disabled():
        return None
    
    if _scheduler is None:
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            from apscheduler.executors.pool import ThreadPoolExecutor
            
            executors = {
                # Reduced to 1 worker for free tier
                'default': ThreadPoolExecutor(1)
            }
            
            job_defaults = {
                'coalesce': True,  # Combine missed runs
                'max_instances': 1,
                'misfire_grace_time': 60 * 10  # 10 minutes
            }
            
            _scheduler = BackgroundScheduler(
                executors=executors,
                job_defaults=job_defaults,
                timezone=getattr(settings, 'TIME_ZONE', 'UTC')
            )
            
        except ImportError:
            logger.warning("APScheduler not installed. Background tasks disabled.")
            return None
    
    return _scheduler


def start_scheduler():
    """Start the scheduler with all jobs."""
    # Check if disabled
    if is_scheduler_disabled():
        logger.info("[SCHEDULER] Consultation scheduler DISABLED via settings")
        return
    
    scheduler = get_scheduler()
    if scheduler is None:
        return
    
    if scheduler.running:
        logger.info("[SCHEDULER] Consultation scheduler already running")
        return
    
    try:
        # Add jobs with reduced frequency for free tier
        scheduler.add_job(
            send_consultation_reminders,
            'interval',
            minutes=10,  # Changed from 5 to 10
            id='consultation_send_reminders',
            replace_existing=True,
            max_instances=1
        )
        
        scheduler.add_job(
            mark_no_show_consultations,
            'interval',
            minutes=15,  # Changed from 10 to 15
            id='consultation_mark_no_shows',
            replace_existing=True,
            max_instances=1
        )
        
        scheduler.add_job(
            expire_consultation_rooms,
            'interval',
            minutes=30,
            id='consultation_expire_rooms',
            replace_existing=True,
            max_instances=1
        )
        
        scheduler.add_job(
            cleanup_old_consultation_data,
            'cron',
            hour=3,
            minute=0,
            id='consultation_cleanup',
            replace_existing=True,
            max_instances=1
        )
        
        scheduler.start()
        logger.info("[SCHEDULER] Consultation scheduler started with 4 jobs")
        
    except Exception as e:
        logger.error(f"[SCHEDULER] Error starting consultation scheduler: {e}")


def stop_scheduler():
    """Stop the scheduler."""
    global _scheduler
    
    if _scheduler:
        try:
            if _scheduler.running:
                _scheduler.shutdown(wait=False)  # Don't wait to prevent hanging
                logger.info("[SCHEDULER] Consultation scheduler stopped")
        except Exception as e:
            logger.warning(f"[SCHEDULER] Error stopping: {e}")
        finally:
            _scheduler = None


def get_scheduler_status():
    """Get status of scheduler and jobs."""
    if is_scheduler_disabled():
        return {
            'status': 'disabled',
            'message': 'Scheduler is disabled via settings'
        }
    
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
    try:
        for job in scheduler.get_jobs():
            jobs.append({
                'id': job.id,
                'name': job.name,
                'next_run': job.next_run_time.isoformat() if job.next_run_time else None,
                'trigger': str(job.trigger)
            })
    except Exception:
        pass
    
    return {
        'status': 'running',
        'jobs': jobs,
        'job_count': len(jobs)
    }


# =============================================================================
# SCHEDULED JOBS
# =============================================================================

@safe_db_operation
def send_consultation_reminders():
    """
    Send reminders for upcoming consultations.
    Runs every 10 minutes.
    """
    if is_scheduler_disabled():
        return
    
    try:
        from apps.consultation.models import Consultation
        from apps.consultation.services import ConsultationNotificationService
        
        now = timezone.now()
        
        # Find consultations starting in 15-25 minutes (wider window for 10 min interval)
        reminder_start = now + timedelta(minutes=15)
        reminder_end = now + timedelta(minutes=25)
        
        consultations = Consultation.objects.filter(
            status='scheduled',
            scheduled_start__gte=reminder_start,
            scheduled_start__lt=reminder_end
        ).select_related('doctor', 'patient')[:20]  # Limit batch size
        
        count = 0
        for consultation in consultations:
            try:
                ConsultationNotificationService.send_reminder(consultation, minutes_before=15)
                count += 1
            except Exception as e:
                logger.error(f"[SCHEDULER] Error sending reminder for consultation {consultation.id}: {e}")
        
        if count > 0:
            logger.info(f"[SCHEDULER] Sent {count} consultation reminders")
            
    except Exception as e:
        logger.error(f"[SCHEDULER] Error in send_consultation_reminders: {e}")


@safe_db_operation
def mark_no_show_consultations():
    """
    Mark consultations as no-show if past scheduled time.
    Runs every 15 minutes.
    """
    if is_scheduler_disabled():
        return
    
    try:
        from apps.consultation.models import Consultation
        from apps.consultation.services import ConsultationService
        
        # Find consultations that should be marked as no-show
        # (scheduled or waiting_room, 15+ minutes past start time)
        cutoff = timezone.now() - timedelta(minutes=15)
        
        consultations = Consultation.objects.filter(
            status__in=['scheduled', 'waiting_room'],
            scheduled_start__lt=cutoff
        )[:20]  # Limit batch size
        
        count = 0
        for consultation in consultations:
            try:
                ConsultationService.mark_no_show(consultation)
                count += 1
            except Exception as e:
                logger.error(f"[SCHEDULER] Error marking no-show for consultation {consultation.id}: {e}")
        
        if count > 0:
            logger.info(f"[SCHEDULER] Marked {count} consultations as no-show")
            
    except Exception as e:
        logger.error(f"[SCHEDULER] Error in mark_no_show_consultations: {e}")


@safe_db_operation
def expire_consultation_rooms():
    """
    Expire old consultation rooms.
    Runs every 30 minutes.
    """
    if is_scheduler_disabled():
        return
    
    try:
        from apps.consultation.models import ConsultationRoom
        
        now = timezone.now()
        
        # Find expired rooms that are not already marked as expired/ended
        expired_rooms = ConsultationRoom.objects.filter(
            expires_at__lt=now,
            status__in=['created', 'waiting']
        )
        
        count = expired_rooms.update(status='expired')
        
        if count > 0:
            logger.info(f"[SCHEDULER] Expired {count} consultation rooms")
            
    except Exception as e:
        logger.error(f"[SCHEDULER] Error in expire_consultation_rooms: {e}")


@safe_db_operation
def cleanup_old_consultation_data():
    """
    Clean up old consultation data.
    Runs daily at 3 AM.
    """
    if is_scheduler_disabled():
        return
    
    try:
        from apps.consultation.models import ConsultationRoom, Consultation
        
        # Delete rooms older than 7 days
        room_cutoff = timezone.now() - timedelta(days=7)
        
        old_rooms = ConsultationRoom.objects.filter(
            created_at__lt=room_cutoff,
            status__in=['expired', 'ended']
        )
        room_count = old_rooms.count()
        old_rooms.delete()
        
        if room_count > 0:
            logger.info(f"[SCHEDULER] Deleted {room_count} old consultation rooms")
        
        # Archive consultations older than 1 year (optional - just log for now)
        archive_cutoff = timezone.now() - timedelta(days=365)
        old_consultations = Consultation.objects.filter(
            created_at__lt=archive_cutoff,
            status__in=['completed', 'cancelled', 'no_show']
        ).count()
        
        if old_consultations > 0:
            logger.info(f"[SCHEDULER] Found {old_consultations} consultations older than 1 year (consider archiving)")
            
    except Exception as e:
        logger.error(f"[SCHEDULER] Error in cleanup_old_consultation_data: {e}")


# =============================================================================
# MANUAL TRIGGER FUNCTIONS
# =============================================================================

def trigger_send_reminders():
    """Manually trigger reminder sending."""
    if is_scheduler_disabled():
        return {'error': 'Scheduler is disabled'}
    logger.info("Manually triggering consultation reminders...")
    send_consultation_reminders()
    return {'success': True}


def trigger_mark_no_shows():
    """Manually trigger no-show marking."""
    if is_scheduler_disabled():
        return {'error': 'Scheduler is disabled'}
    logger.info("Manually triggering no-show marking...")
    mark_no_show_consultations()
    return {'success': True}


def trigger_expire_rooms():
    """Manually trigger room expiration."""
    if is_scheduler_disabled():
        return {'error': 'Scheduler is disabled'}
    logger.info("Manually triggering room expiration...")
    expire_consultation_rooms()
    return {'success': True}


def trigger_cleanup():
    """Manually trigger cleanup."""
    if is_scheduler_disabled():
        return {'error': 'Scheduler is disabled'}
    logger.info("Manually triggering cleanup...")
    cleanup_old_consultation_data()
    return {'success': True}


def run_job_now(job_id: str) -> dict:
    """
    Manually trigger a job to run immediately.
    
    Args:
        job_id: One of 'send_reminders', 'mark_no_shows', 
                'expire_rooms', 'cleanup'
    
    Returns:
        Result dictionary
    """
    if is_scheduler_disabled():
        return {
            'success': False,
            'error': 'Scheduler is disabled in production'
        }
    
    job_functions = {
        'send_reminders': send_consultation_reminders,
        'mark_no_shows': mark_no_show_consultations,
        'expire_rooms': expire_consultation_rooms,
        'cleanup': cleanup_old_consultation_data,
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