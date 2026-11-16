import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AppointmentStatus } from '../../../types/contracts';
import { visitSteps } from './consultationSteps';
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
 SmartOutboundReferralNetwork
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
 const { lang, t, t: tt } = useLang();
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
     show(tt('live.a382b9cc'), 'error');
   }).finally(() => setLoading(false));
 }, [aptId]);
 useEffect(() => { load(); }, [load]);

 // Visit lifecycle on the server: CONFIRMED -> CHECKED_IN -> IN_PROGRESS -> COMPLETED (finish saves the summary).
 // A home visit goes CONFIRMED -> EN_ROUTE -> ARRIVED -> IN_PROGRESS (the trip is on the appointment screen); from ARRIVED the visit starts here.
 const step = async (fn: () => Promise<any>, ok: string) => {
   setActing(true);
   try { await fn(); show(ok, 'success'); load(); }
   // reload after a failure too: a repeat of a step that already happened answers 400, and the screen should show the real state
   catch (e: any) { show(e?.response?.data?.message || e.message || (tt('live.b1ec89a1')), 'error'); load(); }
   finally { setActing(false); }
 };
 const checkIn = () => step(() => client.patch(`/care/appointments/${aptId}/check-in`, {}), tt('live.743b2393'));
 const startVisit = () => step(() => client.patch(`/care/appointments/${aptId}/start`, {}), tt('live.899dfcde'));
 const finishVisit = () => {
   if (!diagnosis.trim()) return show(tt('live.88457a77'), 'warning');
   step(() => client.post(`/care/appointments/${aptId}/finish`, { diagnosis: diagnosis.trim(), notes: visitNotes.trim() || undefined, recommendations: advice.trim() || undefined }),
     tt('live.b9941807'));
 };

 const status = String(verified?.status || '').toUpperCase();
 const steps = visitSteps(status, verified?.service_type || apt?.service_type);
 const ready = !!verified && steps.ready;
 // Server rule (prescriptions.service create): a prescription needs an IN_PROGRESS appointment. Sick leave, report,
 // referral and test requests stay available after the visit is finished, so Finish no longer hides them.
 const finished = steps.finished;
 const canPrescribe = steps.canPrescribe;
 const fullApt = { ...(typeof apt === 'object' ? apt : {}), id: aptId };

 return (
  <View style={{ flex: 1, backgroundColor: theme.bg }}>
   <NHeader title={tt('live.61f95239')} onBack={onBack} />
   <NScroll>
   {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} /> : !verified ? (
    <NCard style={{ borderColor: theme.danger, borderWidth: 1 }}>
     <Text style={{ color: theme.text, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>
      {tt('live.3d8eca88')}
     </Text>
    </NCard>
   ) : !ready ? (
    <NCard style={{ borderColor: theme.warn, borderWidth: 1 }}>
     <Text style={{ color: theme.text, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>
      {tt('tpi.c0e1e7f7', { p1: String(status || '—') })}
     </Text>
     <Text style={{ color: theme.textSub, marginTop: SP.md, textAlign: AR ? 'right' : 'left' }}>
      {tt('live.5befbd86')}
     </Text>
    </NCard>
   ) : (<>
    <NCard style={{ borderColor: theme.success, borderWidth: 1, marginBottom: SP.md }}>
     <Text style={{ color: theme.text, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>
      {finished ? (tt('live.031365df')) : (tt('live.65eb1205'))}
     </Text>
     <Text style={{ color: theme.textSub, marginTop: 4 }}>{tt('tpi.e889f6f5', { p1: String(aptId) })} · {status}</Text>
    </NCard>
    {steps.showCheckIn && <NBtn label={tt('live.4fa4fa34')} loading={acting} onPress={checkIn} style={{ marginBottom: SP.md }} />}
    {steps.showStart && <NBtn label={tt('live.4fe51d9f')} loading={acting} onPress={startVisit} style={{ marginBottom: SP.md }} />}
    {status === 'IN_PROGRESS' && (
     <NCard style={{ marginBottom: SP.md }}>
      <NInput label={tt('live.af0eaef5')} value={diagnosis} onChange={setDiagnosis} />
      <NInput label={tt('live.151efa31')} value={visitNotes} onChange={setVisitNotes} />
      <NInput label={tt('live.b762c7d4')} value={advice} onChange={setAdvice} />
      <Text style={{ color: theme.warn, fontSize: FS.xs, marginTop: SP.sm, textAlign: AR ? 'right' : 'left' }}>
       {tt('live.7a3770c3')}
      </Text>
      <NBtn label={tt('live.09842ba7')} loading={acting} onPress={finishVisit} style={{ marginTop: SP.md }} />
     </NCard>
    )}
    {!finished && <NBtn label={tt('live.b7dd76d2')} onPress={() => onNavigate('video_call', fullApt)} style={{ marginBottom: SP.md }} />}
    <NBtn label={tt('live.d918535f')} variant="outline" onPress={() => onNavigate('pre_visit_chat', fullApt)} style={{ marginBottom: SP.md }} />
    <NBtn label={tt('live.67df1c70')} variant="outline" disabled={!canPrescribe} onPress={() => onNavigate('prescription', fullApt)} style={{ marginBottom: canPrescribe ? SP.md : SP.xs }} />
    {!canPrescribe && (
     <Text style={{ color: theme.textSub, fontSize: FS.xs, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
      {finished
       ? (tt('live.8229bc98'))
       : (tt('live.470f3c87'))}
     </Text>
    )}
    <NBtn label={t('medicalReport.open')} variant="outline" onPress={() => onNavigate('sick_leave', fullApt)} style={{ marginBottom: SP.md }} />
    <NBtn label={t('medicalReport.openList')} variant="outline" onPress={() => onNavigate('medical_reports_list')} style={{ marginBottom: SP.md }} />
    <NBtn label={tt('live.fe376ee2')} variant="outline" onPress={() => onNavigate('medical_report', fullApt)} style={{ marginBottom: SP.md }} />
    <NBtn label={tt('live.8f87011c')} variant="outline" onPress={() => onNavigate('referral', fullApt)} style={{ marginBottom: SP.md }} />
    <NBtn label={t('consultation.issueReferral')} variant="outline" onPress={() => onNavigate('issue_referral', fullApt)} style={{ marginBottom: SP.md }} />
    <NBtn label={tt('live.3b7c312b')} variant="outline" onPress={() => onNavigate('request_test', fullApt)} />
   </>)}
   </NScroll>
  </View>
 );
}
