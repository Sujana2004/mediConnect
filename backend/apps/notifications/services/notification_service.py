"""
Notification Service
====================
Main service for creating and sending notifications.
Handles template rendering, user preferences, and delivery.
"""

import logging
from typing import Optional, Dict, List, Any
from datetime import datetime

from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

from ..models import (
    Notification,
    NotificationTemplate,
    UserNotificationPreference,
    DeviceToken,
    NotificationLog,
    ScheduledNotification,
)
from ..constants import (
    NotificationType,
    NotificationPriority,
    NotificationStatus,
    NotificationChannel,
    NOTIFICATION_ICONS,
    NOTIFICATION_COLORS,
)
from ..utils import (
    format_template,
    should_send_notification,
    get_notification_priority_for_type,
    truncate_text,
)
from .fcm_service import get_fcm_service, FCMResult

logger = logging.getLogger(__name__)
User = get_user_model()


class NotificationService:
    """
    Main notification service.
    
    Handles:
    - Creating notifications from templates
    - Checking user preferences
    - Sending via FCM
    - Storing in-app notifications
    - Logging delivery attempts
    
    Usage:
        service = get_notification_service()
        
        # Send a notification
        notification = service.send_notification(
            user=user,
            notification_type=NotificationType.APPOINTMENT_REMINDER,
            title="Appointment Reminder",
            body="Your appointment is in 1 hour",
            data={"appointment_id": "123"},
        )
        
        # Send from template
        notification = service.send_from_template(
            user=user,
            template_name="appointment_reminder_1hr",
            context={"doctor_name": "Dr. Smith", "time": "10:00 AM"},
        )
    """
    
    def __init__(self):
        self.fcm_service = get_fcm_service()
    
    def _get_or_create_preferences(self, user) -> UserNotificationPreference:
        """Get or create notification preferences for a user."""
        preferences, created = UserNotificationPreference.objects.get_or_create(
            user=user,
            defaults={
                'preferred_language': getattr(user, 'language', 'en') or 'en'
            }
        )
        return preferences
    
    def _get_user_language(self, user) -> str:
        """Get user's preferred language."""
        preferences = self._get_or_create_preferences(user)
        return preferences.preferred_language or 'en'
    
    def _get_active_device_tokens(self, user) -> List[str]:
        """Get all active FCM tokens for a user."""
        tokens = DeviceToken.objects.filter(
            user=user,
            is_active=True
        ).values_list('token', flat=True)
        return list(tokens)
    
    def _log_delivery(
        self,
        notification: Notification,
        channel: str,
        success: bool,
        device_token: Optional[DeviceToken] = None,
        fcm_message_id: Optional[str] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
    ):
        """Log a notification delivery attempt."""
        NotificationLog.objects.create(
            notification=notification,
            channel=channel,
            device_token=device_token,
            success=success,
            fcm_message_id=fcm_message_id or '',
            error_code=error_code or '',
            error_message=error_message or '',
        )
    
    def send_notification(
        self,
        user,
        notification_type: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        priority: Optional[str] = None,
        action_url: Optional[str] = None,
        image_url: Optional[str] = None,
        icon: Optional[str] = None,
        color: Optional[str] = None,
        channels: Optional[List[str]] = None,
        scheduled_at: Optional[datetime] = None,
        related_object_type: Optional[str] = None,
        related_object_id: Optional[str] = None,
        group_key: Optional[str] = None,
        skip_preferences_check: bool = False,
    ) -> Optional[Notification]:
        """
        Send a notification to a user.
        
        Args:
            user: User to send to
            notification_type: Type of notification
            title: Notification title
            body: Notification body
            data: Additional data payload
            priority: Notification priority (auto-determined if not provided)
            action_url: URL to open on tap
            image_url: Image URL
            icon: Icon name
            color: Color code
            channels: Delivery channels (['push', 'in_app'])
            scheduled_at: When to send (None = immediately)
            related_object_type: Type of related object
            related_object_id: ID of related object
            group_key: Group key for collapsible notifications
            skip_preferences_check: Skip user preference checks
            
        Returns:
            Created Notification instance, or None if blocked
        """
        # Get user preferences
        preferences = self._get_or_create_preferences(user)
        
        # Determine priority
        if not priority:
            priority = get_notification_priority_for_type(notification_type)
        
        # Check if notification should be sent
        if not skip_preferences_check:
            if not should_send_notification(preferences, notification_type, priority):
                logger.debug(
                    f"Notification blocked by preferences: {notification_type} for user {user.id}"
                )
                return None
        
        # Default channels
        if not channels:
            channels = [NotificationChannel.PUSH, NotificationChannel.IN_APP]
        
        # Get defaults from notification type
        if not icon:
            icon = NOTIFICATION_ICONS.get(notification_type, 'bell')
        if not color:
            color = NOTIFICATION_COLORS.get(notification_type, '#607D8B')
        
        # Create notification record
        with transaction.atomic():
            notification = Notification.objects.create(
                user=user,
                notification_type=notification_type,
                title=truncate_text(title, 100),
                body=truncate_text(body, 500),
                priority=priority,
                status=NotificationStatus.PENDING if not scheduled_at else NotificationStatus.PENDING,
                channels=channels,
                action_url=action_url or '',
                data=data or {},
                icon=icon,
                color=color,
                image_url=image_url or '',
                scheduled_at=scheduled_at,
                related_object_type=related_object_type or '',
                related_object_id=related_object_id or '',
                group_key=group_key or '',
            )
        
        # If scheduled for later, don't send now
        if scheduled_at and scheduled_at > timezone.now():
            logger.info(f"Notification {notification.id} scheduled for {scheduled_at}")
            return notification
        
        # Send immediately
        self._deliver_notification(notification, preferences)
        
        return notification
    
    def send_from_template(
        self,
        user,
        template_name: str,
        context: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        action_url: Optional[str] = None,
        scheduled_at: Optional[datetime] = None,
        related_object_type: Optional[str] = None,
        related_object_id: Optional[str] = None,
    ) -> Optional[Notification]:
        """
        Send notification using a template.
        
        Args:
            user: User to send to
            template_name: Name of the template
            context: Variables to substitute in template
            data: Additional data payload
            action_url: Override template action URL
            scheduled_at: When to send
            related_object_type: Type of related object
            related_object_id: ID of related object
            
        Returns:
            Created Notification instance, or None
        """
        try:
            template = NotificationTemplate.objects.get(
                name=template_name,
                is_active=True
            )
        except NotificationTemplate.DoesNotExist:
            logger.error(f"Notification template not found: {template_name}")
            return None
        
        # Get user's language
        language = self._get_user_language(user)
        
        # Format title and body with context
        title = format_template(template.get_title(language), context or {})
        body = format_template(template.get_body(language), context or {})
        
        # Format action URL
        final_action_url = action_url or template.action_url
        if final_action_url and context:
            final_action_url = format_template(final_action_url, context)
        
        return self.send_notification(
            user=user,
            notification_type=template.notification_type,
            title=title,
            body=body,
            data=data,
            priority=template.priority,
            action_url=final_action_url,
            image_url=template.image_url,
            icon=template.get_icon(),
            color=template.get_color(),
            scheduled_at=scheduled_at,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
        )
    
    def _deliver_notification(
        self,
        notification: Notification,
        preferences: UserNotificationPreference,
    ):
        """
        Deliver a notification through configured channels.
        
        Args:
            notification: Notification to deliver
            preferences: User's notification preferences
        """
        channels = notification.channels
        any_success = False
        
        # Send push notification
        if NotificationChannel.PUSH in channels and preferences.push_enabled:
            success = self._send_push(notification)
            any_success = any_success or success
        
        # In-app notification is always stored (already in database)
        if NotificationChannel.IN_APP in channels:
            any_success = True
        
        # Update status
        if any_success:
            notification.mark_as_sent()
        else:
            notification.mark_as_failed("All delivery channels failed")
    
    def _send_push(self, notification: Notification) -> bool:
        """
        Send push notification via FCM.
        
        Args:
            notification: Notification to send
            
        Returns:
            True if at least one device received the notification
        """
        if not self.fcm_service.is_configured:
            logger.warning("FCM not configured, skipping push notification")
            return False
        
        # Get device tokens
        device_tokens = DeviceToken.objects.filter(
            user=notification.user,
            is_active=True
        )
        
        if not device_tokens.exists():
            logger.debug(f"No active devices for user {notification.user.id}")
            return False
        
        any_success = False
        
        for device_token in device_tokens:
            result = self.fcm_service.send_to_device(
                token=device_token.token,
                title=notification.title,
                body=notification.body,
                data=notification.data,
                priority=notification.priority,
                image_url=notification.image_url or None,
                action_url=notification.action_url or None,
                icon=notification.icon or None,
                color=notification.color or None,
            )
            
            # Log the attempt
            self._log_delivery(
                notification=notification,
                channel=NotificationChannel.PUSH,
                success=result.success,
                device_token=device_token,
                fcm_message_id=result.message_id,
                error_code=result.error_code,
                error_message=result.error_message,
            )
            
            if result.success:
                any_success = True
                device_token.mark_used()
            elif result.error_code == 'UNREGISTERED':
                # Token is invalid, deactivate it
                device_token.deactivate()
                logger.info(f"Deactivated invalid token: {device_token.id}")
        
        return any_success
    
    def send_bulk_notification(
        self,
        users,
        notification_type: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        priority: Optional[str] = None,
    ) -> int:
        """
        Send notification to multiple users.
        
        Args:
            users: Queryset or list of users
            notification_type: Type of notification
            title: Notification title
            body: Notification body
            data: Additional data payload
            priority: Notification priority
            
        Returns:
            Number of notifications sent successfully
        """
        success_count = 0
        
        for user in users:
            notification = self.send_notification(
                user=user,
                notification_type=notification_type,
                title=title,
                body=body,
                data=data,
                priority=priority,
            )
            if notification and notification.status == NotificationStatus.SENT:
                success_count += 1
        
        logger.info(f"Bulk notification sent to {success_count}/{len(list(users))} users")
        return success_count
    
    def get_user_notifications(
        self,
        user,
        unread_only: bool = False,
        notification_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Notification]:
        """
        Get notifications for a user.
        
        Args:
            user: User to get notifications for
            unread_only: Only return unread notifications
            notification_type: Filter by type
            limit: Maximum notifications to return
            offset: Offset for pagination
            
        Returns:
            List of notifications
        """
        queryset = Notification.objects.filter(user=user)
        
        if unread_only:
            queryset = queryset.filter(read_at__isnull=True)
        
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        queryset = queryset.order_by('-created_at')
        
        return list(queryset[offset:offset + limit])
    
    def get_unread_count(self, user) -> int:
        """Get count of unread notifications for a user."""
        return Notification.objects.filter(
            user=user,
            read_at__isnull=True
        ).count()
    
    def mark_as_read(self, notification_id, user) -> bool:
        """
        Mark a notification as read.
        
        Args:
            notification_id: ID of notification
            user: User who owns the notification
            
        Returns:
            True if successful
        """
        try:
            notification = Notification.objects.get(
                id=notification_id,
                user=user
            )
            notification.mark_as_read()
            return True
        except Notification.DoesNotExist:
            return False
    
    def mark_all_as_read(self, user) -> int:
        """
        Mark all notifications as read for a user.
        
        Args:
            user: User to mark notifications for
            
        Returns:
            Number of notifications marked
        """
        count = Notification.objects.filter(
            user=user,
            read_at__isnull=True
        ).update(
            read_at=timezone.now(),
            status=NotificationStatus.READ
        )
        return count
    
    def delete_notification(self, notification_id, user) -> bool:
        """
        Delete a notification.
        
        Args:
            notification_id: ID of notification
            user: User who owns the notification
            
        Returns:
            True if deleted
        """
        try:
            notification = Notification.objects.get(
                id=notification_id,
                user=user
            )
            notification.delete()
            return True
        except Notification.DoesNotExist:
            return False
    
    def clear_old_notifications(self, user, days: int = 30) -> int:
        """
        Clear old read notifications.
        
        Args:
            user: User to clear notifications for
            days: Delete notifications older than this
            
        Returns:
            Number of notifications deleted
        """
        cutoff = timezone.now() - timezone.timedelta(days=days)
        count, _ = Notification.objects.filter(
            user=user,
            read_at__isnull=False,
            created_at__lt=cutoff
        ).delete()
        return count
    
    def register_device_token(
        self,
        user,
        token: str,
        device_type: str = 'web',
        device_name: str = '',
        device_id: str = '',
    ) -> DeviceToken:
        """
        Register or update a device token for push notifications.
        
        Args:
            user: User to register token for
            token: FCM token
            device_type: Type of device (android, ios, web)
            device_name: User-friendly device name
            device_id: Unique device identifier
            
        Returns:
            DeviceToken instance
        """
        from ..utils import clean_fcm_token
        
        token = clean_fcm_token(token)
        if not token:
            raise ValueError("Invalid FCM token")
        
        # Check if token exists for another user (shouldn't happen normally)
        existing = DeviceToken.objects.filter(token=token).exclude(user=user).first()
        if existing:
            existing.delete()
            logger.warning(f"Deleted duplicate token from user {existing.user.id}")
        
        # Update or create token
        device_token, created = DeviceToken.objects.update_or_create(
            token=token,
            defaults={
                'user': user,
                'device_type': device_type,
                'device_name': device_name,
                'device_id': device_id,
                'is_active': True,
            }
        )
        
        action = "Registered new" if created else "Updated"
        logger.info(f"{action} device token for user {user.id}")
        
        # Ensure user preferences exist
        self._get_or_create_preferences(user)
        
        return device_token
    
    def unregister_device_token(self, user, token: str) -> bool:
        """
        Unregister a device token.
        
        Args:
            user: User to unregister token for
            token: FCM token
            
        Returns:
            True if token was found and deleted
        """
        count, _ = DeviceToken.objects.filter(
            user=user,
            token=token
        ).delete()
        return count > 0


# Singleton instance
_notification_service: Optional[NotificationService] = None


def get_notification_service() -> NotificationService:
    """Get notification service singleton instance."""
    global _notification_service
    if _notification_service is None:
        _notification_service = NotificationService()
    return _notification_service