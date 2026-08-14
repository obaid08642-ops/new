// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText, Button, Input, IconButton } from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();
  const email = (params.email as string) || "";
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    if (pw.length < 6 || pw !== confirmPw) return;
    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          identifier: email,
          password: pw,
        }),
      });
      setLoading(false);
      setDone(true);
    } catch (err: any) {
      Alert.alert("خطأ", err.message || "فشل حفظ كلمة المرور الجديدة");
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View
        style={[
          st.c,
          {
            backgroundColor: colors.background,
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          },
        ]}
      >
        <View
          style={[st.iconCircle, { backgroundColor: colors.successSurface }]}
        >
          <Icon name="check_circle" size={40} color={colors.success} />
        </View>
        <AppText variant="h2" align="center">
          تم بنجاح!
        </AppText>
        <AppText variant="bodySM" color={colors.textTertiary} align="center">
          يمكنك الآن تسجيل الدخول بكلمة مرورك الجديدة
        </AppText>
        <Button
          label="تسجيل الدخول"
          variant="gradient"
          size="lg"
          onPress={() => router.replace("/(auth)/login")}
          style={{ marginTop: 16, width: "80%" }}
        />
      </View>
    );
  }

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
        <AppText variant="h4">كلمة مرور جديدة</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>
      <View style={st.body}>
        <View
          style={[st.iconCircle, { backgroundColor: colors.primarySurface }]}
        >
          <Icon name="lock" size={32} color={colors.primary} />
        </View>
        <AppText variant="h3" align="center">
          أدخل كلمة مرور جديدة
        </AppText>
        <Input
          value={pw}
          onChangeText={setPw}
          placeholder="كلمة المرور الجديدة"
          icon="lock"
          secureTextEntry={!show}
          iconRight={show ? "eyeOff" : "eye"}
          onIconRightPress={() => setShow(!show)}
          style={{ width: "100%", marginTop: 16 }}
        />
        <Input
          value={confirmPw}
          onChangeText={setConfirmPw}
          placeholder="تأكيد كلمة المرور"
          icon="lock"
          secureTextEntry={!show}
          error={confirmPw && pw !== confirmPw ? "غير متطابقتين" : ""}
          style={{ width: "100%" }}
        />
        <Button
          label="حفظ كلمة المرور"
          variant="gradient"
          size="lg"
          loading={loading}
          onPress={handleReset}
          style={{ marginTop: 16 }}
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
