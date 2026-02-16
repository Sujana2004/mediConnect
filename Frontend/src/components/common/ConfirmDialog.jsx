import React from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle } from 'lucide-react';

const ConfirmDialog = ({ 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  type = 'warning', 
  onConfirm, 
  onClose,
  isLoading = false 
}) => (
  <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl w-full max-w-sm p-6" role="alertdialog" aria-modal="true">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
        type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
      }`}>
        <AlertTriangle className={`h-6 w-6 ${
          type === 'danger' ? 'text-red-600' : 'text-yellow-600'
        }`} />
      </div>
      <h3 className="text-lg font-bold text-gray-900 text-center mb-2">{title}</h3>
      <p className="text-sm text-gray-600 text-center mb-6">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
            type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'
          }`}
        >
          {isLoading ? 'Loading...' : confirmText}
        </button>
      </div>
    </div>
  </div>
);

ConfirmDialog.propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  type: PropTypes.oneOf(['warning', 'danger']),
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

export default ConfirmDialog;