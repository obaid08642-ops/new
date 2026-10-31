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
 const { lang } = useLang();
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
    { key: 'orders', icon: 'radar', label: AR ? 'الرادار' : 'Radar' },
    { key: 'b2b', icon: 'activity', label: AR ? 'النواقص' : 'B2B Procurement' },
    { key: 'dispatch', icon: 'truck', label: AR ? 'الطلبات' : 'Orders' },
    { key: 'settings', icon: 'settings', label: AR ? 'المزيد' : 'More' },
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
                  <NBtn label={AR ? 'إعادة المحاولة' : 'Try Again'} onPress={() => { setBioError(''); Biometric.authenticate('قم بالمصادقة').then(r => r.success ? setUnlocked(true) : setBioError('فشلت المصادقة الحيوية')); }} />
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
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#EEE', paddingBottom: 20, paddingTop: 10, justifyContent: 'space-around' },
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
  const { lang } = useLang();
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
    { id: 'OUT_OF_STOCK_COMPLETELY', label: AR ? 'الكمية غير متوفرة إطلاقاً' : 'Out of stock completely' },
    { id: 'PRESCRIPTION_INVALID', label: AR ? 'الوصفة الطبية غير صالحة' : 'Invalid Prescription' },
    { id: 'INSURANCE_ISSUE', label: AR ? 'مشكلة في التغطية التأمينية' : 'Insurance Issue' },
    { id: 'OUT_OF_DELIVERY_ZONE', label: AR ? 'خارج نطاق التوصيل' : 'Out of Delivery Zone' },
    { id: 'PHARMACY_CLOSING', label: AR ? 'الصيدلية ستغلق قريباً' : 'Pharmacy closing soon' }
  ];

  const openOfferComposer = (broadcast: any) => {
    // A pharmacy may submit only a server-derived quote; assignment remains blocked pending explicit patient selection.
    onNavigate('pharmacy_broadcast', broadcast);
  };

  const confirmReject = async (reasonId: string) => {
    try {
      await client.post(`/provider/pharmacy/broadcasts/${rejectOrderId}/reject`, { reason: reasonId });
      setBroadcasts(prev => prev.filter(b => b.order_id !== rejectOrderId));
      show(AR ? 'تم رفض الطلب' : 'Order rejected', 'info');
      setShowRejectModal(false);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (AR ? 'تعذر رفض الطلب، حاول مجدداً' : 'Could not reject the order, try again'), 'error');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[s.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 16) }]}>
        <View>
          <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>
            {AR ? 'الرادار المباشر' : 'Live Radar'}
          </Text>
          <Text style={{ color: isOnline ? 'green' : 'gray', fontSize: 12, fontWeight: 'bold' }}>
            {isOnline? (AR?' متصل - جاهز لاستقبال الطلبات':' Online - Ready'): (AR?' غير متصل':' Offline')}
          </Text>
        </View>
        <Switch value={isOnline} onValueChange={() => { void toggleOnline(); }} trackColor={{ true: theme.primary }} />
      </View>
      
      <SetupChecklist compact onNavigate={onNavigate} onToggleOnline={onToggleOnline} onOpenMore={() => onSwitchTab('settings')} />

      {!isOnline ? (
        <NEmpty icon="moon" title={AR ? 'أنت غير متصل' : 'You are offline'} sub={AR ? 'قم بتفعيل الاتصال لاستقبال الطلبات' : 'Go online to receive orders'} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {broadcasts.length === 0 ? (
            <NEmpty icon="radar" title={AR ? 'لا توجد طلبات حالياً' : 'No active orders'} sub={AR ? 'ستظهر الطلبات القريبة هنا' : 'Nearby orders will appear here'} />
          ) : (
            broadcasts.map((b, idx) => (
              <NCard key={b.id || idx} style={{ marginBottom: 16, padding: 16, borderColor: theme.primary, borderWidth: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View>
                    <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.text }}>{AR ? `بث #${String(b.id).slice(-6)}` : `Broadcast #${String(b.id).slice(-6)}`}</Text>
                    </View>
                    <Text style={{ color: theme.textSub, fontSize: 12 }}>{AR ? `الجولة ${b.current_round || '—'} · النطاق ${b.current_radius_km || '—'} كم` : `Round ${b.current_round || '—'} · radius ${b.current_radius_km || '—'} km`}</Text>
                  </View>
                  <Text style={{ fontWeight: 'bold', fontSize: 13, color: theme.primary }}>
                    {b.payment_summary?.method === 'insurance' ? (AR ? 'تأمين' : 'Insurance')
                      : b.payment_summary?.method === 'cod' ? (AR ? 'عند الاستلام' : 'COD')
                      : b.payment_summary?.method === 'cash' ? (AR ? 'نقدي' : 'Cash')
                      : b.payment_summary?.method === 'card' ? (AR ? 'بطاقة' : 'Card')
                      : (AR ? 'طريقة الدفع غير متاحة' : 'Payment method unavailable')}
                  </Text>
                </View>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <NBadge size="xs" variant="info" label={b.fulfillment_method === 'pickup' ? (AR ? 'استلام ذاتي' : 'Self pickup') : (AR ? 'توصيل' : 'Delivery')} />
                  {b.approx_distance_km != null && (
                    <NBadge size="xs" variant="default" label={(AR ? 'يبعد تقريباً ' : 'Approx. ') + b.approx_distance_km + (AR ? ' كم' : ' km')} />
                  )}
                  {!!b.approx_area && <NBadge size="xs" variant="default" label={b.approx_area} />}
                </View>
                {b.payment_summary?.method === 'insurance' && b.insurance && (
                  <View style={{ backgroundColor: theme.infoBg, borderRadius: 8, padding: 10, marginBottom: 12 }}>
                    <Text style={{ color: theme.info, fontWeight: 'bold', fontSize: 13, textAlign: AR ? 'right' : 'left' }}>
                      {(AR ? 'شركة التأمين: ' : 'Insurance: ') + (b.insurance.company_name_ar || b.insurance.company_name_en || '—')}
                    </Text>
                    {!!b.insurance.category && (
                      <Text style={{ color: theme.info, fontSize: 12, textAlign: AR ? 'right' : 'left' }}>
                        {(AR ? 'الفئة: ' : 'Category: ') + b.insurance.category}
                      </Text>
                    )}
                  </View>
                )}
                {b.attachments.length > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: theme.textSub, fontSize: 12, marginBottom: 6, textAlign: AR ? 'right' : 'left' }}>
                      {AR ? 'مرفقات الروشتة' : 'Prescription attachments'}
                    </Text>
                    <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
                      {b.attachments.map((a: any, ai: number) => (
                        <TouchableOpacity key={ai} onPress={() => Linking.openURL(a.uri)} style={{ backgroundColor: theme.surface2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                          <Text style={{ color: theme.primary, fontSize: 12 }}>
                            {a.type === 'pdf' ? (AR ? `📄 ملف PDF ${ai + 1}` : `📄 PDF ${ai + 1}`) : (AR ? `🖼️ صورة ${ai + 1}` : `🖼️ Image ${ai + 1}`)}
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
                  <NBtn label={AR ? 'رفض' : 'Reject'} variant="outline" style={{ flex: 1 }} onPress={() => { setRejectOrderId(b.order_id); setShowRejectModal(true); }} />
                  <NBtn label={b.my_offer_status === 'submitted' ? (AR ? 'عرضك مُرسل — تعديل' : 'Offer sent — edit') : b.my_offer_status === 'draft' ? (AR ? 'متابعة المسودة' : 'Continue draft') : (AR ? 'إنشاء عرض' : 'Create offer')} variant="secondary" style={{ flex: 2 }} onPress={() => openOfferComposer(b)} />
                </View>
              </NCard>
            ))
          )}
        </ScrollView>
      )}

      {/* REJECTION REASONS MODAL */}
      <NSheet visible={showRejectModal} onClose={() => setShowRejectModal(false)} title={AR ? 'سبب الرفض' : 'Rejection Reason'}>
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
  const { lang } = useLang();
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
      .catch(() => { setReturnsList([]); show(AR ? 'تعذر جلب المرتجعات — تحقق من الاتصال' : 'Could not load returns — check connection', 'error'); })
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
      setMyRequests(Array.isArray(res?.data) ? res.data : []);
    } catch { /* list is informational */ }
  };
  useEffect(() => { loadMyRequests(); }, []);

  const runAnalysis = async (payload: any) => {
    setAnalyzing(true);
    try {
      const res = await client.post('/pharmacy/procurement/analyze-file', payload);
      const items = analysisItems(res);
      if (items.length === 0) {
        show(AR ? 'لم يتعرف الذكاء الاصطناعي على أصناف — جرّب صورة أوضح أو الكتابة اليدوية' : 'AI found no items — try a clearer image or text', 'info');
      }
      setCart(prev => [...prev, ...items.map((it: any) => ({ ...it }))]);
    } catch {
      show(AR ? 'فشل التحليل — تحقق من الاتصال' : 'Analysis failed — check connection', 'error');
    } finally { setAnalyzing(false); }
  };

  const submitB2B = async (method: string) => {
    if (method === 'voice') {
      show(AR ? 'الإدخال الصوتي غير متاح حالياً — استخدم الكتابة أو تصوير الرف' : 'Voice input is not available yet — use text or shelf photo', 'info');
      return;
    }
    if (method === 'manual') {
      if (!b2bText.trim()) { show(AR ? 'اكتب طلب التوريد أولاً' : 'Enter the supply order first', 'error'); return; }
      await runAnalysis({ text: b2bText.trim() });
      setB2bText('');
      return;
    }
    // OCR: pick or capture a photo → base64 → AI vision analysis
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { show(AR ? 'يلزم إذن الوصول للصور' : 'Photo permission required', 'error'); return; }
      const picked = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6, allowsEditing: false });
      if (picked.canceled || !picked.assets?.[0]?.base64) return;
      const asset = picked.assets[0];
      await runAnalysis({ file_base64: asset.base64, mime_type: asset.mimeType || 'image/jpeg' });
    } catch {
      show(AR ? 'تعذر فتح الصور' : 'Could not open photos', 'error');
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
      show(AR ? 'تم إرسال طلب عرض السعر للإدارة — سيصلك الرد هنا' : 'Quote request sent to admin', 'success');
      setCart([]);
      loadMyRequests();
    } catch {
      show(AR ? 'فشل إرسال الطلب' : 'Failed to send request', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'المستودع والإمداد' : 'Warehouse & Procurement'} onBack={onBack} />
      
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', padding: 16, gap: 10 }}>
        <NBtn label={AR ? 'طلب توريد (B2B)' : 'Order Supply (B2B)'} variant={mode === 'b2b' ? 'primary' : 'outline'} onPress={() => setMode('b2b')} style={{ flex: 1 }} />
        <NBtn label={AR ? 'المرتجعات (Returns)' : 'Returns Manager'} variant={mode === 'returns' ? 'primary' : 'outline'} onPress={() => setMode('returns')} style={{ flex: 1 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {mode === 'b2b' ? (
          <NCard>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'الطلب الذكي من المستودعات' : 'Smart B2B Procurement'}
            </Text>
            <Text style={{ color: theme.textSub, marginBottom: 16, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'اطلب النواقص عن طريق التحدث أو التصوير أو الكتابة، وسيقوم الذكاء الاصطناعي بتصنيفها وإرسالها لأفضل الموردين.' : 'Order shortages using Voice, OCR, or Text. Our AI will route to the best suppliers.'}
            </Text>
            
            {/* Tabs for B2B Methods */}
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 8, marginBottom: 16, backgroundColor: theme.surface2, padding: 4, borderRadius: 8 }}>
              <TouchableOpacity style={{ flex: 1, padding: 8, borderRadius: 6, backgroundColor: b2bTab === 'manual' ? theme.surface : 'transparent' }} onPress={() => setB2bTab('manual')}>
                <Text style={{ textAlign: 'center', color: b2bTab === 'manual' ? theme.primary : theme.textSub, fontWeight: 'bold' }}>{AR ? 'كتابة' : 'Text'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 8, borderRadius: 6, backgroundColor: b2bTab === 'voice' ? theme.surface : 'transparent' }} onPress={() => setB2bTab('voice')}>
                <Text style={{ textAlign: 'center', color: b2bTab === 'voice' ? theme.primary : theme.textSub, fontWeight: 'bold' }}>{AR ? 'صوت' : 'Voice'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 8, borderRadius: 6, backgroundColor: b2bTab === 'ocr' ? theme.surface : 'transparent' }} onPress={() => setB2bTab('ocr')}>
                <Text style={{ textAlign: 'center', color: b2bTab === 'ocr' ? theme.primary : theme.textSub, fontWeight: 'bold' }}>{AR ? 'تصوير الرف' : 'OCR'}</Text>
              </TouchableOpacity>
            </View>

            {b2bTab === 'manual' && (
              <View>
                <TextInput placeholder={AR ? 'اكتب أسماء الأدوية المطلوبة هنا...' : 'Type medication names here...'} value={b2bText} onChangeText={setB2bText} multiline style={{ height: 120, textAlignVertical: 'top', backgroundColor: theme.surface, padding: 12, borderRadius: 8, color: theme.text }} />
                <NBtn label={AR ? 'إرسال الطلب' : 'Submit Order'} onPress={() => submitB2B('manual')} style={{ marginTop: 12 }} />
              </View>
            )}

            {b2bTab === 'voice' && (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: isRecording ? theme.danger + '20' : theme.surface2, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: isRecording ? theme.danger : theme.border }}>
                  <Text style={{ fontSize: 48 }}>{isRecording?'':''}</Text>
                </View>
                {isRecording && <Text style={{ color: theme.danger, fontWeight: 'bold', marginBottom: 16 }}>00:14</Text>}
                {!isRecording ? (
                  <NBtn label={AR ? 'بدء التسجيل' : 'Start Recording'} onPress={() => setIsRecording(true)} />
                ) : (
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 12, width: '100%' }}>
                    <NBtn label={AR ? 'إلغاء' : 'Cancel'} variant="outline" onPress={() => setIsRecording(false)} style={{ flex: 1 }} />
                    <NBtn label={AR ? 'إرسال المقطع' : 'Send Audio'} onPress={() => submitB2B('voice')} style={{ flex: 1 }} />
                  </View>
                )}
              </View>
            )}

            {b2bTab === 'ocr' && (
              <View>
                <View style={{ height: 200, backgroundColor: theme.surface2, borderRadius: 8, borderWidth: 2, borderColor: theme.primary, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                  <View style={{ marginBottom: 8 }}><I name="camera" size={40} color={theme.textSub} /></View>
                  <Text style={{ color: theme.textSub, textAlign: 'center', paddingHorizontal: 16 }}>
                    {AR ? 'قم بتوجيه الكاميرا نحو الرف أو الفاتورة لاستخراج النواقص تلقائياً' : 'Point camera at shelf or invoice to extract shortages automatically'}
                  </Text>
                </View>
                {uploadsOn ? (
<NBtn label={AR ? 'اختيار صورة الرف/الفاتورة وتحليلها' : 'Pick shelf/invoice photo & analyze'} onPress={() => submitB2B('ocr')} />
) : <UploadsUnavailable />}
              </View>
            )}

            {analyzing && (
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
                <ActivityIndicator color={theme.primary} />
                <Text style={{ color: theme.textSub, marginHorizontal: 8 }}>{AR ? 'الذكاء الاصطناعي يحلل الأصناف…' : 'AI is analyzing items…'}</Text>
              </View>
            )}

            {/* ── السلة المصنفة (أدوية / غير دوائية) قبل إرسال طلب عرض السعر ── */}
            {cart.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: 8 }}>
                  {AR ? `سلة الطلب (${cart.length} صنف)` : `Request cart (${cart.length} items)`}
                </Text>
                {['medical', 'non_medical'].map((g) => {
                  const items = cart.map((it, idx) => ({ it, idx })).filter(x => (x.it.category_group || 'medical') === g);
                  if (items.length === 0) return null;
                  return (
                    <View key={g} style={{ marginBottom: 10 }}>
                      <Text style={{ color: theme.primary, fontWeight: 'bold', textAlign: AR ? 'right' : 'left', marginBottom: 4 }}>
                        {g === 'medical' ? (AR ? '💊 أدوية' : '💊 Medications') : (AR ? '🧴 غير دوائية' : '🧴 Non-medical')}
                      </Text>
                      {items.map(({ it, idx }) => (
                        <View key={idx} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: theme.surface2, borderRadius: 8, padding: 8, marginBottom: 6 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.text, fontWeight: '600', textAlign: AR ? 'right' : 'left' }}>{it.medicine_name || it.raw_name_string}</Text>
                            {!it.matched && <Text style={{ color: theme.danger, fontSize: 11, textAlign: AR ? 'right' : 'left' }}>{AR ? 'غير مطابق للكتالوج — سيُراجع يدوياً' : 'Not in catalog — manual review'}</Text>}
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
                <NBtn label={submitting ? (AR ? 'جارٍ الإرسال…' : 'Sending…') : (AR ? 'إرسال طلب عرض سعر للمستودع' : 'Send price-quote request')} onPress={submitCart} style={{ marginTop: 4, opacity: submitting ? 0.6 : 1 }} />
              </View>
            )}

            {/* ── طلباتي السابقة وحالاتها ── */}
            {myRequests.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: 6 }}>{AR ? 'طلباتي السابقة' : 'My previous requests'}</Text>
                {myRequests.slice(0, 5).map((r: any) => (
                  <View key={r._id} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', backgroundColor: theme.surface2, borderRadius: 8, padding: 10, marginBottom: 6 }}>
                    <Text style={{ color: theme.textSub, fontSize: 12 }}>{(r.items || []).length} {AR ? 'صنف' : 'items'}</Text>
                    <Text style={{ color: r.status === 'QUOTATION_ISSUED' ? theme.primary : theme.text, fontSize: 12, fontWeight: 'bold' }}>
                      {r.status === 'PENDING_ADMIN_REVIEW' ? (AR ? 'بانتظار عرض السعر' : 'Awaiting quote')
                        : r.status === 'QUOTATION_ISSUED' ? (AR ? 'وصل عرض السعر ✓' : 'Quote received ✓')
                        : r.status === 'COMPLETED' ? (AR ? 'مكتمل' : 'Completed')
                        : r.status === 'CANCELLED' ? (AR ? 'ملغي' : 'Cancelled') : r.status}
                    </Text>
                  </View>
                ))}
              </View>
            )}

          </NCard>
        ) : (
          <NCard>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'مرتجعات المرضى على طلبات الصيدلية' : 'Patient Returns on Pharmacy Orders'}
            </Text>
            {returnsLoading ? (
              <ActivityIndicator color={theme.primary} style={{ marginVertical: 24 }} />
            ) : returnsList.length === 0 ? (
              <Text style={{ color: theme.textSub, textAlign: 'center', marginVertical: 24 }}>
                {AR ? 'لا توجد طلبات إرجاع من المرضى على طلبات صيدليتك' : 'No patient return requests on your pharmacy orders'}
              </Text>
            ) : returnsList.map((r: any) => (
              <View key={r.id || r._id} style={{ backgroundColor: theme.surface2, padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: 'bold', color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? `طلب إرجاع ${r.order_id || ''}` : `Return ${r.order_id || ''}`}
                  </Text>
                  <NBadge label={r.status === 'approved' || r.status === 'completed' ? (AR ? 'مقبول' : 'Approved') : r.status === 'rejected' ? (AR ? 'مرفوض' : 'Rejected') : (AR ? 'قيد المعالجة' : 'Processing')} variant={r.status === 'approved' || r.status === 'completed' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'} size="xs" />
                </View>
                <Text style={{ color: theme.textSub, fontSize: 12, marginTop: 6, textAlign: AR ? 'right' : 'left' }}>
                  {(AR ? 'السبب: ' : 'Reason: ') + (r.reason || '—') + ' · ' + (AR ? 'المبلغ: ' : 'Amount: ') + (r.amount ?? 0) + (AR ? ' ر.س' : ' SAR')}
                </Text>
                <Text style={{ color: theme.textSub, fontSize: 11, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? 'قرار القبول/الرفض والاسترداد يتم من إدارة المنصة' : 'Approval and refund decisions are handled by platform admin'}
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
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState('');

  const statusMeta = (s: string) => {
    const k = (s || '').toLowerCase();
    if (k === 'approved' || k === 'completed') return { label: AR ? 'مقبول' : 'Approved', variant: 'success' as any };
    if (k === 'rejected') return { label: AR ? 'مرفوض' : 'Rejected', variant: 'danger' as any };
    return { label: AR ? 'قيد المعالجة' : 'Processing', variant: 'warning' as any };
  };

  const loadReturns = () => {
    client.get('/pharmacy/returns/provider/list')
      .then((res: any) => setReturns(res.data || []))
      .catch(() => { setReturns([]); show(AR ? 'تعذر جلب المرتجعات' : 'Failed to load returns', 'error'); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadReturns(); }, []);

  if (openId) return <PharmacyReturnDetail id={openId} onBack={() => setOpenId('')} onAnswered={loadReturns} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'مراجعة المرتجعات (RMA)' : 'Returns Management'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {loading && <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />}
        {!loading && returns.length === 0 && (
          <NEmpty title={AR ? 'لا توجد مرتجعات' : 'No returns'} subtitle={AR ? 'لم يقدم أي مريض طلب إرجاع على طلباتك بعد' : 'No patient has filed a return on your orders yet'} />
        )}
        {!loading && returns.map((r: any) => {
          const meta = statusMeta(r.status);
          return (
            <NCard key={r.id || r._id} onPress={() => setOpenId(String(r.id || ''))} style={{ marginBottom: 12, padding: 16 }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: theme.text }}>
                  {AR ? `طلب إرجاع ${r.order_id || ''}` : `Return ${r.order_id || ''}`}
                </Text>
                <NBadge label={meta.label} variant={meta.variant} size="xs" />
              </View>
              <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: 4 }}>
                {(AR ? 'السبب: ' : 'Reason: ') + (r.reason || '—')}
              </Text>
              {!!r.details && (
                <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: 4 }} numberOfLines={2}>
                  {r.details}
                </Text>
              )}
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ color: theme.text, fontWeight: '600' }}>{(r.amount ?? 0) + (AR ? ' ر.س' : ' SAR')}</Text>
                <Text style={{ color: theme.textSub, fontSize: 12 }}>{(r.createdAt || '').slice(0, 10)}</Text>
              </View>
              <Text style={{ color: theme.textSub, fontSize: 11, marginTop: 6, textAlign: AR ? 'right' : 'left' }}>
                {AR ? 'اضغط للتفاصيل والرد. قرار القبول/الرفض والاسترداد يتم من إدارة المنصة' : 'Tap for details and to answer. Approval and refund decisions are handled by platform admin'}
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
  const { lang, t } = useLang();
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
      if (!quiet) show(AR ? 'تعذر تحميل الطلبات' : 'Unable to load orders', 'error');
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
      show(AR ? 'تم تحديث حالة الطلب' : 'Order status updated', 'success');
      setCourierFor(null); setCollectFor(null);
      await load();
    } catch (e: any) {
      const code = e?.response?.data?.message;
      const known: Record<string, string> = {
        cod_collection_proof_required: AR ? 'يجب إدخال إثبات تحصيل المبلغ' : 'Collection proof is required',
        collected_amount_must_match_selected_quote_total: AR ? 'المبلغ المحصّل يجب أن يطابق إجمالي العرض المختار بالضبط' : 'Collected amount must exactly match the selected quote total',
        pickup_orders_are_handed_over_not_shipped: AR ? 'طلبات الاستلام الذاتي تُسلَّم ولا تُشحَن' : 'Pickup orders are handed over, not shipped',
        payment_confirmation_required: AR ? 'لم يُؤكَّد الدفع بعد' : 'Payment is not confirmed yet',
        insurance_decision_required: AR ? 'قرار التأمين مطلوب أولاً' : 'Insurance decision required first',
        cod_policy_confirmation_required: AR ? 'سياسة الدفع عند الاستلام غير مؤكدة' : 'COD policy not confirmed',
      };
      show(known[code] || code || (AR ? 'تعذر تنفيذ الإجراء' : 'Action failed'), 'error');
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
            {AR ? `طلب #${String(a.order_id || '').slice(-6)}` : `Order #${String(a.order_id || '').slice(-6)}`}
          </Text>
          <NBadge label={meta.label} variant={meta.variant} size="xs" />
        </View>
        <Text style={{ color: theme.textSub, fontSize: 12, textAlign: AR ? 'right' : 'left' }}>
          {(AR ? 'الأصناف: ' : 'Items: ') + (Array.isArray(a.items) ? a.items.length : 0) + ' · ' + (AR ? 'الإجمالي: ' : 'Total: ') + (a.totals?.total ?? 0) + (AR ? ' ر.س' : ' SAR')}
        </Text>
        {d?.patient_contact && (
          <View style={{ backgroundColor: theme.surface2, borderRadius: 8, padding: 10, marginTop: 8 }}>
            <Text style={{ color: theme.text, fontSize: 13, textAlign: AR ? 'right' : 'left' }}>
              {(AR ? 'المريض: ' : 'Patient: ') + (d.patient_contact.name || '—')}
            </Text>
            {!!d.patient_contact.phone && (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${d.patient_contact.phone}`)}>
                <Text style={{ color: theme.primary, fontSize: 13, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                  {(AR ? 'هاتف: ' : 'Phone: ') + d.patient_contact.phone}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {courierFor === a.id && (
          <View style={{ marginTop: 10, gap: 8 }}>
            <NInput placeholder={AR ? 'اسم المندوب (اختياري)' : 'Courier name (optional)'} value={courierName} onChange={setCourierName} />
            <NInput placeholder={AR ? 'هاتف المندوب (اختياري)' : 'Courier phone (optional)'} value={courierPhone} onChange={setCourierPhone} kbType="phone-pad" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <NBtn label={AR ? 'إلغاء' : 'Cancel'} variant="outline" style={{ flex: 1 }} onPress={() => setCourierFor(null)} />
              <NBtn label={AR ? 'تأكيد الانطلاق' : 'Confirm dispatch'} style={{ flex: 2 }} loading={actionId === a.id}
                onPress={() => doAction(a.id, 'out-for-delivery', { courier_name: courierName || undefined, courier_phone: courierPhone || undefined })} />
            </View>
          </View>
        )}
        {collectFor === a.id && (
          <View style={{ marginTop: 10, gap: 8 }}>
            <Text style={{ color: theme.text, fontWeight: '600', textAlign: AR ? 'right' : 'left' }}>
              {(AR ? 'إثبات تحصيل الدفع عند الاستلام — المبلغ المطلوب: ' : 'COD collection proof — expected: ') + (expectedTotal ?? 0) + (AR ? ' ر.س' : ' SAR')}
            </Text>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 8 }}>
              {(['cash', 'card_terminal'] as const).map((m) => (
                <TouchableOpacity key={m} onPress={() => setCollectMethod(m)}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', backgroundColor: collectMethod === m ? theme.primary : theme.surface2, borderColor: collectMethod === m ? theme.primary : theme.border }}>
                  <Text style={{ color: collectMethod === m ? '#FFF' : theme.text, fontWeight: '600' }}>
                    {m === 'cash' ? (AR ? 'نقداً' : 'Cash') : (AR ? 'شبكة' : 'Card terminal')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <NInput placeholder={AR ? 'المبلغ المحصّل' : 'Collected amount'} value={collectAmount} onChange={setCollectAmount} kbType="numeric" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <NBtn label={AR ? 'إلغاء' : 'Cancel'} variant="outline" style={{ flex: 1 }} onPress={() => setCollectFor(null)} />
              <NBtn label={AR ? 'تأكيد التسليم' : 'Confirm delivery'} style={{ flex: 2 }} loading={actionId === a.id}
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
              <NBtn label={AR ? 'تأكيد' : 'Confirm'} size="sm" loading={actionId === a.id} onPress={() => doAction(a.id, 'confirm')} />
            )}
            <NBtn label={AR ? 'محادثة الطلب' : 'Order chat'} size="sm" variant="outline" onPress={() => onNavigate?.('pharmacy_chat', { order_id: a.order_id, lines: (Array.isArray(a.items) ? a.items : []).map((it: any) => ({ order_item_id: it.order_item_id, name: it.name })) })} />
            {String(a.status) === 'confirmed' && (
              <NBtn label={AR ? 'بدء التجهيز' : 'Start preparing'} size="sm" loading={actionId === a.id} onPress={() => doAction(a.id, 'preparing')} />
            )}
            {String(a.status) === 'preparing' && (
              <NBtn label={AR ? 'جاهز' : 'Ready'} size="sm" loading={actionId === a.id} onPress={() => doAction(a.id, 'ready')} />
            )}
            {String(a.status) === 'ready_for_pickup' && (
              <>
                {/* the server refuses to ship a pickup order and to hand over a cash-on-delivery one without the collection: the detail decides */}
                {d && isPickup ? null : <NBtn label={AR ? 'انطلاق التوصيل' : 'Dispatch'} size="sm" onPress={() => { setCourierFor(a.id); if (!details[a.id]) loadDetail(a.id); }} />}
                {d && !isPickup ? null : (
                  <NBtn label={AR ? 'تسليم (استلام ذاتي)' : 'Hand over (pickup)'} size="sm" variant="outline" loading={actionId === a.id} disabled={!d}
                    onPress={() => { if (isCod) { setCollectFor(a.id); setCollectAmount(String(expectedTotal ?? '')); } else doAction(a.id, 'delivered'); }} />
                )}
              </>
            )}
            {String(a.status) === 'out_for_delivery' && (
              <NBtn label={AR ? 'تم التسليم' : 'Mark delivered'} size="sm" loading={actionId === a.id}
                onPress={() => { if (isCod || !details[a.id]) { setCollectFor(a.id); if (!details[a.id]) loadDetail(a.id); setCollectAmount(String(expectedTotal ?? '')); } else doAction(a.id, 'delivered'); }} />
            )}
            {!d && ['ready_for_pickup', 'out_for_delivery'].includes(String(a.status)) && (
              <NBtn label={AR ? 'التفاصيل' : 'Details'} size="sm" variant="outline" onPress={() => loadDetail(a.id)} />
            )}
          </View>
        )}
      </NCard>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'الطلبات' : 'Orders'} onBack={onBack} right={onNavigate ? <TouchableOpacity onPress={() => onNavigate('insurance_decisions')} style={{ padding: SP.sm }}><I name="shield" size={22} color={theme.primary} /></TouchableOpacity> : undefined} />
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
          <NEmpty icon="moon" title={AR ? 'لا توجد طلبات هنا' : 'No orders here'} sub={section === 'new' ? (AR ? 'ستظهر الطلبات المختارة هنا بعد اختيار المريض لعرضك' : 'Selected orders will appear here once a patient picks your offer') : (AR ? 'لا توجد طلبات في هذا القسم' : 'No orders in this section')} />
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
  const { lang } = useLang();
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
      show(matched ? (AR ? 'تم التحقق من المنتج من الخادم' : 'Product verified by the server') : (AR ? 'الباركود غير موجود في المخزون' : 'Barcode was not found in inventory'), matched ? 'success' : 'warning');
    } catch (error: any) {
      setProduct(null);
      show(error?.response?.data?.message || (AR ? 'تعذر التحقق من الباركود' : 'Unable to verify the barcode'), 'error');
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
        <NHeader title={AR ? 'ماسح الباركود' : 'Barcode Scanner'} onBack={onBack} />
        <View style={{ flex: 1, justifyContent: 'center', padding: SP.xl, gap: SP.lg }}>
          <NEmpty title={AR ? 'يلزم إذن الكاميرا' : 'Camera permission required'} sub={AR ? 'لا يمكن قراءة الباركود أو تعديل المخزون دون إذن الكاميرا.' : 'Camera permission is required to scan and verify inventory.'} icon="camera" />
          <NBtn label={AR ? 'منح الإذن' : 'Grant permission'} onPress={requestPermission} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <NHeader title={AR ? 'ماسح الباركود الذكي' : 'Smart Barcode Scanner'} onBack={onBack} />
      {!product && <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'qr', 'datamatrix', 'pdf417'] }} onBarcodeScanned={scanned ? undefined : onBarcodeScanned} />}
      <View style={{ padding: SP.xl, paddingBottom: SP.xxl, backgroundColor: '#111', gap: SP.md }}>
        {loading && <ActivityIndicator color={theme.primary} />}
        {barcode && <Text style={{ color: '#FFF', textAlign: 'center' }}>{AR ? `الباركود: ${barcode}` : `Barcode: ${barcode}`}</Text>}
        {product && (
          <NCard>
            <Text style={{ color: theme.text, fontWeight: FW.bold }}>{AR ? (product.name_ar || product.name_en || product.name || barcode) : (product.name_en || product.name_ar || product.name || barcode)}</Text>
            <Text style={{ color: theme.textSub, marginTop: SP.xs }}>{AR ? `المخزون المتاح: ${product.stock ?? product.quantity ?? 0}` : `Available stock: ${product.stock ?? product.quantity ?? 0}`}</Text>
          </NCard>
        )}
        <NBtn label={AR ? 'مسح باركود آخر' : 'Scan another barcode'} variant="outline" onPress={() => { setScanned(false); setBarcode(null); setProduct(null); }} />
      </View>
    </View>
  );
}



type LowStockAlert = { id: string; inventory_item_id: string; sku: string; name: string; current_stock: number; threshold: number; status: 'open' | 'acknowledged' | 'restocked' };

function ActiveInventoryScreen({ onBack, onNavigate }: { onBack: () => void; onNavigate?: (s: string, p?: any) => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [search, setSearch] = useState('');
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await client.get('/provider/capabilities/pharmacy');
      setInventory(Array.isArray(res.data) ? res.data : []);
    } catch {
      setInventory([]);
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
      show(AR ? 'تعذر تأكيد التنبيه' : 'Could not acknowledge the alert', 'error');
    } finally { setAlertBusy(null); }
  };
  const restockAlert = async (a: LowStockAlert) => {
    const qty = Math.floor(Number(restockQty[a.id]));
    if (!Number.isFinite(qty) || qty <= 0) { show(AR ? 'أدخل كمية أكبر من صفر' : 'Enter a quantity above zero', 'error'); return; }
    setAlertBusy(a.id);
    try {
      await client.post(`/provider/inventory/${a.inventory_item_id}/restock`, { qty });
      setRestockQty(prev => ({ ...prev, [a.id]: '' }));
      show(AR ? 'تمت إضافة الكمية للمخزون' : 'Stock added', 'success');
      await Promise.all([fetchAlerts(), fetchInventory()]);
    } catch {
      show(AR ? 'تعذر تحديث المخزون' : 'Could not update stock', 'error');
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
        show(AR ? 'تم الإرسال — تُطبق بعد اعتماد الإدارة' : 'Sent — applied after admin approval', 'success');
        fetchInventory();
      }
    } catch {
      show(AR ? 'تعذر حفظ التحديث على الخادم' : 'Could not save update to server', 'error');
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
      show(AR ? 'تعذر البحث في الكتالوج' : 'Catalog search failed', 'error');
    } finally { setCatalogBusy(false); }
  };
  const addFromCatalog = async () => {
    const price = Number(newPrice);
    const stock = Math.max(0, Math.floor(Number(newStock) || 0));
    if (!picked || !Number.isFinite(price) || price <= 0) { show(AR ? 'أدخل سعراً أكبر من صفر' : 'Enter a price above zero', 'error'); return; }
    setCatalogBusy(true);
    try {
      await client.post('/provider/capabilities/pharmacy', {
        sku: String(picked.id), name_ar: picked.name_ar || picked.name || picked.name_en, name_en: picked.name_en || undefined,
        price, stock, available: true,
      });
      show(AR ? 'أُرسل الصنف — يظهر في عروضك بعد اعتماد الإدارة' : 'Item sent — usable in offers after admin approval', 'success');
      setPicked(null); setNewPrice(''); setNewStock(''); setCatalogResults([]); setCatalogQuery('');
      fetchInventory();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (AR ? 'تعذر إرسال الصنف' : 'Could not send the item'), 'error');
    } finally { setCatalogBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'إدارة المخزون' : 'Active Inventory'} onBack={onBack}
        right={onNavigate ? <TouchableOpacity onPress={() => onNavigate('scanner')} style={{ padding: SP.sm }}><I name="scan" size={22} color={theme.primary} /></TouchableOpacity> : undefined} />
      <View style={{ padding: 16 }}>
        {alerts.length > 0 && (
          <NCard style={{ marginBottom: 12, borderColor: theme.warn, borderWidth: 1 }}>
            <Text style={{ fontWeight: 'bold', color: theme.warn, textAlign: AR ? 'right' : 'left', marginBottom: 8 }}>
              {AR ? `تنبيهات انخفاض المخزون (${alerts.length})` : `Low-stock alerts (${alerts.length})`}
            </Text>
            {alerts.map((a) => (
              <View key={a.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.surface2 }}>
                <Text style={{ color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                  {a.name} · {AR ? `المتبقي ${a.current_stock} من حد ${a.threshold}` : `${a.current_stock} left, minimum ${a.threshold}`}
                </Text>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 8, alignItems: 'center', marginTop: 6 }}>
                  <View style={{ width: 90 }}>
                    <NInput placeholder={AR ? 'الكمية' : 'Qty'} value={restockQty[a.id] || ''} onChange={(v: string) => setRestockQty(prev => ({ ...prev, [a.id]: v }))} kbType="numeric" />
                  </View>
                  <NBtn label={AR ? 'إضافة للمخزون' : 'Restock'} size="sm" loading={alertBusy === a.id} onPress={() => restockAlert(a)} />
                  {a.status === 'open' && <NBtn label={AR ? 'تم الاطلاع' : 'Acknowledge'} size="sm" variant="outline" disabled={alertBusy === a.id} onPress={() => ackAlert(a.id)} />}
                </View>
              </View>
            ))}
          </NCard>
        )}
        <NInput placeholder={AR ? 'ابحث عن منتج...' : 'Search product...'} value={search} onChange={(v: string) => setSearch(v)} />
        <NCard style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: 'bold', color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: 8 }}>
            {AR ? 'إضافة صنف من كتالوج الأدوية' : 'Add a medicine from the catalog'}
          </Text>
          {!picked ? (
            <>
              <NInput placeholder={AR ? 'اسم الدواء (حرفان على الأقل)' : 'Medicine name (2+ letters)'} value={catalogQuery} onChange={(v: string) => setCatalogQuery(v)} />
              <NBtn label={AR ? 'بحث' : 'Search'} size="sm" loading={catalogBusy} onPress={searchCatalog} />
              {catalogResults.map((m: any) => (
                <TouchableOpacity key={m.id} onPress={() => setPicked(m)} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.surface2 }}>
                  <Text style={{ color: theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? (m.name_ar || m.name_en) : (m.name_en || m.name_ar)}</Text>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              <Text style={{ color: theme.primary, textAlign: AR ? 'right' : 'left', marginBottom: 6 }}>{AR ? (picked.name_ar || picked.name_en) : (picked.name_en || picked.name_ar)}</Text>
              <NInput placeholder={AR ? 'السعر (ر.س)' : 'Price (SAR)'} value={newPrice} onChange={(v: string) => setNewPrice(v)} kbType="decimal-pad" />
              <NInput placeholder={AR ? 'الكمية المتوفرة' : 'Stock on hand'} value={newStock} onChange={(v: string) => setNewStock(v)} kbType="numeric" />
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 8 }}>
                <NBtn label={AR ? 'إرسال للاعتماد' : 'Send for approval'} size="sm" loading={catalogBusy} onPress={addFromCatalog} />
                <NBtn label={AR ? 'إلغاء' : 'Cancel'} size="sm" variant="outline" onPress={() => setPicked(null)} />
              </View>
            </>
          )}
        </NCard>
      </View>
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : !loading && filtered.length === 0 ? (
        <Text style={{ color: theme.textSub, textAlign: 'center', marginTop: 40 }}>
          {AR ? 'لا توجد أصناف في المخزون' : 'No inventory items'}
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
                  <Text style={{ color: theme.primary, fontWeight: 'bold', textAlign: AR ? 'right' : 'left' }}>{item.price} {AR ? 'ر.س' : 'SAR'}</Text>
                  {isExpiring && (
                    <Text style={{ color: theme.warn, fontSize: 12, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                      {AR?' تنبيه صلاحية:':' Expiring soon:'}{new Date(item.expiry_date).toISOString().slice(0, 10)}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 10, color: theme.textSub }}>{AR ? 'متوفر أونلاين' : 'Online'}</Text>
                  <Switch value={item.available !== false} onValueChange={() => toggleOnline(item.id)} trackColor={{ true: theme.success }} />
                  <TouchableOpacity onPress={() => toggleCoverage(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: item.insurance_covered === true ? theme.success : theme.border, backgroundColor: item.insurance_covered === true ? theme.success : 'transparent' }} />
                    <Text style={{ fontSize: 10, color: theme.textSub }}>{AR ? 'تأمين' : 'Ins.'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, borderTopWidth: 1, borderTopColor: theme.surface2, paddingTop: 12 }}>
                <Text style={{ color: item.stock === 0 ? theme.danger : theme.textSub }}>
                  {AR ? 'المخزون الحالي: ' : 'Current Stock: '}<Text style={{ fontWeight: 'bold', color: item.stock === 0 ? theme.danger : theme.text }}>{item.stock}</Text>
                </Text>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface2, borderRadius: 8, padding: 4 }}>
                  <TouchableOpacity onPress={() => updateStock(item.id, -1)} style={{ width: 32, height: 32, backgroundColor: theme.surface, borderRadius: 4, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: theme.text, fontSize: 20 }}>-</Text>
                  </TouchableOpacity>
                  <Text style={{ fontWeight: 'bold', color: theme.text, width: 30, textAlign: 'center' }}>{item.stock}</Text>
                  <TouchableOpacity onPress={() => updateStock(item.id, 1)} style={{ width: 32, height: 32, backgroundColor: theme.primary, borderRadius: 4, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#FFF', fontSize: 20 }}>+</Text>
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
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
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
    if (q.length < 2) { show(AR ? 'اكتب حرفين على الأقل' : 'Type at least 2 letters', 'error'); return; }
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

  const lineName = (id?: string) => items.find((l) => l.order_item_id === id)?.name || (AR ? 'صنف' : 'Item');
  const outcome = (r?: string) => r === 'accepted' ? (AR ? 'قبل المريض البديل' : 'The patient accepted the substitute')
    : r === 'rejected' ? (AR ? 'رفض المريض البديل' : 'The patient rejected the substitute')
    : r === 'removed' ? (AR ? 'حذف المريض الصنف من الطلب' : 'The patient removed the item')
    : (AR ? 'أُغلقت المحادثة' : 'The chat is closed');

  if (thread) {
    const open = thread.status === 'open';
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <NHeader title={(AR ? 'محادثة: ' : 'Chat: ') + lineName(thread.order_item_id)} onBack={() => { setThread(null); setPicked(null); setResults(null); }} />
        <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.sm }}>
          {messages.length === 0 ? <NEmpty icon="chat" title={AR ? 'لا توجد رسائل بعد' : 'No messages yet'} sub={AR ? 'اكتب للمريض أو أرفق بديلاً من مخزونك' : 'Write to the patient or attach a substitute from your inventory'} /> : null}
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
                    {(AR ? 'بديل: ' : 'Substitute: ') + ((AR ? offer.name : offer.name_en || offer.name) || offer.sku || '') + (offer.price ? ` · ${offer.price} ${AR ? 'ر.س' : 'SAR'}` : '')}
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
                <Text style={{ flex: 1, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{(AR ? 'البديل المرفق: ' : 'Attached substitute: ') + (picked.name_ar || picked.name_en || picked.sku)}</Text>
                <NBtn label={AR ? 'إزالة' : 'Remove'} size="sm" variant="outline" full={false} onPress={() => setPicked(null)} />
              </View>
            ) : results ? (
              <View style={{ gap: SP.xs }}>
                {results.length === 0 ? <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{AR ? 'لا يوجد صنف متاح بهذا الاسم في مخزونك' : 'No item with this name in your inventory'}</Text> : null}
                {results.slice(0, 8).map((r: any) => (
                  <TouchableOpacity key={r.id} accessibilityRole="button" onPress={() => { setPicked(r); setResults(null); }} style={{ padding: SP.sm, borderRadius: R.sm, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
                    <Text style={{ color: theme.text, textAlign: AR ? 'right' : 'left' }}>{(AR ? r.name_ar || r.name_en : r.name_en || r.name_ar) + (r.price ? ` · ${r.price} ${AR ? 'ر.س' : 'SAR'}` : '')}</Text>
                  </TouchableOpacity>
                ))}
                <NBtn label={AR ? 'إغلاق' : 'Close'} size="sm" variant="outline" onPress={() => setResults(null)} />
              </View>
            ) : (
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
                <View style={{ flex: 1 }}><NInput placeholder={AR ? 'ابحث عن بديل في مخزونك' : 'Find a substitute in your inventory'} value={term} onChange={setTerm} /></View>
                <NBtn label={AR ? 'بحث' : 'Search'} size="sm" variant="outline" full={false} loading={busy === 'search'} onPress={search} />
              </View>
            )}
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
              <View style={{ flex: 1 }}><NInput placeholder={AR ? 'اكتب رسالة…' : 'Type a message…'} value={msg} onChange={setMsg} /></View>
              <NBtn label={AR ? 'إرسال' : 'Send'} full={false} loading={busy === 'send'} onPress={send} />
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
      <NHeader title={AR ? 'محادثة الطلب' : 'Order chat'} onBack={onBack} />
      {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: SP.lg, gap: SP.sm }}>
          <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'اختر صنفاً لتكتب للمريض عنه أو لتقترح بديلاً من مخزونك. البديل لصنف بوصفة يجب أن يكون داخل الوصفة.' : 'Pick an item to write to the patient about it or to suggest a substitute from your inventory. A substitute for a prescription item must stay inside the prescription.'}
          </Text>
          {items.length === 0 && threads.length === 0 ? <NEmpty icon="chat" title={AR ? 'لا توجد أصناف في هذا الطلب' : 'No items in this order'} /> : null}
          {items.map((line) => {
            const t = threads.find((x: any) => x.order_item_id === line.order_item_id);
            return (
              <NCard key={line.order_item_id} style={{ padding: SP.md, gap: SP.sm }}>
                <Text style={{ color: theme.text, fontWeight: FW.semi, textAlign: AR ? 'right' : 'left' }}>{line.name || (AR ? 'صنف' : 'Item')}</Text>
                {t?.last_message?.text ? <Text numberOfLines={1} style={{ color: theme.textSub, fontSize: FS.xs, textAlign: AR ? 'right' : 'left' }}>{t.last_message.text}</Text> : null}
                <NBtn label={t ? (t.status === 'open' ? (AR ? 'فتح المحادثة' : 'Open chat') : outcome(t.resolution)) : (AR ? 'بدء محادثة عن هذا الصنف' : 'Start a chat about this item')}
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
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [loading, setLoading] = useState(false);
  const [deliveryRadius, setDeliveryRadius] = useState('10');
  const [minOrder, setMinOrder] = useState('50');
  const [deliveryFee, setDeliveryFee] = useState('15');
  const [acceptsInsurance, setAcceptsInsurance] = useState(true);
  const [trackInventory, setTrackInventory] = useState(false);

  useEffect(() => {
    client.get('/provider/pharmacy/inventory-tracking').then((r: any) => {
      const v = r?.data?.inventory_tracking;
      if (typeof v === 'boolean') setTrackInventory(v);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await client.post('/provider/settings/delta', { 
        newData: { deliveryRadius, minOrder, deliveryFee, acceptsInsurance } 
      });
      show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending admin approval for changes', 'success');
      onBack();
    } catch (e) {
      show(AR ? 'فشل إرسال التعديلات' : 'Failed to submit changes', 'error');
    }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'إعدادات الصيدلية' : 'Pharmacy Settings'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.md }}>
        <NSecHeader title={AR ? 'خيارات التوصيل' : 'Delivery Options'} />
        <NCard style={{ gap: SP.md }}>
          <NInput label={AR ? 'نطاق التوصيل (كم)' : 'Delivery Radius (KM)'} value={deliveryRadius} onChange={setDeliveryRadius} kbType="numeric" />
          <NPriceInput label={AR ? 'الحد الأدنى للطلب' : 'Minimum Order'} value={minOrder} onChange={setMinOrder} />
          <NPriceInput label={AR ? 'رسوم التوصيل' : 'Delivery Fee'} value={deliveryFee} onChange={setDeliveryFee} />
        </NCard>

        <NSecHeader title={AR ? 'طرق الدفع' : 'Payment Methods'} />
        <NBtn label={AR ? 'طلبات التأمين الواردة (قرار يدوي)' : 'Inbound Insurance Requests'} variant="outline" icon="shield" onPress={() => onNavigate && onNavigate('insurance_decisions')} />
        <NCard style={{ gap: SP.md }}>
          <NToggle label={AR ? 'قبول شركات التأمين' : 'Accept Insurance'} value={acceptsInsurance} onChange={setAcceptsInsurance} />
          <NToggle label={AR ? 'تتبع أرصدة المخزون (اختياري)' : 'Track inventory balances (optional)'} value={trackInventory} onChange={async (v: boolean) => {
            setTrackInventory(v);
            try {
              await client.put('/provider/pharmacy/inventory-tracking', { inventory_tracking: v });
            } catch {
              setTrackInventory(!v);
              show(AR ? 'تعذر حفظ الإعداد' : 'Could not save setting', 'error');
            }
          }} />
          {!trackInventory ? (
            <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{AR ? 'بدون تتبع: تصرف من المتاح لديك وارفض أو اقترح بديلاً عند النفاد' : 'Untracked: dispense from what you have; reject or suggest a substitute when out'}</Text>
          ) : null}
        </NCard>

        <GlobalSystemSettings />
        <NBtn label={AR ? 'حفظ إعدادات الصيدلية' : 'Save Pharmacy Settings'} loading={loading} onPress={handleSave} style={{ marginTop: SP.lg }} />
      </ScrollView>
    </View>
  );
}
