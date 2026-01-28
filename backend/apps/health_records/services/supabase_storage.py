"""
Supabase Storage Service for Health Records
============================================
Handles file uploads to Supabase Storage.

FREE Tier Limits:
- 1 GB storage
- 2 GB bandwidth/month
- 50 MB max file size

Usage:
    from apps.health_records.services.supabase_storage import SupabaseStorageService
    
    storage = SupabaseStorageService()
    success, file_path, metadata = storage.upload_file(file, user_id, 'prescription')
    url = storage.get_file_url(file_path)
"""

import os
import uuid
import logging
from typing import Optional, Tuple, Dict, Any, List
from datetime import datetime
from django.conf import settings

logger = logging.getLogger(__name__)


class SupabaseStorageService:
    """
    Service for managing files in Supabase Storage.
    Falls back to local storage if Supabase is not configured.
    """
    
    # Allowed file extensions
    ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']
    
    # Max file size (10 MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024
    
    # Content types mapping
    CONTENT_TYPES = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }
    
    # Document type to folder mapping
    FOLDERS = {
        'prescription': 'prescriptions',
        'lab_report': 'lab-reports',
        'xray': 'imaging',
        'mri': 'imaging',
        'ct_scan': 'imaging',
        'ultrasound': 'imaging',
        'ecg': 'ecg',
        'blood_report': 'lab-reports',
        'urine_report': 'lab-reports',
        'discharge_summary': 'discharge-summaries',
        'medical_certificate': 'certificates',
        'insurance': 'insurance',
        'vaccination': 'vaccinations',
        'other': 'other',
    }
    
    def __init__(self):
        """Initialize Supabase client."""
        self.supabase = None
        self.bucket_name = getattr(settings, 'SUPABASE_STORAGE_BUCKET', 'health-records')
        self.is_configured = False
        
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Supabase client if credentials are available."""
        supabase_url = getattr(settings, 'SUPABASE_URL', '')
        supabase_key = getattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', '') or \
                       getattr(settings, 'SUPABASE_ANON_KEY', '')
        
        if not supabase_url or not supabase_key:
            logger.warning("Supabase credentials not configured. Using local storage.")
            return
        
        try:
            from supabase import create_client, Client
            
            self.supabase: Client = create_client(supabase_url, supabase_key)
            self.is_configured = True
            logger.info("Supabase Storage initialized successfully")
            
            # Ensure bucket exists
            self._ensure_bucket_exists()
            
        except ImportError:
            logger.error("Supabase package not installed. Run: pip install supabase")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase: {e}")
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist."""
        if not self.supabase:
            return
        
        try:
            # List existing buckets
            buckets = self.supabase.storage.list_buckets()
            bucket_names = [b.name for b in buckets]
            
            if self.bucket_name not in bucket_names:
                # Create the bucket (private by default)
                self.supabase.storage.create_bucket(
                    self.bucket_name,
                    options={
                        'public': False,
                        'file_size_limit': self.MAX_FILE_SIZE,
                    }
                )
                logger.info(f"Created Supabase bucket: {self.bucket_name}")
            else:
                logger.debug(f"Bucket already exists: {self.bucket_name}")
                
        except Exception as e:
            logger.error(f"Error checking/creating bucket: {e}")
    
    def validate_file(self, file) -> Tuple[bool, str]:
        """
        Validate file before upload.
        
        Args:
            file: Django UploadedFile object
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check if file exists
        if not file:
            return False, "No file provided"
        
        # Check file size
        file_size = getattr(file, 'size', 0)
        if file_size > self.MAX_FILE_SIZE:
            max_mb = self.MAX_FILE_SIZE // (1024 * 1024)
            return False, f"File size exceeds {max_mb} MB limit"
        
        if file_size == 0:
            return False, "File is empty"
        
        # Check file extension
        filename = getattr(file, 'name', '')
        if '.' not in filename:
            return False, "File must have an extension"
        
        ext = filename.rsplit('.', 1)[-1].lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            allowed = ', '.join(self.ALLOWED_EXTENSIONS)
            return False, f"File type '{ext}' not allowed. Allowed: {allowed}"
        
        return True, ""
    
    def _generate_file_path(
        self,
        user_id: str,
        document_type: str,
        original_filename: str
    ) -> str:
        """
        Generate unique file path for storage.
        
        Format: {user_id}/{folder}/{year}/{month}/{uuid}_{filename}
        Example: abc123/prescriptions/2025/01/f8a3b2c1_medicine.pdf
        """
        # Get folder for document type
        folder = self.FOLDERS.get(document_type, 'other')
        
        # Get current date
        now = datetime.now()
        year = now.strftime('%Y')
        month = now.strftime('%m')
        
        # Generate unique ID
        unique_id = str(uuid.uuid4())[:8]
        
        # Sanitize filename
        safe_filename = self._sanitize_filename(original_filename)
        
        # Build path
        file_path = f"{user_id}/{folder}/{year}/{month}/{unique_id}_{safe_filename}"
        
        return file_path
    
    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename for storage."""
        # Get basename
        filename = os.path.basename(filename)
        
        # Replace spaces
        filename = filename.replace(' ', '_')
        
        # Keep only safe characters
        safe_chars = []
        for char in filename:
            if char.isalnum() or char in ['_', '-', '.']:
                safe_chars.append(char)
        
        result = ''.join(safe_chars)
        
        # Limit length (keep extension)
        if len(result) > 100:
            name, ext = result.rsplit('.', 1) if '.' in result else (result, '')
            result = name[:90] + ('.' + ext if ext else '')
        
        return result or 'document'
    
    def _get_content_type(self, filename: str) -> str:
        """Get content type from filename."""
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        return self.CONTENT_TYPES.get(ext, 'application/octet-stream')
    
    def upload_file(
        self,
        file,
        user_id: str,
        document_type: str,
        original_filename: str = None
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Upload file to Supabase Storage.
        
        Args:
            file: Django UploadedFile object
            user_id: User's UUID string
            document_type: Type of document (prescription, lab_report, etc.)
            original_filename: Original filename (optional)
            
        Returns:
            Tuple of (success, file_path_or_error, metadata)
        """
        # Get original filename
        if original_filename is None:
            original_filename = getattr(file, 'name', 'document')
        
        # Validate file
        is_valid, error = self.validate_file(file)
        if not is_valid:
            return False, error, {}
        
        # Generate file path
        file_path = self._generate_file_path(user_id, document_type, original_filename)
        
        # Read file content
        try:
            if hasattr(file, 'read'):
                file_content = file.read()
                file.seek(0)  # Reset for potential re-read
            else:
                file_content = file
        except Exception as e:
            return False, f"Error reading file: {e}", {}
        
        # Get metadata
        file_size = len(file_content)
        content_type = self._get_content_type(original_filename)
        file_extension = original_filename.rsplit('.', 1)[-1].lower() if '.' in original_filename else ''
        
        # Upload to Supabase
        if self.is_configured and self.supabase:
            try:
                # Upload file
                response = self.supabase.storage.from_(self.bucket_name).upload(
                    path=file_path,
                    file=file_content,
                    file_options={
                        'content-type': content_type,
                        'upsert': 'true'
                    }
                )
                
                storage_type = 'supabase'
                logger.info(f"Uploaded to Supabase: {file_path} ({file_size} bytes)")
                
            except Exception as e:
                logger.error(f"Supabase upload failed: {e}")
                return False, f"Upload failed: {str(e)}", {}
        else:
            # Fallback to local storage
            try:
                from django.core.files.storage import default_storage
                from django.core.files.base import ContentFile
                
                local_path = f"health_records/{file_path}"
                default_storage.save(local_path, ContentFile(file_content))
                
                storage_type = 'local'
                logger.info(f"Uploaded to local storage: {file_path} ({file_size} bytes)")
                
            except Exception as e:
                logger.error(f"Local storage upload failed: {e}")
                return False, f"Upload failed: {str(e)}", {}
        
        # Build metadata
        metadata = {
            'file_path': file_path,
            'file_size': file_size,
            'file_type': file_extension,
            'content_type': content_type,
            'original_filename': original_filename,
            'storage_type': storage_type,
        }
        
        return True, file_path, metadata
    
    def get_file_url(
        self,
        file_path: str,
        expiry_seconds: int = 3600
    ) -> Optional[str]:
        """
        Get signed URL for file access.
        
        Args:
            file_path: Path to the file in storage
            expiry_seconds: URL expiry time (default 1 hour)
            
        Returns:
            Signed URL string or None
        """
        if not file_path:
            return None
        
        if self.is_configured and self.supabase:
            try:
                response = self.supabase.storage.from_(self.bucket_name).create_signed_url(
                    path=file_path,
                    expires_in=expiry_seconds
                )
                
                # Handle different response formats
                if isinstance(response, dict):
                    return response.get('signedURL') or response.get('signedUrl')
                elif hasattr(response, 'signed_url'):
                    return response.signed_url
                
                return None
                
            except Exception as e:
                logger.error(f"Error getting signed URL: {e}")
                return None
        else:
            # Local storage URL
            try:
                from django.core.files.storage import default_storage
                
                local_path = f"health_records/{file_path}"
                if default_storage.exists(local_path):
                    return default_storage.url(local_path)
                return None
                
            except Exception as e:
                logger.error(f"Error getting local URL: {e}")
                return None
    
    def delete_file(self, file_path: str) -> bool:
        """
        Delete file from storage.
        
        Args:
            file_path: Path to the file
            
        Returns:
            True if deleted successfully
        """
        if not file_path:
            return False
        
        if self.is_configured and self.supabase:
            try:
                self.supabase.storage.from_(self.bucket_name).remove([file_path])
                logger.info(f"Deleted from Supabase: {file_path}")
                return True
            except Exception as e:
                logger.error(f"Error deleting from Supabase: {e}")
                return False
        else:
            # Local storage
            try:
                from django.core.files.storage import default_storage
                
                local_path = f"health_records/{file_path}"
                if default_storage.exists(local_path):
                    default_storage.delete(local_path)
                    logger.info(f"Deleted from local: {file_path}")
                    return True
                return False
                
            except Exception as e:
                logger.error(f"Error deleting from local: {e}")
                return False
    
    def file_exists(self, file_path: str) -> bool:
        """Check if file exists in storage."""
        if not file_path:
            return False
        
        # Try to get URL - if it works, file exists
        url = self.get_file_url(file_path, expiry_seconds=60)
        return url is not None
    
    def get_storage_info(self) -> Dict[str, Any]:
        """Get storage configuration info."""
        return {
            'is_configured': self.is_configured,
            'storage_type': 'supabase' if self.is_configured else 'local',
            'bucket_name': self.bucket_name,
            'max_file_size_mb': self.MAX_FILE_SIZE // (1024 * 1024),
            'allowed_extensions': self.ALLOWED_EXTENSIONS,
        }
    
    def list_user_files(self, user_id: str, folder: str = None) -> List[Dict]:
        """
        List files for a user.
        
        Args:
            user_id: User's UUID string
            folder: Optional subfolder (prescriptions, lab-reports, etc.)
            
        Returns:
            List of file info dictionaries
        """
        if not self.is_configured or not self.supabase:
            return []
        
        try:
            path = f"{user_id}/{folder}" if folder else user_id
            
            response = self.supabase.storage.from_(self.bucket_name).list(path)
            
            files = []
            for item in response:
                if item.get('name'):
                    files.append({
                        'name': item.get('name'),
                        'size': item.get('metadata', {}).get('size', 0),
                        'created_at': item.get('created_at'),
                        'updated_at': item.get('updated_at'),
                    })
            
            return files
            
        except Exception as e:
            logger.error(f"Error listing files: {e}")
            return []


# Singleton instance
_storage_service = None


def get_storage_service() -> SupabaseStorageService:
    """Get singleton storage service instance."""
    global _storage_service
    if _storage_service is None:
        _storage_service = SupabaseStorageService()
    return _storage_service