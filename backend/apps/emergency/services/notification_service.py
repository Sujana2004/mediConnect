"""
Emergency Notification Service for MediConnect.

Handles sending emergency notifications via:
- Firebase FCM (push notifications)
- In-app notifications

Note: SMS integration would require paid service (avoided per project requirements)
"""

import logging
from typing import Optional, Dict, Any, List
from django.utils import timezone
from django.conf import settings

from ..models import SOSAlert, EmergencyContact

logger = logging.getLogger(__name__)


class EmergencyNotificationService:
    """Service for sending emergency notifications."""
    
    # Notification templates
    SOS_TEMPLATES = {
        'contact_alert': {
            'en': {
                'title': '🆘 EMERGENCY ALERT',
                'body': '{user_name} needs help! Emergency: {emergency_type}. Location: {location}',
            },
            'te': {
                'title': '🆘 అత్యవసర హెచ్చరిక',
                'body': '{user_name} కు సహాయం కావాలి! అత్యవసరం: {emergency_type}. స్థానం: {location}',
            },
            'hi': {
                'title': '🆘 आपातकालीन अलर्ट',
                'body': '{user_name} को मदद चाहिए! आपातकाल: {emergency_type}. स्थान: {location}',
            },
        },
        'sos_acknowledged': {
            'en': {
                'title': '✅ Help is on the way',
                'body': 'Your SOS has been acknowledged by {acknowledged_by}. ETA: {eta} minutes.',
            },
            'te': {
                'title': '✅ సహాయం వస్తోంది',
                'body': 'మీ SOS ను {acknowledged_by} గుర్తించారు. వచ్చే సమయం: {eta} నిమిషాలు.',
            },
            'hi': {
                'title': '✅ मदद आ रही है',
                'body': 'आपके SOS को {acknowledged_by} ने स्वीकार किया। ETA: {eta} मिनट।',
            },
        },
        'sos_cancelled': {
            'en': {
                'title': 'ℹ️ SOS Cancelled',
                'body': '{user_name} has cancelled their emergency alert. Reason: {reason}',
            },
            'te': {
                'title': 'ℹ️ SOS రద్దు చేయబడింది',
                'body': '{user_name} వారి అత్యవసర హెచ్చరికను రద్దు చేసారు. కారణం: {reason}',
            },
            'hi': {
                'title': 'ℹ️ SOS रद्द',
                'body': '{user_name} ने अपना आपातकालीन अलर्ट रद्द कर दिया। कारण: {reason}',
            },
        },
    }
    
    def __init__(self):
        """Initialize notification service."""
        self._fcm_available = self._check_fcm_available()
    
    def _check_fcm_available(self) -> bool:
        """Check if Firebase FCM is configured."""
        try:
            # Check if notifications app is available
            from apps.notifications.services.fcm_service import FCMService
            return True
        except ImportError:
            logger.warning("FCM Service not available")
            return False
    
    def _get_fcm_service(self):
        """Get FCM service instance."""
        if self._fcm_available:
            from apps.notifications.services.fcm_service import FCMService
            return FCMService()
        return None
    
    def _get_user_language(self, user) -> str:
        """Get user's preferred language."""
        try:
            if hasattr(user, 'patient_profile') and user.patient_profile:
                return user.patient_profile.preferred_language or 'en'
            elif hasattr(user, 'doctor_profile') and user.doctor_profile:
                return user.doctor_profile.preferred_language or 'en'
        except Exception:
            pass
        return 'en'
    
    def _get_emergency_type_name(self, emergency_type: str, language: str) -> str:
        """Get localized emergency type name."""
        from .sos_service import SOSService
        names = SOSService.EMERGENCY_TYPE_NAMES.get(emergency_type, {})
        return names.get(language, names.get('en', emergency_type))
    
    def notify_emergency_contact(
        self,
        contact: EmergencyContact,
        sos_alert: SOSAlert
    ) -> bool:
        """
        Notify an emergency contact about SOS alert.
        
        Args:
            contact: Emergency contact to notify
            sos_alert: The SOS alert
        
        Returns:
            True if notification sent successfully
        """
        user = sos_alert.user
        user_name = user.get_full_name() or user.phone_number
        
        # Get location text
        location = sos_alert.location_address
        if not location and sos_alert.latitude and sos_alert.longitude:
            location = f"GPS: {sos_alert.latitude}, {sos_alert.longitude}"
        if not location:
            location = "Unknown location"
        
        # Get emergency type name
        emergency_type_name = self._get_emergency_type_name(
            sos_alert.emergency_type,
            'en'  # Default to English for contacts
        )
        
        # Create notification data
        notification_data = {
            'type': 'sos_alert',
            'sos_id': str(sos_alert.id),
            'user_phone': user.phone_number,
            'latitude': str(sos_alert.latitude) if sos_alert.latitude else '',
            'longitude': str(sos_alert.longitude) if sos_alert.longitude else '',
            'emergency_type': sos_alert.emergency_type,
            'triggered_at': sos_alert.created_at.isoformat(),
        }
        
        # Store in-app notification
        self._store_inapp_notification(
            user=user,
            title=f"SOS sent to {contact.name}",
            body=f"Emergency alert sent to your contact {contact.name}",
            notification_type='sos_sent',
            data=notification_data
        )
        
        # Try to send FCM notification if contact is also a user
        fcm_sent = self._try_fcm_to_contact(contact, sos_alert, notification_data)
        
        logger.info(
            f"Emergency contact {contact.id} notified for SOS {sos_alert.id} "
            f"(FCM: {fcm_sent})"
        )
        
        return True
    
    def _try_fcm_to_contact(
        self,
        contact: EmergencyContact,
        sos_alert: SOSAlert,
        notification_data: Dict[str, Any]
    ) -> bool:
        """
        Try to send FCM notification to contact if they're a user.
        
        Args:
            contact: Emergency contact
            sos_alert: The SOS alert
            notification_data: Additional data
        
        Returns:
            True if FCM sent successfully
        """
        if not self._fcm_available:
            return False
        
        try:
            from apps.users.models import User
            from apps.notifications.models import DeviceToken
            
            # Check if contact phone belongs to a user
            contact_user = User.objects.filter(
                phone_number=contact.phone_number
            ).first()
            
            if not contact_user:
                return False
            
            # Get FCM tokens for contact user
            tokens = DeviceToken.objects.filter(
                user=contact_user,
                is_active=True
            ).values_list('fcm_token', flat=True)
            
            if not tokens:
                return False
            
            # Get language preference
            language = self._get_user_language(contact_user)
            
            # Get template
            template = self.SOS_TEMPLATES['contact_alert'].get(
                language,
                self.SOS_TEMPLATES['contact_alert']['en']
            )
            
            user_name = sos_alert.user.get_full_name() or sos_alert.user.phone_number
            emergency_type_name = self._get_emergency_type_name(
                sos_alert.emergency_type,
                language
            )
            location = sos_alert.location_address or 'Unknown'
            
            title = template['title']
            body = template['body'].format(
                user_name=user_name,
                emergency_type=emergency_type_name,
                location=location
            )
            
            # Send FCM
            fcm_service = self._get_fcm_service()
            if fcm_service:
                for token in tokens:
                    try:
                        fcm_service.send_notification(
                            token=token,
                            title=title,
                            body=body,
                            data=notification_data
                        )
                    except Exception as e:
                        logger.error(f"FCM send error: {e}")
                
                return True
        except Exception as e:
            logger.error(f"Error sending FCM to contact: {e}")
        
        return False
    
    def notify_sos_status_update(
        self,
        sos_alert: SOSAlert,
        old_status: str,
        new_status: str
    ) -> bool:
        """
        Notify user about SOS status update.
        
        Args:
            sos_alert: The SOS alert
            old_status: Previous status
            new_status: New status
        
        Returns:
            True if notification sent
        """
        user = sos_alert.user
        language = self._get_user_language(user)
        
        if new_status == 'acknowledged':
            template = self.SOS_TEMPLATES['sos_acknowledged'].get(
                language,
                self.SOS_TEMPLATES['sos_acknowledged']['en']
            )
            
            acknowledged_by = sos_alert.acknowledged_by or 'Emergency Services'
            eta = sos_alert.responder_eta or 'Unknown'
            
            title = template['title']
            body = template['body'].format(
                acknowledged_by=acknowledged_by,
                eta=eta
            )
        else:
            title = "SOS Update"
            body = f"Your SOS status: {new_status}"
        
        # Store in-app notification
        self._store_inapp_notification(
            user=user,
            title=title,
            body=body,
            notification_type='sos_update',
            data={
                'sos_id': str(sos_alert.id),
                'old_status': old_status,
                'new_status': new_status,
            }
        )
        
        # Send FCM
        self._send_fcm_to_user(user, title, body, {
            'type': 'sos_update',
            'sos_id': str(sos_alert.id),
        })
        
        return True
    
    def notify_sos_cancelled(self, sos_alert: SOSAlert) -> bool:
        """
        Notify contacts that SOS was cancelled.
        
        Args:
            sos_alert: The cancelled SOS alert
        
        Returns:
            True if notifications sent
        """
        # Get contacts that were notified
        contacts = EmergencyContact.objects.filter(
            id__in=sos_alert.contacts_notified
        )
        
        user_name = sos_alert.user.get_full_name() or sos_alert.user.phone_number
        
        # Extract reason from resolution notes
        reason = 'User cancelled'
        if sos_alert.resolution_notes:
            if 'mistake' in sos_alert.resolution_notes.lower():
                reason = 'Triggered by mistake'
            elif 'resolved' in sos_alert.resolution_notes.lower():
                reason = 'Issue resolved'
        
        for contact in contacts:
            try:
                # Try to notify via FCM if contact is a user
                self._try_fcm_cancel_notification(
                    contact, sos_alert, user_name, reason
                )
            except Exception as e:
                logger.error(f"Error notifying contact {contact.id} of cancellation: {e}")
        
        return True
    
    def _try_fcm_cancel_notification(
        self,
        contact: EmergencyContact,
        sos_alert: SOSAlert,
        user_name: str,
        reason: str
    ):
        """Send cancellation notification via FCM if possible."""
        if not self._fcm_available:
            return
        
        try:
            from apps.users.models import User
            from apps.notifications.models import DeviceToken
            
            contact_user = User.objects.filter(
                phone_number=contact.phone_number
            ).first()
            
            if not contact_user:
                return
            
            tokens = DeviceToken.objects.filter(
                user=contact_user,
                is_active=True
            ).values_list('fcm_token', flat=True)
            
            if not tokens:
                return
            
            language = self._get_user_language(contact_user)
            template = self.SOS_TEMPLATES['sos_cancelled'].get(
                language,
                self.SOS_TEMPLATES['sos_cancelled']['en']
            )
            
            title = template['title']
            body = template['body'].format(
                user_name=user_name,
                reason=reason
            )
            
            fcm_service = self._get_fcm_service()
            if fcm_service:
                for token in tokens:
                    try:
                        fcm_service.send_notification(
                            token=token,
                            title=title,
                            body=body,
                            data={
                                'type': 'sos_cancelled',
                                'sos_id': str(sos_alert.id),
                            }
                        )
                    except Exception as e:
                        logger.error(f"FCM cancel notification error: {e}")
        except Exception as e:
            logger.error(f"Error in FCM cancel notification: {e}")
    
    def _store_inapp_notification(
        self,
        user,
        title: str,
        body: str,
        notification_type: str,
        data: Dict[str, Any]
    ):
        """Store in-app notification."""
        try:
            from apps.notifications.models import Notification
            
            Notification.objects.create(
                user=user,
                title=title,
                body=body,
                notification_type=notification_type,
                data=data,
                is_read=False
            )
        except Exception as e:
            logger.error(f"Error storing in-app notification: {e}")
    
    def _send_fcm_to_user(
        self,
        user,
        title: str,
        body: str,
        data: Dict[str, Any]
    ):
        """Send FCM notification to user."""
        if not self._fcm_available:
            return
        
        try:
            from apps.notifications.models import DeviceToken
            
            tokens = DeviceToken.objects.filter(
                user=user,
                is_active=True
            ).values_list('fcm_token', flat=True)
            
            if not tokens:
                return
            
            fcm_service = self._get_fcm_service()
            if fcm_service:
                for token in tokens:
                    try:
                        fcm_service.send_notification(
                            token=token,
                            title=title,
                            body=body,
                            data=data
                        )
                    except Exception as e:
                        logger.error(f"FCM send error: {e}")
        except Exception as e:
            logger.error(f"Error sending FCM to user: {e}")