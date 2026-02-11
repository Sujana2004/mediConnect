"""
Medicine App Admin Configuration (Enhanced)
============================================
Provides admin interface for managing medicines with:
- Visual status indicators
- Adherence tracking
- Performance optimization
- Export functionality

CRITICAL FIX: Changed phone_number → phone throughout
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Count, Avg, Q, F
from django.urls import reverse
from django.http import HttpResponse
import csv
from datetime import timedelta, date

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


# ============================================
# HELPER FUNCTIONS
# ============================================

def prescription_type_badge(ptype):
    """Generate badge for prescription type."""
    config = {
        'otc': ('#27ae60', '🟢 OTC'),
        'prescription': ('#f39c12', '🟡 Rx'),
        'controlled': ('#e74c3c', '🔴 Controlled'),
    }
    color, text = config.get(ptype, ('#7f8c8d', ptype))
    return format_html(
        '<span style="background-color: {}; color: white; padding: 3px 10px; '
        'border-radius: 12px; font-size: 11px; font-weight: bold;">{}</span>',
        color, text
    )


def severity_badge(severity):
    """Generate badge for interaction severity."""
    config = {
        'mild': ('#27ae60', '🟢'),
        'moderate': ('#f39c12', '🟡'),
        'severe': ('#e67e22', '🟠'),
        'contraindicated': ('#e74c3c', '🔴'),
    }
    color, icon = config.get(severity, ('#7f8c8d', '⚪'))
    return format_html(
        '<span style="background-color: {}; color: white; padding: 3px 10px; '
        'border-radius: 12px; font-size: 11px; font-weight: bold;">{} {}</span>',
        color, icon, severity.upper() if severity else 'Unknown'
    )


def response_badge(response):
    """Generate badge for reminder response."""
    config = {
        'pending': ('#95a5a6', '⏳'),
        'taken': ('#27ae60', '✓'),
        'skipped': ('#3498db', '⏭️'),
        'snoozed': ('#f39c12', '💤'),
        'missed': ('#e74c3c', '✗'),
    }
    color, icon = config.get(response, ('#7f8c8d', '?'))
    return format_html(
        '<span style="background-color: {}; color: white; padding: 3px 10px; '
        'border-radius: 12px; font-size: 11px; font-weight: bold;">{} {}</span>',
        color, icon, (response or 'Unknown').upper()
    )


def adherence_display(taken, total):
    """Display adherence rate with color coding."""
    if total == 0:
        return format_html('<span style="color: #bdc3c7;">No data</span>')
    
    rate = (taken / total) * 100
    if rate >= 80:
        color = '#27ae60'
    elif rate >= 60:
        color = '#f39c12'
    else:
        color = '#e74c3c'
    
    return format_html(
        '<span style="color: {}; font-weight: bold;">{:.0f}%</span> '
        '<small style="color: #7f8c8d;">({}/{})</small>',
        color, rate, taken, total
    )


# ============================================
# CUSTOM FILTERS
# ============================================

class InteractionSeverityFilter(admin.SimpleListFilter):
    """Filter drug interactions by severity."""
    title = 'Severity Level'
    parameter_name = 'severity_level'
    
    def lookups(self, request, model_admin):
        return (
            ('dangerous', '🔴 Dangerous (Severe/Contraindicated)'),
            ('moderate', '🟡 Moderate'),
            ('mild', '🟢 Mild'),
        )
    
    def queryset(self, request, queryset):
        if self.value() == 'dangerous':
            return queryset.filter(severity__in=['severe', 'contraindicated'])
        if self.value() == 'moderate':
            return queryset.filter(severity='moderate')
        if self.value() == 'mild':
            return queryset.filter(severity='mild')


class ReminderStatusFilter(admin.SimpleListFilter):
    """Filter reminders by schedule status."""
    title = 'Schedule Status'
    parameter_name = 'schedule'
    
    def lookups(self, request, model_admin):
        return (
            ('active_today', '📅 Active Today'),
            ('upcoming', '⏰ Starting Soon (7 days)'),
            ('expired', '⏳ Expired'),
            ('paused', '⏸️ Paused'),
        )
    
    def queryset(self, request, queryset):
        today = date.today()
        if self.value() == 'active_today':
            return queryset.filter(
                status='active',
                start_date__lte=today,
                end_date__gte=today
            )
        if self.value() == 'upcoming':
            return queryset.filter(
                status='active',
                start_date__gt=today,
                start_date__lte=today + timedelta(days=7)
            )
        if self.value() == 'expired':
            return queryset.filter(end_date__lt=today)
        if self.value() == 'paused':
            return queryset.filter(status='paused')


class ReminderLogFilter(admin.SimpleListFilter):
    """Filter reminder logs by date."""
    title = 'Log Date'
    parameter_name = 'log_date'
    
    def lookups(self, request, model_admin):
        return (
            ('today', '📅 Today'),
            ('yesterday', '📅 Yesterday'),
            ('week', '📆 This Week'),
            ('missed_week', '❌ Missed This Week'),
        )
    
    def queryset(self, request, queryset):
        today = date.today()
        if self.value() == 'today':
            return queryset.filter(scheduled_date=today)
        if self.value() == 'yesterday':
            return queryset.filter(scheduled_date=today - timedelta(days=1))
        if self.value() == 'week':
            return queryset.filter(scheduled_date__gte=today - timedelta(days=7))
        if self.value() == 'missed_week':
            return queryset.filter(
                scheduled_date__gte=today - timedelta(days=7),
                response='missed'
            )


class PrescriptionStatusFilter(admin.SimpleListFilter):
    """Filter prescriptions by status."""
    title = 'Prescription Status'
    parameter_name = 'rx_status'
    
    def lookups(self, request, model_admin):
        return (
            ('active', '🟢 Active'),
            ('expiring_soon', '🟡 Expiring Soon (7 days)'),
            ('expired', '🔴 Expired'),
            ('completed', '✅ Completed'),
        )
    
    def queryset(self, request, queryset):
        today = date.today()
        if self.value() == 'active':
            return queryset.filter(status='active')
        if self.value() == 'expiring_soon':
            return queryset.filter(
                status='active',
                valid_until__lte=today + timedelta(days=7),
                valid_until__gte=today
            )
        if self.value() == 'expired':
            return queryset.filter(valid_until__lt=today)
        if self.value() == 'completed':
            return queryset.filter(status='completed')


# ============================================
# INLINE ADMINS
# ============================================

class PrescriptionMedicineInline(admin.TabularInline):
    """Inline for prescription medicines."""
    model = PrescriptionMedicine
    extra = 1
    autocomplete_fields = ['medicine']
    fields = [
        'medicine_name', 'medicine', 'dosage', 'frequency', 'timing',
        'duration_days', 'is_active'
    ]
    readonly_fields = ['medicine_name']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('medicine')


class MedicineAlternativeInline(admin.TabularInline):
    """Inline for medicine alternatives."""
    model = MedicineAlternative
    fk_name = 'medicine'
    extra = 0
    autocomplete_fields = ['alternative']
    fields = ['alternative', 'similarity_score', 'price_difference_percent', 'is_verified']
    readonly_fields = ['price_difference_percent']


class DrugInteractionInline(admin.TabularInline):
    """Inline for drug interactions."""
    model = DrugInteraction
    fk_name = 'medicine_1'
    extra = 0
    autocomplete_fields = ['medicine_2']
    fields = ['medicine_2', 'severity', 'description', 'is_verified']
    readonly_fields = ['description']
    max_num = 10


# ============================================
# MAIN ADMIN CLASSES
# ============================================

@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    """Admin for medicines with enhanced features."""
    
    list_display = [
        'name',
        'generic_name_display',
        'type_badge',
        'strength',
        'manufacturer_short',
        'price_display',
        'rx_type_badge',
        'category',
        'flags_display',
        'verification_badge',
    ]
    list_filter = [
        'is_verified',
        'is_active',
        'medicine_type',
        'prescription_type',
        'category',
        'is_generic',
        'is_habit_forming',
        'requires_refrigeration',
    ]
    search_fields = [
        'name',
        'name_generic',
        'name_local',
        'brand_name',
        'manufacturer',
        'composition',
    ]
    ordering = ['name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    list_per_page = 30
    list_select_related = True
    inlines = [MedicineAlternativeInline, DrugInteractionInline]
    actions = ['mark_verified', 'mark_unverified', 'activate', 'deactivate', 'export_medicines_csv']
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'name', 'name_generic', 'name_local',
                'brand_name', 'manufacturer'
            )
        }),
        ('Type & Form', {
            'fields': (
                'medicine_type', 'strength', 'pack_size', 'prescription_type'
            )
        }),
        ('Pricing', {
            'fields': ('mrp',)
        }),
        ('Composition & Uses', {
            'fields': (
                'composition', 'uses', 'uses_local',
                'dosage_info', 'dosage_info_local'
            )
        }),
        ('⚠️ Side Effects & Warnings', {
            'fields': (
                'side_effects', 'side_effects_local',
                'warnings', 'warnings_local',
                'contraindications'
            ),
            'classes': ('collapse',)
        }),
        ('Storage & Category', {
            'fields': (
                'storage_info', 'category', 'subcategory'
            )
        }),
        ('Flags', {
            'fields': (
                'is_generic', 'is_habit_forming',
                'requires_refrigeration', 'is_active', 'is_verified'
            )
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Generic Name')
    def generic_name_display(self, obj):
        if obj.name_generic:
            return format_html(
                '<span style="color: #7f8c8d; font-style: italic;">{}</span>',
                obj.name_generic[:30] + ('...' if len(obj.name_generic) > 30 else '')
            )
        return '-'
    
    @admin.display(description='Type')
    def type_badge(self, obj):
        type_icons = {
            'tablet': '💊',
            'capsule': '💊',
            'syrup': '🧴',
            'injection': '💉',
            'cream': '🧴',
            'drops': '💧',
            'inhaler': '🌬️',
            'powder': '🧂',
        }
        icon = type_icons.get(obj.medicine_type, '💊')
        return format_html('{} {}', icon, obj.medicine_type.title() if obj.medicine_type else '-')
    
    @admin.display(description='Manufacturer')
    def manufacturer_short(self, obj):
        if obj.manufacturer:
            return obj.manufacturer[:20] + ('...' if len(obj.manufacturer) > 20 else '')
        return '-'
    
    @admin.display(description='MRP')
    def price_display(self, obj):
        if obj.mrp:
            return format_html('<span style="font-weight: bold;">₹{}</span>', obj.mrp)
        return '-'
    
    @admin.display(description='Rx Type')
    def rx_type_badge(self, obj):
        return prescription_type_badge(obj.prescription_type)
    
    @admin.display(description='Flags')
    def flags_display(self, obj):
        flags = []
        if obj.is_generic:
            flags.append('🔷 Generic')
        if obj.is_habit_forming:
            flags.append('⚠️ Habit')
        if obj.requires_refrigeration:
            flags.append('❄️ Cold')
        return format_html(' '.join(flags)) if flags else '-'
    
    @admin.display(description='Status')
    def verification_badge(self, obj):
        if not obj.is_active:
            return format_html('<span style="color: #e74c3c;">❌ Inactive</span>')
        if obj.is_verified:
            return format_html('<span style="color: #27ae60;">✅ Verified</span>')
        return format_html('<span style="color: #f39c12;">⚠️ Unverified</span>')
    
    @admin.action(description='✅ Mark as verified')
    def mark_verified(self, request, queryset):
        count = queryset.update(is_verified=True)
        self.message_user(request, f'{count} medicines marked as verified.')
    
    @admin.action(description='⚠️ Mark as unverified')
    def mark_unverified(self, request, queryset):
        count = queryset.update(is_verified=False)
        self.message_user(request, f'{count} medicines marked as unverified.')
    
    @admin.action(description='🟢 Activate medicines')
    def activate(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} medicines activated.')
    
    @admin.action(description='🔴 Deactivate medicines')
    def deactivate(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} medicines deactivated.')
    
    @admin.action(description='📥 Export to CSV')
    def export_medicines_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="medicines.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Name', 'Generic Name', 'Type', 'Strength', 'Manufacturer', 'MRP', 'Rx Type', 'Category', 'Verified'])
        
        for med in queryset:
            writer.writerow([
                med.name,
                med.name_generic or '',
                med.medicine_type,
                med.strength or '',
                med.manufacturer or '',
                med.mrp or '',
                med.prescription_type,
                med.category or '',
                med.is_verified
            ])
        
        return response


@admin.register(MedicineAlternative)
class MedicineAlternativeAdmin(admin.ModelAdmin):
    """Admin for medicine alternatives."""
    
    list_display = [
        'medicine_link',
        'arrow_display',
        'alternative_link',
        'similarity_display',
        'price_diff_display',
        'savings_display',
        'verified_badge',
    ]
    list_filter = [
        'is_verified',
        'similarity_score',
    ]
    search_fields = [
        'medicine__name',
        'alternative__name',
    ]
    ordering = ['-similarity_score']
    readonly_fields = ['id', 'created_at', 'price_difference_percent']
    autocomplete_fields = ['medicine', 'alternative']
    list_select_related = ['medicine', 'alternative']
    list_per_page = 30
    actions = ['verify_alternatives', 'export_alternatives_csv']
    
    @admin.display(description='Original')
    def medicine_link(self, obj):
        url = reverse('admin:medicine_medicine_change', args=[obj.medicine.pk])
        return format_html(
            '<a href="{}">{}</a> <small style="color: #7f8c8d;">₹{}</small>',
            url, obj.medicine.name[:25], obj.medicine.mrp or '?'
        )
    
    @admin.display(description='')
    def arrow_display(self, obj):
        return format_html('<span style="font-size: 16px;">→</span>')
    
    @admin.display(description='Alternative')
    def alternative_link(self, obj):
        url = reverse('admin:medicine_medicine_change', args=[obj.alternative.pk])
        return format_html(
            '<a href="{}">{}</a> <small style="color: #7f8c8d;">₹{}</small>',
            url, obj.alternative.name[:25], obj.alternative.mrp or '?'
        )
    
    @admin.display(description='Similarity')
    def similarity_display(self, obj):
        score = obj.similarity_score or 0
        bars = '●' * int(score / 20) + '○' * (5 - int(score / 20))
        color = '#27ae60' if score >= 80 else '#f39c12' if score >= 60 else '#e74c3c'
        return format_html(
            '<span style="color: {};" title="{}%">{}</span>',
            color, score, bars
        )
    
    @admin.display(description='Price Diff')
    def price_diff_display(self, obj):
        diff = obj.price_difference_percent
        if diff is None:
            return '-'
        if diff < 0:
            return format_html(
                '<span style="color: #27ae60; font-weight: bold;">↓ {}%</span>',
                abs(int(diff))
            )
        elif diff > 0:
            return format_html(
                '<span style="color: #e74c3c;">↑ {}%</span>',
                int(diff)
            )
        return format_html('<span style="color: #7f8c8d;">Same</span>')
    
    @admin.display(description='Savings')
    def savings_display(self, obj):
        if obj.medicine.mrp and obj.alternative.mrp:
            savings = obj.medicine.mrp - obj.alternative.mrp
            if savings > 0:
                return format_html(
                    '<span style="color: #27ae60; font-weight: bold;">💰 ₹{}</span>',
                    int(savings)
                )
        return '-'
    
    @admin.display(description='Verified')
    def verified_badge(self, obj):
        if obj.is_verified:
            return format_html('<span style="color: #27ae60;">✅</span>')
        return format_html('<span style="color: #f39c12;">⚠️</span>')
    
    @admin.action(description='✅ Verify selected alternatives')
    def verify_alternatives(self, request, queryset):
        count = queryset.update(is_verified=True)
        self.message_user(request, f'{count} alternatives verified.')
    
    @admin.action(description='📥 Export to CSV')
    def export_alternatives_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="medicine_alternatives.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Original', 'Original MRP', 'Alternative', 'Alternative MRP', 'Savings', 'Similarity', 'Verified'])
        
        for alt in queryset.select_related('medicine', 'alternative'):
            savings = (alt.medicine.mrp or 0) - (alt.alternative.mrp or 0)
            writer.writerow([
                alt.medicine.name,
                alt.medicine.mrp or '',
                alt.alternative.name,
                alt.alternative.mrp or '',
                savings if savings > 0 else 0,
                alt.similarity_score,
                alt.is_verified
            ])
        
        return response


@admin.register(DrugInteraction)
class DrugInteractionAdmin(admin.ModelAdmin):
    """Admin for drug interactions - SAFETY CRITICAL!"""
    
    list_display = [
        'severity_indicator',
        'medicine_1_link',
        'interaction_arrow',
        'medicine_2_link',
        'severity_display',
        'effect_short',
        'verified_badge',
        'created_at',
    ]
    list_filter = [
        InteractionSeverityFilter,
        'is_verified',
        'severity',
    ]
    search_fields = [
        'medicine_1__name',
        'medicine_2__name',
        'description',
        'effect',
    ]
    ordering = ['-severity', '-created_at']
    readonly_fields = ['id', 'created_at', 'updated_at']
    autocomplete_fields = ['medicine_1', 'medicine_2']
    list_select_related = ['medicine_1', 'medicine_2']
    list_per_page = 30
    actions = ['verify_interactions', 'export_interactions_csv']
    
    fieldsets = (
        ('⚠️ Drug Interaction', {
            'fields': ('medicine_1', 'medicine_2', 'severity'),
            'description': 'Dangerous interactions should be verified immediately!'
        }),
        ('Interaction Details', {
            'fields': (
                'description', 'description_local',
                'effect', 'recommendation', 'recommendation_local'
            )
        }),
        ('Status', {
            'fields': ('is_verified',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='!')
    def severity_indicator(self, obj):
        """Visual warning indicator."""
        if obj.severity in ['severe', 'contraindicated']:
            return format_html(
                '<span style="display: inline-block; width: 12px; height: 12px; '
                'background-color: #e74c3c; border-radius: 50%;"></span>'
            )
        elif obj.severity == 'moderate':
            return format_html(
                '<span style="display: inline-block; width: 12px; height: 12px; '
                'background-color: #f39c12; border-radius: 50%;"></span>'
            )
        return format_html(
            '<span style="display: inline-block; width: 12px; height: 12px; '
            'background-color: #27ae60; border-radius: 50%;"></span>'
        )
    
    @admin.display(description='Medicine 1')
    def medicine_1_link(self, obj):
        url = reverse('admin:medicine_medicine_change', args=[obj.medicine_1.pk])
        return format_html('<a href="{}">{}</a>', url, obj.medicine_1.name[:25])
    
    @admin.display(description='')
    def interaction_arrow(self, obj):
        return format_html('<span style="font-size: 16px;">⚡</span>')
    
    @admin.display(description='Medicine 2')
    def medicine_2_link(self, obj):
        url = reverse('admin:medicine_medicine_change', args=[obj.medicine_2.pk])
        return format_html('<a href="{}">{}</a>', url, obj.medicine_2.name[:25])
    
    @admin.display(description='Severity')
    def severity_display(self, obj):
        return severity_badge(obj.severity)
    
    @admin.display(description='Effect')
    def effect_short(self, obj):
        if obj.effect:
            return obj.effect[:40] + ('...' if len(obj.effect) > 40 else '')
        return '-'
    
    @admin.display(description='Verified')
    def verified_badge(self, obj):
        if obj.is_verified:
            return format_html('<span style="color: #27ae60;">✅</span>')
        return format_html('<span style="color: #e74c3c;">⚠️ Unverified</span>')
    
    @admin.action(description='✅ Verify selected interactions')
    def verify_interactions(self, request, queryset):
        count = queryset.update(is_verified=True)
        self.message_user(request, f'{count} interactions verified.')
    
    @admin.action(description='📥 Export to CSV')
    def export_interactions_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="drug_interactions.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Medicine 1', 'Medicine 2', 'Severity', 'Effect', 'Recommendation', 'Verified'])
        
        for interaction in queryset.select_related('medicine_1', 'medicine_2'):
            writer.writerow([
                interaction.medicine_1.name,
                interaction.medicine_2.name,
                interaction.severity,
                interaction.effect or '',
                interaction.recommendation or '',
                interaction.is_verified
            ])
        
        return response


@admin.register(UserPrescription)
class UserPrescriptionAdmin(admin.ModelAdmin):
    """Admin for user prescriptions."""
    
    list_display = [
        'title',
        'user_link',
        'doctor_name',
        'prescribed_date',
        'valid_until_display',
        'status_display',
        'medicines_count',
        'active_reminders_count',
    ]
    list_filter = [
        PrescriptionStatusFilter,
        'status',
        'prescribed_date',
    ]
    search_fields = [
        'title',
        'user__phone',  # ✅ FIXED: was phone_number
        'user__first_name',
        'user__last_name',
        'doctor_name',
        'hospital_name',
        'diagnosis',
    ]
    ordering = ['-prescribed_date']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'prescribed_date'
    list_select_related = ['user']
    list_per_page = 25
    inlines = [PrescriptionMedicineInline]
    actions = ['mark_completed', 'mark_discontinued', 'export_prescriptions_csv']
    
    fieldsets = (
        ('Prescription Info', {
            'fields': (
                'user', 'title', 'doctor_name', 'hospital_name'
            )
        }),
        ('Dates', {
            'fields': ('prescribed_date', 'valid_until')
        }),
        ('Details', {
            'fields': ('diagnosis', 'notes', 'image_url')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _medicines_count=Count('medicines', distinct=True),
        )
    
    @admin.display(description='User')
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.pk])
        name = obj.user.get_full_name() or obj.user.phone
        return format_html('<a href="{}">{}</a>', url, name)  # ✅ FIXED
    
    @admin.display(description='Valid Until')
    def valid_until_display(self, obj):
        if not obj.valid_until:
            return '-'
        
        today = date.today()
        if obj.valid_until < today:
            return format_html(
                '<span style="color: #e74c3c;">⚠️ Expired {}</span>',
                obj.valid_until.strftime('%Y-%m-%d')
            )
        elif obj.valid_until <= today + timedelta(days=7):
            return format_html(
                '<span style="color: #f39c12;">⏳ {}</span>',
                obj.valid_until.strftime('%Y-%m-%d')
            )
        return obj.valid_until.strftime('%Y-%m-%d')
    
    @admin.display(description='Status')
    def status_display(self, obj):
        config = {
            'active': ('#27ae60', '🟢'),
            'completed': ('#3498db', '✅'),
            'discontinued': ('#f39c12', '⏸️'),
            'expired': ('#7f8c8d', '⏳'),
        }
        color, icon = config.get(obj.status, ('#7f8c8d', '?'))
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px;">{} {}</span>',
            color, icon, obj.status.title()
        )
    
    @admin.display(description='Medicines')
    def medicines_count(self, obj):
        count = getattr(obj, '_medicines_count', obj.medicines.count())
        return format_html('<strong>{}</strong>', count)
    
    @admin.display(description='Reminders')
    def active_reminders_count(self, obj):
        count = MedicineReminder.objects.filter(
            prescription_medicine__prescription=obj,
            status='active'
        ).count()
        if count > 0:
            return format_html('<span style="color: #27ae60;">🔔 {}</span>', count)
        return format_html('<span style="color: #bdc3c7;">-</span>')
    
    @admin.action(description='✅ Mark as completed')
    def mark_completed(self, request, queryset):
        count = queryset.update(status='completed')
        self.message_user(request, f'{count} prescriptions marked as completed.')
    
    @admin.action(description='⏸️ Mark as discontinued')
    def mark_discontinued(self, request, queryset):
        count = queryset.update(status='discontinued')
        self.message_user(request, f'{count} prescriptions discontinued.')
    
    @admin.action(description='📥 Export to CSV')
    def export_prescriptions_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="prescriptions.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['User', 'Title', 'Doctor', 'Hospital', 'Date', 'Valid Until', 'Status', 'Medicines Count'])
        
        for rx in queryset.select_related('user').annotate(_count=Count('medicines')):
            writer.writerow([
                rx.user.phone,
                rx.title,
                rx.doctor_name or '',
                rx.hospital_name or '',
                rx.prescribed_date.strftime('%Y-%m-%d'),
                rx.valid_until.strftime('%Y-%m-%d') if rx.valid_until else '',
                rx.status,
                rx._count
            ])
        
        return response


@admin.register(PrescriptionMedicine)
class PrescriptionMedicineAdmin(admin.ModelAdmin):
    """Admin for prescription medicines."""
    
    list_display = [
        'medicine_name',
        'prescription_link',
        'user_link',
        'dosage',
        'frequency_badge',
        'timing_badge',
        'duration_display',
        'active_badge',
    ]
    list_filter = [
        'frequency',
        'timing',
        'is_active',
    ]
    search_fields = [
        'medicine_name',
        'prescription__title',
        'prescription__user__phone',  # ✅ FIXED
    ]
    ordering = ['-created_at']
    readonly_fields = ['id', 'created_at', 'updated_at']
    autocomplete_fields = ['medicine', 'prescription']
    list_select_related = ['prescription', 'prescription__user', 'medicine']
    list_per_page = 30
    
    @admin.display(description='Prescription')
    def prescription_link(self, obj):
        url = reverse('admin:medicine_userprescription_change', args=[obj.prescription.pk])
        return format_html('<a href="{}">{}</a>', url, obj.prescription.title[:20])
    
    @admin.display(description='User')
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.prescription.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.prescription.user.phone)  # ✅ FIXED
    
    @admin.display(description='Frequency')
    def frequency_badge(self, obj):
        freq_colors = {
            'once_daily': '#27ae60',
            'twice_daily': '#3498db',
            'thrice_daily': '#9b59b6',
            'four_times': '#e67e22',
            'as_needed': '#7f8c8d',
        }
        color = freq_colors.get(obj.frequency, '#7f8c8d')
        return format_html(
            '<span style="color: {};">{}</span>',
            color, obj.frequency.replace('_', ' ').title() if obj.frequency else '-'
        )
    
    @admin.display(description='Timing')
    def timing_badge(self, obj):
        timing_icons = {
            'before_food': '🍽️ Before',
            'after_food': '🍽️ After',
            'with_food': '🍽️ With',
            'empty_stomach': '⭕ Empty',
            'bedtime': '🌙 Bedtime',
            'morning': '🌅 Morning',
        }
        return timing_icons.get(obj.timing, obj.timing or '-')
    
    @admin.display(description='Duration')
    def duration_display(self, obj):
        if obj.duration_days:
            return f'{obj.duration_days} days'
        return 'Ongoing'
    
    @admin.display(description='Active')
    def active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color: #27ae60;">● Active</span>')
        return format_html('<span style="color: #e74c3c;">○ Stopped</span>')


@admin.register(MedicineReminder)
class MedicineReminderAdmin(admin.ModelAdmin):
    """Admin for medicine reminders with adherence tracking."""
    
    list_display = [
        'medicine_name',
        'user_link',
        'dosage',
        'times_display',
        'schedule_display',
        'status_display',
        'adherence_display',
        'family_notify_badge',
    ]
    list_filter = [
        ReminderStatusFilter,
        'status',
        'notify_family_helper',
        'allow_snooze',
        'start_date',
    ]
    search_fields = [
        'medicine_name',
        'user__phone',  # ✅ FIXED
        'user__first_name',
        'user__last_name',
    ]
    ordering = ['-created_at']
    readonly_fields = ['id', 'created_at', 'updated_at']
    list_select_related = ['user']
    list_per_page = 30
    actions = ['activate_reminders', 'pause_reminders', 'export_reminders_csv']
    
    fieldsets = (
        ('User & Medicine', {
            'fields': (
                'user', 'prescription_medicine', 'medicine_name', 'dosage'
            )
        }),
        ('📅 Schedule', {
            'fields': (
                'reminder_times', 'days_of_week', 'start_date', 'end_date'
            ),
            'description': 'Times should be in HH:MM format. Days: 0=Monday, 6=Sunday'
        }),
        ('Instructions', {
            'fields': ('instructions', 'instructions_local')
        }),
        ('⚙️ Settings', {
            'fields': (
                'status', 'notify_before_minutes', 'notify_family_helper',
                'allow_snooze', 'snooze_minutes', 'max_snoozes'
            )
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _total_logs=Count('logs'),
            _taken_logs=Count('logs', filter=Q(logs__response='taken'))
        )
    
    @admin.display(description='User')
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.phone)  # ✅ FIXED
    
    @admin.display(description='Times')
    def times_display(self, obj):
        if obj.reminder_times:
            times = obj.reminder_times if isinstance(obj.reminder_times, list) else [obj.reminder_times]
            return format_html(
                '<span style="font-family: monospace;">{}</span>',
                ', '.join(times[:3]) + ('...' if len(times) > 3 else '')
            )
        return '-'
    
    @admin.display(description='Schedule')
    def schedule_display(self, obj):
        today = date.today()
        if obj.end_date and obj.end_date < today:
            return format_html('<span style="color: #7f8c8d;">Ended {}</span>', obj.end_date)
        if obj.start_date > today:
            return format_html('<span style="color: #3498db;">Starts {}</span>', obj.start_date)
        return format_html(
            '<span style="color: #27ae60;">{} → {}</span>',
            obj.start_date, obj.end_date or 'Ongoing'
        )
    
    @admin.display(description='Status')
    def status_display(self, obj):
        config = {
            'active': ('#27ae60', '🔔'),
            'paused': ('#f39c12', '⏸️'),
            'completed': ('#3498db', '✅'),
            'cancelled': ('#7f8c8d', '🚫'),
        }
        color, icon = config.get(obj.status, ('#7f8c8d', '?'))
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px;">{} {}</span>',
            color, icon, obj.status.title()
        )
    
    @admin.display(description='Adherence')
    def adherence_display(self, obj):
        total = getattr(obj, '_total_logs', 0)
        taken = getattr(obj, '_taken_logs', 0)
        return adherence_display(taken, total)
    
    @admin.display(description='Family')
    def family_notify_badge(self, obj):
        if obj.notify_family_helper:
            return format_html('<span style="color: #27ae60;">👨‍👩‍👧 Yes</span>')
        return format_html('<span style="color: #bdc3c7;">-</span>')
    
    @admin.action(description='🔔 Activate selected reminders')
    def activate_reminders(self, request, queryset):
        count = queryset.update(status='active')
        self.message_user(request, f'{count} reminders activated.')
    
    @admin.action(description='⏸️ Pause selected reminders')
    def pause_reminders(self, request, queryset):
        count = queryset.update(status='paused')
        self.message_user(request, f'{count} reminders paused.')
    
    @admin.action(description='📥 Export to CSV')
    def export_reminders_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="medicine_reminders.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['User', 'Medicine', 'Dosage', 'Times', 'Start', 'End', 'Status'])
        
        for reminder in queryset.select_related('user'):
            writer.writerow([
                reminder.user.phone,
                reminder.medicine_name,
                reminder.dosage or '',
                ', '.join(reminder.reminder_times) if reminder.reminder_times else '',
                reminder.start_date,
                reminder.end_date or 'Ongoing',
                reminder.status
            ])
        
        return response


@admin.register(ReminderLog)
class ReminderLogAdmin(admin.ModelAdmin):
    """Admin for reminder logs - Track medication adherence."""
    
    list_display = [
        'medicine_display',
        'user_link',
        'scheduled_date',
        'scheduled_time',
        'response_display',
        'response_time_display',
        'snooze_display',
    ]
    list_filter = [
        ReminderLogFilter,
        'response',
        'scheduled_date',
    ]
    search_fields = [
        'reminder__medicine_name',
        'reminder__user__phone',  # ✅ FIXED
    ]
    ordering = ['-scheduled_date', '-scheduled_time']
    readonly_fields = [
        'id', 'reminder', 'scheduled_date', 'scheduled_time',
        'notification_sent_at', 'created_at', 'updated_at'
    ]
    date_hierarchy = 'scheduled_date'
    list_select_related = ['reminder', 'reminder__user']
    list_per_page = 50
    actions = ['export_logs_csv', 'export_adherence_report']
    
    @admin.display(description='Medicine')
    def medicine_display(self, obj):
        return format_html(
            '<span style="font-weight: bold;">{}</span>',
            obj.reminder.medicine_name[:30]
        )
    
    @admin.display(description='User')
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.reminder.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.reminder.user.phone)  # ✅ FIXED
    
    @admin.display(description='Response')
    def response_display(self, obj):
        return response_badge(obj.response)
    
    @admin.display(description='Response Time')
    def response_time_display(self, obj):
        if obj.responded_at:
            return obj.responded_at.strftime('%H:%M')
        return format_html('<span style="color: #bdc3c7;">-</span>')
    
    @admin.display(description='Snoozes')
    def snooze_display(self, obj):
        if obj.snooze_count and obj.snooze_count > 0:
            color = '#f39c12' if obj.snooze_count <= 2 else '#e74c3c'
            return format_html(
                '<span style="color: {};">💤 ×{}</span>',
                color, obj.snooze_count
            )
        return '-'
    
    @admin.action(description='📥 Export to CSV')
    def export_logs_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="reminder_logs.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['User', 'Medicine', 'Date', 'Time', 'Response', 'Responded At', 'Snoozes'])
        
        for log in queryset.select_related('reminder', 'reminder__user'):
            writer.writerow([
                log.reminder.user.phone,
                log.reminder.medicine_name,
                log.scheduled_date,
                log.scheduled_time,
                log.response,
                log.responded_at.strftime('%Y-%m-%d %H:%M') if log.responded_at else '',
                log.snooze_count or 0
            ])
        
        return response
    
    @admin.action(description='📊 Export adherence report')
    def export_adherence_report(self, request, queryset):
        """Export adherence summary by user."""
        from django.db.models import Count, Q
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="adherence_report.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['User', 'Total Reminders', 'Taken', 'Missed', 'Skipped', 'Adherence %'])
        
        # Group by user
        users = queryset.values('reminder__user__phone').annotate(
            total=Count('id'),
            taken=Count('id', filter=Q(response='taken')),
            missed=Count('id', filter=Q(response='missed')),
            skipped=Count('id', filter=Q(response='skipped'))
        )
        
        for user in users:
            adherence = (user['taken'] / user['total'] * 100) if user['total'] > 0 else 0
            writer.writerow([
                user['reminder__user__phone'],
                user['total'],
                user['taken'],
                user['missed'],
                user['skipped'],
                f'{adherence:.1f}%'
            ])
        
        return response


@admin.register(MedicineSearchHistory)
class MedicineSearchHistoryAdmin(admin.ModelAdmin):
    """Admin for medicine search history - Analytics."""
    
    list_display = [
        'user_link',
        'search_query',
        'results_count_display',
        'medicine_selected',
        'searched_at',
    ]
    list_filter = [
        'searched_at',
    ]
    search_fields = [
        'search_query',
        'user__phone',  # ✅ FIXED
    ]
    ordering = ['-searched_at']
    readonly_fields = ['id', 'user', 'search_query', 'medicine_found', 'results_count', 'searched_at']
    date_hierarchy = 'searched_at'
    list_select_related = ['user', 'medicine_found']
    list_per_page = 50
    
    @admin.display(description='User')
    def user_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.phone)  # ✅ FIXED
    
    @admin.display(description='Results')
    def results_count_display(self, obj):
        if obj.results_count == 0:
            return format_html('<span style="color: #e74c3c;">No results</span>')
        return format_html('<span style="color: #27ae60;">{} found</span>', obj.results_count)
    
    @admin.display(description='Selected')
    def medicine_selected(self, obj):
        if obj.medicine_found:
            url = reverse('admin:medicine_medicine_change', args=[obj.medicine_found.pk])
            return format_html('<a href="{}">{}</a>', url, obj.medicine_found.name[:25])
        return format_html('<span style="color: #bdc3c7;">None</span>')