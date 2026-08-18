export const fetchWithAdminGuard = async (url: string, options: RequestInit = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    console.error('Admin Guard rejected access. The backend remains the authorization authority.');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_role');
      window.location.assign('/login');
    }
    throw new Error('Access denied by backend guard.');
  }

  return response;
};

export const adminApiBase = (): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (!baseUrl && typeof window !== 'undefined') {
    throw new Error('Admin API is not configured. Set NEXT_PUBLIC_API_URL before serving this build.');
  }
  return baseUrl || '';
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const API_BASE = adminApiBase();
  if (!endpoint.startsWith('http') && !API_BASE) {
    throw new Error('Admin API is not configured. Set NEXT_PUBLIC_API_URL before serving this build.');
  }
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}/api/v1${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const response = await fetchWithAdminGuard(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};
