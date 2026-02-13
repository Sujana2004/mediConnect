import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Users,
  Phone,
  Bell,
  Globe,
  Shield,
  Info,
  Settings,
  Lock,
  HelpCircle,
  Trash2,
  User,
  Pencil,
  Eye,
  X,
  Plus,
  Check,
  AlertTriangle,
  Heart,
  Stethoscope,
  Volume2,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  Fingerprint,
  Star,
  MessageSquare,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Camera,
  Mail,
  MapPin,
  Droplet,
  Activity,
  Scale,
  Ruler,
  Save,
  ToggleLeft,
  ToggleRight,
  Clock,
  FileText,
  Video,
  Download,
  Share2,
  Printer,
  Calendar,
  Edit3,
  ArrowLeft
} from 'lucide-react';

const PatientMoreTab = () => {
  // ==================== STATE MANAGEMENT ====================
  const [activePanel, setActivePanel] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [expandedGuide, setExpandedGuide] = useState(null);
  const [selectedFirstAid, setSelectedFirstAid] = useState(null);

  // Settings State
  const [settings, setSettings] = useState({
    notifications: {
      appointments: true,
      medications: true,
      healthTips: false,
      labResults: true,
      emergencyAlerts: true,
      promotions: false
    },
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '07:00'
    },
    language: 'English',
    voiceAssistant: true,
    textSize: 'medium',
    highContrast: false,
    offlineMode: false,
    autoSync: true,
    biometric: true,
    syncFrequency: '15min',
    wifiOnly: true,
    mobileData: false
  });

  // Profile State
  const [profile, setProfile] = useState({
    name: 'Sarah Johnson',
    gender: 'Female',
    age: 55,
    bloodGroup: 'O+',
    phone: '+1 (555) 123-4567',
    email: 'sarah.johnson@email.com',
    address: '123 Health Street, Medical City, MC 12345',
    dateOfBirth: '1969-03-15',
    height: '165',
    weight: '68',
    allergies: ['Penicillin', 'Peanuts'],
    conditions: ['Hypertension', 'Type 2 Diabetes'],
    emergencyContact: 'John Johnson - +1 (555) 987-6543'
  });

  const [editedProfile, setEditedProfile] = useState({ ...profile });

  // Emergency Contacts State
  const [emergencyContacts, setEmergencyContacts] = useState([
    { id: 1, name: 'John Johnson', relation: 'Husband', phone: '+1 (555) 987-6543', primary: true },
    { id: 2, name: 'Emily Johnson', relation: 'Daughter', phone: '+1 (555) 456-7890', primary: false },
    { id: 3, name: 'Dr. Smith', relation: 'Primary Doctor', phone: '+1 (555) 111-2222', primary: false }
  ]);

  const [newContact, setNewContact] = useState({
    name: '',
    relation: 'Spouse',
    phone: '',
    primary: false
  });

  // Family Members State
  const [familyMembers, setFamilyMembers] = useState([
    { id: 1, name: 'Sarah', relation: 'Self', age: 55, gender: 'Female', bloodGroup: 'O+', active: true },
    { id: 2, name: 'John', relation: 'Husband', age: 58, gender: 'Male', bloodGroup: 'A+', active: false },
    { id: 3, name: 'Emily', relation: 'Daughter', age: 28, gender: 'Female', bloodGroup: 'O+', active: false }
  ]);

  const [newFamilyMember, setNewFamilyMember] = useState({
    name: '',
    relation: 'Spouse',
    age: '',
    gender: 'Male',
    bloodGroup: 'Unknown'
  });

  // SOS Settings State
  const [sosSettings, setSosSettings] = useState({
    callPrimary: true,
    sendSms: true,
    shareLocation: true,
    alertHospitals: false,
    soundAlarm: true,
    powerButton: true,
    shakePhone: true,
    voiceCommand: true
  });

  // Feedback State
  const [feedback, setFeedback] = useState({
    rating: 0,
    tags: [],
    message: ''
  });

  // Support Message State
  const [supportMessage, setSupportMessage] = useState({
    subject: 'Technical Issue',
    message: ''
  });

  // Password Change State
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  // Delete Account State
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    text: '',
    password: ''
  });

  // Cache Selection State
  const [cacheSelection, setCacheSelection] = useState({
    images: true,
    documents: true,
    searchHistory: true,
    tempFiles: true
  });

  // ==================== HELPER FUNCTIONS ====================

  const toggleSetting = (category, setting) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: !prev[category][setting]
      }
    }));
  };

  const toggleSimpleSetting = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const toggleSosSetting = (setting) => {
    setSosSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const saveProfile = () => {
    setProfile(editedProfile);
    setActivePanel(null);
  };

  const addEmergencyContact = () => {
    if (newContact.name && newContact.phone) {
      setEmergencyContacts(prev => [
        ...prev,
        { ...newContact, id: Date.now() }
      ]);
      setNewContact({ name: '', relation: 'Spouse', phone: '', primary: false });
      setActiveModal(null);
    }
  };

  const removeEmergencyContact = (id) => {
    setEmergencyContacts(prev => prev.filter(c => c.id !== id));
  };

  const addFamilyMember = () => {
    if (newFamilyMember.name && newFamilyMember.age) {
      setFamilyMembers(prev => [
        ...prev,
        { ...newFamilyMember, id: Date.now(), active: false }
      ]);
      setNewFamilyMember({ name: '', relation: 'Spouse', age: '', gender: 'Male', bloodGroup: 'Unknown' });
      setActiveModal(null);
    }
  };

  const switchFamilyMember = (id) => {
    setFamilyMembers(prev => prev.map(m => ({
      ...m,
      active: m.id === id
    })));
  };

  const removeFamilyMember = (id) => {
    setFamilyMembers(prev => prev.filter(m => m.id !== id));
  };

  const toggleFeedbackTag = (tag) => {
    setFeedback(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const clearSelectedCache = () => {
    alert('Cache cleared successfully!');
    setActivePanel(null);
  };

  // ==================== REUSABLE COMPONENTS ====================

  const ToggleSwitch = ({ enabled, onToggle, label, description }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button onClick={onToggle} className="ml-4">
        {enabled ? (
          <div className="w-11 h-6 bg-green-500 rounded-full p-0.5 flex items-center justify-end">
            <div className="w-5 h-5 bg-white rounded-full shadow" />
          </div>
        ) : (
          <div className="w-11 h-6 bg-gray-300 rounded-full p-0.5 flex items-center">
            <div className="w-5 h-5 bg-white rounded-full shadow" />
          </div>
        )}
      </button>
    </div>
  );

  const DetailPanel = ({ title, children, onClose }) => (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm z-10">
        <button 
          onClick={onClose} 
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pb-8">
        {children}
      </div>
    </div>
  );

  const Modal = ({ title, children, onClose }) => (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );

  const MenuItem = ({ icon: Icon, label, onClick, danger, value, description }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 border-b transition-colors ${
        danger ? 'hover:bg-red-50' : ''
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className={`p-2 rounded-lg ${danger ? 'bg-red-100' : 'bg-green-100'}`}>
          <Icon className={`h-5 w-5 ${danger ? 'text-red-600' : 'text-green-600'}`} />
        </div>
        <div className="text-left">
          <span className={`text-sm font-medium ${danger ? 'text-red-600' : 'text-gray-800'}`}>
            {label}
          </span>
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm text-gray-500">{value}</span>}
        <ChevronRight className={`h-4 w-4 ${danger ? 'text-red-400' : 'text-gray-400'}`} />
      </div>
    </button>
  );

  const Section = ({ title, children }) => (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50 font-semibold text-gray-700 text-sm">
        {title}
      </div>
      {children}
    </div>
  );

  // ==================== PANEL CONTENTS ====================

  const renderFullProfile = () => (
    <div className="space-y-6">
      <div className="flex flex-col items-center py-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-4 shadow-lg">
          <User className="h-12 w-12 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">{profile.name}</h3>
        <p className="text-gray-500">Patient ID: #MED-2024-1234</p>
        <div className="flex gap-2 mt-3">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Active</span>
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">{profile.bloodGroup}</span>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-green-600" /> Basic Information
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Gender</p>
            <p className="font-medium text-gray-900">{profile.gender}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Age</p>
            <p className="font-medium text-gray-900">{profile.age} years</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Date of Birth</p>
            <p className="font-medium text-gray-900">{profile.dateOfBirth}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Blood Group</p>
            <p className="font-medium text-red-600">{profile.bloodGroup}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Phone className="h-4 w-4 text-green-600" /> Contact Information
        </h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg"><Phone className="h-4 w-4 text-gray-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="font-medium text-gray-900">{profile.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg"><Mail className="h-4 w-4 text-gray-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{profile.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-100 rounded-lg"><MapPin className="h-4 w-4 text-gray-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Address</p>
              <p className="font-medium text-gray-900">{profile.address}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-green-600" /> Physical Information
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Ruler className="h-4 w-4 text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Height</p>
              <p className="font-medium text-gray-900">{profile.height} cm</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><Scale className="h-4 w-4 text-purple-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Weight</p>
              <p className="font-medium text-gray-900">{profile.weight} kg</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <h4 className="font-semibold text-red-800 flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4" /> Allergies
        </h4>
        <div className="flex flex-wrap gap-2">
          {profile.allergies.map((allergy, i) => (
            <span key={i} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium">{allergy}</span>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h4 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
          <Stethoscope className="h-4 w-4" /> Medical Conditions
        </h4>
        <div className="flex flex-wrap gap-2">
          {profile.conditions.map((condition, i) => (
            <span key={i} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">{condition}</span>
          ))}
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-3">
          <Phone className="h-4 w-4" /> Emergency Contact
        </h4>
        <p className="text-green-700 font-medium">{profile.emergencyContact}</p>
      </div>

      <div className="flex gap-3">
        <button 
          onClick={() => setActivePanel('edit-profile')}
          className="flex-1 py-3 bg-green-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          <Pencil className="h-4 w-4" /> Edit Profile
        </button>
        <button className="p-3 border rounded-xl"><Share2 className="h-5 w-5 text-gray-600" /></button>
        <button className="p-3 border rounded-xl"><Download className="h-5 w-5 text-gray-600" /></button>
      </div>
    </div>
  );

  const renderEditProfile = () => (
    <div className="space-y-5">
      <div className="flex flex-col items-center py-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg">
            <User className="h-12 w-12 text-white" />
          </div>
          <button className="absolute bottom-0 right-0 p-2 bg-white border-2 border-green-500 rounded-full shadow-lg">
            <Camera className="h-4 w-4 text-green-600" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">Tap to change photo</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
          <input type="text" value={editedProfile.name} onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
            <select value={editedProfile.gender} onChange={(e) => setEditedProfile({ ...editedProfile, gender: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500">
              <option>Female</option><option>Male</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Blood Group</label>
            <select value={editedProfile.bloodGroup} onChange={(e) => setEditedProfile({ ...editedProfile, bloodGroup: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500">
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg}>{bg}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
          <input type="date" value={editedProfile.dateOfBirth} onChange={(e) => setEditedProfile({ ...editedProfile, dateOfBirth: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
          <input type="tel" value={editedProfile.phone} onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
          <input type="email" value={editedProfile.email} onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
          <textarea value={editedProfile.address} onChange={(e) => setEditedProfile({ ...editedProfile, address: e.target.value })} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Height (cm)</label>
            <input type="number" value={editedProfile.height} onChange={(e) => setEditedProfile({ ...editedProfile, height: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Weight (kg)</label>
            <input type="number" value={editedProfile.weight} onChange={(e) => setEditedProfile({ ...editedProfile, weight: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500" />
          </div>
        </div>
      </div>

      <button onClick={saveProfile} className="w-full py-3.5 bg-green-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors mt-6">
        <Save className="h-5 w-5" /> Save Changes
      </button>
      <button onClick={() => { setEditedProfile({ ...profile }); setActivePanel('full-profile'); }} className="w-full py-3 border border-gray-300 rounded-xl font-medium text-gray-600">
        Cancel
      </button>
    </div>
  );

  const renderEmergencyContacts = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">These contacts will be notified in case of emergency when you trigger SOS.</p>
      {emergencyContacts.map((contact) => (
        <div key={contact.id} className="bg-white border rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${contact.primary ? 'bg-red-100' : 'bg-gray-100'}`}>
                <User className={`h-6 w-6 ${contact.primary ? 'text-red-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{contact.name}</p>
                  {contact.primary && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">Primary</span>}
                </div>
                <p className="text-sm text-gray-500">{contact.relation}</p>
                <p className="text-sm text-green-600 font-medium">{contact.phone}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <a href={`tel:${contact.phone}`} className="flex-1 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium flex items-center justify-center gap-1">
              <Phone className="h-4 w-4" /> Call
            </a>
            <button className="flex-1 py-2 border rounded-lg text-sm font-medium flex items-center justify-center gap-1">
              <Edit3 className="h-4 w-4" /> Edit
            </button>
            {!contact.primary && (
              <button onClick={() => removeEmergencyContact(contact.id)} className="py-2 px-3 border border-red-200 text-red-600 rounded-lg">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}
      <button onClick={() => setActiveModal('add-contact')} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium flex items-center justify-center gap-2 hover:border-green-500 hover:text-green-600 transition-colors">
        <Plus className="h-5 w-5" /> Add Emergency Contact
      </button>
    </div>
  );

  const renderSOSSettings = () => (
    <div className="space-y-6">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
            <AlertTriangle className="h-7 w-7 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-red-800 text-lg">SOS Emergency</h3>
            <p className="text-sm text-red-600">Quick access to emergency help</p>
          </div>
        </div>
        <p className="text-sm text-red-700">Press and hold the SOS button for 3 seconds to alert emergency contacts and share your location.</p>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-4">SOS Actions</h4>
        <div className="space-y-1">
          <ToggleSwitch label="Call Primary Emergency Contact" description="Automatically calls your primary contact" enabled={sosSettings.callPrimary} onToggle={() => toggleSosSetting('callPrimary')} />
          <ToggleSwitch label="Send SMS to All Contacts" description="Sends alert message to all emergency contacts" enabled={sosSettings.sendSms} onToggle={() => toggleSosSetting('sendSms')} />
          <ToggleSwitch label="Share Live Location" description="Shares your real-time GPS location" enabled={sosSettings.shareLocation} onToggle={() => toggleSosSetting('shareLocation')} />
          <ToggleSwitch label="Alert Nearby Hospitals" description="Notifies nearby emergency services" enabled={sosSettings.alertHospitals} onToggle={() => toggleSosSetting('alertHospitals')} />
          <ToggleSwitch label="Sound Alarm Siren" description="Plays loud alarm sound" enabled={sosSettings.soundAlarm} onToggle={() => toggleSosSetting('soundAlarm')} />
        </div>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-4">SOS Triggers</h4>
        <div className="space-y-1">
          <ToggleSwitch label="Power Button (Press 5 times)" enabled={sosSettings.powerButton} onToggle={() => toggleSosSetting('powerButton')} />
          <ToggleSwitch label="Shake Phone Vigorously" enabled={sosSettings.shakePhone} onToggle={() => toggleSosSetting('shakePhone')} />
          <ToggleSwitch label='Voice Command "Help Me"' enabled={sosSettings.voiceCommand} onToggle={() => toggleSosSetting('voiceCommand')} />
        </div>
      </div>
      <button className="w-full py-3.5 bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
        <AlertTriangle className="h-5 w-5" /> Test SOS (Demo Mode)
      </button>
    </div>
  );

  const firstAidGuides = [
    { id: 1, title: 'CPR (Cardiopulmonary Resuscitation)', icon: Heart, color: 'red', description: 'Life-saving technique for cardiac arrest', steps: ['Check for responsiveness - tap and shout', 'Call 911 or ask someone to call', 'Place heel of hand on center of chest', 'Push hard and fast (100-120 compressions/min)', 'Allow chest to fully recoil between compressions', 'Continue until help arrives'], tips: ['Push at least 2 inches deep', 'Use AED if available', 'Hands-only CPR is effective for adults'] },
    { id: 2, title: 'Choking - Heimlich Maneuver', icon: AlertTriangle, color: 'orange', description: 'For clearing blocked airways', steps: ['Stand behind the person', 'Make a fist with one hand', 'Place it above the navel', 'Grasp fist with other hand', 'Give quick upward thrusts', 'Repeat until object is expelled'], tips: ['For infants, use back blows', 'If alone, use a chair for self-Heimlich'] },
    { id: 3, title: 'Severe Bleeding Control', icon: Droplet, color: 'red', description: 'Stop life-threatening bleeding', steps: ['Apply direct pressure with clean cloth', 'Elevate the injured area if possible', 'Apply firm, continuous pressure', 'Add more cloths if bleeding through', 'Call emergency services', 'Keep victim calm and warm'], tips: ['Do not remove embedded objects', 'Use tourniquet only as last resort'] },
    { id: 4, title: 'Heart Attack Recognition', icon: Activity, color: 'red', description: 'Recognize and respond to heart attacks', steps: ['Call 911 immediately', 'Have person sit or lie down', 'Loosen any tight clothing', 'Give aspirin if not allergic', 'Be ready to perform CPR', 'Stay with the person until help arrives'], tips: ['Symptoms may differ in women', 'Time is critical - act fast'] },
    { id: 5, title: 'Stroke - FAST Method', icon: Stethoscope, color: 'purple', description: 'Identify stroke symptoms quickly', steps: ['F - Face drooping on one side?', 'A - Arm weakness or numbness?', 'S - Speech difficulty or slurred?', 'T - Time to call 911!', 'Note the time symptoms started', 'Keep person comfortable until help arrives'], tips: ['Every minute counts', 'Do not give food or drink'] },
    { id: 6, title: 'Burns Treatment', icon: AlertTriangle, color: 'orange', description: 'Proper care for burn injuries', steps: ['Remove from heat source', 'Cool burn under running water (10-20 min)', 'Remove jewelry near the burn', 'Cover with sterile bandage', 'Do not apply ice directly', 'Seek medical help for severe burns'], tips: ['Do not pop blisters', 'Do not use butter or toothpaste'] }
  ];

  const renderFirstAidGuides = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Quick reference guides for common medical emergencies. Always call emergency services for serious situations.</p>
      {selectedFirstAid ? (
        <div className="space-y-4">
          <button onClick={() => setSelectedFirstAid(null)} className="flex items-center gap-2 text-green-600 font-medium">
            <ArrowLeft className="h-4 w-4" /> Back to all guides
          </button>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-red-100 rounded-xl">
                <selectedFirstAid.icon className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-red-800">{selectedFirstAid.title}</h3>
                <p className="text-sm text-red-600">{selectedFirstAid.description}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Steps to Follow:</h4>
            <ol className="space-y-3">
              {selectedFirstAid.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</span>
                  <span className="text-gray-700">{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Important Tips</h4>
            <ul className="space-y-1">
              {selectedFirstAid.tips.map((tip, i) => (
                <li key={i} className="text-sm text-amber-700 flex items-start gap-2"><span>•</span> {tip}</li>
              ))}
            </ul>
          </div>
          <button className="w-full py-3 bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
            <Video className="h-5 w-5" /> Watch Video Tutorial
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {firstAidGuides.map((guide) => (
            <button key={guide.id} onClick={() => setSelectedFirstAid(guide)} className="w-full flex items-center gap-4 p-4 bg-white border rounded-xl hover:bg-gray-50 transition-colors">
              <div className="p-3 rounded-xl bg-red-100"><guide.icon className="h-6 w-6 text-red-600" /></div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900">{guide.title}</p>
                <p className="text-sm text-gray-500">{guide.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const helplines = [
    { name: 'Emergency Services', number: '911', desc: 'Police, Fire, Ambulance', color: 'red' },
    { name: 'Poison Control', number: '1-800-222-1222', desc: '24/7 Poison Help', color: 'purple' },
    { name: 'Suicide Prevention', number: '988', desc: 'Mental Health Crisis', color: 'blue' },
    { name: 'Domestic Violence', number: '1-800-799-7233', desc: 'National Hotline', color: 'pink' },
    { name: 'Child Abuse Hotline', number: '1-800-422-4453', desc: 'Childhelp National', color: 'orange' },
    { name: 'SAMHSA Helpline', number: '1-800-662-4357', desc: 'Substance Abuse', color: 'green' }
  ];

  const renderHelplines = () => (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
        <p className="text-red-800 font-medium">In case of life-threatening emergency, call <strong>911</strong> immediately</p>
      </div>
      <div className="space-y-3">
        {helplines.map((line, i) => (
          <div key={i} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{line.name}</p>
                <p className="text-sm text-gray-500">{line.desc}</p>
              </div>
              <a href={`tel:${line.number.replace(/-/g, '')}`} className="px-4 py-2.5 bg-green-500 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-green-600 transition-colors">
                <Phone className="h-4 w-4" />
                <span className="text-sm">{line.number}</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Health Notifications</h4>
        <div className="divide-y">
          <ToggleSwitch label="Appointment Reminders" description="Get notified before your appointments" enabled={settings.notifications.appointments} onToggle={() => toggleSetting('notifications', 'appointments')} />
          <ToggleSwitch label="Medication Reminders" description="Never miss your medications" enabled={settings.notifications.medications} onToggle={() => toggleSetting('notifications', 'medications')} />
          <ToggleSwitch label="Lab Results Ready" description="Know when your results are available" enabled={settings.notifications.labResults} onToggle={() => toggleSetting('notifications', 'labResults')} />
          <ToggleSwitch label="Health Tips & Articles" description="Receive helpful health information" enabled={settings.notifications.healthTips} onToggle={() => toggleSetting('notifications', 'healthTips')} />
        </div>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Emergency Alerts</h4>
        <ToggleSwitch label="Emergency Alerts" description="Critical health and safety notifications" enabled={settings.notifications.emergencyAlerts} onToggle={() => toggleSetting('notifications', 'emergencyAlerts')} />
      </div>
      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Other</h4>
        <ToggleSwitch label="Promotions & Offers" description="Deals from partner pharmacies and labs" enabled={settings.notifications.promotions} onToggle={() => toggleSetting('notifications', 'promotions')} />
      </div>
    </div>
  );

  const renderQuietHours = () => (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-4">
        <div className="p-3 bg-indigo-100 rounded-xl"><Moon className="h-8 w-8 text-indigo-600" /></div>
        <div>
          <h3 className="font-bold text-indigo-900">Do Not Disturb</h3>
          <p className="text-sm text-indigo-700">Silence non-urgent notifications</p>
        </div>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <ToggleSwitch label="Enable Quiet Hours" description="Mute notifications during specified hours" enabled={settings.quietHours.enabled} onToggle={() => setSettings(prev => ({ ...prev, quietHours: { ...prev.quietHours, enabled: !prev.quietHours.enabled } }))} />
      </div>
      {settings.quietHours.enabled && (
        <div className="bg-white border rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
            <input type="time" value={settings.quietHours.start} onChange={(e) => setSettings(prev => ({ ...prev, quietHours: { ...prev.quietHours, start: e.target.value } }))} className="w-full px-4 py-3 border rounded-xl text-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
            <input type="time" value={settings.quietHours.end} onChange={(e) => setSettings(prev => ({ ...prev, quietHours: { ...prev.quietHours, end: e.target.value } }))} className="w-full px-4 py-3 border rounded-xl text-lg" />
          </div>
        </div>
      )}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800"><strong>Note:</strong> Emergency SOS alerts and critical health notifications will always come through, even during quiet hours.</p>
      </div>
    </div>
  );

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'de', name: 'German', native: 'Deutsch' },
    { code: 'zh', name: 'Chinese', native: '中文' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'ar', name: 'Arabic', native: 'العربية' },
    { code: 'pt', name: 'Portuguese', native: 'Português' }
  ];

  const renderLanguage = () => (
    <div className="space-y-3">
      {languages.map((lang) => (
        <button key={lang.code} onClick={() => setSettings(prev => ({ ...prev, language: lang.name }))} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${settings.language === lang.name ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
          <div>
            <p className="font-medium text-gray-900">{lang.name}</p>
            <p className="text-sm text-gray-500">{lang.native}</p>
          </div>
          {settings.language === lang.name && (
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"><Check className="h-4 w-4 text-white" /></div>
          )}
        </button>
      ))}
    </div>
  );

  const renderVoiceSettings = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4">
        <div className="p-3 bg-blue-100 rounded-xl"><Volume2 className="h-8 w-8 text-blue-600" /></div>
        <div>
          <h3 className="font-bold text-blue-900">Voice Assistant</h3>
          <p className="text-sm text-blue-700">Hands-free app navigation</p>
        </div>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <ToggleSwitch label="Enable Voice Assistant" description="Control the app with your voice" enabled={settings.voiceAssistant} onToggle={() => toggleSimpleSetting('voiceAssistant')} />
      </div>
      {settings.voiceAssistant && (
        <div className="bg-white border rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Available Voice Commands</h4>
          <div className="space-y-3">
            {[
              { command: '"Book appointment"', action: 'Start booking process' },
              { command: '"My medications"', action: 'View your medicines' },
              { command: '"Call doctor"', action: 'Contact your doctor' },
              { command: '"Emergency"', action: 'Trigger SOS alert' },
              { command: '"Read notifications"', action: 'Hear your alerts' },
              { command: '"Check appointments"', action: 'View upcoming visits' }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">{item.command}</code>
                <span className="text-sm text-gray-500">{item.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <button className="w-full py-3 border border-blue-500 text-blue-600 rounded-xl font-semibold">Test Voice Recognition</button>
    </div>
  );

  const textSizes = [
    { id: 'small', label: 'Small', preview: 14 },
    { id: 'medium', label: 'Medium', preview: 16 },
    { id: 'large', label: 'Large', preview: 18 },
    { id: 'extra-large', label: 'Extra Large', preview: 20 }
  ];

  const renderTextSize = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Choose a text size that's comfortable for you to read.</p>
      {textSizes.map((size) => (
        <button key={size.id} onClick={() => setSettings(prev => ({ ...prev, textSize: size.id }))} className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${settings.textSize === size.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{size.label}</p>
              <p style={{ fontSize: size.preview }} className="text-gray-600 mt-1">Sample text preview</p>
            </div>
            {settings.textSize === size.id && (
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"><Check className="h-4 w-4 text-white" /></div>
            )}
          </div>
        </button>
      ))}
    </div>
  );

  const renderContrast = () => (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl p-4">
        <ToggleSwitch label="Enable High Contrast" description="Increases visibility for better readability" enabled={settings.highContrast} onToggle={() => toggleSimpleSetting('highContrast')} />
      </div>
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900">Preview</h4>
        <div className={`p-4 rounded-xl ${settings.highContrast ? 'bg-black text-white border-2 border-white' : 'bg-gray-100 text-gray-900 border'}`}>
          <p className="font-bold mb-2">Sample Content</p>
          <p className="mb-3">This is how text will appear with your current settings.</p>
          <button className={`px-4 py-2 rounded-lg font-medium ${settings.highContrast ? 'bg-yellow-400 text-black' : 'bg-green-500 text-white'}`}>Sample Button</button>
        </div>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">High contrast mode can help users with visual impairments or those reading in bright light conditions.</p>
      </div>
    </div>
  );

  const renderOfflineMode = () => (
    <div className="space-y-6">
      <div className={`rounded-xl p-4 flex items-center gap-4 ${settings.offlineMode ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
        <div className={`p-3 rounded-xl ${settings.offlineMode ? 'bg-amber-100' : 'bg-green-100'}`}>
          {settings.offlineMode ? <WifiOff className="h-8 w-8 text-amber-600" /> : <Wifi className="h-8 w-8 text-green-600" />}
        </div>
        <div>
          <h3 className={`font-bold ${settings.offlineMode ? 'text-amber-900' : 'text-green-900'}`}>{settings.offlineMode ? 'Offline Mode Active' : 'Online'}</h3>
          <p className={`text-sm ${settings.offlineMode ? 'text-amber-700' : 'text-green-700'}`}>{settings.offlineMode ? 'Using cached data only' : 'Connected to internet'}</p>
        </div>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <ToggleSwitch label="Enable Offline Mode" description="Use app without internet connection" enabled={settings.offlineMode} onToggle={() => toggleSimpleSetting('offlineMode')} />
      </div>
      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Available Offline</h4>
        <ul className="space-y-2">
          {['View saved appointments', 'Medication reminders', 'First aid guides', 'Emergency contacts', 'Downloaded medical records', 'Saved prescriptions'].map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-sm"><Check className="h-4 w-4 text-green-500" /><span className="text-gray-700">{item}</span></li>
          ))}
        </ul>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Not Available Offline</h4>
        <ul className="space-y-2">
          {['Book new appointments', 'Video consultations', 'Real-time chat with doctors', 'Sync new data'].map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-sm"><X className="h-4 w-4 text-red-500" /><span className="text-gray-500">{item}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderAutoSync = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4">
        <div className="p-3 bg-blue-100 rounded-xl"><RefreshCw className="h-8 w-8 text-blue-600" /></div>
        <div>
          <h3 className="font-bold text-blue-900">Auto Sync</h3>
          <p className="text-sm text-blue-700">Keep your data up to date automatically</p>
        </div>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <ToggleSwitch label="Enable Auto Sync" description="Automatically sync data in background" enabled={settings.autoSync} onToggle={() => toggleSimpleSetting('autoSync')} />
      </div>
      {settings.autoSync && (
        <>
          <div className="bg-white border rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">Sync Frequency</label>
            <div className="space-y-2">
              {[{ value: '15min', label: 'Every 15 minutes' }, { value: '30min', label: 'Every 30 minutes' }, { value: '1hour', label: 'Every hour' }, { value: '6hours', label: 'Every 6 hours' }].map((option) => (
                <button key={option.value} onClick={() => setSettings(prev => ({ ...prev, syncFrequency: option.value }))} className={`w-full p-3 rounded-lg border text-left flex items-center justify-between ${settings.syncFrequency === option.value ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <span className="text-sm">{option.label}</span>
                  {settings.syncFrequency === option.value && <Check className="h-4 w-4 text-green-500" />}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Sync Connection</h4>
            <ToggleSwitch label="Wi-Fi only" description="Save mobile data" enabled={settings.wifiOnly} onToggle={() => setSettings(prev => ({ ...prev, wifiOnly: !prev.wifiOnly }))} />
            <ToggleSwitch label="Mobile data" description="Sync even without Wi-Fi" enabled={settings.mobileData} onToggle={() => setSettings(prev => ({ ...prev, mobileData: !prev.mobileData }))} />
          </div>
        </>
      )}
      <div className="bg-gray-50 border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Last synced</p>
            <p className="font-medium text-gray-900">2 minutes ago</p>
          </div>
          <button className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Sync Now
          </button>
        </div>
      </div>
    </div>
  );

  const renderDataUsage = () => (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-gray-900">This Month</span>
          <span className="text-2xl font-bold text-green-600">245 MB</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: '24.5%' }} />
        </div>
        <p className="text-sm text-gray-500">245 MB of 1 GB monthly limit</p>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-4">Usage Breakdown</h4>
        <div className="space-y-3">
          {[{ name: 'Appointments & Scheduling', usage: 85, color: 'bg-blue-500' }, { name: 'Medical Records', usage: 78, color: 'bg-purple-500' }, { name: 'Video Consultations', usage: 52, color: 'bg-green-500' }, { name: 'Chat & Messages', usage: 30, color: 'bg-orange-500' }].map((item, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">{item.name}</span>
                <span className="text-sm font-medium">{item.usage} MB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className={`${item.color} h-2 rounded-full`} style={{ width: `${(item.usage / 245) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <ToggleSwitch label="Data Saver Mode" description="Reduce image quality to save data" enabled={false} onToggle={() => {}} />
      </div>
    </div>
  );

  const renderClearCache = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 border rounded-xl p-4 flex items-center gap-4">
        <div className="p-3 bg-gray-200 rounded-xl"><Database className="h-8 w-8 text-gray-600" /></div>
        <div>
          <p className="text-sm text-gray-500">Total Cache Size</p>
          <p className="text-2xl font-bold text-gray-900">125 MB</p>
        </div>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-4">Select data to clear</h4>
        <div className="space-y-3">
          {[{ key: 'images', name: 'Images & Media', size: '65 MB' }, { key: 'documents', name: 'Offline Documents', size: '35 MB' }, { key: 'searchHistory', name: 'Search History', size: '15 MB' }, { key: 'tempFiles', name: 'Temporary Files', size: '10 MB' }].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={cacheSelection[item.key]} onChange={() => setCacheSelection(prev => ({ ...prev, [item.key]: !prev[item.key] }))} className="w-5 h-5 text-green-500 rounded border-gray-300 focus:ring-green-500" />
                <span className="text-gray-900">{item.name}</span>
              </div>
              <span className="text-sm text-gray-500">{item.size}</span>
            </div>
          ))}
        </div>
      </div>
      <button onClick={clearSelectedCache} className="w-full py-3.5 bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
        <Trash2 className="h-5 w-5" /> Clear Selected Cache
      </button>
      <p className="text-sm text-gray-500 text-center">Clearing cache will not delete your personal data or account information.</p>
    </div>
  );

  const renderChangePassword = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
          <input type="password" value={passwords.current} onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))} placeholder="Enter current password" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
          <input type="password" value={passwords.new} onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))} placeholder="Enter new password" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
          <input type="password" value={passwords.confirm} onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))} placeholder="Confirm new password" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500" />
        </div>
      </div>
      <div className="bg-gray-50 border rounded-xl p-4">
        <h4 className="font-medium text-gray-900 mb-3">Password Requirements:</h4>
        <ul className="space-y-2 text-sm">
          {[
            { text: 'At least 8 characters', met: passwords.new.length >= 8 },
            { text: 'One uppercase letter', met: /[A-Z]/.test(passwords.new) },
            { text: 'One lowercase letter', met: /[a-z]/.test(passwords.new) },
            { text: 'One number', met: /[0-9]/.test(passwords.new) },
            { text: 'One special character', met: /[!@#$%^&*]/.test(passwords.new) }
          ].map((req, i) => (
            <li key={i} className={`flex items-center gap-2 ${req.met ? 'text-green-600' : 'text-gray-500'}`}>
              {req.met ? <Check className="h-4 w-4" /> : <div className="w-4 h-4 border rounded-full" />}
              {req.text}
            </li>
          ))}
        </ul>
      </div>
      <button className="w-full py-3.5 bg-green-500 text-white rounded-xl font-semibold disabled:bg-gray-300" disabled={!passwords.current || !passwords.new || passwords.new !== passwords.confirm}>
        Update Password
      </button>
    </div>
  );

  const renderBiometric = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4">
        <div className="p-3 bg-blue-100 rounded-xl"><Fingerprint className="h-10 w-10 text-blue-600" /></div>
        <div>
          <h3 className="font-bold text-blue-900">Biometric Authentication</h3>
          <p className="text-sm text-blue-700">Fingerprint & Face ID</p>
        </div>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <ToggleSwitch label="Enable Biometric Login" description="Use fingerprint or face to login" enabled={settings.biometric} onToggle={() => toggleSimpleSetting('biometric')} />
      </div>
      {settings.biometric && (
        <div className="bg-white border rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Use Biometrics For:</h4>
          <div className="space-y-1">
            <ToggleSwitch label="App Login" enabled={true} onToggle={() => {}} />
            <ToggleSwitch label="View Medical Records" enabled={true} onToggle={() => {}} />
            <ToggleSwitch label="Confirm Payments" enabled={true} onToggle={() => {}} />
            <ToggleSwitch label="Share Health Data" enabled={false} onToggle={() => {}} />
          </div>
        </div>
      )}
      <button className="w-full py-3 border-2 border-blue-500 text-blue-600 rounded-xl font-semibold">Re-register Biometrics</button>
    </div>
  );

  const renderPrivacyPolicy = () => (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Last updated: January 1, 2024</p>
      {[
        { title: '1. Information We Collect', content: 'We collect information you provide directly to us, including personal information such as your name, email address, phone number, date of birth, and health-related information necessary to provide our healthcare services.' },
        { title: '2. How We Use Your Information', content: 'We use the information we collect to provide, maintain, and improve our services, to process appointments, communicate with you about your health care, send reminders, and respond to your inquiries.' },
        { title: '3. Information Sharing', content: 'We do not sell your personal information. We may share your information with healthcare providers with your consent, or as required by law. All data transfers are encrypted and secure.' },
        { title: '4. Data Security', content: 'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security audits.' },
        { title: '5. Your Rights', content: 'You have the right to access, correct, or delete your personal information. You may also request a copy of your data or restrict certain processing activities. Contact our support team to exercise these rights.' },
        { title: '6. Data Retention', content: 'We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Medical records are retained as required by healthcare regulations.' }
      ].map((section, i) => (
        <div key={i} className="bg-white border rounded-xl p-4">
          <h3 className="font-bold text-gray-900 mb-2">{section.title}</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{section.content}</p>
        </div>
      ))}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-sm text-green-800"><strong>Questions?</strong> Contact our privacy team at privacy@mediconnect.com</p>
      </div>
    </div>
  );

  const renderTerms = () => (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Last updated: January 1, 2024</p>
      {[
        { title: '1. Acceptance of Terms', content: 'By accessing and using MediConnect, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this service.' },
        { title: '2. Use of Services', content: "MediConnect provides a platform for connecting patients with healthcare providers. Our services are not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician." },
        { title: '3. User Responsibilities', content: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information.' },
        { title: '4. Medical Disclaimer', content: 'The content provided through MediConnect is for informational purposes only. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.' },
        { title: '5. Limitation of Liability', content: 'MediConnect shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.' },
        { title: '6. Changes to Terms', content: 'We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the app. Continued use after changes constitutes acceptance.' }
      ].map((section, i) => (
        <div key={i} className="bg-white border rounded-xl p-4">
          <h3 className="font-bold text-gray-900 mb-2">{section.title}</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{section.content}</p>
        </div>
      ))}
    </div>
  );

  const renderDeleteAccount = () => (
    <div className="space-y-6">
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-red-100 rounded-full"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
          <h3 className="font-bold text-red-800">Warning: Permanent Action</h3>
        </div>
        <p className="text-sm text-red-700">Deleting your account will permanently remove all your data, including medical records, appointments, and health history. <strong>This action cannot be undone.</strong></p>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-3">What will be deleted:</h4>
        <ul className="space-y-2">
          {['All personal information', 'Medical records and history', 'Appointment history', 'Prescription records', 'Family member profiles', 'All saved preferences', 'Chat history with doctors'].map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-red-700"><Trash2 className="h-4 w-4" />{item}</li>
          ))}
        </ul>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Type <span className="font-bold text-red-600">DELETE</span> to confirm</label>
          <input type="text" value={deleteConfirmation.text} onChange={(e) => setDeleteConfirmation(prev => ({ ...prev, text: e.target.value }))} placeholder="Type DELETE" className="w-full px-4 py-3 border border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Enter your password</label>
          <input type="password" value={deleteConfirmation.password} onChange={(e) => setDeleteConfirmation(prev => ({ ...prev, password: e.target.value }))} placeholder="Enter password to confirm" className="w-full px-4 py-3 border border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500" />
        </div>
      </div>
      <button className="w-full py-3.5 bg-red-600 text-white rounded-xl font-semibold disabled:bg-gray-300 disabled:text-gray-500" disabled={deleteConfirmation.text !== 'DELETE' || !deleteConfirmation.password}>
        Permanently Delete Account
      </button>
      <button onClick={() => setActivePanel(null)} className="w-full py-3 border border-gray-300 rounded-xl font-medium text-gray-600">Cancel</button>
    </div>
  );

  const renderAbout = () => (
    <div className="space-y-6">
      <div className="text-center py-6">
        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Heart className="h-12 w-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">MediConnect</h2>
        <p className="text-gray-500">Version 2.0.0</p>
        <p className="text-sm text-gray-400 mt-1">Build 2024.01.15</p>
      </div>
      <p className="text-gray-700 text-center px-4">Your trusted healthcare companion. Book appointments, manage medications, access medical records, and connect with healthcare providers - all in one app.</p>
      <div className="grid grid-cols-3 gap-4 py-4">
        <div className="text-center p-4 bg-green-50 rounded-xl"><p className="text-2xl font-bold text-green-600">1M+</p><p className="text-xs text-gray-500">Active Users</p></div>
        <div className="text-center p-4 bg-blue-50 rounded-xl"><p className="text-2xl font-bold text-blue-600">10K+</p><p className="text-xs text-gray-500">Doctors</p></div>
        <div className="text-center p-4 bg-purple-50 rounded-xl"><p className="text-2xl font-bold text-purple-600">500+</p><p className="text-xs text-gray-500">Hospitals</p></div>
      </div>
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <h4 className="font-semibold text-gray-900">What's New in v2.0.0</h4>
        <ul className="space-y-2 text-sm text-gray-700">
          {['Enhanced video consultation quality', 'New medication reminder features', 'Improved offline mode support', 'Family health management'].map((item, i) => (
            <li key={i} className="flex items-start gap-2"><Check className="h-4 w-4 text-green-500 mt-0.5" />{item}</li>
          ))}
        </ul>
      </div>
      <div className="text-center space-y-2 text-sm text-gray-500">
        <p>© 2024 MediConnect Health Technologies</p>
        <p>Made with ❤️ for better healthcare</p>
      </div>
      <div className="flex gap-3">
        <button className="flex-1 py-3 border rounded-xl font-medium text-gray-600 flex items-center justify-center gap-2"><Share2 className="h-4 w-4" /> Share App</button>
        <button className="flex-1 py-3 border rounded-xl font-medium text-gray-600 flex items-center justify-center gap-2"><FileText className="h-4 w-4" /> Licenses</button>
      </div>
    </div>
  );

  const guides = [
    { title: 'Getting Started', icon: User, content: 'Learn how to set up your profile, add your health information, and navigate the app. Start by completing your profile with accurate medical information for better healthcare recommendations.' },
    { title: 'Booking Appointments', icon: Calendar, content: "Find doctors by specialty, location, or name. View available time slots, read doctor profiles and reviews, then book your appointment with just a few taps. Receive confirmation and reminders." },
    { title: 'Managing Medications', icon: Activity, content: "Add your prescriptions, set up medication reminders, and track your adherence. Get notified when it's time to take your medicines and when refills are needed." },
    { title: 'Health Records', icon: FileText, content: 'Access all your medical records in one place. Upload documents, view lab results, download reports, and securely share them with your healthcare providers.' },
    { title: 'Emergency Features', icon: AlertTriangle, content: 'Set up emergency contacts, configure SOS settings, and access first aid guides. In an emergency, trigger SOS to alert contacts and share your location.' },
    { title: 'Family Profiles', icon: Users, content: "Add family members to manage their healthcare too. Switch between profiles easily, book appointments for them, and keep track of everyone's health in one app." }
  ];

  const renderGuide = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Learn how to make the most of MediConnect with these helpful guides.</p>
      {guides.map((guide, i) => (
        <div key={i} className="bg-white border rounded-xl overflow-hidden">
          <button onClick={() => setExpandedGuide(expandedGuide === i ? null : i)} className="w-full p-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><guide.icon className="h-5 w-5 text-green-600" /></div>
              <span className="font-medium text-gray-900">{guide.title}</span>
            </div>
            {expandedGuide === i ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>
          {expandedGuide === i && (
            <div className="px-4 pb-4 pt-0">
              <p className="text-sm text-gray-600 leading-relaxed pl-12">{guide.content}</p>
              <button className="ml-12 mt-3 text-sm text-green-600 font-medium flex items-center gap-1"><Video className="h-4 w-4" /> Watch Tutorial</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const faqs = [
    { q: 'How do I book an appointment?', a: "Go to the Appointments tab, select a specialty or search for a doctor, choose an available time slot, and confirm your booking. You'll receive a confirmation notification and email." },
    { q: 'Can I cancel or reschedule appointments?', a: 'Yes, you can cancel or reschedule appointments up to 2 hours before the scheduled time without any charges. Go to your appointment details and tap Cancel or Reschedule.' },
    { q: 'How do I add family members?', a: 'Go to Settings > Family Members > Add Family Member. Fill in their details including name, relationship, age, and blood group. They will be added to your account for easy management.' },
    { q: 'Is my health data secure?', a: 'Yes, we use end-to-end encryption and comply with HIPAA regulations to protect your health information. Your data is stored securely and only accessible by you and authorized healthcare providers.' },
    { q: 'How do I contact my doctor?', a: 'You can message your doctor through the chat feature available in your appointment history, or schedule a video consultation. For urgent matters, use the call feature if available.' },
    { q: 'What if I have a medical emergency?', a: 'Use the SOS button for immediate help. It will alert your emergency contacts, share your location, and can notify nearby emergency services. Always call 911 for life-threatening emergencies.' },
    { q: 'How do I get medication reminders?', a: "Add your medications in the Medications section with dosage and schedule. Enable notifications and you'll receive timely reminders to take your medicines." },
    { q: 'Can I access my records offline?', a: 'Yes, enable Offline Mode in Settings. Your downloaded records, saved appointments, and emergency contacts will be available without internet connection.' }
  ];

  const renderFAQs = () => (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 mb-4">Find answers to commonly asked questions about MediConnect.</p>
      {faqs.map((faq, i) => (
        <div key={i} className="bg-white border rounded-xl overflow-hidden">
          <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="w-full p-4 flex items-start justify-between hover:bg-gray-50 text-left">
            <span className="font-medium text-gray-900 pr-4">{faq.q}</span>
            {expandedFaq === i ? <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />}
          </button>
          {expandedFaq === i && (
            <div className="px-4 pb-4 pt-0">
              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg">{faq.a}</p>
            </div>
          )}
        </div>
      ))}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
        <p className="text-sm text-blue-800"><strong>Still have questions?</strong> Contact our support team for help.</p>
        <button onClick={() => setActivePanel('contact')} className="mt-2 text-blue-600 font-medium text-sm">Contact Support →</button>
      </div>
    </div>
  );

  const renderContactSupport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <a href="tel:1-800-MEDI-HELP" className="p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col items-center gap-2 hover:bg-green-100 transition-colors">
          <div className="p-3 bg-green-100 rounded-full"><Phone className="h-6 w-6 text-green-600" /></div>
          <span className="font-medium text-green-800">Call Us</span>
          <span className="text-xs text-green-600">24/7 Support</span>
        </a>
        <button className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col items-center gap-2 hover:bg-blue-100 transition-colors">
          <div className="p-3 bg-blue-100 rounded-full"><MessageSquare className="h-6 w-6 text-blue-600" /></div>
          <span className="font-medium text-blue-800">Live Chat</span>
          <span className="text-xs text-blue-600">Instant Help</span>
        </button>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-4">Send us a message</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
            <select value={supportMessage.subject} onChange={(e) => setSupportMessage(prev => ({ ...prev, subject: e.target.value }))} className="w-full px-4 py-3 border rounded-xl">
              <option>Technical Issue</option><option>Billing Question</option><option>Appointment Help</option><option>Account Issue</option><option>Feature Request</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
            <textarea value={supportMessage.message} onChange={(e) => setSupportMessage(prev => ({ ...prev, message: e.target.value }))} rows={5} placeholder="Describe your issue in detail..." className="w-full px-4 py-3 border rounded-xl resize-none" />
          </div>
          <button className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold disabled:bg-gray-300" disabled={!supportMessage.message}>Send Message</button>
        </div>
      </div>
      <div className="bg-gray-50 border rounded-xl p-4 text-center">
        <p className="text-sm text-gray-600 mb-2">You can also reach us at:</p>
        <p className="font-medium text-gray-900">support@mediconnect.com</p>
        <p className="font-medium text-gray-900">1-800-MEDI-HELP</p>
      </div>
    </div>
  );

  const feedbackTags = ['Appointments', 'Navigation', 'Speed', 'Features', 'Design', 'Support', 'Doctors', 'Payments'];

  const renderFeedback = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900">How's your experience?</h3>
        <p className="text-gray-500 text-sm">Your feedback helps us improve</p>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3 text-center">Rate your overall experience</label>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => setFeedback(prev => ({ ...prev, rating: star }))} className="p-1">
              <Star className={`h-10 w-10 transition-colors ${star <= feedback.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
            </button>
          ))}
        </div>
        {feedback.rating > 0 && (
          <p className="text-center text-sm text-gray-500 mt-2">
            {feedback.rating === 5 ? 'Excellent!' : feedback.rating === 4 ? 'Good!' : feedback.rating === 3 ? 'Average' : feedback.rating === 2 ? 'Poor' : 'Very Poor'}
          </p>
        )}
      </div>
      <div className="bg-white border rounded-xl p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">What can we improve? (Select all that apply)</label>
        <div className="flex flex-wrap gap-2">
          {feedbackTags.map((tag) => (
            <button key={tag} onClick={() => toggleFeedbackTag(tag)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${feedback.tags.includes(tag) ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{tag}</button>
          ))}
        </div>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Tell us more (optional)</label>
        <textarea value={feedback.message} onChange={(e) => setFeedback(prev => ({ ...prev, message: e.target.value }))} rows={4} placeholder="Share your thoughts, suggestions, or concerns..." className="w-full px-4 py-3 border rounded-xl resize-none" />
      </div>
      <button className="w-full py-3.5 bg-green-500 text-white rounded-xl font-semibold disabled:bg-gray-300" disabled={feedback.rating === 0}>Submit Feedback</button>
    </div>
  );

  const renderRateApp = () => (
    <div className="space-y-6 text-center">
      <div className="py-6">
        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Heart className="h-12 w-12 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Enjoying MediConnect?</h3>
        <p className="text-gray-600 mt-2">Your review helps us improve and helps others discover the app!</p>
      </div>
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} className="p-1"><Star className="h-12 w-12 text-yellow-400 fill-yellow-400" /></button>
        ))}
      </div>
      <div className="space-y-3 pt-4">
        <button className="w-full py-3.5 bg-green-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"><Star className="h-5 w-5" /> Rate on App Store</button>
        <button className="w-full py-3.5 bg-blue-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"><Star className="h-5 w-5" /> Rate on Google Play</button>
        <button onClick={() => setActivePanel(null)} className="text-gray-500 text-sm font-medium">Maybe Later</button>
      </div>
      <div className="bg-gray-50 border rounded-xl p-4">
        <p className="text-sm text-gray-600">Already rated? <button className="text-green-600 font-medium">Share with friends</button></p>
      </div>
    </div>
  );

  const renderManageFamily = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Manage healthcare for your entire family from one account.</p>
      {familyMembers.map((member) => (
        <div key={member.id} className={`bg-white border-2 rounded-xl p-4 transition-colors ${member.active ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
          <div className="flex items-center gap-4 mb-3">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${member.active ? 'bg-green-200' : 'bg-gray-200'}`}>
              <User className={`h-7 w-7 ${member.active ? 'text-green-700' : 'text-gray-600'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{member.name}</p>
                {member.active && <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-medium">Active</span>}
              </div>
              <p className="text-sm text-gray-500">{member.relation} • {member.gender} • {member.age} years</p>
              <p className="text-sm text-red-600 font-medium">{member.bloodGroup}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!member.active && (
              <button onClick={() => switchFamilyMember(member.id)} className="flex-1 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium">Switch to Profile</button>
            )}
            <button className="flex-1 py-2.5 border rounded-lg text-sm font-medium flex items-center justify-center gap-1"><Edit3 className="h-4 w-4" /> Edit</button>
            {member.relation !== 'Self' && (
              <button onClick={() => removeFamilyMember(member.id)} className="py-2.5 px-3 border border-red-200 text-red-600 rounded-lg"><Trash2 className="h-4 w-4" /></button>
            )}
          </div>
        </div>
      ))}
      <button onClick={() => setActiveModal('add-family')} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium flex items-center justify-center gap-2 hover:border-green-500 hover:text-green-600 transition-colors">
        <Plus className="h-5 w-5" /> Add Family Member
      </button>
    </div>
  );

  const renderAddContactModal = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
        <input type="text" value={newContact.name} onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter contact name" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Relationship</label>
        <select value={newContact.relation} onChange={(e) => setNewContact(prev => ({ ...prev, relation: e.target.value }))} className="w-full px-4 py-3 border rounded-xl">
          <option>Spouse</option><option>Parent</option><option>Child</option><option>Sibling</option><option>Friend</option><option>Doctor</option><option>Neighbor</option><option>Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
        <input type="tel" value={newContact.phone} onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))} placeholder="Enter phone number" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500" />
      </div>
      <div className="bg-gray-50 rounded-xl p-3">
        <ToggleSwitch label="Set as Primary Contact" description="First to be contacted in emergency" enabled={newContact.primary} onToggle={() => setNewContact(prev => ({ ...prev, primary: !prev.primary }))} />
      </div>
      <button onClick={addEmergencyContact} disabled={!newContact.name || !newContact.phone} className="w-full py-3.5 bg-green-500 text-white rounded-xl font-semibold disabled:bg-gray-300">Add Contact</button>
    </div>
  );

  const renderAddFamilyModal = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
        <input type="text" value={newFamilyMember.name} onChange={(e) => setNewFamilyMember(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter name" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Relationship</label>
        <select value={newFamilyMember.relation} onChange={(e) => setNewFamilyMember(prev => ({ ...prev, relation: e.target.value }))} className="w-full px-4 py-3 border rounded-xl">
          <option>Spouse</option><option>Parent</option><option>Child</option><option>Sibling</option><option>Grandparent</option><option>Other</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
          <select value={newFamilyMember.gender} onChange={(e) => setNewFamilyMember(prev => ({ ...prev, gender: e.target.value }))} className="w-full px-4 py-3 border rounded-xl">
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Age</label>
          <input type="number" value={newFamilyMember.age} onChange={(e) => setNewFamilyMember(prev => ({ ...prev, age: e.target.value }))} placeholder="Age" className="w-full px-4 py-3 border rounded-xl" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Blood Group</label>
        <select value={newFamilyMember.bloodGroup} onChange={(e) => setNewFamilyMember(prev => ({ ...prev, bloodGroup: e.target.value }))} className="w-full px-4 py-3 border rounded-xl">
          {['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg}>{bg}</option>)}
        </select>
      </div>
      <button onClick={addFamilyMember} disabled={!newFamilyMember.name || !newFamilyMember.age} className="w-full py-3.5 bg-green-500 text-white rounded-xl font-semibold disabled:bg-gray-300">Add Family Member</button>
    </div>
  );

  const renderActivePanel = () => {
    if (!activePanel) return null;
    const panelConfig = {
      'full-profile': { title: 'Full Profile', content: renderFullProfile() },
      'edit-profile': { title: 'Edit Profile', content: renderEditProfile() },
      'emergency-contacts': { title: 'Emergency Contacts', content: renderEmergencyContacts() },
      'sos-settings': { title: 'SOS Settings', content: renderSOSSettings() },
      'first-aid': { title: 'First Aid Guides', content: renderFirstAidGuides() },
      'helplines': { title: 'Emergency Helplines', content: renderHelplines() },
      'notification-settings': { title: 'Notification Settings', content: renderNotificationSettings() },
      'quiet-hours': { title: 'Quiet Hours', content: renderQuietHours() },
      'language': { title: 'Language', content: renderLanguage() },
      'voice-settings': { title: 'Voice Assistant', content: renderVoiceSettings() },
      'text-size': { title: 'Text Size', content: renderTextSize() },
      'contrast': { title: 'High Contrast Mode', content: renderContrast() },
      'offline-mode': { title: 'Offline Mode', content: renderOfflineMode() },
      'auto-sync': { title: 'Auto Sync', content: renderAutoSync() },
      'data-usage': { title: 'Data Usage', content: renderDataUsage() },
      'clear-cache': { title: 'Clear Cache', content: renderClearCache() },
      'change-password': { title: 'Change Password', content: renderChangePassword() },
      'biometric': { title: 'Biometric Login', content: renderBiometric() },
      'privacy-policy': { title: 'Privacy Policy', content: renderPrivacyPolicy() },
      'terms': { title: 'Terms of Service', content: renderTerms() },
      'delete-account': { title: 'Delete Account', content: renderDeleteAccount() },
      'about': { title: 'About MediConnect', content: renderAbout() },
      'guide': { title: 'User Guide', content: renderGuide() },
      'faqs': { title: 'FAQs', content: renderFAQs() },
      'contact': { title: 'Contact Support', content: renderContactSupport() },
      'feedback': { title: 'Send Feedback', content: renderFeedback() },
      'rate': { title: 'Rate MediConnect', content: renderRateApp() },
      'manage-family': { title: 'Manage Family', content: renderManageFamily() }
    };
    const config = panelConfig[activePanel];
    if (!config) return null;
    return (
      <DetailPanel title={config.title} onClose={() => { setActivePanel(null); setSelectedFirstAid(null); }}>
        {config.content}
      </DetailPanel>
    );
  };

  const renderActiveModal = () => {
    if (!activeModal) return null;
    const modalConfig = {
      'add-contact': { title: 'Add Emergency Contact', content: renderAddContactModal() },
      'add-family': { title: 'Add Family Member', content: renderAddFamilyModal() }
    };
    const config = modalConfig[activeModal];
    if (!config) return null;
    return (
      <Modal title={config.title} onClose={() => setActiveModal(null)}>
        {config.content}
      </Modal>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {renderActivePanel()}
      {renderActiveModal()}

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto pb-24">
        
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-4 bg-gradient-to-r from-green-500 to-green-600">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="h-5 w-5" /> Settings
            </h2>
          </div>
          <div className="px-4 py-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow">
              <User className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{profile.name}</p>
              <p className="text-sm text-gray-600">Patient | {profile.gender} | {profile.age} years</p>
              <p className="text-sm text-gray-600">Blood Group: <span className="text-red-600 font-semibold">{profile.bloodGroup}</span></p>
            </div>
          </div>
          <div className="flex gap-3 px-4 pb-4">
            <button onClick={() => { setEditedProfile({ ...profile }); setActivePanel('edit-profile'); }} className="flex-1 py-2.5 rounded-xl border border-gray-300 flex items-center justify-center gap-2 text-sm font-medium hover:bg-gray-50 transition-colors">
              <Pencil className="h-4 w-4" /> Edit Profile
            </button>
            <button onClick={() => setActivePanel('full-profile')} className="flex-1 py-2.5 rounded-xl bg-green-500 text-white flex items-center justify-center gap-2 text-sm font-medium hover:bg-green-600 transition-colors">
              <Eye className="h-4 w-4" /> View Profile
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" /> Family Members
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 mb-3">
            {familyMembers.map((member) => (
              <button key={member.id} onClick={() => switchFamilyMember(member.id)} className={`flex-shrink-0 w-20 flex flex-col items-center p-3 rounded-xl border-2 transition-all ${member.active ? 'border-green-500 bg-green-50 shadow-sm' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${member.active ? 'bg-green-200' : 'bg-gray-200'}`}>
                  <User className={`h-6 w-6 ${member.active ? 'text-green-700' : 'text-gray-600'}`} />
                </div>
                <span className="text-xs font-medium mt-2 truncate w-full text-center">{member.name}</span>
                {member.active && <span className="text-[10px] text-green-600 font-medium">Active</span>}
              </button>
            ))}
            <button onClick={() => setActiveModal('add-family')} className="flex-shrink-0 w-20 flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-green-500 hover:text-green-500 transition-colors">
              <Plus className="h-6 w-6" />
              <span className="text-xs mt-1">Add</span>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Managing: <span className="font-medium">{familyMembers.find(m => m.active)?.name}</span></p>
            <button onClick={() => setActivePanel('manage-family')} className="text-sm text-green-600 font-medium">Manage →</button>
          </div>
        </div>

        <Section title="🚨 Emergency Settings">
          <MenuItem icon={Phone} label="Emergency Contacts" onClick={() => setActivePanel('emergency-contacts')} value={`${emergencyContacts.length}`} />
          <MenuItem icon={Shield} label="SOS Settings" onClick={() => setActivePanel('sos-settings')} />
          <MenuItem icon={BookOpen} label="First Aid Guides" onClick={() => setActivePanel('first-aid')} />
          <MenuItem icon={Phone} label="Emergency Helplines" onClick={() => setActivePanel('helplines')} />
        </Section>

        <Section title="🔔 Notifications">
          <MenuItem icon={Bell} label="Notification Settings" onClick={() => setActivePanel('notification-settings')} />
          <MenuItem icon={Moon} label="Quiet Hours" onClick={() => setActivePanel('quiet-hours')} value={settings.quietHours.enabled ? 'On' : 'Off'} />
        </Section>

        <Section title="🌐 Language & Accessibility">
          <MenuItem icon={Globe} label="Language" onClick={() => setActivePanel('language')} value={settings.language} />
          <MenuItem icon={Volume2} label="Voice Assistant" onClick={() => setActivePanel('voice-settings')} value={settings.voiceAssistant ? 'On' : 'Off'} />
          <MenuItem icon={Settings} label="Text Size" onClick={() => setActivePanel('text-size')} value={settings.textSize.charAt(0).toUpperCase() + settings.textSize.slice(1)} />
          <MenuItem icon={Sun} label="High Contrast Mode" onClick={() => setActivePanel('contrast')} value={settings.highContrast ? 'On' : 'Off'} />
        </Section>

        <Section title="⚙️ App Settings">
          <MenuItem icon={settings.offlineMode ? WifiOff : Wifi} label="Offline Mode" onClick={() => setActivePanel('offline-mode')} value={settings.offlineMode ? 'On' : 'Off'} />
          <MenuItem icon={RefreshCw} label="Auto Sync" onClick={() => setActivePanel('auto-sync')} value={settings.autoSync ? 'On' : 'Off'} />
          <MenuItem icon={Database} label="Data Usage" onClick={() => setActivePanel('data-usage')} value="245 MB" />
          <MenuItem icon={Trash2} label="Clear Cache" onClick={() => setActivePanel('clear-cache')} value="125 MB" />
        </Section>

        <Section title="🔐 Privacy & Security">
          <MenuItem icon={Lock} label="Change Password" onClick={() => setActivePanel('change-password')} />
          <MenuItem icon={Fingerprint} label="Biometric Login" onClick={() => setActivePanel('biometric')} value={settings.biometric ? 'On' : 'Off'} />
          <MenuItem icon={Shield} label="Privacy Policy" onClick={() => setActivePanel('privacy-policy')} />
          <MenuItem icon={FileText} label="Terms of Service" onClick={() => setActivePanel('terms')} />
          <MenuItem icon={Trash2} label="Delete Account" onClick={() => setActivePanel('delete-account')} danger />
        </Section>

        <Section title="ℹ️ About & Support">
          <MenuItem icon={Info} label="About MediConnect" onClick={() => setActivePanel('about')} value="v2.0.0" />
          <MenuItem icon={BookOpen} label="User Guide" onClick={() => setActivePanel('guide')} />
          <MenuItem icon={HelpCircle} label="FAQs" onClick={() => setActivePanel('faqs')} />
          <MenuItem icon={MessageSquare} label="Contact Support" onClick={() => setActivePanel('contact')} />
          <MenuItem icon={MessageSquare} label="Send Feedback" onClick={() => setActivePanel('feedback')} />
          <MenuItem icon={Star} label="Rate MediConnect" onClick={() => setActivePanel('rate')} />
        </Section>

        <button className="w-full py-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
          <ArrowLeft className="h-5 w-5" /> Sign Out
        </button>

        <div className="h-8" />
      </div>
    </div>
  );
};

export default PatientMoreTab;
