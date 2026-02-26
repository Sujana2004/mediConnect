"""
Redis Service for Sync App
Uses Upstash Redis (FREE tier: 10,000 commands/day)

Features:
- Rate limiting for sync requests
- Distributed locks to prevent duplicate processing
- Caching for sync status and timestamps
- Temporary queue management
"""

import json
import time
import logging
from typing import Optional, Any, Dict, List
from datetime import timedelta
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class RedisService:
    """
    Redis service for sync operations.
    Uses Upstash Redis REST API (works without redis-py library).
    Falls back to in-memory cache if Redis is not configured.
    """
    
    # Key prefixes
    PREFIX_RATE_LIMIT = "sync:ratelimit"
    PREFIX_LOCK = "sync:lock"
    PREFIX_LAST_SYNC = "sync:last"
    PREFIX_PENDING = "sync:pending"
    PREFIX_CONFLICT = "sync:conflict"
    PREFIX_VERSION = "sync:version"
    PREFIX_PROCESSING = "sync:processing"
    
    # Default TTLs (in seconds)
    TTL_RATE_LIMIT = 60          # 1 minute
    TTL_LOCK = 30                # 30 seconds
    TTL_LAST_SYNC = 86400        # 24 hours
    TTL_CONFLICT = 300           # 5 minutes
    TTL_VERSION = 3600           # 1 hour
    TTL_PROCESSING = 120         # 2 minutes
    
    # Rate limit settings
    RATE_LIMIT_MAX_REQUESTS = 10  # Max requests per window
    RATE_LIMIT_WINDOW = 60        # Window in seconds
    
    def __init__(self):
        """Initialize Redis connection."""
        self.redis_url = getattr(settings, 'UPSTASH_REDIS_URL', None)
        self.redis_token = getattr(settings, 'UPSTASH_REDIS_TOKEN', None)
        self.use_redis = bool(self.redis_url and self.redis_token)
        
        # In-memory fallback cache
        self._memory_cache: Dict[str, Dict[str, Any]] = {}
        
        if self.use_redis:
            try:
                import requests
                self._requests = requests
                logger.info("Redis service initialized with Upstash")
            except ImportError:
                logger.warning("requests library not found, using memory cache")
                self.use_redis = False
        else:
            logger.info("Redis not configured, using in-memory cache")
    
    # =========================================================================
    # CORE REDIS OPERATIONS (Upstash REST API)
    # =========================================================================
    
    def _execute_command(self, *args) -> Optional[Any]:
        """
        Execute a Redis command via Upstash REST API.
        
        Example:
            _execute_command('SET', 'key', 'value', 'EX', 60)
            _execute_command('GET', 'key')
        """
        if not self.use_redis:
            return self._memory_fallback(*args)
        
        try:
            url = f"{self.redis_url}"
            headers = {
                "Authorization": f"Bearer {self.redis_token}",
                "Content-Type": "application/json"
            }
            
            # Convert args to Upstash format
            response = self._requests.post(
                url,
                headers=headers,
                json=list(args),
                timeout=5
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('result')
            else:
                logger.error(f"Redis command failed: {response.status_code} - {response.text}")
                return self._memory_fallback(*args)
                
        except Exception as e:
            logger.error(f"Redis error: {str(e)}")
            return self._memory_fallback(*args)
    
    def _memory_fallback(self, *args) -> Optional[Any]:
        """
        Fallback to in-memory cache when Redis is unavailable.
        Implements basic GET, SET, DEL, INCR, EXPIRE operations.
        """
        if not args:
            return None
        
        command = args[0].upper()
        
        try:
            if command == 'SET':
                key = args[1]
                value = args[2]
                ttl = None
                nx = False  # Only set if Not eXists
                xx = False  # Only set if eXists
                
                # Parse options (EX, PX, NX, XX)
                i = 3
                while i < len(args):
                    arg = str(args[i]).upper()
                    if arg == 'EX' and i + 1 < len(args):
                        ttl = int(args[i + 1])
                        i += 2
                    elif arg == 'PX' and i + 1 < len(args):
                        ttl = int(args[i + 1]) / 1000
                        i += 2
                    elif arg == 'NX':
                        nx = True
                        i += 1
                    elif arg == 'XX':
                        xx = True
                        i += 1
                    else:
                        i += 1
                
                # Check if key exists and is not expired
                key_exists = False
                if key in self._memory_cache:
                    item = self._memory_cache[key]
                    if item['expires_at'] is None or item['expires_at'] > time.time():
                        key_exists = True
                    else:
                        # Key expired, remove it
                        del self._memory_cache[key]
                
                # Handle NX (only set if not exists)
                if nx and key_exists:
                    return None  # Key exists, don't set
                
                # Handle XX (only set if exists)
                if xx and not key_exists:
                    return None  # Key doesn't exist, don't set
                
                # Set the value
                expires_at = time.time() + ttl if ttl else None
                self._memory_cache[key] = {
                    'value': value,
                    'expires_at': expires_at
                }
                return 'OK'
            
            elif command == 'GET':
                key = args[1]
                if key in self._memory_cache:
                    item = self._memory_cache[key]
                    if item['expires_at'] is None or item['expires_at'] > time.time():
                        return item['value']
                    else:
                        del self._memory_cache[key]
                return None
            
            elif command == 'DEL':
                key = args[1]
                if key in self._memory_cache:
                    del self._memory_cache[key]
                    return 1
                return 0
            
            elif command == 'INCR':
                key = args[1]
                if key in self._memory_cache:
                    item = self._memory_cache[key]
                    if item['expires_at'] is None or item['expires_at'] > time.time():
                        item['value'] = int(item['value']) + 1
                        return item['value']
                self._memory_cache[key] = {'value': 1, 'expires_at': None}
                return 1
            
            elif command == 'EXPIRE':
                key = args[1]
                ttl = int(args[2])
                if key in self._memory_cache:
                    self._memory_cache[key]['expires_at'] = time.time() + ttl
                    return 1
                return 0
            
            elif command == 'TTL':
                key = args[1]
                if key in self._memory_cache:
                    item = self._memory_cache[key]
                    if item['expires_at']:
                        remaining = int(item['expires_at'] - time.time())
                        return max(remaining, -2)
                    return -1
                return -2
            
            elif command == 'EXISTS':
                key = args[1]
                if key in self._memory_cache:
                    item = self._memory_cache[key]
                    if item['expires_at'] is None or item['expires_at'] > time.time():
                        return 1
                return 0
            
            elif command == 'SETNX':
                key = args[1]
                value = args[2]
                if key not in self._memory_cache:
                    self._memory_cache[key] = {'value': value, 'expires_at': None}
                    return 1
                item = self._memory_cache[key]
                if item['expires_at'] and item['expires_at'] <= time.time():
                    self._memory_cache[key] = {'value': value, 'expires_at': None}
                    return 1
                return 0
            
            elif command == 'LPUSH':
                key = args[1]
                values = args[2:]
                if key not in self._memory_cache:
                    self._memory_cache[key] = {'value': [], 'expires_at': None}
                self._memory_cache[key]['value'] = list(values) + self._memory_cache[key]['value']
                return len(self._memory_cache[key]['value'])
            
            elif command == 'RPOP':
                key = args[1]
                if key in self._memory_cache and self._memory_cache[key]['value']:
                    return self._memory_cache[key]['value'].pop()
                return None
            
            elif command == 'LRANGE':
                key = args[1]
                start = int(args[2])
                end = int(args[3])
                if key in self._memory_cache:
                    lst = self._memory_cache[key]['value']
                    if end == -1:
                        return lst[start:]
                    return lst[start:end + 1]
                return []
            
            elif command == 'LLEN':
                key = args[1]
                if key in self._memory_cache:
                    return len(self._memory_cache[key]['value'])
                return 0
            
        except Exception as e:
            logger.error(f"Memory cache error: {str(e)}")
        
        return None
    
    # =========================================================================
    # RATE LIMITING
    # =========================================================================
    
    def check_rate_limit(self, user_id: str) -> Dict[str, Any]:
        """
        Check if user has exceeded rate limit for sync requests.
        
        Returns:
            {
                'allowed': bool,
                'remaining': int,
                'reset_in': int (seconds)
            }
        """
        key = f"{self.PREFIX_RATE_LIMIT}:{user_id}"
        
        # Get current count
        current = self._execute_command('GET', key)
        
        if current is None:
            # First request in window
            self._execute_command('SET', key, '1', 'EX', self.RATE_LIMIT_WINDOW)
            return {
                'allowed': True,
                'remaining': self.RATE_LIMIT_MAX_REQUESTS - 1,
                'reset_in': self.RATE_LIMIT_WINDOW
            }
        
        current_count = int(current)
        
        if current_count >= self.RATE_LIMIT_MAX_REQUESTS:
            # Rate limit exceeded
            ttl = self._execute_command('TTL', key)
            return {
                'allowed': False,
                'remaining': 0,
                'reset_in': max(ttl or 0, 0)
            }
        
        # Increment counter
        new_count = self._execute_command('INCR', key)
        ttl = self._execute_command('TTL', key)
        
        return {
            'allowed': True,
            'remaining': self.RATE_LIMIT_MAX_REQUESTS - int(new_count or current_count + 1),
            'reset_in': max(ttl or 0, 0)
        }
    
    def reset_rate_limit(self, user_id: str) -> bool:
        """Reset rate limit for a user (admin use)."""
        key = f"{self.PREFIX_RATE_LIMIT}:{user_id}"
        result = self._execute_command('DEL', key)
        return result == 1
    
    # =========================================================================
    # DISTRIBUTED LOCKS
    # =========================================================================
    
    def acquire_sync_lock(self, user_id: str, lock_timeout: int = None) -> Optional[str]:
        """
        Acquire a distributed lock for sync operation.
        Prevents duplicate processing of same user's sync.
        
        Returns:
            lock_id if acquired, None if lock already held
        """
        key = f"{self.PREFIX_LOCK}:{user_id}"
        lock_id = f"{user_id}:{int(time.time() * 1000)}"
        timeout = lock_timeout or self.TTL_LOCK
        
        # Try to set lock (only if not exists)
        result = self._execute_command('SET', key, lock_id, 'NX', 'EX', timeout)
        
        if result == 'OK':
            logger.debug(f"Lock acquired for user {user_id}: {lock_id}")
            return lock_id
        
        logger.debug(f"Lock already held for user {user_id}")
        return None
    
    def release_sync_lock(self, user_id: str, lock_id: str) -> bool:
        """
        Release a distributed lock.
        Only releases if lock_id matches (prevents releasing someone else's lock).
        """
        key = f"{self.PREFIX_LOCK}:{user_id}"
        
        # Verify lock ownership
        current_lock = self._execute_command('GET', key)
        
        if current_lock == lock_id:
            self._execute_command('DEL', key)
            logger.debug(f"Lock released for user {user_id}")
            return True
        
        logger.warning(f"Lock mismatch for user {user_id}: expected {lock_id}, got {current_lock}")
        return False
    
    def extend_sync_lock(self, user_id: str, lock_id: str, extend_seconds: int = 30) -> bool:
        """Extend lock timeout if processing takes longer."""
        key = f"{self.PREFIX_LOCK}:{user_id}"
        
        current_lock = self._execute_command('GET', key)
        
        if current_lock == lock_id:
            self._execute_command('EXPIRE', key, extend_seconds)
            return True
        
        return False
    
    def is_locked(self, user_id: str) -> bool:
        """Check if a sync lock exists for user."""
        key = f"{self.PREFIX_LOCK}:{user_id}"
        result = self._execute_command('EXISTS', key)
        return result == 1
    
    # =========================================================================
    # LAST SYNC TIMESTAMP
    # =========================================================================
    
    def set_last_sync(self, user_id: str, sync_type: str = 'push') -> bool:
        """
        Store last sync timestamp for a user.
        
        Args:
            user_id: User ID
            sync_type: 'push' or 'pull'
        """
        key = f"{self.PREFIX_LAST_SYNC}:{user_id}:{sync_type}"
        timestamp = timezone.now().isoformat()
        
        result = self._execute_command('SET', key, timestamp, 'EX', self.TTL_LAST_SYNC)
        return result == 'OK'
    
    def get_last_sync(self, user_id: str, sync_type: str = 'push') -> Optional[str]:
        """Get last sync timestamp for a user."""
        key = f"{self.PREFIX_LAST_SYNC}:{user_id}:{sync_type}"
        return self._execute_command('GET', key)
    
    def get_all_sync_timestamps(self, user_id: str) -> Dict[str, Optional[str]]:
        """Get all sync timestamps for a user."""
        return {
            'last_push': self.get_last_sync(user_id, 'push'),
            'last_pull': self.get_last_sync(user_id, 'pull'),
            'last_full_sync': self.get_last_sync(user_id, 'full')
        }
    
    # =========================================================================
    # PENDING ACTIONS QUEUE
    # =========================================================================
    
    def add_pending_action(self, user_id: str, action_id: str) -> int:
        """Add action ID to user's pending queue."""
        key = f"{self.PREFIX_PENDING}:{user_id}"
        result = self._execute_command('LPUSH', key, action_id)
        self._execute_command('EXPIRE', key, self.TTL_LAST_SYNC)
        return result or 0
    
    def get_pending_actions(self, user_id: str, limit: int = 100) -> List[str]:
        """Get list of pending action IDs for a user."""
        key = f"{self.PREFIX_PENDING}:{user_id}"
        result = self._execute_command('LRANGE', key, 0, limit - 1)
        return result if result else []
    
    def remove_pending_action(self, user_id: str) -> Optional[str]:
        """Remove and return the oldest pending action."""
        key = f"{self.PREFIX_PENDING}:{user_id}"
        return self._execute_command('RPOP', key)
    
    def get_pending_count(self, user_id: str) -> int:
        """Get count of pending actions for a user."""
        key = f"{self.PREFIX_PENDING}:{user_id}"
        result = self._execute_command('LLEN', key)
        return result or 0
    
    def clear_pending_actions(self, user_id: str) -> bool:
        """Clear all pending actions for a user."""
        key = f"{self.PREFIX_PENDING}:{user_id}"
        result = self._execute_command('DEL', key)
        return result == 1
    
    # =========================================================================
    # CONFLICT CACHE
    # =========================================================================
    
    def cache_conflict(self, resource_type: str, resource_id: str, version: int) -> bool:
        """
        Cache resource version for quick conflict detection.
        """
        key = f"{self.PREFIX_CONFLICT}:{resource_type}:{resource_id}"
        result = self._execute_command('SET', key, str(version), 'EX', self.TTL_CONFLICT)
        return result == 'OK'
    
    def get_cached_version(self, resource_type: str, resource_id: str) -> Optional[int]:
        """Get cached version of a resource."""
        key = f"{self.PREFIX_CONFLICT}:{resource_type}:{resource_id}"
        result = self._execute_command('GET', key)
        return int(result) if result else None
    
    def check_version_conflict(
        self, 
        resource_type: str, 
        resource_id: str, 
        client_version: int
    ) -> Dict[str, Any]:
        """
        Quick check if client version conflicts with cached server version.
        
        Returns:
            {
                'has_conflict': bool,
                'server_version': int or None,
                'client_version': int
            }
        """
        server_version = self.get_cached_version(resource_type, resource_id)
        
        return {
            'has_conflict': server_version is not None and server_version > client_version,
            'server_version': server_version,
            'client_version': client_version
        }
    
    # =========================================================================
    # PROCESSING TRACKING
    # =========================================================================
    
    def mark_processing(self, action_id: str) -> bool:
        """Mark an action as currently being processed."""
        key = f"{self.PREFIX_PROCESSING}:{action_id}"
        result = self._execute_command('SET', key, '1', 'NX', 'EX', self.TTL_PROCESSING)
        return result == 'OK'
    
    def is_processing(self, action_id: str) -> bool:
        """Check if an action is currently being processed."""
        key = f"{self.PREFIX_PROCESSING}:{action_id}"
        result = self._execute_command('EXISTS', key)
        return result == 1
    
    def clear_processing(self, action_id: str) -> bool:
        """Clear processing flag for an action."""
        key = f"{self.PREFIX_PROCESSING}:{action_id}"
        result = self._execute_command('DEL', key)
        return result == 1
    
    # =========================================================================
    # IDEMPOTENCY
    # =========================================================================
    
    def check_idempotency(self, user_id: str, client_action_id: str) -> bool:
        """
        Check if an action has already been processed (idempotency check).
        
        Returns:
            True if action was already processed, False if new
        """
        key = f"sync:idempotent:{user_id}:{client_action_id}"
        result = self._execute_command('EXISTS', key)
        return result == 1
    
    def mark_processed(self, user_id: str, client_action_id: str, ttl: int = 86400) -> bool:
        """
        Mark an action as processed for idempotency.
        TTL of 24 hours by default.
        """
        key = f"sync:idempotent:{user_id}:{client_action_id}"
        result = self._execute_command('SET', key, '1', 'EX', ttl)
        return result == 'OK'
    
    # =========================================================================
    # STATISTICS & MONITORING
    # =========================================================================
    
    def get_sync_stats(self, user_id: str) -> Dict[str, Any]:
        """Get sync statistics for a user from cache."""
        return {
            'pending_actions': self.get_pending_count(user_id),
            'is_locked': self.is_locked(user_id),
            'last_sync_timestamps': self.get_all_sync_timestamps(user_id),
            'rate_limit': self.check_rate_limit(user_id)
        }
    
    def cleanup_expired_keys(self) -> int:
        """
        Cleanup expired keys from memory cache.
        Only applicable for in-memory fallback.
        """
        if self.use_redis:
            # Redis handles expiration automatically
            return 0
        
        current_time = time.time()
        expired_keys = []
        
        for key, item in self._memory_cache.items():
            if item['expires_at'] and item['expires_at'] <= current_time:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self._memory_cache[key]
        
        logger.debug(f"Cleaned up {len(expired_keys)} expired keys from memory cache")
        return len(expired_keys)
    
    # =========================================================================
    # HEALTH CHECK
    # =========================================================================
    
    def health_check(self) -> Dict[str, Any]:
        """Check Redis connection health."""
        if not self.use_redis:
            return {
                'status': 'fallback',
                'message': 'Using in-memory cache (Redis not configured)',
                'cache_size': len(self._memory_cache)
            }
        
        try:
            # Try a simple ping
            result = self._execute_command('SET', 'health:check', 'ok', 'EX', 10)
            
            if result == 'OK':
                return {
                    'status': 'healthy',
                    'message': 'Redis connection is working',
                    'provider': 'Upstash'
                }
            else:
                return {
                    'status': 'degraded',
                    'message': 'Redis responded but with unexpected result',
                    'provider': 'Upstash'
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Redis connection failed: {str(e)}',
                'provider': 'Upstash'
            }


# Singleton instance
redis_service = RedisService()