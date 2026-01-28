"""
Model Loader
============
Central loader for all ML models.
Ensures models are loaded only once and cached.
"""

import logging
from typing import Dict, Optional
from pathlib import Path

from .config import MLConfig
from .symptom_extractor import SymptomExtractor, get_symptom_extractor
from .disease_predictor import DiseasePredictor, get_disease_predictor
from .severity_assessor import SeverityAssessor, get_severity_assessor

logger = logging.getLogger(__name__)


class ModelLoader:
    """
    Central model loader and manager.
    
    Provides unified interface to load and access all ML models.
    """
    
    _instance = None
    _is_initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if ModelLoader._is_initialized:
            return
        
        self.symptom_extractor: Optional[SymptomExtractor] = None
        self.disease_predictor: Optional[DiseasePredictor] = None
        self.severity_assessor: Optional[SeverityAssessor] = None
        
        self.models_loaded = False
        ModelLoader._is_initialized = True
    
    def load_all_models(self, force_reload: bool = False) -> Dict:
        """
        Load all ML models.
        
        Args:
            force_reload: If True, reload even if already loaded
            
        Returns:
            Dictionary with loading status for each model
        """
        if self.models_loaded and not force_reload:
            logger.info("Models already loaded")
            return {
                'symptom_extractor': True,
                'disease_predictor': True,
                'severity_assessor': True,
                'status': 'already_loaded'
            }
        
        status = {}
        
        # Load Symptom Extractor
        try:
            self.symptom_extractor = get_symptom_extractor()
            self.symptom_extractor.load_from_database()
            status['symptom_extractor'] = self.symptom_extractor.is_loaded
            logger.info("Symptom extractor loaded")
        except Exception as e:
            logger.error(f"Error loading symptom extractor: {e}")
            status['symptom_extractor'] = False
        
        # Load Disease Predictor
        try:
            self.disease_predictor = get_disease_predictor()
            self.disease_predictor.load_models()
            status['disease_predictor'] = self.disease_predictor.is_loaded
            logger.info("Disease predictor loaded")
        except Exception as e:
            logger.error(f"Error loading disease predictor: {e}")
            status['disease_predictor'] = False
        
        # Load Severity Assessor
        try:
            self.severity_assessor = get_severity_assessor()
            self.severity_assessor.load()
            status['severity_assessor'] = self.severity_assessor.is_loaded
            logger.info("Severity assessor loaded")
        except Exception as e:
            logger.error(f"Error loading severity assessor: {e}")
            status['severity_assessor'] = False
        
        self.models_loaded = all(status.values())
        status['status'] = 'loaded' if self.models_loaded else 'partial'
        
        return status
    
    def get_symptom_extractor(self) -> SymptomExtractor:
        """Get symptom extractor instance."""
        if self.symptom_extractor is None or not self.symptom_extractor.is_loaded:
            self.symptom_extractor = get_symptom_extractor()
            self.symptom_extractor.load_from_database()
        return self.symptom_extractor
    
    def get_disease_predictor(self) -> DiseasePredictor:
        """Get disease predictor instance."""
        if self.disease_predictor is None or not self.disease_predictor.is_loaded:
            self.disease_predictor = get_disease_predictor()
            self.disease_predictor.load_models()
        return self.disease_predictor
    
    def get_severity_assessor(self) -> SeverityAssessor:
        """Get severity assessor instance."""
        if self.severity_assessor is None or not self.severity_assessor.is_loaded:
            self.severity_assessor = get_severity_assessor()
            self.severity_assessor.load()
        return self.severity_assessor
    
    def check_models_exist(self) -> Dict:
        """
        Check if model files exist.
        
        Returns dict with file existence status.
        """
        return {
            'disease_predictor_rf': MLConfig.model_exists(MLConfig.DISEASE_PREDICTOR_RF),
            'disease_predictor_nn': MLConfig.model_exists(MLConfig.DISEASE_PREDICTOR_NN),
            'label_encoder': MLConfig.model_exists(MLConfig.DISEASE_LABEL_ENCODER),
            'symptom_list': MLConfig.model_exists(MLConfig.SYMPTOM_LIST),
            'severity_model': MLConfig.model_exists(MLConfig.SEVERITY_MODEL),
        }
    
    def get_model_info(self) -> Dict:
        """
        Get information about loaded models.
        """
        info = {
            'models_loaded': self.models_loaded,
            'models_dir': str(MLConfig.MODELS_DIR),
            'files_exist': self.check_models_exist(),
        }
        
        if self.disease_predictor and self.disease_predictor.is_loaded:
            info['disease_predictor'] = {
                'num_symptoms': len(self.disease_predictor.symptom_columns),
                'num_diseases': len(self.disease_predictor.label_encoder.classes_)
                    if self.disease_predictor.label_encoder else 0,
                'has_rf': self.disease_predictor.rf_model is not None,
                'has_nn': self.disease_predictor.nn_model is not None,
            }
        
        if self.symptom_extractor and self.symptom_extractor.is_loaded:
            info['symptom_extractor'] = {
                'num_symptoms': len(self.symptom_extractor.symptom_codes),
                'num_keywords': len(self.symptom_extractor.all_keywords),
            }
        
        return info


# Convenience function
def get_model_loader() -> ModelLoader:
    """Get the singleton ModelLoader instance."""
    return ModelLoader()