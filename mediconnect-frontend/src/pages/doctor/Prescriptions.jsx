// src/pages/doctor/Prescriptions.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Pill,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  FileText,
  Printer,
  RefreshCw,
  Plus,
  Eye,
  Edit,
  Copy,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  X,
  ChevronRight,
  Send,
  Share2,
  History,
  Package,
  Tablets,
  Syringe,
  Droplet,
  Info,
  Star,
  TrendingUp,
  BarChart3,
  ExternalLink
} from 'lucide-react';

import { medicineService } from '../../services/api';
import {
  Card,
  Button,
  Badge,
  Avatar,
  Loader,
  EmptyState,
  Modal,
  SearchInput,
  Select,
  Input,
  TextArea
} from '../../components/common';
import { formatDate, formatTime } from '../../utils/helpers';

// ============================================================================
// CONSTANTS
// ============================================================================

const PRESCRIPTION_STATUS = {
  active: {
    color: 'success',
    icon: CheckCircle,
    label: 'status.active'
  },
  completed: {
    color: 'primary',
    icon: CheckCircle,
    label: 'status.completed'
  },
  expired: {
    color: 'warning',
    icon: AlertTriangle,
    label: 'status.expired'
  },
  cancelled: {
    color: 'danger',
    icon: X,
    label: 'status.cancelled'
  }
};

const MEDICINE_FORMS = {
  tablet: { icon: Tablets, label: 'Tablet' },
  capsule: { icon: Package, label: 'Capsule' },
  syrup: { icon: Droplet, label: 'Syrup' },
  injection: { icon: Syringe, label: 'Injection' },
  cream: { icon: Package, label: 'Cream' },
  drops: { icon: Droplet, label: 'Drops' },
  inhaler: { icon: Package, label: 'Inhaler' },
  other: { icon: Pill, label: 'Other' }
};

const DATE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' }
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'expired', label: 'Expired' }
];

const calculatePrescriptionStats = (prescriptionList, totalCount, apiStats) => {
  const list = Array.isArray(prescriptionList) ? prescriptionList : [];
  const today = new Date();

  const totalMedicines = list.reduce((sum, prescription) => {
    const medicineCount = Array.isArray(prescription?.medicines) ? prescription.medicines.length : 0;
    return sum + medicineCount;
  }, 0);

  const thisMonth = list.filter((prescription) => {
    const rawDate = prescription?.date || prescription?.prescription_date || prescription?.created_at;
    if (!rawDate) return false;
    const parsedDate = new Date(rawDate);
    if (Number.isNaN(parsedDate.getTime())) return false;
    return (
      parsedDate.getFullYear() === today.getFullYear() &&
      parsedDate.getMonth() === today.getMonth()
    );
  }).length;

  return {
    total: typeof totalCount === 'number' ? totalCount : list.length,
    active: list.filter((prescription) => prescription?.status === 'active').length,
    totalMedicines,
    thisMonth,
    monthTrend: apiStats?.monthTrend,
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
      label: t('doctor.totalPrescriptions', 'Total Prescriptions'),
      value: stats?.total || 0,
      icon: FileText,
      color: 'bg-primary-50 text-primary-600'
    },
    {
      label: t('doctor.activePrescriptions', 'Active Prescriptions'),
      value: stats?.active || 0,
      icon: CheckCircle,
      color: 'bg-green-50 text-green-600'
    },
    {
      label: t('doctor.medicinesPrescribed', 'Medicines Prescribed'),
      value: stats?.totalMedicines || 0,
      icon: Pill,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      label: t('doctor.thisMonth', 'This Month'),
      value: stats?.thisMonth || 0,
      icon: Calendar,
      color: 'bg-amber-50 text-amber-600',
      trend: stats?.monthTrend
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
            <p className="text-2xl font-bold text-gray-900">{item.value}</p>
            <p className="text-sm text-gray-500">{item.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};

// Filters Bar
const FiltersBar = ({
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  statusFilter,
  onStatusFilterChange,
  onClearFilters
}) => {
  const { t } = useTranslation();
  const hasFilters = searchQuery || dateFilter !== 'all' || statusFilter;

  return (
    <Card>
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder={t('doctor.searchPrescriptions')}
          className="flex-1"
        />

        <Select
          value={dateFilter}
          onChange={(e) => onDateFilterChange(e.target.value)}
          options={DATE_FILTER_OPTIONS.map(opt => ({
            ...opt,
            label: t(`doctor.dateFilter.${opt.value}`) || opt.label
          }))}
          className="w-36"
        />

        <Select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          options={STATUS_FILTER_OPTIONS.map(opt => ({
            ...opt,
            label: t(`status.${opt.value}`) || opt.label
          }))}
          className="w-32"
        />

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
    </Card>
  );
};

// Prescription Card
const PrescriptionCard = ({
  prescription,
  onView,
  onEdit,
  onDuplicate,
  onPrint,
  onShare
}) => {
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);

  const handleCloseActions = useCallback(() => {
    setShowActions(false);
  }, []);

  const statusConfig = PRESCRIPTION_STATUS[prescription.status] || PRESCRIPTION_STATUS.active;
  const StatusIcon = statusConfig.icon;

  const medicineCount = prescription.medicines?.length || 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Patient Info */}
        <Avatar
          name={prescription.patient_name}
          src={prescription.patient_avatar}
          size="lg"
        />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">
                {prescription.patient_name}
              </h4>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                {prescription.patient_age && (
                  <span>{prescription.patient_age} {t('common.yrs')}</span>
                )}
                {prescription.patient_gender && (
                  <>
                    <span>•</span>
                    <span>{t(`common.${prescription.patient_gender}`)}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={statusConfig.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {t(statusConfig.label)}
              </Badge>
            </div>
          </div>

          {/* Prescription Info */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
            <div className="flex items-center gap-1 text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{formatDate(prescription.date, 'MMM d, yyyy')}</span>
            </div>

            <div className="flex items-center gap-1 text-gray-600">
              <Pill className="w-4 h-4 text-gray-400" />
              <span>{medicineCount} {t('doctor.medicines')}</span>
            </div>

            {prescription.diagnosis && (
              <div className="flex items-center gap-1 text-gray-600">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="truncate max-w-[200px]">{prescription.diagnosis}</span>
              </div>
            )}
          </div>

          {/* Medicines Preview */}
          {prescription.medicines && prescription.medicines.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {prescription.medicines.slice(0, 3).map((medicine, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium"
                >
                  {medicine.name}
                </span>
              ))}
              {prescription.medicines.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                  +{prescription.medicines.length - 3} {t('common.more')}
                </span>
              )}
            </div>
          )}

          {/* Valid Until */}
          {prescription.valid_until && (
            <p className="mt-2 text-xs text-gray-400">
              {t('doctor.validUntil')}: {formatDate(prescription.valid_until, 'MMM d, yyyy')}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Eye className="w-4 h-4" />}
            onClick={() => onView(prescription)}
          >
            {t('common.view')}
          </Button>

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
                      onEdit(prescription);
                      handleCloseActions();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => {
                      onDuplicate(prescription);
                      handleCloseActions();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    {t('doctor.duplicate')}
                  </button>
                  <hr className="my-1 border-gray-100" />
                  <button
                    onClick={() => {
                      onPrint(prescription);
                      handleCloseActions();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    {t('common.print')}
                  </button>
                  <button
                    onClick={() => {
                      onShare(prescription);
                      handleCloseActions();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    {t('common.share')}
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

// Prescription Details Modal
const PrescriptionDetailsModal = ({
  isOpen,
  onClose,
  prescription,
  onEdit,
  onPrint,
  onShare
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!prescription) return null;

  const statusConfig = PRESCRIPTION_STATUS[prescription.status] || PRESCRIPTION_STATUS.active;
  const StatusIcon = statusConfig.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('doctor.prescriptionDetails')}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              name={prescription.patient_name}
              src={prescription.patient_avatar}
              size="xl"
            />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {prescription.patient_name}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-gray-600">
                {prescription.patient_age && (
                  <span>{prescription.patient_age} {t('common.years')}</span>
                )}
                {prescription.patient_gender && (
                  <>
                    <span>•</span>
                    <span>{t(`common.${prescription.patient_gender}`)}</span>
                  </>
                )}
              </div>
              <Button
                variant="link"
                size="sm"
                leftIcon={<ExternalLink className="w-3 h-3" />}
                onClick={() => navigate(`/doctor/patients/${prescription.patient_id}`)}
                className="mt-1 p-0"
              >
                {t('doctor.viewPatientProfile')}
              </Button>
            </div>
          </div>

          <Badge variant={statusConfig.color} size="lg">
            <StatusIcon className="w-4 h-4 mr-1" />
            {t(statusConfig.label)}
          </Badge>
        </div>

        {/* Prescription Info */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-1">{t('common.date')}</p>
            <p className="font-semibold text-gray-900">
              {formatDate(prescription.date, 'MMMM d, yyyy')}
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-1">{t('doctor.prescriptionId')}</p>
            <p className="font-semibold text-gray-900">
              #{prescription.id}
            </p>
          </div>

          {prescription.valid_until && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">{t('doctor.validUntil')}</p>
              <p className="font-semibold text-gray-900">
                {formatDate(prescription.valid_until, 'MMMM d, yyyy')}
              </p>
            </div>
          )}
        </div>

        {/* Diagnosis */}
        {prescription.diagnosis && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">{t('doctor.diagnosis')}</h4>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-blue-900">{prescription.diagnosis}</p>
            </div>
          </div>
        )}

        {/* Medicines */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary-600" />
            {t('doctor.prescribedMedicines')} ({prescription.medicines?.length || 0})
          </h4>

          <div className="space-y-3">
            {prescription.medicines?.map((medicine, index) => {
              const formConfig = MEDICINE_FORMS[medicine.form] || MEDICINE_FORMS.other;
              const FormIcon = formConfig.icon;

              return (
                <div
                  key={index}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <FormIcon className="w-5 h-5 text-primary-600" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-gray-900">
                          {medicine.name}
                        </h5>
                        <Badge variant="primary">{medicine.dosage}</Badge>
                      </div>

                      {medicine.generic_name && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          {medicine.generic_name}
                        </p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 text-sm">
                        <div>
                          <span className="text-gray-500">{t('doctor.frequency')}:</span>
                          <span className="ml-1 font-medium text-gray-900">
                            {medicine.frequency}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('doctor.duration')}:</span>
                          <span className="ml-1 font-medium text-gray-900">
                            {medicine.duration}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('doctor.quantity')}:</span>
                          <span className="ml-1 font-medium text-gray-900">
                            {medicine.quantity || '-'}
                          </span>
                        </div>
                      </div>

                      {medicine.instructions && (
                        <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-100">
                          <p className="text-sm text-amber-800">
                            <Info className="w-4 h-4 inline mr-1" />
                            {medicine.instructions}
                          </p>
                        </div>
                      )}

                      {/* Timing */}
                      {medicine.timing && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {medicine.timing.map((time, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-white rounded-full text-xs text-gray-600 border border-gray-200"
                            >
                              {time}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* General Instructions */}
        {prescription.general_instructions && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              {t('doctor.generalInstructions')}
            </h4>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <p className="text-amber-900">{prescription.general_instructions}</p>
            </div>
          </div>
        )}

        {/* Follow-up */}
        {prescription.follow_up_date && (
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-700 font-medium">
                  {t('doctor.followUpAdvised')}
                </p>
                <p className="text-lg font-semibold text-primary-900">
                  {formatDate(prescription.follow_up_date, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <Calendar className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        )}

        {/* Consultation Reference */}
        {prescription.consultation_id && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">{t('doctor.linkedConsultation')}</p>
              <p className="font-medium text-gray-900">
                {formatDate(prescription.consultation_date, 'MMM d, yyyy')} • 
                {prescription.consultation_type === 'video' ? ' Video' : ' Audio'} Consultation
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ChevronRight className="w-4 h-4" />}
              onClick={() => navigate(`/doctor/consultations?id=${prescription.consultation_id}`)}
            >
              {t('common.view')}
            </Button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100">
        <Button
          variant="outline"
          leftIcon={<Edit className="w-4 h-4" />}
          onClick={() => {
            onEdit(prescription);
            onClose();
          }}
        >
          {t('common.edit')}
        </Button>
        <Button
          variant="outline"
          leftIcon={<Printer className="w-4 h-4" />}
          onClick={() => onPrint(prescription)}
        >
          {t('common.print')}
        </Button>
        <Button
          variant="outline"
          leftIcon={<Share2 className="w-4 h-4" />}
          onClick={() => onShare(prescription)}
        >
          {t('common.share')}
        </Button>
      </div>
    </Modal>
  );
};

// Create/Edit Prescription Modal
const PrescriptionFormModal = ({
  isOpen,
  onClose,
  prescription,
  onSave,
  isLoading
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    patient_id: '',
    patient_name: '',
    diagnosis: '',
    medicines: [],
    general_instructions: '',
    follow_up_days: null,
    valid_days: 30
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [newMedicine, setNewMedicine] = useState({
    name: '',
    generic_name: '',
    dosage: '',
    frequency: 'twice_daily',
    duration: '',
    duration_unit: 'days',
    quantity: '',
    instructions: '',
    timing: []
  });

  // Initialize form with prescription data
  useEffect(() => {
    if (prescription) {
      setFormData({
        patient_id: prescription.patient_id,
        patient_name: prescription.patient_name,
        diagnosis: prescription.diagnosis || '',
        medicines: prescription.medicines || [],
        general_instructions: prescription.general_instructions || '',
        follow_up_days: prescription.follow_up_days || null,
        valid_days: prescription.valid_days || 30
      });
    } else {
      setFormData({
        patient_id: '',
        patient_name: '',
        diagnosis: '',
        medicines: [],
        general_instructions: '',
        follow_up_days: null,
        valid_days: 30
      });
    }
  }, [prescription, isOpen]);

  // Search medicines
  useEffect(() => {
    const searchMedicines = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        const response = await medicineService.searchMedicines({ 
          query: searchQuery,
          page_size: 10
        });
        setSearchResults(response.data?.results || response.data || []);
      } catch (error) {
        console.error('Error searching medicines:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchMedicines, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSelectMedicine = useCallback((medicine) => {
    setNewMedicine({
      ...newMedicine,
      name: medicine.name,
      generic_name: medicine.name_generic || medicine.generic_name || '',
      medicine_id: medicine.id,
      form: medicine.medicine_type || 'other'
    });
    setSearchQuery('');
    setSearchResults([]);
    setShowAddMedicine(true);
  }, [newMedicine]);

  const handleAddMedicine = useCallback(() => {
    if (!newMedicine.name || !newMedicine.dosage || !newMedicine.duration) return;

    const frequencyLabels = {
      once_daily: 'Once Daily',
      twice_daily: 'Twice Daily',
      thrice_daily: 'Three Times Daily',
      four_times_daily: 'Four Times Daily',
      as_needed: 'As Needed',
      before_meals: 'Before Meals',
      after_meals: 'After Meals',
      at_bedtime: 'At Bedtime'
    };

    setFormData(prev => ({
      ...prev,
      medicines: [
        ...prev.medicines,
        {
          ...newMedicine,
          frequency: frequencyLabels[newMedicine.frequency] || newMedicine.frequency,
          duration: `${newMedicine.duration} ${newMedicine.duration_unit}`
        }
      ]
    }));

    setNewMedicine({
      name: '',
      generic_name: '',
      dosage: '',
      frequency: 'twice_daily',
      duration: '',
      duration_unit: 'days',
      quantity: '',
      instructions: '',
      timing: []
    });
    setShowAddMedicine(false);
  }, [newMedicine]);

  const handleRemoveMedicine = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index)
    }));
  }, []);

  const handleSubmit = useCallback(() => {
    onSave(formData);
  }, [formData, onSave]);

  const isEditMode = !!prescription;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? t('doctor.editPrescription', 'Edit Prescription') : t('doctor.newPrescription', 'New Prescription')}
      size="xl"
    >
      <div className="space-y-6">
        {/* Patient Info (read-only in edit mode) */}
        {isEditMode ? (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Avatar
              name={formData.patient_name}
              size="md"
            />
            <div>
              <p className="font-medium text-gray-900">{formData.patient_name}</p>
              <p className="text-sm text-gray-500">
                {t('doctor.editingExistingPrescription', 'Editing existing prescription')}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('doctor.selectPatient', 'Select Patient')} *
            </label>
            <SearchInput
              value={formData.patient_name}
              onChange={(value) => setFormData(prev => ({ ...prev, patient_name: value }))}
              placeholder={t('doctor.searchPatient', 'Search patient by name')}
            />
          </div>
        )}

        {/* Diagnosis */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('doctor.diagnosis', 'Diagnosis')}
          </label>
          <TextArea
            value={formData.diagnosis}
            onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
            placeholder={t('doctor.enterDiagnosis', 'Enter diagnosis')}
            rows={2}
          />
        </div>

        {/* Medicines */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">
              {t('doctor.medicines', 'Medicines')} ({formData.medicines.length})
            </label>
          </div>

          {/* Medicine Search */}
          {!showAddMedicine && (
            <div className="mb-3">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t('doctor.searchMedicineToAdd', 'Search medicine to add')}
              />

              {isSearching && (
                <div className="mt-2 text-center py-4">
                  <Loader size="sm" />
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {searchResults.map((medicine) => (
                    <button
                      key={medicine.id}
                      onClick={() => handleSelectMedicine(medicine)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <p className="font-medium text-gray-900">{medicine.name}</p>
                      <p className="text-sm text-gray-500">
                        {medicine.name_generic || medicine.generic_name} • {medicine.manufacturer || 'Generic'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add Medicine Form */}
          {showAddMedicine && (
            <div className="bg-primary-50 rounded-xl p-4 mb-3 border border-primary-100">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-gray-900">{newMedicine.name}</h5>
                <button
                  onClick={() => setShowAddMedicine(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Input
                  label={t('doctor.dosage', 'Dosage') + ' *'}
                  value={newMedicine.dosage}
                  onChange={(e) => setNewMedicine(prev => ({ ...prev, dosage: e.target.value }))}
                  placeholder="e.g., 500mg"
                />

                <Select
                  label={t('doctor.frequency', 'Frequency') + ' *'}
                  value={newMedicine.frequency}
                  onChange={(e) => setNewMedicine(prev => ({ ...prev, frequency: e.target.value }))}
                  options={[
                    { value: 'once_daily', label: 'Once Daily' },
                    { value: 'twice_daily', label: 'Twice Daily' },
                    { value: 'thrice_daily', label: 'Three Times Daily' },
                    { value: 'four_times_daily', label: 'Four Times Daily' },
                    { value: 'as_needed', label: 'As Needed' },
                    { value: 'before_meals', label: 'Before Meals' },
                    { value: 'after_meals', label: 'After Meals' },
                    { value: 'at_bedtime', label: 'At Bedtime' }
                  ]}
                />

                <div className="flex gap-2">
                  <Input
                    label={t('doctor.duration', 'Duration') + ' *'}
                    type="number"
                    value={newMedicine.duration}
                    onChange={(e) => setNewMedicine(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="7"
                    min={1}
                    className="flex-1"
                  />
                  <Select
                    label="&nbsp;"
                    value={newMedicine.duration_unit}
                    onChange={(e) => setNewMedicine(prev => ({ ...prev, duration_unit: e.target.value }))}
                    options={[
                      { value: 'days', label: 'Days' },
                      { value: 'weeks', label: 'Weeks' },
                      { value: 'months', label: 'Months' }
                    ]}
                    className="w-24"
                  />
                </div>

                <Input
                  label={t('doctor.quantity', 'Quantity')}
                  value={newMedicine.quantity}
                  onChange={(e) => setNewMedicine(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="e.g., 30 tablets"
                />

                <div className="col-span-2">
                  <Input
                    label={t('doctor.specialInstructions', 'Special Instructions')}
                    value={newMedicine.instructions}
                    onChange={(e) => setNewMedicine(prev => ({ ...prev, instructions: e.target.value }))}
                    placeholder={t('doctor.instructionsPlaceholder', 'e.g., after food, avoid driving')}
                  />
                </div>
              </div>

              <div className="flex justify-end mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={handleAddMedicine}
                  disabled={!newMedicine.dosage || !newMedicine.duration}
                >
                  {t('doctor.addToPrescription', 'Add to Prescription')}
                </Button>
              </div>
            </div>
          )}

          {/* Added Medicines List */}
          {formData.medicines.length > 0 ? (
            <div className="space-y-2">
              {formData.medicines.map((medicine, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{medicine.name}</p>
                    <p className="text-sm text-gray-500">
                      {medicine.dosage} • {medicine.frequency} • {medicine.duration}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveMedicine(index)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <Pill className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">{t('doctor.noMedicinesAdded', 'No medicines added')}</p>
            </div>
          )}
        </div>

        {/* General Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('doctor.generalInstructions', 'General Instructions')}
          </label>
          <TextArea
            value={formData.general_instructions}
            onChange={(e) => setFormData(prev => ({ ...prev, general_instructions: e.target.value }))}
            placeholder={t('doctor.generalInstructionsPlaceholder', 'Add diet, rest, and caution advice')}
            rows={2}
          />
        </div>

        {/* Follow-up & Validity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('doctor.followUpAfter', 'Follow-up After')}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={formData.follow_up_days || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, follow_up_days: e.target.value }))}
                placeholder="7"
                min={1}
              />
              <span className="text-gray-500">{t('common.days')}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('doctor.validFor', 'Valid For')}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={formData.valid_days}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_days: e.target.value }))}
                placeholder="30"
                min={1}
              />
              <span className="text-gray-500">{t('common.days')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          leftIcon={<CheckCircle className="w-4 h-4" />}
          onClick={handleSubmit}
          loading={isLoading}
          disabled={formData.medicines.length === 0}
        >
          {isEditMode ? t('common.saveChanges', 'Save Changes') : t('doctor.createPrescription', 'Create Prescription')}
        </Button>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Prescriptions = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [dateFilter, setDateFilter] = useState(searchParams.get('date') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  // Modals
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [prescriptionToEdit, setPrescriptionToEdit] = useState(null);

  // Fetch prescriptions
  const fetchPrescriptions = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      } else if (append) {
        setIsLoadingMore(true);
      }
      setError(null);

      const params = {
        page: pageNum,
        page_size: 20,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        date_filter: dateFilter !== 'all' ? dateFilter : undefined
      };

      const response = await medicineService.getPrescriptions(params);
      const data = response?.data || response || {};
      const nextBatch = data?.results || data?.data || (Array.isArray(data) ? data : []);

      if (append) {
        setPrescriptions(prev => {
          const merged = [...prev, ...nextBatch];
          setStats(calculatePrescriptionStats(merged, data.count, data.stats));
          return merged;
        });
      } else {
        setPrescriptions(nextBatch);
        setStats(calculatePrescriptionStats(nextBatch, data.count, data.stats));
      }

      const canLoadMore = Boolean(data?.next) ||
        (typeof data?.count === 'number' && pageNum * (params.page_size || 20) < data.count);
      setHasMore(canLoadMore);

    } catch (err) {
      console.error('Error fetching prescriptions:', err);
      setError(t('errors.failedToLoadPrescriptions'));
      if (!append) {
        setPrescriptions([]);
      }
      setHasMore(false);
      setStats({
        total: 0,
        active: 0,
        totalMedicines: 0,
        thisMonth: 0,
        monthTrend: 0
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [searchQuery, dateFilter, statusFilter, t]);

  // Unified fetch with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setPage(1);
      fetchPrescriptions(1);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, dateFilter, statusFilter, fetchPrescriptions]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (dateFilter !== 'all') params.set('date', dateFilter);
    if (statusFilter) params.set('status', statusFilter);
    setSearchParams(params, { replace: true });
  }, [searchQuery, dateFilter, statusFilter, setSearchParams]);

  // Handlers
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(1);
    fetchPrescriptions(1);
  }, [fetchPrescriptions]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPrescriptions(nextPage, true);
  }, [hasMore, isLoadingMore, isLoading, page, fetchPrescriptions]);

  const handleViewPrescription = useCallback((prescription) => {
    setSelectedPrescription(prescription);
    setShowDetailsModal(true);
  }, []);

  const handleEditPrescription = useCallback((prescription) => {
    setPrescriptionToEdit(prescription);
    setShowFormModal(true);
  }, []);

  const handleDuplicatePrescription = useCallback((prescription) => {
    setPrescriptionToEdit({
      ...prescription,
      id: null,
      date: new Date().toISOString(),
      status: 'active'
    });
    setShowFormModal(true);
  }, []);

  const handlePrintPrescription = useCallback((prescription) => {
    console.log('Print prescription:', prescription.id);
    window.print();
  }, []);

  const handleSharePrescription = useCallback((prescription) => {
    console.log('Share prescription:', prescription.id);
  }, []);

  const handleSavePrescription = useCallback(async (formData) => {
    try {
      setIsActionLoading(true);

      if (prescriptionToEdit?.id) {
        // Update existing
        console.log('Update prescription:', prescriptionToEdit.id, formData);
      } else {
        // Create new
        await medicineService.createPrescription(formData);
      }

      setShowFormModal(false);
      setPrescriptionToEdit(null);
      fetchPrescriptions(1);
    } catch (err) {
      console.error('Error saving prescription:', err);
      setError(t('errors.failedToSavePrescription'));
    } finally {
      setIsActionLoading(false);
    }
  }, [prescriptionToEdit, fetchPrescriptions, t]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setDateFilter('all');
    setStatusFilter('');
  }, []);

  const handleCreateNew = useCallback(() => {
    setPrescriptionToEdit(null);
    setShowFormModal(true);
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
            {t('doctor.prescriptions', 'Prescriptions')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('doctor.prescriptionsDesc', 'Create and manage patient prescriptions')}
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
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleCreateNew}
          >
            {t('doctor.newPrescription', 'New Prescription')}
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

      {/* Filters */}
      <FiltersBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onClearFilters={handleClearFilters}
      />

      {/* Prescriptions List */}
      {prescriptions.length > 0 ? (
        <>
          <div className="space-y-3">
            {prescriptions.map((prescription) => (
              <PrescriptionCard
                key={prescription.id}
                prescription={prescription}
                onView={handleViewPrescription}
                onEdit={handleEditPrescription}
                onDuplicate={handleDuplicatePrescription}
                onPrint={handlePrintPrescription}
                onShare={handleSharePrescription}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center mt-6">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isRefreshing || isLoadingMore || isLoading}
              >
                {isLoadingMore ? t('common.loading', 'Loading...') : t('common.loadMore')}
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <EmptyState
            icon={Pill}
            title={t('doctor.noPrescriptions')}
            description={
              searchQuery || dateFilter !== 'all' || statusFilter
                ? t('doctor.noPrescriptionsMatchingFilters')
                : t('doctor.noPrescriptionsDesc')
            }
            action={
              searchQuery || dateFilter !== 'all' || statusFilter ? (
                <Button variant="outline" onClick={handleClearFilters}>
                  {t('common.clearFilters')}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={handleCreateNew}
                >
                  {t('doctor.createFirstPrescription')}
                </Button>
              )
            }
          />
        </Card>
      )}

      {/* Modals */}
      <PrescriptionDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedPrescription(null);
        }}
        prescription={selectedPrescription}
        onEdit={handleEditPrescription}
        onPrint={handlePrintPrescription}
        onShare={handleSharePrescription}
      />

      <PrescriptionFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setPrescriptionToEdit(null);
        }}
        prescription={prescriptionToEdit}
        onSave={handleSavePrescription}
        isLoading={isActionLoading}
      />
    </div>
  );
};

export default Prescriptions;