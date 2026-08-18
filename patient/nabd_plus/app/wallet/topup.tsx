// @ts-nocheck
// app/wallet/topup.tsx — REAL gateway-backed top-up.
// POST /wallet/topup creates a Moyasar payment intent; the wallet is credited ONLY
// after the gateway confirms payment (via /payments/processing → /wallet/topup/confirm).
import React, { useState, useEffect } from "react";
import {
  View, StyleSheet, ScrollView, StatusBar, Alert,
  TextInput, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  IconButton,
  SectionHeader,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const PRESETS = [50, 100, 200, 500];

export default function Screen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [balance, setBalance] = useState(0);
  const [amountStr, setAmountStr] = useState("100");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ balance: number }>("/wallet/balance")
      .then((res) => setBalance(res.balance))
      .catch(() => {});
  }, []);

  const amount = Number(amountStr);
  const amountValid = Number.isFinite(amount) && amount >= 10 && amount <= 50000;

  const handleTopup = async () => {
    if (!amountValid) {
      showLocalizedAlert("مبلغ غير صالح", "أدخل مبلغاً بين 10 و 50,000 ر.س");
      return;
    }
    setSubmitting(true);
    try {
      // Step 1: create a payment intent — NO money is credited here.
      const intent = await apiFetch<any>("/wallet/topup", {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
      if (!intent?.topup_id) throw new Error("intent_failed");
      // Step 2: pay through the hosted checkout; processing screen confirms + credits.
      router.push({
        pathname: "/payments/processing",
        params: {
          moyasarId: intent.moyasar_id || "",
          paymentUrl: intent.payment_url || "",
          walletTopupId: intent.topup_id,
          amount: String(intent.amount ?? amount),
        },
      });
    } catch (e: any) {
      showLocalizedAlert("تعذر بدء الشحن", e?.message || "حدث خطأ أثناء إنشاء عملية الدفع. حاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
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
        <SectionHeader title="اختر المبلغ" />
        <View style={st.presetRow}>
          {PRESETS.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setAmountStr(String(p))}
              style={[
                st.presetBtn,
                {
                  backgroundColor:
                    Number(amountStr) === p ? colors.primary : colors.surface,
                  borderColor:
                    Number(amountStr) === p ? colors.primary : colors.borderLight,
                },
              ]}
            >
              <AppText
                variant="h6"
                color={Number(amountStr) === p ? "#fff" : colors.textPrimary}
              >
                {p}
              </AppText>
              <AppText
                variant="caption"
                color={Number(amountStr) === p ? "rgba(255,255,255,0.8)" : colors.textTertiary}
              >
                ر.س
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <Card style={{ gap: 6 }}>
          <AppText variant="caption" color={colors.textTertiary}>
            أو أدخل مبلغاً مخصصاً
          </AppText>
          <TextInput
            value={amountStr}
            onChangeText={(t) => setAmountStr(t.replace(/[^0-9.]/g, ""))}
            keyboardType="decimal-pad"
            placeholder="المبلغ (ر.س)"
            placeholderTextColor={colors.textTertiary}
            style={[
              st.input,
              { color: colors.textPrimary, borderColor: colors.borderLight },
            ]}
          />
          <AppText variant="caption" color={colors.textTertiary}>
            الحد الأدنى 10 ر.س · الحد الأقصى 50,000 ر.س
          </AppText>
        </Card>

        <SectionHeader title="طريقة الدفع" />
        <Card
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
            <AppText variant="h6">بطاقة بنكية / مدى / Apple Pay</AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              يتم اختيار البطاقة داخل صفحة الدفع الآمنة (Moyasar)
            </AppText>
          </View>
          <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
        </Card>

        <TouchableOpacity
          onPress={handleTopup}
          disabled={submitting || !amountValid}
          style={[
            st.submitBtn,
            {
              backgroundColor:
                submitting || !amountValid ? colors.borderLight : colors.primary,
            },
          ]}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <AppText variant="h6" color="#fff">
              متابعة للدفع {amountValid ? `(${amount.toFixed(2)} ر.س)` : ""}
            </AppText>
          )}
        </TouchableOpacity>

        <AppText variant="caption" color={colors.textTertiary} style={{ textAlign: "center" }}>
          يُضاف الرصيد إلى محفظتك فقط بعد تأكيد الدفع من البوابة البنكية
        </AppText>
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
  presetRow: { flexDirection: "row-reverse", gap: 10 },
  presetBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
    gap: 2,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Cairo-Bold",
    textAlign: "right",
  },
  submitBtn: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
});
