import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jwtDecode from 'jwt-decode';
import api from '../services/api';
import { 
  getToken, 
  setToken, 
  removeToken, 
  getUserRole, 
  setUserRole, 
  removeUserRole,
  getUserData,
  setUserData,
  removeUserData 
} from '../hooks/storage';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = getToken();
    if (token) {
      try {
        // Decode the token to get user info
        const decoded = jwtDecode(token);
        const userRole = getUserRole();
        const storedUserData = getUserData();

        // Set user state from decoded token when possible
        setUser({
          id: decoded.sub || decoded.id,
          email: decoded.email,
          role: userRole || decoded.role,
          name: decoded.name || storedUserData?.name || 'User'
        });

        // Set default Authorization header for all requests
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      } catch (error) {
        // Token may be non-JWT (mock token) or corrupted. Try to recover from stored user data.
        console.warn('Token decode failed, falling back to stored user data:', error);
        const storedUserData = getUserData();
        const userRole = getUserRole();

        if (storedUserData) {
          setUser({
            id: storedUserData.id,
            email: storedUserData.email,
            role: userRole || storedUserData.role,
            name: storedUserData.name || 'User'
          });
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
          // No recoverable data — clear state
          logout();
        }
      }
    }
    setLoading(false);
  };

  const login = async (email, password, role) => {
    try {
      // In production, replace with actual API call
      // const response = await api.post('/auth/login', { email, password, role });
      
      // Mock API response for demo
      const mockResponse = {
        data: {
          token: 'mock-jwt-token-for-demo-' + Date.now(),
          user: {
            id: Date.now(),
            email: email,
            name: email.split('@')[0],
            role: role
          }
        }
      };
      
      const { token, user: userData } = mockResponse.data;
      
      // Store token and user data
      setToken(token);
      setUserRole(role);
      setUserData(userData);
      
      // Set user state
      setUser({
        id: userData.id,
        email: userData.email,
        role: role,
        name: userData.name
      });
      
      // Set default Authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Store user data in localStorage for persistence
      localStorage.setItem('mediconnect_user', JSON.stringify({
        id: userData.id,
        email: userData.email,
        role: role,
        name: userData.name
      }));
      
      // Redirect based on role
      if (role === 'patient') {
        navigate('/patient-dashboard');
      } else if (role === 'doctor') {
        navigate('/doctor-dashboard');
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed. Please try again.' 
      };
    }
  };

  const register = async (userData) => {
    try {
      // In production, replace with actual API call
      // const response = await api.post('/auth/register', userData);
      
      // Mock API response for demo
      const mockResponse = {
        data: {
          token: 'mock-jwt-token-for-register-' + Date.now(),
          user: {
            id: Date.now(),
            email: userData.email,
            name: userData.name,
            role: userData.role
          }
        }
      };
      
      const { token, user: registeredUser } = mockResponse.data;
      
      // Store token and user data
      setToken(token);
      setUserRole(userData.role);
      setUserData(registeredUser);
      
      // Set user state
      setUser({
        id: registeredUser.id,
        email: registeredUser.email,
        role: userData.role,
        name: registeredUser.name
      });
      
      // Set default Authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Store user data in localStorage for persistence
      localStorage.setItem('mediconnect_user', JSON.stringify({
        id: registeredUser.id,
        email: registeredUser.email,
        role: userData.role,
        name: registeredUser.name
      }));
      
      // Redirect based on role
      if (userData.role === 'patient') {
        navigate('/patient-dashboard');
      } else if (userData.role === 'doctor') {
        navigate('/doctor-dashboard');
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed. Please try again.' 
      };
    }
  };

  const logout = () => {
    // Remove all stored data
    removeToken();
    removeUserRole();
    removeUserData();
    
    // Clear user state
    setUser(null);
    
    // Remove Authorization header
    delete api.defaults.headers.common['Authorization'];
    
    // Clear localStorage
    localStorage.removeItem('mediconnect_user');
    
    // Redirect to login page
    navigate('/login');
  };

  const updateUserProfile = (updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
    // Also update in localStorage
    const currentUser = JSON.parse(localStorage.getItem('mediconnect_user') || '{}');
    localStorage.setItem('mediconnect_user', JSON.stringify({ ...currentUser, ...updatedData }));
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    updateUserProfile,
    isAuthenticated: !!user,
    isPatient: user?.role === 'patient',
    isDoctor: user?.role === 'doctor'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};