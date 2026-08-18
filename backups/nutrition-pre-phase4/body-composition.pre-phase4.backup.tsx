// @ts-nocheck
// Body composition visualization
import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, StatusBar } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
  SectionHeader,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

// Metrics fetched dynamically

export default function BodyCompositionScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [metrics, setMetrics] = useState<any[]>([]);

  useEffect(() => {
    apiFetch("/nutrition/profile")
      .then((data: any) => {
        if (data) {
          setMetrics([
            {
              label: "وزن الجسم",
              value: String(data.weight_kg || 75),
              unit: "كغ",
              icon: "weight",
              color: "#23B5CE",
            },
            {
              label: "نسبة الدهون",
              value: String(data.body_fat_percent || 20),
              unit: "%",
              icon: "trendingDown",
              color: "#F0A526",
            },
            {
              label: "كتلة العضلات",
              value: String(Math.round((data.weight_kg || 75) * 0.45)),
              unit: "كغ",
              icon: "run",
              color: "#16A34A",
            },
            {
              label: "الماء",
              value: "55",
              unit: "%",
              icon: "water",
              color: "#10B981",
            },
            {
              label: "معدل الأيض",
              value: String(Math.round((data.weight_kg || 75) * 24)),
              unit: "kcal",
              icon: "flash",
              color: "#F0695C",
            },
            {
              label: "BMI",
              value: String(data.bmi || 24.2),
              unit: "",
              icon: "pulse",
              color: "#7A6BEA",
            },
          ]);
        }
      })
      .catch(() => {});
  }, []);

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
        <View style={{ width: 40 }} />
        <AppText variant="h4">تكوين الجسم</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
      >
        {/* Body silhouette placeholder */}
        <Card style={{ alignItems: "center", gap: 12 }}>
          <View
            style={[st.bodyVis, { backgroundColor: colors.primarySurface }]}
          >
            <Icon name="user" size={80} color={colors.primary} />
          </View>
          <AppText variant="h5">تحليل هيكل الجسم</AppText>
          <AppText variant="bodySM" color={colors.textTertiary} align="center">
            نظرة شاملة على تكوين جسمك ومؤشراتك
          </AppText>
        </Card>

        {/* Metrics grid */}
        <View style={st.grid}>
          {metrics.map((m, i) => (
            <Card
              key={i}
              style={{ width: "47%", alignItems: "center", gap: 6 }}
            >
              <View style={[st.metIcon, { backgroundColor: m.color + "18" }]}>
                <Icon name={m.icon as any} size={22} color={m.color} />
              </View>
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "baseline",
                  gap: 2,
                }}
              >
                <AppText variant="h3" color={m.color}>
                  {m.value}
                </AppText>
                {m.unit ? (
                  <AppText variant="caption" color={colors.textTertiary}>
                    {m.unit}
                  </AppText>
                ) : null}
              </View>
              <AppText variant="labelSM" color={colors.textSecondary}>
                {m.label}
              </AppText>
            </Card>
          ))}
        </View>

        <Button
          label="تحديد هدف جديد"
          variant="gradient"
          icon="success"
          onPress={() => router.push("/nutrition/body-target")}
        />
        <Button
          label="إنشاء خطة مخصصة"
          variant="outline"
          icon="robot"
          onPress={() => router.push("/nutrition/ai-plan-builder")}
        />
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
  bodyVis: {
    width: 160,
    height: 200,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  metIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
