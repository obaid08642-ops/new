// @ts-nocheck
// app/health/wearables.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

import { apiFetch } from '../../src/utils/api';

const SUPPORTED_DEVICES = [
  { name: 'Apple Watch', icon: 'watch', color: '#23B5CE' },
  { name: 'Samsung Galaxy Watch', icon: 'watch', color: '#1428A0' },
  { name: 'Fitbit', icon: 'watch', color: '#00B0B9' },
  { name: 'Garmin', icon: 'watch', color: '#007AC1' },
  { name: 'Xiaomi Mi Band', icon: 'watch', color: '#FF6900' },
  { name: 'Huawei Watch', icon: 'watch', color: '#CF0A2C' },
];

// Connected data fetched from API

export default function WearablesScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  const [devices, setDevices] = useState<any[]>([]);
  const [connectedData, setConnectedData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const [devRes, dataRes] = await Promise.all([
          apiFetch('/health/wearables/devices').catch(() => null),
          apiFetch('/health/wearables/data').catch(() => null),
        ]);
        setDevices(Array.isArray(devRes) ? devRes : devRes?.data || []);
        setConnectedData(dataRes || {});
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeDevice = devices.find(d => d.connected) || devices[0] || {};

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="bed" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/health/sleep-tracker')} />
          <AppText variant="h3" color={colors.textPrimary}>الأجهزة الذكية</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
        <Card style={{ marginTop: 16, flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: colors.surface }}>
          <View style={[styles.connectedDot, { marginLeft: 8 }]} />
          <AppText variant="bodySM" style={{ flex: 1 }}>{activeDevice.name} • متصل</AppText>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <Icon name="flash" size={16} color={colors.primary} />
            <AppText variant="bodySM">{activeDevice.battery}%</AppText>
          </View>
        </Card>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Today's Summary */}
        <View style={[styles.todayCard, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16, marginTop: 16 } ]}>
          <View style={styles.todayHeader}>
            <AppText variant="bodySM">آخر مزامنة: {activeDevice.lastSync}</AppText>
            <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="analytics" size={16} color={colors.primary} /><AppText variant="h6">ملخص اليوم</AppText></View>
          </View>
          <View style={styles.statsGrid}>
            {Object.entries(connectedData).map(([key, data]: [string, any]) => {
              const pct = 'today' in data && 'goal' in data ? (data.today / data.goal) * 100 : 0;
              return (
                <View key={key} style={[styles.statCard, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary } ]}>
                  <Icon name={key === 'steps' ? 'directions_walk' : key === 'calories' ? 'local_fire_department' : key === 'sleep' ? 'hotel' : 'favorite'} size={24} color={colors.primary} />
                  {'today' in data && (
                    <>
                      <AppText variant="bodySM">{data.today}</AppText>
                      <AppText variant="bodySM">{data.label}</AppText>
                      {'goal' in data && (
                        <>
                          <View style={[styles.statBar, { backgroundColor: colors.border } ]}>
                            <View style={[styles.statBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: pct >= 100 ? '#5BA84F' : colors.primary }]} />
                          </View>
                          <AppText variant="bodySM">{Math.round(pct)}% من الهدف</AppText>
                        </>
                      )}
                    </>
                  )}
                  {'current' in data && (
                    <>
                      <AppText variant="bodySM">{data.current}</AppText>
                      <AppText variant="bodySM">{data.label}</AppText>
                      <AppText variant="bodySM">{data.min} — {data.max}</AppText>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* My Devices */}
        <View style={styles.section}>
          <AppText variant="bodySM">أجهزتي</AppText>
          {devices.map(device => (
            <View key={device.id} style={[styles.deviceCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
              <View style={styles.deviceActions}>
                {device.connected ? (
                  <TouchableOpacity style={[styles.disconnectBtn, { borderColor: colors.error } ]}>
                    <AppText variant="bodySM">فصل</AppText>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.connectBtn, { backgroundColor: colors.primary } ]}>
                    <AppText variant="bodySM">ربط</AppText>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.deviceInfo}>
                <AppText variant="bodySM">{device.name}</AppText>
                <View style={[styles.deviceStatus, { backgroundColor: device.connected ? '#DCFCE7' : '#FEE2E2' } ]}>
                  <View style={[styles.statusDot, { backgroundColor: device.connected ? '#5BA84F' : '#F0695C' }]} />
                  <AppText variant="bodySM">
                    {device.connected ? 'متصل' : 'غير متصل'}
                  </AppText>
                </View>
                {device.connected && <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="refresh" size={16} color={colors.primary} /><AppText variant="bodySM">{device.lastSync}</AppText></View>}
              </View>
              <View style={[styles.deviceEmoji, { backgroundColor: device.color + '18' } ]}>
                <Icon name={device.icon} size={28} color={device.color} />
              </View>
            </View>
          ))}
        </View>

        {/* Supported Devices */}
        <View style={[styles.supportedCard, { backgroundColor: isDark ? colors.surface : colors.white, marginHorizontal: 16 } ]}>
          <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6,marginBottom:10}}><Icon name="devices_other" size={18} color="#23B5CE" /><AppText variant="h6">الأجهزة المدعومة</AppText></View>
          <View style={styles.supportedGrid}>
            {SUPPORTED_DEVICES.map((d, i) => (
              <View key={i} style={[styles.supportedItem, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary } ]}>
                <Icon name={d.icon} size={24} color={d.color} />
                <AppText variant="bodySM">{d.name}</AppText>
              </View>
            ))}
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
