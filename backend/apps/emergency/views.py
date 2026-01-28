from django.shortcuts import render

"""
Emergency App Views for MediConnect.

API endpoints for:
- Emergency Contacts (CRUD)
- Emergency Services (nearby hospitals, ambulances)
- SOS Alerts (trigger, cancel, status)
- First Aid Guides
- Emergency Helplines
- Location Updates
"""

import logging
from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db import transaction

from .models import (
    EmergencyContact,
    EmergencyService,
    SOSAlert,
    FirstAidGuide,
    EmergencyHelpline,
    UserLocationCache,
)
from .serializers import (
    EmergencyContactSerializer,
    EmergencyContactListSerializer,
    EmergencyContactReorderSerializer,
    EmergencyServiceSerializer,
    EmergencyServiceListSerializer,
    NearbyServicesRequestSerializer,
    SOSAlertCreateSerializer,
    SOSAlertSerializer,
    SOSAlertListSerializer,
    SOSAlertUpdateSerializer,
    SOSCancelSerializer,
    FirstAidGuideSerializer,
    FirstAidGuideListSerializer,
    EmergencyHelplineSerializer,
    EmergencyHelplineListSerializer,
    UserLocationCacheSerializer,
    LocationUpdateSerializer,
    SOSQuickTriggerSerializer,
)
from .services import SOSService, LocationService, EmergencyNotificationService

logger = logging.getLogger(__name__)


# =============================================================================
# EMERGENCY CONTACT VIEWS
# =============================================================================

class EmergencyContactViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing emergency contacts.
    
    Endpoints:
    - GET /api/v1/emergency/contacts/ - List user's contacts
    - POST /api/v1/emergency/contacts/ - Add new contact
    - GET /api/v1/emergency/contacts/{id}/ - Get contact details
    - PUT /api/v1/emergency/contacts/{id}/ - Update contact
    - DELETE /api/v1/emergency/contacts/{id}/ - Delete contact
    - POST /api/v1/emergency/contacts/reorder/ - Reorder priorities
    """
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return EmergencyContactListSerializer
        elif self.action == 'reorder':
            return EmergencyContactReorderSerializer
        return EmergencyContactSerializer
    
    def get_queryset(self):
        """Return only current user's contacts."""
        return EmergencyContact.objects.filter(
            user=self.request.user
        ).order_by('priority', 'name')
    
    def list(self, request, *args, **kwargs):
        """List user's emergency contacts."""
        queryset = self.get_queryset()
        
        # Filter by active status if provided
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'count': queryset.count(),
            'contacts': serializer.data,
        })
    
    def create(self, request, *args, **kwargs):
        """Add a new emergency contact."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contact = serializer.save()
        
        logger.info(f"Emergency contact created: {contact.id} for user {request.user.id}")
        
        return Response({
            'success': True,
            'message': 'Emergency contact added successfully',
            'contact': EmergencyContactSerializer(
                contact, 
                context={'request': request}
            ).data,
        }, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update an emergency contact."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, 
            data=request.data, 
            partial=partial
        )
        serializer.is_valid(raise_exception=True)
        contact = serializer.save()
        
        logger.info(f"Emergency contact updated: {contact.id}")
        
        return Response({
            'success': True,
            'message': 'Emergency contact updated successfully',
            'contact': serializer.data,
        })
    
    def destroy(self, request, *args, **kwargs):
        """Delete an emergency contact."""
        instance = self.get_object()
        contact_name = instance.name
        instance.delete()
        
        logger.info(f"Emergency contact deleted: {contact_name} by user {request.user.id}")
        
        return Response({
            'success': True,
            'message': f'Contact "{contact_name}" deleted successfully',
        })
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """
        Reorder contact priorities.
        
        Body: {"contacts": [{"id": "uuid", "priority": 1}, ...]}
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        contacts_data = serializer.validated_data['contacts']
        
        with transaction.atomic():
            for item in contacts_data:
                try:
                    contact = EmergencyContact.objects.get(
                        id=item['id'],
                        user=request.user
                    )
                    contact.priority = int(item['priority'])
                    contact.save(update_fields=['priority'])
                except EmergencyContact.DoesNotExist:
                    pass
        
        return Response({
            'success': True,
            'message': 'Contact priorities updated',
        })


# =============================================================================
# EMERGENCY SERVICE VIEWS
# =============================================================================

class EmergencyServiceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for emergency services (hospitals, ambulances, etc.)
    Read-only - data is pre-loaded.
    
    Endpoints:
    - GET /api/v1/emergency/services/ - List all services
    - GET /api/v1/emergency/services/{id}/ - Get service details
    - POST /api/v1/emergency/services/nearby/ - Find nearby services
    - GET /api/v1/emergency/services/by-district/ - Get by district
    """
    
    permission_classes = [IsAuthenticated]
    queryset = EmergencyService.objects.filter(is_active=True)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return EmergencyServiceListSerializer
        return EmergencyServiceSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        # Add user location for distance calculation
        context['user_lat'] = self.request.query_params.get('lat')
        context['user_lng'] = self.request.query_params.get('lng')
        return context
    
    def list(self, request, *args, **kwargs):
        """List emergency services with optional filters."""
        queryset = self.get_queryset()
        
        # Filter by service type
        service_type = request.query_params.get('type')
        if service_type:
            queryset = queryset.filter(service_type=service_type)
        
        # Filter by district
        district = request.query_params.get('district')
        if district:
            queryset = queryset.filter(district__icontains=district)
        
        # Filter by 24x7
        if request.query_params.get('is_24x7') == 'true':
            queryset = queryset.filter(is_24x7=True)
        
        # Filter by government
        if request.query_params.get('is_government') == 'true':
            queryset = queryset.filter(is_government=True)
        
        serializer = self.get_serializer(queryset[:50], many=True)
        
        return Response({
            'success': True,
            'count': queryset.count(),
            'services': serializer.data,
        })
    
    @action(detail=False, methods=['post'])
    def nearby(self, request):
        """
        Find nearby emergency services.
        
        Body: {
            "latitude": 17.385,
            "longitude": 78.4867,
            "radius_km": 10,
            "service_type": "hospital" (optional),
            "only_24x7": false,
            "only_government": false
        }
        """
        serializer = NearbyServicesRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        location_service = LocationService()
        
        services = location_service.get_nearby_services(
            latitude=float(data['latitude']),
            longitude=float(data['longitude']),
            radius_km=data.get('radius_km', 10.0),
            service_type=data.get('service_type'),
            only_24x7=data.get('only_24x7', False),
            only_government=data.get('only_government', False),
            limit=30
        )
        
        return Response({
            'success': True,
            'count': len(services),
            'search_radius_km': data.get('radius_km', 10.0),
            'services': services,
        })
    
    @action(detail=False, methods=['get'], url_path='by-district')
    def by_district(self, request):
        """
        Get services by district.
        
        Query params: ?district=Hyderabad&type=hospital
        """
        district = request.query_params.get('district')
        if not district:
            return Response({
                'success': False,
                'error': 'District parameter is required',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        service_type = request.query_params.get('type')
        
        location_service = LocationService()
        services = location_service.get_services_by_district(
            district=district,
            service_type=service_type,
            limit=50
        )
        
        return Response({
            'success': True,
            'district': district,
            'count': len(services),
            'services': services,
        })


# =============================================================================
# SOS ALERT VIEWS
# =============================================================================

class SOSAlertViewSet(viewsets.ModelViewSet):
    """
    ViewSet for SOS alerts.
    
    Endpoints:
    - POST /api/v1/emergency/sos/trigger/ - Trigger new SOS
    - POST /api/v1/emergency/sos/quick-trigger/ - Quick one-tap SOS
    - GET /api/v1/emergency/sos/active/ - Get active SOS
    - POST /api/v1/emergency/sos/{id}/cancel/ - Cancel SOS
    - POST /api/v1/emergency/sos/{id}/update-status/ - Update status
    - GET /api/v1/emergency/sos/history/ - Get SOS history
    - GET /api/v1/emergency/sos/types/ - Get emergency types
    """
    
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['trigger', 'create']:
            return SOSAlertCreateSerializer
        elif self.action == 'quick_trigger':
            return SOSQuickTriggerSerializer
        elif self.action == 'cancel':
            return SOSCancelSerializer
        elif self.action == 'update_status':
            return SOSAlertUpdateSerializer
        elif self.action == 'list' or self.action == 'history':
            return SOSAlertListSerializer
        return SOSAlertSerializer
    
    def get_queryset(self):
        """Return only current user's SOS alerts."""
        return SOSAlert.objects.filter(
            user=self.request.user
        ).order_by('-created_at')
    
    @action(detail=False, methods=['post'])
    def trigger(self, request):
        """
        Trigger a new SOS alert.
        
        Body: {
            "emergency_type": "medical",
            "latitude": 17.385,
            "longitude": 78.4867,
            "location_accuracy": 10.5,
            "description": "Need immediate help"
        }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        sos_service = SOSService()
        
        sos_alert, result = sos_service.trigger_sos(
            user=request.user,
            emergency_type=serializer.validated_data.get('emergency_type', 'medical'),
            latitude=serializer.validated_data.get('latitude'),
            longitude=serializer.validated_data.get('longitude'),
            location_accuracy=serializer.validated_data.get('location_accuracy'),
            description=serializer.validated_data.get('description', ''),
        )
        
        response_status = status.HTTP_201_CREATED if result['is_new'] else status.HTTP_200_OK
        
        return Response({
            'success': True,
            'is_new': result['is_new'],
            'message': result['message'],
            'sos': SOSAlertSerializer(sos_alert, context={'request': request}).data,
            'contacts_notified': result.get('contacts_notified', 0),
            'nearby_hospitals': result.get('nearby_hospitals', []),
        }, status=response_status)
    
    @action(detail=False, methods=['post'], url_path='quick-trigger')
    def quick_trigger(self, request):
        """
        Quick one-tap SOS trigger.
        Minimal data required for fastest response.
        
        Body: {
            "emergency_type": "medical",
            "latitude": 17.385 (optional),
            "longitude": 78.4867 (optional),
            "use_cached_location": true
        }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        sos_service = SOSService()
        
        sos_alert, result = sos_service.trigger_sos(
            user=request.user,
            emergency_type=serializer.validated_data.get('emergency_type', 'medical'),
            latitude=serializer.validated_data.get('latitude'),
            longitude=serializer.validated_data.get('longitude'),
            use_cached_location=serializer.validated_data.get('use_cached_location', True),
        )
        
        response_status = status.HTTP_201_CREATED if result['is_new'] else status.HTTP_200_OK
        
        return Response({
            'success': True,
            'is_new': result['is_new'],
            'message': result['message'],
            'sos_id': str(sos_alert.id),
            'status': sos_alert.status,
            'contacts_notified': result.get('contacts_notified', 0),
        }, status=response_status)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get user's active SOS alert if any."""
        sos_service = SOSService()
        active_sos = sos_service.get_active_sos(request.user)
        
        if active_sos:
            return Response({
                'success': True,
                'has_active': True,
                'sos': SOSAlertSerializer(
                    active_sos, 
                    context={'request': request}
                ).data,
            })
        
        return Response({
            'success': True,
            'has_active': False,
            'sos': None,
        })
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel an active SOS alert.
        
        Body: {
            "reason": "mistake",
            "notes": "Accidentally triggered"
        }
        """
        sos_service = SOSService()
        sos_alert = sos_service.get_sos_by_id(pk, request.user)
        
        if not sos_alert:
            return Response({
                'success': False,
                'error': 'SOS alert not found',
            }, status=status.HTTP_404_NOT_FOUND)
        
        if sos_alert.status in ['resolved', 'cancelled', 'false_alarm']:
            return Response({
                'success': False,
                'error': f'SOS alert is already {sos_alert.status}',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        sos_alert = sos_service.cancel_sos(
            sos_alert=sos_alert,
            reason=serializer.validated_data['reason'],
            notes=serializer.validated_data.get('notes', ''),
        )
        
        return Response({
            'success': True,
            'message': 'SOS alert cancelled',
            'sos': SOSAlertSerializer(
                sos_alert, 
                context={'request': request}
            ).data,
        })
    
    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        """
        Update SOS alert status.
        
        Body: {
            "status": "acknowledged",
            "acknowledged_by": "Dr. Rao",
            "responder_eta": 15
        }
        """
        sos_service = SOSService()
        sos_alert = sos_service.get_sos_by_id(pk, request.user)
        
        if not sos_alert:
            return Response({
                'success': False,
                'error': 'SOS alert not found',
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.get_serializer(sos_alert, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        sos_alert = sos_service.update_sos_status(
            sos_alert=sos_alert,
            new_status=serializer.validated_data.get('status', sos_alert.status),
            acknowledged_by=serializer.validated_data.get('acknowledged_by', ''),
            responder_eta=serializer.validated_data.get('responder_eta'),
            resolution_notes=serializer.validated_data.get('resolution_notes', ''),
        )
        
        return Response({
            'success': True,
            'message': f'SOS status updated to {sos_alert.status}',
            'sos': SOSAlertSerializer(
                sos_alert, 
                context={'request': request}
            ).data,
        })
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get user's SOS history."""
        limit = int(request.query_params.get('limit', 20))
        include_active = request.query_params.get('include_active', 'true').lower() == 'true'
        
        sos_service = SOSService()
        sos_alerts = sos_service.get_user_sos_history(
            user=request.user,
            limit=limit,
            include_active=include_active,
        )
        
        serializer = self.get_serializer(sos_alerts, many=True)
        
        return Response({
            'success': True,
            'count': len(sos_alerts),
            'alerts': serializer.data,
        })
    
    @action(detail=False, methods=['get'])
    def types(self, request):
        """Get list of emergency types with translations."""
        language = request.query_params.get('lang', 'en')
        if language not in ['en', 'te', 'hi']:
            language = 'en'
        
        sos_service = SOSService()
        types = sos_service.get_emergency_types(language)
        
        return Response({
            'success': True,
            'language': language,
            'types': types,
        })
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get user's SOS statistics."""
        sos_service = SOSService()
        stats = sos_service.get_sos_statistics(request.user)
        
        return Response({
            'success': True,
            'statistics': stats,
        })


# =============================================================================
# FIRST AID GUIDE VIEWS
# =============================================================================

class FirstAidGuideViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for first aid guides.
    Read-only - data is pre-loaded.
    
    Endpoints:
    - GET /api/v1/emergency/first-aid/ - List all guides
    - GET /api/v1/emergency/first-aid/{id}/ - Get guide details
    - GET /api/v1/emergency/first-aid/critical/ - Get critical guides
    - GET /api/v1/emergency/first-aid/by-category/{category}/ - Get by category
    """
    
    permission_classes = [AllowAny]  # First aid should be accessible without login
    queryset = FirstAidGuide.objects.filter(is_active=True)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return FirstAidGuideListSerializer
        return FirstAidGuideSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['language'] = self.request.query_params.get('lang', 'en')
        return context
    
    def list(self, request, *args, **kwargs):
        """List all first aid guides."""
        queryset = self.get_queryset().order_by('display_order', 'title_en')
        
        # Filter by category if provided
        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        serializer = self.get_serializer(queryset, many=True)
        
        # Get available categories
        categories = FirstAidGuide.CATEGORY_CHOICES
        
        return Response({
            'success': True,
            'count': queryset.count(),
            'categories': [{'code': c[0], 'name': c[1]} for c in categories],
            'guides': serializer.data,
        })
    
    @action(detail=False, methods=['get'])
    def critical(self, request):
        """Get critical/life-threatening first aid guides."""
        queryset = self.get_queryset().filter(
            is_critical=True
        ).order_by('display_order')
        
        serializer = FirstAidGuideSerializer(
            queryset, 
            many=True, 
            context=self.get_serializer_context()
        )
        
        return Response({
            'success': True,
            'count': queryset.count(),
            'guides': serializer.data,
        })
    
    @action(detail=False, methods=['get'], url_path='by-category/(?P<category>[^/.]+)')
    def by_category(self, request, category=None):
        """Get first aid guides by category."""
        valid_categories = [c[0] for c in FirstAidGuide.CATEGORY_CHOICES]
        
        if category not in valid_categories:
            return Response({
                'success': False,
                'error': f'Invalid category. Valid categories: {valid_categories}',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        queryset = self.get_queryset().filter(
            category=category
        ).order_by('display_order')
        
        serializer = FirstAidGuideSerializer(
            queryset, 
            many=True, 
            context=self.get_serializer_context()
        )
        
        return Response({
            'success': True,
            'category': category,
            'count': queryset.count(),
            'guides': serializer.data,
        })


# =============================================================================
# EMERGENCY HELPLINE VIEWS
# =============================================================================

class EmergencyHelplineViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for emergency helplines.
    Read-only - data is pre-loaded.
    
    Endpoints:
    - GET /api/v1/emergency/helplines/ - List all helplines
    - GET /api/v1/emergency/helplines/{id}/ - Get helpline details
    - GET /api/v1/emergency/helplines/by-type/{type}/ - Get by type
    """
    
    permission_classes = [AllowAny]  # Helplines should be accessible without login
    queryset = EmergencyHelpline.objects.filter(is_active=True)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return EmergencyHelplineListSerializer
        return EmergencyHelplineSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['language'] = self.request.query_params.get('lang', 'en')
        return context
    
    def list(self, request, *args, **kwargs):
        """List all emergency helplines."""
        queryset = self.get_queryset().order_by('display_order')
        
        # Filter by type
        helpline_type = request.query_params.get('type')
        if helpline_type:
            queryset = queryset.filter(helpline_type=helpline_type)
        
        # Filter by national only
        if request.query_params.get('national_only') == 'true':
            queryset = queryset.filter(is_national=True)
        
        # Filter by state
        state = request.query_params.get('state')
        if state:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(is_national=True) | Q(state__icontains=state)
            )
        
        serializer = self.get_serializer(queryset, many=True)
        
        # Get available types
        types = EmergencyHelpline.HELPLINE_TYPES
        
        return Response({
            'success': True,
            'count': queryset.count(),
            'types': [{'code': t[0], 'name': t[1]} for t in types],
            'helplines': serializer.data,
        })
    
    @action(detail=False, methods=['get'], url_path='by-type/(?P<helpline_type>[^/.]+)')
    def by_type(self, request, helpline_type=None):
        """Get helplines by type."""
        valid_types = [t[0] for t in EmergencyHelpline.HELPLINE_TYPES]
        
        if helpline_type not in valid_types:
            return Response({
                'success': False,
                'error': f'Invalid type. Valid types: {valid_types}',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        queryset = self.get_queryset().filter(
            helpline_type=helpline_type
        ).order_by('display_order')
        
        serializer = EmergencyHelplineSerializer(
            queryset, 
            many=True, 
            context=self.get_serializer_context()
        )
        
        return Response({
            'success': True,
            'type': helpline_type,
            'count': queryset.count(),
            'helplines': serializer.data,
        })
    
    @action(detail=False, methods=['get'])
    def important(self, request):
        """Get most important helplines (ambulance, police, fire)."""
        important_types = ['ambulance', 'police', 'fire']
        
        queryset = self.get_queryset().filter(
            helpline_type__in=important_types,
            is_national=True
        ).order_by('display_order')
        
        serializer = EmergencyHelplineSerializer(
            queryset, 
            many=True, 
            context=self.get_serializer_context()
        )
        
        return Response({
            'success': True,
            'helplines': serializer.data,
        })


# =============================================================================
# LOCATION VIEWS
# =============================================================================

class LocationView(views.APIView):
    """
    API view for location updates.
    
    Endpoints:
    - POST /api/v1/emergency/location/update/ - Update user location
    - GET /api/v1/emergency/location/ - Get cached location
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user's cached location."""
        location_service = LocationService()
        location = location_service.get_user_location(request.user)
        
        if location:
            return Response({
                'success': True,
                'has_location': True,
                'location': location,
            })
        
        return Response({
            'success': True,
            'has_location': False,
            'location': None,
        })
    
    def post(self, request):
        """Update user's location."""
        serializer = LocationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        location_service = LocationService()
        cache = location_service.update_user_location(
            user=request.user,
            latitude=float(serializer.validated_data['latitude']),
            longitude=float(serializer.validated_data['longitude']),
            accuracy=serializer.validated_data.get('accuracy'),
            address=serializer.validated_data.get('address', ''),
        )
        
        return Response({
            'success': True,
            'message': 'Location updated',
            'location': UserLocationCacheSerializer(cache).data,
        })


# =============================================================================
# QUICK SOS DATA VIEW
# =============================================================================

class QuickSOSDataView(views.APIView):
    """
    Get all data needed for SOS screen in one call.
    Optimized for quick loading.
    
    Endpoint:
    - GET /api/v1/emergency/quick-sos-data/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all SOS screen data."""
        language = request.query_params.get('lang', 'en')
        if language not in ['en', 'te', 'hi']:
            language = 'en'
        
        location_service = LocationService()
        data = location_service.get_quick_sos_data(
            user=request.user,
            language=language
        )
        
        # Add emergency types
        sos_service = SOSService()
        data['emergency_types'] = sos_service.get_emergency_types(language)
        
        return Response({
            'success': True,
            'language': language,
            'data': data,
        })


# =============================================================================
# HEALTH CHECK VIEW
# =============================================================================

class EmergencyHealthCheckView(views.APIView):
    """
    Health check endpoint for emergency app.
    
    Endpoint:
    - GET /api/v1/emergency/health/
    """
    
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Check emergency app health."""
        health_status = {
            'status': 'healthy',
            'app': 'emergency',
            'timestamp': timezone.now().isoformat(),
        }
        
        # Check database connectivity
        try:
            EmergencyHelpline.objects.count()
            health_status['database'] = 'connected'
        except Exception as e:
            health_status['database'] = f'error: {str(e)}'
            health_status['status'] = 'unhealthy'
        
        # Check data availability
        try:
            health_status['data'] = {
                'helplines': EmergencyHelpline.objects.filter(is_active=True).count(),
                'services': EmergencyService.objects.filter(is_active=True).count(),
                'first_aid_guides': FirstAidGuide.objects.filter(is_active=True).count(),
            }
        except Exception as e:
            health_status['data'] = f'error: {str(e)}'
        
        status_code = status.HTTP_200_OK if health_status['status'] == 'healthy' else status.HTTP_503_SERVICE_UNAVAILABLE
        
        return Response(health_status, status=status_code)
