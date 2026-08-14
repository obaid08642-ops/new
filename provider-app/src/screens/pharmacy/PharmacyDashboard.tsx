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
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Switch, RefreshControl, Modal, TextInput
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
import { buildHeaders, Biometric, SK, Vault } from '../../security/Security';
import client from '../../api/client';
import { WithdrawalWorkflow, MedicalJobsScreen, MedicalDrugIndexScreen, InsuranceConfigScreen, CertificatesConfigScreen, MediaConfigScreen, FeatureUnderDevelopmentScreen, ProviderWalletScreen, ProviderHomeStats, GlobalSystemSettings } from '../shared/SharedScreens';
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
                 {activeTab === 'settings' && <SettingsScreen onBack={() => setTab('orders')} />}
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
        require('../../../assets/sounds/radar-alarm.mp3') // Assume this exists or will fail gracefully
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

  // Poll the persisted provider inbox until a realtime contract is configured.
  useEffect(() => {
    if (!isOnline) return;

    const fetchBroadcasts = () => {
      client.get('/provider/pharmacy/orders/incoming')
        .then(res => {
          const newOrders = res.data || [];
          setBroadcasts(previousOrders => {
            if (newOrders.length > previousOrders.length) void playAlarm();
            return newOrders;
          });
        })
        .catch(() => setBroadcasts([]));
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
      if (!rejectOrderId) throw new Error('order_id_missing');
      await client.post(`/provider/pharmacy/orders/${rejectOrderId}/reject`, { reason: reasonId });
      setBroadcasts(prev => prev.filter(b => b.id !== rejectOrderId));
      show(AR ? 'تم رفض الطلب' : 'Order rejected', 'info');
    } catch(e) {
      show(AR ? 'تعذر رفض الطلب. لم تتغير حالته.' : 'The order could not be rejected; its status did not change.', 'error');
    }
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
            {isOnline ? (AR ? '🟢 متصل - جاهز لاستقبال الطلبات' : '🟢 Online - Ready') : (AR ? '⚪ غير متصل' : '⚪ Offline')}
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
                      <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.text }}>{b.patient_name || (AR ? 'بيانات المريض محمية' : 'Patient details protected')}</Text>
                      {b.is_otc && <NBadge label="🛒 OTC" variant="warning" />}
                    </View>
                    <Text style={{ color: theme.textSub, fontSize: 12 }}>{typeof b.distance === 'number' ? `${b.distance} ${AR ? 'كم' : 'km'}` : (AR ? 'المسافة غير متاحة' : 'Distance unavailable')}</Text>
                  </View>
                  <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.primary }}>{b.total == null ? '—' : `${b.total} ${AR ? 'ر.س' : 'SAR'}`}</Text>
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
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[s.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{AR ? 'الرسائل' : 'Chats'}</Text>
      </View>
      <NEmpty icon="chat" title={AR ? 'لا توجد محادثات حالياً' : 'No chats yet'} sub={AR ? 'ستظهر المحادثات عند تهيئة خدمة رسائل مرتبطة بطلب فعلي.' : 'Chats will appear when a persisted order-messaging service is configured.'} />
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
  const [rxDetails, setRxDetails] = useState<any>(null);

  const handleScanQR = () => {
    show(AR ? 'جاري فتح الكاميرا...' : 'Opening camera...', 'info');
  };

  const handleVerify = async () => {
    if (!rxNumber) return;
    setLoading(true);
    try {
      const res = await client.get(`/pharmacy/prescriptions/${rxNumber}`);
      setRxDetails(res.data);
      setLoading(false);
    } catch(e) {
      setLoading(false);
      show(AR ? 'الوصفة غير موجودة' : 'Prescription not found', 'error');
    }
  };

  const calculateTotals = () => {
    if (!rxDetails) return { subtotal: 0, copay: 0, patientPays: 0, insurancePays: 0 };
    let subtotal = 0;
    let patientPays = 0;
    let insurancePays = 0;

    rxDetails.items.forEach((item: any) => {
      subtotal += item.price;
      if (item.covered) {
        const copay = item.price * (rxDetails.copayPercentage / 100);
        patientPays += copay;
        insurancePays += (item.price - copay);
      } else {
        patientPays += item.price;
      }
    });

    return { subtotal, copay: rxDetails.copayPercentage, patientPays, insurancePays };
  };

  const handleDispense = async () => {
    try {
      await client.post(`/insurance/claims/submit`, { rxNumber, items: rxDetails.items });
    } catch(e) {}
    show(AR ? 'تم صرف الوصفة بنجاح ورفع المطالبة التأمينية' : 'Dispensed and claim submitted', 'success');
    onBack();
  };

  const totals = calculateTotals();

  return (
    <NScroll>
      <NHeader title={AR ? 'صرف الوصفات الطبية' : 'Prescription Dispensing'} onBack={onBack} />
      
      {!rxDetails ? (
        <View>
          <NCard style={{ marginBottom: SP.lg }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
              {AR ? 'التحقق من الوصفة' : 'Verify Prescription'}
            </Text>
            <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
              {AR ? 'قم بمسح رمز QR من جوال المريض أو أدخل رقم الوصفة للتحقق من التغطية التأمينية.' : 'Scan QR code from patient phone or enter Rx number to verify insurance coverage.'}
            </Text>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
              <View style={{ flex: 1 }}>
                <NInput value={rxNumber} onChange={setRxNumber} placeholder={AR ? 'رقم الوصفة (RX-...)' : 'Rx Number (RX-...)'} icon="" />
              </View>
              <TouchableOpacity onPress={handleScanQR} style={{ backgroundColor: theme.primaryLight, paddingHorizontal: SP.md, borderRadius: R.md, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24 }}>📷</Text>
              </TouchableOpacity>
            </View>
            <NBtn label={AR ? 'جلب بيانات الوصفة' : 'Fetch Prescription'} onPress={handleVerify} loading={loading} style={{ marginTop: SP.md }} />
          </NCard>
        </View>
      ) : (
        <View>
          <NCard style={{ marginBottom: SP.lg, borderColor: theme.success, borderWidth: 1 }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
              <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>{rxDetails.patientName}</Text>
              <NBadge label={rxDetails.insurance} variant="success" />
            </View>
            <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'طبيب المعالجة:' : 'Treating Doctor:'} {rxDetails.doctorName}
            </Text>
          </NCard>

          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'الأدوية الموصوفة' : 'Prescribed Medications'}
          </Text>
          {rxDetails.items.map((item: any) => (
            <NCard key={item.id} style={{ marginBottom: SP.sm, flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{item.name}</Text>
                <Text style={{ color: item.covered ? theme.success : theme.warn, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>
                  {item.covered ? (AR ? 'مغطى تأمينياً' : 'Insurance Covered') : (AR ? 'غير مغطى - دفع نقدي' : 'Not Covered - Cash')}
                </Text>
              </View>
              <Text style={{ fontWeight: FW.bold, color: theme.text }}>{item.price} {AR ? 'ريال' : 'SAR'}</Text>
            </NCard>
          ))}

          <NCard style={{ marginTop: SP.xl, backgroundColor: theme.surface2 }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.xs }}>
              <Text style={{ color: theme.textSub }}>{AR ? 'إجمالي الأدوية:' : 'Subtotal:'}</Text>
              <Text style={{ color: theme.text }}>{totals.subtotal} {AR ? 'ريال' : 'SAR'}</Text>
            </View>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.xs }}>
              <Text style={{ color: theme.success }}>{AR ? 'تغطية التأمين:' : 'Insurance Covers:'}</Text>
              <Text style={{ color: theme.success }}>- {totals.insurancePays} {AR ? 'ريال' : 'SAR'}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: theme.border, marginVertical: SP.sm }} />
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>{AR ? 'المطلوب من المريض:' : 'Patient Pays:'}</Text>
              <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.primary }}>{totals.patientPays} {AR ? 'ريال' : 'SAR'}</Text>
            </View>
          </NCard>

          <NBtn label={AR ? 'صرف الوصفة ورفع المطالبة' : 'Dispense & Submit Claim'} onPress={handleDispense} style={{ marginTop: SP.lg }} />
          <NBtn label={AR ? 'إلغاء' : 'Cancel'} variant="outline" onPress={() => setRxDetails(null)} style={{ marginTop: SP.md }} />
        </View>
      )}
    </NScroll>
  );
}
// ══════════════════════════════════════════════════════════════════════════════
// B2B PROCUREMENT & RETURNS MANAGER (Phase 5)
// ══════════════════════════════════════════════════════════════════════════════
function B2BSupplyRequestScreen({ onBack }: any) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [mode, setMode] = useState<'b2b'|'returns'>('b2b');
  const [b2bText, setB2bText] = useState('');

  const [b2bTab, setB2bTab] = useState<'manual'|'voice'|'ocr'>('manual');
  const [isRecording, setIsRecording] = useState(false);

  const submitB2B = async (method: string) => {
    if (method !== 'manual' || !b2bText.trim()) {
      show(AR ? 'يتطلب هذا المسار نص طلب فعلياً. رفع الصوت والصورة غير مهيأ بعد بعقد تخزين ومعالجة.' : 'This flow requires an actual text request. Audio and image ingestion are not configured with a storage and processing contract.', 'error');
      return;
    }
    try {
      await client.post('/provider/pharmacy/b2b/voice-to-order', { 
        method,
        query: b2bText.trim()
      });
      show(AR ? 'تم إرسال طلب التوريد بنجاح! سيقوم الذكاء الاصطناعي بتحليله.' : 'B2B order sent! AI is processing it.', 'success');
      setB2bText('');
      setIsRecording(false);
    } catch (e) {
      show(AR ? 'فشل إرسال الطلب' : 'Failed to send B2B order', 'error');
    }
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
                  <Text style={{ fontSize: 48 }}>{isRecording ? '🎙️' : '🎤'}</Text>
                </View>
                {isRecording && <Text style={{ color: theme.danger, fontWeight: 'bold', marginBottom: 16 }}>00:14</Text>}
                {!isRecording ? (
                  <NBtn label={AR ? 'بدء التسجيل' : 'Start Recording'} onPress={() => submitB2B('voice')} />
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
                  <Text style={{ fontSize: 40, marginBottom: 8 }}>📷</Text>
                  <Text style={{ color: theme.textSub, textAlign: 'center', paddingHorizontal: 16 }}>
                    {AR ? 'قم بتوجيه الكاميرا نحو الرف أو الفاتورة لاستخراج النواقص تلقائياً' : 'Point camera at shelf or invoice to extract shortages automatically'}
                  </Text>
                </View>
                <NBtn label={AR ? 'التقاط وإرسال (OCR)' : 'Capture & Extract'} onPress={() => submitB2B('ocr')} />
              </View>
            )}

          </NCard>
        ) : (
          <NCard>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'إدارة المرتجعات (الأدوية منتهية الصلاحية)' : 'Returns Manager (Expired Meds)'}
            </Text>
            <NEmpty icon="inventory" title={AR ? 'لا توجد مرتجعات مثبتة' : 'No persisted returns'} sub={AR ? 'ستظهر المرتجعات عند توفير عقد مخزون وطلبات استرجاع مخزن.' : 'Returns will appear after a persisted inventory and return-request contract is configured.'} />
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

  const walletData: any = null;
  if (!walletData) {
    return (
      <NScroll>
        <NHeader title={AR ? 'المحفظة والتقارير المالية' : 'Wallet & Financials'} onBack={onBack} />
        <NEmpty icon="account_balance_wallet" title={AR ? 'المحفظة غير متاحة حالياً' : 'Wallet unavailable'} sub={AR ? 'أُزيلت الأرصدة والأرقام التجريبية. يتطلب العرض والسحب وتصدير التقارير عقد محفظة مالي مخزن ومزوّد دفع مهيأ.' : 'Sample balances were removed. Display, withdrawals, and report export require a persisted financial-wallet contract and configured payment provider.'} />
      </NScroll>
    );
  }
  const isSuspended = walletData.duesToApp >= walletData.autoSuspendThreshold;
  const isWarning = walletData.duesToApp >= (walletData.autoSuspendThreshold * 0.8) && !isSuspended;

  const handleExportShiftReport = async () => {
    try {
      await client.post('/pharmacy/reports/eod');
      show(AR ? 'تم طلب تقرير الوردية' : 'Shift report request submitted', 'success');
    } catch(e) {
      show(AR ? 'تعذر تصدير تقرير الوردية' : 'Unable to export shift report', 'error');
    }
  };

  return (
    <NScroll>
      <NHeader title={AR ? 'المحفظة والتقارير المالية' : 'Wallet & Financials'} onBack={onBack} />
      
      <View style={{ backgroundColor: theme.primary, padding: SP.xl, borderRadius: R.lg, marginBottom: SP.lg, alignItems: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: FS.sm }}>{AR ? 'الرصيد القابل للسحب' : 'Withdrawable Balance'}</Text>
        <Text style={{ color: '#FFF', fontSize: 36, fontWeight: FW.bold, marginVertical: SP.sm }}>{walletData.withdrawable} <Text style={{ fontSize: 18 }}>{AR ? 'ر.س' : 'SAR'}</Text></Text>
        <NBtn label={AR ? 'سحب الرصيد' : 'Withdraw Funds'} variant="outline" onPress={() => onNavigate('withdrawal_workflow')} style={{ marginTop: SP.md, width: 200, backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'transparent' }} />
      </View>

      {/* Dues & Auto-Suspend Logic */}
      <NCard style={{ marginBottom: SP.lg, borderColor: isSuspended ? theme.danger : (isWarning ? theme.warn : theme.border), borderWidth: isSuspended || isWarning ? 2 : 1 }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
            {AR ? 'مستحقات التطبيق (عمولات الدفع عند الاستلام)' : 'Dues to App (COD Commissions)'}
          </Text>
          <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: isSuspended ? theme.danger : theme.text }}>
            {walletData.duesToApp} / {walletData.autoSuspendThreshold} {AR ? 'ر.س' : 'SAR'}
          </Text>
        </View>
        <View style={{ height: 8, backgroundColor: theme.surface2, borderRadius: 4, overflow: 'hidden', marginBottom: SP.md }}>
          <View style={{ height: '100%', width: `${Math.min((walletData.duesToApp / walletData.autoSuspendThreshold) * 100, 100)}%`, backgroundColor: isSuspended ? theme.danger : (isWarning ? theme.warn : theme.success) }} />
        </View>
        
        {isSuspended && (
          <View style={{ backgroundColor: theme.danger + '20', padding: SP.md, borderRadius: R.md, marginBottom: SP.md }}>
            <Text style={{ color: theme.danger, fontWeight: 'bold', textAlign: AR ? 'right' : 'left' }}>
              {AR ? '⚠️ حسابك معلق! لقد تجاوزت الحد الائتماني المسموح به.' : '⚠️ Account Suspended! Credit limit exceeded.'}
            </Text>
            <Text style={{ color: theme.danger, marginTop: 4, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'يرجى سداد المستحقات فوراً لإعادة تفعيل الحساب واستقبال الطلبات.' : 'Please pay your dues immediately to reactivate the account and receive orders.'}
            </Text>
          </View>
        )}

        {isWarning && (
          <View style={{ backgroundColor: theme.warn + '20', padding: SP.md, borderRadius: R.md, marginBottom: SP.md }}>
            <Text style={{ color: theme.warn, fontWeight: 'bold', textAlign: AR ? 'right' : 'left' }}>
              {AR ? '⚠️ تحذير: اقتربت من الحد الائتماني!' : '⚠️ Warning: Approaching credit limit!'}
            </Text>
          </View>
        )}

        <NBtn label={AR ? 'سداد المستحقات الآن' : 'Pay Dues Now'} variant={isSuspended ? 'outline' : 'secondary'} onPress={() => show(AR ? 'جاري تحويلك لبوابة الدفع...' : 'Redirecting to payment gateway...', 'info')} />
      </NCard>

      <NCard style={{ marginBottom: SP.lg }}>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
          {AR ? 'تقسيم المبيعات اليومية' : 'Daily Sales Breakdown'}
        </Text>
        
        {[
          { label: AR ? 'مدفوعات إلكترونية (بطاقات)' : 'Online Payments', val: walletData.online, color: theme.primary },
          { label: AR ? 'الدفع عند الاستلام (COD)' : 'Cash on Delivery (COD)', val: walletData.cod, color: theme.warn },
          { label: AR ? 'مطالبات التأمين' : 'Insurance Claims', val: walletData.insurance, color: theme.success },
        ].map((item, i) => (
          <View key={i} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm, paddingBottom: SP.sm, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color }} />
              <Text style={{ color: theme.text }}>{item.label}</Text>
            </View>
            <Text style={{ fontWeight: FW.bold, color: theme.text }}>{item.val} {AR ? 'ر.س' : 'SAR'}</Text>
          </View>
        ))}

        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginTop: SP.sm, backgroundColor: theme.surface2, padding: SP.sm, borderRadius: R.md }}>
          <Text style={{ color: theme.danger }}>{AR ? 'عمولة تطبيق نبض بلس' : 'Nabd Plus Commission'}</Text>
          <Text style={{ color: theme.danger }}>- {walletData.appCommission} {AR ? 'ر.س' : 'SAR'}</Text>
        </View>
      </NCard>

      <NBtn label={AR ? 'تصدير تقرير نهاية الوردية (PDF)' : 'Export End-of-Day Shift Report (PDF)'} icon="download" variant="secondary" onPress={handleExportShiftReport} />
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

  const [returnStatus, setReturnStatus] = useState('PENDING'); // PENDING | APPROVED | REJECTED
  const [rejectReason, setRejectReason] = useState('');

  const decideReturn = async (approved: boolean) => {
    if (!approved && !rejectReason.trim()) {
      show(AR ? 'يجب إدخال سبب الرفض' : 'Rejection reason is mandatory', 'error');
      return;
    }
    try {
      await client.post('/provider/pharmacy/returns/RET-421/decide', { approved, reason: rejectReason });
      setReturnStatus(approved ? 'APPROVED' : 'REJECTED');
      show(AR ? 'تم اتخاذ القرار بنجاح' : 'Decision recorded successfully', 'success');
      onBack();
    } catch (e) {
      show(AR ? 'فشل تنفيذ القرار' : 'Failed to record decision', 'error');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'مراجعة المرتجعات (RMA)' : 'Returns Management'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <OrderTimeline />
        <NCard style={{ marginBottom: 16, padding: 16 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text, marginBottom: 8, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'طلب إرجاع #RET-421' : 'Return Request #RET-421'}
          </Text>
          <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: 16 }}>
            {AR ? 'المريض: أحمد العتيبي' : 'Patient: Ahmed Alotaibi'}
          </Text>
          <View style={{ backgroundColor: theme.surface2, padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <Text style={{ fontWeight: 'bold', color: theme.text, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'السبب المذكور من المريض:' : 'Patient Reason:'}
            </Text>
            <Text style={{ color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
              {AR ? '"العلبة وصلت مكسورة والسائل متسرب."' : '"The box arrived broken and liquid was leaking."'}
            </Text>
          </View>
          <View style={{ height: 150, backgroundColor: theme.surface2, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed' }}>
            <Text style={{ fontSize: 40 }}>📸</Text>
            <Text style={{ color: theme.textSub, marginTop: 8 }}>{AR ? 'صورة المرفق (Photo Evidence)' : 'Attached Photo Evidence'}</Text>
          </View>

          {returnStatus === 'PENDING' ? (
            <View>
              <TextInput placeholder={AR ? 'سبب الرفض (إلزامي في حال الرفض)...' : 'Rejection reason (Mandatory if rejecting)...'} value={rejectReason} onChangeText={setRejectReason} multiline style={{ height: 80, marginBottom: 16, backgroundColor: theme.surface, padding: 12, borderRadius: 8, color: theme.text }} />
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 12 }}>
                <NBtn label={AR ? 'قبول الإرجاع' : 'Approve Return'} onPress={() => decideReturn(true)} style={{ flex: 1 }} />
                <NBtn label={AR ? 'رفض' : 'Reject'} variant="outline" onPress={() => decideReturn(false)} style={{ flex: 1 }} />
              </View>
            </View>
          ) : (
            <View style={{ padding: 12, backgroundColor: returnStatus === 'APPROVED' ? theme.success + '20' : theme.danger + '20', borderRadius: 8 }}>
              <Text style={{ color: returnStatus === 'APPROVED' ? theme.success : theme.danger, fontWeight: 'bold', textAlign: 'center' }}>
                {returnStatus === 'APPROVED' ? (AR ? 'تم قبول الإرجاع وإصدار استرداد مالي' : 'Return Approved & Refund Issued') : (AR ? 'تم رفض طلب الإرجاع' : 'Return Request Rejected')}
              </Text>
            </View>
          )}
        </NCard>
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

  const [deliveryMode, setDeliveryMode] = useState<'OWN'|'PICKUP'|'MAP'>('OWN');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');

  const confirmDispatch = async () => {
    try {
      await client.post('/provider/pharmacy/orders/123/dispatch', { driver: driverName, phone: driverPhone });
      show(AR ? 'تم خروج الطلب للتوصيل' : 'Order out for delivery', 'success');
      setDeliveryMode('MAP');
    } catch(e) {
      show(AR ? 'فشل التحديث' : 'Failed to update', 'error');
    }
  };

  return (
    <NScroll>
      <NHeader title={AR ? 'إدارة التوصيل والاستلام' : 'Dispatch & Delivery'} onBack={onBack} />
      
      <View style={{ padding: 16 }}>
        <OrderTimeline />
        <NBtn label={AR ? 'مراجعة المرتجعات المفتوحة (RMA)' : 'Review Open Returns (RMA)'} variant="secondary" onPress={() => onNavigate('returns_rma')} style={{ marginBottom: 24 }} />

        {deliveryMode !== 'MAP' && (
          <NCard style={{ marginBottom: 16 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.text, marginBottom: 16, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'خروج الطلب: #123' : 'Dispatch Order: #123'}
            </Text>
            
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 12, marginBottom: 16 }}>
              <NBtn label={AR ? 'توصيل عبر الصيدلية' : 'Own Delivery'} variant={deliveryMode === 'OWN' ? 'primary' : 'outline'} onPress={() => setDeliveryMode('OWN')} style={{ flex: 1 }} />
              <NBtn label={AR ? 'استلام من الفرع' : 'Branch Pickup'} variant={deliveryMode === 'PICKUP' ? 'primary' : 'outline'} onPress={() => setDeliveryMode('PICKUP')} style={{ flex: 1 }} />
            </View>

            {deliveryMode === 'OWN' && (
              <View style={{ gap: 12 }}>
                <NInput label={AR ? 'اسم المندوب' : 'Driver Name'} value={driverName} onChange={(v: string) => setDriverName(v)} />
                <NInput label={AR ? 'رقم الهاتف' : 'Driver Phone'} value={driverPhone} onChange={(v: string) => setDriverPhone(v)} kbType="phone-pad" />
                <NBtn label={AR ? 'تأكيد الخروج للتوصيل' : 'Confirm Dispatch'} onPress={confirmDispatch} style={{ marginTop: 8 }} />
              </View>
            )}

            {deliveryMode === 'PICKUP' && (
              <View style={{ padding: 16, backgroundColor: theme.surface2, borderRadius: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🏪</Text>
                <Text style={{ color: theme.text, fontWeight: 'bold', textAlign: 'center' }}>
                  {AR ? 'الطلب جاهز للاستلام في الفرع.' : 'Order is ready for pickup at the branch.'}
                </Text>
                <NBtn label={AR ? 'إرسال إشعار للمريض' : 'Notify Patient'} onPress={() => show(AR ? 'تم تنبيه المريض' : 'Patient notified', 'success')} style={{ marginTop: 12 }} />
              </View>
            )}
          </NCard>
        )}

        {deliveryMode === 'MAP' && (
          <View>
            <View style={{ height: 250, backgroundColor: theme.surface2, justifyContent: 'center', alignItems: 'center', marginBottom: SP.lg, borderRadius: 12 }}>
              <Text style={{ fontSize: 40 }}>🗺</Text>
              <Text style={{ color: theme.textSub, marginTop: SP.sm }}>{AR ? 'خريطة تتبع المندوب (GPS Live)' : 'Rider Tracking Map (GPS Live)'}</Text>
            </View>

            <NCard style={{ marginBottom: SP.md }}>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                {AR ? 'بيانات المندوب' : 'Rider Info'}
              </Text>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center', marginTop: SP.sm }}>
                <NAvatar name={driverName || "عمر"} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>{driverName || (AR ? 'عمر القحطاني' : 'Omar Alqahtani')}</Text>
                  <Text style={{ color: theme.textSub, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>{driverPhone || '050XXXXXXX'} · {AR ? 'مركبة الصيدلية' : 'Pharmacy Vehicle'}</Text>
                </View>
                <TouchableOpacity style={{ padding: SP.sm, backgroundColor: theme.primaryLight, borderRadius: 20 }}>
                  <Text style={{ fontSize: 20 }}>📞</Text>
                </TouchableOpacity>
              </View>
            </NCard>

            <NCard style={{ marginBottom: SP.xl }}>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
                {AR ? 'إثبات التوصيل (POD)' : 'Proof of Delivery (POD)'}
              </Text>
              <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left', fontSize: FS.sm }}>
                {AR ? 'الطلب قيد التوصيل. سيقوم المندوب برفع صورة للأكياس عند الباب.' : 'Order out for delivery. Rider will upload a photo at the door.'}
              </Text>
            </NCard>

            <NBtn label={AR ? 'محاكاة: تم التوصيل' : 'Simulate: Delivered'} onPress={() => { show(AR ? 'تم تأكيد التوصيل بنجاح' : 'Delivery Confirmed', 'success'); setDeliveryMode('OWN'); }} />
          </View>
        )}
      </View>
    </NScroll>
  );
}

function OrderTimeline() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  
  const events = [
    { time: '10:30 AM', desc: AR ? 'تم رفع الوصفة الطبية' : 'Prescription Uploaded', active: true },
    { time: '10:31 AM', desc: AR ? 'صيدلية الأمل قبلت الطلب' : 'Pharmacy Accepted', active: true },
    { time: '10:35 AM', desc: AR ? 'تم تعديل السلة وبانتظار الدفع' : 'Basket Updated, Awaiting Payment', active: true },
    { time: '10:36 AM', desc: AR ? 'تم سداد المبلغ (كاش/فيزا)' : 'Payment Completed', active: false },
    { time: '10:45 AM', desc: AR ? 'الطلب جاهز ومع المندوب' : 'Order Ready for Dispatch', active: false },
  ];

  return (
    <View style={{ backgroundColor: theme.surface2, padding: 16, borderRadius: 12, marginBottom: 16 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text, marginBottom: 16, textAlign: AR ? 'right' : 'left' }}>
        {AR ? 'السجل الزمني للطلب (Timeline)' : 'Order Timeline'}
      </Text>
      {events.map((e, idx) => (
        <View key={idx} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: e.active ? theme.primary : theme.border, marginLeft: AR ? 12 : 0, marginRight: AR ? 0 : 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: e.active ? theme.text : theme.textSub, fontWeight: e.active ? 'bold' : 'normal', textAlign: AR ? 'right' : 'left' }}>{e.desc}</Text>
          </View>
          <Text style={{ color: theme.textSub, fontSize: 12 }}>{e.time}</Text>
        </View>
      ))}
    </View>
  );
}

function OrderDetailScreen({ orderId, onBack }: any) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [basket, setBasket] = useState<{id:string, name:string, requestedQty:number, price:number, available:boolean, is_substitute:boolean, substituted_from?:string}[]>([
    { id: '1', name: 'Panadol Advance 500mg', requestedQty: 2, price: 15, available: true, is_substitute: false },
    { id: '2', name: 'Amoxicillin 250mg', requestedQty: 1, price: 45, available: false, is_substitute: false },
  ]);

  const [insuranceStatus, setInsuranceStatus] = useState('PENDING'); // PENDING | APPROVED | REJECTED
  const [copay, setCopay] = useState(0);
  
  // NPHIES Form State
  const [showNPHIES, setShowNPHIES] = useState(false);
  const [nphiesData, setNphiesData] = useState({ policyNo: '', authCode: '' });

  // Substitute Modal State
  const [showSubModal, setShowSubModal] = useState(false);
  const [subTargetId, setSubTargetId] = useState<string|null>(null);
  const [subSearch, setSubSearch] = useState('');

  const toggleAvailability = (id: string) => {
    setBasket(prev => prev.map(item => item.id === id ? { ...item, available: !item.available } : item));
  };

  const evaluateInsurance = async () => {
    if (!nphiesData.policyNo || !nphiesData.authCode) {
      show(AR ? 'يرجى إدخال رقم البوليصة وكود التفويض' : 'Please enter Policy No and Auth Code', 'error');
      return;
    }
    try {
      const res = await client.post(`/provider/pharmacy/orders/${orderId}/insurance`, { ...nphiesData });
      setInsuranceStatus('APPROVED');
      setCopay(15);
      setShowNPHIES(false);
      show(AR ? 'تم قبول التأمين! المريض سيدفع 15 ريال' : 'Insurance Approved! Copay: 15', 'success');
    } catch (e) {
      show(AR ? 'مرفوض من التأمين' : 'Insurance Rejected', 'error');
      setInsuranceStatus('REJECTED');
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
              <NBtn label={AR ? 'تحقق من الأهلية واعتماد' : 'Verify & Approve'} onPress={evaluateInsurance} />
            </View>
          )}
        </NCard>

        {/* Basket Matrix */}
        <Text style={{ fontWeight: 'bold', fontSize: 18, color: theme.text, marginBottom: 12, textAlign: AR ? 'right' : 'left' }}>
          {AR ? 'مصفوفة السلة (Basket Matrix)' : 'Basket Matrix'}
        </Text>
        
        {basket.map((item, idx) => (
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
              {[
                { name: 'Augmentin 250mg', price: 55 },
                { name: 'Klamoks 250mg', price: 40 },
                { name: 'Megamox 250mg', price: 42 }
              ].filter(x => x.name.toLowerCase().includes(subSearch.toLowerCase())).map((sub, i) => (
                <TouchableOpacity key={i} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }} onPress={() => applySubstitute(sub.name, sub.price)}>
                  <Text style={{ color: theme.text, fontWeight: 'bold' }}>{sub.name}</Text>
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
        <NBtn label={AR ? 'محاكاة مسح دواء' : 'Simulate Drug Scan'} onPress={() => { show(AR ? 'تم التعرف: Paracetamol 500mg' : 'Detected: Paracetamol 500mg', 'success'); onBack(); }} />
      </View>
    </View>
  );
}

function BroadcastOrderScreen({ onBack }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'طلبات البث المباشر الفورية' : 'Live Broadcast Orders'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.sm, borderLeftWidth: 4, borderLeftColor: theme.primary }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>طلب وصفة #B-9901</Text>
            <NBadge label={AR ? 'بث حي' : 'Live Broadcast'} variant="warning" />
          </View>
          <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'الأدوية: Amoxil 500mg, Panadol Extra · المسافة: 1.8 كم' : 'Drugs: Amoxil 500mg, Panadol · Distance: 1.8km'}
          </Text>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.xs, marginTop: SP.sm }}>
            <NBtn label={AR ? 'قبول الطلب وتجهيز الدواء ⚡' : 'Accept Order ⚡'} size="sm" onPress={() => show(AR ? 'تم قبول الطلب وتنبيه المريض' : 'Order accepted', 'success')} style={{ flex: 1 }} />
            <NBtn label={AR ? 'اعتذار' : 'Decline'} size="sm" variant="outline" onPress={onBack} />
          </View>
        </NCard>
      </NScroll>
    </View>
  );
}

function OrderHistoryScreen({ onBack }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const history = [
    { id: 'ORD-9841', patient: 'محمد القحطاني', total: 185, status: 'DELIVERED', date: '2026-07-21' },
    { id: 'ORD-9812', patient: 'أمل المطيري', total: 95, status: 'COMPLETED', date: '2026-07-20' },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'سجل الطلبات السابقة' : 'Order History'} onBack={onBack} />
      <NScroll pad>
        {history.map(o => (
          <NCard key={o.id} style={{ marginBottom: SP.sm }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{o.patient} ({o.id})</Text>
              <NBadge label={AR ? 'مكتمل' : 'Completed'} variant="success" />
            </View>
            <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
              {AR ? `الإجمالي: ${o.total} ر.س · التاريخ: ${o.date}` : `Total: ${o.total} SAR · Date: ${o.date}`}
            </Text>
          </NCard>
        ))}
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
  const AR = lang === 'ar';

  const [search, setSearch] = useState('');
  const [inventory, setInventory] = useState([
    { id: '1', name: 'Panadol Advance 500mg', stock: 45, online: true, expiry: '2025-12-01', price: 15 },
    { id: '2', name: 'Augmentin 1g', stock: 5, online: true, expiry: '2023-11-15', price: 85 }, // Near Expiry
    { id: '3', name: 'Cataflam 50mg', stock: 0, online: false, expiry: '2024-05-20', price: 20 }, // Out of stock
  ]);

  const updateStock = (id: string, delta: number) => {
    setInventory(prev => prev.map(item => item.id === id ? { ...item, stock: Math.max(0, item.stock + delta) } : item));
  };
  const toggleOnline = (id: string) => {
    setInventory(prev => prev.map(item => item.id === id ? { ...item, online: !item.online } : item));
  };

  const filtered = inventory.filter(x => x.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'إدارة المخزون' : 'Active Inventory'} onBack={onBack} />
      <View style={{ padding: 16 }}>
        <NInput placeholder={AR ? 'ابحث عن منتج...' : 'Search product...'} value={search} onChange={(v: string) => setSearch(v)} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const isExpiring = new Date(item.expiry) < new Date(new Date().setMonth(new Date().getMonth() + 3));
          return (
            <NCard style={{ marginBottom: 12, borderColor: isExpiring ? theme.warn : theme.border, borderWidth: isExpiring ? 2 : 1 }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{item.name}</Text>
                  <Text style={{ color: theme.primary, fontWeight: 'bold', textAlign: AR ? 'right' : 'left' }}>{item.price} {AR ? 'ر.س' : 'SAR'}</Text>
                  {isExpiring && (
                    <Text style={{ color: theme.warn, fontSize: 12, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                      {AR ? '⚠️ تنبيه صلاحية: ' : '⚠️ Expiring soon: '}{item.expiry}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 10, color: theme.textSub }}>{AR ? 'متوفر أونلاين' : 'Online'}</Text>
                  <Switch value={item.online} onValueChange={() => toggleOnline(item.id)} trackColor={{ true: theme.success }} />
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
  const AR = lang === 'ar';

  const [msgs, setMsgs] = useState([
    { id: '1', text: AR ? 'مرحباً دكتور، هل يوجد بديل لبانادول الأزرق؟' : 'Hi, any substitute for Blue Panadol?', byPatient: true },
    { id: '2', text: AR ? 'نعم متوفر بانادول أدفانس، هل أضيفه لطلبك؟' : 'Yes, Panadol Advance. Should I add it?', byPatient: false },
  ]);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;
    setMsgs([...msgs, { id: Date.now().toString(), text: input, byPatient: false }]);
    setInput('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'محادثة المريض' : 'Patient Chat'} onBack={onBack} />
      <FlatList
        data={msgs}
        keyExtractor={x => x.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={{ alignSelf: item.byPatient ? (AR ? 'flex-end' : 'flex-start') : (AR ? 'flex-start' : 'flex-end'), backgroundColor: item.byPatient ? theme.surface2 : theme.primaryLight, padding: 12, borderRadius: 12, marginBottom: 8, maxWidth: '80%' }}>
            <Text style={{ color: theme.text }}>{item.text}</Text>
          </View>
        )}
      />
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', padding: 12, borderTopWidth: 1, borderTopColor: theme.border, alignItems: 'center', gap: 8 }}>
        <TouchableOpacity style={{ padding: 8, backgroundColor: theme.surface2, borderRadius: 20 }}>
          <Text style={{ fontSize: 20 }}>📷</Text>
        </TouchableOpacity>
        <TextInput 
          placeholder={AR ? 'اكتب رسالة...' : 'Type a message...'}
          placeholderTextColor={theme.textSub}
          value={input}
          onChangeText={setInput}
          style={{ flex: 1, backgroundColor: theme.surface, color: theme.text, borderRadius: 20, paddingHorizontal: 16, height: 40, textAlign: AR ? 'right' : 'left' }}
        />
        <TouchableOpacity style={{ padding: 10, backgroundColor: theme.primary, borderRadius: 20 }} onPress={send}>
          <Text style={{ color: '#FFF', fontSize: 16 }}>📤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
function SettingsScreen({ onBack }: any) {
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
      await client.post('/provider-deltas', { 
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
