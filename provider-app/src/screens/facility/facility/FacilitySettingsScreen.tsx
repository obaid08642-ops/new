import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Platform, Switch,
 RefreshControl, ActivityIndicator, Modal
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MyContractRow } from '../../../components/MyContract';
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
 PromotionsDashboard, CreateCampaignScreen, 
 SubscriptionsAdsScreen, AffiliatePortal, ReputationHub,
 LiveOrderAlarmModal, CrmHub, RevenueInsights
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

export function FacilitySettingsScreen({ onLogout, onNavigate }: { onLogout: () => void; onNavigate: (s: string) => void }) {
 const insets = useSafeAreaInsets();
 const { theme, toggle: toggleTheme, mode } = useTheme();
 const { lang, toggle: toggleLang, t: tt } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [showLogout, setLogout] = useState(false);

 // Tariffs: the form starts from the facility's approved tariffs (GET /provider/settings/tariffs), empty when none
 // were ever approved; saving sends only the prices the facility entered to admin review.
 const [showPricing, setShowPricing] = useState(false);
 const [icuDaily, setIcuDaily] = useState('');
 const [icuHourly, setIcuHourly] = useState('');
 const [wardDaily, setWardDaily] = useState('');
 const [surgPrice, setSurgPrice] = useState('');
 const [erFee, setErFee] = useState('');
 const [tariffsLoading, setTariffsLoading] = useState(false);
 const [tariffsPending, setTariffsPending] = useState(false);
 const [savingPrices, setSavingPrices] = useState(false);

 const asField = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
 const openPricing = async () => {
 setShowPricing(true);
 setTariffsLoading(true);
 try {
   const res = await client.get('/provider/settings/tariffs');
   const t = res?.data?.tariffs || {};
   setIcuDaily(asField(t.icu_daily)); setIcuHourly(asField(t.icu_hourly)); setWardDaily(asField(t.ward_daily));
   setSurgPrice(asField(t.surgery_room)); setErFee(asField(t.emergency_fee));
   setTariffsPending(!!res?.data?.pending);
 } catch (e) {
   setShowPricing(false);
   show(tt('fset.3ddd623c'), 'error');
 } finally {
   setTariffsLoading(false);
 }
 };

 const handleSavePrices = async () => {
 const fields: Array<[string, string]> = [['icu_daily', icuDaily], ['icu_hourly', icuHourly], ['ward_daily', wardDaily], ['surgery_room', surgPrice], ['emergency_fee', erFee]];
 const entered: Record<string, number> = {};
 for (const [key, raw] of fields) {
   if (!raw.trim()) continue;
   const n = Number(raw.trim());
   if (!Number.isFinite(n) || n < 0) {
     show(tt('fset.ec640a9a'), 'error');
     return;
   }
   entered[key] = n;
 }
 if (!Object.keys(entered).length) {
   show(tt('fset.3cdb64dc'), 'error');
   return;
 }
 setSavingPrices(true);
 try {
   await client.put('/provider/settings/tariffs', entered);
   setShowPricing(false);
   setTariffsPending(true);
   show(tt('fset.da3bca34'), 'success');
 } catch(e) {
   show(tt('fset.117075fa'), 'error');
 } finally {
   setSavingPrices(false);
 }
 };

 
  const [deltaPending, setDeltaPending] = useState(false);
  const saveSettings = async (newData: any = {}) => {
    try {
      setDeltaPending(true);
      await client.post('/provider/settings/delta', { newData });
      show(tt('fset.44bd2050'), 'success');
    } catch (e) {
      show(tt('fset.117075fa'), 'error');
      setDeltaPending(false);
    }
  };
return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[s.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 16) }]}>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>
 {tt('fset.c5eb35c4')}
 </Text>
 </View>
 <ScrollView contentContainerStyle={{ padding: SP.xl, paddingBottom: 100 }}>
 {/* Facility Info */}
 <NCard style={{ marginBottom: SP.xl, flexDirection:AR?'row-reverse':'row', gap: SP.lg, alignItems:'center' }}>
 <View style={{ width:60, height:60, borderRadius:R.lg, backgroundColor:theme.primaryLight,
 alignItems:'center', justifyContent:'center' }}>
 <I name="facility" size={32} color={theme.primary} />
 </View>
 <View style={{ flex:1 }}>
 <Text style={{ fontSize:FS.xl, fontWeight:FW.bold, color:theme.text,
 textAlign:AR?'right':'left' }}>{tt('fset.d71022b1')}</Text>
 <Text style={{ fontSize:FS.sm, color:theme.textSub }}>{tt('fset.e6e8c403')}</Text>
 <NBadge label={tt('fset.9dabe20f')} variant="success" size="xs" style={{ marginTop:SP.xs }} />
 </View>
 </NCard>

 <NSecHeader title={tt('fset.535eaf37')} />
 <NCard style={{ marginBottom: SP.xl }}>
 {[
 { icon:'facility', ar:'معلومات المنشأة', en:'Facility Information', action: () => onNavigate('facility_info') },
 { icon:'home', ar:'الأقسام والخدمات', en:'Departments & Services', action: () => onNavigate('departments') },
 { icon:'wallet', ar:'الأسعار والتعريفات', en:'Pricing & Rates', action: openPricing },
 { icon:'shield', ar:'إعدادات التأمين', en:'Insurance Settings', action: () => onNavigate('insurance_config') },
 { icon:'shield', ar:'طلبات التأمين الواردة', en:'Insurance Requests', action: () => onNavigate('insurance_requests') },
 { icon:'document', ar:'الرخص والمستندات الرسمية', en:'Licenses & Documents', action: () => onNavigate('certificates_config') },
 { icon:'camera', ar:'الصور والوسائط', en:'Photos & Media', action: () => onNavigate('media_config') },
 { icon:'users', ar:'إدارة الحسابات الفرعية',en:'Sub-Account Management', action: () => onNavigate('subaccounts') },
 { icon:'calendar', ar:'المواعيد والجداول', en:'Schedule & Shifts', action: () => onNavigate('shifts') },
 { icon:'document', ar:'إدارة الأسرّة', en:'Bed Management', action: () => onNavigate('beds') },
 { icon:'scan', ar:'نظام QR Check-in', en:'QR Check-in System', action: () => onNavigate('qr_checkin') },
 ].map((row, i) => (
 <NSettingsRow key={i} icon={row.icon} label={AR?row.ar:row.en}
 onPress={row.action} />
 ))}
 </NCard>

 {/* Marketing & Reputation */}
 <NSecHeader title={tt('fset.2f3036ab')} />
 <NCard style={{ marginBottom: SP.xl }}>
 {[
 { icon:'bell', ar:'مركز العروض الترويجية', en:'Promotions Center', action:()=>onNavigate('promotions') },
 { icon:'globe', ar:'إعدادات الصفحة العامة', en:'Mini-Website Settings', action:()=>onNavigate('web_config') },
 { icon:'wallet', ar:'الاشتراكات والإعلانات', en:'Subscriptions & Ads', action:()=>onNavigate('subscriptions_ads') },
 { icon:'star', ar:'مستوى السمعة والتقييمات',en:'Reputation & Ratings', action:()=>onNavigate('reputation') },
 { icon:'chart', ar:'إدارة العملاء والأرباح', en:'CRM & Business Insights', action:()=>onNavigate('crm') },
 ].map((row, i) => (
 <NSettingsRow key={i} icon={row.icon} label={AR ? row.ar : row.en} onPress={row.action} />
 ))}
 </NCard>

 <NSecHeader title={tt('fset.e1eec1dc')} />
 <NCard style={{ marginBottom: SP.xl }}>
 <NToggle label={tt('fset.81e1b733')} value={mode==='dark'} onChange={toggleTheme} />
 <NSettingsRow icon="globe" label={tt('fset.a1d2dc5b')} onPress={toggleLang} />
 <NSettingsRow icon="bell" label={tt('fset.5e885201')} onPress={() => onNavigate('notifications')} />
 <NSettingsRow icon="chart" label={tt('fset.90758730')} onPress={() => onNavigate('auto_reports')} />
 <NSettingsRow icon="briefcase" label={tt('fset.ebb9f1de')} onPress={() => onNavigate('medical_jobs')} />
 <NSettingsRow icon="bookOpen" label={tt('fset.0e14b12f')} onPress={() => onNavigate('drug_index')} />
 </NCard>

 <NSecHeader title={tt('fset.b42c5798')} />
 <NCard style={{ marginBottom: SP.xl }}>
 {[
 { icon:'lock', ar:'تغيير كلمة المرور', en:'Change Password', action: () => onNavigate('security') },
 { icon:'shield', ar:'التحقق الثنائي 2FA', en:'Two-Factor Auth', action: () => onNavigate('security') },
 { icon:'scan', ar:'الأجهزة المرتبطة', en:'Linked Devices', action: () => onNavigate('security') },
 { icon:'document', ar:'سجل العمليات', en:'Audit Log', action: () => onNavigate('audit_logs') },
 ].map((row, i) => (
 <NSettingsRow key={i} icon={row.icon} label={AR?row.ar:row.en}
 onPress={row.action} />
 ))}
 </NCard>

 <NSecHeader title={tt('fset.3820e8ef')} />
 <NCard style={{ marginBottom: SP.xl }}>
 {[
 { icon:'', ar:'الشروط والأحكام', en:'Terms & Conditions' },
 { icon:'', ar:'سياسة الخصوصية', en:'Privacy Policy' },
 { icon:'', ar:'الدعم الفني', en:'Technical Support' },
 { icon:'', ar:'حول التطبيق', en:'About App' },
 ].map((row, i) => (
 <NSettingsRow key={i} icon={row.icon} label={AR?row.ar:row.en}
 onPress={() => onNavigate('support')} />
 ))}
 </NCard>

 <NCard style={{ marginBottom: SP.md }}><MyContractRow /></NCard>

 <NCard>
 <NSettingsRow icon="" label={tt('fset.d56d4be0')}
 onPress={() => setLogout(true)} danger />
 </NCard>
 </ScrollView>

 {/* ICU & Wards pricing sheet */}
 <NSheet visible={showPricing} onClose={() => setShowPricing(false)} title={tt('fset.a9031f66')} height={550}>
 <ScrollView contentContainerStyle={{ padding: SP.md }}>
 {tariffsLoading ? <ActivityIndicator color={theme.primary} style={{ marginBottom: SP.md }} /> : null}
 {tariffsPending ? (
 <Text style={{ color: theme.warn, fontSize: FS.sm, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
 {tt('fset.fdf08da4')}
 </Text>
 ) : null}
 <NPriceInput label={tt('fset.5f0f110a')} value={icuDaily} onChange={setIcuDaily} />
 <NPriceInput label={tt('fset.0b1a86d8')} value={icuHourly} onChange={setIcuHourly} />
 <NPriceInput label={tt('fset.215b5ee5')} value={wardDaily} onChange={setWardDaily} />
 <NPriceInput label={tt('fset.0f53270f')} value={surgPrice} onChange={setSurgPrice} />
 <NPriceInput label={tt('fset.74f164df')} value={erFee} onChange={setErFee} />
 {/* owner decision B23 / decision 14: no ambulance service, so no ambulance fee */}
 
 <NBtn label={tt('fset.b4ef41bf')} loading={savingPrices} disabled={tariffsLoading} onPress={handleSavePrices} style={{ marginTop: SP.md }} />
 </ScrollView>
 </NSheet>

 <NConfirm
 visible={showLogout}
 title={tt('fset.d56d4be0')}
 msg={tt('fset.f3408473')}
 onOk={() => { setLogout(false); onLogout(); }}
 onCancel={() => setLogout(false)}
 okLabel={tt('fset.d56d4be0')}
 />
 </View>
 );
}

