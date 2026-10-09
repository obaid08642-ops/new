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

export function HospitalDispatchScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [bookings, setBookings] = useState<any[]>([]);
 const [nurses, setNurses] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
 const [assigning, setAssigning] = useState(false);

 const fetchData = async () => {
 try {
 setLoading(true);
 const resBookings = await client.get('/home-care/bookings/nursing/all');
 setBookings(resBookings.data || []);
 
 const resNurses = await client.get('/home-care/providers?availability=now');
 setNurses(resNurses.data || []);
 } catch (err: any) {
 show(AR ? 'فشل جلب البيانات' : 'Failed to fetch dispatch data', 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchData();
 }, []);

 const handleAssign = async (nurse: any) => {
 if (!selectedBooking) return;
 setAssigning(true);
 try {
 await client.post(`/home-care/bookings/${selectedBooking.id}/assign`, {
 nurse_id: nurse.id,
 nurse_name: nurse.name || nurse.name_ar,
 nurse_phone: nurse.phone || '+966500000000'
 });
 show(AR ? 'تم تعيين الممرض بنجاح' : 'Nurse assigned successfully', 'success');
 setSelectedBooking(null);
 fetchData();
 } catch (err: any) {
 show(err.message || (AR ? 'فشل التعيين' : 'Assignment failed'), 'error');
 } finally {
 setAssigning(false);
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NHeader title={AR ? 'لوحة توجيه التمريض والممرضين' : 'Nursing Dispatch Panel'} onBack={onBack} />
 <FlatList
 data={bookings}
 keyExtractor={(item) => item.id}
 refreshing={loading}
 onRefresh={fetchData}
 contentContainerStyle={{ padding: SP.xl, gap: SP.md }}
 ListEmptyComponent={<NEmpty title={AR ? 'لا توجد طلبات رعاية منزلية حالياً' : 'No home care requests available'} />}
 renderItem={({ item }) => (
 <NCard style={{ gap: SP.sm }} accent={item.state === 'CREATED' ? tokens.warning : tokens.success}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{item.patient_name || item.patient_id}</Text>
 <NBadge label={item.state} variant={item.state === 'CREATED' ? 'warning' : 'success'} />
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
  {AR ? 'الخدمة المطلوبة:' : 'Requested Service:'} {item.service_name_ar || item.service_name_en}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'الموعد:' : 'Scheduled at:'} {new Date(item.scheduled_at).toLocaleString()}
 </Text>
 {item.provider_name ? (
 <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'الممرض المعين:' : 'Assigned Nurse:'} {item.provider_name}
 </Text>
 ) : (
 <NBtn label={AR ? 'تعيين ممرض (Assign Nurse)' : 'Assign Nurse'} size="sm" onPress={() => setSelectedBooking(item)} />
 )}
 </NCard>
 )}
 />

 <NSheet visible={!!selectedBooking} onClose={() => setSelectedBooking(null)} title={AR ? 'تعيين ممرض متاح' : 'Assign Available Nurse'}>
 <ScrollView style={{ maxHeight: 400 }}>
 {nurses.map((nurse) => (
 <TouchableOpacity key={nurse.id} onPress={() => handleAssign(nurse)}
 style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, paddingVertical: SP.md, borderBottomWidth: 1, borderBottomColor: theme.border }}>
 <NAvatar name={nurse.name_ar || nurse.name_en} size={40} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? nurse.name_ar : nurse.name_en}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{nurse.degree}</Text>
 </View>
 <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold }}>{nurse.distance_km} KM</Text>
 </TouchableOpacity>
 ))}
 {nurses.length === 0 && <Text style={{ padding: SP.xl, textAlign: 'center', color: theme.textSub }}>{AR ? 'لا يوجد ممرضين متاحين حالياً' : 'No available nurses right now'}</Text>}
 </ScrollView>
 </NSheet>
 </View>
 );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
 topBar: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:SP.xl, paddingVertical:SP.md, borderBottomWidth:StyleSheet.hairlineWidth },
 iconBtn: { width:38, height:38, borderRadius:19, alignItems:'center', justifyContent:'center', position:'relative' },
 iconBtn2: { width:32, height:32, borderRadius:R.sm, alignItems:'center', justifyContent:'center' },
 notifDot: { position:'absolute', top:2, right:2, width:10, height:10, borderRadius:5 },
 quickAction: { width:80, alignItems:'center', justifyContent:'center', borderRadius:R.xl, borderWidth:1, padding:SP.md },
 timeTag: { paddingHorizontal:SP.sm, paddingVertical:SP.xs, borderRadius:R.sm, minWidth:52, alignItems:'center' },
 chipBtn: { flexDirection:'row', alignItems:'center', gap:SP.xs, paddingHorizontal:SP.lg, paddingVertical:SP.sm, borderRadius:R.full, borderWidth:1.5 },
 roleAddBtn: { flexDirection:'row', alignItems:'center', gap:SP.sm, paddingHorizontal:SP.lg, paddingVertical:SP.sm, borderRadius:R.lg, borderWidth:1.5 },
 rolePillBtn: { flexDirection:'row', alignItems:'center', gap:SP.sm, paddingHorizontal:SP.lg, paddingVertical:SP.md, borderRadius:R.lg, borderWidth:1.5 },
 credCard: { flexDirection:'row', alignItems:'center', gap:SP.md, padding:SP.md, borderRadius:R.md, borderWidth:1, marginTop:SP.md },
 qrFrame: { width:180, height:180, borderRadius:R.xl, borderWidth:3, borderStyle:'dashed', alignItems:'center', justifyContent:'center' },
 revCard: { borderRadius:R.xxl, padding:SP.xxl, alignItems:'center', marginBottom:SP.xl, shadowColor:'#000', shadowOffset:{width:0,height:8}, shadowOpacity:0.2, shadowRadius:16, elevation:8 },
 inputLabel: { fontSize:FS.sm, fontWeight:FW.semi, marginBottom:SP.xs },
});

