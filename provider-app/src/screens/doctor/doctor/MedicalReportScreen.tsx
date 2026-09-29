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
import { useServicesCatalog, getInsuranceCatalog, useSpecialtiesCatalog } from '../../../api/catalogs';
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

export function MedicalReportScreen({ apt, onBack }: { apt: any; onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [type, setType] = useState('');
 const [findings, setFindings] = useState('');
 const [conclusion, setConclusion] = useState('');
 const [recs, setRecs] = useState('');

 const REPORT_TYPES = [
 { ar: 'تقرير طبي عام', en: 'General Medical Report' },
 { ar: 'تقرير للعمل/الدراسة', en: 'Work / Study Report' },
 { ar: 'تقرير لتأمين السفر', en: 'Travel Insurance Report' },
 { ar: 'تقرير متابعة مزمن', en: 'Chronic Follow-up' },
 { ar: 'تقرير عيادي مفصّل', en: 'Detailed Clinical Report' },
 ];

 return (
 <NScroll>
 <NHeader title={AR ? ' كتابة تقرير طبي' : ' Medical Report'} onBack={onBack} />

 <NCard style={{ marginBottom: SP.xl, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <NAvatar name={apt?.patient ?? 'مريض'} size={44} />
 <View>
 <Text style={{ fontWeight: FW.bold, color: theme.text }}>{apt?.patient ?? '—'}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{new Date().toLocaleDateString('ar-SA')}</Text>
 </View>
 </NCard>

 <View style={{ marginBottom: SP.lg }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'نوع التقرير' : 'Report Type'}<Text style={{ color: theme.danger }}> *</Text>
 </Text>
 {REPORT_TYPES.map((t, i) => (
 <TouchableOpacity key={i} onPress={() => setType(AR ? t.ar : t.en)}
 style={[styles.rTypeRow, {
 backgroundColor: type === (AR ? t.ar : t.en) ? theme.primaryLight : theme.surface2,
 borderColor: type === (AR ? t.ar : t.en) ? theme.primary : theme.border,
 }]}>
 <Text style={{
 flex: 1, color: type === (AR ? t.ar : t.en) ? theme.primary : theme.text,
 fontWeight: type === (AR ? t.ar : t.en) ? FW.bold : FW.reg,
 textAlign: AR ? 'right' : 'left',
 }}>{AR ? t.ar : t.en}</Text>
 {type === (AR ? t.ar : t.en) && <Text style={{ color: theme.primary }}></Text>}
 </TouchableOpacity>
 ))}
 </View>

 <NInput
 label={AR ? 'النتائج السريرية' : 'Clinical Findings'}
 placeholder={AR ? 'اذكر الأعراض والفحوصات والنتائج...' : 'State symptoms, examinations and findings...'}
 value={findings} onChange={setFindings} multi lines={5} icon="" required
 />
 <NInput
 label={AR ? 'الاستنتاج والتشخيص' : 'Conclusion & Diagnosis'}
 placeholder={AR ? 'التشخيص النهائي...' : 'Final diagnosis...'}
 value={conclusion} onChange={setConclusion} multi lines={3} icon=""
 />
 <NInput
 label={AR ? 'التوصيات والعلاج' : 'Recommendations & Treatment'}
 placeholder={AR ? 'العلاج والتوصيات...' : 'Treatment and recommendations...'}
 value={recs} onChange={setRecs} multi lines={3} icon=""
 />

 <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.info, textAlign: AR ? 'right' : 'left' }}>
  {AR
 ? 'التقرير الطبي موقّع بتوقيع رقمي وبرمز QR موثّق من وزارة الصحة.'
 : 'Medical report is digitally signed with MOH-verified QR code.'}
 </Text>
 </NCard>

 <NBtn
 label={AR ? ' إصدار التقرير الطبي' : ' Issue Medical Report'}
 disabled={!type || !findings.trim()}
 onPress={async () => {
   try {
     if (!apt?.id || !apt?.patient_id) {
       show(AR ? 'لا يمكن إصدار التقرير دون حجز ومريض مرتبطين' : 'Cannot issue a report without a linked appointment and patient', 'error');
       return;
     }
     await client.post(`/provider/requests/${apt.id}/medical-report`, {
       patient_id: apt.patient_id,
       type, findings, conclusion, recommendations: recs
     });
     show(AR ? 'تم إصدار التقرير الطبي ' : 'Report issued ', 'success');
     onBack();
   } catch (err) {
     show(AR ? 'حدث خطأ' : 'Failed to issue report', 'error');
   }
 }}
 />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS CENTER
