// @ts-nocheck
// app/payments/success.tsx
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

export default function PaymentSuccessScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  
  const params = useLocalSearchParams();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const serviceName = params.serviceName as string || 'الخدمة';
  const amount = params.amount as string || '';
  const refNumber = `PAY-${Date.now().toString().slice(-8)}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <View style={styles.heroSection}>
        <View style={styles.heroOrb1} />
        <View style={styles.heroOrb2} />
        <Animated.View style={[styles.successIcon, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          <Icon name="check_circle" size={20} color={colors.primary} />
        </Animated.View>
        <Animated.View style={{ opacity: opacityAnim, alignItems: 'center', gap: 6 }}>
          <AppText variant="bodySM">تم الدفع بنجاح!</AppText>
          {amount && <AppText variant="bodySM">{amount} ريال</AppText>}
          <AppText variant="bodySM">{serviceName}</AppText>
        </Animated.View>
      </View>

      <View style={[styles.detailsSection, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
        {[
          { label: 'رقم المرجع', val: refNumber },
          { label: 'التاريخ والوقت', val: new Date().toLocaleString('ar-SA') },
          { label: 'طريقة الدفع', val: params.method as string || 'فيزا •••• 4521' },
          { label: 'الحالة', val: 'ناجح' },
        ].map((r, i) => (
          <View key={i} style={[styles.detailRow, { borderBottomColor: colors.border } ]}>
            <AppText variant="bodySM">{r.val}</AppText>
            <AppText variant="bodySM">{r.label}</AppText>
          </View>
        ))}
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 8 } ]}>
        <TouchableOpacity style={[styles.receiptBtn, { borderColor: colors.border } ]}>
          <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="document" size={16} color={colors.primary} /><AppText variant="bodySM">تحميل الإيصال</AppText></View>
        </TouchableOpacity>
        {params.visitType && (
          <TouchableOpacity onPress={() => {
            const vt = params.visitType as string;
            if (vt === 'clinic') router.push('/consultations/clinic-location');
            else if (vt === 'home') router.push('/consultations/home-visit-tracking');
            else router.push({ pathname: '/consultations/booking-success', params: { visitType: vt } });
          }}
          style={{ borderRadius: 16, overflow: 'hidden' }}>
            <View style={styles.homeBtn}>
              <AppText variant="bodySM" color="#fff">{params.visitType === 'clinic' ? 'عرض موقع العيادة' : params.visitType === 'home' ? 'تتبع الطبيب' : 'غرفة الانتظار'}</AppText>
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ borderRadius: 16, overflow: 'hidden' }}>
          <View style={styles.homeBtn}>
            <AppText variant="bodySM" color="#fff">العودة للرئيسية</AppText>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroSection: { paddingTop: 80, paddingBottom: 40, alignItems: 'center', gap: 12, overflow: 'hidden', position: 'relative' },
  heroOrb1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)', top: -60, right: -40 },
  heroOrb2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(34,197,94,0.15)', bottom: -20, left: -30 },
  successIcon: { width: 110, height: 110, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  successTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
  successAmount: { color: '#fff', fontSize: 36, fontFamily: 'Cairo-ExtraBold' },
  successSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '400' },
  detailsSection: { margin: 16, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  detailRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1 },
  detailLabel: { fontSize: 13, fontWeight: '400' },
  detailVal: { fontSize: 13, fontWeight: '700' },
  actions: { paddingHorizontal: 16, gap: 10, marginTop: 4 },
  receiptBtn: { borderRadius: 14, borderWidth: 1.5, height: 48, justifyContent: 'center', alignItems: 'center' },
  receiptBtnText: { fontSize: 14, fontWeight: '700' },
  homeBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  homeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
