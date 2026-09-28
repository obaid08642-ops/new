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

export function FacilityHomeTab({ onNavigate, wards, onTriggerAlarm, branches, selectedBranch, onSelectBranch }: { onNavigate: (s: string, p?: any) => void; wards: any[]; onTriggerAlarm?: () => void; branches?: any[]; selectedBranch?: string; onSelectBranch?: (id: string) => void }) {
 const insets = useSafeAreaInsets();
 const { theme } = useTheme();
 const { lang } = useLang();
 const { user } = useAuth();
 const AR = lang === 'ar';
 const [refreshing, setRefreshing] = useState(false);
 const [todayApts, setTodayApts] = useState<any[]>([]);
 const [subaccounts, setSubaccounts] = useState<any[]>([]);
 const [todayStats, setTodayStats] = useState<any>(null);
 const [surgeriesLive, setSurgeriesLive] = useState<any[]>([]);
 useEffect(() => {
   client.get('/provider/jobs/queue?status=active&kind=appointment&today=true').then(r => setTodayApts(r.data || [])).catch(() => {});
   client.get('/hospital/staff').then(r => setSubaccounts(r.data || [])).catch(() => {});
   client.get('/provider/stats/today').then(r => setTodayStats(r.data || null)).catch(() => {});
   client.get('/facility/surgeries/schedule').then(r => setSurgeriesLive(Array.isArray(r.data) ? r.data : [])).catch(() => {});
 }, []);

 const onRefresh = async () => {
 setRefreshing(true);
 try {
 const [q, s, st, sg] = await Promise.all([
 client.get('/provider/jobs/queue?status=active&kind=appointment&today=true'),
 client.get('/hospital/staff'),
 client.get('/provider/stats/today'),
 client.get('/facility/surgeries/schedule').catch(() => null),
 ]);
 setTodayApts(q.data || []);
 setSubaccounts(s.data || []);
 setTodayStats(st.data || null);
 if (sg && Array.isArray(sg.data)) setSurgeriesLive(sg.data);
 } catch { /* keep existing data */ } finally { setRefreshing(false); }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 {/* Top Bar */}
 <View style={[s.topBar, {
 backgroundColor: theme.surface, borderBottomColor: theme.border,
 flexDirection: AR ? 'row-reverse' : 'row', paddingTop: Math.max(insets.top, 16) }]}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <View style={{ width: 44, height: 44, borderRadius: R.md,
 backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
<I name="facility" size={24} color={theme.primary} />
 </View>
 <View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>
 {AR ? 'مرحباً،' : 'Hello,'}
 </Text>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
 {AR ? 'مستشفى نبضة الطبي' : 'Nabdah Medical Hospital'}
 </Text>
 </View>
 </View>
 <View style={{ flexDirection: 'row', gap: SP.sm }}>
 <TouchableOpacity style={[s.iconBtn, { backgroundColor: theme.surface2 }]}
 onPress={() => onNavigate('qr_checkin')}>
 <I name="qr" size={20} color={theme.text} />
 </TouchableOpacity>
 <TouchableOpacity style={[s.iconBtn, { backgroundColor: theme.surface2 }]} onPress={() => onNavigate('notifications')}>
 <I name="bell" size={20} color={theme.text} />
 <View style={[s.notifDot, { backgroundColor: theme.danger }]} />
 </TouchableOpacity>
 </View>
 </View>

  {branches && branches.length > 1 && (
    <View style={{ paddingHorizontal: SP.xl, paddingVertical: SP.sm, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
          {branches.map(b => (
            <TouchableOpacity key={b.id} onPress={() => onSelectBranch && onSelectBranch(b.id)}
              style={{
                paddingHorizontal: SP.md, paddingVertical: 6, borderRadius: R.full,
                backgroundColor: selectedBranch === b.id ? theme.primary : theme.surface2,
                borderWidth: 1, borderColor: selectedBranch === b.id ? theme.primary : theme.border
              }}>
              <Text style={{ fontSize: FS.xs, color: selectedBranch === b.id ? '#FFF' : theme.text, fontWeight: FW.bold }}>
                {AR ? b.name_ar : b.name_en}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  )}

 <ScrollView
 refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
 contentContainerStyle={{ padding: SP.xl, paddingBottom: 100 }}
 showsVerticalScrollIndicator={false}
 >
 {/* KPI Stats */}
 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl }}>
 {(() => {
 // Real data only — no fabricated KPIs. Beds come from live wards,
 // revenue/appointments from /provider/stats/today, staff from subaccounts.
 const totalBeds = (wards || []).reduce((a: number, w: any) => a + (w.total_beds || 0), 0);
 const availBeds = (wards || []).reduce((a: number, w: any) => a + (w.available_beds || 0), 0);
 const occupied = totalBeds - availBeds;
 const activeStaff = subaccounts.filter((st: any) => st.status === 'active').length;
 const aptsToday = todayStats?.todayCount ?? todayApts.length;
 const revenue = todayStats?.revenue;
 return (<>
 <NStatCard icon="calendar" label={AR ? 'مواعيد اليوم' : "Today's Apts"} value={String(aptsToday)} color={tokens.info} style={{ width: '47%' }} />
 <NStatCard icon="bed" label={AR ? 'أسرّة مشغولة' : 'Occupied Beds'} value={totalBeds > 0 ? `${occupied}/${totalBeds}` : '—'} color={tokens.warning} style={{ width: '47%' }} />
 <NStatCard icon="money" label={AR ? 'إيرادات اليوم' : "Today's Rev."} value={typeof revenue === 'number' ? revenue.toLocaleString() : '—'} unit={AR?'ر':'SAR'} color={tokens.success} style={{ width: '47%' }} />
 <NStatCard icon="users" label={AR ? 'الكوادر النشطة' : 'Active Staff'} value={String(activeStaff)} color={tokens.purple} style={{ width: '47%' }} />
 </>);
 })()}
 </View>

  {/* Live Operational Command Center */}
  <NSecHeader title={AR ? ' مركز العمليات المباشر' : ' Live Command Center'} 
              action={AR ? 'توسيع' : 'Expand'} onAction={() => onNavigate('hospital_dispatch')} />
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SP.xl }}>
    <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, paddingHorizontal: SP.xs }}>
      <NCard style={{ width: 150, backgroundColor: theme.surface2, borderColor: theme.danger }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
          <I name="ambulance" size={24} color={theme.primary} />
          <View style={[s.notifDot, { position: 'relative', top: 0, right: 0, backgroundColor: theme.danger }]} />
        </View>
        <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
          {AR ? 'طوارئ نشطة' : 'Active ER'}
        </Text>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.xbold, color: theme.danger, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>
          {todayApts.filter((a: any) => String(a.type || a.kind || '').toLowerCase().includes('emergency')).length} <Text style={{ fontSize: FS.xs, color: theme.textSub, fontWeight: FW.med }}>{AR ? 'حالات' : 'cases'}</Text>
        </Text>
      </NCard>

      <NCard style={{ width: 150, backgroundColor: theme.surface2, borderColor: theme.warn }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
          <I name="surgery" size={24} color={theme.primary} />
          <View style={[s.notifDot, { position: 'relative', top: 0, right: 0, backgroundColor: theme.warn }]} />
        </View>
        <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
          {AR ? 'غرف العمليات' : 'Active ORs'}
        </Text>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.xbold, color: theme.warn, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>
          {surgeriesLive.filter((s: any) => ['in_progress', 'in-progress', 'ongoing'].includes(String(s.status || '').toLowerCase())).length} <Text style={{ fontSize: FS.xs, color: theme.textSub, fontWeight: FW.med }}>{AR ? 'قيد الإجراء' : 'in progress'}</Text>
        </Text>
      </NCard>

      <NCard style={{ width: 150, backgroundColor: theme.surface2, borderColor: theme.primary }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
          <I name="stethoscope" size={24} color={theme.primary} />
          <View style={[s.notifDot, { position: 'relative', top: 0, right: 0, backgroundColor: theme.primary }]} />
        </View>
        <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
          {AR ? 'عيادات تعمل' : 'Running Clinics'}
        </Text>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.xbold, color: theme.primary, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>
          {subaccounts.filter((st: any) => String(st.staff_role || st.role || '').toLowerCase().includes('doctor')).length} <Text style={{ fontSize: FS.xs, color: theme.textSub, fontWeight: FW.med }}>{AR ? 'طبيب' : 'doctors'}</Text>
        </Text>
      </NCard>
    </View>
  </ScrollView>
 {/* Quick Actions */}
 <NSecHeader title={AR ? 'إجراءات سريعة' : 'Quick Actions'} />
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SP.xl }}>
 <View style={{ flexDirection: 'row', gap: SP.md, paddingRight: SP.xl }}>
 {[
  { icon: '◈', ar: 'المحفظة\nوالإيرادات', en: 'Wallet &\nRevenue', screen: 'financial' },
  { icon: '', ar: 'إدارة\nالكوادر', en: 'Manage\nStaff', screen: 'subaccounts' },
  { icon:'', ar:'طلبات\nالإجازة', en:'Leave\nRequests', screen:'leave_requests' },
  { icon:'', ar:'إدارة\nالموارد', en:'Resources', screen:'resources' },
 { icon: '', ar: 'الأقسام', en: 'Departments', screen: 'departments' },
 { icon:'', ar:'إدارة\nالأسرّة', en:'Bed\nManagement', screen:'beds' },
 { icon:'', ar:'إدارة\nالمناوبات', en:'Shift\nMgmt', screen:'shifts' },
 { icon: '', ar: 'جدول\nالعمليات', en: 'Surgery\nSchedule',screen: 'surgery_sched' },
 { icon: '', ar: 'مطالبات\nالتأمين', en: 'Insurance\nClaims',screen: 'insurance_hub' },
 { icon: '', ar: 'الحضور\nوالانصراف', en: 'Attendance', screen: 'attendance' },
 { icon: '', ar: 'التوثيق\nالمهني', en: 'Credentialing', screen: 'credentialing' },
 { icon:'', ar:'تتبع\nالمرضى', en:'Patient\nTracker', screen:'patient_tracker' },
 { icon: '', ar: 'لوحة\nالتوجيه', en: 'Dispatch\nPanel', screen: 'hospital_dispatch' },
 { icon:'', ar:'التواصل\nالداخلي', en:'Internal\nChat', screen:'internal_chat' },
 { icon:'', ar:'سجل\nالتدقيق', en:'Audit\nLogs', screen:'audit_logs' },
 { icon:'', ar:'التعاميم\nوالإعلانات', en:'Broadcasts', screen:'announcements' },
 ].map(qa => (
 <TouchableOpacity key={qa.screen} onPress={() => onNavigate(qa.screen)}
 style={[s.quickAction, { backgroundColor: theme.card, borderColor: theme.border }]}>
 <Text style={{ fontSize: 28, marginBottom: SP.xs }}>{qa.icon}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.text, fontWeight: FW.med,
 textAlign: 'center', lineHeight: 16 }}>
 {AR ? qa.ar : qa.en}
 </Text>
 </TouchableOpacity>
 ))}
 </View>
 </ScrollView>

 {/* Bed Availability */}
 <NSecHeader title={AR?' الأسرّة':' Bed Availability'}
 action={AR ? 'التفاصيل' : 'Details'} onAction={() => onNavigate('beds')} />
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SP.xl }}>
 <View style={{ flexDirection: 'row', gap: SP.md, paddingRight: SP.xl }}>
 {wards.length === 0 ? (
 <Text style={{ color: theme.textSub, marginHorizontal: SP.lg, paddingVertical: SP.md }}>{AR ? 'لا توجد أجنحة مضافة' : 'No wards added'}</Text>
 ) : wards.map((ward, i) => {
 const total = ward.total_beds || 0;
 const available = ward.available_beds || 0;
 const occupied = total - available;
 const pct = total > 0 ? occupied / total : 0;
 const color = available === 0 ? tokens.error : available <= 2 ? tokens.warning : tokens.success;
 return (
 <NCard key={ward.id || i} style={{ width: 120, padding: SP.lg }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.xs,
 textAlign: 'center' }} numberOfLines={1}>{ward.name}</Text>
 <Text style={{ fontSize: FS['2xl'], fontWeight: FW.xbold, color: color, textAlign: 'center' }}>
 {available}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: 'center' }}>
 {AR ? 'متاح' : 'free'}
 </Text>
 <View style={{ height: 4, backgroundColor: theme.surface2, borderRadius: R.full, marginTop: SP.sm }}>
 <View style={{ height: 4, width: `${pct * 100}%`, backgroundColor: color, borderRadius: R.full }} />
 </View>
 <Text style={{ fontSize: 9, color: theme.textSub, textAlign: 'center', marginTop: 2 }}>
 {occupied}/{total}
 </Text>
 </NCard>
 );
 })}
 </View>
 </ScrollView>

 {/* Today's Schedule */}
 <NSecHeader title={AR ? " جدول اليوم" : " Today's Schedule"}
 action={AR ? 'الكل' : 'All'} onAction={() => onNavigate('unified_sched')} />
 {todayApts.map(apt => {
 const typeColor = apt.type === 'emergency' ? theme.danger : apt.type === 'surgery' ? theme.warn : theme.primary;
 return (
 <NCard key={apt.id} style={{ marginBottom: SP.sm, padding: SP.lg }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <View style={[s.timeTag, { backgroundColor: theme.primaryLight }]}>
 <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold }}>{apt.time}</Text>
 </View>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left' }}>{apt.patient}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {apt.doctor} · {apt.dept}
 </Text>
 </View>
 <View style={{ alignItems: 'flex-end', gap: 4 }}>
 <NBadge label={AR
 ? (apt.type === 'emergency' ? ' طوارئ' : apt.type === 'surgery' ? ' عملية' : ' كشف')
 : (apt.type === 'emergency' ? ' ER' : apt.type === 'surgery' ? ' Surgery' : ' OPD')}
 variant={apt.type === 'emergency' ? 'danger' : apt.type === 'surgery' ? 'warning' : 'primary'}
 size="xs" />
 <NBadge label={apt.status === 'in_progress' ? (AR?'جارٍ':'Active') : apt.status === 'confirmed' ? (AR?'مؤكد':'Confirmed') : (AR?'انتظار':'Pending')}
 variant={apt.status === 'in_progress' ? 'warning' : 'success'} size="xs" />
 </View>
 </View>
 </NCard>
 );
 })}

 {/* Active Staff */}
 <NSecHeader title={AR ? ' الكوادر النشطة اليوم' : ' Active Staff Today'}
 action={AR ? 'إدارة' : 'Manage'} onAction={() => onNavigate('subaccounts')} />
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SP.xl }}>
 <View style={{ flexDirection: 'row', gap: SP.md }}>
 {subaccounts.filter((s: any) => s.status === 'active').map((staff: any) => (
 <View key={staff.id} style={{ alignItems: 'center', width: 72 }}>
 <NAvatar name={staff.name} size={50} online={staff.status === 'active'} />
 <Text style={{ fontSize: FS.xs, color: theme.text, textAlign: 'center',
 marginTop: SP.xs }} numberOfLines={2}>{staff.name.split(' ')[1]}</Text>
 <Text style={{ fontSize: 9, color: theme.textSub, textAlign: 'center' }}>{staff.spec}</Text>
 </View>
 ))}
 </View>
 </ScrollView>
 </ScrollView>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-ACCOUNTS MANAGEMENT
