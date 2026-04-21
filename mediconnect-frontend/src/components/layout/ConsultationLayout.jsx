import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Toast } from '../common';
import useAuth from '../../hooks/useAuth';

/**
 * Layout wrapper for consultation/video call pages
 * Minimal layout without navigation for focused experience
 */
const ConsultationLayout = ({ children }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Prevent accidental navigation during consultation
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Toast notifications */}
      <Toast />

      {/* Full screen consultation content */}
      <main className="h-screen">
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default ConsultationLayout;