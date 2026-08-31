import * as Linking from 'expo-linking';

type DeepLinkScreens = Record<string, string | { screens: DeepLinkScreens }>;

// ---------------------------------------------------------------------------
// Deep Link configuration for Nabdah Plus
// Scheme: nabdahplus://
// Web: https://nabdahplus.com
// ---------------------------------------------------------------------------

const DEEP_LINK_PREFIX = Linking.createURL('/');
const WEB_PREFIX = 'https://nabdahplus.com';

export const DEEP_LINK_PREFIXES = [
  DEEP_LINK_PREFIX,
  WEB_PREFIX,
  'nabdahplus://',
];

// Maps all app routes to deep link paths
export const DEEP_LINK_CONFIG: { screens: DeepLinkScreens } = {
  screens: {
    // Auth
    '(auth)/login': 'login',
    '(auth)/register': 'register',
    '(auth)/otp': 'verify',
    '(auth)/forgot-password': 'forgot-password',
    '(auth)/reset-password': 'reset-password',

    // Tabs
    '(tabs)': {
      screens: {
        index: '',
        consultations: 'consultations',
        pharmacy: 'pharmacy',
        diagnostics: 'diagnostics',
        health: 'health',
        services: 'services',
      },
    },

    // Doctors
    'consultations/doctor-profile': 'doctors/:slug',
    'consultations/doctor-search': 'doctors',
    'consultations/specialty-select': 'specialties',
    'consultations/appointments': 'appointments',
    'consultations/appointment-detail': 'appointments/:id',
    'consultations/booking-status': 'booking/:doctorId',
    'consultations/booking-status': 'booking-success/:id',
    'consultations/cancel-reschedule': 'appointments/:id/reschedule',
    'consultations/chat-with-doctor': 'chat/doctor/:sessionId',
    'consultations/video-call': 'call/:sessionId',
    'consultations/waiting-room': 'waiting/:sessionId',
    'consultations/virtual-waiting-room': 'virtual-waiting/:sessionId',
    'consultations/post-call-rating': 'rating/:sessionId',
    'consultations/prescription-from-doctor': 'prescription/:id',
    'consultations/follow-up': 'follow-up/:id',
    'consultations/share-report': 'share-report/:id',
    'consultations/clinic-location': 'clinic/:id/location',
    'consultations/home-visit-tracking': 'home-visit/:id/tracking',

    // Pharmacy
    'pharmacy/product-detail': 'medicines/:slug',
    'pharmacy/product-search': 'medicines',
    'pharmacy/prescription-upload': 'pharmacy/prescription',
    'pharmacy/cart': 'pharmacy/cart',
    'pharmacy/order-confirm': 'pharmacy/checkout',
    'pharmacy/order-tracking': 'pharmacy/orders/:id/track',
    'pharmacy/order-history': 'pharmacy/orders',
    'pharmacy/broadcast-status': 'pharmacy/broadcast/:id',
    'pharmacy/barcode-scanner': 'pharmacy/scan',
    'pharmacy/request': 'pharmacy/request-drug',
    'pharmacy/request': 'pharmacy/custom',
    'pharmacy/rx-order': 'pharmacy/rx',
    'pharmacy/reorder': 'pharmacy/reorder/:id',
    'pharmacy/wishlist': 'pharmacy/wishlist',
    'pharmacy/medicine-compare': 'pharmacy/compare',
    'pharmacy/pharmacist-chat': 'chat/pharmacist/:sessionId',

    // Diagnostics
    'diagnostics/search': 'labs',
    'diagnostics/test-detail': 'labs/:slug',
    'diagnostics/package-detail': 'lab-packages/:slug',
    'diagnostics/packages': 'lab-packages',
    'diagnostics/book-sample': 'labs/book',
    'diagnostics/booking-confirm': 'labs/booking/:id',
    'diagnostics/cart': 'labs/cart',
    'diagnostics/my-results': 'labs/results',
    'diagnostics/results-history': 'labs/results/history',
    'diagnostics/sample-tracking': 'labs/tracking/:id',
    'diagnostics/technician-tracking': 'labs/technician/:id',
    'diagnostics/lab-comparison': 'labs/compare',

    // Nursing
    'nursing/hub': 'nursing',
    'nursing/service-detail': 'nursing/:slug',
    'nursing/booking-confirm': 'nursing/booking/:id',
    'nursing/live-tracking': 'nursing/tracking/:id',

    // Health
    'health/vitals': 'health/vitals',
    'health/vitals-log': 'health/vitals/log',
    'health/medications': 'health/medications',
    'health/prescriptions': 'health/prescriptions',
    'health/reports': 'health/reports',
    'health/health-id': 'health/id',
    'health/edit-profile': 'health/edit',
    'health/conditions-allergies': 'health/conditions',
    'health/chronic-medications': 'health/chronic',
    'health/emergency-contacts': 'health/emergency-contacts',
    'health/medication-reminder-list': 'health/reminders',
    'health/medication-reminder-add': 'health/reminders/add',
    'health/smart-reminders': 'health/smart-reminders',
    'health/trends': 'health/trends',
    'health/sleep-tracker': 'health/sleep',
    'health/sleep-score': 'health/sleep/score',
    'health/wearables': 'health/wearables',
    'health/family-hub': 'health/family',

    // Family
    'family': 'family',
    'family/invite': 'family/invite',
    'family/chat': 'family/chat',
    'family/member-health': 'family/:memberId',
    'family/permissions': 'family/permissions',

    // Insurance
    'insurance/hub': 'insurance',
    'insurance/add-policy': 'insurance/add',
    'insurance/policy-detail': 'insurance/:id',
    'insurance/benefits-summary': 'insurance/:id/benefits',
    'insurance/coverage-check': 'insurance/check',
    'insurance/submit-claim': 'insurance/claim',
    'insurance/claim-tracking': 'insurance/claim/:id',
    'insurance/approval-pending': 'insurance/pending/:id',
    'insurance/refund-status': 'insurance/refund/:id',

    // Payments
    'payments/processing': 'payments/processing/:id',
    'payments/success': 'payments/success/:id',
    'payments/failed': 'payments/failed/:id',

    // AI
    'ai/symptom-checker': 'ai/symptoms',
    'ai/symptom-timeline': 'ai/timeline',
    'ai/skin-analysis': 'ai/skin',
    'ai/chat-doctor': 'ai/chat',
    'ai/prescription-translator': 'ai/prescription',

    // Others
    'emergency': 'emergency',
    'emergency/sos': 'emergency/sos',
    'notifications': 'notifications',
    'search': 'search',
    'map': 'map',
    'reviews': 'reviews',
    'support/chat': 'support',
    'support/ticket': 'support/ticket',
    'reports/hub': 'reports',
    'reports/view-report': 'reports/:id',
    'reports/ai-analysis': 'reports/:id/ai',
    'returns/hub': 'returns',
    'returns/new-request': 'returns/new',
    'returns/detail': 'returns/:id',
    'loyalty/rewards': 'loyalty',
    'loyalty/leaderboard': 'loyalty/leaderboard',
    'loyalty/challenges': 'loyalty/challenges',
    'nutrition/hub': 'nutrition',
    'mental-health': 'mental-health',
    'maternity/baby-development': 'maternity',
    'drug-scanner': 'drug-scanner',
    'community': 'community',
    'wearables': 'wearables',
    'voice': 'voice',
    'delivery/address-select': 'delivery/address',
    'profile': 'profile',

    // Settings
    'settings': 'settings',
    'settings/security': 'settings/security',
    'settings/privacy': 'settings/privacy',
    'settings/data': 'settings/data',
    'settings/feedback': 'settings/feedback',
    'settings/language': 'settings/language',
    'settings/support-chat': 'settings/support',
    'settings/terms': 'settings/terms',
    'settings/about': 'settings/about',
    'settings/notifications-settings': 'settings/notifications',
  },
};

// ---------------------------------------------------------------------------
// Helper to generate shareable URLs
// ---------------------------------------------------------------------------
export function generateShareUrl(type: string, slug: string): string {
  return `${WEB_PREFIX}/${type}/${slug}`;
}

export function generateDeepLink(type: string, id: string): string {
  return `nabdahplus://${type}/${id}`;
}

// Generate slug from name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0621-\u064A-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
