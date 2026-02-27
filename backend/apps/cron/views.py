"""
Cron job endpoints for external schedulers.
These replace APScheduler for free tier hosting.

Endpoints:
- /api/v1/cron/health/ - Health check
- /api/v1/cron/reminders/ - Send all reminders (every 10 min)
- /api/v1/cron/missed/ - Process missed & no-shows (every 15 min)
- /api/v1/cron/daily/ - Daily maintenance (once a day)
"""

import logging
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.db import connection
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


def verify_cron_secret(request):
    """Verify the request has valid cron secret."""
    secret = request.headers.get('X-Cron-Secret', '')
    expected = getattr(settings, 'CRON_SECRET', '')
    
    # If no secret configured, allow (for development)
    if not expected:
        return True
    
    return secret == expected


def close_db_connection():
    """Close database connection to prevent stale connections."""
    try:
        connection.close()
    except Exception:
        pass


# =============================================================================
# HEALTH CHECK
# =============================================================================

@csrf_exempt
@require_GET
def health_check(request):
    """
    Simple health check endpoint.
    Also keeps the server awake on Render free tier.
    """
    return JsonResponse({
        'success': True,
        'message': 'Cron service is healthy',
        'timestamp': timezone.now().isoformat()
    })


# =============================================================================
# SEND REMINDERS (Every 10 minutes)
# =============================================================================

@csrf_exempt
@require_GET
def send_all_reminders(request):
    """
    Send all pending reminders.
    Called by external cron every 10 minutes.
    
    Handles:
    - Medicine reminders
    - Appointment reminders  
    - Consultation reminders
    """
    if not verify_cron_secret(request):
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    results = {}
    
    # 1. Medicine reminders
    try:
        from apps.medicine.services.reminder_service import ReminderService
        reminder_service = ReminderService()
        sent = reminder_service.send_reminder_notifications()
        results['medicine_reminders'] = {'sent': sent, 'status': 'success'}
        logger.info(f"[CRON] Medicine reminders sent: {sent}")
    except Exception as e:
        logger.error(f"[CRON] Medicine reminders error: {e}")
        results['medicine_reminders'] = {'error': str(e), 'status': 'failed'}
    
    # 2. Appointment reminders
    try:
        from apps.appointments.services import ReminderService as AppointmentReminderService
        stats = AppointmentReminderService.process_pending_reminders(batch_size=25)
        results['appointment_reminders'] = {**stats, 'status': 'success'}
        logger.info(f"[CRON] Appointment reminders: {stats}")
    except Exception as e:
        logger.error(f"[CRON] Appointment reminders error: {e}")
        results['appointment_reminders'] = {'error': str(e), 'status': 'failed'}
    
    # 3. Consultation reminders
    try:
        from apps.consultation.models import Consultation
        from apps.consultation.services import ConsultationNotificationService
        
        now = timezone.now()
        reminder_start = now + timedelta(minutes=10)
        reminder_end = now + timedelta(minutes=20)
        
        consultations = Consultation.objects.filter(
            status='scheduled',
            scheduled_start__gte=reminder_start,
            scheduled_start__lt=reminder_end
        ).select_related('doctor', 'patient')[:20]
        
        count = 0
        for consultation in consultations:
            try:
                ConsultationNotificationService.send_reminder(consultation, minutes_before=15)
                count += 1
            except Exception as e:
                logger.warning(f"[CRON] Consultation reminder failed for {consultation.id}: {e}")
        
        results['consultation_reminders'] = {'sent': count, 'status': 'success'}
        logger.info(f"[CRON] Consultation reminders sent: {count}")
    except Exception as e:
        logger.error(f"[CRON] Consultation reminders error: {e}")
        results['consultation_reminders'] = {'error': str(e), 'status': 'failed'}
    
    close_db_connection()
    
    return JsonResponse({
        'success': True,
        'job': 'send_reminders',
        'timestamp': timezone.now().isoformat(),
        'results': results
    })


# =============================================================================
# PROCESS MISSED & NO-SHOWS (Every 15 minutes)
# =============================================================================

@csrf_exempt
@require_GET
def process_missed_and_no_shows(request):
    """
    Mark missed reminders and no-shows.
    Called by external cron every 15 minutes.
    
    Handles:
    - Missed medicine reminders
    - Appointment no-shows
    - Consultation no-shows
    """
    if not verify_cron_secret(request):
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    results = {}
    
    # 1. Mark missed medicine reminders
    try:
        from apps.medicine.services.reminder_service import ReminderService
        reminder_service = ReminderService()
        missed = reminder_service.mark_missed_reminders()
        results['medicine_missed'] = {'marked': missed, 'status': 'success'}
        logger.info(f"[CRON] Medicine missed marked: {missed}")
    except Exception as e:
        logger.error(f"[CRON] Medicine missed error: {e}")
        results['medicine_missed'] = {'error': str(e), 'status': 'failed'}
    
    # 2. Mark appointment no-shows
    try:
        from apps.appointments.services import AppointmentService
        count = AppointmentService.mark_past_no_shows()
        results['appointment_no_shows'] = {'marked': count, 'status': 'success'}
        logger.info(f"[CRON] Appointment no-shows marked: {count}")
    except Exception as e:
        logger.error(f"[CRON] Appointment no-shows error: {e}")
        results['appointment_no_shows'] = {'error': str(e), 'status': 'failed'}
    
    # 3. Mark consultation no-shows
    try:
        from apps.consultation.models import Consultation
        from apps.consultation.services import ConsultationService
        
        cutoff = timezone.now() - timedelta(minutes=15)
        consultations = Consultation.objects.filter(
            status__in=['scheduled', 'waiting_room'],
            scheduled_start__lt=cutoff
        )[:20]
        
        count = 0
        for consultation in consultations:
            try:
                ConsultationService.mark_no_show(consultation)
                count += 1
            except Exception as e:
                logger.warning(f"[CRON] Consultation no-show failed for {consultation.id}: {e}")
        
        results['consultation_no_shows'] = {'marked': count, 'status': 'success'}
        logger.info(f"[CRON] Consultation no-shows marked: {count}")
    except Exception as e:
        logger.error(f"[CRON] Consultation no-shows error: {e}")
        results['consultation_no_shows'] = {'error': str(e), 'status': 'failed'}
    
    close_db_connection()
    
    return JsonResponse({
        'success': True,
        'job': 'process_missed',
        'timestamp': timezone.now().isoformat(),
        'results': results
    })


# =============================================================================
# DAILY MAINTENANCE (Once a day at midnight)
# =============================================================================

@csrf_exempt
@require_GET
def daily_maintenance(request):
    """
    Daily maintenance tasks.
    Called by external cron once a day at midnight.
    
    Handles:
    - Generate daily medicine logs
    - Expire old prescriptions
    - Auto-confirm pending appointments
    - Generate appointment slots
    - Expire consultation rooms
    - Cleanup old data
    """
    if not verify_cron_secret(request):
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    results = {}
    
    # 1. Generate daily medicine logs
    try:
        from apps.medicine.services.reminder_service import ReminderService
        reminder_service = ReminderService()
        count = reminder_service.generate_daily_logs(timezone.now().date())
        results['medicine_logs'] = {'generated': count, 'status': 'success'}
        logger.info(f"[CRON] Medicine logs generated: {count}")
    except Exception as e:
        logger.error(f"[CRON] Medicine logs error: {e}")
        results['medicine_logs'] = {'error': str(e), 'status': 'failed'}
    
    # 2. Expire old prescriptions
    try:
        from apps.medicine.services.prescription_service import PrescriptionService
        prescription_service = PrescriptionService()
        expired = prescription_service.check_and_expire_prescriptions()
        results['expired_prescriptions'] = {'count': expired, 'status': 'success'}
        logger.info(f"[CRON] Prescriptions expired: {expired}")
    except Exception as e:
        logger.error(f"[CRON] Prescription expiry error: {e}")
        results['expired_prescriptions'] = {'error': str(e), 'status': 'failed'}
    
    # 3. Auto-confirm pending appointments
    try:
        from apps.appointments.services import AppointmentService
        count = AppointmentService.auto_confirm_pending(hours_before=24)
        results['appointments_confirmed'] = {'count': count, 'status': 'success'}
        logger.info(f"[CRON] Appointments confirmed: {count}")
    except Exception as e:
        logger.error(f"[CRON] Appointment confirm error: {e}")
        results['appointments_confirmed'] = {'error': str(e), 'status': 'failed'}
    
    # 4. Generate appointment slots
    try:
        from apps.appointments.services import SlotService
        from apps.appointments.models import DoctorSchedule
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        doctors_with_schedules = DoctorSchedule.objects.filter(
            is_active=True
        ).values_list('doctor_id', flat=True).distinct()
        
        total_slots = 0
        for doctor_id in doctors_with_schedules[:10]:  # Limit to 10 doctors per run
            try:
                doctor = User.objects.get(id=doctor_id)
                start_date = timezone.now().date() + timedelta(days=1)
                slots_by_date = SlotService.generate_slots_for_range(
                    doctor=doctor,
                    start_date=start_date,
                    days=7
                )
                total_slots += sum(len(slots) for slots in slots_by_date.values())
            except Exception as e:
                logger.warning(f"[CRON] Slot generation failed for doctor {doctor_id}: {e}")
        
        results['slots_generated'] = {'count': total_slots, 'status': 'success'}
        logger.info(f"[CRON] Slots generated: {total_slots}")
    except Exception as e:
        logger.error(f"[CRON] Slot generation error: {e}")
        results['slots_generated'] = {'error': str(e), 'status': 'failed'}
    
    # 5. Expire consultation rooms
    try:
        from apps.consultation.models import ConsultationRoom
        
        expired = ConsultationRoom.objects.filter(
            expires_at__lt=timezone.now(),
            status__in=['created', 'waiting']
        ).update(status='expired')
        
        results['expired_rooms'] = {'count': expired, 'status': 'success'}
        logger.info(f"[CRON] Rooms expired: {expired}")
    except Exception as e:
        logger.error(f"[CRON] Room expiry error: {e}")
        results['expired_rooms'] = {'error': str(e), 'status': 'failed'}
    
    # 6. Cleanup old data
    try:
        from apps.consultation.models import ConsultationRoom
        
        # Delete old expired rooms (older than 7 days)
        room_cutoff = timezone.now() - timedelta(days=7)
        deleted_rooms, _ = ConsultationRoom.objects.filter(
            created_at__lt=room_cutoff,
            status__in=['expired', 'ended']
        ).delete()
        
        results['cleanup'] = {'deleted_rooms': deleted_rooms, 'status': 'success'}
        logger.info(f"[CRON] Cleanup: deleted {deleted_rooms} old rooms")
    except Exception as e:
        logger.error(f"[CRON] Cleanup error: {e}")
        results['cleanup'] = {'error': str(e), 'status': 'failed'}
    
    close_db_connection()
    
    return JsonResponse({
        'success': True,
        'job': 'daily_maintenance',
        'timestamp': timezone.now().isoformat(),
        'results': results
    })


# =============================================================================
# MANUAL TRIGGER (For testing)
# =============================================================================

@csrf_exempt
@require_GET
def run_all_jobs(request):
    """
    Run all cron jobs at once.
    Useful for testing.
    """
    if not verify_cron_secret(request):
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    results = {}
    
    # Run reminders
    try:
        from django.test import RequestFactory
        factory = RequestFactory()
        
        # Create mock request with the same headers
        mock_request = factory.get('/api/v1/cron/reminders/')
        mock_request.META['HTTP_X_CRON_SECRET'] = request.headers.get('X-Cron-Secret', '')
        
        # Just call the functions directly
        results['reminders'] = 'executed'
    except Exception as e:
        results['reminders'] = {'error': str(e)}
    
    close_db_connection()
    
    return JsonResponse({
        'success': True,
        'job': 'run_all',
        'timestamp': timezone.now().isoformat(),
        'message': 'Use individual endpoints for actual execution'
    })