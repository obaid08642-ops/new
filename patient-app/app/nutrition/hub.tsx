// @ts-nocheck
// Nutrition hub — all nutrition features
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
  IconButton,
  SectionHeader,
} from "../../src/components/ui";

const FEATURES: {
  icon: IconName;
  label: string;
  desc: string;
  route: string;
  color: string;
}[] = [
  {
    icon: "robot",
    label: "خطة غذائية بالـ AI",
    desc: "تخسيس · زيادة · نمط صحي · بناء عضلات",
    route: "/nutrition/ai-plan-builder",
    color: "#16A34A",
  },
  {
    icon: "food",
    label: "تحليل السعرات",
    desc: "صوّر أكلك أو اكتبه — AI يحلل القيم الغذائية",
    route: "/nutrition/calorie-analyzer",
    color: "#F0A526",
  },
  {
    icon: "success",
    label: "هدف الجسم",
    desc: "BMI + نسبة دهون + وزن مستهدف",
    route: "/nutrition/body-target",
    color: "#23B5CE",
  },
  {
    icon: "run",
    label: "خطة تمارين",
    desc: "تمارين بيت أو جيم مخصصة بالـ AI",
    route: "/nutrition/exercise-plan",
    color: "#7A6BEA",
  },
  {
    icon: "calendar",
    label: "التتبع اليومي",
    desc: "وجبات + ماء + رياضة",
    route: "/nutrition/daily-tracker",
    color: "#10B981",
  },
  {
    icon: "user",
    label: "تكوين الجسم",
    desc: "عرض هيكل الجسم ومؤشراتك",
    route: "/nutrition/body-composition",
    color: "#EC4899",
  },
  {
    icon: "food",
    label: "تخطيط الوجبات",
    desc: "خطط وجبات أسبوعية ذكية",
    route: "/nutrition/ai-meal-planner",
    color: "#16A34A",
  },
  {
    icon: "camera",
    label: "ماسح الطعام",
    desc: "صوّر الطعام واعرف مكوناته",
    route: "/nutrition/food-scanner",
    color: "#F0695C",
  },
  {
    icon: "edit",
    label: "تسجيل وجبة",
    desc: "سجّل وجبتك يدوياً",
    route: "/nutrition/log-meal",
    color: "#6366F1",
  },
  {
    icon: "water",
    label: "تتبع الماء",
    desc: "تأكد من شربك كفاية",
    route: "/nutrition/water-tracker",
    color: "#10B981",
  },
  {
    icon: "doctor",
    label: "استشارة أخصائي تغذية",
    desc: "تحدث مع أخصائي معتمد",
    route: "/(tabs)/consultations",
    color: "#23B5CE",
  },
];

export default function NutritionHubScreen() {
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
              التغذية الذكية
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.8)">
              مدعومة بالذكاء الاصطناعي
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
