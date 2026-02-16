// src/pages/patient/Emergency.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Phone,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Navigation,
  Hospital,
  Ambulance,
  Shield,
  Heart,
  Flame,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Star,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  AlertCircle,
  Info,
  BookOpen,
  Activity,
  Thermometer,
  Droplet,
  Wind,
  Zap,
  Eye,
  HandMetal,
  Brain,
  Baby,
  Dog,
  Bug,
  Pill,
  X,
  Send,
  Share2,
  Copy,
  ExternalLink,
  Loader2,
  Volume2,
  VolumeX
} from 'lucide-react';
import {
  Button,
  Card,
  Modal,
  Input,
  TextArea,
  Select,
  Badge,
  Avatar,
  EmptyState,
  Loader,
  Tabs,
  PhoneInput
} from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import { useVoice } from '../../hooks/useVoice';
import { emergencyService } from '../../services/api';
import toast from 'react-hot-toast';

// ============================================================================
// CONSTANTS
// ============================================================================

const EMERGENCY_TYPES = [
  { id: 'medical', label: 'Medical Emergency', icon: Heart, color: 'text-red-500', bg: 'bg-red-100' },
  { id: 'accident', label: 'Accident/Injury', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-100' },
  { id: 'cardiac', label: 'Heart Attack', icon: Activity, color: 'text-red-600', bg: 'bg-red-100' },
  { id: 'breathing', label: 'Breathing Problem', icon: Wind, color: 'text-blue-500', bg: 'bg-blue-100' },
  { id: 'stroke', label: 'Stroke', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-100' },
  { id: 'burn', label: 'Burns', icon: Flame, color: 'text-orange-600', bg: 'bg-orange-100' },
  { id: 'poisoning', label: 'Poisoning', icon: Pill, color: 'text-green-600', bg: 'bg-green-100' },
  { id: 'other', label: 'Other Emergency', icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-100' }
];

const SERVICE_TYPES = [
  { id: 'hospital', label: 'Hospitals', icon: Hospital },
  { id: 'ambulance', label: 'Ambulance', icon: Ambulance },
  { id: 'pharmacy', label: 'Pharmacy', icon: Pill },
  { id: 'police', label: 'Police', icon: Shield }
];

const FIRST_AID_CATEGORIES = [
  { id: 'cardiac', label: 'Heart Attack / CPR', icon: Heart, color: 'text-red-500' },
  { id: 'choking', label: 'Choking', icon: Wind, color: 'text-blue-500' },
  { id: 'bleeding', label: 'Bleeding', icon: Droplet, color: 'text-red-600' },
  { id: 'burns', label: 'Burns', icon: Flame, color: 'text-orange-500' },
  { id: 'fracture', label: 'Fractures', icon: HandMetal, color: 'text-purple-500' },
  { id: 'poisoning', label: 'Poisoning', icon: Pill, color: 'text-green-600' },
  { id: 'snake_bite', label: 'Snake Bite', icon: Bug, color: 'text-yellow-600' },
  { id: 'drowning', label: 'Drowning', icon: Droplet, color: 'text-blue-600' },
  { id: 'electric_shock', label: 'Electric Shock', icon: Zap, color: 'text-yellow-500' },
  { id: 'eye_injury', label: 'Eye Injury', icon: Eye, color: 'text-cyan-500' },
  { id: 'seizure', label: 'Seizures', icon: Brain, color: 'text-purple-600' },
  { id: 'child', label: 'Child Emergency', icon: Baby, color: 'text-pink-500' }
];

const HELPLINES = [
  { name: 'Emergency (All)', number: '112', icon: Phone, primary: true },
  { name: 'Ambulance', number: '108', icon: Ambulance },
  { name: 'Police', number: '100', icon: Shield },
  { name: 'Fire', number: '101', icon: Flame },
  { name: 'Women Helpline', number: '1091', icon: Users },
  { name: 'Child Helpline', number: '1098', icon: Baby },
  { name: 'Poison Control', number: '1066', icon: Pill },
  { name: 'Mental Health', number: '08046110007', icon: Brain }
];

const CONTACT_RELATIONSHIPS = [
  'Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Neighbor', 'Doctor', 'Other'
];

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_CONTACTS = [
  {
    id: '1',
    name: 'Ramesh Kumar',
    relationship: 'Spouse',
    phone: '+91 98765 43210',
    isPrimary: true,
    notifyOnSOS: true
  },
  {
    id: '2',
    name: 'Dr. Sharma',
    relationship: 'Doctor',
    phone: '+91 98765 12345',
    isPrimary: false,
    notifyOnSOS: true
  },
  {
    id: '3',
    name: 'Suresh (Neighbor)',
    relationship: 'Neighbor',
    phone: '+91 87654 32109',
    isPrimary: false,
    notifyOnSOS: false
  }
];

const MOCK_NEARBY_SERVICES = {
  hospital: [
    {
      id: '1',
      name: 'District Government Hospital',
      address: 'Main Road, Near Bus Stand',
      distance: '2.5 km',
      phone: '+91 1234 567890',
      rating: 4.2,
      open24Hours: true,
      hasEmergency: true
    },
    {
      id: '2',
      name: 'Shri Ram Hospital',
      address: 'Gandhi Nagar, Sector 5',
      distance: '4.8 km',
      phone: '+91 1234 567891',
      rating: 4.5,
      open24Hours: true,
      hasEmergency: true
    },
    {
      id: '3',
      name: 'Primary Health Center',
      address: 'Village Road',
      distance: '1.2 km',
      phone: '+91 1234 567892',
      rating: 3.8,
      open24Hours: false,
      hasEmergency: false
    }
  ],
  ambulance: [
    {
      id: '1',
      name: '108 Ambulance Service',
      phone: '108',
      distance: '~10 min',
      available: true,
      type: 'BLS'
    },
    {
      id: '2',
      name: 'District Hospital Ambulance',
      phone: '+91 1234 567890',
      distance: '~15 min',
      available: true,
      type: 'ALS'
    }
  ],
  pharmacy: [
    {
      id: '1',
      name: 'Jan Aushadhi Kendra',
      address: 'Main Market',
      distance: '0.8 km',
      phone: '+91 1234 567893',
      open24Hours: false,
      openTill: '10:00 PM'
    },
    {
      id: '2',
      name: 'Apollo Pharmacy',
      address: 'Near Hospital',
      distance: '2.6 km',
      phone: '+91 1234 567894',
      open24Hours: true
    }
  ],
  police: [
    {
      id: '1',
      name: 'Local Police Station',
      address: 'Station Road',
      distance: '1.5 km',
      phone: '100'
    }
  ]
};

const MOCK_FIRST_AID_GUIDES = {
  cardiac: {
    title: 'Heart Attack / CPR',
    severity: 'critical',
    steps: [
      { title: 'Call for help', description: 'Call 112 or 108 immediately. Do not wait.' },
      { title: 'Check responsiveness', description: 'Tap shoulders and ask "Are you okay?" loudly.' },
      { title: 'Start CPR if unresponsive', description: 'Place heel of hand on center of chest. Push hard and fast (100-120 per minute).' },
      { title: 'Give 30 compressions', description: 'Push down at least 2 inches. Allow chest to fully recoil.' },
      { title: 'Give 2 rescue breaths', description: 'Tilt head back, lift chin, pinch nose, give breaths.' },
      { title: 'Continue until help arrives', description: 'Repeat 30 compressions and 2 breaths.' }
    ],
    warnings: [
      'Do not stop CPR unless the person starts breathing',
      'Do not give food or water',
      'Keep the person calm if conscious'
    ],
    videoUrl: 'https://example.com/cpr-video'
  },
  choking: {
    title: 'Choking',
    severity: 'critical',
    steps: [
      { title: 'Ask if they can speak', description: 'If they can cough or speak, encourage coughing.' },
      { title: 'Call for help', description: 'If they cannot breathe, call 112 immediately.' },
      { title: 'Give 5 back blows', description: 'Stand behind, lean them forward, hit between shoulder blades.' },
      { title: 'Give 5 abdominal thrusts', description: 'Stand behind, place fist above navel, thrust inward and upward.' },
      { title: 'Repeat', description: 'Alternate between back blows and abdominal thrusts.' },
      { title: 'Start CPR if unconscious', description: 'If they become unconscious, begin CPR.' }
    ],
    warnings: [
      'Do not do abdominal thrusts on pregnant women or infants',
      'For infants, use back blows and chest thrusts only'
    ]
  },
  bleeding: {
    title: 'Severe Bleeding',
    severity: 'high',
    steps: [
      { title: 'Apply pressure', description: 'Press firmly on wound with clean cloth or bandage.' },
      { title: 'Keep pressing', description: 'Do not remove cloth even if blood soaks through. Add more layers.' },
      { title: 'Elevate if possible', description: 'Raise injured limb above heart level if no fracture.' },
      { title: 'Call for help', description: 'Call 108 if bleeding is severe or does not stop.' },
      { title: 'Keep person warm', description: 'Cover with blanket to prevent shock.' },
      { title: 'Monitor breathing', description: 'Watch for signs of shock: pale skin, rapid breathing.' }
    ],
    warnings: [
      'Do not remove objects stuck in wound',
      'Do not apply tourniquet unless trained',
      'Seek medical help for deep wounds'
    ]
  },
  burns: {
    title: 'Burns',
    severity: 'high',
    steps: [
      { title: 'Remove from heat source', description: 'Move person away from fire/hot object safely.' },
      { title: 'Cool the burn', description: 'Run cool (not cold) water over burn for 10-20 minutes.' },
      { title: 'Remove jewelry/clothing', description: 'Remove items near burn before swelling starts.' },
      { title: 'Cover with clean cloth', description: 'Use sterile bandage or clean cloth loosely.' },
      { title: 'Do not pop blisters', description: 'Leave blisters intact to prevent infection.' },
      { title: 'Seek medical help', description: 'Get help for burns larger than palm or on face/hands/joints.' }
    ],
    warnings: [
      'Do not apply ice, butter, or toothpaste',
      'Do not break blisters',
      'Do not remove stuck clothing'
    ]
  },
  snake_bite: {
    title: 'Snake Bite',
    severity: 'critical',
    steps: [
      { title: 'Move away from snake', description: 'Get to safe distance. Do not try to catch snake.' },
      { title: 'Keep calm and still', description: 'Movement spreads venom faster. Keep bitten limb still.' },
      { title: 'Call 108 immediately', description: 'Get medical help as fast as possible.' },
      { title: 'Remove jewelry', description: 'Remove rings, watches before swelling starts.' },
      { title: 'Keep limb below heart', description: 'Do not elevate the bitten limb.' },
      { title: 'Remember snake appearance', description: 'Note color, pattern, size if possible for doctors.' }
    ],
    warnings: [
      'Do NOT cut the wound or try to suck out venom',
      'Do NOT apply tourniquet or ice',
      'Do NOT give alcohol or aspirin',
      'Do NOT wait for symptoms - get help immediately'
    ]
  }
};

const MOCK_ACTIVE_SOS = null; // Set to object to show active SOS

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// SOS Button Component
const SOSButton = ({ onTrigger, isActive, isLoading }) => {
  const { t } = useTranslation();
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  const handleMouseDown = useCallback(() => {
    if (isActive || isLoading) return;
    setIsHolding(true);
  }, [isActive, isLoading]);

  const handleMouseUp = useCallback(() => {
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  useEffect(() => {
    let interval;
    if (isHolding) {
      interval = setInterval(() => {
        setHoldProgress(prev => {
          if (prev >= 100) {
            setIsHolding(false);
            onTrigger();
            return 0;
          }
          return prev + 5;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isHolding, onTrigger]);

  return (
    <div className="flex flex-col items-center">
      <button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={isLoading}
        className={`
          relative w-40 h-40 rounded-full flex items-center justify-center
          transition-all duration-300 select-none
          ${isActive 
            ? 'bg-red-600 animate-pulse shadow-lg shadow-red-500/50' 
            : isHolding
              ? 'bg-red-700 scale-95'
              : 'bg-red-500 hover:bg-red-600 active:scale-95'
          }
          ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          boxShadow: isHolding 
            ? `0 0 0 ${holdProgress / 10}px rgba(239, 68, 68, 0.3)` 
            : undefined
        }}
      >
        {/* Progress Ring */}
        {isHolding && (
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="76"
              fill="none"
              stroke="white"
              strokeWidth="4"
              strokeDasharray={`${holdProgress * 4.77} 477`}
              className="opacity-50"
            />
          </svg>
        )}
        
        <div className="text-white text-center z-10">
          {isLoading ? (
            <Loader2 className="w-12 h-12 animate-spin mx-auto" />
          ) : (
            <>
              <AlertTriangle className="w-12 h-12 mx-auto mb-1" />
              <span className="text-2xl font-bold">SOS</span>
            </>
          )}
        </div>
      </button>
      
      <p className="mt-4 text-sm text-gray-500 text-center">
        {isActive 
          ? t('emergency.sosActive', 'SOS is active. Help is on the way!')
          : isHolding
            ? t('emergency.holdToActivate', 'Keep holding to activate SOS...')
            : t('emergency.holdInstruction', 'Press and hold for 2 seconds to send SOS')
        }
      </p>
    </div>
  );
};

// Active SOS Card
const ActiveSOSCard = ({ sos, onCancel, isLoading }) => {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = new Date(sos.triggeredAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sos.triggeredAt]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-red-50 border-red-200 border-2">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="font-semibold text-red-700">
              {t('emergency.sosActive', 'SOS Active')}
            </span>
          </div>
          <Badge variant="danger">{formatTime(elapsed)}</Badge>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-gray-700">{sos.type || 'Medical Emergency'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-red-500" />
            <span className="text-gray-700">{sos.location || 'Location shared'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-red-500" />
            <span className="text-gray-700">
              {t('emergency.contactsNotified', '{{count}} contacts notified', { count: sos.notifiedContacts || 3 })}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 border-red-300 text-red-600 hover:bg-red-100"
            onClick={onCancel}
            loading={isLoading}
          >
            <XCircle className="w-4 h-4 mr-2" />
            {t('emergency.cancelSOS', 'Cancel SOS')}
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => window.open('tel:112')}
          >
            <Phone className="w-4 h-4 mr-2" />
            {t('emergency.call112', 'Call 112')}
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Helpline Card
const HelplineCard = ({ helpline }) => {
  const handleCall = () => {
    window.open(`tel:${helpline.number}`);
  };

  const IconComponent = helpline.icon;

  return (
    <button
      onClick={handleCall}
      className={`
        flex items-center gap-3 p-3 rounded-lg border transition-all w-full text-left
        ${helpline.primary 
          ? 'bg-red-50 border-red-200 hover:bg-red-100' 
          : 'bg-white border-gray-200 hover:bg-gray-50'
        }
      `}
    >
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center
        ${helpline.primary ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}
      `}>
        <IconComponent className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${helpline.primary ? 'text-red-700' : 'text-gray-900'}`}>
          {helpline.name}
        </p>
        <p className={`text-sm ${helpline.primary ? 'text-red-600' : 'text-gray-500'}`}>
          {helpline.number}
        </p>
      </div>
      <Phone className={`w-5 h-5 ${helpline.primary ? 'text-red-500' : 'text-gray-400'}`} />
    </button>
  );
};

// Emergency Contact Card
const ContactCard = ({ contact, onEdit, onDelete, onCall }) => {
  const { t } = useTranslation();

  return (
    <Card className={contact.isPrimary ? 'border-primary-200 bg-primary-50/30' : ''}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={contact.name} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900">{contact.name}</h3>
                {contact.isPrimary && (
                  <Badge variant="primary" size="sm">Primary</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">{contact.relationship}</p>
              <p className="text-sm text-gray-600">{contact.phone}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(contact)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(contact)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {contact.notifyOnSOS ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>{t('emergency.notifyOnSOS', 'Notify on SOS')}</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-gray-400" />
                <span>{t('emergency.noNotify', 'No SOS notification')}</span>
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCall(contact.phone)}
          >
            <Phone className="w-4 h-4 mr-1" />
            {t('common.call', 'Call')}
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Nearby Service Card
const ServiceCard = ({ service, type }) => {
  const { t } = useTranslation();

  const handleCall = () => {
    window.open(`tel:${service.phone}`);
  };

  const handleNavigate = () => {
    // Open in maps
    const query = encodeURIComponent(service.name + ' ' + (service.address || ''));
    window.open(`https://www.google.com/maps/search/${query}`);
  };

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{service.name}</h3>
            {service.address && (
              <p className="text-sm text-gray-500 truncate">{service.address}</p>
            )}
          </div>
          <Badge variant={service.open24Hours || service.available ? 'success' : 'warning'} size="sm">
            {service.open24Hours ? '24/7' : service.available ? t('common.available', 'Available') : service.openTill || t('common.closed', 'Closed')}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {service.distance}
          </span>
          {service.rating && (
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              {service.rating}
            </span>
          )}
          {service.type && (
            <span className="flex items-center gap-1">
              <Ambulance className="w-4 h-4" />
              {service.type}
            </span>
          )}
          {service.hasEmergency && (
            <span className="flex items-center gap-1 text-red-500">
              <AlertTriangle className="w-4 h-4" />
              ER
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={handleCall}
          >
            <Phone className="w-4 h-4 mr-1" />
            {t('common.call', 'Call')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleNavigate}
          >
            <Navigation className="w-4 h-4 mr-1" />
            {t('emergency.navigate', 'Navigate')}
          </Button>
        </div>
      </div>
    </Card>
  );
};

// First Aid Category Card
const FirstAidCategoryCard = ({ category, onClick }) => {
  const IconComponent = category.icon;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all"
    >
      <div className={`w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2 ${category.color}`}>
        <IconComponent className="w-6 h-6" />
      </div>
      <span className="text-sm font-medium text-gray-700 text-center">{category.label}</span>
    </button>
  );
};

// First Aid Guide Modal
const FirstAidGuideModal = ({ guide, isOpen, onClose }) => {
  const { t } = useTranslation();
  const { speak, isSpeaking, stopSpeaking, voiceEnabled } = useVoice();
  const [currentStep, setCurrentStep] = useState(0);

  const handleSpeak = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      const step = guide.steps[currentStep];
      speak(`Step ${currentStep + 1}: ${step.title}. ${step.description}`);
    }
  };

  const speakAllSteps = () => {
    const allText = guide.steps.map((step, i) => 
      `Step ${i + 1}: ${step.title}. ${step.description}`
    ).join('. ');
    speak(allText);
  };

  if (!guide) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={guide.title}
      size="lg"
    >
      <div className="space-y-6">
        {/* Severity Banner */}
        <div className={`
          p-3 rounded-lg flex items-center gap-2
          ${guide.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}
        `}>
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">
            {guide.severity === 'critical' 
              ? t('emergency.criticalEmergency', 'Critical Emergency - Call 112 Immediately')
              : t('emergency.seekMedicalHelp', 'Seek medical help as soon as possible')
            }
          </span>
        </div>

        {/* Voice Controls */}
        {voiceEnabled && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSpeak}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4 mr-1" /> : <Volume2 className="w-4 h-4 mr-1" />}
              {isSpeaking ? t('common.stop', 'Stop') : t('emergency.readStep', 'Read Step')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={speakAllSteps}
            >
              <Volume2 className="w-4 h-4 mr-1" />
              {t('emergency.readAll', 'Read All Steps')}
            </Button>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-4">
          {guide.steps.map((step, index) => (
            <div
              key={index}
              className={`
                flex gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer
                ${currentStep === index 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
              onClick={() => setCurrentStep(index)}
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold
                ${currentStep === index 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-gray-200 text-gray-600'
                }
              `}>
                {index + 1}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{step.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(prev => prev - 1)}
          >
            <ChevronUp className="w-4 h-4 mr-1" />
            {t('common.previous', 'Previous')}
          </Button>
          <span className="text-sm text-gray-500 self-center">
            {currentStep + 1} / {guide.steps.length}
          </span>
          <Button
            variant="outline"
            disabled={currentStep === guide.steps.length - 1}
            onClick={() => setCurrentStep(prev => prev + 1)}
          >
            {t('common.next', 'Next')}
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Warnings */}
        {guide.warnings && guide.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5" />
              {t('emergency.warnings', 'Important Warnings')}
            </h4>
            <ul className="space-y-1">
              {guide.warnings.map((warning, index) => (
                <li key={index} className="text-sm text-yellow-700 flex items-start gap-2">
                  <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Call Emergency */}
        <Button
          variant="danger"
          fullWidth
          size="lg"
          onClick={() => window.open('tel:112')}
        >
          <Phone className="w-5 h-5 mr-2" />
          {t('emergency.callEmergency', 'Call Emergency Services (112)')}
        </Button>
      </div>
    </Modal>
  );
};

// Add/Edit Contact Modal
const ContactModal = ({ contact, isOpen, onClose, onSave, isLoading }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relationship: '',
    isPrimary: false,
    notifyOnSOS: true
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        phone: contact.phone || '',
        relationship: contact.relationship || '',
        isPrimary: contact.isPrimary || false,
        notifyOnSOS: contact.notifyOnSOS ?? true
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        relationship: '',
        isPrimary: false,
        notifyOnSOS: true
      });
    }
  }, [contact, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contact ? t('emergency.editContact', 'Edit Contact') : t('emergency.addContact', 'Add Emergency Contact')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('common.name', 'Name')}
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          placeholder="Enter contact name"
        />

        <PhoneInput
          label={t('common.phone', 'Phone Number')}
          value={formData.phone}
          onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
          required
        />

        <Select
          label={t('emergency.relationship', 'Relationship')}
          value={formData.relationship}
          onChange={(e) => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
          options={CONTACT_RELATIONSHIPS.map(r => ({ value: r, label: r }))}
          required
          placeholder="Select relationship"
        />

        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.isPrimary}
              onChange={(e) => setFormData(prev => ({ ...prev, isPrimary: e.target.checked }))}
              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
            />
            <div>
              <span className="font-medium text-gray-700">{t('emergency.primaryContact', 'Primary Contact')}</span>
              <p className="text-sm text-gray-500">{t('emergency.primaryContactDesc', 'First contact to be notified in emergency')}</p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.notifyOnSOS}
              onChange={(e) => setFormData(prev => ({ ...prev, notifyOnSOS: e.target.checked }))}
              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
            />
            <div>
              <span className="font-medium text-gray-700">{t('emergency.notifyOnSOS', 'Notify on SOS')}</span>
              <p className="text-sm text-gray-500">{t('emergency.notifyOnSOSDesc', 'Send automatic alert when SOS is triggered')}</p>
            </div>
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            loading={isLoading}
          >
            {contact ? t('common.save', 'Save') : t('common.add', 'Add')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// SOS Trigger Modal
const SOSTriggerModal = ({ isOpen, onClose, onTrigger, isLoading }) => {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [shareLocation, setShareLocation] = useState(true);

  const handleTrigger = () => {
    onTrigger({
      type: selectedType,
      additionalInfo,
      shareLocation
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('emergency.triggerSOS', 'Trigger SOS')}
      size="lg"
    >
      <div className="space-y-6">
        {/* Emergency Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('emergency.selectType', 'Select Emergency Type')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {EMERGENCY_TYPES.map((type) => {
              const IconComponent = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`
                    flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left
                    ${selectedType === type.id 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className={`w-8 h-8 rounded-full ${type.bg} flex items-center justify-center`}>
                    <IconComponent className={`w-4 h-4 ${type.color}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Additional Info */}
        <TextArea
          label={t('emergency.additionalInfo', 'Additional Information (Optional)')}
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          rows={2}
          placeholder="Any additional details about the emergency..."
        />

        {/* Share Location */}
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={shareLocation}
            onChange={(e) => setShareLocation(e.target.checked)}
            className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
          />
          <div>
            <span className="font-medium text-gray-700">{t('emergency.shareLocation', 'Share my location')}</span>
            <p className="text-sm text-gray-500">{t('emergency.shareLocationDesc', 'Share your current location with emergency contacts')}</p>
          </div>
        </label>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-700">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            {t('emergency.sosWarning', 'This will immediately alert your emergency contacts and may contact emergency services.')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={handleTrigger}
            loading={isLoading}
            disabled={!selectedType}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            {t('emergency.sendSOS', 'Send SOS')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Emergency = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { speak, voiceEnabled } = useVoice();

  // State
  const [activeTab, setActiveTab] = useState('sos');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSOS, setActiveSOS] = useState(MOCK_ACTIVE_SOS);
  const [contacts, setContacts] = useState(MOCK_CONTACTS);
  const [nearbyServices, setNearbyServices] = useState(MOCK_NEARBY_SERVICES);
  const [selectedServiceType, setSelectedServiceType] = useState('hospital');
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Modals
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [selectedFirstAid, setSelectedFirstAid] = useState(null);

  // Tabs configuration
  const tabs = [
    { id: 'sos', label: t('emergency.sos', 'SOS'), icon: AlertTriangle },
    { id: 'contacts', label: t('emergency.contacts', 'Contacts'), icon: Users },
    { id: 'nearby', label: t('emergency.nearby', 'Nearby'), icon: MapPin },
    { id: 'firstaid', label: t('emergency.firstAid', 'First Aid'), icon: BookOpen }
  ];

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          setLocationError(error.message);
        }
      );
    }
  }, []);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load contacts
      const contactsResponse = await emergencyService.getContacts();
      if (contactsResponse.data) {
        setContacts(contactsResponse.data);
      }

      // Check for active SOS
      const sosResponse = await emergencyService.getActiveSOS();
      if (sosResponse.data) {
        setActiveSOS(sosResponse.data);
      }

      // Load nearby services
      if (location) {
        const servicesResponse = await emergencyService.getNearbyServices(
          location.lat,
          location.lng,
          selectedServiceType
        );
        if (servicesResponse.data) {
          setNearbyServices(prev => ({
            ...prev,
            [selectedServiceType]: servicesResponse.data
          }));
        }
      }
    } catch (error) {
      console.error('Error loading emergency data:', error);
    }
  };

  // Handle SOS trigger
  const handleSOSTrigger = async (data) => {
    setIsLoading(true);
    try {
      const response = await emergencyService.triggerSOS({
        ...data,
        location: location
      });
      
      setActiveSOS(response.data || {
        id: Date.now(),
        type: data.type,
        triggeredAt: new Date().toISOString(),
        location: 'Current location',
        notifiedContacts: contacts.filter(c => c.notifyOnSOS).length
      });
      
      setShowSOSModal(false);
      toast.success(t('emergency.sosTriggered', 'SOS triggered! Help is on the way.'));
      
      if (voiceEnabled) {
        speak('SOS has been triggered. Your emergency contacts have been notified. Help is on the way.');
      }
    } catch (error) {
      toast.error(t('emergency.sosError', 'Failed to trigger SOS. Please call 112 directly.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Quick SOS (hold button)
  const handleQuickSOS = async () => {
    setIsLoading(true);
    try {
      const response = await emergencyService.quickTriggerSOS(location);
      
      setActiveSOS(response.data || {
        id: Date.now(),
        type: 'medical',
        triggeredAt: new Date().toISOString(),
        location: 'Current location',
        notifiedContacts: contacts.filter(c => c.notifyOnSOS).length
      });
      
      toast.success(t('emergency.sosTriggered', 'SOS triggered! Help is on the way.'));
      
      if (voiceEnabled) {
        speak('SOS has been triggered. Your emergency contacts have been notified. Help is on the way.');
      }
    } catch (error) {
      toast.error(t('emergency.sosError', 'Failed to trigger SOS. Please call 112 directly.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel SOS
  const handleCancelSOS = async () => {
    setIsLoading(true);
    try {
      await emergencyService.cancelSOS(activeSOS.id);
      setActiveSOS(null);
      toast.success(t('emergency.sosCancelled', 'SOS has been cancelled.'));
    } catch (error) {
      toast.error(t('emergency.cancelError', 'Failed to cancel SOS.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Contact management
  const handleSaveContact = async (data) => {
    setIsLoading(true);
    try {
      if (editingContact) {
        await emergencyService.updateContact(editingContact.id, data);
        setContacts(prev => prev.map(c => 
          c.id === editingContact.id ? { ...c, ...data } : c
        ));
        toast.success(t('emergency.contactUpdated', 'Contact updated successfully.'));
      } else {
        const response = await emergencyService.addContact(data);
        setContacts(prev => [...prev, response.data || { ...data, id: Date.now().toString() }]);
        toast.success(t('emergency.contactAdded', 'Contact added successfully.'));
      }
      setShowContactModal(false);
      setEditingContact(null);
    } catch (error) {
      toast.error(t('emergency.contactError', 'Failed to save contact.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteContact = async (contact) => {
    setIsLoading(true);
    try {
      await emergencyService.deleteContact(contact.id);
      setContacts(prev => prev.filter(c => c.id !== contact.id));
      toast.success(t('emergency.contactDeleted', 'Contact deleted.'));
      setShowDeleteConfirm(null);
    } catch (error) {
      toast.error(t('emergency.deleteError', 'Failed to delete contact.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallContact = (phone) => {
    window.open(`tel:${phone.replace(/\s/g, '')}`);
  };

  // Render SOS Tab
  const renderSOSTab = () => (
    <div className="space-y-6">
      {/* Active SOS Card */}
      {activeSOS && (
        <ActiveSOSCard 
          sos={activeSOS} 
          onCancel={handleCancelSOS}
          isLoading={isLoading}
        />
      )}

      {/* SOS Button */}
      {!activeSOS && (
        <div className="flex flex-col items-center py-8">
          <SOSButton 
            onTrigger={handleQuickSOS}
            isActive={!!activeSOS}
            isLoading={isLoading}
          />
          
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setShowSOSModal(true)}
          >
            <Info className="w-4 h-4 mr-2" />
            {t('emergency.selectEmergencyType', 'Select Emergency Type')}
          </Button>
        </div>
      )}

      {/* Emergency Helplines */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {t('emergency.helplines', 'Emergency Helplines')}
        </h2>
        <div className="grid gap-2">
          {HELPLINES.slice(0, 4).map((helpline) => (
            <HelplineCard key={helpline.number} helpline={helpline} />
          ))}
        </div>
        <Button
          variant="ghost"
          className="w-full mt-2"
          onClick={() => {/* Show all helplines modal */}}
        >
          {t('emergency.viewAllHelplines', 'View All Helplines')}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => window.open('tel:112')}
          className="flex flex-col items-center p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
        >
          <Phone className="w-8 h-8 text-red-500 mb-2" />
          <span className="text-sm font-medium text-red-700">Call 112</span>
        </button>
        <button
          onClick={() => window.open('tel:108')}
          className="flex flex-col items-center p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
        >
          <Ambulance className="w-8 h-8 text-orange-500 mb-2" />
          <span className="text-sm font-medium text-orange-700">Ambulance</span>
        </button>
        <button
          onClick={() => setActiveTab('nearby')}
          className="flex flex-col items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
        >
          <Hospital className="w-8 h-8 text-blue-500 mb-2" />
          <span className="text-sm font-medium text-blue-700">Hospital</span>
        </button>
      </div>
    </div>
  );

  // Render Contacts Tab
  const renderContactsTab = () => (
    <div className="space-y-4">
      {/* Add Contact Button */}
      <Button
        variant="outline"
        fullWidth
        onClick={() => {
          setEditingContact(null);
          setShowContactModal(true);
        }}
      >
        <Plus className="w-4 h-4 mr-2" />
        {t('emergency.addContact', 'Add Emergency Contact')}
      </Button>

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('emergency.noContacts', 'No Emergency Contacts')}
          description={t('emergency.noContactsDesc', 'Add emergency contacts who will be notified when you trigger SOS.')}
          action={
            <Button
              variant="primary"
              onClick={() => {
                setEditingContact(null);
                setShowContactModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('emergency.addFirst', 'Add First Contact')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={(c) => {
                setEditingContact(c);
                setShowContactModal(true);
              }}
              onDelete={(c) => setShowDeleteConfirm(c)}
              onCall={handleCallContact}
            />
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">{t('emergency.contactsInfo', 'About Emergency Contacts')}</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600">
                <li>{t('emergency.contactsTip1', 'Primary contact will be called first')}</li>
                <li>{t('emergency.contactsTip2', 'Contacts marked for SOS will receive automatic alerts')}</li>
                <li>{t('emergency.contactsTip3', 'Your location will be shared when SOS is triggered')}</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  // Render Nearby Tab
  const renderNearbyTab = () => (
    <div className="space-y-4">
      {/* Location Status */}
      {locationError ? (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="p-4 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="text-sm font-medium text-yellow-700">
                {t('emergency.locationError', 'Location access denied')}
              </p>
              <p className="text-xs text-yellow-600">
                {t('emergency.enableLocation', 'Enable location for accurate results')}
              </p>
            </div>
          </div>
        </Card>
      ) : !location ? (
        <Card className="bg-blue-50 border-blue-200">
          <div className="p-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <p className="text-sm text-blue-700">
              {t('emergency.gettingLocation', 'Getting your location...')}
            </p>
          </div>
        </Card>
      ) : null}

      {/* Service Type Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {SERVICE_TYPES.map((type) => {
          const IconComponent = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedServiceType(type.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all
                ${selectedServiceType === type.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <IconComponent className="w-4 h-4" />
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Services List */}
      <div className="space-y-3">
        {nearbyServices[selectedServiceType]?.length > 0 ? (
          nearbyServices[selectedServiceType].map((service) => (
            <ServiceCard 
              key={service.id} 
              service={service} 
              type={selectedServiceType}
            />
          ))
        ) : (
          <EmptyState
            icon={MapPin}
            title={t('emergency.noServices', 'No services found')}
            description={t('emergency.noServicesDesc', 'No {{type}} found nearby. Try enabling location.', { type: selectedServiceType })}
            compact
          />
        )}
      </div>
    </div>
  );

  // Render First Aid Tab
  const renderFirstAidTab = () => (
    <div className="space-y-4">
      {/* Search */}
      <Input
        placeholder={t('emergency.searchFirstAid', 'Search first aid guides...')}
        leftIcon={<Search className="w-4 h-4" />}
      />

      {/* Categories Grid */}
      <div className="grid grid-cols-3 gap-3">
        {FIRST_AID_CATEGORIES.map((category) => (
          <FirstAidCategoryCard
            key={category.id}
            category={category}
            onClick={() => setSelectedFirstAid(MOCK_FIRST_AID_GUIDES[category.id])}
          />
        ))}
      </div>

      {/* Emergency Info Card */}
      <Card className="bg-red-50 border-red-200">
        <div className="p-4">
          <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {t('emergency.rememberInEmergency', 'Remember in Emergency')}
          </h3>
          <ul className="space-y-2 text-sm text-red-600">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              {t('emergency.tip1', 'Stay calm and assess the situation')}
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              {t('emergency.tip2', 'Call emergency services (112) immediately')}
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              {t('emergency.tip3', 'Do not move injured person unless necessary')}
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              {t('emergency.tip4', 'Provide first aid only if trained')}
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-red-500 text-white px-4 py-6">
        <h1 className="text-2xl font-bold">{t('emergency.title', 'Emergency')}</h1>
        <p className="text-red-100 text-sm mt-1">
          {t('emergency.subtitle', 'Quick access to emergency services and first aid')}
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium
                  border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? 'text-red-600 border-red-500'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                  }
                `}
              >
                <IconComponent className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'sos' && renderSOSTab()}
        {activeTab === 'contacts' && renderContactsTab()}
        {activeTab === 'nearby' && renderNearbyTab()}
        {activeTab === 'firstaid' && renderFirstAidTab()}
      </div>

      {/* Modals */}
      <SOSTriggerModal
        isOpen={showSOSModal}
        onClose={() => setShowSOSModal(false)}
        onTrigger={handleSOSTrigger}
        isLoading={isLoading}
      />

      <ContactModal
        contact={editingContact}
        isOpen={showContactModal}
        onClose={() => {
          setShowContactModal(false);
          setEditingContact(null);
        }}
        onSave={handleSaveContact}
        isLoading={isLoading}
      />

      <FirstAidGuideModal
        guide={selectedFirstAid}
        isOpen={!!selectedFirstAid}
        onClose={() => setSelectedFirstAid(null)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title={t('emergency.deleteContact', 'Delete Contact')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            {t('emergency.deleteConfirm', 'Are you sure you want to delete {{name}} from your emergency contacts?', 
              { name: showDeleteConfirm?.name }
            )}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDeleteConfirm(null)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => handleDeleteContact(showDeleteConfirm)}
              loading={isLoading}
            >
              {t('common.delete', 'Delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Emergency;