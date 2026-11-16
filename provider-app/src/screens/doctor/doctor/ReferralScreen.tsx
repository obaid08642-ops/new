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
import { fmtDate } from '../../../utils/dates';

export function ReferralScreen({ apt, onBack }:
 { apt: any; onBack: () => void }) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const specialties = useSpecialtiesCatalog();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [spec, setSpec] = useState('');
  const [reason, setReason] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [viewMode, setViewMode] = useState<'create'|'track'>('create');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(true);
  const loadReferrals = useCallback(async () => {
    setLoadingReferrals(true);
    try {
      const response = await client.get('/provider/referrals/mine');
      const rows = Array.isArray(response.data) ? response.data : (response.data?.items || []);
      setReferrals(rows.map((row: any) => ({
        id: row.id,
        patientName: row.patient_name || row.patientName || '—',
        date: row.created_at || row.date || '',
        target: row.target_name || row.target_type || '—',
        type: row.target_type || '',
        test: row.tests_summary || row.notes || '—',
        status: String(row.status || 'pending').toLowerCase(),
        statusAr: String(row.status || 'pending').toLowerCase() === 'completed' ? 'مكتمل' : String(row.status || 'pending').toLowerCase() === 'accepted' ? 'مقبول' : 'انتظار',
      })));
    } catch (error: any) {
      setReferrals([]);
      show(error?.response?.data?.message || (tt('sxv.41f69881')), 'error');
    } finally {
      setLoadingReferrals(false);
    }
  }, [AR, show]);
  useEffect(() => { loadReferrals(); }, [loadReferrals]);
 
  return (
  <NScroll>
  <NHeader title={tt('sxv.c85a4686')} onBack={onBack} />
 
  {/* Tab Switcher */}
  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, paddingHorizontal: SP.xl, marginBottom: SP.lg }}>
  <TouchableOpacity onPress={() => setViewMode('create')} style={{ flex: 1, paddingVertical: SP.sm, borderBottomWidth: 2, borderBottomColor: viewMode === 'create' ? theme.primary : 'transparent', alignItems: 'center' }}>
  <Text style={{ color: viewMode === 'create' ? theme.primary : theme.textSub, fontWeight: FW.bold }}>{tt('sxv.b7ca0d71')}</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={() => setViewMode('track')} style={{ flex: 1, paddingVertical: SP.sm, borderBottomWidth: 2, borderBottomColor: viewMode === 'track' ? theme.primary : 'transparent', alignItems: 'center' }}>
  <Text style={{ color: viewMode === 'track' ? theme.primary : theme.textSub, fontWeight: FW.bold }}>{tt('sxv.4943b514')}</Text>
  </TouchableOpacity>
  </View>

  {viewMode === 'track' ? (
  <View style={{ paddingHorizontal: SP.xl }}>
  {loadingReferrals ? <ActivityIndicator color={theme.primary} /> : referrals.length === 0 ? <NEmpty title={tt('sxv.f58ebdd0')} sub={tt('sxv.77687d83')} icon="send" /> : referrals.map(r => (
  <NCard key={r.id} style={{ marginBottom: SP.md }}>
  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.xs }}>
  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{r.patientName}</Text>
  <NBadge label={AR ? r.statusAr : r.status.toUpperCase()} variant={r.status === AppointmentStatus.COMPLETED ? 'success' : r.status === 'accepted' ? 'primary' : 'warning'} size="xs" />
  </View>
  <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{tt('sxv.04f08c41')} {r.target}</Text>
  <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{r.test} — {r.date}</Text>
  </NCard>
  ))}
  </View>
  ) : (
  <View>
  <NCard style={{ marginBottom: SP.xl, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
  <NAvatar name={apt?.patient ?? 'مريض'} size={44} />
  <View>
  <Text style={{ fontWeight: FW.bold, color: theme.text }}>{apt?.patient ?? '—'}</Text>
  <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{fmtDate(new Date(), AR)}</Text>
  </View>
  </NCard>

  <View style={{ marginBottom: SP.lg }}>
  <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
  {tt('sxv.dedcb393')}<Text style={{ color: theme.danger }}> *</Text>
  </Text>
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>
  {specialties.slice(0, 12).map(s => (
  <TouchableOpacity key={s.id} onPress={() => setSpec(s.id)}
  style={[styles.specChip, {
  backgroundColor: spec === s.id ? theme.primaryLight : theme.surface2,
  borderColor: spec === s.id ? theme.primary : theme.border,
  }]}>
  <Text style={{ fontSize: 16 }}>{s.icon}</Text>
  <Text style={{ fontSize: FS.xs, color: spec === s.id ? theme.primary : theme.text,
  fontWeight: spec === s.id ? FW.bold : FW.reg }}>
  {AR ? s.ar : s.en}
  </Text>
  </TouchableOpacity>
  ))}
  </View>
  </View>

  <NInput label={tt('sxv.b18c0bb5')}
  placeholder={tt('sxv.25a4465d')}
  value={reason} onChange={setReason} multi lines={4} icon="" required />

  <NToggle label={tt('sxv.ee3154c4')}
  sub={tt('sxv.d8feead9')}
  value={urgent} onChange={setUrgent} />

  <View style={{ height: SP.xl }} />

  <NBtn label={tt('sxv.382aebd5')}
  disabled={!spec || !reason.trim()}
  onPress={async () => {
  try {
  if (!apt?.patient_id) {
    show(tt('sxv.1444effb'), 'error');
    return;
  }
  await client.post('/provider/referrals', {
  appointment_id: apt.id || apt.appointment_id,
  target_type: 'specialty',
  target_specialty: spec,
  notes: reason,
  patient_id: apt.patient_id,
  patient_name: apt.patient || apt.patient_name || '',
  urgent,
  });
  await loadReferrals();
  setReason('');
  setViewMode('track');
  show(tt('sxv.e3fc652e'), 'success');
  } catch(e) {
  show(tt('sxv.8f1e89f6'), 'error');
  }
  }} />
  </View>
  )}
  </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST TEST SCREEN
