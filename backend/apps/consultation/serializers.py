"""
Consultation App Serializers
============================
Serializers for consultation-related models and API responses.
"""

from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.consultation.models import (
    ConsultationRoom,
    Consultation,
    ConsultationNote,
    ConsultationPrescription,
    ConsultationAttachment,
    ConsultationFeedback,
)

User = get_user_model()


# =============================================================================
# USER SERIALIZERS (Nested)
# =============================================================================

class ConsultationUserSerializer(serializers.ModelSerializer):
    """Minimal user info for consultation context."""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'phone', 'first_name', 'last_name', 'full_name', 'role']
        read_only_fields = fields
    
    def get_full_name(self, obj):
        if obj.role == 'doctor':
            return f"Dr. {obj.first_name} {obj.last_name}"
        return f"{obj.first_name} {obj.last_name}"


class DoctorInfoSerializer(serializers.ModelSerializer):
    """Doctor info for patient view."""
    full_name = serializers.SerializerMethodField()
    specialization = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'full_name', 'phone', 'specialization']
        read_only_fields = fields
    
    def get_full_name(self, obj):
        return f"Dr. {obj.first_name} {obj.last_name}"
    
    def get_specialization(self, obj):
        if hasattr(obj, 'doctor_profile') and obj.doctor_profile:
            return obj.doctor_profile.specialization
        return None


class PatientInfoSerializer(serializers.ModelSerializer):
    """Patient info for doctor view."""
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'full_name', 'phone', 'gender', 'age']
        read_only_fields = fields
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    
    def get_age(self, obj):
        if obj.date_of_birth:
            today = timezone.now().date()
            return today.year - obj.date_of_birth.year - (
                (today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day)
            )
        return None


# =============================================================================
# ROOM SERIALIZERS
# =============================================================================

class ConsultationRoomSerializer(serializers.ModelSerializer):
    """Full room details."""
    full_room_url = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = ConsultationRoom
        fields = [
            'id', 'room_name', 'jitsi_domain', 'is_audio_only',
            'is_lobby_enabled', 'max_participants', 'status',
            'full_room_url', 'is_active', 'is_expired',
            'created_at', 'activated_at', 'ended_at', 'expires_at',
            'doctor_joined_at', 'patient_joined_at'
        ]
        read_only_fields = fields


class RoomJoinInfoSerializer(serializers.Serializer):
    """Room join information for frontend."""
    consultation_id = serializers.UUIDField()
    room_name = serializers.CharField()
    room_url = serializers.URLField()
    join_url = serializers.URLField()
    embed_config = serializers.DictField()
    is_moderator = serializers.BooleanField()
    is_audio_only = serializers.BooleanField()
    consultation_type = serializers.CharField()
    scheduled_start = serializers.DateTimeField()
    scheduled_end = serializers.DateTimeField()
    status = serializers.CharField()


# =============================================================================
# NOTE SERIALIZERS
# =============================================================================

class ConsultationNoteSerializer(serializers.ModelSerializer):
    """Full note details."""
    
    class Meta:
        model = ConsultationNote
        fields = [
            'id', 'consultation', 'note_type', 'title', 'content',
            'is_private', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'consultation', 'created_at', 'updated_at']


class ConsultationNoteCreateSerializer(serializers.ModelSerializer):
    """Create a note."""
    
    class Meta:
        model = ConsultationNote
        fields = ['note_type', 'title', 'content', 'is_private']
    
    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Note content cannot be empty")
        return value.strip()


class ConsultationNoteListSerializer(serializers.ModelSerializer):
    """Note list item."""
    
    class Meta:
        model = ConsultationNote
        fields = ['id', 'note_type', 'title', 'is_private', 'created_at']
        read_only_fields = fields


# =============================================================================
# PRESCRIPTION SERIALIZERS
# =============================================================================

class ConsultationPrescriptionSerializer(serializers.ModelSerializer):
    """Full prescription details."""
    medicine_info = serializers.SerializerMethodField()
    
    class Meta:
        model = ConsultationPrescription
        fields = [
            'id', 'consultation', 'medicine', 'medicine_name', 'medicine_info',
            'dosage', 'frequency', 'duration', 'timing', 'instructions',
            'quantity', 'refills_allowed', 'refills_used', 'is_active',
            'created_at'
        ]
        read_only_fields = ['id', 'consultation', 'created_at']
    
    def get_medicine_info(self, obj):
        if obj.medicine:
            return {
                'id': str(obj.medicine.id),
                'name': obj.medicine.name,
                'generic_name': obj.medicine.generic_name,
                'manufacturer': obj.medicine.manufacturer,
            }
        return None


class ConsultationPrescriptionCreateSerializer(serializers.ModelSerializer):
    """Create a prescription."""
    medicine_id = serializers.UUIDField(required=False, allow_null=True)
    
    class Meta:
        model = ConsultationPrescription
        fields = [
            'medicine_id', 'medicine_name', 'dosage', 'frequency',
            'duration', 'timing', 'instructions', 'quantity', 'refills_allowed'
        ]
    
    def validate_medicine_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Medicine name is required")
        return value.strip()
    
    def validate(self, data):
        # If medicine_id provided, fetch medicine
        medicine_id = data.pop('medicine_id', None)
        if medicine_id:
            try:
                from apps.medicine.models import Medicine
                medicine = Medicine.objects.get(id=medicine_id)
                data['medicine'] = medicine
                if not data.get('medicine_name'):
                    data['medicine_name'] = medicine.name
            except Exception:
                pass
        return data


class ConsultationPrescriptionListSerializer(serializers.ModelSerializer):
    """Prescription list item."""
    
    class Meta:
        model = ConsultationPrescription
        fields = [
            'id', 'medicine_name', 'dosage', 'frequency',
            'duration', 'timing', 'is_active'
        ]
        read_only_fields = fields


# =============================================================================
# ATTACHMENT SERIALIZERS
# =============================================================================

class ConsultationAttachmentSerializer(serializers.ModelSerializer):
    """Full attachment details."""
    uploaded_by_info = ConsultationUserSerializer(source='uploaded_by', read_only=True)
    file_size_display = serializers.SerializerMethodField()
    
    class Meta:
        model = ConsultationAttachment
        fields = [
            'id', 'consultation', 'uploaded_by', 'uploaded_by_info',
            'attachment_type', 'file_name', 'file_url', 'file_size',
            'file_size_display', 'mime_type', 'description', 'uploaded_at'
        ]
        read_only_fields = ['id', 'consultation', 'uploaded_by', 'uploaded_at']
    
    def get_file_size_display(self, obj):
        size = obj.file_size
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"
        else:
            return f"{size / (1024 * 1024):.1f} MB"


class ConsultationAttachmentCreateSerializer(serializers.ModelSerializer):
    """Create an attachment."""
    
    class Meta:
        model = ConsultationAttachment
        fields = [
            'attachment_type', 'file_name', 'file_url',
            'file_size', 'mime_type', 'description'
        ]
    
    def validate_file_url(self, value):
        if not value:
            raise serializers.ValidationError("File URL is required")
        return value
    
    def validate_file_size(self, value):
        # Max 10MB
        max_size = 10 * 1024 * 1024
        if value > max_size:
            raise serializers.ValidationError("File size cannot exceed 10MB")
        return value


class ConsultationAttachmentListSerializer(serializers.ModelSerializer):
    """Attachment list item."""
    
    class Meta:
        model = ConsultationAttachment
        fields = [
            'id', 'attachment_type', 'file_name', 'file_url',
            'mime_type', 'uploaded_at'
        ]
        read_only_fields = fields


# =============================================================================
# FEEDBACK SERIALIZERS
# =============================================================================

class ConsultationFeedbackSerializer(serializers.ModelSerializer):
    """Full feedback details."""
    
    class Meta:
        model = ConsultationFeedback
        fields = [
            'id', 'consultation', 'overall_rating', 'communication_rating',
            'technical_quality_rating', 'comments', 'would_recommend',
            'had_technical_issues', 'technical_issue_description',
            'is_anonymous', 'created_at'
        ]
        read_only_fields = ['id', 'consultation', 'created_at']


class ConsultationFeedbackCreateSerializer(serializers.ModelSerializer):
    """Create feedback."""
    
    class Meta:
        model = ConsultationFeedback
        fields = [
            'overall_rating', 'communication_rating', 'technical_quality_rating',
            'comments', 'would_recommend', 'had_technical_issues',
            'technical_issue_description', 'is_anonymous'
        ]
    
    def validate_overall_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value
    
    def validate(self, data):
        if data.get('had_technical_issues') and not data.get('technical_issue_description'):
            raise serializers.ValidationError({
                'technical_issue_description': 'Please describe the technical issue'
            })
        return data


class ConsultationFeedbackSummarySerializer(serializers.Serializer):
    """Feedback summary for doctors."""
    total_feedbacks = serializers.IntegerField()
    average_rating = serializers.FloatField()
    average_communication = serializers.FloatField(allow_null=True)
    average_technical_quality = serializers.FloatField(allow_null=True)
    recommendation_rate = serializers.FloatField(allow_null=True)
    technical_issue_rate = serializers.FloatField()


# =============================================================================
# CONSULTATION SERIALIZERS
# =============================================================================

class ConsultationSerializer(serializers.ModelSerializer):
    """Full consultation details."""
    doctor_info = DoctorInfoSerializer(source='doctor', read_only=True)
    patient_info = PatientInfoSerializer(source='patient', read_only=True)
    room = ConsultationRoomSerializer(read_only=True)
    notes_count = serializers.SerializerMethodField()
    prescriptions_count = serializers.SerializerMethodField()
    attachments_count = serializers.SerializerMethodField()
    has_feedback = serializers.SerializerMethodField()
    can_join = serializers.ReadOnlyField()
    is_upcoming = serializers.ReadOnlyField()
    time_until_start = serializers.SerializerMethodField()
    
    class Meta:
        model = Consultation
        fields = [
            'id', 'doctor', 'doctor_info', 'patient', 'patient_info',
            'appointment', 'room', 'consultation_type', 'status',
            'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end',
            'estimated_duration', 'actual_duration',
            'reason', 'symptoms', 'diagnosis',
            'follow_up_required', 'follow_up_notes', 'follow_up_date',
            'cancelled_at', 'cancelled_by', 'cancellation_reason',
            'language', 'created_at', 'updated_at',
            'notes_count', 'prescriptions_count', 'attachments_count',
            'has_feedback', 'can_join', 'is_upcoming', 'time_until_start'
        ]
        read_only_fields = [
            'id', 'room', 'actual_start', 'actual_end', 'actual_duration',
            'cancelled_at', 'cancelled_by', 'created_at', 'updated_at'
        ]
    
    def get_notes_count(self, obj):
        return obj.notes.count()
    
    def get_prescriptions_count(self, obj):
        return obj.prescriptions.count()
    
    def get_attachments_count(self, obj):
        return obj.attachments.count()
    
    def get_has_feedback(self, obj):
        return hasattr(obj, 'feedback') and obj.feedback is not None
    
    def get_time_until_start(self, obj):
        delta = obj.time_until_start
        if delta.total_seconds() <= 0:
            return None
        
        total_minutes = int(delta.total_seconds() / 60)
        hours = total_minutes // 60
        minutes = total_minutes % 60
        
        if hours > 0:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"


class ConsultationListSerializer(serializers.ModelSerializer):
    """Consultation list item (minimal)."""
    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    can_join = serializers.ReadOnlyField()
    
    class Meta:
        model = Consultation
        fields = [
            'id', 'doctor', 'doctor_name', 'patient', 'patient_name',
            'consultation_type', 'status', 'scheduled_start', 'scheduled_end',
            'can_join', 'language'
        ]
        read_only_fields = fields
    
    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"
    
    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"


class ConsultationCreateSerializer(serializers.Serializer):
    """Create a new consultation."""
    patient_id = serializers.UUIDField(required=False)
    doctor_id = serializers.UUIDField(required=False)
    appointment_id = serializers.UUIDField(required=False, allow_null=True)
    scheduled_start = serializers.DateTimeField()
    consultation_type = serializers.ChoiceField(
        choices=['video', 'audio', 'chat'],
        default='video'
    )
    duration_minutes = serializers.IntegerField(min_value=5, max_value=60, default=15)
    reason = serializers.CharField(required=False, allow_blank=True, default='')
    symptoms = serializers.CharField(required=False, allow_blank=True, default='')
    language = serializers.ChoiceField(
        choices=['en', 'te', 'hi'],
        default='en'
    )
    
    def validate_scheduled_start(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("Scheduled time must be in the future")
        
        # Must be within 30 days
        max_future = timezone.now() + timezone.timedelta(days=30)
        if value > max_future:
            raise serializers.ValidationError("Cannot schedule more than 30 days ahead")
        
        return value
    
    def validate(self, data):
        request = self.context.get('request')
        user = request.user if request else None
        
        # Determine doctor and patient based on user role
        if user and user.role == 'doctor':
            data['doctor_id'] = user.id
            if not data.get('patient_id'):
                raise serializers.ValidationError({
                    'patient_id': 'Patient ID is required'
                })
        elif user and user.role == 'patient':
            data['patient_id'] = user.id
            if not data.get('doctor_id'):
                raise serializers.ValidationError({
                    'doctor_id': 'Doctor ID is required'
                })
        
        # Validate patient exists
        if data.get('patient_id'):
            try:
                patient = User.objects.get(id=data['patient_id'], role='patient')
                data['patient'] = patient
            except User.DoesNotExist:
                raise serializers.ValidationError({
                    'patient_id': 'Patient not found'
                })
        
        # Validate doctor exists
        if data.get('doctor_id'):
            try:
                doctor = User.objects.get(id=data['doctor_id'], role='doctor')
                data['doctor'] = doctor
            except User.DoesNotExist:
                raise serializers.ValidationError({
                    'doctor_id': 'Doctor not found'
                })
        
        # Validate appointment if provided
        if data.get('appointment_id'):
            try:
                from apps.appointments.models import Appointment
                appointment = Appointment.objects.get(id=data['appointment_id'])
                data['appointment'] = appointment
                
                # Ensure appointment matches doctor/patient
                if data.get('doctor') and appointment.doctor.id != data['doctor'].id:
                    raise serializers.ValidationError({
                        'appointment_id': 'Appointment does not match doctor'
                    })
                if data.get('patient') and appointment.patient.id != data['patient'].id:
                    raise serializers.ValidationError({
                        'appointment_id': 'Appointment does not match patient'
                    })
            except Exception:
                raise serializers.ValidationError({
                    'appointment_id': 'Appointment not found'
                })
        else:
            data['appointment'] = None
        
        return data


class ConsultationFromAppointmentSerializer(serializers.Serializer):
    """Create consultation from existing appointment."""
    appointment_id = serializers.UUIDField()
    consultation_type = serializers.ChoiceField(
        choices=['video', 'audio', 'chat'],
        default='video'
    )
    
    def validate_appointment_id(self, value):
        try:
            from apps.appointments.models import Appointment
            appointment = Appointment.objects.get(id=value)
            
            # Check if already has consultation
            if hasattr(appointment, 'consultation') and appointment.consultation:
                raise serializers.ValidationError("Appointment already has a consultation")
            
            # Check appointment status
            if appointment.status not in ['confirmed', 'checked_in', 'in_progress']:
                raise serializers.ValidationError(
                    f"Cannot create consultation for appointment with status: {appointment.status}"
                )
            
            self.appointment = appointment
            return value
            
        except Exception as e:
            raise serializers.ValidationError(f"Appointment not found: {e}")


class ConsultationEndSerializer(serializers.Serializer):
    """End consultation with summary."""
    diagnosis = serializers.CharField(required=False, allow_blank=True, default='')
    follow_up_required = serializers.BooleanField(default=False)
    follow_up_notes = serializers.CharField(required=False, allow_blank=True, default='')
    follow_up_date = serializers.DateField(required=False, allow_null=True)
    
    def validate(self, data):
        if data.get('follow_up_required') and not data.get('follow_up_date'):
            raise serializers.ValidationError({
                'follow_up_date': 'Follow-up date is required when follow-up is needed'
            })
        
        if data.get('follow_up_date'):
            if data['follow_up_date'] <= timezone.now().date():
                raise serializers.ValidationError({
                    'follow_up_date': 'Follow-up date must be in the future'
                })
        
        return data


class ConsultationCancelSerializer(serializers.Serializer):
    """Cancel consultation."""
    reason = serializers.CharField(required=False, allow_blank=True, default='')


class ConsultationRescheduleSerializer(serializers.Serializer):
    """Reschedule consultation."""
    new_scheduled_start = serializers.DateTimeField()
    reason = serializers.CharField(required=False, allow_blank=True, default='')
    
    def validate_new_scheduled_start(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("New time must be in the future")
        return value


# =============================================================================
# DASHBOARD & STATS SERIALIZERS
# =============================================================================

class ConsultationQuickDataSerializer(serializers.Serializer):
    """Quick data for dashboard."""
    upcoming_consultations = ConsultationListSerializer(many=True)
    today_consultations = ConsultationListSerializer(many=True)
    waiting_patients = ConsultationListSerializer(many=True)
    recent_completed = ConsultationListSerializer(many=True)
    stats = serializers.DictField()


class ConsultationStatsSerializer(serializers.Serializer):
    """Consultation statistics."""
    total = serializers.IntegerField()
    completed = serializers.IntegerField()
    cancelled = serializers.IntegerField()
    no_show = serializers.IntegerField()
    avg_duration = serializers.FloatField(allow_null=True)
    avg_rating = serializers.FloatField(allow_null=True)
    total_feedback = serializers.IntegerField()
    completion_rate = serializers.SerializerMethodField()
    
    def get_completion_rate(self, obj):
        total = obj.get('total', 0)
        completed = obj.get('completed', 0)
        if total > 0:
            return round((completed / total) * 100, 1)
        return 0


class DoctorConsultationSummarySerializer(serializers.Serializer):
    """Doctor's consultation summary."""
    today_count = serializers.IntegerField()
    upcoming_count = serializers.IntegerField()
    waiting_count = serializers.IntegerField()
    completed_today = serializers.IntegerField()
    next_consultation = ConsultationListSerializer(allow_null=True)


class PatientConsultationSummarySerializer(serializers.Serializer):
    """Patient's consultation summary."""
    upcoming_count = serializers.IntegerField()
    completed_count = serializers.IntegerField()
    next_consultation = ConsultationListSerializer(allow_null=True)
    last_consultation = ConsultationListSerializer(allow_null=True)


# =============================================================================
# DETAILED VIEW SERIALIZERS
# =============================================================================

class ConsultationDetailSerializer(serializers.ModelSerializer):
    """Full consultation with all related data."""
    doctor_info = DoctorInfoSerializer(source='doctor', read_only=True)
    patient_info = PatientInfoSerializer(source='patient', read_only=True)
    room = ConsultationRoomSerializer(read_only=True)
    notes = ConsultationNoteSerializer(many=True, read_only=True)
    prescriptions = ConsultationPrescriptionSerializer(many=True, read_only=True)
    attachments = ConsultationAttachmentSerializer(many=True, read_only=True)
    feedback = ConsultationFeedbackSerializer(read_only=True)
    can_join = serializers.ReadOnlyField()
    is_upcoming = serializers.ReadOnlyField()
    
    class Meta:
        model = Consultation
        fields = [
            'id', 'doctor', 'doctor_info', 'patient', 'patient_info',
            'appointment', 'room', 'consultation_type', 'status',
            'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end',
            'estimated_duration', 'actual_duration',
            'reason', 'symptoms', 'diagnosis',
            'follow_up_required', 'follow_up_notes', 'follow_up_date',
            'cancelled_at', 'cancelled_by', 'cancellation_reason',
            'language', 'created_at', 'updated_at',
            'notes', 'prescriptions', 'attachments', 'feedback',
            'can_join', 'is_upcoming'
        ]
        read_only_fields = fields


class ConsultationHistorySerializer(serializers.ModelSerializer):
    """Consultation history item."""
    doctor_name = serializers.SerializerMethodField()
    has_prescriptions = serializers.SerializerMethodField()
    has_diagnosis = serializers.SerializerMethodField()
    
    class Meta:
        model = Consultation
        fields = [
            'id', 'doctor_name', 'consultation_type', 'status',
            'scheduled_start', 'actual_duration', 'diagnosis',
            'has_prescriptions', 'has_diagnosis', 'follow_up_required'
        ]
        read_only_fields = fields
    
    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"
    
    def get_has_prescriptions(self, obj):
        return obj.prescriptions.exists()
    
    def get_has_diagnosis(self, obj):
        return bool(obj.diagnosis)