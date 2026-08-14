import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useApp } from '../../context/AppContext';

export function InsuranceCopayScreen({ route, navigation }: any) {
  const { copayAmount, approvalCode } = route.params || { copayAmount: 0, approvalCode: '' };
  const { colors } = useApp();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.n }]}>موافقة التأمين</Text>
      <Text style={[styles.subtitle, { color: colors.t2 }]}>تمت الموافقة. ادفع نسبة التحمل لفتح الاستشارة.</Text>
      
      <View style={[styles.card, { backgroundColor: colors.s, borderColor: colors.bd }]}>
        <Text style={[styles.amount, { color: colors.gr }]}>{copayAmount} SAR</Text>
        <Text style={[styles.code, { color: colors.t3 }]}>Approval Code: {approvalCode}</Text>
      </View>

      <TouchableOpacity style={[styles.payBtn, { backgroundColor: colors.gr }]} onPress={() => navigation.navigate('PaymentGateway')}>
        <Text style={styles.payText}>دفع نسبة التحمل</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 30 },
  card: { padding: 30, borderRadius: 15, borderWidth: 1, elevation: 2, alignItems: 'center', marginBottom: 30, width: '100%' },
  amount: { fontSize: 36, fontWeight: 'bold', marginBottom: 10 },
  code: { fontSize: 14 },
  payBtn: { padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
  payText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
