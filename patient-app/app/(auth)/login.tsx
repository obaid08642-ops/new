import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Screen, StickyFooter } from '../../../packages/ui-native/src';
// storeAuthSession lives in the shared network client (root utils/api.ts) —
// src/utils/api.ts is a legacy thin wrapper that does not export it.
import { apiFetch, storeAuthSession } from '../../utils/api';
import { decodeJwt } from '../../src/utils/jwt';
import { useSocialLogin, type SocialProvider } from '../../src/hooks/useSocialLogin';
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

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

export default function LoginScreen() {
  const { theme, tr } = useAuthUi();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;

  const social = useSocialLogin();

  const handleLogin = async () => {
    setErrorMessage(null);
    social.clearError();
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
            <AuthDivider label="أو تابع عبر" />
            <SocialButtons layout="icons" providers={providers} onPress={(p: SocialProvider) => { setErrorMessage(null); void social.signIn(p); }} disabled={loading || social.busy} />
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
        <View style={{ alignItems: 'flex-start' }}>
          <AuthLink label="نسيت كلمة المرور؟" onPress={() => router.push('/(auth)/forgot-password')} />
        </View>
        <AuthError message={errorMessage ?? social.error} />
      </View>
      </AuthBody>
    </Screen>
  );
}
