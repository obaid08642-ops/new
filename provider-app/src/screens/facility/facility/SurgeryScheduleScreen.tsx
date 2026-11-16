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
import {
 PromotionsDashboard, CreateCampaignScreen, 
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights
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

export function SurgeryScheduleScreen({ onBack, surgeries, onRefresh }: { onBack: () => void; surgeries: any[]; onRefresh: () => void }) {
 const { theme } = useTheme();
 const { lang, t: tt } = useLang();
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
 return show(tt('surg.65220452'), 'warning');
 }
 setLoading(true);
 try {
 const date = new Date(scheduledAt);
 if (isNaN(date.getTime())) {
 throw new Error(tt('surg.c4c09bf8'));
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

 show(tt('surg.102d4659'), 'success');
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
 <NHeader title={tt('surg.4487d8e6')} onBack={onBack} />

 <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl, marginHorizontal: SP.md }}>
 <View style={{ flexDirection: AR?'row-reverse':'row', gap: SP.lg }}>
 <View style={{ alignItems:'center' }}>
 <Text style={{ fontSize: FS['2xl'], fontWeight: FW.xbold, color: theme.info }}>3</Text>
 <Text style={{ fontSize: FS.xs, color: theme.info }}>{tt('surg.7c655157')}</Text>
 </View>
 <View style={{ alignItems:'center' }}>
 <Text style={{ fontSize: FS['2xl'], fontWeight: FW.xbold, color: theme.info }}>{String(surgeries.length)}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.info }}>{tt('surg.83df78d1')}</Text>
 </View>
 </View>
 </NCard>

 {ORS.map(or => (
 <View key={or.room} style={{ marginBottom: SP.xl, paddingHorizontal: SP.md }}>
 <View style={{ flexDirection: AR?'row-reverse':'row', alignItems:'center', gap: SP.md, marginBottom: SP.md }}>
 <View style={{ width: 40, height: 40, borderRadius: R.md,
 backgroundColor: or.surgeries.length > 0 ? theme.primaryLight : theme.surface2,
 alignItems:'center', justifyContent:'center' }}>
 <I name="surgery" size={20} color={theme.primary} />
 </View>
 <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>{or.room}</Text>
 <NBadge
 label={or.surgeries.length===0?(tt('surg.e20cc3bd')) : (tt('surg.498c7f4e'))}
 variant={or.surgeries.length===0?'default':'primary'}
 size="xs"
 />
 </View>

 {or.surgeries.length === 0 ? (
 <NCard style={{ backgroundColor: theme.surface2, alignItems:'center', padding: SP.xl }}>
 <Text style={{ color: theme.textSub }}>{tt('surg.c838131f')}</Text>
 <NBtn label={tt('surg.caa716fc')} size="sm" variant="outline"
 style={{ marginTop: SP.md }}
 onPress={() => { setOtRoom(or.room); setBookingVisible(true); }} />
 </NCard>
 ) : (
 or.surgeries.map(surg => (
 <NCard key={surg.id} style={{ marginBottom: SP.sm }} accent={theme.primary}>
 <View style={{ flexDirection:AR?'row-reverse':'row', justifyContent:'space-between', marginBottom: SP.xs }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{surg.patient_name || surg.patient_id}</Text>
 <NBadge label={tt('surg.d056c5a3')} variant="warning" size="xs" />
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign:AR?'right':'left' }}>
 {AR?`جراح رئيسي: ${surg.primary_surgeon_id}`:`Surgeon ID: ${surg.primary_surgeon_id}`}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.primary, marginTop:2 }}>
  {new Date(surg.scheduled_at).toLocaleString()} · {surg.duration_mins} {AR?'دقيقة':'min'}
 </Text>
 </NCard>
 ))
 )}
 </View>
 ))}

 <View style={{ paddingHorizontal: SP.md, marginBottom: SP.xl }}>
 <NBtn label={tt('surg.a1e56699')} variant="outline"
 onPress={() => { setOtRoom('OR-1'); setBookingVisible(true); }} />
 </View>
 </NScroll>

 {/* Booking Form Sheet */}
 <NSheet visible={bookingVisible} onClose={() => setBookingVisible(false)} title={tt('surg.391e1322')}>
 <ScrollView contentContainerStyle={{ padding: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>{AR ? `الغرفة المحددة: ${otRoom}` : `Selected Room: ${otRoom}`}</Text>
 
 <NInput label={tt('surg.4bd8e60c')} placeholder={tt('surg.21a620dc')} value={patientId} onChange={setPatientId} required />
 <NInput label={tt('surg.5c13a4d6')} placeholder={tt('surg.2c9e4ff9')} value={surgeonId} onChange={setSurgeonId} required />
 
 <NInput label={tt('surg.d9893870')} placeholder="2026-06-18 10:00" value={scheduledAt} onChange={setScheduledAt} required />
 <NInput label={tt('surg.28c050c0')} placeholder="90" value={duration} onChange={setDuration} kbType="numeric" required />

 <NBtn label={tt('surg.38aee9ac')} loading={loading} onPress={handleBookSurgery} />
 </ScrollView>
 </NSheet>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// CREDENTIALING SCREEN
