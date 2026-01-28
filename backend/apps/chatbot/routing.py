# apps/chatbot/routing.py
"""
WebSocket routing for Chatbot app.
"""

from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/chat/<uuid:session_id>/', consumers.ChatConsumer.as_asgi()),
]