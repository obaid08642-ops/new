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

export function NotificationsScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [filter, setFilter] = useState<'all'|'unread'|'requests'|'payments'|'radiology_results'>('all');

 const [NOTIFS, setNOTIFS] = useState<any[]>([]);
  useEffect(() => {
    client.get('/provider/notifications').then(res => {
      setNOTIFS((res.data || []).map((n: any) => ({
        id: n.id || n._id,
        type: n.type?.toLowerCase().includes('radiology') ? 'radiology_result' : n.type?.toLowerCase().includes('payment') ? 'payment' : n.type?.toLowerCase().includes('system') ? 'system' : n.type?.toLowerCase().includes('review') ? 'review' : 'request',
        icon: n.type?.toLowerCase().includes('radiology') ? 'document-text' : n.type?.toLowerCase().includes('payment') ? 'cash' : 'notifications',
        ar: n.message_ar || n.message,
        en: n.message_en || n.message,
        time: new Date(n.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        unread: !n.read,
        metadata: n.metadata
      })));
    }).catch(() => {});
  }, []);

 const [DOCTORS, setDOCTORS] = useState<any[]>([]);
  useEffect(() => {
    client.get('/provider/directory')
      .then(res => setDOCTORS(res.data || []))
      .catch(() => {});
  }, []);

 const filters = [
 { k:'all', ar:'الكل', en:'All' },
 { k:'unread', ar:'غير مقروء',en:'Unread' },
 { k:'requests', ar:'طلبات', en:'Requests'},
 { k:'payments', ar:'مدفوعات', en:'Payments'},
 { k:'radiology_results', ar:'نتائج الأشعة', en:'Results'},
 ] as const;

 const filtered = filter === 'all' ? NOTIFS
 : filter === 'unread' ? NOTIFS.filter(n => n.unread)
 : filter === 'radiology_results' ? NOTIFS.filter(n => n.type === 'radiology_result')
 : NOTIFS.filter(n => n.type === filter.replace('s',''));

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
 <TouchableOpacity onPress={onBack}>
 <Text style={{ color: theme.primary, fontSize: FS.md }}>{AR ? '→' : '←'}</Text>
 </TouchableOpacity>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center' }}>
 <I name="bell" size={24} color={theme.text} /> {AR ? 'الإشعارات' : 'Notifications'}
 </Text>
 <TouchableOpacity onPress={async () => {
   try {
     await client.post('/provider/notifications/read-all', {});
     setNOTIFS((prev) => prev.map((n) => ({ ...n, unread: false })));
   } catch {
     show(AR ? 'تعذر مسح الإشعارات' : 'Could not clear notifications', 'error');
   }
 }}>
 <Text style={{ fontSize: FS.sm, color: theme.primary }}>{AR ? 'مسح الكل' : 'Clear All'}</Text>
 </TouchableOpacity>
 </View>

 <ScrollView horizontal showsHorizontalScrollIndicator={false}
 contentContainerStyle={{ paddingHorizontal: SP.lg, paddingVertical: SP.md, gap: SP.sm }}>
 {filters.map(f => (
 <TouchableOpacity key={f.k} onPress={() => setFilter(f.k as any)}
 style={[styles.filterChip2, {
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
 <TouchableOpacity onPress={() => {
    if (item.type === 'radiology_result' && item.metadata?.pdfUrl) {
      import('react-native').then(({ Linking }) => {
        if (typeof window !== 'undefined' && window.open) window.open(item.metadata.pdfUrl, '_blank');
        else Linking.openURL(item.metadata.pdfUrl);
      });
    }
 }}>
 <View style={[styles.notifRow, {
 backgroundColor: item.unread ? theme.primaryLight : theme.card,
 borderColor: item.unread ? theme.primary : theme.border,
 flexDirection: AR ? 'row-reverse' : 'row',
 }]}>
 <View style={[styles.notifIcon, { backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }]}>
 <I name={item.icon as any} size={20} color={item.unread ? theme.primary : theme.textSub} />
 </View>
 <View style={{ flex: 1 }}>
 <Text style={{
 fontSize: FS.md, color: theme.text,
 fontWeight: item.unread ? FW.bold : FW.reg,
 textAlign: AR ? 'right' : 'left',
 }} numberOfLines={2}>
 {AR ? item.ar : item.en}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 2 }}>
 {item.time}
 </Text>
 </View>
 {item.unread && (
 <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary, alignSelf: 'center' }} />
 )}
 </View>
 </TouchableOpacity>
 )}
 ItemSeparatorComponent={() => <View style={{ height: SP.sm }} />}
 />
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// CALENDAR SYNC SCREEN
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// AVAILABILITY PULSE SCREEN (ميزة تنافسية — غير موجودة عند المنافسين)
