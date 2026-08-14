// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { useCart } from "../../src/context/CartContext";
import { useGuestGuard } from "../../src/hooks/useGuestGuard";
import { apiFetch } from "../../src/utils/api";
import { lightColors, darkColors } from "../../src/theme/colors";

export default function OrderHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === "ar" || lang === "ur";

  const { isGuest, requireAuth } = useGuestGuard();
  if (isGuest) {
    requireAuth();
    return null;
  }

  const { addItem } = useCart();

  const [activeFilter, setActiveFilter] = useState("all");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const STATUS_CONFIG: Record<
    string,
    { label: string; color: string; bg: string }
  > = {
    DELIVERED: { label: "تم التوصيل", color: "#2BB89C", bg: "#E2F7F2" },
    CANCELLED: { label: "ملغي", color: "#F0695C", bg: "#FEEFED" },
    PENDING: { label: "قيد التنفيذ", color: "#F0A526", bg: "#FEF4E0" },
  };

  const loadOrders = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await apiFetch("/orders/mine");
      const raw = Array.isArray(res) ? res : res?.data;
      if (raw && raw.length > 0) {
        setOrders(
          raw.map((o: any) => ({
            id: o.id || o._id,
            date: o.createdAt
              ? new Date(o.createdAt).toLocaleDateString("ar-SA", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "",
            items: (o.items || []).map((i: any) => ({
              id: i.medicine_id || i.id || `temp-${Math.random()}`,
              name:
                i.name_ar || i.name_en || i.product_name || i.name || "دواء",
              price: i.price || 0,
              qty: i.qty || 1,
            })),
            total: o.total || o.subtotal || 0,
            status: o.state || "PENDING",
            pharmacy: o.pharmacy_name || "صيدلية",
          })),
        );
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filtered =
    activeFilter === "all"
      ? orders
      : orders.filter((o) => o.status === activeFilter);

  const handleReorder = (orderItems: any[]) => {
    orderItems.forEach((i) => {
      addItem({
        id: i.id,
        name: i.name,
        price: i.price,
        qty: i.qty,
        rx: false,
      });
    });
    router.push("/pharmacy/cart");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: colors.bg,
            flexDirection: isRTL ? "row-reverse" : "row",
          },
        ]}
      >
        <View style={{ width: 40 }} />
        <Text style={[styles.title, { color: colors.n }]}>سجل طلباتي</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text
            style={{
              fontFamily: "MaterialSymbolsRounded",
              color: colors.n,
              fontSize: 28,
            }}
          >
            {isRTL ? "arrow_forward" : "arrow_back"}
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.filters,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        {[
          { id: "all", label: "الكل" },
          { id: "DELIVERED", label: "مكتمل" },
          { id: "CANCELLED", label: "ملغي" },
        ].map((f) => (
          <TouchableOpacity
            key={f.id}
            onPress={() => setActiveFilter(f.id)}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === f.id ? "#141A2A" : colors.s,
                borderColor: activeFilter === f.id ? "#141A2A" : colors.bd,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === f.id ? "#fff" : colors.t2 },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadOrders(true)}
            tintColor="#23B5CE"
          />
        }
        ListHeaderComponent={
          loading ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <ActivityIndicator size="large" color="#23B5CE" />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG["PENDING"];
          return (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/pharmacy/order-tracking",
                  params: { orderId: item.id },
                })
              }
              style={[
                styles.orderCard,
                { backgroundColor: colors.s, borderColor: colors.bd },
              ]}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.orderHeader,
                  { flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
              >
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.color }]}>
                    {sc.label}
                  </Text>
                </View>
                <View
                  style={{
                    alignItems: isRTL ? "flex-end" : "flex-start",
                    gap: 2,
                  }}
                >
                  <Text style={[styles.orderId, { color: colors.t3 }]}>
                    رقم الطلب: {item.id}
                  </Text>
                  <Text style={[styles.orderDate, { color: colors.t2 }]}>
                    {item.date}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  marginTop: 12,
                  marginBottom: 12,
                  alignItems: isRTL ? "flex-end" : "flex-start",
                }}
              >
                <Text style={[styles.pharmacyName, { color: colors.n }]}>
                  {" "}
                  {item.pharmacy}
                </Text>
                <Text style={[styles.itemsList, { color: colors.t2 }]}>
                  {item.items
                    .map((i: any) => `${i.name} × ${i.qty}`)
                    .join(" • ")}
                </Text>
              </View>

              <View
                style={[
                  styles.orderFooter,
                  {
                    flexDirection: isRTL ? "row-reverse" : "row",
                    borderTopColor: colors.bd,
                  },
                ]}
              >
                {item.status === "DELIVERED" ? (
                  <TouchableOpacity
                    onPress={() => handleReorder(item.items)}
                    style={[styles.reorderBtn, { backgroundColor: "#DEF5F9" }]}
                  >
                    <Text style={[styles.reorderText, { color: "#23B5CE" }]}>
                      إعادة الطلب
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View />
                )}
                <View
                  style={{
                    flexDirection: isRTL ? "row-reverse" : "row",
                    alignItems: "baseline",
                    gap: 4,
                  }}
                >
                  <Text style={[styles.orderTotal, { color: "#23B5CE" }]}>
                    {item.total}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Cairo-Bold",
                      fontSize: 13,
                      color: colors.t3,
                    }}
                  >
                    ر.س
                  </Text>
                </View>
              </View>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontFamily: "Cairo-Black", fontSize: 18 },
  backBtn: { width: 40, alignItems: "flex-end", justifyContent: "center" },
  filters: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  filterChip: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
  },
  filterText: { fontFamily: "Cairo-Bold", fontSize: 14 },
  orderCard: { borderRadius: 24, borderWidth: 1, padding: 16 },
  orderHeader: { justifyContent: "space-between", alignItems: "flex-start" },
  orderDate: { fontFamily: "Cairo-Bold", fontSize: 13 },
  orderId: { fontFamily: "Cairo-Regular", fontSize: 12 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { fontFamily: "Cairo-Bold", fontSize: 12 },
  pharmacyName: { fontFamily: "Cairo-Bold", fontSize: 14, marginBottom: 4 },
  itemsList: { fontFamily: "Cairo-Regular", fontSize: 13 },
  orderFooter: {
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  orderTotal: { fontFamily: "Cairo-Black", fontSize: 22 },
  reorderBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  reorderText: { fontFamily: "Cairo-Bold", fontSize: 13 },
});
