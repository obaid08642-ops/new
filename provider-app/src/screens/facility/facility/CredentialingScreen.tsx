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

export function CredentialingScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [CREDS, setCreds] = useState<any[]>([]);
 useEffect(() => {
   client.get('/hospital/staff')
     .then((r: any) => setCreds((r.data || []).map((d: any) => {
       const exp = d.license_expiry || d.scfhs_expiry || null;
       const days = exp ? Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000) : null;
       const status = days === null ? 'valid' : days < 0 ? 'expired' : days <= 90 ? 'expiring' : 'valid';
       return {
         id: d.id, doctor: d.full_name || d.name || '—',
         scfhs: d.license_number || d.scfhs || '—', scfhsExp: exp ? String(exp).slice(0, 10) : '—',
         malpractice: !!d.malpractice_insurance, malpExp: d.malpractice_expiry ? String(d.malpractice_expiry).slice(0, 10) : '—',
         status, daysLeft: days ?? 0,
       };
     })))
     .catch(() => setCreds([]));
 }, []);

 return (
 <NScroll>
 <NHeader title={AR?' التوثيق المهني':' Credentialing'} onBack={onBack} />

 <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.info, lineHeight: 20, textAlign: AR?'right':'left' }}>
 {AR
 ? 'تتبع تراخيص SCFHS، شهادات المؤهلات، تأمين المسؤولية المهنية لجميع الأطباء تلقائياً مع تنبيهات الانتهاء.'
 : 'Track SCFHS licenses, qualification certificates, and malpractice insurance for all doctors with expiry alerts.'}
 </Text>
 </NCard>

 <View style={{ flexDirection:'row', gap: SP.md, marginBottom: SP.xl }}>
 <NStatCard icon="" label={AR?'سارية':'Valid'} value={String(CREDS.filter(c=>c.status==='valid').length)} color={tokens.success} style={{ flex:1 }} />
 <NStatCard icon="" label={AR?'تنتهي قريباً':'Expiring'} value={String(CREDS.filter(c=>c.status==='expiring').length)} color={tokens.warning} style={{ flex:1 }} />
 <NStatCard icon="" label={AR?'منتهية':'Expired'} value={String(CREDS.filter(c=>c.status==='expired').length)} color={tokens.error} style={{ flex:1 }} />
 </View>

 {CREDS.map(cred => (
 <NCard key={cred.id} style={{ marginBottom: SP.md }}
 accent={cred.status==='expired' ? theme.danger : cred.status==='expiring' ? theme.warn : theme.success}>
 <View style={{ flexDirection:AR?'row-reverse':'row', justifyContent:'space-between', marginBottom: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{cred.doctor}</Text>
 <NBadge
 label={cred.status==='valid'?(AR?' سارية':' Valid') :
 cred.status==='expiring'?(AR?' تنتهي قريباً':' Expiring Soon') : (AR?' منتهية':' Expired')}
 variant={cred.status==='valid'?'success':cred.status==='expiring'?'warning':'danger'}
 size="xs"
 />
 </View>
 <View style={{ gap: SP.xs }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign:AR?'right':'left' }}>
 SCFHS: {cred.scfhs} · {AR?`ينتهي: ${cred.scfhsExp}`:`Expires: ${cred.scfhsExp}`}
 </Text>
 <Text style={{ fontSize: FS.sm, color: cred.malpractice ? theme.success : theme.danger, textAlign:AR?'right':'left' }}>
 {AR?'تأمين المسؤولية:':'Malpractice:'} {cred.malpractice ? (AR?` ${cred.malpExp}`:` ${cred.malpExp}`) : (AR?' غير مشترك':' Not insured')}
 </Text>
 {cred.daysLeft < 90 && (
 <Text style={{ fontSize: FS.xs, color: cred.daysLeft < 0 ? theme.danger : theme.warn, fontWeight: FW.bold }}>
 {cred.daysLeft < 0
 ? (AR?`انتهى منذ ${Math.abs(cred.daysLeft)} يوم`:`Expired ${Math.abs(cred.daysLeft)} days ago`)
 : (AR?`ينتهي خلال ${cred.daysLeft} يوم`:`Expires in ${cred.daysLeft} days`)}
 </Text>
 )}
 </View>
 <View style={{ flexDirection:AR?'row-reverse':'row', gap: SP.sm, marginTop: SP.md }}>
 <NBtn label={AR?' الوثائق':'Docs'} size="xs" variant="outline" full={false}
 style={{ paddingHorizontal: SP.lg }} onPress={() => show(AR?'عرض الوثائق':'View docs','info')} />
 {cred.status !== 'valid' && (
 <NBtn label={AR?'↑ تجديد':'Renew'} size="xs" full={false}
 style={{ paddingHorizontal: SP.lg }} onPress={() => show(AR?'فتح نموذج التجديد':'Renewal form','info')} />
 )}
 </View>
 </NCard>
 ))}
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// FACILITY SETTINGS
