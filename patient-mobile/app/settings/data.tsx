// @ts-nocheck
// app/settings/data.tsx — إدارة البيانات الشخصية
import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Share } from "react-native";
import { apiFetch } from "../../src/utils/api";
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

export default function DataManagementScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [storageData, setStorageData] = React.useState<any[]>([]);
  const [totalStorage, setTotalStorage] = React.useState("0 MB");

  React.useEffect(() => {
    apiFetch<any>('/users/me/storage')
      .then(res => {
        if (res) {
          setStorageData(res.items || []);
          setTotalStorage(res.total || "0 MB");
        }
      })
      .catch(() => {});
  }, []);
  const DATA_ACTIONS = [
    {
      icon: "download",
      label: "تحميل نسخة من بياناتي",
      sub: "JSON — تصدير فوري من المنصة",
      color: "#23B5CE",
      action: async () => {
        try {
          const bundle = await apiFetch('/users/me/export');
          await Share.share({ message: JSON.stringify(bundle).slice(0, 9000) });
        } catch {
          alert('تعذر التصدير الآن، حاول لاحقاً');
        }
      },
    },
    {
      icon: "refresh",
      label: "نقل بياناتي لمنصة أخرى",
      sub: "تصدير JSON قابل للتحويل (FHIR/HL7 عبر الدعم)",
      color: "#5BA84F",
      action: async () => {
        try {
          const bundle = await apiFetch('/users/me/export');
          await Share.share({ message: JSON.stringify(bundle).slice(0, 9000) });
        } catch {
          alert('تعذر التصدير الآن، حاول لاحقاً');
        }
      },
    },
    {
      icon: "trending_up",
      label: "ما البيانات التي نجمعها؟",
      sub: "راجع سياسة الخصوصية",
      color: "#7A6BEA",
      action: () => router.push("/settings/privacy"),
    },
    {
      icon: "trash",
      label: "حذف بياناتي نهائياً",
      sub: "سيُنشأ طلب حذف عبر الدعم للتحقق من هويتك",
      color: "#F0695C",
      action: async () => {
        try {
          await apiFetch('/support/requests', {
            method: 'POST',
            body: JSON.stringify({ type: 'data_deletion', details: 'GDPR/PDPL deletion request from data settings' }),
          });
          alert('تم إنشاء طلب الحذف — سنتواصل معك لتأكيد الهوية');
        } catch {
          alert('تعذر إنشاء الطلب، حاول لاحقاً');
        }
      },
    },
  ];

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isDark ? colors.surface : colors.white,
          },
        ]}
      >
        <AppText variant="bodySM">إدارة بياناتي</AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 80 }}
      >
        <View style={[styles.infoCard, { backgroundColor: "#EBF3FF" }]}>
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="lock" size={16} color={colors.primary} />
            <AppText variant="bodySM">
              وفقاً للائحة حماية البيانات، لديك حق الوصول لبياناتك ونقلها وحذفها
              في أي وقت.
            </AppText>
          </View>
        </View>
        <View
          style={[
            styles.storageCard,
            { backgroundColor: isDark ? colors.surface : colors.white },
          ]}
        >
          <AppText variant="bodySM">مساحة البيانات المستخدمة</AppText>
          <View style={styles.storageRow}>
            {storageData.length > 0 ? storageData.map((s, i) => (
              <View key={i} style={styles.storageItem}>
                <AppText variant="bodySM">{s.val}</AppText>
                <View
                  style={[
                    styles.storageMini,
                    { backgroundColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.storageMiniFill,
                      { width: `${s.pct}%`, backgroundColor: s.color || "#23B5CE" },
                    ]}
                  />
                </View>
                <AppText variant="bodySM">{s.label}</AppText>
              </View>
            )) : (
              <AppText variant="bodySM" style={{ flex: 1, textAlign: "center" }}>جاري التحميل...</AppText>
            )}
          </View>
          <AppText variant="bodySM">الإجمالي: {totalStorage} من 2 GB</AppText>
        </View>
        {DATA_ACTIONS.map((action, i) => (
          <TouchableOpacity
            key={i}
            onPress={action.action}
            style={[
              styles.actionCard,
              {
                backgroundColor: isDark ? colors.surface : colors.white,
                borderRightWidth: 4,
                borderRightColor: action.color,
              },
            ]}
          >
            <Icon name="chevronRight" size={18} color={colors.textTertiary} />
            <View style={styles.actionInfo}>
              <AppText variant="bodySM">{action.label}</AppText>
              <AppText variant="bodySM">{action.sub}</AppText>
            </View>
            <AppText variant="bodySM">{action.icon}</AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  title: { fontSize: 17, fontWeight: "800" },
  infoCard: { borderRadius: 14, padding: 12 },
  infoText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "400",
    textAlign: "right",
    lineHeight: 18,
  },
  storageCard: {
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 12,
  },
  storageRow: { flexDirection: "row-reverse", gap: 8 },
  storageItem: { flex: 1, alignItems: "center", gap: 4 },
  storageVal: { fontSize: 13, fontWeight: "800" },
  storageMini: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  storageMiniFill: { height: "100%", borderRadius: 3 },
  storageLabel: { fontSize: 9, fontWeight: "400", textAlign: "center" },
  totalStorage: {
    fontSize: 11,
    fontWeight: "400",
    textAlign: "center",
    marginTop: 8,
  },
  actionCard: {
    borderRadius: 16,
    padding: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  actionInfo: { flex: 1, alignItems: "flex-end", gap: 3 },
  actionLabel: { fontSize: 14, fontWeight: "700" },
  actionSub: { fontSize: 11, fontWeight: "400" },
});
