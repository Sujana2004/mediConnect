import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Pill,
  MessageSquare,
  Calendar,
  FileText,
  Settings,
  AlertTriangle,
} from 'lucide-react';

const TABS = [
  { id: 'home', icon: Home, labelKey: 'patient.navHome', emoji: '🏠', shortLabel: 'Home' },
  { id: 'health', icon: Pill, labelKey: 'patient.navHealth', emoji: '💊', shortLabel: 'Health' },
  { id: 'chat', icon: MessageSquare, labelKey: 'patient.navChat', emoji: '🤖', shortLabel: 'Chat' },
  { id: 'appointments', icon: Calendar, labelKey: 'patient.navAppointments', emoji: '📅', shortLabel: 'Appointments' },
  { id: 'records', icon: FileText, labelKey: 'patient.navRecords', emoji: '📋', shortLabel: 'Records' },
  { id: 'more', icon: Settings, labelKey: 'patient.navMore', emoji: '⚙️', shortLabel: 'More' },
];

const PatientSidebar = ({ activeTab, onTabChange, onSOSClick }) => {
  const { t } = useTranslation();

  return (
    <aside
      className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col"
      role="navigation"
      aria-label={t('patient.mainNavigation', 'Main navigation')}
    >
      <nav className="flex-1 py-4 px-2 space-y-0.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={t(tab.labelKey, tab.shortLabel)}
            >
              <span className="text-lg w-6 text-center" aria-hidden>{tab.emoji}</span>
              <Icon className="h-5 w-5 flex-shrink-0 text-gray-500" aria-hidden />
              <span className="truncate">{t(tab.labelKey, tab.shortLabel)}</span>
            </button>
          );
        })}
      </nav>

      {/* SOS - web: in sidebar */}
      {onSOSClick && (
        <div className="p-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onSOSClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
            aria-label={t('emergency.sosButton', 'SOS Emergency')}
          >
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span>SOS Emergency</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default PatientSidebar;
export { TABS };
