// src/pages/doctor/Consultations.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Download,
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
  BarChart3,
  CalendarDays,
  X,
  ExternalLink,
  Printer,
  Share2,
  History,
  ClipboardList,
  Loader2
} from 'lucide-react';
import { 
  format, 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  isToday,
  parseISO,
  differenceInMinutes,
  eachDayOfInterval
} from 'date-fns';
import toast from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth';
import { consultationService } from '../../services/api';
import {
  Card,
  Button,
  Badge,
  Avatar,
  Loader,
  EmptyState,
  Modal,
  Select
} from '../../components/common';

// ============================================================================
// CONSTANTS
// ============================================================================

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
    label: 'Waiting Room',
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
  { value: 'custom', label: 'Custom Range' }
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'waiting_room', label: 'Waiting Room' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
  { value: 'technical_issue', label: 'Technical Issue' }
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

const formatTime = (dateString) => {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), 'h:mm a');
  } catch {
    return dateString;
  }
};

const formatDate = (dateString, formatStr = 'MMM d, yyyy') => {
  if (!dateString) return '';
  try {
    return format(parseISO(dateString), formatStr);
  } catch {
    return dateString;
  }
};

const formatDuration = (minutes) => {
  if (!minutes) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
};

const calculateDuration = (start, end) => {
  if (!start || !end) return null;
  try {
    return differenceInMinutes(new Date(end), new Date(start));
  } catch {
    return null;
  }
};

const getErrorMessage = (error, fallbackMessage = 'An error occurred') => {
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return fallbackMessage;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Stats Cards Component
 */
const StatsCards = ({ stats }) => {
  const { t } = useTranslation();

  const statItems = [
    {
      label: 'Total Consultations',
      value: stats?.total || 0,
      icon: Video,
      color: 'bg-primary-50 text-primary-600',
      trend: stats?.totalTrend
    },
    {
      label: 'Completed',
      value: stats?.completed || 0,
      icon: CheckCircle,
      color: 'bg-green-50 text-green-600',
      trend: stats?.completedTrend
    },
    {
      label: 'Avg Duration',
      value: stats?.avgDuration ? `${stats.avgDuration}m` : 'N/A',
      icon: Timer,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      label: 'Avg Rating',
      value: stats?.avgRating ? stats.avgRating.toFixed(1) : 'N/A',
      icon: Star,
      color: 'bg-amber-50 text-amber-600',
      suffix: stats?.avgRating ? '⭐' : ''
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
            {item.trend !== undefined && (
              <div className={`flex items-center gap-1 text-xs ${
                item.trend >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className={`w-3 h-3 ${item.trend < 0 ? 'rotate-180' : ''}`} />
                {Math.abs(item.trend)}%
              </div>
            )}
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
 * Date Range Selector Component
 */
const DateRangeSelector = ({ 
  dateRange, 
  onDateRangeChange, 
  customStartDate,
  customEndDate,
  onOpenCalendar
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={dateRange}
        onChange={(e) => onDateRangeChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
      >
        {DATE_RANGE_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {dateRange === 'custom' && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenCalendar('start')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <CalendarDays className="w-4 h-4" />
            {customStartDate ? format(customStartDate, 'MMM d, yyyy') : 'Start Date'}
          </button>
          <span className="text-gray-400">—</span>
          <button
            onClick={() => onOpenCalendar('end')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <CalendarDays className="w-4 h-4" />
            {customEndDate ? format(customEndDate, 'MMM d, yyyy') : 'End Date'}
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Filters Bar Component
 */
const FiltersBar = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  onClearFilters
}) => {
  const { t } = useTranslation();
  const hasFilters = searchQuery || statusFilter || typeFilter;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search consultations..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>
      
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
      >
        {STATUS_FILTER_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      
      <select
        value={typeFilter}
        onChange={(e) => onTypeChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
      >
        {TYPE_FILTER_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

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
  );
};

/**
 * Consultation Card Component
 */
const ConsultationCard = ({ 
  consultation, 
  onView, 
  onViewPatient,
  onViewPrescription,
  onDownloadSummary,
  onRejoin
}) => {
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);

  const statusConfig = STATUS_CONFIG[consultation.status] || STATUS_CONFIG.completed;
  const StatusIcon = statusConfig.icon;

  const canRejoin = consultation.status === 'in_progress';
  
  // Calculate duration
  const duration = consultation.actual_duration || 
    calculateDuration(consultation.actual_start, consultation.actual_end);

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow`}>
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
                name={consultation.patient_info?.full_name}
                size="md"
              />
              <div>
                <h4 className="font-semibold text-gray-900 truncate">
                  {consultation.patient_info?.full_name}
                </h4>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {consultation.patient_info?.age && (
                    <span>{consultation.patient_info.age}</span>
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
              <Stethoscope className="w-4 h-4 text-primary-600" />
              <span className="text-sm text-gray-700 line-clamp-1">
                {consultation.diagnosis}
              </span>
            </div>
          )}

          {/* Stats Row */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            {/* Duration */}
            {duration && (
              <div className="flex items-center gap-1 text-gray-500">
                <Timer className="w-4 h-4" />
                <span>{duration} min</span>
              </div>
            )}

            {/* Prescriptions */}
            {consultation.prescriptions?.length > 0 && (
              <div className="flex items-center gap-1 text-gray-500">
                <Pill className="w-4 h-4" />
                <span>{consultation.prescriptions.length} medicines</span>
              </div>
            )}

            {/* Notes */}
            {consultation.notes?.length > 0 && (
              <div className="flex items-center gap-1 text-gray-500">
                <ClipboardList className="w-4 h-4" />
                <span>{consultation.notes.length} notes</span>
              </div>
            )}

            {/* Rating */}
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
                      onViewPatient(consultation.patient);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    View Patient
                  </button>
                  {consultation.prescriptions?.length > 0 && (
                    <button
                      onClick={() => {
                        onViewPrescription(consultation);
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Pill className="w-4 h-4" />
                      View Prescription
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onDownloadSummary(consultation);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Summary
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
  onViewPatient,
  onViewPrescription,
  onDownloadSummary
}) => {
  const { t } = useTranslation();

  if (!consultation) return null;

  const statusConfig = STATUS_CONFIG[consultation.status] || STATUS_CONFIG.completed;
  const StatusIcon = statusConfig.icon;
  const duration = consultation.actual_duration || 
    calculateDuration(consultation.actual_start, consultation.actual_end);

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
              name={consultation.patient_info?.full_name}
              size="xl"
            />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {consultation.patient_info?.full_name}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-gray-600">
                {consultation.patient_info?.age && (
                  <span>{consultation.patient_info.age}</span>
                )}
                {consultation.patient_info?.gender && (
                  <>
                    <span>•</span>
                    <span>{consultation.patient_info.gender}</span>
                  </>
                )}
              </div>
              <Button
                variant="link"
                size="sm"
                leftIcon={<ExternalLink className="w-3 h-3" />}
                onClick={() => onViewPatient(consultation.patient)}
                className="mt-1 p-0"
              >
                View Patient Profile
              </Button>
            </div>
          </div>
          <Badge variant={statusConfig.color} size="lg">
            <StatusIcon className="w-4 h-4 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Consultation Info */}
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
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-1">Language</p>
            <p className="font-semibold text-gray-900 uppercase">
              {consultation.language}
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

        {/* Prescriptions Preview */}
        {consultation.prescriptions?.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Pill className="w-4 h-4 text-green-600" />
                Prescribed Medicines
              </h4>
              <Button
                variant="link"
                size="sm"
                onClick={() => onViewPrescription(consultation)}
              >
                View All
              </Button>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="space-y-2">
                {consultation.prescriptions.slice(0, 3).map((med, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{med.medicine_name}</span>
                    <span className="text-sm text-gray-600">
                      {med.dosage} • {med.frequency}
                    </span>
                  </div>
                ))}
                {consultation.prescriptions.length > 3 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    +{consultation.prescriptions.length - 3} more
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {consultation.notes?.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-600" />
              Consultation Notes
            </h4>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 space-y-3">
              {consultation.notes.map((note, index) => (
                <div key={index}>
                  {note.title && (
                    <p className="font-medium text-gray-900">{note.title}</p>
                  )}
                  <p className="text-gray-700">{note.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatTime(note.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up */}
        {consultation.follow_up_date && (
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
          onClick={() => onViewPatient(consultation.patient)}
        >
          View Patient
        </Button>
        {consultation.prescriptions?.length > 0 && (
          <Button
            variant="outline"
            leftIcon={<Pill className="w-4 h-4" />}
            onClick={() => onViewPrescription(consultation)}
          >
            View Prescription
          </Button>
        )}
        <Button
          variant="outline"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={() => onDownloadSummary(consultation)}
        >
          Download Summary
        </Button>
      </div>
    </Modal>
  );
};

/**
 * Calendar Modal
 */
const CalendarModal = ({ isOpen, onClose, selectedDate, onDateSelect, title }) => {
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  useEffect(() => {
    if (isOpen) {
      setViewDate(selectedDate || new Date());
    }
  }, [isOpen, selectedDate]);

  const monthStart = startOfWeek(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1), { weekStartsOn: 0 });
  const monthEnd = endOfWeek(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0), { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || 'Select Date'}
      size="sm"
    >
      <div className="space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold text-gray-900">
            {format(viewDate, 'MMMM yyyy')}
          </span>
          <Button variant="ghost" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}

          {/* Days */}
          {calendarDays.map(day => {
            const isCurrentMonth = day.getMonth() === viewDate.getMonth();
            const isSelected = selectedDate && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const isTodayDate = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  onDateSelect(day);
                  onClose();
                }}
                disabled={day > new Date()} // Can't select future dates
                className={`
                  p-2 text-sm rounded-lg transition-colors
                  ${!isCurrentMonth && 'text-gray-400'}
                  ${isSelected && 'bg-primary-600 text-white'}
                  ${!isSelected && isTodayDate && 'bg-primary-100 text-primary-700'}
                  ${!isSelected && !isTodayDate && isCurrentMonth && 'hover:bg-gray-100 text-gray-900'}
                  ${day > new Date() && 'opacity-50 cursor-not-allowed'}
                `}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

/**
 * Prescription Modal
 */
const PrescriptionModal = ({ isOpen, onClose, consultation }) => {
  const { t } = useTranslation();

  if (!consultation) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Prescription"
      size="md"
    >
      <div className="space-y-4">
        {/* Patient Info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Avatar
            name={consultation.patient_info?.full_name}
            size="md"
          />
          <div>
            <p className="font-medium text-gray-900">{consultation.patient_info?.full_name}</p>
            <p className="text-sm text-gray-500">
              {formatDate(consultation.scheduled_start, 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Diagnosis */}
        {consultation.diagnosis && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-sm text-blue-700 font-medium">Diagnosis</p>
            <p className="text-blue-900 mt-1">{consultation.diagnosis}</p>
          </div>
        )}

        {/* Medicines */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Medicines</h4>
          {consultation.prescriptions?.map((med, index) => (
            <div 
              key={index}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="font-semibold text-gray-900">{med.medicine_name}</h5>
                </div>
                <Badge variant="primary">{med.dosage}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Frequency:</span>
                  <span className="ml-1 font-medium">{med.frequency}</span>
                </div>
                {med.duration && (
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <span className="ml-1 font-medium">{med.duration}</span>
                  </div>
                )}
                {med.timing && (
                  <div>
                    <span className="text-gray-500">Timing:</span>
                    <span className="ml-1 font-medium">{med.timing.replace('_', ' ')}</span>
                  </div>
                )}
              </div>
              {med.instructions && (
                <p className="mt-2 text-sm text-gray-600 italic">
                  Instructions: {med.instructions}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button
          variant="outline"
          leftIcon={<Printer className="w-4 h-4" />}
          onClick={() => toast.info('Print feature coming soon')}
        >
          Print
        </Button>
        <Button
          variant="primary"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={() => toast.info('Download feature coming soon')}
        >
          Download
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

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [consultations, setConsultations] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [dateRange, setDateRange] = useState(searchParams.get('range') || 'this_month');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);

  // Modals
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState(null);

  // ============================================================================
  // CALCULATE DATE RANGE
  // ============================================================================

  const getDateRange = useCallback(() => {
    const today = new Date();
    
    switch (dateRange) {
      case 'today':
        return { start: today, end: today };
      case 'yesterday':
        const yesterday = subDays(today, 1);
        return { start: yesterday, end: yesterday };
      case 'this_week':
        return { start: startOfWeek(today, { weekStartsOn: 1 }), end: today };
      case 'last_week':
        const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        const lastWeekEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        return { start: lastWeekStart, end: lastWeekEnd };
      case 'this_month':
        return { start: startOfMonth(today), end: today };
      case 'last_month':
        const lastMonth = subDays(startOfMonth(today), 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'custom':
        if (customStartDate && customEndDate) {
          return { start: customStartDate, end: customEndDate };
        }
        return { start: startOfMonth(today), end: today };
      default:
        return { start: startOfMonth(today), end: today };
    }
  }, [dateRange, customStartDate, customEndDate]);

  // ============================================================================
  // FETCH CONSULTATIONS
  // ============================================================================

  const fetchConsultations = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const { start, end } = getDateRange();

      const params = {
        status: statusFilter || undefined,
        consultation_type: typeFilter || undefined
      };

      // Add date filtering if needed
      if (start && end) {
        // Note: API might not support date filtering directly
        // You may need to filter client-side or implement backend support
      }

      const response = await consultationService.getConsultations(params);
      const data = response?.data || response || {};
      const consultationList = data?.results || data?.data || data || [];

      setConsultations(Array.isArray(consultationList) ? consultationList : []);
      setPagination({
        count: data.count || 0,
        next: data.next,
        previous: data.previous
      });

      // Calculate stats from data
      const allConsultations = Array.isArray(consultationList) ? consultationList : [];
      const completed = allConsultations.filter(c => c.status === 'completed');
      const totalDuration = completed.reduce((sum, c) => {
        const dur = c.actual_duration || calculateDuration(c.actual_start, c.actual_end) || 0;
        return sum + dur;
      }, 0);
      const avgDuration = completed.length > 0 ? Math.round(totalDuration / completed.length) : 0;
      
      const ratings = completed
        .map(c => c.feedback?.overall_rating)
        .filter(r => r !== undefined && r !== null);
      const avgRating = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
        : null;

      setStats({
        total: data.count || allConsultations.length,
        completed: completed.length,
        avgDuration,
        avgRating,
        totalTrend: 12, // Mock trend data
        completedTrend: 8
      });

    } catch (err) {
      console.error('Error fetching consultations:', err);
      setError(getErrorMessage(err, 'Failed to load consultations'));
      setConsultations([]);
      setStats({ total: 0, completed: 0, avgDuration: 0, avgRating: null });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter, typeFilter, getDateRange]);

  // Initial load
  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('type', typeFilter);
    if (dateRange !== 'this_month') params.set('range', dateRange);
    setSearchParams(params, { replace: true });
  }, [searchQuery, statusFilter, typeFilter, dateRange, setSearchParams]);

  // Filter consultations client-side (for search and date range)
  const filteredConsultations = useMemo(() => {
    let filtered = [...consultations];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.patient_info?.full_name?.toLowerCase().includes(query) ||
        c.reason?.toLowerCase().includes(query) ||
        c.diagnosis?.toLowerCase().includes(query)
      );
    }

    // Date range filter
    const { start, end } = getDateRange();
    if (start && end) {
      filtered = filtered.filter(c => {
        const consultDate = new Date(c.scheduled_start);
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
  }, [consultations, searchQuery, getDateRange]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleRefresh = useCallback(() => {
    fetchConsultations(true);
  }, [fetchConsultations]);

  const handleViewConsultation = useCallback((consultation) => {
    setSelectedConsultation(consultation);
    setShowDetailsModal(true);
  }, []);

  const handleViewPatient = useCallback((patientId) => {
    if (patientId) {
      navigate(`/doctor/patients/${patientId}`);
    } else {
      toast.error('Patient ID not available');
    }
  }, [navigate]);

  const handleViewPrescription = useCallback((consultation) => {
    setSelectedConsultation(consultation);
    setShowPrescriptionModal(true);
  }, []);

  const handleDownloadSummary = useCallback((consultation) => {
    console.log('Download summary for:', consultation.id);
    toast.info('Download feature coming soon');
  }, []);

  const handleRejoin = useCallback((consultation) => {
    navigate(`/doctor/consultation/${consultation.id}`);
  }, [navigate]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('');
    setTypeFilter('');
  }, []);

  const handleOpenCalendar = useCallback((target) => {
    setCalendarTarget(target);
    setShowCalendarModal(true);
  }, []);

  const handleCalendarDateSelect = useCallback((date) => {
    if (calendarTarget === 'start') {
      setCustomStartDate(date);
      if (customEndDate && date > customEndDate) {
        setCustomEndDate(date);
      }
    } else {
      setCustomEndDate(date);
      if (customStartDate && date < customStartDate) {
        setCustomStartDate(date);
      }
    }
  }, [calendarTarget, customStartDate, customEndDate]);

  // ============================================================================
  // RENDER
  // ============================================================================

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
            leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => toast.info('Export feature coming soon')}
          >
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<BarChart3 className="w-4 h-4" />}
            onClick={() => toast.info('Analytics feature coming soon')}
          >
            Analytics
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm flex-1">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Filters */}
      <Card padding="md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <DateRangeSelector
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onOpenCalendar={handleOpenCalendar}
          />

          <FiltersBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            typeFilter={typeFilter}
            onTypeChange={setTypeFilter}
            onClearFilters={handleClearFilters}
          />
        </div>
      </Card>

      {/* Consultations List */}
      {filteredConsultations.length > 0 ? (
        <div className="space-y-3">
          {filteredConsultations.map((consultation) => (
            <ConsultationCard
              key={consultation.id}
              consultation={consultation}
              onView={handleViewConsultation}
              onViewPatient={handleViewPatient}
              onViewPrescription={handleViewPrescription}
              onDownloadSummary={handleDownloadSummary}
              onRejoin={handleRejoin}
            />
          ))}
        </div>
      ) : (
        <Card padding="md">
          <EmptyState
            icon={Video}
            title="No Consultations"
            description={
              searchQuery || statusFilter || typeFilter || dateRange !== 'this_month'
                ? 'No consultations match your filters'
                : 'You have no consultation history yet'
            }
            action={
              (searchQuery || statusFilter || typeFilter) && (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )
            }
          />
        </Card>
      )}

      {/* Modals */}
      <ConsultationDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedConsultation(null);
        }}
        consultation={selectedConsultation}
        onViewPatient={handleViewPatient}
        onViewPrescription={handleViewPrescription}
        onDownloadSummary={handleDownloadSummary}
      />

      <PrescriptionModal
        isOpen={showPrescriptionModal}
        onClose={() => {
          setShowPrescriptionModal(false);
        }}
        consultation={selectedConsultation}
      />

      <CalendarModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        selectedDate={calendarTarget === 'start' ? customStartDate : customEndDate}
        onDateSelect={handleCalendarDateSelect}
        title={calendarTarget === 'start' ? 'Select Start Date' : 'Select End Date'}
      />
    </div>
  );
};

export default Consultations;