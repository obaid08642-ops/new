// @ts-nocheck
// Calorie analyzer — analyze food by photo or text with AI
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
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
  Input,
  SectionHeader,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

export default function CalorieAnalyzerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [query, setQuery] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const analyzeByText = async () => {
    if (!query.trim()) return;
    setAnalyzing(true);
    try {
      const res = await apiFetch<any>("/ai/analyze-meal", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
      setResult(res);
    } catch (e: any) {
      Alert.alert("خطأ", "فشل تحليل الوجبة. يرجى المحاولة لاحقاً.");
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeByPhoto = () => {
    Alert.alert(
      "الخدمة غير متاحة حالياً",
      "لن يحلل التطبيق صورة طعام قبل ربط اختيار الصور ورفعها الآمن بعقد تحليل بصري مصرح به.",
    );
  };

  const addToLog = async () => {
    if (!result) return;
    setAnalyzing(true);
    try {
      await apiFetch("/nutrition/meals", {
        method: "POST",
        body: JSON.stringify({
          name: result.name,
          calories: result.calories,
          protein_g: result.protein,
          carbs_g: result.carbs,
          fat_g: result.fat,
          fiber_g: result.fiber,
          meal_type: "snack",
        }),
      });
      router.push("/nutrition/daily-tracker");
    } catch (e) {
      Alert.alert("خطأ", "تعذر حفظ الوجبة في السجل. لم يتم إنشاء إدخال جديد.");
    } finally {
      setAnalyzing(false);
    }
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
        <AppText variant="h4">تحليل السعرات</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
      >
        {/* Input methods */}
        <Card>
          <AppText variant="h5" style={{ marginBottom: 12 }}>
            وصف الوجبة أو صوّرها
          </AppText>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="مثال: كبسة لحم مع سلطة وزبادي..."
            icon="search"
            multiline
          />
          <View
            style={{ flexDirection: "row-reverse", gap: 10, marginTop: 12 }}
          >
            <Button
              label="تحليل بالنص"
              variant="primary"
              icon="robot"
              loading={analyzing}
              onPress={analyzeByText}
              full={false}
              style={{ flex: 1 }}
            />
            <Button
              label="صوّر الأكل"
              variant="outline"
              icon="camera"
              onPress={analyzeByPhoto}
              full={false}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        {/* Results */}
        {result && (
          <>
            <Card style={{ backgroundColor: colors.successSurface }}>
              <View
                style={{
                  flexDirection: "row-reverse",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <Icon name="robot" size={24} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <AppText variant="h5" color={colors.success}>
                    تحليل: {result.name}
                  </AppText>
                  <AppText variant="caption" color={colors.textTertiary}>
                    تقييم صحي: {result.healthScore}/10
                  </AppText>
                </View>
              </View>
            </Card>

            {/* Macros */}
            <Card>
              <SectionHeader title="القيم الغذائية" />
              <View style={st.macros}>
                {[
                  { l: "سعرات", v: result.calories, u: "kcal", c: "#F0A526" },
                  { l: "بروتين", v: result.protein, u: "g", c: "#F0695C" },
                  { l: "كربوهيدرات", v: result.carbs, u: "g", c: "#23B5CE" },
                  { l: "دهون", v: result.fat, u: "g", c: "#16A34A" },
                  { l: "ألياف", v: result.fiber, u: "g", c: "#7A6BEA" },
                ].map((m, i) => (
                  <View key={i} style={{ alignItems: "center", flex: 1 }}>
                    <AppText variant="h4" color={m.c}>
                      {m.v}
                    </AppText>
                    <AppText variant="caption" color={colors.textTertiary}>
                      {m.u}
                    </AppText>
                    <AppText variant="labelSM">{m.l}</AppText>
                  </View>
                ))}
              </View>
            </Card>

            {/* Vitamins */}
            <Card>
              <SectionHeader title="الفيتامينات والمعادن" />
              <View
                style={{
                  flexDirection: "row-reverse",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {result.vitamins.map((v: string, i: number) => (
                  <Badge key={i} label={v} color={colors.secondary} />
                ))}
              </View>
            </Card>

            {/* AI suggestions */}
            <Card>
              <SectionHeader title="نصائح AI" />
              {result.suggestions.map((s: string, i: number) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row-reverse",
                    gap: 8,
                    paddingVertical: 6,
                  }}
                >
                  <Icon name="sparkles" size={16} color={colors.accent} />
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

            <Button
              label="إضافة للسجل اليومي"
              variant="gradient"
              icon="add"
              onPress={addToLog}
              loading={analyzing}
            />
          </>
        )}
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
  macros: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginTop: 8,
  },
});
