"""
Health Records Admin Configuration
==================================
Admin interface for managing health records.
Enhanced with visual badges, performance optimization, and bulk actions.
"""

import csv
from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.http import HttpResponse
from django.urls import reverse
from django.db.models import Count

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


def get_user_link(user, prefix=''):
    """Generate clickable user link with phone."""
    if user:
        url = reverse('admin:users_user_change', args=[user.pk])
        display = f"{prefix}{user.first_name or ''} {user.last_name or ''}".strip()
        display = display if display != prefix else user.phone
        return format_html(
            '<a href="{}" title="Phone: {}">{}</a>',
            url, user.phone, display or user.phone
        )
    return '-'


# =============================================================================
# HEALTH PROFILE ADMIN
# =============================================================================

@admin.register(HealthProfile)
class HealthProfileAdmin(admin.ModelAdmin):
    """Admin for Health Profile with visual enhancements."""
    
    list_display = [
        'user_link', 'blood_group_badge', 'bmi_display',
        'allergy_count', 'condition_count', 'lifestyle_display',
        'emergency_contact_status', 'updated_at'
    ]
    list_filter = [
        'blood_group', 'smoking_status', 'alcohol_consumption',
        'created_at', 'updated_at'
    ]
    search_fields = ['user__phone', 'user__first_name', 'user__last_name']
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'bmi_calculated',
        'bmi_category_display', 'health_summary'
    ]
    list_select_related = ['user']
    list_per_page = 25
    
    actions = ['export_profiles_csv']
    
    fieldsets = (
        ('👤 User', {
            'fields': ('user', 'health_summary')
        }),
        ('🩸 Basic Health Info', {
            'fields': ('blood_group', 'height_cm', 'weight_kg', 'bmi_calculated', 'bmi_category_display')
        }),
        ('🏥 Medical Info', {
            'fields': ('allergies', 'chronic_conditions', 'current_medications')
        }),
        ('🚬 Lifestyle', {
            'fields': ('smoking_status', 'alcohol_consumption')
        }),
        ('👨‍👩‍👧 Family History', {
            'fields': ('family_history',),
            'classes': ('collapse',)
        }),
        ('🆘 Emergency Contact', {
            'fields': ('emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation')
        }),
        ('📝 Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('⏰ Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Patient')
    def user_link(self, obj):
        return get_user_link(obj.user, '🧑 ')
    
    @admin.display(description='Blood Group')
    def blood_group_badge(self, obj):
        colors = {
            'A+': '#e74c3c', 'A-': '#c0392b',
            'B+': '#3498db', 'B-': '#2980b9',
            'AB+': '#9b59b6', 'AB-': '#8e44ad',
            'O+': '#27ae60', 'O-': '#229954',
            'unknown': '#95a5a6',
        }
        color = colors.get(obj.blood_group, '#95a5a6')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 12px; '
            'border-radius: 4px; font-weight: bold; font-size: 12px;">{}</span>',
            color, obj.blood_group
        )
    
    @admin.display(description='BMI')
    def bmi_display(self, obj):
        bmi = obj.get_bmi()
        if not bmi:
            return format_html('<span style="color: #ccc;">—</span>')
        
        category = obj.get_bmi_category()
        colors = {
            'Underweight': '#3498db',
            'Normal': '#27ae60',
            'Overweight': '#f39c12',
            'Obese': '#e74c3c',
        }
        color = colors.get(category, '#95a5a6')
        
        # Pre-format the BMI value before passing to format_html
        bmi_formatted = f"{bmi:.1f}"
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>'
            '<br><small style="color: {};">{}</small>',
            color, bmi_formatted, color, category
        )
    
    @admin.display(description='BMI Value')
    def bmi_calculated(self, obj):
        bmi = obj.get_bmi()
        if bmi:
            category = obj.get_bmi_category()
            colors = {
                'Underweight': '#3498db',
                'Normal': '#27ae60',
                'Overweight': '#f39c12',
                'Obese': '#e74c3c',
            }
            color = colors.get(category, '#95a5a6')
            # Pre-format the BMI value
            bmi_formatted = f"{bmi:.1f}"
            return format_html(
                '<div style="font-size: 24px; color: {}; font-weight: bold;">{}</div>'
                '<div style="color: {};">{}</div>',
                color, bmi_formatted, color, category
            )
        return "Height/Weight not provided"
    
    @admin.display(description='BMI Category')
    def bmi_category_display(self, obj):
        return obj.get_bmi_category()
    
    @admin.display(description='Allergies')
    def allergy_count(self, obj):
        count = len(obj.allergies) if obj.allergies else 0
        if count > 0:
            return format_html(
                '<span style="background: #e74c3c; color: white; padding: 2px 8px; '
                'border-radius: 10px;">⚠️ {}</span>',
                count
            )
        return format_html('<span style="color: #27ae60;">✓ None</span>')
    
    @admin.display(description='Chronic')
    def condition_count(self, obj):
        count = len(obj.chronic_conditions) if obj.chronic_conditions else 0
        if count > 0:
            return format_html(
                '<span style="background: #f39c12; color: white; padding: 2px 8px; '
                'border-radius: 10px;">🏥 {}</span>',
                count
            )
        return format_html('<span style="color: #27ae60;">✓ None</span>')
    
    @admin.display(description='Lifestyle')
    def lifestyle_display(self, obj):
        smoking_icons = {
            'never': '🚭',
            'former': '🚬⃠',
            'current': '🚬',
            'unknown': '❓',
        }
        alcohol_icons = {
            'never': '🚫🍺',
            'occasional': '🍺',
            'regular': '🍺🍺',
            'former': '🍺⃠',
            'unknown': '❓',
        }
        smoking = smoking_icons.get(obj.smoking_status, '❓')
        alcohol = alcohol_icons.get(obj.alcohol_consumption, '❓')
        return format_html('{} {}', smoking, alcohol)
    
    @admin.display(description='Emergency')
    def emergency_contact_status(self, obj):
        if obj.emergency_contact_phone:
            return format_html(
                '<span style="color: #27ae60;" title="{} ({})">✅ Set</span>',
                obj.emergency_contact_name, obj.emergency_contact_phone
            )
        return format_html('<span style="color: #e74c3c;">❌ Not Set</span>')
    
    @admin.display(description='Health Summary')
    def health_summary(self, obj):
        allergies = obj.allergies or []
        conditions = obj.chronic_conditions or []
        medications = obj.current_medications or []
        
        html = '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">'
        
        # Allergies
        html += '<div style="background: #fadbd8; padding: 10px; border-radius: 8px;">'
        html += '<strong>⚠️ Allergies ({})</strong><br>'.format(len(allergies))
        if allergies:
            html += ', '.join(str(a) for a in allergies[:5])
            if len(allergies) > 5:
                html += f' +{len(allergies) - 5} more'
        else:
            html += '<em>None recorded</em>'
        html += '</div>'
        
        # Conditions
        html += '<div style="background: #fcf3cf; padding: 10px; border-radius: 8px;">'
        html += '<strong>🏥 Chronic Conditions ({})</strong><br>'.format(len(conditions))
        if conditions:
            html += ', '.join(str(c) for c in conditions[:5])
            if len(conditions) > 5:
                html += f' +{len(conditions) - 5} more'
        else:
            html += '<em>None recorded</em>'
        html += '</div>'
        
        # Medications
        html += '<div style="background: #d5f5e3; padding: 10px; border-radius: 8px;">'
        html += '<strong>💊 Current Medications ({})</strong><br>'.format(len(medications))
        if medications:
            html += ', '.join(str(m) for m in medications[:5])
            if len(medications) > 5:
                html += f' +{len(medications) - 5} more'
        else:
            html += '<em>None recorded</em>'
        html += '</div>'
        
        html += '</div>'
        return format_html(html)
    
    @admin.action(description='📥 Export Profiles to CSV')
    def export_profiles_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="health_profiles.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'Phone', 'Blood Group', 'Height (cm)', 'Weight (kg)', 'BMI',
            'BMI Category', 'Allergies Count', 'Conditions Count',
            'Smoking', 'Alcohol', 'Emergency Contact'
        ])
        for p in queryset.select_related('user'):
            writer.writerow([
                p.user.phone,
                p.blood_group,
                p.height_cm or '',
                p.weight_kg or '',
                p.get_bmi() or '',
                p.get_bmi_category(),
                len(p.allergies) if p.allergies else 0,
                len(p.chronic_conditions) if p.chronic_conditions else 0,
                p.get_smoking_status_display(),
                p.get_alcohol_consumption_display(),
                p.emergency_contact_phone or 'Not Set',
            ])
        return response


# =============================================================================
# MEDICAL CONDITION ADMIN
# =============================================================================

@admin.register(MedicalCondition)
class MedicalConditionAdmin(admin.ModelAdmin):
    """Admin for Medical Conditions with visual enhancements."""
    
    list_display = [
        'condition_name', 'user_link', 'status_badge', 'severity_badge',
        'chronic_badge', 'diagnosed_date', 'doctor_link', 'has_links'
    ]
    list_filter = ['status', 'severity', 'is_chronic', 'diagnosed_date']
    search_fields = [
        'condition_name', 'condition_name_local',
        'user__phone', 'user__first_name', 'icd_code'
    ]
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'diagnosed_date'
    list_select_related = ['user', 'diagnosed_by', 'diagnosis_session', 'consultation']
    list_per_page = 25
    
    actions = ['mark_resolved', 'mark_active', 'export_conditions_csv']
    
    fieldsets = (
        ('🏥 Condition Info', {
            'fields': ('user', 'condition_name', 'condition_name_local', 'icd_code')
        }),
        ('📊 Status', {
            'fields': ('status', 'severity', 'is_chronic')
        }),
        ('📅 Dates', {
            'fields': ('diagnosed_date', 'resolved_date')
        }),
        ('👨‍⚕️ Doctor', {
            'fields': ('diagnosed_by',)
        }),
        ('🔗 Links', {
            'fields': ('diagnosis_session', 'consultation'),
            'classes': ('collapse',)
        }),
        ('📝 Notes', {
            'fields': ('treatment_notes',)
        }),
        ('⏰ Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Patient')
    def user_link(self, obj):
        return get_user_link(obj.user, '🧑 ')
    
    @admin.display(description='Status')
    def status_badge(self, obj):
        colors = {
            'active': '#e74c3c',
            'resolved': '#27ae60',
            'managed': '#3498db',
            'recurring': '#f39c12',
        }
        icons = {
            'active': '🔴',
            'resolved': '✅',
            'managed': '💊',
            'recurring': '🔄',
        }
        color = colors.get(obj.status, '#95a5a6')
        icon = icons.get(obj.status, '')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px; font-weight: bold;">'
            '{} {}</span>',
            color, icon, obj.get_status_display()
        )
    
    @admin.display(description='Severity')
    def severity_badge(self, obj):
        colors = {
            'mild': '#27ae60',
            'moderate': '#f39c12',
            'severe': '#e74c3c',
        }
        color = colors.get(obj.severity, '#95a5a6')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px;">{}</span>',
            color, obj.get_severity_display()
        )
    
    @admin.display(description='Chronic')
    def chronic_badge(self, obj):
        if obj.is_chronic:
            return format_html(
                '<span style="background: #9b59b6; color: white; padding: 2px 8px; '
                'border-radius: 10px;">♾️ Chronic</span>'
            )
        return format_html('<span style="color: #ccc;">—</span>')
    
    @admin.display(description='Doctor')
    def doctor_link(self, obj):
        return get_user_link(obj.diagnosed_by, '👨‍⚕️ Dr. ')
    
    @admin.display(description='Links')
    def has_links(self, obj):
        links = []
        if obj.diagnosis_session:
            links.append('🔬 Diagnosis')
        if obj.consultation:
            links.append('📹 Consultation')
        if links:
            return format_html(' '.join(links))
        return format_html('<span style="color: #ccc;">—</span>')
    
    @admin.action(description='✅ Mark as Resolved')
    def mark_resolved(self, request, queryset):
        updated = queryset.update(
            status='resolved',
            resolved_date=timezone.now().date()
        )
        self.message_user(request, f"✅ {updated} conditions marked as resolved.")
    
    @admin.action(description='🔴 Mark as Active')
    def mark_active(self, request, queryset):
        updated = queryset.update(status='active', resolved_date=None)
        self.message_user(request, f"🔴 {updated} conditions marked as active.")
    
    @admin.action(description='📥 Export to CSV')
    def export_conditions_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="medical_conditions.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'Patient Phone', 'Condition', 'ICD Code', 'Status',
            'Severity', 'Chronic', 'Diagnosed Date', 'Resolved Date'
        ])
        for c in queryset.select_related('user'):
            writer.writerow([
                c.user.phone,
                c.condition_name,
                c.icd_code or '',
                c.get_status_display(),
                c.get_severity_display(),
                'Yes' if c.is_chronic else 'No',
                c.diagnosed_date or '',
                c.resolved_date or '',
            ])
        return response


# =============================================================================
# MEDICAL DOCUMENT ADMIN
# =============================================================================

@admin.register(MedicalDocument)
class MedicalDocumentAdmin(admin.ModelAdmin):
    """Admin for Medical Documents with file handling."""
    
    list_display = [
        'title_display', 'user_link', 'type_badge', 'file_info',
        'document_date', 'source_display', 'sharing_status', 'created_at'
    ]
    list_filter = [
        'document_type', 'storage_type', 'is_shared_with_doctors',
        'created_at', 'document_date'
    ]
    search_fields = ['title', 'description', 'user__phone', 'hospital_name', 'doctor_name']
    readonly_fields = [
        'id', 'file_size', 'file_type', 'content_type', 'storage_type',
        'created_at', 'updated_at', 'file_preview'
    ]
    date_hierarchy = 'document_date'
    list_select_related = ['user', 'consultation', 'medical_condition']
    list_per_page = 25
    
    actions = ['enable_sharing', 'disable_sharing', 'export_documents_csv']
    
    fieldsets = (
        ('📄 Document Info', {
            'fields': ('user', 'document_type', 'title', 'description')
        }),
        ('📁 File', {
            'fields': ('file_path', 'original_filename', 'file_size', 'file_type', 'content_type', 'storage_type', 'file_preview')
        }),
        ('📋 Metadata', {
            'fields': ('document_date', 'hospital_name', 'doctor_name', 'tags')
        }),
        ('🔗 Links', {
            'fields': ('consultation', 'medical_condition'),
            'classes': ('collapse',)
        }),
        ('🔒 Sharing', {
            'fields': ('is_shared_with_doctors',)
        }),
        ('⏰ Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Title')
    def title_display(self, obj):
        icons = {
            'prescription': '💊',
            'lab_report': '🔬',
            'xray': '🩻',
            'mri': '🧠',
            'ct_scan': '🔄',
            'ultrasound': '📡',
            'ecg': '💓',
            'blood_report': '🩸',
            'urine_report': '🧪',
            'discharge_summary': '🏥',
            'medical_certificate': '📜',
            'insurance': '🛡️',
            'vaccination': '💉',
            'other': '📄',
        }
        icon = icons.get(obj.document_type, '📄')
        title = obj.title[:30] + '...' if len(obj.title) > 30 else obj.title
        return format_html('{} {}', icon, title)
    
    @admin.display(description='Patient')
    def user_link(self, obj):
        return get_user_link(obj.user, '🧑 ')
    
    @admin.display(description='Type')
    def type_badge(self, obj):
        colors = {
            'prescription': '#3498db',
            'lab_report': '#9b59b6',
            'xray': '#e67e22',
            'mri': '#1abc9c',
            'ct_scan': '#f39c12',
            'ultrasound': '#2ecc71',
            'ecg': '#e74c3c',
            'blood_report': '#c0392b',
            'urine_report': '#f1c40f',
            'discharge_summary': '#34495e',
            'medical_certificate': '#27ae60',
            'insurance': '#7f8c8d',
            'vaccination': '#16a085',
            'other': '#95a5a6',
        }
        color = colors.get(obj.document_type, '#95a5a6')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 10px; font-size: 10px;">{}</span>',
            color, obj.get_document_type_display()
        )
    
    @admin.display(description='File')
    def file_info(self, obj):
        if obj.file_path:
            ext = obj.file_type.upper() if obj.file_type else 'FILE'
            size = obj.file_size_display
            storage_icon = '☁️' if obj.storage_type == 'supabase' else '💾'
            return format_html(
                '<span style="background: #ecf0f1; padding: 2px 8px; border-radius: 4px;">'
                '{} {} | {}</span> {}',
                ext, size, storage_icon, '✓' if obj.has_file else ''
            )
        return format_html('<span style="color: #e74c3c;">❌ No File</span>')
    
    @admin.display(description='Source')
    def source_display(self, obj):
        if obj.hospital_name or obj.doctor_name:
            hospital = obj.hospital_name or 'Unknown'
            doctor = f"Dr. {obj.doctor_name}" if obj.doctor_name else ''
            return format_html(
                '🏥 {}<br><small>{}</small>',
                hospital[:20], doctor[:25]
            )
        return format_html('<span style="color: #ccc;">—</span>')
    
    @admin.display(description='Sharing')
    def sharing_status(self, obj):
        if obj.is_shared_with_doctors:
            return format_html('<span style="color: #27ae60;">👁️ Shared</span>')
        return format_html('<span style="color: #e74c3c;">🔒 Private</span>')
    
    @admin.display(description='Preview')
    def file_preview(self, obj):
        if obj.file_path:
            url = obj.get_file_url()
            if url:
                return format_html(
                    '<a href="{}" target="_blank" class="button">📥 Download/View</a>',
                    url
                )
        return "No file uploaded"
    
    @admin.action(description='👁️ Enable Sharing with Doctors')
    def enable_sharing(self, request, queryset):
        updated = queryset.update(is_shared_with_doctors=True)
        self.message_user(request, f"👁️ {updated} documents now shared with doctors.")
    
    @admin.action(description='🔒 Disable Sharing')
    def disable_sharing(self, request, queryset):
        updated = queryset.update(is_shared_with_doctors=False)
        self.message_user(request, f"🔒 {updated} documents set to private.")
    
    @admin.action(description='📥 Export to CSV')
    def export_documents_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="medical_documents.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'Patient Phone', 'Title', 'Type', 'Date', 'Hospital',
            'Doctor', 'File Size', 'Shared', 'Created'
        ])
        for d in queryset.select_related('user'):
            writer.writerow([
                d.user.phone,
                d.title,
                d.get_document_type_display(),
                d.document_date or '',
                d.hospital_name or '',
                d.doctor_name or '',
                d.file_size_display,
                'Yes' if d.is_shared_with_doctors else 'No',
                d.created_at.strftime('%Y-%m-%d'),
            ])
        return response


# =============================================================================
# LAB REPORT ADMIN
# =============================================================================

@admin.register(LabReport)
class LabReportAdmin(admin.ModelAdmin):
    """Admin for Lab Reports with result visualization."""
    
    list_display = [
        'report_name', 'user_link', 'type_badge', 'test_date',
        'status_badge', 'abnormal_display', 'lab_info', 'has_document'
    ]
    list_filter = ['lab_type', 'overall_status', 'test_date']
    search_fields = ['report_name', 'user__phone', 'lab_name', 'doctor_name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'results_display']
    date_hierarchy = 'test_date'
    list_select_related = ['user', 'document', 'consultation']
    list_per_page = 25
    
    actions = ['mark_normal', 'mark_abnormal', 'export_reports_csv']
    
    fieldsets = (
        ('🔬 Report Info', {
            'fields': ('user', 'report_name', 'lab_type', 'test_date')
        }),
        ('🏥 Source', {
            'fields': ('lab_name', 'doctor_name')
        }),
        ('📊 Results', {
            'fields': ('results', 'results_display', 'overall_status')
        }),
        ('📝 Interpretation', {
            'fields': ('interpretation', 'recommendations')
        }),
        ('🔗 Links', {
            'fields': ('document', 'consultation'),
            'classes': ('collapse',)
        }),
        ('⏰ Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Patient')
    def user_link(self, obj):
        return get_user_link(obj.user, '🧑 ')
    
    @admin.display(description='Type')
    def type_badge(self, obj):
        icons = {
            'blood': '🩸',
            'urine': '🧪',
            'stool': '💩',
            'thyroid': '🦋',
            'lipid': '🫀',
            'liver': '🫁',
            'kidney': '🫘',
            'diabetes': '💉',
            'vitamin': '💊',
            'hormone': '⚗️',
            'allergy': '🤧',
            'infection': '🦠',
            'other': '📋',
        }
        icon = icons.get(obj.lab_type, '📋')
        return format_html('{} {}', icon, obj.get_lab_type_display())
    
    @admin.display(description='Status')
    def status_badge(self, obj):
        colors = {
            'normal': '#27ae60',
            'abnormal': '#f39c12',
            'critical': '#e74c3c',
            'pending': '#3498db',
        }
        icons = {
            'normal': '✅',
            'abnormal': '⚠️',
            'critical': '🚨',
            'pending': '⏳',
        }
        color = colors.get(obj.overall_status, '#95a5a6')
        icon = icons.get(obj.overall_status, '')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px; font-weight: bold;">'
            '{} {}</span>',
            color, icon, obj.get_overall_status_display()
        )
    
    @admin.display(description='Abnormal')
    def abnormal_display(self, obj):
        abnormal = obj.get_abnormal_results()
        count = len(abnormal)
        if count > 0:
            return format_html(
                '<span style="background: #e74c3c; color: white; padding: 2px 10px; '
                'border-radius: 10px; font-weight: bold;">{} ⚠️</span>',
                count
            )
        return format_html('<span style="color: #27ae60;">✓ All Normal</span>')
    
    @admin.display(description='Lab')
    def lab_info(self, obj):
        if obj.lab_name:
            return format_html('🏥 {}', obj.lab_name[:20])
        return format_html('<span style="color: #ccc;">—</span>')
    
    @admin.display(description='Doc')
    def has_document(self, obj):
        if obj.document:
            url = reverse('admin:health_records_medicaldocument_change', args=[obj.document.pk])
            return format_html('<a href="{}">📄 View</a>', url)
        return format_html('<span style="color: #ccc;">—</span>')
    
    @admin.display(description='Results Table')
    def results_display(self, obj):
        if not obj.results:
            return "No results recorded"
        
        html = '<table style="width: 100%; border-collapse: collapse;">'
        html += '<tr style="background: #f8f9fa;">'
        html += '<th style="padding: 8px; border: 1px solid #ddd;">Test</th>'
        html += '<th style="padding: 8px; border: 1px solid #ddd;">Value</th>'
        html += '<th style="padding: 8px; border: 1px solid #ddd;">Unit</th>'
        html += '<th style="padding: 8px; border: 1px solid #ddd;">Range</th>'
        html += '<th style="padding: 8px; border: 1px solid #ddd;">Status</th>'
        html += '</tr>'
        
        for result in obj.results[:20]:
            status = result.get('status', 'normal')
            status_colors = {
                'normal': '#27ae60',
                'low': '#3498db',
                'high': '#e74c3c',
                'abnormal': '#f39c12',
                'critical': '#c0392b',
            }
            color = status_colors.get(status, '#95a5a6')
            
            html += f'<tr>'
            html += f'<td style="padding: 8px; border: 1px solid #ddd;">{result.get("name", "")}</td>'
            html += f'<td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">{result.get("value", "")}</td>'
            html += f'<td style="padding: 8px; border: 1px solid #ddd;">{result.get("unit", "")}</td>'
            html += f'<td style="padding: 8px; border: 1px solid #ddd;">{result.get("normal_range", "")}</td>'
            html += f'<td style="padding: 8px; border: 1px solid #ddd; background: {color}; color: white;">{status.upper()}</td>'
            html += '</tr>'
        
        html += '</table>'
        
        if len(obj.results) > 20:
            html += f'<p><em>Showing 20 of {len(obj.results)} results</em></p>'
        
        return format_html(html)
    
    @admin.action(description='✅ Mark as All Normal')
    def mark_normal(self, request, queryset):
        updated = queryset.update(overall_status='normal')
        self.message_user(request, f"✅ {updated} reports marked as normal.")
    
    @admin.action(description='⚠️ Mark as Abnormal')
    def mark_abnormal(self, request, queryset):
        updated = queryset.update(overall_status='abnormal')
        self.message_user(request, f"⚠️ {updated} reports marked as abnormal.")
    
    @admin.action(description='📥 Export to CSV')
    def export_reports_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="lab_reports.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'Patient Phone', 'Report Name', 'Type', 'Test Date',
            'Status', 'Abnormal Count', 'Lab Name'
        ])
        for r in queryset.select_related('user'):
            writer.writerow([
                r.user.phone,
                r.report_name,
                r.get_lab_type_display(),
                r.test_date,
                r.get_overall_status_display(),
                len(r.get_abnormal_results()),
                r.lab_name or '',
            ])
        return response


# =============================================================================
# VACCINATION RECORD ADMIN
# =============================================================================

@admin.register(VaccinationRecord)
class VaccinationRecordAdmin(admin.ModelAdmin):
    """Admin for Vaccination Records with schedule tracking."""
    
    list_display = [
        'vaccine_display', 'user_link', 'type_badge', 'dose_progress',
        'vaccination_date', 'due_status', 'verification_status', 'location'
    ]
    list_filter = ['vaccine_type', 'is_verified', 'vaccination_date']
    search_fields = ['vaccine_name', 'user__phone', 'administered_at', 'manufacturer']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'vaccination_date'
    list_select_related = ['user', 'verified_by', 'certificate']
    list_per_page = 25
    
    actions = ['verify_records', 'unverify_records', 'export_vaccinations_csv']
    
    fieldsets = (
        ('💉 Vaccine Info', {
            'fields': ('user', 'vaccine_name', 'vaccine_name_local', 'vaccine_type')
        }),
        ('📊 Dose', {
            'fields': ('dose_number', 'total_doses', 'vaccination_date', 'next_due_date')
        }),
        ('🏥 Administration', {
            'fields': ('administered_by', 'administered_at', 'batch_number', 'manufacturer')
        }),
        ('⚠️ Side Effects', {
            'fields': ('side_effects',),
            'classes': ('collapse',)
        }),
        ('✅ Verification', {
            'fields': ('is_verified', 'verified_by', 'certificate')
        }),
        ('⏰ Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Vaccine')
    def vaccine_display(self, obj):
        return format_html('💉 {}', obj.vaccine_name[:30])
    
    @admin.display(description='Patient')
    def user_link(self, obj):
        return get_user_link(obj.user, '🧑 ')
    
    @admin.display(description='Type')
    def type_badge(self, obj):
        colors = {
            'covid': '#e74c3c',
            'flu': '#3498db',
            'hepatitis_a': '#f39c12',
            'hepatitis_b': '#e67e22',
            'typhoid': '#9b59b6',
            'tetanus': '#1abc9c',
            'rabies': '#c0392b',
            'polio': '#27ae60',
            'mmr': '#2980b9',
            'bcg': '#16a085',
            'dpt': '#8e44ad',
            'chickenpox': '#f1c40f',
            'hpv': '#e91e63',
            'pneumonia': '#00bcd4',
            'meningitis': '#ff5722',
            'yellow_fever': '#ffc107',
            'other': '#95a5a6',
        }
        color = colors.get(obj.vaccine_type, '#95a5a6')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 10px; font-size: 10px;">{}</span>',
            color, obj.get_vaccine_type_display()
        )
    
    @admin.display(description='Dose')
    def dose_progress(self, obj):
        percentage = (obj.dose_number / obj.total_doses) * 100 if obj.total_doses > 0 else 0
        
        if obj.is_complete:
            color = '#27ae60'
            status = '✅'
        else:
            color = '#f39c12'
            status = '⏳'
        
        return format_html(
            '<div style="width: 80px; background: #ecf0f1; border-radius: 10px; overflow: hidden;">'
            '<div style="width: {}%; background: {}; height: 18px; text-align: center; '
            'color: white; font-size: 11px; line-height: 18px;">{}/{}</div>'
            '</div> {}',
            percentage, color, obj.dose_number, obj.total_doses, status
        )
    
    @admin.display(description='Due Status')
    def due_status(self, obj):
        if obj.is_complete:
            return format_html(
                '<span style="color: #27ae60; font-weight: bold;">✅ Complete</span>'
            )
        
        if not obj.next_due_date:
            return format_html('<span style="color: #ccc;">—</span>')
        
        today = timezone.now().date()
        days_diff = (obj.next_due_date - today).days
        
        if days_diff < 0:
            return format_html(
                '<span style="background: #e74c3c; color: white; padding: 2px 8px; '
                'border-radius: 10px;">⚠️ Overdue by {} days</span>',
                abs(days_diff)
            )
        elif days_diff == 0:
            return format_html(
                '<span style="background: #f39c12; color: white; padding: 2px 8px; '
                'border-radius: 10px;">📅 Due Today</span>'
            )
        elif days_diff <= 7:
            return format_html(
                '<span style="background: #f39c12; color: white; padding: 2px 8px; '
                'border-radius: 10px;">⏰ Due in {} days</span>',
                days_diff
            )
        elif days_diff <= 30:
            return format_html(
                '<span style="color: #3498db;">📅 Due in {} days</span>',
                days_diff
            )
        else:
            return format_html(
                '<span style="color: #95a5a6;">📅 {}</span>',
                obj.next_due_date.strftime('%d %b %Y')
            )
    
    @admin.display(description='Verified')
    def verification_status(self, obj):
        if obj.is_verified:
            verifier = obj.verified_by.phone if obj.verified_by else 'Unknown'
            return format_html(
                '<span style="color: #27ae60;" title="Verified by: {}">✅ Verified</span>',
                verifier
            )
        return format_html('<span style="color: #f39c12;">⏳ Pending</span>')
    
    @admin.display(description='Location')
    def location(self, obj):
        if obj.administered_at:
            return format_html('🏥 {}', obj.administered_at[:20])
        return format_html('<span style="color: #ccc;">—</span>')
    
    @admin.action(description='✅ Verify Selected Records')
    def verify_records(self, request, queryset):
        updated = queryset.update(is_verified=True, verified_by=request.user)
        self.message_user(request, f"✅ {updated} vaccination records verified.")
    
    @admin.action(description='❌ Remove Verification')
    def unverify_records(self, request, queryset):
        updated = queryset.update(is_verified=False, verified_by=None)
        self.message_user(request, f"❌ {updated} vaccination records unverified.")
    
    @admin.action(description='📥 Export to CSV')
    def export_vaccinations_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="vaccination_records.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'Patient Phone', 'Vaccine', 'Type', 'Dose', 'Total Doses',
            'Date', 'Next Due', 'Location', 'Verified'
        ])
        for v in queryset.select_related('user'):
            writer.writerow([
                v.user.phone,
                v.vaccine_name,
                v.get_vaccine_type_display(),
                v.dose_number,
                v.total_doses,
                v.vaccination_date,
                v.next_due_date or '',
                v.administered_at or '',
                'Yes' if v.is_verified else 'No',
            ])
        return response


# =============================================================================
# ALLERGY ADMIN
# =============================================================================

@admin.register(Allergy)
class AllergyAdmin(admin.ModelAdmin):
    """Admin for Allergies with severity visualization."""
    
    list_display = [
        'allergen_display', 'user_link', 'type_badge', 'severity_badge',
        'status_badge', 'first_observed', 'reaction_preview'
    ]
    list_filter = ['allergy_type', 'severity', 'status', 'created_at']
    search_fields = ['allergen', 'allergen_local', 'user__phone', 'reaction']
    readonly_fields = ['id', 'created_at', 'updated_at']
    list_select_related = ['user']
    list_per_page = 25
    
    actions = ['mark_active', 'mark_inactive', 'export_allergies_csv']
    
    fieldsets = (
        ('⚠️ Allergy Info', {
            'fields': ('user', 'allergen', 'allergen_local', 'allergy_type')
        }),
        ('🚨 Severity', {
            'fields': ('severity', 'reaction', 'status')
        }),
        ('📅 History', {
            'fields': ('first_observed', 'diagnosed_by')
        }),
        ('📝 Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('⏰ Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Allergen')
    def allergen_display(self, obj):
        icons = {
            'drug': '💊',
            'food': '🍽️',
            'environmental': '🌿',
            'insect': '🐝',
            'latex': '🧤',
            'animal': '🐾',
            'other': '⚠️',
        }
        icon = icons.get(obj.allergy_type, '⚠️')
        return format_html('{} {}', icon, obj.allergen)
    
    @admin.display(description='Patient')
    def user_link(self, obj):
        return get_user_link(obj.user, '🧑 ')
    
    @admin.display(description='Type')
    def type_badge(self, obj):
        colors = {
            'drug': '#e74c3c',
            'food': '#f39c12',
            'environmental': '#27ae60',
            'insect': '#f1c40f',
            'latex': '#9b59b6',
            'animal': '#3498db',
            'other': '#95a5a6',
        }
        color = colors.get(obj.allergy_type, '#95a5a6')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; '
            'border-radius: 10px; font-size: 10px;">{}</span>',
            color, obj.get_allergy_type_display()
        )
    
    @admin.display(description='Severity')
    def severity_badge(self, obj):
        colors = {
            'mild': '#27ae60',
            'moderate': '#f39c12',
            'severe': '#e74c3c',
            'life_threatening': '#8e44ad',
        }
        icons = {
            'mild': '🟢',
            'moderate': '🟡',
            'severe': '🔴',
            'life_threatening': '💀',
        }
        color = colors.get(obj.severity, '#95a5a6')
        icon = icons.get(obj.severity, '')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px; font-weight: bold;">'
            '{} {}</span>',
            color, icon, obj.get_severity_display()
        )
    
    @admin.display(description='Status')
    def status_badge(self, obj):
        colors = {
            'active': '#e74c3c',
            'inactive': '#27ae60',
            'suspected': '#f39c12',
        }
        icons = {
            'active': '🔴',
            'inactive': '✅',
            'suspected': '❓',
        }
        color = colors.get(obj.status, '#95a5a6')
        icon = icons.get(obj.status, '')
        return format_html(
            '<span style="color: {};">{} {}</span>',
            color, icon, obj.get_status_display()
        )
    
    @admin.display(description='Reaction')
    def reaction_preview(self, obj):
        if obj.reaction:
            preview = obj.reaction[:50] + '...' if len(obj.reaction) > 50 else obj.reaction
            return preview
        return format_html('<span style="color: #ccc;">—</span>')
    
    @admin.action(description='🔴 Mark as Active')
    def mark_active(self, request, queryset):
        updated = queryset.update(status='active')
        self.message_user(request, f"🔴 {updated} allergies marked as active.")
    
    @admin.action(description='✅ Mark as Inactive')
    def mark_inactive(self, request, queryset):
        updated = queryset.update(status='inactive')
        self.message_user(request, f"✅ {updated} allergies marked as inactive.")
    
    @admin.action(description='📥 Export to CSV')
    def export_allergies_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="allergies.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'Patient Phone', 'Allergen', 'Type', 'Severity',
            'Status', 'First Observed', 'Reaction'
        ])
        for a in queryset.select_related('user'):
            writer.writerow([
                a.user.phone,
                a.allergen,
                a.get_allergy_type_display(),
                a.get_severity_display(),
                a.get_status_display(),
                a.first_observed or '',
                a.reaction[:100] if a.reaction else '',
            ])
        return response


# =============================================================================
# FAMILY MEDICAL HISTORY ADMIN
# =============================================================================

@admin.register(FamilyMedicalHistory)
class FamilyMedicalHistoryAdmin(admin.ModelAdmin):
    """Admin for Family Medical History with relation visualization."""
    
    list_display = [
        'condition', 'user_link', 'relation_badge', 'relation_name',
        'age_at_diagnosis', 'deceased_status', 'created_at'
    ]
    list_filter = ['relation', 'is_deceased', 'created_at']
    search_fields = ['condition', 'condition_local', 'user__phone', 'relation_name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    list_select_related = ['user']
    list_per_page = 25
    
    actions = ['export_family_history_csv']
    
    fieldsets = (
        ('👤 Patient', {
            'fields': ('user',)
        }),
        ('👨‍👩‍👧 Relative', {
            'fields': ('relation', 'relation_name')
        }),
        ('🏥 Condition', {
            'fields': ('condition', 'condition_local', 'age_at_diagnosis')
        }),
        ('⚰️ Deceased', {
            'fields': ('is_deceased', 'age_at_death', 'cause_of_death'),
            'classes': ('collapse',)
        }),
        ('📝 Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('⏰ Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Patient')
    def user_link(self, obj):
        return get_user_link(obj.user, '🧑 ')
    
    @admin.display(description='Relation')
    def relation_badge(self, obj):
        icons = {
            'father': '👨',
            'mother': '👩',
            'brother': '👦',
            'sister': '👧',
            'grandfather_paternal': '👴',
            'grandmother_paternal': '👵',
            'grandfather_maternal': '👴',
            'grandmother_maternal': '👵',
            'uncle': '👨',
            'aunt': '👩',
            'child': '👶',
            'spouse': '💑',
            'other': '👤',
        }
        colors = {
            'father': '#3498db',
            'mother': '#e91e63',
            'brother': '#2ecc71',
            'sister': '#9b59b6',
            'grandfather_paternal': '#f39c12',
            'grandmother_paternal': '#e67e22',
            'grandfather_maternal': '#1abc9c',
            'grandmother_maternal': '#16a085',
            'uncle': '#34495e',
            'aunt': '#8e44ad',
            'child': '#3498db',
            'spouse': '#e74c3c',
            'other': '#95a5a6',
        }
        icon = icons.get(obj.relation, '👤')
        color = colors.get(obj.relation, '#95a5a6')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px;">{} {}</span>',
            color, icon, obj.get_relation_display()
        )
    
    @admin.display(description='Deceased')
    def deceased_status(self, obj):
        if obj.is_deceased:
            age_info = f" (Age {obj.age_at_death})" if obj.age_at_death else ""
            cause_info = f" - {obj.cause_of_death[:20]}" if obj.cause_of_death else ""
            return format_html(
                '<span style="color: #7f8c8d;">⚰️ Yes{}{}</span>',
                age_info, cause_info
            )
        return format_html('<span style="color: #27ae60;">✓ No</span>')
    
    @admin.action(description='📥 Export to CSV')
    def export_family_history_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="family_medical_history.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'Patient Phone', 'Relation', 'Relative Name', 'Condition',
            'Age at Diagnosis', 'Deceased', 'Age at Death', 'Cause of Death'
        ])
        for f in queryset.select_related('user'):
            writer.writerow([
                f.user.phone,
                f.get_relation_display(),
                f.relation_name or '',
                f.condition,
                f.age_at_diagnosis or '',
                'Yes' if f.is_deceased else 'No',
                f.age_at_death or '',
                f.cause_of_death or '',
            ])
        return response


# =============================================================================
# HOSPITALIZATION ADMIN
# =============================================================================

@admin.register(Hospitalization)
class HospitalizationAdmin(admin.ModelAdmin):
    """Admin for Hospitalizations with duration tracking."""
    
    list_display = [
        'hospital_display', 'user_link', 'admission_type_badge',
        'admission_date', 'discharge_date', 'duration_display',
        'followup_status', 'has_document'
    ]
    list_filter = ['admission_type', 'admission_date', 'created_at']
    search_fields = ['hospital_name', 'user__phone', 'reason', 'treating_doctor', 'diagnosis']
    readonly_fields = ['id', 'created_at', 'updated_at', 'procedures_display']
    date_hierarchy = 'admission_date'
    list_select_related = ['user', 'discharge_document', 'consultation']
    list_per_page = 25
    
    actions = ['export_hospitalizations_csv']
    
    fieldsets = (
        ('👤 Patient', {
            'fields': ('user',)
        }),
        ('🏥 Hospital', {
            'fields': ('hospital_name', 'hospital_address', 'department')
        }),
        ('📅 Admission', {
            'fields': ('admission_type', 'admission_date', 'discharge_date', 'reason')
        }),
        ('🩺 Medical', {
            'fields': ('diagnosis', 'treating_doctor', 'procedures', 'procedures_display')
        }),
        ('📄 Discharge', {
            'fields': ('discharge_summary', 'discharge_document'),
            'classes': ('collapse',)
        }),
        ('📋 Follow-up', {
            'fields': ('follow_up_date', 'follow_up_notes')
        }),
        ('🔗 Links', {
            'fields': ('consultation',),
            'classes': ('collapse',)
        }),
        ('⏰ Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Hospital')
    def hospital_display(self, obj):
        return format_html('🏥 {}', obj.hospital_name[:30])
    
    @admin.display(description='Patient')
    def user_link(self, obj):
        return get_user_link(obj.user, '🧑 ')
    
    @admin.display(description='Type')
    def admission_type_badge(self, obj):
        colors = {
            'emergency': '#e74c3c',
            'planned': '#27ae60',
            'transfer': '#f39c12',
        }
        icons = {
            'emergency': '🚨',
            'planned': '📅',
            'transfer': '🔄',
        }
        color = colors.get(obj.admission_type, '#95a5a6')
        icon = icons.get(obj.admission_type, '')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px;">{} {}</span>',
            color, icon, obj.get_admission_type_display()
        )
    
    @admin.display(description='Duration')
    def duration_display(self, obj):
        days = obj.duration_days
        if days is not None:
            if days == 0:
                return format_html(
                    '<span style="background: #d5f5e3; padding: 2px 8px; '
                    'border-radius: 10px;">Same Day</span>'
                )
            elif days <= 3:
                return format_html(
                    '<span style="background: #d5f5e3; padding: 2px 8px; '
                    'border-radius: 10px;">{} days</span>',
                    days
                )
            elif days <= 7:
                return format_html(
                    '<span style="background: #fcf3cf; padding: 2px 8px; '
                    'border-radius: 10px;">{} days</span>',
                    days
                )
            else:
                return format_html(
                    '<span style="background: #fadbd8; padding: 2px 8px; '
                    'border-radius: 10px;">{} days</span>',
                    days
                )
        return format_html(
            '<span style="background: #e74c3c; color: white; padding: 2px 8px; '
            'border-radius: 10px;">🏥 Ongoing</span>'
        )
    
    @admin.display(description='Follow-up')
    def followup_status(self, obj):
        if not obj.follow_up_date:
            return format_html('<span style="color: #ccc;">—</span>')
        
        today = timezone.now().date()
        days_diff = (obj.follow_up_date - today).days
        
        if days_diff < 0:
            return format_html(
                '<span style="color: #e74c3c;">⚠️ Overdue ({} days)</span>',
                abs(days_diff)
            )
        elif days_diff == 0:
            return format_html(
                '<span style="color: #f39c12; font-weight: bold;">📅 Today</span>'
            )
        elif days_diff <= 7:
            return format_html(
                '<span style="color: #3498db;">📅 In {} days</span>',
                days_diff
            )
        else:
            return format_html(
                '<span style="color: #95a5a6;">📅 {}</span>',
                obj.follow_up_date.strftime('%d %b')
            )
    
    @admin.display(description='Doc')
    def has_document(self, obj):
        if obj.discharge_document:
            url = reverse('admin:health_records_medicaldocument_change', args=[obj.discharge_document.pk])
            return format_html('<a href="{}">📄 View</a>', url)
        return format_html('<span style="color: #ccc;">—</span>')
    
    @admin.display(description='Procedures List')
    def procedures_display(self, obj):
        if not obj.procedures:
            return "No procedures recorded"
        
        html = '<ul style="margin: 0; padding-left: 20px;">'
        for procedure in obj.procedures[:10]:
            html += f'<li>{procedure}</li>'
        html += '</ul>'
        
        if len(obj.procedures) > 10:
            html += f'<em>+{len(obj.procedures) - 10} more</em>'
        
        return format_html(html)
    
    @admin.action(description='📥 Export to CSV')
    def export_hospitalizations_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="hospitalizations.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'Patient Phone', 'Hospital', 'Type', 'Admission Date',
            'Discharge Date', 'Duration (days)', 'Reason', 'Follow-up Date'
        ])
        for h in queryset.select_related('user'):
            writer.writerow([
                h.user.phone,
                h.hospital_name,
                h.get_admission_type_display(),
                h.admission_date,
                h.discharge_date or 'Ongoing',
                h.duration_days or 'N/A',
                h.reason[:50] if h.reason else '',
                h.follow_up_date or '',
            ])
        return response


# =============================================================================
# VITAL SIGN ADMIN
# =============================================================================

@admin.register(VitalSign)
class VitalSignAdmin(admin.ModelAdmin):
    """Admin for Vital Signs with health indicators."""
    
    list_display = [
        'user_link', 'recorded_at', 'bp_display', 'heart_rate_display',
        'temperature_display', 'oxygen_display', 'sugar_display',
        'source_badge'
    ]
    list_filter = ['source', 'blood_sugar_type', 'recorded_at']
    search_fields = ['user__phone']
    readonly_fields = ['id', 'created_at', 'updated_at', 'vitals_summary']
    date_hierarchy = 'recorded_at'
    list_select_related = ['user', 'recorded_by', 'consultation']
    list_per_page = 25
    
    actions = ['export_vitals_csv']
    
    fieldsets = (
        ('👤 Patient', {
            'fields': ('user', 'recorded_at', 'source', 'recorded_by', 'vitals_summary')
        }),
        ('🩸 Blood Pressure', {
            'fields': ('systolic_bp', 'diastolic_bp')
        }),
        ('💓 Vitals', {
            'fields': ('heart_rate', 'temperature', 'respiratory_rate', 'oxygen_saturation')
        }),
        ('🍬 Blood Sugar', {
            'fields': ('blood_sugar', 'blood_sugar_type')
        }),
        ('⚖️ Weight', {
            'fields': ('weight_kg',)
        }),
        ('📝 Notes', {
            'fields': ('notes', 'consultation'),
            'classes': ('collapse',)
        }),
        ('⏰ Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Patient')
    def user_link(self, obj):
        return get_user_link(obj.user, '🧑 ')
    
    @admin.display(description='BP (mmHg)')
    def bp_display(self, obj):
        if obj.systolic_bp and obj.diastolic_bp:
            status = obj.get_bp_status()
            colors = {
                'low': '#3498db',
                'normal': '#27ae60',
                'elevated': '#f39c12',
                'high': '#e74c3c',
            }
            icons = {
                'low': '↓',
                'normal': '✓',
                'elevated': '↗',
                'high': '↑',
            }
            color = colors.get(status, '#95a5a6')
            icon = icons.get(status, '')
            return format_html(
                '<span style="color: {}; font-weight: bold;">{}/{} {}</span>',
                color, obj.systolic_bp, obj.diastolic_bp, icon
            )
        return format_html('<span style="color: #ccc;">—</span>')
    
    @admin.display(description='HR (bpm)')
    def heart_rate_display(self, obj):
        if obj.heart_rate:
            if obj.heart_rate < 60:
                color = '#3498db'
                icon = '↓'
            elif obj.heart_rate <= 100:
                color = '#27ae60'
                icon = '✓'
            else:
                color = '#e74c3c'
                icon = '↑'
            return format_html(
                '<span style="color: {};">💓 {} {}</span>',
                color, obj.heart_rate, icon
            )
        return format_html('<span style="color: #ccc;">—</span>')
    
    @admin.display(description='Temp (°F)')
    def temperature_display(self, obj):
        if obj.temperature:
            temp = float(obj.temperature)
            if temp < 97:
                color = '#3498db'
                icon = '↓'
            elif temp <= 99:
                color = '#27ae60'
                icon = '✓'
            elif temp <= 100.4:
                color = '#f39c12'
                icon = '↗'
            else:
                color = '#e74c3c'
                icon = '🔥'
            return format_html(
                '<span style="color: {};">🌡️ {} {}</span>',
                color, obj.temperature, icon
            )
        return format_html('<span style="color: #ccc;">—</span>')
    
    @admin.display(description='SpO2 (%)')
    def oxygen_display(self, obj):
        if obj.oxygen_saturation:
            if obj.oxygen_saturation >= 95:
                color = '#27ae60'
                icon = '✓'
            elif obj.oxygen_saturation >= 90:
                color = '#f39c12'
                icon = '⚠️'
            else:
                color = '#e74c3c'
                icon = '🚨'
            return format_html(
                '<span style="color: {};">🫁 {}% {}</span>',
                color, obj.oxygen_saturation, icon
            )
        return format_html('<span style="color: #ccc;">—</span>')
    
    @admin.display(description='Sugar (mg/dL)')
    def sugar_display(self, obj):
        if obj.blood_sugar:
            sugar_type = obj.blood_sugar_type or 'random'
            
            # Different ranges for fasting vs post-prandial
            if sugar_type == 'fasting':
                if obj.blood_sugar < 70:
                    color, icon = '#3498db', '↓'
                elif obj.blood_sugar <= 100:
                    color, icon = '#27ae60', '✓'
                elif obj.blood_sugar <= 125:
                    color, icon = '#f39c12', '↗'
                else:
                    color, icon = '#e74c3c', '↑'
            else:  # PP or random
                if obj.blood_sugar < 70:
                    color, icon = '#3498db', '↓'
                elif obj.blood_sugar <= 140:
                    color, icon = '#27ae60', '✓'
                elif obj.blood_sugar <= 199:
                    color, icon = '#f39c12', '↗'
                else:
                    color, icon = '#e74c3c', '↑'
            
            type_abbr = {'fasting': 'F', 'pp': 'PP', 'random': 'R'}.get(sugar_type, '')
            return format_html(
                '<span style="color: {};">🍬 {} {} ({})</span>',
                color, obj.blood_sugar, icon, type_abbr
            )
        return format_html('<span style="color: #ccc;">—</span>')
    
    @admin.display(description='Source')
    def source_badge(self, obj):
        colors = {
            'self': '#3498db',
            'clinic': '#27ae60',
            'home_device': '#9b59b6',
            'consultation': '#e67e22',
        }
        icons = {
            'self': '👤',
            'clinic': '🏥',
            'home_device': '📱',
            'consultation': '👨‍⚕️',
        }
        color = colors.get(obj.source, '#95a5a6')
        icon = icons.get(obj.source, '')
        return format_html(
            '<span style="color: {};">{} {}</span>',
            color, icon, obj.get_source_display()
        )
    
    @admin.display(description='Vitals Summary')
    def vitals_summary(self, obj):
        html = '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">'
        
        # BP Card
        bp_status = obj.get_bp_status() if obj.systolic_bp and obj.diastolic_bp else 'unknown'
        bp_colors = {'low': '#d6eaf8', 'normal': '#d5f5e3', 'elevated': '#fcf3cf', 'high': '#fadbd8', 'unknown': '#f8f9fa'}
        html += f'<div style="background: {bp_colors.get(bp_status, "#f8f9fa")}; padding: 10px; border-radius: 8px; text-align: center;">'
        html += '<strong>🩸 Blood Pressure</strong><br>'
        if obj.systolic_bp and obj.diastolic_bp:
            html += f'<span style="font-size: 20px;">{obj.systolic_bp}/{obj.diastolic_bp}</span><br>'
            html += f'<small>{bp_status.upper()}</small>'
        else:
            html += '<em>Not recorded</em>'
        html += '</div>'
        
        # Heart Rate Card
        hr_color = '#f8f9fa'
        if obj.heart_rate:
            if obj.heart_rate < 60:
                hr_color = '#d6eaf8'
            elif obj.heart_rate <= 100:
                hr_color = '#d5f5e3'
            else:
                hr_color = '#fadbd8'
        html += f'<div style="background: {hr_color}; padding: 10px; border-radius: 8px; text-align: center;">'
        html += '<strong>💓 Heart Rate</strong><br>'
        if obj.heart_rate:
            html += f'<span style="font-size: 20px;">{obj.heart_rate}</span> bpm'
        else:
            html += '<em>Not recorded</em>'
        html += '</div>'
        
        # Oxygen Card
        o2_color = '#f8f9fa'
        if obj.oxygen_saturation:
            if obj.oxygen_saturation >= 95:
                o2_color = '#d5f5e3'
            elif obj.oxygen_saturation >= 90:
                o2_color = '#fcf3cf'
            else:
                o2_color = '#fadbd8'
        html += f'<div style="background: {o2_color}; padding: 10px; border-radius: 8px; text-align: center;">'
        html += '<strong>🫁 Oxygen</strong><br>'
        if obj.oxygen_saturation:
            html += f'<span style="font-size: 20px;">{obj.oxygen_saturation}%</span>'
        else:
            html += '<em>Not recorded</em>'
        html += '</div>'
        
        html += '</div>'
        return format_html(html)
    
    @admin.action(description='📥 Export to CSV')
    def export_vitals_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="vital_signs.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'Patient Phone', 'Recorded At', 'Systolic BP', 'Diastolic BP',
            'Heart Rate', 'Temperature', 'Oxygen', 'Blood Sugar', 'Sugar Type', 'Source'
        ])
        for v in queryset.select_related('user'):
            writer.writerow([
                v.user.phone,
                v.recorded_at.strftime('%Y-%m-%d %H:%M'),
                v.systolic_bp or '',
                v.diastolic_bp or '',
                v.heart_rate or '',
                v.temperature or '',
                v.oxygen_saturation or '',
                v.blood_sugar or '',
                v.get_blood_sugar_type_display() if v.blood_sugar_type else '',
                v.get_source_display(),
            ])
        return response


# =============================================================================
# SHARED RECORD ADMIN
# =============================================================================

@admin.register(SharedRecord)
class SharedRecordAdmin(admin.ModelAdmin):
    """Admin for Shared Records with expiry tracking."""
    
    list_display = [
        'patient_link', 'doctor_link', 'share_type_badge', 'validity_display',
        'status_badge', 'expiry_status', 'access_info', 'created_at'
    ]
    list_filter = ['share_type', 'is_permanent', 'is_active', 'created_at']
    search_fields = ['patient__phone', 'doctor__phone', 'doctor__first_name']
    readonly_fields = [
        'id', 'last_accessed_at', 'access_count',
        'revoked_at', 'created_at', 'updated_at', 'sharing_summary'
    ]
    filter_horizontal = ['documents']
    list_select_related = ['patient', 'doctor', 'consultation']
    list_per_page = 25
    
    actions = ['activate_sharing', 'revoke_sharing', 'extend_expiry', 'export_shared_records_csv']
    
    fieldsets = (
        ('🔗 Sharing', {
            'fields': ('patient', 'doctor', 'share_type', 'sharing_summary')
        }),
        ('📄 Documents', {
            'fields': ('documents',),
            'classes': ('collapse',)
        }),
        ('⏰ Validity', {
            'fields': ('is_permanent', 'expires_at', 'is_active', 'revoked_at')
        }),
        ('📊 Access', {
            'fields': ('last_accessed_at', 'access_count')
        }),
        ('🔗 Links', {
            'fields': ('consultation',),
            'classes': ('collapse',)
        }),
        ('⏰ Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Patient')
    def patient_link(self, obj):
        return get_user_link(obj.patient, '🧑 ')
    
    @admin.display(description='Doctor')
    def doctor_link(self, obj):
        return get_user_link(obj.doctor, '👨‍⚕️ Dr. ')
    
    @admin.display(description='Share Type')
    def share_type_badge(self, obj):
        colors = {
            'all': '#27ae60',
            'profile': '#3498db',
            'documents': '#9b59b6',
            'conditions': '#e67e22',
            'lab_reports': '#1abc9c',
            'vaccinations': '#f39c12',
        }
        icons = {
            'all': '📂',
            'profile': '👤',
            'documents': '📄',
            'conditions': '🏥',
            'lab_reports': '🔬',
            'vaccinations': '💉',
        }
        color = colors.get(obj.share_type, '#95a5a6')
        icon = icons.get(obj.share_type, '📁')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px;">{} {}</span>',
            color, icon, obj.get_share_type_display()
        )
    
    @admin.display(description='Validity')
    def validity_display(self, obj):
        if obj.is_permanent:
            return format_html(
                '<span style="background: #27ae60; color: white; padding: 2px 8px; '
                'border-radius: 10px;">♾️ Permanent</span>'
            )
        elif obj.expires_at:
            return format_html(
                '<span style="background: #3498db; color: white; padding: 2px 8px; '
                'border-radius: 10px;">⏰ Temporary</span>'
            )
        return format_html('<span style="color: #ccc;">—</span>')
    
    @admin.display(description='Status')
    def status_badge(self, obj):
        if not obj.is_active:
            return format_html(
                '<span style="background: #e74c3c; color: white; padding: 3px 10px; '
                'border-radius: 12px; font-size: 11px;">❌ Revoked</span>'
            )
        if obj.is_expired():
            return format_html(
                '<span style="background: #f39c12; color: white; padding: 3px 10px; '
                'border-radius: 12px; font-size: 11px;">⏰ Expired</span>'
            )
        return format_html(
            '<span style="background: #27ae60; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px;">✅ Active</span>'
        )
    
    @admin.display(description='Expires')
    def expiry_status(self, obj):
        if obj.is_permanent:
            return format_html('<span style="color: #27ae60;">♾️ Never</span>')
        
        if not obj.expires_at:
            return format_html('<span style="color: #ccc;">—</span>')
        
        if not obj.is_active:
            return format_html('<span style="color: #95a5a6;">Revoked</span>')
        
        now = timezone.now()
        
        if obj.expires_at < now:
            diff = now - obj.expires_at
            days = diff.days
            if days > 0:
                return format_html(
                    '<span style="color: #e74c3c;">Expired {} days ago</span>',
                    days
                )
            else:
                hours = diff.seconds // 3600
                return format_html(
                    '<span style="color: #e74c3c;">Expired {}h ago</span>',
                    hours
                )
        else:
            diff = obj.expires_at - now
            days = diff.days
            hours = diff.seconds // 3600
            
            if days > 7:
                return format_html(
                    '<span style="color: #27ae60;">📅 {}</span>',
                    obj.expires_at.strftime('%d %b %Y')
                )
            elif days > 0:
                return format_html(
                    '<span style="color: #f39c12;">⏳ {} days left</span>',
                    days
                )
            elif hours > 0:
                return format_html(
                    '<span style="color: #e74c3c;">⏳ {}h left</span>',
                    hours
                )
            else:
                minutes = diff.seconds // 60
                return format_html(
                    '<span style="color: #e74c3c;">⏳ {}m left</span>',
                    minutes
                )
    
    @admin.display(description='Access')
    def access_info(self, obj):
        count = obj.access_count
        if count == 0:
            return format_html('<span style="color: #ccc;">Never accessed</span>')
        
        last = obj.last_accessed_at
        if last:
            now = timezone.now()
            diff = now - last
            
            if diff.days > 0:
                time_ago = f"{diff.days}d ago"
            elif diff.seconds > 3600:
                time_ago = f"{diff.seconds // 3600}h ago"
            else:
                time_ago = f"{diff.seconds // 60}m ago"
            
            return format_html(
                '<span title="Last: {}">👁️ {} views<br><small>{}</small></span>',
                last.strftime('%Y-%m-%d %H:%M'), count, time_ago
            )
        
        return format_html('👁️ {} views', count)
    
    @admin.display(description='Sharing Summary')
    def sharing_summary(self, obj):
        html = '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">'
        
        # Patient Info
        html += '<div style="margin-bottom: 10px;">'
        html += f'<strong>🧑 Patient:</strong> {obj.patient.phone}'
        if obj.patient.first_name:
            html += f' ({obj.patient.first_name} {obj.patient.last_name or ""})'
        html += '</div>'
        
        # Doctor Info
        html += '<div style="margin-bottom: 10px;">'
        html += f'<strong>👨‍⚕️ Doctor:</strong> {obj.doctor.phone}'
        if obj.doctor.first_name:
            html += f' (Dr. {obj.doctor.first_name} {obj.doctor.last_name or ""})'
        html += '</div>'
        
        # Share Type
        html += f'<div style="margin-bottom: 10px;">'
        html += f'<strong>📂 Sharing:</strong> {obj.get_share_type_display()}'
        html += '</div>'
        
        # Documents Count
        doc_count = obj.documents.count()
        if doc_count > 0:
            html += f'<div style="margin-bottom: 10px;">'
            html += f'<strong>📄 Documents:</strong> {doc_count} specific documents shared'
            html += '</div>'
        
        # Status
        html += '<div style="margin-bottom: 10px;">'
        if not obj.is_active:
            html += '<strong>Status:</strong> <span style="color: #e74c3c;">❌ Revoked</span>'
            if obj.revoked_at:
                html += f' on {obj.revoked_at.strftime("%d %b %Y %H:%M")}'
        elif obj.is_expired():
            html += '<strong>Status:</strong> <span style="color: #f39c12;">⏰ Expired</span>'
        else:
            html += '<strong>Status:</strong> <span style="color: #27ae60;">✅ Active</span>'
        html += '</div>'
        
        # Validity
        html += '<div>'
        if obj.is_permanent:
            html += '<strong>Validity:</strong> ♾️ Permanent access'
        elif obj.expires_at:
            html += f'<strong>Validity:</strong> Until {obj.expires_at.strftime("%d %b %Y %H:%M")}'
        html += '</div>'
        
        html += '</div>'
        return format_html(html)
    
    @admin.action(description='✅ Activate Sharing')
    def activate_sharing(self, request, queryset):
        updated = queryset.update(is_active=True, revoked_at=None)
        self.message_user(request, f"✅ {updated} sharing records activated.")
    
    @admin.action(description='❌ Revoke Sharing')
    def revoke_sharing(self, request, queryset):
        updated = queryset.update(is_active=False, revoked_at=timezone.now())
        self.message_user(request, f"❌ {updated} sharing records revoked.")
    
    @admin.action(description='⏰ Extend Expiry by 30 Days')
    def extend_expiry(self, request, queryset):
        from datetime import timedelta
        count = 0
        for record in queryset.filter(is_permanent=False):
            if record.expires_at:
                record.expires_at = record.expires_at + timedelta(days=30)
            else:
                record.expires_at = timezone.now() + timedelta(days=30)
            record.save(update_fields=['expires_at'])
            count += 1
        self.message_user(request, f"⏰ {count} sharing records extended by 30 days.")
    
    @admin.action(description='📥 Export to CSV')
    def export_shared_records_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="shared_records.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'Patient Phone', 'Doctor Phone', 'Share Type', 'Permanent',
            'Active', 'Expires At', 'Access Count', 'Last Accessed', 'Created'
        ])
        for s in queryset.select_related('patient', 'doctor'):
            writer.writerow([
                s.patient.phone,
                s.doctor.phone,
                s.get_share_type_display(),
                'Yes' if s.is_permanent else 'No',
                'Yes' if s.is_active else 'No',
                s.expires_at.strftime('%Y-%m-%d %H:%M') if s.expires_at else 'N/A',
                s.access_count,
                s.last_accessed_at.strftime('%Y-%m-%d %H:%M') if s.last_accessed_at else 'Never',
                s.created_at.strftime('%Y-%m-%d'),
            ])
        return response