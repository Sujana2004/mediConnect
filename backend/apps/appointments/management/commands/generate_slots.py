"""
Management command to generate time slots for doctors.

Usage:
    python manage.py generate_slots
    python manage.py generate_slots --days 14
    python manage.py generate_slots --doctor-id <uuid>
    python manage.py generate_slots --all-doctors --days 30
"""

import logging
from datetime import timedelta
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.appointments.models import DoctorSchedule
from apps.appointments.services import SlotService

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = 'Generate time slots for doctors based on their schedules'

    def add_arguments(self, parser):
        parser.add_argument(
            '--doctor-id',
            type=str,
            help='Generate slots for a specific doctor (UUID)',
        )
        parser.add_argument(
            '--all-doctors',
            action='store_true',
            help='Generate slots for all doctors with active schedules',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days to generate slots for (default: 7)',
        )
        parser.add_argument(
            '--start-date',
            type=str,
            help='Start date (YYYY-MM-DD). Default: today',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force regenerate even if slots exist',
        )

    def handle(self, *args, **options):
        doctor_id = options.get('doctor_id')
        all_doctors = options.get('all_doctors')
        days = min(options.get('days', 7), 90)  # Max 90 days
        start_date_str = options.get('start_date')
        force = options.get('force')

        # Parse start date
        if start_date_str:
            try:
                from datetime import datetime
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            except ValueError:
                raise CommandError('Invalid date format. Use YYYY-MM-DD.')
        else:
            start_date = timezone.now().date()

        self.stdout.write(
            self.style.NOTICE(f'Generating slots from {start_date} for {days} days...')
        )

        if doctor_id:
            # Generate for specific doctor
            try:
                doctor = User.objects.get(id=doctor_id)
                if not hasattr(doctor, 'doctor_profile'):
                    raise CommandError(f'User {doctor_id} is not a doctor.')
                
                self._generate_for_doctor(doctor, start_date, days)
                
            except User.DoesNotExist:
                raise CommandError(f'Doctor with ID {doctor_id} not found.')
        
        elif all_doctors:
            # Generate for all doctors
            self._generate_for_all_doctors(start_date, days)
        
        else:
            raise CommandError(
                'Please specify --doctor-id <uuid> or --all-doctors'
            )

    def _generate_for_doctor(self, doctor, start_date, days):
        """Generate slots for a single doctor."""
        self.stdout.write(f'Processing Dr. {doctor.get_full_name()}...')
        
        try:
            slots_by_date = SlotService.generate_slots_for_range(
                doctor=doctor,
                start_date=start_date,
                days=days
            )
            
            total_slots = sum(len(slots) for slots in slots_by_date.values())
            dates_covered = len(slots_by_date)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'  ✓ Generated {total_slots} slots for {dates_covered} days'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'  ✗ Error: {e}')
            )

    def _generate_for_all_doctors(self, start_date, days):
        """Generate slots for all doctors with active schedules."""
        # Get doctors with active schedules
        doctor_ids = DoctorSchedule.objects.filter(
            is_active=True
        ).values_list('doctor_id', flat=True).distinct()
        
        if not doctor_ids:
            self.stdout.write(
                self.style.WARNING('No doctors found with active schedules.')
            )
            return
        
        self.stdout.write(f'Found {len(doctor_ids)} doctors with schedules.')
        
        total_doctors = 0
        total_slots = 0
        
        for doctor_id in doctor_ids:
            try:
                doctor = User.objects.get(id=doctor_id)
                
                slots_by_date = SlotService.generate_slots_for_range(
                    doctor=doctor,
                    start_date=start_date,
                    days=days
                )
                
                slot_count = sum(len(slots) for slots in slots_by_date.values())
                total_slots += slot_count
                total_doctors += 1
                
                self.stdout.write(
                    f'  ✓ Dr. {doctor.get_full_name()}: {slot_count} slots'
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Doctor {doctor_id}: {e}')
                )
        
        self.stdout.write('')
        self.stdout.write(
            self.style.SUCCESS(
                f'Summary: Generated {total_slots} slots for {total_doctors} doctors'
            )
        )