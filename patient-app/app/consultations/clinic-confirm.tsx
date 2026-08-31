// @ts-nocheck
/**
 * M4-FE2 · شاشة تأكيد العيادة الختامية (BR-3)
 * بعد قبول المزود لحجز العيادة: باركود/QR للحجز + موقع واتجاهات +
 * تواصل (اتصال/محادثة) + تعليمات تحضير + سياسة الإلغاء والاسترداد.
 * المصادر: GET /appointments/:id · GET /care/doctors/:doctor_id
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Linking, Platform, Alert, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Button } from '../../src/components/ui';
import { ScreenState } from '../../src/components/ScreenStates';
import { apiFetch } from '../../src/utils/api';
import { dateLocale } from '@/utils/dates';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { useLocalSearchParams as __useRouteParams } from "expo-router";
import ClinicLocationView from "../../src/components/views/ClinicLocationView";

function ClinicConfirmScreenInner() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, lang } = useApp();
  const AR = lang !== 'en';
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();

  const [appt, setAppt] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!appointmentId) { setError(AR ? 'معرّف الموعد مفقود' : 'Missing appointment id'); setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const a = await apiFetch<any>(`/care/appointments/${appointmentId}`);
      setAppt(a);
      if (a?.doctor_id) {
        try { setDoctor(await apiFetch<any>(`/care/doctors/${a.doctor_id}`)); } catch {}
      }
    } catch (e: any) {
      setError(e?.message || (AR ? 'تعذر تحميل بيانات الموعد' : 'Failed to load appointment'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appointmentId, AR]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ScreenState loading>{null}</ScreenState>;
  if (error && !appt) return <ScreenState error={error} onRetry={() => load()}>{null}</ScreenState>;
  if (!appt) return <ScreenState empty emptyTitle={AR ? 'الموعد غير موجود' : 'Appointment not found'}>{null}</ScreenState>;

  const facility = doctor?.facility || null;
  const clinicName = facility?.name || doctor?.clinic_name || (AR ? 'العيادة' : 'Clinic');
  const address = facility?.address || doctor?.clinic_address || '';
  const phone = facility?.phone || doctor?.clinic_phone || doctor?.phone || '';
  const lat = facility?.location?.lat ?? doctor?.location?.lat;
  const lng = facility?.location?.lng ?? doctor?.location?.lng;

  const dateStr = appt.slot_start
    ? new Date(appt.slot_start).toLocaleDateString(AR ? dateLocale() : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    : '—';
  const timeStr = appt.slot_start
    ? new Date(appt.slot_start).toLocaleTimeString(AR ? dateLocale() : 'en-GB', { hour: '2-digit', minute: '2-digit' })
    : '—';
  const bookingCode = String(appt.id || '').toUpperCase();

  const openDirections = () => {
    if (lat == null || lng == null) {
      router.push({ pathname: '/consultations/clinic-location', params: { appointmentId } });
      return;
    }
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(clinicName)}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(clinicName)})`,
    });
    if (url) Linking.openURL(url);
  };

  const callClinic = () => {
    if (!phone) { showLocalizedAlert(AR ? 'غير متاح' : 'Unavailable', AR ? 'رقم التواصل غير متوفر حاليًا' : 'Contact number not available'); return; }
    Linking.openURL(`tel:${phone}`);
  };

  const openChat = () => {
    router.push({ pathname: '/consultations/chat-with-doctor', params: { doctorId: appt.doctor_user_id || appt.doctor_id, appointmentId } });
  };

  const openCancelPolicy = () => {
    router.push({ pathname: '/consultations/cancel-reschedule', params: { appointmentId } });
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={{ width: 40 }} />
        <AppText variant="h4">{AR ? 'تأكيد موعد العيادة' : 'Clinic Booking Confirmed'}</AppText>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ width: 40, alignItems: 'center' }}>
          <Icon name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        {/* QR / Barcode card */}
        <Card style={{ alignItems: 'center', gap: 10 }}>
          <AppText variant="h5">{AR ? 'أظهر هذا الرمز عند الاستقبال' : 'Show this code at reception'}</AppText>
          <View style={{ backgroundColor: '#FFF', padding: 16, borderRadius: 16 }}>
            <QRCode value={`NABDAH:APPT:${bookingCode}`} size={170} />
          </View>
          <AppText variant="labelMD" color={colors.textSecondary} style={{ letterSpacing: 2 }}>{bookingCode.slice(0, 8)}</AppText>
          <View style={{ flexDirection: 'row-reverse', gap: 16, marginTop: 4 }}>
            <View style={{ alignItems: 'center' }}>
              <AppText variant="caption" color={colors.textTertiary}>{AR ? 'التاريخ' : 'Date'}</AppText>
              <AppText variant="labelMD">{dateStr}</AppText>
            </View>
            <View style={{ alignItems: 'center' }}>
              <AppText variant="caption" color={colors.textTertiary}>{AR ? 'الوقت' : 'Time'}</AppText>
              <AppText variant="labelMD">{timeStr}</AppText>
            </View>
          </View>
        </Card>

        {/* Clinic info + contact */}
        <Card style={{ gap: 10 }}>
          <AppText variant="h5" style={{ textAlign: 'right' }}>{AR ? 'بيانات العيادة' : 'Clinic details'}</AppText>
          <View style={st.row}>
            <AppText variant="bodyMD" style={{ flex: 1, textAlign: 'right' }}>{clinicName}{doctor?.name ? ` · ${doctor.name}` : ''}</AppText>
            <Icon name="hospital" size={18} color={colors.primary} />
          </View>
          {!!address && (
            <View style={st.row}>
              <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1, textAlign: 'right' }}>{address}</AppText>
              <Icon name="map" size={18} color={colors.textTertiary} />
            </View>
          )}
          <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 6 }}>
            <TouchableOpacity onPress={openDirections} style={[st.actionBtn, { backgroundColor: colors.primarySurface }]}>
              <Icon name="map" size={18} color={colors.primary} />
              <AppText variant="labelSM" color={colors.primary}>{AR ? 'الاتجاهات' : 'Directions'}</AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={callClinic} style={[st.actionBtn, { backgroundColor: colors.primarySurface }]}>
              <Icon name="phone" size={18} color={colors.primary} />
              <AppText variant="labelSM" color={colors.primary}>{AR ? 'اتصال' : 'Call'}</AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={openChat} style={[st.actionBtn, { backgroundColor: colors.primarySurface }]}>
              <Icon name="chat" size={18} color={colors.primary} />
              <AppText variant="labelSM" color={colors.primary}>{AR ? 'محادثة' : 'Chat'}</AppText>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Preparation */}
        <Card style={{ gap: 8 }}>
          <AppText variant="h5" style={{ textAlign: 'right' }}>{AR ? 'قبل موعدك' : 'Before your visit'}</AppText>
          {(AR
            ? ['احضر قبل الموعد بـ 15 دقيقة لتسجيل الوصول', 'أحضر الهوية الوطنية وبطاقة التأمين إن وجدت', 'أحضر نتائج التحاليل أو الأشعة السابقة', 'جهّز قائمة بالأدوية التي تتناولها حاليًا']
            : ['Arrive 15 minutes early for check-in', 'Bring your national ID and insurance card if any', 'Bring previous lab or radiology results', 'Prepare a list of your current medications']
          ).map((tip, i) => (
            <View key={i} style={st.row}>
              <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1, textAlign: 'right' }}>{tip}</AppText>
              <Icon name="check_circle" size={16} color={colors.success} />
            </View>
          ))}
        </Card>

        {/* Cancellation policy */}
        <Card style={{ gap: 8, borderWidth: 1, borderColor: colors.borderLight }}>
          <AppText variant="h5" style={{ textAlign: 'right' }}>{AR ? 'سياسة الإلغاء والاسترداد' : 'Cancellation & refund policy'}</AppText>
          {[
            AR ? 'قبل الموعد بأكثر من 24 ساعة: استرداد 100%' : 'More than 24h before: 100% refund',
            AR ? 'قبل 4–24 ساعة: استرداد 50%' : '4–24h before: 50% refund',
            AR ? 'أقل من 4 ساعات: غير قابل للاسترداد' : 'Less than 4h: non-refundable',
          ].map((rule, i) => (
            <View key={i} style={st.row}>
              <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1, textAlign: 'right' }}>{rule}</AppText>
              <Icon name="document" size={14} color={colors.textTertiary} />
            </View>
          ))}
          <Button variant="outline" label={AR ? 'إلغاء / إعادة جدولة الموعد' : 'Cancel / reschedule'} onPress={openCancelPolicy} style={{ marginTop: 8 }} />
        </Card>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 10 },
});

// __RouteGuard: Phase 2 unified-screen host (view=location)
export default function ClinicConfirmScreenInnerRoute() {
  const __p = __useRouteParams() as any;
  if (__p?.view === "location") return <ClinicLocationView />;
  return <ClinicConfirmScreenInner />;
}
