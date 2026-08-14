// @ts-nocheck
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
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
  SectionHeader,
} from "../../src/components/ui";

const REPORTS = [
  { id: "1", title: "تحاليل دم شاملة", date: "15 يونيو 2026", type: "lab" },
  {
    id: "2",
    title: "أشعة سينية — صدر",
    date: "10 يونيو 2026",
    type: "radiology",
  },
  { id: "3", title: "وظائف الغدة الدرقية", date: "1 يونيو 2026", type: "lab" },
  { id: "4", title: "تحليل بول كامل", date: "25 مايو 2026", type: "lab" },
  { id: "5", title: "سكر تراكمي HbA1c", date: "20 مايو 2026", type: "lab" },
];

export default function ShareReportScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const toggle = (id: string) =>
    setSelected((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );

  const handleShare = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      router.back();
    }, 800);
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
        <View style={{ width: 40 }} />
        <AppText variant="h4">مشاركة تقارير مع الطبيب</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}
      >
        <Card style={{ backgroundColor: colors.infoSurface }}>
          <View
            style={{
              flexDirection: "row-reverse",
              gap: 10,
              alignItems: "center",
            }}
          >
            <Icon name="shield" size={20} color={colors.info} />
            <AppText
              variant="bodySM"
              color={colors.textSecondary}
              style={{ flex: 1 }}
            >
              التقارير تُشارك بشكل آمن ومشفر مع طبيبك فقط
            </AppText>
          </View>
        </Card>

        <SectionHeader title="اختر التقارير للمشاركة" />
        {REPORTS.map((r) => {
          const sel = selected.includes(r.id);
          return (
            <Card
              key={r.id}
              onPress={() => toggle(r.id)}
              style={[
                st.reportCard,
                sel && { borderColor: colors.primary, borderWidth: 2 },
              ]}
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
                    st.check,
                    {
                      borderColor: sel ? colors.primary : colors.border,
                      backgroundColor: sel ? colors.primary : "transparent",
                    },
                  ]}
                >
                  {sel && <Icon name="check" size={14} color="#fff" />}
                </View>
                <View
                  style={[
                    st.rIcon,
                    {
                      backgroundColor:
                        r.type === "lab" ? "#7A6BEA18" : "#23B5CE18",
                    },
                  ]}
                >
                  <Icon
                    name={r.type === "lab" ? "testTube" : "scan"}
                    size={22}
                    color={r.type === "lab" ? "#7A6BEA" : "#23B5CE"}
                  />
                </View>
                <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
                  <AppText variant="h6">{r.title}</AppText>
                  <AppText variant="caption" color={colors.textTertiary}>
                    {r.date}
                  </AppText>
                </View>
              </View>
            </Card>
          );
        })}

        <Button
          label="رفع تقرير جديد"
          variant="ghost"
          icon="upload"
          onPress={() => router.push("/pharmacy/cart")}
        />
      </ScrollView>

      {selected.length > 0 && (
        <View
          style={[
            st.bottom,
            {
              paddingBottom: insets.bottom + 8,
              backgroundColor: colors.surface,
              borderTopColor: colors.borderLight,
            },
          ]}
        >
          <Button
            label={`مشاركة ${selected.length} تقرير مع الطبيب`}
            variant="gradient"
            size="lg"
            icon="send"
            loading={sending}
            onPress={handleShare}
          />
        </View>
      )}
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
  reportCard: { borderWidth: 1, borderColor: "transparent" },
  check: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
