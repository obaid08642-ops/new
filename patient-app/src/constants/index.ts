import { tokens } from '../../../packages/design-tokens/dist/ts/tokens';
export const APP_NAME = 'نبض بلس';
export const APP_NAME_EN = 'Nabd+';
export const APP_VERSION = '1.0.0';

// Issue 410: the API base comes from ConfigManager's single rule (EXPO_PUBLIC_API_BASE_URL, else EXPO_PUBLIC_API_URL + /api/v1).
export { API_BASE_URL } from './apiBase';
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'https://api.nabd.plus';
export const CDN_URL = process.env.EXPO_PUBLIC_CDN_URL ?? 'https://cdn.nabd.plus';

export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export const STORAGE_KEYS = {
  // expo-secure-store keys may only contain [A-Za-z0-9._-]; '@' made every native save throw (Q71).
  AUTH_TOKEN: 'nabdah_auth_token',
  REFRESH_TOKEN: 'nabdah_refresh_token',
  USER_DATA: 'nabdah_user_data',
  THEME: '@nabdah_theme',
  LANGUAGE: '@nabdah_language',
  ONBOARDING_DONE: '@nabdah_onboarding_done',
  // First-launch intro (language step, then the slides): set once when the user finishes or skips; the suffix is the version.
  INTRO_DONE: '@nabdah_intro_done_v1',
  CART: '@nabdah_cart',
  SAVED_ADDRESSES: '@nabdah_addresses',
  HEALTH_PROFILE: '@nabdah_health_profile',
  GUEST_MODE: '@nabdah_guest_mode',
  // Ord01: the new patient chose "skip" on the first-ask sheet of the ordering context; asked once, never again.
  ORDERING_CTX_SKIPPED: '@nabdah_ordering_ctx_skipped_v1',
};

// Static colours of the light theme, read from packages/design-tokens (no literals here).
const T = tokens('light').color;
const S = T.service;

export const LOYALTY_TIERS = [
  { id: 'bronze', nameAr: 'برونزي', minPoints: 0, maxPoints: 1000, color: S.peach.fg, icon: 'trophy' },
  { id: 'silver', nameAr: 'فضي', minPoints: 1001, maxPoints: 5000, color: T.text.secondary, icon: 'trophy' },
  { id: 'gold', nameAr: 'ذهبي', minPoints: 5001, maxPoints: 10000, color: S.amber.fg, icon: 'trophy' },
  { id: 'platinum', nameAr: 'بلاتيني', minPoints: 10001, maxPoints: Infinity, color: S.blue.fg, icon: 'sparkles' },
];

export const QUICK_SERVICES = [
  { id: 'emergency', nameAr: 'طوارئ', icon: 'emergency', color: S.coral.fg, route: 'emergency' },
  { id: 'pharmacy', nameAr: 'صيدلية', icon: 'medication', color: S.coral.fg, route: '(tabs)/pharmacy' },
  { id: 'diagnostics', nameAr: 'تحاليل', icon: 'science', color: S.violet.fg, route: '(tabs)/diagnostics' },
  { id: 'nursing', nameAr: 'تمريض', icon: 'consultations', color: S.teal.fg, route: '(tabs)/nursing' },
  { id: 'mental_health', nameAr: 'صحة نفسية', icon: 'brain', color: S.violet.fg, route: 'mental-health' },
  { id: 'nutrition', nameAr: 'تغذية', icon: 'food', color: S.lime.fg, route: 'nutrition' },
];

export const VITAL_RANGES = {
  bloodPressure: { systolic: { min: 90, max: 120 }, diastolic: { min: 60, max: 80 } },
  heartRate: { min: 60, max: 100, unit: 'bpm' },
  bloodGlucose: { fasting: { min: 70, max: 100 }, postMeal: { min: 70, max: 140 }, unit: 'mg/dL' },
  temperature: { min: 36.1, max: 37.2, unit: '°C' },
  oxygen: { min: 95, max: 100, unit: '%' },
};

export const PAYMENT_METHODS = [
  { id: 'credit_card', nameAr: 'بطاقة ائتمان', icon: 'card' },
  { id: 'apple_pay', nameAr: 'Apple Pay', icon: 'apple', platform: 'ios' },
  { id: 'google_pay', nameAr: 'Google Pay', icon: 'google', platform: 'android' },
  { id: 'stc_pay', nameAr: 'STC Pay', icon: 'sparkles' },
  { id: 'cash', nameAr: 'كاش عند الزيارة', icon: 'cash' },
  { id: 'insurance', nameAr: 'تأمين صحي', icon: 'shield' },
  { id: 'loyalty_points', nameAr: 'نقاط النبض', icon: 'star' },
  { id: 'installment', nameAr: 'تقسيط', icon: 'receipt' },
];

export const LANGUAGES = [
  { code: 'ar', name: 'العربية', flag: 'SA', rtl: true },
  { code: 'en', name: 'English', flag: 'GB', rtl: false },
];

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const FAMILY_RELATIONS = [
  { id: 'father', nameAr: 'أب', icon: 'user' },
  { id: 'mother', nameAr: 'أم', icon: 'user' },
  { id: 'son', nameAr: 'ابن', icon: 'user' },
  { id: 'daughter', nameAr: 'ابنة', icon: 'user' },
  { id: 'husband', nameAr: 'زوج', icon: 'user' },
  { id: 'wife', nameAr: 'زوجة', icon: 'user' },
  { id: 'brother', nameAr: 'شقيق', icon: 'user' },
  { id: 'sister', nameAr: 'أخت', icon: 'user' },
  { id: 'grandfather', nameAr: 'جد', icon: 'user' },
  { id: 'grandmother', nameAr: 'جدة', icon: 'user' },
];

