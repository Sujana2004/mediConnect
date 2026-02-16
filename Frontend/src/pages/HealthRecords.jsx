import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  Search,
  Filter,
  FileText,
  Download,
  Share2,
  Eye,
  Trash2,
  Calendar,
  User,
  AlertCircle,
  Plus,
  ChevronRight,
  Lock,
  Globe,
  Image,
  File,
  BarChart,
  Heart,
  X,
  Loader2,
  Check,
  Users,
  Building2,
  RefreshCw,
  ChevronDown,
  ExternalLink,
  Clock,
  Shield
} from 'lucide-react';
import { healthRecordsAPI, doctorsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const HealthRecords = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Determine user role
  const isDoctor = user?.role === 'doctor';
  const isPatient = user?.role === 'patient';

  // State
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    dateRange: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    type: 'lab_report',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [isDragging, setIsDragging] = useState(false);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [recordToShare, setRecordToShare] = useState(null);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctors, setSelectedDoctors] = useState([]);
  const [shareExpiry, setShareExpiry] = useState('30');
  const [isSharing, setIsSharing] = useState(false);

  // Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewRecord, setPreviewRecord] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    shared: 0,
    hospitals: 0,
    storageUsed: 0,
    storageLimit: 1024 // MB
  });

  // For doctors: accessible patients
  const [accessiblePatients, setAccessiblePatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Record types
  const recordTypes = [
    { id: 'lab_report', label: t('healthRecords.labReport', 'Lab Report'), icon: FileText, color: 'blue' },
    { id: 'prescription', label: t('healthRecords.prescription', 'Prescription'), icon: FileText, color: 'green' },
    { id: 'imaging', label: t('healthRecords.imaging', 'Imaging/Scan'), icon: Image, color: 'purple' },
    { id: 'diagnostic', label: t('healthRecords.diagnostic', 'Diagnostic'), icon: BarChart, color: 'orange' },
    { id: 'immunization', label: t('healthRecords.immunization', 'Vaccination'), icon: Heart, color: 'red' },
    { id: 'discharge_summary', label: t('healthRecords.dischargeSummary', 'Discharge Summary'), icon: Building2, color: 'teal' },
    { id: 'other', label: t('healthRecords.other', 'Other'), icon: File, color: 'gray' }
  ];

  // Fetch records based on role
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let response;
      
      if (isDoctor) {
        // Doctor: fetch accessible patients first
        const patientsRes = await healthRecordsAPI.sharing.getAccessiblePatients();
        setAccessiblePatients(patientsRes.data || []);
        
        // If a patient is selected, fetch their shared records
        if (selectedPatient) {
          response = await healthRecordsAPI.sharing.getPatientRecords(selectedPatient);
        } else {
          // Show empty until patient selected
          setRecords([]);
          setFilteredRecords([]);
          setIsLoading(false);
          return;
        }
      } else {
        // Patient: fetch own documents
        response = await healthRecordsAPI.documents.list();
      }

      const data = response.data?.results || response.data?.documents || response.data || [];
      setRecords(Array.isArray(data) ? data : []);
      setFilteredRecords(Array.isArray(data) ? data : []);

      // Fetch stats
      if (isPatient) {
        try {
          const storageRes = await healthRecordsAPI.documents.getStorageStats();
          const sharingRes = await healthRecordsAPI.sharing.getMyShares();
          
          setStats({
            total: data.length,
            shared: sharingRes.data?.length || 0,
            hospitals: new Set(data.map(r => r.hospital_name || r.facility_name).filter(Boolean)).size,
            storageUsed: storageRes.data?.used_mb || 0,
            storageLimit: storageRes.data?.limit_mb || 1024
          });
        } catch (err) {
          console.error('Failed to fetch stats:', err);
        }
      }

    } catch (err) {
      console.error('Error fetching records:', err);
      setError(t('healthRecords.fetchError', 'Failed to load health records'));
    } finally {
      setIsLoading(false);
    }
  }, [isDoctor, isPatient, selectedPatient, t]);

  // Initial fetch
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Filter records when search/filters change
  useEffect(() => {
    filterRecords();
  }, [searchTerm, filters, records]);

  // Filter records
  const filterRecords = () => {
    let result = [...records];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(record =>
        (record.title || '').toLowerCase().includes(term) ||
        (record.document_type || record.type || '').toLowerCase().includes(term) ||
        (record.hospital_name || '').toLowerCase().includes(term) ||
        (record.doctor_name || '').toLowerCase().includes(term)
      );
    }

    // Type filter
    if (filters.type) {
      result = result.filter(record => 
        (record.document_type || record.type) === filters.type
      );
    }

    // Status filter
    if (filters.status) {
      result = result.filter(record => record.status === filters.status);
    }

    setFilteredRecords(result);
  };

  // Handle drag and drop
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  // Handle file selection
  const handleFileSelection = (file) => {
    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      alert(t('healthRecords.fileSizeLimit', 'File size must be less than 50MB'));
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 
                          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      alert(t('healthRecords.invalidFileType', 'Invalid file type. Please upload PDF, images, or documents.'));
      return;
    }

    setSelectedFile(file);
    setUploadForm(prev => ({
      ...prev,
      title: prev.title || file.name.split('.')[0]
    }));
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) {
      alert(t('healthRecords.selectFile', 'Please select a file to upload'));
      return;
    }

    if (!uploadForm.title.trim()) {
      alert(t('healthRecords.enterTitle', 'Please enter a title for the document'));
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', uploadForm.title.trim());
      formData.append('document_type', uploadForm.type);
      formData.append('description', uploadForm.description);
      formData.append('document_date', uploadForm.date);

      await healthRecordsAPI.documents.upload(formData);

      // Success
      setShowUploadModal(false);
      resetUploadForm();
      fetchRecords();
      
    } catch (err) {
      console.error('Error uploading file:', err);
      alert(err?.message || t('healthRecords.uploadError', 'Failed to upload file'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Reset upload form
  const resetUploadForm = () => {
    setSelectedFile(null);
    setUploadForm({
      title: '',
      type: 'lab_report',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle delete
  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm(t('healthRecords.confirmDelete', 'Are you sure you want to delete this record?'))) {
      return;
    }

    try {
      await healthRecordsAPI.documents.delete(recordId);
      fetchRecords();
    } catch (err) {
      console.error('Error deleting record:', err);
      alert(t('healthRecords.deleteError', 'Failed to delete record'));
    }
  };

  // Handle share
  const openShareModal = async (record) => {
    setRecordToShare(record);
    setSelectedDoctors([]);
    setShowShareModal(true);

    // Fetch available doctors
    try {
      const response = await doctorsAPI.list({ limit: 50 });
      setAvailableDoctors(response.data?.results || response.data || []);
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    }
  };

  const handleShare = async () => {
    if (selectedDoctors.length === 0) {
      alert(t('healthRecords.selectDoctor', 'Please select at least one doctor'));
      return;
    }

    setIsSharing(true);

    try {
      // Share with each selected doctor
      for (const doctorId of selectedDoctors) {
        await healthRecordsAPI.sharing.share({
          doctor_id: doctorId,
          document_ids: [recordToShare.id],
          expires_in_days: parseInt(shareExpiry) || 30,
          access_level: 'view'
        });
      }

      setShowShareModal(false);
      setRecordToShare(null);
      setSelectedDoctors([]);
      fetchRecords();
      
      alert(t('healthRecords.shareSuccess', 'Record shared successfully!'));
    } catch (err) {
      console.error('Error sharing record:', err);
      alert(t('healthRecords.shareError', 'Failed to share record'));
    } finally {
      setIsSharing(false);
    }
  };

  // Handle download
  const handleDownload = async (record) => {
    try {
      const response = await healthRecordsAPI.documents.getDownloadUrl(record.id);
      const url = response.data?.url || response.data?.download_url;
      
      if (url) {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('Error downloading:', err);
      alert(t('healthRecords.downloadError', 'Failed to download file'));
    }
  };

  // Handle preview
  const handlePreview = (record) => {
    setPreviewRecord(record);
    setShowPreviewModal(true);
  };

  // Toggle doctor selection for sharing
  const toggleDoctorSelection = (doctorId) => {
    setSelectedDoctors(prev => 
      prev.includes(doctorId)
        ? prev.filter(id => id !== doctorId)
        : [...prev, doctorId]
    );
  };

  // Get record type config
  const getRecordTypeConfig = (type) => {
    return recordTypes.find(t => t.id === type) || recordTypes[recordTypes.length - 1];
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Render record card
  const renderRecordCard = (record) => {
    const typeConfig = getRecordTypeConfig(record.document_type || record.type);
    const IconComponent = typeConfig.icon;
    const isShared = record.shared_with?.length > 0 || record.is_shared;

    return (
      <div 
        key={record.id}
        className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      >
        {/* Card Header */}
        <div className={`h-2 bg-${typeConfig.color}-500`}></div>
        
        <div className="p-4">
          {/* Title and Type */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 bg-${typeConfig.color}-100 rounded-lg`}>
                <IconComponent className={`h-5 w-5 text-${typeConfig.color}-600`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 line-clamp-1">{record.title}</h3>
                <p className="text-sm text-gray-500">{typeConfig.label}</p>
              </div>
            </div>
            
            {/* Shared badge */}
            {isShared && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                <Share2 className="h-3 w-3" />
                {t('healthRecords.shared', 'Shared')}
              </span>
            )}
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            {record.document_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{new Date(record.document_date).toLocaleDateString()}</span>
              </div>
            )}
            {record.hospital_name && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="truncate">{record.hospital_name}</span>
              </div>
            )}
            {record.doctor_name && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span>{record.doctor_name}</span>
              </div>
            )}
            {record.file_size && (
              <div className="flex items-center gap-2">
                <File className="h-4 w-4 text-gray-400" />
                <span>{formatFileSize(record.file_size)}</span>
              </div>
            )}
          </div>

          {/* Status badge */}
          {record.status && record.status !== 'normal' && (
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-3 ${
              record.status === 'abnormal' 
                ? 'bg-red-100 text-red-700' 
                : record.status === 'pending_review'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
            }`}>
              {record.status === 'abnormal' && <AlertCircle className="h-3 w-3 mr-1" />}
              {record.status.replace('_', ' ')}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePreview(record)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title={t('healthRecords.preview', 'Preview')}
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDownload(record)}
                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title={t('healthRecords.download', 'Download')}
              >
                <Download className="h-4 w-4" />
              </button>
              {isPatient && (
                <button
                  onClick={() => openShareModal(record)}
                  className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title={t('healthRecords.share', 'Share')}
                >
                  <Share2 className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {isPatient && (
              <button
                onClick={() => handleDeleteRecord(record.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title={t('healthRecords.delete', 'Delete')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Loading skeleton
  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
          <div className="h-2 bg-gray-200 rounded-full w-full mb-4"></div>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isDoctor 
                  ? t('healthRecords.patientRecords', 'Patient Records')
                  : t('healthRecords.title', 'Health Records')
                }
              </h1>
              <p className="text-gray-600 mt-1">
                {isDoctor
                  ? t('healthRecords.doctorSubtitle', 'View health records shared by your patients')
                  : t('healthRecords.subtitle', 'Manage and share your medical documents securely')
                }
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchRecords()}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                title={t('common.refresh', 'Refresh')}
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              
              {isPatient && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('healthRecords.uploadRecord', 'Upload Record')}</span>
                  <span className="sm:hidden">{t('healthRecords.upload', 'Upload')}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Doctor: Patient Selector */}
        {isDoctor && (
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('healthRecords.selectPatient', 'Select a patient to view their shared records')}
            </label>
            <select
              value={selectedPatient || ''}
              onChange={(e) => setSelectedPatient(e.target.value || null)}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('healthRecords.choosePatient', '-- Choose a patient --')}</option>
              {accessiblePatients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.name || `${patient.first_name} ${patient.last_name}`}
                </option>
              ))}
            </select>
            
            {accessiblePatients.length === 0 && !isLoading && (
              <p className="mt-2 text-sm text-gray-500">
                {t('healthRecords.noPatientsShared', 'No patients have shared their records with you yet.')}
              </p>
            )}
          </div>
        )}

        {/* Patient: Stats Overview */}
        {isPatient && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">{t('healthRecords.totalRecords', 'Total Records')}</div>
            </div>
            
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Share2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.shared}</div>
              <div className="text-sm text-gray-600">{t('healthRecords.sharedWithDoctors', 'Shared with Doctors')}</div>
            </div>
            
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.hospitals}</div>
              <div className="text-sm text-gray-600">{t('healthRecords.hospitals', 'Hospitals')}</div>
            </div>
            
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BarChart className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                {stats.storageUsed.toFixed(1)} MB
              </div>
              <div className="text-sm text-gray-600">
                / {stats.storageLimit} MB {t('healthRecords.storage', 'Storage')}
              </div>
              {/* Storage bar */}
              <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500 rounded-full"
                  style={{ width: `${Math.min((stats.storageUsed / stats.storageLimit) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('healthRecords.searchPlaceholder', 'Search records...')}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Type filter */}
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('healthRecords.allTypes', 'All Types')}</option>
              {recordTypes.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('healthRecords.allStatus', 'All Status')}</option>
              <option value="normal">{t('healthRecords.normal', 'Normal')}</option>
              <option value="abnormal">{t('healthRecords.abnormal', 'Abnormal')}</option>
              <option value="pending_review">{t('healthRecords.pendingReview', 'Pending Review')}</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => fetchRecords()}
              className="ml-auto text-red-600 hover:text-red-800 underline text-sm"
            >
              {t('common.tryAgain', 'Try again')}
            </button>
          </div>
        )}

        {/* Records Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('healthRecords.allRecords', 'All Records')} 
              {!isLoading && ` (${filteredRecords.length})`}
            </h2>
          </div>

          {isLoading ? (
            renderSkeleton()
          ) : filteredRecords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredRecords.map(renderRecordCard)}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || filters.type || filters.status
                  ? t('healthRecords.noMatchingRecords', 'No matching records found')
                  : isDoctor && !selectedPatient
                    ? t('healthRecords.selectPatientPrompt', 'Select a patient to view their records')
                    : t('healthRecords.noRecordsFound', 'No health records yet')
                }
              </h3>
              <p className="text-gray-600 mb-6">
                {isPatient && !searchTerm && !filters.type
                  ? t('healthRecords.uploadFirstRecord', 'Upload your first health record to get started')
                  : t('healthRecords.tryDifferentFilters', 'Try adjusting your search or filters')
                }
              </p>
              {isPatient && !searchTerm && !filters.type && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  {t('healthRecords.uploadFirst', 'Upload First Record')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Record Types Quick Filter */}
        {isPatient && records.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('healthRecords.recordTypes', 'Record Types')}
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {recordTypes.map(type => {
                const count = records.filter(r => (r.document_type || r.type) === type.id).length;
                const IconComponent = type.icon;
                const isActive = filters.type === type.id;
                
                return (
                  <button
                    key={type.id}
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      type: isActive ? '' : type.id 
                    }))}
                    className={`text-center p-3 border rounded-xl transition-colors ${
                      isActive 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`inline-flex p-2 bg-${type.color}-100 rounded-full mb-2`}>
                      <IconComponent className={`h-5 w-5 text-${type.color}-600`} />
                    </div>
                    <div className="font-semibold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-500 truncate">{type.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Security Info */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6" />
            <h3 className="text-xl font-bold">{t('healthRecords.yourDataIsSecure', 'Your Data is Secure')}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">{t('healthRecords.encrypted', 'End-to-End Encrypted')}</div>
                <div className="text-sm opacity-80">{t('healthRecords.encryptedDesc', 'Your data is encrypted at rest and in transit')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">{t('healthRecords.compliant', 'HIPAA Compliant')}</div>
                <div className="text-sm opacity-80">{t('healthRecords.compliantDesc', 'Meets healthcare data standards')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">{t('healthRecords.control', 'You Control Access')}</div>
                <div className="text-sm opacity-80">{t('healthRecords.controlDesc', 'Share and revoke access anytime')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {t('healthRecords.uploadRecord', 'Upload Health Record')}
                </h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drop Zone */}
              <div
                ref={dropZoneRef}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors mb-6 ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50' 
                    : selectedFile 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {selectedFile ? (
                  <div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="font-medium text-gray-900 mb-1">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500 mb-3">
                      {formatFileSize(selectedFile.size)}
                    </p>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      {t('healthRecords.removeFile', 'Remove file')}
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">
                      {t('healthRecords.dragDrop', 'Drag and drop your file here, or')}
                    </p>
                    <label className="cursor-pointer">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileInputChange}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />
                      <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block">
                        {t('healthRecords.browseFiles', 'Browse Files')}
                      </span>
                    </label>
                    <p className="text-xs text-gray-400 mt-3">
                      {t('healthRecords.supportedFormats', 'PDF, JPG, PNG, DOC up to 50MB')}
                    </p>
                  </>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('healthRecords.documentTitle', 'Document Title')} *
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('healthRecords.enterTitle', 'Enter document title')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('healthRecords.documentType', 'Document Type')}
                  </label>
                  <select
                    value={uploadForm.type}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {recordTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('healthRecords.documentDate', 'Document Date')}
                  </label>
                  <input
                    type="date"
                    value={uploadForm.date}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, date: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('healthRecords.description', 'Description')} ({t('common.optional', 'Optional')})
                  </label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('healthRecords.descriptionPlaceholder', 'Add any notes about this document')}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  disabled={uploading}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || !uploadForm.title.trim() || uploading}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t('healthRecords.uploading', 'Uploading...')}
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      {t('healthRecords.upload', 'Upload')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && recordToShare && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {t('healthRecords.shareRecord', 'Share Record')}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{recordToShare.title}</p>
                </div>
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setRecordToShare(null);
                    setSelectedDoctors([]);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Doctor Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('healthRecords.selectDoctors', 'Select doctors to share with')}
                </label>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {availableDoctors.length > 0 ? (
                    availableDoctors.map(doctor => {
                      const isSelected = selectedDoctors.includes(doctor.id);
                      const doctorName = doctor.name || `Dr. ${doctor.first_name} ${doctor.last_name}`;
                      
                      return (
                        <label
                          key={doctor.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer border-b last:border-0 hover:bg-gray-50 ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleDoctorSelection(doctor.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">{doctorName}</p>
                            <p className="text-sm text-gray-500 truncate">
                              {doctor.specialization?.replace('_', ' ')}
                            </p>
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      {t('healthRecords.loadingDoctors', 'Loading doctors...')}
                    </div>
                  )}
                </div>
              </div>

              {/* Expiry */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('healthRecords.accessExpiry', 'Access expires in')}
                </label>
                <select
                  value={shareExpiry}
                  onChange={(e) => setShareExpiry(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7">7 {t('healthRecords.days', 'days')}</option>
                  <option value="30">30 {t('healthRecords.days', 'days')}</option>
                  <option value="90">90 {t('healthRecords.days', 'days')}</option>
                  <option value="365">1 {t('healthRecords.year', 'year')}</option>
                  <option value="0">{t('healthRecords.noExpiry', 'No expiry')}</option>
                </select>
              </div>

              {/* Selected count */}
              {selectedDoctors.length > 0 && (
                <p className="text-sm text-blue-600 mb-4">
                  {selectedDoctors.length} {t('healthRecords.doctorsSelected', 'doctor(s) selected')}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setRecordToShare(null);
                    setSelectedDoctors([]);
                  }}
                  disabled={isSharing}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleShare}
                  disabled={selectedDoctors.length === 0 || isSharing}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t('healthRecords.sharing', 'Sharing...')}
                    </>
                  ) : (
                    <>
                      <Share2 className="h-5 w-5" />
                      {t('healthRecords.share', 'Share')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewRecord && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-bold text-gray-900">{previewRecord.title}</h3>
                <p className="text-sm text-gray-500">
                  {previewRecord.document_date && new Date(previewRecord.document_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewRecord)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewRecord(null);
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-4 bg-gray-100">
              {previewRecord.file_url ? (
                previewRecord.file_type?.startsWith('image/') ? (
                  <img 
                    src={previewRecord.file_url} 
                    alt={previewRecord.title}
                    className="max-w-full mx-auto rounded-lg shadow-lg"
                  />
                ) : (
                  <iframe
                    src={previewRecord.file_url}
                    className="w-full h-full min-h-[500px] rounded-lg"
                    title={previewRecord.title}
                  />
                )
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {t('healthRecords.previewNotAvailable', 'Preview not available')}
                  </p>
                  <button
                    onClick={() => handleDownload(previewRecord)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {t('healthRecords.downloadToView', 'Download to view')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthRecords;