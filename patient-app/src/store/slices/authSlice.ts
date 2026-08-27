import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types';

// ---------------------------------------------------------------------------
// Auth state – supports session persistence, guest mode, token refresh,
// and login attempt tracking (rate limiting).
// ---------------------------------------------------------------------------
interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  tokenExpiry: number | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  loginAttempts: number;
  lockoutUntil: number | null;
  deviceId: string | null;
  biometricEnabled: boolean;
  sessionStartedAt: number | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  tokenExpiry: null,
  isAuthenticated: false,
  isGuest: false,
  isLoading: false,
  error: null,
  loginAttempts: 0,
  lockoutUntil: null,
  deviceId: null,
  biometricEnabled: false,
  sessionStartedAt: null,
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    loginSuccess: (
      state,
      action: PayloadAction<{
        user: User;
        token: string;
        refreshToken?: string;
        expiresIn?: number;
      }>,
    ) => {
      const { user, token, refreshToken, expiresIn } = action.payload;
      state.user = user;
      state.token = token;
      state.refreshToken = refreshToken ?? null;
      state.tokenExpiry = expiresIn
        ? Date.now() + expiresIn * 1000
        : null;
      state.isAuthenticated = true;
      state.isGuest = false;
      state.isLoading = false;
      state.error = null;
      state.loginAttempts = 0;
      state.lockoutUntil = null;
      state.sessionStartedAt = Date.now();
    },

    guestLogin: (
      state,
      action: PayloadAction<{ user: User; token: string }>,
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isGuest = true;
      state.isLoading = false;
      state.sessionStartedAt = Date.now();
    },

    offlineUnauthenticated: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.tokenExpiry = null;
      state.isAuthenticated = false;
      state.isGuest = false;
      state.isLoading = false;
      state.error = 'offline_unauthenticated';
      state.sessionStartedAt = null;
    },

    refreshTokenSuccess: (
      state,
      action: PayloadAction<{
        token: string;
        refreshToken?: string;
        expiresIn?: number;
      }>,
    ) => {
      state.token = action.payload.token;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
      state.tokenExpiry = action.payload.expiresIn
        ? Date.now() + action.payload.expiresIn * 1000
        : state.tokenExpiry;
    },

    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.tokenExpiry = null;
      state.isAuthenticated = false;
      state.isGuest = false;
      state.sessionStartedAt = null;
    },

    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    // Rate limiting
    incrementLoginAttempts: (state) => {
      state.loginAttempts += 1;
      if (state.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        state.lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
      }
    },

    resetLoginAttempts: (state) => {
      state.loginAttempts = 0;
      state.lockoutUntil = null;
    },

    // Device binding
    setDeviceId: (state, action: PayloadAction<string>) => {
      state.deviceId = action.payload;
    },

    // Biometric
    setBiometricEnabled: (state, action: PayloadAction<boolean>) => {
      state.biometricEnabled = action.payload;
    },
  },
});

export const {
  setLoading,
  loginSuccess,
  guestLogin,
  offlineUnauthenticated,
  refreshTokenSuccess,
  logout,
  updateUser,
  setError,
  clearError,
  incrementLoginAttempts,
  resetLoginAttempts,
  setDeviceId,
  setBiometricEnabled,
} = authSlice.actions;

export default authSlice.reducer;
