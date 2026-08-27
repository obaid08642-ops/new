// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { useGuestGuard } from "../../src/hooks/useGuestGuard";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
} from "../../src/components/ui";
import { useConsultations } from "../../src/context/ConsultationsContext";

// Removed STATIC_APPOINTMENTS
const STATUS = {
  confirmed: { label: "مؤكد", color: "#23B5CE", bg: "#EBF3FF" },
  completed: { label: "مكتمل", color: "#5BA84F", bg: "#DCFCE7" },
  cancelled: { label: "ملغي", color: "#F0695C", bg: "#FEE2E2" },
  pending: { label: "قيد المراجعة", color: "#F0A526", bg: "#FEF3C7" },
};
const TYPE = {
  online: { label: "أونلاين", icon: "video" },
  clinic: { label: "عيادة", icon: "hospital" },
  home: { label: "منزلي", icon: "home" },
};

export default function AppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  // Guests CAN view their bookings — backed by their device-bound guest account.

  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const {
    appointments,
    isLoading: loading,
    error,
    fetchAppointments,
  } = useConsultations();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments(true);
    setRefreshing(false);
  };

  const filtered = appointments.filter((a) =>
    tab === "upcoming"
      ? ["confirmed", "pending"].includes(a.status)
      : ["completed", "cancelled"].includes(a.status),
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isDark ? colors.surface : colors.white,
          },
        ]}
      >
        <AppText variant="bodySM">مواعيدي</AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.tabRow,
          { backgroundColor: isDark ? colors.surface : colors.white },
        ]}
      >
        {(["upcoming", "past"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[
              styles.tabBtn,
              tab === t && {
                borderBottomColor: colors.primary,
                borderBottomWidth: 2.5,
              },
            ]}
          >
            <AppText variant="bodySM">
              {t === "upcoming" ? "القادمة" : "السابقة"}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          loading ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <AppText
                variant="bodySM"
                color={colors.textSecondary}
                style={{ marginTop: 8 }}
              >
                جاري تحميل مواعيدك...
              </AppText>
            </View>
          ) : error ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <AppText
                variant="bodySM"
                color={colors.error}
                style={{ marginTop: 8 }}
              >
                حدث خطأ أثناء جلب المواعيد
              </AppText>
              <TouchableOpacity
                onPress={() => fetchAppointments()}
                style={{
                  marginTop: 12,
                  padding: 8,
                  backgroundColor: colors.primarySurface,
                  borderRadius: 8,
                }}
              >
                <AppText variant="labelSM" color={colors.primary}>
                  حاول مرة أخرى
                </AppText>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.empty}>
              <Icon name="calendar" size={20} color={colors.primary} />
              <AppText variant="bodySM">
                لا توجد مواعيد {tab === "upcoming" ? "قادمة" : "سابقة"}
              </AppText>
              {tab === "upcoming" && (
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/consultations")}
                  style={[
                    styles.bookNowBtn,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <AppText variant="bodySM">احجز موعداً الآن</AppText>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const sc = STATUS[item.status as keyof typeof STATUS] || {
            label: "نشط",
            color: colors.primary,
            bg: colors.primarySurface,
          };
          const tc = TYPE[item.type as keyof typeof TYPE] || {
            label: "استشارة",
            icon: "stethoscope",
          };
          return (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/consultations/appointment-detail",
                  params: { appointmentId: item.id },
                })
              }
              style={[
                styles.apptCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
              activeOpacity={0.85}
            >
              <View style={styles.apptHeader}>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <AppText variant="labelSM" color={sc.color}>
                    {sc.label}
                  </AppText>
                </View>
                <View style={styles.docRow}>
                  <View
                    style={[
                      styles.docAva,
                      { backgroundColor: colors.primarySurface },
                    ]}
                  >
                    <Icon name="doctor" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.docInfo}>
                    <AppText variant="h6">{item.docName}</AppText>
                    <AppText variant="caption" color={colors.textSecondary}>
                      {item.spec}
                    </AppText>
                  </View>
                </View>
              </View>
              <View
                style={[
                  styles.apptDetails,
                  { borderTopColor: colors.borderLight, borderTopWidth: 1 },
                ]}
              >
                <AppText variant="labelMD" color={colors.primary}>
                  {item.price} ر.س
                </AppText>
                <View style={styles.apptMeta}>
                  <View
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: isDark
                          ? colors.background
                          : colors.backgroundSecondary,
                        flexDirection: "row-reverse",
                        gap: 4,
                        alignItems: "center",
                      },
                    ]}
                  >
                    <Icon
                      name={tc.icon as any}
                      size={12}
                      color={colors.primary}
                    />
                    <AppText variant="caption" color={colors.textSecondary}>
                      {tc.label}
                    </AppText>
                  </View>
                  <AppText variant="caption" color={colors.textTertiary}>
                    {item.date} • {item.time}
                  </AppText>
                </View>
              </View>
              {item.status === "confirmed" && (
                <View style={styles.apptActions}>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/consultations/cancel-reschedule",
                        params: { appointmentId: item.id },
                      })
                    }
                    style={[styles.cancelBtn, { borderColor: colors.error }]}
                  >
                    <AppText variant="labelSM" color={colors.error}>
                      إلغاء / تأجيل
                    </AppText>
                  </TouchableOpacity>
                  {item.type === "online" && (
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/consultations/waiting-room",
                          params: { appointmentId: item.id },
                        })
                      }
                      style={[
                        styles.joinBtn,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <AppText variant="labelSM" color="#fff">
                        انضم الآن
                      </AppText>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {item.status === "completed" && (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/consultations/book/[id]",
                      params: { id: (item as any).docId || "1" },
                    })
                  }
                  style={[
                    styles.rebookBtn,
                    { backgroundColor: colors.primarySurface },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row-reverse",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Icon name="sync" size={16} color={colors.primary} />
                    <AppText variant="labelSM" color={colors.primary}>
                      احجز مجدداً
                    </AppText>
                  </View>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
      />
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
  title: { fontSize: 18, fontWeight: "800" },
  tabRow: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontSize: 14, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: "400" },
  bookNowBtn: {
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  bookNowText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  apptCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  apptHeader: { padding: 16, gap: 10 },
  statusBadge: {
    alignSelf: "flex-end",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  docRow: { flexDirection: "row-reverse", gap: 12, alignItems: "center" },
  docAva: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  docInfo: { flex: 1, alignItems: "flex-end" },
  docName: { fontSize: 15, fontWeight: "800" },
  docSpec: { fontSize: 12, fontWeight: "400", marginTop: 2 },
  apptDetails: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  apptMeta: { alignItems: "flex-end", gap: 4 },
  apptDateTime: { fontSize: 13, fontWeight: "700" },
  typeChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  typeText: { fontSize: 11, fontWeight: "600" },
  apptPrice: { fontSize: 18, fontFamily: "Cairo-ExtraBold" },
  apptActions: {
    flexDirection: "row-reverse",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  cancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "700" },
  joinBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  joinBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  rebookBtn: {
    marginHorizontal: 16,
    marginBottom: 14,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  rebookText: { fontSize: 13, fontWeight: "700" },
});
