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
    // If we hit an access control gate natively
    console.error('Admin Guard strictly rejected access. You lack @Roles(UserRole.ADMIN) permission.');
    // In production: window.location.href = '/login';
    throw new Error('Access denied by backend guard.');
  }

  return response;
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}/api/v1${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const response = await fetchWithAdminGuard(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};
