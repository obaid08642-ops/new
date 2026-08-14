import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';

// ---------------------------------------------------------------------------
// Guest Mode Guard
// Controls which features are available for guest users.
// Guests CAN: browse, search, view doctors/medicines, view prices.
// Guests CANNOT: access health records, medical history, sync data,
//   save personal info, wallet, family, or personalized features.
// ---------------------------------------------------------------------------

// Features explicitly restricted for guests
const GUEST_RESTRICTED_FEATURES = new Set([
  'health',
  'health-vitals',
  'health-medications',
  'health-reports',
  'health-id',
  'health-family',
  'health-chronic',
  'health-conditions',
  'health-emergency-contacts',
  'health-reminders',
  'health-wearables',
  'health-sleep',
  'health-trends',
  'wallet',
  'wallet-cards',
  'wallet-transactions',
  'family',
  'family-chat',
  'family-invite',
  'insurance-add',
  'insurance-claim',
  'profile-edit',
  'settings-security',
  'settings-privacy',
  'settings-data',
  'medical-records',
  'sync',
  'personalization',
]);

interface GuestGuardReturn {
  isGuest: boolean;
  checked: boolean;
  requireAuth: (feature?: string) => boolean;
  canAccess: (feature: string) => boolean;
}

export function useGuestGuard(): GuestGuardReturn {
  const authState = useSelector((state: { auth: { isGuest: boolean; isAuthenticated: boolean } }) => state.auth);
  const isGuest = authState.isGuest;
  const checked = authState.isAuthenticated || authState.isGuest;

  const requireAuth = useCallback(
    (feature?: string): boolean => {
      if (!isGuest) return false;

      Alert.alert(
        'مطلوب تسجيل الدخول',
        feature
          ? `يجب تسجيل الدخول للوصول إلى ${feature}`
          : 'يجب تسجيل الدخول لاستخدام هذه الميزة',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'تسجيل الدخول',
            onPress: () => router.push('/(auth)/login'),
          },
          {
            text: 'إنشاء حساب',
            style: 'default',
            onPress: () => router.push('/(auth)/register'),
          },
        ],
      );
      return true;
    },
    [isGuest],
  );

  const canAccess = useCallback(
    (feature: string): boolean => {
      if (!isGuest) return true;
      return !GUEST_RESTRICTED_FEATURES.has(feature);
    },
    [isGuest],
  );

  return { isGuest, checked, requireAuth, canAccess };
}
