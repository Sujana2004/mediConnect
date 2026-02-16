import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import {
  BarChart3,
  FileText,
  Heart,
  Syringe,
  FlaskConical,
  AlertTriangle,
  Users,
  Share2,
  ChevronRight,
  Edit3,
  Upload,
  Download,
  Eye,
  Trash2,
  Plus,
  X,
  Check,
  Calendar,
  Clock,
  File,
  Image,
  FileText as FileIcon,
  FileSpreadsheet,
  FileImage,
  FilePdf,
  FilePlus,
  FolderOpen,
  Search,
  Filter,
  MoreVertical,
  DownloadCloud,
  Printer,
  Mail,
  MessageSquare,
  UserPlus,
  UserMinus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  HelpCircle,
  Activity,
  Droplet,
  Thermometer,
  Scale,
  Ruler,
  Zap,
  Wind,
  Battery,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock as ClockIcon,
  Calendar as CalendarIcon,
  Bell,
  BellOff,
  Settings,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  Menu,
  Home,
  User,
  LogOut,
} from 'lucide-react';

// Constants
const RECORD_SUB_TABS = [
  { id: 'overview', icon: BarChart3, labelKey: 'patient.records.overview' },
  { id: 'documents', icon: FileText, labelKey: 'patient.records.documents' },
  { id: 'conditions', icon: Heart, labelKey: 'patient.records.conditions' },
  { id: 'vaccinations', icon: Syringe, labelKey: 'patient.records.vaccinations' },
  { id: 'lab', icon: FlaskConical, labelKey: 'patient.records.labReports' },
  { id: 'allergies', icon: AlertTriangle, labelKey: 'patient.records.allergies' },
  { id: 'family', icon: Users, labelKey: 'patient.records.familyHistory' },
  { id: 'share', icon: Share2, labelKey: 'patient.records.share' },
];

const SEVERITY_COLORS = {
  severe: 'bg-red-100 text-red-800 border-red-200',
  moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  mild: 'bg-green-100 text-green-800 border-green-200',
};

const FILE_TYPES = {
  pdf: { icon: FilePdf, color: 'text-red-600', bgColor: 'bg-red-100' },
  jpg: { icon: FileImage, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  png: { icon: FileImage, color: 'text-green-600', bgColor: 'bg-green-100' },
  doc: { icon: FileText, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  xls: { icon: FileSpreadsheet, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  default: { icon: File, color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

const PatientRecordsTab = () => {
  const { t, i18n } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [toast, setToast] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(null);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 max-w-sm mx-auto z-50 p-4 rounded-lg shadow-lg text-white transform transition-all animate-slideDown">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {toast.type === 'success' && <CheckCircle className="h-5 w-5" />}
              {toast.type === 'error' && <XCircle className="h-5 w-5" />}
              {toast.type === 'warning' && <AlertTriangle className="h-5 w-5" />}
              {toast.type === 'info' && <Info className="h-5 w-5" />}
              <p>{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="ml-4 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-white rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-scaleIn">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
              showConfirmDialog.type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              <AlertTriangle className={`h-6 w-6 ${
                showConfirmDialog.type === 'danger' ? 'text-red-600' : 'text-yellow-600'
              }`} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
              {showConfirmDialog.title}
            </h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              {showConfirmDialog.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {showConfirmDialog.cancelText}
              </button>
              <button
                onClick={() => {
                  showConfirmDialog.onConfirm();
                  setShowConfirmDialog(null);
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${
                  showConfirmDialog.type === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {showConfirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4 max-w-lg mx-auto">
        {/* Sub-tabs with horizontal scroll */}
        <div className="sticky top-0 bg-gray-50 pt-1 pb-2 z-10">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {RECORD_SUB_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium touch-manipulation min-h-[44px] whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-lg scale-105'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  {t(tab.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-4 pb-20">
          {activeSubTab === 'overview' && (
            <RecordsOverview t={t} showToast={showToast} setShowConfirmDialog={setShowConfirmDialog} />
          )}
          {activeSubTab === 'documents' && (
            <RecordsDocuments t={t} showToast={showToast} setShowConfirmDialog={setShowConfirmDialog} />
          )}
          {activeSubTab === 'conditions' && (
            <RecordsConditions t={t} showToast={showToast} setShowConfirmDialog={setShowConfirmDialog} />
          )}
          {activeSubTab === 'vaccinations' && (
            <RecordsVaccinations t={t} showToast={showToast} setShowConfirmDialog={setShowConfirmDialog} />
          )}
          {activeSubTab === 'lab' && (
            <RecordsLabReports t={t} showToast={showToast} setShowConfirmDialog={setShowConfirmDialog} />
          )}
          {activeSubTab === 'allergies' && (
            <RecordsAllergies t={t} showToast={showToast} setShowConfirmDialog={setShowConfirmDialog} />
          )}
          {activeSubTab === 'family' && (
            <RecordsFamilyHistory t={t} showToast={showToast} setShowConfirmDialog={setShowConfirmDialog} />
          )}
          {activeSubTab === 'share' && (
            <RecordsShare t={t} showToast={showToast} setShowConfirmDialog={setShowConfirmDialog} />
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== OVERVIEW TAB ====================
function RecordsOverview({ t, showToast, setShowConfirmDialog }) {
  const [healthScore] = useState(78);
  const [basicInfo] = useState({
    name: 'Lakshmi',
    age: 55,
    gender: 'Female',
    bloodGroup: 'O+',
    height: 160,
    weight: 65,
    bmi: 25.4,
  });

  const bmiStatus = useMemo(() => {
    if (basicInfo.bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (basicInfo.bmi < 25) return { label: 'Normal', color: 'text-green-600', bg: 'bg-green-100' };
    if (basicInfo.bmi < 30) return { label: 'Overweight', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Obese', color: 'text-red-600', bg: 'bg-red-100' };
  }, [basicInfo.bmi]);

  const quickActions = [
    { icon: '📄', label: t('patient.records.uploadDoc'), action: () => showToast('Upload feature coming soon', 'info') },
    { icon: '📊', label: t('patient.records.recordVitals'), action: () => showToast('Record vitals feature coming soon', 'info') },
    { icon: '📤', label: t('patient.records.shareDoctor'), action: () => showToast('Share with doctor feature coming soon', 'info') },
    { icon: '📥', label: t('patient.records.downloadAll'), action: () => showToast('Download feature coming soon', 'info') },
    { icon: '📧', label: t('patient.records.emailSummary'), action: () => showToast('Email feature coming soon', 'info') },
    { icon: '🖨️', label: t('patient.records.printSummary'), action: () => showToast('Print feature coming soon', 'info') },
  ];

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Basic Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <User className="h-4 w-4 text-primary-600" />
            {t('patient.records.basicInfo')}
          </h3>
          <button
            type="button"
            onClick={() => showToast('Edit feature coming soon', 'info')}
            className="text-sm text-primary-600 flex items-center gap-1 hover:underline"
          >
            <Edit3 className="h-4 w-4" />
            {t('patient.edit')}
          </button>
        </div>
        <div className="p-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500 text-xs">{t('patient.name')}</dt>
              <dd className="font-medium text-gray-900">{basicInfo.name}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">{t('patient.age')}</dt>
              <dd className="font-medium text-gray-900">{basicInfo.age} years</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">{t('patient.gender')}</dt>
              <dd className="font-medium text-gray-900">{basicInfo.gender}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">{t('patient.bloodGroup')}</dt>
              <dd className="font-medium text-red-600">{basicInfo.bloodGroup}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">{t('patient.height')}</dt>
              <dd className="font-medium text-gray-900">{basicInfo.height} cm</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">{t('patient.weight')}</dt>
              <dd className="font-medium text-gray-900">{basicInfo.weight} kg</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gray-500 text-xs">{t('patient.bmi')}</dt>
              <dd className="font-medium text-gray-900 flex items-center gap-2">
                {basicInfo.bmi}
                <span className={`text-xs px-2 py-0.5 rounded-full ${bmiStatus.bg} ${bmiStatus.color}`}>
                  {bmiStatus.label}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Health Score Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            {t('patient.records.healthScore')}
          </h3>
        </div>
        <div className="p-4">
          <div className="flex flex-col items-center">
            <p className="text-3xl font-bold text-primary-600">{healthScore}/100</p>
            <div className="w-full h-3 bg-gray-200 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-primary-600 rounded-full transition-all duration-500"
                style={{ width: `${healthScore}%` }}
              />
            </div>
            <p className="text-sm font-medium text-green-600 mt-2">
              {healthScore >= 80 ? 'EXCELLENT' :
               healthScore >= 60 ? 'GOOD' :
               healthScore >= 40 ? 'FAIR' : 'NEEDS ATTENTION'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            <div className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3 w-3" /> Regular checkups</div>
            <div className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3 w-3" /> Controlled diabetes</div>
            <div className="flex items-center gap-1 text-yellow-600"><AlertCircle className="h-3 w-3" /> Needs more exercise</div>
                        <div className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3 w-3" /> 92% adherence</div>
          </div>
          <button
            onClick={() => showToast('Detailed analysis coming soon', 'info')}
            className="mt-3 text-sm text-primary-600 font-medium flex items-center gap-1 hover:underline"
          >
            <BarChart3 className="h-4 w-4" />
            {t('patient.records.viewDetailed')}
          </button>
        </div>
      </div>

      {/* Active Conditions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            {t('patient.records.activeConditions')} (2)
          </h3>
          <button
            onClick={() => showToast('View all conditions', 'info')}
            className="text-sm text-primary-600 hover:underline"
          >
            {t('patient.viewAll')}
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2">
              <Droplet className="h-4 w-4 text-amber-600" />
              <p className="font-medium text-gray-900">Type 2 Diabetes</p>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">MODERATE</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Diagnosed 5 years ago • Last checkup: 20 Jan 2025</p>
          </div>
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              <p className="font-medium text-gray-900">Hypertension</p>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-800">MILD</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Diagnosed 3 years ago • Well controlled</p>
          </div>
        </div>
      </div>

      {/* Critical Allergies */}
      <div className="bg-red-50 rounded-xl border border-red-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-red-200 bg-red-100/50">
          <h3 className="font-bold text-red-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t('patient.records.criticalAllergies')} (3)
          </h3>
        </div>
        <div className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              <span className="text-sm font-medium text-red-800">Penicillin (Severe)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-sm font-medium text-yellow-800">Peanuts (Moderate)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-800">Pollen (Mild)</span>
            </div>
          </div>
          <button
            onClick={() => showToast('View all allergies', 'info')}
            className="mt-3 text-sm text-red-700 font-medium hover:underline"
          >
            {t('patient.viewAll')}
          </button>
        </div>
      </div>

      {/* Current Medications */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Syringe className="h-4 w-4 text-primary-600" />
            {t('patient.records.currentMeds')} (3)
          </h3>
        </div>
        <div className="p-4">
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Metformin 500mg - <span className="text-gray-500">Twice daily (Diabetes)</span></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Amlodipine 5mg - <span className="text-gray-500">Once daily (BP)</span></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Aspirin 75mg - <span className="text-gray-500">Once daily (Blood thinner)</span></span>
            </li>
          </ul>
        </div>
      </div>

      {/* Health Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary-600" />
            {t('patient.records.healthTimeline')}
          </h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">💊 Metformin taken</p>
                <p className="text-xs text-gray-500">Today, 9:00 AM</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">📊 Vitals recorded</p>
                <p className="text-xs text-gray-500">Yesterday, BP 130/85, Sugar 110</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">🩺 Dr. Ramesh consultation</p>
                <p className="text-xs text-gray-500">20 Jan 2025 - Diabetes checkup</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shared With */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary-600" />
            {t('patient.records.sharedWith')}
          </h3>
          <button
            onClick={() => showToast('Manage sharing', 'info')}
            className="text-sm text-primary-600 hover:underline"
          >
            {t('patient.manage')}
          </button>
        </div>
        <div className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <span className="text-sm">Dr. Ramesh Kumar</span>
              </div>
              <span className="text-xs text-gray-500">Permanent</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">Dr. Priya Sharma</span>
              </div>
              <span className="text-xs text-gray-500">Expires 30 Jan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-bold text-gray-900">{t('patient.records.quickActions')}</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="flex flex-col items-center p-3 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-primary-300 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <span className="text-2xl mb-1">{action.icon}</span>
                <span className="text-[10px] font-medium text-center leading-tight">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== DOCUMENTS TAB ====================
function RecordsDocuments({ t, showToast, setShowConfirmDialog }) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [storage] = useState({ used: 125, total: 1024 }); // MB

  const documents = [
    {
      id: 1,
      name: 'Prescription_20Jan2025.pdf',
      type: 'pdf',
      uploadedBy: 'Dr. Ramesh Kumar',
      date: '2025-01-20',
      size: '245 KB',
      category: 'prescription',
    },
    {
      id: 2,
      name: 'HbA1c_Test_15Jan2025.pdf',
      type: 'pdf',
      uploadedBy: 'Apollo Diagnostics',
      date: '2025-01-15',
      size: '1.2 MB',
      category: 'lab',
    },
    {
      id: 3,
      name: 'Chest_Xray_10Jan2025.jpg',
      type: 'jpg',
      uploadedBy: 'City Hospital',
      date: '2025-01-10',
      size: '3.5 MB',
      category: 'xray',
    },
    {
      id: 4,
      name: 'Discharge_Summary_Dec2024.pdf',
      type: 'pdf',
      uploadedBy: 'City Hospital',
      date: '2024-12-28',
      size: '890 KB',
      category: 'other',
    },
  ];

  const filteredDocuments = documents.filter(doc => {
    if (filter !== 'all' && doc.category !== filter) return false;
    if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleDeleteDocument = (docId, docName) => {
    setShowConfirmDialog({
      title: t('common.confirm'),
      message: t('patient.records.confirmDelete', { name: docName }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      type: 'danger',
      onConfirm: () => {
        showToast(t('patient.records.documentDeleted'), 'success');
      },
    });
  };

  const getFileIcon = (type) => {
    const fileType = FILE_TYPES[type] || FILE_TYPES.default;
    const Icon = fileType.icon;
    return { Icon, ...fileType };
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">
          {t('patient.records.myDocuments')}
        </h3>
        <button
          onClick={() => showToast('Upload feature coming soon', 'info')}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <Upload className="h-4 w-4" />
          {t('patient.records.uploadNew')}
        </button>
      </div>

      {/* Storage Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            {t('patient.records.storage')}
          </span>
          <span className="text-sm font-medium">
            {storage.used} MB / {storage.total} MB
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 rounded-full transition-all"
            style={{ width: `${(storage.used / storage.total) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {Math.round((storage.used / storage.total) * 100)}% used
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('patient.records.searchDocuments')}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'prescriptions', 'lab', 'xray', 'other'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t(`patient.records.filters.${f}`)}
          </button>
        ))}
      </div>

      {/* Documents List */}
      {filteredDocuments.length > 0 ? (
        <div className="space-y-3">
          {filteredDocuments.map((doc) => {
            const { Icon, color, bgColor } = getFileIcon(doc.type);
            return (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${bgColor}`}>
                    <Icon className={`h-6 w-6 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {doc.uploadedBy} • {new Date(doc.date).toLocaleDateString()} • {doc.size}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 mt-3 justify-end">
                  <button
                    onClick={() => showToast('Viewing document', 'info')}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label={t('common.view')}
                  >
                    <Eye className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => showToast('Downloading document', 'info')}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label={t('common.download')}
                  >
                    <Download className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => showToast('Share feature coming soon', 'info')}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label={t('common.share')}
                  >
                    <Share2 className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(doc.id, doc.name)}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
          <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('patient.records.noDocuments')}</p>
        </div>
      )}

      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-500 transition-colors group cursor-pointer">
        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3 group-hover:text-primary-600 transition-colors" />
        <p className="text-sm text-gray-600 group-hover:text-primary-600 transition-colors">
          {t('patient.records.clickOrDrag')}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          PDF, JPG, PNG, DOC • Max 10 MB
        </p>
        <button
          onClick={() => showToast('Upload feature coming soon', 'info')}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {t('patient.records.selectFile')}
        </button>
      </div>
    </div>
  );
}

// ==================== CONDITIONS TAB ====================
function RecordsConditions({ t, showToast, setShowConfirmDialog }) {
  const [conditions, setConditions] = useState([
    {
      id: 1,
      name: 'Type 2 Diabetes Mellitus',
      diagnosedDate: '2020-01-15',
      doctor: 'Dr. Ramesh Kumar',
      severity: 'moderate',
      chronic: true,
      latestReading: 'HbA1c: 7.2%',
      lastCheckup: '2025-01-15',
      nextCheckup: '2025-02-20',
    },
    {
      id: 2,
      name: 'Essential Hypertension',
      diagnosedDate: '2022-03-10',
      doctor: 'Dr. Ramesh Kumar',
      severity: 'mild',
      chronic: true,
      latestReading: 'BP: 130/85',
      lastCheckup: '2025-01-25',
      nextCheckup: '2025-04-25',
    },
  ]);

  const handleDeleteCondition = (conditionId, conditionName) => {
    setShowConfirmDialog({
      title: t('common.confirm'),
      message: t('patient.records.confirmDeleteCondition', { name: conditionName }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      type: 'danger',
      onConfirm: () => {
        setConditions(prev => prev.filter(c => c.id !== conditionId));
        showToast(t('patient.records.conditionDeleted'), 'success');
      },
    });
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">
          {t('patient.records.myConditions')}
        </h3>
        <button
          onClick={() => showToast('Add condition feature coming soon', 'info')}
          className="flex items-center gap-2 text-primary-600 text-sm font-medium hover:underline"
        >
          <Plus className="h-4 w-4" />
          {t('patient.records.addNew')}
        </button>
      </div>

      {conditions.map((condition) => (
        <div
          key={condition.id}
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Heart className={`h-5 w-5 ${
                  condition.severity === 'severe' ? 'text-red-600' :
                  condition.severity === 'moderate' ? 'text-yellow-600' :
                  'text-green-600'
                }`} />
                <p className="font-bold text-gray-900">{condition.name}</p>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Diagnosed {new Date(condition.diagnosedDate).toLocaleDateString()} • {condition.doctor}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              condition.severity === 'severe' ? 'bg-red-100 text-red-800' :
              condition.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {condition.severity.toUpperCase()}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-gray-500">Latest Reading</p>
              <p className="font-medium">{condition.latestReading}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Next Checkup</p>
              <p className="font-medium">{new Date(condition.nextCheckup).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex gap-3 mt-3">
            <button
              onClick={() => showToast('Edit condition', 'info')}
              className="text-sm text-primary-600 font-medium hover:underline"
            >
              {t('patient.edit')}
            </button>
            <button
              onClick={() => showToast('View trends', 'info')}
              className="text-sm text-primary-600 font-medium hover:underline"
            >
              📊 {t('patient.records.viewTrends')}
            </button>
            <button
              onClick={() => handleDeleteCondition(condition.id, condition.name)}
              className="text-sm text-red-600 font-medium hover:underline"
            >
              {t('common.delete')}
            </button>
          </div>
        </div>
      ))}

      {/* Resolved Conditions */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="font-medium text-gray-700 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          {t('patient.records.resolved')}: Vitamin D Deficiency (Jan 2024 - Jun 2024)
        </p>
      </div>
    </div>
  );
}

// ==================== VACCINATIONS TAB ====================
function RecordsVaccinations({ t, showToast }) {
  const [vaccinations, setVaccinations] = useState([
    {
      id: 1,
      name: 'COVID-19 (Covishield)',
      doses: [
        { dose: 1, date: '2021-04-15', batch: '4120Z004', location: 'PHC Malkajgiri', completed: true },
        { dose: 2, date: '2021-07-15', batch: '4120Z004', location: 'PHC Malkajgiri', completed: true },
        { dose: 'Booster', date: '2022-01-10', batch: '5120A001', location: 'PHC Malkajgiri', completed: true },
      ],
      nextDue: null,
    },
    {
      id: 2,
      name: 'Tetanus Toxoid',
      doses: [
        { dose: 'Last', date: '2020-03-10', batch: 'TT7890', location: 'City Hospital', completed: true },
      ],
      nextDue: '2030-03-10',
    },
    {
      id: 3,
      name: 'Influenza (Flu)',
      doses: [],
      nextDue: '2025-02-01',
      pending: true,
    },
  ]);

  const handleMarkVaccineDone = (vaccineId) => {
    setVaccinations(prev =>
      prev.map(v =>
        v.id === vaccineId
          ? { ...v, pending: false, nextDue: null, doses: [...v.doses, { dose: 'Latest', date: new Date().toISOString().split('T')[0], completed: true }] }
          : v
      )
    );
    showToast(t('patient.records.vaccineMarkedDone'), 'success');
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Pending Vaccination */}
      {vaccinations.filter(v => v.pending).map(vaccine => (
        <div key={vaccine.id} className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-800">
                ⚠️ {t('patient.records.pendingVaccine')}: {vaccine.name}
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Due {new Date(vaccine.nextDue).toLocaleDateString()}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleMarkVaccineDone(vaccine.id)}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                >
                  ✅ {t('patient.records.markDone')}
                </button>
                <button
                  onClick={() => showToast('Reminder set', 'success')}
                  className="px-4 py-2 bg-white border border-amber-300 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors"
                >
                  🔔 {t('patient.remindMe')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Completed Vaccinations */}
      {vaccinations.filter(v => !v.pending).map(vaccine => (
        <div key={vaccine.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Syringe className="h-5 w-5 text-primary-600" />
            <p className="font-bold text-gray-900">{vaccine.name}</p>
          </div>

          <div className="space-y-2">
            {vaccine.doses.map((dose, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>
                    {typeof dose.dose === 'number' ? `Dose ${dose.dose}` : dose.dose}: {new Date(dose.date).toLocaleDateString()}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{dose.location}</span>
              </div>
            ))}
          </div>

          {vaccine.nextDue && (
            <p className="text-xs text-gray-500 mt-3">
              Next due: {new Date(vaccine.nextDue).toLocaleDateString()}
            </p>
          )}

          {vaccine.name.includes('COVID') && (
            <button
              onClick={() => showToast('View certificate', 'info')}
              className="mt-3 text-sm text-primary-600 font-medium flex items-center gap-1 hover:underline"
            >
              <Eye className="h-4 w-4" />
              {t('patient.records.viewCertificate')}
            </button>
          )}
        </div>
      ))}

      {/* Add Vaccination */}
      <div className="flex items-center justify-between mt-4">
        <h3 className="font-bold text-gray-900">{t('patient.records.addVaccination')}</h3>
        <button
          onClick={() => showToast('Add vaccination feature coming soon', 'info')}
          className="flex items-center gap-2 text-primary-600 text-sm font-medium hover:underline"
        >
          <Plus className="h-4 w-4" />
          {t('patient.records.addNew')}
        </button>
      </div>
    </div>
  );
}

// ==================== LAB REPORTS TAB ====================
function RecordsLabReports({ t, showToast }) {
  const [labReports, setLabReports] = useState([
    {
      id: 1,
      name: 'HbA1c',
      date: '2025-01-15',
      lab: 'Apollo Diagnostics',
      results: [
        { test: 'HbA1c', value: '7.2%', normal: '<7.0%', status: 'high' },
      ],
      summary: 'Acceptable (Target <7.0%)',
    },
    {
      id: 2,
      name: 'Lipid Profile',
      date: '2024-12-10',
      lab: 'City Labs',
      results: [
        { test: 'Total Cholesterol', value: '180', normal: '<200', status: 'normal' },
        { test: 'HDL', value: '45', normal: '>40', status: 'normal' },
        { test: 'LDL', value: '100', normal: '<130', status: 'normal' },
        { test: 'Triglycerides', value: '150', normal: '<150', status: 'normal' },
      ],
      summary: 'All values normal',
    },
  ]);

  return (
    <div className="space-y-4 animate-fadeIn">
      {labReports.map((report) => (
        <div key={report.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-gray-900">{report.name}</p>
              <p className="text-xs text-gray-500">
                {new Date(report.date).toLocaleDateString()} • {report.lab}
              </p>
            </div>
            <FlaskConical className="h-5 w-5 text-primary-600" />
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-xs text-gray-500">Test</th>
                <th className="text-left py-2 text-xs text-gray-500">Value</th>
                <th className="text-left py-2 text-xs text-gray-500">Normal</th>
                <th className="text-left py-2 text-xs text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.results.map((result, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-2 text-sm">{result.test}</td>
                  <td className="py-2 font-medium">{result.value}</td>
                  <td className="py-2 text-gray-500">{result.normal}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      result.status === 'high' ? 'bg-red-100 text-red-800' :
                      result.status === 'low' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {result.status === 'high' ? '🔴 HIGH' :
                       result.status === 'low' ? '🟡 LOW' : '✅ NORMAL'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className={`text-xs mt-3 ${
            report.summary.includes('normal') ? 'text-green-700' : 'text-amber-700'
          }`}>
            {report.summary}
          </p>

          <div className="flex gap-3 mt-3">
            <button
              onClick={() => showToast('View trends', 'info')}
              className="text-sm text-primary-600 font-medium hover:underline"
            >
              📊 {t('patient.records.viewTrends')}
            </button>
            <button
              onClick={() => showToast('Share with doctor', 'info')}
              className="text-sm text-primary-600 font-medium hover:underline"
            >
              📤 {t('patient.records.shareDoctor')}
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={() => showToast('Add lab report feature coming soon', 'info')}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
      >
        <Plus className="h-5 w-5" />
        {t('patient.records.addReport')}
      </button>
    </div>
  );
}

// ==================== ALLERGIES TAB ====================
function RecordsAllergies({ t, showToast, setShowConfirmDialog }) {
  const [allergies, setAllergies] = useState([
    {
      id: 1,
      name: 'Penicillin',
      type: 'Drug',
      severity: 'severe',
      reaction: 'Severe skin rash, difficulty breathing, swelling',
      firstOccurrence: '2018',
      avoid: ['Penicillin', 'Amoxicillin', 'Ampicillin'],
      alternatives: ['Azithromycin', 'Ciprofloxacin'],
    },
    {
      id: 2,
      name: 'Peanuts',
      type: 'Food',
      severity: 'moderate',
      reaction: 'Skin rash, stomach upset',
      firstOccurrence: '2010',
    },
    {
      id: 3,
      name: 'Pollen',
      type: 'Environmental',
      severity: 'mild',
      reaction: 'Sneezing, runny nose',
      firstOccurrence: '2005',
      notes: 'Seasonal (Spring)',
    },
  ]);

  const handleDeleteAllergy = (allergyId, allergyName) => {
    setShowConfirmDialog({
      title: t('common.confirm'),
      message: t('patient.records.confirmDeleteAllergy', { name: allergyName }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      type: 'danger',
      onConfirm: () => {
        setAllergies(prev => prev.filter(a => a.id !== allergyId));
        showToast(t('patient.records.allergyDeleted'), 'success');
      },
    });
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Warning Banner */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            {t('patient.records.alwaysInformDoctors')}
          </p>
        </div>
      </div>

      {/* Allergies List */}
      {allergies.map((allergy) => (
        <div
          key={allergy.id}
          className={`rounded-xl border p-4 ${
            allergy.severity === 'severe' ? 'border-red-200 bg-red-50' :
            allergy.severity === 'moderate' ? 'border-yellow-200 bg-yellow-50' :
            'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${
                allergy.severity === 'severe' ? 'text-red-600' :
                allergy.severity === 'moderate' ? 'text-yellow-600' :
                'text-green-600'
              }`} />
              <div>
                <p className="font-bold text-gray-900">{allergy.name}</p>
                <p className="text-xs text-gray-500">{allergy.type} • First occurrence: {allergy.firstOccurrence}</p>
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              allergy.severity === 'severe' ? 'bg-red-200 text-red-800' :
              allergy.severity === 'moderate' ? 'bg-yellow-200 text-yellow-800' :
              'bg-green-200 text-green-800'
            }`}>
              {allergy.severity.toUpperCase()}
            </span>
          </div>

          <p className="text-sm text-gray-700 mt-2">{allergy.reaction}</p>

          {allergy.avoid && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-700">Avoid:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {allergy.avoid.map((item, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {allergy.alternatives && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-700">Safe alternatives:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {allergy.alternatives.map((item, idx) => (
                  <span key={idx} className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-3">
            <button
              onClick={() => showToast('Edit allergy', 'info')}
              className="text-sm text-primary-600 font-medium hover:underline"
            >
              {t('patient.edit')}
            </button>
            <button
              onClick={() => handleDeleteAllergy(allergy.id, allergy.name)}
              className="text-sm text-red-600 font-medium hover:underline"
            >
              {t('common.delete')}
            </button>
          </div>
        </div>
      ))}

      {/* Add Allergy Button */}
      <button
        onClick={() => showToast('Add allergy feature coming soon', 'info')}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
      >
        <Plus className="h-5 w-5" />
        {t('patient.records.addAllergy')}
      </button>

      {/* Allergy Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="font-medium text-gray-900 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-600" />
          {t('patient.records.allergyCard')}
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => showToast('Generate allergy card', 'info')}
            className="flex-1 py-2 rounded-lg bg-gray-100 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            📄 {t('patient.records.generateCard')}
          </button>
          <button
            onClick={() => showToast('Download PDF', 'info')}
            className="flex-1 py-2 rounded-lg bg-gray-100 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            📥 {t('patient.records.downloadPdf')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== FAMILY HISTORY TAB ====================
function RecordsFamilyHistory({ t, showToast }) {
  const [familyMembers, setFamilyMembers] = useState([
    { id: 1, relation: 'Father', age: 82, status: 'Living', conditions: ['Diabetes (age 50)', 'Heart disease (age 68)'] },
    { id: 2, relation: 'Mother', age: 78, status: 'Living', conditions: ['Hypertension (age 55)'] },
    { id: 3, relation: 'Brother', age: 52, status: 'Living', conditions: ['None reported'] },
  ]);

  return (
    <div className="space-y-4 animate-fadeIn">
      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
        💡 {t('patient.records.helpsGeneticRisks')}
      </p>

      {familyMembers.map((member) => (
        <div key={member.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-gray-900">
                {member.relation} ({member.age}, {member.status})
              </p>
              <div className="mt-2 space-y-1">
                {member.conditions.map((condition, idx) => (
                  <p key={idx} className="text-sm text-gray-600">• {condition}</p>
                ))}
              </div>
            </div>
            <button
              onClick={() => showToast('Edit family member', 'info')}
              className="text-sm text-primary-600 hover:underline"
            >
              {t('patient.edit')}
            </button>
          </div>
        </div>
      ))}

      {/* Genetic Risk Analysis */}
      <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
        <h4 className="font-bold text-purple-900 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {t('patient.records.geneticRisk')}
        </h4>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span className="text-sm text-red-800">HIGH: Diabetes, Heart disease</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-sm text-yellow-800">MODERATE: Hypertension, Stroke</span>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-700">
          <p className="font-medium">Recommendations:</p>
          <ul className="list-disc list-inside mt-1 text-gray-600">
            <li>Regular checkups every 6 months</li>
            <li>Monitor BP and sugar</li>
            <li>Maintain healthy lifestyle</li>
          </ul>
        </div>
      </div>

      {/* Add Family Member */}
      <button
        onClick={() => showToast('Add family member feature coming soon', 'info')}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
      >
        <Plus className="h-5 w-5" />
        {t('patient.records.addFamilyMember')}
      </button>
    </div>
  );
}

// ==================== SHARE TAB ====================
function RecordsShare({ t, showToast }) {
  const [sharedDoctors, setSharedDoctors] = useState([
    {
      id: 1,
      name: 'Dr. Ramesh Kumar',
      specialty: 'General Physician',
      location: 'Primary Health Center',
      access: 'permanent',
      canView: 'All records',
    },
    {
      id: 2,
      name: 'Dr. Priya Sharma',
      specialty: 'Gynecologist',
      location: 'City Hospital',
      access: 'temporary',
      expiresAt: '2025-01-30',
      canView: 'Limited',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [accessType, setAccessType] = useState('permanent');

  const handleRevokeAccess = (doctorId, doctorName) => {
    setShowConfirmDialog({
      title: t('common.confirm'),
      message: t('patient.records.confirmRevoke', { name: doctorName }),
      confirmText: t('patient.records.revoke'),
      cancelText: t('common.cancel'),
      type: 'warning',
      onConfirm: () => {
        setSharedDoctors(prev => prev.filter(d => d.id !== doctorId));
        showToast(t('patient.records.accessRevoked'), 'success');
      },
    });
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <h3 className="text-lg font-bold text-gray-900">
        {t('patient.records.shareWithDoctor')}
      </h3>

      {/* Currently Shared */}
      {sharedDoctors.map((doctor) => (
        <div key={doctor.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-gray-900">{doctor.name}</p>
              <p className="text-sm text-gray-500">{doctor.specialty} • {doctor.location}</p>
              <div className="mt-2 flex items-center gap-2">
                {doctor.access === 'permanent' ? (
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-600" />
                )}
                <span className="text-xs text-gray-600">
                  Access: {doctor.access.toUpperCase()}
                  {doctor.expiresAt && ` • Expires ${new Date(doctor.expiresAt).toLocaleDateString()}`}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Can view: {doctor.canView}</p>
            </div>
            <button
              onClick={() => handleRevokeAccess(doctor.id, doctor.name)}
              className="text-sm text-red-600 font-medium hover:underline"
            >
              {t('patient.records.revokeAccess')}
            </button>
          </div>
          {doctor.access === 'temporary' && (
            <button
              onClick={() => showToast('Extend access', 'info')}
              className="mt-3 text-sm text-primary-600 font-medium hover:underline"
            >
              ⏰ {t('patient.records.extend')}
            </button>
          )}
        </div>
      ))}

      {/* Share with New Doctor */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-4">
        <p className="font-medium text-gray-700 mb-3">
          {t('patient.records.shareWithNew')}
        </p>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('patient.records.searchDoctor')}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Access Type */}
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
            <input
              type="radio"
              name="access"
              value="permanent"
              checked={accessType === 'permanent'}
              onChange={(e) => setAccessType(e.target.value)}
              className="text-primary-600 focus:ring-primary-500"
            />
            <div>
              <span className="text-sm font-medium">{t('patient.records.permanent')}</span>
              <p className="text-xs text-gray-500">Doctor can always access your records</p>
            </div>
          </label>
          <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
            <input
              type="radio"
              name="access"
              value="temporary"
              checked={accessType === 'temporary'}
              onChange={(e) => setAccessType(e.target.value)}
              className="text-primary-600 focus:ring-primary-500"
            />
            <div>
              <span className="text-sm font-medium">{t('patient.records.temporary')}</span>
              <p className="text-xs text-gray-500">Access expires after 30 days</p>
            </div>
          </label>
        </div>

        {/* Share Button */}
        <button
          onClick={() => showToast('Share feature coming soon', 'info')}
          disabled={!searchQuery}
          className="mt-4 w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          📤 {t('patient.records.shareRecords')}
        </button>
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <p className="text-sm text-blue-800 flex items-start gap-2">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            {t('patient.records.shareInfo')}
          </span>
        </p>
      </div>
    </div>
  );
}

// PropTypes
RecordsOverview.propTypes = {
  t: PropTypes.func.isRequired,
  showToast: PropTypes.func.isRequired,
  setShowConfirmDialog: PropTypes.func.isRequired,
};

RecordsDocuments.propTypes = {
  t: PropTypes.func.isRequired,
  showToast: PropTypes.func.isRequired,
  setShowConfirmDialog: PropTypes.func.isRequired,
};

RecordsConditions.propTypes = {
  t: PropTypes.func.isRequired,
  showToast: PropTypes.func.isRequired,
  setShowConfirmDialog: PropTypes.func.isRequired,
};

RecordsVaccinations.propTypes = {
  t: PropTypes.func.isRequired,
  showToast: PropTypes.func.isRequired,
};

RecordsLabReports.propTypes = {
  t: PropTypes.func.isRequired,
  showToast: PropTypes.func.isRequired,
};

RecordsAllergies.propTypes = {
  t: PropTypes.func.isRequired,
  showToast: PropTypes.func.isRequired,
  setShowConfirmDialog: PropTypes.func.isRequired,
};

RecordsFamilyHistory.propTypes = {
  t: PropTypes.func.isRequired,
  showToast: PropTypes.func.isRequired,
};

RecordsShare.propTypes = {
  t: PropTypes.func.isRequired,
  showToast: PropTypes.func.isRequired,
};

export default PatientRecordsTab;