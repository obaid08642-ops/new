import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export function ActionableOrderScreen({ route, navigation }: any) {
  const { meds = [], labs = [] } = route.params || {};

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>طلب طبي معتمد</Text>

      {meds.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الأدوية الوصفية</Text>
          {meds.map((m: any, i: number) => (
            <Text key={i} style={styles.item}>• {m.name}</Text>
          ))}
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.btnText}>اطلب من الصيدلية</Text>
          </TouchableOpacity>
        </View>
      )}

      {labs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>تحاليل وأشعة</Text>
          {labs.map((l: any, i: number) => (
            <Text key={i} style={styles.item}>• {l.name}</Text>
          ))}
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2196F3' }]}>
            <Text style={styles.btnText}>احجز موعد مختبر</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  section: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 20, elevation: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  item: { fontSize: 16, color: '#555', marginBottom: 5 },
  actionBtn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
