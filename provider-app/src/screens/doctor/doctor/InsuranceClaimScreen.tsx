import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AppointmentStatus } from '../../../types/contracts';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Platform, Modal, TextInput,
 RefreshControl, Switch, ActivityIndicator, KeyboardAvoidingView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
 NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,
 NHeader, NScroll, NSheet, NSearch, NToggle, NSettingsRow,
 NSecHeader, NConfirm, NEmpty, NSkeleton, NOnlineToggle,
 NBottomNav, NDivider, NPriceInput, NProfileImageUploader
} from '../../../components/ui';
import { I, IBg } from '../../../components/icons';
import { SP, R, FS, FW, API_BASE } from '../../../constants';
import { buildHeaders, Vault, SK } from '../../../security/Security';
import client from '../../../api/client';
import { useServicesCatalog, getInsuranceCatalog, useSpecialtiesCatalog, useInsuranceCatalogState } from '../../../api/catalogs';
import { VideoCallRoom } from '../../shared/VideoCallRoom';
import { InsuranceRequestsScreen } from '../../shared/InsuranceRequestsScreen';
import { WithdrawalWorkflow, MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, GlobalSystemSettings, ChatSystem, MediaConfigScreen } from '../../shared/SharedScreens';
import { DoctorStatsRow } from '../components/DoctorStatsRow';
import { DoctorUrgentRequests } from '../components/DoctorUrgentRequests';
import { DoctorQueueList } from '../components/DoctorQueueList';
import { FacilityInvitationsScreen } from '../FacilityInvitationsScreen';
import {
 PromotionsDashboard, CreateCampaignScreen, ProfileWebConfig,
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights, AiMedicalCopilot,
 SmartOutboundReferralNetwork, SosDispatchScreen, GpsRouterScreen
} from '../../shared/BlueprintScreens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { tokens } from '../../../theme/tokens';
import { styles } from './_shared';

export function InsuranceClaimScreen({ apt, onBack }: { apt: any; onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
  const [company, setCompany] = useState('');
  // Q51: the insurer list is the admin-managed catalog, never a hard-coded five,
  // with explicit loading / error (retry) / empty states.
  const insurerCatalog = useInsuranceCatalogState();
  const insurers = insurerCatalog.companies;
 const [plan, setPlan] = useState('');
 const [diagCode, setDiagCode] = useState('');
 const [policyNumber, setPolicyNumber] = useState(apt?.patient?.insurance?.policy_number || '');
 const [memberId, setMemberId] = useState(apt?.patient?.insurance?.member_id || '');
 const [amount, setAmount] = useState('');
 const [deductible, setDeduct] = useState('');
 const [loading, setLoading] = useState(false);

 const net = amount && deductible
 ? Math.max(0, parseFloat(amount) - parseFloat(deductible)).toFixed(2)
 : '';

 return (
 <NScroll>
 <NHeader title={AR ? ' مطالبة تأمين' : ' Insurance Claim'} onBack={onBack} />

 <NCard style={{ marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text,
 marginBottom: SP.lg, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'بيانات التأمين' : 'Insurance Details'}
 </Text>

 {/* Company selector */}
 <View style={{ marginBottom: SP.lg }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'شركة التأمين' : 'Insurance Company'}<Text style={{ color: theme.danger }}> *</Text>
 </Text>
 {insurerCatalog.status === 'loading' ? (
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
 <ActivityIndicator size="small" color={theme.primary} />
 <Text style={{ color: theme.textSub, fontSize: FS.sm }}>{AR ? 'جارٍ تحميل شركات التأمين…' : 'Loading insurance companies…'}</Text>
 </View>
 ) : insurerCatalog.status === 'error' ? (
 <View style={{ alignItems: AR ? 'flex-end' : 'flex-start', gap: SP.sm }}>
 <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: FS.sm }}>{AR ? 'تعذر تحميل شركات التأمين' : 'Could not load insurance companies'}</Text>
 <TouchableOpacity accessibilityRole="button" onPress={insurerCatalog.reload}
 style={[styles.insChip, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
 <Text style={{ color: theme.text, fontSize: FS.sm }}>{AR ? 'إعادة المحاولة' : 'Retry'}</Text>
 </TouchableOpacity>
 </View>
 ) : insurers.length === 0 ? (
 <Text style={{ color: theme.textSub, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>{AR ? 'لا توجد شركات تأمين متاحة حالياً' : 'No insurance companies are available right now'}</Text>
 ) : (
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
 <View style={{ flexDirection: 'row', gap: SP.sm }}>
 {insurers.map(x => (AR ? x.ar : x.en)).map(c => (
 <TouchableOpacity key={c} onPress={() => setCompany(c)}
 style={[styles.insChip, {
 backgroundColor: company === c ? theme.primary : theme.surface2,
 borderColor: company === c ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: company === c ? '#FFF' : theme.text, fontSize: FS.sm }}>{c}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </ScrollView>
 )}
 </View>

 {/* Plan */}
 <View style={{ marginBottom: SP.lg }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'فئة الخطة' : 'Plan Category'}
 </Text>
 <View style={{ flexDirection: 'row', gap: SP.sm }}>
 {['VIP+','VIP','A','B','C'].map(p => (
 <TouchableOpacity key={p} onPress={() => setPlan(p)}
 style={[styles.insChip, {
 backgroundColor: plan === p ? theme.info : theme.surface2,
 borderColor: plan === p ? theme.info : theme.border,
 }]}>
 <Text style={{ color: plan === p ? '#FFF' : theme.text, fontWeight: FW.bold, fontSize: FS.sm }}>{p}</Text>
 </TouchableOpacity>
 ))}
 </View>
 </View>

 <NInput
 label={AR ? 'كود التشخيص ICD-10' : 'Diagnosis Code ICD-10'}
 placeholder="J06.9"
 value={diagCode} onChange={setDiagCode} icon=""
 hint={AR ? 'الكود الدولي لتصنيف الأمراض' : 'International Classification of Diseases code'}
 />

 <NInput
 label={AR ? 'رقم الوثيقة' : 'Policy Number'}
 placeholder="POL-123456"
 value={policyNumber} onChange={setPolicyNumber} icon=""
 />
 <NInput
 label={AR ? 'رقم العضوية' : 'Member ID'}
 placeholder="MEM-987654"
 value={memberId} onChange={setMemberId} icon=""
 />

 <NPriceInput
 label={AR ? 'إجمالي المبلغ المطلوب' : 'Total Claimed Amount'}
 value={amount} onChange={setAmount} required
 />
 <NPriceInput
 label={AR ? 'التحمّل على المريض (Deductible)' : 'Patient Deductible'}
 value={deductible} onChange={setDeduct}
 />

 {net && (
 <NCard style={{ backgroundColor: theme.successBg, padding: SP.lg }}>
 <Text style={{ fontSize: FS.sm, color: theme.success, textAlign: AR ? 'right' : 'left' }}>
 {AR ? ` صافي المطالبة للتأمين: ${net} ريال` : ` Net insurance claim: ${net} SAR`}
 </Text>
 </NCard>
 )}
 </NCard>

 <NBtn
 label={AR ? ' إرسال المطالبة' : ' Submit Claim'}
 disabled={!company || !amount}
 loading={loading}
 onPress={async () => {
 setLoading(true);
 try {
 if (!apt?.id) throw new Error(AR ? 'لم يتم العثور على موعد الجلسة' : 'Appointment ID not found');
 await client.post(`/provider/jobs/consultation/${apt.id}/insurance`, {
 policyNumber: policyNumber.trim() || undefined,
 memberId: memberId.trim() || undefined,
 diagnosisCode: diagCode.trim() || undefined,
 insuranceCompany: company,
 planCategory: plan || undefined,
 approvalStatus: 'APPROVED',
 coveragePercentage: amount && deductible && parseFloat(amount) > 0 ? Math.round((1 - parseFloat(deductible) / parseFloat(amount)) * 100) : 80,
 coveredAmount: parseFloat(amount) - (parseFloat(deductible) || 0),
 copayAmount: parseFloat(deductible) || 0,
 patientShare: parseFloat(deductible) || 0,
 insuranceShare: parseFloat(amount) - (parseFloat(deductible) || 0),
 });
 show(AR ? 'تم إرسال المطالبة بنجاح ' : 'Claim submitted successfully ', 'success');
 onBack();
 } catch (e: any) {
 show(e.message || (AR ? 'فشل إرسال المطالبة' : 'Failed to submit claim'), 'error');
 } finally {
 setLoading(false);
 }
 }}
 />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// MEDICAL REPORT WRITER
