import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import PrivateRoute from './components/common/PrivateRoute.jsx';
import Navbar from './components/common/Navbar.jsx';
import Footer from './components/common/Footer.jsx';
import Loader from './components/common/Loader.jsx';

function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (user) {
    return <Navigate to={user.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard'} replace />;
  }
  return <AuthFlow />;
}

function AppLayout({ children }) {
  const location = useLocation();
  const isPatientApp = location.pathname === '/patient-dashboard';
  const isAuthFlow = location.pathname === '/';
  const hideNavFooter = isPatientApp || isAuthFlow;
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {!hideNavFooter && <Navbar />}
      <main className="flex-grow">{children}</main>
      {!hideNavFooter && <Footer />}
    </div>
  );
}

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const AuthFlow = lazy(() => import('./pages/auth/AuthFlow'));
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
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppLayout>
            <Suspense fallback={<Loader />}>
              <Routes>
                  {/* Auth gate: "/" shows AuthFlow when not logged in, else redirects to dashboard */}
                  <Route path="/" element={<AuthGate />} />
                  <Route path="/home" element={<Home />} />
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
                      <PrivateRoute allowedRoles={['patient']}>
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
          </AppLayout>
        </AuthProvider>
      </Router>
    </I18nextProvider>
  );
}

export default App;