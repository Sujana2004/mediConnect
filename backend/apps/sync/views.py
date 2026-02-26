"""
Views for Sync App

API endpoints for offline sync operations:
- Push: Send offline actions to server
- Pull: Get updated data from server
- Status: Check sync status
- Conflicts: Manage sync conflicts
- Retry: Retry failed actions
"""

import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import datetime, timedelta
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import (
    SyncAction,
    SyncBatch,
    SyncStatus,
    ConflictRecord,
    SyncLog,
    DataVersion
)
from .serializers import (
    PushRequestSerializer,
    PushResponseSerializer,
    PullRequestSerializer,
    PullResponseSerializer,
    SyncStatusResponseSerializer,
    SyncActionOutputSerializer,
    SyncActionDetailSerializer,
    SyncBatchSerializer,
    ConflictRecordSerializer,
    ConflictListSerializer,
    ResolveConflictRequestSerializer,
    ResolveConflictResponseSerializer,
    RetryRequestSerializer,
    RetryResponseSerializer,
    SyncLogListSerializer,
    HealthCheckSerializer,
    QuickSyncDataSerializer,
    BulkResolveConflictsRequestSerializer,
    BulkResolveConflictsResponseSerializer,
    ClearSyncDataRequestSerializer,
)
from .services.sync_service import sync_service
from .services.conflict_service import conflict_service
from .services.queue_service import queue_service
from .services.redis_service import redis_service

logger = logging.getLogger(__name__)


# =============================================================================
# PUSH ENDPOINT
# =============================================================================

class PushView(APIView):
    """
    Push offline actions from frontend to backend.
    
    This is the main endpoint for syncing offline actions.
    Frontend sends a batch of actions that were performed offline.
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Push offline actions to server for processing",
        request_body=PushRequestSerializer,
        responses={
            200: PushResponseSerializer,
            400: "Bad Request",
            429: "Rate Limit Exceeded",
        },
        tags=['Sync']
    )
    def post(self, request):
        """Handle push sync request."""
        serializer = PushRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error': 'validation_error',
                'message': 'Invalid request data',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            result = sync_service.push(
                user=request.user,
                actions=serializer.validated_data['actions'],
                batch_id=serializer.validated_data['batch_id'],
                device_info=serializer.validated_data.get('device_info')
            )
            
            if result.get('error') == 'rate_limit_exceeded':
                return Response(result, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Push error: {str(e)}")
            return Response({
                'success': False,
                'error': 'server_error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# PULL ENDPOINT
# =============================================================================

class PullView(APIView):
    """
    Pull updated data from backend to frontend.
    
    Frontend calls this to get data that has changed since last sync.
    Supports delta sync (only changes) and full sync (all data).
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Pull updated data from server",
        request_body=PullRequestSerializer,
        responses={
            200: PullResponseSerializer,
            400: "Bad Request",
            429: "Rate Limit Exceeded",
        },
        tags=['Sync']
    )
    def post(self, request):
        """Handle pull sync request."""
        serializer = PullRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error': 'validation_error',
                'message': 'Invalid request data',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Parse since timestamp
            since = serializer.validated_data.get('since')
            
            result = sync_service.pull(
                user=request.user,
                since=since,
                data_types=serializer.validated_data.get('data_types'),
                full_sync=serializer.validated_data.get('full_sync', False)
            )
            
            if result.get('error') == 'rate_limit_exceeded':
                return Response(result, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Pull error: {str(e)}")
            return Response({
                'success': False,
                'error': 'server_error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# STATUS ENDPOINT
# =============================================================================

class SyncStatusView(APIView):
    """
    Get sync status for the current user.
    
    Returns information about:
    - Last sync timestamps
    - Pending actions
    - Unresolved conflicts
    - Queue statistics
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get sync status for current user",
        responses={
            200: SyncStatusResponseSerializer,
        },
        tags=['Sync']
    )
    def get(self, request):
        """Get sync status."""
        try:
            result = sync_service.get_status(request.user)
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Status error: {str(e)}")
            return Response({
                'success': False,
                'error': 'server_error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# QUICK DATA ENDPOINT
# =============================================================================

class QuickSyncDataView(APIView):
    """
    Get quick sync data for dashboard display.
    
    Returns minimal data needed to show sync status on dashboard.
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get quick sync data for dashboard",
        responses={
            200: QuickSyncDataSerializer,
        },
        tags=['Sync']
    )
    def get(self, request):
        """Get quick sync data."""
        try:
            user = request.user
            user_id = str(user.id)
            
            # Get sync status
            sync_status = SyncStatus.objects.filter(user=user).first()
            
            # Get counts
            pending_count = SyncAction.objects.filter(
                user=user,
                status='pending'
            ).count()
            
            conflict_count = ConflictRecord.objects.filter(
                user=user,
                resolution='pending'
            ).count()
            
            failed_count = SyncAction.objects.filter(
                user=user,
                status='failed'
            ).count()
            
            # Check if syncing
            is_syncing = redis_service.is_locked(user_id)
            
            # Determine last sync
            last_sync = None
            if sync_status:
                last_sync = sync_status.last_push_at or sync_status.last_pull_at
            
            # Determine if needs sync
            needs_sync = pending_count > 0 or conflict_count > 0
            
            # Determine sync health
            if failed_count > 10 or conflict_count > 5:
                sync_health = 'poor'
            elif failed_count > 0 or conflict_count > 0:
                sync_health = 'fair'
            else:
                sync_health = 'good'
            
            return Response({
                'success': True,
                'data': {
                    'last_sync': last_sync.isoformat() if last_sync else None,
                    'pending_actions': pending_count,
                    'unresolved_conflicts': conflict_count,
                    'failed_actions': failed_count,
                    'is_syncing': is_syncing,
                    'needs_sync': needs_sync,
                    'sync_health': sync_health
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Quick data error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# CONFLICTS ENDPOINTS
# =============================================================================

class ConflictListView(APIView):
    """
    List sync conflicts for current user.
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="List sync conflicts",
        manual_parameters=[
            openapi.Parameter(
                'status',
                openapi.IN_QUERY,
                description="Filter by status (pending, resolved, all)",
                type=openapi.TYPE_STRING,
                default='pending'
            ),
        ],
        responses={
            200: ConflictListSerializer(many=True),
        },
        tags=['Sync - Conflicts']
    )
    def get(self, request):
        """List conflicts."""
        try:
            status_filter = request.query_params.get('status', 'pending')
            result = sync_service.get_conflicts(request.user, status_filter)
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Conflict list error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConflictDetailView(APIView):
    """
    Get details of a specific conflict.
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get conflict details",
        responses={
            200: ConflictRecordSerializer,
            404: "Not Found",
        },
        tags=['Sync - Conflicts']
    )
    def get(self, request, conflict_id):
        """Get conflict details."""
        try:
            conflict = ConflictRecord.objects.get(
                id=conflict_id,
                user=request.user
            )
            serializer = ConflictRecordSerializer(conflict)
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except ConflictRecord.DoesNotExist:
            return Response({
                'success': False,
                'error': 'not_found',
                'message': 'Conflict not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Conflict detail error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ResolveConflictView(APIView):
    """
    Resolve a sync conflict.
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Resolve a sync conflict",
        request_body=ResolveConflictRequestSerializer,
        responses={
            200: ResolveConflictResponseSerializer,
            400: "Bad Request",
            404: "Not Found",
        },
        tags=['Sync - Conflicts']
    )
    def post(self, request, conflict_id):
        """Resolve conflict."""
        serializer = ResolveConflictRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error': 'validation_error',
                'message': 'Invalid request data',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            result = sync_service.resolve_conflict(
                user=request.user,
                conflict_id=conflict_id,
                resolution=serializer.validated_data['resolution'],
                custom_data=serializer.validated_data.get('custom_data')
            )
            
            if result.get('error') == 'not_found':
                return Response(result, status=status.HTTP_404_NOT_FOUND)
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Resolve conflict error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BulkResolveConflictsView(APIView):
    """
    Bulk resolve multiple conflicts.
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Bulk resolve multiple conflicts",
        request_body=BulkResolveConflictsRequestSerializer,
        responses={
            200: BulkResolveConflictsResponseSerializer,
            400: "Bad Request",
        },
        tags=['Sync - Conflicts']
    )
    def post(self, request):
        """Bulk resolve conflicts."""
        serializer = BulkResolveConflictsRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error': 'validation_error',
                'message': 'Invalid request data',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            conflict_ids = serializer.validated_data['conflict_ids']
            resolution = serializer.validated_data['resolution']
            
            conflicts = ConflictRecord.objects.filter(
                id__in=conflict_ids,
                user=request.user,
                resolution='pending'
            )
            
            results = conflict_service.bulk_resolve(
                conflicts=list(conflicts),
                resolution=resolution,
                resolved_by=request.user
            )
            
            return Response({
                'success': True,
                'message': f'Resolved {results["success"]} conflicts',
                'results': results
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Bulk resolve error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# RETRY ENDPOINT
# =============================================================================

class RetryFailedView(APIView):
    """
    Retry failed sync actions.
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Retry failed sync actions",
        request_body=RetryRequestSerializer,
        responses={
            200: RetryResponseSerializer,
            400: "Bad Request",
        },
        tags=['Sync']
    )
    def post(self, request):
        """Retry failed actions."""
        serializer = RetryRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error': 'validation_error',
                'message': 'Invalid request data',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            result = sync_service.retry_failed(
                user=request.user,
                max_actions=serializer.validated_data.get('max_actions', 10)
            )
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Retry error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# ACTIONS ENDPOINTS
# =============================================================================

class ActionListView(APIView):
    """
    List sync actions for current user.
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="List sync actions",
        manual_parameters=[
            openapi.Parameter(
                'status',
                openapi.IN_QUERY,
                description="Filter by status",
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                'action_type',
                openapi.IN_QUERY,
                description="Filter by action type",
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                'limit',
                openapi.IN_QUERY,
                description="Number of results to return",
                type=openapi.TYPE_INTEGER,
                default=50
            ),
        ],
        responses={
            200: SyncActionOutputSerializer(many=True),
        },
        tags=['Sync - Actions']
    )
    def get(self, request):
        """List actions."""
        try:
            queryset = SyncAction.objects.filter(user=request.user)
            
            # Apply filters
            status_filter = request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            
            action_type = request.query_params.get('action_type')
            if action_type:
                queryset = queryset.filter(action_type=action_type)
            
            # Limit results
            limit = int(request.query_params.get('limit', 50))
            limit = min(limit, 100)  # Max 100
            
            queryset = queryset.order_by('-server_timestamp')[:limit]
            
            serializer = SyncActionOutputSerializer(queryset, many=True)
            
            return Response({
                'success': True,
                'count': len(serializer.data),
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Action list error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ActionDetailView(APIView):
    """
    Get details of a specific sync action.
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get sync action details",
        responses={
            200: SyncActionDetailSerializer,
            404: "Not Found",
        },
        tags=['Sync - Actions']
    )
    def get(self, request, action_id):
        """Get action details."""
        try:
            action = SyncAction.objects.get(
                id=action_id,
                user=request.user
            )
            serializer = SyncActionDetailSerializer(action)
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except SyncAction.DoesNotExist:
            return Response({
                'success': False,
                'error': 'not_found',
                'message': 'Action not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Action detail error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# BATCHES ENDPOINTS
# =============================================================================

class BatchListView(APIView):
    """
    List sync batches for current user.
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="List sync batches",
        manual_parameters=[
            openapi.Parameter(
                'limit',
                openapi.IN_QUERY,
                description="Number of results to return",
                type=openapi.TYPE_INTEGER,
                default=20
            ),
        ],
        responses={
            200: SyncBatchSerializer(many=True),
        },
        tags=['Sync - Batches']
    )
    def get(self, request):
        """List batches."""
        try:
            limit = int(request.query_params.get('limit', 20))
            limit = min(limit, 50)  # Max 50
            
            queryset = SyncBatch.objects.filter(
                user=request.user
            ).order_by('-received_at')[:limit]
            
            serializer = SyncBatchSerializer(queryset, many=True)
            
            return Response({
                'success': True,
                'count': len(serializer.data),
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Batch list error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BatchDetailView(APIView):
    """
    Get details of a specific sync batch.
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get sync batch details",
        responses={
            200: SyncBatchSerializer,
            404: "Not Found",
        },
        tags=['Sync - Batches']
    )
    def get(self, request, batch_id):
        """Get batch details."""
        try:
            batch = SyncBatch.objects.get(
                id=batch_id,
                user=request.user
            )
            serializer = SyncBatchSerializer(batch)
            
            # Get related actions
            actions = SyncAction.objects.filter(
                user=request.user,
                server_timestamp__gte=batch.received_at
            )
            if batch.completed_at:
                actions = actions.filter(server_timestamp__lte=batch.completed_at)
            
            action_serializer = SyncActionOutputSerializer(actions[:50], many=True)
            
            return Response({
                'success': True,
                'data': {
                    **serializer.data,
                    'actions': action_serializer.data
                }
            }, status=status.HTTP_200_OK)
            
        except SyncBatch.DoesNotExist:
            return Response({
                'success': False,
                'error': 'not_found',
                'message': 'Batch not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Batch detail error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# LOGS ENDPOINT
# =============================================================================

class SyncLogListView(APIView):
    """
    List sync logs for current user.
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="List sync logs",
        manual_parameters=[
            openapi.Parameter(
                'level',
                openapi.IN_QUERY,
                description="Filter by log level",
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                'operation',
                openapi.IN_QUERY,
                description="Filter by operation type",
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                'limit',
                openapi.IN_QUERY,
                description="Number of results to return",
                type=openapi.TYPE_INTEGER,
                default=50
            ),
        ],
        responses={
            200: SyncLogListSerializer(many=True),
        },
        tags=['Sync - Logs']
    )
    def get(self, request):
        """List logs."""
        try:
            queryset = SyncLog.objects.filter(user=request.user)
            
            # Apply filters
            level = request.query_params.get('level')
            if level:
                queryset = queryset.filter(level=level)
            
            operation = request.query_params.get('operation')
            if operation:
                queryset = queryset.filter(operation=operation)
            
            # Limit results
            limit = int(request.query_params.get('limit', 50))
            limit = min(limit, 100)  # Max 100
            
            queryset = queryset.order_by('-created_at')[:limit]
            
            serializer = SyncLogListSerializer(queryset, many=True)
            
            return Response({
                'success': True,
                'count': len(serializer.data),
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Log list error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# CLEAR DATA ENDPOINT
# =============================================================================

class ClearSyncDataView(APIView):
    """
    Clear old sync data for current user.
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Clear old sync data",
        request_body=ClearSyncDataRequestSerializer,
        responses={
            200: "Success",
            400: "Bad Request",
        },
        tags=['Sync']
    )
    def post(self, request):
        """Clear sync data."""
        serializer = ClearSyncDataRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error': 'validation_error',
                'message': 'Invalid request data',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = request.user
            older_than = timezone.now() - timedelta(
                days=serializer.validated_data.get('older_than_days', 30)
            )
            
            results = {
                'actions_deleted': 0,
                'conflicts_deleted': 0,
                'logs_deleted': 0
            }
            
            if serializer.validated_data.get('clear_actions'):
                deleted, _ = SyncAction.objects.filter(
                    user=user,
                    server_timestamp__lt=older_than,
                    status__in=['completed', 'skipped']
                ).delete()
                results['actions_deleted'] = deleted
            
            if serializer.validated_data.get('clear_conflicts'):
                deleted, _ = ConflictRecord.objects.filter(
                    user=user,
                    created_at__lt=older_than
                ).exclude(resolution='pending').delete()
                results['conflicts_deleted'] = deleted
            
            if serializer.validated_data.get('clear_logs'):
                deleted, _ = SyncLog.objects.filter(
                    user=user,
                    created_at__lt=older_than
                ).delete()
                results['logs_deleted'] = deleted
            
            return Response({
                'success': True,
                'message': 'Sync data cleared successfully',
                'results': results
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Clear data error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# RESET SYNC ENDPOINT
# =============================================================================

class ResetSyncView(APIView):
    """
    Reset sync status for current user.
    Useful when user wants to do a fresh full sync.
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Reset sync status for fresh start",
        responses={
            200: "Success",
        },
        tags=['Sync']
    )
    def post(self, request):
        """Reset sync status."""
        try:
            user = request.user
            user_id = str(user.id)
            
            # Clear Redis data
            redis_service.clear_pending_actions(user_id)
            redis_service.reset_rate_limit(user_id)
            
            # Reset sync status
            sync_status, _ = SyncStatus.objects.get_or_create(user=user)
            sync_status.last_push_at = None
            sync_status.last_pull_at = None
            sync_status.last_full_sync_at = None
            sync_status.pending_actions_count = 0
            sync_status.unresolved_conflicts_count = 0
            sync_status.save()
            
            return Response({
                'success': True,
                'message': 'Sync status reset successfully. Please perform a full sync.'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Reset sync error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# HEALTH CHECK ENDPOINT
# =============================================================================

class HealthCheckView(APIView):
    """
    Health check endpoint for sync service.
    No authentication required.
    """
    permission_classes = [AllowAny]
    
    @swagger_auto_schema(
        operation_description="Check sync service health",
        responses={
            200: HealthCheckSerializer,
        },
        tags=['Sync']
    )
    def get(self, request):
        """Health check."""
        try:
            result = sync_service.health_check()
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Health check error: {str(e)}")
            return Response({
                'status': 'unhealthy',
                'service': 'sync',
                'error': str(e),
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# REDIS STATUS ENDPOINT (Admin/Debug)
# =============================================================================

class RedisStatusView(APIView):
    """
    Check Redis/cache status.
    Useful for debugging.
    """
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Check Redis/cache status",
        responses={
            200: "Redis status",
        },
        tags=['Sync - Debug']
    )
    def get(self, request):
        """Get Redis status."""
        try:
            user_id = str(request.user.id)
            
            # Get Redis stats for user
            stats = redis_service.get_sync_stats(user_id)
            health = redis_service.health_check()
            
            return Response({
                'success': True,
                'redis_health': health,
                'user_stats': stats
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Redis status error: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)