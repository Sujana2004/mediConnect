// src/pages/doctor/PatientRecords.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Search,
  Filter,
  ChevronRight,
  Calendar,
  Clock,
  Video,
  Phone,
  FileText,
  Activity,
  Heart,
  AlertCircle,
  Star,
  MoreVertical,
  Download,
  MessageSquare,
  User,
  MapPin,
  Mail,
  RefreshCw,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  Eye,
  History,
  Pill,
  Stethoscope,
  CalendarPlus,
  UserCheck,
  X
} from 'lucide-react';

import { healthRecordsService, consultationService } from '../../services/api';
import {
  Card,
  Button,
  Badge,
  Avatar,
  Loader,
  EmptyState,
  Modal,
  SearchInput,
  Select
} from '../../components/common';
import { formatDate, formatTime, getRelativeTime } from '../../utils/helpers';

// ============================================================================
// CONSTANTS
// ============================================================================

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently Visited' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'consultations', label: 'Most Consultations' },
  { value: 'upcoming', label: 'Upcoming Appointments' }
];

const FILTER_OPTIONS = [
  { value: '', label: 'All Patients' },
  { value: 'active', label: 'Active Patients' },
  { value: 'new', label: 'New Patients (This Month)' },
  { value: 'follow_up', label: 'Pending Follow-ups' },
  { value: 'chronic', label: 'Chronic Conditions' }
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Stats Header
const StatsHeader = ({ stats }) => {
  const { t } = useTranslation();

  const statItems = [
    {
      label: t('doctor.totalPatients'),
      value: stats?.total || 0,
      icon: Users,
      color: 'bg-primary-50 text-primary-600'
    },
    {
      label: t('doctor.thisMonth'),
      value: stats?.thisMonth || 0,
      icon: CalendarPlus,
      color: 'bg-green-50 text-green-600'
    },
    {
      label: t('doctor.activePatients'),
      value: stats?.active || 0,
      icon: UserCheck,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      label: t('doctor.pendingFollowUps'),
      value: stats?.pendingFollowUps || 0,
      icon: Clock,
      color: 'bg-amber-50 text-amber-600'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card key={item.label} padding="sm">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-sm text-gray-500">{item.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

// Search and Filter Bar
const SearchFilterBar = ({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filterBy,
  onFilterChange,
  viewMode,
  onViewModeChange,
  onClearFilters
}) => {
  const { t } = useTranslation();
  const hasFilters = searchQuery || filterBy;

  return (
    <Card>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder={t('doctor.searchPatientsByName')}
            className="w-full"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filterBy}
            onChange={(e) => onFilterChange(e.target.value)}
            options={FILTER_OPTIONS.map(opt => ({
              ...opt,
              label: t(`doctor.filter.${opt.value}`) || opt.label
            }))}
            className="w-40"
          />

          <Select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            options={SORT_OPTIONS.map(opt => ({
              ...opt,
              label: t(`doctor.sort.${opt.value}`) || opt.label
            }))}
            className="w-44"
          />

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              leftIcon={<X className="w-4 h-4" />}
            >
              {t('common.clear')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

// Patient Card (Grid View)
const PatientCardGrid = ({ patient, onView, onSchedule, onMessage }) => {
  const { t } = useTranslation();

  return (
    <Card hover className="cursor-pointer" onClick={() => onView(patient.id)}>
      <div className="text-center">
        {/* Avatar */}
        <Avatar
          name={patient.name}
          src={patient.avatar}
          size="xl"
          className="mx-auto"
        />

        {/* Name & Info */}
        <h3 className="font-semibold text-gray-900 mt-3 truncate">
          {patient.name}
        </h3>
        <p className="text-sm text-gray-500">
          {patient.age} {t('common.yrs')} • {t(`common.${patient.gender}`)}
        </p>

        {/* Phone */}
        {patient.phone && (
          <p className="text-sm text-gray-400 mt-1">{patient.phone}</p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {patient.total_consultations || 0}
            </p>
            <p className="text-xs text-gray-500">{t('doctor.visits')}</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              {patient.last_visit ? getRelativeTime(patient.last_visit) : t('common.never')}
            </p>
            <p className="text-xs text-gray-500">{t('doctor.lastVisit')}</p>
          </div>
        </div>

        {/* Conditions */}
        {patient.conditions && patient.conditions.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mt-3">
            {patient.conditions.slice(0, 2).map((condition, index) => (
              <Badge key={index} variant="secondary" size="sm">
                {condition}
              </Badge>
            ))}
            {patient.conditions.length > 2 && (
              <Badge variant="secondary" size="sm">
                +{patient.conditions.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Upcoming Appointment */}
        {patient.next_appointment && (
          <div className="mt-3 p-2 bg-primary-50 rounded-lg">
            <p className="text-xs text-primary-600 flex items-center justify-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(patient.next_appointment, 'MMM d')} at {formatTime(patient.next_appointment_time)}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            leftIcon={<CalendarPlus className="w-4 h-4" />}
            onClick={(e) => {
              e.stopPropagation();
              onSchedule(patient);
            }}
          >
            {t('doctor.schedule')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onMessage(patient);
            }}
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Patient Card (List View)
const PatientCardList = ({ patient, onView, onSchedule, onViewHistory }) => {
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);

  const handleCloseActions = useCallback(() => {
    setShowActions(false);
  }, []);

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onView(patient.id)}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <Avatar
          name={patient.name}
          src={patient.avatar}
          size="lg"
        />

        {/* Patient Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {patient.name}
            </h3>
            {patient.is_new && (
              <Badge variant="success" size="sm">
                {t('common.new')}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span>{patient.age} {t('common.yrs')}</span>
            <span>•</span>
            <span>{t(`common.${patient.gender}`)}</span>
            {patient.phone && (
              <>
                <span>•</span>
                <span>{patient.phone}</span>
              </>
            )}
          </div>

          {/* Conditions */}
          {patient.conditions && patient.conditions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {patient.conditions.slice(0, 3).map((condition, index) => (
                <Badge key={index} variant="secondary" size="sm">
                  {condition}
                </Badge>
              ))}
              {patient.conditions.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{patient.conditions.length - 3} {t('common.more')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-6">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {patient.total_consultations || 0}
            </p>
            <p className="text-xs text-gray-500">{t('doctor.consultations')}</p>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              {patient.last_visit ? formatDate(patient.last_visit, 'MMM d, yyyy') : '-'}
            </p>
            <p className="text-xs text-gray-500">{t('doctor.lastVisit')}</p>
          </div>
        </div>

        {/* Upcoming Appointment */}
        {patient.next_appointment && (
          <div className="hidden lg:block">
            <div className="px-3 py-2 bg-primary-50 rounded-lg">
              <p className="text-xs text-primary-700 font-medium">
                {t('doctor.nextAppointment')}
              </p>
              <p className="text-sm text-primary-600">
                {formatDate(patient.next_appointment, 'MMM d')} • {formatTime(patient.next_appointment_time)}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Eye className="w-4 h-4" />}
            onClick={(e) => {
              e.stopPropagation();
              onView(patient.id);
            }}
          >
            {t('common.view')}
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>

            {showActions && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseActions();
                  }}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSchedule(patient);
                      handleCloseActions();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    {t('doctor.scheduleAppointment')}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewHistory(patient);
                      handleCloseActions();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <History className="w-4 h-4" />
                    {t('doctor.viewHistory')}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseActions();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {t('doctor.viewRecords')}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseActions();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Pill className="w-4 h-4" />
                    {t('doctor.viewPrescriptions')}
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

// Patient Details Modal (Quick View)
const PatientQuickViewModal = ({ isOpen, onClose, patient, onViewFull, onSchedule }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [recentConsultations, setRecentConsultations] = useState([]);

  useEffect(() => {
    const fetchPatientDetails = async () => {
      if (!patient?.id || !isOpen) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch patient records and recent consultations
        const [recordsRes, consultationsRes] = await Promise.allSettled([
          healthRecordsService.getSharedRecords({ patient_id: patient.id }),
          consultationService.getConsultations({ patient_id: patient.id, page_size: 5 })
        ]);

        if (recordsRes.status === 'fulfilled') {
          setPatientDetails(recordsRes.value.data);
        }

        if (consultationsRes.status === 'fulfilled') {
          setRecentConsultations(consultationsRes.value.data?.results || []);
        }
      } catch (err) {
        console.error('Error fetching patient details:', err);
        setError(t('errors.failedToLoadPatientDetails'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatientDetails();
  }, [patient?.id, isOpen, t]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPatientDetails(null);
      setRecentConsultations([]);
      setError(null);
    }
  }, [isOpen]);

  if (!patient) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('doctor.patientQuickView')}
      size="lg"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader size="lg" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setError(null)}
          >
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Patient Header */}
          <div className="flex items-start gap-4">
            <Avatar
              name={patient.name}
              src={patient.avatar}
              size="xl"
            />
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">
                {patient.name}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-gray-600">
                <span>{patient.age} {t('common.years')}</span>
                <span>•</span>
                <span>{t(`common.${patient.gender}`)}</span>
              </div>
              {patient.phone && (
                <p className="text-gray-500 mt-1">{patient.phone}</p>
              )}
              {patient.email && (
                <p className="text-gray-500 flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {patient.email}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{t('doctor.totalVisits')}</p>
              <p className="text-2xl font-bold text-primary-600">
                {patient.total_consultations || 0}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <Calendar className="w-5 h-5 text-primary-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{t('doctor.firstVisit')}</p>
              <p className="font-medium">
                {patient.first_visit ? formatDate(patient.first_visit, 'MMM d, yyyy') : '-'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <Clock className="w-5 h-5 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{t('doctor.lastVisit')}</p>
              <p className="font-medium">
                {patient.last_visit ? formatDate(patient.last_visit, 'MMM d, yyyy') : '-'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <Stethoscope className="w-5 h-5 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{t('doctor.avgDuration')}</p>
              <p className="font-medium">{patient.avg_consultation_duration || 15} {t('common.min')}</p>
            </div>
          </div>

          {/* Allergies Alert */}
          {patient.allergies && patient.allergies.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{t('common.allergies')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {patient.allergies.map((allergy, index) => (
                  <Badge key={index} variant="danger">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Conditions */}
          {patient.conditions && patient.conditions.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                {t('common.existingConditions')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {patient.conditions.map((condition, index) => (
                  <Badge key={index} variant="secondary">
                    {condition}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recent Consultations */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              {t('doctor.recentConsultations')}
            </h4>
            {recentConsultations.length > 0 ? (
              <div className="space-y-2">
                {recentConsultations.map((consultation) => (
                  <div
                    key={consultation.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className={`p-2 rounded-lg ${
                      consultation.consultation_type === 'video'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-purple-100 text-purple-600'
                    }`}>
                      {consultation.consultation_type === 'video' ? (
                        <Video className="w-4 h-4" />
                      ) : (
                        <Phone className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {consultation.reason || t('doctor.generalConsultation')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(consultation.scheduled_start, 'MMM d, yyyy')} • {consultation.actual_duration || consultation.estimated_duration} {t('common.min')}
                      </p>
                    </div>
                    {consultation.diagnosis && (
                      <Badge variant="primary" size="sm">
                        {consultation.diagnosis}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">{t('doctor.noRecentConsultations')}</p>
            )}
          </div>

          {/* Next Appointment */}
          {patient.next_appointment && (
            <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-primary-700 font-medium">
                    {t('doctor.upcomingAppointment')}
                  </p>
                  <p className="text-lg font-semibold text-primary-900">
                    {formatDate(patient.next_appointment, 'EEEE, MMMM d')} at {formatTime(patient.next_appointment_time)}
                  </p>
                </div>
                <Badge variant="primary">
                  {patient.next_appointment_type === 'video' ? (
                    <><Video className="w-3 h-3 mr-1" /> Video</>
                  ) : (
                    <><Phone className="w-3 h-3 mr-1" /> Audio</>
                  )}
                </Badge>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between mt-6 pt-6 border-t border-gray-100">
        <Button
          variant="outline"
          leftIcon={<CalendarPlus className="w-4 h-4" />}
          onClick={() => {
            onSchedule(patient);
            onClose();
          }}
        >
          {t('doctor.scheduleAppointment')}
        </Button>
        <Button
          variant="primary"
          rightIcon={<ChevronRight className="w-4 h-4" />}
          onClick={() => {
            onViewFull(patient.id);
            onClose();
          }}
        >
          {t('doctor.viewFullProfile')}
        </Button>
      </div>
    </Modal>
  );
};

// Schedule Appointment Modal
const ScheduleAppointmentModal = ({ isOpen, onClose, patient }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!patient) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('doctor.scheduleAppointment')}
      size="md"
    >
      <div className="space-y-4">
        {/* Patient Info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Avatar
            name={patient.name}
            src={patient.avatar}
            size="md"
          />
          <div>
            <p className="font-medium text-gray-900">{patient.name}</p>
            <p className="text-sm text-gray-500">
              {patient.age} {t('common.yrs')} • {t(`common.${patient.gender}`)}
            </p>
          </div>
        </div>

        {/* Info Message */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
          <p className="text-blue-700">
            {t('doctor.scheduleAppointmentInfo')}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          leftIcon={<CalendarPlus className="w-4 h-4" />}
          onClick={() => {
            navigate(`/doctor/appointments/new?patient_id=${patient.id}`);
            onClose();
          }}
        >
          {t('doctor.continue')}
        </Button>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PatientRecords = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'recent');
  const [filterBy, setFilterBy] = useState(searchParams.get('filter') || '');
  const [viewMode, setViewMode] = useState('list');

  // Modals
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showQuickViewModal, setShowQuickViewModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [patientToSchedule, setPatientToSchedule] = useState(null);

  // Fetch patients
  const fetchPatients = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      }
      setError(null);

      const params = {
        page: pageNum,
        page_size: 20,
        search: searchQuery || undefined,
        sort: sortBy,
        filter: filterBy || undefined
      };

      // Using accessible patients endpoint (shared health records)
      const response = await healthRecordsService.getAccessiblePatients(params);
      const data = response.data;

      if (append) {
        setPatients(prev => [...prev, ...(data.results || data || [])]);
      } else {
        setPatients(data.results || data || []);
      }

      setHasMore(data.next !== null);
      setStats(data.stats || {
        total: data.count || 0,
        thisMonth: 12,
        active: 45,
        pendingFollowUps: 8
      });

    } catch (err) {
      console.error('Error fetching patients:', err);
      setError(t('errors.failedToLoadPatients'));

      // Mock data for demo
      setPatients([
        {
          id: 1,
          name: 'Rajesh Kumar',
          age: 45,
          gender: 'male',
          phone: '+91 98765 43210',
          email: 'rajesh@email.com',
          avatar: null,
          total_consultations: 12,
          last_visit: '2024-01-15',
          first_visit: '2023-06-20',
          conditions: ['Diabetes', 'Hypertension'],
          allergies: ['Penicillin'],
          is_new: false,
          next_appointment: '2024-01-25',
          next_appointment_time: '10:00'
        },
        {
          id: 2,
          name: 'Priya Sharma',
          age: 32,
          gender: 'female',
          phone: '+91 87654 32109',
          email: 'priya@email.com',
          avatar: null,
          total_consultations: 5,
          last_visit: '2024-01-10',
          first_visit: '2023-11-15',
          conditions: ['Asthma'],
          allergies: [],
          is_new: false,
          next_appointment: null
        },
        {
          id: 3,
          name: 'Amit Patel',
          age: 58,
          gender: 'male',
          phone: '+91 76543 21098',
          avatar: null,
          total_consultations: 1,
          last_visit: '2024-01-18',
          first_visit: '2024-01-18',
          conditions: [],
          allergies: ['Sulfa'],
          is_new: true,
          next_appointment: '2024-01-28',
          next_appointment_time: '14:30'
        },
        {
          id: 4,
          name: 'Sunita Devi',
          age: 67,
          gender: 'female',
          phone: '+91 65432 10987',
          avatar: null,
          total_consultations: 24,
          last_visit: '2024-01-12',
          first_visit: '2022-03-10',
          conditions: ['Arthritis', 'Thyroid', 'Heart Disease'],
          allergies: ['Aspirin', 'Ibuprofen'],
          is_new: false,
          next_appointment: '2024-01-22',
          next_appointment_time: '11:00'
        }
      ]);
      setStats({
        total: 156,
        thisMonth: 12,
        active: 45,
        pendingFollowUps: 8
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [searchQuery, sortBy, filterBy, t]);

  // Unified fetch effect with debounce for search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setPage(1);
      fetchPatients(1);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, sortBy, filterBy, fetchPatients]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (sortBy !== 'recent') params.set('sort', sortBy);
    if (filterBy) params.set('filter', filterBy);
    setSearchParams(params, { replace: true });
  }, [searchQuery, sortBy, filterBy, setSearchParams]);

  // Handlers
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(1);
    fetchPatients(1);
  }, [fetchPatients]);

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPatients(nextPage, true);
  }, [page, fetchPatients]);

  const handleViewPatient = useCallback((patientId) => {
    navigate(`/doctor/patients/${patientId}`);
  }, [navigate]);

  const handleQuickView = useCallback((patient) => {
    setSelectedPatient(patient);
    setShowQuickViewModal(true);
  }, []);

  const handleScheduleAppointment = useCallback((patient) => {
    setPatientToSchedule(patient);
    setShowScheduleModal(true);
  }, []);

  const handleViewHistory = useCallback((patient) => {
    navigate(`/doctor/patients/${patient.id}/history`);
  }, [navigate]);

  const handleMessagePatient = useCallback((patient) => {
    // Open messaging or notification
    console.log('Message patient:', patient);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterBy('');
    setSortBy('recent');
  }, []);

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
            {t('doctor.patientRecords')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('doctor.patientRecordsDesc')}
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
            {t('common.refresh')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
          >
            {t('common.export')}
          </Button>
        </div>
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

      {/* Stats */}
      <StatsHeader stats={stats} />

      {/* Search & Filters */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterBy={filterBy}
        onFilterChange={setFilterBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onClearFilters={handleClearFilters}
      />

      {/* Patient List/Grid */}
      {patients.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {patients.map((patient) => (
                <PatientCardGrid
                  key={patient.id}
                  patient={patient}
                  onView={handleViewPatient}
                  onSchedule={handleScheduleAppointment}
                  onMessage={handleMessagePatient}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {patients.map((patient) => (
                <PatientCardList
                  key={patient.id}
                  patient={patient}
                  onView={handleViewPatient}
                  onSchedule={handleScheduleAppointment}
                  onViewHistory={handleViewHistory}
                />
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="text-center mt-6">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isRefreshing}
              >
                {t('common.loadMore')}
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <EmptyState
            icon={Users}
            title={t('doctor.noPatients')}
            description={searchQuery || filterBy
              ? t('doctor.noPatientsMatchingFilters')
              : t('doctor.noPatientsDesc')
            }
            action={
              (searchQuery || filterBy) && (
                <Button variant="outline" onClick={handleClearFilters}>
                  {t('common.clearFilters')}
                </Button>
              )
            }
          />
        </Card>
      )}

      {/* Modals */}
      <PatientQuickViewModal
        isOpen={showQuickViewModal}
        onClose={() => {
          setShowQuickViewModal(false);
          setSelectedPatient(null);
        }}
        patient={selectedPatient}
        onViewFull={handleViewPatient}
        onSchedule={handleScheduleAppointment}
      />

      <ScheduleAppointmentModal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setPatientToSchedule(null);
        }}
        patient={patientToSchedule}
      />
    </div>
  );
};

export default PatientRecords;