"""
Main Sync Service - Orchestrates all sync operations

This is the main entry point for sync operations:
- Push: Receive offline actions from frontend
- Pull: Send updated data to frontend
- Status: Get sync status for user
- Conflict Resolution: Handle data conflicts
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import transaction
from django.db.models import Q

from ..models import (
    SyncAction,
    SyncBatch,
    SyncStatus,
    ConflictRecord,
    SyncLog,
    DataVersion
)
from .redis_service import redis_service
from .conflict_service import conflict_service
from .queue_service import queue_service

logger = logging.getLogger(__name__)


class SyncService:
    """
    Main sync service that orchestrates all sync operations.
    """
    
    # Data types available for pull sync
    PULLABLE_DATA_TYPES = [
        'appointments',
        'consultations',
        'prescriptions',
        'reminders',
        'health_profile',
        'vital_signs',
        'conditions',
        'allergies',
        'vaccinations',
        'documents',
        'emergency_contacts',
        'notifications',
        'chat_sessions',
    ]
    
    # Maximum actions per push request
    MAX_ACTIONS_PER_PUSH = 50
    
    # Maximum items per pull response
    MAX_ITEMS_PER_PULL = 100
    
    def __init__(self):
        """Initialize sync service."""
        pass
    
    # =========================================================================
    # PUSH OPERATIONS (Frontend → Backend)
    # =========================================================================
    
    def push(
        self,
        user,
        actions: List[Dict[str, Any]],
        batch_id: str,
        device_info: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Push offline actions from frontend to backend.
        
        Args:
            user: The user pushing actions
            actions: List of action dictionaries
            batch_id: Client-generated batch ID
            device_info: Device information
        
        Returns:
            Push result with status for each action
        """
        user_id = str(user.id)
        
        # Rate limiting check
        rate_check = redis_service.check_rate_limit(user_id)
        if not rate_check['allowed']:
            self._log(
                user,
                'warning',
                'rate_limit',
                f'Rate limit exceeded. Reset in {rate_check["reset_in"]}s'
            )
            return {
                'success': False,
                'error': 'rate_limit_exceeded',
                'message': f'Too many sync requests. Please wait {rate_check["reset_in"]} seconds.',
                'retry_after': rate_check['reset_in']
            }
        
        # Acquire sync lock
        lock_id = redis_service.acquire_sync_lock(user_id)
        if not lock_id:
            return {
                'success': False,
                'error': 'sync_in_progress',
                'message': 'Another sync operation is in progress. Please wait.'
            }
        
        try:
            # Validate actions count
            if len(actions) > self.MAX_ACTIONS_PER_PUSH:
                return {
                    'success': False,
                    'error': 'too_many_actions',
                    'message': f'Maximum {self.MAX_ACTIONS_PER_PUSH} actions per push request.'
                }
            
            # Check for duplicate batch
            existing_batch = SyncBatch.objects.filter(
                user=user,
                client_batch_id=batch_id
            ).first()
            
            if existing_batch:
                # Return existing batch result
                return {
                    'success': True,
                    'message': 'Batch already processed',
                    'batch_id': str(existing_batch.id),
                    'status': existing_batch.status,
                    'results': self._get_batch_results(existing_batch)
                }
            
            # Create batch record
            batch = SyncBatch.objects.create(
                user=user,
                client_batch_id=batch_id,
                total_actions=len(actions),
                device_info=device_info,
                status='received'
            )
            
            # Create sync actions
            sync_actions = self._create_sync_actions(user, actions, batch)
            
            # Process batch
            results = queue_service.process_batch(batch, sync_actions)
            
            # Update sync status
            self._update_sync_status(user, 'push', device_info)
            
            # Update Redis cache
            redis_service.set_last_sync(user_id, 'push')
            
            return {
                'success': True,
                'message': 'Sync completed',
                'batch_id': str(batch.id),
                'status': batch.status,
                'summary': {
                    'total': results['total'],
                    'completed': results['completed'],
                    'failed': results['failed'],
                    'conflicts': results['conflicts'],
                    'skipped': results['skipped']
                },
                'results': results['details'],
                'rate_limit': {
                    'remaining': rate_check['remaining'] - 1,
                    'reset_in': rate_check['reset_in']
                }
            }
            
        except Exception as e:
            logger.error(f"Push error for user {user_id}: {str(e)}")
            self._log(user, 'error', 'push', f'Push failed: {str(e)}')
            return {
                'success': False,
                'error': 'sync_failed',
                'message': str(e)
            }
        
        finally:
            # Release lock
            redis_service.release_sync_lock(user_id, lock_id)
    
    def _create_sync_actions(
        self,
        user,
        actions: List[Dict[str, Any]],
        batch: SyncBatch
    ) -> List[SyncAction]:
        """Create SyncAction records from action dictionaries."""
        sync_actions = []
        
        for action_data in actions:
            try:
                # Validate required fields
                client_action_id = action_data.get('client_action_id')
                action_type = action_data.get('action_type')
                
                if not client_action_id or not action_type:
                    logger.warning(f"Invalid action data: missing required fields")
                    continue
                
                # Check for duplicate
                existing = SyncAction.objects.filter(
                    user=user,
                    client_action_id=client_action_id
                ).first()
                
                if existing:
                    sync_actions.append(existing)
                    continue
                
                # Parse client timestamp
                client_timestamp = action_data.get('client_timestamp')
                if isinstance(client_timestamp, str):
                    try:
                        client_timestamp = datetime.fromisoformat(
                            client_timestamp.replace('Z', '+00:00')
                        )
                    except ValueError:
                        client_timestamp = timezone.now()
                elif not client_timestamp:
                    client_timestamp = timezone.now()
                
                # Create action
                sync_action = SyncAction.objects.create(
                    user=user,
                    action_type=action_type,
                    action_data=action_data.get('data', {}),
                    client_action_id=client_action_id,
                    client_timestamp=client_timestamp,
                    resource_type=action_data.get('resource_type'),
                    resource_id=action_data.get('resource_id'),
                    resource_version=action_data.get('resource_version', 1),
                    status='pending'
                )
                
                sync_actions.append(sync_action)
                
                # Add to Redis pending queue
                redis_service.add_pending_action(str(user.id), str(sync_action.id))
                
            except Exception as e:
                logger.error(f"Error creating sync action: {str(e)}")
                continue
        
        return sync_actions
    
    def _get_batch_results(self, batch: SyncBatch) -> List[Dict[str, Any]]:
        """Get results for a processed batch."""
        actions = SyncAction.objects.filter(
            user=batch.user,
            server_timestamp__gte=batch.received_at,
            server_timestamp__lte=batch.completed_at or timezone.now()
        )
        
        return [
            {
                'action_id': str(action.id),
                'client_action_id': action.client_action_id,
                'action_type': action.action_type,
                'status': action.status,
                'result_data': action.result_data,
                'error_message': action.error_message
            }
            for action in actions
        ]
    
    # =========================================================================
    # PULL OPERATIONS (Backend → Frontend)
    # =========================================================================
    
    def pull(
        self,
        user,
        since: datetime = None,
        data_types: List[str] = None,
        full_sync: bool = False
    ) -> Dict[str, Any]:
        """
        Pull updated data from backend to frontend.
        
        Args:
            user: The user pulling data
            since: Only get data modified after this timestamp
            data_types: List of data types to pull (None = all)
            full_sync: If True, ignore 'since' and get all data
        
        Returns:
            Pull result with data for each type
        """
        user_id = str(user.id)
        
        # Rate limiting check
        rate_check = redis_service.check_rate_limit(user_id)
        if not rate_check['allowed']:
            return {
                'success': False,
                'error': 'rate_limit_exceeded',
                'message': f'Too many sync requests. Please wait {rate_check["reset_in"]} seconds.',
                'retry_after': rate_check['reset_in']
            }
        
        try:
            # Determine sync timestamp
            if full_sync:
                since = None
            elif since is None:
                # Get last pull timestamp from Redis or DB
                last_pull = redis_service.get_last_sync(user_id, 'pull')
                if last_pull:
                    try:
                        since = datetime.fromisoformat(last_pull)
                    except ValueError:
                        since = None
                else:
                    # Check database
                    sync_status = SyncStatus.objects.filter(user=user).first()
                    if sync_status and sync_status.last_pull_at:
                        since = sync_status.last_pull_at
            
            # Determine data types to pull
            if data_types:
                # Validate requested types
                data_types = [dt for dt in data_types if dt in self.PULLABLE_DATA_TYPES]
            else:
                data_types = self.PULLABLE_DATA_TYPES
            
            # Pull data for each type
            data = {}
            pull_timestamp = timezone.now()
            
            for data_type in data_types:
                try:
                    type_data = self._pull_data_type(user, data_type, since)
                    if type_data:
                        data[data_type] = type_data
                except Exception as e:
                    logger.error(f"Error pulling {data_type}: {str(e)}")
                    data[data_type] = {'error': str(e)}
            
            # Get pending conflicts
            pending_conflicts = conflict_service.get_pending_conflicts(user)
            conflicts_data = [
                {
                    'id': str(c.id),
                    'conflict_type': c.conflict_type,
                    'resource_type': c.resource_type,
                    'resource_id': c.resource_id,
                    'description': c.description,
                    'client_data': c.client_data,
                    'server_data': c.server_data,
                    'created_at': c.created_at.isoformat()
                }
                for c in pending_conflicts[:10]  # Limit to 10
            ]
            
            # Update sync status
            self._update_sync_status(user, 'pull')
            redis_service.set_last_sync(user_id, 'pull')
            
            if full_sync:
                self._update_sync_status(user, 'full')
                redis_service.set_last_sync(user_id, 'full')
            
            return {
                'success': True,
                'message': 'Data retrieved successfully',
                'sync_timestamp': pull_timestamp.isoformat(),
                'since': since.isoformat() if since else None,
                'full_sync': full_sync,
                'data': data,
                'conflicts': conflicts_data,
                'has_more_conflicts': len(pending_conflicts) > 10,
                'rate_limit': {
                    'remaining': rate_check['remaining'] - 1,
                    'reset_in': rate_check['reset_in']
                }
            }
            
        except Exception as e:
            logger.error(f"Pull error for user {user_id}: {str(e)}")
            self._log(user, 'error', 'pull', f'Pull failed: {str(e)}')
            return {
                'success': False,
                'error': 'pull_failed',
                'message': str(e)
            }
    
    def _pull_data_type(
        self,
        user,
        data_type: str,
        since: datetime = None
    ) -> Dict[str, Any]:
        """
        Pull data for a specific type.
        
        Returns dict with 'items' list and 'total' count.
        """
        try:
            # Map data types to model queries
            if data_type == 'appointments':
                return self._pull_appointments(user, since)
            elif data_type == 'consultations':
                return self._pull_consultations(user, since)
            elif data_type == 'prescriptions':
                return self._pull_prescriptions(user, since)
            elif data_type == 'reminders':
                return self._pull_reminders(user, since)
            elif data_type == 'health_profile':
                return self._pull_health_profile(user, since)
            elif data_type == 'vital_signs':
                return self._pull_vital_signs(user, since)
            elif data_type == 'conditions':
                return self._pull_conditions(user, since)
            elif data_type == 'allergies':
                return self._pull_allergies(user, since)
            elif data_type == 'vaccinations':
                return self._pull_vaccinations(user, since)
            elif data_type == 'documents':
                return self._pull_documents(user, since)
            elif data_type == 'emergency_contacts':
                return self._pull_emergency_contacts(user, since)
            elif data_type == 'notifications':
                return self._pull_notifications(user, since)
            elif data_type == 'chat_sessions':
                return self._pull_chat_sessions(user, since)
            else:
                return {'items': [], 'total': 0}
                
        except Exception as e:
            logger.error(f"Error pulling {data_type}: {str(e)}")
            return {'error': str(e)}
    
    def _pull_appointments(self, user, since: datetime = None) -> Dict[str, Any]:
        """Pull appointments data."""
        try:
            from apps.appointments.models import Appointment
            
            queryset = Appointment.objects.filter(patient=user)
            
            if since:
                queryset = queryset.filter(
                    Q(updated_at__gt=since) | Q(created_at__gt=since)
                )
            
            # Get upcoming and recent appointments
            queryset = queryset.filter(
                slot__date__gte=timezone.now().date() - timedelta(days=7)
            ).order_by('-slot__date', '-slot__start_time')[:self.MAX_ITEMS_PER_PULL]
            
            items = [
                {
                    'id': str(apt.id),
                    'doctor_id': str(apt.doctor.id),
                    'doctor_name': apt.doctor.get_full_name(),
                    'slot_id': str(apt.slot.id) if apt.slot else None,
                    'date': str(apt.slot.date) if apt.slot else None,
                    'time': str(apt.slot.start_time) if apt.slot else None,
                    'status': apt.status,
                    'reason': apt.reason,
                    'notes': apt.notes,
                    'created_at': apt.created_at.isoformat(),
                    'updated_at': apt.updated_at.isoformat(),
                    '_version': self._get_version(user, 'appointment', str(apt.id))
                }
                for apt in queryset
            ]
            
            return {'items': items, 'total': len(items)}
            
        except ImportError:
            return {'items': [], 'total': 0, 'error': 'Module not available'}
        except Exception as e:
            return {'error': str(e)}
    
    def _pull_consultations(self, user, since: datetime = None) -> Dict[str, Any]:
        """Pull consultations data."""
        try:
            from apps.consultation.models import Consultation
            
            queryset = Consultation.objects.filter(patient=user)
            
            if since:
                queryset = queryset.filter(updated_at__gt=since)
            
            queryset = queryset.order_by('-scheduled_time')[:self.MAX_ITEMS_PER_PULL]
            
            items = [
                {
                    'id': str(c.id),
                    'doctor_id': str(c.doctor.id),
                    'doctor_name': c.doctor.get_full_name(),
                    'scheduled_time': c.scheduled_time.isoformat() if c.scheduled_time else None,
                    'status': c.status,
                    'consultation_type': c.consultation_type,
                    'room_url': c.room.room_url if c.room else None,
                    'created_at': c.created_at.isoformat(),
                    'updated_at': c.updated_at.isoformat(),
                    '_version': self._get_version(user, 'consultation', str(c.id))
                }
                for c in queryset
            ]
            
            return {'items': items, 'total': len(items)}
            
        except ImportError:
            return {'items': [], 'total': 0, 'error': 'Module not available'}
        except Exception as e:
            return {'error': str(e)}
    
    def _pull_prescriptions(self, user, since: datetime = None) -> Dict[str, Any]:
        """Pull prescriptions data."""
        try:
            from apps.medicine.models import UserPrescription
            
            queryset = UserPrescription.objects.filter(user=user)
            
            if since:
                queryset = queryset.filter(updated_at__gt=since)
            
            queryset = queryset.order_by('-date_prescribed')[:self.MAX_ITEMS_PER_PULL]
            
            items = [
                {
                    'id': str(p.id),
                    'doctor_name': p.doctor.get_full_name() if p.doctor else None,
                    'date_prescribed': str(p.date_prescribed),
                    'is_active': p.is_active,
                    'medicines': [
                        {
                            'id': str(pm.id),
                            'medicine_name': pm.medicine.name if pm.medicine else pm.medicine_name,
                            'dosage': pm.dosage,
                            'frequency': pm.frequency,
                            'duration': pm.duration,
                            'instructions': pm.instructions
                        }
                        for pm in p.medicines.all()
                    ],
                    'created_at': p.created_at.isoformat(),
                    'updated_at': p.updated_at.isoformat(),
                    '_version': self._get_version(user, 'prescription', str(p.id))
                }
                for p in queryset
            ]
            
            return {'items': items, 'total': len(items)}
            
        except ImportError:
            return {'items': [], 'total': 0, 'error': 'Module not available'}
        except Exception as e:
            return {'error': str(e)}
    
    def _pull_reminders(self, user, since: datetime = None) -> Dict[str, Any]:
        """Pull medicine reminders data."""
        try:
            from apps.medicine.models import MedicineReminder
            
            queryset = MedicineReminder.objects.filter(user=user, is_active=True)
            
            if since:
                queryset = queryset.filter(updated_at__gt=since)
            
            queryset = queryset.order_by('-created_at')[:self.MAX_ITEMS_PER_PULL]
            
            items = [
                {
                    'id': str(r.id),
                    'medicine_name': r.medicine.name if r.medicine else r.medicine_name,
                    'dosage': r.dosage,
                    'times': r.times,
                    'days': r.days,
                    'start_date': str(r.start_date) if r.start_date else None,
                    'end_date': str(r.end_date) if r.end_date else None,
                    'is_active': r.is_active,
                    'created_at': r.created_at.isoformat(),
                    'updated_at': r.updated_at.isoformat(),
                    '_version': self._get_version(user, 'reminder', str(r.id))
                }
                for r in queryset
            ]
            
            return {'items': items, 'total': len(items)}
            
        except ImportError:
            return {'items': [], 'total': 0, 'error': 'Module not available'}
        except Exception as e:
            return {'error': str(e)}
    
    def _pull_health_profile(self, user, since: datetime = None) -> Dict[str, Any]:
        """Pull health profile data."""
        try:
            from apps.health_records.models import HealthProfile
            
            try:
                profile = HealthProfile.objects.get(user=user)
                
                if since and profile.updated_at <= since:
                    return {'items': [], 'total': 0, 'unchanged': True}
                
                item = {
                    'id': str(profile.id),
                    'blood_group': profile.blood_group,
                    'height': float(profile.height) if profile.height else None,
                    'weight': float(profile.weight) if profile.weight else None,
                    'date_of_birth': str(profile.date_of_birth) if profile.date_of_birth else None,
                    'allergies': profile.allergies,
                    'chronic_conditions': profile.chronic_conditions,
                    'current_medications': profile.current_medications,
                    'emergency_notes': profile.emergency_notes,
                    'updated_at': profile.updated_at.isoformat(),
                    '_version': self._get_version(user, 'health_profile', str(profile.id))
                }
                
                return {'items': [item], 'total': 1}
                
            except HealthProfile.DoesNotExist:
                return {'items': [], 'total': 0}
            
        except ImportError:
            return {'items': [], 'total': 0, 'error': 'Module not available'}
        except Exception as e:
            return {'error': str(e)}
    
    def _pull_vital_signs(self, user, since: datetime = None) -> Dict[str, Any]:
        """Pull vital signs data."""
        try:
            from apps.health_records.models import VitalSign
            
            queryset = VitalSign.objects.filter(user=user)
            
            if since:
                queryset = queryset.filter(recorded_at__gt=since)
            
            # Get last 30 days of vitals
            queryset = queryset.filter(
                recorded_at__gte=timezone.now() - timedelta(days=30)
            ).order_by('-recorded_at')[:self.MAX_ITEMS_PER_PULL]
            
            items = [
                {
                    'id': str(v.id),
                    'blood_pressure_systolic': v.blood_pressure_systolic,
                    'blood_pressure_diastolic': v.blood_pressure_diastolic,
                    'heart_rate': v.heart_rate,
                    'temperature': float(v.temperature) if v.temperature else None,
                    'oxygen_saturation': v.oxygen_saturation,
                    'blood_sugar': float(v.blood_sugar) if v.blood_sugar else None,
                    'weight': float(v.weight) if v.weight else None,
                    'notes': v.notes,
                    'recorded_at': v.recorded_at.isoformat(),
                    '_version': self._get_version(user, 'vital_sign', str(v.id))
                }
                for v in queryset
            ]
            
            return {'items': items, 'total': len(items)}
            
        except ImportError:
            return {'items': [], 'total': 0, 'error': 'Module not available'}
        except Exception as e:
            return {'error': str(e)}
    
    def _pull_conditions(self, user, since: datetime = None) -> Dict[str, Any]:
        """Pull medical conditions data."""
        try:
            from apps.health_records.models import MedicalCondition
            
            queryset = MedicalCondition.objects.filter(user=user)
            
            if since:
                queryset = queryset.filter(updated_at__gt=since)
            
            queryset = queryset.order_by('-diagnosed_date')[:self.MAX_ITEMS_PER_PULL]
            
            items = [
                {
                    'id': str(c.id),
                    'name': c.name,
                    'status': c.status,
                    'severity': c.severity,
                    'is_chronic': c.is_chronic,
                    'diagnosed_date': str(c.diagnosed_date) if c.diagnosed_date else None,
                    'notes': c.notes,
                    'updated_at': c.updated_at.isoformat(),
                    '_version': self._get_version(user, 'condition', str(c.id))
                }
                for c in queryset
            ]
            
            return {'items': items, 'total': len(items)}
            
        except ImportError:
            return {'items': [], 'total': 0, 'error': 'Module not available'}
        except Exception as e:
            return {'error': str(e)}
    
    def _pull_allergies(self, user, since: datetime = None) -> Dict[str, Any]:
        """Pull allergies data."""
        try:
            from apps.health_records.models import Allergy
            
            queryset = Allergy.objects.filter(user=user)
            
            if since:
                queryset = queryset.filter(updated_at__gt=since)
            
            items = [
                {
                    'id': str(a.id),
                    'allergen': a.allergen,
                    'allergy_type': a.allergy_type,
                    'severity': a.severity,
                    'reaction': a.reaction,
                    'notes': a.notes,
                    'updated_at': a.updated_at.isoformat(),
                    '_version': self._get_version(user, 'allergy', str(a.id))
                }
                for a in queryset
            ]
            
            return {'items': items, 'total': len(items)}
            
        except ImportError:
            return {'items': [], 'total': 0, 'error': 'Module not available'}
        except Exception as e:
            return {'error': str(e)}
    
    def _pull_vaccinations(self, user, since: datetime = None) -> Dict[str, Any]:
        """Pull vaccination records data."""
        try:
            from apps.health_records.models import VaccinationRecord
            
            queryset = VaccinationRecord.objects.filter(user=user)
            
            if since:
                queryset = queryset.filter(updated_at__gt=since)
            
            items = [
                {
                    'id': str(v.id),
                    'vaccine_name': v.vaccine_name,
                    'dose_number': v.dose_number,
                    'date_administered': str(v.date_administered) if v.date_administered else None,
                    'next_due_date': str(v.next_due_date) if v.next_due_date else None,
                    'administered_by': v.administered_by,
                    'location': v.location,
                    'notes': v.notes,
                    'updated_at': v.updated_at.isoformat(),
                    '_version': self._get_version(user, 'vaccination', str(v.id))
                }
                for v in queryset
            ]
            
            return {'items': items, 'total': len(items)}
            
        except ImportError:
            return {'items': [], 'total': 0, 'error': 'Module not available'}
        except Exception as e:
            return {'error': str(e)}
    
    def _pull_documents(self, user, since: datetime = None) -> Dict[str, Any]:
        """Pull medical documents metadata (not files)."""
        try:
            from apps.health_records.models import MedicalDocument
            
            queryset = MedicalDocument.objects.filter(user=user)
            
            if since:
                queryset = queryset.filter(updated_at__gt=since)
            
            queryset = queryset.order_by('-uploaded_at')[:self.MAX_ITEMS_PER_PULL]
            
            items = [
                {
                    'id': str(d.id),
                    'title': d.title,
                    'document_type': d.document_type,
                    'description': d.description,
                    'file_name': d.file_name,
                    'file_size': d.file_size,
                    'uploaded_at': d.uploaded_at.isoformat(),
                    'updated_at': d.updated_at.isoformat(),
                    '_version': self._get_version(user, 'document', str(d.id))
                }
                for d in queryset
            ]
            
            return {'items': items, 'total': len(items)}
            
        except ImportError:
            return {'items': [], 'total': 0, 'error': 'Module not available'}
        except Exception as e:
            return {'error': str(e)}
    
    def _pull_emergency_contacts(self, user, since: datetime = None) -> Dict[str, Any]:
        """Pull emergency contacts data."""
        try:
            from apps.emergency.models import EmergencyContact
            
            queryset = EmergencyContact.objects.filter(user=user)
            
            if since:
                queryset = queryset.filter(updated_at__gt=since)
            
            items = [
                {
                    'id': str(c.id),
                    'name': c.name,
                    'phone': c.phone,
                    'relationship': c.relationship,
                    'is_primary': c.is_primary,
                    'priority': c.priority,
                    'updated_at': c.updated_at.isoformat(),
                    '_version': self._get_version(user, 'emergency_contact', str(c.id))
                }
                for c in queryset
            ]
            
            return {'items': items, 'total': len(items)}
            
        except ImportError:
            return {'items': [], 'total': 0, 'error': 'Module not available'}
        except Exception as e:
            return {'error': str(e)}
    
    def _pull_notifications(self, user, since: datetime = None) -> Dict[str, Any]:
        """Pull notifications data."""
        try:
            from apps.notifications.models import Notification
            
            queryset = Notification.objects.filter(user=user)
            
            if since:
                queryset = queryset.filter(created_at__gt=since)
            else:
                # Only last 7 days if no since
                queryset = queryset.filter(
                    created_at__gte=timezone.now() - timedelta(days=7)
                )
            
            queryset = queryset.order_by('-created_at')[:self.MAX_ITEMS_PER_PULL]
            
            items = [
                {
                    'id': str(n.id),
                    'notification_type': n.notification_type,
                    'title': n.title,
                    'body': n.body,
                    'data': n.data,
                    'is_read': n.is_read,
                    'created_at': n.created_at.isoformat(),
                    '_version': self._get_version(user, 'notification', str(n.id))
                }
                for n in queryset
            ]
            
            return {'items': items, 'total': len(items)}
            
        except ImportError:
            return {'items': [], 'total': 0, 'error': 'Module not available'}
        except Exception as e:
            return {'error': str(e)}
    
    def _pull_chat_sessions(self, user, since: datetime = None) -> Dict[str, Any]:
        """Pull chat sessions data."""
        try:
            from apps.chatbot.models import ChatSession
            
            queryset = ChatSession.objects.filter(user=user)
            
            if since:
                queryset = queryset.filter(updated_at__gt=since)
            
            # Only recent sessions
            queryset = queryset.order_by('-updated_at')[:10]
            
            items = [
                {
                    'id': str(s.id),
                    'language': s.language,
                    'messages_count': s.messages.count(),
                    'created_at': s.created_at.isoformat(),
                    'updated_at': s.updated_at.isoformat(),
                    '_version': self._get_version(user, 'chat_session', str(s.id))
                }
                for s in queryset
            ]
            
            return {'items': items, 'total': len(items)}
            
        except ImportError:
            return {'items': [], 'total': 0, 'error': 'Module not available'}
        except Exception as e:
            return {'error': str(e)}
    
    # =========================================================================
    # STATUS OPERATIONS
    # =========================================================================
    
    def get_status(self, user) -> Dict[str, Any]:
        """
        Get sync status for a user.
        
        Returns comprehensive sync status including:
        - Last sync timestamps
        - Pending actions count
        - Unresolved conflicts count
        - Queue statistics
        """
        user_id = str(user.id)
        
        try:
            # Get or create sync status
            sync_status, created = SyncStatus.objects.get_or_create(user=user)
            
            # Get Redis stats
            redis_stats = redis_service.get_sync_stats(user_id)
            
            # Get queue stats
            queue_stats = queue_service.get_queue_stats(user)
            
            # Get conflict summary
            conflict_summary = conflict_service.get_conflict_summary(user)
            
            return {
                'success': True,
                'status': {
                    'last_push_at': sync_status.last_push_at.isoformat() if sync_status.last_push_at else None,
                    'last_pull_at': sync_status.last_pull_at.isoformat() if sync_status.last_pull_at else None,
                    'last_full_sync_at': sync_status.last_full_sync_at.isoformat() if sync_status.last_full_sync_at else None,
                    'total_pushes': sync_status.total_pushes,
                    'total_pulls': sync_status.total_pulls,
                    'pending_actions': queue_stats.get('pending', 0),
                    'unresolved_conflicts': conflict_summary.get('pending', 0),
                    'failed_actions': queue_stats.get('failed', 0),
                    'retriable_actions': queue_stats.get('retriable', 0),
                },
                'queue': queue_stats,
                'conflicts': conflict_summary,
                'rate_limit': redis_stats.get('rate_limit', {}),
                'is_syncing': redis_stats.get('is_locked', False)
            }
            
        except Exception as e:
            logger.error(f"Error getting sync status: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    # =========================================================================
    # CONFLICT RESOLUTION
    # =========================================================================
    
    def resolve_conflict(
        self,
        user,
        conflict_id: str,
        resolution: str,
        custom_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Resolve a sync conflict.
        
        Args:
            user: The user
            conflict_id: ID of the conflict to resolve
            resolution: Resolution type (use_server, use_client, merge, discard)
            custom_data: Custom merged data (for merge resolution)
        
        Returns:
            Resolution result
        """
        try:
            conflict = ConflictRecord.objects.get(id=conflict_id, user=user)
            
            if conflict.resolution != 'pending':
                return {
                    'success': False,
                    'error': 'already_resolved',
                    'message': 'This conflict has already been resolved'
                }
            
            success, resolved_data = conflict_service.resolve_conflict(
                conflict,
                resolution,
                user,
                custom_data
            )
            
            if success:
                # Update sync status
                sync_status, _ = SyncStatus.objects.get_or_create(user=user)
                sync_status.unresolved_conflicts_count = ConflictRecord.objects.filter(
                    user=user,
                    resolution='pending'
                ).count()
                sync_status.save(update_fields=['unresolved_conflicts_count'])
                
                return {
                    'success': True,
                    'message': f'Conflict resolved using {resolution}',
                    'resolution': resolution,
                    'resolved_data': resolved_data
                }
            else:
                return {
                    'success': False,
                    'error': 'resolution_failed',
                    'message': 'Failed to resolve conflict'
                }
                
        except ConflictRecord.DoesNotExist:
            return {
                'success': False,
                'error': 'not_found',
                'message': 'Conflict not found'
            }
        except Exception as e:
            logger.error(f"Error resolving conflict: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_conflicts(self, user, status: str = 'pending') -> Dict[str, Any]:
        """Get conflicts for a user."""
        try:
            queryset = ConflictRecord.objects.filter(user=user)
            
            if status == 'pending':
                queryset = queryset.filter(resolution='pending')
            elif status == 'resolved':
                queryset = queryset.exclude(resolution='pending')
            
            conflicts = [
                {
                    'id': str(c.id),
                    'conflict_type': c.conflict_type,
                    'resource_type': c.resource_type,
                    'resource_id': c.resource_id,
                    'description': c.description,
                    'client_data': c.client_data,
                    'server_data': c.server_data,
                    'client_version': c.client_version,
                    'server_version': c.server_version,
                    'resolution': c.resolution,
                    'created_at': c.created_at.isoformat(),
                    'resolved_at': c.resolved_at.isoformat() if c.resolved_at else None
                }
                for c in queryset.order_by('-created_at')[:50]
            ]
            
            return {
                'success': True,
                'conflicts': conflicts,
                'total': queryset.count()
            }
            
        except Exception as e:
            logger.error(f"Error getting conflicts: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    # =========================================================================
    # RETRY OPERATIONS
    # =========================================================================
    
    def retry_failed(self, user, max_actions: int = 10) -> Dict[str, Any]:
        """Retry failed sync actions."""
        try:
            results = queue_service.retry_failed_actions(user, max_actions)
            
            return {
                'success': True,
                'message': f'Retried {results["retried"]} actions',
                'results': results
            }
            
        except Exception as e:
            logger.error(f"Error retrying failed actions: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    def _update_sync_status(
        self,
        user,
        sync_type: str,
        device_info: Dict[str, Any] = None
    ):
        """Update sync status in database."""
        try:
            sync_status, created = SyncStatus.objects.get_or_create(user=user)
            
            now = timezone.now()
            
            if sync_type == 'push':
                sync_status.last_push_at = now
                sync_status.total_pushes += 1
            elif sync_type == 'pull':
                sync_status.last_pull_at = now
                sync_status.total_pulls += 1
            elif sync_type == 'full':
                sync_status.last_full_sync_at = now
            
            if device_info:
                sync_status.last_device_info = device_info
            
            # Update counts
            sync_status.pending_actions_count = SyncAction.objects.filter(
                user=user,
                status='pending'
            ).count()
            sync_status.unresolved_conflicts_count = ConflictRecord.objects.filter(
                user=user,
                resolution='pending'
            ).count()
            
            sync_status.save()
            
        except Exception as e:
            logger.error(f"Error updating sync status: {str(e)}")
    
    def _get_version(self, user, resource_type: str, resource_id: str) -> int:
        """Get version number for a resource."""
        try:
            version = DataVersion.objects.filter(
                user=user,
                resource_type=resource_type,
                resource_id=resource_id
            ).first()
            return version.version if version else 1
        except Exception:
            return 1
    
    def _log(
        self,
        user,
        level: str,
        operation: str,
        message: str,
        extra_data: Dict[str, Any] = None
    ):
        """Create sync log entry."""
        try:
            SyncLog.objects.create(
                user=user,
                level=level,
                operation=operation,
                message=message,
                extra_data=extra_data
            )
        except Exception as e:
            logger.error(f"Error creating sync log: {str(e)}")
    
    # =========================================================================
    # HEALTH CHECK
    # =========================================================================
    
    def health_check(self) -> Dict[str, Any]:
        """Check sync service health."""
        redis_health = redis_service.health_check()
        
        return {
            'status': 'healthy' if redis_health['status'] in ['healthy', 'fallback'] else 'degraded',
            'service': 'sync',
            'version': '1.0.0',
            'timestamp': timezone.now().isoformat(),
            'components': {
                'redis': redis_health,
                'database': self._check_db_health()
            }
        }
    
    def _check_db_health(self) -> Dict[str, Any]:
        """Check database health."""
        try:
            SyncStatus.objects.first()
            return {'status': 'healthy'}
        except Exception as e:
            return {'status': 'unhealthy', 'error': str(e)}


# Singleton instance
sync_service = SyncService()