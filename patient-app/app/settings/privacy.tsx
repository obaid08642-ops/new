// @ts-nocheck
// app/settings/privacy.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
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
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

export default function PrivacySettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [settings, setSettings] = useState({
    shareData: false,
    analytics: true,
    location: true,
    marketing: false,
    thirdParty: false,
  });

  useEffect(() => {
    apiFetch<any>('/users/me/privacy-settings')
      .then(res => { if (res) setSettings(prev => ({ ...prev, ...res })); })
      .catch(() => {});
  }, []);

  const toggle = (k: string) => {
    setSettings(prev => {
      const updated = { ...prev, [k]: !prev[k as keyof typeof prev] };
      apiFetch('/users/me/privacy-settings', {
        method: 'PATCH',
        body: JSON.stringify({ [k]: updated[k as keyof typeof updated] }),
      }).catch(() => {});
      return updated;
    });
  };

  const ITEMS = [
    {
      key: "location",
      label: "مشاركة الموقع",
      sub: "لإيجاد أقرب المزودين الصحيين",
    },
    {
      key: "analytics",
      label: "تحليلات الاستخدام",
      sub: "مساعدتنا في تحسين التطبيق",
    },
    {
      key: "shareData",
      label: "مشاركة البيانات الصحية",
      sub: "مشاركة بيانات صحية مجهولة للأبحاث",
    },
    {
      key: "marketing",
      label: "التواصل التسويقي",
      sub: "إرسال عروض وإعلانات مخصصة",
    },
    {
      key: "thirdParty",
      label: "مشاركة مع أطراف ثالثة",
      sub: "شركاء التأمين والصيدليات",
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
        <AppText variant="bodySM">الخصوصية</AppText>
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
              بياناتك محمية ومشفرة بمعايير ISO 27001. لا نبيع بياناتك لأي طرف
              خارجي.
            </AppText>
          </View>
        </View>
        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? colors.surface : colors.white },
          ]}
        >
          {ITEMS.map((item, i) => (
            <View
              key={item.key}
              style={[
                styles.row,
                i < ITEMS.length - 1 && {
                  borderBottomColor: colors.border,
                  borderBottomWidth: 1,
                },
              ]}
            >
              <Switch
                value={settings[item.key as keyof typeof settings]}
                onValueChange={() => toggle(item.key)}
                trackColor={{ false: colors.border, true: "#23B5CE50" }}
                thumbColor={
                  settings[item.key as keyof typeof settings]
                    ? "#23B5CE"
                    : colors.textTertiary
                }
              />
              <View style={styles.rowInfo}>
                <AppText variant="bodySM">{item.label}</AppText>
                <AppText variant="bodySM">{item.sub}</AppText>
              </View>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.deleteLink]}
          onPress={() => {
            showLocalizedAlert(
              'حذف البيانات الشخصية',
              'سيتم إرسال طلب رسمي لفريق نبض لحذف جميع بياناتك الشخصية نهائياً وفق سياسة الخصوصية. هل تريد المتابعة؟',
              [
                { text: 'إلغاء', style: 'cancel' },
                {
                  text: 'إرسال الطلب',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await apiFetch('/support/requests', {
                        method: 'POST',
                        body: JSON.stringify({
                          type: 'data_deletion',
                          subject: 'طلب حذف البيانات الشخصية نهائياً',
                          message: 'أطلب حذف جميع بياناتي الشخصية نهائياً من منصة نبض وفق سياسة الخصوصية.',
                        }),
                      });
                      showLocalizedAlert('تم إرسال الطلب', 'تم استلام طلبك وسيتواصل معك فريقنا خلال 72 ساعة لاستكمال إجراءات الحذف.');
                    } catch (err: any) {
                      showLocalizedAlert('تعذّر إرسال الطلب', err?.message || 'حدث خطأ — حاول مرة أخرى');
                    }
                  },
                },
              ]
            );
          }}
        >
          <AppText variant="bodySM">طلب حذف بياناتي الشخصية نهائياً</AppText>
        </TouchableOpacity>
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
  title: { fontSize: 17, fontWeight: "800" } as any,
  infoCard: { borderRadius: 14, padding: 12 },
  info: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "400",
    textAlign: "right",
    lineHeight: 18,
  } as any,
  card: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  rowInfo: { flex: 1, alignItems: "flex-end", gap: 2 },
  rowLabel: { fontSize: 14, fontWeight: "700" } as any,
  rowSub: { fontSize: 11, fontWeight: "400" } as any,
  deleteLink: { alignItems: "center", padding: 12 },
  deleteLinkAlt: {
    color: "#F0695C",
    fontSize: 13,
    fontWeight: "400",
    textDecorationLine: "underline",
  } as any,
});
