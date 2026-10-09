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

export function InsuranceClaimsHubScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [statusFilter, setStatusFilter] = useState<'all'|'pending'|'approved'|'rejected'>('all');
 const [expandedClaim, setExpandedClaim] = useState<string | null>(null);

 const [CLAIMS, setClaims] = useState<any[]>([]);
 useEffect(() => {
   client.get('/insurance/requests/provider/queue')
     .then((res: any) => setClaims((res.data || []).map((r: any) => ({
       id: r.id, patient: r.patient_name || r.patient_id || '—',
       company: r.company_name || r.company_id || '—', plan: r.plan || '—',
       amount: r.amount || r.total || 0, deductible: r.copay || r.deductible || 0,
       status: (r.state || r.status || 'pending').toLowerCase().replace('pending_provider_review', 'pending'),
       date: (r.createdAt || '').slice(0, 10), diagCode: r.diagnosis_code || '—',
     }))))
     .catch(() => setClaims([]));
 }, []);

 const filtered = statusFilter === 'all' ? CLAIMS : CLAIMS.filter(c => c.status === statusFilter);
 const totalAmt = CLAIMS.filter(c=>c.status==='approved').reduce((a,c)=>a+c.amount-c.deductible,0);
 const pendingAmt = CLAIMS.filter(c=>c.status==='pending').reduce((a,c)=>a+c.amount-c.deductible,0);

 return (
 <NScroll>
 <NHeader title={AR ? ' مطالبات التأمين' : ' Insurance Claims Hub'} onBack={onBack} />

 <View style={{ flexDirection:'row', gap: SP.md, marginBottom: SP.xl }}>
 <NStatCard icon="" label={AR?'مقبولة هذا الشهر':'Approved this month'} value={`${(totalAmt/1000).toFixed(1)}K`} unit={AR?'ر':'SAR'} color={tokens.success} style={{ flex:1 }} />
 <NStatCard icon="" label={AR?'قيد الانتظار':'Pending'} value={`${(pendingAmt/1000).toFixed(1)}K`} unit={AR?'ر':'SAR'} color={tokens.warning} style={{ flex:1 }} />
 </View>

 <ScrollView horizontal showsHorizontalScrollIndicator={false}
 contentContainerStyle={{ gap: SP.sm, marginBottom: SP.lg }}>
 {[
 { k:'all', ar:'الكل', en:'All' },
 { k:'pending', ar:'انتظار', en:'Pending' },
 { k:'approved', ar:'مقبولة', en:'Approved' },
 { k:'rejected', ar:'مرفوضة', en:'Rejected' },
 ].map(f => (
 <TouchableOpacity key={f.k} onPress={() => setStatusFilter(f.k as any)}
 style={[s.chipBtn, {
 backgroundColor: statusFilter===f.k ? theme.primary : theme.surface2,
 borderColor: statusFilter===f.k ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: statusFilter===f.k?'#FFF':theme.text, fontSize: FS.sm }}>
 {AR ? f.ar : f.en}
 </Text>
 </TouchableOpacity>
 ))}
 </ScrollView>

 {filtered.map(claim => (
 <NCard key={claim.id} style={{ marginBottom: SP.md }}
 accent={claim.status==='approved' ? theme.success : claim.status==='rejected' ? theme.danger : theme.warn}>
 <View style={{ flexDirection: AR?'row-reverse':'row', justifyContent:'space-between', marginBottom: SP.sm }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{claim.patient}</Text>
 <NBadge
 label={claim.status==='approved'?(AR?' مقبولة':' Approved') :
 claim.status==='rejected'?(AR?' مرفوضة':' Rejected') : (AR?' انتظار':' Pending')}
 variant={claim.status==='approved'?'success':claim.status==='rejected'?'danger':'warning'}
 size="xs"
 />
 </View>
 <View style={{ flexDirection: AR?'row-reverse':'row', justifyContent:'space-between' }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{claim.company} · {claim.plan} · {claim.diagCode}</Text>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary }}>
 {(claim.amount - claim.deductible).toLocaleString()} {AR?'ر':'SAR'}
 </Text>
 </View>
 {claim.deductible > 0 && (
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR?'right':'left', marginTop: 2 }}>
 {AR ? `التحمّل: ${claim.deductible} ريال` : `Deductible: ${claim.deductible} SAR`}
 </Text>
 )}
 {claim.status === 'pending' && (
 <View style={{ flexDirection: AR?'row-reverse':'row', gap: SP.sm, marginTop: SP.md }}>
 <NBtn label={expandedClaim === claim.id ? (AR ? 'إخفاء التفاصيل' : 'Hide details') : (AR ? ' التفاصيل' : 'Details')} size="xs" full={false}
 style={{ paddingHorizontal: SP.lg }} onPress={() => setExpandedClaim(expandedClaim === claim.id ? null : claim.id)} />
 </View>
 )}
 {expandedClaim === claim.id && (
 <View style={{ marginTop: SP.sm, paddingTop: SP.sm, borderTopWidth: 1, borderTopColor: theme.border }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{AR ? 'المريض:' : 'Patient:'} {claim.patient} · {AR ? 'الشركة:' : 'Company:'} {claim.company} · {AR ? 'الخطة:' : 'Plan:'} {claim.plan}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{AR ? 'المبلغ:' : 'Amount:'} {(claim.amount - claim.deductible).toLocaleString()} {AR ? 'ر' : 'SAR'}</Text>
 </View>
 )}
 </NCard>
 ))}

 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: 'center' }}>{AR ? 'المطالبات الجديدة تُنشأ من قرارات التأمين المعتمدة' : 'New claims originate from approved insurance decisions'}</Text>
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// FINANCIAL REPORTS
