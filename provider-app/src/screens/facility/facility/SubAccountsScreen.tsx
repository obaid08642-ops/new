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

export function SubAccountsScreen({ onBack, onNavigate }: {
 onBack: () => void; onNavigate: (s: string, p?: any) => void;
}) {
 const insets = useSafeAreaInsets();
 const { theme } = useTheme();
 const { lang, t: tt } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [search, setSearch] = useState('');
 const [roleFilter, setRole] = useState<'all'|'doctor'|'insurance'|'reception'>('all');
 const [showDelete, setShowDelete] = useState<string | null>(null);

 const [staffList, setStaffList] = useState<any[]>([]);
 const [loading, setLoading] = useState(false);

 const ROLE_LABELS: Record<string, { ar: string; en: string; icon: string; color: string }> = {
 doctor: { ar: 'طبيب', en: 'Doctor', icon: '', color: tokens.success },
 insurance: { ar: 'منسق تأمين', en: 'Ins. Coord.', icon: '', color: tokens.info },
 reception: { ar:'استقبال', en:'Reception', icon:'', color:tokens.warning },
 nurse: { ar: 'ممرض/ممرضة', en: 'Nurse', icon: '', color: tokens.pink },
 lab: { ar: 'محلل مختبر', en: 'Lab Tech', icon: '', color: tokens.purple },
 };

 const fetchStaff = async () => {
 setLoading(true);
 try {
 const res = await client.get('/hospital/staff');
 const formatted = res.data.map((x: any) => ({
 id: x._id || x.id,
 name: x.full_name,
 role: x.role || 'doctor',
 spec: x.department || (tt('sxo.47ebd5a9')),
 status: x.suspended ? 'inactive' : 'active',
 phone: x.phone,
 }));
 setStaffList(formatted);
 } catch (e) {
 show(tt('sxo.326c8df9'), 'error');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchStaff();
 }, []);

 const deleteStaff = async () => {
   if (!showDelete) return;
   try {
     await client.delete(`/hospital/staff/${showDelete}`);
     setStaffList(prev => prev.filter(staff => staff.id !== showDelete));
     show(tt('sxo.c8aa0986'), 'success');
   } catch (err: any) {
     const msg = err.response?.data?.message || err.message;
     show(tt('tpq.b2c3bd22', { p1: String(msg) }), 'error');
   } finally {
     setShowDelete(null);
   }
 };

 const filtered = staffList.filter(sa =>
 (roleFilter === 'all' || sa.role === roleFilter) &&
 (sa.name.includes(search) || sa.spec.includes(search))
 );

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[s.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 16) }]}>
 <TouchableOpacity onPress={onBack}>
 <Text style={{ color: theme.primary, fontSize: FS.md }}>{AR ? '→' : '←'}</Text>
 </TouchableOpacity>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>
 {tt('sxo.872a93c6')}
 </Text>
 <TouchableOpacity onPress={() => onNavigate('add_subaccount', null)}>
 <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primary,
 alignItems: 'center', justifyContent: 'center' }}>
 <Text style={{ color: C.white, fontSize: FS.lg, fontWeight: FW.bold }}>+</Text>
 </View>
 </TouchableOpacity>
 </View>

 <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
 <NSearch value={search} onChange={setSearch}
 placeholder={tt('sxo.3fae2e2c')} style={{ marginBottom: SP.lg }} />

 {/* Role filter */}
 <ScrollView horizontal showsHorizontalScrollIndicator={false}
 contentContainerStyle={{ gap: SP.sm, marginBottom: SP.lg }}>
 {(['all','doctor','insurance','reception'] as const).map(r => (
 <TouchableOpacity key={r} onPress={() => setRole(r)}
 style={[s.chipBtn, {
 backgroundColor: roleFilter === r ? theme.primary : theme.surface2,
 borderColor: roleFilter === r ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: roleFilter === r ? '#FFF' : theme.text, fontSize: FS.sm }}>
 {r === 'all' ? (tt('sxo.eabe5f68'))
 : AR ? ROLE_LABELS[r]?.ar : ROLE_LABELS[r]?.en}
 </Text>
 </TouchableOpacity>
 ))}
 </ScrollView>

 {/* Stats row */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.xl }}>
 <NStatCard icon="users" label={tt('sxo.ccff0ebe')} value={String(staffList.length)} color={tokens.info} style={{ flex:1 }} />
 <NStatCard icon="check" label={tt('sxo.03886b8f')} value={String(staffList.filter(s=>s.status==='active').length)} color={tokens.success} style={{ flex:1 }} />
 <NStatCard icon="close" label={tt('sxo.aa269c94')} value={String(staffList.filter(s=>s.status!=='active').length)} color={tokens.warning} style={{ flex:1 }} />
 </View>

 {/* Add quick role buttons */}
 <NSecHeader title={tt('sxo.18087cdd')} />
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl }}>
 {Object.entries(ROLE_LABELS).map(([role, info]) => (
 <TouchableOpacity key={role} onPress={() => onNavigate('add_subaccount', role)}
 style={[s.roleAddBtn, { backgroundColor: `${info.color}15`, borderColor: info.color }]}>
 <Text style={{ fontSize: 20 }}>{info.icon}</Text>
 <Text style={{ fontSize: FS.xs, color: info.color, fontWeight: FW.semi }}>
 + {AR ? info.ar : info.en}
 </Text>
 </TouchableOpacity>
 ))}
 </View>

 {/* Staff list */}
 {loading && <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.xl }} />}
 {!loading && filtered.length === 0 && (
 <Text style={{ textAlign: 'center', color: theme.textSub, marginVertical: SP.xl }}>
 {tt('sxo.414482be')}
 </Text>
 )}
 {filtered.map(staff => {
 const roleInfo = ROLE_LABELS[staff.role];
 return (
 <NCard key={staff.id} style={{ marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <NAvatar name={staff.name} size={50} online={staff.status === 'active'} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text,
 textAlign: AR ? 'right' : 'left' }}>{staff.name}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: 4 }}>{staff.spec}</Text>
 <View style={{ flexDirection: 'row', gap: SP.xs, flexWrap: 'wrap' }}>
 <NBadge label={roleInfo ? (AR ? roleInfo.ar : roleInfo.en) : staff.role} variant="primary" size="xs" />
 <NBadge label={staff.status === 'active' ? (tt('sxo.03886b8f')) : (tt('sxo.aa269c94'))}
 variant={staff.status === 'active' ? 'success' : 'default'} size="xs" />

 </View>
 </View>
 <View style={{ gap: SP.xs }}>
 <TouchableOpacity style={[s.iconBtn2, { backgroundColor: theme.primaryLight }]}
 onPress={() => onNavigate('add_subaccount', staff.role)}>
 <I name="user" size={16} color={theme.primary} />
 </TouchableOpacity>
 <TouchableOpacity style={[s.iconBtn2, { backgroundColor: theme.dangerBg }]}
 onPress={() => setShowDelete(staff.id)}>
 <I name="trash" size={16} color={theme.danger} />
 </TouchableOpacity>
 </View>
 </View>

 {/* Credential Card Preview */}
 {/* Needs-review issue 1130: a plain card, not a button; pressing it only showed a toast. */}
 <View style={[s.credCard, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
 <I name="document" size={16} color={theme.textSub} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.xs, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left' }}>
 {tt('sxo.2b4a3474')}
 </Text>
 <Text style={{ fontSize: 10, color: theme.textSub }}>
 {tt('sxo.dde5407a')}
 </Text>
 </View>
 </View>
 </NCard>
 );
 })}
 </ScrollView>

 <NConfirm
 visible={!!showDelete}
 title={tt('sxo.eee795ec')}
 msg={tt('sxo.43f45b4c')}
 onOk={deleteStaff}
 onCancel={() => setShowDelete(null)}
 okLabel={tt('sxo.2257cab6')}
 />
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADD SUB-ACCOUNT SCREEN
