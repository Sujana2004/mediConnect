"""
Django Management Command: Load Diseases
========================================
Load diseases from Training.csv, symptom_Description.csv, and symptom_precaution.csv.

Usage:
    python manage.py load_diseases
    python manage.py load_diseases --clear
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.diagnosis.models import Disease
from apps.diagnosis.training.data_loader import DataLoader
from apps.diagnosis.utils.text_utils import TextUtils


class Command(BaseCommand):
    help = 'Load diseases from CSV files into database'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing diseases before loading',
        )
        parser.add_argument(
            '--data-dir',
            type=str,
            help='Path to data directory',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('\n' + '='*60))
        self.stdout.write(self.style.NOTICE('Loading Diseases into Database'))
        self.stdout.write(self.style.NOTICE('='*60 + '\n'))
        
        try:
            # Initialize data loader
            data_dir = options.get('data_dir')
            loader = DataLoader(data_dir) if data_dir else DataLoader()
            
            # Clear existing data if requested
            if options['clear']:
                self.stdout.write('Clearing existing diseases...')
                deleted_count = Disease.objects.all().delete()[0]
                self.stdout.write(self.style.WARNING(f'Deleted {deleted_count} diseases'))
            
            # Load disease descriptions
            self.stdout.write('Loading symptom_Description.csv...')
            desc_map = loader.get_disease_description_map()
            self.stdout.write(f'Found {len(desc_map)} disease descriptions')
            
            # Load disease precautions
            self.stdout.write('Loading symptom_precaution.csv...')
            precaution_map = loader.get_disease_precautions_map()
            self.stdout.write(f'Found {len(precaution_map)} disease precautions')
            
            # Load training data to get disease list
            self.stdout.write('Loading Training.csv...')
            diseases = loader.get_all_diseases_from_training()
            self.stdout.write(f'Found {len(diseases)} unique diseases')
            
            # Create diseases
            created_count = 0
            updated_count = 0
            
            with transaction.atomic():
                for disease_raw in diseases:
                    # Generate code and name
                    code = TextUtils.disease_to_code(disease_raw)
                    name = TextUtils.clean_disease_name(disease_raw)
                    
                    # Look up description
                    description = ''
                    for key in [disease_raw, disease_raw.lower(), name, name.lower()]:
                        if key in desc_map:
                            description = desc_map[key]
                            break
                    
                    # Look up precautions
                    precautions = []
                    for key in [disease_raw, disease_raw.lower(), name, name.lower()]:
                        if key in precaution_map:
                            precautions = precaution_map[key]
                            break
                    
                    # Guess specialist and severity
                    specialist = self._guess_specialist(code, name)
                    severity = self._guess_severity(code, name)
                    requires_immediate = self._requires_immediate_care(code, name)
                    
                    # Create or update disease
                    disease, created = Disease.objects.update_or_create(
                        code=code,
                        defaults={
                            'name_english': name,
                            'description': description,
                            'typical_severity': severity,
                            'recommended_specialist': specialist,
                            'requires_immediate_care': requires_immediate,
                            'precaution_1': precautions[0] if len(precautions) > 0 else '',
                            'precaution_2': precautions[1] if len(precautions) > 1 else '',
                            'precaution_3': precautions[2] if len(precautions) > 2 else '',
                            'precaution_4': precautions[3] if len(precautions) > 3 else '',
                            'is_active': True,
                        }
                    )
                    
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1
            
            # Summary
            self.stdout.write('\n' + '-'*40)
            self.stdout.write(self.style.SUCCESS(f'✅ Created: {created_count} diseases'))
            self.stdout.write(self.style.SUCCESS(f'✅ Updated: {updated_count} diseases'))
            self.stdout.write(self.style.SUCCESS(f'✅ Total: {Disease.objects.count()} diseases in database'))
            
            # Show some examples
            self.stdout.write('\n📋 Sample diseases:')
            for disease in Disease.objects.all()[:5]:
                self.stdout.write(f'   - {disease.name_english} ({disease.recommended_specialist})')
            
        except Exception as e:
            raise CommandError(f'Error loading diseases: {e}')
    
    def _guess_specialist(self, code: str, name: str) -> str:
        """Guess recommended specialist based on disease name."""
        name_lower = name.lower()
        
        # Cardiology
        if any(kw in name_lower for kw in ['heart', 'cardiac', 'hypertension']):
            return 'cardiologist'
        
        # Pulmonology
        if any(kw in name_lower for kw in ['pneumonia', 'bronchitis', 'asthma', 'tuberculosis']):
            return 'pulmonologist'
        
        # Gastroenterology
        if any(kw in name_lower for kw in ['gastro', 'hepatitis', 'liver', 'jaundice', 'gerd']):
            return 'gastroenterologist'
        
        # Neurology
        if any(kw in name_lower for kw in ['migraine', 'paralysis', 'epilepsy', 'parkinson']):
            return 'neurologist'
        
        # Dermatology
        if any(kw in name_lower for kw in ['skin', 'fungal', 'acne', 'psoriasis', 'eczema']):
            return 'dermatologist'
        
        # Orthopedic
        if any(kw in name_lower for kw in ['arthritis', 'osteo', 'cervical', 'spondylosis']):
            return 'orthopedic'
        
        # ENT
        if any(kw in name_lower for kw in ['tonsil', 'ear', 'sinus']):
            return 'ent'
        
        # Infectious disease
        if any(kw in name_lower for kw in ['typhoid', 'malaria', 'dengue', 'aids', 'hepatitis']):
            return 'infectious'
        
        # Psychiatry
        if any(kw in name_lower for kw in ['depression', 'anxiety']):
            return 'psychiatrist'
        
        # Endocrinology
        if any(kw in name_lower for kw in ['diabetes', 'thyroid', 'hyperthyroid', 'hypothyroid']):
            return 'endocrinologist'
        
        # Default
        return 'general'
    
    def _guess_severity(self, code: str, name: str) -> str:
        """Guess typical severity based on disease name."""
        name_lower = name.lower()
        
        # Critical
        if any(kw in name_lower for kw in ['heart attack', 'paralysis', 'aids']):
            return 'critical'
        
        # Severe
        if any(kw in name_lower for kw in [
            'hepatitis', 'tuberculosis', 'pneumonia', 'dengue', 
            'malaria', 'typhoid', 'jaundice'
        ]):
            return 'severe'
        
        # Moderate
        if any(kw in name_lower for kw in [
            'diabetes', 'hypertension', 'arthritis', 'migraine',
            'asthma', 'bronchitis'
        ]):
            return 'moderate'
        
        # Mild (default)
        return 'mild'
    
    def _requires_immediate_care(self, code: str, name: str) -> bool:
        """Check if disease requires immediate medical care."""
        name_lower = name.lower()
        
        emergency_keywords = [
            'heart attack', 'paralysis', 'stroke', 'hemorrhage',
            'poisoning', 'overdose'
        ]
        
        return any(kw in name_lower for kw in emergency_keywords)