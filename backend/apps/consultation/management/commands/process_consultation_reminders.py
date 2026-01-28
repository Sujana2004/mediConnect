"""
Process Consultation Reminders
==============================
Send reminders for upcoming consultations.

Usage:
    python manage.py process_consultation_reminders
    python manage.py process_consultation_reminders --minutes 30
"""

from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.consultation.models import Consultation
from apps.consultation.services import ConsultationNotificationService


class Command(BaseCommand):
    help = 'Send reminders for upcoming consultations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--minutes',
            type=int,
            default=15,
            help='Send reminders for consultations starting in N minutes (default: 15)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be sent without actually sending'
        )

    def handle(self, *args, **options):
        minutes = options['minutes']
        dry_run = options['dry_run']
        
        now = timezone.now()
        reminder_start = now + timedelta(minutes=minutes - 2)
        reminder_end = now + timedelta(minutes=minutes + 3)
        
        self.stdout.write(f"Looking for consultations starting between {reminder_start} and {reminder_end}")
        
        consultations = Consultation.objects.filter(
            status='scheduled',
            scheduled_start__gte=reminder_start,
            scheduled_start__lt=reminder_end
        ).select_related('doctor', 'patient')
        
        count = consultations.count()
        
        if count == 0:
            self.stdout.write("No consultations found for reminders")
            return
        
        self.stdout.write(f"Found {count} consultations for reminders")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - No reminders will be sent"))
        
        sent = 0
        errors = 0
        
        for consultation in consultations:
            patient = f"{consultation.patient.first_name} {consultation.patient.last_name}"
            doctor = f"Dr. {consultation.doctor.first_name} {consultation.doctor.last_name}"
            time_str = consultation.scheduled_start.strftime('%H:%M')
            
            self.stdout.write(f"  - {patient} with {doctor} at {time_str}")
            
            if not dry_run:
                try:
                    ConsultationNotificationService.send_reminder(
                        consultation,
                        minutes_before=minutes
                    )
                    sent += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"    Error: {e}"))
                    errors += 1
        
        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f"\nSent {sent} reminders, {errors} errors"))