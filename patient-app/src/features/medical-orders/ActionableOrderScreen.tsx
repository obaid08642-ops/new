import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useApp } from '../../context/AppContext';

export function ActionableOrderScreen({ route, navigation }: any) {
  const { meds = [], labs = [] } = route.params || {};
  const { colors } = useApp();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.header, { color: colors.n }]}>طلب طبي معتمد</Text>
      
      {meds.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.s, borderColor: colors.bd }]}>
          <Text style={[styles.sectionTitle, { color: colors.n }]}>الأدوية الوصفية</Text>
          {meds.map((m: any, i: number) => (
            <Text key={i} style={[styles.item, { color: colors.t2 }]}>• {m.name}</Text>
          ))}
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.gr }]}>
            <Text style={styles.btnText}>اطلب من الصيدلية</Text>
          </TouchableOpacity>
        </View>
      )}

      {labs.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.s, borderColor: colors.bd }]}>
          <Text style={[styles.sectionTitle, { color: colors.n }]}>تحاليل وأشعة</Text>
          {labs.map((l: any, i: number) => (
            <Text key={i} style={[styles.item, { color: colors.t2 }]}>• {l.name}</Text>
          ))}
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.bl }]}>
            <Text style={styles.btnText}>احجز موعد مختبر</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  section: { padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 20, elevation: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  item: { fontSize: 16, marginBottom: 5 },
  actionBtn: { padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
