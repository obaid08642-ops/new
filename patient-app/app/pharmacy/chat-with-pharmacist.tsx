import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { lightColors, darkColors } from '../../src/theme/colors';
import { LocalizedText } from '../../src/components/LocalizedText';

export default function LegacyPharmacistChatRoute() {
  const insets = useSafeAreaInsets(); const { isDark } = useApp() as any; const colors = isDark ? darkColors : lightColors; const { orderId } = useLocalSearchParams<{ orderId: string }>(); const id = Array.isArray(orderId) ? orderId[0] : orderId;
  useEffect(() => { if (id) router.replace({ pathname: '/pharmacy/pharmacist-chat', params: { orderId: id } }); }, [id]);
  return <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + 24 }]}>{id ? <><ActivityIndicator color={colors.p} /><LocalizedText style={{ color: colors.t2 }}>فتح تفاوض الصيدلية…</LocalizedText></> : <><LocalizedText style={[styles.title, { color: colors.n }]}>يلزم رقم طلب الصيدلية</LocalizedText><LocalizedText style={{ color: colors.t2, textAlign: 'center' }}>تفتح المحادثة فقط من طلب صيدلية مختار وفي سياق تفاوض حاكم.</LocalizedText></>}</View>;
}
const styles = StyleSheet.create({ container: { flex: 1, gap: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }, title: { fontFamily: 'Cairo-Bold', fontSize: 18, textAlign: 'center' } });
