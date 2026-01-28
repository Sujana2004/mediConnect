"""
Tests for Diagnosis Service
===========================
Unit tests for the diagnosis service and ML components.
"""

from django.test import TestCase
from apps.diagnosis.services.diagnosis_service import DiagnosisService
from apps.diagnosis.services.translation_service import TranslationService
from apps.diagnosis.ml.symptom_extractor import SymptomExtractor


class TranslationServiceTest(TestCase):
    """Test translation service."""
    
    def test_detect_english(self):
        """Test English detection."""
        text = "I have fever and headache"
        lang = TranslationService.detect_language(text)
        self.assertEqual(lang, 'en')
    
    def test_detect_telugu(self):
        """Test Telugu detection."""
        text = "నాకు జ్వరం ఉంది"
        lang = TranslationService.detect_language(text)
        self.assertEqual(lang, 'te')
    
    def test_detect_hindi(self):
        """Test Hindi detection."""
        text = "मुझे बुखार है"
        lang = TranslationService.detect_language(text)
        self.assertEqual(lang, 'hi')


class SymptomExtractorTest(TestCase):
    """Test symptom extraction."""
    
    def setUp(self):
        self.extractor = SymptomExtractor()
    
    def test_extract_simple(self):
        """Test simple symptom extraction."""
        text = "I have fever and headache"
        result = self.extractor.extract(text)
        
        # Should find fever and headache
        symptoms = result.get('symptoms', [])
        self.assertTrue(len(symptoms) >= 1)
    
    def test_extract_multiple(self):
        """Test extracting multiple symptoms."""
        text = "I have fever, headache, cough and body pain"
        result = self.extractor.extract(text)
        
        symptoms = result.get('symptoms', [])
        self.assertTrue(len(symptoms) >= 2)
    
    def test_empty_input(self):
        """Test with empty input."""
        result = self.extractor.extract("")
        self.assertEqual(result['symptoms'], [])


class DiagnosisServiceTest(TestCase):
    """Test diagnosis service."""
    
    def setUp(self):
        self.service = DiagnosisService()
    
    def test_diagnose_basic(self):
        """Test basic diagnosis flow."""
        result = self.service.diagnose(
            text="I have fever, headache and body pain",
            save_session=False
        )
        
        # Should return a result
        self.assertIsInstance(result, dict)
        self.assertIn('success', result)
    
    def test_diagnose_empty_text(self):
        """Test diagnosis with empty text."""
        result = self.service.diagnose(
            text="",
            save_session=False
        )
        
        self.assertFalse(result.get('success'))
    
    def test_diagnose_from_symptoms(self):
        """Test diagnosis from symptom list."""
        result = self.service.diagnose_from_symptoms(
            symptoms=['fever', 'headache', 'body_pain'],
            save_session=False
        )
        
        self.assertIn('success', result)