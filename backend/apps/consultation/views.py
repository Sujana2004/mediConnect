from django.shortcuts import render

"""
Consultation App Views
======================
API ViewSets and Views for consultation management.
"""

import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Q, Count, Avg
from django.shortcuts import get_object_or_404

from rest_framework import viewsets, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from apps.consultation.models import (
    ConsultationRoom,
    Consultation,
    ConsultationNote,
    ConsultationPrescription,
    ConsultationAttachment,
    ConsultationFeedback,
)
from apps.consultation.serializers import (
    # Room
    ConsultationRoomSerializer,
    RoomJoinInfoSerializer,
    # Notes
    ConsultationNoteSerializer,
    ConsultationNoteCreateSerializer,
    ConsultationNoteListSerializer,
    # Prescriptions
    ConsultationPrescriptionSerializer,
    ConsultationPrescriptionCreateSerializer,
    ConsultationPrescriptionListSerializer,
    # Attachments
    ConsultationAttachmentSerializer,
    ConsultationAttachmentCreateSerializer,
    ConsultationAttachmentListSerializer,
    # Feedback
    ConsultationFeedbackSerializer,
    ConsultationFeedbackCreateSerializer,
    ConsultationFeedbackSummarySerializer,
    # Consultation
    ConsultationSerializer,
    ConsultationListSerializer,
    ConsultationCreateSerializer,
    ConsultationFromAppointmentSerializer,
    ConsultationEndSerializer,
    ConsultationCancelSerializer,
    ConsultationRescheduleSerializer,
    ConsultationDetailSerializer,
    ConsultationHistorySerializer,
    # Dashboard
    ConsultationQuickDataSerializer,
    ConsultationStatsSerializer,
    DoctorConsultationSummarySerializer,
    PatientConsultationSummarySerializer,
)
from apps.consultation.services import (
    JitsiService,
    ConsultationService,
    ConsultationNotificationService,
)

logger = logging.getLogger(__name__)


# =============================================================================
# CONSULTATION VIEWSET
# =============================================================================

class ConsultationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing consultations.
    
    Endpoints:
    - GET    /consultations/                    - List consultations
    - POST   /consultations/                    - Create consultation
    - GET    /consultations/{id}/               - Get consultation detail
    - PUT    /consultations/{id}/               - Update consultation
    - DELETE /consultations/{id}/               - Delete consultation
    - POST   /consultations/from-appointment/   - Create from appointment
    - POST   /consultations/{id}/join/          - Get join info
    - POST   /consultations/{id}/join-waiting-room/ - Patient joins waiting room
    - POST   /consultations/{id}/start/         - Doctor starts consultation
    - POST   /consultations/{id}/end/           - End consultation
    - POST   /consultations/{id}/cancel/        - Cancel consultation
    - POST   /consultations/{id}/reschedule/    - Reschedule consultation
    - GET    /consultations/upcoming/           - Get upcoming consultations
    - GET    /consultations/today/              - Get today's consultations
    - GET    /consultations/waiting/            - Get waiting patients (doctor)
    - GET    /consultations/history/            - Get consultation history
    - GET    /consultations/stats/              - Get statistics
    - GET    /consultations/quick-data/         - Dashboard quick data
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Filter by role
        if user.role == 'doctor':
            queryset = Consultation.objects.filter(doctor=user)
        else:
            queryset = Consultation.objects.filter(patient=user)
        
        # Apply filters
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        consultation_type = self.request.query_params.get('type')
        if consultation_type:
            queryset = queryset.filter(consultation_type=consultation_type)
        
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(scheduled_start__date__gte=date_from)
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(scheduled_start__date__lte=date_to)
        
        return queryset.select_related('doctor', 'patient', 'room').order_by('-scheduled_start')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ConsultationCreateSerializer
        elif self.action == 'list':
            return ConsultationListSerializer
        elif self.action == 'retrieve':
            return ConsultationDetailSerializer
        elif self.action == 'from_appointment':
            return ConsultationFromAppointmentSerializer
        elif self.action == 'end':
            return ConsultationEndSerializer
        elif self.action == 'cancel':
            return ConsultationCancelSerializer
        elif self.action == 'reschedule':
            return ConsultationRescheduleSerializer
        elif self.action in ['upcoming', 'today', 'waiting', 'history']:
            return ConsultationListSerializer
        return ConsultationSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new consultation."""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        try:
            consultation, room_info = ConsultationService.create_consultation(
                doctor=data['doctor'],
                patient=data['patient'],
                scheduled_start=data['scheduled_start'],
                consultation_type=data['consultation_type'],
                reason=data.get('reason', ''),
                symptoms=data.get('symptoms', ''),
                duration_minutes=data.get('duration_minutes', 15),
                appointment=data.get('appointment'),
                language=data.get('language', 'en')
            )
            
            response_data = ConsultationSerializer(consultation).data
            response_data['room_info'] = room_info
            
            return Response({
                'success': True,
                'message': 'Consultation created successfully',
                'data': response_data
            }, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            return Response({
                'success': False,
                'message': str(e),
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating consultation: {e}")
            return Response({
                'success': False,
                'message': 'Failed to create consultation',
                'data': None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], url_path='from-appointment')
    def from_appointment(self, request):
        """Create consultation from an existing appointment."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            appointment = serializer.appointment
            consultation_type = serializer.validated_data.get('consultation_type', 'video')
            
            # Create consultation
            consultation, room_info = ConsultationService.create_from_appointment(appointment)
            
            # Update type if different
            if consultation.consultation_type != consultation_type:
                consultation.consultation_type = consultation_type
                consultation.room.is_audio_only = (consultation_type == 'audio')
                consultation.save(update_fields=['consultation_type'])
                consultation.room.save(update_fields=['is_audio_only'])
            
            response_data = ConsultationSerializer(consultation).data
            response_data['room_info'] = room_info
            
            return Response({
                'success': True,
                'message': 'Consultation created from appointment',
                'data': response_data
            }, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            return Response({
                'success': False,
                'message': str(e),
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating consultation from appointment: {e}")
            return Response({
                'success': False,
                'message': 'Failed to create consultation',
                'data': None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Get join information for a consultation."""
        consultation = self.get_object()
        
        try:
            join_info = ConsultationService.get_join_info(consultation, request.user)
            
            return Response({
                'success': True,
                'message': 'Join info retrieved',
                'data': join_info
            })
            
        except ValueError as e:
            return Response({
                'success': False,
                'message': str(e),
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], url_path='join-waiting-room')
    def join_waiting_room(self, request, pk=None):
        """Patient joins the waiting room."""
        consultation = self.get_object()
        
        try:
            join_info = ConsultationService.join_waiting_room(consultation, request.user)
            
            return Response({
                'success': True,
                'message': 'Joined waiting room',
                'data': join_info
            })
            
        except ValueError as e:
            return Response({
                'success': False,
                'message': str(e),
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Doctor starts the consultation."""
        consultation = self.get_object()
        
        try:
            join_info = ConsultationService.start_consultation(consultation, request.user)
            
            return Response({
                'success': True,
                'message': 'Consultation started',
                'data': join_info
            })
            
        except ValueError as e:
            return Response({
                'success': False,
                'message': str(e),
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        """End the consultation."""
        consultation = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            data = serializer.validated_data
            consultation = ConsultationService.end_consultation(
                consultation=consultation,
                doctor=request.user,
                diagnosis=data.get('diagnosis', ''),
                follow_up_required=data.get('follow_up_required', False),
                follow_up_notes=data.get('follow_up_notes', ''),
                follow_up_date=data.get('follow_up_date')
            )
            
            return Response({
                'success': True,
                'message': 'Consultation ended',
                'data': ConsultationSerializer(consultation).data
            })
            
        except ValueError as e:
            return Response({
                'success': False,
                'message': str(e),
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel the consultation."""
        consultation = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            reason = serializer.validated_data.get('reason', '')
            consultation = ConsultationService.cancel_consultation(
                consultation=consultation,
                cancelled_by=request.user,
                reason=reason
            )
            
            return Response({
                'success': True,
                'message': 'Consultation cancelled',
                'data': ConsultationSerializer(consultation).data
            })
            
        except ValueError as e:
            return Response({
                'success': False,
                'message': str(e),
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        """Reschedule the consultation."""
        consultation = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            data = serializer.validated_data
            
            # Check permission
            if request.user.id not in [consultation.doctor.id, consultation.patient.id]:
                return Response({
                    'success': False,
                    'message': 'Permission denied',
                    'data': None
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if can reschedule
            if consultation.status not in ['scheduled', 'waiting_room']:
                return Response({
                    'success': False,
                    'message': f'Cannot reschedule consultation with status: {consultation.status}',
                    'data': None
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update scheduled time
            new_start = data['new_scheduled_start']
            duration = consultation.estimated_duration
            new_end = new_start + timedelta(minutes=duration)
            
            consultation.scheduled_start = new_start
            consultation.scheduled_end = new_end
            consultation.save(update_fields=['scheduled_start', 'scheduled_end', 'updated_at'])
            
            # Update room expiry
            consultation.room.expires_at = new_end + timedelta(hours=1)
            consultation.room.save(update_fields=['expires_at'])
            
            # Send notification
            ConsultationNotificationService.send_consultation_scheduled(consultation)
            
            return Response({
                'success': True,
                'message': 'Consultation rescheduled',
                'data': ConsultationSerializer(consultation).data
            })
            
        except ValueError as e:
            return Response({
                'success': False,
                'message': str(e),
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming consultations."""
        consultations = ConsultationService.get_upcoming_consultations(
            request.user,
            limit=10
        )
        serializer = self.get_serializer(consultations, many=True)
        
        return Response({
            'success': True,
            'message': 'Upcoming consultations retrieved',
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's consultations (for doctors)."""
        if request.user.role != 'doctor':
            return Response({
                'success': False,
                'message': 'Only doctors can access this endpoint',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)
        
        consultations = ConsultationService.get_today_consultations(request.user)
        serializer = self.get_serializer(consultations, many=True)
        
        return Response({
            'success': True,
            'message': "Today's consultations retrieved",
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def waiting(self, request):
        """Get patients in waiting room (for doctors)."""
        if request.user.role != 'doctor':
            return Response({
                'success': False,
                'message': 'Only doctors can access this endpoint',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)
        
        consultations = ConsultationService.get_waiting_patients(request.user)
        serializer = self.get_serializer(consultations, many=True)
        
        return Response({
            'success': True,
            'message': 'Waiting patients retrieved',
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get consultation history."""
        queryset = self.get_queryset().filter(
            status__in=['completed', 'cancelled', 'no_show']
        ).order_by('-scheduled_start')[:50]
        
        serializer = ConsultationHistorySerializer(queryset, many=True)
        
        return Response({
            'success': True,
            'message': 'Consultation history retrieved',
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get consultation statistics."""
        days = int(request.query_params.get('days', 30))
        
        if request.user.role == 'doctor':
            stats = ConsultationService.get_consultation_stats(request.user, days)
        else:
            # Patient stats
            start_date = timezone.now() - timedelta(days=days)
            consultations = Consultation.objects.filter(
                patient=request.user,
                created_at__gte=start_date
            )
            stats = consultations.aggregate(
                total=Count('id'),
                completed=Count('id', filter=Q(status='completed')),
                cancelled=Count('id', filter=Q(status='cancelled')),
                no_show=Count('id', filter=Q(status='no_show')),
                avg_duration=Avg('actual_duration', filter=Q(status='completed')),
            )
            stats['avg_rating'] = None
            stats['total_feedback'] = 0
        
        serializer = ConsultationStatsSerializer(stats)
        
        return Response({
            'success': True,
            'message': 'Statistics retrieved',
            'data': serializer.data
        })
    
    @action(detail=False, methods=['get'], url_path='quick-data')
    def quick_data(self, request):
        """Get dashboard quick data."""
        user = request.user
        now = timezone.now()
        today = now.date()
        
        if user.role == 'doctor':
            # Doctor quick data
            upcoming = ConsultationService.get_upcoming_consultations(user, limit=5)
            today_consultations = ConsultationService.get_today_consultations(user)
            waiting = ConsultationService.get_waiting_patients(user)
            
            recent_completed = Consultation.objects.filter(
                doctor=user,
                status='completed'
            ).order_by('-actual_end')[:5]
            
            stats = {
                'today_total': today_consultations.count(),
                'today_completed': today_consultations.filter(status='completed').count(),
                'waiting_count': waiting.count(),
                'upcoming_count': upcoming.count(),
            }
            
            data = {
                'upcoming_consultations': ConsultationListSerializer(upcoming, many=True).data,
                'today_consultations': ConsultationListSerializer(today_consultations, many=True).data,
                'waiting_patients': ConsultationListSerializer(waiting, many=True).data,
                'recent_completed': ConsultationListSerializer(recent_completed, many=True).data,
                'stats': stats,
            }
        else:
            # Patient quick data
            upcoming = ConsultationService.get_upcoming_consultations(user, limit=5)
            
            recent_completed = Consultation.objects.filter(
                patient=user,
                status='completed'
            ).order_by('-actual_end')[:5]
            
            stats = {
                'upcoming_count': upcoming.count(),
                'completed_total': Consultation.objects.filter(
                    patient=user,
                    status='completed'
                ).count(),
            }
            
            data = {
                'upcoming_consultations': ConsultationListSerializer(upcoming, many=True).data,
                'today_consultations': [],
                'waiting_patients': [],
                'recent_completed': ConsultationListSerializer(recent_completed, many=True).data,
                'stats': stats,
            }
        
        return Response({
            'success': True,
            'message': 'Quick data retrieved',
            'data': data
        })


# =============================================================================
# CONSULTATION NOTES VIEWSET
# =============================================================================

class ConsultationNoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing consultation notes.
    
    Endpoints:
    - GET    /consultations/{consultation_id}/notes/     - List notes
    - POST   /consultations/{consultation_id}/notes/     - Create note
    - GET    /consultations/{consultation_id}/notes/{id}/ - Get note
    - PUT    /consultations/{consultation_id}/notes/{id}/ - Update note
    - DELETE /consultations/{consultation_id}/notes/{id}/ - Delete note
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        consultation_id = self.kwargs.get('consultation_id')
        consultation = get_object_or_404(Consultation, id=consultation_id)
        
        # Check access
        user = self.request.user
        if user.id not in [consultation.doctor.id, consultation.patient.id]:
            return ConsultationNote.objects.none()
        
        queryset = ConsultationNote.objects.filter(consultation=consultation)
        
        # Patients can't see private notes
        if user.role != 'doctor':
            queryset = queryset.filter(is_private=False)
        
        return queryset.order_by('note_type', 'created_at')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ConsultationNoteCreateSerializer
        elif self.action == 'list':
            return ConsultationNoteListSerializer
        return ConsultationNoteSerializer
    
    def create(self, request, consultation_id=None):
        """Create a note (doctors only)."""
        consultation = get_object_or_404(Consultation, id=consultation_id)
        
        if request.user.id != consultation.doctor.id:
            return Response({
                'success': False,
                'message': 'Only the assigned doctor can add notes',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        note = ConsultationService.add_note(
            consultation=consultation,
            doctor=request.user,
            content=serializer.validated_data['content'],
            note_type=serializer.validated_data.get('note_type', 'general'),
            title=serializer.validated_data.get('title', ''),
            is_private=serializer.validated_data.get('is_private', False)
        )
        
        return Response({
            'success': True,
            'message': 'Note added',
            'data': ConsultationNoteSerializer(note).data
        }, status=status.HTTP_201_CREATED)
    
    def update(self, request, consultation_id=None, pk=None):
        """Update a note (doctors only)."""
        consultation = get_object_or_404(Consultation, id=consultation_id)
        
        if request.user.id != consultation.doctor.id:
            return Response({
                'success': False,
                'message': 'Only the assigned doctor can update notes',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)
        
        note = self.get_object()
        serializer = ConsultationNoteSerializer(note, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response({
            'success': True,
            'message': 'Note updated',
            'data': serializer.data
        })
    
    def destroy(self, request, consultation_id=None, pk=None):
        """Delete a note (doctors only)."""
        consultation = get_object_or_404(Consultation, id=consultation_id)
        
        if request.user.id != consultation.doctor.id:
            return Response({
                'success': False,
                'message': 'Only the assigned doctor can delete notes',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)
        
        note = self.get_object()
        note.delete()
        
        return Response({
            'success': True,
            'message': 'Note deleted',
            'data': None
        }, status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# CONSULTATION PRESCRIPTIONS VIEWSET
# =============================================================================

class ConsultationPrescriptionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing consultation prescriptions.
    
    Endpoints:
    - GET    /consultations/{consultation_id}/prescriptions/     - List prescriptions
    - POST   /consultations/{consultation_id}/prescriptions/     - Create prescription
    - GET    /consultations/{consultation_id}/prescriptions/{id}/ - Get prescription
    - PUT    /consultations/{consultation_id}/prescriptions/{id}/ - Update prescription
    - DELETE /consultations/{consultation_id}/prescriptions/{id}/ - Delete prescription
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        consultation_id = self.kwargs.get('consultation_id')
        consultation = get_object_or_404(Consultation, id=consultation_id)
        
        # Check access
        user = self.request.user
        if user.id not in [consultation.doctor.id, consultation.patient.id]:
            return ConsultationPrescription.objects.none()
        
        return ConsultationPrescription.objects.filter(
            consultation=consultation
        ).select_related('medicine').order_by('created_at')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ConsultationPrescriptionCreateSerializer
        elif self.action == 'list':
            return ConsultationPrescriptionListSerializer
        return ConsultationPrescriptionSerializer
    
    def create(self, request, consultation_id=None):
        """Create a prescription (doctors only)."""
        consultation = get_object_or_404(Consultation, id=consultation_id)
        
        if request.user.id != consultation.doctor.id:
            return Response({
                'success': False,
                'message': 'Only the assigned doctor can add prescriptions',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        prescription = ConsultationService.add_prescription(
            consultation=consultation,
            doctor=request.user,
            medicine_name=data['medicine_name'],
            dosage=data['dosage'],
            frequency=data['frequency'],
            duration=data['duration'],
            timing=data.get('timing', 'after_food'),
            instructions=data.get('instructions', ''),
            quantity=data.get('quantity', 1),
            medicine=data.get('medicine')
        )
        
        return Response({
            'success': True,
            'message': 'Prescription added',
            'data': ConsultationPrescriptionSerializer(prescription).data
        }, status=status.HTTP_201_CREATED)
    
    def update(self, request, consultation_id=None, pk=None):
        """Update a prescription (doctors only)."""
        consultation = get_object_or_404(Consultation, id=consultation_id)
        
        if request.user.id != consultation.doctor.id:
            return Response({
                'success': False,
                'message': 'Only the assigned doctor can update prescriptions',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)
        
        prescription = self.get_object()
        serializer = ConsultationPrescriptionSerializer(
            prescription, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response({
            'success': True,
            'message': 'Prescription updated',
            'data': serializer.data
        })
    
    def destroy(self, request, consultation_id=None, pk=None):
        """Delete a prescription (doctors only)."""
        consultation = get_object_or_404(Consultation, id=consultation_id)
        
        if request.user.id != consultation.doctor.id:
            return Response({
                'success': False,
                'message': 'Only the assigned doctor can delete prescriptions',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)
        
        prescription = self.get_object()
        prescription.delete()
        
        return Response({
            'success': True,
            'message': 'Prescription deleted',
            'data': None
        }, status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request, consultation_id=None):
        """Create multiple prescriptions at once."""
        consultation = get_object_or_404(Consultation, id=consultation_id)
        
        if request.user.id != consultation.doctor.id:
            return Response({
                'success': False,
                'message': 'Only the assigned doctor can add prescriptions',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)
        
        prescriptions_data = request.data.get('prescriptions', [])
        if not prescriptions_data:
            return Response({
                'success': False,
                'message': 'No prescriptions provided',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        created_prescriptions = []
        errors = []
        
        for i, pdata in enumerate(prescriptions_data):
            serializer = ConsultationPrescriptionCreateSerializer(data=pdata)
            if serializer.is_valid():
                data = serializer.validated_data
                prescription = ConsultationService.add_prescription(
                    consultation=consultation,
                    doctor=request.user,
                    medicine_name=data['medicine_name'],
                    dosage=data['dosage'],
                    frequency=data['frequency'],
                    duration=data['duration'],
                    timing=data.get('timing', 'after_food'),
                    instructions=data.get('instructions', ''),
                    quantity=data.get('quantity', 1),
                    medicine=data.get('medicine')
                )
                created_prescriptions.append(prescription)
            else:
                errors.append({'index': i, 'errors': serializer.errors})
        
        return Response({
            'success': len(errors) == 0,
            'message': f'Created {len(created_prescriptions)} prescriptions',
            'data': {
                'created': ConsultationPrescriptionSerializer(created_prescriptions, many=True).data,
                'errors': errors
            }
        }, status=status.HTTP_201_CREATED if not errors else status.HTTP_207_MULTI_STATUS)


# =============================================================================
# CONSULTATION ATTACHMENTS VIEWSET
# =============================================================================

class ConsultationAttachmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing consultation attachments.
    
    Endpoints:
    - GET    /consultations/{consultation_id}/attachments/     - List attachments
    - POST   /consultations/{consultation_id}/attachments/     - Create attachment
    - GET    /consultations/{consultation_id}/attachments/{id}/ - Get attachment
    - DELETE /consultations/{consultation_id}/attachments/{id}/ - Delete attachment
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        consultation_id = self.kwargs.get('consultation_id')
        consultation = get_object_or_404(Consultation, id=consultation_id)
        
        # Check access
        user = self.request.user
        if user.id not in [consultation.doctor.id, consultation.patient.id]:
            return ConsultationAttachment.objects.none()
        
        return ConsultationAttachment.objects.filter(
            consultation=consultation
        ).select_related('uploaded_by').order_by('-uploaded_at')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ConsultationAttachmentCreateSerializer
        elif self.action == 'list':
            return ConsultationAttachmentListSerializer
        return ConsultationAttachmentSerializer
    
    def create(self, request, consultation_id=None):
        """Upload an attachment."""
        consultation = get_object_or_404(Consultation, id=consultation_id)
        
        # Check access
        if request.user.id not in [consultation.doctor.id, consultation.patient.id]:
            return Response({
                'success': False,
                'message': 'Access denied',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        attachment = ConsultationAttachment.objects.create(
            consultation=consultation,
            uploaded_by=request.user,
            **serializer.validated_data
        )
        
        return Response({
            'success': True,
            'message': 'Attachment uploaded',
            'data': ConsultationAttachmentSerializer(attachment).data
        }, status=status.HTTP_201_CREATED)
    
    def destroy(self, request, consultation_id=None, pk=None):
        """Delete an attachment (only uploader can delete)."""
        attachment = self.get_object()
        
        if request.user.id != attachment.uploaded_by.id:
            return Response({
                'success': False,
                'message': 'Only the uploader can delete this attachment',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)
        
        attachment.delete()
        
        return Response({
            'success': True,
            'message': 'Attachment deleted',
            'data': None
        }, status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# CONSULTATION FEEDBACK VIEWSET
# =============================================================================

class ConsultationFeedbackViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing consultation feedback.
    
    Endpoints:
    - POST   /consultations/{consultation_id}/feedback/  - Create feedback
    - GET    /consultations/{consultation_id}/feedback/  - Get feedback
    """
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post']
    
    def get_queryset(self):
        consultation_id = self.kwargs.get('consultation_id')
        consultation = get_object_or_404(Consultation, id=consultation_id)
        
        user = self.request.user
        if user.id not in [consultation.doctor.id, consultation.patient.id]:
            return ConsultationFeedback.objects.none()
        
        return ConsultationFeedback.objects.filter(consultation=consultation)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ConsultationFeedbackCreateSerializer
        return ConsultationFeedbackSerializer
    
    def list(self, request, consultation_id=None):
        """Get feedback for a consultation."""
        consultation = get_object_or_404(Consultation, id=consultation_id)
        
        # Check access
        user = request.user
        if user.id not in [consultation.doctor.id, consultation.patient.id]:
            return Response({
                'success': False,
                'message': 'Access denied',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            feedback = consultation.feedback
            data = ConsultationFeedbackSerializer(feedback).data
            
            # Hide patient info if anonymous and viewer is doctor
            if feedback.is_anonymous and user.role == 'doctor':
                data['is_anonymous'] = True
            
            return Response({
                'success': True,
                'message': 'Feedback retrieved',
                'data': data
            })
        except ConsultationFeedback.DoesNotExist:
            return Response({
                'success': True,
                'message': 'No feedback yet',
                'data': None
            })
    
    def create(self, request, consultation_id=None):
        """Create feedback (patients only)."""
        consultation = get_object_or_404(Consultation, id=consultation_id)
        
        if request.user.id != consultation.patient.id:
            return Response({
                'success': False,
                'message': 'Only the patient can provide feedback',
                'data': None
            }, status=status.HTTP_403_FORBIDDEN)
        
        if consultation.status != 'completed':
            return Response({
                'success': False,
                'message': 'Can only provide feedback for completed consultations',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if feedback already exists
        if hasattr(consultation, 'feedback') and consultation.feedback:
            return Response({
                'success': False,
                'message': 'Feedback already provided',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        feedback = ConsultationService.add_feedback(
            consultation=consultation,
            patient=request.user,
            **data
        )
        
        return Response({
            'success': True,
            'message': 'Feedback submitted',
            'data': ConsultationFeedbackSerializer(feedback).data
        }, status=status.HTTP_201_CREATED)


# =============================================================================
# DOCTOR FEEDBACK SUMMARY VIEW
# =============================================================================

class DoctorFeedbackSummaryView(views.APIView):
    """
    Get feedback summary for a doctor.
    
    GET /doctors/{doctor_id}/feedback-summary/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, doctor_id=None):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        doctor = get_object_or_404(User, id=doctor_id, role='doctor')
        
        # Get all feedback for doctor's consultations
        feedbacks = ConsultationFeedback.objects.filter(
            consultation__doctor=doctor
        )
        
        total = feedbacks.count()
        
        if total == 0:
            return Response({
                'success': True,
                'message': 'No feedback yet',
                'data': {
                    'total_feedbacks': 0,
                    'average_rating': None,
                    'average_communication': None,
                    'average_technical_quality': None,
                    'recommendation_rate': None,
                    'technical_issue_rate': 0,
                }
            })
        
        stats = feedbacks.aggregate(
            average_rating=Avg('overall_rating'),
            average_communication=Avg('communication_rating'),
            average_technical_quality=Avg('technical_quality_rating'),
        )
        
        # Calculate recommendation rate
        with_recommendation = feedbacks.exclude(would_recommend__isnull=True)
        if with_recommendation.exists():
            recommended = with_recommendation.filter(would_recommend=True).count()
            stats['recommendation_rate'] = (recommended / with_recommendation.count()) * 100
        else:
            stats['recommendation_rate'] = None
        
        # Calculate technical issue rate
        with_issues = feedbacks.filter(had_technical_issues=True).count()
        stats['technical_issue_rate'] = (with_issues / total) * 100
        
        stats['total_feedbacks'] = total
        
        serializer = ConsultationFeedbackSummarySerializer(stats)
        
        return Response({
            'success': True,
            'message': 'Feedback summary retrieved',
            'data': serializer.data
        })


# =============================================================================
# JITSI CONFIG VIEW
# =============================================================================

class JitsiConfigView(views.APIView):
    """
    Get Jitsi configuration for frontend.
    
    GET /jitsi/config/
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        config = {
            'domain': JitsiService.DEFAULT_DOMAIN,
            'supported_languages': JitsiService.get_supported_languages(),
            'room_expiry_hours': JitsiService.ROOM_EXPIRY_HOURS,
            'features': {
                'video': True,
                'audio': True,
                'chat': True,
                'screen_share': True,
                'recording': False,  # Not available on free tier
            }
        }
        
        return Response({
            'success': True,
            'message': 'Jitsi configuration',
            'data': config
        })


# =============================================================================
# HEALTH CHECK VIEW
# =============================================================================

class HealthCheckView(views.APIView):
    """
    Health check endpoint.
    
    GET /health/
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        return Response({
            'success': True,
            'message': 'Consultation service is healthy',
            'data': {
                'service': 'consultation',
                'status': 'healthy',
                'timestamp': timezone.now().isoformat(),
                'jitsi_domain': JitsiService.DEFAULT_DOMAIN,
            }
        })
