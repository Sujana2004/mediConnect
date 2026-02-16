// src/pages/patient/HealthRecords.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Heart,
  Activity,
  Thermometer,
  Droplet,
  Scale,
  Ruler,
  Calendar,
  Clock,
  Plus,
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  Share2,
  Lock,
  Unlock,
  Filter,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  Pill,
  Syringe,
  Stethoscope,
  Hospital,
  User,
  Users,
  Folder,
  FolderOpen,
  File,
  Image,
  FileImage,
  FilePlus,
  RefreshCw,
  MoreVertical,
  X,
  Printer,
  ExternalLink,
  Shield,
  History,
  Clipboard,
  ClipboardList,
  Microscope,
  TestTube,
  Dna,
  Brain,
  Bone,
  Eye as EyeIcon,
  Ear,
  Wind,
  WifiOff
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth';
import { healthRecordsService } from '../../services/api';
import {
  Card,
  Button,
  Badge,
  Avatar,
  Loader,
  EmptyState,
  Modal,
  Input,
  TextArea,
  Select,
  SearchInput,
  Tabs
} from '../../components/common';
import { formatDate } from '../../utils/helpers';

const isDev = import.meta.env.DEV;

// ============================================================================
// CONSTANTS
// ============================================================================

const VITAL_TYPES = {
  blood_pressure: {
    label: 'Blood Pressure',
    icon: Heart,
    unit: 'mmHg',
    color: 'text-red-600 bg-red-100',
    normalRange: '90/60 - 120/80'
  },
  heart_rate: {
    label: 'Heart Rate',
    icon: Activity,
    unit: 'bpm',
    color: 'text-pink-600 bg-pink-100',
    normalRange: '60 - 100'
  },
  temperature: {
    label: 'Temperature',
    icon: Thermometer,
    unit: '°F',
    color: 'text-orange-600 bg-orange-100',
    normalRange: '97.8 - 99.1'
  },
  oxygen_saturation: {
    label: 'Oxygen Saturation',
    icon: Wind,
    unit: '%',
    color: 'text-blue-600 bg-blue-100',
    normalRange: '95 - 100'
  },
  blood_sugar: {
    label: 'Blood Sugar',
    icon: Droplet,
    unit: 'mg/dL',
    color: 'text-purple-600 bg-purple-100',
    normalRange: '70 - 100 (fasting)'
  },
  weight: {
    label: 'Weight',
    icon: Scale,
    unit: 'kg',
    color: 'text-green-600 bg-green-100',
    normalRange: 'BMI 18.5 - 24.9'
  },
  height: {
    label: 'Height',
    icon: Ruler,
    unit: 'cm',
    color: 'text-indigo-600 bg-indigo-100',
    normalRange: '-'
  }
};

const DOCUMENT_CATEGORIES = [
  { value: 'prescription', label: 'Prescriptions', icon: FileText },
  { value: 'lab_report', label: 'Lab Reports', icon: TestTube },
  { value: 'xray', label: 'X-Ray/Scans', icon: Microscope },
  { value: 'discharge_summary', label: 'Discharge Summary', icon: Hospital },
  { value: 'insurance', label: 'Insurance', icon: Shield },
  { value: 'other', label: 'Other', icon: Folder }
];

const CONDITION_SEVERITY = {
  mild: { color: 'bg-green-100 text-green-700', label: 'Mild' },
  moderate: { color: 'bg-yellow-100 text-yellow-700', label: 'Moderate' },
  severe: { color: 'bg-red-100 text-red-700', label: 'Severe' },
  chronic: { color: 'bg-purple-100 text-purple-700', label: 'Chronic' }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Health Summary Card
const HealthSummaryCard = ({ profile, latestVitals }) => {
  const { t } = useTranslation();

  const bmi = useMemo(() => {
    const w = latestVitals?.weight;
    const h = latestVitals?.height;
    if (!w || !h) return null;
    const heightInM = h / 100;
    return (w / (heightInM * heightInM)).toFixed(1);
  }, [latestVitals?.weight, latestVitals?.height]);

  const bmiStatus = useMemo(() => {
    if (!bmi) return null;
    const val = parseFloat(bmi);
    if (val < 18.5) return { label: 'Underweight', color: 'text-blue-600' };
    if (val < 25) return { label: 'Normal', color: 'text-green-600' };
    if (val < 30) return { label: 'Overweight', color: 'text-yellow-600' };
    return { label: 'Obese', color: 'text-red-600' };
  }, [bmi]);

  return (
    <Card className="bg-gradient-to-br from-primary-50 to-blue-50">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clipboard className="w-5 h-5 text-primary-600" />
          {t('healthRecords.healthSummary', 'Health Summary')}
        </h3>
        <Badge variant="success">
          <CheckCircle className="w-3 h-3 mr-1" />
          {t('healthRecords.upToDate', 'Up to date')}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/70 rounded-xl p-3 text-center">
          <Droplet className="w-6 h-6 text-red-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">
            {profile?.blood_group || '-'}
          </p>
          <p className="text-xs text-gray-500">{t('healthRecords.bloodType', 'Blood Type')}</p>
        </div>

        <div className="bg-white/70 rounded-xl p-3 text-center">
          <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">
            {profile?.age || '-'}
          </p>
          <p className="text-xs text-gray-500">{t('common.years', 'Years')}</p>
        </div>

        <div className="bg-white/70 rounded-xl p-3 text-center">
          <Scale className="w-6 h-6 text-green-500 mx-auto mb-1" />
          <p className={`text-2xl font-bold ${bmiStatus?.color || 'text-gray-900'}`}>
            {bmi || '-'}
          </p>
          <p className="text-xs text-gray-500">
            BMI {bmiStatus && `(${bmiStatus.label})`}
          </p>
        </div>

        <div className="bg-white/70 rounded-xl p-3 text-center">
          <Stethoscope className="w-6 h-6 text-purple-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900">
            {profile?.last_checkup
              ? formatDate(profile.last_checkup, 'MMM d')
              : '-'}
          </p>
          <p className="text-xs text-gray-500">{t('healthRecords.lastCheckup', 'Last Checkup')}</p>
        </div>
      </div>

      {profile?.allergies?.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium text-sm">{t('common.allergies', 'Allergies')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.allergies.map((allergy, index) => (
              <Badge key={index} variant="danger" size="sm">
                {typeof allergy === 'string' ? allergy : allergy.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

// Vitals Section
const VitalsSection = ({ vitals, latestVitals, onAddVital, onViewHistory }) => {
  const { t } = useTranslation();
  const [expandedVital, setExpandedVital] = useState(null);

  const getVitalStatus = useCallback((type, value) => {
    if (!value) return 'normal';

    if (type === 'blood_pressure' && typeof value === 'string') {
      const [systolic] = value.split('/').map(Number);
      if (systolic > 140) return 'high';
      if (systolic < 90) return 'low';
    }
    if (type === 'heart_rate') {
      if (value > 100) return 'high';
      if (value < 60) return 'low';
    }
    if (type === 'temperature') {
      if (value > 99.5) return 'high';
      if (value < 97) return 'low';
    }
    if (type === 'oxygen_saturation') {
      if (value < 95) return 'low';
    }

    return 'normal';
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'high': return 'text-red-600';
      case 'low': return 'text-blue-600';
      default: return 'text-green-600';
    }
  }, []);

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-600" />
          {t('healthRecords.vitals', 'Vitals')}
        </h3>
        <div className="flex items-center gap-2">
          {onViewHistory && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<BarChart3 className="w-4 h-4" />}
              onClick={onViewHistory}
            >
              {t('healthRecords.viewTrends', 'View Trends')}
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={onAddVital}
          >
            {t('healthRecords.addVital', 'Add Vital')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.entries(VITAL_TYPES).map(([key, config]) => {
          const Icon = config.icon;
          const value = latestVitals?.[key];
          const status = getVitalStatus(key, value);
          const statusColor = getStatusColor(status);

          return (
            <button
              key={key}
              onClick={() => setExpandedVital(expandedVital === key ? null : key)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                expandedVital === key
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {value && status !== 'normal' && (
                  <Badge
                    variant={status === 'high' ? 'danger' : 'primary'}
                    size="sm"
                  >
                    {status === 'high' ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                  </Badge>
                )}
              </div>
              <p className={`text-xl font-bold ${value ? statusColor : 'text-gray-400'}`}>
                {value || '-'}
                <span className="text-sm font-normal text-gray-500 ml-1">
                  {config.unit}
                </span>
              </p>
              <p className="text-sm text-gray-600 mt-1">{config.label}</p>
              {latestVitals?.[`${key}_date`] && (
                <p className="text-xs text-gray-400 mt-1">
                  {formatDate(latestVitals[`${key}_date`], 'MMM d, h:mm a')}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {expandedVital && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">
              {VITAL_TYPES[expandedVital].label} {t('healthRecords.history', 'History')}
            </h4>
            <Button variant="ghost" size="sm" onClick={() => setExpandedVital(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-sm text-gray-500">
            <p>{t('healthRecords.normalRange', 'Normal Range')}: {VITAL_TYPES[expandedVital].normalRange}</p>
            <div className="h-32 bg-white rounded-lg mt-3 flex items-center justify-center text-gray-400">
              <LineChart className="w-8 h-8 mr-2" />
              {t('healthRecords.trendChart', 'Trend Chart')}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

// Medical Conditions Section
const ConditionsSection = ({ conditions, onAdd, onEdit, onDelete }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary-600" />
          {t('healthRecords.medicalConditions', 'Medical Conditions')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onAdd}
        >
          {t('common.add', 'Add')}
        </Button>
      </div>

      {conditions?.length > 0 ? (
        <div className="space-y-3">
          {conditions.map((condition, index) => {
            const severityConfig = CONDITION_SEVERITY[condition.severity] || CONDITION_SEVERITY.moderate;

            return (
              <div
                key={condition.id || index}
                className="flex items-start justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-gray-900">{condition.name}</h4>
                    <Badge variant="secondary" size="sm" className={severityConfig.color}>
                      {severityConfig.label}
                    </Badge>
                    {condition.is_active && (
                      <Badge variant="primary" size="sm">
                        {t('common.active', 'Active')}
                      </Badge>
                    )}
                  </div>
                  {condition.diagnosed_date && (
                    <p className="text-sm text-gray-500 mt-1">
                      {t('healthRecords.diagnosed', 'Diagnosed')}: {formatDate(condition.diagnosed_date, 'MMMM yyyy')}
                    </p>
                  )}
                  {condition.notes && (
                    <p className="text-sm text-gray-600 mt-2">{condition.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(condition)}
                    aria-label={t('common.edit', 'Edit')}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(condition)}
                    className="text-red-500 hover:text-red-600"
                    aria-label={t('common.delete', 'Delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle}
          title={t('healthRecords.noConditions', 'No conditions recorded')}
          description={t('healthRecords.noConditionsDesc', 'Add your medical conditions for better health tracking')}
          compact
        />
      )}
    </Card>
  );
};

// Allergies Section
const AllergiesSection = ({ allergies, onAdd, onDelete }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          {t('common.allergies', 'Allergies')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onAdd}
        >
          {t('common.add', 'Add')}
        </Button>
      </div>

      {allergies?.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {allergies.map((allergy, index) => {
            const name = typeof allergy === 'string' ? allergy : allergy.name;
            return (
              <div
                key={allergy.id || index}
                className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-full"
              >
                <span className="text-red-700 font-medium">{name}</span>
                <button
                  onClick={() => onDelete(allergy)}
                  className="text-red-400 hover:text-red-600"
                  aria-label={t('common.remove', 'Remove')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">
          {t('healthRecords.noAllergies', 'No allergies recorded')}
        </p>
      )}
    </Card>
  );
};

// Documents Section
const DocumentsSection = ({
  documents,
  onUpload,
  onView,
  onDownload,
  onDelete,
  onShare
}) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocuments = useMemo(() => {
    let filtered = documents || [];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.document_type === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.title?.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [documents, selectedCategory, searchQuery]);

  const getDocIcon = useCallback((type) => {
    if (type?.includes('image')) return FileImage;
    return File;
  }, []);

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Folder className="w-5 h-5 text-primary-600" />
          {t('healthRecords.documents', 'Documents')}
        </h3>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Upload className="w-4 h-4" />}
          onClick={onUpload}
        >
          {t('healthRecords.uploadDocument', 'Upload')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('healthRecords.searchDocuments', 'Search documents...')}
          className="flex-1"
        />
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('common.all', 'All')}
          </button>
          {DOCUMENT_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const DocIcon = getDocIcon(doc.file_type);
            const category = DOCUMENT_CATEGORIES.find(c => c.value === doc.document_type);
            const CategoryIcon = category?.icon || File;

            return (
              <div
                key={doc.id}
                className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <DocIcon className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {doc.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" size="sm">
                          <CategoryIcon className="w-3 h-3 mr-1" />
                          {category?.label || 'Other'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {doc.description && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                    {doc.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    {formatDate(doc.created_at || doc.document_date, 'MMM d, yyyy')}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onView(doc)} aria-label={t('common.view', 'View')}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDownload(doc)} aria-label={t('common.download', 'Download')}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onShare(doc)} aria-label={t('common.share', 'Share')}>
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(doc)}
                      className="text-red-500 hover:text-red-600"
                      aria-label={t('common.delete', 'Delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={FolderOpen}
          title={t('healthRecords.noDocuments', 'No documents yet')}
          description={t('healthRecords.noDocumentsDesc', 'Upload your medical documents to keep them organized')}
          action={
            <Button
              variant="outline"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={onUpload}
            >
              {t('healthRecords.uploadFirst', 'Upload First Document')}
            </Button>
          }
          compact
        />
      )}
    </Card>
  );
};

// Lab Reports Section
const LabReportsSection = ({ reports, onView, onUpload }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <TestTube className="w-5 h-5 text-primary-600" />
          {t('healthRecords.labReports', 'Lab Reports')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onUpload}
        >
          {t('common.add', 'Add')}
        </Button>
      </div>

      {reports?.length > 0 ? (
        <div className="space-y-3">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => onView(report)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Microscope className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{report.name}</h4>
                  <p className="text-sm text-gray-500">
                    {report.lab_name} • {formatDate(report.date, 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {report.has_abnormal && (
                  <Badge variant="warning" size="sm">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {t('healthRecords.review', 'Review')}
                  </Badge>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={TestTube}
          title={t('healthRecords.noLabReports', 'No lab reports')}
          description={t('healthRecords.noLabReportsDesc', 'Upload your lab reports to track results')}
          compact
        />
      )}
    </Card>
  );
};

// Vaccinations Section
const VaccinationsSection = ({ vaccinations, onAdd }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Syringe className="w-5 h-5 text-primary-600" />
          {t('healthRecords.vaccinations', 'Vaccinations')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onAdd}
        >
          {t('common.add', 'Add')}
        </Button>
      </div>

      {vaccinations?.length > 0 ? (
        <div className="space-y-3">
          {vaccinations.map((vax, index) => (
            <div
              key={vax.id || index}
              className="flex items-center justify-between p-3 bg-green-50 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{vax.name}</h4>
                  <p className="text-sm text-gray-500">
                    {formatDate(vax.date, 'MMM d, yyyy')}
                    {vax.dose && ` • ${t('healthRecords.dose', 'Dose')} ${vax.dose}`}
                  </p>
                </div>
              </div>
              {vax.next_due && (
                <Badge variant="primary" size="sm">
                  {t('healthRecords.next', 'Next')}: {formatDate(vax.next_due, 'MMM yyyy')}
                </Badge>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Syringe}
          title={t('healthRecords.noVaccinations', 'No vaccinations recorded')}
          description={t('healthRecords.noVaccinationsDesc', 'Keep track of your immunization history')}
          compact
        />
      )}
    </Card>
  );
};

// Family History Section
const FamilyHistorySection = ({ familyHistory, onAdd, onEdit }) => {
  const { t } = useTranslation();

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-600" />
          {t('healthRecords.familyHistory', 'Family History')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onAdd}
        >
          {t('common.add', 'Add')}
        </Button>
      </div>

      {familyHistory?.length > 0 ? (
        <div className="space-y-3">
          {familyHistory.map((item, index) => (
            <div
              key={item.id || index}
              className="flex items-start justify-between p-4 bg-gray-50 rounded-xl"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{item.relation}</Badge>
                  <span className="font-medium text-gray-900">{item.condition}</span>
                </div>
                {item.notes && (
                  <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => onEdit(item)} aria-label={t('common.edit', 'Edit')}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title={t('healthRecords.noFamilyHistory', 'No family history recorded')}
          description={t('healthRecords.noFamilyHistoryDesc', 'Record hereditary conditions for better health insights')}
          compact
        />
      )}
    </Card>
  );
};

// Add Vital Modal
const AddVitalModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    type: 'blood_pressure',
    value: '',
    systolic: '',
    diastolic: '',
    notes: ''
  });

  const selectedVitalConfig = VITAL_TYPES[formData.type];

  const handleSave = useCallback(() => {
    // Map UI types to API field names
    const vitalData = {};

    switch (formData.type) {
      case 'blood_pressure':
        if (!formData.systolic || !formData.diastolic) return;
        vitalData.systolic_bp = parseInt(formData.systolic);
        vitalData.diastolic_bp = parseInt(formData.diastolic);
        break;
      case 'heart_rate':
        if (!formData.value) return;
        vitalData.heart_rate = parseInt(formData.value);
        break;
      case 'temperature':
        if (!formData.value) return;
        vitalData.temperature = String(formData.value);
        break;
      case 'oxygen_saturation':
        if (!formData.value) return;
        vitalData.oxygen_saturation = parseInt(formData.value);
        break;
      case 'blood_sugar':
        if (!formData.value) return;
        vitalData.blood_sugar = parseInt(formData.value);
        break;
      case 'weight':
        if (!formData.value) return;
        vitalData.weight_kg = String(formData.value);
        break;
      default:
        return;
    }

    onSave(vitalData);
  }, [formData, onSave]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ type: 'blood_pressure', value: '', systolic: '', diastolic: '', notes: '' });
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('healthRecords.addVital', 'Add Vital')}
      size="md"
    >
      <div className="space-y-4">
        <Select
          label={t('healthRecords.vitalType', 'Vital Type')}
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value, value: '', systolic: '', diastolic: '' })}
          options={Object.entries(VITAL_TYPES).map(([key, config]) => ({
            value: key,
            label: config.label
          }))}
        />

        {formData.type === 'blood_pressure' ? (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('healthRecords.systolic', 'Systolic')}
              type="number"
              value={formData.systolic}
              onChange={(e) => setFormData({ ...formData, systolic: e.target.value })}
              placeholder="120"
            />
            <Input
              label={t('healthRecords.diastolic', 'Diastolic')}
              type="number"
              value={formData.diastolic}
              onChange={(e) => setFormData({ ...formData, diastolic: e.target.value })}
              placeholder="80"
            />
          </div>
        ) : (
          <Input
            label={`${selectedVitalConfig?.label} (${selectedVitalConfig?.unit})`}
            type="number"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            placeholder={`Enter ${selectedVitalConfig?.label?.toLowerCase()}`}
          />
        )}

        <TextArea
          label={t('common.notes', 'Notes')}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder={t('healthRecords.vitalNotesPlaceholder', 'Add any notes...')}
          rows={2}
        />

        {selectedVitalConfig && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <Info className="w-4 h-4 inline mr-1" />
              {t('healthRecords.normalRange', 'Normal range')}: {selectedVitalConfig.normalRange}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={isLoading}
          disabled={
            formData.type === 'blood_pressure'
              ? !formData.systolic || !formData.diastolic
              : !formData.value
          }
        >
          {t('common.save', 'Save')}
        </Button>
      </div>
    </Modal>
  );
};

// Upload Document Modal
const UploadDocumentModal = ({ isOpen, onClose, onUpload, isLoading }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'prescription',
    description: '',
    file: null
  });
  const [preview, setPreview] = useState(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', category: 'prescription', description: '', file: null });
      setPreview(null);
    }
  }, [isOpen]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, file, name: prev.name || file.name }));

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    }
  }, []);

  const handleUpload = useCallback(() => {
    if (!formData.file || !formData.name) return;
    const uploadData = {
      file: formData.file,
      title: formData.name,
      document_type: formData.category,
    };
    onUpload(uploadData);
  }, [formData, onUpload]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('healthRecords.uploadDocument', 'Upload Document')}
      size="md"
    >
      <div className="space-y-4">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 transition-colors"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          aria-label={t('healthRecords.selectFile', 'Select file')}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />

          {preview ? (
            <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
          ) : formData.file ? (
            <div className="flex items-center justify-center gap-3">
              <File className="w-12 h-12 text-gray-400" />
              <span className="text-gray-600">{formData.file.name}</span>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">{t('healthRecords.dragDropFile', 'Click to select file')}</p>
              <p className="text-sm text-gray-400 mt-1">
                {t('healthRecords.supportedFormats', 'PDF, Images, DOC (Max 10MB)')}
              </p>
            </>
          )}
        </div>

        <Input
          label={t('healthRecords.documentName', 'Document Name')}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t('healthRecords.enterDocumentName', 'Enter document name')}
        />

        <Select
          label={t('healthRecords.category', 'Category')}
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          options={DOCUMENT_CATEGORIES}
        />

        <TextArea
          label={t('common.description', 'Description')}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder={t('healthRecords.documentDescPlaceholder', 'Optional description...')}
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleUpload}
          loading={isLoading}
          disabled={!formData.file || !formData.name}
        >
          {t('common.upload', 'Upload')}
        </Button>
      </div>
    </Modal>
  );
};

// Share Records Modal
const ShareRecordsModal = ({ isOpen, onClose, sharedWith, onShare, onRevoke, isRevoking }) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('healthRecords.shareRecords', 'Share Records')}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-gray-600">
          {t('healthRecords.shareRecordsDesc', 'Control which doctors can access your health records')}
        </p>

        {sharedWith?.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">
              {t('healthRecords.currentlySharedWith', 'Currently shared with')}
            </h4>
            {sharedWith.map((doctor) => (
              <div
                key={doctor.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={doctor.name} src={doctor.avatar} size="sm" />
                  <div>
                    <p className="font-medium text-gray-900">Dr. {doctor.name}</p>
                    <p className="text-sm text-gray-500">{doctor.specialization}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRevoke(doctor.id)}
                  className="text-red-600 border-red-300"
                  loading={isRevoking === doctor.id}
                >
                  <Lock className="w-4 h-4 mr-1" />
                  {t('healthRecords.revoke', 'Revoke')}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-xl">
            <Share2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">{t('healthRecords.notSharedYet', 'Not shared with anyone')}</p>
          </div>
        )}

        <Button
          variant="primary"
          fullWidth
          leftIcon={<Share2 className="w-4 h-4" />}
          onClick={onShare}
        >
          {t('healthRecords.shareWithDoctor', 'Share with a Doctor')}
        </Button>
      </div>

      <div className="flex justify-end mt-6">
        <Button variant="outline" onClick={onClose}>
          {t('common.close', 'Close')}
        </Button>
      </div>
    </Modal>
  );
};

// Delete Confirmation Modal
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="py-4">
        <p className="text-gray-600">{message}</p>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} fullWidth>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm} fullWidth loading={isLoading}>
            {t('common.delete', 'Delete')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Add Condition Modal
const AddConditionModal = ({ isOpen, onClose, onSave, editData, isLoading }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    severity: 'mild',
    is_active: true,
    diagnosed_date: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen && editData) {
      setFormData({
        name: editData.name || '',
        severity: editData.severity || 'mild',
        is_active: editData.is_active ?? true,
        diagnosed_date: editData.diagnosed_date || '',
        notes: editData.notes || ''
      });
    } else if (isOpen) {
      setFormData({ name: '', severity: 'mild', is_active: true, diagnosed_date: '', notes: '' });
    }
  }, [isOpen, editData]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editData ? t('healthRecords.editCondition', 'Edit Condition') : t('healthRecords.addCondition', 'Add Condition')}
      size="md"
    >
      <div className="space-y-4">
        <Input
          label={t('healthRecords.conditionName', 'Condition Name')}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t('healthRecords.enterConditionName', 'e.g., Hypertension')}
          required
        />
        <Select
          label={t('healthRecords.severity', 'Severity')}
          value={formData.severity}
          onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
          options={Object.entries(CONDITION_SEVERITY).map(([key, val]) => ({ value: key, label: val.label }))}
        />
        <Input
          label={t('healthRecords.diagnosedDate', 'Diagnosed Date')}
          type="date"
          value={formData.diagnosed_date}
          onChange={(e) => setFormData({ ...formData, diagnosed_date: e.target.value })}
        />
        <TextArea
          label={t('common.notes', 'Notes')}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
        />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
        <Button variant="primary" onClick={() => onSave(formData)} loading={isLoading} disabled={!formData.name.trim()}>
          {t('common.save', 'Save')}
        </Button>
      </div>
    </Modal>
  );
};

// Add Allergy Modal
const AddAllergyModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) setName('');
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('healthRecords.addAllergy', 'Add Allergy')} size="sm">
      <div className="space-y-4">
        <Input
          label={t('healthRecords.allergyName', 'Allergy Name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('healthRecords.enterAllergyName', 'e.g., Penicillin')}
          required
        />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
        <Button variant="primary" onClick={() => onSave({ name })} loading={isLoading} disabled={!name.trim()}>
          {t('common.add', 'Add')}
        </Button>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const HealthRecords = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ── Online status ──
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ── Tab state ──
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = useCallback((tab) => {
    setSearchParams({ tab });
  }, [setSearchParams]);

  const tabs = useMemo(() => [
    { id: 'overview', label: t('healthRecords.overview', 'Overview'), icon: Clipboard },
    { id: 'vitals', label: t('healthRecords.vitals', 'Vitals'), icon: Activity },
    { id: 'documents', label: t('healthRecords.documents', 'Documents'), icon: Folder },
    { id: 'history', label: t('healthRecords.medicalHistory', 'Medical History'), icon: History }
  ], [t]);

  // ── Modal states ──
  const [showVitalModal, setShowVitalModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [editCondition, setEditCondition] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'document'|'condition'|'allergy', item }
  const [revokingDoctorId, setRevokingDoctorId] = useState(null);

  // ══════════════════════════════════════════
  // TanStack Queries
  // ══════════════════════════════════════════

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['healthProfile'],
    queryFn: () => healthRecordsService.getProfile(),
    staleTime: 1000 * 60 * 5,
    enabled: isOnline
  });

  const { data: vitalsData, isLoading: vitalsLoading } = useQuery({
    queryKey: ['latestVitals'],
    queryFn: () => healthRecordsService.getLatestVitals(),
    staleTime: 1000 * 60 * 5,
    enabled: isOnline
  });

  const { data: conditionsData, isLoading: conditionsLoading } = useQuery({
    queryKey: ['conditions'],
    queryFn: () => healthRecordsService.getConditions(),
    staleTime: 1000 * 60 * 5,
    enabled: isOnline
  });

  const { data: allergiesData } = useQuery({
    queryKey: ['allergies'],
    queryFn: () => healthRecordsService.getAllergies(),
    staleTime: 1000 * 60 * 5,
    enabled: isOnline
  });

  const { data: documentsData } = useQuery({
    queryKey: ['documents'],
    queryFn: () => healthRecordsService.getDocuments(),
    staleTime: 1000 * 60 * 5,
    enabled: isOnline
  });

  const { data: labReportsData } = useQuery({
    queryKey: ['labReports'],
    queryFn: () => healthRecordsService.getLabReports(),
    staleTime: 1000 * 60 * 5,
    enabled: isOnline
  });

  const { data: vaccinationsData } = useQuery({
    queryKey: ['vaccinations'],
    queryFn: () => healthRecordsService.getVaccinations(),
    staleTime: 1000 * 60 * 5,
    enabled: isOnline
  });

  const { data: familyHistoryData } = useQuery({
    queryKey: ['familyHistory'],
    queryFn: () => healthRecordsService.getFamilyHistory(),
    staleTime: 1000 * 60 * 5,
    enabled: isOnline
  });

  const { data: sharingData } = useQuery({
    queryKey: ['healthSharing'],
    queryFn: () => healthRecordsService.getSharing(),
    staleTime: 1000 * 60 * 5,
    enabled: isOnline
  });

  // ── Derived data ──
  const profile = profileData?.data || profileData;
  // API returns paginated {count, results} - extract first result
  const vitalRecords = vitalsData?.results || [];
  const latestVitals = vitalRecords.length > 0 ? {
    blood_pressure: vitalRecords[0].bp_display || `${vitalRecords[0].systolic_bp}/${vitalRecords[0].diastolic_bp}`,
    heart_rate: vitalRecords[0].heart_rate,
    temperature: vitalRecords[0].temperature,
    oxygen_saturation: vitalRecords[0].oxygen_saturation,
    blood_sugar: vitalRecords[0].blood_sugar,
    weight: vitalRecords[0].weight_kg,
    height: profile?.height_cm, // Height comes from profile, not vitals
    blood_pressure_date: vitalRecords[0].recorded_at,
    heart_rate_date: vitalRecords[0].recorded_at,
    temperature_date: vitalRecords[0].recorded_at,
    oxygen_saturation_date: vitalRecords[0].recorded_at,
    blood_sugar_date: vitalRecords[0].recorded_at,
    weight_date: vitalRecords[0].recorded_at,
  } : { height: profile?.height_cm };
  const conditions = conditionsData?.data || conditionsData || [];
  const allergies = allergiesData?.data || allergiesData || [];
  // API returns paginated response {count, results, next, previous}
  const documents = documentsData?.results || documentsData?.data || documentsData || [];
  const labReports = labReportsData?.data || labReportsData || [];
  const vaccinations = vaccinationsData?.data || vaccinationsData || [];
  const familyHistory = familyHistoryData?.data || familyHistoryData || [];
  const sharedWith = sharingData?.data || sharingData || [];

  const isInitialLoading = profileLoading || vitalsLoading;

  // ══════════════════════════════════════════
  // Mutations
  // ══════════════════════════════════════════

  const addVitalMutation = useMutation({
    mutationFn: (data) => healthRecordsService.addVitals(data),
    onSuccess: () => {
      toast.success(t('healthRecords.vitalAdded', 'Vital recorded successfully'));
      setShowVitalModal(false);
      queryClient.invalidateQueries({ queryKey: ['latestVitals'] });
    },
    onError: (err) => {
      if (isDev) console.error('Error adding vital:', err);
      toast.error(t('healthRecords.vitalError', 'Failed to record vital'));
    }
  });

  const uploadDocMutation = useMutation({
    mutationFn: (formData) => healthRecordsService.uploadDocument(formData),
    onSuccess: () => {
      toast.success(t('healthRecords.documentUploaded', 'Document uploaded successfully'));
      setShowUploadModal(false);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => {
      if (isDev) console.error('Error uploading document:', err);
      toast.error(t('healthRecords.uploadError', 'Failed to upload document'));
    }
  });

  const addConditionMutation = useMutation({
    mutationFn: (data) => healthRecordsService.addCondition(data),
    onSuccess: () => {
      toast.success(t('healthRecords.conditionSaved', 'Condition saved'));
      setShowConditionModal(false);
      setEditCondition(null);
      queryClient.invalidateQueries({ queryKey: ['conditions'] });
    },
    onError: (err) => {
      if (isDev) console.error('Error saving condition:', err);
      toast.error(t('healthRecords.conditionError', 'Failed to save condition'));
    }
  });

  const addAllergyMutation = useMutation({
    mutationFn: (data) => healthRecordsService.addAllergy(data),
    onSuccess: () => {
      toast.success(t('healthRecords.allergyAdded', 'Allergy added'));
      setShowAllergyModal(false);
      queryClient.invalidateQueries({ queryKey: ['allergies'] });
      queryClient.invalidateQueries({ queryKey: ['healthProfile'] });
    },
    onError: (err) => {
      if (isDev) console.error('Error adding allergy:', err);
      toast.error(t('healthRecords.allergyError', 'Failed to add allergy'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ type, item }) => {
      // Route to correct service based on type
      switch (type) {
        case 'document':
          return healthRecordsService.deleteDocument?.(item.id) ||
            Promise.reject(new Error('Delete not available'));
        case 'condition':
          return healthRecordsService.deleteCondition?.(item.id) ||
            Promise.reject(new Error('Delete not available'));
        case 'allergy':
          return healthRecordsService.deleteAllergy?.(item.id) ||
            Promise.reject(new Error('Delete not available'));
        default:
          return Promise.reject(new Error('Unknown type'));
      }
    },
    onSuccess: (_, { type }) => {
      toast.success(t('common.deleted', 'Deleted successfully'));
      setDeleteTarget(null);
      // Invalidate the right query
      const queryMap = { document: 'documents', condition: 'conditions', allergy: 'allergies' };
      queryClient.invalidateQueries({ queryKey: [queryMap[type]] });
      if (type === 'allergy') {
        queryClient.invalidateQueries({ queryKey: ['healthProfile'] });
      }
    },
    onError: (err) => {
      if (isDev) console.error('Error deleting:', err);
      toast.error(t('common.deleteError', 'Failed to delete'));
    }
  });

  const revokeMutation = useMutation({
    mutationFn: (doctorId) => healthRecordsService.revokeAccess?.(doctorId) ||
      healthRecordsService.shareWithDoctor?.({ doctor_id: doctorId, revoke: true }) ||
      Promise.reject(new Error('Revoke not available')),
    onSuccess: () => {
      toast.success(t('healthRecords.accessRevoked', 'Access revoked'));
      setRevokingDoctorId(null);
      queryClient.invalidateQueries({ queryKey: ['healthSharing'] });
    },
    onError: (err) => {
      if (isDev) console.error('Error revoking access:', err);
      toast.error(t('healthRecords.revokeError', 'Failed to revoke access'));
      setRevokingDoctorId(null);
    }
  });

  // ══════════════════════════════════════════
  // Handlers
  // ══════════════════════════════════════════

  const handleAddVital = useCallback((data) => {
    addVitalMutation.mutate(data);
  }, [addVitalMutation]);

  const handleUploadDocument = useCallback((formData) => {
    uploadDocMutation.mutate(formData);
  }, [uploadDocMutation]);

  const handleViewDocument = useCallback((doc) => {
    if (doc.url) {
      window.open(doc.url, '_blank');
    } else {
      toast.error(t('healthRecords.noPreview', 'Preview not available'));
    }
  }, [t]);

  const handleDownloadDocument = useCallback((doc) => {
    if (doc.url) {
      const link = document.createElement('a');
      link.href = doc.url;
      link.download = doc.name;
      link.click();
    } else {
      toast.error(t('healthRecords.noDownload', 'Download not available'));
    }
  }, [t]);

  const handleDeleteItem = useCallback((type, item) => {
    setDeleteTarget({ type, item });
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget);
    }
  }, [deleteTarget, deleteMutation]);

  const handleEditCondition = useCallback((condition) => {
    setEditCondition(condition);
    setShowConditionModal(true);
  }, []);

  const handleSaveCondition = useCallback((data) => {
    addConditionMutation.mutate(data);
  }, [addConditionMutation]);

  const handleAddAllergy = useCallback((data) => {
    addAllergyMutation.mutate(data);
  }, [addAllergyMutation]);

  const handleShareWithDoctor = useCallback(() => {
    navigate('/patient/doctors', { state: { shareRecords: true } });
  }, [navigate]);

  const handleRevokeAccess = useCallback((doctorId) => {
    setRevokingDoctorId(doctorId);
    revokeMutation.mutate(doctorId);
  }, [revokeMutation]);

  const handleViewLabReport = useCallback((report) => {
    if (report.url) {
      window.open(report.url, '_blank');
    } else {
      toast(t('healthRecords.labReportDetail', 'Lab report details coming soon'), { icon: '🔬' });
    }
  }, [t]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['healthProfile'] });
    queryClient.invalidateQueries({ queryKey: ['latestVitals'] });
    queryClient.invalidateQueries({ queryKey: ['conditions'] });
    queryClient.invalidateQueries({ queryKey: ['allergies'] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['labReports'] });
    queryClient.invalidateQueries({ queryKey: ['vaccinations'] });
    queryClient.invalidateQueries({ queryKey: ['familyHistory'] });
    queryClient.invalidateQueries({ queryKey: ['healthSharing'] });
    toast.success(t('common.refreshed', 'Refreshed'));
  }, [queryClient, t]);

  // ══════════════════════════════════════════
  // RENDER: Offline
  // ══════════════════════════════════════════
  if (!isOnline) {
    return (
      <div className="space-y-6 pb-20 md:pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('healthRecords.title', 'Health Records')}
          </h1>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={WifiOff}
            title={t('common.offline', 'You are offline')}
            description={t('healthRecords.offlineDesc', 'Health records require an internet connection. Please check your connection.')}
            action={
              <Button onClick={() => window.location.reload()} leftIcon={<RefreshCw size={18} />}>
                {t('common.retry', 'Retry')}
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // RENDER: Loading
  // ══════════════════════════════════════════
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  // ══════════════════════════════════════════
  // RENDER: Main
  // ══════════════════════════════════════════
  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('healthRecords.title', 'Health Records')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('healthRecords.subtitle', 'Manage your complete health history')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Share2 className="w-4 h-4" />}
            onClick={() => setShowShareModal(true)}
          >
            {t('healthRecords.share', 'Share')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
          >
            {t('healthRecords.export', 'Export')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={handleRefresh}
          >
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="pills"
      />

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <HealthSummaryCard profile={profile} latestVitals={latestVitals} />

          <VitalsSection
            latestVitals={latestVitals}
            onAddVital={() => setShowVitalModal(true)}
            onViewHistory={() => setActiveTab('vitals')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AllergiesSection
              allergies={allergies}
              onAdd={() => setShowAllergyModal(true)}
              onDelete={(allergy) => handleDeleteItem('allergy', allergy)}
            />
            <ConditionsSection
              conditions={conditions}
              onAdd={() => { setEditCondition(null); setShowConditionModal(true); }}
              onEdit={handleEditCondition}
              onDelete={(condition) => handleDeleteItem('condition', condition)}
            />
          </div>
        </div>
      )}

      {activeTab === 'vitals' && (
        <div className="space-y-6">
          <VitalsSection
            latestVitals={latestVitals}
            onAddVital={() => setShowVitalModal(true)}
          />
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-6">
          <DocumentsSection
            documents={documents}
            onUpload={() => setShowUploadModal(true)}
            onView={handleViewDocument}
            onDownload={handleDownloadDocument}
            onDelete={(doc) => handleDeleteItem('document', doc)}
            onShare={() => setShowShareModal(true)}
          />
          <LabReportsSection
            reports={labReports}
            onView={handleViewLabReport}
            onUpload={() => setShowUploadModal(true)}
          />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          <ConditionsSection
            conditions={conditions}
            onAdd={() => { setEditCondition(null); setShowConditionModal(true); }}
            onEdit={handleEditCondition}
            onDelete={(condition) => handleDeleteItem('condition', condition)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <VaccinationsSection
              vaccinations={vaccinations}
              onAdd={() => toast(t('common.comingSoon', 'Coming soon'), { icon: '🚀' })}
            />
            <FamilyHistorySection
              familyHistory={familyHistory}
              onAdd={() => toast(t('common.comingSoon', 'Coming soon'), { icon: '🚀' })}
              onEdit={() => toast(t('common.comingSoon', 'Coming soon'), { icon: '🚀' })}
            />
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <AddVitalModal
        isOpen={showVitalModal}
        onClose={() => setShowVitalModal(false)}
        onSave={handleAddVital}
        isLoading={addVitalMutation.isPending}
      />

      <UploadDocumentModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUploadDocument}
        isLoading={uploadDocMutation.isPending}
      />

      <ShareRecordsModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        sharedWith={sharedWith}
        onShare={handleShareWithDoctor}
        onRevoke={handleRevokeAccess}
        isRevoking={revokingDoctorId}
      />

      <AddConditionModal
        isOpen={showConditionModal}
        onClose={() => { setShowConditionModal(false); setEditCondition(null); }}
        onSave={handleSaveCondition}
        editData={editCondition}
        isLoading={addConditionMutation.isPending}
      />

      <AddAllergyModal
        isOpen={showAllergyModal}
        onClose={() => setShowAllergyModal(false)}
        onSave={handleAddAllergy}
        isLoading={addAllergyMutation.isPending}
      />

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('common.confirmDelete', 'Confirm Delete')}
        message={t('common.confirmDeleteMessage', 'Are you sure you want to delete this? This action cannot be undone.')}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default HealthRecords;