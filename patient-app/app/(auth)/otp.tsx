// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useDispatch, useSelector } from 'react-redux';

import { useApp } from '../../src/context/AppContext';
import { resolveColor } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';
import { STORAGE_KEYS } from '../../src/constants';
import { decodeJwt } from '../../src/utils/jwt';
import { loginSuccess } from '../../src/store/slices/authSlice';
import { LocalizedText } from '../../src/components/LocalizedText';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { consumeRegistrationTransaction } from '../../src/services/auth/RegistrationTransaction';

export default function OtpScreen() {
  const { isDark, lang } = useApp() as any;
  const dispatch = useDispatch();
  const isGuest = useSelector((state: any) => state.auth.isGuest);
  const params = useLocalSearchParams();

  const mode = (params.mode as string) || 'login';
  const [registrationPayload] = useState(() => mode === 'register'
    ? consumeRegistrationTransaction(params.transactionId as string | undefined)
    : null);
  const phone = registrationPayload?.phone || (params.phone as string) || '';

  const isRTL = lang === 'ar' || lang === 'ur' || true;

  const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6 digits for our backend
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => { 
    if (timer > 0) { 
      const t = setTimeout(() => setTimer(timer - 1), 1000); 
      return () => clearTimeout(t); 
    } 
  }, [timer]);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleConfirm = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      showLocalizedAlert('خطأ', 'الرجاء إدخال الرمز المكون من 6 أرقام كاملاً');
      return;
    }
    
    setLoading(true);
    try {
      const emailParam = registrationPayload?.email || (params.email as string) || '';
      
      const resOtp = await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: emailParam,
          code: code,
        }),
      });

      // M1: backend returns { ok: true } from /auth/verify-otp (older mocks used `verified`)
      const otpVerified = !!(resOtp?.verified || resOtp?.ok);
      let token = typeof resOtp?.token === 'string' ? resOtp.token : (resOtp?.token?.accessToken || '');
      let userData = resOtp?.user || null;

      if (otpVerified) {
        if (mode === 'reset') {
          router.replace({ pathname: '/(auth)/reset-password', params: { email: emailParam } });
          setLoading(false);
          return;
        }
        if (mode === 'register') {
          if (!registrationPayload) {
            showLocalizedAlert('خطأ', 'انتهت معاملة التسجيل. الرجاء العودة وإعادة التسجيل.');
            setLoading(false);
            return;
          }
          const regRes = await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              full_name: registrationPayload.fullName,
              phone: registrationPayload.phone,
              email: registrationPayload.email,
              password: registrationPayload.password,
            }),
          });
          token = typeof regRes?.token === 'string' ? regRes.token : (regRes?.token?.accessToken || '');
          userData = regRes?.user;
        } else if (isGuest && !token) {
          showLocalizedAlert('خطأ', 'يلزم إتمام تسجيل آمن قبل تحويل الحساب الضيف.');
          setLoading(false);
          return;
        }
      }

      if (!token || !userData) {
        showLocalizedAlert('خطأ', 'رمز غير صحيح أو الحساب غير موجود');
        setLoading(false);
        return;
      }

      try {
        await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
        // Remove any legacy plaintext mirror but never fall back to it.
        await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      } catch {
        showLocalizedAlert('خطأ', 'تعذر تأمين الجلسة على هذا الجهاز.');
        setLoading(false);
        return;
      }
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true');
      
      dispatch(loginSuccess({ user: userData as any, token }));

      const decoded = decodeJwt(token);
      const userRole = decoded?.role || 'patient';
      if (userRole !== 'patient') {
        router.replace('/(auth)/provider-info' as any);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      showLocalizedAlert('خطأ', err.message || 'رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: resolveColor('var(--bg)', isDark) } ]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 20, paddingBottom: 120, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: resolveColor('var(--s)', isDark), borderColor: resolveColor('var(--bd)', isDark) } ]}>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 22, color: resolveColor('var(--n)', isDark) }}>
              {isRTL ? 'arrow_forward' : 'arrow_back'}
            </LocalizedText>
          </TouchableOpacity>

          <LocalizedText style={[styles.title, { textAlign: isRTL ? 'right' : 'left', color: resolveColor('var(--n)', isDark) } ]}>رمز التحقق</LocalizedText>
          <LocalizedText style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left', color: resolveColor('var(--t2)', isDark) } ]}>أدخل الرمز المكون من 6 أرقام المرسل إلى {params.email || phone}</LocalizedText>

          <View style={styles.otpContainer}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <TextInput
                key={i}
                ref={(el: any) => { inputs.current[i] = el; }}
                style={[
                  styles.otpInput,
                  { 
                    backgroundColor: resolveColor('var(--s)', isDark),
                    color: resolveColor('var(--n)', isDark),
                    borderColor: focusedIndex === i ? resolveColor('var(--p)', isDark) : resolveColor('var(--bd)', isDark) 
                  }
                ]}
                maxLength={1}
                keyboardType="number-pad"
                value={otp[i]}
                onChangeText={(text) => handleChange(text, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                onFocus={() => setFocusedIndex(i)}
                onBlur={() => setFocusedIndex(null)}
                selectTextOnFocus
              />
            ))}
          </View>

          <View style={styles.resendContainer}>
            <LocalizedText style={[styles.resendText, { color: resolveColor('var(--t3)', isDark) } ]}>
              {timer > 0 ? 'إعادة الإرسال خلال ' : 'لم يصلك الرمز؟ '}
            </LocalizedText>
            {timer > 0 ? (
              <LocalizedText style={[styles.timerText, { color: resolveColor('var(--p)', isDark) } ]}>
                00:{timer < 10 ? `0${timer}` : timer}
              </LocalizedText>
            ) : (
              <TouchableOpacity onPress={() => { setTimer(60); setOtp(['', '', '', '', '', '']); }}>
                <LocalizedText style={[styles.timerText, { color: resolveColor('var(--p)', isDark) } ]}>إعادة إرسال الرمز</LocalizedText>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            onPress={handleConfirm} 
            disabled={loading}
            style={[styles.primaryBtn, { backgroundColor: resolveColor('var(--p)', isDark), shadowColor: resolveColor('var(--p)', isDark), opacity: loading ? 0.7 : 1 }]} 
            activeOpacity={0.8}
          >
            <LocalizedText style={styles.primaryBtnText}>{loading ? 'جاري التحقق...' : 'تأكيد الرمز'}</LocalizedText>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 30
  },
  title: { fontSize: 26, fontWeight: '900', marginBottom: 6 },
  subtitle: { fontSize: 13, fontWeight: '600', marginBottom: 30, lineHeight: 22 },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    direction: 'ltr'
  },
  otpInput: {
    width: 45,
    height: 55,
    borderRadius: 14,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    marginHorizontal: 4
  },
  resendContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    marginBottom: 30
  },
  resendText: { fontSize: 13, fontWeight: '600' },
  timerText: { fontSize: 13, fontWeight: '800' },
  primaryBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' }
});
