# apps/users/utils.py
"""
Utility functions for users app.
"""

import random
import string
from datetime import timedelta
from django.utils import timezone
from rest_framework.views import exception_handler
from rest_framework.response import Response


def generate_otp(length=6):
    """Generate a random numeric OTP."""
    return ''.join(random.choices(string.digits, k=length))


def get_otp_expiry(minutes=10):
    """Get OTP expiry time."""
    return timezone.now() + timedelta(minutes=minutes)


def custom_exception_handler(exc, context):
    """
    Custom exception handler for DRF.
    Provides consistent error response format.
    """
    response = exception_handler(exc, context)
    
    if response is not None:
        custom_response_data = {
            'success': False,
            'message': 'An error occurred',
            'errors': response.data,
            'status_code': response.status_code
        }
        response.data = custom_response_data
    
    return response


def get_client_ip(request):
    """Get client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def log_user_activity(user, activity_type, description='', request=None):
    """Log user activity."""
    from apps.users.models import UserActivity
    
    activity_data = {
        'user': user,
        'activity_type': activity_type,
        'description': description,
    }
    
    if request:
        activity_data['ip_address'] = get_client_ip(request)
        activity_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')
    
    UserActivity.objects.create(**activity_data)