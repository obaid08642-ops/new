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
import {
 PromotionsDashboard, CreateCampaignScreen, 
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights
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

export function ShiftManagementScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang, t: tt } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [view, setView] = useState<'today'|'week'>('today');
 const [shifts, setShifts] = useState<any[]>([]);
 const [loadingShifts, setLoadingShifts] = useState(true);
 const loadShifts = useCallback(async () => {
   setLoadingShifts(true);
   try {
     const response = await client.get('/facility/shifts');
     setShifts(Array.isArray(response.data) ? response.data : (response.data?.items || []));
   } catch (error: any) {
     setShifts([]);
     show(error?.response?.data?.message || (tt('shift.32e0e307')), 'error');
   } finally { setLoadingShifts(false); }
 }, [AR, show]);
 useEffect(() => { loadShifts(); }, [loadShifts]);
 const needingSub = shifts.find((s: any) => s.status === 'substitute');

 const DAYS = AR
 ? ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
 : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
 const DAY_KEYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
 const todayKey = DAY_KEYS[new Date().getDay()];
 const visible = view === 'today' ? shifts.filter((sh: any) => !sh.day_of_week || sh.day_of_week === todayKey) : shifts;

 // Add shift: facility members = sub-accounts it created + providers linked to it by invitation
 const [showAdd, setShowAdd] = useState(false);
 const [members, setMembers] = useState<Array<{ id: string; name: string }>>([]);
 const [memberId, setMemberId] = useState('');
 const [day, setDay] = useState(todayKey);
 const [from, setFrom] = useState('08:00');
 const [to, setTo] = useState('16:00');
 const [dept, setDept] = useState('');
 const [saving, setSaving] = useState(false);
 useEffect(() => {
   if (!showAdd) return;
   Promise.all([client.get('/hospital/staff').catch(() => null), client.get('/provider/facility/subaccounts').catch(() => null)]).then(([st, sub]) => {
     const a = (Array.isArray(st?.data) ? st!.data : []).map((x: any) => ({ id: x.user_id, name: x.full_name || x.email }));
     const b = (Array.isArray(sub?.data) ? sub!.data : []).map((x: any) => ({ id: x.id, name: x.name || x.email }));
     const seen = new Set<string>();
     setMembers([...a, ...b].filter(m => m.id && !seen.has(m.id) && seen.add(m.id)));
   });
 }, [showAdd]);
 const saveShift = async () => {
   const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
   if (!memberId) return show(tt('shift.d349ca01'), 'warning');
   if (!hhmm.test(from) || !hhmm.test(to)) return show(tt('shift.20fdcc3e'), 'warning');
   setSaving(true);
   try {
     await client.post('/facility/shifts', { user_id: memberId, day_of_week: day, start_time: from, end_time: to, department_id: dept.trim() || undefined });
     show(tt('shift.44896bfc'), 'success');
     setShowAdd(false); setMemberId('');
     await loadShifts();
   } catch (e: any) {
     show(e?.response?.data?.message || (tt('shift.f0a661b9')), 'error');
   } finally { setSaving(false); }
 };

 return (
 <NScroll>
 <NHeader title={tt('shift.b1792d3d')} onBack={onBack} />

 {/* View toggle */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.xl }}>
 {(['today','week'] as const).map(v => (
 <TouchableOpacity key={v} onPress={() => setView(v)}
 style={[{ flex:1, paddingVertical:SP.md, borderRadius:R.lg, borderWidth:1.5, alignItems:'center' }, {
 backgroundColor: view===v ? theme.primary : theme.surface2,
 borderColor: view===v ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: view===v?'#FFF':theme.text, fontWeight: FW.semi }}>
 {v === 'today' ? (tt('shift.f9c0a643')) : (tt('shift.85769b6c'))}
 </Text>
 </TouchableOpacity>
 ))}
 </View>

 {/* Alert for substitute — shown only when a real shift needs one */}
 {needingSub && (
 <NCard style={{ backgroundColor: theme.warnBg, marginBottom: SP.xl }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
<I name="alert" size={24} color={"#F0A526"} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.warn,
 textAlign: AR ? 'right' : 'left' }}>
 {tt('shift.dd5a44e0')}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.warn, textAlign: AR ? 'right' : 'left' }}>
 {needingSub ? `${needingSub.doctor || '—'} — ${needingSub.dept || '—'} — ${needingSub.from || ''}` : (tt('shift.0cd3fa7c'))}
 </Text>
 </View>
 {needingSub && (
 <NBtn label={tt('shift.723ead89')} size="sm" full={false}
 style={{ paddingHorizontal: SP.lg }}
 onPress={async () => {
   try {
     await client.post(`/facility/shifts/${needingSub.id}/substitute`, {});
     await loadShifts();
     show(tt('shift.ff60ac0f'),'success');
   } catch (e: any) { show(e?.message || (tt('shift.b9bc9dc4')), 'error'); }
 }} />
 )}
 </View>
 </NCard>
 )}

 {/* Shifts */}
 <NSecHeader title={view === 'today' ? (tt('shift.e80010db')) : (tt('shift.2ea482d8'))} />
 {loadingShifts ? <ActivityIndicator color={theme.primary} /> : visible.length === 0 ? <NEmpty title={tt('shift.3e3d4af9')} sub={tt('shift.1e10df77')} icon="calendar" /> : visible.map((shift: any) => (
 <NCard key={shift.id} style={{ marginBottom: SP.md }}
 accent={shift.status === 'substitute' ? theme.warn : theme.primary}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <NAvatar name={shift.doctor} size={44} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text,
 textAlign: AR ? 'right' : 'left' }}>{shift.doctor}</Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {shift.dept} · {shift.from} – {shift.to}
 </Text>
 </View>
 <View style={{ alignItems: 'flex-end', gap: SP.xs }}>
 <NBadge
 label={shift.status === 'substitute' ? (tt('shift.7e241e65')) : (tt('shift.7b7aad63'))}
 variant={shift.status === 'substitute' ? 'warning' : 'success'} size="xs"
 />
 <TouchableOpacity onPress={async () => {
   try {
     await client.post(`/facility/shifts/${shift.id}/substitute`, {});
     show(tt('shift.ff60ac0f'), 'success');
   } catch (e: any) { show(e?.message || (tt('shift.4c2d1900')), 'error'); }
 }}>
 <Text style={{ fontSize: FS.xs, color: theme.primary }}> {tt('shift.05d64db7')}</Text>
 </TouchableOpacity>
 </View>
 </View>
 </NCard>
 ))}

 {!showAdd ? (
   <NBtn label={tt('shift.0a945820')} onPress={() => setShowAdd(true)} />
 ) : (
   <NCard style={{ marginBottom: SP.md }}>
     <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{tt('shift.ba6aa707')}</Text>
     {members.length === 0 && <Text style={{ color: theme.textSub, fontSize: FS.xs }}>{tt('shift.fa217b8b')}</Text>}
     <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.xs, marginBottom: SP.sm }}>
       {members.map(m => (
         <TouchableOpacity key={m.id} onPress={() => setMemberId(m.id)} style={{ paddingHorizontal: SP.md, paddingVertical: SP.xs, borderRadius: R.lg, borderWidth: 1, borderColor: memberId === m.id ? theme.primary : theme.border, backgroundColor: memberId === m.id ? theme.primaryLight : theme.surface2 }}>
           <Text style={{ color: theme.text, fontSize: FS.xs }}>{m.name}</Text>
         </TouchableOpacity>
       ))}
     </View>
     <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.xs, marginBottom: SP.sm }}>
       {DAY_KEYS.map((k, i) => (
         <TouchableOpacity key={k} onPress={() => setDay(k)} style={{ paddingHorizontal: SP.sm, paddingVertical: SP.xs, borderRadius: R.lg, borderWidth: 1, borderColor: day === k ? theme.primary : theme.border, backgroundColor: day === k ? theme.primaryLight : theme.surface2 }}>
           <Text style={{ color: theme.text, fontSize: FS.xs }}>{DAYS[i]}</Text>
         </TouchableOpacity>
       ))}
     </View>
     <NInput label={tt('shift.3615a8ba')} value={from} onChange={setFrom} icon="" />
     <NInput label={tt('shift.38d72e86')} value={to} onChange={setTo} icon="" />
     <NInput label={tt('shift.39d6d08f')} value={dept} onChange={setDept} icon="" />
     <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
       <NBtn label={tt('shift.210b779f')} onPress={() => setShowAdd(false)} style={{ flex: 1, backgroundColor: theme.surface2 }} />
       <NBtn label={tt('shift.0360038b')} loading={saving} onPress={saveShift} style={{ flex: 1 }} />
     </View>
   </NCard>
 )}
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// BED MANAGEMENT
