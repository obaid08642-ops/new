// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Button,
  IconButton,
  SectionHeader,
} from "../../src/components/ui";

export default function WearablesHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const showUnavailable = () => {
    Alert.alert(
      "الربط غير متاح حالياً",
      "لن يربط التطبيق جهازاً أو يحفظ قراءات حيوية محلية قبل توفر تكامل مصنع الجهاز وموافقة المستخدم وعقد مزامنة موثق.",
    );
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[st.hdr, { paddingTop: insets.top + 12 }]}>
        <View style={st.hdrRow}>
          <View style={{ width: 40 }} />
          <AppText variant="h4" color="#fff">
            الأجهزة القابلة للارتداء
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
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
      >
        <SectionHeader title="الأجهزة المتوفرة للربط" />

        {/* Apple Watch */}
        <Card
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View style={[st.fIcon, { backgroundColor: colors.primarySurface }]}>
            <Icon name="watch" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
            <AppText variant="h6">Apple Watch / Google Fit</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              مزامنة ضربات القلب ومؤشرات النوم
            </AppText>
          </View>
          <Button label="غير متاح" variant="outline" full={false} onPress={showUnavailable} />
        </Card>

        {/* Blood Pressure Monitor */}
        <Card
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View style={[st.fIcon, { backgroundColor: colors.primarySurface }]}>
            <Icon name="pulse" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
            <AppText variant="h6">جهاز ضغط الدم الذكي</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              تسجيل قراءات ضغط الدم تلقائياً
            </AppText>
          </View>
          <Button label="غير متاح" variant="outline" full={false} onPress={showUnavailable} />
        </Card>

        {/* CGM */}
        <Card
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View style={[st.fIcon, { backgroundColor: colors.primarySurface }]}>
            <Icon name="bloodtype" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
            <AppText variant="h6">مستشعر السكر المستمر CGM</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              مراقبة سكر الدم على مدار الساعة
            </AppText>
          </View>
          <Button label="غير متاح" variant="outline" full={false} onPress={showUnavailable} />
        </Card>

        {/* Smart Scale */}
        <Card
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View style={[st.fIcon, { backgroundColor: colors.primarySurface }]}>
            <Icon name="weight" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
            <AppText variant="h6">الميزان الذكي</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              تتبع الوزن ومؤشر كتلة الجسم
            </AppText>
          </View>
          <Button label="غير متاح" variant="outline" full={false} onPress={showUnavailable} />
        </Card>

        {/* Sync trigger */}
        <View style={{ marginTop: 16, gap: 10 }}>

          <Button
            label={syncing ? "جاري المزامنة..." : "مزامنة القراءات الآن"}
            variant="gradient"
            size="lg"
            onPress={showUnavailable}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  hdrRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  fIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
