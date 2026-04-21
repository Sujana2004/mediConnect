// src/pages/doctor/PatientRecords.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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

const getSafeTranslation = (t, key, fallback) => {
  const translated = t(key);
  return translated === key ? fallback : translated;
};

const getGenderLabel = (t, gender) => {
  if (!gender) return getSafeTranslation(t, 'common.other', 'Other');
  return getSafeTranslation(t, `common.${gender}`, gender);
};

const formatPatientAgeWithUnit = (t, age, unitKey = 'common.yrs', unitFallback = 'yrs') => {
  if (age === null || age === undefined || age === '') return '-';
  return `${age} ${getSafeTranslation(t, unitKey, unitFallback)}`;
};

const normalizeAccessiblePatient = (entry) => {
  const patient = entry?.patient || entry;

  return {
    ...entry,
    ...patient,
    id: patient?.id,
    name: patient?.full_name || [patient?.first_name, patient?.last_name].filter(Boolean).join(' ') || patient?.phone || 'Patient',
    phone: patient?.phone || '-',
    gender: patient?.gender,
    age: patient?.age,
    avatar: patient?.avatar || patient?.profile_picture || null,
    share_types: entry?.share_types || [],
    is_permanent: entry?.is_permanent ?? false,
    latest_share: entry?.latest_share || null,
  };
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Stats Header
const StatsHeader = ({ stats }) => {
  const { t } = useTranslation();

  const statItems = [
    {
      label: t('doctor.totalPatients', 'Total Patients'),
      value: stats?.total || 0,
      icon: Users,
      color: 'bg-primary-50 text-primary-600'
    },
    {
      label: t('doctor.thisMonth', 'This Month'),
      value: stats?.thisMonth || 0,
      icon: CalendarPlus,
      color: 'bg-green-50 text-green-600'
    },
    {
      label: t('doctor.activePatients', 'Active Patients'),
      value: stats?.active || 0,
      icon: UserCheck,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      label: t('doctor.pendingFollowUps', 'Pending Follow-ups'),
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

  const filterOptions = FILTER_OPTIONS.map((opt) => ({
    ...opt,
    label: getSafeTranslation(t, `doctor.filter.${opt.value}`, opt.label)
  }));

  const sortOptions = SORT_OPTIONS.map((opt) => ({
    ...opt,
    label: getSafeTranslation(t, `doctor.sort.${opt.value}`, opt.label)
  }));

  return (
    <Card>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={onSearchChange}
            placeholder={getSafeTranslation(t, 'doctor.searchPatientsByName', 'Search patients by name')}
            className="w-full"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filterBy}
            onChange={(e) => onFilterChange(e.target.value)}
            options={filterOptions}
            className="w-40"
          />

          <Select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            options={sortOptions}
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
              {getSafeTranslation(t, 'common.clear', 'Clear')}
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
  const genderLabel = getGenderLabel(t, patient.gender);

  return (
    <Card hover className="cursor-pointer" onClick={() => onView(patient)}>
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
          {formatPatientAgeWithUnit(t, patient.age)}{patient.gender ? ` • ${genderLabel}` : ''}
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
            <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.visits', 'Visits')}</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              {patient.last_visit ? getRelativeTime(patient.last_visit) : getSafeTranslation(t, 'common.never', 'Never')}
            </p>
            <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.lastVisit', 'Last Visit')}</p>
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
              {formatDate(patient.next_appointment, 'MMM d')} at {patient.next_appointment_time ? formatTime(patient.next_appointment_time) : '-'}
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
            {getSafeTranslation(t, 'doctor.schedule', 'Schedule')}
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
const PatientCardList = ({ patient, onView, onSchedule, onViewHistory, onViewRecords }) => {
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);
  const genderLabel = getGenderLabel(t, patient.gender);

  const handleCloseActions = useCallback(() => {
    setShowActions(false);
  }, []);

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onView(patient)}
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
                {getSafeTranslation(t, 'common.new', 'New')}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span>{formatPatientAgeWithUnit(t, patient.age)}</span>
            {patient.gender && <span>•</span>}
            {patient.gender && <span>{genderLabel}</span>}
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
                  +{patient.conditions.length - 3} {getSafeTranslation(t, 'common.more', 'more')}
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
            <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.consultations', 'Consultations')}</p>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              {patient.last_visit ? formatDate(patient.last_visit, 'MMM d, yyyy') : '-'}
            </p>
            <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.lastVisit', 'Last Visit')}</p>
          </div>
        </div>

        {/* Upcoming Appointment */}
        {patient.next_appointment && (
          <div className="hidden lg:block">
            <div className="px-3 py-2 bg-primary-50 rounded-lg">
              <p className="text-xs text-primary-700 font-medium">
                {getSafeTranslation(t, 'doctor.nextAppointment', 'Next Appointment')}
              </p>
              <p className="text-sm text-primary-600">
                {formatDate(patient.next_appointment, 'MMM d')}{patient.next_appointment_time ? ` • ${formatTime(patient.next_appointment_time)}` : ''}
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
              onView(patient);
            }}
          >
            {getSafeTranslation(t, 'common.view', 'View')}
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
                    {getSafeTranslation(t, 'doctor.scheduleAppointment', 'Schedule Appointment')}
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
                    {getSafeTranslation(t, 'doctor.viewHistory', 'View History')}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewRecords(patient);
                      handleCloseActions();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {getSafeTranslation(t, 'doctor.viewRecords', 'View Records')}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseActions();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Pill className="w-4 h-4" />
                    {getSafeTranslation(t, 'doctor.viewPrescriptions', 'View Prescriptions')}
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
const PatientQuickViewModal = ({ isOpen, onClose, patient, onViewFull, onSchedule, isFullProfile = false }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [recentConsultations, setRecentConsultations] = useState([]);
  const patientRecords = patientDetails?.data || patientDetails || {};
  const detailPatient = patientRecords?.patient;
  const conditionsList = Array.isArray(patientRecords?.medical_conditions)
    ? patientRecords.medical_conditions
    : Array.isArray(patientRecords?.conditions)
      ? patientRecords.conditions
      : [];
  const allergiesList = Array.isArray(patientRecords?.allergies)
    ? patientRecords.allergies
    : [];
  const normalizedConditions = conditionsList
    .map((item) => item?.condition_name || item?.name || item?.condition || null)
    .filter(Boolean);
  const normalizedAllergies = allergiesList
    .map((item) => item?.allergen || item?.name || item?.allergy || null)
    .filter(Boolean);
  const vitalSigns = Array.isArray(patientRecords?.vital_signs)
    ? patientRecords.vital_signs
    : [];
  const latestVital = vitalSigns.length > 0 ? vitalSigns[0] : null;
  const labReports = Array.isArray(patientRecords?.lab_reports)
    ? patientRecords.lab_reports
    : [];
  const documents = Array.isArray(patientRecords?.documents)
    ? patientRecords.documents
    : [];
  const healthProfile = patientRecords?.health_profile || {};
  const profileMedications = Array.isArray(healthProfile?.current_medications)
    ? healthProfile.current_medications
    : [];
  const profileChronicConditions = Array.isArray(healthProfile?.chronic_conditions)
    ? healthProfile.chronic_conditions
    : [];
  const profileAllergies = Array.isArray(healthProfile?.allergies)
    ? healthProfile.allergies
    : [];

  const displayPatient = {
    ...patient,
    ...(detailPatient || {}),
    name: detailPatient?.full_name || patient?.name,
    phone: detailPatient?.phone || patient?.phone,
    gender: detailPatient?.gender || patient?.gender,
    age: detailPatient?.age ?? patient?.age,
  };

  useEffect(() => {
    const fetchPatientDetails = async () => {
      if (!patient?.id || !isOpen) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch patient records and recent consultations
        const [recordsRes, consultationsRes] = await Promise.allSettled([
          healthRecordsService.getPatientRecords(patient.id),
          consultationService.getConsultations({ patient_id: patient.id, page_size: 5 })
        ]);

        if (recordsRes.status === 'fulfilled') {
          setPatientDetails(recordsRes.value);
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
      title={isFullProfile
        ? getSafeTranslation(t, 'doctor.patientFullProfile', 'Patient Full Profile')
        : getSafeTranslation(t, 'doctor.patientQuickView', 'Patient Quick View')}
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
              name={displayPatient.name}
              src={displayPatient.avatar}
              size="xl"
            />
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">
                {displayPatient.name}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-gray-600">
                <span>{formatPatientAgeWithUnit(t, displayPatient.age, 'common.years', 'years')}</span>
                {displayPatient.gender && <span>•</span>}
                {displayPatient.gender && <span>{getGenderLabel(t, displayPatient.gender)}</span>}
              </div>
              {displayPatient.phone && (
                <p className="text-gray-500 mt-1">{displayPatient.phone}</p>
              )}
              {displayPatient.email && (
                <p className="text-gray-500 flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {displayPatient.email}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{getSafeTranslation(t, 'doctor.totalVisits', 'Total Visits')}</p>
              <p className="text-2xl font-bold text-primary-600">
                {displayPatient.total_consultations || 0}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <Calendar className="w-5 h-5 text-primary-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{getSafeTranslation(t, 'doctor.firstVisit', 'First Visit')}</p>
              <p className="font-medium">
                {displayPatient.first_visit ? formatDate(displayPatient.first_visit, 'MMM d, yyyy') : '-'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <Clock className="w-5 h-5 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{getSafeTranslation(t, 'doctor.lastVisit', 'Last Visit')}</p>
              <p className="font-medium">
                {displayPatient.last_visit ? formatDate(displayPatient.last_visit, 'MMM d, yyyy') : '-'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <Stethoscope className="w-5 h-5 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{getSafeTranslation(t, 'doctor.avgDuration', 'Avg Duration')}</p>
              <p className="font-medium">{displayPatient.avg_consultation_duration || 15} {getSafeTranslation(t, 'common.min', 'min')}</p>
            </div>
          </div>

          {/* Full Health Profile */}
          {(isFullProfile || healthProfile?.blood_group || healthProfile?.height_cm || healthProfile?.weight_kg || profileMedications.length > 0) && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                {getSafeTranslation(t, 'doctor.healthProfile', 'Health Profile')}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.bloodGroup', 'Blood Group')}</p>
                  <p className="text-sm font-semibold text-gray-900">{healthProfile?.blood_group || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.height', 'Height')}</p>
                  <p className="text-sm font-semibold text-gray-900">{healthProfile?.height_cm ? `${healthProfile.height_cm} cm` : '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.weight', 'Weight')}</p>
                  <p className="text-sm font-semibold text-gray-900">{healthProfile?.weight_kg ? `${healthProfile.weight_kg} kg` : '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.bmi', 'BMI')}</p>
                  <p className="text-sm font-semibold text-gray-900">{healthProfile?.bmi || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.smokingStatus', 'Smoking Status')}</p>
                  <p className="text-sm font-semibold text-gray-900">{healthProfile?.smoking_status || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.alcoholConsumption', 'Alcohol Consumption')}</p>
                  <p className="text-sm font-semibold text-gray-900">{healthProfile?.alcohol_consumption || '-'}</p>
                </div>
              </div>

              {(healthProfile?.emergency_contact_name || healthProfile?.emergency_contact_phone) && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-xs text-amber-700 font-medium">
                    {getSafeTranslation(t, 'doctor.emergencyContact', 'Emergency Contact')}
                  </p>
                  <p className="text-sm text-amber-900 mt-1">
                    {healthProfile?.emergency_contact_name || '-'}
                    {healthProfile?.emergency_contact_relation ? ` • ${healthProfile.emergency_contact_relation}` : ''}
                    {healthProfile?.emergency_contact_phone ? ` • ${healthProfile.emergency_contact_phone}` : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Current Medications */}
          {profileMedications.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                {getSafeTranslation(t, 'doctor.currentMedications', 'Current Medications')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {profileMedications.map((medication, index) => (
                  <Badge key={index} variant="secondary">
                    {typeof medication === 'string' ? medication : (medication?.name || medication?.medicine_name || getSafeTranslation(t, 'doctor.medication', 'Medication'))}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Chronic Conditions from Health Profile */}
          {profileChronicConditions.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                {getSafeTranslation(t, 'doctor.chronicConditions', 'Chronic Conditions')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {profileChronicConditions.map((condition, index) => (
                  <Badge key={index} variant="secondary">
                    {typeof condition === 'string' ? condition : (condition?.name || condition?.condition_name || getSafeTranslation(t, 'doctor.condition', 'Condition'))}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Allergies from Health Profile */}
          {profileAllergies.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                {getSafeTranslation(t, 'common.allergies', 'Allergies')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {profileAllergies.map((allergy, index) => (
                  <Badge key={index} variant="danger">
                    {typeof allergy === 'string' ? allergy : (allergy?.name || allergy?.allergen || getSafeTranslation(t, 'doctor.allergy', 'Allergy'))}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Allergies Alert */}
          {normalizedAllergies.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{t('common.allergies')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {normalizedAllergies.map((allergy, index) => (
                  <Badge key={index} variant="danger">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Conditions */}
          {normalizedConditions.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                {t('common.existingConditions')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {normalizedConditions.map((condition, index) => (
                  <Badge key={index} variant="secondary">
                    {condition}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Latest Vitals */}
          {latestVital && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                {getSafeTranslation(t, 'doctor.latestVitals', 'Latest Vitals')}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {latestVital.bp_display && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.bloodPressure', 'Blood Pressure')}</p>
                    <p className="text-sm font-semibold text-gray-900">{latestVital.bp_display}</p>
                  </div>
                )}
                {latestVital.heart_rate && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.heartRate', 'Heart Rate')}</p>
                    <p className="text-sm font-semibold text-gray-900">{latestVital.heart_rate} bpm</p>
                  </div>
                )}
                {latestVital.oxygen_saturation && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.oxygenSaturation', 'Oxygen Saturation')}</p>
                    <p className="text-sm font-semibold text-gray-900">{latestVital.oxygen_saturation}%</p>
                  </div>
                )}
                {latestVital.temperature && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.temperature', 'Temperature')}</p>
                    <p className="text-sm font-semibold text-gray-900">{latestVital.temperature} C</p>
                  </div>
                )}
                {latestVital.blood_sugar && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.bloodSugar', 'Blood Sugar')}</p>
                    <p className="text-sm font-semibold text-gray-900">{latestVital.blood_sugar} mg/dL</p>
                  </div>
                )}
                {latestVital.weight_kg && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.weight', 'Weight')}</p>
                    <p className="text-sm font-semibold text-gray-900">{latestVital.weight_kg} kg</p>
                  </div>
                )}
              </div>
              {latestVital.recorded_at && (
                <p className="text-xs text-gray-500 mt-2">
                  {getSafeTranslation(t, 'doctor.recordedOn', 'Recorded on')} {formatDate(latestVital.recorded_at, 'MMM d, yyyy')}
                </p>
              )}
            </div>
          )}

          {/* Vitals History */}
          {isFullProfile && vitalSigns.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                {getSafeTranslation(t, 'doctor.vitalsHistory', 'Vitals History')}
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {vitalSigns.map((vital) => (
                  <div key={vital.id} className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <p className="text-xs text-gray-500">{getSafeTranslation(t, 'common.date', 'Date')}</p>
                      <p className="font-medium text-gray-900">{vital.recorded_at ? formatDate(vital.recorded_at, 'MMM d, yyyy') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.bloodPressure', 'Blood Pressure')}</p>
                      <p className="font-medium text-gray-900">{vital.bp_display || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.heartRate', 'Heart Rate')}</p>
                      <p className="font-medium text-gray-900">{vital.heart_rate ? `${vital.heart_rate} bpm` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{getSafeTranslation(t, 'doctor.oxygenSaturation', 'SpO2')}</p>
                      <p className="font-medium text-gray-900">{vital.oxygen_saturation ? `${vital.oxygen_saturation}%` : '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medical Documents */}
          {documents.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                {getSafeTranslation(t, 'doctor.medicalDocuments', 'Medical Documents')}
              </h4>
              <div className="space-y-2">
                {documents.slice(0, 3).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.title || getSafeTranslation(t, 'doctor.document', 'Document')}</p>
                        <p className="text-xs text-gray-500">
                          {doc.document_type || '-'}
                          {doc.document_date ? ` • ${formatDate(doc.document_date, 'MMM d, yyyy')}` : ''}
                        </p>
                      </div>
                    </div>
                    {doc.file_type && (
                      <Badge variant="secondary" size="sm">
                        {String(doc.file_type).toUpperCase()}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Consultations */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              {getSafeTranslation(t, 'doctor.recentConsultations', 'Recent Consultations')}
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
                        {consultation.reason || getSafeTranslation(t, 'doctor.generalConsultation', 'General Consultation')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(consultation.scheduled_start, 'MMM d, yyyy')} • {consultation.actual_duration || consultation.estimated_duration} {getSafeTranslation(t, 'common.min', 'min')}
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
              <p className="text-gray-500 text-sm">{getSafeTranslation(t, 'doctor.noRecentConsultations', 'No recent consultations')}</p>
            )}
          </div>

          {/* Next Appointment */}
          {displayPatient.next_appointment && (
            <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-primary-700 font-medium">
                    {getSafeTranslation(t, 'doctor.upcomingAppointment', 'Upcoming Appointment')}
                  </p>
                  <p className="text-lg font-semibold text-primary-900">
                    {formatDate(displayPatient.next_appointment, 'EEEE, MMMM d')} at {displayPatient.next_appointment_time ? formatTime(displayPatient.next_appointment_time) : '-'}
                  </p>
                </div>
                <Badge variant="primary">
                  {displayPatient.next_appointment_type === 'video' ? (
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
          {getSafeTranslation(t, 'doctor.scheduleAppointment', 'Schedule Appointment')}
        </Button>
        {!isFullProfile && (
          <Button
            variant="primary"
            rightIcon={<ChevronRight className="w-4 h-4" />}
            onClick={() => {
              onViewFull(patient.id);
            }}
          >
            {getSafeTranslation(t, 'doctor.viewFullProfile', 'View Full Profile')}
          </Button>
        )}
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
      title={getSafeTranslation(t, 'doctor.scheduleAppointment', 'Schedule Appointment')}
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
              {formatPatientAgeWithUnit(t, patient.age)}{patient.gender ? ` • ${getGenderLabel(t, patient.gender)}` : ''}
            </p>
          </div>
        </div>

        {/* Info Message */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
          <p className="text-blue-700">
            {getSafeTranslation(t, 'doctor.scheduleAppointmentInfo', 'You will be redirected to create a new appointment for this patient.')}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {getSafeTranslation(t, 'common.cancel', 'Cancel')}
        </Button>
        <Button
          variant="primary"
          leftIcon={<CalendarPlus className="w-4 h-4" />}
          onClick={() => {
            navigate(`/doctor/appointments/new?patient_id=${patient.id}`);
            onClose();
          }}
        >
          {getSafeTranslation(t, 'doctor.continue', 'Continue')}
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
  const { patientId } = useParams();
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
      const data = await healthRecordsService.getAccessiblePatients(params);
      const rawPatients = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : [];
      const normalizedPatients = rawPatients.map(normalizeAccessiblePatient).filter((patient) => patient.id);

      if (append) {
        setPatients(prev => [...prev, ...normalizedPatients]);
      } else {
        setPatients(normalizedPatients);
      }

      setHasMore(Boolean(data?.next));
      setStats(data?.stats || {
        total: data?.count || normalizedPatients.length || 0,
        thisMonth: 12,
        active: 45,
        pendingFollowUps: 8
      });

    } catch (err) {
      console.error('Error fetching patients:', err);
      setError(t('errors.failedToLoadPatients'));
      setPatients([]);
      setHasMore(false);
      setStats({
        total: 0,
        thisMonth: 0,
        active: 0,
        pendingFollowUps: 0
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

  // When route is /doctor/patients/:patientId, open that patient in full profile modal.
  useEffect(() => {
    if (!patientId) return;

    const currentSelectedId = selectedPatient?.id ? String(selectedPatient.id) : null;
    if (showQuickViewModal && currentSelectedId === String(patientId)) return;

    const patientFromList = patients.find((entry) => String(entry.id) === String(patientId));
    if (patientFromList) {
      setSelectedPatient(patientFromList);
      setShowQuickViewModal(true);
      return;
    }

    let isCancelled = false;

    const fetchPatientFromRecords = async () => {
      try {
        const response = await healthRecordsService.getPatientRecords(patientId);
        const patientPayload = response?.data?.patient || response?.patient;

        if (!patientPayload || isCancelled) return;

        const normalizedPatient = normalizeAccessiblePatient({ patient: patientPayload });
        if (normalizedPatient?.id) {
          setSelectedPatient(normalizedPatient);
          setShowQuickViewModal(true);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error loading patient full profile:', err);
          setError(getSafeTranslation(t, 'errors.failedToLoadPatientDetails', 'Failed to load patient details'));
        }
      }
    };

    fetchPatientFromRecords();

    return () => {
      isCancelled = true;
    };
  }, [patientId, patients, selectedPatient?.id, showQuickViewModal, t]);

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

  const handleViewPatient = useCallback((patient) => {
    setSelectedPatient(patient);
    setShowQuickViewModal(true);
  }, []);

  const handleViewPatientRoute = useCallback((patientId) => {
    navigate(`/doctor/patients/${patientId}`);
  }, [navigate]);

  const handleScheduleAppointment = useCallback((patient) => {
    setPatientToSchedule(patient);
    setShowScheduleModal(true);
  }, []);

  const handleViewHistory = useCallback((patient) => {
    setSelectedPatient(patient);
    setShowQuickViewModal(true);
  }, []);

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
            {t('doctor.patientRecords', 'Patient Records')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('doctor.patientRecordsDesc', 'Patient Records Desc')}
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
                  onViewRecords={handleViewPatient}
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
            title={t('doctor.noPatients', 'No Patients Found')}
            description={searchQuery || filterBy
              ? t('doctor.noPatientsMatchingFilters', 'No patients found matching the selected filters.')
              : t('doctor.noPatientsDesc', 'You have no patients in your records.')
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
          if (patientId) {
            navigate('/doctor/patients', { replace: true });
          }
        }}
        patient={selectedPatient}
        onViewFull={handleViewPatientRoute}
        onSchedule={handleScheduleAppointment}
        isFullProfile={Boolean(patientId)}
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