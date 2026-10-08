import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AppointmentStatus } from '../../../types/contracts';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Platform, Modal, TextInput,
 RefreshControl, Switch, ActivityIndicator, KeyboardAvoidingView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import DateTimePicker from '@react-native-community/datetimepicker';
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
 PromotionsDashboard, CreateCampaignScreen, 
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
import { CertificatesConfigScreen } from '../../shared/SharedScreens';
import { PreVisitChatScreen } from './PreVisitChatScreen';
import { InboundMedicalReportsScreen } from './InboundMedicalReportsScreen';

import { DoctorSettingsTab } from './DoctorSettingsTab';
import { PatientFileScreen } from './PatientFileScreen';

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVE CONSULTATION (WAITING ROOM & EXAM)
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// ACTIVE CONSULTATION (WAITING ROOM & EXAM)
// ══════════════════════════════════════════════════════════════════════════════
export function LiveConsultationScreen({ apt, onBack, onNavigate }: { apt: any; onBack: () => void; onNavigate: (s: string, p?: any) => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [verified, setVerified] = useState<any | null>(null);
 const [loading, setLoading] = useState(true);
 const [acting, setActing] = useState(false);
 const [diagnosis, setDiagnosis] = useState('');
 const [visitNotes, setVisitNotes] = useState('');
 const [advice, setAdvice] = useState('');
 const aptId = String(apt?.id || apt?.raw?.id || apt?.appointment_id || '');

 const load = useCallback(() => {
   if (!aptId) { setLoading(false); return; }
   client.get(`/care/appointments/${encodeURIComponent(aptId)}`).then((res: any) => {
     setVerified(res?.data?.data || res?.data || null);
   }).catch(() => {
     show(AR ? 'تعذر التحقق من الموعد' : 'Could not verify appointment', 'error');
   }).finally(() => setLoading(false));
 }, [aptId]);
 useEffect(() => { load(); }, [load]);

 // Visit lifecycle on the server: CONFIRMED -> CHECKED_IN -> IN_PROGRESS -> COMPLETED (finish saves the summary).
 const step = async (fn: () => Promise<any>, ok: string) => {
   setActing(true);
   try { await fn(); show(ok, 'success'); load(); }
   catch (e: any) { show(e?.response?.data?.message || e.message || (AR ? 'تعذر تنفيذ الإجراء' : 'Action failed'), 'error'); }
   finally { setActing(false); }
 };
 const checkIn = () => step(() => client.patch(`/care/appointments/${aptId}/check-in`, {}), AR ? 'تم تسجيل حضور المريض' : 'Patient checked in');
 const startVisit = () => step(() => client.patch(`/care/appointments/${aptId}/start`, {}), AR ? 'بدأت الاستشارة' : 'Consultation started');
 const finishVisit = () => {
   if (!diagnosis.trim()) return show(AR ? 'اكتب التشخيص قبل إنهاء الزيارة' : 'Enter the diagnosis before finishing', 'warning');
   step(() => client.post(`/care/appointments/${aptId}/finish`, { diagnosis: diagnosis.trim(), notes: visitNotes.trim() || undefined, recommendations: advice.trim() || undefined }),
     AR ? 'انتهت الزيارة وأُرسل الملخص للمريض' : 'Visit finished; summary sent to the patient');
 };

 const status = String(verified?.status || '').toUpperCase();
 const okStates = ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'];
 const ready = !!verified && okStates.includes(status);
 // Server rule (prescriptions.service create): a prescription needs an IN_PROGRESS appointment. Sick leave, report,
 // referral and test requests stay available after the visit is finished, so Finish no longer hides them.
 const finished = status === 'COMPLETED';
 const canPrescribe = status === 'IN_PROGRESS';
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
      {finished ? (AR ? 'انتهت الزيارة — يمكنك إصدار المستندات اللاحقة' : 'Visit finished — you can still issue follow-up documents') : (AR ? 'جلسة موثقة خادمياً — يمكنك البدء' : 'Server-verified session — you may begin')}
     </Text>
     <Text style={{ color: theme.textSub, marginTop: 4 }}>{AR ? `الموعد: ${aptId}` : `Appointment: ${aptId}`} · {status}</Text>
    </NCard>
    {status === 'CONFIRMED' && <NBtn label={AR ? 'حضر المريض (تسجيل الحضور)' : 'Patient arrived (check in)'} loading={acting} onPress={checkIn} style={{ marginBottom: SP.md }} />}
    {status === 'CHECKED_IN' && <NBtn label={AR ? 'بدء الاستشارة' : 'Start consultation'} loading={acting} onPress={startVisit} style={{ marginBottom: SP.md }} />}
    {status === 'IN_PROGRESS' && (
     <NCard style={{ marginBottom: SP.md }}>
      <NInput label={AR ? 'التشخيص' : 'Diagnosis'} value={diagnosis} onChange={setDiagnosis} />
      <NInput label={AR ? 'ملاحظات الزيارة' : 'Visit notes'} value={visitNotes} onChange={setVisitNotes} />
      <NInput label={AR ? 'التوصيات' : 'Recommendations'} value={advice} onChange={setAdvice} />
      <Text style={{ color: theme.warn, fontSize: FS.xs, marginTop: SP.sm, textAlign: AR ? 'right' : 'left' }}>
       {AR ? 'اكتب الوصفة قبل إنهاء الزيارة: لا يمكن إصدار وصفة بعد الإنهاء.' : 'Write the prescription before finishing: it cannot be issued after the visit is finished.'}
      </Text>
      <NBtn label={AR ? 'إنهاء الزيارة' : 'Finish visit'} loading={acting} onPress={finishVisit} style={{ marginTop: SP.md }} />
     </NCard>
    )}
    {!finished && <NBtn label={AR ? 'بدء مكالمة الفيديو' : 'Start video call'} onPress={() => onNavigate('video_call', fullApt)} style={{ marginBottom: SP.md }} />}
    <NBtn label={AR ? 'محادثة ما قبل الزيارة' : 'Pre-visit chat'} variant="outline" onPress={() => onNavigate('pre_visit_chat', fullApt)} style={{ marginBottom: SP.md }} />
    <NBtn label={AR ? 'كتابة وصفة' : 'Write prescription'} variant="outline" disabled={!canPrescribe} onPress={() => onNavigate('prescription', fullApt)} style={{ marginBottom: canPrescribe ? SP.md : SP.xs }} />
    {!canPrescribe && (
     <Text style={{ color: theme.textSub, fontSize: FS.xs, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
      {finished
       ? (AR ? 'انتهت الزيارة: لا يمكن إصدار وصفة جديدة بعد الإنهاء.' : 'The visit is finished: a new prescription cannot be issued.')
       : (AR ? 'ابدأ الاستشارة أولاً: لا تُصدر الوصفة إلا أثناء الزيارة الجارية.' : 'Start the consultation first: a prescription can only be issued while the visit is in progress.')}
     </Text>
    )}
    <NBtn label={AR ? 'إجازة مرضية' : 'Sick leave'} variant="outline" onPress={() => onNavigate('sick_leave', fullApt)} style={{ marginBottom: SP.md }} />
    <NBtn label={AR ? 'تقرير طبي' : 'Medical report'} variant="outline" onPress={() => onNavigate('medical_report', fullApt)} style={{ marginBottom: SP.md }} />
    <NBtn label={AR ? 'تحويل طبي' : 'Referral'} variant="outline" onPress={() => onNavigate('referral', fullApt)} style={{ marginBottom: SP.md }} />
    <NBtn label={AR ? 'طلب فحص' : 'Request test'} variant="outline" onPress={() => onNavigate('request_test', fullApt)} />
   </>)}
   </NScroll>
  </View>
 );
}
