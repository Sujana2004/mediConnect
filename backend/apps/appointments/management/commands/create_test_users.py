"""
Management command to create test users for appointments testing.

Usage:
    python manage.py create_test_users
    python manage.py create_test_users --doctors 5 --patients 10
    python manage.py create_test_users --clear
"""

import logging
import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = 'Create test doctors and patients for appointment testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--doctors',
            type=int,
            default=3,
            help='Number of test doctors to create (default: 3)',
        )
        parser.add_argument(
            '--patients',
            type=int,
            default=10,
            help='Number of test patients to create (default: 10)',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing test users before creating new ones',
        )

    def handle(self, *args, **options):
        num_doctors = options.get('doctors', 3)
        num_patients = options.get('patients', 10)
        clear = options.get('clear', False)

        # Print User model fields for debugging
        self.stdout.write(self.style.NOTICE('Detecting User model fields...'))
        user_fields = [f.name for f in User._meta.get_fields()]
        self.stdout.write(f'  Available fields: {", ".join(user_fields[:20])}...\n')

        if clear:
            self._clear_test_users()

        self.stdout.write(
            self.style.NOTICE(
                f'Creating {num_doctors} doctors and {num_patients} patients...\n'
            )
        )

        doctors = self._create_doctors(num_doctors)
        patients = self._create_patients(num_patients)

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('✓ Test users created successfully!'))
        self.stdout.write('')
        self.stdout.write('Summary:')
        self.stdout.write(f'  Doctors: {len(doctors)}')
        self.stdout.write(f'  Patients: {len(patients)}')
        self.stdout.write('')
        
        if doctors:
            self.stdout.write('Test Doctor Credentials:')
            for doctor in doctors:
                phone = getattr(doctor, 'phone', None) or getattr(doctor, 'phone_number', 'N/A')
                self.stdout.write(f'  Phone: {phone} - Dr. {doctor.get_full_name()}')
        
        self.stdout.write('')
        
        if patients:
            self.stdout.write('Test Patient Credentials:')
            for patient in patients[:3]:  # Show first 3 only
                phone = getattr(patient, 'phone', None) or getattr(patient, 'phone_number', 'N/A')
                self.stdout.write(f'  Phone: {phone} - {patient.get_full_name()}')
            if len(patients) > 3:
                self.stdout.write(f'  ... and {len(patients) - 3} more')

    def _clear_test_users(self):
        """Clear existing test users."""
        self.stdout.write('Clearing existing test users...')
        
        # Delete users with test phone numbers
        # Try both 'phone' and 'phone_number' fields
        deleted_count = 0
        
        try:
            count, _ = User.objects.filter(phone__startswith='+91900000').delete()
            deleted_count += count
        except:
            pass
        
        try:
            count, _ = User.objects.filter(phone_number__startswith='+91900000').delete()
            deleted_count += count
        except:
            pass
        
        self.stdout.write(
            self.style.SUCCESS(f'  ✓ Deleted {deleted_count} test users')
        )

    def _get_phone_field_name(self):
        """Detect the phone field name in User model."""
        user_fields = [f.name for f in User._meta.get_fields()]
        
        if 'phone' in user_fields:
            return 'phone'
        elif 'phone_number' in user_fields:
            return 'phone_number'
        else:
            return None

    def _user_exists(self, phone):
        """Check if user with phone exists."""
        phone_field = self._get_phone_field_name()
        
        if phone_field == 'phone':
            return User.objects.filter(phone=phone).exists()
        elif phone_field == 'phone_number':
            return User.objects.filter(phone_number=phone).exists()
        else:
            return False

    def _get_user_by_phone(self, phone):
        """Get user by phone."""
        phone_field = self._get_phone_field_name()
        
        if phone_field == 'phone':
            return User.objects.get(phone=phone)
        elif phone_field == 'phone_number':
            return User.objects.get(phone_number=phone)
        else:
            return None

    @transaction.atomic
    def _create_doctors(self, count):
        """Create test doctor users."""
        self.stdout.write('Creating doctors...')
        
        phone_field = self._get_phone_field_name()
        if not phone_field:
            self.stdout.write(
                self.style.ERROR('  ✗ Could not detect phone field in User model')
            )
            return []
        
        self.stdout.write(f'  Using phone field: {phone_field}')
        
        # Sample doctor data
        doctor_data = [
            {
                'first_name': 'Rajesh',
                'last_name': 'Kumar',
                'specialization': 'General Physician',
                'qualification': 'MBBS, MD',
                'experience_years': 15,
            },
            {
                'first_name': 'Priya',
                'last_name': 'Sharma',
                'specialization': 'Pediatrician',
                'qualification': 'MBBS, DCH',
                'experience_years': 10,
            },
            {
                'first_name': 'Suresh',
                'last_name': 'Reddy',
                'specialization': 'Cardiologist',
                'qualification': 'MBBS, DM Cardiology',
                'experience_years': 20,
            },
            {
                'first_name': 'Lakshmi',
                'last_name': 'Devi',
                'specialization': 'Gynecologist',
                'qualification': 'MBBS, MS OBG',
                'experience_years': 12,
            },
            {
                'first_name': 'Venkat',
                'last_name': 'Rao',
                'specialization': 'Orthopedic',
                'qualification': 'MBBS, MS Ortho',
                'experience_years': 8,
            },
            {
                'first_name': 'Anitha',
                'last_name': 'Krishnan',
                'specialization': 'Dermatologist',
                'qualification': 'MBBS, DVD',
                'experience_years': 6,
            },
            {
                'first_name': 'Ramesh',
                'last_name': 'Babu',
                'specialization': 'ENT Specialist',
                'qualification': 'MBBS, MS ENT',
                'experience_years': 14,
            },
            {
                'first_name': 'Sunitha',
                'last_name': 'Nair',
                'specialization': 'Ophthalmologist',
                'qualification': 'MBBS, MS Ophthalmology',
                'experience_years': 11,
            },
        ]
        
        doctors = []
        
        for i in range(count):
            data = doctor_data[i % len(doctor_data)]
            phone = f'+9190000000{10 + i}'  # +919000000010, +919000000011, etc.
            
            # Check if user already exists
            if self._user_exists(phone):
                doctor = self._get_user_by_phone(phone)
                self.stdout.write(f'  → Dr. {doctor.get_full_name()} (already exists)')
                doctors.append(doctor)
                continue
            
            try:
                # Build user data dynamically based on available fields
                user_data = {
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'is_active': True,
                }
                
                # Add phone field
                user_data[phone_field] = phone
                
                # Add role/user_type if available
                user_fields = [f.name for f in User._meta.get_fields()]
                if 'role' in user_fields:
                    user_data['role'] = 'doctor'
                if 'user_type' in user_fields:
                    user_data['user_type'] = 'doctor'
                
                # Create user
                doctor = User.objects.create_user(**user_data)
                
                # Create doctor profile
                self._create_doctor_profile(doctor, data)
                
                doctors.append(doctor)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✓ Dr. {doctor.get_full_name()} ({phone})'
                    )
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Error creating doctor: {e}')
                )
        
        return doctors

    def _create_doctor_profile(self, doctor, data):
        """Create doctor profile if the model exists."""
        try:
            from apps.users.models import DoctorProfile
            
            # Check if profile already exists
            if hasattr(doctor, 'doctor_profile') and doctor.doctor_profile:
                profile = doctor.doctor_profile
                profile.specialization = data.get('specialization', '')
                profile.qualification = data.get('qualification', '')
                profile.experience_years = data.get('experience_years', 0)
                profile.is_verified = True
                profile.save()
            else:
                # Create new profile
                profile, created = DoctorProfile.objects.get_or_create(
                    user=doctor,
                    defaults={
                        'specialization': data.get('specialization', ''),
                        'qualification': data.get('qualification', ''),
                        'experience_years': data.get('experience_years', 0),
                        'is_verified': True,
                        'consultation_fee': random.choice([300, 400, 500, 600]),
                    }
                )
        except ImportError:
            logger.debug("DoctorProfile model not found")
        except Exception as e:
            logger.warning(f"Could not create doctor profile: {e}")

    @transaction.atomic
    def _create_patients(self, count):
        """Create test patient users."""
        self.stdout.write('\nCreating patients...')
        
        phone_field = self._get_phone_field_name()
        if not phone_field:
            self.stdout.write(
                self.style.ERROR('  ✗ Could not detect phone field in User model')
            )
            return []
        
        # Sample patient data
        patient_data = [
            {'first_name': 'Ramesh', 'last_name': 'Kumar', 'gender': 'male', 'age': 45},
            {'first_name': 'Lakshmi', 'last_name': 'Devi', 'gender': 'female', 'age': 38},
            {'first_name': 'Suresh', 'last_name': 'Babu', 'gender': 'male', 'age': 52},
            {'first_name': 'Padma', 'last_name': 'Rani', 'gender': 'female', 'age': 29},
            {'first_name': 'Venkat', 'last_name': 'Rao', 'gender': 'male', 'age': 61},
            {'first_name': 'Anitha', 'last_name': 'Kumari', 'gender': 'female', 'age': 35},
            {'first_name': 'Ravi', 'last_name': 'Shankar', 'gender': 'male', 'age': 42},
            {'first_name': 'Sunitha', 'last_name': 'Reddy', 'gender': 'female', 'age': 28},
            {'first_name': 'Krishna', 'last_name': 'Murthy', 'gender': 'male', 'age': 55},
            {'first_name': 'Vijaya', 'last_name': 'Lakshmi', 'gender': 'female', 'age': 48},
            {'first_name': 'Naresh', 'last_name': 'Kumar', 'gender': 'male', 'age': 33},
            {'first_name': 'Saroja', 'last_name': 'Devi', 'gender': 'female', 'age': 65},
            {'first_name': 'Prasad', 'last_name': 'Rao', 'gender': 'male', 'age': 40},
            {'first_name': 'Kavitha', 'last_name': 'Sharma', 'gender': 'female', 'age': 31},
            {'first_name': 'Mohan', 'last_name': 'Das', 'gender': 'male', 'age': 58},
        ]
        
        patients = []
        
        for i in range(count):
            data = patient_data[i % len(patient_data)]
            phone = f'+9190000001{10 + i}'  # +919000000110, +919000000111, etc.
            
            # Check if user already exists
            if self._user_exists(phone):
                patient = self._get_user_by_phone(phone)
                self.stdout.write(f'  → {patient.get_full_name()} (already exists)')
                patients.append(patient)
                continue
            
            try:
                # Build user data dynamically
                user_data = {
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'is_active': True,
                }
                
                # Add phone field
                user_data[phone_field] = phone
                
                # Add role/user_type if available
                user_fields = [f.name for f in User._meta.get_fields()]
                if 'role' in user_fields:
                    user_data['role'] = 'patient'
                if 'user_type' in user_fields:
                    user_data['user_type'] = 'patient'
                if 'gender' in user_fields:
                    user_data['gender'] = data.get('gender', 'male')
                if 'date_of_birth' in user_fields:
                    age = data.get('age', 30)
                    user_data['date_of_birth'] = date.today() - timedelta(days=age * 365)
                
                # Create user
                patient = User.objects.create_user(**user_data)
                
                # Create patient profile
                self._create_patient_profile(patient, data)
                
                patients.append(patient)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✓ {patient.get_full_name()} ({phone})'
                    )
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Error creating patient: {e}')
                )
        
        return patients

    def _create_patient_profile(self, patient, data):
        """Create patient profile if the model exists."""
        try:
            from apps.users.models import PatientProfile
            
            # Sample villages
            villages = [
                'Rampur', 'Krishnapuram', 'Venkatapuram', 'Lakshmipur',
                'Suryapet', 'Chandragiri', 'Gopalpuram', 'Sitaram Nagar',
            ]
            
            # Calculate date of birth from age
            age = data.get('age', 30)
            dob = date.today() - timedelta(days=age * 365)
            
            # Check if profile already exists
            if hasattr(patient, 'patient_profile') and patient.patient_profile:
                profile = patient.patient_profile
            else:
                # Create new profile
                profile, created = PatientProfile.objects.get_or_create(
                    user=patient,
                    defaults={
                        'date_of_birth': dob,
                        'gender': data.get('gender', 'male'),
                        'blood_group': random.choice(['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-']),
                        'village': random.choice(villages),
                        'district': 'Sample District',
                        'state': 'Andhra Pradesh',
                    }
                )
        except ImportError:
            logger.debug("PatientProfile model not found")
        except Exception as e:
            logger.warning(f"Could not create patient profile: {e}")