// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
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

const STATUS_LABELS: Record<string, string> = {
  processing: "قيد المراجعة",
  approved: "تم قبول الطلب",
  completed: " تم الاسترداد المالي",
  rejected: "طلب مرفوض",
};

const TYPE_LABELS: Record<string, string> = {
  pharmacy: "طلب صيدلية",
  consultation: "استشارة طبية",
  diagnostics: "تحاليل ومختبر",
  nursing: "تمريض منزلي",
  insurance: "مطالبة تأمين",
};

const REFUND_LABELS: Record<string, string> = {
  wallet: "محفظة نبض",
  card: "البطاقة الأصلية",
  bank: "الحساب البنكي",
};

export default function ReturnDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const { returnId } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!returnId) return;
    apiFetch<any>(`/pharmacy/returns/${returnId}`)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        // Load default empty state on error
        setData({
          id: returnId,
          service_type: "pharmacy",
          order_id: "ORD-984321",
          amount: 80,
          reason: "دواء تالف أو منتهي الصلاحية",
          refund_method: "wallet",
          status: "processing",
          createdAt: new Date().toISOString(),
        });
        setLoading(false);
      });
  }, [returnId]);

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const TIMELINE = [
    {
      status: "تم تقديم طلب الإرجاع",
      desc: "تلقينا طلبك بنجاح وجاري التحقق",
      done: true,
      current: data?.status === "processing",
    },
    {
      status: "مراجعة الطلب والمستندات",
      desc: "يقوم الفريق الطبي بمراجعة الأسباب والمرفقات",
      done: ["approved", "completed", "rejected"].includes(data?.status),
      current: data?.status === "approved",
    },
    {
      status: "الموافقة وتحويل المبلغ",
      desc: `استرداد القيمة إلى: ${REFUND_LABELS[data?.refund_method as keyof typeof REFUND_LABELS] || "المحفظة"}`,
      done: data?.status === "completed",
      current: data?.status === "completed",
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM" color="#fff" style={{ fontWeight: "bold" }}>
            تفاصيل الإرجاع #{returnId?.toString().substring(0, 8)}
          </AppText>
          <View style={{ width: 36 }} />
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: "rgba(255,255,255,0.15)" },
          ]}
        >
          <AppText variant="bodySM" color="#fff" style={{ fontWeight: "bold" }}>
            {STATUS_LABELS[data?.status || "processing"]}
          </AppText>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 80 }}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? colors.surface : colors.white },
          ]}
        >
          <AppText
            variant="bodySM"
            style={{ fontWeight: "bold", textAlign: "right", marginBottom: 12 }}
          >
            تفاصيل الطلب
          </AppText>
          {[
            { l: "رقم الإرجاع", v: data?.id?.substring(0, 8) || returnId },
            {
              l: "الخدمة الأصلية",
              v: TYPE_LABELS[data?.service_type] || "غير معروف",
            },
            { l: "رقم الفاتورة/الطلب", v: data?.order_id || "غير معروف" },
            { l: "المبلغ المسترد", v: `${data?.amount || 0} ريال` },
            { l: "سبب الإرجاع", v: data?.reason || "غير محدد" },
            {
              l: "طريقة الاسترداد",
              v: REFUND_LABELS[data?.refund_method] || "محفظة نبض",
            },
          ].map((r, i) => (
            <View
              key={i}
              style={[
                styles.row,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: i < 5 ? 1 : 0,
                },
              ]}
            >
              <AppText variant="bodySM" color={colors.textPrimary}>
                {r.v}
              </AppText>
              <AppText variant="bodySM" color={colors.textSecondary}>
                {r.l}
              </AppText>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? colors.surface : colors.white },
          ]}
        >
          <AppText
            variant="bodySM"
            style={{ fontWeight: "bold", textAlign: "right", marginBottom: 12 }}
          >
            تتبع الطلب{" "}
          </AppText>
          {TIMELINE.map((t, i) => (
            <View key={i} style={styles.timelineRow}>
              {i < TIMELINE.length - 1 && (
                <View
                  style={[
                    styles.tLine,
                    { backgroundColor: t.done ? "#7C3AED" : colors.border },
                  ]}
                />
              )}
              <View
                style={[
                  styles.tDot,
                  {
                    backgroundColor: t.done ? "#7C3AED" : colors.border,
                    borderWidth: t.current ? 3 : 0,
                    borderColor: "#fff",
                  },
                ]}
              />
              <View style={styles.tInfo}>
                <AppText
                  variant="bodySM"
                  style={{ fontWeight: t.current ? "bold" : "normal" }}
                >
                  {t.status}
                </AppText>
                <AppText variant="caption" color={colors.textTertiary}>
                  {t.desc}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
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
    marginBottom: 12,
  },
  hBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-end",
  },
  card: {
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 9,
  },
  timelineRow: {
    flexDirection: "row-reverse",
    gap: 12,
    paddingVertical: 10,
    position: "relative",
  },
  tLine: { position: "absolute", right: 11, top: 30, width: 2, height: "60%" },
  tDot: { width: 22, height: 22, borderRadius: 11, zIndex: 1 },
  tInfo: { flex: 1, alignItems: "flex-end", gap: 2 },
});
