// src/apiClient.js
import axios from 'axios';

// Determine appropriate baseURL:
const getBaseURL = () => {
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  return isLocalhost
    ? 'http://localhost:3001/api'
    : `${window.location.origin}/api`;
};

// Create axios instance with dynamic baseURL
const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach auth token automatically
const getToken = () =>
  localStorage.getItem('token') || sessionStorage.getItem('token');

apiClient.interceptors.request.use(
  config => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  error => Promise.reject(error)
);

// Handle auth failures globally
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    } else if (!error.response) {
      console.error('🛑 Network error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
