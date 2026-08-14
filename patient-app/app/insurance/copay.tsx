// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { lightColors, darkColors } from '../../src/theme/colors';
import Icon from '../../src/components/Icon';
import Header from '../../src/components/Header';
import { apiFetch } from '../../src/utils/api';

const { width } = Dimensions.get('window');

export default function InsuranceCopayScreen() {
  const { approvalCode, amount } = useLocalSearchParams();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      await apiFetch('/provider/jobs/insurance-copay', {
        method: 'POST',
        body: JSON.stringify({ approval_code: approvalCode, amount: parseFloat(amount as string) })
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/(tabs)');
      }, 3000);
    } catch (err) {
      alert(isRTL ? 'فشل إتمام الدفع' : 'Payment failed');
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
        <Text style={[styles.title, { color: colors.t1 }]}>{isRTL ? 'تم الدفع بنجاح' : 'Payment Successful'}</Text>
        <Text style={[styles.subtitle, { color: colors.t3, textAlign: 'center', marginTop: 10 }]}>
          {isRTL ? 'تم تحصيل نسبة التحمل بنجاح. يمكنك الآن المتابعة مع طبيبك.' : 'Copay paid successfully. You may now continue with your doctor.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Header title={isRTL ? 'موافقة التأمين' : 'Insurance Approval'} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: colors.c1 }]}>
          <Icon name="shield" size={40} color={colors.p} />
          <Text style={[styles.title, { color: colors.t1, marginTop: 16 }]}>
            {isRTL ? 'مطلوب دفع نسبة التحمل' : 'Copay Payment Required'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.t3, marginTop: 8 }]}>
            {isRTL ? `كود الموافقة من نفييس:` : 'NPHIES Approval Code:'} {approvalCode || 'N/A'}
          </Text>
        </View>

        <View style={styles.amountContainer}>
          <Text style={[styles.amountLabel, { color: colors.t2 }]}>{isRTL ? 'المبلغ المطلوب دفعه' : 'Amount to Pay'}</Text>
          <Text style={[styles.amountValue, { color: colors.p }]}>{amount || '0'} {isRTL ? 'ر.س' : 'SAR'}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.payBtn, { backgroundColor: colors.p }]}
          onPress={handlePay}
          disabled={loading}
        >
          <Text style={styles.payBtnText}>{loading ? (isRTL ? 'جاري الدفع...' : 'Processing...') : (isRTL ? 'تأكيد الدفع' : 'Confirm Payment')}</Text>
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
