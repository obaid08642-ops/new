import axios from 'axios';

const backendUrl = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');
const api = axios.create({
  baseURL: backendUrl ? `${backendUrl}/api/v1` : '/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nabdah_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('nabdah_admin_token');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;
