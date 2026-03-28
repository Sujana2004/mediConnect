"""
Consultation App Admin
======================
Django admin configuration for consultation models.
Enhanced with visual badges, performance optimization, and bulk actions.
"""

import csv
from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.http import HttpResponse
from django.urls import reverse
from django.db.models import Count, Avg

from apps.consultation.models import (
    ConsultationRoom,
    Consultation,
    ConsultationNote,
    ConsultationPrescription,
    ConsultationAttachment,
    ConsultationFeedback,
)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def status_badge(text, color):
    """Generate a colored status badge."""
    return format_html(
        '<span style="background-color: {}; color: white; padding: 3px 10px; '
        'border-radius: 12px; font-size: 11px; font-weight: bold;">{}</span>',
        color, text
    )


def get_star_rating(rating, max_rating=5):
    """Generate star rating display."""
    if rating is None:
        return format_html('<span style="color: #ccc;">—</span>')
    filled = '⭐' * int(rating)
    empty = '☆' * (max_rating - int(rating))
    return format_html(
        '<span title="{}/5">{}{}</span>',
        rating, filled, empty
    )


# =============================================================================
# CONSULTATION ROOM ADMIN
# =============================================================================

@admin.register(ConsultationRoom)
class ConsultationRoomAdmin(admin.ModelAdmin):
    """Admin for ConsultationRoom model with visual enhancements."""
    
    list_display = [
        'room_name_display', 'status_badge', 'room_type_display',
        'lobby_status', 'participants_display', 'created_at',
        'expiry_status', 'join_tracking'
    ]
    list_filter = ['status', 'is_audio_only', 'is_lobby_enabled', 'jitsi_domain']
    search_fields = ['room_name']
    readonly_fields = [
        'id', 'created_at', 'activated_at', 'ended_at',
        'doctor_joined_at', 'patient_joined_at', 'room_url_display',
        'room_duration'
    ]
    ordering = ['-created_at']
    list_per_page = 25
    date_hierarchy = 'created_at'
    
    actions = ['mark_as_expired', 'export_rooms_csv']
    
    fieldsets = (
        ('🎥 Room Information', {
            'fields': ('id', 'room_name', 'room_password', 'jitsi_domain', 'room_url_display')
        }),
        ('⚙️ Settings', {
            'fields': ('is_audio_only', 'is_lobby_enabled', 'max_participants')
        }),
        ('📊 Status', {
            'fields': ('status', 'expires_at', 'room_duration')
        }),
        ('⏰ Timestamps', {
            'fields': (
                'created_at', 'activated_at', 'ended_at',
                'doctor_joined_at', 'patient_joined_at'
            ),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Room Name')
    def room_name_display(self, obj):
        url = obj.full_room_url
        return format_html(
            '<a href="{}" target="_blank" title="Open Jitsi Room">'
            '🔗 {}</a>',
            url, obj.room_name[:20] + '...' if len(obj.room_name) > 20 else obj.room_name
        )
    
    @admin.display(description='Status')
    def status_badge(self, obj):
        colors = {
            'created': '#3498db',      # Blue
            'waiting': '#f39c12',      # Orange
            'active': '#27ae60',       # Green
            'ended': '#95a5a6',        # Gray
            'expired': '#e74c3c',      # Red
        }
        icons = {
            'created': '🆕',
            'waiting': '⏳',
            'active': '🟢',
            'ended': '✅',
            'expired': '⏰',
        }
        color = colors.get(obj.status, '#95a5a6')
        icon = icons.get(obj.status, '')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px; font-weight: bold;">'
            '{} {}</span>',
            color, icon, obj.get_status_display()
        )
    
    @admin.display(description='Type')
    def room_type_display(self, obj):
        if obj.is_audio_only:
            return format_html(
                '<span style="color: #9b59b6;" title="Audio Only">🎤 Audio</span>'
            )
        return format_html(
            '<span style="color: #3498db;" title="Video Call">📹 Video</span>'
        )
    
    @admin.display(description='Lobby')
    def lobby_status(self, obj):
        if obj.is_lobby_enabled:
            return format_html(
                '<span style="color: #27ae60;">✓ Enabled</span>'
            )
        return format_html(
            '<span style="color: #e74c3c;">✗ Disabled</span>'
        )
    
    @admin.display(description='Max')
    def participants_display(self, obj):
        return format_html(
            '<span style="background: #ecf0f1; padding: 2px 8px; '
            'border-radius: 10px;">👥 {}</span>',
            obj.max_participants
        )
    
    @admin.display(description='Expiry')
    def expiry_status(self, obj):
        now = timezone.now()
        if obj.status in ['ended', 'expired']:
            return format_html('<span style="color: #95a5a6;">—</span>')
        
        if obj.is_expired:
            return format_html(
                '<span style="color: #e74c3c; font-weight: bold;">❌ Expired</span>'
            )
        
        time_left = obj.expires_at - now
        hours = time_left.seconds // 3600
        minutes = (time_left.seconds % 3600) // 60
        
        if time_left.days > 0:
            return format_html(
                '<span style="color: #27ae60;">⏳ {}d {}h</span>',
                time_left.days, hours
            )
        elif hours > 0:
            return format_html(
                '<span style="color: #f39c12;">⏳ {}h {}m</span>',
                hours, minutes
            )
        else:
            return format_html(
                '<span style="color: #e74c3c;">⏳ {}m left</span>',
                minutes
            )
    
    @admin.display(description='Joined')
    def join_tracking(self, obj):
        doctor = '👨‍⚕️✓' if obj.doctor_joined_at else '👨‍⚕️✗'
        patient = '🧑✓' if obj.patient_joined_at else '🧑✗'
        
        doc_color = '#27ae60' if obj.doctor_joined_at else '#e74c3c'
        pat_color = '#27ae60' if obj.patient_joined_at else '#e74c3c'
        
        return format_html(
            '<span style="color: {};">{}</span> '
            '<span style="color: {};">{}</span>',
            doc_color, doctor, pat_color, patient
        )
    
    @admin.display(description='Room URL')
    def room_url_display(self, obj):
        return format_html(
            '<a href="{}" target="_blank" style="word-break: break-all;">'
            '🔗 {}</a>',
            obj.full_room_url, obj.full_room_url
        )
    
    @admin.display(description='Duration')
    def room_duration(self, obj):
        if obj.activated_at and obj.ended_at:
            duration = obj.ended_at - obj.activated_at
            minutes = duration.seconds // 60
            return f"{minutes} minutes"
        return "—"
    
    @admin.action(description='⏰ Mark as Expired')
    def mark_as_expired(self, request, queryset):
        updated = queryset.exclude(status__in=['ended', 'expired']).update(
            status='expired',
            ended_at=timezone.now()
        )
        self.message_user(request, f"✅ {updated} rooms marked as expired.")
    
    @admin.action(description='📥 Export to CSV')
    def export_rooms_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="consultation_rooms.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'Room Name', 'Status', 'Type', 'Lobby', 'Created At',
            'Expires At', 'Doctor Joined', 'Patient Joined'
        ])
        for room in queryset:
            writer.writerow([
                room.room_name,
                room.get_status_display(),
                'Audio' if room.is_audio_only else 'Video',
                'Yes' if room.is_lobby_enabled else 'No',
                room.created_at.strftime('%Y-%m-%d %H:%M'),
                room.expires_at.strftime('%Y-%m-%d %H:%M'),
                room.doctor_joined_at.strftime('%Y-%m-%d %H:%M') if room.doctor_joined_at else '',
                room.patient_joined_at.strftime('%Y-%m-%d %H:%M') if room.patient_joined_at else '',
            ])
        return response


# =============================================================================
# INLINE MODELS
# =============================================================================

class ConsultationNoteInline(admin.TabularInline):
    """Inline for consultation notes with enhanced display."""
    model = ConsultationNote
    extra = 0
    readonly_fields = ['created_at', 'note_type_badge']
    fields = ['note_type_badge', 'note_type', 'title', 'content', 'is_private', 'created_at']
    classes = ['collapse']
    
    @admin.display(description='Type')
    def note_type_badge(self, obj):
        colors = {
            'subjective': '#3498db',
            'objective': '#9b59b6',
            'assessment': '#e67e22',
            'plan': '#27ae60',
            'general': '#95a5a6',
        }
        icons = {
            'subjective': 'S',
            'objective': 'O',
            'assessment': 'A',
            'plan': 'P',
            'general': 'G',
        }
        color = colors.get(obj.note_type, '#95a5a6')
        icon = icons.get(obj.note_type, 'N')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 4px; font-weight: bold;">{}</span>',
            color, icon
        )


class ConsultationPrescriptionInline(admin.TabularInline):
    """Inline for consultation prescriptions."""
    model = ConsultationPrescription
    extra = 0
    readonly_fields = ['created_at']
    fields = [
        'medicine_name', 'dosage', 'frequency', 'duration',
        'timing', 'quantity', 'is_active', 'created_at'
    ]
    classes = ['collapse']


class ConsultationAttachmentInline(admin.TabularInline):
    """Inline for consultation attachments."""
    model = ConsultationAttachment
    extra = 0
    readonly_fields = ['uploaded_at', 'uploader_link', 'file_size_display']
    fields = [
        'attachment_type', 'file_name', 'file_url',
        'file_size_display', 'uploader_link', 'uploaded_at'
    ]
    classes = ['collapse']
    
    @admin.display(description='Uploaded By')
    def uploader_link(self, obj):
        if obj.uploaded_by:
            url = reverse('admin:users_user_change', args=[obj.uploaded_by.pk])
            return format_html('<a href="{}">{}</a>', url, obj.uploaded_by.phone)
        return '-'
    
    @admin.display(description='Size')
    def file_size_display(self, obj):
        size = obj.file_size
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"
        return f"{size / (1024 * 1024):.1f} MB"


class ConsultationFeedbackInline(admin.StackedInline):
    """Inline for consultation feedback."""
    model = ConsultationFeedback
    extra = 0
    readonly_fields = ['created_at', 'rating_display']
    fields = [
        'rating_display', 'overall_rating', 'communication_rating',
        'technical_quality_rating', 'comments', 'would_recommend',
        'had_technical_issues', 'technical_issue_description',
        'is_anonymous', 'created_at'
    ]
    classes = ['collapse']
    can_delete = False
    
    @admin.display(description='Rating Overview')
    def rating_display(self, obj):
        if not obj.pk:
            return "No feedback yet"
        return format_html(
            '<div style="font-size: 18px;">{}</div>'
            '<div style="color: #666; font-size: 12px;">Overall: {}/5</div>',
            get_star_rating(obj.overall_rating),
            obj.overall_rating
        )


# =============================================================================
# CONSULTATION ADMIN
# =============================================================================

@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    """Admin for Consultation model with enhanced display and actions."""
    
    list_display = [
        'id_short', 'patient_link', 'doctor_link', 'type_icon',
        'status_badge', 'scheduled_display', 'duration_display',
        'feedback_rating', 'follow_up_badge'
    ]
    list_filter = [
        'status', 'consultation_type', 'language',
        'follow_up_required', 'scheduled_start'
    ]
    search_fields = [
        'patient__phone', 'doctor__phone',
        'patient__first_name', 'patient__last_name',
        'doctor__first_name', 'doctor__last_name',
        'reason', 'diagnosis'
    ]
    readonly_fields = [
        'id', 'room_link', 'actual_start', 'actual_end', 'actual_duration',
        'cancelled_at', 'cancelled_by', 'created_at', 'updated_at',
        'duration_calculated', 'can_join_display'
    ]
    ordering = ['-scheduled_start']
    date_hierarchy = 'scheduled_start'
    list_per_page = 25
    list_select_related = ['patient', 'doctor', 'room', 'appointment']
    
    actions = [
        'mark_completed', 'mark_no_show', 'mark_cancelled',
        'export_consultations_csv'
    ]
    
    inlines = [
        ConsultationFeedbackInline,
        ConsultationNoteInline,
        ConsultationPrescriptionInline,
        ConsultationAttachmentInline,
    ]
    
    fieldsets = (
        ('👥 Participants', {
            'fields': ('id', 'doctor', 'patient', 'appointment')
        }),
        ('🎥 Room & Type', {
            'fields': ('room_link', 'consultation_type', 'language', 'can_join_display')
        }),
        ('📅 Schedule', {
            'fields': (
                'scheduled_start', 'scheduled_end', 'estimated_duration',
                'actual_start', 'actual_end', 'duration_calculated'
            )
        }),
        ('📊 Status', {
            'fields': ('status',)
        }),
        ('🏥 Clinical Information', {
            'fields': ('reason', 'symptoms', 'diagnosis'),
            'classes': ('collapse',)
        }),
        ('📋 Follow-up', {
            'fields': ('follow_up_required', 'follow_up_notes', 'follow_up_date'),
            'classes': ('collapse',)
        }),
        ('❌ Cancellation', {
            'fields': ('cancelled_at', 'cancelled_by', 'cancellation_reason'),
            'classes': ('collapse',)
        }),
        ('⏰ Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'patient', 'doctor', 'room', 'appointment'
        ).prefetch_related('feedback')
    
    @admin.display(description='ID')
    def id_short(self, obj):
        return format_html(
            '<code style="background: #f8f9fa; padding: 2px 6px; '
            'border-radius: 4px;">{}</code>',
            str(obj.id)[:8]
        )
    
    @admin.display(description='Patient')
    def patient_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.patient.pk])
        name = f"{obj.patient.first_name or ''} {obj.patient.last_name or ''}".strip()
        display = name if name else obj.patient.phone
        return format_html(
            '<a href="{}" title="Phone: {}">🧑 {}</a>',
            url, obj.patient.phone, display or obj.patient.phone
        )
    
    @admin.display(description='Doctor')
    def doctor_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.doctor.pk])
        name = f"Dr. {obj.doctor.first_name or ''} {obj.doctor.last_name or ''}".strip()
        display = name if name != "Dr." else obj.doctor.phone
        return format_html(
            '<a href="{}" title="Phone: {}">👨‍⚕️ {}</a>',
            url, obj.doctor.phone, display
        )
    
    @admin.display(description='Type')
    def type_icon(self, obj):
        icons = {
            'video': ('📹', '#3498db', 'Video Call'),
            'audio': ('🎤', '#9b59b6', 'Audio Call'),
            'chat': ('💬', '#27ae60', 'Chat Only'),
        }
        icon, color, title = icons.get(obj.consultation_type, ('❓', '#95a5a6', 'Unknown'))
        return format_html(
            '<span style="color: {};" title="{}">{}</span>',
            color, title, icon
        )
    
    @admin.display(description='Status')
    def status_badge(self, obj):
        colors = {
            'scheduled': '#3498db',
            'waiting_room': '#f39c12',
            'in_progress': '#27ae60',
            'completed': '#2ecc71',
            'cancelled': '#e74c3c',
            'no_show': '#c0392b',
            'technical_issue': '#e67e22',
        }
        icons = {
            'scheduled': '📅',
            'waiting_room': '⏳',
            'in_progress': '🔴',
            'completed': '✅',
            'cancelled': '❌',
            'no_show': '👻',
            'technical_issue': '⚠️',
        }
        color = colors.get(obj.status, '#95a5a6')
        icon = icons.get(obj.status, '')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px; font-weight: bold;">'
            '{} {}</span>',
            color, icon, obj.get_status_display()
        )
    
    @admin.display(description='Scheduled')
    def scheduled_display(self, obj):
        now = timezone.now()
        scheduled = obj.scheduled_start
        
        date_str = scheduled.strftime('%d %b %Y')
        time_str = scheduled.strftime('%H:%M')
        
        # Check if upcoming
        if obj.status == 'scheduled' and scheduled > now:
            diff = scheduled - now
            if diff.days == 0:
                hours = diff.seconds // 3600
                minutes = (diff.seconds % 3600) // 60
                if hours > 0:
                    countdown = f"In {hours}h {minutes}m"
                else:
                    countdown = f"In {minutes}m"
                return format_html(
                    '<span>{} {}</span><br>'
                    '<small style="color: #27ae60;">{}</small>',
                    date_str, time_str, countdown
                )
            elif diff.days == 1:
                return format_html(
                    '<span>{} {}</span><br>'
                    '<small style="color: #f39c12;">Tomorrow</small>',
                    date_str, time_str
                )
        
        return format_html('{} {}', date_str, time_str)
    
    @admin.display(description='Duration')
    def duration_display(self, obj):
        if obj.actual_duration:
            mins = obj.actual_duration
            return format_html(
                '<span style="background: #d5f5e3; padding: 2px 8px; '
                'border-radius: 10px;">⏱️ {}m</span>',
                mins
            )
        elif obj.status in ['in_progress'] and obj.actual_start:
            elapsed = timezone.now() - obj.actual_start
            mins = elapsed.seconds // 60
            return format_html(
                '<span style="background: #fcf3cf; padding: 2px 8px; '
                'border-radius: 10px; animation: pulse 1s infinite;">🔴 {}m</span>',
                mins
            )
        return format_html(
            '<span style="color: #bdc3c7;">~{}m</span>',
            obj.estimated_duration
        )
    
    @admin.display(description='Feedback')
    def feedback_rating(self, obj):
        try:
            feedback = obj.feedback
            if feedback:
                return get_star_rating(feedback.overall_rating)
        except ConsultationFeedback.DoesNotExist:
            pass
        return format_html('<span style="color: #ccc;">No feedback</span>')
    
    @admin.display(description='Follow-up')
    def follow_up_badge(self, obj):
        if obj.follow_up_required:
            if obj.follow_up_date:
                return format_html(
                    '<span style="background: #f39c12; color: white; '
                    'padding: 2px 8px; border-radius: 10px;">📋 {}</span>',
                    obj.follow_up_date.strftime('%d %b')
                )
            return format_html(
                '<span style="background: #e74c3c; color: white; '
                'padding: 2px 8px; border-radius: 10px;">📋 Required</span>'
            )
        return format_html('<span style="color: #ccc;">—</span>')
    
    @admin.display(description='Room')
    def room_link(self, obj):
        if obj.room:
            room_admin_url = reverse('admin:consultation_consultationroom_change', args=[obj.room.pk])
            return format_html(
                '<a href="{}" target="_blank">🔗 {} ({})</a><br>'
                '<a href="{}" target="_blank" style="font-size: 11px;">Open Jitsi Room →</a>',
                room_admin_url, obj.room.room_name[:15], obj.room.get_status_display(),
                obj.room.full_room_url
            )
        return '-'
    
    @admin.display(description='Calculated Duration')
    def duration_calculated(self, obj):
        if obj.actual_start and obj.actual_end:
            duration = obj.actual_end - obj.actual_start
            mins = duration.seconds // 60
            return f"{mins} minutes"
        return "—"
    
    @admin.display(description='Can Join Now?')
    def can_join_display(self, obj):
        if obj.can_join:
            return format_html(
                '<span style="color: #27ae60; font-weight: bold;">✅ Yes - Join Window Open</span>'
            )
        return format_html(
            '<span style="color: #e74c3c;">❌ No</span>'
        )
    
    # =========================================================================
    # BULK ACTIONS
    # =========================================================================
    
    @admin.action(description='✅ Mark as Completed')
    def mark_completed(self, request, queryset):
        updated = queryset.filter(status='in_progress').update(
            status='completed',
            actual_end=timezone.now()
        )
        self.message_user(request, f"✅ {updated} consultations marked as completed.")
    
    @admin.action(description='👻 Mark as No Show')
    def mark_no_show(self, request, queryset):
        updated = queryset.filter(
            status__in=['scheduled', 'waiting_room']
        ).update(status='no_show')
        self.message_user(request, f"👻 {updated} consultations marked as no show.")
    
    @admin.action(description='❌ Mark as Cancelled')
    def mark_cancelled(self, request, queryset):
        updated = queryset.exclude(
            status__in=['completed', 'cancelled']
        ).update(
            status='cancelled',
            cancelled_at=timezone.now()
        )
        self.message_user(request, f"❌ {updated} consultations cancelled.")
    
    @admin.action(description='📥 Export to CSV')
    def export_consultations_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="consultations.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Patient Phone', 'Doctor Phone', 'Type', 'Status',
            'Scheduled Start', 'Duration (min)', 'Diagnosis', 'Follow-up Required'
        ])
        for c in queryset.select_related('patient', 'doctor'):
            writer.writerow([
                str(c.id)[:8],
                c.patient.phone,
                c.doctor.phone,
                c.get_consultation_type_display(),
                c.get_status_display(),
                c.scheduled_start.strftime('%Y-%m-%d %H:%M'),
                c.actual_duration or c.estimated_duration,
                c.diagnosis[:50] if c.diagnosis else '',
                'Yes' if c.follow_up_required else 'No',
            ])
        return response


# =============================================================================
# CONSULTATION NOTE ADMIN
# =============================================================================

@admin.register(ConsultationNote)
class ConsultationNoteAdmin(admin.ModelAdmin):
    """Admin for ConsultationNote model with SOAP formatting."""
    
    list_display = [
        'id_short', 'consultation_link', 'note_type_badge', 'title_display',
        'privacy_badge', 'content_preview', 'created_at'
    ]
    list_filter = ['note_type', 'is_private', 'created_at']
    search_fields = ['title', 'content', 'consultation__patient__phone']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['-created_at']
    list_per_page = 25
    list_select_related = ['consultation', 'consultation__patient', 'consultation__doctor']
    
    fieldsets = (
        ('📋 Note Information', {
            'fields': ('id', 'consultation', 'note_type', 'title')
        }),
        ('📝 Content', {
            'fields': ('content',)
        }),
        ('🔒 Privacy', {
            'fields': ('is_private',)
        }),
        ('⏰ Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='ID')
    def id_short(self, obj):
        return format_html(
            '<code style="background: #f8f9fa; padding: 2px 6px; '
            'border-radius: 4px;">{}</code>',
            str(obj.id)[:8]
        )
    
    @admin.display(description='Consultation')
    def consultation_link(self, obj):
        url = reverse('admin:consultation_consultation_change', args=[obj.consultation.pk])
        return format_html(
            '<a href="{}">{}</a>',
            url, str(obj.consultation.id)[:8]
        )
    
    @admin.display(description='Type')
    def note_type_badge(self, obj):
        colors = {
            'subjective': '#3498db',
            'objective': '#9b59b6',
            'assessment': '#e67e22',
            'plan': '#27ae60',
            'general': '#95a5a6',
        }
        labels = {
            'subjective': 'S - Subjective',
            'objective': 'O - Objective',
            'assessment': 'A - Assessment',
            'plan': 'P - Plan',
            'general': 'General',
        }
        color = colors.get(obj.note_type, '#95a5a6')
        label = labels.get(obj.note_type, obj.note_type)
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 4px; font-size: 11px; font-weight: bold;">{}</span>',
            color, label
        )
    
    @admin.display(description='Title')
    def title_display(self, obj):
        if obj.title:
            return obj.title[:40] + '...' if len(obj.title) > 40 else obj.title
        return format_html('<span style="color: #ccc;">Untitled</span>')
    
    @admin.display(description='Privacy')
    def privacy_badge(self, obj):
        if obj.is_private:
            return format_html(
                '<span style="background: #e74c3c; color: white; '
                'padding: 2px 8px; border-radius: 10px;">🔒 Private</span>'
            )
        return format_html(
            '<span style="background: #27ae60; color: white; '
            'padding: 2px 8px; border-radius: 10px;">👁️ Visible</span>'
        )
    
    @admin.display(description='Content')
    def content_preview(self, obj):
        preview = obj.content[:60] + '...' if len(obj.content) > 60 else obj.content
        return preview


# =============================================================================
# CONSULTATION PRESCRIPTION ADMIN
# =============================================================================

@admin.register(ConsultationPrescription)
class ConsultationPrescriptionAdmin(admin.ModelAdmin):
    """Admin for ConsultationPrescription model."""
    
    list_display = [
        'id_short', 'consultation_link', 'medicine_display', 'dosage_display',
        'frequency', 'duration', 'timing_badge', 'status_badge', 'created_at'
    ]
    list_filter = ['timing', 'is_active', 'created_at']
    search_fields = ['medicine_name', 'consultation__patient__phone']
    readonly_fields = ['id', 'created_at']
    ordering = ['-created_at']
    list_per_page = 25
    list_select_related = ['consultation']
    
    actions = ['mark_active', 'mark_inactive', 'export_prescriptions_csv']
    
    @admin.display(description='ID')
    def id_short(self, obj):
        return format_html(
            '<code style="background: #f8f9fa; padding: 2px 6px; '
            'border-radius: 4px;">{}</code>',
            str(obj.id)[:8]
        )
    
    @admin.display(description='Consultation')
    def consultation_link(self, obj):
        url = reverse('admin:consultation_consultation_change', args=[obj.consultation.pk])
        return format_html('<a href="{}">{}</a>', url, str(obj.consultation.id)[:8])
    
    @admin.display(description='Medicine')
    def medicine_display(self, obj):
        if obj.medicine:
            url = reverse('admin:medicine_medicine_change', args=[obj.medicine.pk])
            return format_html(
                '💊 <a href="{}">{}</a>',
                url, obj.medicine_name
            )
        return format_html('💊 {}', obj.medicine_name)
    
    @admin.display(description='Dosage')
    def dosage_display(self, obj):
        return format_html(
            '<span style="background: #ecf0f1; padding: 2px 8px; '
            'border-radius: 4px;">{}</span>',
            obj.dosage
        )
    
    @admin.display(description='Timing')
    def timing_badge(self, obj):
        colors = {
            'before_food': '#f39c12',
            'after_food': '#27ae60',
            'with_food': '#3498db',
            'empty_stomach': '#e74c3c',
            'bedtime': '#9b59b6',
            'any_time': '#95a5a6',
        }
        icons = {
            'before_food': '🍽️↑',
            'after_food': '🍽️↓',
            'with_food': '🍽️',
            'empty_stomach': '∅',
            'bedtime': '🌙',
            'any_time': '⏰',
        }
        color = colors.get(obj.timing, '#95a5a6')
        icon = icons.get(obj.timing, '')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 10px; font-size: 11px;">{} {}</span>',
            color, icon, obj.get_timing_display()
        )
    
    @admin.display(description='Status')
    def status_badge(self, obj):
        if obj.is_active:
            return format_html(
                '<span style="color: #27ae60; font-weight: bold;">✅ Active</span>'
            )
        return format_html(
            '<span style="color: #e74c3c;">❌ Inactive</span>'
        )
    
    @admin.action(description='✅ Mark as Active')
    def mark_active(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"✅ {updated} prescriptions marked as active.")
    
    @admin.action(description='❌ Mark as Inactive')
    def mark_inactive(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"❌ {updated} prescriptions marked as inactive.")
    
    @admin.action(description='📥 Export to CSV')
    def export_prescriptions_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="prescriptions.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'Medicine', 'Dosage', 'Frequency', 'Duration', 'Timing',
            'Quantity', 'Active', 'Created'
        ])
        for p in queryset:
            writer.writerow([
                p.medicine_name,
                p.dosage,
                p.frequency,
                p.duration,
                p.get_timing_display(),
                p.quantity,
                'Yes' if p.is_active else 'No',
                p.created_at.strftime('%Y-%m-%d'),
            ])
        return response


# =============================================================================
# CONSULTATION ATTACHMENT ADMIN
# =============================================================================

@admin.register(ConsultationAttachment)
class ConsultationAttachmentAdmin(admin.ModelAdmin):
    """Admin for ConsultationAttachment model."""
    
    list_display = [
        'id_short', 'consultation_link', 'file_icon', 'file_name_link',
        'type_badge', 'uploader_link', 'file_size_display', 'uploaded_at'
    ]
    list_filter = ['attachment_type', 'uploaded_at']
    search_fields = ['file_name', 'description', 'consultation__patient__phone']
    readonly_fields = ['id', 'uploaded_at']
    ordering = ['-uploaded_at']
    list_per_page = 25
    list_select_related = ['consultation', 'uploaded_by']
    
    @admin.display(description='ID')
    def id_short(self, obj):
        return format_html(
            '<code style="background: #f8f9fa; padding: 2px 6px; '
            'border-radius: 4px;">{}</code>',
            str(obj.id)[:8]
        )
    
    @admin.display(description='Consultation')
    def consultation_link(self, obj):
        url = reverse('admin:consultation_consultation_change', args=[obj.consultation.pk])
        return format_html('<a href="{}">{}</a>', url, str(obj.consultation.id)[:8])
    
    @admin.display(description='')
    def file_icon(self, obj):
        icons = {
            'report': '📄',
            'prescription': '💊',
            'lab_result': '🔬',
            'scan': '🩻',
            'photo': '📷',
            'document': '📁',
        }
        return icons.get(obj.attachment_type, '📎')
    
    @admin.display(description='File')
    def file_name_link(self, obj):
        return format_html(
            '<a href="{}" target="_blank">{}</a>',
            obj.file_url,
            obj.file_name[:30] + '...' if len(obj.file_name) > 30 else obj.file_name
        )
    
    @admin.display(description='Type')
    def type_badge(self, obj):
        colors = {
            'report': '#3498db',
            'prescription': '#27ae60',
            'lab_result': '#9b59b6',
            'scan': '#e67e22',
            'photo': '#1abc9c',
            'document': '#95a5a6',
        }
        color = colors.get(obj.attachment_type, '#95a5a6')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 10px; font-size: 11px;">{}</span>',
            color, obj.get_attachment_type_display()
        )
    
    @admin.display(description='Uploaded By')
    def uploader_link(self, obj):
        if obj.uploaded_by:
            url = reverse('admin:users_user_change', args=[obj.uploaded_by.pk])
            return format_html('<a href="{}">{}</a>', url, obj.uploaded_by.phone)
        return '-'
    
    @admin.display(description='Size')
    def file_size_display(self, obj):
        size = obj.file_size
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"
        return format_html(
            '<span style="color: #e67e22;">{:.1f} MB</span>',
            size / (1024 * 1024)
        )


# =============================================================================
# CONSULTATION FEEDBACK ADMIN
# =============================================================================

@admin.register(ConsultationFeedback)
class ConsultationFeedbackAdmin(admin.ModelAdmin):
    """Admin for ConsultationFeedback model with rating visualization."""
    
    list_display = [
        'id_short', 'consultation_link', 'overall_stars', 'communication_stars',
        'technical_stars', 'recommend_badge', 'issues_badge', 'anonymous_badge',
        'created_at'
    ]
    list_filter = [
        'overall_rating', 'would_recommend', 'had_technical_issues',
        'is_anonymous', 'created_at'
    ]
    search_fields = ['comments', 'consultation__patient__phone']
    readonly_fields = ['id', 'consultation', 'created_at', 'rating_summary']
    ordering = ['-created_at']
    list_per_page = 25
    list_select_related = ['consultation', 'consultation__patient', 'consultation__doctor']
    
    actions = ['export_feedback_csv', 'export_with_issues']
    
    fieldsets = (
        ('📊 Overview', {
            'fields': ('id', 'consultation', 'rating_summary')
        }),
        ('⭐ Ratings', {
            'fields': (
                'overall_rating', 'communication_rating', 'technical_quality_rating'
            )
        }),
        ('💬 Feedback', {
            'fields': ('comments', 'would_recommend')
        }),
        ('⚠️ Technical Issues', {
            'fields': ('had_technical_issues', 'technical_issue_description')
        }),
        ('🔒 Settings', {
            'fields': ('is_anonymous', 'created_at')
        }),
    )
    
    @admin.display(description='ID')
    def id_short(self, obj):
        return format_html(
            '<code style="background: #f8f9fa; padding: 2px 6px; '
            'border-radius: 4px;">{}</code>',
            str(obj.id)[:8]
        )
    
    @admin.display(description='Consultation')
    def consultation_link(self, obj):
        url = reverse('admin:consultation_consultation_change', args=[obj.consultation.pk])
        return format_html('<a href="{}">{}</a>', url, str(obj.consultation.id)[:8])
    
    @admin.display(description='Overall')
    def overall_stars(self, obj):
        return get_star_rating(obj.overall_rating)
    
    @admin.display(description='Communication')
    def communication_stars(self, obj):
        return get_star_rating(obj.communication_rating)
    
    @admin.display(description='Technical')
    def technical_stars(self, obj):
        return get_star_rating(obj.technical_quality_rating)
    
    @admin.display(description='Recommend')
    def recommend_badge(self, obj):
        if obj.would_recommend is True:
            return format_html(
                '<span style="color: #27ae60; font-weight: bold;">👍 Yes</span>'
            )
        elif obj.would_recommend is False:
            return format_html(
                '<span style="color: #e74c3c; font-weight: bold;">👎 No</span>'
            )
        return format_html('<span style="color: #ccc;">—</span>')
    
    @admin.display(description='Issues')
    def issues_badge(self, obj):
        if obj.had_technical_issues:
            return format_html(
                '<span style="background: #e74c3c; color: white; '
                'padding: 2px 8px; border-radius: 10px;">⚠️ Yes</span>'
            )
        return format_html(
            '<span style="color: #27ae60;">✓ None</span>'
        )
    
    @admin.display(description='Anonymous')
    def anonymous_badge(self, obj):
        if obj.is_anonymous:
            return format_html(
                '<span style="color: #9b59b6;">🎭 Yes</span>'
            )
        return format_html('<span style="color: #ccc;">No</span>')
    
    @admin.display(description='Rating Summary')
    def rating_summary(self, obj):
        return format_html(
            '<div style="font-size: 24px; margin-bottom: 10px;">{}</div>'
            '<table style="width: 100%;">'
            '<tr><td>Overall:</td><td>{}/5 {}</td></tr>'
            '<tr><td>Communication:</td><td>{}/5 {}</td></tr>'
            '<tr><td>Technical:</td><td>{}/5 {}</td></tr>'
            '</table>',
            get_star_rating(obj.overall_rating),
            obj.overall_rating, get_star_rating(obj.overall_rating),
            obj.communication_rating or '—', get_star_rating(obj.communication_rating),
            obj.technical_quality_rating or '—', get_star_rating(obj.technical_quality_rating)
        )
    
    @admin.action(description='📥 Export All Feedback to CSV')
    def export_feedback_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="consultation_feedback.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'Consultation ID', 'Overall', 'Communication', 'Technical',
            'Would Recommend', 'Technical Issues', 'Comments', 'Anonymous', 'Date'
        ])
        for fb in queryset.select_related('consultation'):
            writer.writerow([
                str(fb.consultation.id)[:8],
                fb.overall_rating,
                fb.communication_rating or '',
                fb.technical_quality_rating or '',
                'Yes' if fb.would_recommend else 'No' if fb.would_recommend is False else '',
                'Yes' if fb.had_technical_issues else 'No',
                fb.comments[:100] if fb.comments else '',
                'Yes' if fb.is_anonymous else 'No',
                fb.created_at.strftime('%Y-%m-%d'),
            ])
        return response
    
    @admin.action(description='📥 Export Feedback with Technical Issues')
    def export_with_issues(self, request, queryset):
        issues_only = queryset.filter(had_technical_issues=True)
        return self.export_feedback_csv(request, issues_only)