import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';

// ---------------------------------------------------------------------------
// Guest Mode Guard
// Policy (product decision): guests can use EVERYTHING — browse, order any
// service (pharmacy, consultations, labs, radiology, nursing), view their
// history/reports/prescriptions — via a device-bound guest account.
// The ONLY two areas that require a registered account:
//   1. INSURANCE (policies, claims, paying by insurance)
//   2. FAMILY (groups, members, family chat/messages)
// ---------------------------------------------------------------------------

// Features explicitly restricted for guests
const GUEST_RESTRICTED_FEATURES = new Set([
  'family',
  'family-chat',
  'family-invite',
  'health-family',
  'insurance',
  'insurance-add',
  'insurance-claim',
  'insurance-hub',
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

      // New policy: a blanket requireAuth() with no feature no longer blocks —
      // guests may use every service. Only explicitly restricted features
      // (insurance / family) interrupt with the login prompt.
      if (feature && !GUEST_RESTRICTED_FEATURES.has(feature)) return false;
      if (!feature) return false;

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
