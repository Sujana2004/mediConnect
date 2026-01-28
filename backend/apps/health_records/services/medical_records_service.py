"""
Medical Records Service
=======================
Manages medical conditions, lab reports, vaccinations, etc.
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import date, timedelta
from django.db import transaction
from django.db.models import Q, Count, F  # 👈 FIX 1: Added F to imports
from django.utils import timezone
from django.contrib.auth import get_user_model

from ..models import (
    MedicalCondition,
    LabReport,
    VaccinationRecord,
    Allergy,
    FamilyMedicalHistory,
    Hospitalization,
    VitalSign,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class MedicalRecordsService:
    """Service for managing medical records."""

    # =========================================================================
    # MEDICAL CONDITIONS
    # =========================================================================

    @staticmethod
    def create_condition(
        user,
        condition_name: str,
        **kwargs
    ) -> MedicalCondition:
        """
        Create a new medical condition record.
        
        Args:
            user: User instance
            condition_name: Name of the condition
            **kwargs: Additional condition fields
            
        Returns:
            Created MedicalCondition instance
        """
        condition = MedicalCondition.objects.create(
            user=user,
            condition_name=condition_name,
            **kwargs
        )
        logger.info(f"Created condition '{condition_name}' for {user.phone}")
        return condition

    @staticmethod
    def get_active_conditions(user) -> List[MedicalCondition]:
        """Get all active medical conditions for a user."""
        return list(MedicalCondition.objects.filter(
            user=user,
            status__in=['active', 'managed', 'recurring']
        ).order_by('-diagnosed_date'))

    @staticmethod
    def get_chronic_conditions(user) -> List[MedicalCondition]:
        """Get all chronic conditions for a user."""
        return list(MedicalCondition.objects.filter(
            user=user,
            is_chronic=True,
            status__in=['active', 'managed']
        ))

    @staticmethod
    def resolve_condition(
        condition_id,
        user,
        resolved_date: Optional[date] = None
    ) -> MedicalCondition:
        """
        Mark a condition as resolved.
        
        Args:
            condition_id: UUID of the condition
            user: User instance (for verification)
            resolved_date: Date when resolved
            
        Returns:
            Updated MedicalCondition instance
        """
        condition = MedicalCondition.objects.get(id=condition_id, user=user)
        condition.status = 'resolved'
        condition.resolved_date = resolved_date or timezone.now().date()
        condition.save(update_fields=['status', 'resolved_date', 'updated_at'])
        logger.info(f"Resolved condition '{condition.condition_name}' for {user.phone}")
        return condition

    # =========================================================================
    # LAB REPORTS
    # =========================================================================

    @staticmethod
    def create_lab_report(
        user,
        report_name: str,
        lab_type: str,
        test_date: date,
        results: List[Dict] = None,
        **kwargs
    ) -> LabReport:
        """
        Create a new lab report.
        
        Args:
            user: User instance
            report_name: Name of the report
            lab_type: Type of lab test
            test_date: Date of the test
            results: List of test results
            **kwargs: Additional fields
            
        Returns:
            Created LabReport instance
        """
        # Determine overall status from results
        overall_status = 'pending'
        if results:
            statuses = [r.get('status', 'normal') for r in results]
            if 'critical' in statuses:
                overall_status = 'critical'
            elif any(s in ['low', 'high', 'abnormal'] for s in statuses):
                overall_status = 'abnormal'
            else:
                overall_status = 'normal'

        report = LabReport.objects.create(
            user=user,
            report_name=report_name,
            lab_type=lab_type,
            test_date=test_date,
            results=results or [],
            overall_status=overall_status,
            **kwargs
        )
        logger.info(f"Created lab report '{report_name}' for {user.phone}")
        return report

    @staticmethod
    def get_recent_lab_reports(user, days: int = 90) -> List[LabReport]:
        """Get lab reports from the last N days."""
        since_date = timezone.now().date() - timedelta(days=days)
        return list(LabReport.objects.filter(
            user=user,
            test_date__gte=since_date
        ).order_by('-test_date'))

    @staticmethod
    def get_abnormal_reports(user) -> List[LabReport]:
        """Get lab reports with abnormal results."""
        return list(LabReport.objects.filter(
            user=user,
            overall_status__in=['abnormal', 'critical']
        ).order_by('-test_date'))

    @staticmethod
    def get_lab_report_trends(
        user,
        lab_type: str,
        test_name: str,
        months: int = 12
    ) -> List[Dict]:
        """
        Get trend data for a specific test over time.
        
        Args:
            user: User instance
            lab_type: Type of lab test
            test_name: Name of the specific test
            months: Number of months to look back
            
        Returns:
            List of {date, value} dictionaries
        """
        since_date = timezone.now().date() - timedelta(days=months * 30)
        
        reports = LabReport.objects.filter(
            user=user,
            lab_type=lab_type,
            test_date__gte=since_date
        ).order_by('test_date')
        
        trends = []
        for report in reports:
            for result in report.results:
                if result.get('name', '').lower() == test_name.lower():
                    try:
                        value = float(result.get('value', 0))
                        trends.append({
                            'date': report.test_date,
                            'value': value,
                            'status': result.get('status', 'normal'),
                            'unit': result.get('unit', ''),
                        })
                    except (ValueError, TypeError):
                        pass
        
        return trends

    # =========================================================================
    # VACCINATIONS
    # =========================================================================

    @staticmethod
    def create_vaccination_record(
        user,
        vaccine_name: str,
        vaccine_type: str,
        vaccination_date: date,
        **kwargs
    ) -> VaccinationRecord:
        """
        Create a vaccination record.
        
        Args:
            user: User instance
            vaccine_name: Name of the vaccine
            vaccine_type: Type of vaccine
            vaccination_date: Date of vaccination
            **kwargs: Additional fields
            
        Returns:
            Created VaccinationRecord instance
        """
        record = VaccinationRecord.objects.create(
            user=user,
            vaccine_name=vaccine_name,
            vaccine_type=vaccine_type,
            vaccination_date=vaccination_date,
            **kwargs
        )
        logger.info(f"Created vaccination record '{vaccine_name}' for {user.phone}")
        return record

    @staticmethod
    def get_pending_vaccinations(user) -> List[VaccinationRecord]:
        """Get vaccinations that are due or overdue."""
        today = timezone.now().date()
        
        # Get incomplete vaccinations where next dose is due
        return list(VaccinationRecord.objects.filter(
            user=user,
            next_due_date__lte=today
        ).exclude(
            dose_number__gte=F('total_doses')  # 👈 FIX 2: Changed model.F to F
        ).order_by('next_due_date'))

    @staticmethod
    def get_vaccination_schedule(user) -> List[Dict]:
        """
        Get complete vaccination schedule with status.
        
        Returns:
            List of vaccination info with completion status
        """
        records = VaccinationRecord.objects.filter(user=user).order_by(
            'vaccine_type', '-vaccination_date'
        )
        
        # Group by vaccine type
        schedule = {}
        for record in records:
            vtype = record.vaccine_type
            if vtype not in schedule:
                schedule[vtype] = {
                    'vaccine_type': vtype,
                    'vaccine_name': record.vaccine_name,
                    'doses_received': 0,
                    'total_doses': record.total_doses,
                    'is_complete': False,
                    'next_due_date': None,
                    'last_dose_date': None,
                    'records': [],
                }
            
            schedule[vtype]['doses_received'] = max(
                schedule[vtype]['doses_received'],
                record.dose_number
            )
            schedule[vtype]['is_complete'] = record.is_complete
            schedule[vtype]['last_dose_date'] = record.vaccination_date
            
            if record.next_due_date and not record.is_complete:
                schedule[vtype]['next_due_date'] = record.next_due_date
            
            schedule[vtype]['records'].append({
                'id': str(record.id),
                'dose_number': record.dose_number,
                'date': record.vaccination_date,
                'administered_at': record.administered_at,
            })
        
        return list(schedule.values())

    # =========================================================================
    # ALLERGIES
    # =========================================================================

    @staticmethod
    def create_allergy(
        user,
        allergen: str,
        allergy_type: str,
        severity: str,
        reaction: str,
        **kwargs
    ) -> Allergy:
        """
        Create an allergy record.
        
        Args:
            user: User instance
            allergen: What causes the allergy
            allergy_type: Type of allergy
            severity: Severity level
            reaction: Description of reaction
            **kwargs: Additional fields
            
        Returns:
            Created Allergy instance
        """
        allergy = Allergy.objects.create(
            user=user,
            allergen=allergen,
            allergy_type=allergy_type,
            severity=severity,
            reaction=reaction,
            **kwargs
        )
        
        # Sync to health profile
        from .health_profile_service import HealthProfileService
        HealthProfileService.sync_allergies_from_records(user)
        
        logger.info(f"Created allergy '{allergen}' for {user.phone}")
        return allergy

    @staticmethod
    def get_active_allergies(user) -> List[Allergy]:
        """Get all active allergies."""
        return list(Allergy.objects.filter(
            user=user,
            status='active'
        ).order_by('-severity', 'allergen'))

    @staticmethod
    def get_critical_allergies(user) -> List[Allergy]:
        """Get severe and life-threatening allergies."""
        return list(Allergy.objects.filter(
            user=user,
            status='active',
            severity__in=['severe', 'life_threatening']
        ))

    @staticmethod
    def get_drug_allergies(user) -> List[str]:
        """Get list of drug allergies (for prescription safety)."""
        return list(Allergy.objects.filter(
            user=user,
            status='active',
            allergy_type='drug'
        ).values_list('allergen', flat=True))

    # =========================================================================
    # FAMILY HISTORY
    # =========================================================================

    @staticmethod
    def create_family_history(
        user,
        relation: str,
        condition: str,
        **kwargs
    ) -> FamilyMedicalHistory:
        """
        Create a family medical history record.
        
        Args:
            user: User instance
            relation: Relationship to the user
            condition: Medical condition
            **kwargs: Additional fields
            
        Returns:
            Created FamilyMedicalHistory instance
        """
        record = FamilyMedicalHistory.objects.create(
            user=user,
            relation=relation,
            condition=condition,
            **kwargs
        )
        logger.info(f"Created family history record for {user.phone}")
        return record

    @staticmethod
    def get_family_history_summary(user) -> Dict[str, List[str]]:
        """
        Get family history grouped by condition.
        
        Returns:
            Dictionary with conditions as keys and list of relations as values
        """
        records = FamilyMedicalHistory.objects.filter(user=user)
        
        summary = {}
        for record in records:
            condition = record.condition
            if condition not in summary:
                summary[condition] = []
            summary[condition].append(record.get_relation_display())
        
        return summary

    @staticmethod
    def get_hereditary_risk_conditions(user) -> List[str]:
        """
        Get conditions that may be hereditary based on family history.
        
        Returns:
            List of condition names
        """
        # Conditions with multiple family members affected
        records = FamilyMedicalHistory.objects.filter(user=user)
        
        condition_counts = {}
        for record in records:
            condition = record.condition.lower()
            condition_counts[condition] = condition_counts.get(condition, 0) + 1
        
        # Return conditions with 2+ family members
        return [c for c, count in condition_counts.items() if count >= 2]

    # =========================================================================
    # HOSPITALIZATIONS
    # =========================================================================

    @staticmethod
    def create_hospitalization(
        user,
        hospital_name: str,
        admission_date: date,
        reason: str,
        **kwargs
    ) -> Hospitalization:
        """
        Create a hospitalization record.
        
        Args:
            user: User instance
            hospital_name: Name of the hospital
            admission_date: Date of admission
            reason: Reason for admission
            **kwargs: Additional fields
            
        Returns:
            Created Hospitalization instance
        """
        record = Hospitalization.objects.create(
            user=user,
            hospital_name=hospital_name,
            admission_date=admission_date,
            reason=reason,
            **kwargs
        )
        logger.info(f"Created hospitalization record for {user.phone}")
        return record

    @staticmethod
    def get_hospitalization_history(user) -> List[Hospitalization]:
        """Get all hospitalizations sorted by date."""
        return list(Hospitalization.objects.filter(
            user=user
        ).order_by('-admission_date'))

    @staticmethod
    def get_pending_followups(user) -> List[Hospitalization]:
        """Get hospitalizations with pending follow-ups."""
        today = timezone.now().date()
        return list(Hospitalization.objects.filter(
            user=user,
            follow_up_date__gte=today
        ).order_by('follow_up_date'))

    # =========================================================================
    # VITAL SIGNS
    # =========================================================================

    @staticmethod
    def record_vitals(user, **vital_data) -> VitalSign:
        """
        Record vital signs.
        
        Args:
            user: User instance
            **vital_data: Vital sign measurements
            
        Returns:
            Created VitalSign instance
        """
        vital = VitalSign.objects.create(user=user, **vital_data)
        logger.info(f"Recorded vitals for {user.phone}")
        return vital

    @staticmethod
    def get_latest_vitals(user) -> Optional[VitalSign]:
        """Get the most recent vital signs."""
        return VitalSign.objects.filter(user=user).order_by('-recorded_at').first()

    @staticmethod
    def get_vital_trends(user, days: int = 30) -> Dict[str, List]:
        """
        Get vital sign trends over time.
        
        Args:
            user: User instance
            days: Number of days to look back
            
        Returns:
            Dictionary with vital name as key and list of {date, value} as value
        """
        since = timezone.now() - timedelta(days=days)
        vitals = VitalSign.objects.filter(
            user=user,
            recorded_at__gte=since
        ).order_by('recorded_at')
        
        trends = {
            'blood_pressure': [],
            'heart_rate': [],
            'temperature': [],
            'oxygen_saturation': [],
            'blood_sugar': [],
            'weight': [],
        }
        
        for vital in vitals:
            date_str = vital.recorded_at.date().isoformat()
            
            if vital.systolic_bp and vital.diastolic_bp:
                trends['blood_pressure'].append({
                    'date': date_str,
                    'systolic': vital.systolic_bp,
                    'diastolic': vital.diastolic_bp,
                    'status': vital.get_bp_status(),
                })
            
            if vital.heart_rate:
                trends['heart_rate'].append({
                    'date': date_str,
                    'value': vital.heart_rate,
                })
            
            if vital.temperature:
                trends['temperature'].append({
                    'date': date_str,
                    'value': float(vital.temperature),
                })
            
            if vital.oxygen_saturation:
                trends['oxygen_saturation'].append({
                    'date': date_str,
                    'value': vital.oxygen_saturation,
                })
            
            if vital.blood_sugar:
                trends['blood_sugar'].append({
                    'date': date_str,
                    'value': vital.blood_sugar,
                    'type': vital.blood_sugar_type,
                })
            
            if vital.weight_kg:
                trends['weight'].append({
                    'date': date_str,
                    'value': float(vital.weight_kg),
                })
        
        return trends

    @staticmethod
    def check_vital_alerts(vital: VitalSign) -> List[Dict]:
        """
        Check vital signs for concerning values.
        
        Args:
            vital: VitalSign instance
            
        Returns:
            List of alert dictionaries
        """
        alerts = []
        
        # Blood pressure alerts
        if vital.systolic_bp and vital.diastolic_bp:
            if vital.systolic_bp >= 180 or vital.diastolic_bp >= 120:
                alerts.append({
                    'type': 'critical',
                    'vital': 'blood_pressure',
                    'message': f'Hypertensive crisis: {vital.systolic_bp}/{vital.diastolic_bp} mmHg',
                })
            elif vital.systolic_bp >= 140 or vital.diastolic_bp >= 90:
                alerts.append({
                    'type': 'warning',
                    'vital': 'blood_pressure',
                    'message': f'High blood pressure: {vital.systolic_bp}/{vital.diastolic_bp} mmHg',
                })
            elif vital.systolic_bp < 90 or vital.diastolic_bp < 60:
                alerts.append({
                    'type': 'warning',
                    'vital': 'blood_pressure',
                    'message': f'Low blood pressure: {vital.systolic_bp}/{vital.diastolic_bp} mmHg',
                })
        
        # Heart rate alerts
        if vital.heart_rate:
            if vital.heart_rate > 120:
                alerts.append({
                    'type': 'warning',
                    'vital': 'heart_rate',
                    'message': f'High heart rate: {vital.heart_rate} bpm',
                })
            elif vital.heart_rate < 50:
                alerts.append({
                    'type': 'warning',
                    'vital': 'heart_rate',
                    'message': f'Low heart rate: {vital.heart_rate} bpm',
                })
        
        # Temperature alerts
        if vital.temperature:
            temp = float(vital.temperature)
            if temp >= 103:
                alerts.append({
                    'type': 'critical',
                    'vital': 'temperature',
                    'message': f'High fever: {temp}°F',
                })
            elif temp >= 100.4:
                alerts.append({
                    'type': 'warning',
                    'vital': 'temperature',
                    'message': f'Fever: {temp}°F',
                })
            elif temp < 95:
                alerts.append({
                    'type': 'critical',
                    'vital': 'temperature',
                    'message': f'Hypothermia: {temp}°F',
                })
        
        # Oxygen saturation alerts
        if vital.oxygen_saturation:
            if vital.oxygen_saturation < 90:
                alerts.append({
                    'type': 'critical',
                    'vital': 'oxygen_saturation',
                    'message': f'Critical oxygen level: {vital.oxygen_saturation}%',
                })
            elif vital.oxygen_saturation < 95:
                alerts.append({
                    'type': 'warning',
                    'vital': 'oxygen_saturation',
                    'message': f'Low oxygen level: {vital.oxygen_saturation}%',
                })
        
        # Blood sugar alerts
        if vital.blood_sugar:
            if vital.blood_sugar > 400:
                alerts.append({
                    'type': 'critical',
                    'vital': 'blood_sugar',
                    'message': f'Severely high blood sugar: {vital.blood_sugar} mg/dL',
                })
            elif vital.blood_sugar > 200:
                alerts.append({
                    'type': 'warning',
                    'vital': 'blood_sugar',
                    'message': f'High blood sugar: {vital.blood_sugar} mg/dL',
                })
            elif vital.blood_sugar < 70:
                alerts.append({
                    'type': 'warning',
                    'vital': 'blood_sugar',
                    'message': f'Low blood sugar: {vital.blood_sugar} mg/dL',
                })
            elif vital.blood_sugar < 50:
                alerts.append({
                    'type': 'critical',
                    'vital': 'blood_sugar',
                    'message': f'Dangerously low blood sugar: {vital.blood_sugar} mg/dL',
                })
        
        return alerts