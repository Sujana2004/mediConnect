"""
Management command to process appointment reminders.

Usage:
    python manage.py process_reminders
    python manage.py process_reminders --batch-size 100
    python manage.py process_reminders --dry-run
"""

import logging
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.appointments.services import ReminderService
from apps.appointments.models import AppointmentReminder

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Process and send pending appointment reminders'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=50,
            help='Number of reminders to process at once (default: 50)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be sent without actually sending',
        )
        parser.add_argument(
            '--show-pending',
            action='store_true',
            help='Show all pending reminders without processing',
        )

    def handle(self, *args, **options):
        batch_size = options.get('batch_size', 50)
        dry_run = options.get('dry_run', False)
        show_pending = options.get('show_pending', False)

        if show_pending:
            self._show_pending_reminders()
            return

        if dry_run:
            self._dry_run()
            return

        self._process_reminders(batch_size)

    def _show_pending_reminders(self):
        """Show all pending reminders."""
        pending = AppointmentReminder.objects.filter(
            status='pending'
        ).select_related(
            'appointment',
            'appointment__patient',
            'appointment__doctor'
        ).order_by('scheduled_time')

        if not pending.exists():
            self.stdout.write(
                self.style.SUCCESS('No pending reminders found.')
            )
            return

        self.stdout.write(f'Found {pending.count()} pending reminders:\n')
        self.stdout.write('-' * 80)

        for reminder in pending[:50]:  # Show max 50
            apt = reminder.appointment
            self.stdout.write(
                f'  [{reminder.reminder_type}] '
                f'{apt.patient.get_full_name()} -> Dr. {apt.doctor.get_full_name()}'
            )
            self.stdout.write(
                f'    Appointment: {apt.appointment_date} at {apt.start_time}'
            )
            self.stdout.write(
                f'    Scheduled: {reminder.scheduled_time}'
            )
            self.stdout.write('')

        if pending.count() > 50:
            self.stdout.write(f'  ... and {pending.count() - 50} more')

    def _dry_run(self):
        """Show what would be processed without sending."""
        self.stdout.write(
            self.style.NOTICE('DRY RUN - No reminders will be sent\n')
        )

        pending = ReminderService.get_pending_reminders(limit=100)

        if not pending:
            self.stdout.write('No reminders due to be sent.')
            return

        self.stdout.write(f'{len(pending)} reminders would be sent:\n')

        for reminder in pending:
            apt = reminder.appointment
            content = ReminderService.get_reminder_content(reminder, 'en')
            
            self.stdout.write(f'  To: {apt.patient.phone_number}')
            self.stdout.write(f'  Title: {content["title"]}')
            self.stdout.write(f'  Body: {content["body"]}')
            self.stdout.write('')

    def _process_reminders(self, batch_size):
        """Process and send reminders."""
        self.stdout.write(
            self.style.NOTICE(f'Processing reminders (batch size: {batch_size})...\n')
        )

        stats = ReminderService.process_pending_reminders(batch_size=batch_size)

        self.stdout.write('')
        self.stdout.write('Results:')
        self.stdout.write(f'  Processed: {stats["processed"]}')
        self.stdout.write(
            self.style.SUCCESS(f'  Sent: {stats["sent"]}')
        )
        
        if stats['failed'] > 0:
            self.stdout.write(
                self.style.ERROR(f'  Failed: {stats["failed"]}')
            )
            
            for error in stats.get('errors', [])[:5]:
                self.stdout.write(
                    self.style.WARNING(
                        f'    - {error["reminder_id"]}: {error["error"]}'
                    )
                )

        # Show remaining pending
        remaining = AppointmentReminder.objects.filter(status='pending').count()
        self.stdout.write(f'\nRemaining pending: {remaining}')