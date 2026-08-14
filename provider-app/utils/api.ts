import * as SecureStore from 'expo-secure-store';

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  // In a production app, we get this from a secure auth context.
  // For zero-placeholder execution, we actually fetch it from storage.
  const token = await SecureStore.getItemAsync('userToken');
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
