// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
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
  Button,
  IconButton,
  SectionHeader,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const FIELDS = [
  {
    key: "heart_rate",
    icon: "pulse",
    title: "نبض القلب",
    hint: "ضربة/دقيقة — مثال: 72",
    keyboard: "numeric",
    post: (v) =>
      apiFetch("/health/vitals", {
        method: "POST",
        body: JSON.stringify({ type: "heart_rate", value: Number(v), source: "manual" }),
      }),
    validate: (v) => Number(v) >= 30 && Number(v) <= 220,
  },
  {
    key: "bp_sys",
    icon: "bloodtype",
    title: "ضغط الدم الانقباضي",
    hint: "mmHg — مثال: 120",
    keyboard: "numeric",
    post: (v, extra) =>
      apiFetch("/health/vitals", {
        method: "POST",
        body: JSON.stringify({ type: "bp", value: `${Number(v)}/${Number(extra)}`, value_secondary: Number(extra), source: "manual" }),
      }),
    validate: (v, extra) => Number(v) >= 60 && Number(v) <= 260 && Number(extra) >= 30 && Number(extra) <= 180,
    pairWith: "bp_dia",
  },
  {
    key: "bp_dia",
    icon: "bloodtype",
    title: "ضغط الدم الانبساطي",
    hint: "mmHg — مثال: 80",
    keyboard: "numeric",
    skipPost: true,
  },
  {
    key: "glucose",
    icon: "bloodtype",
    title: "سكر الدم",
    hint: "mg/dL — مثال: 95",
    keyboard: "numeric",
    post: (v) =>
      apiFetch("/health/vitals", {
        method: "POST",
        body: JSON.stringify({ type: "glucose", value: Number(v), source: "manual" }),
      }),
    validate: (v) => Number(v) >= 20 && Number(v) <= 600,
  },
  {
    key: "weight",
    icon: "weight",
    title: "الوزن",
    hint: "كجم — مثال: 74.5",
    keyboard: "decimal-pad",
    post: (v) =>
      apiFetch("/health/vitals", {
        method: "POST",
        body: JSON.stringify({ type: "weight", value: Number(v), source: "manual" }),
      }),
    validate: (v) => Number(v) >= 2 && Number(v) <= 400,
  },
  {
    key: "spo2",
    icon: "pulse",
    title: "تشبع الأكسجين SpO2",
    hint: "% — مثال: 98",
    keyboard: "numeric",
    post: (v) =>
      apiFetch("/health/vitals", {
        method: "POST",
        body: JSON.stringify({ type: "spo2", value: Number(v), source: "manual" }),
      }),
    validate: (v) => Number(v) >= 50 && Number(v) <= 100,
  },
];

export default function WearablesHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const filledCount = FIELDS.filter(
    (f) => !f.skipPost && String(values[f.key] || "").trim() !== ""
  ).length;

  const handleSave = async () => {
    if (filledCount === 0) {
      showLocalizedAlert("تنبيه", "أدخل قراءة واحدة على الأقل قبل الحفظ.");
      return;
    }
    // Validate all filled fields first
    for (const f of FIELDS) {
      if (f.skipPost) continue;
      const raw = String(values[f.key] || "").trim();
      if (!raw) continue;
      const extra = f.pairWith ? String(values[f.pairWith] || "").trim() : undefined;
      if (f.pairWith && !extra) {
        showLocalizedAlert("تنبيه", "أدخل الضغط الانبساطي مع الانقباضي.");
        return;
      }
      if (f.validate && !f.validate(raw, extra)) {
        showLocalizedAlert("قيمة غير منطقية", `راجع قيمة: ${f.title}`);
        return;
      }
    }

    setSaving(true);
    setSavedMsg(false);
    try {
      for (const f of FIELDS) {
        if (f.skipPost) continue;
        const raw = String(values[f.key] || "").trim();
        if (!raw) continue;
        const extra = f.pairWith ? String(values[f.pairWith] || "").trim() : undefined;
        await f.post(raw, extra);
      }
      setSavedMsg(true);
      setValues({});
    } catch (err) {
      console.error(err);
      showLocalizedAlert("خطأ", "تعذر حفظ القراءات. تحقق من الاتصال وحاول مجددًا.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[st.hdr, { paddingTop: insets.top + 12 }]}>
        <View style={st.hdrRow}>
          <View style={{ width: 40 }} />
          <AppText variant="h4" color="#fff">
            تسجيل القراءات الحيوية
          </AppText>
          <IconButton
            icon="back"
            bg="rgba(255,255,255,0.18)"
            color="#fff"
            onPress={() => router.back()}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
      >
        <Card style={{ backgroundColor: colors.primarySurface }}>
          <AppText variant="bodySM" color={colors.textSecondary} style={{ textAlign: "right", lineHeight: 20 }}>
            سجّل قراءاتك من أجهزتك المنزلية يدويًا — تُحفظ مباشرة في ملفك الصحي
            ويطّلع عليها طبيبك. القياس المباشر من الساعات والأجهزة الذكية غير
            متاح حاليًا.
          </AppText>
        </Card>

        <SectionHeader title="القراءات" />

        {FIELDS.map((f) => (
          <Card
            key={f.key}
            style={{ flexDirection: "row-reverse", alignItems: "center", gap: 14 }}
          >
            <View style={[st.fIcon, { backgroundColor: colors.primarySurface }]}>
              <Icon name={f.icon} size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1, alignItems: "flex-end", gap: 4 }}>
              <AppText variant="h6">{f.title}</AppText>
              <TextInput
                value={values[f.key] || ""}
                onChangeText={(t) =>
                  setValues((p) => ({ ...p, [f.key]: t.replace(/[^0-9.]/g, "") }))
                }
                placeholder={f.hint}
                placeholderTextColor={colors.textTertiary}
                keyboardType={f.keyboard}
                style={{
                  width: "100%",
                  textAlign: "right",
                  color: colors.text,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  paddingVertical: 4,
                  fontFamily: "Cairo-Medium",
                  fontSize: 14,
                }}
              />
            </View>
          </Card>
        ))}

        {/* Save trigger */}
        <View style={{ marginTop: 16, gap: 10 }}>
          {savedMsg && (
            <Card style={{ backgroundColor: colors.successSurface }}>
              <View
                style={{ flexDirection: "row-reverse", gap: 8, alignItems: "center" }}
              >
                <Icon name="check_circle" size={20} color={colors.success} />
                <AppText variant="bodySM" color={colors.success}>
                  تم حفظ القراءات في ملفك الصحي بنجاح!
                </AppText>
              </View>
            </Card>
          )}

          <Button
            label={saving ? "جاري الحفظ..." : `حفظ القراءات (${filledCount})`}
            variant="gradient"
            size="lg"
            loading={saving}
            onPress={handleSave}
          />
        </View>
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
  fIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
