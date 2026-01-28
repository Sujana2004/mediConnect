"""
Reminder Service for MediConnect.

Handles:
- Reminder CRUD
- Reminder scheduling
- Sending reminder notifications
- Tracking responses (taken/skipped/missed)
- Adherence statistics
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import date, datetime, time, timedelta
from django.db import transaction
from django.utils import timezone
from django.db.models import Count, Q

from ..models import (
    MedicineReminder,
    ReminderLog,
    PrescriptionMedicine,
)

logger = logging.getLogger(__name__)


class ReminderService:
    """Service for medicine reminder management."""
    
    def get_user_reminders(
        self,
        user,
        status: Optional[str] = None,
        active_only: bool = True,
        limit: int = 50
    ) -> List[MedicineReminder]:
        """
        Get user's medicine reminders.
        
        Args:
            user: User instance
            status: Filter by status
            active_only: Only show active reminders
            limit: Maximum results
        
        Returns:
            List of reminders
        """
        queryset = MedicineReminder.objects.filter(user=user)
        
        if status:
            queryset = queryset.filter(status=status)
        elif active_only:
            queryset = queryset.filter(status='active')
        
        return list(queryset.order_by('-created_at')[:limit])
    
    def get_reminder_by_id(
        self,
        reminder_id: str,
        user=None
    ) -> Optional[MedicineReminder]:
        """
        Get reminder by ID.
        
        Args:
            reminder_id: Reminder UUID
            user: Optional user for ownership check
        
        Returns:
            Reminder instance or None
        """
        try:
            if user:
                return MedicineReminder.objects.get(id=reminder_id, user=user)
            return MedicineReminder.objects.get(id=reminder_id)
        except MedicineReminder.DoesNotExist:
            return None
    
    @transaction.atomic
    def create_reminder(
        self,
        user,
        medicine_name: str,
        dosage: str,
        reminder_times: List[str],
        start_date: date,
        end_date: Optional[date] = None,
        prescription_medicine: Optional[PrescriptionMedicine] = None,
        days_of_week: List[int] = None,
        instructions: str = '',
        notify_before_minutes: int = 0,
        notify_family_helper: bool = False,
        allow_snooze: bool = True,
        snooze_minutes: int = 10,
        max_snoozes: int = 3
    ) -> MedicineReminder:
        """
        Create a new medicine reminder.
        
        Args:
            user: User instance
            medicine_name: Name of the medicine
            dosage: Dosage instructions
            reminder_times: List of times ['08:00', '20:00']
            start_date: Start date
            end_date: Optional end date
            prescription_medicine: Link to prescription medicine
            days_of_week: Days to remind [0-6]
            instructions: Special instructions
            notify_before_minutes: Minutes before to send reminder
            notify_family_helper: Also notify family helper
            allow_snooze: Allow snoozing reminder
            snooze_minutes: Snooze duration
            max_snoozes: Maximum snooze count
        
        Returns:
            Created reminder
        """
        # Validate and sort times
        validated_times = []
        for time_str in reminder_times:
            try:
                datetime.strptime(time_str, '%H:%M')
                validated_times.append(time_str)
            except ValueError:
                logger.warning(f"Invalid time format: {time_str}")
                continue
        
        if not validated_times:
            raise ValueError("At least one valid reminder time is required")
        
        validated_times = sorted(set(validated_times))
        
        reminder = MedicineReminder.objects.create(
            user=user,
            prescription_medicine=prescription_medicine,
            medicine_name=medicine_name,
            dosage=dosage,
            reminder_times=validated_times,
            days_of_week=days_of_week or [],
            start_date=start_date,
            end_date=end_date,
            instructions=instructions,
            status='active',
            notify_before_minutes=notify_before_minutes,
            notify_family_helper=notify_family_helper,
            allow_snooze=allow_snooze,
            snooze_minutes=snooze_minutes,
            max_snoozes=max_snoozes
        )
        
        # Generate reminder logs for today if applicable
        self._generate_logs_for_date(reminder, timezone.now().date())
        
        logger.info(f"Reminder created: {reminder.id} for user {user.id}")
        
        return reminder
    
    @transaction.atomic
    def create_reminders_from_prescription(
        self,
        prescription_medicine: PrescriptionMedicine
    ) -> Optional[MedicineReminder]:
        """
        Create reminders from a prescription medicine.
        
        Args:
            prescription_medicine: PrescriptionMedicine instance
        
        Returns:
            Created reminder or None
        """
        user = prescription_medicine.prescription.user
        
        # Determine reminder times based on frequency
        reminder_times = self._get_times_from_frequency(
            prescription_medicine.frequency,
            prescription_medicine.custom_times
        )
        
        if not reminder_times:
            logger.warning(
                f"Could not determine reminder times for {prescription_medicine.id}"
            )
            return None
        
        # Build instructions from timing
        instructions = prescription_medicine.special_instructions
        if prescription_medicine.timing:
            timing_text = prescription_medicine.get_timing_display()
            if instructions:
                instructions = f"{timing_text}. {instructions}"
            else:
                instructions = timing_text
        
        return self.create_reminder(
            user=user,
            medicine_name=prescription_medicine.medicine_name,
            dosage=prescription_medicine.dosage,
            reminder_times=reminder_times,
            start_date=prescription_medicine.start_date or timezone.now().date(),
            end_date=prescription_medicine.end_date,
            prescription_medicine=prescription_medicine,
            instructions=instructions
        )
    
    def _get_times_from_frequency(
        self,
        frequency: str,
        custom_times: List[str] = None
    ) -> List[str]:
        """Get reminder times based on frequency."""
        if custom_times:
            return custom_times
        
        frequency_times = {
            'once_daily': ['09:00'],
            'twice_daily': ['09:00', '21:00'],
            'thrice_daily': ['09:00', '14:00', '21:00'],
            'four_times': ['08:00', '12:00', '16:00', '20:00'],
            'every_4_hours': ['06:00', '10:00', '14:00', '18:00', '22:00'],
            'every_6_hours': ['06:00', '12:00', '18:00', '00:00'],
            'every_8_hours': ['08:00', '16:00', '00:00'],
            'every_12_hours': ['08:00', '20:00'],
            'weekly': ['09:00'],
            'as_needed': [],
        }
        
        return frequency_times.get(frequency, ['09:00'])
    
    @transaction.atomic
    def update_reminder(
        self,
        reminder: MedicineReminder,
        **update_data
    ) -> MedicineReminder:
        """
        Update reminder settings.
        
        Args:
            reminder: Reminder instance
            **update_data: Fields to update
        
        Returns:
            Updated reminder
        """
        allowed_fields = [
            'reminder_times', 'days_of_week', 'end_date', 'instructions',
            'status', 'notify_before_minutes', 'notify_family_helper',
            'allow_snooze', 'snooze_minutes', 'max_snoozes'
        ]
        
        for field, value in update_data.items():
            if field in allowed_fields and value is not None:
                setattr(reminder, field, value)
        
        reminder.save()
        
        logger.info(f"Reminder updated: {reminder.id}")
        
        return reminder
    
    def pause_reminder(self, reminder: MedicineReminder) -> MedicineReminder:
        """Pause a reminder."""
        reminder.status = 'paused'
        reminder.save()
        logger.info(f"Reminder paused: {reminder.id}")
        return reminder
    
    def resume_reminder(self, reminder: MedicineReminder) -> MedicineReminder:
        """Resume a paused reminder."""
        reminder.status = 'active'
        reminder.save()
        logger.info(f"Reminder resumed: {reminder.id}")
        return reminder
    
    def cancel_reminder(self, reminder: MedicineReminder) -> MedicineReminder:
        """Cancel a reminder."""
        reminder.status = 'cancelled'
        reminder.save()
        logger.info(f"Reminder cancelled: {reminder.id}")
        return reminder
    
    def _generate_logs_for_date(
        self,
        reminder: MedicineReminder,
        target_date: date
    ) -> List[ReminderLog]:
        """
        Generate reminder logs for a specific date.
        
        Args:
            reminder: Reminder instance
            target_date: Date to generate logs for
        
        Returns:
            List of created logs
        """
        if not reminder.is_active_today:
            return []
        
        # Check date bounds
        if reminder.start_date > target_date:
            return []
        
        if reminder.end_date and reminder.end_date < target_date:
            return []
        
        # Check day of week
        if reminder.days_of_week:
            if target_date.weekday() not in reminder.days_of_week:
                return []
        
        logs = []
        for time_str in reminder.reminder_times:
            try:
                reminder_time = datetime.strptime(time_str, '%H:%M').time()
                
                # Check if log already exists
                existing = ReminderLog.objects.filter(
                    reminder=reminder,
                    scheduled_date=target_date,
                    scheduled_time=reminder_time
                ).exists()
                
                if not existing:
                    log = ReminderLog.objects.create(
                        reminder=reminder,
                        scheduled_date=target_date,
                        scheduled_time=reminder_time,
                        response='pending'
                    )
                    logs.append(log)
            except ValueError:
                continue
        
        return logs
    
    def generate_daily_logs(self, target_date: Optional[date] = None) -> int:
        """
        Generate reminder logs for all active reminders for a date.
        Should be run daily via management command/celery.
        
        Args:
            target_date: Date to generate logs for (default: today)
        
        Returns:
            Number of logs created
        """
        if target_date is None:
            target_date = timezone.now().date()
        
        active_reminders = MedicineReminder.objects.filter(
            status='active',
            start_date__lte=target_date
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=target_date)
        )
        
        total_created = 0
        for reminder in active_reminders:
            logs = self._generate_logs_for_date(reminder, target_date)
            total_created += len(logs)
        
        if total_created > 0:
            logger.info(f"Generated {total_created} reminder logs for {target_date}")
        
        return total_created
    
    def get_today_reminders(self, user) -> Dict[str, Any]:
        """
        Get today's reminders for user.
        
        Args:
            user: User instance
        
        Returns:
            Dictionary with today's reminder data
        """
        today = timezone.now().date()
        
        logs = ReminderLog.objects.filter(
            reminder__user=user,
            scheduled_date=today
        ).select_related('reminder').order_by('scheduled_time')
        
        total = logs.count()
        taken = logs.filter(response='taken').count()
        skipped = logs.filter(response='skipped').count()
        missed = logs.filter(response='missed').count()
        pending = logs.filter(response__in=['pending', 'snoozed']).count()
        
        return {
            'date': today.isoformat(),
            'total_reminders': total,
            'completed': taken,
            'skipped': skipped,
            'missed': missed,
            'pending': pending,
            'reminders': list(logs),
        }
    
    def get_upcoming_reminders(
        self,
        user,
        hours: int = 24
    ) -> List[ReminderLog]:
        """
        Get upcoming reminders within specified hours.
        
        Args:
            user: User instance
            hours: Number of hours to look ahead
        
        Returns:
            List of upcoming reminder logs
        """
        now = timezone.now()
        end_time = now + timedelta(hours=hours)
        
        today = now.date()
        tomorrow = today + timedelta(days=1)
        
        logs = ReminderLog.objects.filter(
            reminder__user=user,
            scheduled_date__in=[today, tomorrow],
            response__in=['pending', 'snoozed']
        ).select_related('reminder').order_by('scheduled_date', 'scheduled_time')
        
        # Filter by actual datetime
        upcoming = []
        for log in logs:
            scheduled_dt = datetime.combine(
                log.scheduled_date,
                log.scheduled_time
            )
            scheduled_dt = timezone.make_aware(scheduled_dt)
            
            if now <= scheduled_dt <= end_time:
                upcoming.append(log)
        
        return upcoming
    
    @transaction.atomic
    def mark_taken(
        self,
        reminder_log: ReminderLog,
        notes: str = ''
    ) -> ReminderLog:
        """
        Mark medicine as taken.
        
        Args:
            reminder_log: ReminderLog instance
            notes: Optional notes
        
        Returns:
            Updated log
        """
        reminder_log.response = 'taken'
        reminder_log.responded_at = timezone.now()
        reminder_log.notes = notes
        reminder_log.save()
        
        logger.info(f"Reminder marked taken: {reminder_log.id}")
        
        return reminder_log
    
    @transaction.atomic
    def mark_skipped(
        self,
        reminder_log: ReminderLog,
        notes: str = ''
    ) -> ReminderLog:
        """
        Mark medicine as skipped.
        
        Args:
            reminder_log: ReminderLog instance
            notes: Reason for skipping
        
        Returns:
            Updated log
        """
        reminder_log.response = 'skipped'
        reminder_log.responded_at = timezone.now()
        reminder_log.notes = notes
        reminder_log.save()
        
        logger.info(f"Reminder marked skipped: {reminder_log.id}")
        
        return reminder_log
    
    @transaction.atomic
    def snooze_reminder(
        self,
        reminder_log: ReminderLog
    ) -> Dict[str, Any]:
        """
        Snooze a reminder.
        
        Args:
            reminder_log: ReminderLog instance
        
        Returns:
            Dictionary with snooze result
        """
        reminder = reminder_log.reminder
        
        if not reminder.allow_snooze:
            return {
                'success': False,
                'message': 'Snooze is not allowed for this reminder'
            }
        
        if reminder_log.snooze_count >= reminder.max_snoozes:
            return {
                'success': False,
                'message': f'Maximum snoozes ({reminder.max_snoozes}) reached'
            }
        
        reminder_log.response = 'snoozed'
        reminder_log.snooze_count += 1
        reminder_log.last_snoozed_at = timezone.now()
        reminder_log.save()
        
        next_reminder = timezone.now() + timedelta(minutes=reminder.snooze_minutes)
        
        logger.info(
            f"Reminder snoozed: {reminder_log.id} "
            f"(count: {reminder_log.snooze_count}/{reminder.max_snoozes})"
        )
        
        return {
            'success': True,
            'message': f'Snoozed for {reminder.snooze_minutes} minutes',
            'next_reminder_at': next_reminder.isoformat(),
            'snooze_count': reminder_log.snooze_count,
            'max_snoozes': reminder.max_snoozes,
        }
    
    def mark_missed_reminders(self) -> int:
        """
        Mark past pending reminders as missed.
        Should be run periodically via management command/celery.
        
        Returns:
            Number of reminders marked missed
        """
        now = timezone.now()
        today = now.date()
        current_time = now.time()
        
        # Get pending reminders from past dates
        past_pending = ReminderLog.objects.filter(
            response__in=['pending', 'snoozed'],
            scheduled_date__lt=today
        )
        
        # Get pending reminders from today that are past their time
        # (with 30 minute grace period)
        grace_time = (now - timedelta(minutes=30)).time()
        
        today_missed = ReminderLog.objects.filter(
            response__in=['pending', 'snoozed'],
            scheduled_date=today,
            scheduled_time__lt=grace_time
        )
        
        # Combine and update
        missed_count = past_pending.count() + today_missed.count()
        
        past_pending.update(response='missed')
        today_missed.update(response='missed')
        
        if missed_count > 0:
            logger.info(f"Marked {missed_count} reminders as missed")
        
        return missed_count
    
    def get_adherence_stats(
        self,
        user,
        days: int = 7
    ) -> Dict[str, Any]:
        """
        Get medication adherence statistics.
        
        Args:
            user: User instance
            days: Number of days to analyze
        
        Returns:
            Dictionary with adherence stats
        """
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days - 1)
        
        logs = ReminderLog.objects.filter(
            reminder__user=user,
            scheduled_date__range=[start_date, end_date]
        )
        
        total = logs.count()
        taken = logs.filter(response='taken').count()
        skipped = logs.filter(response='skipped').count()
        missed = logs.filter(response='missed').count()
        
        adherence_percent = 0
        if total > 0:
            adherence_percent = round((taken / total) * 100, 1)
        
        # Get stats by medicine
        by_medicine = logs.values(
            'reminder__medicine_name'
        ).annotate(
            total=Count('id'),
            taken=Count('id', filter=Q(response='taken')),
            skipped=Count('id', filter=Q(response='skipped')),
            missed=Count('id', filter=Q(response='missed')),
        )
        
        medicine_stats = []
        for stat in by_medicine:
            med_total = stat['total']
            med_taken = stat['taken']
            med_adherence = round((med_taken / med_total) * 100, 1) if med_total > 0 else 0
            
            medicine_stats.append({
                'medicine_name': stat['reminder__medicine_name'],
                'total': med_total,
                'taken': med_taken,
                'skipped': stat['skipped'],
                'missed': stat['missed'],
                'adherence_percentage': med_adherence,
            })
        
        return {
            'period': f'{days} days',
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'total_scheduled': total,
            'taken': taken,
            'skipped': skipped,
            'missed': missed,
            'adherence_percentage': adherence_percent,
            'by_medicine': medicine_stats,
        }
    
    def send_reminder_notifications(self) -> int:
        """
        Send notifications for due reminders.
        Should be run every few minutes via celery/cron.
        
        Returns:
            Number of notifications sent
        """
        now = timezone.now()
        today = now.date()
        current_time = now.time()
        
        # Find reminders due in the next 5 minutes
        time_window = (now + timedelta(minutes=5)).time()
        
        due_logs = ReminderLog.objects.filter(
            response='pending',
            scheduled_date=today,
            scheduled_time__lte=time_window,
            scheduled_time__gte=current_time,
            notification_sent_at__isnull=True
        ).select_related('reminder', 'reminder__user')
        
        sent_count = 0
        
        for log in due_logs:
            try:
                self._send_notification(log)
                log.notification_sent_at = timezone.now()
                log.save()
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send reminder notification {log.id}: {e}")
        
        if sent_count > 0:
            logger.info(f"Sent {sent_count} reminder notifications")
        
        return sent_count
    
    def _send_notification(self, reminder_log: ReminderLog):
        """
        Send notification for a reminder.
        
        Args:
            reminder_log: ReminderLog instance
        """
        reminder = reminder_log.reminder
        user = reminder.user
        
        # Build notification content
        title = f"💊 Time for {reminder.medicine_name}"
        body = f"Take {reminder.dosage}"
        
        if reminder.instructions:
            body += f"\n{reminder.instructions}"
        
        # Try to send via FCM
        try:
            from apps.notifications.services.fcm_service import FCMService
            from apps.notifications.models import DeviceToken
            
            tokens = DeviceToken.objects.filter(
                user=user,
                is_active=True
            ).values_list('fcm_token', flat=True)
            
            if tokens:
                fcm_service = FCMService()
                for token in tokens:
                    fcm_service.send_notification(
                        token=token,
                        title=title,
                        body=body,
                        data={
                            'type': 'medicine_reminder',
                            'reminder_log_id': str(reminder_log.id),
                            'reminder_id': str(reminder.id),
                            'medicine_name': reminder.medicine_name,
                        }
                    )
                
                logger.debug(f"Sent FCM notification for reminder {reminder_log.id}")
        except ImportError:
            logger.warning("FCM service not available")
        except Exception as e:
            logger.error(f"FCM notification error: {e}")
        
        # Also notify family helper if enabled
        if reminder.notify_family_helper:
            self._notify_family_helper(reminder_log)
    
    def _notify_family_helper(self, reminder_log: ReminderLog):
        """
        Notify family helper about reminder.
        
        Args:
            reminder_log: ReminderLog instance
        """
        reminder = reminder_log.reminder
        user = reminder.user
        
        try:
            # Get family helpers
            from apps.users.models import FamilyHelper
            
            helpers = FamilyHelper.objects.filter(
                patient=user,
                is_active=True
            )
            
            for helper in helpers:
                # Send notification to helper
                title = f"💊 Medicine Reminder for {user.get_full_name()}"
                body = f"{reminder.medicine_name} - {reminder.dosage}"
                
                # Logic to send notification to helper
                # This depends on how helpers are notified in your system
                pass
        except ImportError:
            pass
        except Exception as e:
            logger.error(f"Failed to notify family helper: {e}")