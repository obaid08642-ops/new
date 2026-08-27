// @ts-nocheck
// app/voice/index.tsx
// المساعد السريع — أوامر جاهزة تنقلك مباشرة للخدمة
import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  IconButton,
} from "../../src/components/ui";

const ACTIONS = [
  {
    icon: "calendar",
    text: "احجز موعد مع طبيب",
    category: "استشارة",
    route: "/consultations/doctor-search",
  },
  {
    icon: "medication",
    text: "اطلب دواء من الصيدلية",
    category: "صيدلية",
    route: "/(tabs)/pharmacy",
  },
  {
    icon: "science",
    text: "احجز تحليل مخبري",
    category: "تحاليل",
    route: "/(tabs)/diagnostics",
  },
  {
    icon: "medication",
    text: "احجز ممرض منزلي",
    category: "تمريض",
    route: "/(tabs)/nursing",
  },
  {
    icon: "document",
    text: "عرض مواعيدي القادمة",
    category: "مواعيد",
    route: "/consultations/appointments",
  },
  {
    icon: "emergency",
    text: "طوارئ — إسعاف",
    category: "طوارئ",
    route: "/emergency/sos",
    danger: true,
  },
];

export default function VoiceAssistantScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#0B3B60", "#23B5CE"]}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <View style={{ width: 40 }} />
          <AppText variant="h4" color="#fff">
            المساعد السريع
          </AppText>
          <IconButton
            icon="back"
            bg="rgba(255,255,255,0.18)"
            color="#fff"
            onPress={() => router.back()}
          />
        </View>
        <AppText
          variant="bodySM"
          color="rgba(255,255,255,0.85)"
          style={{ textAlign: "center", marginTop: 8, lineHeight: 20 }}
        >
          اختر الأمر لتنتقل مباشرة للخدمة. الإدخال الصوتي غير متاح في هذا
          الإصدار.
        </AppText>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }}>
        {ACTIONS.map((a, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.85}
            onPress={() => router.push(a.route)}
          >
            <Card
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 14,
                borderWidth: a.danger ? 1.5 : 0,
                borderColor: a.danger ? colors.error : "transparent",
              }}
            >
              <View
                style={[
                  styles.actionIcon,
                  {
                    backgroundColor: a.danger
                      ? colors.errorSurface
                      : colors.primarySurface,
                  },
                ]}
              >
                <Icon
                  name={a.icon}
                  size={24}
                  color={a.danger ? colors.error : colors.primary}
                />
              </View>
              <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
                <AppText variant="h6">{a.text}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>
                  {a.category}
                </AppText>
              </View>
              <Icon name="chevron_left" size={20} color={colors.textTertiary} />
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
