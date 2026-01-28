# """
# Document Service
# ================
# Manages medical document uploads and retrieval.
# """

# import logging
# import os
# from typing import Optional, Dict, Any, List
# from datetime import timedelta
# from django.db.models import Q
# from django.utils import timezone
# from django.conf import settings

# from ..models import MedicalDocument

# logger = logging.getLogger(__name__)


# class DocumentService:
#     """Service for managing medical documents."""

#     # Maximum file sizes (in bytes)
#     MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    
#     # Allowed file extensions
#     ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']

#     @staticmethod
#     def upload_document(
#         user,
#         file,
#         document_type: str,
#         title: str,
#         **kwargs
#     ) -> MedicalDocument:
#         """
#         Upload a medical document.
        
#         Args:
#             user: User instance
#             file: Uploaded file
#             document_type: Type of document
#             title: Document title
#             **kwargs: Additional fields
            
#         Returns:
#             Created MedicalDocument instance
#         """
#         # Validate file
#         DocumentService._validate_file(file)
        
#         document = MedicalDocument.objects.create(
#             user=user,
#             file=file,
#             document_type=document_type,
#             title=title,
#             **kwargs
#         )
        
#         logger.info(f"Uploaded document '{title}' for {user.phone}")
#         return document

#     @staticmethod
#     def _validate_file(file) -> None:
#         """
#         Validate uploaded file.
        
#         Args:
#             file: Uploaded file
            
#         Raises:
#             ValueError: If file is invalid
#         """
#         # Check file size
#         if file.size > DocumentService.MAX_FILE_SIZE:
#             raise ValueError(f"File size exceeds maximum allowed ({DocumentService.MAX_FILE_SIZE // (1024*1024)} MB)")
        
#         # Check file extension
#         ext = file.name.split('.')[-1].lower()
#         if ext not in DocumentService.ALLOWED_EXTENSIONS:
#             raise ValueError(f"File type '{ext}' is not allowed. Allowed: {', '.join(DocumentService.ALLOWED_EXTENSIONS)}")

#     @staticmethod
#     def get_documents_by_type(
#         user,
#         document_type: str
#     ) -> List[MedicalDocument]:
#         """Get documents filtered by type."""
#         return list(MedicalDocument.objects.filter(
#             user=user,
#             document_type=document_type
#         ).order_by('-document_date', '-created_at'))

#     @staticmethod
#     def get_recent_documents(user, days: int = 30) -> List[MedicalDocument]:
#         """Get documents from the last N days."""
#         since = timezone.now() - timedelta(days=days)
#         return list(MedicalDocument.objects.filter(
#             user=user,
#             created_at__gte=since
#         ).order_by('-created_at'))

#     @staticmethod
#     def search_documents(
#         user,
#         query: str,
#         document_type: Optional[str] = None
#     ) -> List[MedicalDocument]:
#         """
#         Search documents by title, description, or tags.
        
#         Args:
#             user: User instance
#             query: Search query
#             document_type: Optional filter by type
            
#         Returns:
#             List of matching documents
#         """
#         filters = Q(user=user) & (
#             Q(title__icontains=query) |
#             Q(description__icontains=query) |
#             Q(hospital_name__icontains=query) |
#             Q(doctor_name__icontains=query) |
#             Q(tags__contains=[query])
#         )
        
#         if document_type:
#             filters &= Q(document_type=document_type)
        
#         return list(MedicalDocument.objects.filter(filters).order_by('-document_date'))

#     @staticmethod
#     def get_documents_for_condition(
#         user,
#         condition_id
#     ) -> List[MedicalDocument]:
#         """Get documents linked to a specific condition."""
#         return list(MedicalDocument.objects.filter(
#             user=user,
#             medical_condition_id=condition_id
#         ).order_by('-document_date'))

#     @staticmethod
#     def get_documents_for_consultation(
#         user,
#         consultation_id
#     ) -> List[MedicalDocument]:
#         """Get documents linked to a specific consultation."""
#         return list(MedicalDocument.objects.filter(
#             user=user,
#             consultation_id=consultation_id
#         ).order_by('-document_date'))

#     @staticmethod
#     def get_shareable_documents(user) -> List[MedicalDocument]:
#         """Get documents that are marked as shareable with doctors."""
#         return list(MedicalDocument.objects.filter(
#             user=user,
#             is_shared_with_doctors=True
#         ).order_by('-document_date'))

#     @staticmethod
#     def update_sharing_status(
#         document_id,
#         user,
#         is_shared: bool
#     ) -> MedicalDocument:
#         """
#         Update document sharing status.
        
#         Args:
#             document_id: UUID of the document
#             user: User instance
#             is_shared: Whether to share with doctors
            
#         Returns:
#             Updated MedicalDocument instance
#         """
#         document = MedicalDocument.objects.get(id=document_id, user=user)
#         document.is_shared_with_doctors = is_shared
#         document.save(update_fields=['is_shared_with_doctors', 'updated_at'])
#         logger.info(f"Updated sharing status for document {document_id}")
#         return document

#     @staticmethod
#     def add_tags(document_id, user, tags: List[str]) -> MedicalDocument:
#         """
#         Add tags to a document.
        
#         Args:
#             document_id: UUID of the document
#             user: User instance
#             tags: List of tags to add
            
#         Returns:
#             Updated MedicalDocument instance
#         """
#         document = MedicalDocument.objects.get(id=document_id, user=user)
#         existing_tags = set(document.tags)
#         existing_tags.update(tags)
#         document.tags = list(existing_tags)
#         document.save(update_fields=['tags', 'updated_at'])
#         return document

#     @staticmethod
#     def remove_tags(document_id, user, tags: List[str]) -> MedicalDocument:
#         """
#         Remove tags from a document.
        
#         Args:
#             document_id: UUID of the document
#             user: User instance
#             tags: List of tags to remove
            
#         Returns:
#             Updated MedicalDocument instance
#         """
#         document = MedicalDocument.objects.get(id=document_id, user=user)
#         document.tags = [t for t in document.tags if t not in tags]
#         document.save(update_fields=['tags', 'updated_at'])
#         return document

#     @staticmethod
#     def delete_document(document_id, user) -> bool:
#         """
#         Delete a document.
        
#         Args:
#             document_id: UUID of the document
#             user: User instance
            
#         Returns:
#             True if deleted successfully
#         """
#         try:
#             document = MedicalDocument.objects.get(id=document_id, user=user)
            
#             # Delete the file from storage
#             if document.file:
#                 if os.path.isfile(document.file.path):
#                     os.remove(document.file.path)
            
#             document.delete()
#             logger.info(f"Deleted document {document_id} for {user.phone}")
#             return True
#         except MedicalDocument.DoesNotExist:
#             return False

#     @staticmethod
#     def get_storage_usage(user) -> Dict[str, Any]:
#         """
#         Get storage usage statistics for a user.
        
#         Args:
#             user: User instance
            
#         Returns:
#             Dictionary with storage statistics
#         """
#         documents = MedicalDocument.objects.filter(user=user)
        
#         total_size = sum(doc.file_size for doc in documents)
#         count = documents.count()
        
#         # Group by type
#         by_type = {}
#         for doc in documents:
#             dtype = doc.document_type
#             if dtype not in by_type:
#                 by_type[dtype] = {'count': 0, 'size': 0}
#             by_type[dtype]['count'] += 1
#             by_type[dtype]['size'] += doc.file_size
        
#         return {
#             'total_documents': count,
#             'total_size_bytes': total_size,
#             'total_size_mb': round(total_size / (1024 * 1024), 2),
#             'by_type': by_type,
#         }

"""
Document Service for Health Records
====================================
Manages medical documents with Supabase Storage integration.
"""

import logging
from typing import Optional, Dict, Any, List, Tuple
from datetime import timedelta
from django.db.models import Q
from django.utils import timezone

from ..models import MedicalDocument
from .supabase_storage import get_storage_service

logger = logging.getLogger(__name__)


class DocumentService:
    """Service for managing medical documents."""

    @staticmethod
    def upload_document(
        user,
        file,
        document_type: str,
        title: str,
        **kwargs
    ) -> Tuple[bool, Optional[MedicalDocument], str]:
        """
        Upload a medical document with file.
        
        Args:
            user: User instance
            file: Uploaded file
            document_type: Type of document
            title: Document title
            **kwargs: Additional fields
            
        Returns:
            Tuple of (success, document, error_message)
        """
        storage = get_storage_service()
        
        # Get original filename
        original_filename = getattr(file, 'name', 'document')
        
        # Validate file
        is_valid, error = storage.validate_file(file)
        if not is_valid:
            return False, None, error
        
        # Upload file to storage
        success, result, metadata = storage.upload_file(
            file=file,
            user_id=str(user.id),
            document_type=document_type,
            original_filename=original_filename
        )
        
        if not success:
            return False, None, result  # result contains error message
        
        # Handle foreign keys
        consultation_id = kwargs.pop('consultation', None)
        condition_id = kwargs.pop('medical_condition', None)
        
        # Create document record
        try:
            document = MedicalDocument.objects.create(
                user=user,
                document_type=document_type,
                title=title,
                file_path=metadata['file_path'],
                file_size=metadata['file_size'],
                file_type=metadata['file_type'],
                original_filename=metadata['original_filename'],
                content_type=metadata['content_type'],
                storage_type=metadata['storage_type'],
                consultation_id=consultation_id,
                medical_condition_id=condition_id,
                **kwargs
            )
            
            logger.info(f"Created document '{title}' for {user.phone}")
            return True, document, ""
            
        except Exception as e:
            # Cleanup: delete uploaded file if document creation fails
            storage.delete_file(metadata['file_path'])
            logger.error(f"Error creating document record: {e}")
            return False, None, str(e)

    @staticmethod
    def delete_document(document_id, user) -> Tuple[bool, str]:
        """
        Delete a document and its file.
        
        Args:
            document_id: UUID of the document
            user: User instance
            
        Returns:
            Tuple of (success, message)
        """
        try:
            document = MedicalDocument.objects.get(id=document_id, user=user)
            
            # Delete file from storage
            if document.file_path:
                document.delete_file()
            
            # Delete database record
            title = document.title
            document.delete()
            
            logger.info(f"Deleted document '{title}' for {user.phone}")
            return True, "Document deleted successfully"
            
        except MedicalDocument.DoesNotExist:
            return False, "Document not found"
        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            return False, str(e)

    @staticmethod
    def get_document_url(document: MedicalDocument, expiry_seconds: int = 3600) -> Optional[str]:
        """Get signed URL for a document."""
        return document.get_file_url(expiry_seconds)

    @staticmethod
    def get_documents_by_type(user, document_type: str) -> List[MedicalDocument]:
        """Get documents filtered by type."""
        return list(MedicalDocument.objects.filter(
            user=user,
            document_type=document_type
        ).order_by('-document_date', '-created_at'))

    @staticmethod
    def get_recent_documents(user, days: int = 30) -> List[MedicalDocument]:
        """Get documents from the last N days."""
        since = timezone.now() - timedelta(days=days)
        return list(MedicalDocument.objects.filter(
            user=user,
            created_at__gte=since
        ).order_by('-created_at'))

    @staticmethod
    def search_documents(
        user,
        query: str,
        document_type: Optional[str] = None
    ) -> List[MedicalDocument]:
        """Search documents by title, description, or tags."""
        filters = Q(user=user) & (
            Q(title__icontains=query) |
            Q(description__icontains=query) |
            Q(hospital_name__icontains=query) |
            Q(doctor_name__icontains=query) |
            Q(original_filename__icontains=query)
        )
        
        if document_type:
            filters &= Q(document_type=document_type)
        
        return list(MedicalDocument.objects.filter(filters).order_by('-document_date'))

    @staticmethod
    def get_shareable_documents(user) -> List[MedicalDocument]:
        """Get documents marked as shareable with doctors."""
        return list(MedicalDocument.objects.filter(
            user=user,
            is_shared_with_doctors=True
        ).order_by('-document_date'))

    @staticmethod
    def toggle_sharing(document_id, user, is_shared: bool) -> MedicalDocument:
        """Toggle document sharing status."""
        document = MedicalDocument.objects.get(id=document_id, user=user)
        document.is_shared_with_doctors = is_shared
        document.save(update_fields=['is_shared_with_doctors', 'updated_at'])
        return document

    @staticmethod
    def get_storage_stats(user) -> Dict[str, Any]:
        """Get storage statistics for a user."""
        documents = MedicalDocument.objects.filter(user=user)
        
        total_size = sum(doc.file_size for doc in documents)
        count = documents.count()
        
        # Group by type
        by_type = {}
        for doc in documents:
            dtype = doc.document_type
            if dtype not in by_type:
                by_type[dtype] = {'count': 0, 'size': 0}
            by_type[dtype]['count'] += 1
            by_type[dtype]['size'] += doc.file_size
        
        # Get storage info
        storage = get_storage_service()
        storage_info = storage.get_storage_info()
        
        return {
            'total_documents': count,
            'total_size_bytes': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'by_type': by_type,
            'storage_type': storage_info['storage_type'],
            'is_supabase_configured': storage_info['is_configured'],
        }