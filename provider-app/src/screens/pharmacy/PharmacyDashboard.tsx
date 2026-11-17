/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║ NABDAH PLUS – PHASE 3 · PHARMACY DASHBOARD (ALL SCREENS) ║
 * ║ ║
 * ║ 01. PharmacyHomeTab — dashboard + live broadcast orders ║
 * ║ 05. MedicationRefillsScreen — chronic meds auto-refill management ║
 * ║ 06. DrugPriceComparisonScreen— compare prices across pharmacies ║
 * ║ 07. InventoryManagement — stock levels + alerts + categories ║
 * ║ 08. AddProductScreen — add drug → admin approval flow ║
 * ║ 09. ExpiryTrackingScreen — track expiry dates + batch recall ║
 * ║ 10. ShortageReportScreen — report shortage → admin ║
 * ║ 11. B2BSupplyRequestScreen — Voice/OCR/Manual supplier orders ║
 * ║ 12. OrderHistoryScreen — all past orders + status + filter ║
 * ║ 14. PharmacyQRMenuScreen — QR code for customer product catalog ║
 * ║ 15. ReviewsAndRatingsScreen — pharmacy reviews + auto-reply ║
 * ║ 16. PharmacyWalletScreen — earnings + withdrawal ║
 * ║ 17. PharmacySettingsScreen — all settings ║
 * ║ + ChronicDiseaseProgramScreen (BONUS competitive feature) ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { OwnDeliveryFields } from './OwnDeliveryForm';
import { EMPTY_OWN_DELIVERY, ownDeliveryError, ownDeliveryFromServer, ownDeliveryPayload } from './ownDelivery';
import type { OwnDeliveryForm as OwnDeliveryFormState } from './ownDelivery';
import { io, Socket } from 'socket.io-client';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Switch, RefreshControl, Modal, TextInput, ActivityIndicator, Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../context';
import { I, IBg } from '../../components/icons';
import {
 NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,
 NHeader, NScroll, NSheet, NSearch, NToggle, NSettingsRow,
 NSecHeader, NConfirm, NEmpty, NOnlineToggle, NBottomNav,
 NDivider, NPriceInput, NRadio, NProfileImageUploader
} from '../../components/ui';
import { SP, R, FS, FW, PHARMA_CATS, LIMITS, C, API_BASE } from '../../constants';
import { InsuranceRequestsScreen } from '../shared/InsuranceRequestsScreen';
import { PharmacyInsuranceQueueScreen, PharmacyInsuranceDecisionForAllocation } from './PharmacyInsuranceDecision';
import { PharmacyMoreScreen, SetupChecklist } from './PharmacyMore';
import { PharmacyPrescriptionReviewScreen } from './PharmacyPrescriptionReview';
import { PharmacyMyOffers } from './PharmacyMyOffers';
import { PharmacyReturnDetail } from './PharmacyReturnDetail';
import { buildHeaders, Biometric, SK, Vault } from '../../security/Security';
import { analysisItems } from '../../utils/procurementAnalysis';
import client from '../../api/client';
import { WithdrawalWorkflow, MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, ProviderWalletScreen, ProviderProfileEditor, ProviderHomeStats, GlobalSystemSettings } from '../shared/SharedScreens';
import {
 PromotionsDashboard, CreateCampaignScreen, 
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 CrmHub, RevenueInsights,
 PharmacyBroadcastResponse, InventoryExpiryMonitor
} from '../shared/BlueprintScreens';

const { width: W } = Dimensions.get('window');

// Connected to backend APIs for pharmacy orders, inventory, history, and refills

import { 
  ReviewsAndRatingsScreen, WorkingHoursEditorScreen, SecurityManagementScreen, 
  NotificationsCenterScreen, TechnicalSupportTicketsScreen 
} from '../shared/RealScreens';
import { 
  PharmacyQRMenuScreen, ChronicDiseaseProgramScreen, 
  MedicationRefillsScreen, AddProductScreen, 
  ExpiryTrackingScreen, ShortageReportScreen 
} from '../shared/RealScreensExtended';

// ══════════════════════════════════════════════════════════════════════════════
// PHARMACY DASHBOARD NAVIGATOR
// ══════════════════════════════════════════════════════════════════════════════
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useUploadsEnabled } from '../../hooks/useUploadsEnabled';
import { UploadsUnavailable } from '../../components/UploadsUnavailable';
const Stack = createNativeStackNavigator();

export function PharmacyDashboardNavigator({ onLogout }: { onLogout:()=>void }) {
 const [activeTab, setTab] = useState('home');
 const { theme } = useTheme();
 const { lang, t: tt } = useLang();
 const AR = lang === 'ar';
 const { toggleOnline } = useAuth();

  const [unlocked, setUnlocked] = useState(false);
  const [bioError, setBioError] = useState('');

  // BIOMETRIC GLOBAL WRAPPER: Enforce unlock on app open
  useEffect(() => {
    async function checkLock() {
      const isBioOn = await Vault.get(SK.BIOENABLED);
      if (isBioOn === '1') {
        const ok = await Biometric.authenticate('قم بالمصادقة للوصول إلى لوحة تحكم الصيدلية');
        if (ok.success) setUnlocked(true);
        else setBioError('فشلت المصادقة الحيوية. الرجاء المحاولة مرة أخرى.');
      } else {
        setUnlocked(true);
      }
    }
    checkLock();
  }, []);

  const tabs = [
    { key: 'orders', icon: 'radar', label: tt('phdash.33519de2') },
    { key: 'b2b', icon: 'activity', label: tt('phdash.016446d5') },
    { key: 'dispatch', icon: 'truck', label: tt('phdash.68fdab11') },
    { key: 'settings', icon: 'settings', label: tt('phdash.4ec28739') },
  ];

 return (
   <Stack.Navigator id={undefined as any} screenOptions={{ headerShown: false }}>
     <Stack.Screen name="MainTabs">
       {({ navigation }) => {
         const go = (s: string, param?: any) => navigation.navigate(s, { param });
         return (
           <View style={{ flex: 1 }}>
             {/* Note: In Pharmacy, activeTab starts at 'home' but tabs array has 'orders' first.
                 Using legacy condition checks here for tabs: */}
             {(!unlocked) ? (
                <View style={{flex:1, alignItems:'center', justifyContent:'center', padding:SP.xl}}>
                  <Text style={{color:theme.danger, fontSize:FS.md, textAlign:'center', marginBottom:SP.lg}}>{bioError}</Text>
                  <NBtn label={tt('phdash.7a5b6c48')} onPress={() => { setBioError(''); Biometric.authenticate('قم بالمصادقة').then(r => r.success ? setUnlocked(true) : setBioError('فشلت المصادقة الحيوية')); }} />
                </View>
             ) : (
                <>
                 {(activeTab === 'home' || activeTab === 'orders') && <PharmacyHomeTab onNavigate={go} onSwitchTab={setTab} onToggleOnline={() => { void toggleOnline(); }} />}
                 {activeTab === 'b2b' && <B2BSupplyRequestScreen onBack={() => setTab('orders')} />}
                 {activeTab === 'dispatch' && <DispatchWorkflowScreen onBack={() => setTab('orders')} onNavigate={go} />}
                 {activeTab === 'settings' && <PharmacyMoreScreen onNavigate={go} onToggleOnline={() => { void toggleOnline(); }} />}
                 <NBottomNav tabs={tabs} active={activeTab === 'home' ? 'orders' : activeTab} onPress={setTab} />
                </>
             )}
           </View>
         );
       }}
     </Stack.Screen>

     <Stack.Screen name="shortage">{({ navigation }: any) => <ShortageReportScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="b2b_supply">{({ navigation }: any) => <B2BSupplyRequestScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="scanner">{({ navigation }: any) => <SmartBarcodeScannerScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="wallet">{({ navigation }: any) => <ProviderWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="withdrawal_workflow">{({ navigation }: any) => <WithdrawalWorkflow onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="order_history">{({ navigation }: any) => <DispatchWorkflowScreen initialSection="done" onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="pharmacy_settings">{({ navigation }: any) => <SettingsScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="my_offers">{({ navigation }: any) => <PharmacyMyOffers onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="prescription_review">{({ navigation }: any) => <PharmacyPrescriptionReviewScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="returns_rma">{({ navigation }: any) => <ReturnsRMAScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
    <Stack.Screen name="pharmacy_chat">{({ navigation, route }: any) => <PharmacyChatScreen onBack={() => navigation.goBack()} orderId={route.params?.param?.order_id || route.params?.param?.orderId} lines={route.params?.param?.lines} />}</Stack.Screen>
     <Stack.Screen name="qr_menu">{({ navigation }: any) => <PharmacyQRMenuScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="reviews">{({ navigation }: any) => <ReviewsAndRatingsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="chronic">{({ navigation }: any) => <ChronicDiseaseProgramScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="promotions">{({ navigation }: any) => <PromotionsDashboard onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="create_promo">{({ navigation }: any) => <CreateCampaignScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="web_config">{({ navigation }: any) => <ProviderProfileEditor role="other" onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="subscriptions_ads">{({ navigation }: any) => <SubscriptionsAdsScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="affiliate">{({ navigation }: any) => <AffiliatePortal onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="reputation">{({ navigation }: any) => <ReputationHub onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="crm">{({ navigation }: any) => <CrmHub onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="revenue_insights">{({ navigation }: any) => <RevenueInsights onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="pharmacy_broadcast">{({ navigation, route }: any) => <PharmacyBroadcastResponse broadcast={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="expiry_monitor">{({ navigation }: any) => <InventoryExpiryMonitor onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="medical_jobs">{({ navigation }: any) => <MedicalJobsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="drug_index">{({ navigation }: any) => <MedicalDrugIndexScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="insurance_config">{({ navigation }: any) => <InsuranceConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="certificates_config">{({ navigation }: any) => <CertificatesConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="media_config">{({ navigation }: any) => <MediaConfigScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="insurance_requests">{({ navigation }: any) => <InsuranceRequestsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
    <Stack.Screen name="insurance_decisions">{({ navigation }: any) => <PharmacyInsuranceQueueScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
    <Stack.Screen name="insurance_decision_order">{({ navigation, route }: any) => <PharmacyInsuranceDecisionForAllocation allocationId={String(route.params?.param?.allocation_id || '')} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="product_catalog">{({ navigation }: any) => <ActiveInventoryScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="working_hours">{({ navigation }: any) => <WorkingHoursEditorScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="notifications">{({ navigation }: any) => <NotificationsCenterScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="support">{({ navigation }: any) => <TechnicalSupportTicketsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
   </Stack.Navigator>
 );
}

const s = StyleSheet.create({
  tabBar: { flexDirection: 'row', backgroundColor: C.white, borderTopWidth: 1, borderColor: '#EEE', paddingBottom: 20, paddingTop: 10, justifyContent: 'space-around' },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  tabIconContainer: { position: 'relative', marginBottom: 4 },
  badge: { position: 'absolute', top: -5, right: -10, borderRadius: 10, paddingHorizontal: 4, paddingVertical: 2, minWidth: 18, alignItems: 'center' },
  tabLabel: { fontSize: 10, fontWeight: 'bold' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
});

// ══════════════════════════════════════════════════════════════════════════════
// RESTORED COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function PharmacyHomeTab({ onNavigate, onSwitchTab, onToggleOnline }: any) {
  const { theme } = useTheme();
  const { lang, t, t: tt } = useLang();
  const AR = lang === 'ar';
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const { user, toggleOnline } = useAuth();
  const isOnline = !!user?.isOnline;
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const knownBroadcastIds = useRef<Set<string>>(new Set());
  const [sound, setSound] = useState<AudioPlayer | null>(null);

  // Play alarm sound
  function playAlarm() {
    try {
      // Use the packaged alert asset; pharmacy-specific sonic branding remains a separate product asset.
      const player = createAudioPlayer(require('../../../assets/audio/rad_dispatch_alert.mp3'));
      setSound(player);
      player.play();
    } catch (e) {
      console.warn("Could not play alarm sound", e);
    }
  }

  useEffect(() => {
    return sound ? () => { sound.remove(); } : undefined;
  }, [sound]);

    useEffect(() => {
    if (!isOnline) {
      knownBroadcastIds.current.clear();
      setBroadcasts([]);
      return;
    }

    let disposed = false;
    let socket: Socket | undefined;
    const normalizeBroadcasts = (data: any) => {
      const raw = Array.isArray(data) ? data : (data?.items || []);
      return raw.map((broadcast: any) => ({
        id: broadcast.id,
        order_id: broadcast.order_id,
        current_round: broadcast.current_round,
        current_radius_km: broadcast.current_radius_km,
        payment_summary: broadcast.payment_summary,
        insurance: broadcast.insurance || null,
        fulfillment_method: broadcast.fulfillment_method || 'delivery',
        approx_distance_km: broadcast.approx_distance_km ?? null,
        approx_area: broadcast.approx_area || null,
        attachments: Array.isArray(broadcast.attachments) ? broadcast.attachments : [],
        items: Array.isArray(broadcast.items) ? broadcast.items : [],
        my_offer_status: broadcast.my_offer_status || null,
      })).filter((broadcast: any) => !!broadcast.id && !!broadcast.order_id);
    };
    const fetchBroadcasts = async () => {
      try {
        const response = await client.get('/provider/pharmacy/broadcasts');
        if (disposed) return;
        const rows = normalizeBroadcasts(response.data);
        const incoming = rows.some((row: any) => !knownBroadcastIds.current.has(row.id));
        knownBroadcastIds.current = new Set(rows.map((row: any) => row.id));
        setBroadcasts(rows);
        if (incoming) await playAlarm();
      } catch {
        // Keep the last server-confirmed rows; never fabricate a broadcast locally.
      }
    };
    const connectRealtime = async () => {
      const token = await Vault.get(SK.ACCESS);
      if (disposed || !token) return;
      socket = io(process.env.EXPO_PUBLIC_BACKEND_URL || API_BASE.replace(/\/api\/v1$/, ''), {
        transports: ['websocket'],
        auth: { token, client: 'provider-app' },
      });
      socket.on('connect', fetchBroadcasts);
      socket.on('pharmacy:broadcast:available', fetchBroadcasts);
      socket.on('pharmacy:broadcast:cancelled', fetchBroadcasts);
      socket.on('pharmacy:broadcast:changed', fetchBroadcasts);
    };

    fetchBroadcasts();
    connectRealtime();
    const interval = setInterval(fetchBroadcasts, 5000);
    // Presence heartbeat (20s < 180s server TTL) so admin "online now" counts providers.
    const presence = setInterval(() => { try { socket?.connected && socket.emit('presence:heartbeat'); } catch {} }, 20000);
    return () => {
      disposed = true;
      clearInterval(interval);
      clearInterval(presence);
      socket?.disconnect();
    };
  }, [isOnline, user?.id]);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState<string|null>(null);

  const REJECT_REASONS = [
    { id: 'OUT_OF_STOCK_COMPLETELY', label: tt('phdash.497bbbc4') },
    { id: 'PRESCRIPTION_INVALID', label: tt('phdash.66c683af') },
    { id: 'INSURANCE_ISSUE', label: tt('phdash.0ec9ca5b') },
    { id: 'OUT_OF_DELIVERY_ZONE', label: tt('phdash.e9cbeba9') },
    { id: 'PHARMACY_CLOSING', label: tt('phdash.8d172332') }
  ];

  const openOfferComposer = (broadcast: any) => {
    // A pharmacy may submit only a server-derived quote; assignment remains blocked pending explicit patient selection.
    onNavigate('pharmacy_broadcast', broadcast);
  };

  const confirmReject = async (reasonId: string) => {
    try {
      await client.post(`/provider/pharmacy/broadcasts/${rejectOrderId}/reject`, { reason: reasonId });
      setBroadcasts(prev => prev.filter(b => b.order_id !== rejectOrderId));
      show(tt('phdash.d2642fc6'), 'info');
      setShowRejectModal(false);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (tt('phdash.09931ded')), 'error');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[s.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 16) }]}>
        <View>
          <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>
            {tt('phdash.e7d5d321')}
          </Text>
          <Text style={{ color: isOnline ? 'green' : 'gray', fontSize: 12, fontWeight: 'bold' }}>
            {isOnline? (tt('phdash.efd02f02')): (tt('phdash.50ba6805'))}
          </Text>
        </View>
        <Switch value={isOnline} onValueChange={() => { void toggleOnline(); }} trackColor={{ true: theme.primary }} />
      </View>
      
      <SetupChecklist compact onNavigate={onNavigate} onToggleOnline={onToggleOnline} onOpenMore={() => onSwitchTab('settings')} />

      {!isOnline ? (
        <NEmpty icon="moon" title={tt('phdash.a5a74648')} sub={tt('phdash.3c4b98b6')} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {broadcasts.length === 0 ? (
            <NEmpty icon="radar" title={tt('phdash.a2f9769e')} sub={tt('phdash.00e1e4b8')} />
          ) : (
            broadcasts.map((b, idx) => (
              <NCard key={b.id || idx} style={{ marginBottom: 16, padding: 16, borderColor: theme.primary, borderWidth: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View>
                    <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.text }}>{tt('tpz.cba31840', { p1: String(String(b.id).slice(-6)) })}</Text>
                    </View>
                    <Text style={{ color: theme.textSub, fontSize: 12 }}>{tt('tpz.2cf6ec45', { p1: String(b.current_round || '—'), p2: String(b.current_radius_km || '—') })}</Text>
                  </View>
                  <Text style={{ fontWeight: 'bold', fontSize: 13, color: theme.primary }}>
                    {b.payment_summary?.method === 'insurance' ? (tt('phdash.150549c6'))
                      : b.payment_summary?.method === 'cod' ? (tt('phdash.cf195174'))
                      : b.payment_summary?.method === 'cash' ? (tt('phdash.84c27552'))
                      : b.payment_summary?.method === 'card' ? (tt('phdash.6fc762d8'))
                      : (tt('phdash.8fb2243e'))}
                  </Text>
                </View>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <NBadge size="xs" variant="info" label={b.fulfillment_method === 'pickup' ? (tt('phdash.8ea908c6')) : (tt('phdash.50457f57'))} />
                  {b.approx_distance_km != null && (
                    <NBadge size="xs" variant="default" label={(tt('phdash.43a9ee61')) + b.approx_distance_km + (tt('phdash.e27714ae'))} />
                  )}
                  {!!b.approx_area && <NBadge size="xs" variant="default" label={b.approx_area} />}
                </View>
                {b.payment_summary?.method === 'insurance' && b.insurance && (
                  <View style={{ backgroundColor: theme.infoBg, borderRadius: 8, padding: 10, marginBottom: 12 }}>
                    <Text style={{ color: theme.info, fontWeight: 'bold', fontSize: 13, textAlign: AR ? 'right' : 'left' }}>
                      {(tt('phdash.53f3bc13')) + (b.insurance.company_name_ar || b.insurance.company_name_en || '—')}
                    </Text>
                    {!!b.insurance.category && (
                      <Text style={{ color: theme.info, fontSize: 12, textAlign: AR ? 'right' : 'left' }}>
                        {(tt('phdash.1751d09b')) + b.insurance.category}
                      </Text>
                    )}
                  </View>
                )}
                {b.attachments.length > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: theme.textSub, fontSize: 12, marginBottom: 6, textAlign: AR ? 'right' : 'left' }}>
                      {tt('phdash.c813d385')}
                    </Text>
                    <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
                      {b.attachments.map((a: any, ai: number) => (
                        <TouchableOpacity key={ai} onPress={() => Linking.openURL(a.uri)} style={{ backgroundColor: theme.surface2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                          <Text style={{ color: theme.primary, fontSize: 12 }}>
                            {a.type === 'pdf' ? (tt('tpz.5a2de8de', { p1: String(ai + 1) })) : (tt('tpz.a2001776', { p1: String(ai + 1) }))}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                <NDivider style={{ marginBottom: 12 }} />
                <View style={{ marginBottom: 16 }}>
                  {b.items?.map((it: any, i: number) => (
                    <Text key={i} style={{ color: theme.text }}>• {it.qty_requested || 0}x {it.name_ar || it.name_en || it.matched_sku}</Text>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <NBtn label={tt('phdash.8a223f36')} variant="outline" style={{ flex: 1 }} onPress={() => { setRejectOrderId(b.order_id); setShowRejectModal(true); }} />
                  <NBtn label={b.my_offer_status === 'submitted' ? t('audit2.pharmacy.offerSentEdit') : b.my_offer_status === 'draft' ? t('audit2.pharmacy.continueDraft') : t('audit2.pharmacy.createOffer')} variant="secondary" style={{ flex: 2 }} onPress={() => openOfferComposer(b)} />
                </View>
              </NCard>
            ))
          )}
        </ScrollView>
      )}

      {/* REJECTION REASONS MODAL */}
      <NSheet visible={showRejectModal} onClose={() => setShowRejectModal(false)} title={tt('phdash.9e63f799')}>
        <View style={{ padding: 16, paddingBottom: 40 }}>
          {REJECT_REASONS.map(r => (
            <TouchableOpacity key={r.id} onPress={() => confirmReject(r.id)} style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={{ color: theme.text, fontSize: 16, textAlign: AR ? 'right' : 'left' }}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </NSheet>
    </View>
  );
}


function B2BSupplyRequestScreen({ onBack }: any) {
  const uploadsOn = useUploadsEnabled();
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [mode, setMode] = useState<'b2b'|'returns'>('b2b');
  const [b2bText, setB2bText] = useState('');
  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);

  useEffect(() => {
    if (mode !== 'returns') return;
    setReturnsLoading(true);
    client.get('/pharmacy/returns/provider/list')
      .then((res: any) => setReturnsList(Array.isArray(res.data) ? res.data : []))
      .catch(() => { setReturnsList([]); show(tt('phdash.1616a178'), 'error'); })
      .finally(() => setReturnsLoading(false));
  }, [mode]);

  const [b2bTab, setB2bTab] = useState<'manual'|'voice'|'ocr'>('manual');
  const [isRecording, setIsRecording] = useState(false);

  // ── AI-analyzed cart (grouped أدوية / غير دوائية) before submitting ──────
  const [cart, setCart] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  const loadMyRequests = async () => {
    try {
      const res: any = await client.get('/pharmacy/procurement/my-requests');
      // the server answers { success, data: [...] }
      setMyRequests(Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch { /* list is informational */ }
  };
  useEffect(() => { loadMyRequests(); }, []);

  const runAnalysis = async (payload: any) => {
    setAnalyzing(true);
    try {
      const res = await client.post('/pharmacy/procurement/analyze-file', payload);
      const items = analysisItems(res);
      if (items.length === 0) {
        show(tt('phdash.9d10ef21'), 'info');
      }
      setCart(prev => [...prev, ...items.map((it: any) => ({ ...it }))]);
    } catch {
      show(tt('phdash.d51aed52'), 'error');
    } finally { setAnalyzing(false); }
  };

  const submitB2B = async (method: string) => {
    if (method === 'voice') {
      show(tt('phdash.2f34c02f'), 'info');
      return;
    }
    if (method === 'manual') {
      if (!b2bText.trim()) { show(tt('phdash.96250f60'), 'error'); return; }
      await runAnalysis({ text: b2bText.trim() });
      setB2bText('');
      return;
    }
    // OCR: pick or capture a photo → base64 → AI vision analysis
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { show(tt('phdash.17a09021'), 'error'); return; }
      const picked = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, allowsEditing: false });
      if (picked.canceled || !picked.assets?.[0]?.base64) return;
      const asset = picked.assets[0];
      await runAnalysis({ file_base64: asset.base64, mime_type: asset.mimeType || 'image/jpeg' });
    } catch {
      show(tt('phdash.9e779a61'), 'error');
    }
  };

  const submitCart = async () => {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await client.post('/pharmacy/procurement/submit-request', {
        items: cart.map(it => ({
          medicine_id: it.medicine_id || null,
          raw_name_string: it.raw_name_string,
          requested_quantity: it.requested_quantity || 1,
          category_group: it.category_group || 'medical',
        })),
      });
      show(tt('phdash.bdc0066c'), 'success');
      setCart([]);
      loadMyRequests();
    } catch {
      show(tt('phdash.51398431'), 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('phdash.a331ac93')} onBack={onBack} />
      
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', padding: 16, gap: 10 }}>
        <NBtn label={tt('phdash.c1f5dce9')} variant={mode === 'b2b' ? 'primary' : 'outline'} onPress={() => setMode('b2b')} style={{ flex: 1 }} />
        <NBtn label={tt('phdash.bcfbde8e')} variant={mode === 'returns' ? 'primary' : 'outline'} onPress={() => setMode('returns')} style={{ flex: 1 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {mode === 'b2b' ? (
          <NCard>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
              {tt('phdash.88634537')}
            </Text>
            <Text style={{ color: theme.textSub, marginBottom: 16, textAlign: AR ? 'right' : 'left' }}>
              {tt('phdash.6836ab5d')}
            </Text>
            
            {/* Tabs for B2B Methods */}
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 8, marginBottom: 16, backgroundColor: theme.surface2, padding: 4, borderRadius: 8 }}>
              <TouchableOpacity style={{ flex: 1, padding: 8, borderRadius: 6, backgroundColor: b2bTab === 'manual' ? theme.surface : 'transparent' }} onPress={() => setB2bTab('manual')}>
                <Text style={{ textAlign: 'center', color: b2bTab === 'manual' ? theme.primary : theme.textSub, fontWeight: 'bold' }}>{tt('phdash.8ca5c52a')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 8, borderRadius: 6, backgroundColor: b2bTab === 'voice' ? theme.surface : 'transparent' }} onPress={() => setB2bTab('voice')}>
                <Text style={{ textAlign: 'center', color: b2bTab === 'voice' ? theme.primary : theme.textSub, fontWeight: 'bold' }}>{tt('phdash.38daef7c')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 8, borderRadius: 6, backgroundColor: b2bTab === 'ocr' ? theme.surface : 'transparent' }} onPress={() => setB2bTab('ocr')}>
                <Text style={{ textAlign: 'center', color: b2bTab === 'ocr' ? theme.primary : theme.textSub, fontWeight: 'bold' }}>{tt('phdash.9d873c25')}</Text>
              </TouchableOpacity>
            </View>

            {b2bTab === 'manual' && (
              <View>
                <TextInput placeholder={tt('phdash.d024a13c')} value={b2bText} onChangeText={setB2bText} multiline style={{ height: 120, textAlignVertical: 'top', backgroundColor: theme.surface, padding: 12, borderRadius: 8, color: theme.text }} />
                <NBtn label={tt('phdash.30940e27')} onPress={() => submitB2B('manual')} style={{ marginTop: 12 }} />
              </View>
            )}

            {b2bTab === 'voice' && (
              // No recorder exists in the app yet: the screen used to show a recording button, a fixed "00:14" timer and a "Send audio"
              // that sent nothing. Say so, and point to the two ways that work.
              <NCard style={{ padding: 16 }}>
                <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                  {tt('phdash.495e6faf')}
                </Text>
              </NCard>
            )}

            {b2bTab === 'ocr' && (
              <View>
                <View style={{ height: 200, backgroundColor: theme.surface2, borderRadius: 8, borderWidth: 2, borderColor: theme.primary, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                  <View style={{ marginBottom: 8 }}><I name="camera" size={40} color={theme.textSub} /></View>
                  <Text style={{ color: theme.textSub, textAlign: 'center', paddingHorizontal: 16 }}>
                    {tt('phdash.e66e3af8')}
                  </Text>
                </View>
                {uploadsOn ? (
<NBtn label={tt('phdash.64383d7b')} onPress={() => submitB2B('ocr')} />
) : <UploadsUnavailable />}
              </View>
            )}

            {analyzing && (
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
                <ActivityIndicator color={theme.primary} />
                <Text style={{ color: theme.textSub, marginHorizontal: 8 }}>{tt('phdash.a261aa29')}</Text>
              </View>
            )}

            {/* ── السلة المصنفة (أدوية / غير دوائية) قبل إرسال طلب عرض السعر ── */}
            {cart.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: 8 }}>
                  {tt('tpz.e3334d06', { p1: String(cart.length) })}
                </Text>
                {['medical', 'non_medical'].map((g) => {
                  const items = cart.map((it, idx) => ({ it, idx })).filter(x => (x.it.category_group || 'medical') === g);
                  if (items.length === 0) return null;
                  return (
                    <View key={g} style={{ marginBottom: 10 }}>
                      <Text style={{ color: theme.primary, fontWeight: 'bold', textAlign: AR ? 'right' : 'left', marginBottom: 4 }}>
                        {g === 'medical' ? (tt('phdash.243d2ddc')) : (tt('phdash.6fc1411c'))}
                      </Text>
                      {items.map(({ it, idx }) => (
                        <View key={idx} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: theme.surface2, borderRadius: 8, padding: 8, marginBottom: 6 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.text, fontWeight: '600', textAlign: AR ? 'right' : 'left' }}>{it.medicine_name || it.raw_name_string}</Text>
                            {!it.matched && <Text style={{ color: theme.danger, fontSize: 11, textAlign: AR ? 'right' : 'left' }}>{tt('phdash.d9eb7fc7')}</Text>}
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <TouchableOpacity onPress={() => setCart(c => c.map((x, i) => i === idx ? { ...x, requested_quantity: Math.max(1, (x.requested_quantity || 1) - 1) } : x))} style={{ padding: 6 }}><Text style={{ color: theme.primary, fontSize: 18 }}>−</Text></TouchableOpacity>
                          <Text style={{ color: theme.text, fontWeight: 'bold', minWidth: 24, textAlign: 'center' }}>{it.requested_quantity || 1}</Text>
                          <TouchableOpacity onPress={() => setCart(c => c.map((x, i) => i === idx ? { ...x, requested_quantity: (x.requested_quantity || 1) + 1 } : x))} style={{ padding: 6 }}><Text style={{ color: theme.primary, fontSize: 18 }}>+</Text></TouchableOpacity>
                          <TouchableOpacity onPress={() => setCart(c => c.filter((_, i) => i !== idx))} style={{ padding: 6 }}><Text style={{ color: theme.danger, fontSize: 16 }}>🗑</Text></TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  );
                })}
                <NBtn label={submitting ? (tt('phdash.00ca780c')) : (tt('phdash.ff7e4919'))} onPress={submitCart} style={{ marginTop: 4, opacity: submitting ? 0.6 : 1 }} />
              </View>
            )}

            {/* ── طلباتي السابقة وحالاتها ── */}
            {myRequests.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: 6 }}>{tt('phdash.eef132c8')}</Text>
                {myRequests.slice(0, 5).map((r: any) => (
                  <View key={r._id} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', backgroundColor: theme.surface2, borderRadius: 8, padding: 10, marginBottom: 6 }}>
                    <Text style={{ color: theme.textSub, fontSize: 12 }}>{(r.items || []).length} {tt('qqby.4d37a72f')}</Text>
                    <Text style={{ color: r.status === 'QUOTATION_ISSUED' ? theme.primary : theme.text, fontSize: 12, fontWeight: 'bold' }}>
                      {r.status === 'PENDING_ADMIN_REVIEW' ? (tt('phdash.ac4a96c5'))
                        : r.status === 'QUOTATION_ISSUED' ? (tt('phdash.560fa9c3'))
                        : r.status === 'COMPLETED' ? (tt('phdash.a78b4dfb'))
                        : r.status === 'CANCELLED' ? (tt('phdash.9a82e155')) : r.status}
                    </Text>
                  </View>
                ))}
              </View>
            )}

          </NCard>
        ) : (
          <NCard>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
              {tt('phdash.d6defc9d')}
            </Text>
            {returnsLoading ? (
              <ActivityIndicator color={theme.primary} style={{ marginVertical: 24 }} />
            ) : returnsList.length === 0 ? (
              <Text style={{ color: theme.textSub, textAlign: 'center', marginVertical: 24 }}>
                {tt('phdash.fcf3dd55')}
              </Text>
            ) : returnsList.map((r: any) => (
              <View key={r.id || r._id} style={{ backgroundColor: theme.surface2, padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: 'bold', color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                    {tt('tpz.f556f27a', { p1: String(r.order_id || '') })}
                  </Text>
                  <NBadge label={r.status === 'approved' || r.status === 'completed' ? (tt('phdash.aecf1337')) : r.status === 'rejected' ? (tt('phdash.8290f876')) : (tt('phdash.6a7f7505'))} variant={r.status === 'approved' || r.status === 'completed' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'} size="xs" />
                </View>
                <Text style={{ color: theme.textSub, fontSize: 12, marginTop: 6, textAlign: AR ? 'right' : 'left' }}>
                  {(tt('phdash.61065b69')) + (r.reason || '—') + ' · ' + (tt('phdash.701975cb')) + (r.amount ?? 0) + (tt('phdash.8cecd4af'))}
                </Text>
                <Text style={{ color: theme.textSub, fontSize: 11, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                  {tt('phdash.d3330933')}
                </Text>
              </View>
            ))}
          </NCard>
        )}
      </ScrollView>
    </View>
  );
}
function ReturnsRMAScreen({ onBack }: any) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState('');

  const statusMeta = (s: string) => {
    const k = (s || '').toLowerCase();
    if (k === 'approved' || k === 'completed') return { label: tt('phdash.aecf1337'), variant: 'success' as any };
    if (k === 'rejected') return { label: tt('phdash.8290f876'), variant: 'danger' as any };
    return { label: tt('phdash.6a7f7505'), variant: 'warning' as any };
  };

  const loadReturns = () => {
    client.get('/pharmacy/returns/provider/list')
      .then((res: any) => setReturns(res.data || []))
      .catch(() => { setReturns([]); show(tt('phdash.52cb2332'), 'error'); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadReturns(); }, []);

  if (openId) return <PharmacyReturnDetail id={openId} onBack={() => setOpenId('')} onAnswered={loadReturns} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('phdash.acfbe454')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {loading && <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />}
        {!loading && returns.length === 0 && (
          <NEmpty title={tt('phdash.12a5434c')} subtitle={tt('phdash.5b15d880')} />
        )}
        {!loading && returns.map((r: any) => {
          const meta = statusMeta(r.status);
          return (
            <NCard key={r.id || r._id} onPress={() => setOpenId(String(r.id || ''))} style={{ marginBottom: 12, padding: 16 }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: theme.text }}>
                  {tt('tpz.f556f27a', { p1: String(r.order_id || '') })}
                </Text>
                <NBadge label={meta.label} variant={meta.variant} size="xs" />
              </View>
              <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: 4 }}>
                {(tt('phdash.61065b69')) + (r.reason || '—')}
              </Text>
              {!!r.details && (
                <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: 4 }} numberOfLines={2}>
                  {r.details}
                </Text>
              )}
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ color: theme.text, fontWeight: '600' }}>{(r.amount ?? 0) + (tt('phdash.8cecd4af'))}</Text>
                <Text style={{ color: theme.textSub, fontSize: 12 }}>{(r.createdAt || '').slice(0, 10)}</Text>
              </View>
              <Text style={{ color: theme.textSub, fontSize: 11, marginTop: 6, textAlign: AR ? 'right' : 'left' }}>
                {tt('phdash.e69d74c8')}
              </Text>
            </NCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DISPATCH & DELIVERY SCREEN (Screen 3 - Workflows)
// ══════════════════════════════════════════════════════════════════════════════
// Order sections over GET /provider/pharmacy/allocations (M6): one screen replaces dispatch, history and delivery tracking.
type OrderSection = 'new' | 'preparing' | 'ontheway' | 'done';
const ORDER_SECTION_STATUSES: Record<OrderSection, string[]> = {
  new: ['pending_review', 'partially_confirmed', 'confirmed'],
  preparing: ['preparing', 'ready_for_pickup'],
  ontheway: ['out_for_delivery'],
  done: ['delivered', 'cancelled', 'rejected', 'expired'],
};
function DispatchWorkflowScreen({ onBack, onNavigate, initialSection = 'new' }: { onBack: () => void; onNavigate?: (s: string, p?: any) => void; initialSection?: OrderSection }) {
  const { theme } = useTheme();
  const { lang, t, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [section, setSection] = useState<OrderSection>(initialSection);
  const [actionId, setActionId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, any>>({});

  // Courier form (out-for-delivery)
  const [courierFor, setCourierFor] = useState<string | null>(null);
  const [courierName, setCourierName] = useState('');
  const [courierPhone, setCourierPhone] = useState('');

  // COD collection form (delivered)
  const [collectFor, setCollectFor] = useState<any | null>(null);
  const [collectMethod, setCollectMethod] = useState<'cash' | 'card_terminal'>('cash');
  const [collectAmount, setCollectAmount] = useState('');

  const load = async (quiet = false) => {
    try {
      const res = await client.get('/provider/pharmacy/allocations');
      setAllocations(Array.isArray(res.data) ? res.data : []);
    } catch {
      if (!quiet) show(tt('phdash.b53f3523'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  // A newly selected offer shows up without leaving the tab: poll quietly while the screen is open.
  useEffect(() => {
    load();
    const t = setInterval(() => { void load(true); }, 20000);
    return () => clearInterval(t);
  }, []);

  const loadDetail = async (id: string) => {
    try {
      const res = await client.get(`/provider/pharmacy/allocations/${id}`);
      setDetails((prev) => ({ ...prev, [id]: res.data }));
    } catch { /* detail is best-effort; the card stays usable */ }
  };

  // An order at "ready" needs its delivery method and payment to offer the right next step (pickup is handed over, delivery is dispatched,
  // cash on delivery is collected): load the detail of such orders as soon as they appear.
  useEffect(() => {
    allocations.filter((x: any) => String(x.status) === 'ready_for_pickup' && !details[x.id]).forEach((x: any) => { void loadDetail(x.id); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocations]);

  const doAction = async (id: string, action: string, body?: any) => {
    if (actionId) return;
    setActionId(id);
    try {
      await client.post(`/provider/pharmacy/allocations/${id}/${action}`, body || {});
      show(tt('phdash.a45cde89'), 'success');
      setCourierFor(null); setCollectFor(null);
      await load();
    } catch (e: any) {
      const code = e?.response?.data?.message;
      const known: Record<string, string> = {
        cod_collection_proof_required: tt('phdash.fa7f6759'),
        collected_amount_must_match_selected_quote_total: tt('phdash.da8d68c1'),
        pickup_orders_are_handed_over_not_shipped: tt('phdash.f02c49da'),
        payment_confirmation_required: tt('phdash.f550cbb4'),
        insurance_decision_required: tt('phdash.afd25c11'),
        cod_policy_confirmation_required: tt('phdash.f08aabfc'),
      };
      show(known[code] || code || (tt('phdash.b1ec89a1')), 'error');
    } finally {
      setActionId(null);
    }
  };

  const statusMeta = (st: string) => {
    const k = String(st || '').toLowerCase();
    const map: Record<string, { ar: string; en: string; variant: any }> = {
      pending_review: { ar: 'بانتظار المراجعة', en: 'Pending review', variant: 'warning' },
      partially_confirmed: { ar: 'مؤكد جزئياً', en: 'Partially confirmed', variant: 'warning' },
      confirmed: { ar: 'مؤكد', en: 'Confirmed', variant: 'info' },
      preparing: { ar: 'قيد التجهيز', en: 'Preparing', variant: 'info' },
      ready_for_pickup: { ar: 'جاهز للتسليم', en: 'Ready', variant: 'primary' },
      out_for_delivery: { ar: 'في الطريق', en: 'Out for delivery', variant: 'primary' },
      delivered: { ar: 'تم التسليم', en: 'Delivered', variant: 'success' },
      cancelled: { ar: 'ملغي', en: 'Cancelled', variant: 'danger' },
      rejected: { ar: 'مرفوض', en: 'Rejected', variant: 'danger' },
      expired: { ar: 'منتهي الصلاحية', en: 'Expired', variant: 'default' },
    };
    const m = map[k] || { ar: st, en: st, variant: 'default' };
    return { label: AR ? m.ar : m.en, variant: m.variant };
  };

  const inSection = (sec: OrderSection) => allocations.filter((a) => ORDER_SECTION_STATUSES[sec].includes(String(a.status)));
  const shown = inSection(section);
  const sectionTabs: { key: OrderSection; ar: string; en: string }[] = [
    { key: 'new', ar: 'جديدة', en: 'New' },
    { key: 'preparing', ar: 'قيد التجهيز', en: 'Preparing' },
    { key: 'ontheway', ar: 'في الطريق', en: 'On the way' },
    { key: 'done', ar: 'منتهية', en: 'Done' },
  ];

  const renderCard = (a: any) => {
    const meta = statusMeta(a.status);
    const d = details[a.id];
    const isCod = String(d?.order?.payment_method || '').toLowerCase() === 'cod' || d?.order?.status === 'cod_due_on_delivery';
    const expectedTotal = d?.order?.pricing_snapshot?.totals?.total ?? a.totals?.total;
    const isPickup = d?.order?.delivery?.method === 'pickup';
    return (
      <NCard key={a.id} style={{ marginBottom: 12, padding: 16 }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 15, color: theme.text }}>
            {tt('tpz.c83fa9fb', { p1: String(String(a.order_id || '').slice(-6)) })}
          </Text>
          <NBadge label={meta.label} variant={meta.variant} size="xs" />
        </View>
        <Text style={{ color: theme.textSub, fontSize: 12, textAlign: AR ? 'right' : 'left' }}>
          {(tt('phdash.b3010efc')) + (Array.isArray(a.items) ? a.items.length : 0) + ' · ' + (tt('phdash.44f01864')) + (a.totals?.total ?? 0) + (tt('phdash.8cecd4af'))}
        </Text>
        {d?.patient_contact && (
          <View style={{ backgroundColor: theme.surface2, borderRadius: 8, padding: 10, marginTop: 8 }}>
            <Text style={{ color: theme.text, fontSize: 13, textAlign: AR ? 'right' : 'left' }}>
              {(tt('phdash.83917b90')) + (d.patient_contact.name || '—')}
            </Text>
            {!!d.patient_contact.phone && (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${d.patient_contact.phone}`)}>
                <Text style={{ color: theme.primary, fontSize: 13, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                  {(tt('phdash.8f5fd9b2')) + d.patient_contact.phone}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {courierFor === a.id && (
          <View style={{ marginTop: 10, gap: 8 }}>
            <NInput placeholder={tt('phdash.ab85dd26')} value={courierName} onChange={setCourierName} />
            <NInput placeholder={tt('phdash.2fdc9bb8')} value={courierPhone} onChange={setCourierPhone} kbType="phone-pad" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <NBtn label={tt('phdash.210b779f')} variant="outline" style={{ flex: 1 }} onPress={() => setCourierFor(null)} />
              <NBtn label={tt('phdash.2eb7f735')} style={{ flex: 2 }} loading={actionId === a.id}
                onPress={() => doAction(a.id, 'out-for-delivery', { courier_name: courierName || undefined, courier_phone: courierPhone || undefined })} />
            </View>
          </View>
        )}
        {collectFor === a.id && (
          <View style={{ marginTop: 10, gap: 8 }}>
            <Text style={{ color: theme.text, fontWeight: '600', textAlign: AR ? 'right' : 'left' }}>
              {(tt('phdash.d04cd6df')) + (expectedTotal ?? 0) + (tt('phdash.8cecd4af'))}
            </Text>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 8 }}>
              {(['cash', 'card_terminal'] as const).map((m) => (
                <TouchableOpacity key={m} onPress={() => setCollectMethod(m)}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', backgroundColor: collectMethod === m ? theme.primary : theme.surface2, borderColor: collectMethod === m ? theme.primary : theme.border }}>
                  <Text style={{ color: collectMethod === m ? '#FFF' : theme.text, fontWeight: '600' }}>
                    {m === 'cash' ? (tt('phdash.af153030')) : (tt('phdash.e8db4c6d'))}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <NInput placeholder={tt('phdash.495c192a')} value={collectAmount} onChange={setCollectAmount} kbType="numeric" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <NBtn label={tt('phdash.210b779f')} variant="outline" style={{ flex: 1 }} onPress={() => setCollectFor(null)} />
              <NBtn label={tt('phdash.d426198f')} style={{ flex: 2 }} loading={actionId === a.id}
                onPress={() => doAction(a.id, 'delivered', { collection: { method: collectMethod, amount_collected: Number(collectAmount) } })} />
            </View>
          </View>
        )}
        {courierFor !== a.id && collectFor !== a.id && (
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {a.awaits_insurance_decision === true && onNavigate && (
              <NBtn label={t('insuranceDecisionRecord')} size="sm" icon="shield" onPress={() => onNavigate('insurance_decision_order', { allocation_id: a.id })} />
            )}
            {['pending_review', 'partially_confirmed'].includes(String(a.status)) && (
              <NBtn label={tt('phdash.449fee30')} size="sm" loading={actionId === a.id} onPress={() => doAction(a.id, 'confirm')} />
            )}
            <NBtn label={tt('phdash.1fcdbb86')} size="sm" variant="outline" onPress={() => onNavigate?.('pharmacy_chat', { order_id: a.order_id, lines: (Array.isArray(a.items) ? a.items : []).map((it: any) => ({ order_item_id: it.order_item_id, name: it.name })) })} />
            {String(a.status) === 'confirmed' && (
              <NBtn label={tt('phdash.0c1e39d3')} size="sm" loading={actionId === a.id} onPress={() => doAction(a.id, 'preparing')} />
            )}
            {String(a.status) === 'preparing' && (
              <NBtn label={tt('phdash.31453506')} size="sm" loading={actionId === a.id} onPress={() => doAction(a.id, 'ready')} />
            )}
            {String(a.status) === 'ready_for_pickup' && (
              <>
                {/* the server refuses to ship a pickup order and to hand over a cash-on-delivery one without the collection: the detail decides */}
                {d && isPickup ? null : <NBtn label={t('audit2.pharmacy.dispatch')} size="sm" onPress={() => { setCourierFor(a.id); if (!details[a.id]) loadDetail(a.id); }} />}
                {d && !isPickup ? null : (
                  <NBtn label={t('audit2.pharmacy.handOverPickup')} size="sm" variant="outline" loading={actionId === a.id} disabled={!d}
                    onPress={() => { if (isCod) { setCollectFor(a.id); setCollectAmount(String(expectedTotal ?? '')); } else doAction(a.id, 'delivered'); }} />
                )}
              </>
            )}
            {String(a.status) === 'out_for_delivery' && (
              <NBtn label={tt('phdash.2571479b')} size="sm" loading={actionId === a.id}
                onPress={() => { if (isCod || !details[a.id]) { setCollectFor(a.id); if (!details[a.id]) loadDetail(a.id); setCollectAmount(String(expectedTotal ?? '')); } else doAction(a.id, 'delivered'); }} />
            )}
            {!d && ['ready_for_pickup', 'out_for_delivery'].includes(String(a.status)) && (
              <NBtn label={tt('phdash.c4ac0a1d')} size="sm" variant="outline" onPress={() => loadDetail(a.id)} />
            )}
          </View>
        )}
      </NCard>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('phdash.68fdab11')} onBack={onBack} right={onNavigate ? <TouchableOpacity onPress={() => onNavigate('insurance_decisions')} style={{ padding: SP.sm }}><I name="shield" size={22} color={theme.primary} /></TouchableOpacity> : undefined} />
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8, flexWrap: 'wrap' }}>
        {sectionTabs.map((t) => {
          const count = inSection(t.key).length;
          const on = section === t.key;
          return (
            <TouchableOpacity key={t.key} onPress={() => setSection(t.key)}
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, backgroundColor: on ? theme.primary : theme.surface2, borderColor: on ? theme.primary : theme.border }}>
              <Text style={{ color: on ? theme.textInv : theme.text, fontWeight: '600', fontSize: 13 }}>{(AR ? t.ar : t.en) + (count ? ` (${count})` : '')}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={theme.primary} />}>
        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : shown.length === 0 ? (
          <NEmpty icon="moon" title={tt('phdash.9f6e9f04')} sub={section === 'new' ? (tt('phdash.1e1cff63')) : (tt('phdash.f3373e35'))} />
        ) : (
          (section === 'done' ? shown.slice(0, 50) : shown).map(renderCard)
        )}
      </ScrollView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SMART BARCODE SCANNER
// ══════════════════════════════════════════════════════════════════════════════
function SmartBarcodeScannerScreen({ onBack }: any) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [product, setProduct] = useState<any | null>(null);

  const onBarcodeScanned = async ({ data }: { data?: string }) => {
    if (!data || scanned) return;
    setScanned(true);
    setLoading(true);
    setBarcode(String(data));
    try {
      const response = await client.get('/provider/inventory/search', { params: { barcode: String(data) } });
      const rows = Array.isArray(response.data) ? response.data : (response.data?.items || response.data?.data || []);
      const matched = rows[0] || null;
      setProduct(matched);
      show(matched ? (tt('phdash.4c2140cc')) : (tt('phdash.ddd11469')), matched ? 'success' : 'warning');
    } catch (error: any) {
      setProduct(null);
      show(error?.response?.data?.message || (tt('phdash.1afc268f')), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color={theme.primary} /></View>;
  }
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <NHeader title={tt('phdash.81e207b7')} onBack={onBack} />
        <View style={{ flex: 1, justifyContent: 'center', padding: SP.xl, gap: SP.lg }}>
          <NEmpty title={tt('phdash.818d9b89')} sub={tt('phdash.1669b293')} icon="camera" />
          <NBtn label={tt('phdash.29a31c35')} onPress={requestPermission} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <NHeader title={tt('phdash.ae852e74')} onBack={onBack} />
      {!product && <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'qr', 'datamatrix', 'pdf417'] }} onBarcodeScanned={scanned ? undefined : onBarcodeScanned} />}
      <View style={{ padding: SP.xl, paddingBottom: SP.xxl, backgroundColor: '#111', gap: SP.md }}>
        {loading && <ActivityIndicator color={theme.primary} />}
        {barcode && <Text style={{ color: C.white, textAlign: 'center' }}>{tt('tpz.0de93dcf', { p1: String(barcode) })}</Text>}
        {product && (
          <NCard>
            <Text style={{ color: theme.text, fontWeight: FW.bold }}>{AR ? (product.name_ar || product.name_en || product.name || barcode) : (product.name_en || product.name_ar || product.name || barcode)}</Text>
            <Text style={{ color: theme.textSub, marginTop: SP.xs }}>{tt('tpz.406d4f5d', { p1: String(product.stock ?? product.quantity ?? 0) })}</Text>
          </NCard>
        )}
        <NBtn label={tt('phdash.71aaf3a6')} variant="outline" onPress={() => { setScanned(false); setBarcode(null); setProduct(null); }} />
      </View>
    </View>
  );
}



type LowStockAlert = { id: string; inventory_item_id: string; sku: string; name: string; current_stock: number; threshold: number; status: 'open' | 'acknowledged' | 'restocked' };

function ActiveInventoryScreen({ onBack, onNavigate }: { onBack: () => void; onNavigate?: (s: string, p?: any) => void }) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [search, setSearch] = useState('');
  const [inventory, setInventory] = useState<any[]>([]);
  const [inventoryFailed, setInventoryFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await client.get('/provider/capabilities/pharmacy');
      setInventory(Array.isArray(res.data) ? res.data : []);
      setInventoryFailed(false);
    } catch {
      setInventory([]);
      setInventoryFailed(true);   // a failed load is an error with a retry, not "No inventory items"
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  // Low-stock alerts (GET /provider/inventory/low-stock-alerts, ack, restock).
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [restockQty, setRestockQty] = useState<Record<string, string>>({});
  const [alertBusy, setAlertBusy] = useState<string | null>(null);
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await client.get('/provider/inventory/low-stock-alerts');
      setAlerts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAlerts([]);
    }
  }, []);
  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);
  const ackAlert = async (id: string) => {
    setAlertBusy(id);
    try {
      await client.post(`/provider/inventory/low-stock-alerts/${id}/ack`);
      await fetchAlerts();
    } catch {
      show(tt('phdash.16cdfc2e'), 'error');
    } finally { setAlertBusy(null); }
  };
  const restockAlert = async (a: LowStockAlert) => {
    const qty = Math.floor(Number(restockQty[a.id]));
    if (!Number.isFinite(qty) || qty <= 0) { show(tt('phdash.79d6a501'), 'error'); return; }
    setAlertBusy(a.id);
    try {
      await client.post(`/provider/inventory/${a.inventory_item_id}/restock`, { qty });
      setRestockQty(prev => ({ ...prev, [a.id]: '' }));
      show(tt('phdash.cdbc489c'), 'success');
      await Promise.all([fetchAlerts(), fetchInventory()]);
    } catch {
      show(tt('phdash.da887bc1'), 'error');
    } finally { setAlertBusy(null); }
  };

  // Only the fields a pharmacy may set: the server rejects unknown fields (and owns id/timestamps).
  const EDITABLE = ['sku', 'name_ar', 'name_en', 'barcode', 'category', 'generic_name', 'form', 'dosage', 'pack_size', 'price', 'currency',
    'stock', 'min_stock_alert', 'available', 'insurance_covered', 'coverage_notes', 'expiry_date', 'notes', 'substitute_skus'];
  const editable = (x: any) => Object.fromEntries(Object.entries(x || {}).filter(([k, v]) => EDITABLE.includes(k) && v !== undefined && v !== null));

  const persistItem = async (item: any, patch: any) => {
    try {
      const res = await client.post('/provider/capabilities/pharmacy', editable({ ...item, ...patch }));
      if ((res?.data as any)?.pending_review) {
        show(tt('phdash.14f4e375'), 'success');
        fetchInventory();
      }
    } catch {
      show(tt('phdash.979a39ba'), 'error');
      fetchInventory();
    }
  };

  const updateStock = (id: string, delta: number) => {
    const item = inventory.find(x => x.id === id);
    if (!item) return;
    const stock = Math.max(0, (item.stock || 0) + delta);
    setInventory(prev => prev.map(x => x.id === id ? { ...x, stock } : x));
    persistItem(item, { stock });
  };
  const toggleOnline = (id: string) => {
    const item = inventory.find(x => x.id === id);
    if (!item) return;
    const available = !(item.available !== false);
    persistItem(item, { available });
  };

  const toggleCoverage = (id: string) => {
    const item = inventory.find(x => x.id === id);
    if (!item) return;
    persistItem(item, { insurance_covered: !(item.insurance_covered === true) });
  };

  const itemName = (x: any) => (AR ? (x.name_ar || x.name_en || x.sku) : (x.name_en || x.name_ar || x.sku)) || '';
  const filtered = inventory.filter(x => itemName(x).toLowerCase().includes(search.toLowerCase()));

  // Add a catalog medicine to this pharmacy's price list. Offers are priced only from inventory
  // items, so without this a newly registered pharmacy could never answer a patient request.
  // sku = catalog medicine id: the same key the patient's cart sends as the order line sku.
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogResults, setCatalogResults] = useState<any[]>([]);
  const [picked, setPicked] = useState<any>(null);
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [catalogBusy, setCatalogBusy] = useState(false);
  const searchCatalog = async () => {
    if (catalogQuery.trim().length < 2) return;
    setCatalogBusy(true);
    try {
      const res = await client.get('/medicines', { params: { q: catalogQuery.trim(), limit: 10 } });
      const rows = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || []);
      setCatalogResults(rows.filter((m: any) => m?.id));
    } catch {
      setCatalogResults([]);
      show(tt('phdash.8f0d9a6f'), 'error');
    } finally { setCatalogBusy(false); }
  };
  const addFromCatalog = async () => {
    const price = Number(newPrice);
    const stock = Math.max(0, Math.floor(Number(newStock) || 0));
    if (!picked || !Number.isFinite(price) || price <= 0) { show(tt('phdash.b0595d27'), 'error'); return; }
    setCatalogBusy(true);
    try {
      await client.post('/provider/capabilities/pharmacy', {
        sku: String(picked.id), name_ar: picked.name_ar || picked.name || picked.name_en, name_en: picked.name_en || undefined,
        price, stock, available: true,
      });
      show(tt('phdash.c3298bf3'), 'success');
      setPicked(null); setNewPrice(''); setNewStock(''); setCatalogResults([]); setCatalogQuery('');
      fetchInventory();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (tt('phdash.4f677444')), 'error');
    } finally { setCatalogBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('phdash.b7f4b32e')} onBack={onBack}
        right={onNavigate ? <TouchableOpacity onPress={() => onNavigate('scanner')} style={{ padding: SP.sm }}><I name="scan" size={22} color={theme.primary} /></TouchableOpacity> : undefined} />
      <View style={{ padding: 16 }}>
        {alerts.length > 0 && (
          <NCard style={{ marginBottom: 12, borderColor: theme.warn, borderWidth: 1 }}>
            <Text style={{ fontWeight: 'bold', color: theme.warn, textAlign: AR ? 'right' : 'left', marginBottom: 8 }}>
              {tt('tpz.08cde620', { p1: String(alerts.length) })}
            </Text>
            {alerts.map((a) => (
              <View key={a.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.surface2 }}>
                <Text style={{ color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                  {a.name} · {tt('tpz.4b45b4a6', { p1: String(a.current_stock), p2: String(a.threshold) })}
                </Text>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 8, alignItems: 'center', marginTop: 6 }}>
                  <View style={{ width: 90 }}>
                    <NInput placeholder={tt('phdash.e223227d')} value={restockQty[a.id] || ''} onChange={(v: string) => setRestockQty(prev => ({ ...prev, [a.id]: v }))} kbType="numeric" />
                  </View>
                  <NBtn label={tt('phdash.ed593383')} size="sm" loading={alertBusy === a.id} onPress={() => restockAlert(a)} />
                  {a.status === 'open' && <NBtn label={tt('phdash.f88a7bb1')} size="sm" variant="outline" disabled={alertBusy === a.id} onPress={() => ackAlert(a.id)} />}
                </View>
              </View>
            ))}
          </NCard>
        )}
        <NInput placeholder={tt('phdash.99dd966a')} value={search} onChange={(v: string) => setSearch(v)} />
        <NCard style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: 'bold', color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: 8 }}>
            {tt('phdash.98cc800d')}
          </Text>
          {!picked ? (
            <>
              <NInput placeholder={tt('phdash.de1a367b')} value={catalogQuery} onChange={(v: string) => setCatalogQuery(v)} />
              <NBtn label={tt('phdash.f61f44ef')} size="sm" loading={catalogBusy} onPress={searchCatalog} />
              {catalogResults.map((m: any) => (
                <TouchableOpacity key={m.id} onPress={() => setPicked(m)} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.surface2 }}>
                  <Text style={{ color: theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? (m.name_ar || m.name_en) : (m.name_en || m.name_ar)}</Text>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              <Text style={{ color: theme.primary, textAlign: AR ? 'right' : 'left', marginBottom: 6 }}>{AR ? (picked.name_ar || picked.name_en) : (picked.name_en || picked.name_ar)}</Text>
              <NInput placeholder={tt('phdash.74a607af')} value={newPrice} onChange={(v: string) => setNewPrice(v)} kbType="decimal-pad" />
              <NInput placeholder={tt('phdash.bc2230f2')} value={newStock} onChange={(v: string) => setNewStock(v)} kbType="numeric" />
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 8 }}>
                <NBtn label={tt('phdash.425e701d')} size="sm" loading={catalogBusy} onPress={addFromCatalog} />
                <NBtn label={tt('phdash.210b779f')} size="sm" variant="outline" onPress={() => setPicked(null)} />
              </View>
            </>
          )}
        </NCard>
      </View>
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : inventoryFailed ? (
        <NEmpty title={tt('phdash.5dbb3558')} actionLabel={tt('phdash.cf333076')} onAction={() => { setLoading(true); void fetchInventory(); }} icon="document" />
      ) : !loading && filtered.length === 0 ? (
        <Text style={{ color: theme.textSub, textAlign: 'center', marginTop: 40 }}>
          {tt('phdash.88572051')}
        </Text>
      ) : null}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const isExpiring = !!item.expiry_date && new Date(item.expiry_date) < new Date(new Date().setMonth(new Date().getMonth() + 3));
          return (
            <NCard style={{ marginBottom: 12, borderColor: isExpiring ? theme.warn : theme.border, borderWidth: isExpiring ? 2 : 1 }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{itemName(item)}</Text>
                  <Text style={{ color: theme.primary, fontWeight: 'bold', textAlign: AR ? 'right' : 'left' }}>{item.price} {tt('phdash.91d5796f')}</Text>
                  {isExpiring && (
                    <Text style={{ color: theme.warn, fontSize: 12, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                      {tt('phdash.685313bd')}{new Date(item.expiry_date).toISOString().slice(0, 10)}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 10, color: theme.textSub }}>{tt('phdash.97dbf2a7')}</Text>
                  <Switch value={item.available !== false} onValueChange={() => toggleOnline(item.id)} trackColor={{ true: theme.success }} />
                  <TouchableOpacity onPress={() => toggleCoverage(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: item.insurance_covered === true ? theme.success : theme.border, backgroundColor: item.insurance_covered === true ? theme.success : 'transparent' }} />
                    <Text style={{ fontSize: 10, color: theme.textSub }}>{tt('phdash.69b13e69')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTopWidth: 1, borderTopColor: theme.surface2, paddingTop: 12 }}>
                <Text style={{ color: item.stock === 0 ? theme.danger : theme.textSub }}>
                  {tt('phdash.3cf58f8e')}<Text style={{ fontWeight: 'bold', color: item.stock === 0 ? theme.danger : theme.text }}>{item.stock}</Text>
                </Text>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface2, borderRadius: 8, padding: 4 }}>
                  <TouchableOpacity onPress={() => updateStock(item.id, -1)} style={{ width: 32, height: 32, backgroundColor: theme.surface, borderRadius: 4, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: theme.text, fontSize: 20 }}>-</Text>
                  </TouchableOpacity>
                  <Text style={{ fontWeight: 'bold', color: theme.text, width: 30, textAlign: 'center' }}>{item.stock}</Text>
                  <TouchableOpacity onPress={() => updateStock(item.id, 1)} style={{ width: 32, height: 32, backgroundColor: theme.primary, borderRadius: 4, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: C.white, fontSize: 20 }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </NCard>
          );
        }}
      />
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PHARMACY ORDER CHAT (issues 479/480: the substitute negotiation of an order line)
// The pharmacy opens the chat of one line of an order it holds (POST /pharmacy/chat/threads), writes to the patient and
// may attach a substitute from its own inventory (GET /provider/inventory/search); the server checks the substitute
// against the prescription (issue 1440) and the patient accepts, rejects or removes the line in the patient apps.
// ══════════════════════════════════════════════════════════════════════════════
type ChatLine = { order_item_id: string; name?: string };
const CHAT_ERRORS: Record<string, [string, string]> = {
  substitute_outside_prescription: ['البديل خارج الوصفة: يجب أن يكون نفس المادة الفعالة والتركيز والشكل', 'Substitute outside the prescription: it must have the same active ingredient, strength and form'],
  inventory_item_not_available: ['هذا الصنف غير متاح في مخزونك', 'This item is not available in your inventory'],
  content_blocked: ['لا يُسمح بأرقام الهواتف أو الروابط أو التطبيقات الأخرى في المحادثة', 'Phone numbers, links and other apps are not allowed in the chat'],
  thread_closed: ['أُغلقت هذه المحادثة', 'This chat is closed'],
  order_closed: ['انتهى هذا الطلب', 'This order is finished'],
  not_part_of_order: ['هذا الطلب ليس لصيدليتك', 'This order is not yours'],
};
const chatErrorCode = (e: any): string => {
  const d = e?.response?.data;
  const m = d?.message;
  return String((m && typeof m === 'object' ? m.code : null) || d?.code || (typeof m === 'string' ? m : '') || '');
};

function PharmacyChatScreen({ onBack, orderId, lines }: { onBack: () => void; orderId?: string; lines?: ChatLine[] }) {
  const { theme } = useTheme(); const { lang, t: tt } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [threads, setThreads] = useState<any[]>([]);
  const [thread, setThread] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [picked, setPicked] = useState<any | null>(null);
  const items: ChatLine[] = Array.isArray(lines) ? lines.filter((l) => l && l.order_item_id) : [];

  const fail = (e: any, ar: string, en: string) => {
    const known = CHAT_ERRORS[chatErrorCode(e)];
    show(known ? (AR ? known[0] : known[1]) : (AR ? ar : en), 'error');
  };

  const loadThreads = useCallback(async () => {
    if (!orderId) { setLoading(false); return; }
    try {
      const res = await client.get('/pharmacy/chat/threads', { params: { order_id: orderId } });
      setThreads(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      fail(e, 'تعذر تحميل المحادثة', 'Could not load chat');
    } finally {
      setLoading(false);
    }
  }, [orderId]);
  useEffect(() => { void loadThreads(); }, [loadThreads]);

  const readThread = async (id: string) => {
    const res = await client.get(`/pharmacy/chat/threads/${id}/messages`);
    setThread(res.data?.thread ?? null);
    setMessages(Array.isArray(res.data?.messages) ? res.data.messages : []);
  };

  const openLine = async (line: ChatLine) => {
    if (!orderId || busy) return;
    setBusy(`open-${line.order_item_id}`);
    try {
      const res = await client.post('/pharmacy/chat/threads', { order_id: orderId, order_item_id: line.order_item_id });
      if (res.data?.id) await readThread(res.data.id);
      await loadThreads();
    } catch (e) {
      fail(e, 'تعذر فتح المحادثة', 'Could not open the chat');
    } finally {
      setBusy(null);
    }
  };

  const search = async () => {
    const q = term.trim();
    if (q.length < 2) { show(tt('phdash.7cb7b6b5'), 'error'); return; }
    setBusy('search');
    try {
      const res = await client.get('/provider/inventory/search', { params: { q } });
      setResults((Array.isArray(res.data) ? res.data : []).filter((r: any) => r?.id && r.source !== 'catalogue' && Number(r.stock) > 0));
    } catch (e) {
      fail(e, 'تعذر البحث في المخزون', 'Inventory search failed');
    } finally {
      setBusy(null);
    }
  };

  const send = async () => {
    const text = msg.trim();
    if ((!text && !picked) || !thread?.id || busy) return;
    setBusy('send');
    try {
      await client.post(`/pharmacy/chat/threads/${thread.id}/messages`, {
        ...(text ? { text } : {}),
        ...(picked ? { substitute_offer: { inventory_item_id: picked.id } } : {}),
      });
      setMsg(''); setPicked(null); setResults(null); setTerm('');
      await readThread(thread.id);
    } catch (e) {
      fail(e, 'تعذر إرسال الرسالة', 'Could not send message');
    } finally {
      setBusy(null);
    }
  };

  const lineName = (id?: string) => items.find((l) => l.order_item_id === id)?.name || (tt('phdash.292f6d3a'));
  const outcome = (r?: string) => r === 'accepted' ? (tt('phdash.259c41c1'))
    : r === 'rejected' ? (tt('phdash.2c85249e'))
    : r === 'removed' ? (tt('phdash.779b7922'))
    : (tt('phdash.9d8d8ba4'));

  if (thread) {
    const open = thread.status === 'open';
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <NHeader title={(tt('phdash.c218269b')) + lineName(thread.order_item_id)} onBack={() => { setThread(null); setPicked(null); setResults(null); }} />
        <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.sm }}>
          {messages.length === 0 ? <NEmpty icon="chat" title={tt('phdash.4d4ef392')} sub={tt('phdash.bc2fc224')} /> : null}
          {messages.map((m: any) => {
            if (m.sender_role === 'system') {
              const code = m.system_code === 'substitute_accepted' ? 'accepted' : m.system_code === 'substitute_rejected' ? 'rejected' : m.system_code === 'item_removed' ? 'removed' : '';
              return <Text key={m.id} style={{ color: theme.textSub, fontSize: FS.xs, textAlign: 'center' }}>{outcome(code)}</Text>;
            }
            const mine = m.sender_role === 'pharmacy';
            const fg = mine ? theme.textInv : theme.text;
            const offer = m.substitute_offer;
            return (
              <View key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', backgroundColor: mine ? theme.primary : theme.surface2, borderRadius: R.md, padding: SP.md, maxWidth: '85%', gap: SP.xs }}>
                {m.text ? <Text style={{ color: fg }}>{m.text}</Text> : null}
                {offer ? (
                  <Text style={{ color: fg, fontWeight: FW.bold }}>
                    {(tt('phdash.c82c60fb')) + ((AR ? offer.name : offer.name_en || offer.name) || offer.sku || '') + (offer.price ? ` · ${offer.price} ${tt('phdash.91d5796f')}` : '')}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
        {open ? (
          <View style={{ padding: SP.md, gap: SP.sm, borderTopWidth: 1, borderTopColor: theme.border }}>
            {picked ? (
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
                <Text style={{ flex: 1, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{(tt('phdash.4da22bc5')) + (picked.name_ar || picked.name_en || picked.sku)}</Text>
                <NBtn label={tt('phdash.c91a997c')} size="sm" variant="outline" full={false} onPress={() => setPicked(null)} />
              </View>
            ) : results ? (
              <View style={{ gap: SP.xs }}>
                {results.length === 0 ? <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{tt('phdash.8d1fedf2')}</Text> : null}
                {results.slice(0, 8).map((r: any) => (
                  <TouchableOpacity key={r.id} accessibilityRole="button" onPress={() => { setPicked(r); setResults(null); }} style={{ padding: SP.sm, borderRadius: R.sm, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
                    <Text style={{ color: theme.text, textAlign: AR ? 'right' : 'left' }}>{(AR ? r.name_ar || r.name_en : r.name_en || r.name_ar) + (r.price ? ` · ${r.price} ${tt('phdash.91d5796f')}` : '')}</Text>
                  </TouchableOpacity>
                ))}
                <NBtn label={tt('phdash.e6d3a19e')} size="sm" variant="outline" onPress={() => setResults(null)} />
              </View>
            ) : (
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
                <View style={{ flex: 1 }}><NInput placeholder={tt('phdash.86871215')} value={term} onChange={setTerm} /></View>
                <NBtn label={tt('phdash.f61f44ef')} size="sm" variant="outline" full={false} loading={busy === 'search'} onPress={search} />
              </View>
            )}
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
              <View style={{ flex: 1 }}><NInput placeholder={tt('phdash.5a0fe14a')} value={msg} onChange={setMsg} /></View>
              <NBtn label={tt('phdash.ad89df6b')} full={false} loading={busy === 'send'} onPress={send} />
            </View>
          </View>
        ) : (
          <Text style={{ color: theme.textSub, textAlign: 'center', padding: SP.lg }}>{outcome(thread.resolution)}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('phdash.1fcdbb86')} onBack={onBack} />
      {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.sm }}>
          <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
            {tt('phdash.b87dd5f0')}
          </Text>
          {items.length === 0 && threads.length === 0 ? <NEmpty icon="chat" title={tt('phdash.db331798')} /> : null}
          {items.map((line) => {
            const t = threads.find((x: any) => x.order_item_id === line.order_item_id);
            return (
              <NCard key={line.order_item_id} style={{ padding: SP.md, gap: SP.sm }}>
                <Text style={{ color: theme.text, fontWeight: FW.semi, textAlign: AR ? 'right' : 'left' }}>{line.name || (tt('phdash.292f6d3a'))}</Text>
                {t?.last_message?.text ? <Text numberOfLines={1} style={{ color: theme.textSub, fontSize: FS.xs, textAlign: AR ? 'right' : 'left' }}>{t.last_message.text}</Text> : null}
                <NBtn label={t ? (t.status === 'open' ? (tt('phdash.7d536576')) : outcome(t.resolution)) : (tt('phdash.4aac9f04'))}
                  size="sm" variant={t ? 'primary' : 'outline'} loading={busy === `open-${line.order_item_id}`} onPress={() => (t ? readThread(t.id).catch((e) => fail(e, 'تعذر تحميل المحادثة', 'Could not load chat')) : openLine(line))} />
              </NCard>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
function SettingsScreen({ onBack, onNavigate }: any) {
  const { theme } = useTheme(); const { lang, t, t: tt } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [loading, setLoading] = useState(false);
  // the saved values, not invented defaults (10 km, 50, 15 and "accepts insurance" were shown to every pharmacy)
  const [ownDelivery, setOwnDelivery] = useState<OwnDeliveryFormState>({ ...EMPTY_OWN_DELIVERY });
  const [cityCode, setCityCode] = useState<string | undefined>(undefined);
  const [trackInventory, setTrackInventory] = useState(false);

  useEffect(() => {
    client.get('/provider/profile').then((r: any) => {
      const p = r?.data?.profile ?? r?.data ?? {};
      const city = p.address?.city;
      if (typeof city === 'string' && city) setCityCode(city);
    }).catch(() => undefined);
    client.get('/provider/pharmacy/delivery-settings').then((r: any) => setOwnDelivery(ownDeliveryFromServer(r?.data?.own_delivery))).catch(() => undefined);
  }, []);

  useEffect(() => {
    client.get('/provider/pharmacy/inventory-tracking').then((r: any) => {
      const v = r?.data?.inventory_tracking;
      if (typeof v === 'boolean') setTrackInventory(v);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const problem = ownDeliveryError(ownDelivery);
      if (problem) { show(t(problem), 'error'); setLoading(false); return; }
      // own couriers, zone, fee and threshold: applied at once (the server validates again)
      await client.put('/provider/pharmacy/delivery-settings', { own_delivery: ownDeliveryPayload(ownDelivery) });
      show(t('pharmacy.ownDelivery.saved'), 'success');
      onBack();
    } catch (e: any) {
      const m = e?.response?.data?.message;
      show((Array.isArray(m) ? m[0] : m) || t('pharmacy.ownDelivery.saveFailed'), 'error');
    }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('phdash.981ba752')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.md }}>
        <NSecHeader title={tt('phdash.363099b8')} />
        <NCard style={{ gap: SP.md }}>
          <OwnDeliveryFields value={ownDelivery} onChange={(patch) => setOwnDelivery((cur) => ({ ...cur, ...patch }))} cityCode={cityCode} />
        </NCard>


        <NSecHeader title={tt('phdash.6f6dcfc9')} />
        <NBtn label={tt('phdash.849acb0e')} variant="outline" icon="shield" onPress={() => onNavigate && onNavigate('insurance_decisions')} />
        <NCard style={{ gap: SP.md }}>
          <NToggle label={tt('phdash.08bdebb6')} value={trackInventory} onChange={async (v: boolean) => {
            setTrackInventory(v);
            try {
              await client.put('/provider/pharmacy/inventory-tracking', { inventory_tracking: v });
            } catch {
              setTrackInventory(!v);
              show(tt('phdash.762b7896'), 'error');
            }
          }} />
          {!trackInventory ? (
            <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{tt('phdash.98ecce61')}</Text>
          ) : null}
        </NCard>

        <GlobalSystemSettings />
        <NBtn label={tt('phdash.f40a406a')} loading={loading} onPress={handleSave} style={{ marginTop: SP.lg }} />
      </ScrollView>
    </View>
  );
}
