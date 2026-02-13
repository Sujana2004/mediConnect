import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Pill,
  MessageSquare,
  Calendar,
  FileText,
  Settings,
} from 'lucide-react';

const TABS = [
  { id: 'home', icon: Home, labelKey: 'patient.navHome', emoji: '🏠', shortLabel: 'Home' },
  { id: 'health', icon: Pill, labelKey: 'patient.navHealth', emoji: '💊', shortLabel: 'Health' },
  { id: 'chat', icon: MessageSquare, labelKey: 'patient.navChat', emoji: '🤖', shortLabel: 'Chat' },
  { id: 'appointments', icon: Calendar, labelKey: 'patient.navAppointments', emoji: '📅', shortLabel: 'Appts' },
  { id: 'records', icon: FileText, labelKey: 'patient.navRecords', emoji: '📋', shortLabel: 'Records' },
  { id: 'more', icon: Settings, labelKey: 'patient.navMore', emoji: '⚙️', shortLabel: 'More' },
];

const PatientBottomNav = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 safe-area-bottom"
      role="navigation"
      aria-label={t('patient.mainNavigation', 'Main navigation')}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 min-w-0 py-2 px-1 touch-manipulation min-h-[48px] ${
                isActive ? 'text-primary-600' : 'text-gray-500'
              }`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={t(tab.labelKey, tab.id)}
            >
              <span className="text-lg leading-none" aria-hidden>{tab.emoji}</span>
              <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isActive ? 'text-primary-600' : 'text-gray-500'}`} aria-hidden />
              <span className="text-[10px] sm:text-xs mt-0.5 font-medium truncate w-full text-center">
                {t(tab.labelKey, tab.shortLabel)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default PatientBottomNav;
export { TABS };
