// @ts-nocheck
// app/consultations/follow-up.tsx — متابعة الاستشارة: بيانات الموعد الحقيقية من /care/appointments/:id
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, SectionHeader } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { pickLocalized } from '../../src/utils/localize';
import { dateLocale } from '@/utils/dates';

const STATE_AR: Record<string, string> = {
  PENDING: 'بانتظار التأكيد',
  CONFIRMED: 'مؤكد',
  CHECKED_IN: 'تم تسجيل الوصول',
  IN_PROGRESS: 'جارية الآن',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغاة',
  RESCHEDULED: 'أُعيد جدولتها',
  NO_SHOW: 'لم يحضر',
};

export default function FollowUpScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();
  const appointmentId = (params.id || params.appointmentId) as string;

  const [appt, setAppt] = useState<any>(null);
  const [doctorName, setDoctorName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = React.useCallback(async () => {
    if (!appointmentId) { setLoadError(true); setLoading(false); return; }
    setLoading(true);
    setLoadError(false);
    try {
      const data = await apiFetch(`/care/appointments/${encodeURIComponent(appointmentId)}`);
      const a = data?.data || data;
      if (!a || !a.id) {
        setAppt(null);
        setLoadError(true);
      } else {
        setAppt(a);
        if (a.doctor_id) {
          apiFetch(`/care/doctors/${encodeURIComponent(a.doctor_id)}`)
            .then((d: any) => setDoctorName(pickLocalized(d?.name_ar, d?.name_en) || ''))
            .catch(() => {});
        }
      }
    } catch {
      setAppt(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  React.useEffect(() => { load(); }, [load]);

  const prescriptions: string[] = Array.isArray(appt?.prescriptions) ? appt.prescriptions : [];
  const history: any[] = Array.isArray(appt?.state_history) ? [...appt.state_history].reverse() : [];
  const isCompleted = appt?.status === 'COMPLETED';

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={{ width: 40 }} />
        <AppText variant="h4">متابعة الاستشارة</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !appt ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 }}>
          <Icon name="document" size={48} color={colors.textTertiary} />
          <AppText variant="h5" align="center">تعذر تحميل بيانات الاستشارة</AppText>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {loadError && <Button label="إعادة المحاولة" variant="primary" icon="refresh" onPress={load} />}
            <Button label="عودة" variant="ghost" onPress={() => router.back()} />
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
          {/* Consultation summary — real appointment */}
          <Card style={{ flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }}>
            <View style={[st.docAva, { backgroundColor: colors.primarySurface }]}>
              <Icon name="doctor" size={28} color={colors.primary} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
              <AppText variant="h5">{doctorName || 'الطبيب المعالج'}</AppText>
              <AppText variant="caption" color={colors.textTertiary}>
                {appt.slot_start
                  ? new Date(appt.slot_start).toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' }) +
                    ' — ' +
                    new Date(appt.slot_start).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </AppText>
              <Badge label={STATE_AR[appt.status] || appt.status} color={isCompleted ? colors.success : colors.primary} icon={isCompleted ? 'check_circle' : 'clock'} />
            </View>
          </Card>

          {/* Visit type */}
          <Card>
            <SectionHeader title="نوع الزيارة" />
            <AppText variant="bodySM" color={colors.textSecondary}>
              {appt.service_type === 'video' ? 'استشارة فيديو عن بعد' : appt.service_type === 'home' ? 'زيارة منزلية' : 'كشف في العيادة'}
            </AppText>
          </Card>

          {/* Patient notes recorded at booking */}
          {!!appt.patient_notes && (
            <Card>
              <SectionHeader title="ملاحظاتك للطبيب" />
              <AppText variant="bodySM" color={colors.textSecondary}>{appt.patient_notes}</AppText>
            </Card>
          )}

          {/* Prescriptions issued in this consultation */}
          <Card>
            <SectionHeader title="الأدوية الموصوفة" />
            {prescriptions.length === 0 ? (
              <AppText variant="bodySM" color={colors.textTertiary}>
                {isCompleted ? 'لم يصف الطبيب أدوية في هذه الاستشارة' : 'تظهر الأدوية هنا بعد اكتمال الاستشارة'}
              </AppText>
            ) : (
              prescriptions.map((p: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row-reverse', gap: 6, paddingVertical: 4, alignItems: 'center' }}>
                  <Icon name="medication" size={14} color={colors.primary} />
                  <AppText variant="bodySM" color={colors.textSecondary}>{typeof p === 'string' ? p : p?.name || ''}</AppText>
                </View>
              ))
            )}
            {prescriptions.length > 0 && (
              <Button
                label="طلب صرف من الصيدلية"
                variant="ghost"
                icon="prescriptions"
                size="sm"
                onPress={() => router.push('/(tabs)/pharmacy')}
                style={{ marginTop: 8 }}
              />
            )}
          </Card>

          {/* Real status timeline */}
          <SectionHeader title="سجل الحالة" />
          {history.length === 0 ? (
            <AppText variant="bodySM" color={colors.textTertiary} style={{ textAlign: 'center', marginVertical: 10 }}>لا يوجد سجل بعد</AppText>
          ) : (
            history.map((h: any, i: number) => (
              <View key={i} style={{ flexDirection: 'row-reverse', gap: 10 }}>
                <View style={{ alignItems: 'center', gap: 2 }}>
                  <View style={[st.dot, { backgroundColor: i === 0 ? colors.primary : colors.secondary }]} />
                  {i < history.length - 1 && <View style={[st.line, { backgroundColor: colors.borderLight }]} />}
                </View>
                <Card style={{ flex: 1, marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Badge label={STATE_AR[h.state] || h.state} color={i === 0 ? colors.primary : colors.secondary} />
                    <AppText variant="caption" color={colors.textTertiary}>
                      {h.at ? new Date(h.at).toLocaleString(dateLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    </AppText>
                  </View>
                  {!!h.note && <AppText variant="bodySM" color={colors.textSecondary}>{h.note}</AppText>}
                </Card>
              </View>
            ))
          )}

          {/* Actions */}
          <View style={{ gap: 10 }}>
            {!!appt.doctor_id && (
              <Button
                label="محادثة الطبيب"
                variant="outline"
                icon="chat"
                onPress={() => router.push({ pathname: '/consultations/chat-with-doctor', params: { doctorId: appt.doctor_id } } as any)}
              />
            )}
            {!!appt.doctor_id && (
              <Button
                label="حجز موعد متابعة"
                variant="gradient"
                icon="calendarCheck"
                onPress={() => router.push({ pathname: '/consultations/book/[id]', params: { id: appt.doctor_id } } as any)}
              />
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  docAva: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  line: { width: 2, flex: 1, minHeight: 30 },
});
