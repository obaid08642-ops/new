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
import { Stack, VirtualWaitingRoomScreen, styles } from './_shared';
import { RequestTestScreen } from './RequestTestScreen';
import { EPrescriptionScreen } from './EPrescriptionScreen';
import { SickLeaveScreen } from './SickLeaveScreen';
import { MedicalReportScreen } from './MedicalReportScreen';
import { ReferralScreen } from './ReferralScreen';
import { DoctorAvailabilityScreen } from './DoctorAvailabilityScreen';
import { DoctorServiceManagementScreen } from './DoctorServiceManagementScreen';
import { CertificatesConfigScreen, PreVisitChatScreen, InboundMedicalReportsScreen } from './CertificatesConfigScreen';
import { DoctorLocationScreen } from './DoctorLocationScreen';
import { DoctorWalletTab } from './DoctorWalletTab';
import { DoctorSettingsTab } from './DoctorSettingsTab';
import { PatientFileScreen } from './PatientFileScreen';
import { DoctorProfileEditScreen } from './DoctorProfileEditScreen';

// ══════════════════════════════════════════════════════════════════════════════
// HOME TAB
// ══════════════════════════════════════════════════════════════════════════════
export function DoctorHomeTab({ onNavigate, onTriggerAlarm }: { onNavigate: (s: string, p?: any) => void; onTriggerAlarm: () => void }) {
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
    let presence: any = null;
    let disposed = false;
    if (user?.id) {
      const cleanUrl = API_BASE.replace('/api', '').replace('/v1', '');
      (async () => {
        if (disposed) return;
        const token = await Vault.get(SK.ACCESS);
        if (disposed || !token) return;
        socketInstance = io(cleanUrl, {
          transports: ['websocket'],
          auth: { token, client: 'provider-app' },
        });
        socketInstance.on('connect', () => socketInstance?.emit('joinProviderRoom', user.id));
        presence = setInterval(() => { try { socketInstance?.connected && socketInstance.emit('presence:heartbeat'); } catch {} }, 20000);
        socketInstance.on('incoming_urgent_request', (payload: any) => {
          setRequests(prev => [payload, ...prev]);
          playRingtone();
          onTriggerAlarm();
        });
      })();
      return () => { disposed = true; if (presence) clearInterval(presence); if (socketInstance) socketInstance.disconnect(); };
    }
    return () => { disposed = true; if (presence) clearInterval(presence); if (socketInstance) socketInstance.disconnect(); };
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
 <NStatCard icon="" label={AR ? 'طلبات جديدة' : 'New Requests'} value={String(stats.pendingCount)} color={tokens.warning} style={{ width: '47%' }} />
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
 <NCard key={req.id} style={{ marginBottom: SP.md }} accent={req.urgent ? tokens.error : undefined}>
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
