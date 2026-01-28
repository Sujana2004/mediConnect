"""
Medicine App Admin Configuration.

Provides admin interface for managing:
- Medicines
- Medicine Alternatives
- Drug Interactions
- User Prescriptions
- Prescription Medicines
- Medicine Reminders
- Reminder Logs
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Count

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


# =============================================================================
# MEDICINE ADMIN
# =============================================================================

@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    """Admin for medicines."""
    
    list_display = [
        'name',
        'name_generic',
        'medicine_type',
        'strength',
        'manufacturer',
        'mrp_display',
        'prescription_type_badge',
        'category',
        'is_generic',
        'is_verified',
        'is_active',
    ]
    list_filter = [
        'medicine_type',
        'prescription_type',
        'category',
        'is_generic',
        'is_habit_forming',
        'is_verified',
        'is_active',
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
    list_per_page = 50
    
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
        ('Side Effects & Warnings', {
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
    
    actions = ['mark_verified', 'mark_unverified', 'activate', 'deactivate']
    
    def mrp_display(self, obj):
        """Display MRP with currency."""
        if obj.mrp:
            return f"₹{obj.mrp}"
        return '-'
    mrp_display.short_description = 'MRP'
    mrp_display.admin_order_field = 'mrp'
    
    def prescription_type_badge(self, obj):
        """Display prescription type with color."""
        colors = {
            'otc': '#28a745',       # Green
            'prescription': '#ffc107',  # Yellow
            'controlled': '#dc3545',    # Red
        }
        color = colors.get(obj.prescription_type, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_prescription_type_display()
        )
    prescription_type_badge.short_description = 'Rx Type'
    
    def mark_verified(self, request, queryset):
        count = queryset.update(is_verified=True)
        self.message_user(request, f'{count} medicines marked as verified.')
    mark_verified.short_description = 'Mark as verified'
    
    def mark_unverified(self, request, queryset):
        count = queryset.update(is_verified=False)
        self.message_user(request, f'{count} medicines marked as unverified.')
    mark_unverified.short_description = 'Mark as unverified'
    
    def activate(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} medicines activated.')
    activate.short_description = 'Activate medicines'
    
    def deactivate(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} medicines deactivated.')
    deactivate.short_description = 'Deactivate medicines'


# =============================================================================
# MEDICINE ALTERNATIVE ADMIN
# =============================================================================

@admin.register(MedicineAlternative)
class MedicineAlternativeAdmin(admin.ModelAdmin):
    """Admin for medicine alternatives."""
    
    list_display = [
        'medicine_name',
        'alternative_name',
        'similarity_score',
        'price_difference_display',
        'is_verified',
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
    readonly_fields = ['id', 'created_at']
    autocomplete_fields = ['medicine', 'alternative']
    
    def medicine_name(self, obj):
        return obj.medicine.name
    medicine_name.short_description = 'Original Medicine'
    medicine_name.admin_order_field = 'medicine__name'
    
    def alternative_name(self, obj):
        return obj.alternative.name
    alternative_name.short_description = 'Alternative'
    alternative_name.admin_order_field = 'alternative__name'
    
    def price_difference_display(self, obj):
        if obj.price_difference_percent:
            if obj.price_difference_percent < 0:
                return format_html(
                    '<span style="color: green;">{}% cheaper</span>',
                    abs(obj.price_difference_percent)
                )
            else:
                return format_html(
                    '<span style="color: red;">{}% expensive</span>',
                    obj.price_difference_percent
                )
        return '-'
    price_difference_display.short_description = 'Price Difference'


# =============================================================================
# DRUG INTERACTION ADMIN
# =============================================================================

@admin.register(DrugInteraction)
class DrugInteractionAdmin(admin.ModelAdmin):
    """Admin for drug interactions."""
    
    list_display = [
        'medicine_1_name',
        'medicine_2_name',
        'severity_badge',
        'is_verified',
        'created_at',
    ]
    list_filter = [
        'severity',
        'is_verified',
    ]
    search_fields = [
        'medicine_1__name',
        'medicine_2__name',
        'description',
    ]
    ordering = ['-severity', '-created_at']
    readonly_fields = ['id', 'created_at', 'updated_at']
    autocomplete_fields = ['medicine_1', 'medicine_2']
    
    fieldsets = (
        ('Medicines', {
            'fields': ('medicine_1', 'medicine_2')
        }),
        ('Interaction Details', {
            'fields': (
                'severity', 'description', 'description_local',
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
    
    def medicine_1_name(self, obj):
        return obj.medicine_1.name
    medicine_1_name.short_description = 'Medicine 1'
    medicine_1_name.admin_order_field = 'medicine_1__name'
    
    def medicine_2_name(self, obj):
        return obj.medicine_2.name
    medicine_2_name.short_description = 'Medicine 2'
    medicine_2_name.admin_order_field = 'medicine_2__name'
    
    def severity_badge(self, obj):
        colors = {
            'mild': '#28a745',
            'moderate': '#ffc107',
            'severe': '#fd7e14',
            'contraindicated': '#dc3545',
        }
        color = colors.get(obj.severity, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_severity_display()
        )
    severity_badge.short_description = 'Severity'


# =============================================================================
# PRESCRIPTION ADMIN
# =============================================================================

class PrescriptionMedicineInline(admin.TabularInline):
    """Inline for prescription medicines."""
    model = PrescriptionMedicine
    extra = 1
    autocomplete_fields = ['medicine']
    fields = [
        'medicine_name', 'dosage', 'frequency', 'timing',
        'duration_days', 'is_active'
    ]


@admin.register(UserPrescription)
class UserPrescriptionAdmin(admin.ModelAdmin):
    """Admin for user prescriptions."""
    
    list_display = [
        'title',
        'user_phone',
        'doctor_name',
        'prescribed_date',
        'status_badge',
        'medicines_count',
        'is_expired_display',
    ]
    list_filter = [
        'status',
        'prescribed_date',
    ]
    search_fields = [
        'title',
        'user__phone_number',
        'user__first_name',
        'user__last_name',
        'doctor_name',
        'hospital_name',
        'diagnosis',
    ]
    ordering = ['-prescribed_date']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'prescribed_date'
    inlines = [PrescriptionMedicineInline]
    
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
    
    def user_phone(self, obj):
        return obj.user.phone_number
    user_phone.short_description = 'User'
    user_phone.admin_order_field = 'user__phone_number'
    
    def medicines_count(self, obj):
        return obj.medicines.count()
    medicines_count.short_description = 'Medicines'
    
    def status_badge(self, obj):
        colors = {
            'active': '#28a745',
            'completed': '#17a2b8',
            'discontinued': '#ffc107',
            'expired': '#6c757d',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def is_expired_display(self, obj):
        if obj.is_expired:
            return format_html('<span style="color: red;">Yes</span>')
        return format_html('<span style="color: green;">No</span>')
    is_expired_display.short_description = 'Expired'
    is_expired_display.boolean = True


# =============================================================================
# PRESCRIPTION MEDICINE ADMIN
# =============================================================================

@admin.register(PrescriptionMedicine)
class PrescriptionMedicineAdmin(admin.ModelAdmin):
    """Admin for prescription medicines."""
    
    list_display = [
        'medicine_name',
        'prescription_title',
        'dosage',
        'frequency',
        'timing',
        'duration_days',
        'is_active',
    ]
    list_filter = [
        'frequency',
        'timing',
        'is_active',
    ]
    search_fields = [
        'medicine_name',
        'prescription__title',
        'prescription__user__phone_number',
    ]
    ordering = ['-created_at']
    readonly_fields = ['id', 'created_at', 'updated_at']
    autocomplete_fields = ['medicine', 'prescription']
    
    def prescription_title(self, obj):
        return obj.prescription.title
    prescription_title.short_description = 'Prescription'
    prescription_title.admin_order_field = 'prescription__title'


# =============================================================================
# MEDICINE REMINDER ADMIN
# =============================================================================

@admin.register(MedicineReminder)
class MedicineReminderAdmin(admin.ModelAdmin):
    """Admin for medicine reminders."""
    
    list_display = [
        'medicine_name',
        'user_phone',
        'dosage',
        'times_display',
        'status_badge',
        'start_date',
        'end_date',
        'is_active_today',
    ]
    list_filter = [
        'status',
        'notify_family_helper',
        'allow_snooze',
        'start_date',
    ]
    search_fields = [
        'medicine_name',
        'user__phone_number',
        'user__first_name',
        'user__last_name',
    ]
    ordering = ['-created_at']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('User & Medicine', {
            'fields': (
                'user', 'prescription_medicine', 'medicine_name', 'dosage'
            )
        }),
        ('Schedule', {
            'fields': (
                'reminder_times', 'days_of_week', 'start_date', 'end_date'
            )
        }),
        ('Instructions', {
            'fields': ('instructions', 'instructions_local')
        }),
        ('Settings', {
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
    
    def user_phone(self, obj):
        return obj.user.phone_number
    user_phone.short_description = 'User'
    user_phone.admin_order_field = 'user__phone_number'
    
    def times_display(self, obj):
        if obj.reminder_times:
            return ', '.join(obj.reminder_times)
        return '-'
    times_display.short_description = 'Times'
    
    def status_badge(self, obj):
        colors = {
            'active': '#28a745',
            'paused': '#ffc107',
            'completed': '#17a2b8',
            'cancelled': '#6c757d',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def is_active_today(self, obj):
        return obj.is_active_today
    is_active_today.short_description = 'Active Today'
    is_active_today.boolean = True


# =============================================================================
# REMINDER LOG ADMIN
# =============================================================================

@admin.register(ReminderLog)
class ReminderLogAdmin(admin.ModelAdmin):
    """Admin for reminder logs."""
    
    list_display = [
        'medicine_name',
        'user_phone',
        'scheduled_date',
        'scheduled_time',
        'response_badge',
        'responded_at',
        'snooze_count',
    ]
    list_filter = [
        'response',
        'scheduled_date',
    ]
    search_fields = [
        'reminder__medicine_name',
        'reminder__user__phone_number',
    ]
    ordering = ['-scheduled_date', '-scheduled_time']
    readonly_fields = [
        'id', 'reminder', 'scheduled_date', 'scheduled_time',
        'notification_sent_at', 'created_at', 'updated_at'
    ]
    date_hierarchy = 'scheduled_date'
    
    def medicine_name(self, obj):
        return obj.reminder.medicine_name
    medicine_name.short_description = 'Medicine'
    medicine_name.admin_order_field = 'reminder__medicine_name'
    
    def user_phone(self, obj):
        return obj.reminder.user.phone_number
    user_phone.short_description = 'User'
    user_phone.admin_order_field = 'reminder__user__phone_number'
    
    def response_badge(self, obj):
        colors = {
            'pending': '#ffc107',
            'taken': '#28a745',
            'skipped': '#17a2b8',
            'snoozed': '#fd7e14',
            'missed': '#dc3545',
        }
        color = colors.get(obj.response, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_response_display()
        )
    response_badge.short_description = 'Response'


# =============================================================================
# SEARCH HISTORY ADMIN
# =============================================================================

@admin.register(MedicineSearchHistory)
class MedicineSearchHistoryAdmin(admin.ModelAdmin):
    """Admin for medicine search history."""
    
    list_display = [
        'user_phone',
        'search_query',
        'results_count',
        'medicine_found_name',
        'searched_at',
    ]
    list_filter = [
        'searched_at',
    ]
    search_fields = [
        'search_query',
        'user__phone_number',
    ]
    ordering = ['-searched_at']
    readonly_fields = ['id', 'user', 'search_query', 'medicine_found', 'results_count', 'searched_at']
    date_hierarchy = 'searched_at'
    
    def user_phone(self, obj):
        return obj.user.phone_number
    user_phone.short_description = 'User'
    user_phone.admin_order_field = 'user__phone_number'
    
    def medicine_found_name(self, obj):
        if obj.medicine_found:
            return obj.medicine_found.name
        return '-'
    medicine_found_name.short_description = 'Selected Medicine'