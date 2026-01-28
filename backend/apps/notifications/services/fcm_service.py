"""
Firebase Cloud Messaging (FCM) Service
======================================
Handles sending push notifications via Firebase.
This service is FREE - Firebase FCM has no usage limits.
"""

import os
import json
import logging
from typing import Optional, Dict, List, Any, Tuple
from dataclasses import dataclass
from pathlib import Path
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from ..config import FIREBASE_CONFIG, FCM_CONFIG
from ..constants import NotificationPriority

logger = logging.getLogger(__name__)

# Try to import Firebase Admin SDK
try:
    import firebase_admin
    from firebase_admin import credentials, messaging
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    logger.warning("Firebase Admin SDK not installed. Run: pip install firebase-admin")


@dataclass
class FCMResult:
    """Result of an FCM send operation."""
    success: bool
    message_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class FCMBatchResult:
    """Result of a batch FCM send operation."""
    success_count: int
    failure_count: int
    results: List[FCMResult]


class FCMService:
    """
    Firebase Cloud Messaging service for sending push notifications.
    
    Features:
    - Send to single device
    - Send to multiple devices (batch)
    - Send to topic
    - Support for Android, iOS, and Web
    - Automatic token cleanup on invalid tokens
    
    Usage:
        fcm = get_fcm_service()
        if fcm.is_configured:
            result = fcm.send_to_device(
                token="user_fcm_token",
                title="Hello",
                body="World",
            )
    """
    
    def __init__(self):
        self.is_configured = False
        self.app = None
        self._initialize()
    
    def _initialize(self):
        """Initialize Firebase Admin SDK."""
        if not FIREBASE_AVAILABLE:
            logger.warning("Firebase Admin SDK not available")
            return
        
        # Check if already initialized
        try:
            self.app = firebase_admin.get_app()
            self.is_configured = True
            logger.info("Using existing Firebase app")
            return
        except ValueError:
            pass  # App not initialized yet
        
        # Get credentials path
        cred_path = FIREBASE_CONFIG.get('credentials_path', '')
        
        # Try different paths
        possible_paths = [
            cred_path,
            os.path.join(settings.BASE_DIR, cred_path),
            os.path.join(settings.BASE_DIR, 'firebase-service-account.json'),
            './firebase-service-account.json',
        ]
        
        cred_file = None
        for path in possible_paths:
            if path and os.path.exists(path):
                cred_file = path
                break
        
        if not cred_file:
            logger.warning(
                "Firebase credentials file not found. "
                "Push notifications will not work. "
                "Place firebase-service-account.json in backend/ folder."
            )
            return
        
        try:
            cred = credentials.Certificate(cred_file)
            self.app = firebase_admin.initialize_app(cred)
            self.is_configured = True
            logger.info(f"Firebase initialized from: {cred_file}")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")
            self.is_configured = False
    
    def _build_message(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        priority: str = NotificationPriority.NORMAL,
        image_url: Optional[str] = None,
        action_url: Optional[str] = None,
        icon: Optional[str] = None,
        color: Optional[str] = None,
        ttl: Optional[int] = None,
    ) -> 'messaging.Message':
        """
        Build an FCM message object.
        
        Args:
            token: FCM device token
            title: Notification title
            body: Notification body
            data: Additional data payload
            priority: Notification priority
            image_url: Image URL to display
            action_url: URL to open on tap
            icon: Icon name
            color: Color code
            ttl: Time to live in seconds
            
        Returns:
            FCM Message object
        """
        # Prepare data payload (all values must be strings)
        message_data = {}
        if data:
            message_data = {k: str(v) for k, v in data.items()}
        
        # Add action URL to data
        if action_url:
            message_data['action_url'] = action_url
        
        # Add icon to data for frontend
        if icon:
            message_data['icon'] = icon
        
        # Get TTL based on priority
        if ttl is None:
            ttl = FCM_CONFIG['ttl_by_priority'].get(
                priority,
                FCM_CONFIG['default_ttl']
            )
        
        # Build notification payload
        notification = messaging.Notification(
            title=title,
            body=body,
            image=image_url,
        )
        
        # Android-specific config
        android_config = messaging.AndroidConfig(
            priority='high' if priority in [NotificationPriority.HIGH, NotificationPriority.URGENT] else 'normal',
            ttl=timedelta(seconds=ttl) if ttl else None,
            notification=messaging.AndroidNotification(
                icon=icon or 'ic_notification',
                color=color,
                channel_id=FCM_CONFIG['android']['notification_channel_id'],
                click_action='FLUTTER_NOTIFICATION_CLICK',
            ),
        )
        
        # iOS-specific config (APNS)
        apns_config = messaging.APNSConfig(
            headers={
                'apns-priority': '10' if priority in [NotificationPriority.HIGH, NotificationPriority.URGENT] else '5',
                'apns-expiration': str(int(timezone.now().timestamp()) + ttl) if ttl else None,
            },
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    alert=messaging.ApsAlert(
                        title=title,
                        body=body,
                    ),
                    sound='default',
                    badge=1,
                ),
            ),
        )
        
        # Web push config
        webpush_config = messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title=title,
                body=body,
                icon=icon or '/icons/notification-icon.png',
                badge='/icons/badge-icon.png',
                image=image_url,
            ),
            fcm_options=messaging.WebpushFCMOptions(
                link=action_url,
            ),
        )
        
        # Build the message
        message = messaging.Message(
            notification=notification,
            data=message_data if message_data else None,
            token=token,
            android=android_config,
            apns=apns_config,
            webpush=webpush_config,
        )
        
        return message
    
    def send_to_device(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        priority: str = NotificationPriority.NORMAL,
        image_url: Optional[str] = None,
        action_url: Optional[str] = None,
        icon: Optional[str] = None,
        color: Optional[str] = None,
    ) -> FCMResult:
        """
        Send notification to a single device.
        
        Args:
            token: FCM device token
            title: Notification title
            body: Notification body
            data: Additional data payload
            priority: Notification priority
            image_url: Image URL
            action_url: URL to open on tap
            icon: Icon name
            color: Color code
            
        Returns:
            FCMResult with success status and message ID
        """
        if not self.is_configured:
            return FCMResult(
                success=False,
                error_code='NOT_CONFIGURED',
                error_message='FCM service not configured'
            )
        
        if not token:
            return FCMResult(
                success=False,
                error_code='INVALID_TOKEN',
                error_message='Empty token provided'
            )
        
        try:
            # Import here to avoid issues if Firebase not configured
            from datetime import timedelta
            from django.utils import timezone
            
            message = self._build_message(
                token=token,
                title=title,
                body=body,
                data=data,
                priority=priority,
                image_url=image_url,
                action_url=action_url,
                icon=icon,
                color=color,
            )
            
            # Send the message
            message_id = messaging.send(message)
            
            logger.info(f"FCM sent successfully: {message_id}")
            
            return FCMResult(
                success=True,
                message_id=message_id
            )
            
        except messaging.UnregisteredError:
            logger.warning(f"FCM token unregistered: {token[:20]}...")
            return FCMResult(
                success=False,
                error_code='UNREGISTERED',
                error_message='Token is no longer valid'
            )
        
        except messaging.SenderIdMismatchError:
            logger.error("FCM sender ID mismatch - check Firebase configuration")
            return FCMResult(
                success=False,
                error_code='SENDER_ID_MISMATCH',
                error_message='Sender ID mismatch'
            )
        
        except Exception as e:
            logger.error(f"FCM send error: {e}")
            return FCMResult(
                success=False,
                error_code='UNKNOWN',
                error_message=str(e)
            )
    
    def send_to_multiple_devices(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        priority: str = NotificationPriority.NORMAL,
        image_url: Optional[str] = None,
        action_url: Optional[str] = None,
        icon: Optional[str] = None,
        color: Optional[str] = None,
    ) -> FCMBatchResult:
        """
        Send notification to multiple devices.
        
        Args:
            tokens: List of FCM device tokens
            title: Notification title
            body: Notification body
            data: Additional data payload
            priority: Notification priority
            image_url: Image URL
            action_url: URL to open on tap
            icon: Icon name
            color: Color code
            
        Returns:
            FCMBatchResult with success/failure counts
        """
        if not self.is_configured:
            return FCMBatchResult(
                success_count=0,
                failure_count=len(tokens),
                results=[
                    FCMResult(success=False, error_code='NOT_CONFIGURED')
                    for _ in tokens
                ]
            )
        
        if not tokens:
            return FCMBatchResult(
                success_count=0,
                failure_count=0,
                results=[]
            )
        
        # Remove duplicates and empty tokens
        tokens = list(set(filter(None, tokens)))
        
        if not tokens:
            return FCMBatchResult(
                success_count=0,
                failure_count=0,
                results=[]
            )
        
        try:
            from datetime import timedelta
            from django.utils import timezone
            
            # Build multicast message
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                    image=image_url,
                ),
                data={k: str(v) for k, v in (data or {}).items()},
                tokens=tokens,
                android=messaging.AndroidConfig(
                    priority='high' if priority in [NotificationPriority.HIGH, NotificationPriority.URGENT] else 'normal',
                ),
                webpush=messaging.WebpushConfig(
                    notification=messaging.WebpushNotification(
                        title=title,
                        body=body,
                        icon=icon or '/icons/notification-icon.png',
                    ),
                ),
            )
            
            # Send multicast
            response = messaging.send_each_for_multicast(message)
            
            # Process results
            results = []
            for i, send_response in enumerate(response.responses):
                if send_response.success:
                    results.append(FCMResult(
                        success=True,
                        message_id=send_response.message_id
                    ))
                else:
                    error = send_response.exception
                    results.append(FCMResult(
                        success=False,
                        error_code=type(error).__name__ if error else 'UNKNOWN',
                        error_message=str(error) if error else 'Unknown error'
                    ))
            
            logger.info(
                f"FCM multicast: {response.success_count} success, "
                f"{response.failure_count} failed"
            )
            
            return FCMBatchResult(
                success_count=response.success_count,
                failure_count=response.failure_count,
                results=results
            )
            
        except Exception as e:
            logger.error(f"FCM multicast error: {e}")
            return FCMBatchResult(
                success_count=0,
                failure_count=len(tokens),
                results=[
                    FCMResult(success=False, error_code='UNKNOWN', error_message=str(e))
                    for _ in tokens
                ]
            )
    
    def send_to_topic(
        self,
        topic: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        priority: str = NotificationPriority.NORMAL,
        image_url: Optional[str] = None,
    ) -> FCMResult:
        """
        Send notification to a topic.
        
        Users must be subscribed to the topic to receive.
        
        Args:
            topic: Topic name (e.g., 'health_tips')
            title: Notification title
            body: Notification body
            data: Additional data payload
            priority: Notification priority
            image_url: Image URL
            
        Returns:
            FCMResult with success status
        """
        if not self.is_configured:
            return FCMResult(
                success=False,
                error_code='NOT_CONFIGURED',
                error_message='FCM service not configured'
            )
        
        if not topic:
            return FCMResult(
                success=False,
                error_code='INVALID_TOPIC',
                error_message='Empty topic provided'
            )
        
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                    image=image_url,
                ),
                data={k: str(v) for k, v in (data or {}).items()},
                topic=topic,
                android=messaging.AndroidConfig(
                    priority='high' if priority == NotificationPriority.URGENT else 'normal',
                ),
            )
            
            message_id = messaging.send(message)
            
            logger.info(f"FCM topic message sent: {message_id}")
            
            return FCMResult(
                success=True,
                message_id=message_id
            )
            
        except Exception as e:
            logger.error(f"FCM topic send error: {e}")
            return FCMResult(
                success=False,
                error_code='UNKNOWN',
                error_message=str(e)
            )
    
    def subscribe_to_topic(self, tokens: List[str], topic: str) -> Tuple[int, int]:
        """
        Subscribe devices to a topic.
        
        Args:
            tokens: List of FCM tokens
            topic: Topic name
            
        Returns:
            Tuple of (success_count, failure_count)
        """
        if not self.is_configured or not tokens:
            return (0, len(tokens) if tokens else 0)
        
        try:
            response = messaging.subscribe_to_topic(tokens, topic)
            logger.info(f"Subscribed {response.success_count} devices to {topic}")
            return (response.success_count, response.failure_count)
        except Exception as e:
            logger.error(f"Topic subscribe error: {e}")
            return (0, len(tokens))
    
    def unsubscribe_from_topic(self, tokens: List[str], topic: str) -> Tuple[int, int]:
        """
        Unsubscribe devices from a topic.
        
        Args:
            tokens: List of FCM tokens
            topic: Topic name
            
        Returns:
            Tuple of (success_count, failure_count)
        """
        if not self.is_configured or not tokens:
            return (0, len(tokens) if tokens else 0)
        
        try:
            response = messaging.unsubscribe_from_topic(tokens, topic)
            logger.info(f"Unsubscribed {response.success_count} devices from {topic}")
            return (response.success_count, response.failure_count)
        except Exception as e:
            logger.error(f"Topic unsubscribe error: {e}")
            return (0, len(tokens))


# Singleton instance
_fcm_service: Optional[FCMService] = None


def get_fcm_service() -> FCMService:
    """Get FCM service singleton instance."""
    global _fcm_service
    if _fcm_service is None:
        _fcm_service = FCMService()
    return _fcm_service