import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme, useAuth, useLang } from '../../context';
import { NHeader, NCard, NBtn, NBadge, NAvatar } from '../../components/ui';
import { I } from '../../components/icons';
import { FS, FW, R, SP } from '../../constants';
import client from '../../api/client';
import { tokens } from '../../theme/tokens';
import { HomeSections } from '../../components/HomeSections';

export const ProviderHome = ({ onLogout }: { onLogout?: () => void }) => {
  const { theme } = useTheme();
  const { user, logout, toggleOnline } = useAuth();
  const { lang, t: tt } = useLang();
  const AR = lang === 'ar';
  const isOnline = Boolean(user?.isOnline);

  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>({
    active_orders: 0,
    completed_today: 0,
    wallet_balance: 0,
    // Needs-review issue 1199: no rating until the server sends one (was a made-up 5.0).
    rating: null,
  });

  const loadData = async () => {
    try {
      const [pRes, sRes] = await Promise.allSettled([
        client.get('/provider/profile'),
        client.get('/provider/dashboard/stats'),
      ]);
      if (pRes.status === 'fulfilled' && pRes.value?.data) {
        setProfile(pRes.value.data);
      }
      if (sRes.status === 'fulfilled' && sRes.value?.data) {
        setStats((prev: any) => ({ ...prev, ...sRes.value.data }));
      }
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const displayName = profile?.display_name_ar || profile?.display_name || user?.name || user?.email || (tt('phome.aa620811'));
  const providerType = (user?.providerType || profile?.provider_type || 'provider').toLowerCase();
  const isApproved = profile?.status === 'approved' || user?.status === 'approved';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <NHeader
        title={tt('phome.f31ef890')}
        right={
          <TouchableOpacity onPress={onLogout || logout} style={styles.logoutBtn}>
            <I name="log-out" size={20} color={theme.danger} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* R6-5: admin-curated home sections */}
        <HomeSections />
        {/* Profile Header Card */}
        <NCard style={styles.profileCard}>
          <View style={[styles.row, { flexDirection: AR ? 'row-reverse' : 'row' }]}>
            <NAvatar name={displayName} size={56} />
            <View style={[styles.profileInfo, { alignItems: AR ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.nameText, { color: theme.text }]}>{displayName}</Text>
              <Text style={[styles.subText, { color: theme.textSub }]}>{user?.email || ''}</Text>
              <View style={[styles.badgeRow, { flexDirection: AR ? 'row-reverse' : 'row' }]}>
                <NBadge
                  label={AR ? (isApproved ? 'معتمد رسمياً' : 'قيد المراجعة والتدقيق') : (isApproved ? 'Verified Provider' : 'Pending Verification')}
                  variant={isApproved ? 'success' : 'warning'}
                  size="sm"
                />
                <NBadge
                  label={providerType.toUpperCase()}
                  variant="primary"
                  size="sm"
                />
              </View>
            </View>
          </View>
        </NCard>

        {/* Availability Toggle */}
        <NCard style={styles.actionCard}>
          <View style={[styles.toggleRow, { flexDirection: AR ? 'row-reverse' : 'row' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>
                {tt('phome.77a0dfca')}
              </Text>
              <Text style={[styles.bodyText, { color: theme.textSub, textAlign: AR ? 'right' : 'left' }]}>
                {isOnline
                  ? (tt('phome.40e4e120'))
                  : (tt('phome.5800b2e6'))}
              </Text>
            </View>
            <NBtn
              label={isOnline ? (tt('phome.31b0b426')) : (tt('phome.b2a7fe2e'))}
              variant={isOnline ? 'primary' : 'outline'}
              size="sm"
              onPress={toggleOnline}
            />
          </View>
        </NCard>

        {/* Operational Statistics */}
        <Text style={[styles.groupTitle, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>
          {tt('phome.81f11ae2')}
        </Text>
        <View style={[styles.statsGrid, { flexDirection: AR ? 'row-reverse' : 'row' }]}>
          <NCard style={styles.statBox}>
            <I name="activity" size={24} color={theme.primary} />
            <Text style={[styles.statVal, { color: theme.text }]}>{stats.active_orders || 0}</Text>
            <Text style={[styles.statLbl, { color: theme.textSub }]}>{tt('phome.13f7ffe8')}</Text>
          </NCard>
          <NCard style={styles.statBox}>
            <I name="check" size={24} color={tokens.success} />
            <Text style={[styles.statVal, { color: theme.text }]}>{stats.completed_today || 0}</Text>
            <Text style={[styles.statLbl, { color: theme.textSub }]}>{tt('phome.d73669fd')}</Text>
          </NCard>
          <NCard style={styles.statBox}>
            <I name="credit-card" size={24} color={tokens.warning} />
            <Text style={[styles.statVal, { color: theme.text }]}>{stats.wallet_balance || 0} {tt('phome.91d5796f')}</Text>
            <Text style={[styles.statLbl, { color: theme.textSub }]}>{tt('phome.e0f01978')}</Text>
          </NCard>
          <NCard style={styles.statBox}>
            <I name="star" size={24} color={tokens.warning} />
            <Text style={[styles.statVal, { color: theme.text }]}>{typeof stats.rating === 'number' ? stats.rating.toFixed(1) : '—'}</Text>
            <Text style={[styles.statLbl, { color: theme.textSub }]}>{tt('phome.3725b573')}</Text>
          </NCard>
        </View>

        {/* Status Notice */}
        <NCard style={[styles.noticeCard, { borderColor: theme.border }]}>
          <Text style={[styles.noticeTitle, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>
            {tt('phome.29fc7a91')}
          </Text>
          <Text style={[styles.noticeBody, { color: theme.textSub, textAlign: AR ? 'right' : 'left' }]}>
            {tt('phome.fde46ce9')}
          </Text>
        </NCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SP.lg },
  logoutBtn: { padding: SP.xs },
  profileCard: { marginBottom: SP.lg },
  row: { alignItems: 'center', gap: SP.md },
  profileInfo: { flex: 1, gap: 4 },
  nameText: { fontSize: FS.lg, fontWeight: FW.bold },
  subText: { fontSize: FS.sm },
  badgeRow: { gap: SP.xs, marginTop: SP.xs },
  actionCard: { marginBottom: SP.lg },
  toggleRow: { alignItems: 'center', gap: SP.md },
  sectionTitle: { fontSize: FS.md, fontWeight: FW.bold, marginBottom: 4 },
  bodyText: { fontSize: FS.xs, lineHeight: 18 },
  groupTitle: { fontSize: FS.md, fontWeight: FW.bold, marginBottom: SP.sm },
  statsGrid: { flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.lg },
  statBox: { width: '48%', alignItems: 'center', padding: SP.md, gap: 6 },
  statVal: { fontSize: FS.xl, fontWeight: FW.xbold },
  statLbl: { fontSize: FS.xs },
  noticeCard: { padding: SP.md, borderWidth: 1, borderRadius: R.md },
  noticeTitle: { fontSize: FS.sm, fontWeight: FW.bold, marginBottom: SP.xs },
  noticeBody: { fontSize: FS.xs, lineHeight: 18 },
});
