"""
Disease Predictor
=================
Predict diseases from symptoms using ML models.

Models:
1. Random Forest Classifier (primary)
2. Neural Network / MLP Classifier (secondary)
3. Ensemble of both

Training data: Training.csv (binary symptom matrix + disease labels)
"""

import pickle
import numpy as np
from typing import List, Dict, Tuple, Optional
from pathlib import Path
import logging

from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import LabelEncoder

from .config import MLConfig

logger = logging.getLogger(__name__)


class DiseasePredictor:
    """
    Predict diseases from symptom list.
    
    Uses ensemble of Random Forest and Neural Network
    for better accuracy.
    """
    
    def __init__(self):
        self.rf_model: Optional[RandomForestClassifier] = None
        self.nn_model: Optional[MLPClassifier] = None
        self.label_encoder: Optional[LabelEncoder] = None
        self.symptom_columns: List[str] = []
        self.is_loaded = False
    
    def load_models(self):
        """Load trained models from files."""
        try:
            # Load Random Forest
            rf_path = MLConfig.get_model_path(MLConfig.DISEASE_PREDICTOR_RF)
            if rf_path.exists():
                with open(rf_path, 'rb') as f:
                    self.rf_model = pickle.load(f)
                logger.info("Loaded Random Forest model")
            
            # Load Neural Network
            nn_path = MLConfig.get_model_path(MLConfig.DISEASE_PREDICTOR_NN)
            if nn_path.exists():
                with open(nn_path, 'rb') as f:
                    self.nn_model = pickle.load(f)
                logger.info("Loaded Neural Network model")
            
            # Load Label Encoder
            le_path = MLConfig.get_model_path(MLConfig.DISEASE_LABEL_ENCODER)
            if le_path.exists():
                with open(le_path, 'rb') as f:
                    self.label_encoder = pickle.load(f)
                logger.info("Loaded Label Encoder")
            
            # Load symptom columns
            symptom_path = MLConfig.get_model_path(MLConfig.SYMPTOM_LIST)
            if symptom_path.exists():
                with open(symptom_path, 'rb') as f:
                    data = pickle.load(f)
                    self.symptom_columns = data.get('columns', data.get('codes', []))
                logger.info(f"Loaded {len(self.symptom_columns)} symptom columns")
            
            self.is_loaded = (
                self.rf_model is not None and
                self.label_encoder is not None and
                len(self.symptom_columns) > 0
            )
            
            if self.is_loaded:
                logger.info("Disease predictor loaded successfully")
            else:
                logger.warning("Disease predictor partially loaded")
                
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            self.is_loaded = False
    
    def symptoms_to_vector(self, symptoms: List[str]) -> np.ndarray:
        """
        Convert list of symptom codes to binary vector.
        
        Args:
            symptoms: List of symptom codes ['fever', 'headache', ...]
            
        Returns:
            Binary numpy array matching symptom_columns order
        """
        if not self.symptom_columns:
            logger.error("Symptom columns not loaded")
            return np.array([])
        
        # Create binary vector
        vector = np.zeros(len(self.symptom_columns), dtype=np.float32)
        
        # Normalize symptom codes
        symptoms_normalized = [s.lower().replace(' ', '_') for s in symptoms]
        
        for i, col in enumerate(self.symptom_columns):
            col_normalized = col.lower().replace(' ', '_')
            if col_normalized in symptoms_normalized:
                vector[i] = 1.0
        
        return vector.reshape(1, -1)
    
    def predict(
        self, 
        symptoms: List[str],
        top_k: int = 5,
        use_ensemble: bool = True
    ) -> Dict:
        """
        Predict diseases from symptoms.
        
        Args:
            symptoms: List of symptom codes
            top_k: Number of top predictions to return
            use_ensemble: Whether to use ensemble of RF and NN
            
        Returns:
            {
                'predictions': [
                    {
                        'disease_code': 'fungal_infection',
                        'disease_name': 'Fungal Infection',
                        'confidence': 0.85,
                        'rank': 1
                    },
                    ...
                ],
                'top_prediction': {...},
                'model_used': 'ensemble' | 'random_forest' | 'neural_network'
            }
        """
        if not self.is_loaded:
            self.load_models()
        
        if not self.is_loaded:
            return {
                'predictions': [],
                'top_prediction': None,
                'model_used': None,
                'error': 'Models not loaded'
            }
        
        if not symptoms:
            return {
                'predictions': [],
                'top_prediction': None,
                'model_used': None,
                'error': 'No symptoms provided'
            }
        
        # Convert symptoms to vector
        X = self.symptoms_to_vector(symptoms)
        
        if X.size == 0:
            return {
                'predictions': [],
                'top_prediction': None,
                'model_used': None,
                'error': 'Failed to create symptom vector'
            }
        
        # Get predictions
        if use_ensemble and self.rf_model and self.nn_model:
            probabilities = self._ensemble_predict(X)
            model_used = 'ensemble'
        elif self.rf_model:
            probabilities = self.rf_model.predict_proba(X)[0]
            model_used = 'random_forest'
        elif self.nn_model:
            probabilities = self.nn_model.predict_proba(X)[0]
            model_used = 'neural_network'
        else:
            return {
                'predictions': [],
                'top_prediction': None,
                'model_used': None,
                'error': 'No model available'
            }
        
        # Get top-k predictions
        top_indices = np.argsort(probabilities)[-top_k:][::-1]
        
        predictions = []
        for rank, idx in enumerate(top_indices, 1):
            disease_code = self.label_encoder.classes_[idx]
            confidence = float(probabilities[idx])
            
            predictions.append({
                'disease_code': disease_code,
                'disease_name': self._get_disease_name(disease_code),
                'confidence': round(confidence, 4),
                'rank': rank
            })
        
        return {
            'predictions': predictions,
            'top_prediction': predictions[0] if predictions else None,
            'model_used': model_used
        }
    
    def _ensemble_predict(self, X: np.ndarray) -> np.ndarray:
        """
        Ensemble prediction using weighted average.
        
        RF gets higher weight as it's usually more reliable for this task.
        """
        rf_proba = self.rf_model.predict_proba(X)[0]
        nn_proba = self.nn_model.predict_proba(X)[0]
        
        # Weighted average (RF: 0.6, NN: 0.4)
        ensemble_proba = 0.6 * rf_proba + 0.4 * nn_proba
        
        return ensemble_proba
    
    def _get_disease_name(self, disease_code: str) -> str:
        """Get display name for disease code."""
        try:
            from apps.diagnosis.models import Disease
            disease = Disease.objects.filter(code=disease_code).first()
            if disease:
                return disease.name_english
        except:
            pass
        
        # Fallback: convert code to title case
        return disease_code.replace('_', ' ').title()
    
    def get_disease_info(self, disease_code: str) -> Dict:
        """Get detailed information about a disease."""
        try:
            from apps.diagnosis.models import Disease
            disease = Disease.objects.filter(code=disease_code).first()
            
            if disease:
                return {
                    'code': disease.code,
                    'name': disease.name_english,
                    'description': disease.description,
                    'severity': disease.typical_severity,
                    'specialist': disease.recommended_specialist,
                    'precautions': disease.get_precautions('en'),
                    'requires_emergency': disease.requires_immediate_care,
                }
        except Exception as e:
            logger.error(f"Error getting disease info: {e}")
        
        return {
            'code': disease_code,
            'name': disease_code.replace('_', ' ').title(),
            'description': '',
            'severity': 'moderate',
            'specialist': 'general',
            'precautions': [],
            'requires_emergency': False,
        }


class DiseasePredictorTrainer:
    """
    Train disease prediction models.
    
    Uses Training.csv data to train:
    1. Random Forest Classifier
    2. Neural Network (MLP)
    """
    
    def __init__(self):
        self.rf_model = None
        self.nn_model = None
        self.label_encoder = LabelEncoder()
        self.symptom_columns = []
        
        # Training metrics
        self.rf_accuracy = 0.0
        self.nn_accuracy = 0.0
    
    def load_training_data(self) -> Tuple[np.ndarray, np.ndarray]:
        """
        Load training data from Training.csv.
        
        Returns:
            X: Feature matrix (symptoms)
            y: Labels (diseases)
        """
        from apps.diagnosis.training.data_loader import DataLoader
        
        loader = DataLoader()
        df = loader.load_training_data()
        
        if df is None:
            raise ValueError("Failed to load Training.csv")
        
        # Get feature columns (all except prognosis)
        self.symptom_columns = [col for col in df.columns if col != 'prognosis']
        
        # Features
        X = df[self.symptom_columns].values.astype(np.float32)
        
        # Labels
        y_raw = df['prognosis'].values
        y = self.label_encoder.fit_transform(y_raw)
        
        logger.info(f"Loaded training data: {X.shape[0]} samples, {X.shape[1]} features")
        logger.info(f"Number of classes: {len(self.label_encoder.classes_)}")
        
        return X, y
    
    def train_random_forest(
        self, 
        X: np.ndarray, 
        y: np.ndarray,
        **kwargs
    ) -> RandomForestClassifier:
        """
        Train Random Forest classifier.
        """
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import accuracy_score, classification_report
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=MLConfig.TEST_SIZE,
            random_state=MLConfig.RANDOM_STATE,
            stratify=y
        )
        
        # Create and train model
        self.rf_model = RandomForestClassifier(
            n_estimators=kwargs.get('n_estimators', MLConfig.RF_N_ESTIMATORS),
            max_depth=kwargs.get('max_depth', MLConfig.RF_MAX_DEPTH),
            min_samples_split=kwargs.get('min_samples_split', MLConfig.RF_MIN_SAMPLES_SPLIT),
            random_state=MLConfig.RANDOM_STATE,
            n_jobs=-1,
            class_weight='balanced'
        )
        
        logger.info("Training Random Forest...")
        self.rf_model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.rf_model.predict(X_test)
        self.rf_accuracy = accuracy_score(y_test, y_pred)
        
        logger.info(f"Random Forest Accuracy: {self.rf_accuracy:.4f}")
        
        return self.rf_model
    
    def train_neural_network(
        self, 
        X: np.ndarray, 
        y: np.ndarray,
        **kwargs
    ) -> MLPClassifier:
        """
        Train Neural Network (MLP) classifier.
        """
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import accuracy_score
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=MLConfig.TEST_SIZE,
            random_state=MLConfig.RANDOM_STATE,
            stratify=y
        )
        
        # Create and train model
        self.nn_model = MLPClassifier(
            hidden_layer_sizes=kwargs.get('hidden_layers', MLConfig.NN_HIDDEN_LAYERS),
            max_iter=kwargs.get('max_iter', MLConfig.NN_MAX_ITER),
            learning_rate_init=kwargs.get('learning_rate', MLConfig.NN_LEARNING_RATE),
            random_state=MLConfig.RANDOM_STATE,
            early_stopping=True,
            validation_fraction=0.1,
            n_iter_no_change=20,
            verbose=False
        )
        
        logger.info("Training Neural Network...")
        self.nn_model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.nn_model.predict(X_test)
        self.nn_accuracy = accuracy_score(y_test, y_pred)
        
        logger.info(f"Neural Network Accuracy: {self.nn_accuracy:.4f}")
        
        return self.nn_model
    
    def train_all(self) -> Dict:
        """
        Train all models and save them.
        
        Returns training metrics.
        """
        # Load data
        X, y = self.load_training_data()
        
        # Train models
        self.train_random_forest(X, y)
        self.train_neural_network(X, y)
        
        # Save models
        self.save_models()
        
        return {
            'rf_accuracy': self.rf_accuracy,
            'nn_accuracy': self.nn_accuracy,
            'num_samples': X.shape[0],
            'num_features': X.shape[1],
            'num_classes': len(self.label_encoder.classes_),
            'symptom_columns': len(self.symptom_columns),
        }
    
    def save_models(self):
        """Save all trained models to files."""
        # Ensure directory exists
        MLConfig.MODELS_DIR.mkdir(parents=True, exist_ok=True)
        
        # Save Random Forest
        if self.rf_model:
            rf_path = MLConfig.get_model_path(MLConfig.DISEASE_PREDICTOR_RF)
            with open(rf_path, 'wb') as f:
                pickle.dump(self.rf_model, f)
            logger.info(f"Saved Random Forest to {rf_path}")
        
        # Save Neural Network
        if self.nn_model:
            nn_path = MLConfig.get_model_path(MLConfig.DISEASE_PREDICTOR_NN)
            with open(nn_path, 'wb') as f:
                pickle.dump(self.nn_model, f)
            logger.info(f"Saved Neural Network to {nn_path}")
        
        # Save Label Encoder
        le_path = MLConfig.get_model_path(MLConfig.DISEASE_LABEL_ENCODER)
        with open(le_path, 'wb') as f:
            pickle.dump(self.label_encoder, f)
        logger.info(f"Saved Label Encoder to {le_path}")
        
        # Save symptom columns
        symptom_path = MLConfig.get_model_path(MLConfig.SYMPTOM_LIST)
        data = {
            'codes': self.symptom_columns,
            'columns': self.symptom_columns,
        }
        with open(symptom_path, 'wb') as f:
            pickle.dump(data, f)
        logger.info(f"Saved symptom list to {symptom_path}")


# Singleton instance
_disease_predictor = None


def get_disease_predictor() -> DiseasePredictor:
    """Get or create the disease predictor singleton."""
    global _disease_predictor
    if _disease_predictor is None:
        _disease_predictor = DiseasePredictor()
    return _disease_predictor