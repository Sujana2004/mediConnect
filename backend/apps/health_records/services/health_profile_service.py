"""
Health Profile Service
======================
Manages health profile operations.
"""

import logging
from typing import Optional, Dict, Any, List
from django.db import transaction
from django.contrib.auth import get_user_model

from ..models import HealthProfile, Allergy, MedicalCondition

User = get_user_model()
logger = logging.getLogger(__name__)


class HealthProfileService:
    """Service for health profile operations."""

    @staticmethod
    def get_or_create_profile(user) -> HealthProfile:
        """
        Get or create health profile for a user.
        
        Args:
            user: User instance
            
        Returns:
            HealthProfile instance
        """
        profile, created = HealthProfile.objects.get_or_create(user=user)
        if created:
            logger.info(f"Created health profile for user {user.phone}")
        return profile

    @staticmethod
    def update_profile(user, data: Dict[str, Any]) -> HealthProfile:
        """
        Update health profile with provided data.
        
        Args:
            user: User instance
            data: Dictionary of profile data
            
        Returns:
            Updated HealthProfile instance
        """
        profile = HealthProfileService.get_or_create_profile(user)
        
        # Update fields
        updatable_fields = [
            'blood_group', 'height_cm', 'weight_kg',
            'allergies', 'chronic_conditions', 'current_medications',
            'family_history', 'smoking_status', 'alcohol_consumption',
            'emergency_contact_name', 'emergency_contact_phone',
            'emergency_contact_relation', 'notes'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(profile, field, data[field])
        
        profile.save()
        logger.info(f"Updated health profile for user {user.phone}")
        return profile

    @staticmethod
    def add_allergy_to_profile(user, allergy_name: str) -> HealthProfile:
        """
        Add an allergy to the profile's quick allergy list.
        
        Args:
            user: User instance
            allergy_name: Name of the allergy
            
        Returns:
            Updated HealthProfile instance
        """
        profile = HealthProfileService.get_or_create_profile(user)
        
        if allergy_name not in profile.allergies:
            profile.allergies.append(allergy_name)
            profile.save(update_fields=['allergies', 'updated_at'])
            logger.info(f"Added allergy '{allergy_name}' to profile for {user.phone}")
        
        return profile

    @staticmethod
    def remove_allergy_from_profile(user, allergy_name: str) -> HealthProfile:
        """
        Remove an allergy from the profile's quick allergy list.
        
        Args:
            user: User instance
            allergy_name: Name of the allergy
            
        Returns:
            Updated HealthProfile instance
        """
        profile = HealthProfileService.get_or_create_profile(user)
        
        if allergy_name in profile.allergies:
            profile.allergies.remove(allergy_name)
            profile.save(update_fields=['allergies', 'updated_at'])
            logger.info(f"Removed allergy '{allergy_name}' from profile for {user.phone}")
        
        return profile

    @staticmethod
    def add_chronic_condition(user, condition: str) -> HealthProfile:
        """
        Add a chronic condition to the profile.
        
        Args:
            user: User instance
            condition: Condition name
            
        Returns:
            Updated HealthProfile instance
        """
        profile = HealthProfileService.get_or_create_profile(user)
        
        if condition not in profile.chronic_conditions:
            profile.chronic_conditions.append(condition)
            profile.save(update_fields=['chronic_conditions', 'updated_at'])
            logger.info(f"Added chronic condition '{condition}' for {user.phone}")
        
        return profile

    @staticmethod
    def remove_chronic_condition(user, condition: str) -> HealthProfile:
        """
        Remove a chronic condition from the profile.
        
        Args:
            user: User instance
            condition: Condition name
            
        Returns:
            Updated HealthProfile instance
        """
        profile = HealthProfileService.get_or_create_profile(user)
        
        if condition in profile.chronic_conditions:
            profile.chronic_conditions.remove(condition)
            profile.save(update_fields=['chronic_conditions', 'updated_at'])
            logger.info(f"Removed chronic condition '{condition}' for {user.phone}")
        
        return profile

    @staticmethod
    def update_current_medications(user, medications: List[str]) -> HealthProfile:
        """
        Update current medications list.
        
        Args:
            user: User instance
            medications: List of medication names
            
        Returns:
            Updated HealthProfile instance
        """
        profile = HealthProfileService.get_or_create_profile(user)
        profile.current_medications = medications
        profile.save(update_fields=['current_medications', 'updated_at'])
        logger.info(f"Updated current medications for {user.phone}")
        return profile

    @staticmethod
    def update_emergency_contact(
        user,
        name: str,
        phone: str,
        relation: str
    ) -> HealthProfile:
        """
        Update emergency contact information.
        
        Args:
            user: User instance
            name: Contact name
            phone: Contact phone
            relation: Relationship to user
            
        Returns:
            Updated HealthProfile instance
        """
        profile = HealthProfileService.get_or_create_profile(user)
        profile.emergency_contact_name = name
        profile.emergency_contact_phone = phone
        profile.emergency_contact_relation = relation
        profile.save(update_fields=[
            'emergency_contact_name',
            'emergency_contact_phone',
            'emergency_contact_relation',
            'updated_at'
        ])
        logger.info(f"Updated emergency contact for {user.phone}")
        return profile

    @staticmethod
    def sync_allergies_from_records(user) -> HealthProfile:
        """
        Sync allergies list from detailed allergy records.
        
        Args:
            user: User instance
            
        Returns:
            Updated HealthProfile instance
        """
        profile = HealthProfileService.get_or_create_profile(user)
        
        # Get active allergies from Allergy model
        active_allergies = Allergy.objects.filter(
            user=user,
            status='active'
        ).values_list('allergen', flat=True)
        
        profile.allergies = list(active_allergies)
        profile.save(update_fields=['allergies', 'updated_at'])
        logger.info(f"Synced allergies from records for {user.phone}")
        return profile

    @staticmethod
    def sync_conditions_from_records(user) -> HealthProfile:
        """
        Sync chronic conditions from medical condition records.
        
        Args:
            user: User instance
            
        Returns:
            Updated HealthProfile instance
        """
        profile = HealthProfileService.get_or_create_profile(user)
        
        # Get chronic conditions
        chronic_conditions = MedicalCondition.objects.filter(
            user=user,
            is_chronic=True,
            status__in=['active', 'managed']
        ).values_list('condition_name', flat=True)
        
        profile.chronic_conditions = list(chronic_conditions)
        profile.save(update_fields=['chronic_conditions', 'updated_at'])
        logger.info(f"Synced chronic conditions from records for {user.phone}")
        return profile

    @staticmethod
    def get_health_summary(user) -> Dict[str, Any]:
        """
        Get a comprehensive health summary for the user.
        
        Args:
            user: User instance
            
        Returns:
            Dictionary with health summary
        """
        profile = HealthProfileService.get_or_create_profile(user)
        
        return {
            'blood_group': profile.blood_group,
            'bmi': profile.get_bmi(),
            'bmi_category': profile.get_bmi_category(),
            'height_cm': float(profile.height_cm) if profile.height_cm else None,
            'weight_kg': float(profile.weight_kg) if profile.weight_kg else None,
            'allergies': profile.allergies,
            'chronic_conditions': profile.chronic_conditions,
            'current_medications': profile.current_medications,
            'smoking_status': profile.smoking_status,
            'alcohol_consumption': profile.alcohol_consumption,
            'has_emergency_contact': bool(profile.emergency_contact_phone),
        }

    @staticmethod
    def get_critical_info(user) -> Dict[str, Any]:
        """
        Get critical health info (for emergencies/consultations).
        
        Args:
            user: User instance
            
        Returns:
            Dictionary with critical health info
        """
        profile = HealthProfileService.get_or_create_profile(user)
        
        # Get severe/life-threatening allergies
        critical_allergies = Allergy.objects.filter(
            user=user,
            status='active',
            severity__in=['severe', 'life_threatening']
        ).values_list('allergen', flat=True)
        
        return {
            'blood_group': profile.blood_group,
            'critical_allergies': list(critical_allergies),
            'all_allergies': profile.allergies,
            'chronic_conditions': profile.chronic_conditions,
            'current_medications': profile.current_medications,
            'emergency_contact': {
                'name': profile.emergency_contact_name,
                'phone': profile.emergency_contact_phone,
                'relation': profile.emergency_contact_relation,
            } if profile.emergency_contact_phone else None,
        }