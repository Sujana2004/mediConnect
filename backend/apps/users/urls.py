"""
URL patterns for users app.
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'users'

urlpatterns = [
    # Health check
    path('health/', views.health_check, name='health_check'),
    
    # ============================================
    # AUTHENTICATION
    # ============================================
    
    # Registration
    path(
        'register/patient/',
        views.PatientRegistrationView.as_view(),
        name='register_patient'
    ),
    path(
        'register/doctor/',
        views.DoctorRegistrationView.as_view(),
        name='register_doctor'
    ),
    
    # Login / Logout
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    
    # Token refresh
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # ============================================
    # PROFILE
    # ============================================
    
    path('profile/', views.ProfileView.as_view(), name='profile'),
    
    # ============================================
    # DOCTORS (Public)
    # ============================================
    
    path('doctors/', views.DoctorListView.as_view(), name='doctor_list'),
    path('doctors/<int:pk>/', views.DoctorDetailView.as_view(), name='doctor_detail'),
    path('doctors/specializations/', views.SpecializationListView.as_view(), name='specializations'),
    
    # Doctor's own availability management
    path(
        'doctor/availability/',
        views.DoctorAvailabilityView.as_view(),
        name='doctor_availability'
    ),
    path(
        'doctor/availability/<int:pk>/',
        views.DoctorAvailabilityView.as_view(),
        name='doctor_availability_detail'
    ),
    
    # ============================================
    # FAMILY HELPER
    # ============================================
    
    path('helpers/', views.FamilyHelperListView.as_view(), name='helper_list'),
    path(
        'helpers/<int:pk>/',
        views.FamilyHelperDetailView.as_view(),
        name='helper_detail'
    ),
    
    # ============================================
    # ADMIN
    # ============================================
    
    path('admin/doctors/', views.AdminDoctorListView.as_view(), name='admin_doctor_list'),
    path(
        'admin/doctors/<int:pk>/verify/',
        views.AdminDoctorVerifyView.as_view(),
        name='admin_doctor_verify'
    ),
    path('admin/patients/', views.AdminPatientListView.as_view(), name='admin_patient_list'),
    path('admin/stats/', views.AdminUserStatsView.as_view(), name='admin_stats'),
    
    # ============================================
    # SETTINGS
    # ============================================
    
    path('settings/language/', views.ChangeLanguageView.as_view(), name='change_language'),
    path('settings/fcm-token/', views.UpdateFCMTokenView.as_view(), name='update_fcm_token'),

    # ============================================
    # DEVELOPMENT / TESTING
    # ============================================
    
    path('test/firebase/', views.FirebaseTestView.as_view(), name='test_firebase'),
]