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

export type RevenueRole = 'provider' | 'facility';

type LedgerTxn = { type?: string; amount?: number; createdAt?: string; service_type?: string; reference_type?: string };
type Ledger = { transactions?: LedgerTxn[]; summary?: { pending: number; balance: number } } | null;

// One revenue screen for every provider role (doctor, lab, nursing, pharmacy, radiology, facility). Same call for all:
// GET /provider/ops/wallet/ledger. `role` only changes the header; facilities see the "unified" wording.
export function RevenueInsights({ onBack, role = 'provider' }: { onBack: () => void; role?: RevenueRole }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const AR = lang === 'ar';
 const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
 const [ledger, setLedger] = useState<Ledger>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
   // Live data only — no fabricated revenue figures.
   client.get('/provider/ops/wallet/ledger')
     .then(r => setLedger(r.data || null))
     .catch(() => setLedger(null))
     .finally(() => setLoading(false));
 }, []);

 const txns: LedgerTxn[] = Array.isArray(ledger?.transactions) ? (ledger?.transactions as LedgerTxn[]) : [];
 const earningsAll = txns.filter(t => t.type === 'provider_earning');
 const sumIn = (from: number, to: number) => earningsAll
   .filter(t => { const ts = new Date(t.createdAt || 0).getTime(); return ts >= from && ts < to; })
   .reduce((a, t) => a + (t.amount || 0), 0);
 const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 365;
 const cutoff = Date.now() - periodDays * 86400000;
 const periodEarnings = earningsAll.filter(t => new Date(t.createdAt || 0).getTime() >= cutoff);
 const periodRev = periodEarnings.reduce((a, t) => a + (t.amount || 0), 0);
 const prevRev = sumIn(cutoff - periodDays * 86400000, cutoff);
 const delta = prevRev > 0 ? Math.round(((periodRev - prevRev) / prevRev) * 100) : null;
 const summary = ledger?.summary || null;
 const hasData = txns.length > 0;

 // Monthly trend (last 12 months) from the real ledger.
 const monthly: number[] = Array.from({ length: 12 }, (_, i) => {
   const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() - (11 - i));
   const next = new Date(d); next.setMonth(next.getMonth() + 1);
   return sumIn(d.getTime(), next.getTime());
 });
 const maxB = Math.max(...monthly, 1);

 // Earnings of the selected period grouped by service/reference type.
 const byRef: Record<string, number> = {};
 periodEarnings.forEach(t => { const k = t.service_type || t.reference_type || 'other'; byRef[k] = (byRef[k] || 0) + (t.amount || 0); });
 const topServices = Object.entries(byRef).sort((a, b) => b[1] - a[1]).slice(0, 5);
 const totalAll = topServices.reduce((a, [, v]) => a + v, 0) || 1;

 // Breakdown by ledger movement type (earning, payout, commission, ...).
 const sums: Record<string, number> = {};
 txns.forEach(t => { const k = t.type || 'other'; sums[k] = (sums[k] || 0) + Math.abs(t.amount || 0); });
 const sumsTotal = Object.values(sums).reduce((a, b) => a + b, 0) || 1;
 const barColors = [theme.info, theme.primary, theme.warn, theme.danger, theme.success, theme.textSub];

 const title = role === 'facility'
   ? (AR ? 'التقارير المالية الموحدة' : 'Unified Financial Reports')
   : (AR ? 'تفاصيل الإيرادات والتحليلات' : 'Revenue Insights');
 const periods: [typeof period, string][] = [['week', AR ? 'أسبوع' : 'Week'], ['month', AR ? 'شهر' : 'Month'], ['year', AR ? 'سنة' : 'Year']];
 const dash = '—';

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={title} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>

 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
 {periods.map(([k, l]) => (
 <TouchableOpacity key={k} onPress={() => setPeriod(k)}
 style={{ flex: 1, paddingVertical: SP.md, borderRadius: R.lg, borderWidth: 1.5, alignItems: 'center',
 backgroundColor: period === k ? theme.primary : theme.surface2, borderColor: period === k ? theme.primary : theme.border }}>
 <Text style={{ color: period === k ? '#FFF' : theme.text, fontWeight: FW.semi }}>{l}</Text>
 </TouchableOpacity>
 ))}
 </View>

 <NCard style={{ backgroundColor: theme.primary, alignItems: 'center' }}>
 <Text style={{ color: '#FFF', opacity: 0.8, fontSize: FS.sm }}>{AR ? 'صافي الإيرادات' : 'Net earnings'}</Text>
 <Text style={{ color: '#FFF', fontSize: FS['3xl'], fontWeight: '800', marginVertical: SP.xs }}>
 {loading ? '…' : `${periodRev.toLocaleString()} ${AR ? 'ريال' : 'SAR'}`}
 </Text>
 {delta !== null && (
 <Text style={{ color: '#FFF', opacity: 0.85, fontSize: FS.xs }}>
 {delta >= 0 ? '↗' : '↘'} {Math.abs(delta)}% {AR ? 'مقارنة بالفترة السابقة' : 'vs previous period'}
 </Text>
 )}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.xxl, marginTop: SP.lg }}>
 <View style={{ alignItems: 'center' }}>
 <Text style={{ color: '#FFF', fontSize: FS.lg, fontWeight: FW.bold }}>{loading ? '…' : periodEarnings.length}</Text>
 <Text style={{ color: '#FFF', opacity: 0.7, fontSize: FS.xs }}>{AR ? 'عملية' : 'Operations'}</Text>
 </View>
 <View style={{ alignItems: 'center' }}>
 <Text style={{ color: '#FFF', fontSize: FS.lg, fontWeight: FW.bold }}>{summary ? summary.pending.toLocaleString() : dash}</Text>
 <Text style={{ color: '#FFF', opacity: 0.7, fontSize: FS.xs }}>{AR ? 'معلّق' : 'Pending'}</Text>
 </View>
 <View style={{ alignItems: 'center' }}>
 <Text style={{ color: '#FFF', fontSize: FS.lg, fontWeight: FW.bold }}>{summary ? summary.balance.toLocaleString() : dash}</Text>
 <Text style={{ color: '#FFF', opacity: 0.7, fontSize: FS.xs }}>{AR ? 'الرصيد' : 'Balance'}</Text>
 </View>
 </View>
 </NCard>

 {!loading && !hasData && (
 <NCard>
 <Text style={{ color: theme.textSub, textAlign: 'center' }}>{AR ? 'لا توجد حركات مالية بعد — ستظهر الإيرادات هنا فور اكتمال أول خدمة مدفوعة.' : 'No financial transactions yet — revenue will appear here once your first paid service completes.'}</Text>
 </NCard>
 )}

 <NSecHeader title={AR ? 'مؤشر الإيرادات الشهرية' : 'Monthly Revenue Trend'} />
 <NCard>
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
 <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: SP.sm, height: 120 }}>
 {monthly.map((val, i) => (
 <View key={i} style={{ alignItems: 'center', width: 36 }}>
 <View style={{ width: 28, height: Math.max(8, (val / maxB) * 100), backgroundColor: theme.primary, borderRadius: 6, opacity: val > 0 ? 0.85 : 0.2 }} />
 <Text style={{ fontSize: 9, color: theme.textSub, marginTop: 4 }}>
 {new Date(new Date().getFullYear(), new Date().getMonth() - (11 - i), 1).toLocaleDateString(AR ? 'ar' : 'en', { month: 'short' })}
 </Text>
 </View>
 ))}
 </View>
 </ScrollView>
 </NCard>

 <NSecHeader title={AR ? 'الخدمات الأكثر ربحاً' : 'Top Earning Services'} />
 {loading ? (
 <ActivityIndicator color={theme.primary} />
 ) : topServices.length === 0 ? (
 <NCard>
 <Text style={{ color: theme.textSub, textAlign: 'center' }}>{AR ? 'لا توجد إيرادات في هذه الفترة.' : 'No earnings in this period.'}</Text>
 </NCard>
 ) : (
 <NCard style={{ gap: SP.lg }}>
 {topServices.map(([label, val]) => {
 const pct = Math.round((val / totalAll) * 100);
 return (
 <View key={label}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 4 }}>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{label}</Text>
 <Text style={{ fontSize: FS.sm, color: theme.text, fontWeight: FW.bold }}>{val.toLocaleString()} {AR ? 'ر' : 'SAR'}</Text>
 </View>
 <View style={{ height: 6, backgroundColor: theme.surface3, borderRadius: R.full, overflow: 'hidden' }}>
 <View style={{ width: `${pct}%` as `${number}%`, height: '100%', backgroundColor: theme.primary }} />
 </View>
 </View>
 );
 })}
 </NCard>
 )}

 {hasData && (
 <>
 <NSecHeader title={AR ? 'التوزيع حسب نوع الحركة' : 'Breakdown by Transaction Type'} />
 <NCard>
 {Object.entries(sums).sort((a, b) => b[1] - a[1]).map(([type, amt], i) => {
 const pct = Math.round((amt / sumsTotal) * 100);
 const color = barColors[i % barColors.length];
 return (
 <View key={type} style={{ marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 4 }}>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{type}</Text>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color }}>{pct}%</Text>
 </View>
 <View style={{ height: 8, backgroundColor: theme.surface2, borderRadius: R.full }}>
 <View style={{ height: 8, width: `${pct}%` as `${number}%`, backgroundColor: color, borderRadius: R.full }} />
 </View>
 </View>
 );
 })}
 </NCard>
 </>
 )}
 </View>
 </NScroll>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 3: CLINICAL MODULES & AI COPILOT
// ══════════════════════════════════════════════════════════════════════════════

// 3.1 AI MEDICAL COPILOT
