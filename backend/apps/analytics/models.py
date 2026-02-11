"""
Analytics Models - Proxy models for dashboard statistics.
No new database tables - just provides admin interface for analytics.
"""

from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class DashboardStats(models.Model):
    """
    Proxy model for main dashboard statistics.
    This doesn't create a database table - it's just for admin integration.
    """
    
    class Meta:
        managed = False  # No database table
        verbose_name = 'Dashboard'
        verbose_name_plural = 'Dashboard'
        
        # These permissions can be used to control access
        default_permissions = ()
        permissions = [
            ('view_dashboard', 'Can view analytics dashboard'),
        ]


class AppointmentAnalytics(models.Model):
    """Proxy model for appointment analytics."""
    
    class Meta:
        managed = False
        verbose_name = 'Appointment Analytics'
        verbose_name_plural = 'Appointment Analytics'
        default_permissions = ()


class ConsultationAnalytics(models.Model):
    """Proxy model for consultation analytics."""
    
    class Meta:
        managed = False
        verbose_name = 'Consultation Analytics'
        verbose_name_plural = 'Consultation Analytics'
        default_permissions = ()


class RevenueAnalytics(models.Model):
    """Proxy model for revenue analytics."""
    
    class Meta:
        managed = False
        verbose_name = 'Revenue Analytics'
        verbose_name_plural = 'Revenue Analytics'
        default_permissions = ()