import React from 'react';
import { useTranslation } from 'react-i18next';

export default function RoleSelectScreen({ onSelectPatient, onSelectDoctor, onBack }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col p-6">
      <div className="flex items-center gap-4 mb-6">
        <button type="button" onClick={onBack} className="p-2 -ml-2 text-gray-600" aria-label="Back">←</button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Select Your Role</h1>
        <span className="text-sm text-gray-500">🌐 తెలుగు ▼</span>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-xl bg-primary-50 flex items-center justify-center text-3xl">🏥</div>
        </div>
        <p className="text-center text-gray-900 font-medium">Create New Account</p>
        <p className="text-center text-sm text-gray-500 mt-1">కొత్త ఖాతా సృష్టించండి</p>
        <p className="text-center text-gray-600 mt-4">I want to register as:</p>
        <p className="text-center text-sm text-gray-500">నేను రిజిస్టర్ చేయాలనుకుంటున్నాను:</p>

        <div className="mt-8 space-y-4">
          <button
            type="button"
            onClick={onSelectPatient}
            className="w-full p-6 rounded-2xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50/50 text-left transition-colors"
          >
            <span className="text-4xl block mb-3">🧑‍⚕️</span>
            <span className="font-semibold text-gray-900 block">Patient</span>
            <span className="text-sm text-gray-500 block mt-1">రోగి</span>
            <p className="text-gray-600 text-sm mt-2">I need medical care and health services</p>
            <p className="text-xs text-gray-500 mt-1">నాకు వైద్య సంరక్షణ మరియు ఆరోగ్య సేవలు కావాలి</p>
            <span className="text-primary-600 text-sm font-medium mt-3 inline-block">Select as Patient →</span>
          </button>

          <button
            type="button"
            onClick={onSelectDoctor}
            className="w-full p-6 rounded-2xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50/50 text-left transition-colors"
          >
            <span className="text-4xl block mb-3">👨‍⚕️</span>
            <span className="font-semibold text-gray-900 block">Doctor</span>
            <span className="text-sm text-gray-500 block mt-1">డాక్టర్</span>
            <p className="text-gray-600 text-sm mt-2">I am a medical professional</p>
            <p className="text-xs text-gray-500 mt-1">నేను వైద్య నిపుణుడిని</p>
            <span className="text-primary-600 text-sm font-medium mt-3 inline-block">Select as Doctor →</span>
          </button>
        </div>

        <p className="text-center text-gray-600 mt-8 text-sm">
          Already have an account? <button type="button" onClick={onBack} className="text-primary-600 font-medium">Login Here →</button>
        </p>
      </div>
    </div>
  );
}
