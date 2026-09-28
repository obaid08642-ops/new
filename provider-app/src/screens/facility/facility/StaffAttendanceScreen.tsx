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

export function StaffAttendanceScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
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
     if (perm.status !== 'granted') { show(AR ? 'صلاحية الموقع مطلوبة لتسجيل الحضور' : 'Location permission required', 'error'); return; }
     const pos = await getCurrentPositionAsync({ accuracy: 5 } as any);
     await client.post('/facility/shifts/attendance/check-in', { lat: pos.coords.latitude, lng: pos.coords.longitude });
     show(AR ? 'تم تسجيل حضورك' : 'Checked in', 'success');
     load();
   } catch (error: any) {
     show(error?.response?.data?.message || (AR ? 'تعذر تسجيل الحضور' : 'Check-in failed'), 'error');
   } finally { setBusy(false); }
 };

 const checkOut = async (id: string) => {
   setBusy(true);
   try {
     await client.post(`/facility/shifts/attendance/check-out/${id}`, {});
     show(AR ? 'تم تسجيل الانصراف' : 'Checked out', 'success');
     load();
   } catch (error: any) {
     show(error?.response?.data?.message || (AR ? 'تعذر تسجيل الانصراف' : 'Check-out failed'), 'error');
   } finally { setBusy(false); }
 };

 const present = ATTENDANCE.filter(a=>a.status!=='absent').length;
 const absent = ATTENDANCE.filter(a=>a.status==='absent').length;

 return (
 <NScroll>
 <NHeader title={AR?' الحضور والانصراف':' Staff Attendance'} onBack={onBack} />

 <View style={{ flexDirection:'row', gap: SP.md, marginBottom: SP.xl }}>
 <NStatCard icon="" label={AR?'حاضر':'Present'} value={String(present)} color={tokens.success} style={{ flex:1 }} />
 <NStatCard icon="" label={AR?'غائب':'Absent'} value={String(absent)} color={tokens.error} style={{ flex:1 }} />
 <NStatCard icon="users" label={AR?'الإجمالي':'Total'} value={String(ATTENDANCE.length)} color={tokens.info} style={{ flex:1 }} />
 </View>

 <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.info, textAlign: AR?'right':'left' }}>
 {AR
 ? 'سجّل حضورك من هنا داخل نطاق المنشأة؛ يُتحقق من موقعك (GPS) مقابل إحداثيات المنشأة. لكل شخص سجل حضور مفتوح واحد.'
 : 'Check in here within the facility range; your GPS is verified against the facility coordinates. One open record per person.'}
 </Text>
 <NBtn label={AR?'تسجيل حضوري الآن':'Check myself in'} onPress={checkInSelf} loading={busy} style={{ marginTop: SP.sm }} />
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
  {staff.checkIn!=='—'? staff.checkIn: (AR?'لم يسجل':'Not checked in')}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
 {staff.checkOut !== '—' ? staff.checkOut : (AR?'لم يغادر':'Not checked out')}
 </Text>
 </View>
 </View>
 {staff.open ? (
 <NBtn label={AR?'انصراف':'Check out'} size="sm" variant="outline" loading={busy} onPress={() => checkOut(staff.id)} />
 ) : (
 <NBadge
 label={staff.status==='present'?(AR?'حاضر':'Present') :
 staff.status==='done'?(AR?'أكمل':'Completed') : (AR?'غائب':'Absent')}
 variant={staff.status==='absent'?'danger':staff.status==='done'?'info':'success'}
 size="xs"
 />
 )}
 </View>
 </NCard>
 ))}

 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: 'center' }}>{AR ? 'التقرير الشهري يُطلب من الإدارة عبر التقارير التلقائية' : 'Monthly reports are requested via Auto Reports'}</Text>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// SURGERY SCHEDULE (OT)
