"""
ML Configuration
================
Central configuration for all ML models.
"""

import os
from pathlib import Path
from django.conf import settings


class MLConfig:
    """Configuration for ML models."""
    
    # Base directory for saving models
    MODELS_DIR = Path(settings.BASE_DIR) / 'apps' / 'diagnosis' / 'models_ml'
    
    # Data directory
    DATA_DIR = Path(settings.BASE_DIR) / 'data'
    
    # Model file names
    SYMPTOM_EXTRACTOR_MODEL = 'symptom_extractor.pkl'
    SYMPTOM_VECTORIZER = 'symptom_vectorizer.pkl'
    DISEASE_PREDICTOR_RF = 'disease_predictor_rf.pkl'
    DISEASE_PREDICTOR_NN = 'disease_predictor_nn.pkl'
    DISEASE_LABEL_ENCODER = 'disease_label_encoder.pkl'
    SEVERITY_MODEL = 'severity_model.pkl'
    SYMPTOM_LIST = 'symptom_list.pkl'
    
    # Training parameters
    RANDOM_STATE = 42
    TEST_SIZE = 0.2
    
    # Random Forest parameters
    RF_N_ESTIMATORS = 100
    RF_MAX_DEPTH = 20
    RF_MIN_SAMPLES_SPLIT = 5
    
    # Neural Network parameters
    NN_HIDDEN_LAYERS = (256, 128, 64)
    NN_MAX_ITER = 500
    NN_LEARNING_RATE = 0.001
    
    # Symptom extraction parameters
    SIMILARITY_THRESHOLD = 0.6  # Minimum similarity for fuzzy matching
    
    # Severity thresholds
    SEVERITY_THRESHOLDS = {
        'low': (0, 25),
        'medium': (25, 50),
        'high': (50, 75),
        'critical': (75, 100),
    }
    
    # Critical symptoms (always high severity)
    CRITICAL_SYMPTOMS = [
        'chest_pain',
        'breathlessness',
        'loss_of_consciousness',
        'paralysis',
        'coma',
        'seizures',
        'vomiting_blood',
        'bloody_stool',
        'acute_liver_failure',
    ]
    
    @classmethod
    def get_model_path(cls, filename: str) -> Path:
        """Get full path for a model file."""
        cls.MODELS_DIR.mkdir(parents=True, exist_ok=True)
        return cls.MODELS_DIR / filename
    
    @classmethod
    def model_exists(cls, filename: str) -> bool:
        """Check if a model file exists."""
        return (cls.MODELS_DIR / filename).exists()