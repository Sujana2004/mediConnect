"""
Prescription Service for MediConnect.

Handles:
- Prescription CRUD
- Prescription medicines management
- Prescription status updates
- Prescription analytics
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import date, timedelta
from django.db import transaction
from django.utils import timezone
from django.db.models import Count, Q

from ..models import (
    UserPrescription,
    PrescriptionMedicine,
    Medicine,
)

logger = logging.getLogger(__name__)


class PrescriptionService:
    """Service for prescription management."""
    
    def get_user_prescriptions(
        self,
        user,
        status: Optional[str] = None,
        include_expired: bool = False,
        limit: int = 50
    ) -> List[UserPrescription]:
        """
        Get user's prescriptions.
        
        Args:
            user: User instance
            status: Filter by status
            include_expired: Include expired prescriptions
            limit: Maximum results
        
        Returns:
            List of prescriptions
        """
        queryset = UserPrescription.objects.filter(
            user=user
        ).prefetch_related('medicines')
        
        if status:
            queryset = queryset.filter(status=status)
        
        if not include_expired:
            today = timezone.now().date()
            queryset = queryset.filter(
                Q(valid_until__isnull=True) | Q(valid_until__gte=today)
            )
        
        return list(queryset.order_by('-prescribed_date')[:limit])
    
    def get_active_prescriptions(self, user) -> List[UserPrescription]:
        """
        Get user's active prescriptions.
        
        Args:
            user: User instance
        
        Returns:
            List of active prescriptions
        """
        return self.get_user_prescriptions(user, status='active')
    
    def get_prescription_by_id(
        self,
        prescription_id: str,
        user=None
    ) -> Optional[UserPrescription]:
        """
        Get prescription by ID.
        
        Args:
            prescription_id: Prescription UUID
            user: Optional user for ownership check
        
        Returns:
            Prescription instance or None
        """
        try:
            queryset = UserPrescription.objects.prefetch_related('medicines')
            
            if user:
                return queryset.get(id=prescription_id, user=user)
            
            return queryset.get(id=prescription_id)
        except UserPrescription.DoesNotExist:
            return None
    
    @transaction.atomic
    def create_prescription(
        self,
        user,
        title: str,
        prescribed_date: date,
        doctor_name: str = '',
        hospital_name: str = '',
        valid_until: Optional[date] = None,
        diagnosis: str = '',
        notes: str = '',
        image_url: str = '',
        medicines: List[Dict[str, Any]] = None
    ) -> UserPrescription:
        """
        Create a new prescription.
        
        Args:
            user: User instance
            title: Prescription title
            prescribed_date: Date of prescription
            doctor_name: Doctor's name
            hospital_name: Hospital/clinic name
            valid_until: Prescription validity
            diagnosis: Diagnosis/condition
            notes: Additional notes
            image_url: Uploaded prescription image
            medicines: List of medicine data
        
        Returns:
            Created prescription
        """
        prescription = UserPrescription.objects.create(
            user=user,
            title=title,
            prescribed_date=prescribed_date,
            doctor_name=doctor_name,
            hospital_name=hospital_name,
            valid_until=valid_until,
            diagnosis=diagnosis,
            notes=notes,
            image_url=image_url,
            status='active'
        )
        
        # Add medicines if provided
        if medicines:
            for med_data in medicines:
                self._add_medicine_to_prescription(prescription, med_data)
        
        logger.info(f"Prescription created: {prescription.id} for user {user.id}")
        
        return prescription
    
    def _add_medicine_to_prescription(
        self,
        prescription: UserPrescription,
        medicine_data: Dict[str, Any]
    ) -> PrescriptionMedicine:
        """Add a medicine to prescription."""
        # Get medicine from database if ID provided
        medicine = None
        medicine_id = medicine_data.get('medicine')
        
        if medicine_id:
            try:
                medicine = Medicine.objects.get(id=medicine_id)
            except Medicine.DoesNotExist:
                pass
        
        # Get medicine name
        medicine_name = medicine_data.get('medicine_name')
        if medicine and not medicine_name:
            medicine_name = medicine.name
        
        return PrescriptionMedicine.objects.create(
            prescription=prescription,
            medicine=medicine,
            medicine_name=medicine_name,
            dosage=medicine_data.get('dosage', ''),
            frequency=medicine_data.get('frequency', 'once_daily'),
            timing=medicine_data.get('timing', 'after_food'),
            custom_times=medicine_data.get('custom_times', []),
            duration_days=medicine_data.get('duration_days'),
            start_date=medicine_data.get('start_date', timezone.now().date()),
            end_date=medicine_data.get('end_date'),
            special_instructions=medicine_data.get('special_instructions', ''),
            quantity_prescribed=medicine_data.get('quantity_prescribed'),
            is_active=True
        )
    
    @transaction.atomic
    def update_prescription(
        self,
        prescription: UserPrescription,
        **update_data
    ) -> UserPrescription:
        """
        Update prescription.
        
        Args:
            prescription: Prescription instance
            **update_data: Fields to update
        
        Returns:
            Updated prescription
        """
        allowed_fields = [
            'title', 'doctor_name', 'hospital_name', 'valid_until',
            'diagnosis', 'status', 'notes', 'image_url'
        ]
        
        for field, value in update_data.items():
            if field in allowed_fields and value is not None:
                setattr(prescription, field, value)
        
        prescription.save()
        
        logger.info(f"Prescription updated: {prescription.id}")
        
        return prescription
    
    @transaction.atomic
    def add_medicine(
        self,
        prescription: UserPrescription,
        medicine_data: Dict[str, Any]
    ) -> PrescriptionMedicine:
        """
        Add medicine to existing prescription.
        
        Args:
            prescription: Prescription instance
            medicine_data: Medicine data
        
        Returns:
            Created prescription medicine
        """
        return self._add_medicine_to_prescription(prescription, medicine_data)
    
    @transaction.atomic
    def update_medicine(
        self,
        prescription_medicine: PrescriptionMedicine,
        **update_data
    ) -> PrescriptionMedicine:
        """
        Update prescription medicine.
        
        Args:
            prescription_medicine: PrescriptionMedicine instance
            **update_data: Fields to update
        
        Returns:
            Updated prescription medicine
        """
        allowed_fields = [
            'dosage', 'frequency', 'timing', 'custom_times',
            'duration_days', 'end_date', 'special_instructions',
            'is_active', 'quantity_remaining'
        ]
        
        for field, value in update_data.items():
            if field in allowed_fields and value is not None:
                setattr(prescription_medicine, field, value)
        
        prescription_medicine.save()
        
        return prescription_medicine
    
    @transaction.atomic
    def remove_medicine(self, prescription_medicine: PrescriptionMedicine) -> bool:
        """
        Remove medicine from prescription.
        
        Args:
            prescription_medicine: PrescriptionMedicine instance
        
        Returns:
            True if deleted
        """
        prescription_medicine.delete()
        return True
    
    def mark_prescription_completed(
        self,
        prescription: UserPrescription
    ) -> UserPrescription:
        """
        Mark prescription as completed.
        
        Args:
            prescription: Prescription instance
        
        Returns:
            Updated prescription
        """
        prescription.status = 'completed'
        prescription.save()
        
        # Deactivate all medicines
        prescription.medicines.update(is_active=False)
        
        logger.info(f"Prescription marked completed: {prescription.id}")
        
        return prescription
    
    def mark_prescription_discontinued(
        self,
        prescription: UserPrescription,
        reason: str = ''
    ) -> UserPrescription:
        """
        Mark prescription as discontinued.
        
        Args:
            prescription: Prescription instance
            reason: Reason for discontinuation
        
        Returns:
            Updated prescription
        """
        prescription.status = 'discontinued'
        if reason:
            prescription.notes = f"{prescription.notes}\nDiscontinued: {reason}".strip()
        prescription.save()
        
        # Deactivate all medicines
        prescription.medicines.update(is_active=False)
        
        logger.info(f"Prescription discontinued: {prescription.id}")
        
        return prescription
    
    def check_and_expire_prescriptions(self) -> int:
        """
        Check and mark expired prescriptions.
        Should be run daily via management command/celery.
        
        Returns:
            Number of prescriptions marked expired
        """
        today = timezone.now().date()
        
        expired = UserPrescription.objects.filter(
            status='active',
            valid_until__lt=today
        )
        
        count = expired.count()
        expired.update(status='expired')
        
        if count > 0:
            logger.info(f"Marked {count} prescriptions as expired")
        
        return count
    
    def get_prescription_stats(self, user) -> Dict[str, Any]:
        """
        Get prescription statistics for user.
        
        Args:
            user: User instance
        
        Returns:
            Dictionary with statistics
        """
        prescriptions = UserPrescription.objects.filter(user=user)
        
        total = prescriptions.count()
        active = prescriptions.filter(status='active').count()
        completed = prescriptions.filter(status='completed').count()
        
        # Get medicine counts
        total_medicines = PrescriptionMedicine.objects.filter(
            prescription__user=user
        ).count()
        
        active_medicines = PrescriptionMedicine.objects.filter(
            prescription__user=user,
            prescription__status='active',
            is_active=True
        ).count()
        
        return {
            'total_prescriptions': total,
            'active_prescriptions': active,
            'completed_prescriptions': completed,
            'total_medicines': total_medicines,
            'active_medicines': active_medicines,
        }
    
    def get_current_medicines(self, user) -> List[Dict[str, Any]]:
        """
        Get all current active medicines for user.
        
        Args:
            user: User instance
        
        Returns:
            List of active medicines with details
        """
        medicines = PrescriptionMedicine.objects.filter(
            prescription__user=user,
            prescription__status='active',
            is_active=True
        ).select_related('prescription', 'medicine')
        
        result = []
        today = timezone.now().date()
        
        for med in medicines:
            # Check if still within duration
            if med.end_date and med.end_date < today:
                continue
            
            result.append({
                'id': str(med.id),
                'medicine_name': med.medicine_name,
                'dosage': med.dosage,
                'frequency': med.frequency,
                'frequency_display': med.get_frequency_display(),
                'timing': med.timing,
                'timing_display': med.get_timing_display(),
                'special_instructions': med.special_instructions,
                'prescription_title': med.prescription.title,
                'prescription_id': str(med.prescription.id),
                'start_date': med.start_date.isoformat() if med.start_date else None,
                'end_date': med.end_date.isoformat() if med.end_date else None,
                'days_remaining': (med.end_date - today).days if med.end_date else None,
            })
        
        return result
    
    def check_medicine_interactions(
        self,
        user
    ) -> List[Dict[str, Any]]:
        """
        Check interactions between user's current medicines.
        
        Args:
            user: User instance
        
        Returns:
            List of interactions found
        """
        from .medicine_service import MedicineService
        
        # Get all active medicine IDs
        medicine_ids = list(
            PrescriptionMedicine.objects.filter(
                prescription__user=user,
                prescription__status='active',
                is_active=True,
                medicine__isnull=False
            ).values_list('medicine_id', flat=True)
        )
        
        if len(medicine_ids) < 2:
            return []
        
        medicine_service = MedicineService()
        result = medicine_service.check_interactions(
            [str(mid) for mid in medicine_ids]
        )
        
        return result.get('interactions', [])