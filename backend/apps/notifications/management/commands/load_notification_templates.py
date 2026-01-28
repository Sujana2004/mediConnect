"""
Load Notification Templates
===========================
Loads sample notification templates for all notification types.
Supports English, Telugu, and Hindi.

Usage:
    python manage.py load_notification_templates
    python manage.py load_notification_templates --clear
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.notifications.models import NotificationTemplate
from apps.notifications.constants import NotificationType, NotificationPriority


class Command(BaseCommand):
    help = 'Load sample notification templates with multi-language support'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing templates before loading',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing templates...')
            NotificationTemplate.objects.all().delete()
            self.stdout.write(self.style.WARNING('Existing templates cleared.'))

        with transaction.atomic():
            self.load_templates()

        self.stdout.write(self.style.SUCCESS('\n✅ All notification templates loaded successfully!'))
        self.print_summary()

    def load_templates(self):
        """Load all notification templates."""
        self.stdout.write('\n📋 Loading Notification Templates...')

        templates_data = [
            # =================================================================
            # APPOINTMENT TEMPLATES
            # =================================================================
            {
                'name': 'appointment_reminder_24hr',
                'notification_type': NotificationType.APPOINTMENT_REMINDER,
                'title_en': 'Appointment Tomorrow',
                'title_te': 'రేపు అపాయింట్‌మెంట్',
                'title_hi': 'कल अपॉइंटमेंट है',
                'body_en': 'Your appointment with {doctor_name} is tomorrow at {time}. Don\'t forget to bring your ID and medical reports.',
                'body_te': '{doctor_name} తో మీ అపాయింట్‌మెంట్ రేపు {time} కు ఉంది. మీ ID మరియు వైద్య నివేదికలను తీసుకురావడం మరచిపోకండి.',
                'body_hi': '{doctor_name} के साथ आपकी अपॉइंटमेंट कल {time} बजे है। अपना ID और मेडिकल रिपोर्ट लाना न भूलें।',
                'priority': NotificationPriority.HIGH,
                'action_url': '/appointments/{appointment_id}',
                'icon': 'calendar',
                'color': '#4CAF50',
            },
            {
                'name': 'appointment_reminder_1hr',
                'notification_type': NotificationType.APPOINTMENT_REMINDER,
                'title_en': 'Appointment in 1 Hour',
                'title_te': '1 గంటలో అపాయింట్‌మెంట్',
                'title_hi': '1 घंटे में अपॉइंटमेंट',
                'body_en': 'Your appointment with {doctor_name} is in 1 hour at {time}. Please arrive 15 minutes early.',
                'body_te': '{doctor_name} తో మీ అపాయింట్‌మెంట్ 1 గంటలో {time} కు ఉంది. దయచేసి 15 నిమిషాలు ముందుగా రండి.',
                'body_hi': '{doctor_name} के साथ आपकी अपॉइंटमेंट 1 घंटे में {time} बजे है। कृपया 15 मिनट पहले पहुंचें।',
                'priority': NotificationPriority.URGENT,
                'action_url': '/appointments/{appointment_id}',
                'icon': 'calendar',
                'color': '#FF9800',
            },
            {
                'name': 'appointment_confirmed',
                'notification_type': NotificationType.APPOINTMENT_CONFIRMED,
                'title_en': 'Appointment Confirmed',
                'title_te': 'అపాయింట్‌మెంట్ నిర్ధారించబడింది',
                'title_hi': 'अपॉइंटमेंट कन्फर्म हो गई',
                'body_en': 'Your appointment with {doctor_name} is confirmed for {date} at {time}.',
                'body_te': '{doctor_name} తో మీ అపాయింట్‌మెంట్ {date} న {time} కు నిర్ధారించబడింది.',
                'body_hi': '{doctor_name} के साथ आपकी अपॉइंटमेंट {date} को {time} बजे के लिए कन्फर्म हो गई है।',
                'priority': NotificationPriority.NORMAL,
                'action_url': '/appointments/{appointment_id}',
                'icon': 'calendar-check',
                'color': '#4CAF50',
            },
            {
                'name': 'appointment_cancelled',
                'notification_type': NotificationType.APPOINTMENT_CANCELLED,
                'title_en': 'Appointment Cancelled',
                'title_te': 'అపాయింట్‌మెంట్ రద్దు చేయబడింది',
                'title_hi': 'अपॉइंटमेंट रद्द हो गई',
                'body_en': 'Your appointment with {doctor_name} on {date} has been cancelled. Please reschedule if needed.',
                'body_te': '{date} న {doctor_name} తో మీ అపాయింట్‌మెంట్ రద్దు చేయబడింది. అవసరమైతే దయచేసి మళ్ళీ షెడ్యూల్ చేయండి.',
                'body_hi': '{date} को {doctor_name} के साथ आपकी अपॉइंटमेंट रद्द हो गई है। कृपया जरूरत हो तो दोबारा शेड्यूल करें।',
                'priority': NotificationPriority.HIGH,
                'action_url': '/appointments',
                'icon': 'calendar-x',
                'color': '#F44336',
            },
            {
                'name': 'appointment_rescheduled',
                'notification_type': NotificationType.APPOINTMENT_RESCHEDULED,
                'title_en': 'Appointment Rescheduled',
                'title_te': 'అపాయింట్‌మెంట్ పునర్నిర్ణయించబడింది',
                'title_hi': 'अपॉइंटमेंट री-शेड्यूल हो गई',
                'body_en': 'Your appointment with {doctor_name} has been rescheduled to {new_date} at {new_time}.',
                'body_te': '{doctor_name} తో మీ అపాయింట్‌మెంట్ {new_date} న {new_time} కు పునర్నిర్ణయించబడింది.',
                'body_hi': '{doctor_name} के साथ आपकी अपॉइंटमेंट {new_date} को {new_time} बजे के लिए री-शेड्यूल हो गई है।',
                'priority': NotificationPriority.HIGH,
                'action_url': '/appointments/{appointment_id}',
                'icon': 'calendar-edit',
                'color': '#FF9800',
            },
            
            # =================================================================
            # MEDICINE TEMPLATES
            # =================================================================
            {
                'name': 'medicine_reminder',
                'notification_type': NotificationType.MEDICINE_REMINDER,
                'title_en': 'Time to Take Medicine',
                'title_te': 'మందు తీసుకునే సమయం',
                'title_hi': 'दवाई लेने का समय',
                'body_en': 'It\'s time to take your {medicine_name}. {dosage}',
                'body_te': 'మీ {medicine_name} తీసుకునే సమయం వచ్చింది. {dosage}',
                'body_hi': 'आपकी {medicine_name} लेने का समय हो गया है। {dosage}',
                'priority': NotificationPriority.HIGH,
                'action_url': '/medicines',
                'icon': 'pill',
                'color': '#2196F3',
            },
            {
                'name': 'medicine_missed',
                'notification_type': NotificationType.MEDICINE_REMINDER,
                'title_en': 'Missed Medicine Reminder',
                'title_te': 'మందు మిస్ అయింది',
                'title_hi': 'दवाई छूट गई',
                'body_en': 'You missed your {medicine_name} at {time}. Please take it now if possible.',
                'body_te': 'మీరు {time} కు మీ {medicine_name} మిస్ అయ్యారు. వీలైతే ఇప్పుడు తీసుకోండి.',
                'body_hi': 'आपने {time} बजे अपनी {medicine_name} मिस कर दी। कृपया संभव हो तो अभी लें।',
                'priority': NotificationPriority.HIGH,
                'action_url': '/medicines',
                'icon': 'pill-warning',
                'color': '#FF9800',
            },
            {
                'name': 'prescription_ready',
                'notification_type': NotificationType.PRESCRIPTION_READY,
                'title_en': 'Prescription Ready',
                'title_te': 'ప్రిస్క్రిప్షన్ సిద్ధం',
                'title_hi': 'प्रिस्क्रिप्शन तैयार',
                'body_en': 'Your prescription from {doctor_name} is ready. View and download it now.',
                'body_te': '{doctor_name} నుండి మీ ప్రిస్క్రిప్షన్ సిద్ధంగా ఉంది. ఇప్పుడు చూడండి మరియు డౌన్‌లోడ్ చేయండి.',
                'body_hi': '{doctor_name} से आपका प्रिस्क्रिप्शन तैयार है। अभी देखें और डाउनलोड करें।',
                'priority': NotificationPriority.NORMAL,
                'action_url': '/prescriptions/{prescription_id}',
                'icon': 'prescription',
                'color': '#4CAF50',
            },
            
            # =================================================================
            # HEALTH TEMPLATES
            # =================================================================
            {
                'name': 'daily_health_tip',
                'notification_type': NotificationType.HEALTH_TIP,
                'title_en': 'Daily Health Tip 💡',
                'title_te': 'రోజువారీ ఆరోగ్య చిట్కా 💡',
                'title_hi': 'आज की स्वास्थ्य टिप 💡',
                'body_en': '{tip_content}',
                'body_te': '{tip_content}',
                'body_hi': '{tip_content}',
                'priority': NotificationPriority.LOW,
                'action_url': '/health-tips',
                'icon': 'lightbulb',
                'color': '#9C27B0',
            },
            {
                'name': 'health_checkup_reminder',
                'notification_type': NotificationType.HEALTH_CHECKUP_REMINDER,
                'title_en': 'Health Checkup Reminder',
                'title_te': 'ఆరోగ్య పరీక్ష రిమైండర్',
                'title_hi': 'स्वास्थ्य जांच रिमाइंडर',
                'body_en': 'It\'s been {months} months since your last checkup. Schedule a health checkup today!',
                'body_te': 'మీ చివరి చెకప్ అయిన తర్వాత {months} నెలలు అయింది. ఈ రోజు హెల్త్ చెకప్ షెడ్యూల్ చేయండి!',
                'body_hi': 'आपकी आखिरी जांच के {months} महीने हो गए हैं। आज ही हेल्थ चेकअप शेड्यूल करें!',
                'priority': NotificationPriority.NORMAL,
                'action_url': '/appointments/new',
                'icon': 'stethoscope',
                'color': '#00BCD4',
            },
            {
                'name': 'lab_result_ready',
                'notification_type': NotificationType.LAB_RESULT_READY,
                'title_en': 'Lab Results Ready',
                'title_te': 'లాబ్ ఫలితాలు సిద్ధం',
                'title_hi': 'लैब रिजल्ट तैयार',
                'body_en': 'Your lab test results for {test_name} are ready. View them now.',
                'body_te': '{test_name} కోసం మీ లాబ్ టెస్ట్ ఫలితాలు సిద్ధంగా ఉన్నాయి. ఇప్పుడు చూడండి.',
                'body_hi': '{test_name} के लिए आपके लैब टेस्ट रिजल्ट तैयार हैं। अभी देखें।',
                'priority': NotificationPriority.HIGH,
                'action_url': '/health-records/lab-results/{result_id}',
                'icon': 'lab',
                'color': '#4CAF50',
            },
            
            # =================================================================
            # EMERGENCY TEMPLATES
            # =================================================================
            {
                'name': 'emergency_alert',
                'notification_type': NotificationType.EMERGENCY_ALERT,
                'title_en': '🚨 EMERGENCY ALERT',
                'title_te': '🚨 అత్యవసర హెచ్చరిక',
                'title_hi': '🚨 आपातकालीन अलर्ट',
                'body_en': 'Emergency reported by {user_name}! Location: {location}. Call 108 immediately!',
                'body_te': '{user_name} అత్యవసర పరిస్థితిని నివేదించారు! స్థానం: {location}. వెంటనే 108 కు కాల్ చేయండి!',
                'body_hi': '{user_name} ने आपातकाल की सूचना दी! स्थान: {location}। तुरंत 108 पर कॉल करें!',
                'priority': NotificationPriority.URGENT,
                'action_url': '/emergency/{emergency_id}',
                'icon': 'emergency',
                'color': '#F44336',
            },
            {
                'name': 'emergency_contact_alert',
                'notification_type': NotificationType.EMERGENCY_CONTACT_ALERT,
                'title_en': '🚨 Emergency: {user_name} Needs Help!',
                'title_te': '🚨 అత్యవసరం: {user_name} కు సహాయం కావాలి!',
                'title_hi': '🚨 आपातकाल: {user_name} को मदद चाहिए!',
                'body_en': '{user_name} has triggered an emergency alert. Location: {location}. Please check on them immediately!',
                'body_te': '{user_name} అత్యవసర హెచ్చరికను ప్రేరేపించారు. స్థానం: {location}. దయచేసి వెంటనే వారిని తనిఖీ చేయండి!',
                'body_hi': '{user_name} ने आपातकालीन अलर्ट ट्रिगर किया है। स्थान: {location}। कृपया तुरंत उनकी जांच करें!',
                'priority': NotificationPriority.URGENT,
                'action_url': '/emergency/{emergency_id}',
                'icon': 'emergency-contact',
                'color': '#F44336',
            },
            
            # =================================================================
            # SYSTEM TEMPLATES
            # =================================================================
            {
                'name': 'welcome',
                'notification_type': NotificationType.WELCOME,
                'title_en': 'Welcome to MediConnect! 🎉',
                'title_te': 'MediConnect కు స్వాగతం! 🎉',
                'title_hi': 'MediConnect में आपका स्वागत है! 🎉',
                'body_en': 'Your health assistant is ready! Ask me about symptoms, book appointments, or get health tips.',
                'body_te': 'మీ ఆరోగ్య సహాయకుడు సిద్ధంగా ఉన్నాడు! లక్షణాల గురించి అడగండి, అపాయింట్‌మెంట్లు బుక్ చేయండి లేదా ఆరోగ్య చిట్కాలు పొందండి.',
                'body_hi': 'आपका स्वास्थ्य सहायक तैयार है! लक्षणों के बारे में पूछें, अपॉइंटमेंट बुक करें, या स्वास्थ्य टिप्स पाएं।',
                'priority': NotificationPriority.NORMAL,
                'action_url': '/',
                'icon': 'wave',
                'color': '#4CAF50',
            },
            {
                'name': 'account_verified',
                'notification_type': NotificationType.ACCOUNT_UPDATE,
                'title_en': 'Account Verified',
                'title_te': 'ఖాతా ధృవీకరించబడింది',
                'title_hi': 'अकाउंट वेरिफाई हो गया',
                'body_en': 'Your account has been verified successfully. You now have full access to all features.',
                'body_te': 'మీ ఖాతా విజయవంతంగా ధృవీకరించబడింది. మీకు ఇప్పుడు అన్ని ఫీచర్‌లకు పూర్తి యాక్సెస్ ఉంది.',
                'body_hi': 'आपका अकाउंट सफलतापूर्वक वेरिफाई हो गया है। अब आपके पास सभी फीचर्स की पूरी एक्सेस है।',
                'priority': NotificationPriority.NORMAL,
                'action_url': '/profile',
                'icon': 'user-check',
                'color': '#4CAF50',
            },
            {
                'name': 'profile_updated',
                'notification_type': NotificationType.ACCOUNT_UPDATE,
                'title_en': 'Profile Updated',
                'title_te': 'ప్రొఫైల్ అప్‌డేట్ చేయబడింది',
                'title_hi': 'प्रोफाइल अपडेट हो गया',
                'body_en': 'Your profile has been updated successfully.',
                'body_te': 'మీ ప్రొఫైల్ విజయవంతంగా అప్‌డేట్ చేయబడింది.',
                'body_hi': 'आपका प्रोफाइल सफलतापूर्वक अपडेट हो गया है।',
                'priority': NotificationPriority.LOW,
                'action_url': '/profile',
                'icon': 'user',
                'color': '#607D8B',
            },
            
            # =================================================================
            # CHAT TEMPLATES
            # =================================================================
            {
                'name': 'doctor_response',
                'notification_type': NotificationType.DOCTOR_RESPONSE,
                'title_en': 'Doctor Replied',
                'title_te': 'డాక్టర్ ప్రతిస్పందించారు',
                'title_hi': 'डॉक्टर ने जवाब दिया',
                'body_en': '{doctor_name} has replied to your message. Tap to view.',
                'body_te': '{doctor_name} మీ సందేశానికి ప్రతిస్పందించారు. చూడటానికి నొక్కండి.',
                'body_hi': '{doctor_name} ने आपके संदेश का जवाब दिया है। देखने के लिए टैप करें।',
                'priority': NotificationPriority.HIGH,
                'action_url': '/chat/{chat_id}',
                'icon': 'doctor',
                'color': '#4CAF50',
            },
            {
                'name': 'new_chat_message',
                'notification_type': NotificationType.CHAT_MESSAGE,
                'title_en': 'New Message',
                'title_te': 'కొత్త సందేశం',
                'title_hi': 'नया संदेश',
                'body_en': 'You have a new message. Tap to read.',
                'body_te': 'మీకు కొత్త సందేశం వచ్చింది. చదవడానికి నొక్కండి.',
                'body_hi': 'आपके पास एक नया संदेश है। पढ़ने के लिए टैप करें।',
                'priority': NotificationPriority.NORMAL,
                'action_url': '/chat',
                'icon': 'chat',
                'color': '#2196F3',
            },
            
            # =================================================================
            # GENERAL TEMPLATES
            # =================================================================
            {
                'name': 'general_announcement',
                'notification_type': NotificationType.GENERAL,
                'title_en': '{title}',
                'title_te': '{title}',
                'title_hi': '{title}',
                'body_en': '{message}',
                'body_te': '{message}',
                'body_hi': '{message}',
                'priority': NotificationPriority.NORMAL,
                'action_url': '',
                'icon': 'bell',
                'color': '#607D8B',
            },
        ]

        created_count = 0
        updated_count = 0
        
        for template_data in templates_data:
            template, created = NotificationTemplate.objects.update_or_create(
                name=template_data['name'],
                defaults=template_data
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            f'   Created {created_count} new templates, updated {updated_count} existing'
        )

    def print_summary(self):
        """Print summary of loaded templates."""
        from django.db.models import Count
        
        self.stdout.write('\n' + '='*50)
        self.stdout.write('📊 TEMPLATE SUMMARY')
        self.stdout.write('='*50)
        
        total = NotificationTemplate.objects.count()
        by_type = NotificationTemplate.objects.values('notification_type').annotate(
            count=Count('id')
        ).order_by('notification_type')
        
        self.stdout.write(f'   Total Templates: {total}')
        self.stdout.write('')
        self.stdout.write('   By Type:')
        for item in by_type:
            self.stdout.write(f'     - {item["notification_type"]}: {item["count"]}')
        
        self.stdout.write('='*50)