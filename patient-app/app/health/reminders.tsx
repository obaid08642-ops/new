// @ts-nocheck
// app/health/reminders.tsx
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

  // INITIAL_MEDS removed


export default function MedicationRemindersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [meds, setMeds] = useState<any[]>([]);
  const [streak, setStreak] = useState(5); // 5 days compliance streak
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/health/reminders');
      if (res && Array.isArray(res)) {
        setMeds(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTaken = async (id: string) => {
    const med = meds.find(m => m._id === id || m.id === id);
    if (!med) return;
    
    const nextState = !med.taken;
    
    try {
      await apiFetch(`/health/reminders/${id}/log`, {
        method: 'POST',
        body: JSON.stringify({ status: nextState ? 'taken' : 'missed' })
      });
      
      setMeds((prev) =>
        prev.map((m) => {
          if (m._id === id || m.id === id) {
            if (nextState) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setStreak((s) => s + 1);
            } else {
              setStreak((s) => Math.max(0, s - 1));
            }
            return { ...m, taken: nextState };
          }
          return m;
        }),
      );
    } catch (e) {
      Alert.alert('خطأ', 'تعذر تحديث حالة الجرعة');
    }
  };

  const handlePlayAlarmTest = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "منبه الدواء التجريبي",
      "طنيين المنبه المخصص... حان وقت جرعتك الطبية الآن.",
    );
  };

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
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
            icon="notificationFilled"
            bg={colors.surfaceSecondary}
            color={colors.textPrimary}
            onPress={handlePlayAlarmTest}
          />
          <AppText variant="h3" color={colors.textPrimary}>
            مذكر الأدوية الذكي
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          gap: 16,
          paddingBottom: insets.bottom + 60,
        }}
      >
        {/* Streak card */}
        <Card
          style={[
            st.streakCard,
            {
              backgroundColor: colors.successSurface,
              borderColor: colors.success + "20",
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row-reverse",
              gap: 10,
              alignItems: "center",
            }}
          >
            <View
              style={[st.streakIconCircle, { backgroundColor: colors.success }]}
            >
              <Icon name="sparkles" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <AppText variant="h5" color={colors.success}>
                التزام رائع بالأدوية!
              </AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                أنت ملتزم بجرعاتك لـ{" "}
                <AppText variant="labelSM" color={colors.success}>
                  {streak} أيام متتالية
                </AppText>
                . حافظ على صحتك!
              </AppText>
            </View>
          </View>
        </Card>

        {/* List of daily meds */}
        <SectionHeader title="جرعات اليوم" />
        {loading ? <AppText align="center" color={colors.textTertiary}>جاري التحميل...</AppText> : null}
        {!loading && meds.length === 0 ? <AppText align="center" color={colors.textTertiary}>لا توجد جرعات مجدولة اليوم</AppText> : null}
        {meds.map((med) => {
          const mId = med._id || med.id;
          return (
          <Card
            key={mId}
            style={[st.medCard, med.taken && { opacity: 0.75 }]}
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
                  st.medIconCircle,
                  {
                    backgroundColor: med.taken
                      ? colors.success + "18"
                      : colors.primarySurface,
                  },
                ]}
              >
                <Icon
                  name="medication"
                  size={24}
                  color={med.taken ? colors.success : colors.primary}
                />
              </View>

              <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
                <View
                  style={{
                    flexDirection: "row-reverse",
                    justifyContent: "space-between",
                    width: "100%",
                    alignItems: "center",
                  }}
                >
                  <AppText
                    variant="h6"
                    style={{
                      textDecorationLine: med.taken ? "line-through" : "none",
                    }}
                  >
                    {med.title || med.name || 'دواء'}
                  </AppText>
                  <AppText variant="caption" color={colors.primary}>
                    {med.time_string || med.time}
                  </AppText>
                </View>
                <AppText variant="bodyXS" color={colors.textSecondary}>
                  {med.dosage_instructions || med.instructions}
                </AppText>
              </View>
            </View>

            <View
              style={[st.cardFooter, { borderTopColor: colors.borderLight }]}
            >
              <TouchableOpacity
                onPress={() => handleToggleTaken(mId)}
                style={[
                  st.actionBtn,
                  {
                    backgroundColor: med.taken
                      ? colors.successSurface
                      : colors.primarySurface,
                  },
                ]}
              >
                <Icon
                  name={med.taken ? "check-circle" : "circle"}
                  size={18}
                  color={med.taken ? colors.success : colors.primary}
                />
                <AppText
                  variant="labelSM"
                  color={med.taken ? colors.success : colors.primary}
                >
                  {med.taken ? "تم أخذ الجرعة" : "تحديد كـ تم أخذها"}
                </AppText>
              </TouchableOpacity>
            </View>
          </Card>
          );
        })}

        {/* Refill Hub shortcut banner */}
        <Card
          onPress={() => router.push("/health/refills" as any)}
          style={[
            st.refillBanner,
            { borderRightColor: colors.primary, borderRightWidth: 4 },
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
                st.medIconCircle,
                { backgroundColor: colors.primarySurface },
              ]}
            >
              <Icon name="pharmacy" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <AppText variant="h6">إعادة صرف الأدوية المزمنة</AppText>
              <AppText variant="caption" color={colors.textTertiary}>
                تتبع المتبقي من أدوية السكري وتجنب الانقطاع
              </AppText>
            </View>
            <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

import { SectionHeader } from "../../src/components/ui";

const st = StyleSheet.create({
  container: { flex: 1 },
  hdr: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  streakCard: { padding: 14 },
  streakIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  medCard: { padding: 12, gap: 12 },
  medIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardFooter: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
    flexDirection: "row-reverse",
  },
  actionBtn: {
    flexDirection: "row-reverse",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  refillBanner: { padding: 14 },
});
