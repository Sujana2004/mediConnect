"""
Jitsi Meet Integration Service
==============================
Handles Jitsi room creation and management.
Uses meet.jit.si (FREE, no API key needed).

For production, you can:
1. Use meet.jit.si (FREE, public)
2. Self-host Jitsi (FREE, private)
3. Use 8x8.vc (FREE tier available)
"""

import uuid
import hashlib
import logging
from datetime import timedelta
from typing import Dict, Optional, Tuple
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)


class JitsiService:
    """
    Service for managing Jitsi Meet rooms.
    """
    
    # Default Jitsi domain (FREE public server)
    DEFAULT_DOMAIN = getattr(settings, 'JITSI_DOMAIN', 'meet.jit.si')
    
    # Room name prefix for our app
    ROOM_PREFIX = 'mediconnect'
    
    # Room expiry time in hours
    ROOM_EXPIRY_HOURS = getattr(settings, 'JITSI_ROOM_EXPIRY_HOURS', 2)
    
    @classmethod
    def generate_room_name(cls, consultation_id: str, doctor_id: str) -> str:
        """
        Generate a unique, secure room name.
        Format: mediconnect-{short_hash}-{timestamp}
        """
        # Create unique string
        unique_string = f"{consultation_id}-{doctor_id}-{uuid.uuid4()}"
        
        # Create short hash
        hash_object = hashlib.sha256(unique_string.encode())
        short_hash = hash_object.hexdigest()[:12]
        
        # Add timestamp for uniqueness
        timestamp = timezone.now().strftime('%Y%m%d%H%M')
        
        room_name = f"{cls.ROOM_PREFIX}-{short_hash}-{timestamp}"
        
        logger.info(f"Generated room name: {room_name}")
        return room_name
    
    @classmethod
    def generate_room_password(cls) -> str:
        """Generate a simple room password."""
        return str(uuid.uuid4())[:8]
    
    @classmethod
    def create_room_config(
        cls,
        consultation_id: str,
        doctor_id: str,
        is_audio_only: bool = False,
        enable_lobby: bool = True,
        password_protected: bool = False
    ) -> Dict:
        """
        Create room configuration for a consultation.
        
        Returns:
            Dict with room configuration
        """
        room_name = cls.generate_room_name(consultation_id, doctor_id)
        room_password = cls.generate_room_password() if password_protected else None
        
        expires_at = timezone.now() + timedelta(hours=cls.ROOM_EXPIRY_HOURS)
        
        config = {
            'room_name': room_name,
            'room_password': room_password,
            'jitsi_domain': cls.DEFAULT_DOMAIN,
            'is_audio_only': is_audio_only,
            'is_lobby_enabled': enable_lobby,
            'max_participants': 2,
            'expires_at': expires_at,
            'status': 'created',
        }
        
        logger.info(f"Created room config: {room_name}")
        return config
    
    @classmethod
    def get_join_url(
        cls,
        room_name: str,
        display_name: str,
        is_moderator: bool = False,
        is_audio_only: bool = False,
        language: str = 'en',
        domain: str = None
    ) -> str:
        """
        Generate a Jitsi join URL with configuration.
        
        Args:
            room_name: Jitsi room name
            display_name: User's display name
            is_moderator: If True, user has moderator privileges
            is_audio_only: If True, start with video disabled
            language: Interface language
            domain: Jitsi domain (default: meet.jit.si)
        
        Returns:
            Full Jitsi join URL
        """
        import urllib.parse
        
        domain = domain or cls.DEFAULT_DOMAIN
        base_url = f"https://{domain}/{room_name}"
        
        # Jitsi URL configuration parameters
        config_params = []
        interface_params = []
        
        # User info
        config_params.append(f"userInfo.displayName={urllib.parse.quote(display_name)}")
        
        # Audio/Video settings
        if is_audio_only:
            config_params.append("config.startWithVideoMuted=true")
            config_params.append("config.startAudioOnly=true")
        else:
            config_params.append("config.startWithVideoMuted=false")
        
        config_params.append("config.startWithAudioMuted=true")  # Always start muted
        
        # Moderator settings
        if is_moderator:
            config_params.append("config.prejoinPageEnabled=false")
        else:
            config_params.append("config.prejoinPageEnabled=true")
        
        # Language
        lang_map = {'en': 'en', 'te': 'te', 'hi': 'hi'}
        config_params.append(f"config.defaultLanguage={lang_map.get(language, 'en')}")
        
        # Interface customization
        interface_params.extend([
            "interfaceConfig.SHOW_JITSI_WATERMARK=false",
            "interfaceConfig.SHOW_BRAND_WATERMARK=false",
            "interfaceConfig.BRAND_WATERMARK_LINK=",
            "interfaceConfig.SHOW_POWERED_BY=false",
            "interfaceConfig.TOOLBAR_BUTTONS=['microphone','camera','closedcaptions','desktop','chat','raisehand','hangup','settings']",
        ])
        
        # Disable some features for simplicity
        config_params.extend([
            "config.disableDeepLinking=true",
            "config.hideConferenceSubject=true",
            "config.hideConferenceTimer=false",
            "config.disableInviteFunctions=true",
        ])
        
        # Combine all parameters
        all_params = config_params + interface_params
        hash_params = '&'.join(all_params)
        
        join_url = f"{base_url}#{hash_params}"
        
        logger.info(f"Generated join URL for {display_name} (moderator: {is_moderator})")
        return join_url
    
    @classmethod
    def get_embed_config(
        cls,
        room_name: str,
        display_name: str,
        is_moderator: bool = False,
        is_audio_only: bool = False,
        language: str = 'en',
        domain: str = None
    ) -> Dict:
        """
        Get configuration for Jitsi Meet iframe embedding.
        Used for embedding Jitsi in the frontend.
        
        Returns:
            Dict with iframe configuration
        """
        domain = domain or cls.DEFAULT_DOMAIN
        
        config = {
            'domain': domain,
            'roomName': room_name,
            'width': '100%',
            'height': '100%',
            'parentNode': None,  # Set in frontend
            'configOverwrite': {
                'startWithAudioMuted': True,
                'startWithVideoMuted': is_audio_only,
                'startAudioOnly': is_audio_only,
                'prejoinPageEnabled': not is_moderator,
                'disableDeepLinking': True,
                'hideConferenceSubject': True,
                'disableInviteFunctions': True,
                'defaultLanguage': language,
                'toolbarButtons': [
                    'microphone',
                    'camera',
                    'chat',
                    'raisehand',
                    'hangup',
                    'settings',
                ],
            },
            'interfaceConfigOverwrite': {
                'SHOW_JITSI_WATERMARK': False,
                'SHOW_BRAND_WATERMARK': False,
                'SHOW_POWERED_BY': False,
                'MOBILE_APP_PROMO': False,
                'HIDE_INVITE_MORE_HEADER': True,
            },
            'userInfo': {
                'displayName': display_name,
            }
        }
        
        if is_moderator:
            config['configOverwrite']['startAudioOnly'] = False
            config['userInfo']['moderator'] = True
        
        return config
    
    @classmethod
    def get_mobile_deep_link(
        cls,
        room_name: str,
        domain: str = None
    ) -> str:
        """
        Get deep link for Jitsi mobile app.
        Falls back to web if app not installed.
        """
        domain = domain or cls.DEFAULT_DOMAIN
        return f"org.jitsi.meet://{domain}/{room_name}"
    
    @classmethod
    def validate_room_name(cls, room_name: str) -> Tuple[bool, str]:
        """
        Validate room name format.
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not room_name:
            return False, "Room name is required"
        
        if len(room_name) < 10:
            return False, "Room name too short"
        
        if len(room_name) > 100:
            return False, "Room name too long"
        
        # Check for valid characters
        import re
        if not re.match(r'^[a-zA-Z0-9\-_]+$', room_name):
            return False, "Room name contains invalid characters"
        
        return True, ""
    
    @classmethod
    def get_room_info(cls, room_name: str, domain: str = None) -> Dict:
        """
        Get room information.
        Note: Public Jitsi doesn't have API for this.
        This returns basic info we can derive.
        """
        domain = domain or cls.DEFAULT_DOMAIN
        
        return {
            'room_name': room_name,
            'domain': domain,
            'full_url': f"https://{domain}/{room_name}",
            'is_public_server': domain == 'meet.jit.si',
        }
    
    @classmethod
    def get_supported_languages(cls) -> list:
        """Get languages supported by Jitsi for interface."""
        return [
            {'code': 'en', 'name': 'English'},
            {'code': 'hi', 'name': 'Hindi'},
            {'code': 'te', 'name': 'Telugu'},
        ]