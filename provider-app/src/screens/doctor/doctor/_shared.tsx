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
 SmartOutboundReferralNetwork, SosDispatchScreen, GpsRouterScreen
} from '../../shared/BlueprintScreens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { tokens } from '../../../theme/tokens';

export const { width: W } = Dimensions.get('window');
export function VirtualWaitingRoomScreen({ onBack, onNavigate }: { onBack: () => void; onNavigate: (s: string, p?: any) => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/calls/provider/waiting-room');
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch {
      show(AR ? 'تعذر تحميل غرفة الانتظار' : 'Could not load waiting room', 'error');
    } finally {
      setLoading(false);
    }
  }, [AR, show]);
  useEffect(() => { void load(); }, [load]);
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'غرفة الانتظار الافتراضية' : 'Virtual Waiting Room'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.md }}>
        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xl }} />
        ) : rows.length === 0 ? (
          <NEmpty title={AR ? 'لا يوجد مرضى بانتظار مكالمة فيديو اليوم' : 'No patients waiting for a video call today'} icon="video" />
        ) : rows.map((r: any) => (
          <NCard key={String(r.id)}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{r.name}</Text>
                <Text style={{ fontSize: FS.sm, color: theme.textSub }}>
                  {r.time ? new Date(r.time).toLocaleTimeString(AR ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : ''} · {r.status}
                  {r.checkedIn ? (AR ? ' · وصل' : ' · checked in') : ''}
                </Text>
              </View>
              <NBtn label={AR ? 'انضمام' : 'Join'} full={false} onPress={() => onNavigate('video_call', { id: r.id, patient: r.name, service_type: 'video' })} />
            </View>
          </NCard>
        ))}
        <NBtn label={AR ? 'تحديث' : 'Refresh'} variant="outline" onPress={() => void load()} />
      </ScrollView>
    </View>
  );
}
export const Stack = createNativeStackNavigator();


export const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  iconBtn: { padding: 8, borderRadius: 8 },
  viewChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  timeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  freqChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  drugRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderRadius: 8 },
  dayChip2: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  specChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  insureCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2 },
  insChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  rTypeRow: { padding: 16, borderRadius: 8, marginBottom: 8, borderWidth: 1 },
  filterChip2: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  notifRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, gap: 12 },
  notifIcon: { width: 40, height: 40, borderRadius: 20 },
  calRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, alignItems: 'center', gap: 12 },
  calIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
});
