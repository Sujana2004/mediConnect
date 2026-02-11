"""
Diagnosis App - Admin Configuration (Enhanced)
===============================================
Admin interface for managing symptoms, diseases, and viewing diagnosis sessions.
Optimized with visual indicators, performance improvements, and bulk actions.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Count, Avg, Q
from django.urls import reverse
from django.http import HttpResponse
import csv
from datetime import timedelta

from .models import (
    Symptom, 
    Disease, 
    DiseaseSymptomMapping,
    DiagnosisSession,
    MLModelMetadata,
    SymptomSynonym
)


# ============================================
# HELPER FUNCTIONS
# ============================================

def severity_badge(level):
    """Generate colored badge for severity levels."""
    colors = {
        'low': '#27ae60',
        'mild': '#27ae60',
        'medium': '#f39c12',
        'moderate': '#f39c12',
        'high': '#e74c3c',
        'severe': '#e74c3c',
        'critical': '#8e44ad',
    }
    color = colors.get(level.lower() if level else '', '#7f8c8d')
    return format_html(
        '<span style="background-color: {}; color: white; padding: 3px 10px; '
        'border-radius: 12px; font-size: 11px; font-weight: bold;">{}</span>',
        color, (level or 'Unknown').upper()
    )


def percentage_badge(value, thresholds=(70, 50)):
    """Generate colored percentage display."""
    high, medium = thresholds
    if value >= high:
        color = '#27ae60'
    elif value >= medium:
        color = '#f39c12'
    else:
        color = '#e74c3c'
    return format_html(
        '<span style="color: {}; font-weight: bold;">{:.1f}%</span>',
        color, value
    )


# ============================================
# CUSTOM FILTERS
# ============================================

class EmergencyCaseFilter(admin.SimpleListFilter):
    """Filter for emergency/urgent cases."""
    title = 'Urgency'
    parameter_name = 'urgency'
    
    def lookups(self, request, model_admin):
        return (
            ('emergency', '🚨 Emergency Care Required'),
            ('high_severity', '🔴 High/Critical Severity'),
            ('low_confidence', '⚠️ Low Confidence (<50%)'),
            ('recent_24h', '🕐 Last 24 Hours'),
        )
    
    def queryset(self, request, queryset):
        if self.value() == 'emergency':
            return queryset.filter(requires_emergency_care=True)
        if self.value() == 'high_severity':
            return queryset.filter(severity_level__in=['high', 'critical'])
        if self.value() == 'low_confidence':
            return queryset.filter(top_prediction_confidence__lt=0.5)
        if self.value() == 'recent_24h':
            return queryset.filter(created_at__gte=timezone.now() - timedelta(hours=24))


class TranslationStatusFilter(admin.SimpleListFilter):
    """Filter symptoms by translation completeness."""
    title = 'Translation Status'
    parameter_name = 'translation'
    
    def lookups(self, request, model_admin):
        return (
            ('complete', '✅ All Languages'),
            ('partial', '🟡 Partial'),
            ('english_only', '🔴 English Only'),
        )
    
    def queryset(self, request, queryset):
        if self.value() == 'complete':
            return queryset.exclude(Q(name_telugu='') | Q(name_telugu__isnull=True)).exclude(Q(name_hindi='') | Q(name_hindi__isnull=True))
        if self.value() == 'partial':
            return queryset.filter(
                (Q(name_telugu__isnull=False) & ~Q(name_telugu='')) | 
                (Q(name_hindi__isnull=False) & ~Q(name_hindi=''))
            ).filter(
                Q(name_telugu='') | Q(name_telugu__isnull=True) | 
                Q(name_hindi='') | Q(name_hindi__isnull=True)
            )
        if self.value() == 'english_only':
            return queryset.filter(
                (Q(name_telugu='') | Q(name_telugu__isnull=True)) & 
                (Q(name_hindi='') | Q(name_hindi__isnull=True))
            )


# ============================================
# INLINE ADMINS
# ============================================

class DiseaseSymptomInline(admin.TabularInline):
    """Inline for disease-symptom mappings."""
    model = DiseaseSymptomMapping
    extra = 1
    autocomplete_fields = ['symptom']
    fields = ['symptom', 'weight', 'is_primary']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('symptom')


class SymptomSynonymInline(admin.TabularInline):
    """Inline for symptom synonyms."""
    model = SymptomSynonym
    extra = 1
    fields = ['phrase', 'language', 'is_common']


# ============================================
# MAIN ADMIN CLASSES
# ============================================

@admin.register(Symptom)
class SymptomAdmin(admin.ModelAdmin):
    """Admin for Symptom model with enhanced features."""
    
    list_display = [
        'name_english', 
        'code', 
        'category_badge',
        'severity_weight_display',
        'translation_status',
        'synonym_count',
        'disease_count',
        'active_badge'
    ]
    list_filter = [TranslationStatusFilter, 'category', 'severity_weight', 'is_active']
    search_fields = ['name_english', 'name_telugu', 'name_hindi', 'code', 'keywords_english']
    ordering = ['name_english']
    list_per_page = 30
    inlines = [SymptomSynonymInline]
    actions = ['activate_symptoms', 'deactivate_symptoms', 'export_symptoms_csv']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'category', 'severity_weight', 'is_active')
        }),
        ('English', {
            'fields': ('name_english', 'description', 'keywords_english')
        }),
        ('Telugu (తెలుగు)', {
            'fields': ('name_telugu', 'description_telugu', 'keywords_telugu'),
            'classes': ('collapse',)
        }),
        ('Hindi (हिंदी)', {
            'fields': ('name_hindi', 'description_hindi', 'keywords_hindi'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _synonym_count=Count('synonyms', distinct=True),
            _disease_count=Count('disease_mappings', distinct=True)
        )
    
    @admin.display(description='Category')
    def category_badge(self, obj):
        category_colors = {
            'general': '#3498db',
            'respiratory': '#1abc9c',
            'digestive': '#f39c12',
            'neurological': '#9b59b6',
            'cardiovascular': '#e74c3c',
            'skin': '#e67e22',
            'musculoskeletal': '#2ecc71',
        }
        color = category_colors.get(obj.category.lower() if obj.category else '', '#7f8c8d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 8px; font-size: 10px;">{}</span>',
            color, obj.category or 'N/A'
        )
    
    @admin.display(description='Severity')
    def severity_weight_display(self, obj):
        """Display severity with color coding."""
        colors = {
            1: '#27ae60', 2: '#2ecc71', 3: '#f1c40f', 
            4: '#f39c12', 5: '#e67e22', 6: '#e74c3c', 7: '#c0392b'
        }
        color = colors.get(obj.severity_weight, '#7f8c8d')
        bars = '█' * obj.severity_weight + '░' * (7 - obj.severity_weight)
        return format_html(
            '<span style="color: {}; font-family: monospace;" title="Severity: {}/7">{}</span>',
            color, obj.severity_weight, bars
        )
    
    @admin.display(description='Translations')
    def translation_status(self, obj):
        """Check if translations exist."""
        has_te = bool(obj.name_telugu)
        has_hi = bool(obj.name_hindi)
        if has_te and has_hi:
            return format_html('<span style="color: #27ae60;">✓ TE ✓ HI</span>')
        elif has_te:
            return format_html('<span style="color: #f39c12;">✓ TE ✗ HI</span>')
        elif has_hi:
            return format_html('<span style="color: #f39c12;">✗ TE ✓ HI</span>')
        return format_html('<span style="color: #e74c3c;">✗ TE ✗ HI</span>')
    
    @admin.display(description='Synonyms')
    def synonym_count(self, obj):
        count = getattr(obj, '_synonym_count', 0)
        color = '#27ae60' if count >= 3 else '#f39c12' if count >= 1 else '#e74c3c'
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, count)
    
    @admin.display(description='Diseases')
    def disease_count(self, obj):
        count = getattr(obj, '_disease_count', 0)
        return format_html('<strong>{}</strong>', count)
    
    @admin.display(description='Active')
    def active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color: #27ae60;">● Active</span>')
        return format_html('<span style="color: #e74c3c;">○ Inactive</span>')
    
    @admin.action(description='✅ Activate selected symptoms')
    def activate_symptoms(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} symptoms activated.')
    
    @admin.action(description='❌ Deactivate selected symptoms')
    def deactivate_symptoms(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} symptoms deactivated.')
    
    @admin.action(description='📥 Export to CSV')
    def export_symptoms_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="symptoms_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Code', 'Name (EN)', 'Name (TE)', 'Name (HI)', 'Category', 'Severity', 'Active'])
        
        for symptom in queryset:
            writer.writerow([
                symptom.code,
                symptom.name_english,
                symptom.name_telugu or '',
                symptom.name_hindi or '',
                symptom.category,
                symptom.severity_weight,
                symptom.is_active
            ])
        
        return response


@admin.register(Disease)
class DiseaseAdmin(admin.ModelAdmin):
    """Admin for Disease model with enhanced features."""
    
    list_display = [
        'name_english',
        'code',
        'severity_badge_display',
        'specialist_display',
        'emergency_badge',
        'contagious_badge',
        'symptom_count',
        'translation_status',
        'active_badge'
    ]
    list_filter = [
        'typical_severity', 
        'recommended_specialist', 
        'requires_immediate_care',
        'is_contagious',
        'is_active'
    ]
    search_fields = ['name_english', 'name_telugu', 'name_hindi', 'code']
    ordering = ['name_english']
    inlines = [DiseaseSymptomInline]
    list_per_page = 30
    actions = ['activate_diseases', 'deactivate_diseases', 'export_diseases_csv']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'typical_severity', 'recommended_specialist', 'is_active')
        }),
        ('⚠️ Alert Flags', {
            'fields': ('requires_immediate_care', 'is_contagious'),
            'description': 'These flags trigger special alerts in the app.'
        }),
        ('English', {
            'fields': ('name_english', 'description')
        }),
        ('Precautions (English)', {
            'fields': ('precaution_1', 'precaution_2', 'precaution_3', 'precaution_4')
        }),
        ('Telugu (తెలుగు)', {
            'fields': ('name_telugu', 'description_telugu'),
            'classes': ('collapse',)
        }),
        ('Telugu Precautions', {
            'fields': (
                'precaution_1_telugu', 'precaution_2_telugu', 
                'precaution_3_telugu', 'precaution_4_telugu'
            ),
            'classes': ('collapse',)
        }),
        ('Hindi (हिंदी)', {
            'fields': ('name_hindi', 'description_hindi'),
            'classes': ('collapse',)
        }),
        ('Hindi Precautions', {
            'fields': (
                'precaution_1_hindi', 'precaution_2_hindi', 
                'precaution_3_hindi', 'precaution_4_hindi'
            ),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _symptom_count=Count('symptom_mappings')
        )
    
    @admin.display(description='Severity')
    def severity_badge_display(self, obj):
        return severity_badge(obj.typical_severity)
    
    @admin.display(description='Specialist')
    def specialist_display(self, obj):
        return obj.recommended_specialist or '-'
    
    @admin.display(description='🚨')
    def emergency_badge(self, obj):
        if obj.requires_immediate_care:
            return format_html('<span title="Requires Immediate Care" style="color: #e74c3c; font-size: 16px;">🚨</span>')
        return format_html('<span style="color: #bdc3c7;">-</span>')
    
    @admin.display(description='🦠')
    def contagious_badge(self, obj):
        if obj.is_contagious:
            return format_html('<span title="Contagious" style="color: #e67e22; font-size: 16px;">🦠</span>')
        return format_html('<span style="color: #bdc3c7;">-</span>')
    
    @admin.display(description='Symptoms')
    def symptom_count(self, obj):
        count = getattr(obj, '_symptom_count', 0)
        return format_html('<span style="font-weight: bold;">{}</span>', count)
    
    @admin.display(description='Translations')
    def translation_status(self, obj):
        has_te = bool(obj.name_telugu)
        has_hi = bool(obj.name_hindi)
        if has_te and has_hi:
            return format_html('<span style="color: #27ae60;">✓ Both</span>')
        elif has_te or has_hi:
            return format_html('<span style="color: #f39c12;">Partial</span>')
        return format_html('<span style="color: #e74c3c;">✗ None</span>')
    
    @admin.display(description='Active')
    def active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color: #27ae60;">● Active</span>')
        return format_html('<span style="color: #e74c3c;">○ Inactive</span>')
    
    @admin.action(description='✅ Activate selected diseases')
    def activate_diseases(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} diseases activated.')
    
    @admin.action(description='❌ Deactivate selected diseases')
    def deactivate_diseases(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} diseases deactivated.')
    
    @admin.action(description='📥 Export to CSV')
    def export_diseases_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="diseases_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Code', 'Name (EN)', 'Severity', 'Specialist', 'Emergency', 'Contagious'])
        
        for disease in queryset:
            writer.writerow([
                disease.code,
                disease.name_english,
                disease.typical_severity,
                disease.recommended_specialist,
                disease.requires_immediate_care,
                disease.is_contagious
            ])
        
        return response


@admin.register(DiseaseSymptomMapping)
class DiseaseSymptomMappingAdmin(admin.ModelAdmin):
    """Admin for Disease-Symptom mappings."""
    
    list_display = ['disease_link', 'symptom_link', 'weight_display', 'primary_badge']
    list_filter = ['is_primary', 'disease__typical_severity', 'weight']
    search_fields = ['disease__name_english', 'symptom__name_english']
    autocomplete_fields = ['disease', 'symptom']
    list_select_related = ['disease', 'symptom']
    list_per_page = 50
    
    @admin.display(description='Disease')
    def disease_link(self, obj):
        url = reverse('admin:diagnosis_disease_change', args=[obj.disease.pk])
        return format_html('<a href="{}">{}</a>', url, obj.disease.name_english)
    
    @admin.display(description='Symptom')
    def symptom_link(self, obj):
        url = reverse('admin:diagnosis_symptom_change', args=[obj.symptom.pk])
        return format_html('<a href="{}">{}</a>', url, obj.symptom.name_english)
    
    @admin.display(description='Weight')
    def weight_display(self, obj):
        # Convert float (0.0-1.0) to int (0-5) for display
        weight_int = int(round(obj.weight * 5))
        bars = '●' * weight_int + '○' * (5 - weight_int)
        percentage = f"{obj.weight * 100:.0f}%"
        return format_html('<span style="color: #3498db; font-family: monospace;">{} ({})</span>', bars, percentage)
        
    @admin.display(description='Primary')
    def primary_badge(self, obj):
        if obj.is_primary:
            return format_html('<span style="background-color: #27ae60; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px;">PRIMARY</span>')
        return format_html('<span style="color: #bdc3c7;">Secondary</span>')


@admin.register(DiagnosisSession)
class DiagnosisSessionAdmin(admin.ModelAdmin):
    """Admin for Diagnosis Sessions with enhanced monitoring."""
    
    list_display = [
        'session_id_short',
        'user_link',
        'input_language_badge',
        'severity_badge_display',
        'top_prediction_display',
        'confidence_badge',
        'emergency_indicator',
        'feedback_badge',
        'created_at'
    ]
    list_filter = [
        EmergencyCaseFilter,
        'severity_level',
        'input_language',
        'input_type',
        'user_feedback',
        'requires_emergency_care',
        'created_at'
    ]
    search_fields = ['session_id', 'raw_input', 'user__phone', 'top_prediction']
    readonly_fields = [
        'session_id', 'created_at', 'completed_at', 'processing_time_ms',
        'extracted_symptoms', 'predictions', 'extraction_confidence'
    ]
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    list_select_related = ['user']
    list_per_page = 30
    actions = ['export_sessions_csv', 'export_for_ml_training']
    
    fieldsets = (
        ('Session Info', {
            'fields': ('session_id', 'user', 'input_type', 'input_language')
        }),
        ('Input', {
            'fields': ('raw_input', 'translated_input')
        }),
        ('Patient Info', {
            'fields': ('patient_age', 'patient_gender', 'symptom_duration_days')
        }),
        ('Analysis Results', {
            'fields': (
                'extracted_symptoms', 'extraction_confidence',
                'predictions', 'top_prediction', 'top_prediction_confidence'
            )
        }),
        ('⚠️ Severity Assessment', {
            'fields': ('severity_level', 'severity_score', 'requires_emergency_care'),
            'description': 'Review severity for emergency cases.'
        }),
        ('Recommendations', {
            'fields': ('recommended_specialist', 'recommendations')
        }),
        ('Response', {
            'fields': ('response_text', 'response_language')
        }),
        ('📊 User Feedback (for ML improvement)', {
            'fields': ('user_feedback', 'feedback_comment', 'actual_disease'),
            'description': 'Feedback used to improve ML model accuracy.'
        }),
        ('Technical', {
            'fields': ('processing_time_ms', 'device_type', 'app_version'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Session')
    def session_id_short(self, obj):
        return format_html(
            '<code style="background: #f8f9fa; padding: 2px 6px; border-radius: 4px;">{}</code>',
            obj.session_id[:10] + '...'
        )
    
    @admin.display(description='User')
    def user_link(self, obj):
        if obj.user:
            url = reverse('admin:users_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.phone)
        return format_html('<span style="color: #bdc3c7;">Anonymous</span>')
    
    @admin.display(description='Lang')
    def input_language_badge(self, obj):
        lang_map = {
            'en': ('🇺🇸', '#3498db'),
            'hi': ('🇮🇳', '#f39c12'),
            'te': ('🇮🇳', '#27ae60'),
        }
        emoji, color = lang_map.get(obj.input_language, ('🌐', '#7f8c8d'))
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 6px; '
            'border-radius: 8px; font-size: 10px;">{} {}</span>',
            color, emoji, obj.input_language.upper()
        )
    
    @admin.display(description='Severity')
    def severity_badge_display(self, obj):
        return severity_badge(obj.severity_level)
    
    @admin.display(description='Prediction')
    def top_prediction_display(self, obj):
        if obj.top_prediction:
            return format_html(
                '<span style="font-weight: bold;">{}</span>',
                obj.top_prediction[:25] + ('...' if len(obj.top_prediction) > 25 else '')
            )
        return '-'
    
    @admin.display(description='Confidence')
    def confidence_badge(self, obj):
        if obj.top_prediction_confidence:
            return percentage_badge(obj.top_prediction_confidence * 100)
        return '-'
    
    @admin.display(description='🚨')
    def emergency_indicator(self, obj):
        if obj.requires_emergency_care:
            return format_html(
                '<span title="Emergency Care Required" style="background-color: #e74c3c; '
                'color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px; '
                'animation: pulse 1s infinite;">🚨 EMERGENCY</span>'
            )
        return ''
    
    @admin.display(description='Feedback')
    def feedback_badge(self, obj):
        if obj.user_feedback == 'accurate':
            return format_html('<span style="color: #27ae60;">👍 Accurate</span>')
        elif obj.user_feedback == 'inaccurate':
            return format_html('<span style="color: #e74c3c;">👎 Inaccurate</span>')
        elif obj.user_feedback == 'partially_accurate':
            return format_html('<span style="color: #f39c12;">🤔 Partial</span>')
        return format_html('<span style="color: #bdc3c7;">No Feedback</span>')
    
    @admin.action(description='📥 Export to CSV')
    def export_sessions_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="diagnosis_sessions.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Session ID', 'User Phone', 'Language', 'Raw Input',
            'Prediction', 'Confidence', 'Severity', 'Emergency', 'Feedback', 'Created'
        ])
        
        for session in queryset.select_related('user'):
            writer.writerow([
                session.session_id,
                session.user.phone if session.user else 'Anonymous',
                session.input_language,
                session.raw_input[:100],
                session.top_prediction,
                f'{session.top_prediction_confidence * 100:.1f}%' if session.top_prediction_confidence else '',
                session.severity_level,
                session.requires_emergency_care,
                session.user_feedback,
                session.created_at.strftime('%Y-%m-%d %H:%M')
            ])
        
        return response
    
    @admin.action(description='📊 Export for ML Training (with feedback)')
    def export_for_ml_training(self, request, queryset):
        """Export sessions with feedback for ML model retraining."""
        # Only export sessions with feedback
        sessions_with_feedback = queryset.filter(
            user_feedback__isnull=False
        ).exclude(user_feedback='')
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="ml_training_data.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Raw Input', 'Extracted Symptoms', 'Predicted Disease',
            'Actual Disease', 'Feedback', 'Was Correct'
        ])
        
        for session in sessions_with_feedback:
            writer.writerow([
                session.raw_input,
                session.extracted_symptoms,
                session.top_prediction,
                session.actual_disease or '',
                session.user_feedback,
                session.user_feedback == 'accurate'
            ])
        
        self.message_user(request, f'Exported {sessions_with_feedback.count()} sessions with feedback.')
        return response


@admin.register(MLModelMetadata)
class MLModelMetadataAdmin(admin.ModelAdmin):
    """Admin for ML Model Metadata with version management."""
    
    list_display = [
        'model_type_badge',
        'version',
        'model_name',
        'accuracy_display',
        'f1_display',
        'precision_display',
        'recall_display',
        'training_samples',
        'active_badge',
        'trained_at'
    ]
    list_filter = ['model_type', 'is_active']
    search_fields = ['model_name', 'version']
    ordering = ['-created_at']
    list_per_page = 20
    
    readonly_fields = ['created_at']
    actions = ['activate_model', 'compare_models']
    
    fieldsets = (
        ('Model Info', {
            'fields': ('model_name', 'model_type', 'version', 'is_active')
        }),
        ('Performance Metrics', {
            'fields': ('accuracy', 'f1_score', 'precision', 'recall'),
            'description': 'Higher values are better. Target: Accuracy > 85%, F1 > 80%'
        }),
        ('Training Details', {
            'fields': ('training_samples', 'hyperparameters', 'trained_at', 'training_duration_seconds')
        }),
        ('File Info', {
            'fields': ('model_file_path', 'notes', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Type')
    def model_type_badge(self, obj):
        colors = {
            'random_forest': '#27ae60',
            'neural_network': '#3498db',
            'ensemble': '#9b59b6',
            'severity': '#e67e22',
        }
        color = colors.get(obj.model_type, '#7f8c8d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px;">{}</span>',
            color, obj.model_type.replace('_', ' ').title()
        )
    
    @admin.display(description='Accuracy')
    def accuracy_display(self, obj):
        return percentage_badge(obj.accuracy * 100, thresholds=(85, 70))
    
    @admin.display(description='F1')
    def f1_display(self, obj):
        return percentage_badge(obj.f1_score * 100, thresholds=(80, 60))
    
    @admin.display(description='Precision')
    def precision_display(self, obj):
        if hasattr(obj, 'precision') and obj.precision:
            return percentage_badge(obj.precision * 100, thresholds=(80, 60))
        return '-'
    
    @admin.display(description='Recall')
    def recall_display(self, obj):
        if hasattr(obj, 'recall') and obj.recall:
            return percentage_badge(obj.recall * 100, thresholds=(80, 60))
        return '-'
    
    @admin.display(description='Active')
    def active_badge(self, obj):
        if obj.is_active:
            return format_html(
                '<span style="background-color: #27ae60; color: white; padding: 3px 10px; '
                'border-radius: 12px; font-size: 11px;">✓ ACTIVE</span>'
            )
        return format_html('<span style="color: #bdc3c7;">Inactive</span>')
    
    @admin.action(description='🔄 Activate selected model (deactivates others of same type)')
    def activate_model(self, request, queryset):
        if queryset.count() != 1:
            self.message_user(request, "⚠️ Please select exactly ONE model to activate.", level='warning')
            return
        
        model = queryset.first()
        
        # Deactivate other models of same type
        MLModelMetadata.objects.filter(model_type=model.model_type).update(is_active=False)
        
        # Activate selected
        model.is_active = True
        model.save()
        
        self.message_user(
            request, 
            f"✅ Activated {model.model_type} v{model.version}. Previous version deactivated."
        )
    
    @admin.action(description='📊 Compare selected models')
    def compare_models(self, request, queryset):
        if queryset.count() < 2:
            self.message_user(request, "⚠️ Select at least 2 models to compare.", level='warning')
            return
        
        comparison = []
        for model in queryset:
            comparison.append(
                f"{model.model_name} v{model.version}: "
                f"Accuracy={model.accuracy*100:.1f}%, F1={model.f1_score*100:.1f}%"
            )
        
        self.message_user(request, " | ".join(comparison))


@admin.register(SymptomSynonym)
class SymptomSynonymAdmin(admin.ModelAdmin):
    """Admin for Symptom Synonyms - helps with NLP matching."""
    
    list_display = ['symptom_link', 'phrase', 'language_badge', 'common_badge']
    list_filter = ['language', 'is_common', 'symptom__category']
    search_fields = ['phrase', 'symptom__name_english']
    autocomplete_fields = ['symptom']
    list_select_related = ['symptom']
    list_per_page = 50
    actions = ['mark_as_common', 'mark_as_uncommon']
    
    @admin.display(description='Symptom')
    def symptom_link(self, obj):
        url = reverse('admin:diagnosis_symptom_change', args=[obj.symptom.pk])
        return format_html('<a href="{}">{}</a>', url, obj.symptom.name_english)
    
    @admin.display(description='Language')
    def language_badge(self, obj):
        lang_colors = {'en': '#3498db', 'hi': '#f39c12', 'te': '#27ae60'}
        color = lang_colors.get(obj.language, '#7f8c8d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 8px; font-size: 10px;">{}</span>',
            color, obj.language.upper()
        )
    
    @admin.display(description='Common')
    def common_badge(self, obj):
        if obj.is_common:
            return format_html('<span style="color: #27ae60;">★ Common</span>')
        return format_html('<span style="color: #bdc3c7;">Rare</span>')
    
    @admin.action(description='⭐ Mark as common')
    def mark_as_common(self, request, queryset):
        queryset.update(is_common=True)
        self.message_user(request, f'{queryset.count()} synonyms marked as common.')
    
    @admin.action(description='Mark as uncommon')
    def mark_as_uncommon(self, request, queryset):
        queryset.update(is_common=False)
        self.message_user(request, f'{queryset.count()} synonyms marked as uncommon.')