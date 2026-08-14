// @ts-nocheck
// app/payments/failed.tsx
import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
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

export default function PaymentFailedScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const params = useLocalSearchParams();

  const REASONS = [
    "• رصيد غير كافٍ في البطاقة",
    "• تأكد من صحة بيانات البطاقة",
    "• حاول مرة أخرى أو استخدم طريقة دفع مختلفة",
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.heroSection}>
        <View style={styles.failedIcon}>
          <Icon name="error" size={20} color={colors.primary} />
        </View>
        <AppText variant="bodySM">فشل الدفع</AppText>
        {params.amount && (
          <AppText variant="bodySM">{params.amount} ريال</AppText>
        )}
        <AppText variant="bodySM">لم تتم العملية بنجاح</AppText>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.surface : colors.white,
            margin: 16,
          },
        ]}
      >
        <AppText variant="bodySM">أسباب محتملة وحلول</AppText>
        {REASONS.map((r, i) => (
          <AppText variant="bodySM">{r}</AppText>
        ))}
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ borderRadius: 16, overflow: "hidden" }}
        >
          <View style={styles.retryBtn}>
            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="refresh" size={16} color={colors.primary} />
              <AppText variant="bodySM">إعادة المحاولة</AppText>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/wallet/hub")}
          style={[styles.walletBtn, { borderColor: colors.border }]}
        >
          <AppText variant="bodySM"> الدفع من المحفظة</AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace("/(tabs)")}>
          <AppText variant="bodySM">إلغاء والعودة</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroSection: {
    paddingTop: 80,
    paddingBottom: 36,
    alignItems: "center",
    gap: 10,
  },
  failedIcon: {
    width: 110,
    height: 110,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  failedTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  failedAmount: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 20,
    fontFamily: "Cairo-ExtraBold",
  },
  failedSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "400",
  },
  card: {
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 4,
  },
  reason: {
    fontSize: 13,
    fontWeight: "400",
    textAlign: "right",
    lineHeight: 22,
  },
  actions: { paddingHorizontal: 16, gap: 10, marginTop: 4 },
  retryBtn: {
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  retryBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  walletBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  walletBtnText: { fontSize: 14, fontWeight: "700" },
  cancelLink: { fontSize: 13, fontWeight: "400", textAlign: "center" },
});
