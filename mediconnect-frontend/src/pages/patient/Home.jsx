// src/pages/patient/Home.jsx
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  Search,
  Bell,
  ChevronRight,
  Stethoscope,
  FileText,
  Pill,
  Heart,
  AlertTriangle,
  MessageSquare,
  Activity,
  User,
  Star,
  MapPin,
  RefreshCw,
  WifiOff,
  AlertCircle,
  Loader2,
  Mic,
  Sun,
  Sunrise,
  Sunset,
  Moon
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  Avatar,
  Loader,
  EmptyState
} from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import { useVoice } from '../../hooks/useVoice';
import { useLanguage } from '../../hooks/useLanguage';
import { 
  appointmentService, 
  notificationService,
  healthRecordsService,
  medicineService,
  chatbotService
} from '../../services/api';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import toast from 'react-hot-toast';

// ============================================================================
// CONSTANTS
// ============================================================================

const QUICK_ACTIONS = [
  { id: 'find-doctor', icon: Stethoscope, label: 'Find Doctor', route: '/patient/doctors', color: 'bg-blue-500' },
  { id: 'appointments', icon: Calendar, label: 'Appointments', route: '/patient/appointments', color: 'bg-green-500' },
  { id: 'symptoms', icon: Activity, label: 'Check Symptoms', route: '/patient/symptom-checker', color: 'bg-purple-500' },
  { id: 'medicines', icon: Pill, label: 'Medicines', route: '/patient/medicines', color: 'bg-orange-500' },
  { id: 'records', icon: FileText, label: 'Health Records', route: '/patient/health-records', color: 'bg-cyan-500' },
  { id: 'emergency', icon: AlertTriangle, label: 'Emergency', route: '/patient/emergency', color: 'bg-red-500' }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return { text: 'Good Night', icon: Moon };
  if (hour < 12) return { text: 'Good Morning', icon: Sunrise };
  if (hour < 17) return { text: 'Good Afternoon', icon: Sun };
  if (hour < 21) return { text: 'Good Evening', icon: Sunset };
  return { text: 'Good Night', icon: Moon };
};

const formatAppointmentDate = (dateString) => {
  try {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  } catch {
    return dateString;
  }
};

const formatAppointmentTime = (timeString) => {
  try {
    return format(parseISO(`2000-01-01T${timeString}`), 'h:mm a');
  } catch {
    return timeString;
  }
};

// ============================================================================
// ERROR STATE COMPONENT
// ============================================================================

const ErrorState = ({ message, onRetry }) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6 text-red-500" />
      </div>
      <p className="text-gray-500 text-center mb-3 text-sm">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="w-4 h-4 mr-1" />
        {t('common.retry', 'Retry')}
      </Button>
    </div>
  );
};

// ============================================================================
// OFFLINE STATE COMPONENT
// ============================================================================

const OfflineState = () => {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t('common.offline', 'You are offline')}
      </h3>
      <p className="text-gray-500 text-center max-w-sm">
        {t('common.checkConnection', 'Please check your internet connection')}
      </p>
    </div>
  );
};

// ============================================================================
// APPOINTMENT CARD COMPONENT
// ============================================================================

const AppointmentCard = ({ appointment, onJoin, onView }) => {
  const { t } = useTranslation();
  const isUpcoming = appointment.status === 'confirmed' || appointment.status === 'scheduled';
  const canJoin = appointment.status === 'in_progress' || 
    (isUpcoming && isToday(parseISO(appointment.date)));

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Avatar
          src={appointment.doctor?.profile_picture}
          name={appointment.doctor?.full_name || 'Doctor'}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-gray-900 truncate">
                {appointment.doctor?.full_name || t('common.doctor', 'Doctor')}
              </h3>
              <p className="text-sm text-gray-500">
                {appointment.doctor?.specialization || t('common.specialist', 'Specialist')}
              </p>
            </div>
            <Badge 
              variant={
                appointment.status === 'confirmed' ? 'success' :
                appointment.status === 'in_progress' ? 'primary' :
                appointment.status === 'scheduled' ? 'warning' :
                'default'
              }
              size="sm"
            >
              {appointment.status}
            </Badge>
          </div>

          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatAppointmentDate(appointment.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatAppointmentTime(appointment.time_slot)}
            </span>
            <span className="flex items-center gap-1">
              {appointment.consultation_type === 'video' ? (
                <Video className="w-4 h-4" />
              ) : (
                <Phone className="w-4 h-4" />
              )}
              {appointment.consultation_type}
            </span>
          </div>

          <div className="flex gap-2 mt-3">
            {canJoin && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onJoin(appointment)}
              >
                {appointment.consultation_type === 'video' ? (
                  <Video className="w-4 h-4 mr-1" />
                ) : (
                  <Phone className="w-4 h-4 mr-1" />
                )}
                {t('home.joinNow', 'Join Now')}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(appointment)}
            >
              {t('common.viewDetails', 'View Details')}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

// ============================================================================
// MEDICINE REMINDER CARD COMPONENT
// ============================================================================

const MedicineReminderCard = ({ reminder, onTake, onSkip, isProcessing }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
          <Pill className="w-5 h-5 text-orange-500" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{reminder.medicine_name}</p>
          <p className="text-sm text-gray-500">
            {reminder.dosage} • {reminder.timing}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSkip(reminder.id)}
          disabled={isProcessing}
        >
          {t('common.skip', 'Skip')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onTake(reminder.id)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t('common.take', 'Take')
          )}
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// HEALTH TIP CARD COMPONENT
// ============================================================================

const HealthTipCard = ({ tip }) => {
  const { t } = useTranslation();

  if (!tip) return null;

  return (
    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-100">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Heart className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-medium text-green-800 mb-1">
              {t('home.healthTip', 'Health Tip of the Day')}
            </h3>
            <p className="text-sm text-green-700">{tip.content}</p>
            {tip.category && (
              <Badge variant="success" size="sm" className="mt-2">
                {tip.category}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

// ============================================================================
// QUICK ACTION BUTTON COMPONENT
// ============================================================================

const QuickActionButton = ({ action, onClick }) => {
  const { t } = useTranslation();
  const Icon = action.icon;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-3 rounded-xl hover:bg-gray-50 transition-colors"
    >
      <div className={`w-12 h-12 ${action.color} rounded-full flex items-center justify-center mb-2 shadow-sm`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-xs font-medium text-gray-700 text-center">
        {t(`home.${action.id}`, action.label)}
      </span>
    </button>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { speak, voiceEnabled } = useVoice();
  const { currentLanguage } = useLanguage();

  // State - NO MOCK DATA
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [todayReminders, setTodayReminders] = useState([]);
  const [healthTip, setHealthTip] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [healthSummary, setHealthSummary] = useState(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingReminderId, setProcessingReminderId] = useState(null);

  // Error states
  const [error, setError] = useState(null);
  const [appointmentError, setAppointmentError] = useState(null);
  const [reminderError, setReminderError] = useState(null);

  // Online status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Greeting
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  // Online/Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load data on mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Voice greeting
  useEffect(() => {
    if (voiceEnabled && user && !isLoading) {
      const name = user.full_name?.split(' ')[0] || '';
      speak(`${greeting.text} ${name}. Welcome to MediConnect.`);
    }
  }, [voiceEnabled, user, isLoading]);

  // API: Load all dashboard data
  const loadDashboardData = async () => {
    if (!isOnline) {
      setError('You are offline');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setAppointmentError(null);
    setReminderError(null);

    try {
      // Load data in parallel
      const results = await Promise.allSettled([
        appointmentService.getUpcomingAppointments(),
        medicineService.getTodayReminders(),
        chatbotService.getDailyHealthTip(),
        notificationService.getUnreadCount(),
        healthRecordsService.getHealthAnalytics()
      ]);

      // Process appointments
      if (results[0].status === 'fulfilled') {
        setUpcomingAppointments(results[0].value.data || []);
      } else {
        setAppointmentError('Failed to load appointments');
        console.error('Appointments error:', results[0].reason);
      }

      // Process reminders
      if (results[1].status === 'fulfilled') {
        setTodayReminders(results[1].value.data || []);
      } else {
        setReminderError('Failed to load reminders');
        console.error('Reminders error:', results[1].reason);
      }

      // Process health tip
      if (results[2].status === 'fulfilled') {
        setHealthTip(results[2].value.data);
      }

      // Process notifications count
      if (results[3].status === 'fulfilled') {
        setUnreadNotifications(results[3].value.data?.count || 0);
      }

      // Process health summary
      if (results[4].status === 'fulfilled') {
        setHealthSummary(results[4].value.data);
      }

    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  // API: Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  // API: Handle medicine taken
  const handleMedicineTaken = async (reminderId) => {
    setProcessingReminderId(reminderId);
    try {
      await medicineService.respondToReminder(reminderId, { action: 'taken' });
      setTodayReminders(prev => prev.filter(r => r.id !== reminderId));
      toast.success(t('home.medicineTaken', 'Medicine marked as taken'));
      
      if (voiceEnabled) {
        speak('Medicine marked as taken');
      }
    } catch (err) {
      toast.error(t('home.medicineError', 'Failed to update reminder'));
    } finally {
      setProcessingReminderId(null);
    }
  };

  // API: Handle medicine skipped
  const handleMedicineSkipped = async (reminderId) => {
    setProcessingReminderId(reminderId);
    try {
      await medicineService.respondToReminder(reminderId, { action: 'skipped' });
      setTodayReminders(prev => prev.filter(r => r.id !== reminderId));
      toast.info(t('home.medicineSkipped', 'Medicine skipped'));
    } catch (err) {
      toast.error(t('home.medicineError', 'Failed to update reminder'));
    } finally {
      setProcessingReminderId(null);
    }
  };

  // Navigation handlers
  const handleJoinAppointment = (appointment) => {
    navigate(`/patient/consultation/${appointment.id}`);
  };

  const handleViewAppointment = (appointment) => {
    navigate(`/patient/appointments/${appointment.id}`);
  };

  const handleQuickAction = (action) => {
    navigate(action.route);
  };

  // Render offline state
  if (!isOnline) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-primary-500 text-white px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GreetingIcon className="w-6 h-6" />
              <span className="text-lg font-semibold">{t(`home.${greeting.text.toLowerCase().replace(' ', '')}`, greeting.text)}</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold">
            {user?.full_name || t('home.user', 'User')}
          </h1>
        </div>
        <OfflineState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-primary-500 text-white px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GreetingIcon className="w-6 h-6" />
            <span className="text-lg font-semibold">
              {t(`home.${greeting.text.toLowerCase().replace(' ', '')}`, greeting.text)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/patient/notifications')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-1">
          {user?.full_name || t('home.user', 'User')}
        </h1>
        <p className="text-primary-100 text-sm">
          {t('home.welcomeMessage', 'How can we help you today?')}
        </p>

        {/* Search Bar */}
        <button
          onClick={() => navigate('/patient/doctors')}
          className="w-full mt-4 flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition-colors"
        >
          <Search className="w-5 h-5 text-white/70" />
          <span className="text-white/70">
            {t('home.searchDoctors', 'Search doctors, specialties...')}
          </span>
          {voiceEnabled && (
            <Mic className="w-5 h-5 text-white/70 ml-auto" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Quick Actions */}
        <div>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <QuickActionButton
                key={action.id}
                action={action}
                onClick={() => handleQuickAction(action)}
              />
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader size="lg" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={loadDashboardData} />
        ) : (
          <>
            {/* Upcoming Appointments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('home.upcomingAppointments', 'Upcoming Appointments')}
                </h2>
                <button
                  onClick={() => navigate('/patient/appointments')}
                  className="text-primary-500 text-sm font-medium flex items-center gap-1"
                >
                  {t('common.viewAll', 'View All')}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {appointmentError ? (
                <ErrorState message={appointmentError} onRetry={loadDashboardData} />
              ) : upcomingAppointments.length === 0 ? (
                <Card className="p-6">
                  <EmptyState
                    icon={Calendar}
                    title={t('home.noAppointments', 'No upcoming appointments')}
                    description={t('home.noAppointmentsDesc', 'Book an appointment with a doctor')}
                    action={
                      <Button
                        variant="primary"
                        onClick={() => navigate('/patient/doctors')}
                      >
                        {t('home.findDoctor', 'Find Doctor')}
                      </Button>
                    }
                    compact
                  />
                </Card>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onJoin={handleJoinAppointment}
                      onView={handleViewAppointment}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Today's Medicine Reminders */}
            {todayReminders.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t('home.medicineReminders', 'Medicine Reminders')}
                  </h2>
                  <button
                    onClick={() => navigate('/patient/medicines')}
                    className="text-primary-500 text-sm font-medium flex items-center gap-1"
                  >
                    {t('common.viewAll', 'View All')}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {reminderError ? (
                  <ErrorState message={reminderError} onRetry={loadDashboardData} />
                ) : (
                  <div className="space-y-2">
                    {todayReminders.slice(0, 3).map((reminder) => (
                      <MedicineReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        onTake={handleMedicineTaken}
                        onSkip={handleMedicineSkipped}
                        isProcessing={processingReminderId === reminder.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Health Summary */}
            {healthSummary && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t('home.healthSummary', 'Health Summary')}
                  </h2>
                  <button
                    onClick={() => navigate('/patient/health-records')}
                    className="text-primary-500 text-sm font-medium flex items-center gap-1"
                  >
                    {t('common.viewAll', 'View All')}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {healthSummary.latest_vitals?.blood_pressure && (
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-gray-500">
                          {t('health.bloodPressure', 'Blood Pressure')}
                        </span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        {healthSummary.latest_vitals.blood_pressure}
                      </p>
                    </Card>
                  )}
                  {healthSummary.latest_vitals?.heart_rate && (
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Heart className="w-4 h-4 text-pink-500" />
                        <span className="text-sm text-gray-500">
                          {t('health.heartRate', 'Heart Rate')}
                        </span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        {healthSummary.latest_vitals.heart_rate} <span className="text-sm font-normal">bpm</span>
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Health Tip */}
            <HealthTipCard tip={healthTip} />

            {/* Quick Access */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {t('home.quickAccess', 'Quick Access')}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <Card 
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate('/patient/chatbot')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {t('home.healthAssistant', 'Health Assistant')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('home.askAnything', 'Ask anything')}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card 
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate('/patient/symptom-checker')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Activity className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {t('home.symptomChecker', 'Symptom Checker')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('home.checkSymptoms', 'Check symptoms')}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;