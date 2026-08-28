/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║ NABDAH PLUS – PHASE 3 · PHARMACY DASHBOARD (ALL SCREENS) ║
 * ║ ║
 * ║ 01. PharmacyHomeTab — dashboard + live broadcast orders ║
 * ║ 02. BroadcastOrderScreen — accept/partial/reject + alternatives ║
 * ║ 03. OrderDetailScreen — full order details + item-level actions ║
 * ║ 04. PrescriptionProcessing — scan/photo rx → manual item entry ║
 * ║ 05. MedicationRefillsScreen — chronic meds auto-refill management ║
 * ║ 06. DrugPriceComparisonScreen— compare prices across pharmacies ║
 * ║ 07. InventoryManagement — stock levels + alerts + categories ║
 * ║ 08. AddProductScreen — add drug → admin approval flow ║
 * ║ 09. ExpiryTrackingScreen — track expiry dates + batch recall ║
 * ║ 10. ShortageReportScreen — report shortage → admin ║
 * ║ 11. B2BSupplyRequestScreen — Voice/OCR/Manual supplier orders ║
 * ║ 12. OrderHistoryScreen — all past orders + status + filter ║
 * ║ 13. DeliveryTrackingScreen — live delivery map + driver status ║
 * ║ 14. PharmacyQRMenuScreen — QR code for customer product catalog ║
 * ║ 15. ReviewsAndRatingsScreen — pharmacy reviews + auto-reply ║
 * ║ 16. PharmacyWalletScreen — earnings + withdrawal ║
 * ║ 17. PharmacySettingsScreen — all settings ║
 * ║ + ChronicDiseaseProgramScreen (BONUS competitive feature) ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Audio } from 'expo-av';
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
import { buildHeaders, Biometric, SK, Vault } from '../../security/Security';
import client from '../../api/client';
import { WithdrawalWorkflow, MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, ProviderWalletScreen, ProviderHomeStats, GlobalSystemSettings } from '../shared/SharedScreens';
import {
 PromotionsDashboard, CreateCampaignScreen, ProfileWebConfig,
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights,
 PharmacyBroadcastResponse, InventoryExpiryMonitor
} from '../shared/BlueprintScreens';

const { width: W } = Dimensions.get('window');

// Connected to backend APIs for pharmacy orders, inventory, history, and refills

import { 
  ReviewsAndRatingsScreen, WorkingHoursEditorScreen, SecurityManagementScreen, 
  NotificationsCenterScreen, TechnicalSupportTicketsScreen 
} from '../shared/RealScreens';
import { 
  PharmacyQRMenuScreen, ChronicDiseaseProgramScreen, DeliveryTrackingScreen, 
  MedicationRefillsScreen, DrugPriceComparisonScreen, AddProductScreen, 
  ExpiryTrackingScreen, ShortageReportScreen 
} from '../shared/RealScreensExtended';

// ══════════════════════════════════════════════════════════════════════════════
// PHARMACY DASHBOARD NAVIGATOR
// ══════════════════════════════════════════════════════════════════════════════
import { createNativeStackNavigator } from '@react-navigation/native-stack';
const Stack = createNativeStackNavigator();

export function PharmacyDashboardNavigator({ onLogout }: { onLogout:()=>void }) {
 const [activeTab, setTab] = useState('home');
 const { theme } = useTheme();
 const { lang } = useLang();
 const AR = lang === 'ar';
 const [alarmVisible, setAlarmVisible] = useState(false);

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
    { key: 'orders', icon: 'document', label: AR ? 'الطلبات' : 'Orders Hub' },
    { key: 'b2b', icon: 'activity', label: AR ? 'النواقص' : 'B2B Procurement' },
    { key: 'dispatch', icon: 'truck', label: AR ? 'التوصيل' : 'Dispatch' },
    { key: 'settings', icon: 'settings', label: AR ? 'الإعدادات' : 'Settings' },
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
                 {(activeTab === 'home' || activeTab === 'orders') && <PharmacyHomeTab onNavigate={go} onSwitchTab={setTab} />}
                 {activeTab === 'b2b' && <B2BSupplyRequestScreen onBack={() => setTab('orders')} />}
                 {activeTab === 'dispatch' && <DispatchWorkflowScreen onBack={() => setTab('orders')} onNavigate={go} />}
                 {activeTab === 'settings' && <SettingsScreen onBack={() => setTab('orders')} onNavigate={go} />}
                 <NBottomNav tabs={tabs} active={activeTab === 'home' ? 'orders' : activeTab} onPress={setTab} />
                </>
             )}
             <LiveOrderAlarmModal
               visible={alarmVisible}
               onAccept={() => { setAlarmVisible(false); go('delivery_track'); }}
               onDecline={() => setAlarmVisible(false)}
             />
           </View>
         );
       }}
     </Stack.Screen>

     <Stack.Screen name="shortage">{({ navigation }: any) => <ShortageReportScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="b2b_supply">{({ navigation }: any) => <B2BSupplyRequestScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="scanner">{({ navigation }: any) => <SmartBarcodeScannerScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="wallet">{({ navigation }: any) => <PharmacyWalletScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="withdrawal_workflow">{({ navigation }: any) => <WithdrawalWorkflow onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="order_history">{({ navigation }: any) => <OrderHistoryScreen onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="returns_rma">{({ navigation }: any) => <ReturnsRMAScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="delivery_track">{({ navigation, route }: any) => <DeliveryTrackingScreen order={route.params?.param} onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="qr_menu">{({ navigation }: any) => <PharmacyQRMenuScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="reviews">{({ navigation }: any) => <ReviewsAndRatingsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="chronic">{({ navigation }: any) => <ChronicDiseaseProgramScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="promotions">{({ navigation }: any) => <PromotionsDashboard onBack={() => navigation.goBack()} onNavigate={(s: string, p?: any) => navigation.navigate(s, { param: p })} />}</Stack.Screen>
     <Stack.Screen name="create_promo">{({ navigation }: any) => <CreateCampaignScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="web_config">{({ navigation }: any) => <ProfileWebConfig onBack={() => navigation.goBack()} />}</Stack.Screen>
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
     <Stack.Screen name="pharmacy_info">{({ navigation }: any) => <PharmacyQRMenuScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="insurance_requests">{({ navigation }: any) => <InsuranceRequestsScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="product_catalog">{({ navigation }: any) => <ActiveInventoryScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="working_hours">{({ navigation }: any) => <WorkingHoursEditorScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
     <Stack.Screen name="pricing_fees">{({ navigation }: any) => <DrugPriceComparisonScreen onBack={() => navigation.goBack()} />}</Stack.Screen>
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

function PharmacyHomeTab({ onNavigate, onSwitchTab }: any) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const { user, toggleOnline } = useAuth();
  const isOnline = !!user?.isOnline;
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const knownBroadcastIds = useRef<Set<string>>(new Set());
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Play alarm sound
  async function playAlarm() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        // Use the packaged alert asset; pharmacy-specific sonic branding remains a separate product asset.
        require('../../../assets/audio/rad_dispatch_alert.mp3')
      );
      setSound(sound);
      await sound.playAsync();
    } catch (e) {
      console.warn("Could not play alarm sound", e);
    }
  }

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
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
        auth: { token },
      });
      socket.on('connect', fetchBroadcasts);
      socket.on('pharmacy:broadcast:available', fetchBroadcasts);
      socket.on('pharmacy:broadcast:cancelled', fetchBroadcasts);
      socket.on('pharmacy:broadcast:changed', fetchBroadcasts);
    };

    fetchBroadcasts();
    connectRealtime();
    const interval = setInterval(fetchBroadcasts, 5000);
    return () => {
      disposed = true;
      clearInterval(interval);
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
      setBroadcasts(prev => prev.filter(b => b.id !== rejectOrderId));
      show(AR ? 'تم رفض الطلب' : 'Order rejected', 'info');
    } catch(e) {}
    setShowRejectModal(false);
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
                  <NBtn label={AR ? 'إنشاء عرض' : 'Create offer'} variant="secondary" style={{ flex: 2 }} onPress={() => openOfferComposer(b)} />
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

function GovernanceUnavailableScreen({ onBack, titleAr, titleEn, bodyAr, bodyEn }: any) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  return (
    <NScroll>
      <NHeader title={AR ? (titleAr || 'الميزة غير متاحة') : (titleEn || 'Feature unavailable')} onBack={onBack} />
      <NCard style={{ margin: SP.lg, borderColor: theme.border }}>
        <Text style={{ color: theme.text, fontSize: FS.md, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
          {AR ? 'هذه الوظيفة غير متاحة حالياً' : 'This function is currently unavailable'}
        </Text>
        <Text style={{ color: theme.textSub, fontSize: FS.sm, lineHeight: 24, textAlign: AR ? 'right' : 'left' }}>
          {AR ? (bodyAr || 'لا توجد عقدة خادمية مكتملة وآمنة لتشغيل هذه الوظيفة. لم يتم تنفيذ أي تغيير أو تسوية.') : (bodyEn || 'No complete, server-authoritative contract is approved for this function. No mutation or settlement was performed.')}
        </Text>
      </NCard>
    </NScroll>
  );
}

function PharmacyChatTab({ onBack }: any) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const loadThreads = async () => {
    try {
      const res = await client.get('/pharmacy/chat/threads');
      setThreads(Array.isArray(res.data) ? res.data : (res.data?.items || []));
    } catch {
      show(AR ? 'تعذر تحميل المحادثات' : 'Unable to load chats', 'error');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadThreads(); }, []);

  const openThread = async (t: any) => {
    setActive(t);
    try {
      const res = await client.get(`/pharmacy/chat/threads/${t.id}/messages`);
      setMessages(Array.isArray(res.data) ? res.data : (res.data?.items || []));
    } catch {
      show(AR ? 'تعذر تحميل الرسائل' : 'Unable to load messages', 'error');
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || !active || sending) return;
    setSending(true);
    try {
      await client.post(`/pharmacy/chat/threads/${active.id}/messages`, { text: body });
      setText('');
      await openThread(active);
    } catch {
      show(AR ? 'تعذر إرسال الرسالة' : 'Unable to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  if (active) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <NHeader title={AR ? `محادثة الطلب #${String(active.order_id || '').slice(-6)}` : `Order chat #${String(active.order_id || '').slice(-6)}`} onBack={() => setActive(null)} />
        <FlatList
          data={messages}
          keyExtractor={(m: any, i: number) => String(m.id || i)}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item: m }: any) => {
            const mine = String(m.sender_role || m.sender || '').toLowerCase().includes('pharmacy') || String(m.sender_role || '').toLowerCase() === 'provider';
            return (
              <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', backgroundColor: mine ? theme.primary : theme.surface2, borderRadius: 12, padding: 10 }}>
                <Text style={{ color: mine ? '#FFF' : theme.text, fontSize: 14 }}>{m.text || m.body}</Text>
              </View>
            );
          }}
          ListEmptyComponent={<NEmpty title={AR ? 'لا توجد رسائل بعد' : 'No messages yet'} />}
        />
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: theme.border }}>
          <View style={{ flex: 1 }}>
            <NInput placeholder={AR ? 'اكتب رسالة...' : 'Type a message...'} value={text} onChange={setText} />
          </View>
          <NBtn label={AR ? 'إرسال' : 'Send'} loading={sending} onPress={send} style={{ width: 90 }} full={false} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'المحادثات' : 'Chats'} onBack={onBack} />
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t: any, i: number) => String(t.id || i)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: t }: any) => (
            <TouchableOpacity onPress={() => openThread(t)}>
              <NCard style={{ marginBottom: 10, padding: 14 }}>
                <Text style={{ fontWeight: 'bold', color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? `محادثة الطلب #${String(t.order_id || '').slice(-6)}` : `Order chat #${String(t.order_id || '').slice(-6)}`}
                </Text>
                {!!t.last_message && (
                  <Text numberOfLines={1} style={{ color: theme.textSub, fontSize: 12, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                    {t.last_message.text || t.last_message}
                  </Text>
                )}
              </NCard>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<NEmpty title={AR ? 'لا توجد محادثات' : 'No chats'} sub={AR ? 'تظهر محادثات الطلبات هنا' : 'Order chats will appear here'} />}
        />
      )}
    </View>
  );
}
function PrescriptionProcessing({ onBack }: any) {
  return <GovernanceUnavailableScreen onBack={onBack} titleAr="صرف الوصفات الطبية" titleEn="Prescription dispensing" bodyAr="مسار الوصفة القديم متوقف. استخدم فقط العرض الخادمي المرتبط بالبث واختيار المريض؛ لا يتم عرض اسم المريض أو هاتفه أو بيانات الطلب الخام." bodyEn="The legacy prescription path is disabled. Only the server-authoritative broadcast/offer/patient-selection flow may be used; raw patient/order data is not exposed." />;
}
function B2BSupplyRequestScreen({ onBack }: any) {
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
      const res: any = await client.post('/pharmacy/procurement/analyze-file', payload);
      const items = Array.isArray(res?.items) ? res.items : [];
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
                <NBtn label={AR ? 'اختيار صورة الرف/الفاتورة وتحليلها' : 'Pick shelf/invoice photo & analyze'} onPress={() => submitB2B('ocr')} />
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
function PharmacyWalletScreen({ onBack, onNavigate }: any) {
  // Real server-backed wallet (ledger balance, transactions) + governed withdrawal flow.
  return <ProviderWalletScreen onBack={onBack} onNavigate={onNavigate} />;
}
function ReturnsRMAScreen({ onBack }: any) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const statusMeta = (s: string) => {
    const k = (s || '').toLowerCase();
    if (k === 'approved' || k === 'completed') return { label: AR ? 'مقبول' : 'Approved', variant: 'success' as any };
    if (k === 'rejected') return { label: AR ? 'مرفوض' : 'Rejected', variant: 'danger' as any };
    return { label: AR ? 'قيد المعالجة' : 'Processing', variant: 'warning' as any };
  };

  useEffect(() => {
    client.get('/pharmacy/returns/provider/list')
      .then((res: any) => setReturns(res.data || []))
      .catch(() => { setReturns([]); show(AR ? 'تعذر جلب المرتجعات' : 'Failed to load returns', 'error'); })
      .finally(() => setLoading(false));
  }, []);

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
            <NCard key={r.id || r._id} style={{ marginBottom: 12, padding: 16 }}>
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
                {AR ? 'قرار القبول/الرفض والاسترداد يتم من إدارة المنصة' : 'Approval and refund decisions are handled by platform admin'}
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
function DispatchWorkflowScreen({ onBack }: any) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const load = async () => {
    try {
      const res = await client.get('/provider/pharmacy/allocations');
      setAllocations(Array.isArray(res.data) ? res.data : []);
    } catch {
      show(AR ? 'تعذر تحميل الطلبات' : 'Unable to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const loadDetail = async (id: string) => {
    try {
      const res = await client.get(`/provider/pharmacy/allocations/${id}`);
      setDetails((prev) => ({ ...prev, [id]: res.data }));
    } catch { /* detail is best-effort; the card stays usable */ }
  };

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
    };
    const m = map[k] || { ar: st, en: st, variant: 'default' };
    return { label: AR ? m.ar : m.en, variant: m.variant };
  };

  const active = allocations.filter((a) => !['delivered', 'cancelled', 'rejected'].includes(String(a.status)));
  const done = allocations.filter((a) => ['delivered', 'cancelled', 'rejected'].includes(String(a.status)));

  const renderCard = (a: any) => {
    const meta = statusMeta(a.status);
    const d = details[a.id];
    const isCod = String(d?.order?.payment_method || '').toLowerCase() === 'cod' || d?.order?.status === 'cod_due_on_delivery';
    const expectedTotal = d?.order?.pricing_snapshot?.totals?.total ?? a.totals?.total;
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
            {['pending_review', 'partially_confirmed'].includes(String(a.status)) && (
              <NBtn label={AR ? 'تأكيد' : 'Confirm'} size="sm" loading={actionId === a.id} onPress={() => doAction(a.id, 'confirm')} />
            )}
            {String(a.status) === 'confirmed' && (
              <NBtn label={AR ? 'بدء التجهيز' : 'Start preparing'} size="sm" loading={actionId === a.id} onPress={() => doAction(a.id, 'preparing')} />
            )}
            {String(a.status) === 'preparing' && (
              <NBtn label={AR ? 'جاهز' : 'Ready'} size="sm" loading={actionId === a.id} onPress={() => doAction(a.id, 'ready')} />
            )}
            {String(a.status) === 'ready_for_pickup' && (
              <>
                <NBtn label={AR ? 'انطلاق التوصيل' : 'Dispatch'} size="sm" onPress={() => { setCourierFor(a.id); if (!details[a.id]) loadDetail(a.id); }} />
                <NBtn label={AR ? 'تسليم (استلام ذاتي)' : 'Hand over (pickup)'} size="sm" variant="outline" loading={actionId === a.id}
                  onPress={() => { if (isCod) { setCollectFor(a.id); setCollectAmount(String(expectedTotal ?? '')); } else doAction(a.id, 'delivered'); }} />
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
      <NHeader title={AR ? 'التوصيل والتسليم' : 'Dispatch & delivery'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : allocations.length === 0 ? (
          <NEmpty icon="moon" title={AR ? 'لا توجد طلبات' : 'No orders'} sub={AR ? 'ستظهر الطلبات المختارة هنا بعد اختيار المريض لعرضك' : 'Selected orders will appear here once a patient picks your offer'} />
        ) : (
          <>
            {active.length > 0 && (
              <>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: theme.text, marginBottom: 8, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? 'طلبات نشطة' : 'Active orders'}
                </Text>
                {active.map(renderCard)}
              </>
            )}
            {done.length > 0 && (
              <>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: theme.textSub, marginTop: 8, marginBottom: 8, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? 'طلبات منتهية' : 'Completed orders'}
                </Text>
                {done.slice(0, 20).map(renderCard)}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
function OrderDetailScreen({ orderId, onBack }: any) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [basket, setBasket] = useState<{id:string, name:string, requestedQty:number, price:number, available:boolean, is_substitute:boolean, substituted_from?:string}[]>([]);
  const [basketLoading, setBasketLoading] = useState(true);

  useEffect(() => {
    // Load the real allocation items for this order
    client.get('/provider/pharmacy/allocations')
      .then(res => {
        const rows = Array.isArray(res.data) ? res.data : [];
        const alloc = rows.find((a: any) => a.order_id === orderId) || rows[0];
        const items = Array.isArray(alloc?.items) ? alloc.items : [];
        setBasket(items.map((it: any) => ({
          id: it.id || it.sku,
          name: it.name || it.sku,
          requestedQty: it.qty_requested ?? it.qty_offered ?? 1,
          price: it.unit_price ?? 0,
          available: it.action !== 'unavailable',
          is_substitute: !!it.substitute_for_sku,
          substituted_from: it.substitute_for_sku || undefined,
        })));
      })
      .catch(() => setBasket([]))
      .finally(() => setBasketLoading(false));
  }, [orderId]);

  const [insuranceStatus, setInsuranceStatus] = useState('PENDING'); // PENDING | APPROVED | REJECTED
  const [copay, setCopay] = useState(0);
  
  // NPHIES Form State
  const [showNPHIES, setShowNPHIES] = useState(false);
  const [nphiesData, setNphiesData] = useState({ policyNo: '', authCode: '', copay: '' });

  // Substitute Modal State
  const [showSubModal, setShowSubModal] = useState(false);
  const [subTargetId, setSubTargetId] = useState<string|null>(null);
  const [subSearch, setSubSearch] = useState('');
  const [subResults, setSubResults] = useState<any[]>([]);
  const [subSearching, setSubSearching] = useState(false);

  useEffect(() => {
    if (!showSubModal) return;
    setSubSearching(true);
    const t = setTimeout(() => {
      client.get('/provider/inventory/search', { params: { q: subSearch } })
        .then(res => setSubResults(Array.isArray(res.data) ? res.data : []))
        .catch(() => setSubResults([]))
        .finally(() => setSubSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [subSearch, showSubModal]);

  const toggleAvailability = () => {
    show(AR ? 'لا يمكن تعديل السلة من هذه الشاشة. أنشئ عرضاً خادمياً من طلبات البث.' : 'Basket changes are not allowed here. Create a server quote from Broadcast Orders.', 'info');
  };

  const evaluateInsurance = () => {
    show(AR ? 'قرار التأمين غير متاح من شاشة السلة القديمة. لا تُدخل مبالغ أو موافقات محلياً.' : 'Insurance decisions are unavailable in the legacy basket screen; no local amount or approval is accepted.', 'info');
  };

  const applySubstitute = () => {
    setShowSubModal(false);
    show(AR ? 'اقتراح البديل متاح فقط ضمن العرض الخادمي في طلبات البث.' : 'Substitutes are available only in the server quote flow from Broadcast Orders.', 'info');
  };

  const submitBasket = () => {
    show(AR ? 'إرسال السلة القديمة معطل. يجب تقديم عرض مؤرخ، ثم يختاره المريض صراحةً.' : 'Legacy basket submission is disabled. Submit a versioned offer and wait for explicit patient selection.', 'info');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'تفاصيل الطلب: ' + orderId : 'Order Detail: ' + orderId} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        
        <NCard style={{ marginBottom: 16, borderColor: theme.warn, borderWidth: 1 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'هذه شاشة قراءة فقط' : 'This screen is read-only'}
          </Text>
          <Text style={{ color: theme.textSub, marginTop: 8, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'لا يمكن اعتماد تأمين أو تعديل سلة هنا. أنشئ عرضاً مؤرخاً من طلبات البث؛ لا يبدأ التجهيز إلا بعد اختيار المريض ودفعه أو بوابة التأمين الخادمية.' : 'Insurance approval and basket edits are unavailable here. Create a versioned offer from Broadcast Orders; fulfilment starts only after patient selection and the server payment or insurance gate.'}
          </Text>
        </NCard>

        {/* Basket Matrix */}
        <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.text, marginBottom: 12, textAlign: AR ? 'right' : 'left' }}>
          {AR ? 'مصفوفة السلة (Basket Matrix)' : 'Basket Matrix'}
        </Text>
        
        {basketLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginVertical: 24 }} />
        ) : basket.length === 0 ? (
          <Text style={{ color: theme.textSub, textAlign: 'center', marginVertical: 24 }}>
            {AR ? 'لا توجد أصناف في هذا الطلب' : 'No items in this order'}
          </Text>
        ) : basket.map((item, idx) => (
          <NCard key={item.id} style={{ marginBottom: 12, padding: 12, opacity: item.available ? 1 : 0.6 }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold', color: theme.text, textAlign: AR ? 'right' : 'left' }}>{item.name}</Text>
                <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{item.requestedQty}x • {item.price} {AR ? 'ر.س' : 'SAR'}</Text>
                {item.is_substitute && <Text style={{ color: theme.warn, fontSize: 12, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>{AR ? 'بديل عن: ' : 'Substitute for: '}{item.substituted_from}</Text>}
              </View>
              <Switch value={item.available} disabled onValueChange={toggleAvailability} trackColor={{ true: theme.success }} />
            </View>
            {!item.available && !item.is_substitute && <Text style={{ color: theme.textSub, marginTop: 8, textAlign: AR ? 'right' : 'left' }}>{AR ? 'تُقدَّم البدائل فقط ضمن العرض الخادمي.' : 'Substitutes are proposed only in the server quote flow.'}</Text>}
          </NCard>
        ))}

      </ScrollView>

      {/* Action Footer */}
      <View style={{ padding: 16, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border }}>
        <NBtn label={AR ? 'استخدم طلبات البث لتقديم عرض' : 'Use Broadcast Orders to submit an offer'} onPress={submitBasket} variant="outline" />
      </View>

      {/* Substitute Bottom Sheet Modal */}
      <Modal visible={showSubModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.bg, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: 500 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 16, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'اقتراح بديل' : 'Suggest Substitute'}
            </Text>
            <NInput placeholder={AR ? 'ابحث في المخزون...' : 'Search inventory...'} value={subSearch} onChange={(v: string) => setSubSearch(v)} />
            <ScrollView style={{ marginTop: 16 }}>
              {subSearching ? (
                <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
              ) : subResults.length === 0 ? (
                <Text style={{ color: theme.textSub, textAlign: 'center', marginTop: 24 }}>
                  {AR ? 'لا توجد أصناف مطابقة في المخزون' : 'No matching inventory items'}
                </Text>
              ) : subResults.map((sub: any, i: number) => (
                <TouchableOpacity key={sub.id || i} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }} onPress={applySubstitute}>
                  <Text style={{ color: theme.text, fontWeight: 'bold' }}>{AR ? (sub.name_ar || sub.name_en || sub.sku) : (sub.name_en || sub.name_ar || sub.sku)}</Text>
                  <Text style={{ color: theme.primary }}>{sub.price} {AR ? 'ر.س' : 'SAR'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <NBtn label={AR ? 'إلغاء' : 'Cancel'} variant="outline" onPress={() => setShowSubModal(false)} style={{ marginTop: 16 }} />
          </View>
        </View>
      </Modal>
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


function BroadcastOrderScreen({ onBack }: any) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [partialOrderId, setPartialOrderId] = useState<string | null>(null);
  const [partialAvailability, setPartialAvailability] = useState<Record<string, 'yes' | 'no'>>({});
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/provider/pharmacy/broadcasts');
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setItems(data);
    } catch (e: any) {
      setItems([]);
      show(e?.message || (AR ? 'تعذر تحميل الطلبات الحالية' : 'Could not load live orders'), 'error');
    } finally {
      setLoading(false);
    }
  }, [AR, show]);

  useEffect(() => { load(); }, [load]);

  const submitOffer = async (orderId: string, medicines: any[], availability: Record<string, 'yes' | 'no'> = {}) => {
    if (!orderId) return;
    const offerItems = medicines.map((item: any) => {
      const itemId = String(item.id || item.order_item_id || '');
      return {
        order_item_id: itemId,
        availability: availability[`${orderId}:${itemId}`] === 'no' ? 'unavailable' : 'available',
        qty_offered: Number(item.qty_requested ?? item.qty ?? item.quantity ?? 1),
        inventory_item_id: item.matched_inventory_id || item.inventory_item_id || undefined,
      };
    }).filter((item: any) => item.order_item_id);
    if (offerItems.length !== medicines.length) {
      show(AR ? 'بيانات بنود الطلب غير مكتملة؛ لا يمكن إنشاء عرض.' : 'Order item identifiers are incomplete; an offer cannot be created.', 'error');
      return;
    }
    setActingId(orderId);
    try {
      const draft = await client.post(`/provider/pharmacy/broadcasts/${orderId}/offers/draft`, { items: offerItems });
      const offerId = draft.data?.id;
      if (!offerId) throw new Error('offer_draft_id_missing');
      await client.post(`/provider/pharmacy/broadcasts/${orderId}/offers/${offerId}/submit`);
      show(AR ? 'أُرسل العرض للمريض للاختيار؛ لم يُخصص الطلب بعد.' : 'Offer sent to the patient for selection; the order is not assigned yet.', 'success');
      setPartialOrderId(null);
      setPartialAvailability({});
      await load();
    } catch (e: any) {
      show(e?.response?.data?.message || e?.message || (AR ? 'تعذر إرسال العرض' : 'Could not submit offer'), 'error');
    } finally {
      setActingId(null);
    }
  };
  const reject = async (orderId: string) => {
    if (!orderId) return;
    setActingId(orderId);
    try {
      await client.post(`/provider/pharmacy/broadcasts/${orderId}/reject`, { reason: 'provider_declined' });
      show(AR ? 'تم تسجيل رفض الطلب' : 'Order rejection recorded', 'info');
      await load();
    } catch (e: any) {
      show(e?.response?.data?.message || e?.message || (AR ? 'تعذر رفض الطلب' : 'Could not reject order'), 'error');
    } finally {
      setActingId(null);
    }
  };
  const submitPartial = async (orderId: string, medicines: any[]) => submitOffer(orderId, medicines, partialAvailability);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'طلبات البث المباشر الفورية' : 'Live Broadcast Orders'} onBack={onBack} />
      <NScroll pad>
        {loading ? <ActivityIndicator color={theme.primary} /> : items.length === 0 ? (
          <NEmpty title={AR ? 'لا توجد طلبات بث حالياً' : 'No live broadcast orders'} sub={AR ? 'ستظهر هنا الطلبات التي يوجهها النظام إلى صيدليتك.' : 'Orders routed to your pharmacy will appear here.'} />
        ) : items.map((order: any) => {
          const id = String(order.id || order.order_id || '');
          const orderId = String(order.order_id || order.order?.id || '');
          const medicines = order.items || order.order?.items || order.medicines || [];
          return (
            <NCard key={id} style={{ marginBottom: SP.sm, borderLeftWidth: 4, borderLeftColor: theme.primary }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{order.tracking_id || order.order_number || id}</Text>
                <NBadge label={AR ? 'بث حي' : 'Live Broadcast'} variant="warning" />
              </View>
              <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                {medicines.map((item: any) => item.name_ar || item.name_en || item.name || item.sku).filter(Boolean).join(', ') || (AR ? 'تفاصيل الدواء غير متاحة' : 'Medicine details unavailable')}
              </Text>
              {!orderId ? (
                <NEmpty title={AR ? 'بيانات الطلب غير مكتملة' : 'Order data is incomplete'} sub={AR ? 'لا يمكن تنفيذ قرار قبل استلام معرف الطلب من الخادم.' : 'A server order identifier is required before taking an action.'} icon="alertTriangle" />
              ) : (
                <>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.xs, marginTop: SP.sm }}>
                    <NBtn label={AR ? 'قبول كامل' : 'Accept all'} size="sm" loading={actingId === orderId} onPress={() => submitOffer(orderId, medicines)} style={{ flex: 1 }} />
                    <NBtn label={AR ? 'عرض جزئي' : 'Partial offer'} size="sm" variant="outline" disabled={actingId === orderId} onPress={() => { setPartialOrderId(orderId); setPartialAvailability({}); }} style={{ flex: 1 }} />
                    <NBtn label={AR ? 'رفض' : 'Reject'} size="sm" variant="danger" disabled={actingId === orderId} onPress={() => reject(orderId)} style={{ flex: 1 }} />
                  </View>
                  {partialOrderId === orderId && (
                    <View style={{ marginTop: SP.md, gap: SP.sm }}>
                      <Text style={{ color: theme.text, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>{AR ? 'حدد البنود المتوفرة في المخزون' : 'Select the items available in your inventory'}</Text>
                      {medicines.map((medicine: any) => {
                        const itemId = String(medicine.id || medicine.order_item_id || '');
                        const availabilityKey = `${orderId}:${itemId}`;
                        const available = partialAvailability[availabilityKey] === 'yes';
                        return (
                          <View key={itemId || medicine.sku} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: SP.sm }}>
                            <Text style={{ flex: 1, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{medicine.name_ar || medicine.name_en || medicine.name || medicine.sku || '—'}</Text>
                            <NBtn label={available ? (AR ? 'متوفر' : 'Available') : (AR ? 'غير متوفر' : 'Unavailable')} size="sm" variant={available ? 'primary' : 'outline'} onPress={() => setPartialAvailability((previous) => ({ ...previous, [availabilityKey]: available ? 'no' : 'yes' }))} />
                          </View>
                        );
                      })}
                      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
                        <NBtn label={AR ? 'إرسال العرض الجزئي' : 'Submit partial offer'} loading={actingId === orderId} onPress={() => submitPartial(orderId, medicines)} style={{ flex: 1 }} />
                        <NBtn label={AR ? 'إلغاء' : 'Cancel'} variant="outline" onPress={() => { setPartialOrderId(null); setPartialAvailability({}); }} style={{ flex: 1 }} />
                      </View>
                    </View>
                  )}
                </>
              )}
              <NBtn label={AR ? 'تحديث' : 'Refresh'} size="sm" variant="outline" onPress={load} style={{ marginTop: SP.sm }} />
            </NCard>
          );
        })}
      </NScroll>
    </View>
  );
}

function OrderHistoryScreen({ onBack }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  // Real completed/delivered orders — no demo history.
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    client.get('/provider/pharmacy/allocations', { params: { status: 'completed' } })
      .then(r => setHistory(Array.isArray(r.data) ? r.data : (r.data?.items || [])))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'سجل الطلبات السابقة' : 'Order History'} onBack={onBack} />
      <NScroll pad>
        {loading ? (
          <ActivityIndicator color={theme.primary} />
        ) : history.length === 0 ? (
          <NCard>
            <Text style={{ color: theme.textSub, textAlign: 'center' }}>{AR ? 'لا توجد طلبات مكتملة بعد.' : 'No completed orders yet.'}</Text>
          </NCard>
        ) : history.map((o: any) => {
          const oid = o.id || o._id;
          const patient = o.patient_name || o.patient || '—';
          const total = o.total ?? o.total_amount ?? 0;
          const date = o.updatedAt || o.createdAt ? new Date(o.updatedAt || o.createdAt).toISOString().slice(0, 10) : '';
          return (
          <NCard key={oid} style={{ marginBottom: SP.sm }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{patient} ({oid})</Text>
              <NBadge label={AR ? 'مكتمل' : 'Completed'} variant="success" />
            </View>
            <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
              {AR ? `الإجمالي: ${total} ر.س · التاريخ: ${date}` : `Total: ${total} SAR · Date: ${date}`}
            </Text>
          </NCard>
          );
        })}
      </NScroll>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVE INVENTORY SCREEN (Module 8)
// ══════════════════════════════════════════════════════════════════════════════
function ActiveInventoryScreen({ onBack }: any) {
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

  const persistItem = async (item: any, patch: any) => {
    try {
      await client.post('/provider/capabilities/pharmacy', { ...item, ...patch });
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
    setInventory(prev => prev.map(x => x.id === id ? { ...x, available } : x));
    persistItem(item, { available });
  };

  const itemName = (x: any) => (AR ? (x.name_ar || x.name_en || x.sku) : (x.name_en || x.name_ar || x.sku)) || '';
  const filtered = inventory.filter(x => itemName(x).toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'إدارة المخزون' : 'Active Inventory'} onBack={onBack} />
      <View style={{ padding: 16 }}>
        <NInput placeholder={AR ? 'ابحث عن منتج...' : 'Search product...'} value={search} onChange={(v: string) => setSearch(v)} />
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
// PHARMACY CHAT SCREEN (Module 10)
// ══════════════════════════════════════════════════════════════════════════════
function PharmacyChatScreen({ onBack }: any) {
  return <GovernanceUnavailableScreen onBack={onBack} titleAr="المحادثة" titleEn="Chat" bodyAr="المحادثة غير متاحة قبل اعتماد عقد الخصوصية والملكية والتدقيق." bodyEn="Chat is unavailable until its privacy, ownership, and audit contract is approved." />;
}
function SettingsScreen({ onBack, onNavigate }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [loading, setLoading] = useState(false);
  const [deliveryRadius, setDeliveryRadius] = useState('10');
  const [minOrder, setMinOrder] = useState('50');
  const [deliveryFee, setDeliveryFee] = useState('15');
  const [acceptsInsurance, setAcceptsInsurance] = useState(true);
  const [acceptsInstallments, setAcceptsInstallments] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await client.post('/provider/settings/delta', { 
        newData: { deliveryRadius, minOrder, deliveryFee, acceptsInsurance, acceptsInstallments } 
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
        <NBtn label={AR ? 'طلبات التأمين الواردة (قرار يدوي)' : 'Inbound Insurance Requests'} variant="outline" icon="shield" onPress={() => onNavigate && onNavigate('insurance_requests')} />
        <NCard style={{ gap: SP.md }}>
          <NToggle label={AR ? 'قبول شركات التأمين' : 'Accept Insurance'} value={acceptsInsurance} onChange={setAcceptsInsurance} />
          <NToggle label={AR ? 'قبول الدفع بالتقسيط (تابي/تمارا)' : 'Accept Installments (Tabby/Tamara)'} value={acceptsInstallments} onChange={setAcceptsInstallments} />
        </NCard>

        <GlobalSystemSettings />
        <NBtn label={AR ? 'حفظ إعدادات الصيدلية' : 'Save Pharmacy Settings'} loading={loading} onPress={handleSave} style={{ marginTop: SP.lg }} />
      </ScrollView>
    </View>
  );
}
