// @ts-nocheck
// view-report.tsx — View lab/radiology report + read details + download PDF
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Sharing from "expo-sharing";
import { useApp } from "../../src/context/AppContext";
import { Icon, IconName } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
  SectionHeader,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

// Report fetched from API

export default function ViewReportScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();
  const [downloading, setDownloading] = useState(false);
  const [report, setReport] = useState<any>(null);

  React.useEffect(() => {
    async function load() {
      if (!params?.id) return;
      try {
        const res = await apiFetch(`/reports/${params.id}`);
        setReport(res?.data || res);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, [params?.id]);

  const statusColor = (s: string) =>
    s === "normal"
      ? colors.success
      : s === "high"
        ? colors.error
        : colors.warning;
  const statusLabel = (s: string) =>
    s === "normal" ? "طبيعي" : s === "high" ? "مرتفع" : "منخفض";

  const totalTests = report?.categories?.reduce((s: number, c: any) => s + c.tests.length, 0) || 0;
  const abnormal = report?.categories?.reduce(
    (s: number, c: any) => s + c.tests.filter((t: any) => t.status !== "normal").length,
    0,
  ) || 0;

  if (!report) return null;

  const handleDownloadPDF = async () => {
    setDownloading(true);
    // In production: generate PDF with expo-print or fetch from API
    setTimeout(async () => {
      setDownloading(false);
      // Simulate share/download
      Alert.alert("تحميل PDF", "تم تجهيز التقرير كملف PDF — جاري التحميل...", [
        { text: "حسناً" },
      ]);
    }, 1200);
  };

  const handleShare = async () => {
    try {
      // In production: share actual PDF file
      if (await Sharing.isAvailableAsync()) {
        Alert.alert("مشاركة", "جاري مشاركة التقرير...");
      }
    } catch {}
  };

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
          <View style={{ flexDirection: "row-reverse", gap: 8 }}>
            <IconButton
              icon="share"
              bg="rgba(255,255,255,0.18)"
              color="#fff"
              onPress={handleShare}
            />
            <IconButton
              icon="download"
              bg="rgba(255,255,255,0.18)"
              color="#fff"
              onPress={handleDownloadPDF}
            />
          </View>
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
            {report.title}
          </AppText>
          <View style={{ flexDirection: "row-reverse", gap: 12, marginTop: 8 }}>
            <View
              style={{
                flexDirection: "row-reverse",
                gap: 4,
                alignItems: "center",
              }}
            >
              <Icon name="hospital" size={14} color="rgba(255,255,255,0.8)" />
              <AppText variant="caption" color="rgba(255,255,255,0.8)">
                {report.lab}
              </AppText>
            </View>
            <View
              style={{
                flexDirection: "row-reverse",
                gap: 4,
                alignItems: "center",
              }}
            >
              <Icon name="calendar" size={14} color="rgba(255,255,255,0.8)" />
              <AppText variant="caption" color="rgba(255,255,255,0.8)">
                {report.date}
              </AppText>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row-reverse",
              gap: 4,
              alignItems: "center",
              marginTop: 4,
            }}
          >
            <Icon name="doctor" size={14} color="rgba(255,255,255,0.8)" />
            <AppText variant="caption" color="rgba(255,255,255,0.8)">
              بطلب: {report.doctor}
            </AppText>
          </View>
        </View>

        {/* Summary */}
        <View style={st.summaryRow}>
          <View style={{ alignItems: "center", flex: 1 }}>
            <AppText variant="h3" color="#fff">
              {totalTests}
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.7)">
              تحليل
            </AppText>
          </View>
          <View style={{ alignItems: "center", flex: 1 }}>
            <AppText variant="h3" color="#fff">
              {totalTests - abnormal}
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.7)">
              طبيعي
            </AppText>
          </View>
          <View style={{ alignItems: "center", flex: 1 }}>
            <AppText variant="h3" color={abnormal > 0 ? "#FFD166" : "#fff"}>
              {abnormal}
            </AppText>
            <AppText variant="caption" color="rgba(255,255,255,0.7)">
              يحتاج متابعة
            </AppText>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}
      >
        {/* AI analysis CTA */}
        <Card
          onPress={() =>
            router.push({
              pathname: "/reports/ai-analysis",
              params: { reportId: report.id },
            })
          }
          style={{
            backgroundColor: colors.primarySurface,
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Icon name="robot" size={28} color={colors.primary} />
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <AppText variant="h6" color={colors.primary}>
              تحليل AI للنتائج
            </AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              اضغط لقراءة تفسير ذكي لنتائجك
            </AppText>
          </View>
          <Icon name="chevronLeft" size={18} color={colors.primary} />
        </Card>

        {/* Test categories */}
        {report?.categories?.map((cat: any, ci: number) => (
          <Card key={ci}>
            <SectionHeader title={cat.name} />
            {cat.tests?.map((test: any, ti: number) => (
              <View
                key={ti}
                style={[
                  st.testRow,
                  ti > 0 && {
                    borderTopWidth: 1,
                    borderTopColor: colors.borderLight,
                  },
                ]}
              >
                <Badge
                  label={statusLabel(test.status)}
                  color={statusColor(test.status)}
                />
                <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
                  <AppText variant="h6">{test.name}</AppText>
                  <View
                    style={{
                      flexDirection: "row-reverse",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <AppText variant="h5" color={statusColor(test.status)}>
                      {test.value}
                    </AppText>
                    <AppText variant="caption" color={colors.textTertiary}>
                      {test.unit}
                    </AppText>
                  </View>
                  <AppText variant="caption" color={colors.textTertiary}>
                    المرجع: {test.ref}
                  </AppText>
                </View>
                <View
                  style={[
                    st.statusDot,
                    { backgroundColor: statusColor(test.status) },
                  ]}
                />
              </View>
            ))}
          </Card>
        ))}
      </ScrollView>

      {/* Bottom download bar */}
      <View
        style={[
          st.bottom,
          {
            paddingBottom: insets.bottom + 8,
            backgroundColor: colors.surface,
            borderTopColor: colors.borderLight,
          },
        ]}
      >
        <View style={{ flexDirection: "row-reverse", gap: 10 }}>
          <Button
            label="تحميل PDF"
            variant="gradient"
            icon="download"
            loading={downloading}
            onPress={handleDownloadPDF}
            full={false}
            style={{ flex: 1 }}
          />
          <Button
            label="تحليل AI"
            variant="outline"
            icon="robot"
            onPress={() =>
              router.push({
                pathname: "/reports/ai-analysis",
                params: { reportId: report.id },
              })
            }
            full={false}
            style={{ flex: 1 }}
          />
        </View>
      </View>
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
  reportMeta: { alignItems: "flex-end" },
  summaryRow: {
    flexDirection: "row-reverse",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    marginTop: 14,
    padding: 12,
  },
  testRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
