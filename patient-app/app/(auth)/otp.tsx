// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { LocalizedText as Text } from '@/components/LocalizedText';
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

export default function OtpScreen() {
  const { isDark, lang } = useApp() as any;
  const dispatch = useDispatch();
  const isGuest = useSelector((state: any) => state.auth.isGuest);
  const params = useLocalSearchParams();

  const phone = (params.phone as string) || '';
  const mode = (params.mode as string) || 'login';

  const isRTL = lang === 'ar' || lang === 'ur';

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
      Alert.alert('خطأ', 'الرجاء إدخال الرمز المكون من 6 أرقام كاملاً');
      return;
    }
    
    setLoading(true);
    try {
      const emailParam = (params.email as string) || '';
      
      const resOtp = await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: emailParam,
          code: code,
        }),
      });

      let token = resOtp.token || '';
      let userData = resOtp.user || null;

      if (resOtp.verified) {
        if (mode === 'reset') {
          router.replace({ pathname: '/(auth)/reset-password', params: { email: emailParam } });
          setLoading(false);
          return;
        }
        if (mode === 'register') {
          const regRes = await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              full_name: params.full_name,
              phone: phone,
              email: emailParam,
              password: params.password,
            }),
          });
          token = regRes.token;
          userData = regRes.user;
        } else if (isGuest && !token) {
          try {
            const fullName = params.full_name as string | undefined;
            const password = params.password as string | undefined;
            if (!fullName || !password) {
              Alert.alert('خطأ', 'تعذر تحويل حساب الضيف لأن بيانات التسجيل غير مكتملة.');
              setLoading(false);
              return;
            }
            const convertRes = await apiFetch<any>('/auth/convert-guest', {
              method: 'POST',
              body: JSON.stringify({
                full_name: fullName,
                phone: phone,
                password,
                email: emailParam,
              }),
            });
            token = convertRes.token;
            userData = convertRes.user;
            await AsyncStorage.setItem(STORAGE_KEYS.GUEST_MODE ?? '@nabdah_guest', 'false');
          } catch (_) {}
        }
      }

      if (!token || !userData) {
        Alert.alert('خطأ', 'رمز غير صحيح أو الحساب غير موجود');
        setLoading(false);
        return;
      }

      try { await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token); }
      catch (_err) { await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token); }
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
      Alert.alert('خطأ', err.message || 'رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: resolveColor('var(--bg)', isDark) } ]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 20, paddingBottom: 120, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: resolveColor('var(--s)', isDark), borderColor: resolveColor('var(--bd)', isDark) } ]}>
            <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 22, color: resolveColor('var(--n)', isDark) }}>
              {isRTL ? 'arrow_forward' : 'arrow_back'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left', color: resolveColor('var(--n)', isDark) } ]}>رمز التحقق</Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left', color: resolveColor('var(--t2)', isDark) } ]}>أدخل الرمز المكون من 6 أرقام المرسل إلى {params.email || phone}</Text>

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
            <Text style={[styles.resendText, { color: resolveColor('var(--t3)', isDark) } ]}>
              {timer > 0 ? 'إعادة الإرسال خلال ' : 'لم يصلك الرمز؟ '}
            </Text>
            {timer > 0 ? (
              <Text style={[styles.timerText, { color: resolveColor('var(--p)', isDark) } ]}>
                00:{timer < 10 ? `0${timer}` : timer}
              </Text>
            ) : (
              <TouchableOpacity onPress={() => { setTimer(60); setOtp(['', '', '', '', '', '']); }}>
                <Text style={[styles.timerText, { color: resolveColor('var(--p)', isDark) } ]}>إعادة إرسال الرمز</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            onPress={handleConfirm} 
            disabled={loading}
            style={[styles.primaryBtn, { backgroundColor: resolveColor('var(--p)', isDark), shadowColor: resolveColor('var(--p)', isDark), opacity: loading ? 0.7 : 1 }]} 
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>{loading ? 'جاري التحقق...' : 'تأكيد الرمز'}</Text>
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
