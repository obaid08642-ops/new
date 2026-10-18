import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * The health score card in every language. GET /health/score sends the component labels, the recommendation and the
 * "not enough data" message as Arabic sentences AND as stable keys (label_key, recommendation_keys, message_key); the
 * Health tab drew the Arabic sentences, so an English, Urdu, Hindi, Bengali or Filipino patient read Arabic on the card.
 * The REAL tab renders with the server's real answer; only the request, the router and the language are replaced.
 */
let mockLang = 'en';
let mockScore: Record<string, unknown> = {};
const mockApiFetch = jest.fn();
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), newIdempotencyKey: () => 'k', BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../src/utils/logger', () => ({ logError: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const R = require('react');
    R.useEffect(() => cb(), []); // eslint-disable-line react-hooks/exhaustive-deps
  },
}));
jest.mock('../src/context/AppContext', () => ({
  useApp: () => ({ isDark: false, lang: mockLang, isRTL: mockLang === 'ar' || mockLang === 'ur' }),
}));

import HealthHub, { recKey, scoreText } from '../app/(tabs)/health';
import { message } from '../src/components/screen/ScreenKit';

const ARABIC = /[؀-ۿ]/;
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };

// what health.service.ts computeScore() returns today
const SCORED = {
  score: 72,
  status: 'good',
  status_key: 'health.score.good',
  components: [
    { key: 'bp', label: 'ضغط الدم', label_key: 'health.component.bp', weight: 20, score: 80 },
    { key: 'sleep', label: 'جودة النوم', label_key: 'health.component.sleep', weight: 15, score: 60 },
  ],
  recommendations: ['قراءة ضغط الدم الأخيرة مرتفعة — قلل الملح وراقب الضغط بانتظام واستشر طبيبك'],
  recommendation_keys: ['health.rec.bp_high'],
};
const INSUFFICIENT = {
  score: null,
  status: 'insufficient_data',
  components: [],
  recommendations: [],
  message: 'لا توجد بيانات كافية لحساب درجة الصحة — أكمل ملفك وسجّل مؤشراتك',
  message_key: 'health.score.message.insufficient_data',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/health/score') return mockScore;
    if (path === '/health/vitals/summary') return [];
    return [];
  });
});

describe('health score text by the server ids', () => {
  const k = (lang: string) => (key: string) => message(lang, key);
  it('maps a recommendation code to the app key and keeps the server text for an unknown one', () => {
    expect(recKey('health.rec.bp_high')).toBe('health.hub.rec.bp_high');
    expect(recKey(undefined)).toBe('');
    expect(scoreText(k('en'), recKey('health.rec.brand_new'), 'نص الخادم')).toBe('نص الخادم');
    expect(scoreText(k('en'), '', 'نص الخادم')).toBe('نص الخادم');
  });
  it('has every component and recommendation the server can send, in every language', () => {
    const codes = ['bmi_high', 'profile_incomplete', 'bp_high', 'glucose_off', 'sleep_low', 'tracking_low', 'tracking_start'];
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'fil']) {
      for (const c of codes) expect(scoreText(k(lang), `health.hub.rec.${c}`, '')).not.toBe('');
      for (const c of ['bmi', 'bp', 'glucose', 'heart_rate', 'sleep', 'tracking']) expect(scoreText(k(lang), `health.hub.component.${c}`, '')).not.toBe('');
    }
  });
});

describe('the Health tab score card', () => {
  it('draws the components and the recommendation in English, with no Arabic', async () => {
    mockLang = 'en';
    mockScore = SCORED;
    await render(<SafeAreaProvider initialMetrics={metrics}><HealthHub /></SafeAreaProvider>);
    expect(await screen.findByText('Blood pressure 80')).toBeTruthy();
    expect(screen.getByText('Sleep quality 60')).toBeTruthy();
    expect(screen.getByText(/Your latest blood pressure reading is high/)).toBeTruthy();
    expect(screen.queryAllByText(ARABIC)).toHaveLength(0);
  });

  it('draws the "not enough data" card in English, with no Arabic', async () => {
    mockLang = 'en';
    mockScore = INSUFFICIENT;
    await render(<SafeAreaProvider initialMetrics={metrics}><HealthHub /></SafeAreaProvider>);
    expect(await screen.findByText(message('en', 'health.hub.scoreEmpty'))).toBeTruthy();
    expect(screen.queryAllByText(ARABIC)).toHaveLength(0);
  });
});
