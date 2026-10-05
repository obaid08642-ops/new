import React, { useState, useEffect, useRef } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useDispatch, useSelector } from 'react-redux';

import { Button, Screen, StickyFooter } from '../../../packages/ui-native/src';
import { apiFetch } from '../../src/utils/api';
import { STORAGE_KEYS } from '../../src/constants';
import { decodeJwt } from '../../src/utils/jwt';
import { loginSuccess } from '../../src/store/slices/authSlice';
import { LocalizedText } from '../../src/components/LocalizedText';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { consumeRegistrationTransaction } from '../../src/services/auth/RegistrationTransaction';
import { AuthAltLine, AuthBody, AuthFooter, AuthLink, AuthTitle, AuthTopBar, FONT, focusRing, useAuthUi } from '../../src/components/auth/AuthKit';

export default function OtpScreen() {
  const { theme, c, tr } = useAuthUi();
  const dispatch = useDispatch();
  const isGuest = useSelector((state: any) => state.auth.isGuest);
  const params = useLocalSearchParams();

  const mode = (params.mode as string) || 'login';
  const [registrationPayload] = useState(() => mode === 'register'
    ? consumeRegistrationTransaction(params.transactionId as string | undefined)
    : null);
  const phone = registrationPayload?.phone || (params.phone as string) || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6 digits for our backend
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
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

  // F75: resend calls the same send-OTP endpoint as the first send.
  const handleResend = async () => {
    if (resending || timer > 0) return;
    const identifier = registrationPayload?.email || (params.email as string) || phone;
    if (!identifier) {
      showLocalizedAlert('خطأ', 'تعذر تحديد الحساب لإعادة الإرسال');
      return;
    }
    setResending(true);
    try {
      await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier }),
      });
      setTimer(60);
      setOtp(['', '', '', '', '', '']);
    } catch (e: any) {
      showLocalizedAlert('خطأ', e?.message || 'فشلت إعادة الإرسال');
    } finally {
      setResending(false);
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
            showLocalizedAlert('خطأ', 'انتهت مهلة التسجيل. ارجع وأنشئ الحساب من جديد.');
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
          showLocalizedAlert('خطأ', 'أنشئ حسابًا أولًا لتكمل الدخول.');
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
        showLocalizedAlert('خطأ', 'تعذّر تسجيل الدخول على هذا الجهاز. حاول مرة أخرى.');
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

  const identifier = registrationPayload?.email || (params.email as string) || phone;
  const byEmail = identifier.includes('@');
  const countdown = `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`;

  return (
    <Screen
      theme={theme}
      keyboard
      scroll
      footer={
        <StickyFooter theme={theme}>
          <AuthFooter>
            <Button
              label={tr(loading ? 'لحظة…' : 'تأكيد')}
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              theme={theme}
              onPress={handleConfirm}
              testID="otp-submit"
            />
            <AuthAltLine link={byEmail ? 'تغيير البريد الإلكتروني' : 'تغيير رقم الجوال'} onPress={() => router.back()} />
          </AuthFooter>
        </StickyFooter>
      }
    >
      <AuthBody>
      <AuthTopBar onBack={() => router.back()} />
      <AuthTitle title={byEmail ? 'تأكيد البريد الإلكتروني' : 'تأكيد رقم الجوال'} sub="أرسلنا رمزًا من ٦ أرقام إلى">
        {identifier ? (
          <Text style={{ fontFamily: FONT.medium, color: c.text.primary }}>
            {' '}
            <Text style={{ writingDirection: 'ltr' }}>{identifier}</Text>
          </Text>
        ) : null}
      </AuthTitle>

      <View style={{ marginTop: 26, gap: 18 }}>
        <View accessibilityRole="none" accessibilityLabel={tr('رمز التحقق')} style={{ flexDirection: 'row', direction: 'ltr', gap: 8 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const active = focusedIndex === i;
            return (
              <TextInput
                key={i}
                ref={(el: TextInput | null) => { inputs.current[i] = el; }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 64,
                  borderRadius: 16,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? c.text.primary : c.border.subtle,
                  backgroundColor: c.bg.surface,
                  boxShadow: active ? focusRing(theme) : undefined,
                  textAlign: 'center',
                  fontFamily: FONT.bold,
                  fontSize: 26,
                  color: c.text.primary,
                  outlineStyle: 'none',
                } as object}
                maxLength={1}
                keyboardType="number-pad"
                textContentType={i === 0 ? 'oneTimeCode' : 'none'}
                autoComplete={i === 0 ? 'sms-otp' : 'off'}
                accessibilityLabel={`${tr('رمز التحقق')} ${i + 1}`}
                value={otp[i]}
                onChangeText={(text) => handleChange(text, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                onFocus={() => setFocusedIndex(i)}
                onBlur={() => setFocusedIndex(null)}
                selectTextOnFocus
                testID={`otp-box-${i}`}
              />
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          {timer > 0 ? (
            <>
              <LocalizedText style={{ flex: 1, fontFamily: FONT.regular, fontSize: 14, lineHeight: 21, color: c.text.secondary, textAlign: 'auto' }}>
                لم يصلك الرمز؟ راجع مجلد الرسائل غير المرغوبة
              </LocalizedText>
              <Text accessibilityLabel={`${tr('إعادة الإرسال خلال')} ${countdown}`} style={{ fontFamily: FONT.bold, fontSize: 14, color: c.text.primary, writingDirection: 'ltr' }}>
                {countdown}
              </Text>
            </>
          ) : (
            <>
              <LocalizedText style={{ fontFamily: FONT.regular, fontSize: 14, color: c.text.secondary }}>لم يصلك الرمز؟</LocalizedText>
              <AuthLink label="إعادة إرسال الرمز" weight="bold" disabled={resending} onPress={() => void handleResend()} />
            </>
          )}
        </View>
      </View>
      </AuthBody>
    </Screen>
  );
}
