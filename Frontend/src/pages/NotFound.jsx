import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const homePath = !isAuthenticated
    ? '/'
    : user?.role === 'doctor'
    ? '/doctor/home'
    : '/patient/home';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-gray-200 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Page Not Found
        </h1>
        <p className="text-gray-600 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 
              font-medium flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </button>
          <button
            onClick={() => navigate(homePath)}
            className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 
              font-medium flex items-center justify-center transition-colors"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(NotFound);