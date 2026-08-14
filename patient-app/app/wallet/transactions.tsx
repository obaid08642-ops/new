// @ts-nocheck
// app/wallet/transactions.tsx
import React, { useState } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity } from "react-native";
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

// Removed ALL_TX

const FILTERS = ["الكل", "خصم", "إيداع", "تحويل", "شحن"];
const TYPE_COLORS = {
  credit: "#5BA84F",
  debit: "#F0695C",
  topup: "#23B5CE",
  transfer: "#7A6BEA",
};

export default function WalletTransactionsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [filter, setFilter] = useState("الكل");

  const [allTx, setAllTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    apiFetch('/wallet/transactions')
      .then(res => {
        if (res && res.data) {
          // ensure transactions have the right structure for the UI
          const mapped = res.data.map((t: any) => ({
            id: t._id || t.id,
            amount: t.type === 'debit' ? -t.amount : t.amount,
            date: t.createdAt ? new Date(t.createdAt).toLocaleDateString('ar-SA') : '',
            ref: t._id ? t._id.slice(-6).toUpperCase() : '',
            desc: t.description || 'معاملة',
            cat: t.type === 'topup' ? 'شحن' : t.type === 'transfer' ? 'تحويل' : t.type === 'credit' ? 'إيداع' : 'خصم',
            type: t.type,
            icon: t.type === 'topup' ? 'wallet' : t.type === 'transfer' ? 'swap_horiz' : t.type === 'credit' ? 'arrow_downward' : 'arrow_upward'
          }));
          setAllTx(mapped);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "الكل"
      ? allTx
      : filter === "خصم"
        ? allTx.filter((t) => t.type === "debit")
        : filter === "إيداع"
          ? allTx.filter((t) => t.type === "credit")
          : filter === "تحويل"
            ? allTx.filter((t) => t.type === "transfer")
            : allTx.filter((t) => t.type === "topup");

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
        <AppText variant="bodySM">سجل المعاملات</AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View
        style={[
          styles.filtersRow,
          { backgroundColor: isDark ? colors.surface : colors.white },
        ]}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterChip,
              filter === f && { backgroundColor: colors.primary },
            ]}
          >
            <AppText variant="bodySM">{f}</AppText>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <AppText align="center" style={{ marginTop: 20 }}>جاري التحميل...</AppText>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View
            style={[
              styles.txCard,
              { backgroundColor: isDark ? colors.surface : colors.white },
            ]}
          >
            <View style={styles.txLeft}>
              <AppText variant="bodySM">
                {item.amount > 0 ? "+" : ""}
                {item.amount.toFixed(2)} ر
              </AppText>
              <AppText variant="bodySM">{item.date}</AppText>
              <AppText variant="bodySM">{item.ref}</AppText>
            </View>
            <View style={styles.txInfo}>
              <AppText variant="bodySM">{item.desc}</AppText>
              <View
                style={[
                  styles.txCat,
                  {
                    backgroundColor: isDark
                      ? colors.background
                      : colors.backgroundSecondary,
                  },
                ]}
              >
                <AppText variant="bodySM">{item.cat}</AppText>
              </View>
            </View>
            <View
              style={[
                styles.txIcon,
                {
                  backgroundColor:
                    (TYPE_COLORS[item.type as keyof typeof TYPE_COLORS] ||
                      "#888") + "20",
                },
              ]}
            >
              <Icon
                name={item.icon as any}
                size={18}
                color={
                  TYPE_COLORS[item.type as keyof typeof TYPE_COLORS] || "#888"
                }
              />
            </View>
          </View>
        )}
      />)}
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
  filtersRow: {
    flexDirection: "row-reverse",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  filterText: { fontSize: 12, fontWeight: "700" },
  txCard: {
    borderRadius: 16,
    padding: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  txInfo: { flex: 1, alignItems: "flex-end", gap: 4 },
  txDesc: { fontSize: 13, fontWeight: "700" },
  txCat: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  txCatText: { fontSize: 10, fontWeight: "400" },
  txLeft: { alignItems: "center", gap: 2 },
  txAmount: { fontSize: 14, fontFamily: "Cairo-ExtraBold" },
  txDate: { fontSize: 9, fontWeight: "400" },
  txRef: { fontSize: 8, fontWeight: "400" },
});
