"""
Load Sample Health Records Data
===============================
Creates comprehensive sample data for testing and development.
"""

import random
from datetime import date, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.health_records.models import (
    HealthProfile,
    MedicalCondition,
    MedicalDocument,
    LabReport,
    VaccinationRecord,
    Allergy,
    FamilyMedicalHistory,
    Hospitalization,
    VitalSign,
    SharedRecord,
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Load sample health records data for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--patients',
            type=int,
            default=5,
            help='Number of patients to create data for'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before loading'
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.clear_data()
        
        self.stdout.write('Loading sample health records data...\n')
        
        # Get or create test patients
        patients = self.get_or_create_patients(options['patients'])
        doctors = self.get_or_create_doctors()
        
        for patient in patients:
            self.create_health_profile(patient)
            self.create_medical_conditions(patient, doctors)
            self.create_allergies(patient)
            self.create_vaccinations(patient)
            self.create_family_history(patient)
            self.create_vital_signs(patient)
            self.create_lab_reports(patient)
            self.create_hospitalizations(patient, doctors)
            self.create_shared_records(patient, doctors)
        
        self.stdout.write(self.style.SUCCESS('\n✅ Sample health records data loaded successfully!'))
        self.print_summary()

    def clear_data(self):
        """Clear existing health records data."""
        self.stdout.write('Clearing existing data...')
        
        SharedRecord.objects.all().delete()
        VitalSign.objects.all().delete()
        Hospitalization.objects.all().delete()
        FamilyMedicalHistory.objects.all().delete()
        VaccinationRecord.objects.all().delete()
        Allergy.objects.all().delete()
        LabReport.objects.all().delete()
        MedicalDocument.objects.all().delete()
        MedicalCondition.objects.all().delete()
        HealthProfile.objects.all().delete()
        
        self.stdout.write(self.style.WARNING('  Cleared all health records data'))

    def get_or_create_patients(self, count):
        """Get or create test patients."""
        patients = []
        
        patient_data = [
            {'phone': '+919876543101', 'first_name': 'Ramesh', 'last_name': 'Kumar', 'gender': 'male'},
            {'phone': '+919876543102', 'first_name': 'Lakshmi', 'last_name': 'Devi', 'gender': 'female'},
            {'phone': '+919876543103', 'first_name': 'Venkat', 'last_name': 'Rao', 'gender': 'male'},
            {'phone': '+919876543104', 'first_name': 'Padma', 'last_name': 'Kumari', 'gender': 'female'},
            {'phone': '+919876543105', 'first_name': 'Suresh', 'last_name': 'Reddy', 'gender': 'male'},
            {'phone': '+919876543106', 'first_name': 'Anitha', 'last_name': 'Sharma', 'gender': 'female'},
            {'phone': '+919876543107', 'first_name': 'Raju', 'last_name': 'Naidu', 'gender': 'male'},
            {'phone': '+919876543108', 'first_name': 'Kavitha', 'last_name': 'Reddy', 'gender': 'female'},
        ]
        
        for i, data in enumerate(patient_data[:count]):
            patient, created = User.objects.get_or_create(
                phone=data['phone'],
                defaults={
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'role': 'patient',
                    'is_active': True,
                    'date_of_birth': date(1970 + i * 5, random.randint(1, 12), random.randint(1, 28)),
                    'gender': data['gender'],
                    'preferred_language': random.choice(['en', 'te', 'hi']),
                }
            )
            patients.append(patient)
            action = 'Created' if created else 'Found'
            self.stdout.write(f'  {action} patient: {patient.first_name} {patient.last_name}')
        
        return patients

    def get_or_create_doctors(self):
        """Get or create test doctors."""
        doctors = []
        
        doctor_data = [
            {'phone': '+919876543201', 'first_name': 'Rajesh', 'last_name': 'Sharma'},
            {'phone': '+919876543202', 'first_name': 'Priya', 'last_name': 'Patel'},
            {'phone': '+919876543203', 'first_name': 'Arun', 'last_name': 'Kumar'},
        ]
        
        for data in doctor_data:
            doctor, created = User.objects.get_or_create(
                phone=data['phone'],
                defaults={
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'role': 'doctor',
                    'is_active': True,
                }
            )
            doctors.append(doctor)
            action = 'Created' if created else 'Found'
            self.stdout.write(f'  {action} doctor: Dr. {doctor.first_name} {doctor.last_name}')
        
        return doctors

    def create_health_profile(self, patient):
        """Create health profile for a patient."""
        profile, created = HealthProfile.objects.get_or_create(
            user=patient,
            defaults={
                'blood_group': random.choice(['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-']),
                'height_cm': Decimal(str(random.randint(150, 185))),
                'weight_kg': Decimal(str(random.randint(50, 90))),
                'smoking_status': random.choice(['never', 'former', 'current']),
                'alcohol_consumption': random.choice(['never', 'occasional', 'regular']),
                'emergency_contact_name': f"{patient.first_name}'s Family",
                'emergency_contact_phone': f"+91987654{random.randint(1000, 9999)}",
                'emergency_contact_relation': random.choice(['spouse', 'parent', 'sibling', 'child']),
            }
        )
        
        if created:
            self.stdout.write(f'  Created health profile for {patient.first_name}')

    def create_medical_conditions(self, patient, doctors):
        """Create medical conditions for a patient."""
        conditions_data = [
            {
                'condition_name': 'Type 2 Diabetes',
                'condition_name_local': 'మధుమేహం',
                'icd_code': 'E11',
                'status': 'managed',
                'severity': 'moderate',
                'is_chronic': True,
                'treatment_notes': 'On Metformin 500mg twice daily. Regular monitoring required.',
            },
            {
                'condition_name': 'Hypertension',
                'condition_name_local': 'రక్తపోటు',
                'icd_code': 'I10',
                'status': 'managed',
                'severity': 'moderate',
                'is_chronic': True,
                'treatment_notes': 'On Amlodipine 5mg daily. Salt restriction advised.',
            },
            {
                'condition_name': 'Seasonal Allergic Rhinitis',
                'condition_name_local': 'అలర్జీ జలుబు',
                'icd_code': 'J30.2',
                'status': 'recurring',
                'severity': 'mild',
                'is_chronic': False,
                'treatment_notes': 'Cetirizine as needed during season changes.',
            },
            {
                'condition_name': 'Vitamin D Deficiency',
                'condition_name_local': 'విటమిన్ డి లోపం',
                'icd_code': 'E55.9',
                'status': 'resolved',
                'severity': 'mild',
                'is_chronic': False,
                'treatment_notes': 'Completed Vitamin D3 supplementation course.',
            },
            {
                'condition_name': 'Osteoarthritis - Knee',
                'condition_name_local': 'మోకాలు నొప్పి',
                'icd_code': 'M17',
                'status': 'active',
                'severity': 'moderate',
                'is_chronic': True,
                'treatment_notes': 'Physiotherapy recommended. Pain management with Paracetamol.',
            },
            {
                'condition_name': 'Migraine',
                'condition_name_local': 'తలనొప్పి',
                'icd_code': 'G43',
                'status': 'recurring',
                'severity': 'moderate',
                'is_chronic': False,
                'treatment_notes': 'Trigger avoidance. Sumatriptan for acute episodes.',
            },
        ]
        
        # Select 2-4 random conditions for each patient
        selected = random.sample(conditions_data, random.randint(2, 4))
        
        for data in selected:
            days_ago = random.randint(30, 365 * 3)
            diagnosed_date = date.today() - timedelta(days=days_ago)
            
            resolved_date = None
            if data['status'] == 'resolved':
                resolved_date = diagnosed_date + timedelta(days=random.randint(30, 180))
            
            condition, created = MedicalCondition.objects.get_or_create(
                user=patient,
                condition_name=data['condition_name'],
                defaults={
                    'condition_name_local': data['condition_name_local'],
                    'icd_code': data['icd_code'],
                    'status': data['status'],
                    'severity': data['severity'],
                    'is_chronic': data['is_chronic'],
                    'treatment_notes': data['treatment_notes'],
                    'diagnosed_date': diagnosed_date,
                    'resolved_date': resolved_date,
                    'diagnosed_by': random.choice(doctors) if doctors else None,
                }
            )
            
            if created:
                self.stdout.write(f'    Created condition: {data["condition_name"]}')

    def create_allergies(self, patient):
        """Create allergies for a patient."""
        allergies_data = [
            {
                'allergen': 'Penicillin',
                'allergen_local': 'పెన్సిలిన్',
                'allergy_type': 'drug',
                'severity': 'severe',
                'reaction': 'Skin rash, difficulty breathing',
            },
            {
                'allergen': 'Peanuts',
                'allergen_local': 'వేరుశెనగ',
                'allergy_type': 'food',
                'severity': 'life_threatening',
                'reaction': 'Anaphylaxis, throat swelling',
            },
            {
                'allergen': 'Dust Mites',
                'allergen_local': 'ధూళి',
                'allergy_type': 'environmental',
                'severity': 'moderate',
                'reaction': 'Sneezing, runny nose, itchy eyes',
            },
            {
                'allergen': 'Sulfa Drugs',
                'allergen_local': 'సల్ఫా మందులు',
                'allergy_type': 'drug',
                'severity': 'moderate',
                'reaction': 'Skin rash, hives',
            },
            {
                'allergen': 'Shellfish',
                'allergen_local': 'రొయ్యలు',
                'allergy_type': 'food',
                'severity': 'severe',
                'reaction': 'Swelling, difficulty breathing, vomiting',
            },
            {
                'allergen': 'Bee Stings',
                'allergen_local': 'తేనెటీగ కుట్టడం',
                'allergy_type': 'insect',
                'severity': 'moderate',
                'reaction': 'Local swelling, pain',
            },
            {
                'allergen': 'Latex',
                'allergen_local': 'లేటెక్స్',
                'allergy_type': 'latex',
                'severity': 'mild',
                'reaction': 'Skin irritation, redness',
            },
        ]
        
        # Select 1-3 random allergies
        selected = random.sample(allergies_data, random.randint(1, 3))
        
        for data in selected:
            allergy, created = Allergy.objects.get_or_create(
                user=patient,
                allergen=data['allergen'],
                defaults={
                    'allergen_local': data['allergen_local'],
                    'allergy_type': data['allergy_type'],
                    'severity': data['severity'],
                    'reaction': data['reaction'],
                    'status': 'active',
                    'first_observed': date.today() - timedelta(days=random.randint(365, 365 * 10)),
                }
            )
            
            if created:
                self.stdout.write(f'    Created allergy: {data["allergen"]}')

    def create_vaccinations(self, patient):
        """Create vaccination records for a patient."""
        vaccinations_data = [
            {
                'vaccine_name': 'Covishield',
                'vaccine_name_local': 'కోవిషీల్డ్',
                'vaccine_type': 'covid',
                'total_doses': 2,
                'manufacturer': 'Serum Institute of India',
            },
            {
                'vaccine_name': 'Covaxin',
                'vaccine_name_local': 'కోవాక్సిన్',
                'vaccine_type': 'covid',
                'total_doses': 2,
                'manufacturer': 'Bharat Biotech',
            },
            {
                'vaccine_name': 'Tetanus Toxoid',
                'vaccine_name_local': 'టెటనస్',
                'vaccine_type': 'tetanus',
                'total_doses': 1,
                'manufacturer': 'Various',
            },
            {
                'vaccine_name': 'Hepatitis B',
                'vaccine_name_local': 'హెపటైటిస్ బి',
                'vaccine_type': 'hepatitis_b',
                'total_doses': 3,
                'manufacturer': 'Serum Institute',
            },
            {
                'vaccine_name': 'Influenza',
                'vaccine_name_local': 'ఫ్లూ టీకా',
                'vaccine_type': 'flu',
                'total_doses': 1,
                'manufacturer': 'Various',
            },
            {
                'vaccine_name': 'Typhoid',
                'vaccine_name_local': 'టైఫాయిడ్',
                'vaccine_type': 'typhoid',
                'total_doses': 1,
                'manufacturer': 'Bharat Biotech',
            },
        ]
        
        # Select 2-4 random vaccines
        selected = random.sample(vaccinations_data, random.randint(2, 4))
        
        facilities = [
            'PHC Kondapur', 'Government Hospital', 'Apollo Clinic',
            'Community Health Center', 'District Hospital'
        ]
        
        for data in selected:
            # Create dose records
            doses_to_create = random.randint(1, data['total_doses'])
            
            for dose_num in range(1, doses_to_create + 1):
                days_ago = random.randint(30, 365 * 2) - (dose_num - 1) * 30
                vacc_date = date.today() - timedelta(days=days_ago)
                
                next_due = None
                if dose_num < data['total_doses']:
                    next_due = vacc_date + timedelta(days=random.randint(21, 90))
                
                record, created = VaccinationRecord.objects.get_or_create(
                    user=patient,
                    vaccine_name=data['vaccine_name'],
                    dose_number=dose_num,
                    defaults={
                        'vaccine_name_local': data['vaccine_name_local'],
                        'vaccine_type': data['vaccine_type'],
                        'total_doses': data['total_doses'],
                        'vaccination_date': vacc_date,
                        'next_due_date': next_due,
                        'administered_at': random.choice(facilities),
                        'manufacturer': data['manufacturer'],
                        'batch_number': f"BATCH{random.randint(10000, 99999)}",
                        'is_verified': random.choice([True, False]),
                    }
                )
                
                if created:
                    self.stdout.write(f'    Created vaccination: {data["vaccine_name"]} (Dose {dose_num})')

    def create_family_history(self, patient):
        """Create family medical history for a patient."""
        conditions = [
            ('Diabetes', 'మధుమేహం'),
            ('Hypertension', 'రక్తపోటు'),
            ('Heart Disease', 'గుండె జబ్బు'),
            ('Cancer', 'క్యాన్సర్'),
            ('Asthma', 'ఆస్తమా'),
            ('Arthritis', 'కీళ్ల నొప్పులు'),
            ('Thyroid Disorder', 'థైరాయిడ్'),
            ('Kidney Disease', 'మూత్రపిండ వ్యాధి'),
        ]
        
        relations = [
            'father', 'mother', 'grandfather_paternal', 'grandmother_paternal',
            'grandfather_maternal', 'grandmother_maternal', 'brother', 'sister'
        ]
        
        # Create 3-6 family history records
        num_records = random.randint(3, 6)
        used_combinations = set()
        
        for _ in range(num_records):
            relation = random.choice(relations)
            condition, condition_local = random.choice(conditions)
            
            combo = (relation, condition)
            if combo in used_combinations:
                continue
            used_combinations.add(combo)
            
            is_deceased = random.choice([True, False]) if relation.startswith('grand') else random.choice([True, False, False])
            
            record, created = FamilyMedicalHistory.objects.get_or_create(
                user=patient,
                relation=relation,
                condition=condition,
                defaults={
                    'condition_local': condition_local,
                    'age_at_diagnosis': random.randint(35, 70),
                    'is_deceased': is_deceased,
                    'age_at_death': random.randint(60, 85) if is_deceased else None,
                    'cause_of_death': condition if is_deceased and random.choice([True, False]) else '',
                }
            )
            
            if created:
                self.stdout.write(f'    Created family history: {relation} - {condition}')

    def create_vital_signs(self, patient):
        """Create vital sign records for a patient."""
        # Create 10-20 vital records over the past 90 days
        num_records = random.randint(10, 20)
        
        for i in range(num_records):
            days_ago = random.randint(0, 90)
            recorded_at = timezone.now() - timedelta(days=days_ago, hours=random.randint(0, 23))
            
            # Base values with some variation
            systolic_base = random.randint(110, 150)
            diastolic_base = random.randint(70, 95)
            
            vital, created = VitalSign.objects.get_or_create(
                user=patient,
                recorded_at=recorded_at,
                defaults={
                    'systolic_bp': systolic_base + random.randint(-5, 5),
                    'diastolic_bp': diastolic_base + random.randint(-5, 5),
                    'heart_rate': random.randint(60, 100),
                    'temperature': Decimal(str(round(random.uniform(97.5, 99.5), 1))),
                    'respiratory_rate': random.randint(12, 20),
                    'oxygen_saturation': random.randint(95, 100),
                    'blood_sugar': random.randint(80, 180) if random.choice([True, False]) else None,
                    'blood_sugar_type': random.choice(['fasting', 'pp', 'random']) if random.choice([True, False]) else '',
                    'weight_kg': Decimal(str(random.randint(50, 90))) if i % 5 == 0 else None,
                    'source': random.choice(['self', 'clinic', 'home_device']),
                }
            )
        
        self.stdout.write(f'    Created {num_records} vital sign records')

    def create_lab_reports(self, patient):
        """Create lab report records for a patient."""
        lab_reports_data = [
            {
                'report_name': 'Complete Blood Count',
                'lab_type': 'blood',
                'results': [
                    {'name': 'Hemoglobin', 'value': str(round(random.uniform(12, 16), 1)), 'unit': 'g/dL', 'normal_range': '12-16', 'status': 'normal'},
                    {'name': 'WBC', 'value': str(random.randint(4000, 11000)), 'unit': '/μL', 'normal_range': '4000-11000', 'status': 'normal'},
                    {'name': 'Platelets', 'value': str(random.randint(150000, 400000)), 'unit': '/μL', 'normal_range': '150000-400000', 'status': 'normal'},
                    {'name': 'RBC', 'value': str(round(random.uniform(4.5, 5.5), 2)), 'unit': 'M/μL', 'normal_range': '4.5-5.5', 'status': 'normal'},
                ],
            },
            {
                'report_name': 'Lipid Profile',
                'lab_type': 'lipid',
                'results': [
                    {'name': 'Total Cholesterol', 'value': str(random.randint(150, 250)), 'unit': 'mg/dL', 'normal_range': '<200', 'status': random.choice(['normal', 'high'])},
                    {'name': 'LDL', 'value': str(random.randint(70, 160)), 'unit': 'mg/dL', 'normal_range': '<100', 'status': random.choice(['normal', 'high'])},
                    {'name': 'HDL', 'value': str(random.randint(35, 70)), 'unit': 'mg/dL', 'normal_range': '>40', 'status': random.choice(['normal', 'low'])},
                    {'name': 'Triglycerides', 'value': str(random.randint(100, 200)), 'unit': 'mg/dL', 'normal_range': '<150', 'status': random.choice(['normal', 'high'])},
                ],
            },
            {
                'report_name': 'Blood Sugar - Fasting',
                'lab_type': 'diabetes',
                'results': [
                    {'name': 'Fasting Blood Sugar', 'value': str(random.randint(80, 140)), 'unit': 'mg/dL', 'normal_range': '70-100', 'status': random.choice(['normal', 'high'])},
                    {'name': 'HbA1c', 'value': str(round(random.uniform(5.0, 8.0), 1)), 'unit': '%', 'normal_range': '<5.7', 'status': random.choice(['normal', 'high'])},
                ],
            },
            {
                'report_name': 'Thyroid Profile',
                'lab_type': 'thyroid',
                'results': [
                    {'name': 'TSH', 'value': str(round(random.uniform(0.5, 5.0), 2)), 'unit': 'mIU/L', 'normal_range': '0.4-4.0', 'status': 'normal'},
                    {'name': 'T3', 'value': str(random.randint(80, 200)), 'unit': 'ng/dL', 'normal_range': '80-200', 'status': 'normal'},
                    {'name': 'T4', 'value': str(round(random.uniform(5.0, 12.0), 1)), 'unit': 'μg/dL', 'normal_range': '5.0-12.0', 'status': 'normal'},
                ],
            },
            {
                'report_name': 'Liver Function Test',
                'lab_type': 'liver',
                'results': [
                    {'name': 'SGOT (AST)', 'value': str(random.randint(10, 50)), 'unit': 'U/L', 'normal_range': '10-40', 'status': random.choice(['normal', 'high'])},
                    {'name': 'SGPT (ALT)', 'value': str(random.randint(10, 55)), 'unit': 'U/L', 'normal_range': '7-56', 'status': 'normal'},
                    {'name': 'Bilirubin', 'value': str(round(random.uniform(0.3, 1.2), 1)), 'unit': 'mg/dL', 'normal_range': '0.1-1.2', 'status': 'normal'},
                ],
            },
            {
                'report_name': 'Kidney Function Test',
                'lab_type': 'kidney',
                'results': [
                    {'name': 'Creatinine', 'value': str(round(random.uniform(0.7, 1.3), 1)), 'unit': 'mg/dL', 'normal_range': '0.7-1.3', 'status': 'normal'},
                    {'name': 'BUN', 'value': str(random.randint(7, 20)), 'unit': 'mg/dL', 'normal_range': '7-20', 'status': 'normal'},
                    {'name': 'Uric Acid', 'value': str(round(random.uniform(3.5, 7.2), 1)), 'unit': 'mg/dL', 'normal_range': '3.5-7.2', 'status': 'normal'},
                ],
            },
            {
                'report_name': 'Vitamin Panel',
                'lab_type': 'vitamin',
                'results': [
                    {'name': 'Vitamin D', 'value': str(random.randint(15, 50)), 'unit': 'ng/mL', 'normal_range': '30-100', 'status': random.choice(['normal', 'low'])},
                    {'name': 'Vitamin B12', 'value': str(random.randint(200, 900)), 'unit': 'pg/mL', 'normal_range': '200-900', 'status': 'normal'},
                ],
            },
        ]
        
        labs = ['Apollo Diagnostics', 'Vijaya Diagnostics', 'Thyrocare', 'SRL Diagnostics', 'Metropolis']
        
        # Select 3-5 random lab reports
        selected = random.sample(lab_reports_data, random.randint(3, 5))
        
        for data in selected:
            days_ago = random.randint(7, 180)
            test_date = date.today() - timedelta(days=days_ago)
            
            # Determine overall status
            statuses = [r['status'] for r in data['results']]
            if 'critical' in statuses:
                overall_status = 'critical'
            elif any(s in ['low', 'high', 'abnormal'] for s in statuses):
                overall_status = 'abnormal'
            else:
                overall_status = 'normal'
            
            report, created = LabReport.objects.get_or_create(
                user=patient,
                report_name=data['report_name'],
                test_date=test_date,
                defaults={
                    'lab_type': data['lab_type'],
                    'lab_name': random.choice(labs),
                    'results': data['results'],
                    'overall_status': overall_status,
                    'interpretation': 'Results are within normal limits.' if overall_status == 'normal' else 'Some values need attention. Please consult your doctor.',
                    'recommendations': '' if overall_status == 'normal' else 'Follow up with your doctor for abnormal values.',
                }
            )
            
            if created:
                self.stdout.write(f'    Created lab report: {data["report_name"]}')

    def create_hospitalizations(self, patient, doctors):
        """Create hospitalization records for a patient."""
        # Only some patients have hospitalizations
        if random.choice([True, False, False]):
            return
        
        hospitalizations_data = [
            {
                'reason': 'Viral Fever with Dehydration',
                'diagnosis': 'Dengue Fever',
                'department': 'General Medicine',
                'procedures': ['IV Fluids', 'Blood Transfusion'],
            },
            {
                'reason': 'Severe Abdominal Pain',
                'diagnosis': 'Acute Appendicitis',
                'department': 'Surgery',
                'procedures': ['Appendectomy'],
            },
            {
                'reason': 'Chest Pain and Breathlessness',
                'diagnosis': 'Acute Myocardial Infarction',
                'department': 'Cardiology',
                'procedures': ['Angioplasty', 'Stent Placement'],
            },
            {
                'reason': 'Road Traffic Accident',
                'diagnosis': 'Fracture - Right Femur',
                'department': 'Orthopedics',
                'procedures': ['Internal Fixation', 'Plaster Cast'],
            },
            {
                'reason': 'High Fever and Confusion',
                'diagnosis': 'Typhoid with Encephalopathy',
                'department': 'General Medicine',
                'procedures': ['IV Antibiotics', 'Supportive Care'],
            },
        ]
        
        hospitals = [
            'Gandhi Hospital', 'NIMS', 'Osmania General Hospital',
            'Apollo Hospital', 'KIMS', 'Yashoda Hospital'
        ]
        
        # Create 1-2 hospitalizations
        num_records = random.randint(1, 2)
        selected = random.sample(hospitalizations_data, num_records)
        
        for data in selected:
            days_ago = random.randint(90, 365 * 3)
            admission_date = date.today() - timedelta(days=days_ago)
            duration = random.randint(3, 14)
            discharge_date = admission_date + timedelta(days=duration)
            
            follow_up_date = discharge_date + timedelta(days=random.randint(7, 30))
            if follow_up_date > date.today():
                follow_up_date = None
            
            record, created = Hospitalization.objects.get_or_create(
                user=patient,
                hospital_name=random.choice(hospitals),
                admission_date=admission_date,
                defaults={
                    'admission_type': random.choice(['emergency', 'planned']),
                    'discharge_date': discharge_date,
                    'reason': data['reason'],
                    'diagnosis': data['diagnosis'],
                    'department': data['department'],
                    'treating_doctor': f"Dr. {random.choice(['Kumar', 'Sharma', 'Reddy', 'Rao'])}",
                    'procedures': data['procedures'],
                    'discharge_summary': f"Patient admitted for {data['reason']}. Diagnosed with {data['diagnosis']}. Treated successfully and discharged in stable condition.",
                    'follow_up_date': follow_up_date,
                    'follow_up_notes': 'Follow up for wound care and medication review' if follow_up_date else '',
                }
            )
            
            if created:
                self.stdout.write(f'    Created hospitalization: {data["diagnosis"]}')

    def create_shared_records(self, patient, doctors):
        """Create shared record entries."""
        if not doctors:
            return
        
        # Some patients share with doctors
        if random.choice([True, False]):
            doctor = random.choice(doctors)
            
            share, created = SharedRecord.objects.get_or_create(
                patient=patient,
                doctor=doctor,
                share_type='all',
                defaults={
                    'is_permanent': random.choice([True, False]),
                    'expires_at': timezone.now() + timedelta(days=30) if not random.choice([True, False]) else None,
                    'is_active': True,
                }
            )
            
            if created:
                self.stdout.write(f'    Shared records with Dr. {doctor.first_name}')

    def print_summary(self):
        """Print summary of loaded data."""
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write('SUMMARY')
        self.stdout.write('=' * 50)
        self.stdout.write(f'Health Profiles:     {HealthProfile.objects.count()}')
        self.stdout.write(f'Medical Conditions:  {MedicalCondition.objects.count()}')
        self.stdout.write(f'Allergies:           {Allergy.objects.count()}')
        self.stdout.write(f'Vaccinations:        {VaccinationRecord.objects.count()}')
        self.stdout.write(f'Family History:      {FamilyMedicalHistory.objects.count()}')
        self.stdout.write(f'Vital Signs:         {VitalSign.objects.count()}')
        self.stdout.write(f'Lab Reports:         {LabReport.objects.count()}')
        self.stdout.write(f'Hospitalizations:    {Hospitalization.objects.count()}')
        self.stdout.write(f'Shared Records:      {SharedRecord.objects.count()}')
        self.stdout.write('=' * 50)