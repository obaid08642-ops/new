import React, { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Icon, Screen, StickyFooter } from "../../../packages/ui-native/src";
import { apiFetch } from "../../src/utils/api";
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { LocalizedText } from '../../src/components/LocalizedText';
import { AuthBody, AuthField, AuthFooter, AuthTitle, AuthTopBar, FONT, useAuthUi } from '../../src/components/auth/AuthKit';

export default function ResetPasswordScreen() {
  const { theme, c, tr } = useAuthUi();
  const params = useLocalSearchParams();
  const email = (params.email as string) || "";
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    if (pw.length < 6 || pw !== confirmPw || !code.trim()) return;
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
      showLocalizedAlert("خطأ", err.message || "فشل حفظ كلمة المرور الجديدة");
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
                label={tr('تسجيل الدخول')}
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
              تم تغيير كلمة المرور
            </LocalizedText>
            <LocalizedText style={{ fontFamily: FONT.regular, fontSize: 15, lineHeight: 24, color: c.text.secondary, textAlign: 'center' }}>
              يمكنك الآن تسجيل الدخول بكلمة مرورك الجديدة
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
              label={tr(loading ? 'لحظة…' : 'حفظ كلمة المرور')}
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
      <AuthTitle title="كلمة مرور جديدة" sub="أدخل الرمز الذي وصلك، ثم اختر كلمة مرور جديدة" />
      <View style={{ marginTop: 22, gap: 12 }}>
        <AuthField
          label="رمز التحقق"
          placeholder="٦ أرقام"
          ltr
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          value={code}
          onChangeText={setCode}
          testID="reset-code"
        />
        <AuthField
          label="كلمة المرور الجديدة"
          hint="٦ أحرف على الأقل"
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          value={pw}
          onChangeText={setPw}
          testID="reset-password"
        />
        <AuthField
          label="تأكيد كلمة المرور"
          secure
          autoComplete="new-password"
          textContentType="newPassword"
          value={confirmPw}
          onChangeText={setConfirmPw}
          error={mismatch ? "كلمتا المرور غير متطابقتين" : undefined}
          testID="reset-confirm"
        />
      </View>
      </AuthBody>
    </Screen>
  );
}
