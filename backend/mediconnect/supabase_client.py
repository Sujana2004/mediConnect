"""
Supabase client utilities using REST API only.
No dependency on supabase-py package - avoids all version conflicts.
"""

import requests
import logging
from django.conf import settings
from typing import Optional, Dict, Any, List, Union
from functools import lru_cache
import mimetypes

logger = logging.getLogger(__name__)


class SupabaseStorageManager:
    """
    Manager class for Supabase storage operations using REST API.
    No external supabase package required.
    """
    
    def __init__(self, bucket_name: str = None):
        self.supabase_url = settings.SUPABASE_URL
        self.service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.bucket_name = bucket_name or getattr(settings, 'SUPABASE_STORAGE_BUCKET', 'health-records')
        self.storage_url = f"{self.supabase_url}/storage/v1"
        
        if not self.supabase_url or not self.service_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured")
    
    def _get_headers(self, content_type: str = 'application/json') -> Dict[str, str]:
        """Get headers for API requests."""
        return {
            'Authorization': f'Bearer {self.service_key}',
            'apikey': self.service_key,
            'Content-Type': content_type
        }
    
    def _get_upload_headers(self, content_type: str = 'application/octet-stream', upsert: bool = True) -> Dict[str, str]:
        """Get headers for file upload."""
        headers = {
            'Authorization': f'Bearer {self.service_key}',
            'apikey': self.service_key,
            'Content-Type': content_type,
        }
        if upsert:
            headers['x-upsert'] = 'true'
        return headers

    def upload_file(
        self, 
        file_path: str, 
        file_data: Union[bytes, Any],
        content_type: str = None,
        upsert: bool = True
    ) -> Dict[str, Any]:
        """
        Upload a file to Supabase storage.
        
        Args:
            file_path: Path within the bucket (e.g., 'health-records/user_1/file.pdf')
            file_data: File content as bytes or file-like object
            content_type: MIME type of the file (auto-detected if not provided)
            upsert: Whether to overwrite existing file
            
        Returns:
            dict with upload result {'success': bool, 'path': str, 'error': str}
        """
        try:
            # Auto-detect content type if not provided
            if content_type is None:
                content_type, _ = mimetypes.guess_type(file_path)
                content_type = content_type or 'application/octet-stream'
            
            # Convert file-like object to bytes if needed
            if hasattr(file_data, 'read'):
                file_data = file_data.read()
            
            headers = self._get_upload_headers(content_type, upsert)
            
            response = requests.post(
                f"{self.storage_url}/object/{self.bucket_name}/{file_path}",
                headers=headers,
                data=file_data,
                timeout=60
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"File uploaded successfully: {file_path}")
                return {
                    'success': True, 
                    'path': file_path,
                    'key': f"{self.bucket_name}/{file_path}",
                    'data': response.json() if response.text else {}
                }
            else:
                error_msg = response.text
                logger.error(f"Upload failed: {response.status_code} - {error_msg}")
                return {
                    'success': False, 
                    'error': error_msg,
                    'status_code': response.status_code
                }
                
        except requests.exceptions.Timeout:
            logger.error(f"Upload timeout for {file_path}")
            return {'success': False, 'error': 'Upload timeout'}
        except Exception as e:
            logger.error(f"Error uploading file {file_path}: {str(e)}")
            return {'success': False, 'error': str(e)}

    def download_file(self, file_path: str) -> Optional[bytes]:
        """
        Download a file from storage.
        
        Args:
            file_path: Path to the file within the bucket
            
        Returns:
            File content as bytes or None
        """
        try:
            headers = {
                'Authorization': f'Bearer {self.service_key}',
                'apikey': self.service_key,
            }
            
            response = requests.get(
                f"{self.storage_url}/object/{self.bucket_name}/{file_path}",
                headers=headers,
                timeout=60
            )
            
            if response.status_code == 200:
                return response.content
            else:
                logger.error(f"Download failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error downloading file {file_path}: {str(e)}")
            return None

    def get_signed_url(self, file_path: str, expires_in: int = 3600) -> str:
        """
        Generate a signed URL for private file access.
        
        Args:
            file_path: Path to the file within the bucket
            expires_in: URL expiration time in seconds (default: 1 hour)
            
        Returns:
            Full signed URL string or empty string on error
        """
        try:
            headers = self._get_headers()
            
            response = requests.post(
                f"{self.storage_url}/object/sign/{self.bucket_name}/{file_path}",
                headers=headers,
                json={'expiresIn': expires_in},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                signed_url = data.get('signedURL', '')
                # Return full URL
                if signed_url.startswith('/'):
                    return f"{self.supabase_url}/storage/v1{signed_url}"
                return signed_url
            else:
                logger.error(f"Error generating signed URL: {response.status_code} - {response.text}")
                return ''
                
        except Exception as e:
            logger.error(f"Error generating signed URL for {file_path}: {str(e)}")
            return ''

    def get_public_url(self, file_path: str) -> str:
        """
        Get the public URL for a file (only works for public buckets).
        
        Args:
            file_path: Path to the file within the bucket
            
        Returns:
            Public URL string
        """
        return f"{self.storage_url}/object/public/{self.bucket_name}/{file_path}"

    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from storage.
        
        Args:
            file_path: Path to the file within the bucket
            
        Returns:
            True if successful, False otherwise
        """
        try:
            headers = self._get_headers()
            
            # Supabase delete expects a list of files
            response = requests.delete(
                f"{self.storage_url}/object/{self.bucket_name}",
                headers=headers,
                json={'prefixes': [file_path]},
                timeout=30
            )
            
            if response.status_code in [200, 204]:
                logger.info(f"File deleted successfully: {file_path}")
                return True
            else:
                logger.error(f"Delete failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {str(e)}")
            return False

    def delete_files(self, file_paths: List[str]) -> bool:
        """
        Delete multiple files from storage.
        
        Args:
            file_paths: List of file paths within the bucket
            
        Returns:
            True if all successful, False otherwise
        """
        try:
            headers = self._get_headers()
            
            response = requests.delete(
                f"{self.storage_url}/object/{self.bucket_name}",
                headers=headers,
                json={'prefixes': file_paths},
                timeout=30
            )
            
            if response.status_code in [200, 204]:
                logger.info(f"Files deleted successfully: {file_paths}")
                return True
            else:
                logger.error(f"Bulk delete failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting files: {str(e)}")
            return False

    def list_files(
        self, 
        folder_path: str = '', 
        limit: int = 100, 
        offset: int = 0,
        sort_by: str = 'name',
        order: str = 'asc'
    ) -> List[Dict]:
        """
        List files in a folder.
        
        Args:
            folder_path: Path to the folder within the bucket
            limit: Maximum number of files to return
            offset: Number of files to skip
            sort_by: Field to sort by ('name', 'created_at', 'updated_at')
            order: Sort order ('asc' or 'desc')
            
        Returns:
            List of file objects
        """
        try:
            headers = self._get_headers()
            
            payload = {
                'prefix': folder_path,
                'limit': limit,
                'offset': offset,
                'sortBy': {
                    'column': sort_by,
                    'order': order
                }
            }
            
            response = requests.post(
                f"{self.storage_url}/object/list/{self.bucket_name}",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"List failed: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Error listing files in {folder_path}: {str(e)}")
            return []

    def file_exists(self, file_path: str) -> bool:
        """
        Check if a file exists.
        
        Args:
            file_path: Path to the file within the bucket
            
        Returns:
            True if file exists, False otherwise
        """
        try:
            headers = {
                'Authorization': f'Bearer {self.service_key}',
                'apikey': self.service_key,
            }
            
            # Use HEAD request to check existence
            response = requests.head(
                f"{self.storage_url}/object/{self.bucket_name}/{file_path}",
                headers=headers,
                timeout=10
            )
            
            return response.status_code == 200
            
        except Exception:
            return False

    def move_file(self, from_path: str, to_path: str) -> bool:
        """
        Move/rename a file within the bucket.
        
        Args:
            from_path: Current path of the file
            to_path: New path for the file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            headers = self._get_headers()
            
            response = requests.post(
                f"{self.storage_url}/object/move",
                headers=headers,
                json={
                    'bucketId': self.bucket_name,
                    'sourceKey': from_path,
                    'destinationKey': to_path
                },
                timeout=30
            )
            
            if response.status_code == 200:
                logger.info(f"File moved from {from_path} to {to_path}")
                return True
            else:
                logger.error(f"Move failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error moving file: {str(e)}")
            return False

    def copy_file(self, from_path: str, to_path: str) -> bool:
        """
        Copy a file within the bucket.
        
        Args:
            from_path: Source path of the file
            to_path: Destination path for the copy
            
        Returns:
            True if successful, False otherwise
        """
        try:
            headers = self._get_headers()
            
            response = requests.post(
                f"{self.storage_url}/object/copy",
                headers=headers,
                json={
                    'bucketId': self.bucket_name,
                    'sourceKey': from_path,
                    'destinationKey': to_path
                },
                timeout=30
            )
            
            if response.status_code == 200:
                logger.info(f"File copied from {from_path} to {to_path}")
                return True
            else:
                logger.error(f"Copy failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error copying file: {str(e)}")
            return False

    def get_file_info(self, file_path: str) -> Optional[Dict]:
        """
        Get metadata about a file.
        
        Args:
            file_path: Path to the file within the bucket
            
        Returns:
            Dict with file metadata or None
        """
        try:
            headers = {
                'Authorization': f'Bearer {self.service_key}',
                'apikey': self.service_key,
            }
            
            response = requests.head(
                f"{self.storage_url}/object/{self.bucket_name}/{file_path}",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                return {
                    'content_type': response.headers.get('Content-Type'),
                    'content_length': response.headers.get('Content-Length'),
                    'last_modified': response.headers.get('Last-Modified'),
                    'etag': response.headers.get('ETag'),
                }
            return None
            
        except Exception as e:
            logger.error(f"Error getting file info for {file_path}: {str(e)}")
            return None


class SupabaseBucketManager:
    """
    Manager for Supabase storage bucket operations.
    """
    
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.storage_url = f"{self.supabase_url}/storage/v1"
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            'Authorization': f'Bearer {self.service_key}',
            'apikey': self.service_key,
            'Content-Type': 'application/json'
        }
    
    def list_buckets(self) -> List[Dict]:
        """List all buckets."""
        try:
            response = requests.get(
                f"{self.storage_url}/bucket",
                headers=self._get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            logger.error(f"Error listing buckets: {e}")
            return []
    
    def create_bucket(
        self, 
        bucket_name: str, 
        public: bool = False,
        file_size_limit: int = 10485760,
        allowed_mime_types: List[str] = None
    ) -> bool:
        """Create a new bucket."""
        try:
            payload = {
                'id': bucket_name,
                'name': bucket_name,
                'public': public,
                'file_size_limit': file_size_limit,
            }
            
            if allowed_mime_types:
                payload['allowed_mime_types'] = allowed_mime_types
            
            response = requests.post(
                f"{self.storage_url}/bucket",
                headers=self._get_headers(),
                json=payload,
                timeout=30
            )
            
            return response.status_code in [200, 201]
        except Exception as e:
            logger.error(f"Error creating bucket: {e}")
            return False
    
    def bucket_exists(self, bucket_name: str) -> bool:
        """Check if a bucket exists."""
        buckets = self.list_buckets()
        return any(b.get('name') == bucket_name for b in buckets)


# Convenience functions
@lru_cache(maxsize=4)
def get_storage_manager(bucket_name: str = None) -> SupabaseStorageManager:
    """Get a cached storage manager instance."""
    return SupabaseStorageManager(bucket_name)


def get_bucket_manager() -> SupabaseBucketManager:
    """Get a bucket manager instance."""
    return SupabaseBucketManager()