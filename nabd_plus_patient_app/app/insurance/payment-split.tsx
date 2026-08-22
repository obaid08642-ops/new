// app/insurance/payment-split.tsx — server-owned insurance copay summary
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Button, Card, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { paymentIntentHeaders } from '../../src/utils/payment-idempotency';
import { insurancePaymentAction, parseInsuranceCopayRequest, type InsuranceCopayRequest } from '../../src/utils/insurance-copay-contract';

export default function InsurancePaymentSplitScreen() {
  const { colors, isDark } = useApp();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ request_id?: string }>();
  const requestId = typeof params.request_id === 'string' ? params.request_id.trim() : '';
  const [request, setRequest] = useState<InsuranceCopayRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!requestId) { setError('معرّف طلب التأمين غير متوفر. ارجع إلى الحجز أو سجل المطالبات.'); setLoading(false); return; }
    try {
      setLoading(true); setError('');
      setRequest(parseInsuranceCopayRequest(await apiFetch(`/insurance/requests/${requestId}`)));
    } catch {
      setRequest(null); setError('تعذر تحميل طلب التأمين. تحقق من صلاحيتك أو أعد المحاولة.');
    } finally { setLoading(false); }
  }, [requestId]);

  useEffect(() => { void load(); }, [load]);

  const continueFlow = async () => {
    if (!request) return;
    const action = insurancePaymentAction(request);
    try {
      setSubmitting(true); setError('');
      if (action === 'settle_zero_copay') {
        await apiFetch(`/insurance/requests/${request.id}/pay-copay`, { method: 'POST', body: JSON.stringify({}) });
        await load();
      } else if (action === 'checkout_copay') {
        const txn = await apiFetch<any>(`/payments/intent/insurance/${request.id}`, { method: 'POST', headers: paymentIntentHeaders('insurance', request.id) });
        if (!txn?.id) throw new Error('payment_intent_failed');
        router.replace({ pathname: '/payments/processing', params: { moyasarId: txn.id, paymentUrl: txn.checkout_url || '', bookingId: request.id, bookingKind: 'insurance', amount: String(txn.amount) } });
      }
    } catch {
      setError('تعذر متابعة التحمل. لم يُسجّل أي دفع محلياً؛ حاول لاحقاً أو راجع حالة الطلب.');
    } finally { setSubmitting(false); }
  };

  const action = request ? insurancePaymentAction(request) : 'unavailable';
  const title = action === 'provider_review' ? 'بانتظار مراجعة مزود الخدمة' : action === 'settle_zero_copay' ? 'موافقة كاملة من التأمين' : action === 'checkout_copay' ? 'دفع التحمل المعتمد' : action === 'paid' ? 'تم تسجيل دفع التحمل' : 'حالة التأمين غير متاحة';
  const detail = action === 'provider_review' ? 'لم يُحدد مزود الخدمة التغطية بعد، لذلك لا يمكن تأكيد حجز أو دفع الآن.' : action === 'settle_zero_copay' ? 'لا يوجد مبلغ مستحق عليك. أكّد الاستمرار لتسجيل الموافقة الكاملة.' : action === 'checkout_copay' ? 'سيتم فتح بوابة دفع آمنة للمبلغ الذي اعتمده مزود الخدمة فقط.' : action === 'paid' ? 'تمت تسوية التحمل عبر سجل الدفع الموثق.' : 'لا يمكن متابعة هذا الطلب في حالته الحالية.';

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} /><ActivityIndicator color={colors.primary} size="large" /></View>;
  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.borderLight, backgroundColor: colors.surface }]}><View style={{ width: 40 }} /><AppText variant="h4">ملخص التأمين</AppText><IconButton icon="back" onPress={() => router.back()} /></View>
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 116 }}>
      {!!error && <Card style={{ alignItems: 'center', gap: 10 }}><Icon name="warning" size={32} color={colors.error} /><AppText align="center" color={colors.textSecondary}>{error}</AppText><Button label="إعادة المحاولة" variant="outline" size="sm" full={false} onPress={() => void load()} /></Card>}
      {request && <>
        <Card style={{ gap: 8 }}><AppText variant="h5" style={{ textAlign: 'right' }}>{title}</AppText><AppText color={colors.textSecondary} style={{ textAlign: 'right', lineHeight: 21 }}>{detail}</AppText></Card>
        <Card style={{ gap: 12 }}><AppText variant="labelMD" style={{ textAlign: 'right' }}>الأرقام المعتمدة من الخادم</AppText><Row label="إجمالي الخدمة" value={`${request.price} ر.س`} /><Row label="تغطية التأمين" value={`${Math.max(0, request.price - request.copay_amount)} ر.س`} positive /><Row label="حصتك المعتمدة" value={`${request.copay_amount} ر.س`} emphasis /></Card>
        {action === 'provider_review' && <Button label="تحديث الحالة" variant="outline" onPress={() => void load()} />}
        {action === 'settle_zero_copay' && <Button label="تأكيد الموافقة الكاملة" loading={submitting} onPress={() => void continueFlow()} />}
        {action === 'checkout_copay' && <Button label={`الانتقال للدفع الآمن — ${request.copay_amount} ر.س`} loading={submitting} onPress={() => void continueFlow()} />}
        {action === 'paid' && <Button label="العودة إلى حجوزاتي" onPress={() => router.replace('/(tabs)')} />}
      </>}
    </ScrollView>
  </View>;
}

function Row({ label, value, positive, emphasis }: { label: string; value: string; positive?: boolean; emphasis?: boolean }) { const { colors } = useApp(); return <View style={[styles.row, { borderBottomColor: colors.borderLight }]}><AppText variant={emphasis ? 'h6' : 'bodyMD'} color={positive ? colors.success : emphasis ? colors.primary : colors.textPrimary}>{value}</AppText><AppText variant={emphasis ? 'h6' : 'bodyMD'}>{label}</AppText></View>; }
const styles = StyleSheet.create({ container: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 }, row: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 } });
