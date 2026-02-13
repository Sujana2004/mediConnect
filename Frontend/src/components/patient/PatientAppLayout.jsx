import React, { useState } from 'react';
import PatientTopBar from './PatientTopBar';
import SOSModal from './SOSModal';
import Footer from '../common/Footer';

/**
 * Website-style layout: single top navigation bar + main content + footer.
 * No sidebar; all navigation in the top bar. SOS in navbar.
 */
const PatientAppLayout = ({ activeTab, onTabChange, children }) => {
  const [showSOSModal, setShowSOSModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PatientTopBar
        activeTab={activeTab}
        onTabChange={onTabChange}
        onSOSClick={() => setShowSOSModal(true)}
      />
      <main className="flex-1 w-full overflow-auto">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
      <Footer />
      <SOSModal show={showSOSModal} onClose={() => setShowSOSModal(false)} />
    </div>
  );
};

export default PatientAppLayout;
