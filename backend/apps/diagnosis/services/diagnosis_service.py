"""
Diagnosis Service
=================
Main service that orchestrates the complete diagnosis flow:
1. Accept user input (text/voice)
2. Detect language and translate if needed
3. Extract symptoms using NLP
4. Predict diseases using ML
5. Assess severity
6. Generate recommendations
7. Return response in user's language
"""

import time
import uuid
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from django.utils import timezone
from django.db import transaction

from apps.diagnosis.models import (
    Symptom, Disease, DiagnosisSession, DiseaseSymptomMapping
)
from apps.diagnosis.ml import get_model_loader
from apps.diagnosis.ml.symptom_extractor import get_symptom_extractor
from apps.diagnosis.ml.disease_predictor import get_disease_predictor
from apps.diagnosis.ml.severity_assessor import get_severity_assessor
from .translation_service import TranslationService

logger = logging.getLogger(__name__)


class DiagnosisService:
    """
    Main diagnosis service.
    
    Usage:
        service = DiagnosisService()
        result = service.diagnose(
            text="I have fever, headache and body pain",
            user=request.user,  # Optional
            language='en'  # Optional, auto-detect if not provided
        )
    """
    
    def __init__(self):
        self.model_loader = get_model_loader()
        self.translation_service = TranslationService
        
        # Ensure models are loaded
        self._ensure_models_loaded()
    
    def _ensure_models_loaded(self):
        """Ensure all ML models are loaded."""
        try:
            self.model_loader.load_all_models()
        except Exception as e:
            logger.error(f"Error loading models: {e}")
    
    def diagnose(
        self,
        text: str,
        user=None,
        language: Optional[str] = None,
        patient_age: Optional[int] = None,
        patient_gender: Optional[str] = None,
        symptom_duration_days: Optional[int] = None,
        input_type: str = 'text',
        device_type: str = '',
        app_version: str = '',
        save_session: bool = True
    ) -> Dict[str, Any]:
        """
        Perform complete diagnosis.
        
        Args:
            text: User input describing symptoms
            user: Django User object (optional)
            language: Input language ('en', 'te', 'hi') or None for auto-detect
            patient_age: Patient's age
            patient_gender: Patient's gender ('male', 'female', 'other')
            symptom_duration_days: How long symptoms have been present
            input_type: 'text' or 'voice'
            device_type: 'android', 'ios', 'web'
            app_version: App version string
            save_session: Whether to save session to database
            
        Returns:
            Complete diagnosis result dictionary
        """
        start_time = time.time()
        session_id = f"DIAG-{uuid.uuid4().hex[:12].upper()}"
        
        try:
            # Step 1: Validate input
            if not text or not text.strip():
                return self._error_response(
                    "Please describe your symptoms",
                    session_id
                )
            
            text = text.strip()
            
            # Step 2: Detect language and translate
            detected_lang = language or self.translation_service.detect_language(text)
            
            if detected_lang != 'en':
                translated_text, _ = self.translation_service.translate_to_english(
                    text, detected_lang
                )
            else:
                translated_text = text
            
            logger.info(f"Session {session_id}: Language={detected_lang}, Input='{text[:50]}...'")
            
            # Step 3: Extract symptoms
            extractor = self.model_loader.get_symptom_extractor()
            extraction_result = extractor.extract(translated_text)
            
            extracted_symptoms = extraction_result.get('symptoms', [])
            extraction_confidence = extraction_result.get('confidence', 0.0)
            
            if not extracted_symptoms:
                return self._no_symptoms_response(
                    text, detected_lang, session_id
                )
            
            logger.info(f"Session {session_id}: Extracted {len(extracted_symptoms)} symptoms")
            
            # Step 4: Predict diseases
            predictor = self.model_loader.get_disease_predictor()
            prediction_result = predictor.predict(
                extracted_symptoms,
                top_k=5,
                use_ensemble=True
            )
            
            predictions = prediction_result.get('predictions', [])
            top_prediction = prediction_result.get('top_prediction')
            
            if not predictions:
                return self._no_prediction_response(
                    extracted_symptoms, detected_lang, session_id
                )
            
            logger.info(f"Session {session_id}: Top prediction = {top_prediction}")
            
            # Step 5: Assess severity
            assessor = self.model_loader.get_severity_assessor()
            severity_result = assessor.assess(
                extracted_symptoms,
                patient_age=patient_age,
                patient_gender=patient_gender,
                predicted_disease=top_prediction['disease_code'] if top_prediction else None
            )
            
            # Step 6: Get disease details
            disease_info = self._get_disease_details(
                top_prediction['disease_code'] if top_prediction else None,
                detected_lang
            )
            
            # Step 7: Build response
            processing_time = int((time.time() - start_time) * 1000)
            
            response = self._build_response(
                session_id=session_id,
                input_text=text,
                input_language=detected_lang,
                translated_text=translated_text if detected_lang != 'en' else '',
                extracted_symptoms=extracted_symptoms,
                extraction_details=extraction_result.get('details', []),
                extraction_confidence=extraction_confidence,
                predictions=predictions,
                top_prediction=top_prediction,
                severity=severity_result,
                disease_info=disease_info,
                patient_age=patient_age,
                patient_gender=patient_gender,
                processing_time=processing_time
            )
            
            # Step 8: Translate response to user's language
            if detected_lang != 'en':
                response = self._translate_response(response, detected_lang)
            
            # Step 9: Save session to database
            if save_session:
                self._save_session(
                    session_id=session_id,
                    user=user,
                    input_type=input_type,
                    raw_input=text,
                    input_language=detected_lang,
                    translated_input=translated_text if detected_lang != 'en' else '',
                    extracted_symptoms=extracted_symptoms,
                    extraction_confidence=extraction_confidence,
                    predictions=predictions,
                    top_prediction=top_prediction,
                    severity_result=severity_result,
                    patient_age=patient_age,
                    patient_gender=patient_gender,
                    symptom_duration_days=symptom_duration_days,
                    processing_time=processing_time,
                    device_type=device_type,
                    app_version=app_version,
                    response=response
                )
            
            logger.info(f"Session {session_id}: Completed in {processing_time}ms")
            
            return response
            
        except Exception as e:
            logger.error(f"Error in diagnosis: {e}", exc_info=True)
            return self._error_response(
                f"An error occurred during diagnosis. Please try again.",
                session_id
            )
    
    def diagnose_from_symptoms(
        self,
        symptoms: List[str],
        user=None,
        language: str = 'en',
        patient_age: Optional[int] = None,
        patient_gender: Optional[str] = None,
        save_session: bool = True
    ) -> Dict[str, Any]:
        """
        Diagnose from a list of symptom codes (instead of free text).
        
        Useful when user selects symptoms from a list in the UI.
        """
        start_time = time.time()
        session_id = f"DIAG-{uuid.uuid4().hex[:12].upper()}"
        
        try:
            if not symptoms:
                return self._error_response(
                    "Please select at least one symptom",
                    session_id
                )
            
            # Normalize symptom codes
            symptoms = [s.lower().replace(' ', '_') for s in symptoms]
            
            # Predict diseases
            predictor = self.model_loader.get_disease_predictor()
            prediction_result = predictor.predict(
                symptoms,
                top_k=5,
                use_ensemble=True
            )
            
            predictions = prediction_result.get('predictions', [])
            top_prediction = prediction_result.get('top_prediction')
            
            # Assess severity
            assessor = self.model_loader.get_severity_assessor()
            severity_result = assessor.assess(
                symptoms,
                patient_age=patient_age,
                patient_gender=patient_gender,
                predicted_disease=top_prediction['disease_code'] if top_prediction else None
            )
            
            # Get disease details
            disease_info = self._get_disease_details(
                top_prediction['disease_code'] if top_prediction else None,
                language
            )
            
            processing_time = int((time.time() - start_time) * 1000)
            
            response = self._build_response(
                session_id=session_id,
                input_text=', '.join(symptoms),
                input_language=language,
                translated_text='',
                extracted_symptoms=symptoms,
                extraction_details=[],
                extraction_confidence=1.0,  # Direct selection, 100% confidence
                predictions=predictions,
                top_prediction=top_prediction,
                severity=severity_result,
                disease_info=disease_info,
                patient_age=patient_age,
                patient_gender=patient_gender,
                processing_time=processing_time
            )
            
            if language != 'en':
                response = self._translate_response(response, language)
            
            if save_session:
                self._save_session(
                    session_id=session_id,
                    user=user,
                    input_type='selection',
                    raw_input=', '.join(symptoms),
                    input_language=language,
                    translated_input='',
                    extracted_symptoms=symptoms,
                    extraction_confidence=1.0,
                    predictions=predictions,
                    top_prediction=top_prediction,
                    severity_result=severity_result,
                    patient_age=patient_age,
                    patient_gender=patient_gender,
                    symptom_duration_days=None,
                    processing_time=processing_time,
                    device_type='',
                    app_version='',
                    response=response
                )
            
            return response
            
        except Exception as e:
            logger.error(f"Error in symptom diagnosis: {e}", exc_info=True)
            return self._error_response(
                "An error occurred during diagnosis. Please try again.",
                session_id
            )
    
    def _build_response(
        self,
        session_id: str,
        input_text: str,
        input_language: str,
        translated_text: str,
        extracted_symptoms: List[str],
        extraction_details: List[Dict],
        extraction_confidence: float,
        predictions: List[Dict],
        top_prediction: Optional[Dict],
        severity: Dict,
        disease_info: Dict,
        patient_age: Optional[int],
        patient_gender: Optional[str],
        processing_time: int
    ) -> Dict[str, Any]:
        """Build the complete response dictionary."""
        
        # Get symptom display names
        symptom_details = []
        for symptom_code in extracted_symptoms:
            symptom_details.append({
                'code': symptom_code,
                'name': self._get_symptom_name(symptom_code, 'en'),
                'name_local': self._get_symptom_name(symptom_code, input_language)
            })
        
        # Build response
        response = {
            'success': True,
            'session_id': session_id,
            
            # Input info
            'input': {
                'text': input_text,
                'language': input_language,
                'translated_text': translated_text,
            },
            
            # Extracted symptoms
            'symptoms': {
                'count': len(extracted_symptoms),
                'codes': extracted_symptoms,
                'details': symptom_details,
                'extraction_confidence': round(extraction_confidence, 4),
            },
            
            # Disease predictions
            'predictions': {
                'top': top_prediction,
                'all': predictions,
                'model_used': 'ensemble',
            },
            
            # Primary diagnosis
            'diagnosis': {
                'disease_code': top_prediction['disease_code'] if top_prediction else None,
                'disease_name': top_prediction['disease_name'] if top_prediction else None,
                'confidence': top_prediction['confidence'] if top_prediction else 0,
                'description': disease_info.get('description', ''),
                'specialist': disease_info.get('specialist', 'general'),
                'specialist_name': disease_info.get('specialist_name', 'General Physician'),
            },
            
            # Severity assessment
            'severity': {
                'level': severity.get('level', 'low'),
                'score': severity.get('score', 0),
                'requires_emergency': severity.get('requires_emergency', False),
                'factors': severity.get('factors', []),
            },
            
            # Recommendations
            'recommendations': {
                'actions': severity.get('recommendations', []),
                'precautions': disease_info.get('precautions', []),
                'when_to_see_doctor': self._get_doctor_advice(severity.get('level', 'low')),
            },
            
            # Metadata
            'meta': {
                'processing_time_ms': processing_time,
                'timestamp': timezone.now().isoformat(),
                'patient_age': patient_age,
                'patient_gender': patient_gender,
            }
        }
        
        # Add message summary
        response['message'] = self._generate_summary_message(response)
        
        return response
    
    def _generate_summary_message(self, response: Dict) -> str:
        """Generate a human-readable summary message."""
        diagnosis = response.get('diagnosis', {})
        severity = response.get('severity', {})
        symptoms = response.get('symptoms', {})
        
        disease_name = diagnosis.get('disease_name', 'Unknown')
        confidence = diagnosis.get('confidence', 0) * 100
        severity_level = severity.get('level', 'low')
        symptom_count = symptoms.get('count', 0)
        
        if severity_level == 'critical':
            urgency = "⚠️ URGENT: "
        elif severity_level == 'high':
            urgency = "🔴 Important: "
        elif severity_level == 'medium':
            urgency = "🟡 "
        else:
            urgency = "🟢 "
        
        message = (
            f"{urgency}Based on your {symptom_count} symptom(s), "
            f"you may have {disease_name} ({confidence:.0f}% confidence). "
            f"Severity: {severity_level.upper()}. "
        )
        
        if severity.get('requires_emergency', False):
            message += "Please seek immediate medical attention."
        elif severity_level in ['high', 'critical']:
            message += "Please consult a doctor as soon as possible."
        else:
            message += "Monitor your symptoms and consult a doctor if they persist."
        
        return message
    
    def _get_disease_details(self, disease_code: Optional[str], language: str) -> Dict:
        """Get detailed information about a disease."""
        if not disease_code:
            return {}
        
        try:
            disease = Disease.objects.filter(code=disease_code).first()
            if disease:
                return {
                    'code': disease.code,
                    'name': disease.get_name(language),
                    'description': disease.description if language == 'en' else (
                        disease.description_telugu if language == 'te' else (
                            disease.description_hindi if language == 'hi' else disease.description
                        )
                    ),
                    'specialist': disease.recommended_specialist,
                    'specialist_name': disease.get_recommended_specialist_display(),
                    'typical_severity': disease.typical_severity,
                    'requires_emergency': disease.requires_immediate_care,
                    'precautions': disease.get_precautions(language),
                }
        except Exception as e:
            logger.error(f"Error getting disease details: {e}")
        
        return {
            'code': disease_code,
            'name': disease_code.replace('_', ' ').title(),
            'description': '',
            'specialist': 'general',
            'specialist_name': 'General Physician',
            'precautions': [],
        }
    
    def _get_symptom_name(self, symptom_code: str, language: str) -> str:
        """Get symptom name in specified language."""
        try:
            symptom = Symptom.objects.filter(code=symptom_code).first()
            if symptom:
                return symptom.get_name(language)
        except:
            pass
        return symptom_code.replace('_', ' ').title()
    
    def _get_doctor_advice(self, severity_level: str) -> str:
        """Get advice on when to see a doctor."""
        advice = {
            'critical': 'Seek immediate medical attention. Call emergency services if needed.',
            'high': 'See a doctor within 24 hours. Do not delay seeking medical advice.',
            'medium': 'Schedule a doctor appointment within 2-3 days if symptoms persist.',
            'low': 'If symptoms persist for more than a week, consult a doctor.',
        }
        return advice.get(severity_level, advice['low'])
    
    def _translate_response(self, response: Dict, language: str) -> Dict:
        """Translate response to target language."""
        # Translate key messages
        if 'message' in response:
            response['message_local'] = self.translation_service.translate_from_english(
                response['message'], language
            )
        
        # Translate severity level
        if 'severity' in response:
            response['severity']['level_local'] = self.translation_service.translate_severity(
                response['severity']['level'], language
            )
        
        # Translate specialist name
        if 'diagnosis' in response:
            response['diagnosis']['specialist_name_local'] = self.translation_service.translate_specialist(
                response['diagnosis'].get('specialist_name', ''), language
            )
        
        return response
    
    def _no_symptoms_response(self, text: str, language: str, session_id: str) -> Dict:
        """Response when no symptoms could be extracted."""
        message = (
            "I couldn't identify specific symptoms from your description. "
            "Please try describing your symptoms more clearly, for example: "
            "'I have fever, headache, and body pain' or 'నాకు జ్వరం, తలనొప్పి ఉంది'"
        )
        
        return {
            'success': False,
            'session_id': session_id,
            'error_code': 'NO_SYMPTOMS_FOUND',
            'message': message,
            'suggestions': [
                'Describe specific symptoms like fever, cough, pain, etc.',
                'You can also select symptoms from the list below',
                'Try speaking in Telugu or Hindi if more comfortable'
            ],
            'common_symptoms': self._get_common_symptoms(language),
        }
    
    def _no_prediction_response(
        self, symptoms: List[str], language: str, session_id: str
    ) -> Dict:
        """Response when no disease could be predicted."""
        return {
            'success': False,
            'session_id': session_id,
            'error_code': 'NO_PREDICTION',
            'message': 'Unable to predict a specific condition based on these symptoms.',
            'symptoms_found': symptoms,
            'recommendations': [
                'Please consult a doctor for proper diagnosis',
                'Describe any additional symptoms you may have',
            ],
        }
    
    def _error_response(self, message: str, session_id: str) -> Dict:
        """Generic error response."""
        return {
            'success': False,
            'session_id': session_id,
            'error_code': 'ERROR',
            'message': message,
        }
    
    def _get_common_symptoms(self, language: str = 'en') -> List[Dict]:
        """Get list of common symptoms for suggestions."""
        common_codes = [
            'fever', 'headache', 'cough', 'cold', 'stomach_pain',
            'body_pain', 'vomiting', 'diarrhea', 'fatigue', 'dizziness'
        ]
        
        symptoms = []
        for code in common_codes:
            symptoms.append({
                'code': code,
                'name': self._get_symptom_name(code, language)
            })
        
        return symptoms
    
    @transaction.atomic
    def _save_session(
        self,
        session_id: str,
        user,
        input_type: str,
        raw_input: str,
        input_language: str,
        translated_input: str,
        extracted_symptoms: List[str],
        extraction_confidence: float,
        predictions: List[Dict],
        top_prediction: Optional[Dict],
        severity_result: Dict,
        patient_age: Optional[int],
        patient_gender: Optional[str],
        symptom_duration_days: Optional[int],
        processing_time: int,
        device_type: str,
        app_version: str,
        response: Dict
    ):
        """Save diagnosis session to database."""
        try:
            # Get top disease object
            top_disease = None
            if top_prediction:
                top_disease = Disease.objects.filter(
                    code=top_prediction['disease_code']
                ).first()
            
            session = DiagnosisSession.objects.create(
                session_id=session_id,
                user=user,
                input_type=input_type,
                raw_input=raw_input,
                input_language=input_language,
                translated_input=translated_input,
                extracted_symptoms=extracted_symptoms,
                extraction_confidence=extraction_confidence,
                predictions=predictions,
                top_prediction=top_disease,
                top_prediction_confidence=top_prediction['confidence'] if top_prediction else 0,
                severity_level=severity_result.get('level', 'low'),
                severity_score=severity_result.get('score', 0),
                requires_emergency_care=severity_result.get('requires_emergency', False),
                recommended_specialist=response.get('diagnosis', {}).get('specialist', ''),
                recommendations=severity_result.get('recommendations', []),
                response_text=response.get('message', ''),
                response_language=input_language,
                patient_age=patient_age,
                patient_gender=patient_gender or '',
                symptom_duration_days=symptom_duration_days,
                processing_time_ms=processing_time,
                device_type=device_type,
                app_version=app_version,
                completed_at=timezone.now()
            )
            
            logger.info(f"Saved session {session_id} to database")
            return session
            
        except Exception as e:
            logger.error(f"Error saving session: {e}")
            return None
    
    def get_session(self, session_id: str) -> Optional[DiagnosisSession]:
        """Retrieve a diagnosis session by ID."""
        try:
            return DiagnosisSession.objects.get(session_id=session_id)
        except DiagnosisSession.DoesNotExist:
            return None
    
    def update_feedback(
        self, 
        session_id: str, 
        feedback: str, 
        comment: str = ''
    ) -> bool:
        """Update feedback for a diagnosis session."""
        try:
            session = self.get_session(session_id)
            if session:
                session.user_feedback = feedback
                session.feedback_comment = comment
                session.save(update_fields=['user_feedback', 'feedback_comment'])
                return True
        except Exception as e:
            logger.error(f"Error updating feedback: {e}")
        return False
    
    def get_all_symptoms(self, language: str = 'en') -> List[Dict]:
        """Get all available symptoms for UI selection."""
        symptoms = Symptom.objects.filter(is_active=True).order_by('category', 'name_english')
        
        result = []
        for symptom in symptoms:
            result.append({
                'code': symptom.code,
                'name': symptom.get_name(language),
                'category': symptom.category,
                'severity_weight': symptom.severity_weight,
            })
        
        return result
    
    def get_symptoms_by_category(self, language: str = 'en') -> Dict[str, List[Dict]]:
        """Get symptoms grouped by category."""
        symptoms = Symptom.objects.filter(is_active=True).order_by('name_english')
        
        categories = {}
        for symptom in symptoms:
            cat = symptom.category
            if cat not in categories:
                categories[cat] = []
            
            categories[cat].append({
                'code': symptom.code,
                'name': symptom.get_name(language),
                'severity_weight': symptom.severity_weight,
            })
        
        return categories