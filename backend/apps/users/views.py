from django.shortcuts import render

"""
Views for users app.
Handles all authentication and user management endpoints.
"""

from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import (
    PatientProfile, DoctorProfile, AdminProfile,
    FamilyHelper, DoctorAvailability, UserActivity
)
from .serializers import (
    # Token
    TokenSerializer, get_tokens_for_user,
    # User
    UserSerializer, UserBasicSerializer,
    # Patient
    PatientProfileSerializer, PatientRegistrationSerializer, PatientUpdateSerializer,
    # Doctor
    DoctorProfileSerializer, DoctorPublicSerializer,
    DoctorRegistrationSerializer, DoctorUpdateSerializer,
    DoctorAvailabilitySerializer, DoctorVerificationSerializer,
    # Helper
    FamilyHelperSerializer, AddFamilyHelperSerializer,
    # Admin
    AdminProfileSerializer,
    # Auth
    LoginSerializer, LogoutSerializer,
    ChangeLanguageSerializer, UpdateFCMTokenSerializer
)
from .permissions import (
    IsAdmin, IsDoctor, IsPatient, IsVerifiedDoctor,
    IsDoctorOrAdmin, IsOwnerOrAdmin
)
from .utils import log_user_activity

User = get_user_model()


# ============================================
# HEALTH CHECK
# ============================================

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_check(request):
    """
    Health check endpoint.
    """
    return Response({
        'status': 'healthy',
        'message': 'MediConnect API is running',
        'timestamp': timezone.now().isoformat()
    })


# ============================================
# REGISTRATION VIEWS
# ============================================

class PatientRegistrationView(APIView):
    """
    Register a new patient.
    
    Requires Firebase phone authentication token.
    Creates user account with patient profile.
    """
    permission_classes = [permissions.AllowAny]
    
    @swagger_auto_schema(
        operation_description="Register a new patient with Firebase phone auth",
        request_body=PatientRegistrationSerializer,
        responses={
            201: openapi.Response(
                description="Registration successful",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'data': openapi.Schema(type=openapi.TYPE_OBJECT),
                    }
                )
            ),
            400: "Validation error"
        },
        tags=['Authentication']
    )
    def post(self, request):
        serializer = PatientRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            
            # Log activity
            log_user_activity(
                user=user,
                activity_type=UserActivity.ActivityType.REGISTER,
                description="Patient registration completed",
                request=request
            )
            
            return Response({
                'success': True,
                'message': 'Registration successful',
                'data': {
                    'user': UserSerializer(user).data,
                    'patient_profile': PatientProfileSerializer(user.patient_profile).data,
                    'tokens': tokens
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'message': 'Registration failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class DoctorRegistrationView(APIView):
    """
    Register a new doctor.
    
    Requires Firebase phone authentication token.
    Creates user account with doctor profile (pending verification).
    """
    permission_classes = [permissions.AllowAny]
    
    @swagger_auto_schema(
        operation_description="Register a new doctor with Firebase phone auth",
        request_body=DoctorRegistrationSerializer,
        responses={
            201: openapi.Response(description="Registration successful"),
            400: "Validation error"
        },
        tags=['Authentication']
    )
    def post(self, request):
        serializer = DoctorRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            
            # Log activity
            log_user_activity(
                user=user,
                activity_type=UserActivity.ActivityType.REGISTER,
                description="Doctor registration completed (pending verification)",
                request=request
            )
            
            return Response({
                'success': True,
                'message': 'Registration successful. Your profile is pending verification.',
                'data': {
                    'user': UserSerializer(user).data,
                    'doctor_profile': DoctorProfileSerializer(user.doctor_profile).data,
                    'tokens': tokens
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'message': 'Registration failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# LOGIN / LOGOUT VIEWS
# ============================================

class LoginView(APIView):
    """
    Login with Firebase phone authentication.
    
    Returns JWT tokens for API authentication.
    """
    permission_classes = [permissions.AllowAny]
    
    @swagger_auto_schema(
        operation_description="Login with Firebase phone auth token",
        request_body=LoginSerializer,
        responses={
            200: openapi.Response(description="Login successful"),
            400: "Invalid credentials",
            401: "Authentication failed"
        },
        tags=['Authentication']
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.get_user()
            
            # Update FCM token if provided
            fcm_token = request.data.get('fcm_token')
            if fcm_token:
                user.fcm_token = fcm_token
            
            # Update last active
            user.update_last_active()
            
            tokens = get_tokens_for_user(user)
            
            # Get role-specific profile
            profile_data = None
            if user.role == User.Role.PATIENT:
                profile_data = PatientProfileSerializer(user.patient_profile).data
            elif user.role == User.Role.DOCTOR:
                profile_data = DoctorProfileSerializer(user.doctor_profile).data
            elif user.role == User.Role.ADMIN:
                profile_data = AdminProfileSerializer(user.admin_profile).data
            
            # Log activity
            log_user_activity(
                user=user,
                activity_type=UserActivity.ActivityType.LOGIN,
                description=f"User logged in",
                request=request
            )
            
            return Response({
                'success': True,
                'message': 'Login successful',
                'data': {
                    'user': UserSerializer(user).data,
                    'profile': profile_data,
                    'tokens': tokens
                }
            }, status=status.HTTP_200_OK)
        
        return Response({
            'success': False,
            'message': 'Login failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """
    Logout user by blacklisting refresh token.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Logout and blacklist refresh token",
        request_body=LogoutSerializer,
        responses={
            200: "Logout successful",
            400: "Invalid token"
        },
        tags=['Authentication']
    )
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                refresh_token = RefreshToken(serializer.validated_data['refresh'])
                refresh_token.blacklist()
                
                # Log activity
                log_user_activity(
                    user=request.user,
                    activity_type=UserActivity.ActivityType.LOGOUT,
                    description="User logged out",
                    request=request
                )
                
                return Response({
                    'success': True,
                    'message': 'Logout successful'
                }, status=status.HTTP_200_OK)
            
            except TokenError:
                return Response({
                    'success': False,
                    'message': 'Invalid token'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'success': False,
            'message': 'Logout failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# PROFILE VIEWS
# ============================================

class ProfileView(APIView):
    """
    Get or update current user's profile.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get current user's profile",
        responses={
            200: openapi.Response(description="Profile data")
        },
        tags=['Profile']
    )
    def get(self, request):
        user = request.user
        
        # Get role-specific profile
        profile_data = None
        if user.role == User.Role.PATIENT:
            profile_data = PatientProfileSerializer(user.patient_profile).data
        elif user.role == User.Role.DOCTOR:
            profile_data = DoctorProfileSerializer(user.doctor_profile).data
        elif user.role == User.Role.ADMIN:
            profile_data = AdminProfileSerializer(user.admin_profile).data
        
        return Response({
            'success': True,
            'data': {
                'user': UserSerializer(user).data,
                'profile': profile_data
            }
        })
    
    @swagger_auto_schema(
        operation_description="Update current user's profile",
        responses={
            200: "Profile updated",
            400: "Validation error"
        },
        tags=['Profile']
    )
    def put(self, request):
        user = request.user
        
        if user.role == User.Role.PATIENT:
            serializer = PatientUpdateSerializer(
                user.patient_profile,
                data=request.data,
                partial=True
            )
        elif user.role == User.Role.DOCTOR:
            serializer = DoctorUpdateSerializer(
                user.doctor_profile,
                data=request.data,
                partial=True
            )
        else:
            return Response({
                'success': False,
                'message': 'Profile update not available for this role'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if serializer.is_valid():
            serializer.save()
            
            # Log activity
            log_user_activity(
                user=user,
                activity_type=UserActivity.ActivityType.PROFILE_UPDATE,
                description="Profile updated",
                request=request
            )
            
            # Refresh user data
            user.refresh_from_db()
            
            profile_data = None
            if user.role == User.Role.PATIENT:
                profile_data = PatientProfileSerializer(user.patient_profile).data
            elif user.role == User.Role.DOCTOR:
                profile_data = DoctorProfileSerializer(user.doctor_profile).data
            
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'data': {
                    'user': UserSerializer(user).data,
                    'profile': profile_data
                }
            })
        
        return Response({
            'success': False,
            'message': 'Profile update failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # PATCH method for partial updates
    def patch(self, request):
        return self.put(request)


# ============================================
# DOCTOR VIEWS
# ============================================

class DoctorListView(generics.ListAPIView):
    """
    List all verified doctors.
    Public endpoint for patients to browse doctors.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = DoctorPublicSerializer
    
    def get_queryset(self):
        queryset = DoctorProfile.objects.filter(
            verification_status='verified',
            is_available_online=True,
            user__is_active=True
        ).select_related('user').prefetch_related('availabilities')
        
        # Filter by specialization
        specialization = self.request.query_params.get('specialization')
        if specialization:
            queryset = queryset.filter(specialization=specialization)
        
        # Filter by language
        language = self.request.query_params.get('language')
        if language:
            queryset = queryset.filter(languages_spoken__contains=[language])
        
        # Search by name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search)
            )
        
        # Order by rating
        order_by = self.request.query_params.get('order_by', '-average_rating')
        if order_by in ['average_rating', '-average_rating', 'consultation_fee', '-consultation_fee']:
            queryset = queryset.order_by(order_by)
        
        return queryset
    
    @swagger_auto_schema(
        operation_description="List all verified doctors",
        manual_parameters=[
            openapi.Parameter(
                'specialization',
                openapi.IN_QUERY,
                description="Filter by specialization",
                type=openapi.TYPE_STRING
            ),
            openapi.Parameter(
                'language',
                openapi.IN_QUERY,
                description="Filter by language spoken",
                type=openapi.TYPE_STRING
            ),
            openapi.Parameter(
                'search',
                openapi.IN_QUERY,
                description="Search by doctor name",
                type=openapi.TYPE_STRING
            ),
        ],
        tags=['Doctors']
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class DoctorDetailView(generics.RetrieveAPIView):
    """
    Get details of a specific doctor.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = DoctorPublicSerializer
    
    def get_queryset(self):
        return DoctorProfile.objects.filter(
            verification_status='verified',
            user__is_active=True
        ).select_related('user').prefetch_related('availabilities')
    
    @swagger_auto_schema(
        operation_description="Get doctor details",
        tags=['Doctors']
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class DoctorAvailabilityView(APIView):
    """
    Manage doctor's availability schedule.
    """
    permission_classes = [IsVerifiedDoctor]
    
    @swagger_auto_schema(
        operation_description="Get doctor's availability schedule",
        tags=['Doctors']
    )
    def get(self, request):
        doctor_profile = request.user.doctor_profile
        availabilities = doctor_profile.availabilities.all()
        
        return Response({
            'success': True,
            'data': DoctorAvailabilitySerializer(availabilities, many=True).data
        })
    
    @swagger_auto_schema(
        operation_description="Add/Update availability slot",
        request_body=DoctorAvailabilitySerializer,
        tags=['Doctors']
    )
    def post(self, request):
        doctor_profile = request.user.doctor_profile
        serializer = DoctorAvailabilitySerializer(data=request.data)
        
        if serializer.is_valid():
            # Check if slot already exists
            existing = DoctorAvailability.objects.filter(
                doctor=doctor_profile,
                day_of_week=serializer.validated_data['day_of_week'],
                start_time=serializer.validated_data['start_time']
            ).first()
            
            if existing:
                # Update existing
                for attr, value in serializer.validated_data.items():
                    setattr(existing, attr, value)
                existing.save()
                availability = existing
            else:
                # Create new
                availability = serializer.save(doctor=doctor_profile)
            
            return Response({
                'success': True,
                'message': 'Availability updated',
                'data': DoctorAvailabilitySerializer(availability).data
            })
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @swagger_auto_schema(
        operation_description="Delete availability slot",
        tags=['Doctors']
    )
    def delete(self, request, pk=None):
        if not pk:
            return Response({
                'success': False,
                'message': 'Availability ID required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        doctor_profile = request.user.doctor_profile
        
        try:
            availability = DoctorAvailability.objects.get(
                pk=pk,
                doctor=doctor_profile
            )
            availability.delete()
            
            return Response({
                'success': True,
                'message': 'Availability deleted'
            })
        except DoctorAvailability.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Availability not found'
            }, status=status.HTTP_404_NOT_FOUND)


# ============================================
# FAMILY HELPER VIEWS
# ============================================

class FamilyHelperListView(APIView):
    """
    List and add family helpers for patient.
    """
    permission_classes = [IsPatient]
    
    @swagger_auto_schema(
        operation_description="List patient's family helpers",
        tags=['Family Helper']
    )
    def get(self, request):
        helpers = FamilyHelper.objects.filter(
            patient=request.user,
            is_active=True
        )
        
        return Response({
            'success': True,
            'data': FamilyHelperSerializer(helpers, many=True).data
        })
    
    @swagger_auto_schema(
        operation_description="Add a new family helper",
        request_body=AddFamilyHelperSerializer,
        tags=['Family Helper']
    )
    def post(self, request):
        serializer = AddFamilyHelperSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            helper = serializer.save()
            
            return Response({
                'success': True,
                'message': 'Family helper added successfully',
                'data': FamilyHelperSerializer(helper).data
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class FamilyHelperDetailView(APIView):
    """
    Update or remove a family helper.
    """
    permission_classes = [IsPatient]
    
    def get_object(self, pk, user):
        try:
            return FamilyHelper.objects.get(pk=pk, patient=user)
        except FamilyHelper.DoesNotExist:
            return None
    
    @swagger_auto_schema(
        operation_description="Update family helper",
        request_body=FamilyHelperSerializer,
        tags=['Family Helper']
    )
    def put(self, request, pk):
        helper = self.get_object(pk, request.user)
        
        if not helper:
            return Response({
                'success': False,
                'message': 'Helper not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = FamilyHelperSerializer(
            helper,
            data=request.data,
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            
            return Response({
                'success': True,
                'message': 'Helper updated',
                'data': serializer.data
            })
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @swagger_auto_schema(
        operation_description="Remove family helper",
        tags=['Family Helper']
    )
    def delete(self, request, pk):
        helper = self.get_object(pk, request.user)
        
        if not helper:
            return Response({
                'success': False,
                'message': 'Helper not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        helper.is_active = False
        helper.save()
        
        return Response({
            'success': True,
            'message': 'Helper removed'
        })


# ============================================
# ADMIN VIEWS
# ============================================

class AdminDoctorListView(generics.ListAPIView):
    """
    Admin view to list all doctors (including unverified).
    """
    permission_classes = [IsAdmin]
    serializer_class = DoctorProfileSerializer
    
    def get_queryset(self):
        queryset = DoctorProfile.objects.all().select_related('user')
        
        # Filter by verification status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(verification_status=status_filter)
        
        return queryset.order_by('-created_at')
    
    @swagger_auto_schema(
        operation_description="List all doctors (admin only)",
        manual_parameters=[
            openapi.Parameter(
                'status',
                openapi.IN_QUERY,
                description="Filter by verification status: pending, verified, rejected",
                type=openapi.TYPE_STRING
            ),
        ],
        tags=['Admin']
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class AdminDoctorVerifyView(APIView):
    """
    Verify or reject a doctor registration.
    """
    permission_classes = [IsAdmin]
    
    @swagger_auto_schema(
        operation_description="Verify or reject doctor",
        request_body=DoctorVerificationSerializer,
        tags=['Admin']
    )
    def post(self, request, pk):
        try:
            doctor = DoctorProfile.objects.get(pk=pk)
        except DoctorProfile.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Doctor not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = DoctorVerificationSerializer(data=request.data)
        
        if serializer.is_valid():
            action = serializer.validated_data['action']
            
            if action == 'verify':
                doctor.verification_status = DoctorProfile.VerificationStatus.VERIFIED
                doctor.verified_at = timezone.now()
                doctor.verified_by = request.user
                doctor.rejection_reason = ''
                message = 'Doctor verified successfully'
            else:
                doctor.verification_status = DoctorProfile.VerificationStatus.REJECTED
                doctor.rejection_reason = serializer.validated_data.get('rejection_reason', '')
                message = 'Doctor registration rejected'
            
            doctor.save()
            
            return Response({
                'success': True,
                'message': message,
                'data': DoctorProfileSerializer(doctor).data
            })
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class AdminPatientListView(generics.ListAPIView):
    """
    Admin view to list all patients.
    """
    permission_classes = [IsAdmin]
    serializer_class = PatientProfileSerializer
    
    def get_queryset(self):
        queryset = PatientProfile.objects.all().select_related('user')
        
        # Search by phone or name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(user__phone__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    @swagger_auto_schema(
        operation_description="List all patients (admin only)",
        manual_parameters=[
            openapi.Parameter(
                'search',
                openapi.IN_QUERY,
                description="Search by phone or name",
                type=openapi.TYPE_STRING
            ),
        ],
        tags=['Admin']
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class AdminUserStatsView(APIView):
    """
    Get user statistics for admin dashboard.
    """
    permission_classes = [IsAdmin]
    
    @swagger_auto_schema(
        operation_description="Get user statistics",
        tags=['Admin']
    )
    def get(self, request):
        from django.db.models import Count
        
        total_users = User.objects.count()
        total_patients = User.objects.filter(role=User.Role.PATIENT).count()
        total_doctors = User.objects.filter(role=User.Role.DOCTOR).count()
        
        verified_doctors = DoctorProfile.objects.filter(
            verification_status='verified'
        ).count()
        pending_doctors = DoctorProfile.objects.filter(
            verification_status='pending'
        ).count()
        
        # Recent registrations (last 30 days)
        from datetime import timedelta
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        recent_patients = User.objects.filter(
            role=User.Role.PATIENT,
            created_at__gte=thirty_days_ago
        ).count()
        
        recent_doctors = User.objects.filter(
            role=User.Role.DOCTOR,
            created_at__gte=thirty_days_ago
        ).count()
        
        return Response({
            'success': True,
            'data': {
                'total_users': total_users,
                'total_patients': total_patients,
                'total_doctors': total_doctors,
                'verified_doctors': verified_doctors,
                'pending_doctors': pending_doctors,
                'recent_registrations': {
                    'patients': recent_patients,
                    'doctors': recent_doctors,
                    'period': 'last_30_days'
                }
            }
        })


# ============================================
# UTILITY VIEWS
# ============================================

class ChangeLanguageView(APIView):
    """
    Change user's preferred language.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Change preferred language",
        request_body=ChangeLanguageSerializer,
        tags=['Settings']
    )
    def post(self, request):
        serializer = ChangeLanguageSerializer(data=request.data)
        
        if serializer.is_valid():
            request.user.preferred_language = serializer.validated_data['language']
            request.user.save(update_fields=['preferred_language'])
            
            return Response({
                'success': True,
                'message': 'Language updated',
                'data': {
                    'language': request.user.preferred_language
                }
            })
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class UpdateFCMTokenView(APIView):
    """
    Update user's FCM token for push notifications.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Update FCM token",
        request_body=UpdateFCMTokenSerializer,
        tags=['Settings']
    )
    def post(self, request):
        serializer = UpdateFCMTokenSerializer(data=request.data)
        
        if serializer.is_valid():
            request.user.fcm_token = serializer.validated_data['fcm_token']
            request.user.save(update_fields=['fcm_token'])
            
            return Response({
                'success': True,
                'message': 'FCM token updated'
            })
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class SpecializationListView(APIView):
    """
    Get list of available doctor specializations.
    """
    permission_classes = [permissions.AllowAny]
    
    @swagger_auto_schema(
        operation_description="Get list of specializations",
        tags=['Doctors']
    )
    def get(self, request):
        specializations = [
            {'value': choice[0], 'label': choice[1]}
            for choice in DoctorProfile.Specialization.choices
        ]
        
        return Response({
            'success': True,
            'data': specializations
        })
    
# ============================================
# FIREBASE TEST VIEW (Development Only)
# ============================================

class FirebaseTestView(APIView):
    """
    Test Firebase integration.
    Only available in DEBUG mode.
    """
    permission_classes = [permissions.AllowAny]
    
    @swagger_auto_schema(
        operation_description="Test Firebase integration (development only)",
        tags=['Development']
    )
    def get(self, request):
        from django.conf import settings
        
        if not settings.DEBUG:
            return Response({
                'success': False,
                'message': 'This endpoint is only available in development mode'
            }, status=status.HTTP_403_FORBIDDEN)
        
        from .firebase_auth import get_firebase_app
        
        app = get_firebase_app()
        
        if app:
            return Response({
                'success': True,
                'message': 'Firebase is configured correctly',
                'data': {
                    'project_id': app.project_id,
                    'app_name': app.name,
                    'status': 'connected'
                }
            })
        else:
            return Response({
                'success': False,
                'message': 'Firebase is not configured',
                'data': {
                    'status': 'not_connected',
                    'hint': 'Check firebase-credentials.json file'
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @swagger_auto_schema(
        operation_description="Verify a Firebase token (for testing)",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['token'],
            properties={
                'token': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description='Firebase ID token to verify'
                ),
            }
        ),
        tags=['Development']
    )
    def post(self, request):
        from django.conf import settings
        
        if not settings.DEBUG:
            return Response({
                'success': False,
                'message': 'This endpoint is only available in development mode'
            }, status=status.HTTP_403_FORBIDDEN)
        
        token = request.data.get('token')
        
        if not token:
            return Response({
                'success': False,
                'message': 'Token is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        from .firebase_auth import verify_firebase_token
        
        decoded = verify_firebase_token(token)
        
        if decoded:
            return Response({
                'success': True,
                'message': 'Token is valid',
                'data': {
                    'uid': decoded.get('uid'),
                    'phone': decoded.get('phone_number'),
                    'exp': decoded.get('exp')
                }
            })
        else:
            return Response({
                'success': False,
                'message': 'Invalid or expired token'
            }, status=status.HTTP_401_UNAUTHORIZED)