from django.apps import AppConfig


class ChatbotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.chatbot'
    verbose_name = 'Chatbot'

    def ready(self):
        """
        Initialize chatbot services when app is ready.
        Import signals if any.
        """
        pass