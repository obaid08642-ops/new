// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
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

const STATUS_CONFIG = {
  processing: {
    label: "قيد المراجعة",
    color: "#F0A526",
    bg: "#FEF3C7",
    icon: "",
  },
  approved: {
    label: "تمت الموافقة",
    color: "#23B5CE",
    bg: "#EBF3FF",
    icon: "check_circle",
  },
  completed: {
    label: "تم الاسترداد",
    color: "#5BA84F",
    bg: "#DCFCE7",
    icon: "wallet",
  },
  rejected: { label: "مرفوض", color: "#F0695C", bg: "#FEE2E2", icon: "error" },
};

const TYPE_LABELS = {
  pharmacy: "صيدلية",
  consultation: "استشارة طبية",
  diagnostics: "تحاليل",
  nursing: "تمريض",
  insurance: "تأمين",
};

const REFUND_LABELS = {
  wallet: "محفظة نبض",
  card: "البطاقة الأصلية",
  bank: "الحساب البنكي",
};

export default function ReturnsHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);

  const fetchReturns = () => {
    apiFetch<any[]>("/pharmacy/returns")
      .then((res) => {
        if (res) {
          const mapped = res.map((r: any) => ({
            id: r.id,
            type: r.service_type,
            title:
              r.service_type === "pharmacy"
                ? `طلب صيدلية #${r.order_id.substring(0, 8)}`
                : `طلب إرجاع #${r.id.substring(0, 8)}`,
            amount: r.amount,
            status: r.status, // processing, approved, completed, rejected
            date: new Date(r.createdAt).toLocaleDateString("ar-EG", {
              month: "short",
              day: "numeric",
            }),
            reason: r.reason,
            icon: r.service_type === "pharmacy" ? "pill" : "wallet",
            refundMethod:
              REFUND_LABELS[r.refund_method as keyof typeof REFUND_LABELS] ||
              "محفظة نبض",
            timeline:
              r.status === "completed"
                ? "اكتمل"
                : r.status === "rejected"
                  ? "مرفوض"
                  : "خلال 24-48 ساعة",
          }));
          setRequests(mapped);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const filtered =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const totalPending = requests
    .filter((r) => r.status === "processing" || r.status === "approved")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.push("/returns/new-request")}
            style={styles.hBtn}
          >
            <Icon name="add" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM" color="#fff" style={{ fontWeight: "bold" }}>
            الإرجاع والاسترداد
          </AppText>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.summaryRow}>
          {[
            { num: requests.length.toString(), label: "طلب إرجاع" },
            { num: `${totalPending} ر`, label: "قيد الاسترداد" },
            {
              num: requests
                .filter((r) => r.status === "completed")
                .length.toString(),
              label: "مكتمل",
            },
          ].map((s, i) => (
            <View
              key={i}
              style={[styles.summaryItem, i > 0 && styles.summaryDivider]}
            >
              <AppText
                variant="bodySM"
                color="#fff"
                style={{ fontWeight: "bold" }}
              >
                {s.num}
              </AppText>
              <AppText variant="caption" color="rgba(255,255,255,0.7)">
                {s.label}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      {/* Refund Policy Banner */}
      <View
        style={[
          styles.policyBanner,
          {
            backgroundColor: isDark ? colors.surface : "#EDE9FE",
            borderColor: "#7C3AED30",
          },
        ]}
      >
        <AppText
          variant="bodySM"
          color="#7C3AED"
          style={{ textAlign: "right", lineHeight: 18 }}
        >
          سياسة الاسترداد: الإلغاء قبل 24ساعة = 100% • قبل 12ساعة = 50% • أقل من
          12ساعة = لا يُسترد
        </AppText>
      </View>

      {/* Filter */}
      <View
        style={[
          styles.filterRow,
          { backgroundColor: isDark ? colors.surface : colors.white },
        ]}
      >
        {[
          ["all", "الكل"],
          ["processing", "قيد المراجعة"],
          ["approved", "موافق"],
          ["completed", "مكتمل"],
          ["rejected", "مرفوض"],
        ].map(([key, label]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setFilter(key)}
            style={[
              styles.filterChip,
              filter === key && { backgroundColor: "#7C3AED" },
            ]}
          >
            <AppText
              variant="bodySM"
              color={filter === key ? "#fff" : colors.textPrimary}
            >
              {label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="refresh" size={20} color={colors.primary} />
              <AppText variant="bodySM" color={colors.textTertiary}>
                لا توجد طلبات في هذه الفئة
              </AppText>
            </View>
          }
          renderItem={({ item }) => {
            const sc =
              STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] ||
              STATUS_CONFIG.processing;
            return (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/returns/detail",
                    params: { returnId: item.id },
                  })
                }
                style={[
                  styles.returnCard,
                  { backgroundColor: isDark ? colors.surface : colors.white },
                ]}
                activeOpacity={0.85}
              >
                <View style={styles.returnTop}>
                  <View
                    style={[styles.statusBadge, { backgroundColor: sc.bg }]}
                  >
                    <AppText variant="caption" color={sc.color}>
                      {sc.icon} {sc.label}
                    </AppText>
                  </View>
                  <View style={styles.returnInfo}>
                    <AppText variant="bodySM" style={{ fontWeight: "bold" }}>
                      {item.title}
                    </AppText>
                    <AppText variant="caption" color={colors.textSecondary}>
                      {TYPE_LABELS[item.type as keyof typeof TYPE_LABELS]} •{" "}
                      {item.date}
                    </AppText>
                    <AppText variant="caption" color={colors.textTertiary}>
                      السبب: {item.reason}
                    </AppText>
                  </View>
                </View>

                <View
                  style={[
                    styles.returnBottom,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <View style={styles.returnBottomLeft}>
                    <AppText variant="caption" color={colors.textSecondary}>
                       {item.timeline}
                    </AppText>
                    <AppText variant="caption" color={colors.textTertiary}>
                      إلى: {item.refundMethod}
                    </AppText>
                  </View>
                  <AppText
                    variant="bodySM"
                    color={colors.primary}
                    style={{ fontWeight: "bold" }}
                  >
                    {item.amount} ريال
                  </AppText>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <View style={[styles.fab, { backgroundColor: "#7C3AED" }]}>
        <TouchableOpacity
          onPress={() => router.push("/returns/new-request")}
          style={styles.fabInner}
        >
          <Icon name="add" size={24} color="#fff" />
          <AppText variant="bodySM" color="#fff" style={{ fontWeight: "bold" }}>
            طلب إرجاع جديد
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  hBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  summaryRow: {
    flexDirection: "row-reverse",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 12,
  },
  summaryItem: { flex: 1, alignItems: "center", gap: 2 },
  summaryDivider: { borderRightWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  policyBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  filterRow: {
    flexDirection: "row-reverse",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  filterChip: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  returnCard: {
    borderRadius: 20,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  returnTop: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  returnInfo: { flex: 1, alignItems: "flex-end", gap: 4 },
  statusBadge: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  returnBottom: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  returnBottomLeft: { alignItems: "flex-end", gap: 3 },
  fab: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    borderRadius: 18,
  },
  fabInner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
  },
});
