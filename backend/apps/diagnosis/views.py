"""
Diagnosis API Views
===================
REST API endpoints for diagnosis functionality.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
import logging

from .models import Symptom, Disease, DiagnosisSession
from .services.diagnosis_service import DiagnosisService
from .ml import get_model_loader
from .serializers import (
    SymptomSerializer, SymptomListSerializer,
    DiseaseSerializer, DiseaseListSerializer,
    DiagnoseTextRequestSerializer, DiagnoseSymptomsRequestSerializer,
    FeedbackRequestSerializer, DiagnosisResponseSerializer,
    DiagnosisSessionSerializer, DiagnosisSessionListSerializer,
    ModelStatusSerializer
)

logger = logging.getLogger(__name__)


class StandardPagination(PageNumberPagination):
    """Standard pagination for list views."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ==================== Diagnosis Endpoints ====================

class DiagnoseView(APIView):
    """
    Main diagnosis endpoint.
    
    POST /api/v1/diagnosis/diagnose/
    
    Accepts natural language description of symptoms and returns
    disease predictions with severity assessment.
    """
    permission_classes = [AllowAny]  # Allow anonymous for village users
    
    def post(self, request):
        """
        Diagnose from text description.
        
        Request body:
        {
            "text": "I have fever, headache and body pain for 3 days",
            "language": "en",  // optional, auto-detect
            "patient_age": 30,  // optional
            "patient_gender": "male",  // optional
            "symptom_duration_days": 3  // optional
        }
        """
        serializer = DiagnoseTextRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error_code': 'VALIDATION_ERROR',
                'message': 'Invalid request data',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        # Get user if authenticated
        user = request.user if request.user.is_authenticated else None
        
        # Perform diagnosis
        service = DiagnosisService()
        result = service.diagnose(
            text=data['text'],
            user=user,
            language=data.get('language'),
            patient_age=data.get('patient_age'),
            patient_gender=data.get('patient_gender'),
            symptom_duration_days=data.get('symptom_duration_days'),
            input_type='text',
            device_type=data.get('device_type', ''),
            app_version=data.get('app_version', ''),
            save_session=True
        )
        
        response_status = status.HTTP_200_OK if result.get('success') else status.HTTP_422_UNPROCESSABLE_ENTITY
        
        return Response(result, status=response_status)


class DiagnoseFromSymptomsView(APIView):
    """
    Diagnose from selected symptoms.
    
    POST /api/v1/diagnosis/diagnose-symptoms/
    
    Accepts list of symptom codes (when user selects from UI list).
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Diagnose from symptom list.
        
        Request body:
        {
            "symptoms": ["fever", "headache", "body_pain"],
            "language": "en",
            "patient_age": 30,
            "patient_gender": "male"
        }
        """
        serializer = DiagnoseSymptomsRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error_code': 'VALIDATION_ERROR',
                'message': 'Invalid request data',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        user = request.user if request.user.is_authenticated else None
        
        service = DiagnosisService()
        result = service.diagnose_from_symptoms(
            symptoms=data['symptoms'],
            user=user,
            language=data.get('language', 'en'),
            patient_age=data.get('patient_age'),
            patient_gender=data.get('patient_gender'),
            save_session=True
        )
        
        response_status = status.HTTP_200_OK if result.get('success') else status.HTTP_422_UNPROCESSABLE_ENTITY
        
        return Response(result, status=response_status)


class QuickDiagnoseView(APIView):
    """
    Quick diagnosis without saving session.
    
    POST /api/v1/diagnosis/quick-diagnose/
    
    Faster response, no database write.
    Useful for real-time suggestions.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Quick diagnosis without saving."""
        text = request.data.get('text', '')
        language = request.data.get('language')
        
        if not text:
            return Response({
                'success': False,
                'message': 'Please provide symptom description'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        service = DiagnosisService()
        result = service.diagnose(
            text=text,
            language=language,
            save_session=False  # Don't save to database
        )
        
        # Return minimal response for quick feedback
        return Response({
            'success': result.get('success', False),
            'symptoms': result.get('symptoms', {}).get('codes', []),
            'top_prediction': result.get('predictions', {}).get('top'),
            'severity': result.get('severity', {}).get('level', 'low'),
            'message': result.get('message', '')
        })


# ==================== Feedback Endpoint ====================

class SessionFeedbackView(APIView):
    """
    Submit feedback for a diagnosis session.
    
    POST /api/v1/diagnosis/feedback/
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Submit feedback.
        
        Request body:
        {
            "session_id": "DIAG-ABC123XYZ",
            "feedback": "helpful",  // helpful, not_helpful, incorrect
            "comment": "Optional comment"
        }
        """
        serializer = FeedbackRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        service = DiagnosisService()
        success = service.update_feedback(
            session_id=data['session_id'],
            feedback=data['feedback'],
            comment=data.get('comment', '')
        )
        
        if success:
            return Response({
                'success': True,
                'message': 'Thank you for your feedback!'
            })
        else:
            return Response({
                'success': False,
                'message': 'Session not found'
            }, status=status.HTTP_404_NOT_FOUND)


# ==================== Session History ====================

class SessionHistoryView(APIView):
    """
    Get diagnosis history for authenticated user.
    
    GET /api/v1/diagnosis/history/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user's diagnosis history."""
        sessions = DiagnosisSession.objects.filter(
            user=request.user
        ).order_by('-created_at')[:50]
        
        serializer = DiagnosisSessionListSerializer(sessions, many=True)
        
        return Response({
            'success': True,
            'count': len(serializer.data),
            'sessions': serializer.data
        })


class SessionDetailView(APIView):
    """
    Get details of a specific diagnosis session.
    
    GET /api/v1/diagnosis/session/<session_id>/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, session_id):
        """Get session details."""
        try:
            session = DiagnosisSession.objects.get(session_id=session_id)
            
            # Check permission - only owner or anonymous sessions
            if session.user and request.user != session.user:
                if not request.user.is_staff:
                    return Response({
                        'success': False,
                        'message': 'Not authorized to view this session'
                    }, status=status.HTTP_403_FORBIDDEN)
            
            serializer = DiagnosisSessionSerializer(session)
            
            return Response({
                'success': True,
                'session': serializer.data
            })
            
        except DiagnosisSession.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Session not found'
            }, status=status.HTTP_404_NOT_FOUND)


# ==================== Symptoms Endpoints ====================

class SymptomListView(APIView):
    """
    Get all available symptoms.
    
    GET /api/v1/diagnosis/symptoms/
    GET /api/v1/diagnosis/symptoms/?language=te
    GET /api/v1/diagnosis/symptoms/?category=respiratory
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Get symptom list."""
        language = request.query_params.get('language', 'en')
        category = request.query_params.get('category')
        
        queryset = Symptom.objects.filter(is_active=True)
        
        if category:
            queryset = queryset.filter(category=category)
        
        queryset = queryset.order_by('category', 'name_english')
        
        serializer = SymptomListSerializer(
            queryset, 
            many=True,
            context={'language': language}
        )
        
        return Response({
            'success': True,
            'count': len(serializer.data),
            'symptoms': serializer.data
        })


class SymptomsByCategoryView(APIView):
    """
    Get symptoms grouped by category.
    
    GET /api/v1/diagnosis/symptoms/by-category/
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Get symptoms by category."""
        language = request.query_params.get('language', 'en')
        
        service = DiagnosisService()
        categories = service.get_symptoms_by_category(language)
        
        return Response({
            'success': True,
            'categories': categories
        })


class SymptomDetailView(APIView):
    """
    Get symptom details.
    
    GET /api/v1/diagnosis/symptoms/<code>/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, code):
        """Get symptom by code."""
        try:
            symptom = Symptom.objects.get(code=code, is_active=True)
            serializer = SymptomSerializer(symptom, context={'request': request})
            
            return Response({
                'success': True,
                'symptom': serializer.data
            })
            
        except Symptom.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Symptom not found'
            }, status=status.HTTP_404_NOT_FOUND)


class SymptomSearchView(APIView):
    """
    Search symptoms by name/keyword.
    
    GET /api/v1/diagnosis/symptoms/search/?q=fever
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Search symptoms."""
        query = request.query_params.get('q', '')
        language = request.query_params.get('language', 'en')
        
        if len(query) < 2:
            return Response({
                'success': False,
                'message': 'Query must be at least 2 characters'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Search in name and keywords
        queryset = Symptom.objects.filter(is_active=True)
        
        # Filter by query
        from django.db.models import Q
        queryset = queryset.filter(
            Q(name_english__icontains=query) |
            Q(name_telugu__icontains=query) |
            Q(name_hindi__icontains=query) |
            Q(code__icontains=query)
        )[:20]
        
        serializer = SymptomListSerializer(
            queryset,
            many=True,
            context={'language': language}
        )
        
        return Response({
            'success': True,
            'query': query,
            'count': len(serializer.data),
            'symptoms': serializer.data
        })


# ==================== Diseases Endpoints ====================

class DiseaseListView(APIView):
    """
    Get all diseases.
    
    GET /api/v1/diagnosis/diseases/
    """
    permission_classes = [AllowAny]
    pagination_class = StandardPagination
    
    def get(self, request):
        """Get disease list."""
        queryset = Disease.objects.filter(is_active=True).order_by('name_english')
        
        # Filter by severity
        severity = request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(typical_severity=severity)
        
        # Filter by specialist
        specialist = request.query_params.get('specialist')
        if specialist:
            queryset = queryset.filter(recommended_specialist=specialist)
        
        serializer = DiseaseListSerializer(queryset[:100], many=True)
        
        return Response({
            'success': True,
            'count': len(serializer.data),
            'diseases': serializer.data
        })


class DiseaseDetailView(APIView):
    """
    Get disease details.
    
    GET /api/v1/diagnosis/diseases/<code>/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, code):
        """Get disease by code."""
        try:
            disease = Disease.objects.get(code=code, is_active=True)
            serializer = DiseaseSerializer(disease, context={'request': request})
            
            # Get related symptoms
            symptoms = disease.symptoms.filter(is_active=True)[:20]
            symptom_serializer = SymptomListSerializer(
                symptoms,
                many=True,
                context={'language': request.query_params.get('language', 'en')}
            )
            
            return Response({
                'success': True,
                'disease': serializer.data,
                'related_symptoms': symptom_serializer.data
            })
            
        except Disease.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Disease not found'
            }, status=status.HTTP_404_NOT_FOUND)


# ==================== Model Status ====================

class ModelStatusView(APIView):
    """
    Check ML model status.
    
    GET /api/v1/diagnosis/model-status/
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Get model loading status."""
        loader = get_model_loader()
        info = loader.get_model_info()
        
        serializer = ModelStatusSerializer(info)
        
        return Response({
            'success': True,
            'status': serializer.data
        })


class ReloadModelsView(APIView):
    """
    Reload ML models (admin only).
    
    POST /api/v1/diagnosis/reload-models/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Reload models."""
        if not request.user.is_staff:
            return Response({
                'success': False,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        loader = get_model_loader()
        status_result = loader.load_all_models(force_reload=True)
        
        return Response({
            'success': True,
            'message': 'Models reloaded',
            'status': status_result
        })


# ==================== Health Check ====================

class HealthCheckView(APIView):
    """
    Health check endpoint.
    
    GET /api/v1/diagnosis/health/
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Check service health."""
        loader = get_model_loader()
        
        # Check database
        try:
            symptom_count = Symptom.objects.count()
            disease_count = Disease.objects.count()
            db_status = 'healthy'
        except Exception as e:
            symptom_count = 0
            disease_count = 0
            db_status = f'error: {str(e)}'
        
        # Check models
        models_status = loader.check_models_exist()
        
        return Response({
            'status': 'healthy',
            'database': {
                'status': db_status,
                'symptoms': symptom_count,
                'diseases': disease_count
            },
            'models': models_status
        })