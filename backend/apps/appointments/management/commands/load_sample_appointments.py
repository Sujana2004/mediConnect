"""
Management command to load sample appointment data for testing.

Usage:
    python manage.py load_sample_appointments
    python manage.py load_sample_appointments --with-users
    python manage.py load_sample_appointments --clear
"""

import logging
import random
from datetime import datetime, timedelta, time
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction

from apps.appointments.models import (
    DoctorSchedule,
    ScheduleException,
    TimeSlot,
    Appointment,
)
from apps.appointments.services import SlotService, ScheduleService

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = 'Load sample appointment data for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing appointment data before loading',
        )
        parser.add_argument(
            '--with-users',
            action='store_true',
            help='Create test users if none exist',
        )
        parser.add_argument(
            '--schedules-only',
            action='store_true',
            help='Only create doctor schedules',
        )
        parser.add_argument(
            '--appointments-count',
            type=int,
            default=20,
            help='Number of sample appointments to create (default: 20)',
        )

    def handle(self, *args, **options):
        clear = options.get('clear', False)
        with_users = options.get('with_users', False)
        schedules_only = options.get('schedules_only', False)
        appointments_count = options.get('appointments_count', 20)

        if clear:
            self._clear_data()

        self.stdout.write(
            self.style.NOTICE('Loading sample appointment data...\n')
        )

        # Get or create doctors and patients
        doctors = self._get_doctors()
        patients = self._get_patients()

        # If no users found and --with-users flag is set, create them
        if not doctors or not patients:
            if with_users:
                self.stdout.write(
                    self.style.WARNING('No users found. Creating test users...\n')
                )
                call_command('create_test_users', '--doctors', '3', '--patients', '10')
                
                # Refresh lists
                doctors = self._get_doctors()
                patients = self._get_patients()
            else:
                if not doctors:
                    self.stdout.write(
                        self.style.ERROR(
                            'No doctors found. Run with --with-users to create test users, or:\n'
                            '  python manage.py create_test_users'
                        )
                    )
                    return
                if not patients and not schedules_only:
                    self.stdout.write(
                        self.style.ERROR(
                            'No patients found. Run with --with-users to create test users, or:\n'
                            '  python manage.py create_test_users'
                        )
                    )
                    return

        # Create schedules for doctors
        self._create_schedules(doctors)

        if schedules_only:
            self.stdout.write(
                self.style.SUCCESS('\n✓ Schedules created. Skipping appointments.')
            )
            return

        # Generate slots
        self._generate_slots(doctors)

        # Create sample appointments
        self._create_appointments(doctors, patients, appointments_count)

        self.stdout.write('')
        self.stdout.write(
            self.style.SUCCESS('✓ Sample data loaded successfully!')
        )

    def _clear_data(self):
        """Clear existing appointment data."""
        self.stdout.write('Clearing existing data...')
        
        Appointment.objects.all().delete()
        TimeSlot.objects.all().delete()
        ScheduleException.objects.all().delete()
        DoctorSchedule.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS('  ✓ Data cleared'))

    def _get_doctors(self):
        """Get all doctor users."""
        doctors = []
        
        # Method 1: Check for doctor_profile relation
        try:
            from apps.users.models import DoctorProfile
            doctor_ids = DoctorProfile.objects.values_list('user_id', flat=True)
            doctors = list(User.objects.filter(id__in=doctor_ids))
            if doctors:
                self.stdout.write(f'Found {len(doctors)} doctors (via DoctorProfile)')
                return doctors
        except Exception as e:
            logger.debug(f"DoctorProfile method failed: {e}")
        
        # Method 2: Check role field
        try:
            doctors = list(User.objects.filter(role='doctor'))
            if doctors:
                self.stdout.write(f'Found {len(doctors)} doctors (via role field)')
                return doctors
        except Exception as e:
            logger.debug(f"Role method failed: {e}")
        
        # Method 3: Check user_type field
        try:
            doctors = list(User.objects.filter(user_type='doctor'))
            if doctors:
                self.stdout.write(f'Found {len(doctors)} doctors (via user_type field)')
                return doctors
        except Exception as e:
            logger.debug(f"User_type method failed: {e}")
        
        self.stdout.write(f'Found {len(doctors)} doctors')
        return doctors

    def _get_patients(self):
        """Get all patient users."""
        patients = []
        
        # Method 1: Check for patient_profile relation
        try:
            from apps.users.models import PatientProfile
            patient_ids = PatientProfile.objects.values_list('user_id', flat=True)
            patients = list(User.objects.filter(id__in=patient_ids))
            if patients:
                self.stdout.write(f'Found {len(patients)} patients (via PatientProfile)')
                return patients
        except Exception as e:
            logger.debug(f"PatientProfile method failed: {e}")
        
        # Method 2: Check role field
        try:
            patients = list(User.objects.filter(role='patient'))
            if patients:
                self.stdout.write(f'Found {len(patients)} patients (via role field)')
                return patients
        except Exception as e:
            logger.debug(f"Role method failed: {e}")
        
        # Method 3: Check user_type field
        try:
            patients = list(User.objects.filter(user_type='patient'))
            if patients:
                self.stdout.write(f'Found {len(patients)} patients (via user_type field)')
                return patients
        except Exception as e:
            logger.debug(f"User_type method failed: {e}")
        
        self.stdout.write(f'Found {len(patients)} patients')
        return patients

    @transaction.atomic
    def _create_schedules(self, doctors):
        """Create schedules for doctors."""
        self.stdout.write('\nCreating doctor schedules...')
        
        # Sample schedule configurations
        schedule_configs = [
            # Config 1: Mon-Fri 9AM-5PM
            {
                'days': [0, 1, 2, 3, 4],  # Mon-Fri
                'start': time(9, 0),
                'end': time(17, 0),
                'break_start': time(13, 0),
                'break_end': time(14, 0),
                'slot_duration': 30,
                'fee': 500,
            },
            # Config 2: Mon-Sat 10AM-6PM
            {
                'days': [0, 1, 2, 3, 4, 5],  # Mon-Sat
                'start': time(10, 0),
                'end': time(18, 0),
                'break_start': time(13, 30),
                'break_end': time(14, 30),
                'slot_duration': 20,
                'fee': 300,
            },
            # Config 3: Tue, Thu, Sat 8AM-2PM
            {
                'days': [1, 3, 5],  # Tue, Thu, Sat
                'start': time(8, 0),
                'end': time(14, 0),
                'break_start': None,
                'break_end': None,
                'slot_duration': 15,
                'fee': 400,
            },
        ]
        
        for i, doctor in enumerate(doctors):
            config = schedule_configs[i % len(schedule_configs)]
            
            for day in config['days']:
                DoctorSchedule.objects.update_or_create(
                    doctor=doctor,
                    day_of_week=day,
                    defaults={
                        'start_time': config['start'],
                        'end_time': config['end'],
                        'break_start': config['break_start'],
                        'break_end': config['break_end'],
                        'slot_duration_minutes': config['slot_duration'],
                        'max_patients_per_slot': 1,
                        'consultation_fee': config['fee'],
                        'is_active': True,
                    }
                )
            
            self.stdout.write(
                f'  ✓ Dr. {doctor.get_full_name()}: '
                f'{len(config["days"])} days/week'
            )
        
        # Add some schedule exceptions
        self._create_exceptions(doctors)

    def _create_exceptions(self, doctors):
        """Create sample schedule exceptions."""
        self.stdout.write('\nCreating schedule exceptions...')
        
        today = timezone.now().date()
        
        for doctor in doctors[:2]:  # Only for first 2 doctors
            # Add a leave day next week
            leave_date = today + timedelta(days=random.randint(7, 14))
            
            ScheduleException.objects.update_or_create(
                doctor=doctor,
                exception_date=leave_date,
                defaults={
                    'exception_type': 'leave',
                    'reason': 'Personal leave',
                }
            )
            
            self.stdout.write(
                f'  ✓ Dr. {doctor.get_full_name()}: Leave on {leave_date}'
            )

    def _generate_slots(self, doctors):
        """Generate time slots for doctors."""
        self.stdout.write('\nGenerating time slots...')
        
        today = timezone.now().date()
        
        for doctor in doctors:
            try:
                slots_by_date = SlotService.generate_slots_for_range(
                    doctor=doctor,
                    start_date=today,
                    days=14  # 2 weeks
                )
                
                total_slots = sum(len(slots) for slots in slots_by_date.values())
                self.stdout.write(
                    f'  ✓ Dr. {doctor.get_full_name()}: {total_slots} slots'
                )
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(
                        f'  ! Dr. {doctor.get_full_name()}: {e}'
                    )
                )

    @transaction.atomic
    def _create_appointments(self, doctors, patients, count):
        """Create sample appointments."""
        self.stdout.write(f'\nCreating {count} sample appointments...')
        
        today = timezone.now().date()
        
        # Sample reasons
        reasons = [
            'General checkup',
            'Fever and cold',
            'Headache',
            'Follow-up visit',
            'Blood pressure check',
            'Diabetes consultation',
            'Skin problem',
            'Joint pain',
            'Stomach issue',
            'Annual health checkup',
        ]
        
        # Sample symptoms
        symptoms_list = [
            'Fever, cough, body pain',
            'Headache for 3 days',
            'Stomach pain and nausea',
            'Skin rash and itching',
            'Joint pain in knees',
            'Difficulty breathing',
            'Back pain',
            'Fatigue and weakness',
            'Sore throat',
            'Chest discomfort',
        ]
        
        statuses = ['pending', 'confirmed', 'completed', 'cancelled']
        status_weights = [0.3, 0.4, 0.2, 0.1]
        
        created = 0
        attempts = 0
        max_attempts = count * 3  # Prevent infinite loop
        
        while created < count and attempts < max_attempts:
            attempts += 1
            
            doctor = random.choice(doctors)
            patient = random.choice(patients)
            
            # Skip if patient is same as doctor
            if patient.id == doctor.id:
                continue
            
            # Get a random date in next 2 weeks
            days_ahead = random.randint(0, 14)
            apt_date = today + timedelta(days=days_ahead)
            
            # Get available slots for this doctor on this date
            slots = TimeSlot.objects.filter(
                doctor=doctor,
                slot_date=apt_date,
                status='available'
            )
            
            if not slots.exists():
                continue
            
            slot = random.choice(list(slots))
            
            # Check if appointment already exists
            if Appointment.objects.filter(
                patient=patient,
                doctor=doctor,
                appointment_date=apt_date
            ).exists():
                continue
            
            # Determine status
            apt_status = random.choices(statuses, weights=status_weights)[0]
            
            # Past dates should be completed or cancelled
            if apt_date < today:
                apt_status = random.choice(['completed', 'cancelled', 'no_show'])
            
            try:
                appointment = Appointment.objects.create(
                    patient=patient,
                    doctor=doctor,
                    time_slot=slot,
                    appointment_date=apt_date,
                    start_time=slot.start_time,
                    end_time=slot.end_time,
                    status=apt_status,
                    booking_type=random.choice(['online', 'phone']),
                    reason=random.choice(reasons),
                    symptoms=random.choice(symptoms_list),
                )
                
                # Update slot
                slot.current_bookings += 1
                if slot.current_bookings >= slot.max_bookings:
                    slot.status = 'booked'
                slot.save()
                
                # Set timestamps based on status
                if apt_status == 'confirmed':
                    appointment.confirmed_at = timezone.now() - timedelta(hours=random.randint(1, 48))
                elif apt_status == 'completed':
                    appointment.confirmed_at = timezone.now() - timedelta(days=random.randint(1, 7))
                    appointment.completed_at = timezone.now() - timedelta(days=random.randint(0, 3))
                    appointment.doctor_notes = 'Patient is doing well. Follow up in 2 weeks if symptoms persist.'
                    appointment.consultation_fee = random.choice([300, 400, 500])
                elif apt_status == 'cancelled':
                    appointment.cancelled_at = timezone.now() - timedelta(hours=random.randint(1, 72))
                    appointment.cancelled_by = random.choice(['patient', 'doctor'])
                    appointment.cancellation_reason = 'Unable to attend'
                
                appointment.save()
                created += 1
                
            except Exception as e:
                logger.debug(f'Could not create appointment: {e}')
                continue
        
        self.stdout.write(
            self.style.SUCCESS(f'  ✓ Created {created} appointments')
        )
        
        # Show breakdown
        self.stdout.write('\n  Status breakdown:')
        for status_choice in statuses + ['no_show']:
            status_count = Appointment.objects.filter(status=status_choice).count()
            if status_count > 0:
                self.stdout.write(f'    {status_choice}: {status_count}')