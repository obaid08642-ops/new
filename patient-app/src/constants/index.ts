export const APP_NAME = 'نبض بلس';
export const APP_NAME_EN = 'Nabdah Plus';
export const APP_VERSION = '1.0.0';

// M1-ENV: fixed wrong default (was missing the /api prefix → pointed at non-existent /v1)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL
  ?? (process.env.EXPO_PUBLIC_API_URL ? `${process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '')}/api/v1` : 'https://api.nabd.plus/api/v1');
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'https://api.nabd.plus';
export const CDN_URL = process.env.EXPO_PUBLIC_CDN_URL ?? 'https://cdn.nabd.plus';

export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@nabdah_auth_token',
  REFRESH_TOKEN: '@nabdah_refresh_token',
  USER_DATA: '@nabdah_user_data',
  THEME: '@nabdah_theme',
  LANGUAGE: '@nabdah_language',
  ONBOARDING_DONE: '@nabdah_onboarding_done',
  CART: '@nabdah_cart',
  SAVED_ADDRESSES: '@nabdah_addresses',
  HEALTH_PROFILE: '@nabdah_health_profile',
  GUEST_MODE: '@nabdah_guest_mode',
};

export const LOYALTY_TIERS = [
  { id: 'bronze', nameAr: 'برونزي', minPoints: 0, maxPoints: 1000, color: '#CD7C3C', icon: 'trophy' },
  { id: 'silver', nameAr: 'فضي', minPoints: 1001, maxPoints: 5000, color: '#94A3B8', icon: 'trophy' },
  { id: 'gold', nameAr: 'ذهبي', minPoints: 5001, maxPoints: 10000, color: '#F59E0B', icon: 'trophy' },
  { id: 'platinum', nameAr: 'بلاتيني', minPoints: 10001, maxPoints: Infinity, color: '#3B82F6', icon: 'sparkles' },
];

export const QUICK_SERVICES = [
  { id: 'emergency', nameAr: 'طوارئ', icon: 'emergency', color: '#FF3B30', route: 'emergency' },
  { id: 'pharmacy', nameAr: 'صيدلية', icon: 'medication', color: '#22C55E', route: '(tabs)/pharmacy' },
  { id: 'diagnostics', nameAr: 'تحاليل', icon: 'science', color: '#8B5CF6', route: '(tabs)/diagnostics' },
  { id: 'nursing', nameAr: 'تمريض', icon: 'consultations', color: '#00C9A7', route: '(tabs)/nursing' },
  { id: 'mental_health', nameAr: 'صحة نفسية', icon: 'brain', color: '#6366F1', route: 'mental-health' },
  { id: 'nutrition', nameAr: 'تغذية', icon: 'food', color: '#22C55E', route: 'nutrition' },
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
  { id: 'wallet', nameAr: 'محفظة نبض', icon: 'wallet' },
  { id: 'loyalty_points', nameAr: 'نقاط النبض', icon: 'star' },
  { id: 'installment', nameAr: 'تقسيط', icon: 'receipt' },
];

export const LANGUAGES = [
  { code: 'ar', name: 'العربية', flag: 'SA', rtl: true },
  { code: 'en', name: 'English', flag: 'GB', rtl: false },
];

export const CANCELLATION_POLICY = [
  { hoursBeforeMin: 24, hoursBeforeMax: Infinity, refundPercent: 100, label: 'قبل 24 ساعة' },
  { hoursBeforeMin: 12, hoursBeforeMax: 24, refundPercent: 50, label: 'قبل 12 ساعة' },
  { hoursBeforeMin: 0, hoursBeforeMax: 12, refundPercent: 0, label: 'قبل 6 ساعات' },
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

export const EMERGENCY_NUMBERS = {
  ambulance: '997',
  police: '999',
  fire: '998',
  civilDefense: '911',
};
