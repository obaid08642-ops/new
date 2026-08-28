// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, Button, IconButton, SegmentedControl, SectionHeader } from '../../src/components/ui';
import { useGuestGuard } from '../../src/hooks/useGuestGuard';
import { apiFetch } from '../../src/utils/api';
import { paymentIntentHeaders } from '../../src/utils/payment-idempotency';
import { appointmentMutationHeaders, isHttpsCheckout } from '../../src/utils/consultation-payment';
import { dateLocale } from '@/utils/dates';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const VISIT_TYPES = [
  { key: 'video', label: 'فيديو', icon: 'video' as IconName, desc: 'استشارة عن بعد' },
  { key: 'clinic', label: 'عيادة', icon: 'hospital' as IconName, desc: 'كشف حضوري' },
  { key: 'home', label: 'منزلي', icon: 'home' as IconName, desc: 'زيارة منزلية' },
];

export default function BookingConfirmScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();
  const { isGuest, requireAuth } = useGuestGuard();
  const [visitType, setVisitType] = useState((params.visitType as string) || 'clinic');
  const [payMethod, setPayMethod] = useState<'card' | 'cash' | 'insurance'>('card');
  const [loading, setLoading] = useState(false);
  const [doctor, setDoctor] = useState<any>(null);
  const [insurance, setInsurance] = useState<any>(null);

  useEffect(() => {
    if (!params.doctorId) return;
    apiFetch<any>(`/care/doctors/${encodeURIComponent(String(params.doctorId))}`)
      .then((res) => setDoctor(res || null))
      .catch(() => setDoctor(null));
  }, [params.doctorId]);

  useEffect(() => {
    if (isGuest || payMethod !== 'insurance') return;
    apiFetch<any>('/users/me/profile')
      .then((profile) => setInsurance(profile?.insurance || null))
      .catch(() => setInsurance(null));
  }, [isGuest, payMethod]);

  const slotStartIso = useMemo(() => {
    if (params.slot_start) {
      const date = new Date(String(params.slot_start));
      return Number.isNaN(date.getTime()) ? '' : date.toISOString();
    }
    if (params.date && params.time) {
      const time = String(params.time).length === 5 ? String(params.time) : '09:00';
      const date = new Date(`${params.date}T${time}:00`);
      return Number.isNaN(date.getTime()) ? '' : date.toISOString();
    }
    return '';
  }, [params.date, params.slot_start, params.time]);

  const slotLabel = slotStartIso ? new Date(slotStartIso).toLocaleString(dateLocale(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'غير محدد';
  const insuranceReady = Boolean(insurance?.provider_id || insurance?.company_id || insurance?.policy_number);

  const handleConfirm = async () => {
    if (!slotStartIso || !params.doctorId) {
      showLocalizedAlert('بيانات الموعد ناقصة', 'ارجع لاختيار طبيب ووقت متاح قبل المتابعة.');
      return;
    }
    if (payMethod === 'insurance' && isGuest) {
      requireAuth('insurance');
      return;
    }
    if (payMethod === 'insurance' && !insuranceReady) {
      showLocalizedAlert('بيانات التأمين ناقصة', 'أضف بوليصة تأمين فعالة إلى ملفك قبل إرسال طلب المراجعة.');
      return;
    }

    setLoading(true);
    try {
      const appointment = await apiFetch<any>('/care/appointments', {
        method: 'POST',
        headers: appointmentMutationHeaders(params.doctorId, slotStartIso),
        body: JSON.stringify({
          doctor_id: params.doctorId,
          service_type: visitType,
          slot_start: slotStartIso,
          payment_method: payMethod,
          insurance_provider: payMethod === 'insurance' ? (insurance?.provider_id || insurance?.company_id) : undefined,
          insurance_member_id: payMethod === 'insurance' ? (insurance?.policy_number || insurance?.member_id) : undefined,
          patient_notes: params.notes ? String(params.notes) : undefined,
          visit_location: visitType === 'home' && params.visit_lat && params.visit_lng
            ? { lat: Number(params.visit_lat), lng: Number(params.visit_lng), address: String(params.visit_address || '') }
            : undefined,
        }),
      });
      if (!appointment?.id) throw new Error('تعذر إنشاء موعد الاستشارة');

      if (payMethod === 'insurance') {
        if (!appointment.insurance_request_id) throw new Error('تعذر إنشاء طلب المراجعة التأميني');
        router.replace({ pathname: '/insurance/payment-split', params: { request_id: appointment.insurance_request_id, appointmentId: appointment.id, booking_kind: 'consultation' } });
        return;
      }

      if (payMethod === 'card') {
        const capabilities = await apiFetch<any>(`/payments/consultation/${encodeURIComponent(appointment.id)}/capabilities`);
        const method = capabilities?.methods?.find((item: any) => item?.id === 'card')?.id;
        if (method !== 'card') throw new Error('الدفع بالبطاقة غير متاح حالياً لهذه الاستشارة');
        const transaction = await apiFetch<any>(`/payments/intent/consultation/${encodeURIComponent(appointment.id)}`, {
          method: 'POST',
          headers: paymentIntentHeaders('consultation', appointment.id),
          body: JSON.stringify({ method }),
        });
        if (!isHttpsCheckout(transaction?.checkout_url)) throw new Error('رابط الدفع الآمن غير متاح حالياً');
        await Linking.openURL(transaction.checkout_url);
      }

      // Opening checkout never marks an appointment paid or confirmed in the client.
      router.replace({ pathname: '/consultations/booking-pending', params: { appointmentId: appointment.id, visitType, payment_pending: payMethod === 'card' ? 'true' : 'false' } });
    } catch (error: any) {
      showLocalizedAlert('تعذر إتمام الطلب', error?.message || 'حاول مرة أخرى لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={{ width: 40 }} />
        <AppText variant="h4">تأكيد طلب الاستشارة</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}>
        <Card style={styles.doctorCard}>
          <View style={[styles.avatar, { backgroundColor: colors.primarySurface }]}><Icon name="doctor" size={30} color={colors.primary} /></View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <AppText variant="h5">{doctor?.name_ar || doctor?.display_name || doctor?.name || 'الطبيب المختار'}</AppText>
            <AppText variant="bodyXS" color={colors.textSecondary}>{doctor?.specialty_ar || doctor?.specialty || 'استشارة طبية'}</AppText>
          </View>
        </Card>

        <Card>
          <SectionHeader title="نوع الزيارة" />
          <View style={styles.visitRow}>{VISIT_TYPES.map((item) => <TouchableOpacity key={item.key} onPress={() => setVisitType(item.key)} style={[styles.visitCard, { borderColor: visitType === item.key ? colors.primary : colors.border, backgroundColor: visitType === item.key ? colors.primarySurface : 'transparent' }]}><Icon name={item.icon} size={22} color={visitType === item.key ? colors.primary : colors.textTertiary} /><AppText variant="labelSM" align="center">{item.label}</AppText><AppText variant="caption" align="center" color={colors.textTertiary}>{item.desc}</AppText></TouchableOpacity>)}</View>
        </Card>

        <Card>
          <SectionHeader title="الموعد" />
          <View style={styles.detailRow}><AppText variant="bodyMD">{slotLabel}</AppText><AppText variant="bodySM" color={colors.textSecondary}>التاريخ والوقت</AppText></View>
        </Card>

        <Card>
          <SectionHeader title="طريقة المتابعة" />
          <SegmentedControl value={payMethod} onChange={(value) => setPayMethod(value as any)} options={visitType === 'clinic' ? [{ key: 'card', label: 'بطاقة', icon: 'card' }, { key: 'cash', label: 'نقد عند العيادة', icon: 'payments' }, { key: 'insurance', label: 'تأمين', icon: 'shield' }] : [{ key: 'card', label: 'بطاقة', icon: 'card' }, { key: 'insurance', label: 'تأمين', icon: 'shield' }]} />
          <AppText variant="caption" color={colors.textTertiary} style={{ marginTop: 12, textAlign: 'right' }}>
            {payMethod === 'insurance' ? 'سيُرسل الطلب للمراجعة التأمينية. لا تُعرض نسبة التحمل أو تُنشأ عملية دفع قبل قرار الجهة المختصة.' : payMethod === 'card' ? 'سيحدد الخادم المبلغ ووسائل الدفع المتاحة. فتح رابط الدفع لا يعني تأكيد الدفع أو الموعد.' : 'الدفع النقدي متاح للعيادة فقط وفق سياسة الخادم.'}
          </AppText>
        </Card>

        {payMethod === 'insurance' && <Card style={{ backgroundColor: insuranceReady ? colors.successSurface : colors.warningSurface }}><AppText variant="bodySM" color={colors.textSecondary}>{insuranceReady ? 'سيستخدم الخادم بيانات بوليصتك المسجلة لإرسال طلب مراجعة التأمين.' : 'لا توجد بوليصة نشطة قابلة للاستخدام. أضف بيانات التأمين إلى ملفك أولاً.'}</AppText><Button label="إدارة التأمين" variant="ghost" onPress={() => router.push('/profile/insurance')} style={{ marginTop: 8 }} /></Card>}

        <Card style={{ backgroundColor: colors.infoSurface }}><AppText variant="bodySM" color={colors.textSecondary}>لا تعرض هذه الشاشة إجمالياً أو ضريبة أو تحملاً محسوباً محلياً. السعر والقرار التأميني والدفع يصدر كل منها من الخادم في مرحلته الصحيحة.</AppText></Card>
      </ScrollView>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}><Button label={payMethod === 'insurance' ? 'إرسال طلب المراجعة التأمينية' : payMethod === 'card' ? 'المتابعة إلى الدفع الآمن' : 'تأكيد الحجز النقدي'} variant="gradient" size="lg" icon={payMethod === 'insurance' ? 'shield' : 'check-circle'} loading={loading} disabled={loading || (payMethod === 'insurance' && !insuranceReady)} onPress={handleConfirm} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 }, content: { padding: 16, gap: 14 }, doctorCard: { flexDirection: 'row-reverse', gap: 12, alignItems: 'center' }, avatar: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, visitRow: { flexDirection: 'row-reverse', gap: 8 }, visitCard: { flex: 1, borderWidth: 1.5, borderRadius: 16, padding: 10, alignItems: 'center', gap: 4 }, detailRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }, bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
