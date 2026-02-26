import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Toast } from '../common';
import useAuth from '../../hooks/useAuth';

/**
 * Layout wrapper for authentication pages (login, register)
 * Provides minimal shell - individual auth pages handle their own layout
 */
const AuthLayout = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isDoctor, isPatient, hasHydrated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (isAuthenticated) {
      if (isDoctor) {
        navigate('/doctor/home', { replace: true });
      } else if (isPatient) {
        navigate('/patient/home', { replace: true });
      }
    }
  }, [hasHydrated, isAuthenticated, isDoctor, isPatient, navigate]);

  return (
    <>
      {/* Toast notifications */}
      <Toast />

      {/* Auth pages render their own full layout */}
      <Outlet />
    </>
  );
};

export default AuthLayout;