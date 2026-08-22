// @ts-nocheck
// app/insurance/claim-tracking.tsx
import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

// Claims DB Connected

const STATUS_CONFIG = {
  approved: { label: 'موافق عليه', color: '#5BA84F', bg: '#DCFCE7', icon: 'check_circle' },
  under_review: { label: 'قيد المراجعة', color: '#F0A526', bg: '#FEF3C7', icon: '' },
  reimbursed: { label: 'تم الاسترداد', color: '#23B5CE', bg: '#EBF3FF', icon: 'wallet' },
  rejected: { label: 'مرفوض', color: '#F0695C', bg: '#FEE2E2', icon: 'error' },
  submitted: { label: 'مُرسل', color: '#7A6BEA', bg: '#EDE9FE', icon: 'upload' },
};

export default function ClaimTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [claims, setClaims] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchClaims() {
      try {
        const res = await apiFetch('/insurance/claims/my');
        if (Array.isArray(res)) setClaims(res);
        else if (res?.data) setClaims(res.data);
      } catch (e) {
        console.warn('Failed to fetch claims');
      } finally {
        setLoading(false);
      }
    }
    fetchClaims();
  }, []);

  const totalCovered = claims.reduce((s, c) => s + (c.covered || 0), 0);
  const totalAmount = claims.reduce((s, c) => s + (c.amount || 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: isDark ? colors.surface : colors.white } ]}>
        <TouchableOpacity onPress={() => router.push('/insurance/submit-claim')} style={[styles.newClaimBtn, { backgroundColor: '#1a1a2e' } ]}>
          <Icon name="add" size={16} color="#fff" />
          <AppText variant="bodySM">مطالبة جديدة</AppText>
        </TouchableOpacity>
        <AppText variant="bodySM">مطالباتي</AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Stats Strip */}
      <View style={[styles.statsStrip, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
        <View style={styles.statItem}><AppText variant="bodySM">{claims.length}</AppText><AppText variant="bodySM">مطالبة</AppText></View>
        <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}><AppText variant="bodySM">{totalCovered} ر</AppText><AppText variant="bodySM">مغطّى</AppText></View>
        <View style={[styles.statDiv, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}><AppText variant="bodySM">{totalAmount - totalCovered} ر</AppText><AppText variant="bodySM">دفعته</AppText></View>
      </View>

      <FlatList
        data={claims}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const sc = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
          return (
            <View style={[styles.claimCard, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
              <View style={styles.claimTop}>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg } ]}>
                  <AppText variant="bodySM">{sc.icon} {sc.label}</AppText>
                </View>
                <View style={styles.claimInfo}>
                  <AppText variant="bodySM">{item.service}</AppText>
                  <AppText variant="bodySM">{item.provider} • {item.date}</AppText>
                  <AppText variant="bodySM">#{item.id}</AppText>
                </View>
                <AppText variant="bodySM">{item.icon}</AppText>
              </View>

              <View style={[styles.amountsRow, { borderTopColor: colors.border } ]}>
                <View style={styles.amountItem}>
                  <AppText variant="bodySM">{item.patient} ر</AppText>
                  <AppText variant="bodySM">دفعت</AppText>
                </View>
                <View style={[styles.amountDiv, { backgroundColor: colors.border }]} />
                <View style={styles.amountItem}>
                  <AppText variant="bodySM">{item.covered} ر</AppText>
                  <AppText variant="bodySM">مغطّى</AppText>
                </View>
                <View style={[styles.amountDiv, { backgroundColor: colors.border }]} />
                <View style={styles.amountItem}>
                  <AppText variant="bodySM">{item.amount} ر</AppText>
                  <AppText variant="bodySM">الإجمالي</AppText>
                </View>
              </View>

              {item.status === 'rejected' && (item as any).rejectionReason && (
                <View style={[styles.rejectionNote, { backgroundColor: '#FEE2E2' } ]}>
                  <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="error" size={16} color={colors.primary} /><AppText variant="bodySM">سبب الرفض: {(item as any).rejectionReason}</AppText></View>
                  <TouchableOpacity onPress={() => router.push('/support/chat')}><AppText variant="bodySM" color={colors.primary}>تقديم اعتراض عبر الدعم</AppText></TouchableOpacity>
                </View>
              )}
              {item.status === 'approved' && (
                <TouchableOpacity onPress={() => router.push('/insurance/refund-status')}
                  style={[styles.refundBtn, { backgroundColor: '#EBF3FF' } ]}>
                  <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="wallet" size={16} color={colors.primary} /><AppText variant="bodySM">استرداد النقود</AppText></View>
                </TouchableOpacity>
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
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  title: { fontSize: 17, fontWeight: '800' },
  newClaimBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
  newClaimText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  statsStrip: { flexDirection: 'row-reverse', paddingVertical: 12, paddingHorizontal: 20, marginBottom: 2 },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statDiv: { width: 1, marginHorizontal: 6 },
  statNum: { fontSize: 18, fontFamily: 'Cairo-ExtraBold' },
  statLabel: { fontSize: 10, fontWeight: '400' },
  claimCard: { borderRadius: 18, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 10 },
  claimTop: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  claimIcon: { fontSize: 28 },
  claimInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  claimService: { fontSize: 14, fontWeight: '800' },
  claimProvider: { fontSize: 11, fontWeight: '400' },
  claimId: { fontSize: 10, fontWeight: '400' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  amountsRow: { flexDirection: 'row-reverse', borderTopWidth: 1, paddingTop: 10 },
  amountItem: { flex: 1, alignItems: 'center', gap: 2 },
  amountDiv: { width: 1, marginHorizontal: 4 },
  amountNum: { fontSize: 15, fontFamily: 'Cairo-ExtraBold' },
  amountLabel: { fontSize: 10, fontWeight: '400' },
  rejectionNote: { borderRadius: 10, padding: 10, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  rejectionText: { color: '#DC2626', fontSize: 11, fontWeight: '400', flex: 1, textAlign: 'right' },
  refundBtn: { borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  refundBtnText: { fontSize: 13, fontWeight: '700' },
});
