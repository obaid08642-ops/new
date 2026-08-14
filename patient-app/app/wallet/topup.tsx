// @ts-nocheck
// app/wallet/topup.tsx — Premium redesign
import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, StatusBar, Alert } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Button,
  IconButton,
  SectionHeader,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

export default function Screen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    apiFetch<{ balance: number }>("/wallet/balance")
      .then((res) => setBalance(res.balance))
      .catch(() => {});
  }, []);

  const handleTopup = (method: string) => {
    Alert.prompt(
      "شحن الرصيد",
      `أدخل المبلغ الذي ترغب في شحنه عبر ${method} (ر.س):`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "شحن",
          onPress: async (amountStr?: string) => {
            const amount = Number(amountStr);
            if (isNaN(amount) || amount <= 0) {
              Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح");
              return;
            }
            try {
              const res: any = await apiFetch("/wallet/topup", {
                method: "POST",
                body: JSON.stringify({ amount, paymentMethod: method }),
              });
              Alert.alert(
                "تم الشحن بنجاح",
                `تم إضافة ${amount} ر.س إلى محفظتك`,
              );
              setBalance(res.balance || balance + amount);
            } catch (e) {
              Alert.alert("خطأ", "تعذر إتمام عملية الشحن");
            }
          },
        },
      ],
      "plain-text",
      "100",
    );
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[st.hdr, { paddingTop: insets.top + 12 }]}>
        <View style={st.hdrRow}>
          <View style={{ width: 40 }} />
          <AppText variant="h4" color="#fff">
            شحن المحفظة
          </AppText>
          <IconButton
            icon="back"
            bg="rgba(255,255,255,0.18)"
            color="#fff"
            onPress={() => router.back()}
          />
        </View>
        <View style={st.balanceCard}>
          <AppText variant="caption" color="rgba(255,255,255,0.8)">
            الرصيد الحالي
          </AppText>
          <View
            style={{
              flexDirection: "row-reverse",
              gap: 4,
              alignItems: "baseline",
            }}
          >
            <AppText variant="displayMD" color="#fff">
              {balance.toFixed(2)}
            </AppText>
            <AppText variant="bodySM" color="rgba(255,255,255,0.7)">
              ر.س
            </AppText>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
      >
        <SectionHeader title="الخيارات" />
        <Card
          onPress={() => handleTopup("مدى / فيزا")}
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View style={[st.fIcon, { backgroundColor: colors.primarySurface }]}>
            <Icon name="card" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
            <AppText variant="h6">بطاقة بنكية</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              فيزا / ماستركارد / مدى
            </AppText>
          </View>
          <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
        </Card>
        <Card
          onPress={() => handleTopup("Apple Pay")}
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View style={[st.fIcon, { backgroundColor: colors.primarySurface }]}>
            <Icon name="wallet" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
            <AppText variant="h6">Apple Pay</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              الدفع السريع
            </AppText>
          </View>
          <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
        </Card>
        <Card
          onPress={() => handleTopup("التحويل البنكي")}
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View style={[st.fIcon, { backgroundColor: colors.primarySurface }]}>
            <Icon name="document" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
            <AppText variant="h6">تحويل بنكي</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              تحويل مباشر لمحفظتك
            </AppText>
          </View>
          <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
        </Card>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  hdrRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  balanceCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    padding: 16,
  },
  fIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
