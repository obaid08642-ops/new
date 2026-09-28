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
// APPOINTMENT DETAIL
// ══════════════════════════════════════════════════════════════════════════════
export function AppointmentDetailScreen({ apt, onBack, onNavigate }:
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

 <NCard style={{ marginTop: SP.md, marginBottom: SP.md, backgroundColor: tokens.infoSurface, borderColor: tokens.info }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: tokens.info, textAlign: AR ? 'right' : 'left' }}>{AR ? 'ملخص الذكاء الاصطناعي' : 'AI Triage Summary'}</Text>
 <Text style={{ fontSize: FS.sm, color: tokens.info, textAlign: AR ? 'right' : 'left', marginTop: SP.xs }}>{AR ? 'لا توجد نتيجة ذكاء اصطناعي موثقة من الخادم لهذا الموعد.' : 'No server-recorded AI result is available for this appointment.'}</Text>
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
  {/* the consultation screen verifies the appointment with the server before anything opens */}
  <NBtn label={AR ? 'فتح الاستشارة' : 'Open consultation'} onPress={() => onNavigate('consultation', apt)} style={{ marginTop: SP.xl }} />
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
