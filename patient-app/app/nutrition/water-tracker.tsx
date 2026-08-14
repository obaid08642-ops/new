// @ts-nocheck
// app/nutrition/water-tracker.tsx — Connected to POST /nutrition/water & GET /nutrition/water
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

const SIZES = [
  { label: 'كوب صغير', ml: 150, emoji: '' },
  { label: 'كوب عادي', ml: 250, emoji: '' },
  { label: 'قنينة 500', ml: 500, emoji: '' },
  { label: 'قنينة كبيرة', ml: 750, emoji: '' },
];

interface WaterLog { amount_ml: number; logged_at: string }
interface WaterData { logs: WaterLog[]; total_ml: number; target_ml: number }

export default function WaterTrackerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [data, setData] = useState<WaterData>({ logs: [], total_ml: 0, target_ml: 2000 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<WaterData>(`/nutrition/water?date=${today}`);
      setData(res);
    } catch {
      setData({ logs: [], total_ml: 0, target_ml: 2000 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const addWater = async (size: typeof SIZES[0]) => {
    setSaving(true);
    try {
      await apiFetch('/nutrition/water', { method: 'POST', body: JSON.stringify({ amount_ml: size.ml }) });
      await load();
    } catch {
      Alert.alert('خطأ', 'تعذر تسجيل الماء. تأكد من اتصالك بالإنترنت.');
    } finally {
      setSaving(false);
    }
  };

  const totalMl = data.total_ml;
  const targetMl = data.target_ml;
  const glasses = Math.round(totalMl / 250);
  const goalGlasses = Math.round(targetMl / 250);
  const pct = Math.min((totalMl / targetMl) * 100, 100);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM">متابعة الماء</AppText>
          <View style={{ width: 36 }}/>
        </View>

        {/* Water level visualization */}
        <View style={styles.waterViz}>
          <View style={styles.glassContainer}>
            <View style={[styles.glassWater, { height: `${pct}%` as any }]} />
            <AppText variant="bodySM">{Math.round(pct)}%</AppText>
          </View>
          <View style={styles.waterStats}>
            <AppText variant="bodySM">{totalMl} مل</AppText>
            <AppText variant="bodySM">من {targetMl} مل</AppText>
            <AppText variant="bodySM">{glasses} / {goalGlasses} أكواب</AppText>
            {pct >= 100 && (
              <View style={styles.goalDone}>
                <AppText variant="bodySM"> وصلت الهدف!</AppText>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 80 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Add water buttons */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">أضف شُرب الآن </AppText>
          <View style={styles.sizesGrid}>
            {SIZES.map((size, i) => (
              <TouchableOpacity key={i} onPress={() => addWater(size)} disabled={saving}
                style={[styles.sizeBtn, { backgroundColor: isDark ? colors.background : '#DBEAFE', opacity: saving ? 0.6 : 1 } ]}>
                <AppText variant="bodySM">{size.emoji}</AppText>
                <AppText variant="bodySM">{size.label}</AppText>
                <AppText variant="bodySM">{size.ml} مل</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Daily log */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">سجل اليوم </AppText>
          {loading ? (
            <AppText variant="bodySM" color={colors.textTertiary}>جاري التحميل...</AppText>
          ) : data.logs.length === 0 ? (
            <AppText variant="bodySM" color={colors.textTertiary}>لم تشرب ماء بعد اليوم!</AppText>
          ) : (
            data.logs.slice().reverse().map((entry, i) => {
              const sizeInfo = SIZES.find(s => s.ml === entry.amount_ml) || { emoji: '' };
              return (
                <View key={i} style={[styles.logRow, { borderBottomColor: colors.border } ]}>
                  <AppText variant="bodySM">{entry.amount_ml} مل</AppText>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                    <Icon name="clock" size={16} color={colors.primary} />
                    <AppText variant="bodySM">{formatTime(entry.logged_at)}</AppText>
                  </View>
                  <AppText variant="bodySM">{sizeInfo.emoji}</AppText>
                </View>
              );
            })
          )}
        </View>

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: isDark ? colors.surface : '#EFF6FF' } ]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <Icon name="info" size={16} color={colors.primary} />
            <AppText variant="bodySM">نصائح لشرب الماء</AppText>
          </View>
          {['ابدأ يومك بكوب ماء فور الاستيقاظ', 'اشرب كوباً قبل كل وجبة', 'احمل قنينة ماء معك دائماً'].map((tip, i) => (
            <AppText key={i} variant="bodySM">• {tip}</AppText>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  waterViz: { flexDirection: 'row-reverse', alignItems: 'center', gap: 20 },
  glassContainer: { width: 80, height: 110, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden', position: 'relative', justifyContent: 'center', alignItems: 'center' },
  glassWater: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(147,197,253,0.7)', borderRadius: 10 },
  waterStats: { flex: 1, alignItems: 'flex-end', gap: 4 },
  goalDone: { backgroundColor: 'rgba(34,197,94,0.25)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  sizesGrid: { flexDirection: 'row-reverse', gap: 8, flexWrap: 'wrap' },
  sizeBtn: { flex: 1, minWidth: 70, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  logRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1 },
  tipsCard: { borderRadius: 16, padding: 14, gap: 8 },
});
