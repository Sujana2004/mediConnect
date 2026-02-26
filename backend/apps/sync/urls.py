"""
URL Configuration for Sync App

All sync-related endpoints are prefixed with /api/v1/sync/
"""

from django.urls import path
from .views import (
    # Core sync operations
    PushView,
    PullView,
    SyncStatusView,
    QuickSyncDataView,
    
    # Conflicts
    ConflictListView,
    ConflictDetailView,
    ResolveConflictView,
    BulkResolveConflictsView,
    
    # Retry
    RetryFailedView,
    
    # Actions
    ActionListView,
    ActionDetailView,
    
    # Batches
    BatchListView,
    BatchDetailView,
    
    # Logs
    SyncLogListView,
    
    # Maintenance
    ClearSyncDataView,
    ResetSyncView,
    
    # Health & Debug
    HealthCheckView,
    RedisStatusView,
)

app_name = 'sync'

urlpatterns = [
    # =========================================================================
    # CORE SYNC OPERATIONS
    # =========================================================================
    
    # Push offline actions to server
    # POST /api/v1/sync/push/
    path('push/', PushView.as_view(), name='push'),
    
    # Pull updated data from server
    # POST /api/v1/sync/pull/
    path('pull/', PullView.as_view(), name='pull'),
    
    # Get sync status
    # GET /api/v1/sync/status/
    path('status/', SyncStatusView.as_view(), name='status'),
    
    # Get quick sync data for dashboard
    # GET /api/v1/sync/quick-data/
    path('quick-data/', QuickSyncDataView.as_view(), name='quick-data'),
    
    # =========================================================================
    # CONFLICTS
    # =========================================================================
    
    # List conflicts
    # GET /api/v1/sync/conflicts/
    path('conflicts/', ConflictListView.as_view(), name='conflict-list'),
    
    # Get conflict details
    # GET /api/v1/sync/conflicts/{conflict_id}/
    path(
        'conflicts/<uuid:conflict_id>/',
        ConflictDetailView.as_view(),
        name='conflict-detail'
    ),
    
    # Resolve a conflict
    # POST /api/v1/sync/conflicts/{conflict_id}/resolve/
    path(
        'conflicts/<uuid:conflict_id>/resolve/',
        ResolveConflictView.as_view(),
        name='conflict-resolve'
    ),
    
    # Bulk resolve conflicts
    # POST /api/v1/sync/conflicts/bulk-resolve/
    path(
        'conflicts/bulk-resolve/',
        BulkResolveConflictsView.as_view(),
        name='conflict-bulk-resolve'
    ),
    
    # =========================================================================
    # RETRY
    # =========================================================================
    
    # Retry failed actions
    # POST /api/v1/sync/retry/
    path('retry/', RetryFailedView.as_view(), name='retry'),
    
    # =========================================================================
    # ACTIONS
    # =========================================================================
    
    # List sync actions
    # GET /api/v1/sync/actions/
    path('actions/', ActionListView.as_view(), name='action-list'),
    
    # Get action details
    # GET /api/v1/sync/actions/{action_id}/
    path(
        'actions/<uuid:action_id>/',
        ActionDetailView.as_view(),
        name='action-detail'
    ),
    
    # =========================================================================
    # BATCHES
    # =========================================================================
    
    # List sync batches
    # GET /api/v1/sync/batches/
    path('batches/', BatchListView.as_view(), name='batch-list'),
    
    # Get batch details
    # GET /api/v1/sync/batches/{batch_id}/
    path(
        'batches/<uuid:batch_id>/',
        BatchDetailView.as_view(),
        name='batch-detail'
    ),
    
    # =========================================================================
    # LOGS
    # =========================================================================
    
    # List sync logs
    # GET /api/v1/sync/logs/
    path('logs/', SyncLogListView.as_view(), name='log-list'),
    
    # =========================================================================
    # MAINTENANCE
    # =========================================================================
    
    # Clear old sync data
    # POST /api/v1/sync/clear/
    path('clear/', ClearSyncDataView.as_view(), name='clear'),
    
    # Reset sync status (for fresh start)
    # POST /api/v1/sync/reset/
    path('reset/', ResetSyncView.as_view(), name='reset'),
    
    # =========================================================================
    # HEALTH & DEBUG
    # =========================================================================
    
    # Health check (no auth required)
    # GET /api/v1/sync/health/
    path('health/', HealthCheckView.as_view(), name='health'),
    
    # Redis/cache status (for debugging)
    # GET /api/v1/sync/redis-status/
    path('redis-status/', RedisStatusView.as_view(), name='redis-status'),
]