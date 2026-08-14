// @ts-nocheck
import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp, LANGUAGES } from "../../src/context/AppContext";
import { Icon, IconName } from "../../src/components/Icon";
import { AppText, Card, IconButton } from "../../src/components/ui";

interface SettingsItem {
  icon: IconName;
  label: string;
  route?: string;
  toggle?: boolean;
  danger?: boolean;
}
const ITEMS: SettingsItem[][] = [
  [
    { icon: "user", label: "الملف الشخصي", route: "/profile" },
    { icon: "lock", label: "الأمان", route: "/settings/security" },
    { icon: "lock", label: "الخصوصية", route: "/settings/privacy" },
  ],
  [
    { icon: "moon", label: "الوضع الليلي", toggle: true },
    { icon: "globe", label: "اللغة" },
    {
      icon: "bell",
      label: "الإشعارات",
      route: "/settings/notifications-settings",
    },
  ],
  [
    { icon: "help", label: "المساعدة", route: "/settings/support-chat" },
    { icon: "chat", label: "تواصل معنا", route: "/support/chat" },
    { icon: "document", label: "الشروط والأحكام", route: "/settings/terms" },
    { icon: "info", label: "عن التطبيق", route: "/settings/about" },
  ],
  [{ icon: "logout", label: "تسجيل الخروج", danger: true }],
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme, lang } = useApp();
  const currentLang = LANGUAGES.find((l) => l.code === lang);

  const handlePress = (item: SettingsItem) => {
    if (item.label === "اللغة") {
      router.push("/(onboarding)/language");
      return;
    }
    if (item.label === "تسجيل الخروج") {
      router.replace("/(auth)/welcome");
      return;
    }
    if (item.route) router.push(item.route as any);
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
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
        <AppText variant="h3">الإعدادات</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }}
      >
        {ITEMS.map((group, gi) => (
          <Card key={gi} padding={0}>
            {group.map((item, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.85}
                onPress={() => !item.toggle && handlePress(item)}
                style={[
                  st.row,
                  i < group.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderLight,
                  },
                ]}
              >
                {item.toggle ? (
                  <Switch
                    value={isDark}
                    onValueChange={toggleTheme}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                ) : item.label === "اللغة" ? (
                  <View
                    style={{
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <AppText variant="labelSM" color={colors.primary}>
                      {currentLang?.native}
                    </AppText>
                    <Icon
                      name="chevronLeft"
                      size={16}
                      color={colors.textTertiary}
                    />
                  </View>
                ) : (
                  <Icon
                    name="chevronLeft"
                    size={16}
                    color={colors.textTertiary}
                  />
                )}
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <AppText
                    variant="bodySM"
                    color={item.danger ? colors.error : colors.textPrimary}
                  >
                    {item.label}
                  </AppText>
                </View>
                <View
                  style={[
                    st.rowIcon,
                    {
                      backgroundColor: item.danger
                        ? colors.errorSurface
                        : colors.surfaceSecondary,
                    },
                  ]}
                >
                  <Icon
                    name={item.icon}
                    size={20}
                    color={item.danger ? colors.error : colors.primary}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        ))}
        <AppText variant="caption" color={colors.textTertiary} align="center">
          نبض بلس v1.0.0
        </AppText>
      </ScrollView>
    </View>
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
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
