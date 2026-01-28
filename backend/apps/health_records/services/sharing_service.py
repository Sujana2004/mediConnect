"""
Sharing Service
===============
Manages sharing of health records between patients and doctors.
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import timedelta
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth import get_user_model

from ..models import (
    SharedRecord,
    HealthProfile,
    MedicalCondition,
    MedicalDocument,
    LabReport,
    VaccinationRecord,
    Allergy,
    FamilyMedicalHistory,
    Hospitalization,
    VitalSign,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class SharingService:
    """Service for managing health record sharing."""

    @staticmethod
    def share_with_doctor(
        patient,
        doctor,
        share_type: str = 'all',
        is_permanent: bool = False,
        expires_at=None,
        document_ids: List = None,
        consultation=None,
    ) -> SharedRecord:
        """
        Share health records with a doctor.
        
        Args:
            patient: Patient user instance
            doctor: Doctor user instance
            share_type: Type of sharing (all, profile, documents, etc.)
            is_permanent: Whether sharing is permanent
            expires_at: Expiry datetime for temporary sharing
            document_ids: List of specific document IDs to share
            consultation: Optional consultation linkage
            
        Returns:
            Created SharedRecord instance
        """
        # Validate doctor
        if doctor.role != 'doctor':
            raise ValueError("Can only share with doctors")
        
        # Set default expiry for non-permanent shares
        if not is_permanent and not expires_at:
            expires_at = timezone.now() + timedelta(days=30)
        
        # Check for existing active share
        existing = SharedRecord.objects.filter(
            patient=patient,
            doctor=doctor,
            share_type=share_type,
            is_active=True,
        ).first()
        
        if existing:
            # Update existing share
            existing.is_permanent = is_permanent
            existing.expires_at = expires_at
            existing.revoked_at = None
            existing.save()
            shared = existing
            logger.info(f"Updated existing share from {patient.phone} to {doctor.phone}")
        else:
            # Create new share
            shared = SharedRecord.objects.create(
                patient=patient,
                doctor=doctor,
                share_type=share_type,
                is_permanent=is_permanent,
                expires_at=expires_at,
                consultation=consultation,
            )
            logger.info(f"Created new share from {patient.phone} to {doctor.phone}")
        
        # Add specific documents if provided
        if document_ids and share_type == 'documents':
            documents = MedicalDocument.objects.filter(
                id__in=document_ids,
                user=patient
            )
            shared.documents.set(documents)
        
        return shared

    @staticmethod
    def share_for_consultation(patient, doctor, consultation) -> SharedRecord:
        """
        Create temporary share for a consultation.
        
        Args:
            patient: Patient user instance
            doctor: Doctor user instance
            consultation: Consultation instance
            
        Returns:
            Created SharedRecord instance
        """
        # Share expires 24 hours after consultation
        expires_at = timezone.now() + timedelta(hours=24)
        
        return SharingService.share_with_doctor(
            patient=patient,
            doctor=doctor,
            share_type='all',
            is_permanent=False,
            expires_at=expires_at,
            consultation=consultation,
        )

    @staticmethod
    def revoke_share(share_id, patient) -> SharedRecord:
        """
        Revoke a shared record.
        
        Args:
            share_id: UUID of the shared record
            patient: Patient user instance
            
        Returns:
            Updated SharedRecord instance
        """
        shared = SharedRecord.objects.get(id=share_id, patient=patient)
        shared.is_active = False
        shared.revoked_at = timezone.now()
        shared.save(update_fields=['is_active', 'revoked_at', 'updated_at'])
        logger.info(f"Revoked share {share_id}")
        return shared

    @staticmethod
    def get_patient_shares(patient) -> List[SharedRecord]:
        """Get all active shares for a patient."""
        return list(SharedRecord.objects.filter(
            patient=patient,
            is_active=True,
        ).select_related('doctor').order_by('-created_at'))

    @staticmethod
    def get_doctor_accessible_patients(doctor) -> List[Dict]:
        """
        Get list of patients who have shared records with this doctor.
        
        Args:
            doctor: Doctor user instance
            
        Returns:
            List of patient info with share details
        """
        shares = SharedRecord.objects.filter(
            doctor=doctor,
            is_active=True,
        ).select_related('patient').order_by('-created_at')
        
        # Filter expired shares
        active_shares = [s for s in shares if not s.is_expired()]
        
        patients = {}
        for share in active_shares:
            patient_id = str(share.patient.id)
            if patient_id not in patients:
                patients[patient_id] = {
                    'patient': share.patient,
                    'share_types': [],
                    'latest_share': share.created_at,
                    'is_permanent': False,
                }
            
            patients[patient_id]['share_types'].append(share.share_type)
            if share.is_permanent:
                patients[patient_id]['is_permanent'] = True
        
        return list(patients.values())

    @staticmethod
    def can_doctor_access(doctor, patient, record_type: str = 'all') -> bool:
        """
        Check if a doctor can access a patient's records.
        
        Args:
            doctor: Doctor user instance
            patient: Patient user instance
            record_type: Type of record to check access for
            
        Returns:
            True if doctor has access
        """
        # Check for active shares
        shares = SharedRecord.objects.filter(
            patient=patient,
            doctor=doctor,
            is_active=True,
        )
        
        for share in shares:
            if share.is_expired():
                continue
            
            if share.share_type == 'all':
                return True
            
            if share.share_type == record_type:
                return True
        
        return False

    @staticmethod
    def get_accessible_records(doctor, patient) -> Dict[str, Any]:
        """
        Get all records a doctor can access for a patient.
        
        Args:
            doctor: Doctor user instance
            patient: Patient user instance
            
        Returns:
            Dictionary with accessible records
        """
        # Get active shares
        shares = SharedRecord.objects.filter(
            patient=patient,
            doctor=doctor,
            is_active=True,
        )
        
        # Determine what can be accessed
        share_types = set()
        specific_documents = []
        
        for share in shares:
            if share.is_expired():
                continue
            
            share.record_access()  # Record access
            
            if share.share_type == 'all':
                share_types = {'all'}
                break
            
            share_types.add(share.share_type)
            
            if share.share_type == 'documents':
                specific_documents.extend(share.documents.all())
        
        # Build response based on access
        records = {}
        
        if 'all' in share_types or 'profile' in share_types:
            try:
                records['health_profile'] = HealthProfile.objects.get(user=patient)
            except HealthProfile.DoesNotExist:
                records['health_profile'] = None
        
        if 'all' in share_types or 'conditions' in share_types:
            records['medical_conditions'] = list(MedicalCondition.objects.filter(
                user=patient
            ).order_by('-diagnosed_date'))
        
        if 'all' in share_types or 'documents' in share_types:
            if 'all' in share_types:
                records['documents'] = list(MedicalDocument.objects.filter(
                    user=patient,
                    is_shared_with_doctors=True
                ).order_by('-document_date'))
            else:
                records['documents'] = specific_documents
        
        if 'all' in share_types or 'lab_reports' in share_types:
            records['lab_reports'] = list(LabReport.objects.filter(
                user=patient
            ).order_by('-test_date'))
        
        if 'all' in share_types or 'vaccinations' in share_types:
            records['vaccinations'] = list(VaccinationRecord.objects.filter(
                user=patient
            ).order_by('-vaccination_date'))
        
        if 'all' in share_types:
            records['allergies'] = list(Allergy.objects.filter(
                user=patient,
                status='active'
            ))
            
            records['family_history'] = list(FamilyMedicalHistory.objects.filter(
                user=patient
            ))
            
            records['hospitalizations'] = list(Hospitalization.objects.filter(
                user=patient
            ).order_by('-admission_date')[:10])
            
            records['vital_signs'] = list(VitalSign.objects.filter(
                user=patient
            ).order_by('-recorded_at')[:20])
        
        return records

    @staticmethod
    def cleanup_expired_shares() -> int:
        """
        Deactivate expired shares.
        
        Returns:
            Number of shares deactivated
        """
        now = timezone.now()
        
        expired = SharedRecord.objects.filter(
            is_active=True,
            is_permanent=False,
            expires_at__lt=now,
        )
        
        count = expired.count()
        expired.update(is_active=False)
        
        if count > 0:
            logger.info(f"Deactivated {count} expired shares")
        
        return count