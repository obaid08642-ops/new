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

export function DepartmentManagementScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 // Real departments derived from the facility's actual staff roster (subaccounts).
 const [staff, setStaff] = useState<any[]>([]);
 const [staffLoading, setStaffLoading] = useState(true);
 useEffect(() => {
   client.get('/hospital/staff')
     .then(r => setStaff(Array.isArray(r.data) ? r.data : []))
     .catch(() => setStaff([]))
     .finally(() => setStaffLoading(false));
 }, []);

 const deptMap = new Map<string, any[]>();
 staff.forEach((s: any) => {
   const d = (s.department || '').trim() || (AR ? 'عام' : 'General');
   if (!deptMap.has(d)) deptMap.set(d, []);
   deptMap.get(d)!.push(s);
 });
 const DEPT_DATA = Array.from(deptMap.entries()).map(([name, members]) => ({
   id: name,
   name,
   head: members[0]?.name || members[0]?.full_name || '—',
   doctors: members.length,
   active: members.some((m: any) => m.status === 'active' || m.active),
 }));

 return (
 <NScroll>
 <NHeader title={AR ? ' إدارة الأقسام' : ' Department Management'} onBack={onBack} />

 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.xl }}>
 <NStatCard icon="" label={AR?'الأقسام':'Departments'} value={String(DEPT_DATA.length)} color={tokens.info} style={{ flex:1 }} />
 <NStatCard icon="" label={AR?'نشطة':'Active'} value={String(DEPT_DATA.filter(d=>d.active).length)} color={tokens.success} style={{ flex:1 }} />
 <NStatCard icon="" label={AR?'الكوادر':'Staff'} value={String(staff.length)} color={tokens.purple} style={{ flex:1 }} />
 </View>

 {staffLoading ? (
 <ActivityIndicator color={theme.primary} />
 ) : DEPT_DATA.length === 0 ? (
 <NCard>
 <Text style={{ color: theme.textSub, textAlign: 'center' }}>
 {AR ? 'لا توجد أقسام بعد — أضف كوادر من إدارة الحسابات الفرعية وحدد القسم لكل منهم.' : 'No departments yet — add staff from sub-account management and set each member\'s department.'}
 </Text>
 </NCard>
 ) : DEPT_DATA.map(dept => (
 <NCard key={dept.id} style={{ marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.lg }}>
 <View style={{ width: 50, height: 50, borderRadius: R.md,
 backgroundColor: dept.active ? theme.primaryLight : theme.surface2,
 alignItems: 'center', justifyContent: 'center' }}>
 <I name="facility" size={24} color={dept.active ? theme.primary : theme.textSub} />
 </View>
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text,
 textAlign: AR ? 'right' : 'left' }}>{dept.name}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? `أول عضو: ${dept.head}` : `First member: ${dept.head}`} · {dept.doctors} {AR ? 'كوادر' : 'staff'}
 </Text>
 </View>
 <NBadge label={dept.active ? (AR?'نشط':'Active') : (AR?'موقوف':'Inactive')}
 variant={dept.active ? 'success' : 'default'} size="xs" />
 </View>
 </NCard>
 ))}

 <NCard style={{ backgroundColor: theme.surface2 }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'تُشتق الأقسام تلقائياً من حقل القسم في حسابات الكوادر الفعلية.' : 'Departments are derived automatically from the department field on real staff accounts.'}
 </Text>
 </NCard>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// SHIFT MANAGEMENT
