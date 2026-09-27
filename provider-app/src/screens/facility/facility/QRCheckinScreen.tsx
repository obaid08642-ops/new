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

function QRCheckinScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [mode, setMode] = useState<'scan'|'manual'|'history'>('scan');
 const [manualId, setManualId] = useState('');
 const [checkingIn, setCheckingIn] = useState(false);
 const [showCam, setShowCam] = useState(false);
 const [camPerm, requestCamPerm] = useCameraPermissions();
 const pulseAnim = useRef(new Animated.Value(1)).current;

 const extractApptId = (raw: string): string => {
 const s = String(raw || '').trim();
 const m = s.match(/([A-Za-z0-9_-]{6,})\s*$/);
 return m ? m[1] : s;
 };

 const doCheckin = async (apptId: string) => {
 if (!apptId) return;
 setCheckingIn(true);
 try {
 await client.patch(`/care/appointments/${encodeURIComponent(apptId)}/check-in`);
 show(AR ? 'تم تأكيد وصول المريض' : 'Patient arrival confirmed', 'success');
 setManualId('');
 fetchHistory();
 setMode('history');
 } catch (err: any) {
 const msg = err?.response?.data?.message;
 show(msg || (AR ? 'تعذر تأكيد الوصول — تحقق من رقم الموعد' : 'Check-in failed — verify appointment ID'), 'error');
 } finally { setCheckingIn(false); }
 };

 const openScanner = async () => {
 try {
 if (!camPerm?.granted) {
 const r = await requestCamPerm();
 if (!r?.granted) { show(AR ? 'صلاحية الكاميرا مرفوضة' : 'Camera permission denied', 'error'); return; }
 }
 setShowCam(true);
 } catch { show(AR ? 'الكاميرا غير متاحة على هذا الجهاز' : 'Camera unavailable on this device', 'error'); }
 };

 useEffect(() => {
 const loop = Animated.loop(Animated.sequence([
 Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
 Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
 ]));
 loop.start();
 return () => loop.stop();
 }, []);

 const [CHECKIN_HISTORY, setCheckinHistory] = useState<any[]>([]);
 const fetchHistory = () => {
   client.get('/provider/facility/patients/active')
     .then((res: any) => setCheckinHistory((res.data || []).map((p: any) => ({
       id: p.id, patient: p.patient_name || p.patient || '—',
       time: (p.checked_in_at || p.createdAt || '').slice(11, 16) || '—',
       dept: p.department || p.dept || '—', status: p.status || 'checked_in',
     }))))
     .catch(() => setCheckinHistory([]));
 };
 useEffect(() => { fetchHistory(); }, []);

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
 {/* Live QR scanner (CameraView → check-in). The framed illustration below shows only before the camera opens. */}
 <NCard style={{ marginBottom: SP.xl, alignItems: 'center', padding: SP.xxl }}>
 <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
 <View style={[s.qrFrame, { borderColor: theme.primary }]}>
 <I name="qr" size={60} color={theme.primary} />
 </View>
 </Animated.View>
 <Text style={{ fontSize: FS.md, color: theme.text, marginTop: SP.lg, textAlign: 'center', fontWeight: FW.semi }}>
 {AR ? 'وجّه الكاميرا نحو رمز QR الموعد' : 'Point camera at appointment QR code'}
 </Text>
 <NBtn label={AR?'تفعيل الكاميرا':'Open Camera'} onPress={openScanner}
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
 <NBtn label={AR?'تأكيد الوصول':'Confirm Arrival'} disabled={!manualId.trim()} loading={checkingIn}
 onPress={() => doCheckin(extractApptId(manualId))} />
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

 {/* Real QR camera scanner */}
 <Modal visible={showCam} animationType="slide" onRequestClose={()=>setShowCam(false)}>
 <View style={{ flex: 1, backgroundColor: '#000' }}>
 <CameraView
 style={{ flex: 1 }}
 facing="back"
 barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
 onBarcodeScanned={({ data }: any) => { if (data) { setShowCam(false); doCheckin(extractApptId(String(data))); } }}
 />
 <TouchableOpacity onPress={()=>setShowCam(false)} style={{ position: 'absolute', bottom: 60, alignSelf: 'center', backgroundColor: '#00000099', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28 }}>
 <Text style={{ color: '#fff', fontWeight: FW.bold, fontSize: FS.md }}>{AR ? 'إلغاء' : 'Cancel'}</Text>
 </TouchableOpacity>
 </View>
 </Modal>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// INSURANCE CLAIMS HUB
