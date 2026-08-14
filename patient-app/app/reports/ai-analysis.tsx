// @ts-nocheck
// ai-analysis.tsx — AI analysis of lab/radiology results
import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, StatusBar } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
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

const AI_RESULT = {
  summary:
    "بشكل عام نتائجك جيدة مع ملاحظتين تحتاج متابعة: ارتفاع طفيف في سكر الدم (صائم وتراكمي) ونقص في فيتامين D.",
  findings: [
    {
      type: "warning" as const,
      title: "سكر الدم مرتفع قليلاً",
      icon: "bloodtype" as IconName,
      detail:
        "سكر الصائم 105 mg/dL (الطبيعي أقل من 100) والتراكمي HbA1c 6.8% (الطبيعي أقل من 5.7%). هذا يشير لحالة ما قبل السكري.",
      recommendations: [
        "متابعة مع طبيب الغدد الصماء أو الباطنية",
        "قياس السكر بانتظام (صائم وبعد الأكل)",
        "تقليل السكريات والنشويات المكررة",
        "رياضة 30 دقيقة يومياً على الأقل",
        "فحص HbA1c بعد 3 أشهر",
      ],
    },
    {
      type: "warning" as const,
      title: "نقص فيتامين D",
      icon: "sparkles" as IconName,
      detail:
        "فيتامين D عندك 22 ng/mL والمستوى الطبيعي فوق 30. نقص فيتامين D شائع في المنطقة ويؤثر على العظام والمناعة.",
      recommendations: [
        "مكمل فيتامين D3 بجرعة 2000-4000 IU يومياً",
        "التعرض للشمس 15-20 دقيقة يومياً",
        "أطعمة غنية بفيتامين D: سمك السلمون، البيض، الحليب المدعم",
        "إعادة الفحص بعد 3 أشهر",
      ],
    },
    {
      type: "success" as const,
      title: "صورة الدم طبيعية بالكامل",
      icon: "check_circle" as IconName,
      detail:
        "الهيموجلوبين وكريات الدم والصفائح كلها في المعدل الطبيعي. لا يوجد أي فقر دم أو التهاب.",
      recommendations: [],
    },
    {
      type: "success" as const,
      title: "وظائف الكبد والكلى ممتازة",
      icon: "check_circle" as IconName,
      detail: "جميع إنزيمات الكبد والكرياتينين واليوريا في المعدل الطبيعي.",
      recommendations: [],
    },
    {
      type: "success" as const,
      title: "الدهون تحت السيطرة",
      icon: "check_circle" as IconName,
      detail:
        "الكوليسترول الكلي 195 والدهون الثلاثية 145 — كلها ضمن المعدل الطبيعي.",
      recommendations: [],
    },
  ],
  nextSteps: [
    "استشارة طبيب باطنية أو غدد صماء لمتابعة السكر",
    "بدء مكمل فيتامين D3",
    "إعادة تحليل السكر التراكمي بعد 3 أشهر",
    "إعادة فحص فيتامين D بعد 3 أشهر",
  ],
};

export default function AIAnalysisScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <View
        style={[
          st.c,
          {
            backgroundColor: colors.background,
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          },
        ]}
      >
        <View
          style={[st.loadingIcon, { backgroundColor: colors.primarySurface }]}
        >
          <Icon name="robot" size={48} color={colors.primary} />
        </View>
        <AppText variant="h4" align="center">
          جاري تحليل نتائجك...
        </AppText>
        <AppText variant="bodySM" color={colors.textTertiary} align="center">
          الذكاء الاصطناعي يراجع كل القيم ويقارنها بالمعدلات الطبيعية
        </AppText>
      </View>
    );
  }

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
        <View
          style={{ flexDirection: "row-reverse", gap: 6, alignItems: "center" }}
        >
          <Icon name="robot" size={20} color={colors.primary} />
          <AppText variant="h4">تحليل AI</AppText>
        </View>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
      >
        {/* Summary */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <Card style={{ backgroundColor: colors.primarySurface }}>
            <View
              style={{
                flexDirection: "row-reverse",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <Icon name="robot" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <AppText
                  variant="h6"
                  color={colors.primary}
                  style={{ marginBottom: 6 }}
                >
                  ملخص التحليل
                </AppText>
                <AppText variant="bodySM" color={colors.textSecondary}>
                  {AI_RESULT.summary}
                </AppText>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Findings */}
        {AI_RESULT.findings.map((f, i) => (
          <Animated.View
            key={i}
            entering={FadeInDown.delay(i * 100).duration(400)}
          >
            <Card
              style={{
                borderRightWidth: 4,
                borderRightColor:
                  f.type === "warning" ? colors.warning : colors.success,
              }}
            >
              <View
                style={{
                  flexDirection: "row-reverse",
                  gap: 10,
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Icon
                  name={f.icon}
                  size={22}
                  color={f.type === "warning" ? colors.warning : colors.success}
                />
                <AppText variant="h5" style={{ flex: 1 }}>
                  {f.title}
                </AppText>
                <Badge
                  label={f.type === "warning" ? "يحتاج متابعة" : "ممتاز"}
                  color={f.type === "warning" ? colors.warning : colors.success}
                />
              </View>
              <AppText variant="bodySM" color={colors.textSecondary}>
                {f.detail}
              </AppText>

              {f.recommendations.length > 0 && (
                <View style={{ marginTop: 10, gap: 6 }}>
                  <AppText variant="labelMD" color={colors.textPrimary}>
                    التوصيات:
                  </AppText>
                  {f.recommendations.map((r, j) => (
                    <View
                      key={j}
                      style={{
                        flexDirection: "row-reverse",
                        gap: 6,
                        alignItems: "flex-start",
                      }}
                    >
                      <Icon
                        name="check_circle"
                        size={14}
                        color={
                          f.type === "warning" ? colors.warning : colors.success
                        }
                        style={{ marginTop: 4 }}
                      />
                      <AppText
                        variant="bodySM"
                        color={colors.textSecondary}
                        style={{ flex: 1 }}
                      >
                        {r}
                      </AppText>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </Animated.View>
        ))}

        {/* Next steps */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)}>
          <Card>
            <SectionHeader title="الخطوات القادمة" />
            {AI_RESULT.nextSteps.map((s, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row-reverse",
                  gap: 8,
                  paddingVertical: 6,
                  alignItems: "center",
                }}
              >
                <View
                  style={[
                    st.stepNum,
                    { backgroundColor: colors.primarySurface },
                  ]}
                >
                  <AppText variant="labelSM" color={colors.primary}>
                    {i + 1}
                  </AppText>
                </View>
                <AppText
                  variant="bodySM"
                  color={colors.textSecondary}
                  style={{ flex: 1 }}
                >
                  {s}
                </AppText>
              </View>
            ))}
          </Card>
        </Animated.View>

        {/* Actions */}
        <Button
          label="استشارة طبيب حول النتائج"
          variant="gradient"
          icon="doctor"
          onPress={() => router.push("/(tabs)/consultations")}
        />
        <Button
          label="طلب أدوية مقترحة"
          variant="outline"
          icon="medication"
          onPress={() => router.push("/(tabs)/pharmacy")}
        />

        {/* Disclaimer */}
        <Card style={{ backgroundColor: colors.warningSurface }}>
          <View
            style={{
              flexDirection: "row-reverse",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <Icon name="warning" size={16} color={colors.warning} />
            <AppText
              variant="caption"
              color={colors.textSecondary}
              style={{ flex: 1 }}
            >
              هذا التحليل مبني على الذكاء الاصطناعي ولا يغني عن استشارة الطبيب.
              يرجى مراجعة طبيبك لتأكيد التشخيص والعلاج.
            </AppText>
          </View>
        </Card>
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
  loadingIcon: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
