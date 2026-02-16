// pages/patient/PatientMoreTab/panels/EmergencyPanels.jsx

import React from 'react';
import PropTypes from 'prop-types';
import {
  User,
  Phone,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  Video,
  Check,
  ChevronRight,
} from 'lucide-react';

import ToggleSwitch from '../../../../components/common/ToggleSwitch';
import { DetailPanel, ActionButton, InfoCard } from '../components';
import { HELPLINES, FIRST_AID_GUIDES } from '../constants';

// ============================================
// EMERGENCY CONTACTS PANEL
// ============================================
export const EmergencyContactsPanel = ({
  contacts,
  onClose,
  onAddContact,
  onRemoveContact,
  isLoading,
}) => (
  <DetailPanel title="Emergency Contacts" onClose={onClose}>
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        These contacts will be notified in case of emergency when you trigger SOS.
      </p>

      {contacts.map((contact) => (
        <div key={contact.id} className="bg-white border rounded-xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  contact.primary ? 'bg-red-100' : 'bg-gray-100'
                }`}
              >
                <User className={`h-6 w-6 ${contact.primary ? 'text-red-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{contact.name}</p>
                  {contact.primary && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                      Primary
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{contact.relation}</p>
                <p className="text-sm text-primary-600 font-medium">{contact.phone}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={`tel:${contact.phone}`}
              className="flex-1 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium flex items-center justify-center gap-1 hover:bg-primary-100"
            >
              <Phone className="h-4 w-4" /> Call
            </a>
            <button className="flex-1 py-2 border rounded-lg text-sm font-medium flex items-center justify-center gap-1 hover:bg-gray-50">
              <Edit3 className="h-4 w-4" /> Edit
            </button>
            {!contact.primary && (
              <button
                onClick={() => onRemoveContact(contact.id)}
                className="py-2 px-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}

      <button
        onClick={onAddContact}
        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium flex items-center justify-center gap-2 hover:border-primary-500 hover:text-primary-600 transition-colors"
      >
        <Plus className="h-5 w-5" /> Add Emergency Contact
      </button>
    </div>
  </DetailPanel>
);

EmergencyContactsPanel.propTypes = {
  contacts: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onAddContact: PropTypes.func.isRequired,
  onRemoveContact: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

// ============================================
// SOS SETTINGS PANEL
// ============================================
export const SOSSettingsPanel = ({ sosSettings, onToggle, onClose }) => (
  <DetailPanel title="SOS Settings" onClose={onClose}>
    <div className="space-y-6">
      <InfoCard
        icon={AlertTriangle}
        title="SOS Emergency"
        description="Quick access to emergency help"
        color="red"
      >
        <p className="text-sm text-red-700 mt-3">
          Press and hold the SOS button for 3 seconds to alert emergency contacts and share your location.
        </p>
      </InfoCard>

      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-4">SOS Actions</h4>
        <div className="space-y-1">
          <ToggleSwitch
            label="Call Primary Emergency Contact"
            description="Automatically calls your primary contact"
            enabled={sosSettings.callPrimary}
            onToggle={() => onToggle('callPrimary')}
          />
          <ToggleSwitch
            label="Send SMS to All Contacts"
            description="Sends alert message to all emergency contacts"
            enabled={sosSettings.sendSms}
            onToggle={() => onToggle('sendSms')}
          />
          <ToggleSwitch
            label="Share Live Location"
            description="Shares your real-time GPS location"
            enabled={sosSettings.shareLocation}
            onToggle={() => onToggle('shareLocation')}
          />
          <ToggleSwitch
            label="Alert Nearby Hospitals"
            description="Notifies nearby emergency services"
            enabled={sosSettings.alertHospitals}
            onToggle={() => onToggle('alertHospitals')}
          />
          <ToggleSwitch
            label="Sound Alarm Siren"
            description="Plays loud alarm sound"
            enabled={sosSettings.soundAlarm}
            onToggle={() => onToggle('soundAlarm')}
          />
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-4">SOS Triggers</h4>
        <div className="space-y-1">
          <ToggleSwitch
            label="Power Button (Press 5 times)"
            enabled={sosSettings.powerButton}
            onToggle={() => onToggle('powerButton')}
          />
          <ToggleSwitch
            label="Shake Phone Vigorously"
            enabled={sosSettings.shakePhone}
            onToggle={() => onToggle('shakePhone')}
          />
          <ToggleSwitch
            label='"Help Me" Voice Command'
            enabled={sosSettings.voiceCommand}
            onToggle={() => onToggle('voiceCommand')}
          />
        </div>
      </div>

      <ActionButton variant="danger" icon={AlertTriangle}>
        Test SOS (Demo Mode)
      </ActionButton>
    </div>
  </DetailPanel>
);

SOSSettingsPanel.propTypes = {
  sosSettings: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// FIRST AID GUIDES PANEL
// ============================================
export const FirstAidPanel = ({ selectedGuide, setSelectedGuide, onClose }) => (
  <DetailPanel
    title="First Aid Guides"
    onClose={() => {
      setSelectedGuide(null);
      onClose();
    }}
  >
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Quick reference guides for common medical emergencies. Always call emergency services for serious situations.
      </p>

      {selectedGuide ? (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedGuide(null)}
            className="flex items-center gap-2 text-primary-600 font-medium hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to all guides
          </button>

          <InfoCard
            icon={selectedGuide.icon}
            title={selectedGuide.title}
            description={selectedGuide.description}
            color="red"
          />

          <div className="bg-white border rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Steps to Follow:</h4>
            <ol className="space-y-3">
              {selectedGuide.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <span className="text-gray-700">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Important Tips
            </h4>
            <ul className="space-y-1">
              {selectedGuide.tips.map((tip, i) => (
                <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                  <span>•</span> {tip}
                </li>
              ))}
            </ul>
          </div>

          <ActionButton variant="danger" icon={Video}>
            Watch Video Tutorial
          </ActionButton>
        </div>
      ) : (
        <div className="space-y-3">
          {FIRST_AID_GUIDES.map((guide) => (
            <button
              key={guide.id}
              onClick={() => setSelectedGuide(guide)}
              className="w-full flex items-center gap-4 p-4 bg-white border rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="p-3 rounded-xl bg-red-100">
                {React.createElement(guide.icon, { className: 'h-6 w-6 text-red-600' })}
              </div>
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
  </DetailPanel>
);

FirstAidPanel.propTypes = {
  selectedGuide: PropTypes.object,
  setSelectedGuide: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// HELPLINES PANEL
// ============================================
export const HelplinesPanel = ({ onClose }) => (
  <DetailPanel title="Emergency Helplines" onClose={onClose}>
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
        <p className="text-red-800 font-medium">
          In case of life-threatening emergency, call <strong>911</strong> immediately
        </p>
      </div>

      <div className="space-y-3">
        {HELPLINES.map((line, i) => (
          <div key={i} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{line.name}</p>
                <p className="text-sm text-gray-500">{line.desc}</p>
              </div>
              <a
                href={`tel:${line.number.replace(/-/g, '')}`}
                className="px-4 py-2.5 bg-primary-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-primary-700 transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span className="text-sm">{line.number}</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  </DetailPanel>
);

HelplinesPanel.propTypes = {
  onClose: PropTypes.func.isRequired,
};