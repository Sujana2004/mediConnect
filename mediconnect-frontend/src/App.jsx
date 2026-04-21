// src/App.jsx
import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';

// Layouts
import {
  AuthLayout,
  PatientLayout,
  DoctorLayout,
  ConsultationLayout,
  ErrorBoundary,
} from './components/layout';

// Common components
import { Loader } from './components/common';

// Hooks
import useAuth from './hooks/useAuth';

// Auth Pages (eager load for faster initial experience)
import { Login, PatientRegister, DoctorRegister } from './pages/auth';

// =============================================
// Lazy load Patient Pages
// =============================================
const PatientHome = lazy(() => import('./pages/patient/Home'));
const PatientDoctors = lazy(() => import('./pages/patient/Doctors'));
const PatientDoctorProfile = lazy(() => import('./pages/patient/DoctorProfile'));
const PatientAppointments = lazy(() => import('./pages/patient/Appointments'));
const PatientBookAppointment = lazy(() => import('./pages/patient/BookAppointment'));
const PatientSymptomChecker = lazy(() => import('./pages/patient/SymptomChecker'));
const PatientHealthRecords = lazy(() => import('./pages/patient/HealthRecords'));
const PatientMedicines = lazy(() => import('./pages/patient/Medicines'));
const PatientChatbot = lazy(() => import('./pages/patient/Chatbot'));
const PatientEmergency = lazy(() => import('./pages/patient/Emergency'));
const PatientNotifications = lazy(() => import('./pages/patient/Notifications'));
const PatientProfile = lazy(() => import('./pages/patient/Profile'));
const PatientConsultationRoom = lazy(() => import('./pages/patient/ConsultationRoom'));
const PatientSettings = lazy(() => import('./pages/patient/Settings'));

// =============================================
// Lazy load Doctor Pages
// =============================================
const DoctorHome = lazy(() => import('./pages/doctor/Home'));
const DoctorQueueManagement = lazy(() => import('./pages/doctor/QueueManagement'));
const DoctorAppointments = lazy(() => import('./pages/doctor/Appointments'));
const DoctorPatientRecords = lazy(() => import('./pages/doctor/PatientRecords'));
const DoctorConsultations = lazy(() => import('./pages/doctor/Consultations'));
const DoctorConsultationRoom = lazy(() => import('./pages/doctor/ConsultationRoom'));
const DoctorPrescriptions = lazy(() => import('./pages/doctor/Prescriptions'));
const DoctorSchedule = lazy(() => import('./pages/doctor/Schedule'));
const DoctorNotifications = lazy(() => import('./pages/doctor/Notifications'));
const DoctorProfile = lazy(() => import('./pages/doctor/Profile'));
const DoctorSettings = lazy(() => import('./pages/doctor/Settings'));

/**
 * Loading fallback component for Suspense boundaries
 */
const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <Loader size="lg" text="Loading..." />
  </div>
);

/**
 * Protected Route wrapper - Requires authentication
 * Optionally restricts by user role
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, isLoading, hasHydrated } = useAuth();

  if (!hasHydrated || isLoading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'doctor') {
      return <Navigate to="/doctor/home" replace />;
    }
    if (user?.role === 'patient') {
      return <Navigate to="/patient/home" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children || <Outlet />;
};

/**
 * Public Route wrapper - Redirects authenticated users to their dashboard
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user, hasHydrated, isLoading } = useAuth();

  if (!hasHydrated || isLoading) {
    return <PageLoading />;
  }

  if (isAuthenticated && user) {
    if (user.role === 'doctor') {
      return <Navigate to="/doctor/home" replace />;
    }
    return <Navigate to="/patient/home" replace />;
  }

  return children || <Outlet />;
};

/**
 * Patient Routes wrapper with layout and suspense
 */
const PatientRoutes = () => (
  <ProtectedRoute allowedRoles={['patient']}>
    <PatientLayout>
      <Suspense fallback={<Loader.Page />}>
        <Outlet />
      </Suspense>
    </PatientLayout>
  </ProtectedRoute>
);

/**
 * Doctor Routes wrapper with layout and suspense
 */
const DoctorRoutes = () => (
  <ProtectedRoute allowedRoles={['doctor']}>
    <DoctorLayout>
      <Suspense fallback={<Loader.Page />}>
        <Outlet />
      </Suspense>
    </DoctorLayout>
  </ProtectedRoute>
);

/**
 * Root redirect - sends users to appropriate dashboard or login
 */
const RootRedirect = () => {
  const { isAuthenticated, user, hasHydrated, isLoading } = useAuth();

  if (!hasHydrated || isLoading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'doctor') {
    return <Navigate to="/doctor/home" replace />;
  }

  return <Navigate to="/patient/home" replace />;
};

/**
 * 404 Not Found page
 */
const NotFound = () => {
  const { isAuthenticated, user } = useAuth();

  const dashboardPath = user?.role === 'doctor' ? '/doctor/home' : '/patient/home';
  const redirectPath = isAuthenticated ? dashboardPath : '/login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300">404</h1>
        <p className="text-xl text-gray-600 mt-4">Page not found</p>
        <p className="text-gray-500 mt-2">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          to={redirectPath}
          className="inline-flex items-center justify-center mt-6 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Go to {isAuthenticated ? 'Dashboard' : 'Login'}
        </Link>
      </div>
    </div>
  );
};

/**
 * Main App Component
 */
const App = () => {
  useEffect(() => {
    const language = localStorage.getItem('language') || 'en';
    document.documentElement.lang = language;
    document.body.setAttribute('data-lang', language);
  }, []);

  return (
    <ErrorBoundary>
      <Routes>
        {/* ============================== */}
        {/* PUBLIC ROUTES (Auth)           */}
        {/* ============================== */}
        <Route
          element={
            <PublicRoute>
              <AuthLayout />
            </PublicRoute>
          }
        >
          <Route path="/login" element={<Login />} />
          <Route path="/register/patient" element={<PatientRegister />} />
          <Route path="/register/doctor" element={<DoctorRegister />} />
        </Route>

        {/* ============================== */}
        {/* PATIENT ROUTES                 */}
        {/* ============================== */}
        <Route path="/patient" element={<PatientRoutes />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<PatientHome />} />
          <Route path="doctors" element={<PatientDoctors />} />
          <Route path="doctors/:id" element={<PatientDoctorProfile />} />
          <Route path="appointments" element={<PatientAppointments />} />
          <Route path="appointments/:appointmentId" element={<PatientAppointments />} />
          <Route path="appointments/book" element={<PatientBookAppointment />} />
          <Route path="appointments/book/:doctorId" element={<PatientBookAppointment />} />
          {/* ADDED: Missing routes that other components navigate to */}
          <Route path="book-appointment/:doctorId" element={<PatientBookAppointment />} />
          <Route path="book/:doctorId" element={<PatientBookAppointment />} />
          <Route path="symptom-checker" element={<PatientSymptomChecker />} />
          <Route path="health-records" element={<PatientHealthRecords />} />
          <Route path="medicines" element={<PatientMedicines />} />
          <Route path="chatbot" element={<PatientChatbot />} />
          <Route path="emergency" element={<PatientEmergency />} />
          <Route path="notifications" element={<PatientNotifications />} />
          <Route path="profile" element={<PatientProfile />} />
          <Route path="settings" element={<PatientSettings />} />
        </Route>

        {/* Patient Consultation Room (full screen, outside PatientLayout) */}
        <Route
          path="/patient/consultation/:consultationId"
          element={
            <ProtectedRoute allowedRoles={['patient']}>
              <Suspense fallback={<PageLoading />}>
                <ConsultationLayout>
                  <PatientConsultationRoom />
                </ConsultationLayout>
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* ============================== */}
        {/* DOCTOR ROUTES                  */}
        {/* ============================== */}
        <Route path="/doctor" element={<DoctorRoutes />}>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<DoctorHome />} />
          <Route path="queue" element={<DoctorQueueManagement />} />
          <Route path="appointments" element={<DoctorAppointments />} />
          <Route path="patients" element={<DoctorPatientRecords />} />
          <Route path="patients/:patientId" element={<DoctorPatientRecords />} />
          <Route path="consultations" element={<DoctorConsultations />} />
          <Route path="prescriptions" element={<DoctorPrescriptions />} />
          <Route path="schedule" element={<DoctorSchedule />} />
          <Route path="notifications" element={<DoctorNotifications />} />
          <Route path="profile" element={<DoctorProfile />} />
          <Route path="settings" element={<DoctorSettings />} />
        </Route>

        {/* Doctor Consultation Room (full screen, outside DoctorLayout) */}
        <Route
          path="/doctor/consultation/:consultationId"
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <Suspense fallback={<PageLoading />}>
                <ConsultationLayout>
                  <DoctorConsultationRoom />
                </ConsultationLayout>
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* ============================== */}
        {/* REDIRECTS & FALLBACK           */}
        {/* ============================== */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/register" element={<Navigate to="/register/patient" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
};

export default App;