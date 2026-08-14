// @ts-nocheck
// app/nursing/live-doctor-tracking.tsx
//  تتبع موقع الطبيب المنزلي لحظة بلحظة
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

export default function LiveDoctorTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  
  const [eta, setEta] = useState(12);
  const [status, setStatus] = useState<'coming'|'near'|'arrived'>('coming');

  useEffect(() => {
    const t = setInterval(() => {
      setEta(e => {
        const next = Math.max(0, e - 1);
        if (next <= 3) setStatus('near');
        if (next === 0) setStatus('arrived');
        return next;
      });
    }, 8000);
    return () => clearInterval(t);
  }, []);

  const statusColors = { coming: '#23B5CE', near: '#F0A526', arrived: '#5BA84F' };
  const statusTexts = { coming: 'في الطريق إليك', near: 'قريب جداً — استعد!', arrived: 'وصل إلى موقعك!' };

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM">تتبع الطبيب </AppText>
          <View style={{ width: 36 }}/>
        </View>
        <View style={[styles.statusBanner, { backgroundColor: statusColors[status] + '25', borderColor: statusColors[status] + '50' }]}>
          <AppText variant="bodySM">{statusTexts[status]}</AppText>
        </View>
      </View>

      {/* Map placeholder */}
      <View style={styles.mapArea}>
        <View style={StyleSheet.absoluteFillObject} />
        {/* Grid */}
        {[20, 40, 60, 80].map(p => (
          <View key={p} style={[styles.gridLine, { top: `${p}%`, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,102,204,0.05)' }]} />
        ))}
        {/* Route line */}
        <View style={styles.routeLine} />
        {/* My location */}
        <View style={styles.myLocation}>
          <View style={styles.myLocationDot} />
          <View style={[styles.myLocationRing, { borderColor: '#23B5CE40' }]} />
        </View>
        {/* Doctor location */}
        <View style={styles.doctorLocation}>
          <View style={[styles.doctorDot, { backgroundColor: statusColors[status] }]}>
            <Icon name="doctor" size={20} color={colors.primary} />
          </View>
          <View style={[styles.doctorLabel, { backgroundColor: statusColors[status] }]}>
            <AppText variant="bodySM">د. أحمد</AppText>
          </View>
        </View>
      </View>

      {/* Info Panel */}
      <View style={[styles.infoPanel, { backgroundColor: isDark ? colors.surface : colors.white, paddingBottom: insets.bottom + 12 } ]}>
        <View style={styles.doctorInfo}>
          <View style={styles.doctorInfoLeft}>
            <AppText variant="bodySM">اتصل بالطبيب</AppText>
            <TouchableOpacity style={[styles.callBtn, { backgroundColor: '#DCFCE7' } ]}>
              <Icon name="call" size={18} color="#5BA84F" />
            </TouchableOpacity>
          </View>
          <View style={styles.doctorInfoRight}>
            <AppText variant="bodySM">د. أحمد السيد</AppText>
            <AppText variant="bodySM">طبيب عام — تقييم 4.9 ⭐</AppText>
            <AppText variant="bodySM">زيارة منزلية — فحص دوري</AppText>
          </View>
          <View style={[styles.doctorAvatar, { backgroundColor: '#EBF3FF' } ]}>
            <Icon name="doctor" size={20} color={colors.primary} />
          </View>
        </View>

        <View style={[styles.etaRow, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary } ]}>
          {[
            { label: 'الوقت المتوقع', val: eta === 0 ? 'وصل' : `${eta} دقيقة`, color: statusColors[status] },
            { label: 'المسافة', val: `${(eta * 0.3).toFixed(1)} كم`, color: colors.textPrimary },
            { label: 'موعد الزيارة', val: '3:00 م', color: colors.textPrimary },
          ].map((s, i) => (
            <View key={i} style={[styles.etaStat, i > 0 && { borderRightWidth: 1, borderColor: colors.border } ]}>
              <AppText variant="bodySM">{s.val}</AppText>
              <AppText variant="bodySM">{s.label}</AppText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  statusBanner: { borderRadius: 12, padding: 10, borderWidth: 1, alignItems: 'center' },
  statusText: { fontSize: 14, fontWeight: '800' },
  mapArea: { flex: 1, position: 'relative', overflow: 'hidden' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1 },
  routeLine: { position: 'absolute', left: '45%', top: '35%', height: '30%', width: 3, backgroundColor: '#23B5CE40', borderRadius: 2 },
  myLocation: { position: 'absolute', left: '45%', bottom: '30%', justifyContent: 'center', alignItems: 'center' },
  myLocationDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#23B5CE', borderWidth: 3, borderColor: '#fff' },
  myLocationRing: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 2 },
  doctorLocation: { position: 'absolute', left: '42%', top: '30%', alignItems: 'center', gap: 4 },
  doctorDot: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  doctorLabel: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  doctorLabelText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  infoPanel: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingTop: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 12, gap: 12 },
  doctorInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  doctorAvatar: { width: 54, height: 54, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  doctorInfoRight: { flex: 1, alignItems: 'flex-end', gap: 2 },
  doctorName: { fontSize: 15, fontWeight: '800' },
  doctorSpec: { fontSize: 12, fontWeight: '400' },
  visitType: { fontSize: 11, fontWeight: '400' },
  doctorInfoLeft: { alignItems: 'center', gap: 6 },
  callBtn: { width: 40, height: 40, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  callText: { fontSize: 10, fontWeight: '700' },
  etaRow: { borderRadius: 16, padding: 12, flexDirection: 'row-reverse' },
  etaStat: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  etaVal: { fontSize: 15, fontFamily: 'Cairo-ExtraBold' },
  etaLabel: { fontSize: 9, fontWeight: '400' },
});
