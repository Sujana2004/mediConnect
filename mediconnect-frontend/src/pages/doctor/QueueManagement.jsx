import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Play,
  SkipForward,
  Phone,
  Video,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCheck,
  UserX,
  RefreshCw,
  MoreVertical,
  MessageSquare,
  FileText,
  Timer,
  Activity,
  Bell,
  Calendar,
  Loader2
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import {
  getQueue,
  getWaitingQueue,
  callNextPatient,
  performQueueAction,
  requeuePatient,
  getQueueStats,
  completeAppointment,
  markNoShow,
  startAppointment
} from '../../services/api/appointmentService';
import {
  Card,
  Button,
  Badge,
  Avatar,
  Loader,
  EmptyState,
  Modal
} from '../../components/common';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatTimeDisplay = (timeString) => {
  if (!timeString) return '';
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  } catch {
    return timeString;
  }
};

const formatDurationMinutes = (minutes) => {
  if (!minutes || minutes <= 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};

const getErrorMessage = (error, fallback = 'An error occurred') => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;
  return fallback;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const QueueStatsHeader = ({ stats, isRefreshing, onRefresh }) => {
  const { t } = useTranslation();

  const statItems = [
    { label: 'Waiting', value: stats.waiting || 0, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: 'In Progress', value: stats.in_consultation || 0, icon: Activity, color: 'text-blue-600 bg-blue-50' },
    { label: 'Completed', value: stats.completed || 0, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
    { label: 'Skipped', value: stats.skipped || 0, icon: SkipForward, color: 'text-orange-600 bg-orange-50' }
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-600" />
          Queue Overview
        </h2>
        <Button
          variant="ghost" size="sm"
          leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
          onClick={onRefresh} disabled={isRefreshing}
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statItems.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-sm text-gray-500">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {stats.avg_wait_minutes > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <Timer className="w-4 h-4" />
            <span className="text-sm">Avg Wait Time</span>
          </div>
          <span className="font-semibold text-gray-900">
            {formatDurationMinutes(stats.avg_wait_minutes)}
          </span>
        </div>
      )}

      {/* Current patient */}
      {stats.current_patient && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-green-600">
            <Activity className="w-4 h-4" />
            <span className="text-sm font-medium">
              Currently seeing: {stats.current_patient.patient_name} (Queue #{stats.current_patient.queue_number})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Queue Item Component
 * Uses backend AppointmentQueueListSerializer fields:
 * - id, queue_number, patient_name, appointment_time, status, status_display,
 *   wait_time_minutes, estimated_wait_minutes
 */
const QueueItem = ({
  item,
  onCall,
  onSkip,
  onStartConsultation,
  onComplete,
  onRequeue,
  onViewDetails,
  isLoading
}) => {
  const [showActions, setShowActions] = useState(false);

  // Backend queue statuses: waiting, called, in_consultation, completed, skipped
  const statusColors = {
    waiting: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Clock },
    called: { bg: 'bg-blue-50', border: 'border-blue-300 ring-2 ring-blue-100', text: 'text-blue-700', icon: Bell },
    in_consultation: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: Activity },
    completed: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', icon: CheckCircle },
    skipped: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: SkipForward },
  };

  const sc = statusColors[item.status] || statusColors.waiting;
  const StatusIcon = sc.icon;

  return (
    <div className={`relative p-4 rounded-xl border transition-all ${sc.bg} ${sc.border}`}>
      <div className="flex items-center gap-4">
        {/* Queue Number */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-700">{item.queue_number}</span>
        </div>

        {/* Patient Info - using backend serializer fields */}
        <Avatar name={item.patient_name} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 truncate">{item.patient_name}</h4>
            <Badge variant={item.status === 'called' ? 'info' : item.status === 'waiting' ? 'warning' : 'success'} size="sm">
              <StatusIcon className="w-3 h-3 mr-1" />
              {item.status_display || item.status}
            </Badge>
          </div>

          <div className="flex items-center gap-3 mt-1">
            {/* appointment_time from backend */}
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimeDisplay(item.appointment_time)}
            </span>

            {/* wait_time_minutes from backend */}
            {item.wait_time_minutes > 0 && (
              <span className={`text-xs flex items-center gap-1 ${
                item.wait_time_minutes > 30 ? 'text-red-600' : item.wait_time_minutes > 15 ? 'text-amber-600' : 'text-gray-500'
              }`}>
                <Timer className="w-3 h-3" />
                Waiting {item.wait_time_minutes} min
              </span>
            )}

            {/* estimated_wait_minutes from backend */}
            {item.estimated_wait_minutes && item.status === 'waiting' && (
              <span className="text-xs text-gray-400">
                Est {item.estimated_wait_minutes} min
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Call patient if waiting */}
          {item.status === 'waiting' && (
            <Button
              variant="primary" size="sm"
              leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              onClick={() => onCall(item.id)}
              disabled={isLoading}
            >
              Call
            </Button>
          )}

          {/* Start consultation if called */}
          {item.status === 'called' && (
            <Button
              variant="success" size="sm"
              leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              onClick={() => onStartConsultation(item.id)}
              disabled={isLoading}
            >
              Start
            </Button>
          )}

          {/* Complete if in consultation */}
          {item.status === 'in_consultation' && (
            <Button
              variant="success" size="sm"
              leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              onClick={() => onComplete(item.id)}
              disabled={isLoading}
            >
              Complete
            </Button>
          )}

          {/* Requeue if skipped */}
          {item.status === 'skipped' && (
            <Button
              variant="outline" size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => onRequeue(item.id)}
              disabled={isLoading}
            >
              Requeue
            </Button>
          )}

          {/* More Actions */}
          {['waiting', 'called'].includes(item.status) && (
            <div className="relative">
              <Button variant="ghost" size="sm" onClick={() => setShowActions(!showActions)}>
                <MoreVertical className="w-4 h-4" />
              </Button>
              {showActions && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => { onSkip(item.id); setShowActions(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <SkipForward className="w-4 h-4" />
                      Skip Patient
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const QueueManagement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [queueItems, setQueueItems] = useState([]);
  const [queueStats, setQueueStats] = useState({});
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('waiting');

  const tabs = useMemo(() => [
    { id: 'waiting', label: 'Waiting', icon: Clock },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
    { id: 'skipped', label: 'Skipped', icon: SkipForward }
  ], []);

  // ✅ FIXED: Fetch using correct API functions
  const fetchQueueData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      // Fetch queue items and stats in parallel
      const [queueResponse, statsResponse] = await Promise.all([
        getQueue(),
        getQueueStats().catch(() => ({ data: {} }))
      ]);

      // Backend returns: { success, count, data: [...] }
      const items = queueResponse.data || [];
      setQueueItems(items);

      // Stats from backend: { total, waiting, called, in_consultation, completed, skipped, current_patient, avg_wait_minutes }
      setQueueStats(statsResponse.data || {});

    } catch (err) {
      console.error('Error fetching queue:', err);
      setError(getErrorMessage(err, 'Failed to load queue'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchQueueData(); }, [fetchQueueData]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchQueueData(true), 15000);
    return () => clearInterval(interval);
  }, [fetchQueueData]);

  // Filter queue by tab
  const filteredQueue = useMemo(() => {
    if (activeTab === 'waiting') {
      return queueItems.filter(q => ['waiting', 'called', 'in_consultation'].includes(q.status));
    } else if (activeTab === 'completed') {
      return queueItems.filter(q => q.status === 'completed');
    } else if (activeTab === 'skipped') {
      return queueItems.filter(q => q.status === 'skipped');
    }
    return queueItems;
  }, [queueItems, activeTab]);

  // ✅ FIXED: Call next patient - no arguments needed
  const handleCallNext = useCallback(async () => {
    try {
      setIsActionLoading(true);
      await callNextPatient();
      await fetchQueueData(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to call next patient'));
    } finally {
      setIsActionLoading(false);
    }
  }, [fetchQueueData]);

  // ✅ FIXED: Call specific patient using performQueueAction
  const handleCallPatient = useCallback(async (queueId) => {
    try {
      setIsActionLoading(true);
      await performQueueAction(queueId, 'call');
      await fetchQueueData(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to call patient'));
    } finally {
      setIsActionLoading(false);
    }
  }, [fetchQueueData]);

  // ✅ FIXED: Start consultation using performQueueAction
  const handleStartConsultation = useCallback(async (queueId) => {
    try {
      setIsActionLoading(true);
      await performQueueAction(queueId, 'start_consultation');
      await fetchQueueData(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to start consultation'));
    } finally {
      setIsActionLoading(false);
    }
  }, [fetchQueueData]);

  // ✅ FIXED: Complete using performQueueAction
  const handleComplete = useCallback(async (queueId) => {
    try {
      setIsActionLoading(true);
      await performQueueAction(queueId, 'complete');
      await fetchQueueData(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to complete consultation'));
    } finally {
      setIsActionLoading(false);
    }
  }, [fetchQueueData]);

  // ✅ FIXED: Skip using performQueueAction with correct signature
  const handleSkipPatient = useCallback(async (queueId) => {
    try {
      setIsActionLoading(true);
      await performQueueAction(queueId, 'skip');
      await fetchQueueData(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to skip patient'));
    } finally {
      setIsActionLoading(false);
    }
  }, [fetchQueueData]);

  // ✅ FIXED: Requeue using correct API
  const handleRequeue = useCallback(async (queueId) => {
    try {
      setIsActionLoading(true);
      await requeuePatient(queueId);
      await fetchQueueData(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to requeue patient'));
    } finally {
      setIsActionLoading(false);
    }
  }, [fetchQueueData]);

  const handleViewDetails = useCallback((item) => {
    // Navigate to appointment details using appointment_id from queue entry
    if (item.appointment_id) {
      navigate(`/doctor/appointments?detail=${item.appointment_id}`);
    }
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Queue Management</h1>
          <p className="text-gray-500 mt-1">Manage today&apos;s patient queue</p>
        </div>
        <Button
          variant="outline"
          leftIcon={<Calendar className="w-4 h-4" />}
          onClick={() => navigate('/doctor/appointments')}
        >
          All Appointments
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm flex-1">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>Dismiss</Button>
        </div>
      )}

      {/* Stats */}
      <QueueStatsHeader
        stats={queueStats}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchQueueData(true)}
      />

      {/* Queue List */}
      <Card>
        {/* Tabs */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Queue Items */}
        {filteredQueue.length > 0 ? (
          <div className="space-y-3">
            {filteredQueue.map((item) => (
              <QueueItem
                key={item.id}
                item={item}
                onCall={handleCallPatient}
                onSkip={handleSkipPatient}
                onStartConsultation={handleStartConsultation}
                onComplete={handleComplete}
                onRequeue={handleRequeue}
                onViewDetails={handleViewDetails}
                isLoading={isActionLoading}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={activeTab === 'waiting' ? Users : activeTab === 'completed' ? CheckCircle : SkipForward}
            title={
              activeTab === 'waiting' ? 'No patients waiting'
              : activeTab === 'completed' ? 'No completed consultations'
              : 'No skipped patients'
            }
            description={
              activeTab === 'waiting'
                ? 'Patients will appear here after checking in'
                : 'Check other tabs'
            }
          />
        )}

        {/* Call Next Button */}
        {activeTab === 'waiting' && filteredQueue.some(q => q.status === 'waiting') && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <Button
              variant="primary" size="lg" fullWidth
              leftIcon={isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              onClick={handleCallNext}
              loading={isActionLoading}
            >
              Call Next Patient
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default QueueManagement;