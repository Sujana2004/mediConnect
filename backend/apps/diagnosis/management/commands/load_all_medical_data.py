"""
Django Management Command: Load All Medical Data
================================================
Master command to load all medical data in correct order.

Usage:
    python manage.py load_all_medical_data
    python manage.py load_all_medical_data --clear
"""

from django.core.management.base import BaseCommand, CommandError
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Load all medical data (symptoms, diseases, mappings)'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing data before loading',
        )
        parser.add_argument(
            '--data-dir',
            type=str,
            help='Path to data directory',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('\n' + '='*60))
        self.stdout.write(self.style.NOTICE('🏥 LOADING ALL MEDICAL DATA'))
        self.stdout.write(self.style.NOTICE('='*60 + '\n'))
        
        clear = options['clear']
        data_dir = options.get('data_dir')
        
        try:
            # Step 1: Load Symptoms
            self.stdout.write(self.style.HTTP_INFO('\n📌 STEP 1/3: Loading Symptoms...'))
            cmd_options = {'clear': clear}
            if data_dir:
                cmd_options['data_dir'] = data_dir
            call_command('load_symptoms', **cmd_options)
            
            # Step 2: Load Diseases
            self.stdout.write(self.style.HTTP_INFO('\n📌 STEP 2/3: Loading Diseases...'))
            call_command('load_diseases', **cmd_options)
            
            # Step 3: Load Mappings
            self.stdout.write(self.style.HTTP_INFO('\n📌 STEP 3/3: Loading Disease-Symptom Mappings...'))
            call_command('load_disease_mappings', **cmd_options)
            
            # Final Summary
            self.stdout.write('\n' + '='*60)
            self.stdout.write(self.style.SUCCESS('✅ ALL MEDICAL DATA LOADED SUCCESSFULLY!'))
            self.stdout.write('='*60)
            
            # Show counts
            from apps.diagnosis.models import Symptom, Disease, DiseaseSymptomMapping
            self.stdout.write(f'\n📊 Database Summary:')
            self.stdout.write(f'   - Symptoms: {Symptom.objects.count()}')
            self.stdout.write(f'   - Diseases: {Disease.objects.count()}')
            self.stdout.write(f'   - Mappings: {DiseaseSymptomMapping.objects.count()}')
            self.stdout.write('')
            
        except Exception as e:
            raise CommandError(f'Error loading medical data: {e}')