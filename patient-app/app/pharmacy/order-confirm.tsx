import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { lightColors, darkColors } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';
import { LocalizedText } from '../../src/components/LocalizedText';

function routeFor(state: string, orderId: string) {
  if (state === 'OFFERS_READY' || state === 'ORDER_BROADCASTING') return { pathname: '/pharmacy/broadcast-status', params: { orderId } } as const;
  if (['OFFER_SELECTED', 'FINAL_QUOTE_READY', 'FINAL_QUOTE_ACCEPTED', 'COD_REGISTERED'].includes(state)) return { pathname: '/pharmacy/final-quote', params: { orderId } } as const;
  if (['INSURANCE_PROCESSING', 'INSURANCE_DECISION_READY'].includes(state)) return { pathname: '/pharmacy/insurance-decision', params: { orderId } } as const;
  return { pathname: '/pharmacy/order-tracking', params: { orderId } } as const;
}
export default function LegacyPharmacyOrderConfirmRoute() {
  const insets = useSafeAreaInsets(); const { isDark } = useApp() as any; const colors = isDark ? darkColors : lightColors; const { orderId } = useLocalSearchParams<{ orderId: string }>(); const id = Array.isArray(orderId) ? orderId[0] : orderId; const [error, setError] = useState('');
  const openGovernedStep = useCallback(async () => { if (!id) return; setError(''); try { const response: any = await apiFetch(`/patient/pharmacy/orders/${id}`); const order = response?.data || response; router.replace(routeFor(order?.governed_state, id)); } catch (reason: any) { setError(reason?.message || 'تعذر فتح حالة الطلب الحاكمة'); } }, [id]);
  useEffect(() => { void openGovernedStep(); }, [openGovernedStep]);
  return <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + 24 }]}>{!id ? <><LocalizedText style={[styles.title, { color: colors.n }]}>يلزم رقم طلب الصيدلية</LocalizedText><LocalizedText style={{ color: colors.t2, textAlign: 'center' }}>لا يمكن اعتماد سلة أو رفض سعر من هذا المسار الموروث.</LocalizedText></> : error ? <><LocalizedText style={[styles.title, { color: colors.n }]}>تعذر فتح خطوة الطلب</LocalizedText><LocalizedText style={{ color: colors.cr, textAlign: 'center' }}>{error}</LocalizedText><TouchableOpacity onPress={() => void openGovernedStep()} style={[styles.retry, { backgroundColor: colors.p }]}><LocalizedText style={styles.retryText}>تحديث يدوياً</LocalizedText></TouchableOpacity></> : <><ActivityIndicator color={colors.p} /><LocalizedText style={{ color: colors.t2 }}>فتح خطوة طلبك الحاكمة…</LocalizedText></>}</View>;
}
const styles = StyleSheet.create({ container: { flex: 1, gap: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }, title: { fontFamily: 'Cairo-Bold', fontSize: 18, textAlign: 'center' }, retry: { borderRadius: 12, paddingHorizontal: 22, paddingVertical: 13 }, retryText: { color: '#fff', fontFamily: 'Cairo-Bold' } });
