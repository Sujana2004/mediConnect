"""
Appointments App Admin Configuration (Enhanced)
================================================
Admin interfaces for appointment management with:
- Visual status indicators
- Performance optimization
- Today/upcoming filters
- Export functionality

CRITICAL FIX: Changed phone_number → phone throughout
"""

from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from django.db.models import Count, Q, F
from django.urls import reverse
from django.http import HttpResponse
import csv
from datetime import timedelta, date, time

from .models import (
    DoctorSchedule,
    ScheduleException,
    TimeSlot,
    Appointment,
    AppointmentQueue,
    AppointmentReminder,
)


# ============================================
# HELPER FUNCTIONS
# ============================================

def appointment_status_badge(status):
    """Generate badge for appointment status."""
    config = {
        'pending': ('#f39c12', '⏳', 'Pending'),
        'confirmed': ('#3498db', '✓', 'Confirmed'),
        'checked_in': ('#9b59b6', '📋', 'Checked In'),
        'in_progress': ('#1abc9c', '🏥', 'In Progress'),
        'completed': ('#27ae60', '✅', 'Completed'),
        'cancelled': ('#e74c3c', '✗', 'Cancelled'),
        'no_show': ('#7f8c8d', '👻', 'No Show'),
        'rescheduled': ('#e67e22', '🔄', 'Rescheduled'),
    }
    color, icon, text = config.get(status, ('#7f8c8d', '?', status))
    return format_html(
        '<span style="background-color: {}; color: white; padding: 3px 10px; '
        'border-radius: 12px; font-size: 11px; font-weight: bold;">{} {}</span>',
        color, icon, text
    )


def queue_status_badge(status):
    """Generate badge for queue status."""
    config = {
        'waiting': ('#f39c12', '⏳'),
        'called': ('#3498db', '📢'),
        'in_consultation': ('#9b59b6', '🏥'),
        'completed': ('#27ae60', '✅'),
        'skipped': ('#e74c3c', '⏭️'),
    }
    color, icon = config.get(status, ('#7f8c8d', '?'))
    return format_html(
        '<span style="background-color: {}; color: white; padding: 3px 10px; '
        'border-radius: 12px; font-size: 11px; font-weight: bold;">{} {}</span>',
        color, icon, (status or '').replace('_', ' ').title()
    )


def slot_status_badge(status, is_available):
    """Generate badge for slot status."""
    if status == 'blocked':
        return format_html('<span style="color: #e74c3c;">🚫 Blocked</span>')
    if not is_available:
        return format_html('<span style="color: #f39c12;">📅 Full</span>')
    return format_html('<span style="color: #27ae60;">✅ Available</span>')


def time_display(t):
    """Format time in 12-hour format."""
    if t:
        return t.strftime('%I:%M %p')
    return '-'


# ============================================
# CUSTOM FILTERS
# ============================================

class AppointmentDateFilter(admin.SimpleListFilter):
    """Filter appointments by date."""
    title = 'Appointment Date'
    parameter_name = 'apt_date'
    
    def lookups(self, request, model_admin):
        return (
            ('today', '📅 Today'),
            ('tomorrow', '📅 Tomorrow'),
            ('this_week', '📆 This Week'),
            ('next_week', '📆 Next Week'),
            ('past', '⏳ Past'),
        )
    
    def queryset(self, request, queryset):
        today = date.today()
        if self.value() == 'today':
            return queryset.filter(appointment_date=today)
        if self.value() == 'tomorrow':
            return queryset.filter(appointment_date=today + timedelta(days=1))
        if self.value() == 'this_week':
            week_end = today + timedelta(days=(6 - today.weekday()))
            return queryset.filter(appointment_date__gte=today, appointment_date__lte=week_end)
        if self.value() == 'next_week':
            next_week_start = today + timedelta(days=(7 - today.weekday()))
            next_week_end = next_week_start + timedelta(days=6)
            return queryset.filter(appointment_date__gte=next_week_start, appointment_date__lte=next_week_end)
        if self.value() == 'past':
            return queryset.filter(appointment_date__lt=today)


class AppointmentStatusFilter(admin.SimpleListFilter):
    """Filter appointments by status category."""
    title = 'Status Category'
    parameter_name = 'status_cat'
    
    def lookups(self, request, model_admin):
        return (
            ('active', '🟢 Active (Pending/Confirmed/In Progress)'),
            ('needs_attention', '🟡 Needs Attention'),
            ('completed', '✅ Completed'),
            ('cancelled', '❌ Cancelled/No-Show'),
        )
    
    def queryset(self, request, queryset):
        if self.value() == 'active':
            return queryset.filter(status__in=['pending', 'confirmed', 'checked_in', 'in_progress'])
        if self.value() == 'needs_attention':
            return queryset.filter(status='pending', appointment_date__lte=date.today())
        if self.value() == 'completed':
            return queryset.filter(status='completed')
        if self.value() == 'cancelled':
            return queryset.filter(status__in=['cancelled', 'no_show'])


class SlotDateFilter(admin.SimpleListFilter):
    """Filter slots by date."""
    title = 'Slot Date'
    parameter_name = 'slot_date_filter'
    
    def lookups(self, request, model_admin):
        return (
            ('today', '📅 Today'),
            ('tomorrow', '📅 Tomorrow'),
            ('this_week', '📆 This Week'),
            ('has_availability', '✅ Has Availability'),
        )
    
    def queryset(self, request, queryset):
        today = date.today()
        if self.value() == 'today':
            return queryset.filter(slot_date=today)
        if self.value() == 'tomorrow':
            return queryset.filter(slot_date=today + timedelta(days=1))
        if self.value() == 'this_week':
            week_end = today + timedelta(days=7)
            return queryset.filter(slot_date__gte=today, slot_date__lte=week_end)
        if self.value() == 'has_availability':
            return queryset.filter(
                status='available',
                current_bookings__lt=F('max_bookings')
            )


class QueueDateFilter(admin.SimpleListFilter):
    """Filter queue by date."""
    title = 'Queue Date'
    parameter_name = 'queue_date_filter'
    
    def lookups(self, request, model_admin):
        return (
            ('today', '📅 Today'),
            ('waiting_now', '⏳ Currently Waiting'),
        )
    
    def queryset(self, request, queryset):
        today = date.today()
        if self.value() == 'today':
            return queryset.filter(queue_date=today)
        if self.value() == 'waiting_now':
            return queryset.filter(queue_date=today, status='waiting')


# ============================================
# INLINE ADMINS
# ============================================

class AppointmentQueueInline(admin.TabularInline):
    """Inline admin for appointment queue."""
    model = AppointmentQueue
    extra = 0
    readonly_fields = [
        'queue_number', 'queue_date', 'status',
        'checked_in_at', 'called_at', 'consultation_started_at',
        'completed_at', 'wait_time_display',
    ]
    fields = [
        'queue_number', 'status', 'checked_in_at', 
        'called_at', 'wait_time_display'
    ]
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False
    
    def wait_time_display(self, obj):
        if obj and obj.wait_time_minutes:
            mins = obj.wait_time_minutes
            if mins > 30:
                color = '#e74c3c'
            elif mins > 15:
                color = '#f39c12'
            else:
                color = '#27ae60'
            return format_html('<span style="color: {};">{} min</span>', color, mins)
        return "-"
    wait_time_display.short_description = "Wait Time"


class AppointmentReminderInline(admin.TabularInline):
    """Inline admin for appointment reminders."""
    model = AppointmentReminder
    extra = 0
    readonly_fields = [
        'reminder_type', 'scheduled_time', 'status_badge_inline',
        'sent_at', 'error_message',
    ]
    fields = ['reminder_type', 'scheduled_time', 'status_badge_inline', 'sent_at']
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False
    
    def status_badge_inline(self, obj):
        config = {
            'pending': ('#f39c12', '⏳'),
            'sent': ('#27ae60', '✓'),
            'failed': ('#e74c3c', '✗'),
        }
        color, icon = config.get(obj.status, ('#7f8c8d', '?'))
        return format_html('<span style="color: {};">{} {}</span>', color, icon, obj.status.title())
    status_badge_inline.short_description = "Status"


class DoctorScheduleInline(admin.TabularInline):
    """Inline for doctor's weekly schedule."""
    model = DoctorSchedule
    extra = 0
    fields = ['day_of_week', 'start_time', 'end_time', 'slot_duration_minutes', 'is_active']
    ordering = ['day_of_week']


# ============================================
# MAIN ADMIN CLASSES
# ============================================

@admin.register(DoctorSchedule)
class DoctorScheduleAdmin(admin.ModelAdmin):
    """Admin for doctor schedules."""
    
    list_display = [
        'doctor_link',
        'day_badge',
        'time_range_display',
        'break_display',
        'slot_config_display',
        'fee_display',
        'active_badge',
    ]
    list_filter = [
        'is_active',
        'day_of_week',
        'slot_duration_minutes',
    ]
    search_fields = [
        'doctor__phone',  # ✅ FIXED
        'doctor__first_name',
        'doctor__last_name',
    ]
    ordering = ['doctor', 'day_of_week']
    readonly_fields = ['id', 'created_at', 'updated_at']
    list_select_related = ['doctor']  # ✅ Performance
    list_per_page = 30
    actions = ['activate_schedules', 'deactivate_schedules', 'export_schedules_csv']
    
    fieldsets = (
        ('Doctor', {
            'fields': ('doctor',)
        }),
        ('📅 Schedule', {
            'fields': (
                'day_of_week',
                ('start_time', 'end_time'),
                ('break_start', 'break_end'),
            )
        }),
        ('⚙️ Slot Configuration', {
            'fields': (
                'slot_duration_minutes',
                'max_patients_per_slot',
                'consultation_fee',
            )
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Doctor')
    def doctor_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.doctor.pk])
        name = obj.doctor.get_full_name() or obj.doctor.phone
        return format_html('<a href="{}">{}</a>', url, name)
    
    @admin.display(description='Day')
    def day_badge(self, obj):
        day_colors = {
            0: '#3498db',  # Monday
            1: '#27ae60',  # Tuesday
            2: '#9b59b6',  # Wednesday
            3: '#e67e22',  # Thursday
            4: '#1abc9c',  # Friday
            5: '#e74c3c',  # Saturday
            6: '#c0392b',  # Sunday
        }
        color = day_colors.get(obj.day_of_week, '#7f8c8d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px;">{}</span>',
            color, obj.get_day_name()
        )
    
    @admin.display(description='Working Hours')
    def time_range_display(self, obj):
        return format_html(
            '<span style="font-family: monospace;">{} - {}</span>',
            time_display(obj.start_time), time_display(obj.end_time)
        )
    
    @admin.display(description='Break')
    def break_display(self, obj):
        if obj.break_start and obj.break_end:
            return format_html(
                '<span style="color: #7f8c8d;">☕ {} - {}</span>',
                time_display(obj.break_start), time_display(obj.break_end)
            )
        return format_html('<span style="color: #bdc3c7;">No break</span>')
    
    @admin.display(description='Slots')
    def slot_config_display(self, obj):
        return format_html(
            '<span title="{}min slots, max {} patients">⏱️ {}min | 👥 {}</span>',
            obj.slot_duration_minutes, obj.max_patients_per_slot,
            obj.slot_duration_minutes, obj.max_patients_per_slot
        )
    
    @admin.display(description='Fee')
    def fee_display(self, obj):
        if obj.consultation_fee:
            return format_html('<span style="color: #27ae60; font-weight: bold;">₹{}</span>', obj.consultation_fee)
        return '-'
    
    @admin.display(description='Active')
    def active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color: #27ae60;">● Active</span>')
        return format_html('<span style="color: #e74c3c;">○ Inactive</span>')
    
    @admin.action(description='✅ Activate selected schedules')
    def activate_schedules(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} schedules activated.')
    
    @admin.action(description='❌ Deactivate selected schedules')
    def deactivate_schedules(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} schedules deactivated.')
    
    @admin.action(description='📥 Export to CSV')
    def export_schedules_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="doctor_schedules.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Doctor', 'Phone', 'Day', 'Start', 'End', 'Break Start', 'Break End', 'Duration', 'Max Patients', 'Fee', 'Active'])
        
        for sched in queryset.select_related('doctor'):
            writer.writerow([
                sched.doctor.get_full_name(),
                sched.doctor.phone,
                sched.get_day_name(),
                sched.start_time,
                sched.end_time,
                sched.break_start or '',
                sched.break_end or '',
                sched.slot_duration_minutes,
                sched.max_patients_per_slot,
                sched.consultation_fee or '',
                sched.is_active
            ])
        
        return response


@admin.register(ScheduleException)
class ScheduleExceptionAdmin(admin.ModelAdmin):
    """Admin for schedule exceptions (leaves, modified hours)."""
    
    list_display = [
        'doctor_link',
        'exception_date',
        'type_badge',
        'time_range_display',
        'reason_short',
        'status_display',
    ]
    list_filter = [
        'exception_type',
        'exception_date',
    ]
    search_fields = [
        'doctor__phone',  # ✅ FIXED
        'doctor__first_name',
        'doctor__last_name',
        'reason',
    ]
    ordering = ['-exception_date']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'exception_date'
    list_select_related = ['doctor']  # ✅ Performance
    list_per_page = 30
    actions = ['delete_past_exceptions']
    
    fieldsets = (
        ('Doctor', {
            'fields': ('doctor',)
        }),
        ('Exception Details', {
            'fields': (
                'exception_date',
                'exception_type',
                ('start_time', 'end_time'),
                'reason',
            )
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Doctor')
    def doctor_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.doctor.pk])
        return format_html('<a href="{}">{}</a>', url, obj.doctor.get_full_name())
    
    @admin.display(description='Type')
    def type_badge(self, obj):
        config = {
            'leave': ('#e74c3c', '🏖️'),
            'holiday': ('#9b59b6', '🎉'),
            'modified': ('#f39c12', '🔧'),
            'extra': ('#27ae60', '➕'),
        }
        color, icon = config.get(obj.exception_type, ('#7f8c8d', '?'))
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px;">{} {}</span>',
            color, icon, obj.exception_type.title()
        )
    
    @admin.display(description='Modified Hours')
    def time_range_display(self, obj):
        if obj.start_time and obj.end_time:
            return format_html(
                '<span style="font-family: monospace;">{} - {}</span>',
                time_display(obj.start_time), time_display(obj.end_time)
            )
        return format_html('<span style="color: #7f8c8d;">Full Day</span>')
    
    @admin.display(description='Reason')
    def reason_short(self, obj):
        if obj.reason:
            return obj.reason[:30] + ('...' if len(obj.reason) > 30 else '')
        return '-'
    
    @admin.display(description='Status')
    def status_display(self, obj):
        today = date.today()
        if obj.exception_date > today:
            return format_html('<span style="color: #3498db;">📅 Upcoming</span>')
        elif obj.exception_date == today:
            return format_html('<span style="color: #e74c3c; font-weight: bold;">🔴 TODAY</span>')
        return format_html('<span style="color: #7f8c8d;">⏳ Past</span>')
    
    @admin.action(description='🗑️ Delete past exceptions')
    def delete_past_exceptions(self, request, queryset):
        today = date.today()
        deleted, _ = queryset.filter(exception_date__lt=today).delete()
        self.message_user(request, f'{deleted} past exceptions deleted.')


@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    """Admin for time slots."""
    
    list_display = [
        'doctor_link',
        'slot_date',
        'time_range_display',
        'status_display',
        'booking_progress',
        'capacity_display',
    ]
    list_filter = [
        SlotDateFilter,
        'status',
        'slot_date',
    ]
    search_fields = [
        'doctor__phone',  # ✅ FIXED
        'doctor__first_name',
        'doctor__last_name',
    ]
    ordering = ['-slot_date', 'start_time']
    readonly_fields = ['id', 'created_at', 'updated_at', 'is_available', 'remaining_capacity']
    date_hierarchy = 'slot_date'
    list_select_related = ['doctor']  # ✅ Performance
    list_per_page = 50
    actions = ['mark_available', 'mark_blocked', 'export_slots_csv']
    
    fieldsets = (
        ('Doctor', {
            'fields': ('doctor',)
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
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Doctor')
    def doctor_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.doctor.pk])
        return format_html('<a href="{}">{}</a>', url, obj.doctor.get_full_name())
    
    @admin.display(description='Time')
    def time_range_display(self, obj):
        return format_html(
            '<span style="font-family: monospace;">{} - {}</span>',
            time_display(obj.start_time), time_display(obj.end_time)
        )
    
    @admin.display(description='Status')
    def status_display(self, obj):
        return slot_status_badge(obj.status, obj.is_available)
    
    @admin.display(description='Bookings')
    def booking_progress(self, obj):
        if obj.max_bookings == 0:
            return '-'
        
        pct = (obj.current_bookings / obj.max_bookings) * 100
        if pct >= 100:
            color = '#e74c3c'
        elif pct >= 75:
            color = '#f39c12'
        else:
            color = '#27ae60'
        
        return format_html(
            '<div style="width: 80px; background: #ecf0f1; border-radius: 4px; overflow: hidden;">'
            '<div style="width: {}%; background: {}; height: 18px; text-align: center; '
            'color: white; font-size: 10px; line-height: 18px;">{}/{}</div></div>',
            min(pct, 100), color, obj.current_bookings, obj.max_bookings
        )
    
    @admin.display(description='Available')
    def capacity_display(self, obj):
        remaining = obj.remaining_capacity
        if remaining > 0:
            return format_html('<span style="color: #27ae60; font-weight: bold;">{} left</span>', remaining)
        return format_html('<span style="color: #e74c3c;">Full</span>')
    
    @admin.action(description='✅ Mark as available')
    def mark_available(self, request, queryset):
        updated = queryset.filter(current_bookings=0).update(status='available')
        self.message_user(request, f"{updated} slots marked as available.")
    
    @admin.action(description='🚫 Mark as blocked')
    def mark_blocked(self, request, queryset):
        updated = queryset.filter(current_bookings=0).update(status='blocked')
        self.message_user(request, f"{updated} slots marked as blocked.")
    
    @admin.action(description='📥 Export to CSV')
    def export_slots_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="time_slots.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Doctor', 'Date', 'Start', 'End', 'Status', 'Booked', 'Max', 'Available'])
        
        for slot in queryset.select_related('doctor'):
            writer.writerow([
                slot.doctor.get_full_name(),
                slot.slot_date,
                slot.start_time,
                slot.end_time,
                slot.status,
                slot.current_bookings,
                slot.max_bookings,
                slot.is_available
            ])
        
        return response


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    """Admin for appointments - Main management interface."""
    
    list_display = [
        'id_short',
        'patient_link',
        'doctor_link',
        'date_time_display',
        'status_display',
        'booking_type_badge',
        'queue_info',
        'created_at',
    ]
    list_filter = [
        AppointmentDateFilter,
        AppointmentStatusFilter,
        'status',
        'booking_type',
        'appointment_date',
    ]
    search_fields = [
        'id',
        'patient__phone',  # ✅ FIXED
        'patient__first_name',
        'patient__last_name',
        'doctor__phone',  # ✅ FIXED
        'doctor__first_name',
        'doctor__last_name',
        'reason',
    ]
    ordering = ['-appointment_date', 'start_time']
    readonly_fields = [
        'id', 'created_at', 'updated_at',
        'confirmed_at', 'checked_in_at', 'started_at',
        'completed_at', 'cancelled_at',
        'is_upcoming', 'is_past', 'can_cancel', 'can_reschedule',
    ]
    date_hierarchy = 'appointment_date'
    list_select_related = ['patient', 'doctor', 'time_slot']  # ✅ Performance
    list_per_page = 25
    inlines = [AppointmentQueueInline, AppointmentReminderInline]
    actions = [
        'confirm_appointments', 'cancel_appointments', 
        'mark_no_show', 'mark_completed', 'export_appointments_csv'
    ]
    
    fieldsets = (
        ('Appointment', {
            'fields': ('id',)
        }),
        ('👥 Participants', {
            'fields': ('patient', 'doctor')
        }),
        ('📅 Schedule', {
            'fields': (
                'time_slot',
                'appointment_date',
                ('start_time', 'end_time'),
            )
        }),
        ('📊 Status', {
            'fields': (
                'status',
                'booking_type',
                ('is_upcoming', 'is_past'),
                ('can_cancel', 'can_reschedule'),
            )
        }),
        ('📝 Details', {
            'fields': (
                'reason',
                'symptoms',
                'patient_notes',
                'doctor_notes',
            )
        }),
        ('❌ Cancellation/Rescheduling', {
            'fields': (
                'cancellation_reason',
                'cancelled_by',
                'rescheduled_from',
            ),
            'classes': ('collapse',)
        }),
        ('💰 Consultation', {
            'fields': (
                'consultation_fee',
                'prescription_id',
            ),
            'classes': ('collapse',)
        }),
        ('⏰ Timestamps', {
            'fields': (
                'confirmed_at', 'checked_in_at', 'started_at',
                'completed_at', 'cancelled_at',
                'created_at', 'updated_at',
            ),
            'classes': ('collapse',)
        }),
        ('🔔 Reminders', {
            'fields': ('reminder_24h_sent', 'reminder_1h_sent'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'patient', 'doctor', 'time_slot','queue_entry'
        )
    
    @admin.display(description='ID')
    def id_short(self, obj):
        return format_html(
            '<code style="background: #f8f9fa; padding: 2px 6px; border-radius: 4px;">{}</code>',
            str(obj.id)[:8]
        )
    
    @admin.display(description='Patient')
    def patient_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.patient.pk])
        name = obj.patient.get_full_name() or obj.patient.phone
        return format_html('<a href="{}">{}</a>', url, name)
    
    @admin.display(description='Doctor')
    def doctor_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.doctor.pk])
        name = obj.doctor.get_full_name() or obj.doctor.phone
        return format_html('<a href="{}">Dr. {}</a>', url, name)
    
    @admin.display(description='Date & Time')
    def date_time_display(self, obj):
        today = date.today()
        date_str = obj.appointment_date.strftime('%Y-%m-%d')
        time_str = time_display(obj.start_time)
        
        if obj.appointment_date == today:
            return format_html(
                '<span style="color: #e74c3c; font-weight: bold;">📅 TODAY {}</span>',
                time_str
            )
        elif obj.appointment_date == today + timedelta(days=1):
            return format_html(
                '<span style="color: #f39c12;">📅 Tomorrow {}</span>',
                time_str
            )
        elif obj.appointment_date < today:
            return format_html(
                '<span style="color: #7f8c8d;">{} {}</span>',
                date_str, time_str
            )
        return format_html('{} {}', date_str, time_str)
    
    @admin.display(description='Status')
    def status_display(self, obj):
        return appointment_status_badge(obj.status)
    
    @admin.display(description='Type')
    def booking_type_badge(self, obj):
        type_config = {
            'walk_in': ('#7f8c8d', '🚶'),
            'scheduled': ('#3498db', '📅'),
            'emergency': ('#e74c3c', '🚨'),
            'follow_up': ('#27ae60', '🔄'),
        }
        color, icon = type_config.get(obj.booking_type, ('#7f8c8d', '?'))
        return format_html(
            '<span style="color: {};">{} {}</span>',
            color, icon, obj.booking_type.replace('_', ' ').title()
        )
    
    @admin.display(description='Queue')
    def queue_info(self, obj):
        try:
            queue = obj.queue_entry
            if queue:
                return format_html(
                    '<span title="Queue #{}"># {}</span>',
                    queue.queue_number, queue.queue_number
                )
        except AppointmentQueue.DoesNotExist:
            pass
        return '-'
    
    @admin.action(description='✅ Confirm selected appointments')
    def confirm_appointments(self, request, queryset):
        updated = queryset.filter(status='pending').update(
            status='confirmed',
            confirmed_at=timezone.now()
        )
        self.message_user(request, f"{updated} appointments confirmed.")
    
    @admin.action(description='❌ Cancel selected appointments')
    def cancel_appointments(self, request, queryset):
        updated = queryset.exclude(
            status__in=['completed', 'cancelled', 'no_show']
        ).update(
            status='cancelled',
            cancelled_at=timezone.now(),
            cancelled_by='admin'
        )
        self.message_user(request, f"{updated} appointments cancelled.")
    
    @admin.action(description='👻 Mark as no-show')
    def mark_no_show(self, request, queryset):
        updated = queryset.filter(
            status__in=['pending', 'confirmed']
        ).update(status='no_show')
        self.message_user(request, f"{updated} appointments marked as no-show.")
    
    @admin.action(description='✅ Mark as completed')
    def mark_completed(self, request, queryset):
        updated = queryset.filter(
            status__in=['confirmed', 'checked_in', 'in_progress']
        ).update(
            status='completed',
            completed_at=timezone.now()
        )
        self.message_user(request, f"{updated} appointments completed.")
    
    @admin.action(description='📥 Export to CSV')
    def export_appointments_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="appointments.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'Patient', 'Patient Phone', 'Doctor', 'Date', 'Time', 
            'Status', 'Type', 'Reason', 'Created'
        ])
        
        for apt in queryset.select_related('patient', 'doctor'):
            writer.writerow([
                str(apt.id)[:8],
                apt.patient.get_full_name(),
                apt.patient.phone,
                apt.doctor.get_full_name(),
                apt.appointment_date,
                apt.start_time,
                apt.status,
                apt.booking_type,
                apt.reason or '',
                apt.created_at.strftime('%Y-%m-%d %H:%M')
            ])
        
        return response


@admin.register(AppointmentQueue)
class AppointmentQueueAdmin(admin.ModelAdmin):
    """Admin for appointment queue - Daily operations."""
    
    list_display = [
        'queue_number_display',
        'patient_link',
        'doctor_link',
        'queue_date',
        'status_display',
        'wait_time_display',
        'timestamps_display',
    ]
    list_filter = [
        QueueDateFilter,
        'status',
        'queue_date',
    ]
    search_fields = [
        'appointment__patient__phone',  # ✅ FIXED
        'appointment__patient__first_name',
        'appointment__doctor__phone',  # ✅ FIXED
    ]
    ordering = ['-queue_date', 'queue_number']
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'wait_time_minutes',
    ]
    date_hierarchy = 'queue_date'
    list_select_related = ['appointment', 'appointment__patient', 'appointment__doctor']
    list_per_page = 50
    actions = ['call_patients', 'start_consultation', 'complete_consultation', 'skip_patients']
    
    fieldsets = (
        ('Queue Information', {
            'fields': ('appointment', 'queue_number', 'queue_date')
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
                'checked_in_at', 'called_at',
                'consultation_started_at', 'completed_at',
                'created_at', 'updated_at',
            )
        }),
    )
    
    @admin.display(description='#')
    def queue_number_display(self, obj):
        return format_html(
            '<span style="background-color: #3498db; color: white; padding: 5px 12px; '
            'border-radius: 50%; font-weight: bold; font-size: 14px;">{}</span>',
            obj.queue_number
        )
    
    @admin.display(description='Patient')
    def patient_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.appointment.patient.pk])
        return format_html('<a href="{}">{}</a>', url, obj.appointment.patient.get_full_name())
    
    @admin.display(description='Doctor')
    def doctor_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.appointment.doctor.pk])
        return format_html('<a href="{}">Dr. {}</a>', url, obj.appointment.doctor.get_full_name())
    
    @admin.display(description='Status')
    def status_display(self, obj):
        return queue_status_badge(obj.status)
    
    @admin.display(description='Wait Time')
    def wait_time_display(self, obj):
        mins = obj.wait_time_minutes or 0
        if mins == 0:
            return '-'
        if mins > 45:
            color = '#e74c3c'
            icon = '🔴'
        elif mins > 20:
            color = '#f39c12'
            icon = '🟡'
        else:
            color = '#27ae60'
            icon = '🟢'
        return format_html(
            '<span style="color: {};">{} {} min</span>',
            color, icon, mins
        )
    
    @admin.display(description='Timeline')
    def timestamps_display(self, obj):
        parts = []
        if obj.checked_in_at:
            parts.append(f"📋 {obj.checked_in_at.strftime('%H:%M')}")
        if obj.called_at:
            parts.append(f"📢 {obj.called_at.strftime('%H:%M')}")
        if obj.consultation_started_at:
            parts.append(f"🏥 {obj.consultation_started_at.strftime('%H:%M')}")
        if obj.completed_at:
            parts.append(f"✅ {obj.completed_at.strftime('%H:%M')}")
        return ' → '.join(parts) if parts else '-'
    
    @admin.action(description='📢 Call selected patients')
    def call_patients(self, request, queryset):
        updated = queryset.filter(status='waiting').update(
            status='called',
            called_at=timezone.now()
        )
        self.message_user(request, f"{updated} patients called.")
    
    @admin.action(description='🏥 Start consultation')
    def start_consultation(self, request, queryset):
        updated = queryset.filter(status='called').update(
            status='in_consultation',
            consultation_started_at=timezone.now()
        )
        self.message_user(request, f"{updated} consultations started.")
    
    @admin.action(description='✅ Complete consultation')
    def complete_consultation(self, request, queryset):
        updated = queryset.filter(status='in_consultation').update(
            status='completed',
            completed_at=timezone.now()
        )
        self.message_user(request, f"{updated} consultations completed.")
    
    @admin.action(description='⏭️ Skip selected patients')
    def skip_patients(self, request, queryset):
        updated = queryset.filter(
            status__in=['waiting', 'called']
        ).update(status='skipped')
        self.message_user(request, f"{updated} patients skipped.")


@admin.register(AppointmentReminder)
class AppointmentReminderAdmin(admin.ModelAdmin):
    """Admin for appointment reminders - Notification tracking."""
    
    list_display = [
        'id_short',
        'patient_link',
        'appointment_date_display',
        'type_badge',
        'scheduled_time',
        'status_display',
        'sent_at',
        'error_display',
    ]
    list_filter = [
        'status',
        'reminder_type',
        'scheduled_time',
    ]
    search_fields = [
        'appointment__patient__phone',  # ✅ FIXED
        'appointment__patient__first_name',
    ]
    ordering = ['-scheduled_time']
    readonly_fields = ['id', 'created_at']
    date_hierarchy = 'scheduled_time'
    list_select_related = ['appointment', 'appointment__patient']
    list_per_page = 50
    actions = ['mark_sent', 'retry_failed', 'export_reminders_csv']
    
    fieldsets = (
        ('Reminder Information', {
            'fields': ('appointment', 'reminder_type')
        }),
        ('Schedule', {
            'fields': ('scheduled_time', 'status')
        }),
        ('Delivery', {
            'fields': ('sent_at', 'error_message')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at')
        }),
    )
    
    @admin.display(description='ID')
    def id_short(self, obj):
        return format_html('<code>{}</code>', str(obj.id)[:6])
    
    @admin.display(description='Patient')
    def patient_link(self, obj):
        url = reverse('admin:users_user_change', args=[obj.appointment.patient.pk])
        return format_html('<a href="{}">{}</a>', url, obj.appointment.patient.phone)
    
    @admin.display(description='Appointment')
    def appointment_date_display(self, obj):
        return obj.appointment.appointment_date
    
    @admin.display(description='Type')
    def type_badge(self, obj):
        type_config = {
            '24h': ('#3498db', '📅 24h Before'),
            '1h': ('#e67e22', '⏰ 1h Before'),
            'custom': ('#9b59b6', '⚙️ Custom'),
        }
        color, text = type_config.get(obj.reminder_type, ('#7f8c8d', obj.reminder_type))
        return format_html('<span style="color: {};">{}</span>', color, text)
    
    @admin.display(description='Status')
    def status_display(self, obj):
        config = {
            'pending': ('#f39c12', '⏳ Pending'),
            'sent': ('#27ae60', '✓ Sent'),
            'failed': ('#e74c3c', '✗ Failed'),
        }
        color, text = config.get(obj.status, ('#7f8c8d', obj.status))
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px;">{}</span>',
            color, text
        )
    
    @admin.display(description='Error')
    def error_display(self, obj):
        if obj.error_message:
            return format_html(
                '<span style="color: #e74c3c;" title="{}">{}</span>',
                obj.error_message, obj.error_message[:20] + '...'
            )
        return '-'
    
    @admin.action(description='✓ Mark as sent')
    def mark_sent(self, request, queryset):
        updated = queryset.filter(status='pending').update(
            status='sent',
            sent_at=timezone.now()
        )
        self.message_user(request, f"{updated} reminders marked as sent.")
    
    @admin.action(description='🔄 Retry failed reminders')
    def retry_failed(self, request, queryset):
        updated = queryset.filter(status='failed').update(
            status='pending',
            error_message=''
        )
        self.message_user(request, f"{updated} reminders reset for retry.")
    
    @admin.action(description='📥 Export to CSV')
    def export_reminders_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="appointment_reminders.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Patient', 'Appointment Date', 'Type', 'Scheduled', 'Status', 'Sent At', 'Error'])
        
        for reminder in queryset.select_related('appointment', 'appointment__patient'):
            writer.writerow([
                reminder.appointment.patient.phone,
                reminder.appointment.appointment_date,
                reminder.reminder_type,
                reminder.scheduled_time,
                reminder.status,
                reminder.sent_at or '',
                reminder.error_message or ''
            ])
        
        return response