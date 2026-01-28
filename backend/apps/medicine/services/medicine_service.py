"""
Medicine Service for MediConnect.

Handles:
- Medicine search (name, generic, brand)
- Medicine details
- Generic alternatives
- Drug interactions
- Categories
"""

import logging
from typing import Optional, Dict, Any, List, Tuple
from django.db.models import Q, Count
from django.db import transaction

from ..models import (
    Medicine,
    MedicineAlternative,
    DrugInteraction,
    MedicineSearchHistory,
)

logger = logging.getLogger(__name__)


class MedicineService:
    """Service for medicine-related operations."""
    
    # Category icons for UI
    CATEGORY_ICONS = {
        'antibiotic': '💊',
        'painkiller': '💉',
        'antacid': '🔵',
        'antihistamine': '🤧',
        'antidiabetic': '🩸',
        'antihypertensive': '❤️',
        'vitamin': '🌟',
        'antipyretic': '🌡️',
        'antidepressant': '🧠',
        'antiseptic': '🧴',
        'cough': '😷',
        'cold': '🤒',
        'digestive': '🫃',
        'cardiac': '💓',
        'skin': '🧴',
        'eye': '👁️',
        'ear': '👂',
        'other': '💊',
    }
    
    def search_medicines(
        self,
        query: str,
        category: Optional[str] = None,
        medicine_type: Optional[str] = None,
        generic_only: bool = False,
        otc_only: bool = False,
        limit: int = 20,
        user=None
    ) -> Tuple[List[Medicine], int]:
        """
        Search medicines by name, generic name, or brand.
        
        Args:
            query: Search term
            category: Filter by category
            medicine_type: Filter by type (tablet, syrup, etc.)
            generic_only: Only show generic medicines
            otc_only: Only show OTC medicines
            limit: Maximum results
            user: User for search history
        
        Returns:
            Tuple of (list of medicines, total count)
        """
        query = query.strip()
        
        if not query:
            return [], 0
        
        # Build search query
        queryset = Medicine.objects.filter(is_active=True)
        
        # Search in name, generic name, brand name
        search_filter = (
            Q(name__icontains=query) |
            Q(name_generic__icontains=query) |
            Q(brand_name__icontains=query) |
            Q(name_local__icontains=query) |
            Q(composition__icontains=query)
        )
        queryset = queryset.filter(search_filter)
        
        # Apply filters
        if category:
            queryset = queryset.filter(category__iexact=category)
        
        if medicine_type:
            queryset = queryset.filter(medicine_type=medicine_type)
        
        if generic_only:
            queryset = queryset.filter(is_generic=True)
        
        if otc_only:
            queryset = queryset.filter(prescription_type='otc')
        
        # Order by relevance (exact matches first)
        queryset = queryset.annotate(
            exact_match=Count('id', filter=Q(name__iexact=query))
        ).order_by('-exact_match', 'name')
        
        total_count = queryset.count()
        medicines = list(queryset[:limit])
        
        # Log search history
        if user and user.is_authenticated:
            self._log_search(user, query, total_count)
        
        logger.info(f"Medicine search: '{query}' returned {total_count} results")
        
        return medicines, total_count
    
    def _log_search(self, user, query: str, results_count: int):
        """Log search to history."""
        try:
            MedicineSearchHistory.objects.create(
                user=user,
                search_query=query,
                results_count=results_count
            )
        except Exception as e:
            logger.warning(f"Failed to log search history: {e}")
    
    def get_medicine_by_id(self, medicine_id: str) -> Optional[Medicine]:
        """
        Get medicine by ID.
        
        Args:
            medicine_id: Medicine UUID
        
        Returns:
            Medicine instance or None
        """
        try:
            return Medicine.objects.get(id=medicine_id, is_active=True)
        except Medicine.DoesNotExist:
            return None
    
    def get_medicine_details(
        self,
        medicine_id: str,
        language: str = 'en'
    ) -> Optional[Dict[str, Any]]:
        """
        Get full medicine details with alternatives and interactions.
        
        Args:
            medicine_id: Medicine UUID
            language: Language for localized content
        
        Returns:
            Dictionary with medicine details
        """
        medicine = self.get_medicine_by_id(medicine_id)
        
        if not medicine:
            return None
        
        # Get alternatives
        alternatives = self.get_alternatives(medicine_id, limit=5)
        
        # Get interactions
        interactions = self.get_interactions(medicine_id)
        
        return {
            'medicine': medicine,
            'alternatives': alternatives,
            'interactions': interactions,
            'alternatives_count': len(alternatives),
            'interactions_count': len(interactions),
        }
    
    def get_alternatives(
        self,
        medicine_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get generic/alternative medicines.
        
        Args:
            medicine_id: Medicine UUID
            limit: Maximum results
        
        Returns:
            List of alternative medicines with savings info
        """
        try:
            medicine = Medicine.objects.get(id=medicine_id)
        except Medicine.DoesNotExist:
            return []
        
        # Get alternatives from database
        alternatives = MedicineAlternative.objects.filter(
            medicine=medicine
        ).select_related('alternative').order_by(
            '-similarity_score',
            'price_difference_percent'
        )[:limit]
        
        result = []
        for alt in alternatives:
            savings = 0
            if alt.price_difference_percent and alt.price_difference_percent < 0:
                savings = abs(float(alt.price_difference_percent))
            
            result.append({
                'id': str(alt.alternative.id),
                'name': alt.alternative.name,
                'name_generic': alt.alternative.name_generic,
                'manufacturer': alt.alternative.manufacturer,
                'strength': alt.alternative.strength,
                'mrp': float(alt.alternative.mrp) if alt.alternative.mrp else None,
                'original_mrp': float(medicine.mrp) if medicine.mrp else None,
                'similarity_score': alt.similarity_score,
                'savings_percent': savings,
                'is_generic': alt.alternative.is_generic,
                'is_verified': alt.is_verified,
            })
        
        # If no alternatives in database, find by generic name
        if not result and medicine.name_generic:
            generic_alternatives = Medicine.objects.filter(
                is_active=True,
                name_generic__iexact=medicine.name_generic
            ).exclude(id=medicine.id).order_by('mrp')[:limit]
            
            for alt in generic_alternatives:
                savings = 0
                if medicine.mrp and alt.mrp:
                    savings = round(
                        ((float(medicine.mrp) - float(alt.mrp)) / float(medicine.mrp)) * 100,
                        2
                    )
                
                result.append({
                    'id': str(alt.id),
                    'name': alt.name,
                    'name_generic': alt.name_generic,
                    'manufacturer': alt.manufacturer,
                    'strength': alt.strength,
                    'mrp': float(alt.mrp) if alt.mrp else None,
                    'original_mrp': float(medicine.mrp) if medicine.mrp else None,
                    'similarity_score': 100,
                    'savings_percent': max(0, savings),
                    'is_generic': alt.is_generic,
                    'is_verified': False,
                })
        
        return result
    
    def get_interactions(
        self,
        medicine_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get drug interactions for a medicine.
        
        Args:
            medicine_id: Medicine UUID
        
        Returns:
            List of interactions
        """
        interactions = DrugInteraction.objects.filter(
            Q(medicine_1_id=medicine_id) | Q(medicine_2_id=medicine_id)
        ).select_related('medicine_1', 'medicine_2').order_by('-severity')
        
        result = []
        for interaction in interactions:
            # Determine the other medicine
            if str(interaction.medicine_1_id) == medicine_id:
                other_medicine = interaction.medicine_2
            else:
                other_medicine = interaction.medicine_1
            
            result.append({
                'id': str(interaction.id),
                'interacts_with': {
                    'id': str(other_medicine.id),
                    'name': other_medicine.name,
                },
                'severity': interaction.severity,
                'severity_display': interaction.get_severity_display(),
                'description': interaction.description,
                'effect': interaction.effect,
                'recommendation': interaction.recommendation,
                'is_verified': interaction.is_verified,
            })
        
        return result
    
    def check_interactions(
        self,
        medicine_ids: List[str]
    ) -> Dict[str, Any]:
        """
        Check interactions between multiple medicines.
        
        Args:
            medicine_ids: List of medicine UUIDs
        
        Returns:
            Dictionary with interaction results
        """
        if len(medicine_ids) < 2:
            return {
                'has_interactions': False,
                'total_interactions': 0,
                'severe_count': 0,
                'moderate_count': 0,
                'mild_count': 0,
                'interactions': [],
            }
        
        # Find all interactions between the provided medicines
        interactions = DrugInteraction.objects.filter(
            Q(medicine_1_id__in=medicine_ids, medicine_2_id__in=medicine_ids)
        ).select_related('medicine_1', 'medicine_2').order_by('-severity')
        
        severe_count = 0
        moderate_count = 0
        mild_count = 0
        interaction_list = []
        
        for interaction in interactions:
            if interaction.severity == 'severe' or interaction.severity == 'contraindicated':
                severe_count += 1
            elif interaction.severity == 'moderate':
                moderate_count += 1
            else:
                mild_count += 1
            
            interaction_list.append({
                'id': str(interaction.id),
                'medicine_1': {
                    'id': str(interaction.medicine_1.id),
                    'name': interaction.medicine_1.name,
                },
                'medicine_2': {
                    'id': str(interaction.medicine_2.id),
                    'name': interaction.medicine_2.name,
                },
                'severity': interaction.severity,
                'severity_display': interaction.get_severity_display(),
                'description': interaction.description,
                'effect': interaction.effect,
                'recommendation': interaction.recommendation,
            })
        
        return {
            'has_interactions': len(interaction_list) > 0,
            'total_interactions': len(interaction_list),
            'severe_count': severe_count,
            'moderate_count': moderate_count,
            'mild_count': mild_count,
            'interactions': interaction_list,
        }
    
    def get_categories(self) -> List[Dict[str, Any]]:
        """
        Get all medicine categories with counts.
        
        Returns:
            List of categories with counts
        """
        categories = Medicine.objects.filter(
            is_active=True
        ).exclude(
            category=''
        ).values('category').annotate(
            count=Count('id')
        ).order_by('-count')
        
        result = []
        for cat in categories:
            category_name = cat['category'].lower()
            icon = self.CATEGORY_ICONS.get(category_name, '💊')
            
            result.append({
                'category': cat['category'],
                'count': cat['count'],
                'icon': icon,
            })
        
        return result
    
    def get_medicines_by_category(
        self,
        category: str,
        limit: int = 50
    ) -> List[Medicine]:
        """
        Get medicines by category.
        
        Args:
            category: Category name
            limit: Maximum results
        
        Returns:
            List of medicines
        """
        return list(
            Medicine.objects.filter(
                is_active=True,
                category__iexact=category
            ).order_by('name')[:limit]
        )
    
    def get_user_search_history(
        self,
        user,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get user's recent search history.
        
        Args:
            user: User instance
            limit: Maximum results
        
        Returns:
            List of recent searches
        """
        searches = MedicineSearchHistory.objects.filter(
            user=user
        ).order_by('-searched_at')[:limit]
        
        return [
            {
                'id': str(s.id),
                'query': s.search_query,
                'results_count': s.results_count,
                'searched_at': s.searched_at.isoformat(),
            }
            for s in searches
        ]
    
    def get_popular_medicines(self, limit: int = 10) -> List[Medicine]:
        """
        Get popular/frequently searched medicines.
        
        Args:
            limit: Maximum results
        
        Returns:
            List of popular medicines
        """
        # Get most frequently searched medicines from search history
        popular_ids = MedicineSearchHistory.objects.filter(
            medicine_found__isnull=False
        ).values('medicine_found').annotate(
            search_count=Count('id')
        ).order_by('-search_count')[:limit]
        
        medicine_ids = [p['medicine_found'] for p in popular_ids]
        
        if medicine_ids:
            return list(
                Medicine.objects.filter(
                    id__in=medicine_ids,
                    is_active=True
                )
            )
        
        # Fallback: return verified medicines
        return list(
            Medicine.objects.filter(
                is_active=True,
                is_verified=True
            ).order_by('name')[:limit]
        )
    
    def get_medicine_types(self) -> List[Dict[str, str]]:
        """
        Get all medicine types.
        
        Returns:
            List of medicine types
        """
        return [
            {'code': code, 'name': name}
            for code, name in Medicine.MEDICINE_TYPES
        ]