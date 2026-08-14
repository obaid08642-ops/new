// @ts-nocheck
// app/support/ticket.tsx — متابعة تذكرة الدعم
import React from "react";
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

export default function TicketTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [tickets, setTickets] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiFetch<any[]>('/support/tickets')
      .then(res => setTickets(res || []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isDark ? colors.surface : colors.white,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.push("/support/chat")}
          style={[styles.newBtn, { backgroundColor: colors.primarySurface }]}
        >
          <AppText variant="bodySM">+ جديد</AppText>
        </TouchableOpacity>
        <AppText variant="bodySM">تذاكر الدعم </AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}
      >
        {loading ? (
          <AppText variant="bodySM" style={{ textAlign: "center", marginTop: 20 }}>
            جاري تحميل التذاكر...
          </AppText>
        ) : tickets.length === 0 ? (
          <AppText variant="bodySM" style={{ textAlign: "center", marginTop: 20 }}>
            لا توجد تذاكر حالياً
          </AppText>
        ) : (
          tickets.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.ticketCard,
                {
                  backgroundColor: isDark ? colors.surface : colors.white,
                  borderRightWidth: 4,
                  borderRightColor: t.statusColor || "#23B5CE",
                },
              ]}
            >
              <View style={styles.ticketBottom}>
                <AppText variant="bodySM">آخر تحديث: {t.lastUpdate || "اليوم"}</AppText>
                <AppText variant="bodySM">{t.date || "اليوم"}</AppText>
              </View>
              <View style={styles.ticketTop}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: (t.statusColor || "#23B5CE") + "15" },
                  ]}
                >
                  <AppText variant="bodySM">{t.status || "مفتوح"}</AppText>
                </View>
                <View style={styles.ticketInfo}>
                  <AppText variant="bodySM">{t.id}</AppText>
                  <AppText variant="bodySM">{t.subject}</AppText>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  title: { fontSize: 17, fontWeight: "800" } as any,
  newBtn: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
  newBtnAlt: { fontSize: 13, fontWeight: "800" } as any,
  ticketCard: {
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
    gap: 8,
  },
  ticketTop: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
  },
  ticketInfo: { flex: 1, alignItems: "flex-end", gap: 3 },
  ticketId: { fontSize: 10, fontWeight: "400" } as any,
  ticketSubject: { fontSize: 14, fontWeight: "700", textAlign: "right" } as any,
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  status: { fontSize: 11, fontWeight: "800" } as any,
  ticketBottom: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  ticketUpdate: { fontSize: 10, fontWeight: "400" } as any,
  ticketDate: { fontSize: 10, fontWeight: "400" } as any,
});
