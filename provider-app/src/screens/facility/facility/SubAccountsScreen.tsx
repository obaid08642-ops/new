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
import { FleetScreen } from '../../shared/FleetScreen';
import {
 PromotionsDashboard, CreateCampaignScreen, 
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

export function SubAccountsScreen({ onBack, onNavigate }: {
 onBack: () => void; onNavigate: (s: string, p?: any) => void;
}) {
 const insets = useSafeAreaInsets();
 const { theme } = useTheme();
 const { lang } = useLang();
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
 spec: x.department || (AR ? 'قسم طبي' : 'Medical Dept'),
 status: x.suspended ? 'inactive' : 'active',
 phone: x.phone,
 }));
 setStaffList(formatted);
 } catch (e) {
 show(AR ? 'فشل تحميل قائمة الموظفين' : 'Failed to fetch staff list', 'error');
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
     show(AR ? 'تم حذف الحساب من الخادم' : 'Account deleted on the server', 'success');
   } catch (err: any) {
     const msg = err.response?.data?.message || err.message;
     show(AR ? `فشل حذف الحساب: ${msg}` : `Failed to delete account: ${msg}`, 'error');
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
 {AR ? ' إدارة الكوادر' : ' Staff Accounts'}
 </Text>
 <TouchableOpacity onPress={() => onNavigate('add_subaccount', null)}>
 <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primary,
 alignItems: 'center', justifyContent: 'center' }}>
 <Text style={{ color: '#FFF', fontSize: FS.lg, fontWeight: FW.bold }}>+</Text>
 </View>
 </TouchableOpacity>
 </View>

 <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
 <NSearch value={search} onChange={setSearch}
 placeholder={AR ? 'ابحث عن طبيب أو موظف...' : 'Search staff...'} style={{ marginBottom: SP.lg }} />

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
 {r === 'all' ? (AR ? 'الكل' : 'All')
 : AR ? ROLE_LABELS[r]?.ar : ROLE_LABELS[r]?.en}
 </Text>
 </TouchableOpacity>
 ))}
 </ScrollView>

 {/* Stats row */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.xl }}>
 <NStatCard icon="users" label={AR?'إجمالي الكوادر':'Total Staff'} value={String(staffList.length)} color={tokens.info} style={{ flex:1 }} />
 <NStatCard icon="check" label={AR?'نشط':'Active'} value={String(staffList.filter(s=>s.status==='active').length)} color={tokens.success} style={{ flex:1 }} />
 <NStatCard icon="close" label={AR?'غير نشط':'Inactive'} value={String(staffList.filter(s=>s.status!=='active').length)} color={tokens.warning} style={{ flex:1 }} />
 </View>

 {/* Add quick role buttons */}
 <NSecHeader title={AR ? 'إضافة سريعة' : 'Quick Add'} />
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
 {AR ? 'لا يوجد موظفون مضافون حالياً' : 'No staff accounts found'}
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
 <NBadge label={staff.status === 'active' ? (AR?'نشط':'Active') : (AR?'غير نشط':'Inactive')}
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
 <TouchableOpacity onPress={() => show(AR ? 'عرض بطاقة التوثيق' : 'Credential card', 'info')}
 style={[s.credCard, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
 <I name="document" size={16} color={theme.textSub} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.xs, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'بطاقة التوثيق المهني' : 'Professional Credential Card'}
 </Text>
 <Text style={{ fontSize: 10, color: theme.textSub }}>
 {AR ? 'بيانات الاعتماد تُدار من الخادم' : 'Credentials are managed by the server'}
 </Text>
 </View>
 <Text style={{ color: theme.primary, fontSize: FS.xs }}>
 {AR ? 'عرض ←' : '→ View'}
 </Text>
 </TouchableOpacity>
 </NCard>
 );
 })}
 </ScrollView>

 <NConfirm
 visible={!!showDelete}
 title={AR ? 'حذف الحساب' : 'Delete Account'}
 msg={AR ? 'سيتم حذف هذا الحساب الفرعي نهائياً. هل أنت متأكد؟' : 'This sub-account will be permanently deleted. Are you sure?'}
 onOk={deleteStaff}
 onCancel={() => setShowDelete(null)}
 okLabel={AR ? 'حذف' : 'Delete'}
 />
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADD SUB-ACCOUNT SCREEN
