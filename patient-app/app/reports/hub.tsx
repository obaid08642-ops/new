// @ts-nocheck
// reports/hub.tsx — Reports hub (lab + radiology + AI)
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon, IconName } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
  Chip,
  SectionHeader,
} from "../../src/components/ui";

const REPORTS = [
  {
    id: "1",
    title: "تحاليل دم شاملة",
    type: "lab",
    lab: "مختبرات البرج",
    date: "15 يونيو 2026",
    status: "مكتمل",
    abnormal: 2,
  },
  {
    id: "2",
    title: "أشعة سينية — صدر",
    type: "radiology",
    lab: "مركز الطائف",
    date: "10 يونيو 2026",
    status: "مكتمل",
    abnormal: 0,
  },
  {
    id: "3",
    title: "وظائف الغدة الدرقية",
    type: "lab",
    lab: "مختبرات البرج",
    date: "1 يونيو 2026",
    status: "مكتمل",
    abnormal: 0,
  },
  {
    id: "4",
    title: "تحليل بول كامل",
    type: "lab",
    lab: "مختبرات الفا",
    date: "25 مايو 2026",
    status: "مكتمل",
    abnormal: 1,
  },
];

export default function ReportsHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [filter, setFilter] = useState("all");
  const filtered =
    filter === "all" ? REPORTS : REPORTS.filter((r) => r.type === filter);

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
        <View style={st.hdrRow}>
          <View style={{ width: 40 }} />
          <AppText variant="h4" color="#fff">
            تقاريري الطبية
          </AppText>
          <IconButton
            icon="back"
            bg="rgba(255,255,255,0.18)"
            color="#fff"
            onPress={() => router.back()}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: "row-reverse", gap: 8 }}
        >
          <Chip
            label="الكل"
            active={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <Chip
            label="تحاليل"
            icon="science"
            active={filter === "lab"}
            onPress={() => setFilter("lab")}
          />
          <Chip
            label="أشعة"
            icon="qr_code_scanner"
            active={filter === "radiology"}
            onPress={() => setFilter("radiology")}
          />
        </ScrollView>

        {filtered.map((r) => (
          <Card
            key={r.id}
            onPress={() =>
              router.push({
                pathname: "/reports/view-report",
                params: { reportId: r.id },
              })
            }
          >
            <View
              style={{
                flexDirection: "row-reverse",
                gap: 12,
                alignItems: "center",
              }}
            >
              <View
                style={[
                  st.rIcon,
                  {
                    backgroundColor:
                      r.type === "lab"
                        ? isDark
                          ? "rgba(122,107,234,0.15)"
                          : "#EDEBFD"
                        : colors.primarySurface,
                  },
                ]}
              >
                <Icon
                  name={r.type === "lab" ? "testTube" : "scan"}
                  size={24}
                  color={r.type === "lab" ? colors.accent : colors.primary}
                />
              </View>
              <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
                <AppText variant="h6">{r.title}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>
                  {r.lab} · {r.date}
                </AppText>
                <View style={{ flexDirection: "row-reverse", gap: 6 }}>
                  <Badge
                    label={r.status}
                    color={colors.success}
                    icon="check_circle"
                  />
                  {r.abnormal > 0 && (
                    <Badge
                      label={`${r.abnormal} يحتاج متابعة`}
                      color={colors.warning}
                    />
                  )}
                </View>
              </View>
              <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
            </View>
            <View
              style={{ flexDirection: "row-reverse", gap: 8, marginTop: 10 }}
            >
              <Button
                label="عرض التفاصيل"
                variant="primary"
                size="sm"
                full={false}
                onPress={() =>
                  router.push({
                    pathname: "/reports/view-report",
                    params: { reportId: r.id },
                  })
                }
              />
              <Button
                label="تحليل AI"
                variant="ghost"
                size="sm"
                icon="robot"
                full={false}
                onPress={() =>
                  router.push({
                    pathname: "/reports/ai-analysis",
                    params: { reportId: r.id },
                  })
                }
              />
            </View>
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
  rIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
