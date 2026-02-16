// src/App.jsx
import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layouts
import {
  AuthLayout,
  PatientLayout,
  DoctorLayout,
  ConsultationLayout,
  ErrorBoundary
} from './components/layout';

// Common components
import { Loader } from './components/common';

// Hooks
import useAuth from './hooks/useAuth';

// Auth Pages (eager load for faster initial experience)
import { Login, PatientRegister, DoctorRegister } from './pages/auth';


// Lazy load Patient Pages
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

// Lazy load Doctor Pages
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

// Create React Query client
// NOTE: This is moved to main.jsx and passed via context
// Removed duplicate QueryClient creation here

/**
 * Loading fallback component
 */
const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <Loader size="lg" text="Loading..." />
  </div>
);

/**
 * Protected Route wrapper - Requires authentication
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return <PageLoading />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
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
 * Public Route wrapper - Redirects authenticated users to dashboard
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    // Redirect to appropriate dashboard
    if (user.role === 'doctor') {
      return <Navigate to="/doctor/home" replace />;
    }
    return <Navigate to="/patient/home" replace />;
  }

  return children || <Outlet />;
};

/**
 * Patient Routes wrapper
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
 * Doctor Routes wrapper
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
 * Main App Component
 */
const App = () => {
  // Set up language direction on mount
  useEffect(() => {
    const language = localStorage.getItem('language') || 'en';
    document.documentElement.lang = language;
    document.body.setAttribute('data-lang', language);
  }, []);

  return (
    <ErrorBoundary>
      {/* Toast notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '10px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Routes */}
      <Routes>
              {/* ================== */}
              {/* PUBLIC ROUTES */}
              {/* ================== */}
              
              {/* Auth Routes */}
              <Route element={<PublicRoute><AuthLayout /></PublicRoute>}>
                <Route path="/login" element={<Login />} />
                <Route path="/register/patient" element={<PatientRegister />} />
                <Route path="/register/doctor" element={<DoctorRegister />} />
              </Route>

              {/* ================== */}
              {/* PATIENT ROUTES */}
              {/* ================== */}
              
              <Route path="/patient" element={<PatientRoutes />}>
                <Route index element={<Navigate to="home" replace />} />
                <Route path="home" element={<PatientHome />} />
                <Route path="doctors" element={<PatientDoctors />} />
                <Route path="doctors/:doctorId" element={<PatientDoctorProfile />} />
                <Route path="appointments" element={<PatientAppointments />} />
                <Route path="appointments/book" element={<PatientBookAppointment />} />
                <Route path="appointments/book/:doctorId" element={<PatientBookAppointment />} />
                <Route path="symptom-checker" element={<PatientSymptomChecker />} />
                <Route path="health-records" element={<PatientHealthRecords />} />
                <Route path="medicines" element={<PatientMedicines />} />
                <Route path="chatbot" element={<PatientChatbot />} />
                <Route path="emergency" element={<PatientEmergency />} />
                <Route path="notifications" element={<PatientNotifications />} />
                <Route path="profile" element={<PatientProfile />} />
              </Route>

              {/* Patient Consultation Room (full screen, outside layout) */}
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

              {/* ================== */}
              {/* DOCTOR ROUTES */}
              {/* ================== */}
              
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
              </Route>

              {/* Doctor Consultation Room (full screen, outside layout) */}
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

              {/* ================== */}
              {/* REDIRECTS & FALLBACK */}
              {/* ================== */}
              
              {/* Root redirect */}
              <Route path="/" element={<RootRedirect />} />

              {/* Legacy /register redirect */}
              <Route path="/register" element={<Navigate to="/register/patient" replace />} />

              {/* 404 - Not Found */}
              <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
};

/**
 * Root redirect component
 */
const RootRedirect = () => {
  const { isAuthenticated, user } = useAuth();

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
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a
          href={redirectPath}
          className="inline-flex items-center justify-center mt-6 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Go to {isAuthenticated ? 'Dashboard' : 'Login'}
        </a>
      </div>
    </div>
  );
};

export default App;