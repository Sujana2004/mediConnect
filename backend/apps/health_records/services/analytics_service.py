"""
Health Analytics Service
========================
Provides health insights and analytics.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import date, timedelta
from collections import defaultdict
from django.db.models import Count, Avg, Max, Min
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone

from ..models import (
    HealthProfile,
    MedicalCondition,
    MedicalDocument,
    LabReport,
    VaccinationRecord,
    Allergy,
    Hospitalization,
    VitalSign,
)

logger = logging.getLogger(__name__)


class HealthAnalyticsService:
    """Service for health analytics and insights."""

    @staticmethod
    def get_health_timeline(user, months: int = 12) -> List[Dict]:
        """
        Get chronological timeline of health events.
        
        Args:
            user: User instance
            months: Number of months to look back
            
        Returns:
            List of timeline events sorted by date
        """
        since_date = timezone.now().date() - timedelta(days=months * 30)
        timeline = []
        
        # Medical conditions
        conditions = MedicalCondition.objects.filter(
            user=user,
            diagnosed_date__gte=since_date
        )
        for c in conditions:
            timeline.append({
                'id': str(c.id),
                'event_type': 'condition',
                'title': c.condition_name,
                'description': c.treatment_notes or '',
                'date': c.diagnosed_date,
                'severity': c.severity,
                'status': c.status,
            })
        
        # Lab reports
        reports = LabReport.objects.filter(
            user=user,
            test_date__gte=since_date
        )
        for r in reports:
            timeline.append({
                'id': str(r.id),
                'event_type': 'lab_report',
                'title': r.report_name,
                'description': r.interpretation or '',
                'date': r.test_date,
                'severity': 'high' if r.overall_status == 'critical' else None,
                'status': r.overall_status,
            })
        
        # Vaccinations
        vaccinations = VaccinationRecord.objects.filter(
            user=user,
            vaccination_date__gte=since_date
        )
        for v in vaccinations:
            timeline.append({
                'id': str(v.id),
                'event_type': 'vaccination',
                'title': f"{v.vaccine_name} (Dose {v.dose_number})",
                'description': v.side_effects or '',
                'date': v.vaccination_date,
                'severity': None,
                'status': 'complete' if v.is_complete else 'in_progress',
            })
        
        # Hospitalizations
        hospitalizations = Hospitalization.objects.filter(
            user=user,
            admission_date__gte=since_date
        )
        for h in hospitalizations:
            timeline.append({
                'id': str(h.id),
                'event_type': 'hospitalization',
                'title': f"Hospitalization at {h.hospital_name}",
                'description': h.reason,
                'date': h.admission_date,
                'severity': 'high' if h.admission_type == 'emergency' else 'moderate',
                'status': 'discharged' if h.discharge_date else 'admitted',
            })
        
        # Documents
        documents = MedicalDocument.objects.filter(
            user=user,
            document_date__gte=since_date
        )
        for d in documents:
            if d.document_date:
                timeline.append({
                    'id': str(d.id),
                    'event_type': 'document',
                    'title': d.title,
                    'description': d.description or '',
                    'date': d.document_date,
                    'severity': None,
                    'status': d.document_type,
                })
        
        # Sort by date descending
        timeline.sort(key=lambda x: x['date'], reverse=True)
        
        return timeline

    @staticmethod
    def get_health_score(user) -> Dict[str, Any]:
        """
        Calculate a simple health score based on available data.
        
        Args:
            user: User instance
            
        Returns:
            Dictionary with health score and breakdown
        """
        score = 100
        breakdown = []
        
        # Check health profile completeness
        try:
            profile = HealthProfile.objects.get(user=user)
            
            if not profile.blood_group or profile.blood_group == 'unknown':
                score -= 5
                breakdown.append({'factor': 'blood_group', 'impact': -5, 'message': 'Blood group not recorded'})
            
            bmi = profile.get_bmi()
            if bmi:
                category = profile.get_bmi_category()
                if category == 'Obese':
                    score -= 15
                    breakdown.append({'factor': 'bmi', 'impact': -15, 'message': f'BMI indicates obesity ({bmi})'})
                elif category == 'Overweight':
                    score -= 10
                    breakdown.append({'factor': 'bmi', 'impact': -10, 'message': f'BMI indicates overweight ({bmi})'})
                elif category == 'Underweight':
                    score -= 10
                    breakdown.append({'factor': 'bmi', 'impact': -10, 'message': f'BMI indicates underweight ({bmi})'})
            
            if profile.smoking_status == 'current':
                score -= 15
                breakdown.append({'factor': 'smoking', 'impact': -15, 'message': 'Current smoker'})
            
            if profile.alcohol_consumption == 'regular':
                score -= 10
                breakdown.append({'factor': 'alcohol', 'impact': -10, 'message': 'Regular alcohol consumption'})
            
        except HealthProfile.DoesNotExist:
            score -= 10
            breakdown.append({'factor': 'profile', 'impact': -10, 'message': 'Health profile not created'})
        
        # Check chronic conditions
        chronic_count = MedicalCondition.objects.filter(
            user=user,
            is_chronic=True,
            status__in=['active', 'managed']
        ).count()
        
        if chronic_count > 0:
            impact = min(chronic_count * 5, 20)
            score -= impact
            breakdown.append({
                'factor': 'chronic_conditions',
                'impact': -impact,
                'message': f'{chronic_count} chronic condition(s)'
            })
        
        # Check recent vitals
        recent_vitals = VitalSign.objects.filter(
            user=user,
            recorded_at__gte=timezone.now() - timedelta(days=30)
        ).order_by('-recorded_at').first()
        
        if recent_vitals:
            bp_status = recent_vitals.get_bp_status()
            if bp_status == 'high':
                score -= 10
                breakdown.append({'factor': 'blood_pressure', 'impact': -10, 'message': 'High blood pressure'})
            elif bp_status == 'low':
                score -= 5
                breakdown.append({'factor': 'blood_pressure', 'impact': -5, 'message': 'Low blood pressure'})
        else:
            score -= 5
            breakdown.append({'factor': 'vitals', 'impact': -5, 'message': 'No recent vital signs recorded'})
        
        # Check vaccinations
        due_vaccinations = VaccinationRecord.objects.filter(
            user=user,
            next_due_date__lte=timezone.now().date()
        ).count()
        
        if due_vaccinations > 0:
            score -= min(due_vaccinations * 3, 10)
            breakdown.append({
                'factor': 'vaccinations',
                'impact': -min(due_vaccinations * 3, 10),
                'message': f'{due_vaccinations} vaccination(s) overdue'
            })
        
        # Check allergies
        critical_allergies = Allergy.objects.filter(
            user=user,
            status='active',
            severity__in=['severe', 'life_threatening']
        ).count()
        
        if critical_allergies > 0:
            breakdown.append({
                'factor': 'allergies',
                'impact': 0,
                'message': f'{critical_allergies} critical allergy(ies) - handle with care'
            })
        
        # Ensure score is between 0 and 100
        score = max(0, min(100, score))
        
        # Determine category
        if score >= 80:
            category = 'excellent'
        elif score >= 60:
            category = 'good'
        elif score >= 40:
            category = 'fair'
        else:
            category = 'needs_attention'
        
        return {
            'score': score,
            'category': category,
            'breakdown': breakdown,
        }

    @staticmethod
    def get_vital_statistics(user, days: int = 90) -> Dict[str, Any]:
        """
        Get statistical analysis of vital signs.
        
        Args:
            user: User instance
            days: Number of days to analyze
            
        Returns:
            Dictionary with vital statistics
        """
        since = timezone.now() - timedelta(days=days)
        vitals = VitalSign.objects.filter(
            user=user,
            recorded_at__gte=since
        )
        
        stats = {
            'total_readings': vitals.count(),
            'period_days': days,
        }
        
        # Blood pressure stats
        bp_vitals = vitals.exclude(systolic_bp__isnull=True)
        if bp_vitals.exists():
            stats['blood_pressure'] = {
                'readings': bp_vitals.count(),
                'avg_systolic': round(bp_vitals.aggregate(avg=Avg('systolic_bp'))['avg'] or 0),
                'avg_diastolic': round(bp_vitals.aggregate(avg=Avg('diastolic_bp'))['avg'] or 0),
                'max_systolic': bp_vitals.aggregate(max=Max('systolic_bp'))['max'],
                'min_systolic': bp_vitals.aggregate(min=Min('systolic_bp'))['min'],
            }
        
        # Heart rate stats
        hr_vitals = vitals.exclude(heart_rate__isnull=True)
        if hr_vitals.exists():
            stats['heart_rate'] = {
                'readings': hr_vitals.count(),
                'average': round(hr_vitals.aggregate(avg=Avg('heart_rate'))['avg'] or 0),
                'max': hr_vitals.aggregate(max=Max('heart_rate'))['max'],
                'min': hr_vitals.aggregate(min=Min('heart_rate'))['min'],
            }
        
        # Blood sugar stats
        sugar_vitals = vitals.exclude(blood_sugar__isnull=True)
        if sugar_vitals.exists():
            stats['blood_sugar'] = {
                'readings': sugar_vitals.count(),
                'average': round(sugar_vitals.aggregate(avg=Avg('blood_sugar'))['avg'] or 0),
                'max': sugar_vitals.aggregate(max=Max('blood_sugar'))['max'],
                'min': sugar_vitals.aggregate(min=Min('blood_sugar'))['min'],
            }
        
        # Weight trend
        weight_vitals = vitals.exclude(weight_kg__isnull=True).order_by('recorded_at')
        if weight_vitals.count() >= 2:
            first_weight = float(weight_vitals.first().weight_kg)
            last_weight = float(weight_vitals.last().weight_kg)
            stats['weight'] = {
                'readings': weight_vitals.count(),
                'first': first_weight,
                'last': last_weight,
                'change': round(last_weight - first_weight, 2),
                'trend': 'increasing' if last_weight > first_weight else 'decreasing' if last_weight < first_weight else 'stable',
            }
        
        return stats

    @staticmethod
    def get_condition_summary(user) -> Dict[str, Any]:
        """
        Get summary of medical conditions.
        
        Args:
            user: User instance
            
        Returns:
            Dictionary with condition summary
        """
        conditions = MedicalCondition.objects.filter(user=user)
        
        return {
            'total': conditions.count(),
            'active': conditions.filter(status='active').count(),
            'managed': conditions.filter(status='managed').count(),
            'resolved': conditions.filter(status='resolved').count(),
            'chronic': conditions.filter(is_chronic=True).count(),
            'by_severity': {
                'mild': conditions.filter(severity='mild').count(),
                'moderate': conditions.filter(severity='moderate').count(),
                'severe': conditions.filter(severity='severe').count(),
            },
        }

    @staticmethod
    def get_document_summary(user) -> Dict[str, Any]:
        """
        Get summary of medical documents.
        
        Args:
            user: User instance
            
        Returns:
            Dictionary with document summary
        """
        documents = MedicalDocument.objects.filter(user=user)
        
        by_type = documents.values('document_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        return {
            'total': documents.count(),
            'by_type': {item['document_type']: item['count'] for item in by_type},
            'shared': documents.filter(is_shared_with_doctors=True).count(),
        }

    @staticmethod
    def get_quick_dashboard_data(user) -> Dict[str, Any]:
        """
        Get quick data for dashboard display.
        
        Args:
            user: User instance
            
        Returns:
            Dictionary with dashboard data
        """
        # Health profile
        try:
            profile = HealthProfile.objects.get(user=user)
            has_profile = True
            blood_group = profile.blood_group
            bmi = profile.get_bmi()
            bmi_category = profile.get_bmi_category()
        except HealthProfile.DoesNotExist:
            has_profile = False
            blood_group = None
            bmi = None
            bmi_category = None
        
        # Counts
        active_conditions = MedicalCondition.objects.filter(
            user=user,
            status__in=['active', 'managed', 'recurring']
        ).count()
        
        active_allergies = Allergy.objects.filter(
            user=user,
            status='active'
        ).count()
        
        documents = MedicalDocument.objects.filter(user=user).count()
        
        pending_vaccinations = VaccinationRecord.objects.filter(
            user=user,
            next_due_date__lte=timezone.now().date()
        ).count()
        
        # Latest vitals
        latest_vitals = VitalSign.objects.filter(user=user).order_by('-recorded_at').first()
        
        # Critical allergies
        critical_allergies = list(Allergy.objects.filter(
            user=user,
            status='active',
            severity__in=['severe', 'life_threatening']
        ).values_list('allergen', flat=True))
        
        return {
            'has_profile': has_profile,
            'blood_group': blood_group,
            'bmi': bmi,
            'bmi_category': bmi_category,
            'active_conditions_count': active_conditions,
            'active_allergies_count': active_allergies,
            'documents_count': documents,
            'pending_vaccinations_count': pending_vaccinations,
            'latest_vitals': latest_vitals,
            'critical_allergies': critical_allergies,
        }