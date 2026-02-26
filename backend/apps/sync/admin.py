from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import (
    SyncAction,
    SyncBatch,
    SyncStatus,
    ConflictRecord,
    SyncLog,
    DataVersion
)


@admin.register(SyncAction)
class SyncActionAdmin(admin.ModelAdmin):
    """Admin for SyncAction model."""
    
    list_display = [
        'id_short',
        'user_phone',
        'action_type',
        'status_badge',
        'client_timestamp',
        'processed_at',
        'retry_count',
    ]
    list_filter = [
        'status',
        'action_type',
        'server_timestamp',
        'processed_at',
    ]
    search_fields = [
        'user__phone',
        'user__first_name',
        'client_action_id',
        'resource_type',
        'resource_id',
    ]
    readonly_fields = [
        'id',
        'server_timestamp',
        'processed_at',
    ]
    ordering = ['-server_timestamp']
    date_hierarchy = 'server_timestamp'
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'user', 'action_type', 'status')
        }),
        ('Action Data', {
            'fields': ('action_data', 'result_data', 'error_message')
        }),
        ('Client Tracking', {
            'fields': ('client_action_id', 'client_timestamp')
        }),
        ('Resource Info', {
            'fields': ('resource_type', 'resource_id', 'resource_version')
        }),
        ('Processing', {
            'fields': ('server_timestamp', 'processed_at', 'retry_count', 'max_retries')
        }),
    )
    
    def id_short(self, obj):
        """Display shortened UUID."""
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def user_phone(self, obj):
        """Display user phone number."""
        return obj.user.phone
    user_phone.short_description = 'User'
    
    def status_badge(self, obj):
        """Display status with color badge."""
        colors = {
            'pending': '#FFA500',      # Orange
            'processing': '#3498DB',   # Blue
            'completed': '#27AE60',    # Green
            'failed': '#E74C3C',       # Red
            'conflict': '#9B59B6',     # Purple
            'skipped': '#95A5A6',      # Gray
        }
        color = colors.get(obj.status, '#000000')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.status.upper()
        )
    status_badge.short_description = 'Status'
    
    actions = ['mark_as_pending', 'mark_as_completed', 'retry_failed_actions']
    
    def mark_as_pending(self, request, queryset):
        """Mark selected actions as pending."""
        count = queryset.update(status='pending', processed_at=None, error_message=None)
        self.message_user(request, f'{count} actions marked as pending.')
    mark_as_pending.short_description = 'Mark selected as Pending'
    
    def mark_as_completed(self, request, queryset):
        """Mark selected actions as completed."""
        count = queryset.update(status='completed', processed_at=timezone.now())
        self.message_user(request, f'{count} actions marked as completed.')
    mark_as_completed.short_description = 'Mark selected as Completed'
    
    def retry_failed_actions(self, request, queryset):
        """Retry failed actions."""
        failed = queryset.filter(status='failed')
        count = 0
        for action in failed:
            if action.can_retry():
                action.status = 'pending'
                action.save(update_fields=['status'])
                count += 1
        self.message_user(request, f'{count} actions queued for retry.')
    retry_failed_actions.short_description = 'Retry failed actions'


@admin.register(SyncBatch)
class SyncBatchAdmin(admin.ModelAdmin):
    """Admin for SyncBatch model."""
    
    list_display = [
        'id_short',
        'user_phone',
        'status_badge',
        'total_actions',
        'completed_actions',
        'failed_actions',
        'conflict_actions',
        'received_at',
    ]
    list_filter = [
        'status',
        'received_at',
    ]
    search_fields = [
        'user__phone',
        'user__first_name',
        'client_batch_id',
    ]
    readonly_fields = [
        'id',
        'received_at',
        'started_at',
        'completed_at',
    ]
    ordering = ['-received_at']
    date_hierarchy = 'received_at'
    
    def id_short(self, obj):
        """Display shortened UUID."""
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def user_phone(self, obj):
        """Display user phone number."""
        return obj.user.phone
    user_phone.short_description = 'User'
    
    def status_badge(self, obj):
        """Display status with color badge."""
        colors = {
            'received': '#FFA500',     # Orange
            'processing': '#3498DB',   # Blue
            'completed': '#27AE60',    # Green
            'partial': '#F39C12',      # Yellow
            'failed': '#E74C3C',       # Red
        }
        color = colors.get(obj.status, '#000000')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.status.upper()
        )
    status_badge.short_description = 'Status'


@admin.register(SyncStatus)
class SyncStatusAdmin(admin.ModelAdmin):
    """Admin for SyncStatus model."""
    
    list_display = [
        'user_phone',
        'last_push_at',
        'last_pull_at',
        'total_pushes',
        'total_pulls',
        'pending_actions_count',
        'unresolved_conflicts_count',
    ]
    list_filter = [
        'last_push_at',
        'last_pull_at',
    ]
    search_fields = [
        'user__phone',
        'user__first_name',
    ]
    readonly_fields = [
        'id',
        'created_at',
        'updated_at',
        'total_pushes',
        'total_pulls',
        'total_conflicts',
        'total_failed_actions',
    ]
    ordering = ['-updated_at']
    
    def user_phone(self, obj):
        """Display user phone number."""
        return obj.user.phone
    user_phone.short_description = 'User'


@admin.register(ConflictRecord)
class ConflictRecordAdmin(admin.ModelAdmin):
    """Admin for ConflictRecord model."""
    
    list_display = [
        'id_short',
        'user_phone',
        'conflict_type',
        'resource_type',
        'resolution_badge',
        'created_at',
        'resolved_at',
    ]
    list_filter = [
        'conflict_type',
        'resolution',
        'resource_type',
        'created_at',
    ]
    search_fields = [
        'user__phone',
        'user__first_name',
        'resource_type',
        'resource_id',
        'description',
    ]
    readonly_fields = [
        'id',
        'created_at',
        'updated_at',
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'user', 'sync_action', 'conflict_type', 'description')
        }),
        ('Resource', {
            'fields': ('resource_type', 'resource_id', 'client_version', 'server_version')
        }),
        ('Data Comparison', {
            'fields': ('client_data', 'server_data'),
            'classes': ('collapse',)
        }),
        ('Resolution', {
            'fields': ('resolution', 'resolved_data', 'resolved_at', 'resolved_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def id_short(self, obj):
        """Display shortened UUID."""
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def user_phone(self, obj):
        """Display user phone number."""
        return obj.user.phone
    user_phone.short_description = 'User'
    
    def resolution_badge(self, obj):
        """Display resolution with color badge."""
        colors = {
            'pending': '#FFA500',        # Orange
            'use_server': '#3498DB',     # Blue
            'use_client': '#27AE60',     # Green
            'merge': '#9B59B6',          # Purple
            'discard': '#95A5A6',        # Gray
            'auto_resolved': '#1ABC9C',  # Teal
        }
        color = colors.get(obj.resolution, '#000000')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.resolution.replace('_', ' ').upper()
        )
    resolution_badge.short_description = 'Resolution'
    
    actions = ['resolve_use_server', 'resolve_use_client', 'resolve_discard']
    
    def resolve_use_server(self, request, queryset):
        """Resolve conflicts using server version."""
        pending = queryset.filter(resolution='pending')
        count = 0
        for conflict in pending:
            conflict.resolve('use_server', conflict.server_data, request.user)
            count += 1
        self.message_user(request, f'{count} conflicts resolved using server version.')
    resolve_use_server.short_description = 'Resolve: Use Server Version'
    
    def resolve_use_client(self, request, queryset):
        """Resolve conflicts using client version."""
        pending = queryset.filter(resolution='pending')
        count = 0
        for conflict in pending:
            conflict.resolve('use_client', conflict.client_data, request.user)
            count += 1
        self.message_user(request, f'{count} conflicts resolved using client version.')
    resolve_use_client.short_description = 'Resolve: Use Client Version'
    
    def resolve_discard(self, request, queryset):
        """Discard conflicting actions."""
        pending = queryset.filter(resolution='pending')
        count = 0
        for conflict in pending:
            conflict.resolve('discard', None, request.user)
            count += 1
        self.message_user(request, f'{count} conflicts discarded.')
    resolve_discard.short_description = 'Resolve: Discard'


@admin.register(SyncLog)
class SyncLogAdmin(admin.ModelAdmin):
    """Admin for SyncLog model."""
    
    list_display = [
        'id_short',
        'level_badge',
        'operation',
        'user_phone',
        'message_short',
        'created_at',
    ]
    list_filter = [
        'level',
        'operation',
        'created_at',
    ]
    search_fields = [
        'user__phone',
        'message',
    ]
    readonly_fields = [
        'id',
        'created_at',
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    
    def id_short(self, obj):
        """Display shortened UUID."""
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def user_phone(self, obj):
        """Display user phone number."""
        return obj.user.phone if obj.user else '-'
    user_phone.short_description = 'User'
    
    def message_short(self, obj):
        """Display shortened message."""
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
    message_short.short_description = 'Message'
    
    def level_badge(self, obj):
        """Display level with color badge."""
        colors = {
            'debug': '#95A5A6',    # Gray
            'info': '#3498DB',     # Blue
            'warning': '#F39C12',  # Yellow
            'error': '#E74C3C',    # Red
        }
        color = colors.get(obj.level, '#000000')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.level.upper()
        )
    level_badge.short_description = 'Level'
    
    def has_add_permission(self, request):
        """Disable manual log creation."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Disable log editing."""
        return False


@admin.register(DataVersion)
class DataVersionAdmin(admin.ModelAdmin):
    """Admin for DataVersion model."""
    
    list_display = [
        'user_phone',
        'resource_type',
        'resource_id_short',
        'version',
        'last_modified_action',
        'last_modified_at',
    ]
    list_filter = [
        'resource_type',
        'last_modified_action',
        'last_modified_at',
    ]
    search_fields = [
        'user__phone',
        'resource_id',
    ]
    readonly_fields = [
        'id',
        'last_modified_at',
    ]
    ordering = ['-last_modified_at']
    
    def user_phone(self, obj):
        """Display user phone number."""
        return obj.user.phone
    user_phone.short_description = 'User'
    
    def resource_id_short(self, obj):
        """Display shortened resource ID."""
        return obj.resource_id[:8] if len(obj.resource_id) > 8 else obj.resource_id
    resource_id_short.short_description = 'Resource ID'