// @ts-nocheck
// app/health/wearables.tsx — real /wearables API (compat): devices register + metric samples
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, IconButton } from '../../src/components/ui';

import { apiFetch } from '../../src/utils/api';
import { dateLocale } from '@/utils/dates';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const SUPPORTED_DEVICES = [
  { name: 'Apple Watch', icon: 'watch', color: '#23B5CE' },
  { name: 'Samsung Galaxy Watch', icon: 'watch', color: '#1428A0' },
  { name: 'Fitbit', icon: 'watch', color: '#00B0B9' },
  { name: 'Garmin', icon: 'watch', color: '#007AC1' },
  { name: 'Xiaomi Mi Band', icon: 'watch', color: '#FF6900' },
  { name: 'Huawei Watch', icon: 'watch', color: '#CF0A2C' },
];

const METRIC_AR: Record<string, string> = {
  steps: 'الخطوات', calories: 'السعرات', sleep: 'النوم', heart_rate: 'نبض القلب',
  weight: 'الوزن', blood_pressure: 'ضغط الدم', oxygen: 'الأكسجين',
};
const METRIC_ICON: Record<string, string> = {
  steps: 'walk', calories: 'flash', sleep: 'sleep', heart_rate: 'heartPulse',
  weight: 'weight', blood_pressure: 'monitor_heart', oxygen: 'pulse',
};

export default function WearablesScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [devices, setDevices] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);

  async function load() {
    try {
      const [devRes, dataRes] = await Promise.all([
        apiFetch('/wearables/devices').catch(() => null),
        apiFetch('/wearables/data').catch(() => null),
      ]);
      setDevices(Array.isArray(devRes) ? devRes : devRes?.data || []);
      setSamples(Array.isArray(dataRes) ? dataRes : dataRes?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  const registerDevice = async (name: string) => {
    setRegistering(name);
    try {
      await apiFetch('/wearables/devices', {
        method: 'POST',
        body: JSON.stringify({ kind: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name }),
      });
      await load();
      showLocalizedAlert('تم الربط', `تم تسجيل ${name} كجهاز مرتبط بحسابك`);
    } catch (err: any) {
      showLocalizedAlert('تعذّر الربط', err?.message || 'فشل تسجيل الجهاز');
    } finally {
      setRegistering(null);
    }
  };

  const activeDevice = devices[0] || null;

  // Latest sample per metric — real data only
  const latestByMetric: Record<string, any> = {};
  for (const s of samples) {
    if (!s?.metric) continue;
    if (!latestByMetric[s.metric] || new Date(s.recorded_at) > new Date(latestByMetric[s.metric].recorded_at)) {
      latestByMetric[s.metric] = s;
    }
  }
  const metricEntries = Object.entries(latestByMetric);

  const fmtDate = (d: any) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' }); } catch { return ''; }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="sleep" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/health/sleep-tracker')} />
          <AppText variant="h3" color={colors.textPrimary}>الأجهزة الذكية</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
        {activeDevice && (
          <Card style={{ marginTop: 16, flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surface }}>
            <View style={[styles.connectedDot, { marginLeft: 8 }]} />
            <AppText variant="bodySM" style={{ flex: 1 }}>{activeDevice.name || activeDevice.kind} • مرتبط</AppText>
          </Card>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}

        {/* Latest metrics — only when real samples exist */}
        {!loading && metricEntries.length > 0 && (
          <View style={[styles.todayCard, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16, marginTop: 16 } ]}>
            <View style={styles.todayHeader}>
              <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="analytics" size={16} color={colors.primary} /><AppText variant="h6">آخر القراءات</AppText></View>
            </View>
            <View style={styles.statsGrid}>
              {metricEntries.map(([metric, s]: [string, any]) => (
                <View key={metric} style={[styles.statCard, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary } ]}>
                  <Icon name={METRIC_ICON[metric] || 'pulse'} size={24} color={colors.primary} />
                  <AppText variant="bodySM">{s.value}{s.unit ? ` ${s.unit}` : ''}</AppText>
                  <AppText variant="bodySM">{METRIC_AR[metric] || metric}</AppText>
                  <AppText variant="caption" color={colors.textTertiary}>{fmtDate(s.recorded_at)}</AppText>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* My Devices */}
        <View style={styles.section}>
          <AppText variant="bodySM" style={{ marginHorizontal: 16 }}>أجهزتي</AppText>
          {!loading && devices.length === 0 && (
            <View style={{ alignItems: 'center', padding: 20, gap: 6 }}>
              <Icon name="watch" size={36} color={colors.textTertiary} />
              <AppText variant="bodySM" color={colors.textSecondary}>لا توجد أجهزة مرتبطة — اختر جهازاً من القائمة أدناه لربطه</AppText>
            </View>
          )}
          {devices.map(device => (
            <View key={device.id} style={[styles.deviceCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
              <View style={styles.deviceInfo}>
                <AppText variant="bodySM">{device.name || device.kind}</AppText>
                <View style={[styles.deviceStatus, { backgroundColor: '#DCFCE7' } ]}>
                  <View style={[styles.statusDot, { backgroundColor: '#5BA84F' }]} />
                  <AppText variant="bodySM">مرتبط</AppText>
                </View>
                {!!device.connected_at && (
                  <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}>
                    <Icon name="refresh" size={16} color={colors.primary} />
                    <AppText variant="bodySM">منذ {fmtDate(device.connected_at)}</AppText>
                  </View>
                )}
              </View>
              <View style={[styles.deviceEmoji, { backgroundColor: colors.primary + '18' } ]}>
                <Icon name="watch" size={28} color={colors.primary} />
              </View>
            </View>
          ))}
        </View>

        {/* Supported Devices — tap to register */}
        <View style={[styles.supportedCard, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16 } ]}>
          <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6,marginBottom:10}}><Icon name="watch" size={18} color="#23B5CE" /><AppText variant="h6">ربط جهاز جديد</AppText></View>
          <View style={styles.supportedGrid}>
            {SUPPORTED_DEVICES.map((d, i) => {
              const already = devices.some((x) => x.name === d.name);
              return (
                <TouchableOpacity
                  key={i}
                  disabled={already || registering !== null}
                  onPress={() => registerDevice(d.name)}
                  style={[styles.supportedItem, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary, opacity: already ? 0.45 : 1 }]}
                >
                  {registering === d.name ? (
                    <ActivityIndicator size="small" color={d.color} />
                  ) : (
                    <Icon name={d.icon} size={24} color={d.color} />
                  )}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <AppText variant="bodySM">{d.name}</AppText>
                    {already ? <Icon name="check" size={14} color={colors.success} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  connectedBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  connectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#5BA84F' },
  connectedText: { flex: 1, color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '700' },
  batteryText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '400' },
  todayCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  todayHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  todayTitle: { fontSize: 15, fontWeight: '800' },
  syncTime: { fontSize: 11, fontWeight: '400' },
  statsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 24 },
  statNum: { fontSize: 22, fontFamily: 'Cairo-ExtraBold' },
  statLabel: { fontSize: 10, fontWeight: '400' },
  statBar: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 2 },
  statGoal: { fontSize: 9, fontWeight: '400' },
  section: { marginTop: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', textAlign: 'right', marginBottom: 10 },
  deviceCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 18, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  deviceEmoji: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  deviceInfo: { flex: 1, alignItems: 'flex-end', gap: 6 },
  deviceName: { fontSize: 14, fontWeight: '800' },
  deviceStatus: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  deviceStatusText: { fontSize: 11, fontWeight: '700' },
  lastSync: { fontSize: 10, fontWeight: '400' },
  deviceActions: {},
  connectBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  connectText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  disconnectBtn: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6 },
  disconnectText: { fontSize: 11, fontWeight: '700' },
  supportedCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  supportedGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  supportedItem: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  supportedName: { fontSize: 11, fontWeight: '400' },
});
