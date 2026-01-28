# """
# Consultation Configuration
# ==========================
# Jitsi Meet and consultation settings.
# """

# import os
# import secrets

# # =============================================================================
# # JITSI MEET CONFIGURATION (FREE!)
# # =============================================================================

# JITSI_CONFIG = {
#     # Public Jitsi server (FREE, no setup required)
#     # For production, you can self-host or use meet.jit.si
#     'server_url': os.environ.get('JITSI_SERVER_URL', 'https://meet.jit.si'),
    
#     # Optional: Your own Jitsi server
#     # 'server_url': 'https://your-jitsi-server.com',
    
#     # Room name prefix (to avoid collisions)
#     'room_prefix': os.environ.get('JITSI_ROOM_PREFIX', 'mediconnect'),
    
#     # JWT settings (optional, for authenticated rooms)
#     'jwt_enabled': os.environ.get('JITSI_JWT_ENABLED', 'false').lower() == 'true',
#     'jwt_secret': os.environ.get('JITSI_JWT_SECRET', ''),
#     'jwt_app_id': os.environ.get('JITSI_JWT_APP_ID', 'mediconnect'),
    
#     # Default room settings
#     'default_settings': {
#         'startWithAudioMuted': False,
#         'startWithVideoMuted': False,
#         'enableWelcomePage': False,
#         'enableClosePage': False,
#         'disableDeepLinking': True,
#         'prejoinPageEnabled': True,
#         'enableNoisyMicDetection': True,
#         'enableNoAudioDetection': True,
#         'enableLobby': True,  # Waiting room
#         'hideLobbyButton': False,
#     },
    
#     # Interface settings
#     'interface_config': {
#         'SHOW_JITSI_WATERMARK': False,
#         'SHOW_WATERMARK_FOR_GUESTS': False,
#         'SHOW_BRAND_WATERMARK': False,
#         'BRAND_WATERMARK_LINK': '',
#         'SHOW_POWERED_BY': False,
#         'SHOW_PROMOTIONAL_CLOSE_PAGE': False,
#         'DISABLE_JOIN_LEAVE_NOTIFICATIONS': False,
#         'DISABLE_PRESENCE_STATUS': False,
#         'DISABLE_TRANSCRIPTION_SUBTITLES': False,
#         'MOBILE_APP_PROMO': False,
#         'TOOLBAR_BUTTONS': [
#             'microphone', 'camera', 'closedcaptions', 'desktop',
#             'fullscreen', 'fodeviceselection', 'hangup', 'chat',
#             'recording', 'settings', 'raisehand', 'videoquality',
#             'filmstrip', 'feedback', 'stats', 'shortcuts', 'tileview',
#             'download', 'help', 'mute-everyone',
#         ],
#     },
# }


# # =============================================================================
# # CONSULTATION SETTINGS
# # =============================================================================

# CONSULTATION_SETTINGS = {
#     # Duration limits (in minutes)
#     'min_duration': 5,
#     'max_duration': 60,
#     'default_duration': 30,
    
#     # Scheduling
#     'advance_booking_days': 30,      # How far in advance can book
#     'min_booking_notice_hours': 1,   # Minimum hours before appointment
    
#     # Waiting room
#     'waiting_room_enabled': True,
#     'waiting_room_timeout_minutes': 15,
#     'early_join_minutes': 10,        # How early patient can join
    
#     # No-show policy
#     'no_show_timeout_minutes': 15,
#     'no_show_penalty_enabled': False,
    
#     # Recording
#     'recording_enabled': True,
#     'recording_requires_consent': True,
#     'recording_storage_days': 30,
    
#     # Chat
#     'chat_enabled': True,
#     'file_sharing_enabled': True,
#     'max_file_size_mb': 10,
    
#     # Participants
#     'max_participants': 4,
#     'allow_family_helper': True,
#     'allow_translator': True,
# }


# # =============================================================================
# # ROOM NAME GENERATION
# # =============================================================================

# def generate_room_name(consultation_id: str) -> str:
#     """
#     Generate a unique, secure room name for Jitsi.
    
#     Args:
#         consultation_id: UUID of the consultation
        
#     Returns:
#         Unique room name
#     """
#     prefix = JITSI_CONFIG['room_prefix']
#     # Add random suffix for extra security
#     random_suffix = secrets.token_hex(4)
#     # Use first 8 chars of consultation ID
#     short_id = str(consultation_id).replace('-', '')[:8]
    
#     return f"{prefix}_{short_id}_{random_suffix}"


# def get_jitsi_room_url(room_name: str) -> str:
#     """
#     Get full Jitsi room URL.
    
#     Args:
#         room_name: Room name
        
#     Returns:
#         Full URL to join the room
#     """
#     server_url = JITSI_CONFIG['server_url'].rstrip('/')
#     return f"{server_url}/{room_name}"