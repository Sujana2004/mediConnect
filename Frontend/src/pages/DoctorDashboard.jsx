import React, { useState, useEffect } from 'react';
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
  CheckCircle,
  XCircle,
  MoreVertical,
  User,
  Activity
} from 'lucide-react';
import { doctorAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DoctorDashboard = () => {
  const { t } = useTranslation();
  const tt = (key) => {
    try {
      const val = t(key);
      if (!val || val === key) {
        const parts = key.split('.');
        const last = parts[parts.length - 1];
        const words = last.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_\-]/g, ' ').split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase()+w.slice(1));
        return words.join(' ');
      }
      return val.charAt(0).toUpperCase() + val.slice(1);
    } catch (e) {
      return key;
    }
  };
    const navigate = useNavigate();
    const { user } = useAuth();

    const formatName = (name) => {
      if (!name) return '';
      return name
        .toString()
        .split(/[\s._-]+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    };
  const [activeTab, setActiveTab] = useState('today');
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    waitingRoom: 0,
    earnings: 0,
    rating: 0,
    completedConsultations: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const onBooked = (e) => {
      // simple refresh to update today's appointments count
      fetchDashboardData();
    };
    window.addEventListener('appointmentBooked', onBooked);
    return () => window.removeEventListener('appointmentBooked', onBooked);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const appointmentsRes = await doctorAPI.getDoctorAppointments();
      // Normalize response shapes: backend may return array directly or wrap it
      let appointmentsData = appointmentsRes?.data;
      if (!appointmentsData) appointmentsData = [];
      if (appointmentsData.data) appointmentsData = appointmentsData.data;
      if (appointmentsData.appointments) appointmentsData = appointmentsData.appointments;
      if (!Array.isArray(appointmentsData)) appointmentsData = [];
      setAppointments(appointmentsData);

      // Calculate stats from appointments
      const today = new Date().toISOString().split('T')[0];
      const todayApps = appointmentsData.filter(a => (a.date || a.appointmentDate || a.slotDate) === today);
      const waitingApps = appointmentsData.filter(a => (a.status === 'waiting' || a.status === 'pending'));

      setStats({
        totalPatients: 125,
        todayAppointments: todayApps.length,
        waitingRoom: waitingApps.length,
        earnings: 12500,
        rating: 4.8,
        completedConsultations: 89
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppointmentAction = async (appointmentId, action) => {
    try {
      if (action === 'start') {
        navigate(`/consultation/${appointmentId}`);
      } else if (action === 'cancel') {
        // Cancel appointment logic
        await doctorAPI.updateAppointmentStatus(appointmentId, 'cancelled');
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error handling appointment:', error);
    }
  };

  const statsCards = [
    {
      title: tt('TotalPatients'),
      value: stats.totalPatients,
      icon: <Users className="h-6 w-6 text-blue-600" />,
      change: '+12%',
      color: 'bg-blue-50 border-blue-200'
    },
    {
      title: tt('TodayAppointments'),
      value: stats.todayAppointments,
      icon: <Calendar className="h-6 w-6 text-green-600" />,
      change: '+3',
      color: 'bg-green-50 border-green-200'
    },
    {
      title: tt('WaitingRoom'),
      value: stats.waitingRoom,
      icon: <Clock className="h-6 w-6 text-orange-600" />,
      change: '+2',
      color: 'bg-orange-50 border-orange-200'
    },
    {
      title: tt('MonthlyEarnings'),
      value: `₹${stats.earnings.toLocaleString()}`,
      icon: <DollarSign className="h-6 w-6 text-purple-600" />,
      change: '+18%',
      color: 'bg-purple-50 border-purple-200'
    }
  ];

  const quickActions = [
    {
      title: tt('StartConsultation'),
      icon: <Video className="h-5 w-5" />,
      action: () => navigate('/consultation'),
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: tt('WritePrescription'),
      icon: <FileText className="h-5 w-5" />,
      action: () => navigate('/consultation?prescription=true'),
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: tt('ViewRecords'),
      icon: <FileText className="h-5 w-5" />,
      action: () => navigate('/health-records'),
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: tt('ChatSupport'),
      icon: <MessageSquare className="h-5 w-5" />,
      action: () => navigate('/chatbot'),
      color: 'bg-teal-500 hover:bg-teal-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('welcome')}, <span className="text-blue-600">{formatName(user?.name) || 'Dr. Sharma'}</span>
              </h1>
              <p className="text-gray-600 mt-2">
                {t('DoctorDashboard')}
              </p>
              <div className="flex items-center mt-3">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.floor(stats.rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {stats.rating} ({stats.completedConsultations} {t('consultations')})
                  </span>
                </div>
                <span className="mx-3 text-gray-300">•</span>
                <span className="text-sm text-gray-600">
                  {t('cardiology')}
                </span>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                <Video className="h-4 w-4 mr-2" />
                {t('GoLive')}
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                {t('Notifications')}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((card, index) => (
            <div key={index} className={`${card.color} border rounded-xl p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white rounded-lg">
                  {card.icon}
                </div>
                <div className="flex items-center text-green-600 text-sm">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {card.change}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{card.value}</h3>
              <p className="text-gray-600">{card.title}</p>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow border p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {t('QuickActions')}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className={`${action.color} text-white rounded-xl p-4 flex flex-col items-center justify-center hover:shadow-lg transition-all`}
                  >
                    {action.icon}
                    <span className="mt-2 text-sm text-center">{action.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Appointments */}
            <div className="bg-white rounded-xl shadow border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {t('TodaysAppointments')}
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab('today')}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      activeTab === 'today'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {t('Today')}
                  </button>
                  <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      activeTab === 'upcoming'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {t('Upcoming')}
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.slice(0, 5).map((appointment, index) => {
                    const id = appointment.id || appointment._id || appointment.appointmentId || index;
                    const patientName = appointment.patientName || appointment.patient?.name || appointment.patient?.fullName || t('Patient') || 'Patient';
                    const time = appointment.time || appointment.slot || appointment.startTime || '';
                    const duration = appointment.duration || appointment.length || appointment.slotDuration || 30;
                    const status = appointment.status || appointment.state || 'pending';

                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {patientName}
                            </h4>
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock className="h-3 w-3 mr-1" />
                              {time} {time && '•'} {duration} min
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : status === 'waiting' || status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {status}
                          </span>
                          {(status === 'waiting' || status === 'pending') && (
                            <button
                              onClick={() => handleAppointmentAction(id, 'start')}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                            >
                              {t('Start')}
                            </button>
                          )}
                          <button className="p-1 hover:bg-gray-200 rounded">
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">{t('NoAppointments')}</p>
                  <p className="text-sm text-gray-400">
                    {t('NextAppointment')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Availability Status */}
            <div className="bg-white rounded-xl shadow border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t('Availability')}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">{t('CurrentStatus')}</span>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="font-medium text-green-700">
                      {t('Online')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">{t('ConsultationFee')}</span>
                  <span className="font-bold text-gray-900">₹500</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">{t('NextAvailable')}</span>
                  <span className="font-medium">2:30 PM</span>
                </div>
                <button className="w-full mt-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  {t('UpdateSchedule')}
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t('RecentActivity')}
              </h3>
              <div className="space-y-4">
                {[
                  { time: '10:30 AM', action: t('CompletedConsult'), patient: 'Rahul Verma' },
                  { time: '9:45 AM', action: t('Prescribed'), patient: 'Priya Singh' },
                  { time: 'Yesterday', action: t('ReviewedReport'), patient: 'Amit Patel' },
                  { time: '2 days ago', action: t('UpdatedProfile'), patient: '' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="p-1 bg-blue-50 rounded-full">
                      <Activity className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">
                        {activity.action}
                        {activity.patient && (
                          <span className="font-medium"> {activity.patient}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl shadow border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t('QuickLinks')}
              </h3>
              <div className="space-y-3">
                {[
                  { label: t('MyProfile'), link: '/profile' },
                  { label: t('ConsultationHistory'), link: '/consultation/history' },
                  { label: t('EarningsReport'), link: '/reports/earnings' },
                  { label: t('PatientFeedback'), link: '/feedback' },
                  { label: t('MedicalResources'), link: '/resources' }
                ].map((link, index) => (
                  <Link
                    key={index}
                    to={link.link}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                  >
                    <span className="text-gray-700">{link.label}</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
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