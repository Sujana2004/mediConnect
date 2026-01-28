"""
Tests for authentication endpoints.
"""

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User, PatientProfile, DoctorProfile
from unittest.mock import patch, MagicMock


class AuthenticationTestCase(TestCase):
    """
    Test cases for authentication.
    """
    
    def setUp(self):
        self.client = APIClient()
        
        # Create test patient
        self.patient = User.objects.create(
            phone='9876543210',
            role=User.Role.PATIENT,
            first_name='Test',
            last_name='Patient',
            is_phone_verified=True
        )
        self.patient.set_unusable_password()
        self.patient.save()
        
        # Create test doctor
        self.doctor = User.objects.create(
            phone='9876543211',
            role=User.Role.DOCTOR,
            first_name='Test',
            last_name='Doctor',
            is_phone_verified=True
        )
        self.doctor.set_unusable_password()
        self.doctor.save()
        
        DoctorProfile.objects.create(
            user=self.doctor,
            registration_number='DOC123456',
            registration_council='Test Medical Council',
            specialization='general',
            qualification='MBBS',
            verification_status='verified'
        )
        
        # Create test admin
        self.admin = User.objects.create(
            phone='9876543212',
            role=User.Role.ADMIN,
            first_name='Test',
            last_name='Admin',
            is_phone_verified=True,
            is_staff=True
        )
        self.admin.set_password('admin123')
        self.admin.save()
    
    def test_health_check(self):
        """Test health check endpoint."""
        response = self.client.get(reverse('users:health_check'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'healthy')
    
    @patch('apps.users.serializers.get_phone_from_token')
    def test_patient_registration(self, mock_get_phone):
        """Test patient registration with mocked Firebase."""
        mock_get_phone.return_value = '9876543220'
        
        data = {
            'firebase_token': 'mock_token',
            'first_name': 'New',
            'last_name': 'Patient',
            'preferred_language': 'te'
        }
        
        response = self.client.post(
            reverse('users:register_patient'),
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertIn('tokens', response.data['data'])
        
        # Verify user was created
        user = User.objects.get(phone='9876543220')
        self.assertEqual(user.role, User.Role.PATIENT)
        self.assertTrue(hasattr(user, 'patient_profile'))
    
    @patch('apps.users.serializers.get_phone_from_token')
    def test_duplicate_registration(self, mock_get_phone):
        """Test that duplicate registration fails."""
        mock_get_phone.return_value = '9876543210'  # Existing patient
        
        data = {
            'firebase_token': 'mock_token',
            'first_name': 'Duplicate',
        }
        
        response = self.client.post(
            reverse('users:register_patient'),
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
    
    @patch('apps.users.serializers.get_phone_from_token')
    def test_login(self, mock_get_phone):
        """Test login with mocked Firebase."""
        mock_get_phone.return_value = '9876543210'  # Existing patient
        
        data = {
            'firebase_token': 'mock_token'
        }
        
        response = self.client.post(
            reverse('users:login'),
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('tokens', response.data['data'])
    
    @patch('apps.users.serializers.get_phone_from_token')
    def test_login_nonexistent_user(self, mock_get_phone):
        """Test login with non-existent user."""
        mock_get_phone.return_value = '9999999999'  # Non-existent
        
        data = {
            'firebase_token': 'mock_token'
        }
        
        response = self.client.post(
            reverse('users:login'),
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_profile_authenticated(self):
        """Test profile access with authentication."""
        from rest_framework_simplejwt.tokens import RefreshToken
        
        refresh = RefreshToken.for_user(self.patient)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}'
        )
        
        response = self.client.get(reverse('users:profile'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(
            response.data['data']['user']['phone'],
            self.patient.phone
        )
    
    def test_profile_unauthenticated(self):
        """Test profile access without authentication."""
        response = self.client.get(reverse('users:profile'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_doctor_list(self):
        """Test public doctor list."""
        response = self.client.get(reverse('users:doctor_list'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should contain our verified doctor
        self.assertGreaterEqual(len(response.data['results']), 1)
    
    def test_admin_stats(self):
        """Test admin stats endpoint."""
        from rest_framework_simplejwt.tokens import RefreshToken
        
        refresh = RefreshToken.for_user(self.admin)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}'
        )
        
        response = self.client.get(reverse('users:admin_stats'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_users', response.data['data'])
    
    def test_admin_stats_unauthorized(self):
        """Test admin stats with non-admin user."""
        from rest_framework_simplejwt.tokens import RefreshToken
        
        refresh = RefreshToken.for_user(self.patient)  # Patient, not admin
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}'
        )
        
        response = self.client.get(reverse('users:admin_stats'))
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)