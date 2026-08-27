import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { LocalizedText } from '../../src/components/LocalizedText';

export default function DrugNotFoundRoute() {
  const insets = useSafeAreaInsets(); const { colors } = useApp() as any;
  return <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24 }]}><LocalizedText style={[styles.title, { color: colors.textPrimary }]}>لم تجد الدواء؟</LocalizedText><LocalizedText style={{ color: colors.textSecondary, textAlign: 'center' }}>أنشئ طلباً يدوياً لبث اسم الدواء وتفاصيله إلى الصيدليات. يظهر البديل أو التوفر ضمن العروض ولا يُحاكى قرار أو إشعار أو سعر في هذه الشاشة.</LocalizedText><TouchableOpacity onPress={() => router.replace('/pharmacy/manual-order')} style={[styles.primary, { backgroundColor: colors.primary }]}><LocalizedText style={styles.primaryText}>طلب الدواء يدوياً</LocalizedText></TouchableOpacity><TouchableOpacity onPress={() => router.back()}><LocalizedText style={{ color: colors.textSecondary, fontFamily: 'Cairo-Bold' }}>رجوع</LocalizedText></TouchableOpacity></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 28 }, title: { fontFamily: 'Cairo-Black', fontSize: 21, textAlign: 'center' }, primary: { minWidth: '100%', alignItems: 'center', borderRadius: 14, paddingVertical: 15 }, primaryText: { color: '#fff', fontFamily: 'Cairo-Bold' } });
