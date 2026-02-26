"""
Conflict Detection and Resolution Service

Handles conflicts that occur when:
1. User modifies data offline
2. Same data was modified on server while user was offline
3. Resource was deleted while user was offline
4. Slot/appointment was booked by someone else
"""

import logging
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime
from django.utils import timezone
from django.db import models

from ..models import SyncAction, ConflictRecord, DataVersion

logger = logging.getLogger(__name__)


class ConflictService:
    """
    Service for detecting and resolving sync conflicts.
    """
    
    # Conflict resolution strategies
    STRATEGY_SERVER_WINS = 'server_wins'      # Server data takes precedence
    STRATEGY_CLIENT_WINS = 'client_wins'      # Client data takes precedence
    STRATEGY_LATEST_WINS = 'latest_wins'      # Most recent modification wins
    STRATEGY_MERGE = 'merge'                  # Try to merge both
    STRATEGY_MANUAL = 'manual'                # Require manual resolution
    
    # Default strategies by action type
    DEFAULT_STRATEGIES = {
        # Appointments - server wins (slot availability is critical)
        'appointment_create': STRATEGY_SERVER_WINS,
        'appointment_cancel': STRATEGY_LATEST_WINS,
        'appointment_reschedule': STRATEGY_SERVER_WINS,
        
        # Consultations
        'consultation_join': STRATEGY_SERVER_WINS,
        'consultation_feedback': STRATEGY_CLIENT_WINS,
        
        # Medicine reminders - client wins (user's preference)
        'reminder_create': STRATEGY_CLIENT_WINS,
        'reminder_update': STRATEGY_LATEST_WINS,
        'reminder_delete': STRATEGY_LATEST_WINS,
        'reminder_taken': STRATEGY_CLIENT_WINS,
        'reminder_skipped': STRATEGY_CLIENT_WINS,
        
        # Health records - merge when possible
        'vitals_create': STRATEGY_CLIENT_WINS,
        'condition_create': STRATEGY_CLIENT_WINS,
        'condition_update': STRATEGY_MERGE,
        'allergy_create': STRATEGY_CLIENT_WINS,
        'document_upload': STRATEGY_CLIENT_WINS,
        
        # Emergency contacts - latest wins
        'emergency_contact_create': STRATEGY_CLIENT_WINS,
        'emergency_contact_update': STRATEGY_LATEST_WINS,
        'emergency_contact_delete': STRATEGY_LATEST_WINS,
        'sos_trigger': STRATEGY_CLIENT_WINS,
        
        # Chat - client wins
        'chat_message': STRATEGY_CLIENT_WINS,
        
        # Diagnosis - client wins
        'diagnosis_create': STRATEGY_CLIENT_WINS,
        
        # Profile - merge
        'profile_update': STRATEGY_MERGE,
        
        # Notifications - latest wins
        'notification_read': STRATEGY_LATEST_WINS,
        'device_register': STRATEGY_CLIENT_WINS,
    }
    
    def __init__(self):
        """Initialize conflict service."""
        pass
    
    # =========================================================================
    # CONFLICT DETECTION
    # =========================================================================
    
    def detect_conflict(
        self,
        sync_action: SyncAction,
        server_data: Optional[Dict[str, Any]] = None,
        server_version: Optional[int] = None
    ) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Detect if there's a conflict for a sync action.
        
        Args:
            sync_action: The sync action to check
            server_data: Current data on server (if resource exists)
            server_version: Current version on server
        
        Returns:
            Tuple of (has_conflict, conflict_type, conflict_details)
        """
        action_type = sync_action.action_type
        client_version = sync_action.resource_version
        resource_type = sync_action.resource_type
        resource_id = sync_action.resource_id
        
        # Check 1: Version mismatch
        if server_version is not None and client_version < server_version:
            return (
                True,
                'version_mismatch',
                {
                    'message': f'Resource was modified. Client version: {client_version}, Server version: {server_version}',
                    'client_version': client_version,
                    'server_version': server_version
                }
            )
        
        # Check 2: Resource deleted
        if self._is_modification_action(action_type):
            if server_data is None and resource_id:
                return (
                    True,
                    'resource_deleted',
                    {
                        'message': f'Resource {resource_type}:{resource_id} no longer exists',
                        'resource_type': resource_type,
                        'resource_id': resource_id
                    }
                )
        
        # Check 3: Slot unavailable (for appointments)
        if action_type == 'appointment_create':
            slot_conflict = self._check_slot_availability(sync_action.action_data)
            if slot_conflict:
                return (True, 'slot_unavailable', slot_conflict)
        
        # Check 4: Duplicate action
        if self._is_duplicate_action(sync_action):
            return (
                True,
                'duplicate_action',
                {
                    'message': 'This action has already been processed',
                    'client_action_id': sync_action.client_action_id
                }
            )
        
        # No conflict detected
        return (False, None, None)
    
    def _is_modification_action(self, action_type: str) -> bool:
        """Check if action modifies existing resource."""
        modification_actions = [
            'appointment_cancel', 'appointment_reschedule',
            'reminder_update', 'reminder_delete',
            'condition_update',
            'emergency_contact_update', 'emergency_contact_delete',
            'profile_update',
        ]
        return action_type in modification_actions
    
    def _check_slot_availability(self, action_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Check if appointment slot is still available."""
        try:
            slot_id = action_data.get('slot_id')
            if not slot_id:
                return None
            
            # Import here to avoid circular imports
            from apps.appointments.models import TimeSlot
            
            try:
                slot = TimeSlot.objects.get(id=slot_id)
                if not slot.is_available:
                    return {
                        'message': 'This time slot is no longer available',
                        'slot_id': str(slot_id),
                        'slot_date': str(slot.date),
                        'slot_time': str(slot.start_time)
                    }
            except TimeSlot.DoesNotExist:
                return {
                    'message': 'Time slot no longer exists',
                    'slot_id': str(slot_id)
                }
        except Exception as e:
            logger.error(f"Error checking slot availability: {str(e)}")
        
        return None
    
    def _is_duplicate_action(self, sync_action: SyncAction) -> bool:
        """Check if action is a duplicate."""
        # Check if another action with same client_action_id exists and is completed
        return SyncAction.objects.filter(
            user=sync_action.user,
            client_action_id=sync_action.client_action_id,
            status='completed'
        ).exclude(id=sync_action.id).exists()
    
    # =========================================================================
    # CONFLICT RECORDING
    # =========================================================================
    
    def record_conflict(
        self,
        sync_action: SyncAction,
        conflict_type: str,
        client_data: Dict[str, Any],
        server_data: Dict[str, Any],
        description: str = None
    ) -> ConflictRecord:
        """
        Record a conflict for later resolution.
        
        Args:
            sync_action: The sync action that caused conflict
            conflict_type: Type of conflict
            client_data: Data from client
            server_data: Data from server
            description: Human-readable description
        
        Returns:
            Created ConflictRecord
        """
        # Generate description if not provided
        if not description:
            description = self._generate_conflict_description(
                conflict_type,
                sync_action.action_type,
                sync_action.resource_type,
                sync_action.resource_id
            )
        
        # Get versions
        client_version = sync_action.resource_version
        server_version = self._get_server_version(
            sync_action.user,
            sync_action.resource_type,
            sync_action.resource_id
        )
        
        conflict = ConflictRecord.objects.create(
            user=sync_action.user,
            sync_action=sync_action,
            conflict_type=conflict_type,
            description=description,
            client_data=client_data,
            server_data=server_data,
            resource_type=sync_action.resource_type or 'unknown',
            resource_id=sync_action.resource_id or 'unknown',
            client_version=client_version,
            server_version=server_version or 0,
            resolution='pending'
        )
        
        # Mark sync action as conflict
        sync_action.mark_conflict({
            'conflict_id': str(conflict.id),
            'conflict_type': conflict_type,
            'description': description
        })
        
        logger.info(f"Recorded conflict {conflict.id} for action {sync_action.id}")
        
        return conflict
    
    def _generate_conflict_description(
        self,
        conflict_type: str,
        action_type: str,
        resource_type: str,
        resource_id: str
    ) -> str:
        """Generate human-readable conflict description."""
        descriptions = {
            'version_mismatch': f"The {resource_type} was modified by someone else while you were offline.",
            'resource_deleted': f"The {resource_type} you tried to modify no longer exists.",
            'resource_modified': f"The {resource_type} was changed after you made your offline changes.",
            'slot_unavailable': "The appointment slot you selected is no longer available.",
            'duplicate_action': "This action was already processed.",
            'validation_error': f"The {action_type} contains invalid data.",
            'permission_denied': f"You don't have permission to perform {action_type}.",
        }
        return descriptions.get(conflict_type, f"A conflict occurred while processing {action_type}.")
    
    def _get_server_version(
        self,
        user,
        resource_type: str,
        resource_id: str
    ) -> Optional[int]:
        """Get current server version of a resource."""
        if not resource_type or not resource_id:
            return None
        
        try:
            version = DataVersion.objects.get(
                user=user,
                resource_type=resource_type,
                resource_id=resource_id
            )
            return version.version
        except DataVersion.DoesNotExist:
            return None
    
    # =========================================================================
    # CONFLICT RESOLUTION
    # =========================================================================
    
    def resolve_conflict(
        self,
        conflict: ConflictRecord,
        resolution: str,
        resolved_by=None,
        custom_data: Dict[str, Any] = None
    ) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Resolve a conflict.
        
        Args:
            conflict: The conflict to resolve
            resolution: Resolution type (use_server, use_client, merge, discard)
            resolved_by: User who resolved the conflict
            custom_data: Custom merged data (for merge resolution)
        
        Returns:
            Tuple of (success, resolved_data)
        """
        try:
            if resolution == 'use_server':
                resolved_data = conflict.server_data
            elif resolution == 'use_client':
                resolved_data = conflict.client_data
            elif resolution == 'merge':
                resolved_data = custom_data or self._auto_merge(
                    conflict.client_data,
                    conflict.server_data
                )
            elif resolution == 'discard':
                resolved_data = None
            else:
                logger.error(f"Unknown resolution type: {resolution}")
                return (False, None)
            
            # Update conflict record
            conflict.resolve(resolution, resolved_data, resolved_by)
            
            # If not discarded, apply the resolved data
            if resolution != 'discard' and resolved_data:
                success = self._apply_resolved_data(conflict, resolved_data)
                if not success:
                    logger.warning(f"Failed to apply resolved data for conflict {conflict.id}")
            
            logger.info(f"Resolved conflict {conflict.id} with {resolution}")
            
            return (True, resolved_data)
            
        except Exception as e:
            logger.error(f"Error resolving conflict {conflict.id}: {str(e)}")
            return (False, None)
    
    def auto_resolve(self, sync_action: SyncAction, conflict_type: str) -> Tuple[bool, str]:
        """
        Attempt automatic conflict resolution based on strategy.
        
        Args:
            sync_action: The sync action with conflict
            conflict_type: Type of conflict
        
        Returns:
            Tuple of (auto_resolved, resolution_type)
        """
        action_type = sync_action.action_type
        strategy = self.DEFAULT_STRATEGIES.get(action_type, self.STRATEGY_MANUAL)
        
        # Some conflicts can't be auto-resolved
        non_auto_resolvable = ['slot_unavailable', 'resource_deleted', 'permission_denied']
        if conflict_type in non_auto_resolvable:
            return (False, 'manual')
        
        # Duplicate actions are always discarded
        if conflict_type == 'duplicate_action':
            return (True, 'discard')
        
        # Apply strategy
        if strategy == self.STRATEGY_SERVER_WINS:
            return (True, 'use_server')
        elif strategy == self.STRATEGY_CLIENT_WINS:
            return (True, 'use_client')
        elif strategy == self.STRATEGY_LATEST_WINS:
            return self._resolve_by_timestamp(sync_action)
        elif strategy == self.STRATEGY_MERGE:
            return (True, 'merge')
        else:
            return (False, 'manual')
    
    def _resolve_by_timestamp(self, sync_action: SyncAction) -> Tuple[bool, str]:
        """Resolve conflict by comparing timestamps."""
        try:
            if not sync_action.resource_type or not sync_action.resource_id:
                return (False, 'manual')
            
            # Get server modification time
            version = DataVersion.objects.filter(
                user=sync_action.user,
                resource_type=sync_action.resource_type,
                resource_id=sync_action.resource_id
            ).first()
            
            if not version:
                # Resource doesn't exist on server, client wins
                return (True, 'use_client')
            
            # Compare timestamps
            client_time = sync_action.client_timestamp
            server_time = version.last_modified_at
            
            if client_time > server_time:
                return (True, 'use_client')
            else:
                return (True, 'use_server')
                
        except Exception as e:
            logger.error(f"Error in timestamp resolution: {str(e)}")
            return (False, 'manual')
    
    def _auto_merge(
        self,
        client_data: Dict[str, Any],
        server_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Attempt to automatically merge client and server data.
        
        Strategy:
        - For simple values: prefer client (user's intention)
        - For lists: combine unique values
        - For nested objects: recursive merge
        """
        merged = server_data.copy() if server_data else {}
        
        if not client_data:
            return merged
        
        for key, client_value in client_data.items():
            server_value = merged.get(key)
            
            # Skip system fields
            if key in ['id', 'created_at', 'updated_at', 'version']:
                continue
            
            # If server doesn't have this field, use client value
            if server_value is None:
                merged[key] = client_value
                continue
            
            # If both are lists, combine unique values
            if isinstance(client_value, list) and isinstance(server_value, list):
                merged[key] = list(set(server_value + client_value))
                continue
            
            # If both are dicts, recursive merge
            if isinstance(client_value, dict) and isinstance(server_value, dict):
                merged[key] = self._auto_merge(client_value, server_value)
                continue
            
            # For simple values, prefer client (user's intention)
            merged[key] = client_value
        
        return merged
    
    def _apply_resolved_data(
        self,
        conflict: ConflictRecord,
        resolved_data: Dict[str, Any]
    ) -> bool:
        """
        Apply resolved data to the actual resource.
        
        This is a placeholder - actual implementation would
        update the specific model based on resource_type.
        """
        try:
            resource_type = conflict.resource_type
            resource_id = conflict.resource_id
            user = conflict.user
            
            # Map resource types to model updates
            # This would need to be expanded based on actual models
            
            logger.info(f"Applied resolved data for {resource_type}:{resource_id}")
            
            # Update version
            DataVersion.get_or_create_version(user, resource_type, resource_id)
            
            return True
            
        except Exception as e:
            logger.error(f"Error applying resolved data: {str(e)}")
            return False
    
    # =========================================================================
    # CONFLICT QUERIES
    # =========================================================================
    
    def get_pending_conflicts(self, user) -> List[ConflictRecord]:
        """Get all pending conflicts for a user."""
        return list(ConflictRecord.objects.filter(
            user=user,
            resolution='pending'
        ).order_by('-created_at'))
    
    def get_conflict_summary(self, user) -> Dict[str, Any]:
        """Get conflict summary for a user."""
        conflicts = ConflictRecord.objects.filter(user=user)
        
        return {
            'total': conflicts.count(),
            'pending': conflicts.filter(resolution='pending').count(),
            'resolved': conflicts.exclude(resolution='pending').count(),
            'by_type': dict(
                conflicts.values('conflict_type')
                .annotate(count=models.Count('id'))
                .values_list('conflict_type', 'count')
            ),
            'by_resource': dict(
                conflicts.values('resource_type')
                .annotate(count=models.Count('id'))
                .values_list('resource_type', 'count')
            )
        }
    
    def get_recent_conflicts(self, user, limit: int = 10) -> List[ConflictRecord]:
        """Get recent conflicts for a user."""
        return list(ConflictRecord.objects.filter(
            user=user
        ).order_by('-created_at')[:limit])
    
    def bulk_resolve(
        self,
        conflicts: List[ConflictRecord],
        resolution: str,
        resolved_by=None
    ) -> Dict[str, int]:
        """
        Bulk resolve multiple conflicts.
        
        Returns:
            Dict with success and failure counts
        """
        success_count = 0
        failure_count = 0
        
        for conflict in conflicts:
            success, _ = self.resolve_conflict(
                conflict,
                resolution,
                resolved_by
            )
            if success:
                success_count += 1
            else:
                failure_count += 1
        
        return {
            'success': success_count,
            'failed': failure_count
        }


# Singleton instance
conflict_service = ConflictService()