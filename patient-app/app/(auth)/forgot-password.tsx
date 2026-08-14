// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Text,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText, Button, Input, IconButton } from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
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
      Alert.alert("خطأ", err.message || "فشل إرسال رمز التحقق");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[st.c, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View
        style={[
          st.hdr,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <View style={{ width: 40 }} />
        <AppText variant="h4">نسيت كلمة المرور</AppText>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.borderLight,
          }}
        >
          <Text
            style={{
              fontFamily: "MaterialSymbolsRounded",
              color: colors.textPrimary,
              fontSize: 24,
            }}
          >
            {lang === "ar" ? "arrow_forward" : "arrow_back"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={st.body}>
        <View
          style={[st.iconCircle, { backgroundColor: colors.warningSurface }]}
        >
          <Icon name="lock" size={32} color={colors.warning} />
        </View>
        <AppText variant="h3" align="center">
          استعادة الحساب
        </AppText>
        <AppText variant="bodySM" color={colors.textTertiary} align="center">
          أدخل بريدك الإلكتروني وسنرسل لك رمز التحقق
        </AppText>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="البريد الإلكتروني"
          icon="mail"
          keyboardType="email-address"
          style={{ width: "100%", marginTop: 20 }}
        />
        <Button
          label="إرسال رمز التحقق"
          variant="gradient"
          size="lg"
          loading={loading}
          onPress={handleSend}
          style={{ marginTop: 16 }}
        />
        <Button
          label="العودة لتسجيل الدخول"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  body: {
    flex: 1,
    alignItems: "center",
    padding: 24,
    gap: 12,
    justifyContent: "center",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
