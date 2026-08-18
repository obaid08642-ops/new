// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { lightColors, darkColors } from '../../src/theme/colors';
import Icon from '../../src/components/Icon';
import Header from '../../src/components/Header';
import { apiFetch } from '../../src/utils/api';
import { LocalizedText } from '../../src/components/LocalizedText';

const { width } = Dimensions.get('window');

export default function InsuranceCopayScreen() {
  const { approvalCode, amount } = useLocalSearchParams();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copayRequest, setCopayRequest] = useState<any>(null);
  const [loadError, setLoadError] = useState('');

  // Resolve the real COPAY_PENDING insurance request (written by the provider's
  // insurance decision / gatekeeper) — the payment must reference its id.
  useEffect(() => {
    (async () => {
      try {
        const rows = await apiFetch<any[]>('/insurance/requests/my');
        const pending = (rows || [])
          .filter((r: any) => r.state === 'COPAY_PENDING')
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (pending.length) setCopayRequest(pending[0]);
        else setLoadError(isRTL ? 'لا توجد مطالبة تأمين بانتظار الدفع حالياً' : 'No insurance copay is currently pending');
      } catch {
        setLoadError(isRTL ? 'تعذر تحميل مطالبة التأمين' : 'Failed to load the insurance request');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dueAmount = copayRequest?.copay_amount ?? (amount ? parseFloat(amount as string) : 0);

  const handlePay = async () => {
    if (!copayRequest?.id) {
      alert(isRTL ? 'لا توجد مطالبة بانتظار الدفع' : 'No pending copay request');
      return;
    }
    setLoading(true);
    try {
      // 1) Create a payment intent for the copay amount via the payments gateway
      const txn = await apiFetch<any>(`/payments/intent/insurance/${copayRequest.id}`, { method: 'POST' });
      const paymentId = txn?.id || txn?.gateway_intent_id;
      if (!paymentId) throw new Error('payment_intent_failed');
      // 2) Settle the copay against the insurance request (starts the service)
      await apiFetch('/patient/pay-copay', {
        method: 'POST',
        body: JSON.stringify({ request_id: copayRequest.id, payment_id: paymentId }),
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/(tabs)');
      }, 3000);
    } catch (err) {
      alert(isRTL ? 'فشل إتمام الدفع — تحقق من وسيلة الدفع وحاول مجدداً' : 'Payment failed — check your payment method and retry');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <View style={[styles.circle, { backgroundColor: colors.s, marginBottom: 20 }]}>
          <Icon name="check" size={40} color="#fff" />
        </View>
        <LocalizedText style={[styles.title, { color: colors.t1 }]}>{isRTL ? 'تم الدفع بنجاح' : 'Payment Successful'}</LocalizedText>
        <LocalizedText style={[styles.subtitle, { color: colors.t3, textAlign: 'center', marginTop: 10 }]}>
          {isRTL ? 'تم تحصيل نسبة التحمل بنجاح. يمكنك الآن المتابعة مع طبيبك.' : 'Copay paid successfully. You may now continue with your doctor.'}
        </LocalizedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header title={isRTL ? 'موافقة التأمين' : 'Insurance Approval'} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: colors.c1 }]}>
          <Icon name="shield" size={40} color={colors.p} />
          <LocalizedText style={[styles.title, { color: colors.t1, marginTop: 16 }]}>
            {isRTL ? 'مطلوب دفع نسبة التحمل' : 'Copay Payment Required'}
          </LocalizedText>
          <LocalizedText style={[styles.subtitle, { color: colors.t3, marginTop: 8 }]}>
            {isRTL ? `كود الموافقة من نفييس:` : 'NPHIES Approval Code:'} {approvalCode || 'N/A'}
          </LocalizedText>
        </View>

        <View style={styles.amountContainer}>
          <LocalizedText style={[styles.amountLabel, { color: colors.t2 }]}>{isRTL ? 'المبلغ المطلوب دفعه' : 'Amount to Pay'}</LocalizedText>
          <LocalizedText style={[styles.amountValue, { color: colors.p }]}>{dueAmount || '0'} {isRTL ? 'ر.س' : 'SAR'}</LocalizedText>
          {loadError ? <LocalizedText style={[styles.subtitle, { color: colors.t3, marginTop: 8, textAlign: 'center' }]}>{loadError}</LocalizedText> : null}
        </View>

        <TouchableOpacity 
          style={[styles.payBtn, { backgroundColor: colors.p }]}
          onPress={handlePay}
          disabled={loading}
        >
          <LocalizedText style={styles.payBtnText}>{loading ? (isRTL ? 'جاري الدفع...' : 'Processing...') : (isRTL ? 'تأكيد الدفع' : 'Confirm Payment')}</LocalizedText>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, alignItems: 'center' },
  card: {
    width: '100%', padding: 24, borderRadius: 20,
    alignItems: 'center', marginBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 4
  },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center' },
  amountContainer: { alignItems: 'center', marginBottom: 40 },
  amountLabel: { fontSize: 16, marginBottom: 8 },
  amountValue: { fontSize: 48, fontWeight: '900' },
  payBtn: {
    width: '100%', height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 6
  },
  payBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  circle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' }
});
