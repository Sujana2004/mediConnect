"""
Tests for Diagnosis API
=======================
Integration tests for API endpoints.
"""

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status


class DiagnoseAPITest(APITestCase):
    """Test diagnosis API endpoints."""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_diagnose_endpoint(self):
        """Test main diagnose endpoint."""
        url = reverse('diagnosis:diagnose')
        data = {
            'text': 'I have fever, headache and body pain'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertIn(response.status_code, [200, 422])
        self.assertIn('success', response.data)
    
    def test_diagnose_empty_text(self):
        """Test diagnose with empty text."""
        url = reverse('diagnosis:diagnose')
        data = {'text': ''}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_symptoms_list(self):
        """Test symptoms list endpoint."""
        url = reverse('diagnosis:symptom-list')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('symptoms', response.data)
    
    def test_diseases_list(self):
        """Test diseases list endpoint."""
        url = reverse('diagnosis:disease-list')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('diseases', response.data)
    
    def test_health_check(self):
        """Test health check endpoint."""
        url = reverse('diagnosis:health')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('status', response.data)


class SymptomAPITest(APITestCase):
    """Test symptom API endpoints."""
    
    def test_symptom_search(self):
        """Test symptom search."""
        url = reverse('diagnosis:symptom-search')
        
        response = self.client.get(url, {'q': 'fever'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_symptoms_by_category(self):
        """Test symptoms grouped by category."""
        url = reverse('diagnosis:symptoms-by-category')
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)