// src/pages/patient/Appointments.jsx
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
import { appointmentService } from '../../services/api/appointmentService';

// ============================================================================
// CONSTANTS
// ============================================================================

const APPOINTMENT_TABS = [
  { id: 'upcoming', labelKey: 'appointments.upcoming' },
  { id: 'past', labelKey: 'appointments.past' },
  { id: 'cancelled', labelKey: 'appointments.cancelled' }
];

const STATUS_CONFIG = {
  scheduled: {
    color: 'bg-blue-100 text-blue-700',
    icon: Calendar,
    labelKey: 'appointments.status.scheduled'
  },
  confirmed: {
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
    labelKey: 'appointments.status.confirmed'
  },
  waiting: {
    color: 'bg-amber-100 text-amber-700',
    icon: Clock,
    labelKey: 'appointments.status.waiting'
  },
  in_progress: {
    color: 'bg-purple-100 text-purple-700',
    icon: Play,
    labelKey: 'appointments.status.inProgress'
  },
  completed: {
    color: 'bg-gray-100 text-gray-600',
    icon: CheckCircle,
    labelKey: 'appointments.status.completed'
  },
  cancelled: {
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
    labelKey: 'appointments.status.cancelled'
  },
  no_show: {
    color: 'bg-gray-100 text-gray-500',
    icon: AlertCircle,
    labelKey: 'appointments.status.noShow'
  }
};

const CONSULTATION_TYPE_CONFIG = {
  video: { icon: Video, color: 'text-blue-500', labelKey: 'appointments.video' },
  audio: { icon: Phone, color: 'text-green-500', labelKey: 'appointments.audio' },
  in_person: { icon: MapPin, color: 'text-orange-500', labelKey: 'appointments.inPerson' }
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t('common.offline', 'You are offline')}
      </h3>
      <p className="text-gray-500 text-center">
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
  onRate,
  t 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.scheduled;
  const StatusIcon = statusConfig.icon;
  
  const typeConfig = CONSULTATION_TYPE_CONFIG[appointment.consultation_type] || CONSULTATION_TYPE_CONFIG.video;
  const TypeIcon = typeConfig.icon;

  const doctor = appointment.doctor || {};
  const dateStr = formatAppointmentDate(appointment.date, t);
  const timeStr = appointment.time_slot || appointment.start_time || '';

  // Can join if confirmed, waiting, or in_progress
  const canJoin = ['confirmed', 'waiting', 'in_progress'].includes(appointment.status);
  
  // Can cancel if scheduled or confirmed and not past
  const canCancel = ['scheduled', 'confirmed'].includes(appointment.status) && 
                    isFuture(parseISO(appointment.date));
  
  // Can reschedule if scheduled or confirmed and not past
  const canReschedule = ['scheduled', 'confirmed'].includes(appointment.status) && 
                        isFuture(parseISO(appointment.date));
  
  // Can rate if completed and not already rated
  const canRate = appointment.status === 'completed' && !appointment.is_rated;

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
    <Card
      className="p-4 hover:shadow-md transition-all cursor-pointer relative"
      onClick={() => onViewDetails(appointment)}
    >
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-3">
        <Badge className={statusConfig.color}>
          <StatusIcon size={12} className="mr-1" />
          {t(statusConfig.labelKey, appointment.status)}
        </Badge>
        
        {/* More Menu */}
        {(canCancel || canReschedule || canRate) && (
          <div className="relative">
            <button
              onClick={handleMenuToggle}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <MoreVertical size={18} />
            </button>
            
            {showMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                
                {/* Menu */}
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                  {canReschedule && (
                    <button
                      onClick={handleAction(onReschedule)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <CalendarClock size={16} />
                      {t('appointments.reschedule', 'Reschedule')}
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={handleAction(onCancel)}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <CalendarX size={16} />
                      {t('appointments.cancel', 'Cancel')}
                    </button>
                  )}
                  {canRate && (
                    <button
                      onClick={handleAction(onRate)}
                      className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                    >
                      <Star size={16} />
                      {t('appointments.rateDoctor', 'Rate Doctor')}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Doctor Info */}
      <div className="flex items-start gap-3 mb-4">
        <Avatar
          src={doctor.profile_picture}
          name={doctor.full_name || doctor.first_name}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            Dr. {doctor.full_name || `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim()}
          </h3>
          <p className="text-sm text-gray-500 truncate">
            {doctor.specialization_display || doctor.specialization || t('common.generalPhysician', 'General Physician')}
          </p>
        </div>
      </div>

      {/* Appointment Details */}
      <div className="space-y-2 mb-4">
        {/* Date & Time */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar size={16} className="text-gray-400" />
            <span>{dateStr}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock size={16} className="text-gray-400" />
            <span>{timeStr}</span>
          </div>
        </div>

        {/* Consultation Type */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <TypeIcon size={16} className={typeConfig.color} />
          <span>{t(typeConfig.labelKey, appointment.consultation_type)}</span>
        </div>

        {/* Fee */}
        {appointment.consultation_fee && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <IndianRupee size={16} className="text-gray-400" />
            <span>₹{appointment.consultation_fee}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {canJoin && (
          <Button
            size="sm"
            onClick={handleAction(onJoin)}
            leftIcon={<Video size={16} />}
            className="flex-1"
          >
            {t('appointments.joinNow', 'Join Now')}
          </Button>
        )}
        
        <Button
          size="sm"
          variant={canJoin ? 'outline' : 'primary'}
          onClick={handleAction(onViewDetails)}
          rightIcon={<ChevronRight size={16} />}
          className={canJoin ? '' : 'flex-1'}
        >
          {t('common.viewDetails', 'View Details')}
        </Button>
      </div>

      {/* Prescription Available Badge */}
      {appointment.has_prescription && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <FileText size={16} />
            <span>{t('appointments.prescriptionAvailable', 'Prescription Available')}</span>
          </div>
        </div>
      )}
    </Card>
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
      <div className="py-4">
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl mb-4">
          <AlertCircle size={24} className="text-red-500" />
          <div>
            <p className="font-medium text-red-800">
              {t('appointments.cancelWarningTitle', 'Are you sure?')}
            </p>
            <p className="text-sm text-red-600 mt-1">
              {t('appointments.cancelWarningDesc', 'This action cannot be undone.')}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
          >
            {t('common.goBack', 'Go Back')}
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            fullWidth
            loading={isLoading}
          >
            {t('appointments.confirmCancel', 'Confirm Cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// RATE MODAL COMPONENT
// ============================================================================

const RateModal = ({ isOpen, onClose, appointment, onConfirm, isLoading, t }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleConfirm = useCallback(() => {
    if (rating === 0) {
      toast.error(t('appointments.selectRating', 'Please select a rating'));
      return;
    }
    onConfirm(appointment.id, { rating, comment });
  }, [appointment?.id, rating, comment, onConfirm, t]);

  const handleClose = useCallback(() => {
    setRating(0);
    setComment('');
    onClose();
  }, [onClose]);

  if (!appointment) return null;

  const doctor = appointment.doctor || {};

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('appointments.rateYourExperience', 'Rate Your Experience')}
      size="sm"
    >
      <div className="py-4">
        {/* Doctor Info */}
        <div className="flex items-center gap-3 mb-6">
          <Avatar
            src={doctor.profile_picture}
            name={doctor.full_name || doctor.first_name}
            size="lg"
          />
          <div>
            <h4 className="font-semibold text-gray-900">
              Dr. {doctor.full_name || doctor.first_name}
            </h4>
            <p className="text-sm text-gray-500">
              {doctor.specialization_display || doctor.specialization}
            </p>
          </div>
        </div>

        {/* Rating Stars */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
            {t('appointments.howWasExperience', 'How was your experience?')}
          </label>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  size={36}
                  className={
                    star <= rating
                      ? 'text-amber-400 fill-current'
                      : 'text-gray-300'
                  }
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm text-gray-500 mt-2">
              {rating === 5 && t('appointments.ratingExcellent', 'Excellent!')}
              {rating === 4 && t('appointments.ratingGood', 'Good')}
              {rating === 3 && t('appointments.ratingAverage', 'Average')}
              {rating === 2 && t('appointments.ratingPoor', 'Poor')}
              {rating === 1 && t('appointments.ratingBad', 'Bad')}
            </p>
          )}
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('appointments.addComment', 'Add a comment')}
            <span className="text-gray-400 font-normal ml-1">
              ({t('common.optional', 'Optional')})
            </span>
          </label>
          <TextArea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('appointments.commentPlaceholder', 'Share your experience...')}
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            fullWidth
            disabled={isLoading}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            fullWidth
            loading={isLoading}
            disabled={rating === 0}
          >
            {t('appointments.submitRating', 'Submit Rating')}
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

  // ✅ Offline detection - INSIDE the component
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

  // State
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'upcoming');
  const [cancelModalData, setCancelModalData] = useState(null);
  const [rateModalData, setRateModalData] = useState(null);

  // Fetch appointments
  const {
    data: appointmentsData,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['appointments', activeTab],
    queryFn: () => {
      const params = {};
      
      if (activeTab === 'upcoming') {
        params.status = 'scheduled,confirmed,waiting,in_progress';
        params.upcoming = true;
      } else if (activeTab === 'past') {
        params.status = 'completed';
      } else if (activeTab === 'cancelled') {
        params.status = 'cancelled,no_show';
      }
      
      return appointmentService.getAll(params);
    },
    staleTime: 1000 * 60 * 2,
    enabled: isOnline  // ✅ Only fetch when online
  });

  const appointments = appointmentsData?.data?.results || 
                       appointmentsData?.results || 
                       appointmentsData?.data || 
                       appointmentsData || 
                       [];

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => appointmentService.cancel(id, { reason }),
    onSuccess: () => {
      toast.success(t('appointments.cancelSuccess', 'Appointment cancelled successfully'));
      setCancelModalData(null);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('appointments.cancelFailed', 'Failed to cancel appointment'));
    }
  });

  // Rate mutation
  const rateMutation = useMutation({
    mutationFn: ({ id, data }) => appointmentService.submitFeedback(id, data),
    onSuccess: () => {
      toast.success(t('appointments.ratingSuccess', 'Thank you for your feedback!'));
      setRateModalData(null);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('appointments.ratingFailed', 'Failed to submit rating'));
    }
  });

  // Handlers
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
    navigate(`/patient/book/${appointment.doctor?.id || appointment.doctor}`, {
      state: {
        rescheduleFrom: appointment.id,
        doctor: appointment.doctor
      }
    });
  }, [navigate]);

  const handleRate = useCallback((appointment) => {
    setRateModalData(appointment);
  }, []);

  const handleConfirmCancel = useCallback((id, reason) => {
    cancelMutation.mutate({ id, reason });
  }, [cancelMutation]);

  const handleConfirmRate = useCallback((id, data) => {
    rateMutation.mutate({ id, data });
  }, [rateMutation]);

  // Tabs with translated labels
  const tabs = useMemo(() => 
    APPOINTMENT_TABS.map(tab => ({
      ...tab,
      label: t(tab.labelKey, tab.id)
    })),
    [t]
  );

  // Empty state config
  const emptyStateConfig = useMemo(() => {
    switch (activeTab) {
      case 'upcoming':
        return {
          icon: Calendar,
          title: t('appointments.noUpcoming', 'No upcoming appointments'),
          description: t('appointments.noUpcomingDesc', 'Book an appointment with a doctor'),
          action: (
            <Button onClick={() => navigate('/patient/doctors')}>
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

  // ✅ Offline state render - INSIDE the component
  if (!isOnline) {
    return <OfflineState />;
  }

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {t('appointments.title', 'My Appointments')}
              </h1>
              <p className="text-sm text-gray-500">
                {t('appointments.subtitle', 'Manage your appointments')}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all
                  ${activeTab === tab.id
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
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
      <div className="px-4 py-4 sm:px-6">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader size="lg" />
            <p className="text-gray-500 mt-4">{t('common.loading', 'Loading...')}</p>
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <Card className="p-6">
            <EmptyState
              icon={AlertCircle}
              title={t('errors.loadingFailed', 'Failed to load')}
              description={t('errors.tryAgain', 'Please try again')}
              action={
                <Button onClick={() => refetch()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('common.retry', 'Retry')}
                </Button>
              }
            />
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !isError && appointments.length === 0 && (
          <Card className="p-6">
            <EmptyState
              icon={emptyStateConfig.icon}
              title={emptyStateConfig.title}
              description={emptyStateConfig.description}
              action={emptyStateConfig.action}
            />
          </Card>
        )}

        {/* Appointments List */}
        {!isLoading && !isError && appointments.length > 0 && (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onViewDetails={handleViewDetails}
                onJoin={handleJoin}
                onCancel={handleCancel}
                onReschedule={handleReschedule}
                onRate={handleRate}
                t={t}
              />
            ))}
          </div>
        )}

        {/* Bottom Spacing */}
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

      {/* Rate Modal */}
      <RateModal
        isOpen={!!rateModalData}
        onClose={() => setRateModalData(null)}
        appointment={rateModalData}
        onConfirm={handleConfirmRate}
        isLoading={rateMutation.isPending}
        t={t}
      />
    </div>
  );
};

export default Appointments;