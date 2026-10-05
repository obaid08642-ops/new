import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { Button, Screen, StickyFooter } from '../../../packages/ui-native/src';
import { apiFetch } from '../../src/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../../src/constants';
import { decodeJwt } from '../../src/utils/jwt';
import { createRegistrationTransaction } from '../../src/services/auth/RegistrationTransaction';

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import { LocalizedText } from '../../src/components/LocalizedText';
import {
  AuthAltLine,
  AuthBody,
  AuthFooter,
  AuthCheckbox,
  AuthError,
  AuthField,
  AuthTitle,
  AuthTopBar,
  FONT,
  useAuthUi,
} from '../../src/components/auth/AuthKit';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const { theme, tr, c } = useAuthUi();

  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirmPw: '' });
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  });

  React.useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      handleOAuthBackend('google', response.authentication.accessToken);
    }
  }, [response]);

  const [reqX, resX, promptAsyncX] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_X_CLIENT_ID || '',
      scopes: ['tweet.read', 'users.read', 'offline.access'],
      redirectUri: AuthSession.makeRedirectUri({ scheme: 'nabdplus' }),
    },
    { authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize', tokenEndpoint: 'https://api.twitter.com/2/oauth2/token' }
  );

  const [reqSnap, resSnap, promptAsyncSnap] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_SNAPCHAT_CLIENT_ID || '',
      scopes: ['https://auth.snapchat.com/oauth2/api/user.display_name'],
      redirectUri: AuthSession.makeRedirectUri({ scheme: 'nabdplus' }),
    },
    { authorizationEndpoint: 'https://accounts.snapchat.com/accounts/oauth2/auth', tokenEndpoint: 'https://accounts.snapchat.com/accounts/oauth2/token' }
  );

  React.useEffect(() => {
    if (resX?.type === 'success' && resX.authentication?.accessToken) {
      handleOAuthBackend('x', resX.authentication.accessToken);
    }
  }, [resX]);

  React.useEffect(() => {
    if (resSnap?.type === 'success' && resSnap.authentication?.accessToken) {
      handleOAuthBackend('snapchat', resSnap.authentication.accessToken);
    }
  }, [resSnap]);

  const handleOAuthBackend = async (provider: string, token: string) => {
    try {
      setLoading(true);
      const res = await apiFetch('/auth/social-login', {
        method: 'POST',
        body: JSON.stringify({ provider, token }),
      });
      // M1: real session only — no dummy token fallback
      const jwtToken = typeof res?.token === 'string' ? res.token : (res?.token?.accessToken || null);
      if (!jwtToken) throw new Error('تعذّر تسجيل الدخول الآن. حاول مرة أخرى.');
      try { await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, jwtToken); }
      catch (_err) { await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, jwtToken); }
      
      const decoded = decodeJwt(jwtToken);
      if (decoded?.role !== 'patient') {
        router.replace('/(auth)/provider-info' as any);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setErrorMessage(err.message || `فشل التسجيل بواسطة ${provider}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        handleOAuthBackend('apple', credential.identityToken);
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        setErrorMessage('فشل التسجيل عبر آبل');
      }
    }
  };

  const validate = () => {
    setErrorMessage(null);
    if (!form.name || form.name.length < 3) { setErrorMessage('الاسم مطلوب (3 أحرف على الأقل)'); return false; }
    if (!form.phone || form.phone.length < 9) { setErrorMessage('رقم هاتف صحيح مطلوب'); return false; }
    if (!form.email || !form.email.includes('@')) { setErrorMessage('البريد الإلكتروني مطلوب وصحيح'); return false; }
    if (!form.password || form.password.length < 6) { setErrorMessage('كلمة المرور 6 أحرف على الأقل'); return false; }
    if (form.password !== form.confirmPw) { setErrorMessage('كلمتا المرور غير متطابقتين'); return false; }
    if (!agreed) { setErrorMessage('يرجى الموافقة على الشروط والأحكام أولاً'); return false; }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email: form.email.trim().toLowerCase(), purpose: 'register' }),
      });
      setLoading(false);
      // Forcing +966 for real backend
      const fullPhone = form.phone.startsWith('+') ? form.phone : `+966${form.phone.replace(/^0+/, '')}`;
      const registrationTransactionId = createRegistrationTransaction({
        fullName: form.name,
        phone: fullPhone,
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      router.push({
        pathname: '/(auth)/otp',
        params: {
          transactionId: registrationTransactionId,
          mode: 'register',
        },
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل إرسال رمز التحقق');
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    if (provider === 'google') {
      promptAsync();
    } else if (provider === 'apple') {
      handleAppleLogin();
    } else if (provider === 'x' || provider === 'twitter') {
      promptAsyncX();
    } else if (provider === 'snapchat') {
      promptAsyncSnap();
    } else {
      setErrorMessage('مزود تسجيل الدخول غير مدعوم حالياً.');
    }
  };


  return (
    <Screen
      theme={theme}
      keyboard
      scroll
      footer={
        <StickyFooter theme={theme}>
          <AuthFooter>
            <Button
              label={tr(loading ? 'لحظة…' : 'إنشاء الحساب')}
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              theme={theme}
              onPress={handleRegister}
              testID="register-submit"
            />
            <AuthAltLine text="لديك حساب؟" link="تسجيل الدخول" onPress={() => router.push('/(auth)/login')} />
          </AuthFooter>
        </StickyFooter>
      }
    >
      <AuthBody>
      <AuthTopBar onBack={() => router.back()} />
      <AuthTitle title="إنشاء حساب" sub="دقيقة واحدة، وبعدها تطلب وتحجز بسهولة" />

      <View style={{ marginTop: 22, gap: 12 }}>
        <AuthField
          label="الاسم الكامل"
          placeholder="كما في الهوية"
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          value={form.name}
          onChangeText={(t: string) => setForm({ ...form, name: t })}
          testID="register-name"
        />
        <AuthField
          label="البريد الإلكتروني"
          placeholder="name@example.com"
          hint="نرسل عليه رمز التأكيد وفواتيرك"
          ltr
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          value={form.email}
          onChangeText={(t: string) => setForm({ ...form, email: t })}
          testID="register-email"
        />
        <AuthField
          label="رقم الجوال"
          placeholder="5X XXX XXXX"
          hint="للتواصل بخصوص طلباتك فقط"
          prefix="+966"
          ltr
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          value={form.phone}
          onChangeText={(t: string) => setForm({ ...form, phone: t.replace(/\D/g, '') })}
          testID="register-phone"
        />
        <AuthField
          label="كلمة المرور"
          hint="٦ أحرف على الأقل"
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          value={form.password}
          onChangeText={(t: string) => setForm({ ...form, password: t })}
          testID="register-password"
        />
        <AuthField
          label="تأكيد كلمة المرور"
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          value={form.confirmPw}
          onChangeText={(t: string) => setForm({ ...form, confirmPw: t })}
          testID="register-confirm"
        />
        <AuthCheckbox checked={agreed} onToggle={() => setAgreed(!agreed)} label="أوافق على الشروط والأحكام وسياسة الخصوصية">
          <LocalizedText style={{ fontFamily: FONT.regular, fontSize: 13, lineHeight: 21, color: c.text.primary, textAlign: 'auto' }}>
            {'أوافق على'}{' '}
            <LocalizedText accessibilityRole="link" onPress={() => router.push('/(auth)/terms')} style={{ color: c.action.primary.bg, fontFamily: FONT.medium }}>الشروط والأحكام</LocalizedText>
            {' '}{'و'}
            <LocalizedText accessibilityRole="link" onPress={() => router.push('/(auth)/privacy')} style={{ color: c.action.primary.bg, fontFamily: FONT.medium }}>سياسة الخصوصية</LocalizedText>
          </LocalizedText>
        </AuthCheckbox>
        <AuthError message={errorMessage} />
      </View>
      </AuthBody>
    </Screen>
  );
}
