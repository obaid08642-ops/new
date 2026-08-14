// @ts-nocheck
// app/health/reports.tsx
import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { useGuestGuard } from '../../src/hooks/useGuestGuard';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

import { apiFetch } from '../../src/utils/api';

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const { isGuest, requireAuth } = useGuestGuard();
  if (isGuest) { requireAuth(); return null; }
  
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/health/reports');
        setReports(Array.isArray(res) ? res : res?.data || []);
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
      <StatusBar barStyle="light-content" />
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="share" bg={colors.surfaceSecondary} color={colors.textPrimary} />
          <AppText variant="h3" color={colors.textPrimary}>تقاريري الصحية</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      <FlatList
        data={reports}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.reportCard, { backgroundColor: isDark ? colors.surface : colors.white }]} activeOpacity={0.85}>
            <View style={styles.reportHeader}>
              <View style={styles.reportActions}>
                <TouchableOpacity style={[styles.pdfBtn, { backgroundColor: '#EEF2FF' } ]}>
                  <Icon name="document" size={14} color="#6366F1" />
                  <AppText variant="bodySM">PDF</AppText>
                </TouchableOpacity>
              </View>
              <View style={styles.reportInfo}>
                <AppText variant="bodySM">{item.title}</AppText>
                <AppText variant="bodySM">{item.date}</AppText>
              </View>
              <View style={[styles.reportEmoji, { backgroundColor: isDark ? colors.background : '#EEF2FF' } ]}>
                <Icon name={item.icon} size={24} color={colors.primary} />
              </View>
            </View>
            {item.score && (
              <View style={[styles.scoreBadge, { backgroundColor: item.score >= 85 ? '#DCFCE7' : '#FEF3C7' }]}>
                <AppText variant="bodySM">
                  درجة الصحة: {item.score}/100
                </AppText>
              </View>
            )}
            <View style={[styles.highlights, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary } ]}>
              {item.highlights.map((h, i) => (
                <AppText variant="bodySM">• {h}</AppText>
              ))}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  reportCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 10 },
  reportHeader: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  reportEmoji: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  reportInfo: { flex: 1, alignItems: 'flex-end', gap: 3 },
  reportTitle: { fontSize: 14, fontWeight: '800' },
  reportDate: { fontSize: 11, fontWeight: '400' },
  reportActions: {},
  pdfBtn: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  pdfText: { color: '#6366F1', fontSize: 10, fontWeight: '800' },
  scoreBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-end' },
  highlights: { borderRadius: 12, padding: 10, gap: 3 },
  highlight: { fontSize: 12, fontWeight: '400', textAlign: 'right' },
});
