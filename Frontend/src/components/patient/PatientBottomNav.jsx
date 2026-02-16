// src/components/patient/PatientBottomNav.jsx
import React, { useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Stethoscope,
  MessageSquare,
  Calendar,
  FileText,
  Pill,
  Menu,
  Activity,
} from 'lucide-react';

/**
 * Full tab configuration with all patient features
 */
const TABS = [
  {
    id: 'home',
    icon: Home,
    labelKey: 'patient.navHome',
    label: 'Home',
  },
  {
    id: 'symptoms',
    icon: Activity,
    labelKey: 'patient.navSymptoms',
    label: 'Symptoms',
  },
  {
    id: 'doctors',
    icon: Stethoscope,
    labelKey: 'patient.navDoctors',
    label: 'Doctors',
  },
  {
    id: 'appointments',
    icon: Calendar,
    labelKey: 'patient.navAppointments',
    label: 'Appointments',
  },
  {
    id: 'records',
    icon: FileText,
    labelKey: 'patient.navRecords',
    label: 'Records',
  },
  {
    id: 'medicines',
    icon: Pill,
    labelKey: 'patient.navMedicines',
    label: 'Medicines',
  },
  {
    id: 'chat',
    icon: MessageSquare,
    labelKey: 'patient.navChat',
    label: 'AI Chat',
  },
  {
    id: 'more',
    icon: Menu,
    labelKey: 'patient.navMore',
    label: 'More',
  },
];

const PatientBottomNav = ({
  activeTab,
  onTabChange,
  badges = {},
  hidden = false,
}) => {
  const { t } = useTranslation();
  const scrollContainerRef = useRef(null);
  const activeTabRef = useRef(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTab]);

  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleTabChange = useCallback((tabId) => {
    triggerHaptic();
    onTabChange(tabId);
  }, [onTabChange, triggerHaptic]);

  if (hidden) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      role="navigation"
      aria-label={t('patient.mainNavigation', 'Main navigation')}
    >
      {/* Scrollable container for many tabs */}
      <div
        ref={scrollContainerRef}
        className="flex items-stretch overflow-x-auto scrollbar-hide"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="flex items-stretch min-w-full justify-around px-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const badgeCount = badges[tab.id];

            return (
              <button
                key={tab.id}
                ref={isActive ? activeTabRef : null}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`
                  relative flex flex-col items-center justify-center 
                  min-w-[64px] py-2 px-2
                  transition-all duration-150
                  touch-manipulation
                  scroll-snap-align-center
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset
                  ${isActive 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700 active:bg-gray-50'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
                aria-label={t(tab.labelKey, tab.label)}
              >
                {/* Icon */}
                <div className="relative">
                  <Icon 
                    className={`h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-150 ${
                      isActive ? 'scale-110' : ''
                    }`} 
                    strokeWidth={isActive ? 2.5 : 2}
                    aria-hidden="true"
                  />

                  {/* Badge */}
                  {badgeCount > 0 && (
                    <span 
                      className="absolute -top-1 -right-1 min-w-[16px] h-[16px] 
                        flex items-center justify-center 
                        bg-red-500 text-white text-[9px] font-bold 
                        rounded-full px-0.5"
                    >
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span 
                  className={`
                    text-[10px] sm:text-[11px] mt-1 font-medium 
                    whitespace-nowrap
                    ${isActive ? 'text-blue-600' : 'text-gray-500'}
                  `}
                >
                  {t(tab.labelKey, tab.label)}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <span 
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-full"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default PatientBottomNav;
export { TABS };