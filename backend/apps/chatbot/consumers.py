# apps/chatbot/consumers.py
"""
WebSocket consumers for real-time chat.
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

from .models import ChatSession, ChatMessage
from .chat_engine import get_chat_engine


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat.
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'chat_{self.session_id}'
        self.user = self.scope['user']
        
        # Check if user is authenticated
        if not self.user.is_authenticated:
            await self.close()
            return
        
        # Verify session ownership
        session = await self.get_session()
        if not session or session.user_id != self.user.id:
            await self.close()
            return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'session_id': str(self.session_id),
            'message': 'Connected to chat'
        }))
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle incoming WebSocket message."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'message')
            
            if message_type == 'message':
                await self.handle_message(data)
            elif message_type == 'typing':
                await self.handle_typing(data)
            elif message_type == 'read':
                await self.handle_read(data)
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))
    
    async def handle_message(self, data):
        """Process user message and get bot response."""
        user_message = data.get('message', '').strip()
        language = data.get('language', 'te')
        
        if not user_message:
            return
        
        # Get session
        session = await self.get_session()
        if not session:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Session not found'
            }))
            return
        
        # Send user message to group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'sender': 'user',
                'message': user_message,
                'timestamp': timezone.now().isoformat()
            }
        )
        
        # Show typing indicator
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'is_typing': True
            }
        )
        
        # Process message
        response = await self.process_message(session, user_message, language)
        
        # Hide typing indicator
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'is_typing': False
            }
        )
        
        # Send bot response
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'sender': 'bot',
                'message': response['response']['text'],
                'message_id': response['message_id'],
                'intent': response.get('intent'),
                'quick_replies': response['response'].get('quick_replies', []),
                'should_speak': response['response'].get('should_speak', True),
                'timestamp': timezone.now().isoformat()
            }
        )
    
    async def handle_typing(self, data):
        """Handle typing indicator."""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'is_typing': data.get('is_typing', False),
                'sender': 'user'
            }
        )
    
    async def handle_read(self, data):
        """Mark messages as read."""
        message_ids = data.get('message_ids', [])
        await self.mark_messages_read(message_ids)
    
    async def chat_message(self, event):
        """Send chat message to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'message',
            'sender': event['sender'],
            'message': event['message'],
            'message_id': event.get('message_id'),
            'intent': event.get('intent'),
            'quick_replies': event.get('quick_replies', []),
            'should_speak': event.get('should_speak', True),
            'timestamp': event['timestamp']
        }))
    
    async def typing_indicator(self, event):
        """Send typing indicator to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'is_typing': event['is_typing'],
            'sender': event.get('sender', 'bot')
        }))
    
    @database_sync_to_async
    def get_session(self):
        """Get chat session from database."""
        try:
            return ChatSession.objects.get(session_id=self.session_id)
        except ChatSession.DoesNotExist:
            return None
    
    @database_sync_to_async
    def process_message(self, session, message, language):
        """Process message using chat engine."""
        chat_engine = get_chat_engine(language)
        return chat_engine.process_message(
            session=session,
            user_message=message,
            message_type='text'
        )
    
    @database_sync_to_async
    def mark_messages_read(self, message_ids):
        """Mark messages as read."""
        ChatMessage.objects.filter(
            id__in=message_ids,
            session__user=self.user
        ).update(is_read=True, read_at=timezone.now())