from django.shortcuts import render

"""
Health Records Views for MediConnect
====================================
API endpoints for health records management.
"""

import logging
from rest_framework import viewsets, views, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import (
    HealthProfile,
    MedicalCondition,
    MedicalDocument,
    LabReport,
    VaccinationRecord,
    Allergy,
    FamilyMedicalHistory,
    Hospitalization,
    VitalSign,
    SharedRecord,
)
from .serializers import (
    # Health Profile
    HealthProfileSerializer,
    HealthProfileCreateUpdateSerializer,
    HealthProfileSummarySerializer,
    # Medical Conditions
    MedicalConditionSerializer,
    MedicalConditionCreateSerializer,
    MedicalConditionListSerializer,
    # Documents
    MedicalDocumentSerializer,
    MedicalDocumentUploadSerializer,
    MedicalDocumentListSerializer,
    # Lab Reports
    LabReportSerializer,
    LabReportCreateSerializer,
    LabReportListSerializer,
    # Vaccinations
    VaccinationRecordSerializer,
    VaccinationRecordCreateSerializer,
    VaccinationRecordListSerializer,
    # Allergies
    AllergySerializer,
    AllergyCreateSerializer,
    AllergyListSerializer,
    # Family History
    FamilyMedicalHistorySerializer,
    FamilyMedicalHistoryCreateSerializer,
    FamilyMedicalHistoryListSerializer,
    # Hospitalizations
    HospitalizationSerializer,
    HospitalizationCreateSerializer,
    HospitalizationListSerializer,
    # Vital Signs
    VitalSignSerializer,
    VitalSignCreateSerializer,
    VitalSignListSerializer,
    # Shared Records
    SharedRecordSerializer,
    SharedRecordCreateSerializer,
    SharedRecordListSerializer,
    # Comprehensive
    HealthSummarySerializer,
    HealthTimelineSerializer,
    DoctorAccessibleRecordsSerializer,
    HealthRecordsQuickDataSerializer,
)
from .services import (
    HealthProfileService,
    MedicalRecordsService,
    DocumentService,
    SharingService,
    HealthAnalyticsService,
)

logger = logging.getLogger(__name__)


# =============================================================================
# PERMISSIONS
# =============================================================================

class IsPatient(permissions.BasePermission):
    """Allow only patients."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'patient'


class IsDoctor(permissions.BasePermission):
    """Allow only doctors."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'doctor'


class IsPatientOrDoctor(permissions.BasePermission):
    """Allow patients and doctors."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['patient', 'doctor']


class IsOwnerOrSharedWithDoctor(permissions.BasePermission):
    """Allow owner or doctor with shared access."""
    def has_object_permission(self, request, view, obj):
        # Owner always has access
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        
        # Doctor with shared access
        if request.user.role == 'doctor':
            patient = obj.user if hasattr(obj, 'user') else None
            if patient and SharingService.can_doctor_access(request.user, patient):
                return True
        
        return False


# =============================================================================
# HEALTH PROFILE VIEWS
# =============================================================================

class HealthProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing health profile.
    
    Endpoints:
    - GET /profile/ - Get current user's profile
    - PUT /profile/ - Update profile
    - PATCH /profile/ - Partial update
    - POST /profile/sync-allergies/ - Sync allergies from records
    - POST /profile/sync-conditions/ - Sync conditions from records
    - GET /profile/summary/ - Get profile summary
    - GET /profile/critical-info/ - Get critical health info
    """
    permission_classes = [permissions.IsAuthenticated, IsPatient]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return HealthProfileCreateUpdateSerializer
        if self.action == 'summary':
            return HealthProfileSummarySerializer
        return HealthProfileSerializer
    
    def get_object(self):
        """Get or create profile for current user."""
        return HealthProfileService.get_or_create_profile(self.request.user)
    
    def get_queryset(self):
        return HealthProfile.objects.filter(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        """Get current user's profile."""
        profile = self.get_object()
        serializer = self.get_serializer(profile)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    def create(self, request, *args, **kwargs):
        """Create or update profile."""
        profile = HealthProfileService.update_profile(
            request.user,
            request.data
        )
        serializer = HealthProfileSerializer(profile)
        return Response({
            'success': True,
            'message': 'Health profile saved successfully',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update profile."""
        profile = HealthProfileService.update_profile(
            request.user,
            request.data
        )
        serializer = HealthProfileSerializer(profile)
        return Response({
            'success': True,
            'message': 'Health profile updated successfully',
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get profile summary."""
        profile = self.get_object()
        serializer = HealthProfileSummarySerializer(profile)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'], url_path='critical-info')
    def critical_info(self, request):
        """Get critical health information."""
        info = HealthProfileService.get_critical_info(request.user)
        return Response({
            'success': True,
            'data': info
        })
    
    @action(detail=False, methods=['post'], url_path='sync-allergies')
    def sync_allergies(self, request):
        """Sync allergies from detailed allergy records."""
        profile = HealthProfileService.sync_allergies_from_records(request.user)
        return Response({
            'success': True,
            'message': 'Allergies synced successfully',
            'data': {'allergies': profile.allergies}
        })
    
    @action(detail=False, methods=['post'], url_path='sync-conditions')
    def sync_conditions(self, request):
        """Sync chronic conditions from medical condition records."""
        profile = HealthProfileService.sync_conditions_from_records(request.user)
        return Response({
            'success': True,
            'message': 'Conditions synced successfully',
            'data': {'chronic_conditions': profile.chronic_conditions}
        })
    
    @action(detail=False, methods=['post'], url_path='update-emergency-contact')
    def update_emergency_contact(self, request):
        """Update emergency contact information."""
        name = request.data.get('name', '')
        phone = request.data.get('phone', '')
        relation = request.data.get('relation', '')
        
        if not phone:
            return Response({
                'success': False,
                'message': 'Phone number is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        profile = HealthProfileService.update_emergency_contact(
            request.user, name, phone, relation
        )
        
        return Response({
            'success': True,
            'message': 'Emergency contact updated successfully',
            'data': {
                'emergency_contact_name': profile.emergency_contact_name,
                'emergency_contact_phone': profile.emergency_contact_phone,
                'emergency_contact_relation': profile.emergency_contact_relation,
            }
        })


# =============================================================================
# MEDICAL CONDITION VIEWS
# =============================================================================

class MedicalConditionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing medical conditions.
    
    Endpoints:
    - GET /conditions/ - List all conditions
    - POST /conditions/ - Create condition
    - GET /conditions/{id}/ - Get condition detail
    - PUT /conditions/{id}/ - Update condition
    - DELETE /conditions/{id}/ - Delete condition
    - GET /conditions/active/ - Get active conditions
    - GET /conditions/chronic/ - Get chronic conditions
    - POST /conditions/{id}/resolve/ - Mark as resolved
    """
    permission_classes = [permissions.IsAuthenticated, IsPatientOrDoctor]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MedicalConditionCreateSerializer
        if self.action == 'list':
            return MedicalConditionListSerializer
        return MedicalConditionSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return MedicalCondition.objects.filter(user=user).order_by('-diagnosed_date')
        else:
            # Doctors can only see via specific patient endpoints
            return MedicalCondition.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Sync to health profile if chronic
        if serializer.validated_data.get('is_chronic'):
            HealthProfileService.sync_conditions_from_records(request.user)
        
        return Response({
            'success': True,
            'message': 'Medical condition recorded successfully',
            'data': MedicalConditionSerializer(serializer.instance).data
        }, status=status.HTTP_201_CREATED)
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Filter by status
        condition_status = request.query_params.get('status')
        if condition_status:
            queryset = queryset.filter(status=condition_status)
        
        # Filter by chronic
        is_chronic = request.query_params.get('is_chronic')
        if is_chronic:
            queryset = queryset.filter(is_chronic=is_chronic.lower() == 'true')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'count': queryset.count(),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active conditions."""
        conditions = MedicalRecordsService.get_active_conditions(request.user)
        serializer = MedicalConditionListSerializer(conditions, many=True)
        return Response({
            'success': True,
            'count': len(conditions),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def chronic(self, request):
        """Get chronic conditions."""
        conditions = MedicalRecordsService.get_chronic_conditions(request.user)
        serializer = MedicalConditionListSerializer(conditions, many=True)
        return Response({
            'success': True,
            'count': len(conditions),
            'data': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark condition as resolved."""
        resolved_date = request.data.get('resolved_date')
        
        try:
            condition = MedicalRecordsService.resolve_condition(
                pk, request.user, resolved_date
            )
            
            # Sync health profile
            HealthProfileService.sync_conditions_from_records(request.user)
            
            return Response({
                'success': True,
                'message': 'Condition marked as resolved',
                'data': MedicalConditionSerializer(condition).data
            })
        except MedicalCondition.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Condition not found'
            }, status=status.HTTP_404_NOT_FOUND)


# =============================================================================
# MEDICAL DOCUMENT VIEWS
# =============================================================================

class MedicalDocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing medical documents.
    Supports file upload to Supabase Storage.
    """
    permission_classes = [permissions.IsAuthenticated, IsPatientOrDoctor]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MedicalDocumentUploadSerializer
        if self.action == 'list':
            return MedicalDocumentListSerializer
        return MedicalDocumentSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return MedicalDocument.objects.filter(user=user).order_by('-document_date', '-created_at')
        return MedicalDocument.objects.none()
    
    def create(self, request, *args, **kwargs):
        """Upload a new document with file."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Extract validated data
        file = serializer.validated_data.pop('file')
        document_type = serializer.validated_data.pop('document_type')
        title = serializer.validated_data.pop('title')
        
        # Upload document
        success, document, error = DocumentService.upload_document(
            user=request.user,
            file=file,
            document_type=document_type,
            title=title,
            **serializer.validated_data
        )
        
        if success:
            return Response({
                'success': True,
                'message': 'Document uploaded successfully',
                'data': MedicalDocumentSerializer(document).data
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'success': False,
                'message': error
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a document and its file."""
        instance = self.get_object()
        
        success, message = DocumentService.delete_document(instance.id, request.user)
        
        if success:
            return Response({
                'success': True,
                'message': message
            })
        else:
            return Response({
                'success': False,
                'message': message
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'], url_path='download-url')
    def download_url(self, request, pk=None):
        """Get signed download URL for a document."""
        document = self.get_object()
        
        # Check ownership or sharing permission
        if document.user != request.user:
            if request.user.role != 'doctor' or not document.is_shared_with_doctors:
                return Response({
                    'success': False,
                    'message': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
        
        url = document.get_file_url(expiry_seconds=3600)
        
        if url:
            return Response({
                'success': True,
                'data': {
                    'url': url,
                    'expires_in': 3600,
                    'filename': document.original_filename,
                }
            })
        else:
            return Response({
                'success': False,
                'message': 'File not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent documents."""
        days = int(request.query_params.get('days', 30))
        documents = DocumentService.get_recent_documents(request.user, days)
        serializer = MedicalDocumentListSerializer(documents, many=True)
        return Response({
            'success': True,
            'count': len(documents),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'], url_path='by-type/(?P<doc_type>[^/.]+)')
    def by_type(self, request, doc_type=None):
        """Get documents by type."""
        documents = DocumentService.get_documents_by_type(request.user, doc_type)
        serializer = MedicalDocumentListSerializer(documents, many=True)
        return Response({
            'success': True,
            'count': len(documents),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['post'])
    def search(self, request):
        """Search documents."""
        query = request.data.get('query', '')
        doc_type = request.data.get('type')
        
        if not query:
            return Response({
                'success': False,
                'message': 'Search query is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        documents = DocumentService.search_documents(request.user, query, doc_type)
        serializer = MedicalDocumentListSerializer(documents, many=True)
        return Response({
            'success': True,
            'count': len(documents),
            'data': serializer.data
        })
    
    @action(detail=True, methods=['post'], url_path='toggle-sharing')
    def toggle_sharing(self, request, pk=None):
        """Toggle document sharing status."""
        is_shared = request.data.get('is_shared', True)
        
        try:
            document = DocumentService.toggle_sharing(pk, request.user, is_shared)
            return Response({
                'success': True,
                'message': f"Sharing {'enabled' if is_shared else 'disabled'}",
                'data': {'is_shared_with_doctors': document.is_shared_with_doctors}
            })
        except MedicalDocument.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Document not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'], url_path='storage-stats')
    def storage_stats(self, request):
        """Get storage statistics."""
        stats = DocumentService.get_storage_stats(request.user)
        return Response({
            'success': True,
            'data': stats
        })
    
    @action(detail=False, methods=['get'], url_path='storage-info')
    def storage_info(self, request):
        """Get storage configuration info."""
        from .services.supabase_storage import get_storage_service
        storage = get_storage_service()
        return Response({
            'success': True,
            'data': storage.get_storage_info()
        })


# =============================================================================
# LAB REPORT VIEWS
# =============================================================================

class LabReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing lab reports.
    
    Endpoints:
    - GET /lab-reports/ - List all lab reports
    - POST /lab-reports/ - Create lab report
    - GET /lab-reports/{id}/ - Get lab report detail
    - PUT /lab-reports/{id}/ - Update lab report
    - DELETE /lab-reports/{id}/ - Delete lab report
    - GET /lab-reports/recent/ - Get recent reports
    - GET /lab-reports/abnormal/ - Get abnormal reports
    - GET /lab-reports/trends/ - Get test trends
    """
    permission_classes = [permissions.IsAuthenticated, IsPatientOrDoctor]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return LabReportCreateSerializer
        if self.action == 'list':
            return LabReportListSerializer
        return LabReportSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return LabReport.objects.filter(user=user).order_by('-test_date')
        else:
            return LabReport.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response({
            'success': True,
            'message': 'Lab report created successfully',
            'data': LabReportSerializer(serializer.instance).data
        }, status=status.HTTP_201_CREATED)
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Filter by type
        lab_type = request.query_params.get('type')
        if lab_type:
            queryset = queryset.filter(lab_type=lab_type)
        
        # Filter by status
        report_status = request.query_params.get('status')
        if report_status:
            queryset = queryset.filter(overall_status=report_status)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'count': queryset.count(),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent lab reports."""
        days = int(request.query_params.get('days', 90))
        reports = MedicalRecordsService.get_recent_lab_reports(request.user, days)
        serializer = LabReportListSerializer(reports, many=True)
        return Response({
            'success': True,
            'count': len(reports),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def abnormal(self, request):
        """Get lab reports with abnormal results."""
        reports = MedicalRecordsService.get_abnormal_reports(request.user)
        serializer = LabReportListSerializer(reports, many=True)
        return Response({
            'success': True,
            'count': len(reports),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def trends(self, request):
        """Get trends for a specific test."""
        lab_type = request.query_params.get('lab_type')
        test_name = request.query_params.get('test_name')
        months = int(request.query_params.get('months', 12))
        
        if not lab_type or not test_name:
            return Response({
                'success': False,
                'message': 'lab_type and test_name are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        trends = MedicalRecordsService.get_lab_report_trends(
            request.user, lab_type, test_name, months
        )
        
        return Response({
            'success': True,
            'data': {
                'lab_type': lab_type,
                'test_name': test_name,
                'months': months,
                'readings': trends
            }
        })


# =============================================================================
# VACCINATION RECORD VIEWS
# =============================================================================

class VaccinationRecordViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing vaccination records.
    
    Endpoints:
    - GET /vaccinations/ - List all vaccinations
    - POST /vaccinations/ - Create vaccination record
    - GET /vaccinations/{id}/ - Get vaccination detail
    - PUT /vaccinations/{id}/ - Update vaccination
    - DELETE /vaccinations/{id}/ - Delete vaccination
    - GET /vaccinations/pending/ - Get pending/due vaccinations
    - GET /vaccinations/schedule/ - Get vaccination schedule
    - POST /vaccinations/{id}/verify/ - Verify vaccination (doctor only)
    """
    permission_classes = [permissions.IsAuthenticated, IsPatientOrDoctor]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return VaccinationRecordCreateSerializer
        if self.action == 'list':
            return VaccinationRecordListSerializer
        return VaccinationRecordSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return VaccinationRecord.objects.filter(user=user).order_by('-vaccination_date')
        else:
            return VaccinationRecord.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response({
            'success': True,
            'message': 'Vaccination record created successfully',
            'data': VaccinationRecordSerializer(serializer.instance).data
        }, status=status.HTTP_201_CREATED)
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Filter by type
        vaccine_type = request.query_params.get('type')
        if vaccine_type:
            queryset = queryset.filter(vaccine_type=vaccine_type)
        
        # Filter by verified
        verified = request.query_params.get('verified')
        if verified:
            queryset = queryset.filter(is_verified=verified.lower() == 'true')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'count': queryset.count(),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending/due vaccinations."""
        from django.db.models import F
        
        today = timezone.now().date()
        vaccinations = VaccinationRecord.objects.filter(
            user=request.user,
            next_due_date__lte=today
        ).exclude(
            dose_number__gte=F('total_doses')
        ).order_by('next_due_date')
        
        serializer = VaccinationRecordListSerializer(vaccinations, many=True)
        return Response({
            'success': True,
            'count': vaccinations.count(),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def schedule(self, request):
        """Get vaccination schedule."""
        schedule = MedicalRecordsService.get_vaccination_schedule(request.user)
        return Response({
            'success': True,
            'data': schedule
        })
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify vaccination (doctor only)."""
        if request.user.role != 'doctor':
            return Response({
                'success': False,
                'message': 'Only doctors can verify vaccinations'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            vaccination = VaccinationRecord.objects.get(pk=pk)
            vaccination.is_verified = True
            vaccination.verified_by = request.user
            vaccination.save(update_fields=['is_verified', 'verified_by', 'updated_at'])
            
            return Response({
                'success': True,
                'message': 'Vaccination verified successfully',
                'data': VaccinationRecordSerializer(vaccination).data
            })
        except VaccinationRecord.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Vaccination record not found'
            }, status=status.HTTP_404_NOT_FOUND)


# =============================================================================
# ALLERGY VIEWS
# =============================================================================

class AllergyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing allergies.
    
    Endpoints:
    - GET /allergies/ - List all allergies
    - POST /allergies/ - Create allergy record
    - GET /allergies/{id}/ - Get allergy detail
    - PUT /allergies/{id}/ - Update allergy
    - DELETE /allergies/{id}/ - Delete allergy
    - GET /allergies/active/ - Get active allergies
    - GET /allergies/critical/ - Get critical allergies
    - GET /allergies/drug/ - Get drug allergies
    """
    permission_classes = [permissions.IsAuthenticated, IsPatientOrDoctor]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AllergyCreateSerializer
        if self.action == 'list':
            return AllergyListSerializer
        return AllergySerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return Allergy.objects.filter(user=user).order_by('-severity', 'allergen')
        else:
            return Allergy.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        # Sync to health profile
        HealthProfileService.sync_allergies_from_records(self.request.user)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response({
            'success': True,
            'message': 'Allergy record created successfully',
            'data': AllergySerializer(serializer.instance).data
        }, status=status.HTTP_201_CREATED)
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Filter by type
        allergy_type = request.query_params.get('type')
        if allergy_type:
            queryset = queryset.filter(allergy_type=allergy_type)
        
        # Filter by status
        allergy_status = request.query_params.get('status')
        if allergy_status:
            queryset = queryset.filter(status=allergy_status)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'count': queryset.count(),
            'data': serializer.data
        })
    
    def perform_destroy(self, instance):
        instance.delete()
        # Sync to health profile
        HealthProfileService.sync_allergies_from_records(self.request.user)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active allergies."""
        allergies = MedicalRecordsService.get_active_allergies(request.user)
        serializer = AllergyListSerializer(allergies, many=True)
        return Response({
            'success': True,
            'count': len(allergies),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def critical(self, request):
        """Get critical allergies."""
        allergies = MedicalRecordsService.get_critical_allergies(request.user)
        serializer = AllergySerializer(allergies, many=True)
        return Response({
            'success': True,
            'count': len(allergies),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def drug(self, request):
        """Get drug allergies."""
        drug_allergies = MedicalRecordsService.get_drug_allergies(request.user)
        return Response({
            'success': True,
            'count': len(drug_allergies),
            'data': drug_allergies
        })


# =============================================================================
# FAMILY MEDICAL HISTORY VIEWS
# =============================================================================

class FamilyMedicalHistoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing family medical history.
    
    Endpoints:
    - GET /family-history/ - List all family history
    - POST /family-history/ - Create family history record
    - GET /family-history/{id}/ - Get record detail
    - PUT /family-history/{id}/ - Update record
    - DELETE /family-history/{id}/ - Delete record
    - GET /family-history/summary/ - Get summary by condition
    - GET /family-history/risk-conditions/ - Get hereditary risk conditions
    """
    permission_classes = [permissions.IsAuthenticated, IsPatientOrDoctor]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return FamilyMedicalHistoryCreateSerializer
        if self.action == 'list':
            return FamilyMedicalHistoryListSerializer
        return FamilyMedicalHistorySerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return FamilyMedicalHistory.objects.filter(user=user).order_by('relation', 'condition')
        else:
            return FamilyMedicalHistory.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response({
            'success': True,
            'message': 'Family history record created successfully',
            'data': FamilyMedicalHistorySerializer(serializer.instance).data
        }, status=status.HTTP_201_CREATED)
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Filter by relation
        relation = request.query_params.get('relation')
        if relation:
            queryset = queryset.filter(relation=relation)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'count': queryset.count(),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get family history summary by condition."""
        summary = MedicalRecordsService.get_family_history_summary(request.user)
        return Response({
            'success': True,
            'data': summary
        })
    
    @action(detail=False, methods=['get'], url_path='risk-conditions')
    def risk_conditions(self, request):
        """Get conditions with hereditary risk."""
        conditions = MedicalRecordsService.get_hereditary_risk_conditions(request.user)
        return Response({
            'success': True,
            'data': {
                'risk_conditions': conditions,
                'message': 'Conditions present in 2+ family members'
            }
        })


# =============================================================================
# HOSPITALIZATION VIEWS
# =============================================================================

class HospitalizationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing hospitalization records.
    
    Endpoints:
    - GET /hospitalizations/ - List all hospitalizations
    - POST /hospitalizations/ - Create hospitalization record
    - GET /hospitalizations/{id}/ - Get hospitalization detail
    - PUT /hospitalizations/{id}/ - Update hospitalization
    - DELETE /hospitalizations/{id}/ - Delete hospitalization
    - GET /hospitalizations/pending-followups/ - Get pending follow-ups
    """
    permission_classes = [permissions.IsAuthenticated, IsPatientOrDoctor]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return HospitalizationCreateSerializer
        if self.action == 'list':
            return HospitalizationListSerializer
        return HospitalizationSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return Hospitalization.objects.filter(user=user).order_by('-admission_date')
        else:
            return Hospitalization.objects.none()
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response({
            'success': True,
            'message': 'Hospitalization record created successfully',
            'data': HospitalizationSerializer(serializer.instance).data
        }, status=status.HTTP_201_CREATED)
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Filter by type
        admission_type = request.query_params.get('type')
        if admission_type:
            queryset = queryset.filter(admission_type=admission_type)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'count': queryset.count(),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'], url_path='pending-followups')
    def pending_followups(self, request):
        """Get hospitalizations with pending follow-ups."""
        followups = MedicalRecordsService.get_pending_followups(request.user)
        serializer = HospitalizationListSerializer(followups, many=True)
        return Response({
            'success': True,
            'count': len(followups),
            'data': serializer.data
        })


# =============================================================================
# VITAL SIGN VIEWS
# =============================================================================

class VitalSignViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing vital signs.
    
    Endpoints:
    - GET /vitals/ - List all vital signs
    - POST /vitals/ - Record vital signs
    - GET /vitals/{id}/ - Get vital sign detail
    - PUT /vitals/{id}/ - Update vital sign
    - DELETE /vitals/{id}/ - Delete vital sign
    - GET /vitals/latest/ - Get latest vitals
    - GET /vitals/trends/ - Get vital trends
    - GET /vitals/statistics/ - Get vital statistics
    """
    permission_classes = [permissions.IsAuthenticated, IsPatientOrDoctor]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return VitalSignCreateSerializer
        if self.action == 'list':
            return VitalSignListSerializer
        return VitalSignSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return VitalSign.objects.filter(user=user).order_by('-recorded_at')
        else:
            return VitalSign.objects.none()
    
    def perform_create(self, serializer):
        vital = serializer.save(user=self.request.user)
        
        # Check for alerts
        alerts = MedicalRecordsService.check_vital_alerts(vital)
        if alerts:
            # Store alerts for response
            self._vital_alerts = alerts
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self._vital_alerts = []
        self.perform_create(serializer)
        
        # Update weight in health profile if provided
        if serializer.validated_data.get('weight_kg'):
            try:
                profile = HealthProfile.objects.get(user=request.user)
                profile.weight_kg = serializer.validated_data['weight_kg']
                profile.save(update_fields=['weight_kg', 'updated_at'])
            except HealthProfile.DoesNotExist:
                pass
        
        response_data = {
            'success': True,
            'message': 'Vital signs recorded successfully',
            'data': VitalSignSerializer(serializer.instance).data
        }
        
        if self._vital_alerts:
            response_data['alerts'] = self._vital_alerts
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Filter by date range
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        
        if from_date:
            queryset = queryset.filter(recorded_at__date__gte=from_date)
        if to_date:
            queryset = queryset.filter(recorded_at__date__lte=to_date)
        
        # Limit
        limit = int(request.query_params.get('limit', 50))
        queryset = queryset[:limit]
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'count': len(serializer.data),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def latest(self, request):
        """Get latest vital signs."""
        vital = MedicalRecordsService.get_latest_vitals(request.user)
        if vital:
            serializer = VitalSignSerializer(vital)
            return Response({
                'success': True,
                'data': serializer.data
            })
        else:
            return Response({
                'success': True,
                'data': None,
                'message': 'No vital signs recorded'
            })
    
    @action(detail=False, methods=['get'])
    def trends(self, request):
        """Get vital sign trends."""
        days = int(request.query_params.get('days', 30))
        trends = MedicalRecordsService.get_vital_trends(request.user, days)
        return Response({
            'success': True,
            'data': {
                'period_days': days,
                'trends': trends
            }
        })
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get vital sign statistics."""
        days = int(request.query_params.get('days', 90))
        stats = HealthAnalyticsService.get_vital_statistics(request.user, days)
        return Response({
            'success': True,
            'data': stats
        })


# =============================================================================
# SHARED RECORD VIEWS
# =============================================================================

class SharedRecordViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing shared records.
    
    Endpoints:
    - GET /sharing/ - List shared records
    - POST /sharing/ - Create share
    - DELETE /sharing/{id}/ - Revoke share
    - GET /sharing/my-shares/ - Get records I've shared
    - GET /sharing/accessible-patients/ - Get patients who shared with me (doctor)
    - GET /sharing/patient/{id}/records/ - Get accessible records for patient (doctor)
    """
    permission_classes = [permissions.IsAuthenticated, IsPatientOrDoctor]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SharedRecordCreateSerializer
        if self.action == 'list':
            return SharedRecordListSerializer
        return SharedRecordSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return SharedRecord.objects.filter(patient=user).order_by('-created_at')
        else:
            return SharedRecord.objects.filter(doctor=user, is_active=True).order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """Share records with a doctor."""
        if request.user.role != 'patient':
            return Response({
                'success': False,
                'message': 'Only patients can share records'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response({
            'success': True,
            'message': 'Records shared successfully',
            'data': SharedRecordSerializer(serializer.instance).data
        }, status=status.HTTP_201_CREATED)
    
    def destroy(self, request, *args, **kwargs):
        """Revoke sharing."""
        instance = self.get_object()
        
        if instance.patient != request.user:
            return Response({
                'success': False,
                'message': 'You can only revoke your own shares'
            }, status=status.HTTP_403_FORBIDDEN)
        
        SharingService.revoke_share(instance.id, request.user)
        
        return Response({
            'success': True,
            'message': 'Sharing revoked successfully'
        })
    
    @action(detail=False, methods=['get'], url_path='my-shares')
    def my_shares(self, request):
        """Get records shared by current patient."""
        if request.user.role != 'patient':
            return Response({
                'success': False,
                'message': 'Only patients can view shared records'
            }, status=status.HTTP_403_FORBIDDEN)
        
        shares = SharingService.get_patient_shares(request.user)
        serializer = SharedRecordListSerializer(shares, many=True)
        return Response({
            'success': True,
            'count': len(shares),
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'], url_path='accessible-patients')
    def accessible_patients(self, request):
        """Get patients who have shared records with this doctor."""
        if request.user.role != 'doctor':
            return Response({
                'success': False,
                'message': 'Only doctors can view accessible patients'
            }, status=status.HTTP_403_FORBIDDEN)
        
        patients = SharingService.get_doctor_accessible_patients(request.user)
        
        # Format response
        data = []
        for p in patients:
            from .serializers import UserMinimalSerializer
            data.append({
                'patient': UserMinimalSerializer(p['patient']).data,
                'share_types': p['share_types'],
                'is_permanent': p['is_permanent'],
                'latest_share': p['latest_share'],
            })
        
        return Response({
            'success': True,
            'count': len(data),
            'data': data
        })
    
    @action(detail=False, methods=['get'], url_path='patient/(?P<patient_id>[^/.]+)/records')
    def patient_records(self, request, patient_id=None):
        """Get accessible records for a specific patient (doctor only)."""
        if request.user.role != 'doctor':
            return Response({
                'success': False,
                'message': 'Only doctors can access patient records'
            }, status=status.HTTP_403_FORBIDDEN)
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            patient = User.objects.get(id=patient_id, role='patient')
        except User.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Patient not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check access
        if not SharingService.can_doctor_access(request.user, patient):
            return Response({
                'success': False,
                'message': 'You do not have access to this patient\'s records'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get accessible records
        records = SharingService.get_accessible_records(request.user, patient)
        
        # Serialize the records
        from .serializers import UserMinimalSerializer
        
        response_data = {
            'patient': UserMinimalSerializer(patient).data,
        }
        
        if 'health_profile' in records:
            response_data['health_profile'] = HealthProfileSerializer(
                records['health_profile']
            ).data if records['health_profile'] else None
        
        if 'medical_conditions' in records:
            response_data['medical_conditions'] = MedicalConditionListSerializer(
                records['medical_conditions'], many=True
            ).data
        
        if 'allergies' in records:
            response_data['allergies'] = AllergyListSerializer(
                records['allergies'], many=True
            ).data
        
        if 'documents' in records:
            response_data['documents'] = MedicalDocumentListSerializer(
                records['documents'], many=True
            ).data
        
        if 'lab_reports' in records:
            response_data['lab_reports'] = LabReportListSerializer(
                records['lab_reports'], many=True
            ).data
        
        if 'vaccinations' in records:
            response_data['vaccinations'] = VaccinationRecordListSerializer(
                records['vaccinations'], many=True
            ).data
        
        if 'family_history' in records:
            response_data['family_history'] = FamilyMedicalHistoryListSerializer(
                records['family_history'], many=True
            ).data
        
        if 'hospitalizations' in records:
            response_data['hospitalizations'] = HospitalizationListSerializer(
                records['hospitalizations'], many=True
            ).data
        
        if 'vital_signs' in records:
            response_data['vital_signs'] = VitalSignListSerializer(
                records['vital_signs'], many=True
            ).data
        
        return Response({
            'success': True,
            'data': response_data
        })


# =============================================================================
# ANALYTICS VIEWS
# =============================================================================

class HealthAnalyticsView(views.APIView):
    """
    View for health analytics.
    
    Endpoints:
    - GET /analytics/timeline/ - Get health timeline
    - GET /analytics/score/ - Get health score
    - GET /analytics/summary/ - Get comprehensive summary
    - GET /analytics/quick-data/ - Get quick dashboard data
    """
    permission_classes = [permissions.IsAuthenticated, IsPatient]
    
    def get(self, request, *args, **kwargs):
        action = kwargs.get('action', 'summary')
        
        if action == 'timeline':
            return self.get_timeline(request)
        elif action == 'score':
            return self.get_score(request)
        elif action == 'quick-data':
            return self.get_quick_data(request)
        else:
            return self.get_summary(request)
    
    def get_timeline(self, request):
        """Get health timeline."""
        months = int(request.query_params.get('months', 12))
        timeline = HealthAnalyticsService.get_health_timeline(request.user, months)
        
        return Response({
            'success': True,
            'data': {
                'period_months': months,
                'events': timeline
            }
        })
    
    def get_score(self, request):
        """Get health score."""
        score_data = HealthAnalyticsService.get_health_score(request.user)
        return Response({
            'success': True,
            'data': score_data
        })
    
    def get_summary(self, request):
        """Get comprehensive health summary."""
        user = request.user
        
        # Get all summary data
        try:
            profile = HealthProfile.objects.get(user=user)
            profile_data = HealthProfileSummarySerializer(profile).data
        except HealthProfile.DoesNotExist:
            profile_data = None
        
        active_conditions = MedicalCondition.objects.filter(
            user=user,
            status__in=['active', 'managed', 'recurring']
        )[:10]
        
        recent_documents = MedicalDocument.objects.filter(user=user)[:5]
        recent_lab_reports = LabReport.objects.filter(user=user)[:5]
        
        due_vaccinations = VaccinationRecord.objects.filter(
            user=user,
            next_due_date__lte=timezone.now().date()
        )[:5]
        
        critical_allergies = Allergy.objects.filter(
            user=user,
            status='active',
            severity__in=['severe', 'life_threatening']
        )
        
        latest_vitals = VitalSign.objects.filter(user=user).first()
        
        recent_hospitalizations = Hospitalization.objects.filter(user=user)[:3]
        
        return Response({
            'success': True,
            'data': {
                'profile': profile_data,
                'active_conditions': MedicalConditionListSerializer(active_conditions, many=True).data,
                'recent_documents': MedicalDocumentListSerializer(recent_documents, many=True).data,
                'recent_lab_reports': LabReportListSerializer(recent_lab_reports, many=True).data,
                'vaccinations_due': VaccinationRecordListSerializer(due_vaccinations, many=True).data,
                'critical_allergies': AllergySerializer(critical_allergies, many=True).data,
                'latest_vitals': VitalSignSerializer(latest_vitals).data if latest_vitals else None,
                'recent_hospitalizations': HospitalizationListSerializer(recent_hospitalizations, many=True).data,
            }
        })
    
    def get_quick_data(self, request):
        """Get quick dashboard data."""
        data = HealthAnalyticsService.get_quick_dashboard_data(request.user)
        
        # Serialize latest vitals
        if data['latest_vitals']:
            data['latest_vitals'] = VitalSignListSerializer(data['latest_vitals']).data
        
        return Response({
            'success': True,
            'data': data
        })


# =============================================================================
# HEALTH CHECK VIEW
# =============================================================================

class HealthCheckView(views.APIView):
    """Health check endpoint."""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        return Response({
            'success': True,
            'message': 'Health Records service is running',
            'service': 'health_records',
            'version': '1.0.0',
            'timestamp': timezone.now().isoformat(),
        })
