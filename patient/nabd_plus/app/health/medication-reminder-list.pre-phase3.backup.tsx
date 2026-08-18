// @ts-nocheck
// medication-reminder-list.tsx — Active reminders with "taken"/"snooze"
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
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
import { useGuestGuard } from "../../src/hooks/useGuestGuard";
import { apiFetch } from "../../src/utils/api";

interface Reminder {
  id: string;
  name: string;
  dose: string;
  time: string;
  pills: number;
  instruction: string;
  chronic: boolean;
  taken: boolean;
  snoozed: boolean;
}

// Reminders fetched dynamically

export default function MedicationReminderListScreen() {
  const insets = useSafeAreaInsets();
  // Guests CAN view medication reminders — device-bound guest account.
  const { colors, isDark } = useApp();
  const [meds, setMeds] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/health/medications/reminders');
        setMeds(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const markTaken = (id: string) =>
    setMeds((p) =>
      p.map((m) => (m.id === id ? { ...m, taken: true, snoozed: false } : m)),
    );
  const markSnooze = (id: string) =>
    setMeds((p) => p.map((m) => (m.id === id ? { ...m, snoozed: true } : m)));

  const takenCount = meds.filter((m) => m.taken).length;
  const totalToday = meds.length;

  const pending = meds.filter((m) => !m.taken);
  const done = meds.filter((m) => m.taken);

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
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ width: 44 }} />
          <AppText variant="h3" color={colors.textPrimary}>
            تذكيرات الأدوية
          </AppText>
          <IconButton
            icon="back"
            bg={colors.surfaceSecondary}
            color={colors.textPrimary}
            onPress={() => router.back()}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
      >
        {/* Pending */}
        {pending.length > 0 && (
          <>
            <SectionHeader title={`في الانتظار (${pending.length})`} />
            {pending.map((m, i) => (
              <Animated.View
                key={m.id}
                entering={FadeInDown.delay(i * 60).duration(300)}
              >
                <Card style={{ gap: 10 }}>
                  <View
                    style={{
                      flexDirection: "row-reverse",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={[
                        st.medIcon,
                        {
                          backgroundColor: m.chronic
                            ? colors.warningSurface
                            : colors.primarySurface,
                        },
                      ]}
                    >
                      <Icon
                        name="medication"
                        size={22}
                        color={m.chronic ? colors.warning : colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
                      <AppText variant="h6">{m.name}</AppText>
                      <AppText variant="bodyXS" color={colors.textTertiary}>
                        {m.dose} · {m.pills} حبة · {m.instruction}
                      </AppText>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <AppText variant="labelMD" color={colors.primary}>
                        {m.time}
                      </AppText>
                      {m.chronic && (
                        <Badge label="مزمن" color={colors.warning} />
                      )}
                      {m.snoozed && (
                        <Badge label="مؤجّل" color={colors.textTertiary} />
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                    <Button
                      label="تم أخذها"
                      variant="primary"
                      icon="check_circle"
                      size="sm"
                      full={false}
                      onPress={() => markTaken(m.id)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      label="غفوة 30 دق"
                      variant="outline"
                      icon="clock"
                      size="sm"
                      full={false}
                      onPress={() => markSnooze(m.id)}
                      style={{ flex: 1 }}
                    />
                  </View>
                  {m.chronic && (
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/(tabs)/pharmacy",
                          params: { reorder: m.name },
                        })
                      }
                      style={[
                        st.reorderBtn,
                        { backgroundColor: colors.warningSurface },
                      ]}
                    >
                      <AppText variant="labelSM" color={colors.warning}>
                        طلب من الصيدلية
                      </AppText>
                      <Icon
                        name="shopping_cart"
                        size={14}
                        color={colors.warning}
                      />
                    </TouchableOpacity>
                  )}
                </Card>
              </Animated.View>
            ))}
          </>
        )}

        {/* Done */}
        {done.length > 0 && (
          <>
            <SectionHeader title={`تم أخذها (${done.length})`} />
            {done.map((m) => (
              <Card
                key={m.id}
                style={{
                  flexDirection: "row-reverse",
                  gap: 12,
                  alignItems: "center",
                  opacity: 0.6,
                }}
              >
                <View
                  style={[
                    st.medIcon,
                    { backgroundColor: colors.successSurface },
                  ]}
                >
                  <Icon name="check_circle" size={22} color={colors.success} />
                </View>
                <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
                  <AppText variant="h6" color={colors.textSecondary}>
                    {m.name}
                  </AppText>
                  <AppText variant="caption" color={colors.textTertiary}>
                    {m.dose} · {m.time}
                  </AppText>
                </View>
                <Badge label="تم" color={colors.success} icon="check_circle" />
              </Card>
            ))}
          </>
        )}

        {/* Chronic meds CTA */}
        <Card
          onPress={() => router.push("/health/chronic-medications")}
          style={{
            flexDirection: "row-reverse",
            gap: 12,
            alignItems: "center",
          }}
        >
          <View
            style={[st.medIcon, { backgroundColor: colors.warningSurface }]}
          >
            <Icon name="refresh" size={22} color={colors.warning} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <AppText variant="h6">الأدوية المزمنة</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              إدارة أدويتك الدائمة وإعادة الطلب
            </AppText>
          </View>
          <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
        </Card>
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
  progress: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  progressRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  medIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  reorderBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
});
