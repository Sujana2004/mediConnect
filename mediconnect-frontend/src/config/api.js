import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const resolveRequestLanguage = () => {
  try {
    const persistedLanguage = localStorage.getItem('language-storage');
    if (persistedLanguage) {
      const parsed = JSON.parse(persistedLanguage);
      const storeLanguage = parsed?.state?.currentLanguage;
      if (storeLanguage) {
        return storeLanguage;
      }
    }
  } catch {
    // ignore malformed persisted language data
  }

  const i18nextLanguage = localStorage.getItem('i18nextLng');
  if (i18nextLanguage) {
    return i18nextLanguage;
  }

  const legacyLanguage = localStorage.getItem('language');
  if (legacyLanguage) {
    return legacyLanguage;
  }

  return 'en';
};

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add language header
    const language = resolveRequestLanguage();
    config.headers['Accept-Language'] = language;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors & token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken
          });

          const { access } = response.data;
          
          localStorage.setItem('accessToken', access);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed - clear everything and redirect
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage'); // Clear Zustand persisted state
        
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          // Validation error
          if (data.detail) {
            toast.error(data.detail);
          } else if (typeof data === 'object') {
            const firstError = Object.values(data)[0];
            if (Array.isArray(firstError)) {
              toast.error(firstError[0]);
            } else {
              toast.error(firstError);
            }
          }
          break;
        case 403:
          toast.error('You do not have permission to perform this action');
          break;
        case 404:
          toast.error('Resource not found');
          break;
        case 500:
          toast.error('Server error. Please try again later');
          break;
        default:
          toast.error(data.detail || 'Something went wrong');
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection');
    }

    return Promise.reject(error);
  }
);

// API helper methods
export const apiHelpers = {
  // GET request
  get: async (url, params = {}) => {
    const response = await api.get(url, { params });
    return response.data;
  },

  // POST request
  post: async (url, data = {}) => {
    const response = await api.post(url, data);
    return response.data;
  },

  // PUT request
  put: async (url, data = {}) => {
    const response = await api.put(url, data);
    return response.data;
  },

  // PATCH request
  patch: async (url, data = {}) => {
    const response = await api.patch(url, data);
    return response.data;
  },

  // DELETE request
  delete: async (url) => {
    const response = await api.delete(url);
    return response.data;
  },

  // Upload file
  upload: async (url, formData, onProgress) => {
    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },
};

// Set auth tokens
export const setAuthTokens = (accessToken, refreshToken) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

// Clear auth tokens
export const clearAuthTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!localStorage.getItem('accessToken');
};

export default api;