import React, { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Icon, Screen, StickyFooter } from "../../../packages/ui-native/src";
import { apiFetch } from "../../src/utils/api";
import { LocalizedText } from '../../src/components/LocalizedText';
import { AuthBody, AuthError, AuthField, AuthFooter, AuthTitle, AuthTopBar, FONT, useAuthUi } from '../../src/components/auth/AuthKit';
import { serverMessage } from '../../src/utils/serverMessage';
import { isValidEmail } from '../../src/utils/login-credentials';

export default function ResetPasswordScreen() {
  const { theme, c, tr } = useAuthUi();
  const params = useLocalSearchParams();
  // The email and the code come from the code screen. The backend verifies the code here, once (it consumes it),
  // so the code arrives pre-filled and stays editable; opened without the email (a link, a restart) the screen asks for it.
  const emailParam = ((params.email as string) || "").trim();
  const [emailInput, setEmailInput] = useState("");
  const email = (emailParam || emailInput).trim().toLowerCase();
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [code, setCode] = useState(((params.code as string) || "").trim());
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleReset = async () => {
    // say what is wrong instead of doing nothing
    if (!isValidEmail(email)) { setErrorMessage("auth.reset.errEmail"); return; }
    if (!code.trim()) { setErrorMessage("errors.codeRequired"); return; }
    if (pw.length < 6) { setErrorMessage("auth.err.passwordShort"); return; }
    if (pw !== confirmPw) { setErrorMessage("auth.err.mismatch"); return; }
    setErrorMessage(null);
    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          identifier: email,
          password: pw,
          code: code.trim(),
        }),
      });
      setLoading(false);
      setDone(true);
    } catch (err: any) {
      setErrorMessage(serverMessage(err, "auth.reset.saveFailed"));
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Screen
        theme={theme}
        footer={
          <StickyFooter theme={theme}>
            <AuthFooter>
              <Button
                label={tr('auth.login')}
                variant="primary"
                size="lg"
                fullWidth
                theme={theme}
                onPress={() => router.replace("/(auth)/login")}
                testID="reset-done-login"
              />
            </AuthFooter>
          </StickyFooter>
        }
      >
        <AuthBody>
          <AuthTopBar />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.status.success.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={34} theme={theme} color={c.status.success.fg} />
            </View>
            <LocalizedText accessibilityRole="header" style={{ fontFamily: FONT.bold, fontSize: 24, lineHeight: 32, color: c.text.primary, textAlign: 'center' }}>
              {'auth.reset.doneTitle'}
            </LocalizedText>
            <LocalizedText style={{ fontFamily: FONT.regular, fontSize: 15, lineHeight: 24, color: c.text.secondary, textAlign: 'center' }}>
              {'auth.reset.doneBody'}
            </LocalizedText>
          </View>
        </AuthBody>
      </Screen>
    );
  }

  const mismatch = Boolean(confirmPw) && pw !== confirmPw;
  return (
    <Screen
      theme={theme}
      keyboard
      scroll
      footer={
        <StickyFooter theme={theme}>
          <AuthFooter>
            <Button
              label={tr(loading ? 'common.pleaseWait' : 'auth.reset.submit')}
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              theme={theme}
              onPress={handleReset}
              testID="reset-submit"
            />
          </AuthFooter>
        </StickyFooter>
      }
    >
      <AuthBody>
      <AuthTopBar onBack={() => router.back()} />
      <AuthTitle title="auth.reset.title" sub="auth.reset.sub" />
      <View style={{ marginTop: 22, gap: 12 }}>
        {emailParam ? null : (
          <AuthField
            label="auth.email"
            placeholder="name@example.com"
            ltr
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            value={emailInput}
            onChangeText={setEmailInput}
            testID="reset-email"
          />
        )}
        <AuthField
          label="auth.code"
          placeholder="auth.reset.codePlaceholder"
          ltr
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          value={code}
          onChangeText={setCode}
          testID="reset-code"
        />
        <AuthField
          label="auth.reset.newPassword"
          hint="auth.passwordHint"
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          value={pw}
          onChangeText={setPw}
          testID="reset-password"
        />
        <AuthField
          label="auth.confirmPassword"
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          value={confirmPw}
          onChangeText={setConfirmPw}
          error={mismatch ? "auth.err.mismatch" : undefined}
          testID="reset-confirm"
        />
        <AuthError message={errorMessage} />
      </View>
      </AuthBody>
    </Screen>
  );
}
