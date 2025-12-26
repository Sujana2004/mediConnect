import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { AuthProvider } from './context/AuthContext.jsx';
import PrivateRoute from './components/common/PrivateRoute.jsx';
import Navbar from './components/common/Navbar.jsx';
import Footer from './components/common/Footer.jsx';
import Loader from './components/common/Loader.jsx';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const PatientDashboard = lazy(() => import('./pages/PatientDashboard'));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'));
const SymptomChecker = lazy(() => import('./pages/SymptomChecker'));
const Chatbot = lazy(() => import('./pages/Chatbot'));
const DoctorList = lazy(() => import('./pages/DoctorList'));
const DoctorProfile = lazy(() => import('./pages/DoctorProfile'));
const Consultation = lazy(() => import('./pages/Consultation'));
const HealthRecords = lazy(() => import('./pages/HealthRecords'));
const MedicineSearch = lazy(() => import('./pages/MedicineSearch'));
const Emergency = lazy(() => import('./pages/Emergency'));
const Profile = lazy(() => import('./pages/Profile'));

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <Router>
        <AuthProvider>
          <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />
            <main className="flex-grow">
              <Suspense fallback={<Loader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Protected Routes - Patient */}
                  <Route path="/patient-dashboard" element={
                    <PrivateRoute allowedRoles={['patient']}>
                      <PatientDashboard />
                    </PrivateRoute>
                  } />

                  {/* Protected Routes - Doctor */}
                  <Route path="/doctor-dashboard" element={
                    <PrivateRoute allowedRoles={['doctor']}>
                      <DoctorDashboard />
                    </PrivateRoute>
                  } />

                  {/* Protected Routes - Both Roles */}
                  <Route path="/symptom-checker" element={
                    <PrivateRoute allowedRoles={['patient', 'doctor']}>
                      <SymptomChecker />
                    </PrivateRoute>
                  } />
                  <Route path="/chatbot" element={
                    <PrivateRoute allowedRoles={['patient', 'doctor']}>
                      <Chatbot />
                    </PrivateRoute>
                  } />
                  <Route path="/doctors" element={
                    <PrivateRoute allowedRoles={['patient', 'doctor']}>
                      <DoctorList />
                    </PrivateRoute>
                  } />
                    <Route path="/doctors/:id" element={
                      <PrivateRoute allowedRoles={['patient', 'doctor']}>
                        <DoctorProfile />
                      </PrivateRoute>
                    } />
                  <Route path="/consultation/:roomId?" element={
                    <PrivateRoute allowedRoles={['patient', 'doctor']}>
                      <Consultation />
                    </PrivateRoute>
                  } />
                  <Route path="/health-records" element={
                    <PrivateRoute allowedRoles={['patient', 'doctor']}>
                      <HealthRecords />
                    </PrivateRoute>
                  } />
                  <Route path="/medicines" element={
                    <PrivateRoute allowedRoles={['patient', 'doctor']}>
                      <MedicineSearch />
                    </PrivateRoute>
                  } />
                  <Route path="/emergency" element={
                    <PrivateRoute allowedRoles={['patient', 'doctor']}>
                      <Emergency />
                    </PrivateRoute>
                  } />
                  <Route path="/profile" element={
                    <PrivateRoute allowedRoles={['patient', 'doctor']}>
                      <Profile />
                    </PrivateRoute>
                  } />

                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </Router>
    </I18nextProvider>
  );
}

export default App;