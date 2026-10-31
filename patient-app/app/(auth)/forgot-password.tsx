import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button, Screen, StickyFooter } from "../../../packages/ui-native/src";
import { apiFetch } from "../../src/utils/api";
import { AuthAltLine, AuthBody, AuthError, AuthFooter, AuthField, AuthTitle, AuthTopBar, useAuthUi } from '../../src/components/auth/AuthKit';
import { forgotPassword, isValidIdentifier } from '../../src/auth/patientAuth';
import { serverMessage } from '../../src/utils/serverMessage';

export default function ForgotPasswordScreen() {
  const { theme, tr } = useAuthUi();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSend = async () => {
    const identifier = email.trim();
    if (!identifier) { setErrorMessage("auth.forgot.errEmpty"); return; }
    if (!isValidIdentifier(identifier)) { setErrorMessage("auth.err.identifier"); return; }
    setErrorMessage(null);

    setLoading(true);
    try {
      await forgotPassword(apiFetch, identifier);
      setLoading(false);
      setSent(true);
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
            {sent ? (
              <Button label={tr('auth.forgot.back')} variant="primary" size="lg" fullWidth theme={theme} onPress={() => router.replace('/(auth)/login')} testID="forgot-back" />
            ) : (
              <>
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
              </>
            )}
          </AuthFooter>
        </StickyFooter>
      }
    >
      <AuthBody>
      <AuthTopBar onBack={() => router.back()} />
      <AuthTitle title={sent ? "auth.forgot.sentTitle" : "auth.forgot.title"} sub={sent ? "auth.forgot.sentBody" : "auth.forgot.sub"} />
      {sent ? null : <View style={{ marginTop: 22, gap: 12 }}>
        <AuthField
          label="auth.identifier"
          placeholder="name@example.com"
          ltr
          keyboardType="email-address"
          autoComplete="username"
          textContentType="username"
          value={email}
          onChangeText={setEmail}
          testID="forgot-email"
        />
        <AuthError message={errorMessage} />
      </View>}
      </AuthBody>
    </Screen>
  );
}
