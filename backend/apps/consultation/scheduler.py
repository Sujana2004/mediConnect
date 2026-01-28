"""
Consultation App Scheduler
==========================
Background tasks using APScheduler.

Jobs:
1. send_reminders - Send consultation reminders (every 5 min)
2. mark_no_shows - Mark no-show consultations (every 10 min)
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


def get_scheduler():
    """Get or create the scheduler instance."""
    global _scheduler
    
    if _scheduler is None:
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            from apscheduler.executors.pool import ThreadPoolExecutor
            
            executors = {
                'default': ThreadPoolExecutor(2)
            }
            
            _scheduler = BackgroundScheduler(
                executors=executors,
                timezone=settings.TIME_ZONE
            )
            
        except ImportError:
            logger.warning("APScheduler not installed. Background tasks disabled.")
            return None
    
    return _scheduler


def start_scheduler():
    """Start the scheduler with all jobs."""
    if getattr(settings, 'DISABLE_CONSULTATION_SCHEDULER', False):
        logger.info("Consultation scheduler disabled by settings")
        return
    
    scheduler = get_scheduler()
    if scheduler is None:
        return
    
    if scheduler.running:
        logger.info("Consultation scheduler already running")
        return
    
    try:
        # Add jobs
        scheduler.add_job(
            send_consultation_reminders,
            'interval',
            minutes=5,
            id='consultation_send_reminders',
            replace_existing=True,
            max_instances=1
        )
        
        scheduler.add_job(
            mark_no_show_consultations,
            'interval',
            minutes=10,
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
        logger.info("Consultation scheduler started with 4 jobs")
        
    except Exception as e:
        logger.error(f"Error starting consultation scheduler: {e}")


def stop_scheduler():
    """Stop the scheduler."""
    global _scheduler
    
    if _scheduler and _scheduler.running:
        _scheduler.shutdown()
        logger.info("Consultation scheduler stopped")
    
    _scheduler = None


# =============================================================================
# SCHEDULED JOBS
# =============================================================================

def send_consultation_reminders():
    """
    Send reminders for upcoming consultations.
    Runs every 5 minutes.
    """
    from apps.consultation.models import Consultation
    from apps.consultation.services import ConsultationNotificationService
    
    now = timezone.now()
    
    # Find consultations starting in 15-20 minutes
    reminder_start = now + timedelta(minutes=15)
    reminder_end = now + timedelta(minutes=20)
    
    consultations = Consultation.objects.filter(
        status='scheduled',
        scheduled_start__gte=reminder_start,
        scheduled_start__lt=reminder_end
    ).select_related('doctor', 'patient')
    
    count = 0
    for consultation in consultations:
        try:
            ConsultationNotificationService.send_reminder(consultation, minutes_before=15)
            count += 1
        except Exception as e:
            logger.error(f"Error sending reminder for consultation {consultation.id}: {e}")
    
    if count > 0:
        logger.info(f"Sent {count} consultation reminders")


def mark_no_show_consultations():
    """
    Mark consultations as no-show if past scheduled time.
    Runs every 10 minutes.
    """
    from apps.consultation.models import Consultation
    from apps.consultation.services import ConsultationService
    
    # Find consultations that should be marked as no-show
    # (scheduled or waiting_room, 15+ minutes past start time)
    cutoff = timezone.now() - timedelta(minutes=15)
    
    consultations = Consultation.objects.filter(
        status__in=['scheduled', 'waiting_room'],
        scheduled_start__lt=cutoff
    )
    
    count = 0
    for consultation in consultations:
        try:
            ConsultationService.mark_no_show(consultation)
            count += 1
        except Exception as e:
            logger.error(f"Error marking no-show for consultation {consultation.id}: {e}")
    
    if count > 0:
        logger.info(f"Marked {count} consultations as no-show")


def expire_consultation_rooms():
    """
    Expire old consultation rooms.
    Runs every 30 minutes.
    """
    from apps.consultation.models import ConsultationRoom
    
    now = timezone.now()
    
    # Find expired rooms that are not already marked as expired/ended
    expired_rooms = ConsultationRoom.objects.filter(
        expires_at__lt=now,
        status__in=['created', 'waiting']
    )
    
    count = expired_rooms.update(status='expired')
    
    if count > 0:
        logger.info(f"Expired {count} consultation rooms")


def cleanup_old_consultation_data():
    """
    Clean up old consultation data.
    Runs daily at 3 AM.
    """
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
        logger.info(f"Deleted {room_count} old consultation rooms")
    
    # Archive consultations older than 1 year (optional - just log for now)
    archive_cutoff = timezone.now() - timedelta(days=365)
    old_consultations = Consultation.objects.filter(
        created_at__lt=archive_cutoff,
        status__in=['completed', 'cancelled', 'no_show']
    ).count()
    
    if old_consultations > 0:
        logger.info(f"Found {old_consultations} consultations older than 1 year (consider archiving)")


# =============================================================================
# MANUAL TRIGGER FUNCTIONS
# =============================================================================

def trigger_send_reminders():
    """Manually trigger reminder sending."""
    logger.info("Manually triggering consultation reminders...")
    send_consultation_reminders()


def trigger_mark_no_shows():
    """Manually trigger no-show marking."""
    logger.info("Manually triggering no-show marking...")
    mark_no_show_consultations()


def trigger_expire_rooms():
    """Manually trigger room expiration."""
    logger.info("Manually triggering room expiration...")
    expire_consultation_rooms()


def trigger_cleanup():
    """Manually trigger cleanup."""
    logger.info("Manually triggering cleanup...")
    cleanup_old_consultation_data()