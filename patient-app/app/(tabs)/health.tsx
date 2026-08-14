// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useApp } from "../../src/context/AppContext";
import { Icon, IconName } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  IconButton,
  SectionHeader,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

const QUICK: { icon: IconName; label: string; color: string; route: string }[] =
  [
    {
      icon: "pulse",
      label: "مؤشراتي",
      color: "#23B5CE",
      route: "/health/vitals",
    },
    {
      icon: "medication",
      label: "أدويتي",
      color: "#16A34A",
      route: "/health/medications",
    },
    {
      icon: "prescriptions",
      label: "وصفاتي",
      color: "#7A6BEA",
      route: "/health/prescriptions",
    },
    {
      icon: "document",
      label: "تقاريري",
      color: "#F0A526",
      route: "/health/reports",
    },
    {
      icon: "users",
      label: "العائلة",
      color: "#EC4899",
      route: "/health/family-hub",
    },
    {
      icon: "chat",
      label: "محادثة",
      color: "#23B5CE",
      route: "/health/family-chat",
    },
    {
      icon: "bell",
      label: "تذكيرات",
      color: "#F0A526",
      route: "/health/smart-reminders",
    },
    {
      icon: "trophy",
      label: "تحدياتي",
      color: "#10B981",
      route: "/loyalty/hub",
    },
  ];

// Vitals are fetched dynamically

export default function HealthScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [vitals, setVitals] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState(82);
  const [upcomingAppt, setUpcomingAppt] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [vitalsRes, profRes, apptRes] = await Promise.all([
          apiFetch("/health/vitals/summary").catch(() => null),
          apiFetch("/users/me/profile").catch(() => null),
          apiFetch('/home/upcoming-appointment').catch(() => null)
        ]);
        
        if (vitalsRes) setVitals(Array.isArray(vitalsRes) ? vitalsRes : vitalsRes?.data || []);
        if (profRes?.health_score) setHealthScore(profRes.health_score);
        if (apptRes) setUpcomingAppt(Array.isArray(apptRes) ? apptRes[0] : apptRes?.data?.[0] || apptRes);

        // Load water intake from nutrition
        const waterRes = await apiFetch(`/nutrition/daily-summary?date=${new Date().toISOString().split("T")[0]}`).catch(() => null);
        if (waterRes) {
          const waterGlasses = Math.round((waterRes?.total_water_ml ?? 0) / 250);
          setVitals((prev) =>
            prev.map((v) =>
              v.label === "الماء اليوم"
                ? { ...v, value: String(waterGlasses) }
                : v,
            ),
          );
        }
      } catch (e) {}
    }
    loadData();
  }, []);

  return (
    <View style={[styles.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 8,
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <IconButton
            icon="qr"
            bg={colors.surfaceSecondary}
            color={colors.textPrimary}
            onPress={() => router.push("/health/health-id")}
          />
          <View style={{ alignItems: "center" }}>
            <AppText variant="h3" color={colors.textPrimary}>
              صحتي
            </AppText>
          </View>
          <IconButton
            icon="edit"
            bg={colors.surfaceSecondary}
            color={colors.textPrimary}
            onPress={() => router.push("/health/edit-profile")}
          />
        </View>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 130,
          gap: 20,
          paddingTop: 16,
        }}
      >
        {/* Quick grid */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.grid}>
            {QUICK.map((q, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.85}
                onPress={() => router.push(q.route as any)}
                style={styles.gridItem}
              >
                <Card
                  padding={0}
                  style={{ alignItems: "center", paddingVertical: 16, gap: 8 }}
                >
                  <View
                    style={[
                      styles.gridIcon,
                      { backgroundColor: q.color + "18" },
                    ]}
                  >
                    <Icon name={q.icon} size={24} color={q.color} />
                  </View>
                  <AppText variant="labelSM" align="center">
                    {q.label}
                  </AppText>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Vitals */}
        <View>
          <SectionHeader
            title="مؤشراتك الحيوية"
            actionLabel="عرض الكل"
            onAction={() => router.push("/health/vitals")}
          />
          <View style={styles.vitalsGrid}>
            {vitals.map((v, i) => (
              <Animated.View
                key={i}
                entering={FadeInDown.delay(i * 80).duration(400)}
                style={{ width: "48%" }}
              >
                <Card
                  onPress={() => router.push("/health/vitals")}
                  style={{ gap: 10 }}
                >
                  <View
                    style={{
                      flexDirection: "row-reverse",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={[
                        styles.vitalIcon,
                        { backgroundColor: v.color + "18" },
                      ]}
                    >
                      <Icon name={v.icon} size={20} color={v.color} />
                    </View>
                    <Badge label={v.status} color={v.color} />
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <View
                      style={{
                        flexDirection: "row-reverse",
                        alignItems: "baseline",
                        gap: 3,
                      }}
                    >
                      <AppText variant="h3" color={v.color}>
                        {v.value}
                      </AppText>
                      <AppText variant="caption" color={colors.textTertiary}>
                        {v.unit}
                      </AppText>
                    </View>
                    <AppText variant="bodyXS" color={colors.textSecondary}>
                      {v.label}
                    </AppText>
                  </View>
                </Card>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Home nursing CTA */}
        <Card
          onPress={() => router.push("/(tabs)/nursing")}
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Icon name="chevronLeft" size={20} color={colors.textTertiary} />
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <AppText variant="h5">التمريض المنزلي</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              رعاية تمريضية احترافية في منزلك
            </AppText>
          </View>
          <View
            style={[
              styles.vitalIcon,
              { backgroundColor: colors.secondarySurface },
            ]}
          >
            <Icon name="nurse" size={24} color={colors.secondary} />
          </View>
        </Card>

        {upcomingAppt && (
          <View>
            <SectionHeader
              title="مواعيدك القادمة"
              actionLabel="الكل"
              onAction={() => router.push("/consultations/appointments")}
            />
            <Card
              onPress={() =>
                router.push({
                  pathname: "/consultations/waiting-room",
                  params: { appointmentId: upcomingAppt.id || "1" },
                })
              }
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={[
                  styles.vitalIcon,
                  { backgroundColor: colors.primarySurface },
                ]}
              >
                <Icon name="doctor" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <AppText variant="h5">{upcomingAppt.doctorName}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>
                  {upcomingAppt.type} · {upcomingAppt.time}
                </AppText>
              </View>
              <Badge label="فيديو" color={colors.primary} icon="video" />
            </Card>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  scoreCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 20,
    padding: 16,
  },
  ring: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },
  gridItem: { width: "22.4%" },
  gridIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  vitalsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  vitalIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
