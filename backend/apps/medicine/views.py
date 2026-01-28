from django.shortcuts import render

"""
Medicine App Views for MediConnect.

API endpoints for:
- Medicine search and details
- Generic alternatives
- Drug interactions
- Prescriptions management
- Medicine reminders
- Reminder logs and adherence
"""

import logging
from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db import transaction
from django.db import models

from .models import (
    Medicine,
    MedicineAlternative,
    DrugInteraction,
    UserPrescription,
    PrescriptionMedicine,
    MedicineReminder,
    ReminderLog,
    MedicineSearchHistory,
)
from .serializers import (
    MedicineListSerializer,
    MedicineDetailSerializer,
    MedicineSearchSerializer,
    MedicineAlternativeSerializer,
    AlternativeListSerializer,
    DrugInteractionSerializer,
    InteractionCheckSerializer,
    InteractionCheckResultSerializer,
    UserPrescriptionSerializer,
    UserPrescriptionListSerializer,
    UserPrescriptionCreateSerializer,
    UserPrescriptionUpdateSerializer,
    PrescriptionMedicineSerializer,
    PrescriptionMedicineCreateSerializer,
    MedicineReminderSerializer,
    MedicineReminderListSerializer,
    MedicineReminderCreateSerializer,
    MedicineReminderUpdateSerializer,
    ReminderLogSerializer,
    ReminderLogListSerializer,
    ReminderResponseSerializer,
    TodayRemindersSerializer,
    MedicineSearchHistorySerializer,
    MedicineCategorySerializer,
    AdherenceStatsSerializer,
)
from .services import MedicineService, PrescriptionService, ReminderService

logger = logging.getLogger(__name__)


# =============================================================================
# MEDICINE VIEWS
# =============================================================================

class MedicineViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for medicines.
    Read-only - medicine data is pre-loaded.
    
    Endpoints:
    - GET /api/v1/medicine/medicines/ - List medicines
    - GET /api/v1/medicine/medicines/{id}/ - Get medicine details
    - POST /api/v1/medicine/medicines/search/ - Search medicines
    - GET /api/v1/medicine/medicines/{id}/alternatives/ - Get alternatives
    - GET /api/v1/medicine/medicines/{id}/interactions/ - Get interactions
    - POST /api/v1/medicine/medicines/check-interactions/ - Check interactions
    - GET /api/v1/medicine/medicines/categories/ - Get categories
    - GET /api/v1/medicine/medicines/types/ - Get medicine types
    - GET /api/v1/medicine/medicines/popular/ - Get popular medicines
    """
    
    permission_classes = [IsAuthenticated]
    queryset = Medicine.objects.filter(is_active=True)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return MedicineListSerializer
        elif self.action == 'search':
            return MedicineSearchSerializer
        elif self.action == 'check_interactions':
            return InteractionCheckSerializer
        return MedicineDetailSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['language'] = self.request.query_params.get('lang', 'en')
        return context
    
    def list(self, request, *args, **kwargs):
        """List medicines with optional filters."""
        queryset = self.get_queryset()
        
        # Filter by category
        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__iexact=category)
        
        # Filter by type
        medicine_type = request.query_params.get('type')
        if medicine_type:
            queryset = queryset.filter(medicine_type=medicine_type)
        
        # Filter by generic only
        if request.query_params.get('generic_only') == 'true':
            queryset = queryset.filter(is_generic=True)
        
        # Limit results
        limit = int(request.query_params.get('limit', 50))
        queryset = queryset.order_by('name')[:limit]
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'count': len(serializer.data),
            'medicines': serializer.data,
        })
    
    def retrieve(self, request, *args, **kwargs):
        """Get medicine details with alternatives and interactions."""
        instance = self.get_object()
        
        medicine_service = MedicineService()
        details = medicine_service.get_medicine_details(
            str(instance.id),
            language=request.query_params.get('lang', 'en')
        )
        
        serializer = self.get_serializer(instance)
        
        return Response({
            'success': True,
            'medicine': serializer.data,
            'alternatives': details['alternatives'],
            'interactions': details['interactions'],
        })
    
    @action(detail=False, methods=['post'])
    def search(self, request):
        """
        Search medicines by name, generic name, or brand.
        
        Body: {
            "query": "paracetamol",
            "category": "antipyretic",
            "medicine_type": "tablet",
            "generic_only": false,
            "otc_only": false,
            "limit": 20
        }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        medicine_service = MedicineService()
        
        medicines, total_count = medicine_service.search_medicines(
            query=data['query'],
            category=data.get('category'),
            medicine_type=data.get('medicine_type'),
            generic_only=data.get('generic_only', False),
            otc_only=data.get('otc_only', False),
            limit=data.get('limit', 20),
            user=request.user
        )
        
        result_serializer = MedicineListSerializer(
            medicines,
            many=True,
            context=self.get_serializer_context()
        )
        
        return Response({
            'success': True,
            'query': data['query'],
            'total_count': total_count,
            'returned_count': len(medicines),
            'medicines': result_serializer.data,
        })
    
    @action(detail=True, methods=['get'])
    def alternatives(self, request, pk=None):
        """Get generic/cheaper alternatives for a medicine."""
        medicine = self.get_object()
        medicine_service = MedicineService()
        
        limit = int(request.query_params.get('limit', 10))
        alternatives = medicine_service.get_alternatives(str(medicine.id), limit)
        
        return Response({
            'success': True,
            'medicine_id': str(medicine.id),
            'medicine_name': medicine.name,
            'medicine_mrp': float(medicine.mrp) if medicine.mrp else None,
            'alternatives_count': len(alternatives),
            'alternatives': alternatives,
        })
    
    @action(detail=True, methods=['get'])
    def interactions(self, request, pk=None):
        """Get drug interactions for a medicine."""
        medicine = self.get_object()
        medicine_service = MedicineService()
        
        interactions = medicine_service.get_interactions(str(medicine.id))
        
        return Response({
            'success': True,
            'medicine_id': str(medicine.id),
            'medicine_name': medicine.name,
            'interactions_count': len(interactions),
            'interactions': interactions,
        })
    
    @action(detail=False, methods=['post'], url_path='check-interactions')
    def check_interactions(self, request):
        """
        Check interactions between multiple medicines.
        
        Body: {
            "medicine_ids": ["uuid1", "uuid2", "uuid3"]
        }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        medicine_ids = [str(mid) for mid in serializer.validated_data['medicine_ids']]
        
        medicine_service = MedicineService()
        result = medicine_service.check_interactions(medicine_ids)
        
        return Response({
            'success': True,
            'medicines_checked': len(medicine_ids),
            **result,
        })
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get all medicine categories with counts."""
        medicine_service = MedicineService()
        categories = medicine_service.get_categories()
        
        return Response({
            'success': True,
            'count': len(categories),
            'categories': categories,
        })
    
    @action(detail=False, methods=['get'])
    def types(self, request):
        """Get all medicine types."""
        medicine_service = MedicineService()
        types = medicine_service.get_medicine_types()
        
        return Response({
            'success': True,
            'types': types,
        })
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Get popular/frequently searched medicines."""
        limit = int(request.query_params.get('limit', 10))
        
        medicine_service = MedicineService()
        medicines = medicine_service.get_popular_medicines(limit)
        
        serializer = MedicineListSerializer(
            medicines,
            many=True,
            context=self.get_serializer_context()
        )
        
        return Response({
            'success': True,
            'count': len(medicines),
            'medicines': serializer.data,
        })
    
    @action(detail=False, methods=['get'], url_path='search-history')
    def search_history(self, request):
        """Get user's recent search history."""
        limit = int(request.query_params.get('limit', 10))
        
        medicine_service = MedicineService()
        history = medicine_service.get_user_search_history(request.user, limit)
        
        return Response({
            'success': True,
            'count': len(history),
            'history': history,
        })
    
    @action(detail=False, methods=['delete'], url_path='search-history/clear')
    def clear_search_history(self, request):
        """Clear user's search history."""
        deleted_count = MedicineSearchHistory.objects.filter(
            user=request.user
        ).delete()[0]
        
        return Response({
            'success': True,
            'message': f'Cleared {deleted_count} search history entries',
        })


# =============================================================================
# PRESCRIPTION VIEWS
# =============================================================================

class PrescriptionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user prescriptions.
    
    Endpoints:
    - GET /api/v1/medicine/prescriptions/ - List prescriptions
    - POST /api/v1/medicine/prescriptions/ - Create prescription
    - GET /api/v1/medicine/prescriptions/{id}/ - Get prescription details
    - PUT /api/v1/medicine/prescriptions/{id}/ - Update prescription
    - DELETE /api/v1/medicine/prescriptions/{id}/ - Delete prescription
    - POST /api/v1/medicine/prescriptions/{id}/add-medicine/ - Add medicine
    - POST /api/v1/medicine/prescriptions/{id}/complete/ - Mark complete
    - POST /api/v1/medicine/prescriptions/{id}/discontinue/ - Discontinue
    - GET /api/v1/medicine/prescriptions/active/ - Get active prescriptions
    - GET /api/v1/medicine/prescriptions/current-medicines/ - Current medicines
    - GET /api/v1/medicine/prescriptions/stats/ - Prescription stats
    - POST /api/v1/medicine/prescriptions/check-interactions/ - Check interactions
    """
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return UserPrescriptionListSerializer
        elif self.action == 'create':
            return UserPrescriptionCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserPrescriptionUpdateSerializer
        elif self.action == 'add_medicine':
            return PrescriptionMedicineCreateSerializer
        return UserPrescriptionSerializer
    
    def get_queryset(self):
        """Return only current user's prescriptions."""
        return UserPrescription.objects.filter(
            user=self.request.user
        ).prefetch_related('medicines').order_by('-prescribed_date')
    
    def list(self, request, *args, **kwargs):
        """List user's prescriptions."""
        queryset = self.get_queryset()
        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Include expired
        if request.query_params.get('include_expired') != 'true':
            today = timezone.now().date()
            queryset = queryset.filter(
                models.Q(valid_until__isnull=True) | models.Q(valid_until__gte=today)
            )
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'count': queryset.count(),
            'prescriptions': serializer.data,
        })
    
    def create(self, request, *args, **kwargs):
        """Create a new prescription."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        prescription = serializer.save()
        
        logger.info(f"Prescription created: {prescription.id} by user {request.user.id}")
        
        return Response({
            'success': True,
            'message': 'Prescription created successfully',
            'prescription': UserPrescriptionSerializer(
                prescription,
                context={'request': request}
            ).data,
        }, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update a prescription."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        prescription = serializer.save()
        
        return Response({
            'success': True,
            'message': 'Prescription updated successfully',
            'prescription': UserPrescriptionSerializer(
                prescription,
                context={'request': request}
            ).data,
        })
    
    def destroy(self, request, *args, **kwargs):
        """Delete a prescription."""
        instance = self.get_object()
        prescription_title = instance.title
        instance.delete()
        
        return Response({
            'success': True,
            'message': f'Prescription "{prescription_title}" deleted successfully',
        })
    
    @action(detail=True, methods=['post'], url_path='add-medicine')
    def add_medicine(self, request, pk=None):
        """Add a medicine to prescription."""
        prescription = self.get_object()
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        prescription_service = PrescriptionService()
        medicine = prescription_service.add_medicine(
            prescription,
            serializer.validated_data
        )
        
        return Response({
            'success': True,
            'message': 'Medicine added to prescription',
            'medicine': PrescriptionMedicineSerializer(medicine).data,
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark prescription as completed."""
        prescription = self.get_object()
        
        prescription_service = PrescriptionService()
        prescription = prescription_service.mark_prescription_completed(prescription)
        
        return Response({
            'success': True,
            'message': 'Prescription marked as completed',
            'prescription': UserPrescriptionSerializer(
                prescription,
                context={'request': request}
            ).data,
        })
    
    @action(detail=True, methods=['post'])
    def discontinue(self, request, pk=None):
        """Discontinue a prescription."""
        prescription = self.get_object()
        reason = request.data.get('reason', '')
        
        prescription_service = PrescriptionService()
        prescription = prescription_service.mark_prescription_discontinued(
            prescription,
            reason
        )
        
        return Response({
            'success': True,
            'message': 'Prescription discontinued',
            'prescription': UserPrescriptionSerializer(
                prescription,
                context={'request': request}
            ).data,
        })
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get active prescriptions."""
        prescription_service = PrescriptionService()
        prescriptions = prescription_service.get_active_prescriptions(request.user)
        
        serializer = UserPrescriptionListSerializer(prescriptions, many=True)
        
        return Response({
            'success': True,
            'count': len(prescriptions),
            'prescriptions': serializer.data,
        })
    
    @action(detail=False, methods=['get'], url_path='current-medicines')
    def current_medicines(self, request):
        """Get all current active medicines."""
        prescription_service = PrescriptionService()
        medicines = prescription_service.get_current_medicines(request.user)
        
        return Response({
            'success': True,
            'count': len(medicines),
            'medicines': medicines,
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get prescription statistics."""
        prescription_service = PrescriptionService()
        stats = prescription_service.get_prescription_stats(request.user)
        
        return Response({
            'success': True,
            'statistics': stats,
        })
    
    @action(detail=False, methods=['post'], url_path='check-interactions')
    def check_interactions(self, request):
        """Check interactions between current medicines."""
        prescription_service = PrescriptionService()
        interactions = prescription_service.check_medicine_interactions(request.user)
        
        return Response({
            'success': True,
            'has_interactions': len(interactions) > 0,
            'interactions_count': len(interactions),
            'interactions': interactions,
        })


# =============================================================================
# PRESCRIPTION MEDICINE VIEWS
# =============================================================================

class PrescriptionMedicineViewSet(viewsets.ModelViewSet):
    """
    ViewSet for prescription medicines.
    
    Endpoints:
    - GET /api/v1/medicine/prescription-medicines/ - List all
    - GET /api/v1/medicine/prescription-medicines/{id}/ - Get details
    - PUT /api/v1/medicine/prescription-medicines/{id}/ - Update
    - DELETE /api/v1/medicine/prescription-medicines/{id}/ - Delete
    - POST /api/v1/medicine/prescription-medicines/{id}/create-reminder/ - Create reminder
    """
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return PrescriptionMedicineCreateSerializer
        return PrescriptionMedicineSerializer
    
    def get_queryset(self):
        """Return only current user's prescription medicines."""
        return PrescriptionMedicine.objects.filter(
            prescription__user=self.request.user
        ).select_related('prescription', 'medicine')
    
    def list(self, request, *args, **kwargs):
        """List prescription medicines."""
        queryset = self.get_queryset()
        
        # Filter by prescription
        prescription_id = request.query_params.get('prescription')
        if prescription_id:
            queryset = queryset.filter(prescription_id=prescription_id)
        
        # Filter by active only
        if request.query_params.get('active_only') == 'true':
            queryset = queryset.filter(is_active=True)
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'count': queryset.count(),
            'medicines': serializer.data,
        })
    
    def destroy(self, request, *args, **kwargs):
        """Remove medicine from prescription."""
        instance = self.get_object()
        medicine_name = instance.medicine_name
        instance.delete()
        
        return Response({
            'success': True,
            'message': f'Medicine "{medicine_name}" removed from prescription',
        })
    
    @action(detail=True, methods=['post'], url_path='create-reminder')
    def create_reminder(self, request, pk=None):
        """Create reminder from prescription medicine."""
        prescription_medicine = self.get_object()
        
        reminder_service = ReminderService()
        reminder = reminder_service.create_reminders_from_prescription(
            prescription_medicine
        )
        
        if reminder:
            return Response({
                'success': True,
                'message': 'Reminder created successfully',
                'reminder': MedicineReminderSerializer(reminder).data,
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'success': False,
                'message': 'Could not create reminder for this medicine',
            }, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# REMINDER VIEWS
# =============================================================================

class MedicineReminderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for medicine reminders.
    
    Endpoints:
    - GET /api/v1/medicine/reminders/ - List reminders
    - POST /api/v1/medicine/reminders/ - Create reminder
    - GET /api/v1/medicine/reminders/{id}/ - Get reminder details
    - PUT /api/v1/medicine/reminders/{id}/ - Update reminder
    - DELETE /api/v1/medicine/reminders/{id}/ - Delete reminder
    - POST /api/v1/medicine/reminders/{id}/pause/ - Pause reminder
    - POST /api/v1/medicine/reminders/{id}/resume/ - Resume reminder
    - POST /api/v1/medicine/reminders/{id}/cancel/ - Cancel reminder
    - GET /api/v1/medicine/reminders/today/ - Today's reminders
    - GET /api/v1/medicine/reminders/upcoming/ - Upcoming reminders
    - GET /api/v1/medicine/reminders/adherence/ - Adherence stats
    """
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return MedicineReminderListSerializer
        elif self.action == 'create':
            return MedicineReminderCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return MedicineReminderUpdateSerializer
        return MedicineReminderSerializer
    
    def get_queryset(self):
        """Return only current user's reminders."""
        return MedicineReminder.objects.filter(
            user=self.request.user
        ).order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """List user's reminders."""
        queryset = self.get_queryset()
        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        elif request.query_params.get('active_only', 'true') == 'true':
            queryset = queryset.filter(status='active')
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'count': queryset.count(),
            'reminders': serializer.data,
        })
    
    def create(self, request, *args, **kwargs):
        """Create a new reminder."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reminder = serializer.save()
        
        logger.info(f"Reminder created: {reminder.id} by user {request.user.id}")
        
        return Response({
            'success': True,
            'message': 'Reminder created successfully',
            'reminder': MedicineReminderSerializer(reminder).data,
        }, status=status.HTTP_201_CREATED)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a reminder."""
        instance = self.get_object()
        medicine_name = instance.medicine_name
        instance.delete()
        
        return Response({
            'success': True,
            'message': f'Reminder for "{medicine_name}" deleted',
        })
    
    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """Pause a reminder."""
        reminder = self.get_object()
        
        reminder_service = ReminderService()
        reminder = reminder_service.pause_reminder(reminder)
        
        return Response({
            'success': True,
            'message': 'Reminder paused',
            'reminder': MedicineReminderSerializer(reminder).data,
        })
    
    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """Resume a paused reminder."""
        reminder = self.get_object()
        
        reminder_service = ReminderService()
        reminder = reminder_service.resume_reminder(reminder)
        
        return Response({
            'success': True,
            'message': 'Reminder resumed',
            'reminder': MedicineReminderSerializer(reminder).data,
        })
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a reminder."""
        reminder = self.get_object()
        
        reminder_service = ReminderService()
        reminder = reminder_service.cancel_reminder(reminder)
        
        return Response({
            'success': True,
            'message': 'Reminder cancelled',
            'reminder': MedicineReminderSerializer(reminder).data,
        })
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's reminders."""
        reminder_service = ReminderService()
        data = reminder_service.get_today_reminders(request.user)
        
        # Serialize the reminders
        reminders_data = ReminderLogSerializer(
            data['reminders'],
            many=True
        ).data
        
        return Response({
            'success': True,
            'date': data['date'],
            'summary': {
                'total': data['total_reminders'],
                'completed': data['completed'],
                'pending': data['pending'],
                'skipped': data['skipped'],
                'missed': data['missed'],
            },
            'reminders': reminders_data,
        })
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming reminders."""
        hours = int(request.query_params.get('hours', 24))
        
        reminder_service = ReminderService()
        reminders = reminder_service.get_upcoming_reminders(request.user, hours)
        
        serializer = ReminderLogSerializer(reminders, many=True)
        
        return Response({
            'success': True,
            'hours_ahead': hours,
            'count': len(reminders),
            'reminders': serializer.data,
        })
    
    @action(detail=False, methods=['get'])
    def adherence(self, request):
        """Get medication adherence statistics."""
        days = int(request.query_params.get('days', 7))
        
        reminder_service = ReminderService()
        stats = reminder_service.get_adherence_stats(request.user, days)
        
        return Response({
            'success': True,
            'statistics': stats,
        })


# =============================================================================
# REMINDER LOG VIEWS
# =============================================================================

class ReminderLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for reminder logs.
    
    Endpoints:
    - GET /api/v1/medicine/reminder-logs/ - List logs
    - GET /api/v1/medicine/reminder-logs/{id}/ - Get log details
    - POST /api/v1/medicine/reminder-logs/{id}/respond/ - Respond to reminder
    - POST /api/v1/medicine/reminder-logs/{id}/taken/ - Mark as taken
    - POST /api/v1/medicine/reminder-logs/{id}/skipped/ - Mark as skipped
    - POST /api/v1/medicine/reminder-logs/{id}/snooze/ - Snooze reminder
    """
    
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ReminderLogListSerializer
        elif self.action == 'respond':
            return ReminderResponseSerializer
        return ReminderLogSerializer
    
    def get_queryset(self):
        """Return only current user's reminder logs."""
        return ReminderLog.objects.filter(
            reminder__user=self.request.user
        ).select_related('reminder').order_by('-scheduled_date', '-scheduled_time')
    
    def list(self, request, *args, **kwargs):
        """List reminder logs."""
        queryset = self.get_queryset()
        
        # Filter by date
        date_filter = request.query_params.get('date')
        if date_filter:
            queryset = queryset.filter(scheduled_date=date_filter)
        
        # Filter by response
        response_filter = request.query_params.get('response')
        if response_filter:
            queryset = queryset.filter(response=response_filter)
        
        # Filter by reminder
        reminder_id = request.query_params.get('reminder')
        if reminder_id:
            queryset = queryset.filter(reminder_id=reminder_id)
        
        # Limit
        limit = int(request.query_params.get('limit', 50))
        queryset = queryset[:limit]
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'count': len(serializer.data),
            'logs': serializer.data,
        })
    
    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """
        Respond to a reminder.
        
        Body: {
            "response": "taken" | "skipped" | "snoozed",
            "notes": "optional notes"
        }
        """
        reminder_log = self.get_object()
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        response = serializer.validated_data['response']
        notes = serializer.validated_data.get('notes', '')
        
        reminder_service = ReminderService()
        
        if response == 'taken':
            reminder_log = reminder_service.mark_taken(reminder_log, notes)
        elif response == 'skipped':
            reminder_log = reminder_service.mark_skipped(reminder_log, notes)
        elif response == 'snoozed':
            result = reminder_service.snooze_reminder(reminder_log)
            if not result['success']:
                return Response({
                    'success': False,
                    'message': result['message'],
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'success': True,
                'message': result['message'],
                'snooze_info': result,
                'log': ReminderLogSerializer(reminder_log).data,
            })
        
        return Response({
            'success': True,
            'message': f'Reminder marked as {response}',
            'log': ReminderLogSerializer(reminder_log).data,
        })
    
    @action(detail=True, methods=['post'])
    def taken(self, request, pk=None):
        """Quick action to mark reminder as taken."""
        reminder_log = self.get_object()
        notes = request.data.get('notes', '')
        
        reminder_service = ReminderService()
        reminder_log = reminder_service.mark_taken(reminder_log, notes)
        
        return Response({
            'success': True,
            'message': 'Medicine marked as taken',
            'log': ReminderLogSerializer(reminder_log).data,
        })
    
    @action(detail=True, methods=['post'])
    def skipped(self, request, pk=None):
        """Quick action to mark reminder as skipped."""
        reminder_log = self.get_object()
        notes = request.data.get('notes', '')
        
        reminder_service = ReminderService()
        reminder_log = reminder_service.mark_skipped(reminder_log, notes)
        
        return Response({
            'success': True,
            'message': 'Medicine marked as skipped',
            'log': ReminderLogSerializer(reminder_log).data,
        })
    
    @action(detail=True, methods=['post'])
    def snooze(self, request, pk=None):
        """Snooze a reminder."""
        reminder_log = self.get_object()
        
        reminder_service = ReminderService()
        result = reminder_service.snooze_reminder(reminder_log)
        
        if result['success']:
            return Response({
                'success': True,
                'message': result['message'],
                'snooze_info': result,
                'log': ReminderLogSerializer(reminder_log).data,
            })
        else:
            return Response({
                'success': False,
                'message': result['message'],
            }, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# QUICK DATA VIEW
# =============================================================================

class QuickMedicineDataView(views.APIView):
    """
    Get all data needed for medicine home screen in one call.
    
    Endpoint:
    - GET /api/v1/medicine/quick-data/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all medicine screen data."""
        user = request.user
        
        prescription_service = PrescriptionService()
        reminder_service = ReminderService()
        medicine_service = MedicineService()
        
        # Get active prescriptions
        active_prescriptions = prescription_service.get_active_prescriptions(user)
        
        # Get today's reminders
        today_data = reminder_service.get_today_reminders(user)
        
        # Get adherence stats (last 7 days)
        adherence = reminder_service.get_adherence_stats(user, 7)
        
        # Get recent searches
        search_history = medicine_service.get_user_search_history(user, 5)
        
        # Check for interactions
        interactions = prescription_service.check_medicine_interactions(user)
        
        return Response({
            'success': True,
            'data': {
                'active_prescriptions': UserPrescriptionListSerializer(
                    active_prescriptions,
                    many=True
                ).data,
                'prescriptions_count': len(active_prescriptions),
                'today_reminders': {
                    'date': today_data['date'],
                    'total': today_data['total_reminders'],
                    'completed': today_data['completed'],
                    'pending': today_data['pending'],
                    'reminders': ReminderLogListSerializer(
                        today_data['reminders'],
                        many=True
                    ).data,
                },
                'adherence': {
                    'percentage': adherence['adherence_percentage'],
                    'period': adherence['period'],
                },
                'recent_searches': search_history,
                'has_interactions': len(interactions) > 0,
                'interactions_count': len(interactions),
            },
        })


# =============================================================================
# HEALTH CHECK VIEW
# =============================================================================

class MedicineHealthCheckView(views.APIView):
    """
    Health check endpoint for medicine app.
    
    Endpoint:
    - GET /api/v1/medicine/health/
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Check medicine app health."""
        health_status = {
            'status': 'healthy',
            'app': 'medicine',
            'timestamp': timezone.now().isoformat(),
        }
        
        # Check database connectivity
        try:
            Medicine.objects.count()
            health_status['database'] = 'connected'
        except Exception as e:
            health_status['database'] = f'error: {str(e)}'
            health_status['status'] = 'unhealthy'
        
        # Check data availability
        try:
            health_status['data'] = {
                'medicines': Medicine.objects.filter(is_active=True).count(),
                'categories': Medicine.objects.filter(
                    is_active=True
                ).exclude(category='').values('category').distinct().count(),
                'interactions': DrugInteraction.objects.count(),
            }
        except Exception as e:
            health_status['data'] = f'error: {str(e)}'
        
        status_code = status.HTTP_200_OK if health_status['status'] == 'healthy' else status.HTTP_503_SERVICE_UNAVAILABLE
        
        return Response(health_status, status=status_code)

# =============================================================================
# SCHEDULER STATUS VIEW
# =============================================================================

class TaskStatusView(views.APIView):
    """
    View to check scheduler status and trigger jobs.
    
    Endpoints:
    - GET /api/v1/medicine/tasks/status/ - Get scheduler status
    - POST /api/v1/medicine/tasks/trigger/ - Manually trigger a job (admin only)
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get scheduler status and job information."""
        try:
            from .scheduler import get_scheduler_status
            status = get_scheduler_status()
            
            return Response({
                'success': True,
                'scheduler': status,
                'timestamp': timezone.now().isoformat(),
            })
        except ImportError:
            return Response({
                'success': False,
                'error': 'Scheduler module not available. Install apscheduler.',
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    def post(self, request):
        """
        Manually trigger a scheduler job.
        
        Requires admin/staff user.
        
        Body: {
            "job_id": "send_notifications" | "mark_missed" | 
                      "generate_daily_logs" | "expire_prescriptions" | "all"
        }
        """
        if not request.user.is_staff:
            return Response({
                'success': False,
                'error': 'Admin access required',
            }, status=status.HTTP_403_FORBIDDEN)
        
        job_id = request.data.get('job_id', 'all')
        
        try:
            from .scheduler import run_job_now
            
            if job_id == 'all':
                results = {}
                for jid in ['generate_daily_logs', 'send_notifications', 'mark_missed', 'expire_prescriptions']:
                    results[jid] = run_job_now(jid)
                
                return Response({
                    'success': True,
                    'job_id': 'all',
                    'results': results,
                    'timestamp': timezone.now().isoformat(),
                })
            else:
                result = run_job_now(job_id)
                return Response({
                    **result,
                    'timestamp': timezone.now().isoformat(),
                })
            
        except ImportError:
            return Response({
                'success': False,
                'error': 'Scheduler module not available',
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.error(f"Error triggering job: {e}")
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)