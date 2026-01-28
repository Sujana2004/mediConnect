# apps/diagnosis/ml_service.py
"""
Machine Learning service for symptom analysis and disease prediction.
"""

import re
import logging
from typing import List, Dict, Tuple, Optional
from django.conf import settings
from django.db.models import Q, Count
from .models import Symptom, Disease, SymptomDiseaseMapping

logger = logging.getLogger(__name__)


class SymptomExtractor:
    """
    Extracts symptoms from natural language text.
    Uses keyword matching and NLP techniques.
    """
    
    def __init__(self, language: str = 'en'):
        self.language = language
        self._load_symptom_keywords()
    
    def _load_symptom_keywords(self):
        """Load all symptom keywords from database."""
        self.symptom_map = {}  # keyword -> symptom_id
        self.symptoms_cache = {}  # symptom_id -> symptom object
        
        symptoms = Symptom.objects.filter(is_active=True)
        
        for symptom in symptoms:
            self.symptoms_cache[symptom.id] = symptom
            keywords = symptom.get_keywords(self.language)
            
            # Also add the symptom name as keyword
            keywords.append(symptom.get_name(self.language).lower())
            
            for keyword in keywords:
                if keyword:
                    self.symptom_map[keyword.lower()] = symptom.id
    
    def extract_symptoms(self, text: str) -> List[Symptom]:
        """
        Extract symptoms from text input.
        
        Args:
            text: User's symptom description
            
        Returns:
            List of matched Symptom objects
        """
        if not text:
            return []
        
        text = text.lower().strip()
        matched_symptom_ids = set()
        
        # Method 1: Direct keyword matching
        for keyword, symptom_id in self.symptom_map.items():
            if keyword in text:
                matched_symptom_ids.add(symptom_id)
        
        # Method 2: Fuzzy matching for common variations
        matched_symptom_ids.update(self._fuzzy_match(text))
        
        # Convert to Symptom objects
        symptoms = [
            self.symptoms_cache[sid] 
            for sid in matched_symptom_ids 
            if sid in self.symptoms_cache
        ]
        
        logger.info(f"Extracted {len(symptoms)} symptoms from text")
        return symptoms
    
    def _fuzzy_match(self, text: str) -> set:
        """
        Fuzzy matching for symptom variations.
        """
        matched_ids = set()
        
        # Common symptom patterns (English)
        patterns = {
            r'\b(head\s*ache|headache|head\s*pain)\b': 'headache',
            r'\b(stomach\s*ache|stomach\s*pain|tummy\s*ache)\b': 'stomach pain',
            r'\b(fever|temperature|hot|burning)\b': 'fever',
            r'\b(cough|coughing)\b': 'cough',
            r'\b(cold|runny\s*nose|sneezing)\b': 'cold',
            r'\b(vomit|vomiting|throwing\s*up)\b': 'vomiting',
            r'\b(diarrhea|loose\s*motion|loose\s*stool)\b': 'diarrhea',
            r'\b(tired|fatigue|weakness|weak)\b': 'fatigue',
            r'\b(dizzy|dizziness|giddy)\b': 'dizziness',
            r'\b(chest\s*pain|heart\s*pain)\b': 'chest pain',
            r'\b(breath|breathing\s*problem|breathless)\b': 'breathing difficulty',
            r'\b(joint\s*pain|body\s*pain|muscle\s*pain)\b': 'body pain',
            r'\b(sore\s*throat|throat\s*pain)\b': 'sore throat',
            r'\b(nausea|nauseous)\b': 'nausea',
            r'\b(rash|skin\s*rash|itching)\b': 'skin rash',
        }
        
        for pattern, symptom_name in patterns.items():
            if re.search(pattern, text, re.IGNORECASE):
                # Find symptom by name
                if symptom_name.lower() in self.symptom_map:
                    matched_ids.add(self.symptom_map[symptom_name.lower()])
        
        return matched_ids


class DiseasePredictionEngine:
    """
    Predicts diseases based on symptoms.
    Uses weighted symptom-disease mapping.
    """
    
    def __init__(self):
        self._load_mappings()
    
    def _load_mappings(self):
        """Load symptom-disease mappings."""
        self.mappings = {}  # disease_id -> {symptom_id: weight}
        self.disease_cache = {}
        
        for mapping in SymptomDiseaseMapping.objects.select_related('disease', 'symptom'):
            disease_id = mapping.disease_id
            
            if disease_id not in self.mappings:
                self.mappings[disease_id] = {}
                self.disease_cache[disease_id] = mapping.disease
            
            self.mappings[disease_id][mapping.symptom_id] = {
                'weight': mapping.weight,
                'is_primary': mapping.is_primary
            }
    
    def predict(
        self, 
        symptoms: List[Symptom], 
        patient_age: int = None,
        patient_gender: str = None,
        top_k: int = 5
    ) -> List[Dict]:
        """
        Predict diseases based on symptoms.
        
        Args:
            symptoms: List of identified symptoms
            patient_age: Patient's age (optional)
            patient_gender: Patient's gender (optional)
            top_k: Number of top predictions to return
            
        Returns:
            List of predictions with disease and confidence
        """
        if not symptoms:
            return []
        
        symptom_ids = {s.id for s in symptoms}
        predictions = []
        
        for disease_id, symptom_weights in self.mappings.items():
            # Calculate match score
            matched_weight = 0
            total_weight = 0
            matched_symptoms = []
            has_primary = False
            
            for symptom_id, info in symptom_weights.items():
                total_weight += info['weight']
                
                if symptom_id in symptom_ids:
                    matched_weight += info['weight']
                    matched_symptoms.append(symptom_id)
                    
                    if info['is_primary']:
                        has_primary = True
            
            if matched_weight == 0:
                continue
            
            # Calculate confidence score
            confidence = matched_weight / total_weight if total_weight > 0 else 0
            
            # Boost score if primary symptom matches
            if has_primary:
                confidence = min(confidence * 1.3, 1.0)
            
            # Add symptom coverage factor
            symptom_coverage = len(matched_symptoms) / len(symptom_weights)
            confidence = (confidence + symptom_coverage) / 2
            
            predictions.append({
                'disease': self.disease_cache[disease_id],
                'confidence': round(confidence, 3),
                'matched_symptom_ids': matched_symptoms,
                'total_symptoms': len(symptom_weights)
            })
        
        # Sort by confidence and return top k
        predictions.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Add rank
        for i, pred in enumerate(predictions[:top_k], 1):
            pred['rank'] = i
        
        return predictions[:top_k]
    
    def get_severity_assessment(
        self, 
        symptoms: List[Symptom],
        predictions: List[Dict]
    ) -> Dict:
        """
        Assess overall severity based on symptoms and predictions.
        
        Returns:
            Dict with severity level and recommendations
        """
        # Check for emergency symptoms
        emergency_symptoms = [s for s in symptoms if s.is_emergency]
        
        if emergency_symptoms:
            return {
                'level': 'critical',
                'message': 'Emergency symptoms detected. Please seek immediate medical attention.',
                'emergency_symptoms': [s.name for s in emergency_symptoms],
                'action': 'call_emergency'
            }
        
        # Check disease urgency
        if predictions:
            top_disease = predictions[0]['disease']
            
            if top_disease.urgency == Disease.Urgency.CRITICAL:
                return {
                    'level': 'high',
                    'message': 'These symptoms require urgent medical attention.',
                    'action': 'see_doctor_today'
                }
            elif top_disease.urgency == Disease.Urgency.HIGH:
                return {
                    'level': 'medium',
                    'message': 'Please consult a doctor soon.',
                    'action': 'book_appointment'
                }
        
        # Check symptom severity
        severe_symptoms = [s for s in symptoms if s.default_severity in ['severe', 'critical']]
        
        if severe_symptoms:
            return {
                'level': 'medium',
                'message': 'Some symptoms may need medical attention.',
                'action': 'book_appointment'
            }
        
        return {
            'level': 'low',
            'message': 'Symptoms appear mild. Monitor and rest.',
            'action': 'self_care'
        }


class DiagnosisEngine:
    """
    Main diagnosis engine that combines symptom extraction and disease prediction.
    """
    
    def __init__(self, language: str = 'en'):
        self.language = language
        self.symptom_extractor = SymptomExtractor(language)
        self.prediction_engine = DiseasePredictionEngine()
    
    def analyze(
        self,
        text: str,
        patient_age: int = None,
        patient_gender: str = None,
        additional_symptoms: List[int] = None
    ) -> Dict:
        """
        Analyze symptoms and provide diagnosis.
        
        Args:
            text: Patient's symptom description
            patient_age: Patient's age
            patient_gender: Patient's gender
            additional_symptoms: List of additional symptom IDs
            
        Returns:
            Complete diagnosis result
        """
        # Extract symptoms from text
        symptoms = self.symptom_extractor.extract_symptoms(text)
        
        # Add additional symptoms if provided
        if additional_symptoms:
            additional = Symptom.objects.filter(id__in=additional_symptoms)
            symptoms.extend(list(additional))
            symptoms = list(set(symptoms))  # Remove duplicates
        
        if not symptoms:
            return {
                'success': False,
                'message': 'Could not identify any symptoms. Please describe your symptoms in more detail.',
                'symptoms': [],
                'predictions': [],
                'severity': None,
                'followup_needed': True
            }
        
        # Get predictions
        predictions = self.prediction_engine.predict(
            symptoms,
            patient_age=patient_age,
            patient_gender=patient_gender
        )
        
        # Assess severity
        severity = self.prediction_engine.get_severity_assessment(symptoms, predictions)
        
        # Check if follow-up questions are needed
        followup_needed = len(symptoms) < 3 or (predictions and predictions[0]['confidence'] < 0.5)
        
        return {
            'success': True,
            'symptoms': symptoms,
            'predictions': predictions,
            'severity': severity,
            'followup_needed': followup_needed,
            'has_emergency': severity['level'] == 'critical'
        }
    
    def get_followup_questions(
        self, 
        identified_symptoms: List[Symptom],
        max_questions: int = 3
    ) -> List[Dict]:
        """
        Get follow-up questions based on identified symptoms.
        """
        from .models import FollowUpQuestion
        
        questions = []
        
        # Get symptom-specific follow-up questions
        for symptom in identified_symptoms[:3]:  # Limit to first 3 symptoms
            if symptom.followup_question:
                questions.append({
                    'type': 'symptom_specific',
                    'symptom_id': symptom.id,
                    'question': symptom.get_followup_question(self.language),
                    'question_type': 'text'
                })
        
        # Get general follow-up questions
        general_questions = FollowUpQuestion.objects.filter(
            is_active=True,
            related_symptoms__in=identified_symptoms
        ).distinct()[:max_questions - len(questions)]
        
        for q in general_questions:
            questions.append({
                'type': 'general',
                'question_id': q.id,
                'question': q.get_question(self.language),
                'question_type': q.question_type,
                'options': q.get_options(self.language) if q.question_type == 'multiple_choice' else None
            })
        
        # Add standard questions if needed
        if len(questions) < 2:
            standard_questions = [
                {
                    'type': 'standard',
                    'key': 'duration',
                    'question': self._get_standard_question('duration'),
                    'question_type': 'duration'
                },
                {
                    'type': 'standard',
                    'key': 'severity_scale',
                    'question': self._get_standard_question('severity_scale'),
                    'question_type': 'scale'
                }
            ]
            questions.extend(standard_questions[:max_questions - len(questions)])
        
        return questions[:max_questions]
    
    def _get_standard_question(self, key: str) -> str:
        """Get standard question in current language."""
        questions = {
            'duration': {
                'en': 'How long have you been experiencing these symptoms?',
                'te': 'మీరు ఈ లక్షణాలను ఎంత కాలంగా అనుభవిస్తున్నారు?',
                'hi': 'आप कितने समय से इन लक्षणों का अनुभव कर रहे हैं?'
            },
            'severity_scale': {
                'en': 'On a scale of 1-10, how severe is your discomfort?',
                'te': '1-10 స్కేల్‌లో, మీ అసౌకర్యం ఎంత తీవ్రంగా ఉంది?',
                'hi': '1-10 के पैमाने पर, आपकी परेशानी कितनी गंभीर है?'
            }
        }
        
        return questions.get(key, {}).get(self.language, questions[key]['en'])


# Singleton instance
_diagnosis_engine = None


def get_diagnosis_engine(language: str = 'en') -> DiagnosisEngine:
    """Get or create diagnosis engine instance."""
    global _diagnosis_engine
    
    if _diagnosis_engine is None or _diagnosis_engine.language != language:
        _diagnosis_engine = DiagnosisEngine(language)
    
    return _diagnosis_engine