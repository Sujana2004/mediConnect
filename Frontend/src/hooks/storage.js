export const getToken = () => {
  return localStorage.getItem('mediconnect_token');
};

export const setToken = (token) => {
  localStorage.setItem('mediconnect_token', token);
};

export const removeToken = () => {
  localStorage.removeItem('mediconnect_token');
};

export const getUserRole = () => {
  return localStorage.getItem('mediconnect_role');
};

export const setUserRole = (role) => {
  localStorage.setItem('mediconnect_role', role);
};

export const removeUserRole = () => {
  localStorage.removeItem('mediconnect_role');
};

export const getUserData = () => {
  const data = localStorage.getItem('mediconnect_user');
  return data ? JSON.parse(data) : null;
};

export const setUserData = (user) => {
  localStorage.setItem('mediconnect_user', JSON.stringify(user));
};

export const removeUserData = () => {
  localStorage.removeItem('mediconnect_user');
};

export const clearStorage = () => {
  removeToken();
  removeRefreshToken();
  removeUserRole();
  removeUserData();
};

// Auth flow: onboarding completed (first-time users)
const ONBOARDING_KEY = 'mediconnect_onboarding_completed';
export const getOnboardingCompleted = () => localStorage.getItem(ONBOARDING_KEY) === 'true';
export const setOnboardingCompleted = (value) => {
  if (value) localStorage.setItem(ONBOARDING_KEY, 'true');
  else localStorage.removeItem(ONBOARDING_KEY);
};

// Optional: access/refresh tokens (spec)
export const getRefreshToken = () => localStorage.getItem('mediconnect_refresh_token');
export const setRefreshToken = (token) => {
  if (token) localStorage.setItem('mediconnect_refresh_token', token);
  else localStorage.removeItem('mediconnect_refresh_token');
};
export const removeRefreshToken = () => localStorage.removeItem('mediconnect_refresh_token');