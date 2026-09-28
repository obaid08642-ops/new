import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AppointmentStatus } from '../../../types/contracts';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Platform, Modal, TextInput,
 RefreshControl, Switch, ActivityIndicator, KeyboardAvoidingView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Audio } from 'expo-av';
import {
 NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,
 NHeader, NScroll, NSheet, NSearch, NToggle, NSettingsRow,
 NSecHeader, NConfirm, NEmpty, NSkeleton, NOnlineToggle,
 NBottomNav, NDivider, NPriceInput, NProfileImageUploader
} from '../../../components/ui';
import { I, IBg } from '../../../components/icons';
import { SP, R, FS, FW, API_BASE } from '../../../constants';
import { buildHeaders, Vault, SK } from '../../../security/Security';
import client from '../../../api/client';
import { useServicesCatalog, getInsuranceCatalog, useSpecialtiesCatalog } from '../../../api/catalogs';
import { VideoCallRoom } from '../../shared/VideoCallRoom';
import { InsuranceRequestsScreen } from '../../shared/InsuranceRequestsScreen';
import { WithdrawalWorkflow, MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, GlobalSystemSettings, ChatSystem, MediaConfigScreen } from '../../shared/SharedScreens';
import { DoctorStatsRow } from '../components/DoctorStatsRow';
import { DoctorUrgentRequests } from '../components/DoctorUrgentRequests';
import { DoctorQueueList } from '../components/DoctorQueueList';
import { FacilityInvitationsScreen } from '../FacilityInvitationsScreen';
import {
 PromotionsDashboard, CreateCampaignScreen, ProfileWebConfig,
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights, AiMedicalCopilot,
 SmartOutboundReferralNetwork, SosDispatchScreen, GpsRouterScreen
} from '../../shared/BlueprintScreens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { tokens } from '../../../theme/tokens';

export function StatisticsScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [period, setPeriod] = useState<'week'|'month'|'year'>('month');

 const PERIODS = [
 { k:'week', ar:'أسبوع', en:'Week' },
 { k:'month', ar:'شهر', en:'Month' },
 { k:'year', ar:'سنة', en:'Year' },
 ] as const;

 // Real period statistics from the backend (bookings + wallet ledger + ratings).
 const [stats, setStats] = useState<any>(null);
 const [statsLoading, setStatsLoading] = useState(true);
 useEffect(() => {
   let active = true;
   setStatsLoading(true);
   client.get(`/provider/stats/period?period=${period}`).then((res) => {
     if (active) setStats(res.data || null);
   }).catch(() => {
     if (active) { setStats(null); show(AR ? 'تعذر تحميل الإحصائيات' : 'Unable to load statistics', 'error'); }
   }).finally(() => { if (active) setStatsLoading(false); });
   return () => { active = false; };
 }, [period]);

 const fmtNum = (n: number) => (Number(n) || 0).toLocaleString(AR ? 'ar-SA' : 'en-US');
 const STATS = {
   revenue: stats ? fmtNum(stats.revenue) : '—',
   apts: stats ? String(stats.appointments ?? 0) : '—',
   rating: stats && stats.rating != null ? String(stats.rating) : (AR ? 'لا يوجد' : 'N/A'),
   newPts: stats ? String(stats.new_patients ?? 0) : '—',
 };

 const BAR_DATA: number[] = Array.isArray(stats?.series) ? stats.series : [];
 const maxBar = BAR_DATA.length ? Math.max(...BAR_DATA) : 1;
 const LABELS_WEEK = AR ? ['أحد','اثن','ثلا','أرب','خمس','جمع','سبت'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
 const LABELS_MONTH = AR ? Array.from({length:12},(_,i)=>`${i+1}`) : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 const LABELS = period === 'week' ? LABELS_WEEK : LABELS_MONTH;
 const SERVICE_LABELS: Record<string, { ar: string; en: string }> = {
   consultation: { ar: 'استشارة', en: 'Consultation' },
   lab: { ar: 'مختبر', en: 'Lab' },
   home_care: { ar: 'رعاية منزلية', en: 'Home Care' },
   radiology: { ar: 'أشعة', en: 'Radiology' },
 };
 const BREAKDOWN_COLORS = [tokens.info, tokens.success, tokens.warning, tokens.purple, tokens.error];
 const BREAKDOWN: Array<{ label: string; pct: number; color: string }> = (Array.isArray(stats?.service_breakdown) ? stats.service_breakdown : [])
   .map((b: any, i: number) => ({ label: SERVICE_LABELS[b.label] ? (AR ? SERVICE_LABELS[b.label].ar : SERVICE_LABELS[b.label].en) : b.label, pct: b.pct, color: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length] }));

 return (
 <NScroll>
 <NHeader title={AR ? ' الإحصائيات والتقارير' : ' Statistics & Reports'} onBack={onBack} />

 {/* Period selector */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.xl }}>
 {PERIODS.map(p => (
 <TouchableOpacity key={p.k} onPress={() => setPeriod(p.k as any)}
 style={[{ flex:1, paddingVertical:SP.md, borderRadius:R.lg, borderWidth:1.5, alignItems:'center' }, {
 backgroundColor: period===p.k ? theme.primary : theme.surface2,
 borderColor: period===p.k ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: period===p.k ? '#FFF' : theme.text, fontWeight: FW.semi }}>
 {AR ? p.ar : p.en}
 </Text>
 </TouchableOpacity>
 ))}
 </View>

 {/* KPI Cards */}
 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl }}>
 <NStatCard icon="" label={AR?'الإيرادات':'Revenue'} value={STATS.revenue} unit={AR?'ر':'SAR'} color={tokens.success} style={{ width:'47%' }} />
 <NStatCard icon="" label={AR?'المواعيد':'Appointments'} value={String(STATS.apts)} color={tokens.info} style={{ width:'47%' }} />
 <NStatCard icon="" label={AR?'التقييم':'Rating'} value={String(STATS.rating)} color={tokens.warning} style={{ width:'47%' }} />
 <NStatCard icon="" label={AR?'مرضى جدد':'New Patients'} value={String(STATS.newPts)} color={tokens.purple} style={{ width:'47%' }} />
 </View>

 {/* Bar Chart */}
 <NCard style={{ marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text,
 marginBottom: SP.lg, textAlign: AR ? 'right' : 'left' }}>
 {AR ? ' الإيرادات' : ' Revenue Trend'}
 </Text>
 {statsLoading ? (
 <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.xl }} />
 ) : BAR_DATA.length === 0 || BAR_DATA.every((v) => v === 0) ? (
 <Text style={{ color: theme.textSub, textAlign: 'center', marginVertical: SP.xl }}>
 {AR ? 'لا توجد إيرادات في هذه الفترة' : 'No revenue in this period'}
 </Text>
 ) : (
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
 <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: SP.sm, height: 120 }}>
 {BAR_DATA.map((val, i) => (
 <View key={i} style={{ alignItems: 'center', width: 36 }}>
 <View style={{
 width: 28, height: Math.max(8, (val / maxBar) * 100),
 backgroundColor: theme.primary, borderRadius: 6, opacity: 0.8,
 }} />
 <Text style={{ fontSize: 9, color: theme.textSub, marginTop: 4 }}>
 {LABELS[i] ?? i+1}
 </Text>
 </View>
 ))}
 </View>
 </ScrollView>
 )}
 </NCard>

 {/* Service Breakdown */}
 <NCard style={{ marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text,
 marginBottom: SP.lg, textAlign: AR ? 'right' : 'left' }}>
 {AR ? ' توزيع الخدمات' : ' Service Breakdown'}
 </Text>
 {BREAKDOWN.length === 0 && !statsLoading ? (
 <Text style={{ color: theme.textSub, textAlign: 'center', marginVertical: SP.md }}>
 {AR ? 'لا توجد خدمات في هذه الفترة' : 'No services in this period'}
 </Text>
 ) : BREAKDOWN.map((item, i) => (
 <View key={i} style={{ marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 4 }}>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{item.label}</Text>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: item.color }}>{item.pct}%</Text>
 </View>
 <View style={{ height: 8, backgroundColor: theme.surface2, borderRadius: R.full }}>
 <View style={{ height: 8, width: `${item.pct}%`, backgroundColor: item.color, borderRadius: R.full }} />
 </View>
 </View>
 ))}
 </NCard>

 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// DOCTOR AVAILABILITY SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export function DoctorServiceSlotsCard() {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [serviceType, setServiceType] = useState('clinic');
 const [slots, setSlots] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [day, setDay] = useState('1');
 const [start, setStart] = useState('09:00');
 const [end, setEnd] = useState('17:00');
 const [saving, setSaving] = useState(false);
 const TYPES = ['clinic', 'video', 'voice', 'home'];
 const DAYS = ['0', '1', '2', '3', '4', '5', '6'];

 async function load() {
   setLoading(true);
   try {
     const res = await client.get('/provider/schedule-slots');
     setSlots(Array.isArray(res.data) ? res.data : []);
   } catch {
     show(AR ? 'تعذر تحميل المواعيد' : 'Could not load slots', 'error');
   } finally {
     setLoading(false);
   }
 }
 useEffect(() => { load(); }, []);

 async function add() {
   const d = Number(day);
   if (!Number.isInteger(d) || d < 0 || d > 6) { show(AR ? 'أدخل اليوم (0-6)' : 'Enter day (0-6)', 'error'); return; }
   if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) { show(AR ? 'أدخل الوقت بصيغة HH:MM' : 'Enter time as HH:MM', 'error'); return; }
   setSaving(true);
   try {
     await client.post('/provider/schedule-slots', { day_of_week: d, start_time: start, end_time: end, service_type: serviceType });
     show(AR ? 'تم الإرسال — تُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
     load();
   } catch (err: any) {
     show(err?.response?.data?.message || (AR ? 'تعذر الحفظ' : 'Could not save'), 'error');
   } finally {
     setSaving(false);
   }
 }

 async function remove(id: string) {
   try {
     await client.delete(`/provider/schedule-slots/${id}`);
     show(AR ? 'تم الإرسال — يُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
     load();
   } catch {
     show(AR ? 'تعذر الحذف' : 'Could not delete', 'error');
   }
 }

 const visible = slots.filter((s) => (s.service_type || 'all') === serviceType || (s.service_type || 'all') === 'all');
 return (
 <NCard style={{ marginBottom: SP.xl }}>
 <NSecHeader title={AR ? 'مواعيد كل خدمة على حدة' : 'Per-service slots'} />
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 6, flexWrap: 'wrap', marginBottom: SP.md }}>
 {TYPES.map((t) => (
 <TouchableOpacity key={t} onPress={() => setServiceType(t)} style={{ paddingHorizontal: SP.md, paddingVertical: 6, borderRadius: R.full, borderWidth: 1.5, borderColor: serviceType === t ? theme.primary : theme.border, backgroundColor: serviceType === t ? theme.primary : theme.surface2 }}>
 <Text style={{ color: serviceType === t ? '#FFF' : theme.text, fontSize: FS.xs }}>{t}</Text>
 </TouchableOpacity>
 ))}
 </View>
 {loading ? <ActivityIndicator color={theme.primary} /> : visible.length === 0 ? (
 <Text style={{ color: theme.textSub, fontSize: FS.sm }}>{AR ? 'لا توجد مواعيد لهذه الخدمة — تُطبق المواعيد العامة (all) إن وجدت' : 'No slots for this service — general (all) slots apply if present'}</Text>
 ) : visible.map((s: any) => (
 <View key={String(s.id)} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
 <Text style={{ color: theme.text, fontSize: FS.sm }}>{AR ? `يوم ${s.day_of_week}` : `Day ${s.day_of_week}`} · {s.start_time}–{s.end_time} · {s.service_type || 'all'}</Text>
 <TouchableOpacity onPress={() => remove(String(s.id))}><Text style={{ color: theme.danger, fontSize: FS.sm }}>{AR ? 'حذف' : 'Delete'}</Text></TouchableOpacity>
 </View>
 ))}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginTop: SP.md }}>
 <View style={{ flex: 1 }}><NInput label={AR ? 'اليوم (0-6)' : 'Day (0-6)'} value={day} onChange={setDay} kbType="numeric" maxLen={1} /></View>
 <View style={{ flex: 1 }}><NInput label={AR ? 'من (HH:MM)' : 'From (HH:MM)'} value={start} onChange={setStart} maxLen={5} /></View>
 <View style={{ flex: 1 }}><NInput label={AR ? 'إلى (HH:MM)' : 'To (HH:MM)'} value={end} onChange={setEnd} maxLen={5} /></View>
 </View>
 <NBtn label={AR ? 'إضافة موعد' : 'Add slot'} loading={saving} onPress={add} style={{ marginTop: SP.md }} />
 </NCard>
 );
}

