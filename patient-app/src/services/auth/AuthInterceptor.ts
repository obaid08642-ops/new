import { HttpInterceptor, HttpRequestConfig, HttpResponse, HttpError } from '../HttpClient';
import { secureGet } from '../../utils/security';
import { logger } from '../Logger';
import { AuthSession } from './types';

const log = logger.scope('AuthInterceptor');
const AUTH_SESSION_KEY = 'app_auth_session';

export const AuthInterceptor: HttpInterceptor = {
  onRequest: async (config) => {
    try {
      const sessionStr = await secureGet(AUTH_SESSION_KEY);
      if (sessionStr) {
        const session = JSON.parse(sessionStr) as AuthSession;
        if (session.accessToken) {
          return {
            ...config,
            headers: {
              ...config.headers,
              Authorization: `Bearer ${session.accessToken}`
            }
          };
        }
      }
    } catch (err) {
      log.error('Failed to get auth token', err);
    }
    return config;
  },
  
  onResponse: async <T>(response: HttpResponse<T>) => {
    return response;
  },

  onError: async (error: HttpError) => {
    // Basic 401 handling for Phase 1A
    // Phase 1C: Implement token refresh logic here
    if (error.status === 401) {
      log.warn('Unauthorized access, token might be expired');
      // e.g. trigger global logout event
    }
    throw error;
  }
};
