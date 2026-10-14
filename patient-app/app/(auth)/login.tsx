import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, Screen, StickyFooter } from '../../../packages/ui-native/src';
// storeAuthSession lives in the shared network client (root utils/api.ts) —
// src/utils/api.ts is a legacy thin wrapper that does not export it.
import { useDispatch } from 'react-redux';
import { apiFetch } from '../../utils/api';
import { startSession } from '../../src/utils/authSession';
import { serverMessage } from '../../src/utils/serverMessage';
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
import { isValidIdentifier, loginCredentials } from '../../src/utils/login-credentials';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

export default function LoginScreen() {
  const { theme, tr } = useAuthUi();
  const dispatch = useDispatch();

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
      setErrorMessage(tr("auth.err.lockedOut").replace("{n}", String(remaining)));
      return;
    }
    if (!isValidIdentifier(phone)) {
      setErrorMessage('auth.err.identifier');
      return;
    }
    if (!password || password.length < 6) { 
      setErrorMessage('auth.err.passwordShort'); 
      return; 
    }
    
    setLoading(true);
    try {
        // skipAuth: a wrong password answers 401, which must not delete the guest session that is stored, and the
        // request must not carry that guest's token either.
        const res = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify(loginCredentials(phone, password)),
          skipAuth: true,
        });
        // M1: backend returns { user, token: { accessToken, refreshToken } }
      const session = await startSession(res, dispatch);

      if (!session.ok && session.reason === 'not_stored') {
        setErrorMessage('auth.err.notStored');
        setLoading(false);
        return;
      }
      if (!session.ok) {
        setAttempts(prev => {
          const next = prev + 1;
          if (next >= MAX_ATTEMPTS) setLockoutUntil(Date.now() + LOCKOUT_MS);
          return next;
        });
        setErrorMessage('auth.err.checkData');
        setLoading(false);
        return;
      }
      
      // both tokens are stored and the auth slice knows the signed-in user (startSession)
      setAttempts(0);
      setLockoutUntil(null);

      if (session.role !== 'patient') {
        router.replace('/(auth)/provider-info' as any);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) { 
      setErrorMessage(serverMessage(err, 'auth.err.loginFailed'));
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
              label={tr(loading ? 'common.pleaseWait' : 'auth.login')}
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              theme={theme}
              onPress={handleLogin}
              testID="login-submit"
            />
            <AuthDivider label="auth.orContinueWith" />
            <SocialButtons layout="icons" providers={providers} onPress={(p: SocialProvider) => { setErrorMessage(null); void social.signIn(p); }} disabled={loading || social.busy} />
            <AuthAltLine text="auth.noAccount" link="auth.createAccount" onPress={() => router.push('/(auth)/register')} />
          </AuthFooter>
        </StickyFooter>
      }
    >
      <AuthBody>
      <AuthTopBar onBack={() => router.back()} />
      <AuthTitle title="auth.login" sub="auth.loginSub" />

      <View style={{ marginTop: 22, gap: 12 }}>
        <AuthField
          label="auth.identifier"
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
          label="auth.password"
          secure
          autoComplete="password"
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          testID="login-password"
        />
        <View style={{ alignItems: 'flex-start' }}>
          <AuthLink label="auth.forgotLink" onPress={() => router.push('/(auth)/forgot-password')} />
        </View>
        <AuthError message={errorMessage ?? social.error} />
      </View>
      </AuthBody>
    </Screen>
  );
}
