import React, { useState, useEffect, useCallback, lazy, Suspense, memo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import PatientAppLayout from '../components/patient/PatientAppLayout';
import Loader from '../components/common/Loader';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { useVoiceCommand } from '../hooks/useVoiceCommand';
import { useLanguage } from '../hooks/useLanguage';
import { useVoiceOutput } from '../hooks/useVoiceOutput';

// ============================================
// LAZY LOADED TAB COMPONENTS
// ============================================

// Home tab loads immediately (first view)
import PatientHomeTab from './patient/PatientHomeTab';

// Other tabs are lazy loaded for performance
const PatientHealthTab = lazy(() => import('./patient/PatientHealthTab'));
const PatientAppointmentsTab = lazy(() => import('./patient/PatientAppointmentsTab'));
const PatientRecordsTab = lazy(() => import('./patient/PatientRecordsTab'));
const PatientMoreTab = lazy(() => import('./patient/PatientMoreTab'));
const Chatbot = lazy(() => import('./Chatbot'));

// Future tabs (lazy loaded when created)
// const PatientDoctorsTab = lazy(() => import('./patient/PatientDoctorsTab'));
// const PatientMedicineTab = lazy(() => import('./patient/PatientMedicineTab'));
// const PatientSymptomCheckerTab = lazy(() => import('./patient/PatientSymptomCheckerTab'));
// const PatientNotificationsTab = lazy(() => import('./patient/PatientNotificationsTab'));

// ============================================
// TAB CONFIGURATION
// ============================================
const TAB_CONFIG = {
  home: {
    id: 'home',
    labelKey: 'tabs.home',
    labels: {
      en: 'Home',
      hi: 'होम',
      te: 'హోమ్',
    },
    voiceAnnouncement: {
      en: 'You are on the Home tab',
      hi: 'आप होम टैब पर हैं',
      te: 'మీరు హోమ్ ట్యాబ్‌లో ఉన్నారు',
    },
    voiceCommands: ['home', 'go to home', 'होम', 'హోమ్'],
  },
  health: {
    id: 'health',
    labelKey: 'tabs.health',
    labels: {
      en: 'Health',
      hi: 'स्वास्थ्य',
      te: 'ఆరోగ్యం',
    },
    voiceAnnouncement: {
      en: 'You are on the Health tab. Check your symptoms and health status here.',
      hi: 'आप स्वास्थ्य टैब पर हैं। यहां अपने लक्षण और स्वास्थ्य स्थिति जांचें।',
      te: 'మీరు ఆరోగ్య ట్యాబ్‌లో ఉన్నారు. ఇక్కడ మీ లక్షణాలు మరియు ఆరోగ్య స్థితిని తనిఖీ చేయండి.',
    },
    voiceCommands: [
      'health',
      'symptom',
      'symptoms',
      'check symptoms',
      'स्वास्थ्य',
      'लक्षण',
      'ఆరోగ్యం',
      'లక్షణాలు',
    ],
  },
  chat: {
    id: 'chat',
    labelKey: 'tabs.chat',
    labels: {
      en: 'AI Chat',
      hi: 'AI चैट',
      te: 'AI చాట్',
    },
    voiceAnnouncement: {
      en: 'You are on the AI Chat tab. This is for reference only. Please consult a doctor if you have any discomfort.',
      hi: 'आप AI चैट टैब पर हैं। यह केवल संदर्भ के लिए है। यदि आपको कोई असुविधा है तो कृपया डॉक्टर से परामर्श करें।',
      te: 'మీరు AI చాట్ ట్యాబ్‌లో ఉన్నారు. ఇది సూచన కోసం మాత్రమే. మీకు ఏదైనా అసౌకర్యం ఉంటే దయచేసి వైద్యుడిని సంప్రదించండి.',
    },
    voiceCommands: [
      'chat',
      'chatbot',
      'ai chat',
      'talk to ai',
      'चैट',
      'चैटबॉट',
      'చాట్',
      'చాట్‌బాట్',
    ],
  },
  appointments: {
    id: 'appointments',
    labelKey: 'tabs.appointments',
    labels: {
      en: 'Appointments',
      hi: 'अपॉइंटमेंट',
      te: 'అపాయింట్‌మెంట్లు',
    },
    voiceAnnouncement: {
      en: 'You are on the Appointments tab. View and manage your doctor appointments.',
      hi: 'आप अपॉइंटमेंट टैब पर हैं। अपनी डॉक्टर अपॉइंटमेंट देखें और प्रबंधित करें।',
      te: 'మీరు అపాయింట్‌మెంట్ల ట్యాబ్‌లో ఉన్నారు. మీ డాక్టర్ అపాయింట్‌మెంట్లను చూడండి మరియు నిర్వహించండి.',
    },
    voiceCommands: [
      'appointments',
      'my appointments',
      'book appointment',
      'अपॉइंटमेंट',
      'అపాయింట్‌మెంట్',
    ],
  },
  records: {
    id: 'records',
    labelKey: 'tabs.records',
    labels: {
      en: 'Records',
      hi: 'रिकॉर्ड्स',
      te: 'రికార్డులు',
    },
    voiceAnnouncement: {
      en: 'You are on the Health Records tab. View, upload, and share your medical records.',
      hi: 'आप स्वास्थ्य रिकॉर्ड्स टैब पर हैं। अपने मेडिकल रिकॉर्ड देखें, अपलोड करें और साझा करें।',
      te: 'మీరు ఆరోగ్య రికార్డుల ట్యాబ్‌లో ఉన్నారు. మీ వైద్య రికార్డులను చూడండి, అప్‌లోడ్ చేయండి మరియు షేర్ చేయండి.',
    },
    voiceCommands: [
      'records',
      'health records',
      'medical records',
      'my records',
      'रिकॉर्ड',
      'रికార్డులు',
    ],
  },
  more: {
    id: 'more',
    labelKey: 'tabs.more',
    labels: {
      en: 'More',
      hi: 'अधिक',
      te: 'మరిన్ని',
    },
    voiceAnnouncement: {
      en: 'You are on the More tab. Access settings, profile, medicines, and other features.',
      hi: 'आप अधिक टैब पर हैं। सेटिंग्स, प्रोफ़ाइल, दवाइयां और अन्य सुविधाएं एक्सेस करें।',
      te: 'మీరు మరిన్ని ట్యాబ్‌లో ఉన్నారు. సెట్టింగ్‌లు, ప్రొఫైల్, మందులు మరియు ఇతర ఫీచర్‌లను యాక్సెస్ చేయండి.',
    },
    voiceCommands: [
      'more',
      'settings',
      'profile',
      'medicine',
      'medicines',
      'अधिक',
      'सेटिंग',
      'प्रोफ़ाइल',
      'మరిన్ని',
      'సెట్టింగ్‌లు',
    ],
  },
};

const TAB_IDS = Object.keys(TAB_CONFIG);
const DEFAULT_TAB = 'home';

// ============================================
// TAB CONTENT WRAPPER WITH ERROR BOUNDARY
// ============================================
const TabPanel = memo(({ tabId, isActive, children }) => {
  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
      className="tab-panel"
      style={{ height: '100%' }}
    >
      <ErrorBoundary
        fallback={
          <TabErrorFallback tabId={tabId} />
        }
      >
        <Suspense
          fallback={
            <div className="tab-loading">
              <Loader />
            </div>
          }
        >
          {children}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
});

TabPanel.displayName = 'TabPanel';

// ============================================
// TAB ERROR FALLBACK
// ============================================
const TabErrorFallback = ({ tabId }) => {
  const { t } = useLanguage();

  return (
    <div className="tab-error-fallback" style={errorFallbackStyles}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
      <h3 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>
        {t('errors.tabCrashed', 'Something went wrong')}
      </h3>
      <p style={{ margin: '0 0 16px 0', color: '#6b7280' }}>
        {t(
          'errors.tabCrashedDescription',
          `The ${tabId} tab encountered an error. Please try again.`
        )}
      </p>
      <button
        onClick={() => window.location.reload()}
        style={reloadButtonStyles}
      >
        {t('actions.reload', 'Reload Page')}
      </button>
    </div>
  );
};

const errorFallbackStyles = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '48px 24px',
  textAlign: 'center',
  minHeight: '300px',
};

const reloadButtonStyles = {
  padding: '10px 24px',
  backgroundColor: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  cursor: 'pointer',
};

// ============================================
// MAIN COMPONENT
// ============================================
const PatientDashboard = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const { speak, stop: stopSpeaking } = useVoiceOutput();

  // ---- Determine initial tab ----
  const getInitialTab = useCallback(() => {
    // Priority 1: URL search param (?tab=health)
    const urlTab = searchParams.get('tab');
    if (urlTab && TAB_IDS.includes(urlTab)) return urlTab;

    // Priority 2: Navigation state (from other pages)
    const stateTab = location.state?.tab;
    if (stateTab && TAB_IDS.includes(stateTab)) return stateTab;

    // Priority 3: Default
    return DEFAULT_TAB;
  }, [searchParams, location.state?.tab]);

  const [activeTab, setActiveTab] = useState(getInitialTab);

  // ---- Handle navigation state changes ----
  useEffect(() => {
    const stateTab = location.state?.tab;
    if (stateTab && TAB_IDS.includes(stateTab)) {
      setActiveTab(stateTab);
      // Clean up navigation state to prevent re-triggering
      window.history.replaceState({}, '', location.pathname + location.search);
    }
  }, [location.state?.tab, location.pathname, location.search]);

  // ---- Sync tab with URL for deep linking ----
  useEffect(() => {
    const currentUrlTab = searchParams.get('tab');
    if (activeTab !== DEFAULT_TAB && currentUrlTab !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    } else if (activeTab === DEFAULT_TAB && currentUrlTab) {
      // Remove tab param when on default tab
      setSearchParams({}, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  // ---- Handle tab change with voice announcement ----
  const handleTabChange = useCallback(
    (tabId) => {
      if (!TAB_IDS.includes(tabId)) {
        console.warn(`Invalid tab: ${tabId}`);
        return;
      }

      if (tabId === activeTab) return; // Don't re-switch to same tab

      // Stop any ongoing speech
      stopSpeaking();

      setActiveTab(tabId);

      // Voice announcement for the new tab
      const tabConfig = TAB_CONFIG[tabId];
      if (tabConfig?.voiceAnnouncement) {
        const announcement =
          tabConfig.voiceAnnouncement[language] ||
          tabConfig.voiceAnnouncement.en;

        // Small delay to let the tab render first
        setTimeout(() => {
          speak(announcement);
        }, 300);
      }
    },
    [activeTab, language, speak, stopSpeaking]
  );

  // ---- Voice command navigation ----
  const handleVoiceCommand = useCallback(
    (command) => {
      const normalizedCommand = command.toLowerCase().trim();

      // Find matching tab
      for (const [tabId, config] of Object.entries(TAB_CONFIG)) {
        if (
          config.voiceCommands.some(
            (vc) =>
              normalizedCommand.includes(vc.toLowerCase()) ||
              vc.toLowerCase().includes(normalizedCommand)
          )
        ) {
          handleTabChange(tabId);
          return true; // Command handled
        }
      }

      return false; // Command not recognized at dashboard level
    },
    [handleTabChange]
  );

  // ---- Initialize voice commands ----
  useVoiceCommand({
    onCommand: handleVoiceCommand,
    commands: Object.values(TAB_CONFIG).flatMap((config) => config.voiceCommands),
  });

  // ---- Render tab content ----
  const renderTabContent = useCallback(() => {
    return (
      <>
        <TabPanel tabId="home" isActive={activeTab === 'home'}>
          <PatientHomeTab />
        </TabPanel>

        <TabPanel tabId="health" isActive={activeTab === 'health'}>
          <PatientHealthTab />
        </TabPanel>

        <TabPanel tabId="chat" isActive={activeTab === 'chat'}>
          <Chatbot />
        </TabPanel>

        <TabPanel tabId="appointments" isActive={activeTab === 'appointments'}>
          <PatientAppointmentsTab />
        </TabPanel>

        <TabPanel tabId="records" isActive={activeTab === 'records'}>
          <PatientRecordsTab />
        </TabPanel>

        <TabPanel tabId="more" isActive={activeTab === 'more'}>
          <PatientMoreTab />
        </TabPanel>
      </>
    );
  }, [activeTab]);

  return (
    <PatientAppLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      tabConfig={TAB_CONFIG}
    >
      {renderTabContent()}
    </PatientAppLayout>
  );
};

export default memo(PatientDashboard);