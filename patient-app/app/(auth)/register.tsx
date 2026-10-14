import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { Button, Screen, StickyFooter } from '../../../packages/ui-native/src';
import { apiFetch } from '../../src/utils/api';
import { createRegistrationTransaction } from '../../src/services/auth/RegistrationTransaction';
import { serverMessage } from '../../src/utils/serverMessage';

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

export default function RegisterScreen() {
  const { theme, tr, c } = useAuthUi();

  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirmPw: '' });
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validate = () => {
    setErrorMessage(null);
    if (!form.name || form.name.length < 3) { setErrorMessage('auth.register.errName'); return false; }
    if (!form.phone || form.phone.length < 9) { setErrorMessage('auth.register.errPhone'); return false; }
    if (!form.email || !form.email.includes('@')) { setErrorMessage('auth.register.errEmail'); return false; }
    if (!form.password || form.password.length < 6) { setErrorMessage('auth.err.passwordShort'); return false; }
    if (form.password !== form.confirmPw) { setErrorMessage('auth.err.mismatch'); return false; }
    if (!agreed) { setErrorMessage('auth.register.errAgree'); return false; }
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
          label="auth.email"
          placeholder="name@example.com"
          hint="auth.register.emailHint"
          ltr
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          value={form.email}
          onChangeText={(t: string) => setForm({ ...form, email: t })}
          testID="register-email"
        />
        <AuthField
          label="auth.register.phone"
          placeholder="auth.register.phonePlaceholder"
          hint="auth.register.phoneHint"
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
        <AuthError message={errorMessage} />
      </View>
      </AuthBody>
    </Screen>
  );
}
