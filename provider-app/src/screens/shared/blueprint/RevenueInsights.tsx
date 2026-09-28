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

export function RevenueInsights({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const AR = lang === 'ar';
 const [ledger, setLedger] = useState<any>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
   // Live data only — no fabricated revenue figures.
   client.get('/provider/ops/wallet/ledger')
     .then(r => setLedger(r.data || null))
     .catch(() => setLedger(null))
     .finally(() => setLoading(false));
 }, []);

 const txns: any[] = Array.isArray(ledger?.transactions) ? ledger.transactions : [];
 const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
 const monthEarnings = txns
   .filter((t: any) => t.type === 'provider_earning' && new Date(t.createdAt) >= monthStart)
   .reduce((s: number, t: any) => s + (t.amount || 0), 0);
 // Previous month for an honest comparison.
 const prevStart = new Date(monthStart); prevStart.setMonth(prevStart.getMonth() - 1);
 const prevEarnings = txns
   .filter((t: any) => t.type === 'provider_earning' && new Date(t.createdAt) >= prevStart && new Date(t.createdAt) < monthStart)
   .reduce((s: number, t: any) => s + (t.amount || 0), 0);
 const delta = prevEarnings > 0 ? Math.round(((monthEarnings - prevEarnings) / prevEarnings) * 100) : null;
 // Earnings grouped by real reference (service/booking type if present, else type).
 const byRef: Record<string, number> = {};
 txns.filter((t: any) => t.type === 'provider_earning')
   .forEach((t: any) => { const k = t.service_type || t.reference_type || 'other'; byRef[k] = (byRef[k] || 0) + (t.amount || 0); });
 const topServices = Object.entries(byRef).sort((a, b) => b[1] - a[1]).slice(0, 5);
 const totalAll = topServices.reduce((s, [, v]) => s + v, 0) || 1;

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'تفاصيل الإيرادات والتحليلات' : 'Revenue Insights'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>

 <NCard style={{ backgroundColor: theme.surface2 }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{AR ? 'صافي أرباح الشهر الحالي' : 'Net earnings this month'}</Text>
 <Text style={{ fontSize: FS['3xl'], fontWeight: '800', color: theme.primary, textAlign: AR ? 'right' : 'left', marginVertical: SP.xs }}>
 {loading ? '…' : `${monthEarnings.toLocaleString()} ${AR ? 'ريال' : 'SAR'}`}
 </Text>
 {delta !== null && (
 <Text style={{ fontSize: FS.xs, color: delta >= 0 ? theme.success : theme.danger, textAlign: AR ? 'right' : 'left' }}>
 {delta >= 0 ? '↗' : '↘'} {Math.abs(delta)}% {AR ? 'مقارنة بالشهر الماضي' : 'vs last month'}
 </Text>
 )}
 </NCard>

 <NSecHeader title={AR ? 'الخدمات الأكثر ربحاً' : 'Top Earning Services'} />
 {loading ? (
 <ActivityIndicator color={theme.primary} />
 ) : topServices.length === 0 ? (
 <NCard>
 <Text style={{ color: theme.textSub, textAlign: 'center' }}>{AR ? 'لا توجد إيرادات بعد — ستظهر هنا فور اكتمال أول خدمة مدفوعة.' : 'No earnings yet — they will appear here once your first paid service completes.'}</Text>
 </NCard>
 ) : (
 <NCard style={{ gap: SP.lg }}>
 {topServices.map(([label, val], idx) => {
 const pct = Math.round((val / totalAll) * 100);
 return (
 <View key={idx}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 4 }}>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{label}</Text>
 <Text style={{ fontSize: FS.sm, color: theme.text, fontWeight: FW.bold }}>{val.toLocaleString()} {AR ? 'ر' : 'SAR'}</Text>
 </View>
 <View style={{ height: 6, backgroundColor: theme.surface3, borderRadius: R.full, overflow: 'hidden' }}>
 <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: theme.primary }} />
 </View>
 </View>
 );
 })}
 </NCard>
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
