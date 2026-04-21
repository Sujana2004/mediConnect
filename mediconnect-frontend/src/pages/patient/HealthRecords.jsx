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
import { healthRecordsService, authService } from '../../services/api';
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
    color: 'text-red-500 bg-red-50',
    normalRange: '90/60 - 120/80'
  },
  heart_rate: {
    label: 'Heart Rate',
    icon: Activity,
    unit: 'bpm',
    color: 'text-pink-500 bg-pink-50',
    normalRange: '60 - 100'
  },
  temperature: {
    label: 'Temperature',
    icon: Thermometer,
    unit: '°F',
    color: 'text-orange-500 bg-orange-50',
    normalRange: '97.8 - 99.1'
  },
  oxygen_saturation: {
    label: 'Oxygen Saturation',
    icon: Wind,
    unit: '%',
    color: 'text-blue-500 bg-blue-50',
    normalRange: '95 - 100'
  },
  blood_sugar: {
    label: 'Blood Sugar',
    icon: Droplet,
    unit: 'mg/dL',
    color: 'text-purple-500 bg-purple-50',
    normalRange: '70 - 100 (fasting)'
  },
  weight: {
    label: 'Weight',
    icon: Scale,
    unit: 'kg',
    color: 'text-emerald-500 bg-emerald-50',
    normalRange: 'BMI 18.5 - 24.9'
  },
  height: {
    label: 'Height',
    icon: Ruler,
    unit: 'cm',
    color: 'text-indigo-500 bg-indigo-50',
    normalRange: '-'
  }
};

const BLOOD_GROUP_OPTIONS = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
  { value: 'unknown', label: 'Unknown' },
];

const ADD_VITAL_TYPE_OPTIONS = [
  ...Object.entries(VITAL_TYPES).map(([key, config]) => ({ value: key, label: config.label })),
  { value: 'blood_group', label: 'Blood Group' },
];

const DOCUMENT_CATEGORIES = [
  { value: 'prescription', label: 'Prescriptions', icon: FileText },
  { value: 'lab_report', label: 'Lab Reports', icon: TestTube },
  { value: 'xray', label: 'X-Ray/Scans', icon: Microscope },
  { value: 'discharge_summary', label: 'Discharge Summary', icon: Hospital },
  { value: 'insurance', label: 'Insurance', icon: Shield },
  { value: 'other', label: 'Other', icon: Folder }
];

const CONDITION_SEVERITY = {
  mild: { color: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50', label: 'Mild' },
  moderate: { color: 'bg-amber-50 text-amber-700 border border-amber-200/50', label: 'Moderate' },
  severe: { color: 'bg-red-50 text-red-700 border border-red-200/50', label: 'Severe' },
  chronic: { color: 'bg-violet-50 text-violet-700 border border-violet-200/50', label: 'Chronic' }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

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
    if (val < 25) return { label: 'Normal', color: 'text-emerald-600' };
    if (val < 30) return { label: 'Overweight', color: 'text-amber-600' };
    return { label: 'Obese', color: 'text-red-600' };
  }, [bmi]);

  return (
    <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-3xl p-5 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/[0.07]" />
      <div className="absolute bottom-4 -left-6 w-24 h-24 rounded-full bg-white/[0.05]" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clipboard className="w-5 h-5 text-violet-200" />
            {t('healthRecords.healthSummary', 'Health Summary')}
          </h3>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            <CheckCircle className="w-3 h-3" />
            {t('healthRecords.upToDate', 'Up to date')}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3.5 text-center border border-white/10">
            <Droplet className="w-5 h-5 text-red-300 mx-auto mb-1.5" />
            <p className="text-2xl font-extrabold text-white">
              {profile?.blood_group || '-'}
            </p>
            <p className="text-[10px] text-violet-200 font-medium mt-0.5">{t('healthRecords.bloodType', 'Blood Type')}</p>
          </div>

          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3.5 text-center border border-white/10">
            <Calendar className="w-5 h-5 text-blue-300 mx-auto mb-1.5" />
            <p className="text-2xl font-extrabold text-white">
              {profile?.age || '-'}
            </p>
            <p className="text-[10px] text-violet-200 font-medium mt-0.5">{t('common.years', 'Years')}</p>
          </div>

          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3.5 text-center border border-white/10">
            <Scale className="w-5 h-5 text-emerald-300 mx-auto mb-1.5" />
            <p className="text-2xl font-extrabold text-white">
              {bmi || '-'}
            </p>
            <p className="text-[10px] text-violet-200 font-medium mt-0.5">
              BMI {bmiStatus && <span className={`text-emerald-300`}>({bmiStatus.label})</span>}
            </p>
          </div>

          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3.5 text-center border border-white/10">
            <Stethoscope className="w-5 h-5 text-purple-300 mx-auto mb-1.5" />
            <p className="text-lg font-extrabold text-white">
              {profile?.last_checkup
                ? formatDate(profile.last_checkup, 'MMM d')
                : '-'}
            </p>
            <p className="text-[10px] text-violet-200 font-medium mt-0.5">{t('healthRecords.lastCheckup', 'Last Checkup')}</p>
          </div>
        </div>

        {profile?.allergies?.length > 0 && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-400/20 rounded-2xl">
            <div className="flex items-center gap-2 text-red-200 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-semibold text-xs">{t('common.allergies', 'Allergies')}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.allergies.map((allergy, index) => (
                <span key={index} className="text-xs font-semibold text-red-100 bg-red-500/30 px-2.5 py-1 rounded-lg">
                  {typeof allergy === 'string' ? allergy : allergy.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const VitalsSection = ({ vitals = [], latestVitals, onAddVital, onViewHistory }) => {
  const { t } = useTranslation();
  const [expandedVital, setExpandedVital] = useState(null);

  const getBpDisplay = useCallback((record) => {
    if (!record) return null;
    if (record.bp_display) return record.bp_display;
    if (record.systolic_bp != null && record.diastolic_bp != null) {
      return `${record.systolic_bp}/${record.diastolic_bp}`;
    }
    return null;
  }, []);

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
      default: return 'text-emerald-600';
    }
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
            <Activity className="w-[18px] h-[18px] text-violet-600" />
          </div>
          {t('healthRecords.vitals', 'Vitals')}
        </h3>
        <div className="flex items-center gap-2">
          {onViewHistory && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<BarChart3 className="w-4 h-4" />}
              onClick={onViewHistory}
              className="!rounded-xl !text-xs !border-violet-200 !text-violet-600 hover:!bg-violet-50"
            >
              {t('healthRecords.viewTrends', 'Trends')}
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={onAddVital}
            className="!rounded-xl !text-xs !bg-violet-600 hover:!bg-violet-700"
          >
            {t('healthRecords.addVital', 'Add')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Object.entries(VITAL_TYPES).map(([key, config]) => {
          const Icon = config.icon;
          const value = latestVitals?.[key];
          const status = getVitalStatus(key, value);
          const statusColor = getStatusColor(status);

          return (
            <button
              key={key}
              onClick={() => setExpandedVital(expandedVital === key ? null : key)}
              className={`p-3.5 rounded-2xl border-2 transition-all duration-200 text-left group ${
                expandedVital === key
                  ? 'border-violet-500 bg-violet-50/50 shadow-sm shadow-violet-100'
                  : 'border-gray-100 hover:border-violet-200 hover:bg-violet-50/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {value && status !== 'normal' && (
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${status === 'high' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                    {status === 'high' ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                  </span>
                )}
              </div>
              <p className={`text-xl font-extrabold ${value ? statusColor : 'text-gray-300'}`}>
                {value || '-'}
                <span className="text-[10px] font-medium text-gray-400 ml-1">
                  {config.unit}
                </span>
              </p>
              <p className="text-xs text-gray-500 font-medium mt-1">{config.label}</p>
              {latestVitals?.[`${key}_date`] && (
                <p className="text-[10px] text-gray-400 mt-1">
                  {formatDate(latestVitals[`${key}_date`], 'MMM d, h:mm a')}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {expandedVital && (
        <div className="mt-4 p-4 bg-violet-50/50 rounded-2xl border border-violet-100/50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-gray-900 text-sm">
              {VITAL_TYPES[expandedVital].label} {t('healthRecords.history', 'History')}
            </h4>
            <Button variant="ghost" size="sm" onClick={() => setExpandedVital(null)} className="!rounded-xl">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-sm text-gray-500">
            <p className="text-xs font-medium">{t('healthRecords.normalRange', 'Normal Range')}: {VITAL_TYPES[expandedVital].normalRange}</p>
            <div className="h-32 bg-white rounded-2xl mt-3 flex items-center justify-center text-gray-300 border border-gray-100">
              <LineChart className="w-6 h-6 mr-2" />
              <span className="text-xs font-medium">{t('healthRecords.trendChart', 'Trend Chart')}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
            {t('healthRecords.recentVitals', 'Recent Entries')}
          </h4>
          <span className="text-[11px] font-medium text-gray-400">
            {vitals.length} {t('healthRecords.records', 'records')}
          </span>
        </div>

        {vitals.length > 0 ? (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {vitals.slice(0, 10).map((record) => {
              const bpDisplay = getBpDisplay(record);
              const hasBp = Boolean(bpDisplay);

              return (
                <div
                  key={record.id}
                  className="p-3 rounded-xl border border-gray-100 bg-gray-50/70"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-700">
                      {formatDate(record.recorded_at, 'MMM d, yyyy h:mm a')}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold capitalize">
                      {record.source || 'self'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {hasBp && (
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-red-50 text-red-700">
                        BP: {bpDisplay}
                      </span>
                    )}
                    {record.heart_rate != null && (
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-pink-50 text-pink-700">
                        HR: {record.heart_rate} bpm
                      </span>
                    )}
                    {record.temperature != null && (
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-orange-50 text-orange-700">
                        Temp: {record.temperature} °F
                      </span>
                    )}
                    {record.oxygen_saturation != null && (
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-blue-50 text-blue-700">
                        SpO2: {record.oxygen_saturation}%
                      </span>
                    )}
                    {record.blood_sugar != null && (
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-purple-50 text-purple-700">
                        Sugar: {record.blood_sugar} mg/dL
                      </span>
                    )}
                    {record.weight_kg != null && (
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">
                        Weight: {record.weight_kg} kg
                      </span>
                    )}
                  </div>

                  {record.notes && (
                    <p className="text-[11px] text-gray-500 mt-2">{record.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-6">
            {t('healthRecords.noVitalsHistory', 'No vital history yet')}
          </p>
        )}
      </div>
    </div>
  );
};

const ConditionsSection = ({ conditions, onAdd, onEdit, onDelete }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center">
            <Stethoscope className="w-[18px] h-[18px] text-pink-600" />
          </div>
          {t('healthRecords.medicalConditions', 'Medical Conditions')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onAdd}
          className="!rounded-xl !text-xs !border-violet-200 !text-violet-600 hover:!bg-violet-50"
        >
          {t('common.add', 'Add')}
        </Button>
      </div>

      {conditions?.length > 0 ? (
        <div className="space-y-2.5">
          {conditions.map((condition, index) => {
            const severityConfig = CONDITION_SEVERITY[condition.severity] || CONDITION_SEVERITY.moderate;

            return (
              <div
                key={condition.id || index}
                className="flex items-start justify-between p-3.5 bg-gray-50 rounded-2xl hover:bg-gray-100/50 transition-colors group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-gray-900 text-sm">{condition.name}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${severityConfig.color}`}>
                      {severityConfig.label}
                    </span>
                    {condition.is_active && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-200/50">
                        {t('common.active', 'Active')}
                      </span>
                    )}
                  </div>
                  {condition.diagnosed_date && (
                    <p className="text-xs text-gray-400 mt-1">
                      {t('healthRecords.diagnosed', 'Diagnosed')}: {formatDate(condition.diagnosed_date, 'MMMM yyyy')}
                    </p>
                  )}
                  {condition.notes && (
                    <p className="text-xs text-gray-500 mt-1.5">{condition.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(condition)}
                    className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors"
                    aria-label={t('common.edit', 'Edit')}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(condition)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    aria-label={t('common.delete', 'Delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-2.5">
            <CheckCircle className="w-5 h-5 text-violet-400" />
          </div>
          <p className="text-sm text-gray-500 font-medium">
            {t('healthRecords.noConditions', 'No conditions recorded')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {t('healthRecords.noConditionsDesc', 'Add your medical conditions for better health tracking')}
          </p>
        </div>
      )}
    </div>
  );
};

const AllergiesSection = ({ allergies, onAdd, onDelete }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-[18px] h-[18px] text-red-500" />
          </div>
          {t('common.allergies', 'Allergies')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onAdd}
          className="!rounded-xl !text-xs !border-violet-200 !text-violet-600 hover:!bg-violet-50"
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
                className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100/50 rounded-xl group hover:bg-red-100/50 transition-colors"
              >
                <span className="text-red-700 font-semibold text-xs">{name}</span>
                <button
                  onClick={() => onDelete(allergy)}
                  className="text-red-300 hover:text-red-600 transition-colors"
                  aria-label={t('common.remove', 'Remove')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-400 text-xs font-medium py-4 text-center">
          {t('healthRecords.noAllergies', 'No allergies recorded')}
        </p>
      )}
    </div>
  );
};

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
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Folder className="w-[18px] h-[18px] text-indigo-600" />
          </div>
          {t('healthRecords.documents', 'Documents')}
        </h3>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Upload className="w-4 h-4" />}
          onClick={onUpload}
          className="!rounded-xl !text-xs !bg-violet-600 hover:!bg-violet-700"
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
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              selectedCategory === 'all'
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
                : 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100'
            }`}
          >
            {t('common.all', 'All')}
          </button>
          {DOCUMENT_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                selectedCategory === cat.value
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
                  : 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredDocuments.map((doc) => {
            const DocIcon = getDocIcon(doc.file_type);
            const category = DOCUMENT_CATEGORIES.find(c => c.value === doc.document_type);
            const CategoryIcon = category?.icon || File;

            return (
              <div
                key={doc.id}
                className="border border-gray-100 rounded-2xl p-4 hover:shadow-lg hover:shadow-violet-100/40 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-violet-50 rounded-xl group-hover:bg-violet-100 transition-colors">
                      <DocIcon className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate text-sm">
                        {doc.title}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md mt-1">
                        <CategoryIcon className="w-3 h-3" />
                        {category?.label || 'Other'}
                      </span>
                    </div>
                  </div>
                </div>

                {doc.description && (
                  <p className="text-xs text-gray-400 mt-2.5 line-clamp-2">
                    {doc.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-gray-50">
                  <span className="text-[10px] text-gray-400 font-medium">
                    {formatDate(doc.created_at || doc.document_date, 'MMM d, yyyy')}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => onView(doc)} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" aria-label={t('common.view', 'View')}>
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDownload(doc)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" aria-label={t('common.download', 'Download')}>
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onShare(doc)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" aria-label={t('common.share', 'Share')}>
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(doc)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label={t('common.delete', 'Delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10">
          <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FolderOpen className="w-7 h-7 text-violet-300" />
          </div>
          <p className="text-sm text-gray-500 font-medium">
            {t('healthRecords.noDocuments', 'No documents yet')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 mb-4">
            {t('healthRecords.noDocumentsDesc', 'Upload your medical documents to keep them organized')}
          </p>
          <Button
            variant="outline"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={onUpload}
            className="!rounded-xl !border-violet-200 !text-violet-600 hover:!bg-violet-50 !text-xs"
          >
            {t('healthRecords.uploadFirst', 'Upload First Document')}
          </Button>
        </div>
      )}
    </div>
  );
};

const VaccinationsSection = ({ vaccinations, onAdd }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Syringe className="w-[18px] h-[18px] text-emerald-600" />
          </div>
          {t('healthRecords.vaccinations', 'Vaccinations')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onAdd}
          className="!rounded-xl !text-xs !border-violet-200 !text-violet-600 hover:!bg-violet-50"
        >
          {t('common.add', 'Add')}
        </Button>
      </div>

      {vaccinations?.length > 0 ? (
        <div className="space-y-2.5">
          {vaccinations.map((vax, index) => (
            <div
              key={vax.id || index}
              className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">{vax.name}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(vax.date, 'MMM d, yyyy')}
                    {vax.dose && ` · ${t('healthRecords.dose', 'Dose')} ${vax.dose}`}
                  </p>
                </div>
              </div>
              {vax.next_due && (
                <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-200/50">
                  {t('healthRecords.next', 'Next')}: {formatDate(vax.next_due, 'MMM yyyy')}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-2.5">
            <Syringe className="w-5 h-5 text-violet-400" />
          </div>
          <p className="text-sm text-gray-500 font-medium">
            {t('healthRecords.noVaccinations', 'No vaccinations recorded')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {t('healthRecords.noVaccinationsDesc', 'Keep track of your immunization history')}
          </p>
        </div>
      )}
    </div>
  );
};

const FamilyHistorySection = ({ familyHistory, onAdd, onEdit }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users className="w-[18px] h-[18px] text-blue-600" />
          </div>
          {t('healthRecords.familyHistory', 'Family History')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={onAdd}
          className="!rounded-xl !text-xs !border-violet-200 !text-violet-600 hover:!bg-violet-50"
        >
          {t('common.add', 'Add')}
        </Button>
      </div>

      {familyHistory?.length > 0 ? (
        <div className="space-y-2.5">
          {familyHistory.map((item, index) => (
            <div
              key={item.id || index}
              className="flex items-start justify-between p-3.5 bg-gray-50 rounded-2xl group hover:bg-gray-100/50 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/50">{item.relation}</span>
                  <span className="font-semibold text-gray-900 text-sm">{item.condition}</span>
                </div>
                {item.notes && (
                  <p className="text-xs text-gray-400 mt-1">{item.notes}</p>
                )}
              </div>
              <button onClick={() => onEdit(item)} className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all" aria-label={t('common.edit', 'Edit')}>
                <Edit className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-2.5">
            <Users className="w-5 h-5 text-violet-400" />
          </div>
          <p className="text-sm text-gray-500 font-medium">
            {t('healthRecords.noFamilyHistory', 'No family history recorded')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {t('healthRecords.noFamilyHistoryDesc', 'Record hereditary conditions for better health insights')}
          </p>
        </div>
      )}
    </div>
  );
};

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
        vitalData.temperature = parseFloat(formData.value);
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
        vitalData.weight_kg = parseFloat(formData.value);
        break;
      case 'height':
        if (!formData.value) return;
        vitalData.height_cm = parseFloat(formData.value);
        break;
      case 'blood_group':
        if (!formData.value) return;
        vitalData.blood_group = formData.value;
        break;
      default:
        return;
    }

    if (formData.notes?.trim()) {
      vitalData.notes = formData.notes.trim();
    }

    onSave(vitalData);
  }, [formData, onSave]);

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
      <div className="space-y-4 pt-1">
        <Select
          label={t('healthRecords.vitalType', 'Vital Type')}
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value, value: '', systolic: '', diastolic: '' })}
          options={ADD_VITAL_TYPE_OPTIONS}
        />

        {formData.type === 'blood_pressure' ? (
          <div className="grid grid-cols-2 gap-3">
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
        ) : formData.type === 'blood_group' ? (
          <Select
            label={t('profile.bloodGroup', 'Blood Group')}
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            options={BLOOD_GROUP_OPTIONS}
            placeholder={t('profile.bloodGroup', 'Blood Group')}
          />
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
          <div className="p-3 bg-violet-50 rounded-2xl border border-violet-100/50">
            <p className="text-xs text-violet-700 font-medium">
              <Info className="w-3.5 h-3.5 inline mr-1.5 text-violet-400" />
              {t('healthRecords.normalRange', 'Normal range')}: {selectedVitalConfig.normalRange}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} className="!rounded-xl">
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
          className="!rounded-xl !bg-violet-600 hover:!bg-violet-700"
        >
          {t('common.save', 'Save')}
        </Button>
      </div>
    </Modal>
  );
};

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
      <div className="space-y-4 pt-1">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-violet-200 rounded-2xl p-8 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-all duration-200"
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
            <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-xl" />
          ) : formData.file ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center">
                <File className="w-6 h-6 text-violet-500" />
              </div>
              <span className="text-gray-600 text-sm font-medium">{formData.file.name}</span>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Upload className="w-7 h-7 text-violet-400" />
              </div>
              <p className="text-gray-600 text-sm font-medium">{t('healthRecords.dragDropFile', 'Click to select file')}</p>
              <p className="text-xs text-gray-400 mt-1">
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
        <Button variant="outline" onClick={onClose} className="!rounded-xl">
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleUpload}
          loading={isLoading}
          disabled={!formData.file || !formData.name}
          className="!rounded-xl !bg-violet-600 hover:!bg-violet-700"
        >
          {t('common.upload', 'Upload')}
        </Button>
      </div>
    </Modal>
  );
};

const ShareRecordsModal = ({
  isOpen,
  onClose,
  sharedWith,
  availableDoctors,
  selectedDoctorId,
  onSelectDoctor,
  onShare,
  onRevoke,
  isRevoking,
  isSharing,
  isDoctorsLoading
}) => {
  const { t } = useTranslation();

  const doctorOptions = (availableDoctors || []).map((doctor) => ({
    value: doctor.id,
    label: doctor.full_name || doctor.name || 'Doctor'
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('healthRecords.shareRecords', 'Share Records')}
      size="md"
    >
      <div className="space-y-4 pt-1">
        <p className="text-gray-500 text-sm">
          {t('healthRecords.shareRecordsDesc', 'Control which doctors can access your health records')}
        </p>

        {sharedWith?.length > 0 ? (
          <div className="space-y-2.5">
            <h4 className="font-semibold text-gray-900 text-sm">
              {t('healthRecords.currentlySharedWith', 'Currently shared with')}
            </h4>
            {sharedWith.map((share) => {
              const doctor = share?.doctor || share;
              return (
              <div
                key={share?.id || doctor?.id}
                className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={doctor?.full_name || doctor?.name} src={doctor?.avatar || doctor?.profile_picture} size="sm" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{doctor?.full_name || `Dr. ${doctor?.name || 'Doctor'}`}</p>
                    <p className="text-xs text-gray-400">{doctor?.specialization || doctor?.specialization_display || '-'}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRevoke(share?.id)}
                  className="!text-red-600 !border-red-200 hover:!bg-red-50 !rounded-xl !text-xs"
                  loading={isRevoking === (share?.id || doctor?.id)}
                >
                  <Lock className="w-3.5 h-3.5 mr-1" />
                  {t('healthRecords.revoke', 'Revoke')}
                </Button>
              </div>
            );})}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-2xl">
            <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-2.5">
              <Share2 className="w-5 h-5 text-violet-300" />
            </div>
            <p className="text-gray-400 text-sm font-medium">{t('healthRecords.notSharedYet', 'Not shared with anyone')}</p>
          </div>
        )}

        <div className="space-y-3">
          <Select
            label={t('healthRecords.selectDoctor', 'Select Doctor')}
            value={selectedDoctorId}
            onChange={(e) => onSelectDoctor(e.target.value)}
            options={doctorOptions}
            placeholder={isDoctorsLoading ? t('common.loading', 'Loading...') : t('healthRecords.selectDoctorPlaceholder', 'Choose a doctor')}
          />
        </div>

        <Button
          variant="primary"
          fullWidth
          leftIcon={<Share2 className="w-4 h-4" />}
          onClick={onShare}
          loading={isSharing}
          disabled={!selectedDoctorId || isDoctorsLoading}
          className="!rounded-xl !bg-violet-600 hover:!bg-violet-700"
        >
          {t('healthRecords.shareWithDoctor', 'Share with a Doctor')}
        </Button>
      </div>

      <div className="flex justify-end mt-6">
        <Button variant="outline" onClick={onClose} className="!rounded-xl">
          {t('common.close', 'Close')}
        </Button>
      </div>
    </Modal>
  );
};

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="py-2">
        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl mb-4 border border-red-100/50">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-red-700 text-sm font-medium">{message}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} fullWidth className="!rounded-xl">
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm} fullWidth loading={isLoading} className="!rounded-xl">
            {t('common.delete', 'Delete')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

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
      <div className="space-y-4 pt-1">
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
        <Button variant="outline" onClick={onClose} className="!rounded-xl">{t('common.cancel', 'Cancel')}</Button>
        <Button variant="primary" onClick={() => onSave(formData)} loading={isLoading} disabled={!formData.name.trim()} className="!rounded-xl !bg-violet-600 hover:!bg-violet-700">
          {t('common.save', 'Save')}
        </Button>
      </div>
    </Modal>
  );
};

const AddAllergyModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) setName('');
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('healthRecords.addAllergy', 'Add Allergy')} size="sm">
      <div className="space-y-4 pt-1">
        <Input
          label={t('healthRecords.allergyName', 'Allergy Name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('healthRecords.enterAllergyName', 'e.g., Penicillin')}
          required
        />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} className="!rounded-xl">{t('common.cancel', 'Cancel')}</Button>
        <Button
          variant="primary"
          onClick={() => {
            const normalizedName = name.trim();
            onSave({
              name: normalizedName,
              allergen: normalizedName,
              allergy_type: 'other',
            });
          }}
          loading={isLoading}
          disabled={!name.trim()}
          className="!rounded-xl !bg-violet-600 hover:!bg-violet-700"
        >
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

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = useCallback((tab) => {
    setSearchParams({ tab });
  }, [setSearchParams]);

  const tabs = useMemo(() => [
    { id: 'overview', label: t('healthRecords.overview', 'Overview'), icon: Clipboard },
    { id: 'vitals', label: t('healthRecords.vitals', 'Vitals'), icon: Activity },
    { id: 'documents', label: t('healthRecords.documents', 'Documents'), icon: Folder },
    { id: 'history', label: t('healthRecords.medicalHistory', 'History'), icon: History }
  ], [t]);

  const [showVitalModal, setShowVitalModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [editCondition, setEditCondition] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [revokingDoctorId, setRevokingDoctorId] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['healthProfile'],
    queryFn: () => healthRecordsService.getProfile(),
    staleTime: 1000 * 60 * 5,
    enabled: isOnline
  });

  const { data: vitalsData, isLoading: vitalsLoading } = useQuery({
    queryKey: ['vitals', { limit: 100 }],
    queryFn: () => healthRecordsService.getVitals({ limit: 100 }),
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

  const { data: doctorsResponse, isLoading: doctorsLoading } = useQuery({
    queryKey: ['shareDoctors'],
    queryFn: () => authService.getDoctors({ page_size: 100 }),
    staleTime: 1000 * 60 * 5,
    enabled: isOnline && showShareModal
  });

  const profile = profileData?.data || profileData;
  const normalizeArrayData = (response) => {
    const payload = response?.data ?? response;

    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;

    return [];
  };
  const vitalRecords = normalizeArrayData(vitalsData);

  const latestByField = vitalRecords.reduce((acc, record) => {
    if (!acc.blood_pressure && (
      record.bp_display ||
      (record.systolic_bp != null && record.diastolic_bp != null)
    )) {
      acc.blood_pressure = record;
    }
    if (!acc.heart_rate && record.heart_rate != null) acc.heart_rate = record;
    if (!acc.temperature && record.temperature != null) acc.temperature = record;
    if (!acc.oxygen_saturation && record.oxygen_saturation != null) acc.oxygen_saturation = record;
    if (!acc.blood_sugar && record.blood_sugar != null) acc.blood_sugar = record;
    if (!acc.weight && record.weight_kg != null) acc.weight = record;
    if (!acc.height && record.height_cm != null) acc.height = record;
    return acc;
  }, {
    blood_pressure: null,
    heart_rate: null,
    temperature: null,
    oxygen_saturation: null,
    blood_sugar: null,
    weight: null,
    height: null,
  });

  const latestVitalRecord = vitalRecords.length > 0 ? vitalRecords[0] : null;
  const latestVitals = latestVitalRecord ? {
    blood_pressure: latestByField.blood_pressure?.bp_display || (
      latestByField.blood_pressure?.systolic_bp != null && latestByField.blood_pressure?.diastolic_bp != null
      ? `${latestByField.blood_pressure.systolic_bp}/${latestByField.blood_pressure.diastolic_bp}`
      : null),
    heart_rate: latestByField.heart_rate?.heart_rate,
    temperature: latestByField.temperature?.temperature,
    oxygen_saturation: latestByField.oxygen_saturation?.oxygen_saturation,
    blood_sugar: latestByField.blood_sugar?.blood_sugar,
    weight: latestByField.weight?.weight_kg || profile?.weight_kg,
    height: latestVitalRecord.height_cm || profile?.height_cm,
    blood_pressure_date: latestByField.blood_pressure?.recorded_at,
    heart_rate_date: latestByField.heart_rate?.recorded_at,
    temperature_date: latestByField.temperature?.recorded_at,
    oxygen_saturation_date: latestByField.oxygen_saturation?.recorded_at,
    blood_sugar_date: latestByField.blood_sugar?.recorded_at,
    weight_date: latestByField.weight?.recorded_at || profile?.updated_at,
  } : {
    height: profile?.height_cm,
    weight: profile?.weight_kg,
    weight_date: profile?.updated_at,
  };
  const conditions = normalizeArrayData(conditionsData);
  const allergies = normalizeArrayData(allergiesData);
  const documents = normalizeArrayData(documentsData);
  const vaccinations = normalizeArrayData(vaccinationsData);
  const familyHistory = normalizeArrayData(familyHistoryData);
  const sharedWith = normalizeArrayData(sharingData);
  const availableDoctors = useMemo(() => {
    let doctors = [];
    if (Array.isArray(doctorsResponse)) {
      doctors = doctorsResponse;
    } else if (Array.isArray(doctorsResponse?.results)) {
      doctors = doctorsResponse.results;
    } else if (Array.isArray(doctorsResponse?.data)) {
      doctors = doctorsResponse.data;
    } else if (Array.isArray(doctorsResponse?.data?.results)) {
      doctors = doctorsResponse.data.results;
    }

    const alreadySharedDoctorIds = new Set(
      (sharedWith || []).map((item) => String(item?.doctor?.id || item?.doctor_id || item?.id))
    );

    return doctors
      .map((doc) => {
        const candidateId = doc.user_id || doc.user?.id || doc.doctor_id || doc.userId || doc.id;
        const normalizedId = String(candidateId || '').trim();

        return {
          id: normalizedId,
          full_name: doc.full_name || doc.name || `Dr. ${doc.first_name || ''} ${doc.last_name || ''}`.trim(),
        };
      })
      .filter((doc) => doc.id && !alreadySharedDoctorIds.has(doc.id));
  }, [doctorsResponse, sharedWith]);

  const isInitialLoading = profileLoading || vitalsLoading;

  const addVitalMutation = useMutation({
    mutationFn: (data) => healthRecordsService.addVitals(data),
    onSuccess: () => {
      toast.success(t('healthRecords.vitalAdded', 'Vital recorded successfully'));
      setShowVitalModal(false);
      // Invalidate with exact key structure to ensure refetch
      queryClient.invalidateQueries({ queryKey: ['vitals', { limit: 100 }] });
      queryClient.invalidateQueries({ queryKey: ['vitals'] });
      queryClient.invalidateQueries({ queryKey: ['healthProfile'] });
    },
    onError: (err) => {
      if (isDev) console.error('Error adding vital:', err);
      const errorMsg = err?.response?.data?.message || err?.message || t('healthRecords.vitalError', 'Failed to record vital');
      toast.error(errorMsg);
    }
  });

  const updateProfileVitalsMutation = useMutation({
    mutationFn: (data) => healthRecordsService.updateHealthProfile(data),
    onSuccess: () => {
      toast.success(t('healthRecords.profileVitalsUpdated', 'Height/weight updated successfully'));
      setShowVitalModal(false);
      queryClient.invalidateQueries({ queryKey: ['healthProfile'] });
      queryClient.invalidateQueries({ queryKey: ['vitals', { limit: 100 }] });
      queryClient.invalidateQueries({ queryKey: ['vitals'] });
    },
    onError: (err) => {
      if (isDev) console.error('Error updating profile vitals:', err);
      const message = err?.response?.data?.message || t('healthRecords.vitalError', 'Failed to record vital');
      toast.error(message);
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
      if (isDev) console.error('Full error response:', err.response?.data);
      const backendData = err?.response?.data;
      let message = t('healthRecords.conditionError', 'Failed to save condition');
      
      if (backendData?.message) {
        message = backendData.message;
      } else if (backendData?.detail) {
        message = backendData.detail;
      } else if (typeof backendData === 'object') {
        const errorLines = Object.entries(backendData)
          .map(([key, val]) => {
            const vals = Array.isArray(val) ? val : [val];
            return vals.map(v => `${key}: ${v}`).join('; ');
          })
          .filter(line => line.trim());
        if (errorLines.length > 0) {
          message = errorLines.join(' | ');
        }
      }
      
      toast.error(message);
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
      const backendData = err?.response?.data;
      const message =
        backendData?.message ||
        backendData?.detail ||
        (typeof backendData === 'object'
          ? Object.values(backendData).flat().join(', ')
          : null) ||
        t('healthRecords.allergyError', 'Failed to add allergy');
      toast.error(message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ type, item }) => {
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
    mutationFn: (shareId) => healthRecordsService.revokeAccess(shareId),
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

  const shareMutation = useMutation({
    mutationFn: (doctorId) => healthRecordsService.shareWithDoctor({
      doctor_id: doctorId,
      share_type: 'all',
      is_permanent: true
    }),
    onSuccess: () => {
      toast.success(t('healthRecords.sharedSuccess', 'Records shared successfully'));
      setSelectedDoctorId('');
      queryClient.invalidateQueries({ queryKey: ['healthSharing'] });
    },
    onError: (err) => {
      if (isDev) console.error('Error sharing records:', err);
      const message = err?.response?.data?.message || t('healthRecords.shareError', 'Failed to share records');
      toast.error(message);
    }
  });

  const handleAddVital = useCallback((data) => {
    if (data?.height_cm != null || data?.blood_group) {
      updateProfileVitalsMutation.mutate({
        ...(data?.height_cm != null ? { height_cm: data.height_cm } : {}),
        ...(data?.blood_group ? { blood_group: data.blood_group } : {}),
      });
      return;
    }

    addVitalMutation.mutate(data);
  }, [addVitalMutation, updateProfileVitalsMutation]);

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
    const trimmedName = data?.name?.trim();
    const payload = {
      // Send both name (alias) and condition_name (direct field) for compatibility
      name: trimmedName,
      condition_name: trimmedName,
      severity: data?.severity || 'mild',
      is_active: data?.is_active ?? true,
      status: data?.is_active ? 'active' : 'managed',
    };

    if (data?.diagnosed_date) {
      payload.diagnosed_date = data.diagnosed_date;
    }

    if (data?.notes?.trim()) {
      payload.notes = data.notes.trim();
      payload.treatment_notes = data.notes.trim();
    }

    if (isDev) {
      console.log('Sending condition payload:', payload);
    }

    addConditionMutation.mutate(payload);
  }, [addConditionMutation]);

  const handleAddAllergy = useCallback((data) => {
    addAllergyMutation.mutate(data);
  }, [addAllergyMutation]);

  const handleShareWithDoctor = useCallback(() => {
    if (!selectedDoctorId) {
      toast.error(t('healthRecords.selectDoctorFirst', 'Please select a doctor'));
      return;
    }

    shareMutation.mutate(selectedDoctorId);
  }, [selectedDoctorId, shareMutation, t]);

  const handleRevokeAccess = useCallback((shareId) => {
    if (!shareId) return;
    setRevokingDoctorId(shareId);
    revokeMutation.mutate(shareId);
  }, [revokeMutation]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['healthProfile'] });
    queryClient.invalidateQueries({ queryKey: ['vitals'] });
    queryClient.invalidateQueries({ queryKey: ['conditions'] });
    queryClient.invalidateQueries({ queryKey: ['allergies'] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['vaccinations'] });
    queryClient.invalidateQueries({ queryKey: ['familyHistory'] });
    queryClient.invalidateQueries({ queryKey: ['healthSharing'] });
    toast.success(t('common.refreshed', 'Refreshed'));
  }, [queryClient, t]);

  if (!isOnline) {
    return (
      <div className="space-y-6 pb-20 md:pb-6">
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/[0.07]" />
          <h1 className="text-xl font-bold text-white relative z-10">
            {t('healthRecords.title', 'Health Records')}
          </h1>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-10">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
              <WifiOff className="w-8 h-8 text-violet-300" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{t('common.offline', 'You are offline')}</h3>
            <p className="text-sm text-gray-400 mb-5 max-w-xs">
              {t('healthRecords.offlineDesc', 'Health records require an internet connection.')}
            </p>
            <Button onClick={() => window.location.reload()} leftIcon={<RefreshCw size={18} />} className="!rounded-xl !bg-violet-600 hover:!bg-violet-700">
              {t('common.retry', 'Retry')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mb-3">
          <div className="w-7 h-7 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-400 font-medium">Loading records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 md:pb-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 rounded-3xl p-5 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/[0.07]" />
        <div className="absolute bottom-4 -left-6 w-24 h-24 rounded-full bg-white/[0.05]" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-white">
                {t('healthRecords.title', 'Health Records')}
              </h1>
              <p className="text-violet-200 mt-0.5 text-sm">
                {t('healthRecords.subtitle', 'Manage your complete health history')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Share2 className="w-4 h-4" />}
                onClick={() => setShowShareModal(true)}
                className="!rounded-xl !border-white/30 !text-white hover:!bg-white/15 !text-xs !font-semibold"
              >
                {t('healthRecords.share', 'Share')}
              </Button>
              <Button
                onClick={handleRefresh}
                className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-1.5">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200
                  ${activeTab === tab.id
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }
                `}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <HealthSummaryCard profile={profile} latestVitals={latestVitals} />

          <VitalsSection
            vitals={vitalRecords}
            latestVitals={latestVitals}
            onAddVital={() => setShowVitalModal(true)}
            onViewHistory={() => setActiveTab('vitals')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="space-y-5">
          <VitalsSection
            vitals={vitalRecords}
            latestVitals={latestVitals}
            onAddVital={() => setShowVitalModal(true)}
          />
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-5">
          <DocumentsSection
            documents={documents}
            onUpload={() => setShowUploadModal(true)}
            onView={handleViewDocument}
            onDownload={handleDownloadDocument}
            onDelete={(doc) => handleDeleteItem('document', doc)}
            onShare={() => setShowShareModal(true)}
          />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-5">
          <ConditionsSection
            conditions={conditions}
            onAdd={() => { setEditCondition(null); setShowConditionModal(true); }}
            onEdit={handleEditCondition}
            onDelete={(condition) => handleDeleteItem('condition', condition)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Modals */}
      <AddVitalModal
        isOpen={showVitalModal}
        onClose={() => setShowVitalModal(false)}
        onSave={handleAddVital}
        isLoading={addVitalMutation.isPending || updateProfileVitalsMutation.isPending}
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
        availableDoctors={availableDoctors}
        selectedDoctorId={selectedDoctorId}
        onSelectDoctor={setSelectedDoctorId}
        onShare={handleShareWithDoctor}
        onRevoke={handleRevokeAccess}
        isRevoking={revokingDoctorId}
        isSharing={shareMutation.isPending}
        isDoctorsLoading={doctorsLoading}
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