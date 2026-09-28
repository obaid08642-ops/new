import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AppointmentStatus } from '../../../types/contracts';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Platform, Modal, TextInput,
 RefreshControl, Switch, ActivityIndicator, KeyboardAvoidingView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Audio } from 'expo-av';
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
import { Stack, VirtualWaitingRoomScreen, styles } from './_shared';
import { RequestTestScreen } from './RequestTestScreen';
import { EPrescriptionScreen } from './EPrescriptionScreen';
import { SickLeaveScreen } from './SickLeaveScreen';
import { MedicalReportScreen } from './MedicalReportScreen';
import { ReferralScreen } from './ReferralScreen';
import { DoctorAvailabilityScreen } from './DoctorAvailabilityScreen';
import { DoctorServiceManagementScreen } from './DoctorServiceManagementScreen';
import { CertificatesConfigScreen, PreVisitChatScreen, InboundMedicalReportsScreen } from './CertificatesConfigScreen';
import { DoctorLocationScreen } from './DoctorLocationScreen';

import { DoctorWalletTab } from './DoctorWalletTab';
import { DoctorSettingsTab } from './DoctorSettingsTab';
import { PatientFileScreen } from './PatientFileScreen';
import { DoctorProfileEditScreen } from './DoctorProfileEditScreen';

// ════
// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULE TAB
// ══════════════════════════════════════════════════════════════════════════════
export function DoctorScheduleTab({ onNavigate }: { onNavigate: (s: string, p?: any) => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const AR = lang === 'ar';
 const [view, setView] = useState<'day'|'week'|'list'>('list');
 const [filter, setFilter] = useState<'all'|'video'|'clinic'|'home'>('all');
  const [apts, setApts] = useState<any[]>([]);
 const [loadError, setLoadError] = useState<string | null>(null);
 const filters = [
 { k:'all', ar:'الكل', en:'All' },
 { k:'video', ar:'فيديو', en:'Video' },
 { k:'clinic', ar:'عيادة', en:'Clinic' },
 { k:'home', ar:'منزلية', en:'Home' },
 ] as const;

 useEffect(() => {
 client.get('/provider/jobs/queue?status=active&kind=consultation')
 .then(res => {
 setLoadError(null);
 setApts((res.data || []).map((x: any) => ({
 id: x.id,
 patient: x.patient_name || (AR ? 'مريض نبض' : 'Nabdah Patient'),
 time: x.scheduled_at ? new Date(x.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
 type: x.service_type || 'video',
 status: x.domain_state === 'IN_PROGRESS' || x.universal_state === AppointmentStatus.IN_PROGRESS ? AppointmentStatus.IN_PROGRESS : 'confirmed',
 price: x.total ?? x.price ?? 0,
 raw: x
 })));
 })
 .catch(() => {
  setApts([]);
  setLoadError(AR ? 'تعذر تحميل المواعيد من الخادم. حاول مرة أخرى.' : 'Unable to load appointments from the server. Please try again.');
 });
 }, [AR]);

 const filtered = filter === 'all' ? apts : apts.filter(a => a.type === filter);

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>
 {AR ? ' المواعيد' : ' Schedule'}
 </Text>
 <TouchableOpacity onPress={() => onNavigate('virtual_waiting_room')}
 style={[styles.iconBtn, { backgroundColor: theme.surface2 }]}>
 <I name="user-x" size={20} color={theme.text} />
 </TouchableOpacity>
 </View>

 {/* View toggles */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, paddingHorizontal: SP.lg, paddingTop: SP.lg, paddingBottom: SP.xs, alignItems: 'center' }}>
 {(['day','week','list'] as const).map(v => (
 <TouchableOpacity key={v} onPress={() => setView(v)}
 style={[styles.viewChip, {
 backgroundColor: view === v ? theme.primary : theme.surface2,
 borderColor: view === v ? theme.primary : theme.border,
 alignItems: 'center', justifyContent: 'center', height: 36
 }]}>
 <Text style={{ color: view === v ? '#FFF' : theme.text, fontSize: FS.sm }}>
 {v === 'day' ? (AR?'يوم':'Day') : v === 'week' ? (AR?'أسبوع':'Week') : (AR?'قائمة':'List')}
 </Text>
 </TouchableOpacity>
 ))}
 </View>

 {/* Filter chips */}
 <View style={{ height: 44 }}>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}
  contentContainerStyle={{ paddingHorizontal: SP.lg, gap: SP.sm, alignItems: 'center' }}>
  {filters.map(f => (
  <TouchableOpacity key={f.k} onPress={() => setFilter(f.k as any)}
  style={[styles.filterChip, {
  backgroundColor: filter === f.k ? theme.primary : theme.surface2,
  borderColor: filter === f.k ? theme.primary : theme.border,
  alignItems: 'center', justifyContent: 'center', height: 32, paddingVertical: 0
  }]}>
 <Text style={{ color: filter === f.k ? '#FFF' : theme.text, fontSize: FS.sm }}>
 {AR ? f.ar : f.en}
 </Text>
 </TouchableOpacity>
 ))}
 </ScrollView>
 </View>

 <FlatList
 data={filtered}
 keyExtractor={i => i.id}
 contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}
 ListEmptyComponent={<NEmpty title={loadError ? (AR ? 'تعذر تحميل المواعيد' : 'Unable to load appointments') : (AR ? 'لا توجد مواعيد' : 'No appointments')} sub={loadError || (AR ? 'اختر تاريخاً أو نوعاً آخر.' : 'Try selecting another date or type.')} icon="calendar" />}
 renderItem={({ item }) => (
 <TouchableOpacity onPress={() => onNavigate('appointment_detail', item)}>
 <NCard style={{ marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <View style={[styles.timeTag, { backgroundColor: theme.primaryLight }]}>
 <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold }}>{item.time}</Text>
 </View>
 <NAvatar name={item.patient} size={40} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left' }}>{item.patient}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
 {item.type === 'video'?'':item.type==='clinic'?'':''} {item.price} {AR?'ر':'SAR'}
 </Text>
 </View>
 <NBadge
 label={item.status === 'confirmed' ? (AR?'مؤكد':'Confirmed') : item.status === AppointmentStatus.IN_PROGRESS ? (AR?'جارٍ':'Active') : (AR?'انتظار':'Pending')}
 variant={item.status === 'confirmed' ? 'success' : item.status === AppointmentStatus.IN_PROGRESS ? 'warning' : 'info'}
 size="xs" />
 </View>
 </NCard>
 </TouchableOpacity>
 )}
 />
 </View>
 );
}
