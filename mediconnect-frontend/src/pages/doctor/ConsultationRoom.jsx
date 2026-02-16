// src/pages/doctor/ConsultationRoom.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  MessageSquare,
  FileText,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Paperclip,
  Pill,
  Stethoscope,
  ClipboardList,
  Plus,
  X,
  Save,
  Timer,
  Activity,
  Heart,
  Thermometer,
  Settings,
  Maximize,
  Minimize,
  Users,
  Calendar,
  Download,
  Printer,
  MoreVertical,
  Edit,
  Trash2,
  Image,
  Camera,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth';
import { useVoice } from '../../hooks/useVoice';
import { consultationService, healthRecordsService, medicineService } from '../../services/api';
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
  Select
} from '../../components/common';
import { JitsiMeet } from '../../components/consultation';

// ============================================================================
// CONSTANTS
// ============================================================================

const PRESCRIPTION_FREQUENCIES = [
  { value: 'once_daily', label: 'Once Daily' },
  { value: 'twice_daily', label: 'Twice Daily' },
  { value: 'thrice_daily', label: 'Three Times Daily' },
  { value: 'four_times', label: 'Four Times Daily' },
  { value: 'every_4_hours', label: 'Every 4 Hours' },
  { value: 'every_6_hours', label: 'Every 6 Hours' },
  { value: 'every_8_hours', label: 'Every 8 Hours' },
  { value: 'every_12_hours', label: 'Every 12 Hours' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'as_needed', label: 'As Needed (PRN)' }
];

const MEDICINE_TIMING = [
  { value: 'before_food', label: 'Before Food' },
  { value: 'after_food', label: 'After Food' },
  { value: 'with_food', label: 'With Food' },
  { value: 'empty_stomach', label: 'Empty Stomach' },
  { value: 'bedtime', label: 'At Bedtime' },
  { value: 'morning', label: 'Morning' },
  { value: 'any_time', label: 'Any Time' }
];

const NOTE_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'subjective', label: 'Subjective (S)' },
  { value: 'objective', label: 'Objective (O)' },
  { value: 'assessment', label: 'Assessment (A)' },
  { value: 'plan', label: 'Plan (P)' }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatTime = (dateString) => {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), 'h:mm a');
  } catch {
    return dateString;
  }
};

const formatDuration = (minutes) => {
  if (!minutes) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
};

const getErrorMessage = (error, fallbackMessage = 'An error occurred') => {
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return fallbackMessage;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Consultation Timer Component
 */
const ConsultationTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    const start = new Date(startTime).getTime();
    
    const updateTimer = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTimer = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-full">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <Timer className="w-4 h-4 text-green-600" />
      <span className="font-mono font-semibold text-green-700">
        {formatTimer(elapsed)}
      </span>
    </div>
  );
};

/**
 * Patient Info Panel
 */
const PatientInfoPanel = ({ patient, vitals, allergies, conditions, onViewFullRecords }) => {
  const { t } = useTranslation();

  if (!patient) {
    return (
      <div className="text-center py-8">
        <Loader size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Patient Header */}
      <div className="flex items-center gap-3">
        <Avatar
          name={patient.full_name}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{patient.full_name}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {patient.age && <span>{patient.age}</span>}
            {patient.gender && <span>• {patient.gender}</span>}
          </div>
          {patient.phone && (
            <p className="text-sm text-gray-500">{patient.phone}</p>
          )}
        </div>
      </div>

      {/* Quick Vitals */}
      {vitals && (
        <div className="grid grid-cols-2 gap-2">
          {vitals.systolic_bp && vitals.diastolic_bp && (
            <div className="bg-red-50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-red-600 mb-1">
                <Heart className="w-3 h-3" />
                <span className="text-xs">BP</span>
              </div>
              <p className="font-semibold text-gray-900">
                {vitals.systolic_bp}/{vitals.diastolic_bp}
              </p>
            </div>
          )}
          {vitals.heart_rate && (
            <div className="bg-pink-50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-pink-600 mb-1">
                <Activity className="w-3 h-3" />
                <span className="text-xs">HR</span>
              </div>
              <p className="font-semibold text-gray-900">{vitals.heart_rate} bpm</p>
            </div>
          )}
          {vitals.temperature && (
            <div className="bg-amber-50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-amber-600 mb-1">
                <Thermometer className="w-3 h-3" />
                <span className="text-xs">Temp</span>
              </div>
              <p className="font-semibold text-gray-900">{vitals.temperature}°F</p>
            </div>
          )}
          {vitals.oxygen_saturation && (
            <div className="bg-blue-50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-blue-600 mb-1">
                <Activity className="w-3 h-3" />
                <span className="text-xs">SpO2</span>
              </div>
              <p className="font-semibold text-gray-900">{vitals.oxygen_saturation}%</p>
            </div>
          )}
        </div>
      )}

      {/* Allergies */}
      {allergies && allergies.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-3">
          <p className="text-xs font-medium text-red-700 mb-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Allergies
          </p>
          <div className="flex flex-wrap gap-1">
            {allergies.map((allergy, index) => (
              <Badge key={index} variant="danger" size="sm">
                {allergy.allergen}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Conditions */}
      {conditions && conditions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">
            Existing Conditions
          </p>
          <div className="flex flex-wrap gap-1">
            {conditions.map((condition, index) => (
              <Badge key={index} variant="secondary" size="sm">
                {condition.condition_name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* View Full Records Button */}
      <Button
        variant="outline"
        size="sm"
        fullWidth
        leftIcon={<FileText className="w-4 h-4" />}
        onClick={onViewFullRecords}
      >
        View Full Records
      </Button>
    </div>
  );
};

/**
 * Notes Panel Component
 */
const NotesPanel = ({ notes, onAddNote, onUpdateNote, onDeleteNote, isLoading }) => {
  const { t } = useTranslation();
  const [newNote, setNewNote] = useState({ content: '', note_type: 'general', title: '' });
  const [editingNote, setEditingNote] = useState(null);

  const handleSubmit = async () => {
    if (!newNote.content.trim()) {
      toast.error('Please enter note content');
      return;
    }
    
    await onAddNote(newNote);
    setNewNote({ content: '', note_type: 'general', title: '' });
  };

  const handleUpdate = async () => {
    if (!editingNote?.content.trim()) return;
    
    await onUpdateNote(editingNote.id, {
      content: editingNote.content,
      note_type: editingNote.note_type,
      title: editingNote.title
    });
    setEditingNote(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Add Note Form */}
      <div className="mb-4 space-y-3">
        <Select
          value={newNote.note_type}
          onChange={(e) => setNewNote({ ...newNote, note_type: e.target.value })}
          options={NOTE_TYPES}
          size="sm"
        />
        
        <Input
          value={newNote.title}
          onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
          placeholder="Note title (optional)"
          size="sm"
        />
        
        <TextArea
          value={newNote.content}
          onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
          placeholder="Type notes here..."
          rows={3}
        />
        
        <Button
          variant="primary"
          size="sm"
          leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          onClick={handleSubmit}
          disabled={isLoading || !newNote.content.trim()}
          fullWidth
        >
          Add Note
        </Button>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {notes && notes.length > 0 ? (
          notes.map((note) => (
            <div 
              key={note.id}
              className="bg-gray-50 rounded-lg p-3 group"
            >
              {editingNote?.id === note.id ? (
                <div className="space-y-2">
                  <Select
                    value={editingNote.note_type}
                    onChange={(e) => setEditingNote({ ...editingNote, note_type: e.target.value })}
                    options={NOTE_TYPES}
                    size="sm"
                  />
                  
                  <Input
                    value={editingNote.title || ''}
                    onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                    placeholder="Note title"
                    size="sm"
                  />
                  
                  <TextArea
                    value={editingNote.content}
                    onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                    rows={3}
                    autoFocus
                  />
                  
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleUpdate}
                      disabled={isLoading}
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingNote(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      {note.title && (
                        <h4 className="font-medium text-gray-900 text-sm mb-1">{note.title}</h4>
                      )}
                      <Badge variant="secondary" size="sm">
                        {NOTE_TYPES.find(t => t.value === note.note_type)?.label || note.note_type}
                      </Badge>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingNote(note)}
                        className="p-1 text-gray-400 hover:text-primary-600"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {note.content}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </span>
                    {note.is_private && (
                      <Badge variant="warning" size="sm">Private</Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No Notes"
            description="Start taking consultation notes"
            compact
          />
        )}
      </div>
    </div>
  );
};

/**
 * Prescription Panel Component
 */
const PrescriptionPanel = ({ 
  prescriptions, 
  onAddMedicine, 
  onRemoveMedicine, 
  onSavePrescription,
  isLoading 
}) => {
  const { t } = useTranslation();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Pill className="w-4 h-4 text-primary-600" />
          Prescription
        </h3>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowAddModal(true)}
        >
          Add Medicine
        </Button>
      </div>

      {/* Prescription List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {prescriptions && prescriptions.length > 0 ? (
          prescriptions.map((medicine, index) => (
            <div 
              key={index}
              className="bg-gray-50 rounded-lg p-3 relative group"
            >
              <button
                onClick={() => onRemoveMedicine(index)}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h4 className="font-medium text-gray-900 pr-6">{medicine.medicine_name}</h4>
              <p className="text-sm text-gray-600 mt-1">
                {medicine.dosage} • {medicine.frequency}
              </p>
              {medicine.duration && (
                <p className="text-sm text-gray-500">
                  Duration: {medicine.duration}
                </p>
              )}
              {medicine.timing && (
                <p className="text-xs text-gray-500 mt-1">
                  {MEDICINE_TIMING.find(t => t.value === medicine.timing)?.label || medicine.timing}
                </p>
              )}
              {medicine.instructions && (
                <p className="text-xs text-gray-400 mt-1 italic">
                  {medicine.instructions}
                </p>
              )}
            </div>
          ))
        ) : (
          <EmptyState
            icon={Pill}
            title="No Prescription"
            description="Add medicines to create prescription"
            compact
          />
        )}
      </div>

      {/* Save Button */}
      {prescriptions && prescriptions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Button
            variant="success"
            fullWidth
            leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            onClick={onSavePrescription}
            disabled={isLoading}
          >
            Save Prescription
          </Button>
        </div>
      )}

      {/* Add Medicine Modal */}
      <AddMedicineModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={onAddMedicine}
      />
    </div>
  );
};

/**
 * Add Medicine Modal
 */
const AddMedicineModal = ({ isOpen, onClose, onAdd }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [formData, setFormData] = useState({
    dosage: '',
    frequency: 'twice_daily',
    duration: '',
    timing: 'after_food',
    instructions: '',
    quantity: '',
    refills_allowed: 0
  });

  // Search medicines with debounce
  useEffect(() => {
    const searchMedicines = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearching(true);
        
        // API expects POST with { query: "..." }
        const response = await medicineService.search({ query: searchQuery });
        setSearchResults(response.data?.results || []);
      } catch (error) {
        console.error('Error searching medicines:', error);
        toast.error('Failed to search medicines');
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchMedicines, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSelectMedicine = (medicine) => {
    setSelectedMedicine(medicine);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = () => {
    if (!selectedMedicine || !formData.dosage || !formData.duration) {
      toast.error('Please fill all required fields');
      return;
    }

    // API expects specific structure
    onAdd({
      medicine_id: selectedMedicine.id,
      medicine_name: selectedMedicine.name,
      dosage: formData.dosage,
      frequency: formData.frequency,
      duration: formData.duration,
      timing: formData.timing,
      instructions: formData.instructions,
      quantity: formData.quantity ? parseInt(formData.quantity) : null,
      refills_allowed: formData.refills_allowed
    });

    // Reset form
    setSelectedMedicine(null);
    setFormData({
      dosage: '',
      frequency: 'twice_daily',
      duration: '',
      timing: 'after_food',
      instructions: '',
      quantity: '',
      refills_allowed: 0
    });
    onClose();
  };

  const handleClose = () => {
    setSelectedMedicine(null);
    setSearchQuery('');
    setSearchResults([]);
    setFormData({
      dosage: '',
      frequency: 'twice_daily',
      duration: '',
      timing: 'after_food',
      instructions: '',
      quantity: '',
      refills_allowed: 0
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Medicine"
      size="md"
    >
      <div className="space-y-4">
        {/* Medicine Search */}
        {!selectedMedicine ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Medicine *
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type medicine name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                autoFocus
              />
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              )}
            </div>
            
            {/* Search Results */}
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
                      {medicine.name_generic && `${medicine.name_generic} • `}
                      {medicine.manufacturer}
                    </p>
                    {medicine.strength && (
                      <p className="text-xs text-gray-400">{medicine.strength}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-primary-50 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{selectedMedicine.name}</p>
              <p className="text-sm text-gray-600">{selectedMedicine.name_generic}</p>
            </div>
            <button
              onClick={() => setSelectedMedicine(null)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dosage */}
        <Input
          label="Dosage *"
          value={formData.dosage}
          onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
          placeholder="e.g., 500mg, 1 tablet, 5ml"
          required
        />

        {/* Frequency */}
        <Select
          label="Frequency *"
          value={formData.frequency}
          onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
          options={PRESCRIPTION_FREQUENCIES}
          required
        />

        {/* Timing */}
        <Select
          label="Timing"
          value={formData.timing}
          onChange={(e) => setFormData({ ...formData, timing: e.target.value })}
          options={MEDICINE_TIMING}
        />

        {/* Duration */}
        <Input
          label="Duration *"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
          placeholder="e.g., 7 days, 2 weeks"
          required
        />

        {/* Quantity */}
        <Input
          label="Quantity (optional)"
          type="number"
          value={formData.quantity}
          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
          placeholder="Number of units"
          min={1}
        />

        {/* Instructions */}
        <TextArea
          label="Special Instructions"
          value={formData.instructions}
          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
          placeholder="Additional instructions..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!selectedMedicine || !formData.dosage || !formData.duration}
        >
          Add to Prescription
        </Button>
      </div>
    </Modal>
  );
};

/**
 * Diagnosis Panel Component
 */
const DiagnosisPanel = ({ diagnosis, onUpdateDiagnosis, isLoading }) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [localDiagnosis, setLocalDiagnosis] = useState(diagnosis || '');

  useEffect(() => {
    setLocalDiagnosis(diagnosis || '');
  }, [diagnosis]);

  const handleSave = () => {
    onUpdateDiagnosis(localDiagnosis);
    setIsEditing(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-primary-600" />
          Diagnosis
        </h3>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Edit className="w-3 h-3" />}
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div>
          <TextArea
            value={localDiagnosis}
            onChange={(e) => setLocalDiagnosis(e.target.value)}
            placeholder="Enter diagnosis..."
            rows={6}
            autoFocus
          />
          <div className="flex gap-2 mt-3">
            <Button 
              variant="primary" 
              size="sm" 
              onClick={handleSave}
              disabled={isLoading}
            >
              Save
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setLocalDiagnosis(diagnosis || '');
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : localDiagnosis ? (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <p className="text-gray-700 whitespace-pre-wrap">{localDiagnosis}</p>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="w-full p-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors"
        >
          Click to add diagnosis
        </button>
      )}
    </div>
  );
};

/**
 * End Consultation Modal
 */
const EndConsultationModal = ({ 
  isOpen, 
  onClose, 
  consultation,
  diagnosis,
  prescriptions,
  notes,
  onConfirm, 
  isLoading 
}) => {
  const { t } = useTranslation();
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  const duration = consultation?.actual_start 
    ? Math.floor((Date.now() - new Date(consultation.actual_start).getTime()) / 60000)
    : 0;

  const handleSubmit = () => {
    onConfirm({
      diagnosis: diagnosis || '',
      follow_up_required: followUpRequired,
      follow_up_notes: followUpRequired ? followUpNotes : '',
      follow_up_date: followUpRequired && followUpDate ? followUpDate : null
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="End Consultation"
      size="lg"
    >
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h4 className="font-medium text-gray-900">Consultation Summary</h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Patient:</span>
              <span className="ml-2 font-medium">{consultation?.patient_info?.full_name}</span>
            </div>
            <div>
              <span className="text-gray-500">Duration:</span>
              <span className="ml-2 font-medium">{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Diagnosis Preview */}
          {diagnosis && (
            <div>
              <span className="text-gray-500 text-sm">Diagnosis:</span>
              <p className="mt-1 text-gray-700 line-clamp-2">{diagnosis}</p>
            </div>
          )}

          {/* Prescriptions Preview */}
          {prescriptions && prescriptions.length > 0 && (
            <div>
              <span className="text-gray-500 text-sm">Prescribed Medicines:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {prescriptions.slice(0, 5).map((med, index) => (
                  <Badge key={index} variant="primary">
                    {med.medicine_name}
                  </Badge>
                ))}
                {prescriptions.length > 5 && (
                  <Badge variant="secondary">+{prescriptions.length - 5} more</Badge>
                )}
              </div>
            </div>
          )}

          {/* Notes Count */}
          {notes && notes.length > 0 && (
            <div>
              <span className="text-gray-500 text-sm">Notes:</span>
              <span className="ml-2">{notes.length} consultation notes</span>
            </div>
          )}
        </div>

        {/* Follow-up */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">Follow-up Required?</p>
              <p className="text-sm text-gray-500">Schedule a follow-up appointment</p>
            </div>
            <button
              onClick={() => setFollowUpRequired(!followUpRequired)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                followUpRequired ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  followUpRequired ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {followUpRequired && (
            <div className="space-y-3 pl-4 border-l-2 border-primary-200">
              <Input
                label="Follow-up Date"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
              
              <TextArea
                label="Follow-up Notes"
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="Reason for follow-up, things to monitor..."
                rows={2}
              />
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Are you sure you want to end this consultation?</p>
            <p className="text-sm text-amber-700 mt-1">
              This action cannot be undone. Make sure all notes and prescriptions are saved.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="danger"
          leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneOff className="w-4 h-4" />}
          onClick={handleSubmit}
          disabled={isLoading}
        >
          End Consultation
        </Button>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DoctorConsultationRoom = () => {
  const { t } = useTranslation();
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { speak } = useVoice();

  // Refs
  const jitsiApiRef = useRef(null);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [consultation, setConsultation] = useState(null);
  const [patientHealth, setPatientHealth] = useState(null);
  const [notes, setNotes] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [error, setError] = useState(null);

  // Video controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Side panel
  const [sidePanelTab, setSidePanelTab] = useState('patient');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

  // Modals
  const [showEndModal, setShowEndModal] = useState(false);

  // Tabs for side panel
  const sidePanelTabs = [
    { id: 'patient', label: 'Patient', icon: User },
    { id: 'notes', label: 'Notes', icon: ClipboardList },
    { id: 'prescription', label: 'Prescription', icon: Pill },
    { id: 'diagnosis', label: 'Diagnosis', icon: Stethoscope }
  ];

  // ============================================================================
  // FETCH DATA
  // ============================================================================

  const fetchConsultationData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch consultation details
      const consultationRes = await consultationService.getById(consultationId);
      const consultationData = consultationRes.data;
      setConsultation(consultationData);

      // Set initial diagnosis
      setDiagnosis(consultationData.diagnosis || '');

      // Fetch notes
      try {
        const notesRes = await consultationService.getNotes(consultationId);
        setNotes(notesRes.data?.results || notesRes.data || []);
      } catch (err) {
        console.log('Could not fetch notes:', err);
        setNotes([]);
      }

      // Fetch prescriptions
      try {
        const prescriptionsRes = await consultationService.getPrescriptions(consultationId);
        // API returns { count, results: [{ id, medicine_name, dosage, ... }] }
        const prescriptionData = prescriptionsRes.data?.results || prescriptionsRes.data || [];
        setPrescriptions(prescriptionData);
      } catch (err) {
        console.log('Could not fetch prescriptions:', err);
        setPrescriptions([]);
      }

      // Fetch patient health info (vitals, allergies, conditions)
      if (consultationData.patient) {
        try {
          const [vitalsRes, allergiesRes, conditionsRes] = await Promise.allSettled([
            healthRecordsService.getLatestVitals(),
            healthRecordsService.getActiveAllergies(),
            healthRecordsService.getActiveConditions()
          ]);

          setPatientHealth({
            vitals: vitalsRes.status === 'fulfilled' ? vitalsRes.value.data : null,
            allergies: allergiesRes.status === 'fulfilled' ? allergiesRes.value.data?.results || [] : [],
            conditions: conditionsRes.status === 'fulfilled' ? conditionsRes.value.data?.results || [] : []
          });
        } catch (err) {
          console.log('Could not fetch patient health info:', err);
        }
      }

      // Start consultation if not started
      if (['scheduled', 'waiting_room'].includes(consultationData.status)) {
        try {
          await consultationService.start(consultationId);
          // Refetch to get updated status
          const updatedRes = await consultationService.getById(consultationId);
          setConsultation(updatedRes.data);
        } catch (err) {
          console.error('Error starting consultation:', err);
        }
      }

    } catch (err) {
      console.error('Error fetching consultation:', err);
      setError(getErrorMessage(err, 'Failed to load consultation'));
    } finally {
      setIsLoading(false);
    }
  }, [consultationId]);

  // Initial load
  useEffect(() => {
    fetchConsultationData();
  }, [fetchConsultationData]);

  // Voice announcement on load
  useEffect(() => {
    if (consultation && !isLoading && consultation.patient_info?.full_name) {
      speak(`Consultation started with ${consultation.patient_info.full_name}`);
    }
  }, [consultation, isLoading, speak]);

  // ============================================================================
  // JITSI HANDLERS
  // ============================================================================

  const handleJitsiApiReady = useCallback((api) => {
    jitsiApiRef.current = api;
    console.log('Jitsi API ready');
  }, []);

  const handleVideoConferenceJoined = useCallback((data) => {
    console.log('Video conference joined:', data);
    toast.success('Joined consultation');
  }, []);

  const handleVideoConferenceLeft = useCallback((data) => {
    console.log('Video conference left:', data);
  }, []);

  const handleParticipantJoined = useCallback((data) => {
    console.log('Participant joined:', data);
    speak('Patient joined the consultation');
    toast.success('Patient joined');
  }, [speak]);

  const handleParticipantLeft = useCallback((data) => {
    console.log('Participant left:', data);
    speak('Patient left the consultation');
    toast.info('Patient left');
  }, [speak]);

  // ============================================================================
  // CONTROL HANDLERS
  // ============================================================================

  const handleToggleMute = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleToggleVideo = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo');
      setIsVideoOff(!isVideoOff);
    }
  }, [isVideoOff]);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // ============================================================================
  // NOTES HANDLERS
  // ============================================================================

  const handleAddNote = useCallback(async (noteData) => {
    try {
      setIsActionLoading(true);
      
      // API expects: { note_type, title?, content, is_private? }
      const response = await consultationService.addNote(consultationId, noteData);
      
      setNotes(prev => [response.data, ...prev]);
      toast.success('Note added');
      
      return response.data;
    } catch (err) {
      console.error('Error adding note:', err);
      toast.error(getErrorMessage(err, 'Failed to add note'));
    } finally {
      setIsActionLoading(false);
    }
  }, [consultationId]);

  const handleUpdateNote = useCallback(async (noteId, noteData) => {
    try {
      setIsActionLoading(true);
      
      // Update locally (API endpoint may not exist)
      setNotes(prev => prev.map(n => 
        n.id === noteId ? { ...n, ...noteData } : n
      ));
      
      toast.success('Note updated');
    } catch (err) {
      console.error('Error updating note:', err);
      toast.error('Failed to update note');
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const handleDeleteNote = useCallback(async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    
    try {
      // Delete locally (API endpoint may not exist)
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success('Note deleted');
    } catch (err) {
      console.error('Error deleting note:', err);
      toast.error('Failed to delete note');
    }
  }, []);

  // ============================================================================
  // PRESCRIPTION HANDLERS
  // ============================================================================

  const handleAddMedicine = useCallback((medicine) => {
    setPrescriptions(prev => [...prev, medicine]);
    toast.success('Medicine added');
  }, []);

  const handleRemoveMedicine = useCallback((index) => {
    setPrescriptions(prev => prev.filter((_, i) => i !== index));
    toast.success('Medicine removed');
  }, []);

  const handleSavePrescription = useCallback(async () => {
    if (prescriptions.length === 0) {
      toast.error('Add at least one medicine');
      return;
    }

    try {
      setIsActionLoading(true);
      
      // API expects: { medicines: [{ medicine_id?, medicine_name, dosage, frequency, ... }] }
      // Or individual calls to addPrescription for each medicine
      
      for (const medicine of prescriptions) {
        await consultationService.addPrescription(consultationId, medicine);
      }
      
      speak('Prescription saved successfully');
      toast.success('Prescription saved');
    } catch (err) {
      console.error('Error saving prescription:', err);
      toast.error(getErrorMessage(err, 'Failed to save prescription'));
    } finally {
      setIsActionLoading(false);
    }
  }, [consultationId, prescriptions, speak]);

  // ============================================================================
  // DIAGNOSIS HANDLER
  // ============================================================================

  const handleUpdateDiagnosis = useCallback(async (newDiagnosis) => {
    setDiagnosis(newDiagnosis);
    toast.success('Diagnosis updated');
    
    // Auto-save (will be sent when ending consultation)
  }, []);

  // ============================================================================
  // END CONSULTATION
  // ============================================================================

  const handleEndConsultation = useCallback(async (data) => {
    try {
      setIsActionLoading(true);
      
      // API expects: { diagnosis, follow_up_required, follow_up_notes, follow_up_date }
      await consultationService.end(consultationId, data);

      speak('Consultation ended successfully');
      toast.success('Consultation ended');
      
      // Navigate back to queue/appointments
      setTimeout(() => {
        navigate('/doctor/queue');
      }, 1000);
    } catch (err) {
      console.error('Error ending consultation:', err);
      toast.error(getErrorMessage(err, 'Failed to end consultation'));
    } finally {
      setIsActionLoading(false);
      setShowEndModal(false);
    }
  }, [consultationId, navigate, speak]);

  // ============================================================================
  // OTHER HANDLERS
  // ============================================================================

  const handleViewFullRecords = useCallback(() => {
    if (consultation?.patient) {
      window.open(`/doctor/patients/${consultation.patient}`, '_blank');
    }
  }, [consultation]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader size="lg" className="text-white mx-auto" />
          <p className="text-white mt-4">Loading consultation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !consultation) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <EmptyState
            icon={AlertCircle}
            title="Consultation Not Found"
            description={error}
            action={
              <Button variant="primary" onClick={() => navigate('/doctor/queue')}>
                Go Back
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  // Get join info
  const roomUrl = consultation?.room?.full_room_url || '';
  const roomName = consultation?.room?.room_name || '';

  return (
    <div className="fixed inset-0 bg-gray-900 flex">
      {/* Main Video Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        isSidePanelOpen ? 'mr-80 lg:mr-96' : ''
      }`}>
        {/* Top Bar */}
        <div className="bg-gray-800/90 backdrop-blur-sm px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => navigate('/doctor/queue')}
              className="text-white hover:bg-gray-700"
            >
              Back
            </Button>
            
            <div className="h-6 w-px bg-gray-600" />
            
            <div className="flex items-center gap-3">
              <Avatar
                name={consultation?.patient_info?.full_name}
                size="sm"
              />
              <div>
                <h2 className="text-white font-medium">
                  {consultation?.patient_info?.full_name}
                </h2>
                <p className="text-gray-400 text-sm">
                  {consultation?.reason || 'General Consultation'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {consultation?.actual_start && (
              <ConsultationTimer startTime={consultation.actual_start} />
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
              className="text-white hover:bg-gray-700"
            >
              {isSidePanelOpen ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Video Container */}
        <div className="flex-1 relative bg-black">
          {roomName ? (
            <JitsiMeet
              roomName={roomName}
              userName={`Dr. ${user?.first_name} ${user?.last_name}`}
              userEmail={user?.email}
              isDoctor={true}
              domain={consultation?.room?.jitsi_domain || 'meet.jit.si'}
              onApiReady={handleJitsiApiReady}
              onVideoConferenceJoined={handleVideoConferenceJoined}
              onVideoConferenceLeft={handleVideoConferenceLeft}
              onParticipantJoined={handleParticipantJoined}
              onParticipantLeft={handleParticipantLeft}
              onAudioMuteStatusChanged={(data) => setIsMuted(data.muted)}
              onVideoMuteStatusChanged={(data) => setIsVideoOff(data.muted)}
              className="w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white">
                <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Initializing video call...</p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 text-white px-4 py-3 rounded-lg flex items-center gap-3 z-10">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="flex-1">{error}</p>
              <button onClick={() => setError(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="bg-gray-800/90 backdrop-blur-sm px-4 py-4">
          <div className="flex items-center justify-center gap-4">
            {/* Mute Button */}
            <button
              onClick={handleToggleMute}
              className={`p-4 rounded-full transition-colors ${
                isMuted 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}
            </button>

            {/* Video Button */}
            <button
              onClick={handleToggleVideo}
              className={`p-4 rounded-full transition-colors ${
                isVideoOff 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isVideoOff ? (
                <VideoOff className="w-6 h-6 text-white" />
              ) : (
                <Video className="w-6 h-6 text-white" />
              )}
            </button>

            {/* End Call Button */}
            <button
              onClick={() => setShowEndModal(true)}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
              title="End consultation"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={handleToggleFullscreen}
              className="p-4 rounded-full bg-gray-600 hover:bg-gray-500 transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize className="w-6 h-6 text-white" />
              ) : (
                <Maximize className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className={`fixed right-0 top-0 bottom-0 w-80 lg:w-96 bg-white shadow-xl flex flex-col transition-transform duration-300 z-20 ${
        isSidePanelOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Panel Header / Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {sidePanelTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSidePanelTab(tab.id)}
                className={`flex-1 py-3 px-2 text-center text-sm font-medium transition-colors ${
                  sidePanelTab === tab.id
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4 mx-auto mb-1" />
                <span className="hidden lg:block">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {sidePanelTab === 'patient' && (
            <PatientInfoPanel
              patient={consultation?.patient_info}
              vitals={patientHealth?.vitals}
              allergies={patientHealth?.allergies}
              conditions={patientHealth?.conditions}
              onViewFullRecords={handleViewFullRecords}
            />
          )}

          {sidePanelTab === 'notes' && (
            <NotesPanel
              notes={notes}
              onAddNote={handleAddNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              isLoading={isActionLoading}
            />
          )}

          {sidePanelTab === 'prescription' && (
            <PrescriptionPanel
              prescriptions={prescriptions}
              onAddMedicine={handleAddMedicine}
              onRemoveMedicine={handleRemoveMedicine}
              onSavePrescription={handleSavePrescription}
              isLoading={isActionLoading}
            />
          )}

          {sidePanelTab === 'diagnosis' && (
            <DiagnosisPanel
              diagnosis={diagnosis}
              onUpdateDiagnosis={handleUpdateDiagnosis}
              isLoading={isActionLoading}
            />
          )}
        </div>

        {/* Panel Footer */}
        <div className="border-t border-gray-200 p-4">
          <Button
            variant="danger"
            fullWidth
            leftIcon={<PhoneOff className="w-4 h-4" />}
            onClick={() => setShowEndModal(true)}
          >
            End Consultation
          </Button>
        </div>
      </div>

      {/* End Consultation Modal */}
      <EndConsultationModal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        consultation={consultation}
        diagnosis={diagnosis}
        prescriptions={prescriptions}
        notes={notes}
        onConfirm={handleEndConsultation}
        isLoading={isActionLoading}
      />
    </div>
  );
};

export default DoctorConsultationRoom;