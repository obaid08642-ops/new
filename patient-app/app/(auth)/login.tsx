import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { Button, Screen, StickyFooter } from '../../../packages/ui-native/src';
// storeAuthSession lives in the shared network client (root utils/api.ts) —
// src/utils/api.ts is a legacy thin wrapper that does not export it.
import { apiFetch, storeAuthSession } from '../../utils/api';
import { decodeJwt } from '../../src/utils/jwt';
import { STORAGE_KEYS } from '../../src/constants';

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import {
  AuthAltLine,
  AuthBody,
  AuthFooter,
  AuthDivider,
  AuthError,
  AuthField,
  AuthLink,
  AuthTitle,
  AuthTopBar,
  SocialButtons,
  availableSocialProviders,
  useAuthUi,
} from '../../src/components/auth/AuthKit';
import { loginCredentials } from '../../src/utils/login-credentials';

WebBrowser.maybeCompleteAuthSession();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

export default function LoginScreen() {
  const { theme, lang, tr } = useAuthUi();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;

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
      // M1: no more dummy token fallback — a real session or an explicit error
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
      setErrorMessage(err.message || `فشل تسجيل الدخول بواسطة ${provider}`);
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
        setErrorMessage('فشل تسجيل الدخول عبر آبل');
      }
    }
  };

  const handleLogin = async () => {
    setErrorMessage(null);
    if (isLockedOut) {
      const remaining = Math.ceil((lockoutUntil! - Date.now()) / 60000);
      setErrorMessage(`تم تجاوز المحاولات. حاول بعد ${remaining} دقائق`);
      return;
    }
    if (!phone || phone.length < 9) { 
      setErrorMessage('أدخل بريد إلكتروني أو هاتف صحيح'); 
      return; 
    }
    if (!password || password.length < 6) { 
      setErrorMessage('كلمة المرور 6 أحرف على الأقل'); 
      return; 
    }
    
    setLoading(true);
    try {
        const res = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify(loginCredentials(phone, password)),
        });
        // M1: backend returns { user, token: { accessToken, refreshToken } }
        const token = typeof res?.token === 'string' ? res.token : (res?.token?.accessToken || null);

      if (!token) {
        setAttempts(prev => {
          const next = prev + 1;
          if (next >= MAX_ATTEMPTS) setLockoutUntil(Date.now() + LOCKOUT_MS);
          return next;
        });
        setErrorMessage('تحقق من البيانات وحاول مجدداً');
        setLoading(false);
        return;
      }
      
      // M1: persist both access + refresh tokens through the shared session helper
      await storeAuthSession(res?.token);
      setAttempts(0);
      setLockoutUntil(null);

      const decoded = decodeJwt(token);
      const userRole = decoded?.role || 'patient';
      if (userRole !== 'patient') {
        router.replace('/(auth)/provider-info' as any);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) { 
      setErrorMessage(err.message || 'فشل تسجيل الدخول، حاول مجدداً');
      setAttempts(prev => {
        const next = prev + 1;
        if (next >= MAX_ATTEMPTS) setLockoutUntil(Date.now() + LOCKOUT_MS);
        return next;
      });
    }
    setLoading(false);
  };

  const googleConfigured = Boolean(
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
  );

  const handleSocialLogin = async (provider: string) => {
    if (provider === 'google') {
      if (!googleConfigured) {
        setErrorMessage('تسجيل الدخول عبر Google غير متاح حالياً.');
        return;
      }
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

  const providers = availableSocialProviders();

  return (
    <Screen
      theme={theme}
      keyboard
      scroll
      footer={
        <StickyFooter theme={theme}>
          <AuthFooter>
            <Button
              label={tr(loading ? 'لحظة…' : 'تسجيل الدخول')}
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              theme={theme}
              onPress={handleLogin}
              testID="login-submit"
            />
            {providers.length ? (
              <>
                <AuthDivider label="أو تابع عبر" />
                <SocialButtons layout="icons" providers={providers} onPress={handleSocialLogin} disabled={loading} />
              </>
            ) : null}
            <AuthAltLine text="ليس لديك حساب؟" link="إنشاء حساب" onPress={() => router.push('/(auth)/register')} />
          </AuthFooter>
        </StickyFooter>
      }
    >
      <AuthBody>
      <AuthTopBar onBack={() => router.back()} />
      <AuthTitle title="تسجيل الدخول" sub="بالبريد الإلكتروني أو رقم الجوال وكلمة المرور" />

      <View style={{ marginTop: 22, gap: 12 }}>
        <AuthField
          label="البريد الإلكتروني أو رقم الجوال"
          placeholder="name@example.com"
          ltr
          keyboardType="email-address"
          autoComplete="username"
          textContentType="username"
          value={phone}
          onChangeText={setPhone}
          testID="login-identifier"
        />
        <AuthField
          label="كلمة المرور"
          secure
          autoComplete="password"
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          testID="login-password"
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AuthLink label="نسيت كلمة المرور؟" onPress={() => router.push('/(auth)/forgot-password')} />
          <AuthLink
            label="الدخول برمز التحقق"
            onPress={() => router.push({ pathname: '/(auth)/otp', params: { phone: '+966' + phone.replace(/^0+/, ''), mode: 'login' } })}
          />
        </View>
        <AuthError message={errorMessage} />
      </View>
      </AuthBody>
    </Screen>
  );
}
