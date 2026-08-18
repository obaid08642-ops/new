// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Modal, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon, IconName } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { dateLocale } from '@/utils/dates';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

export default function AppointmentDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
  const AR = lang !== 'en';
  const params = useLocalSearchParams();
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.appointmentId) return;
    setLoading(true);
    apiFetch<any>(`/care/appointments/${params.appointmentId}`)
      .then(res => {
        if (res) {
          setAppointment(res);
        }
        setLoading(false);
      })
      .catch(() => {
        setAppointment(null);
        setLoading(false);
      });
  }, [params.appointmentId]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } ]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } ]}>
        <AppText variant="h4" color={colors.textSecondary}>الموعد غير موجود</AppText>
      </View>
    );
  }

  const formattedDate = appointment?.scheduled_at ? new Date(appointment.scheduled_at).toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'غداً';
  const formattedTime = appointment?.scheduled_at ? new Date(appointment.scheduled_at).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' }) : '10:00 ص';

  const DETAILS = [
    { icon: 'calendar' as IconName, label: 'التاريخ', value: formattedDate },
    { icon: 'clock' as IconName, label: 'الوقت', value: formattedTime },
    { icon: appointment?.consultation_type === 'home' ? 'home' as IconName : appointment?.consultation_type === 'clinic' ? 'hospital' as IconName : 'video' as IconName, label: 'نوع الكشف', value: appointment?.consultation_type === 'home' ? 'زيارة منزلية' : appointment?.consultation_type === 'clinic' ? 'كشف عيادة حضوري' : 'استشارة أونلاين (فيديو)' },
    { icon: 'clock' as IconName, label: 'المدة', value: '30 دقيقة' },
    { icon: 'card' as IconName, label: 'طريقة الدفع', value: appointment?.payment_method === 'insurance' ? 'تغطية تأمين' : appointment?.payment_method === 'cash' ? 'دفع نقدي' : 'بطاقة مدى/فيزا' },
    { icon: 'receipt' as IconName, label: 'رقم الحجز', value: String(appointment?.id || '').substring(0, 8).toUpperCase() },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight, borderBottomWidth: 1 } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4">تفاصيل الموعد</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 } ]}>
        {/* Status Banner */}
        <View colors={[colors.primary, colors.secondary]} style={styles.statusBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={[styles.statusIcon, { backgroundColor: 'rgba(255,255,255,0.2)' } ]}><Icon name="check_circle" size={24} color="#fff" /></View>
          <AppText variant="h4" color="#fff">موعد مؤكد</AppText>
          <AppText variant="bodySM" color="rgba(255,255,255,0.85)">{formattedDate} في {formattedTime}</AppText>
        </View>

        {/* Doctor Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 } ]}>
          <View style={styles.docRow}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/consultations/doctor/[id]', params: { id: appointment?.doctor_id || '1' } })}
              style={[styles.viewProfileBtn, { backgroundColor: colors.primarySurface } ]}>
              <AppText variant="labelSM" color={colors.primary}>عرض الملف</AppText>
            </TouchableOpacity>
            <View style={styles.docInfo}>
              <AppText variant="h5">{appointment?.doctor?.name || appointment?.doctor_name || 'الطبيب المعالج'}</AppText>
              <AppText variant="caption" color={colors.textSecondary}>{appointment?.doctor?.specialty || appointment?.specialty || ''}</AppText>
            </View>
            <View style={[styles.docAva, { backgroundColor: colors.primarySurface } ]}>
              <Icon name="doctor" size={24} color={colors.primary} />
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 } ]}>
          <AppText variant="h5" style={{ marginBottom: 12 }}>معلومات الاستشارة</AppText>
          {DETAILS.map((d, i) => (
            <View key={i} style={[styles.detailRow, { borderBottomColor: colors.borderLight }, i === DETAILS.length - 1 && { borderBottomWidth: 0 }]} >
              <AppText variant="labelMD" color={colors.textPrimary}>{d.value}</AppText>
              <View style={styles.detailLeft}>
                <Icon name={d.icon} size={14} color={colors.textTertiary} />
                <AppText variant="caption" color={colors.textSecondary}>{d.label}</AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Price — shown only when a real amount exists on the appointment */}
        {(appointment?.price ?? appointment?.amount ?? null) != null && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 } ]}>
            <View style={styles.priceRow}>
              <AppText variant="h4" color={colors.primary}>{appointment.price ?? appointment.amount} ر.س</AppText>
              <AppText variant="labelMD" color={colors.textPrimary}>المبلغ المدفوع</AppText>
            </View>
          </View>
        )}

        {/* Post-consultation summary (M4) */}
        {appointment?.status === 'COMPLETED' && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/consultations/summary', params: { appointmentId: appointment?.id } })}
            style={[styles.card, { backgroundColor: colors.primarySurface, borderColor: colors.primary, borderWidth: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }]}
          >
            <Icon name="document" size={20} color={colors.primary} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <AppText variant="labelMD" color={colors.primary}>عرض ملخص الاستشارة</AppText>
              <AppText variant="caption" color={colors.textSecondary}>التشخيص والوصفة والتوصيات</AppText>
            </View>
            <Icon name="chevronLeft" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Rate the experience (M4) — only after completion */}
        {appointment?.status === 'COMPLETED' && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/reviews', params: { booking_kind: 'appointment', booking_id: appointment?.id, providerName: appointment?.doctor?.name || appointment?.doctor_name || '' } })}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: '#F59E0B', borderWidth: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }]}
          >
            <Icon name="star" size={20} color="#F59E0B" />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <AppText variant="labelMD" color={colors.textPrimary}>قيّم تجربتك</AppText>
              <AppText variant="caption" color={colors.textSecondary}>تقييمك يساعد المرضى الآخرين</AppText>
            </View>
            <Icon name="chevronLeft" size={18} color="#F59E0B" />
          </TouchableOpacity>
        )}

        {/* Preparation Tips */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 } ]}>
          <AppText variant="h5" style={{ marginBottom: 12 }}>تحضيرات قبل الموعد</AppText>
          {[
            'تأكد من اتصالك بالإنترنت قبل 5 دقائق',
            'اجلس في مكان هادئ ومضيء',
            'جهّز قائمة أسئلتك للطبيب',
            'أحضر نتائج التحاليل السابقة',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1, textAlign: 'right' }}>{tip}</AppText>
              <Icon name="check_circle" size={16} color={colors.success} />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Insurance Co-Pay Lock Modal */}
      {appointment?.status === 'PENDING_COPAY' && (
        <Modal transparent visible={true} animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
            <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 24, alignItems: 'center' }}>
              <Icon name="shield" size={48} color={colors.primary} />
              <AppText variant="h3" style={{ marginTop: 16, textAlign: 'center' }}>{AR ? 'موافقة التأمين' : 'Insurance Approved'}</AppText>
              <AppText variant="bodyMD" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 8 }}>
                {AR ? `تمت الموافقة. ادفع نسبة التحمل (${appointment?.copay_amount || 0} ريال) لفتح الاستشارة` : `Approved. Pay the co-pay (${appointment?.copay_amount || 0} SAR) to unlock.`}
              </AppText>
              
              <View style={{ width: '100%', marginTop: 24, gap: 12 }}>
                <Button label={AR ? `دفع ${appointment?.copay_amount || 0} ريال` : `Pay ${appointment?.copay_amount || 0} SAR`} onPress={() => {
                  apiFetch('/patient/pay-copay', { method: 'POST', body: { id: appointment.id } })
                    .then(() => setAppointment({...appointment, status: 'CONFIRMED'}))
                    .catch((e: any) => showLocalizedAlert(AR ? 'تعذر الدفع' : 'Payment failed', e?.message || (AR ? 'حاول مرة أخرى' : 'Try again')))
                }} />
                <Button variant="outline" label={AR ? 'إلغاء الموعد' : 'Cancel Appointment'} onPress={() => router.back()} />
              </View>
            </View>
          </View>
        </Modal>
      )}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight, borderTopWidth: 1 } ]}>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/consultations/cancel-reschedule', params: { appointmentId: appointment?.id } })}
          style={[styles.cancelBtn, { borderColor: colors.error } ]}>
          <AppText variant="labelMD" color={colors.error}>إلغاء / تأجيل</AppText>
        </TouchableOpacity>
        {['online', 'video'].includes(appointment?.consultation_type) && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/consultations/virtual-waiting-room', params: { appointmentId: appointment?.id } })}
            style={styles.joinBtn}
          >
            <View colors={[colors.primary, colors.secondary]} style={styles.joinBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <AppText variant="labelMD" color="#fff">انضم لغرفة الانتظار</AppText>
            </View>
          </TouchableOpacity>
        )}
        {appointment?.consultation_type === 'clinic' && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/consultations/clinic-location', params: { appointmentId: appointment?.id } })}
            style={styles.joinBtn}
          >
            <View colors={[colors.primary, colors.secondary]} style={styles.joinBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <AppText variant="labelMD" color="#fff">موقع العيادة</AppText>
            </View>
          </TouchableOpacity>
        )}
        {appointment?.consultation_type === 'home' && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/consultations/home-visit-tracking', params: { appointmentId: appointment?.id } })}
            style={styles.joinBtn}
          >
            <View colors={[colors.primary, colors.secondary]} style={styles.joinBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <AppText variant="labelMD" color="#fff">تتبع الطبيب</AppText>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  title: { fontSize: 18, fontWeight: '800' },
  content: { padding: 16, gap: 12 },
  statusBanner: { borderRadius: 20, padding: 20, alignItems: 'center', gap: 6 },
  statusIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  statusTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  statusSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '400' },
  card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '800', textAlign: 'right', marginBottom: 12 },
  docRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  docAva: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  docInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  docName: { fontSize: 15, fontWeight: '800' },
  docSpec: { fontSize: 12, fontWeight: '400' },
  docRating: {},
  viewProfileBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  viewProfileText: { fontSize: 12, fontWeight: '700' },
  detailRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  detailLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  detailIcon: { fontSize: 16 },
  detailLabel: { fontSize: 13, fontWeight: '400' },
  detailVal: { fontSize: 14, fontWeight: '700' },
  priceRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  priceLabel: { fontSize: 15, fontWeight: '800' },
  priceVal: { fontSize: 22, fontFamily: 'Cairo-ExtraBold' },
  receiptBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderRadius: 12, padding: 10, justifyContent: 'center' },
  receiptText: { fontSize: 13, fontWeight: '700' },
  tipRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 7 },
  tipText: { flex: 1, fontSize: 13, fontWeight: '400', textAlign: 'right', lineHeight: 20 },
  bottomBar: { flexDirection: 'row-reverse', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  cancelBtn: { borderRadius: 14, borderWidth: 1.5, height: 50, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700' },
  joinBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  joinBtnInner: { height: 50, justifyContent: 'center', alignItems: 'center' },
  joinBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
