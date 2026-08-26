// @ts-nocheck
// view-report.tsx — REAL medical report viewer (/reports/:id → medicalreports).
// EPIC4/S21: the previous version expected a lab-results shape that medical
// reports don't have (so it rendered empty), and its PDF/share buttons were
// setTimeout + Alert simulations. Now: real fields, honest states, real Share.
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Share,
} from "react-native";
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
import { pickLocalized } from '../../src/utils/localize';
import { dateLocale } from '@/utils/dates';

function fmtDate(d: any): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString(dateLocale(), {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

const TYPE_LABELS: Record<string, string> = {
  clinic_note: "ملاحظة طبية",
  discharge_summary: "ملخص خروج",
  surgery_report: "تقرير عملية",
  consultation_note: "ملاحظة استشارة",
  second_opinion: "رأي طبي ثانٍ",
  medical_certificate: "شهادة طبية",
  referral: "خطاب تحويل",
  other: "تقرير طبي",
};

export default function ViewReportScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  React.useEffect(() => {
    async function load() {
      if (!params?.id) {
        setError(true);
        setLoading(false);
        return;
      }
      try {
        const res = await apiFetch(`/reports/${params.id}`);
        setReport(res?.data || res);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params?.id]);

  const handleShare = async () => {
    if (!report) return;
    try {
      const lines = [
        pickLocalized(report.title_ar, report.title_en) || "تقرير طبي",
        report.facility_name || report.doctor_name || "",
        report.summary ? `\nالملخص: ${report.summary}` : "",
        report.diagnosis ? `\nالتشخيص: ${report.diagnosis}` : "",
        report.recommendations ? `\nالتوصيات: ${report.recommendations}` : "",
        "\n— عبر تطبيق نبض",
      ];
      await Share.share({ message: lines.filter(Boolean).join("\n") });
    } catch {}
  };

  if (loading) {
    return (
      <View style={[st.c, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !report) {
    return (
      <View style={[st.c, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }]}>
        <Icon name="warning" size={40} color={colors.warning} />
        <AppText variant="h6">تعذر تحميل التقرير</AppText>
        <Button label="رجوع" size="sm" full={false} onPress={() => router.back()} />
      </View>
    );
  }

  const hasLabTable = Array.isArray(report.categories) && report.categories.length > 0;

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 8,
          paddingHorizontal: 16,
        }}
      >
        <View style={st.hdrRow}>
          <IconButton
            icon="share"
            bg="rgba(255,255,255,0.18)"
            color="#fff"
            onPress={handleShare}
          />
          <AppText variant="h4" color="#fff">
            التقرير
          </AppText>
          <IconButton
            icon="back"
            bg="rgba(255,255,255,0.18)"
            color="#fff"
            onPress={() => router.back()}
          />
        </View>

        <View style={st.reportMeta}>
          <AppText variant="h5" color="#fff">
            {pickLocalized(report.title_ar, report.title_en) || "تقرير طبي"}
          </AppText>
          <View style={{ flexDirection: "row-reverse", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            {!!(report.facility_name || report.lab) && (
              <View style={{ flexDirection: "row-reverse", gap: 4, alignItems: "center" }}>
                <Icon name="hospital" size={14} color="rgba(255,255,255,0.8)" />
                <AppText variant="caption" color="rgba(255,255,255,0.8)">
                  {report.facility_name || report.lab}
                </AppText>
              </View>
            )}
            {!!fmtDate(report.issued_at || report.createdAt || report.date) && (
              <View style={{ flexDirection: "row-reverse", gap: 4, alignItems: "center" }}>
                <Icon name="calendar" size={14} color="rgba(255,255,255,0.8)" />
                <AppText variant="caption" color="rgba(255,255,255,0.8)">
                  {fmtDate(report.issued_at || report.createdAt || report.date)}
                </AppText>
              </View>
            )}
          </View>
          {!!(report.doctor_name || report.doctor) && (
            <View style={{ flexDirection: "row-reverse", gap: 4, alignItems: "center", marginTop: 4 }}>
              <Icon name="doctor" size={14} color="rgba(255,255,255,0.8)" />
              <AppText variant="caption" color="rgba(255,255,255,0.8)">
                {report.doctor_name || report.doctor}
              </AppText>
            </View>
          )}
          <View style={{ flexDirection: "row-reverse", gap: 6, marginTop: 8 }}>
            <Badge
              label={TYPE_LABELS[report.report_type] || "تقرير طبي"}
              color="rgba(255,255,255,0.9)"
            />
            {!!report.critical && (
              <Badge label="مهم — يحتاج متابعة" color="#FFD3D6" />
            )}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}>
        {!!report.summary && (
          <Card>
            <AppText variant="h6" style={{ marginBottom: 6 }}>الملخص</AppText>
            <AppText variant="body" color={colors.textSecondary}>{report.summary}</AppText>
          </Card>
        )}

        {!!report.diagnosis && (
          <Card>
            <AppText variant="h6" style={{ marginBottom: 6 }}>التشخيص</AppText>
            <AppText variant="body" color={colors.textSecondary}>{report.diagnosis}</AppText>
          </Card>
        )}

        {!!report.body && (
          <Card>
            <AppText variant="h6" style={{ marginBottom: 6 }}>تفاصيل التقرير</AppText>
            <AppText variant="body" color={colors.textSecondary}>{report.body}</AppText>
          </Card>
        )}

        {!!report.recommendations && (
          <Card>
            <AppText variant="h6" style={{ marginBottom: 6 }}>التوصيات</AppText>
            <AppText variant="body" color={colors.textSecondary}>{report.recommendations}</AppText>
          </Card>
        )}

        {hasLabTable && report.categories.map((cat: any, ci: number) => (
          <Card key={ci}>
            <AppText variant="h6" style={{ marginBottom: 8 }}>{cat.name}</AppText>
            {(cat.tests || []).map((t: any, ti: number) => (
              <View key={ti} style={{ flexDirection: "row-reverse", justifyContent: "space-between", paddingVertical: 6, borderTopWidth: ti ? 1 : 0, borderTopColor: colors.border }}>
                <AppText variant="bodySM">{t.name}</AppText>
                <AppText
                  variant="bodySM"
                  color={t.status === "normal" ? colors.success : colors.error}
                >
                  {t.value} {t.unit || ""}
                </AppText>
              </View>
            ))}
          </Card>
        ))}

        {!report.summary && !report.diagnosis && !report.body && !hasLabTable && (
          <Card style={{ alignItems: "center", paddingVertical: 24, gap: 8 }}>
            <Icon name="document" size={36} color={colors.textTertiary} />
            <AppText variant="body" color={colors.textTertiary}>
              لا توجد تفاصيل إضافية في هذا التقرير
            </AppText>
          </Card>
        )}

        <Button
          label="تحليل التقرير بالذكاء الاصطناعي"
          icon="robot"
          onPress={() =>
            router.push({ pathname: "/reports/ai-analysis", params: { id: report.id } })
          }
        />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdrRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reportMeta: { marginTop: 16, alignItems: "flex-end" },
});
