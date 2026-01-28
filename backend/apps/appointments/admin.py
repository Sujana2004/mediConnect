"""
Appointments App Admin Configuration for MediConnect.

Admin interfaces for:
1. DoctorSchedule - Weekly schedule management
2. ScheduleException - Leaves and modified hours
3. TimeSlot - Time slot viewing and management
4. Appointment - Appointment management
5. AppointmentQueue - Queue management
6. AppointmentReminder - Reminder tracking
"""

from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from django.db.models import Count, Q

from .models import (
    DoctorSchedule,
    ScheduleException,
    TimeSlot,
    Appointment,
    AppointmentQueue,
    AppointmentReminder,
)


# =============================================================================
# INLINE ADMINS
# =============================================================================

class AppointmentQueueInline(admin.TabularInline):
    """Inline admin for appointment queue."""
    
    model = AppointmentQueue
    extra = 0
    readonly_fields = [
        'queue_number',
        'queue_date',
        'status',
        'checked_in_at',
        'called_at',
        'consultation_started_at',
        'completed_at',
        'wait_time_display',
    ]
    
    def wait_time_display(self, obj):
        """Display wait time."""
        if obj:
            return f"{obj.wait_time_minutes} minutes"
        return "-"
    wait_time_display.short_description = "Wait Time"


class AppointmentReminderInline(admin.TabularInline):
    """Inline admin for appointment reminders."""
    
    model = AppointmentReminder
    extra = 0
    readonly_fields = [
        'reminder_type',
        'scheduled_time',
        'status',
        'sent_at',
        'error_message',
    ]


# =============================================================================
# DOCTOR SCHEDULE ADMIN
# =============================================================================

@admin.register(DoctorSchedule)
class DoctorScheduleAdmin(admin.ModelAdmin):
    """Admin for doctor schedules."""
    
    list_display = [
        'doctor_name',
        'day_display',
        'time_range',
        'break_time',
        'slot_duration_minutes',
        'max_patients_per_slot',
        'consultation_fee',
        'is_active',
    ]
    
    list_filter = [
        'is_active',
        'day_of_week',
        'slot_duration_minutes',
    ]
    
    search_fields = [
        'doctor__phone_number',
        'doctor__first_name',
        'doctor__last_name',
    ]
    
    ordering = ['doctor', 'day_of_week']
    
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Doctor Information', {
            'fields': ('id', 'doctor')
        }),
        ('Schedule', {
            'fields': (
                'day_of_week',
                ('start_time', 'end_time'),
                ('break_start', 'break_end'),
            )
        }),
        ('Slot Configuration', {
            'fields': (
                'slot_duration_minutes',
                'max_patients_per_slot',
                'consultation_fee',
            )
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def doctor_name(self, obj):
        """Get doctor's full name."""
        return obj.doctor.get_full_name()
    doctor_name.short_description = "Doctor"
    doctor_name.admin_order_field = "doctor__first_name"
    
    def day_display(self, obj):
        """Display day name."""
        return obj.get_day_name()
    day_display.short_description = "Day"
    day_display.admin_order_field = "day_of_week"
    
    def time_range(self, obj):
        """Display time range."""
        return f"{obj.start_time.strftime('%I:%M %p')} - {obj.end_time.strftime('%I:%M %p')}"
    time_range.short_description = "Working Hours"
    
    def break_time(self, obj):
        """Display break time."""
        if obj.break_start and obj.break_end:
            return f"{obj.break_start.strftime('%I:%M %p')} - {obj.break_end.strftime('%I:%M %p')}"
        return "-"
    break_time.short_description = "Break Time"


# =============================================================================
# SCHEDULE EXCEPTION ADMIN
# =============================================================================

@admin.register(ScheduleException)
class ScheduleExceptionAdmin(admin.ModelAdmin):
    """Admin for schedule exceptions."""
    
    list_display = [
        'doctor_name',
        'exception_date',
        'exception_type',
        'time_range',
        'reason',
        'is_upcoming',
    ]
    
    list_filter = [
        'exception_type',
        'exception_date',
    ]
    
    search_fields = [
        'doctor__phone_number',
        'doctor__first_name',
        'doctor__last_name',
        'reason',
    ]
    
    ordering = ['-exception_date']
    
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    date_hierarchy = 'exception_date'
    
    fieldsets = (
        ('Doctor Information', {
            'fields': ('id', 'doctor')
        }),
        ('Exception Details', {
            'fields': (
                'exception_date',
                'exception_type',
                ('start_time', 'end_time'),
                'reason',
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def doctor_name(self, obj):
        """Get doctor's full name."""
        return obj.doctor.get_full_name()
    doctor_name.short_description = "Doctor"
    
    def time_range(self, obj):
        """Display time range for modified/extra."""
        if obj.start_time and obj.end_time:
            return f"{obj.start_time.strftime('%I:%M %p')} - {obj.end_time.strftime('%I:%M %p')}"
        return "-"
    time_range.short_description = "Modified Hours"
    
    def is_upcoming(self, obj):
        """Check if exception is upcoming."""
        if obj.exception_date >= timezone.now().date():
            return format_html('<span style="color: green;">✓ Yes</span>')
        return format_html('<span style="color: gray;">✗ Past</span>')
    is_upcoming.short_description = "Upcoming"


# =============================================================================
# TIME SLOT ADMIN
# =============================================================================

@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    """Admin for time slots."""
    
    list_display = [
        'doctor_name',
        'slot_date',
        'time_range',
        'status',
        'booking_info',
        'is_available_display',
    ]
    
    list_filter = [
        'status',
        'slot_date',
    ]
    
    search_fields = [
        'doctor__phone_number',
        'doctor__first_name',
        'doctor__last_name',
    ]
    
    ordering = ['-slot_date', 'start_time']
    
    readonly_fields = ['id', 'created_at', 'updated_at', 'is_available', 'remaining_capacity']
    
    date_hierarchy = 'slot_date'
    
    list_per_page = 50
    
    fieldsets = (
        ('Doctor Information', {
            'fields': ('id', 'doctor')
        }),
        ('Slot Details', {
            'fields': (
                'slot_date',
                ('start_time', 'end_time'),
                'status',
            )
        }),
        ('Booking Information', {
            'fields': (
                'max_bookings',
                'current_bookings',
                'is_available',
                'remaining_capacity',
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_available', 'mark_blocked']
    
    def doctor_name(self, obj):
        """Get doctor's full name."""
        return obj.doctor.get_full_name()
    doctor_name.short_description = "Doctor"
    
    def time_range(self, obj):
        """Display time range."""
        return f"{obj.start_time.strftime('%I:%M %p')} - {obj.end_time.strftime('%I:%M %p')}"
    time_range.short_description = "Time"
    
    def booking_info(self, obj):
        """Display booking information."""
        return f"{obj.current_bookings}/{obj.max_bookings}"
    booking_info.short_description = "Booked/Max"
    
    def is_available_display(self, obj):
        """Display availability status."""
        if obj.is_available:
            return format_html('<span style="color: green;">✓ Available</span>')
        return format_html('<span style="color: red;">✗ Unavailable</span>')
    is_available_display.short_description = "Available"
    
    @admin.action(description="Mark selected slots as available")
    def mark_available(self, request, queryset):
        """Mark slots as available."""
        updated = queryset.filter(current_bookings=0).update(status='available')
        self.message_user(request, f"{updated} slots marked as available.")
    
    @admin.action(description="Mark selected slots as blocked")
    def mark_blocked(self, request, queryset):
        """Mark slots as blocked."""
        updated = queryset.filter(current_bookings=0).update(status='blocked')
        self.message_user(request, f"{updated} slots marked as blocked.")


# =============================================================================
# APPOINTMENT ADMIN
# =============================================================================

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    """Admin for appointments."""
    
    list_display = [
        'id_short',
        'patient_name',
        'doctor_name',
        'appointment_date',
        'start_time',
        'status_display',
        'booking_type',
        'created_at',
    ]
    
    list_filter = [
        'status',
        'booking_type',
        'appointment_date',
    ]
    
    search_fields = [
        'id',
        'patient__phone_number',
        'patient__first_name',
        'patient__last_name',
        'doctor__phone_number',
        'doctor__first_name',
        'doctor__last_name',
        'reason',
    ]
    
    ordering = ['-appointment_date', 'start_time']
    
    readonly_fields = [
        'id',
        'created_at',
        'updated_at',
        'confirmed_at',
        'checked_in_at',
        'started_at',
        'completed_at',
        'cancelled_at',
        'is_upcoming',
        'is_past',
        'can_cancel',
        'can_reschedule',
    ]
    
    date_hierarchy = 'appointment_date'
    
    list_per_page = 25
    
    inlines = [AppointmentQueueInline, AppointmentReminderInline]
    
    fieldsets = (
        ('Appointment ID', {
            'fields': ('id',)
        }),
        ('Participants', {
            'fields': ('patient', 'doctor')
        }),
        ('Schedule', {
            'fields': (
                'time_slot',
                'appointment_date',
                ('start_time', 'end_time'),
            )
        }),
        ('Status', {
            'fields': (
                'status',
                'booking_type',
                ('is_upcoming', 'is_past'),
                ('can_cancel', 'can_reschedule'),
            )
        }),
        ('Details', {
            'fields': (
                'reason',
                'symptoms',
                'patient_notes',
                'doctor_notes',
            )
        }),
        ('Cancellation/Rescheduling', {
            'fields': (
                'cancellation_reason',
                'cancelled_by',
                'rescheduled_from',
            ),
            'classes': ('collapse',)
        }),
        ('Consultation', {
            'fields': (
                'consultation_fee',
                'prescription_id',
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': (
                'confirmed_at',
                'checked_in_at',
                'started_at',
                'completed_at',
                'cancelled_at',
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',)
        }),
        ('Reminders', {
            'fields': (
                'reminder_24h_sent',
                'reminder_1h_sent',
            ),
            'classes': ('collapse',)
        }),
    )
    
    actions = [
        'confirm_appointments',
        'cancel_appointments',
        'mark_no_show',
    ]
    
    def id_short(self, obj):
        """Display shortened ID."""
        return str(obj.id)[:8]
    id_short.short_description = "ID"
    
    def patient_name(self, obj):
        """Get patient's full name."""
        return obj.patient.get_full_name()
    patient_name.short_description = "Patient"
    patient_name.admin_order_field = "patient__first_name"
    
    def doctor_name(self, obj):
        """Get doctor's full name."""
        return obj.doctor.get_full_name()
    doctor_name.short_description = "Doctor"
    doctor_name.admin_order_field = "doctor__first_name"
    
    def status_display(self, obj):
        """Display status with color."""
        colors = {
            'pending': 'orange',
            'confirmed': 'blue',
            'checked_in': 'purple',
            'in_progress': 'teal',
            'completed': 'green',
            'cancelled': 'red',
            'no_show': 'gray',
            'rescheduled': 'brown',
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_display.short_description = "Status"
    status_display.admin_order_field = "status"
    
    @admin.action(description="Confirm selected appointments")
    def confirm_appointments(self, request, queryset):
        """Confirm pending appointments."""
        updated = queryset.filter(status='pending').update(
            status='confirmed',
            confirmed_at=timezone.now()
        )
        self.message_user(request, f"{updated} appointments confirmed.")
    
    @admin.action(description="Cancel selected appointments")
    def cancel_appointments(self, request, queryset):
        """Cancel appointments."""
        updated = queryset.exclude(
            status__in=['completed', 'cancelled', 'no_show']
        ).update(
            status='cancelled',
            cancelled_at=timezone.now(),
            cancelled_by='admin'
        )
        self.message_user(request, f"{updated} appointments cancelled.")
    
    @admin.action(description="Mark selected as no-show")
    def mark_no_show(self, request, queryset):
        """Mark appointments as no-show."""
        updated = queryset.filter(
            status__in=['pending', 'confirmed']
        ).update(status='no_show')
        self.message_user(request, f"{updated} appointments marked as no-show.")


# =============================================================================
# APPOINTMENT QUEUE ADMIN
# =============================================================================

@admin.register(AppointmentQueue)
class AppointmentQueueAdmin(admin.ModelAdmin):
    """Admin for appointment queue."""
    
    list_display = [
        'queue_number',
        'patient_name',
        'doctor_name',
        'queue_date',
        'status_display',
        'checked_in_at',
        'wait_time_display',
    ]
    
    list_filter = [
        'status',
        'queue_date',
    ]
    
    search_fields = [
        'appointment__patient__phone_number',
        'appointment__patient__first_name',
        'appointment__doctor__phone_number',
    ]
    
    ordering = ['-queue_date', 'queue_number']
    
    readonly_fields = [
        'id',
        'created_at',
        'updated_at',
        'wait_time_minutes',
    ]
    
    date_hierarchy = 'queue_date'
    
    list_per_page = 50
    
    fieldsets = (
        ('Queue Information', {
            'fields': ('id', 'appointment', 'queue_number', 'queue_date')
        }),
        ('Status', {
            'fields': (
                'status',
                'estimated_wait_minutes',
                'wait_time_minutes',
            )
        }),
        ('Timestamps', {
            'fields': (
                'checked_in_at',
                'called_at',
                'consultation_started_at',
                'completed_at',
                'created_at',
                'updated_at',
            )
        }),
    )
    
    actions = ['call_patients', 'skip_patients']
    
    def patient_name(self, obj):
        """Get patient's full name."""
        return obj.appointment.patient.get_full_name()
    patient_name.short_description = "Patient"
    
    def doctor_name(self, obj):
        """Get doctor's full name."""
        return obj.appointment.doctor.get_full_name()
    doctor_name.short_description = "Doctor"
    
    def status_display(self, obj):
        """Display status with color."""
        colors = {
            'waiting': 'orange',
            'called': 'blue',
            'in_consultation': 'purple',
            'completed': 'green',
            'skipped': 'red',
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_display.short_description = "Status"
    
    def wait_time_display(self, obj):
        """Display wait time."""
        return f"{obj.wait_time_minutes} min"
    wait_time_display.short_description = "Wait Time"
    
    @admin.action(description="Call selected patients")
    def call_patients(self, request, queryset):
        """Call waiting patients."""
        updated = queryset.filter(status='waiting').update(
            status='called',
            called_at=timezone.now()
        )
        self.message_user(request, f"{updated} patients called.")
    
    @admin.action(description="Skip selected patients")
    def skip_patients(self, request, queryset):
        """Skip patients."""
        updated = queryset.filter(
            status__in=['waiting', 'called']
        ).update(status='skipped')
        self.message_user(request, f"{updated} patients skipped.")


# =============================================================================
# APPOINTMENT REMINDER ADMIN
# =============================================================================

@admin.register(AppointmentReminder)
class AppointmentReminderAdmin(admin.ModelAdmin):
    """Admin for appointment reminders."""
    
    list_display = [
        'id_short',
        'patient_name',
        'reminder_type',
        'scheduled_time',
        'status_display',
        'sent_at',
    ]
    
    list_filter = [
        'status',
        'reminder_type',
        'scheduled_time',
    ]
    
    search_fields = [
        'appointment__patient__phone_number',
        'appointment__patient__first_name',
    ]
    
    ordering = ['-scheduled_time']
    
    readonly_fields = ['id', 'created_at']
    
    date_hierarchy = 'scheduled_time'
    
    list_per_page = 50
    
    fieldsets = (
        ('Reminder Information', {
            'fields': ('id', 'appointment', 'reminder_type')
        }),
        ('Schedule', {
            'fields': ('scheduled_time', 'status')
        }),
        ('Delivery', {
            'fields': ('sent_at', 'error_message')
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )
    
    actions = ['mark_sent', 'retry_failed']
    
    def id_short(self, obj):
        """Display shortened ID."""
        return str(obj.id)[:8]
    id_short.short_description = "ID"
    
    def patient_name(self, obj):
        """Get patient's full name."""
        return obj.appointment.patient.get_full_name()
    patient_name.short_description = "Patient"
    
    def status_display(self, obj):
        """Display status with color."""
        colors = {
            'pending': 'orange',
            'sent': 'green',
            'failed': 'red',
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_display.short_description = "Status"
    
    @admin.action(description="Mark selected as sent")
    def mark_sent(self, request, queryset):
        """Mark reminders as sent."""
        updated = queryset.filter(status='pending').update(
            status='sent',
            sent_at=timezone.now()
        )
        self.message_user(request, f"{updated} reminders marked as sent.")
    
    @admin.action(description="Retry failed reminders")
    def retry_failed(self, request, queryset):
        """Reset failed reminders to pending."""
        updated = queryset.filter(status='failed').update(
            status='pending',
            error_message=''
        )
        self.message_user(request, f"{updated} reminders reset for retry.")


# =============================================================================
# ADMIN SITE CUSTOMIZATION
# =============================================================================

# Add custom admin site header for appointments section
admin.site.site_header = "MediConnect Administration"
admin.site.site_title = "MediConnect Admin"
admin.site.index_title = "Welcome to MediConnect Admin Portal"