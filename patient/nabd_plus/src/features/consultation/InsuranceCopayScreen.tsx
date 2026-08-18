import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export function InsuranceCopayScreen({ route, navigation }: any) {
  const { copayAmount, approvalCode } = route.params || { copayAmount: 0, approvalCode: '' };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>موافقة التأمين</Text>
      <Text style={styles.subtitle}>تمت الموافقة. ادفع نسبة التحمل لفتح الاستشارة.</Text>
      
      <View style={styles.card}>
        <Text style={styles.amount}>{copayAmount} SAR</Text>
        <Text style={styles.code}>Approval Code: {approvalCode}</Text>
      </View>

      <TouchableOpacity style={styles.payBtn} onPress={() => navigation.navigate('PaymentGateway')}>
        <Text style={styles.payText}>دفع نسبة التحمل</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
  card: { backgroundColor: '#fff', padding: 30, borderRadius: 15, elevation: 2, alignItems: 'center', marginBottom: 30, width: '100%' },
  amount: { fontSize: 36, fontWeight: 'bold', color: '#4CAF50', marginBottom: 10 },
  code: { fontSize: 14, color: '#888' },
  payBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
  payText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
