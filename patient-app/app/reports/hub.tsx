// @ts-nocheck
// reports/hub.tsx — Reports hub (REAL data from /medical-reports/mine).
// EPIC4/S21: the previous version rendered a hardcoded REPORTS array with
// fabricated labs/dates/abnormal counts and passed a `reportId` param that
// view-report never read. Now: real API, honest states, correct params.
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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
  Chip,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { pickLocalized } from '../../src/utils/localize';
import { dateLocale } from '@/utils/dates';

// Filters map to real linkage fields on the medical report document
const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "lab", label: "تحاليل", icon: "science" },
  { key: "radiology", label: "أشعة", icon: "scan" },
  { key: "notes", label: "ملاحظات طبية", icon: "document" },
];

function reportKind(r: any): string {
  if (r.lab_booking_id) return "lab";
  if (r.radiology_booking_id) return "radiology";
  return "notes";
}

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

export default function ReportsHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [filter, setFilter] = useState("all");
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const res = await apiFetch("/medical-reports/mine?limit=100");
      const list = Array.isArray(res) ? res : res?.data || [];
      setReports(list);
    } catch (e) {
      console.error(e);
      setError(true);
      setReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    filter === "all" ? reports : reports.filter((r) => reportKind(r) === filter);

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
          <View style={{ width: 40 }} />
          <AppText variant="h4" color="#fff">
            تقاريري الطبية
          </AppText>
          <IconButton
            icon="back"
            bg="rgba(255,255,255,0.18)"
            color="#fff"
            onPress={() => router.back()}
          />
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: "row-reverse", gap: 8 }}
          >
            {FILTERS.map((f) => (
              <Chip
                key={f.key}
                label={f.label}
                icon={f.icon}
                active={filter === f.key}
                onPress={() => setFilter(f.key)}
              />
            ))}
          </ScrollView>

          {error && (
            <Card style={{ alignItems: "center", gap: 10, paddingVertical: 28 }}>
              <Icon name="warning" size={36} color={colors.warning} />
              <AppText variant="body" color={colors.textSecondary}>
                تعذر تحميل التقارير — تحقق من الاتصال
              </AppText>
              <Button label="إعادة المحاولة" size="sm" full={false} onPress={() => { setLoading(true); load(); }} />
            </Card>
          )}

          {!error && filtered.length === 0 && (
            <Card style={{ alignItems: "center", gap: 10, paddingVertical: 32 }}>
              <Icon name="document" size={40} color={colors.textTertiary} />
              <AppText variant="h6">لا توجد تقارير بعد</AppText>
              <AppText
                variant="caption"
                color={colors.textTertiary}
                style={{ textAlign: "center" }}
              >
                عندما يصدر طبيبك أو المختبر تقريراً طبياً سيظهر هنا
              </AppText>
            </Card>
          )}

          {!error && filtered.map((r) => {
            const kind = reportKind(r);
            const unread = !r.viewed_by_patient;
            return (
              <Card
                key={r.id}
                onPress={() =>
                  router.push({
                    pathname: "/reports/view-report",
                    params: { id: r.id },
                  })
                }
              >
                <View
                  style={{
                    flexDirection: "row-reverse",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <View
                    style={[
                      st.rIcon,
                      {
                        backgroundColor:
                          kind === "lab"
                            ? isDark
                              ? "rgba(122,107,234,0.15)"
                              : "#EDEBFD"
                            : colors.primarySurface,
                      },
                    ]}
                  >
                    <Icon
                      name={kind === "lab" ? "testTube" : kind === "radiology" ? "scan" : "document"}
                      size={24}
                      color={kind === "lab" ? colors.accent : colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
                    <AppText variant="h6">{pickLocalized(r.title_ar, r.title_en) || "تقرير طبي"}</AppText>
                    <AppText variant="caption" color={colors.textTertiary}>
                      {[r.facility_name || r.doctor_name, fmtDate(r.issued_at || r.createdAt)]
                        .filter(Boolean)
                        .join(" · ") || "تقرير طبي"}
                    </AppText>
                    <View style={{ flexDirection: "row-reverse", gap: 6 }}>
                      {r.critical && (
                        <Badge label="مهم" color={colors.error} icon="warning" />
                      )}
                      {unread && (
                        <Badge label="جديد" color={colors.primary} />
                      )}
                    </View>
                  </View>
                  <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
                </View>
                <View
                  style={{ flexDirection: "row-reverse", gap: 8, marginTop: 10 }}
                >
                  <Button
                    label="عرض التفاصيل"
                    variant="primary"
                    size="sm"
                    full={false}
                    onPress={() =>
                      router.push({
                        pathname: "/reports/view-report",
                        params: { id: r.id },
                      })
                    }
                  />
                  <Button
                    label="تحليل AI"
                    variant="ghost"
                    size="sm"
                    icon="robot"
                    full={false}
                    onPress={() =>
                      router.push({
                        pathname: "/reports/ai-analysis",
                        params: { id: r.id },
                      })
                    }
                  />
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}
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
  rIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
