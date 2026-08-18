// @ts-nocheck
// app/family/calendar.tsx — Shared family calendar (real backend events)
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
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
import { dateLocale } from '@/utils/dates';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

function fmtEventDate(e: any): string {
  if (e.time) return e.time;
  if (!e.event_date) return "";
  const d = new Date(e.event_date);
  return d.toLocaleDateString(dateLocale(), { weekday: "long", day: "numeric", month: "long" });
}

export default function FamilyCalendarScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
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
      "أدخل عنوان الحدث (مثال: موعد طبيب الأسنان):",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إضافة",
          onPress: async (title) => {
            if (!title || title.trim() === "") return;
            try {
              setAdding(true);
              await apiFetch("/family/calendar/event", {
                method: "POST",
                body: JSON.stringify({ title: title.trim(), type: "appointment" }),
              });
              await loadCalendarEvents();
            } catch (err) {
              console.error(err);
              showLocalizedAlert("خطأ", "تعذر إضافة الحدث. حاول مرة أخرى.");
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
    showLocalizedAlert(
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
              setLoading(false);
              showLocalizedAlert("خطأ", "تعذر حذف الحدث. حاول مرة أخرى.");
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
        <AppText variant="h4">تقويم العائلة</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 160, flexGrow: 1 }}
      >
        <View
          style={{
            flexDirection: "row-reverse",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <SectionHeader title="الأحداث القادمة" />
          <Button
            label="إضافة حدث "
            variant="ghost"
            size="sm"
            onPress={handleAddEvent}
            loading={adding}
          />
        </View>

        {events.length === 0 && (
          <View style={{ alignItems: "center", gap: 10, paddingVertical: 48 }}>
            <Icon name="calendar" size={44} color={colors.textTertiary} />
            <AppText variant="bodyMD" color={colors.textSecondary}>
              لا توجد أحداث عائلية بعد
            </AppText>
            <AppText variant="caption" color={colors.textTertiary}>
              أضف مواعيد ومناسبات العائلة لتظهر هنا
            </AppText>
          </View>
        )}

        {events.map((e) => {
          const color = e.color || "#23B5CE";
          const when = fmtEventDate(e);
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
                        : "test-tube"
                  }
                  size={22}
                  color={color}
                />
              </View>
              <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
                <AppText variant="h6">{e.title}</AppText>
                {!!when && (
                  <View
                    style={{
                      flexDirection: "row-reverse",
                      gap: 6,
                      alignItems: "center",
                    }}
                  >
                    <Icon name="clock" size={12} color={colors.textTertiary} />
                    <AppText variant="caption" color={colors.textTertiary}>
                      {when}
                    </AppText>
                  </View>
                )}
                {!!e.member && <Badge label={e.member} color={color} />}
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
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
