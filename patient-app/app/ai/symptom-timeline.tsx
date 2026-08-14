// @ts-nocheck
// app/ai/symptom-timeline.tsx — Symptom history timeline
import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
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
} from "../../src/components/ui";

const TIMELINE = [
  {
    date: "اليوم",
    symptoms: ["صداع", "حمى"],
    severity: "متوسط",
    color: "#F0A526",
  },
  {
    date: "أمس",
    symptoms: ["تعب", "ألم حلق"],
    severity: "خفيف",
    color: "#5BA84F",
  },
  { date: "3 أيام", symptoms: ["سعال"], severity: "خفيف", color: "#5BA84F" },
];

export default function SymptomTimelineScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isDark ? colors.surface : colors.white,
          },
        ]}
      >
        <AppText variant="bodySM">سجل الأعراض </AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {TIMELINE.map((entry, i) => (
          <View
            key={i}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRightWidth: 4,
                borderRightColor: entry.color,
              },
            ]}
          >
            <View
              style={[styles.badge, { backgroundColor: entry.color + "18" }]}
            >
              <AppText variant="labelSM" color={entry.color}>
                {entry.severity}
              </AppText>
            </View>
            <View style={styles.info}>
              <AppText variant="h6" color={colors.textPrimary}>
                {entry.date}
              </AppText>
              <AppText variant="bodySM" color={colors.textSecondary}>
                {entry.symptoms.join(" • ")}
              </AppText>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  title: { fontSize: 17, fontWeight: "800" } as any,
  card: {
    borderRadius: 16,
    padding: 14,
    flexDirection: "row-reverse",
    gap: 12,
    alignItems: "center",
  },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeAlt: { fontSize: 11, fontWeight: "700" } as any,
  info: { flex: 1, alignItems: "flex-end" },
  date: { fontSize: 14, fontWeight: "800" } as any,
  symptoms: { fontSize: 12, fontWeight: "400", marginTop: 3 },
});
