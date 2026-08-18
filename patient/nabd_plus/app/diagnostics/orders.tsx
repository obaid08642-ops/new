// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  I18nManager,
} from "react-native";
import { AppText } from "../../src/components/ui";
import { useApp } from "../../src/context/AppContext";
import Icon from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { apiFetch } from "../../src/utils/api";
import Animated, { FadeInDown } from "react-native-reanimated";
import { pickLocalized } from '../../src/utils/localize';

export default function DiagnosticsOrders() {
  const { colors } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<"current" | "past">("current");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // M4: دمج حجوزات التحاليل والأشعة في قائمة واحدة
        const [labsRes, radRes] = await Promise.all([
          apiFetch("/labs/bookings/mine").catch(() => null),
          apiFetch("/radiology/bookings/mine").catch(() => null),
        ]);
        const labs = (labsRes?.data || labsRes || []).map((b: any) => ({
          id: b.id,
          title: pickLocalized(b.items?.[0]?.name_ar, b.items?.[0]?.name_en) || 'حجز تحاليل مخبرية',
          status: (b.state || '').toLowerCase(),
          date: b.scheduled_at ? new Date(b.scheduled_at).toISOString().split('T')[0] : '',
          type: b.location_type || 'clinic',
          total: b.total,
        }));
        const rads = (radRes?.data || radRes || []).map((b: any) => ({
          id: b.id,
          title: pickLocalized(b.items?.[0]?.name_ar, b.items?.[0]?.name_en) || 'حجز أشعة وتصوير',
          status: (b.state || b.status || '').toLowerCase(),
          date: b.scheduled_at ? new Date(b.scheduled_at).toISOString().split('T')[0] : '',
          type: 'radiology',
          total: b.total,
        }));
        setOrders([...labs, ...rads].sort((a, b) => (a.date < b.date ? 1 : -1)));
      } catch (e) {
        console.log(e);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const currentOrders = orders.filter(
    (o) => !["ready", "cancelled"].includes(o.status),
  );
  const pastOrders = orders.filter((o) =>
    ["ready", "cancelled"].includes(o.status),
  );

  const displayOrders = tab === "current" ? currentOrders : pastOrders;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "#4CAF50";
      case "cancelled":
        return "#F44336";
      case "sent":
        return "#FF9800";
      case "in_review":
        return "#2196F3";
      case "analyzing":
        return "#9C27B0";
      default:
        return colors.primary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "ready":
        return "النتائج جاهزة";
      case "cancelled":
        return "ملغى";
      case "sent":
        return "تم الطلب";
      case "in_review":
        return "قيد المراجعة";
      case "analyzing":
        return "جاري التحليل";
      default:
        return "جاري المعالجة";
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon
            name={I18nManager.isRTL ? "arrow-right" : "arrow-left"}
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <AppText
          variant="h2"
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: colors.textPrimary,
          }}
        >
          طلباتي والنتائج
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View
        style={[
          styles.tabsWrap,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tabBtn,
            tab === "current" && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setTab("current")}
        >
          <AppText
            style={{
              color: tab === "current" ? colors.primary : colors.textSecondary,
              fontWeight: tab === "current" ? "bold" : "normal",
            }}
          >
            قيد التنفيذ
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            tab === "past" && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => setTab("past")}
        >
          <AppText
            style={{
              color: tab === "past" ? colors.primary : colors.textSecondary,
              fontWeight: tab === "past" ? "bold" : "normal",
            }}
          >
            النتائج السابقة
          </AppText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 50 }}
          />
        ) : displayOrders.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Icon
              name="clipboard-text-outline"
              size={64}
              color={colors.textSecondary}
            />
            <AppText style={{ color: colors.textSecondary, marginTop: 16 }}>
              لا توجد طلبات هنا
            </AppText>
          </View>
        ) : (
          displayOrders.map((order, index) => (
            <Animated.View
              key={order.id}
              entering={FadeInDown.delay(index * 100).duration(400)}
            >
              <TouchableOpacity
                style={[
                  styles.orderCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() =>
                  (router.push as any)(`/diagnostics/sample-tracking?bookingId=${order.id}`)
                }
              >
                <View style={styles.orderHeader}>
                  <AppText
                    style={{
                      color: colors.textPrimary,
                      fontWeight: "bold",
                      fontSize: 15,
                    }}
                  >
                    {order.title}
                  </AppText>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${getStatusColor(order.status)}15` },
                    ]}
                  >
                    <AppText
                      style={{
                        color: getStatusColor(order.status),
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      {getStatusText(order.status)}
                    </AppText>
                  </View>
                </View>

                <View style={styles.orderRow}>
                  <Icon
                    name="calendar-clock"
                    size={16}
                    color={colors.textSecondary}
                    style={styles.rowIcon}
                  />
                  <AppText
                    style={{ color: colors.textSecondary, fontSize: 13 }}
                  >
                    {order.date}
                  </AppText>
                </View>

                <View style={styles.orderRow}>
                  <Icon
                    name={
                      order.type === "home_visit"
                        ? "home-plus"
                        : "hospital-building"
                    }
                    size={16}
                    color={colors.textSecondary}
                    style={styles.rowIcon}
                  />
                  <AppText
                    style={{ color: colors.textSecondary, fontSize: 13 }}
                  >
                    {order.type === "home_visit"
                      ? "زيارة منزلية"
                      : "زيارة للمختبر"}
                  </AppText>
                </View>

                <View
                  style={[styles.footerRow, { borderTopColor: colors.border }]}
                >
                  <AppText
                    style={{ color: colors.textSecondary, fontSize: 13 }}
                  >
                    المبلغ الإجمالي:
                  </AppText>
                  <AppText
                    style={{
                      color: colors.primary,
                      fontWeight: "bold",
                      fontSize: 15,
                    }}
                  >
                    {order.total} ر.س
                  </AppText>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    paddingTop: 60,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  tabsWrap: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    borderBottomWidth: 1,
  },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 16 },
  content: { padding: 16, paddingBottom: 40 },
  emptyWrap: { alignItems: "center", justifyContent: "center", marginTop: 100 },
  orderCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  orderRow: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    alignItems: "center",
    marginBottom: 8,
  },
  rowIcon: {
    marginLeft: I18nManager.isRTL ? 0 : 8,
    marginRight: I18nManager.isRTL ? 8 : 0,
  },
  footerRow: {
    flexDirection: I18nManager.isRTL ? "row" : "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
