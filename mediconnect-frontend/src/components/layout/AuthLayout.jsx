import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';
import { LanguageSwitcher, Toast } from '../common';
import useAuth from '../../hooks/useAuth';
import useLanguage from '../../hooks/useLanguage';

/**
 * Layout wrapper for authentication pages (login, register)
 */
const AuthLayout = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isDoctor, isPatient } = useAuth();
  const { t } = useLanguage();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (isDoctor) {
        navigate('/doctor/home', { replace: true });
      } else if (isPatient) {
        navigate('/patient/home', { replace: true });
      }
    }
  }, [isAuthenticated, isDoctor, isPatient, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Toast notifications */}
      <Toast />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-200">
              <Stethoscope size={24} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-xl text-gray-900">
                {t('common.appName')}
              </h1>
              <p className="text-xs text-gray-500">
                {t('common.tagline')}
              </p>
            </div>
          </div>

          {/* Language switcher */}
          <LanguageSwitcher variant="dropdown" size="sm" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex items-center justify-center min-h-screen pt-16 pb-8 px-4">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      {/* Decorative elements */}
      <div className="fixed top-0 right-0 w-64 h-64 bg-primary-200 rounded-full opacity-20 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-secondary-200 rounded-full opacity-20 blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-4 text-center">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} {t('common.appName')}. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default AuthLayout;