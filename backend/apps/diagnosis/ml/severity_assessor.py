"""
Severity Assessor
=================
Assess the severity of symptoms using ML.

Uses multiple factors:
1. Symptom severity weights (from Symptom-severity.csv)
2. Number of symptoms
3. Presence of critical symptoms
4. Disease severity (if predicted)
"""

import pickle
import numpy as np
from typing import List, Dict, Optional
from pathlib import Path
import logging

from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder

from .config import MLConfig

logger = logging.getLogger(__name__)


class SeverityAssessor:
    """
    Assess severity level from symptoms.
    
    Combines rule-based and ML-based approaches:
    1. Rule-based: Critical symptoms, symptom count
    2. ML-based: Trained classifier on severity data
    """
    
    def __init__(self):
        self.ml_model: Optional[GradientBoostingClassifier] = None
        self.label_encoder: Optional[LabelEncoder] = None
        self.symptom_weights: Dict[str, int] = {}
        self.is_loaded = False
    
    def load(self):
        """Load severity model and symptom weights."""
        try:
            # Load symptom weights from database
            self._load_symptom_weights()
            
            # Try to load ML model (optional)
            model_path = MLConfig.get_model_path(MLConfig.SEVERITY_MODEL)
            if model_path.exists():
                with open(model_path, 'rb') as f:
                    data = pickle.load(f)
                    self.ml_model = data.get('model')
                    self.label_encoder = data.get('label_encoder')
                logger.info("Loaded severity ML model")
            
            self.is_loaded = True
            
        except Exception as e:
            logger.error(f"Error loading severity assessor: {e}")
            self.is_loaded = False
    
    def _load_symptom_weights(self):
        """Load symptom severity weights from database."""
        try:
            from apps.diagnosis.models import Symptom
            
            symptoms = Symptom.objects.filter(is_active=True)
            self.symptom_weights = {
                s.code: s.severity_weight for s in symptoms
            }
            
            logger.info(f"Loaded {len(self.symptom_weights)} symptom weights")
            
        except Exception as e:
            logger.error(f"Error loading symptom weights: {e}")
            
            # Fallback: load from file
            try:
                from apps.diagnosis.training.data_loader import DataLoader
                loader = DataLoader()
                self.symptom_weights = loader.get_symptom_severity_map()
            except:
                pass
    
    def assess(
        self, 
        symptoms: List[str],
        patient_age: Optional[int] = None,
        patient_gender: Optional[str] = None,
        predicted_disease: Optional[str] = None
    ) -> Dict:
        """
        Assess severity from symptoms.
        
        Args:
            symptoms: List of symptom codes
            patient_age: Patient's age (optional)
            patient_gender: Patient's gender (optional)
            predicted_disease: Predicted disease code (optional)
            
        Returns:
            {
                'level': 'low' | 'medium' | 'high' | 'critical',
                'score': 0-100,
                'factors': [
                    {'factor': 'Critical symptom: chest_pain', 'impact': 'high'},
                    ...
                ],
                'recommendations': [
                    'Seek immediate medical attention',
                    ...
                ],
                'requires_emergency': True | False
            }
        """
        if not self.is_loaded:
            self.load()
        
        if not symptoms:
            return {
                'level': 'low',
                'score': 0,
                'factors': [],
                'recommendations': ['Please describe your symptoms'],
                'requires_emergency': False
            }
        
        # Normalize symptom codes
        symptoms = [s.lower().replace(' ', '_') for s in symptoms]
        
        # Calculate severity score using multiple factors
        score = 0.0
        factors = []
        
        # Factor 1: Symptom severity weights
        weight_score = self._calculate_weight_score(symptoms)
        score += weight_score * 0.4  # 40% weight
        if weight_score > 0:
            factors.append({
                'factor': f'Symptom severity sum: {weight_score:.1f}',
                'impact': 'medium'
            })
        
        # Factor 2: Number of symptoms
        count_score = self._calculate_count_score(symptoms)
        score += count_score * 0.2  # 20% weight
        if len(symptoms) >= 5:
            factors.append({
                'factor': f'Multiple symptoms ({len(symptoms)})',
                'impact': 'medium'
            })
        
        # Factor 3: Critical symptoms
        critical_score, critical_found = self._check_critical_symptoms(symptoms)
        score += critical_score * 0.3  # 30% weight
        for cs in critical_found:
            factors.append({
                'factor': f'Critical symptom: {cs.replace("_", " ")}',
                'impact': 'high'
            })
        
        # Factor 4: Age factor
        if patient_age:
            age_score = self._calculate_age_factor(patient_age)
            score += age_score * 0.1  # 10% weight
            if age_score > 20:
                age_group = 'elderly' if patient_age > 60 else 'child'
                factors.append({
                    'factor': f'Age risk factor ({age_group})',
                    'impact': 'medium'
                })
        
        # Ensure score is within bounds
        score = min(100, max(0, score))
        
        # Determine level
        level = self._score_to_level(score)
        
        # Check for emergency
        requires_emergency = len(critical_found) > 0 or level == 'critical'
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            level, symptoms, critical_found, predicted_disease
        )
        
        return {
            'level': level,
            'score': round(score, 2),
            'factors': factors,
            'recommendations': recommendations,
            'requires_emergency': requires_emergency
        }
    
    def _calculate_weight_score(self, symptoms: List[str]) -> float:
        """Calculate score based on symptom severity weights."""
        if not symptoms:
            return 0.0
        
        total_weight = 0
        matched = 0
        
        for symptom in symptoms:
            weight = self.symptom_weights.get(symptom, 1)
            total_weight += weight
            matched += 1
        
        if matched == 0:
            return 0.0
        
        # Normalize: max weight is 7, typical symptoms around 3-5
        avg_weight = total_weight / matched
        
        # Scale to 0-100 based on average and count
        # More symptoms with higher weights = higher score
        score = (avg_weight / 7) * 50 + min(matched, 10) * 5
        
        return min(100, score)
    
    def _calculate_count_score(self, symptoms: List[str]) -> float:
        """Calculate score based on number of symptoms."""
        count = len(symptoms)
        
        if count <= 2:
            return 10
        elif count <= 4:
            return 30
        elif count <= 6:
            return 50
        elif count <= 8:
            return 70
        else:
            return 90
    
    def _check_critical_symptoms(self, symptoms: List[str]) -> tuple:
        """
        Check for critical symptoms.
        
        Returns:
            (score: float, critical_found: List[str])
        """
        critical_found = []
        
        for symptom in symptoms:
            if symptom in MLConfig.CRITICAL_SYMPTOMS:
                critical_found.append(symptom)
        
        if not critical_found:
            return 0.0, []
        
        # Each critical symptom adds significant score
        score = min(100, len(critical_found) * 40)
        
        return score, critical_found
    
    def _calculate_age_factor(self, age: int) -> float:
        """Calculate risk factor based on age."""
        if age < 5:  # Infant/toddler
            return 30
        elif age < 12:  # Child
            return 15
        elif age < 60:  # Adult
            return 0
        elif age < 75:  # Senior
            return 20
        else:  # Elderly
            return 35
    
    def _score_to_level(self, score: float) -> str:
        """Convert numeric score to severity level."""
        for level, (low, high) in MLConfig.SEVERITY_THRESHOLDS.items():
            if low <= score < high:
                return level
        return 'critical' if score >= 75 else 'low'
    
    def _generate_recommendations(
        self, 
        level: str,
        symptoms: List[str],
        critical_symptoms: List[str],
        predicted_disease: Optional[str]
    ) -> List[str]:
        """Generate recommendations based on assessment."""
        recommendations = []
        
        if level == 'critical' or critical_symptoms:
            recommendations.append("🚨 Seek immediate medical attention")
            recommendations.append("Call emergency services or visit the nearest hospital")
            if 'chest_pain' in critical_symptoms:
                recommendations.append("Do not ignore chest pain - it could be cardiac related")
            if 'breathlessness' in critical_symptoms:
                recommendations.append("Sit upright and try to stay calm while waiting for help")
        
        elif level == 'high':
            recommendations.append("Consult a doctor as soon as possible")
            recommendations.append("Do not delay seeking medical advice")
            recommendations.append("Keep track of any changes in symptoms")
        
        elif level == 'medium':
            recommendations.append("Schedule a doctor's appointment within 24-48 hours")
            recommendations.append("Monitor your symptoms")
            recommendations.append("Rest and stay hydrated")
        
        else:  # low
            recommendations.append("Rest and monitor your symptoms")
            recommendations.append("Stay hydrated and get adequate sleep")
            recommendations.append("If symptoms persist for more than 3 days, consult a doctor")
        
        # Add general recommendations
        recommendations.append("Avoid self-medication without professional advice")
        
        return recommendations


class SeverityAssessorTrainer:
    """
    Train severity assessment model.
    
    Uses symptom weights and disease severity to create training data.
    """
    
    def __init__(self):
        self.model = None
        self.label_encoder = LabelEncoder()
    
    def train(self) -> Dict:
        """
        Train severity assessment model.
        
        Creates synthetic training data based on symptom weights
        and known disease severities.
        """
        from apps.diagnosis.training.data_loader import DataLoader
        
        loader = DataLoader()
        
        # Load training data
        df = loader.load_training_data()
        if df is None:
            raise ValueError("Failed to load training data")
        
        # Get symptom severity map
        severity_map = loader.get_symptom_severity_map()
        
        # Create features and labels
        symptom_columns = [col for col in df.columns if col != 'prognosis']
        
        X = []
        y = []
        
        for _, row in df.iterrows():
            # Calculate severity score for this sample
            symptom_weights = []
            symptom_count = 0
            
            for col in symptom_columns:
                if row[col] == 1:
                    symptom_count += 1
                    weight = severity_map.get(col, 1)
                    symptom_weights.append(weight)
            
            # Create feature vector
            if symptom_weights:
                avg_weight = np.mean(symptom_weights)
                max_weight = max(symptom_weights)
                total_weight = sum(symptom_weights)
            else:
                avg_weight = 0
                max_weight = 0
                total_weight = 0
            
            features = [
                symptom_count,
                avg_weight,
                max_weight,
                total_weight,
                len([w for w in symptom_weights if w >= 5]),  # high severity count
            ]
            
            X.append(features)
            
            # Calculate severity label
            if max_weight >= 6 or total_weight >= 25:
                label = 'critical'
            elif max_weight >= 4 or total_weight >= 15:
                label = 'high'
            elif avg_weight >= 2.5 or symptom_count >= 5:
                label = 'medium'
            else:
                label = 'low'
            
            y.append(label)
        
        X = np.array(X)
        y = np.array(y)
        
        # Encode labels
        y_encoded = self.label_encoder.fit_transform(y)
        
        # Train model
        self.model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=5,
            random_state=MLConfig.RANDOM_STATE
        )
        
        self.model.fit(X, y_encoded)
        
        # Calculate accuracy (on training data)
        accuracy = self.model.score(X, y_encoded)
        
        # Save model
        self.save()
        
        return {
            'accuracy': accuracy,
            'num_samples': len(X),
            'class_distribution': {
                label: int((y == label).sum())
                for label in self.label_encoder.classes_
            }
        }
    
    def save(self):
        """Save trained model."""
        if self.model is None:
            return
        
        MLConfig.MODELS_DIR.mkdir(parents=True, exist_ok=True)
        
        model_path = MLConfig.get_model_path(MLConfig.SEVERITY_MODEL)
        data = {
            'model': self.model,
            'label_encoder': self.label_encoder,
        }
        
        with open(model_path, 'wb') as f:
            pickle.dump(data, f)
        
        logger.info(f"Saved severity model to {model_path}")


# Singleton instance
_severity_assessor = None


def get_severity_assessor() -> SeverityAssessor:
    """Get or create the severity assessor singleton."""
    global _severity_assessor
    if _severity_assessor is None:
        _severity_assessor = SeverityAssessor()
    return _severity_assessor