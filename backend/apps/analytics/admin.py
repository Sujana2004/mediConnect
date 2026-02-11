"""
Analytics Dashboard Admin Configuration.
Provides visual dashboard with charts and statistics.
"""

from django.contrib import admin
from django.template.response import TemplateResponse
from django.urls import path
from django.utils.html import format_html
from django.utils import timezone

from .models import DashboardStats, AppointmentAnalytics
from .services import AnalyticsService


class AnalyticsAdminSite(admin.AdminSite):
    """Custom admin site with analytics dashboard."""
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('dashboard/', self.admin_view(self.dashboard_view), name='analytics_dashboard'),
        ]
        return custom_urls + urls
    
    def dashboard_view(self, request):
        context = {
            **self.each_context(request),
            'title': 'Analytics Dashboard',
            'stats': AnalyticsService.get_all_stats(),
        }
        return TemplateResponse(request, 'admin/analytics/dashboard.html', context)


@admin.register(DashboardStats)
class DashboardStatsAdmin(admin.ModelAdmin):
    """
    Main Analytics Dashboard.
    This provides an overview of all system statistics.
    """
    
    change_list_template = 'admin/analytics/dashboard_changelist.html'
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def changelist_view(self, request, extra_context=None):
        # Get all statistics
        stats = AnalyticsService.get_all_stats()
        chart_data = AnalyticsService.get_chart_data('month')
        
        extra_context = extra_context or {}
        extra_context.update({
            'title': '📊 Analytics Dashboard',
            'stats': stats,
            'chart_data': chart_data,
            'last_updated': timezone.now(),
        })
        
        # Don't call super() as we don't have a real queryset
        return TemplateResponse(
            request,
            self.change_list_template,
            extra_context
        )
    
    def get_queryset(self, request):
        # Return empty queryset since this is a virtual model
        return DashboardStats.objects.none()