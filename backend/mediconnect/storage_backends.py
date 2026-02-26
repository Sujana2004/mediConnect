"""
Custom storage backend for Supabase Storage.
"""

import requests
import mimetypes
import uuid
from datetime import datetime
from django.conf import settings
from django.core.files.storage import Storage
from django.core.files.base import ContentFile
from django.utils.deconstruct import deconstructible
import logging

logger = logging.getLogger(__name__)


def normalize_path(path):
    """
    Convert Windows backslashes to forward slashes for Supabase.
    """
    if path:
        # Replace backslashes with forward slashes
        path = path.replace('\\', '/')
        # Remove double slashes
        while '//' in path:
            path = path.replace('//', '/')
        # Remove leading slash
        path = path.lstrip('/')
    return path


@deconstructible
class SupabaseStorage(Storage):
    """
    Django storage backend for Supabase Storage.
    """
    
    def __init__(self, bucket_name=None, folder=None):
        self.bucket_name = bucket_name or getattr(settings, 'SUPABASE_STORAGE_BUCKET', 'health-records')
        self.folder = folder or 'media'
        self.supabase_url = getattr(settings, 'SUPABASE_URL', '')
        self.service_key = getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', '')
        self.storage_url = f"{self.supabase_url}/storage/v1" if self.supabase_url else ''
    
    def _get_full_path(self, name):
        """Get full path with forward slashes."""
        # Normalize the name first (convert backslashes)
        name = normalize_path(name)
        
        if self.folder:
            full_path = f"{self.folder}/{name}"
        else:
            full_path = name
        
        # Ensure forward slashes and clean up
        return normalize_path(full_path)
    
    def _save(self, name, content):
        """Save file to Supabase Storage."""
        # Normalize path - convert backslashes to forward slashes
        name = normalize_path(name)
        full_path = self._get_full_path(name)
        
        logger.info(f"📤 Uploading to Supabase: {full_path}")
        
        # Read content
        if hasattr(content, 'read'):
            file_data = content.read()
        else:
            file_data = content
        
        # Detect content type
        content_type, _ = mimetypes.guess_type(name)
        content_type = content_type or 'application/octet-stream'
        
        headers = {
            'Authorization': f'Bearer {self.service_key}',
            'apikey': self.service_key,
            'Content-Type': content_type,
            'x-upsert': 'true'
        }
        
        try:
            response = requests.post(
                f"{self.storage_url}/object/{self.bucket_name}/{full_path}",
                headers=headers,
                data=file_data,
                timeout=60
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"✅ Uploaded to Supabase: {full_path}")
                # Return normalized name (with forward slashes)
                return normalize_path(name)
            else:
                logger.error(f"❌ Upload failed: {response.status_code} - {response.text}")
                raise IOError(f"Supabase upload failed: {response.text}")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Upload error: {e}")
            raise IOError(f"Supabase upload error: {e}")
    
    def _open(self, name, mode='rb'):
        """Open file from Supabase Storage."""
        name = normalize_path(name)
        full_path = self._get_full_path(name)
        
        headers = {
            'Authorization': f'Bearer {self.service_key}',
            'apikey': self.service_key,
        }
        
        try:
            response = requests.get(
                f"{self.storage_url}/object/{self.bucket_name}/{full_path}",
                headers=headers,
                timeout=60
            )
            
            if response.status_code == 200:
                return ContentFile(response.content, name=name)
            raise IOError(f"File not found: {name}")
                
        except requests.exceptions.RequestException as e:
            raise IOError(f"Download error: {e}")
    
    def delete(self, name):
        """Delete file from Supabase Storage."""
        name = normalize_path(name)
        full_path = self._get_full_path(name)
        
        headers = {
            'Authorization': f'Bearer {self.service_key}',
            'apikey': self.service_key,
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.delete(
                f"{self.storage_url}/object/{self.bucket_name}",
                headers=headers,
                json={'prefixes': [full_path]},
                timeout=30
            )
            
            if response.status_code in [200, 204]:
                logger.info(f"✅ Deleted from Supabase: {full_path}")
            else:
                logger.warning(f"⚠️ Delete response: {response.status_code}")
                
        except Exception as e:
            logger.error(f"❌ Delete error: {e}")
    
    def exists(self, name):
        """Check if file exists in Supabase Storage."""
        name = normalize_path(name)
        full_path = self._get_full_path(name)
        
        headers = {
            'Authorization': f'Bearer {self.service_key}',
            'apikey': self.service_key,
        }
        
        try:
            response = requests.head(
                f"{self.storage_url}/object/{self.bucket_name}/{full_path}",
                headers=headers,
                timeout=10
            )
            return response.status_code == 200
        except:
            return False
    
    def url(self, name):
        """Generate signed URL for file access."""
        name = normalize_path(name)
        full_path = self._get_full_path(name)
        expires_in = getattr(settings, 'SUPABASE_SIGNED_URL_EXPIRY', 3600)
        
        headers = {
            'Authorization': f'Bearer {self.service_key}',
            'apikey': self.service_key,
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.post(
                f"{self.storage_url}/object/sign/{self.bucket_name}/{full_path}",
                headers=headers,
                json={'expiresIn': expires_in},
                timeout=30
            )
            
            if response.status_code == 200:
                signed_url = response.json().get('signedURL', '')
                if signed_url.startswith('/'):
                    return f"{self.supabase_url}/storage/v1{signed_url}"
                return signed_url
        except Exception as e:
            logger.error(f"Error generating URL: {e}")
        
        # Fallback to public URL
        return f"{self.storage_url}/object/public/{self.bucket_name}/{full_path}"
    
    def size(self, name):
        """Get file size."""
        name = normalize_path(name)
        full_path = self._get_full_path(name)
        
        headers = {
            'Authorization': f'Bearer {self.service_key}',
            'apikey': self.service_key,
        }
        
        try:
            response = requests.head(
                f"{self.storage_url}/object/{self.bucket_name}/{full_path}",
                headers=headers,
                timeout=10
            )
            if response.status_code == 200:
                return int(response.headers.get('Content-Length', 0))
        except:
            pass
        return 0
    
    def get_available_name(self, name, max_length=None):
        """Generate unique filename if file exists."""
        # Normalize first
        name = normalize_path(name)
        
        if self.exists(name):
            name_parts = name.rsplit('.', 1)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_id = uuid.uuid4().hex[:8]
            
            if len(name_parts) == 2:
                name = f"{name_parts[0]}_{timestamp}_{unique_id}.{name_parts[1]}"
            else:
                name = f"{name}_{timestamp}_{unique_id}"
        
        return name
    
    def get_valid_name(self, name):
        """
        Return a filename suitable for use with the storage system.
        Convert backslashes to forward slashes.
        """
        return normalize_path(name)
    
    def generate_filename(self, filename):
        """
        Generate filename with forward slashes.
        """
        return normalize_path(filename)