// @ts-nocheck
// medications.tsx — Premium medications hub
import React from "react";
import { View, StyleSheet, ScrollView, StatusBar } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon, IconName } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
} from "../../src/components/ui";
import { useGuestGuard } from "../../src/hooks/useGuestGuard";

const MENU: {
  icon: IconName;
  label: string;
  desc: string;
  route: string;
  color: string;
}[] = [
  {
    icon: "bell",
    label: "تذكيرات الأدوية",
    desc: "جرعاتك اليومية — تم أخذها / غفوة",
    route: "/health/medication-reminder-list",
    color: "#23B5CE",
  },
  {
    icon: "add",
    label: "إضافة تذكير جديد",
    desc: "حدد الدواء والجرعة والمواعيد",
    route: "/health/medication-reminder-add",
    color: "#16A34A",
  },
  {
    icon: "refresh",
    label: "الأدوية المزمنة",
    desc: "إدارة الأدوية الدائمة وإعادة الطلب",
    route: "/health/chronic-medications",
    color: "#F0A526",
  },
  {
    icon: "prescriptions",
    label: "وصفاتي الطبية",
    desc: "الوصفات من أطبائك",
    route: "/health/prescriptions",
    color: "#7A6BEA",
  },
  {
    icon: "shopping_cart",
    label: "طلب من الصيدلية",
    desc: "اطلب أدويتك مباشرة",
    route: "/(tabs)/pharmacy",
    color: "#10B981",
  },
  {
    icon: "warning",
    label: "الأمراض والحساسية",
    desc: "سجّل أمراضك وحساسيتك",
    route: "/health/conditions-allergies",
    color: "#F0695C",
  },
];

export default function MedicationsScreen() {
  const insets = useSafeAreaInsets();
  const { isGuest, requireAuth } = useGuestGuard();
  if (isGuest) {
    requireAuth();
    return null;
  }
  const { colors } = useApp();

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 8,
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ width: 44 }} />
          <AppText variant="h3" color={colors.textPrimary}>
            أدويتي
          </AppText>
          <IconButton
            icon="back"
            bg={colors.surfaceSecondary}
            color={colors.textPrimary}
            onPress={() => router.back()}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
      >
        {MENU.map((m, i) => (
          <Card
            key={i}
            onPress={() => router.push(m.route as any)}
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 14,
            }}
          >
            <View style={[st.mIcon, { backgroundColor: m.color + "18" }]}>
              <Icon name={m.icon} size={24} color={m.color} />
            </View>
            <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
              <AppText variant="h6">{m.label}</AppText>
              <AppText variant="caption" color={colors.textTertiary}>
                {m.desc}
              </AppText>
            </View>
            <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  hdrRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
