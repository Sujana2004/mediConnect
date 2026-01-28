"""
Consultation Service
====================
Main business logic for consultations.
"""

import logging
from datetime import timedelta
from typing import Dict, List, Optional, Tuple
from django.db import transaction
from django.utils import timezone
from django.db.models import Q, Count, Avg

from apps.consultation.models import (
    Consultation,
    ConsultationRoom,
    ConsultationNote,
    ConsultationPrescription,
    ConsultationFeedback,
)
from apps.consultation.services.jitsi_service import JitsiService
from apps.consultation.services.notification_service import ConsultationNotificationService

logger = logging.getLogger(__name__)


class ConsultationService:
    """
    Service for managing consultations.
    """
    
    @classmethod
    @transaction.atomic
    def create_consultation(
        cls,
        doctor,
        patient,
        scheduled_start,
        consultation_type: str = 'video',
        reason: str = '',
        symptoms: str = '',
        duration_minutes: int = 15,
        appointment=None,
        language: str = 'en'
    ) -> Tuple[Consultation, Dict]:
        """
        Create a new consultation with Jitsi room.
        
        Returns:
            Tuple of (Consultation, room_info_dict)
        """
        try:
            # Validate doctor
            if doctor.role != 'doctor':
                raise ValueError("Only doctors can host consultations")
            
            # Check for scheduling conflicts
            conflict = cls.check_scheduling_conflict(doctor, scheduled_start, duration_minutes)
            if conflict:
                raise ValueError(f"Scheduling conflict: {conflict}")
            
            # Create room configuration
            is_audio_only = consultation_type == 'audio'
            room_config = JitsiService.create_room_config(
                consultation_id=str(patient.id),
                doctor_id=str(doctor.id),
                is_audio_only=is_audio_only,
                enable_lobby=True
            )
            
            # Create room
            room = ConsultationRoom.objects.create(**room_config)
            
            # Create consultation
            scheduled_end = scheduled_start + timedelta(minutes=duration_minutes)
            
            consultation = Consultation.objects.create(
                doctor=doctor,
                patient=patient,
                appointment=appointment,
                room=room,
                consultation_type=consultation_type,
                scheduled_start=scheduled_start,
                scheduled_end=scheduled_end,
                estimated_duration=duration_minutes,
                reason=reason,
                symptoms=symptoms,
                language=language,
                status='scheduled'
            )
            
            # Prepare room info
            doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}"
            patient_name = f"{patient.first_name} {patient.last_name}"
            
            room_info = {
                'room_name': room.room_name,
                'room_url': room.full_room_url,
                'doctor_join_url': JitsiService.get_join_url(
                    room.room_name, doctor_name, is_moderator=True,
                    is_audio_only=is_audio_only, language=language
                ),
                'patient_join_url': JitsiService.get_join_url(
                    room.room_name, patient_name, is_moderator=False,
                    is_audio_only=is_audio_only, language=language
                ),
                'expires_at': room.expires_at.isoformat(),
            }
            
            # Send notifications
            ConsultationNotificationService.send_consultation_scheduled(consultation)
            
            logger.info(f"Created consultation {consultation.id} for patient {patient.id} with Dr. {doctor.id}")
            
            return consultation, room_info
            
        except Exception as e:
            logger.error(f"Error creating consultation: {e}")
            raise
    
    @classmethod
    def create_from_appointment(cls, appointment) -> Tuple[Consultation, Dict]:
        """
        Create a consultation from an existing appointment.
        """
        if hasattr(appointment, 'consultation') and appointment.consultation:
            raise ValueError("Appointment already has a consultation")
        
        return cls.create_consultation(
            doctor=appointment.doctor,
            patient=appointment.patient,
            scheduled_start=timezone.make_aware(
                timezone.datetime.combine(appointment.date, appointment.time_slot.start_time)
            ) if timezone.is_naive(
                timezone.datetime.combine(appointment.date, appointment.time_slot.start_time)
            ) else timezone.datetime.combine(appointment.date, appointment.time_slot.start_time),
            consultation_type='video',
            reason=appointment.reason,
            symptoms=appointment.symptoms,
            duration_minutes=15,
            appointment=appointment,
            language=appointment.patient.preferred_language
        )
    
    @classmethod
    def check_scheduling_conflict(
        cls,
        doctor,
        scheduled_start,
        duration_minutes: int
    ) -> Optional[str]:
        """
        Check if doctor has a scheduling conflict.
        
        Returns:
            None if no conflict, error message if conflict exists
        """
        scheduled_end = scheduled_start + timedelta(minutes=duration_minutes)
        
        # Find overlapping consultations
        conflicts = Consultation.objects.filter(
            doctor=doctor,
            status__in=['scheduled', 'waiting_room', 'in_progress'],
        ).filter(
            Q(scheduled_start__lt=scheduled_end) &
            Q(scheduled_end__gt=scheduled_start)
        )
        
        if conflicts.exists():
            conflict = conflicts.first()
            return f"Conflict with consultation at {conflict.scheduled_start.strftime('%H:%M')}"
        
        return None
    
    @classmethod
    def get_join_info(cls, consultation: Consultation, user) -> Dict:
        """
        Get join information for a user.
        
        Returns:
            Dict with join URLs and room info
        """
        room = consultation.room
        
        is_doctor = user.id == consultation.doctor.id
        is_patient = user.id == consultation.patient.id
        
        if not (is_doctor or is_patient):
            raise ValueError("User is not a participant of this consultation")
        
        if not consultation.can_join:
            raise ValueError(f"Cannot join consultation. Status: {consultation.status}")
        
        # Determine user info
        if is_doctor:
            display_name = f"Dr. {user.first_name} {user.last_name}"
            is_moderator = True
        else:
            display_name = f"{user.first_name} {user.last_name}"
            is_moderator = False
        
        is_audio_only = consultation.consultation_type == 'audio'
        
        return {
            'consultation_id': str(consultation.id),
            'room_name': room.room_name,
            'room_url': room.full_room_url,
            'join_url': JitsiService.get_join_url(
                room.room_name,
                display_name,
                is_moderator=is_moderator,
                is_audio_only=is_audio_only,
                language=consultation.language
            ),
            'embed_config': JitsiService.get_embed_config(
                room.room_name,
                display_name,
                is_moderator=is_moderator,
                is_audio_only=is_audio_only,
                language=consultation.language
            ),
            'is_moderator': is_moderator,
            'is_audio_only': is_audio_only,
            'consultation_type': consultation.consultation_type,
            'scheduled_start': consultation.scheduled_start.isoformat(),
            'scheduled_end': consultation.scheduled_end.isoformat(),
            'status': consultation.status,
        }
    
    @classmethod
    @transaction.atomic
    def join_waiting_room(cls, consultation: Consultation, user) -> Dict:
        """
        Patient joins waiting room.
        """
        if user.id != consultation.patient.id:
            raise ValueError("Only the patient can join the waiting room")
        
        if consultation.status not in ['scheduled', 'waiting_room']:
            raise ValueError(f"Cannot join waiting room. Status: {consultation.status}")
        
        # Update status
        consultation.status = 'waiting_room'
        consultation.save(update_fields=['status', 'updated_at'])
        
        # Update room
        room = consultation.room
        room.status = 'waiting'
        room.patient_joined_at = timezone.now()
        room.save(update_fields=['status', 'patient_joined_at'])
        
        # Notify doctor
        ConsultationNotificationService.send_patient_waiting(consultation)
        
        logger.info(f"Patient {user.id} joined waiting room for consultation {consultation.id}")
        
        return cls.get_join_info(consultation, user)
    
    @classmethod
    @transaction.atomic
    def start_consultation(cls, consultation: Consultation, doctor) -> Dict:
        """
        Doctor starts the consultation (admits patient from waiting room).
        """
        if doctor.id != consultation.doctor.id:
            raise ValueError("Only the assigned doctor can start the consultation")
        
        if consultation.status not in ['scheduled', 'waiting_room']:
            raise ValueError(f"Cannot start consultation. Status: {consultation.status}")
        
        now = timezone.now()
        
        # Update consultation
        consultation.status = 'in_progress'
        consultation.actual_start = now
        consultation.save(update_fields=['status', 'actual_start', 'updated_at'])
        
        # Update room
        room = consultation.room
        room.status = 'active'
        room.activated_at = now
        room.doctor_joined_at = now
        room.save(update_fields=['status', 'activated_at', 'doctor_joined_at'])
        
        # Notify patient
        ConsultationNotificationService.send_consultation_started(consultation)
        
        logger.info(f"Consultation {consultation.id} started by Dr. {doctor.id}")
        
        return cls.get_join_info(consultation, doctor)
    
    @classmethod
    @transaction.atomic
    def end_consultation(
        cls,
        consultation: Consultation,
        doctor,
        diagnosis: str = '',
        follow_up_required: bool = False,
        follow_up_notes: str = '',
        follow_up_date=None
    ) -> Consultation:
        """
        Doctor ends the consultation.
        """
        if doctor.id != consultation.doctor.id:
            raise ValueError("Only the assigned doctor can end the consultation")
        
        if consultation.status != 'in_progress':
            raise ValueError(f"Cannot end consultation. Status: {consultation.status}")
        
        now = timezone.now()
        
        # Calculate actual duration
        if consultation.actual_start:
            duration = (now - consultation.actual_start).total_seconds() / 60
            actual_duration = int(duration)
        else:
            actual_duration = 0
        
        # Update consultation
        consultation.status = 'completed'
        consultation.actual_end = now
        consultation.actual_duration = actual_duration
        consultation.diagnosis = diagnosis
        consultation.follow_up_required = follow_up_required
        consultation.follow_up_notes = follow_up_notes
        consultation.follow_up_date = follow_up_date
        consultation.save()
        
        # Update room
        room = consultation.room
        room.status = 'ended'
        room.ended_at = now
        room.save(update_fields=['status', 'ended_at'])
        
        # Update appointment if linked
        if consultation.appointment:
            consultation.appointment.status = 'completed'
            consultation.appointment.save(update_fields=['status', 'updated_at'])
        
        # Send notifications
        ConsultationNotificationService.send_consultation_completed(consultation)
        
        logger.info(f"Consultation {consultation.id} ended. Duration: {actual_duration} minutes")
        
        return consultation
    
    @classmethod
    @transaction.atomic
    def cancel_consultation(
        cls,
        consultation: Consultation,
        cancelled_by,
        reason: str = ''
    ) -> Consultation:
        """
        Cancel a consultation.
        """
        if consultation.status in ['completed', 'cancelled']:
            raise ValueError(f"Cannot cancel consultation. Status: {consultation.status}")
        
        # Check permission
        is_participant = cancelled_by.id in [consultation.doctor.id, consultation.patient.id]
        is_admin = cancelled_by.is_staff or cancelled_by.is_superuser
        
        if not (is_participant or is_admin):
            raise ValueError("You don't have permission to cancel this consultation")
        
        now = timezone.now()
        
        # Update consultation
        consultation.status = 'cancelled'
        consultation.cancelled_at = now
        consultation.cancelled_by = cancelled_by
        consultation.cancellation_reason = reason
        consultation.save()
        
        # Update room
        room = consultation.room
        room.status = 'expired'
        room.ended_at = now
        room.save(update_fields=['status', 'ended_at'])
        
        # Send notifications
        ConsultationNotificationService.send_consultation_cancelled(consultation, cancelled_by)
        
        logger.info(f"Consultation {consultation.id} cancelled by {cancelled_by.id}")
        
        return consultation
    
    @classmethod
    def add_note(
        cls,
        consultation: Consultation,
        doctor,
        content: str,
        note_type: str = 'general',
        title: str = '',
        is_private: bool = False
    ) -> ConsultationNote:
        """
        Add a note to the consultation.
        """
        if doctor.id != consultation.doctor.id:
            raise ValueError("Only the assigned doctor can add notes")
        
        note = ConsultationNote.objects.create(
            consultation=consultation,
            note_type=note_type,
            title=title,
            content=content,
            is_private=is_private
        )
        
        logger.info(f"Added {note_type} note to consultation {consultation.id}")
        
        return note
    
    @classmethod
    def add_prescription(
        cls,
        consultation: Consultation,
        doctor,
        medicine_name: str,
        dosage: str,
        frequency: str,
        duration: str,
        timing: str = 'after_food',
        instructions: str = '',
        quantity: int = 1,
        medicine=None
    ) -> ConsultationPrescription:
        """
        Add a prescription to the consultation.
        """
        if doctor.id != consultation.doctor.id:
            raise ValueError("Only the assigned doctor can add prescriptions")
        
        prescription = ConsultationPrescription.objects.create(
            consultation=consultation,
            medicine=medicine,
            medicine_name=medicine_name,
            dosage=dosage,
            frequency=frequency,
            duration=duration,
            timing=timing,
            instructions=instructions,
            quantity=quantity
        )
        
        logger.info(f"Added prescription {medicine_name} to consultation {consultation.id}")
        
        return prescription
    
    @classmethod
    def add_feedback(
        cls,
        consultation: Consultation,
        patient,
        overall_rating: int,
        communication_rating: int = None,
        technical_quality_rating: int = None,
        comments: str = '',
        would_recommend: bool = None,
        had_technical_issues: bool = False,
        technical_issue_description: str = '',
        is_anonymous: bool = False
    ) -> ConsultationFeedback:
        """
        Add patient feedback for a completed consultation.
        """
        if patient.id != consultation.patient.id:
            raise ValueError("Only the patient can add feedback")
        
        if consultation.status != 'completed':
            raise ValueError("Can only add feedback for completed consultations")
        
        if hasattr(consultation, 'feedback'):
            raise ValueError("Feedback already exists for this consultation")
        
        feedback = ConsultationFeedback.objects.create(
            consultation=consultation,
            overall_rating=overall_rating,
            communication_rating=communication_rating,
            technical_quality_rating=technical_quality_rating,
            comments=comments,
            would_recommend=would_recommend,
            had_technical_issues=had_technical_issues,
            technical_issue_description=technical_issue_description,
            is_anonymous=is_anonymous
        )
        
        logger.info(f"Added feedback ({overall_rating}/5) for consultation {consultation.id}")
        
        return feedback
    
    @classmethod
    def get_doctor_consultations(
        cls,
        doctor,
        status: str = None,
        date_from=None,
        date_to=None,
        limit: int = 50
    ) -> List[Consultation]:
        """
        Get consultations for a doctor.
        """
        queryset = Consultation.objects.filter(doctor=doctor)
        
        if status:
            queryset = queryset.filter(status=status)
        
        if date_from:
            queryset = queryset.filter(scheduled_start__gte=date_from)
        
        if date_to:
            queryset = queryset.filter(scheduled_start__lte=date_to)
        
        return queryset.select_related('patient', 'room')[:limit]
    
    @classmethod
    def get_patient_consultations(
        cls,
        patient,
        status: str = None,
        limit: int = 50
    ) -> List[Consultation]:
        """
        Get consultations for a patient.
        """
        queryset = Consultation.objects.filter(patient=patient)
        
        if status:
            queryset = queryset.filter(status=status)
        
        return queryset.select_related('doctor', 'room')[:limit]
    
    @classmethod
    def get_upcoming_consultations(cls, user, limit: int = 10) -> List[Consultation]:
        """
        Get upcoming consultations for a user (doctor or patient).
        """
        now = timezone.now()
        
        if user.role == 'doctor':
            queryset = Consultation.objects.filter(
                doctor=user,
                status='scheduled',
                scheduled_start__gt=now
            )
        else:
            queryset = Consultation.objects.filter(
                patient=user,
                status='scheduled',
                scheduled_start__gt=now
            )
        
        return queryset.select_related('doctor', 'patient', 'room').order_by('scheduled_start')[:limit]
    
    @classmethod
    def get_today_consultations(cls, doctor) -> List[Consultation]:
        """
        Get today's consultations for a doctor.
        """
        today = timezone.now().date()
        
        return Consultation.objects.filter(
            doctor=doctor,
            scheduled_start__date=today
        ).exclude(
            status__in=['cancelled', 'no_show']
        ).select_related('patient', 'room').order_by('scheduled_start')
    
    @classmethod
    def get_waiting_patients(cls, doctor) -> List[Consultation]:
        """
        Get patients currently in waiting room for a doctor.
        """
        return Consultation.objects.filter(
            doctor=doctor,
            status='waiting_room'
        ).select_related('patient', 'room').order_by('room__patient_joined_at')
    
    @classmethod
    def get_consultation_stats(cls, doctor, days: int = 30) -> Dict:
        """
        Get consultation statistics for a doctor.
        """
        start_date = timezone.now() - timedelta(days=days)
        
        consultations = Consultation.objects.filter(
            doctor=doctor,
            created_at__gte=start_date
        )
        
        stats = consultations.aggregate(
            total=Count('id'),
            completed=Count('id', filter=Q(status='completed')),
            cancelled=Count('id', filter=Q(status='cancelled')),
            no_show=Count('id', filter=Q(status='no_show')),
            avg_duration=Avg('actual_duration', filter=Q(status='completed')),
        )
        
        # Get feedback stats
        feedback_stats = ConsultationFeedback.objects.filter(
            consultation__doctor=doctor,
            consultation__created_at__gte=start_date
        ).aggregate(
            avg_rating=Avg('overall_rating'),
            total_feedback=Count('id'),
        )
        
        stats.update(feedback_stats)
        
        return stats
    
    @classmethod
    def mark_no_show(cls, consultation: Consultation) -> Consultation:
        """
        Mark consultation as no-show (called by scheduler).
        """
        if consultation.status not in ['scheduled', 'waiting_room']:
            return consultation
        
        # Check if 15 minutes past scheduled time
        no_show_time = consultation.scheduled_start + timedelta(minutes=15)
        
        if timezone.now() < no_show_time:
            return consultation
        
        consultation.status = 'no_show'
        consultation.save(update_fields=['status', 'updated_at'])
        
        # Update room
        room = consultation.room
        room.status = 'expired'
        room.save(update_fields=['status'])
        
        logger.info(f"Marked consultation {consultation.id} as no-show")
        
        return consultation