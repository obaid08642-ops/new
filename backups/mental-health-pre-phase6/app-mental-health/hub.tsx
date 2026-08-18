// @ts-nocheck
// Mental health hub — all mental health features
import React from "react";
import { View, StyleSheet, ScrollView, StatusBar } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon, IconName } from "../../src/components/Icon";
import { AppText, Card, IconButton } from "../../src/components/ui";

const FEATURES: {
  icon: IconName;
  label: string;
  desc: string;
  route: string;
  color: string;
}[] = [
  {
    icon: "robot",
    label: "مطابقة المعالج بالـ AI",
    desc: "نساعدك في إيجاد المعالج المثالي",
    route: "/mental-health/therapist-match",
    color: "#6366F1",
  },
  {
    icon: "meditation",
    label: "تمارين التنفس",
    desc: "تقنيات تنفس للهدوء والاسترخاء",
    route: "/mental-health/breathing",
    color: "#10B981",
  },
  {
    icon: "meditation",
    label: "تأمل موجّه",
    desc: "جلسات تأمل صوتية",
    route: "/mental-health/meditation",
    color: "#7A6BEA",
  },
  {
    icon: "edit",
    label: "سجل المزاج",
    desc: "تتبع مشاعرك يومياً",
    route: "/mental-health/mood-journal",
    color: "#F0A526",
  },
  {
    icon: "document",
    label: "تقييم ذاتي",
    desc: "اختبارات نفسية معتمدة",
    route: "/mental-health/self-assessment",
    color: "#23B5CE",
  },
  {
    icon: "call",
    label: "دعم الأزمات",
    desc: "خطوط مساعدة فورية 24/7",
    route: "/mental-health/crisis-support",
    color: "#F0695C",
  },
  {
    icon: "doctor",
    label: "استشارة نفسية",
    desc: "تحدث مع طبيب نفسي معتمد",
    route: "/(tabs)/consultations",
    color: "#23B5CE",
  },
];

export default function MentalHealthHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[st.hdr, { paddingTop: insets.top + 12 }]}>
        <View style={st.hdrRow}>
          <View style={{ width: 40 }} />
          <View style={{ alignItems: "center" }}>
            <AppText variant="h4" color="#fff">
              الصحة النفسية
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.8)">
              صحتك النفسية أولوية
            </AppText>
          </View>
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
        {FEATURES.map((f, i) => (
          <Card
            key={i}
            onPress={() => router.push(f.route as any)}
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 14,
            }}
          >
            <View style={[st.fIcon, { backgroundColor: f.color + "18" }]}>
              <Icon name={f.icon} size={24} color={f.color} />
            </View>
            <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
              <AppText variant="h6">{f.label}</AppText>
              <AppText variant="caption" color={colors.textTertiary}>
                {f.desc}
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
  fIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
