"""
Management command to generate daily reminder logs.

Should be run daily (e.g., via cron at midnight).

Usage:
    python manage.py generate_reminder_logs
    python manage.py generate_reminder_logs --date 2025-01-27
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime

from apps.medicine.services.reminder_service import ReminderService


class Command(BaseCommand):
    help = 'Generate reminder logs for active reminders'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            help='Date to generate logs for (YYYY-MM-DD). Default: today',
        )

    def handle(self, *args, **options):
        date_str = options.get('date')
        
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                self.stdout.write(
                    self.style.ERROR('Invalid date format. Use YYYY-MM-DD')
                )
                return
        else:
            target_date = timezone.now().date()
        
        self.stdout.write(f'Generating reminder logs for {target_date}...')
        
        reminder_service = ReminderService()
        count = reminder_service.generate_daily_logs(target_date)
        
        self.stdout.write(
            self.style.SUCCESS(f'✓ Generated {count} reminder logs for {target_date}')
        )