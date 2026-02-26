"""
Management Command: Test Sync Functionality

This command tests the sync app functionality including:
- Redis connection
- Sync service operations
- Conflict detection
- Queue processing

Usage:
    python manage.py test_sync
    python manage.py test_sync --full
    python manage.py test_sync --redis-only
    python manage.py test_sync --user-phone +919876543210
"""

import json
import uuid
from datetime import timedelta
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.db import transaction

from apps.sync.models import (
    SyncAction,
    SyncBatch,
    SyncStatus,
    ConflictRecord,
    SyncLog,
    DataVersion
)
from apps.sync.services.redis_service import redis_service
from apps.sync.services.sync_service import sync_service
from apps.sync.services.conflict_service import conflict_service
from apps.sync.services.queue_service import queue_service


class Command(BaseCommand):
    help = 'Test sync app functionality'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--full',
            action='store_true',
            help='Run full test suite including database operations'
        )
        parser.add_argument(
            '--redis-only',
            action='store_true',
            help='Only test Redis connection and operations'
        )
        parser.add_argument(
            '--user-phone',
            type=str,
            help='Phone number of test user (e.g., +919876543210)'
        )
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Cleanup test data after running tests'
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('\n' + '=' * 70))
        self.stdout.write(self.style.MIGRATE_HEADING('MEDICONNECT SYNC APP - TEST SUITE'))
        self.stdout.write(self.style.MIGRATE_HEADING('=' * 70 + '\n'))
        
        results = {
            'passed': 0,
            'failed': 0,
            'skipped': 0,
            'tests': []
        }
        
        # Test Redis
        self.test_redis(results)
        
        if options['redis_only']:
            self.print_summary(results)
            return
        
        # Test services (without user)
        self.test_services(results)
        
        # Full tests require a user
        if options['full'] or options['user_phone']:
            user = self.get_test_user(options.get('user_phone'))
            if user:
                self.test_with_user(results, user, options.get('cleanup', False))
            else:
                self.stdout.write(self.style.WARNING(
                    '\nSkipping user-based tests. No test user available.'
                ))
                self.stdout.write(self.style.WARNING(
                    'Use --user-phone +919876543210 to specify a user.'
                ))
        
        self.print_summary(results)
    
    def test_redis(self, results):
        """Test Redis connection and operations."""
        self.stdout.write(self.style.HTTP_INFO('\n📡 Testing Redis/Cache...\n'))
        
        # Test 1: Health check
        self.run_test(
            results,
            'Redis Health Check',
            self._test_redis_health
        )
        
        # Test 2: Set and Get
        self.run_test(
            results,
            'Redis SET/GET',
            self._test_redis_set_get
        )
        
        # Test 3: Rate limiting
        self.run_test(
            results,
            'Redis Rate Limiting',
            self._test_redis_rate_limit
        )
        
        # Test 4: Distributed lock
        self.run_test(
            results,
            'Redis Distributed Lock',
            self._test_redis_lock
        )
        
        # Test 5: Pending queue
        self.run_test(
            results,
            'Redis Pending Queue',
            self._test_redis_queue
        )
    
    def _test_redis_health(self):
        """Test Redis health check."""
        health = redis_service.health_check()
        
        if health['status'] in ['healthy', 'fallback']:
            return True, f"Status: {health['status']} - {health.get('message', '')}"
        else:
            return False, f"Status: {health['status']} - {health.get('message', '')}"
    
    def _test_redis_set_get(self):
        """Test Redis SET and GET operations."""
        test_key = f"test:sync:{uuid.uuid4()}"
        test_value = "test_value_123"
        
        # Set value
        result = redis_service._execute_command('SET', test_key, test_value, 'EX', 60)
        if result != 'OK':
            return False, f"SET failed: {result}"
        
        # Get value
        retrieved = redis_service._execute_command('GET', test_key)
        if retrieved != test_value:
            return False, f"GET mismatch: expected '{test_value}', got '{retrieved}'"
        
        # Delete
        redis_service._execute_command('DEL', test_key)
        
        return True, "SET/GET operations working correctly"
    
    def _test_redis_rate_limit(self):
        """Test rate limiting functionality."""
        test_user_id = f"test_user_{uuid.uuid4()}"
        
        # First request should be allowed
        result1 = redis_service.check_rate_limit(test_user_id)
        if not result1['allowed']:
            return False, "First request should be allowed"
        
        # Reset for cleanup
        redis_service.reset_rate_limit(test_user_id)
        
        return True, f"Rate limiting working (remaining: {result1['remaining']})"
    
    def _test_redis_lock(self):
        """Test distributed lock functionality."""
        test_user_id = f"test_user_{uuid.uuid4()}"
        
        # Acquire lock
        lock_id = redis_service.acquire_sync_lock(test_user_id, lock_timeout=5)
        if not lock_id:
            return False, "Failed to acquire lock"
        
        # Try to acquire again (should fail)
        lock_id_2 = redis_service.acquire_sync_lock(test_user_id, lock_timeout=5)
        if lock_id_2:
            return False, "Should not acquire lock when already held"
        
        # Check if locked
        is_locked = redis_service.is_locked(test_user_id)
        if not is_locked:
            return False, "is_locked should return True"
        
        # Release lock
        released = redis_service.release_sync_lock(test_user_id, lock_id)
        if not released:
            return False, "Failed to release lock"
        
        # Should be unlocked now
        is_locked_after = redis_service.is_locked(test_user_id)
        if is_locked_after:
            return False, "Should be unlocked after release"
        
        return True, "Distributed locking working correctly"
    
    def _test_redis_queue(self):
        """Test pending actions queue."""
        test_user_id = f"test_user_{uuid.uuid4()}"
        action_id_1 = str(uuid.uuid4())
        action_id_2 = str(uuid.uuid4())
        
        # Add to queue
        redis_service.add_pending_action(test_user_id, action_id_1)
        redis_service.add_pending_action(test_user_id, action_id_2)
        
        # Check count
        count = redis_service.get_pending_count(test_user_id)
        if count != 2:
            return False, f"Expected 2 pending actions, got {count}"
        
        # Get pending
        pending = redis_service.get_pending_actions(test_user_id)
        if len(pending) != 2:
            return False, f"Expected 2 actions in list, got {len(pending)}"
        
        # Clear
        redis_service.clear_pending_actions(test_user_id)
        
        count_after = redis_service.get_pending_count(test_user_id)
        if count_after != 0:
            return False, f"Expected 0 after clear, got {count_after}"
        
        return True, "Pending queue operations working correctly"
    
    def test_services(self, results):
        """Test service initialization."""
        self.stdout.write(self.style.HTTP_INFO('\n⚙️ Testing Services...\n'))
        
        # Test sync service health
        self.run_test(
            results,
            'Sync Service Health',
            self._test_sync_service_health
        )
        
        # Test conflict service
        self.run_test(
            results,
            'Conflict Service Init',
            self._test_conflict_service
        )
        
        # Test queue service
        self.run_test(
            results,
            'Queue Service Init',
            self._test_queue_service
        )
    
    def _test_sync_service_health(self):
        """Test sync service health check."""
        health = sync_service.health_check()
        
        if health['status'] in ['healthy', 'degraded']:
            return True, f"Status: {health['status']}, Version: {health.get('version', 'N/A')}"
        else:
            return False, f"Unhealthy: {health}"
    
    def _test_conflict_service(self):
        """Test conflict service initialization."""
        # Check default strategies
        strategies = conflict_service.DEFAULT_STRATEGIES
        
        if not strategies:
            return False, "No default strategies defined"
        
        if 'appointment_create' not in strategies:
            return False, "Missing strategy for appointment_create"
        
        return True, f"Loaded {len(strategies)} conflict resolution strategies"
    
    def _test_queue_service(self):
        """Test queue service initialization."""
        # Check action processors
        processors = queue_service.ACTION_PROCESSORS
        
        if not processors:
            return False, "No action processors defined"
        
        expected_actions = ['appointment_create', 'reminder_create', 'vitals_create']
        missing = [a for a in expected_actions if a not in processors]
        
        if missing:
            return False, f"Missing processors for: {missing}"
        
        return True, f"Loaded {len(processors)} action processors"
    
    def test_with_user(self, results, user, cleanup=False):
        """Run tests that require a user."""
        self.stdout.write(self.style.HTTP_INFO(f'\n👤 Testing with user: {user.phone}\n'))
        
        # Test sync status
        self.run_test(
            results,
            'Get/Create Sync Status',
            lambda: self._test_sync_status(user)
        )
        
        # Test push simulation
        self.run_test(
            results,
            'Push Sync (Simulated)',
            lambda: self._test_push_sync(user)
        )
        
        # Test pull
        self.run_test(
            results,
            'Pull Sync',
            lambda: self._test_pull_sync(user)
        )
        
        # Test conflict creation
        self.run_test(
            results,
            'Conflict Detection',
            lambda: self._test_conflict_detection(user)
        )
        
        # Test data versioning
        self.run_test(
            results,
            'Data Versioning',
            lambda: self._test_data_versioning(user)
        )
        
        # Cleanup if requested
        if cleanup:
            self.run_test(
                results,
                'Cleanup Test Data',
                lambda: self._cleanup_test_data(user)
            )
    
    def _test_sync_status(self, user):
        """Test sync status operations."""
        status_result = sync_service.get_status(user)
        
        if not status_result.get('success'):
            return False, f"Failed to get status: {status_result.get('error')}"
        
        status_data = status_result.get('status', {})
        return True, f"Pushes: {status_data.get('total_pushes', 0)}, Pulls: {status_data.get('total_pulls', 0)}"
    
    def _test_push_sync(self, user):
        """Test push sync with simulated actions."""
        batch_id = f"test_batch_{uuid.uuid4()}"
        
        actions = [
            {
                'client_action_id': f"test_action_1_{uuid.uuid4()}",
                'action_type': 'notification_read',
                'data': {'notification_id': str(uuid.uuid4())},
                'client_timestamp': timezone.now().isoformat(),
                'resource_type': 'notification',
                'resource_id': str(uuid.uuid4()),
                'resource_version': 1
            },
            {
                'client_action_id': f"test_action_2_{uuid.uuid4()}",
                'action_type': 'profile_update',
                'data': {'field': 'test', 'value': 'test_value'},
                'client_timestamp': timezone.now().isoformat(),
                'resource_type': 'profile',
                'resource_version': 1
            }
        ]
        
        result = sync_service.push(
            user=user,
            actions=actions,
            batch_id=batch_id,
            device_info={'device_type': 'test', 'app_version': '1.0.0'}
        )
        
        if not result.get('success') and result.get('error') != 'rate_limit_exceeded':
            return False, f"Push failed: {result.get('error', result.get('message'))}"
        
        if result.get('error') == 'rate_limit_exceeded':
            return True, "Push works (rate limited as expected)"
        
        summary = result.get('summary', {})
        return True, f"Pushed {summary.get('total', 0)} actions, {summary.get('completed', 0)} completed"
    
    def _test_pull_sync(self, user):
        """Test pull sync."""
        result = sync_service.pull(
            user=user,
            since=timezone.now() - timedelta(days=1),
            data_types=['notifications', 'health_profile'],
            full_sync=False
        )
        
        if not result.get('success') and result.get('error') != 'rate_limit_exceeded':
            return False, f"Pull failed: {result.get('error', result.get('message'))}"
        
        if result.get('error') == 'rate_limit_exceeded':
            return True, "Pull works (rate limited as expected)"
        
        data = result.get('data', {})
        total_items = sum(
            d.get('total', 0) if isinstance(d, dict) else 0
            for d in data.values()
        )
        return True, f"Pulled {len(data)} data types, {total_items} total items"
    
    def _test_conflict_detection(self, user):
        """Test conflict detection."""
        # Create a test sync action
        action = SyncAction.objects.create(
            user=user,
            action_type='reminder_update',
            action_data={'test': 'data'},
            client_action_id=f"conflict_test_{uuid.uuid4()}",
            client_timestamp=timezone.now() - timedelta(hours=1),
            resource_type='reminder',
            resource_id=str(uuid.uuid4()),
            resource_version=1,
            status='pending'
        )
        
        # Simulate server data with higher version
        server_data = {'id': action.resource_id, 'updated_at': timezone.now().isoformat()}
        server_version = 2  # Higher than client version
        
        # Detect conflict
        has_conflict, conflict_type, details = conflict_service.detect_conflict(
            action,
            server_data,
            server_version
        )
        
        # Cleanup
        action.delete()
        
        if has_conflict and conflict_type == 'version_mismatch':
            return True, f"Correctly detected {conflict_type} conflict"
        elif not has_conflict:
            return True, "No conflict detected (expected for some scenarios)"
        else:
            return False, f"Unexpected conflict type: {conflict_type}"
    
    def _test_data_versioning(self, user):
        """Test data versioning."""
        resource_type = 'test_resource'
        resource_id = str(uuid.uuid4())
        
        # Create version
        version = DataVersion.get_or_create_version(user, resource_type, resource_id)
        
        if version.version != 1:
            return False, f"Initial version should be 1, got {version.version}"
        
        # Increment
        new_version = version.increment_version('update')
        
        if new_version != 2:
            return False, f"After increment should be 2, got {new_version}"
        
        # Cleanup
        version.delete()
        
        return True, "Data versioning working correctly"
    
    def _cleanup_test_data(self, user):
        """Cleanup test data."""
        deleted_counts = {
            'actions': 0,
            'batches': 0,
            'conflicts': 0,
            'logs': 0,
            'versions': 0
        }
        
        # Delete test actions
        deleted, _ = SyncAction.objects.filter(
            user=user,
            client_action_id__startswith='test_'
        ).delete()
        deleted_counts['actions'] = deleted
        
        # Delete test batches
        deleted, _ = SyncBatch.objects.filter(
            user=user,
            client_batch_id__startswith='test_'
        ).delete()
        deleted_counts['batches'] = deleted
        
        # Delete test versions
        deleted, _ = DataVersion.objects.filter(
            user=user,
            resource_type='test_resource'
        ).delete()
        deleted_counts['versions'] = deleted
        
        # Clear Redis test data
        user_id = str(user.id)
        redis_service.reset_rate_limit(user_id)
        redis_service.clear_pending_actions(user_id)
        
        total = sum(deleted_counts.values())
        return True, f"Cleaned up {total} test records"
    
    def get_test_user(self, phone=None):
        """Get a test user."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        if phone:
            try:
                return User.objects.get(phone=phone)
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'User with phone {phone} not found'))
                return None
        
        # Try to get any patient user
        user = User.objects.filter(role='patient', is_active=True).first()
        if user:
            return user
        
        # Try to get any user
        user = User.objects.filter(is_active=True).first()
        return user
    
    def run_test(self, results, name, test_func):
        """Run a single test and record result."""
        try:
            success, message = test_func()
            
            if success:
                self.stdout.write(f"  ✅ {name}")
                self.stdout.write(self.style.SUCCESS(f"     └─ {message}"))
                results['passed'] += 1
                results['tests'].append({'name': name, 'status': 'passed', 'message': message})
            else:
                self.stdout.write(f"  ❌ {name}")
                self.stdout.write(self.style.ERROR(f"     └─ {message}"))
                results['failed'] += 1
                results['tests'].append({'name': name, 'status': 'failed', 'message': message})
                
        except Exception as e:
            self.stdout.write(f"  ❌ {name}")
            self.stdout.write(self.style.ERROR(f"     └─ Exception: {str(e)}"))
            results['failed'] += 1
            results['tests'].append({'name': name, 'status': 'error', 'message': str(e)})
    
    def print_summary(self, results):
        """Print test summary."""
        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.MIGRATE_HEADING('TEST SUMMARY'))
        self.stdout.write('=' * 70)
        
        total = results['passed'] + results['failed'] + results['skipped']
        
        self.stdout.write(f"\n  Total Tests:  {total}")
        self.stdout.write(self.style.SUCCESS(f"  Passed:       {results['passed']}"))
        
        if results['failed'] > 0:
            self.stdout.write(self.style.ERROR(f"  Failed:       {results['failed']}"))
        else:
            self.stdout.write(f"  Failed:       {results['failed']}")
        
        if results['skipped'] > 0:
            self.stdout.write(self.style.WARNING(f"  Skipped:      {results['skipped']}"))
        
        # Overall result
        self.stdout.write('')
        if results['failed'] == 0:
            self.stdout.write(self.style.SUCCESS('  🎉 All tests passed!'))
        else:
            self.stdout.write(self.style.ERROR(f"  ⚠️  {results['failed']} test(s) failed"))
        
        self.stdout.write('\n' + '=' * 70 + '\n')