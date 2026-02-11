"""
Analytics Services - Business logic for calculating statistics.
"""

from django.db.models import Count, Sum, Avg, Q, F
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
from decimal import Decimal

User = get_user_model()


class AnalyticsService:
    """Service class for calculating analytics data."""
    
    @staticmethod
    def get_date_range(period='week'):
        """Get date range based on period."""
        today = timezone.now().date()
        
        if period == 'today':
            start_date = today
        elif period == 'week':
            start_date = today - timedelta(days=7)
        elif period == 'month':
            start_date = today - timedelta(days=30)
        elif period == 'quarter':
            start_date = today - timedelta(days=90)
        elif period == 'year':
            start_date = today - timedelta(days=365)
        else:
            start_date = today - timedelta(days=7)
        
        return start_date, today
    
    @classmethod
    def get_user_stats(cls):
        """Get user statistics."""
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        total_users = User.objects.count()
        total_patients = User.objects.filter(role='patient').count()
        total_doctors = User.objects.filter(role='doctor').count()
        total_admins = User.objects.filter(role='admin').count()
        
        # New users
        new_users_today = User.objects.filter(created_at__date=today).count()
        new_users_week = User.objects.filter(created_at__date__gte=week_ago).count()
        new_users_month = User.objects.filter(created_at__date__gte=month_ago).count()
        
        # Verified users
        verified_patients = User.objects.filter(role='patient', is_phone_verified=True).count()
        verified_doctors = User.objects.filter(role='doctor', is_phone_verified=True).count()
        
        # Active users (active in last 7 days)
        active_users = User.objects.filter(last_active__date__gte=week_ago).count()
        
        return {
            'total_users': total_users,
            'total_patients': total_patients,
            'total_doctors': total_doctors,
            'total_admins': total_admins,
            'new_users_today': new_users_today,
            'new_users_week': new_users_week,
            'new_users_month': new_users_month,
            'verified_patients': verified_patients,
            'verified_doctors': verified_doctors,
            'active_users_week': active_users,
            'patient_verification_rate': round((verified_patients / total_patients * 100) if total_patients > 0 else 0, 1),
            'doctor_verification_rate': round((verified_doctors / total_doctors * 100) if total_doctors > 0 else 0, 1),
        }
    
    @classmethod
    def get_appointment_stats(cls):
        """Get appointment statistics."""
        try:
            from apps.appointments.models import Appointment
        except ImportError:
            return {'error': 'Appointments app not installed'}
        
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        total_appointments = Appointment.objects.count()
        
        # By status
        status_counts = Appointment.objects.values('status').annotate(
            count=Count('id')
        ).order_by('-count')
        
        status_dict = {item['status']: item['count'] for item in status_counts}
        
        # Today's appointments
        today_appointments = Appointment.objects.filter(appointment_date=today).count()
        today_completed = Appointment.objects.filter(
            appointment_date=today, 
            status='completed'
        ).count()
        
        # This week
        week_appointments = Appointment.objects.filter(
            appointment_date__gte=week_ago
        ).count()
        
        # Completion rate
        completed = status_dict.get('completed', 0)
        cancelled = status_dict.get('cancelled', 0)
        no_show = status_dict.get('no_show', 0)
        
        completion_rate = round(
            (completed / total_appointments * 100) if total_appointments > 0 else 0, 1
        )
        
        cancellation_rate = round(
            ((cancelled + no_show) / total_appointments * 100) if total_appointments > 0 else 0, 1
        )
        
        return {
            'total_appointments': total_appointments,
            'today_appointments': today_appointments,
            'today_completed': today_completed,
            'week_appointments': week_appointments,
            'pending': status_dict.get('pending', 0),
            'confirmed': status_dict.get('confirmed', 0),
            'completed': completed,
            'cancelled': cancelled,
            'no_show': no_show,
            'completion_rate': completion_rate,
            'cancellation_rate': cancellation_rate,
        }
    
    @classmethod
    def get_consultation_stats(cls):
        """Get consultation statistics."""
        try:
            from apps.consultation.models import Consultation
        except ImportError:
            return {'error': 'Consultation app not installed'}
        
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        
        total_consultations = Consultation.objects.count()
        
        # By status
        status_counts = Consultation.objects.values('status').annotate(
            count=Count('id')
        )
        status_dict = {item['status']: item['count'] for item in status_counts}
        
        # Today
        today_consultations = Consultation.objects.filter(
            created_at__date=today
        ).count()
        
        # Average duration
        completed = Consultation.objects.filter(status='completed')
        avg_duration = completed.aggregate(
            avg=Avg(F('actual_end') - F('actual_start'))
        )['avg']
        
        avg_duration_mins = 0
        if avg_duration:
            avg_duration_mins = round(avg_duration.total_seconds() / 60, 1)
        
        return {
            'total_consultations': total_consultations,
            'today_consultations': today_consultations,
            'completed': status_dict.get('completed', 0),
            'in_progress': status_dict.get('in_progress', 0),
            'scheduled': status_dict.get('scheduled', 0),
            'cancelled': status_dict.get('cancelled', 0),
            'avg_duration_mins': avg_duration_mins,
        }
    
    @classmethod
    def get_revenue_stats(cls):
        """Get revenue statistics from completed consultations using doctor's fee."""
        default_stats = {
            'total_revenue': 0,
            'today_revenue': 0,
            'week_revenue': 0,
            'month_revenue': 0,
            'avg_consultation_fee': 0,
        }
        
        try:
            from apps.consultation.models import Consultation
            from apps.users.models import DoctorProfile
        except ImportError:
            return default_stats
        
        try:
            today = timezone.now().date()
            week_ago = today - timedelta(days=7)
            month_ago = today - timedelta(days=30)
            
            # Revenue = completed consultations × doctor's consultation_fee
            # Join through: Consultation.doctor → User → DoctorProfile.consultation_fee
            completed = Consultation.objects.filter(
                status='completed'
            ).select_related('doctor__doctor_profile')
            
            # Total revenue
            total_revenue = completed.aggregate(
                total=Sum('doctor__doctor_profile__consultation_fee')
            )['total'] or Decimal('0')
            
            # Today's revenue
            today_revenue = completed.filter(
                actual_end__date=today
            ).aggregate(
                total=Sum('doctor__doctor_profile__consultation_fee')
            )['total'] or Decimal('0')
            
            # This week's revenue
            week_revenue = completed.filter(
                actual_end__date__gte=week_ago
            ).aggregate(
                total=Sum('doctor__doctor_profile__consultation_fee')
            )['total'] or Decimal('0')
            
            # This month's revenue
            month_revenue = completed.filter(
                actual_end__date__gte=month_ago
            ).aggregate(
                total=Sum('doctor__doctor_profile__consultation_fee')
            )['total'] or Decimal('0')
            
            # Average consultation fee
            avg_fee = completed.aggregate(
                avg=Avg('doctor__doctor_profile__consultation_fee')
            )['avg'] or Decimal('0')
            
            return {
                'total_revenue': float(total_revenue),
                'today_revenue': float(today_revenue),
                'week_revenue': float(week_revenue),
                'month_revenue': float(month_revenue),
                'avg_consultation_fee': float(round(avg_fee, 2)),
            }
        except Exception as e:
            print(f"Error in get_revenue_stats: {e}")
            return default_stats
    
    @classmethod
    def get_doctor_stats(cls):
        """Get doctor-specific statistics."""
        try:
            from apps.users.models import DoctorProfile
        except ImportError:
            return {'error': 'Users app not installed'}
        
        total_doctors = DoctorProfile.objects.count()
        
        # By verification status
        verified = DoctorProfile.objects.filter(verification_status='verified').count()
        pending = DoctorProfile.objects.filter(verification_status='pending').count()
        rejected = DoctorProfile.objects.filter(verification_status='rejected').count()
        
        # By specialization
        specializations = DoctorProfile.objects.values('specialization').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        # Online availability
        available_online = DoctorProfile.objects.filter(is_available_online=True).count()
        
        # Average rating
        avg_rating = DoctorProfile.objects.filter(
            average_rating__gt=0
        ).aggregate(avg=Avg('average_rating'))['avg'] or 0
        
        return {
            'total_doctors': total_doctors,
            'verified': verified,
            'pending': pending,
            'rejected': rejected,
            'available_online': available_online,
            'avg_rating': round(avg_rating, 2),
            'specializations': list(specializations),
            'verification_rate': round((verified / total_doctors * 100) if total_doctors > 0 else 0, 1),
        }
    
    @classmethod
    def get_emergency_stats(cls):
        """Get emergency/SOS statistics."""
        try:
            from apps.emergency.models import SOSAlert
        except ImportError:
            return {'error': 'Emergency app not installed'}
        
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        
        total_alerts = SOSAlert.objects.count()
        
        # By status
        status_counts = SOSAlert.objects.values('status').annotate(
            count=Count('id')
        )
        status_dict = {item['status']: item['count'] for item in status_counts}
        
        # Active alerts
        active_statuses = ['triggered', 'notifying', 'acknowledged', 'responding']
        active_alerts = SOSAlert.objects.filter(status__in=active_statuses).count()
        
        # Today
        today_alerts = SOSAlert.objects.filter(created_at__date=today).count()
        
        # By type
        type_counts = SOSAlert.objects.values('emergency_type').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        return {
            'total_alerts': total_alerts,
            'active_alerts': active_alerts,
            'today_alerts': today_alerts,
            'resolved': status_dict.get('resolved', 0),
            'false_alarms': status_dict.get('false_alarm', 0),
            'emergency_types': list(type_counts),
        }
    
    @classmethod
    def get_diagnosis_stats(cls):
        """Get AI diagnosis statistics."""
        try:
            from apps.diagnosis.models import DiagnosisSession
        except ImportError:
            return {'error': 'Diagnosis app not installed'}
        
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        
        total_sessions = DiagnosisSession.objects.count()
        
        # Today
        today_sessions = DiagnosisSession.objects.filter(
            created_at__date=today
        ).count()
        
        # By severity
        severity_counts = DiagnosisSession.objects.values('severity_level').annotate(
            count=Count('id')
        )
        severity_dict = {item['severity_level']: item['count'] for item in severity_counts}
        
        # Emergency cases
        emergency_cases = DiagnosisSession.objects.filter(
            requires_emergency_care=True
        ).count()
        
        # Average confidence
        avg_confidence = DiagnosisSession.objects.filter(
            top_prediction_confidence__gt=0
        ).aggregate(avg=Avg('top_prediction_confidence'))['avg'] or 0
        
        # Feedback
        feedback_counts = DiagnosisSession.objects.exclude(
            user_feedback='none'
        ).values('user_feedback').annotate(count=Count('id'))
        
        helpful = sum(f['count'] for f in feedback_counts if f['user_feedback'] == 'helpful')
        total_feedback = sum(f['count'] for f in feedback_counts)
        
        return {
            'total_sessions': total_sessions,
            'today_sessions': today_sessions,
            'emergency_cases': emergency_cases,
            'avg_confidence': round(avg_confidence * 100, 1),
            'low_severity': severity_dict.get('low', 0),
            'medium_severity': severity_dict.get('medium', 0),
            'high_severity': severity_dict.get('high', 0),
            'critical_severity': severity_dict.get('critical', 0),
            'helpful_rate': round((helpful / total_feedback * 100) if total_feedback > 0 else 0, 1),
        }
    
    @classmethod
    def get_chart_data(cls, period='week'):
        """Get data for charts."""
        start_date, end_date = cls.get_date_range(period)
        
        # User registrations over time
        user_data = User.objects.filter(
            created_at__date__gte=start_date
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')
        
        # Appointment data over time
        try:
            from apps.appointments.models import Appointment
            appointment_data = Appointment.objects.filter(
                created_at__date__gte=start_date
            ).annotate(
                date=TruncDate('created_at')
            ).values('date').annotate(
                count=Count('id')
            ).order_by('date')
        except ImportError:
            appointment_data = []
        
        return {
            'user_registrations': list(user_data),
            'appointments': list(appointment_data),
        }
    
    @classmethod
    def get_all_stats(cls):
        """Get all statistics for the dashboard."""
        return {
            'users': cls.get_user_stats(),
            'appointments': cls.get_appointment_stats(),
            'consultations': cls.get_consultation_stats(),
            'revenue': cls.get_revenue_stats(),
            'doctors': cls.get_doctor_stats(),
            'emergency': cls.get_emergency_stats(),
            'diagnosis': cls.get_diagnosis_stats(),
        }