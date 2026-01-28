"""
SOS Service for MediConnect Emergency App.

Handles:
- Creating SOS alerts
- Notifying emergency contacts
- Tracking SOS status
- Cancelling/resolving SOS
"""

import logging
from typing import Optional, Dict, Any, List, Tuple
from django.utils import timezone
from django.db import transaction

from ..models import (
    SOSAlert,
    EmergencyContact,
    EmergencyService,
    UserLocationCache,
)
from .location_service import LocationService
from .notification_service import EmergencyNotificationService

logger = logging.getLogger(__name__)


class SOSService:
    """Service for handling SOS emergency alerts."""
    
    # Emergency type icons for UI
    EMERGENCY_TYPE_ICONS = {
        'medical': '🏥',
        'accident': '🚗',
        'heart': '❤️',
        'breathing': '🫁',
        'unconscious': '😵',
        'bleeding': '🩸',
        'burn': '🔥',
        'poison': '☠️',
        'snake_bite': '🐍',
        'pregnancy': '🤰',
        'child': '👶',
        'other': '🆘',
    }
    
    # Emergency type names in multiple languages
    EMERGENCY_TYPE_NAMES = {
        'medical': {
            'en': 'Medical Emergency',
            'te': 'వైద్య అత్యవసర పరిస్థితి',
            'hi': 'चिकित्सा आपातकाल',
        },
        'accident': {
            'en': 'Accident',
            'te': 'ప్రమాదం',
            'hi': 'दुर्घटना',
        },
        'heart': {
            'en': 'Heart Attack / Chest Pain',
            'te': 'గుండెపోటు / ఛాతీ నొప్పి',
            'hi': 'दिल का दौरा / सीने में दर्द',
        },
        'breathing': {
            'en': 'Breathing Difficulty',
            'te': 'శ్వాస తీసుకోవడంలో ఇబ్బంది',
            'hi': 'सांस लेने में कठिनाई',
        },
        'unconscious': {
            'en': 'Person Unconscious',
            'te': 'వ్యక్తి స్పృహలో లేడు',
            'hi': 'व्यक्ति बेहोश',
        },
        'bleeding': {
            'en': 'Severe Bleeding',
            'te': 'తీవ్రమైన రక్తస్రావం',
            'hi': 'गंभीर रक्तस्राव',
        },
        'burn': {
            'en': 'Burn Injury',
            'te': 'కాలిన గాయం',
            'hi': 'जलने की चोट',
        },
        'poison': {
            'en': 'Poisoning',
            'te': 'విషప్రయోగం',
            'hi': 'विषाक्तता',
        },
        'snake_bite': {
            'en': 'Snake Bite',
            'te': 'పాము కాటు',
            'hi': 'सांप का काटना',
        },
        'pregnancy': {
            'en': 'Pregnancy Emergency',
            'te': 'గర్భధారణ అత్యవసర పరిస్థితి',
            'hi': 'गर्भावस्था आपातकाल',
        },
        'child': {
            'en': 'Child Emergency',
            'te': 'పిల్లల అత్యవసర పరిస్థితి',
            'hi': 'बच्चे की आपात स्थिति',
        },
        'other': {
            'en': 'Other Emergency',
            'te': 'ఇతర అత్యవసర పరిస్థితి',
            'hi': 'अन्य आपातकाल',
        },
    }
    
    def __init__(self):
        """Initialize SOS service."""
        self.location_service = LocationService()
        self.notification_service = EmergencyNotificationService()
    
    @transaction.atomic
    def trigger_sos(
        self,
        user,
        emergency_type: str = 'medical',
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location_accuracy: Optional[float] = None,
        description: str = '',
        use_cached_location: bool = True
    ) -> Tuple[SOSAlert, Dict[str, Any]]:
        """
        Trigger a new SOS alert.
        
        Args:
            user: The user triggering SOS
            emergency_type: Type of emergency
            latitude: GPS latitude
            longitude: GPS longitude
            location_accuracy: GPS accuracy in meters
            description: Additional description
            use_cached_location: Use cached location if current not available
        
        Returns:
            Tuple of (SOSAlert instance, response data)
        """
        logger.info(f"SOS triggered by user {user.id} - Type: {emergency_type}")
        
        # Check for active SOS (prevent duplicates)
        active_sos = self.get_active_sos(user)
        if active_sos:
            logger.warning(f"User {user.id} already has active SOS: {active_sos.id}")
            return active_sos, {
                'is_new': False,
                'message': 'You already have an active SOS alert',
                'sos_id': str(active_sos.id),
            }
        
        # Get location
        final_lat = latitude
        final_lng = longitude
        location_address = ''
        
        # If no current location, try cached
        if not final_lat and use_cached_location:
            cached = self._get_cached_location(user)
            if cached:
                final_lat = cached.get('latitude')
                final_lng = cached.get('longitude')
                location_address = cached.get('address', '')
                logger.info(f"Using cached location for user {user.id}")
        
        # Reverse geocode if we have coordinates but no address
        if final_lat and final_lng and not location_address:
            location_address = self.location_service.reverse_geocode(
                float(final_lat), float(final_lng)
            )
        
        # Create SOS alert
        sos_alert = SOSAlert.objects.create(
            user=user,
            emergency_type=emergency_type,
            status='triggered',
            latitude=final_lat,
            longitude=final_lng,
            location_accuracy=location_accuracy,
            location_address=location_address,
            description=description,
        )
        
        logger.info(f"SOS alert created: {sos_alert.id}")
        
        # Start notification process
        notification_result = self._notify_contacts_and_services(sos_alert)
        
        # Update SOS with notification info
        sos_alert.status = 'notifying'
        sos_alert.contacts_notified = notification_result.get('contacts_notified', [])
        sos_alert.services_notified = notification_result.get('services_notified', [])
        sos_alert.notification_sent_at = timezone.now()
        sos_alert.save()
        
        # Get nearby services for response
        nearby_services = []
        if final_lat and final_lng:
            nearby_services = self.location_service.get_nearby_services(
                float(final_lat),
                float(final_lng),
                radius_km=10,
                limit=5
            )
        
        return sos_alert, {
            'is_new': True,
            'message': 'SOS alert triggered successfully',
            'sos_id': str(sos_alert.id),
            'contacts_notified': len(notification_result.get('contacts_notified', [])),
            'nearby_hospitals': nearby_services,
        }
    
    def _notify_contacts_and_services(self, sos_alert: SOSAlert) -> Dict[str, Any]:
        """
        Notify emergency contacts and services about SOS.
        
        Args:
            sos_alert: The SOS alert to notify about
        
        Returns:
            Dictionary with notification results
        """
        result = {
            'contacts_notified': [],
            'services_notified': [],
            'errors': [],
        }
        
        # Get user's emergency contacts
        contacts = EmergencyContact.objects.filter(
            user=sos_alert.user,
            is_active=True,
            notify_on_sos=True
        ).order_by('priority')
        
        # Notify each contact
        for contact in contacts:
            try:
                success = self.notification_service.notify_emergency_contact(
                    contact=contact,
                    sos_alert=sos_alert
                )
                if success:
                    result['contacts_notified'].append(str(contact.id))
            except Exception as e:
                logger.error(f"Failed to notify contact {contact.id}: {e}")
                result['errors'].append({
                    'contact_id': str(contact.id),
                    'error': str(e)
                })
        
        logger.info(
            f"Notified {len(result['contacts_notified'])} contacts for SOS {sos_alert.id}"
        )
        
        return result
    
    def _get_cached_location(self, user) -> Optional[Dict[str, Any]]:
        """Get cached location for user."""
        try:
            cache = UserLocationCache.objects.get(user=user)
            if cache.latitude and cache.longitude:
                return {
                    'latitude': cache.latitude,
                    'longitude': cache.longitude,
                    'address': cache.address,
                }
        except UserLocationCache.DoesNotExist:
            pass
        return None
    
    def get_active_sos(self, user) -> Optional[SOSAlert]:
        """
        Get active SOS alert for user.
        
        Active means not resolved, cancelled, or marked as false alarm.
        """
        active_statuses = ['triggered', 'notifying', 'acknowledged', 'responding']
        return SOSAlert.objects.filter(
            user=user,
            status__in=active_statuses
        ).first()
    
    def get_sos_by_id(self, sos_id: str, user=None) -> Optional[SOSAlert]:
        """
        Get SOS alert by ID.
        
        If user is provided, only return if owned by user.
        """
        try:
            sos = SOSAlert.objects.get(id=sos_id)
            if user and sos.user != user:
                return None
            return sos
        except SOSAlert.DoesNotExist:
            return None
    
    @transaction.atomic
    def update_sos_status(
        self,
        sos_alert: SOSAlert,
        new_status: str,
        acknowledged_by: str = '',
        responder_eta: Optional[int] = None,
        resolution_notes: str = ''
    ) -> SOSAlert:
        """
        Update SOS alert status.
        
        Args:
            sos_alert: The SOS alert to update
            new_status: New status value
            acknowledged_by: Name of person acknowledging
            responder_eta: ETA in minutes
            resolution_notes: Notes for resolution
        
        Returns:
            Updated SOSAlert
        """
        old_status = sos_alert.status
        sos_alert.status = new_status
        
        if new_status == 'acknowledged' and not sos_alert.acknowledged_at:
            sos_alert.acknowledged_at = timezone.now()
            if acknowledged_by:
                sos_alert.acknowledged_by = acknowledged_by
        
        if responder_eta is not None:
            sos_alert.responder_eta = responder_eta
        
        if new_status in ['resolved', 'cancelled', 'false_alarm']:
            sos_alert.resolved_at = timezone.now()
            if resolution_notes:
                sos_alert.resolution_notes = resolution_notes
        
        sos_alert.save()
        
        logger.info(
            f"SOS {sos_alert.id} status updated: {old_status} -> {new_status}"
        )
        
        # Notify user about status change if not user-initiated
        if new_status in ['acknowledged', 'responding']:
            self.notification_service.notify_sos_status_update(
                sos_alert=sos_alert,
                old_status=old_status,
                new_status=new_status
            )
        
        return sos_alert
    
    @transaction.atomic
    def cancel_sos(
        self,
        sos_alert: SOSAlert,
        reason: str,
        notes: str = ''
    ) -> SOSAlert:
        """
        Cancel an active SOS alert.
        
        Args:
            sos_alert: The SOS alert to cancel
            reason: Reason for cancellation
            notes: Additional notes
        
        Returns:
            Updated SOSAlert
        """
        if sos_alert.status in ['resolved', 'cancelled', 'false_alarm']:
            logger.warning(f"Cannot cancel SOS {sos_alert.id} - already {sos_alert.status}")
            return sos_alert
        
        resolution_notes = f"Cancelled: {reason}"
        if notes:
            resolution_notes += f"\nNotes: {notes}"
        
        sos_alert.status = 'cancelled'
        sos_alert.resolved_at = timezone.now()
        sos_alert.resolution_notes = resolution_notes
        sos_alert.save()
        
        logger.info(f"SOS {sos_alert.id} cancelled - Reason: {reason}")
        
        # Notify contacts about cancellation
        self.notification_service.notify_sos_cancelled(sos_alert)
        
        return sos_alert
    
    def get_user_sos_history(
        self,
        user,
        limit: int = 20,
        include_active: bool = True
    ) -> List[SOSAlert]:
        """
        Get SOS history for user.
        
        Args:
            user: The user
            limit: Maximum number of records
            include_active: Include currently active SOS
        
        Returns:
            List of SOSAlert objects
        """
        queryset = SOSAlert.objects.filter(user=user)
        
        if not include_active:
            queryset = queryset.exclude(
                status__in=['triggered', 'notifying', 'acknowledged', 'responding']
            )
        
        return list(queryset.order_by('-created_at')[:limit])
    
    def get_emergency_types(self, language: str = 'en') -> List[Dict[str, Any]]:
        """
        Get list of emergency types with translations.
        
        Args:
            language: Language code (en, te, hi)
        
        Returns:
            List of emergency type dictionaries
        """
        types = []
        for code, names in self.EMERGENCY_TYPE_NAMES.items():
            types.append({
                'code': code,
                'name': names.get(language, names['en']),
                'name_en': names['en'],
                'name_te': names.get('te', names['en']),
                'name_hi': names.get('hi', names['en']),
                'icon': self.EMERGENCY_TYPE_ICONS.get(code, '🆘'),
            })
        return types
    
    def get_sos_statistics(self, user) -> Dict[str, Any]:
        """
        Get SOS statistics for user.
        
        Returns:
            Dictionary with statistics
        """
        all_sos = SOSAlert.objects.filter(user=user)
        
        return {
            'total_sos': all_sos.count(),
            'resolved': all_sos.filter(status='resolved').count(),
            'cancelled': all_sos.filter(status='cancelled').count(),
            'false_alarms': all_sos.filter(status='false_alarm').count(),
            'active': all_sos.filter(
                status__in=['triggered', 'notifying', 'acknowledged', 'responding']
            ).count(),
        }