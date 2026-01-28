"""
Location Service for MediConnect Emergency App.

Handles:
- Finding nearby emergency services
- Distance calculations
- Location caching
- Reverse geocoding (basic)
"""

import logging
from typing import Optional, Dict, Any, List
from decimal import Decimal
from math import radians, sin, cos, sqrt, atan2
from django.utils import timezone
from django.db.models import Q

from ..models import (
    EmergencyService,
    UserLocationCache,
    EmergencyHelpline,
)

logger = logging.getLogger(__name__)


class LocationService:
    """Service for location-based operations."""
    
    # Earth's radius in kilometers
    EARTH_RADIUS_KM = 6371
    
    def haversine_distance(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """
        Calculate the great circle distance between two points.
        
        Args:
            lat1, lon1: First point coordinates
            lat2, lon2: Second point coordinates
        
        Returns:
            Distance in kilometers
        """
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return self.EARTH_RADIUS_KM * c
    
    def get_nearby_services(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 10.0,
        service_type: Optional[str] = None,
        only_24x7: bool = False,
        only_government: bool = False,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Find nearby emergency services.
        
        Args:
            latitude: User's latitude
            longitude: User's longitude
            radius_km: Search radius in kilometers
            service_type: Filter by service type
            only_24x7: Only show 24/7 services
            only_government: Only show government services
            limit: Maximum number of results
        
        Returns:
            List of service dictionaries with distance
        """
        # Build base queryset
        queryset = EmergencyService.objects.filter(
            is_active=True,
            latitude__isnull=False,
            longitude__isnull=False
        )
        
        # Apply filters
        if service_type:
            queryset = queryset.filter(service_type=service_type)
        
        if only_24x7:
            queryset = queryset.filter(is_24x7=True)
        
        if only_government:
            queryset = queryset.filter(is_government=True)
        
        # Get all services and calculate distance
        services_with_distance = []
        
        for service in queryset:
            try:
                distance = self.haversine_distance(
                    latitude, longitude,
                    float(service.latitude), float(service.longitude)
                )
                
                if distance <= radius_km:
                    services_with_distance.append({
                        'id': str(service.id),
                        'name': service.name,
                        'name_local': service.name_local,
                        'service_type': service.service_type,
                        'service_type_display': service.get_service_type_display(),
                        'phone_primary': service.phone_primary,
                        'phone_emergency': service.phone_emergency,
                        'address': service.address,
                        'landmark': service.landmark,
                        'district': service.district,
                        'latitude': float(service.latitude),
                        'longitude': float(service.longitude),
                        'distance_km': round(distance, 2),
                        'is_24x7': service.is_24x7,
                        'has_emergency_ward': service.has_emergency_ward,
                        'has_ambulance': service.has_ambulance,
                        'is_government': service.is_government,
                        'is_verified': service.is_verified,
                    })
            except (ValueError, TypeError) as e:
                logger.warning(f"Error calculating distance for service {service.id}: {e}")
                continue
        
        # Sort by distance
        services_with_distance.sort(key=lambda x: x['distance_km'])
        
        return services_with_distance[:limit]
    
    def get_nearby_hospitals(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 10.0,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get nearby hospitals and clinics."""
        return self.get_nearby_services(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            service_type=None,  # Include hospital, clinic, phc
            limit=limit
        )
    
    def get_nearby_ambulances(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 20.0,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get nearby ambulance services."""
        return self.get_nearby_services(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            service_type='ambulance',
            limit=limit
        )
    
    def update_user_location(
        self,
        user,
        latitude: float,
        longitude: float,
        accuracy: Optional[float] = None,
        address: str = ''
    ) -> UserLocationCache:
        """
        Update user's cached location.
        
        Args:
            user: The user
            latitude: GPS latitude
            longitude: GPS longitude
            accuracy: GPS accuracy in meters
            address: Reverse geocoded address
        
        Returns:
            Updated UserLocationCache
        """
        cache, created = UserLocationCache.objects.get_or_create(user=user)
        
        cache.latitude = Decimal(str(latitude))
        cache.longitude = Decimal(str(longitude))
        cache.accuracy = accuracy
        
        if address:
            cache.address = address
        
        cache.save()
        
        logger.info(f"Location updated for user {user.id}: {latitude}, {longitude}")
        
        # Update nearby services cache asynchronously (or inline for simplicity)
        self._update_nearby_cache(cache)
        
        return cache
    
    def _update_nearby_cache(self, location_cache: UserLocationCache):
        """Update cached nearby services."""
        if not location_cache.latitude or not location_cache.longitude:
            return
        
        try:
            # Get nearby hospitals
            hospitals = self.get_nearby_services(
                latitude=float(location_cache.latitude),
                longitude=float(location_cache.longitude),
                radius_km=15,
                limit=10
            )
            location_cache.nearby_hospitals = [h['id'] for h in hospitals]
            
            # Get nearby ambulances
            ambulances = self.get_nearby_ambulances(
                latitude=float(location_cache.latitude),
                longitude=float(location_cache.longitude),
                radius_km=25,
                limit=5
            )
            location_cache.nearby_ambulances = [a['id'] for a in ambulances]
            
            location_cache.nearby_updated_at = timezone.now()
            location_cache.save()
            
            logger.info(f"Nearby cache updated for user {location_cache.user.id}")
        except Exception as e:
            logger.error(f"Error updating nearby cache: {e}")
    
    def get_user_location(self, user) -> Optional[Dict[str, Any]]:
        """
        Get user's cached location.
        
        Returns:
            Dictionary with location data or None
        """
        try:
            cache = UserLocationCache.objects.get(user=user)
            return {
                'latitude': float(cache.latitude) if cache.latitude else None,
                'longitude': float(cache.longitude) if cache.longitude else None,
                'accuracy': cache.accuracy,
                'address': cache.address,
                'district': cache.district,
                'state': cache.state,
                'pincode': cache.pincode,
                'updated_at': cache.location_updated_at.isoformat() if cache.location_updated_at else None,
            }
        except UserLocationCache.DoesNotExist:
            return None
    
    def reverse_geocode(self, latitude: float, longitude: float) -> str:
        """
        Get address from coordinates.
        
        Note: This is a basic implementation. 
        For production, consider using a geocoding service.
        
        Args:
            latitude: GPS latitude
            longitude: GPS longitude
        
        Returns:
            Address string (may be empty)
        """
        # Basic implementation - find nearest known service address
        try:
            nearest = EmergencyService.objects.filter(
                is_active=True,
                latitude__isnull=False,
                longitude__isnull=False
            ).first()
            
            if nearest:
                distance = self.haversine_distance(
                    latitude, longitude,
                    float(nearest.latitude), float(nearest.longitude)
                )
                
                if distance < 5:  # Within 5km
                    return f"Near {nearest.name}, {nearest.district}"
            
            return f"Lat: {latitude:.4f}, Lng: {longitude:.4f}"
        except Exception as e:
            logger.error(f"Reverse geocode error: {e}")
            return f"Lat: {latitude:.4f}, Lng: {longitude:.4f}"
    
    def get_services_by_district(
        self,
        district: str,
        service_type: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get services in a district.
        
        Args:
            district: District name
            service_type: Optional filter
            limit: Maximum results
        
        Returns:
            List of service dictionaries
        """
        queryset = EmergencyService.objects.filter(
            is_active=True,
            district__icontains=district
        )
        
        if service_type:
            queryset = queryset.filter(service_type=service_type)
        
        services = []
        for service in queryset[:limit]:
            services.append({
                'id': str(service.id),
                'name': service.name,
                'name_local': service.name_local,
                'service_type': service.service_type,
                'service_type_display': service.get_service_type_display(),
                'phone_primary': service.phone_primary,
                'phone_emergency': service.phone_emergency,
                'address': service.address,
                'landmark': service.landmark,
                'is_24x7': service.is_24x7,
                'has_emergency_ward': service.has_emergency_ward,
                'is_government': service.is_government,
            })
        
        return services
    
    def get_helplines(
        self,
        state: Optional[str] = None,
        helpline_type: Optional[str] = None,
        language: str = 'en'
    ) -> List[Dict[str, Any]]:
        """
        Get emergency helplines.
        
        Args:
            state: Filter by state (also includes national)
            helpline_type: Filter by type
            language: Language for names
        
        Returns:
            List of helpline dictionaries
        """
        queryset = EmergencyHelpline.objects.filter(is_active=True)
        
        if state:
            # Fixed: Using Q from django.db.models (imported at top)
            queryset = queryset.filter(
                Q(is_national=True) | Q(state__icontains=state)
            )
        
        if helpline_type:
            queryset = queryset.filter(helpline_type=helpline_type)
        
        helplines = []
        for helpline in queryset.order_by('display_order'):
            helplines.append({
                'id': str(helpline.id),
                'name': helpline.get_name(language),
                'name_en': helpline.name_en,
                'helpline_type': helpline.helpline_type,
                'helpline_type_display': helpline.get_helpline_type_display(),
                'number': helpline.number,
                'alternate_number': helpline.alternate_number,
                'is_national': helpline.is_national,
                'state': helpline.state,
                'is_24x7': helpline.is_24x7,
                'is_toll_free': helpline.is_toll_free,
            })
        
        return helplines
    
    def get_quick_sos_data(self, user, language: str = 'en') -> Dict[str, Any]:
        """
        Get all data needed for SOS screen in one call.
        
        Args:
            user: The user
            language: Language code
        
        Returns:
            Dictionary with all SOS screen data
        """
        from ..models import EmergencyContact, SOSAlert
        
        # Get user's location
        location = self.get_user_location(user)
        
        # Get emergency contacts
        contacts = list(
            EmergencyContact.objects.filter(
                user=user,
                is_active=True
            ).order_by('priority').values(
                'id', 'name', 'phone_number', 'relationship', 'priority'
            )[:5]
        )
        
        # Convert UUID to string for JSON serialization
        for contact in contacts:
            contact['id'] = str(contact['id'])
        
        # Get nearby services if location available
        nearby_hospitals = []
        nearby_ambulances = []
        
        if location and location.get('latitude') and location.get('longitude'):
            nearby_hospitals = self.get_nearby_hospitals(
                location['latitude'],
                location['longitude'],
                radius_km=15,
                limit=5
            )
            nearby_ambulances = self.get_nearby_ambulances(
                location['latitude'],
                location['longitude'],
                radius_km=25,
                limit=3
            )
        
        # Get helplines
        helplines = self.get_helplines(language=language)[:10]
        
        # Get active SOS if any
        active_sos = SOSAlert.objects.filter(
            user=user,
            status__in=['triggered', 'notifying', 'acknowledged', 'responding']
        ).first()
        
        active_sos_data = None
        if active_sos:
            active_sos_data = {
                'id': str(active_sos.id),
                'emergency_type': active_sos.emergency_type,
                'status': active_sos.status,
                'created_at': active_sos.created_at.isoformat(),
            }
        
        return {
            'emergency_contacts': contacts,
            'nearby_hospitals': nearby_hospitals,
            'nearby_ambulances': nearby_ambulances,
            'helplines': helplines,
            'last_location': location,
            'active_sos': active_sos_data,
        }