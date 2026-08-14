// @ts-nocheck
// app/health/chronic-disease.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, IconButton } from '../../src/components/ui';

import { apiFetch } from '../../src/utils/api';

export default function ChronicDiseaseScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [conditions, setConditions] = useState<any[]>([]);
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const [condRes, readRes] = await Promise.all([
          apiFetch('/health/chronic-diseases').catch(() => null),
          apiFetch('/health/vitals').catch(() => null),
        ]);
        setConditions(Array.isArray(condRes) ? condRes : condRes?.data || []);
        setReadings(Array.isArray(readRes) ? readRes : readRes?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="add" bg={colors.surfaceSecondary} color={colors.textPrimary} />
          <AppText variant="h3" color={colors.textPrimary}>الأمراض المزمنة</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* Stats Card */}
        <Card style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', padding: 16, backgroundColor: colors.surface }}>
          {[{ num: conditions.length.toString(), label: 'حالة' }, { num: conditions.filter(c => c.controlled).length.toString(), label: 'تحت السيطرة' }, { num: conditions.reduce((acc, c) => acc + (c.medications?.length || 0), 0).toString(), label: 'أدوية' }].map((s, i) => (
            <View key={i} style={{ alignItems: 'center', flex: 1, borderRightWidth: i > 0 ? 1 : 0, borderRightColor: colors.borderLight }}>
              <AppText variant="h4" color={colors.primary}>{s.num}</AppText>
              <AppText variant="caption" color={colors.textSecondary}>{s.label}</AppText>
            </View>
          ))}
        </Card>

        {conditions.map(cond => (
          <Card key={cond.id} style={{ backgroundColor: isDark ? colors.surface : colors.white, padding: 0, overflow: 'hidden' }}>
            <TouchableOpacity onPress={() => setExpandedId(expandedId === cond.id ? null : cond.id)} style={styles.condHeader}>
              <View style={styles.condHeaderLeft}>
                <View style={[styles.controlledBadge, { backgroundColor: cond.controlled ? '#DCFCE7' : '#FEE2E2', flexDirection: 'row-reverse' } ]}>
                  <Icon name={cond.controlled ? 'check-circle' : 'alert-circle'} size={14} color={cond.controlled ? '#16A34A' : '#DC2626'} />
                  <AppText variant="caption" color={cond.controlled ? '#16A34A' : '#DC2626'} style={{ marginRight: 4 }}>
                    {cond.controlled ? 'تحت السيطرة' : 'يحتاج متابعة'}
                  </AppText>
                </View>
                <Icon name={expandedId === cond.id ? 'chevronUp' : 'chevronDown'} size={20} color={colors.textTertiary} />
              </View>
              <View style={styles.condHeaderRight}>
                <View style={[styles.condIconWrap, { backgroundColor: cond.color + '18' } ]}>
                  <Icon name={cond.icon} size={24} color={cond.color} />
                </View>
                <View style={styles.condTitles}>
                  <AppText variant="h6">{cond.name}</AppText>
                  <AppText variant="caption" color={colors.textSecondary}>شدة {cond.severity}</AppText>
                </View>
              </View>
            </TouchableOpacity>

            {expandedId === cond.id && (
              <View style={[styles.condExpanded, { borderTopColor: colors.borderLight } ]}>
                {/* Details */}
                {[
                  { label: 'تشخيص في', val: cond.diagnosedDate },
                  { label: 'الطبيب المعالج', val: cond.doctor },
                  { label: 'آخر فحص', val: cond.lastCheckup },
                  { label: 'الفحص القادم', val: cond.nextCheckup },
                ].map((d, i) => (
                  <View key={i} style={[styles.detailRow, { borderBottomColor: colors.borderLight } ]}>
                    <AppText variant="bodySM" color={colors.textSecondary}>{d.val}</AppText>
                    <AppText variant="bodySM">{d.label}</AppText>
                  </View>
                ))}

                {/* Target */}
                {cond.targetHbA1c && (
                  <View style={[styles.targetRow, { backgroundColor: '#DCFCE7' } ]}>
                    <AppText variant="bodySM" color="#16A34A" style={{ fontWeight: 'bold' }}>{cond.currentHbA1c}</AppText>
                    <AppText variant="bodySM" color="#16A34A">HbA1c الحالي (الهدف: {cond.targetHbA1c})</AppText>
                  </View>
                )}

                {/* Medications */}
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginVertical: 12, gap: 6 }}>
                  <Icon name="medication" size={18} color={colors.primary} />
                  <AppText variant="h6">الأدوية</AppText>
                </View>
                <View style={styles.medsRow}>
                  {cond.medications?.map((med: string, i: number) => (
                    <View key={i} style={[styles.medTag, { backgroundColor: cond.color + '15' } ]}>
                      <AppText variant="caption" color={cond.color}>{med}</AppText>
                    </View>
                  ))}
                </View>

                {/* Tips */}
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginVertical: 12, gap: 6 }}>
                  <Icon name="lightbulb" size={18} color="#F0A526" />
                  <AppText variant="h6">نصائح الإدارة</AppText>
                </View>
                {cond.tips?.map((tip: string, i: number) => (
                  <View key={i} style={styles.tipRow}>
                    <AppText variant="bodySM" color={colors.textSecondary}>{tip}</AppText>
                    <Icon name="check" size={16} color={colors.primary} />
                  </View>
                ))}

                <TouchableOpacity onPress={() => router.push('/(tabs)/consultations')}
                  style={[styles.bookCheckBtn, { backgroundColor: cond.color } ]}>
                  <AppText variant="bodySM" color="#fff" style={{ fontWeight: 'bold' }}>احجز فحص دوري</AppText>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        ))}

        {/* Recent Readings */}
        <Card style={[{ backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 16, gap: 8 }}>
            <Icon name="analytics" size={20} color={colors.primary} />
            <AppText variant="h6">سجل القياسات الأخيرة</AppText>
          </View>
          {readings.map((r, i) => (
            <View key={i} style={[styles.readingRow, { borderBottomColor: colors.borderLight } ]}>
              <View style={[styles.notesBadge, { backgroundColor: isDark ? colors.background : '#EEF2FF' } ]}>
                <AppText variant="caption" color={colors.textSecondary}>{r.notes}</AppText>
              </View>
              <View style={styles.readingValues}>
                <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="monitor_heart" size={16} color={colors.primary} /><AppText variant="bodySM" color={colors.textPrimary}>{r.bp}</AppText></View>
                <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="bloodtype" size={16} color={colors.primary} /><AppText variant="bodySM" color={colors.textPrimary}>{r.glucose} mg/dL</AppText></View>
              </View>
              <AppText variant="caption" color={colors.textTertiary}>{r.date}</AppText>
            </View>
          ))}
          <TouchableOpacity onPress={() => router.push('/health/vitals')}
            style={[styles.addReadingBtn, { borderColor: colors.border } ]}>
            <Icon name="add" size={16} color={colors.primary} />
            <AppText variant="bodySM" color={colors.primary}>إضافة قراءة جديدة</AppText>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  condHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  condHeaderRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  condIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  condTitles: { alignItems: 'flex-end', gap: 2 },
  condHeaderLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  controlledBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignItems: 'center' },
  condExpanded: { padding: 16, borderTopWidth: 1, gap: 4 },
  detailRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  targetRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', padding: 12, borderRadius: 8, marginVertical: 8 },
  medsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  medTag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  tipRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 },
  bookCheckBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 24, alignItems: 'center' },
  readingRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  readingValues: { flex: 1, alignItems: 'flex-end', paddingRight: 16, gap: 4 },
  notesBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  addReadingBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 12, borderWidth: 1, borderRadius: 24, borderStyle: 'dashed' },
});
