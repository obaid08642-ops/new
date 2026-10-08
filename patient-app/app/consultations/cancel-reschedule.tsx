// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { dateLocale } from '@/utils/dates';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const CANCEL_REASONS = [
  'ارتباط طارئ',
  'تحسّنت صحتي',
  'أريد تغيير الطبيب',
  'الوقت لا يناسبني',
  'مشكلة في الدفع',
  'سبب آخر',
];

const DAY_MS = 24 * 60 * 60 * 1000;

export default function CancelRescheduleScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();
  const appointmentId = String(params.appointmentId || params.id || '');

  const [mode, setMode] = useState<'choose' | 'cancel' | 'reschedule'>('choose');
  const [appointment, setAppointment] = useState<any>(null);
  const [loadingAppt, setLoadingAppt] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedReason, setSelectedReason] = useState('');
  const [slotsByDay, setSlotsByDay] = useState<Record<string, any[]>>({});
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadAppointment = async () => {
    if (!appointmentId) {
      setLoadError('لم يتم تحديد الموعد');
      setLoadingAppt(false);
      return;
    }
    setLoadingAppt(true);
    setLoadError(null);
    try {
      const data = await apiFetch<any>(`/care/appointments/${appointmentId}`);
      setAppointment(data?.data || data);
    } catch (e: any) {
      setLoadError(e?.message || 'تعذر تحميل بيانات الموعد');
    } finally {
      setLoadingAppt(false);
    }
  };

  useEffect(() => { loadAppointment(); }, [appointmentId]);

  // Load real availability for the next 7 days when entering reschedule mode
  useEffect(() => {
    if (mode !== 'reschedule' || !appointment?.doctor_id) return;
    const loadSlots = async () => {
      setSlotsLoading(true);
      const out: Record<string, any[]> = {};
      const serviceType = appointment.consultation_type === 'home' ? 'home' : appointment.consultation_type === 'video' ? 'video' : 'clinic';
      const days: string[] = [];
      for (let i = 1; i <= 7; i++) days.push(new Date(Date.now() + i * DAY_MS).toISOString().slice(0, 10));
      const results = await Promise.all(days.map(async (d) => {
        try {
          const res = await apiFetch<any>(`/care/doctors/${appointment.doctor_id}/slots?date=${d}&service_type=${serviceType}`);
          const list = Array.isArray(res) ? res : (res?.slots || res?.data || []);
          return [d, list.filter((s: any) => s.available !== false)];
        } catch { return [d, []]; }
      }));
      results.forEach(([d, list]) => { if (list.length) out[d as string] = list as any[]; });
      setSlotsByDay(out);
      setSlotsLoading(false);
    };
    loadSlots();
  }, [mode, appointment?.doctor_id]);

  const price = Number(appointment?.price ?? appointment?.amount_total ?? 0);
  const scheduledAt = appointment?.scheduled_at ? new Date(appointment.scheduled_at) : null;
  const hoursUntil = scheduledAt ? (scheduledAt.getTime() - Date.now()) / 3600000 : null;
  const refundPct = hoursUntil == null ? null : hoursUntil >= 24 ? 100 : hoursUntil >= 12 ? 50 : 0;

  const formattedDate = scheduledAt
    ? scheduledAt.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })
    : '—';
  const formattedTime = scheduledAt
    ? scheduledAt.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
    : '';

  const dayKeys = useMemo(() => Object.keys(slotsByDay).sort(), [slotsByDay]);
  const [activeDay, setActiveDay] = useState<string>('');
  useEffect(() => { if (!activeDay && dayKeys.length) setActiveDay(dayKeys[0]); }, [dayKeys]);

  const handleAction = async () => {
    if (!appointmentId) return;
    setIsLoading(true);
    try {
      if (mode === 'cancel') {
        await apiFetch(`/care/appointments/${appointmentId}/cancel`, {
          method: 'PATCH',
          body: JSON.stringify({ reason: selectedReason }),
        });
        showLocalizedAlert('تم الإلغاء', refundPct && refundPct > 0 && price > 0
          ? `تم إلغاء الموعد. سيُعاد ${refundPct}% من قيمة الحجز وفق سياسة الاسترداد.`
          : 'تم إلغاء الموعد بنجاح.', [
          { text: 'حسناً', onPress: () => router.replace('/consultations/appointments') },
        ]);
      } else {
        const slotStart = selectedSlot?.start || selectedSlot?.slot_start || selectedSlot?.time;
        if (!slotStart) throw new Error('اختر وقتاً متاحاً');
        const iso = new Date(slotStart).toISOString();
        await apiFetch(`/care/appointments/${appointmentId}/reschedule`, {
          method: 'PATCH',
          body: JSON.stringify({ slot_start: iso }),
        });
        showLocalizedAlert('تمت إعادة الجدولة', 'تم تأكيد موعدك الجديد بنجاح.', [
          { text: 'حسناً', onPress: () => router.replace('/consultations/appointments') },
        ]);
      }
    } catch (e: any) {
      showLocalizedAlert('تعذر إتمام العملية', e?.message || 'حدث خطأ غير متوقع. حاول مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const header = (title: string, onBack: () => void) => (
    <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: isDark ? colors.surface : colors.white }]}>
      <AppText variant="bodySM">{title}</AppText>
      <TouchableOpacity onPress={onBack} accessibilityLabel="رجوع">
        <Icon name="back" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  if (loadingAppt) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loadError || !appointment) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {header('الموعد', () => router.back())}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 }}>
          <Icon name="warning" size={40} color={colors.error} />
          <AppText variant="bodySM">{loadError || 'الموعد غير موجود'}</AppText>
          <TouchableOpacity onPress={loadAppointment} style={[styles.confirmCancelBtn, { backgroundColor: colors.primary, paddingHorizontal: 32 }]}>
            <AppText variant="bodySM" color="#fff">إعادة المحاولة</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mode === 'choose') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        {header('الموعد', () => router.back())}
        <View style={styles.chooseContent}>
          <View style={[styles.apptSummary, { backgroundColor: isDark ? colors.surface : colors.white }]}>
            <Icon name="doctor" size={20} color={colors.primary} />
            <View style={{ alignItems: 'flex-end', flex: 1 }}>
              <AppText variant="bodySM">{appointment?.doctor?.name || appointment?.doctor_name || 'الطبيب'}</AppText>
              <AppText variant="bodySM">{formattedDate}{formattedTime ? ` — ${formattedTime}` : ''}</AppText>
            </View>
          </View>
          <View style={[styles.policyCard, { backgroundColor: isDark ? colors.surface : colors.white }]}>
            <AppText variant="bodySM">سياسة الإلغاء</AppText>
            {[
              { range: 'قبل 24 ساعة', refund: 'استرداد 100%', color: '#5BA84F' },
              { range: 'قبل 12-24 ساعة', refund: 'استرداد 50%', color: '#F0A526' },
              { range: 'أقل من 12 ساعة', refund: 'لا يوجد استرداد', color: '#F0695C' },
            ].map((p, i) => (
              <View key={i} style={[styles.policyRow, { borderBottomColor: colors.border }]}>
                <AppText variant="bodySM">{p.refund}</AppText>
                <AppText variant="bodySM">{p.range}</AppText>
              </View>
            ))}
          </View>
          <TouchableOpacity onPress={() => setMode('reschedule')} style={styles.rescheduleBtn} accessibilityRole="button">
            <View style={styles.actionBtnInner}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <Icon name="calendar" size={16} color={colors.primary} />
                <AppText variant="bodySM">إعادة الجدولة (موصى به)</AppText>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('cancel')} style={[styles.cancelBtn, { borderColor: colors.error }]} accessibilityRole="button">
            <AppText variant="bodySM">إلغاء الموعد</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mode === 'cancel') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {header('سبب الإلغاء', () => setMode('choose'))}
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
          {CANCEL_REASONS.map((r) => (
            <TouchableOpacity key={r} onPress={() => setSelectedReason(r)} accessibilityRole="radio" accessibilityState={{ selected: selectedReason === r }}
              style={[styles.reasonItem, { backgroundColor: isDark ? colors.surface : colors.white, borderColor: selectedReason === r ? colors.error : colors.border }]}>
              <View style={[styles.radioOuter, { borderColor: selectedReason === r ? colors.error : colors.border }]}>
                {selectedReason === r && <View style={[styles.radioDot, { backgroundColor: colors.error }]} />}
              </View>
              <AppText variant="bodySM">{r}</AppText>
            </TouchableOpacity>
          ))}
          {refundPct != null && price > 0 && (
            <View style={[styles.refundNote, { backgroundColor: '#FEF3C7' }]}>
              <AppText variant="bodySM">
                {refundPct > 0
                  ? `سيتم استرداد ${refundPct}% من قيمة الحجز (${price} ر.س) وفق سياسة الإلغاء.`
                  : 'الإلغاء قبل أقل من 12 ساعة — لا يوجد استرداد وفق السياسة.'}
              </AppText>
            </View>
          )}
        </ScrollView>
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            onPress={handleAction}
            disabled={!selectedReason || isLoading}
            style={[styles.confirmCancelBtn, { opacity: !selectedReason || isLoading ? 0.5 : 1, backgroundColor: colors.error }]}>
            <AppText variant="bodySM" color="#fff">{isLoading ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Reschedule mode — real slots from the doctor's availability
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {header('اختر موعداً جديداً', () => setMode('choose'))}
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        {slotsLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <AppText variant="caption" color={colors.textSecondary}>جاري تحميل المواعيد المتاحة...</AppText>
          </View>
        ) : dayKeys.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
            <Icon name="calendar" size={36} color={colors.textTertiary} />
            <AppText variant="bodySM">لا توجد مواعيد متاحة خلال الأسبوع القادم</AppText>
            <AppText variant="caption" color={colors.textSecondary}>جرّب لاحقاً أو تواصل مع العيادة</AppText>
          </View>
        ) : (
          <>
            <AppText variant="bodySM">اليوم</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {dayKeys.map((d) => {
                const label = new Date(d + 'T00:00:00').toLocaleDateString(dateLocale(), { weekday: 'short', day: 'numeric' });
                return (
                  <TouchableOpacity key={d} onPress={() => { setActiveDay(d); setSelectedSlot(null); }}
                    style={[styles.dayChip, activeDay === d && { backgroundColor: colors.primary }]}>
                    <AppText variant="bodySM" color={activeDay === d ? '#fff' : undefined}>{label}</AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <AppText variant="bodySM">الوقت</AppText>
            <View style={styles.timesGrid}>
              {(slotsByDay[activeDay] || []).map((s: any, i: number) => {
                const start = s.start || s.slot_start || s.time;
                const label = new Date(start).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
                const selected = selectedSlot === s;
                return (
                  <TouchableOpacity key={`${start}-${i}`} onPress={() => setSelectedSlot(s)}
                    style={[styles.timeChip, selected && { backgroundColor: colors.primary }]}>
                    <AppText variant="bodySM" color={selected ? '#fff' : undefined}>{label}</AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          onPress={handleAction}
          disabled={!selectedSlot || isLoading}
          style={[{ opacity: !selectedSlot || isLoading ? 0.5 : 1 }]}>
          <View style={[styles.rescheduleConfirmBtn, { backgroundColor: colors.primary }]}>
            <AppText variant="bodySM" color="#fff">{isLoading ? 'جاري التأجيل...' : 'تأكيد الموعد الجديد'}</AppText>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  chooseContent: { flex: 1, padding: 16, gap: 12 },
  content: { padding: 16, gap: 12 },
  apptSummary: { borderRadius: 18, padding: 16, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  policyCard: { borderRadius: 18, padding: 16 },
  policyRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  rescheduleBtn: { borderRadius: 16, overflow: 'hidden' },
  actionBtnInner: { height: 54, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { height: 50, borderRadius: 16, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  reasonItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1.5, padding: 14 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 5.5 },
  refundNote: { borderRadius: 14, padding: 12 },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12 },
  confirmCancelBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  dayChip: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.06)' },
  timesGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  timeChip: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.06)' },
  rescheduleConfirmBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
});
