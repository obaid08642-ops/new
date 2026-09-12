import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/**
 * THE single canonical deep-link configuration for the patient app.
 * (A duplicate config previously lived in src/config/deepLinks.ts — removed.
 * One architecture only: expo-router consumes scheme + associated domains
 * from app.json; this module documents prefixes and screen mapping.)
 * Supports canonical universal links and custom URL schemes (nabdplus://),
 * while retaining the former nabdahplus:// scheme for existing installs.
 */

export const prefix = Linking.createURL('/');

export const deepLinkingConfig = {
  prefixes: [
    prefix,
    'nabdplus://',
    'nabdahplus://', // legacy compatibility only
    'https://nabd.plus',
    'https://www.nabd.plus',
    'https://nabdahplus.com', // legacy compatibility only
    'https://www.nabdahplus.com',
  ],
  config: {
    screens: {
      // Home tab
      '(tabs)': {
        screens: {
          index: 'home',
          consultations: 'consultations',
          pharmacy: 'pharmacy',
          wallet: 'wallet',
          profile: 'profile',
        },
      },
      // Auth group
      '(auth)': {
        screens: {
          login: 'login',
          register: 'register',
          'forgot-password': 'reset-password',
        },
      },
      // Public discovery and share pages: the backend emits /s/:type/:slug.
      // The detail screen resolves the governed entity server-side and routes
      // unauthenticated users through the appropriate safe public preview.
      's/[type]/[slug]': 's/:type/:slug',
      // Feature screens
      'pharmacy/[id]': 'product/:id',
      'consultations/doctor/[id]': 'doctor/:id',
      // Journey screens (R26 expansion — every screen is addressable; explicit map for shared links)
      'consultations/appointments': 'appointments',
      'consultations/appointment-detail': 'appointments/:id',
      'consultations/summary': 'appointments/:id/summary',
      'consultations/booking-status': 'booking/:id',
      'pharmacy/order-tracking': 'orders/:id/tracking',
      'pharmacy/order-confirm': 'orders/:id',
      'diagnostics/my-results': 'results',
      'nursing/visits': 'nursing/visits',
      'nursing/live-tracking': 'nursing/visits/:id/tracking',
      'reports/timeline': 'reports/timeline',
      'reports/passport': 'reports/passport',
      'family/emergency-contacts': 'family/emergency',
      'wallet': 'wallet',
      'search': 'search',
      // Modals & Overlays
      'guided-tour': 'tour',
      // Catch-all
      '*': '*',
    },
  },
  
  async getInitialURL() {
    // Check if app was opened from a deep link
    const url = await Linking.getInitialURL();
    if (url != null) {
      return url;
    }
    return null;
  },
  
  subscribe(listener: (url: string) => void) {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });
    return () => {
      subscription.remove();
    };
  },
};
