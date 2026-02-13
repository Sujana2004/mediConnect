import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jwtDecode from 'jwt-decode';
import api from '../services/api';
import { 
  getToken, 
  setToken, 
  setRefreshToken,
  removeRefreshToken,
  removeToken, 
  getUserRole, 
  setUserRole, 
  removeUserRole,
  getUserData,
  setUserData,
  removeUserData,
  setOnboardingCompleted
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
    removeToken();
    removeRefreshToken();
    removeUserRole();
    removeUserData();
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('mediconnect_user');
    navigate('/');
  };

  /** Normalize Indian phone to 10 digits (strip +91 or leading 91). */
  const normalizePhoneTo10 = (phone) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return digits;
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    return digits;
  };

  /** Send OTP to phone (mock or real API). Uses short timeout so UI doesn't hang when backend is down. */
  const sendOtp = async (phone) => {
    const normalized = normalizePhoneTo10(phone);
    if (normalized.length !== 10 || !/^[6-9]\d{9}$/.test(normalized)) return { success: false, error: 'Invalid phone number' };
    try {
      const res = await api.post('/v1/auth/login/', { phone: `+91${normalized}` }, { timeout: 8000 }).catch(() => null);
      if (res?.data) return { success: true, message: res.data.message || 'OTP sent' };
      // No server response (e.g. backend down) — allow flow to continue; OTP verify will use demo
      return { success: true, message: 'OTP sent' };
    } catch (e) {
      return { success: false, error: e.response?.data?.message || e.message || 'Failed to send OTP. Check connection.' };
    }
  };

  /** Verify OTP and return whether user exists or needs registration */
  const verifyOtp = async (phone, otp, firebaseToken) => {
    const normalized = normalizePhoneTo10(phone);
    if (normalized.length !== 10 || !/^\d{6}$/.test(otp)) return { success: false, error: 'Invalid OTP' };
    try {
      const payload = { phone: `+91${normalized}`, otp, firebase_token: firebaseToken || 'mock' };
      const res = await api.post('/v1/auth/verify-otp/', payload).catch(() => null);
      if (res?.data?.success) {
        if (res.data.requires_registration) return { success: true, requiresRegistration: true };
        const { user: u, tokens: t } = res.data;
        if (t?.access) setToken(t.access);
        if (t?.refresh) setRefreshToken(t.refresh);
        if (u) {
          setUserRole(u.role || 'patient');
          setUserData(u);
          setUser({ id: u.id, email: u.email, phone: u.phone, role: u.role, name: u.first_name || u.name });
          api.defaults.headers.common['Authorization'] = `Bearer ${t?.access}`;
          navigate(u.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard');
        }
        return { success: true, requiresRegistration: false };
      }
      // Demo: when API unavailable, treat as new user and require registration
      return { success: true, requiresRegistration: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.message || 'Invalid OTP' };
    }
  };

  /** Register patient after OTP (phone already verified) */
  const registerPatient = async (data) => {
    try {
      const phone = data.phone || localStorage.getItem('mediconnect_pending_phone');
      const res = await api.post('/v1/auth/register/patient/', { ...data, phone }).catch(() => null);
      if (res?.data?.success && res.data.user) {
        const { user: u, tokens: t } = res.data;
        if (t?.access) setToken(t.access);
        if (t?.refresh) setRefreshToken(t.refresh);
        setUserRole('patient');
        setUserData(u);
        setUser({ id: u.id, email: u.email, phone: u.phone, role: 'patient', name: u.first_name || u.name });
        api.defaults.headers.common['Authorization'] = `Bearer ${t?.access}`;
        localStorage.removeItem('mediconnect_pending_phone');
        navigate('/patient-dashboard');
        return { success: true };
      }
      // Demo: when API unavailable, create mock user and log in
      const mockUser = { id: 'mock-' + Date.now(), phone, role: 'patient', first_name: data.first_name || 'Patient', email: '' };
      const mockToken = 'mock-patient-' + Date.now();
      setToken(mockToken);
      setUserRole('patient');
      setUserData(mockUser);
      setUser({ id: mockUser.id, phone: mockUser.phone, role: 'patient', name: mockUser.first_name });
      api.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
      localStorage.removeItem('mediconnect_pending_phone');
      navigate('/patient-dashboard');
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.message || 'Registration failed' };
    }
  };

  /** Register doctor (pending verification) */
  const registerDoctor = async (data) => {
    try {
      const phone = data.phone || localStorage.getItem('mediconnect_pending_phone');
      const res = await api.post('/v1/auth/register/doctor/', { ...data, phone }).catch(() => null);
      if (res?.data?.success) {
        const u = res.data.user;
        const status = res.data.verification_status || 'pending';
        if (u && res.data.tokens?.access) {
          setToken(res.data.tokens.access);
          setRefreshToken(res.data.tokens.refresh);
          setUserRole('doctor');
          setUserData({ ...u, verification_status: status });
          setUser({ id: u.id, role: 'doctor', name: u.first_name || u.name, verification_status: status });
          api.defaults.headers.common['Authorization'] = `Bearer ${res.data.tokens.access}`;
        }
        localStorage.removeItem('mediconnect_pending_phone');
        if (status !== 'pending') navigate('/doctor-dashboard');
        return { success: true, verificationStatus: status };
      }
      // Demo: when API unavailable, create mock doctor (pending verification); AuthFlow shows pending screen
      const mockUser = { id: 'mock-dr-' + Date.now(), phone, role: 'doctor', first_name: data.first_name || 'Doctor', verification_status: 'pending' };
      const mockToken = 'mock-doctor-' + Date.now();
      setToken(mockToken);
      setUserRole('doctor');
      setUserData(mockUser);
      setUser({ id: mockUser.id, role: 'doctor', name: mockUser.first_name, verification_status: 'pending' });
      api.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
      localStorage.removeItem('mediconnect_pending_phone');
      return { success: true, verificationStatus: 'pending' };
    } catch (e) {
      return { success: false, error: e.response?.data?.message || 'Registration failed' };
    }
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
    sendOtp,
    verifyOtp,
    registerPatient,
    registerDoctor,
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