/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║ NABDAH PLUS – PHASE 2 · MEDICAL FACILITY DASHBOARD ║
 * ║ ║
 * ║ FacilityDashboardNavigator — main navigator ║
 * ║ FacilityHomeTab — dashboard + stats + requests ║
 * ║ SubAccountsScreen — manage doctors / staff sub-accounts ║
 * ║ AddSubAccountScreen — add new doctor/staff with Credential Card ║
 * ║ DepartmentManagementScreen — manage departments + assigned doctors ║
 * ║ ShiftManagementScreen — shift scheduling + substitutes ║
 * ║ BedManagementScreen — bed availability + ICU + admissions ║
 * ║ UnifiedScheduleScreen — facility-wide appointment calendar ║
 * ║ QRCheckinScreen — patient QR check-in system ║
 * ║ InsuranceClaimsHubScreen — all insurance claims management ║
 * ║ FacilityFinancialScreen — unified financial reports ║
 * ║ StaffAttendanceScreen — staff check-in/out attendance ║
 * ║ SurgeryScheduleScreen — OT/Surgery room scheduling ║
 * ║ CredentialingScreen — doctor credential verification workflow ║
 * ║ FacilitySettingsScreen — all facility settings ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
import React, { useState, useRef, useEffect } from 'react';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Platform, Switch,
 RefreshControl, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../context';
import {
 NBtn, NCard, NInput, NPhoneInput, NStatCard, NAvatar,
 NBadge, NHeader, NScroll, NSheet, NSearch, NToggle,
 NSettingsRow, NSecHeader, NConfirm, NEmpty, NSkeleton,
 NOnlineToggle, NBottomNav, NDivider, NPriceInput, NRadio
} from '../../components/ui';
import { SP, R, FS, FW, SPECIALTIES, C } from '../../constants';
import { Validate, Vault } from '../../security/Security';
import client from '../../api/client';
import {
 PromotionsDashboard, CreateCampaignScreen, ProfileWebConfig,
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights,
 SosDispatchScreen, GpsRouterScreen
} from '../shared/BlueprintScreens';
import { FacilityProfileConfigScreen } from './FacilityProfileConfigScreen';
import { FacilityInvitationScreen } from './FacilityInvitationScreen';
import { FacilityResourcesScreen } from './FacilityResourcesScreen';
import { FacilityLeaveRequestsScreen } from './FacilityLeaveRequestsScreen';
import { FacilityUnifiedCalendarScreen } from './FacilityUnifiedCalendarScreen';
import { FacilityInternalChatScreen } from './FacilityInternalChatScreen';
import { FacilityAuditLogScreen } from './FacilityAuditLogScreen';
import { FacilityAnnouncementsScreen } from './FacilityAnnouncementsScreen';
import { FacilityPatientTrackerScreen } from './FacilityPatientTrackerScreen';
import { DischargeSummaryScreen } from './DischargeSummaryScreen';
import { MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, FeatureUnderDevelopmentScreen, ProviderWalletScreen, ProviderHomeStats, GlobalSystemSettings, StatisticsReports } from '../shared/SharedScreens';
import { NotificationsCenterScreen, TechnicalSupportTicketsScreen } from '../shared/RealScreens';

const { width: W } = Dimensions.get('window');

// Connected to backend APIs for facility subaccounts, beds, appointments, and shifts

// ══════════════════════════════════════════════════════════════════════════════
// FACILITY ORDERS TAB (SUB-TABS FOR BEDS AND SURGERIES)
// ══════════════════════════════════════════════════════════════════════════════

function FacilityOrdersTab({ onNavigate, onRefresh }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [tab, setTab] = useState<'pending'|'active'>('pending');
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    client.get('/facility/inbox').then(res => setOrders(res.data || []));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[s.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{AR ? 'الطلبات' : 'Orders'}</Text>
      </View>

      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', borderBottomWidth: 1, borderColor: theme.border }}>
        <TouchableOpacity style={{ flex: 1, padding: SP.md, alignItems: 'center', borderBottomWidth: tab === 'pending' ? 2 : 0, borderColor: theme.primary }} onPress={() => setTab('pending')}>
          <Text style={{ color: tab === 'pending' ? theme.primary : theme.textSub, fontWeight: FW.bold }}>{AR ? 'طلبات جديدة' : 'New'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, padding: SP.md, alignItems: 'center', borderBottomWidth: tab === 'active' ? 2 : 0, borderColor: theme.primary }} onPress={() => setTab('active')}>
          <Text style={{ color: tab === 'active' ? theme.primary : theme.textSub, fontWeight: FW.bold }}>{AR ? 'مؤكدة' : 'Confirmed'}</Text>
        </TouchableOpacity>
      </View>

      {tab === 'pending' && (
        <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
          {orders.length === 0 && <NEmpty title={AR ? 'لا توجد طلبات' : 'No Orders'} icon="document" />}
          {orders.map(order => (
            <NCard key={order.id} style={{ marginBottom: SP.md }} onPress={() => onNavigate('order_detail', order)}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{order.patient_name || 'Patient'}</Text>
                <NBadge label={AR ? 'جديد' : 'New'} variant="info" size="xs" />
              </View>
              <Text style={{ color: theme.textSub, marginTop: SP.sm, textAlign: AR ? 'right' : 'left' }}>{order.svc} - {order.total} SAR</Text>
            </NCard>
          ))}
        </ScrollView>
      )}

      {tab === 'active' && (
        <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
          <NEmpty title={AR ? 'لا توجد مواعيد' : 'No Appointments'} icon="calendar" />
        </ScrollView>
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FACILITY DASHBOARD NAVIGATOR
// ══════════════════════════════════════════════════════════════════════════════
import { createNativeStackNavigator } from '@react-navigation/native-stack';
const Stack = createNativeStackNavigator();

export function FacilityDashboardNavigator({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('home');
  const { lang } = useLang();
  const AR = lang === 'ar';

  const [wards, setWards] = useState<any[]>([]);
  const [surgeries, setSurgeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { show } = useToast();
  const [alarmVisible, setAlarmVisible] = useState(false);

  const fetchWardsAndSurgeries = async () => {
    setLoading(true);
    try {
      const [wardsRes, surgRes] = await Promise.all([
        client.get('/facility/beds/wards'),
        client.get('/facility/surgeries/schedule')
      ]);
      setWards(wardsRes.data || []);
      setSurgeries(surgRes.data || []);
    } catch (e: any) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWardsAndSurgeries();
  }, []);

  // Branch Selection State
  const [branches, setBranches] = useState<any[]>([
    { id: 'b1', name_ar: 'الفرع الرئيسي - الرياض', name_en: 'Main Branch - Riyadh' },
    { id: 'b2', name_ar: 'فرع شمال الرياض', name_en: 'North Riyadh Branch' }
  ]);
  const [selectedBranch, setSelectedBranch] = useState<string>('b1');

   const tabs = [
 { key: 'home', icon: 'home', label: AR ? 'الرئيسية' : 'Home' },
 { key: 'orders', icon: 'document', label: AR ? 'الطلبات' : 'Orders' },
 { key: 'jobs', icon: 'profile', label: AR ? 'الوظائف' : 'Jobs' },
 { key: 'drugs', icon: 'activity', label: AR ? 'الأدوية' : 'Drugs' },
 { key: 'settings', icon: 'settings', label: AR ? 'الإعدادات' : 'Settings' },
 ];

  return (
    <Stack.Navigator id={undefined as any} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs">
        {({ navigation }) => {
          const go = (s: string, param?: any) => navigation.navigate(s, { param });
          return (
            <View style={{ flex: 1 }}>
              {activeTab === 'home' && <FacilityHomeTab onNavigate={go} wards={wards} onTriggerAlarm={() => setAlarmVisible(true)} branches={branches} selectedBranch={selectedBranch} onSelectBranch={setSelectedBranch} />}
              {activeTab === 'orders' && <FacilityOrdersTab onNavigate={go} surgeries={surgeries} wards={wards} onRefresh={fetchWardsAndSurgeries} />}
              {activeTab === 'jobs' && <MedicalJobsScreen onBack={() => setActiveTab('home')} />}
              {activeTab === 'drugs' && <MedicalDrugIndexScreen onBack={() => setActiveTab('home')} />}
              {activeTab === 'settings' && <FacilitySettingsScreen onLogout={onLogout} onNavigate={go} />}
              <NBottomNav tabs={tabs} active={activeTab} onPress={setActiveTab} />
              <LiveOrderAlarmModal
                visible={alarmVisible}
                onAccept={() => { setAlarmVisible(false); go('sos_dispatch'); }}
                onDecline={() => setAlarmVisible(false)}
              />
            </View>
          );
        }}
      </Stack.Screen>

      <Stack.Screen name="subaccounts">{({ navigation }: any) => <SubAccountsScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="add_subaccount">{({ navigation, route }: any) => <FacilityInvitationScreen onBack={() => navigation.goBack()} preRole={route.params?.param} />}</Stack.Screen>
      <Stack.Screen name="departments">{({ navigation }: any) => <DepartmentManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="shifts">{({ navigation }: any) => <ShiftManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="resources">{({ navigation }: any) => <FacilityResourcesScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="leave_requests">{({ navigation }: any) => <FacilityLeaveRequestsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="unified_sched">{({ navigation }: any) => <FacilityUnifiedCalendarScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="beds">{({ navigation }: any) => <BedManagementScreen onBack={() => navigation.goBack()} wards={wards} onRefresh={fetchWardsAndSurgeries} />}</Stack.Screen>
      <Stack.Screen name="qr_checkin">{({ navigation }: any) => <QRCheckinScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="insurance_hub">{({ navigation }: any) => <InsuranceClaimsHubScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="financial">{({ navigation }: any) => <FacilityFinancialScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="internal_chat">{({ navigation }: any) => <FacilityInternalChatScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="audit_logs">{({ navigation }: any) => <FacilityAuditLogScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="announcements">{({ navigation }: any) => <FacilityAnnouncementsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="patient_tracker">{({ navigation }: any) => <FacilityPatientTrackerScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="discharge_summary">{({ navigation }: any) => <DischargeSummaryScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="attendance">{({ navigation }: any) => <StaffAttendanceScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="surgery_sched">{({ navigation }: any) => <SurgeryScheduleScreen onBack={() => navigation.goBack()} surgeries={surgeries} onRefresh={fetchWardsAndSurgeries} />}</Stack.Screen>
      <Stack.Screen name="credentialing">{({ navigation }: any) => <CredentialingScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="hospital_dispatch">{({ navigation }: any) => <HospitalDispatchScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="facility_info">{({ navigation }: any) => <FacilityProfileConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="auto_reports">{({ navigation }: any) => <StatisticsReports onBack={() => navigation.goBack()} providerType="facility" />}</Stack.Screen>
      <Stack.Screen name="notifications">{({ navigation }: any) => <NotificationsCenterScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="support">{({ navigation }: any) => <TechnicalSupportTicketsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="order_detail">{({ navigation, route }: any) => <FacilityOrderDetail order={route.params?.param} onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="promotions">{({ navigation }: any) => <PromotionsDashboard onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="create_promo">{({ navigation }: any) => <CreateCampaignScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="web_config">{({ navigation }: any) => <ProfileWebConfig onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="subscriptions_ads">{({ navigation }: any) => <SubscriptionsAdsScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="affiliate">{({ navigation }: any) => <AffiliatePortal onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="reputation">{({ navigation }: any) => <ReputationHub onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="crm">{({ navigation }: any) => <CrmHub onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="revenue_insights">{({ navigation }: any) => <RevenueInsights onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="sos_dispatch">{({ navigation }: any) => <SosDispatchScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
      <Stack.Screen name="gps_router">{({ navigation, route }: any) => <GpsRouterScreen patient={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="medical_jobs">{({ navigation }: any) => <MedicalJobsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="drug_index">{({ navigation }: any) => <MedicalDrugIndexScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="insurance_config">{({ navigation }: any) => <InsuranceConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="certificates_config">{({ navigation }: any) => <CertificatesConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="media_config">{({ navigation }: any) => <MediaConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
    </Stack.Navigator>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HOME TAB
// ══════════════════════════════════════════════════════════════════════════════
function FacilityHomeTab({ onNavigate, wards, onTriggerAlarm, branches, selectedBranch, onSelectBranch }: { onNavigate: (s: string, p?: any) => void; wards: any[]; onTriggerAlarm?: () => void; branches?: any[]; selectedBranch?: string; onSelectBranch?: (id: string) => void }) {
 const insets = useSafeAreaInsets();
 const { theme } = useTheme();
 const { lang } = useLang();
 const { user } = useAuth();
 const AR = lang === 'ar';
 const [refreshing, setRefreshing] = useState(false);
 const [todayApts, setTodayApts] = useState<any[]>([]);
 const [subaccounts, setSubaccounts] = useState<any[]>([]);
 useEffect(() => {
   client.get('/provider/jobs/queue?status=active&kind=appointment&today=true').then(r => setTodayApts(r.data || [])).catch(() => {});
   client.get('/provider/facility/subaccounts').then(r => setSubaccounts(r.data || [])).catch(() => {});
 }, []);

 const onRefresh = async () => {
 setRefreshing(true);
 await new Promise(r => setTimeout(r, 1200));
 setRefreshing(false);
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 {/* Top Bar */}
 <View style={[s.topBar, {
 backgroundColor: theme.surface, borderBottomColor: theme.border,
 flexDirection: AR ? 'row-reverse' : 'row'}]}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <View style={{ width: 44, height: 44, borderRadius: R.md,
 backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
 <Text style={{ fontSize: 24 }}></Text>
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
 <Text style={{ fontSize: 20 }}></Text>
 </TouchableOpacity>
 <TouchableOpacity style={[s.iconBtn, { backgroundColor: theme.surface2 }]} onPress={() => onNavigate('notifications')}>
 <Text style={{ fontSize: 20 }}></Text>
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
 <NStatCard icon="" label={AR ? 'مواعيد اليوم' : "Today's Apts"} value="42" color="#2196F3" style={{ width: '47%' }} />
 <NStatCard icon="️" label={AR ? 'أسرّة مشغولة' : 'Occupied Beds'} value="72/107" color="#FF9800" style={{ width: '47%' }} />
 <NStatCard icon="" label={AR ? 'إيرادات اليوم' : "Today's Rev."} value="18,400" unit={AR?'ر':'SAR'} color="#4CAF50" style={{ width: '47%' }} />
 <NStatCard icon="" label={AR ? 'الكوادر النشطة' : 'Active Staff'} value="28" color="#9C27B0" style={{ width: '47%' }} />
 </View>

  {/* Live Operational Command Center */}
  <NSecHeader title={AR ? ' مركز العمليات المباشر' : ' Live Command Center'} 
              action={AR ? 'توسيع' : 'Expand'} onAction={() => onNavigate('command_center')} />
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SP.xl }}>
    <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, paddingHorizontal: SP.xs }}>
      <NCard style={{ width: 150, backgroundColor: theme.surface2, borderColor: theme.danger }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
          <Text style={{ fontSize: 24 }}>🚑</Text>
          <View style={[s.notifDot, { position: 'relative', top: 0, right: 0, backgroundColor: theme.danger }]} />
        </View>
        <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
          {AR ? 'طوارئ نشطة' : 'Active ER'}
        </Text>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.xbold, color: theme.danger, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>
          3 <Text style={{ fontSize: FS.xs, color: theme.textSub, fontWeight: FW.med }}>{AR ? 'حالات' : 'cases'}</Text>
        </Text>
      </NCard>

      <NCard style={{ width: 150, backgroundColor: theme.surface2, borderColor: theme.warn }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
          <Text style={{ fontSize: 24 }}>🔪</Text>
          <View style={[s.notifDot, { position: 'relative', top: 0, right: 0, backgroundColor: theme.warn }]} />
        </View>
        <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
          {AR ? 'غرف العمليات' : 'Active ORs'}
        </Text>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.xbold, color: theme.warn, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>
          2 <Text style={{ fontSize: FS.xs, color: theme.textSub, fontWeight: FW.med }}>{AR ? 'قيد الإجراء' : 'in progress'}</Text>
        </Text>
      </NCard>

      <NCard style={{ width: 150, backgroundColor: theme.surface2, borderColor: theme.primary }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
          <Text style={{ fontSize: 24 }}>🩺</Text>
          <View style={[s.notifDot, { position: 'relative', top: 0, right: 0, backgroundColor: theme.primary }]} />
        </View>
        <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
          {AR ? 'عيادات تعمل' : 'Running Clinics'}
        </Text>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.xbold, color: theme.primary, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>
          14 <Text style={{ fontSize: FS.xs, color: theme.textSub, fontWeight: FW.med }}>{AR ? 'طبيب' : 'doctors'}</Text>
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
  { icon: '🏖️', ar: 'طلبات\nالإجازة', en: 'Leave\nRequests', screen: 'leave_requests' },
  { icon: '🏥', ar: 'إدارة\nالموارد', en: 'Resources', screen: 'resources' },
 { icon: '', ar: 'الأقسام', en: 'Departments', screen: 'departments' },
 { icon: '️', ar: 'إدارة\nالأسرّة', en: 'Bed\nManagement', screen: 'beds' },
 { icon: '⏰', ar: 'إدارة\nالمناوبات', en: 'Shift\nMgmt', screen: 'shifts' },
 { icon: '', ar: 'جدول\nالعمليات', en: 'Surgery\nSchedule',screen: 'surgery_sched' },
 { icon: '', ar: 'مطالبات\nالتأمين', en: 'Insurance\nClaims',screen: 'insurance_hub' },
 { icon: '', ar: 'الحضور\nوالانصراف', en: 'Attendance', screen: 'attendance' },
 { icon: '', ar: 'التوثيق\nالمهني', en: 'Credentialing', screen: 'credentialing' },
 { icon: '🛏️', ar: 'تتبع\nالمرضى', en: 'Patient\nTracker', screen: 'patient_tracker' },
 { icon: '', ar: 'لوحة\nالتوجيه', en: 'Dispatch\nPanel', screen: 'hospital_dispatch' },
 { icon: '💬', ar: 'التواصل\nالداخلي', en: 'Internal\nChat', screen: 'internal_chat' },
 { icon: '📜', ar: 'سجل\nالتدقيق', en: 'Audit\nLogs', screen: 'audit_logs' },
 { icon: '📢', ar: 'التعاميم\nوالإعلانات', en: 'Broadcasts', screen: 'announcements' },
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
 <NSecHeader title={AR ? '️ الأسرّة' : '️ Bed Availability'}
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
 const color = available === 0 ? '#F44336' : available <= 2 ? '#FF9800' : '#4CAF50';
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
// ══════════════════════════════════════════════════════════════════════════════
function SubAccountsScreen({ onBack, onNavigate }: {
 onBack: () => void; onNavigate: (s: string, p?: any) => void;
}) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [search, setSearch] = useState('');
 const [roleFilter, setRole] = useState<'all'|'doctor'|'insurance'|'reception'>('all');
 const [showDelete, setShowDelete] = useState<string | null>(null);

 const [staffList, setStaffList] = useState<any[]>([]);
 const [loading, setLoading] = useState(false);

 const ROLE_LABELS: Record<string, { ar: string; en: string; icon: string; color: string }> = {
 doctor: { ar: 'طبيب', en: 'Doctor', icon: '', color: '#4CAF50' },
 insurance: { ar: 'منسق تأمين', en: 'Ins. Coord.', icon: '', color: '#2196F3' },
 reception: { ar: 'استقبال', en: 'Reception', icon: '‍', color: '#FF9800' },
 nurse: { ar: 'ممرض/ممرضة', en: 'Nurse', icon: '', color: '#E91E63' },
 lab: { ar: 'محلل مختبر', en: 'Lab Tech', icon: '', color: '#9C27B0' },
 };

 const fetchStaff = async () => {
 setLoading(true);
 setStaffList([]);
 setLoading(false);
 };

 useEffect(() => {
 fetchStaff();
 }, []);

 const filtered = staffList.filter(sa =>
 (roleFilter === 'all' || sa.role === roleFilter) &&
 (sa.name.includes(search) || sa.spec.includes(search))
 );

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[s.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
 <TouchableOpacity onPress={onBack}>
 <Text style={{ color: theme.primary, fontSize: FS.md }}>{AR ? '→' : '←'}</Text>
 </TouchableOpacity>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>
 {AR ? ' إدارة الكوادر' : ' Staff Accounts'}
 </Text>
 <TouchableOpacity onPress={() => show(AR ? 'إدارة الكوادر غير متاحة حتى يُنشر عقد خادمي محمي.' : 'Staff management is unavailable until a protected backend contract is published.', 'warning')}>
 <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primary,
 alignItems: 'center', justifyContent: 'center' }}>
 <Text style={{ color: '#FFF', fontSize: FS.lg, fontWeight: FW.bold }}>+</Text>
 </View>
 </TouchableOpacity>
 </View>

 <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
 <NSearch value={search} onChange={setSearch}
 placeholder={AR ? 'ابحث عن طبيب أو موظف...' : 'Search staff...'} style={{ marginBottom: SP.lg }} />

 {/* Role filter */}
 <ScrollView horizontal showsHorizontalScrollIndicator={false}
 contentContainerStyle={{ gap: SP.sm, marginBottom: SP.lg }}>
 {(['all','doctor','insurance','reception'] as const).map(r => (
 <TouchableOpacity key={r} onPress={() => setRole(r)}
 style={[s.chipBtn, {
 backgroundColor: roleFilter === r ? theme.primary : theme.surface2,
 borderColor: roleFilter === r ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: roleFilter === r ? '#FFF' : theme.text, fontSize: FS.sm }}>
 {r === 'all' ? (AR ? 'الكل' : 'All')
 : AR ? ROLE_LABELS[r]?.ar : ROLE_LABELS[r]?.en}
 </Text>
 </TouchableOpacity>
 ))}
 </ScrollView>

 {/* Stats row */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.xl }}>
 <NStatCard icon="" label={AR?'إجمالي الكوادر':'Total Staff'} value={String(staffList.length)} color="#2196F3" style={{ flex:1 }} />
 <NStatCard icon="" label={AR?'نشط':'Active'} value={String(staffList.filter(s=>s.status==='active').length)} color="#4CAF50" style={{ flex:1 }} />
 <NStatCard icon="️" label={AR?'غير نشط':'Inactive'} value={String(staffList.filter(s=>s.status!=='active').length)} color="#FF9800" style={{ flex:1 }} />
 </View>

 {/* Add quick role buttons */}
 <NSecHeader title={AR ? 'إضافة سريعة' : 'Quick Add'} />
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl }}>
 {Object.entries(ROLE_LABELS).map(([role, info]) => (
 <TouchableOpacity key={role} onPress={() => show(AR ? 'إضافة الحسابات غير متاحة بلا عقد خادمي محمي.' : 'Account creation is unavailable without a protected backend contract.', 'warning')}
 style={[s.roleAddBtn, { backgroundColor: `${info.color}15`, borderColor: info.color }]}>
 <Text style={{ fontSize: 20 }}>{info.icon}</Text>
 <Text style={{ fontSize: FS.xs, color: info.color, fontWeight: FW.semi }}>
 + {AR ? info.ar : info.en}
 </Text>
 </TouchableOpacity>
 ))}
 </View>

 {/* Staff list */}
 {loading && <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.xl }} />}
 {!loading && filtered.length === 0 && (
 <Text style={{ textAlign: 'center', color: theme.textSub, marginVertical: SP.xl }}>
 {AR ? 'لا يوجد موظفون مضافون حالياً' : 'No staff accounts found'}
 </Text>
 )}
 {filtered.map(staff => {
 const roleInfo = ROLE_LABELS[staff.role];
 return (
 <NCard key={staff.id} style={{ marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <NAvatar name={staff.name} size={50} online={staff.status === 'active'} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text,
 textAlign: AR ? 'right' : 'left' }}>{staff.name}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: 4 }}>{staff.spec}</Text>
 <View style={{ flexDirection: 'row', gap: SP.xs, flexWrap: 'wrap' }}>
 <NBadge label={roleInfo ? (AR ? roleInfo.ar : roleInfo.en) : staff.role} variant="primary" size="xs" />
 <NBadge label={staff.status === 'active' ? (AR?'نشط':'Active') : (AR?'غير نشط':'Inactive')}
 variant={staff.status === 'active' ? 'success' : 'default'} size="xs" />
 <NBadge label={staff.subId} variant="default" size="xs" />
 </View>
 </View>
 <View style={{ gap: SP.xs }}>
 <TouchableOpacity style={[s.iconBtn2, { backgroundColor: theme.primaryLight }]}
 onPress={() => show(AR ? 'تعديل الحساب غير متاح بلا عقد خادمي محمي.' : 'Account editing is unavailable without a protected backend contract.', 'warning')}>
 <Text style={{ fontSize: 16 }}>️</Text>
 </TouchableOpacity>
 <TouchableOpacity style={[s.iconBtn2, { backgroundColor: theme.dangerBg }]}
 onPress={() => setShowDelete(staff.id)}>
 <Text style={{ fontSize: 16 }}>️</Text>
 </TouchableOpacity>
 </View>
 </View>

 {/* Credential Card Preview */}
 <TouchableOpacity onPress={() => show(AR ? 'عرض بطاقة التوثيق' : 'Credential card', 'info')}
 style={[s.credCard, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
 <Text style={{ fontSize: 16 }}>🪪</Text>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.xs, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'بطاقة التوثيق المهني' : 'Professional Credential Card'}
 </Text>
 <Text style={{ fontSize: 10, color: theme.textSub }}>
 {AR ? `Sub-ID: ${staff.subId} · آخر دخول: ${staff.lastLogin}` : `Sub-ID: ${staff.subId} · Last login: ${staff.lastLogin}`}
 </Text>
 </View>
 <Text style={{ color: theme.primary, fontSize: FS.xs }}>
 {AR ? 'عرض ←' : '→ View'}
 </Text>
 </TouchableOpacity>
 </NCard>
 );
 })}
 </ScrollView>

 <NConfirm
 visible={!!showDelete}
 title={AR ? 'حذف الحساب' : 'Delete Account'}
 msg={AR ? 'سيتم حذف هذا الحساب الفرعي نهائياً. هل أنت متأكد؟' : 'This sub-account will be permanently deleted. Are you sure?'}
 onOk={() => { setShowDelete(null); show(AR?'لم يُحذف الحساب: خدمة الحذف غير متاحة بلا عقد خادمي محمي.':'Account was not deleted: the protected delete contract is unavailable.', 'warning'); }}
 onCancel={() => setShowDelete(null)}
 okLabel={AR ? 'حذف' : 'Delete'}
 />
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADD SUB-ACCOUNT SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function AddSubAccountScreen({ onBack, preRole }: { onBack: () => void; preRole?: string }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [role, setRole] = useState(preRole ?? 'doctor');
 const [name, setName] = useState('');
 const [email, setEmail] = useState('');
 const [phone, setPhone] = useState('');
 const [spec, setSpec] = useState('');
 const [scfhs, setScfhs] = useState('');
 const [loading, setLoading] = useState(false);
 const [createdCreds, setCreatedCreds] = useState<any | null>(null);

 const ROLES = [
 { id:'doctor', ar:'طبيب', en:'Doctor', icon:'', needsSpec:true, needsScfhs:true },
 { id:'insurance', ar:'منسق تأمين', en:'Insurance Coordinator',icon:'',needsSpec:false,needsScfhs:false},
 { id:'reception', ar:'استقبال', en:'Receptionist', icon:'‍', needsSpec:false, needsScfhs:false },
 { id:'nurse', ar:'ممرض/ممرضة', en:'Nurse', icon:'', needsSpec:false, needsScfhs:true },
 { id:'lab', ar:'محلل مختبر', en:'Lab Technician',icon:'', needsSpec:false, needsScfhs:true },
 ];

 const selectedRole = ROLES.find(r => r.id === role)!;

 const handleSubmit = async () => {
 if (!name.trim() || !email.trim() || !Validate.phone(phone)) {
 show(AR ? 'يرجى ملء جميع الحقول المطلوبة بشكل صحيح' : 'Fill all required fields correctly', 'warning');
 return;
 }
 setLoading(true);
 show(AR ? 'لم يُنشأ الحساب: عقد إدارة الكوادر المحمي غير منشور بعد.' : 'No account was created: the protected staff-management contract is not published yet.', 'warning');
 setLoading(false);
 };

 if (createdCreds) {
 return (
 <NScroll>
 <NHeader title={AR ? '🪪 بطاقة الحساب الفرعي' : '🪪 Sub-Account Credential Card'} onBack={onBack} />
 
 <View style={{ padding: SP.xl, alignItems: 'center' }}>
 <View style={{
 width: '100%', padding: SP.xl, borderRadius: R.xl,
 backgroundColor: theme.surface3, borderWidth: 2, borderColor: theme.primary,
 marginBottom: SP.xl
 }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: SP.md, marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary }}> {AR ? 'مستشفى نبضة الطبي' : 'Nabdah Medical Hospital'}</Text>
 <NBadge label={AR ? createdCreds.role : createdCreds.roleEn} variant="primary" size="sm" />
 </View>

 <View style={{ alignItems: 'center', marginVertical: SP.md }}>
 <NAvatar name={createdCreds.name} size={70} />
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text, marginTop: SP.md }}>{createdCreds.name}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 2 }}>{createdCreds.email} · {createdCreds.phone}</Text>
 </View>

 <View style={{ backgroundColor: theme.surface, borderRadius: R.lg, padding: SP.md, borderWidth: 1, borderColor: theme.border, marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.xs }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{AR ? 'Sub-ID:' : 'Sub-ID:'}</Text>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }}>{createdCreds.subId}</Text>
 </View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{AR ? 'كلمة المرور المؤقتة:' : 'Temp Password:'}</Text>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.danger }}>{createdCreds.tempPass}</Text>
 </View>
 </View>

 <View style={{ alignItems: 'center', marginTop: SP.md }}>
 <View style={{ width: 100, height: 100, backgroundColor: '#FFF', padding: 8, borderRadius: R.md, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' }}>
 <View style={{ width: 84, height: 84, flexDirection: 'row', flexWrap: 'wrap', opacity: 0.8 }}>
 {Array.from({ length: 16 }).map((_, i) => (
 <View key={i} style={{ width: 21, height: 21, borderWidth: 0.5, borderColor: '#000', backgroundColor: (i*3+7)%5 === 0 || i === 0 || i === 3 || i === 12 ? '#000' : '#FFF' }} />
 ))}
 </View>
 </View>
 <Text style={{ fontSize: 9, color: theme.textSub, marginTop: SP.sm }}>{AR ? 'مسح سريع لتسجيل الدخول' : 'Scan to Login'}</Text>
 </View>
 </View>

 <View style={{ width: '100%', gap: SP.md }}>
 <NBtn label={AR ? ' حفظ كملف صورة / PDF' : ' Save as Image / PDF'} icon="" onPress={() => show(AR ? 'تم الحفظ في المعرض' : 'Saved to Gallery', 'success')} />
 <NBtn label={AR ? ' مشاركة مع الموظف' : ' Share Credential Card'} variant="outline" icon="" onPress={() => show(AR ? 'تم نسخ رابط المشاركة' : 'Share link copied', 'info')} />
 <NBtn label={AR ? 'تم' : 'Done'} variant="outline" onPress={onBack} />
 </View>
 </View>
 </NScroll>
 );
 }

 return (
 <NScroll>
 <NHeader title={AR ? ' إضافة حساب فرعي' : ' Add Sub-Account'} onBack={onBack} />

 {/* Role Selection */}
 <NSecHeader title={AR ? 'نوع الحساب' : 'Account Type'} />
 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl }}>
 {ROLES.map(r => (
 <TouchableOpacity key={r.id} onPress={() => setRole(r.id)}
 style={[s.rolePillBtn, {
 backgroundColor: role === r.id ? theme.primaryLight : theme.surface2,
 borderColor: role === r.id ? theme.primary : theme.border,
 }]}>
 <Text style={{ fontSize: 20 }}>{r.icon}</Text>
 <Text style={{ fontSize: FS.sm, color: role === r.id ? theme.primary : theme.text,
 fontWeight: role === r.id ? FW.bold : FW.reg }}>
 {AR ? r.ar : r.en}
 </Text>
 </TouchableOpacity>
 ))}
 </View>

 {/* Info */}
 <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.info, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
  {AR
 ? `حساب ${selectedRole.ar}: سيحصل على Sub-ID + كلمة مرور مؤقتة على بريده الإلكتروني. صلاحياته محدودة حسب دوره.`
 : `${selectedRole.en}: Gets Sub-ID + temporary password by email. Permissions limited by role.`}
 </Text>
 </NCard>

 <NInput
 label={AR ? 'الاسم الكامل' : 'Full Name'}
 placeholder={AR ? 'محمد أحمد السعودي' : 'Mohamed Ahmed'}
 value={name} onChange={setName} icon="" required caps="words"
 />
 <NInput
 label={AR ? 'البريد الإلكتروني' : 'Email'}
 placeholder="doctor@hospital.com"
 value={email} onChange={v => setEmail(v.toLowerCase())} icon="" required kbType="email-address"
 />
 <NPhoneInput label={AR ? 'الجوال' : 'Phone'} value={phone} onChange={setPhone} required />

 {selectedRole.needsSpec && (
 <View style={{ marginBottom: SP.lg }}>
 <Text style={[s.inputLabel, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>
 {AR ? 'التخصص الطبي' : 'Medical Specialty'}
 </Text>
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
 <View style={{ flexDirection: 'row', gap: SP.sm }}>
 {SPECIALTIES.slice(0, 12).map(sp => (
 <TouchableOpacity key={sp.id} onPress={() => setSpec(sp.id)}
 style={[s.chipBtn, {
 backgroundColor: spec === sp.id ? theme.primary : theme.surface2,
 borderColor: spec === sp.id ? theme.primary : theme.border,
 }]}>
 <Text style={{ fontSize: 14 }}>{sp.icon}</Text>
 <Text style={{ color: spec === sp.id ? '#FFF' : theme.text, fontSize: FS.xs }}>
 {AR ? sp.ar : sp.en}
 </Text>
 </TouchableOpacity>
 ))}
 </View>
 </ScrollView>
 </View>
 )}

 {selectedRole.needsScfhs && (
 <NInput
 label={AR ? 'رقم ترخيص SCFHS / الهيئة' : 'SCFHS License Number'}
 placeholder="123456" value={scfhs} onChange={setScfhs}
 icon="" kbType="numeric" maxLen={8}
 />
 )}

 <NCard style={{ backgroundColor: theme.warnBg, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.warn, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
  {AR
 ? 'سيتم إرسال بيانات الدخول تلقائياً على البريد الإلكتروني وكلمة مرور مؤقتة يجب تغييرها.'
 : 'Login credentials will be auto-sent to email with a temporary password to be changed on first login.'}
 </Text>
 </NCard>

 <NBtn
 label={AR ? ' إنشاء الحساب الفرعي' : ' Create Sub-Account'}
 onPress={handleSubmit} loading={loading}
 />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// DEPARTMENT MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
function DepartmentManagementScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const DEPT_DATA = [
 { id:'cardio', icon:'️', ar:'قلب وأوعية', en:'Cardiology', head:'د. محمد', doctors:3, active:true },
 { id:'peds', icon:'', ar:'الأطفال', en:'Pediatrics', head:'د. نورا', doctors:2, active:true },
 { id:'surg', icon:'', ar:'الجراحة العامة',en:'General Surg.',head:'د. خالد', doctors:4, active:true },
 { id:'emer', icon:'', ar:'الطوارئ', en:'Emergency', head:'مناوب', doctors:2, active:true },
 { id:'icu', icon:'🫀', ar:'عناية مركزة', en:'ICU', head:'د. سعد', doctors:2, active:true },
 { id:'radio', icon:'', ar:'الأشعة', en:'Radiology', head:'د. ريم', doctors:1, active:false },
 ];

 return (
 <NScroll>
 <NHeader title={AR ? ' إدارة الأقسام' : ' Department Management'} onBack={onBack} />

 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.xl }}>
 <NStatCard icon="" label={AR?'الأقسام':'Departments'} value={String(DEPT_DATA.length)} color="#2196F3" style={{ flex:1 }} />
 <NStatCard icon="" label={AR?'نشطة':'Active'} value={String(DEPT_DATA.filter(d=>d.active).length)} color="#4CAF50" style={{ flex:1 }} />
 <NStatCard icon="" label={AR?'أطباء':'Doctors'} value={String(DEPT_DATA.reduce((a,d)=>a+d.doctors,0))} color="#9C27B0" style={{ flex:1 }} />
 </View>

 {DEPT_DATA.map(dept => (
 <NCard key={dept.id} style={{ marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.lg }}>
 <View style={{ width: 50, height: 50, borderRadius: R.md,
 backgroundColor: dept.active ? theme.primaryLight : theme.surface2,
 alignItems: 'center', justifyContent: 'center' }}>
 <Text style={{ fontSize: 26 }}>{dept.icon}</Text>
 </View>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text,
 textAlign: AR ? 'right' : 'left' }}>{AR ? dept.ar : dept.en}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? `رئيس القسم: ${dept.head}` : `Head: ${dept.head}`} · {dept.doctors} {AR ? 'أطباء' : 'doctors'}
 </Text>
 </View>
 <View style={{ alignItems: 'flex-end', gap: SP.xs }}>
 <NBadge label={dept.active ? (AR?'نشط':'Active') : (AR?'موقوف':'Inactive')}
 variant={dept.active ? 'success' : 'default'} size="xs" />
 <TouchableOpacity onPress={() => show(AR ? 'تعديل القسم' : 'Edit dept', 'info')}>
 <Text style={{ fontSize: FS.sm, color: theme.primary }}>️ {AR ? 'تعديل' : 'Edit'}</Text>
 </TouchableOpacity>
 </View>
 </View>
 </NCard>
 ))}

 <NBtn label={AR ? '+ إضافة قسم جديد' : '+ Add New Department'} variant="outline"
 onPress={() => {
   Alert.prompt(
     AR ? 'قسم جديد' : 'New Department',
     AR ? 'أدخل اسم القسم الجديد' : 'Enter new department name',
     [{ text: AR ? 'إلغاء' : 'Cancel', style: 'cancel' }, { text: AR ? 'إضافة' : 'Add', onPress: (name) => { if (name) show(AR ? `تمت إضافة قسم ${name} بنجاح` : `Department ${name} added`, 'success'); } }]
   );
 }} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// SHIFT MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
function ShiftManagementScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [view, setView] = useState<'today'|'week'>('today');
 const [shifts, setShifts] = useState<any[]>([]);
 useEffect(() => { client.get('/provider/facility/shifts').then(r => setShifts(r.data || [])).catch(() => {}); }, []);

 const DAYS = AR
 ? ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
 : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

 return (
 <NScroll>
 <NHeader title={AR ? '⏰ إدارة المناوبات' : '⏰ Shift Management'} onBack={onBack} />

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

 {/* Alert for substitute */}
 <NCard style={{ backgroundColor: theme.warnBg, marginBottom: SP.xl }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <Text style={{ fontSize: 24 }}></Text>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.warn,
 textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'طبيب بديل مطلوب' : 'Substitute Doctor Needed'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.warn, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'د. خالد المالكي — قسم الجراحة — الأحد 08:00' : 'Dr. Khalid — Surgery — Sun 08:00'}
 </Text>
 </View>
 <NBtn label={AR?'تعيين':'Assign'} size="sm" full={false}
 style={{ paddingHorizontal: SP.lg }}
 onPress={() => show(AR?'تم تعيين بديل':'Substitute assigned','success')} />
 </View>
 </NCard>

 {/* Shifts */}
 <NSecHeader title={AR ? 'مناوبات اليوم' : "Today's Shifts"} />
 {shifts.map((shift: any) => (
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
 <TouchableOpacity onPress={() => show(AR?'تعديل المناوبة':'Edit shift','info')}>
 <Text style={{ fontSize: FS.xs, color: theme.primary }}>️ {AR?'تعديل':'Edit'}</Text>
 </TouchableOpacity>
 </View>
 </View>
 </NCard>
 ))}

 <NBtn label={AR ? '+ إضافة مناوبة' : '+ Add Shift'} variant="outline"
 onPress={() => show(AR?'إضافة مناوبة':'Add shift','info')} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// BED MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
function BedManagementScreen({ onBack, wards, onRefresh }: { onBack: () => void; wards: any[]; onRefresh: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [selectedWard, setSelectedWard] = useState<any>(null);
 const [beds, setBeds] = useState<any[]>([]);
 const [bedsVisible, setBedsVisible] = useState(false);
 const [admitVisible, setAdmitVisible] = useState(false);
 const [addWardVisible, setAddWardVisible] = useState(false);
 const [selectedBed, setSelectedBed] = useState<any>(null);
 const [patientId, setPatientId] = useState('');
 const [wardName, setWardName] = useState('');
 const [wardBedsCount, setWardBedsCount] = useState('');
 const [loading, setLoading] = useState(false);

 const totalBeds = wards.reduce((acc, w) => acc + (w.total_beds || 0), 0);
 const availableBeds = wards.reduce((acc, w) => acc + (w.available_beds || 0), 0);
 const occupiedBeds = totalBeds - availableBeds;
 const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

 const handleShowBeds = async (ward: any) => {
 setSelectedWard(ward);
 setLoading(true);
 try {
 const res = await client.get(`/facility/beds/wards/${ward.id}/beds`);
 setBeds(res.data || []);
 setBedsVisible(true);
 } catch (e: any) {
 show(e.message || 'Failed to fetch beds', 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleAdmitPatient = async () => {
 if (!patientId.trim()) return show(AR ? 'يرجى إدخال هوية المريض' : 'Please enter patient ID', 'warning');
 setLoading(true);
 try {
 const res = await client.post('/facility/beds/admission', {
 patient_id: patientId,
 bed_id: selectedBed.id
 });
 const admission = res.data;
 if (admission && admission.id) {
 await Vault.set(`admission_${selectedBed.id}`, admission.id);
 }
 show(AR ? 'تم قبول المريض وتخصيص السرير بنجاح' : 'Patient admitted and bed allocated successfully', 'success');
 setAdmitVisible(false);
 setPatientId('');
 onRefresh();
 handleShowBeds(selectedWard);
 } catch (e: any) {
 show(e.message || 'Admission failed', 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleDischargePatient = async (bed: any) => {
 setLoading(true);
 try {
 const admissionId = await Vault.get(`admission_${bed.id}`);
 if (!admissionId) throw new Error(AR ? 'لا يوجد معرّف قبول خادمي محفوظ لهذا السرير.' : 'No server-recorded admission identifier is available for this bed.');
 await client.put(`/facility/beds/discharge/${admissionId}`);
 await Vault.del(`admission_${bed.id}`);
 show(AR ? 'تم إخراج المريض بنجاح' : 'Patient discharged successfully', 'success');
 onRefresh();
 handleShowBeds(selectedWard);
 } catch (e: any) {
 show(e.message || (AR ? 'تعذر إخراج المريض.' : 'Patient discharge failed.'), 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleCreateWard = async () => {
 if (!wardName.trim() || !wardBedsCount) return show(AR ? 'يرجى ملء جميع الحقول' : 'Please fill all fields', 'warning');
 setLoading(true);
 try {
 await client.post('/facility/beds/wards', {
 name: wardName,
 total_beds: parseInt(wardBedsCount, 10)
 });
 show(AR ? 'تم إنشاء الجناح بنجاح' : 'Ward created successfully', 'success');
 setAddWardVisible(false);
 setWardName('');
 setWardBedsCount('');
 onRefresh();
 } catch (e: any) {
 show(e.message || 'Failed to create ward', 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? '️ إدارة الأسرّة' : '️ Bed Management'} onBack={onBack} />

 {/* Summary */}
 <View style={{ flexDirection: 'row', gap: SP.md, marginBottom: SP.xl, paddingHorizontal: SP.md }}>
 <NStatCard icon="️" label={AR?'الإجمالي':'Total'} value={String(totalBeds)} color="#2196F3" style={{ flex:1 }} />
 <NStatCard icon="" label={AR?'مشغول':'Occupied'} value={String(occupiedBeds)} color="#F44336" style={{ flex:1 }} />
 <NStatCard icon="🟢" label={AR?'متاح':'Available'} value={String(availableBeds)} color="#4CAF50" style={{ flex:1 }} />
 </View>

 {/* Occupancy gauge */}
 <NCard style={{ marginBottom: SP.xl, alignItems: 'center', marginHorizontal: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.sm }}>
 {AR ? 'نسبة الإشغال الكلية' : 'Overall Occupancy Rate'}
 </Text>
 <Text style={{ fontSize: FS['5xl'], fontWeight: FW.xbold,
 color: occupancyPct > 85 ? theme.danger : occupancyPct > 70 ? theme.warn : theme.success }}>
 {occupancyPct}%
 </Text>
 <View style={{ width: '100%', height: 12, backgroundColor: theme.surface2, borderRadius: R.full, marginTop: SP.md }}>
 <View style={{
 height: 12,
 width: `${occupancyPct}%`,
 backgroundColor: occupancyPct > 85 ? theme.danger : occupancyPct > 70 ? theme.warn : theme.success,
 borderRadius: R.full,
 }} />
 </View>
 </NCard>

 {/* Per ward */}
 <View style={{ paddingHorizontal: SP.md, flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>{AR ? 'أجنحة التنويم' : 'Hospital Wards'}</Text>
 <NBtn label={AR ? '+ إضافة جناح' : '+ Add Ward'} size="xs" variant="outline" onPress={() => setAddWardVisible(true)} />
 </View>

 {wards.map((ward, i) => {
 const total = ward.total_beds || 0;
 const available = ward.available_beds || 0;
 const occupied = total - available;
 const pct = total > 0 ? (occupied / total) * 100 : 0;
 const color = available === 0 ? '#F44336' : available <= 2 ? '#FF9800' : '#4CAF50';
 return (
 <NCard key={ward.id || i} style={{ marginBottom: SP.md, marginHorizontal: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{ward.name}</Text>
 <NBadge
 label={available === 0 ? (AR?'ممتلئ':'Full') : available <= 2 ? (AR?'شبه ممتلئ':'Nearly Full') : (AR?'متاح':'Available')}
 variant={available === 0 ? 'danger' : available <= 2 ? 'warning' : 'success'}
 size="xs"
 />
 </View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>
 {AR ? `${occupied} مشغول / ${total} إجمالي` : `${occupied}/${total} occupied`}
 </Text>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color }}>
 {available} {AR ? 'متاح' : 'free'}
 </Text>
 </View>
 <View style={{ height: 8, backgroundColor: theme.surface2, borderRadius: R.full }}>
 <View style={{
 height: 8,
 width: `${pct}%`,
 backgroundColor: color, borderRadius: R.full,
 }} />
 </View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginTop: SP.md }}>
 <NBtn label={AR?'إدارة الأسرّة':'Manage Beds'} size="xs" style={{ flex: 1 }}
 onPress={() => handleShowBeds(ward)} />
 </View>
 </NCard>
 );
 })}
 </NScroll>

 {/* Ward Beds Bottom Sheet */}
 <NSheet visible={bedsVisible} onClose={() => setBedsVisible(false)} title={selectedWard?.name || ''}>
 <ScrollView contentContainerStyle={{ padding: SP.md }}>
 {beds.length === 0 ? (
 <Text style={{ color: theme.textSub, textAlign: 'center', marginVertical: SP.xl }}>{AR ? 'لا توجد أسرّة مضافة في هذا الجناح' : 'No beds in this ward'}</Text>
 ) : (
 beds.map((bed: any) => (
 <View key={bed.id} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SP.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
 <View>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{bed.bed_number}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{AR ? `النوع: ${bed.type}` : `Type: ${bed.type}`}</Text>
 </View>
 <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.md }}>
 <NBadge label={bed.status === 'occupied' ? (AR ? 'مشغول' : 'Occupied') : (AR ? 'متاح' : 'Available')} variant={bed.status === 'occupied' ? 'danger' : 'success'} />
 {bed.status === 'occupied' ? (
 <NBtn label={AR ? 'إخراج' : 'Discharge'} size="xs" variant="outline" onPress={() => handleDischargePatient(bed)} />
 ) : (
 <NBtn label={AR ? 'إدخل' : 'Admit'} size="xs" onPress={() => { setSelectedBed(bed); setAdmitVisible(true); }} />
 )}
 </View>
 </View>
 ))
 )}
 </ScrollView>
 </NSheet>

 {/* Admission Form Sheet */}
 <NSheet visible={admitVisible} onClose={() => setAdmitVisible(false)} title={AR ? 'إدخال مريض للسرير' : 'Admit Patient to Bed'}>
 <View style={{ padding: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>{AR ? `رقم السرير: ${selectedBed?.bed_number}` : `Bed: ${selectedBed?.bed_number}`}</Text>
 <NInput label={AR ? 'معرف المريض (Patient ID)' : 'Patient ID'} placeholder={AR ? 'أدخل معرف المريض...' : 'Enter patient ID...'} value={patientId} onChange={setPatientId} required />
 <NBtn label={AR ? 'تأكيد الحجز وتسكين المريض' : 'Confirm Admission'} loading={loading} onPress={handleAdmitPatient} />
 </View>
 </NSheet>

 {/* Create Ward Form Sheet */}
 <NSheet visible={addWardVisible} onClose={() => setAddWardVisible(false)} title={AR ? 'إضافة جناح جديد' : 'Add New Ward'}>
 <View style={{ padding: SP.xl }}>
 <NInput label={AR ? 'اسم الجناح' : 'Ward Name'} placeholder={AR ? 'مثل: العناية المركزة، أجنحة الجراحة...' : 'e.g. ICU, General Surgery...'} value={wardName} onChange={setWardName} required />
 <NInput label={AR ? 'عدد الأسرّة' : 'Total Beds'} placeholder="10" value={wardBedsCount} onChange={setWardBedsCount} kbType="numeric" required />
 <NBtn label={AR ? 'إنشاء الجناح' : 'Create Ward'} loading={loading} onPress={handleCreateWard} />
 </View>
 </NSheet>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// UNIFIED SCHEDULE
// ══════════════════════════════════════════════════════════════════════════════
function UnifiedScheduleScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const AR = lang === 'ar';
 const [todayApts, setTodayApts] = useState<any[]>([]);
 useEffect(() => { client.get('/provider/jobs/queue?status=active&kind=appointment&today=true').then(r => setTodayApts(r.data || [])).catch(() => {}); }, []);
 const [filter, setFilter] = useState<'all'|'outpatient'|'surgery'|'emergency'>('all');
 const [deptFilter, setDeptFilter] = useState('all');

 const filtered = filter === 'all'
 ? todayApts
 : todayApts.filter((a: any) => a.type === filter);

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[s.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
 {onBack && (
 <TouchableOpacity onPress={onBack}>
 <Text style={{ color: theme.primary, fontSize: FS.md }}>{AR ? '→' : '←'}</Text>
 </TouchableOpacity>
 )}
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>
 {AR ? ' الجدول الموحد' : ' Unified Schedule'}
 </Text>
 <View style={{ width: 30 }} />
 </View>

 <ScrollView horizontal showsHorizontalScrollIndicator={false}
 contentContainerStyle={{ paddingHorizontal: SP.lg, paddingVertical: SP.md, gap: SP.sm }}>
 {[
 { k:'all', ar:'الكل', en:'All' },
 { k:'outpatient', ar:'عيادة خارجية',en:'Outpatient'},
 { k:'surgery', ar:'عمليات', en:'Surgery' },
 { k:'emergency', ar:'طوارئ', en:'Emergency' },
 ].map(f => (
 <TouchableOpacity key={f.k} onPress={() => setFilter(f.k as any)}
 style={[s.chipBtn, {
 backgroundColor: filter === f.k ? theme.primary : theme.surface2,
 borderColor: filter === f.k ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: filter === f.k ? '#FFF' : theme.text, fontSize: FS.sm }}>
 {AR ? f.ar : f.en}
 </Text>
 </TouchableOpacity>
 ))}
 </ScrollView>

 <FlatList
 data={filtered}
 keyExtractor={i => i.id}
 contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}
 renderItem={({ item }) => (
 <NCard style={{ marginBottom: SP.sm }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <View style={[s.timeTag, { backgroundColor: theme.primaryLight }]}>
 <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold }}>{item.time}</Text>
 </View>
 <NAvatar name={item.patient} size={40} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left' }}>{item.patient}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
 {item.doctor} · {item.dept}
 </Text>
 </View>
 <NBadge
 label={item.type === 'emergency' ? (AR?' طوارئ':' ER') :
 item.type === 'surgery' ? (AR?' عملية':' OR') : (AR?' كشف':' OPD')}
 variant={item.type === 'emergency' ? 'danger' : item.type === 'surgery' ? 'warning' : 'primary'}
 size="xs"
 />
 </View>
 </NCard>
 )}
 />
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// QR CHECK-IN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function QRCheckinScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [mode, setMode] = useState<'scan'|'manual'|'history'>('scan');
 const [manualId, setManualId] = useState('');
 const pulseAnim = useRef(new Animated.Value(1)).current;

 useEffect(() => {
 const loop = Animated.loop(Animated.sequence([
 Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
 Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
 ]));
 loop.start();
 return () => loop.stop();
 }, []);

 const CHECKIN_HISTORY = [
 { id:'1', patient:'أحمد السالم', time:'09:05', dept:'الباطنية', status:'checked_in' },
 { id:'2', patient:'سارة المالكي', time:'09:32', dept:'الأطفال', status:'checked_in' },
 { id:'3', patient:'محمد الغامدي', time:'10:15', dept:'الجراحة', status:'no_show' },
 ];

 return (
 <NScroll>
 <NHeader title={AR ? ' تسجيل دخول المرضى QR' : ' Patient QR Check-in'} onBack={onBack} />

 {/* Mode tabs */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.xl }}>
 {[
 { k:'scan', ar:'مسح QR', en:'Scan QR' },
 { k:'manual', ar:'يدوي', en:'Manual' },
 { k:'history', ar:'السجل', en:'History' },
 ].map(m => (
 <TouchableOpacity key={m.k} onPress={() => setMode(m.k as any)}
 style={[{ flex:1, paddingVertical:SP.md, borderRadius:R.lg, borderWidth:1.5, alignItems:'center' }, {
 backgroundColor: mode===m.k ? theme.primary : theme.surface2,
 borderColor: mode===m.k ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: mode===m.k?'#FFF':theme.text, fontWeight: FW.semi, fontSize: FS.sm }}>
 {AR ? m.ar : m.en}
 </Text>
 </TouchableOpacity>
 ))}
 </View>

 {mode === 'scan' && (
 <View>
 {/* QR Scanner placeholder */}
 <NCard style={{ marginBottom: SP.xl, alignItems: 'center', padding: SP.xxl }}>
 <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
 <View style={[s.qrFrame, { borderColor: theme.primary }]}>
 <Text style={{ fontSize: 60 }}></Text>
 </View>
 </Animated.View>
 <Text style={{ fontSize: FS.md, color: theme.text, marginTop: SP.lg, textAlign: 'center', fontWeight: FW.semi }}>
 {AR ? 'وجّه الكاميرا نحو رمز QR الموعد' : 'Point camera at appointment QR code'}
 </Text>
 <NBtn label={AR?'تفعيل الكاميرا':'Open Camera'} onPress={() => show(AR?'الكاميرا ستفتح في التطبيق الحقيقي':'Camera opens in real app','info')}
 style={{ marginTop: SP.xl }} />
 </NCard>

 <NCard style={{ backgroundColor: theme.infoBg }}>
 <Text style={{ fontSize: FS.sm, color: theme.info, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
 {AR
 ? 'كل مريض يمتلك QR Code فريد في تطبيق المريض. مسحه يؤكد وصوله ويبدأ العداد الزمني للانتظار.'
 : 'Each patient has a unique QR in their app. Scanning it confirms arrival and starts the wait timer.'}
 </Text>
 </NCard>
 </View>
 )}

 {mode === 'manual' && (
 <View>
 <NInput
 label={AR ? 'رقم الموعد أو هوية المريض' : 'Appointment ID or Patient ID'}
 placeholder={AR ? 'APT-2025-XXXXX' : 'APT-2025-XXXXX'}
 value={manualId} onChange={setManualId} icon=""
 />
 <NBtn label={AR?'تأكيد الوصول':'Confirm Arrival'} disabled={!manualId.trim()}
 onPress={() => { show(AR?'تم تأكيد وصول المريض ':'Patient arrival confirmed ','success'); setManualId(''); }} />
 </View>
 )}

 {mode === 'history' && (
 <View>
 <NSecHeader title={AR?'سجل تسجيل الدخول اليوم':'Today\'s Check-in Log'} />
 {CHECKIN_HISTORY.map(ch => (
 <NCard key={ch.id} style={{ marginBottom: SP.sm }}>
 <View style={{ flexDirection: AR?'row-reverse':'row', alignItems:'center', gap: SP.md }}>
 <NAvatar name={ch.patient} size={40} />
 <View style={{ flex:1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.semi, color: theme.text,
 textAlign: AR?'right':'left' }}>{ch.patient}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{ch.dept} · {ch.time}</Text>
 </View>
 <NBadge label={ch.status==='checked_in'?(AR?' حضر':' Arrived'):(AR?' لم يحضر':' No-Show')}
 variant={ch.status==='checked_in'?'success':'danger'} size="xs" />
 </View>
 </NCard>
 ))}
 </View>
 )}
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// INSURANCE CLAIMS HUB
// ══════════════════════════════════════════════════════════════════════════════
function InsuranceClaimsHubScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [statusFilter, setStatusFilter] = useState<'all'|'pending'|'approved'|'rejected'>('all');

 const CLAIMS = [
 { id:'c1', patient:'أحمد السالم', company:'Bupa', plan:'A', amount:1500, deductible:150, status:'pending', date:'2025-03-20', diagCode:'J06.9' },
 { id:'c2', patient:'سارة المالكي', company:'Tawuniya', plan:'VIP', amount:3200, deductible:0, status:'approved', date:'2025-03-19', diagCode:'K29.7' },
 { id:'c3', patient:'فيصل الزهراني',company:'MedGulf', plan:'B', amount:800, deductible:80, status:'rejected', date:'2025-03-18', diagCode:'M54.5' },
 { id:'c4', patient:'نورا الشمري', company:'Bupa', plan:'VIP+',amount:5600, deductible:0, status:'pending', date:'2025-03-21', diagCode:'I10' },
 ];

 const filtered = statusFilter === 'all' ? CLAIMS : CLAIMS.filter(c => c.status === statusFilter);
 const totalAmt = CLAIMS.filter(c=>c.status==='approved').reduce((a,c)=>a+c.amount-c.deductible,0);
 const pendingAmt = CLAIMS.filter(c=>c.status==='pending').reduce((a,c)=>a+c.amount-c.deductible,0);

 return (
 <NScroll>
 <NHeader title={AR ? ' مطالبات التأمين' : ' Insurance Claims Hub'} onBack={onBack} />

 <View style={{ flexDirection:'row', gap: SP.md, marginBottom: SP.xl }}>
 <NStatCard icon="" label={AR?'مقبولة هذا الشهر':'Approved this month'} value={`${(totalAmt/1000).toFixed(1)}K`} unit={AR?'ر':'SAR'} color="#4CAF50" style={{ flex:1 }} />
 <NStatCard icon="" label={AR?'قيد الانتظار':'Pending'} value={`${(pendingAmt/1000).toFixed(1)}K`} unit={AR?'ر':'SAR'} color="#FF9800" style={{ flex:1 }} />
 </View>

 <ScrollView horizontal showsHorizontalScrollIndicator={false}
 contentContainerStyle={{ gap: SP.sm, marginBottom: SP.lg }}>
 {[
 { k:'all', ar:'الكل', en:'All' },
 { k:'pending', ar:'انتظار', en:'Pending' },
 { k:'approved', ar:'مقبولة', en:'Approved' },
 { k:'rejected', ar:'مرفوضة', en:'Rejected' },
 ].map(f => (
 <TouchableOpacity key={f.k} onPress={() => setStatusFilter(f.k as any)}
 style={[s.chipBtn, {
 backgroundColor: statusFilter===f.k ? theme.primary : theme.surface2,
 borderColor: statusFilter===f.k ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: statusFilter===f.k?'#FFF':theme.text, fontSize: FS.sm }}>
 {AR ? f.ar : f.en}
 </Text>
 </TouchableOpacity>
 ))}
 </ScrollView>

 {filtered.map(claim => (
 <NCard key={claim.id} style={{ marginBottom: SP.md }}
 accent={claim.status==='approved' ? theme.success : claim.status==='rejected' ? theme.danger : theme.warn}>
 <View style={{ flexDirection: AR?'row-reverse':'row', justifyContent:'space-between', marginBottom: SP.sm }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{claim.patient}</Text>
 <NBadge
 label={claim.status==='approved'?(AR?' مقبولة':' Approved') :
 claim.status==='rejected'?(AR?' مرفوضة':' Rejected') : (AR?' انتظار':' Pending')}
 variant={claim.status==='approved'?'success':claim.status==='rejected'?'danger':'warning'}
 size="xs"
 />
 </View>
 <View style={{ flexDirection: AR?'row-reverse':'row', justifyContent:'space-between' }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{claim.company} · {claim.plan} · {claim.diagCode}</Text>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary }}>
 {(claim.amount - claim.deductible).toLocaleString()} {AR?'ر':'SAR'}
 </Text>
 </View>
 {claim.deductible > 0 && (
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR?'right':'left', marginTop: 2 }}>
 {AR ? `التحمّل: ${claim.deductible} ريال` : `Deductible: ${claim.deductible} SAR`}
 </Text>
 )}
 {claim.status === 'pending' && (
 <View style={{ flexDirection: AR?'row-reverse':'row', gap: SP.sm, marginTop: SP.md }}>
 <NBtn label={AR?'↑ إعادة إرسال':'Resubmit'} size="xs" variant="outline" full={false}
 style={{ paddingHorizontal: SP.lg }} onPress={() => show(AR?'تم إعادة الإرسال':'Resubmitted','success')} />
 <NBtn label={AR?' التفاصيل':'Details'} size="xs" full={false}
 style={{ paddingHorizontal: SP.lg }} onPress={() => show(AR?'تفاصيل المطالبة':'Claim details','info')} />
 </View>
 )}
 </NCard>
 ))}

 <NBtn label={AR?' إرسال مطالبة جديدة':' Submit New Claim'} variant="outline" icon=""
 onPress={() => show(AR?'فتح نموذج المطالبة':'Claim form opening','info')} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// FINANCIAL REPORTS
// ══════════════════════════════════════════════════════════════════════════════
function FacilityFinancialScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [period, setPeriod] = useState<'week'|'month'|'year'>('month');

 const DATA = period === 'week'
 ? { rev: 87000, ops: 210, insRev: 34000, cashRev: 53000, topDept: AR?'الباطنية':'Internal Medicine' }
 : period === 'month'
 ? { rev: 354000, ops: 860, insRev: 142000, cashRev: 212000, topDept: AR?'الباطنية':'Internal Medicine' }
 : { rev: 4280000, ops: 10320, insRev: 1712000, cashRev: 2568000, topDept: AR?'الجراحة':'Surgery' };

 const BAR = [42,58,71,63,88,95,80,110,98,76,120,105];
 const maxB = Math.max(...BAR);

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
 {DATA.rev.toLocaleString()}
 </Text>
 <Text style={{ color:'rgba(255,255,255,0.8)' }}>{AR?'ريال سعودي':'Saudi Riyal'}</Text>
 <View style={{ flexDirection:AR?'row-reverse':'row', gap: SP.xxl, marginTop: SP.lg }}>
 <View style={{ alignItems:'center' }}>
 <Text style={{ color:'#FFF', fontSize: FS.lg, fontWeight: FW.bold }}>{DATA.ops}</Text>
 <Text style={{ color:'rgba(255,255,255,0.7)', fontSize: FS.xs }}>{AR?'مريض':'Patients'}</Text>
 </View>
 <View style={{ alignItems:'center' }}>
 <Text style={{ color:'#FFF', fontSize: FS.lg, fontWeight: FW.bold }}>{DATA.insRev.toLocaleString()}</Text>
 <Text style={{ color:'rgba(255,255,255,0.7)', fontSize: FS.xs }}>{AR?'تأمين':'Insurance'}</Text>
 </View>
 <View style={{ alignItems:'center' }}>
 <Text style={{ color:'#FFF', fontSize: FS.lg, fontWeight: FW.bold }}>{DATA.cashRev.toLocaleString()}</Text>
 <Text style={{ color:'rgba(255,255,255,0.7)', fontSize: FS.xs }}>{AR?'نقدي':'Cash'}</Text>
 </View>
 </View>
 </NCard>

 {/* Revenue chart */}
 <NCard style={{ marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text,
 marginBottom: SP.lg, textAlign: AR?'right':'left' }}>
  {AR?'مؤشر الإيرادات الشهرية':'Monthly Revenue Trend'}
 </Text>
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
 <View style={{ flexDirection:'row', alignItems:'flex-end', gap: SP.sm, height:120 }}>
 {BAR.map((val, i) => (
 <View key={i} style={{ alignItems:'center', width:36 }}>
 <View style={{
 width:28, height: Math.max(8,(val/maxB)*100),
 backgroundColor: theme.primary, borderRadius:6, opacity:0.85,
 }} />
 <Text style={{ fontSize:9, color:theme.textSub, marginTop:4 }}>
 {['ي','ف','م','أ','م','ي','ي','أ','س','أ','ن','د'][i]}
 </Text>
 </View>
 ))}
 </View>
 </ScrollView>
 </NCard>

 {/* Department breakdown */}
 <NCard style={{ marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text,
 marginBottom: SP.lg, textAlign: AR?'right':'left' }}>
  {AR?'الإيرادات بالقسم':'Revenue by Department'}
 </Text>
 {[
 { ar:'الباطنية', en:'Internal Med.', pct:35, color:'#2196F3' },
 { ar:'الجراحة', en:'Surgery', pct:28, color:'#9C27B0' },
 { ar:'الأطفال', en:'Pediatrics', pct:18, color:'#FF9800' },
 { ar:'الطوارئ', en:'Emergency', pct:12, color:'#F44336' },
 { ar:'أخرى', en:'Other', pct:7, color:'#607D8B' },
 ].map((dept, i) => (
 <View key={i} style={{ marginBottom: SP.md }}>
 <View style={{ flexDirection:AR?'row-reverse':'row', justifyContent:'space-between', marginBottom:4 }}>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR?dept.ar:dept.en}</Text>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: dept.color }}>{dept.pct}%</Text>
 </View>
 <View style={{ height:8, backgroundColor:theme.surface2, borderRadius:R.full }}>
 <View style={{ height:8, width:`${dept.pct}%`, backgroundColor:dept.color, borderRadius:R.full }} />
 </View>
 </View>
 ))}
 </NCard>

  {/* Sub-Account Wallets */}
  <NCard style={{ marginBottom: SP.xl }}>
    <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.lg, textAlign: AR ? 'right' : 'left' }}>
      {AR ? 'إيرادات المزودين (Sub-Accounts)' : 'Provider Revenues (Sub-Accounts)'}
    </Text>
    {[
      { ar: 'د. خالد سالم', en: 'Dr. Khalid Salem', amount: 145000, color: theme.primary },
      { ar: 'د. سارة محمد', en: 'Dr. Sara Mohammed', amount: 98000, color: theme.success },
      { ar: 'د. ريم عبد الله', en: 'Dr. Reem Abdullah', amount: 76000, color: theme.warn },
    ].map((prov, i) => (
      <View key={i} style={{ marginBottom: SP.md }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? prov.ar : prov.en}</Text>
          <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: prov.color }}>{prov.amount.toLocaleString()} {AR ? 'ر' : 'SAR'}</Text>
        </View>
        <View style={{ height: 8, backgroundColor: theme.surface2, borderRadius: R.full }}>
          <View style={{ height: 8, width: `${(prov.amount / 354000) * 100}%`, backgroundColor: prov.color, borderRadius: R.full }} />
        </View>
      </View>
    ))}
  </NCard>

 <View style={{ flexDirection: AR?'row-reverse':'row', gap: SP.md }}>
 <View style={{ flex:1 }}>
 <NBtn label={AR?' تصدير PDF':'Export PDF'} variant="outline" icon=""
 onPress={() => show(AR?'جاري إنشاء التقرير...':'Generating report...','info')} />
 </View>
 <View style={{ flex:1 }}>
 <NBtn label={AR?' Excel':'Excel'} variant="secondary" icon=""
 onPress={() => show(AR?'جاري التصدير...':'Exporting...','info')} />
 </View>
 </View>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// STAFF ATTENDANCE
// ══════════════════════════════════════════════════════════════════════════════
function StaffAttendanceScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const ATTENDANCE = [
 { id:'1', name:'د. محمد العمري', role:'doctor', checkIn:'08:02', checkOut:'—', status:'present' },
 { id:'2', name:'د. نورا الشمري', role:'doctor', checkIn:'14:05', checkOut:'—', status:'present' },
 { id:'3', name:'د. خالد المالكي', role:'doctor', checkIn:'—', checkOut:'—', status:'absent' },
 { id:'4', name:'أ. سارة الغامدي', role:'insurance', checkIn:'08:58', checkOut:'17:02', status:'done' },
 { id:'5', name:'أ. فيصل الحربي', role:'reception', checkIn:'07:55', checkOut:'—', status:'present' },
 ];

 const present = ATTENDANCE.filter(a=>a.status!=='absent').length;
 const absent = ATTENDANCE.filter(a=>a.status==='absent').length;

 return (
 <NScroll>
 <NHeader title={AR?' الحضور والانصراف':' Staff Attendance'} onBack={onBack} />

 <View style={{ flexDirection:'row', gap: SP.md, marginBottom: SP.xl }}>
 <NStatCard icon="" label={AR?'حاضر':'Present'} value={String(present)} color="#4CAF50" style={{ flex:1 }} />
 <NStatCard icon="" label={AR?'غائب':'Absent'} value={String(absent)} color="#F44336" style={{ flex:1 }} />
 <NStatCard icon="" label={AR?'الإجمالي':'Total'} value={String(ATTENDANCE.length)} color="#2196F3" style={{ flex:1 }} />
 </View>

 <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.info, textAlign: AR?'right':'left' }}>
 {AR
 ? 'تسجيل الحضور يتم تلقائياً عند تسجيل الدخول في التطبيق داخل نطاق المنشأة (GPS).'
 : 'Attendance auto-registered when staff log in within facility GPS range.'}
 </Text>
 </NCard>

 {ATTENDANCE.map(staff => (
 <NCard key={staff.id} style={{ marginBottom: SP.sm }}>
 <View style={{ flexDirection: AR?'row-reverse':'row', alignItems:'center', gap: SP.md }}>
 <NAvatar name={staff.name} size={44}
 online={staff.status==='present' || staff.status==='done'} />
 <View style={{ flex:1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text,
 textAlign: AR?'right':'left' }}>{staff.name}</Text>
 <View style={{ flexDirection:AR?'row-reverse':'row', gap: SP.lg, marginTop:2 }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
 🟢 {staff.checkIn !== '—' ? staff.checkIn : (AR?'لم يسجل':'Not checked in')}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
 {staff.checkOut !== '—' ? staff.checkOut : (AR?'لم يغادر':'Not checked out')}
 </Text>
 </View>
 </View>
 <NBadge
 label={staff.status==='present'?(AR?'حاضر':'Present') :
 staff.status==='done'?(AR?'أكمل':'Completed') : (AR?'غائب':'Absent')}
 variant={staff.status==='absent'?'danger':staff.status==='done'?'info':'success'}
 size="xs"
 />
 </View>
 </NCard>
 ))}

 <NBtn label={AR?' تقرير الحضور الشهري':'Monthly Attendance Report'} variant="outline"
 onPress={() => show(AR?'جاري إنشاء التقرير...':'Generating...','info')} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// SURGERY SCHEDULE (OT)
// ══════════════════════════════════════════════════════════════════════════════
function SurgeryScheduleScreen({ onBack, surgeries, onRefresh }: { onBack: () => void; surgeries: any[]; onRefresh: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [bookingVisible, setBookingVisible] = useState(false);
 const [patientId, setPatientId] = useState('');
 const [surgeonId, setSurgeonId] = useState('');
 const [otRoom, setOtRoom] = useState('OR-1');
 const [scheduledAt, setScheduledAt] = useState('');
 const [duration, setDuration] = useState('90');
 const [loading, setLoading] = useState(false);

 const rooms = ['OR-1', 'OR-2', 'OR-3'];
 const ORS = rooms.map(room => ({
 room,
 surgeries: surgeries.filter(s => s.ot_room_number === room)
 }));

 const handleBookSurgery = async () => {
 if (!patientId.trim() || !surgeonId.trim() || !scheduledAt.trim()) {
 return show(AR ? 'يرجى ملء جميع الحقول الإجبارية' : 'Please fill all required fields', 'warning');
 }
 setLoading(true);
 try {
 const date = new Date(scheduledAt);
 if (isNaN(date.getTime())) {
 throw new Error(AR ? 'تنسيق التاريخ غير صحيح. يرجى استخدام YYYY-MM-DD HH:MM' : 'Invalid date format. Use YYYY-MM-DD HH:MM');
 }

 // OR collision checking
 const requestedTime = date.getTime();
 const requestedDurationMs = parseInt(duration, 10) * 60 * 1000;
 const collision = surgeries.find(s => {
 if (s.ot_room_number !== otRoom) return false;
 const sTime = new Date(s.scheduled_at).getTime();
 const sDurationMs = (s.duration_mins || 90) * 60 * 1000;
 return (requestedTime < sTime + sDurationMs) && (requestedTime + requestedDurationMs > sTime);
 });
 if (collision) {
 throw new Error(AR 
 ? ` تعارض في المواعيد! يوجد عملية أخرى مجدولة في الغرفة ${otRoom} في هذا الوقت.` 
 : ` Schedule Conflict! There is another surgery scheduled in room ${otRoom} at this time.`);
 }

 await client.post('/facility/surgeries/book', {
 patient_id: patientId,
 primary_surgeon_id: surgeonId,
 ot_room_number: otRoom,
 scheduled_at: date,
 duration_mins: parseInt(duration, 10),
 assistants: []
 });

 show(AR ? 'تم حجز غرفة العمليات وجدولة العملية بنجاح' : 'Surgery room booked and scheduled successfully', 'success');
 setBookingVisible(false);
 setPatientId('');
 setSurgeonId('');
 setScheduledAt('');
 onRefresh();
 } catch (e: any) {
 show(e.message || 'Surgery booking failed', 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR?' جدول غرف العمليات':' Surgery Schedule (OT)'} onBack={onBack} />

 <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl, marginHorizontal: SP.md }}>
 <View style={{ flexDirection: AR?'row-reverse':'row', gap: SP.lg }}>
 <View style={{ alignItems:'center' }}>
 <Text style={{ fontSize: FS['2xl'], fontWeight: FW.xbold, color: theme.info }}>3</Text>
 <Text style={{ fontSize: FS.xs, color: theme.info }}>{AR?'غرف':'Rooms'}</Text>
 </View>
 <View style={{ alignItems:'center' }}>
 <Text style={{ fontSize: FS['2xl'], fontWeight: FW.xbold, color: theme.info }}>{String(surgeries.length)}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.info }}>{AR?'عمليات مجدولة':'Scheduled'}</Text>
 </View>
 </View>
 </NCard>

 {ORS.map(or => (
 <View key={or.room} style={{ marginBottom: SP.xl, paddingHorizontal: SP.md }}>
 <View style={{ flexDirection: AR?'row-reverse':'row', alignItems:'center', gap: SP.md, marginBottom: SP.md }}>
 <View style={{ width: 40, height: 40, borderRadius: R.md,
 backgroundColor: or.surgeries.length > 0 ? theme.primaryLight : theme.surface2,
 alignItems:'center', justifyContent:'center' }}>
 <Text style={{ fontSize: 20 }}></Text>
 </View>
 <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>{or.room}</Text>
 <NBadge
 label={or.surgeries.length===0?(AR?'فارغة':'Empty') : (AR?'مجدولة':'Scheduled')}
 variant={or.surgeries.length===0?'default':'primary'}
 size="xs"
 />
 </View>

 {or.surgeries.length === 0 ? (
 <NCard style={{ backgroundColor: theme.surface2, alignItems:'center', padding: SP.xl }}>
 <Text style={{ color: theme.textSub }}>{AR?'لا توجد عمليات مجدولة':'No surgeries scheduled'}</Text>
 <NBtn label={AR?'+ جدولة عملية':'+ Schedule Surgery'} size="sm" variant="outline"
 style={{ marginTop: SP.md }}
 onPress={() => { setOtRoom(or.room); setBookingVisible(true); }} />
 </NCard>
 ) : (
 or.surgeries.map(surg => (
 <NCard key={surg.id} style={{ marginBottom: SP.sm }} accent={theme.primary}>
 <View style={{ flexDirection:AR?'row-reverse':'row', justifyContent:'space-between', marginBottom: SP.xs }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{surg.patient_name || surg.patient_id}</Text>
 <NBadge label={AR?'🟡 مجدولة':'🟡 Scheduled'} variant="warning" size="xs" />
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign:AR?'right':'left' }}>
 {AR?`جراح رئيسي: ${surg.primary_surgeon_id}`:`Surgeon ID: ${surg.primary_surgeon_id}`}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.primary, marginTop:2 }}>
 ⏰ {new Date(surg.scheduled_at).toLocaleString()} · {surg.duration_mins} {AR?'دقيقة':'min'}
 </Text>
 </NCard>
 ))
 )}
 </View>
 ))}

 <View style={{ paddingHorizontal: SP.md, marginBottom: SP.xl }}>
 <NBtn label={AR?'+ جدولة عملية جديدة':'+ Schedule New Surgery'} variant="outline"
 onPress={() => { setOtRoom('OR-1'); setBookingVisible(true); }} />
 </View>
 </NScroll>

 {/* Booking Form Sheet */}
 <NSheet visible={bookingVisible} onClose={() => setBookingVisible(false)} title={AR ? 'جدولة عملية جراحية' : 'Schedule Surgery'}>
 <ScrollView contentContainerStyle={{ padding: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>{AR ? `الغرفة المحددة: ${otRoom}` : `Selected Room: ${otRoom}`}</Text>
 
 <NInput label={AR ? 'معرف المريض (Patient ID)' : 'Patient ID'} placeholder={AR ? 'أدخل معرف المريض...' : 'Enter patient ID...'} value={patientId} onChange={setPatientId} required />
 <NInput label={AR ? 'معرف الجراح الرئيسي' : 'Surgeon ID'} placeholder={AR ? 'أدخل معرف الجراح...' : 'Enter surgeon ID...'} value={surgeonId} onChange={setSurgeonId} required />
 
 <NInput label={AR ? 'التاريخ والوقت (YYYY-MM-DD HH:MM)' : 'Date & Time (YYYY-MM-DD HH:MM)'} placeholder="2026-06-18 10:00" value={scheduledAt} onChange={setScheduledAt} required />
 <NInput label={AR ? 'المدة بالدقائق' : 'Duration (mins)'} placeholder="90" value={duration} onChange={setDuration} kbType="numeric" required />

 <NBtn label={AR ? 'تأكيد وحجز الغرفة' : 'Book Surgery Room'} loading={loading} onPress={handleBookSurgery} />
 </ScrollView>
 </NSheet>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// CREDENTIALING SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function CredentialingScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const CREDS = [
 { id:'cr1', doctor:'د. محمد العمري', scfhs:'123456', scfhsExp:'2026-06-01', malpractice:true, malpExp:'2026-01-01', status:'valid', daysLeft:365 },
 { id:'cr2', doctor:'د. نورا الشمري', scfhs:'234567', scfhsExp:'2025-08-15', malpractice:true, malpExp:'2025-07-01', status:'expiring', daysLeft:65 },
 { id:'cr3', doctor:'د. خالد المالكي', scfhs:'345678', scfhsExp:'2025-04-01', malpractice:false, malpExp:'—', status:'expired', daysLeft:-30 },
 ];

 return (
 <NScroll>
 <NHeader title={AR?' التوثيق المهني':' Credentialing'} onBack={onBack} />

 <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.info, lineHeight: 20, textAlign: AR?'right':'left' }}>
 {AR
 ? 'تتبع تراخيص SCFHS، شهادات المؤهلات، تأمين المسؤولية المهنية لجميع الأطباء تلقائياً مع تنبيهات الانتهاء.'
 : 'Track SCFHS licenses, qualification certificates, and malpractice insurance for all doctors with expiry alerts.'}
 </Text>
 </NCard>

 <View style={{ flexDirection:'row', gap: SP.md, marginBottom: SP.xl }}>
 <NStatCard icon="" label={AR?'سارية':'Valid'} value={String(CREDS.filter(c=>c.status==='valid').length)} color="#4CAF50" style={{ flex:1 }} />
 <NStatCard icon="" label={AR?'تنتهي قريباً':'Expiring'} value={String(CREDS.filter(c=>c.status==='expiring').length)} color="#FF9800" style={{ flex:1 }} />
 <NStatCard icon="" label={AR?'منتهية':'Expired'} value={String(CREDS.filter(c=>c.status==='expired').length)} color="#F44336" style={{ flex:1 }} />
 </View>

 {CREDS.map(cred => (
 <NCard key={cred.id} style={{ marginBottom: SP.md }}
 accent={cred.status==='expired' ? theme.danger : cred.status==='expiring' ? theme.warn : theme.success}>
 <View style={{ flexDirection:AR?'row-reverse':'row', justifyContent:'space-between', marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{cred.doctor}</Text>
 <NBadge
 label={cred.status==='valid'?(AR?' سارية':' Valid') :
 cred.status==='expiring'?(AR?' تنتهي قريباً':' Expiring Soon') : (AR?' منتهية':' Expired')}
 variant={cred.status==='valid'?'success':cred.status==='expiring'?'warning':'danger'}
 size="xs"
 />
 </View>
 <View style={{ gap: SP.xs }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign:AR?'right':'left' }}>
 SCFHS: {cred.scfhs} · {AR?`ينتهي: ${cred.scfhsExp}`:`Expires: ${cred.scfhsExp}`}
 </Text>
 <Text style={{ fontSize: FS.sm, color: cred.malpractice ? theme.success : theme.danger, textAlign:AR?'right':'left' }}>
 {AR?'تأمين المسؤولية:':'Malpractice:'} {cred.malpractice ? (AR?` ${cred.malpExp}`:` ${cred.malpExp}`) : (AR?' غير مشترك':' Not insured')}
 </Text>
 {cred.daysLeft < 90 && (
 <Text style={{ fontSize: FS.xs, color: cred.daysLeft < 0 ? theme.danger : theme.warn, fontWeight: FW.bold }}>
 {cred.daysLeft < 0
 ? (AR?`انتهى منذ ${Math.abs(cred.daysLeft)} يوم`:`Expired ${Math.abs(cred.daysLeft)} days ago`)
 : (AR?`ينتهي خلال ${cred.daysLeft} يوم`:`Expires in ${cred.daysLeft} days`)}
 </Text>
 )}
 </View>
 <View style={{ flexDirection:AR?'row-reverse':'row', gap: SP.sm, marginTop: SP.md }}>
 <NBtn label={AR?' الوثائق':'Docs'} size="xs" variant="outline" full={false}
 style={{ paddingHorizontal: SP.lg }} onPress={() => show(AR?'عرض الوثائق':'View docs','info')} />
 {cred.status !== 'valid' && (
 <NBtn label={AR?'↑ تجديد':'Renew'} size="xs" full={false}
 style={{ paddingHorizontal: SP.lg }} onPress={() => show(AR?'فتح نموذج التجديد':'Renewal form','info')} />
 )}
 </View>
 </NCard>
 ))}
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// FACILITY SETTINGS
// ══════════════════════════════════════════════════════════════════════════════
function FacilitySettingsScreen({ onLogout, onNavigate }: { onLogout: () => void; onNavigate: (s: string) => void }) {
 const { theme, toggle: toggleTheme, mode } = useTheme();
 const { lang, toggle: toggleLang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [showLogout, setLogout] = useState(false);

 // Pricing details states
 const [showPricing, setShowPricing] = useState(false);
 const [icuDaily, setIcuDaily] = useState('1500');
 const [icuHourly, setIcuHourly] = useState('100');
 const [wardDaily, setWardDaily] = useState('500');
 const [surgPrice, setSurgPrice] = useState('3000');
 const [erFee, setErFee] = useState('250');
 const [ambFee, setAmbFee] = useState('150');
 const [savingPrices, setSavingPrices] = useState(false);

 const handleSavePrices = async () => {
 setSavingPrices(true);
 try {
   await client.post('/provider-deltas', { 
     newData: { icuDaily, icuHourly, wardDaily, surgPrice, erFee, ambFee } 
   });
   setSavingPrices(false);
   setShowPricing(false);
   show(AR ? 'بانتظار موافقة الإدارة على الأسعار الجديدة' : 'Pending admin approval for new pricing', 'success');
 } catch(e) {
   show(AR ? 'فشل إرسال التعديلات' : 'Failed to submit changes', 'error');
   setSavingPrices(false);
 }
 };

 
  const [deltaPending, setDeltaPending] = useState(false);
  const saveSettings = async (newData: any = {}) => {
    try {
      setDeltaPending(true);
      await client.post('/provider-deltas', { newData });
      show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending admin approval for changes', 'success');
    } catch (e) {
      show(AR ? 'فشل إرسال التعديلات' : 'Failed to submit changes', 'error');
      setDeltaPending(false);
    }
  };
return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[s.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>
 {AR?'️ إعدادات المنشأة':'️ Facility Settings'}
 </Text>
 </View>
 <ScrollView contentContainerStyle={{ padding: SP.xl, paddingBottom: 100 }}>
 {/* Facility Info */}
 <NCard style={{ marginBottom: SP.xl, flexDirection:AR?'row-reverse':'row', gap: SP.lg, alignItems:'center' }}>
 <View style={{ width:60, height:60, borderRadius:R.lg, backgroundColor:theme.primaryLight,
 alignItems:'center', justifyContent:'center' }}>
 <Text style={{ fontSize:32 }}></Text>
 </View>
 <View style={{ flex:1 }}>
 <Text style={{ fontSize:FS.xl, fontWeight:FW.bold, color:theme.text,
 textAlign:AR?'right':'left' }}>{AR?'مستشفى نبضة الطبي':'Nabdah Medical Hospital'}</Text>
 <Text style={{ fontSize:FS.sm, color:theme.textSub }}>{AR?'مستشفى':'Hospital'}</Text>
 <NBadge label={AR?' حساب نشط':' Active'} variant="success" size="xs" style={{ marginTop:SP.xs }} />
 </View>
 </NCard>

 <NSecHeader title={AR?'إدارة المنشأة':'Facility Management'} />
 <NCard style={{ marginBottom: SP.xl }}>
 {[
 { icon:'facility', ar:'معلومات المنشأة', en:'Facility Information', action: () => onNavigate('facility_info') },
 { icon:'home', ar:'الأقسام والخدمات', en:'Departments & Services', action: () => onNavigate('departments') },
 { icon:'wallet', ar:'الأسعار والتعريفات', en:'Pricing & Rates', action: () => setShowPricing(true) },
 { icon:'shield', ar:'إعدادات التأمين', en:'Insurance Settings', action: () => onNavigate('insurance_config') },
 { icon:'document', ar:'الرخص والمستندات الرسمية', en:'Licenses & Documents', action: () => onNavigate('certificates_config') },
 { icon:'camera', ar:'الصور والوسائط', en:'Photos & Media', action: () => onNavigate('media_config') },
 { icon:'users', ar:'إدارة الحسابات الفرعية',en:'Sub-Account Management', action: () => onNavigate('subaccounts') },
 { icon:'calendar', ar:'المواعيد والجداول', en:'Schedule & Shifts', action: () => onNavigate('shifts') },
 { icon:'document', ar:'إدارة الأسرّة', en:'Bed Management', action: () => onNavigate('beds') },
 { icon:'scan', ar:'نظام QR Check-in', en:'QR Check-in System', action: () => onNavigate('qr_checkin') },
 ].map((row, i) => (
 <NSettingsRow key={i} icon={row.icon} label={AR?row.ar:row.en}
 onPress={row.action} />
 ))}
 </NCard>

 {/* Marketing & Reputation */}
 <NSecHeader title={AR ? 'التسويق والمبيعات والطوارئ' : 'Marketing, Sales & SOS'} />
 <NCard style={{ marginBottom: SP.xl }}>
 {[
 { icon:'bell', ar:'مركز العروض الترويجية', en:'Promotions Center', action:()=>onNavigate('promotions') },
 { icon:'globe', ar:'إعدادات الصفحة العامة', en:'Mini-Website Settings', action:()=>onNavigate('web_config') },
 { icon:'wallet', ar:'الاشتراكات والإعلانات', en:'Subscriptions & Ads', action:()=>onNavigate('subscriptions_ads') },
 { icon:'star', ar:'مستوى السمعة والتقييمات',en:'Reputation & Ratings', action:()=>onNavigate('reputation') },
 { icon:'chart', ar:'إدارة العملاء والأرباح', en:'CRM & Business Insights', action:()=>onNavigate('crm') },
 { icon:'shield', ar:'مراقبة الطوارئ وسيارات الإسعاف',en:'SOS Dispatch Control', action:()=>onNavigate('sos_dispatch') },
 ].map((row, i) => (
 <NSettingsRow key={i} icon={row.icon} label={AR ? row.ar : row.en} onPress={row.action} />
 ))}
 </NCard>

 <NSecHeader title={AR?'التفضيلات':'Preferences'} />
 <NCard style={{ marginBottom: SP.xl }}>
 <NToggle label={AR?' الوضع الداكن':' Dark Mode'} value={mode==='dark'} onChange={toggleTheme} />
 <NSettingsRow icon="globe" label={AR?'اللغة: العربية':'Language: Arabic'} onPress={toggleLang} />
 <NSettingsRow icon="bell" label={AR?'الإشعارات':'Notifications'} onPress={() => onNavigate('notifications')} />
 <NSettingsRow icon="chart" label={AR?'التقارير التلقائية':'Auto Reports'} onPress={() => onNavigate('statistics')} />
 <NSettingsRow icon="briefcase" label={AR?'الوظائف الطبية':'Medical Jobs'} onPress={() => onNavigate('medical_jobs')} />
 <NSettingsRow icon="bookOpen" label={AR?'دليل الأدوية الطبي':'Medical Drug Index'} onPress={() => onNavigate('drug_index')} />
 </NCard>

 <NSecHeader title={AR?'الأمان':'Security'} />
 <NCard style={{ marginBottom: SP.xl }}>
 {[
 { icon:'lock', ar:'تغيير كلمة المرور', en:'Change Password' },
 { icon:'shield', ar:'التحقق الثنائي 2FA', en:'Two-Factor Auth' },
 { icon:'scan', ar:'الأجهزة المرتبطة', en:'Linked Devices' },
 { icon:'document', ar:'سجل العمليات', en:'Audit Log' },
 ].map((row, i) => (
 <NSettingsRow key={i} icon={row.icon} label={AR?row.ar:row.en}
 onPress={() => show(AR?'إعدادات الأمان والتراخيص مفعلة':'Security & licensing active','info')} />
 ))}
 </NCard>

 <NSecHeader title={AR?'الدعم والقانونية':'Support & Legal'} />
 <NCard style={{ marginBottom: SP.xl }}>
 {[
 { icon:'', ar:'الشروط والأحكام', en:'Terms & Conditions' },
 { icon:'', ar:'سياسة الخصوصية', en:'Privacy Policy' },
 { icon:'', ar:'الدعم الفني', en:'Technical Support' },
 { icon:'', ar:'حول التطبيق', en:'About App' },
 ].map((row, i) => (
 <NSettingsRow key={i} icon={row.icon} label={AR?row.ar:row.en}
 onPress={() => show(AR?'الدعم: support@nabdah.com':'Support: support@nabdah.com','info')} />
 ))}
 </NCard>

 <NCard>
 <NSettingsRow icon="" label={AR?'تسجيل الخروج':'Log Out'}
 onPress={() => setLogout(true)} danger />
 </NCard>
 </ScrollView>

 {/* ICU & Wards pricing sheet */}
 <NSheet visible={showPricing} onClose={() => setShowPricing(false)} title={AR ? ' أسعار وتكاليف الخدمات' : ' Pricing & Tariffs'} height={550}>
 <ScrollView contentContainerStyle={{ padding: SP.md }}>
 <NPriceInput label={AR ? 'سعر سرير العناية المركزة ICU (يومي)' : 'ICU Bed Rate (Daily - SAR)'} value={icuDaily} onChange={setIcuDaily} />
 <NPriceInput label={AR ? 'سعر سرير العناية المركزة ICU (ساعي)' : 'ICU Bed Rate (Hourly - SAR)'} value={icuHourly} onChange={setIcuHourly} />
 <NPriceInput label={AR ? 'سعر سرير التنويم بالأجنحة (يومي)' : 'Ward Inpatient Rate (Daily - SAR)'} value={wardDaily} onChange={setWardDaily} />
 <NPriceInput label={AR ? 'تكلفة فتح غرف العمليات للعملية' : 'Surgery Room Starting Price (SAR)'} value={surgPrice} onChange={setSurgPrice} />
 <NPriceInput label={AR ? 'رسوم الطوارئ' : 'Emergency Fee (SAR)'} value={erFee} onChange={setErFee} />
 <NPriceInput label={AR ? 'رسوم الإسعاف' : 'Ambulance Fee (SAR)'} value={ambFee} onChange={setAmbFee} />
 
 <NBtn label={AR ? ' حفظ التعريفات' : ' Save Tariffs'} loading={savingPrices} onPress={handleSavePrices} style={{ marginTop: SP.md }} />
 </ScrollView>
 </NSheet>

 <NConfirm
 visible={showLogout}
 title={AR?'تسجيل الخروج':'Log Out'}
 msg={AR?'هل تريد تسجيل الخروج من حساب المنشأة؟':'Log out of facility account?'}
 onOk={() => { setLogout(false); onLogout(); }}
 onCancel={() => setLogout(false)}
 okLabel={AR?'تسجيل الخروج':'Log Out'}
 />
 </View>
 );
}

function HospitalDispatchScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [bookings, setBookings] = useState<any[]>([]);
 const [nurses, setNurses] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
 const [assigning, setAssigning] = useState(false);

 const fetchData = async () => {
 try {
 setLoading(true);
 const resBookings = await client.get('/home-care/bookings/nursing/all');
 setBookings(resBookings.data || []);
 
 const resNurses = await client.get('/home-care/providers?availability=now');
 setNurses(resNurses.data || []);
 } catch (err: any) {
 show(AR ? 'فشل جلب البيانات' : 'Failed to fetch dispatch data', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchData();
 }, []);

 const handleAssign = async (nurse: any) => {
 if (!selectedBooking) return;
 setAssigning(true);
 try {
 await client.post(`/home-care/bookings/${selectedBooking.id}/assign`, {
 nurse_id: nurse.id,
 nurse_name: nurse.name || nurse.name_ar,
 nurse_phone: nurse.phone || '+966500000000'
 });
 show(AR ? 'تم تعيين الممرض بنجاح' : 'Nurse assigned successfully', 'success');
 setSelectedBooking(null);
 fetchData();
 } catch (err: any) {
 show(err.message || (AR ? 'فشل التعيين' : 'Assignment failed'), 'error');
 } finally {
 setAssigning(false);
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? 'لوحة توجيه التمريض والممرضين' : 'Nursing Dispatch Panel'} onBack={onBack} />
 <FlatList
 data={bookings}
 keyExtractor={(item) => item.id}
 refreshing={loading}
 onRefresh={fetchData}
 contentContainerStyle={{ padding: SP.xl, gap: SP.md }}
 ListEmptyComponent={<NEmpty title={AR ? 'لا توجد طلبات رعاية منزلية حالياً' : 'No home care requests available'} />}
 renderItem={({ item }) => (
 <NCard style={{ gap: SP.sm }} accent={item.state === 'CREATED' ? '#FF9800' : '#4CAF50'}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{item.patient_name || item.patient_id}</Text>
 <NBadge label={item.state} variant={item.state === 'CREATED' ? 'warning' : 'success'} />
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
  {AR ? 'الخدمة المطلوبة:' : 'Requested Service:'} {item.service_name_ar || item.service_name_en}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'الموعد:' : 'Scheduled at:'} {new Date(item.scheduled_at).toLocaleString()}
 </Text>
 {item.provider_name ? (
 <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'الممرض المعين:' : 'Assigned Nurse:'} {item.provider_name}
 </Text>
 ) : (
 <NBtn label={AR ? 'تعيين ممرض (Assign Nurse)' : 'Assign Nurse'} size="sm" onPress={() => setSelectedBooking(item)} />
 )}
 </NCard>
 )}
 />

 <NSheet visible={!!selectedBooking} onClose={() => setSelectedBooking(null)} title={AR ? 'تعيين ممرض متاح' : 'Assign Available Nurse'}>
 <ScrollView style={{ maxHeight: 400 }}>
 {nurses.map((nurse) => (
 <TouchableOpacity key={nurse.id} onPress={() => handleAssign(nurse)}
 style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, paddingVertical: SP.md, borderBottomWidth: 1, borderBottomColor: theme.border }}>
 <NAvatar name={nurse.name_ar || nurse.name_en} size={40} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? nurse.name_ar : nurse.name_en}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{nurse.degree}</Text>
 </View>
 <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold }}>{nurse.distance_km} KM</Text>
 </TouchableOpacity>
 ))}
 {nurses.length === 0 && <Text style={{ padding: SP.xl, textAlign: 'center', color: theme.textSub }}>{AR ? 'لا يوجد ممرضين متاحين حالياً' : 'No available nurses right now'}</Text>}
 </ScrollView>
 </NSheet>
 </View>
 );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
 topBar: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:SP.xl, paddingVertical:SP.md, borderBottomWidth:StyleSheet.hairlineWidth },
 iconBtn: { width:38, height:38, borderRadius:19, alignItems:'center', justifyContent:'center', position:'relative' },
 iconBtn2: { width:32, height:32, borderRadius:R.sm, alignItems:'center', justifyContent:'center' },
 notifDot: { position:'absolute', top:2, right:2, width:10, height:10, borderRadius:5 },
 quickAction: { width:80, alignItems:'center', justifyContent:'center', borderRadius:R.xl, borderWidth:1, padding:SP.md },
 timeTag: { paddingHorizontal:SP.sm, paddingVertical:SP.xs, borderRadius:R.sm, minWidth:52, alignItems:'center' },
 chipBtn: { flexDirection:'row', alignItems:'center', gap:SP.xs, paddingHorizontal:SP.lg, paddingVertical:SP.sm, borderRadius:R.full, borderWidth:1.5 },
 roleAddBtn: { flexDirection:'row', alignItems:'center', gap:SP.sm, paddingHorizontal:SP.lg, paddingVertical:SP.sm, borderRadius:R.lg, borderWidth:1.5 },
 rolePillBtn: { flexDirection:'row', alignItems:'center', gap:SP.sm, paddingHorizontal:SP.lg, paddingVertical:SP.md, borderRadius:R.lg, borderWidth:1.5 },
 credCard: { flexDirection:'row', alignItems:'center', gap:SP.md, padding:SP.md, borderRadius:R.md, borderWidth:1, marginTop:SP.md },
 qrFrame: { width:180, height:180, borderRadius:R.xl, borderWidth:3, borderStyle:'dashed', alignItems:'center', justifyContent:'center' },
 revCard: { borderRadius:R.xxl, padding:SP.xxl, alignItems:'center', marginBottom:SP.xl, shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.2, shadowRadius:16, elevation:8 },
 inputLabel: { fontSize:FS.sm, fontWeight:FW.semi, marginBottom:SP.xs },
});


function FacilityOrderDetail({ order, onBack, onNavigate }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'تفاصيل الطلب' : 'Order Details'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg }}>
        <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{order?.patient_name || 'Patient'}</Text>
        <Text style={{ color: theme.textSub, marginTop: SP.sm, textAlign: AR ? 'right' : 'left' }}>{order?.svc || 'Service'}</Text>
        
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.xl }}>
          <NBtn label={AR ? 'رفض الطلب' : 'Reject'} onPress={() => { show('Declined', 'info'); onBack(); }} style={{ flex: 1, backgroundColor: theme.danger }} />
          <NBtn label={AR ? 'قبول وتأكيد' : 'Accept & Confirm'} onPress={() => { show('Accepted', 'success'); onBack(); }} style={{ flex: 1, backgroundColor: theme.success }} />
        </View>
      </ScrollView>
    </View>
  );
}
