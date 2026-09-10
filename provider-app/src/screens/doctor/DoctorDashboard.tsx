/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ NABDAH PLUS – PHASE 1 · DOCTOR DASHBOARD & ALL SCREENS ║
 * ║ Dashboard · Appointments · Consultation · E-Prescription ║
 * ║ Referral · Sick Leave · Patient File · Settings · Wallet ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AppointmentStatus } from '../../types/contracts';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Platform, Modal, TextInput,
 RefreshControl, Switch, ActivityIndicator, KeyboardAvoidingView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Audio } from 'expo-av';
import {
 NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,
 NHeader, NScroll, NSheet, NSearch, NToggle, NSettingsRow,
 NSecHeader, NConfirm, NEmpty, NSkeleton, NOnlineToggle,
 NBottomNav, NDivider, NPriceInput, NProfileImageUploader
} from '../../components/ui';
import { I, IBg } from '../../components/icons';
import { SP, R, FS, FW, SPECIALTIES, API_BASE } from '../../constants';
import { buildHeaders } from '../../security/Security';
import client from '../../api/client';
import { useServicesCatalog } from '../../api/catalogs';
import { VideoCallRoom } from '../shared/VideoCallRoom';
import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';
import { WithdrawalWorkflow, MedicalJobsScreen, MedicalDrugIndexScreen, StatisticsReports, GlobalSystemSettings, ChatSystem, MediaConfigScreen } from '../shared/SharedScreens';
import { DoctorStatsRow } from './components/DoctorStatsRow';
import { DoctorUrgentRequests } from './components/DoctorUrgentRequests';
import { DoctorQueueList } from './components/DoctorQueueList';
import { FacilityInvitationsScreen } from './FacilityInvitationsScreen';
import {
 PromotionsDashboard, CreateCampaignScreen, ProfileWebConfig,
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights, AiMedicalCopilot,
 SmartOutboundReferralNetwork, SosDispatchScreen, GpsRouterScreen
} from '../shared/BlueprintScreens';

const { width: W } = Dimensions.get('window');

// Connected to backend APIs for doctor requests and today appointments

// ══════════════════════════════════════════════════════════════════════════════
// DOCTOR DASHBOARD NAVIGATOR
// ══════════════════════════════════════════════════════════════════════════════
import { createNativeStackNavigator } from '@react-navigation/native-stack';
const Stack = createNativeStackNavigator();

export function DoctorDashboardNavigator({ onLogout }: { onLogout: () => void }) {
 const [activeTab, setActiveTab] = useState('home');
 const { lang } = useLang();
 const AR = lang === 'ar';

 const [alarmVisible, setAlarmVisible] = useState(false);

 const tabs = [
 { key: 'home', icon: 'home', label: AR ? 'الرئيسية' : 'Home' },
 { key: 'schedule', icon: 'calendar', label: AR ? 'المواعيد' : 'Schedule' },
 { key: 'chat', icon: 'chat', label: AR ? 'المحادثات' : 'Chats' },
 { key: 'wallet', icon: 'wallet', label: AR ? 'المحفظة' : 'Wallet' },
 { key: 'settings', icon: 'settings', label: AR ? 'الإعدادات' : 'Settings' },
 ];

 return (
   <Stack.Navigator id={undefined as any} screenOptions={{ headerShown: false }}>
     <Stack.Screen name="MainTabs">
       {({ navigation }) => {
         const navigateTo = (s: string, param?: any) => {
           if (['home', 'schedule', 'chat', 'wallet', 'settings', 'drugs', 'jobs'].includes(s)) {
             setActiveTab(s);
             return;
           }
           navigation.navigate(s, { param });
         };
         return (
           <View style={{ flex: 1 }}>
             {activeTab === 'home' && <DoctorHomeTab onNavigate={navigateTo} onTriggerAlarm={() => setAlarmVisible(true)} />}
             {activeTab === 'schedule' && <DoctorScheduleTab onNavigate={navigateTo} />}
             {activeTab === 'chat' && <ChatSystem onBack={() => setActiveTab('home')} />}
             {activeTab === 'wallet' && <DoctorWalletTab onNavigate={navigateTo} />}
             {activeTab === 'settings' && <DoctorSettingsTab onLogout={onLogout} onNavigate={navigateTo} />}
             {activeTab === 'drugs' && <MedicalDrugIndexScreen onBack={() => setActiveTab('home')} />}
             {activeTab === 'jobs' && <MedicalJobsScreen onBack={() => setActiveTab('home')} />}
             <NBottomNav tabs={tabs} active={activeTab} onPress={setActiveTab} />
             <LiveOrderAlarmModal
               visible={alarmVisible}
               onAccept={() => { setAlarmVisible(false); navigateTo('sos_dispatch'); }}
               onDecline={() => setAlarmVisible(false)}
             />
           </View>
         );
       }}
     </Stack.Screen>

     <Stack.Screen name="appointment_detail">{({ navigation, route }: any) => <AppointmentDetailScreen apt={route.params?.param} onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="consultation">{({ navigation, route }: any) => <LiveConsultationScreen apt={route.params?.param} onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="prescription">{({ navigation, route }: any) => <EPrescriptionScreen apt={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="sick_leave">{({ navigation, route }: any) => <SickLeaveScreen apt={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="medical_report">{({ navigation, route }: any) => <MedicalReportScreen apt={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="referral">{({ navigation, route }: any) => <ReferralScreen apt={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="request_test">{({ navigation, route }: any) => <RequestTestScreen apt={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="patient_file">{({ navigation, route }: any) => <PatientFileScreen patient={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
      <Stack.Screen name="withdrawal_workflow">{({ navigation }: any) => <WithdrawalWorkflow onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="revenue_insights">{({ navigation }: any) => <StatisticsReports onBack={() => navigation.goBack()} providerType="doctor" />}</Stack.Screen>
     <Stack.Screen name="availability_engine">{({ navigation }: any) => <DoctorAvailabilityScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="service_management">{({ navigation }: any) => <DoctorServiceManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="promotions">{({ navigation }: any) => <PromotionsDashboard onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="create_promo">{({ navigation }: any) => <CreateCampaignScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="web_config">{({ navigation }: any) => <ProfileWebConfig onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="subscriptions_ads">{({ navigation }: any) => <SubscriptionsAdsScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="affiliate">{({ navigation }: any) => <AffiliatePortal onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="reputation">{({ navigation }: any) => <ReputationHub onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="crm">{({ navigation }: any) => <CrmHub onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="ai_copilot">{({ navigation }: any) => <AiMedicalCopilot onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="outbound_referral">{({ navigation }: any) => <SmartOutboundReferralNetwork onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="sos_dispatch">{({ navigation }: any) => <SosDispatchScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="gps_router">{({ navigation, route }: any) => <GpsRouterScreen patient={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="profile_edit">{({ navigation }: any) => <DoctorProfileEditScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="insurance_config">{({ navigation }: any) => <InsuranceConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
    <Stack.Screen name="insurance_requests">{({ navigation }: any) => <InsuranceRequestsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="certificates_config">{({ navigation }: any) => <CertificatesConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="media_config">{({ navigation }: any) => <MediaConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="virtual_waiting_room">{({ navigation }: any) => <VirtualWaitingRoomScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="pre_visit_chat">{({ navigation, route }: any) => <PreVisitChatScreen apt={route.params?.param} onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="medical_jobs">{({ navigation }: any) => <MedicalJobsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="drug_index">{({ navigation }: any) => <MedicalDrugIndexScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="facility_invitations">{({ navigation }: any) => <FacilityInvitationsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="location_config">{({ navigation }: any) => <DoctorLocationScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="inbound_reports">{({ navigation }: any) => <InboundMedicalReportsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="video_call">{({ navigation, route }: any) => {
       const appointment = route.params?.param || {};
       const appointmentId = String(appointment.id || appointment.appointment_id || '');
       if (!appointmentId) return <NEmpty title="Unable to start call" sub="The appointment identifier is required." icon="video" />;
       return <VideoCallRoom appointmentId={appointmentId} peerName={appointment.patient || appointment.patient_name} voiceOnly={appointment.service_type === 'audio'} onEnd={() => navigation.goBack()} />;
     }}</Stack.Screen>
   </Stack.Navigator>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// HOME TAB
// ══════════════════════════════════════════════════════════════════════════════
function DoctorHomeTab({ onNavigate, onTriggerAlarm }: { onNavigate: (s: string, p?: any) => void; onTriggerAlarm: () => void }) {
 const insets = useSafeAreaInsets();
 const { theme } = useTheme();
 const { lang } = useLang();
 const { user, toggleOnline } = useAuth();
 const AR = lang === 'ar';
 const [refreshing, setRefreshing] = useState(false);
 const [requests, setRequests] = useState<any[]>([]);
 const [todayApts, setTodayApts] = useState<any[]>([]);
 const [stats, setStats] = useState({ todayCount: 0, revenue: 0, pendingCount: 0 });
 const [error, setError] = useState(false);
 const { show } = useToast();

 const [sound, setSound] = useState<any | null>(null);
 const [insuranceModalReq, setInsuranceModalReq] = useState<any>(null);
 const [approvalStatus, setApprovalStatus] = useState('كلية');
 const [patientCopay, setPatientCopay] = useState('');
 const [insuranceCoverage, setInsuranceCoverage] = useState('');
 const [approvalCode, setApprovalCode] = useState('');

 async function playRingtone() {
    try {
      const { sound: s } = await Audio.Sound.createAsync(require('../../../assets/audio/rad_dispatch_alert.mp3'), { isLooping: true });
      setSound(s);
      await s.playAsync();
      setTimeout(() => { s.stopAsync(); }, 45000);
    } catch (e) {
      console.warn("Could not play ringtone", e);
    }
  }

  async function stopRingtone() {
    if (sound) { await sound.stopAsync(); await sound.unloadAsync(); setSound(null); }
  }

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  useEffect(() => {
    let socketInstance: any = null;
    if (user?.id) {
      const cleanUrl = API_BASE.replace('/api', '').replace('/v1', '');
      socketInstance = io(cleanUrl, { 
        transports: ['websocket'],
        auth: { token: (user as any)?.token || '' }
      });
      socketInstance.on('connect', () => socketInstance?.emit('joinProviderRoom', user.id));
      socketInstance.on('incoming_urgent_request', (payload: any) => {
        setRequests(prev => [payload, ...prev]);
        playRingtone();
        onTriggerAlarm();
      });
    }
    return () => { if (socketInstance) socketInstance.disconnect(); };
  }, [user?.id]);

 const fetchQueue = useCallback(async () => {
 setError(false);
 try {
	const resIncoming = await client.get('/provider/jobs/queue?status=incoming&kind=consultation');
	setRequests((resIncoming.data || []).map((x: any) => ({
	id: x.id, kind: x.kind || 'consultation', patient: x.patient_name || (AR ? 'مريض نبض' : 'Nabdah Patient'),
        age: x.age ?? null, type: x.service_type || 'video', price: x.total ?? x.price ?? 0,
        time: x.scheduled_at ? new Date(x.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (AR ? 'غير محدد' : 'Unscheduled'),
        avatar: '', complaint: x.title_ar || '', insurance: x.insurance_provider || 'Cash',
        paid: x.payment_status === 'PAID', urgent: !!x.is_urgent,
         policyClass: x.policy_class || null, nationalId: x.national_id || null, dob: x.dob || null
  })));

 const resToday = await client.get('/provider/jobs/queue?status=active');
 setTodayApts((resToday.data || []).map((x: any) => ({
 id: x.id, patient: x.patient_name || (AR ? 'مريض نبض' : 'Nabdah Patient'),
     type: x.service_type || 'video', time: x.scheduled_at ? new Date(x.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (AR ? 'غير محدد' : 'Unscheduled'),
     status: x.status || 'confirmed', price: x.total ?? x.price ?? 0, insurance: x.insurance_provider || 'Cash',
     age: x.age ?? null, avatar: ''
 })));

 const resStats = await client.get('/provider/stats/today');
 if (resStats.data) setStats(resStats.data);
	 } catch (err) {
	  // Keep the prior data out of the way and expose a retryable error state.
	  setError(true);
	  show(AR ? 'تعذر جلب البيانات. يرجى التأكد من اتصالك بالإنترنت.' : 'Failed to fetch data.', 'error');
	 }
 }, [AR]);

 useEffect(() => { fetchQueue(); }, [fetchQueue]);

 const onRefresh = async () => { setRefreshing(true); await fetchQueue(); setRefreshing(false); };

	const handleAccept = async (req: any) => {
	try {
	await client.post(`/provider/jobs/${req.kind || 'consultation'}/${req.id}/accept`);
 setRequests(prev => prev.filter(r => r.id !== req.id));
 show(AR ? 'تم قبول الطلب بنجاح' : 'Request accepted successfully', 'success');
 fetchQueue();
 stopRingtone();
 } catch (e) { show(AR ? 'حدث خطأ أثناء القبول' : 'Error accepting request', 'error'); }
 };

	const handleReject = async (req: any) => {
	try {
	await client.post(`/provider/jobs/${req.kind || 'consultation'}/${req.id}/reject`);
 setRequests(prev => prev.filter(r => r.id !== req.id));
 show(AR ? 'تم رفض الطلب' : 'Request rejected', 'info');
 stopRingtone();
 } catch (e) { show(AR ? 'حدث خطأ' : 'Error', 'error'); }
 };

 const submitInsuranceGatekeeper = async () => {
   if (!approvalCode.trim() || !patientCopay.trim()) {
     show(AR ? 'يرجى تعبئة كافة الحقول المطلوبة' : 'Please fill all required fields', 'error');
     return;
   }
   try {
     await client.post(`/provider/jobs/consultation/${insuranceModalReq.id}/insurance`, {
       status: approvalStatus, copay: parseFloat(patientCopay), coverage: parseFloat(insuranceCoverage || '0'), approval_code: approvalCode
     });
     setInsuranceModalReq(null);
     show(AR ? 'تم إرسال الطلب للمريض لدفع نسبة التحمل' : 'Request sent to patient for Co-Pay', 'success');
     fetchQueue();
   } catch (err) {
     show(AR ? 'حدث خطأ أثناء رفع الاعتماد' : 'Error submitting approval', 'error');
   }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? 'الرئيسية' : 'Home'} right={
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <TouchableOpacity onPress={onTriggerAlarm} style={{ padding: SP.xs }}>
 <I name="bell" size={24} color={theme.text} />
 </TouchableOpacity>
 <NOnlineToggle value={!!user?.isOnline} onToggle={toggleOnline} />
 </View>
 } />

 <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
 contentContainerStyle={{ padding: SP.md, paddingBottom: 100 }}>
 
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.lg }}>
 <NStatCard icon="" label={AR ? 'مواعيد اليوم' : "Today's Apts"} value={String(stats.todayCount)} color={theme.primary} style={{ width: '47%' }} />
 <NStatCard icon="" label={AR ? 'طلبات جديدة' : 'New Requests'} value={String(stats.pendingCount)} color="#FF9800" style={{ width: '47%' }} />
 </View>

 {error && (
   <NCard style={{ alignItems: 'center', padding: SP.xxl, marginBottom: SP.lg, borderColor: theme.danger }}>
     <Text style={{ color: theme.danger, textAlign: 'center', marginBottom: SP.md }}>{AR ? 'تعذر جلب البيانات' : 'Failed to load data'}</Text>
     <NBtn label={AR ? 'إعادة المحاولة' : 'Retry'} onPress={fetchQueue} size="sm" />
   </NCard>
 )}

 <NSecHeader title={AR ? 'طلبات جديدة' : 'New Requests'} action={AR ? 'عرض الكل' : 'View All'} onAction={() => onNavigate('schedule')} />

 {requests.length === 0 ? (
 <NCard style={{ alignItems: 'center', padding: SP.xxl, marginBottom: SP.lg }}>
 <Text style={{ color: theme.textSub, textAlign: 'center' }}>{AR ? 'لا توجد طلبات جديدة حالياً' : 'No new requests right now'}</Text>
 </NCard>
 ) : (
 requests.map(req => {
   const isOnline = req.type === 'video' || req.type === 'online';
   const isClinic = req.type === 'clinic';
   const typeBadge = isOnline ? '[🔴 استشارة أونلاين]' : isClinic ? '[🔵 حجز عيادة]' : '[🟢 زيارة منزلية]';
   
   const isCashOnline = req.insurance === 'Cash' && req.paid;
   const isCashClinic = req.insurance === 'Cash' && !req.paid;
   const paymentBadge = isCashOnline ? '[💳 كاش - مدفوع أونلاين]' : isCashClinic ? '[💵 كاش - الدفع بالعيادة]' : `[🛡️ تأمين طبي: ${req.insurance}]`;

   return (
 <NCard key={req.id} style={{ marginBottom: SP.md }} accent={req.urgent ? '#F44336' : undefined}>
 {req.urgent && <NBadge label={AR ? ' عاجل' : ' Urgent'} variant="danger" style={{ marginBottom: SP.sm }} />}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.md }}>
 <NAvatar name={req.patient} size={48} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{req.patient}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: 2, fontWeight: FW.bold }}>{typeBadge}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: 2 }}>{paymentBadge}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.primary, marginTop: 2 }}>⏰ {req.time}</Text>
 </View>
 </View>

 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SP.md, flexWrap: 'wrap', gap: SP.sm }}>
 <NBtn label={AR ? 'رفض' : 'Reject'} variant="secondary" size="sm" full={false} style={{ paddingHorizontal: SP.lg }}
 onPress={() => handleReject(req)} />

	 {isCashClinic ? (
	   <NBtn label={AR ? 'قبول' : 'Accept'} size="sm" full={false} style={{ paddingHorizontal: SP.xl }} onPress={() => handleAccept(req)} />
	 ) : req.insurance !== 'Cash' ? (
   <NBtn label={AR ? 'قبول واستكمال إجراءات التأمين' : 'Accept & Process Insurance'} size="sm" full={false} onPress={() => setInsuranceModalReq(req)} />
 ) : (
   <NBtn label={AR ? 'قبول' : 'Accept'} size="sm" full={false} style={{ paddingHorizontal: SP.xl }} onPress={() => handleAccept(req)} />
 )}
 </View>
 </NCard>
 );
 })
 )}

 <View style={{ marginTop: SP.lg }}>
 <NSecHeader title={AR ? 'جدول اليوم' : "Today's Schedule"} action={AR ? 'الجميع' : 'All'} onAction={() => onNavigate('schedule')} />
 </View>

 {todayApts.length === 0 ? (
 <NCard style={{ alignItems: 'center', padding: SP.xxl }}><Text style={{ color: theme.textSub, textAlign: 'center' }}>{AR ? 'لا توجد مواعيد مؤكدة اليوم' : 'No confirmed appointments today'}</Text></NCard>
 ) : (
 todayApts.map(apt => (
 <TouchableOpacity key={apt.id} onPress={() => onNavigate('consultation', apt)} style={{ padding: SP.md, backgroundColor: theme.card, borderRadius: R.md, marginBottom: SP.sm, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
 <Text style={{ fontSize: FS.md, color: theme.text }}>{apt.patient} - {apt.time}</Text>
 </TouchableOpacity>
 ))
 )}

 <View style={{ marginTop: SP.lg }}>
 <NSecHeader title={AR ? 'منصات نبض بلس' : 'Nabdah Modules'} />
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, flexWrap: 'wrap' }}>
   <TouchableOpacity 
     onPress={() => onNavigate('medical_jobs')}
     style={{ flex: 1, backgroundColor: theme.primary, borderRadius: R.md, padding: SP.lg, alignItems: 'center' }}>
     <I name="profile" size={32} color="#FFF" />
     <Text style={{ color: '#FFF', fontWeight: FW.bold, marginTop: SP.sm, textAlign: 'center' }}>
       {AR ? 'الوظائف الطبية' : 'Medical Jobs'}
     </Text>
   </TouchableOpacity>
   <TouchableOpacity 
     onPress={() => onNavigate('drug_index')}
     style={{ flex: 1, backgroundColor: theme.info, borderRadius: R.md, padding: SP.lg, alignItems: 'center' }}>
     <I name="document" size={32} color="#FFF" />
     <Text style={{ color: '#FFF', fontWeight: FW.bold, marginTop: SP.sm, textAlign: 'center' }}>
       {AR ? 'دليل الأدوية' : 'Drug Index'}
     </Text>
   </TouchableOpacity>
   <TouchableOpacity 
     onPress={() => onNavigate('inbound_reports')}
     style={{ width: '100%', backgroundColor: theme.success, borderRadius: R.md, padding: SP.lg, alignItems: 'center', marginTop: SP.sm }}>
     <I name="folder" size={32} color="#FFF" />
     <Text style={{ color: '#FFF', fontWeight: FW.bold, marginTop: SP.sm, textAlign: 'center' }}>
       {AR ? 'التقارير الطبية الواردة (نتائج الأشعة والتحاليل)' : 'Inbound Medical Reports (Radiology & Labs)'}
     </Text>
   </TouchableOpacity>
 </View>
 </View>

 </ScrollView>

 {/* Gatekeeper Modal */}
 <NSheet visible={!!insuranceModalReq} onClose={() => setInsuranceModalReq(null)} title={AR ? ' بوابة التأمين الطبي (Gatekeeper)' : ' Insurance Gatekeeper'} height={700}>
  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={100}>
  <ScrollView style={{ padding: SP.md }} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
  <NCard style={{ marginBottom: SP.md, backgroundColor: theme.primaryLight, borderColor: theme.primary, borderWidth: 1 }}>
  <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.primary, textAlign: AR ? 'right' : 'left', marginBottom: 4 }}>
  {AR ? 'المريض:' : 'Patient:'} {insuranceModalReq?.patient}
  </Text>
  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.md, marginTop: SP.xs }}>
    <View style={{ width: '45%' }}>
      <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{AR ? 'رقم الهوية:' : 'National ID:'}</Text>
      <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left', fontWeight: FW.bold }}>{insuranceModalReq?.nationalId}</Text>
    </View>
    <View style={{ width: '45%' }}>
      <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{AR ? 'تاريخ الميلاد:' : 'DOB:'}</Text>
      <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left', fontWeight: FW.bold }}>{insuranceModalReq?.dob}</Text>
    </View>
    <View style={{ width: '45%' }}>
      <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{AR ? 'بوليصة:' : 'Policy:'}</Text>
      <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left', fontWeight: FW.bold }}>{insuranceModalReq?.insurance}</Text>
    </View>
    <View style={{ width: '45%' }}>
      <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{AR ? 'فئة التأمين:' : 'Class:'}</Text>
      <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left', fontWeight: FW.bold }}>{insuranceModalReq?.policyClass}</Text>
    </View>
  </View>
  <View style={{ marginTop: SP.sm, paddingTop: SP.sm, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' }}>
    <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{AR ? 'سبب الاستشارة:' : 'Complaint:'}</Text>
    <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left', fontWeight: FW.bold, marginTop: 2 }}>{insuranceModalReq?.complaint || (AR ? 'غير متوفر' : 'N/A')}</Text>
  </View>
  </NCard>
  <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>{AR ? 'حالة الموافقة من نفييس:' : 'NPHIES Approval Status:'}</Text>
  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.lg }}>
  {['كلية', 'جزئية', 'مرفوضة'].map(s => (
  <TouchableOpacity key={s} onPress={() => setApprovalStatus(s)} style={{ flex: 1, padding: SP.md, borderRadius: R.md, backgroundColor: approvalStatus === s ? theme.primary : theme.surface2, alignItems: 'center' }}>
  <Text style={{ color: approvalStatus === s ? '#FFF' : theme.text }}>{s}</Text>
  </TouchableOpacity>
  ))}
  </View>
  <NInput label={AR ? 'نسبة تحمل المريض (SAR)' : 'Patient Co-Pay (SAR)'} value={patientCopay} onChange={setPatientCopay} kbType="numeric" placeholder="e.g. 50" icon="" />
  <NInput label={AR ? 'تحمل شركة التأمين (SAR)' : 'Insurance Coverage (SAR)'} value={insuranceCoverage} onChange={setInsuranceCoverage} kbType="numeric" placeholder="e.g. 150" icon="" />
  <NInput label={AR ? 'رقم الموافقة المرجعي (Approval Code)' : 'Approval Code'} value={approvalCode} onChange={setApprovalCode} placeholder="e.g. NPH-9213" icon="" />
  <NBtn label={AR ? ' إرسال للمريض لدفع نسبة التحمل' : ' Send to Patient for Co-Pay'} onPress={submitInsuranceGatekeeper} style={{ marginTop: SP.md, marginBottom: SP.xxl }} />
  </ScrollView>
  </KeyboardAvoidingView>
  </NSheet>
 </View>
 );
}

// ════
// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULE TAB
// ══════════════════════════════════════════════════════════════════════════════
function DoctorScheduleTab({ onNavigate }: { onNavigate: (s: string, p?: any) => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const AR = lang === 'ar';
 const [view, setView] = useState<'day'|'week'|'list'>('list');
 const [filter, setFilter] = useState<'all'|'video'|'clinic'|'home'>('all');
  const [apts, setApts] = useState<any[]>([]);
 const [loadError, setLoadError] = useState<string | null>(null);
 const filters = [
 { k:'all', ar:'الكل', en:'All' },
 { k:'video', ar:'فيديو', en:'Video' },
 { k:'clinic', ar:'عيادة', en:'Clinic' },
 { k:'home', ar:'منزلية', en:'Home' },
 ] as const;

 useEffect(() => {
 client.get('/provider/jobs/queue?status=active&kind=consultation')
 .then(res => {
 setLoadError(null);
 setApts((res.data || []).map((x: any) => ({
 id: x.id,
 patient: x.patient_name || (AR ? 'مريض نبض' : 'Nabdah Patient'),
 time: x.scheduled_at ? new Date(x.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
 type: x.service_type || 'video',
 status: x.domain_state === 'IN_PROGRESS' || x.universal_state === AppointmentStatus.IN_PROGRESS ? AppointmentStatus.IN_PROGRESS : 'confirmed',
 price: x.total ?? x.price ?? 0,
 raw: x
 })));
 })
 .catch(() => {
  setApts([]);
  setLoadError(AR ? 'تعذر تحميل المواعيد من الخادم. حاول مرة أخرى.' : 'Unable to load appointments from the server. Please try again.');
 });
 }, [AR]);

 const filtered = filter === 'all' ? apts : apts.filter(a => a.type === filter);

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>
 {AR ? ' المواعيد' : ' Schedule'}
 </Text>
 <TouchableOpacity onPress={() => onNavigate('virtual_waiting_room')}
 style={[styles.iconBtn, { backgroundColor: theme.surface2 }]}>
 <I name="user-x" size={20} color={theme.text} />
 </TouchableOpacity>
 </View>

 {/* View toggles */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, paddingHorizontal: SP.lg, paddingTop: SP.lg, paddingBottom: SP.xs, alignItems: 'center' }}>
 {(['day','week','list'] as const).map(v => (
 <TouchableOpacity key={v} onPress={() => setView(v)}
 style={[styles.viewChip, {
 backgroundColor: view === v ? theme.primary : theme.surface2,
 borderColor: view === v ? theme.primary : theme.border,
 alignItems: 'center', justifyContent: 'center', height: 36
 }]}>
 <Text style={{ color: view === v ? '#FFF' : theme.text, fontSize: FS.sm }}>
 {v === 'day' ? (AR?'يوم':'Day') : v === 'week' ? (AR?'أسبوع':'Week') : (AR?'قائمة':'List')}
 </Text>
 </TouchableOpacity>
 ))}
 </View>

 {/* Filter chips */}
 <View style={{ height: 44 }}>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}
  contentContainerStyle={{ paddingHorizontal: SP.lg, gap: SP.sm, alignItems: 'center' }}>
  {filters.map(f => (
  <TouchableOpacity key={f.k} onPress={() => setFilter(f.k as any)}
  style={[styles.filterChip, {
  backgroundColor: filter === f.k ? theme.primary : theme.surface2,
  borderColor: filter === f.k ? theme.primary : theme.border,
  alignItems: 'center', justifyContent: 'center', height: 32, paddingVertical: 0
  }]}>
 <Text style={{ color: filter === f.k ? '#FFF' : theme.text, fontSize: FS.sm }}>
 {AR ? f.ar : f.en}
 </Text>
 </TouchableOpacity>
 ))}
 </ScrollView>
 </View>

 <FlatList
 data={filtered}
 keyExtractor={i => i.id}
 contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}
 ListEmptyComponent={<NEmpty title={loadError ? (AR ? 'تعذر تحميل المواعيد' : 'Unable to load appointments') : (AR ? 'لا توجد مواعيد' : 'No appointments')} sub={loadError || (AR ? 'اختر تاريخاً أو نوعاً آخر.' : 'Try selecting another date or type.')} icon="calendar" />}
 renderItem={({ item }) => (
 <TouchableOpacity onPress={() => onNavigate('appointment_detail', item)}>
 <NCard style={{ marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <View style={[styles.timeTag, { backgroundColor: theme.primaryLight }]}>
 <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold }}>{item.time}</Text>
 </View>
 <NAvatar name={item.patient} size={40} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left' }}>{item.patient}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
 {item.type === 'video'?'':item.type==='clinic'?'':''} {item.price} {AR?'ر':'SAR'}
 </Text>
 </View>
 <NBadge
 label={item.status === 'confirmed' ? (AR?'مؤكد':'Confirmed') : item.status === AppointmentStatus.IN_PROGRESS ? (AR?'جارٍ':'Active') : (AR?'انتظار':'Pending')}
 variant={item.status === 'confirmed' ? 'success' : item.status === AppointmentStatus.IN_PROGRESS ? 'warning' : 'info'}
 size="xs" />
 </View>
 </NCard>
 </TouchableOpacity>
 )}
 />
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// APPOINTMENT DETAIL
// ══════════════════════════════════════════════════════════════════════════════
function AppointmentDetailScreen({ apt, onBack, onNavigate }:
 { apt: any; onBack: () => void; onNavigate: (s: string, p?: any) => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [acting, setActing] = useState(false);
 const [showCancel, setShowCancel] = useState(false);
 const [cancelReason, setCancelReason] = useState('');
 const [showResched, setShowResched] = useState(false);
 const [newDate, setNewDate] = useState('');
 const [newTime, setNewTime] = useState('');
 const apptId = String(apt?.id || apt?.appointment_id || '');

 async function doPatch(action: string, body?: any) {
   if (!apptId) { show(AR ? 'معرف الموعد مفقود' : 'Appointment identifier is missing', 'error'); return; }
   setActing(true);
   try {
     await client.patch(`/care/appointments/${apptId}/${action}`, body || {});
     show(action === 'confirm' ? (AR ? 'تم تأكيد الموعد' : 'Appointment confirmed') : action === 'cancel' ? (AR ? 'تم إلغاء الموعد' : 'Appointment cancelled') : (AR ? 'تمت إعادة الجدولة' : 'Appointment rescheduled'), 'success');
     setShowCancel(false); setShowResched(false); setCancelReason('');
   } catch (err: any) {
     show(err?.response?.data?.message || (AR ? 'تعذر تنفيذ الإجراء — تحقق من الاتصال' : 'Action failed — check connection'), 'error');
   } finally {
     setActing(false);
   }
 }

 function submitReschedule() {
   const iso = Date.parse(`${newDate.trim()}T${newTime.trim()}:00`);
   if (!Number.isFinite(iso)) { show(AR ? 'أدخل التاريخ (YYYY-MM-DD) والوقت (HH:mm)' : 'Enter date (YYYY-MM-DD) and time (HH:mm)', 'error'); return; }
   doPatch('reschedule', { slot_start: new Date(iso).toISOString() });
 }

 return (
 <NScroll>
 <NHeader title={AR ? 'تفاصيل الموعد' : 'Appointment Details'} onBack={onBack} />

 {/* Patient Info */}
 <NCard style={{ marginBottom: SP.xl }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.lg, marginBottom: SP.lg }}>
 <NAvatar name={apt?.patient ?? 'مريض'} size={60} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text,
 textAlign: AR ? 'right' : 'left' }}>{apt?.patient ?? '—'}</Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{apt?.age ?? '—'} {AR?'سنة':'yrs'}</Text>
 <NBadge label={apt?.insurance || '—'} variant="primary" size="xs" style={{ marginTop: SP.xs }} />
 </View>
 </View>

 <NCard style={{ marginTop: SP.md, marginBottom: SP.md, backgroundColor: '#E3F2FD', borderColor: '#2196F3' }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: '#1565C0', textAlign: AR ? 'right' : 'left' }}>{AR ? 'ملخص الذكاء الاصطناعي' : 'AI Triage Summary'}</Text>
 <Text style={{ fontSize: FS.sm, color: '#1976D2', textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>{AR ? 'لا توجد نتيجة ذكاء اصطناعي موثقة من الخادم لهذا الموعد.' : 'No server-recorded AI result is available for this appointment.'}</Text>
 </NCard>


 {[
 { icon:'clock', ar:'وقت الموعد', en:'Time', val:apt?.time || '—' },
 { icon:'video', ar:'نوع الخدمة', en:'Type', val:apt?.type === 'video' ? (AR?'استشارة فيديو':'Video Consult') : apt?.type === 'clinic' ? (AR?'كشف عيادة':'Clinic') : apt?.type ? (AR?'زيارة منزلية':'Home Visit') : '—' },
 { icon:'dollarSign', ar:'الرسوم', en:'Fee', val:apt?.price != null ? `${apt.price} ${AR?'ريال':'SAR'}` : '—' },
 { icon:'fileText', ar:'الشكوى', en:'Complaint', val:apt?.complaint || '—' },
 ].map((row, i) => (
 <View key={i} style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md,
 paddingVertical: SP.sm, borderBottomWidth: i < 3 ? StyleSheet.hairlineWidth : 0, borderBottomColor: theme.border, alignItems: 'center' }}>
 <I name={row.icon} size={18} color={theme.textSub} />
 <Text style={{ color: theme.textSub, fontSize: FS.sm, flex: 0.8, textAlign: AR?'right':'left' }}>{AR?row.ar:row.en}</Text>
  <Text style={{ flex: 1, color: theme.text, fontSize: FS.sm, fontWeight: FW.med, textAlign: AR?'right':'left' }}>{row.val}</Text>
  </View>
  ))}
  </NCard>
  <NBtn label={AR ? 'بدء الاستشارة يحتاج تأكيد الخادم' : 'Consultation start requires server confirmation'} onPress={() => show(AR ? 'لا يمكن فتح الاستشارة قبل تحقق الخادم من حالة الموعد والدفع وعلاقة الطبيب بالمريض.' : 'The consultation cannot open before the server verifies appointment state, payment, and doctor–patient relation.', 'info')} style={{ marginTop: SP.xl }} />
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.md }}>
 <View style={{ flex: 1 }}><NBtn label={AR ? 'تأكيد الموعد' : 'Confirm'} loading={acting} onPress={() => doPatch('confirm')} /></View>
 <View style={{ flex: 1 }}><NBtn label={AR ? 'إلغاء' : 'Cancel'} variant="danger" onPress={() => setShowCancel((v) => !v)} /></View>
 <View style={{ flex: 1 }}><NBtn label={AR ? 'جدولة' : 'Reschedule'} variant="outline" onPress={() => setShowResched((v) => !v)} /></View>
 </View>
 {showCancel && (
 <NCard style={{ marginTop: SP.md }}>
 <NInput placeholder={AR ? 'سبب الإلغاء' : 'Cancellation reason'} value={cancelReason} onChange={setCancelReason} />
 <NBtn label={AR ? 'تأكيد الإلغاء' : 'Confirm cancellation'} variant="danger" loading={acting} onPress={() => doPatch('cancel', cancelReason.trim() ? { reason: cancelReason.trim() } : {})} style={{ marginTop: SP.md }} />
 </NCard>
 )}
 {showResched && (
 <NCard style={{ marginTop: SP.md }}>
 <NInput placeholder="YYYY-MM-DD" value={newDate} onChange={setNewDate} />
 <NInput placeholder="HH:mm" value={newTime} onChange={setNewTime} />
 <NBtn label={AR ? 'تأكيد الموعد الجديد' : 'Confirm new slot'} loading={acting} onPress={submitReschedule} style={{ marginTop: SP.md }} />
 </NCard>
 )}
  </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVE CONSULTATION (WAITING ROOM & EXAM)
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// ACTIVE CONSULTATION (WAITING ROOM & EXAM)
// ══════════════════════════════════════════════════════════════════════════════
function LiveConsultationScreen({ apt, onBack }: { apt: any; onBack: () => void; onNavigate: (s: string, p?: any) => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [verified, setVerified] = useState<any | null>(null);
 const [loading, setLoading] = useState(true);
 const aptId = String(apt?.id || apt?.raw?.id || apt?.appointment_id || '');

 useEffect(() => {
   if (!aptId) { setLoading(false); return; }
   let alive = true;
   client.get(`/care/appointments/${encodeURIComponent(aptId)}`).then((res: any) => {
     if (alive) setVerified(res?.data?.data || res?.data || null);
   }).catch(() => {
     if (alive) show(AR ? 'تعذر التحقق من الموعد' : 'Could not verify appointment', 'error');
   }).finally(() => { if (alive) setLoading(false); });
   return () => { alive = false; };
 }, [aptId]);

 const status = String(verified?.status || '').toUpperCase();
 const okStates = ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'];
 const ready = !!verified && okStates.includes(status);
 const fullApt = { ...(typeof apt === 'object' ? apt : {}), id: aptId };

 return (
  <View style={{ flex: 1, backgroundColor: theme.bg }}>
   <NHeader title={AR ? 'الاستشارة' : 'Consultation'} onBack={onBack} />
   <NScroll>
   {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} /> : !verified ? (
    <NCard style={{ borderColor: theme.danger, borderWidth: 1 }}>
     <Text style={{ color: theme.text, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>
      {AR ? 'تعذر فتح الجلسة — تحقق من الموعد' : 'Cannot open session — verify the appointment'}
     </Text>
    </NCard>
   ) : !ready ? (
    <NCard style={{ borderColor: theme.warn, borderWidth: 1 }}>
     <Text style={{ color: theme.text, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>
      {AR ? `الجلسة غير جاهزة (الحالة: ${status || '—'})` : `Session not ready (status: ${status || '—'})`}
     </Text>
     <Text style={{ color: theme.textSub, marginTop: SP.md, textAlign: AR ? 'right' : 'left' }}>
      {AR ? 'تُفتح الجلسة للمواعيد المؤكدة/الجاري تنفيذها فقط بعد تحقق الخادم.' : 'Sessions open only for confirmed/in-progress appointments after server verification.'}
     </Text>
    </NCard>
   ) : (<>
    <NCard style={{ borderColor: theme.success, borderWidth: 1, marginBottom: SP.md }}>
     <Text style={{ color: theme.text, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>
      {AR ? 'جلسة موثقة خادمياً — يمكنك البدء' : 'Server-verified session — you may begin'}
     </Text>
     <Text style={{ color: theme.textSub, marginTop: 4 }}>{AR ? `الموعد: ${aptId}` : `Appointment: ${aptId}`} · {status}</Text>
    </NCard>
    <NBtn label={AR ? 'بدء مكالمة الفيديو' : 'Start video call'} onPress={() => onNavigate('video_call', fullApt)} style={{ marginBottom: SP.md }} />
    <NBtn label={AR ? 'محادثة ما قبل الزيارة' : 'Pre-visit chat'} variant="outline" onPress={() => onNavigate('pre_visit_chat', fullApt)} style={{ marginBottom: SP.md }} />
    <NBtn label={AR ? 'كتابة وصفة' : 'Write prescription'} variant="outline" onPress={() => onNavigate('prescription', fullApt)} style={{ marginBottom: SP.md }} />
    <NBtn label={AR ? 'إجازة مرضية' : 'Sick leave'} variant="outline" onPress={() => onNavigate('sick_leave', fullApt)} style={{ marginBottom: SP.md }} />
    <NBtn label={AR ? 'تقرير طبي' : 'Medical report'} variant="outline" onPress={() => onNavigate('medical_report', fullApt)} style={{ marginBottom: SP.md }} />
    <NBtn label={AR ? 'تحويل طبي' : 'Referral'} variant="outline" onPress={() => onNavigate('referral', fullApt)} style={{ marginBottom: SP.md }} />
    <NBtn label={AR ? 'طلب فحص' : 'Request test'} variant="outline" onPress={() => onNavigate('request_test', fullApt)} />
   </>)}
   </NScroll>
  </View>
 );
}

export function EPrescriptionScreen({ apt, onBack }:
 { apt: any; onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 interface Drug { id: string; name: string; dose: string; freq: string; duration: string; notes: string; }
 const [drugs, setDrugs] = useState<Drug[]>([]);
 const [search, setSearch] = useState('');
 const [drugNotes, setDrugNotes] = useState('');
 const [showDrugSearch, setDrugSearch] = useState(false);
 const [loading, setLoading] = useState(false);

 const [showTemplates, setShowTemplates] = useState(false);
 const [templates, setTemplates] = useState<any[]>([]);
 const [templatesLoading, setTemplatesLoading] = useState(false);

 async function loadTemplates() {
   setTemplatesLoading(true);
   try {
     const res = await client.get('/provider/ops/doctor/templates');
     const list = Array.isArray(res?.data) ? res.data : [];
     setTemplates(list.map((t: any) => ({
       id: String(t.id),
       titleAr: t.name, titleEn: t.name,
       drugs: (Array.isArray(t.items) ? t.items : []).map((d: any, i: number) => typeof d === 'string'
         ? { id: `t-${i}`, name: d, dose: '', freq: '', duration: '', notes: '' }
         : { id: String(d.id || `t-${i}`), name: d.name || '', dose: d.dose || '', freq: d.freq || '', duration: d.duration || '', notes: d.notes || '' }),
     })));
   } catch {
     show(AR ? 'تعذر تحميل النماذج' : 'Could not load templates', 'error');
   } finally {
     setTemplatesLoading(false);
   }
 }
 const [templateName, setTemplateName] = useState('');
 const [showSaveTemplateSheet, setShowSaveTemplateSheet] = useState(false);

 const [drugDb, setDrugDb] = useState<{name: string, id: string}[]>([]);
 useEffect(() => {
   client.get('/medicines')
     .then(res => {
       const meds = res.data || [];
       setDrugDb(meds.map((m: any) => ({ name: m.name_en || m.name_ar || m.name, id: m.id })));
     })
     .catch(() => {});
 }, []);

 const filtered = drugDb.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

 const addDrug = (name: string) => {
 const d: Drug = { id: Date.now().toString(), name, dose: '', freq: 'مرة/اليوم', duration: '7 أيام', notes: '' };
 setDrugs(prev => [...prev, d]);
 setDrugSearch(false); setSearch('');
 };

 const updateDrug = (id: string, patch: Partial<Drug>) => {
 setDrugs(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
 };

 const removeDrug = (id: string) => setDrugs(prev => prev.filter(d => d.id !== id));

 const FREQS_AR = ['مرة/اليوم','مرتين/اليوم','3 مرات/اليوم','كل 8 ساعات','عند الحاجة'];
 const FREQS_EN = ['Once daily','Twice daily','3x daily','Every 8h','As needed'];
 const DURS_AR = ['3 أيام','5 أيام','7 أيام','10 أيام','أسبوعين','شهر','مستمر'];
 const DURS_EN = ['3 days','5 days','7 days','10 days','2 weeks','1 month','Ongoing'];

 const handleSavePrescription = async () => {
  const patientId = apt?.patient_id || apt?.raw?.patient_id;
  const appointmentId = apt?.id || apt?.raw?.id;
  if (!patientId || !appointmentId) {
    show(AR ? 'معرّف المريض أو الموعد غير متاح؛ لا يمكن إصدار وصفة.' : 'Patient or appointment identifier is unavailable; a prescription cannot be issued.', 'error');
    return;
  }
  if (!drugNotes.trim() || drugs.length === 0) {
    show(AR ? 'أدخل التشخيص وأضف دواءً واحداً على الأقل.' : 'Enter a diagnosis and at least one medicine.', 'error');
    return;
  }
  if (drugs.some(d => !d.name.trim() || !d.dose.trim() || !Number.isFinite(parseInt(d.duration, 10)))) {
    show(AR ? 'أكمل اسم الدواء والجرعة والمدة لكل بند.' : 'Complete medicine name, dose, and duration for every item.', 'error');
    return;
  }
  setLoading(true);
  try {
  const payload = {
  patient_id: patientId,
  appointment_id: appointmentId,
  diagnosis: drugNotes.trim(),
  notes: drugNotes.trim(),
  erx: drugs.map(d => ({
    medicine_name_en: d.name,
    medicine_name_ar: d.name,
    dose: d.dose,
    duration_days: parseInt(d.duration, 10),
    instructions: `${d.freq}. ${d.notes}`.trim()
  })),
  labs: [],
  radiology: []
  };
  await client.post('/prescriptions/create', payload);
  show(AR ? 'تم إصدار الوصفة الطبية وإرسالها للمريض ' : 'Prescription issued and sent to patient ', 'success');
  onBack();
  } catch (err: any) {
  show(AR ? 'حدث خطأ أثناء إرسال الوصفة' : 'Error sending prescription', 'error');
  } finally {
  setLoading(false);
  }
  };

 return (
 <NScroll>
 <NHeader title={AR ? ' الوصفة الطبية الإلكترونية' : ' E-Prescription'} onBack={onBack} />

 {/* Patient info */}
 <NCard style={{ marginBottom: SP.xl, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <NAvatar name={apt?.patient ?? 'مريض'} size={44} />
 <View>
 <Text style={{ fontWeight: FW.bold, color: theme.text }}>{apt?.patient ?? '—'}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{new Date().toLocaleDateString('ar-SA')}</Text>
 </View>
 </NCard>

 {/* Template Actions */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.xl }}>
 <TouchableOpacity onPress={() => { loadTemplates(); setShowTemplates(true); }} style={{ flex: 1, backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
 <Text style={{ color: theme.primary, fontWeight: FW.bold, fontSize: FS.sm }}> {AR ? 'نماذج الوصفات' : 'Prescription Templates'}</Text>
 </TouchableOpacity>
 <TouchableOpacity onPress={() => { if(drugs.length === 0) { show(AR ? 'أضف أدوية أولاً لحفظها كنموذج' : 'Add medications first to save as template', 'error'); return; } setShowSaveTemplateSheet(true); }} style={{ flex: 1, backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
 <Text style={{ color: theme.success, fontWeight: FW.bold, fontSize: FS.sm }}> {AR ? 'حفظ كنموذج' : 'Save as Template'}</Text>
 </TouchableOpacity>
 </View>

 {/* Drug interaction check — real rules engine */}
 {drugs.length >= 2 && (
 <NCard style={{ marginBottom: SP.xl, backgroundColor: theme.warnBg }}>
 <TouchableOpacity onPress={async () => {
   try {
     const res = await client.post('/ai/drug-interactions', { drugs: drugs.map((d) => d.name) });
     const hits = res?.data?.interactions || [];
     if (!hits.length) { show(AR ? 'لا توجد تفاعلات معروفة بين هذه الأدوية' : 'No known interactions between these drugs', 'success'); return; }
     show((AR ? 'تفاعلات مكتشفة: ' : 'Interactions found: ') + hits.map((h: any) => h.note_ar || h.note || h.severity).join('؛ '), 'warning');
   } catch {
     show(AR ? 'تعذر فحص التفاعلات' : 'Could not check interactions', 'error');
   }
 }}>
 <Text style={{ fontSize: FS.sm, color: theme.warn, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'افحص التفاعلات الدوائية قبل الحفظ' : 'Check drug interactions before saving'}
 </Text>
 </TouchableOpacity>
 </NCard>
 )}

 {/* Added drugs */}
 {drugs.map(drug => (
 <NCard key={drug.id} style={{ marginBottom: SP.md }} accent={theme.primary}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}> {drug.name}</Text>
 <TouchableOpacity onPress={() => removeDrug(drug.id)}>
 <Text style={{ color: theme.danger, fontSize: FS.sm }}> {AR ? 'حذف' : 'Remove'}</Text>
 </TouchableOpacity>
 </View>

 <NInput label={AR ? 'الجرعة' : 'Dosage'} placeholder={AR ? 'مثال: قرص واحد' : 'e.g., 1 tablet'}
 value={drug.dose} onChange={v => updateDrug(drug.id, { dose: v })} icon="" />

 {/* Frequency */}
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.sm,
 textAlign: AR ? 'right' : 'left' }}>{AR ? 'التكرار:' : 'Frequency:'}</Text>
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
 <View style={{ flexDirection: 'row', gap: SP.sm, marginBottom: SP.md }}>
 {(AR ? FREQS_AR : FREQS_EN).map(f => (
 <TouchableOpacity key={f} onPress={() => updateDrug(drug.id, { freq: f })}
 style={[styles.freqChip, {
 backgroundColor: drug.freq === f ? theme.primary : theme.surface2,
 borderColor: drug.freq === f ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: drug.freq === f ? '#FFF' : theme.text, fontSize: FS.xs }}>{f}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </ScrollView>

 {/* Duration */}
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.sm,
 textAlign: AR ? 'right' : 'left' }}>{AR ? 'المدة:' : 'Duration:'}</Text>
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
 <View style={{ flexDirection: 'row', gap: SP.sm }}>
 {(AR ? DURS_AR : DURS_EN).map(d => (
 <TouchableOpacity key={d} onPress={() => updateDrug(drug.id, { duration: d })}
 style={[styles.freqChip, {
 backgroundColor: drug.duration === d ? theme.info : theme.surface2,
 borderColor: drug.duration === d ? theme.info : theme.border,
 }]}>
 <Text style={{ color: drug.duration === d ? '#FFF' : theme.text, fontSize: FS.xs }}>{d}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </ScrollView>
 </NCard>
 ))}

 {/* Add drug button */}
 <NBtn label={AR ? '+ إضافة دواء' : '+ Add Medication'} variant="outline"
 onPress={() => setDrugSearch(true)} style={{ marginBottom: SP.lg }} />

 {/* General notes */}
 <NInput label={AR ? 'تعليمات إضافية للمريض' : 'Additional Patient Instructions'}
 placeholder={AR ? 'مثال: تناول الدواء بعد الأكل، الإكثار من الماء...' : 'e.g., Take with food, drink plenty of water...'}
 value={drugNotes} onChange={setDrugNotes} multi lines={3} icon="" />

 {/* Routing options */}
 <NCard style={{ marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text,
 marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'إرسال الوصفة إلى:' : 'Send Prescription to:'}
 </Text>
 {[
 { icon:'messageSquare', ar:'المريض مباشرة (WhatsApp / SMS)', en:'Patient directly (WhatsApp / SMS)' },
 { icon:'box', ar:'صيدلية في نبض بلس', en:'Pharmacy on Nabd Plus' },
 { icon:'printer', ar:'طباعة PDF', en:'Print / PDF' },
 ...(apt?.insurance && apt.insurance !== 'Cash' ? [{ icon:'shield', ar:'رفع للاعتماد التأميني (Pre-Approval)', en:'Send for Insurance Pre-Approval (TPA)' }] : []),
 ].map((opt, i) => (
 <TouchableOpacity key={i} style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md,
 paddingVertical: SP.md, alignItems: 'center',
 borderBottomWidth: i < 2 ? StyleSheet.hairlineWidth : 0, borderBottomColor: theme.border }}>
 <I name={opt.icon} size={20} color={theme.textSub} />
 <Text style={{ flex: 1, color: theme.text, fontSize: FS.md, textAlign: AR ? 'right' : 'left' }}>
 {AR ? opt.ar : opt.en}
 </Text>
 <I name="chevronRight" size={16} color={theme.textSub} />
 </TouchableOpacity>
 ))}
 </NCard>

 <NBtn label={AR ? ' حفظ وإصدار الوصفة' : ' Save & Issue Prescription'}
 disabled={drugs.length === 0}
 loading={loading}
 onPress={handleSavePrescription} />

 {/* Drug search sheet */}
 <NSheet visible={showDrugSearch} onClose={() => setDrugSearch(false)}
 title={AR ? 'البحث عن دواء' : 'Search Medication'} height={500}>
 <NSearch value={search} onChange={setSearch} placeholder={AR ? 'اسم الدواء...' : 'Medication name...'} />
 <View style={{ marginTop: SP.md }}>
 {/* Custom Medication Entry */}
 {search.trim().length > 0 && (
 <TouchableOpacity onPress={() => addDrug(search.trim())}
 style={[styles.drugRow, { borderBottomColor: theme.border, backgroundColor: theme.primaryLight, marginBottom: SP.sm }]}>
 <Text style={{ fontSize: 18 }}>✍️</Text>
 <Text style={{ flex: 1, color: theme.primary, fontSize: FS.md, fontWeight: FW.bold }}>
 {AR ? `إضافة دواء غير مدرج: "${search.trim()}"` : `Add Custom Med: "${search.trim()}"`}
 </Text>
 <Text style={{ color: theme.primary }}>+ {AR ? 'إضافة' : 'Add'}</Text>
 </TouchableOpacity>
 )}
 {filtered.slice(0, 15).map(d => (
 <TouchableOpacity key={d.id} onPress={() => addDrug(d.name)}
 style={[styles.drugRow, { borderBottomColor: theme.border }]}>
 <Text style={{ fontSize: 18 }}>💊</Text>
 <Text style={{ flex: 1, color: theme.text, fontSize: FS.md }}>{d.name}</Text>
 <Text style={{ color: theme.primary }}>+ {AR ? 'إضافة' : 'Add'}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </NSheet>

 {/* Load Template Sheet */}
 <NSheet visible={showTemplates} onClose={() => setShowTemplates(false)} title={AR ? ' اختر نموذج وصفة' : ' Load Prescription Template'} height={400}>
 <View style={{ padding: SP.md }}>
 {templatesLoading ? <ActivityIndicator color={theme.primary} /> : null}
 {templates.map(t => (
 <View key={t.id} style={{ padding: SP.md, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <TouchableOpacity style={{ flex: 1 }} onPress={() => { setDrugs(t.drugs); setShowTemplates(false); show(AR ? 'تم تحميل النموذج' : 'Template loaded successfully', 'success'); }}>
 <Text style={{ color: theme.text, fontSize: FS.md, fontWeight: FW.bold }}>{AR ? t.titleAr : t.titleEn}</Text>
 <Text style={{ color: theme.textSub, fontSize: FS.xs }}>{t.drugs.length} {AR ? 'أدوية' : 'drugs'}</Text>
 </TouchableOpacity>
 <TouchableOpacity onPress={async () => {
   try {
     await client.delete(`/provider/ops/doctor/templates/${t.id}`);
     setTemplates((prev) => prev.filter((x) => x.id !== t.id));
   } catch {
     show(AR ? 'تعذر حذف النموذج' : 'Could not delete template', 'error');
   }
 }} style={{ padding: SP.sm }}>
 <Text style={{ color: theme.danger, fontSize: FS.sm }}>{AR ? 'حذف' : 'Delete'}</Text>
 </TouchableOpacity>
 </View>
 ))}
 </View>
 </NSheet>

 {/* Save Template Sheet */}
 <NSheet visible={showSaveTemplateSheet} onClose={() => setShowSaveTemplateSheet(false)} title={AR ? ' حفظ كنموذج جديد' : ' Save Custom Template'} height={300}>
 <View style={{ padding: SP.md }}>
 <NInput label={AR ? 'اسم النموذج' : 'Template Title'} value={templateName} onChange={setTemplateName} placeholder={AR ? 'مثال: نموذج علاج الربو' : 'e.g., Asthma Treatment'} />
 <NBtn label={AR ? ' حفظ' : ' Save'} onPress={async () => {
 if (!templateName.trim()) { show(AR ? 'يرجى إدخال اسم النموذج' : 'Please enter template title', 'error'); return; }
 try {
   await client.post('/provider/ops/doctor/templates', { name: templateName.trim(), items: drugs.map((d) => ({ name: d.name, dose: d.dose, freq: d.freq, duration: d.duration, notes: d.notes })) });
   setShowSaveTemplateSheet(false);
   setTemplateName('');
   show(AR ? 'تم حفظ النموذج الجديد بنجاح' : 'Template saved successfully', 'success');
   loadTemplates();
 } catch (err: any) {
   show(err?.response?.data?.message || (AR ? 'تعذر حفظ النموذج' : 'Could not save template'), 'error');
 }
 }} />
 </View>
 </NSheet>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// DIGITAL SICK LEAVE SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export function SickLeaveScreen({ apt, onBack }:
 { apt: any; onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [days, setDays] = useState('3');
 const [from, setFrom] = useState(new Date().toISOString().split('T')[0]);
 const [diag, setDiag] = useState('');
 const [issued, setIssued] = useState(false);

 if (issued) {
 return (
 <View style={{ flex: 1, backgroundColor: theme.bg, padding: SP.xl, justifyContent: 'center', alignItems: 'center' }}>
 <Text style={{ fontSize: 80, marginBottom: SP.xl }}></Text>
 <Text style={{ fontSize: FS['2xl'], fontWeight: FW.bold, color: theme.text, textAlign: 'center', marginBottom: SP.md }}>
 {AR ? 'تم إصدار الإجازة المرضية' : 'Sick Leave Issued'}
 </Text>
 <NCard style={{ width: '100%', marginBottom: SP.xl, backgroundColor: theme.successBg }}>
 <Text style={{ fontSize: FS.sm, color: theme.success, textAlign: AR ? 'right' : 'left', lineHeight: 24 }}>
 {AR ? ` إجازة مرضية لمدة ${days} أيام\n من: ${from}\n رمز QR فريد للتحقق` : ` ${days}-day sick leave\n From: ${from}\n Unique QR code for verification`}
 </Text>
 </NCard>
 <Text style={{ fontSize: FS['5xl'] }}></Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', marginTop: SP.md }}>
 {AR ? 'تم إرسال الإجازة للمريض عبر QR Code ورسالة نصية' : 'Sick leave sent to patient via QR Code & SMS'}
 </Text>
 <NBtn label={AR ? 'رجوع' : 'Back'} onPress={onBack} style={{ marginTop: SP.xxl }} />
 </View>
 );
 }

 return (
 <NScroll>
 <NHeader title={AR ? ' إجازة مرضية رقمية' : ' Digital Sick Leave'} onBack={onBack} />

 <NCard style={{ marginBottom: SP.xl, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <NAvatar name={apt?.patient ?? 'مريض'} size={44} />
 <View>
 <Text style={{ fontWeight: FW.bold, color: theme.text }}>{apt?.patient ?? '—'}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{AR ? 'تاريخ اليوم:' : 'Today:'} {from}</Text>
 </View>
 </NCard>

 <NInput label={AR ? 'التشخيص' : 'Diagnosis'}  placeholder={AR ? 'سبب الإجازة الطبية' : 'Medical reason for leave'}
 value={diag} onChange={setDiag} icon="" required />

 <NInput label={AR ? 'تاريخ البداية' : 'Start Date'} placeholder="YYYY-MM-DD"
 value={from} onChange={setFrom} icon="" />

 <View style={{ marginBottom: SP.lg }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'عدد الأيام' : 'Number of Days'}
 </Text>
 <View style={{ flexDirection: 'row', gap: SP.sm, flexWrap: 'wrap' }}>
 {['1','2','3','5','7','10','14'].map(d => (
 <TouchableOpacity key={d} onPress={() => setDays(d)}
 style={[styles.dayChip2, {
 backgroundColor: days === d ? theme.primary : theme.surface2,
 borderColor: days === d ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: days === d ? '#FFF' : theme.text, fontWeight: FW.bold }}>
 {d} {AR ? (d==='1'?'يوم':'أيام') : (d==='1'?'day':'days')}
 </Text>
 </TouchableOpacity>
 ))}
 </View>
 </View>

 <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.info, textAlign: AR ? 'right' : 'left', lineHeight: 20 }}>
  {AR
 ? 'إصدار الإجازة غير متاح من التطبيق إلى أن يتحقق الخادم من علاقة الموعد وترخيص الطبيب والتوقيع القانوني ورقم التحقق.'
 : 'Issuance is unavailable from the app until the server verifies appointment relation, doctor licence, legal signature, and verification reference.'}
 </Text>
 </NCard>

  <NBtn label={AR ? ' إصدار وإرسال الإجازة' : ' Issue & Send Sick Leave'}
  disabled={!diag.trim()}
  onPress={async () => {
    const patientId = apt?.patient_id || apt?.raw?.patient_id;
    const appointmentId = apt?.id || apt?.raw?.id || 'new';
    if (!patientId) {
      show(AR ? 'معرّف المريض غير متاح؛ لا يمكن طلب الإجازة.' : 'Patient identifier is unavailable; leave issuance cannot be requested.', 'error');
      return;
    }
    try {
      const res = await client.post(`/provider/requests/${appointmentId}/sick-leave`, {
        patient_id: patientId,
        duration_days: parseInt(days, 10) || 1,
        start_date: from,
        diagnosis: diag,
      });
      show(AR ? `تم إصدار الإجازة الطبية برقم تتبع ${res.data?.tracking_id || '—'}` : `Official sick leave issued: ${res.data?.tracking_id || '—'}`, 'success');
      setIssued(true);
    } catch (err: any) {
      show(err?.response?.data?.message || (AR ? 'فشل إصدار الإجازة' : 'Failed to issue sick leave'), 'error');
    }
  }} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// REFERRAL SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export function ReferralScreen({ apt, onBack }:
 { apt: any; onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [spec, setSpec] = useState('');
  const [reason, setReason] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [viewMode, setViewMode] = useState<'create'|'track'>('create');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(true);
  const loadReferrals = useCallback(async () => {
    setLoadingReferrals(true);
    try {
      const response = await client.get('/provider/referrals/mine');
      const rows = Array.isArray(response.data) ? response.data : (response.data?.items || []);
      setReferrals(rows.map((row: any) => ({
        id: row.id,
        patientName: row.patient_name || row.patientName || '—',
        date: row.created_at || row.date || '',
        target: row.target_name || row.target_type || '—',
        type: row.target_type || '',
        test: row.tests_summary || row.notes || '—',
        status: String(row.status || 'pending').toLowerCase(),
        statusAr: String(row.status || 'pending').toLowerCase() === 'completed' ? 'مكتمل' : String(row.status || 'pending').toLowerCase() === 'accepted' ? 'مقبول' : 'انتظار',
      })));
    } catch (error: any) {
      setReferrals([]);
      show(error?.response?.data?.message || (AR ? 'تعذر تحميل الإحالات من الخادم' : 'Unable to load referrals from the server'), 'error');
    } finally {
      setLoadingReferrals(false);
    }
  }, [AR, show]);
  useEffect(() => { loadReferrals(); }, [loadReferrals]);
 
  return (
  <NScroll>
  <NHeader title={AR ? ' تحويل مريض' : ' Patient Referral'} onBack={onBack} />
 
  {/* Tab Switcher */}
  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, paddingHorizontal: SP.xl, marginBottom: SP.lg }}>
  <TouchableOpacity onPress={() => setViewMode('create')} style={{ flex: 1, paddingVertical: SP.sm, borderBottomWidth: 2, borderBottomColor: viewMode === 'create' ? theme.primary : 'transparent', alignItems: 'center' }}>
  <Text style={{ color: viewMode === 'create' ? theme.primary : theme.textSub, fontWeight: FW.bold }}>{AR ? 'إنشاء تحويل' : 'Create Referral'}</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={() => setViewMode('track')} style={{ flex: 1, paddingVertical: SP.sm, borderBottomWidth: 2, borderBottomColor: viewMode === 'track' ? theme.primary : 'transparent', alignItems: 'center' }}>
  <Text style={{ color: viewMode === 'track' ? theme.primary : theme.textSub, fontWeight: FW.bold }}>{AR ? 'متابعة التحويلات' : 'Track Referrals'}</Text>
  </TouchableOpacity>
  </View>

  {viewMode === 'track' ? (
  <View style={{ paddingHorizontal: SP.xl }}>
  {loadingReferrals ? <ActivityIndicator color={theme.primary} /> : referrals.length === 0 ? <NEmpty title={AR ? 'لا توجد إحالات' : 'No referrals'} sub={AR ? 'ستظهر الإحالات المحفوظة في الخادم هنا.' : 'Server-saved referrals will appear here.'} icon="send" /> : referrals.map(r => (
  <NCard key={r.id} style={{ marginBottom: SP.md }}>
  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.xs }}>
  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{r.patientName}</Text>
  <NBadge label={AR ? r.statusAr : r.status.toUpperCase()} variant={r.status === AppointmentStatus.COMPLETED ? 'success' : r.status === 'accepted' ? 'primary' : 'warning'} size="xs" />
  </View>
  <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{AR ? 'الجهة:' : 'Target:'} {r.target}</Text>
  <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{r.test} — {r.date}</Text>
  </NCard>
  ))}
  </View>
  ) : (
  <View>
  <NCard style={{ marginBottom: SP.xl, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
  <NAvatar name={apt?.patient ?? 'مريض'} size={44} />
  <View>
  <Text style={{ fontWeight: FW.bold, color: theme.text }}>{apt?.patient ?? '—'}</Text>
  <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{new Date().toLocaleDateString('ar-SA')}</Text>
  </View>
  </NCard>

  <View style={{ marginBottom: SP.lg }}>
  <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
  {AR ? 'تحويل إلى تخصص' : 'Refer to Specialty'}<Text style={{ color: theme.danger }}> *</Text>
  </Text>
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>
  {SPECIALTIES.slice(0, 12).map(s => (
  <TouchableOpacity key={s.id} onPress={() => setSpec(s.id)}
  style={[styles.specChip, {
  backgroundColor: spec === s.id ? theme.primaryLight : theme.surface2,
  borderColor: spec === s.id ? theme.primary : theme.border,
  }]}>
  <Text style={{ fontSize: 16 }}>{s.icon}</Text>
  <Text style={{ fontSize: FS.xs, color: spec === s.id ? theme.primary : theme.text,
  fontWeight: spec === s.id ? FW.bold : FW.reg }}>
  {AR ? s.ar : s.en}
  </Text>
  </TouchableOpacity>
  ))}
  </View>
  </View>


  <NInput label={AR ? 'سبب التحويل' : 'Reason for Referral'}
  placeholder={AR ? 'اشرح سبب التحويل ومعلومات ذات صلة...' : 'Explain the reason and relevant information...'}
  value={reason} onChange={setReason} multi lines={4} icon="" required />

  <NToggle label={AR ? ' تحويل عاجل' : ' Urgent Referral'}
  sub={AR ? 'يتطلب موعداً خلال 24-48 ساعة' : 'Requires appointment within 24-48 hours'}
  value={urgent} onChange={setUrgent} />

  <View style={{ height: SP.xl }} />

  <NBtn label={AR ? ' إرسال التحويل' : ' Send Referral'}
  disabled={!spec || !reason.trim()}
  onPress={async () => {
  try {
  if (!apt?.patient_id) {
    show(AR ? 'لا يمكن إنشاء الإحالة دون مريض مرتبط' : 'Cannot create a referral without a linked patient', 'error');
    return;
  }
  await client.post('/provider/referrals', {
  appointment_id: apt.id || apt.appointment_id,
  target_type: spec,
  notes: reason,
  patient_id: apt.patient_id,
  patient_name: apt.patient || apt.patient_name || '',
  urgent,
  });
  await loadReferrals();
  setReason('');
  setViewMode('track');
  show(AR ? 'تم إرسال التحويل وحفظه بنجاح' : 'Referral submitted and saved', 'success');
  } catch(e) {
  show(AR ? 'حدث خطأ أثناء إرسال التحويل' : 'Failed to send referral', 'error');
  }
  }} />
  </View>
  )}
  </NScroll>
  );
}



// ══════════════════════════════════════════════════════════════════════════════
// REQUEST TEST SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export function RequestTestScreen({ apt, onBack }:
 { apt: any; onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [type, setType] = useState<'lab'|'radiology'|'nursing'>(apt?.initialType || 'lab');
 const [selected, setSelected] = useState<string[]>([]);
 const [notes, setNotes] = useState('');

 const items = useServicesCatalog(type);

 const toggle = (id: string) => {
 setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
 };

 return (
 <NScroll>
 <NHeader title={AR ? '🩺 طلب خدمات طبية' : '🩺 Request Medical Services'} onBack={onBack} />

 {/* Type toggle */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.xl }}>
 {[{ k:'lab', ar:' تحاليل', en:' Lab Tests' }, { k:'radiology', ar:' أشعة', en:' Radiology' }, { k:'nursing', ar:' تمريض', en:' Nursing' }].map(t => (
 <TouchableOpacity key={t.k} onPress={() => { setType(t.k as any); setSelected([]); }}
 style={[{ flex:1, paddingVertical:SP.md, borderRadius:R.lg, borderWidth:1.5, alignItems:'center' }, {
 backgroundColor: type===t.k ? theme.primary : theme.surface2,
 borderColor: type===t.k ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: type===t.k ? '#FFF' : theme.text, fontWeight: FW.semi, fontSize: FS.sm }}>
 {AR ? t.ar : t.en}
 </Text>
 </TouchableOpacity>
 ))}
 </View>

 {selected.length > 0 && (
 <NCard style={{ backgroundColor: theme.successBg, marginBottom: SP.lg }}>
 <Text style={{ color: theme.success, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>
 {selected.length} {AR ? 'بنود مختارة' : 'items selected'}
 </Text>
 </NCard>
 )}

 {items.map((item: any) => (
 <TouchableOpacity key={item.id} onPress={() => toggle(item.id)}>
 <NCard style={{ marginBottom: SP.sm }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <View style={[styles.insureCheck, {
 backgroundColor: selected.includes(item.id) ? theme.primary : 'transparent',
 borderColor: selected.includes(item.id) ? theme.primary : theme.border,
 }]}>
 {selected.includes(item.id) && <Text style={{ color:'#FFF',fontSize:11,fontWeight:'700' }}></Text>}
 </View>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, color: theme.text, fontWeight: FW.med,
 textAlign: AR ? 'right' : 'left' }}>{AR ? item.ar : item.en}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 2 }}>
 ⏱ {item.hours} {AR ? 'ساعة' : 'hr'}{item.fasting ? ` · ${AR?'صيام مطلوب':'Fasting required'}` : ''}
 </Text>
 </View>
 </View>
 </NCard>
 </TouchableOpacity>
 ))}

 <View style={{ height: SP.xl }} />
 <NInput label={AR ? 'تعليمات إضافية' : 'Additional Instructions'}
 value={notes} onChange={setNotes} multi lines={3} icon="" />

 <NBtn label={AR ? ' إرسال الطلب' : ' Send Request'}
 disabled={selected.length === 0}
 onPress={async () => { 
 try {
      const patientId = apt?.patient_id;
      if (!patientId) {
        show(AR ? 'لا يمكن إرسال الطلب دون مريض مرتبط بالاستشارة' : 'Cannot request services without a linked patient', 'error');
        return;
      }
      const endpoint = type === 'lab' ? '/labs/bookings' : type === 'radiology' ? '/radiology/bookings' : '/home-care/bookings';
      await client.post(endpoint, {
        items: selected,
        notes: notes,
        patient_id: patientId
      });
 show(AR?`تم إرسال طلب ${selected.length} فحص `:`${selected.length} test(s) requested `,'success'); 
 onBack(); 
 } catch(e) {
 show(AR?'حدث خطأ أثناء إرسال الطلب':'Failed to submit request','error');
 }
 }} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// PATIENT FILE SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function PatientFileScreen({ patient, onBack }:
 { patient: any; onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [activeSection, setActive] = useState('overview');

 // Client CRM States — persisted via provider CRM + blacklist endpoints
 const patientId = String(patient?.patient_id || patient?.id || '');
 const [isVip, setIsVip] = useState(patient?.insurance?.includes('VIP') || false);
 const [isBlocked, setIsBlocked] = useState(false);
 const [isFavorite, setIsFavorite] = useState(false);
 const [customTags, setCustomTags] = useState<string[]>([]);
 const [newTag, setNewTag] = useState('');
 const [crmNotes, setCrmNotes] = useState<Array<{ id: string; date: string; text: string }>>([]);
 const [newNote, setNewNote] = useState('');

 useEffect(() => {
   if (!patientId) return;
   client.get(`/provider/ops/doctor/patient-crm/${encodeURIComponent(patientId)}`).then((res) => {
     const d = res?.data?.data || res?.data || {};
     if (Array.isArray(d.tags)) setCustomTags(d.tags.filter((t: any) => typeof t === 'string'));
     if (Array.isArray(d.notes)) setCrmNotes(d.notes);
     if (typeof d.vip === 'boolean') setIsVip(d.vip);
     if (typeof d.favorite === 'boolean') setIsFavorite(d.favorite);
   }).catch(() => {});
   client.get('/provider/ops/doctor/blacklist').then((res) => {
     const list = Array.isArray(res?.data) ? res.data : [];
     if (list.some((b: any) => String(b.patient_id || b.patientId || b.id) === patientId)) setIsBlocked(true);
   }).catch(() => {});
 }, [patientId]);

 const sections = [
 { k:'overview', ar:'نظرة عامة', en:'Overview' },
 { k:'crm', ar:'إدارة العميل (CRM)', en:'Client CRM' },
 { k:'visits', ar:'الزيارات', en:'Visits' },
 { k:'rx', ar:'الوصفات', en:'Rx' },
 { k:'labs', ar:'التحاليل', en:'Labs' },
 { k:'allergies',ar:'الحساسية', en:'Allergies' },
 ];

 async function persistCrm(patch: any) {
   if (!patientId) return;
   try {
     await client.put(`/provider/ops/doctor/patient-crm/${encodeURIComponent(patientId)}`, patch);
   } catch {
     show(AR ? 'تعذر حفظ بيانات العميل' : 'Could not save client data', 'error');
   }
 }

 const handleAddTag = () => {
 if (!newTag.trim()) return;
 if (customTags.includes(newTag.trim())) {
 show(AR ? 'الوسم مضاف بالفعل' : 'Tag already exists', 'warning');
 return;
 }
 const next = [...customTags, newTag.trim()];
 setCustomTags(next);
 setNewTag('');
 persistCrm({ tags: next });
 show(AR ? 'تم إضافة الوسم' : 'Tag added successfully', 'success');
 };

 const handleRemoveTag = (tag: string) => {
 const next = customTags.filter(t => t !== tag);
 setCustomTags(next);
 persistCrm({ tags: next });
 show(AR ? 'تم حذف الوسم' : 'Tag removed', 'info');
 };

 const handleAddNote = () => {
 if (!newNote.trim()) return;
 const dateStr = new Date().toISOString().split('T')[0];
 const next = [{ id: Date.now().toString(), date: dateStr, text: newNote.trim() }, ...crmNotes];
 setCrmNotes(next);
 setNewNote('');
 persistCrm({ notes: next });
 show(AR ? 'تم حفظ ملاحظة CRM' : 'CRM Note saved', 'success');
 };

 const handleToggleVip = (val: boolean) => {
 setIsVip(val);
 persistCrm({ vip: val });
 show(val ? (AR ? 'تم ترقية المريض إلى VIP ' : 'Patient upgraded to VIP ') : (AR ? 'تم إلغاء حالة VIP' : 'VIP status removed'), 'success');
 };

 const handleToggleFavorite = (val: boolean) => {
 setIsFavorite(val);
 persistCrm({ favorite: val });
 show(val ? (AR ? 'تم الإضافة للمفضلة ' : 'Added to favorites ') : (AR ? 'تم الإزالة من المفضلة' : 'Removed from favorites'), 'success');
 };

 const handleToggleBlocked = async (val: boolean) => {
 if (!patientId) { show(AR ? 'معرف المريض مفقود' : 'Patient identifier is missing', 'error'); return; }
 try {
   if (val) await client.post(`/provider/ops/doctor/blacklist/${encodeURIComponent(patientId)}`, { reason: 'provider_blocked' });
   else await client.delete(`/provider/ops/doctor/blacklist/${encodeURIComponent(patientId)}`);
   setIsBlocked(val);
   show(val ? (AR ? 'تم إدراج المريض في الحظر ' : 'Patient added to blocklist ') : (AR ? 'تم إلغاء الحظر' : 'Patient unblocked'), 'warning');
 } catch {
   show(AR ? 'تعذر تحديث الحظر' : 'Could not update block status', 'error');
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? ' ملف المريض' : ' Patient File'} onBack={onBack} />

 {/* Patient info */}
 <NCard style={{ marginBottom: SP.xl }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.lg, alignItems: 'center' }}>
 <NAvatar name={patient?.patient ?? 'مريض'} size={60} />
 <View style={{ flex: 1 }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.xs }}>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text,
 textAlign: AR ? 'right' : 'left' }}>{patient?.patient ?? (AR ? 'مريض' : 'Patient')}</Text>
 {isFavorite && <Text style={{ fontSize: FS.xl }}></Text>}
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {[patient?.age ? `${patient.age} ${AR ? 'سنة' : 'yrs'}` : '', patient?.gender || '', patient?.blood_type ? `${AR ? 'فصيلة الدم: ' : 'Blood: '}${patient.blood_type}` : ''].filter(Boolean).join(' | ') || '—'}
 </Text>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm, marginTop: SP.xs }}>
 {patient?.insurance ? <NBadge label={patient.insurance} variant="primary" size="xs" /> : null}
 {patient?.chronic ? <NBadge label={`${AR ? 'مزمن: ' : 'Chronic: '}${patient.chronic}`} variant="warning" size="xs" /> : null}
 {isVip && <NBadge label="VIP " variant="success" size="xs" />}
 {isBlocked && <NBadge label={AR ? 'محظور ' : 'Blocked '} variant="danger" size="xs" />}
 </View>
 </View>
 </View>
 </NCard>

 {/* Sections */}
 <ScrollView horizontal showsHorizontalScrollIndicator={false}
 contentContainerStyle={{ gap: SP.sm, paddingBottom: SP.sm, marginBottom: SP.xl }}>
 {sections.map(sec => (
 <TouchableOpacity key={sec.k} onPress={() => setActive(sec.k)}
 style={[styles.secTab, {
 backgroundColor: activeSection === sec.k ? theme.primary : theme.surface2,
 borderColor: activeSection === sec.k ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: activeSection === sec.k ? '#FFF' : theme.text, fontSize: FS.sm, fontWeight: FW.semi }}>
 {AR ? sec.ar : sec.en}
 </Text>
 </TouchableOpacity>
 ))}
 </ScrollView>

 {/* Content by section */}
 {activeSection === 'overview' && (
 <View style={{ gap: SP.md }}>
 {[
 { ar:'أمراض مزمنة', en:'Chronic Conditions', val:'سكري النوع 2، ضغط الدم' },
 { ar:'الأدوية الحالية', en:'Current Medications', val:'Metformin 500mg، Lisinopril 10mg' },
 { ar:'الحساسية', en:'Allergies', val:'بنسيلين (Penicillin)' },
 { ar:'آخر زيارة', en:'Last Visit', val:'2025-03-15' },
 { ar:'عدد الزيارات', en:'Total Visits', val:'12 زيارة' },
 ].map((row, i) => (
 <NCard key={i} style={{ padding: SP.lg }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{AR ? row.ar : row.en}</Text>
 <Text style={{ fontSize: FS.md, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>{row.val}</Text>
 </NCard>
 ))}
 </View>
 )}

 {activeSection === 'crm' && (
 <View style={{ gap: SP.xl }}>
 {/* Toggles */}
 <NCard style={{ gap: SP.lg }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 ️ {AR ? 'حالة العميل والتصنيفات' : 'Client Status & Category'}
 </Text>
 <NToggle
 label={AR ? 'علامة عميل VIP ' : 'VIP Client Badge '}
 sub={AR ? 'تمييز المريض ببطاقة عميل خاص في النظام' : 'Highlight patient as high-priority VIP'}
 value={isVip}
 onChange={handleToggleVip}
 />
 <NDivider style={{ marginVertical: SP.xs }} />
 <NToggle
 label={AR ? 'إضافة للمفضلة ' : 'Add to Favorites '}
 sub={AR ? 'إظهار نجمة بجانب المريض لسهولة الوصول' : 'Show star badge for quick identification'}
 value={isFavorite}
 onChange={handleToggleFavorite}
 />
 <NDivider style={{ marginVertical: SP.xs }} />
 <NToggle
 label={AR ? 'حظر هذا المريض ' : 'Block this Patient '}
 sub={AR ? 'منع المريض من إرسال طلبات حجز جديدة إليك' : 'Prevent patient from booking future slots with you'}
 value={isBlocked}
 onChange={handleToggleBlocked}
 />
 </NCard>

 {/* Block Warning Card */}
 {isBlocked && (
 <NCard style={{ backgroundColor: theme.dangerBg, borderColor: theme.danger }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <Text style={{ fontSize: 24 }}></Text>
 <Text style={{ flex: 1, fontSize: FS.sm, color: theme.danger, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'المريض محظور حالياً ولا يمكنه تقديم طلب استشارة أو كشف لديك.'
 : 'Patient is currently blocked and cannot send you consultation requests.'}
 </Text>
 </View>
 </NCard>
 )}

 {/* Custom CRM Tags */}
 <NCard style={{ gap: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 ️ {AR ? 'الأوسمة والوسوم المخصصة' : 'Custom CRM Tags'}
 </Text>
 
 {/* Tags List */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.xs, marginVertical: SP.xs }}>
 {customTags.map((tag, idx) => (
 <TouchableOpacity
 key={idx}
 onPress={() => handleRemoveTag(tag)}
 style={{
 flexDirection: AR ? 'row-reverse' : 'row',
 alignItems: 'center',
 backgroundColor: theme.primaryLight,
 paddingHorizontal: SP.md,
 paddingVertical: 4,
 borderRadius: R.full,
 gap: 4
 }}
 >
 <Text style={{ color: theme.primary, fontSize: FS.xs, fontWeight: FW.bold }}>{tag}</Text>
 <Text style={{ color: theme.primary, fontSize: 10 }}>×</Text>
 </TouchableOpacity>
 ))}
 {customTags.length === 0 && (
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
 {AR ? 'لا توجد وسوم مخصصة حالياً.' : 'No custom tags applied.'}
 </Text>
 )}
 </View>

 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <View style={{ flex: 1 }}>
 <NInput
 placeholder={AR ? 'أضف وسماً (مثال: متعاون، مدخن)' : 'Add tag (e.g. Cooperative, Smoker)'}
 value={newTag}
 onChange={setNewTag}
 />
 </View>
 <TouchableOpacity
 onPress={handleAddTag}
 style={{
 backgroundColor: theme.primary,
 width: 44,
 height: 44,
 borderRadius: R.md,
 alignItems: 'center',
 justifyContent: 'center'
 }}
 >
 <Text style={{ color: '#FFF', fontSize: 24, fontWeight: FW.bold }}>+</Text>
 </TouchableOpacity>
 </View>
 </NCard>

 {/* Provider Private Notes */}
 <NCard style={{ gap: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'ملاحظات العيادة الخاصة' : 'Private CRM Clinic Notes'}
 </Text>

 <NInput
 placeholder={AR ? 'اكتب ملاحظة خاصة عن المريض (سرية ولن تظهر له)...' : 'Write a private note (confidential, hidden from patient)...'}
 value={newNote}
 onChange={setNewNote}
 multi
 lines={3}
 />
 <NBtn
 label={AR ? 'حفظ الملاحظة' : 'Save Note'}
 onPress={handleAddNote}
 disabled={!newNote.trim()}
 />

 <NDivider style={{ marginVertical: SP.sm }} />

 <View style={{ gap: SP.md }}>
 {crmNotes.map(note => (
 <View
 key={note.id}
 style={{
 backgroundColor: theme.surface2,
 padding: SP.md,
 borderRadius: R.md,
 borderLeftWidth: AR ? 0 : 3,
 borderRightWidth: AR ? 3 : 0,
 borderColor: theme.primary
 }}
 >
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 4 }}>
 <Text style={{ fontSize: 10, color: theme.textSub }}>{note.date}</Text>
 <Text style={{ fontSize: 10, color: theme.primary, fontWeight: FW.bold }}>{AR ? 'طبيب' : 'Doctor'}</Text>
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left', lineHeight: 18 }}>
 {note.text}
 </Text>
 </View>
 ))}
 </View>
 </NCard>
 </View>
 )}

 {activeSection === 'visits' && (
 <View>
 {[
 { date:'2025-03-15', type:'video', diagnosis:'ضغط دم مرتفع', doctor:'د. محمد' },
 { date:'2025-01-20', type:'clinic', diagnosis:'فحص روتيني سكري', doctor:'د. محمد' },
 { date:'2024-11-05', type:'home', diagnosis:'التهاب مجاري بولية', doctor:'د. محمد' },
 ].map((visit, i) => (
 <NCard key={i} style={{ marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.xs, color: theme.primary }}>{visit.date}</Text>
 <Text style={{ fontSize: FS.md, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left', marginVertical: SP.xs }}>{visit.diagnosis}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
 {visit.type === 'video' ? '' : visit.type === 'clinic' ? '' : ''} {visit.doctor}
 </Text>
 </NCard>
 ))}
 </View>
 )}
 </NScroll>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// NO-SHOW MANAGEMENT SCREEN
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// WALLET TAB
// ══════════════════════════════════════════════════════════════════════════════
function DoctorWalletTab({ onNavigate }: { onNavigate: (s: string) => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  
  const [wallet, setWallet] = useState({ available: 0, escrow: 0, dues: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await client.get('/provider/wallet');
        if (res.data) setWallet(res.data);
        const txRes = await client.get('/provider/wallet/transactions');
        setTransactions(txRes.data || []);
      } catch (err) { 
        setWallet({ available: 0, escrow: 0, dues: 0 });
        setTransactions([]);
      }
    };
    fetchWallet();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>
          {AR ? 'المحفظة والإيرادات' : 'Wallet & Revenue'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }}>
        <NStatCard label={AR ? 'الرصيد المتاح للسحب' : 'Available for Withdrawal'} value={`${wallet.available} SAR`} icon="wallet" />
        <NStatCard label={AR ? 'مبالغ معلقة التأمين' : 'Insurance Escrow'} value={`${wallet.escrow} SAR`} icon="shield" color={theme.warn} />
        <NStatCard label={AR ? 'مستحقات المنصة / المديونية' : 'Nabdah Dues'} value={`${wallet.dues} SAR`} icon="info" color={theme.danger} />
        
        <NBtn label={AR ? 'طلب سحب رصيد' : 'Withdraw Funds'} icon="money" onPress={() => onNavigate('withdrawal_workflow')} style={{ marginTop: SP.md }} />
        <NBtn label={AR ? 'التقارير والإحصائيات' : 'Revenue Insights & Reports'} variant="outline" onPress={() => onNavigate('revenue_insights')} style={{ marginTop: SP.sm }} />
        
        <NCard style={{ marginTop: SP.xl, backgroundColor: theme.infoBg }}>
          <Text style={{ fontSize: FS.sm, color: theme.info, textAlign: AR ? 'right' : 'left', lineHeight: 20 }}>
            {AR ? 'عمولة المنصة: 15% من كل معاملة يتم تحصيلها نقداً أو عبر التأمين.\nيتم إيقاف الحساب تلقائياً إذا تجاوزت المديونية -500 ريال.' : 'Platform commission: 15% per transaction.\nAccount is automatically suspended if dues exceed -500 SAR.'}
          </Text>
        </NCard>

        <View style={{ marginTop: SP.xl }}>
          <NSecHeader title={AR ? 'سجل العمليات الأخير' : 'Recent Transactions'} />
        </View>
        {transactions.map(tx => (
          <NCard key={tx.id} style={{ marginBottom: SP.sm }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, alignItems: AR ? 'flex-end' : 'flex-start' }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.semi, color: theme.text }}>{tx.title}</Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4 }}>{tx.date}</Text>
              </View>
              <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: tx.type === 'CREDIT' ? theme.success : theme.danger }}>
                {tx.type === 'CREDIT' ? '+' : ''}{tx.amount} {AR ? 'ر' : 'SAR'}
              </Text>
            </View>
          </NCard>
        ))}
        {transactions.length === 0 && (
          <NEmpty title={AR ? 'لا توجد عمليات' : 'No Transactions'} sub={AR ? 'لم تقم بأي عمليات مالية بعد' : 'You have no financial transactions yet.'} icon="wallet" />
        )}
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CHAT TAB — server-backed threads and messages only
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB
// ══════════════════════════════════════════════════════════════════════════════

function DoctorSettingsTab({ onLogout, onNavigate }: { onLogout: () => void, onNavigate: (s: string) => void }) {
  const { theme, mode, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLang } = useLang();
  const { show } = useToast();
  const { user } = useAuth();
  const AR = lang === 'ar';
  
  // Real facility link state (from the authenticated user record).
  const isLinkedToFacility = !!(user as any)?.parent_provider_account_id || !!(user as any)?.parent_facility_id;
  const [facilityName, setFacilityName] = useState<string>('');
  const [invitationsCount, setInvitationsCount] = useState(0);

  // Pricing: persisted server-side per provider.
  const [clinicPrice, setClinicPrice] = useState('');
  const [onlinePrice, setOnlinePrice] = useState('');
  const [homePrice, setHomePrice] = useState('');
  const [clinicActive, setClinicActive] = useState(false);
  const [onlineActive, setOnlineActive] = useState(false);
  const [homeActive, setHomeActive] = useState(false);
  const [pricingLoaded, setPricingLoaded] = useState(false);

  // Real facility permissions: a linked provider keeps only the permissions granted by the facility.
  const grantedPerms: string[] = Array.isArray((user as any)?.permissions) ? (user as any).permissions : [];
  const isPricingLocked = isLinkedToFacility && !grantedPerms.includes('pricing');

  useEffect(() => {
    let active = true;
    client.get('/provider/settings/pricing').then((res) => {
      if (!active) return;
      const pr = res.data?.pricing;
      if (pr) {
        setClinicPrice(pr.price_clinic != null ? String(pr.price_clinic) : '');
        setOnlinePrice(pr.price_online != null ? String(pr.price_online) : '');
        setHomePrice(pr.price_home != null ? String(pr.price_home) : '');
        setClinicActive(!!pr.active_clinic);
        setOnlineActive(!!pr.active_online);
        setHomeActive(!!pr.active_home);
      }
    }).catch(() => {}).finally(() => { if (active) setPricingLoaded(true); });
    client.get('/hospital/invitations/inbox').then((res) => {
      if (!active) return;
      const list = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setInvitationsCount(list.filter((i: any) => i.status === 'pending').length);
      const accepted = list.find((i: any) => i.status === 'accepted' && i.facility_name);
      if (accepted) setFacilityName(accepted.facility_name);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const requestDeltaUpdate = async () => {
    try {
      const pricing = {
        price_clinic: clinicPrice !== '' ? Number(clinicPrice) : null,
        price_online: onlinePrice !== '' ? Number(onlinePrice) : null,
        price_home: homePrice !== '' ? Number(homePrice) : null,
        active_clinic: clinicActive, active_online: onlineActive, active_home: homeActive,
      };
      await client.post('/provider/settings/delta', { newData: pricing });
      await client.put('/provider/settings/pricing', { pricing }).catch(() => {});
      show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending Admin Approval for Settings Delta', 'info');
    } catch (err) {
      show(AR ? 'فشل إرسال التعديل' : 'Failed to push delta', 'error');
    }
  };

  const [unlinking, setUnlinking] = useState(false);
  const handleUnlink = async () => {
    if (unlinking) return;
    setUnlinking(true);
    try {
      await client.post('/hospital/leave-facility');
      show(AR ? 'تم إنهاء الارتباط بالمنشأة' : 'Facility link ended', 'success');
    } catch (e: any) {
      show(e?.response?.data?.message === 'not_linked_to_facility'
        ? (AR ? 'لا يوجد ارتباط حالي بمنشأة' : 'No active facility link')
        : (AR ? 'تعذر إنهاء الارتباط' : 'Could not leave facility'), 'error');
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'الإعدادات' : 'Settings'} />
      <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }}>
        
        {/* ── Facility Link ────────────────────────────────────────── */}
        {isLinkedToFacility ? (
          <NCard style={{ backgroundColor: theme.infoBg, borderColor: theme.info, borderWidth: 1 }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
              <Text style={{ fontSize: 24 }}>🏛️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.info, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? 'مرتبط بمنشأة' : 'Linked to Facility'}
                </Text>
                <Text style={{ fontSize: FS.xs, color: theme.info, textAlign: AR ? 'right' : 'left' }}>
                  {facilityName
                    ? (AR ? `تعمل حالياً ضمن طاقم ${facilityName}` : `Currently working under ${facilityName}`)
                    : (AR ? 'أنت مرتبط حالياً بمنشأة طبية' : 'You are currently linked to a medical facility')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleUnlink} style={{ marginTop: SP.md, alignSelf: AR ? 'flex-start' : 'flex-end' }}>
              <Text style={{ color: theme.danger, fontWeight: FW.bold, fontSize: FS.xs }}>
                {AR ? 'إنهاء الارتباط' : 'Leave Facility'}
              </Text>
            </TouchableOpacity>
          </NCard>
        ) : (
          <NSettingsRow icon="document" label={AR ? `دعوات المنشآت (${invitationsCount})` : `Facility Invitations (${invitationsCount})`} onPress={() => onNavigate('facility_invitations')} />
        )}

        {/* ── Appearance & Language ─────────────────────────────────── */}
        <NSecHeader title={AR ? 'المظهر واللغة' : 'Appearance & Language'} />
        <NCard style={{ gap: SP.lg }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
              <I name={mode === 'dark' ? 'moon' : 'sun'} size={20} color={theme.primary} />
              <Text style={{ fontSize: FS.md, color: theme.text }}>
                {AR ? (mode === 'dark' ? 'الوضع الليلي' : 'الوضع النهاري') : (mode === 'dark' ? 'Dark Mode' : 'Light Mode')}
              </Text>
            </View>
            <Switch value={mode === 'dark'} onValueChange={toggleTheme} trackColor={{ true: theme.primary }} />
          </View>
          <NDivider />
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
              <I name="globe" size={20} color={theme.primary} />
              <Text style={{ fontSize: FS.md, color: theme.text }}>
                {AR ? 'اللغة: العربية' : 'Language: English'}
              </Text>
            </View>
            <TouchableOpacity onPress={toggleLang}
              style={{ paddingHorizontal: SP.lg, paddingVertical: SP.sm, backgroundColor: theme.primaryLight, borderRadius: R.md }}>
              <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{AR ? 'EN' : 'عربي'}</Text>
            </TouchableOpacity>
          </View>
        </NCard>

        {/* ── Services & Pricing ────────────────────────────────────── */}
        <NSecHeader title={AR ? 'إعدادات الحساب' : 'Account'} />
        <NCard style={{ marginBottom: SP.lg }}>
          <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, marginBottom: SP.sm, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'الخدمات المقدمة والأسعار' : 'Services & Pricing'}
          </Text>
          
          <View style={{ gap: SP.md, opacity: isPricingLocked ? 0.6 : 1 }} pointerEvents={isPricingLocked ? 'none' : 'auto'}>
            {isPricingLocked && (
              <Text style={{ fontSize: FS.xs, color: theme.danger, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>
                {AR ? 'الأسعار والخدمات مقفلة ومتحكم بها من قبل المنشأة (مستشفى نبضة الطبي)' : 'Pricing and services are locked and managed by the facility'}
              </Text>
            )}
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
                <Switch value={clinicActive} onValueChange={setClinicActive} trackColor={{ true: theme.primary }} />
                <Text style={{ color: theme.text, fontSize: FS.sm }}>{AR ? 'كشف العيادة' : 'Clinic Visit'}</Text>
              </View>
              <NInput label="" value={clinicPrice} onChange={setClinicPrice} kbType="numeric" style={{ width: 80, marginVertical: 0 }} editable={clinicActive} />
            </View>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
                <Switch value={onlineActive} onValueChange={setOnlineActive} trackColor={{ true: theme.primary }} />
                <Text style={{ color: theme.text, fontSize: FS.sm }}>{AR ? 'استشارة أونلاين' : 'Online Consult'}</Text>
              </View>
              <NInput label="" value={onlinePrice} onChange={setOnlinePrice} kbType="numeric" style={{ width: 80, marginVertical: 0 }} editable={onlineActive} />
            </View>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
                <Switch value={homeActive} onValueChange={setHomeActive} trackColor={{ true: theme.primary }} />
                <Text style={{ color: theme.text, fontSize: FS.sm }}>{AR ? 'زيارة منزلية' : 'Home Visit'}</Text>
              </View>
              <NInput label="" value={homePrice} onChange={setHomePrice} kbType="numeric" style={{ width: 80, marginVertical: 0 }} editable={homeActive} />
            </View>
          </View>
          
          {!isPricingLocked && <NBtn label={AR ? 'حفظ التعديلات' : 'Save Changes'} onPress={requestDeltaUpdate} style={{ marginTop: SP.md }} />}
        </NCard>

        {/* ── Profile & Configuration ───────────────────────────────── */}
        <NSecHeader title={AR ? 'الملف الشخصي والإعدادات' : 'Profile & Config'} />
        <NSettingsRow icon="user" label={AR ? 'تعديل الملف الشخصي' : 'Edit Profile'} onPress={() => onNavigate('profile_edit')} />
        <NSettingsRow icon="mapPin" label={AR ? 'الموقع ونطاق التغطية' : 'Location & Coverage'} onPress={() => onNavigate('location_config')} />
        <NSettingsRow icon="calendar" label={AR ? 'مواعيد العمل (Scheduler)' : 'Availability Engine'} onPress={() => onNavigate('availability_engine')} />
        <NSettingsRow icon="shield" label={AR ? 'شركات التأمين' : 'Insurance Config'} onPress={() => onNavigate('insurance_config')} />
       <NSettingsRow icon="shield" label={AR ? 'طلبات التأمين الواردة' : 'Insurance Requests'} onPress={() => onNavigate('insurance_requests')} />
        <GlobalSystemSettings />
        
        <NBtn label={AR ? 'تسجيل الخروج' : 'Logout'} onPress={onLogout} variant="outline" style={{ borderColor: theme.danger, marginTop: SP.lg }} labelStyle={{ color: theme.danger }} />
      </ScrollView>
    </View>
  );
}
export function InsuranceClaimScreen({ apt, onBack }: { apt: any; onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [company, setCompany] = useState('');
 const [plan, setPlan] = useState('');
 const [diagCode, setDiagCode] = useState('');
 const [policyNumber, setPolicyNumber] = useState(apt?.patient?.insurance?.policy_number || '');
 const [memberId, setMemberId] = useState(apt?.patient?.insurance?.member_id || '');
 const [amount, setAmount] = useState('');
 const [deductible, setDeduct] = useState('');
 const [loading, setLoading] = useState(false);

 const net = amount && deductible
 ? Math.max(0, parseFloat(amount) - parseFloat(deductible)).toFixed(2)
 : '';

 return (
 <NScroll>
 <NHeader title={AR ? ' مطالبة تأمين' : ' Insurance Claim'} onBack={onBack} />

 <NCard style={{ marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text,
 marginBottom: SP.lg, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'بيانات التأمين' : 'Insurance Details'}
 </Text>

 {/* Company selector */}
 <View style={{ marginBottom: SP.lg }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'شركة التأمين' : 'Insurance Company'}<Text style={{ color: theme.danger }}> *</Text>
 </Text>
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
 <View style={{ flexDirection: 'row', gap: SP.sm }}>
 {['Bupa','Tawuniya','MedGulf','Malath','AXA'].map(c => (
 <TouchableOpacity key={c} onPress={() => setCompany(c)}
 style={[styles.insChip, {
 backgroundColor: company === c ? theme.primary : theme.surface2,
 borderColor: company === c ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: company === c ? '#FFF' : theme.text, fontSize: FS.sm }}>{c}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </ScrollView>
 </View>

 {/* Plan */}
 <View style={{ marginBottom: SP.lg }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'فئة الخطة' : 'Plan Category'}
 </Text>
 <View style={{ flexDirection: 'row', gap: SP.sm }}>
 {['VIP+','VIP','A','B','C'].map(p => (
 <TouchableOpacity key={p} onPress={() => setPlan(p)}
 style={[styles.insChip, {
 backgroundColor: plan === p ? theme.info : theme.surface2,
 borderColor: plan === p ? theme.info : theme.border,
 }]}>
 <Text style={{ color: plan === p ? '#FFF' : theme.text, fontWeight: FW.bold, fontSize: FS.sm }}>{p}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </View>

 <NInput
 label={AR ? 'كود التشخيص ICD-10' : 'Diagnosis Code ICD-10'}
 placeholder="J06.9"
 value={diagCode} onChange={setDiagCode} icon=""
 hint={AR ? 'الكود الدولي لتصنيف الأمراض' : 'International Classification of Diseases code'}
 />

 <NInput
 label={AR ? 'رقم الوثيقة' : 'Policy Number'}
 placeholder="POL-123456"
 value={policyNumber} onChange={setPolicyNumber} icon=""
 />
 <NInput
 label={AR ? 'رقم العضوية' : 'Member ID'}
 placeholder="MEM-987654"
 value={memberId} onChange={setMemberId} icon=""
 />

 <NPriceInput
 label={AR ? 'إجمالي المبلغ المطلوب' : 'Total Claimed Amount'}
 value={amount} onChange={setAmount} required
 />
 <NPriceInput
 label={AR ? 'التحمّل على المريض (Deductible)' : 'Patient Deductible'}
 value={deductible} onChange={setDeduct}
 />

 {net && (
 <NCard style={{ backgroundColor: theme.successBg, padding: SP.lg }}>
 <Text style={{ fontSize: FS.sm, color: theme.success, textAlign: AR ? 'right' : 'left' }}>
 {AR ? ` صافي المطالبة للتأمين: ${net} ريال` : ` Net insurance claim: ${net} SAR`}
 </Text>
 </NCard>
 )}
 </NCard>

 <NBtn
 label={AR ? ' إرسال المطالبة' : ' Submit Claim'}
 disabled={!company || !amount}
 loading={loading}
 onPress={async () => {
 setLoading(true);
 try {
 if (!apt?.id) throw new Error(AR ? 'لم يتم العثور على موعد الجلسة' : 'Appointment ID not found');
 await client.post(`/provider/jobs/consultation/${apt.id}/insurance`, {
 policyNumber: policyNumber.trim() || undefined,
 memberId: memberId.trim() || undefined,
 diagnosisCode: diagCode.trim() || undefined,
 insuranceCompany: company,
 planCategory: plan || undefined,
 approvalStatus: 'APPROVED',
 coveragePercentage: amount && deductible && parseFloat(amount) > 0 ? Math.round((1 - parseFloat(deductible) / parseFloat(amount)) * 100) : 80,
 coveredAmount: parseFloat(amount) - (parseFloat(deductible) || 0),
 copayAmount: parseFloat(deductible) || 0,
 patientShare: parseFloat(deductible) || 0,
 insuranceShare: parseFloat(amount) - (parseFloat(deductible) || 0),
 });
 show(AR ? 'تم إرسال المطالبة بنجاح ' : 'Claim submitted successfully ', 'success');
 onBack();
 } catch (e: any) {
 show(e.message || (AR ? 'فشل إرسال المطالبة' : 'Failed to submit claim'), 'error');
 } finally {
 setLoading(false);
 }
 }}
 />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// MEDICAL REPORT WRITER
// ══════════════════════════════════════════════════════════════════════════════
export function MedicalReportScreen({ apt, onBack }: { apt: any; onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [type, setType] = useState('');
 const [findings, setFindings] = useState('');
 const [conclusion, setConclusion] = useState('');
 const [recs, setRecs] = useState('');

 const REPORT_TYPES = [
 { ar: 'تقرير طبي عام', en: 'General Medical Report' },
 { ar: 'تقرير للعمل/الدراسة', en: 'Work / Study Report' },
 { ar: 'تقرير لتأمين السفر', en: 'Travel Insurance Report' },
 { ar: 'تقرير متابعة مزمن', en: 'Chronic Follow-up' },
 { ar: 'تقرير عيادي مفصّل', en: 'Detailed Clinical Report' },
 ];

 return (
 <NScroll>
 <NHeader title={AR ? ' كتابة تقرير طبي' : ' Medical Report'} onBack={onBack} />

 <NCard style={{ marginBottom: SP.xl, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <NAvatar name={apt?.patient ?? 'مريض'} size={44} />
 <View>
 <Text style={{ fontWeight: FW.bold, color: theme.text }}>{apt?.patient ?? '—'}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{new Date().toLocaleDateString('ar-SA')}</Text>
 </View>
 </NCard>

 <View style={{ marginBottom: SP.lg }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'نوع التقرير' : 'Report Type'}<Text style={{ color: theme.danger }}> *</Text>
 </Text>
 {REPORT_TYPES.map((t, i) => (
 <TouchableOpacity key={i} onPress={() => setType(AR ? t.ar : t.en)}
 style={[styles.rTypeRow, {
 backgroundColor: type === (AR ? t.ar : t.en) ? theme.primaryLight : theme.surface2,
 borderColor: type === (AR ? t.ar : t.en) ? theme.primary : theme.border,
 }]}>
 <Text style={{
 flex: 1, color: type === (AR ? t.ar : t.en) ? theme.primary : theme.text,
 fontWeight: type === (AR ? t.ar : t.en) ? FW.bold : FW.reg,
 textAlign: AR ? 'right' : 'left',
 }}>{AR ? t.ar : t.en}</Text>
 {type === (AR ? t.ar : t.en) && <Text style={{ color: theme.primary }}></Text>}
 </TouchableOpacity>
 ))}
 </View>

 <NInput
 label={AR ? 'النتائج السريرية' : 'Clinical Findings'}
 placeholder={AR ? 'اذكر الأعراض والفحوصات والنتائج...' : 'State symptoms, examinations and findings...'}
 value={findings} onChange={setFindings} multi lines={5} icon="" required
 />
 <NInput
 label={AR ? 'الاستنتاج والتشخيص' : 'Conclusion & Diagnosis'}
 placeholder={AR ? 'التشخيص النهائي...' : 'Final diagnosis...'}
 value={conclusion} onChange={setConclusion} multi lines={3} icon=""
 />
 <NInput
 label={AR ? 'التوصيات والعلاج' : 'Recommendations & Treatment'}
 placeholder={AR ? 'العلاج والتوصيات...' : 'Treatment and recommendations...'}
 value={recs} onChange={setRecs} multi lines={3} icon=""
 />

 <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.info, textAlign: AR ? 'right' : 'left' }}>
  {AR
 ? 'التقرير الطبي موقّع بتوقيع رقمي وبرمز QR موثّق من وزارة الصحة.'
 : 'Medical report is digitally signed with MOH-verified QR code.'}
 </Text>
 </NCard>

 <NBtn
 label={AR ? ' إصدار التقرير الطبي' : ' Issue Medical Report'}
 disabled={!type || !findings.trim()}
 onPress={async () => {
   try {
     if (!apt?.id || !apt?.patient_id) {
       show(AR ? 'لا يمكن إصدار التقرير دون حجز ومريض مرتبطين' : 'Cannot issue a report without a linked appointment and patient', 'error');
       return;
     }
     await client.post(`/provider/requests/${apt.id}/medical-report`, {
       patient_id: apt.patient_id,
       type, findings, conclusion, recommendations: recs
     });
     show(AR ? 'تم إصدار التقرير الطبي ' : 'Report issued ', 'success');
     onBack();
   } catch (err) {
     show(AR ? 'حدث خطأ' : 'Failed to issue report', 'error');
   }
 }}
 />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS CENTER
// ══════════════════════════════════════════════════════════════════════════════
export function NotificationsScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const AR = lang === 'ar';
 const [filter, setFilter] = useState<'all'|'unread'|'requests'|'payments'|'radiology_results'>('all');

 const [NOTIFS, setNOTIFS] = useState<any[]>([]);
  useEffect(() => {
    client.get('/provider/notifications').then(res => {
      setNOTIFS((res.data || []).map((n: any) => ({
        id: n.id || n._id,
        type: n.type?.toLowerCase().includes('radiology') ? 'radiology_result' : n.type?.toLowerCase().includes('payment') ? 'payment' : n.type?.toLowerCase().includes('system') ? 'system' : n.type?.toLowerCase().includes('review') ? 'review' : 'request',
        icon: n.type?.toLowerCase().includes('radiology') ? 'document-text' : n.type?.toLowerCase().includes('payment') ? 'cash' : 'notifications',
        ar: n.message_ar || n.message,
        en: n.message_en || n.message,
        time: new Date(n.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        unread: !n.read,
        metadata: n.metadata
      })));
    }).catch(() => {});
  }, []);

 const [DOCTORS, setDOCTORS] = useState<any[]>([]);
  useEffect(() => {
    client.get('/provider/directory')
      .then(res => setDOCTORS(res.data || []))
      .catch(() => {});
  }, []);

 const filters = [
 { k:'all', ar:'الكل', en:'All' },
 { k:'unread', ar:'غير مقروء',en:'Unread' },
 { k:'requests', ar:'طلبات', en:'Requests'},
 { k:'payments', ar:'مدفوعات', en:'Payments'},
 { k:'radiology_results', ar:'نتائج الأشعة', en:'Results'},
 ] as const;

 const filtered = filter === 'all' ? NOTIFS
 : filter === 'unread' ? NOTIFS.filter(n => n.unread)
 : filter === 'radiology_results' ? NOTIFS.filter(n => n.type === 'radiology_result')
 : NOTIFS.filter(n => n.type === filter.replace('s',''));

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
 <TouchableOpacity onPress={onBack}>
 <Text style={{ color: theme.primary, fontSize: FS.md }}>{AR ? '→' : '←'}</Text>
 </TouchableOpacity>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center' }}>
 <I name="bell" size={24} color={theme.text} /> {AR ? 'الإشعارات' : 'Notifications'}
 </Text>
 <TouchableOpacity onPress={async () => {
   try {
     await client.post('/provider/notifications/read-all', {});
     setNOTIFS((prev) => prev.map((n) => ({ ...n, unread: false })));
   } catch {
     show(AR ? 'تعذر مسح الإشعارات' : 'Could not clear notifications', 'error');
   }
 }}>
 <Text style={{ fontSize: FS.sm, color: theme.primary }}>{AR ? 'مسح الكل' : 'Clear All'}</Text>
 </TouchableOpacity>
 </View>

 <ScrollView horizontal showsHorizontalScrollIndicator={false}
 contentContainerStyle={{ paddingHorizontal: SP.lg, paddingVertical: SP.md, gap: SP.sm }}>
 {filters.map(f => (
 <TouchableOpacity key={f.k} onPress={() => setFilter(f.k as any)}
 style={[styles.filterChip2, {
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
 <TouchableOpacity onPress={() => {
    if (item.type === 'radiology_result' && item.metadata?.pdfUrl) {
      import('react-native').then(({ Linking }) => {
        if (typeof window !== 'undefined' && window.open) window.open(item.metadata.pdfUrl, '_blank');
        else Linking.openURL(item.metadata.pdfUrl);
      });
    }
 }}>
 <View style={[styles.notifRow, {
 backgroundColor: item.unread ? theme.primaryLight : theme.card,
 borderColor: item.unread ? theme.primary : theme.border,
 flexDirection: AR ? 'row-reverse' : 'row',
 }]}>
 <View style={[styles.notifIcon, { backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }]}>
 <I name={item.icon as any} size={20} color={item.unread ? theme.primary : theme.textSub} />
 </View>
 <View style={{ flex: 1 }}>
 <Text style={{
 fontSize: FS.md, color: theme.text,
 fontWeight: item.unread ? FW.bold : FW.reg,
 textAlign: AR ? 'right' : 'left',
 }} numberOfLines={2}>
 {AR ? item.ar : item.en}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 2 }}>
 {item.time}
 </Text>
 </View>
 {item.unread && (
 <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary, alignSelf: 'center' }} />
 )}
 </View>
 </TouchableOpacity>
 )}
 ItemSeparatorComponent={() => <View style={{ height: SP.sm }} />}
 />
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// CALENDAR SYNC SCREEN
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// AVAILABILITY PULSE SCREEN (ميزة تنافسية — غير موجودة عند المنافسين)
// ══════════════════════════════════════════════════════════════════════════════
export function AvailabilityPulseScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
  const [pulseOn, setPulse] = useState(false);
 const [minutes, setMinutes] = useState('5');
 const [saving, setSaving] = useState(false);
 const pulseAnim = useRef(new Animated.Value(1)).current;
 useEffect(() => {
   let active = true;
   client.get('/provider/profile/availability').then((response) => {
     if (!active || !response.data) return;
     setPulse(Boolean(response.data.instant_available));
     if (response.data.instant_available_minutes) setMinutes(String(response.data.instant_available_minutes));
   }).catch(() => {
     if (active) show(AR ? 'تعذر تحميل حالة التوفر' : 'Unable to load availability state', 'error');
   });
   return () => { active = false; };
 }, [AR, show]);
 useEffect(() => {
 if (!pulseOn) return;
 const loop = Animated.loop(Animated.sequence([
 Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
 Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
 ]));
 loop.start();
 return () => loop.stop();
 }, [pulseOn]);

 return (
 <NScroll>
 <NHeader title={AR ? ' نبضة التوفر الفوري' : ' Availability Pulse'} onBack={onBack} />

 <NCard style={{ backgroundColor: theme.primaryLight, marginBottom: SP.xl, alignItems: 'center', padding: SP.xxl }}>
 <Animated.View style={{ transform: [{ scale: pulseOn ? pulseAnim : 1 }] }}>
 <View style={{
 width: 80, height: 80, borderRadius: 40,
 backgroundColor: pulseOn ? theme.primary : theme.surface2,
 alignItems: 'center', justifyContent: 'center',
 marginBottom: SP.lg,
 }}>
 <Text style={{ fontSize: 36 }}>{pulseOn ? '' : ''}</Text>
 </View>
 </Animated.View>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text, textAlign: 'center' }}>
 {pulseOn
 ? (AR ? `متاح الآن خلال ${minutes} دقيقة` : `Available within ${minutes} min`)
 : (AR ? 'النبضة معطّلة' : 'Pulse Off')}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', marginTop: SP.xs }}>
 {AR
 ? 'يظهر للمرضى في التطبيق بأنك متاح بشكل فوري'
 : 'Patients see you are instantly available right now'}
 </Text>
 </NCard>

 <NCard style={{ marginBottom: SP.xl }}>
 <NToggle
 label={AR ? ' تفعيل نبضة التوفر الفوري' : ' Enable Availability Pulse'}
 sub={AR ? 'يخبر المرضى بتوفرك الفوري ويزيد الطلب' : 'Tells patients you are available now — boosts demand'}
 value={pulseOn} onChange={v => {
 setPulse(v);
 show(v ? (AR ? 'نبضة التوفر مفعّلة ' : 'Pulse activated ') : (AR ? 'نبضة التوفر معطّلة' : 'Pulse off'), v ? 'success' : 'info');
 }}
 />

 {pulseOn && (
 <View style={{ marginTop: SP.lg }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'متاح خلال:' : 'Available within:'}
 </Text>
 <View style={{ flexDirection: 'row', gap: SP.sm }}>
 {['2','5','10','15','30'].map(m => (
 <TouchableOpacity key={m} onPress={() => setMinutes(m)}
 style={[styles.insChip, {
 backgroundColor: minutes === m ? theme.primary : theme.surface2,
 borderColor: minutes === m ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: minutes === m ? '#FFF' : theme.text, fontWeight: FW.semi }}>
 {m} {AR ? 'دق' : 'min'}
 </Text>
 </TouchableOpacity>
 ))}
 </View>
 </View>
 )}
 </NCard>

  <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.info, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
  {AR ? 'لا يتم إعلان توفر فوري للمريض قبل حفظ هذا الإعداد في الخادم.' : 'Patients are not shown instant availability until this setting is saved on the server.'}
 </Text>
 </NCard>
 <NBtn label={AR ? ' حفظ' : ' Save'} loading={saving}
 onPress={async () => {
   setSaving(true);
   try {
     await client.patch('/provider/profile/availability', { instant_available: pulseOn, instant_available_minutes: Number(minutes) });
     show(AR ? 'تم حفظ حالة التوفر' : 'Availability saved', 'success');
     onBack();
   } catch (error: any) {
     show(error?.response?.data?.message || (AR ? 'تعذر حفظ حالة التوفر' : 'Unable to save availability'), 'error');
   } finally { setSaving(false); }
 }} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFESSIONAL NETWORK (Doximity-style — ميزة تنافسية)
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// DOCTOR SERVICE MANAGEMENT SCREEN (Real API version)
// ══════════════════════════════════════════════════════════════════════════════
const MODE_MAP: Record<string, any> = {
 video: {
 nameAr: 'استشارة فيديو',
 nameEn: 'Video Consult',
 descAr: 'استشارة طبية عن بعد عبر مكالمة فيديو عالية الدقة',
 descEn: 'Telehealth medical consult via high-def video call'
 },
 voice: {
 nameAr: 'استشارة صوتية',
 nameEn: 'Audio Consult',
 descAr: 'استشارة طبية صوتية سريعة',
 descEn: 'Quick audio-only medical consultation'
 },
 clinic: {
 nameAr: 'كشف عيادة',
 nameEn: 'Clinic Visit',
 descAr: 'زيارة وحجز موعد بالعيادة الخاصة بالطبيب',
 descEn: 'In-person clinic visit at doctor\'s practice'
 },
 home: {
 nameAr: 'زيارة منزلية',
 nameEn: 'Home Visit',
 descAr: 'زيارة منزلية مخصصة للحالات المناسبة',
 descEn: 'Direct home visit for eligible patients'
 },
 chat: {
 nameAr: 'استشارة دردشة',
 nameEn: 'Chat Consult',
 descAr: 'استشارة طبية سريعة عبر المحادثة الفورية',
 descEn: 'Fast medical consultation via instant messaging'
 }
};

export function DoctorServiceManagementScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [loading, setLoading] = useState(true);
 const [services, setServices] = useState<any[]>([]);

 const [showAddSheet, setShowAddSheet] = useState(false);
 const [newTitleAr, setNewTitleAr] = useState('');
 const [newTitleEn, setNewTitleEn] = useState('');
 const [newPrice, setNewPrice] = useState('');
 const [newDuration, setNewDuration] = useState('30');
 const [newDescAr, setNewDescAr] = useState('');
 const [newDescEn, setNewDescEn] = useState('');

 const [editingService, setEditingService] = useState<any | null>(null);
 const [editPrice, setEditPrice] = useState('');
 const [editDuration, setEditDuration] = useState('');

 const fetchServices = async () => {
 try {
 const res = await client.get('/provider/capabilities/doctor-sessions');
 const parsed = (res.data || []).map((item: any) => {
 const mode = item.consultation_type;
 const modeInfo = MODE_MAP[mode] || {
 nameAr: item.specialty || 'خدمة مخصصة',
 nameEn: item.specialty || 'Custom Service',
 descAr: 'خدمة مخصصة للطبيب',
 descEn: 'Custom service'
 };
 return {
 id: item.id || item._id,
 consultation_type: item.consultation_type,
 specialty: item.specialty,
 nameAr: modeInfo.nameAr,
 nameEn: modeInfo.nameEn,
 descAr: modeInfo.descAr,
 descEn: modeInfo.descEn,
 price: item.price,
 duration: item.duration_minutes,
 active: item.available,
 insurance_covered: item.insurance_covered === true,
 };
 });
 setServices(parsed);
 } catch (e) {
 // Silent log skip
 show(AR ? 'فشل تحميل الخدمات والأسعار من السيرفر' : 'Failed to load services and prices from server', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchServices();
 }, []);

 const toggleService = async (id: string, currentActive: boolean) => {
 try {
 const srv = services.find(s => s.id === id);
 if (!srv) return;
 
 const payload = {
 consultation_type: srv.consultation_type,
 specialty: srv.specialty || 'General Medicine',
 price: srv.price,
 duration_minutes: srv.duration,
 available: !currentActive
 };
 
 await client.post('/provider/capabilities/doctor-sessions', payload);
 show(AR ? 'تم الإرسال — تُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
 fetchServices();
 } catch (e) {
 show(AR ? 'فشل تحديث حالة الخدمة' : 'Failed to update service status', 'error');
 }
 };

 const toggleCoverage = async (id: string, current: boolean) => {
 try {
 const srv = services.find(s => s.id === id);
 if (!srv) return;
 await client.post('/provider/capabilities/doctor-sessions', {
 consultation_type: srv.consultation_type,
 specialty: srv.specialty || 'General Medicine',
 price: srv.price,
 duration_minutes: srv.duration,
 available: srv.active,
 insurance_covered: !current,
 });
 show(AR ? 'تم الإرسال — تُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
 fetchServices();
 } catch (e) {
 show(AR ? 'فشل تحديث التغطية' : 'Failed to update coverage', 'error');
 }
 };

 const handleAddService = async () => {
 if (!newPrice) {
 show(AR ? 'يرجى إدخال السعر' : 'Please enter price', 'error');
 return;
 }
 try {
 const rawType = newTitleEn.toLowerCase().includes('video') ? 'video'
 : newTitleEn.toLowerCase().includes('voice') || newTitleEn.toLowerCase().includes('audio') ? 'voice'
 : newTitleEn.toLowerCase().includes('clinic') ? 'clinic'
 : newTitleEn.toLowerCase().includes('home') ? 'home'
 : 'chat';
 
 const payload = {
 consultation_type: rawType,
 specialty: 'General Medicine',
 price: parseFloat(newPrice) || 0,
 duration_minutes: parseInt(newDuration) || 30,
 available: true
 };
 
 await client.post('/provider/capabilities/doctor-sessions', payload);
 fetchServices();
 setShowAddSheet(false);
 setNewTitleAr('');
 setNewTitleEn('');
 setNewPrice('');
 setNewDuration('30');
 show(AR ? 'تم الإرسال — تُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
 } catch (e) {
 show(AR ? 'فشل إضافة الخدمة' : 'Failed to add service', 'error');
 }
 };

 const handleDeleteService = async (id: string) => {
 try {
 await client.delete(`/provider/capabilities/doctor-sessions/${id}`);
 fetchServices();
 show(AR ? 'تم الإرسال — يُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
 } catch (e) {
 show(AR ? 'فشل حذف الخدمة' : 'Failed to delete service', 'error');
 }
 };

 const openEdit = (srv: any) => {
 setEditingService(srv);
 setEditPrice(String(srv.price));
 setEditDuration(String(srv.duration));
 };

 const saveEdit = async () => {
 if (!editingService) return;
 try {
 const payload = {
 consultation_type: editingService.consultation_type,
 specialty: editingService.specialty || 'General Medicine',
 price: parseFloat(editPrice) || 0,
 duration_minutes: parseInt(editDuration) || 30,
 available: editingService.active
 };
 
 await client.post('/provider/capabilities/doctor-sessions', payload);
 fetchServices();
 setEditingService(null);
 show(AR ? 'تم الإرسال — تُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
 } catch (e) {
 show(AR ? 'فشل حفظ التعديلات' : 'Failed to save changes', 'error');
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? ' إدارة الخدمات والأسعار' : ' Service Management'} onBack={onBack} />
 {loading ? (
 <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: SP.xxl }} />
 ) : (
 <ScrollView contentContainerStyle={{ padding: SP.xl, paddingBottom: 100 }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.textSub }}>
 {AR ? 'الخدمات المتاحة' : 'Available Services'}
 </Text>
 <TouchableOpacity onPress={() => setShowAddSheet(true)} style={{ backgroundColor: theme.primary, paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.md }}>
 <Text style={{ color: '#FFF', fontWeight: FW.bold }}> {AR ? 'إضافة خدمة' : 'Add Service'}</Text>
 </TouchableOpacity>
 </View>

 {services.map(s => (
 <NCard key={s.id} style={{ marginBottom: SP.lg, borderColor: s.active ? theme.primary : theme.border }} accent={s.active ? theme.primary : undefined}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
 <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>
 {AR ? s.nameAr : s.nameEn}
 </Text>
 <Switch value={s.active} onValueChange={() => toggleService(s.id, s.active)} trackColor={{ true: theme.primary }} />
 </View>

 <TouchableOpacity onPress={() => toggleCoverage(s.id, !!s.insurance_covered)} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm, marginBottom: SP.sm }}>
 <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: s.insurance_covered ? theme.success : theme.border, backgroundColor: s.insurance_covered ? theme.success : 'transparent' }} />
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? 'تُغطى بالتأمين' : 'Covered by insurance'}</Text>
 </TouchableOpacity>
 
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
 {AR ? s.descAr : s.descEn}
 </Text>
 
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.text, fontWeight: FW.bold }}>
  {s.price} {AR ? 'ريال' : 'SAR'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>
 ⏱️ {s.duration} {AR ? 'دقيقة' : 'min'}
 </Text>
 </View>
 
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
 <TouchableOpacity onPress={() => openEdit(s)} style={{ padding: SP.xs }}>
 <Text style={{ color: theme.primary, fontSize: FS.sm }}>️ {AR ? 'تعديل' : 'Edit'}</Text>
 </TouchableOpacity>
 <TouchableOpacity onPress={() => handleDeleteService(s.id)} style={{ padding: SP.xs }}>
 <Text style={{ color: theme.danger, fontSize: FS.sm }}>️ {AR ? 'حذف' : 'Delete'}</Text>
 </TouchableOpacity>
 </View>
 </View>
 </NCard>
 ))}
 </ScrollView>
 )}

 {/* Edit Sheet */}
 <NSheet visible={!!editingService} onClose={() => setEditingService(null)} title={AR ? '️ تعديل الخدمة' : '️ Edit Service'} height={380}>
 <View style={{ padding: SP.md }}>
 <NPriceInput label={AR ? 'سعر الخدمة (SAR)' : 'Service Price (SAR)'} value={editPrice} onChange={setEditPrice} />
 <NInput label={AR ? 'مدة الخدمة بالدقائق' : 'Service Duration (min)'} kbType="numeric" value={editDuration} onChange={setEditDuration} />
 <NBtn label={AR ? ' حفظ' : ' Save'} onPress={saveEdit} style={{ marginTop: SP.md }} />
 </View>
 </NSheet>

 {/* Add Service Sheet */}
 <NSheet visible={showAddSheet} onClose={() => setShowAddSheet(false)} title={AR ? ' إضافة خدمة جديدة' : ' Add Custom Service'} height={580}>
 <ScrollView contentContainerStyle={{ padding: SP.md }}>
 <NInput label={AR ? 'اسم الخدمة (عربي)' : 'Service Name (Arabic)'} value={newTitleAr} onChange={setNewTitleAr} required />
 <NInput label={AR ? 'اسم الخدمة (إنجليزي)' : 'Service Name (English)'} value={newTitleEn} onChange={setNewTitleEn} required />
 <NPriceInput label={AR ? 'سعر الخدمة (SAR)' : 'Service Price (SAR)'} value={newPrice} onChange={setNewPrice} required />
 <NInput label={AR ? 'المدة بالدقائق' : 'Duration (min)'} kbType="numeric" value={newDuration} onChange={setNewDuration} />
 <NInput label={AR ? 'الوصف (عربي)' : 'Description (Arabic)'} value={newDescAr} onChange={setNewDescAr} multi />
 <NInput label={AR ? 'الوصف (إنجليزي)' : 'Description (English)'} value={newDescEn} onChange={setNewDescEn} multi />
 <NBtn label={AR ? ' إضافة الخدمة' : ' Add Service'} onPress={handleAddService} style={{ marginTop: SP.md }} />
 </ScrollView>
 </NSheet>
 </View>
 );
}



// ══════════════════════════════════════════════════════════════════════════════
// STATISTICS & REPORTS SCREEN
// ══════════════════════════════════════════════════════════════════════════════
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
 const BREAKDOWN_COLORS = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336'];
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
 <NStatCard icon="" label={AR?'الإيرادات':'Revenue'} value={STATS.revenue} unit={AR?'ر':'SAR'} color="#4CAF50" style={{ width:'47%' }} />
 <NStatCard icon="" label={AR?'المواعيد':'Appointments'} value={String(STATS.apts)} color="#2196F3" style={{ width:'47%' }} />
 <NStatCard icon="" label={AR?'التقييم':'Rating'} value={String(STATS.rating)} color="#FFC107" style={{ width:'47%' }} />
 <NStatCard icon="" label={AR?'مرضى جدد':'New Patients'} value={String(STATS.newPts)} color="#9C27B0" style={{ width:'47%' }} />
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
function DoctorServiceSlotsCard() {
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

export function DoctorAvailabilityScreen({ onBack, onNavigate }: { onBack: () => void; onNavigate?: (s: string, p?: any) => void }) { const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
  const [saving, setSaving] = useState(false);
 const [loadingAvailability, setLoadingAvailability] = useState(true);
 const [vacationMode, setVacationMode] = useState(false);
 const [weeklySchedule, setWeeklySchedule] = useState<any[]>([]);
 const [exceptions, setExceptions] = useState<any[]>([]);
 useEffect(() => {
   let active = true;
   client.get('/provider/profile/availability').then((response) => {
     if (!active || !response.data) return;
     setVacationMode(Boolean(response.data.vacation_mode));
     setWeeklySchedule(Array.isArray(response.data.weekly_schedule) ? response.data.weekly_schedule : []);
     setExceptions(Array.isArray(response.data.availability_exceptions) ? response.data.availability_exceptions : []);
   }).catch((error: any) => {
     if (active) show(error?.response?.data?.message || (AR ? 'تعذر تحميل إعدادات التوفر' : 'Unable to load availability settings'), 'error');
   }).finally(() => { if (active) setLoadingAvailability(false); });
   return () => { active = false; };
 }, [AR, show]);

 const [showAddException, setShowAddException] = useState(false);
 const [exDate, setExDate] = useState(() => new Date().toISOString().slice(0, 10));
 const [exType, setExType] = useState<'close_day'|'block_time'|'exceptional_open'>('close_day');
 const [exStart, setExStart] = useState('12:00');
 const [exEnd, setExEnd] = useState('14:00');

 const [insurances, setInsurances] = useState([
  { id: 'bupa', ar: 'بوبا العربية', en: 'Bupa Arabia', active: true, copay: '10', tier: 'VIP', clinic: true, online: false, home: false },
  { id: 'tawuniya', ar: 'التعاونية للتأمين', en: 'Tawuniya', active: true, copay: '20', tier: 'Class A', clinic: true, online: true, home: false },
  { id: 'medgulf', ar: 'ميدغلف', en: 'Medgulf', active: false, copay: '20', tier: 'Class B', clinic: true, online: false, home: false },
  { id: 'malath', ar: 'ملاذ للتأمين', en: 'Malath Insurance', active: false, copay: '25', tier: 'Class C', clinic: false, online: false, home: false },
  ]);

  const toggleIns = (id: string) => {
  setInsurances(prev => prev.map(item => item.id === id ? { ...item, active: !item.active } : item));
  };

  const toggleService = (id: string, service: 'clinic'|'online'|'home') => {
    setInsurances(prev => prev.map(item => item.id === id ? { ...item, [service]: !item[service] } : item));
  };

 const toggleDay = (dayName: string) => {
 setWeeklySchedule(prev => prev.map(d => d.day === dayName ? { ...d, active: !d.active } : d));
 };

 const toggleSplit = (dayName: string) => {
 setWeeklySchedule(prev => prev.map(d => d.day === dayName ? { ...d, splitShift: !d.splitShift } : d));
 };

 const updateHours = (dayName: string, field: string, value: string) => {
 setWeeklySchedule(prev => prev.map(d => d.day === dayName ? { ...d, [field]: value } : d));
 };

 const [showPicker, setShowPicker] = useState(false);
 const [pickerTarget, setPickerTarget] = useState<{day: string, field: string}|null>(null);

 const onTimeChange = (event: any, selectedDate?: Date) => {
   if (Platform.OS === 'android') {
     setShowPicker(false);
   }
   if (selectedDate && pickerTarget) {
     const hours = selectedDate.getHours().toString().padStart(2, '0');
     const mins = selectedDate.getMinutes().toString().padStart(2, '0');
     updateHours(pickerTarget.day, pickerTarget.field, `${hours}:${mins}`);
   }
 };

 const openTimePicker = (day: string, field: string) => {
   setPickerTarget({ day, field });
   setShowPicker(true);
 };

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      await client.patch('/provider/profile/availability', {
        is_accepting_requests: !vacationMode,
        vacation_mode: vacationMode,
        weekly_schedule: weeklySchedule,
        availability_exceptions: exceptions,
      });
      show(AR ? 'تم حفظ جدول التوفر الأسبوعي في الخادم' : 'Weekly availability saved to the server', 'success');
      onBack();
    } catch (e) {
      show(AR ? 'فشل حفظ الجدول' : 'Failed to save schedule', 'error');
    } finally {
      setSaving(false);
    }
  };

 const handleAddException = () => {
 const labelAr = exType === 'close_day' 
 ? 'إغلاق اليوم بالكامل' 
 : exType === 'block_time' 
 ? `حظر (${exStart} - ${exEnd})` 
 : `موعد استثنائي (${exStart} - ${exEnd})`;
 
 const labelEn = exType === 'close_day' 
 ? 'Full Day Closed' 
 : exType === 'block_time' 
 ? `Blocked (${exStart} - ${exEnd})` 
 : `Exceptional (${exStart} - ${exEnd})`;

 const item = {
 id: String(Date.now()),
 date: exDate,
 type: exType,
 labelAr,
 labelEn,
 start: exStart,
 end: exEnd
 };

 setExceptions(prev => [...prev, item]);
 setShowAddException(false);
 show(AR ? 'تمت إضافة الاستثناء بنجاح' : 'Exception added successfully', 'success');
 };

 const handleDeleteException = (id: string) => {
 setExceptions(prev => prev.filter(x => x.id !== id));
 show(AR ? 'تم حذف الاستثناء' : 'Exception removed', 'error');
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? ' جدول المواعيد والتوفر' : ' Availability Settings'} onBack={onBack} />
  <ScrollView contentContainerStyle={{ padding: SP.xl, paddingBottom: 100 }}>
 {loadingAvailability ? <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.xl }} /> : null}
 {/* Vacation Mode */}
 <NCard style={{ marginBottom: SP.xl, backgroundColor: vacationMode ? `${theme.danger}15` : theme.surface }} accent={vacationMode ? theme.danger : undefined}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 ️ {AR ? 'إجازة مؤقتة (وضع عدم الاتصال)' : 'Temporary Vacation (Offline)'}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>
 {AR ? 'تفعيل هذا الوضع يعطل حجز المواعيد الجديدة فوراً' : 'Enabling this blocks new bookings immediately'}
 </Text>
 </View>
 <Switch value={vacationMode} onValueChange={(val) => { setVacationMode(val); show(val ? (AR ? '️ تم تفعيل وضع الإجازة' : '️ Vacation enabled') : (AR ? '🟢 تم إلغاء وضع الإجازة' : '🟢 Vacation disabled'), val ? 'warning' : 'success'); }} trackColor={{ true: theme.danger }} />
 </View>
 </NCard>

 {/* Insurance Config — managed on the dedicated screen (delta approval) */}
 <NCard style={{ marginBottom: SP.xl }}>
 <NSettingsRow icon="shield" label={AR ? 'شركات التأمين والفئات المقبولة' : 'Accepted Insurers & Tiers'} onPress={() => onNavigate && onNavigate('insurance_config')} />
 </NCard>
 {/* Weekly Schedule */}
 <NSecHeader title={AR ? 'الجدول الأسبوعي للعيادة والتوفر' : 'Weekly Operations Calendar'} />
 {weeklySchedule.map(d => (
 <NCard key={d.day} style={{ marginBottom: SP.md, opacity: vacationMode ? 0.5 : 1 }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <Switch value={d.active} disabled={vacationMode} onValueChange={() => toggleDay(d.day)} trackColor={{ true: theme.primary }} />
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: d.active ? theme.text : theme.textSub }}>
 {AR ? d.dayAr : d.day}
 </Text>
 </View>
 {d.active && (
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{AR ? 'فترتين (منفصل)' : 'Split Shift'}</Text>
 <Switch value={d.splitShift} disabled={vacationMode} onValueChange={() => toggleSplit(d.day)} />
 </View>
 )}
 </View>

 {d.active && (
 <View style={{ gap: SP.md }}>
 {/* Morning/Main Shift */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
 <Text style={{ fontSize: FS.sm, color: theme.text, width: 80, textAlign: AR ? 'right' : 'left' }}>
 {d.splitShift ? (AR ? ' صباحاً:' : ' Morning:') : (AR ? '⏰ العمل:' : '⏰ Shift:')}
 </Text>
 <TouchableOpacity disabled={vacationMode} onPress={() => openTimePicker(d.day, 'morningStart')} style={{ flex: 1, height: 40, backgroundColor: theme.surface2, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' }}>
   <Text style={{ color: theme.text, fontSize: FS.sm }}>{d.morningStart || '--:--'}</Text>
 </TouchableOpacity>
 <Text style={{ color: theme.textSub }}>{AR ? 'إلى' : 'to'}</Text>
 <TouchableOpacity disabled={vacationMode} onPress={() => openTimePicker(d.day, 'morningEnd')} style={{ flex: 1, height: 40, backgroundColor: theme.surface2, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' }}>
   <Text style={{ color: theme.text, fontSize: FS.sm }}>{d.morningEnd || '--:--'}</Text>
 </TouchableOpacity>
 </View>

 {/* Evening Shift */}
 {d.splitShift && (
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
 <Text style={{ fontSize: FS.sm, color: theme.text, width: 80, textAlign: AR ? 'right' : 'left' }}>
 {AR ? ' مساءً:' : ' Evening:'}
 </Text>
 <TouchableOpacity disabled={vacationMode} onPress={() => openTimePicker(d.day, 'eveningStart')} style={{ flex: 1, height: 40, backgroundColor: theme.surface2, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' }}>
   <Text style={{ color: theme.text, fontSize: FS.sm }}>{d.eveningStart || '--:--'}</Text>
 </TouchableOpacity>
 <Text style={{ color: theme.textSub }}>{AR ? 'إلى' : 'to'}</Text>
 <TouchableOpacity disabled={vacationMode} onPress={() => openTimePicker(d.day, 'eveningEnd')} style={{ flex: 1, height: 40, backgroundColor: theme.surface2, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' }}>
   <Text style={{ color: theme.text, fontSize: FS.sm }}>{d.eveningEnd || '--:--'}</Text>
 </TouchableOpacity>
 </View>
 )}
 </View>
 )}
 </NCard>
 ))}
  {showPicker && (
    Platform.OS === 'ios' ? (
      <Modal transparent visible={showPicker} animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: theme.surface, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: SP.sm, borderBottomWidth: 1, borderColor: theme.border }}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={{ color: theme.primary, fontSize: FS.md, fontWeight: FW.bold }}>{AR ? 'تم' : 'Done'}</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={new Date()}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={(e, d) => onTimeChange(e, d)}
            />
          </View>
        </View>
      </Modal>
    ) : (
      <DateTimePicker
        value={new Date()}
        mode="time"
        is24Hour={true}
        display="default"
        onChange={onTimeChange}
      />
    )
  )}

 <NBtn label={AR ? ' حفظ الجدول الأسبوعي' : ' Save Weekly Calendar'} disabled={vacationMode} loading={saving} onPress={handleSaveSchedule} style={{ marginVertical: SP.lg }} />
 <DoctorServiceSlotsCard />

 {/* Exceptional Settings */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SP.xl, marginBottom: SP.lg }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
 {AR ? ' إغلاق وحظر استثنائي' : ' Exceptional Blocks & Closures'}
 </Text>
 <TouchableOpacity onPress={() => setShowAddException(true)} style={{ backgroundColor: theme.surface2, paddingHorizontal: SP.md, paddingVertical: SP.xs, borderRadius: R.md }}>
 <Text style={{ color: theme.primary, fontSize: FS.sm, fontWeight: FW.bold }}> {AR ? 'إضافة استثناء' : 'Add Rule'}</Text>
 </TouchableOpacity>
 </View>

 {exceptions.map(x => (
 <NCard key={x.id} style={{ marginBottom: SP.sm, paddingVertical: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <View>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 {x.date}
 </Text>
 <Text style={{ fontSize: FS.sm, color: x.type === 'exceptional_open' ? theme.success : theme.danger, textAlign: AR ? 'right' : 'left', marginTop: 4 }}>
 {AR ? x.labelAr : x.labelEn}
 </Text>
 </View>
 <TouchableOpacity onPress={() => handleDeleteException(x.id)}>
 <Text style={{ fontSize: FS.xl, color: theme.danger }}>️</Text>
 </TouchableOpacity>
 </View>
 </NCard>
 ))}
 </ScrollView>

 {/* Exception Sheet */}
 <NSheet visible={showAddException} onClose={() => setShowAddException(false)} title={AR ? ' إضافة قاعدة استثنائية' : ' Add Exceptional Rule'} height={500}>
 <View style={{ padding: SP.md }}>
 <NInput label={AR ? 'التاريخ (YYYY-MM-DD)' : 'Date (YYYY-MM-DD)'} value={exDate} onChange={setExDate} />
 
 <Text style={{ fontSize: FS.sm, color: theme.text, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'نوع القاعدة الاستثنائية' : 'Rule Type'}
 </Text>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.lg }}>
 {(['close_day', 'block_time', 'exceptional_open'] as const).map(type => (
 <TouchableOpacity key={type} onPress={() => setExType(type)} style={{
 flex: 1, padding: SP.md, borderRadius: R.md, borderWidth: 1.5,
 borderColor: exType === type ? theme.primary : theme.border,
 backgroundColor: exType === type ? theme.primaryLight : theme.surface
 }}>
 <Text style={{ fontSize: 11, fontWeight: FW.bold, color: exType === type ? theme.primary : theme.text, textAlign: 'center' }}>
 {type === 'close_day' ? (AR ? 'إغلاق اليوم' : 'Close Day') : type === 'block_time' ? (AR ? 'حظر وقت' : 'Block Time') : (AR ? 'فتح استثنائي' : 'Open Slot')}
 </Text>
 </TouchableOpacity>
 ))}
 </View>

 {exType !== 'close_day' && (
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.md }}>
 <View style={{ flex: 1 }}>
 <NInput label={AR ? 'من وقت' : 'From Time'} value={exStart} onChange={setExStart} />
 </View>
 <View style={{ flex: 1 }}>
 <NInput label={AR ? 'إلى وقت' : 'To Time'} value={exEnd} onChange={setExEnd} />
 </View>
 </View>
 )}

 <NBtn label={AR ? ' تطبيق القاعدة' : ' Apply Rule'} onPress={handleAddException} style={{ marginTop: SP.md }} />
 </View>
 </NSheet>
 </View>
 );
}

function DoctorProfileEditScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const { user } = useAuth();
 const AR = lang === 'ar';

 const [loading, setLoading] = useState(false);
 const [profile, setProfile] = useState<any>(null);
 const [nameAr, setNameAr] = useState('');
 const [nameEn, setNameEn] = useState('');
 const [descAr, setDescAr] = useState('');
 const [descEn, setDescEn] = useState('');
 const [exp, setExp] = useState('');
 const [web, setWeb] = useState('');
 const [specialty, setSpecialty] = useState('');
 const [degree, setDegree] = useState('');
 const [avatarUrl, setAvatarUrl] = useState('');
 const [clinicImages, setClinicImages] = useState<string[]>([]);
 const [uploadingClinic, setUploadingClinic] = useState(false);

 useEffect(() => {
 fetchProfile();
 }, []);

 const fetchProfile = async () => {
 setLoading(true);
 try {
 const res = await client.get('/provider/profile');
 setProfile(res.data);
 setNameAr(res.data.display_name_ar || '');
 setNameEn(res.data.display_name_en || '');
 setDescAr(res.data.description_ar || '');
 setDescEn(res.data.description_en || '');
 setExp(String(res.data.years_of_experience || ''));
 setWeb(res.data.website || '');
 setAvatarUrl(res.data.profile_image_id || '');
 setClinicImages(Array.isArray(res.data.clinic_images) ? res.data.clinic_images.filter((x: any) => typeof x === 'string') : []);
 } catch (err) {
 show(AR ? 'فشل تحميل الملف الشخصي' : 'Failed to load profile', 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleSave = async () => {
 setLoading(true);
 try {
 await client.patch('/provider/profile', {
 display_name_ar: nameAr,
 display_name_en: nameEn,
 description_ar: descAr,
 description_en: descEn,
 years_of_experience: parseInt(exp) || 0,
 website: web,
 specialty,
 degree,
 ...(avatarUrl ? { profile_image_id: avatarUrl } : {}),
 clinic_images: clinicImages,
 });
 show(AR ? 'تم الإرسال — تُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
 onBack();
 } catch (err) {
 show(AR ? 'فشل حفظ الملف الشخصي' : 'Failed to save profile', 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'تعديل الملف الشخصي' : 'Edit Profile'} onBack={onBack} />
 {loading && !profile ? (
 <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xl }} />
 ) : (
 <View style={{ padding: SP.xl, gap: SP.lg }}>
 <NCard style={{ alignItems: 'center', paddingVertical: SP.xl }}>
 <NAvatar name={nameEn || user?.displayName} size={80} />
 
 <NProfileImageUploader 
 ownerType="doctor" 
 onProcessComplete={(urls) => {
 setAvatarUrl(urls.processed);
 show(AR ? 'تم تحديث الصورة الشخصية' : 'Profile picture updated', 'success');
 }}
 />
 </NCard>

 <NInput label={AR ? 'الاسم بالكامل (العربية)' : 'Full Name (Arabic)'} value={nameAr} onChange={setNameAr} required />
 <NInput label={AR ? 'الاسم بالكامل (الإنجليزية)' : 'Full Name (English)'} value={nameEn} onChange={setNameEn} required />
 <NInput label={AR ? 'النبذة التعريفية (العربية)' : 'Bio (Arabic)'} value={descAr} onChange={setDescAr} multi lines={3} />
 <NInput label={AR ? 'النبذة التعريفية (الإنجليزية)' : 'Bio (English)'} value={descEn} onChange={setDescEn} multi lines={3} />
 <NInput label={AR ? 'سنوات الخبرة' : 'Years of Experience'} value={exp} onChange={setExp} kbType="numeric" />
 <NInput label={AR ? 'الموقع الإلكتروني' : 'Website'} value={web} onChange={setWeb} />
 <NInput label={AR ? 'التخصص الطبي' : 'Specialty'} value={specialty} onChange={setSpecialty} />
 <NInput label={AR ? 'الدرجة العلمية' : 'Degree / Title'} value={degree} onChange={setDegree} />

 <View style={{ marginTop: SP.md }}>
   <NSecHeader title={AR ? 'صور العيادة' : 'Clinic Images'} />
 </View>
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: AR ? 'row-reverse' : 'row' }}>
   <TouchableOpacity
     onPress={async () => {
       try {
         const DocPicker: any = await import('expo-document-picker');
         const picked = await DocPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
         const uri = picked?.assets?.[0]?.uri || picked?.uri;
         if (!uri) return;
         setUploadingClinic(true);
         const { ProviderApi } = await import('../../api/provider');
         const id = await ProviderApi.uploadFile(uri, picked?.assets?.[0]?.mimeType || 'image/jpeg', picked?.assets?.[0]?.name || 'clinic.jpg');
         if (typeof id === 'string' && id) setClinicImages((prev) => [...prev, id]);
         else show(AR ? 'تعذر رفع الصورة' : 'Could not upload image', 'error');
       } catch {
         show(AR ? 'تعذر رفع الصورة' : 'Could not upload image', 'error');
       } finally {
         setUploadingClinic(false);
       }
     }}
     style={{ width: 100, height: 100, borderRadius: R.md, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed', marginRight: SP.md }}>
     <I name="plus" size={24} color={theme.primary} />
     <Text style={{ fontSize: FS.xs, color: theme.primary, marginTop: SP.xs }}>{uploadingClinic ? (AR ? 'جارٍ الرفع…' : 'Uploading…') : (AR ? 'إضافة صورة' : 'Add Image')}</Text>
   </TouchableOpacity>
   {clinicImages.map((id) => (
     <View key={id} style={{ width: 100, height: 100, borderRadius: R.md, backgroundColor: theme.surface2, marginRight: SP.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
       <TouchableOpacity onPress={() => setClinicImages((prev) => prev.filter((x) => x !== id))} style={{ position: 'absolute', top: 4, right: 4, zIndex: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(244,67,54,0.9)', alignItems: 'center', justifyContent: 'center' }}>
         <I name="close" size={12} color="#FFF" />
       </TouchableOpacity>
       <IBg name="image" size={32} color={theme.textSub} bg="transparent" />
     </View>
   ))}
   {[1, 2].map(i => (
     <View key={`ph-${i}`} style={{ width: 100, height: 100, borderRadius: R.md, backgroundColor: theme.surface2, marginRight: SP.md, overflow: 'hidden', opacity: 0.4 }}>
       <IBg name="image" size={32} color={theme.textSub} bg="transparent" />
     </View>
   ))}
 </ScrollView>

 <NBtn label={AR ? ' حفظ التعديلات' : ' Save Changes'} onPress={handleSave} loading={loading} style={{ marginTop: SP.lg }} />
 </View>
 )}
 </NScroll>
 </View>
 );
}

 // ══════════════════════════════════════════════════════════════════════════════
// DOCTOR LOCATION & MAP SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export function DoctorLocationScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [radius, setRadius] = useState('10');
  const [transportFee, setTransportFee] = useState('50');
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let active = true;
    client.get('/provider/profile').then((res) => {
      if (!active) return;
      const p = res?.data?.data || res?.data || {};
      if (p.geo?.lat && p.geo?.lng) setPin({ lat: Number(p.geo.lat), lng: Number(p.geo.lng) });
      if (p.max_delivery_radius_km != null) setRadius(String(p.max_delivery_radius_km));
    }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function useMyLocation() {
    setLocating(true);
    try {
      const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
      const perm = await requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { show(AR ? 'الصلاحية مطلوبة لتحديد الموقع' : 'Location permission is required', 'error'); return; }
      const pos = await getCurrentPositionAsync({});
      setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      show(AR ? 'تعذر تحديد الموقع' : 'Could not determine location', 'error');
    } finally {
      setLocating(false);
    }
  }

  async function handleSave() {
    if (!pin) { show(AR ? 'حدد موقع العيادة على الخريطة أولاً' : 'Pin the clinic location on the map first', 'error'); return; }
    const r = Number(radius);
    if (!Number.isFinite(r) || r < 0) { show(AR ? 'أدخل نطاق تغطية صحيح' : 'Enter a valid coverage radius', 'error'); return; }
    setSaving(true);
    try {
      await client.patch('/provider/profile', {
        geo: { lat: pin.lat, lng: pin.lng },
        max_delivery_radius_km: r,
        delivery_fee: Number(transportFee) || 0,
      });
      show(AR ? 'تم الإرسال — تُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
      onBack();
    } catch (err: any) {
      show(err?.response?.data?.message || (AR ? 'تعذر الحفظ' : 'Could not save'), 'error');
    } finally {
      setSaving(false);
    }
  }

  const MapView = require('react-native-maps').default;
  const Marker = require('react-native-maps').Marker;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'الموقع ونطاق التغطية' : 'Location & Coverage'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.md }}>
        <NSecHeader title={AR ? 'موقع العيادة' : 'Clinic Location'} />
        <View style={{ height: 260, borderRadius: R.xl, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
          {loading ? null : (
            <MapView
              style={{ flex: 1 }}
              initialRegion={{ latitude: pin?.lat || 24.7136, longitude: pin?.lng || 46.6753, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
              onPress={(e: any) => setPin({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
            >
              {pin && <Marker coordinate={{ latitude: pin.lat, longitude: pin.lng }} draggable onDragEnd={(e: any) => setPin({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })} />}
            </MapView>
          )}
        </View>
        <NBtn label={locating ? (AR ? 'جارٍ التحديد…' : 'Locating…') : (AR ? 'استخدم موقعي الحالي' : 'Use my current location')} variant="outline" onPress={useMyLocation} />

        <View style={{ marginTop: SP.lg }}>
          <NSecHeader title={AR ? 'الزيارات المنزلية' : 'Home Visits'} />
        </View>
        <NCard>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.md }}>
            <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? 'نطاق التغطية (كم)' : 'Coverage Radius (KM)'}</Text>
            <NInput label="" value={radius} onChange={setRadius} kbType="numeric" style={{ width: 100, marginVertical: 0 }} />
          </View>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? 'رسوم الانتقال' : 'Transport Fee'}</Text>
            <NInput label="" value={transportFee} onChange={setTransportFee} kbType="numeric" style={{ width: 100, marginVertical: 0 }} />
          </View>
        </NCard>

        <NBtn label={AR ? 'حفظ' : 'Save'} loading={saving} onPress={handleSave} style={{ marginTop: SP.lg }} />
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INSURANCE CONFIG SCREEN
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// CERTIFICATES CONFIG SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export function CertificatesConfigScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [certs, setCerts] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [uploading, setUploading] = useState(false);
 const [docType, setDocType] = useState('medical_license');
 const DOC_TYPES = ['medical_license', 'professional_cv', 'national_id', 'commercial_registration', 'facility_license', 'iban_letter', 'vat_certificate', 'other'];

 async function load() {
   setLoading(true);
   try {
     const res = await client.get('/provider/kyc/documents');
     const d = res?.data?.data || res?.data || {};
     setCerts(Array.isArray(d.documents) ? d.documents : []);
   } catch {
     show(AR ? 'تعذر تحميل المستندات' : 'Could not load documents', 'error');
   } finally {
     setLoading(false);
   }
 }

 useEffect(() => { load(); }, []);

 async function handleUpload() {
   try {
     const DocPicker: any = await import('expo-document-picker');
     const FS: any = await import('expo-file-system');
     const picked = await DocPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
     const uri = picked?.assets?.[0]?.uri || picked?.uri;
     if (!uri) return;
     const mime = picked?.assets?.[0]?.mimeType || 'application/pdf';
     const name = picked?.assets?.[0]?.name || 'document';
     setUploading(true);
     const base64 = await FS.readAsStringAsync(uri, { encoding: 'base64' });
     await client.post('/provider/kyc/documents', { doc_type: docType, file: { data_base64: base64, mime, original_name: name } });
     show(AR ? 'تم رفع المستند وهو قيد المراجعة' : 'Document uploaded and under review', 'success');
     load();
   } catch (err: any) {
     show(err?.response?.data?.message || (AR ? 'تعذر رفع المستند' : 'Upload failed'), 'error');
   } finally {
     setUploading(false);
   }
 }

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? 'الشهادات والمؤهلات' : 'Qualifications'} onBack={onBack} />
 <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.md }}>
 {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} /> : certs.length === 0 ? (
 <NCard><Text style={{ color: theme.textSub, textAlign: 'center' }}>{AR ? 'لا توجد مستندات بعد' : 'No documents yet'}</Text></NCard>
 ) : certs.map((c: any) => (
 <NCard key={String(c.id || c.doc_type)} style={{ marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{c.doc_type}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{c.review_status || c.status || ''}</Text>
 </NCard>
 ))}
 <NSecHeader title={AR ? 'رفع مستند جديد' : 'Upload new document'} />
 <NCard>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6, marginBottom: SP.md }}>
 {DOC_TYPES.map((t) => (
 <TouchableOpacity key={t} onPress={() => setDocType(t)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: docType === t ? theme.primary : theme.border, backgroundColor: docType === t ? theme.primary : theme.surface2 }}>
 <Text style={{ color: docType === t ? '#FFF' : theme.text, fontSize: FS.xs }}>{t}</Text>
 </TouchableOpacity>
 ))}
 </View>
 <NBtn label={AR ? 'اختيار ملف ورفع' : 'Pick file & upload'} loading={uploading} onPress={handleUpload} />
 </NCard>
 </ScrollView>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// PHOTOS & MEDIA SCREEN
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// PRE-VISIT CHAT (PHASE 2)
// ══════════════════════════════════════════════════════════════════════════════
function PreVisitChatScreen({ apt, onBack, onNavigate }: { apt: any, onBack: () => void, onNavigate: (s: string, p?: any) => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
  ]);
  
  const handleSend = async () => {
    if (!msg.trim()) return;
    setLoading(true);
    try {
      await client.post('/provider/chat/send', { appointment_id: apt?.id, message: msg });
      setMessages(prev => [...prev, { id: Date.now().toString(), text: msg, sender: 'doctor', attachment: '' }]);
      setMsg('');
    } catch (err) {
      show(AR ? 'فشل إرسال الرسالة' : 'Failed to send message', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'محادثة ما قبل الموعد' : 'Pre-visit Chat'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg }}>
        <Text style={{ textAlign: 'center', color: theme.textSub, marginBottom: SP.lg }}>
          {AR ? 'يُفتح هذا الشات قبل 15 دقيقة لرفع المستندات' : 'Opens 15 mins early for document uploads'}
        </Text>
        
        {messages.map(m => (
          <NCard key={m.id} style={{ padding: SP.lg, marginBottom: SP.sm, backgroundColor: m.sender === 'doctor' ? theme.primary + '15' : theme.surface2 }}>
            <Text style={{ color: theme.text, textAlign: m.sender === 'doctor' ? (AR ? 'left' : 'right') : (AR ? 'right' : 'left') }}>{m.text}</Text>
            {m.attachment ? <Text style={{ color: theme.primary, marginTop: SP.xs, textAlign: AR ? 'right' : 'left' }}>📎 {m.attachment}</Text> : null}
          </NCard>
        ))}
      </ScrollView>
      <View style={{ padding: SP.lg, borderTopWidth: 1, borderColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, alignItems: 'center' }}>
        <View style={{ flex: 1 }}><NInput value={msg} onChange={setMsg} placeholder={AR ? 'اكتب رسالة...' : 'Type a message...'} /></View>
        <NBtn label={AR ? 'إرسال' : 'Send'} onPress={handleSend} disabled={loading || !msg.trim()} style={{ width: 100 }} />
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INBOUND MEDICAL REPORTS SCREEN (Radiology & Labs)
// ══════════════════════════════════════════════════════════════════════════════

function InboundMedicalReportsScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

    const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    client.get('/provider/reports/inbound')
      .then((res) => {
        if (!active) return;
        const rows = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        setReports(rows.map((row: any) => ({
          id: row.id,
          type: String(row.type || row.service_type || row.kind || 'REPORT').toUpperCase(),
          patientName: row.patient_name || row.patient?.full_name || '—',
          testName: row.test_name || row.service_name || row.title || '—',
          status: row.status || row.state || 'PUBLISHED',
          date: row.published_at || row.completed_at || row.updatedAt || row.createdAt || '',
          pdfUrl: row.pdf_url || row.report_pdf_url || row.file_url,
          dicomViewerUrl: row.dicom_viewer_url || row.dicomViewerUrl,
        })));
        setLoadError(null);
      })
      .catch(() => {
        if (!active) return;
        setReports([]);
        setLoadError(AR ? 'تعذر تحميل التقارير من الخادم. حاول مرة أخرى.' : 'Unable to load reports from the server. Please try again.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [AR]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'التقارير الطبية الواردة' : 'Inbound Medical Reports'} onBack={onBack} />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
          {reports.length === 0 ? (
            <NEmpty title={loadError ? (AR ? 'تعذر تحميل التقارير' : 'Unable to load reports') : (AR ? 'لا توجد تقارير' : 'No Reports')} sub={loadError || (AR ? 'لا توجد نتائج جاهزة حتى الآن' : 'No results available yet.')} icon="folder" />
          ) : (
            reports.map(report => (
              <NCard key={report.id} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                    <I name={report.type === 'RADIOLOGY' ? 'camera' : 'flask'} size={24} color={theme.primary} />
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, textAlign: AR ? 'right' : 'left' }}>{report.testName}</Text>
                      <Text style={{ fontSize: 14, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{report.patientName} • {report.date}</Text>
                    </View>
                  </View>
                  <NBadge label={report.status} variant="success" size="sm" />
                </View>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 8, marginTop: 16 }}>
                  {report.dicomViewerUrl && (
                    <TouchableOpacity 
                      onPress={() => Linking.openURL(report.dicomViewerUrl).catch(() => show(AR ? 'فشل فتح العارض' : 'Failed to open viewer', 'error'))}
                      style={{ flex: 1, backgroundColor: theme.info, padding: 8, borderRadius: 8, alignItems: 'center', flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'center', gap: 4 }}>
                      <I name="eye" size={16} color="#FFF" />
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{AR ? 'عرض صور الأشعة' : 'DICOM Viewer'}</Text>
                    </TouchableOpacity>
                  )}
                  {report.pdfUrl && (
                    <TouchableOpacity 
                      onPress={() => Linking.openURL(report.pdfUrl).catch(() => show(AR ? 'فشل فتح التقرير' : 'Failed to open report', 'error'))}
                      style={{ flex: 1, backgroundColor: theme.primary, padding: 8, borderRadius: 8, alignItems: 'center', flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'center', gap: 4 }}>
                      <I name="fileText" size={16} color="#FFF" />
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>{AR ? 'تقرير PDF' : 'PDF Report'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </NCard>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  iconBtn: { padding: 8, borderRadius: 8 },
  viewChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  timeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  freqChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  drugRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderRadius: 8 },
  dayChip2: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  specChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  insureCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2 },
  insChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  rTypeRow: { padding: 16, borderRadius: 8, marginBottom: 8, borderWidth: 1 },
  filterChip2: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  notifRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, gap: 12 },
  notifIcon: { width: 40, height: 40, borderRadius: 20 },
  calRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, alignItems: 'center', gap: 12 },
  calIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
});
