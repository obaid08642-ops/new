// @ts-nocheck
// app/settings/notifications.tsx
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
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
} from "../../src/components/ui";

const NOTIF_GROUPS = [
  {
    title: "المواعيد والحجوزات",
    items: [
      {
        id: "appt_reminder",
        label: "تذكير قبل الموعد",
        sub: "قبل ساعة وقبل يوم",
        key: "appt_reminder",
      },
      {
        id: "appt_confirm",
        label: "تأكيد الحجز",
        sub: "عند تأكيد أي حجز",
        key: "appt_confirm",
      },
      {
        id: "appt_cancel",
        label: "إلغاء الموعد",
        sub: "إذا ألغى الطبيب الموعد",
        key: "appt_cancel",
      },
    ],
  },
  {
    title: "الأدوية والصحة",
    items: [
      {
        id: "med_reminder",
        label: "تذكير الدواء",
        sub: "في أوقات جرعاتك",
        key: "med_reminder",
      },
      {
        id: "refill_alert",
        label: "تنبيه نفاد الدواء",
        sub: "عند قرب انتهاء المخزون",
        key: "refill_alert",
      },
      {
        id: "lab_results",
        label: "نتائج التحاليل",
        sub: "عند صدور النتائج",
        key: "lab_results",
      },
    ],
  },
  {
    title: "الطلبات والمعاملات",
    items: [
      {
        id: "order_status",
        label: "حالة الطلب",
        sub: "تحديثات الصيدلية والتوصيل",
        key: "order_status",
      },
      {
        id: "payment",
        label: "إشعارات الدفع",
        sub: "كل عملية دفع أو استرداد",
        key: "payment",
      },
      {
        id: "insurance",
        label: "التأمين والمطالبات",
        sub: "تحديثات المطالبات",
        key: "insurance",
      },
    ],
  },
  {
    title: "العروض والمجتمع",
    items: [
      {
        id: "offers",
        label: "العروض والخصومات",
        sub: "عروض حصرية وموسمية",
        key: "offers",
      },
      {
        id: "loyalty",
        label: "نقاط نبض",
        sub: "كسب أو استبدال النقاط",
        key: "loyalty",
      },
      {
        id: "community",
        label: "المجتمع",
        sub: "ردود وتعليقات على منشوراتك",
        key: "community",
      },
    ],
  },
];

export default function NotificationsSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [toggles, setToggles] = useState<Record<string, boolean>>({
    appt_reminder: true,
    appt_confirm: true,
    appt_cancel: true,
    med_reminder: true,
    refill_alert: true,
    lab_results: true,
    order_status: true,
    payment: true,
    insurance: true,
    offers: false,
    loyalty: true,
    community: false,
  });

  const toggle = (key: string) => setToggles((p) => ({ ...p, [key]: !p[key] }));
  const enableAll = () => {
    const all: Record<string, boolean> = {};
    NOTIF_GROUPS.flatMap((g) => g.items).forEach((i) => {
      all[i.key] = true;
    });
    setToggles(all);
  };
  const disableAll = () => {
    const none: Record<string, boolean> = {};
    NOTIF_GROUPS.flatMap((g) => g.items).forEach((i) => {
      none[i.key] = false;
    });
    setToggles(none);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isDark ? colors.surface : colors.white,
          },
        ]}
      >
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={disableAll}>
            <AppText variant="bodySM">تعطيل الكل</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={enableAll}>
            <AppText variant="bodySM">تفعيل الكل</AppText>
          </TouchableOpacity>
        </View>
        <AppText variant="bodySM">الإشعارات</AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {NOTIF_GROUPS.map((group, gi) => (
          <View key={gi} style={styles.group}>
            <AppText variant="bodySM">{group.title}</AppText>
            <View
              style={[
                styles.groupCard,
                { backgroundColor: isDark ? colors.surface : colors.white },
              ]}
            >
              {group.items.map((item, ii) => (
                <View
                  key={item.id}
                  style={[
                    styles.notifRow,
                    ii < group.items.length - 1 && {
                      borderBottomColor: colors.border,
                      borderBottomWidth: 1,
                    },
                  ]}
                >
                  <Switch
                    value={toggles[item.key]}
                    onValueChange={() => toggle(item.key)}
                    trackColor={{ false: colors.border, true: "#23B5CE50" }}
                    thumbColor={
                      toggles[item.key] ? "#23B5CE" : colors.textTertiary
                    }
                  />
                  <View style={styles.notifInfo}>
                    <AppText variant="bodySM">{item.label}</AppText>
                    <AppText variant="bodySM">{item.sub}</AppText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  title: { fontSize: 17, fontWeight: "800" },
  headerActions: { flexDirection: "row", gap: 10 },
  headerAction: { fontSize: 12, fontWeight: "700" },
  group: { marginTop: 20, paddingHorizontal: 16 },
  groupTitle: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupCard: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  notifRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  notifInfo: { flex: 1, alignItems: "flex-end", gap: 2 },
  notifLabel: { fontSize: 14, fontWeight: "700" },
  notifSub: { fontSize: 11, fontWeight: "400" },
});
