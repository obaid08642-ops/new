// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Button, IconButton, SectionHeader } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

// Rewards fetched from API
export default function LoyaltyRewardsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [points, setPoints] = useState(0);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const acc = await apiFetch('/loyalty/account');
      setPoints(acc.points || 0);

      const catalog = await apiFetch('/loyalty/rewards');
      setRewards(Array.isArray(catalog) ? catalog : catalog?.data || []);
    } catch (err) {
      console.error(err);
      setRewards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (reward: any) => {
    if (points < reward.points_required) {
      showLocalizedAlert('رصيد غير كافٍ', 'عذراً، لا تملك نقاطاً كافية لاستبدال هذه المكافأة.');
      return;
    }

    showLocalizedAlert(
      'تأكيد الاستبدال',
      `هل تريد استبدال ${reward.points_required} نقطة مقابل ${reward.title}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'استبدال',
          onPress: async () => {
            try {
              setClaimingId(reward.id);
              const res = await apiFetch(`/loyalty/rewards/${reward.id}/claim`, { method: 'POST' });
              
              // Deduct points locally
              setPoints(prev => prev - reward.points_required);

              showLocalizedAlert(
                'تم الاستبدال بنجاح',
                `كود الكوبون الخاص بك هو: ${res.coupon_code || 'NAB-FREE'}\nيمكنك استخدامه عند الدفع.`,
                [{ text: 'حسناً' }]
              );
            } catch (err) {
              console.error(err);
              showLocalizedAlert('خطأ', 'حدث خطأ أثناء استبدال المكافأة. يرجى المحاولة لاحقاً.');
            } finally {
              setClaimingId(null);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[st.c, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' } ]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle="light-content" />
      <View style={{ paddingTop: insets.top + 16, paddingBottom: 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 44 }}/>
          <AppText variant="h3" color={colors.textPrimary}>استبدال النقاط</AppText>
          <IconButton icon="back" bg={colors.surfaceSecondary} color={colors.textPrimary} onPress={() => router.back()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={{ marginHorizontal: 16, marginTop: 12 }}>
          <Card style={{ alignItems: 'center', backgroundColor: colors.warningSurface }}>
            <AppText variant="caption" color={colors.warning}>رصيد نقاطك الحالي</AppText>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <Icon name="stars" size={32} color={colors.warning} />
              <AppText variant="displayMD" color={colors.warning}>{points}</AppText>
            </View>
          </Card>
        </View>

      <View style={{ padding: 16, gap: 12 }}>
        <SectionHeader title="المكافآت المتاحة" />
        
        {rewards.map((r) => {
          const color = r.color || colors.warning;
          const icon = r.icon || 'gift';
          const isAffordable = points >= r.points_required;
          const claiming = claimingId === r.id;

          return (
            <Card key={r.id} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 14 }}>
              <View style={[st.fIcon, { backgroundColor: color + '15' } ]}>
                <Icon name={icon} size={24} color={color} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                <AppText variant="h6">{r.title}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>{r.description}</AppText>
                <AppText variant="caption" style={{ color, fontWeight: '800' }}>
                  {r.points_required} نقطة
                </AppText>
              </View>
              <TouchableOpacity
                disabled={claiming}
                onPress={() => handleClaimReward(r)}
                style={[
                  st.claimBtn,
                  { backgroundColor: isAffordable ? colors.primary : colors.border } ]}>
                {claiming ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <AppText variant="caption" color="#fff" style={{ fontWeight: '800' }}>
                    استبدال
                  </AppText>
                )}
              </TouchableOpacity>
            </Card>
          );
        })}
      </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { paddingHorizontal: 16, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  hdrRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  balanceCard: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 18, padding: 16, marginTop: 4 },
  fIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  claimBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
});
