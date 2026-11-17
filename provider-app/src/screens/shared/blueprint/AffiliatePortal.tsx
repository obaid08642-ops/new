import { buildHeaders } from '../../../security/Security';
import { API_BASE } from '../../../constants';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Dimensions, Switch, Platform, Alert, Vibration,
 ActivityIndicator, TextInput, Linking
} from 'react-native';
import { useTheme, useLang, useToast } from '../../../context';
import client from '../../../api/client';
import { useServicesCatalog } from '../../../api/catalogs';
import {
 NBtn, NCard, NInput, NBadge, NHeader, NScroll, NDivider,
 NPriceInput, NToggle, NSearch, NSecHeader, NStatCard, NAvatar,
 NSheet, NEmpty
} from '../../../components/ui';
import { I, IBg } from '../../../components/icons';
import { SP, R, FS, FW, C } from '../../../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function AffiliatePortal({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang, t: tt } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [dash, setDash] = useState<any>(null);
 const [loadingDash, setLoadingDash] = useState(true);

 useEffect(() => {
   // Real referral dashboard — code, stats, and invite list from /referrals/my.
   client.get('/referrals/my')
     .then(r => setDash(r.data || null))
     .catch(() => setDash(null))
     .finally(() => setLoadingDash(false));
 }, []);

 const invites: any[] = Array.isArray(dash?.invites) ? dash.invites : [];

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={tt('sxt.9897b23e')} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 <NCard style={{ backgroundColor: theme.infoBg, borderColor: theme.info }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.info, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
  {tt('sxt.1a437ca3')}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {tt('sxt.8d3ba59e')}
 </Text>
 </NCard>

 <NCard style={{ alignItems: 'center' }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{tt('sxt.fb828d46')}</Text>
 <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, marginVertical: SP.md }}>
 {loadingDash ? '…' : (dash?.code || '—')}
 </Text>
 {!!dash?.code && (
 <NBtn label={tt('sxt.4a19fe1f')} variant="outline" onPress={async () => {
   try {
     const { Share } = await import('react-native');
     await Share.share({ message: dash.code });
   } catch {
     show(tt('sxt.580ca6a8'), 'error');
   }
 }} />
 )}
 </NCard>

 {dash?.stats && (
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
 <NStatCard icon="users" label={tt('sxt.a704e6c7')} value={String(dash.stats.total ?? 0)} color={theme.info} style={{ flex: 1 }} />
 <NStatCard icon="check" label={tt('sxt.2e721b29')} value={String(dash.stats.rewarded ?? 0)} color={theme.success} style={{ flex: 1 }} />
 <NStatCard icon="star" label={tt('sxt.c7a2b7bb')} value={String(dash.stats.earned_points ?? 0)} color={theme.primary} style={{ flex: 1 }} />
 </View>
 )}

 <NSecHeader title={tt('sxt.d588ad7b')} />
 {loadingDash ? (
 <ActivityIndicator color={theme.primary} />
 ) : invites.length === 0 ? (
 <NCard>
 <Text style={{ color: theme.textSub, textAlign: 'center' }}>{tt('sxt.8a07e003')}</Text>
 </NCard>
 ) : (
 <NCard style={{ gap: SP.md }}>
 {invites.map((inv: any) => (
 <View key={inv.id} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{inv.name}</Text>
 <Text style={{ fontSize: FS.sm, color: inv.status === 'rewarded' ? theme.success : theme.textSub, fontWeight: FW.bold }}>
 {inv.status === 'rewarded' ? `+${inv.reward_points} ${tt('qqco.909cd2f3')}` : (tt('sxt.25cd2b1f'))}
 </Text>
 </View>
 ))}
 </NCard>
 )}
 </View>
 </NScroll>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 2: OPERATIONS, CRM & ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

// 2.1 RATING & REPUTATION DASHBOARD
