from django.urls import path
from . import views

app_name = 'cron'

urlpatterns = [
    # Health check (also keeps server awake)
    path('health/', views.health_check, name='health'),
    
    # Send all reminders - call every 10 minutes
    path('reminders/', views.send_all_reminders, name='reminders'),
    
    # Process missed & no-shows - call every 15 minutes
    path('missed/', views.process_missed_and_no_shows, name='missed'),
    
    # Daily maintenance - call once a day at midnight
    path('daily/', views.daily_maintenance, name='daily'),
    
    # Manual trigger for testing
    path('run-all/', views.run_all_jobs, name='run_all'),
]