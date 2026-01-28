from django.shortcuts import render

"""
Notification Views
==================
API views for notification management.
"""

import logging
from datetime import timedelta

from django.utils import timezone
from django.db.models import Count
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import (
    Notification,
    NotificationTemplate,
    UserNotificationPreference,
    DeviceToken,
    ScheduledNotification,
)
from .serializers import (
    RegisterDeviceTokenSerializer,
    DeviceTokenSerializer,
    UnregisterDeviceTokenSerializer,
    NotificationPreferenceSerializer,
    UpdatePreferenceSerializer,
    QuietHoursSerializer,
    NotificationSerializer,
    NotificationListSerializer,
    MarkReadSerializer,
    SendNotificationSerializer,
    SendTemplateNotificationSerializer,
    NotificationTemplateSerializer,
    NotificationTemplateListSerializer,
    ScheduledNotificationSerializer,
    CreateScheduledNotificationSerializer,
    NotificationStatsSerializer,
    NotificationHealthSerializer,
)
from .services import get_notification_service, get_fcm_service
from .constants import NotificationType, NotificationStatus

logger = logging.getLogger(__name__)


# =============================================================================
# PAGINATION
# =============================================================================

class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# =============================================================================
# DEVICE TOKEN ENDPOINTS
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_device_token(request):
    """
    Register an FCM device token for push notifications.
    
    This should be called when:
    - User logs in
    - App starts (to refresh token)
    - FCM token is refreshed by Firebase
    """
    serializer = RegisterDeviceTokenSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service = get_notification_service()
        device_token = service.register_device_token(
            user=request.user,
            token=serializer.validated_data['token'],
            device_type=serializer.validated_data.get('device_type', 'web'),
            device_name=serializer.validated_data.get('device_name', ''),
            device_id=serializer.validated_data.get('device_id', ''),
        )
        
        return Response({
            'success': True,
            'message': 'Device registered successfully',
            'device': DeviceTokenSerializer(device_token).data
        }, status=status.HTTP_201_CREATED)
        
    except ValueError as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error registering device token: {e}")
        return Response({
            'success': False,
            'error': 'Failed to register device'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unregister_device_token(request):
    """
    Unregister an FCM device token.
    
    Should be called when:
    - User logs out
    - User disables notifications for this device
    """
    serializer = UnregisterDeviceTokenSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    service = get_notification_service()
    success = service.unregister_device_token(
        user=request.user,
        token=serializer.validated_data['token']
    )
    
    if success:
        return Response({
            'success': True,
            'message': 'Device unregistered successfully'
        })
    else:
        return Response({
            'success': False,
            'error': 'Device token not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_device_tokens(request):
    """
    List all registered devices for the current user.
    """
    devices = DeviceToken.objects.filter(
        user=request.user,
        is_active=True
    ).order_by('-created_at')
    
    serializer = DeviceTokenSerializer(devices, many=True)
    
    return Response({
        'success': True,
        'devices': serializer.data,
        'count': devices.count()
    })


# =============================================================================
# NOTIFICATION PREFERENCE ENDPOINTS
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_preferences(request):
    """
    Get notification preferences for the current user.
    """
    preferences, created = UserNotificationPreference.objects.get_or_create(
        user=request.user,
        defaults={
            'preferred_language': getattr(request.user, 'language', 'en') or 'en'
        }
    )
    
    serializer = NotificationPreferenceSerializer(preferences)
    
    return Response({
        'success': True,
        'preferences': serializer.data,
        'notification_types': [
            {
                'type': choice[0],
                'name': choice[1],
                'enabled': preferences.is_type_enabled(choice[0]),
                'can_disable': choice[0] not in ['emergency_alert', 'emergency_contact_alert']
            }
            for choice in NotificationType.CHOICES
        ]
    })


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_preferences(request):
    """
    Update notification preferences.
    """
    preferences, _ = UserNotificationPreference.objects.get_or_create(
        user=request.user
    )
    
    serializer = NotificationPreferenceSerializer(
        preferences,
        data=request.data,
        partial=True
    )
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    serializer.save()
    
    return Response({
        'success': True,
        'message': 'Preferences updated successfully',
        'preferences': serializer.data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_type_preference(request):
    """
    Update preference for a specific notification type.
    """
    serializer = UpdatePreferenceSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    preferences, _ = UserNotificationPreference.objects.get_or_create(
        user=request.user
    )
    
    success = preferences.set_type_preference(
        notification_type=serializer.validated_data['notification_type'],
        enabled=serializer.validated_data['enabled']
    )
    
    if success:
        return Response({
            'success': True,
            'message': 'Preference updated successfully'
        })
    else:
        return Response({
            'success': False,
            'error': 'Cannot modify this notification type'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_quiet_hours(request):
    """
    Update quiet hours settings.
    """
    serializer = QuietHoursSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    preferences, _ = UserNotificationPreference.objects.get_or_create(
        user=request.user
    )
    
    preferences.quiet_hours_enabled = serializer.validated_data['enabled']
    
    if 'start_time' in serializer.validated_data:
        preferences.quiet_hours_start = serializer.validated_data['start_time']
    if 'end_time' in serializer.validated_data:
        preferences.quiet_hours_end = serializer.validated_data['end_time']
    
    preferences.save()
    
    return Response({
        'success': True,
        'message': 'Quiet hours updated successfully',
        'quiet_hours': {
            'enabled': preferences.quiet_hours_enabled,
            'start': str(preferences.quiet_hours_start),
            'end': str(preferences.quiet_hours_end),
        }
    })


# =============================================================================
# NOTIFICATION ENDPOINTS
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    """
    Get list of notifications for the current user.
    
    Query parameters:
    - unread_only: true/false
    - type: notification type filter
    - page: page number
    - page_size: items per page (max 100)
    """
    queryset = Notification.objects.filter(user=request.user)
    
    # Filter by unread
    unread_only = request.query_params.get('unread_only', '').lower() == 'true'
    if unread_only:
        queryset = queryset.filter(read_at__isnull=True)
    
    # Filter by type
    notification_type = request.query_params.get('type')
    if notification_type:
        queryset = queryset.filter(notification_type=notification_type)
    
    queryset = queryset.order_by('-created_at')
    
    # Paginate
    paginator = NotificationPagination()
    page = paginator.paginate_queryset(queryset, request)
    
    serializer = NotificationListSerializer(page, many=True)
    
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notification(request, notification_id):
    """
    Get details of a specific notification.
    """
    try:
        notification = Notification.objects.get(
            id=notification_id,
            user=request.user
        )
    except Notification.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Notification not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = NotificationSerializer(notification)
    
    return Response({
        'success': True,
        'notification': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unread_count(request):
    """
    Get count of unread notifications.
    """
    service = get_notification_service()
    count = service.get_unread_count(request.user)
    
    return Response({
        'success': True,
        'unread_count': count
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_as_read(request):
    """
    Mark notifications as read.
    
    If notification_ids is provided, marks those specific notifications.
    If not provided, marks all notifications as read.
    """
    serializer = MarkReadSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    service = get_notification_service()
    notification_ids = serializer.validated_data.get('notification_ids', [])
    
    if notification_ids:
        # Mark specific notifications
        count = 0
        for nid in notification_ids:
            if service.mark_as_read(nid, request.user):
                count += 1
        
        return Response({
            'success': True,
            'message': f'{count} notification(s) marked as read',
            'marked_count': count
        })
    else:
        # Mark all as read
        count = service.mark_all_as_read(request.user)
        
        return Response({
            'success': True,
            'message': 'All notifications marked as read',
            'marked_count': count
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """
    Mark a single notification as read.
    """
    service = get_notification_service()
    success = service.mark_as_read(notification_id, request.user)
    
    if success:
        return Response({
            'success': True,
            'message': 'Notification marked as read'
        })
    else:
        return Response({
            'success': False,
            'error': 'Notification not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    """
    Delete a notification.
    """
    service = get_notification_service()
    success = service.delete_notification(notification_id, request.user)
    
    if success:
        return Response({
            'success': True,
            'message': 'Notification deleted'
        })
    else:
        return Response({
            'success': False,
            'error': 'Notification not found'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_all_notifications(request):
    """
    Delete all notifications for the current user.
    
    Query parameters:
    - read_only: true/false (if true, only deletes read notifications)
    """
    read_only = request.query_params.get('read_only', '').lower() == 'true'
    
    queryset = Notification.objects.filter(user=request.user)
    
    if read_only:
        queryset = queryset.filter(read_at__isnull=False)
    
    count, _ = queryset.delete()
    
    return Response({
        'success': True,
        'message': f'{count} notification(s) deleted',
        'deleted_count': count
    })


# =============================================================================
# NOTIFICATION STATISTICS
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notification_stats(request):
    """
    Get notification statistics for the current user.
    """
    user = request.user
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())
    
    notifications = Notification.objects.filter(user=user)
    
    stats = {
        'total_notifications': notifications.count(),
        'unread_count': notifications.filter(read_at__isnull=True).count(),
        'read_count': notifications.filter(read_at__isnull=False).count(),
        'notifications_today': notifications.filter(created_at__gte=today_start).count(),
        'notifications_this_week': notifications.filter(created_at__gte=week_start).count(),
        'by_type': dict(
            notifications.values('notification_type')
            .annotate(count=Count('id'))
            .values_list('notification_type', 'count')
        ),
    }
    
    return Response({
        'success': True,
        'stats': stats
    })


# =============================================================================
# SCHEDULED NOTIFICATIONS
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_scheduled_notifications(request):
    """
    List scheduled notifications for the current user.
    """
    scheduled = ScheduledNotification.objects.filter(
        user=request.user,
        is_active=True
    ).order_by('scheduled_time')
    
    serializer = ScheduledNotificationSerializer(scheduled, many=True)
    
    return Response({
        'success': True,
        'scheduled_notifications': serializer.data,
        'count': scheduled.count()
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_scheduled_notification(request):
    """
    Create a scheduled notification.
    """
    serializer = CreateScheduledNotificationSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get template
    try:
        template = NotificationTemplate.objects.get(
            name=serializer.validated_data['template_name'],
            is_active=True
        )
    except NotificationTemplate.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Template not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Create scheduled notification
    scheduled = ScheduledNotification.objects.create(
        user=request.user,
        template=template,
        frequency=serializer.validated_data['frequency'],
        scheduled_time=serializer.validated_data['scheduled_time'],
        days_of_week=serializer.validated_data.get('days_of_week', []),
        day_of_month=serializer.validated_data.get('day_of_month'),
        start_date=serializer.validated_data.get('start_date', timezone.now().date()),
        end_date=serializer.validated_data.get('end_date'),
        custom_data=serializer.validated_data.get('custom_data', {}),
        related_object_type=serializer.validated_data.get('related_object_type', ''),
        related_object_id=serializer.validated_data.get('related_object_id', ''),
    )
    
    # Calculate next send time
    scheduled.calculate_next_send()
    
    return Response({
        'success': True,
        'message': 'Scheduled notification created',
        'scheduled_notification': ScheduledNotificationSerializer(scheduled).data
    }, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_scheduled_notification(request, scheduled_id):
    """
    Delete a scheduled notification.
    """
    try:
        scheduled = ScheduledNotification.objects.get(
            id=scheduled_id,
            user=request.user
        )
    except ScheduledNotification.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Scheduled notification not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    scheduled.delete()
    
    return Response({
        'success': True,
        'message': 'Scheduled notification deleted'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_scheduled_notification(request, scheduled_id):
    """
    Enable or disable a scheduled notification.
    """
    try:
        scheduled = ScheduledNotification.objects.get(
            id=scheduled_id,
            user=request.user
        )
    except ScheduledNotification.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Scheduled notification not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    scheduled.is_active = not scheduled.is_active
    scheduled.save(update_fields=['is_active', 'updated_at'])
    
    if scheduled.is_active:
        scheduled.calculate_next_send()
    
    return Response({
        'success': True,
        'message': f'Scheduled notification {"enabled" if scheduled.is_active else "disabled"}',
        'is_active': scheduled.is_active
    })


# =============================================================================
# ADMIN ENDPOINTS (for sending notifications)
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_send_notification(request):
    """
    Send a notification (admin only).
    
    If user_id is provided, sends to that user.
    If not provided, sends to all users.
    """
    serializer = SendNotificationSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    service = get_notification_service()
    
    user_id = data.get('user_id')
    
    if user_id:
        # Send to specific user
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        notification = service.send_notification(
            user=user,
            notification_type=data['notification_type'],
            title=data['title'],
            body=data['body'],
            priority=data.get('priority'),
            action_url=data.get('action_url', ''),
            data=data.get('data', {}),
        )
        
        if notification:
            return Response({
                'success': True,
                'message': 'Notification sent',
                'notification_id': str(notification.id)
            })
        else:
            return Response({
                'success': False,
                'error': 'Notification blocked by user preferences'
            }, status=status.HTTP_400_BAD_REQUEST)
    else:
        # Send to all users
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        users = User.objects.filter(is_active=True)
        count = service.send_bulk_notification(
            users=users,
            notification_type=data['notification_type'],
            title=data['title'],
            body=data['body'],
            priority=data.get('priority'),
            data=data.get('data', {}),
        )
        
        return Response({
            'success': True,
            'message': f'Notification sent to {count} users',
            'sent_count': count
        })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_send_from_template(request):
    """
    Send notification from template (admin only).
    """
    serializer = SendTemplateNotificationSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'error': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    try:
        user = User.objects.get(id=data['user_id'])
    except User.DoesNotExist:
        return Response({
            'success': False,
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    service = get_notification_service()
    notification = service.send_from_template(
        user=user,
        template_name=data['template_name'],
        context=data.get('context', {}),
        data=data.get('data', {}),
    )
    
    if notification:
        return Response({
            'success': True,
            'message': 'Notification sent from template',
            'notification_id': str(notification.id)
        })
    else:
        return Response({
            'success': False,
            'error': 'Failed to send notification (template not found or blocked)'
        }, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# TEMPLATES ENDPOINTS (read-only for regular users)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_templates(request):
    """
    List available notification templates.
    """
    templates = NotificationTemplate.objects.filter(is_active=True)
    
    # Filter by type if provided
    notification_type = request.query_params.get('type')
    if notification_type:
        templates = templates.filter(notification_type=notification_type)
    
    serializer = NotificationTemplateListSerializer(templates, many=True)
    
    return Response({
        'success': True,
        'templates': serializer.data
    })


# =============================================================================
# HEALTH CHECK
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check for notification services.
    """
    fcm_service = get_fcm_service()
    
    # Count pending notifications
    pending_count = Notification.objects.filter(
        status=NotificationStatus.PENDING
    ).count()
    
    # Count active device tokens
    active_tokens = DeviceToken.objects.filter(is_active=True).count()
    
    return Response({
        'status': 'healthy' if fcm_service.is_configured else 'degraded',
        'services': {
            'fcm': {
                'configured': fcm_service.is_configured,
                'provider': 'Firebase Cloud Messaging (FREE)'
            },
            'database': {
                'connected': True
            }
        },
        'stats': {
            'active_device_tokens': active_tokens,
            'pending_notifications': pending_count,
        },
        'timestamp': timezone.now().isoformat(),
        'message': 'Notification service operational' if fcm_service.is_configured else 'FCM not configured'
    })


# =============================================================================
# TEST NOTIFICATION (for development)
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_test_notification(request):
    """
    Send a test notification to the current user.
    Useful for testing FCM setup.
    """
    service = get_notification_service()
    
    notification = service.send_notification(
        user=request.user,
        notification_type=NotificationType.GENERAL,
        title="Test Notification",
        body="This is a test notification from MediConnect. If you see this, push notifications are working!",
        priority="high",
        data={'test': 'true'},
        skip_preferences_check=True,  # Always send test notifications
    )
    
    if notification:
        return Response({
            'success': True,
            'message': 'Test notification sent',
            'notification': NotificationSerializer(notification).data
        })
    else:
        return Response({
            'success': False,
            'error': 'Failed to send test notification'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
