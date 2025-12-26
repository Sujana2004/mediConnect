import React, { useState, useEffect } from 'react';
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
  Heart
} from 'lucide-react';
import { Bed } from 'lucide-react';
import HealthRecordCard from '../components/health-records/HealthRecordCard';
import { healthRecordsAPI } from '../services/api';

const HealthRecords = () => {
  const { t } = useTranslation();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    dateRange: '',
    status: ''
  });

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [searchTerm, filters, records]);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const response = await healthRecordsAPI.getRecords();
      setRecords(response.data);
      setFilteredRecords(response.data);
    } catch (error) {
      console.error('Error fetching records:', error);
      // Mock data for demo
      setTimeout(() => {
        const mockRecords = [
          {
            id: 1,
            title: 'Blood Test Report',
            type: 'lab_report',
            date: '2024-01-15',
            hospital: 'Apollo Hospital',
            doctor: 'Dr. Rajesh Sharma',
            status: 'normal',
            sharedWith: ['Dr. Priya Singh'],
            fileSize: '2.4 MB',
            previewUrl: '#'
          },
          {
            id: 2,
            title: 'X-Ray Chest',
            type: 'imaging',
            date: '2024-01-10',
            hospital: 'Fortis Hospital',
            doctor: 'Dr. Amit Patel',
            status: 'abnormal',
            sharedWith: [],
            fileSize: '5.7 MB',
            previewUrl: '#'
          },
          {
            id: 3,
            title: 'Prescription',
            type: 'prescription',
            date: '2024-01-08',
            hospital: 'Medanta Hospital',
            doctor: 'Dr. Sunita Reddy',
            status: 'normal',
            sharedWith: ['Dr. Rohit Kumar'],
            fileSize: '1.2 MB',
            previewUrl: '#'
          },
          {
            id: 4,
            title: 'ECG Report',
            type: 'diagnostic',
            date: '2023-12-20',
            hospital: 'Max Hospital',
            doctor: 'Dr. Neha Gupta',
            status: 'pending_review',
            sharedWith: [],
            fileSize: '3.8 MB',
            previewUrl: '#'
          },
          {
            id: 5,
            title: 'Vaccination Record',
            type: 'immunization',
            date: '2023-12-15',
            hospital: 'City Hospital',
            doctor: 'Dr. Anil Verma',
            status: 'normal',
            sharedWith: ['Dr. Priya Singh'],
            fileSize: '1.5 MB',
            previewUrl: '#'
          },
          {
            id: 6,
            title: 'MRI Scan - Brain',
            type: 'imaging',
            date: '2023-11-30',
            hospital: 'Artemis Hospital',
            doctor: 'Dr. Sameer Joshi',
            status: 'abnormal',
            sharedWith: [],
            fileSize: '15.2 MB',
            previewUrl: '#'
          }
        ];
        setRecords(mockRecords);
        setFilteredRecords(mockRecords);
        setIsLoading(false);
      }, 1000);
    }
  };

  const filterRecords = () => {
    let result = [...records];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(record =>
        record.title.toLowerCase().includes(term) ||
        record.hospital.toLowerCase().includes(term) ||
        record.doctor.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (filters.type) {
      result = result.filter(record => record.type === filters.type);
    }

    // Status filter
    if (filters.status) {
      result = result.filter(record => record.status === filters.status);
    }

    setFilteredRecords(result);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        alert(t('healthRecords.fileSizeLimit'));
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert(t('healthRecords.selectFile'));
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', selectedFile.name);
    formData.append('type', 'other');

    try {
      await healthRecordsAPI.uploadRecord(formData);
      setShowUploadModal(false);
      setSelectedFile(null);
      fetchRecords();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(t('healthRecords.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (window.confirm(t('healthRecords.confirmDelete'))) {
      try {
        await healthRecordsAPI.deleteRecord(recordId);
        fetchRecords();
      } catch (error) {
        console.error('Error deleting record:', error);
        alert(t('healthRecords.deleteError'));
      }
    }
  };

  const recordTypes = [
    { id: 'lab_report', label: t('healthRecords.labReport'), icon: <FileText /> },
    { id: 'prescription', label: t('healthRecords.prescription'), icon: <FileText /> },
    { id: 'imaging', label: t('healthRecords.imaging'), icon: <Image /> },
    { id: 'diagnostic', label: t('healthRecords.diagnostic'), icon: <BarChart /> },
    { id: 'immunization', label: t('healthRecords.immunization'), icon: <Heart /> },
    { id: 'other', label: t('healthRecords.other'), icon: <File /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('healthRecords.title')}
              </h1>
              <p className="text-gray-600 mt-2">
                {t('healthRecords.subtitle')}
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-4 md:mt-0 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('healthRecords.uploadRecord')}
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">{t('healthRecords.total')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{records.length}</div>
            <div className="text-sm text-gray-600">{t('healthRecords.records')}</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">{t('healthRecords.shared')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {records.filter(r => r.sharedWith.length > 0).length}
            </div>
            <div className="text-sm text-gray-600">{t('healthRecords.withDoctors')}</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Bed className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">{t('healthRecords.hospitals')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {new Set(records.map(r => r.hospital)).size}
            </div>
            <div className="text-sm text-gray-600">{t('healthRecords.uniqueHospitals')}</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BarChart className="h-6 w-6 text-orange-600" />
              </div>
              <span className="text-sm text-gray-500">{t('healthRecords.storageUsed')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">24.8 MB</div>
            <div className="text-sm text-gray-600">/ 1 GB {t('healthRecords.free')}</div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow border p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4">
            <div className="flex-1 mb-4 lg:mb-0">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('healthRecords.searchPlaceholder')}
                  className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('healthRecords.allTypes')}</option>
                {recordTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('healthRecords.allStatus')}</option>
                <option value="normal">{t('healthRecords.normal')}</option>
                <option value="abnormal">{t('healthRecords.abnormal')}</option>
                <option value="pending_review">{t('healthRecords.pendingReview')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Records Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {t('healthRecords.allRecords')} ({filteredRecords.length})
            </h2>
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Download className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Filter className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredRecords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecords.map(record => (
                <HealthRecordCard
                  key={record.id}
                  record={record}
                  onDelete={() => handleDeleteRecord(record.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('healthRecords.noRecordsFound')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('healthRecords.uploadFirstRecord')}
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center mx-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('healthRecords.uploadFirst')}
              </button>
            </div>
          )}
        </div>

        {/* Record Types Overview */}
        <div className="bg-white rounded-xl shadow border p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            {t('healthRecords.recordTypes')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {recordTypes.map(type => {
              const count = records.filter(r => r.type === type.id).length;
              return (
                <div
                  key={type.id}
                  className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => setFilters({...filters, type: type.id})}
                >
                  <div className="inline-flex p-3 bg-blue-50 rounded-full mb-3">
                    <div className="text-blue-600">{type.icon}</div>
                  </div>
                  <div className="font-medium text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600">{type.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl p-6">
          <div className="flex items-center mb-4">
            <Lock className="h-6 w-6 mr-3" />
            <h3 className="text-xl font-bold">{t('healthRecords.yourDataIsSecure')}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold">{t('healthRecords.endToEndEncryption')}</div>
                <div className="text-sm opacity-90">{t('healthRecords.encryptionDesc')}</div>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3">
                <Globe className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold">{t('healthRecords.gdprCompliant')}</div>
                <div className="text-sm opacity-90">{t('healthRecords.gdprDesc')}</div>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold">{t('healthRecords.accessControl')}</div>
                <div className="text-sm opacity-90">{t('healthRecords.accessControlDesc')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    {t('healthRecords.uploadRecord')}
                  </h3>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedFile(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  {/* File Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    {selectedFile ? (
                      <div>
                        <FileText className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <div className="font-medium text-gray-900 mb-2">{selectedFile.name}</div>
                        <div className="text-sm text-gray-500 mb-4">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          {t('healthRecords.removeFile')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">
                          {t('healthRecords.dragDrop')}
                        </p>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleFileSelect}
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          />
                          <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            {t('healthRecords.browseFiles')}
                          </span>
                        </label>
                        <p className="text-xs text-gray-400 mt-4">
                          {t('healthRecords.supportedFormats')}
                        </p>
                      </>
                    )}
                  </div>

                  {/* File Details */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('healthRecords.title')}
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder={t('healthRecords.enterTitle')}
                        value={selectedFile?.name?.split('.')[0] || ''}
                        onChange={(e) => {
                          // Update title logic
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('healthRecords.recordType')}
                      </label>
                      <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="">{t('healthRecords.selectType')}</option>
                        {recordTypes.map(type => (
                          <option key={type.id} value={type.id}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('healthRecords.shareWith')}
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder={t('healthRecords.doctorNameEmail')}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowUploadModal(false);
                        setSelectedFile(null);
                      }}
                      className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                      disabled={uploading}
                    >
                      {t('healthRecords.cancel')}
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={!selectedFile || uploading}
                      className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${
                        (!selectedFile || uploading) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {uploading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {t('healthRecords.uploading')}
                        </div>
                      ) : (
                        t('healthRecords.upload')
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthRecords;