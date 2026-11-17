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

export function BedManagementScreen({ onBack, wards, onRefresh }: { onBack: () => void; wards: any[]; onRefresh: () => void }) {
 const { theme } = useTheme();
 const { lang, t: tt } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [selectedWard, setSelectedWard] = useState<any>(null);
 const [beds, setBeds] = useState<any[]>([]);
 const [bedsVisible, setBedsVisible] = useState(false);
 const [admitVisible, setAdmitVisible] = useState(false);
 const [addWardVisible, setAddWardVisible] = useState(false);
 const [selectedBed, setSelectedBed] = useState<any>(null);
 const [patientId, setPatientId] = useState('');
 const [wardName, setWardName] = useState('');
 const [wardBedsCount, setWardBedsCount] = useState('');
 const [loading, setLoading] = useState(false);

 const totalBeds = wards.reduce((acc, w) => acc + (w.total_beds || 0), 0);
 const availableBeds = wards.reduce((acc, w) => acc + (w.available_beds || 0), 0);
 const occupiedBeds = totalBeds - availableBeds;
 const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

 const handleShowBeds = async (ward: any) => {
 setSelectedWard(ward);
 setLoading(true);
 try {
 const res = await client.get(`/facility/beds/wards/${ward.id}/beds`);
 setBeds(res.data || []);
 setBedsVisible(true);
 } catch (e: any) {
 show(e.message || 'Failed to fetch beds', 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleAdmitPatient = async () => {
 if (!patientId.trim()) return show(tt('bed.f6401d9b'), 'warning');
 setLoading(true);
 try {
 const res = await client.post('/facility/beds/admission', {
 patient_id: patientId,
 bed_id: selectedBed.id
 });
 const admission = res.data;
 if (admission && admission.id) {
 await Vault.set(`admission_${selectedBed.id}`, admission.id);
 }
 show(tt('bed.1420df5a'), 'success');
 setAdmitVisible(false);
 setPatientId('');
 onRefresh();
 handleShowBeds(selectedWard);
 } catch (e: any) {
 show(e.message || 'Admission failed', 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleDischargePatient = async (bed: any) => {
 const admissionId = bed.admission_id || await Vault.get(`admission_${bed.id}`);
 if (!admissionId) {
 show(tt('bed.955b1698'), 'error');
 return;
 }
 setLoading(true);
 try {
 await client.put(`/facility/beds/discharge/${admissionId}`);
 await Vault.del(`admission_${bed.id}`);
 show(tt('bed.c8dfd0c3'), 'success');
 onRefresh();
 handleShowBeds(selectedWard);
 } catch (e: any) {
 const msg = e?.response?.data?.message;
 show(typeof msg === 'string' ? msg : (e.message || (tt('bed.eb84c627'))), 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleCreateWard = async () => {
 if (!wardName.trim() || !wardBedsCount) return show(tt('bed.7fb25bd4'), 'warning');
 setLoading(true);
 try {
 await client.post('/facility/beds/wards', {
 name: wardName,
 total_beds: parseInt(wardBedsCount, 10)
 });
 show(tt('bed.66350448'), 'success');
 setAddWardVisible(false);
 setWardName('');
 setWardBedsCount('');
 onRefresh();
 } catch (e: any) {
 show(e.message || 'Failed to create ward', 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={tt('bed.b2776769')} onBack={onBack} />

 {/* Summary */}
 <View style={{ flexDirection: 'row', gap: SP.md, marginBottom: SP.xl, paddingHorizontal: SP.md }}>
 <NStatCard icon="bed" label={tt('bed.e3959b9d')} value={String(totalBeds)} color={tokens.info} style={{ flex:1 }} />
 <NStatCard icon="user" label={tt('bed.7ab067af')} value={String(occupiedBeds)} color={tokens.error} style={{ flex:1 }} />
 <NStatCard icon="online" label={tt('bed.2aa376ed')} value={String(availableBeds)} color={tokens.success} style={{ flex:1 }} />
 </View>

 {/* Occupancy gauge */}
 <NCard style={{ marginBottom: SP.xl, alignItems: 'center', marginHorizontal: SP.md }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.sm }}>
 {tt('bed.db704a64')}
 </Text>
 <Text style={{ fontSize: FS['5xl'], fontWeight: FW.xbold,
 color: occupancyPct > 85 ? theme.danger : occupancyPct > 70 ? theme.warn : theme.success }}>
 {occupancyPct}%
 </Text>
 <View style={{ width: '100%', height: 12, backgroundColor: theme.surface2, borderRadius: R.full, marginTop: SP.md }}>
 <View style={{
 height: 12,
 width: `${occupancyPct}%`,
 backgroundColor: occupancyPct > 85 ? theme.danger : occupancyPct > 70 ? theme.warn : theme.success,
 borderRadius: R.full,
 }} />
 </View>
 </NCard>

 {/* Per ward */}
 <View style={{ paddingHorizontal: SP.md, flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>{tt('bed.6d5bd207')}</Text>
 <NBtn label={tt('bed.3e9c6f7e')} size="xs" variant="outline" onPress={() => setAddWardVisible(true)} />
 </View>

 {wards.map((ward, i) => {
 const total = ward.total_beds || 0;
 const available = ward.available_beds || 0;
 const occupied = total - available;
 const pct = total > 0 ? (occupied / total) * 100 : 0;
 const color = available === 0 ? tokens.error : available <= 2 ? tokens.warning : tokens.success;
 return (
 <NCard key={ward.id || i} style={{ marginBottom: SP.md, marginHorizontal: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{ward.name}</Text>
 <NBadge
 label={available === 0 ? (tt('bed.8ad7453b')) : available <= 2 ? (tt('bed.b9102c6b')) : (tt('bed.2aa376ed'))}
 variant={available === 0 ? 'danger' : available <= 2 ? 'warning' : 'success'}
 size="xs"
 />
 </View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>
 {tt('tpn.7c1e7b16', { p1: String(occupied), p2: String(total) })}
 </Text>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color }}>
 {available} {tt('qqay.3c0fd317')}
 </Text>
 </View>
 <View style={{ height: 8, backgroundColor: theme.surface2, borderRadius: R.full }}>
 <View style={{
 height: 8,
 width: `${pct}%`,
 backgroundColor: color, borderRadius: R.full,
 }} />
 </View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginTop: SP.md }}>
 <NBtn label={tt('bed.3b3cb74a')} size="xs" style={{ flex: 1 }}
 onPress={() => handleShowBeds(ward)} />
 </View>
 </NCard>
 );
 })}
 </NScroll>

 {/* Ward Beds Bottom Sheet */}
 <NSheet visible={bedsVisible} onClose={() => setBedsVisible(false)} title={selectedWard?.name || ''}>
 <ScrollView contentContainerStyle={{ padding: SP.md }}>
 {beds.length === 0 ? (
 <Text style={{ color: theme.textSub, textAlign: 'center', marginVertical: SP.xl }}>{tt('bed.475e842b')}</Text>
 ) : (
 beds.map((bed: any) => (
 <View key={bed.id} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SP.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
 <View>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{bed.bed_number}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{tt('tpn.abe28e7e', { p1: String(bed.type) })}</Text>
 </View>
 <View style={{ flexDirection: 'row', alignItems: 'center', gap: SP.md }}>
 <NBadge label={bed.status === 'occupied' ? (tt('bed.7ab067af')) : (tt('bed.2aa376ed'))} variant={bed.status === 'occupied' ? 'danger' : 'success'} />
 {bed.status === 'occupied' ? (
 <NBtn label={tt('bed.48f1327a')} size="xs" variant="outline" onPress={() => handleDischargePatient(bed)} />
 ) : (
 <NBtn label={tt('bed.568d0a16')} size="xs" onPress={() => { setSelectedBed(bed); setAdmitVisible(true); }} />
 )}
 </View>
 </View>
 ))
 )}
 </ScrollView>
 </NSheet>

 {/* Admission Form Sheet */}
 <NSheet visible={admitVisible} onClose={() => setAdmitVisible(false)} title={tt('bed.313f06fc')}>
 <View style={{ padding: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>{tt('tpn.18c5133f', { p1: String(selectedBed?.bed_number) })}</Text>
 <NInput label={tt('bed.4bd8e60c')} placeholder={tt('bed.21a620dc')} value={patientId} onChange={setPatientId} required />
 <NBtn label={tt('bed.2bb6ac34')} loading={loading} onPress={handleAdmitPatient} />
 </View>
 </NSheet>

 {/* Create Ward Form Sheet */}
 <NSheet visible={addWardVisible} onClose={() => setAddWardVisible(false)} title={tt('bed.4fb859da')}>
 <View style={{ padding: SP.xl }}>
 <NInput label={tt('bed.b1ecc1a2')} placeholder={tt('bed.17a46c63')} value={wardName} onChange={setWardName} required />
 <NInput label={tt('bed.0ce204c6')} placeholder="10" value={wardBedsCount} onChange={setWardBedsCount} kbType="numeric" required />
 <NBtn label={tt('bed.8e752e1d')} loading={loading} onPress={handleCreateWard} />
 </View>
 </NSheet>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// UNIFIED SCHEDULE
