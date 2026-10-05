import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button, Screen, StickyFooter } from "../../../packages/ui-native/src";
import { apiFetch } from "../../src/utils/api";
import { AuthAltLine, AuthBody, AuthError, AuthFooter, AuthField, AuthTitle, AuthTopBar, useAuthUi } from '../../src/components/auth/AuthKit';
import { isValidEmail } from '../../src/utils/login-credentials';
import { serverMessage } from '../../src/utils/serverMessage';

export default function ForgotPasswordScreen() {
  const { theme, tr } = useAuthUi();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSend = async () => {
    const identifier = email.trim().toLowerCase();
    if (!identifier) { setErrorMessage("auth.forgot.errEmpty"); return; }
    if (!isValidEmail(identifier)) { setErrorMessage("auth.forgot.errInvalid"); return; }
    setErrorMessage(null);

    setLoading(true);
    try {
      await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier }),
      });
      setLoading(false);
      router.push({
        pathname: '/(auth)/otp',
        params: {
          email: identifier,
          mode: 'reset',
        },
      });
    } catch (err: any) {
      setErrorMessage(serverMessage(err, "auth.forgot.sendFailed"));
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
              label={tr(loading ? 'common.pleaseWait' : 'auth.forgot.submit')}
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              theme={theme}
              onPress={handleSend}
              testID="forgot-submit"
            />
            <AuthAltLine link="auth.forgot.back" onPress={() => router.back()} />
          </AuthFooter>
        </StickyFooter>
      }
    >
      <AuthBody>
      <AuthTopBar onBack={() => router.back()} />
      <AuthTitle title="auth.forgot.title" sub="auth.forgot.sub" />
      <View style={{ marginTop: 22, gap: 12 }}>
        <AuthField
          label="auth.email"
          placeholder="name@example.com"
          ltr
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          testID="forgot-email"
        />
        <AuthError message={errorMessage} />
      </View>
      </AuthBody>
    </Screen>
  );
}
