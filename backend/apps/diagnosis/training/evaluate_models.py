"""
Model Evaluation
================
Evaluate trained models and generate reports.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    classification_report, confusion_matrix
)
import logging

from apps.diagnosis.training.data_loader import DataLoader
from apps.diagnosis.ml import get_model_loader, MLConfig

logger = logging.getLogger(__name__)


class ModelEvaluator:
    """Evaluate diagnosis ML models."""
    
    def __init__(self):
        self.loader = DataLoader()
        self.model_loader = get_model_loader()
    
    def evaluate_disease_predictor(self) -> Dict:
        """
        Evaluate disease prediction model.
        
        Returns comprehensive evaluation metrics.
        """
        # Load test data
        df = self.loader.load_testing_data()
        if df is None:
            df = self.loader.load_training_data()
            if df is None:
                return {'error': 'No test data available'}
        
        # Get features and labels
        symptom_columns = [col for col in df.columns if col != 'prognosis']
        X = df[symptom_columns].values
        y_true = df['prognosis'].values
        
        # Get predictor
        predictor = self.model_loader.get_disease_predictor()
        if not predictor.is_loaded:
            return {'error': 'Disease predictor not loaded'}
        
        # Make predictions
        y_pred = []
        for i in range(len(X)):
            symptoms = [symptom_columns[j] for j in range(len(X[i])) if X[i][j] == 1]
            result = predictor.predict(symptoms, top_k=1)
            if result['predictions']:
                y_pred.append(result['predictions'][0]['disease_code'])
            else:
                y_pred.append('unknown')
        
        # Calculate metrics
        accuracy = accuracy_score(y_true, y_pred)
        
        # Per-class metrics
        report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
        
        return {
            'accuracy': accuracy,
            'num_samples': len(y_true),
            'num_classes': len(set(y_true)),
            'classification_report': report,
            'model_used': 'ensemble' if predictor.nn_model else 'random_forest'
        }
    
    def evaluate_symptom_extractor(self) -> Dict:
        """
        Evaluate symptom extraction.
        
        Uses Symptom2Disease.csv for evaluation.
        """
        # Load text data
        df = self.loader.load_symptom2disease()
        if df is None:
            return {'error': 'No evaluation data available'}
        
        extractor = self.model_loader.get_symptom_extractor()
        if not extractor.is_loaded:
            return {'error': 'Symptom extractor not loaded'}
        
        # Sample evaluation
        sample_size = min(100, len(df))
        sample = df.sample(sample_size, random_state=42)
        
        results = []
        for _, row in sample.iterrows():
            text = row['text']
            extraction = extractor.extract(text)
            
            results.append({
                'text': text[:100],
                'symptoms_found': len(extraction['symptoms']),
                'confidence': extraction['confidence']
            })
        
        avg_symptoms = np.mean([r['symptoms_found'] for r in results])
        avg_confidence = np.mean([r['confidence'] for r in results])
        
        return {
            'samples_evaluated': sample_size,
            'avg_symptoms_per_text': avg_symptoms,
            'avg_confidence': avg_confidence,
            'total_symptoms_in_db': len(extractor.symptom_codes),
        }
    
    def run_full_evaluation(self) -> Dict:
        """Run full evaluation of all models."""
        logger.info("Running full model evaluation...")
        
        results = {
            'disease_predictor': self.evaluate_disease_predictor(),
            'symptom_extractor': self.evaluate_symptom_extractor(),
        }
        
        return results
    
    def test_sample_diagnosis(self, text: str) -> Dict:
        """
        Test complete diagnosis pipeline with sample text.
        """
        from apps.diagnosis.services.diagnosis_service import DiagnosisService
        
        service = DiagnosisService()
        result = service.diagnose(text)
        
        return result