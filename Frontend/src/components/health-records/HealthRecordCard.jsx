// src/components/health-records/HealthRecordCard.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Download,
  Share2,
  Eye,
  Trash2,
  Calendar,
  User,
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Loader2,
  Copy,
  Check,
  Lock,
  Unlock,
  ExternalLink,
  Image,
  FileText as FilePdf,
  File,
} from 'lucide-react';
import { healthRecordsAPI } from '../../services/api';

const HealthRecordCard = ({
  record,
  onDelete,
  onView,
  onShare,
  onUpdate,
  showActions = true,
  compact = false,
}) => {
  const { t } = useTranslation();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null); // 'download', 'share', 'delete', 'view'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Status configuration
  const statusConfig = {
    normal: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle,
      label: t('healthRecords.normal', 'Normal'),
    },
    abnormal: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: AlertCircle,
      label: t('healthRecords.abnormal', 'Abnormal'),
    },
    pending_review: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: Clock,
      label: t('healthRecords.pendingReview', 'Pending Review'),
    },
    reviewed: {
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: CheckCircle,
      label: t('healthRecords.reviewed', 'Reviewed'),
    },
  };

  // File type configuration
  const fileTypeConfig = {
    lab_report: { icon: '📊', label: t('healthRecords.labReport', 'Lab Report') },
    prescription: { icon: '💊', label: t('healthRecords.prescription', 'Prescription') },
    imaging: { icon: '📷', label: t('healthRecords.imaging', 'Imaging') },
    xray: { icon: '🩻', label: t('healthRecords.xray', 'X-Ray') },
    mri: { icon: '🧲', label: t('healthRecords.mri', 'MRI') },
    ct_scan: { icon: '🔬', label: t('healthRecords.ctScan', 'CT Scan') },
    diagnostic: { icon: '📈', label: t('healthRecords.diagnostic', 'Diagnostic') },
    immunization: { icon: '💉', label: t('healthRecords.immunization', 'Immunization') },
    discharge_summary: { icon: '🏥', label: t('healthRecords.dischargeSummary', 'Discharge Summary') },
    consultation: { icon: '📝', label: t('healthRecords.consultation', 'Consultation') },
    insurance: { icon: '📋', label: t('healthRecords.insurance', 'Insurance') },
    other: { icon: '📄', label: t('healthRecords.other', 'Document') },
  };

  // Get status display
  const getStatus = () => {
    return statusConfig[record.status] || statusConfig.pending_review;
  };

  // Get file type display
  const getFileType = () => {
    return fileTypeConfig[record.type] || fileTypeConfig.other;
  };

  // Get file extension icon
  const getFileExtensionIcon = () => {
    const ext = record.file_name?.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return <Image className="h-4 w-4" />;
    }
    if (ext === 'pdf') {
      return <FilePdf className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Handle view/preview
  const handleView = async () => {
    setLoadingAction('view');
    setError(null);

    try {
      if (onView) {
        await onView(record);
      } else {
        // Get download URL and open in new tab
        const response = await healthRecordsAPI.documents.getDownloadUrl(record.id);
        if (response.data?.url) {
          window.open(response.data.url, '_blank');
        }
      }
    } catch (err) {
      console.error('View error:', err);
      setError(t('healthRecords.viewError', 'Failed to open document'));
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle download
  const handleDownload = async () => {
    setLoadingAction('download');
    setError(null);

    try {
      const response = await healthRecordsAPI.documents.getDownloadUrl(record.id);
      
      if (response.data?.url) {
        // Create download link
        const link = document.createElement('a');
        link.href = response.data.url;
        link.download = record.file_name || record.title || 'document';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Download error:', err);
      setError(t('healthRecords.downloadError', 'Failed to download'));
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle share toggle
  const handleShareToggle = async () => {
    setLoadingAction('share');
    setError(null);

    try {
      const response = await healthRecordsAPI.documents.toggleSharing(record.id);
      
      if (response.data) {
        // Update record in parent
        if (onUpdate) {
          onUpdate({ ...record, is_shared: response.data.is_shared });
        }
      }

      setShowShareModal(true);
    } catch (err) {
      console.error('Share error:', err);
      setError(t('healthRecords.shareError', 'Failed to update sharing'));
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setLoadingAction('delete');
    setError(null);

    try {
      await healthRecordsAPI.documents.delete(record.id);
      
      setShowDeleteConfirm(false);
      
      if (onDelete) {
        onDelete(record.id);
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError(t('healthRecords.deleteError', 'Failed to delete document'));
      setShowDeleteConfirm(false);
    } finally {
      setLoadingAction(null);
    }
  };

  // Copy share link
  const copyShareLink = async () => {
    const shareUrl = `${window.location.origin}/shared/record/${record.share_token || record.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
    }
  };

  const status = getStatus();
  const fileType = getFileType();
  const StatusIcon = status.icon;

  // Compact variant
  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow">
        <div className="flex items-center min-w-0">
          <span className="text-xl mr-3 flex-shrink-0">{fileType.icon}</span>
          <div className="min-w-0">
            <h4 className="font-medium text-gray-900 truncate">{record.title}</h4>
            <p className="text-xs text-gray-500">{formatDate(record.date || record.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={handleView}
            disabled={loadingAction === 'view'}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 disabled:opacity-50"
            aria-label={t('healthRecords.view', 'View')}
          >
            {loadingAction === 'view' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={handleDownload}
            disabled={loadingAction === 'download'}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 disabled:opacity-50"
            aria-label={t('healthRecords.download', 'Download')}
          >
            {loadingAction === 'download' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
        {/* Header */}
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Icon and Title */}
            <div className="flex items-start min-w-0">
              <div className="text-3xl mr-4 flex-shrink-0">{fileType.icon}</div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 truncate" title={record.title}>
                  {record.title}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">{fileType.label}</p>
                
                {/* Status Badge */}
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: File info */}
            <div className="text-right flex-shrink-0">
              <div className="flex items-center text-sm text-gray-500 gap-1">
                {getFileExtensionIcon()}
                <span>{formatFileSize(record.file_size)}</span>
              </div>
              {record.is_shared && (
                <div className="mt-1 flex items-center text-xs text-blue-600 gap-1 justify-end">
                  <Unlock className="h-3 w-3" />
                  {t('healthRecords.shared', 'Shared')}
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="mt-4 space-y-2">
            {/* Date */}
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
              <span>{formatDate(record.date || record.created_at)}</span>
            </div>

            {/* Hospital/Facility */}
            {(record.hospital || record.facility_name) && (
              <div className="flex items-center text-sm text-gray-600">
                <Building2 className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="truncate">{record.hospital || record.facility_name}</span>
              </div>
            )}

            {/* Doctor */}
            {(record.doctor || record.doctor_name) && (
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                <span className="truncate">Dr. {record.doctor || record.doctor_name}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {record.description && (
            <p className="mt-3 text-sm text-gray-600 line-clamp-2">
              {record.description}
            </p>
          )}

          {/* Shared With */}
          {record.shared_with && record.shared_with.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">
                {t('healthRecords.sharedWith', 'Shared with')}:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {record.shared_with.slice(0, 3).map((person, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                  >
                    {person.name || person}
                  </span>
                ))}
                {record.shared_with.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                    +{record.shared_with.length - 3} {t('healthRecords.more', 'more')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center gap-1">
              {/* View */}
              <button
                onClick={handleView}
                disabled={loadingAction === 'view'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                aria-label={t('healthRecords.view', 'View')}
              >
                {loadingAction === 'view' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{t('healthRecords.view', 'View')}</span>
              </button>

              {/* Download */}
              <button
                onClick={handleDownload}
                disabled={loadingAction === 'download'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                aria-label={t('healthRecords.download', 'Download')}
              >
                {loadingAction === 'download' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{t('healthRecords.download', 'Download')}</span>
              </button>

              {/* Share */}
              <button
                onClick={handleShareToggle}
                disabled={loadingAction === 'share'}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50 ${
                  record.is_shared
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
                aria-label={t('healthRecords.share', 'Share')}
              >
                {loadingAction === 'share' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{t('healthRecords.share', 'Share')}</span>
              </button>
            </div>

            {/* Delete */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loadingAction === 'delete'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              aria-label={t('healthRecords.delete', 'Delete')}
            >
              {loadingAction === 'delete' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{t('healthRecords.delete', 'Delete')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 animate-scale-in">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
              {t('healthRecords.deleteTitle', 'Delete Document?')}
            </h3>

            <p className="text-gray-600 text-center mb-6">
              {t('healthRecords.deleteMessage', 'This action cannot be undone. The document will be permanently deleted.')}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loadingAction === 'delete'}
                className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={loadingAction === 'delete'}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {loadingAction === 'delete' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  t('common.delete', 'Delete')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {t('healthRecords.shareDocument', 'Share Document')}
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Share Status */}
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {record.is_shared ? (
                    <Unlock className="h-5 w-5 text-green-600 mr-2" />
                  ) : (
                    <Lock className="h-5 w-5 text-gray-400 mr-2" />
                  )}
                  <span className="font-medium">
                    {record.is_shared
                      ? t('healthRecords.sharingEnabled', 'Sharing Enabled')
                      : t('healthRecords.sharingDisabled', 'Sharing Disabled')}
                  </span>
                </div>
                <button
                  onClick={handleShareToggle}
                  disabled={loadingAction === 'share'}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    record.is_shared
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {record.is_shared
                    ? t('healthRecords.disable', 'Disable')
                    : t('healthRecords.enable', 'Enable')}
                </button>
              </div>
            </div>

            {/* Share Link */}
            {record.is_shared && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('healthRecords.shareLink', 'Share Link')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/shared/record/${record.share_token || record.id}`}
                    className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600"
                  />
                  <button
                    onClick={copyShareLink}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {copied ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600 mt-1">
                    {t('healthRecords.linkCopied', 'Link copied to clipboard!')}
                  </p>
                )}
              </div>
            )}

            {/* Share with Doctors */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('healthRecords.shareWithDoctor', 'Share with your doctors')}
              </label>
              <p className="text-sm text-gray-500">
                {t('healthRecords.shareWithDoctorHint', 'Doctors you have appointments with can view this document during consultations.')}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              {t('common.done', 'Done')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default HealthRecordCard;