import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/**
 * Deep Linking Configuration for Expo Router
 * Supports universal links and custom url schemes (nabdahplus://)
 */

export const prefix = Linking.createURL('/');

export const deepLinkingConfig = {
  prefixes: [prefix, 'nabdahplus://', 'https://nabdahplus.com', 'https://*.nabdahplus.com'],
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
      // Feature screens
      'pharmacy/[id]': 'product/:id',
      'consultations/doctor/[id]': 'doctor/:id',
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
