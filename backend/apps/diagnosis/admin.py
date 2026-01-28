"""
Diagnosis App - Admin Configuration
=====================================
Admin interface for managing symptoms, diseases, and viewing diagnosis sessions.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count, Avg
from .models import (
    Symptom, 
    Disease, 
    DiseaseSymptomMapping,
    DiagnosisSession,
    MLModelMetadata,
    SymptomSynonym
)


@admin.register(Symptom)
class SymptomAdmin(admin.ModelAdmin):
    """Admin for Symptom model."""
    
    list_display = [
        'name_english', 
        'code', 
        'category', 
        'severity_weight_display',
        'has_translations',
        'is_active'
    ]
    list_filter = ['category', 'severity_weight', 'is_active']
    search_fields = ['name_english', 'name_telugu', 'name_hindi', 'code']
    ordering = ['name_english']
    
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
    
    def severity_weight_display(self, obj):
        """Display severity with color coding."""
        colors = {
            1: 'green', 2: 'green', 3: 'orange', 
            4: 'orange', 5: 'red', 6: 'red', 7: 'darkred'
        }
        color = colors.get(obj.severity_weight, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.severity_weight
        )
    severity_weight_display.short_description = 'Severity'
    
    def has_translations(self, obj):
        """Check if translations exist."""
        has_te = bool(obj.name_telugu)
        has_hi = bool(obj.name_hindi)
        if has_te and has_hi:
            return format_html('<span style="color: green;">✓ TE, HI</span>')
        elif has_te:
            return format_html('<span style="color: orange;">✓ TE only</span>')
        elif has_hi:
            return format_html('<span style="color: orange;">✓ HI only</span>')
        return format_html('<span style="color: red;">✗ None</span>')
    has_translations.short_description = 'Translations'


class DiseaseSymptomInline(admin.TabularInline):
    """Inline for disease-symptom mappings."""
    model = DiseaseSymptomMapping
    extra = 1
    autocomplete_fields = ['symptom']


@admin.register(Disease)
class DiseaseAdmin(admin.ModelAdmin):
    """Admin for Disease model."""
    
    list_display = [
        'name_english',
        'code',
        'typical_severity',
        'recommended_specialist',
        'requires_immediate_care',
        'symptom_count',
        'is_active'
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
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'typical_severity', 'recommended_specialist', 'is_active')
        }),
        ('Flags', {
            'fields': ('requires_immediate_care', 'is_contagious')
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
    
    def symptom_count(self, obj):
        """Show number of associated symptoms."""
        count = obj.symptom_mappings.count()
        return format_html('<span style="font-weight: bold;">{}</span>', count)
    symptom_count.short_description = 'Symptoms'
    
    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _symptom_count=Count('symptom_mappings')
        )


@admin.register(DiseaseSymptomMapping)
class DiseaseSymptomMappingAdmin(admin.ModelAdmin):
    """Admin for Disease-Symptom mappings."""
    
    list_display = ['disease', 'symptom', 'weight', 'is_primary']
    list_filter = ['is_primary', 'disease__typical_severity']
    search_fields = ['disease__name_english', 'symptom__name_english']
    autocomplete_fields = ['disease', 'symptom']


@admin.register(DiagnosisSession)
class DiagnosisSessionAdmin(admin.ModelAdmin):
    """Admin for Diagnosis Sessions."""
    
    list_display = [
        'session_id_short',
        'user',
        'input_type',
        'input_language',
        'severity_display',
        'top_prediction',
        'confidence_display',
        'user_feedback',
        'created_at'
    ]
    list_filter = [
        'input_type',
        'input_language',
        'severity_level',
        'user_feedback',
        'requires_emergency_care',
        'created_at'
    ]
    search_fields = ['session_id', 'raw_input', 'user__phone']
    readonly_fields = [
        'session_id', 'created_at', 'completed_at', 'processing_time_ms',
        'extracted_symptoms', 'predictions', 'extraction_confidence'
    ]
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
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
        ('Severity', {
            'fields': ('severity_level', 'severity_score', 'requires_emergency_care')
        }),
        ('Recommendations', {
            'fields': ('recommended_specialist', 'recommendations')
        }),
        ('Response', {
            'fields': ('response_text', 'response_language')
        }),
        ('Feedback', {
            'fields': ('user_feedback', 'feedback_comment', 'actual_disease')
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
    
    def session_id_short(self, obj):
        """Show shortened session ID."""
        return obj.session_id[:12] + '...'
    session_id_short.short_description = 'Session ID'
    
    def severity_display(self, obj):
        """Display severity with color."""
        colors = {
            'low': 'green',
            'medium': 'orange',
            'high': 'red',
            'critical': 'darkred'
        }
        color = colors.get(obj.severity_level, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.severity_level.upper()
        )
    severity_display.short_description = 'Severity'
    
    def confidence_display(self, obj):
        """Display confidence as percentage."""
        conf = obj.top_prediction_confidence * 100
        color = 'green' if conf >= 70 else 'orange' if conf >= 50 else 'red'
        return format_html(
            '<span style="color: {};">{:.1f}%</span>',
            color, conf
        )
    confidence_display.short_description = 'Confidence'


@admin.register(MLModelMetadata)
class MLModelMetadataAdmin(admin.ModelAdmin):
    """Admin for ML Model Metadata."""
    
    list_display = [
        'model_type',
        'version',
        'model_name',
        'accuracy_display',
        'f1_display',
        'training_samples',
        'is_active',
        'trained_at'
    ]
    list_filter = ['model_type', 'is_active']
    search_fields = ['model_name', 'version']
    ordering = ['-created_at']
    
    actions = ['activate_model']
    
    def accuracy_display(self, obj):
        """Display accuracy as percentage."""
        acc = obj.accuracy * 100
        color = 'green' if acc >= 85 else 'orange' if acc >= 70 else 'red'
        return format_html(
            '<span style="color: {};">{:.1f}%</span>',
            color, acc
        )
    accuracy_display.short_description = 'Accuracy'
    
    def f1_display(self, obj):
        """Display F1 score as percentage."""
        f1 = obj.f1_score * 100
        return format_html('{:.1f}%', f1)
    f1_display.short_description = 'F1 Score'
    
    def activate_model(self, request, queryset):
        """Activate selected model."""
        if queryset.count() != 1:
            self.message_user(request, "Please select exactly one model to activate.")
            return
        model = queryset.first()
        model.activate()
        self.message_user(request, f"Activated {model.model_type} v{model.version}")
    activate_model.short_description = "Activate selected model"


@admin.register(SymptomSynonym)
class SymptomSynonymAdmin(admin.ModelAdmin):
    """Admin for Symptom Synonyms."""
    
    list_display = ['symptom', 'phrase', 'language', 'is_common']
    list_filter = ['language', 'is_common']
    search_fields = ['phrase', 'symptom__name_english']
    autocomplete_fields = ['symptom']