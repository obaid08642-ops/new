// @ts-nocheck
// app/emergency/tracking.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

export default function AmbulanceTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [eta, setEta] = useState<number | null>(null);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    const fetchTracking = async () => {
      try {
        const res = await apiFetch('/emergency/tracking');
        const data = Array.isArray(res) ? res[0] : res?.data || res;
        if (data) {
          setTrackingData(data);
          setEta(data.eta_minutes || data.eta || 0);
        }
      } catch (e) {
        console.log('Error fetching tracking', e);
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();
    const interval = setInterval(fetchTracking, 10000);
    return () => clearInterval(interval);
  }, []);

  const STEPS = trackingData?.steps || [
    { title: 'تم استلام النداء', done: true, icon: 'check_circle' },
    { title: 'سيارة الإسعاف في الطريق', done: false, current: true, icon: 'emergency' },
    { title: 'الوصول إلى موقعك', done: false, icon: 'location' },
    { title: 'نقل المريض', done: false, icon: 'hospital' },
  ];

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject} />
      <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
          <Icon name="back" size={22} color="#fff" />
        </TouchableOpacity>
        <AppText variant="bodySM">تتبع سيارة الإسعاف</AppText>
        <View style={{ width: 36 }}/>
      </View>

      <View style={styles.etaSection}>
        <Animated.View style={[styles.etaCircle, { transform: [{ scale: pulseAnim }] }]}>
          <AppText variant="bodySM">{eta ?? '-'}</AppText>
          <AppText variant="bodySM">دقيقة</AppText>
        </Animated.View>
        <AppText variant="bodySM">وقت الوصول المتوقع</AppText>
        <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="emergency" size={16} color={colors.primary} /><AppText variant="bodySM">{trackingData?.vehicle_id || 'جاري التخصيص'}</AppText></View>
      </View>

      {/* Map placeholder */}
      <View style={styles.mapPlaceholder}>
        <View style={StyleSheet.absoluteFillObject} />
        <Icon name="map" size={20} color={colors.primary} />
        <AppText variant="bodySM">{trackingData?.location_text || 'جاري تتبع المركبة...'}</AppText>
        <AppText variant="bodySM">{trackingData?.distance ? `${trackingData.distance} كم عنك` : ''}</AppText>
      </View>

      {/* Steps */}
      <View style={[styles.stepsCard, { paddingBottom: insets.bottom + 12 } ]}>
        {STEPS.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            {i < STEPS.length - 1 && (
              <View style={[styles.stepLine, { backgroundColor: step.done ? '#F0695C' : 'rgba(255,255,255,0.2)' }]} />
            )}
            <View style={[styles.stepIcon, {
              backgroundColor: step.done ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)',
              borderWidth: step.current ? 2 : 0, borderColor: '#fff',
            } ]}>
              <AppText variant="bodySM">{step.icon}</AppText>
            </View>
            <AppText variant="bodySM">
              {step.title}
            </AppText>
          </View>
        ))}
        <TouchableOpacity style={styles.callBtn}>
          <Icon name="call" size={18} color="#F0695C" />
          <AppText variant="bodySM">اتصل بالإسعاف</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  title: { color: '#fff', fontSize: 17, fontWeight: '800' },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  etaSection: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  etaCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  etaNum: { color: '#fff', fontSize: 32, fontFamily: 'Cairo-ExtraBold' },
  etaUnit: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '400' },
  etaLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' },
  ambulanceNum: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '400' },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, marginHorizontal: 16, borderRadius: 20, overflow: 'hidden' },
  mapText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '700' },
  mapDist: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '400' },
  stepsCard: { backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 20, paddingTop: 16, gap: 0 },
  stepRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 10, position: 'relative' },
  stepLine: { position: 'absolute', right: 22, top: 42, width: 2, height: '60%' },
  stepIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  stepText: { color: '#fff', fontSize: 13, flex: 1, textAlign: 'right' },
  callBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: 'transparent', borderRadius: 14, height: 48, justifyContent: 'center', marginTop: 8 },
  callBtnText: { color: '#F0695C', fontSize: 15, fontWeight: '800' },
});
