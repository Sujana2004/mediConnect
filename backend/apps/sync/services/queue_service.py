"""
Queue Service for Processing Sync Actions

Handles the processing of offline actions in the correct order.
Delegates to appropriate app services for actual execution.
"""

import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from django.utils import timezone
from django.db import transaction, models

from ..models import SyncAction, SyncBatch, SyncLog, DataVersion
from .redis_service import redis_service
from .conflict_service import conflict_service

logger = logging.getLogger(__name__)


class QueueService:
    """
    Service for processing sync action queues.
    """
    
    # Action processors mapping
    # Maps action_type to (app_name, service_method)
    ACTION_PROCESSORS = {
        # Appointments
        'appointment_create': ('appointments', 'create_appointment'),
        'appointment_cancel': ('appointments', 'cancel_appointment'),
        'appointment_reschedule': ('appointments', 'reschedule_appointment'),
        
        # Consultations
        'consultation_join': ('consultation', 'join_consultation'),
        'consultation_feedback': ('consultation', 'submit_feedback'),
        
        # Medicine
        'reminder_create': ('medicine', 'create_reminder'),
        'reminder_update': ('medicine', 'update_reminder'),
        'reminder_delete': ('medicine', 'delete_reminder'),
        'reminder_taken': ('medicine', 'mark_taken'),
        'reminder_skipped': ('medicine', 'mark_skipped'),
        
        # Health Records
        'vitals_create': ('health_records', 'create_vitals'),
        'condition_create': ('health_records', 'create_condition'),
        'condition_update': ('health_records', 'update_condition'),
        'allergy_create': ('health_records', 'create_allergy'),
        'document_upload': ('health_records', 'upload_document'),
        
        # Emergency
        'emergency_contact_create': ('emergency', 'create_contact'),
        'emergency_contact_update': ('emergency', 'update_contact'),
        'emergency_contact_delete': ('emergency', 'delete_contact'),
        'sos_trigger': ('emergency', 'trigger_sos'),
        
        # Chatbot
        'chat_message': ('chatbot', 'send_message'),
        
        # Diagnosis
        'diagnosis_create': ('diagnosis', 'create_diagnosis'),
        
        # Profile
        'profile_update': ('users', 'update_profile'),
        
        # Notifications
        'notification_read': ('notifications', 'mark_read'),
        'device_register': ('notifications', 'register_device'),
    }
    
    def __init__(self):
        """Initialize queue service."""
        self._processors_cache = {}
    
    # =========================================================================
    # BATCH PROCESSING
    # =========================================================================
    
    def process_batch(
        self,
        batch: SyncBatch,
        actions: List[SyncAction]
    ) -> Dict[str, Any]:
        """
        Process a batch of sync actions.
        
        Args:
            batch: The sync batch record
            actions: List of sync actions to process
        
        Returns:
            Processing results summary
        """
        results = {
            'total': len(actions),
            'completed': 0,
            'failed': 0,
            'conflicts': 0,
            'skipped': 0,
            'details': []
        }
        
        # Mark batch as processing
        batch.status = 'processing'
        batch.started_at = timezone.now()
        batch.save(update_fields=['status', 'started_at'])
        
        # Log start
        self._log(
            batch.user,
            'info',
            'push',
            f'Starting batch processing: {len(actions)} actions',
            sync_batch=batch
        )
        
        # Sort actions by client timestamp (process in order)
        sorted_actions = sorted(actions, key=lambda a: a.client_timestamp)
        
        for action in sorted_actions:
            try:
                result = self.process_action(action)
                
                if result['status'] == 'completed':
                    results['completed'] += 1
                elif result['status'] == 'failed':
                    results['failed'] += 1
                elif result['status'] == 'conflict':
                    results['conflicts'] += 1
                elif result['status'] == 'skipped':
                    results['skipped'] += 1
                
                results['details'].append({
                    'action_id': str(action.id),
                    'client_action_id': action.client_action_id,
                    'action_type': action.action_type,
                    'status': result['status'],
                    'message': result.get('message'),
                    'result_data': result.get('data')
                })
                
            except Exception as e:
                logger.error(f"Error processing action {action.id}: {str(e)}")
                action.mark_failed(str(e))
                results['failed'] += 1
                results['details'].append({
                    'action_id': str(action.id),
                    'client_action_id': action.client_action_id,
                    'action_type': action.action_type,
                    'status': 'failed',
                    'message': str(e)
                })
        
        # Update batch status
        batch.completed_actions = results['completed']
        batch.failed_actions = results['failed']
        batch.conflict_actions = results['conflicts']
        batch.completed_at = timezone.now()
        
        if results['failed'] == 0 and results['conflicts'] == 0:
            batch.status = 'completed'
        elif results['completed'] > 0:
            batch.status = 'partial'
        else:
            batch.status = 'failed'
        
        batch.save()
        
        # Log completion
        self._log(
            batch.user,
            'info',
            'push',
            f'Batch completed: {results["completed"]} success, {results["failed"]} failed, {results["conflicts"]} conflicts',
            sync_batch=batch,
            extra_data=results
        )
        
        return results
    
    # =========================================================================
    # ACTION PROCESSING
    # =========================================================================
    
    def process_action(self, action: SyncAction) -> Dict[str, Any]:
        """
        Process a single sync action.
        
        Args:
            action: The sync action to process
        
        Returns:
            Processing result
        """
        action_id = str(action.id)
        user = action.user
        
        # Check if already processing (idempotency)
        if redis_service.is_processing(action_id):
            return {
                'status': 'skipped',
                'message': 'Action is already being processed'
            }
        
        # Check if already completed (duplicate check)
        if redis_service.check_idempotency(str(user.id), action.client_action_id):
            action.status = 'skipped'
            action.save(update_fields=['status'])
            return {
                'status': 'skipped',
                'message': 'Action was already processed'
            }
        
        # Mark as processing
        redis_service.mark_processing(action_id)
        action.status = 'processing'
        action.save(update_fields=['status'])
        
        try:
            # Get server data for conflict detection (if updating existing resource)
            server_data = None
            server_version = None
            
            if action.resource_type and action.resource_id:
                server_data, server_version = self._get_server_resource(
                    user,
                    action.resource_type,
                    action.resource_id
                )
            
            # Detect conflicts
            has_conflict, conflict_type, conflict_details = conflict_service.detect_conflict(
                action,
                server_data,
                server_version
            )
            
            if has_conflict:
                # Try auto-resolution
                auto_resolved, resolution = conflict_service.auto_resolve(action, conflict_type)
                
                if auto_resolved and resolution == 'discard':
                    action.status = 'skipped'
                    action.result_data = {'reason': 'duplicate_discarded'}
                    action.processed_at = timezone.now()
                    action.save()
                    
                    return {
                        'status': 'skipped',
                        'message': 'Duplicate action discarded'
                    }
                
                elif auto_resolved and resolution in ['use_client', 'use_server', 'merge']:
                    # Apply auto-resolution and continue processing
                    if resolution == 'use_server':
                        # Skip client action, server data is already current
                        action.mark_completed({'resolution': 'use_server', 'kept_server_data': True})
                        return {
                            'status': 'completed',
                            'message': 'Resolved using server data',
                            'data': server_data
                        }
                    # For use_client or merge, continue with processing
                
                else:
                    # Record conflict for manual resolution
                    conflict_service.record_conflict(
                        action,
                        conflict_type,
                        action.action_data,
                        server_data or {},
                        conflict_details.get('message') if conflict_details else None
                    )
                    
                    return {
                        'status': 'conflict',
                        'message': conflict_details.get('message') if conflict_details else 'Conflict detected',
                        'conflict_type': conflict_type
                    }
            
            # Process the action
            result = self._execute_action(action)
            
            if result['success']:
                # Mark as completed
                action.mark_completed(result.get('data'))
                
                # Mark as processed for idempotency
                redis_service.mark_processed(str(user.id), action.client_action_id)
                
                # Update version tracking
                if action.resource_type and result.get('resource_id'):
                    self._update_version(
                        user,
                        action.resource_type,
                        result.get('resource_id', action.resource_id),
                        'update' if action.resource_id else 'create'
                    )
                
                # Log success
                self._log(
                    user,
                    'info',
                    'process_action',
                    f'Action {action.action_type} completed successfully',
                    sync_action=action
                )
                
                return {
                    'status': 'completed',
                    'message': result.get('message', 'Action completed'),
                    'data': result.get('data')
                }
            else:
                # Mark as failed
                action.mark_failed(result.get('error', 'Unknown error'))
                
                # Log failure
                self._log(
                    user,
                    'error',
                    'process_action',
                    f'Action {action.action_type} failed: {result.get("error")}',
                    sync_action=action
                )
                
                return {
                    'status': 'failed',
                    'message': result.get('error', 'Action failed')
                }
            
        except Exception as e:
            logger.error(f"Error processing action {action_id}: {str(e)}")
            action.mark_failed(str(e))
            
            self._log(
                user,
                'error',
                'process_action',
                f'Exception processing {action.action_type}: {str(e)}',
                sync_action=action
            )
            
            return {
                'status': 'failed',
                'message': str(e)
            }
        
        finally:
            # Clear processing flag
            redis_service.clear_processing(action_id)
    
    def _execute_action(self, action: SyncAction) -> Dict[str, Any]:
        """
        Execute the actual action by delegating to appropriate service.
        
        Args:
            action: The sync action to execute
        
        Returns:
            Execution result with success status and data
        """
        action_type = action.action_type
        action_data = action.action_data
        user = action.user
        
        # Get processor info
        processor_info = self.ACTION_PROCESSORS.get(action_type)
        
        if not processor_info:
            return {
                'success': False,
                'error': f'Unknown action type: {action_type}'
            }
        
        app_name, method_name = processor_info
        
        try:
            # Get or create processor
            processor = self._get_processor(app_name, method_name)
            
            if processor is None:
                # Use generic processor
                return self._generic_process(action_type, action_data, user)
            
            # Execute processor
            result = processor(user, action_data)
            
            return result
            
        except Exception as e:
            logger.error(f"Error executing {action_type}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_processor(self, app_name: str, method_name: str):
        """
        Get processor function for an action.
        Caches processors for performance.
        """
        cache_key = f"{app_name}.{method_name}"
        
        if cache_key in self._processors_cache:
            return self._processors_cache[cache_key]
        
        try:
            # Try to import the service
            # This would need actual service implementations in each app
            processor = None
            
            # For now, return None to use generic processor
            # In production, this would import actual services:
            #
            # if app_name == 'appointments':
            #     from apps.appointments.services.sync_handlers import SyncHandlers
            #     processor = getattr(SyncHandlers, method_name, None)
            
            self._processors_cache[cache_key] = processor
            return processor
            
        except ImportError as e:
            logger.warning(f"Could not import processor for {app_name}.{method_name}: {e}")
            self._processors_cache[cache_key] = None
            return None
    
    def _generic_process(
        self,
        action_type: str,
        action_data: Dict[str, Any],
        user
    ) -> Dict[str, Any]:
        """
        Generic processor for actions without specific handlers.
        
        This is a fallback that handles common CRUD operations.
        """
        try:
            # Parse action type
            parts = action_type.split('_')
            if len(parts) < 2:
                return {
                    'success': False,
                    'error': f'Invalid action type format: {action_type}'
                }
            
            operation = parts[-1]  # create, update, delete, etc.
            resource = '_'.join(parts[:-1])  # appointment, reminder, etc.
            
            # Map resources to models
            model_mapping = {
                'appointment': ('apps.appointments.models', 'Appointment'),
                'reminder': ('apps.medicine.models', 'MedicineReminder'),
                'vitals': ('apps.health_records.models', 'VitalSign'),
                'condition': ('apps.health_records.models', 'MedicalCondition'),
                'allergy': ('apps.health_records.models', 'Allergy'),
                'emergency_contact': ('apps.emergency.models', 'EmergencyContact'),
                'notification': ('apps.notifications.models', 'Notification'),
            }
            
            if resource not in model_mapping:
                return {
                    'success': False,
                    'error': f'Unknown resource type: {resource}'
                }
            
            module_path, model_name = model_mapping[resource]
            
            # Import model
            import importlib
            module = importlib.import_module(module_path)
            Model = getattr(module, model_name)
            
            # Execute operation
            if operation == 'create':
                return self._generic_create(Model, user, action_data)
            elif operation == 'update':
                return self._generic_update(Model, user, action_data)
            elif operation == 'delete':
                return self._generic_delete(Model, user, action_data)
            elif operation in ['taken', 'skipped', 'read']:
                return self._generic_status_update(Model, user, action_data, operation)
            else:
                return {
                    'success': False,
                    'error': f'Unknown operation: {operation}'
                }
            
        except Exception as e:
            logger.error(f"Generic process error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generic_create(self, Model, user, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generic create operation."""
        try:
            # Remove non-model fields
            clean_data = {k: v for k, v in data.items() if not k.startswith('_')}
            
            # Add user if model has user field
            if hasattr(Model, 'user'):
                clean_data['user'] = user
            elif hasattr(Model, 'patient'):
                clean_data['patient'] = user
            
            with transaction.atomic():
                instance = Model.objects.create(**clean_data)
            
            return {
                'success': True,
                'message': f'{Model.__name__} created successfully',
                'data': {'id': str(instance.id)},
                'resource_id': str(instance.id)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generic_update(self, Model, user, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generic update operation."""
        try:
            resource_id = data.get('id') or data.get('resource_id')
            if not resource_id:
                return {
                    'success': False,
                    'error': 'Resource ID is required for update'
                }
            
            # Get instance
            try:
                if hasattr(Model, 'user'):
                    instance = Model.objects.get(id=resource_id, user=user)
                elif hasattr(Model, 'patient'):
                    instance = Model.objects.get(id=resource_id, patient=user)
                else:
                    instance = Model.objects.get(id=resource_id)
            except Model.DoesNotExist:
                return {
                    'success': False,
                    'error': f'{Model.__name__} not found'
                }
            
            # Update fields
            update_data = {k: v for k, v in data.items() 
                         if not k.startswith('_') and k not in ['id', 'resource_id', 'user', 'patient']}
            
            with transaction.atomic():
                for field, value in update_data.items():
                    if hasattr(instance, field):
                        setattr(instance, field, value)
                instance.save()
            
            return {
                'success': True,
                'message': f'{Model.__name__} updated successfully',
                'data': {'id': str(instance.id)},
                'resource_id': str(instance.id)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generic_delete(self, Model, user, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generic delete operation."""
        try:
            resource_id = data.get('id') or data.get('resource_id')
            if not resource_id:
                return {
                    'success': False,
                    'error': 'Resource ID is required for delete'
                }
            
            # Get instance
            try:
                if hasattr(Model, 'user'):
                    instance = Model.objects.get(id=resource_id, user=user)
                elif hasattr(Model, 'patient'):
                    instance = Model.objects.get(id=resource_id, patient=user)
                else:
                    instance = Model.objects.get(id=resource_id)
            except Model.DoesNotExist:
                return {
                    'success': True,  # Already deleted
                    'message': f'{Model.__name__} already deleted',
                    'data': {'id': str(resource_id)}
                }
            
            with transaction.atomic():
                instance.delete()
            
            return {
                'success': True,
                'message': f'{Model.__name__} deleted successfully',
                'data': {'id': str(resource_id)}
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generic_status_update(
        self,
        Model,
        user,
        data: Dict[str, Any],
        status: str
    ) -> Dict[str, Any]:
        """Generic status update (taken, skipped, read, etc.)."""
        try:
            resource_id = data.get('id') or data.get('resource_id')
            if not resource_id:
                return {
                    'success': False,
                    'error': 'Resource ID is required'
                }
            
            # Get instance
            try:
                if hasattr(Model, 'user'):
                    instance = Model.objects.get(id=resource_id, user=user)
                elif hasattr(Model, 'patient'):
                    instance = Model.objects.get(id=resource_id, patient=user)
                else:
                    instance = Model.objects.get(id=resource_id)
            except Model.DoesNotExist:
                return {
                    'success': False,
                    'error': f'{Model.__name__} not found'
                }
            
            # Update status field
            status_field_mapping = {
                'taken': ('status', 'taken'),
                'skipped': ('status', 'skipped'),
                'read': ('is_read', True),
            }
            
            if status in status_field_mapping:
                field, value = status_field_mapping[status]
                if hasattr(instance, field):
                    setattr(instance, field, value)
                    
                    # Set timestamp if applicable
                    timestamp_field = f'{status}_at'
                    if hasattr(instance, timestamp_field):
                        setattr(instance, timestamp_field, timezone.now())
                    
                    instance.save()
            
            return {
                'success': True,
                'message': f'{Model.__name__} marked as {status}',
                'data': {'id': str(resource_id), 'status': status}
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    def _get_server_resource(
        self,
        user,
        resource_type: str,
        resource_id: str
    ) -> Tuple[Optional[Dict[str, Any]], Optional[int]]:
        """
        Get current server data and version for a resource.
        
        Returns:
            Tuple of (data_dict, version)
        """
        try:
            # Get version
            try:
                version_record = DataVersion.objects.get(
                    user=user,
                    resource_type=resource_type,
                    resource_id=resource_id
                )
                version = version_record.version
            except DataVersion.DoesNotExist:
                version = None
            
            # Get actual data
            model_mapping = {
                'appointment': ('apps.appointments.models', 'Appointment'),
                'reminder': ('apps.medicine.models', 'MedicineReminder'),
                'vitals': ('apps.health_records.models', 'VitalSign'),
                'condition': ('apps.health_records.models', 'MedicalCondition'),
                'allergy': ('apps.health_records.models', 'Allergy'),
                'emergency_contact': ('apps.emergency.models', 'EmergencyContact'),
            }
            
            if resource_type not in model_mapping:
                return (None, version)
            
            module_path, model_name = model_mapping[resource_type]
            
            import importlib
            module = importlib.import_module(module_path)
            Model = getattr(module, model_name)
            
            try:
                instance = Model.objects.get(id=resource_id)
                # Convert to dict (simplified)
                data = {
                    'id': str(instance.id),
                    'updated_at': instance.updated_at.isoformat() if hasattr(instance, 'updated_at') else None
                }
                return (data, version)
            except Model.DoesNotExist:
                return (None, version)
            
        except Exception as e:
            logger.error(f"Error getting server resource: {str(e)}")
            return (None, None)
    
    def _update_version(
        self,
        user,
        resource_type: str,
        resource_id: str,
        action: str = 'update'
    ):
        """Update version tracking for a resource."""
        try:
            version = DataVersion.get_or_create_version(user, resource_type, resource_id)
            version.increment_version(action)
            
            # Cache in Redis
            redis_service.cache_conflict(resource_type, resource_id, version.version)
            
        except Exception as e:
            logger.error(f"Error updating version: {str(e)}")
    
    def _log(
        self,
        user,
        level: str,
        operation: str,
        message: str,
        sync_action: SyncAction = None,
        sync_batch: SyncBatch = None,
        extra_data: Dict[str, Any] = None
    ):
        """Create a sync log entry."""
        try:
            SyncLog.objects.create(
                user=user,
                level=level,
                operation=operation,
                message=message,
                sync_action=sync_action,
                sync_batch=sync_batch,
                extra_data=extra_data
            )
        except Exception as e:
            logger.error(f"Error creating sync log: {str(e)}")
    
    # =========================================================================
    # RETRY HANDLING
    # =========================================================================
    
    def retry_failed_actions(self, user, max_actions: int = 10) -> Dict[str, Any]:
        """
        Retry failed actions for a user.
        
        Args:
            user: The user
            max_actions: Maximum number of actions to retry
        
        Returns:
            Retry results
        """
        failed_actions = SyncAction.objects.filter(
            user=user,
            status='failed'
        ).order_by('client_timestamp')[:max_actions]
        
        results = {
            'retried': 0,
            'success': 0,
            'failed': 0,
            'skipped': 0
        }
        
        for action in failed_actions:
            if not action.can_retry():
                results['skipped'] += 1
                continue
            
            results['retried'] += 1
            
            # Reset status
            action.status = 'pending'
            action.save(update_fields=['status'])
            
            # Process
            result = self.process_action(action)
            
            if result['status'] == 'completed':
                results['success'] += 1
            else:
                results['failed'] += 1
        
        self._log(
            user,
            'info',
            'retry',
            f'Retried {results["retried"]} actions: {results["success"]} success, {results["failed"]} failed',
            extra_data=results
        )
        
        return results
    
    def get_queue_stats(self, user) -> Dict[str, Any]:
        """Get queue statistics for a user."""
        actions = SyncAction.objects.filter(user=user)
        
        return {
            'total': actions.count(),
            'pending': actions.filter(status='pending').count(),
            'processing': actions.filter(status='processing').count(),
            'completed': actions.filter(status='completed').count(),
            'failed': actions.filter(status='failed').count(),
            'conflict': actions.filter(status='conflict').count(),
            'skipped': actions.filter(status='skipped').count(),
            'retriable': actions.filter(
                status='failed',
                retry_count__lt=models.F('max_retries')
            ).count()
        }


# Singleton instance
queue_service = QueueService()