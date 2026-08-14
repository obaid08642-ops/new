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

export const getAdminApiBase = (): string => {
  const configuredBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!configuredBase) throw new Error('NEXT_PUBLIC_API_URL must be configured for the admin application.');
  if (configuredBase.includes('localhost') && process.env.NODE_ENV === 'production') {
    throw new Error('Localhost API URLs are forbidden in production.');
  }
  const base = configuredBase.replace(/\/+$/, '');
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const apiBase = getAdminApiBase();
  const url = endpoint.startsWith('http') ? endpoint : `${apiBase}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const response = await fetchWithAdminGuard(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};
