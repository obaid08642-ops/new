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
import { Audio } from 'expo-av';
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
     <Stack.Screen name="pharmacy_broadcast">{({ navigation }: any) => <PharmacyBroadcastResponse onBack={() => navigation.goBack()} />}</Stack.Screen>
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
  
  const [isOnline, setIsOnline] = useState(true);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
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

  // Simulated WebSocket connection for Live Radar (Polling fallback)
  useEffect(() => {
    if (!isOnline) return;

    const fetchBroadcasts = () => {
      client.get('/provider/pharmacy/broadcasts') // real open broadcasts for this pharmacy
        .then(res => {
          const raw = Array.isArray(res.data) ? res.data : [];
          const newOrders = raw.map((b: any) => ({
            id: b.order_id || b.order?.id || b.id,
            ...b,
            items: b.items || b.order?.items || [],
            total: b.total ?? b.order?.total,
            patient_name: b.patient_name || b.patient?.full_name,
          }));
          if (newOrders.length > broadcasts.length) playAlarm(); // Trigger alarm on new order
          setBroadcasts(newOrders);
        })
        .catch(() => {});
    };

    fetchBroadcasts();
    const interval = setInterval(fetchBroadcasts, 5000); // Poll every 5s

    return () => clearInterval(interval);
  }, [isOnline]);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectOrderId, setRejectOrderId] = useState<string|null>(null);

  const REJECT_REASONS = [
    { id: 'OUT_OF_STOCK_COMPLETELY', label: AR ? 'الكمية غير متوفرة إطلاقاً' : 'Out of stock completely' },
    { id: 'PRESCRIPTION_INVALID', label: AR ? 'الوصفة الطبية غير صالحة' : 'Invalid Prescription' },
    { id: 'INSURANCE_ISSUE', label: AR ? 'مشكلة في التغطية التأمينية' : 'Insurance Issue' },
    { id: 'OUT_OF_DELIVERY_ZONE', label: AR ? 'خارج نطاق التوصيل' : 'Out of Delivery Zone' },
    { id: 'PHARMACY_CLOSING', label: AR ? 'الصيدلية ستغلق قريباً' : 'Pharmacy closing soon' }
  ];

  const acceptOrder = async (orderId: string, isOtc?: boolean) => {
    try {
      const res = await client.post(`/provider/pharmacy/orders/${orderId}/accept`);
      if (res.data?.success) {
        show(AR ? 'تم قبول الطلب بنجاح!' : 'Order accepted successfully!', 'success');
        setBroadcasts(prev => prev.filter(b => b.id !== orderId));
        // OTC Bypass: Go straight to preparation (dispatch), else Basket Review
        if (isOtc) {
          onNavigate('dispatch', { id: orderId });
        } else {
          onNavigate('order_detail', { id: orderId });
        }
      }
    } catch (e: any) {
      show(AR ? 'الطلب أُخذ من صيدلية أخرى' : 'Order taken by another pharmacy', 'error');
      setBroadcasts(prev => prev.filter(b => b.id !== orderId));
    }
  };

  const confirmReject = async (reasonId: string) => {
    try {
      await client.post(`/pharmacy/orders/${rejectOrderId}/reject`, { reason: reasonId });
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
        <Switch value={isOnline} onValueChange={setIsOnline} trackColor={{ true: theme.primary }} />
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
                      <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.text }}>{b.patient_name || 'مريض'}</Text>
                      {b.is_otc && <NBadge label=" OTC" variant="warning" />}
                    </View>
                    <Text style={{ color: theme.textSub, fontSize: 12 }}>{b.distance} كم • منذ دقيقة</Text>
                  </View>
                  <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.primary }}>{b.total} ر.س</Text>
                </View>
                <NDivider style={{ marginBottom: 12 }} />
                <View style={{ marginBottom: 16 }}>
                  {b.items?.map((it: any, i: number) => (
                    <Text key={i} style={{ color: theme.text }}>• {it.qty}x {it.name_ar || it.name}</Text>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <NBtn label={AR ? 'رفض' : 'Reject'} variant="outline" style={{ flex: 1 }} onPress={() => { setRejectOrderId(b.id); setShowRejectModal(true); }} />
                  <NBtn label={AR ? 'قبول الطلب' : 'Accept Order'} variant="secondary" style={{ flex: 2 }} onPress={() => acceptOrder(b.id, b.is_otc)} />
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

function PharmacyChatTab() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  const insets = useSafeAreaInsets();
  const CHATS = [
    { id: '1', name: 'ياسر القحطاني', last: AR ? 'هل الدواء البديل متوفر؟' : 'Is the alternative available?', time: '12:30', unread: 1 }
  ];
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[s.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{AR ? 'الرسائل' : 'Chats'}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {CHATS.map(c => (
          <NCard key={c.id} style={{ marginBottom: 12, padding: 16 }}>
            <Text style={{ fontWeight: FW.bold, color: theme.text }}>{c.name}</Text>
            <Text style={{ color: theme.textSub }}>{c.last}</Text>
          </NCard>
        ))}
      </ScrollView>
    </View>
  );
}

function PrescriptionProcessing({ onBack }: any) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  const { show } = useToast();
  const [rxNumber, setRxNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [dispensing, setDispensing] = useState(false);
  const [order, setOrder] = useState<any>(null);

  const handleVerify = async () => {
    if (!rxNumber.trim()) return;
    setLoading(true);
    try {
      const res = await client.get(`/pharmacy/prescriptions/${encodeURIComponent(rxNumber.trim())}`);
      const data = res.data;
      if (!data || data.found === false || !Array.isArray(data.items)) {
        setOrder(null);
        show(AR ? 'لم يتم العثور على وصفة بهذا الرقم ضمن طلبات صيدليتك' : 'No prescription with this number was found in your pharmacy orders', 'error');
      } else {
        setOrder(data);
      }
    } catch (e) {
      setOrder(null);
      show(AR ? 'تعذر جلب بيانات الوصفة — تحقق من الاتصال وحاول مجدداً' : 'Could not fetch the prescription — check connection and retry', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDispense = async () => {
    if (!order?.id) return;
    setDispensing(true);
    try {
      // Real workflow: mark the order ready for pickup/delivery (dispensed)
      await client.post(`/pharmacy/orders/${order.id}/ready`);
      show(AR ? 'تم تأكيد الصرف — الطلب جاهز للتسليم' : 'Dispense confirmed — order is ready for handover', 'success');
      onBack();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (AR ? 'تعذر تأكيد الصرف — راجع حالة الطلب وحاول مجدداً' : 'Could not confirm dispense — check the order state and retry'), 'error');
    } finally {
      setDispensing(false);
    }
  };

  const totals = (() => {
    if (!order) return { subtotal: 0, covered: 0, cash: 0 };
    let covered = 0, cash = 0;
    (order.items || []).forEach((it: any) => {
      const line = Number(it.price || 0) * Number(it.qty || 1);
      if (it.isCovered) covered += line; else cash += line;
    });
    return { subtotal: Number(order.subtotal || 0), covered, cash };
  })();

  return (
    <NScroll>
      <NHeader title={AR ? 'صرف الوصفات الطبية' : 'Prescription Dispensing'} onBack={onBack} />

      {!order ? (
        <View>
          <NCard style={{ marginBottom: SP.lg }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
              {AR ? 'التحقق من الوصفة' : 'Verify Prescription'}
            </Text>
            <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
              {AR ? 'أدخل رقم الوصفة أو رقم تتبع الطلب لجلب بياناتها الحقيقية من طلبات صيدليتك.' : 'Enter the prescription number or order tracking ID to fetch its real data from your pharmacy orders.'}
            </Text>
            <NInput value={rxNumber} onChange={setRxNumber} placeholder={AR ? 'رقم الوصفة / رقم التتبع' : 'Rx / tracking number'} icon="" />
            <NBtn label={AR ? 'جلب بيانات الوصفة' : 'Fetch Prescription'} onPress={handleVerify} loading={loading} disabled={loading} style={{ marginTop: SP.md }} />
          </NCard>
        </View>
      ) : (
        <View>
          <NCard style={{ marginBottom: SP.lg, borderColor: theme.success, borderWidth: 1 }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
              <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>{order.patient_name || (AR ? 'مريض' : 'Patient')}</Text>
              <NBadge label={String(order.state || '')} variant="info" />
            </View>
            {!!order.patient_phone && (
              <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                {AR ? 'جوال المريض: ' : 'Patient phone: '}{order.patient_phone}
              </Text>
            )}
          </NCard>

          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'الأدوية الموصوفة' : 'Prescribed Medications'}
          </Text>
          {(order.items || []).map((item: any, idx: number) => (
            <NCard key={item.medicine_id || `it_${idx}`} style={{ marginBottom: SP.sm, flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? (item.name_ar || item.name_en) : (item.name_en || item.name_ar)}</Text>
                <Text style={{ color: item.isCovered ? theme.success : theme.warn, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>
                  {item.isCovered ? (AR ? 'مغطى تأمينياً' : 'Insurance Covered') : (AR ? 'غير مغطى - دفع نقدي' : 'Not Covered - Cash')}
                  {item.unavailable ? (AR ? ' · غير متوفر' : ' · Unavailable') : ''}
                </Text>
              </View>
              <Text style={{ fontWeight: FW.bold, color: theme.text }}>
                {item.qty || 1} × {Number(item.price || 0).toFixed(2)} {AR ? 'ر.س' : 'SAR'}
              </Text>
            </NCard>
          ))}

          <NCard style={{ marginTop: SP.md, marginBottom: SP.lg }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.xs }}>
              <Text style={{ color: theme.textSub }}>{AR ? 'الإجمالي الفرعي' : 'Subtotal'}</Text>
              <Text style={{ fontWeight: FW.bold, color: theme.text }}>{totals.subtotal.toFixed(2)} {AR ? 'ر.س' : 'SAR'}</Text>
            </View>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.xs }}>
              <Text style={{ color: theme.success }}>{AR ? 'يغطيه التأمين' : 'Insurance covers'}</Text>
              <Text style={{ fontWeight: FW.bold, color: theme.success }}>{totals.covered.toFixed(2)} {AR ? 'ر.س' : 'SAR'}</Text>
            </View>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.warn }}>{AR ? 'يدفعه المريض نقداً' : 'Patient pays cash'}</Text>
              <Text style={{ fontWeight: FW.bold, color: theme.warn }}>{totals.cash.toFixed(2)} {AR ? 'ر.س' : 'SAR'}</Text>
            </View>
          </NCard>

          <NBtn label={AR ? 'تأكيد الصرف (جاهز للتسليم)' : 'Confirm Dispense (Ready for Handover)'} onPress={handleDispense} loading={dispensing} disabled={dispensing} style={{ marginTop: SP.lg }} />
        </View>
      )}
    </NScroll>
  );
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
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [wallet, setWallet] = useState<{ available: number; escrow: number; dues: number; earned: number } | null>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [eodLoading, setEodLoading] = useState(false);
  const [eod, setEod] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setLoadErr(false);
    try {
      const [wRes, tRes] = await Promise.all([
        client.get('/provider/wallet'),
        client.get('/provider/wallet/transactions').catch(() => ({ data: [] })),
      ]);
      const w = wRes.data || {};
      setWallet({
        available: Number(w.available || 0),
        escrow: Number(w.escrow || 0),
        dues: Number(w.dues || 0),
        earned: Number(w.earned || 0),
      });
      setTxs(Array.isArray(tRes.data) ? tRes.data : []);
    } catch {
      setLoadErr(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleShiftReport = async () => {
    setEodLoading(true);
    try {
      const res = await client.post('/pharmacy/reports/eod');
      setEod(res.data || null);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (AR ? 'تعذر جلب تقرير الوردية — تحقق من الاتصال' : 'Could not load the shift report — check connection'), 'error');
    } finally {
      setEodLoading(false);
    }
  };

  if (loading) {
    return (
      <NScroll>
        <NHeader title={AR ? 'المحفظة والتقارير المالية' : 'Wallet & Financials'} onBack={onBack} />
        <View style={{ alignItems: 'center', paddingVertical: SP.huge }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </NScroll>
    );
  }

  if (loadErr || !wallet) {
    return (
      <NScroll>
        <NHeader title={AR ? 'المحفظة والتقارير المالية' : 'Wallet & Financials'} onBack={onBack} />
        <NEmpty
          icon="⚠️"
          title={AR ? 'تعذر تحميل بيانات المحفظة' : 'Could not load wallet data'}
          sub={AR ? 'تحقق من اتصالك بالإنترنت ثم أعد المحاولة' : 'Check your internet connection and try again'}
          actionLabel={AR ? 'إعادة المحاولة' : 'Retry'}
          onAction={load}
        />
      </NScroll>
    );
  }

  const hasDues = wallet.dues > 0;

  return (
    <NScroll>
      <NHeader title={AR ? 'المحفظة والتقارير المالية' : 'Wallet & Financials'} onBack={onBack} />

      <View style={{ backgroundColor: theme.primary, padding: SP.xl, borderRadius: R.lg, marginBottom: SP.lg, alignItems: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: FS.sm }}>{AR ? 'الرصيد القابل للسحب' : 'Withdrawable Balance'}</Text>
        <Text style={{ color: '#FFF', fontSize: 36, fontWeight: FW.bold, marginVertical: SP.sm }}>
          {wallet.available.toFixed(2)} <Text style={{ fontSize: 18 }}>{AR ? 'ر.س' : 'SAR'}</Text>
        </Text>
        <NBtn label={AR ? 'سحب الرصيد' : 'Withdraw Funds'} variant="outline" onPress={() => onNavigate('withdrawal_workflow')} style={{ marginTop: SP.md, width: 200, backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'transparent' }} />
      </View>

      <NCard style={{ marginBottom: SP.lg }}>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
          {AR ? 'ملخص المحفظة' : 'Wallet Summary'}
        </Text>
        {[
          { label: AR ? 'إجمالي الأرباح' : 'Lifetime earnings', val: wallet.earned, color: theme.success },
          { label: AR ? 'قيد التسوية (ضمان)' : 'In escrow (pending)', val: wallet.escrow, color: theme.warn },
          { label: AR ? 'مستحقات متبقية للمنصة' : 'Outstanding dues to platform', val: wallet.dues, color: hasDues ? theme.danger : theme.textSub },
        ].map((item, i) => (
          <View key={i} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm, paddingBottom: SP.sm, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color }} />
              <Text style={{ color: theme.text }}>{item.label}</Text>
            </View>
            <Text style={{ fontWeight: FW.bold, color: theme.text }}>{item.val.toFixed(2)} {AR ? 'ر.س' : 'SAR'}</Text>
          </View>
        ))}
        {hasDues && (
          <View style={{ backgroundColor: theme.danger + '20', padding: SP.md, borderRadius: R.md, marginTop: SP.sm }}>
            <Text style={{ color: theme.danger, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'المستحقات تُسوّى تلقائياً من أرباحك القادمة عند كل تسوية — لا حاجة لأي إجراء يدوي.'
                  : 'Dues are settled automatically from your future earnings at each settlement — no manual action needed.'}
            </Text>
          </View>
        )}
      </NCard>

      {txs.length > 0 && (
        <NCard style={{ marginBottom: SP.lg }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
            {AR ? 'آخر الحركات المالية' : 'Recent Transactions'}
          </Text>
          {txs.slice(0, 10).map((t: any, i: number) => (
            <View key={t.id || `tx_${i}`} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm, paddingBottom: SP.sm, borderBottomWidth: i < Math.min(txs.length, 10) - 1 ? 1 : 0, borderBottomColor: theme.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }} numberOfLines={1}>{t.title || '—'}</Text>
                <Text style={{ color: theme.textSub, fontSize: FS.xs, textAlign: AR ? 'right' : 'left' }}>{t.date || ''}</Text>
              </View>
              <Text style={{ fontWeight: FW.bold, color: t.type === 'DEBIT' ? theme.danger : theme.success }}>
                {t.type === 'DEBIT' ? '-' : '+'}{Number(t.amount || 0).toFixed(2)}
              </Text>
            </View>
          ))}
        </NCard>
      )}

      <NBtn label={AR ? 'عرض تقرير نهاية الوردية' : 'View End-of-Day Shift Report'} icon="download" variant="secondary" onPress={handleShiftReport} loading={eodLoading} disabled={eodLoading} />

      {eod && (
        <NCard style={{ marginTop: SP.lg }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
            {AR ? `تقرير وردية ${eod.date || ''}` : `Shift report ${eod.date || ''}`}
          </Text>
          {[
            { label: AR ? 'إجمالي الطلبات اليوم' : 'Orders today', val: String(eod.orders_total ?? 0) },
            { label: AR ? 'الطلبات المدفوعة' : 'Paid orders', val: String(eod.orders_paid ?? 0) },
            { label: AR ? 'إيراد اليوم' : 'Today revenue', val: `${Number(eod.revenue || 0).toFixed(2)} ${AR ? 'ر.س' : 'SAR'}` },
          ].map((row, i) => (
            <View key={i} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.xs }}>
              <Text style={{ color: theme.textSub }}>{row.label}</Text>
              <Text style={{ fontWeight: FW.bold, color: theme.text }}>{row.val}</Text>
            </View>
          ))}
        </NCard>
      )}
      <View style={{ height: SP.xxl }} />
    </NScroll>
  );
}
// ══════════════════════════════════════════════════════════════════════════════
// RETURNS RMA SCREEN (Module 9 - Patient Returns)
// ══════════════════════════════════════════════════════════════════════════════
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
function DispatchWorkflowScreen({ onBack, onNavigate }: any) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [outOrders, setOutOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        client.get('/provider/pharmacy/allocations', { params: { status: 'ready_for_pickup' } }),
        client.get('/provider/pharmacy/allocations', { params: { status: 'out_for_delivery' } }),
      ]);
      setReadyOrders(Array.isArray(r1.data) ? r1.data : []);
      setOutOrders(Array.isArray(r2.data) ? r2.data : []);
    } catch {
      setReadyOrders([]);
      setOutOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const confirmDispatch = async () => {
    if (!selected) {
      show(AR ? 'اختر طلباً جاهزاً أولاً' : 'Select a ready order first', 'warning');
      return;
    }
    if (!driverName.trim()) {
      show(AR ? 'أدخل اسم المندوب' : 'Enter driver name', 'warning');
      return;
    }
    setBusy(true);
    try {
      await client.post(`/provider/pharmacy/orders/${selected.order_id}/dispatch`, {
        driver: driverName.trim(),
        phone: driverPhone.trim(),
        delivery_mode: 'OWN',
      });
      show(AR ? 'تم خروج الطلب للتوصيل' : 'Order out for delivery', 'success');
      setSelected(null);
      setDriverName('');
      setDriverPhone('');
      fetchAll();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (AR ? 'فشل التحديث' : 'Failed to update'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelivered = async (alloc: any) => {
    setBusy(true);
    try {
      await client.post(`/provider/pharmacy/allocations/${alloc.id}/delivered`);
      show(AR ? 'تم تأكيد التوصيل بنجاح' : 'Delivery confirmed', 'success');
      fetchAll();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (AR ? 'فشل تأكيد التوصيل' : 'Could not confirm delivery'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <NScroll>
      <NHeader title={AR ? 'إدارة التوصيل والاستلام' : 'Dispatch & Delivery'} onBack={onBack} />

      <View style={{ padding: 16 }}>
        <NBtn label={AR ? 'مراجعة المرتجعات المفتوحة (RMA)' : 'Review Open Returns (RMA)'} variant="secondary" onPress={() => onNavigate('returns_rma')} style={{ marginBottom: 24 }} />

        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginVertical: 24 }} />
        ) : (
          <>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text, marginBottom: 12, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'طلبات جاهزة للخروج' : 'Ready for Dispatch'}
            </Text>
            {readyOrders.length === 0 ? (
              <NCard style={{ marginBottom: 16, padding: 16 }}>
                <Text style={{ color: theme.textSub, textAlign: 'center' }}>
                  {AR ? 'لا توجد طلبات جاهزة حالياً' : 'No orders ready right now'}
                </Text>
              </NCard>
            ) : readyOrders.map((a: any) => (
              <TouchableOpacity key={a.id} onPress={() => setSelected(a)}>
                <NCard style={{ marginBottom: 12, borderWidth: selected?.id === a.id ? 2 : 0, borderColor: theme.primary }}>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: 'bold', color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                        {AR ? 'طلب' : 'Order'} #{String(a.order_id || '').slice(0, 8)}
                      </Text>
                      <Text style={{ color: theme.textSub, fontSize: 12, textAlign: AR ? 'right' : 'left' }}>
                        {(a.items?.length || 0)} {AR ? 'صنف' : 'items'} · {a.totals?.total ?? 0} {AR ? 'ر.س' : 'SAR'}
                      </Text>
                    </View>
                    <NBadge label={AR ? 'جاهز' : 'Ready'} variant="success" size="xs" />
                  </View>
                </NCard>
              </TouchableOpacity>
            ))}

            {selected && (
              <NCard style={{ marginBottom: 16, borderColor: theme.primary, borderWidth: 1 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text, marginBottom: 12, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? `خروج الطلب: #${String(selected.order_id || '').slice(0, 8)}` : `Dispatch Order: #${String(selected.order_id || '').slice(0, 8)}`}
                </Text>
                <View style={{ gap: 12 }}>
                  <NInput label={AR ? 'اسم المندوب' : 'Driver Name'} value={driverName} onChange={(v: string) => setDriverName(v)} />
                  <NInput label={AR ? 'رقم الهاتف' : 'Driver Phone'} value={driverPhone} onChange={(v: string) => setDriverPhone(v)} kbType="phone-pad" />
                  <NBtn label={busy ? (AR ? 'جاري التأكيد...' : 'Confirming...') : (AR ? 'تأكيد الخروج للتوصيل' : 'Confirm Dispatch')} onPress={confirmDispatch} disabled={busy} style={{ marginTop: 8 }} />
                </View>
              </NCard>
            )}

            <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text, marginBottom: 12, marginTop: 8, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'قيد التوصيل' : 'Out for Delivery'}
            </Text>
            {outOrders.length === 0 ? (
              <NCard style={{ marginBottom: 16, padding: 16 }}>
                <Text style={{ color: theme.textSub, textAlign: 'center' }}>
                  {AR ? 'لا توجد شحنات في الطريق' : 'No active deliveries'}
                </Text>
              </NCard>
            ) : outOrders.map((a: any) => (
              <NCard key={a.id} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontWeight: 'bold', color: theme.text }}>
                    {AR ? 'طلب' : 'Order'} #{String(a.order_id || '').slice(0, 8)}
                  </Text>
                  <NBadge label={AR ? 'في الطريق' : 'En route'} variant="info" size="xs" />
                </View>
                {a.delivery?.courier_name ? (
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center', marginBottom: 12 }}>
                    <NAvatar name={a.delivery.courier_name} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>{a.delivery.courier_name}</Text>
                      <Text style={{ color: theme.textSub, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>{a.delivery?.courier_phone || ''}</Text>
                    </View>
                    {!!a.delivery?.courier_phone && (
                      <TouchableOpacity onPress={() => Linking.openURL(`tel:${a.delivery.courier_phone}`)} style={{ padding: SP.sm, backgroundColor: theme.primaryLight, borderRadius: 20 }}>
                        <I name="phone" size={20} color={theme.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}
                <NBtn label={AR ? 'تأكيد تم التوصيل' : 'Confirm Delivered'} size="sm" disabled={busy} onPress={() => confirmDelivered(a)} />
              </NCard>
            ))}
          </>
        )}
      </View>
    </NScroll>
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

  const toggleAvailability = (id: string) => {
    setBasket(prev => prev.map(item => item.id === id ? { ...item, available: !item.available } : item));
  };

  const evaluateInsurance = async () => {
    if (!nphiesData.policyNo || !nphiesData.authCode) {
      show(AR ? 'يرجى إدخال رقم البوليصة وكود التفويض' : 'Please enter Policy No and Auth Code', 'error');
      return;
    }
    try {
      const res = await client.post(`/provider/pharmacy/orders/${orderId}/insurance`, { policyNo: nphiesData.policyNo, authCode: nphiesData.authCode, copay: Number(nphiesData.copay) || 0, status: 'APPROVED' });
      const realCopay = Number(res.data?.insurance_copay) || 0;
      setInsuranceStatus('APPROVED');
      setCopay(realCopay);
      setShowNPHIES(false);
      show(AR ? `تم تسجيل قرار التأمين — التحمل: ${realCopay} ريال` : `Insurance recorded — Copay: ${realCopay}`, 'success');
    } catch (e) {
      show(AR ? 'تعذر تسجيل قرار التأمين' : 'Could not record insurance decision', 'error');
    }
  };

  const applySubstitute = (subName: string, subPrice: number) => {
    setBasket(prev => prev.map(item => {
      if (item.id === subTargetId) {
        return { ...item, name: subName, price: subPrice, available: true, is_substitute: true, substituted_from: item.name };
      }
      return item;
    }));
    setShowSubModal(false);
    show(AR ? 'تمت إضافة البديل' : 'Substitute added', 'success');
  };

  const submitBasket = async () => {
    try {
      await client.post(`/provider/pharmacy/orders/${orderId}/submit-basket`, { basket, insuranceStatus, copay });
      show(AR ? 'تم إرسال السلة للمريض للمراجعة' : 'Basket sent to patient for review', 'success');
      onBack();
    } catch (e) {
      show(AR ? 'حدث خطأ' : 'Error submitting basket', 'error');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'تفاصيل الطلب: ' + orderId : 'Order Detail: ' + orderId} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        
        {/* NPHIES Insurance Gateway */}
        <NCard style={{ marginBottom: 16, borderColor: insuranceStatus === 'APPROVED' ? theme.success : theme.border, borderWidth: 2 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.text, marginBottom: 8, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'بوابة التأمين (NPHIES)' : 'NPHIES Insurance Gateway'}
          </Text>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: theme.textSub }}>{AR ? 'حالة التأمين:' : 'Status:'} <Text style={{ fontWeight: 'bold', color: insuranceStatus === 'APPROVED' ? theme.success : theme.warn }}>{insuranceStatus}</Text></Text>
              {insuranceStatus === 'APPROVED' && <Text style={{ color: theme.text, marginTop: 4 }}>{AR ? 'مبلغ التحمل (Co-Pay):' : 'Co-Pay:'} {copay} {AR ? 'ر.س' : 'SAR'}</Text>}
            </View>
            {insuranceStatus !== 'APPROVED' && (
              <NBtn label={AR ? 'إدخال بيانات NPHIES' : 'Enter NPHIES Data'} onPress={() => setShowNPHIES(!showNPHIES)} size="sm" />
            )}
          </View>
          {showNPHIES && insuranceStatus !== 'APPROVED' && (
            <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16, gap: 12 }}>
              <NInput label={AR ? 'رقم البوليصة (Policy No)' : 'Policy No'} value={nphiesData.policyNo} onChange={(v: string) => setNphiesData({...nphiesData, policyNo: v})} />
              <NInput label={AR ? 'كود التفويض (Auth Code)' : 'Auth Code'} value={nphiesData.authCode} onChange={(v: string) => setNphiesData({...nphiesData, authCode: v})} />
              <NInput label={AR ? 'مبلغ تحمل المريض (Co-Pay)' : 'Patient Co-Pay'} value={nphiesData.copay} onChange={(v: string) => setNphiesData({...nphiesData, copay: v})} kbType="numeric" />
              <NBtn label={AR ? 'تحقق من الأهلية واعتماد' : 'Verify & Approve'} onPress={evaluateInsurance} />
            </View>
          )}
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
              <Switch value={item.available} onValueChange={() => toggleAvailability(item.id)} trackColor={{ true: theme.success }} />
            </View>
            {!item.available && !item.is_substitute && (
              <View style={{ marginTop: 12 }}>
                <NBtn label={AR ? 'اقتراح بديل للمريض' : 'Suggest Substitute'} variant="outline" size="sm" onPress={() => { setSubTargetId(item.id); setShowSubModal(true); }} />
              </View>
            )}
          </NCard>
        ))}

      </ScrollView>

      {/* Action Footer */}
      <View style={{ padding: 16, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border }}>
        <NBtn label={AR ? 'اعتماد السلة وإرسالها للمريض' : 'Submit Basket to Patient'} onPress={submitBasket} />
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
                <TouchableOpacity key={sub.id || i} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }} onPress={() => applySubstitute(AR ? (sub.name_ar || sub.name_en || sub.sku) : (sub.name_en || sub.name_ar || sub.sku), Number(sub.price) || 0)}>
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

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <NHeader title={AR ? 'الماسح الضوئي الذكي' : 'Smart Barcode Scanner'} onBack={onBack} />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 250, height: 250, borderWidth: 2, borderColor: theme.primary, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <Text style={{ color: '#FFF', textAlign: 'center', opacity: 0.8 }}>
            {AR ? 'قم بتوجيه الكاميرا نحو الباركود...' : 'Point camera at barcode...'}
          </Text>
        </View>
        <Text style={{ color: '#FFF', marginTop: SP.xl, fontSize: FS.sm, textAlign: 'center', paddingHorizontal: SP.xl }}>
          {AR ? 'يُستخدم لتسجيل المخزون، التأكد من صحة التغليف، وصرف الوصفات الطبية.' : 'Used for inventory logging, packing verification, and dispensing prescriptions.'}
        </Text>
      </View>
      <View style={{ padding: SP.xl, paddingBottom: SP.xxl, backgroundColor: '#111' }}>
        <NBtn
          label={AR ? 'الماسح غير متاح حالياً' : 'Scanner unavailable'}
          variant="outline"
          onPress={() => {}}
          disabled
        />
        <Text style={{ color: '#AAA', textAlign: 'center', marginTop: SP.sm, fontSize: FS.xs }}>
          {AR ? 'لن يتم اعتماد دواء أو مخزون دون تكامل كاميرا/باركود فعلي.' : 'No medicine or inventory is confirmed without a real camera/barcode integration.'}
        </Text>
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

  const accept = async (orderId: string) => {
    setActingId(orderId);
    try {
      await client.post(`/provider/pharmacy/orders/${orderId}/accept`);
      show(AR ? 'تم قبول الطلب من الخادم' : 'Order accepted by the server', 'success');
      await load();
    } catch (e: any) {
      show(e?.message || (AR ? 'تعذر قبول الطلب' : 'Could not accept order'), 'error');
    } finally {
      setActingId(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'طلبات البث المباشر الفورية' : 'Live Broadcast Orders'} onBack={onBack} />
      <NScroll pad>
        {loading ? <ActivityIndicator color={theme.primary} /> : items.length === 0 ? (
          <NEmpty title={AR ? 'لا توجد طلبات بث حالياً' : 'No live broadcast orders'} sub={AR ? 'ستظهر هنا الطلبات التي يوجهها النظام إلى صيدليتك.' : 'Orders routed to your pharmacy will appear here.'} />
        ) : items.map((order: any) => {
          const id = String(order.id || order.order_id || '');
          const medicines = order.items || order.medicines || [];
          return (
            <NCard key={id} style={{ marginBottom: SP.sm, borderLeftWidth: 4, borderLeftColor: theme.primary }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{order.tracking_id || order.order_number || id}</Text>
                <NBadge label={AR ? 'بث حي' : 'Live Broadcast'} variant="warning" />
              </View>
              <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                {medicines.map((item: any) => item.name_ar || item.name_en || item.name || item.sku).filter(Boolean).join(', ') || (AR ? 'تفاصيل الدواء غير متاحة' : 'Medicine details unavailable')}
              </Text>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.xs, marginTop: SP.sm }}>
                <NBtn label={AR ? 'قبول الطلب' : 'Accept Order'} size="sm" loading={actingId === id} onPress={() => accept(id)} style={{ flex: 1 }} />
                <NBtn label={AR ? 'تحديث' : 'Refresh'} size="sm" variant="outline" onPress={load} />
              </View>
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
    client.get('/provider/pharmacy/orders', { params: { status: 'completed' } })
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
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [threads, setThreads] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async (threadId: string) => {
    try {
      const res = await client.get(`/pharmacy/chat/threads/${threadId}/messages`);
      setMsgs(Array.isArray(res.data?.messages) ? res.data.messages : []);
    } catch {
      setMsgs([]);
    }
  }, []);

  useEffect(() => {
    client.get('/pharmacy/chat/threads')
      .then(res => {
        const rows = Array.isArray(res.data) ? res.data : [];
        setThreads(rows);
        if (rows[0]) {
          setActiveThread(rows[0]);
          loadMessages(rows[0].id);
        }
      })
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, [loadMessages]);

  const send = async () => {
    if (!input.trim() || !activeThread) return;
    setSending(true);
    try {
      await client.post(`/pharmacy/chat/threads/${activeThread.id}/messages`, { text: input.trim() });
      setInput('');
      loadMessages(activeThread.id);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (AR ? 'تعذر إرسال الرسالة' : 'Could not send message'), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'محادثة المريض' : 'Patient Chat'} onBack={onBack} />
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : threads.length === 0 ? (
        <Text style={{ color: theme.textSub, textAlign: 'center', marginTop: 40 }}>
          {AR ? 'لا توجد محادثات' : 'No conversations'}
        </Text>
      ) : (
        <>
          {threads.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, padding: 8 }}>
              {threads.map((t: any) => (
                <TouchableOpacity key={t.id} onPress={() => { setActiveThread(t); loadMessages(t.id); }}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginHorizontal: 4, borderWidth: 1, borderColor: activeThread?.id === t.id ? theme.primary : theme.border, backgroundColor: activeThread?.id === t.id ? theme.primaryLight : theme.surface }}>
                  <Text style={{ color: activeThread?.id === t.id ? theme.primary : theme.textSub, fontSize: 12 }}>
                    {AR ? 'طلب' : 'Order'} #{String(t.order_id || t.id).slice(0, 6)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <FlatList
            data={msgs}
            keyExtractor={x => x.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
            renderItem={({ item }) => {
              const byPatient = item.sender_role === 'patient';
              return (
                <View style={{ alignSelf: byPatient ? (AR ? 'flex-end' : 'flex-start') : (AR ? 'flex-start' : 'flex-end'), backgroundColor: byPatient ? theme.surface2 : theme.primaryLight, padding: 12, borderRadius: 12, marginBottom: 8, maxWidth: '80%' }}>
                  <Text style={{ color: theme.text }}>{item.text}</Text>
                </View>
              );
            }}
          />
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', padding: 12, borderTopWidth: 1, borderTopColor: theme.border, alignItems: 'center', gap: 8 }}>
            <TextInput
              placeholder={AR ? 'اكتب رسالة...' : 'Type a message...'}
              placeholderTextColor={theme.textSub}
              value={input}
              onChangeText={setInput}
              style={{ flex: 1, backgroundColor: theme.surface, color: theme.text, borderRadius: 20, paddingHorizontal: 16, height: 40, textAlign: AR ? 'right' : 'left' }}
            />
            <TouchableOpacity style={{ padding: 10, backgroundColor: theme.primary, borderRadius: 20, opacity: sending ? 0.5 : 1 }} onPress={send} disabled={sending}>
              <I name="upload" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </>
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
