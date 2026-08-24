// @ts-nocheck
// app/health/prescriptions.tsx
import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, StatusBar, Share } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { useGuestGuard } from '../../src/hooks/useGuestGuard';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

// Prescriptions fetched from API

export default function PrescriptionsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  // Guests CAN view prescriptions — device-bound guest account.
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/health/prescriptions');
        setPrescriptions(Array.isArray(res) ? res : res?.data || []);
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="camera" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/pharmacy/rx-order')} />
          <AppText variant="h3" color={colors.textPrimary}>الوصفات الطبية</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <Card style={{ flexDirection: 'row-reverse', backgroundColor: colors.surface }}>
          {[{ num: prescriptions.length.toString(), label: 'وصفة' }, { num: prescriptions.reduce((acc, p) => acc + (p.medications?.length || 0), 0).toString(), label: 'دواء' }, { num: prescriptions.filter(p => !p.isPurchased).length.toString(), label: 'معلقة' }].map((s, i) => (
            <View key={i} style={[styles.statItem, i > 0 && { borderRightWidth: 1, borderColor: colors.borderLight }]}>
              <AppText variant="h4" color={colors.primary}>{s.num}</AppText>
              <AppText variant="caption" color={colors.textSecondary}>{s.label}</AppText>
            </View>
          ))}
        </Card>
      </View>

      <FlatList
        data={prescriptions}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.rxCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
            <View style={styles.rxHeader}>
              <View style={styles.rxActions}>
                {!item.isPurchased && (
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/pharmacy')}
                    style={[styles.orderBtn, { backgroundColor: '#5BA84F' } ]}>
                    <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="shopping_cart" size={16} color={colors.primary} /><AppText variant="bodySM">اطلب</AppText></View>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.shareBtn, { backgroundColor: colors.primarySurface }]}
                  onPress={() => {
                    const meds = (item.medications || []).map((m: any) => `- ${m.name || m}${m.dose ? ` (${m.dose})` : ''}`).join('\n');
                    Share.share({
                      message: `وصفة طبية — ${item.doctorName || 'طبيب نبض'}\nالتاريخ: ${item.date || '—'}\n\nالأدوية:\n${meds || '—'}`,
                    }).catch(() => {});
                  }}
                >
                  <Icon name="share" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.rxDoctorInfo}>
                <AppText variant="bodySM">{item.doctorName}</AppText>
                <AppText variant="bodySM">{item.date}</AppText>
                {item.isOcr && (
                  <View style={[styles.ocrBadge, { backgroundColor: '#EEF2FF' } ]}>
                    <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="robot" size={16} color={colors.primary} /><AppText variant="bodySM">قُرئت بـ AI — دقة {item.ocrAccuracy}%</AppText></View>
                  </View>
                )}
              </View>
              <View style={[styles.docAva, { backgroundColor: '#EEF2FF' } ]}>
                <Icon name={item.icon} size={24} color="#6366F1" />
              </View>
            </View>

            <View style={[styles.medsList, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary } ]}>
              {item.medications?.map((med: string, i: number) => (
                <AppText key={i} variant="bodySM">• {med}</AppText>
              ))}
            </View>

            {item.isPurchased && (
              <View style={[styles.purchasedBadge, { backgroundColor: '#DCFCE7' } ]}>
                <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="check_circle" size={16} color={colors.primary} /><AppText variant="bodySM">تم الشراء</AppText></View>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerStats: { flexDirection: 'row-reverse', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 12 },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statBorder: { borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  statNum: { color: '#fff', fontSize: 20, fontFamily: 'Cairo-ExtraBold' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '400' },
  rxCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 10 },
  rxHeader: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  docAva: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  rxDoctorInfo: { flex: 1, alignItems: 'flex-end', gap: 3 },
  rxDoctor: { fontSize: 14, fontWeight: '800' },
  rxDate: { fontSize: 11, fontWeight: '400' },
  ocrBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  ocrText: { color: '#6366F1', fontSize: 10, fontWeight: '700' },
  rxActions: { alignItems: 'center', gap: 6 },
  orderBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  orderBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  shareBtn: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  medsList: { borderRadius: 12, padding: 10, gap: 4 },
  medItem: { fontSize: 12, fontWeight: '400', textAlign: 'right', lineHeight: 20 },
  purchasedBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-end' },
  purchasedText: { color: '#16A34A', fontSize: 11, fontWeight: '700' },
});
