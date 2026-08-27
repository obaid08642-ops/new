// @ts-nocheck
// app/family/calendar.tsx — Shared family calendar (real backend events)
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
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
import { buildFamilyCalendarPayload, parseFamilyCalendarEvents, type FamilyCalendarEventType } from '../../src/utils/family-calendar-contract';

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
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [memberUserId, setMemberUserId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<FamilyCalendarEventType | null>(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadCalendarEvents();
  }, []);

  const loadCalendarEvents = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const [calendar, groupMembers] = await Promise.all([apiFetch("/family/calendar"), apiFetch("/family/members")]);
      setEvents(parseFamilyCalendarEvents(calendar));
      setMembers(Array.isArray(groupMembers) ? groupMembers : []);
    } catch (err) {
      console.error(err);
      setEvents([]);
      setMembers([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = () => {
    setTitle(''); setEventDate(''); setMemberUserId(null); setEventType(null); setFormError(''); setFormOpen(true);
  };

  const submitEvent = async () => {
    try {
      const payload = buildFamilyCalendarPayload({ title, eventDate, memberUserId, type: eventType });
      setAdding(true); setFormError('');
      await apiFetch("/family/calendar/event", { method: "POST", body: JSON.stringify(payload) });
      setFormOpen(false);
      await loadCalendarEvents();
    } catch (err: any) {
      const message = String(err?.message || '');
      setFormError(message.includes('required') || message.includes('valid') ? 'أكمل العنوان والموعد والعضو ونوع الحدث بصيغة صحيحة.' : 'تعذر إضافة الحدث. حاول مرة أخرى.');
    } finally {
      setAdding(false);
    }
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

        {loadError && (
          <Card style={{ alignItems: "center", gap: 10 }}>
            <Icon name="warning" size={32} color={colors.error} />
            <AppText variant="bodyMD" color={colors.textSecondary}>تعذر تحميل تقويم العائلة</AppText>
            <Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={loadCalendarEvents} />
          </Card>
        )}
        {!loadError && events.length === 0 && (
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
          const canDelete = e.can_delete === true;
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
              {canDelete && <IconButton
                icon="trash"
                color={colors.textTertiary}
                size={20}
                onPress={() => handleDeleteEvent(e.id)}
              />}
            </Card>
          );
        })}
      </ScrollView>

      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={() => setFormOpen(false)}>
        <View style={st.modalBackdrop}>
          <View style={[st.modalCard, { backgroundColor: colors.surface }]}>
            <AppText variant="h5" style={{ textAlign: "right" }}>حدث عائلي جديد</AppText>
            <AppText variant="caption" color={colors.textSecondary} style={{ textAlign: "right" }}>يتطلب الحدث عنواناً وموعداً وعضواً ونوعاً واضحاً.</AppText>
            <TextInput value={title} onChangeText={setTitle} placeholder="عنوان الحدث" placeholderTextColor={colors.textTertiary} style={[st.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]} textAlign="right" maxLength={160} />
            <TextInput value={eventDate} onChangeText={setEventDate} placeholder="الموعد بصيغة 2026-09-01T10:00:00Z" placeholderTextColor={colors.textTertiary} style={[st.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]} textAlign="left" autoCapitalize="none" />
            <AppText variant="caption" color={colors.textSecondary} style={{ textAlign: "right" }}>العضو</AppText>
            <View style={st.choiceWrap}>{members.map((member) => <TouchableOpacity key={member.user_id} accessibilityRole="button" onPress={() => setMemberUserId(member.user_id)} style={[st.choice, { borderColor: colors.border }, memberUserId === member.user_id && { backgroundColor: colors.primary, borderColor: colors.primary }]}><AppText variant="caption" color={memberUserId === member.user_id ? '#FFFFFF' : colors.textPrimary}>{member.display_name || member.user_id}</AppText></TouchableOpacity>)}</View>
            <AppText variant="caption" color={colors.textSecondary} style={{ textAlign: "right" }}>نوع الحدث</AppText>
            <View style={st.choiceWrap}>{([{ key: 'appointment', label: 'موعد' }, { key: 'reminder', label: 'تذكير' }, { key: 'medication', label: 'دواء' }, { key: 'lab', label: 'تحليل' }] as const).map((option) => <TouchableOpacity key={option.key} accessibilityRole="button" onPress={() => setEventType(option.key)} style={[st.choice, { borderColor: colors.border }, eventType === option.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}><AppText variant="caption" color={eventType === option.key ? '#FFFFFF' : colors.textPrimary}>{option.label}</AppText></TouchableOpacity>)}</View>
            {!!formError && <AppText variant="caption" color={colors.error} style={{ textAlign: "right" }}>{formError}</AppText>}
            <View style={st.modalActions}><Button label="إلغاء" variant="ghost" size="sm" full={false} onPress={() => setFormOpen(false)} /><Button label="إضافة الحدث" size="sm" full={false} loading={adding} onPress={() => void submitEvent()} /></View>
          </View>
        </View>
      </Modal>
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 22, padding: 18, gap: 11 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  choiceWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  choice: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  modalActions: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 4 },
});
