import axios from 'axios';

const backendUrl = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');

// Create Axios instance pointing to Nabdah Backend Admin APIs
export const AdminApi = axios.create({
  baseURL: backendUrl ? `${backendUrl}/api/v1/admin` : '/api/v1/admin',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to add auth token
AdminApi.interceptors.request.use(config => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const AdminServices = {
  // Real-time Analytics Dashboard
  getDashboardStats: async () => {
    const res = await AdminApi.get('/stats');
    return res.data;
  },
  
  // Users Management
  getUsers: async (page = 1) => {
    const res = await AdminApi.get(`/users?page=${page}`);
    return res.data;
  },
  banUser: async (userId, reason) => {
    const res = await AdminApi.post(`/users/${userId}/ban`, { reason });
    return res.data;
  },

  // Providers Management
  getProviders: async (status = 'pending') => {
    const res = await AdminApi.get(`/providers?status=${status}`);
    return res.data;
  },
  approveProvider: async (providerId) => {
    const res = await AdminApi.post(`/approve/${providerId}`);
    return res.data;
  },
  rejectProvider: async (providerId) => {
    const res = await AdminApi.post(`/suspend/${providerId}`);
    return res.data;
  },

  // Delta Audit Guard (Settings / Pricing Changes)
  getProviderDeltas: async () => {
    const res = await AdminApi.post(`/provider-deltas`);
    return res.data;
  },
  approveDelta: async (deltaId) => {
    const res = await AdminApi.post(`/provider-deltas/${deltaId}/approve`);
    return res.data;
  },
  rejectDelta: async (deltaId) => {
    const res = await AdminApi.post(`/provider-deltas/${deltaId}/reject`);
    return res.data;
  }
};
