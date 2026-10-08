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
  TextInput,
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
import { ScreenState } from '../../src/components/ScreenStates';

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  const loadSettings = () => {
    setLoading(true);
    setError(null);
    apiFetch<any>('/users/me/privacy-settings')
      .then(res => { if (res) setSettings(prev => ({ ...prev, ...res })); })
      .catch(() => setError('تعذر تحميل إعدادات الخصوصية'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSettings(); }, []);

  // ── PDPL data subject rights ───────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [erasePassword, setErasePassword] = useState("");
  const [erasing, setErasing] = useState(false);

  /** PDPL portability: pull the real export off the server and hand the file over. */
  const onExport = async () => {
    setExporting(true);
    try {
      const payload = await apiFetch<any>("/users/me/data-export");
      // 23.6: the PDPL export includes the user's own audit events when the
      // server exposes them (GET /api/v1/patient/history/events). A 404 (route
      // not deployed yet) leaves the export without them — never mocked.
      try {
        const audit = await apiFetch<any>("/patient/history/events?limit=500");
        const list = Array.isArray(audit) ? audit : audit?.events || audit?.data || audit?.items || null;
        if (list) (payload as any).audit_events = list;
      } catch {
        /* audit endpoint not deployed yet — export proceeds without it */
      }
      const FS = await import("expo-file-system/legacy");
      const { shareAsync } = await import("expo-sharing");
      const fileName = `nabd-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      const file = new FS.File(FS.Paths.cache, fileName);
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(payload, null, 2));
      await shareAsync(file.uri, { mimeType: "application/json", dialogTitle: fileName });
    } catch (err: any) {
      showLocalizedAlert("تعذّر التصدير", err?.message || "حدث خطأ — حاول مرة أخرى");
    } finally {
      setExporting(false);
    }
  };

  /** PDPL erasure. The password proves the request came from the account owner. */
  const onErase = () => {
    showLocalizedAlert(
      "حذف الحساب نهائياً",
      "سيُحذف حسابك وبياناتك الشخصية. السجلات المالية والقانونية تُحفظ مجهولة الهوية للامتثال النظامي. سيتم تسجيل خروجك فوراً.",
      [
        { text: "إلغاء", style: "cancel" },
        { text: "متابعة", style: "destructive", onPress: () => setEraseOpen(true) },
      ]
    );
  };

  const confirmErase = async () => {
    if (!erasePassword) {
      showLocalizedAlert("كلمة المرور مطلوبة", "أدخل كلمة المرور لتأكيد الحذف.");
      return;
    }
    setErasing(true);
    try {
      await apiFetch("/users/me", {
        method: "DELETE",
        body: JSON.stringify({ password: erasePassword }),
      });
      setEraseOpen(false);
      setErasePassword("");
      // The account is gone: drop the local session and leave the app.
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
      router.replace("/(auth)/login");
    } catch (err: any) {
      showLocalizedAlert("تعذّر الحذف", err?.message || "حدث خطأ — حاول مرة أخرى");
    } finally {
      setErasing(false);
    }
  };

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
      <ScreenState loading={loading} error={error} empty={false} emptyTitle="لا توجد إعدادات" onRetry={loadSettings}>
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

        {/* ── PDPL: the data subject acts here, not by mailing support ── */}
        <View style={[styles.dataCard, { backgroundColor: isDark ? colors.surface : colors.white, borderColor: isDark ? "#2A2A2E" : "#E5E5EA" }]}>
          <AppText variant="titleSM">بياناتي</AppText>
          <AppText variant="bodySM" style={{ opacity: 0.7, marginTop: 4 }}>
           PDPL Art. 20 (نقل البيانات) و Art. 23 (الحذف) — حقك القانوني متاح من هنا مباشرة.
          </AppText>

          <TouchableOpacity
            style={[styles.dataAction, { borderColor: colors.primary }]}
            disabled={exporting}
            onPress={onExport}
          >
            <AppText variant="bodySM" style={{ color: colors.primary }}>
              {exporting ? "جارٍ تجهيز الملف…" : "تصدير كل بياناتي"}
            </AppText>
          </TouchableOpacity>

          {/* 23.6: own audit events view (GET /api/v1/patient/history/events). */}
          <TouchableOpacity
            style={[styles.dataAction, { borderColor: colors.primary }]}
            onPress={() => router.push("/settings/history-events" as any)}
          >
            <AppText variant="bodySM" style={{ color: colors.primary }}>
              عرض سجل نشاطي
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dataAction, { borderColor: "#D0021B" }]}
            onPress={onErase}
          >
            <AppText variant="bodySM" style={{ color: "#D0021B" }}>
              حذف حسابي نهائياً
            </AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </ScreenState>

      {/* Password confirmation for irreversible erasure. */}
      {eraseOpen && (
        <View style={[styles.modalBackdrop, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surface : colors.white }]}>
            <AppText variant="titleSM">تأكيد كلمة المرور</AppText>
            <AppText variant="bodySM" style={{ opacity: 0.7, marginTop: 6 }}>
              الحذف لا يمكن التراجع عنه. أدخل كلمة المرور لتأكيد ملكيتك للحساب.
            </AppText>
            <TextInput
              value={erasePassword}
              onChangeText={setErasePassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="كلمة المرور"
              placeholderTextColor="#8E8E93"
              style={[
                styles.eraseInput,
                { borderColor: isDark ? "#3A3A3C" : "#D1D1D6", color: colors.textPrimary },
              ]}
            />
            <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 14 }}>
              <Button label={erasing ? "جارٍ الحذف…" : "حذف نهائي"} variant="danger" onPress={confirmErase} disabled={erasing} full={false} style={{ flex: 1 }} />
              <Button label="إلغاء" variant="outline" full={false} onPress={() => { setEraseOpen(false); setErasePassword(""); }} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      )}
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
  dataCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 10, marginTop: 4 },
  dataAction: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  modalBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", borderRadius: 16, padding: 18 },
  eraseInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  deleteLink: { alignItems: "center", padding: 12 },
  deleteLinkAlt: {
    color: "#F0695C",
    fontSize: 13,
    fontWeight: "400",
    textDecorationLine: "underline",
  } as any,
});
