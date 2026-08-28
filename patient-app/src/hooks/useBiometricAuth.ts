import { useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const BIOMETRIC_KEY = '@nabdah_biometric_enabled';

/**
 * Biometric login (Face ID / Fingerprint) — production contract:
 *  - NEVER force-enable: we OFFER once after the first successful login.
 *  - On subsequent app opens, if enabled, unlock with biometrics before showing
 *    protected content (falls back to normal login when unavailable/cancelled).
 */
export function useBiometricAuth() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
        setSupported(!!enrolled);
        const stored = await AsyncStorage.getItem(BIOMETRIC_KEY);
        setEnabled(stored === '1');
      } catch { setSupported(false); }
    })();
  }, []);

  /** Offer biometric unlock ONCE after first successful login (never forced). */
  const offerAfterLogin = useCallback(async () => {
    if (!supported) return;
    const asked = await AsyncStorage.getItem(`${BIOMETRIC_KEY}_asked`);
    if (asked) return;
    await AsyncStorage.setItem(`${BIOMETRIC_KEY}_asked`, '1');
    Alert.alert(
      'دخول سريع',
      'هل تريد تفعيل الدخول بالبصمة / Face ID في المرات القادمة؟',
      [
        { text: 'لاحقاً', style: 'cancel' },
        {
          text: 'تفعيل',
          onPress: async () => {
            const ok = await LocalAuthentication.authenticateAsync({ promptMessage: 'تأكيد الهوية' });
            if (ok.success) {
              await AsyncStorage.setItem(BIOMETRIC_KEY, '1');
              setEnabled(true);
            }
          },
        },
      ],
    );
  }, [supported]);

  /** Prompt biometric unlock on app open when enabled. Resolves true if passed/skipped. */
  const requireUnlock = useCallback(async (): Promise<boolean> => {
    if (!enabled || !supported) return true;
    try {
      const ok = await LocalAuthentication.authenticateAsync({ promptMessage: 'افتح نبض' });
      return ok.success;
    } catch {
      return true; // don't lock the user out on hardware errors
    }
  }, [enabled, supported]);

  const disable = useCallback(async () => {
    await AsyncStorage.setItem(BIOMETRIC_KEY, '0');
    setEnabled(false);
  }, []);

  return { supported, enabled, offerAfterLogin, requireUnlock, disable };
}
