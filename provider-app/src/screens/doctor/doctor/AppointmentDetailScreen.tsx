import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AppointmentStatus } from '../../../types/contracts';
import { isVisitedStatus } from './medicalOrderLogic';
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
import { mergeDateAndTime, isFutureSlot } from '../../../utils/slotPick';
import { Stack, VirtualWaitingRoomScreen, styles } from './_shared';
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
 const [newDate, setNewDate] = useState<Date | null>(null);
 const [newTime, setNewTime] = useState<Date | null>(null);
 const [picker, setPicker] = useState<'date' | 'time' | null>(null);
 const apptId = String(apt?.id || apt?.appointment_id || '');

 async function doPatch(action: string, body?: any) {
   if (!apptId) { show(AR ? 'معرف الموعد مفقود' : 'Appointment identifier is missing', 'error'); return; }
   setActing(true);
   try {
     await client.patch(`/care/appointments/${apptId}/${action}`, body || {});
     show(action === 'confirm' ? (AR ? 'تم تأكيد الموعد' : 'Appointment confirmed') : action === 'cancel' ? (AR ? 'تم إلغاء الموعد' : 'Appointment cancelled') : (AR ? 'تمت إعادة الجدولة' : 'Appointment rescheduled'), 'success');
     setShowCancel(false); setShowResched(false); setCancelReason(''); setNewDate(null); setNewTime(null); setPicker(null);
   } catch (err: any) {
     show(err?.response?.data?.message || (AR ? 'تعذر تنفيذ الإجراء — تحقق من الاتصال' : 'Action failed — check connection'), 'error');
   } finally {
     setActing(false);
   }
 }

 function submitReschedule() {
   if (!newDate || !newTime) { show(AR ? 'اختر التاريخ والوقت' : 'Pick a date and a time', 'error'); return; }
   const slot = mergeDateAndTime(newDate, newTime);
   if (!isFutureSlot(slot, new Date())) { show(AR ? 'اختر موعداً في المستقبل' : 'Pick a time in the future', 'error'); return; }
   doPatch('reschedule', { slot_start: slot.toISOString() });
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
  {isVisitedStatus(apt?.status) ? <NBtn label={AR ? 'أمر طبي جديد' : 'New medical order'} variant="outline" onPress={() => onNavigate('medical_order_composer', apt)} style={{ marginTop: SP.md }} /> : null}
  {apt?.type === 'home' && apptId ? <HomeVisitTrip apptId={apptId} AR={AR} /> : null}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.md }}>
 <View style={{ flex: 1 }}><NBtn label={AR ? 'تأكيد الموعد' : 'Confirm'} loading={acting} onPress={() => doPatch('confirm')} /></View>
 <View style={{ flex: 1 }}><NBtn label={AR ? 'إلغاء' : 'Cancel'} variant="danger" onPress={() => setShowCancel((v) => !v)} /></View>
 <View style={{ flex: 1 }}><NBtn label={AR ? 'جدولة' : 'Reschedule'} variant="outline" onPress={() => setShowResched((v) => !v)} /></View>
 </View>
 {showCancel && (
 <NCard style={{ marginTop: SP.md }}>
 <NInput placeholder={AR ? 'سبب الإلغاء (مطلوب، يصل المريض)' : 'Cancellation reason (required, the patient receives it)'} value={cancelReason} onChange={setCancelReason} />
 <NBtn label={AR ? 'تأكيد الإلغاء' : 'Confirm cancellation'} variant="danger" loading={acting} disabled={acting || cancelReason.trim().length < 3} onPress={() => doPatch('cancel', { reason: cancelReason.trim() })} style={{ marginTop: SP.md }} />
 </NCard>
 )}
 {showResched && (
 <NCard style={{ marginTop: SP.md }}>
 <TouchableOpacity accessibilityRole="button" onPress={() => setPicker('date')} style={{ borderWidth: 1, borderColor: theme.border, borderRadius: R.md, padding: SP.md, marginBottom: SP.sm }}>
 <Text style={{ color: theme.textSub, fontSize: FS.xs, textAlign: AR ? 'right' : 'left' }}>{AR ? 'التاريخ' : 'Date'}</Text>
 <Text style={{ color: theme.text, fontSize: FS.md, textAlign: AR ? 'right' : 'left' }}>{newDate ? newDate.toLocaleDateString(AR ? 'ar-SA' : 'en-GB') : (AR ? 'اختر التاريخ' : 'Pick a date')}</Text>
 </TouchableOpacity>
 <TouchableOpacity accessibilityRole="button" onPress={() => setPicker('time')} style={{ borderWidth: 1, borderColor: theme.border, borderRadius: R.md, padding: SP.md }}>
 <Text style={{ color: theme.textSub, fontSize: FS.xs, textAlign: AR ? 'right' : 'left' }}>{AR ? 'الوقت' : 'Time'}</Text>
 <Text style={{ color: theme.text, fontSize: FS.md, textAlign: AR ? 'right' : 'left' }}>{newTime ? newTime.toLocaleTimeString(AR ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) : (AR ? 'اختر الوقت' : 'Pick a time')}</Text>
 </TouchableOpacity>
 {picker && (
 <DateTimePicker
 value={(picker === 'date' ? newDate : newTime) || new Date()}
 mode={picker}
 is24Hour
 minimumDate={picker === 'date' ? new Date() : undefined}
 display="default"
 onChange={(_e, d) => {
 setPicker(null);
 if (!d) return;
 if (picker === 'date') setNewDate(d); else setNewTime(d);
 }}
 />
 )}
 <NBtn label={AR ? 'تأكيد الموعد الجديد' : 'Confirm new slot'} loading={acting} onPress={submitReschedule} style={{ marginTop: SP.md }} />
 </NCard>
 )}
  </NScroll>
  );
}

/**
 * 2-app#3: a home visit's trip. "On my way" moves the appointment to EN_ROUTE and, while this screen is open, sends the
 * doctor's position every half minute (POST /care/appointments/:id/position) so the patient sees it on a map;
 * "Arrived" moves it to ARRIVED and stops sending. The server accepts the position only from this doctor while en route.
 */
function HomeVisitTrip({ apptId, AR }: { apptId: string; AR: boolean }) {
  const { show } = useToast();
  const [state, setState] = useState<'idle' | 'en_route' | 'arrived'>('idle');
  const [busy, setBusy] = useState(false);
  const watch = useRef<{ remove: () => void } | null>(null);

  const stopSending = useCallback(() => { watch.current?.remove(); watch.current = null; }, []);
  useEffect(() => stopSending, [stopSending]);

  const startSending = useCallback(async () => {
    const Location = await import('expo-location');
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') { show(AR ? 'اسمح بالوصول إلى الموقع ليرى المريض أنك في الطريق' : 'Allow location so the patient can see you are on the way', 'error'); return; }
    const send = (lat: number, lng: number) => client.post(`/care/appointments/${encodeURIComponent(apptId)}/position`, { lat, lng }).catch(() => undefined);
    const first = await Location.getCurrentPositionAsync({});
    void send(first.coords.latitude, first.coords.longitude);
    watch.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 30_000, distanceInterval: 50 }, (pos) => { void send(pos.coords.latitude, pos.coords.longitude); });
  }, [apptId, AR, show]);

  async function move(action: 'en-route' | 'arrive') {
    if (busy) return;
    setBusy(true);
    try {
      await client.patch(`/care/appointments/${encodeURIComponent(apptId)}/${action}`, {});
      if (action === 'en-route') { setState('en_route'); show(AR ? 'أُبلغ المريض أنك في الطريق' : 'The patient was told you are on the way', 'success'); await startSending(); }
      else { stopSending(); setState('arrived'); show(AR ? 'أُبلغ المريض بوصولك' : 'The patient was told you arrived', 'success'); }
    } catch (err: any) {
      show(err?.response?.data?.message || (AR ? 'تعذر تحديث حالة الزيارة' : 'Could not update the visit'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.md }}>
      <View style={{ flex: 1 }}><NBtn label={AR ? 'في الطريق' : 'On my way'} loading={busy && state === 'idle'} disabled={state !== 'idle' || busy} onPress={() => void move('en-route')} /></View>
      <View style={{ flex: 1 }}><NBtn label={AR ? 'وصلت' : 'Arrived'} variant="outline" loading={busy && state === 'en_route'} disabled={state !== 'en_route' || busy} onPress={() => void move('arrive')} /></View>
    </View>
  );
}
