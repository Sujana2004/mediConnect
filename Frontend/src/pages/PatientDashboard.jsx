import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, 
  FileText, 
  Pill, 
  Video, 
  Bell, 
  TrendingUp,
  Clock,
  User,
  Shield,
  Heart,
  AlertCircle,
  ChevronRight,
  Download,
  Share2,
  Plus
} from 'lucide-react';
import HealthRecordCard from '../components/health-records/HealthRecordCard';
import { patientAPI, healthRecordsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const PatientDashboard = () => {
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
  const formatName = (name) => {
    if (!name) return '';
    return name
      .toString()
      .split(/[\s._-]+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [appointments, setAppointments] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    upcomingAppointments: 0,
    pendingReports: 0,
    medicinesDue: 0,
    consultationHours: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      // Fetch appointments
      const appointmentsRes = await patientAPI.getUpcomingAppointments();
      setAppointments(appointmentsRes.data.slice(0, 3));
      setStats(prev => ({ ...prev, upcomingAppointments: appointmentsRes.data.length }));

      // Fetch health records
      const recordsRes = await healthRecordsAPI.getRecords();
      setHealthRecords(recordsRes.data.slice(0, 4));
      setStats(prev => ({ ...prev, pendingReports: recordsRes.data.filter(r => r.status === 'pending').length }));

      // Mock data for medicines and consultation hours
      setStats(prev => ({ 
        ...prev, 
        medicinesDue: 2,
        consultationHours: 12 
      }));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dashboardCards = [
    {
      title: tt('dashboard.upcomingAppointments'),
      value: stats.upcomingAppointments,
      icon: <Calendar className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-50 border-blue-200',
      link: '/doctors',
      action: t('dashboard.bookNow')
    },
    {
      title: tt('dashboard.pendingReports'),
      value: stats.pendingReports,
      icon: <FileText className="h-6 w-6 text-purple-600" />,
      color: 'bg-purple-50 border-purple-200',
      link: '/health-records',
      action: t('dashboard.viewAll')
    },
    {
      title: tt('dashboard.medicinesDue'),
      value: stats.medicinesDue,
      icon: <Pill className="h-6 w-6 text-green-600" />,
      color: 'bg-green-50 border-green-200',
      link: '/medicines',
      action: t('dashboard.reorder')
    },
    {
      title: tt('dashboard.consultationHours'),
      value: `${stats.consultationHours}h`,
      icon: <Video className="h-6 w-6 text-red-600" />,
      color: 'bg-red-50 border-red-200',
      link: '/consultation',
      action: t('dashboard.startConsult')
    }
  ];

  const quickActions = [
    {
      title: tt('dashboard.consultNow'),
      description: t('dashboard.consultNowDesc'),
      icon: <Video className="h-8 w-8" />,
      link: '/consultation',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: tt('dashboard.checkSymptoms'),
      description: t('dashboard.checkSymptomsDesc'),
      icon: <Heart className="h-8 w-8" />,
      link: '/symptom-checker',
      color: 'from-green-500 to-teal-600'
    },
    {
      title: tt('dashboard.uploadRecord'),
      description: t('dashboard.uploadRecordDesc'),
      icon: <FileText className="h-8 w-8" />,
      link: '/health-records',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: tt('dashboard.findMedicine'),
      description: t('dashboard.findMedicineDesc'),
      icon: <Pill className="h-8 w-8" />,
      link: '/medicines',
      color: 'from-red-500 to-orange-600'
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
                {t('dashboard.welcome')}, <span className="text-blue-600">{formatName(user?.name) || 'Patient'}</span>
              </h1>
              <p className="text-gray-600 mt-2">
                {t('dashboard.subtitle')}
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                <Video className="h-4 w-4 mr-2" />
                {t('dashboard.emergencyConsult')}
              </button>
              <Link
                to="/profile"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                <User className="h-4 w-4 mr-2" />
                {t('dashboard.profile')}
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {dashboardCards.map((card, index) => (
            <div key={index} className={`${card.color} border rounded-xl p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white rounded-lg">
                  {card.icon}
                </div>
                <TrendingUp className="h-5 w-5 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{card.value}</h3>
              <p className="text-gray-600 mb-4">{card.title}</p>
              <Link
                to={card.link}
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                {card.action}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {t('dashboard.quickActions')}
                </h2>
                <Bell className="h-5 w-5 text-gray-400" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <Link
                    key={index}
                    to={action.link}
                    className={`bg-gradient-to-r ${action.color} text-white rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="mb-4">{action.icon}</div>
                        <h3 className="text-lg font-bold mb-2">{action.title}</h3>
                        <p className="text-white/80 text-sm">{action.description}</p>
                      </div>
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Appointments */}
            <div className="bg-white rounded-xl shadow border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {t('dashboard.upcomingAppointments')}
                </h2>
                <Link
                  to="/doctors"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {t('dashboard.viewAll')}
                </Link>
              </div>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.map((appointment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {appointment.doctorName}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {appointment.specialization} • {appointment.time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          appointment.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800'
                            : appointment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {appointment.status}
                        </span>
                        <Link
                          to={`/consultation/${appointment.roomId}`}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                        >
                          {t('dashboard.join')}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">{t('dashboard.noAppointments')}</p>
                  <Link
                    to="/doctors"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('dashboard.bookAppointment')}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Health Records */}
            <div className="bg-white rounded-xl shadow border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {t('dashboard.recentRecords')}
                </h2>
                <Link
                  to="/health-records"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {t('dashboard.seeAll')}
                </Link>
              </div>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : healthRecords.length > 0 ? (
                <div className="space-y-4">
                  {healthRecords.slice(0, 3).map((record) => (
                    <HealthRecordCard key={record.id} record={record} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm mb-3">{t('dashboard.noRecords')}</p>
                  <Link
                    to="/health-records"
                    className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('dashboard.uploadFirst')}
                  </Link>
                </div>
              )}
            </div>

            {/* Emergency Card */}
            <div className="bg-gradient-to-br from-red-600 to-orange-600 text-white rounded-xl shadow p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-8 w-8 mr-3" />
                <h3 className="text-xl font-bold">{t('dashboard.emergencyCard')}</h3>
              </div>
              <p className="text-red-100 mb-6">
                {t('dashboard.emergencyDesc')}
              </p>
              <div className="space-y-3">
                <Link
                  to="/emergency"
                  className="block w-full bg-white text-red-600 py-3 rounded-lg font-bold text-center hover:bg-red-50 transition-colors"
                >
                  🚨 {t('dashboard.sosButton')}
                </Link>
                <Link
                  to="/doctors"
                  className="block w-full border-2 border-white py-3 rounded-lg font-bold text-center hover:bg-white/10 transition-colors"
                >
                  👨‍⚕️ {t('dashboard.findDoctor')}
                </Link>
              </div>
              <div className="mt-6 pt-4 border-t border-red-400">
                <p className="text-sm text-red-200">
                  📞 {t('dashboard.emergencyNumbers')}
                </p>
              </div>
            </div>

            {/* Health Tips */}
            <div className="bg-white rounded-xl shadow border p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t('dashboard.healthTips')}
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Heart className="h-4 w-4 text-red-500 mr-2" />
                    <span className="font-medium">{t('dashboard.tip1Title')}</span>
                  </div>
                  <p className="text-sm text-gray-600">{t('dashboard.tip1Desc')}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Shield className="h-4 w-4 text-green-500 mr-2" />
                    <span className="font-medium">{t('dashboard.tip2Title')}</span>
                  </div>
                  <p className="text-sm text-gray-600">{t('dashboard.tip2Desc')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;