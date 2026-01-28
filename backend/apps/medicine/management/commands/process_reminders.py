"""
Management command to process reminders.

- Send notifications for due reminders
- Mark missed reminders

Should be run every few minutes (e.g., via cron every 5 minutes).

Usage:
    python manage.py process_reminders
    python manage.py process_reminders --send-notifications
    python manage.py process_reminders --mark-missed
    python manage.py process_reminders --all
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.medicine.services.reminder_service import ReminderService


class Command(BaseCommand):
    help = 'Process medicine reminders - send notifications and mark missed'

    def add_arguments(self, parser):
        parser.add_argument(
            '--send-notifications',
            action='store_true',
            help='Send notifications for due reminders',
        )
        parser.add_argument(
            '--mark-missed',
            action='store_true',
            help='Mark past reminders as missed',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Run all processing tasks',
        )

    def handle(self, *args, **options):
        reminder_service = ReminderService()
        
        run_all = options.get('all', False)
        send_notifications = options.get('send_notifications', False) or run_all
        mark_missed = options.get('mark_missed', False) or run_all
        
        # If no options specified, run all by default
        if not send_notifications and not mark_missed:
            send_notifications = True
            mark_missed = True
        
        self.stdout.write(f'Processing reminders at {timezone.now().isoformat()}...')
        
        if send_notifications:
            sent_count = reminder_service.send_reminder_notifications()
            self.stdout.write(f'  📱 Sent {sent_count} notifications')
        
        if mark_missed:
            missed_count = reminder_service.mark_missed_reminders()
            self.stdout.write(f'  ⏰ Marked {missed_count} reminders as missed')
        
        self.stdout.write(self.style.SUCCESS('✓ Reminder processing complete'))