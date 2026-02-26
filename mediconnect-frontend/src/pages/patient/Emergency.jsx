// src/pages/patient/Emergency.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Star,
  AlertCircle,
  Info,
  BookOpen,
  Activity,
  Droplet,
  Wind,
  Zap,
  Eye,
  HandMetal,
  Brain,
  Baby,
  Bug,
  Pill,
  X,
  Loader2,
  Volume2,
  VolumeX,
  Sparkles,
  PhoneCall,
  Clock,
  MapPinned,
  HeartPulse,
  Siren,
  CircleAlert,
  ShieldCheck,
  ArrowRight,
  PhoneOutgoing
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
  PhoneInput
} from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import { useVoice } from '../../hooks/useVoice';
import { emergencyService } from '../../services/api';
import toast from 'react-hot-toast';

// ============================================================================
// CONSTANTS (identical)
// ============================================================================

const EMERGENCY_TYPES = [
  { id: 'medical', label: 'Medical Emergency', icon: Heart, color: 'text-red-500', bg: 'bg-red-100', gradient: 'from-red-500 to-rose-600' },
  { id: 'accident', label: 'Accident/Injury', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-100', gradient: 'from-orange-500 to-amber-600' },
  { id: 'heart', label: 'Heart Attack', icon: Activity, color: 'text-red-600', bg: 'bg-red-100', gradient: 'from-red-600 to-red-700' },
  { id: 'breathing', label: 'Breathing Problem', icon: Wind, color: 'text-blue-500', bg: 'bg-blue-100', gradient: 'from-blue-500 to-cyan-600' },
  { id: 'unconscious', label: 'Unconscious', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-100', gradient: 'from-purple-500 to-violet-600' },
  { id: 'bleeding', label: 'Severe Bleeding', icon: Droplet, color: 'text-red-600', bg: 'bg-red-100', gradient: 'from-red-600 to-rose-700' },
  { id: 'burn', label: 'Burns', icon: Flame, color: 'text-orange-600', bg: 'bg-orange-100', gradient: 'from-orange-600 to-amber-700' },
  { id: 'poison', label: 'Poisoning', icon: Pill, color: 'text-green-600', bg: 'bg-green-100', gradient: 'from-green-600 to-emerald-700' },
  { id: 'snake_bite', label: 'Snake Bite', icon: Bug, color: 'text-yellow-600', bg: 'bg-yellow-100', gradient: 'from-yellow-600 to-amber-700' },
  { id: 'pregnancy', label: 'Pregnancy Emergency', icon: Baby, color: 'text-pink-500', bg: 'bg-pink-100', gradient: 'from-pink-500 to-rose-600' },
  { id: 'child', label: 'Child Emergency', icon: Baby, color: 'text-pink-600', bg: 'bg-pink-100', gradient: 'from-pink-600 to-rose-700' },
  { id: 'other', label: 'Other Emergency', icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-100', gradient: 'from-gray-500 to-gray-600' }
];

const SERVICE_TYPES = [
  { id: 'hospital', label: 'Hospitals', icon: Hospital, gradient: 'from-blue-500 to-blue-600', emoji: '🏥' },
  { id: 'ambulance', label: 'Ambulance', icon: Ambulance, gradient: 'from-red-500 to-red-600', emoji: '🚑' },
  { id: 'pharmacy', label: 'Pharmacy', icon: Pill, gradient: 'from-green-500 to-green-600', emoji: '💊' },
  { id: 'police', label: 'Police', icon: Shield, gradient: 'from-slate-600 to-slate-700', emoji: '🛡️' }
];

const CATEGORY_ICON_MAP = {
  bleeding: Droplet, burns: Flame, choking: Wind, cpr: Heart,
  fracture: HandMetal, heart_attack: Activity, stroke: Brain,
  poisoning: Pill, snake_bite: Bug, dog_bite: Bug, drowning: Droplet,
  electric_shock: Zap, fainting: Brain, seizure: Brain,
  heat_stroke: Flame, pregnancy: Baby, child: Baby, allergy: AlertCircle,
};

const CATEGORY_COLOR_MAP = {
  bleeding: 'text-red-600', burns: 'text-orange-500', choking: 'text-blue-500',
  cpr: 'text-red-500', fracture: 'text-purple-500', heart_attack: 'text-red-600',
  stroke: 'text-purple-600', poisoning: 'text-green-600', snake_bite: 'text-yellow-600',
  dog_bite: 'text-yellow-500', drowning: 'text-blue-600', electric_shock: 'text-yellow-500',
  fainting: 'text-gray-500', seizure: 'text-purple-600', heat_stroke: 'text-orange-600',
  pregnancy: 'text-pink-500', child: 'text-pink-500', allergy: 'text-red-400',
};

const CATEGORY_GRADIENT_MAP = {
  bleeding: 'from-red-500 to-rose-600', burns: 'from-orange-500 to-amber-600',
  choking: 'from-blue-500 to-cyan-600', cpr: 'from-red-500 to-pink-600',
  fracture: 'from-purple-500 to-violet-600', heart_attack: 'from-red-600 to-rose-700',
  stroke: 'from-purple-600 to-indigo-700', poisoning: 'from-green-600 to-emerald-700',
  snake_bite: 'from-yellow-600 to-amber-700', dog_bite: 'from-yellow-500 to-orange-600',
  drowning: 'from-blue-600 to-cyan-700', electric_shock: 'from-yellow-500 to-amber-600',
  fainting: 'from-gray-500 to-gray-600', seizure: 'from-purple-600 to-violet-700',
  heat_stroke: 'from-orange-600 to-red-700', pregnancy: 'from-pink-500 to-rose-600',
  child: 'from-pink-500 to-fuchsia-600', allergy: 'from-red-400 to-rose-500',
};

const FALLBACK_HELPLINES = [
  { name: 'Emergency (All)', number: '112', icon: Phone, primary: true },
  { name: 'Ambulance', number: '108', icon: Ambulance },
  { name: 'Police', number: '100', icon: Shield },
  { name: 'Fire', number: '101', icon: Flame },
  { name: 'Women Helpline', number: '1091', icon: Users },
  { name: 'Child Helpline', number: '1098', icon: Baby },
  { name: 'Poison Control', number: '1066', icon: Pill },
  { name: 'Mental Health', number: '08046110007', icon: Brain }
];

const HELPLINE_ICON_MAP = {
  ambulance: Ambulance, police: Shield, fire: Flame, women: Users,
  child: Baby, poison: Pill, mental_health: Brain,
  disaster: AlertTriangle, covid: Activity, other: Phone,
};

const CONTACT_RELATIONSHIPS = [
  'spouse', 'parent', 'child', 'sibling', 'friend', 'neighbor', 'doctor', 'other'
];

const CANCEL_REASONS = [
  { value: 'mistake', label: 'Triggered by mistake' },
  { value: 'resolved', label: 'Issue resolved on its own' },
  { value: 'help_arrived', label: 'Help arrived from elsewhere' },
  { value: 'other', label: 'Other reason' }
];

// ============================================================================
// HELPERS (identical)
// ============================================================================

const safeCoord = (value) => {
  if (value === null || value === undefined) return null;
  return parseFloat(Number(value).toFixed(8));
};

const transformContactFromBackend = (c) => ({
  id: c.id, name: c.name, phone: c.phone_number || c.phone,
  relationship: c.relationship_display || c.relationship,
  relationshipValue: c.relationship, isPrimary: c.priority === 1,
  notifyOnSOS: c.notify_on_sos ?? true,
});

const transformContactToBackend = (data) => ({
  name: data.name,
  phone_number: (data.phone || '').replace(/[\s+\-]/g, '').replace(/^91/, '').slice(-10),
  relationship: (data.relationship || 'other').toLowerCase(),
  priority: data.isPrimary ? 1 : 5, notify_on_sos: data.notifyOnSOS ?? true,
  share_location: true,
});

const transformSOSResponse = (backendSOS) => {
  if (!backendSOS) return null;
  return {
    id: backendSOS.sos_id || backendSOS.id,
    type: backendSOS.emergency_type_display || backendSOS.emergency_type || 'Medical Emergency',
    emergencyType: backendSOS.emergency_type || 'medical',
    triggeredAt: backendSOS.created_at || new Date().toISOString(),
    location: backendSOS.location_address || 'Current location',
    notifiedContacts: typeof backendSOS.contacts_notified === 'number'
      ? backendSOS.contacts_notified : Array.isArray(backendSOS.contacts_notified)
        ? backendSOS.contacts_notified.length : 0,
    status: backendSOS.status, statusDisplay: backendSOS.status_display,
  };
};

const transformHelplineFromBackend = (h) => ({
  id: h.id, name: h.name || h.name_en, number: h.number,
  alternateNumber: h.alternate_number, type: h.helpline_type,
  icon: HELPLINE_ICON_MAP[h.helpline_type] || Phone,
  primary: h.helpline_type === 'ambulance' || h.number === '112',
  is24x7: h.is_24x7, isTollFree: h.is_toll_free,
});

const transformFirstAidFromBackend = (guide) => ({
  id: guide.id, title: guide.title || guide.title_en,
  category: guide.category, categoryDisplay: guide.category_display,
  severity: guide.is_critical ? 'critical' : 'high',
  symptoms: guide.symptoms || guide.symptoms_en,
  steps: (guide.steps || guide.steps_en || []).map((step, i) =>
    typeof step === 'string'
      ? { title: `Step ${i + 1}`, description: step }
      : { title: step.title || `Step ${i + 1}`, description: step.description || step }
  ),
  warnings: guide.donts || guide.donts_en || [],
  callHelp: guide.call_help || guide.call_help_en || '',
  imageUrl: guide.image_url, videoUrl: guide.video_url,
});

// ============================================================================
// ANIMATED BACKGROUND
// ============================================================================

const PulseRings = ({ active, color = 'red' }) => {
  if (!active) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className={`absolute w-48 h-48 rounded-full border-2 border-${color}-400/30 animate-ping`} style={{ animationDuration: '2s' }} />
      <div className={`absolute w-56 h-56 rounded-full border border-${color}-300/20 animate-ping`} style={{ animationDuration: '3s' }} />
      <div className={`absolute w-64 h-64 rounded-full border border-${color}-200/10 animate-ping`} style={{ animationDuration: '4s' }} />
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const SOSButton = ({ onTrigger, isActive, isLoading }) => {
  const { t } = useTranslation();
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  const handleStart = useCallback(() => {
    if (isActive || isLoading) return;
    setIsHolding(true);
  }, [isActive, isLoading]);

  const handleEnd = useCallback(() => {
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  useEffect(() => {
    if (!isHolding) return;
    const interval = setInterval(() => {
      setHoldProgress(prev => {
        if (prev >= 100) { setIsHolding(false); onTrigger(); return 0; }
        return prev + 5;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isHolding, onTrigger]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Outer glow rings */}
        <PulseRings active={isActive} />

        {isHolding && (
          <div
            className="absolute rounded-full transition-all duration-75"
            style={{
              inset: `-${holdProgress / 4}px`,
              background: `radial-gradient(circle, rgba(239,68,68,${holdProgress / 400}) 0%, transparent 70%)`,
            }}
          />
        )}

        {/* Outer ring */}
        <div className={`absolute inset-0 rounded-full transition-all duration-500 ${isActive ? 'bg-red-500/20 scale-[1.15]' : isHolding ? 'bg-red-500/10 scale-[1.1]' : 'scale-100'}`} />

        <button
          onMouseDown={handleStart} onMouseUp={handleEnd} onMouseLeave={handleEnd}
          onTouchStart={handleStart} onTouchEnd={handleEnd}
          disabled={isLoading}
          className={`relative w-44 h-44 rounded-full flex items-center justify-center transition-all duration-300 select-none touch-manipulation
            ${isActive
              ? 'bg-gradient-to-br from-red-600 via-red-500 to-rose-600'
              : isHolding
                ? 'bg-gradient-to-br from-red-700 via-red-600 to-rose-700 scale-[0.92]'
                : 'bg-gradient-to-br from-red-500 via-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 active:scale-[0.92]'}
            ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
            shadow-[0_0_60px_rgba(239,68,68,0.4)] hover:shadow-[0_0_80px_rgba(239,68,68,0.5)]`}
        >
          {/* Decorative inner rings */}
          <div className="absolute inset-3 rounded-full border border-white/20" />
          <div className="absolute inset-5 rounded-full border border-white/10" />
          <div className="absolute inset-7 rounded-full border border-white/5" />

          {/* Progress SVG */}
          {isHolding && (
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="88" cy="88" r="84" fill="none"
                stroke="rgba(255,255,255,0.5)" strokeWidth="5"
                strokeDasharray={`${holdProgress * 5.28} 528`}
                strokeLinecap="round"
                className="drop-shadow-lg"
              />
            </svg>
          )}

          <div className="text-white text-center z-10">
            {isLoading ? (
              <Loader2 className="w-14 h-14 animate-spin mx-auto drop-shadow-lg" />
            ) : (
              <>
                <AlertTriangle className={`w-14 h-14 mx-auto mb-1 drop-shadow-lg ${isActive ? 'animate-bounce' : ''}`} strokeWidth={2.5} />
                <span className="text-3xl font-black tracking-[0.2em] drop-shadow-lg">SOS</span>
              </>
            )}
          </div>
        </button>
      </div>

      <p className="mt-6 text-sm text-center max-w-[260px] leading-relaxed">
        {isActive ? (
          <span className="text-red-600 font-bold flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {t('emergency.sosActive', 'SOS is active. Help is on the way!')}
          </span>
        ) : isHolding ? (
          <span className="text-red-500 font-semibold animate-pulse text-base">{t('emergency.holdToActivate', 'Keep holding...')}</span>
        ) : (
          <span className="text-gray-400">{t('emergency.holdInstruction', 'Press and hold for 2 seconds to send SOS')}</span>
        )}
      </p>
    </div>
  );
};

const ActiveSOSCard = ({ sos, onCancel, isLoading }) => {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!sos) return;
    const start = new Date(sos.triggeredAt || Date.now()).getTime();
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [sos]);

  if (!sos) return null;
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="relative overflow-hidden rounded-3xl">
      {/* Animated gradient border effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-rose-500 to-red-500 animate-gradient-x rounded-3xl" />
      <div className="absolute inset-[2px] bg-gradient-to-br from-red-50 via-white to-rose-50 rounded-[22px]" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            </div>
            <div>
              <span className="font-black text-red-700 text-lg">{t('emergency.sosActive', 'SOS Active')}</span>
              <p className="text-xs text-red-400 font-medium">Help is being dispatched</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl shadow-lg shadow-red-500/20">
            <Clock className="w-4 h-4 text-white/80" />
            <span className="font-mono font-black text-white text-lg">{mins}:{secs.toString().padStart(2, '0')}</span>
          </div>
        </div>

        {/* Status Items */}
        <div className="space-y-2 mb-5">
          {[
            { icon: AlertTriangle, text: sos.type, iconBg: 'bg-red-100', iconColor: 'text-red-500' },
            { icon: MapPin, text: sos.location, iconBg: 'bg-blue-100', iconColor: 'text-blue-500' },
            { icon: Users, text: t('emergency.contactsNotified', '{{count}} contacts notified', { count: sos.notifiedContacts }), iconBg: 'bg-green-100', iconColor: 'text-green-500' },
          ].map(({ icon: Icon, text, iconBg, iconColor }, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/50 shadow-sm">
              <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <span className="text-gray-800 font-medium text-sm">{text}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 rounded-2xl h-12" onClick={onCancel} loading={isLoading}>
            <XCircle className="w-4 h-4 mr-2" />{t('emergency.cancelSOS', 'Cancel SOS')}
          </Button>
          <button
            onClick={() => window.open('tel:112')}
            className="flex-1 flex items-center justify-center gap-2 h-12 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl font-bold shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 active:scale-[0.97] transition-all"
          >
            <PhoneOutgoing className="w-5 h-5" />{t('emergency.call112', 'Call 112')}
          </button>
        </div>
      </div>
    </div>
  );
};

const HelplineCard = ({ helpline, index = 0 }) => {
  const IconComponent = helpline.icon || Phone;
  return (
    <button
      onClick={() => window.open(`tel:${helpline.number}`)}
      className={`group relative flex items-center gap-3.5 p-4 rounded-2xl border transition-all duration-300 w-full text-left active:scale-[0.97] touch-manipulation overflow-hidden
        ${helpline.primary
          ? 'bg-gradient-to-r from-red-500 to-rose-500 border-transparent text-white shadow-xl shadow-red-500/25 hover:shadow-2xl hover:shadow-red-500/35'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/50'}`}
    >
      {/* Decorative */}
      {helpline.primary && (
        <>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12" />
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
        </>
      )}

      <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3
        ${helpline.primary
          ? 'bg-white/20 backdrop-blur-sm'
          : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-red-50 group-hover:to-rose-50'}`}
      >
        <IconComponent className={`w-5 h-5 ${helpline.primary ? 'text-white' : 'text-gray-600 group-hover:text-red-500 transition-colors'}`} />
      </div>

      <div className="flex-1 min-w-0 relative">
        <p className={`font-bold ${helpline.primary ? 'text-white' : 'text-gray-900'}`}>{helpline.name}</p>
        <p className={`text-sm font-mono font-semibold ${helpline.primary ? 'text-white/80' : 'text-gray-500'}`}>{helpline.number}</p>
      </div>

      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110
        ${helpline.primary ? 'bg-white/20' : 'bg-green-50 group-hover:bg-green-100'}`}>
        <Phone className={`w-4 h-4 ${helpline.primary ? 'text-white' : 'text-green-600'}`} />
      </div>
    </button>
  );
};

const ContactCard = ({ contact, onEdit, onDelete, onCall }) => {
  const { t } = useTranslation();
  return (
    <div className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl
      ${contact.isPrimary
        ? 'border-primary-200 bg-gradient-to-br from-primary-50/60 via-white to-blue-50/40 hover:shadow-primary-100/50'
        : 'border-gray-200 bg-white hover:shadow-gray-200/50'}`}
    >
      {/* Decorative accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${contact.isPrimary ? 'bg-gradient-to-r from-primary-400 to-blue-500' : 'bg-gradient-to-r from-gray-200 to-gray-300 opacity-0 group-hover:opacity-100 transition-opacity'}`} />

      <div className="p-4 pt-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <Avatar name={contact.name} size="md" className="ring-2 ring-white shadow-md" />
              {contact.isPrimary && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  <Star className="w-3 h-3 text-white fill-white" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900">{contact.name}</h3>
                {contact.isPrimary && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-primary-500 to-blue-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">Primary</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{contact.relationship}</p>
              <p className="text-sm text-gray-700 font-mono font-medium mt-0.5">{contact.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => onEdit(contact)} className="p-2.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
            <button onClick={() => onDelete(contact)} className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          {contact.notifyOnSOS ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold border border-emerald-100">
              <CheckCircle className="w-3.5 h-3.5" />{t('emergency.notifyOnSOS', 'Notify on SOS')}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-500 rounded-xl text-xs font-semibold border border-gray-100">
              <XCircle className="w-3.5 h-3.5" />{t('emergency.noNotify', 'No notification')}
            </span>
          )}
          <button
            onClick={() => onCall(contact.phone)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30 active:scale-95 transition-all"
          >
            <Phone className="w-3.5 h-3.5" />{t('common.call', 'Call')}
          </button>
        </div>
      </div>
    </div>
  );
};

const ServiceCard = ({ service }) => {
  const { t } = useTranslation();
  const name = service.name;
  const address = service.address;
  const distance = service.distance_km ? `${service.distance_km} km` : service.distance;
  const phone = service.phone_primary || service.phone_emergency || service.phone;
  const is24x7 = service.is_24x7 ?? service.open24Hours;
  const hasER = service.has_emergency_ward ?? service.hasEmergency;

  return (
    <div className="group relative rounded-2xl border border-gray-200 bg-white overflow-hidden hover:shadow-2xl hover:shadow-gray-200/60 hover:border-gray-300 transition-all duration-300">
      {/* Top accent */}
      <div className="h-1.5 bg-gradient-to-r from-blue-500 via-primary-500 to-blue-600" />

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate text-[15px]">{name}</h3>
            {address && <p className="text-sm text-gray-500 truncate mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0" />{address}</p>}
          </div>
          <span className={`ml-2 flex-shrink-0 inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold
            ${is24x7
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm shadow-green-500/20'
              : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
            {is24x7 ? '24/7 Open' : service.openTill || t('common.closed', 'Closed')}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          {distance && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-xl">
              <Navigation className="w-3 h-3 text-gray-400" />{distance}
            </span>
          )}
          {service.rating && (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />{service.rating}
            </span>
          )}
          {hasER && (
            <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 animate-pulse">
              <HeartPulse className="w-3 h-3" />ER
            </span>
          )}
          {service.is_government && (
            <span className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
              <Shield className="w-3 h-3" />Govt
            </span>
          )}
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={() => phone && window.open(`tel:${phone}`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/35 active:scale-[0.97] transition-all"
          >
            <Phone className="w-4 h-4" />{t('common.call', 'Call')}
          </button>
          <button
            onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(name + ' ' + (address || ''))}`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 active:scale-[0.97] transition-all"
          >
            <Navigation className="w-4 h-4" />{t('emergency.navigate', 'Navigate')}
          </button>
        </div>
      </div>
    </div>
  );
};

const FirstAidCategoryCard = ({ category, onClick }) => {
  const IconComponent = CATEGORY_ICON_MAP[category.code || category.id] || AlertCircle;
  const gradient = CATEGORY_GRADIENT_MAP[category.code || category.id] || 'from-gray-500 to-gray-600';

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center p-4 bg-white rounded-2xl border border-gray-100 hover:border-transparent hover:shadow-xl active:scale-[0.93] transition-all duration-300 touch-manipulation overflow-hidden"
    >
      {/* Hover background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300`} />

      <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-lg group-hover:shadow-xl group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300`}>
        <IconComponent className="w-6 h-6 text-white drop-shadow-sm" />
      </div>
      <span className="relative text-xs font-bold text-gray-700 text-center leading-tight group-hover:text-gray-900 transition-colors">{category.name || category.label}</span>
    </button>
  );
};

const FirstAidGuideModal = ({ guide, isOpen, onClose }) => {
  const { t } = useTranslation();
  const { speak, isSpeaking, stopSpeaking, voiceEnabled } = useVoice();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => { setCurrentStep(0); }, [guide]);

  const handleSpeak = useCallback(() => {
    if (!guide?.steps) return;
    if (isSpeaking) { stopSpeaking(); return; }
    const step = guide.steps[currentStep];
    if (step) speak(`Step ${currentStep + 1}: ${step.title}. ${step.description}`);
  }, [guide, currentStep, isSpeaking, speak, stopSpeaking]);

  const speakAllSteps = useCallback(() => {
    if (!guide?.steps) return;
    speak(guide.steps.map((s, i) => `Step ${i + 1}: ${s.title}. ${s.description}`).join('. '));
  }, [guide, speak]);

  if (!isOpen || !guide) return null;
  const steps = guide.steps || [];
  const warnings = guide.warnings || [];
  const totalSteps = steps.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={guide.title || 'First Aid Guide'} size="lg">
      <div className="space-y-6">
        <div className={`relative overflow-hidden p-4 rounded-2xl ${guide.severity === 'critical' ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-orange-500 to-amber-600'} text-white`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="font-bold">
              {guide.severity === 'critical'
                ? t('emergency.criticalEmergency', 'Critical — Call 112 Now!')
                : t('emergency.seekMedicalHelp', 'Seek medical help ASAP')}
            </span>
          </div>
        </div>

        {voiceEnabled && (
          <div className="flex gap-2">
            <button onClick={handleSpeak} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:from-gray-200 hover:to-gray-300 active:scale-95 transition-all">
              {isSpeaking ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-primary-500" />}
              {isSpeaking ? t('common.stop', 'Stop') : t('emergency.readStep', 'Read Step')}
            </button>
            <button onClick={speakAllSteps} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl text-sm font-semibold text-primary-700 border border-primary-200 hover:bg-primary-100 active:scale-95 transition-all">
              <Volume2 className="w-4 h-4" />{t('emergency.readAll', 'Read All')}
            </button>
          </div>
        )}

        {totalSteps > 0 && (
          <div className="space-y-3">
            {steps.map((step, index) => (
              <button key={index} onClick={() => setCurrentStep(index)}
                className={`w-full flex gap-4 p-4 rounded-2xl border-2 transition-all duration-300 text-left
                  ${currentStep === index
                    ? 'border-primary-400 bg-gradient-to-r from-primary-50 to-blue-50 shadow-lg shadow-primary-100/50 scale-[1.01]'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm transition-all
                  ${currentStep === index
                    ? 'bg-gradient-to-br from-primary-500 to-blue-600 text-white shadow-md shadow-primary-500/25 scale-110'
                    : 'bg-gray-200 text-gray-500'}`}>
                  {index + 1}
                </div>
                <div>
                  <h4 className={`font-bold ${currentStep === index ? 'text-primary-900' : 'text-gray-900'}`}>{step.title}</h4>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{step.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {totalSteps > 1 && (
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-1.5">
            <button disabled={currentStep === 0} onClick={() => setCurrentStep(p => Math.max(0, p - 1))}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-white disabled:opacity-30 transition-all">
              <ChevronUp className="w-4 h-4" />{t('common.previous', 'Prev')}
            </button>
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentStep ? 'w-6 bg-primary-500' : 'bg-gray-300'}`} />
              ))}
            </div>
            <button disabled={currentStep >= totalSteps - 1} onClick={() => setCurrentStep(p => Math.min(totalSteps - 1, p + 1))}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-white disabled:opacity-30 transition-all">
              {t('common.next', 'Next')}<ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-5">
            <div className="absolute top-0 right-0 text-6xl opacity-[0.06] select-none">⚠️</div>
            <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              {t('emergency.warnings', 'Important Warnings')}
            </h4>
            <ul className="space-y-2">
              {warnings.map((w, i) => (
                <li key={i} className="text-sm text-amber-800 flex items-start gap-2.5 bg-white/60 p-3 rounded-xl backdrop-blur-sm">
                  <div className="w-5 h-5 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="w-3 h-3 text-red-600" />
                  </div>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button onClick={() => window.open('tel:112')}
          className="w-full flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-red-600 via-red-500 to-rose-600 text-white rounded-2xl font-black text-base shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 active:scale-[0.97] transition-all">
          <Phone className="w-5 h-5" />{t('emergency.callEmergency', 'Call Emergency Services (112)')}
        </button>
      </div>
    </Modal>
  );
};

const ContactModal = ({ contact, isOpen, onClose, onSave, isLoading }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ name: '', phone: '', relationship: '', isPrimary: false, notifyOnSOS: true });

  useEffect(() => {
    if (contact) {
      setFormData({ name: contact.name || '', phone: contact.phone || '', relationship: contact.relationshipValue || contact.relationship || '', isPrimary: contact.isPrimary || false, notifyOnSOS: contact.notifyOnSOS ?? true });
    } else {
      setFormData({ name: '', phone: '', relationship: '', isPrimary: false, notifyOnSOS: true });
    }
  }, [contact, isOpen]);

  const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={contact ? t('emergency.editContact', 'Edit Contact') : t('emergency.addContact', 'Add Emergency Contact')} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input label={t('common.name', 'Name')} value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required placeholder="Enter contact name" />
        <PhoneInput label={t('common.phone', 'Phone Number')} value={formData.phone} onChange={(value) => setFormData(p => ({ ...p, phone: value }))} required />
        <Select label={t('emergency.relationship', 'Relationship')} value={formData.relationship} onChange={(e) => setFormData(p => ({ ...p, relationship: e.target.value }))} options={CONTACT_RELATIONSHIPS.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))} required placeholder="Select relationship" />
        <div className="space-y-2 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-4 border border-gray-100">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-white transition-all">
            <input type="checkbox" checked={formData.isPrimary} onChange={(e) => setFormData(p => ({ ...p, isPrimary: e.target.checked }))} className="w-5 h-5 text-primary-600 rounded-lg border-gray-300 focus:ring-primary-500" />
            <div><span className="font-semibold text-gray-700">{t('emergency.primaryContact', 'Primary Contact')}</span><p className="text-sm text-gray-500">{t('emergency.primaryContactDesc', 'First contact to be notified')}</p></div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-white transition-all">
            <input type="checkbox" checked={formData.notifyOnSOS} onChange={(e) => setFormData(p => ({ ...p, notifyOnSOS: e.target.checked }))} className="w-5 h-5 text-primary-600 rounded-lg border-gray-300 focus:ring-primary-500" />
            <div><span className="font-semibold text-gray-700">{t('emergency.notifyOnSOS', 'Notify on SOS')}</span><p className="text-sm text-gray-500">{t('emergency.notifyOnSOSDesc', 'Send automatic alert on SOS')}</p></div>
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1 rounded-2xl h-12" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
          <Button type="submit" variant="primary" className="flex-1 rounded-2xl h-12" loading={isLoading}>{contact ? t('common.save', 'Save') : t('common.add', 'Add')}</Button>
        </div>
      </form>
    </Modal>
  );
};

const SOSTriggerModal = ({ isOpen, onClose, onTrigger, isLoading }) => {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  useEffect(() => { if (!isOpen) { setSelectedType(null); setAdditionalInfo(''); } }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('emergency.triggerSOS', 'Trigger SOS')} size="lg">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">{t('emergency.selectType', 'What\'s the emergency?')}</label>
          <div className="grid grid-cols-2 gap-2.5">
            {EMERGENCY_TYPES.map((type) => {
              const Ic = type.icon;
              const selected = selectedType === type.id;
              return (
                <button key={type.id} onClick={() => setSelectedType(type.id)}
                  className={`relative flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left active:scale-[0.96] touch-manipulation overflow-hidden
                    ${selected
                      ? 'border-red-400 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg shadow-red-100/50'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                  {selected && <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-rose-500/5" />}
                  <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all
                    ${selected ? `bg-gradient-to-br ${type.gradient} text-white shadow-md` : type.bg}`}>
                    <Ic className={`w-5 h-5 ${selected ? 'text-white' : type.color}`} />
                  </div>
                  <span className={`relative text-sm font-semibold ${selected ? 'text-red-700' : 'text-gray-700'}`}>{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <TextArea label={t('emergency.additionalInfo', 'Additional Details (Optional)')} value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} rows={2} placeholder="Describe what happened..." />
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4">
          <div className="absolute top-0 right-0 text-4xl opacity-[0.06] select-none">⚠️</div>
          <p className="relative text-sm text-amber-700 flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <span>{t('emergency.sosWarning', 'This will immediately alert your emergency contacts and may contact emergency services.')}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
          <button onClick={() => onTrigger({ type: selectedType, additionalInfo })} disabled={!selectedType || isLoading}
            className="flex-1 flex items-center justify-center gap-2 h-12 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl font-bold shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
            {t('emergency.sendSOS', 'Send SOS')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

const CancelSOSModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('mistake');
  const [notes, setNotes] = useState('');
  useEffect(() => { if (!isOpen) { setReason('mistake'); setNotes(''); } }, [isOpen]);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('emergency.cancelSOS', 'Cancel SOS')} size="sm">
      <div className="space-y-4">
        <Select label={t('emergency.cancelReason', 'Reason')} value={reason} onChange={(e) => setReason(e.target.value)} options={CANCEL_REASONS} required />
        {reason === 'other' && <TextArea label={t('emergency.notes', 'Notes')} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={onClose}>{t('common.back', 'Back')}</Button>
          <Button variant="danger" className="flex-1 rounded-2xl h-12" loading={isLoading} onClick={() => onConfirm(reason, notes)}>{t('emergency.confirmCancel', 'Confirm Cancel')}</Button>
        </div>
      </div>
    </Modal>
  );
};

const AllHelplinesModal = ({ helplines, isOpen, onClose }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('emergency.allHelplines', 'All Emergency Helplines')} size="md">
      <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
        {helplines.map((h, i) => <HelplineCard key={h.id || i} helpline={h} />)}
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Emergency = () => {
  const { t } = useTranslation();
  const { speak, voiceEnabled } = useVoice();

  const [activeTab, setActiveTab] = useState('sos');
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeSOS, setActiveSOS] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [nearbyServices, setNearbyServices] = useState({});
  const [helplines, setHelplines] = useState(FALLBACK_HELPLINES);
  const [firstAidCategories, setFirstAidCategories] = useState([]);
  const [selectedServiceType, setSelectedServiceType] = useState('hospital');
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [firstAidSearch, setFirstAidSearch] = useState('');
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAllHelplines, setShowAllHelplines] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [selectedFirstAid, setSelectedFirstAid] = useState(null);

  const contactsRef = useRef(contacts);
  useEffect(() => { contactsRef.current = contacts; }, [contacts]);

  const tabs = [
    { id: 'sos', label: t('emergency.sos', 'SOS'), icon: AlertTriangle, color: 'red', emoji: '🚨' },
    { id: 'contacts', label: t('emergency.contacts', 'Contacts'), icon: Users, color: 'primary', emoji: '👥' },
    { id: 'nearby', label: t('emergency.nearby', 'Nearby'), icon: MapPin, color: 'blue', emoji: '📍' },
    { id: 'firstaid', label: t('emergency.firstAid', 'First Aid'), icon: BookOpen, color: 'green', emoji: '🩹' }
  ];

  // ---- ALL LOGIC IDENTICAL FROM HERE ----

  useEffect(() => {
    if (!navigator.geolocation) { setLocationError('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setLocationError(err.message)
    );
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setInitialLoading(true);
      const results = await Promise.allSettled([
        emergencyService.getEmergencyContacts(),
        emergencyService.getActiveSOS(),
        emergencyService.getHelplines(),
        emergencyService.getFirstAidGuides(),
      ]);
      const contactsRes = results[0].status === 'fulfilled' ? results[0].value : null;
      if (contactsRes?.success && contactsRes?.contacts) setContacts(contactsRes.contacts.map(transformContactFromBackend));
      else if (Array.isArray(contactsRes)) setContacts(contactsRes.map(transformContactFromBackend));
      const sosRes = results[1].status === 'fulfilled' ? results[1].value : null;
      if (sosRes?.success && sosRes?.has_active && sosRes?.sos) setActiveSOS(transformSOSResponse(sosRes.sos));
      const helplinesRes = results[2].status === 'fulfilled' ? results[2].value : null;
      if (helplinesRes?.success && helplinesRes?.helplines?.length > 0) setHelplines(helplinesRes.helplines.map(transformHelplineFromBackend));
      const firstAidRes = results[3].status === 'fulfilled' ? results[3].value : null;
      if (firstAidRes?.success && firstAidRes?.categories) setFirstAidCategories(firstAidRes.categories);
      setInitialLoading(false);
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!location) return;
    const loadNearby = async () => {
      try {
        const response = await emergencyService.getNearbyServices({ latitude: safeCoord(location.lat), longitude: safeCoord(location.lng), service_type: selectedServiceType, radius_km: 15 });
        if (response?.success && response?.services) setNearbyServices(prev => ({ ...prev, [selectedServiceType]: response.services }));
      } catch (err) { console.error('Error loading nearby services:', err); }
    };
    loadNearby();
  }, [location, selectedServiceType]);

  useEffect(() => {
    if (!location) return;
    emergencyService.updateLocation({ latitude: safeCoord(location.lat), longitude: safeCoord(location.lng) }).catch(err => console.error('Location cache update failed:', err));
  }, [location]);

  const handleSOSTrigger = useCallback(async (data) => {
    setIsLoading(true);
    try {
      const payload = { emergency_type: data.type || 'medical', description: data.additionalInfo || '', latitude: safeCoord(location?.lat), longitude: safeCoord(location?.lng) };
      const response = await emergencyService.triggerSOS(payload);
      setActiveSOS(transformSOSResponse(response?.sos || response) || { id: Date.now(), type: data.type, triggeredAt: new Date().toISOString(), location: 'Current location', notifiedContacts: contactsRef.current.filter(c => c.notifyOnSOS).length });
      setShowSOSModal(false);
      toast.success(t('emergency.sosTriggered', 'SOS triggered! Help is on the way.'));
      if (voiceEnabled) speak('SOS has been triggered. Your emergency contacts have been notified.');
    } catch (err) { toast.error(t('emergency.sosError', 'Failed to trigger SOS. Please call 112 directly.')); } finally { setIsLoading(false); }
  }, [location, t, voiceEnabled, speak]);

  const handleQuickSOS = useCallback(async () => {
    setIsLoading(true);
    try {
      const payload = { emergency_type: 'medical', latitude: safeCoord(location?.lat), longitude: safeCoord(location?.lng), use_cached_location: true };
      const response = await emergencyService.quickTriggerSOS(payload);
      setActiveSOS(transformSOSResponse(response?.sos || response) || { id: Date.now(), type: 'Medical Emergency', triggeredAt: new Date().toISOString(), location: 'Current location', notifiedContacts: contactsRef.current.filter(c => c.notifyOnSOS).length });
      toast.success(t('emergency.sosTriggered', 'SOS triggered! Help is on the way.'));
      if (voiceEnabled) speak('SOS has been triggered. Your emergency contacts have been notified.');
    } catch (err) { toast.error(t('emergency.sosError', 'Failed to trigger SOS. Please call 112 directly.')); } finally { setIsLoading(false); }
  }, [location, t, voiceEnabled, speak]);

  const handleCancelSOS = useCallback(async (reason, notes) => {
    if (!activeSOS?.id) return;
    setIsLoading(true);
    try {
      await emergencyService.cancelSOS(activeSOS.id, { reason, notes });
      setActiveSOS(null); setShowCancelModal(false);
      toast.success(t('emergency.sosCancelled', 'SOS has been cancelled.'));
    } catch (err) { toast.error(t('emergency.cancelError', 'Failed to cancel SOS.')); } finally { setIsLoading(false); }
  }, [activeSOS, t]);

  const handleSaveContact = useCallback(async (data) => {
    setIsLoading(true);
    try {
      const backendData = transformContactToBackend(data);
      if (editingContact) {
        const response = await emergencyService.updateEmergencyContact(editingContact.id, backendData);
        const updated = response?.contact ? transformContactFromBackend(response.contact) : { ...editingContact, ...data };
        setContacts(prev => prev.map(c => c.id === editingContact.id ? updated : c));
        toast.success(t('emergency.contactUpdated', 'Contact updated successfully.'));
      } else {
        const response = await emergencyService.addEmergencyContact(backendData);
        const newContact = response?.contact ? transformContactFromBackend(response.contact) : { ...data, id: Date.now().toString() };
        setContacts(prev => [...prev, newContact]);
        toast.success(t('emergency.contactAdded', 'Contact added successfully.'));
      }
      setShowContactModal(false); setEditingContact(null);
    } catch (err) { toast.error(t('emergency.contactError', 'Failed to save contact.')); } finally { setIsLoading(false); }
  }, [editingContact, t]);

  const handleDeleteContact = useCallback(async (contact) => {
    setIsLoading(true);
    try {
      await emergencyService.deleteEmergencyContact(contact.id);
      setContacts(prev => prev.filter(c => c.id !== contact.id));
      toast.success(t('emergency.contactDeleted', 'Contact deleted.')); setShowDeleteConfirm(null);
    } catch (err) { toast.error(t('emergency.deleteError', 'Failed to delete contact.')); } finally { setIsLoading(false); }
  }, [t]);

  const handleCallContact = useCallback((phone) => { window.open(`tel:${phone.replace(/\s/g, '')}`); }, []);

  const handleFirstAidClick = useCallback(async (category) => {
    const categoryCode = category.code || category.id;
    try {
      const response = await emergencyService.getFirstAidByCategory(categoryCode);
      if (response?.success && response?.guides?.length > 0) setSelectedFirstAid(transformFirstAidFromBackend(response.guides[0]));
      else toast.error(t('emergency.guideNotAvailable', 'Guide not available for this category yet.'));
    } catch (err) { console.error('Error loading first aid guide:', err); toast.error(t('emergency.guideNotAvailable', 'Guide not available for this category yet.')); }
  }, [t]);

  // ========== TAB RENDERERS ==========

  const renderSOSTab = () => (
    <div className="space-y-7">
      {activeSOS && <ActiveSOSCard sos={activeSOS} onCancel={() => setShowCancelModal(true)} isLoading={isLoading} />}

      {!activeSOS && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
            <AlertTriangle className="w-96 h-96" />
          </div>
          <div className="relative flex flex-col items-center py-8">
            <SOSButton onTrigger={handleQuickSOS} isActive={!!activeSOS} isLoading={isLoading} />
            <button onClick={() => setShowSOSModal(true)}
              className="mt-6 flex items-center gap-2 px-6 py-3 bg-white border-2 border-dashed border-gray-300 rounded-2xl text-sm font-semibold text-gray-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50/50 active:scale-95 transition-all">
              <Sparkles className="w-4 h-4" />{t('emergency.selectEmergencyType', 'Choose Emergency Type')}
            </button>
          </div>
        </div>
      )}

      {/* Helplines */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            📞 {t('emergency.helplines', 'Helplines')}
          </h2>
          {helplines.length > 4 && (
            <button onClick={() => setShowAllHelplines(true)} className="flex items-center gap-0.5 text-sm font-bold text-primary-500 hover:text-primary-600 active:scale-95 transition-all">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="space-y-2.5">
          {helplines.slice(0, 4).map((h, i) => <HelplineCard key={h.id || i} helpline={h} index={i} />)}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-4">⚡ Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Call 112', icon: Phone, gradient: 'from-red-500 via-red-600 to-rose-600', shadow: 'shadow-red-500/30', onClick: () => window.open('tel:112'), emoji: '🚨' },
            { label: 'Ambulance', icon: Ambulance, gradient: 'from-orange-500 to-amber-600', shadow: 'shadow-orange-500/30', onClick: () => window.open('tel:108'), emoji: '🚑' },
            { label: 'Hospital', icon: Hospital, gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/30', onClick: () => setActiveTab('nearby'), emoji: '🏥' }
          ].map(({ label, icon: Icon, gradient, shadow, onClick, emoji }) => (
            <button key={label} onClick={onClick}
              className={`group relative flex flex-col items-center p-5 rounded-3xl bg-gradient-to-br ${gradient} text-white shadow-xl ${shadow} hover:shadow-2xl active:scale-[0.93] transition-all duration-300 touch-manipulation overflow-hidden`}>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full" />
              <div className="absolute -bottom-2 -left-2 w-10 h-10 bg-white/5 rounded-full" />
              <span className="text-3xl mb-1 relative z-10">{emoji}</span>
              <Icon className="w-7 h-7 relative z-10 mb-1.5 drop-shadow-md" />
              <span className="text-xs font-bold relative z-10 tracking-wide">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContactsTab = () => (
    <div className="space-y-5">
      <button onClick={() => { setEditingContact(null); setShowContactModal(true); }}
        className="w-full flex items-center justify-center gap-2.5 py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-semibold hover:border-primary-400 hover:text-primary-600 hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-blue-50/50 active:scale-[0.98] transition-all">
        <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
          <Plus className="w-4 h-4" />
        </div>
        {t('emergency.addContact', 'Add Emergency Contact')}
      </button>

      {contacts.length === 0 ? (
        <div className="text-center py-16">
          <div className="relative w-24 h-24 mx-auto mb-5">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 rounded-[2rem] animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-[2rem] flex items-center justify-center">
              <Users className="w-10 h-10 text-gray-400" />
            </div>
          </div>
          <h3 className="font-black text-gray-900 text-lg mb-2">{t('emergency.noContacts', 'No Emergency Contacts')}</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto leading-relaxed">{t('emergency.noContactsDesc', 'Add emergency contacts who will be notified when you trigger SOS.')}</p>
          <button onClick={() => { setEditingContact(null); setShowContactModal(true); }}
            className="inline-flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-primary-500 to-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-500/25 hover:shadow-2xl hover:shadow-primary-500/35 active:scale-95 transition-all">
            <Plus className="w-5 h-5" />{t('emergency.addFirst', 'Add First Contact')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map(c => <ContactCard key={c.id} contact={c} onEdit={(ct) => { setEditingContact(ct); setShowContactModal(true); }} onDelete={(ct) => setShowDeleteConfirm(ct)} onCall={handleCallContact} />)}
        </div>
      )}

      {/* Info */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white p-5 shadow-xl shadow-blue-500/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-10 -translate-x-10" />
        <div className="relative z-10 flex gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
            <Info className="w-5 h-5" />
          </div>
          <div className="text-sm">
            <p className="font-bold mb-2">{t('emergency.contactsInfo', 'About Emergency Contacts')}</p>
            <ul className="space-y-2 text-white/80">
              {[
                t('emergency.contactsTip1', 'Primary contact will be called first'),
                t('emergency.contactsTip2', 'Contacts marked for SOS will receive automatic alerts'),
                t('emergency.contactsTip3', 'Your location will be shared when SOS is triggered')
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 bg-white/10 rounded-xl p-2.5 backdrop-blur-sm">
                  <CheckCircle className="w-4 h-4 text-green-300 flex-shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNearbyTab = () => (
    <div className="space-y-5">
      {locationError ? (
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-200">
          <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800">{t('emergency.locationError', 'Location access denied')}</p>
            <p className="text-xs text-amber-600">{t('emergency.enableLocation', 'Enable location for accurate results')}</p>
          </div>
        </div>
      ) : !location ? (
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl border border-blue-200">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-400 to-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm font-semibold text-blue-700">{t('emergency.gettingLocation', 'Getting your location...')}</p>
        </div>
      ) : null}

      {/* Service Type Filter */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {SERVICE_TYPES.map(type => {
          const Ic = type.icon;
          const isSelected = selectedServiceType === type.id;
          return (
            <button key={type.id} onClick={() => setSelectedServiceType(type.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl whitespace-nowrap transition-all duration-300 active:scale-95 touch-manipulation
                ${isSelected
                  ? `bg-gradient-to-r ${type.gradient} text-white shadow-xl font-bold`
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 font-semibold'}`}>
              <span className="text-base">{type.emoji}</span>
              <span className="text-sm">{type.label}</span>
            </button>
          );
        })}
      </div>

      {/* Services */}
      <div className="space-y-3">
        {nearbyServices[selectedServiceType]?.length > 0
          ? nearbyServices[selectedServiceType].map(s => <ServiceCard key={s.id} service={s} />)
          : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-black text-gray-900 text-lg mb-1">{t('emergency.noServices', 'No services found')}</h3>
              <p className="text-sm text-gray-500">{t('emergency.noServicesDesc', 'No {{type}} found nearby.', { type: selectedServiceType })}</p>
            </div>
          )}
      </div>
    </div>
  );

  const renderFirstAidTab = () => {
    const filtered = firstAidCategories.filter(cat =>
      !firstAidSearch || (cat.name || '').toLowerCase().includes(firstAidSearch.toLowerCase())
    );
    return (
      <div className="space-y-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder={t('emergency.searchFirstAid', 'Search first aid guides...')} value={firstAidSearch} onChange={(e) => setFirstAidSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-400 shadow-sm placeholder:text-gray-400 transition-all" />
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {filtered.map(cat => <FirstAidCategoryCard key={cat.code || cat.id} category={cat} onClick={() => handleFirstAidClick(cat)} />)}
          </div>
        ) : firstAidCategories.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-7 h-7 animate-spin text-green-500" />
            </div>
            <p className="text-sm text-gray-500 font-semibold">{t('emergency.loadingGuides', 'Loading first aid guides...')}</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{t('emergency.noResults', 'No guides found')}</h3>
            <p className="text-sm text-gray-500">{t('emergency.tryDifferentSearch', 'Try a different search term.')}</p>
          </div>
        )}

        {/* Emergency Tips */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white p-6 shadow-2xl shadow-red-500/25">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-20 translate-x-20" />
          <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/5 rounded-full translate-y-14 -translate-x-14" />
          <div className="absolute top-4 right-4 text-6xl opacity-[0.08] select-none">🩹</div>

          <div className="relative z-10">
            <h3 className="font-black mb-4 flex items-center gap-2.5 text-lg">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Shield className="w-5 h-5" />
              </div>
              {t('emergency.rememberInEmergency', 'Remember')}
            </h3>
            <div className="space-y-2.5">
              {[
                t('emergency.tip1', 'Stay calm and assess the situation'),
                t('emergency.tip2', 'Call emergency services (112) immediately'),
                t('emergency.tip3', 'Do not move injured person unless necessary'),
                t('emergency.tip4', 'Provide first aid only if trained')
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/10 rounded-2xl p-3.5 backdrop-blur-sm hover:bg-white/15 transition-colors">
                  <div className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0">{i + 1}</div>
                  <span className="text-sm font-medium text-white/90 leading-relaxed">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ========== RENDER ==========

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 bg-red-500/20 rounded-3xl animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative w-20 h-20 bg-gradient-to-br from-red-500 to-rose-600 rounded-3xl flex items-center justify-center shadow-xl shadow-red-500/30">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          </div>
          <p className="text-gray-600 font-semibold">{t('emergency.loading', 'Loading emergency services...')}</p>
          <p className="text-gray-400 text-sm mt-1">Stay calm, help is near</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100/50 pb-24">

      {/* ── Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-500 to-rose-600 text-white">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.04] rounded-full -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/[0.04] rounded-full translate-y-24 -translate-x-24" />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-rose-500/20 rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10 px-5 pt-6 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Emergency Services</p>
              <h1 className="text-2xl font-black tracking-tight">{t('emergency.title', 'Emergency')}</h1>
            </div>
          </div>
          <p className="text-red-200/80 text-sm ml-[52px]">{t('emergency.subtitle', 'Quick access to help when you need it most')}</p>
        </div>

        {/* Curved bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-b from-transparent to-gray-50 rounded-t-[2rem]" />
      </div>

      {/* ── Tab Navigation ── */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-10 shadow-sm">
        <div className="flex px-3 gap-1">
          {tabs.map(tab => {
            const Ic = tab.icon;
            const isActive = activeTab === tab.id;
            const colorMap = {
              red: { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-500', iconBg: 'bg-gradient-to-br from-red-500 to-rose-600' },
              primary: { text: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-500', iconBg: 'bg-gradient-to-br from-primary-500 to-blue-600' },
              blue: { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-500', iconBg: 'bg-gradient-to-br from-blue-500 to-sky-600' },
              green: { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-500', iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600' },
            };
            const c = colorMap[tab.color] || colorMap.red;

            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 text-[11px] font-bold border-b-[3px] transition-all duration-300 touch-manipulation rounded-t-lg
                  ${isActive ? `${c.text} ${c.border}` : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300
                  ${isActive ? `${c.iconBg} text-white shadow-md scale-110` : 'bg-gray-100'}`}>
                  <Ic className="w-4 h-4" />
                </div>
                <span className="tracking-wide">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
        {activeTab === 'sos' && renderSOSTab()}
        {activeTab === 'contacts' && renderContactsTab()}
        {activeTab === 'nearby' && renderNearbyTab()}
        {activeTab === 'firstaid' && renderFirstAidTab()}
      </div>

      {/* ── Modals ── */}
      <SOSTriggerModal isOpen={showSOSModal} onClose={() => setShowSOSModal(false)} onTrigger={handleSOSTrigger} isLoading={isLoading} />
      <CancelSOSModal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} onConfirm={handleCancelSOS} isLoading={isLoading} />
      <ContactModal contact={editingContact} isOpen={showContactModal} onClose={() => { setShowContactModal(false); setEditingContact(null); }} onSave={handleSaveContact} isLoading={isLoading} />
      <FirstAidGuideModal guide={selectedFirstAid} isOpen={!!selectedFirstAid} onClose={() => setSelectedFirstAid(null)} />
      <AllHelplinesModal helplines={helplines} isOpen={showAllHelplines} onClose={() => setShowAllHelplines(false)} />

      <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title={t('emergency.deleteContact', 'Delete Contact')} size="sm">
        <div className="space-y-4">
          <p className="text-gray-600">{t('emergency.deleteConfirm', 'Are you sure you want to delete {{name}}?', { name: showDeleteConfirm?.name })}</p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={() => setShowDeleteConfirm(null)}>{t('common.cancel', 'Cancel')}</Button>
            <Button variant="danger" className="flex-1 rounded-2xl h-12" onClick={() => handleDeleteContact(showDeleteConfirm)} loading={isLoading}>{t('common.delete', 'Delete')}</Button>
          </div>
        </div>
      </Modal>

      {/* Shimmer animation keyframe */}
      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default Emergency;