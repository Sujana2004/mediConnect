// src/pages/doctor/ConsultationRoom.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  User,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
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
  Maximize,
  Minimize,
  Edit,
  Trash2,
  FileText,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth';
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
import { extractData, extractRoomInfo, extractResults } from '../../utils/apiHelpers';

// ============================================================================
// CONSTANTS
// ============================================================================

const isDev = import.meta.env.DEV;

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

const CONSULTATION_STATES = {
  LOADING: 'loading',
  STARTING: 'starting',
  FETCHING_ROOM: 'fetching_room',
  IN_CALL: 'in_call',
  ENDING: 'ending',
  ENDED: 'ended',
  ERROR: 'error'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const logger = {
  log: (...args) => isDev && console.log('[DoctorConsultation]', ...args),
  error: (...args) => console.error('[DoctorConsultation]', ...args),
  debug: (...args) => isDev && console.debug('[DoctorConsultation DEBUG]', ...args),
};

const getErrorMessage = (error, fallback = 'An error occurred') => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    error?.response?.data?.error?.message ||
    error?.message ||
    fallback
  );
};

const formatDuration = (minutes) => {
  if (!minutes) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
};

// ============================================================================
// SUB-COMPONENTS (Same as before - ConsultationTimer, PatientInfoPanel, etc.)
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
        <Avatar name={patient.full_name} size="lg" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{patient.full_name}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {patient.age && <span>{patient.age} yrs</span>}
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
                {allergy.allergen || allergy.name}
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
                {condition.condition_name || condition.name}
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
const NotesPanel = ({ 
  consultationId,
  notes, 
  onNotesChange,
  isLoading 
}) => {
  const [newNote, setNewNote] = useState({ content: '', note_type: 'general', title: '' });
  const [editingNote, setEditingNote] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddNote = async () => {
    if (!newNote.content.trim()) {
      toast.error('Please enter note content');
      return;
    }

    try {
      setIsSaving(true);
      const response = await consultationService.addNote(consultationId, newNote);
      const addedNote = extractData(response);

      onNotesChange(prev => [addedNote, ...prev]);
      setNewNote({ content: '', note_type: 'general', title: '' });
      toast.success('Note added');
    } catch (err) {
      logger.error('Error adding note:', err);
      toast.error(getErrorMessage(err, 'Failed to add note'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote?.content.trim()) return;

    try {
      setIsSaving(true);
      await consultationService.updateNote(consultationId, editingNote.id, {
        content: editingNote.content,
        note_type: editingNote.note_type,
        title: editingNote.title
      });
      
      onNotesChange(prev => prev.map(n => 
        n.id === editingNote.id ? editingNote : n
      ));
      setEditingNote(null);
      toast.success('Note updated');
    } catch (err) {
      logger.error('Error updating note:', err);
      toast.error(getErrorMessage(err, 'Failed to update note'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;

    try {
      await consultationService.deleteNote(consultationId, noteId);
      onNotesChange(prev => prev.filter(n => n.id !== noteId));
      toast.success('Note deleted');
    } catch (err) {
      logger.error('Error deleting note:', err);
      toast.error(getErrorMessage(err, 'Failed to delete note'));
    }
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
          leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          onClick={handleAddNote}
          disabled={isSaving || !newNote.content.trim()}
          fullWidth
        >
          Add Note
        </Button>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader size="md" />
          </div>
        ) : notes && notes.length > 0 ? (
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
                      onClick={handleUpdateNote}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
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
                        onClick={() => setEditingNote({ ...note })}
                        className="p-1 text-gray-400 hover:text-primary-600"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
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
                      {note.created_at && formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
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
  consultationId,
  prescriptions, 
  onPrescriptionsChange,
  isLoading 
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localPrescriptions, setLocalPrescriptions] = useState([]);

  useEffect(() => {
    setLocalPrescriptions(prescriptions || []);
  }, [prescriptions]);

  const handleAddMedicine = (medicine) => {
    const newMed = { ...medicine, _isNew: true };
    setLocalPrescriptions(prev => [...prev, newMed]);
    toast.success('Medicine added to list');
  };

  const handleRemoveMedicine = (index) => {
    setLocalPrescriptions(prev => prev.filter((_, i) => i !== index));
    toast.success('Medicine removed');
  };

  const handleSavePrescriptions = async () => {
    const newMedicines = localPrescriptions.filter(m => m._isNew);
    
    if (newMedicines.length === 0) {
      toast.info('No new medicines to save');
      return;
    }

    try {
      setIsSaving(true);
      
      for (const medicine of newMedicines) {
        const { _isNew, ...medicineData } = medicine;
        await consultationService.addPrescription(consultationId, medicineData);
      }
      
      setLocalPrescriptions(prev => prev.map(m => ({ ...m, _isNew: false })));
      onPrescriptionsChange(localPrescriptions.map(m => ({ ...m, _isNew: false })));
      
      toast.success('Prescriptions saved');
    } catch (err) {
      logger.error('Error saving prescriptions:', err);
      toast.error(getErrorMessage(err, 'Failed to save prescriptions'));
    } finally {
      setIsSaving(false);
    }
  };

  const hasUnsavedChanges = localPrescriptions.some(m => m._isNew);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Pill className="w-4 h-4 text-primary-600" />
          Prescription
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-600">(unsaved)</span>
          )}
        </h3>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setShowAddModal(true)}
        >
          Add
        </Button>
      </div>

      {/* Prescription List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader size="md" />
          </div>
        ) : localPrescriptions && localPrescriptions.length > 0 ? (
          localPrescriptions.map((medicine, index) => (
            <div 
              key={medicine.id || index}
              className={`bg-gray-50 rounded-lg p-3 relative group ${
                medicine._isNew ? 'ring-2 ring-primary-200' : ''
              }`}
            >
              <button
                onClick={() => handleRemoveMedicine(index)}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex items-start justify-between pr-6">
                <h4 className="font-medium text-gray-900">{medicine.medicine_name}</h4>
                {medicine._isNew && (
                  <Badge variant="warning" size="sm">New</Badge>
                )}
              </div>
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
      {hasUnsavedChanges && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Button
            variant="success"
            fullWidth
            leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            onClick={handleSavePrescriptions}
            disabled={isSaving}
          >
            Save Prescription
          </Button>
        </div>
      )}

      {/* Add Medicine Modal */}
      <AddMedicineModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddMedicine}
      />
    </div>
  );
};

/**
 * Add Medicine Modal
 */
const AddMedicineModal = ({ isOpen, onClose, onAdd }) => {
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
    quantity: ''
  });

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchMedicines = async () => {
      try {
        setIsSearching(true);
        const response = await medicineService.search({ query: searchQuery });
        const results = response?.data?.results || response?.results || [];
        setSearchResults(results);
      } catch (error) {
        logger.error('Error searching medicines:', error);
        setSearchResults([]);
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
    if (!formData.dosage || !formData.duration) {
      toast.error('Please fill dosage and duration');
      return;
    }

    const medicineName = selectedMedicine?.name || searchQuery;
    if (!medicineName) {
      toast.error('Please select or enter medicine name');
      return;
    }

    onAdd({
      medicine_id: selectedMedicine?.id || null,
      medicine_name: medicineName,
      dosage: formData.dosage,
      frequency: formData.frequency,
      duration: formData.duration,
      timing: formData.timing,
      instructions: formData.instructions,
      quantity: formData.quantity ? parseInt(formData.quantity) : null
    });

    handleClose();
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
      quantity: ''
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
              Medicine Name *
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or type medicine name..."
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
                      {medicine.generic_name && `${medicine.generic_name} • `}
                      {medicine.manufacturer}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-primary-50 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{selectedMedicine.name}</p>
              <p className="text-sm text-gray-600">{selectedMedicine.generic_name}</p>
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
        />

        {/* Frequency */}
        <Select
          label="Frequency *"
          value={formData.frequency}
          onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
          options={PRESCRIPTION_FREQUENCIES}
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
          disabled={!formData.dosage || !formData.duration || (!selectedMedicine && !searchQuery)}
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
const DiagnosisPanel = ({ diagnosis, onDiagnosisChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localDiagnosis, setLocalDiagnosis] = useState(diagnosis || '');

  useEffect(() => {
    setLocalDiagnosis(diagnosis || '');
  }, [diagnosis]);

  const handleSave = () => {
    onDiagnosisChange(localDiagnosis);
    setIsEditing(false);
    toast.success('Diagnosis saved');
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
            <Button variant="primary" size="sm" onClick={handleSave}>
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
  prescriptionsCount,
  notesCount,
  onConfirm, 
  isLoading 
}) => {
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
            <div>
              <span className="text-gray-500">Notes:</span>
              <span className="ml-2 font-medium">{notesCount} notes</span>
            </div>
            <div>
              <span className="text-gray-500">Medicines:</span>
              <span className="ml-2 font-medium">{prescriptionsCount} prescribed</span>
            </div>
          </div>

          {diagnosis && (
            <div>
              <span className="text-gray-500 text-sm">Diagnosis:</span>
              <p className="mt-1 text-gray-700 line-clamp-2">{diagnosis}</p>
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
            <p className="font-medium text-amber-800">End this consultation?</p>
            <p className="text-sm text-amber-700 mt-1">
              Make sure all notes and prescriptions are saved before ending.
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
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Refs
  const jitsiApiRef = useRef(null);
  const containerRef = useRef(null);
  const hasStartedRef = useRef(false);

  // State
  const [consultationState, setConsultationState] = useState(CONSULTATION_STATES.LOADING);
  const [roomInfo, setRoomInfo] = useState(null);
  const [notes, setNotes] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [patientHealth, setPatientHealth] = useState(null);

  // Video controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Side panel
  const [sidePanelTab, setSidePanelTab] = useState('patient');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

  // Modals
  const [showEndModal, setShowEndModal] = useState(false);

  // Side panel tabs
  const sidePanelTabs = [
    { id: 'patient', label: 'Patient', icon: User },
    { id: 'notes', label: 'Notes', icon: ClipboardList },
    { id: 'prescription', label: 'Rx', icon: Pill },
    { id: 'diagnosis', label: 'Diagnosis', icon: Stethoscope }
  ];

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Fetch consultation details
   */
  const {
    data: consultation,
    isLoading: consultationLoading,
    isError: consultationError,
    error: consultationErrorData,
    refetch: refetchConsultation
  } = useQuery({
    queryKey: ['consultation', consultationId],
    queryFn: async () => {
      logger.log('Fetching consultation:', consultationId);
      const response = await consultationService.getById(consultationId);
      logger.debug('Raw getById response:', response);
      return extractData(response);
    },
    enabled: !!consultationId,
    staleTime: 1000 * 60,
  });

  // const consultation = consultationResponse?.data || consultationResponse;

  /**
   * Fetch notes
   */
  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ['consultationNotes', consultationId],
    queryFn: async () => {
      const response = await consultationService.getNotes(consultationId);
      const data = extractData(response);
      return extractResults(data);
    },
    enabled: !!consultationId && !!consultation,
  });

  /**
   * Fetch prescriptions
   */
  const { data: prescriptionsData, isLoading: prescriptionsLoading } = useQuery({
    queryKey: ['consultationPrescriptions', consultationId],
    queryFn: async () => {
      const response = await consultationService.getPrescriptions(consultationId);
      const data = extractData(response);
      return extractResults(data);
    },
    enabled: !!consultationId && !!consultation,
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  /**
   * Start consultation
   */
  const startConsultationMutation = useMutation({
    mutationFn: () => consultationService.start(consultationId),
    onSuccess: (response) => {
      const data = extractData(response);
      logger.log('Consultation started, join info:', data);

      const roomData = extractRoomInfo(data);
      if (roomData) {
        setRoomInfo(prev => ({ ...prev, ...roomData }));
      }

      setConsultationState(CONSULTATION_STATES.IN_CALL);
      refetchConsultation();
      toast.success('Consultation started');
    },
    onError: (error) => {
      logger.error('Failed to start consultation:', error);
      toast.error(getErrorMessage(error, 'Failed to start consultation'));
      setConsultationState(CONSULTATION_STATES.ERROR);
    }
  });

  /**
   * Get join info - Separate mutation to get room details
   */
  const getJoinInfoMutation = useMutation({
    mutationFn: () => consultationService.getJoinInfo(consultationId),
    onSuccess: (response) => {
      const data = extractData(response);
      logger.log('Got join info:', data);

      const roomData = extractRoomInfo(data);

      if (roomData?.room_name) {
        setRoomInfo(prev => ({ ...prev, ...roomData }));
        setConsultationState(CONSULTATION_STATES.IN_CALL);
      } else {
        logger.error('No room_name in join info. Raw data:', data);
        toast.error('Could not get room information');
        setConsultationState(CONSULTATION_STATES.ERROR);
      }
    },
    onError: (error) => {
      logger.error('Failed to get join info:', error);
      toast.error(getErrorMessage(error, 'Failed to get room information'));
      setConsultationState(CONSULTATION_STATES.ERROR);
    }
  });

  /**
   * End consultation
   */
  const endConsultationMutation = useMutation({
    mutationFn: (data) => consultationService.end(consultationId, data),
    onSuccess: (response) => {
      logger.log('Consultation ended:', extractData(response));
      setConsultationState(CONSULTATION_STATES.ENDED);
      toast.success('Consultation ended');
      setTimeout(() => navigate('/doctor/queue'), 1500);
    },
    onError: (error) => {
      logger.error('Failed to end consultation:', error);
      toast.error(getErrorMessage(error, 'Failed to end consultation'));
    }
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  /**
   * Initialize consultation
   */
  useEffect(() => {
    if (consultationLoading || !consultation || hasStartedRef.current) return;

    logger.log('Consultation loaded:', consultation.id, 'Status:', consultation.status);
    setDiagnosis(consultation.diagnosis || '');

    // Extract room info from consultation object
    const roomData = extractRoomInfo(consultation);
    if (roomData) {
      logger.debug('Room info from consultation:', roomData);
      setRoomInfo(prev => ({ ...prev, ...roomData }));
    }

    const consultationStatus = consultation.status;

    if (consultationStatus === 'in_progress') {
      hasStartedRef.current = true;
      if (roomData?.room_name) {
        setConsultationState(CONSULTATION_STATES.IN_CALL);
      } else {
        logger.log('In progress but no room info, fetching...');
        setConsultationState(CONSULTATION_STATES.FETCHING_ROOM);
        getJoinInfoMutation.mutate();
      }
    } else if (['scheduled', 'waiting_room'].includes(consultationStatus)) {
      hasStartedRef.current = true;
      setConsultationState(CONSULTATION_STATES.STARTING);
      startConsultationMutation.mutate();
    } else if (['completed', 'cancelled'].includes(consultationStatus)) {
      setConsultationState(CONSULTATION_STATES.ENDED);
    } else {
      logger.error('Unknown consultation status:', consultationStatus);
      setConsultationState(CONSULTATION_STATES.ERROR);
    }
  }, [consultation, consultationLoading]);

  // Notes & Prescriptions — simplified
  useEffect(() => {
    if (notesData) setNotes(Array.isArray(notesData) ? notesData : []);
  }, [notesData]);

  useEffect(() => {
    if (prescriptionsData) setPrescriptions(Array.isArray(prescriptionsData) ? prescriptionsData : []);
  }, [prescriptionsData]);


  /**
   * Fetch patient health data
   */
  useEffect(() => {
    if (!consultation?.patient) return;

    const fetchPatientHealth = async () => {
      try {
        const [vitalsRes, allergiesRes, conditionsRes] = await Promise.allSettled([
          healthRecordsService.getLatestVitals?.() || Promise.resolve(null),
          healthRecordsService.getActiveAllergies?.() || healthRecordsService.getAllergies?.() || Promise.resolve({ results: [] }),
          healthRecordsService.getActiveConditions?.() || healthRecordsService.getConditions?.() || Promise.resolve({ results: [] })
        ]);

        setPatientHealth({
          vitals: vitalsRes.status === 'fulfilled' ? (vitalsRes.value?.data || vitalsRes.value) : null,
          allergies: allergiesRes.status === 'fulfilled' ? (allergiesRes.value?.data?.results || allergiesRes.value?.results || []) : [],
          conditions: conditionsRes.status === 'fulfilled' ? (conditionsRes.value?.data?.results || conditionsRes.value?.results || []) : []
        });
      } catch (err) {
        logger.error('Error fetching patient health:', err);
      }
    };

    fetchPatientHealth();
  }, [consultation?.patient]);


  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch (e) {
          logger.error('Jitsi cleanup error:', e);
        }
        jitsiApiRef.current = null;
      }
    };
  }, []);

  /**
   * Handle fullscreen change
   */
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleJitsiApiReady = useCallback((api) => {
    jitsiApiRef.current = api;
    logger.log('Jitsi API ready');
  }, []);

  const handleVideoConferenceJoined = useCallback(() => {
    logger.log('Video conference joined');
    toast.success('Connected to consultation');
  }, []);

  const handleVideoConferenceLeft = useCallback(() => {
    logger.log('Video conference left');
  }, []);

  const handleParticipantJoined = useCallback((data) => {
    logger.log('Participant joined:', data);
    toast.success(`${data?.displayName || 'Patient'} joined`);
  }, []);

  const handleParticipantLeft = useCallback((data) => {
    logger.log('Participant left:', data);
    toast.info(`${data?.displayName || 'Patient'} left`);
  }, []);

  const handleToggleMute = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
    }
  }, []);

  const handleToggleVideo = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo');
    }
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      logger.error('Fullscreen error:', err);
    }
  }, []);

  const handleEndConsultation = useCallback((data) => {
    setShowEndModal(false);
    endConsultationMutation.mutate(data);
  }, []);

  const handleViewFullRecords = useCallback(() => {
    const patientId = consultation?.patient?.id || consultation?.patient;
    if (patientId) {
      window.open(`/doctor/patients/${patientId}`, '_blank');
    }
  }, [consultation]);

  const handleRetry = useCallback(() => {
    hasStartedRef.current = false;
    setConsultationState(CONSULTATION_STATES.LOADING);
    setRoomInfo(null);
    refetchConsultation();
  }, [refetchConsultation]);

  // ============================================================================
  // DERIVED VALUES - Better extraction of room name
  // ============================================================================

  const roomName = 
    roomInfo?.room_name || 
    roomInfo?.roomName ||
    consultation?.room?.room_name || 
    consultation?.room_name ||
    '';
  
  const jitsiDomain = 
    roomInfo?.jitsi_domain || 
    roomInfo?.domain ||
    consultation?.room?.jitsi_domain || 
    'meet.jit.si';
  
  const doctorName = `Dr. ${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Doctor';
  
  const isLoading = 
    consultationState === CONSULTATION_STATES.LOADING || 
    consultationState === CONSULTATION_STATES.STARTING ||
    consultationState === CONSULTATION_STATES.FETCHING_ROOM ||
    consultationLoading ||
    startConsultationMutation.isPending ||
    getJoinInfoMutation.isPending;

  // Debug logging
  useEffect(() => {
    if (isDev) {
      logger.debug('State:', {
        consultationState,
        consultationId,
        roomName,
        jitsiDomain,
        roomInfo,
        consultationRoom: consultation?.room,
        isLoading,
      });
    }
  }, [consultationState, consultationId, roomName, roomInfo, consultation?.room, isLoading]);

  // ============================================================================
  // RENDER: Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader size="lg" className="text-white mx-auto" />
          <p className="text-white mt-4">
            {consultationState === CONSULTATION_STATES.STARTING 
              ? 'Starting consultation...' 
              : consultationState === CONSULTATION_STATES.FETCHING_ROOM
                ? 'Connecting to room...'
                : 'Loading consultation...'}
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Error State
  // ============================================================================

  if (consultationError || consultationState === CONSULTATION_STATES.ERROR) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <EmptyState
            icon={AlertCircle}
            title="Consultation Error"
            description={getErrorMessage(consultationErrorData, 'Failed to load consultation')}
            action={
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate('/doctor/queue')}>
                  Go Back
                </Button>
                <Button variant="primary" onClick={handleRetry} leftIcon={<RefreshCw className="w-4 h-4" />}>
                  Retry
                </Button>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Ended State
  // ============================================================================

  if (consultationState === CONSULTATION_STATES.ENDED) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <PhoneOff size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Consultation Ended
          </h2>
          <p className="text-gray-500 mb-6">
            The consultation has been completed successfully.
          </p>
          <Button
            fullWidth
            onClick={() => navigate('/doctor/queue')}
          >
            Back to Queue
          </Button>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER: In-Call but no room - Handle missing room gracefully
  // ============================================================================

  if (consultationState === CONSULTATION_STATES.IN_CALL && !roomName) {
    logger.error('IN_CALL state but no roomName. roomInfo:', roomInfo, 'consultation.room:', consultation?.room);
    
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <EmptyState
            icon={AlertCircle}
            title="Unable to connect to room"
            description="Could not get video room information. Please try again."
            action={
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate('/doctor/queue')}>
                  Go Back
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => {
                    setConsultationState(CONSULTATION_STATES.FETCHING_ROOM);
                    getJoinInfoMutation.mutate();
                  }} 
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                  disabled={getJoinInfoMutation.isPending}
                >
                  Retry
                </Button>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER: In-Call State with Video
  // ============================================================================

  return (
    <div ref={containerRef} className="fixed inset-0 bg-gray-900 flex">
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
              onClick={() => setShowEndModal(true)}
              className="text-white hover:bg-gray-700"
            >
              Exit
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
              userName={doctorName}
              userEmail={user?.email}
              isDoctor={true}
              domain={jitsiDomain}
              jwt={roomInfo?.jwt}
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
                <Loader size="lg" className="mx-auto mb-4" />
                <p>Connecting to video...</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="bg-gray-800/90 backdrop-blur-sm px-4 py-4">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleToggleMute}
              className={`p-4 rounded-full transition-colors ${
                isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-500'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
            </button>

            <button
              onClick={handleToggleVideo}
              className={`p-4 rounded-full transition-colors ${
                isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-500'
              }`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isVideoOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
            </button>

            <button
              onClick={() => setShowEndModal(true)}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
              title="End consultation"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>

            <button
              onClick={handleToggleFullscreen}
              className="p-4 rounded-full bg-gray-600 hover:bg-gray-500 transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-6 h-6 text-white" /> : <Maximize className="w-6 h-6 text-white" />}
            </button>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className={`fixed right-0 top-0 bottom-0 w-80 lg:w-96 bg-white shadow-xl flex flex-col transition-transform duration-300 z-20 ${
        isSidePanelOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Panel Tabs */}
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
                <span className="hidden lg:block text-xs">{tab.label}</span>
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
              consultationId={consultationId}
              notes={notes}
              onNotesChange={setNotes}
              isLoading={notesLoading}
            />
          )}

          {sidePanelTab === 'prescription' && (
            <PrescriptionPanel
              consultationId={consultationId}
              prescriptions={prescriptions}
              onPrescriptionsChange={setPrescriptions}
              isLoading={prescriptionsLoading}
            />
          )}

          {sidePanelTab === 'diagnosis' && (
            <DiagnosisPanel
              diagnosis={diagnosis}
              onDiagnosisChange={setDiagnosis}
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
        prescriptionsCount={prescriptions.length}
        notesCount={notes.length}
        onConfirm={handleEndConsultation}
        isLoading={endConsultationMutation.isPending}
      />
    </div>
  );
};

export default DoctorConsultationRoom;