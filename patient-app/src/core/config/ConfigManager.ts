/**
 * Config Manager — Single source of truth for all app configuration.
 * Environment-aware, Admin-overridable, no hardcoded values.
 *
 * Usage:
 *   import { config } from '@/core/config';
 *   config.apiBaseUrl     → current env's base URL
 *   config.timeout        → request timeout in ms
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Environment
// ─────────────────────────────────────────────────────────────────────────────
export type AppEnvironment = 'development' | 'staging' | 'production';

function detectEnvironment(): AppEnvironment {
  // 1. Explicit env var
  const explicitEnv = process.env.EXPO_PUBLIC_APP_ENV as AppEnvironment | undefined;
  if (explicitEnv && ['development', 'staging', 'production'].includes(explicitEnv)) {
    return explicitEnv;
  }
  // 2. EAS build profile
  const easEnv = Constants.expoConfig?.extra?.eas?.projectId ? 'production' : undefined;
  if (easEnv) return easEnv;
  // 3. Default
  return __DEV__ ? 'development' : 'production';
}

export const ENVIRONMENT: AppEnvironment = detectEnvironment();

// ─────────────────────────────────────────────────────────────────────────────
// Environment-specific values
// ─────────────────────────────────────────────────────────────────────────────
interface EnvConfig {
  apiBaseUrl: string;
  fastapiBaseUrl: string;
  socketUrl: string;
  cdnUrl: string;
  appEnv: AppEnvironment;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableCrashReporting: boolean;
  enableAnalytics: boolean;
}

const ENV_CONFIGS: Record<AppEnvironment, EnvConfig> = {
  development: {
    apiBaseUrl:         process.env.EXPO_PUBLIC_API_BASE_URL    ?? 'http://localhost:8002/api/v1',
    fastapiBaseUrl:     process.env.EXPO_PUBLIC_FASTAPI_BASE_URL ?? 'http://localhost:8000/api',
    socketUrl:          process.env.EXPO_PUBLIC_SOCKET_URL      ?? 'ws://localhost:8002',
    cdnUrl:             process.env.EXPO_PUBLIC_CDN_URL         ?? 'http://localhost:8002/media',
    appEnv:             'development',
    logLevel:           'debug',
    enableCrashReporting: false,
    enableAnalytics:    false,
  },
  staging: {
    apiBaseUrl:         process.env.EXPO_PUBLIC_API_BASE_URL    ?? 'https://staging-api.nabdahplus.com/api/v1',
    fastapiBaseUrl:     process.env.EXPO_PUBLIC_FASTAPI_BASE_URL ?? 'https://staging-fastapi.nabdahplus.com/api',
    socketUrl:          process.env.EXPO_PUBLIC_SOCKET_URL      ?? 'wss://staging-socket.nabdahplus.com',
    cdnUrl:             process.env.EXPO_PUBLIC_CDN_URL         ?? 'https://staging-cdn.nabdahplus.com',
    appEnv:             'staging',
    logLevel:           'info',
    enableCrashReporting: true,
    enableAnalytics:    false,
  },
  production: {
    apiBaseUrl:         process.env.EXPO_PUBLIC_API_BASE_URL    ?? 'https://api.nabdahplus.com/api/v1',
    fastapiBaseUrl:     process.env.EXPO_PUBLIC_FASTAPI_BASE_URL ?? 'https://fastapi.nabdahplus.com/api',
    socketUrl:          process.env.EXPO_PUBLIC_SOCKET_URL      ?? 'wss://socket.nabdahplus.com',
    cdnUrl:             process.env.EXPO_PUBLIC_CDN_URL         ?? 'https://cdn.nabdahplus.com',
    appEnv:             'production',
    logLevel:           'error',
    enableCrashReporting: true,
    enableAnalytics:    true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Localhost fix for Android emulator
// ─────────────────────────────────────────────────────────────────────────────
function resolveUrl(url: string): string {
  if (!url.includes('localhost') && !url.includes('127.0.0.1')) return url;
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) return url.replace('localhost', host).replace('127.0.0.1', host);
  }
  if (Platform.OS === 'android') {
    return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }
  return url;
}

// ─────────────────────────────────────────────────────────────────────────────
// App Config — all values in one place
// ─────────────────────────────────────────────────────────────────────────────
export interface AppConfig extends EnvConfig {
  // Identity
  appName:            string;
  appNameEn:          string;
  appVersion:         string;
  buildNumber:        string;
  bundleId:           string;
  platform:           'ios' | 'android' | 'web';

  // API
  apiVersion:         string;
  apiTimeout:         number;           // ms
  apiRetries:         number;
  apiCacheTtl:        number;           // ms

  // Auth
  tokenExpiryBuffer:  number;           // ms before expiry to refresh
  maxLoginAttempts:   number;
  lockoutDuration:    number;           // ms

  // Features
  googleMapsApiKey:   string;
  oneSignalAppId:     string;
  googleClientId:     string;
  googleIosClientId:  string;
  googleAndroidClientId: string;
  sentryDsn:          string;
  firebaseApiKey:     string;

  // Limits
  maxFileUploadMb:    number;
  maxImageDimension:  number;
  maxCacheItems:      number;
  offlineQueueMax:    number;

  // Pagination
  defaultPageSize:    number;
  maxPageSize:        number;

  // Cooldown (for guided tour)
  tourCooldownMs:     number;
  tourMaxCrashCount:  number;

  // Supported locales
  supportedLocales:   string[];
  defaultLocale:      string;
  rtlLocales:         string[];

  // Supported countries
  supportedCountries: string[];
  defaultCountry:     string;
  defaultCurrency:    string;
  defaultPhoneCode:   string;

  // Roles
  roles:              Record<string, string>;
}

const baseEnv = ENV_CONFIGS[ENVIRONMENT];

export const config: AppConfig = {
  // ── Environment ──────────────────────────────────────────────────────────
  ...baseEnv,
  apiBaseUrl:   resolveUrl(baseEnv.apiBaseUrl),
  fastapiBaseUrl: resolveUrl(baseEnv.fastapiBaseUrl),
  socketUrl:    resolveUrl(baseEnv.socketUrl),

  // ── Identity ─────────────────────────────────────────────────────────────
  appName:            'نبض بلس',
  appNameEn:          'Nabdah Plus',
  appVersion:         Constants.expoConfig?.version         ?? '1.0.0',
  buildNumber:        String(Constants.expoConfig?.ios?.buildNumber ?? '1'),
  bundleId:           Constants.expoConfig?.ios?.bundleIdentifier ?? 'com.nabdahplus.app',
  platform:           Platform.OS as 'ios' | 'android' | 'web',

  // ── API ──────────────────────────────────────────────────────────────────
  apiVersion:         'v1',
  apiTimeout:         Number(process.env.EXPO_PUBLIC_API_TIMEOUT ?? 10_000),
  apiRetries:         2,
  apiCacheTtl:        5 * 60 * 1000,         // 5 minutes

  // ── Auth ─────────────────────────────────────────────────────────────────
  tokenExpiryBuffer:  60 * 1000,             // 1 minute
  maxLoginAttempts:   5,
  lockoutDuration:    5 * 60 * 1000,         // 5 minutes

  // ── External Keys (from .env — never hardcoded) ───────────────────────
  googleMapsApiKey:         process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY       ?? '',
  oneSignalAppId:           process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID          ?? '',
  googleClientId:           process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID          ?? '',
  googleIosClientId:        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID      ?? '',
  googleAndroidClientId:    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID  ?? '',
  sentryDsn:                process.env.EXPO_PUBLIC_SENTRY_DSN                ?? '',
  firebaseApiKey:           process.env.EXPO_PUBLIC_FIREBASE_API_KEY          ?? '',

  // ── Limits ───────────────────────────────────────────────────────────────
  maxFileUploadMb:    20,
  maxImageDimension:  2048,
  maxCacheItems:      500,
  offlineQueueMax:    100,

  // ── Pagination ───────────────────────────────────────────────────────────
  defaultPageSize:    20,
  maxPageSize:        100,

  // ── Tour ─────────────────────────────────────────────────────────────────
  tourCooldownMs:     24 * 60 * 60 * 1000,  // 24 hours
  tourMaxCrashCount:  3,

  // ── Locales ──────────────────────────────────────────────────────────────
  supportedLocales:   ['ar', 'en', 'ur', 'hi', 'bn', 'fil'],
  defaultLocale:      'ar',
  rtlLocales:         ['ar', 'ur'],

  // ── Countries ────────────────────────────────────────────────────────────
  supportedCountries: ['SA', 'AE', 'KW', 'BH', 'QA', 'OM', 'EG', 'PK', 'IN', 'BD', 'PH'],
  defaultCountry:     'SA',
  defaultCurrency:    'SAR',
  defaultPhoneCode:   '+966',

  // ── Roles ────────────────────────────────────────────────────────────────
  roles: {
    PATIENT:   'patient',
    GUEST:     'guest',
    PROVIDER:  'provider',
    ADMIN:     'admin',
    SUPERADMIN:'superadmin',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Remote Config Patch — Admin Dashboard can push runtime overrides
// ─────────────────────────────────────────────────────────────────────────────
type RemoteConfigPatch = Partial<Pick<AppConfig,
  | 'apiTimeout' | 'apiRetries' | 'tourCooldownMs' | 'tourMaxCrashCount'
  | 'maxFileUploadMb' | 'defaultPageSize' | 'maxLoginAttempts' | 'lockoutDuration'
>>;

export function applyRemoteConfig(patch: RemoteConfigPatch): void {
  Object.assign(config, patch);
}

// ─────────────────────────────────────────────────────────────────────────────
// Type helpers
// ─────────────────────────────────────────────────────────────────────────────
export function isDev(): boolean  { return ENVIRONMENT === 'development'; }
export function isStaging(): boolean { return ENVIRONMENT === 'staging'; }
export function isProd(): boolean { return ENVIRONMENT === 'production'; }
export function isRTLLocale(locale: string): boolean {
  return config.rtlLocales.includes(locale);
}
