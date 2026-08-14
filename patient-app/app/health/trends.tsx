// @ts-nocheck
// app/health/trends.tsx
// <MaterialIcons name="bar-chart" size={24} color={resolveColor('var(--p)', isDark)} /> صحتك عبر الزمن — رسوم بيانية تفاعلية لكل مؤشراتك
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
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

const { width } = Dimensions.get("window");
const CHART_W = width - 32;

import { apiFetch } from '../../src/utils/api';

const TIME_FILTERS = [
  { key: "1w", label: "أسبوع" },
  { key: "1m", label: "شهر" },
  { key: "3m", label: "3 أشهر" },
  { key: "6m", label: "6 أشهر" },
  { key: "1y", label: "سنة" },
];

// Simple SVG-like chart using Views
const MiniLineChart = ({
  data,
  color,
  width: w,
  height: h,
}: {
  data: { value: number; index: number }[];
  color: string;
  width: number;
  height: number;
}) => {
  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const range = max - min || 1;
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * (w - 20) + 10,
    y: h - ((d.value - min) / range) * (h - 20) - 10,
  }));

  return (
    <View
      style={{ width: w, height: h, position: "relative", overflow: "hidden" }}
    >
      {/* Area fill */}
      {points.slice(0, -1).map((p, i) => {
        const next = points[i + 1];
        const midX = (p.x + next.x) / 2;
        const barW = next.x - p.x;
        const barH = h - Math.max(p.y, next.y);
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: Math.min(p.y, next.y),
              width: barW,
              height: barH,
              backgroundColor: color + "15",
            }}
          />
        );
      })}
      {/* Line segments */}
      {points.slice(0, -1).map((p, i) => {
        const next = points[i + 1];
        const dx = next.x - p.x;
        const dy = next.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              width: len,
              height: 2,
              backgroundColor: color,
              transform: [{ rotate: `${angle}deg` }],
              transformOrigin: "0 0",
            }}
          />
        );
      })}
      {/* Last dot */}
      {points.length > 0 && (
        <View
          style={{
            position: "absolute",
            left: points[points.length - 1].x - 5,
            top: points[points.length - 1].y - 5,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: color,
            borderWidth: 2,
            borderColor: "#fff",
          }}
        />
      )}
    </View>
  );
};

export default function HealthTrendsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [timeFilter, setTimeFilter] = useState("3m");
  const [activeVital, setActiveVital] = useState("glucose");

  const [vitalTrends, setVitalTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/health/trends');
        setVitalTrends(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const vital = vitalTrends.find((v) => v.id === activeVital) || vitalTrends[0] || {};
  if (loading || !vital.data) return null;
  const trendIcon =
    vital.trendDir === "down"
      ? "trendingDown"
      : vital.trendDir === "up"
        ? "trending_up"
        : "horizontal_rule";
  const trendColor =
    vital.trendDir === "down"
      ? activeVital === "weight" ||
        activeVital === "glucose" ||
        activeVital === "hba1c"
        ? "#5BA84F"
        : "#F0695C"
      : "#F0A526";

  const isInRange =
    vital.current >= vital.normal[0] && vital.current <= vital.normal[1];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 8,
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <IconButton
            icon="share"
            bg={colors.surfaceSecondary}
            color={colors.textPrimary}
          />
          <AppText variant="h3" color={colors.textPrimary}>
            مؤشراتي الصحية
          </AppText>
          <IconButton
            icon="back"
            bg={colors.surfaceSecondary}
            color={colors.textPrimary}
            onPress={() => router.back()}
          />
        </View>
        {/* AI Summary */}
        <Card
          style={{
            marginTop: 16,
            flexDirection: "row-reverse",
            alignItems: "flex-start",
            gap: 8,
            backgroundColor: colors.surface,
          }}
        >
          <Icon name="auto_awesome" size={20} color="#23B5CE" />
          <AppText variant="bodySM" style={{ flex: 1, lineHeight: 22 }}>
            صحتك هذا الشهر أفضل بـ 18% — السكر تحسّن، الضغط مستقر، الوزن ينخفض
            تدريجياً
          </AppText>
        </Card>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Vital Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[
            styles.vitalTabs,
            { backgroundColor: isDark ? colors.surface : colors.white },
          ]}
          contentContainerStyle={{
            paddingHorizontal: 16,
            gap: 8,
            alignItems: "center",
          }}
        >
          {vitalTrends.map((v) => (
            <TouchableOpacity
              key={v.id}
              onPress={() => setActiveVital(v.id)}
              style={[
                styles.vitalTab,
                activeVital === v.id && {
                  backgroundColor: v.color,
                  borderColor: v.color,
                },
              ]}
            >
              <AppText variant="bodySM">{v.name.split(" ")[0]}</AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Current Reading */}
        <View
          style={[
            styles.currentCard,
            {
              backgroundColor: isDark ? colors.surface : colors.white,
              marginHorizontal: 16,
              marginTop: 14,
            },
          ]}
        >
          <View style={styles.currentLeft}>
            <View
              style={[
                styles.rangeBadge,
                {
                  backgroundColor: isInRange ? "#DCFCE7" : "#FEE2E2",
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 4,
                },
              ]}
            >
              <Icon
                name={isInRange ? "check_circle" : "warning"}
                size={14}
                color={isInRange ? "#16A34A" : "#DC2626"}
              />
              <AppText
                variant="caption"
                style={{
                  color: isInRange ? "#16A34A" : "#DC2626",
                  fontWeight: "bold",
                }}
              >
                {isInRange ? "ضمن الطبيعي" : "خارج الطبيعي"}
              </AppText>
            </View>
            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name={trendIcon} size={18} color={trendColor} />
              <AppText variant="bodySM" color={trendColor}>
                {vital.trend}
              </AppText>
            </View>
            <AppText variant="bodySM">
              المعدل الطبيعي: {vital.normal[0]}-{vital.normal[1]} {vital.unit}
            </AppText>
          </View>
          <View style={styles.currentRight}>
            <AppText variant="bodySM">{vital.current}</AppText>
            <AppText variant="bodySM">{vital.unit}</AppText>
            <AppText variant="bodySM">{vital.name}</AppText>
          </View>
        </View>

        {/* Time Filter */}
        <View
          style={[
            styles.timeFilterRow,
            { marginHorizontal: 16, marginTop: 12 },
          ]}
        >
          {TIME_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setTimeFilter(f.key)}
              style={[
                styles.timeChip,
                {
                  backgroundColor:
                    timeFilter === f.key
                      ? vital.color
                      : isDark
                        ? colors.surface
                        : colors.white,
                  borderColor:
                    timeFilter === f.key ? vital.color : colors.border,
                },
              ]}
            >
              <AppText variant="bodySM">{f.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Chart */}
        <View
          style={[
            styles.chartCard,
            {
              backgroundColor: isDark ? colors.surface : colors.white,
              marginHorizontal: 16,
              marginTop: 12,
            },
          ]}
        >
          <AppText variant="bodySM">{vital.name}</AppText>

          <MiniLineChart
            data={vital.data}
            color={vital.color}
            width={CHART_W - 32}
            height={140}
          />

          {/* X-axis labels */}
          <View style={styles.xLabels}>
            {vital.labels.map((l, i) => (
              <AppText key={i} variant="bodySM">
                {l}
              </AppText>
            ))}
          </View>

          {/* AI Insight */}
          <View
            style={[styles.insightBox, { backgroundColor: vital.color + "12" }]}
          >
            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="info" size={16} color={colors.primary} />
              <AppText variant="bodySM">{vital.insight}</AppText>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View
          style={[styles.statsGrid, { marginHorizontal: 16, marginTop: 12 }]}
        >
          {[
            {
              label: "أعلى قيمة",
              val: `${Math.max(...vital.data.map((d) => d.value)).toFixed(0)} ${vital.unit}`,
              icon: "trending_up",
            },
            {
              label: "أدنى قيمة",
              val: `${Math.min(...vital.data.map((d) => d.value)).toFixed(0)} ${vital.unit}`,
              icon: "trendingDown",
            },
            {
              label: "المتوسط",
              val: `${(vital.data.reduce((s, d) => s + d.value, 0) / vital.data.length).toFixed(1)} ${vital.unit}`,
              icon: "trending_up",
            },
            {
              label: "عدد القراءات",
              val: vital.data.length.toString(),
              icon: "description",
            },
          ].map((s, i) => (
            <View
              key={i}
              style={[
                styles.statCard,
                { backgroundColor: isDark ? colors.surface : colors.white },
              ]}
            >
              <Icon name={s.icon as any} size={24} color={vital.color} />
              <AppText variant="bodySM">{s.val}</AppText>
              <AppText variant="bodySM">{s.label}</AppText>
            </View>
          ))}
        </View>

        {/* All Vitals Mini */}
        <View style={{ marginHorizontal: 16, marginTop: 14 }}>
          <AppText variant="bodySM">نظرة عامة على كل المؤشرات</AppText>
          {vitalTrends.filter((v) => v.id !== activeVital).map((v) => {
            const inRng = v.current >= v.normal[0] && v.current <= v.normal[1];
            return (
              <TouchableOpacity
                key={v.id}
                onPress={() => setActiveVital(v.id)}
                style={[
                  styles.miniCard,
                  { backgroundColor: isDark ? colors.surface : colors.white },
                ]}
              >
                <View style={styles.miniRight}>
                  <View
                    style={[
                      styles.miniStatus,
                      { backgroundColor: inRng ? "#DCFCE7" : "#FEE2E2" },
                    ]}
                  >
                    <AppText variant="bodySM">
                      {inRng ? "طبيعي" : "مراقبة"}
                    </AppText>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <MiniLineChart
                    data={v.data.slice(-7)}
                    color={v.color}
                    width={120}
                    height={40}
                  />
                </View>
                <View style={styles.miniLeft}>
                  <AppText variant="bodySM">
                    {v.current} {v.unit}
                  </AppText>
                  <AppText variant="bodySM">{v.name}</AppText>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Export */}
        <TouchableOpacity
          style={[
            styles.exportBtn,
            {
              borderColor: colors.border,
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: isDark ? colors.surface : colors.white,
            },
          ]}
        >
          <Icon name="download" size={18} color={colors.primary} />
          <AppText variant="bodySM">تصدير التقرير الصحي PDF</AppText>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  hBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  aiSummary: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 12,
  },
  aiSummaryText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "400",
    textAlign: "right",
    lineHeight: 20,
  },
  vitalTabs: {
    maxHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  vitalTab: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  vitalTabText: { fontSize: 12, fontWeight: "700" },
  currentCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  currentRight: { alignItems: "center", gap: 2 },
  currentValue: { fontSize: 42, fontFamily: "Cairo-ExtraBold", lineHeight: 46 },
  currentUnit: { fontSize: 12, fontWeight: "400" },
  currentLabel: { fontSize: 11, fontWeight: "400" },
  currentLeft: { alignItems: "flex-start", gap: 8 },
  rangeBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  rangeText: { fontSize: 11, fontWeight: "700" },
  trendLabel: { fontSize: 13, fontWeight: "800" },
  normalRange: { fontSize: 11, fontWeight: "400" },
  timeFilterRow: { flexDirection: "row-reverse", gap: 8 },
  timeChip: {
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  timeChipText: { fontSize: 12, fontWeight: "700" },
  chartCard: {
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 12,
  },
  xLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  xLabel: { fontSize: 9, fontWeight: "400" },
  insightBox: { borderRadius: 12, padding: 10, marginTop: 12 },
  insightText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    lineHeight: 18,
  },
  statsGrid: { flexDirection: "row-reverse", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: { fontSize: 20 },
  statVal: { fontSize: 13, fontFamily: "Cairo-ExtraBold", textAlign: "center" },
  statLabel: { fontSize: 9, fontWeight: "400", textAlign: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "800", marginBottom: 10 },
  miniCard: {
    borderRadius: 16,
    padding: 12,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  miniLeft: { alignItems: "flex-end", gap: 2, width: 100 },
  miniVal: { fontSize: 16, fontFamily: "Cairo-ExtraBold" },
  miniName: { fontSize: 11, fontWeight: "700" },
  miniRight: { alignItems: "center" },
  miniStatus: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  miniStatusText: { fontSize: 9, fontWeight: "700" },
  exportBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    height: 50,
  },
  exportText: { fontSize: 14, fontWeight: "700" },
});
