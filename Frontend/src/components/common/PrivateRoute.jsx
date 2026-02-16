// src/components/common/PrivateRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loader from './Loader';

/**
 * PrivateRoute Component
 * Protects routes that require authentication
 * 
 * @param {object} props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {string[]} props.allowedRoles - Allowed user roles (optional)
 * @param {boolean} props.requireVerification - Require doctor verification (default: true for doctors)
 * 
 * @example
 * <PrivateRoute allowedRoles={['patient']}>
 *   <PatientDashboard />
 * </PrivateRoute>
 */
const PrivateRoute = ({ 
  children, 
  allowedRoles = null,
  requireVerification = true 
}) => {
  const auth = useAuth();
  const location = useLocation();
  
  console.log('[PrivateRoute] auth object:', auth);
  console.log('[PrivateRoute] Full state:', {
    loading: auth?.loading,
    isAuthenticated: auth?.isAuthenticated,
    user: auth?.user,
    targetPath: location.pathname
  });

  // Check if useAuth is returning anything
  if (!auth) {
    alert('ERROR: useAuth() returned null/undefined! Check AuthProvider wrapping.');
    return <div>Auth Error - Check Console</div>;
  }

  const { user, loading, isAuthenticated, isDoctorVerified } = auth;

  // Show loader while checking authentication
  if (loading) {
    console.log('[PrivateRoute] Still loading...');
    return <Loader />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    console.log('[PrivateRoute] NOT AUTHENTICATED - Redirecting to login');
    console.log('[PrivateRoute] isAuthenticated:', isAuthenticated);
    console.log('[PrivateRoute] user:', user);
    
    // Uncomment this alert to pause and see what's happening
    alert(`Not authenticated! isAuthenticated=${isAuthenticated}, user=${JSON.stringify(user)}`);
    return (
      <Navigate 
        to="/login" 
        state={{ from: location.pathname }}
        replace 
      />
    );
  }

  // Check role-based access
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on user's actual role
    const redirectPath = user.role === 'patient' 
      ? '/patient/home' 
      : user.role === 'doctor' 
        ? '/doctor/home'
        : '/';
    
    return <Navigate to={redirectPath} replace />;
  }

  // Check doctor verification status
  if (
    requireVerification && 
    user.role === 'doctor' && 
    !isDoctorVerified
  ) {
    return <Navigate to="/doctor/verification-pending" replace />;
  }

  // Render protected content
  return children;
};

export default PrivateRoute;