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
 PromotionsDashboard, CreateCampaignScreen, 
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights, AiMedicalCopilot,
 SmartOutboundReferralNetwork
} from '../../shared/BlueprintScreens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { tokens } from '../../../theme/tokens';
import { styles } from './_shared';

export function SickLeaveScreen({ apt, onBack }:
 { apt: any; onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [days, setDays] = useState('3');
 const [from, setFrom] = useState(new Date().toISOString().split('T')[0]);
 const [diag, setDiag] = useState('');
 const [issued, setIssued] = useState(false);

 if (issued) {
 return (
 <View style={{ flex: 1, backgroundColor: theme.bg, padding: SP.xl, justifyContent: 'center', alignItems: 'center' }}>
 <Text style={{ fontSize: 80, marginBottom: SP.xl }}></Text>
 <Text style={{ fontSize: FS['2xl'], fontWeight: FW.bold, color: theme.text, textAlign: 'center', marginBottom: SP.md }}>
 {AR ? 'تم إصدار الإجازة المرضية' : 'Sick Leave Issued'}
 </Text>
 <NCard style={{ width: '100%', marginBottom: SP.xl, backgroundColor: theme.successBg }}>
 <Text style={{ fontSize: FS.sm, color: theme.success, textAlign: AR ? 'right' : 'left', lineHeight: 24 }}>
 {AR ? ` إجازة مرضية لمدة ${days} أيام\n من: ${from}\n رمز QR فريد للتحقق` : ` ${days}-day sick leave\n From: ${from}\n Unique QR code for verification`}
 </Text>
 </NCard>
 <Text style={{ fontSize: FS['5xl'] }}></Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', marginTop: SP.md }}>
 {AR ? 'تم إرسال الإجازة للمريض عبر QR Code ورسالة نصية' : 'Sick leave sent to patient via QR Code & SMS'}
 </Text>
 <NBtn label={AR ? 'رجوع' : 'Back'} onPress={onBack} style={{ marginTop: SP.xxl }} />
 </View>
 );
 }

 return (
 <NScroll>
 <NHeader title={AR ? ' إجازة مرضية رقمية' : ' Digital Sick Leave'} onBack={onBack} />

 <NCard style={{ marginBottom: SP.xl, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <NAvatar name={apt?.patient ?? 'مريض'} size={44} />
 <View>
 <Text style={{ fontWeight: FW.bold, color: theme.text }}>{apt?.patient ?? '—'}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{AR ? 'تاريخ اليوم:' : 'Today:'} {from}</Text>
 </View>
 </NCard>

 <NInput label={AR ? 'التشخيص' : 'Diagnosis'}  placeholder={AR ? 'سبب الإجازة الطبية' : 'Medical reason for leave'}
 value={diag} onChange={setDiag} icon="" required />

 <NInput label={AR ? 'تاريخ البداية' : 'Start Date'} placeholder="YYYY-MM-DD"
 value={from} onChange={setFrom} icon="" />

 <View style={{ marginBottom: SP.lg }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {AR ? 'عدد الأيام' : 'Number of Days'}
 </Text>
 <View style={{ flexDirection: 'row', gap: SP.sm, flexWrap: 'wrap' }}>
 {['1','2','3','5','7','10','14'].map(d => (
 <TouchableOpacity key={d} onPress={() => setDays(d)}
 style={[styles.dayChip2, {
 backgroundColor: days === d ? theme.primary : theme.surface2,
 borderColor: days === d ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: days === d ? '#FFF' : theme.text, fontWeight: FW.bold }}>
 {d} {AR ? (d==='1'?'يوم':'أيام') : (d==='1'?'day':'days')}
 </Text>
 </TouchableOpacity>
 ))}
 </View>
 </View>

 <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.info, textAlign: AR ? 'right' : 'left', lineHeight: 20 }}>
  {AR
 ? 'إصدار الإجازة غير متاح من التطبيق إلى أن يتحقق الخادم من علاقة الموعد وترخيص الطبيب والتوقيع القانوني ورقم التحقق.'
 : 'Issuance is unavailable from the app until the server verifies appointment relation, doctor licence, legal signature, and verification reference.'}
 </Text>
 </NCard>

  <NBtn label={AR ? ' إصدار وإرسال الإجازة' : ' Issue & Send Sick Leave'}
  disabled={!diag.trim()}
  onPress={async () => {
    const patientId = apt?.patient_id || apt?.raw?.patient_id;
    const appointmentId = apt?.id || apt?.raw?.id || 'new';
    if (!patientId) {
      show(AR ? 'معرّف المريض غير متاح؛ لا يمكن طلب الإجازة.' : 'Patient identifier is unavailable; leave issuance cannot be requested.', 'error');
      return;
    }
    try {
      const res = await client.post(`/provider/requests/${appointmentId}/sick-leave`, {
        patient_id: patientId,
        duration_days: parseInt(days, 10) || 1,
        start_date: from,
        diagnosis: diag,
      });
      show(AR ? `تم إصدار الإجازة الطبية برقم تتبع ${res.data?.tracking_id || '—'}` : `Official sick leave issued: ${res.data?.tracking_id || '—'}`, 'success');
      setIssued(true);
    } catch (err: any) {
      show(err?.response?.data?.message || (AR ? 'فشل إصدار الإجازة' : 'Failed to issue sick leave'), 'error');
    }
  }} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// REFERRAL SCREEN
