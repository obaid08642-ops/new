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

export function UnifiedScheduleScreen({ onBack }: { onBack: () => void }) {
 const insets = useSafeAreaInsets();
 const { theme } = useTheme();
 const { lang } = useLang();
 const AR = lang === 'ar';
 const [todayApts, setTodayApts] = useState<any[]>([]);
 useEffect(() => { client.get('/provider/jobs/queue?status=active&kind=appointment&today=true').then(r => setTodayApts(r.data || [])).catch(() => {}); }, []);
 const [filter, setFilter] = useState<'all'|'outpatient'|'surgery'|'emergency'>('all');
 const [deptFilter, setDeptFilter] = useState('all');

 const filtered = filter === 'all'
 ? todayApts
 : todayApts.filter((a: any) => a.type === filter);

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[s.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 16) }]}>
 {onBack && (
 <TouchableOpacity onPress={onBack}>
 <Text style={{ color: theme.primary, fontSize: FS.md }}>{AR ? '→' : '←'}</Text>
 </TouchableOpacity>
 )}
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>
 {AR ? ' الجدول الموحد' : ' Unified Schedule'}
 </Text>
 <View style={{ width: 30 }} />
 </View>

 <ScrollView horizontal showsHorizontalScrollIndicator={false}
 contentContainerStyle={{ paddingHorizontal: SP.lg, paddingVertical: SP.md, gap: SP.sm }}>
 {[
 { k:'all', ar:'الكل', en:'All' },
 { k:'outpatient', ar:'عيادة خارجية',en:'Outpatient'},
 { k:'surgery', ar:'عمليات', en:'Surgery' },
 { k:'emergency', ar:'طوارئ', en:'Emergency' },
 ].map(f => (
 <TouchableOpacity key={f.k} onPress={() => setFilter(f.k as any)}
 style={[s.chipBtn, {
 backgroundColor: filter === f.k ? theme.primary : theme.surface2,
 borderColor: filter === f.k ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: filter === f.k ? '#FFF' : theme.text, fontSize: FS.sm }}>
 {AR ? f.ar : f.en}
 </Text>
 </TouchableOpacity>
 ))}
 </ScrollView>

 <FlatList
 data={filtered}
 keyExtractor={i => i.id}
 contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}
 renderItem={({ item }) => (
 <NCard style={{ marginBottom: SP.sm }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center' }}>
 <View style={[s.timeTag, { backgroundColor: theme.primaryLight }]}>
 <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold }}>{item.time}</Text>
 </View>
 <NAvatar name={item.patient} size={40} />
 <View style={{ flex: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.semi, color: theme.text,
 textAlign: AR ? 'right' : 'left' }}>{item.patient}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
 {item.doctor} · {item.dept}
 </Text>
 </View>
 <NBadge
 label={item.type === 'emergency' ? (AR?' طوارئ':' ER') :
 item.type === 'surgery' ? (AR?' عملية':' OR') : (AR?' كشف':' OPD')}
 variant={item.type === 'emergency' ? 'danger' : item.type === 'surgery' ? 'warning' : 'primary'}
 size="xs"
 />
 </View>
 </NCard>
 )}
 />
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// QR CHECK-IN SCREEN
