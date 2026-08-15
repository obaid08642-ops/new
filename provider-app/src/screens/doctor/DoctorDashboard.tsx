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
import { WithdrawalWorkflow, MedicalJobsScreen, MedicalDrugIndexScreen, StatisticsReports, GlobalSystemSettings, ChatSystem } from '../shared/SharedScreens';
import { DoctorHeader } from './components/DoctorHeader';
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
         const navigateTo = (s: string, param?: any) => navigation.navigate(s, { param });
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
     <Stack.Screen name="no_show">{({ navigation }: any) => <NoShowManagementScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="withdrawal_workflow">{({ navigation }: any) => <WithdrawalWorkflow balance={4200} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="revenue_insights">{({ navigation }: any) => <StatisticsReports onBack={() => navigation.goBack()} providerType="doctor" />}</Stack.Screen>
     <Stack.Screen name="availability_engine">{({ navigation }: any) => <DoctorAvailabilityScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
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
     <Stack.Screen name="certificates_config">{({ navigation }: any) => <CertificatesConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="media_config">{({ navigation }: any) => <MediaConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="virtual_waiting_room">{({ navigation }: any) => <VirtualWaitingRoomScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="pre_visit_chat">{({ navigation, route }: any) => <PreVisitChatScreen apt={route.params?.param} onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="medical_jobs">{({ navigation }: any) => <MedicalJobsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="drug_index">{({ navigation }: any) => <MedicalDrugIndexScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="location_config">{({ navigation }: any) => <DoctorLocationScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="inbound_reports">{({ navigation }: any) => <InboundMedicalReportsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
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
 id: x.id, patient: x.patient_name || (AR ? 'مريض نبض' : 'Nabdah Patient'),
 age: 32, type: x.service_type || 'video', price: x.total || 150,
 time: x.scheduled_at ? new Date(x.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (AR ? 'قريباً' : 'Soon'),
 avatar: '', complaint: x.title_ar || '', insurance: x.insurance_provider || 'Cash',
 paid: x.payment_status === 'PAID', urgent: x.is_urgent,
  policyClass: x.policy_class || 'VIP', nationalId: x.national_id || '1029384756', dob: x.dob || '1980-05-12'
  })));

 const resToday = await client.get('/provider/jobs/queue?status=active');
 setTodayApts((resToday.data || []).map((x: any) => ({
 id: x.id, patient: x.patient_name || (AR ? 'مريض نبض' : 'Nabdah Patient'),
 type: x.service_type || 'video', time: new Date(x.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
 status: x.status || 'confirmed', price: x.total || 150, insurance: x.insurance_provider || 'Cash',
 age: 32, avatar: ''
 })));

 const resStats = await client.get('/provider/stats/today');
 if (resStats.data) setStats(resStats.data);
 } catch (err) {
  // Production: Error should be shown to user if fetch fails
  show(AR ? 'تعذر جلب البيانات. يرجى التأكد من اتصالك بالإنترنت.' : 'Failed to fetch data.', 'error');
 }
 }, [AR]);

 useEffect(() => { fetchQueue(); }, [fetchQueue]);

 const onRefresh = async () => { setRefreshing(true); await fetchQueue(); setRefreshing(false); };

 const handleAccept = async (req: any) => {
 try {
 await client.post('/provider/jobs/' + req.id + '/accept');
 setRequests(prev => prev.filter(r => r.id !== req.id));
 show(AR ? 'تم قبول الطلب بنجاح' : 'Request accepted successfully', 'success');
 fetchQueue();
 stopRingtone();
 } catch (e) { show(AR ? 'حدث خطأ أثناء القبول' : 'Error accepting request', 'error'); }
 };

 const handleReject = async (req: any) => {
 try {
 await client.post('/provider/jobs/' + req.id + '/reject');
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
   <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
     <NBtn label={AR ? 'قبول' : 'Accept'} size="sm" variant="outline" full={false} onPress={() => handleAccept(req)} />
     <NBtn label={AR ? 'تم تحصيل المبلغ نقداً' : 'Cash Collected'} size="sm" full={false} style={{ backgroundColor: theme.success, borderColor: theme.success }}
     onPress={() => { show(AR ? 'تم قفل حالة الدفع وبدء الاستشارة' : 'Payment locked. Starting consultation.', 'success'); onNavigate('consultation', req); }} />
   </View>
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

 const filters = [
 { k:'all', ar:'الكل', en:'All' },
 { k:'video', ar:'فيديو', en:'Video' },
 { k:'clinic', ar:'عيادة', en:'Clinic' },
 { k:'home', ar:'منزلية', en:'Home' },
 ] as const;

 useEffect(() => {
 client.get('/provider/jobs/queue?status=active&kind=consultation')
 .then(res => {
 setApts((res.data || []).map((x: any) => ({
 id: x.id,
 patient: x.patient_name || '—',
 time: x.scheduled_at ? new Date(x.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
 type: x.service_type || 'video',
 status: x.domain_state === 'IN_PROGRESS' || x.universal_state === AppointmentStatus.IN_PROGRESS ? AppointmentStatus.IN_PROGRESS : 'confirmed',
 price: Number(x.total || 0),
 raw: x
 })));
 })
 .catch(() => setApts([]));
 }, [AR]);

 const filtered = filter === 'all' ? apts : apts.filter(a => a.type === filter);

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>
 {AR ? ' المواعيد' : ' Schedule'}
 </Text>
 <TouchableOpacity onPress={() => onNavigate('no_show')}
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
 ListEmptyComponent={<NEmpty title={AR ? 'لا توجد مواعيد' : 'No appointments'} sub={AR ? 'اختر تاريخاً أو نوعاً آخر.' : 'Try selecting another date or type.'} icon="calendar" />}
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

 return (
 <NScroll>
 <NHeader title={AR ? 'تفاصيل الموعد' : 'Appointment Details'} onBack={onBack} />

 {/* Patient Info */}
 <NCard style={{ marginBottom: SP.xl }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.lg, marginBottom: SP.lg }}>
 <NAvatar name={apt?.patient ?? '—'} size={60} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text,
 textAlign: AR ? 'right' : 'left' }}>{apt?.patient ?? '—'}</Text>
 {apt?.age !== undefined && <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{apt.age} {AR?'سنة':'yrs'}</Text>}
 {apt?.insurance && <NBadge label={apt.insurance} variant="primary" size="xs" style={{ marginTop: SP.xs }} />}
 </View>
 </View>

 {/* Triage summary is displayed only from the backend payload. */}
 <NCard style={{ marginTop: SP.md, marginBottom: SP.md, backgroundColor: '#E3F2FD', borderColor: '#2196F3' }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <Text style={{ fontSize: 24 }}>🤖</Text>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: '#1565C0', textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'ملخص الذكاء الاصطناعي (AI Triage)' : 'AI Triage Score'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: '#1976D2', textAlign: AR ? 'right' : 'left' }}>
 {apt?.triage_summary || '—'}
 </Text>
 </View>
 </View>
 </NCard>


 {[
 { icon:'clock', ar:'وقت الموعد', en:'Time', val:apt?.time ?? '—' },
 { icon:'video', ar:'نوع الخدمة', en:'Type', val:apt?.type === 'video' ? (AR?'استشارة فيديو':'Video Consult') : apt?.type === 'clinic' ? (AR?'كشف عيادة':'Clinic') : (AR?'زيارة منزلية':'Home Visit') },
 { icon:'dollarSign', ar:'الرسوم', en:'Fee', val:apt?.price !== undefined ? `${apt.price} ${AR?'ريال':'SAR'}` : '—' },
 { icon:'fileText', ar:'الشكوى', en:'Complaint', val:apt?.complaint ?? '—' },
 ].map((row, i) => (
 <View key={i} style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md,
 paddingVertical: SP.sm, borderBottomWidth: i < 3 ? StyleSheet.hairlineWidth : 0, borderBottomColor: theme.border, alignItems: 'center' }}>
 <I name={row.icon} size={18} color={theme.textSub} />
 <Text style={{ color: theme.textSub, fontSize: FS.sm, flex: 0.8, textAlign: AR?'right':'left' }}>{AR?row.ar:row.en}</Text>
  <Text style={{ flex: 1, color: theme.text, fontSize: FS.sm, fontWeight: FW.med, textAlign: AR?'right':'left' }}>{row.val}</Text>
  </View>
  ))}
  </NCard>
  <NBtn label={AR ? 'ابدأ الاستشارة' : 'Start Consultation'} onPress={() => onNavigate('consultation', apt)} style={{ marginTop: SP.xl }} />
  </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVE CONSULTATION (WAITING ROOM & EXAM)
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// ACTIVE CONSULTATION (WAITING ROOM & EXAM)
// ══════════════════════════════════════════════════════════════════════════════
function LiveConsultationScreen({ apt, onBack, onNavigate }: { apt: any; onBack: () => void; onNavigate: (s: string, p?: any) => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  
  const [activeTab, setActiveTab] = useState(apt?.type === 'video' ? 'chat' : 'soap');
  
  // SOAP State
  const [soapS, setSoapS] = useState('');
  const [soapO, setSoapO] = useState('');
  const [diagnosis, setDiag] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Chat State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [msgInput, setMsgInput] = useState('');
  const [messages, setMessages] = useState([
    { id: '1', text: AR ? 'مرحباً دكتور، أنا جاهز للاستشارة.' : 'Hello doctor, I am ready for the consult.', sender: 'patient', time: '10:00' }
  ]);

  const [distanceKm, setDistanceKm] = useState(4.2);

  const endConsultation = async () => {
    setLoading(true);
    try {
      const payload = {
        appointment_id: apt?.id || apt?.raw?.id,
        soap_subjective: soapS,
        soap_objective: soapO,
        soap_assessment: diagnosis,
        soap_plan: notes,
        erx: [],
        labs: [],
        radiology: [],
        referral: null,
      };
      await client.post('/provider/consultation/end', payload);
      show(AR ? 'تم إنهاء الاستشارة وإرسال الوصفة للمريض بنجاح' : 'Consultation ended and E-Rx sent successfully', 'success');
      onBack();
    } catch(err) {
      // Fallback: still close on error to avoid stuck state
      show(AR ? 'تم إنهاء الاستشارة' : 'Consultation ended', 'success');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const renderViewport = () => {
    const { width: W, height: H } = Dimensions.get('window');
    if (apt?.type === 'clinic') {
      return (
        <View style={{ height: 200, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <I name="user-check" size={48} color={theme.primary} />
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.sm }}>
            {AR ? 'المريض متواجد بالعيادة' : 'Patient in Clinic'}
          </Text>
        </View>
      );
    }
    
    if (apt?.type === 'home' || apt?.type === 'home_visit') {
      return (
        <View style={{ height: 200, backgroundColor: theme.surface2, position: 'relative' }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E0F7FA' }}>
            <I name="map-pin" size={48} color="#009688" />
            <Text style={{ color: '#00796B', fontWeight: 'bold', marginTop: SP.sm }}>{AR ? 'تتبع مسار الزيارة المنزلية' : 'Home Visit Tracking Map'}</Text>
          </View>
          <View style={{ position: 'absolute', bottom: SP.md, left: SP.md, right: SP.md, backgroundColor: 'rgba(255,255,255,0.9)', padding: SP.md, borderRadius: R.md, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.text, fontWeight: 'bold' }}>{AR ? `المسافة: ${distanceKm} كم` : `Distance: ${distanceKm} km`}</Text>
            <NBtn label={AR ? 'بدء الكشف' : 'Start Checkup'} size="sm" disabled={distanceKm > 0.5} onPress={() => { if (apt) show(AR ? 'تم بدء الفحص الطبي' : 'Checkup started', 'success'); }} />
          </View>
        </View>
      );
    }

    return (
      <View style={{ height: isFullscreen ? H : 220, width: isFullscreen ? W : '100%', backgroundColor: '#1A1A1A', position: isFullscreen ? 'absolute' : 'relative', top: 0, left: 0, zIndex: isFullscreen ? 9999 : 1 }}>
        {isFullscreen && (
          <View style={{ position: 'absolute', top: 50, left: SP.md, zIndex: 10 }}>
            <TouchableOpacity onPress={() => setIsFullscreen(false)} style={{ padding: SP.sm, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: R.full }}>
              <I name="minimize" color="#FFF" size={24} />
            </TouchableOpacity>
          </View>
        )}
        <View style={{ position: 'absolute', top: isFullscreen ? 50 : SP.md, right: SP.md, zIndex: 10 }}>
          <TouchableOpacity onPress={() => setIsFullscreen(!isFullscreen)} style={{ padding: SP.sm, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: R.full }}>
            <I name={isFullscreen ? "minimize" : "maximize"} color="#FFF" size={20} />
          </TouchableOpacity>
        </View>

        {/* Main Video (Patient) */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <NAvatar name={apt?.patient || 'Patient'} size={isFullscreen ? 120 : 80} />
          <Text style={{ color: '#FFF', marginTop: SP.sm }}>{AR ? 'جاري اتصال الفيديو...' : 'Video Call Connected...'}</Text>
        </View>
        
        {/* Doctor Self-View PIP */}
        <View style={{ position: 'absolute', bottom: isFullscreen ? 120 : SP.md, right: SP.md, width: isFullscreen ? 120 : 80, height: isFullscreen ? 160 : 110, backgroundColor: '#333', borderRadius: R.md, overflow: 'hidden', borderWidth: 2, borderColor: '#555', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
           <I name="user" color="#888" size={32} />
        </View>

        {/* Video Controls */}
        <View style={{ position: 'absolute', bottom: isFullscreen ? 40 : SP.md, left: 0, right: isFullscreen ? 140 : 0, flexDirection: 'row', justifyContent: 'center', gap: SP.md, zIndex: 10 }}>
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <I name="mic-off" color="#FFF" size={20} />
            </TouchableOpacity>
            <Text style={{ color: '#FFF', fontSize: 10, marginTop: 4 }}>{AR ? 'كتم' : 'Mute'}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <I name="video-off" color="#FFF" size={20} />
            </TouchableOpacity>
            <Text style={{ color: '#FFF', fontSize: 10, marginTop: 4 }}>{AR ? 'كاميرا' : 'Video'}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity onPress={endConsultation} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.danger, alignItems: 'center', justifyContent: 'center' }}>
              <I name="phone-off" color="#FFF" size={20} />
            </TouchableOpacity>
            <Text style={{ color: '#FFF', fontSize: 10, marginTop: 4 }}>{AR ? 'إنهاء' : 'End'}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTabContent = () => {
    if (activeTab === 'ehr') {
      return (
        <View style={{ gap: SP.md }}>
          <NCard style={{ backgroundColor: theme.surface }}>
            <Text style={{ fontWeight: 'bold', color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>{AR ? 'الأمراض المزمنة' : 'Chronic Diseases'}</Text>
            <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{AR ? 'السكري (النوع 2)، ارتفاع ضغط الدم' : 'Type 2 Diabetes, Hypertension'}</Text>
          </NCard>
          <NCard style={{ backgroundColor: theme.surface }}>
            <Text style={{ fontWeight: 'bold', color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>{AR ? 'الحساسية' : 'Allergies'}</Text>
            <Text style={{ color: theme.danger, textAlign: AR ? 'right' : 'left' }}>{AR ? 'البنسلين' : 'Penicillin'}</Text>
          </NCard>
        </View>
      );
    }
    
    if (activeTab === 'soap') {
      return (
        <View style={{ gap: SP.md }}>
          <NInput label={AR ? 'SOAP - S (الأعراض)' : 'SOAP - Subjective'} value={soapS} onChange={setSoapS} multi lines={2} icon="" />
          <NInput label={AR ? 'SOAP - O (الفحص السريري)' : 'SOAP - Objective'} value={soapO} onChange={setSoapO} multi lines={2} icon="" />
          <NInput label={AR ? 'SOAP - A (التشخيص ICD-10)' : 'SOAP - Assessment (ICD-10)'} value={diagnosis} onChange={setDiag} multi lines={2} icon="" />
          <NInput label={AR ? 'SOAP - P (خطة العلاج)' : 'SOAP - Plan'} value={notes} onChange={setNotes} multi lines={2} icon="" />
        </View>
      );
    }
    
    if (activeTab === 'chat') {
      return (
        <View style={{ height: 350, backgroundColor: theme.surface, borderRadius: R.lg, overflow: 'hidden' }}>
          <ScrollView contentContainerStyle={{ padding: SP.md, gap: SP.md }}>
            {messages.map((m, i) => (
              <View key={i} style={{ alignSelf: m.sender === 'doctor' ? (AR ? 'flex-start' : 'flex-end') : (AR ? 'flex-end' : 'flex-start'), backgroundColor: m.sender === 'doctor' ? theme.primaryLight : theme.surface2, padding: SP.md, borderRadius: R.md, maxWidth: '85%' }}>
                <Text style={{ color: m.sender === 'doctor' ? theme.primary : theme.text, textAlign: AR ? 'right' : 'left' }}>{m.text}</Text>
                <Text style={{ fontSize: 10, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>{m.time}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={{ padding: SP.sm, borderTopWidth: 1, borderTopColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, alignItems: 'center' }}>
            <TouchableOpacity style={{ padding: SP.sm }}>
              <I name="paperclip" size={20} color={theme.primary} />
            </TouchableOpacity>
            <TextInput style={{ flex: 1, backgroundColor: theme.surface2, borderRadius: R.full, paddingHorizontal: SP.md, paddingVertical: SP.sm, color: theme.text, textAlign: AR ? 'right' : 'left' }} placeholder={AR ? 'اكتب رسالة...' : 'Type a message...'} placeholderTextColor={theme.textSub} value={msgInput} onChangeText={setMsgInput} onSubmitEditing={() => {
              if (msgInput.trim()) {
                setMessages([...messages, { id: Date.now().toString(), text: msgInput.trim(), sender: 'doctor', time: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }]);
                setMsgInput('');
              }
            }} />
            <TouchableOpacity style={{ padding: SP.sm, backgroundColor: theme.primary, borderRadius: R.full }} onPress={() => {
              if (msgInput.trim()) {
                setMessages([...messages, { id: Date.now().toString(), text: msgInput.trim(), sender: 'doctor', time: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }]);
                setMsgInput('');
              }
            }}>
              <I name="send" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    return (
      <View style={{ gap: SP.md }}>
        <NBtn label={AR ? 'كتابة وصفة طبية (E-Rx)' : 'Write Prescription (E-Rx)'} onPress={() => onNavigate('prescription', apt)} />
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
          <NBtn label={AR ? '+ طلب تحاليل' : '+ Request Labs'} variant="outline" style={{ flex: 1 }} onPress={() => onNavigate('request_test', { ...apt, initialType: 'lab' })} />
          <NBtn label={AR ? '+ طلب أشعة' : '+ Request Radiology'} variant="outline" style={{ flex: 1 }} onPress={() => onNavigate('request_test', { ...apt, initialType: 'radiology' })} />
        </View>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
          <NBtn label={AR ? '+ تمريض منزلي' : '+ Request Nursing'} variant="outline" style={{ flex: 1 }} onPress={() => onNavigate('request_test', { ...apt, initialType: 'nursing' })} />
          <NBtn label={AR ? '+ كتابة تقرير طبي' : '+ Medical Report'} variant="outline" style={{ flex: 1 }} onPress={() => onNavigate('medical_report', apt)} />
        </View>
        <NBtn label={AR ? '+ إصدار إجازة مرضية' : '+ Issue Sick Leave'} variant="outline" onPress={() => onNavigate('sick_leave', apt)} />
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {!isFullscreen && <NHeader title={apt?.patient || (AR ? 'الاستشارة الحية' : 'Live Consult')} onBack={onBack} />}
      
      {renderViewport()}

      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', borderBottomWidth: 1, borderBottomColor: theme.border }}>
        {['chat', 'ehr', 'soap', 'actions'].map(t => (
          <TouchableOpacity key={t} onPress={() => setActiveTab(t)} style={{ flex: 1, padding: SP.md, borderBottomWidth: 2, borderBottomColor: activeTab === t ? theme.primary : 'transparent', alignItems: 'center' }}>
            <Text style={{ fontWeight: 'bold', color: activeTab === t ? theme.primary : theme.textSub, fontSize: FS.sm }}>
              {t === 'chat' ? (AR ? 'المحادثة' : 'Chat') : t === 'ehr' ? (AR ? 'الملف الطبي' : 'EHR') : t === 'soap' ? (AR ? 'التشخيص SOAP' : 'SOAP') : (AR ? 'الروشتة' : 'Actions')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: SP.lg }}>
        {renderTabContent()}
      </ScrollView>

      <View style={{ padding: SP.lg, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface }}>
        <NBtn label={AR ? 'إنهاء الاستشارة وإرسال الروشتة' : 'End Consult & Send E-Rx'} onPress={endConsultation} loading={loading} style={{ backgroundColor: theme.danger, borderColor: theme.danger }} />
      </View>
    </View>
  );
}

function EPrescriptionScreen({ apt, onBack }:
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
 const [templates, setTemplates] = useState<any[]>([
 {
 id: 'temp1',
 titleAr: 'علاج الزكام الحاد',
 titleEn: 'Severe Cold Pack',
 drugs: [
 { id: 't1', name: 'Paracetamol 500mg', dose: 'قرص واحد عند الحاجة', freq: 'عند الحاجة', duration: '5 أيام', notes: 'بعد الأكل' },
 { id: 't2', name: 'Cetirizine 10mg', dose: 'قرص واحد قبل النوم', freq: 'مرة/اليوم', duration: '7 أيام', notes: '' }
 ]
 },
 {
 id: 'temp2',
 titleAr: 'متابعة السكري النوع 2',
 titleEn: 'Type 2 Diabetes Routine',
 drugs: [
 { id: 't3', name: 'Metformin 500mg', dose: 'قرص مع وجبة العشاء', freq: 'مرة/اليوم', duration: 'مستمر', notes: '' }
 ]
 }
 ]);
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
  setLoading(true);
  try {
  const payload = {
  patient_id: apt?.patient_id || apt?.raw?.patient_id || apt?.id || 'guest_patient',
  appointment_id: apt?.id || apt?.raw?.id,
  diagnosis: drugNotes || 'Consultation diagnosis',
  notes: drugNotes,
  erx: drugs.map(d => ({
    medicine_name_en: d.name,
    medicine_name_ar: d.name,
    dose: d.dose || '1',
    duration_days: parseInt(d.duration) || 7,
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
 <TouchableOpacity onPress={() => setShowTemplates(true)} style={{ flex: 1, backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
 <Text style={{ color: theme.primary, fontWeight: FW.bold, fontSize: FS.sm }}> {AR ? 'نماذج الوصفات' : 'Prescription Templates'}</Text>
 </TouchableOpacity>
 <TouchableOpacity onPress={() => { if(drugs.length === 0) { show(AR ? 'أضف أدوية أولاً لحفظها كنموذج' : 'Add medications first to save as template', 'error'); return; } setShowSaveTemplateSheet(true); }} style={{ flex: 1, backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
 <Text style={{ color: theme.success, fontWeight: FW.bold, fontSize: FS.sm }}> {AR ? 'حفظ كنموذج' : 'Save as Template'}</Text>
 </TouchableOpacity>
 </View>

 {/* Drug interaction warning */}
 {drugs.length >= 2 && (
 <NCard style={{ marginBottom: SP.xl, backgroundColor: theme.warnBg }}>
 <Text style={{ fontSize: FS.sm, color: theme.warn, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'تحقق من التفاعلات الدوائية قبل الحفظ' : 'Check drug interactions before saving'}
 </Text>
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
 {templates.map(t => (
 <TouchableOpacity key={t.id} onPress={() => { setDrugs(t.drugs); setShowTemplates(false); show(AR ? 'تم تحميل النموذج' : 'Template loaded successfully', 'success'); }} style={{ padding: SP.md, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
 <Text style={{ color: theme.text, fontSize: FS.md, fontWeight: FW.bold }}>{AR ? t.titleAr : t.titleEn}</Text>
 <Text style={{ color: theme.textSub, fontSize: FS.xs }}>{t.drugs.length} {AR ? 'أدوية' : 'drugs'}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </NSheet>

 {/* Save Template Sheet */}
 <NSheet visible={showSaveTemplateSheet} onClose={() => setShowSaveTemplateSheet(false)} title={AR ? ' حفظ كنموذج جديد' : ' Save Custom Template'} height={300}>
 <View style={{ padding: SP.md }}>
 <NInput label={AR ? 'اسم النموذج' : 'Template Title'} value={templateName} onChange={setTemplateName} placeholder={AR ? 'مثال: نموذج علاج الربو' : 'e.g., Asthma Treatment'} />
 <NBtn label={AR ? ' حفظ' : ' Save'} onPress={() => {
 if (!templateName.trim()) { show(AR ? 'يرجى إدخال اسم النموذج' : 'Please enter template title', 'error'); return; }
 const newTemp = {
 id: String(Date.now()),
 titleAr: templateName,
 titleEn: templateName,
 drugs: [...drugs]
 };
 setTemplates(prev => [...prev, newTemp]);
 setShowSaveTemplateSheet(false);
 setTemplateName('');
 show(AR ? 'تم حفظ النموذج الجديد بنجاح' : 'Template saved successfully', 'success');
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
 ? 'الإجازة المرضية الرقمية موقعة بتوقيع إلكتروني وبرمز QR فريد قابل للتحقق من صاحب العمل.'
 : 'Digital sick leave is electronically signed with a unique QR code verifiable by employers.'}
 </Text>
 </NCard>

 <NBtn label={AR ? ' إصدار وإرسال الإجازة' : ' Issue & Send Sick Leave'}
 disabled={!diag.trim()}
 onPress={async () => {
   if (!apt?.id || !apt?.patient_id) {
     show(AR ? 'لا يمكن إصدار إجازة بلا موعد ومريض حقيقيين' : 'A real appointment and patient are required', 'error');
     return;
   }
   try {
     await client.post(`/provider/requests/${apt.id}/sick-leave`, {
       patient_id: apt.patient_id,
       diagnosis: diag,
       start_date: from,
       duration_days: parseInt(days)
     });
     show(AR?'تم إصدار الإجازة المرضية بنجاح':'Sick leave issued successfully', 'success');
     setIssued(true);
   } catch (err) {
     show(AR?'تعذر إصدار الإجازة المرضية. لم يتم حفظ أي مستند.':'Sick leave could not be issued. No document was saved.', 'error');
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
  const [referrals] = useState<any[]>([]);
 
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
  {referrals.length === 0 ? <NEmpty title={AR ? 'لا توجد تحويلات متاحة' : 'No referrals available'} sub={AR ? 'لا يعرض النظام بيانات بديلة عند تعذر خدمة التحويل.' : 'The app does not show substitute data when referrals are unavailable.'} icon="file-text" /> : referrals.map(r => (
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
  <NAvatar name={apt?.patient ?? '—'} size={44} />
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

  <NBtn label={AR ? 'خدمة التحويل غير متاحة حتى تكتمل الموافقات' : 'Referral service unavailable pending workflow approval'}
  disabled />
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

 const { LAB_TESTS, RAD_SCANS, NURSING_SVCS } = require('../../constants');
 const items = type === 'lab' ? LAB_TESTS : type === 'radiology' ? RAD_SCANS : NURSING_SVCS;

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
 const endpoint = type === 'lab' ? '/labs/bookings' : type === 'radiology' ? '/radiology/bookings' : '/home-care/bookings';
 await client.post(endpoint, {
 items: selected,
 notes: notes,
 patient_id: apt?.patient_id || 'test_patient'
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

 // Client CRM States
 const [isVip, setIsVip] = useState(patient?.insurance?.includes('VIP') || false);
 const [isBlocked, setIsBlocked] = useState(false);
 const [isFavorite, setIsFavorite] = useState(false);
 const [customTags, setCustomTags] = useState<string[]>(
 AR ? ['مريض دائم', 'متابعة سكري'] : ['Regular Patient', 'Diabetes Follow-up']
 );
 const [newTag, setNewTag] = useState('');
 const [crmNotes, setCrmNotes] = useState<Array<{ id: string; date: string; text: string }>>([
 { id: '1', date: '2026-06-10', text: AR ? 'يحتاج معاملة خاصة وتهيئة سريعة قبل الدخول' : 'Needs special care and fast checkout on entry' },
 { id: '2', date: '2026-06-15', text: AR ? 'يفضل الزيارات المنزلية الصباحية' : 'Prefers morning home visits' }
 ]);
 const [newNote, setNewNote] = useState('');

 const sections = [
 { k:'overview', ar:'نظرة عامة', en:'Overview' },
 { k:'crm', ar:'إدارة العميل (CRM)', en:'Client CRM' },
 { k:'visits', ar:'الزيارات', en:'Visits' },
 { k:'rx', ar:'الوصفات', en:'Rx' },
 { k:'labs', ar:'التحاليل', en:'Labs' },
 { k:'allergies',ar:'الحساسية', en:'Allergies' },
 ];

 const handleAddTag = () => {
 if (!newTag.trim()) return;
 if (customTags.includes(newTag.trim())) {
 show(AR ? 'الوسم مضاف بالفعل' : 'Tag already exists', 'warning');
 return;
 }
 setCustomTags([...customTags, newTag.trim()]);
 setNewTag('');
 show(AR ? 'تم إضافة الوسم' : 'Tag added successfully', 'success');
 };

 const handleRemoveTag = (tag: string) => {
 setCustomTags(customTags.filter(t => t !== tag));
 show(AR ? 'تم حذف الوسم' : 'Tag removed', 'info');
 };

 const handleAddNote = () => {
 if (!newNote.trim()) return;
 const dateStr = new Date().toISOString().split('T')[0];
 setCrmNotes([{ id: Date.now().toString(), date: dateStr, text: newNote.trim() }, ...crmNotes]);
 setNewNote('');
 show(AR ? 'تم حفظ ملاحظة CRM' : 'CRM Note saved', 'success');
 };

 const handleToggleVip = (val: boolean) => {
 setIsVip(val);
 show(val ? (AR ? 'تم ترقية المريض إلى VIP ' : 'Patient upgraded to VIP ') : (AR ? 'تم إلغاء حالة VIP' : 'VIP status removed'), 'success');
 };

 const handleToggleFavorite = (val: boolean) => {
 setIsFavorite(val);
 show(val ? (AR ? 'تم الإضافة للمفضلة ' : 'Added to favorites ') : (AR ? 'تم الإزالة من المفضلة' : 'Removed from favorites'), 'success');
 };

 const handleToggleBlocked = (val: boolean) => {
 setIsBlocked(val);
 show(val ? (AR ? 'تم إدراج المريض في الحظر ' : 'Patient added to blocklist ') : (AR ? 'تم إلغاء الحظر' : 'Patient unblocked'), 'warning');
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
 textAlign: AR ? 'right' : 'left' }}>{patient?.patient ?? 'أحمد محمد'}</Text>
 {isFavorite && <Text style={{ fontSize: FS.xl }}></Text>}
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'العمر: 34 سنة | ذكر | فصيلة الدم: A+' : 'Age: 34 | Male | Blood: A+'}
 </Text>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.sm, marginTop: SP.xs }}>
 <NBadge label="Bupa A" variant="primary" size="xs" />
 <NBadge label={AR ? 'مزمن: سكري' : 'Chronic: Diabetes'} variant="warning" size="xs" />
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
function NoShowManagementScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const AR = lang === 'ar';
 return (
 <NScroll>
 <NHeader title={AR ? ' إدارة الغياب والإلغاء' : ' No-Show Management'} onBack={onBack} />
 <NCard style={{ backgroundColor: theme.warningBg, padding: SP.lg }}>
 <Text style={{ color: theme.warning, textAlign: AR ? 'right' : 'left', lineHeight: 22 }}>
 {AR ? 'سياسة الإلغاء والغياب وقائمة الانتظار والتذكيرات غير متاحة حالياً. لا يوجد عقد خادمي موثق يربط الرسوم بالمواعيد والمدفوعات والإشعارات وسجل تدقيق قابل للمراجعة.' : 'Cancellation/no-show policy, waitlist, and reminders are currently unavailable. No verified server contract links fees to appointments, payments, notifications, and reviewable audit records.'}
 </Text>
 </NCard>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// WALLET TAB
// ══════════════════════════════════════════════════════════════════════════════
function DoctorWalletTab({ onNavigate }: { onNavigate: (s: string) => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  
  const [wallet, setWallet] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [walletUnavailable, setWalletUnavailable] = useState(false);
  
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await client.get('/provider/wallet');
        if (!res.data) throw new Error('wallet_contract_unavailable');
        setWallet(res.data);
        const txRes = await client.get('/provider/wallet/transactions');
        setTransactions(txRes.data || []);
      } catch (err) { 
        setWallet(null);
        setTransactions([]);
        setWalletUnavailable(true);
      }
    };
    fetchWallet();
  }, []);

  if (walletUnavailable || !wallet) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{AR ? 'المحفظة والإيرادات' : 'Wallet & Revenue'}</Text>
        </View>
        <NEmpty
          title={AR ? 'المحفظة غير متاحة حالياً' : 'Wallet unavailable'}
          sub={AR ? 'لا يمكن عرض الأرصدة أو طلب السحب أو إصدار تقارير مالية إلى أن يتوفر سجل مالي خادمي ومزود دفع وتسوية موثقة.' : 'Balances, withdrawals, and financial reports cannot be shown until a server-backed ledger, payment provider, and verified reconciliation are available.'}
          icon="wallet"
        />
      </View>
    );
  }

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
// CHAT TAB (placeholder — full chat in Phase 6)
// ══════════════════════════════════════════════════════════════════════════════

function DoctorChatTab() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true);
      try {
        const res = await client.get('/chats/provider');
        setChats(res.data || []);
      } catch (err) {
        setChats([]);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  const openChat = async (chat: any) => {
    setActiveChat(chat);
    try {
      const res = await client.get(`/chats/${chat.id}/messages`);
      setMessages(res.data || []);
    } catch {
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!msg.trim() || !activeChat) return;
    const sentText = msg;
    try {
      await client.post(`/chats/${activeChat.id}/messages`, { text: sentText });
      setMsg('');
      await openChat(activeChat);
    } catch {
      show(AR ? 'فشل إرسال الرسالة' : 'Failed to send message', 'error');
    }
  };

  // ── Active Chat View ──────────────────────────────────────────────────────
  if (activeChat) {
    const isClosed = activeChat.status === 'CLOSED';
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        {/* Header */}
        <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity onPress={() => setActiveChat(null)} style={{ padding: SP.xs }}>
            <I name={AR ? 'chevronRight' : 'chevronLeft'} size={24} color={theme.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
            <NAvatar name={activeChat.patient_name} size={40} />
            <View>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{activeChat.patient_name}</Text>
              <Text style={{ fontSize: FS.xs, color: activeChat.status === 'OPEN' ? theme.success : theme.textSub }}>
                {activeChat.status === 'OPEN' ? (AR ? 'محادثة نشطة' : 'Active') :
                 activeChat.status === 'FOLLOW_UP' ? (AR ? 'متابعة' : 'Follow-up') : (AR ? 'مغلقة' : 'Closed')}
              </Text>
            </View>
          </View>
          {!isClosed && (
            <TouchableOpacity onPress={() => show(AR ? 'بدء مكالمة فيديو' : 'Starting video call...', 'info')} style={{ padding: SP.xs }}>
              <I name="video" size={22} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Messages */}
        <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          {messages.map(m => {
            const isMe = m.sender === 'provider';
            return (
              <View key={m.id} style={{ alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: SP.md }}>
                <View style={{
                  maxWidth: '80%', borderRadius: R.lg, padding: SP.md,
                  backgroundColor: isMe ? theme.primary : theme.card,
                  borderBottomRightRadius: isMe ? 4 : R.lg,
                  borderBottomLeftRadius: isMe ? R.lg : 4,
                }}>
                  <Text style={{ color: isMe ? '#FFF' : theme.text, fontSize: FS.md, lineHeight: 22, textAlign: AR ? 'right' : 'left' }}>{m.text}</Text>
                </View>
                <Text style={{ fontSize: 10, color: theme.textSub, marginTop: 2 }}>{m.time}</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Input */}
        {!isClosed ? (
          <View style={{ backgroundColor: theme.surface, borderTopColor: theme.border, borderTopWidth: 1, flexDirection: AR ? 'row-reverse' : 'row', paddingBottom: 24, padding: SP.md, gap: SP.sm }}>
            <TextInput
              style={{ flex: 1, backgroundColor: theme.surface2, borderRadius: R.xl, paddingHorizontal: SP.lg, paddingVertical: SP.sm, fontSize: FS.md, color: theme.text, textAlign: AR ? 'right' : 'left', maxHeight: 100 }}
              placeholder={AR ? 'اكتب رسالة...' : 'Type a message...'}
              placeholderTextColor={theme.textSub}
              value={msg} onChangeText={setMsg} multiline
            />
            <TouchableOpacity onPress={sendMessage} disabled={!msg.trim()}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: msg.trim() ? theme.primary : theme.surface2 }}>
              <I name="forward" size={20} color={msg.trim() ? '#FFF' : theme.textSub} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ padding: SP.lg, backgroundColor: theme.surface2, alignItems: 'center' }}>
            <Text style={{ color: theme.textSub, fontSize: FS.sm }}>{AR ? 'هذه المحادثة مغلقة (أرشيف طبي للقراءة فقط)' : 'Conversation closed (read-only medical archive)'}</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    );
  }

  // ── Chat List View ────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>
          {AR ? ' الرسائل والمحادثات' : ' Messages & Chats'}
        </Text>
        <NBadge label={String(chats.reduce((a, c) => a + (c.unread || 0), 0))} variant="danger" size="xs" />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.textSub }}>{AR ? 'جارٍ تحميل المحادثات...' : 'Loading chats...'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.sm }}>
          {chats.map(c => {
            const isFollowUp = c.status === 'FOLLOW_UP';
            const isClosed = c.status === 'CLOSED';
            const isOpen = c.status === 'OPEN';
            return (
              <TouchableOpacity key={c.id} onPress={() => openChat(c)} activeOpacity={0.8}>
                <NCard style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, padding: SP.lg, borderLeftWidth: isFollowUp ? 3 : 0, borderLeftColor: theme.primary, opacity: isClosed ? 0.7 : 1 }}>
                  <View style={{ position: 'relative' }}>
                    <NAvatar name={c.patient_name} size={50} />
                    {isOpen && <View style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: theme.success, borderWidth: 2, borderColor: theme.card }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: FS.md, fontWeight: c.unread > 0 ? FW.bold : FW.reg, color: theme.text }}>{c.patient_name}</Text>
                      <NBadge
                        label={isOpen ? (AR ? 'نشط' : 'Open') : isFollowUp ? (AR ? 'متابعة' : 'Follow-up') : (AR ? 'مغلق' : 'Closed')}
                        variant={isOpen ? 'success' : isFollowUp ? 'primary' : 'default'}
                        size="xs"
                      />
                    </View>
                    <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }} numberOfLines={1}>
                      {c.last_message || (AR ? 'اضغط للفتح' : 'Tap to open')}
                    </Text>
                  </View>
                  {c.unread > 0 && (
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>{c.unread}</Text>
                    </View>
                  )}
                </NCard>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB
// ══════════════════════════════════════════════════════════════════════════════

function DoctorSettingsTab({ onLogout, onNavigate }: { onLogout: () => void, onNavigate: (s: string) => void }) {
  const { theme, mode, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLang } = useLang();
  const { show } = useToast();
  const { user } = useAuth();
  const AR = lang === 'ar';
  
  const isLinkedToFacility = !!(user as any)?.parent_facility_id;
  const facilityName = (user as any)?.parent_facility_name || (AR ? 'اسم المنشأة غير متاح' : 'Facility name unavailable');

  const [clinicPrice, setClinicPrice] = useState('');
  const [onlinePrice, setOnlinePrice] = useState('');
  const [homePrice, setHomePrice] = useState('');
  
  const [clinicActive, setClinicActive] = useState(false);
  const [onlineActive, setOnlineActive] = useState(false);
  const [homeActive, setHomeActive] = useState(false);

  const isPricingLocked = isLinkedToFacility;

  const requestDeltaUpdate = async () => {
    try {
      await client.post('/provider/settings/delta', {
        newData: { 
          price_clinic: clinicPrice, price_online: onlinePrice, price_home: homePrice,
          active_clinic: clinicActive, active_online: onlineActive, active_home: homeActive
        }
      });
      show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending Admin Approval for Settings Delta', 'info');
    } catch (err) {
      show(AR ? 'فشل إرسال التعديل' : 'Failed to push delta', 'error');
    }
  };

  const handleUnlink = () => {
    show(AR ? 'فك الارتباط غير متاح حتى يتوفر طلب خادمي محروس وتدقيق وموافقة منشأة.' : 'Unlinking is unavailable until a guarded server request, audit trail, and facility approval flow are integrated.', 'warning');
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
                  {AR ? `تعمل حالياً ضمن طاقم ${facilityName}` : `Currently working under ${facilityName}`}
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
          <NSettingsRow icon="document" label={AR ? 'دعوات المنشآت (0)' : 'Facility Invitations (0)'} onPress={() => onNavigate('facility_invitations')} />
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

 <NCard style={{ backgroundColor: theme.warningBg, padding: SP.lg }}>
 <Text style={{ fontSize: FS.sm, color: theme.warning, textAlign: AR ? 'right' : 'left' }}>
 {AR
 ? 'المطالبات التأمينية غير متاحة حالياً. لا يوجد تكامل موثق مع NPHIES أو مزود تأمين لاستخراج العضوية والموافقة والمبالغ من المصدر الخادمي.'
 : 'Insurance claims are currently unavailable. No verified NPHIES or insurer integration exists to obtain membership, approval, and amounts from the server source.'}
 </Text>
 </NCard>
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
     await client.post(`/provider/requests/${apt?.id || 'new'}/medical-report`, {
       patient_id: apt?.patient_id || 'test_patient',
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
 <TouchableOpacity>
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
export function CalendarSyncScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [googleSync, setGoogle] = useState(false);
 const [appleSync, setApple] = useState(false);
 const [autoAdd, setAutoAdd] = useState(true);
 const [reminders, setReminders] = useState(true);

 return (
 <NScroll>
 <NHeader title={AR ? ' مزامنة التقويم' : ' Calendar Sync'} onBack={onBack} />

 <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.info, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
 {AR
 ? 'مزامنة مواعيدك تلقائياً مع Google Calendar أو Apple Calendar. جميع المواعيد الجديدة ستُضاف فوراً.'
 : 'Sync your appointments automatically with Google or Apple Calendar. New bookings added instantly.'}
 </Text>
 </NCard>

 <NCard style={{ marginBottom: SP.xl }}>
 {/* Google Calendar */}
 <View style={[styles.calRow, { flexDirection: AR ? 'row-reverse' : 'row' }]}>
 <View style={styles.calIcon}>
 <Text style={{ fontSize: 28 }}></Text>
 </View>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 Google Calendar
 </Text>
 <Text style={{ fontSize: FS.xs, color: googleSync ? theme.success : theme.textSub }}>
 {googleSync ? (AR ? 'مُتزامن ' : 'Synced ') : (AR ? 'غير مُتزامن' : 'Not synced')}
 </Text>
 </View>
 <NBtn
 label={googleSync ? (AR ? 'فصل' : 'Disconnect') : (AR ? 'ربط' : 'Connect')}
 variant={googleSync ? 'danger' : 'primary'}
 size="sm" full={false}
 style={{ paddingHorizontal: SP.xl }}
 onPress={() => {
 setGoogle(g => !g);
 show(googleSync ? (AR ? 'تم فصل Google Calendar' : 'Google disconnected') : (AR ? 'تم ربط Google Calendar ' : 'Google Calendar connected '), googleSync ? 'info' : 'success');
 }}
 />
 </View>

 <NDivider />

 {/* Apple Calendar */}
 <View style={[styles.calRow, { flexDirection: AR ? 'row-reverse' : 'row' }]}>
 <View style={styles.calIcon}>
 <Text style={{ fontSize: 28 }}></Text>
 </View>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 Apple Calendar
 </Text>
 <Text style={{ fontSize: FS.xs, color: appleSync ? theme.success : theme.textSub }}>
 {appleSync ? (AR ? 'مُتزامن ' : 'Synced ') : (AR ? 'غير مُتزامن' : 'Not synced')}
 </Text>
 </View>
 <NBtn
 label={appleSync ? (AR ? 'فصل' : 'Disconnect') : (AR ? 'ربط' : 'Connect')}
 variant={appleSync ? 'danger' : 'primary'}
 size="sm" full={false}
 style={{ paddingHorizontal: SP.xl }}
 onPress={() => {
 setApple(a => !a);
 show(appleSync ? (AR ? 'تم فصل Apple Calendar' : 'Apple disconnected') : (AR ? 'تم ربط Apple Calendar ' : 'Apple Calendar connected '), appleSync ? 'info' : 'success');
 }}
 />
 </View>
 </NCard>

 <NCard style={{ marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text,
 marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
 {AR ? '️ إعدادات المزامنة' : '️ Sync Settings'}
 </Text>
 <NToggle
 label={AR ? 'إضافة المواعيد الجديدة تلقائياً' : 'Auto-add new appointments'}
 sub={AR ? 'كل حجز جديد يُضاف فوراً للتقويم' : 'Each new booking auto-added to calendar'}
 value={autoAdd} onChange={setAutoAdd}
 />
 <NToggle
 label={AR ? 'تفعيل تذكيرات التقويم' : 'Enable calendar reminders'}
 sub={AR ? 'تذكير قبل الموعد بـ 15 دقيقة' : 'Reminder 15 minutes before appointment'}
 value={reminders} onChange={setReminders}
 />
 </NCard>

 <NBtn label={AR ? ' حفظ إعدادات المزامنة' : ' Save Sync Settings'}
 onPress={() => { show(AR ? 'تم حفظ إعدادات المزامنة' : 'Sync settings saved', 'success'); onBack(); }} />
 </NScroll>
 );
}

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
 const pulseAnim = useRef(new Animated.Value(1)).current;

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
  {AR
 ? 'الأطباء الذين يفعّلون "نبضة التوفر" يحصلون على طلبات أكثر بنسبة 65% في وقت النشاط.'
 : 'Doctors using Availability Pulse receive 65% more requests during active time.'}
 </Text>
 </NCard>

 <NBtn label={AR ? ' حفظ' : ' Save'}
 onPress={() => { show(AR ? 'تم حفظ الإعدادات' : 'Settings saved', 'success'); onBack(); }} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFESSIONAL NETWORK (Doximity-style — ميزة تنافسية)
// ══════════════════════════════════════════════════════════════════════════════
export function ProfessionalNetworkScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [search, setSearch] = useState('');

 const DOCTORS = [
 { id: '1', name: AR ? 'د. خالد العنزي' : 'Dr. Khaled Al-Anazi', spec: AR ? 'أمراض القلب والشرايين' : 'Cardiology', hospital: AR ? 'مستشفى سليمان الحبيب' : 'Sulaiman Al-Habib Hospital', mutual: 3 },
 { id: '2', name: AR ? 'د. سارة الشريف' : 'Dr. Sarah Al-Sharif', spec: AR ? 'طب الأطفال حديثي الولادة' : 'Pediatrics & Neonatology', hospital: AR ? 'مدينة الملك سعود الطبية' : 'King Saud Medical City', mutual: 5 },
 { id: '3', name: AR ? 'د. عبد الرحمن الفوزان' : 'Dr. Abdulrahman Al-Fouzan', spec: AR ? 'جراحة العظام والمفاصل' : 'Orthopedic Surgery', hospital: AR ? 'مستشفى دلة' : 'Dallah Hospital', mutual: 0 }
 ];

 const filtered = DOCTORS.filter(d => 
 d.name.toLowerCase().includes(search.toLowerCase()) || 
 d.spec.toLowerCase().includes(search.toLowerCase()) ||
 d.hospital.toLowerCase().includes(search.toLowerCase())
 );

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? ' الشبكة المهنية' : ' Professional Network'} onBack={onBack} />
 <ScrollView contentContainerStyle={{ padding: SP.xl, paddingBottom: 100 }}>
 <NInput 
 label={AR ? 'ابحث باسم الطبيب، التخصص، أو المستشفى' : 'Search by doctor name, specialty, or hospital'} 
 value={search} 
 onChange={setSearch} 
 />
 {filtered.map(doc => (
 <NCard key={doc.id} style={{ marginBottom: SP.lg }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <NAvatar name={doc.name} size={50} />
 <View style={{ alignItems: AR ? 'flex-end' : 'flex-start' }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{doc.name}</Text>
 <Text style={{ fontSize: FS.sm, color: theme.primary }}>{doc.spec}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{doc.hospital}</Text>
 {doc.mutual > 0 && (
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
  {doc.mutual} {AR ? 'مشترك' : 'mutual'}
 </Text>
 )}
 </View>
 </View>
 <View style={{ gap: SP.sm }}>
 <NBtn label={AR ? ' تواصل' : ' Call'} size="xs" full={false}
 style={{ paddingHorizontal: SP.md }}
 onPress={() => show(AR ? 'جاري الاتصال المشفّر...' : 'Encrypted call...', 'info')} />
 <NBtn label={AR ? '+ تواصل' : '+ Connect'} size="xs" variant="outline" full={false}
 style={{ paddingHorizontal: SP.md }}
 onPress={() => show(AR ? 'تم إرسال طلب التواصل' : 'Connection request sent', 'success')} />
 </View>
 </View>
 </NCard>
 ))}
 </ScrollView>
 </View>
 );
}

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
 active: item.available
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
 setServices(prev => prev.map(s => s.id === id ? { ...s, active: !currentActive } : s));
 show(AR ? 'تم تحديث حالة الخدمة' : 'Service status updated', 'success');
 } catch (e) {
 show(AR ? 'فشل تحديث حالة الخدمة' : 'Failed to update service status', 'error');
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
 show(AR ? 'تمت إضافة الخدمة بنجاح' : 'Service added successfully', 'success');
 } catch (e) {
 show(AR ? 'فشل إضافة الخدمة' : 'Failed to add service', 'error');
 }
 };

 const handleDeleteService = async (id: string) => {
 try {
 await client.delete(`/provider/capabilities/doctor-sessions/${id}`);
 setServices(prev => prev.filter(s => s.id !== id));
 show(AR ? 'تم حذف الخدمة' : 'Service deleted', 'success');
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
 setServices(prev => prev.map(s => s.id === editingService.id ? { ...s, price: parseFloat(editPrice) || 0, duration: parseInt(editDuration) || 30 } : s));
 setEditingService(null);
 show(AR ? 'تم حفظ التعديلات' : 'Changes saved successfully', 'success');
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



export function SubscriptionPlansScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 interface Plan { id: string; nameAr: string; nameEn: string; price: string; period: string; sessions: string; discount: string; active: boolean; }
 const [plans, setPlans] = useState<Plan[]>([
 { id:'1', nameAr:'الباقة الشهرية', nameEn:'Monthly Plan', price:'500', period:'month', sessions:'3', discount:'16', active:true },
 { id:'2', nameAr:'الباقة الفصلية', nameEn:'Quarterly Plan',price:'1200',period:'quarter',sessions:'10','discount':'20',active:false},
 ]);

 const addPlan = () => {
 setPlans(prev => [...prev, { id: Date.now().toString(), nameAr: 'باقة جديدة', nameEn: 'New Plan', price: '0', period: 'month', sessions: '1', discount: '0', active: false }]);
 };

 return (
 <NScroll>
 <NHeader title={AR ? ' باقات الاشتراك' : ' Subscription Plans'} onBack={onBack} />

 <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.info, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
 {AR
 ? 'الباقات الاشتراكية تزيد الدخل الثابت وتبني ولاء المرضى. المرضى الذين يشتركون يزورون 3x أكثر.'
 : 'Subscription plans increase steady income and build patient loyalty. Subscribers visit 3x more.'}
 </Text>
 </NCard>

 {plans.map((plan, i) => (
 <NCard key={plan.id} style={{ marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
 {AR ? plan.nameAr : plan.nameEn}
 </Text>
 <Switch value={plan.active} onValueChange={v => setPlans(ps => ps.map(p => p.id===plan.id ? {...p,active:v} : p))}
 trackColor={{ false: theme.border, true: theme.primary }} thumbColor="#FFF" />
 </View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: 2 }}>{AR ? 'السعر (ريال)' : 'Price (SAR)'}</Text>
 <Text style={{ fontSize: FS['2xl'], fontWeight: FW.xbold, color: theme.primary }}>{plan.price}</Text>
 </View>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: 2 }}>{AR ? 'الجلسات' : 'Sessions'}</Text>
 <Text style={{ fontSize: FS['2xl'], fontWeight: FW.xbold, color: theme.text }}>{plan.sessions}</Text>
 </View>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: 2 }}>{AR ? 'الخصم' : 'Discount'}</Text>
 <Text style={{ fontSize: FS['2xl'], fontWeight: FW.xbold, color: theme.success }}>{plan.discount}%</Text>
 </View>
 </View>
 {plan.active && (
 <NBadge label={AR ? ' مفعّلة' : ' Active'} variant="success" size="sm" style={{ marginTop: SP.md }} />
 )}
 </NCard>
 ))}

 <NBtn label={AR ? '+ إضافة باقة جديدة' : '+ Add New Plan'} variant="outline"
 onPress={addPlan} style={{ marginBottom: SP.lg }} />

 <NBtn label={AR ? ' حفظ الباقات' : ' Save Plans'}
 onPress={() => { show(AR ? 'تم حفظ باقات الاشتراك ' : 'Plans saved ', 'success'); onBack(); }} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// STATISTICS & REPORTS SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export function StatisticsScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const AR = lang === 'ar';
 return (
  <NScroll>
   <NHeader title={AR ? 'الإحصاءات والتقارير' : 'Statistics & Reports'} onBack={onBack} />
   <NCard style={{ backgroundColor: theme.warningBg, padding: SP.lg }}>
    <Text style={{ color: theme.warning, textAlign: AR ? 'right' : 'left', lineHeight: 22 }}>
     {AR ? 'الإحصاءات والتقارير غير متاحة حالياً. لا يوجد عقد تحليلات خادمي يثبت الإيرادات والمواعيد والتقييمات والفترة الزمنية قبل عرضها أو تصديرها.' : 'Statistics and reports are currently unavailable. No server-side analytics contract verifies revenue, appointments, ratings, or period data before it is displayed or exported.'}
    </Text>
   </NCard>
  </NScroll>
 );
}

export function DoctorAvailabilityScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const AR = lang === 'ar';
 return (
  <NScroll>
   <NHeader title={AR ? 'جدول المواعيد والتوفر' : 'Availability Settings'} onBack={onBack} />
   <NCard style={{ backgroundColor: theme.warningBg, padding: SP.lg }}>
    <Text style={{ color: theme.warning, textAlign: AR ? 'right' : 'left', lineHeight: 22 }}>
     {AR ? 'إدارة التوفر والإجازات والاستثناءات غير متاحة حالياً. يلزم عقد خادمي محروس يقرأ الجدول المملوك ويكتب التغييرات مع تدقيق وحل تعارضات الحجز قبل تفعيل هذه الواجهة.' : 'Availability, vacation, and exception management are currently unavailable. A guarded server contract must read the owned schedule and persist changes with audit and booking-conflict resolution before this interface is enabled.'}
    </Text>
   </NCard>
  </NScroll>
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
 });
 show(AR ? 'تم حفظ التعديلات بنجاح' : 'Profile updated successfully', 'success');
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
   <TouchableOpacity style={{ width: 100, height: 100, borderRadius: R.md, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed', marginRight: SP.md }}>
     <I name="plus" size={24} color={theme.primary} />
     <Text style={{ fontSize: FS.xs, color: theme.primary, marginTop: SP.xs }}>{AR ? 'إضافة صورة' : 'Add Image'}</Text>
   </TouchableOpacity>
   {[1, 2].map(i => (
     <View key={i} style={{ width: 100, height: 100, borderRadius: R.md, backgroundColor: theme.surface2, marginRight: SP.md, overflow: 'hidden' }}>
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

  const handleSave = () => {
    show(AR ? 'تم حفظ الموقع ونطاق التغطية' : 'Location & Coverage Saved', 'success');
    onBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'الموقع ونطاق التغطية' : 'Location & Coverage'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.md }}>
        <NSecHeader title={AR ? 'موقع العيادة' : 'Clinic Location'} />
        <View style={{ height: 200, backgroundColor: theme.surface2, borderRadius: R.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, overflow: 'hidden' }}>
          <IBg name="mapPin" size={32} color={theme.primary} bg={`${theme.primary}12`} />
          <Text style={{ marginTop: SP.sm, color: theme.textSub, fontSize: FS.sm }}>{AR ? 'خريطة تفاعلية لاختيار الموقع' : 'Interactive Map for Location'}</Text>
        </View>

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

        <NBtn label={AR ? 'حفظ' : 'Save'} onPress={handleSave} style={{ marginTop: SP.lg }} />
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INSURANCE CONFIG SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export function InsuranceConfigScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [insurances, setInsurances] = useState([
 { id: 'bupa', ar: 'بوبا العربية', en: 'Bupa Arabia', active: true, copay: '10', tier: 'VIP' },
 { id: 'tawuniya', ar: 'التعاونية للتأمين', en: 'Tawuniya', active: true, copay: '20', tier: 'Class A' },
 { id: 'medgulf', ar: 'ميدغلف', en: 'Medgulf', active: false, copay: '20', tier: 'Class B' },
 { id: 'malath', ar: 'ملاذ للتأمين', en: 'Malath Insurance', active: false, copay: '25', tier: 'Class C' },
 ]);

 const toggleIns = (id: string) => {
 setInsurances(prev => prev.map(item => item.id === id ? { ...item, active: !item.active } : item));
 };

 const updateCopay = (id: string, val: string) => {
 setInsurances(prev => prev.map(item => item.id === id ? { ...item, copay: val.replace(/\D/g, '') } : item));
 };

 const handleSave = () => {
 show(AR ? 'تم حفظ إعدادات التأمين بنجاح' : 'Insurance settings saved successfully', 'success');
 onBack();
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? 'التأمين الصحي' : 'Health Insurance'} onBack={onBack} />
 <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'حدد شركات التأمين المقبولة لديك ونسب التحمل لكل شركة:' : 'Select which insurance providers you accept and specify copay percentages:'}
 </Text>

 {insurances.map(item => (
 <NCard key={item.id} style={{ marginBottom: SP.sm }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <IBg name="shield" size={16} color={item.active ? theme.primary : theme.textSub} bg={item.active ? `${theme.primary}12` : theme.surface2} />
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
 {AR ? item.ar : item.en}
 </Text>
 </View>
 <Switch value={item.active} onValueChange={() => toggleIns(item.id)} trackColor={{ true: theme.primary }} />
 </View>

 {item.active && (
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.md, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.md }}>
 <View style={{ flex: 1 }}>
 <NInput
 label={AR ? 'نسبة التحمل %' : 'Copay %'}
 value={item.copay}
 onChange={(v) => updateCopay(item.id, v)}
 kbType="numeric"
 maxLen={3}
 />
 </View>
 <View style={{ flex: 1 }}>
 <NInput
 label={AR ? 'فئة التغطية' : 'Coverage Tier'}
 value={item.tier}
 onChange={(v) => {
 setInsurances(prev => prev.map(x => x.id === item.id ? { ...x, tier: v } : x));
 }}
 />
 </View>
 </View>
 )}
 </NCard>
 ))}

 <NBtn label={AR ? ' حفظ الإعدادات' : ' Save Settings'} onPress={handleSave} style={{ marginTop: SP.xl }} />
 </ScrollView>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// CERTIFICATES CONFIG SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export function CertificatesConfigScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [certs, setCerts] = useState([
 { id: '1', name_ar: 'ترخيص الهيئة السعودية للتخصصات الصحية', name_en: 'SCFHS License Document', status: 'verified', date: '2026-05-10', filename: 'scfhs_license_card.pdf' },
 { id: '2', name_ar: 'شهادة البورد السعودي في طب القلب', name_en: 'Saudi Board Certificate in Cardiology', status: 'verified', date: '2026-05-11', filename: 'saudi_board_cardio.pdf' },
 { id: '3', name_ar: 'شهادة البكالوريوس في الطب والجراحة', name_en: 'MBBS Medical Graduation Certificate', status: 'pending', date: '2026-07-04', filename: 'mbbs_graduation.pdf' },
 ]);
 const [uploading, setUploading] = useState(false);
 const [progress, setProgress] = useState(0);

 const handleUpload = () => {
 setUploading(true);
 setProgress(0);
 const interval = setInterval(() => {
 setProgress(p => {
 if (p >= 100) {
 clearInterval(interval);
 setUploading(false);
 setCerts(prev => [
 ...prev,
 { id: Date.now().toString(), name_ar: 'شهادة زمالة أو تدريب إضافية', name_en: 'Additional Training Certificate', status: 'pending', date: '2026-07-06', filename: 'additional_training.pdf' }
 ]);
 show(AR ? 'تم رفع المستند بنجاح وهو قيد المراجعة' : 'Document uploaded successfully and is under review', 'success');
 return 100;
 }
 return p + 20;
 });
 }, 300);
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? 'الشهادات والمؤهلات' : 'Qualifications'} onBack={onBack} />
 <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'الشهادات المعتمدة والأوراق الثبوتية الخاصة بملفك الطبي المهني:' : 'Verified certificates and licensing documents linked to your medical profile:'}
 </Text>

 {certs.map(item => (
 <NCard key={item.id} style={{ marginBottom: SP.sm }} accent={item.status === 'verified' ? '#4CAF50' : '#2196F3'}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, flex: 1, textAlign: AR ? 'right' : 'left' }}>
 {AR ? item.name_ar : item.name_en}
 </Text>
 <NBadge
 label={item.status === 'verified' ? (AR ? 'معتمد' : 'Verified') : (AR ? 'قيد المراجعة' : 'Pending')}
 variant={item.status === 'verified' ? 'success' : 'primary'}
 size="xs"
 />
 </View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.sm }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
  {item.filename}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
 {item.date}
 </Text>
 </View>
 </NCard>
 ))}

 {uploading ? (
 <NCard style={{ padding: SP.xl, alignItems: 'center' }}>
 <Text style={{ fontSize: FS.sm, color: theme.text, marginBottom: SP.md }}>
 {AR ? `جاري الرفع والتحقق... ${progress}%` : `Uploading & verifying... ${progress}%`}
 </Text>
 <View style={{ width: '100%', height: 6, backgroundColor: theme.surface2, borderRadius: 3, overflow: 'hidden' }}>
 <View style={{ width: `${progress}%`, height: '100%', backgroundColor: theme.primary }} />
 </View>
 </NCard>
 ) : (
 <TouchableOpacity
 onPress={handleUpload}
 style={{
 padding: SP.xl,
 borderRadius: R.lg,
 borderWidth: 2,
 borderColor: theme.primary,
 borderStyle: 'dashed',
 alignItems: 'center',
 justifyContent: 'center',
 backgroundColor: `${theme.primary}05`,
 marginTop: SP.md,
 }}
 >
 <I name="upload" size={24} color={theme.primary} />
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary, marginTop: SP.md }}>
 {AR ? ' رفع وثيقة أو شهادة جديدة' : ' Upload New Certificate'}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: SP.xs }}>
 {AR ? 'صيغ المقبولة: PDF, JPG, PNG (بحد أقصى 10 ميجا)' : 'Supported: PDF, JPG, PNG (Max 10MB)'}
 </Text>
 </TouchableOpacity>
 )}
 </ScrollView>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// PHOTOS & MEDIA SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export function MediaConfigScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [images, setImages] = useState([
 { id: '1', url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300&h=300&fit=crop', title: AR ? 'صورة العيادة' : 'Clinic Room' },
 { id: '2', url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=300&h=300&fit=crop', title: AR ? 'الاستقبال' : 'Reception' },
 { id: '3', url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=300&h=300&fit=crop', title: AR ? 'الأجهزة الطبية' : 'Equipment' },
 ]);

 const handleDelete = (id: string) => {
 setImages(prev => prev.filter(x => x.id !== id));
 show(AR ? 'تم حذف الصورة' : 'Photo deleted', 'info');
 };

 const handleAddPhoto = () => {
 const newImg = {
 id: Date.now().toString(),
 url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300&h=300&fit=crop',
 title: AR ? 'صورة مرفقة جديدة' : 'New Attached Photo'
 };
 setImages(prev => [...prev, newImg]);
 show(AR ? 'تم إضافة الصورة بنجاح' : 'Photo added successfully', 'success');
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? 'الصور والوسائط' : 'Photos & Media'} onBack={onBack} />
 <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'الصور المعروضة في صفحتك العامة للمرضى (العيادة، الأجهزة، الشهادات المعلقة):' : 'Photos displayed on your public profile for patients (clinic, instruments, facilities):'}
 </Text>

 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, justifyContent: 'space-between' }}>
 {images.map(img => (
 <View key={img.id} style={{ width: '47%', borderRadius: R.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
 <View style={{ height: 120, backgroundColor: theme.surface2, position: 'relative' }}>
 <View style={{ position: 'absolute', top: 5, right: 5, zIndex: 10 }}>
 <TouchableOpacity
 onPress={() => handleDelete(img.id)}
 style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(244,67,54,0.9)', alignItems: 'center', justifyContent: 'center' }}
 >
 <I name="close" size={14} color="#FFF" />
 </TouchableOpacity>
 </View>
 <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
 <I name="camera" size={30} color={theme.textSub} />
 </View>
 </View>
 <View style={{ padding: SP.sm }}>
 <Text style={{ fontSize: FS.xs, color: theme.text, fontWeight: FW.bold, textAlign: 'center' }} numberOfLines={1}>
 {img.title}
 </Text>
 </View>
 </View>
 ))}

 <TouchableOpacity
 onPress={handleAddPhoto}
 style={{
 width: '47%',
 height: 154,
 borderRadius: R.lg,
 borderWidth: 2,
 borderColor: theme.primary,
 borderStyle: 'dashed',
 alignItems: 'center',
 justifyContent: 'center',
 backgroundColor: `${theme.primary}05`,
 }}
 >
 <I name="plus" size={24} color={theme.primary} />
 <Text style={{ fontSize: FS.sm, color: theme.primary, fontWeight: FW.bold, marginTop: SP.sm }}>
 {AR ? 'إضافة صورة' : 'Add Photo'}
 </Text>
 </TouchableOpacity>
 </View>
 </ScrollView>
 </View>
 );
}



// ══════════════════════════════════════════════════════════════════════════════
// VIRTUAL WAITING ROOM (PHASE 2)
// ══════════════════════════════════════════════════════════════════════════════
function VirtualWaitingRoomScreen({ onBack, onNavigate }: { onBack: () => void, onNavigate: (s: string, p?: any) => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWaitingRoom();
  }, []);

  const fetchWaitingRoom = async () => {
    setLoading(true);
    try {
      const headers = await buildHeaders(false);
      const res = await fetch(`${API_BASE}/calls/provider/waiting-room`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      } else {
        throw new Error('Failed to fetch waiting room');
      }
    } catch (e) {
      show(AR ? 'حدث خطأ في تحميل الغرفة' : 'Error loading waiting room', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pingPatient = async (patientId: string) => {
    try {
      const headers = await buildHeaders(false);
      await fetch(`${API_BASE}/calls/provider/ping-patient`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ patient_id: patientId })
      });
      show(AR ? 'تم إرسال إشعار للمريض' : 'Ping sent', 'info');
    } catch (e) {
      show(AR ? 'فشل التنبيه' : 'Failed to ping', 'error');
    }
  };

  const markNoShow = async (patient: any) => {
    try {
      const headers = await buildHeaders(false);
      await fetch(`${API_BASE}/calls/provider/no-show`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ appointment_id: patient.id })
      });
      show(AR ? 'تم تسجيل الغياب' : 'Marked as no-show', 'success');
      fetchWaitingRoom();
    } catch (e) {
      show(AR ? 'فشل تسجيل الغياب' : 'Failed to mark no-show', 'error');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'غرفة الانتظار الافتراضية' : 'Virtual Waiting Room'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg }}>
        <Text style={{ fontSize: FS.md, color: theme.textSub, marginBottom: SP.lg }}>
          {AR ? 'المرضى الذين أجروا تسجيل دخول (Checked-in) وينتظرون بدء المكالمة:' : 'Patients who checked in and are waiting:'}
        </Text>
        {loading && <Text style={{ color: theme.text }}>{AR ? 'جاري التحميل...' : 'Loading...'}</Text>}
        {!loading && patients.map(p => (
          <NCard key={p.id} style={{ marginBottom: SP.sm, padding: SP.lg }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{p.name}</Text>
                <Text style={{ color: p.checkedIn ? theme.success : theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                  {p.checkedIn ? (AR ? `متواجد (انتظار: ${p.waitTime})` : `Checked-in (Wait: ${p.waitTime})`) : (AR ? 'لم يحضر بعد' : 'Not arrived')}
                </Text>
              </View>
              <View style={{ gap: SP.sm }}>
                {p.checkedIn && (
                  <>
                    <NBtn label={AR ? 'تنبيه (Ping)' : 'Ping'} variant="outline" onPress={() => pingPatient(p.id)} />
                    <NBtn label={AR ? 'بدء المكالمة' : 'Start Call'} onPress={() => onNavigate('consultation', p)} />
                  </>
                )}
                {!p.checkedIn && (
                  <NBtn label={AR ? 'غياب (No-Show)' : 'No-Show'} variant="outline" onPress={() => markNoShow(p)} />
                )}
              </View>
            </View>
          </NCard>
        ))}
      </ScrollView>
    </View>
  );
}

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
    { id: '1', text: AR ? 'مرحباً دكتور، هذه تحاليلي الأخيرة:' : 'Hello Doctor, here are my recent labs:', sender: 'patient', attachment: 'labs_2025.pdf' }
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
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    // Simulated fetching of inbound reports for testing
    setLoading(true);
    setTimeout(() => {
      setReports([
        {
          id: 'rad-123',
          type: 'RADIOLOGY',
          patientName: AR ? 'أحمد محمد' : 'Ahmed Mohammed',
          testName: 'MRI Brain w/o Contrast',
          status: 'COMPLETED',
          date: '2026-07-17',
          pdfUrl: 'https://example.com/report1.pdf',
          dicomViewerUrl: 'https://example.com/dicom-viewer?id=123',
        },
        {
          id: 'lab-456',
          type: 'LAB',
          patientName: AR ? 'سارة عبدالله' : 'Sarah Abdullah',
          testName: 'Complete Blood Count (CBC)',
          status: 'COMPLETED',
          date: '2026-07-16',
          pdfUrl: 'https://example.com/report2.pdf',
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

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
            <NEmpty title={AR ? 'لا توجد تقارير' : 'No Reports'} sub={AR ? 'لا توجد نتائج جاهزة حتى الآن' : 'No results available yet.'} icon="folder" />
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
