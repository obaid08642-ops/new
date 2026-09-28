import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Platform, Switch,
 RefreshControl, ActivityIndicator, Modal
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import {
 NBtn, NCard, NInput, NPhoneInput, NStatCard, NAvatar,
 NBadge, NHeader, NScroll, NSheet, NSearch, NToggle,
 NSettingsRow, NSecHeader, NConfirm, NEmpty, NSkeleton,
 NOnlineToggle, NBottomNav, NDivider, NPriceInput, NRadio
} from '../../../components/ui';
import { I, hasIcon } from '../../../components/icons';
import { SP, R, FS, FW, C } from '../../../constants';
import { useSpecialtiesCatalog } from '../../../api/catalogs';
import { Validate, Vault } from '../../../security/Security';
import client from '../../../api/client';
import { s } from './_shared';
import { InsuranceRequestsScreen } from '../../shared/InsuranceRequestsScreen';
import { EPrescriptionScreen } from '../../doctor/DoctorDashboard';
import { FleetScreen } from '../../shared/FleetScreen';
import {
 PromotionsDashboard, CreateCampaignScreen, ProfileWebConfig,
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights,
 SosDispatchScreen, GpsRouterScreen
} from '../../shared/BlueprintScreens';
import { FacilityProfileConfigScreen } from '../FacilityProfileConfigScreen';
import { FacilityInvitationScreen } from '../FacilityInvitationScreen';
import { FacilityResourcesScreen } from '../FacilityResourcesScreen';
import { FacilityLeaveRequestsScreen } from '../FacilityLeaveRequestsScreen';
import { FacilityUnifiedCalendarScreen } from '../FacilityUnifiedCalendarScreen';
import { FacilityInternalChatScreen } from '../FacilityInternalChatScreen';
import { FacilityAuditLogScreen } from '../FacilityAuditLogScreen';
import { FacilityAnnouncementsScreen } from '../FacilityAnnouncementsScreen';
import { FacilityPatientTrackerScreen } from '../FacilityPatientTrackerScreen';
import { DischargeSummaryScreen } from '../DischargeSummaryScreen';
import { MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, ProviderWalletScreen, ProviderHomeStats, GlobalSystemSettings } from '../../shared/SharedScreens';
import { NotificationsCenterScreen, TechnicalSupportTicketsScreen, SecurityManagementScreen } from '../../shared/RealScreens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { tokens } from '../../../theme/tokens';

export function FacilityFinancialScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [period, setPeriod] = useState<'week'|'month'|'year'>('month');
 const [ledger, setLedger] = useState<any>(null);
 const [loadingLedger, setLoadingLedger] = useState(true);

 useEffect(() => {
   // Real financial data only — platform wallet ledger (provider earnings vs payouts).
   client.get('/provider/ops/wallet/ledger')
     .then(r => setLedger(r.data || null))
     .catch(() => setLedger(null))
     .finally(() => setLoadingLedger(false));
 }, []);

 // Aggregate REAL earning transactions for the selected period.
 const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 365;
 const cutoff = Date.now() - periodDays * 86400000;
 const txns: any[] = Array.isArray(ledger?.transactions) ? ledger.transactions : [];
 const earnings = txns.filter((t: any) => t.type === 'provider_earning' && new Date(t.createdAt).getTime() >= cutoff);
 const periodRev = earnings.reduce((s: number, t: any) => s + (t.amount || 0), 0);
 const periodOps = earnings.length;
 const summary = ledger?.summary || null;

 // Monthly revenue trend from real transactions (last 12 months).
 const monthly: number[] = Array.from({ length: 12 }, (_, i) => {
   const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (11 - i));
   const next = new Date(d); next.setMonth(next.getMonth() + 1);
   return txns.filter((t: any) => t.type === 'provider_earning')
     .filter((t: any) => { const ts = new Date(t.createdAt); return ts >= d && ts < next; })
     .reduce((s: number, t: any) => s + (t.amount || 0), 0);
 });
 const maxB = Math.max(...monthly, 1);
 const hasData = txns.length > 0;

 return (
 <NScroll>
 <NHeader title={AR?' التقارير المالية الموحدة':' Unified Financial Reports'} onBack={onBack} />

 {/* Period selector */}
 <View style={{ flexDirection: AR?'row-reverse':'row', gap: SP.md, marginBottom: SP.xl }}>
 {([['week',AR?'أسبوع':'Week'],['month',AR?'شهر':'Month'],['year',AR?'سنة':'Year']] as [string,string][]).map(([k,l]) => (
 <TouchableOpacity key={k} onPress={() => setPeriod(k as any)}
 style={[{ flex:1, paddingVertical:SP.md, borderRadius:R.lg, borderWidth:1.5, alignItems:'center' }, {
 backgroundColor: period===k ? theme.primary : theme.surface2,
 borderColor: period===k ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: period===k?'#FFF':theme.text, fontWeight: FW.semi }}>{l}</Text>
 </TouchableOpacity>
 ))}
 </View>

 {/* KPIs */}
 <NCard style={[s.revCard, { backgroundColor: theme.primary }]}>
 <Text style={{ color:'rgba(255,255,255,0.8)', fontSize: FS.sm }}>{AR?'إجمالي الإيرادات':'Total Revenue'}</Text>
 <Text style={{ color:'#FFF', fontSize: FS['5xl'], fontWeight: FW.xbold, marginVertical: SP.sm }}>
 {loadingLedger ? '…' : periodRev.toLocaleString()}
 </Text>
 <Text style={{ color:'rgba(255,255,255,0.8)' }}>{AR?'ريال سعودي':'Saudi Riyal'}</Text>
 <View style={{ flexDirection:AR?'row-reverse':'row', gap: SP.xxl, marginTop: SP.lg }}>
 <View style={{ alignItems:'center' }}>
 <Text style={{ color:'#FFF', fontSize: FS.lg, fontWeight: FW.bold }}>{loadingLedger ? '…' : periodOps}</Text>
 <Text style={{ color:'rgba(255,255,255,0.7)', fontSize: FS.xs }}>{AR?'عملية':'Operations'}</Text>
 </View>
 <View style={{ alignItems:'center' }}>
 <Text style={{ color:'#FFF', fontSize: FS.lg, fontWeight: FW.bold }}>{summary ? summary.pending.toLocaleString() : '—'}</Text>
 <Text style={{ color:'rgba(255,255,255,0.7)', fontSize: FS.xs }}>{AR?'معلّق':'Pending'}</Text>
 </View>
 <View style={{ alignItems:'center' }}>
 <Text style={{ color:'#FFF', fontSize: FS.lg, fontWeight: FW.bold }}>{summary ? summary.balance.toLocaleString() : '—'}</Text>
 <Text style={{ color:'rgba(255,255,255,0.7)', fontSize: FS.xs }}>{AR?'الرصيد':'Balance'}</Text>
 </View>
 </View>
 </NCard>

 {!loadingLedger && !hasData && (
 <NCard style={{ marginBottom: SP.xl, alignItems:'center' }}>
 <Text style={{ color: theme.textSub, textAlign:'center' }}>{AR?'لا توجد حركات مالية بعد — ستظهر الإيرادات هنا فور بدء استقبال الطلبات.':'No financial transactions yet — revenue will appear here once you start receiving orders.'}</Text>
 </NCard>
 )}

 {/* Revenue chart */}
 <NCard style={{ marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text,
 marginBottom: SP.lg, textAlign: AR?'right':'left' }}>
  {AR?'مؤشر الإيرادات الشهرية':'Monthly Revenue Trend'}
 </Text>
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
 <View style={{ flexDirection:'row', alignItems:'flex-end', gap: SP.sm, height:120 }}>
 {monthly.map((val, i) => (
 <View key={i} style={{ alignItems:'center', width:36 }}>
 <View style={{
 width:28, height: Math.max(8,(val/maxB)*100),
 backgroundColor: theme.primary, borderRadius:6, opacity: val > 0 ? 0.85 : 0.2,
 }} />
 <Text style={{ fontSize:9, color:theme.textSub, marginTop:4 }}>
 {['ي','ف','م','أ','م','ي','ي','أ','س','أ','ن','د'][(((new Date().getMonth() - 11 + i) % 12) + 12) % 12]}
 </Text>
 </View>
 ))}
 </View>
 </ScrollView>
 </NCard>

 {/* Breakdown by transaction type — computed from the real ledger */}
 {hasData && (
 <NCard style={{ marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text,
 marginBottom: SP.lg, textAlign: AR?'right':'left' }}>
  {AR?'التوزيع حسب نوع الحركة':'Breakdown by Transaction Type'}
 </Text>
 {(() => {
   const colors = [tokens.info,tokens.purple,tokens.warning,tokens.error,tokens.success,tokens.textSecondary];
   const sums: Record<string, number> = {};
   txns.forEach((t: any) => { sums[t.type || 'other'] = (sums[t.type || 'other'] || 0) + Math.abs(t.amount || 0); });
   const total = Object.values(sums).reduce((a, b) => a + b, 0) || 1;
   return Object.entries(sums).sort((a, b) => b[1] - a[1]).map(([type, amt], i) => {
     const pct = Math.round((amt / total) * 100);
     const color = colors[i % colors.length];
     return (
 <View key={type} style={{ marginBottom: SP.md }}>
 <View style={{ flexDirection:AR?'row-reverse':'row', justifyContent:'space-between', marginBottom:4 }}>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{type}</Text>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color }}>{pct}%</Text>
 </View>
 <View style={{ height:8, backgroundColor:theme.surface2, borderRadius:R.full }}>
 <View style={{ height:8, width:`${pct}%`, backgroundColor:color, borderRadius:R.full }} />
 </View>
 </View>
     );
   });
 })()}
 </NCard>
 )}

 <View style={{ flexDirection: AR?'row-reverse':'row', gap: SP.md }}>
 <View style={{ flex:1 }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: 'center' }}>{AR ? 'التقارير المالية عبر التقارير التلقائية' : 'Financial reports via Auto Reports'}</Text>
 </View>
 </View>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// STAFF ATTENDANCE
