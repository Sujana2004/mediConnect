"""
Django Management Command: Train ML Models
==========================================
Train all diagnosis ML models.

Usage:
    python manage.py train_models
    python manage.py train_models --model disease
    python manage.py train_models --model severity
"""

import time
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Train diagnosis ML models'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--model',
            type=str,
            choices=['all', 'disease', 'severity', 'symptom'],
            default='all',
            help='Which model to train (default: all)',
        )
        parser.add_argument(
            '--data-dir',
            type=str,
            help='Path to data directory',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('\n' + '='*60))
        self.stdout.write(self.style.NOTICE('🤖 TRAINING ML MODELS'))
        self.stdout.write(self.style.NOTICE('='*60 + '\n'))
        
        model_choice = options['model']
        
        try:
            if model_choice in ['all', 'symptom']:
                self._train_symptom_extractor()
            
            if model_choice in ['all', 'disease']:
                self._train_disease_predictor()
            
            if model_choice in ['all', 'severity']:
                self._train_severity_model()
            
            # Final summary
            self.stdout.write('\n' + '='*60)
            self.stdout.write(self.style.SUCCESS('✅ TRAINING COMPLETE!'))
            self.stdout.write('='*60)
            
            # Show model files
            from apps.diagnosis.ml import MLConfig
            self.stdout.write('\n📁 Model files:')
            for name, exists in self._check_model_files().items():
                status = '✅' if exists else '❌'
                self.stdout.write(f'   {status} {name}')
            
        except Exception as e:
            raise CommandError(f'Error training models: {e}')
    
    def _train_symptom_extractor(self):
        """Prepare symptom extractor data."""
        self.stdout.write(self.style.HTTP_INFO('\n📌 Preparing Symptom Extractor...'))
        start_time = time.time()
        
        from apps.diagnosis.ml.symptom_extractor import SymptomExtractor
        
        extractor = SymptomExtractor()
        extractor.load_from_database()
        extractor.save_to_file()
        
        elapsed = time.time() - start_time
        self.stdout.write(self.style.SUCCESS(
            f'   ✅ Symptom extractor prepared ({elapsed:.2f}s)'
        ))
        self.stdout.write(f'   - Symptoms: {len(extractor.symptom_codes)}')
        self.stdout.write(f'   - Keywords: {len(extractor.all_keywords)}')
    
    def _train_disease_predictor(self):
        """Train disease prediction models."""
        self.stdout.write(self.style.HTTP_INFO('\n📌 Training Disease Predictor...'))
        start_time = time.time()
        
        from apps.diagnosis.ml.disease_predictor import DiseasePredictorTrainer
        
        trainer = DiseasePredictorTrainer()
        metrics = trainer.train_all()
        
        elapsed = time.time() - start_time
        self.stdout.write(self.style.SUCCESS(
            f'   ✅ Disease predictor trained ({elapsed:.2f}s)'
        ))
        self.stdout.write(f'   - Samples: {metrics["num_samples"]}')
        self.stdout.write(f'   - Features: {metrics["num_features"]}')
        self.stdout.write(f'   - Classes: {metrics["num_classes"]}')
        self.stdout.write(f'   - Random Forest Accuracy: {metrics["rf_accuracy"]:.4f}')
        self.stdout.write(f'   - Neural Network Accuracy: {metrics["nn_accuracy"]:.4f}')
    
    def _train_severity_model(self):
        """Train severity assessment model."""
        self.stdout.write(self.style.HTTP_INFO('\n📌 Training Severity Model...'))
        start_time = time.time()
        
        from apps.diagnosis.ml.severity_assessor import SeverityAssessorTrainer
        
        trainer = SeverityAssessorTrainer()
        metrics = trainer.train()
        
        elapsed = time.time() - start_time
        self.stdout.write(self.style.SUCCESS(
            f'   ✅ Severity model trained ({elapsed:.2f}s)'
        ))
        self.stdout.write(f'   - Samples: {metrics["num_samples"]}')
        self.stdout.write(f'   - Accuracy: {metrics["accuracy"]:.4f}')
        self.stdout.write(f'   - Class distribution: {metrics["class_distribution"]}')
    
    def _check_model_files(self):
        """Check which model files exist."""
        from apps.diagnosis.ml import MLConfig
        
        return {
            'disease_predictor_rf.pkl': MLConfig.model_exists(MLConfig.DISEASE_PREDICTOR_RF),
            'disease_predictor_nn.pkl': MLConfig.model_exists(MLConfig.DISEASE_PREDICTOR_NN),
            'disease_label_encoder.pkl': MLConfig.model_exists(MLConfig.DISEASE_LABEL_ENCODER),
            'symptom_list.pkl': MLConfig.model_exists(MLConfig.SYMPTOM_LIST),
            'severity_model.pkl': MLConfig.model_exists(MLConfig.SEVERITY_MODEL),
        }