// @ts-nocheck
// app/reports/timeline.tsx
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon, IconName } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Chip,
  IconButton,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

type TimelineCategory =
  "all" | "appointment" | "lab" | "prescription" | "vitals";

// Timeline events fetched from API

export default function MedicalTimelineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [filter, setFilter] = useState<TimelineCategory>("all");

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/reports/timeline');
        setEvents(Array.isArray(res) ? res : res?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredEvents =
    filter === "all"
      ? events
      : events.filter((e) => e.type === filter);

  const handleDownload = (title: string) => {
    Alert.alert("تحميل التقرير", `جاري تحميل ملف PDF الخاص بـ "${title}"...`, [
      { text: "حسناً" },
    ]);
  };

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
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
        <IconButton icon="back" onPress={() => router.back()} />
        <View style={{ alignItems: "center" }}>
          <AppText variant="h4">الجدول الزمني الطبي</AppText>
          <AppText variant="caption" color={colors.textTertiary}>
            تاريخك الصحي مرتب كرونولوجياً
          </AppText>
        </View>
        <IconButton
          icon="qr"
          onPress={() => router.push("/reports/passport" as any)}
        />
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: "row-reverse",
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        {(
          [
            ["all", "الكل"],
            ["appointment", "استشارات"],
            ["lab", "تحاليل"],
            ["prescription", "وصفات"],
            ["vitals", "مؤشرات"],
          ] as [TimelineCategory, string][]
        ).map(([k, l]) => (
          <Chip
            key={k}
            label={l}
            active={filter === k}
            onPress={() => setFilter(k)}
          />
        ))}
      </ScrollView>

      {/* Timeline List */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {filteredEvents.length === 0 ? (
          <View style={st.empty}>
            <Icon name="calendar" size={48} color={colors.textTertiary} />
            <AppText variant="bodySM" color={colors.textTertiary}>
              لا توجد سجلات مطابقة للتصنيف
            </AppText>
          </View>
        ) : (
          <View style={st.timelineWrap}>
            {filteredEvents.map((item, index) => {
              const isLast = index === filteredEvents.length - 1;
              return (
                <View key={item.id} style={st.timelineItem}>
                  {/* Left Side: Line & Dot */}
                  <View style={st.timelineLeft}>
                    <View
                      style={[
                        st.dot,
                        {
                          backgroundColor: item.color,
                          borderColor: colors.background,
                        },
                      ]}
                    />
                    {!isLast && (
                      <View
                        style={[st.line, { backgroundColor: colors.border }]}
                      />
                    )}
                  </View>

                  {/* Right Side: Card Details */}
                  <View style={st.timelineRight}>
                    <AppText
                      variant="caption"
                      color={colors.textTertiary}
                      style={{ textAlign: "right" }}
                    >
                      {item.date} — {item.time}
                    </AppText>
                    <Card
                      style={[
                        st.eventCard,
                        { borderRightColor: item.color, borderRightWidth: 4 },
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: "row-reverse",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <View
                          style={[
                            st.iconCircle,
                            { backgroundColor: item.color + "14" },
                          ]}
                        >
                          <Icon name={item.icon} size={20} color={item.color} />
                        </View>
                        <AppText
                          variant="h6"
                          style={{ flex: 1, textAlign: "right" }}
                        >
                          {item.title}
                        </AppText>
                      </View>
                      <AppText
                        variant="bodyXS"
                        color={colors.textSecondary}
                        style={{
                          marginTop: 8,
                          textAlign: "right",
                          lineHeight: 18,
                        }}
                      >
                        {item.details}
                      </AppText>

                      {item.hasFile && (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => handleDownload(item.title)}
                          style={[
                            st.downloadBtn,
                            {
                              backgroundColor: colors.surfaceSecondary,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Icon
                            name="download"
                            size={16}
                            color={colors.primary}
                          />
                          <AppText variant="labelSM" color={colors.primary}>
                            تحميل نتائج التحليل PDF
                          </AppText>
                        </TouchableOpacity>
                      )}
                    </Card>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  hdr: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  timelineWrap: { paddingLeft: 8 },
  timelineItem: { flexDirection: "row", minHeight: 120 },
  timelineLeft: { width: 30, alignItems: "center", position: "relative" },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    zIndex: 10,
    marginTop: 4,
  },
  line: {
    width: 2,
    position: "absolute",
    top: 12,
    bottom: -12,
    left: 14,
    zIndex: 1,
  },
  timelineRight: { flex: 1, paddingBottom: 16, alignItems: "flex-end", gap: 6 },
  eventCard: { width: "100%", padding: 12, marginTop: 4 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  downloadBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
});
