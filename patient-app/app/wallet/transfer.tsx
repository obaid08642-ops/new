// @ts-nocheck
// app/wallet/transfer.tsx — Premium redesign
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

  const handleTransfer = (type: string) => {
    Alert.prompt(
      "تحويل الرصيد",
      `أدخل رقم الجوال أو البريد الإلكتروني للمستلم (${type === "family" ? "العائلة" : "الطبيب"}):`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "متابعة",
          onPress: (recipient) => {
            if (!recipient?.trim()) {
              Alert.alert("خطأ", "يرجى إدخال معرف مستلم صحيح");
              return;
            }
            Alert.prompt(
              "تحديد المبلغ",
              "أدخل المبلغ المراد تحويله (ر.س):",
              [
                { text: "إلغاء", style: "cancel" },
                {
                  text: "تأكيد التحويل",
                  onPress: async (amountStr) => {
                    const amount = Number(amountStr);
                    if (isNaN(amount) || amount <= 0) {
                      Alert.alert("خطأ", "يرجى إدخال مبلغ صحيح");
                      return;
                    }
                    if (amount > balance) {
                      Alert.alert("خطأ", "رصيدك الحالي غير كافٍ");
                      return;
                    }
                    try {
                      const res: any = await apiFetch("/wallet/transfer", {
                        method: "POST",
                        body: JSON.stringify({ recipient, amount }),
                      });
                      Alert.alert(
                        "تم التحويل بنجاح",
                        `تم تحويل ${amount} ر.س إلى المستلم بنجاح.`,
                      );
                      setBalance(res.balance || balance - amount);
                    } catch (e) {
                      Alert.alert(
                        "خطأ",
                        "فشل التحويل. يرجى التحقق من توفر حساب للمستلم بالرقم المدخل.",
                      );
                    }
                  },
                },
              ],
              "plain-text",
              "50",
            );
          },
        },
      ],
    );
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[st.hdr, { paddingTop: insets.top + 12 }]}>
        <View style={st.hdrRow}>
          <View style={{ width: 40 }} />
          <AppText variant="h4" color="#fff">
            تحويل الرصيد
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
          onPress={() => handleTransfer("family")}
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View style={[st.fIcon, { backgroundColor: colors.primarySurface }]}>
            <Icon name="users" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
            <AppText variant="h6">فرد من العائلة</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              حوّل لمحفظة أحد أفراد عائلتك
            </AppText>
          </View>
          <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
        </Card>
        <Card
          onPress={() => handleTransfer("doctor")}
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View style={[st.fIcon, { backgroundColor: colors.primarySurface }]}>
            <Icon name="doctor" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
            <AppText variant="h6">دفع لطبيب</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              تحويل مباشر لحساب الطبيب
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
