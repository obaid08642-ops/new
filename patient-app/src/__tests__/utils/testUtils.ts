/**
 * Test utilities — Mock factories and test helpers.
 * Import from '__tests__/utils' in all test files.
 */
import type { AppConfig } from '../../core/config/ConfigManager';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Config
// ─────────────────────────────────────────────────────────────────────────────
export const mockConfig: AppConfig = {
  appName:          'نبض بلس TEST',
  appNameEn:        'Nabdah Plus TEST',
  appVersion:       '1.0.0',
  buildNumber:      '1',
  bundleId:         'com.nabdahplus.test',
  platform:         'ios',
  appEnv:           'development',
  apiBaseUrl:       'http://localhost:8002/api/v1',
  fastapiBaseUrl:   'http://localhost:8000/api',
  socketUrl:        'ws://localhost:8002',
  cdnUrl:           'http://localhost:8002/media',
  logLevel:         'debug',
  enableCrashReporting: false,
  enableAnalytics:  false,
  apiVersion:       'v1',
  apiTimeout:       5000,
  apiRetries:       1,
  apiCacheTtl:      60_000,
  tokenExpiryBuffer: 60_000,
  maxLoginAttempts: 5,
  lockoutDuration:  300_000,
  googleMapsApiKey: 'TEST_KEY',
  oneSignalAppId:   'TEST_APP_ID',
  googleClientId:   '',
  googleIosClientId: '',
  googleAndroidClientId: '',
  sentryDsn:        '',
  firebaseApiKey:   '',
  maxFileUploadMb:  20,
  maxImageDimension: 2048,
  maxCacheItems:    100,
  offlineQueueMax:  50,
  defaultPageSize:  20,
  maxPageSize:      100,
  tourCooldownMs:   0,  // no cooldown in tests
  tourMaxCrashCount: 99,
  supportedLocales: ['ar', 'en'],
  defaultLocale:    'ar',
  rtlLocales:       ['ar', 'ur'],
  supportedCountries: ['SA'],
  defaultCountry:   'SA',
  defaultCurrency:  'SAR',
  defaultPhoneCode: '+966',
  roles: { PATIENT: 'patient', GUEST: 'guest' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock services
// ─────────────────────────────────────────────────────────────────────────────
export const mockLogger: any = {
  debug: jest.fn(),
  info:  jest.fn(),
  warn:  jest.fn(),
  error: jest.fn(),
  scope: jest.fn(() => mockLogger),
  getBuffer: jest.fn(() => []),
  clearBuffer: jest.fn(),
};

export const mockAnalytics = {
  initialize: jest.fn(),
  track:      jest.fn(),
  identify:   jest.fn(),
  screen:     jest.fn(),
  reset:      jest.fn(),
  setConsent: jest.fn(),
};

export const mockFeatureFlags = {
  initialize: jest.fn(),
  isEnabled:  jest.fn(() => true),
  getVariant: jest.fn(() => null),
  override:   jest.fn(),
  updateFromRemote: jest.fn(),
};

export const mockHttpClient = {
  get:    jest.fn(),
  post:   jest.fn(),
  put:    jest.fn(),
  patch:  jest.fn(),
  delete: jest.fn(),
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock data factories
// ─────────────────────────────────────────────────────────────────────────────
export function createMockUser(overrides = {}) {
  return {
    id:             'user-test-123',
    phone:          '+966500000000',
    email:          'test@nabdahplus.com',
    name:           'مستخدم تجريبي',
    role:           'patient',
    isVerified:     true,
    createdAt:      '2026-01-01T00:00:00Z',
    loyaltyPoints:  0,
    walletBalance:  0,
    ...overrides,
  };
}

export function createMockPaginatedResult<T>(items: T[], total?: number) {
  return {
    items,
    total:      total ?? items.length,
    page:       1,
    pageSize:   20,
    totalPages: Math.ceil((total ?? items.length) / 20),
    hasMore:    false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AsyncStorage mock (for Jest)
// ─────────────────────────────────────────────────────────────────────────────
export function setupAsyncStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem:    jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItem:    jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve(); }),
    removeItem: jest.fn((key: string) => { delete store[key]; return Promise.resolve(); }),
    multiGet:   jest.fn((keys: string[]) => Promise.resolve(keys.map((k) => [k, store[k] ?? null]))),
    multiSet:   jest.fn((pairs: [string, string][]) => { pairs.forEach(([k, v]) => { store[k] = v; }); return Promise.resolve(); }),
    multiRemove:jest.fn((keys: string[]) => { keys.forEach((k) => delete store[k]); return Promise.resolve(); }),
    clear:      jest.fn(() => { Object.keys(store).forEach((k) => delete store[k]); return Promise.resolve(); }),
    _store:     store,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DI Container mock setup (for unit tests)
// ─────────────────────────────────────────────────────────────────────────────
export function setupMockContainer() {
  const { container, Tokens } = require('../../core/di/Container');
  container.reset();
  container.bindSingleton(Tokens.Logger,       mockLogger);
  container.bindSingleton(Tokens.Analytics,    mockAnalytics);
  container.bindSingleton(Tokens.FeatureFlags, mockFeatureFlags);
  container.bindSingleton(Tokens.Config,       mockConfig);
  return container;
}
