"""
Management command to load emergency helplines.

Usage:
    python manage.py load_helplines
    python manage.py load_helplines --clear
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.emergency.models import EmergencyHelpline


# National emergency helplines data
HELPLINES_DATA = [
    # Ambulance
    {
        'name_en': 'National Ambulance Service',
        'name_te': 'జాతీయ అంబులెన్స్ సేవ',
        'name_hi': 'राष्ट्रीय एम्बुलेंस सेवा',
        'helpline_type': 'ambulance',
        'number': '108',
        'alternate_number': '',
        'is_national': True,
        'state': '',
        'description_en': 'Free emergency ambulance service available 24/7 across India',
        'description_te': 'భారతదేశం అంతటా 24/7 అందుబాటులో ఉన్న ఉచిత అత్యవసర అంబులెన్స్ సేవ',
        'description_hi': 'भारत भर में 24/7 उपलब्ध मुफ्त आपातकालीन एम्बुलेंस सेवा',
        'is_24x7': True,
        'is_toll_free': True,
        'display_order': 1,
    },
    {
        'name_en': 'Emergency Response Support System',
        'name_te': 'అత్యవసర ప్రతిస్పందన సహాయ వ్యవస్థ',
        'name_hi': 'आपातकालीन प्रतिक्रिया सहायता प्रणाली',
        'helpline_type': 'ambulance',
        'number': '112',
        'alternate_number': '',
        'is_national': True,
        'state': '',
        'description_en': 'Single emergency number for police, fire, and ambulance',
        'description_te': 'పోలీసు, అగ్నిమాపక మరియు అంబులెన్స్ కోసం ఒకే అత్యవసర నంబర్',
        'description_hi': 'पुलिस, फायर और एम्बुलेंस के लिए एकल आपातकालीन नंबर',
        'is_24x7': True,
        'is_toll_free': True,
        'display_order': 2,
    },
    # Police
    {
        'name_en': 'Police Emergency',
        'name_te': 'పోలీసు అత్యవసరం',
        'name_hi': 'पुलिस आपातकाल',
        'helpline_type': 'police',
        'number': '100',
        'alternate_number': '112',
        'is_national': True,
        'state': '',
        'description_en': 'Police emergency helpline',
        'description_te': 'పోలీసు అత్యవసర హెల్ప్‌లైన్',
        'description_hi': 'पुलिस आपातकालीन हेल्पलाइन',
        'is_24x7': True,
        'is_toll_free': True,
        'display_order': 3,
    },
    # Fire
    {
        'name_en': 'Fire Emergency',
        'name_te': 'అగ్ని అత్యవసరం',
        'name_hi': 'अग्नि आपातकाल',
        'helpline_type': 'fire',
        'number': '101',
        'alternate_number': '112',
        'is_national': True,
        'state': '',
        'description_en': 'Fire brigade emergency helpline',
        'description_te': 'ఫైర్ బ్రిగేడ్ అత్యవసర హెల్ప్‌లైన్',
        'description_hi': 'फायर ब्रिगेड आपातकालीन हेल्पलाइन',
        'is_24x7': True,
        'is_toll_free': True,
        'display_order': 4,
    },
    # Women Helpline
    {
        'name_en': 'Women Helpline',
        'name_te': 'మహిళా హెల్ప్‌లైన్',
        'name_hi': 'महिला हेल्पलाइन',
        'helpline_type': 'women',
        'number': '181',
        'alternate_number': '1091',
        'is_national': True,
        'state': '',
        'description_en': 'Women in distress helpline - for harassment, domestic violence',
        'description_te': 'కష్టాల్లో ఉన్న మహిళల హెల్ప్‌లైన్ - వేధింపులు, గృహ హింస కోసం',
        'description_hi': 'संकट में महिलाओं की हेल्पलाइन - उत्पीड़न, घरेलू हिंसा के लिए',
        'is_24x7': True,
        'is_toll_free': True,
        'display_order': 5,
    },
    # Child Helpline
    {
        'name_en': 'Child Helpline',
        'name_te': 'చైల్డ్ హెల్ప్‌లైన్',
        'name_hi': 'चाइल्ड हेल्पलाइन',
        'helpline_type': 'child',
        'number': '1098',
        'alternate_number': '',
        'is_national': True,
        'state': '',
        'description_en': 'For children in need of care and protection',
        'description_te': 'సంరక్షణ మరియు రక్షణ అవసరమైన పిల్లల కోసం',
        'description_hi': 'देखभाल और सुरक्षा की जरूरत वाले बच्चों के लिए',
        'is_24x7': True,
        'is_toll_free': True,
        'display_order': 6,
    },
    # Disaster Management
    {
        'name_en': 'Disaster Management',
        'name_te': 'విపత్తు నిర్వహణ',
        'name_hi': 'आपदा प्रबंधन',
        'helpline_type': 'disaster',
        'number': '1078',
        'alternate_number': '',
        'is_national': True,
        'state': '',
        'description_en': 'National Disaster Management helpline',
        'description_te': 'జాతీయ విపత్తు నిర్వహణ హెల్ప్‌లైన్',
        'description_hi': 'राष्ट्रीय आपदा प्रबंधन हेल्पलाइन',
        'is_24x7': True,
        'is_toll_free': True,
        'display_order': 7,
    },
    # Poison Control
    {
        'name_en': 'Poison Information Centre',
        'name_te': 'విషం సమాచార కేంద్రం',
        'name_hi': 'विष सूचना केंद्र',
        'helpline_type': 'poison',
        'number': '1800-116-117',
        'alternate_number': '',
        'is_national': True,
        'state': '',
        'description_en': 'AIIMS Poison Information Centre - for poisoning emergencies',
        'description_te': 'AIIMS విషం సమాచార కేంద్రం - విషప్రయోగ అత్యవసర పరిస్థితుల కోసం',
        'description_hi': 'AIIMS विष सूचना केंद्र - विषाक्तता आपात स्थितियों के लिए',
        'is_24x7': True,
        'is_toll_free': True,
        'display_order': 8,
    },
    # Mental Health
    {
        'name_en': 'Mental Health Helpline (iCall)',
        'name_te': 'మానసిక ఆరోగ్య హెల్ప్‌లైన్',
        'name_hi': 'मानसिक स्वास्थ्य हेल्पलाइन',
        'helpline_type': 'mental_health',
        'number': '9152987821',
        'alternate_number': '',
        'is_national': True,
        'state': '',
        'description_en': 'Free counseling for mental health, stress, anxiety',
        'description_te': 'మానసిక ఆరోగ్యం, ఒత్తిడి, ఆందోళన కోసం ఉచిత కౌన్సెలింగ్',
        'description_hi': 'मानसिक स्वास्थ्य, तनाव, चिंता के लिए मुफ्त परामर्श',
        'is_24x7': False,
        'is_toll_free': False,
        'display_order': 9,
    },
    {
        'name_en': 'Vandrevala Foundation',
        'name_te': 'వంద్రేవాలా ఫౌండేషన్',
        'name_hi': 'वंद्रेवाला फाउंडेशन',
        'helpline_type': 'mental_health',
        'number': '1860-2662-345',
        'alternate_number': '',
        'is_national': True,
        'state': '',
        'description_en': 'Mental health support and crisis intervention',
        'description_te': 'మానసిక ఆరోగ్య సహాయం మరియు సంక్షోభ జోక్యం',
        'description_hi': 'मानसिक स्वास्थ्य सहायता और संकट हस्तक्षेप',
        'is_24x7': True,
        'is_toll_free': False,
        'display_order': 10,
    },
    # Senior Citizens
    {
        'name_en': 'Senior Citizens Helpline',
        'name_te': 'వృద్ధుల హెల్ప్‌లైన్',
        'name_hi': 'वरिष्ठ नागरिक हेल्पलाइन',
        'helpline_type': 'other',
        'number': '14567',
        'alternate_number': '',
        'is_national': True,
        'state': '',
        'description_en': 'Helpline for senior citizens',
        'description_te': 'వృద్ధుల కోసం హెల్ప్‌లైన్',
        'description_hi': 'वरिष्ठ नागरिकों के लिए हेल्पलाइन',
        'is_24x7': True,
        'is_toll_free': True,
        'display_order': 11,
    },
    # Blood Bank
    {
        'name_en': 'Blood Bank Information',
        'name_te': 'బ్లడ్ బ్యాంక్ సమాచారం',
        'name_hi': 'ब्लड बैंक जानकारी',
        'helpline_type': 'other',
        'number': '104',
        'alternate_number': '',
        'is_national': True,
        'state': '',
        'description_en': 'Health information and blood bank services',
        'description_te': 'ఆరోగ్య సమాచారం మరియు బ్లడ్ బ్యాంక్ సేవలు',
        'description_hi': 'स्वास्थ्य जानकारी और ब्लड बैंक सेवाएं',
        'is_24x7': True,
        'is_toll_free': True,
        'display_order': 12,
    },
    # Andhra Pradesh specific
    {
        'name_en': 'AP Ambulance (EMRI)',
        'name_te': 'ఆంధ్రప్రదేశ్ అంబులెన్స్',
        'name_hi': 'आंध्र प्रदेश एम्बुलेंस',
        'helpline_type': 'ambulance',
        'number': '108',
        'alternate_number': '104',
        'is_national': False,
        'state': 'Andhra Pradesh',
        'description_en': 'Andhra Pradesh Emergency Medical Services',
        'description_te': 'ఆంధ్రప్రదేశ్ అత్యవసర వైద్య సేవలు',
        'description_hi': 'आंध्र प्रदेश आपातकालीन चिकित्सा सेवाएं',
        'is_24x7': True,
        'is_toll_free': True,
        'display_order': 13,
    },
    # Telangana specific
    {
        'name_en': 'Telangana Ambulance',
        'name_te': 'తెలంగాణ అంబులెన్స్',
        'name_hi': 'तेलंगाना एम्बुलेंस',
        'helpline_type': 'ambulance',
        'number': '108',
        'alternate_number': '104',
        'is_national': False,
        'state': 'Telangana',
        'description_en': 'Telangana Emergency Medical Services',
        'description_te': 'తెలంగాణ అత్యవసర వైద్య సేవలు',
        'description_hi': 'तेलंगाना आपातकालीन चिकित्सा सेवाएं',
        'is_24x7': True,
        'is_toll_free': True,
        'display_order': 14,
    },
    # COVID (keeping for reference)
    {
        'name_en': 'Health Ministry Helpline',
        'name_te': 'ఆరోగ్య మంత్రిత్వ శాఖ హెల్ప్‌లైన్',
        'name_hi': 'स्वास्थ्य मंत्रालय हेल्पलाइन',
        'helpline_type': 'other',
        'number': '1075',
        'alternate_number': '',
        'is_national': True,
        'state': '',
        'description_en': 'Central Health Ministry helpline for health queries',
        'description_te': 'ఆరోగ్య ప్రశ్నల కోసం కేంద్ర ఆరోగ్య మంత్రిత్వ శాఖ హెల్ప్‌లైన్',
        'description_hi': 'स्वास्थ्य प्रश्नों के लिए केंद्रीय स्वास्थ्य मंत्रालय हेल्पलाइन',
        'is_24x7': True,
        'is_toll_free': True,
        'display_order': 15,
    },
]


class Command(BaseCommand):
    help = 'Load emergency helplines data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing helplines before loading',
        )

    def handle(self, *args, **options):
        if options.get('clear'):
            self.stdout.write('Clearing existing helplines...')
            EmergencyHelpline.objects.all().delete()
        
        created_count = 0
        updated_count = 0
        
        with transaction.atomic():
            for data in HELPLINES_DATA:
                helpline, created = EmergencyHelpline.objects.update_or_create(
                    number=data['number'],
                    helpline_type=data['helpline_type'],
                    is_national=data['is_national'],
                    state=data.get('state', ''),
                    defaults=data
                )
                
                if created:
                    created_count += 1
                else:
                    updated_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'✓ Helplines: {created_count} created, {updated_count} updated'
            )
        )