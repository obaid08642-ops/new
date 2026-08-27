// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { dateLocale } from '@/utils/dates';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

// Challenges will be loaded from API
export default function LoyaltyChallengesScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinedList, setJoinedList] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/loyalty/challenges');
      const list = Array.isArray(res) ? res : res?.data || [];
      setChallenges(list);

      // Joined state comes from the server (persisted progress record)
      const joined: Record<string, boolean> = {};
      list.forEach((c: any) => {
        if (c.joined || c.user_progress > 0 || c.completed) {
          joined[c.id] = true;
        }
      });
      setJoinedList(joined);
    } catch (err) {
      console.error(err);
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  const joinChallenge = async (id: string) => {
    try {
      await apiFetch(`/loyalty/challenges/${id}/join`, { method: 'POST' });
      setJoinedList(prev => ({ ...prev, [id]: true }));
    } catch (err) {
      console.error(err);
      showLocalizedAlert('خطأ', 'تعذر الانضمام إلى التحدي، حاول لاحقاً');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } ]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <AppText variant="bodySM">التحديات الصحية</AppText>
          <View style={{ width: 36 }}/>
        </View>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <AppText variant="bodySM" style={styles.statNum}>{challenges.filter(c => joinedList[c.id]).length}</AppText>
            <AppText variant="bodySM" style={styles.statLabel}>منضم</AppText>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statItem}>
            <AppText variant="bodySM" style={styles.statNum}>{challenges.filter(c => c.completed).length}</AppText>
            <AppText variant="bodySM" style={styles.statLabel}>مكتمل</AppText>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statItem}>
            <AppText variant="bodySM" style={styles.statNum}>
              {challenges.reduce((sum, c) => sum + (c.completed ? c.reward_points : 0), 0)}
            </AppText>
            <AppText variant="bodySM" style={styles.statLabel}>نقطة مكتسبة</AppText>
          </View>
        </View>
      </View>

      <FlatList
        data={challenges}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const joined = joinedList[item.id] || false;
          const total = item.target_count || 7;
          const progress = item.user_progress || 0;
          const pct = Math.min(100, Math.round((progress / total) * 100));
          const color = item.color || '#EC4899';
          
          return (
            <View style={[styles.challengeCard, { backgroundColor: isDark ? colors.surface : colors.white, borderWidth: joined ? 1.5 : 0, borderColor: color + '40' } ]}>
              <View style={styles.challengeHeader}>
                <View style={styles.challengeLeft}>
                  <View style={[styles.rewardBadge, { backgroundColor: color + '20' } ]}>
                    <AppText variant="bodySM" style={[styles.rewardPts, { color } ]}>+{item.reward_points} </AppText>
                  </View>
                  {joined ? (
                    <View style={[styles.statusBadge, { backgroundColor: item.completed ? '#DCFCE7' : '#EBF3FF' } ]}>
                      <AppText variant="bodySM" style={[styles.status, { color: item.completed ? '#166534' : '#1D4ED8' } ]}>
                        {item.completed ? 'مكتمل' : 'جارٍ'}
                      </AppText>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => joinChallenge(item.id)} style={[styles.joinBtn, { backgroundColor: color } ]}>
                      <AppText variant="bodySM" style={styles.joinBtnAlt}>انضم</AppText>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.challengeRight}>
                  <View style={[styles.challengeIconWrap, { backgroundColor: color + '18' } ]}>
                    <Icon name={item.icon || 'run'} size={24} color={color} />
                  </View>
                  <View style={styles.challengeInfo}>
                    <AppText variant="bodySM" style={styles.challengeTitle}>{item.title}</AppText>
                    <AppText variant="bodySM" style={styles.challengeDesc}>{item.desc}</AppText>
                    <AppText variant="bodySM" style={[styles.challengeEnd, { color: colors.textTertiary } ]}>
                      ينتهي {item.end_date ? new Date(item.end_date).toLocaleDateString(dateLocale()) : '30 يونيو'}
                    </AppText>
                  </View>
                </View>
              </View>

              {joined && (
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <AppText variant="bodySM" style={styles.progressPct}>{pct}%</AppText>
                    <AppText variant="bodySM" style={styles.progressFraction}>{progress}/{total}</AppText>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: colors.border } ]}>
                    <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                </View>
              )}
            </View>
          );
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  stats: { flexDirection: 'row-reverse', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 12 },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  statNum: { color: '#fff', fontSize: 18, fontFamily: 'Cairo-ExtraBold' } as any,
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '400' } as any,
  challengeCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2, gap: 12 },
  challengeHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
  challengeRight: { flexDirection: 'row-reverse', gap: 10, flex: 1 },
  challengeIconWrap: { width: 48, height: 48, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  challengeInfo: { flex: 1, alignItems: 'flex-end', gap: 3 },
  challengeTitle: { fontSize: 14, fontWeight: '800' } as any,
  challengeDesc: { fontSize: 12, fontWeight: '400', textAlign: 'right', lineHeight: 18 } as any,
  challengeEnd: { fontSize: 10, fontWeight: '400' } as any,
  challengeLeft: { alignItems: 'center', gap: 6 },
  rewardBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  rewardPts: { fontSize: 11, fontWeight: '800' } as any,
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  status: { fontSize: 10, fontWeight: '700' } as any,
  joinBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  joinBtnAlt: { color: '#fff', fontSize: 12, fontWeight: '800' } as any,
  progressSection: { gap: 4 },
  progressHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  progressPct: { fontSize: 12, fontWeight: '800' } as any,
  progressFraction: { fontSize: 11, fontWeight: '400' } as any,
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
});
