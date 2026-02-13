import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  FileText,
  Pill,
  MessageSquare,
  Heart,
  Stethoscope,
  Mic,
  ChevronRight,
  Volume2,
  MapPin,
  Bell,
  X,
  Sun,
  Moon,
  CloudSun,
} from 'lucide-react';
import { patientAPI, healthRecordsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { icon: Sun, key: 'patient.goodMorning' };
  if (h < 17) return { icon: CloudSun, key: 'patient.goodAfternoon' };
  return { icon: Moon, key: 'patient.goodEvening' };
};

const formatName = (name) => {
  if (!name) return '';
  return name.toString().split(/[\s._-]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').split(' ')[0];
};

const PatientHomeTab = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [nextAppointment, setNextAppointment] = useState(null);
  const [healthScore, setHealthScore] = useState(null);
  const [healthTip, setHealthTip] = useState(null);
  const [sosActive, setSosActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [appRes, recordsRes] = await Promise.all([
          patientAPI.getUpcomingAppointments().catch(() => ({ data: [] })),
          healthRecordsAPI.getRecords().catch(() => ({ data: [] })),
        ]);
        const appointments = appRes.data || [];
        setNextAppointment(appointments[0] || null);
        setHealthScore(78); // TODO: from /api/v1/health-records/analytics/score/
        setHealthTip({
          titleTe: 'రోజూ 8 గ్లాసుల నీళ్లు త్రాగండి',
          titleEn: 'Drink 8 glasses of water daily',
          description: 'Staying hydrated helps your body function better and prevents many health issues.',
        });
        setReminders([
          { id: 1, time: '9:00 AM', name: 'Metformin 500mg', note: 'After breakfast', taken: true },
          { id: 2, time: '2:00 PM', name: 'Aspirin 75mg', note: 'After lunch', overdue: true },
          { id: 3, time: '9:00 PM', name: 'Metformin 500mg', note: 'After dinner', taken: false },
        ]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const quickActions = [
    { id: 'symptoms', emoji: '🩺', icon: Stethoscope, label: t('patient.checkSymptoms', 'Check Symptoms'), sub: t('patient.checkSymptomsSub', 'Tap to check what\'s wrong'), path: '/patient-dashboard', tab: 'health' },
    { id: 'chat', emoji: '🤖', icon: MessageSquare, label: t('patient.askAI', 'Ask AI Chatbot'), sub: t('patient.askAISub', 'Get health advice 24/7'), path: '/patient-dashboard', tab: 'chat' },
    { id: 'book', emoji: '📅', icon: Calendar, label: t('patient.bookAppointment', 'Book Appointment'), sub: t('patient.bookAppointmentSub', 'Schedule with a doctor'), path: '/patient-dashboard', tab: 'appointments' },
    { id: 'voice', emoji: '🎤', icon: Mic, label: t('patient.voiceAssistant', 'Voice Assistant'), sub: t('patient.voiceAssistantSub', 'Speak to describe'), path: '/patient-dashboard', tab: 'health' },
    { id: 'records', emoji: '📋', icon: FileText, label: t('patient.myRecords', 'My Health Records'), sub: t('patient.myRecordsSub', 'View medical history'), path: '/patient-dashboard', tab: 'records' },
    { id: 'medicines', emoji: '💊', icon: Pill, label: t('patient.medicines', 'Medicines & Reminders'), sub: t('patient.medicinesSub', 'Manage your medications'), path: '/medicines' },
  ];

  const handleQuickAction = (action) => {
    if (action.tab) {
      navigate('/patient-dashboard', { state: { tab: action.tab } });
      return;
    }
    if (action.path) navigate(action.path);
  };

  return (
    <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
      {/* SOS Banner - conditional */}
      {sosActive && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-semibold text-amber-800">{t('patient.sosAlertActive', 'SOS Alert Active')}</p>
              <p className="text-sm text-amber-700 mt-1">{t('patient.sosHelpOnWay', 'Help is on the way. Your contacts have been notified.')}</p>
              <p className="text-xs text-amber-600 mt-1">{t('patient.locationShared', 'Location shared')}: Hyderabad, Telangana</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button type="button" className="px-3 py-1.5 rounded-lg bg-amber-200 text-amber-900 text-sm font-medium">{t('patient.viewDetails', 'View Details')}</button>
              <button type="button" onClick={() => setSosActive(false)} className="p-1.5 rounded-lg hover:bg-amber-100" aria-label={t('patient.cancel')}><X className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Greeting Card */}
      <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary-50">
            <GreetingIcon className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {t(greeting.key, 'Good Morning')}, {formatName(user?.name)}!
            </h2>
            <p className="text-sm text-gray-500">{dateStr}</p>
            {healthScore != null && (
              <p className="text-sm text-gray-700 mt-1">
                {t('patient.healthScore', 'Health Score')}: <span className="font-semibold text-green-600">{healthScore}/100</span> ({t('patient.good', 'Good')})
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Medicine Reminders */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary-600" />
            {t('patient.medicineRemindersToday', 'Medicine Reminders Today')}
          </h3>
          <button type="button" className="text-sm text-primary-600 font-medium">{t('patient.viewAll', 'View All')}</button>
        </div>
        <div className="divide-y">
          {reminders.map((r) => (
            <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900">{r.time} - {r.name}</p>
                <p className="text-sm text-gray-500">{r.note}</p>
                {r.overdue && <span className="text-xs text-amber-600">{t('patient.overdue', 'Overdue')}</span>}
              </div>
              <button
                type="button"
                className={`min-h-[44px] px-4 rounded-xl text-sm font-medium touch-manipulation ${
                  r.taken ? 'bg-green-100 text-green-800' : 'bg-primary-600 text-white'
                }`}
              >
                {r.taken ? t('patient.taken', 'Taken') : t('patient.takeNow', 'Take Now')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Next Appointment */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-600" />
            {t('patient.nextAppointment', 'Next Appointment')}
          </h3>
          <button type="button" className="text-sm text-primary-600 font-medium" onClick={() => navigate('/patient-dashboard', { state: { tab: 'appointments' } })}>
            {t('patient.bookNew', 'Book New')}
          </button>
        </div>
        {loading ? (
          <div className="p-6 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
        ) : nextAppointment ? (
          <div className="p-4 space-y-2">
            <p className="font-semibold text-gray-900">{nextAppointment.doctorName || 'Dr. Ramesh Kumar'}</p>
            <p className="text-sm text-gray-500">{nextAppointment.specialization || 'General Physician'}</p>
            <p className="text-sm text-gray-700">{nextAppointment.date || 'Tomorrow, 28 Jan 2025'} • {nextAppointment.time || '10:30 AM - 11:00 AM'}</p>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {nextAppointment.location || 'Primary Health Center, Malkajgiri'}
            </p>
            <p className="text-xs text-gray-500">{t('patient.token', 'Token')} #12 | {t('patient.queue', 'Queue')}: 5 {t('patient.patientsAhead', 'patients ahead')}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm">
                <Bell className="h-4 w-4" /> {t('patient.remindMe', 'Remind Me')}
              </button>
              <button type="button" className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm">
                <MapPin className="h-4 w-4" /> {t('patient.directions', 'Directions')}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 mb-3">{t('patient.noUpcomingAppointment', 'No upcoming appointment')}</p>
            <button
              type="button"
              className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium"
              onClick={() => navigate('/patient-dashboard', { state: { tab: 'appointments' } })}
            >
              {t('patient.bookNew', 'Book New')}
            </button>
          </div>
        )}
      </div>

      {/* Quick Action Cards - 3x2 */}
      <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-3">{t('patient.quickActions', 'Quick Actions')}</h3>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => handleQuickAction(action)}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 hover:bg-gray-50 touch-manipulation min-h-[100px]"
              >
                <span className="text-2xl mb-1">{action.emoji}</span>
                <Icon className="h-6 w-6 text-primary-600 mb-1" aria-hidden />
                <span className="text-xs font-medium text-gray-900 text-center leading-tight">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Health Tip */}
      {healthTip && (
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              {t('patient.healthTip', 'Health Tip')}
            </h3>
            <button type="button" className="p-2 rounded-lg hover:bg-gray-100" aria-label={t('patient.listen', 'Listen')}>
              <Volume2 className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <div className="p-4">
            <p className="text-gray-900 font-medium">{healthTip.titleTe}</p>
            <p className="text-sm text-gray-500 mt-1">({healthTip.titleEn})</p>
            <p className="text-sm text-gray-600 mt-2">{healthTip.description}</p>
          </div>
        </div>
      )}

      {/* Family Members */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-bold text-gray-900">👨‍👩‍👧 {t('patient.familyMembers', 'Family Members')}</h3>
          <button type="button" className="text-sm text-primary-600 font-medium">{t('patient.manage', 'Manage')}</button>
        </div>
        <div className="p-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[{ name: 'Mother', active: true }, { name: 'Father', active: false }, { name: 'Son', active: false }].map((m, i) => (
              <button key={i} type="button" className="flex-shrink-0 w-20 flex flex-col items-center p-3 rounded-xl border border-gray-200 hover:bg-gray-50">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl">👤</div>
                <span className="text-xs font-medium mt-1 truncate w-full text-center">{m.name}</span>
                {m.active && <span className="text-[10px] text-green-600">{t('patient.active', 'Active')}</span>}
              </button>
            ))}
            <button type="button" className="flex-shrink-0 w-20 flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500">
              <span className="text-2xl">+</span>
              <span className="text-xs mt-1">{t('patient.add', 'Add')}</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">{t('patient.currentlyManaging', 'Currently managing')}: Lakshmi (Mother)</p>
          <button type="button" className="mt-2 text-sm text-primary-600 font-medium">{t('patient.switchProfile', 'Switch Profile')}</button>
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
};

export default PatientHomeTab;
