// @ts-nocheck
import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
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

import { apiFetch } from "../../src/utils/api";

const STATE_MAP: any = {
  REQUESTED: { label: "قيد المراجعة", color: "#F0A526" },
  APPROVED: { label: "تمت الموافقة", color: "#23B5CE" },
  EXECUTED: { label: "تم الاسترداد", color: "#5BA84F" },
  REJECTED: { label: "مرفوض", color: "#F0695C" },
  FAILED: { label: "فشل التنفيذ", color: "#F0695C" },
};

export default function InsuranceRefundScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/refunds/my')
      .then((res: any) => setRefunds(Array.isArray(res) ? res : []))
      .catch(() => setRefunds([]))
      .finally(() => setLoading(false));
  }, []);

  const items = refunds.map((r: any) => {
    const s = STATE_MAP[r.state] || { label: r.state || "—", color: "#94A3B8" };
    return {
      id: r.id,
      service: r.reason || r.booking_id || "طلب استرداد",
      amount: r.refund_amount ?? r.amount_paid ?? null,
      status: s.label,
      statusColor: s.color,
      date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar') : '',
    };
  });

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }]}>
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 8,
          paddingHorizontal: 16,
        }}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM">استرداد التأمين</AppText>
          <View style={{ width: 36 }} />
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {!loading && items.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 48, gap: 8 }}>
            <Icon name="info" size={40} color={colors.textTertiary} />
            <AppText variant="bodySM" color={colors.textSecondary}>لا توجد طلبات استرداد</AppText>
          </View>
        )}
        {items.map((item, i) => (
          <View
            key={i}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
          >
            {item.amount !== null && (
              <AppText variant="h4" color={colors.primary}>
                {item.amount} ر.س
              </AppText>
            )}
            <View style={styles.info}>
              <AppText variant="h6" color={colors.textPrimary}>
                {item.service}
              </AppText>
              <AppText variant="caption" color={colors.textTertiary}>
                {item.id} • {item.date}
              </AppText>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: item.statusColor + "18" },
                ]}
              >
                <AppText variant="labelSM" color={item.statusColor}>
                  {item.status}
                </AppText>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: "#fff", fontSize: 17, fontWeight: "800" } as any,
  hBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderRadius: 18,
    padding: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  info: { flex: 1, alignItems: "flex-end", gap: 4 },
  service: { fontSize: 14, fontWeight: "800" } as any,
  ref: { fontSize: 11, fontWeight: "400" } as any,
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeAlt: { fontSize: 10, fontWeight: "700" } as any,
  amount: { fontSize: 18, fontFamily: "Cairo-ExtraBold" } as any,
});
