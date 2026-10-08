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

export function FacilityOrdersTab({ onNavigate, onRefresh }: any) {
 const insets = useSafeAreaInsets();
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [tab, setTab] = useState<'pending'|'active'|'inbox'>('pending');
  // Governed job queue (hospital kinds: lab, radiology, consultation); accept/reject in FacilityOrderDetail.
  const [incoming, setIncoming] = useState<any[]>([]);
  const [active, setActive] = useState<any[]>([]);
  // Facility inbox: notices such as an ambulance handing a patient over to this facility.
  const [inbox, setInbox] = useState<any[]>([]);
  const rows = (r: any) => (Array.isArray(r?.data) ? r.data : r?.data?.items || []);

  const load = useCallback(() => {
    client.get('/provider/jobs/queue?status=incoming').then(r => setIncoming(rows(r))).catch(() => setIncoming([]));
    client.get('/provider/jobs/queue?status=active').then(r => setActive(rows(r))).catch(() => setActive([]));
    client.get('/facility/inbox').then(r => setInbox(rows(r))).catch(() => setInbox([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    try { await client.post(`/facility/inbox/${id}/read`); setInbox(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)); } catch {}
  };

  const jobCard = (order: any, confirmed: boolean) => (
    <NCard key={`${order.kind}:${order.id}`} style={{ marginBottom: SP.md }} onPress={() => (confirmed ? null : onNavigate('order_detail', order))}>
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{order.title_ar || order.kind}</Text>
        <NBadge label={confirmed ? (AR ? 'مؤكد' : 'Confirmed') : (AR ? 'جديد' : 'New')} variant={confirmed ? 'success' : 'info'} size="xs" />
      </View>
      <Text style={{ color: theme.textSub, marginTop: SP.sm, textAlign: AR ? 'right' : 'left' }}>
        {order.tracking_id} · {order.total} SAR{order.scheduled_at ? ` · ${new Date(order.scheduled_at).toLocaleString(AR ? 'ar-SA' : 'en-US')}` : ''}
      </Text>
    </NCard>
  );

  const tabs: Array<{ k: 'pending'|'active'|'inbox'; ar: string; en: string }> = [
    { k: 'pending', ar: `طلبات جديدة (${incoming.length})`, en: `New (${incoming.length})` },
    { k: 'active', ar: 'مؤكدة', en: 'Confirmed' },
    { k: 'inbox', ar: `الإشعارات (${inbox.filter(n => !n.read).length})`, en: `Notices (${inbox.filter(n => !n.read).length})` },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[s.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{AR ? 'الطلبات' : 'Orders'}</Text>
      </View>

      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', borderBottomWidth: 1, borderColor: theme.border }}>
        {tabs.map(t => (
          <TouchableOpacity key={t.k} style={{ flex: 1, padding: SP.md, alignItems: 'center', borderBottomWidth: tab === t.k ? 2 : 0, borderColor: theme.primary }} onPress={() => { setTab(t.k); load(); }}>
            <Text style={{ color: tab === t.k ? theme.primary : theme.textSub, fontWeight: FW.bold }}>{AR ? t.ar : t.en}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
        {tab === 'pending' && (incoming.length === 0 ? <NEmpty title={AR ? 'لا توجد طلبات' : 'No Orders'} icon="document" /> : incoming.map(o => jobCard(o, false)))}
        {tab === 'active' && (active.length === 0 ? <NEmpty title={AR ? 'لا توجد مواعيد' : 'No Appointments'} icon="calendar" /> : active.map(o => jobCard(o, true)))}
        {tab === 'inbox' && (inbox.length === 0 ? <NEmpty title={AR ? 'لا توجد إشعارات' : 'No Notices'} icon="notifications" /> : inbox.map((n: any) => (
          <NCard key={n.id} style={{ marginBottom: SP.md, opacity: n.read ? 0.6 : 1 }} onPress={() => !n.read && markRead(n.id)}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{n.title}</Text>
              {!n.read && <NBadge label={AR ? 'جديد' : 'New'} variant="warning" size="xs" />}
            </View>
            <Text style={{ color: theme.textSub, marginTop: SP.sm, textAlign: AR ? 'right' : 'left' }}>{n.body}</Text>
            {n.created_at ? <Text style={{ color: theme.textSub, fontSize: FS.xs, marginTop: SP.xs }}>{new Date(n.created_at).toLocaleString(AR ? 'ar-SA' : 'en-US')}</Text> : null}
          </NCard>
        )))}
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FACILITY DASHBOARD NAVIGATOR
// ══════════════════════════════════════════════════════════════════════════════
const Stack = createNativeStackNavigator();

