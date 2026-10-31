import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Platform, Switch,
 RefreshControl, ActivityIndicator, Modal
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import { LanguagePicker } from '../../../components/LanguagePicker';
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
 const { lang, t } = useLang();
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
   show(AR ? 'تعذر تحميل التعريفات المحفوظة' : 'Could not load the saved tariffs', 'error');
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
     show(AR ? 'أدخل أسعاراً صحيحة (أرقام موجبة)' : 'Enter valid prices (positive numbers)', 'error');
     return;
   }
   entered[key] = n;
 }
 if (!Object.keys(entered).length) {
   show(AR ? 'أدخل سعراً واحداً على الأقل' : 'Enter at least one price', 'error');
   return;
 }
 setSavingPrices(true);
 try {
   await client.put('/provider/settings/tariffs', entered);
   setShowPricing(false);
   setTariffsPending(true);
   show(AR ? 'بانتظار موافقة الإدارة على الأسعار الجديدة' : 'Pending admin approval for new pricing', 'success');
 } catch(e) {
   show(AR ? 'فشل إرسال التعديلات' : 'Failed to submit changes', 'error');
 } finally {
   setSavingPrices(false);
 }
 };

 
  const [deltaPending, setDeltaPending] = useState(false);
  const saveSettings = async (newData: any = {}) => {
    try {
      setDeltaPending(true);
      await client.post('/provider/settings/delta', { newData });
      show(AR ? 'بانتظار موافقة الإدارة على التعديلات' : 'Pending admin approval for changes', 'success');
    } catch (e) {
      show(AR ? 'فشل إرسال التعديلات' : 'Failed to submit changes', 'error');
      setDeltaPending(false);
    }
  };
return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[s.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 16) }]}>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>
 {AR?' إعدادات المنشأة':' Facility Settings'}
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
 textAlign:AR?'right':'left' }}>{AR?'مستشفى نبضة الطبي':'Nabdah Medical Hospital'}</Text>
 <Text style={{ fontSize:FS.sm, color:theme.textSub }}>{AR?'مستشفى':'Hospital'}</Text>
 <NBadge label={AR?' حساب نشط':' Active'} variant="success" size="xs" style={{ marginTop:SP.xs }} />
 </View>
 </NCard>

 <NSecHeader title={AR?'إدارة المنشأة':'Facility Management'} />
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
 <NSecHeader title={AR ? 'التسويق والمبيعات والطوارئ' : 'Marketing, Sales & SOS'} />
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

 <NSecHeader title={AR?'التفضيلات':'Preferences'} />
 <NCard style={{ marginBottom: SP.xl }}>
 <NToggle label={AR?' الوضع الداكن':' Dark Mode'} value={mode==='dark'} onChange={toggleTheme} />
 <View style={{ padding: SP.md, gap: SP.sm }}><Text style={{ color: theme.text, fontSize: FS.md, textAlign: AR ? 'right' : 'left' }}>{t('language')}</Text><LanguagePicker /></View>
 <NSettingsRow icon="bell" label={AR?'الإشعارات':'Notifications'} onPress={() => onNavigate('notifications')} />
 <NSettingsRow icon="chart" label={AR?'التقارير التلقائية':'Auto Reports'} onPress={() => onNavigate('auto_reports')} />
 <NSettingsRow icon="briefcase" label={AR?'الوظائف الطبية':'Medical Jobs'} onPress={() => onNavigate('medical_jobs')} />
 <NSettingsRow icon="bookOpen" label={AR?'دليل الأدوية الطبي':'Medical Drug Index'} onPress={() => onNavigate('drug_index')} />
 </NCard>

 <NSecHeader title={AR?'الأمان':'Security'} />
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

 <NSecHeader title={AR?'الدعم والقانونية':'Support & Legal'} />
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

 <NCard>
 <NSettingsRow icon="" label={AR?'تسجيل الخروج':'Log Out'}
 onPress={() => setLogout(true)} danger />
 </NCard>
 </ScrollView>

 {/* ICU & Wards pricing sheet */}
 <NSheet visible={showPricing} onClose={() => setShowPricing(false)} title={AR ? ' أسعار وتكاليف الخدمات' : ' Pricing & Tariffs'} height={550}>
 <ScrollView contentContainerStyle={{ padding: SP.md }}>
 {tariffsLoading ? <ActivityIndicator color={theme.primary} style={{ marginBottom: SP.md }} /> : null}
 {tariffsPending ? (
 <Text style={{ color: theme.warn, fontSize: FS.sm, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'لديك تعديل أسعار بانتظار موافقة الإدارة؛ الأسعار المعروضة هي المعتمدة حالياً.' : 'A pricing change is waiting for admin approval; the prices shown are the ones approved now.'}
 </Text>
 ) : null}
 <NPriceInput label={AR ? 'سعر سرير العناية المركزة ICU (يومي)' : 'ICU Bed Rate (Daily - SAR)'} value={icuDaily} onChange={setIcuDaily} />
 <NPriceInput label={AR ? 'سعر سرير العناية المركزة ICU (ساعي)' : 'ICU Bed Rate (Hourly - SAR)'} value={icuHourly} onChange={setIcuHourly} />
 <NPriceInput label={AR ? 'سعر سرير التنويم بالأجنحة (يومي)' : 'Ward Inpatient Rate (Daily - SAR)'} value={wardDaily} onChange={setWardDaily} />
 <NPriceInput label={AR ? 'تكلفة فتح غرف العمليات للعملية' : 'Surgery Room Starting Price (SAR)'} value={surgPrice} onChange={setSurgPrice} />
 <NPriceInput label={AR ? 'رسوم الطوارئ' : 'Emergency Fee (SAR)'} value={erFee} onChange={setErFee} />
 {/* owner decision B23 / decision 14: no ambulance service, so no ambulance fee */}
 
 <NBtn label={AR ? ' حفظ التعريفات' : ' Save Tariffs'} loading={savingPrices} disabled={tariffsLoading} onPress={handleSavePrices} style={{ marginTop: SP.md }} />
 </ScrollView>
 </NSheet>

 <NConfirm
 visible={showLogout}
 title={AR?'تسجيل الخروج':'Log Out'}
 msg={AR?'هل تريد تسجيل الخروج من حساب المنشأة؟':'Log out of facility account?'}
 onOk={() => { setLogout(false); onLogout(); }}
 onCancel={() => setLogout(false)}
 okLabel={AR?'تسجيل الخروج':'Log Out'}
 />
 </View>
 );
}

