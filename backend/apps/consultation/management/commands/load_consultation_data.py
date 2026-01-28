"""
Load Sample Consultation Data
=============================
Creates sample consultations for testing.

Usage:
    python manage.py load_consultation_data
    python manage.py load_consultation_data --clear
    python manage.py load_consultation_data --count 20
"""

import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction

from apps.consultation.models import (
    ConsultationRoom,
    Consultation,
    ConsultationNote,
    ConsultationPrescription,
    ConsultationFeedback,
)
from apps.consultation.services import JitsiService

User = get_user_model()


class Command(BaseCommand):
    help = 'Load sample consultation data for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing consultation data before loading'
        )
        parser.add_argument(
            '--count',
            type=int,
            default=15,
            help='Number of consultations to create (default: 15)'
        )

    def handle(self, *args, **options):
        self.stdout.write("Loading sample consultation data...")
        
        if options['clear']:
            self.clear_data()
        
        # Get doctors and patients
        doctors = list(User.objects.filter(role='doctor')[:5])
        patients = list(User.objects.filter(role='patient')[:10])
        
        if not doctors:
            self.stdout.write(self.style.ERROR(
                "No doctors found. Run 'python manage.py create_test_users' first."
            ))
            return
        
        if not patients:
            self.stdout.write(self.style.ERROR(
                "No patients found. Run 'python manage.py create_test_users' first."
            ))
            return
        
        self.stdout.write(f"Found {len(doctors)} doctors and {len(patients)} patients")
        
        count = options['count']
        
        with transaction.atomic():
            created = self.create_consultations(doctors, patients, count)
        
        self.stdout.write(self.style.SUCCESS(
            f"\nSuccessfully created {created} consultations!"
        ))
        
        self.print_summary()

    def clear_data(self):
        """Clear existing consultation data."""
        self.stdout.write("Clearing existing data...")
        
        ConsultationFeedback.objects.all().delete()
        ConsultationPrescription.objects.all().delete()
        ConsultationNote.objects.all().delete()
        Consultation.objects.all().delete()
        ConsultationRoom.objects.all().delete()
        
        self.stdout.write(self.style.WARNING("All consultation data cleared."))

    def create_consultations(self, doctors, patients, count):
        """Create sample consultations."""
        now = timezone.now()
        created = 0
        
        # Sample data
        reasons = [
            "Regular checkup",
            "Follow-up consultation",
            "Fever and cold symptoms",
            "Headache and body pain",
            "Skin rash",
            "Stomach pain",
            "Blood pressure check",
            "Diabetes follow-up",
            "Joint pain",
            "Cough and cold",
            "General weakness",
            "Allergies",
        ]
        
        symptoms = [
            "Fever, headache, body ache",
            "Cough, cold, runny nose",
            "Stomach pain, nausea",
            "Skin itching, redness",
            "Joint pain, swelling",
            "Fatigue, weakness",
            "Dizziness, lightheadedness",
            "Chest discomfort",
            "Back pain",
            "Throat pain, difficulty swallowing",
        ]
        
        diagnoses = [
            "Viral fever - Rest and fluids recommended",
            "Common cold - Symptomatic treatment",
            "Gastritis - Dietary changes advised",
            "Allergic dermatitis - Antihistamines prescribed",
            "Muscle strain - Rest and pain relief",
            "Hypertension - Lifestyle modifications",
            "Type 2 Diabetes - Diet and medication",
            "Migraine - Preventive measures discussed",
            "Acid reflux - PPI prescribed",
            "Upper respiratory infection - Antibiotics if needed",
        ]
        
        medicines = [
            {"name": "Paracetamol 500mg", "dosage": "500mg", "frequency": "Three times daily", "duration": "5 days"},
            {"name": "Cetirizine 10mg", "dosage": "10mg", "frequency": "Once daily", "duration": "7 days"},
            {"name": "Omeprazole 20mg", "dosage": "20mg", "frequency": "Once daily before food", "duration": "14 days"},
            {"name": "Amoxicillin 500mg", "dosage": "500mg", "frequency": "Twice daily", "duration": "7 days"},
            {"name": "Ibuprofen 400mg", "dosage": "400mg", "frequency": "Twice daily after food", "duration": "5 days"},
            {"name": "Metformin 500mg", "dosage": "500mg", "frequency": "Twice daily", "duration": "30 days"},
            {"name": "Amlodipine 5mg", "dosage": "5mg", "frequency": "Once daily", "duration": "30 days"},
            {"name": "Azithromycin 500mg", "dosage": "500mg", "frequency": "Once daily", "duration": "3 days"},
        ]
        
        statuses = ['completed'] * 6 + ['scheduled'] * 3 + ['cancelled'] * 1 + ['no_show'] * 1
        
        for i in range(count):
            doctor = random.choice(doctors)
            patient = random.choice(patients)
            
            # Determine timing
            status = random.choice(statuses)
            
            if status == 'scheduled':
                # Future consultation
                scheduled_start = now + timedelta(
                    days=random.randint(1, 7),
                    hours=random.randint(9, 17),
                    minutes=random.choice([0, 15, 30, 45])
                )
            elif status == 'completed':
                # Past consultation
                scheduled_start = now - timedelta(
                    days=random.randint(1, 30),
                    hours=random.randint(0, 8)
                )
            else:
                # Past (cancelled/no_show)
                scheduled_start = now - timedelta(
                    days=random.randint(1, 14),
                    hours=random.randint(0, 8)
                )
            
            duration = random.choice([10, 15, 20, 30])
            consultation_type = random.choice(['video', 'video', 'audio'])
            language = random.choice(['en', 'te', 'hi'])
            
            # Create room
            room_config = JitsiService.create_room_config(
                consultation_id=str(i),
                doctor_id=str(doctor.id),
                is_audio_only=(consultation_type == 'audio')
            )
            room_config['expires_at'] = scheduled_start + timedelta(hours=2)
            
            if status == 'completed':
                room_config['status'] = 'ended'
                room_config['activated_at'] = scheduled_start
                room_config['ended_at'] = scheduled_start + timedelta(minutes=duration)
                room_config['doctor_joined_at'] = scheduled_start
                room_config['patient_joined_at'] = scheduled_start + timedelta(minutes=1)
            elif status in ['cancelled', 'no_show']:
                room_config['status'] = 'expired'
            
            room = ConsultationRoom.objects.create(**room_config)
            
            # Create consultation
            consultation = Consultation.objects.create(
                doctor=doctor,
                patient=patient,
                room=room,
                consultation_type=consultation_type,
                status=status,
                scheduled_start=scheduled_start,
                scheduled_end=scheduled_start + timedelta(minutes=duration),
                estimated_duration=duration,
                reason=random.choice(reasons),
                symptoms=random.choice(symptoms),
                language=language,
            )
            
            # Add data for completed consultations
            if status == 'completed':
                consultation.actual_start = scheduled_start
                consultation.actual_end = scheduled_start + timedelta(minutes=random.randint(8, duration))
                consultation.actual_duration = int((consultation.actual_end - consultation.actual_start).total_seconds() / 60)
                consultation.diagnosis = random.choice(diagnoses)
                consultation.follow_up_required = random.choice([True, False, False])
                
                if consultation.follow_up_required:
                    consultation.follow_up_date = (now + timedelta(days=random.randint(7, 30))).date()
                    consultation.follow_up_notes = "Please come for follow-up to check progress."
                
                consultation.save()
                
                # Add notes
                note_types = ['subjective', 'objective', 'assessment', 'plan']
                for note_type in random.sample(note_types, random.randint(1, 3)):
                    ConsultationNote.objects.create(
                        consultation=consultation,
                        note_type=note_type,
                        title=f"{note_type.title()} Notes",
                        content=f"Sample {note_type} notes for this consultation. "
                                f"Patient presented with {consultation.symptoms}. "
                                f"Diagnosis: {consultation.diagnosis}",
                        is_private=random.choice([True, False, False])
                    )
                
                # Add prescriptions
                for med in random.sample(medicines, random.randint(1, 3)):
                    ConsultationPrescription.objects.create(
                        consultation=consultation,
                        medicine_name=med['name'],
                        dosage=med['dosage'],
                        frequency=med['frequency'],
                        duration=med['duration'],
                        timing=random.choice(['before_food', 'after_food', 'with_food']),
                        instructions="Take as directed. Complete the full course.",
                        quantity=random.randint(10, 30)
                    )
                
                # Add feedback (70% chance)
                if random.random() < 0.7:
                    ConsultationFeedback.objects.create(
                        consultation=consultation,
                        overall_rating=random.randint(3, 5),
                        communication_rating=random.randint(3, 5),
                        technical_quality_rating=random.randint(3, 5),
                        comments=random.choice([
                            "Good consultation. Doctor was very helpful.",
                            "Quick and efficient. Got proper guidance.",
                            "Very satisfied with the consultation.",
                            "Doctor explained everything clearly.",
                            "Good experience overall.",
                            "",
                        ]),
                        would_recommend=random.choice([True, True, True, False, None]),
                        had_technical_issues=random.choice([False, False, False, True]),
                        is_anonymous=random.choice([False, False, True])
                    )
            
            elif status == 'cancelled':
                consultation.cancelled_at = scheduled_start - timedelta(hours=random.randint(1, 24))
                consultation.cancelled_by = random.choice([doctor, patient])
                consultation.cancellation_reason = random.choice([
                    "Doctor unavailable",
                    "Patient requested cancellation",
                    "Emergency",
                    "Rescheduled",
                ])
                consultation.save()
            
            created += 1
            self.stdout.write(f"  Created consultation {created}/{count}: {status}")
        
        return created

    def print_summary(self):
        """Print summary of created data."""
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write("CONSULTATION DATA SUMMARY")
        self.stdout.write("=" * 50)
        
        total = Consultation.objects.count()
        by_status = {}
        for status, _ in Consultation.STATUS_CHOICES:
            count = Consultation.objects.filter(status=status).count()
            if count > 0:
                by_status[status] = count
        
        self.stdout.write(f"\nTotal Consultations: {total}")
        self.stdout.write("\nBy Status:")
        for status, count in by_status.items():
            self.stdout.write(f"  - {status}: {count}")
        
        self.stdout.write(f"\nTotal Notes: {ConsultationNote.objects.count()}")
        self.stdout.write(f"Total Prescriptions: {ConsultationPrescription.objects.count()}")
        self.stdout.write(f"Total Feedbacks: {ConsultationFeedback.objects.count()}")
        self.stdout.write(f"Total Rooms: {ConsultationRoom.objects.count()}")
        
        # Average rating
        from django.db.models import Avg
        avg_rating = ConsultationFeedback.objects.aggregate(avg=Avg('overall_rating'))['avg']
        if avg_rating:
            self.stdout.write(f"\nAverage Rating: {avg_rating:.1f}/5")
        
        self.stdout.write("=" * 50)