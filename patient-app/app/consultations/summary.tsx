// @ts-nocheck
/**
 * M4 · شاشة ملخص الاستشارة للمريض
 * GET /care/appointments/:id/summary — تشخيص/ملاحظات/وصفة/توصيات
 * + زر حجز متابعة خلال نافذة الخصم (follow_up_window_days)
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Button, Badge } from '../../src/components/ui';
import { ScreenState } from '../../src/components/ScreenStates';
import { apiFetch } from '../../src/utils/api';

export default function ConsultationSummaryScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
  const AR = lang !== 'en';
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();

  const [summary, setSummary] = useState<any>(null);
  const [appt, setAppt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notReady, setNotReady] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!appointmentId) { setError(AR ? 'معرّف الموعد مفقود' : 'Missing appointment id'); setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    setNotReady(false);
    try {
      try { setAppt(await apiFetch<any>(`/care/appointments/${appointmentId}`)); } catch {}
      const s = await apiFetch<any>(`/care/appointments/${appointmentId}/summary`);
      setSummary(s);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('404') || msg.includes('not available') || msg.includes('غير موجود')) {
        setNotReady(true);
      } else {
        setError(e?.message || (AR ? 'تعذر تحميل الملخص' : 'Failed to load summary'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appointmentId, AR]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ScreenState loading>{null}</ScreenState>;
  if (error) return <ScreenState error={error} onRetry={() => load()}>{null}</ScreenState>;
  if (notReady || !summary) {
    return (
      <ScreenState
        empty
        emptyTitle={AR ? 'الملخص غير متاح بعد' : 'Summary not available yet'}
        emptySubtitle={AR ? 'سيكتب الطبيب ملخص الاستشارة بعد انتهاء الموعد' : 'The doctor will write the summary after the appointment ends'}
        emptyIcon="document"
        onRetry={() => load()}
      >{null}</ScreenState>
    );
  }

  const followUpActive = !!summary.follow_up_recommended;
  const windowDays = summary.follow_up_window_days ?? 7;

  const bookFollowUp = () => {
    router.push({
      pathname: '/consultations/booking-status',
      params: {
        doctorId: appt?.doctor_id || summary.doctor_id || '',
        followUp: 'true',
        windowDays: String(windowDays),
      },
    });
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={{ width: 40 }} />
        <AppText variant="h4">{AR ? 'ملخص الاستشارة' : 'Consultation Summary'}</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        {followUpActive && (
          <Card style={{ borderWidth: 1, borderColor: colors.primary, gap: 8 }}>
            <View style={st.row}>
              <Badge label={AR ? `نافذة متابعة ${windowDays} يوم` : `${windowDays}-day follow-up window`} />
              <Icon name="calendar-check" size={18} color={colors.primary} />
            </View>
            <AppText variant="bodySM" color={colors.textSecondary} style={{ textAlign: 'right' }}>
              {AR
                ? `أوصى الطبيب بمتابعة خلال ${windowDays} أيام — احجز الآن بسعر مخفّض.`
                : `The doctor recommended a follow-up within ${windowDays} days — book now at a discounted rate.`}
            </AppText>
            <Button label={AR ? 'احجز موعد المتابعة' : 'Book follow-up'} onPress={bookFollowUp} style={{ marginTop: 4 }} />
          </Card>
        )}

        {!!summary.diagnosis && (
          <Card style={{ gap: 8 }}>
            <View style={st.row}>
              <AppText variant="h5" style={{ flex: 1, textAlign: 'right' }}>{AR ? 'التشخيص' : 'Diagnosis'}</AppText>
              <Icon name="stethoscope" size={18} color={colors.primary} />
            </View>
            <AppText variant="bodyMD" color={colors.textPrimary} style={{ textAlign: 'right', lineHeight: 22 }}>{summary.diagnosis}</AppText>
          </Card>
        )}

        {summary.prescription?.length > 0 && (
          <Card style={{ gap: 10 }}>
            <View style={st.row}>
              <AppText variant="h5" style={{ flex: 1, textAlign: 'right' }}>{AR ? 'الوصفة الطبية' : 'Prescription'}</AppText>
              <Icon name="medication" size={18} color={colors.primary} />
            </View>
            {summary.prescription.map((med: any, i: number) => (
              <View key={i} style={[st.medRow, { borderBottomColor: colors.borderLight }, i === summary.prescription.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <AppText variant="labelMD" color={colors.textPrimary}>{med.medicine_name}</AppText>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {[med.dose, med.duration].filter(Boolean).join(' · ')}
                  </AppText>
                  {!!med.notes && <AppText variant="caption" color={colors.textTertiary}>{med.notes}</AppText>}
                </View>
                <Icon name="medication" size={16} color={colors.textTertiary} />
              </View>
            ))}
            <Button
              variant="outline"
              label={AR ? 'إرسال الوصفة لصيدلية' : 'Send to pharmacy'}
              onPress={() => router.push({ pathname: '/consultations/prescription-from-doctor', params: { appointmentId } })}
            />
          </Card>
        )}

        {!!summary.notes && (
          <Card style={{ gap: 8 }}>
            <View style={st.row}>
              <AppText variant="h5" style={{ flex: 1, textAlign: 'right' }}>{AR ? 'ملاحظات الطبيب' : 'Doctor notes'}</AppText>
              <Icon name="document" size={18} color={colors.primary} />
            </View>
            <AppText variant="bodyMD" color={colors.textPrimary} style={{ textAlign: 'right', lineHeight: 22 }}>{summary.notes}</AppText>
          </Card>
        )}

        {!!summary.recommendations && (
          <Card style={{ gap: 8 }}>
            <View style={st.row}>
              <AppText variant="h5" style={{ flex: 1, textAlign: 'right' }}>{AR ? 'التوصيات' : 'Recommendations'}</AppText>
              <Icon name="check_circle" size={18} color={colors.success} />
            </View>
            <AppText variant="bodyMD" color={colors.textPrimary} style={{ textAlign: 'right', lineHeight: 22 }}>{summary.recommendations}</AppText>
          </Card>
        )}

        <Button
          variant="outline"
          label={AR ? 'قيّم الاستشارة' : 'Rate the consultation'}
          onPress={() => router.push({ pathname: '/consultations/post-call-rating', params: { appointmentId } })}
        />
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  medRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
});
