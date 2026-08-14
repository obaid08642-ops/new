// @ts-nocheck
// app/family/calendar.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
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
  IconButton,
  SectionHeader,
  Button,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

// Events fetched dynamically

const DAYS = [
  "السبت",
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
];

export default function SharedCalendarScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [selectedDay, setSelectedDay] = useState(0);

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadCalendarEvents();
  }, []);

  const loadCalendarEvents = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/family/calendar");
      setEvents(res && res.length > 0 ? res : []);
    } catch (err) {
      console.error(err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    Alert.prompt(
      "حدث عائلي جديد",
      "أدخل عنوان الحدث (مثال: موعد طبيب الأسنان لفهد):",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إضافة",
          onPress: async (title) => {
            if (!title || title.trim() === "") return;
            try {
              setAdding(true);
              const newEvent = {
                title: title.trim(),
                member: "العائلة",
                time: "غداً 11:00 ص",
                type: "appointment",
                color: "#7A6BEA",
              };
              await apiFetch("/family/calendar/event", {
                method: "POST",
                body: JSON.stringify(newEvent),
              });
              await loadCalendarEvents();
            } catch (err) {
              console.error(err);
              setEvents((prev) => [
                ...prev,
                {
                  id: String(Date.now()),
                  title,
                  member: "العائلة",
                  time: "غداً 11:00 ص",
                  type: "appointment",
                  color: "#7A6BEA",
                },
              ]);
            } finally {
              setAdding(false);
            }
          },
        },
      ],
      "plain-text",
    );
  };

  const handleDeleteEvent = async (id: string) => {
    Alert.alert(
      "حذف الحدث",
      "هل أنت متأكد من حذف هذا الحدث من تقويم العائلة؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await apiFetch(`/family/calendar/event/${id}`, {
                method: "DELETE",
              });
              await loadCalendarEvents();
            } catch (err) {
              console.error(err);
              setEvents((prev) => prev.filter((e) => e.id !== id));
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View
        style={[
          st.c,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
        <AppText variant="h4">تقويم العائلة المشترك</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      {/* Day selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: "row-reverse",
          gap: 8,
          padding: 16,
        }}
      >
        {DAYS.map((d, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setSelectedDay(i)}
            style={[
              st.dayChip,
              {
                backgroundColor:
                  selectedDay === i ? colors.primary : colors.surfaceSecondary,
              },
            ]}
          >
            <AppText
              variant="labelSM"
              color={selectedDay === i ? "#fff" : colors.textPrimary}
            >
              {d}
            </AppText>
            <AppText
              variant="h5"
              color={selectedDay === i ? "#fff" : colors.textTertiary}
            >
              {18 + i}
            </AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 160 }}
      >
        <View
          style={{
            flexDirection: "row-reverse",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <SectionHeader title={`أحداث ${DAYS[selectedDay]}`} />
          <Button
            label="إضافة حدث "
            variant="ghost"
            size="sm"
            onPress={handleAddEvent}
            loading={adding}
          />
        </View>

        {events.map((e) => {
          const color = e.color || "#23B5CE";
          return (
            <Card
              key={e.id}
              style={{
                flexDirection: "row-reverse",
                gap: 12,
                alignItems: "center",
                borderRightWidth: 4,
                borderRightColor: color,
              }}
            >
              <View style={[st.eventIcon, { backgroundColor: color + "18" }]}>
                <Icon
                  name={
                    e.type === "appointment"
                      ? "doctor"
                      : e.type === "medication"
                        ? "pill"
                        : "testTube"
                  }
                  size={22}
                  color={color}
                />
              </View>
              <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
                <AppText variant="h6">{e.title}</AppText>
                <View
                  style={{
                    flexDirection: "row-reverse",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <Icon name="clock" size={12} color={colors.textTertiary} />
                  <AppText variant="caption" color={colors.textTertiary}>
                    {e.time}
                  </AppText>
                </View>
                <Badge label={e.member} color={color} />
              </View>
              <IconButton
                icon="trash"
                color={colors.textTertiary}
                size={20}
                onPress={() => handleDeleteEvent(e.id)}
              />
            </Card>
          );
        })}
      </ScrollView>
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
  dayChip: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 2,
  },
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
