import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Users,
  Clock,
  TrendingUp,
  Video,
  FileText,
  MessageSquare,
  DollarSign,
  Star,
  Bell,
  ChevronRight,
  MoreVertical,
  User,
  Activity,
  RefreshCw,
  AlertCircle,
  Wallet,
  Stethoscope,
  ClipboardList,
  Settings,
  LogOut,
  Phone,
  Mail
} from 'lucide-react';
import { 
  appointmentsAPI, 
  consultationAPI, 
  healthRecordsAPI,
  authAPI 
} from '../services/api';
import { useAuth } from '../context/AuthContext';

const DoctorDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState('today');
  const [appointments, setAppointments] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    waitingRoom: 0,
    monthlyEarnings: 0,
    rating: 0,
    totalRatings: 0,
    completedConsultations: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showMoreMenu, setShowMoreMenu] = useState(null);

  // Format name helper
  const formatName = useCallback((name) => {
    if (!name) return '';
    return name
      .toString()
      .split(/[\s._-]+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }, []);

  // Get doctor display name
  const getDoctorName = useCallback(() => {
    if (!user) return t('doctor.defaultName', 'Doctor');
    if (user.name) return `Dr. ${formatName(user.name)}`;
    if (user.first_name) return `Dr. ${formatName(user.first_name)} ${formatName(user.last_name || '')}`;
    return t('doctor.defaultName', 'Doctor');
  }, [user, formatName, t]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Fetch appointments
      const [todayRes, upcomingRes, statsRes] = await Promise.allSettled([
        appointmentsAPI.getToday(),
        appointmentsAPI.getUpcoming(),
        consultationAPI.getStats()
      ]);

      // Process today's appointments
      if (todayRes.status === 'fulfilled') {
        const todayData = todayRes.value?.data?.appointments || todayRes.value?.data || [];
        setTodayAppointments(Array.isArray(todayData) ? todayData : []);
      }

      // Process upcoming appointments
      if (upcomingRes.status === 'fulfilled') {
        const upcomingData = upcomingRes.value?.data?.appointments || upcomingRes.value?.data || [];
        setUpcomingAppointments(Array.isArray(upcomingData) ? upcomingData : []);
      }

      // Process stats
      if (statsRes.status === 'fulfilled') {
        const statsData = statsRes.value?.data || {};
        setStats(prev => ({
          ...prev,
          totalPatients: statsData.total_patients || statsData.totalPatients || 0,
          completedConsultations: statsData.completed_consultations || statsData.completedConsultations || 0,
          rating: statsData.average_rating || statsData.rating || 0,
          totalRatings: statsData.total_ratings || statsData.totalRatings || 0
        }));
      }

      // Calculate dynamic stats
      const today = new Date().toISOString().split('T')[0];
      const allAppointments = [...(todayRes.value?.data || []), ...(upcomingRes.value?.data || [])];
      
      const todayApps = allAppointments.filter(a => {
        const appDate = a.appointment_date || a.date || a.scheduled_date;
        return appDate === today;
      });
      
      const waitingApps = allAppointments.filter(a => 
        a.status === 'waiting' || a.status === 'checked_in' || a.status === 'confirmed'
      );

      setStats(prev => ({
        ...prev,
        todayAppointments: todayApps.length,
        waitingRoom: waitingApps.length
      }));

      // Fetch recent activity (consultation history)
      try {
        const historyRes = await consultationAPI.getHistory({ limit: 5 });
        const historyData = historyRes?.data?.consultations || historyRes?.data || [];
        
        setRecentActivity(historyData.slice(0, 5).map(consultation => ({
          id: consultation.id,
          time: formatRelativeTime(consultation.ended_at || consultation.created_at),
          action: getActivityAction(consultation),
          patient: consultation.patient_name || consultation.patient?.name || 'Patient',
          type: consultation.consultation_type
        })));
      } catch (err) {
        console.error('Failed to fetch activity:', err);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(t('doctor.fetchError', 'Failed to load dashboard data'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  // Format relative time
  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} ${t('common.minutesAgo', 'min ago')}`;
    if (diffHours < 24) return `${diffHours} ${t('common.hoursAgo', 'hours ago')}`;
    if (diffDays === 1) return t('common.yesterday', 'Yesterday');
    if (diffDays < 7) return `${diffDays} ${t('common.daysAgo', 'days ago')}`;
    
    return date.toLocaleDateString();
  };

  // Get activity action text
  const getActivityAction = (consultation) => {
    if (consultation.status === 'completed') {
      return t('doctor.completedConsultation', 'Completed consultation with');
    }
    if (consultation.prescriptions?.length > 0) {
      return t('doctor.prescribedMedicine', 'Prescribed medicine to');
    }
    return t('doctor.consultedWith', 'Consulted with');
  };

  // Initial fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Listen for appointment events
  useEffect(() => {
    const handleAppointmentBooked = () => {
      fetchDashboardData(true);
    };

    window.addEventListener('appointmentBooked', handleAppointmentBooked);
    window.addEventListener('appointmentUpdated', handleAppointmentBooked);
    
    return () => {
      window.removeEventListener('appointmentBooked', handleAppointmentBooked);
      window.removeEventListener('appointmentUpdated', handleAppointmentBooked);
    };
  }, [fetchDashboardData]);

  // Handle appointment actions
  const handleAppointmentAction = async (appointment, action) => {
    setShowMoreMenu(null);
    
    try {
      const appointmentId = appointment.id || appointment._id;
      
      switch (action) {
        case 'start':
          // Start consultation
          if (appointment.consultation_id) {
            navigate(`/consultation/${appointment.consultation_id}`);
          } else {
            // Create consultation from appointment
            const response = await consultationAPI.createFromAppointment(appointmentId);
            navigate(`/consultation/${response.data.id}`);
          }
          break;
          
        case 'cancel':
          if (window.confirm(t('doctor.confirmCancel', 'Are you sure you want to cancel this appointment?'))) {
            await appointmentsAPI.cancel(appointmentId, 'Cancelled by doctor');
            fetchDashboardData(true);
          }
          break;
          
        case 'reschedule':
          navigate(`/appointments/reschedule/${appointmentId}`);
          break;
          
        case 'viewPatient':
          navigate(`/patients/${appointment.patient_id || appointment.patient?.id}`);
          break;
          
        case 'noShow':
          await appointmentsAPI.noShow(appointmentId);
          fetchDashboardData(true);
          break;
          
        default:
          break;
      }
    } catch (err) {
      console.error('Error handling appointment action:', err);
      setError(t('doctor.actionError', 'Failed to perform action'));
    }
  };

  // Toggle online status
  const handleToggleOnline = async () => {
    try {
      // TODO: Update availability via API
      setIsOnline(!isOnline);
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'waiting':
      case 'checked_in':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get display appointments based on active tab
  const displayAppointments = activeTab === 'today' ? todayAppointments : upcomingAppointments;

  // Stats cards configuration
  const statsCards = [
    {
      title: t('doctor.totalPatients', 'Total Patients'),
      value: stats.totalPatients,
      icon: <Users className="h-6 w-6 text-blue-600" />,
      change: null,
      color: 'bg-blue-50 border-blue-200',
      link: '/doctor/patients'
    },
    {
      title: t('doctor.todayAppointments', "Today's Appointments"),
      value: stats.todayAppointments,
      icon: <Calendar className="h-6 w-6 text-green-600" />,
      change: null,
      color: 'bg-green-50 border-green-200',
      link: '/doctor/appointments'
    },
    {
      title: t('doctor.waitingRoom', 'Waiting Room'),
      value: stats.waitingRoom,
      icon: <Clock className="h-6 w-6 text-orange-600" />,
      change: stats.waitingRoom > 0 ? `${stats.waitingRoom} waiting` : null,
      color: 'bg-orange-50 border-orange-200',
      urgent: stats.waitingRoom > 0,
      link: '/doctor/queue'
    },
    {
      title: t('doctor.completedToday', 'Completed Today'),
      value: stats.completedConsultations,
      icon: <Stethoscope className="h-6 w-6 text-purple-600" />,
      change: null,
      color: 'bg-purple-50 border-purple-200',
      link: '/doctor/consultations'
    }
  ];

  // Quick actions configuration
  const quickActions = [
    {
      title: t('doctor.startConsultation', 'Start Consultation'),
      description: t('doctor.startConsultationDesc', 'Begin video call'),
      icon: <Video className="h-6 w-6" />,
      action: () => {
        // Check if there's a waiting patient
        const waitingPatient = todayAppointments.find(a => 
          a.status === 'waiting' || a.status === 'checked_in'
        );
        if (waitingPatient) {
          handleAppointmentAction(waitingPatient, 'start');
        } else {
          navigate('/consultation');
        }
      },
      color: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
    },
    {
      title: t('doctor.writePrescription', 'Write Prescription'),
      description: t('doctor.prescriptionDesc', 'Create new Rx'),
      icon: <FileText className="h-6 w-6" />,
      action: () => navigate('/doctor/prescriptions/new'),
      color: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
    },
    {
      title: t('doctor.patientRecords', 'Patient Records'),
      description: t('doctor.viewRecordsDesc', 'View shared records'),
      icon: <ClipboardList className="h-6 w-6" />,
      action: () => navigate('/doctor/patient-records'),
      color: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
    },
    {
      title: t('doctor.earnings', 'Earnings'),
      description: t('doctor.viewEarnings', 'Track income'),
      icon: <Wallet className="h-6 w-6" />,
      action: () => navigate('/doctor/earnings'),
      color: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
    }
  ];

  // Quick links configuration
  const quickLinks = [
    { label: t('doctor.myProfile', 'My Profile'), link: '/doctor/profile', icon: User },
    { label: t('doctor.consultationHistory', 'Consultation History'), link: '/doctor/consultations', icon: Video },
    { label: t('doctor.myPrescriptions', 'My Prescriptions'), link: '/doctor/prescriptions', icon: FileText },
    { label: t('doctor.earningsReport', 'Earnings Report'), link: '/doctor/earnings', icon: DollarSign },
    { label: t('doctor.schedule', 'My Schedule'), link: '/doctor/schedule', icon: Calendar },
    { label: t('doctor.settings', 'Settings'), link: '/settings', icon: Settings }
  ];

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header skeleton */}
          <div className="mb-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
          
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="h-10 bg-gray-200 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          
          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-white rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-700">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              ×
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {t('common.welcome', 'Welcome')},{' '}
                <span className="text-blue-600">{getDoctorName()}</span>
              </h1>
              <p className="text-gray-600 mt-1">
                {t('doctor.dashboardSubtitle', 'Manage your appointments and consultations')}
              </p>
              
              {/* Rating and specialization */}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                {stats.rating > 0 && (
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.floor(stats.rating)
                            ? 'text-yellow-400 fill-current'
                            : star - 0.5 <= stats.rating
                              ? 'text-yellow-400 fill-current opacity-50'
                              : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-gray-600">
                      {stats.rating.toFixed(1)} ({stats.totalRatings} {t('doctor.reviews', 'reviews')})
                    </span>
                  </div>
                )}
                {user?.specialization && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-600 capitalize">
                      {user.specialization}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            {/* Header actions */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Refresh button */}
              <button
                onClick={() => fetchDashboardData(true)}
                disabled={isRefreshing}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={t('common.refresh', 'Refresh')}
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              
              {/* Notifications */}
              <Link
                to="/notifications"
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative"
                aria-label={t('common.notifications', 'Notifications')}
              >
                <Bell className="h-5 w-5" />
                {/* Notification badge */}
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Link>
              
              {/* Go Live / Start Consultation */}
              <button
                onClick={() => {
                  const waitingPatient = todayAppointments.find(a => 
                    a.status === 'waiting' || a.status === 'checked_in'
                  );
                  if (waitingPatient) {
                    handleAppointmentAction(waitingPatient, 'start');
                  } else {
                    navigate('/consultation');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {stats.waitingRoom > 0 
                    ? t('doctor.startNext', 'Start Next') 
                    : t('doctor.goLive', 'Go Live')}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {statsCards.map((card, index) => (
            <Link
              key={index}
              to={card.link}
              className={`${card.color} border rounded-xl p-4 sm:p-6 hover:shadow-md transition-shadow ${
                card.urgent ? 'ring-2 ring-orange-400 ring-offset-2' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  {card.icon}
                </div>
                {card.change && (
                  <div className="flex items-center text-orange-600 text-xs sm:text-sm font-medium">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {card.change}
                  </div>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{card.value}</h3>
              <p className="text-gray-600 text-sm">{card.title}</p>
            </Link>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                {t('doctor.quickActions', 'Quick Actions')}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`${action.color} text-white rounded-xl p-4 flex flex-col items-center justify-center hover:shadow-lg transition-all text-center`}
                  >
                    {action.icon}
                    <span className="mt-2 text-sm font-medium">{action.title}</span>
                    <span className="text-xs opacity-80 hidden sm:block">{action.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Appointments */}
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  {t('doctor.appointments', 'Appointments')}
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab('today')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'today'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {t('doctor.today', 'Today')} ({todayAppointments.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'upcoming'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {t('doctor.upcoming', 'Upcoming')} ({upcomingAppointments.length})
                  </button>
                </div>
              </div>

              {displayAppointments.length > 0 ? (
                <div className="space-y-3">
                  {displayAppointments.slice(0, 5).map((appointment) => {
                    const id = appointment.id || appointment._id;
                    const patientName = appointment.patient_name || 
                      appointment.patient?.name || 
                      `${appointment.patient?.first_name || ''} ${appointment.patient?.last_name || ''}`.trim() ||
                      t('doctor.patient', 'Patient');
                    const time = appointment.start_time || appointment.time || appointment.slot_time || '';
                    const duration = appointment.duration || 30;
                    const status = appointment.status || 'pending';
                    const reason = appointment.reason || appointment.symptoms || '';

                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {formatName(patientName)}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {time}
                              </span>
                              {duration && (
                                <span className="hidden sm:inline">• {duration} min</span>
                              )}
                            </div>
                            {reason && (
                              <p className="text-xs text-gray-400 truncate mt-1 max-w-xs">
                                {reason}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(status)}`}>
                            {status.replace('_', ' ')}
                          </span>
                          
                          {(status === 'waiting' || status === 'checked_in' || status === 'confirmed') && (
                            <button
                              onClick={() => handleAppointmentAction(appointment, 'start')}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                              <Video className="h-3 w-3" />
                              <span className="hidden sm:inline">{t('doctor.start', 'Start')}</span>
                            </button>
                          )}
                          
                          {/* More options menu */}
                          <div className="relative">
                            <button 
                              onClick={() => setShowMoreMenu(showMoreMenu === id ? null : id)}
                              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              <MoreVertical className="h-4 w-4 text-gray-500" />
                            </button>
                            
                            {showMoreMenu === id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setShowMoreMenu(null)}
                                />
                                <div className="absolute right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-20 py-1">
                                  <button
                                    onClick={() => handleAppointmentAction(appointment, 'viewPatient')}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    {t('doctor.viewPatient', 'View Patient')}
                                  </button>
                                  <button
                                    onClick={() => handleAppointmentAction(appointment, 'reschedule')}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    {t('doctor.reschedule', 'Reschedule')}
                                  </button>
                                  {status !== 'cancelled' && status !== 'completed' && (
                                    <button
                                      onClick={() => handleAppointmentAction(appointment, 'cancel')}
                                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                    >
                                      {t('doctor.cancel', 'Cancel')}
                                    </button>
                                  )}
                                  {status === 'confirmed' && (
                                    <button
                                      onClick={() => handleAppointmentAction(appointment, 'noShow')}
                                      className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50"
                                    >
                                      {t('doctor.markNoShow', 'Mark No-Show')}
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {displayAppointments.length > 5 && (
                    <Link
                      to="/doctor/appointments"
                      className="block text-center py-3 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {t('doctor.viewAll', 'View all')} ({displayAppointments.length})
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <Calendar className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">
                    {activeTab === 'today' 
                      ? t('doctor.noAppointmentsToday', 'No appointments scheduled for today')
                      : t('doctor.noUpcomingAppointments', 'No upcoming appointments')
                    }
                  </p>
                  <Link
                    to="/doctor/schedule"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {t('doctor.manageSchedule', 'Manage your schedule')}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6 lg:space-y-8">
            {/* Availability Status */}
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t('doctor.availability', 'Availability')}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">{t('doctor.currentStatus', 'Status')}</span>
                  <button
                    onClick={handleToggleOnline}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      isOnline 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    {isOnline ? t('doctor.online', 'Online') : t('doctor.offline', 'Offline')}
                  </button>
                </div>
                
                {user?.consultation_fee && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">{t('doctor.consultationFee', 'Consultation Fee')}</span>
                    <span className="font-bold text-gray-900">₹{user.consultation_fee}</span>
                  </div>
                )}
                
                <Link
                  to="/doctor/schedule"
                  className="block w-full mt-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center font-medium"
                >
                  {t('doctor.updateSchedule', 'Update Schedule')}
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t('doctor.recentActivity', 'Recent Activity')}
              </h3>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={activity.id || index} className="flex items-start gap-3">
                      <div className="p-1.5 bg-blue-50 rounded-full flex-shrink-0">
                        <Activity className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900">
                          {activity.action}
                          {activity.patient && (
                            <span className="font-medium"> {formatName(activity.patient)}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  {t('doctor.noRecentActivity', 'No recent activity')}
                </p>
              )}
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t('doctor.quickLinks', 'Quick Links')}
              </h3>
              <div className="space-y-1">
                {quickLinks.map((link, index) => (
                  <Link
                    key={index}
                    to={link.link}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <link.icon className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                      <span className="text-gray-700 group-hover:text-gray-900">{link.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;