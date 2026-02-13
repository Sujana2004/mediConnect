import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import PatientAppLayout from '../components/patient/PatientAppLayout';
import PatientHomeTab from './patient/PatientHomeTab';
import PatientHealthTab from './patient/PatientHealthTab';
import PatientAppointmentsTab from './patient/PatientAppointmentsTab';
import PatientRecordsTab from './patient/PatientRecordsTab';
import PatientMoreTab from './patient/PatientMoreTab';
import Loader from '../components/common/Loader';

const Chatbot = lazy(() => import('./Chatbot'));

const TAB_IDS = ['home', 'health', 'chat', 'appointments', 'records', 'more'];

const PatientDashboard = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    const stateTab = location.state?.tab;
    if (stateTab && TAB_IDS.includes(stateTab)) {
      setActiveTab(stateTab);
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.state?.tab, location.pathname]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <PatientHomeTab />;
      case 'health':
        return <PatientHealthTab />;
      case 'chat':
        return (
          <Suspense fallback={<Loader />}>
            <Chatbot />
          </Suspense>
        );
      case 'appointments':
        return <PatientAppointmentsTab />;
      case 'records':
        return <PatientRecordsTab />;
      case 'more':
        return <PatientMoreTab />;
      default:
        return <PatientHomeTab />;
    }
  };

  return (
    <PatientAppLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderTabContent()}
    </PatientAppLayout>
  );
};

export default PatientDashboard;
