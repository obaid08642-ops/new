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

export function StaffAttendanceScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang, t: tt } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [ATTENDANCE, setAttendance] = useState<any[]>([]);
 const [busy, setBusy] = useState(false);

 const load = useCallback(() => {
   client.get('/facility/shifts/attendance')
     .then((res: any) => setAttendance((res.data || []).map((a: any) => ({
       id: a.id, name: a.staff_name || a.name || '—', role: a.role || 'staff',
       checkIn: (a.check_in_time || '').slice(11, 16) || '—',
       checkOut: (a.check_out_time || '').slice(11, 16) || '—',
       open: !a.check_out_time,
       status: a.check_out_time ? 'done' : (a.check_in_time ? 'present' : 'absent'),
     }))))
     .catch(() => setAttendance([]));
 }, []);
 useEffect(() => { load(); }, [load]);

 const checkInSelf = async () => {
   setBusy(true);
   try {
     const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
     const perm = await requestForegroundPermissionsAsync();
     if (perm.status !== 'granted') { show(tt('sxn.284c03e9'), 'error'); return; }
     const pos = await getCurrentPositionAsync({ accuracy: 5 } as any);
     await client.post('/facility/shifts/attendance/check-in', { lat: pos.coords.latitude, lng: pos.coords.longitude });
     show(tt('sxn.28a967a1'), 'success');
     load();
   } catch (error: any) {
     show(error?.response?.data?.message || (tt('sxn.b5d0e0b2')), 'error');
   } finally { setBusy(false); }
 };

 const checkOut = async (id: string) => {
   setBusy(true);
   try {
     await client.post(`/facility/shifts/attendance/check-out/${id}`, {});
     show(tt('sxn.43d0d239'), 'success');
     load();
   } catch (error: any) {
     show(error?.response?.data?.message || (tt('sxn.e2fdcf76')), 'error');
   } finally { setBusy(false); }
 };

 const present = ATTENDANCE.filter(a=>a.status!=='absent').length;
 const absent = ATTENDANCE.filter(a=>a.status==='absent').length;

 return (
 <NScroll>
 <NHeader title={tt('sxn.bd07dc5e')} onBack={onBack} />

 <View style={{ flexDirection:'row', gap: SP.md, marginBottom: SP.xl }}>
 <NStatCard icon="" label={tt('sxn.9fc801ad')} value={String(present)} color={tokens.success} style={{ flex:1 }} />
 <NStatCard icon="" label={tt('sxn.73c3677b')} value={String(absent)} color={tokens.error} style={{ flex:1 }} />
 <NStatCard icon="users" label={tt('sxn.e3959b9d')} value={String(ATTENDANCE.length)} color={tokens.info} style={{ flex:1 }} />
 </View>

 <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.info, textAlign: AR?'right':'left' }}>
 {tt('sxn.7f9138e0')}
 </Text>
 <NBtn label={tt('sxn.1a21b881')} onPress={checkInSelf} loading={busy} style={{ marginTop: SP.sm }} />
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
  {staff.checkIn!=='—'? staff.checkIn: (tt('sxn.9a15d8a3'))}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
 {staff.checkOut !== '—' ? staff.checkOut : (tt('sxn.4f0d6aef'))}
 </Text>
 </View>
 </View>
 {staff.open ? (
 <NBtn label={tt('sxn.b90b055c')} size="sm" variant="outline" loading={busy} onPress={() => checkOut(staff.id)} />
 ) : (
 <NBadge
 label={staff.status==='present'?(tt('sxn.9fc801ad')) :
 staff.status==='done'?(tt('sxn.e0f045a7')) : (tt('sxn.73c3677b'))}
 variant={staff.status==='absent'?'danger':staff.status==='done'?'info':'success'}
 size="xs"
 />
 )}
 </View>
 </NCard>
 ))}

 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: 'center' }}>{tt('sxn.0c0c2fec')}</Text>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// SURGERY SCHEDULE (OT)
