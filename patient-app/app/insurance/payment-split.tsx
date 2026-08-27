import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Button, Card, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { paymentIntentHeaders } from '../../src/utils/payment-idempotency';
import { isHttpsCheckout } from '../../src/utils/consultation-payment';
import { insurancePaymentAction, insuranceSelfPayHeaders, parseInsuranceCopayRequest, type InsuranceCopayRequest } from '../../src/utils/insurance-copay-contract';
import { appointmentStatusRouteParams } from '../../src/utils/consultation-status-route';

export default function InsurancePaymentSplitScreen() {
  const { colors, isDark } = useApp();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ request_id?: string; appointmentId?: string; booking_kind?: string }>();
  const requestId = typeof params.request_id === 'string' ? params.request_id.trim() : '';
  const [request, setRequest] = useState<InsuranceCopayRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!requestId) { setError('معرّف طلب التأمين غير متوفر. ارجع إلى الحجز أو سجل المطالبات.'); setLoading(false); return; }
    try { setLoading(true); setError(''); setRequest(parseInsuranceCopayRequest(await apiFetch(`/insurance/requests/${encodeURIComponent(requestId)}`))); }
    catch { setRequest(null); setError('تعذر تحميل قرار التأمين. تحقق من صلاحيتك أو أعد المحاولة.'); }
    finally { setLoading(false); }
  }, [requestId]);
  useEffect(() => { void load(); }, [load]);

  const openCheckout = async (kind: 'copay' | 'self-pay') => {
    if (!request) return;
    const capabilitiesPath = kind === 'copay' ? `/payments/insurance/${encodeURIComponent(request.id)}/capabilities` : `/payments/insurance/${encodeURIComponent(request.id)}/self-pay-capabilities`;
    const capabilities = await apiFetch<any>(capabilitiesPath);
    const method = capabilities?.methods?.find((item: any) => item?.id === 'card')?.id;
    if (method !== 'card') throw new Error('الدفع الإلكتروني غير متاح حالياً لهذا القرار');
    const transaction = await apiFetch<any>(`/payments/intent/insurance/${encodeURIComponent(request.id)}`, { method: 'POST', headers: paymentIntentHeaders('insurance', request.id), body: JSON.stringify({ method }) });
    if (!isHttpsCheckout(transaction?.checkout_url)) throw new Error('رابط الدفع الآمن غير متاح حالياً');
    await Linking.openURL(transaction.checkout_url);
    await load();
  };

  const returnToAppointmentStatus = async () => {
    if (!request || request.booking_kind !== 'consultation') throw new Error('لا يمكن فتح حالة الاستشارة لهذا الطلب.');
    const appointment = await apiFetch(`/care/appointments/${encodeURIComponent(request.booking_id)}`);
    router.replace({ pathname: '/consultations/booking-pending', params: appointmentStatusRouteParams(appointment, request.booking_id) });
  };

  const continueFlow = async () => {
    if (!request) return;
    const action = insurancePaymentAction(request);
    setSubmitting(true); setError('');
    try {
      if (action === 'accept_self_pay') { setRequest(parseInsuranceCopayRequest(await apiFetch(`/insurance/requests/${encodeURIComponent(request.id)}/accept-self-pay`, { method: 'POST', headers: insuranceSelfPayHeaders(request.id) }))); }
      else if (action === 'checkout_copay') await openCheckout('copay');
      else if (action === 'checkout_self_pay') await openCheckout('self-pay');
      else if (action === 'covered' || action === 'paid') await returnToAppointmentStatus();
    } catch (reason: any) { setError(reason?.message || 'تعذر متابعة قرار التأمين. لم يُسجّل أي دفع محلياً.'); }
    finally { setSubmitting(false); }
  };

  const action = request ? insurancePaymentAction(request) : 'unavailable';
  const content = action === 'provider_review' ? ['بانتظار مراجعة مزود الخدمة', 'لم يصدر قرار التأمين بعد، لذلك لا يمكن تأكيد خدمة أو دفع الآن.'] : action === 'covered' ? ['موافقة كاملة من التأمين', 'لا يوجد مبلغ مستحق. حدّث الخادم حالة الخدمة ولا حاجة إلى دفع صوري.'] : action === 'checkout_copay' ? ['دفع التحمل المعتمد', 'سيتم فتح بوابة دفع آمنة لمبلغ التحمل الذي أقره الخادم فقط.'] : action === 'accept_self_pay' ? ['تم رفض التغطية', 'يمكنك قبول الدفع الذاتي للسعر الخادمي كاملاً أو الرجوع دون إنشاء دفع.'] : action === 'checkout_self_pay' ? ['الدفع الذاتي المقبول', 'سيتم فتح بوابة دفع آمنة للمبلغ الذي قبلته خادمياً فقط.'] : action === 'paid' ? ['بانتظار/اكتمال التحقق', 'لا تعتبر الخدمة مؤكدة حتى يطابق الخادم سجل الدفع ويحدّث حالتها.'] : ['حالة التأمين غير متاحة', 'لا يمكن متابعة هذا الطلب في حالته الحالية.'];
  const payable = action === 'checkout_copay' ? request?.copay_amount : action === 'checkout_self_pay' ? request?.self_pay_amount : 0;

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><ActivityIndicator color={colors.primary} size="large" /></View>;
  return <View style={[styles.container, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.borderLight, backgroundColor: colors.surface }]}><View style={{ width: 40 }} /><AppText variant="h4">قرار التأمين</AppText><IconButton icon="back" onPress={() => router.back()} /></View><ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 116 }}>{!!error && <Card style={{ alignItems: 'center', gap: 10 }}><Icon name="warning" size={32} color={colors.error} /><AppText align="center" color={colors.textSecondary}>{error}</AppText><Button label="تحديث القرار" variant="outline" size="sm" full={false} onPress={() => void load()} /></Card>}{request && <><Card style={{ gap: 8 }}><AppText variant="h5" style={{ textAlign: 'right' }}>{content[0]}</AppText><AppText color={colors.textSecondary} style={{ textAlign: 'right', lineHeight: 21 }}>{content[1]}</AppText></Card><Card style={{ gap: 12 }}><AppText variant="labelMD" style={{ textAlign: 'right' }}>المبالغ المعتمدة من الخادم</AppText><Row label="إجمالي الخدمة" value={`${request.price} ر.س`} /><Row label="التحمل المعتمد" value={`${request.copay_amount} ر.س`} emphasis={action === 'checkout_copay'} /><Row label="الدفع الذاتي المقبول" value={`${request.self_pay_amount} ر.س`} emphasis={action === 'checkout_self_pay'} /></Card>{action === 'provider_review' && <Button label="تحديث القرار" variant="outline" onPress={() => void load()} />}{action === 'covered' && <Button label="عرض حالة الموعد" loading={submitting} onPress={() => void continueFlow()} />}{action === 'accept_self_pay' && <Button label="قبول الدفع الذاتي" loading={submitting} onPress={() => void continueFlow()} />}{action === 'checkout_copay' && <Button label={`الانتقال للدفع الآمن — ${payable} ر.س`} loading={submitting} onPress={() => void continueFlow()} />}{action === 'checkout_self_pay' && <Button label={`الانتقال للدفع الآمن — ${payable} ر.س`} loading={submitting} onPress={() => void continueFlow()} />}{action === 'paid' && <Button label="عرض حالة الموعد" onPress={() => void continueFlow()} />}</>}</ScrollView></View>;
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) { const { colors } = useApp(); return <View style={[styles.row, { borderBottomColor: colors.borderLight }]}><AppText variant={emphasis ? 'h6' : 'bodyMD'} color={emphasis ? colors.primary : colors.textPrimary}>{value}</AppText><AppText variant={emphasis ? 'h6' : 'bodyMD'}>{label}</AppText></View>; }
const styles = StyleSheet.create({ container: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 }, row: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 } });
