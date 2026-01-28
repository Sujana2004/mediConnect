"""
Management command to load first aid guides.

Usage:
    python manage.py load_first_aid
    python manage.py load_first_aid --clear
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.emergency.models import FirstAidGuide


# First aid guides data
FIRST_AID_DATA = [
    {
        'title_en': 'Heart Attack',
        'title_te': 'గుండెపోటు',
        'title_hi': 'दिल का दौरा',
        'category': 'heart_attack',
        'is_critical': True,
        'display_order': 1,
        'symptoms_en': 'Chest pain or discomfort, pain spreading to arm/jaw/back, shortness of breath, cold sweat, nausea, lightheadedness',
        'symptoms_te': 'ఛాతీ నొప్పి, చేతి/దవడ/వీపుకు వ్యాపించే నొప్పి, శ్వాస ఆడకపోవడం, చల్లని చెమట, వికారం',
        'symptoms_hi': 'सीने में दर्द, बांह/जबड़े/पीठ में फैलता दर्द, सांस की तकलीफ, ठंडा पसीना, मतली',
        'steps_en': [
            'Call 108 immediately',
            'Help the person sit down and rest in a comfortable position',
            'Loosen any tight clothing',
            'If the person has prescribed nitroglycerin, help them take it',
            'If aspirin is available and not allergic, give one to chew',
            'Stay calm and keep the person calm',
            'Be ready to perform CPR if the person becomes unconscious'
        ],
        'steps_te': [
            '108కి వెంటనే కాల్ చేయండి',
            'వ్యక్తిని కూర్చోబెట్టి సౌకర్యవంతమైన స్థితిలో విశ్రాంతి తీసుకోనివ్వండి',
            'గట్టిగా ఉన్న దుస్తులను వదులు చేయండి',
            'నైట్రోగ్లిసరిన్ సూచించబడి ఉంటే తీసుకోవడంలో సహాయపడండి',
            'ఆస్పిరిన్ అందుబాటులో ఉంటే మరియు అలెర్జీ లేకపోతే నమలమని ఇవ్వండి',
            'ప్రశాంతంగా ఉండండి',
            'వ్యక్తి స్పృహ కోల్పోతే CPR చేయడానికి సిద్ధంగా ఉండండి'
        ],
        'steps_hi': [
            '108 पर तुरंत कॉल करें',
            'व्यक्ति को बैठाकर आरामदायक स्थिति में रखें',
            'तंग कपड़े ढीले करें',
            'अगर नाइट्रोग्लिसरीन prescribed है तो लेने में मदद करें',
            'अगर एस्पिरिन उपलब्ध है और एलर्जी नहीं है तो चबाने को दें',
            'शांत रहें',
            'अगर व्यक्ति बेहोश हो जाए तो CPR के लिए तैयार रहें'
        ],
        'donts_en': [
            'Do NOT leave the person alone',
            'Do NOT give anything to eat or drink',
            'Do NOT let them walk around',
            'Do NOT ignore symptoms even if they seem mild'
        ],
        'donts_te': [
            'వ్యక్తిని ఒంటరిగా వదిలేయవద్దు',
            'తినడానికి లేదా తాగడానికి ఏమీ ఇవ్వవద్దు',
            'నడవనివ్వవద్దు',
            'లక్షణాలు తేలికగా అనిపించినా విస్మరించవద్దు'
        ],
        'donts_hi': [
            'व्यक्ति को अकेला न छोड़ें',
            'खाने या पीने के लिए कुछ न दें',
            'चलने न दें',
            'लक्षण हल्के लगें तो भी नजरअंदाज न करें'
        ],
        'call_help_en': 'Call 108 immediately if you suspect a heart attack. Every minute matters!',
        'call_help_te': 'గుండెపోటు అనుమానం ఉంటే వెంటనే 108కి కాల్ చేయండి. ప్రతి నిమిషం ముఖ్యం!',
        'call_help_hi': 'दिल का दौरा संदेह होने पर तुरंत 108 पर कॉल करें। हर मिनट महत्वपूर्ण है!',
    },
    {
        'title_en': 'CPR (Cardiopulmonary Resuscitation)',
        'title_te': 'CPR (కార్డియోపల్మోనరీ రిసస్సిటేషన్)',
        'title_hi': 'CPR (कार्डियोपल्मोनरी रिससिटेशन)',
        'category': 'cpr',
        'is_critical': True,
        'display_order': 2,
        'symptoms_en': 'Person is unconscious, not breathing or only gasping, no pulse',
        'symptoms_te': 'వ్యక్తి స్పృహలో లేడు, శ్వాస తీసుకోవడం లేదు, నాడి లేదు',
        'symptoms_hi': 'व्यक्ति बेहोश है, सांस नहीं ले रहा, नाड़ी नहीं है',
        'steps_en': [
            'Check if the scene is safe',
            'Call 108 or ask someone to call',
            'Place the person on their back on a firm surface',
            'Place heel of your hand on center of chest',
            'Place other hand on top, interlace fingers',
            'Push hard and fast - at least 2 inches deep',
            'Push at rate of 100-120 compressions per minute',
            'Allow chest to fully rise between compressions',
            'Continue until help arrives or person starts breathing'
        ],
        'steps_te': [
            'ప్రదేశం సురక్షితంగా ఉందో చెక్ చేయండి',
            '108కి కాల్ చేయండి',
            'వ్యక్తిని గట్టి ఉపరితలంపై వెనుకకు పడుకోబెట్టండి',
            'మీ చేతి మడమను ఛాతీ మధ్యలో ఉంచండి',
            'మరో చేతిని పైన ఉంచండి, వేళ్లను కలపండి',
            'గట్టిగా వేగంగా నొక్కండి - కనీసం 2 అంగుళాలు లోతుగా',
            'నిమిషానికి 100-120 కంప్రెషన్లు చేయండి',
            'కంప్రెషన్ల మధ్య ఛాతీ పూర్తిగా లేవనివ్వండి',
            'సహాయం వచ్చే వరకు కొనసాగించండి'
        ],
        'steps_hi': [
            'जांचें कि जगह सुरक्षित है',
            '108 पर कॉल करें',
            'व्यक्ति को सख्त सतह पर पीठ के बल लिटाएं',
            'अपनी हथेली की एड़ी छाती के बीच में रखें',
            'दूसरा हाथ ऊपर रखें, उंगलियां जोड़ें',
            'जोर से और तेज दबाएं - कम से कम 2 इंच गहरा',
            'प्रति मिनट 100-120 compressions करें',
            'compressions के बीच छाती को पूरी तरह उठने दें',
            'मदद आने तक जारी रखें'
        ],
        'donts_en': [
            'Do NOT stop CPR until help arrives',
            'Do NOT bend your elbows while compressing',
            'Do NOT push on ribs or stomach'
        ],
        'donts_te': [
            'సహాయం వచ్చే వరకు CPR ఆపవద్దు',
            'కంప్రెస్ చేసేటప్పుడు మోచేతులు వంచవద్దు',
            'పక్కటెముకలు లేదా కడుపుపై నొక్కవద్దు'
        ],
        'donts_hi': [
            'मदद आने तक CPR न रोकें',
            'compress करते समय कोहनी न मोड़ें',
            'पसलियों या पेट पर न दबाएं'
        ],
        'call_help_en': 'Call 108 first, then start CPR immediately',
        'call_help_te': 'ముందు 108కి కాల్ చేసి, వెంటనే CPR ప్రారంభించండి',
        'call_help_hi': 'पहले 108 पर कॉल करें, फिर तुरंत CPR शुरू करें',
    },
    {
        'title_en': 'Severe Bleeding',
        'title_te': 'తీవ్రమైన రక్తస్రావం',
        'title_hi': 'गंभीर रक्तस्राव',
        'category': 'bleeding',
        'is_critical': True,
        'display_order': 3,
        'symptoms_en': 'Blood spurting from wound, blood soaking through bandages, blood pooling on ground',
        'symptoms_te': 'గాయం నుండి రక్తం చిమ్ముతోంది, బ్యాండేజీల గుండా రక్తం నానుతోంది',
        'symptoms_hi': 'घाव से खून फव्वारे की तरह निकल रहा है, पट्टियों से खून रिस रहा है',
        'steps_en': [
            'Call 108 for severe bleeding',
            'Wear gloves if available',
            'Apply direct pressure to wound with clean cloth',
            'Press firmly and do not lift to check',
            'If blood soaks through, add more cloth on top',
            'Elevate the injured limb above heart level if possible',
            'Apply pressure bandage if available',
            'Keep the person calm and lying down',
            'Cover with blanket to prevent shock'
        ],
        'steps_te': [
            '108కి కాల్ చేయండి',
            'గ్లవ్స్ ఉంటే ధరించండి',
            'శుభ్రమైన వస్త్రంతో గాయంపై నేరుగా ఒత్తిడి చేయండి',
            'గట్టిగా నొక్కండి, చెక్ చేయడానికి ఎత్తవద్దు',
            'రక్తం నానితే పైన మరింత వస్త్రం వేయండి',
            'గాయమైన అవయవాన్ని గుండె స్థాయి కంటే పైకి ఎత్తండి',
            'వ్యక్తిని ప్రశాంతంగా పడుకోబెట్టండి',
            'షాక్ నివారించడానికి దుప్పటితో కప్పండి'
        ],
        'steps_hi': [
            '108 पर कॉल करें',
            'दस्ताने उपलब्ध हों तो पहनें',
            'साफ कपड़े से घाव पर सीधे दबाव डालें',
            'मजबूती से दबाएं, चेक करने के लिए न उठाएं',
            'खून रिसे तो ऊपर और कपड़ा लगाएं',
            'घायल अंग को दिल के स्तर से ऊपर उठाएं',
            'व्यक्ति को शांत रखें और लिटाएं',
            'शॉक रोकने के लिए कंबल से ढकें'
        ],
        'donts_en': [
            'Do NOT remove the cloth to check bleeding',
            'Do NOT apply tourniquet unless trained',
            'Do NOT give anything to eat or drink'
        ],
        'donts_te': [
            'రక్తస్రావం చెక్ చేయడానికి వస్త్రం తీయవద్దు',
            'శిక్షణ లేకుండా టూర్నికెట్ వేయవద్దు',
            'తినడానికి లేదా తాగడానికి ఇవ్వవద్దు'
        ],
        'donts_hi': [
            'खून जांचने के लिए कपड़ा न हटाएं',
            'प्रशिक्षण के बिना tourniquet न लगाएं',
            'खाने या पीने के लिए कुछ न दें'
        ],
        'call_help_en': 'Call 108 if bleeding does not stop in 10 minutes or if blood is spurting',
        'call_help_te': '10 నిమిషాల్లో రక్తస్రావం ఆగకపోతే లేదా రక్తం చిమ్ముతుంటే 108కి కాల్ చేయండి',
        'call_help_hi': 'अगर 10 मिनट में खून नहीं रुके या खून फव्वारे जैसा निकले तो 108 पर कॉल करें',
    },
    {
        'title_en': 'Burns',
        'title_te': 'కాలిన గాయాలు',
        'title_hi': 'जलने की चोट',
        'category': 'burns',
        'is_critical': False,
        'display_order': 4,
        'symptoms_en': 'Red, painful skin (1st degree), blisters (2nd degree), white/charred skin (3rd degree)',
        'symptoms_te': 'ఎరుపు, నొప్పిగా ఉన్న చర్మం, బొబ్బలు, తెల్లని/కాలిన చర్మం',
        'symptoms_hi': 'लाल, दर्दनाक त्वचा, फफोले, सफेद/जला हुआ त्वचा',
        'steps_en': [
            'Remove from heat source immediately',
            'Cool burn under running cool water for 10-20 minutes',
            'Remove jewelry or tight items near burn',
            'Cover loosely with clean, dry bandage',
            'Take over-the-counter pain reliever if needed',
            'For severe burns, call 108 immediately'
        ],
        'steps_te': [
            'వెంటనే వేడి మూలం నుండి తీసివేయండి',
            '10-20 నిమిషాలు చల్లని నీటి కింద చల్లబరచండి',
            'కాలిన ప్రదేశం దగ్గర ఆభరణాలు తీయండి',
            'శుభ్రమైన పొడి బ్యాండేజీతో వదులుగా కప్పండి',
            'అవసరమైతే నొప్పి నివారణి తీసుకోండి',
            'తీవ్రమైన కాలిన గాయాలకు 108కి కాల్ చేయండి'
        ],
        'steps_hi': [
            'तुरंत गर्मी के स्रोत से हटाएं',
            '10-20 मिनट ठंडे बहते पानी के नीचे ठंडा करें',
            'जले के पास गहने या तंग चीजें हटाएं',
            'साफ, सूखी पट्टी से ढीला ढकें',
            'जरूरत हो तो दर्द निवारक लें',
            'गंभीर जलने पर 108 पर कॉल करें'
        ],
        'donts_en': [
            'Do NOT use ice directly on burn',
            'Do NOT apply butter, oil, or toothpaste',
            'Do NOT break blisters',
            'Do NOT remove stuck clothing'
        ],
        'donts_te': [
            'కాలిన గాయంపై నేరుగా మంచు వాడవద్దు',
            'వెన్న, నూనె లేదా టూత్‌పేస్ట్ వేయవద్దు',
            'బొబ్బలు పగలకూడదు',
            'అతుక్కున్న దుస్తులు తీయవద్దు'
        ],
        'donts_hi': [
            'जले पर सीधे बर्फ न लगाएं',
            'मक्खन, तेल या टूथपेस्ट न लगाएं',
            'फफोले न फोड़ें',
            'चिपके कपड़े न निकालें'
        ],
        'call_help_en': 'Call 108 for burns larger than palm size, on face/hands/genitals, or if skin is white/charred',
        'call_help_te': 'హస్తం కంటే పెద్ద కాలిన గాయాలు, ముఖం/చేతులపై కాలితే 108కి కాల్ చేయండి',
        'call_help_hi': 'हथेली से बड़े जलने, चेहरे/हाथों पर जलने या सफेद/जला त्वचा के लिए 108 पर कॉल करें',
    },
    {
        'title_en': 'Choking',
        'title_te': 'గొంతులో ఇరుక్కోవడం',
        'title_hi': 'गला घुटना',
        'category': 'choking',
        'is_critical': True,
        'display_order': 5,
        'symptoms_en': 'Cannot speak or cough, clutching throat, blue lips/face, unable to breathe',
        'symptoms_te': 'మాట్లాడలేకపోవడం, దగ్గలేకపోవడం, గొంతు పట్టుకోవడం, నీలి పెదవులు',
        'symptoms_hi': 'बोल या खांस नहीं सकते, गला पकड़ना, नीले होंठ/चेहरा',
        'steps_en': [
            'Ask "Are you choking?" - if they cannot respond, act quickly',
            'Stand behind the person',
            'Make a fist with one hand, place thumb side against belly above navel',
            'Grasp fist with other hand',
            'Give quick upward thrusts (Heimlich maneuver)',
            'Repeat until object is expelled or person becomes unconscious',
            'If unconscious, call 108 and start CPR'
        ],
        'steps_te': [
            '"మీకు ఏదైనా ఇరుక్కుందా?" అని అడగండి',
            'వ్యక్తి వెనుక నిలబడండి',
            'ఒక చేత్తో పిడికిలి చేసి, నాభికి పైన కడుపుపై ఉంచండి',
            'మరో చేత్తో పిడికిలిని పట్టుకోండి',
            'వేగంగా పైకి నెట్టండి',
            'వస్తువు బయటకు వచ్చే వరకు లేదా స్పృహ కోల్పోయే వరకు పునరావృతం చేయండి',
            'స్పృహ కోల్పోతే 108కి కాల్ చేసి CPR ప్రారంభించండి'
        ],
        'steps_hi': [
            '"क्या आपका गला घुट रहा है?" पूछें',
            'व्यक्ति के पीछे खड़े हों',
            'एक हाथ से मुट्ठी बनाएं, नाभि के ऊपर पेट पर रखें',
            'दूसरे हाथ से मुट्ठी पकड़ें',
            'तेजी से ऊपर की ओर धक्का दें',
            'वस्तु निकलने या बेहोश होने तक दोहराएं',
            'बेहोश होने पर 108 पर कॉल करें और CPR शुरू करें'
        ],
        'donts_en': [
            'Do NOT slap on back if person is coughing forcefully',
            'Do NOT try to remove object with fingers (may push deeper)',
            'Do NOT give water'
        ],
        'donts_te': [
            'వ్యక్తి బలంగా దగ్గుతుంటే వీపుపై కొట్టవద్దు',
            'వేళ్లతో వస్తువు తీయడానికి ప్రయత్నించవద్దు',
            'నీరు ఇవ్వవద్దు'
        ],
        'donts_hi': [
            'अगर जोर से खांस रहे हैं तो पीठ पर न मारें',
            'उंगलियों से वस्तु निकालने की कोशिश न करें',
            'पानी न दें'
        ],
        'call_help_en': 'Call 108 if person becomes unconscious or if object cannot be dislodged',
        'call_help_te': 'వ్యక్తి స్పృహ కోల్పోతే లేదా వస్తువు తీయలేకపోతే 108కి కాల్ చేయండి',
        'call_help_hi': 'व्यक्ति बेहोश हो जाए या वस्तु न निकले तो 108 पर कॉल करें',
    },
    {
        'title_en': 'Snake Bite',
        'title_te': 'పాము కాటు',
        'title_hi': 'सांप का काटना',
        'category': 'snake_bite',
        'is_critical': True,
        'display_order': 6,
        'symptoms_en': 'Puncture marks on skin, swelling, pain, nausea, difficulty breathing, blurred vision',
        'symptoms_te': 'చర్మంపై పంక్చర్ మార్కులు, వాపు, నొప్పి, వికారం, శ్వాస తీసుకోవడంలో ఇబ్బంది',
        'symptoms_hi': 'त्वचा पर छेद के निशान, सूजन, दर्द, मतली, सांस लेने में कठिनाई',
        'steps_en': [
            'Call 108 immediately',
            'Keep the person calm and still',
            'Keep the bitten limb below heart level',
            'Remove jewelry/tight items near bite',
            'Clean wound gently with soap and water',
            'Mark the edge of swelling with pen and time',
            'Remember snake appearance if possible (color, size)',
            'Get to hospital as soon as possible for anti-venom'
        ],
        'steps_te': [
            '108కి వెంటనే కాల్ చేయండి',
            'వ్యక్తిని ప్రశాంతంగా, కదలకుండా ఉంచండి',
            'కాటు వేసిన అవయవాన్ని గుండె స్థాయి కంటే దిగువన ఉంచండి',
            'కాటు దగ్గర ఆభరణాలు/గట్టి వస్తువులు తీయండి',
            'గాయాన్ని సబ్బు నీటితో శుభ్రం చేయండి',
            'వాపు అంచును పెన్తో గుర్తు పెట్టండి',
            'సాధ్యమైతే పాము రూపాన్ని గుర్తుంచుకోండి',
            'యాంటీ-వెనమ్ కోసం వీలైనంత త్వరగా ఆసుపత్రికి వెళ్ళండి'
        ],
        'steps_hi': [
            '108 पर तुरंत कॉल करें',
            'व्यक्ति को शांत और स्थिर रखें',
            'काटे गए अंग को दिल के स्तर से नीचे रखें',
            'काटने के पास गहने/तंग चीजें हटाएं',
            'घाव को साबुन पानी से साफ करें',
            'सूजन की सीमा को पेन से चिह्नित करें',
            'सांप की शक्ल याद रखें',
            'एंटी-वेनम के लिए जल्द से जल्द अस्पताल जाएं'
        ],
        'donts_en': [
            'Do NOT cut the wound or try to suck out venom',
            'Do NOT apply tourniquet or ice',
            'Do NOT give alcohol or medication',
            'Do NOT let the person walk or run',
            'Do NOT try to catch or kill the snake'
        ],
        'donts_te': [
            'గాయాన్ని కోయవద్దు లేదా విషం పీల్చడానికి ప్రయత్నించవద్దు',
            'టూర్నికెట్ లేదా మంచు వేయవద్దు',
            'మద్యం లేదా మందులు ఇవ్వవద్దు',
            'వ్యక్తిని నడవనివ్వవద్దు',
            'పామును పట్టుకోవడానికి లేదా చంపడానికి ప్రయత్నించవద్దు'
        ],
        'donts_hi': [
            'घाव न काटें या जहर चूसने की कोशिश न करें',
            'tourniquet या बर्फ न लगाएं',
            'शराब या दवा न दें',
            'व्यक्ति को चलने न दें',
            'सांप पकड़ने या मारने की कोशिश न करें'
        ],
        'call_help_en': 'ALWAYS call 108 for snake bites. Anti-venom must be given within hours.',
        'call_help_te': 'పాము కాటుకు ఎల్లప్పుడూ 108కి కాల్ చేయండి. యాంటీ-వెనమ్ గంటల్లో ఇవ్వాలి.',
        'call_help_hi': 'सांप के काटने पर हमेशा 108 पर कॉल करें। एंटी-वेनम घंटों में देना जरूरी है।',
    },
    {
        'title_en': 'Stroke',
        'title_te': 'స్ట్రోక్ (పక్షవాతం)',
        'title_hi': 'स्ट्रोक (पक्षाघात)',
        'category': 'stroke',
        'is_critical': True,
        'display_order': 7,
        'symptoms_en': 'Face drooping, arm weakness, speech difficulty. Remember FAST: Face-Arms-Speech-Time',
        'symptoms_te': 'ముఖం వాలిపోవడం, చేతి బలహీనత, మాట్లాడటంలో ఇబ్బంది',
        'symptoms_hi': 'चेहरा झुकना, बांह में कमजोरी, बोलने में कठिनाई',
        'steps_en': [
            'Remember FAST: Face drooping, Arm weakness, Speech difficulty, Time to call 108',
            'Call 108 immediately - time is critical',
            'Note the time when symptoms started',
            'Keep the person lying down with head slightly elevated',
            'Loosen tight clothing',
            'Do not give food, water, or medication',
            'Stay with the person and keep them calm',
            'Be ready to perform CPR if needed'
        ],
        'steps_te': [
            'FAST గుర్తుంచుకోండి: ముఖం, చేతులు, మాట, సమయం',
            '108కి వెంటనే కాల్ చేయండి',
            'లక్షణాలు ప్రారంభమైన సమయాన్ని గమనించండి',
            'వ్యక్తిని తల కొద్దిగా ఎత్తుగా పడుకోబెట్టండి',
            'గట్టి దుస్తులు వదులు చేయండి',
            'ఆహారం, నీరు లేదా మందులు ఇవ్వవద్దు',
            'వ్యక్తితో ఉండి ప్రశాంతంగా ఉంచండి'
        ],
        'steps_hi': [
            'FAST याद रखें: चेहरा, बांह, बोली, समय',
            '108 पर तुरंत कॉल करें',
            'लक्षण शुरू होने का समय नोट करें',
            'व्यक्ति को सिर थोड़ा ऊंचा करके लिटाएं',
            'तंग कपड़े ढीले करें',
            'खाना, पानी या दवा न दें',
            'व्यक्ति के साथ रहें'
        ],
        'donts_en': [
            'Do NOT give aspirin (stroke may be bleeding type)',
            'Do NOT give food or water (choking risk)',
            'Do NOT let them go to sleep',
            'Do NOT delay calling 108'
        ],
        'donts_te': [
            'ఆస్పిరిన్ ఇవ్వవద్దు',
            'ఆహారం లేదా నీరు ఇవ్వవద్దు',
            'నిద్రపోనివ్వవద్దు',
            '108కి కాల్ చేయడంలో ఆలస్యం చేయవద్దు'
        ],
        'donts_hi': [
            'एस्पिरिन न दें',
            'खाना या पानी न दें',
            'सोने न दें',
            '108 पर कॉल करने में देरी न करें'
        ],
        'call_help_en': 'Call 108 IMMEDIATELY. Every minute of delay damages more brain cells.',
        'call_help_te': 'వెంటనే 108కి కాల్ చేయండి. ఆలస్యం ప్రతి నిమిషం మెదడు కణాలను దెబ్బతీస్తుంది.',
        'call_help_hi': 'तुरंत 108 पर कॉल करें। देरी का हर मिनट मस्तिष्क कोशिकाओं को नुकसान पहुंचाता है।',
    },
    {
        'title_en': 'Poisoning',
        'title_te': 'విషప్రయోగం',
        'title_hi': 'विषाक्तता',
        'category': 'poisoning',
        'is_critical': True,
        'display_order': 8,
        'symptoms_en': 'Nausea, vomiting, drowsiness, confusion, burns around mouth, unusual breath odor',
        'symptoms_te': 'వికారం, వాంతులు, మగత, గందరగోళం, నోటి చుట్టూ కాలిన గాయాలు',
        'symptoms_hi': 'मतली, उल्टी, नींद आना, भ्रम, मुंह के आसपास जलन',
        'steps_en': [
            'Call 108 or Poison Control (1800-116-117)',
            'Try to identify what was swallowed, how much, and when',
            'Keep the container/label if available',
            'If conscious, do not induce vomiting unless told by doctor',
            'If unconscious, place in recovery position',
            'If poison is on skin, remove contaminated clothing and wash skin',
            'If poison in eyes, rinse with water for 15-20 minutes'
        ],
        'steps_te': [
            '108 లేదా పాయిజన్ కంట్రోల్ కి కాల్ చేయండి',
            'ఏమి మింగారో, ఎంత, ఎప్పుడు గుర్తించండి',
            'కంటైనర్/లేబుల్ ఉంటే ఉంచండి',
            'స్పృహలో ఉంటే, వైద్యుడు చెప్పకుండా వాంతులు చేయించవద్దు',
            'స్పృహలో లేకపోతే, రికవరీ పొజిషన్‌లో ఉంచండి',
            'చర్మంపై విషం ఉంటే, కలుషితమైన దుస్తులు తీసి చర్మాన్ని కడగండి'
        ],
        'steps_hi': [
            '108 या पॉइज़न कंट्रोल पर कॉल करें',
            'क्या निगला, कितना, कब - पता करें',
            'कंटेनर/लेबल उपलब्ध हो तो रखें',
            'होश में हो तो डॉक्टर कहे बिना उल्टी न कराएं',
            'बेहोश हो तो रिकवरी पोजीशन में रखें',
            'त्वचा पर जहर हो तो दूषित कपड़े हटाकर त्वचा धोएं'
        ],
        'donts_en': [
            'Do NOT induce vomiting unless told by poison control',
            'Do NOT give anything to eat or drink',
            'Do NOT try home remedies',
            'Do NOT wait for symptoms to appear'
        ],
        'donts_te': [
            'పాయిజన్ కంట్రోల్ చెప్పకుండా వాంతులు చేయించవద్దు',
            'తినడానికి లేదా తాగడానికి ఇవ్వవద్దు',
            'ఇంటి చిట్కాలు ప్రయత్నించవద్దు',
            'లక్షణాలు కనిపించే వరకు వేచి ఉండవద్దు'
        ],
        'donts_hi': [
            'पॉइज़न कंट्रोल कहे बिना उल्टी न कराएं',
            'खाने या पीने को कुछ न दें',
            'घरेलू उपचार न आजमाएं',
            'लक्षण दिखने का इंतजार न करें'
        ],
        'call_help_en': 'Call 108 or Poison Control 1800-116-117 immediately for any poisoning',
        'call_help_te': 'ఏదైనా విషప్రయోగానికి వెంటనే 108 లేదా 1800-116-117 కి కాల్ చేయండి',
        'call_help_hi': 'किसी भी विषाक्तता के लिए तुरंत 108 या 1800-116-117 पर कॉल करें',
    },
    {
        'title_en': 'Fractures (Broken Bones)',
        'title_te': 'ఎముక విరిగిపోవడం',
        'title_hi': 'हड्डी टूटना',
        'category': 'fracture',
        'is_critical': False,
        'display_order': 9,
        'symptoms_en': 'Severe pain, swelling, bruising, deformity, inability to move the limb, bone visible',
        'symptoms_te': 'తీవ్రమైన నొప్పి, వాపు, కమిలిన గాయాలు, వైకల్యం, అవయవాన్ని కదపలేకపోవడం',
        'symptoms_hi': 'तीव्र दर्द, सूजन, चोट के निशान, विकृति, अंग हिलाने में असमर्थता',
        'steps_en': [
            'Call 108 for severe fractures or if spine/neck injury suspected',
            'Do not move the injured limb',
            'Immobilize the area above and below the fracture',
            'Apply ice wrapped in cloth (not directly on skin)',
            'Control any bleeding with gentle pressure',
            'Check circulation below injury (pulse, color, sensation)',
            'Keep the person still and calm',
            'Elevate the limb if possible (not if spine injury suspected)'
        ],
        'steps_te': [
            'తీవ్రమైన ఫ్రాక్చర్లకు 108కి కాల్ చేయండి',
            'గాయమైన అవయవాన్ని కదపవద్దు',
            'ఫ్రాక్చర్ పైన మరియు దిగువన ప్రాంతాన్ని స్థిరంగా ఉంచండి',
            'వస్త్రంలో చుట్టిన మంచు వేయండి',
            'రక్తస్రావాన్ని సున్నితమైన ఒత్తిడితో నియంత్రించండి',
            'గాయం దిగువన రక్త ప్రసరణ తనిఖీ చేయండి',
            'వ్యక్తిని కదలకుండా ప్రశాంతంగా ఉంచండి'
        ],
        'steps_hi': [
            'गंभीर फ्रैक्चर के लिए 108 पर कॉल करें',
            'घायल अंग को न हिलाएं',
            'फ्रैक्चर के ऊपर और नीचे का क्षेत्र स्थिर करें',
            'कपड़े में लिपटी बर्फ लगाएं',
            'रक्तस्राव को हल्के दबाव से नियंत्रित करें',
            'चोट के नीचे रक्त संचार जांचें',
            'व्यक्ति को स्थिर और शांत रखें'
        ],
        'donts_en': [
            'Do NOT move the person if spine injury is suspected',
            'Do NOT try to straighten the bone',
            'Do NOT apply ice directly on skin',
            'Do NOT give food or water (surgery may be needed)'
        ],
        'donts_te': [
            'వెన్నెముక గాయం అనుమానం ఉంటే వ్యక్తిని కదపవద్దు',
            'ఎముకను సరిచేయడానికి ప్రయత్నించవద్దు',
            'చర్మంపై నేరుగా మంచు వేయవద్దు',
            'ఆహారం లేదా నీరు ఇవ్వవద్దు'
        ],
        'donts_hi': [
            'रीढ़ की चोट का संदेह हो तो व्यक्ति को न हिलाएं',
            'हड्डी सीधी करने की कोशिश न करें',
            'त्वचा पर सीधे बर्फ न लगाएं',
            'खाना या पानी न दें'
        ],
        'call_help_en': 'Call 108 if bone is visible, limb looks deformed, or person cannot move',
        'call_help_te': 'ఎముక కనిపిస్తే, అవయవం వైకల్యంగా కనిపిస్తే 108కి కాల్ చేయండి',
        'call_help_hi': 'हड्डी दिखे, अंग विकृत लगे या व्यक्ति हिल न सके तो 108 पर कॉल करें',
    },
    {
        'title_en': 'Heat Stroke',
        'title_te': 'ఎండ దెబ్బ',
        'title_hi': 'लू लगना',
        'category': 'heat_stroke',
        'is_critical': True,
        'display_order': 10,
        'symptoms_en': 'High body temperature (>104°F), hot dry skin, rapid pulse, confusion, unconsciousness',
        'symptoms_te': 'అధిక శరీర ఉష్ణోగ్రత, వేడి పొడి చర్మం, వేగవంతమైన నాడి, గందరగోళం',
        'symptoms_hi': 'उच्च शरीर का तापमान, गर्म सूखी त्वचा, तेज नाड़ी, भ्रम',
        'steps_en': [
            'Call 108 immediately',
            'Move person to cool, shaded area',
            'Remove excess clothing',
            'Cool the body with water, wet cloths, or fanning',
            'Apply ice packs to neck, armpits, groin',
            'Give cool water to drink if conscious (small sips)',
            'Continue cooling until body temperature drops'
        ],
        'steps_te': [
            '108కి వెంటనే కాల్ చేయండి',
            'వ్యక్తిని చల్లని, నీడ ఉన్న ప్రాంతానికి తరలించండి',
            'అదనపు దుస్తులు తీయండి',
            'నీటితో, తడి వస్త్రాలతో శరీరాన్ని చల్లబరచండి',
            'మెడ, చంకలకు ఐస్ ప్యాక్‌లు వేయండి',
            'స్పృహలో ఉంటే చల్లని నీరు తాగించండి',
            'శరీర ఉష్ణోగ్రత తగ్గే వరకు చల్లబరచడం కొనసాగించండి'
        ],
        'steps_hi': [
            '108 पर तुरंत कॉल करें',
            'व्यक्ति को ठंडी, छायादार जगह ले जाएं',
            'अतिरिक्त कपड़े उतारें',
            'पानी, गीले कपड़े या पंखे से शरीर ठंडा करें',
            'गर्दन, बगल में बर्फ की थैली लगाएं',
            'होश में हो तो ठंडा पानी पिलाएं',
            'शरीर का तापमान गिरने तक ठंडा करते रहें'
        ],
        'donts_en': [
            'Do NOT give very cold water or ice water to drink',
            'Do NOT use alcohol rubs',
            'Do NOT ignore symptoms'
        ],
        'donts_te': [
            'చాలా చల్లని నీరు లేదా ఐస్ వాటర్ తాగించవద్దు',
            'ఆల్కహాల్ రబ్స్ వాడవద్దు',
            'లక్షణాలను విస్మరించవద్దు'
        ],
        'donts_hi': [
            'बहुत ठंडा पानी या बर्फ का पानी न पिलाएं',
            'अल्कोहल रब का उपयोग न करें',
            'लक्षणों को अनदेखा न करें'
        ],
        'call_help_en': 'Call 108 immediately - heat stroke is life-threatening',
        'call_help_te': 'వెంటనే 108కి కాల్ చేయండి - ఎండ దెబ్బ ప్రాణాంతకం',
        'call_help_hi': 'तुरंत 108 पर कॉल करें - लू जानलेवा है',
    },
]


class Command(BaseCommand):
    help = 'Load first aid guides data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing guides before loading',
        )

    def handle(self, *args, **options):
        if options.get('clear'):
            self.stdout.write('Clearing existing first aid guides...')
            FirstAidGuide.objects.all().delete()
        
        created_count = 0
        updated_count = 0
        
        with transaction.atomic():
            for data in FIRST_AID_DATA:
                guide, created = FirstAidGuide.objects.update_or_create(
                    category=data['category'],
                    defaults=data
                )
                
                if created:
                    created_count += 1
                else:
                    updated_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'✓ First Aid Guides: {created_count} created, {updated_count} updated'
            )
        )