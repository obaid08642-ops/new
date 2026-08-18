// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

export default function ResultsHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<any[]>('/labs/bookings/mine');
      // Filter only reported or bookings with reports
      const reported = (data || []).filter(
        b => b.state === 'REPORTED' || (b.reports && b.reports.length > 0)
      );
      setResults(reported);
    } catch (err) {
      console.log('Error loading results history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight, borderBottomWidth: 1 } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4">نتائج التحاليل</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : results.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <Icon name="document" size={48} color={colors.textTertiary} />
          <AppText variant="h5" color={colors.textSecondary}>لا توجد نتائج تحاليل سابقة</AppText>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const hasReport = item.reports && item.reports.length > 0;
            const report = hasReport ? item.reports[0] : null;
            const title = item.items?.map((i: any) => i.name_ar).join(' + ') || 'تحاليل مخبرية';
            const labName = item.provider_name || 'مختبر معتمد';
            const dateStr = new Date(item.scheduled_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
            
            return (
              <TouchableOpacity
                style={[styles.resultCard, { backgroundColor: colors.surface }]}
                activeOpacity={0.85}
                onPress={() => hasReport && router.push({ pathname: '/reports/view-report', params: { reportId: report.id || item.id, url: report.url || report.url_base64, name: report.name } })}
              >
                <View style={styles.resultLeft}>
                  {hasReport ? (
                    <View style={[styles.pdfBtn, { backgroundColor: '#EEF2FF' } ]}>
                      <Icon name="document" size={16} color="#6366F1" />
                      <AppText variant="caption" color="#6366F1" style={{ fontWeight: 'bold' }}>PDF</AppText>
                    </View>
                  ) : (
                    <View style={[styles.pendingBadge, { backgroundColor: '#FEF3C7' } ]}>
                      <AppText variant="caption" color="#D97706">قيد التحضير</AppText>
                    </View>
                  )}
                </View>
                <View style={styles.resultInfo}>
                  <View style={styles.resultNameRow}>
                    {item.has_alert && (
                      <View style={[styles.alertDot, { backgroundColor: '#F0695C' }]} />
                    )}
                    <AppText variant="h6">{title}</AppText>
                  </View>
                  <AppText variant="caption" color={colors.textSecondary}>{labName}</AppText>
                  <AppText variant="caption" color={colors.textTertiary}>{dateStr}</AppText>
                  {item.has_alert && (
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Icon name="warning" size={14} color="#F0695C" />
                      <AppText variant="caption" color="#F0695C">قيمة خارج المعدل الطبيعي</AppText>
                    </View>
                  )}
                </View>
                <View style={[styles.resultEmoji, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary } ]}>
                  <Icon name="science" size={24} color={colors.primary} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  resultCard: { borderRadius: 18, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  resultEmoji: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  resultInfo: { flex: 1, alignItems: 'flex-end', gap: 3 },
  resultNameRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  alertDot: { width: 8, height: 8, borderRadius: 4 },
  resultLeft: { alignItems: 'center' },
  pdfBtn: { borderRadius: 10, padding: 8, alignItems: 'center', gap: 2, flexDirection: 'row-reverse' },
  pendingBadge: { borderRadius: 10, padding: 8, alignItems: 'center' },
});
