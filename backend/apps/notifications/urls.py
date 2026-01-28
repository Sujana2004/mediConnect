"""
Notification URL Configuration
==============================
URL patterns for notification API endpoints.
"""

from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [
    # =========================================================================
    # DEVICE TOKEN ENDPOINTS
    # =========================================================================
    path(
        'device/register/',
        views.register_device_token,
        name='register_device'
    ),
    path(
        'device/unregister/',
        views.unregister_device_token,
        name='unregister_device'
    ),
    path(
        'devices/',
        views.list_device_tokens,
        name='list_devices'
    ),
    
    # =========================================================================
    # PREFERENCE ENDPOINTS
    # =========================================================================
    path(
        'preferences/',
        views.get_preferences,
        name='get_preferences'
    ),
    path(
        'preferences/update/',
        views.update_preferences,
        name='update_preferences'
    ),
    path(
        'preferences/type/',
        views.update_type_preference,
        name='update_type_preference'
    ),
    path(
        'preferences/quiet-hours/',
        views.update_quiet_hours,
        name='update_quiet_hours'
    ),
    
    # =========================================================================
    # NOTIFICATION ENDPOINTS
    # =========================================================================
    path(
        '',
        views.list_notifications,
        name='list_notifications'
    ),
    path(
        'unread-count/',
        views.get_unread_count,
        name='unread_count'
    ),
    path(
        'mark-read/',
        views.mark_as_read,
        name='mark_read'
    ),
    path(
        'clear/',
        views.clear_all_notifications,
        name='clear_all'
    ),
    path(
        'stats/',
        views.get_notification_stats,
        name='stats'
    ),
    path(
        '<uuid:notification_id>/',
        views.get_notification,
        name='get_notification'
    ),
    path(
        '<uuid:notification_id>/read/',
        views.mark_notification_read,
        name='mark_notification_read'
    ),
    path(
        '<uuid:notification_id>/delete/',
        views.delete_notification,
        name='delete_notification'
    ),
    
    # =========================================================================
    # SCHEDULED NOTIFICATION ENDPOINTS
    # =========================================================================
    path(
        'scheduled/',
        views.list_scheduled_notifications,
        name='list_scheduled'
    ),
    path(
        'scheduled/create/',
        views.create_scheduled_notification,
        name='create_scheduled'
    ),
    path(
        'scheduled/<uuid:scheduled_id>/delete/',
        views.delete_scheduled_notification,
        name='delete_scheduled'
    ),
    path(
        'scheduled/<uuid:scheduled_id>/toggle/',
        views.toggle_scheduled_notification,
        name='toggle_scheduled'
    ),
    
    # =========================================================================
    # TEMPLATE ENDPOINTS
    # =========================================================================
    path(
        'templates/',
        views.list_templates,
        name='list_templates'
    ),
    
    # =========================================================================
    # ADMIN ENDPOINTS
    # =========================================================================
    path(
        'admin/send/',
        views.admin_send_notification,
        name='admin_send'
    ),
    path(
        'admin/send-template/',
        views.admin_send_from_template,
        name='admin_send_template'
    ),
    
    # =========================================================================
    # TEST & HEALTH
    # =========================================================================
    path(
        'test/',
        views.send_test_notification,
        name='test_notification'
    ),
    path(
        'health/',
        views.health_check,
        name='health_check'
    ),
]