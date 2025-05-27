import axios from 'axios';
import { getToken, getAuthHeader, clearToken } from './auth';

// Use VITE_API_URL for all environments (set in .env.frontend)
console.log("VITE_API_URL being used:", import.meta.env.VITE_API_URL);

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 60000 // 60 seconds
});

// Axios Request Interceptor for Auth
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    console.log("INTERCEPTOR - Attaching token:", token);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Axios Response Interceptor for Auth Errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper for error messages
const handleApiError = (error) => {
  console.error('API Error:', error);
  let errorMessage = 'An unexpected error occurred';
  if (error.response) {
    const data = error.response.data;
    if (error.response.status === 401) {
      errorMessage = 'Incorrect username or password. Please try again.';
    } else if (error.response.status === 500) {
      errorMessage = 'Server error. Please try again in a few moments.';
    } else if (error.response.status === 404) {
      errorMessage = 'The requested resource was not found.';
    } else if (error.response.status === 403) {
      errorMessage = 'You do not have permission to access this resource.';
    } else {
      errorMessage = data.detail || data.message || `Error: ${error.response.status}`;
    }
    console.log('Error response data:', data);
  } else if (error.request) {
    errorMessage = 'No response from server. Please check your connection.';
  }
  throw new Error(errorMessage);
};

// --- Auth APIs ---
export const loginUser = async (username, password) => {
  try {
    const response = await api.post('/auth/login', { username, password });
    if (response.data && response.data.access_token) {
      localStorage.setItem('probeops_token', response.data.access_token);
    }
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const registerUser = async (username, email, password) => {
  try {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// --- User Profile APIs ---
export const getUserProfile = async () => {
  try {
    const response = await api.get('/api/users/me');
    return response.data;
  } catch (error) {
    // Try fallback if main endpoint fails
    try {
      const altResponse = await api.get('/user');
      return altResponse.data;
    } catch (e) {
      return handleApiError(error);
    }
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const response = await api.put('/api/users/me', profileData);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await api.post('/api/users/me/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const resendVerificationEmail = async () => {
  try {
    const response = await api.post('/api/users/me/resend-verification');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const logoutAllDevices = async () => {
  try {
    const response = await api.post('/api/users/me/logout-all');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// --- Diagnostic APIs 
export const runDiagnostic = async (tool, params = {}) => {
  try {
    const response = await api.post("/diagnostics/run", {
      tool,   // string, like 'ping'
      params  // object, e.g. { target: "google.com", count: 4 }
    });
    return response.data;
  } catch (error) {
    return {
      tool,
      target: params.target || '',
      created_at: new Date().toISOString(),
      execution_time: 0,
      status: 'failure',
      result: `Error: ${error.message || 'An unknown error occurred'}`
    };
  }
};

export const getDiagnosticHistory = async (params = {}) => {
  try {
    const response = await api.get('/diagnostics/history', { params });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return [];
    }
    return handleApiError(error);
  }
};

// --- API Key APIs ---
export const getApiKeys = async () => {
  try {
    const response = await api.get('/keys');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const createApiKey = async (data) => {
  try {
    const response = await api.post('/keys/', {
      name: data.name,
      expires_days: data.expires_days
    }, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const deleteApiKey = async (keyId) => {
  try {
    const response = await api.delete(`/keys/${keyId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const deactivateApiKey = async (keyId) => {
  try {
    const response = await api.put(`/keys/${keyId}/deactivate`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const activateApiKey = async (keyId) => {
  try {
    // Add this log to see what token/header will be sent
    console.log("DEBUG - Token in getAuthHeader before activate:", getAuthHeader());

    const response = await api.put(`/keys/${keyId}/activate`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// --- Scheduled Probes APIs ---

export const getProbeResults = async (jobId) => {
  try {
    const response = await api.get(`/job-result/${jobId}`);
    return response.data;
  } catch (error) {
    // Use your central error handler if available
    if (error.response && error.response.status === 404) {
      return null; // Not found
    }
    throw error;
  }
};

// --- Scheduled Probes APIs ---
// All use the correct prefix: /scheduled_probes/

export const getScheduledProbes = async () => {
  try {
    const response = await api.get('/scheduled_probes/');
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return [];
    }
    return handleApiError(error);
  }
};

export const createScheduledProbe = async (data) => {
  try {
    const response = await api.post('/scheduled_probes/', data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const updateScheduledProbe = async (id, data) => {
  try {
    const response = await api.put(`/scheduled_probes/${id}`, data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const deleteScheduledProbe = async (id) => {
  try {
    const response = await api.delete(`/scheduled_probes/${id}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Unified pause/resume toggle
export const toggleScheduledProbe = async (id) => {
  try {
    const response = await api.post(`/scheduled_probes/${id}/toggle`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

  export default api;
