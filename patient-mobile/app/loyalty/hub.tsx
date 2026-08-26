// @ts-nocheck
// app/loyalty/hub.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Animated, StatusBar, ActivityIndicator, Alert
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { dateLocale } from '@/utils/dates';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const { width } = Dimensions.get('window');

// Pre-load placeholders only — /loyalty/config overwrites with the live table.
// Values mirror the backend POINTS_TABLE so nothing inflated is ever shown.
const DEFAULT_TIERS = [
  { id: 'bronze', label: 'برونزي', icon: 'emoji_events', color: '#CD7C3C', minPts: 0, maxPts: 1000, perks: ['5% كاشباك'] },
];

const DEFAULT_EARN_WAYS = [
  { action: 'استشارة طبية مكتملة', pts: '+50', icon: 'stethoscope', color: '#23B5CE' },
  { action: 'طلب صيدلية مكتمل', pts: '+30', icon: 'medication', color: '#5BA84F' },
  { action: 'دعوة صديق (عند أول حجز له)', pts: '+100', icon: 'group_add', color: '#EC4899' },
  { action: 'تسجيل مؤشرات حيوية', pts: '+10', icon: 'assignment', color: '#F0A526' },
];

export default function LoyaltyHubScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [points, setPoints] = useState(0);
  const [tierName, setTierName] = useState('bronze');
  const [claiming, setClaiming] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>(DEFAULT_TIERS);
  const [earnWays, setEarnWays] = useState<any[]>(DEFAULT_EARN_WAYS);
  const [rewards, setRewards] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'earn' | 'redeem' | 'activity'>('earn');
  const progressAnim = useRef(new Animated.Value(0)).current;

  const currentTier = tiers.find(t => t.id === tierName) || tiers[0];
  const nextTierIndex = tiers.findIndex(t => t.id === currentTier.id) + 1;
  const nextTier = nextTierIndex < tiers.length ? tiers[nextTierIndex] : tiers[tiers.length - 1];
  const pointsToNext = nextTier.minPts > points ? nextTier.minPts - points : 0;

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  const loadLoyaltyData = async () => {
    try {
      setLoading(true);
      const acc = await apiFetch('/loyalty/account');
      setPoints(acc.points || 0);
      setTierName(acc.tier || 'bronze');
      
      const txRes = await apiFetch('/loyalty/transactions?page=1');
      setActivities(txRes.transactions || []);
      
      const configRes = await apiFetch('/loyalty/config').catch(() => null);
      if (configRes && configRes.tiers) {
        setTiers(configRes.tiers);
        setEarnWays(configRes.earn_ways || DEFAULT_EARN_WAYS);
      }

      const rewardsRes = await apiFetch('/loyalty/rewards').catch(() => null);
      if (rewardsRes) {
        setRewards(rewardsRes);
      }
      
      const pct = (acc.points - currentTier.minPts) / (nextTier.minPts - currentTier.minPts);
      Animated.timing(progressAnim, {
        toValue: isNaN(pct) || pct < 0 ? 0 : pct > 1 ? 1 : pct,
        duration: 1200,
        useNativeDriver: false,
      }).start();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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

      {/* Standard Header */}
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
            <IconButton icon="info" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/loyalty/leaderboard')} />
            <IconButton icon="redeem" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.push('/loyalty/rewards')} />
          </View>
          <AppText variant="h3" color={colors.textPrimary}>نقاط نبض</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Hero Card */}
      <View style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 24, padding: 20, backgroundColor: isDark ? colors.surface : '#1E293B', overflow: 'hidden' }}>

        {/* Points Display */}
        <View style={styles.pointsDisplay}>
          <View style={[styles.tierBadge, { backgroundColor: currentTier.color + '30', borderColor: currentTier.color } ]}>
            <Icon name={currentTier.icon} size={20} color={currentTier.color} />
            <AppText variant="bodySM">{currentTier.label}</AppText>
          </View>
          <AppText variant="bodySM">{points.toLocaleString()}</AppText>
          <AppText variant="bodySM">نقطة نبض</AppText>

          {/* Cash equivalent */}
          <View style={[styles.cashEquiv, { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 } ]}>
            <Icon name="payments" size={16} color="#10B981" />
            <AppText variant="bodySM">
              تساوي <AppText variant="bodySM" style={{ fontWeight: 'bold' }}>{(points / 100).toFixed(0)} ريال</AppText> خصماً
            </AppText>
          </View>
        </View>

        {/* Progress to next tier */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <View style={styles.nextTierInfo}>
              <Icon name={nextTier.icon} size={20} color={nextTier.color} />
              <AppText variant="bodySM">{nextTier.label}</AppText>
            </View>
            <AppText variant="bodySM">
              {pointsToNext.toLocaleString()} نقطة للمستوى التالي
            </AppText>
          </View>
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, {
              width: progressWidth,
              backgroundColor: currentTier.color,
            }]} />
            {/* Glow effect */}
            <Animated.View style={[styles.progressGlow, {
              width: progressWidth,
              backgroundColor: currentTier.color + '40',
            }]} />
          </View>
          <View style={styles.progressEnds}>
            <AppText variant="bodySM">{nextTier.minPts.toLocaleString()}</AppText>
            <AppText variant="bodySM">{points.toLocaleString()}</AppText>
          </View>
        </View>
      </View>

      {/* Tier Road Map */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tierRoad, { backgroundColor: isDark ? colors.surface : colors.white }]}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 0, alignItems: 'center' }}>
        {tiers.map((tier, i) => (
          <View key={tier.id} style={styles.tierRoadItem}>
            {i > 0 && (
              <View style={[styles.tierConnector, {
                backgroundColor: i <= tiers.indexOf(currentTier) ? currentTier.color : colors.border,
              }]} />
            )}
            <View style={[
              styles.tierCircle,
              {
                backgroundColor: i <= tiers.indexOf(currentTier) ? tier.color : colors.border,
                borderColor: tier.id === currentTier.id ? '#fff' : 'transparent',
                borderWidth: tier.id === currentTier.id ? 3 : 0,
                shadowColor: tier.color,
                shadowOpacity: tier.id === currentTier.id ? 0.6 : 0,
                shadowRadius: 8,
                elevation: tier.id === currentTier.id ? 6 : 0,
              },]} >
              <Icon name={tier.icon} size={20} color={tier.color} />
            </View>
            <AppText variant="bodySM">{tier.label}</AppText>
          </View>
        ))}
      </ScrollView>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
        {([['earn', 'اكسب نقاطاً'], ['redeem', 'استبدال'], ['activity', 'السجل']] as const).map(([t, l]) => (
          <TouchableOpacity key={t} onPress={() => setActiveTab(t)}
            style={[styles.tab, activeTab === t && { borderBottomColor: currentTier.color, borderBottomWidth: 2.5 } ]}>
            <AppText variant="bodySM">{l}</AppText>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        {activeTab === 'earn' && (
          <>
            {/* Current tier perks */}
            <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
              <AppText variant="bodySM">
                مزايا المستوى {currentTier.label}
              </AppText>
              {currentTier.perks.map((perk, i) => (
                <View key={i} style={styles.perkRow}>
                  <AppText variant="bodySM">{perk}</AppText>
                  <Icon name="check" size={20} color={colors.primary} />
                </View>
              ))}
            </View>

            {/* Ways to earn */}
            <AppText variant="bodySM">طرق كسب النقاط</AppText>
            <View style={styles.earnGrid}>
              {earnWays.map((way, i) => (
                <View key={i} style={[styles.earnCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
                  <View style={[styles.earnIconWrap, { backgroundColor: way.color + '18' } ]}>
                    <Icon name={way.icon} size={24} color={way.color} />
                  </View>
                  <AppText variant="bodySM">{way.action}</AppText>
                  <AppText variant="bodySM">{way.pts} نقطة</AppText>
                </View>
              ))}
            </View>

            {/* Next tier unlock */}
            <View style={[styles.nextTierCard, { backgroundColor: isDark ? colors.surface : colors.white, borderColor: nextTier.color + '40' } ]}>
              <View style={styles.nextTierCardContent}>
                <View style={styles.nextTierCardLeft}>
                  <AppText variant="bodySM">
                    {pointsToNext.toLocaleString()} نقطة
                  </AppText>
                  <AppText variant="bodySM">
                    لتصبح {nextTier.label}
                  </AppText>
                </View>
                <View style={styles.nextTierCardRight}>
                  <AppText variant="bodySM">ستفتح هذه المزايا:</AppText>
                  {nextTier.perks.slice(0, 2).map((p, i) => (
                    <AppText key={i} variant="bodySM"> {p}</AppText>
                  ))}
                </View>
              </View>
            </View>
          </>
        )}

        {activeTab === 'redeem' && (
          <View style={styles.redeemSection}>
            <TouchableOpacity
              onPress={() => router.push('/loyalty/rewards')}
              activeOpacity={0.85}
            >
              <View style={styles.redeemBanner}>
                <View>
                  <AppText variant="bodySM">استبدل نقاطك الآن</AppText>
                  <AppText variant="bodySM">لديك {points} نقطة = {(points / 100).toFixed(0)} ريال</AppText>
                </View>
                <Icon name="gift" size={20} color={colors.primary} />
              </View>
            </TouchableOpacity>

            {rewards.length === 0 ? (
               <View style={{ padding: 20, alignItems: 'center' }}>
                 <AppText variant="caption" color={colors.textSecondary}>لا توجد مكافآت حالياً</AppText>
               </View>
            ) : rewards.map((reward, i) => (
              <View key={i} style={[styles.rewardCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
                <View style={styles.rewardRight}>
                  <TouchableOpacity
                    disabled={points < reward.points_required || claiming === (reward.id || reward._id)}
                    onPress={async () => {
                      const rid = reward.id || reward._id;
                      if (!rid) return;
                      setClaiming(rid);
                      try {
                        await apiFetch(`/loyalty/rewards/${rid}/claim`, { method: 'POST' });
                        showLocalizedAlert('تم الاستبدال', 'تم استبدال المكافأة بنجاح');
                        await loadLoyaltyData();
                      } catch (err: any) {
                        showLocalizedAlert('تعذّر الاستبدال', err?.message || 'فشل استبدال المكافأة');
                      } finally {
                        setClaiming(null);
                      }
                    }}
                    style={[styles.redeemBtn, {
                      backgroundColor: points >= reward.points_required ? currentTier.color : colors.border
                    }]}>
                    <AppText variant="bodySM">
                      {claiming === (reward.id || reward._id) ? 'جاري…' : points >= reward.points_required ? 'استبدل' : 'غير كافٍ'}
                    </AppText>
                  </TouchableOpacity>
                  <AppText variant="bodySM">{reward.points_required} نقطة</AppText>
                </View>
                <View style={styles.rewardInfo}>
                  <AppText variant="bodySM">{reward.title_ar}</AppText>
                  <View style={[styles.rewardCat, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary } ]}>
                    <AppText variant="bodySM">{reward.reward_type === 'coupon' ? 'خصومات' : 'خدمات'}</AppText>
                  </View>
                </View>
                <View style={[styles.rewardIconWrap, { backgroundColor: isDark ? colors.background : '#FEF9E7' } ]}>
                  <AppText variant="bodySM"><Icon name={reward.reward_type === 'coupon' ? 'wallet' : 'consultations'} size={24} color={currentTier.color} /></AppText>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'activity' && (
          <View style={styles.activitySection}>
            {activities.map(act => (
              <View key={act.id} style={[styles.activityRow, { backgroundColor: isDark ? colors.surface : colors.white, borderRightWidth: 3, borderRightColor: act.type === 'earn' ? '#5BA84F' : '#F0695C' } ]}>
                <View style={styles.activityLeft}>
                  <AppText variant="bodySM">
                    {act.type === 'earn' ? '+' : ''}{act.points.toLocaleString()}
                  </AppText>
                  <AppText variant="bodySM">
                    {act.createdAt ? new Date(act.createdAt).toLocaleDateString(dateLocale()) : 'اليوم'}
                  </AppText>
                </View>
                <AppText variant="bodySM">{act.description}</AppText>
                <AppText variant="bodySM">
                  {act.type === 'earn' ? <Icon name='stars' size={18} color='#F0A526' /> : <Icon name='redeem' size={18} color='#EC4899' />}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingHorizontal: 20, paddingBottom: 20, overflow: 'hidden' },
  heroShimmer1: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(99,102,241,0.06)', top: -80, right: -60 },
  heroShimmer2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(245,158,11,0.06)', bottom: -40, left: -30 },
  heroHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  heroHeaderBtns: { flexDirection: 'row', gap: 8 },
  pointsDisplay: { alignItems: 'center', gap: 4, marginBottom: 20 },
  tierBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 6 },
  tierIcon: { fontSize: 16 },
  tierLabel: { fontSize: 12, fontWeight: '800' },
  pointsNum: { color: '#fff', fontSize: 48, fontFamily: 'Cairo-ExtraBold', lineHeight: 52 },
  pointsLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '400' },
  cashEquiv: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 7, marginTop: 4 },
  cashEquivText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '400' },
  progressSection: { gap: 6 },
  progressHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '400' },
  nextTierInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  nextTierIcon: { fontSize: 14 },
  nextTierLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  progressBarBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 5, overflow: 'hidden', position: 'relative' },
  progressBarFill: { position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 5 },
  progressGlow: { position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 5, transform: [{ scaleY: 3 }] },
  progressEnds: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  progressEnd: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '400' },
  tierRoad: { maxHeight: 80, borderBottomWidth: 1 },
  tierRoadItem: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  tierConnector: { width: 30, height: 2, borderRadius: 1 },
  tierCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  tierCircleIcon: { fontSize: 20 },
  tierRoadLabel: { position: 'absolute', bottom: -16, fontSize: 9, width: 44, textAlign: 'center' },
  tabBar: { flexDirection: 'row-reverse', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.07)' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '700' },
  card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 12 },
  perkRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  perkText: { fontSize: 13, fontWeight: '400', flex: 1, textAlign: 'right' },
  sectionTitle: { fontSize: 15, fontWeight: '800', textAlign: 'right' },
  earnGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  earnCard: { width: (width - 52) / 3, borderRadius: 16, padding: 12, alignItems: 'center', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  earnIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  earnIcon: { fontSize: 22 },
  earnAction: { fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 14 },
  earnPts: { fontSize: 13, fontFamily: 'Cairo-ExtraBold' },
  nextTierCard: { borderRadius: 18, borderWidth: 1.5, padding: 16 },
  nextTierCardContent: { flexDirection: 'row-reverse', gap: 16 },
  nextTierCardLeft: { alignItems: 'center', gap: 2 },
  pointsNeeded: { fontSize: 22, fontFamily: 'Cairo-ExtraBold' },
  pointsNeededLabel: { fontSize: 11, fontWeight: '400', textAlign: 'center' },
  nextTierCardRight: { flex: 1, alignItems: 'flex-end', gap: 4 },
  unlockTitle: { fontSize: 12, fontWeight: '800' },
  unlockPerk: { fontSize: 11, fontWeight: '400', textAlign: 'right' },
  redeemSection: { gap: 10 },
  redeemBanner: { borderRadius: 20, padding: 18, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  redeemBannerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  redeemBannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '400', marginTop: 3 },
  rewardCard: { borderRadius: 18, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  rewardIconWrap: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  rewardIcon: { fontSize: 26 },
  rewardInfo: { flex: 1, alignItems: 'flex-end', gap: 4 },
  rewardTitle: { fontSize: 13, fontWeight: '800' },
  rewardCat: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  rewardCatText: { fontSize: 10, fontWeight: '400' },
  rewardRight: { alignItems: 'center', gap: 4 },
  redeemBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  redeemBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  rewardPts: { fontSize: 11, fontWeight: '700' },
  activitySection: { gap: 10 },
  activityRow: { borderRadius: 16, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  activityIcon: { fontSize: 22 },
  activityDesc: { flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  activityLeft: { alignItems: 'center', gap: 2 },
  activityPts: { fontSize: 15, fontFamily: 'Cairo-ExtraBold' },
  activityDate: { fontSize: 10, fontWeight: '400' },
});
