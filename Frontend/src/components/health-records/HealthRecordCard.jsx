import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, 
  Download, 
  Share2, 
  Eye, 
  Trash2, 
  Calendar, 
  User, 
  Bed,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

const HealthRecordCard = ({ record, onDelete }) => {
  const { t } = useTranslation();

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return 'bg-green-100 text-green-800';
      case 'abnormal': return 'bg-red-100 text-red-800';
      case 'pending_review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'normal': return <CheckCircle className="h-4 w-4" />;
      case 'abnormal': return <AlertCircle className="h-4 w-4" />;
      case 'pending_review': return <Clock className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'lab_report': return '📊';
      case 'prescription': return '💊';
      case 'imaging': return '📷';
      case 'diagnostic': return '📈';
      case 'immunization': return '💉';
      default: return '📄';
    }
  };

  return (
    <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="text-2xl mr-3">{getFileIcon(record.type)}</div>
          <div>
            <h3 className="font-bold text-gray-900">{record.title}</h3>
            <div className="flex items-center mt-1">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                {getStatusIcon(record.status)}
                <span className="ml-1">{t(`healthRecords.${record.status}`)}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">{record.fileSize}</div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
          <span>{new Date(record.date).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Bed className="h-4 w-4 mr-2 text-gray-400" />
          <span>{record.hospital}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <User className="h-4 w-4 mr-2 text-gray-400" />
          <span>{record.doctor}</span>
        </div>
      </div>

      {record.sharedWith && record.sharedWith.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-gray-500 mb-2">{t('healthRecords.sharedWith')}:</div>
          <div className="flex flex-wrap gap-1">
            {record.sharedWith.map((doctor, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
              >
                {doctor}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex space-x-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
            <Eye className="h-4 w-4" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
            <Download className="h-4 w-4" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-50 rounded-lg text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default HealthRecordCard;