// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText, Card, Badge, IconButton } from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

export default function MyResultsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    try {
      setLoading(true);
      // M4: دمج نتائج التحاليل وتقارير الأشعة
      const [labs, radReports] = await Promise.all([
        apiFetch<any[]>("/labs/bookings/mine").catch(() => []),
        apiFetch<any[]>("/radiology/reports/mine").catch(() => []),
      ]);
      const radItems = (radReports || []).map((r: any) => ({ ...r, __isRadiology: true }));
      setBookings([...(labs || []), ...radItems]);
    } catch (err) {
      console.log("Error loading results", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View
        style={[
          st.hdr,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <View style={{ width: 40 }} />
        <AppText variant="h4">نتائجي</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : bookings.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Icon name="document" size={48} color={colors.textTertiary} />
          <AppText variant="h5" color={colors.textSecondary}>
            لا توجد نتائج تحاليل حالياً
          </AppText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        >
          {bookings.map((b) => {
            const hasReport = b.reports && b.reports.length > 0;
            const report = hasReport ? b.reports[0] : null;
            const title =
              b.items?.map((i: any) => i.name_ar).join(" + ") ||
              (b.__isRadiology ? "أشعة وتصوير" : "تحاليل مخبرية");
            const labName = b.provider_name || (b.__isRadiology ? "مركز أشعة معتمد" : "مختبر معتمد");
            const dateStr = new Date(b.scheduled_at).toLocaleDateString(
              "ar-EG",
              { day: "numeric", month: "long", year: "numeric" },
            );

            // Map backend state
            let statusText = "قيد المراجعة";
            let badgeColor = colors.warning;

            if (b.state === "REPORTED") {
              statusText = "جاهز";
              badgeColor = colors.success;
            } else if (b.state === "CREATED") {
              statusText = "تم الحجز";
              badgeColor = colors.primary;
            } else if (b.state === "CANCELLED") {
              statusText = "ملغي";
              badgeColor = colors.error;
            } else if (b.state === "SAMPLE_COLLECTED") {
              statusText = "تم سحب العينة";
              badgeColor = colors.info || "#0284C7";
            } else if (b.state === "IN_LAB" || b.state === "PROCESSING") {
              statusText = "في المختبر للتحليل";
              badgeColor = colors.warning;
            } else if (b.state === "REPORT_READY") {
              statusText = "التقرير جاهز";
              badgeColor = colors.success;
            } else if (b.state === "PENDING") {
              statusText = "بانتظار القبول";
              badgeColor = colors.primary;
            } else if (b.state === "IN_PROGRESS" || b.state === "SCANNING") {
              statusText = "جارٍ التصوير";
              badgeColor = colors.info || "#0284C7";
            }

            // M4: عناصر الأشعة — التقرير قد يكون PDF موقّعًا على مستوى الحجز
            const isRad = !!b.__isRadiology;
            const radHasReport = isRad && (!!b.signed_report_pdf_url || (b.reports && b.reports.length > 0));
            const radReport = isRad
              ? (b.reports?.[0] || { id: b.id, url: b.signed_report_pdf_url, name: 'تقرير الأشعة' })
              : null;
            const effHasReport = isRad ? radHasReport : hasReport;
            const effReport = isRad ? radReport : report;

            return (
              <Card
                key={b.id}
                onPress={() =>
                  effHasReport
                    ? router.push({
                        pathname: "/reports/view-report",
                        params: {
                          reportId: effReport.id,
                          url: effReport.url,
                          name: effReport.name || (isRad ? 'تقرير الأشعة' : 'التقرير'),
                        },
                      })
                    : isRad
                      ? router.push({
                          pathname: "/diagnostics/order/[id]",
                          params: { id: b.id },
                        })
                      : router.push({
                          pathname: "/diagnostics/sample-tracking",
                          params: { bookingId: b.id },
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
                  <View style={[st.icon, { backgroundColor: isRad ? "#0284C718" : "#7A6BEA18" }]}>
                    <Icon name={isRad ? "radiology-box-outline" : "science"} size={22} color={isRad ? "#0284C7" : "#7A6BEA"} />
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
                    <AppText variant="h6">{title}</AppText>
                    <AppText variant="caption" color={colors.textTertiary}>
                      {labName} · {dateStr}
                    </AppText>
                    <View
                      style={{
                        flexDirection: "row-reverse",
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      <Badge label={statusText} color={badgeColor} />
                      {effHasReport && (
                        <Badge label="تقرير PDF جاهز" color={colors.success} />
                      )}
                    </View>
                  </View>
                  <Icon
                    name="chevronLeft"
                    size={18}
                    color={colors.textTertiary}
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
  hdr: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
