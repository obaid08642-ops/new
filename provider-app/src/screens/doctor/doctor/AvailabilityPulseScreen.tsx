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

export function AvailabilityPulseScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang, t: tt } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
  const [pulseOn, setPulse] = useState(false);
 const [minutes, setMinutes] = useState('5');
 const [saving, setSaving] = useState(false);
 const pulseAnim = useRef(new Animated.Value(1)).current;
 useEffect(() => {
   let active = true;
   client.get('/provider/profile/availability').then((response) => {
     if (!active || !response.data) return;
     setPulse(Boolean(response.data.instant_available));
     if (response.data.instant_available_minutes) setMinutes(String(response.data.instant_available_minutes));
   }).catch(() => {
     if (active) show(tt('rrw.a40524f9'), 'error');
   });
   return () => { active = false; };
 }, [AR, show]);
 useEffect(() => {
 if (!pulseOn) return;
 const loop = Animated.loop(Animated.sequence([
 Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
 Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
 ]));
 loop.start();
 return () => loop.stop();
 }, [pulseOn]);

 return (
 <NScroll>
 <NHeader title={tt('rrw.9a4e1480')} onBack={onBack} />

 <NCard style={{ backgroundColor: theme.primaryLight, marginBottom: SP.xl, alignItems: 'center', padding: SP.xxl }}>
 <Animated.View style={{ transform: [{ scale: pulseOn ? pulseAnim : 1 }] }}>
 <View style={{
 width: 80, height: 80, borderRadius: 40,
 backgroundColor: pulseOn ? theme.primary : theme.surface2,
 alignItems: 'center', justifyContent: 'center',
 marginBottom: SP.lg,
 }}>
 <Text style={{ fontSize: 36 }}>{pulseOn ? '' : ''}</Text>
 </View>
 </Animated.View>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text, textAlign: 'center' }}>
 {pulseOn
 ? (tt('tpe.e0a23dc7', { p1: String(minutes) }))
 : (tt('rrw.d6d190ff'))}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', marginTop: SP.xs }}>
 {tt('rrw.6fc76ec7')}
 </Text>
 </NCard>

 <NCard style={{ marginBottom: SP.xl }}>
 <NToggle
 label={tt('rrw.5678b5bb')}
 sub={tt('rrw.87f6296b')}
 value={pulseOn} onChange={v => {
 setPulse(v);
 show(v ? (tt('rrw.70e6f274')) : (tt('rrw.f2a63a32')), v ? 'success' : 'info');
 }}
 />

 {pulseOn && (
 <View style={{ marginTop: SP.lg }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 {tt('rrw.97d9ce4a')}
 </Text>
 <View style={{ flexDirection: 'row', gap: SP.sm }}>
 {['2','5','10','15','30'].map(m => (
 <TouchableOpacity key={m} onPress={() => setMinutes(m)}
 style={[styles.insChip, {
 backgroundColor: minutes === m ? theme.primary : theme.surface2,
 borderColor: minutes === m ? theme.primary : theme.border,
 }]}>
 <Text style={{ color: minutes === m ? '#FFF' : theme.text, fontWeight: FW.semi }}>
 {m} {AR ? 'دق' : 'min'}
 </Text>
 </TouchableOpacity>
 ))}
 </View>
 </View>
 )}
 </NCard>

  <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.sm, color: theme.info, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
  {tt('rrw.93fe39e6')}
 </Text>
 </NCard>
 <NBtn label={tt('rrw.89af874d')} loading={saving}
 onPress={async () => {
   setSaving(true);
   try {
     await client.patch('/provider/profile/availability', { instant_available: pulseOn, instant_available_minutes: Number(minutes) });
     show(tt('rrw.22e6ef54'), 'success');
     onBack();
   } catch (error: any) {
     show(error?.response?.data?.message || (tt('rrw.6442aec5')), 'error');
   } finally { setSaving(false); }
 }} />
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFESSIONAL NETWORK (Doximity-style — ميزة تنافسية)
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// DOCTOR SERVICE MANAGEMENT SCREEN (Real API version)
// ══════════════════════════════════════════════════════════════════════════════
export const MODE_MAP: Record<string, any> = {
 video: {
 nameAr: 'استشارة فيديو',
 nameEn: 'Video Consult',
 descAr: 'استشارة طبية عن بعد عبر مكالمة فيديو عالية الدقة',
 descEn: 'Telehealth medical consult via high-def video call'
 },
 voice: {
 nameAr: 'استشارة صوتية',
 nameEn: 'Audio Consult',
 descAr: 'استشارة طبية صوتية سريعة',
 descEn: 'Quick audio-only medical consultation'
 },
 clinic: {
 nameAr: 'كشف عيادة',
 nameEn: 'Clinic Visit',
 descAr: 'زيارة وحجز موعد بالعيادة الخاصة بالطبيب',
 descEn: 'In-person clinic visit at doctor\'s practice'
 },
 home: {
 nameAr: 'زيارة منزلية',
 nameEn: 'Home Visit',
 descAr: 'زيارة منزلية مخصصة للحالات المناسبة',
 descEn: 'Direct home visit for eligible patients'
 },
 chat: {
 nameAr: 'استشارة دردشة',
 nameEn: 'Chat Consult',
 descAr: 'استشارة طبية سريعة عبر المحادثة الفورية',
 descEn: 'Fast medical consultation via instant messaging'
 }
};

