// src/pages/doctor/QueueManagement.jsx
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
  Search,
  MoreVertical,
  MessageSquare,
  FileText,
  ChevronUp,
  ChevronDown,
  Timer,
  Activity,
  Bell,
  Calendar
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { appointmentService, consultationService } from '../../services/api';
import {
  Card,
  Button,
  Badge,
  Avatar,
  Loader,
  EmptyState,
  Modal,
  SearchInput,
  Tabs
} from '../../components/common';
import { formatTime, formatDuration } from '../../utils/helpers';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Queue Stats Header
const QueueStatsHeader = ({ stats, isRefreshing, onRefresh }) => {
  const { t } = useTranslation();

  const statItems = [
    {
      label: t('doctor.waiting'),
      value: stats.waiting,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50'
    },
    {
      label: t('doctor.inProgress'),
      value: stats.inProgress,
      icon: Activity,
      color: 'text-blue-600 bg-blue-50'
    },
    {
      label: t('status.completed'),
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-50'
    },
    {
      label: t('doctor.noShow'),
      value: stats.noShow,
      icon: UserX,
      color: 'text-red-600 bg-red-50'
    }
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-600" />
          {t('doctor.queueOverview')}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {t('common.refresh')}
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

      {/* Average Wait Time */}
      {stats.avgWaitTime > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <Timer className="w-4 h-4" />
            <span className="text-sm">{t('doctor.avgWaitTime')}</span>
          </div>
          <span className="font-semibold text-gray-900">
            {formatDuration(stats.avgWaitTime)}
          </span>
        </div>
      )}
    </div>
  );
};

// Current Patient Card
const CurrentPatientCard = ({ patient, onComplete, onAddNotes, onViewRecords, isLoading }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer for elapsed consultation time
  useEffect(() => {
    if (!patient?.started_at) return;

    const startTime = new Date(patient.started_at).getTime();
    
    const updateElapsed = () => {
      const now = Date.now();
      setElapsedTime(Math.floor((now - startTime) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [patient?.started_at]);

  const formatElapsedTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  if (!patient) {
    return (
      <Card className="border-2 border-dashed border-gray-200">
        <EmptyState
          icon={UserCheck}
          title={t('doctor.noActiveConsultation')}
          description={t('doctor.callNextPatientToStart')}
          compact
        />
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-green-500 bg-green-50/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-600" />
          {t('doctor.currentConsultation')}
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1 bg-green-100 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-700">
              {formatElapsedTime(elapsedTime)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <Avatar
          name={patient.patient_name}
          src={patient.patient_avatar}
          size="xl"
        />
        
        <div className="flex-1">
          <h4 className="text-xl font-semibold text-gray-900">
            {patient.patient_name}
          </h4>
          <p className="text-gray-600 mt-1">
            {patient.reason || t('doctor.generalConsultation')}
          </p>
          
          <div className="flex flex-wrap items-center gap-3 mt-3">
            {patient.patient_age && (
              <span className="text-sm text-gray-500">
                {patient.patient_age} {t('common.years')}
              </span>
            )}
            {patient.patient_gender && (
              <span className="text-sm text-gray-500">
                {t(`common.${patient.patient_gender}`)}
              </span>
            )}
            <Badge variant={patient.consultation_type === 'video' ? 'primary' : 'secondary'}>
              {patient.consultation_type === 'video' ? (
                <><Video className="w-3 h-3 mr-1" /> Video</>
              ) : (
                <><Phone className="w-3 h-3 mr-1" /> Audio</>
              )}
            </Badge>
          </div>

          {/* Patient Notes */}
          {patient.notes && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">{patient.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mt-6">
        <Button
          variant="primary"
          leftIcon={<Video className="w-4 h-4" />}
          onClick={() => navigate(`/doctor/consultation/${patient.consultation_id}`)}
        >
          {t('doctor.joinConsultation')}
        </Button>
        <Button
          variant="outline"
          leftIcon={<FileText className="w-4 h-4" />}
          onClick={() => onViewRecords(patient.patient_id)}
        >
          {t('doctor.viewRecords')}
        </Button>
        <Button
          variant="outline"
          leftIcon={<MessageSquare className="w-4 h-4" />}
          onClick={() => onAddNotes(patient)}
        >
          {t('doctor.addNotes')}
        </Button>
        <Button
          variant="success"
          leftIcon={<CheckCircle className="w-4 h-4" />}
          onClick={() => onComplete(patient)}
          loading={isLoading}
          className="ml-auto"
        >
          {t('doctor.completeConsultation')}
        </Button>
      </div>
    </Card>
  );
};

// Queue Item Component
const QueueItem = ({ 
  item, 
  position, 
  onCall, 
  onSkip, 
  onNoShow, 
  onMoveUp, 
  onMoveDown,
  onViewDetails,
  isFirst,
  isLast,
  isLoading 
}) => {
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);

  const handleCloseActions = useCallback(() => {
    setShowActions(false);
  }, []);

  const getWaitTime = useCallback(() => {
    if (!item.checked_in_at) return null;
    const checkedIn = new Date(item.checked_in_at).getTime();
    const now = Date.now();
    return Math.floor((now - checkedIn) / 60000); // minutes
  }, [item.checked_in_at]);

  const waitTime = getWaitTime();

  const getStatusConfig = useCallback(() => {
    const configs = {
      waiting: { 
        color: 'warning', 
        icon: Clock, 
        label: t('doctor.waiting'),
        bgColor: 'bg-amber-50'
      },
      called: { 
        color: 'info', 
        icon: Bell, 
        label: t('doctor.called'),
        bgColor: 'bg-blue-50'
      },
      in_consultation: { 
        color: 'success', 
        icon: Activity, 
        label: t('doctor.inProgress'),
        bgColor: 'bg-green-50'
      }
    };
    return configs[item.status] || configs.waiting;
  }, [item.status, t]);

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className={`relative p-4 rounded-xl border transition-all ${statusConfig.bgColor} ${
      item.status === 'called' ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
    }`}>
      <div className="flex items-center gap-4">
        {/* Position Number */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-700">{position}</span>
        </div>

        {/* Patient Info */}
        <Avatar
          name={item.patient_name}
          src={item.patient_avatar}
          size="md"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 truncate">
              {item.patient_name}
            </h4>
            <Badge variant={statusConfig.color} size="sm">
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 truncate mt-0.5">
            {item.reason || t('doctor.generalConsultation')}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(item.scheduled_time)}
            </span>
            {waitTime !== null && (
              <span className={`text-xs flex items-center gap-1 ${
                waitTime > 30 ? 'text-red-600' : waitTime > 15 ? 'text-amber-600' : 'text-gray-500'
              }`}>
                <Timer className="w-3 h-3" />
                {t('doctor.waitingFor', { minutes: waitTime })}
              </span>
            )}
            <Badge variant={item.consultation_type === 'video' ? 'primary' : 'secondary'} size="sm">
              {item.consultation_type === 'video' ? (
                <Video className="w-3 h-3" />
              ) : (
                <Phone className="w-3 h-3" />
              )}
            </Badge>
          </div>
        </div>

        {/* Reorder Buttons (Desktop) */}
        <div className="hidden md:flex flex-col gap-1">
          <button
            onClick={() => onMoveUp(item.id)}
            disabled={isFirst}
            className={`p-1 rounded hover:bg-white transition-colors ${
              isFirst ? 'opacity-30 cursor-not-allowed' : ''
            }`}
          >
            <ChevronUp className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => onMoveDown(item.id)}
            disabled={isLast}
            className={`p-1 rounded hover:bg-white transition-colors ${
              isLast ? 'opacity-30 cursor-not-allowed' : ''
            }`}
          >
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {item.status === 'waiting' && position === 1 && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Play className="w-4 h-4" />}
              onClick={() => onCall(item.id)}
              loading={isLoading}
            >
              {t('doctor.call')}
            </Button>
          )}
          
          {item.status === 'called' && (
            <Button
              variant="success"
              size="sm"
              leftIcon={<Video className="w-4 h-4" />}
              onClick={() => onCall(item.id)}
              loading={isLoading}
            >
              {t('doctor.start')}
            </Button>
          )}

          {/* More Actions Dropdown */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActions(!showActions)}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>

            {showActions && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={handleCloseActions}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => {
                      onViewDetails(item);
                      handleCloseActions();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {t('doctor.viewDetails')}
                  </button>
                  <button
                    onClick={() => {
                      onSkip(item.id);
                      handleCloseActions();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <SkipForward className="w-4 h-4" />
                    {t('doctor.skipPatient')}
                  </button>
                  <button
                    onClick={() => {
                      onNoShow(item.id);
                      handleCloseActions();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <UserX className="w-4 h-4" />
                    {t('doctor.markNoShow')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Patient Details Modal
const PatientDetailsModal = ({ isOpen, onClose, patient }) => {
  const { t } = useTranslation();

  if (!patient) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('doctor.patientDetails')}
      size="md"
    >
      <div className="space-y-6">
        {/* Patient Header */}
        <div className="flex items-center gap-4">
          <Avatar
            name={patient.patient_name}
            src={patient.patient_avatar}
            size="xl"
          />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {patient.patient_name}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-gray-600">
              {patient.patient_age && (
                <span>{patient.patient_age} {t('common.years')}</span>
              )}
              {patient.patient_gender && (
                <>
                  <span>•</span>
                  <span>{t(`common.${patient.patient_gender}`)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Appointment Details */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h4 className="font-medium text-gray-900">{t('doctor.appointmentDetails')}</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">{t('common.time')}</p>
              <p className="font-medium">{formatTime(patient.scheduled_time)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('common.type')}</p>
              <p className="font-medium flex items-center gap-1">
                {patient.consultation_type === 'video' ? (
                  <><Video className="w-4 h-4" /> {t('common.videoCall')}</>
                ) : (
                  <><Phone className="w-4 h-4" /> {t('common.audioCall')}</>
                )}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500">{t('common.reason')}</p>
              <p className="font-medium">{patient.reason || t('doctor.generalConsultation')}</p>
            </div>
          </div>
        </div>

        {/* Patient Notes */}
        {patient.notes && (
          <div className="bg-amber-50 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              {t('doctor.patientNotes')}
            </h4>
            <p className="text-gray-700">{patient.notes}</p>
          </div>
        )}

        {/* Symptoms */}
        {patient.symptoms && patient.symptoms.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">{t('common.symptoms')}</h4>
            <div className="flex flex-wrap gap-2">
              {patient.symptoms.map((symptom, index) => (
                <Badge key={index} variant="secondary">
                  {symptom}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Previous Consultations */}
        {patient.previous_consultations > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="text-blue-700">
              {t('doctor.previousConsultations', { count: patient.previous_consultations })}
            </span>
            <Button variant="link" size="sm">
              {t('common.view')}
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.close')}
        </Button>
        <Button
          variant="primary"
          leftIcon={<FileText className="w-4 h-4" />}
        >
          {t('doctor.viewFullRecords')}
        </Button>
      </div>
    </Modal>
  );
};

// Complete Consultation Modal
const CompleteConsultationModal = ({ isOpen, onClose, patient, onComplete, isLoading }) => {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDays, setFollowUpDays] = useState(7);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNotes('');
      setFollowUpRequired(false);
      setFollowUpDays(7);
    }
  }, [isOpen]);

  const handleComplete = useCallback(() => {
    onComplete({
      notes,
      follow_up_required: followUpRequired,
      follow_up_days: followUpRequired ? followUpDays : null
    });
  }, [notes, followUpRequired, followUpDays, onComplete]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('doctor.completeConsultation')}
      size="md"
    >
      <div className="space-y-6">
        {/* Patient Info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Avatar
            name={patient?.patient_name}
            src={patient?.patient_avatar}
            size="md"
          />
          <div>
            <p className="font-medium text-gray-900">{patient?.patient_name}</p>
            <p className="text-sm text-gray-500">
              {patient?.reason || t('doctor.generalConsultation')}
            </p>
          </div>
        </div>

        {/* Consultation Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('doctor.consultationNotes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder={t('doctor.enterConsultationNotes')}
          />
        </div>

        {/* Follow-up Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="font-medium text-gray-900">{t('doctor.followUpRequired')}</p>
            <p className="text-sm text-gray-500">{t('doctor.scheduleFollowUp')}</p>
          </div>
          <button
            onClick={() => setFollowUpRequired(!followUpRequired)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              followUpRequired ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                followUpRequired ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Follow-up Days */}
        {followUpRequired && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('doctor.followUpAfter')}
            </label>
            <div className="flex items-center gap-3">
              {[3, 7, 14, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => setFollowUpDays(days)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    followUpDays === days
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {days} {t('common.days')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="success"
          leftIcon={<CheckCircle className="w-4 h-4" />}
          onClick={handleComplete}
          loading={isLoading}
        >
          {t('doctor.markComplete')}
        </Button>
      </div>
    </Modal>
  );
};

// Notes Modal
const NotesModal = ({ isOpen, onClose, patient, onSave, isLoading }) => {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNotes(patient?.notes || '');
    }
  }, [patient, isOpen]);

  const handleSave = useCallback(() => {
    onSave(notes);
  }, [notes, onSave]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('doctor.consultationNotes')}
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Avatar
            name={patient?.patient_name}
            src={patient?.patient_avatar}
            size="md"
          />
          <div>
            <p className="font-medium text-gray-900">{patient?.patient_name}</p>
            <p className="text-sm text-gray-500">
              {patient?.reason || t('doctor.generalConsultation')}
            </p>
          </div>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder={t('doctor.enterNotesPlaceholder')}
          autoFocus
        />
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={isLoading}
        >
          {t('common.save')}
        </Button>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const QueueManagement = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('waiting');

  // Modals
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesPatient, setNotesPatient] = useState(null);

  // Tabs
  const tabs = useMemo(() => [
    { id: 'waiting', label: t('doctor.waiting'), icon: Clock },
    { id: 'completed', label: t('status.completed'), icon: CheckCircle },
    { id: 'no_show', label: t('doctor.noShow'), icon: UserX }
  ], [t]);

  // Fetch queue data
  const fetchQueueData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      
      setError(null);

      const response = await appointmentService.getWaitingQueue();
      const queueData = response.data?.results || response.data || [];
      setQueue(queueData);
      
      // Find current in-progress consultation
      const inProgress = queueData.find(q => q.status === 'in_consultation');
      setCurrentPatient(inProgress || null);

    } catch (err) {
      console.error('Error fetching queue:', err);
      setError(t('errors.failedToLoadQueue'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  // Initial load
  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQueueData(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchQueueData]);

  // Computed values
  const stats = useMemo(() => {
    const waiting = queue.filter(q => ['waiting', 'called'].includes(q.status)).length;
    const inProgress = queue.filter(q => q.status === 'in_consultation').length;
    const completed = queue.filter(q => q.status === 'completed').length;
    const noShow = queue.filter(q => q.status === 'no_show').length;

    // Calculate average wait time for waiting patients
    const waitingPatients = queue.filter(q => q.status === 'waiting' && q.checked_in_at);
    let avgWaitTime = 0;
    if (waitingPatients.length > 0) {
      const totalWait = waitingPatients.reduce((acc, p) => {
        const checkedIn = new Date(p.checked_in_at).getTime();
        return acc + (Date.now() - checkedIn);
      }, 0);
      avgWaitTime = Math.floor(totalWait / waitingPatients.length / 60000); // minutes
    }

    return { waiting, inProgress, completed, noShow, avgWaitTime };
  }, [queue]);

  const filteredQueue = useMemo(() => {
    let filtered = queue;

    // Filter by tab
    if (activeTab === 'waiting') {
      filtered = filtered.filter(q => ['waiting', 'called'].includes(q.status));
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(q => q.status === 'completed');
    } else if (activeTab === 'no_show') {
      filtered = filtered.filter(q => q.status === 'no_show');
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.patient_name?.toLowerCase().includes(query) ||
        q.reason?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [queue, activeTab, searchQuery]);

  // Handlers
  const handleCallPatient = useCallback(async (queueItemId) => {
    try {
      setIsActionLoading(true);
      
      const response = await appointmentService.callNextPatient(queueItemId);
      
      // If consultation created, navigate to it
      if (response.data?.consultation_id) {
        navigate(`/doctor/consultation/${response.data.consultation_id}`);
      } else {
        // Refresh queue
        await fetchQueueData(true);
      }
    } catch (err) {
      console.error('Error calling patient:', err);
      setError(t('errors.failedToCallPatient'));
    } finally {
      setIsActionLoading(false);
    }
  }, [navigate, fetchQueueData, t]);

  const handleSkipPatient = useCallback(async (queueItemId) => {
    try {
      setIsActionLoading(true);
      await appointmentService.performQueueAction(queueItemId, { action: 'skip' });
      await fetchQueueData(true);
    } catch (err) {
      console.error('Error skipping patient:', err);
      setError(t('errors.failedToSkipPatient'));
    } finally {
      setIsActionLoading(false);
    }
  }, [fetchQueueData, t]);

  const handleMarkNoShow = useCallback(async (queueItemId) => {
    try {
      setIsActionLoading(true);
      await appointmentService.performQueueAction(queueItemId, { action: 'no_show' });
      await fetchQueueData(true);
    } catch (err) {
      console.error('Error marking no show:', err);
      setError(t('errors.failedToMarkNoShow'));
    } finally {
      setIsActionLoading(false);
    }
  }, [fetchQueueData, t]);

  const handleMoveUp = useCallback(async (queueItemId) => {
    try {
      await appointmentService.performQueueAction(queueItemId, { action: 'move_up' });
      await fetchQueueData(true);
    } catch (err) {
      console.error('Error moving patient up:', err);
    }
  }, [fetchQueueData]);

  const handleMoveDown = useCallback(async (queueItemId) => {
    try {
      await appointmentService.performQueueAction(queueItemId, { action: 'move_down' });
      await fetchQueueData(true);
    } catch (err) {
      console.error('Error moving patient down:', err);
    }
  }, [fetchQueueData]);

  const handleViewDetails = useCallback((patient) => {
    setSelectedPatient(patient);
    setShowDetailsModal(true);
  }, []);

  const handleCompleteConsultation = useCallback(async (data) => {
    try {
      setIsActionLoading(true);
      await appointmentService.completeAppointment(currentPatient.appointment_id, data);
      setShowCompleteModal(false);
      setCurrentPatient(null);
      await fetchQueueData(true);
    } catch (err) {
      console.error('Error completing consultation:', err);
      setError(t('errors.failedToCompleteConsultation'));
    } finally {
      setIsActionLoading(false);
    }
  }, [currentPatient, fetchQueueData, t]);

  const handleAddNotes = useCallback((patient) => {
    setNotesPatient(patient);
    setShowNotesModal(true);
  }, []);

  const handleSaveNotes = useCallback(async (notes) => {
    try {
      setIsActionLoading(true);
      await consultationService.addConsultationNote(notesPatient.consultation_id, { 
        content: notes,
        note_type: 'general'
      });
      setShowNotesModal(false);
      setNotesPatient(null);
      await fetchQueueData(true);
    } catch (err) {
      console.error('Error saving notes:', err);
      setError(t('errors.failedToSaveNotes'));
    } finally {
      setIsActionLoading(false);
    }
  }, [notesPatient, fetchQueueData, t]);

  const handleViewRecords = useCallback((patientId) => {
    navigate(`/doctor/patients/${patientId}`);
  }, [navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('doctor.queueManagement')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('doctor.queueManagementDesc')}
          </p>
        </div>
        <Button
          variant="outline"
          leftIcon={<Calendar className="w-4 h-4" />}
          onClick={() => navigate('/doctor/appointments')}
        >
          {t('doctor.viewAllAppointments')}
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-auto"
          >
            {t('common.dismiss')}
          </Button>
        </div>
      )}

      {/* Queue Stats */}
      <QueueStatsHeader
        stats={stats}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchQueueData(true)}
      />

      {/* Current Patient */}
      <CurrentPatientCard
        patient={currentPatient}
        onComplete={() => setShowCompleteModal(true)}
        onAddNotes={handleAddNotes}
        onViewRecords={handleViewRecords}
        isLoading={isActionLoading}
      />

      {/* Queue List */}
      <Card>
        {/* Header with Search and Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="pills"
          />
          
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('doctor.searchPatients')}
            className="w-full md:w-64"
          />
        </div>

        {/* Queue Items */}
        {filteredQueue.length > 0 ? (
          <div className="space-y-3">
            {filteredQueue.map((item, index) => (
              <QueueItem
                key={item.id}
                item={item}
                position={index + 1}
                onCall={handleCallPatient}
                onSkip={handleSkipPatient}
                onNoShow={handleMarkNoShow}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onViewDetails={handleViewDetails}
                isFirst={index === 0}
                isLast={index === filteredQueue.length - 1}
                isLoading={isActionLoading}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={activeTab === 'waiting' ? Users : activeTab === 'completed' ? CheckCircle : UserX}
            title={
              activeTab === 'waiting' 
                ? t('doctor.noWaitingPatients')
                : activeTab === 'completed'
                ? t('doctor.noCompletedToday')
                : t('doctor.noNoShows')
            }
            description={
              activeTab === 'waiting'
                ? t('doctor.queueEmptyDesc')
                : t('doctor.checkOtherTabs')
            }
          />
        )}

        {/* Call Next Button (Fixed at bottom on mobile) */}
        {activeTab === 'waiting' && filteredQueue.length > 0 && !currentPatient && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={<Play className="w-5 h-5" />}
              onClick={() => handleCallPatient(filteredQueue[0]?.id)}
              loading={isActionLoading}
            >
              {t('doctor.callNextPatient')}
            </Button>
          </div>
        )}
      </Card>

      {/* Modals */}
      <PatientDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedPatient(null);
        }}
        patient={selectedPatient}
      />

      <CompleteConsultationModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        patient={currentPatient}
        onComplete={handleCompleteConsultation}
        isLoading={isActionLoading}
      />

      <NotesModal
        isOpen={showNotesModal}
        onClose={() => {
          setShowNotesModal(false);
          setNotesPatient(null);
        }}
        patient={notesPatient}
        onSave={handleSaveNotes}
        isLoading={isActionLoading}
      />
    </div>
  );
};

export default QueueManagement;