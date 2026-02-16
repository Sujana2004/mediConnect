// pages/patient/PatientMoreTab/panels/FamilyPanels.jsx

import React from 'react';
import PropTypes from 'prop-types';
import {
  User,
  Plus,
  Edit3,
  Trash2,
  Phone,
  Calendar,
  Activity,
  AlertTriangle,
  Check,
  Heart,
  Users,
  Shield,
} from 'lucide-react';

import ToggleSwitch from '../../../../components/common/ToggleSwitch';
import Modal from '../../../../components/common/Modal';
import { DetailPanel, ActionButton, InputField, SelectField, InfoCard } from '../components';
import { BLOOD_GROUPS, GENDERS, RELATIONSHIPS, FAMILY_RELATIONSHIPS } from '../constants';

// ============================================
// MANAGE FAMILY PANEL
// ============================================
export const ManageFamilyPanel = ({
  familyMembers,
  onSwitchMember,
  onEditMember,
  onRemoveMember,
  onAddMember,
  isLoading,
  onClose,
}) => {
  const activeMember = familyMembers.find((m) => m.active);

  return (
    <DetailPanel title="Manage Family" onClose={onClose}>
      <div className="space-y-4">
        {/* Info Section */}
        <InfoCard
          icon={Users}
          title="Family Health Management"
          description="Manage healthcare for your entire family from one account"
          color="blue"
        />

        {/* Active Profile Banner */}
        {activeMember && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-200 flex items-center justify-center">
                <span className="text-2xl">{activeMember.avatar}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-primary-600">Currently Managing</p>
                <p className="font-bold text-primary-900">{activeMember.name}</p>
              </div>
              <div className="px-3 py-1 bg-primary-600 text-white text-xs rounded-full font-medium">
                Active
              </div>
            </div>
          </div>
        )}

        {/* Family Members List */}
        <div className="space-y-3">
          {familyMembers.map((member) => (
            <FamilyMemberCard
              key={member.id}
              member={member}
              onSwitch={() => onSwitchMember(member.id)}
              onEdit={() => onEditMember(member)}
              onRemove={() => onRemoveMember(member.id)}
              isLoading={isLoading}
            />
          ))}
        </div>

        {/* Add Family Member Button */}
        <button
          onClick={onAddMember}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium flex items-center justify-center gap-2 hover:border-primary-500 hover:text-primary-600 transition-colors"
        >
          <Plus className="h-5 w-5" /> Add Family Member
        </button>

        {/* Tips Section */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Tips
          </h4>
          <ul className="space-y-1 text-sm text-amber-700">
            <li>• Switch profiles to book appointments for family members</li>
            <li>• Each member has their own health records and history</li>
            <li>• Emergency contacts are shared across all profiles</li>
          </ul>
        </div>

        {/* Family Health Summary */}
        <div className="bg-white border rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Family Health Summary</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{familyMembers.length}</p>
              <p className="text-xs text-gray-500">Total Members</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {familyMembers.filter((m) => m.bloodGroup && m.bloodGroup !== 'Unknown').length}
              </p>
              <p className="text-xs text-gray-500">Blood Groups Set</p>
            </div>
          </div>
        </div>

        {/* Blood Group Compatibility */}
        <div className="bg-white border rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" /> Blood Groups
          </h4>
          <div className="flex flex-wrap gap-2">
            {familyMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
              >
                <span className="text-lg">{member.avatar}</span>
                <div>
                  <p className="text-xs text-gray-500">{member.name}</p>
                  <p className="text-sm font-bold text-red-600">
                    {member.bloodGroup || 'Unknown'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DetailPanel>
  );
};

ManageFamilyPanel.propTypes = {
  familyMembers: PropTypes.array.isRequired,
  onSwitchMember: PropTypes.func.isRequired,
  onEditMember: PropTypes.func.isRequired,
  onRemoveMember: PropTypes.func.isRequired,
  onAddMember: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// FAMILY MEMBER CARD COMPONENT
// ============================================
const FamilyMemberCard = ({ member, onSwitch, onEdit, onRemove, isLoading }) => (
  <div
    className={`bg-white border-2 rounded-xl p-4 transition-colors ${
      member.active ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
    }`}
  >
    {/* Member Info */}
    <div className="flex items-center gap-4 mb-3">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center ${
          member.active ? 'bg-primary-200' : 'bg-gray-200'
        }`}
      >
        <span className="text-2xl">{member.avatar}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900">{member.name}</p>
          {member.active && (
            <span className="px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full font-medium">
              Active
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {member.relation} • {member.gender} • {member.age} years
        </p>
        <p className="text-sm text-red-600 font-medium">{member.bloodGroup || 'Blood group not set'}</p>
      </div>
    </div>

    {/* Quick Stats */}
    {member.active && (
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white rounded-lg p-2 text-center border">
          <p className="text-lg font-bold text-primary-600">3</p>
          <p className="text-[10px] text-gray-500">Appointments</p>
        </div>
        <div className="bg-white rounded-lg p-2 text-center border">
          <p className="text-lg font-bold text-green-600">5</p>
          <p className="text-[10px] text-gray-500">Medications</p>
        </div>
        <div className="bg-white rounded-lg p-2 text-center border">
          <p className="text-lg font-bold text-blue-600">2</p>
          <p className="text-[10px] text-gray-500">Records</p>
        </div>
      </div>
    )}

    {/* Action Buttons */}
    <div className="flex gap-2">
      {!member.active && (
        <button
          onClick={onSwitch}
          disabled={isLoading}
          className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:bg-gray-400 transition-colors"
        >
          Switch to Profile
        </button>
      )}
      <button
        onClick={onEdit}
        disabled={isLoading}
        className="flex-1 py-2.5 border rounded-lg text-sm font-medium flex items-center justify-center gap-1 hover:bg-gray-50 disabled:opacity-50"
      >
        <Edit3 className="h-4 w-4" /> Edit
      </button>
      {member.relation !== 'Self' && (
        <button
          onClick={onRemove}
          disabled={isLoading}
          className="py-2.5 px-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  </div>
);

FamilyMemberCard.propTypes = {
  member: PropTypes.object.isRequired,
  onSwitch: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

// ============================================
// ADD FAMILY MEMBER MODAL
// ============================================
export const AddFamilyMemberModal = ({
  newFamilyMember,
  setNewFamilyMember,
  onAdd,
  isLoading,
  onClose,
}) => {
  const handleChange = (field) => (e) => {
    setNewFamilyMember((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const isValid = newFamilyMember.name?.trim() && newFamilyMember.age;

  return (
    <Modal title="Add Family Member" onClose={onClose}>
      <div className="space-y-4">
        {/* Avatar Preview */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-4xl">
              {newFamilyMember.gender === 'Male' ? '👨' : newFamilyMember.gender === 'Female' ? '👩' : '👤'}
            </span>
          </div>
        </div>

        {/* Form Fields */}
        <InputField
          label="Full Name"
          value={newFamilyMember.name}
          onChange={handleChange('name')}
          placeholder="Enter name"
          required
        />

        <SelectField
          label="Relationship"
          value={newFamilyMember.relation}
          onChange={handleChange('relation')}
          options={FAMILY_RELATIONSHIPS}
        />

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Gender"
            value={newFamilyMember.gender}
            onChange={handleChange('gender')}
            options={GENDERS}
          />
          <InputField
            label="Age"
            type="number"
            value={newFamilyMember.age}
            onChange={handleChange('age')}
            placeholder="Age"
            required
          />
        </div>

        <SelectField
          label="Blood Group"
          value={newFamilyMember.bloodGroup}
          onChange={handleChange('bloodGroup')}
          options={['Unknown', ...BLOOD_GROUPS]}
        />

        {/* Optional: Date of Birth */}
        <InputField
          label="Date of Birth (Optional)"
          type="date"
          value={newFamilyMember.dateOfBirth || ''}
          onChange={handleChange('dateOfBirth')}
        />

        {/* Optional: Phone Number */}
        <InputField
          label="Phone Number (Optional)"
          type="tel"
          value={newFamilyMember.phone || ''}
          onChange={handleChange('phone')}
          placeholder="Enter phone number"
        />

        {/* Health Conditions Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> You can add health conditions, allergies, and medical history after
            creating the profile.
          </p>
        </div>

        {/* Submit Button */}
        <ActionButton onClick={onAdd} loading={isLoading} disabled={!isValid}>
          Add Family Member
        </ActionButton>
      </div>
    </Modal>
  );
};

AddFamilyMemberModal.propTypes = {
  newFamilyMember: PropTypes.object.isRequired,
  setNewFamilyMember: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// EDIT FAMILY MEMBER MODAL
// ============================================
export const EditFamilyMemberModal = ({
  member,
  editedMember,
  setEditedMember,
  onSave,
  isLoading,
  onClose,
}) => {
  const handleChange = (field) => (e) => {
    setEditedMember((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const isValid = editedMember?.name?.trim() && editedMember?.age;
  const isSelf = member?.relation === 'Self';

  return (
    <Modal title={`Edit ${member?.name || 'Member'}`} onClose={onClose}>
      <div className="space-y-4">
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-4xl">{editedMember?.avatar || '👤'}</span>
            </div>
            <button className="absolute bottom-0 right-0 p-1.5 bg-primary-600 rounded-full text-white hover:bg-primary-700">
              <Edit3 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <InputField
          label="Full Name"
          value={editedMember?.name || ''}
          onChange={handleChange('name')}
          placeholder="Enter name"
          required
        />

        {!isSelf && (
          <SelectField
            label="Relationship"
            value={editedMember?.relation || 'Spouse'}
            onChange={handleChange('relation')}
            options={FAMILY_RELATIONSHIPS}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Gender"
            value={editedMember?.gender || 'Male'}
            onChange={handleChange('gender')}
            options={GENDERS}
          />
          <InputField
            label="Age"
            type="number"
            value={editedMember?.age || ''}
            onChange={handleChange('age')}
            placeholder="Age"
            required
          />
        </div>

        <SelectField
          label="Blood Group"
          value={editedMember?.bloodGroup || 'Unknown'}
          onChange={handleChange('bloodGroup')}
          options={['Unknown', ...BLOOD_GROUPS]}
        />

        <InputField
          label="Date of Birth"
          type="date"
          value={editedMember?.dateOfBirth || ''}
          onChange={handleChange('dateOfBirth')}
        />

        <InputField
          label="Phone Number"
          type="tel"
          value={editedMember?.phone || ''}
          onChange={handleChange('phone')}
          placeholder="Enter phone number"
        />

        {/* Self Profile Notice */}
        {isSelf && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> This is your primary profile. Some fields cannot be changed here.
              Use the main Profile settings for detailed updates.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <ActionButton onClick={onSave} loading={isLoading} disabled={!isValid}>
          Save Changes
        </ActionButton>

        <ActionButton onClick={onClose} variant="secondary" disabled={isLoading}>
          Cancel
        </ActionButton>
      </div>
    </Modal>
  );
};

EditFamilyMemberModal.propTypes = {
  member: PropTypes.object,
  editedMember: PropTypes.object,
  setEditedMember: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// EMERGENCY CONTACTS MODAL (for Add Contact)
// ============================================
export const AddEmergencyContactModal = ({
  newContact,
  setNewContact,
  onAdd,
  isLoading,
  onClose,
}) => {
  const handleChange = (field) => (e) => {
    setNewContact((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const isValid = newContact.name?.trim() && newContact.phone?.trim();

  return (
    <Modal title="Add Emergency Contact" onClose={onClose}>
      <div className="space-y-4">
        {/* Info */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-sm text-red-800">
            <strong>Emergency contacts</strong> will be notified when you trigger SOS and can access
            your location.
          </p>
        </div>

        {/* Form Fields */}
        <InputField
          label="Full Name"
          value={newContact.name}
          onChange={handleChange('name')}
          placeholder="Enter contact name"
          required
        />

        <SelectField
          label="Relationship"
          value={newContact.relation}
          onChange={handleChange('relation')}
          options={RELATIONSHIPS}
        />

        <InputField
          label="Phone Number"
          type="tel"
          value={newContact.phone}
          onChange={handleChange('phone')}
          placeholder="Enter phone number"
          required
        />

        {/* Email (Optional) */}
        <InputField
          label="Email (Optional)"
          type="email"
          value={newContact.email || ''}
          onChange={handleChange('email')}
          placeholder="Enter email address"
        />

        {/* Primary Contact Toggle */}
        <div className="bg-gray-50 rounded-xl p-3">
          <ToggleSwitch
            label="Set as Primary Contact"
            description="First to be contacted in emergency"
            enabled={newContact.primary}
            onToggle={() => setNewContact((prev) => ({ ...prev, primary: !prev.primary }))}
          />
        </div>

        {/* Notify About SOS Toggle */}
        <div className="bg-gray-50 rounded-xl p-3">
          <ToggleSwitch
            label="Notify via SMS"
            description="Send SMS alerts during emergencies"
            enabled={newContact.notifySms !== false}
            onToggle={() =>
              setNewContact((prev) => ({ ...prev, notifySms: prev.notifySms === false }))
            }
          />
        </div>

        {/* Submit Button */}
        <ActionButton onClick={onAdd} loading={isLoading} disabled={!isValid}>
          Add Contact
        </ActionButton>
      </div>
    </Modal>
  );
};

AddEmergencyContactModal.propTypes = {
  newContact: PropTypes.object.isRequired,
  setNewContact: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// FAMILY MEMBER DETAILS PANEL (View Only)
// ============================================
export const FamilyMemberDetailsPanel = ({ member, onEdit, onClose }) => {
  if (!member) return null;

  return (
    <DetailPanel title={`${member.name}'s Profile`} onClose={onClose}>
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center py-4">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 shadow-lg ${
              member.active ? 'bg-primary-200' : 'bg-gray-200'
            }`}
          >
            <span className="text-5xl">{member.avatar}</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
          <p className="text-gray-500">{member.relation}</p>
          <div className="flex gap-2 mt-3">
            {member.active && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Active Profile
              </span>
            )}
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
              {member.bloodGroup || 'Unknown'}
            </span>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white border rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-primary-600" /> Basic Information
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Gender</p>
              <p className="font-medium text-gray-900">{member.gender}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Age</p>
              <p className="font-medium text-gray-900">{member.age} years</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Blood Group</p>
              <p className="font-medium text-red-600">{member.bloodGroup || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Relation</p>
              <p className="font-medium text-gray-900">{member.relation}</p>
            </div>
          </div>
        </div>

        {/* Health Stats Placeholder */}
        <div className="bg-white border rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-primary-600" /> Health Overview
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">0</p>
              <p className="text-xs text-gray-500">Allergies</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">0</p>
              <p className="text-xs text-gray-500">Conditions</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">0</p>
              <p className="text-xs text-gray-500">Medications</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 text-center mt-3">
            Health records will appear here once added
          </p>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="bg-white border rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-primary-600" /> Recent Activity
          </h4>
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">No recent activity</p>
            <p className="text-gray-400 text-xs">Appointments and records will appear here</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <ActionButton onClick={onEdit} icon={Edit3}>
            Edit Profile
          </ActionButton>
        </div>

        {member.relation !== 'Self' && (
          <ActionButton variant="outline" icon={Shield}>
            View Health Records
          </ActionButton>
        )}
      </div>
    </DetailPanel>
  );
};

FamilyMemberDetailsPanel.propTypes = {
  member: PropTypes.object,
  onEdit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// FAMILY QUICK SWITCH COMPONENT (for use in main page)
// ============================================
export const FamilyQuickSwitch = ({
  familyMembers,
  onSwitchMember,
  onAddMember,
  onManageFamily,
}) => {
  const activeMember = familyMembers.find((m) => m.active);

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <Users className="h-5 w-5 text-primary-600" /> Family Members
      </h3>

      {/* Horizontal Scroll List */}
      <div className="flex gap-3 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {familyMembers.map((member) => (
          <button
            key={member.id}
            onClick={() => onSwitchMember(member.id)}
            className={`flex-shrink-0 w-20 flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
              member.active
                ? 'border-primary-500 bg-primary-50 shadow-sm'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                member.active ? 'bg-primary-200' : 'bg-gray-200'
              }`}
            >
              <span className="text-2xl">{member.avatar}</span>
            </div>
            <span className="text-xs font-medium mt-2 truncate w-full text-center">
              {member.name}
            </span>
            {member.active && (
              <span className="text-[10px] text-primary-600 font-medium">Active</span>
            )}
          </button>
        ))}

        {/* Add Button */}
        <button
          onClick={onAddMember}
          className="flex-shrink-0 w-20 flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-primary-500 hover:text-primary-500 transition-colors"
        >
          <Plus className="h-6 w-6" />
          <span className="text-xs mt-1">Add</span>
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Managing: <span className="font-medium">{activeMember?.name}</span>
        </p>
        <button
          onClick={onManageFamily}
          className="text-sm text-primary-600 font-medium hover:underline"
        >
          Manage →
        </button>
      </div>
    </div>
  );
};

FamilyQuickSwitch.propTypes = {
  familyMembers: PropTypes.array.isRequired,
  onSwitchMember: PropTypes.func.isRequired,
  onAddMember: PropTypes.func.isRequired,
  onManageFamily: PropTypes.func.isRequired,
};