import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button, Screen, StickyFooter } from "../../../packages/ui-native/src";
import { apiFetch } from "../../src/utils/api";
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { AuthAltLine, AuthBody, AuthFooter, AuthField, AuthTitle, AuthTopBar, useAuthUi } from '../../src/components/auth/AuthKit';

export default function ForgotPasswordScreen() {
  const { theme, tr } = useAuthUi();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email || !email.includes("@")) return;

    setLoading(true);
    try {
      await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier: email }),
      });
      setLoading(false);
      router.push({
        pathname: '/(auth)/otp',
        params: {
          email: email,
          mode: 'reset',
        },
      });
    } catch (err: any) {
      showLocalizedAlert("خطأ", err.message || "فشل إرسال رمز التحقق");
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
              label={tr(loading ? 'لحظة…' : 'إرسال رمز التحقق')}
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              theme={theme}
              onPress={handleSend}
              testID="forgot-submit"
            />
            <AuthAltLine link="العودة لتسجيل الدخول" onPress={() => router.back()} />
          </AuthFooter>
        </StickyFooter>
      }
    >
      <AuthBody>
      <AuthTopBar onBack={() => router.back()} />
      <AuthTitle title="نسيت كلمة المرور" sub="أدخل بريدك الإلكتروني وسنرسل لك رمز التحقق" />
      <View style={{ marginTop: 22, gap: 12 }}>
        <AuthField
          label="البريد الإلكتروني"
          placeholder="name@example.com"
          ltr
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          testID="forgot-email"
        />
      </View>
      </AuthBody>
    </Screen>
  );
}
