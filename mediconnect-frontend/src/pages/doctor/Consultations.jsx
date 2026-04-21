// src/pages/doctor/Consultations.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Video,
  Phone,
  Calendar,
  Clock,
  Search,
  Filter,
  ChevronRight,
  ChevronLeft,
  FileText,
  RefreshCw,
  User,
  Star,
  MessageSquare,
  Pill,
  Stethoscope,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Eye,
  MoreVertical,
  Activity,
  Timer,
  TrendingUp,
  X,
  Loader2
} from 'lucide-react';
import { 
  format, 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  parseISO,
  differenceInMinutes,
  isToday,
  eachDayOfInterval
} from 'date-fns';
import toast from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth';
import { extractData, extractResults } from '../../utils/apiHelpers';
import { consultationService } from '../../services/api';
import {
  Card,
  Button,
  Badge,
  Avatar,
  Loader,
  EmptyState,
  Modal,
  Select,
  SearchInput
} from '../../components/common';

// ============================================================================
// CONSTANTS
// ============================================================================

const isDev = import.meta.env.DEV;

const STATUS_CONFIG = {
  scheduled: {
    color: 'primary',
    icon: Clock,
    label: 'Scheduled',
    bgColor: 'bg-primary-50',
    textColor: 'text-primary-700'
  },
  waiting_room: {
    color: 'warning',
    icon: Clock,
    label: 'Waiting',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700'
  },
  in_progress: {
    color: 'info',
    icon: Activity,
    label: 'In Progress',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700'
  },
  completed: {
    color: 'success',
    icon: CheckCircle,
    label: 'Completed',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700'
  },
  cancelled: {
    color: 'danger',
    icon: XCircle,
    label: 'Cancelled',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700'
  },
  no_show: {
    color: 'danger',
    icon: XCircle,
    label: 'No Show',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700'
  },
  technical_issue: {
    color: 'warning',
    icon: AlertCircle,
    label: 'Technical Issue',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700'
  }
};

const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'all', label: 'All Time' }
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'waiting_room', label: 'Waiting' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' }
];

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'video', label: 'Video Call' },
  { value: 'audio', label: 'Audio Call' },
  { value: 'chat', label: 'Chat' }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const logger = {
  log: (...args) => isDev && console.log('[Consultations]', ...args),
  error: (...args) => isDev && console.error('[Consultations]', ...args),
};

const getErrorMessage = (error, fallback = 'An error occurred') => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    error?.message ||
    fallback
  );
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), 'h:mm a');
  } catch {
    return '';
  }
};

const formatDate = (dateString, formatStr = 'MMM d, yyyy') => {
  if (!dateString) return '';
  try {
    return format(parseISO(dateString), formatStr);
  } catch {
    return '';
  }
};

const formatDuration = (minutes) => {
  if (!minutes) return '-';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
};

const calculateDuration = (start, end) => {
  if (!start || !end) return null;
  try {
    return differenceInMinutes(new Date(end), new Date(start));
  } catch {
    return null;
  }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Stats Cards Component
 */
const StatsCards = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} padding="sm">
            <div className="animate-pulse">
              <div className="h-8 w-8 bg-gray-200 rounded-lg mb-3" />
              <div className="h-6 w-16 bg-gray-200 rounded mb-1" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: 'Total',
      value: stats?.total || 0,
      icon: Video,
      color: 'bg-primary-50 text-primary-600'
    },
    {
      label: 'Completed',
      value: stats?.completed || 0,
      icon: CheckCircle,
      color: 'bg-green-50 text-green-600'
    },
    {
      label: 'Avg Duration',
      value: stats?.avg_duration ? `${Math.round(stats.avg_duration)}m` : '-',
      icon: Timer,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      label: 'Avg Rating',
      value: stats?.avg_rating ? stats.avg_rating.toFixed(1) : '-',
      icon: Star,
      color: 'bg-amber-50 text-amber-600',
      suffix: stats?.avg_rating ? '⭐' : ''
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card key={item.label} padding="sm">
          <div className="flex items-start justify-between">
            <div className={`p-2 rounded-lg ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">
              {item.value}{item.suffix}
            </p>
            <p className="text-sm text-gray-500">{item.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};

/**
 * Filters Component
 */
const FiltersBar = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  dateRange,
  onDateRangeChange,
  onClearFilters
}) => {
  const hasFilters = searchQuery || statusFilter || typeFilter || dateRange !== 'this_month';

  return (
    <Card padding="md">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Date Range */}
        <Select
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value)}
          options={DATE_RANGE_OPTIONS}
          placeholder=""
        />

        {/* Search */}
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Search by patient name..."
          />
        </div>

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          options={STATUS_FILTER_OPTIONS}
          placeholder=""
        />

        {/* Type Filter */}
        <Select
          value={typeFilter}
          onChange={(e) => onTypeChange(e.target.value)}
          options={TYPE_FILTER_OPTIONS}
          placeholder=""
        />

        {/* Clear Filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            leftIcon={<X className="w-4 h-4" />}
          >
            Clear
          </Button>
        )}
      </div>
    </Card>
  );
};

/**
 * Consultation Card Component
 */
const ConsultationCard = ({ 
  consultation, 
  onView, 
  onViewPatient,
  onRejoin
}) => {
  const [showActions, setShowActions] = useState(false);
  
  const statusConfig = STATUS_CONFIG[consultation.status] || STATUS_CONFIG.completed;
  const StatusIcon = statusConfig.icon;
  const canRejoin = consultation.status === 'in_progress';
  
  const duration = consultation.actual_duration || 
    calculateDuration(consultation.actual_start, consultation.actual_end);

  const patientName = consultation.patient_info?.full_name || 
                      consultation.patient_name ||
                      'Unknown Patient';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Time & Type */}
        <div className="flex-shrink-0 text-center min-w-[80px]">
          <p className="text-lg font-bold text-gray-900">
            {formatTime(consultation.actual_start || consultation.scheduled_start)}
          </p>
          <p className="text-sm text-gray-500">
            {formatDate(consultation.scheduled_start, 'MMM d')}
          </p>
          <div className="flex items-center justify-center gap-1 mt-2">
            {consultation.consultation_type === 'video' ? (
              <Badge variant="primary" size="sm">
                <Video className="w-3 h-3 mr-1" />
                Video
              </Badge>
            ) : consultation.consultation_type === 'audio' ? (
              <Badge variant="secondary" size="sm">
                <Phone className="w-3 h-3 mr-1" />
                Audio
              </Badge>
            ) : (
              <Badge variant="info" size="sm">
                <MessageSquare className="w-3 h-3 mr-1" />
                Chat
              </Badge>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px min-h-[80px] bg-gray-200 flex-shrink-0" />

        {/* Patient Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar
                name={patientName}
                size="md"
              />
              <div>
                <h4 className="font-semibold text-gray-900 truncate">
                  {patientName}
                </h4>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {consultation.patient_info?.age && (
                    <span>{consultation.patient_info.age} yrs</span>
                  )}
                  {consultation.patient_info?.gender && (
                    <>
                      <span>•</span>
                      <span>{consultation.patient_info.gender}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <Badge variant={statusConfig.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Reason */}
          {consultation.reason && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-1">
              {consultation.reason}
            </p>
          )}

          {/* Diagnosis */}
          {consultation.diagnosis && (
            <div className="mt-2 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary-600 flex-shrink-0" />
              <span className="text-sm text-gray-700 line-clamp-1">
                {consultation.diagnosis}
              </span>
            </div>
          )}

          {/* Stats Row */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            {duration && (
              <div className="flex items-center gap-1 text-gray-500">
                <Timer className="w-4 h-4" />
                <span>{duration} min</span>
              </div>
            )}

            {consultation.prescriptions_count > 0 && (
              <div className="flex items-center gap-1 text-gray-500">
                <Pill className="w-4 h-4" />
                <span>{consultation.prescriptions_count} medicines</span>
              </div>
            )}

            {consultation.notes_count > 0 && (
              <div className="flex items-center gap-1 text-gray-500">
                <FileText className="w-4 h-4" />
                <span>{consultation.notes_count} notes</span>
              </div>
            )}

            {consultation.feedback?.overall_rating && (
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                <span>{consultation.feedback.overall_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {canRejoin && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Play className="w-4 h-4" />}
              onClick={() => onRejoin(consultation)}
            >
              Rejoin
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Eye className="w-4 h-4" />}
            onClick={() => onView(consultation)}
          >
            View
          </Button>

          {/* More Actions */}
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
                  onClick={() => setShowActions(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => {
                      onViewPatient(consultation.patient_info?.id || consultation.patient);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    View Patient
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

/**
 * Consultation Details Modal
 */
const ConsultationDetailsModal = ({ 
  isOpen, 
  onClose, 
  consultation,
  onViewPatient
}) => {
  const { t } = useTranslation();

  if (!consultation) return null;

  const statusConfig = STATUS_CONFIG[consultation.status] || STATUS_CONFIG.completed;
  const StatusIcon = statusConfig.icon;
  const duration = consultation.actual_duration || 
    calculateDuration(consultation.actual_start, consultation.actual_end);

  const patientName = consultation.patient_info?.full_name || 
                      consultation.patient_name ||
                      'Unknown Patient';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Consultation Details"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              name={patientName}
              size="xl"
            />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {patientName}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-gray-600">
                {consultation.patient_info?.age && (
                  <span>{consultation.patient_info.age} yrs</span>
                )}
                {consultation.patient_info?.gender && (
                  <>
                    <span>•</span>
                    <span>{consultation.patient_info.gender}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Badge variant={statusConfig.color} size="lg">
            <StatusIcon className="w-4 h-4 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-1">Date</p>
            <p className="font-semibold text-gray-900">
              {formatDate(consultation.scheduled_start, 'MMMM d, yyyy')}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-1">Time</p>
            <p className="font-semibold text-gray-900">
              {formatTime(consultation.actual_start || consultation.scheduled_start)}
              {consultation.actual_end && ` - ${formatTime(consultation.actual_end)}`}
            </p>
          </div>
          {duration && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">Duration</p>
              <p className="font-semibold text-gray-900">
                {duration} minutes
              </p>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-1">Type</p>
            <p className="font-semibold text-gray-900 flex items-center gap-1">
              {consultation.consultation_type === 'video' ? (
                <><Video className="w-4 h-4 text-primary-600" /> Video Call</>
              ) : consultation.consultation_type === 'audio' ? (
                <><Phone className="w-4 h-4 text-primary-600" /> Audio Call</>
              ) : (
                <><MessageSquare className="w-4 h-4 text-primary-600" /> Chat</>
              )}
            </p>
          </div>
        </div>

        {/* Reason */}
        {consultation.reason && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Reason for Visit</h4>
            <p className="text-gray-700 bg-gray-50 rounded-xl p-4">
              {consultation.reason}
            </p>
          </div>
        )}

        {/* Symptoms */}
        {consultation.symptoms && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Symptoms</h4>
            <p className="text-gray-700 bg-gray-50 rounded-xl p-4">
              {consultation.symptoms}
            </p>
          </div>
        )}

        {/* Diagnosis */}
        {consultation.diagnosis && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary-600" />
              Diagnosis
            </h4>
            <p className="text-gray-700 bg-blue-50 rounded-xl p-4 border border-blue-100">
              {consultation.diagnosis}
            </p>
          </div>
        )}

        {/* Follow-up */}
        {consultation.follow_up_required && consultation.follow_up_date && (
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-700 font-medium">
                  Follow-up Scheduled
                </p>
                <p className="text-lg font-semibold text-primary-900">
                  {formatDate(consultation.follow_up_date, 'EEEE, MMMM d, yyyy')}
                </p>
                {consultation.follow_up_notes && (
                  <p className="text-sm text-primary-700 mt-1">
                    {consultation.follow_up_notes}
                  </p>
                )}
              </div>
              <Calendar className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        )}

        {/* Rating */}
        {consultation.feedback?.overall_rating && (
          <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm text-gray-500">Patient Rating</p>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= consultation.feedback.overall_rating
                        ? 'text-amber-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="ml-2 font-semibold text-gray-900">
                  {consultation.feedback.overall_rating.toFixed(1)}
                </span>
              </div>
            </div>
            {consultation.feedback.comments && (
              <div className="flex-1 ml-6">
                <p className="text-sm text-gray-600 italic">
                  "{consultation.feedback.comments}"
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100">
        <Button
          variant="outline"
          leftIcon={<User className="w-4 h-4" />}
          onClick={() => onViewPatient(consultation.patient_info?.id || consultation.patient)}
        >
          View Patient
        </Button>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Consultations = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [dateRange, setDateRange] = useState(searchParams.get('range') || 'this_month');

  // Modal State
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Fetch consultations
   */
  const {
    data: consultationsData,
    isLoading: consultationsLoading,
    isError: consultationsError,
    error: consultationsErrorData,
    refetch: refetchConsultations,
    isRefetching
  } = useQuery({
    queryKey: ['doctorConsultations', statusFilter, typeFilter],
    queryFn: async () => {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      const response = await consultationService.getConsultations(params);
      return extractData(response);
    },
    staleTime: 1000 * 60 * 2,
  });

  /**
   * Fetch stats
   */
  const {
    data: statsData,
    isLoading: statsLoading
  } = useQuery({
    queryKey: ['consultationStats'],
    queryFn: async () => {
      const response = await consultationService.getStats(30);
      return extractData(response);
    },
    staleTime: 1000 * 60 * 5,
  });

  // ============================================================================
  // DERIVED DATA
  // ============================================================================

  const consultations = useMemo(() => {
    return extractResults(consultationsData);
  }, [consultationsData]);

  const stats = useMemo(() => {
    return statsData || {
      total: consultations.length,
      completed: consultations.filter(c => c.status === 'completed').length,
      avg_duration: null,
      avg_rating: null
    };
  }, [statsData, consultations]);

  /**
   * Filter consultations client-side
   */
  const filteredConsultations = useMemo(() => {
    let filtered = [...consultations];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => {
        const patientName = c.patient_info?.full_name || c.patient_name || '';
        const reason = c.reason || '';
        const diagnosis = c.diagnosis || '';
        return (
          patientName.toLowerCase().includes(query) ||
          reason.toLowerCase().includes(query) ||
          diagnosis.toLowerCase().includes(query)
        );
      });
    }

    // Date range filter
    const today = new Date();
    let startDate = null;
    let endDate = today;

    switch (dateRange) {
      case 'today':
        startDate = today;
        break;
      case 'yesterday':
        startDate = subDays(today, 1);
        endDate = subDays(today, 1);
        break;
      case 'this_week':
        startDate = startOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'last_week':
        startDate = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        endDate = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        break;
      case 'this_month':
        startDate = startOfMonth(today);
        break;
      case 'last_month':
        startDate = startOfMonth(subDays(startOfMonth(today), 1));
        endDate = endOfMonth(subDays(startOfMonth(today), 1));
        break;
      case 'all':
      default:
        startDate = null;
        break;
    }

    if (startDate) {
      filtered = filtered.filter(c => {
        const consultDate = new Date(c.scheduled_start);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return consultDate >= start && consultDate <= end;
      });
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.scheduled_start);
      const dateB = new Date(b.scheduled_start);
      return dateB - dateA;
    });

    return filtered;
  }, [consultations, searchQuery, dateRange]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleRefresh = useCallback(() => {
    refetchConsultations();
  }, [refetchConsultations]);

  const handleViewConsultation = useCallback((consultation) => {
    setSelectedConsultation(consultation);
    setShowDetailsModal(true);
  }, []);

  const handleViewPatient = useCallback((patientId) => {
    if (patientId) {
      navigate(`/doctor/patients/${patientId}`);
    } else {
      toast.error('Patient information not available');
    }
  }, [navigate]);

  const handleRejoin = useCallback((consultation) => {
    navigate(`/doctor/consultation/${consultation.id}`);
  }, [navigate]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('');
    setTypeFilter('');
    setDateRange('this_month');
  }, []);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('type', typeFilter);
    if (dateRange !== 'this_month') params.set('range', dateRange);
    setSearchParams(params, { replace: true });
  }, [searchQuery, statusFilter, typeFilter, dateRange, setSearchParams]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Consultations
          </h1>
          <p className="text-gray-500 mt-1">
            View and manage your consultation history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
            disabled={isRefetching}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {consultationsError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm flex-1">
            {getErrorMessage(consultationsErrorData, 'Failed to load consultations')}
          </p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Retry
          </Button>
        </div>
      )}

      {/* Stats */}
      <StatsCards stats={stats} isLoading={statsLoading} />

      {/* Filters */}
      <FiltersBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onClearFilters={handleClearFilters}
      />

      {/* Consultations List */}
      {consultationsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader size="lg" />
        </div>
      ) : filteredConsultations.length > 0 ? (
        <div className="space-y-3">
          {filteredConsultations.map((consultation) => (
            <ConsultationCard
              key={consultation.id}
              consultation={consultation}
              onView={handleViewConsultation}
              onViewPatient={handleViewPatient}
              onRejoin={handleRejoin}
            />
          ))}
        </div>
      ) : (
        <Card padding="lg">
          <EmptyState
            icon={Video}
            title="No Consultations"
            description={
              searchQuery || statusFilter || typeFilter || dateRange !== 'this_month'
                ? 'No consultations match your filters'
                : 'You have no consultation history yet'
            }
            action={
              (searchQuery || statusFilter || typeFilter || dateRange !== 'this_month') && (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )
            }
          />
        </Card>
      )}

      {/* Details Modal */}
      <ConsultationDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedConsultation(null);
        }}
        consultation={selectedConsultation}
        onViewPatient={handleViewPatient}
      />
    </div>
  );
};

export default Consultations;