"""
Consultation App Admin
======================
Django admin configuration for consultation models.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone

from apps.consultation.models import (
    ConsultationRoom,
    Consultation,
    ConsultationNote,
    ConsultationPrescription,
    ConsultationAttachment,
    ConsultationFeedback,
)


@admin.register(ConsultationRoom)
class ConsultationRoomAdmin(admin.ModelAdmin):
    """Admin for ConsultationRoom model."""
    
    list_display = [
        'room_name', 'jitsi_domain', 'status', 'is_audio_only',
        'is_lobby_enabled', 'created_at', 'expires_at', 'is_expired_display'
    ]
    list_filter = ['status', 'is_audio_only', 'is_lobby_enabled', 'jitsi_domain']
    search_fields = ['room_name']
    readonly_fields = [
        'id', 'created_at', 'activated_at', 'ended_at',
        'doctor_joined_at', 'patient_joined_at', 'full_room_url'
    ]
    ordering = ['-created_at']
    
    fieldsets = (
        ('Room Info', {
            'fields': ('id', 'room_name', 'room_password', 'jitsi_domain', 'full_room_url')
        }),
        ('Settings', {
            'fields': ('is_audio_only', 'is_lobby_enabled', 'max_participants')
        }),
        ('Status', {
            'fields': ('status', 'expires_at')
        }),
        ('Timestamps', {
            'fields': (
                'created_at', 'activated_at', 'ended_at',
                'doctor_joined_at', 'patient_joined_at'
            ),
            'classes': ('collapse',)
        }),
    )
    
    def is_expired_display(self, obj):
        if obj.is_expired:
            return format_html('<span style="color: red;">Expired</span>')
        return format_html('<span style="color: green;">Active</span>')
    is_expired_display.short_description = 'Expired'
    
    def full_room_url(self, obj):
        return format_html('<a href="{}" target="_blank">{}</a>', obj.full_room_url, obj.full_room_url)
    full_room_url.short_description = 'Room URL'


class ConsultationNoteInline(admin.TabularInline):
    """Inline for consultation notes."""
    model = ConsultationNote
    extra = 0
    readonly_fields = ['created_at']
    fields = ['note_type', 'title', 'content', 'is_private', 'created_at']


class ConsultationPrescriptionInline(admin.TabularInline):
    """Inline for consultation prescriptions."""
    model = ConsultationPrescription
    extra = 0
    readonly_fields = ['created_at']
    fields = [
        'medicine_name', 'dosage', 'frequency', 'duration',
        'timing', 'quantity', 'is_active', 'created_at'
    ]


class ConsultationAttachmentInline(admin.TabularInline):
    """Inline for consultation attachments."""
    model = ConsultationAttachment
    extra = 0
    readonly_fields = ['uploaded_at', 'uploaded_by']
    fields = [
        'attachment_type', 'file_name', 'file_url',
        'uploaded_by', 'uploaded_at'
    ]


@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    """Admin for Consultation model."""
    
    list_display = [
        'id_short', 'patient_name', 'doctor_name', 'consultation_type',
        'status', 'scheduled_start', 'actual_duration', 'has_feedback'
    ]
    list_filter = [
        'status', 'consultation_type', 'language',
        'follow_up_required', 'scheduled_start'
    ]
    search_fields = [
        'patient__first_name', 'patient__last_name', 'patient__phone',
        'doctor__first_name', 'doctor__last_name', 'doctor__phone',
        'reason', 'diagnosis'
    ]
    readonly_fields = [
        'id', 'room', 'actual_start', 'actual_end', 'actual_duration',
        'cancelled_at', 'cancelled_by', 'created_at', 'updated_at'
    ]
    ordering = ['-scheduled_start']
    date_hierarchy = 'scheduled_start'
    
    inlines = [
        ConsultationNoteInline,
        ConsultationPrescriptionInline,
        ConsultationAttachmentInline,
    ]
    
    fieldsets = (
        ('Participants', {
            'fields': ('id', 'doctor', 'patient', 'appointment')
        }),
        ('Room', {
            'fields': ('room', 'consultation_type', 'language')
        }),
        ('Schedule', {
            'fields': (
                'scheduled_start', 'scheduled_end', 'estimated_duration',
                'actual_start', 'actual_end', 'actual_duration'
            )
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Clinical Info', {
            'fields': ('reason', 'symptoms', 'diagnosis')
        }),
        ('Follow-up', {
            'fields': ('follow_up_required', 'follow_up_notes', 'follow_up_date')
        }),
        ('Cancellation', {
            'fields': ('cancelled_at', 'cancelled_by', 'cancellation_reason'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"
    patient_name.short_description = 'Patient'
    
    def doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"
    doctor_name.short_description = 'Doctor'
    
    def has_feedback(self, obj):
        has_fb = hasattr(obj, 'feedback') and obj.feedback is not None
        if has_fb:
            return format_html(
                '<span style="color: green;">✓ {}/5</span>',
                obj.feedback.overall_rating
            )
        return format_html('<span style="color: gray;">—</span>')
    has_feedback.short_description = 'Feedback'


@admin.register(ConsultationNote)
class ConsultationNoteAdmin(admin.ModelAdmin):
    """Admin for ConsultationNote model."""
    
    list_display = [
        'id_short', 'consultation_short', 'note_type', 'title',
        'is_private', 'created_at'
    ]
    list_filter = ['note_type', 'is_private', 'created_at']
    search_fields = ['title', 'content', 'consultation__id']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def consultation_short(self, obj):
        return str(obj.consultation.id)[:8]
    consultation_short.short_description = 'Consultation'


@admin.register(ConsultationPrescription)
class ConsultationPrescriptionAdmin(admin.ModelAdmin):
    """Admin for ConsultationPrescription model."""
    
    list_display = [
        'id_short', 'consultation_short', 'medicine_name', 'dosage',
        'frequency', 'duration', 'timing', 'is_active', 'created_at'
    ]
    list_filter = ['timing', 'is_active', 'created_at']
    search_fields = ['medicine_name', 'consultation__id']
    readonly_fields = ['id', 'created_at']
    ordering = ['-created_at']
    
    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def consultation_short(self, obj):
        return str(obj.consultation.id)[:8]
    consultation_short.short_description = 'Consultation'


@admin.register(ConsultationAttachment)
class ConsultationAttachmentAdmin(admin.ModelAdmin):
    """Admin for ConsultationAttachment model."""
    
    list_display = [
        'id_short', 'consultation_short', 'file_name', 'attachment_type',
        'uploaded_by_name', 'file_size_display', 'uploaded_at'
    ]
    list_filter = ['attachment_type', 'uploaded_at']
    search_fields = ['file_name', 'description', 'consultation__id']
    readonly_fields = ['id', 'uploaded_at']
    ordering = ['-uploaded_at']
    
    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def consultation_short(self, obj):
        return str(obj.consultation.id)[:8]
    consultation_short.short_description = 'Consultation'
    
    def uploaded_by_name(self, obj):
        return f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}"
    uploaded_by_name.short_description = 'Uploaded By'
    
    def file_size_display(self, obj):
        size = obj.file_size
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"
        else:
            return f"{size / (1024 * 1024):.1f} MB"
    file_size_display.short_description = 'Size'


@admin.register(ConsultationFeedback)
class ConsultationFeedbackAdmin(admin.ModelAdmin):
    """Admin for ConsultationFeedback model."""
    
    list_display = [
        'id_short', 'consultation_short', 'overall_rating',
        'communication_rating', 'technical_quality_rating',
        'would_recommend', 'had_technical_issues', 'is_anonymous', 'created_at'
    ]
    list_filter = [
        'overall_rating', 'would_recommend', 'had_technical_issues',
        'is_anonymous', 'created_at'
    ]
    search_fields = ['comments', 'consultation__id']
    readonly_fields = ['id', 'consultation', 'created_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Consultation', {
            'fields': ('id', 'consultation')
        }),
        ('Ratings', {
            'fields': (
                'overall_rating', 'communication_rating', 'technical_quality_rating'
            )
        }),
        ('Feedback', {
            'fields': ('comments', 'would_recommend')
        }),
        ('Technical Issues', {
            'fields': ('had_technical_issues', 'technical_issue_description')
        }),
        ('Settings', {
            'fields': ('is_anonymous', 'created_at')
        }),
    )
    
    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def consultation_short(self, obj):
        return str(obj.consultation.id)[:8]
    consultation_short.short_description = 'Consultation'