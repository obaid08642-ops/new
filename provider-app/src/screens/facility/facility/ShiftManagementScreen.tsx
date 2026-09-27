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

function ShiftManagementScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
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
     show(error?.response?.data?.message || (AR ? 'تعذر تحميل المناوبات' : 'Unable to load shifts'), 'error');
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
   if (!memberId) return show(AR ? 'اختر الموظف' : 'Choose a staff member', 'warning');
   if (!hhmm.test(from) || !hhmm.test(to)) return show(AR ? 'الوقت بصيغة HH:MM' : 'Time must be HH:MM', 'warning');
   setSaving(true);
   try {
     await client.post('/facility/shifts', { user_id: memberId, day_of_week: day, start_time: from, end_time: to, department_id: dept.trim() || undefined });
     show(AR ? 'تمت إضافة المناوبة' : 'Shift added', 'success');
     setShowAdd(false); setMemberId('');
     await loadShifts();
   } catch (e: any) {
     show(e?.response?.data?.message || (AR ? 'فشل إضافة المناوبة' : 'Failed to add shift'), 'error');
   } finally { setSaving(false); }
 };

 return (
 <NScroll>
 <NHeader title={AR?' إدارة المناوبات':' Shift Management'} onBack={onBack} />

 {/* View toggle */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.xl }}>
 {(['today','week'] as const).map(v => (
 <TouchableOpacity key={v} onPress={() => setView(v)}
 style={[{ flex:1, paddingVertical:SP.md, borderRadius:R.lg, borderWidth:1.5, alignItems:'center' }, {
 backgroundColor: view===v ? theme.primary : theme.surface2,
 borderColor: view===v ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: view===v?'#FFF':theme.text, fontWeight: FW.semi }}>
 {v === 'today' ? (AR?'اليوم':'Today') : (AR?'الأسبوع':'Week')}
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
 {AR ? 'طبيب بديل مطلوب' : 'Substitute Doctor Needed'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.warn, textAlign: AR ? 'right' : 'left' }}>
 {needingSub ? `${needingSub.doctor || '—'} — ${needingSub.dept || '—'} — ${needingSub.from || ''}` : (AR ? 'لا توجد مناوبات تحتاج بديلاً' : 'No shifts need a substitute')}
 </Text>
 </View>
 {needingSub && (
 <NBtn label={AR?'تعيين':'Assign'} size="sm" full={false}
 style={{ paddingHorizontal: SP.lg }}
 onPress={async () => {
   try {
     await client.post(`/facility/shifts/${needingSub.id}/substitute`, {});
     await loadShifts();
     show(AR?'تم تسجيل طلب البديل':'Substitute request recorded','success');
   } catch (e: any) { show(e?.message || (AR?'فشل التعيين':'Assign failed'), 'error'); }
 }} />
 )}
 </View>
 </NCard>
 )}

 {/* Shifts */}
 <NSecHeader title={view === 'today' ? (AR ? 'مناوبات اليوم' : "Today's Shifts") : (AR ? 'مناوبات الأسبوع' : "This Week's Shifts")} />
 {loadingShifts ? <ActivityIndicator color={theme.primary} /> : visible.length === 0 ? <NEmpty title={AR ? 'لا توجد مناوبات' : 'No shifts'} sub={AR ? 'ستظهر المناوبات المحفوظة للمنشأة هنا.' : 'Saved facility shifts will appear here.'} icon="calendar" /> : visible.map((shift: any) => (
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
 label={shift.status === 'substitute' ? (AR?' بديل':' Substitute') : (AR?' مؤكد':' Confirmed')}
 variant={shift.status === 'substitute' ? 'warning' : 'success'} size="xs"
 />
 <TouchableOpacity onPress={async () => {
   try {
     await client.post(`/facility/shifts/${shift.id}/substitute`, {});
     show(AR ? 'تم تسجيل طلب البديل' : 'Substitute request recorded', 'success');
   } catch (e: any) { show(e?.message || (AR ? 'فشل الطلب' : 'Request failed'), 'error'); }
 }}>
 <Text style={{ fontSize: FS.xs, color: theme.primary }}> {AR?'طلب بديل':'Request substitute'}</Text>
 </TouchableOpacity>
 </View>
 </View>
 </NCard>
 ))}

 {!showAdd ? (
   <NBtn label={AR ? '+ إضافة مناوبة' : '+ Add shift'} onPress={() => setShowAdd(true)} />
 ) : (
   <NCard style={{ marginBottom: SP.md }}>
     <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{AR ? 'مناوبة جديدة' : 'New shift'}</Text>
     {members.length === 0 && <Text style={{ color: theme.textSub, fontSize: FS.xs }}>{AR ? 'لا يوجد موظفون — أضف حساباً فرعياً أو ادعُ مزوداً أولاً' : 'No staff — add a sub-account or invite a provider first'}</Text>}
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
     <NInput label={AR ? 'من (HH:MM)' : 'From (HH:MM)'} value={from} onChange={setFrom} icon="" />
     <NInput label={AR ? 'إلى (HH:MM)' : 'To (HH:MM)'} value={to} onChange={setTo} icon="" />
     <NInput label={AR ? 'القسم (اختياري)' : 'Department (optional)'} value={dept} onChange={setDept} icon="" />
     <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
       <NBtn label={AR ? 'إلغاء' : 'Cancel'} onPress={() => setShowAdd(false)} style={{ flex: 1, backgroundColor: theme.surface2 }} />
       <NBtn label={AR ? 'حفظ' : 'Save'} loading={saving} onPress={saveShift} style={{ flex: 1 }} />
     </View>
   </NCard>
 )}
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// BED MANAGEMENT
