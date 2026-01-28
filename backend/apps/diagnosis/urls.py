"""
Diagnosis API URLs
==================
URL routing for diagnosis endpoints.
"""

from django.urls import path
from . import views

app_name = 'diagnosis'

urlpatterns = [
    # ==================== Main Diagnosis ====================
    # POST /api/v1/diagnosis/diagnose/
    path(
        'diagnose/',
        views.DiagnoseView.as_view(),
        name='diagnose'
    ),
    
    # POST /api/v1/diagnosis/diagnose-symptoms/
    path(
        'diagnose-symptoms/',
        views.DiagnoseFromSymptomsView.as_view(),
        name='diagnose-symptoms'
    ),
    
    # POST /api/v1/diagnosis/quick-diagnose/
    path(
        'quick-diagnose/',
        views.QuickDiagnoseView.as_view(),
        name='quick-diagnose'
    ),
    
    # ==================== Feedback ====================
    # POST /api/v1/diagnosis/feedback/
    path(
        'feedback/',
        views.SessionFeedbackView.as_view(),
        name='feedback'
    ),
    
    # ==================== Session History ====================
    # GET /api/v1/diagnosis/history/
    path(
        'history/',
        views.SessionHistoryView.as_view(),
        name='history'
    ),
    
    # GET /api/v1/diagnosis/session/<session_id>/
    path(
        'session/<str:session_id>/',
        views.SessionDetailView.as_view(),
        name='session-detail'
    ),
    
    # ==================== Symptoms ====================
    # GET /api/v1/diagnosis/symptoms/
    path(
        'symptoms/',
        views.SymptomListView.as_view(),
        name='symptom-list'
    ),
    
    # GET /api/v1/diagnosis/symptoms/by-category/
    path(
        'symptoms/by-category/',
        views.SymptomsByCategoryView.as_view(),
        name='symptoms-by-category'
    ),
    
    # GET /api/v1/diagnosis/symptoms/search/?q=fever
    path(
        'symptoms/search/',
        views.SymptomSearchView.as_view(),
        name='symptom-search'
    ),
    
    # GET /api/v1/diagnosis/symptoms/<code>/
    path(
        'symptoms/<str:code>/',
        views.SymptomDetailView.as_view(),
        name='symptom-detail'
    ),
    
    # ==================== Diseases ====================
    # GET /api/v1/diagnosis/diseases/
    path(
        'diseases/',
        views.DiseaseListView.as_view(),
        name='disease-list'
    ),
    
    # GET /api/v1/diagnosis/diseases/<code>/
    path(
        'diseases/<str:code>/',
        views.DiseaseDetailView.as_view(),
        name='disease-detail'
    ),
    
    # ==================== System ====================
    # GET /api/v1/diagnosis/health/
    path(
        'health/',
        views.HealthCheckView.as_view(),
        name='health'
    ),
    
    # GET /api/v1/diagnosis/model-status/
    path(
        'model-status/',
        views.ModelStatusView.as_view(),
        name='model-status'
    ),
    
    # POST /api/v1/diagnosis/reload-models/
    path(
        'reload-models/',
        views.ReloadModelsView.as_view(),
        name='reload-models'
    ),
]