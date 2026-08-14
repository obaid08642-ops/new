import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';

import { Platform } from 'react-native';
import Constants from 'expo-constants';

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8002/api/v1';
const rawFastApiUrl = process.env.EXPO_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000/api';

const getCleanUrl = (url: string) => {
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const parts = hostUri.split(':');
      if (parts[0]) {
        return url.replace('localhost', parts[0]).replace('127.0.0.1', parts[0]);
      }
    }
    if (Platform.OS === 'android') {
      return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
    }
  }
  return url;
};

export const BASE_URL = getCleanUrl(rawBaseUrl);
export const FASTAPI_BASE_URL = getCleanUrl(rawFastApiUrl);
export const R2_PUBLIC_URL = process.env.EXPO_PUBLIC_CDN_URL || 'https://pub-8fac6a8c9296b585e3a5f71a1a2baa89.r2.dev';

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch {
      return null;
    }
  }
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'api_error';
    try {
      const errData = await response.json();
      errorMsg = errData.message || errorMsg;
    } catch {}
    
    // Handle missing/invalid token or auth error
    if (errorMsg.toLowerCase().includes('missing token') || response.status === 401 || response.status === 403) {
      console.warn(`[apiFetch] Auth error for endpoint: ${endpoint}`);
      try {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
        await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      } catch {}
      throw new Error(`AUTH_ERROR_${response.status}: ${errorMsg}`);
    }
    throw new Error(errorMsg);
  }

  try {
    return await response.json();
  } catch {
    return { ok: true } as unknown as T;
  }
}
