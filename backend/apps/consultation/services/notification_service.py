"""
Consultation Notification Service
=================================
Handles sending notifications for consultation events.
"""

import logging
from typing import Optional
from django.utils import timezone

logger = logging.getLogger(__name__)


class ConsultationNotificationService:
    """
    Service for sending consultation-related notifications.
    Uses the notifications app.
    """
    
    @classmethod
    def _send_notification(
        cls,
        user,
        notification_type: str,
        title: str,
        message: str,
        data: dict = None
    ):
        """
        Send notification via notifications app.
        """
        try:
            from apps.notifications.services import NotificationService
            
            NotificationService.send_to_user(
                user=user,
                notification_type=notification_type,
                title=title,
                message=message,
                data=data or {}
            )
        except ImportError:
            logger.warning("Notifications app not available")
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
    
    @classmethod
    def send_consultation_scheduled(cls, consultation):
        """
        Notify patient that consultation is scheduled.
        """
        messages = {
            'en': {
                'title': 'Consultation Scheduled',
                'message': f"Your consultation with Dr. {consultation.doctor.first_name} is scheduled for {consultation.scheduled_start.strftime('%d %b at %I:%M %p')}"
            },
            'te': {
                'title': 'సంప్రదింపు షెడ్యూల్ చేయబడింది',
                'message': f"Dr. {consultation.doctor.first_name} తో మీ సంప్రదింపు {consultation.scheduled_start.strftime('%d %b, %I:%M %p')} కు షెడ్యూల్ చేయబడింది"
            },
            'hi': {
                'title': 'परामर्श निर्धारित',
                'message': f"डॉ. {consultation.doctor.first_name} के साथ आपका परामर्श {consultation.scheduled_start.strftime('%d %b, %I:%M %p')} के लिए निर्धारित है"
            }
        }
        
        lang = consultation.language
        msg = messages.get(lang, messages['en'])
        
        cls._send_notification(
            user=consultation.patient,
            notification_type='consultation',
            title=msg['title'],
            message=msg['message'],
            data={
                'consultation_id': str(consultation.id),
                'action': 'scheduled'
            }
        )
        
        logger.info(f"Sent scheduled notification for consultation {consultation.id}")
    
    @classmethod
    def send_patient_waiting(cls, consultation):
        """
        Notify doctor that patient is in waiting room.
        """
        messages = {
            'en': {
                'title': 'Patient Waiting',
                'message': f"{consultation.patient.first_name} is waiting for the consultation"
            },
            'te': {
                'title': 'రోగి వేచి ఉన్నారు',
                'message': f"{consultation.patient.first_name} సంప్రదింపు కోసం వేచి ఉన్నారు"
            },
            'hi': {
                'title': 'मरीज प्रतीक्षा कर रहे हैं',
                'message': f"{consultation.patient.first_name} परामर्श के लिए प्रतीक्षा कर रहे हैं"
            }
        }
        
        lang = consultation.language
        msg = messages.get(lang, messages['en'])
        
        cls._send_notification(
            user=consultation.doctor,
            notification_type='consultation',
            title=msg['title'],
            message=msg['message'],
            data={
                'consultation_id': str(consultation.id),
                'action': 'patient_waiting'
            }
        )
        
        logger.info(f"Sent patient waiting notification for consultation {consultation.id}")
    
    @classmethod
    def send_consultation_started(cls, consultation):
        """
        Notify patient that doctor has started the consultation.
        """
        messages = {
            'en': {
                'title': 'Consultation Started',
                'message': f"Dr. {consultation.doctor.first_name} has started the consultation. Join now!"
            },
            'te': {
                'title': 'సంప్రదింపు ప్రారంభమైంది',
                'message': f"Dr. {consultation.doctor.first_name} సంప్రదింపును ప్రారంభించారు. ఇప్పుడే చేరండి!"
            },
            'hi': {
                'title': 'परामर्श शुरू हुआ',
                'message': f"डॉ. {consultation.doctor.first_name} ने परामर्श शुरू कर दिया है। अभी शामिल हों!"
            }
        }
        
        lang = consultation.language
        msg = messages.get(lang, messages['en'])
        
        cls._send_notification(
            user=consultation.patient,
            notification_type='consultation',
            title=msg['title'],
            message=msg['message'],
            data={
                'consultation_id': str(consultation.id),
                'action': 'started'
            }
        )
        
        logger.info(f"Sent consultation started notification for consultation {consultation.id}")
    
    @classmethod
    def send_consultation_completed(cls, consultation):
        """
        Notify patient that consultation is completed.
        """
        messages = {
            'en': {
                'title': 'Consultation Completed',
                'message': f"Your consultation with Dr. {consultation.doctor.first_name} is completed. Please provide feedback."
            },
            'te': {
                'title': 'సంప్రదింపు పూర్తయింది',
                'message': f"Dr. {consultation.doctor.first_name} తో మీ సంప్రదింపు పూర్తయింది. దయచేసి అభిప్రాయాన్ని తెలియజేయండి."
            },
            'hi': {
                'title': 'परामर्श पूर्ण',
                'message': f"डॉ. {consultation.doctor.first_name} के साथ आपका परामर्श पूर्ण हुआ। कृपया प्रतिक्रिया दें।"
            }
        }
        
        lang = consultation.language
        msg = messages.get(lang, messages['en'])
        
        cls._send_notification(
            user=consultation.patient,
            notification_type='consultation',
            title=msg['title'],
            message=msg['message'],
            data={
                'consultation_id': str(consultation.id),
                'action': 'completed'
            }
        )
        
        logger.info(f"Sent consultation completed notification for consultation {consultation.id}")
    
    @classmethod
    def send_consultation_cancelled(cls, consultation, cancelled_by):
        """
        Notify both parties about cancellation.
        """
        # Determine who to notify (the other party)
        if cancelled_by.id == consultation.doctor.id:
            notify_user = consultation.patient
            cancelled_by_text = f"Dr. {consultation.doctor.first_name}"
        else:
            notify_user = consultation.doctor
            cancelled_by_text = consultation.patient.first_name
        
        messages = {
            'en': {
                'title': 'Consultation Cancelled',
                'message': f"Consultation has been cancelled by {cancelled_by_text}"
            },
            'te': {
                'title': 'సంప్రదింపు రద్దు చేయబడింది',
                'message': f"{cancelled_by_text} సంప్రదింపును రద్దు చేసారు"
            },
            'hi': {
                'title': 'परामर्श रद्द',
                'message': f"{cancelled_by_text} द्वारा परामर्श रद्द कर दिया गया"
            }
        }
        
        lang = consultation.language
        msg = messages.get(lang, messages['en'])
        
        cls._send_notification(
            user=notify_user,
            notification_type='consultation',
            title=msg['title'],
            message=msg['message'],
            data={
                'consultation_id': str(consultation.id),
                'action': 'cancelled'
            }
        )
        
        logger.info(f"Sent cancellation notification for consultation {consultation.id}")
    
    @classmethod
    def send_reminder(cls, consultation, minutes_before: int = 15):
        """
        Send reminder before consultation.
        """
        messages = {
            'en': {
                'title': 'Consultation Reminder',
                'message': f"Your consultation with Dr. {consultation.doctor.first_name} starts in {minutes_before} minutes"
            },
            'te': {
                'title': 'సంప్రదింపు రిమైండర్',
                'message': f"Dr. {consultation.doctor.first_name} తో మీ సంప్రదింపు {minutes_before} నిమిషాల్లో ప్రారంభమవుతుంది"
            },
            'hi': {
                'title': 'परामर्श अनुस्मारक',
                'message': f"डॉ. {consultation.doctor.first_name} के साथ आपका परामर्श {minutes_before} मिनट में शुरू होगा"
            }
        }
        
        lang = consultation.language
        msg = messages.get(lang, messages['en'])
        
        # Notify patient
        cls._send_notification(
            user=consultation.patient,
            notification_type='reminder',
            title=msg['title'],
            message=msg['message'],
            data={
                'consultation_id': str(consultation.id),
                'action': 'reminder'
            }
        )
        
        # Also remind doctor
        doctor_msg = {
            'en': f"Consultation with {consultation.patient.first_name} starts in {minutes_before} minutes",
            'te': f"{consultation.patient.first_name} తో సంప్రదింపు {minutes_before} నిమిషాల్లో",
            'hi': f"{consultation.patient.first_name} के साथ परामर्श {minutes_before} मिनट में"
        }
        
        cls._send_notification(
            user=consultation.doctor,
            notification_type='reminder',
            title=msg['title'],
            message=doctor_msg.get(lang, doctor_msg['en']),
            data={
                'consultation_id': str(consultation.id),
                'action': 'reminder'
            }
        )
        
        logger.info(f"Sent reminder for consultation {consultation.id}")
    
    @classmethod
    def send_follow_up_reminder(cls, consultation):
        """
        Send follow-up reminder.
        """
        if not consultation.follow_up_required or not consultation.follow_up_date:
            return
        
        messages = {
            'en': {
                'title': 'Follow-up Reminder',
                'message': f"Your follow-up consultation with Dr. {consultation.doctor.first_name} is scheduled for {consultation.follow_up_date.strftime('%d %b')}"
            },
            'te': {
                'title': 'ఫాలో-అప్ రిమైండర్',
                'message': f"Dr. {consultation.doctor.first_name} తో మీ ఫాలో-అప్ {consultation.follow_up_date.strftime('%d %b')} న షెడ్యూల్ చేయబడింది"
            },
            'hi': {
                'title': 'फॉलो-अप अनुस्मारक',
                'message': f"डॉ. {consultation.doctor.first_name} के साथ आपका फॉलो-अप {consultation.follow_up_date.strftime('%d %b')} के लिए निर्धारित है"
            }
        }
        
        lang = consultation.language
        msg = messages.get(lang, messages['en'])
        
        cls._send_notification(
            user=consultation.patient,
            notification_type='reminder',
            title=msg['title'],
            message=msg['message'],
            data={
                'consultation_id': str(consultation.id),
                'action': 'follow_up_reminder'
            }
        )
        
        logger.info(f"Sent follow-up reminder for consultation {consultation.id}")