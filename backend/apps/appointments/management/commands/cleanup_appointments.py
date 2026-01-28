"""
Management command to clean up old appointment data.

Usage:
    python manage.py cleanup_appointments
    python manage.py cleanup_appointments --days 90
    python manage.py cleanup_appointments --dry-run
"""

import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.appointments.models import (
    TimeSlot,
    Appointment,
    AppointmentQueue,
    AppointmentReminder,
)
from apps.appointments.services import SlotService, ReminderService

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Clean up old appointment data (slots, reminders, queue entries)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Delete data older than this many days (default: 90)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--include-appointments',
            action='store_true',
            help='Also delete old completed/cancelled appointments (CAUTION)',
        )
        parser.add_argument(
            '--slots-only',
            action='store_true',
            help='Only clean up time slots',
        )
        parser.add_argument(
            '--reminders-only',
            action='store_true',
            help='Only clean up reminders',
        )

    def handle(self, *args, **options):
        days = options.get('days', 90)
        dry_run = options.get('dry_run', False)
        include_appointments = options.get('include_appointments', False)
        slots_only = options.get('slots_only', False)
        reminders_only = options.get('reminders_only', False)

        cutoff_date = timezone.now().date() - timedelta(days=days)
        
        self.stdout.write(
            self.style.NOTICE(
                f'Cleaning up data older than {cutoff_date} ({days} days)...\n'
            )
        )

        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN - Nothing will be deleted\n')
            )

        results = {}

        if slots_only:
            results['slots'] = self._cleanup_slots(cutoff_date, dry_run)
        elif reminders_only:
            results['reminders'] = self._cleanup_reminders(cutoff_date, dry_run)
        else:
            results['slots'] = self._cleanup_slots(cutoff_date, dry_run)
            results['reminders'] = self._cleanup_reminders(cutoff_date, dry_run)
            results['queue'] = self._cleanup_queue(cutoff_date, dry_run)
            
            if include_appointments:
                results['appointments'] = self._cleanup_appointments(cutoff_date, dry_run)

        # Summary
        self.stdout.write('')
        self.stdout.write('=' * 50)
        self.stdout.write('SUMMARY:')
        
        for category, count in results.items():
            action = 'Would delete' if dry_run else 'Deleted'
            self.stdout.write(f'  {category}: {action} {count} records')

        total = sum(results.values())
        self.stdout.write(f'\n  Total: {total} records')

    def _cleanup_slots(self, cutoff_date, dry_run):
        """Clean up old time slots."""
        self.stdout.write('Cleaning up time slots...')
        
        old_slots = TimeSlot.objects.filter(slot_date__lt=cutoff_date)
        count = old_slots.count()
        
        if not dry_run and count > 0:
            old_slots.delete()
            self.stdout.write(
                self.style.SUCCESS(f'  ✓ Deleted {count} old slots')
            )
        else:
            self.stdout.write(f'  Found {count} old slots')
        
        return count

    def _cleanup_reminders(self, cutoff_date, dry_run):
        """Clean up old reminders."""
        self.stdout.write('Cleaning up reminders...')
        
        old_reminders = AppointmentReminder.objects.filter(
            status__in=['sent', 'failed'],
            created_at__date__lt=cutoff_date
        )
        count = old_reminders.count()
        
        if not dry_run and count > 0:
            old_reminders.delete()
            self.stdout.write(
                self.style.SUCCESS(f'  ✓ Deleted {count} old reminders')
            )
        else:
            self.stdout.write(f'  Found {count} old reminders')
        
        return count

    def _cleanup_queue(self, cutoff_date, dry_run):
        """Clean up old queue entries."""
        self.stdout.write('Cleaning up queue entries...')
        
        # Use shorter retention for queue (30 days)
        queue_cutoff = timezone.now().date() - timedelta(days=30)
        
        old_queue = AppointmentQueue.objects.filter(queue_date__lt=queue_cutoff)
        count = old_queue.count()
        
        if not dry_run and count > 0:
            old_queue.delete()
            self.stdout.write(
                self.style.SUCCESS(f'  ✓ Deleted {count} old queue entries')
            )
        else:
            self.stdout.write(f'  Found {count} old queue entries')
        
        return count

    def _cleanup_appointments(self, cutoff_date, dry_run):
        """Clean up old completed/cancelled appointments."""
        self.stdout.write(
            self.style.WARNING('Cleaning up old appointments (CAUTION)...')
        )
        
        old_appointments = Appointment.objects.filter(
            appointment_date__lt=cutoff_date,
            status__in=['completed', 'cancelled', 'no_show']
        )
        count = old_appointments.count()
        
        if not dry_run and count > 0:
            old_appointments.delete()
            self.stdout.write(
                self.style.SUCCESS(f'  ✓ Deleted {count} old appointments')
            )
        else:
            self.stdout.write(f'  Found {count} old appointments')
        
        return count