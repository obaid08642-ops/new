import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { Button, Screen, StickyFooter } from '../../../packages/ui-native/src';
import { apiFetch } from '../../src/utils/api';
import { isValidIdentifier, registerPatient } from '../../src/auth/patientAuth';
import { i18nManager } from '../../src/i18n/LanguageManager';
import { serverMessage } from '../../src/utils/serverMessage';
import { useSocialLogin, type SocialProvider } from '../../src/hooks/useSocialLogin';
import { useSocialConfig } from '../../src/hooks/useSocialConfig';

import { LocalizedText } from '../../src/components/LocalizedText';
import {
  AuthAltLine,
  AuthBody,
  AuthDivider,
  AuthFooter,
  AuthCheckbox,
  AuthError,
  AuthField,
  AuthTitle,
  AuthTopBar,
  SocialButtons,
  availableSocialProviders,
  FONT,
  useAuthUi,
} from '../../src/components/auth/AuthKit';

export default function RegisterScreen() {
  const { theme, tr, c } = useAuthUi();

  const [form, setForm] = useState({ name: '', identifier: '', password: '', confirmPw: '' });
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // the same four buttons as the login screen: a first social sign-in creates the account
  const social = useSocialLogin();
  const providers = availableSocialProviders(useSocialConfig());

  const validate = () => {
    setErrorMessage(null);
    if (!form.name || form.name.length < 3) { setErrorMessage('auth.register.errName'); return false; }
    if (!isValidIdentifier(form.identifier)) { setErrorMessage('auth.err.identifier'); return false; }
    if (!form.password || form.password.length < 8) { setErrorMessage('auth.err.passwordShort'); return false; }
    if (form.password !== form.confirmPw) { setErrorMessage('auth.err.mismatch'); return false; }
    if (!agreed) { setErrorMessage('auth.register.errAgree'); return false; }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await registerPatient(apiFetch, { name: form.name, identifier: form.identifier, password: form.password, locale: i18nManager.currentLanguage });
      setLoading(false);
      router.push({ pathname: '/(auth)/otp', params: { identifier: form.identifier.trim(), mode: 'register' } });
    } catch (err: any) {
      setErrorMessage(serverMessage(err, 'auth.forgot.sendFailed'));
      setLoading(false);
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
              label={tr(loading ? 'common.pleaseWait' : 'auth.createAccountSubmit')}
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              theme={theme}
              onPress={handleRegister}
              testID="register-submit"
            />
            <AuthDivider label="auth.orContinueWith" />
            <SocialButtons layout="icons" providers={providers} onPress={(p: SocialProvider) => { setErrorMessage(null); void social.signIn(p); }} disabled={loading || social.busy} />
            <AuthAltLine text="auth.haveAccount" link="auth.login" onPress={() => router.push('/(auth)/login')} />
          </AuthFooter>
        </StickyFooter>
      }
    >
      <AuthBody>
      <AuthTopBar onBack={() => router.back()} />
      <AuthTitle title="auth.createAccount" sub="auth.register.sub" />

      <View style={{ marginTop: 22, gap: 12 }}>
        <AuthField
          label="auth.register.name"
          placeholder="auth.register.namePlaceholder"
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          value={form.name}
          onChangeText={(t: string) => setForm({ ...form, name: t })}
          testID="register-name"
        />
        <AuthField
          label="auth.identifier"
          placeholder="name@example.com"
          ltr
          keyboardType="email-address"
          autoComplete="username"
          textContentType="username"
          value={form.identifier}
          onChangeText={(t: string) => setForm({ ...form, identifier: t })}
          testID="register-identifier"
        />
        <AuthField
          label="auth.password"
          hint="auth.passwordHint"
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          value={form.password}
          onChangeText={(t: string) => setForm({ ...form, password: t })}
          testID="register-password"
        />
        <AuthField
          label="auth.confirmPassword"
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          value={form.confirmPw}
          onChangeText={(t: string) => setForm({ ...form, confirmPw: t })}
          testID="register-confirm"
        />
        <AuthCheckbox checked={agreed} onToggle={() => setAgreed(!agreed)} label="auth.register.agree">
          <LocalizedText style={{ fontFamily: FONT.regular, fontSize: 13, lineHeight: 21, color: c.text.primary, textAlign: 'auto' }}>
            {'auth.register.agreePrefix'}{' '}
            <LocalizedText accessibilityRole="link" onPress={() => router.push('/(auth)/terms')} style={{ color: c.action.primary.bg, fontFamily: FONT.medium }}>{'auth.register.terms'}</LocalizedText>
            {' '}{'auth.register.and'}
            <LocalizedText accessibilityRole="link" onPress={() => router.push('/(auth)/privacy')} style={{ color: c.action.primary.bg, fontFamily: FONT.medium }}>{'auth.register.privacy'}</LocalizedText>
          </LocalizedText>
        </AuthCheckbox>
        <AuthError message={errorMessage ?? social.error} />
      </View>
      </AuthBody>
    </Screen>
  );
}
