// @ts-nocheck
// vitals.tsx — Premium vitals overview → links to vitals-log
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
  SectionHeader,
} from "../../src/components/ui";
import { useGuestGuard } from "../../src/hooks/useGuestGuard";

const VITALS: {
  icon: IconName;
  label: string;
  value: string;
  unit: string;
  color: string;
  status: string;
}[] = [
  {
    icon: "pulse",
    label: "ضغط الدم",
    value: "120/80",
    unit: "mmHg",
    color: "#23B5CE",
    status: "طبيعي",
  },
  {
    icon: "bloodtype",
    label: "السكر (صائم)",
    value: "95",
    unit: "mg/dL",
    color: "#7A6BEA",
    status: "طبيعي",
  },
  {
    icon: "monitor_heart",
    label: "ضربات القلب",
    value: "78",
    unit: "نبضة",
    color: "#F0695C",
    status: "مثالي",
  },
  {
    icon: "weight",
    label: "الوزن",
    value: "80",
    unit: "كغ",
    color: "#16A34A",
    status: "ثابت",
  },
  {
    icon: "thermometer",
    label: "الحرارة",
    value: "36.8",
    unit: "°C",
    color: "#F0A526",
    status: "طبيعي",
  },
  {
    icon: "water",
    label: "الماء اليوم",
    value: "6",
    unit: "أكواب",
    color: "#10B981",
    status: "جيد",
  },
];

import { apiFetch } from "../../src/utils/api";

export default function VitalsScreen() {
  const insets = useSafeAreaInsets();
  const { isGuest, requireAuth } = useGuestGuard();
  const [vitals, setVitals] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (isGuest) return;
    apiFetch("/health/vitals/summary")
      .then((res: any) => {
        setVitals(Array.isArray(res) ? res : res?.data || []);
      })
      .catch(console.error);
  }, [isGuest]);

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
            مؤشراتي الحيوية
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
        <View style={st.grid}>
          {vitals.map((v: any, i: number) => (
            <Card
              key={i}
              onPress={() => router.push("/health/vitals-log")}
              style={{ width: "47%", gap: 8 }}
            >
              <View
                style={{
                  flexDirection: "row-reverse",
                  justifyContent: "space-between",
                }}
              >
                <View style={[st.vIcon, { backgroundColor: v.color + "18" }]}>
                  <Icon name={v.icon} size={20} color={v.color} />
                </View>
                <Badge label={v.status} color={v.color} />
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <View
                  style={{
                    flexDirection: "row-reverse",
                    alignItems: "baseline",
                    gap: 3,
                  }}
                >
                  <AppText variant="h3" color={v.color}>
                    {v.value}
                  </AppText>
                  <AppText variant="caption" color={colors.textTertiary}>
                    {v.unit}
                  </AppText>
                </View>
                <AppText variant="bodyXS" color={colors.textSecondary}>
                  {v.label}
                </AppText>
              </View>
            </Card>
          ))}
        </View>

        <Button
          label="إضافة قراءة جديدة"
          variant="gradient"
          icon="add"
          onPress={() => router.push("/health/vitals-log")}
        />
        <Button
          label="عرض الرسوم البيانية"
          variant="outline"
          icon="trending_up"
          onPress={() => router.push("/health/vitals-log")}
        />
        <Card
          onPress={() => router.push("/health/conditions-allergies")}
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View style={[st.vIcon, { backgroundColor: colors.warningSurface }]}>
            <Icon name="warning" size={20} color={colors.warning} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <AppText variant="h6">الأمراض والحساسية</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              أضف أمراضك المزمنة وحساسيتك
            </AppText>
          </View>
          <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
        </Card>
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
  grid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  vIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
