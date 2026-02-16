// pages/patient/PatientMoreTab/panels/ProfilePanels.jsx

import React from 'react';
import PropTypes from 'prop-types';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Activity,
  Ruler,
  Scale,
  AlertTriangle,
  Stethoscope,
  Camera,
  Save,
  Pencil,
  Share2,
  Download,
} from 'lucide-react';

import { DetailPanel, InputField, SelectField, ActionButton } from '../components';
import { BLOOD_GROUPS, GENDERS } from '../constants';

// ============================================
// FULL PROFILE PANEL
// ============================================
export const FullProfilePanel = ({ profile, onClose, onEdit, isLoading }) => (
  <DetailPanel title="Full Profile" onClose={onClose}>
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex flex-col items-center py-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mb-4 shadow-lg">
          <User className="h-12 w-12 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">{profile.name}</h3>
        <p className="text-gray-500">Patient ID: {profile.id}</p>
        <div className="flex gap-2 mt-3">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Active</span>
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">{profile.bloodGroup}</span>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <User className="h-4 w-4 text-primary-600" /> Basic Information
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <InfoItem label="Gender" value={profile.gender} />
          <InfoItem label="Age" value={`${profile.age} years`} />
          <InfoItem label="Date of Birth" value={profile.dateOfBirth} />
          <InfoItem label="Blood Group" value={profile.bloodGroup} valueColor="text-red-600" />
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Phone className="h-4 w-4 text-primary-600" /> Contact Information
        </h4>
        <div className="space-y-3">
          <ContactItem icon={Phone} label="Phone" value={profile.phone} />
          <ContactItem icon={Mail} label="Email" value={profile.email} />
          <ContactItem icon={MapPin} label="Address" value={profile.address} />
        </div>
      </div>

      {/* Physical Information */}
      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-primary-600" /> Physical Information
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <PhysicalItem icon={Ruler} label="Height" value={`${profile.height} cm`} color="blue" />
          <PhysicalItem icon={Scale} label="Weight" value={`${profile.weight} kg`} color="purple" />
        </div>
      </div>

      {/* Allergies */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <h4 className="font-semibold text-red-800 flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4" /> Allergies
        </h4>
        <div className="flex flex-wrap gap-2">
          {profile.allergies.map((allergy, i) => (
            <span key={i} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium">
              {allergy}
            </span>
          ))}
        </div>
      </div>

      {/* Medical Conditions */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h4 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
          <Stethoscope className="h-4 w-4" /> Medical Conditions
        </h4>
        <div className="flex flex-wrap gap-2">
          {profile.conditions.map((condition, i) => (
            <span key={i} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
              {condition}
            </span>
          ))}
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <h4 className="font-semibold text-green-800 flex items-center gap-2 mb-3">
          <Phone className="h-4 w-4" /> Emergency Contact
        </h4>
        <p className="text-green-700 font-medium">{profile.emergencyContact}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onEdit}
          className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
        >
          <Pencil className="h-4 w-4" /> Edit Profile
        </button>
        <button className="p-3 border rounded-xl hover:bg-gray-50">
          <Share2 className="h-5 w-5 text-gray-600" />
        </button>
        <button className="p-3 border rounded-xl hover:bg-gray-50">
          <Download className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    </div>
  </DetailPanel>
);

FullProfilePanel.propTypes = {
  profile: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

// ============================================
// EDIT PROFILE PANEL
// ============================================
export const EditProfilePanel = ({
  profile,
  editedProfile,
  setEditedProfile,
  onClose,
  onSave,
  isLoading,
}) => {
  const handleChange = (field) => (e) => {
    setEditedProfile((prev) => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <DetailPanel title="Edit Profile" onClose={onClose}>
      <div className="space-y-5">
        {/* Profile Photo */}
        <div className="flex flex-col items-center py-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg">
              <User className="h-12 w-12 text-white" />
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-white border-2 border-primary-500 rounded-full shadow-lg hover:bg-gray-50">
              <Camera className="h-4 w-4 text-primary-600" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">Tap to change photo</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <InputField
            label="Full Name"
            value={editedProfile.name}
            onChange={handleChange('name')}
            placeholder="Enter your full name"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Gender"
              value={editedProfile.gender}
              onChange={handleChange('gender')}
              options={GENDERS}
            />
            <SelectField
              label="Blood Group"
              value={editedProfile.bloodGroup}
              onChange={handleChange('bloodGroup')}
              options={BLOOD_GROUPS}
            />
          </div>

          <InputField
            label="Date of Birth"
            type="date"
            value={editedProfile.dateOfBirth}
            onChange={handleChange('dateOfBirth')}
          />

          <InputField
            label="Phone Number"
            type="tel"
            value={editedProfile.phone}
            onChange={handleChange('phone')}
            placeholder="Enter phone number"
            required
          />

          <InputField
            label="Email Address"
            type="email"
            value={editedProfile.email}
            onChange={handleChange('email')}
            placeholder="Enter email address"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
            <textarea
              value={editedProfile.address}
              onChange={handleChange('address')}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              placeholder="Enter your address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Height (cm)"
              type="number"
              value={editedProfile.height}
              onChange={handleChange('height')}
              placeholder="Height"
            />
            <InputField
              label="Weight (kg)"
              type="number"
              value={editedProfile.weight}
              onChange={handleChange('weight')}
              placeholder="Weight"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <ActionButton onClick={onSave} loading={isLoading} icon={Save}>
          Save Changes
        </ActionButton>

        <ActionButton
          onClick={() => {
            setEditedProfile({ ...profile });
            onClose();
          }}
          variant="secondary"
          disabled={isLoading}
        >
          Cancel
        </ActionButton>
      </div>
    </DetailPanel>
  );
};

EditProfilePanel.propTypes = {
  profile: PropTypes.object.isRequired,
  editedProfile: PropTypes.object.isRequired,
  setEditedProfile: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

// ============================================
// HELPER COMPONENTS
// ============================================
const InfoItem = ({ label, value, valueColor = 'text-gray-900' }) => (
  <div>
    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
    <p className={`font-medium ${valueColor}`}>{value}</p>
  </div>
);

InfoItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  valueColor: PropTypes.string,
};

const ContactItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="p-2 bg-gray-100 rounded-lg">
      <Icon className="h-4 w-4 text-gray-600" />
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  </div>
);

ContactItem.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

const PhysicalItem = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
};

PhysicalItem.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  color: PropTypes.oneOf(['blue', 'purple']).isRequired,
};