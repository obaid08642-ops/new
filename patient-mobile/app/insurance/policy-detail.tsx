// @ts-nocheck
import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
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

export default function PolicyDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/users/me/profile')
      .then((p: any) => setPolicy(p?.insurance || null))
      .catch(() => setPolicy(null))
      .finally(() => setLoading(false));
  }, []);

  const DETAILS = policy ? [
    { label: "شركة التأمين", val: policy.provider },
    { label: "رقم البوليصة", val: policy.policy_number },
    { label: "اسم العضو", val: policy.member_name },
    { label: "الهوية الوطنية", val: policy.national_id },
    { label: "الشبكة", val: policy.network },
    { label: "الفئة", val: policy.class },
    { label: "تاريخ الانتهاء", val: policy.expiry_date },
    { label: "حالة التوثيق", val: policy.verified ? "موثّقة" : "قيد المراجعة" },
  ].filter(d => d.val) : [];

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }]}>
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 8,
          paddingHorizontal: 16,
        }}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM">تفاصيل البوليصة</AppText>
          <View style={{ width: 36 }} />
        </View>
        {policy && (
          <View style={[styles.activeBadge]}>
            <View style={[styles.greenDot, !policy.verified && { backgroundColor: '#F0A526' }]} />
            <AppText variant="labelSM" color="#fff">
              {policy.verified ? "موثّقة" : "قيد المراجعة"}
            </AppText>
          </View>
        )}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {!loading && !policy && (
          <View style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}>
            <Icon name="info" size={40} color={colors.textTertiary} />
            <AppText variant="bodySM" color={colors.textSecondary}>لا توجد بوليصة مسجّلة على حسابك</AppText>
            <TouchableOpacity onPress={() => router.push('/insurance/add-policy')}>
              <AppText variant="bodySM" color={colors.primary}>إضافة بوليصة</AppText>
            </TouchableOpacity>
          </View>
        )}
        {policy && (
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
        >
          {DETAILS.map((d, i) => (
            <View
              key={i}
              style={[
                styles.row,
                { borderBottomColor: colors.borderLight },
                i === DETAILS.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <AppText variant="labelMD" color={colors.textPrimary}>
                {d.val}
              </AppText>
              <AppText variant="bodySM" color={colors.textSecondary}>
                {d.label}
              </AppText>
            </View>
          ))}
        </View>
        )}
        <TouchableOpacity
          onPress={() => router.push("/insurance/coverage-check")}
          style={[styles.checkBtn, { backgroundColor: colors.primarySurface }]}
        >
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="search" size={16} color={colors.primary} />
            <AppText variant="bodySM">التحقق من التغطية</AppText>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { color: "#fff", fontSize: 17, fontWeight: "800" } as any,
  hBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  activeBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ADE80",
  },
  active: { color: "#fff", fontSize: 13, fontWeight: "700" } as any,
  card: { borderRadius: 18, padding: 14 },
  row: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  label: { fontSize: 12, fontWeight: "400" } as any,
  val: { fontSize: 13, fontWeight: "700" } as any,
  checkBtn: {
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  checkBtnAlt: { fontSize: 14, fontWeight: "700" } as any,
});
