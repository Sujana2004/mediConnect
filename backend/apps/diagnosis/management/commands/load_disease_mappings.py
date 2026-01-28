"""
Django Management Command: Load Disease-Symptom Mappings
========================================================
Create mappings between diseases and symptoms based on Training.csv.

Usage:
    python manage.py load_disease_mappings
    python manage.py load_disease_mappings --clear
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.diagnosis.models import Disease, Symptom, DiseaseSymptomMapping
from apps.diagnosis.training.data_loader import DataLoader
from apps.diagnosis.utils.text_utils import TextUtils


class Command(BaseCommand):
    help = 'Load disease-symptom mappings from Training.csv'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing mappings before loading',
        )
        parser.add_argument(
            '--data-dir',
            type=str,
            help='Path to data directory',
        )
        parser.add_argument(
            '--min-probability',
            type=float,
            default=0.1,
            help='Minimum probability threshold (default: 0.1)',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('\n' + '='*60))
        self.stdout.write(self.style.NOTICE('Loading Disease-Symptom Mappings'))
        self.stdout.write(self.style.NOTICE('='*60 + '\n'))
        
        try:
            # Check if symptoms and diseases exist
            symptom_count = Symptom.objects.count()
            disease_count = Disease.objects.count()
            
            if symptom_count == 0:
                raise CommandError('No symptoms found. Run load_symptoms first.')
            if disease_count == 0:
                raise CommandError('No diseases found. Run load_diseases first.')
            
            self.stdout.write(f'Found {symptom_count} symptoms and {disease_count} diseases')
            
            # Initialize data loader
            data_dir = options.get('data_dir')
            loader = DataLoader(data_dir) if data_dir else DataLoader()
            min_prob = options['min_probability']
            
            # Clear existing mappings if requested
            if options['clear']:
                self.stdout.write('Clearing existing mappings...')
                deleted_count = DiseaseSymptomMapping.objects.all().delete()[0]
                self.stdout.write(self.style.WARNING(f'Deleted {deleted_count} mappings'))
            
            # Load training data
            self.stdout.write('Loading Training.csv...')
            training_df = loader.load_training_data()
            
            if training_df is None:
                raise CommandError('Failed to load Training.csv')
            
            # Get symptom columns
            symptom_columns = [col for col in training_df.columns if col != 'prognosis']
            
            # Group by disease and calculate mean for each symptom
            self.stdout.write('Calculating disease-symptom probabilities...')
            grouped = training_df.groupby('prognosis')[symptom_columns].mean()
            
            # Build lookup dictionaries
            symptom_lookup = {s.code: s for s in Symptom.objects.all()}
            disease_lookup = {d.code: d for d in Disease.objects.all()}
            
            # Create mappings
            created_count = 0
            skipped_count = 0
            
            with transaction.atomic():
                for disease_raw in grouped.index:
                    disease_code = TextUtils.disease_to_code(disease_raw)
                    disease_obj = disease_lookup.get(disease_code)
                    
                    if not disease_obj:
                        self.stdout.write(self.style.WARNING(
                            f'Disease not found: {disease_code}'
                        ))
                        continue
                    
                    for symptom_col in symptom_columns:
                        prob = grouped.loc[disease_raw, symptom_col]
                        
                        # Skip low probability mappings
                        if prob < min_prob:
                            skipped_count += 1
                            continue
                        
                        symptom_code = TextUtils.symptom_to_code(symptom_col)
                        symptom_obj = symptom_lookup.get(symptom_code)
                        
                        if not symptom_obj:
                            continue
                        
                        # Create or update mapping
                        mapping, created = DiseaseSymptomMapping.objects.update_or_create(
                            disease=disease_obj,
                            symptom=symptom_obj,
                            defaults={
                                'weight': round(float(prob), 4),
                                'is_primary': prob >= 0.7,
                            }
                        )
                        
                        if created:
                            created_count += 1
            
            # Summary
            self.stdout.write('\n' + '-'*40)
            self.stdout.write(self.style.SUCCESS(f'✅ Created: {created_count} mappings'))
            self.stdout.write(self.style.SUCCESS(f'✅ Skipped: {skipped_count} low-probability mappings'))
            self.stdout.write(self.style.SUCCESS(
                f'✅ Total: {DiseaseSymptomMapping.objects.count()} mappings in database'
            ))
            
            # Show statistics
            self.stdout.write('\n📊 Mapping Statistics:')
            primary_count = DiseaseSymptomMapping.objects.filter(is_primary=True).count()
            self.stdout.write(f'   - Primary symptoms: {primary_count}')
            
            avg_symptoms = DiseaseSymptomMapping.objects.count() / disease_count
            self.stdout.write(f'   - Avg symptoms per disease: {avg_symptoms:.1f}')
            
        except Exception as e:
            raise CommandError(f'Error loading mappings: {e}')