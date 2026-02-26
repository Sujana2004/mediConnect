import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  ChevronRight,
  RefreshCw,
  Filter,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  MoreVertical,
  MessageCircle,
  FileText,
  Star,
  CalendarX,
  CalendarClock,
  User,
  IndianRupee,
  ExternalLink,
  WifiOff
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import toast from 'react-hot-toast';

import {
  Card,
  Button,
  Avatar,
  Badge,
  Loader,
  EmptyState,
  Modal,
  Tabs,
  TextArea
} from '../../components/common';
import {
  getAppointments,
  cancelAppointment,
  getUpcomingAppointments
} from '../../services/api/appointmentService';

// ============================================================================
// CONSTANTS
// ============================================================================

const APPOINTMENT_TABS = [
  { id: 'upcoming', labelKey: 'appointments.upcoming' },
  { id: 'past', labelKey: 'appointments.past' },
  { id: 'cancelled', labelKey: 'appointments.cancelled' }
];

const STATUS_CONFIG = {
  pending: {
    color: 'bg-amber-50 text-amber-700 border border-amber-200/50',
    icon: Clock,
    label: 'Pending'
  },
  confirmed: {
    color: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50',
    icon: CheckCircle,
    label: 'Confirmed'
  },
  checked_in: {
    color: 'bg-blue-50 text-blue-700 border border-blue-200/50',
    icon: User,
    label: 'Checked In'
  },
  in_progress: {
    color: 'bg-violet-50 text-violet-700 border border-violet-200/50',
    icon: Play,
    label: 'In Progress'
  },
  completed: {
    color: 'bg-gray-50 text-gray-600 border border-gray-200/50',
    icon: CheckCircle,
    label: 'Completed'
  },
  cancelled: {
    color: 'bg-red-50 text-red-700 border border-red-200/50',
    icon: XCircle,
    label: 'Cancelled'
  },
  no_show: {
    color: 'bg-gray-50 text-gray-500 border border-gray-200/50',
    icon: AlertCircle,
    label: 'No Show'
  },
  rescheduled: {
    color: 'bg-orange-50 text-orange-700 border border-orange-200/50',
    icon: CalendarClock,
    label: 'Rescheduled'
  }
};

const BOOKING_TYPE_CONFIG = {
  online: { icon: Video, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Online' },
  walk_in: { icon: MapPin, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Walk-in' },
  phone: { icon: Phone, color: 'text-green-500', bg: 'bg-green-50', label: 'Phone' },
  follow_up: { icon: FileText, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Follow-up' }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatAppointmentDate = (dateString, t) => {
  if (!dateString) return '';

  try {
    const date = parseISO(dateString);

    if (isToday(date)) {
      return t('common.today', 'Today');
    } else if (isTomorrow(date)) {
      return t('common.tomorrow', 'Tomorrow');
    } else {
      return format(date, 'EEE, MMM d, yyyy');
    }
  } catch {
    return dateString;
  }
};

// ============================================================================
// OFFLINE STATE COMPONENT
// ============================================================================

const OfflineState = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-violet-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">
        {t('common.offline', 'You are offline')}
      </h3>
      <p className="text-gray-400 text-center text-sm">
        {t('common.checkConnection', 'Please check your internet connection')}
      </p>
    </div>
  );
};

// ============================================================================
// APPOINTMENT CARD COMPONENT
// ============================================================================

const AppointmentCard = ({
  appointment,
  onViewDetails,
  onJoin,
  onCancel,
  onReschedule,
  t
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const typeConfig = BOOKING_TYPE_CONFIG[appointment.booking_type] || BOOKING_TYPE_CONFIG.online;
  const TypeIcon = typeConfig.icon;

  const doctorName = appointment.doctor_name || 'Doctor';
  const dateStr = formatAppointmentDate(appointment.appointment_date, t);
  const timeStr = appointment.start_time || '';

  const canJoin = ['confirmed', 'checked_in', 'in_progress'].includes(appointment.status);
  const canCancel = appointment.can_cancel === true;
  const canReschedule = appointment.can_reschedule === true;

  const hasPrescription = !!appointment.prescription_id;

  const handleMenuToggle = useCallback((e) => {
    e.stopPropagation();
    setShowMenu(prev => !prev);
  }, []);

  const handleAction = useCallback((action) => (e) => {
    e.stopPropagation();
    setShowMenu(false);
    action(appointment);
  }, [appointment]);

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:shadow-violet-100/40 transition-all duration-300 cursor-pointer relative group"
      onClick={() => onViewDetails(appointment)}
    >
      {/* Top Row: Status + Menu */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${statusConfig.color}`}>
          <StatusIcon size={12} />
          {appointment.status_display || statusConfig.label}
        </span>

        {(canCancel || canReschedule) && (
          <div className="relative">
            <button
              onClick={handleMenuToggle}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <MoreVertical size={16} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl shadow-black/10 border border-gray-100 py-1.5 z-20 overflow-hidden">
                  {canReschedule && (
                    <button
                      onClick={handleAction(onReschedule)}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-violet-50 flex items-center gap-2.5 font-medium transition-colors"
                    >
                      <CalendarClock size={15} className="text-violet-500" />
                      {t('appointments.reschedule', 'Reschedule')}
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={handleAction(onCancel)}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 font-medium transition-colors"
                    >
                      <CalendarX size={15} />
                      {t('appointments.cancel', 'Cancel')}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Doctor Info */}
      <div className="flex items-center gap-3.5 mb-4">
        <div className="rounded-xl ring-2 ring-violet-100 group-hover:ring-violet-200 transition-colors">
          <Avatar
            name={doctorName}
            size="lg"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate text-sm">
            Dr. {doctorName}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${typeConfig.color} ${typeConfig.bg} px-2 py-0.5 rounded-md`}>
              <TypeIcon size={11} />
              {appointment.booking_type_display || typeConfig.label}
            </span>
          </div>
        </div>

        {appointment.consultation_fee && (
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-gray-400 font-medium">Fee</p>
            <p className="text-base font-extrabold text-violet-600">₹{appointment.consultation_fee}</p>
          </div>
        )}
      </div>

      {/* Details Row */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 mb-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
            <Calendar size={12} className="text-violet-500" />
          </div>
          <span className="font-medium text-xs">{dateStr}</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
            <Clock size={12} className="text-blue-500" />
          </div>
          <span className="font-medium text-xs">{timeStr}</span>
        </div>
      </div>

      {appointment.reason && (
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3 px-1">
          <FileText size={13} className="flex-shrink-0" />
          <span className="truncate">{appointment.reason}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {canJoin && appointment.booking_type === 'online' && (
          <Button
            size="sm"
            onClick={handleAction(onJoin)}
            leftIcon={<Video size={14} />}
            className="flex-1 !rounded-xl !bg-violet-600 hover:!bg-violet-700 !text-xs !font-bold"
          >
            {t('appointments.joinNow', 'Join Now')}
          </Button>
        )}

        <Button
          size="sm"
          variant={canJoin ? 'outline' : 'primary'}
          onClick={handleAction(onViewDetails)}
          rightIcon={<ChevronRight size={14} />}
          className={`${canJoin ? '!border-violet-200 !text-violet-600 hover:!bg-violet-50' : 'flex-1 !bg-violet-600 hover:!bg-violet-700'} !rounded-xl !text-xs !font-bold`}
        >
          {t('common.viewDetails', 'View Details')}
        </Button>
      </div>

      {/* Prescription */}
      {hasPrescription && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100/50">
            <FileText size={14} />
            <span>{t('appointments.prescriptionAvailable', 'Prescription Available')}</span>
          </div>
        </div>
      )}

      {/* Queue info */}
      {appointment.queue_number && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-2 rounded-xl border border-blue-100/50">
            <User size={14} />
            <span>Queue #{appointment.queue_number} - {appointment.queue_status}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CANCEL MODAL COMPONENT
// ============================================================================

const CancelModal = ({ isOpen, onClose, appointment, onConfirm, isLoading, t }) => {
  const [reason, setReason] = useState('');

  const handleConfirm = useCallback(() => {
    onConfirm(appointment.id, reason);
  }, [appointment?.id, reason, onConfirm]);

  const handleClose = useCallback(() => {
    setReason('');
    onClose();
  }, [onClose]);

  if (!appointment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('appointments.cancelAppointment', 'Cancel Appointment')}
      size="sm"
    >
      <div className="py-2">
        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl mb-4 border border-red-100/50">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={20} className="text-red-500" />
          </div>
          <div>
            <p className="font-bold text-red-800 text-sm">
              {t('appointments.cancelWarningTitle', 'Are you sure?')}
            </p>
            <p className="text-xs text-red-600 mt-1">
              {t('appointments.cancelWarningDesc', 'This action cannot be undone.')}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('appointments.cancelReason', 'Reason for cancellation')}
          </label>
          <TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('appointments.cancelReasonPlaceholder', 'Please provide a reason...')}
            rows={3}
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            fullWidth
            disabled={isLoading}
            className="!rounded-xl"
          >
            {t('common.goBack', 'Go Back')}
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            fullWidth
            loading={isLoading}
            className="!rounded-xl"
          >
            {t('appointments.confirmCancel', 'Confirm Cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Appointments = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'upcoming');
  const [cancelModalData, setCancelModalData] = useState(null);

  const {
    data: appointmentsResponse,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['appointments', activeTab],
    queryFn: () => {
      const params = {};

      if (activeTab === 'upcoming') {
        params.upcoming = true;
      } else if (activeTab === 'past') {
        params.status = 'completed';
      } else if (activeTab === 'cancelled') {
        params.status = 'cancelled';
      }

      return getAppointments(params);
    },
    staleTime: 1000 * 60 * 2,
    enabled: isOnline
  });

  const appointments = appointmentsResponse?.data || [];

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => cancelAppointment(id, reason),
    onSuccess: () => {
      toast.success(t('appointments.cancelSuccess', 'Appointment cancelled successfully'));
      setCancelModalData(null);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message ||
        t('appointments.cancelFailed', 'Failed to cancel appointment');
      toast.error(errorMessage);
    }
  });

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  }, [setSearchParams]);

  const handleViewDetails = useCallback((appointment) => {
    navigate(`/patient/appointments/${appointment.id}`);
  }, [navigate]);

  const handleJoin = useCallback((appointment) => {
    navigate(`/patient/consultation/${appointment.id}`);
  }, [navigate]);

  const handleCancel = useCallback((appointment) => {
    setCancelModalData(appointment);
  }, []);

  const handleReschedule = useCallback((appointment) => {
    const doctorId = appointment.doctor_id || appointment.doctor?.id;
    navigate(`/patient/appointments/book/${doctorId}`, {
      state: {
        rescheduleFrom: appointment.id,
      }
    });
  }, [navigate]);

  const handleConfirmCancel = useCallback((id, reason) => {
    cancelMutation.mutate({ id, reason });
  }, [cancelMutation]);

  const tabs = useMemo(() =>
    APPOINTMENT_TABS.map(tab => ({
      ...tab,
      label: t(tab.labelKey, tab.id)
    })),
    [t]
  );

  const emptyStateConfig = useMemo(() => {
    switch (activeTab) {
      case 'upcoming':
        return {
          icon: Calendar,
          title: t('appointments.noUpcoming', 'No upcoming appointments'),
          description: t('appointments.noUpcomingDesc', 'Book an appointment with a doctor'),
          action: (
            <Button onClick={() => navigate('/patient/doctors')} className="!rounded-xl !bg-violet-600 hover:!bg-violet-700">
              {t('appointments.bookNow', 'Book Now')}
            </Button>
          )
        };
      case 'past':
        return {
          icon: CheckCircle,
          title: t('appointments.noPast', 'No past appointments'),
          description: t('appointments.noPastDesc', 'Your completed appointments will appear here')
        };
      case 'cancelled':
        return {
          icon: XCircle,
          title: t('appointments.noCancelled', 'No cancelled appointments'),
          description: t('appointments.noCancelledDesc', 'Your cancelled appointments will appear here')
        };
      default:
        return {
          icon: Calendar,
          title: t('appointments.noAppointments', 'No appointments'),
          description: t('appointments.noAppointmentsDesc', 'You have no appointments')
        };
    }
  }, [activeTab, t, navigate]);

  if (!isOnline) {
    return <OfflineState />;
  }

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-20">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 px-5 pt-5 pb-6 relative overflow-hidden">
          {/* Decorative */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/[0.07]" />
          <div className="absolute top-14 -left-6 w-24 h-24 rounded-full bg-white/[0.05]" />

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">
                {t('appointments.title', 'My Appointments')}
              </h1>
              <p className="text-sm text-violet-200 mt-0.5">
                {t('appointments.subtitle', 'Manage your appointments')}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/25 transition-colors"
              disabled={isLoading}
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-100 shadow-sm px-5 py-3">
          <div className="flex gap-1 p-1 bg-violet-50/60 rounded-2xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200
                  ${activeTab === tab.id
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mb-3">
              <div className="w-7 h-7 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
            <p className="text-sm text-gray-400 font-medium">{t('common.loading', 'Loading...')}</p>
          </div>
        )}

        {isError && !isLoading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-3">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">
                {t('errors.loadingFailed', 'Failed to load')}
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                {t('errors.tryAgain', 'Please try again')}
              </p>
              <Button onClick={() => refetch()} className="!rounded-xl !bg-violet-600 hover:!bg-violet-700 !text-sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('common.retry', 'Retry')}
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !isError && appointments.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
                {(() => {
                  const Icon = emptyStateConfig.icon;
                  return <Icon className="w-8 h-8 text-violet-300" />;
                })()}
              </div>
              <h3 className="font-bold text-gray-900 mb-1">
                {emptyStateConfig.title}
              </h3>
              <p className="text-sm text-gray-400 mb-5 max-w-xs">
                {emptyStateConfig.description}
              </p>
              {emptyStateConfig.action}
            </div>
          </div>
        )}

        {!isLoading && !isError && appointments.length > 0 && (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onViewDetails={handleViewDetails}
                onJoin={handleJoin}
                onCancel={handleCancel}
                onReschedule={handleReschedule}
                t={t}
              />
            ))}
          </div>
        )}

        <div className="h-20" />
      </div>

      {/* Cancel Modal */}
      <CancelModal
        isOpen={!!cancelModalData}
        onClose={() => setCancelModalData(null)}
        appointment={cancelModalData}
        onConfirm={handleConfirmCancel}
        isLoading={cancelMutation.isPending}
        t={t}
      />
    </div>
  );
};

export default Appointments;