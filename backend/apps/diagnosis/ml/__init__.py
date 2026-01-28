"""
Diagnosis ML Module
===================
Contains all machine learning components:
- Symptom Extractor (NER/NLP)
- Disease Predictor (Classification)
- Severity Assessor
"""
"""
Diagnosis ML Module
===================
Machine Learning components for symptom extraction,
disease prediction, and severity assessment.

Usage:
    from apps.diagnosis.ml import get_model_loader
    
    loader = get_model_loader()
    loader.load_all_models()
    
    # Extract symptoms
    extractor = loader.get_symptom_extractor()
    result = extractor.extract("I have fever and headache")
    
    # Predict disease
    predictor = loader.get_disease_predictor()
    prediction = predictor.predict(['fever', 'headache'])
    
    # Assess severity
    assessor = loader.get_severity_assessor()
    severity = assessor.assess(['fever', 'headache'])
"""

from .config import MLConfig
from .model_loader import ModelLoader, get_model_loader
from .symptom_extractor import SymptomExtractor, get_symptom_extractor
from .disease_predictor import DiseasePredictor, get_disease_predictor
from .severity_assessor import SeverityAssessor, get_severity_assessor

__all__ = [
    'MLConfig',
    'ModelLoader',
    'get_model_loader',
    'SymptomExtractor',
    'get_symptom_extractor',
    'DiseasePredictor',
    'get_disease_predictor',
    'SeverityAssessor',
    'get_severity_assessor',
]