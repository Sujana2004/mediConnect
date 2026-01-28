"""
Django Management Command: Load Symptoms
========================================
Load symptoms from Training.csv and Symptom-severity.csv into database.

Usage:
    python manage.py load_symptoms
    python manage.py load_symptoms --clear  # Clear existing data first
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.diagnosis.models import Symptom
from apps.diagnosis.training.data_loader import DataLoader
from apps.diagnosis.utils.text_utils import TextUtils


class Command(BaseCommand):
    help = 'Load symptoms from CSV files into database'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing symptoms before loading',
        )
        parser.add_argument(
            '--data-dir',
            type=str,
            help='Path to data directory (default: backend/data/)',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('\n' + '='*60))
        self.stdout.write(self.style.NOTICE('Loading Symptoms into Database'))
        self.stdout.write(self.style.NOTICE('='*60 + '\n'))
        
        try:
            # Initialize data loader
            data_dir = options.get('data_dir')
            loader = DataLoader(data_dir) if data_dir else DataLoader()
            
            # Clear existing data if requested
            if options['clear']:
                self.stdout.write('Clearing existing symptoms...')
                deleted_count = Symptom.objects.all().delete()[0]
                self.stdout.write(self.style.WARNING(f'Deleted {deleted_count} symptoms'))
            
            # Load symptom severity data
            self.stdout.write('Loading Symptom-severity.csv...')
            severity_map = loader.get_symptom_severity_map()
            self.stdout.write(f'Found {len(severity_map)} symptoms with severity weights')
            
            # Load training data to get all symptom columns
            self.stdout.write('Loading Training.csv...')
            training_df = loader.load_training_data()
            
            if training_df is None:
                raise CommandError('Failed to load Training.csv')
            
            # Get symptom columns (all except 'prognosis')
            symptom_columns = [col for col in training_df.columns if col != 'prognosis']
            self.stdout.write(f'Found {len(symptom_columns)} symptom columns')
            
            # Create symptoms
            created_count = 0
            updated_count = 0
            
            with transaction.atomic():
                for col in symptom_columns:
                    # Generate code and name
                    code = TextUtils.symptom_to_code(col)
                    name = TextUtils.code_to_display_name(code)
                    
                    # Get severity weight (default to 1 if not found)
                    severity = severity_map.get(code, 1)
                    
                    # Determine category based on symptom name
                    category = self._guess_category(code, name)
                    
                    # Create or update symptom
                    symptom, created = Symptom.objects.update_or_create(
                        code=code,
                        defaults={
                            'name_english': name,
                            'severity_weight': severity,
                            'category': category,
                            'is_active': True,
                        }
                    )
                    
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1
            
            # Summary
            self.stdout.write('\n' + '-'*40)
            self.stdout.write(self.style.SUCCESS(f'✅ Created: {created_count} symptoms'))
            self.stdout.write(self.style.SUCCESS(f'✅ Updated: {updated_count} symptoms'))
            self.stdout.write(self.style.SUCCESS(f'✅ Total: {Symptom.objects.count()} symptoms in database'))
            
            # Show some examples
            self.stdout.write('\n📋 Sample symptoms:')
            for symptom in Symptom.objects.all()[:5]:
                self.stdout.write(f'   - {symptom.name_english} (weight: {symptom.severity_weight})')
            
        except Exception as e:
            raise CommandError(f'Error loading symptoms: {e}')
    
    def _guess_category(self, code: str, name: str) -> str:
        """
        Guess symptom category based on keywords in the name.
        """
        name_lower = name.lower()
        code_lower = code.lower()
        
        # Respiratory
        respiratory_keywords = [
            'cough', 'breath', 'chest', 'throat', 'nasal', 'nose', 
            'sneez', 'phlegm', 'sputum', 'wheez', 'lung', 'congestion'
        ]
        if any(kw in name_lower or kw in code_lower for kw in respiratory_keywords):
            return 'respiratory'
        
        # Digestive
        digestive_keywords = [
            'stomach', 'abdominal', 'belly', 'nausea', 'vomit', 'diarr',
            'constipat', 'indigest', 'acidity', 'bowel', 'stool', 'appetite'
        ]
        if any(kw in name_lower or kw in code_lower for kw in digestive_keywords):
            return 'digestive'
        
        # Cardiovascular
        cardio_keywords = [
            'heart', 'chest_pain', 'palpitation', 'blood_pressure'
        ]
        if any(kw in name_lower or kw in code_lower for kw in cardio_keywords):
            return 'cardiovascular'
        
        # Neurological
        neuro_keywords = [
            'headache', 'dizz', 'vertigo', 'balance', 'speech', 
            'memory', 'consciousness', 'seizure', 'numbness', 'tingling'
        ]
        if any(kw in name_lower or kw in code_lower for kw in neuro_keywords):
            return 'neurological'
        
        # Musculoskeletal
        musculo_keywords = [
            'joint', 'muscle', 'pain', 'stiff', 'weakness', 'cramp',
            'back', 'neck', 'knee', 'hip', 'walk'
        ]
        if any(kw in name_lower or kw in code_lower for kw in musculo_keywords):
            return 'musculoskeletal'
        
        # Skin
        skin_keywords = [
            'skin', 'rash', 'itch', 'blister', 'pimple', 'acne',
            'nail', 'hair', 'peeling', 'eruption'
        ]
        if any(kw in name_lower or kw in code_lower for kw in skin_keywords):
            return 'skin'
        
        # Mental
        mental_keywords = [
            'anxiety', 'depression', 'mood', 'irritab', 'restless',
            'sleep', 'insomnia', 'fatigue', 'lethargy'
        ]
        if any(kw in name_lower or kw in code_lower for kw in mental_keywords):
            return 'mental'
        
        # Urinary
        urinary_keywords = [
            'urin', 'bladder', 'kidney'
        ]
        if any(kw in name_lower or kw in code_lower for kw in urinary_keywords):
            return 'urinary'
        
        # Eye
        eye_keywords = [
            'eye', 'vision', 'blind'
        ]
        if any(kw in name_lower or kw in code_lower for kw in eye_keywords):
            return 'eye'
        
        # Default
        return 'general'