// @ts-nocheck
import React from "react";
import { View, StyleSheet, StatusBar, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText, Button } from "../../src/components/ui";

export default function ProviderInfoScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const handleContinueAsPatient = () => {
    router.replace("/(tabs)");
  };

  const handleLogout = () => {
    router.replace("/(auth)/login");
  };

  return (
    <View
      style={[
        st.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={st.content}>
        <View
          style={[st.iconCircle, { backgroundColor: colors.primarySurface }]}
        >
          <Icon name="doctor" size={48} color={colors.primary} />
        </View>

        <AppText variant="h2" align="center" style={st.title}>
          حساب مقدم خدمة صحية
        </AppText>

        <AppText
          variant="bodyLG"
          color={colors.textSecondary}
          align="center"
          style={st.description}
        >
          تم تسجيل دخولك بحساب مرتبط بـ (مقدم خدمة/طبيب/عيادة). لإدارة مواعيدك،
          وطلبات المرضى، والخدمات الطبية، يرجى استخدام تطبيق مقدم الخدمة المخصص
          (Nabdah Provider).
        </AppText>

        <View style={st.actions}>
          <Button
            label="الاستمرار كمريض"
            variant="primary"
            size="lg"
            onPress={handleContinueAsPatient}
          />

          <TouchableOpacity onPress={handleLogout} style={st.logoutBtn}>
            <AppText variant="labelMD" color={colors.error} align="center">
              تسجيل الخروج
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  content: { alignItems: "center", gap: 16 },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontWeight: "bold" },
  description: { lineHeight: 26, marginHorizontal: 12 },
  actions: { width: "100%", gap: 16, marginTop: 32 },
  logoutBtn: { paddingVertical: 12 },
});
